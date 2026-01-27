"""
FastAPI 後端入口

功能摘要（含中文註解）：
- /api/geocode  將地址字串轉為 (lat,lng)，使用 Google Geocoding API（language=zh-TW）。
- /api/reverse  將 (lat,lng) 反查地址字串，使用 Google Geocoding API（language=zh-TW）。
- /api/routes   以 NetworkX 路網（pickle 載入）計算：
  * 最短距離路徑（權重 length_m）
  * 最低暴露路徑（權重 濃度*距離，預設使用 pm25 * length_m）
  回傳前端 Leaflet 友善格式，能直接給現有 renderRoutes() 繪圖。

啟動方式（本機開發）：
1) 將路網檔放在 data\OSM_腳踏車路徑_台北_withpm25_最大連通版_DiGraph_260108.pkl
2) 安裝依賴：pip install -r api/requirements.txt
3) 啟動：uvicorn api.main:app --reload --port 8000

測試範例（curl）：
  Geocode
    curl -X POST http://localhost:8000/api/geocode -H "Content-Type: application/json" -d '{"address":"台北車站"}'
  Reverse
    curl -X POST http://localhost:8000/api/reverse -H "Content-Type: application/json" -d '{"point":{"lat":25.0478,"lng":121.5170}}'
  Routes（可用座標或文字地址）
    curl -X POST http://localhost:8000/api/routes -H "Content-Type: application/json" -d '{"start":{"lat":25.044,"lng":121.533},"end":{"lat":25.033,"lng":121.565},"mode":"bicycle"}'
    curl -X POST http://localhost:8000/api/routes -H "Content-Type: application/json" -d '{"start":"台北車站","end":"台大"}'

備註：mode 目前先不影響權重，未來可在此以「距離/速度」或道路型態白名單進行擴充。
"""

from __future__ import annotations

import os
import json
import math
import pickle
from typing import Any, Dict, List, Tuple, Optional
from pyproj import Transformer

import networkx as nx
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from scipy.spatial import cKDTree as KDTree
import requests


# -------------------------- 設定與常數 --------------------------
# 固定的圖檔路徑（本題指定）
# 放在檔頭 import 後
from pathlib import Path

# 專案根：main.py 在 api/，往上一層就是專案根
BASE_DIR = Path(__file__).resolve().parents[1]

# 定義兩個路網檔案路徑（行人和腳踏車使用同一個路網）
BICYCLE_GRAPH_NAME = "OSM_taipei_DiGraph_TWD97_withpm25_realtime.pkl"
WALK_GRAPH_NAME = "OSM_taipei_DiGraph_TWD97_withpm25_realtime.pkl"

DEFAULT_BICYCLE_GRAPH = BASE_DIR / "data" / BICYCLE_GRAPH_NAME
DEFAULT_WALK_GRAPH = BASE_DIR / "data" / WALK_GRAPH_NAME

# 根據 mode 取得對應的路網檔案路徑（嘗試多個可能的路徑）
def get_graph_paths_for_mode(mode: str) -> List[Path]:
    """根據 mode 返回可能的路網檔案路徑列表"""
    graph_name = BICYCLE_GRAPH_NAME if mode == "bicycle" else WALK_GRAPH_NAME
    default_path = DEFAULT_BICYCLE_GRAPH if mode == "bicycle" else DEFAULT_WALK_GRAPH
    
    return [
        Path("/opt/render/project/src/data") / graph_name,  # Render 主要路徑
        default_path,  # 專案根/data/...
        BASE_DIR / "api" / "data" / graph_name,  # 專案根/api/data/...
        Path("data") / graph_name,  # 相對於 api/ 目錄
        Path("/opt/render/project/src/api/data") / graph_name,  # Render api/data 路徑
    ]

# 允許用環境變數覆蓋（向後相容）
GRAPH_PATH = Path(os.environ.get("GRAPH_PATH", str(DEFAULT_BICYCLE_GRAPH))).resolve()

# 啟動時印出絕對路徑，幫助你確認
print(f"[config] Default GRAPH_PATH = {GRAPH_PATH}")
print(f"[config] Bicycle graph: {DEFAULT_BICYCLE_GRAPH}")
print(f"[config] Walk graph: {DEFAULT_WALK_GRAPH}")


# 欄位鍵名（可透過環境變數改名，預設照題意）
EDGE_LEN_KEY = os.environ.get("EDGE_LEN_KEY", "length_m")
EDGE_PM25_KEY = os.environ.get("EDGE_PM25_KEY", "pm25")

# Google Geocoding（本題提供固定金鑰；實務上請改由環境變數）
GOOGLE_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "AIzaSyDnbTu8PgUkue5A9uO5aJa3lHZuNUwj6z0")
GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"


# -------------------------- Pydantic 模型 --------------------------
class Point(BaseModel):
    lat: float
    lng: float


class ReverseReq(BaseModel):
    point: Point


class RoutesReq(BaseModel):
    start: Optional[Any] = Field(None, description="可以是字串地址或 {lat,lng}")
    end: Optional[Any] = Field(None, description="可以是字串地址或 {lat,lng}")
    mode: Optional[str] = Field("bicycle", description="bicycle: 使用腳踏車路徑（有向圖，考慮方向）; walk: 使用行人路徑（無向圖，不考慮方向）")
    max_distance_increase: Optional[int] = Field(None, description="最高增加距離限制（公尺），None 表示無限制")


