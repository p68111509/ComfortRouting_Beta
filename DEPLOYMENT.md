# ComfortRouting Beta 部署指南

## Render 部署配置

### 文件結構
```
ComfortRouting_Beta/
├── api/
│   ├── main.py              # FastAPI 後端服務
│   └── requirements.txt     # Python 依賴
├── data/
│   └── OSM_腳踏車路徑_台北_withpm25_最大連通版_DiGraph_260108.pkl  # 路網數據
├── vendor/
│   └── leaflet/            # Leaflet 地圖庫
├── logo/                   # 系統 Logo
├── index.html              # 前端頁面
├── app.js                  # 前端 JavaScript
├── styles.css              # 前端樣式
├── render.yaml             # Render 部署配置
├── Procfile                # Heroku 兼容配置
└── requirements.txt        # Python 依賴
```

### 部署步驟

1. **GitHub 設置**
   - 將代碼推送到 GitHub 倉庫
   - 確保所有文件都在根目錄

2. **Render 部署**
   - 連接到 GitHub 倉庫
   - 使用 `render.yaml` 配置自動部署
   - 設置環境變量：
     - `RENDER=true`
     - `GRAPH_PATH=data/OSM_腳踏車路徑_台北_withpm25_最大連通版_DiGraph_260108.pkl`
     - `GOOGLE_API_KEY=你的Google API密鑰`

3. **靜態文件服務**
   - FastAPI 會自動服務 `/static/` 路徑下的所有靜態文件
   - 前端資源路徑已配置為 `/static/` 開頭

### 路徑配置

#### 前端資源路徑
- CSS: `/static/styles.css`
- JavaScript: `/static/app.js`
- Leaflet: `/static/vendor/leaflet/leaflet.css`, `/static/vendor/leaflet/leaflet.js`
- Logo: `/static/logo/系統logo_橫版.png`

#### API 端點
- 根路徑 `/`: 返回前端頁面
- 地理編碼 `/api/geocode`: 地址轉座標
- 反向地理編碼 `/api/reverse`: 座標轉地址
- 路徑計算 `/api/routes`: 計算最短路徑和低暴露路徑
- 健康檢查 `/health`: 服務健康狀態

### 環境變量

| 變量名 | 描述 | 默認值 |
|--------|------|--------|
| `RENDER` | 部署環境標識 | `true` |
| `GRAPH_PATH` | 路網數據文件路徑 | `data/OSM_腳踏車路徑_台北_withpm25_最大連通版_DiGraph_260108.pkl` |
| `GOOGLE_API_KEY` | Google Geocoding API 密鑰 | 需要設置 |

### 故障排除

1. **靜態文件無法載入**
   - 檢查文件路徑是否以 `/static/` 開頭
   - 確認文件存在於正確的目錄

2. **API 調用失敗**
   - 檢查 `GOOGLE_API_KEY` 是否正確設置
   - 確認路網數據文件存在

3. **地圖無法顯示**
   - 檢查 Leaflet 文件路徑
   - 確認靜態文件服務正常

### 本地測試

```bash
# 安裝依賴
pip install -r requirements.txt

# 啟動服務
python api/main.py

# 訪問 http://localhost:8000
```



