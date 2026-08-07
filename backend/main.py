# backend/main.py
import os
import httpx
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, JSON, DateTime, func
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from datetime import datetime

from excel_exporter import generate_pressure_drop_excel
from physics_engine import calculate_duct_section
from csv_exporter import generate_calculate_csv, calculate_filename, parse_pdf_filename
from training_seed import (
    seed_training_data,
    get_default_sections,
    SYMBOL_LEGEND,
    SEED_SOURCE_FILENAME,
)
from detector import (
    detect_duct_sections,
    get_detector_status,
    export_sections_for_file,
    dataset_stats,
)
from detector.raster import save_upload
from detector.classes import CLASS_META, fitting_name_to_class

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


def _seed_on_startup():
    db = SessionLocal()
    try:
        result = seed_training_data(db, UserFeedback, force=False)
        print(f"[training_seed] {result}")
    finally:
        db.close()


_seed_on_startup()


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


def _clean_bbox(bbox: dict) -> dict:
    """Return x/y/w/h only (percent coords) for UI / IoU."""
    return {
        "x": float(bbox.get("x", 0)),
        "y": float(bbox.get("y", 0)),
        "w": float(bbox.get("w", 4)),
        "h": float(bbox.get("h", 3)),
    }


def apply_learned_labels(sections: list, db: Session) -> list:
    """
    Prefer newest saved training boxes (by section_id), then IoU overlap.
    Manual save-all / feedback rows with section_id win over seed defaults.
    """
    feedback_rows = (
        db.query(UserFeedback)
        .filter(UserFeedback.filename != "__symbol_legend__")
        .filter(UserFeedback.corrected_label != "[DELETED]")
        .order_by(UserFeedback.created_at.desc())
        .all()
    )
    if not feedback_rows:
        return sections

    by_section_id = {}
    learned = []
    for row in feedback_rows:
        if not row.bounding_box or not isinstance(row.bounding_box, dict):
            continue
        if row.bounding_box.get("legend"):
            continue
        item = {
            "corrected_label": row.corrected_label,
            "fitting_code": row.fitting_code or "",
            "section_type": row.section_type or "Suction",
            "bbox": _clean_bbox(row.bounding_box),
            "manual_save": bool(row.bounding_box.get("manual_save")),
            "section_id": row.bounding_box.get("section_id"),
        }
        sid = item["section_id"]
        if sid is not None and sid not in by_section_id:
            by_section_id[int(sid)] = item
        learned.append(item)

    updated = []
    for sec in sections:
        sec_copy = dict(sec)
        sid = sec_copy.get("id")
        if sid is not None and int(sid) in by_section_id:
            match = by_section_id[int(sid)]
            sec_copy["fitting_name"] = match["corrected_label"]
            sec_copy["fitting_code"] = match["fitting_code"]
            sec_copy["type"] = match["section_type"]
            sec_copy["bbox"] = match["bbox"]
            sec_copy["learned_from_training"] = True
            if match["manual_save"]:
                sec_copy["manually_labeled"] = True
            updated.append(sec_copy)
            continue

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
            if best_match["manual_save"]:
                sec_copy["manually_labeled"] = True

        updated.append(sec_copy)

    return updated


@app.get("/")
def health_check(db: Session = Depends(get_db)):
    label_count = (
        db.query(UserFeedback)
        .filter(UserFeedback.filename != "__symbol_legend__")
        .count()
    )
    return {
        "status": "ok",
        "message": "FSE HVAC AI Backend is running.",
        "training_labels": label_count,
        "seed_source": SEED_SOURCE_FILENAME,
    }


@app.get("/api/training/status")
def training_status(db: Session = Depends(get_db)):
    components = (
        db.query(UserFeedback)
        .filter(UserFeedback.filename == SEED_SOURCE_FILENAME)
        .order_by(UserFeedback.id.asc())
        .all()
    )
    legend = (
        db.query(UserFeedback)
        .filter(UserFeedback.filename == "__symbol_legend__")
        .all()
    )
    return {
        "seed_source": SEED_SOURCE_FILENAME,
        "component_count": len(components),
        "legend_count": len(legend),
        "components": [
            {
                "id": i + 1,
                "label": r.corrected_label,
                "type": r.section_type,
                "fitting_code": r.fitting_code,
                "bbox": r.bounding_box,
            }
            for i, r in enumerate(components)
        ],
        "legend": [
            {
                "name": r.corrected_label,
                "looks_like": r.original_ai_label,
                "fitting_code": r.fitting_code,
                "type": r.section_type,
                "aliases": (r.bounding_box or {}).get("aliases", []),
            }
            for r in legend
        ],
    }


