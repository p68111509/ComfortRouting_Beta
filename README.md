# 舒適路徑系統 (Comfort Routing System)

一個基於空氣品質和環境因子的智慧路徑規劃系統，幫助用戶選擇最舒適的出行路線。

## 🌟 功能特色

- **雙路徑規劃**：提供最短路徑和低暴露路徑兩種選擇
- **多交通方式**：支援機車、單車、步行三種交通方式
- **環境疊圖**：可疊加 PM₂.₅、NO₂、氣溫等環境數據
- **即時計算**：根據交通方式自動計算通勤時間
- **多語系支援**：中文/英文介面切換

## 🚀 快速開始

### 線上部署 (Render)
1. 將代碼推送到 GitHub 倉庫
2. 在 Render 中連接倉庫並使用 `render.yaml` 配置
3. 設置環境變量：`GOOGLE_API_KEY`
4. 自動部署完成後訪問 Render 提供的 URL

### 本地開發
1. 安裝 Python 依賴：`pip install -r requirements.txt`
2. 啟動後端服務：`python api/main.py`
3. 訪問 `http://localhost:8000`

### 離線使用
直接開啟 `index.html` 即可在瀏覽器中使用（無後端功能）。

## 📁 檔案結構

```
ComfortRouting/
├── index.html          # 主頁面
├── styles.css          # 樣式檔案
├── app.js             # 前端邏輯
├── data/              # 資料檔案
│   ├── *.pkl         # 路網圖資料
│   └── *.png         # 環境數據圖片
├── vendor/            # 第三方函式庫
│   └── leaflet/      # 地圖函式庫
├── api/               # 後端 API
│   ├── main.py       # FastAPI 應用
│   └── requirements.txt
└── logo/              # 標誌圖片
```

## 🛠️ 技術架構

- **前端**：HTML5 + CSS3 + JavaScript (ES6+)
- **地圖**：Leaflet.js
- **後端**：Python + FastAPI + NetworkX
- **資料**：NetworkX 圖形資料 + PNG 環境數據

## 🌍 發佈方式

### GitHub Pages
1. 上傳到 GitHub repository
2. 啟用 GitHub Pages
3. 設定 Source 為 main branch

### Netlify
1. 註冊 Netlify 帳號
2. 拖拽專案資料夾到 Netlify
3. 自動部署完成

### Vercel
1. 連接 GitHub repository
2. 自動部署

## 📝 使用說明

1. **設定起終點**：輸入地址或點擊地圖設定
2. **選擇交通方式**：機車、單車或步行
3. **規劃路徑**：點擊「規劃路徑」按鈕
4. **查看結果**：比較兩種路徑的距離、時間和暴露量
5. **環境疊圖**：選擇環境數據疊加在地圖上

## 🔧 開發說明

### 後端設定
```bash
cd api
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### 資料更新
- 路網資料：替換 `data/*.pkl` 檔案
- 環境數據：替換 `data/*.png` 檔案

## 📄 授權

本專案僅供展示與研究用途，禁止未經授權的商業使用。

## 👥 開發團隊

- 許家瑋、林祐如
- 國立成功大學 測量及空間資訊學系
- 指導老師：吳治達 教授

## 📧 聯絡資訊

- Email: p68111509@gs.ncku.edu.tw
- GitHub: [Health-routing_Taichung](https://github.com/p68111509/Health-routing_Taichung)

---

© 2025 舒適路徑系統 | 國立成功大學