# -------------------------- 工具函式：地理編碼 --------------------------
def google_geocode(address: str, language: str = "zh-TW") -> Tuple[float, float, str]:
    """呼叫 Google Geocoding 將地址轉為 (lat,lng)。失敗時丟出 HTTPException。"""
    params = {"address": address, "key": GOOGLE_KEY, "language": language}
    try:
        r = requests.get(GOOGLE_GEOCODE_URL, params=params, timeout=10)
        data = r.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Geocoding request failed: {e}")

    if data.get("status") != "OK" or not data.get("results"):
        raise HTTPException(status_code=404, detail=f"Geocoding not found: {address}")

    result = data["results"][0]
    loc = result["geometry"]["location"]
    label = result.get("formatted_address", address)
    return float(loc["lat"]), float(loc["lng"]), label


def google_reverse(lat: float, lng: float, language: str = "zh-TW") -> str:
    """呼叫 Google Geocoding 將 (lat,lng) 反查地址字串。失敗時丟出 HTTPException。"""
    params = {"latlng": f"{lat},{lng}", "key": GOOGLE_KEY, "language": language}
    try:
        r = requests.get(GOOGLE_GEOCODE_URL, params=params, timeout=10)
        data = r.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Reverse geocoding request failed: {e}")

    if data.get("status") != "OK" or not data.get("results"):
        raise HTTPException(status_code=404, detail="Reverse geocoding not found")

    result = data["results"][0]
    return result.get("formatted_address", "")


# -------------------------- 路網載入與 KDTree --------------------------
# 維護兩個路網的狀態（腳踏車和行人）
G_bicycle: Optional[nx.Graph] = None
G_walk: Optional[nx.Graph] = None
_kdtree_bicycle: Optional[KDTree] = None
_kdtree_walk: Optional[KDTree] = None
_node_xy_bicycle: Optional[np.ndarray] = None
_node_xy_walk: Optional[np.ndarray] = None
_node_ids_bicycle: Optional[List[Any]] = None
_node_ids_walk: Optional[List[Any]] = None
_current_mode: Optional[str] = None  # 當前載入的 mode

# 向後相容的變數（指向當前使用的圖）
G: Optional[nx.Graph] = None
_kdtree: Optional[KDTree] = None
_node_xy: Optional[np.ndarray] = None
_node_ids: Optional[List[Any]] = None


def _node_attrs(g: nx.Graph, nid: Any) -> Dict[str, Any]:
    """
    取得節點屬性。根據 Streamlit 程式碼，節點本身就是座標 (x, y)，
    需要轉換為 lat/lng 格式。
    """
    # 節點本身就是座標 (x, y)，使用 EPSG:3826 投影座標系
    if isinstance(nid, (tuple, list)) and len(nid) == 2:
        x, y = nid
        return {"x": x, "y": y}
    
    # 如果節點有屬性字典，檢查是否有座標
    data = g.nodes[nid]
    if isinstance(data, dict):
        if "attr_dict" in data and isinstance(data["attr_dict"], dict):
            return data["attr_dict"]
        return data
    
    return {}


def _edge_attrs(ed: Any) -> Dict[str, Any]:
    """
    取得邊屬性，支援 MultiGraph 以及 attr_dict 內嵌格式。
    """
    # MultiGraph 可能是 {0: {...}}
    if isinstance(ed, dict) and 0 in ed:
        ed = ed[0]
    if isinstance(ed, dict) and "attr_dict" in ed and isinstance(ed["attr_dict"], dict):
        return ed["attr_dict"]
    return ed if isinstance(ed, dict) else {}


def _detect_node_xy_fields(g: nx.Graph) -> Tuple[str, str]:
    """自動偵測節點經緯度欄位名稱，回傳順序固定 (lat_field, lng_field)。"""
    if len(g.nodes) == 0:
        raise HTTPException(status_code=500, detail="Graph has no nodes")

    # 取一個樣本節點來看有哪些鍵
    n0 = next(iter(g.nodes))
    data = _node_attrs(g, n0)
    lat_candidates = ["y", "lat", "latitude"]
    lng_candidates = ["x", "lon", "lng", "longitude"]

    # 以小寫比對，但回傳原始鍵名（保留大小寫）
    def pick(original_keys, candidates):
        lower_map = {k.lower(): k for k in original_keys}
        for c in candidates:
            if c in lower_map:
                return lower_map[c]
        return None

    lat_field = pick(data.keys(), lat_candidates)
    lng_field = pick(data.keys(), lng_candidates)

    if lat_field and lng_field:
        return lat_field, lng_field

    # 偵測不到就丟出更明確的錯誤，列出此節點所有鍵名幫你比對
    raise HTTPException(
        status_code=500,
        detail=(
            f"Cannot detect lat/lng fields. Node keys={list(data.keys())}. "
            f"Expect one of lat∈{lat_candidates}, lng∈{lng_candidates}"
        ),
    )


def _parse_maxspeed(raw: Any) -> Optional[float]:
    """
    解析 maxspeed 欄位：
    - 可能是字串 '50', '50;60', '50 km/h'，或數字、None
    - 回傳 float 或 None（解析失敗時）
    """
    if raw is None:
        return None
    try:
        s = str(raw)
        # 取第一段數字（遇到 ; 或 空白 截斷）
        for sep in [";", " "]:
            if sep in s:
                s = s.split(sep)[0]
                break
        return float(s)
    except Exception:
        return None


