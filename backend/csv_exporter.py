# backend/csv_exporter.py
"""Generate Young's Engineering ESP calculation CSV matching Calculate(B1F)(EAF-B1-02).csv format."""
import csv
from io import StringIO
from typing import List, Optional

from physics_engine import calculate_duct_section, ASHRAE_FITTINGS

COLS = 60


def _pad_row(values: list, width: int = COLS) -> list:
    row = [''] * width
    for i, v in enumerate(values):
        if i < width:
            row[i] = v if v is not None else ''
    return row


def _fmt_num(val, decimals=2):
    if val is None or val == '':
        return ''
    try:
        n = float(val)
        if decimals == 0:
            return f'{round(n):.0f} '
        return f'{n:.{decimals}f} '
    except (TypeError, ValueError):
        return str(val)


def _section_row(section_num: int, sec: dict, flow_rate: float) -> list:
    physics = calculate_duct_section(
        sec.get('a_mm', 0),
        sec.get('b_mm', 0),
        sec.get('length_m', 0),
        flow_rate,
        sec.get('fitting_code') or None,
    )

    fitting_code = sec.get('fitting_code') or ''
    c_coeff = physics.get('c_coefficient', 0)
    if c_coeff == 0 and fitting_code and fitting_code in ASHRAE_FITTINGS:
        c_coeff = ASHRAE_FITTINGS[fitting_code]

    # Grille default coeff when name matches
    if c_coeff == 0 and 'grille' in sec.get('fitting_name', '').lower():
        c_coeff = 15.0

    f_pa_per_m = 0
    if physics.get('D_mm', 0) > 0:
        f_pa_per_m = (1000 * physics.get('f', 0.02) / physics['D_mm']) * physics.get('velocity_pressure_pa', 0)

    friction_loss = physics.get('friction_loss_pa', 0) + physics.get('fitting_loss_pa', 0)
    if friction_loss == 0 and c_coeff > 0:
        friction_loss = c_coeff * physics.get('velocity_pressure_pa', 0)

    has_branch = 'x' if sec.get('branch_size') else ''

    row = _pad_row([
        '',  # A
        str(section_num),  # B section
        _fmt_num(flow_rate, 3),  # C air qty
        '', '', '',  # D-F
        sec.get('fitting_name', ''),  # G fitting
        str(sec.get('a_mm', '')),  # H a
        'x',  # I
        str(sec.get('b_mm', '')),  # J b
        has_branch,  # K branch
        'x' if has_branch else '',  # L
        '',  # M
        _fmt_num(physics.get('D_mm', 0), 0),  # N D (col 12 in 0-index from data start - using template cols)
    ])

    # Align with template column positions (index-based)
    row[12] = _fmt_num(physics.get('D_mm', 0), 0)
    row[13] = _fmt_num(physics.get('Re', 0), 0)
    row[14] = '0.15 '
    row[15] = _fmt_num(physics.get('f', 0.02), 2)
    row[16] = _fmt_num(sec.get('length_m', 0), 1) if sec.get('length_m', 0) else ''
    row[17] = _fmt_num(f_pa_per_m, 2)
    row[18] = _fmt_num(c_coeff, 2) if c_coeff else ''
    row[19] = _fmt_num(physics.get('velocity_ms', 0), 2)
    row[20] = _fmt_num(physics.get('velocity_pressure_pa', 0), 2)
    row[21] = _fmt_num(friction_loss, 2)

    if fitting_code:
        row[23] = 'ASHARE'
        row[24] = fitting_code

    return row