def sections_from_filename_feedback(db: Session, filename: str) -> list:
    """Rebuild sections from the newest manual_save rows for this exact PDF name."""
    rows = (
        db.query(UserFeedback)
        .filter(UserFeedback.filename == filename)
        .filter(UserFeedback.corrected_label != "[DELETED]")
        .order_by(UserFeedback.created_at.desc())
        .all()
    )
    by_id = {}
    for row in rows:
        bb = row.bounding_box if isinstance(row.bounding_box, dict) else {}
        if bb.get("legend"):
            continue
        if not bb.get("manual_save"):
            continue
        sid = bb.get("section_id")
        if sid is None:
            continue
        sid = int(sid)
        if sid in by_id:
            continue
        cls = fitting_name_to_class(row.corrected_label) or "run"
        meta = CLASS_META.get(cls, CLASS_META["run"])
        by_id[sid] = {
            "id": sid,
            "type": row.section_type or meta["type"],
            "fitting_name": row.corrected_label,
            "a_mm": meta["a_mm"],
            "b_mm": meta["b_mm"],
            "length_m": meta["length_m"],
            "fitting_code": row.fitting_code or meta["fitting_code"],
            "bbox": _clean_bbox(bb),
            "learned_from_training": True,
            "manually_labeled": True,
        }
    return [by_id[k] for k in sorted(by_id.keys())]


def looks_like_eaf_seed(filename: str) -> bool:
    name = (filename or "").upper()
    return "EAF-B1-02" in name or filename == SEED_SOURCE_FILENAME


@app.get("/api/detector/status")
def detector_status():
    status = get_detector_status()
    status["dataset"] = dataset_stats()
    return status


@app.post("/api/training/export-yolo")
def export_yolo_dataset(payload: dict = Body(...), db: Session = Depends(get_db)):
    """Write YOLO image/labels for a filename from current DB feedback or payload sections."""
    filename = (payload or {}).get("filename") or ""
    sections = (payload or {}).get("sections")
    if not sections:
        sections = sections_from_filename_feedback(db, filename)
    if not sections:
        # fall back to any feedback rows for this file with bboxes
        rows = (
            db.query(UserFeedback)
            .filter(UserFeedback.filename == filename)
            .filter(UserFeedback.corrected_label != "[DELETED]")
            .all()
        )
        sections = []
        for i, row in enumerate(rows, start=1):
            bb = row.bounding_box if isinstance(row.bounding_box, dict) else None
            if not bb or bb.get("legend"):
                continue
            sections.append(
                {
                    "id": bb.get("section_id") or i,
                    "fitting_name": row.corrected_label,
                    "bbox": _clean_bbox(bb),
                }
            )
    if not sections:
        raise HTTPException(status_code=400, detail="No labeled sections to export")
    result = export_sections_for_file(filename, sections)
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("message", "Export failed"))
    return result


@app.post("/api/training/reseed")
def reseed_training(db: Session = Depends(get_db)):
    result = seed_training_data(db, UserFeedback, force=True)
    return {"status": "success", **result}


@app.get("/api/training/legend")
def get_legend():
    return {"legend": SYMBOL_LEGEND, "source": SEED_SOURCE_FILENAME}


class TrainingSectionPayload(BaseModel):
    id: int
    type: str = "Suction"
    fitting_name: str
    fitting_code: Optional[str] = ""
    a_mm: Optional[float] = 500
    b_mm: Optional[float] = 250
    length_m: Optional[float] = 0.0
    bbox: BboxModel


class SaveAllTrainingRequest(BaseModel):
    filename: str
    sections: List[TrainingSectionPayload]


def _bbox_payload(bbox: BboxModel, section_id: int) -> dict:
    return {
        "x": float(bbox.x),
        "y": float(bbox.y),
        "w": float(bbox.w),
        "h": float(bbox.h),
        "section_id": section_id,
        "manual_save": True,
    }


