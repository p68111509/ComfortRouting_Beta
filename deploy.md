# 全端部署指南

## 🚀 Railway 部署（推薦）

### 步驟 1：準備 Railway 帳號
1. 前往 [railway.app](https://railway.app)
2. 使用 GitHub 帳號登入
3. 連接 GitHub repository

### 步驟 2：部署專案
1. 點擊 "New Project"
2. 選擇 "Deploy from GitHub repo"
3. 選擇你的 repository
4. Railway 會自動偵測到 Python 專案並開始部署

### 步驟 3：設定環境變數
在 Railway dashboard 中設定：
- `PORT`: 自動設定
- 其他環境變數（如需要）

### 步驟 4：等待部署完成
- 部署時間約 5-10 分鐘
- 完成後會獲得一個 `.railway.app` 網址

## 🌐 Render 部署（備選）

### 步驟 1：準備 Render 帳號
1. 前往 [render.com](https://render.com)
2. 使用 GitHub 帳號登入

### 步驟 2：創建 Web Service
1. 點擊 "New +" → "Web Service"
2. 連接 GitHub repository
3. 設定：
   - **Build Command**: `pip install -r api/requirements.txt`
   - **Start Command**: `cd api && python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3

### 步驟 3：部署
1. 點擊 "Create Web Service"
2. 等待部署完成

## 🔧 本地測試

在部署前，先在本地測試：

```bash
# 啟動後端
cd api
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# 在瀏覽器開啟
# http://localhost:8000
```

## 📝 注意事項

1. **檔案大小限制**：PNG 圖片可能很大，考慮壓縮
2. **環境變數**：確保所有必要的環境變數都已設定
3. **資料庫**：如果使用資料庫，需要額外設定
4. **域名**：可以設定自訂域名

## 🎯 推薦流程

1. **先在本地測試**：確保所有功能正常
2. **使用 Railway 部署**：最簡單且穩定
3. **設定自訂域名**：讓網址更專業
4. **監控和維護**：定期檢查服務狀態
