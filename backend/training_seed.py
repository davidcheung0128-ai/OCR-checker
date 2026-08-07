"""
Basic training seed from Young's EAF-B1-02 Calculate sheet + labeled duct run 1–11.

Bboxes are percent-of-preview coordinates targeting the horizontal duct
inside the MASTER WATER METER ROOM (center-right of the plan).
Users can drag/resize boxes in the UI and Save to overwrite these.
"""

# Horizontal duct run in Master Water Meter Room (approx. center-right of drawing)
# x ≈ 52–82%, y ≈ 40–48% — aligned to the assembly with small labels 1–11 on the tube
_BASE_Y = 41.5
_BASE_H = 7.0
_START_X = 52.0
_GAPS = [0.3] * 10
_WIDTHS = [2.6, 2.8, 3.6, 3.2, 2.2, 2.5, 3.2, 2.8, 2.9, 2.3, 3.2]


def _run_bbox(index: int) -> dict:
    x = _START_X
    for i in range(index):
        x += _WIDTHS[i] + _GAPS[i]
    return {"x": round(x, 2), "y": _BASE_Y, "w": _WIDTHS[index], "h": _BASE_H}


EAF_B1_02_SECTIONS = [
    {
        "id": 1,
        "type": "Suction",
        "fitting_name": "Air Grille",
        "a_mm": 600,
        "b_mm": 600,
        "length_m": 0.0,
        "fitting_code": "GRILLE",
        "bbox": _run_bbox(0),
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
        "bbox": _run_bbox(1),
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
        "bbox": _run_bbox(2),
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
        "bbox": _run_bbox(3),
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
        "bbox": _run_bbox(4),
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
        "bbox": _run_bbox(5),
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
        "bbox": _run_bbox(6),
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
        "bbox": _run_bbox(7),
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
        "bbox": _run_bbox(8),
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
        "bbox": _run_bbox(9),
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
        "bbox": _run_bbox(10),
        "visual_cue": "End outlet with horizontal louvre blades",
    },
]


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


def _seed_bbox(item: dict) -> dict:
    return {**item["bbox"], "section_id": item["id"]}


def seed_training_data(db, UserFeedback, force: bool = False) -> dict:
    existing_rows = (
        db.query(UserFeedback)
        .filter(UserFeedback.filename == SEED_SOURCE_FILENAME)
        .order_by(UserFeedback.id.asc())
        .all()
    )

    if existing_rows and not force:
        # Refresh default positions onto the tube unless the user already Save-Training'd
        refreshed = 0
        for idx, item in enumerate(EAF_B1_02_SECTIONS):
            if idx >= len(existing_rows):
                break
            row = existing_rows[idx]
            bb = row.bounding_box if isinstance(row.bounding_box, dict) else {}
            if bb.get("manual_save"):
                continue
            new_bb = _seed_bbox(item)
            if (
                round(float(bb.get("x", -1)), 2) != new_bb["x"]
                or round(float(bb.get("y", -1)), 2) != new_bb["y"]
                or round(float(bb.get("w", -1)), 2) != new_bb["w"]
                or round(float(bb.get("h", -1)), 2) != new_bb["h"]
            ):
                row.bounding_box = new_bb
                row.corrected_label = item["fitting_name"]
                row.section_type = item["type"]
                row.fitting_code = item["fitting_code"] or ""
                refreshed += 1
        if refreshed:
            db.commit()
        return {
            "seeded": False,
            "reason": "already_seeded",
            "existing_labels": len(existing_rows),
            "bboxes_refreshed": refreshed,
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
                bounding_box=_seed_bbox(item),
                section_type=item["type"],
                fitting_code=item["fitting_code"] or "",
            )
        )

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
