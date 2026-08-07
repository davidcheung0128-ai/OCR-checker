"""
Basic training seed from Young's EAF-B1-02 Calculate sheet + labeled duct run 1–11.

This seeds:
1. Ground-truth component labels (Excel names + typical bbox positions along the run)
2. A simple symbol legend (visual cue → fitting name) for future embedding / MinerU matching
"""

# Horizontal duct run layout (percent of drawing), left → right matching labels 1–11
# Tuned for typical EAF-B1-02 Master Water Meter Room plan orientation.
EAF_B1_02_SECTIONS = [
    {
        "id": 1,
        "type": "Suction",
        "fitting_name": "Air Grille",
        "a_mm": 600,
        "b_mm": 600,
        "length_m": 0.0,
        "fitting_code": "GRILLE",
        "bbox": {"x": 10, "y": 43, "w": 5.5, "h": 9},
        "visual_cue": "Mesh / grille pattern at intake",
    },
    {
        "id": 2,
        "type": "Suction",
        "fitting_name": "Damper",
        "a_mm": 600,
        "b_mm": 600,
        "length_m": 0.0,
        "fitting_code": "CR9-4",
        "bbox": {"x": 16.5, "y": 43, "w": 5.5, "h": 9},
        "visual_cue": "Dense grid / mesh square on duct",
    },
    {
        "id": 3,
        "type": "Suction",
        "fitting_name": "Run",
        "a_mm": 500,
        "b_mm": 250,
        "length_m": 1.4,
        "fitting_code": "",
        "bbox": {"x": 23, "y": 44.5, "w": 9, "h": 6},
        "visual_cue": "Plain rectangular duct segment",
    },
    {
        "id": 4,
        "type": "Suction",
        "fitting_name": "Silencer",
        "a_mm": 500,
        "b_mm": 250,
        "length_m": 0.0,
        "fitting_code": "SILENCER_DEFAULT",
        "bbox": {"x": 33, "y": 43, "w": 7, "h": 9},
        "visual_cue": "Rectangle with parallel horizontal louvre lines",
    },
    {
        "id": 5,
        "type": "Suction",
        "fitting_name": "Flexible connector",
        "a_mm": 500,
        "b_mm": 250,
        "length_m": 0.0,
        "fitting_code": "FLEX_DEFAULT",
        "bbox": {"x": 41, "y": 43, "w": 4, "h": 9},
        "visual_cue": "Thin joint / flex band between duct pieces",
    },
    {
        "id": 6,
        "type": "Discharge",
        "fitting_name": "Flexible connector",
        "a_mm": 500,
        "b_mm": 250,
        "length_m": 0.0,
        "fitting_code": "FLEX_DEFAULT",
        "bbox": {"x": 46, "y": 43, "w": 5, "h": 9},
        "visual_cue": "Flex joint after fan (often highlighted)",
    },
    {
        "id": 7,
        "type": "Discharge",
        "fitting_name": "Silencer",
        "a_mm": 500,
        "b_mm": 250,
        "length_m": 0.0,
        "fitting_code": "SILENCER_DEFAULT",
        "bbox": {"x": 52, "y": 43, "w": 7, "h": 9},
        "visual_cue": "Rectangle with parallel horizontal louvre lines",
    },
    {
        "id": 8,
        "type": "Discharge",
        "fitting_name": "Damper",
        "a_mm": 500,
        "b_mm": 250,
        "length_m": 0.0,
        "fitting_code": "CR9-4",
        "bbox": {"x": 60, "y": 43, "w": 5.5, "h": 9},
        "visual_cue": "Valve symbol (two triangles / arrow through duct)",
    },
    {
        "id": 9,
        "type": "Discharge",
        "fitting_name": "Transition",
        "a_mm": 500,
        "b_mm": 400,
        "length_m": 0.0,
        "fitting_code": "SR4-1",
        "bbox": {"x": 66.5, "y": 42, "w": 6, "h": 10},
        "visual_cue": "Duct size change / taper section",
        "theta": 60,
        "area_ratio": 1.60,
    },
    {
        "id": 10,
        "type": "Discharge",
        "fitting_name": "Fire Damper",
        "a_mm": 500,
        "b_mm": 400,
        "length_m": 0.0,
        "fitting_code": "",
        "bbox": {"x": 73.5, "y": 43, "w": 4.5, "h": 9},
        "visual_cue": "Thin dark vertical band / FD mark on duct",
    },
    {
        "id": 11,
        "type": "Discharge",
        "fitting_name": "Louvre",
        "a_mm": 500,
        "b_mm": 400,
        "length_m": 0.0,
        "fitting_code": "",
        "bbox": {"x": 79, "y": 43, "w": 7, "h": 9},
        "visual_cue": "End outlet with horizontal louvre lines",
    },
]


