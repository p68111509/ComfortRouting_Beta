# 使用官方 Python 3.9 映像
FROM python:3.9-slim

# 安裝系統依賴（rasterio 需要）
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    libproj-dev \
    libgeos-dev \
    && rm -rf /var/lib/apt/lists/*

# 設定工作目錄
WORKDIR /app

# 複製 requirements.txt 並安裝依賴
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製所有檔案
COPY . .

# 設定環境變數
ENV GRAPH_PATH=data/雙北基隆路網_濃度與暴露_最大連通版.pkl
ENV GOOGLE_API_KEY=AIzaSyDnbTu8PgUkue5A9uO5aJa3lHZuNUwj6z0

# 暴露端口
EXPOSE 8000

# 啟動命令
CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