def filter_graph_by_mode(graph: nx.Graph, mode: str) -> nx.Graph:
    """
    根據模式過濾路網，建立子圖：
    - bicycle：保留適合單車的路段（有向圖，考慮 oneway）
    - walk   ：保留適合行人的路段，並轉為無向圖

    規則對應說明請見 `路網設定/行人單車路網篩選規則.md`。
    """
    mode = mode or "bicycle"
    mode = "bicycle" if mode not in ["bicycle", "walk"] else mode

    # fclass 剔除規則（全部使用小寫比對）
    if mode == "walk":
        excluded_fclasses = {
            "bridleway",
            "busway",
            "motorway",
            "motorway_link",
            "trunk",
            "trunk_link",
        }
        excluded_names = set()
    else:  # bicycle
        excluded_fclasses = {
            "bridleway",
            "busway",
            "motorway",
            "motorway_link",
            "trunk",
            "trunk_link",
            "step",
        }
        excluded_names = {"車行地下道"}

    max_speed_limit = 80.0

    edges_to_keep: List[Tuple[Any, Any, Dict[str, Any]]] = []

    for u, v, ed in graph.edges(data=True):
        attrs = _edge_attrs(ed)
        should_exclude = False

        # fclass（有些資料可能用 highway）
        fclass = attrs.get("fclass") or attrs.get("highway")
        if isinstance(fclass, str):
            if fclass.strip().lower() in excluded_fclasses:
                should_exclude = True

        # maxspeed
        if not should_exclude:
            ms = _parse_maxspeed(attrs.get("maxspeed"))
            if ms is not None and ms > max_speed_limit:
                should_exclude = True

        # name（僅單車模式需要特別排除）
        if not should_exclude and mode == "bicycle":
            name = attrs.get("name")
            if isinstance(name, str):
                # 嚴格等於，避免誤傷其他路段；若未來需要可改成子字串判斷
                if name.strip() in excluded_names:
                    should_exclude = True

        if not should_exclude:
            edges_to_keep.append((u, v, ed))

    # 由保留的邊建立子圖
    if edges_to_keep:
        graph_filtered = graph.edge_subgraph([(u, v) for u, v, _ in edges_to_keep]).copy()
    else:
        # 極端情況：全部被過濾掉，為避免後續程式崩潰，回傳原圖並印出警告
        print(f"[filter_graph_by_mode] WARNING: all edges filtered out for mode={mode}, using original graph")
        graph_filtered = graph

    # 行人模式：轉成無向圖（不考慮方向）
    if mode == "walk" and isinstance(graph_filtered, nx.DiGraph):
        graph_filtered = graph_filtered.to_undirected()
        print("[filter_graph_by_mode] converted DiGraph to Graph for walk mode")

    return graph_filtered


