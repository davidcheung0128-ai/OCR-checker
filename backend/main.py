# backend/main.py
import os
import httpx
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, JSON, DateTime, func
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from datetime import datetime

from excel_exporter import generate_pressure_drop_excel
from physics_engine import calculate_duct_section
from csv_exporter import generate_calculate_csv, calculate_filename, parse_pdf_filename

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./local_fallback.db")
VLLM_API_URL = os.getenv("VLLM_API_URL", "https://ai.fse.com.hk/vllm/v1")
MINERU_API_URL = os.getenv("MINERU_API_URL", "https://ai.fse.com.hk/mineru/file_parse")
VLLM_MODEL = os.getenv("VLLM_MODEL", "Qwen/Qwen3.6-27B-FP8")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class UserFeedback(Base):
    __tablename__ = "user_feedback"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    original_ai_label = Column(String)
    corrected_label = Column(String)
    bounding_box = Column(JSON)
    section_type = Column(String, nullable=True)
    fitting_code = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


def _ensure_feedback_columns():
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    if "user_feedback" not in inspector.get_table_names():
        return
    columns = {c["name"] for c in inspector.get_columns("user_feedback")}
    with engine.begin() as conn:
        if "section_type" not in columns:
            conn.execute(text("ALTER TABLE user_feedback ADD COLUMN section_type VARCHAR"))
        if "fitting_code" not in columns:
            conn.execute(text("ALTER TABLE user_feedback ADD COLUMN fitting_code VARCHAR"))


_ensure_feedback_columns()


class BboxModel(BaseModel):
    x: float
    y: float
    w: float
    h: float


class FeedbackRequest(BaseModel):
    filename: str
    original: str = Field(description="AI-detected label before correction")
    corrected: str = Field(description="Engineer-confirmed label")
    bbox: BboxModel
    section_type: Optional[str] = "Suction"
    fitting_code: Optional[str] = ""
    section_id: Optional[int] = None


class DuctSectionInput(BaseModel):
    id: Optional[int] = None
    type: str = "Suction"
    fitting_name: str
    a_mm: float
    b_mm: float
    length_m: float = 0.0
    fitting_code: Optional[str] = ""


class CsvExportRequest(BaseModel):
    flow_rate: float = 0.25
    floor: str = "B1F"
    ref_no: str = "EAF-B1-02"
    location: str = "B1/F Master Water Meter Room"
    project_name: str = "Dedicated Rehousing at Ma Tau Kok"
    specified_esp: float = 400.0
    offered_esp: float = 450.0
    filled: bool = True
    sections: List[DuctSectionInput]


