"""Detector package: YOLO duct fitting detection."""

from detector.engine import detect_duct_sections, get_detector_status
from detector.dataset import export_sections_for_file, dataset_stats

__all__ = [
    "detect_duct_sections",
    "get_detector_status",
    "export_sections_for_file",
    "dataset_stats",
]