def load_graph(mode: str = "bicycle") -> None:
    """
    載入 pickle 路網並建立 KDTree。根據 mode 載入對應的路網。
    根據 Streamlit 程式碼，節點本身就是 (x, y) 座標，使用 EPSG:3826 投影座標系，
    需要轉換為 WGS84 (EPSG:4326) 格式。
    
    參數：
    -----
    mode : str
        "bicycle" 或 "walk"，決定載入哪個路網
    """
    global G_bicycle, G_walk, _kdtree_bicycle, _kdtree_walk
    global _node_xy_bicycle, _node_xy_walk, _node_ids_bicycle, _node_ids_walk
    global G, _kdtree, _node_xy, _node_ids, _current_mode
    
    # 檢查是否已經載入過
    if mode == "bicycle" and G_bicycle is not None:
        print(f"[load_graph] Bicycle graph already loaded, using cached version")
        G = G_bicycle
        _kdtree = _kdtree_bicycle
        _node_xy = _node_xy_bicycle
        _node_ids = _node_ids_bicycle
        _current_mode = mode
        return
    
    if mode == "walk" and G_walk is not None:
        print(f"[load_graph] Walk graph already loaded, using cached version")
        G = G_walk
        _kdtree = _kdtree_walk
        _node_xy = _node_xy_walk
        _node_ids = _node_ids_walk
        _current_mode = mode
        return
    
    # 取得對應的路網路徑
    possible_graph_paths = get_graph_paths_for_mode(mode)
    graph_name = BICYCLE_GRAPH_NAME if mode == "bicycle" else WALK_GRAPH_NAME
    
    # 嘗試多個可能的路徑
    graph_loaded = False
    graph_to_load = None
    
    for graph_path in possible_graph_paths:
        try:
            print(f"[load_graph] trying to load {mode} graph from: {graph_path}")
            if graph_path.exists():
                with open(graph_path, "rb") as f:
                    graph_to_load = pickle.load(f)
                print(f"[load_graph] successfully loaded {mode} base graph from: {graph_path}")
                graph_loaded = True
                break
            else:
                print(f"[load_graph] {mode} graph file not found: {graph_path}")
        except Exception as e:
            print(f"[load_graph] failed to load {mode} graph from {graph_path}: {e}")
            continue
    
    if not graph_loaded:
        raise RuntimeError(f"Failed to load {mode} graph pickle from any of the attempted paths: {possible_graph_paths}")

    # 根據 mode 套用行人 / 單車篩選規則與圖類型轉換
    try:
        before_edges = graph_to_load.number_of_edges()
        graph_to_load = filter_graph_by_mode(graph_to_load, mode)
        after_edges = graph_to_load.number_of_edges()
        print(
            f"[load_graph] filter_graph_by_mode({mode}) "
            f"kept {after_edges}/{before_edges} edges "
            f"({after_edges / before_edges * 100.0:.1f}% remaining)" if before_edges > 0 else
            f"[load_graph] filter_graph_by_mode({mode}) applied (no edges in base graph)"
        )
    except Exception as fe:
        print(f"[load_graph] WARNING: filter_graph_by_mode failed for mode={mode}: {fe}")
        # 若篩選失敗，為避免服務中斷，退回使用原始圖

    # 建立座標轉換器：從 EPSG:3826 (TWD97) 轉換到 EPSG:4326 (WGS84)
    transformer = Transformer.from_crs("epsg:3826", "epsg:4326", always_xy=True)
    
    # 建立節點座標映射
    mapping = {}
    coords: List[List[float]] = []
    node_ids: List[Any] = []
    bad_cnt = 0
    
    print(f"[load_graph] processing {len(graph_to_load.nodes)} nodes for {mode} graph...")
    
    for nid in graph_to_load.nodes:
        # 節點本身就是座標 (x, y)
        if isinstance(nid, (tuple, list)) and len(nid) == 2:
            x, y = nid
            try:
                # 轉換座標：TWD97 -> WGS84
                lon, lat = transformer.transform(x, y)
                if math.isfinite(lat) and math.isfinite(lon):
                    coords.append([lat, lon])
                    node_ids.append(nid)
                    mapping[(lat, lon)] = nid
                    # 將轉換後的座標存回節點屬性
                    graph_to_load.nodes[nid]["latlon"] = (lat, lon)
                else:
                    bad_cnt += 1
            except Exception as e:
                bad_cnt += 1
                continue
        else:
            bad_cnt += 1
    
    if not coords:
        raise RuntimeError(f"No valid node coordinates for KDTree in {mode} graph")
    
    # 儲存映射到圖的全局屬性
    graph_to_load.graph['latlon_nodes'] = list(mapping.keys())
    graph_to_load.graph['node_lookup'] = mapping
    
    node_xy = np.array(coords, dtype=float)
    kdtree = KDTree(node_xy)
    print(f"[load_graph] built KDTree for {mode} graph with {len(node_ids)} nodes (filtered {bad_cnt} invalid nodes)")
    
    # 檢查圖的連通性（僅在載入時檢查一次，用於調試）
    if isinstance(graph_to_load, nx.DiGraph):
        is_connected = nx.is_weakly_connected(graph_to_load)
        num_components = nx.number_weakly_connected_components(graph_to_load)
        print(f"[load_graph] {mode} graph connectivity: {'connected' if is_connected else f'not connected ({num_components} weakly connected components)'}")
    else:
        is_connected = nx.is_connected(graph_to_load)
        num_components = nx.number_connected_components(graph_to_load)
        print(f"[load_graph] {mode} graph connectivity: {'connected' if is_connected else f'not connected ({num_components} connected components)'}")
    
    # 根據 mode 儲存到對應的全域變數
    if mode == "bicycle":
        G_bicycle = graph_to_load
        _kdtree_bicycle = kdtree
        _node_xy_bicycle = node_xy
        _node_ids_bicycle = node_ids
        G = G_bicycle
        _kdtree = _kdtree_bicycle
        _node_xy = _node_xy_bicycle
        _node_ids = _node_ids_bicycle
    else:  # walk
        G_walk = graph_to_load
        _kdtree_walk = kdtree
        _node_xy_walk = node_xy
        _node_ids_walk = node_ids
        G = G_walk
        _kdtree = _kdtree_walk
        _node_xy = _node_xy_walk
        _node_ids = _node_ids_walk
    
    _current_mode = mode


def nearest_node(lat: float, lng: float) -> Any:
    """
    用 KDTree 找最近節點 ID（更穩健）：
    - 檢查輸入是否為有限值
    - 檢查 KDTree 回傳的 idx 是否為 NaN/None
    - 透過 _node_ids 安全映射回真正 node id
    """
    assert _kdtree is not None and _node_ids is not None and _node_xy is not None, "KDTree not built"
    if not (math.isfinite(lat) and math.isfinite(lng)):
        raise HTTPException(status_code=400, detail="Invalid start/end coordinates (NaN/inf)")
    dist, idx = _kdtree.query([lat, lng], k=1)
    if isinstance(idx, (list, np.ndarray)):
        idx = idx[0]
    if idx is None or (isinstance(idx, float) and math.isnan(idx)):
        raise HTTPException(status_code=500, detail="KDTree query returned NaN index (check node coords)")
    try:
        return _node_ids[int(idx)]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to map KDTree index to node id: {e}")


def path_geometry(g: nx.Graph, path: List[Any]) -> List[List[float]]:
    """將節點路徑轉為 [[lat,lng], ...] 幾何。"""
    geom: List[List[float]] = []
    for nid in path:
        # 使用儲存在節點中的 latlon 屬性
        if "latlon" in g.nodes[nid]:
            lat, lon = g.nodes[nid]["latlon"]
            geom.append([lat, lon])
        else:
            # 如果沒有 latlon 屬性，嘗試從節點 ID 轉換
            if isinstance(nid, (tuple, list)) and len(nid) == 2:
                x, y = nid
                transformer = Transformer.from_crs("epsg:3826", "epsg:4326", always_xy=True)
                lon, lat = transformer.transform(x, y)
                geom.append([lat, lon])
    return geom


