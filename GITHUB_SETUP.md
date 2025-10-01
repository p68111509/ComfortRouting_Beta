# GitHub 上傳指南

## 📁 上傳到 GitHub

### 步驟 1：創建 GitHub Repository
1. 前往 [github.com](https://github.com)
2. 點擊 "New repository"
3. 輸入 repository 名稱：`comfort-routing-system`
4. 選擇 "Public"（免費方案需要公開）
5. 不要勾選 "Add a README file"
6. 點擊 "Create repository"

### 步驟 2：上傳檔案
1. 下載並安裝 [GitHub Desktop](https://desktop.github.com/) 或使用 Git 命令列
2. 在本地創建 Git repository：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/你的用戶名/comfort-routing-system.git
   git push -u origin main
   ```

### 步驟 3：使用 GitHub Desktop（更簡單）
1. 安裝 GitHub Desktop
2. 點擊 "Clone a repository from the Internet"
3. 選擇 "Create a new repository on GitHub"
4. 選擇本地資料夾：`C:\ComfortRouting`
5. 輸入 repository 名稱
6. 點擊 "Create repository"
7. 點擊 "Publish repository"

## 🚀 部署到 Render

### 步驟 1：準備 Render 帳號
1. 前往 [render.com](https://render.com)
2. 使用 GitHub 帳號登入
3. 授權 Render 存取你的 GitHub

### 步驟 2：部署專案
1. 點擊 "New +" → "Web Service"
2. 選擇 "Build and deploy from a Git repository"
3. 選擇你的 GitHub repository
4. 設定：
   - **Name**: `comfort-routing-system`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd api && python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
5. 點擊 "Create Web Service"

### 步驟 3：等待部署
- 部署時間約 5-10 分鐘
- 完成後會獲得網址：`https://comfort-routing-system.onrender.com`

## 🔧 其他免費選項

### Vercel（前端）+ Railway（後端）
1. **Vercel 部署前端**：
   - 前往 [vercel.com](https://vercel.com)
   - 連接 GitHub repository
   - 自動部署前端

2. **Railway 部署後端**：
   - 使用 30 天免費試用
   - 試用期後可考慮其他方案

### Heroku（備選）
1. 前往 [heroku.com](https://heroku.com)
2. 創建新 app
3. 連接 GitHub repository
4. 設定環境變數
5. 部署

## 📝 注意事項

1. **檔案大小**：確保 PNG 圖片不會太大
2. **環境變數**：如有需要，在 Render 中設定
3. **休眠機制**：Render 免費方案會在 15 分鐘無活動後休眠
4. **重新啟動**：休眠後首次訪問需要等待 30 秒重新啟動
