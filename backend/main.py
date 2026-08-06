# backend/main.py
import os
import httpx
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, JSON, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from datetime import datetime

# --- 環境變數配置 (與 docker-compose 呼應) ---
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./local_fallback.db")
VLLM_API_URL = os.getenv("VLLM_API_URL", "https://ai.fse.com.hk/vllm/v1")
MINERU_API_URL = os.getenv("MINERU_API_URL", "https://ai.fse.com.hk/mineru/file_parse")
VLLM_MODEL = os.getenv("VLLM_MODEL", "Qwen/Qwen3.6-27B-FP8")

# --- 資料庫設定 (PostgreSQL via SQLAlchemy) ---
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 定義人工修正與學習的資料表
class UserFeedback(Base):
    __tablename__ = "user_feedback"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    original_ai_label = Column(String)      # AI 原本辨識的結果 (例如: 彎頭)
    corrected_label = Column(String)        # 工程師修正的結果 (例如: 三通)
    bounding_box = Column(JSON)             # 標註框座標，例如 {"x": 10, "y": 20, "w": 100, "h": 50}
    created_at = Column(DateTime, default=datetime.utcnow)

# 自動建立資料表
Base.metadata.create_all(bind=engine)

# 獲取資料庫 Session 的依賴函數
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- FastAPI 應用程式初始化 ---
app = FastAPI(title="FSEE HVAC AI Backend", version="1.0.0")

# 設定 CORS，允許前端 (localhost:3000) 存取
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 未來上線時可限縮為指定網域
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API 路由 ---

@app.get("/")
def health_check():
    return {"status": "ok", "message": "FSEE HVAC AI Backend is running with PostgreSQL."}

@app.post("/api/upload")
async def upload_and_analyze_pdf(file: UploadFile = File(...)):
    """
    1. 接收前端上傳的 PDF 圖紙 (或框選的局部 PDF)
    2. 呼叫企業內部 MinerU 進行解析
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="目前僅支援 PDF 檔案格式")
    
    file_bytes = await file.read()
    
    # 呼叫 MinerU API (無縫轉換您的 JS 邏輯)
    try:
        async with httpx.AsyncClient() as client:
            # 建立上傳檔案的 payload
            files = {'files': (file.filename, file_bytes, 'application/pdf')}
            response = await client.post(MINERU_API_URL, files=files, timeout=120.0)
            response.raise_for_status()
            mineru_data = response.json()
            
            md_content = ""
            # 動態獲取 Key，避免因檔名不同而報錯 (破坑關鍵)
            if "results" in mineru_data:
                keys = list(mineru_data["results"].keys())
                if keys:
                    md_content = mineru_data["results"][keys[0]].get("md_content", "")
            
            if not md_content:
                # 這裡保留備援機制空間 (未來可加入 pdfplumber/PyMuPDF 邏輯)
                md_content = "MinerU 解析成功，但未回傳 md_content，將啟用備援機制..."
                print(f"⚠️ {md_content}")
            else:
                print("✅ MinerU 視覺解析成功！")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MinerU 伺服器解析失敗: {str(e)}")

    # [TODO]: 下一步會在這裡加入將 md_content 傳送給 VLLM (Qwen) 進行資料結構化的邏輯
    
    return {
        "status": "success",
        "filename": file.filename,
        "mineru_md_content": md_content
    }

@app.post("/api/feedback")
def submit_correction(filename: str, original: str, corrected: str, bbox: dict, db: Session = Depends(get_db)):
    """
    接收使用者的「人工修正」，寫入 PostgreSQL，作為未來訓練專屬 YOLO 的 Ground Truth 數據
    """
    feedback = UserFeedback(
        filename=filename,
        original_ai_label=original,
        corrected_label=corrected,
        bounding_box=bbox
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return {"status": "success", "message": "修正已成功記錄至資料庫，感謝您的回饋！", "id": feedback.id}