def _iter_edge_attrs(g: nx.Graph, u: Any, v: Any) -> List[Dict[str, Any]]:
    """
    統一處理 DiGraph / MultiGraph / MultiDiGraph 的邊屬性取得方式。
    - 對 DiGraph：get_edge_data(u, v) 直接是一個 dict（單一邊）
    - 對 MultiGraph：get_edge_data(u, v) 回傳 { key: { ... }, key2: { ... }, ... }
    這裡會攤平成一串 attrs dict，交給 _edge_attrs 做最後處理。
    """
    edge_data = g.get_edge_data(u, v)
    if not edge_data:
        return []

    # MultiGraph / MultiDiGraph：edge_data 是 { key: { ... } }
    # 判斷方式：裡面只要有任何 value 是 dict，就當成多條邊
    if any(isinstance(val, dict) for val in edge_data.values()):
        dicts = edge_data.values()
    else:
        # DiGraph：edge_data 自己就是單一邊的 attrs dict
        dicts = [edge_data]

    attrs_list: List[Dict[str, Any]] = []
    for d in dicts:
        attrs_list.append(_edge_attrs(d))
    return attrs_list


def path_cost_and_length(g: nx.Graph, path: List[Any]) -> Tuple[float, float]:
    """
    回傳 (累計暴露, 累計距離km)。
    根據 Streamlit 程式碼，邊屬性在 attr_dict 中。
    """
    exp_sum = 0.0
    len_m_sum = 0.0
    for u, v in zip(path[:-1], path[1:]):
        for attrs in _iter_edge_attrs(g, u, v):
            # 優先使用自動化流程寫入的 length_m（公尺），若不存在再退回舊的 length
            length = float(attrs.get("length_m", attrs.get("length", 0.0)))
            expo = float(attrs.get("PM25_expo", 0.0))
            # 邊層級已定義 PM25_expo = PM25 * length_m，這裡總暴露量直接累加 PM25_expo
            exp_sum += expo
            len_m_sum += length
    return exp_sum, len_m_sum / 1000.0


def _find_limited_exposure_path(g: nx.Graph, start: Any, end: Any, shortest_path: List[Any], max_increase_m: int) -> List[Any]:
    """
    在距離限制下找到最低暴露路徑。
    使用簡化的方法：先計算無限制的最低暴露路徑，如果距離超限則回傳最短路徑。
    """
    # 計算最短路徑的總距離
    shortest_distance = 0.0
    for u, v in zip(shortest_path[:-1], shortest_path[1:]):
        for attrs in _iter_edge_attrs(g, u, v):
            shortest_distance += float(attrs.get("length_m", attrs.get("length", 0.0)))
    
    max_allowed_distance = shortest_distance + max_increase_m
    print(f"[debug] shortest_distance: {shortest_distance:.2f}m, max_allowed: {max_allowed_distance:.2f}m")
    
    # 如果限制太小，直接回傳最短路徑
    if max_increase_m <= 0:
        return shortest_path
    
    try:
        # 先計算無限制的最低暴露路徑
        def _weight_exposure(u, v, ed):
            attrs = _edge_attrs(ed)
            length = float(attrs.get("length_m", attrs.get("length", 1.0)))
            expo = float(attrs.get("PM25_expo", 0.0))
            # 最低暴露路徑權重：PM25_expo × length（與 offline 演算法一致）
            return expo * length
        
        exposure_path = nx.shortest_path(g, start, end, weight=_weight_exposure)
        
        # 計算最低暴露路徑的距離
        exposure_distance = 0.0
        for u, v in zip(exposure_path[:-1], exposure_path[1:]):
            for attrs in _iter_edge_attrs(g, u, v):
                exposure_distance += float(attrs.get("length_m", attrs.get("length", 0.0)))
        
        print(f"[debug] exposure_path distance: {exposure_distance:.2f}m")
        
        # 如果最低暴露路徑在距離限制內，就使用它
        if exposure_distance <= max_allowed_distance:
            print(f"[debug] using exposure path (within limit)")
            return exposure_path
        else:
            print(f"[debug] exposure path too long, using shortest path")
            return shortest_path
            
    except Exception as e:
        print(f"[debug] error calculating exposure path: {e}, using shortest")
        return shortest_path


def _get_path_exposure(g: nx.Graph, path: List[Any]) -> float:
    """計算路徑的總暴露量"""
    total_exposure = 0.0
    for u, v in zip(path[:-1], path[1:]):
        for attrs in _iter_edge_attrs(g, u, v):
            length = float(attrs.get("length_m", attrs.get("length", 0.0)))
            expo = float(attrs.get("PM25_expo", 0.0))
            # 與 path_cost_and_length 保持一致：直接累加 PM25_expo（已為 PM25 * length_m）
            total_exposure += expo
    return total_exposure


def _get_path_exposure_weighted_by_length(g: nx.Graph, path: List[Any]) -> float:
    """
    計算「PM25_expo * length」版的總暴露，用於改善率計算：
    - 邊層級已有 PM25_expo = PM25 * length_m
    - 這裡再乘一次 length（length_m），保留與舊版改善率邏輯一致
    """
    total_exposure = 0.0
    for u, v in zip(path[:-1], path[1:]):
        for attrs in _iter_edge_attrs(g, u, v):
            length = float(attrs.get("length_m", attrs.get("length", 0.0)))
            expo = float(attrs.get("PM25_expo", 0.0))
            total_exposure += expo * length
    return total_exposure


def _get_path_distance(g: nx.Graph, path: List[Any]) -> float:
    """計算路徑的總距離"""
    total_distance = 0.0
    for u, v in zip(path[:-1], path[1:]):
        for attrs in _iter_edge_attrs(g, u, v):
            total_distance += float(attrs.get("length_m", attrs.get("length", 0.0)))
    return total_distance