def generate_calculate_csv(
    sections: List[dict],
    flow_rate: float = 0.25,
    floor: str = 'B1F',
    ref_no: str = 'EAF-B1-02',
    location: str = 'B1/F Master Water Meter Room',
    project_name: str = 'Dedicated Rehousing at Ma Tau Kok',
    specified_esp: float = 400.0,
    offered_esp: float = 450.0,
    filled: bool = True,
) -> StringIO:
    """Build CSV matching Young's Calculate(B1F)(EAF-B1-02) template."""
    output = StringIO()
    writer = csv.writer(output, lineterminator='\n')

    rows = []

    rows.append(_pad_row(['', "Young's Engineering Company Limited"]))
    rows.append(_pad_row(['', project_name]))
    rows.append(_pad_row([]))
    rows.append(_pad_row(['', 'External Static Pressure Calculation']))
    rows.append(_pad_row([]))
    rows.append(_pad_row([
        '', 'Location : ', '', '', '',
        location if filled else '', '', '', '', '', '', '', '', '', '', '', '', '',
        'Specified', 'Offered', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '', '', 'For reference only !!!! (First Selection dated 27/10/00)',
    ]))
    rows.append(_pad_row([
        '', 'Ref. No : ', '', '', '',
        ref_no if filled else '', '', '', '', '', '', '', '', '', '', 'Flow Rate (m3/s) :', '', '',
        _fmt_num(flow_rate, 2) if filled else '0.00 ',
        _fmt_num(flow_rate, 2) if filled else '0.00 ',
    ]))
    rows.append(_pad_row([
        '', 'Area Served : ', '', '', '',
        location if filled else '', '', '', '', '', '', '', '', '', '', 'External Static Pressure (Pa) :', '', '',
        _fmt_num(specified_esp, 0) if filled else '0 ',
        _fmt_num(offered_esp, 0) if filled else '450 ',
    ]))
    rows.append(_pad_row([]))

    # Header block rows 10-19 (simplified single rows)
    rows.append(_pad_row([]))
    rows.append(_pad_row(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Duct', '', 'Fittiing']))
    rows.append(_pad_row([
        'Sectiobn', 'Air', 'Duct ', '', '', 'Type of ', 'Main Duct Size', '', '', 'Branch Duct', '', '',
        'Hydraulic\nDiameter', 'Reynolds\nNumber', 'Roughness\nFactor', 'Darcy\nFriction',
        'Total\nLength', 'Friction\nFactor', 'Fitting', ' Velocity ', ' Velocity ', ' Friction ',
    ]))
    rows.append(_pad_row([
        '', 'Qty.', 'Section', '', '', 'Fitting', 'a', 'x', 'b', 'SIZE', '', '', 'D', 'Re', 'ε', 'f', 'L',
        '(1000f/D)(ρV2/2)', 'Loss', '', 'Pressure ', ' Loss ',
    ]))
    rows.append(_pad_row([
        '', '(m3/s)', '', '', '', '', '(mm)', '', '(mm)', '(mm)', '', '', '(mm)', '(mm)', '(mm)', '(mm)', '(m)',
        '(Pa/m)', 'Coefficient', ' (m/s) ', ' (Pa) ', ' (Pa) ',
    ]))

    suction = [s for s in sections if s.get('type', 'Suction') == 'Suction']
    discharge = [s for s in sections if s.get('type') == 'Discharge']

    rows.append(_pad_row(['', 'Suction']))

    section_num = 1
    total_loss = 0.0
    data_row_indices = []

    for sec in suction:
        if filled:
            row = _section_row(section_num, sec, flow_rate)
            try:
                total_loss += float(str(row[21]).strip())
            except (ValueError, TypeError):
                pass
        else:
            row = _pad_row(['', str(section_num), '', '', '', '', '', 'x', '', 'x', '', 'x', '#DIV/0!', '#DIV/0!', '0.15 ', '#DIV/0!', '', '#DIV/0!', '', '#DIV/0!', '#DIV/0!'])
        data_row_indices.append(len(rows))
        rows.append(row)
        section_num += 1

    rows.append(_pad_row(['Fan']))
    rows.append(_pad_row(['', 'Discharge']))

    for sec in discharge:
        if filled:
            row = _section_row(section_num, sec, flow_rate)
            try:
                total_loss += float(str(row[21]).strip())
            except (ValueError, TypeError):
                pass
        else:
            row = _pad_row(['', str(section_num), '', '', '', '', '', 'x', '', 'x', '', 'x', '#DIV/0!', '#DIV/0!', '0.15 ', '#DIV/0!', '', '#DIV/0!', '', '#DIV/0!', '#DIV/0!'])
        data_row_indices.append(len(rows))
        rows.append(row)
        section_num += 1

    rows.append(_pad_row([]))

    safety = total_loss * 0.2 if filled else 0
    grand = total_loss + safety if filled else 0

    total_row = _pad_row([''] * 22)
    total_row[18] = 'Total Pressure Loss'
    total_row[21] = _fmt_num(total_loss, 2) if filled else ' -   '
    rows.append(total_row)

    safety_row = _pad_row([''] * 22)
    safety_row[18] = 'Safety Factor :'
    safety_row[19] = '20%'
    safety_row[21] = _fmt_num(safety, 2) if filled else ' -   '
    rows.append(safety_row)

    grand_row = _pad_row([''] * 22)
    grand_row[21] = _fmt_num(grand, 2) if filled else ' -   '
    rows.append(grand_row)

    rows.append(_pad_row(['', 'Remarks :', '', '', '(1) * The Calculation Data are based on the ASHRAE Fundamentals Handbook ']))
    rows.append(_pad_row(['', '', '', '', '(2) Velocity Pressure = 0.5 x Density of Air (1.2 kg/m³) x (Velocity of Air)²']))
    rows.append(_pad_row(['', '', '', '', '(3) Duct Friction Loss = Total Length x Friction factor']))
    rows.append(_pad_row(['', '', '', '', '      Darcy Equation: Δpf = (1000fL/D) x (ρV2/2)']))
    rows.append(_pad_row(['', '', '', '', "      Colebrook's Equation: 1/√f = -2 log [ε/(3.7D) + 2.51/(Re√f)]"]))
    rows.append(_pad_row(['', '', '', '', '      Hydraulic Diameter D = 1.30 (ab)0.625 / [(a+b)0.25]']))
    rows.append(_pad_row(['', '', '', '', '      Re=66.4DV']))
    rows.append(_pad_row(['', '', '', '', '(4) Fitting Friction Loss = Fitting Loss Coefficient x Velocity Pressure']))

    # Pad to ~99 rows like template
    while len(rows) < 99:
        rows.append(_pad_row([]))

    for row in rows:
        writer.writerow(row)

    output.seek(0)
    return output


def calculate_filename(floor: str, ref_no: str, filled: bool = True) -> str:
    base = f'Calculate({floor})({ref_no})'
    return f'{base}-2.csv' if filled else f'{base}.csv'


def parse_pdf_filename(filename: str) -> dict:
    """Parse 02_EAF-B1-02@B1F.pdf → floor, ref_no, location."""
    import re

    match = re.match(r'(\d+)_(.+?)@(.+)\.pdf$', filename, re.IGNORECASE)
    if match:
        ref_no = match.group(2)
        floor = match.group(3)
        location = f'{floor} Master Water Meter Room' if 'B1' in floor else f'{floor} Plant Room'
        return {
            'prefix': match.group(1),
            'ref_no': ref_no,
            'floor': floor,
            'location': location,
        }

    return {
        'prefix': '02',
        'ref_no': 'EAF-B1-02',
        'floor': 'B1F',
        'location': 'B1/F Master Water Meter Room',
    }
