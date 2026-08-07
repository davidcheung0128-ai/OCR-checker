"""YOLO duct-fitting detector: custom weights preferred, YOLO-World fallback."""

from __future__ import annotations

import os
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from detector.classes import (
    CLASS_NAMES,
    WORLD_PROMPTS,
    class_to_section,
    fitting_name_to_class,
)
from detector.raster import rasterize_pdf_bytes

WEIGHTS_PATH = Path(os.getenv("YOLO_WEIGHTS", "weights/duct_yolo.pt"))
WORLD_WEIGHTS = os.getenv("YOLO_WORLD_WEIGHTS", "yolov8s-worldv2.pt")
CONF_THRESHOLD = float(os.getenv("YOLO_CONF", "0.20"))
IOU_THRESHOLD = float(os.getenv("YOLO_IOU", "0.45"))
ENABLED = os.getenv("YOLO_ENABLED", "1").strip() not in ("0", "false", "False", "no")

_model_lock = threading.Lock()
_model = None
_model_mode: Optional[str] = None  # "custom" | "world" | "unavailable"
_model_error: Optional[str] = None


def _try_import_ultralytics():
    try:
        from ultralytics import YOLO  # noqa: F401

        return True, None
    except Exception as exc:  # pragma: no cover
        return False, str(exc)


def get_detector_status() -> Dict[str, Any]:
    ok, err = _try_import_ultralytics()
    custom = WEIGHTS_PATH.is_file()
    return {
        "enabled": ENABLED,
        "ultralytics_installed": ok,
        "ultralytics_error": err,
        "custom_weights": str(WEIGHTS_PATH.resolve()) if custom else None,
        "custom_weights_present": custom,
        "world_weights": WORLD_WEIGHTS,
        "mode": _model_mode or ("custom" if custom else ("world" if ok else "unavailable")),
        "loaded": _model is not None,
        "classes": CLASS_NAMES,
        "conf": CONF_THRESHOLD,
        "message": _status_message(ok, custom, err),
    }


def _status_message(ok: bool, custom: bool, err: Optional[str]) -> str:
    if not ENABLED:
        return "YOLO detector disabled (YOLO_ENABLED=0)."
    if not ok:
        return f"ultralytics not installed: {err}. Run pip install -r requirements.txt"
    if custom:
        return f"Custom duct YOLO ready: {WEIGHTS_PATH.name}"
    return (
        "No custom weights yet — will try YOLO-World open-vocab on upload. "
        "Label plans → Save Training → python train_yolo.py → copy best.pt to weights/duct_yolo.pt"
    )


def _load_model():
    global _model, _model_mode, _model_error
    if not ENABLED:
        _model_mode = "unavailable"
        _model_error = "disabled"
        return None

    with _model_lock:
        if _model is not None:
            return _model

        ok, err = _try_import_ultralytics()
        if not ok:
            _model_mode = "unavailable"
            _model_error = err
            return None

        from ultralytics import YOLO

        try:
            if WEIGHTS_PATH.is_file():
                _model = YOLO(str(WEIGHTS_PATH))
                _model_mode = "custom"
                _model_error = None
                print(f"[yolo] loaded custom weights {WEIGHTS_PATH}")
                return _model

            # Open-vocabulary bootstrap (works better after fine-tune on drawings)
            _model = YOLO(WORLD_WEIGHTS)
            if hasattr(_model, "set_classes"):
                _model.set_classes(WORLD_PROMPTS)
            _model_mode = "world"
            _model_error = None
            print(f"[yolo] loaded YOLO-World {WORLD_WEIGHTS}")
            return _model
        except Exception as exc:
            _model = None
            _model_mode = "unavailable"
            _model_error = str(exc)
            print(f"[yolo] failed to load model: {exc}")
            return None


def _xyxy_to_percent(x1, y1, x2, y2, width: int, height: int) -> dict:
    w = max(0.0, x2 - x1)
    h = max(0.0, y2 - y1)
    return {
        "x": (x1 / width) * 100.0,
        "y": (y1 / height) * 100.0,
        "w": (w / width) * 100.0,
        "h": (h / height) * 100.0,
    }