# -------------------------- FastAPI App --------------------------
app = FastAPI(title="Comfort Routing System Backend")

# CORS：開放本機前端（file:// 或 http://localhost）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開發期先全開，正式再收斂
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 靜態檔案服務
app.mount("/static", StaticFiles(directory=".."), name="static")

# 健康檢查端點
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "API is running"}

# 直接提供靜態檔案端點
@app.get("/styles.css")
async def get_styles():
    return FileResponse("../styles.css", media_type="text/css")

@app.get("/app.js")
async def get_app_js():
    return FileResponse("../app.js", media_type="application/javascript")

@app.get("/vendor/leaflet/leaflet.css")
async def get_leaflet_css():
    return FileResponse("../vendor/leaflet/leaflet.css", media_type="text/css")

@app.get("/vendor/leaflet/leaflet.js")
async def get_leaflet_js():
    return FileResponse("../vendor/leaflet/leaflet.js", media_type="application/javascript")

# 根路徑返回前端頁面
@app.get("/api/overlay/{overlay_type}")
async def get_overlay(overlay_type: str):
    """獲取疊加圖層資訊（完全像 .pkl 檔案的處理方式）"""
    
    # 定義疊加圖層檔案路徑（相對路徑，後端直接讀取）
    overlay_files = {
        "pm25": "data/AirPollution/PM25__20241130.png",
        "no2": "data/AirPollution/NO2_全台.png", 
        "wbgt": "data/AirPollution/WBGT_全台.png"
    }
    
    if overlay_type not in overlay_files:
        raise HTTPException(status_code=404, detail="Overlay type not found")
    
    # 檢查檔案是否存在（像 .pkl 檔案一樣）
    file_path = BASE_DIR / overlay_files[overlay_type]
    print(f"[DEBUG] Looking for overlay file: {file_path}")
    print(f"[DEBUG] File exists: {file_path.exists()}")
    
    if not file_path.exists():
        # 嘗試其他可能的路徑
        alternative_paths = [
            BASE_DIR.parent / overlay_files[overlay_type],
            Path(overlay_files[overlay_type])
        ]
        
        for alt_path in alternative_paths:
            print(f"[DEBUG] Trying alternative path: {alt_path}")
            if alt_path.exists():
                file_path = alt_path
                break
        else:
            raise HTTPException(status_code=404, detail=f"Overlay file not found: {file_path}")
    
    # 讀取圖片檔案並轉換為 base64（像 .pkl 檔案一樣處理）
    import base64
    
    try:
        file_extension = file_path.suffix.lower()
        
        # 直接讀取 PNG 檔案（PM2.5 已預處理）
        print(f"[DEBUG] Loading PNG overlay file: {file_path}")
        
        # 對於 PM2.5，使用預處理好的地理邊界
        if overlay_type == 'pm25':
            # 使用預處理好的地理邊界資訊
            geo_bounds = [[24.673148524048187, 121.28083627348856], [25.300587805633413, 122.00969105489887]]
            print(f"[DEBUG] Using predefined bounds for PM2.5: {geo_bounds}")
            
            # 讀取 PNG 檔案
            with open(file_path, 'rb') as f:
                image_data = f.read()
                image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            return {
                "image_data": f"data:image/png;base64,{image_base64}",
                "bounds": geo_bounds,
                "opacity": 0.5,
                "file_exists": True,
                "file_size": file_path.stat().st_size,
                "debug_path": str(file_path),
                "original_format": file_extension,
                "preprocessed": True,
                "coordinate_info": {
                    "source": "preprocessed_png",
                    "bounds": geo_bounds,
                    "description": "Using predefined WGS84 bounds from tif2png conversion"
                }
            }
        else:
            # 對於其他格式（如 NO2, WBGT PNG），使用預設邊界
            with open(file_path, 'rb') as f:
                image_data = f.read()
                image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            # 預設邊界（台灣全島）
            default_bounds = [[21.9, 120.1], [25.3, 122.0]]
            
            return {
                "image_data": f"data:image/png;base64,{image_base64}",
                "bounds": default_bounds,
                "opacity": 0.5,
                "file_exists": True,
                "file_size": file_path.stat().st_size,
                "debug_path": str(file_path),
                "original_format": file_extension,
                "preprocessed": True,
                "coordinate_info": {
                    "source": "preprocessed_png",
                    "bounds": default_bounds,
                    "description": "Using default Taiwan bounds for other overlays"
                }
            }
            
    except Exception as e:
        print(f"[ERROR] Failed to process overlay file {file_path}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process overlay file: {str(e)}")

@app.get("/")
async def read_index():
    return FileResponse("../index.html")