class ExcelExportRequest(BaseModel):
    flow_rate: float = 0.25
    project_name: str = "Dedicated Rehousing at Ma Tau Kok"
    location: str = "B1/F Master Water Meter Room"
    ref_no: str = "EAF-B1-02"
    sections: List[DuctSectionInput]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app = FastAPI(title="FSEE HVAC AI Backend", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def bbox_iou(a: dict, b: dict) -> float:
    ax2, ay2 = a["x"] + a["w"], a["y"] + a["h"]
    bx2, by2 = b["x"] + b["w"], b["y"] + b["h"]
    ix1, iy1 = max(a["x"], b["x"]), max(a["y"], b["y"])
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    inter = (ix2 - ix1) * (iy2 - iy1)
    area_a = a["w"] * a["h"]
    area_b = b["w"] * b["h"]
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


def apply_learned_labels(sections: list, db: Session) -> list:
    """Apply saved manual labels when bbox overlaps with training data."""
    feedback_rows = db.query(UserFeedback).order_by(UserFeedback.created_at.desc()).all()
    if not feedback_rows:
        return sections

    learned = []
    for row in feedback_rows:
        if not row.bounding_box:
            continue
        if row.corrected_label == "[DELETED]":
            continue
        learned.append({
            "corrected_label": row.corrected_label,
            "fitting_code": row.fitting_code or "",
            "section_type": row.section_type or "Suction",
            "bbox": row.bounding_box,
        })

    updated = []
    for sec in sections:
        sec_copy = dict(sec)
        sec_bbox = sec_copy.get("bbox")
        if not sec_bbox:
            updated.append(sec_copy)
            continue

        best_iou = 0.0
        best_match = None
        for item in learned:
            iou = bbox_iou(sec_bbox, item["bbox"])
            if iou > best_iou:
                best_iou = iou
                best_match = item

        if best_match and best_iou >= 0.25:
            sec_copy["fitting_name"] = best_match["corrected_label"]
            sec_copy["fitting_code"] = best_match["fitting_code"]
            sec_copy["type"] = best_match["section_type"]
            sec_copy["bbox"] = best_match["bbox"]
            sec_copy["learned_from_training"] = True

        updated.append(sec_copy)

    return updated


@app.get("/")
def health_check():
    return {"status": "ok", "message": "FSEE HVAC AI Backend is running."}


@app.get("/api/training/labels")
def get_training_labels(db: Session = Depends(get_db)):
    rows = (
        db.query(
            UserFeedback.corrected_label,
            UserFeedback.section_type,
            UserFeedback.fitting_code,
            UserFeedback.bounding_box,
            func.count(UserFeedback.id).label("count"),
        )
        .group_by(
            UserFeedback.corrected_label,
            UserFeedback.section_type,
            UserFeedback.fitting_code,
            UserFeedback.bounding_box,
        )
        .order_by(func.count(UserFeedback.id).desc())
        .all()
    )

    return [
        {
            "corrected_label": r.corrected_label,
            "section_type": r.section_type or "Suction",
            "fitting_code": r.fitting_code or "",
            "bbox": r.bounding_box,
            "count": r.count,
        }
        for r in rows
    ]


@app.post("/api/feedback")
def submit_correction(payload: FeedbackRequest, db: Session = Depends(get_db)):
    feedback = UserFeedback(
        filename=payload.filename,
        original_ai_label=payload.original,
        corrected_label=payload.corrected,
        bounding_box=payload.bbox.model_dump(),
        section_type=payload.section_type,
        fitting_code=payload.fitting_code,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return {
        "status": "success",
        "message": "Manual label saved for model training.",
        "id": feedback.id,
    }


@app.post("/api/upload")
async def upload_and_analyze_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()

    try:
        async with httpx.AsyncClient() as client:
            files = {"files": (file.filename, file_bytes, "application/pdf")}
            response = await client.post(MINERU_API_URL, files=files, timeout=120.0)
            response.raise_for_status()
            mineru_data = response.json()

            md_content = ""
            if "results" in mineru_data:
                keys = list(mineru_data["results"].keys())
                if keys:
                    md_content = mineru_data["results"][keys[0]].get("md_content", "")

            if not md_content:
                md_content = "MinerU parsed the file but returned no md_content."
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MinerU parsing failed: {str(e)}")

    mock_sections = [
        {"id": 1, "type": "Suction", "fitting_name": "Air Grille", "a_mm": 600, "b_mm": 600, "length_m": 0.0, "fitting_code": "GRILLE", "bbox": {"x": 8, "y": 12, "w": 12, "h": 10}},
        {"id": 2, "type": "Suction", "fitting_name": "Damper", "a_mm": 600, "b_mm": 600, "length_m": 0.18, "fitting_code": "CR9-4", "bbox": {"x": 24, "y": 14, "w": 10, "h": 8}},
        {"id": 3, "type": "Suction", "fitting_name": "Run", "a_mm": 500, "b_mm": 250, "length_m": 1.4, "fitting_code": "", "bbox": {"x": 38, "y": 22, "w": 28, "h": 6}},
        {"id": 4, "type": "Suction", "fitting_name": "Silencer", "a_mm": 500, "b_mm": 250, "length_m": 0.0, "fitting_code": "SILENCER_DEFAULT", "bbox": {"x": 68, "y": 20, "w": 10, "h": 10}},
        {"id": 5, "type": "Discharge", "fitting_name": "Transition", "a_mm": 500, "b_mm": 400, "length_m": 0.89, "fitting_code": "SR4-1", "bbox": {"x": 52, "y": 38, "w": 14, "h": 12}},
    ]

    sections_with_learning = apply_learned_labels(mock_sections, db)
    learned_count = sum(1 for s in sections_with_learning if s.get("learned_from_training"))

    return {
        "status": "success",
        "filename": file.filename,
        "mineru_md_content": md_content,
        "sections": sections_with_learning,
        "learned_labels_applied": learned_count,
    }


@app.post("/api/export/csv")
def export_csv(payload: CsvExportRequest):
    section_dicts = [s.model_dump() for s in payload.sections]
    output = generate_calculate_csv(
        sections=section_dicts,
        flow_rate=payload.flow_rate,
        floor=payload.floor,
        ref_no=payload.ref_no,
        location=payload.location,
        project_name=payload.project_name,
        specified_esp=payload.specified_esp,
        offered_esp=payload.offered_esp,
        filled=payload.filled,
    )
    filename = calculate_filename(payload.floor, payload.ref_no, filled=payload.filled)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/export/excel")
def export_excel(payload: ExcelExportRequest):
    computed_sections = []
    for sec in payload.sections:
        physics = calculate_duct_section(
            sec.a_mm,
            sec.b_mm,
            sec.length_m,
            payload.flow_rate,
            sec.fitting_code or None,
        )
        computed_sections.append({
            "type": sec.type,
            "fitting_name": sec.fitting_name,
            "a_mm": sec.a_mm,
            "b_mm": sec.b_mm,
            "length_m": sec.length_m,
            "fitting_code": sec.fitting_code,
            "flow_rate": payload.flow_rate,
            **physics,
        })

    output = generate_pressure_drop_excel(
        project_name=payload.project_name,
        location=payload.location,
        ref_no=payload.ref_no,
        flow_rate=payload.flow_rate,
        sections_data=computed_sections,
    )

    filename = f"ESP_Calculation_{payload.ref_no.replace('/', '-')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
