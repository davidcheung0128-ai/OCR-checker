#!/usr/bin/env python3
"""
Train a custom YOLO model on Save-Training exports.

Usage (inside backend container or venv):
  cd backend
  python train_yolo.py
  # copies runs/detect/duct_yolo/weights/best.pt → weights/duct_yolo.pt

Prereqs:
  1. Upload PDF drawings
  2. Label boxes in Step 2 (Adjust / Draw)
  3. Click Save Training  (writes data/yolo_dataset/)
  4. Label several different plans for cross-drawing generalization
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from detector.dataset import dataset_stats, write_data_yaml


def main() -> int:
    parser = argparse.ArgumentParser(description="Train HVAC duct YOLO detector")
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--imgsz", type=int, default=1280)
    parser.add_argument("--batch", type=int, default=4)
    parser.add_argument("--model", default="yolov8n.pt", help="Base checkpoint")
    parser.add_argument("--name", default="duct_yolo")
    parser.add_argument(
        "--out",
        default="weights/duct_yolo.pt",
        help="Where to copy best.pt",
    )
    args = parser.parse_args()

    stats = dataset_stats()
    print("[dataset]", stats)
    if not stats["ready_to_train"]:
        print(
            "ERROR: No labeled images yet.\n"
            "Upload a PDF → Step 2 label boxes → Save Training, then re-run.",
            file=sys.stderr,
        )
        return 1

    yaml_path = write_data_yaml()
    try:
        from ultralytics import YOLO
    except ImportError:
        print("ERROR: ultralytics not installed. pip install ultralytics", file=sys.stderr)
        return 1

    model = YOLO(args.model)
    results = model.train(
        data=str(yaml_path),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        name=args.name,
        project="runs/detect",
        exist_ok=True,
    )

    # Locate best.pt
    best = Path("runs/detect") / args.name / "weights" / "best.pt"
    if not best.is_file():
        # ultralytics may return save_dir on results
        save_dir = Path(getattr(results, "save_dir", ""))
        candidate = save_dir / "weights" / "best.pt"
        if candidate.is_file():
            best = candidate

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    if best.is_file():
        shutil.copy2(best, out)
        print(f"[ok] Copied {best} → {out}")
        print("Restart backend (or wait for reload). Next upload will use custom YOLO.")
        return 0

    print(f"WARNING: best.pt not found at {best}. Check runs/detect/{args.name}/", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