@app.on_event("startup")
def _on_startup():
    """啟動時預載入腳踏車路網（預設模式）。"""
    try:
        # 預載入腳踏車路網（預設模式）
        print(f"[startup] attempting to preload bicycle graph (default mode)...")
        load_graph("bicycle")
        print(f"[startup] Bicycle graph preloaded: nodes={len(G.nodes) if G else 0}, edges={len(G.edges) if G else 0}")
    except Exception as ie:
        print(f"[startup] Failed to preload bicycle graph: {ie}")
        print(f"[startup] Graph will be loaded on-demand when first route request arrives")
        import traceback
        traceback.print_exc()
    
    # 啟動時輸出圖資訊與除錯樣本，方便檢查欄位命名
    if G is not None:
        graph_type = "DiGraph" if isinstance(G, nx.DiGraph) else "Graph"
        print(f"[startup] Graph loaded: type={graph_type}, nodes={len(G.nodes)} edges={len(G.edges)}")
        try:
            # 連通分量資訊（若為無向圖適用；有向圖可改強制無向視圖）
            if isinstance(G, nx.Graph) and not G.is_directed():
                comps = list(nx.connected_components(G))
                if comps:
                    sizes = sorted([len(c) for c in comps], reverse=True)
                    print(f"[startup] Connected components: {len(comps)}, largest={sizes[0]}")
            elif isinstance(G, nx.DiGraph):
                weak_comps = list(nx.weakly_connected_components(G))
                if weak_comps:
                    sizes = sorted([len(c) for c in weak_comps], reverse=True)
                    print(f"[startup] Weakly connected components: {len(weak_comps)}, largest={sizes[0]}")
        except Exception as ce:
            print(f"[startup] component info error: {ce}")

        # 隨機列印幾條邊的屬性鍵，協助確認長度/暴露欄位名稱
        try:
            sample = 0
            for u, v, ed in G.edges(data=True):
                print(f"[edge-raw-{sample}]", type(ed), ed)
                if isinstance(ed, dict) and 0 in ed:
                    ed = ed[0]
                print("[edge-sample-keys]", list(ed.keys()))
                # 攤平邊屬性看看內容
                flat_ed = _edge_attrs(ed)
                print("[edge-flat-keys]", list(flat_ed.keys()))
                sample += 1
                if sample >= 5:
                    break
        except Exception as se:
            print(f"[startup] edge sample error: {se}")
    else:
        print("[startup] Graph is None - geocode/reverse will work, but routes will fail until graph is loaded")


def _ensure_graph_loaded_or_raise(mode: str = "bicycle"):
    """在 /api/routes 執行前確保對應 mode 的 KDTree 已建立；若尚未建立，嘗試載入一次並回報清楚錯誤。"""
    global G, _kdtree, _current_mode
    
    # 檢查是否需要切換圖
    if _current_mode != mode or _kdtree is None or G is None:
        try:
            load_graph(mode)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load {mode} graph: {e}")
    
    if _kdtree is None or G is None:
        raise HTTPException(status_code=500, detail=f"KDTree not built for {mode} mode (graph may be empty or coordinates invalid)")


@app.post("/api/geocode")
def api_geocode(payload: Dict[str, Any]):
    """地址轉座標：輸入 {"address":"..."}，回傳 {lat,lng,label}。"""
    address = payload.get("address")
    if not address:
        raise HTTPException(status_code=400, detail="address is required")
    lat, lng, label = google_geocode(address, language="zh-TW")
    return {"lat": lat, "lng": lng, "label": label}


@app.post("/api/reverse")
def api_reverse(req: ReverseReq):
    """座標轉地址：輸入 {point:{lat,lng}}，回傳 {label}。"""
    label = google_reverse(req.point.lat, req.point.lng, language="zh-TW")
    return {"label": label}


