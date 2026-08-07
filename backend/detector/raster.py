"""Rasterize PDF pages for YOLO training / inference (PyMuPDF)."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional, Tuple

import fitz  # PyMuPDF
import numpy as np

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "data/uploads"))
DEFAULT_DPI = float(os.getenv("YOLO_RENDER_DPI", "150"))


def ensure_dirs() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def save_upload(filename: str, pdf_bytes: bytes) -> Path:
    ensure_dirs()
    safe = Path(filename).name
    path = UPLOAD_DIR / safe
    path.write_bytes(pdf_bytes)
    return path


def upload_path(filename: str) -> Optional[Path]:
    path = UPLOAD_DIR / Path(filename).name
    return path if path.is_file() else None


def rasterize_pdf_bytes(
    pdf_bytes: bytes,
    page_index: int = 0,
    dpi: float = DEFAULT_DPI,
) -> Tuple[np.ndarray, int, int]:
    """
    Render a PDF page to RGB numpy array (H, W, 3).
    Returns (image, width, height).
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        if page_index < 0 or page_index >= len(doc):
            page_index = 0
        page = doc[page_index]
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
        return img.copy(), pix.width, pix.height
    finally:
        doc.close()


def rasterize_pdf_file(
    path: Path,
    page_index: int = 0,
    dpi: float = DEFAULT_DPI,
) -> Tuple[np.ndarray, int, int]:
    return rasterize_pdf_bytes(path.read_bytes(), page_index=page_index, dpi=dpi)


def save_jpeg(image: np.ndarray, out_path: Path, quality: int = 90) -> Path:
    from PIL import Image

    out_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(image).save(out_path, format="JPEG", quality=quality)
    return out_path
