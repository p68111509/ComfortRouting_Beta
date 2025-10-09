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
1) 將路網檔放在 data\雙北基隆路網_濃度與暴露_最大連通版.pkl
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
DEFAULT_GRAPH = BASE_DIR / "data" / "雙北基隆路網_濃度與暴露_最大連通版.pkl"

# 在 Render 上，嘗試多個可能的路徑
possible_graph_paths = [
    DEFAULT_GRAPH,  # 專案根/data/...
    BASE_DIR / "api" / "data" / "雙北基隆路網_濃度與暴露_最大連通版.pkl",  # 專案根/api/data/...
    Path("data") / "雙北基隆路網_濃度與暴露_最大連通版.pkl",  # 相對於 api/ 目錄
]

# 允許用環境變數覆蓋；沒設就用專案根/data 的預設
GRAPH_PATH = Path(os.environ.get("GRAPH_PATH", str(DEFAULT_GRAPH))).resolve()

# 啟動時印出絕對路徑，幫助你確認
print(f"[config] GRAPH_PATH = {GRAPH_PATH}")


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
    mode: Optional[str] = Field("bicycle", description="walk/bicycle/motorcycle，先不影響權重")
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
G: Optional[nx.Graph] = None
_kdtree: Optional[KDTree] = None
_node_xy: Optional[np.ndarray] = None
_node_ids: Optional[List[Any]] = None  # KDTree 索引 -> 圖上 node id 的映射（修正索引錯位）


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


def load_graph() -> None:
    """
    載入 pickle 路網並建立 KDTree。伺服器啟動時執行一次。
    根據 Streamlit 程式碼，節點本身就是 (x, y) 座標，使用 EPSG:3826 投影座標系，
    需要轉換為 WGS84 (EPSG:4326) 格式。
    """
    global G, _kdtree, _node_xy, _node_ids
    
    # 嘗試多個可能的路徑
    graph_loaded = False
    for graph_path in possible_graph_paths:
        try:
            print(f"[startup] trying to load graph from: {graph_path}")
            if graph_path.exists():
                with open(graph_path, "rb") as f:
                    G = pickle.load(f)
                print(f"[startup] successfully loaded graph from: {graph_path}")
                graph_loaded = True
                break
            else:
                print(f"[startup] graph file not found: {graph_path}")
        except Exception as e:
            print(f"[startup] failed to load graph from {graph_path}: {e}")
            continue
    
    if not graph_loaded:
        raise RuntimeError(f"Failed to load graph pickle from any of the attempted paths: {possible_graph_paths}")

    # 建立座標轉換器：從 EPSG:3826 (TWD97) 轉換到 EPSG:4326 (WGS84)
    transformer = Transformer.from_crs("epsg:3826", "epsg:4326", always_xy=True)
    
    # 建立節點座標映射
    mapping = {}
    coords: List[List[float]] = []
    node_ids: List[Any] = []
    bad_cnt = 0
    
    print(f"[startup] processing {len(G.nodes)} nodes...")
    
    for nid in G.nodes:
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
                    G.nodes[nid]["latlon"] = (lat, lon)
                else:
                    bad_cnt += 1
            except Exception as e:
                bad_cnt += 1
                continue
        else:
            bad_cnt += 1
    
    if not coords:
        raise RuntimeError("No valid node coordinates for KDTree")
    
    # 儲存映射到圖的全局屬性
    G.graph['latlon_nodes'] = list(mapping.keys())
    G.graph['node_lookup'] = mapping
    
    _node_xy = np.array(coords, dtype=float)
    _node_ids = node_ids
    _kdtree = KDTree(_node_xy)
    print(f"[kdtree] built with {len(_node_ids)} nodes having coordinates (filtered {bad_cnt} invalid nodes)")


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


def path_cost_and_length(g: nx.Graph, path: List[Any]) -> Tuple[float, float]:
    """
    回傳 (累計暴露, 累計距離km)。
    根據 Streamlit 程式碼，邊屬性在 attr_dict 中。
    """
    exp_sum = 0.0
    len_m_sum = 0.0
    for u, v in zip(path[:-1], path[1:]):
        edge_data = g.get_edge_data(u, v)
        if edge_data:
            # 處理 MultiGraph 的情況
            for d in edge_data.values():
                attrs = _edge_attrs(d)
                length = float(attrs.get("length", 0.0))
                pm25 = float(attrs.get("PM25_expo", 0.0))
                exp_sum += pm25 * length
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
        edge_data = g.get_edge_data(u, v)
        if edge_data:
            for d in edge_data.values():
                attrs = _edge_attrs(d)
                shortest_distance += float(attrs.get("length", 0.0))
    
    max_allowed_distance = shortest_distance + max_increase_m
    print(f"[debug] shortest_distance: {shortest_distance:.2f}m, max_allowed: {max_allowed_distance:.2f}m")
    
    # 如果限制太小，直接回傳最短路徑
    if max_increase_m <= 0:
        return shortest_path
    
    try:
        # 先計算無限制的最低暴露路徑
        def _weight_exposure(u, v, ed):
            attrs = _edge_attrs(ed)
            length = float(attrs.get("length", 1.0))
            pm25 = float(attrs.get("PM25_expo", 0.0))
            return pm25 * length
        
        exposure_path = nx.shortest_path(g, start, end, weight=_weight_exposure)
        
        # 計算最低暴露路徑的距離
        exposure_distance = 0.0
        for u, v in zip(exposure_path[:-1], exposure_path[1:]):
            edge_data = g.get_edge_data(u, v)
            if edge_data:
                for d in edge_data.values():
                    attrs = _edge_attrs(d)
                    exposure_distance += float(attrs.get("length", 0.0))
        
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
        edge_data = g.get_edge_data(u, v)
        if edge_data:
            for d in edge_data.values():
                attrs = _edge_attrs(d)
                length = float(attrs.get("length", 0.0))
                pm25 = float(attrs.get("PM25_expo", 0.0))
                total_exposure += pm25 * length
    return total_exposure