@app.post("/api/routes")
def api_routes(req: RoutesReq):
    """
    計算最短與最低暴露路徑：
    - 輸入可為：
        {start:{lat,lng}, end:{lat,lng}} 或 {start:"地址", end:"地址"}
    - mode 決定使用哪個路網：
        - "bicycle": 使用腳踏車路徑（有向圖，考慮方向）
        - "walk": 使用行人路徑（無向圖，不考慮方向）
    - 回傳格式符合前端 renderRoutes() 需求。
    """
    # 取得 mode，預設為 bicycle
    mode = req.mode if req.mode else "bicycle"
    # 標準化 mode（只接受 bicycle 或 walk）
    if mode not in ["bicycle", "walk"]:
        mode = "bicycle"  # 預設為 bicycle
    
    print(f"[debug] received request: mode={mode}, max_distance_increase={req.max_distance_increase}")
    
    # 根據 mode 載入對應的路網並確保 KDTree 已建立
    _ensure_graph_loaded_or_raise(mode)

    # 解析/地理編碼 start/end
    def _resolve_point(p: Any) -> Tuple[float, float, str]:
        if isinstance(p, dict) and "lat" in p and "lng" in p:
            return float(p["lat"]), float(p["lng"]), ""
        if isinstance(p, str):
            lat, lng, label = google_geocode(p, language="zh-TW")
            return lat, lng, label
        raise HTTPException(status_code=400, detail="start/end must be address string or {lat,lng}")

    try:
        s_lat, s_lng, _ = _resolve_point(req.start)
        e_lat, e_lng, _ = _resolve_point(req.end)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid start/end: {e}")

    # 找最近節點
    try:
        s_node = nearest_node(s_lat, s_lng)
        e_node = nearest_node(e_lat, e_lng)
        print(f"[debug] Found nearest nodes: start={s_node}, end={e_node}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"KDTree/nearest error: {e}")

    # 檢查節點是否在圖中
    if s_node not in G:
        raise HTTPException(status_code=500, detail=f"Start node {s_node} not found in {mode} graph")
    if e_node not in G:
        raise HTTPException(status_code=500, detail=f"End node {e_node} not found in {mode} graph")
    
    # 檢查是否有路徑（在計算前先檢查，提供更清楚的錯誤訊息）
    has_path = False
    if isinstance(G, nx.DiGraph):
        has_path = nx.has_path(G, s_node, e_node)
    else:
        has_path = nx.has_path(G, s_node, e_node)
    
    if not has_path:
        # 檢查連通性（提供更詳細的錯誤訊息）
        if isinstance(G, nx.DiGraph):
            # 有向圖：檢查弱連通
            components = list(nx.weakly_connected_components(G))
            s_component = None
            e_component = None
            for i, comp in enumerate(components):
                if s_node in comp:
                    s_component = i
                if e_node in comp:
                    e_component = i
            
            if s_component is not None and e_component is not None and s_component != e_component:
                raise HTTPException(
                    status_code=404, 
                    detail=f"起點和終點不在同一個連通分量中（行人路徑圖不連通）。起點在第 {s_component+1} 個連通分量，終點在第 {e_component+1} 個連通分量。請選擇其他起點或終點。"
                )
        else:
            # 無向圖：檢查連通分量
            components = list(nx.connected_components(G))
            s_component = None
            e_component = None
            for i, comp in enumerate(components):
                if s_node in comp:
                    s_component = i
                if e_node in comp:
                    e_component = i
            
            if s_component is not None and e_component is not None and s_component != e_component:
                raise HTTPException(
                    status_code=404, 
                    detail=f"起點和終點不在同一個連通分量中（行人路徑圖不連通）。起點在第 {s_component+1} 個連通分量，終點在第 {e_component+1} 個連通分量。請選擇其他起點或終點。"
                )
        
        raise HTTPException(
            status_code=404,
            detail=f"無法找到從起點到終點的路徑。這可能是因為行人路徑圖不連通，或起終點距離太遠。請嘗試選擇其他起點或終點。"
        )

    # 計算兩種路徑
    def _weight_length(u, v, ed):
        """最短路徑權重：使用 length 欄位。"""
        attrs = _edge_attrs(ed)
        return float(attrs.get("length_m", attrs.get("length", 1.0)))

    def _weight_exposure(u, v, ed):
        """最低暴露路徑權重：PM25_expo × length（與 offline 演算法一致）。"""
        attrs = _edge_attrs(ed)
        length = float(attrs.get("length_m", attrs.get("length", 1.0)))
        expo = float(attrs.get("PM25_expo", 0.0))
        return expo * length

    try:
        # 計算最短路徑
        path_shortest = nx.shortest_path(G, s_node, e_node, weight=_weight_length)
        
        # 計算最低暴露路徑（考慮距離限制）
        if req.max_distance_increase is None:
            # 無距離限制，直接計算最低暴露路徑
            path_lowest = nx.shortest_path(G, s_node, e_node, weight=_weight_exposure)
        else:
            # 有距離限制，使用受限算法
            path_lowest = _find_limited_exposure_path(G, s_node, e_node, path_shortest, req.max_distance_increase)
            
    except nx.NetworkXNoPath:
        raise HTTPException(
            status_code=404,
            detail="無法找到路徑。起點和終點之間沒有連通的路徑。請嘗試選擇其他起點或終點。"
        )
    except Exception as e:
        # 將原始錯誤訊息直接回傳，利於前端顯示與定位（例如 KeyError）
        raise HTTPException(status_code=502, detail=f"routing failed: {type(e).__name__}: {e}")

    # 幾何與指標
    geom_short = path_geometry(G, path_shortest)
    geom_low = path_geometry(G, path_lowest)

    exp_s, dist_s_km = path_cost_and_length(G, path_shortest)
    exp_l, dist_l_km = path_cost_and_length(G, path_lowest)

    extra_m = max(0.0, (dist_l_km - dist_s_km) * 1000.0)

    # 改善率仍沿用「PM25_expo * length」版，與舊版邏輯相容
    exp_s_len = _get_path_exposure_weighted_by_length(G, path_shortest)
    exp_l_len = _get_path_exposure_weighted_by_length(G, path_lowest)
    # Debug: 輸出實際數值
    print(f"[debug] exp_s_len (shortest PM25_expo*length): {exp_s_len}")
    print(f"[debug] exp_l_len (lowest PM25_expo*length): {exp_l_len}")
    print(f"[debug] exp_s (shortest ΣPM25_expo): {exp_s}, exp_l (lowest ΣPM25_expo): {exp_l}")
    
    # 若 exp_s_len <= 0，改用其絕對值當分母（避免異常負值把改善率鎖成 0）
    denom = abs(exp_s_len)
    improvement_raw = (
        ((exp_s_len - exp_l_len) / denom * 100.0)
        if denom > 0
        else 0.0
    )
    print(f"[debug] improvement_raw: {improvement_raw}%, denom: {denom}")
    
    # 如果改善率是負的（低暴露路徑其實更糟），顯示絕對值並加 * 標記
    if improvement_raw < 0:
        improvement_rate = f"{abs(round(improvement_raw, 1))} *"
    else:
        improvement_rate = round(improvement_raw, 1)
    print(f"[debug] final improvement_rate: {improvement_rate}")
    
    # 計算暴露量減少值（使用 Σ PM25_expo）
    exposure_reduction = max(0.0, exp_s - exp_l)

    resp = {
        "start": [s_lat, s_lng],
        "end": [e_lat, e_lng],
        "shortest": {
            "distance_km": round(dist_s_km, 3),
            "exposure": round(exp_s, 1),
            "geometry": geom_short
        },
        "lowest": {
            "distance_km": round(dist_l_km, 3),
            "exposure": round(exp_l, 1),
            "exposure_reduction": round(exposure_reduction, 2),  # 新增：暴露量減少值
            "geometry": geom_low,
            "extra_distance_m": int(round(extra_m)),
            "improvement_rate": improvement_rate
        }
    }
    return resp


