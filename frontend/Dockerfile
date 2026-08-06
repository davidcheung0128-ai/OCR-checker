FROM node:18-alpine

WORKDIR /app

# 複製 package 檔案以利用 Docker 快取機制
COPY package.json package-lock.json* ./

# 安裝依賴
RUN npm install

# 複製其餘原始碼
COPY . .

# 暴露 Vite 開發伺服器的 port
EXPOSE 3000

# 啟動 Vite
CMD ["npm", "run", "dev"]