def _class_name_from_result(model, cls_id: int) -> Optional[str]:
    names = getattr(model, "names", None) or {}
    raw = names.get(int(cls_id), str(cls_id))
    if isinstance(raw, bytes):
        raw = raw.decode()
    raw_s = str(raw)

    # Custom weights: names are CLASS_NAMES
    if raw_s in CLASS_NAMES:
        return raw_s

    # YOLO-World: names are prompts — map by index into WORLD_PROMPTS / CLASS_NAMES
    if 0 <= int(cls_id) < len(CLASS_NAMES):
        return CLASS_NAMES[int(cls_id)]

    mapped = fitting_name_to_class(raw_s)
    return mapped


def _sort_detections(dets: List[dict]) -> List[dict]:
    """
    Order along a typical HVAC run: left→right for horizontal segments,
    then bottom→top for vertical risers (L-shaped paths).
    Uses reading-order: primary by y-bands, then x; refined by center distance chain.
    """
    if not dets:
        return dets

    # Greedy path from left-most / bottom-most
    remaining = dets[:]
    # start = min x+y (bottom-left bias for L paths that start left)
    start = min(remaining, key=lambda d: (d["bbox"]["x"] + d["bbox"]["y"] * 0.15))
    ordered = [start]
    remaining.remove(start)

    def center(d):
        b = d["bbox"]
        return b["x"] + b["w"] / 2, b["y"] + b["h"] / 2

    while remaining:
        lx, ly = center(ordered[-1])
        nxt = min(
            remaining,
            key=lambda d: (center(d)[0] - lx) ** 2 + (center(d)[1] - ly) ** 2,
        )
        ordered.append(nxt)
        remaining.remove(nxt)
    return ordered


def detect_duct_sections(
    pdf_bytes: bytes,
    conf: float = CONF_THRESHOLD,
) -> Tuple[List[dict], Dict[str, Any]]:
    """
    Run YOLO on the first PDF page and return section dicts for the UI.
    """
    info: Dict[str, Any] = {
        "mode": "none",
        "detections": 0,
        "message": "",
    }

    model = _load_model()
    if model is None:
        info["mode"] = "unavailable"
        info["message"] = _model_error or "YOLO model not available"
        return [], info

    try:
        image, width, height = rasterize_pdf_bytes(pdf_bytes)
    except Exception as exc:
        info["mode"] = _model_mode or "error"
        info["message"] = f"PDF rasterize failed: {exc}"
        return [], info

    try:
        results = model.predict(
            source=image,
            conf=conf,
            iou=IOU_THRESHOLD,
            verbose=False,
        )
    except Exception as exc:
        info["mode"] = _model_mode or "error"
        info["message"] = f"YOLO predict failed: {exc}"
        return [], info

    raw: List[dict] = []
    for result in results:
        boxes = getattr(result, "boxes", None)
        if boxes is None:
            continue
        xyxy = boxes.xyxy.cpu().numpy() if hasattr(boxes.xyxy, "cpu") else np.array(boxes.xyxy)
        confs = boxes.conf.cpu().numpy() if hasattr(boxes.conf, "cpu") else np.array(boxes.conf)
        clss = boxes.cls.cpu().numpy() if hasattr(boxes.cls, "cpu") else np.array(boxes.cls)
        for i in range(len(xyxy)):
            cls_name = _class_name_from_result(model, int(clss[i]))
            if not cls_name:
                continue
            x1, y1, x2, y2 = map(float, xyxy[i])
            bbox = _xyxy_to_percent(x1, y1, x2, y2, width, height)
            # ignore tiny noise
            if bbox["w"] < 0.4 or bbox["h"] < 0.4:
                continue
            raw.append(
                {
                    "class_name": cls_name,
                    "confidence": float(confs[i]),
                    "bbox": bbox,
                }
            )

    ordered = _sort_detections(raw)
    sections = [
        class_to_section(d["class_name"], d["bbox"], idx + 1, d["confidence"])
        for idx, d in enumerate(ordered)
    ]

    info["mode"] = _model_mode or "unknown"
    info["detections"] = len(sections)
    if sections:
        info["message"] = (
            f"YOLO ({info['mode']}) placed {len(sections)} fitting box(es) on the drawing."
        )
    else:
        info["message"] = (
            f"YOLO ({info['mode']}) found no fittings. "
            "Draw/adjust boxes manually, Save Training, then retrain."
        )
    return sections, info