@app.post("/api/training/save-all")
def save_all_training(payload: SaveAllTrainingRequest, db: Session = Depends(get_db)):
    """
    Persist drag/resized boxes + labels as the newest training set for this PDF,
    and export YOLO labels so you can fine-tune the detector.
    """
    if not payload.sections:
        raise HTTPException(status_code=400, detail="No sections to save")

    # Only mirror onto the EAF seed file when labeling that drawing family
    filenames = [payload.filename]
    if looks_like_eaf_seed(payload.filename):
        filenames = list(dict.fromkeys([payload.filename, SEED_SOURCE_FILENAME]))

    db.query(UserFeedback).filter(
        UserFeedback.filename.in_(filenames),
    ).delete(synchronize_session=False)

    saved = 0
    section_dicts = []
    for sec in payload.sections:
        bbox = _bbox_payload(sec.bbox, sec.id)
        section_dicts.append(
            {
                "id": sec.id,
                "type": sec.type,
                "fitting_name": sec.fitting_name,
                "fitting_code": sec.fitting_code or "",
                "bbox": bbox,
            }
        )
        for fname in filenames:
            db.add(
                UserFeedback(
                    filename=fname,
                    original_ai_label=sec.fitting_name,
                    corrected_label=sec.fitting_name,
                    bounding_box=bbox,
                    section_type=sec.type,
                    fitting_code=sec.fitting_code or "",
                )
            )
        saved += 1

    db.commit()

    yolo_export = export_sections_for_file(payload.filename, section_dicts)
    yolo_note = ""
    if yolo_export.get("ok"):
        yolo_note = (
            f" YOLO dataset updated ({yolo_export.get('boxes', 0)} boxes). "
            "Train with: python train_yolo.py"
        )
    elif yolo_export.get("reason") == "pdf_not_cached":
        yolo_note = " (Re-upload PDF once so YOLO export can cache the page image.)"

    return {
        "status": "success",
        "ok": True,
        "saved": saved,
        "filename": payload.filename,
        "yolo_export": yolo_export,
        "message": (
            f"Saved {saved} training box(es) for {payload.filename}.{yolo_note}"
        ),
    }


@app.post("/api/feedback")
def submit_correction(payload: FeedbackRequest, db: Session = Depends(get_db)):
    bbox = payload.bbox.model_dump()
    if payload.section_id is not None:
        bbox["section_id"] = payload.section_id
        bbox["manual_save"] = True
    feedback = UserFeedback(
        filename=payload.filename,
        original_ai_label=payload.original,
        corrected_label=payload.corrected,
        bounding_box=bbox,
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
    # Cache PDF so Save Training can export YOLO labels for this page
    try:
        save_upload(file.filename, file_bytes)
    except Exception as exc:
        print(f"⚠️ Failed to cache upload: {exc}")

    md_content = ""
    mineru_ok = False

    try:
        async with httpx.AsyncClient() as client:
            files = {"files": (file.filename, file_bytes, "application/pdf")}
            response = await client.post(MINERU_API_URL, files=files, timeout=120.0)
            response.raise_for_status()
            mineru_data = response.json()

            if "results" in mineru_data:
                keys = list(mineru_data["results"].keys())
                if keys:
                    md_content = mineru_data["results"][keys[0]].get("md_content", "")
            mineru_ok = True
            if not md_content:
                md_content = "MinerU parsed the file but returned no md_content."
    except Exception as e:
        md_content = f"MinerU unavailable ({e})."
        print(f"⚠️ MinerU failed: {e}")

    source = "empty"
    training_seed = None
    yolo_info = {"mode": "skipped", "detections": 0, "message": ""}

    # 1) YOLO detection on this drawing (generalizes across plans once fine-tuned)
    yolo_sections, yolo_info = detect_duct_sections(file_bytes)
    if yolo_sections:
        sections = yolo_sections
        source = f"yolo_{yolo_info.get('mode', 'detect')}"
    else:
        # 2) Reuse boxes saved specifically for this filename
        saved = sections_from_filename_feedback(db, file.filename)
        if saved:
            sections = saved
            source = "saved_filename"
        # 3) EAF seed only for that drawing family
        elif looks_like_eaf_seed(file.filename):
            sections = apply_learned_labels(get_default_sections(), db)
            source = "eaf_seed"
            training_seed = SEED_SOURCE_FILENAME
        else:
            # New / different plan with no model hits — start blank for manual labeling
            sections = []
            source = "manual_required"

    learned_count = sum(
        1
        for s in sections
        if s.get("learned_from_training") or s.get("yolo_detected")
    )

    return {
        "status": "success",
        "filename": file.filename,
        "mineru_ok": mineru_ok,
        "mineru_md_content": md_content,
        "sections": sections,
        "learned_labels_applied": learned_count,
        "training_seed": training_seed,
        "detection_source": source,
        "yolo": yolo_info,
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
