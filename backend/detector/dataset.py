"""Build / update YOLO datasets from Save Training feedback."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from detector.classes import CLASS_NAMES, fitting_name_to_class
from detector.raster import rasterize_pdf_file, save_jpeg, upload_path

DATASET_DIR = Path(os.getenv("YOLO_DATASET_DIR", "data/yolo_dataset"))


def _slug(filename: str) -> str:
    stem = Path(filename).stem
    return "".join(c if c.isalnum() or c in "-_" else "_" for c in stem)[:80]


def write_data_yaml() -> Path:
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    (DATASET_DIR / "images" / "train").mkdir(parents=True, exist_ok=True)
    (DATASET_DIR / "labels" / "train").mkdir(parents=True, exist_ok=True)
    yaml_path = DATASET_DIR / "data.yaml"
    names_block = "\n".join(f"  {i}: {n}" for i, n in enumerate(CLASS_NAMES))
    yaml_path.write_text(
        f"""# Auto-generated HVAC duct fitting dataset
path: {DATASET_DIR.resolve()}
train: images/train
val: images/train

names:
{names_block}
""",
        encoding="utf-8",
    )
    return yaml_path


def percent_bbox_to_yolo(bbox: Dict[str, float]) -> Optional[tuple]:
    """Convert UI percent bbox {x,y,w,h} → YOLO normalized cx,cy,w,h."""
    try:
        x = float(bbox["x"]) / 100.0
        y = float(bbox["y"]) / 100.0
        w = float(bbox["w"]) / 100.0
        h = float(bbox["h"]) / 100.0
    except (KeyError, TypeError, ValueError):
        return None
    if w <= 0 or h <= 0:
        return None
    cx = x + w / 2.0
    cy = y + h / 2.0
    # clamp
    cx = min(1.0, max(0.0, cx))
    cy = min(1.0, max(0.0, cy))
    w = min(1.0, max(1e-4, w))
    h = min(1.0, max(1e-4, h))
    return cx, cy, w, h


def export_sections_for_file(filename: str, sections: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Rasterize the stored PDF upload and write YOLO image + label files
    for the given labeled sections.
    """
    write_data_yaml()
    pdf = upload_path(filename)
    if pdf is None:
        return {
            "ok": False,
            "reason": "pdf_not_cached",
            "message": (
                f"PDF '{filename}' was not found in uploads cache. "
                "Re-upload the drawing, then Save Training again."
            ),
        }

    image, _, _ = rasterize_pdf_file(pdf)
    slug = _slug(filename)
    img_path = DATASET_DIR / "images" / "train" / f"{slug}.jpg"
    lbl_path = DATASET_DIR / "labels" / "train" / f"{slug}.txt"
    save_jpeg(image, img_path)

    lines: List[str] = []
    skipped = 0
    for sec in sections:
        name = sec.get("fitting_name") or ""
        cls = fitting_name_to_class(name)
        if cls is None:
            skipped += 1
            continue
        cls_id = CLASS_NAMES.index(cls)
        yolo = percent_bbox_to_yolo(sec.get("bbox") or {})
        if not yolo:
            skipped += 1
            continue
        cx, cy, w, h = yolo
        lines.append(f"{cls_id} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}")

    lbl_path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    return {
        "ok": True,
        "image": str(img_path),
        "labels": str(lbl_path),
        "boxes": len(lines),
        "skipped": skipped,
        "data_yaml": str(DATASET_DIR / "data.yaml"),
    }


def dataset_stats() -> Dict[str, Any]:
    write_data_yaml()
    images = list((DATASET_DIR / "images" / "train").glob("*.jpg")) + list(
        (DATASET_DIR / "images" / "train").glob("*.png")
    )
    labels = list((DATASET_DIR / "labels" / "train").glob("*.txt"))
    box_count = 0
    for lp in labels:
        text = lp.read_text(encoding="utf-8").strip()
        if text:
            box_count += len(text.splitlines())
    return {
        "dataset_dir": str(DATASET_DIR.resolve()),
        "images": len(images),
        "label_files": len(labels),
        "boxes": box_count,
        "classes": CLASS_NAMES,
        "ready_to_train": len(images) > 0 and box_count > 0,
    }
