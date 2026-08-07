"""Duct fitting class taxonomy for YOLO training & inference."""

from __future__ import annotations

# YOLO class index order (stable — do not reorder without retraining)
CLASS_NAMES: list[str] = [
    "air_grille",
    "damper",
    "run",
    "silencer",
    "flexible_connector",
    "transition",
    "fire_damper",
    "louvre",
]

# Open-vocab prompts for YOLO-World bootstrap (before custom fine-tune)
WORLD_PROMPTS: list[str] = [
    "HVAC air grille mesh intake",
    "duct volume damper valve",
    "straight rectangular duct run",
    "duct silencer attenuator with louvres",
    "flexible duct connector joint",
    "duct transition reducer taper",
    "fire damper FD on duct",
    "external air louvre outlet",
]

# Map class → Young / Excel section defaults
CLASS_META: dict[str, dict] = {
    "air_grille": {
        "fitting_name": "Air Grille",
        "type": "Suction",
        "fitting_code": "GRILLE",
        "a_mm": 600,
        "b_mm": 600,
        "length_m": 0.0,
    },
    "damper": {
        "fitting_name": "Damper",
        "type": "Suction",
        "fitting_code": "CR9-4",
        "a_mm": 500,
        "b_mm": 250,
        "length_m": 0.0,
    },
    "run": {
        "fitting_name": "Run",
        "type": "Suction",
        "fitting_code": "",
        "a_mm": 500,
        "b_mm": 250,
        "length_m": 1.0,
    },
    "silencer": {
        "fitting_name": "Silencer",
        "type": "Suction",
        "fitting_code": "SILENCER_DEFAULT",
        "a_mm": 500,
        "b_mm": 250,
        "length_m": 0.0,
    },
    "flexible_connector": {
        "fitting_name": "Flexible connector",
        "type": "Suction",
        "fitting_code": "FLEX_DEFAULT",
        "a_mm": 500,
        "b_mm": 250,
        "length_m": 0.0,
    },
    "transition": {
        "fitting_name": "Transition",
        "type": "Discharge",
        "fitting_code": "SR4-1",
        "a_mm": 500,
        "b_mm": 400,
        "length_m": 0.0,
        "theta": 60,
        "area_ratio": 1.6,
    },
    "fire_damper": {
        "fitting_name": "Fire Damper",
        "type": "Discharge",
        "fitting_code": "",
        "a_mm": 500,
        "b_mm": 400,
        "length_m": 0.0,
    },
    "louvre": {
        "fitting_name": "Louvre",
        "type": "Discharge",
        "fitting_code": "",
        "a_mm": 500,
        "b_mm": 400,
        "length_m": 0.0,
    },
}

# Human label → YOLO class
LABEL_TO_CLASS: dict[str, str] = {
    "air grille": "air_grille",
    "grille": "air_grille",
    "ag": "air_grille",
    "damper": "damper",
    "vd": "damper",
    "volume damper": "damper",
    "run": "run",
    "duct run": "run",
    "straight duct": "run",
    "silencer": "silencer",
    "attenuator": "silencer",
    "sa": "silencer",
    "flexible connector": "flexible_connector",
    "flex": "flexible_connector",
    "fc": "flexible_connector",
    "transition": "transition",
    "reducer": "transition",
    "tr": "transition",
    "fire damper": "fire_damper",
    "fd": "fire_damper",
    "f.d.": "fire_damper",
    "louvre": "louvre",
    "louver": "louvre",
    "el": "louvre",
}


def fitting_name_to_class(name: str) -> str | None:
    if not name:
        return None
    key = name.strip().lower()
    if key in LABEL_TO_CLASS:
        return LABEL_TO_CLASS[key]
    # fuzzy contains
    for alias, cls in LABEL_TO_CLASS.items():
        if alias in key or key in alias:
            return cls
    return None


def class_to_section(class_name: str, bbox: dict, section_id: int, confidence: float = 0.0) -> dict:
    meta = CLASS_META.get(class_name, CLASS_META["run"]).copy()
    sec = {
        "id": section_id,
        "type": meta["type"],
        "fitting_name": meta["fitting_name"],
        "a_mm": meta["a_mm"],
        "b_mm": meta["b_mm"],
        "length_m": meta["length_m"],
        "fitting_code": meta["fitting_code"],
        "bbox": {
            "x": round(float(bbox["x"]), 2),
            "y": round(float(bbox["y"]), 2),
            "w": round(float(bbox["w"]), 2),
            "h": round(float(bbox["h"]), 2),
        },
        "learned_from_training": False,
        "manually_labeled": False,
        "yolo_detected": True,
        "yolo_class": class_name,
        "yolo_confidence": round(float(confidence), 3),
    }
    if "theta" in meta:
        sec["theta"] = meta["theta"]
    if "area_ratio" in meta:
        sec["area_ratio"] = meta["area_ratio"]
    return sec