# Basic legend: how each part typically looks → standard Young’s Excel name
SYMBOL_LEGEND = [
    {
        "name": "Air Grille",
        "fitting_code": "GRILLE",
        "section_type": "Suction",
        "looks_like": "Mesh or grille pattern at duct intake / room opening",
        "aliases": ["Grille", "Air Grille", "AG"],
    },
    {
        "name": "Damper",
        "fitting_code": "CR9-4",
        "section_type": "Suction",
        "looks_like": "Valve symbol — two triangles meeting, or dense grid square on duct",
        "aliases": ["Damper", "VD", "Volume Damper"],
    },
    {
        "name": "Run",
        "fitting_code": "",
        "section_type": "Suction",
        "looks_like": "Plain rectangular duct segment with no fittings",
        "aliases": ["Run", "Duct Run", "Straight Duct"],
    },
    {
        "name": "Silencer",
        "fitting_code": "SILENCER_DEFAULT",
        "section_type": "Suction",
        "looks_like": "Rectangular unit with parallel horizontal louvre / baffle lines",
        "aliases": ["Silencer", "Attenuator", "SA"],
    },
    {
        "name": "Flexible connector",
        "fitting_code": "FLEX_DEFAULT",
        "section_type": "Suction",
        "looks_like": "Short flex joint / wavy or thin band between rigid duct pieces",
        "aliases": ["Flexible connector", "Flex", "FC"],
    },
    {
        "name": "Transition",
        "fitting_code": "SR4-1",
        "section_type": "Discharge",
        "looks_like": "Taper / size-change duct piece (a×b changes)",
        "aliases": ["Transition", "Reducer", "TR"],
    },
    {
        "name": "Fire Damper",
        "fitting_code": "",
        "section_type": "Discharge",
        "looks_like": "Thin dark vertical band across duct, often marked F.D.",
        "aliases": ["Fire Damper", "FD", "F.D."],
    },
    {
        "name": "Louvre",
        "fitting_code": "",
        "section_type": "Discharge",
        "looks_like": "External outlet with horizontal louvre blades",
        "aliases": ["Louvre", "Louver", "EL"],
    },
]


SEED_SOURCE_FILENAME = "02_EAF-B1-02@B1F.pdf"


def get_default_sections():
    """Return clean section dicts for upload fallback / demo."""
    sections = []
    for item in EAF_B1_02_SECTIONS:
        sec = {
            "id": item["id"],
            "type": item["type"],
            "fitting_name": item["fitting_name"],
            "a_mm": item["a_mm"],
            "b_mm": item["b_mm"],
            "length_m": item["length_m"],
            "fitting_code": item["fitting_code"],
            "bbox": dict(item["bbox"]),
            "learned_from_training": True,
            "manually_labeled": False,
        }
        if "theta" in item:
            sec["theta"] = item["theta"]
        if "area_ratio" in item:
            sec["area_ratio"] = item["area_ratio"]
        sections.append(sec)
    return sections


def seed_training_data(db, UserFeedback, force: bool = False) -> dict:
    """
    Insert EAF-B1-02 ground-truth labels into user_feedback if empty (or force=True).
    Returns counts of what was seeded.
    """
    existing = db.query(UserFeedback).filter(
        UserFeedback.filename == SEED_SOURCE_FILENAME
    ).count()

    if existing > 0 and not force:
        return {
            "seeded": False,
            "reason": "already_seeded",
            "existing_labels": existing,
            "legend_entries": len(SYMBOL_LEGEND),
        }

    if force:
        db.query(UserFeedback).filter(
            UserFeedback.filename.in_([SEED_SOURCE_FILENAME, "__symbol_legend__"])
        ).delete(synchronize_session=False)

    for item in EAF_B1_02_SECTIONS:
        db.add(
            UserFeedback(
                filename=SEED_SOURCE_FILENAME,
                original_ai_label="Unknown",
                corrected_label=item["fitting_name"],
                bounding_box=item["bbox"],
                section_type=item["type"],
                fitting_code=item["fitting_code"] or "",
            )
        )

    # Store legend as special feedback rows (bbox empty / sentinel)
    for legend in SYMBOL_LEGEND:
        db.add(
            UserFeedback(
                filename="__symbol_legend__",
                original_ai_label=legend["looks_like"],
                corrected_label=legend["name"],
                bounding_box={"x": 0, "y": 0, "w": 0, "h": 0, "legend": True, "aliases": legend["aliases"]},
                section_type=legend["section_type"],
                fitting_code=legend["fitting_code"] or "",
            )
        )

    db.commit()
    return {
        "seeded": True,
        "component_labels": len(EAF_B1_02_SECTIONS),
        "legend_entries": len(SYMBOL_LEGEND),
        "source": SEED_SOURCE_FILENAME,
    }
