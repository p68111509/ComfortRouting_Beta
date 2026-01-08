#!/usr/bin/env python3
"""
快速檢查 .pkl 檔案結構的除錯腳本
"""
import pickle
import networkx as nx
from pathlib import Path

# 專案根目錄
BASE_DIR = Path(__file__).resolve().parent
# 使用實際存在的檔案
GRAPH_PATH = BASE_DIR / "data" / "OSM_腳踏車路徑_台北_withpm25_最大連通版_DiGraph_260108.pkl"

print(f"Loading: {GRAPH_PATH}")
print(f"File exists: {GRAPH_PATH.exists()}")

try:
    with open(GRAPH_PATH, "rb") as f:
        G = pickle.load(f)
    
    print(f"Graph type: {type(G)}")
    print(f"Nodes: {len(G.nodes)}")
    print(f"Edges: {len(G.edges)}")
    
    # 檢查前幾個節點的原始結構
    print("\n=== 節點結構檢查 ===")
    for i, (nid, nd) in enumerate(G.nodes(data=True)):
        print(f"Node {i}: id={nid}, type={type(nd)}")
        print(f"  Raw data: {nd}")
        if isinstance(nd, dict):
            print(f"  Keys: {list(nd.keys())}")
            if "attr_dict" in nd:
                print(f"  attr_dict type: {type(nd['attr_dict'])}")
                if isinstance(nd["attr_dict"], dict):
                    print(f"  attr_dict keys: {list(nd['attr_dict'].keys())}")
        print()
        if i >= 4:
            break
    
    # 檢查前幾個邊的結構
    print("\n=== 邊結構檢查 ===")
    for i, (u, v, ed) in enumerate(G.edges(data=True)):
        print(f"Edge {i}: {u}->{v}")
        print(f"  Raw data: {ed}")
        if isinstance(ed, dict):
            print(f"  Keys: {list(ed.keys())}")
            if "attr_dict" in ed:
                print(f"  attr_dict type: {type(ed['attr_dict'])}")
                if isinstance(ed["attr_dict"], dict):
                    print(f"  attr_dict keys: {list(ed['attr_dict'].keys())}")
        print()
        if i >= 4:
            break
            
except Exception as e:
    print(f"Error loading pickle: {e}")
    import traceback
    traceback.print_exc()