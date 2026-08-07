# 使用輕量級的 Python 3.10 映像檔作為基礎
FROM python:3.10-slim

# 設定工作目錄
WORKDIR /app

# 設置環境變數，防止 Python 寫入 .pyc 檔案，並確保終端機輸出不會被緩衝
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# Prefer CPU inference in containers unless a GPU image is used
ENV YOLO_ENABLED=1
ENV YOLO_WEIGHTS=weights/duct_yolo.pt

# 安裝系統依賴 (psycopg2, scipy, OpenCV, git for Ultralytics CLIP / YOLO-World)
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 複製 requirements.txt 並安裝 Python 依賴
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
      torch==2.2.2 torchvision==0.17.2 \
      --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt && \
    # YOLO-World needs Ultralytics CLIP (requires git above)
    pip install --no-cache-dir \
      "git+https://github.com/ultralytics/CLIP.git" \
      ftfy regex

# 將後端原始碼複製到容器內
COPY . .

RUN mkdir -p weights data/uploads data/yolo_dataset/images/train data/yolo_dataset/labels/train

# 暴露 FastAPI 的 8000 端口
EXPOSE 8000

# 啟動 FastAPI 伺服器 (開發模式：支援檔案修改後自動重載)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