def _get_path_distance(g: nx.Graph, path: List[Any]) -> float:
    """計算路徑的總距離"""
    total_distance = 0.0
    for u, v in zip(path[:-1], path[1:]):
        edge_data = g.get_edge_data(u, v)
        if edge_data:
            for d in edge_data.values():
                attrs = _edge_attrs(d)
                total_distance += float(attrs.get("length", 0.0))
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
@app.get("/")
async def read_index():
    return FileResponse("../index.html")


@app.on_event("startup")
def _on_startup():
    """啟動時載入路網與 KDTree。"""
    try:
        # 若圖檔不存在，先提示但不中斷啟動（讓 geocode/reverse 可用）
        if not os.path.exists(str(GRAPH_PATH)):
            print(f"[startup] graph file not found: {GRAPH_PATH}")
        else:
            print(f"[startup] attempting to load graph: {GRAPH_PATH}")
            load_graph()
    except Exception as ie:
        print(f"[startup] load_graph exception: {ie}")
        import traceback
        traceback.print_exc()
    
    # 啟動時輸出圖資訊與除錯樣本，方便檢查欄位命名
    if G is not None:
        print(f"Graph loaded: {GRAPH_PATH}, nodes={len(G.nodes)} edges={len(G.edges)}")
        try:
            # 連通分量資訊（若為無向圖適用；有向圖可改強制無向視圖）
            if isinstance(G, nx.Graph):
                comps = list(nx.connected_components(G)) if not G.is_directed() else []
                if comps:
                    sizes = sorted([len(c) for c in comps], reverse=True)
                    print(f"Connected components: {len(comps)}, largest={sizes[0]}")
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
        print("[startup] Graph is None - geocode/reverse will work, but routes will fail")


def _ensure_graph_loaded_or_raise():
    """在 /api/routes 執行前確保 KDTree 已建立；若尚未建立，嘗試載入一次並回報清楚錯誤。"""
    global G, _kdtree
    if _kdtree is not None and G is not None:
        return
    # 嘗試即時載入一次
    try:
        if not os.path.exists(str(GRAPH_PATH)):
            raise HTTPException(status_code=500, detail=f"Graph file not found: {GRAPH_PATH}")
        load_graph()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build KDTree/graph: {e}")
    if _kdtree is None or G is None:
        raise HTTPException(status_code=500, detail="KDTree not built (graph may be empty or coordinates invalid)")


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
    - mode 目前不影響權重（保留擴充點）。
    - 回傳格式符合前端 renderRoutes() 需求。
    """
    print(f"[debug] received request: max_distance_increase={req.max_distance_increase}")
    
    # 確保 KDTree 已建立；否則嘗試載入並拋出具體訊息
    _ensure_graph_loaded_or_raise()

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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"KDTree/nearest error: {e}")

    # 計算兩種路徑
    def _weight_length(u, v, ed):
        """最短路徑權重：使用 length 欄位。"""
        attrs = _edge_attrs(ed)
        return float(attrs.get("length", 1.0))

    def _weight_exposure(u, v, ed):
        """最低暴露路徑權重：PM25_expo * length。"""
        attrs = _edge_attrs(ed)
        length = float(attrs.get("length", 1.0))
        pm25 = float(attrs.get("PM25_expo", 0.0))
        return pm25 * length

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
            
    except Exception as e:
        # 將原始錯誤訊息直接回傳，利於前端顯示與定位（例如 NetworkXNoPath 或 KeyError）
        raise HTTPException(status_code=502, detail=f"routing failed: {type(e).__name__}: {e}")

    # 幾何與指標
    geom_short = path_geometry(G, path_shortest)
    geom_low = path_geometry(G, path_lowest)

    exp_s, dist_s_km = path_cost_and_length(G, path_shortest)
    exp_l, dist_l_km = path_cost_and_length(G, path_lowest)

    extra_m = max(0.0, (dist_l_km - dist_s_km) * 1000.0)
    improvement = ((exp_s - exp_l) / exp_s * 100.0) if exp_s > 0 else 0.0
    
    # 計算暴露量減少值（μg·m⁻³·min）
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
            "improvement_rate": round(improvement, 1)
        }
    }
    return resp


