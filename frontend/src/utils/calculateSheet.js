/**
 * Young's Engineering Calculate(B1F)(EAF-B1-02) sheet builder and formula engine.
 */

const AIR_DENSITY = 1.2;
const ROUGHNESS = 0.15;

const ASHRAE_FITTINGS = {
  'CR9-4': 0.18,
  'SR4-1': 0.89,
  SILENCER_DEFAULT: 0,
  FLEX_DEFAULT: 0,
  GRILLE: 15.0,
};

/** Manufacturer / schedule fixed pressure drops (Pa) when C-factor is not used */
const FIXED_LOSS_PA = {
  Silencer: 75,
  'Flexible connector': 5,
  'Fire Damper': 10,
  Louvre: 50,
  GRILLE: null,
};

export function parsePdfFilename(filename = '') {
  const match = filename.match(/(\d+)_(.+?)@(.+)\.pdf$/i);
  if (match) {
    const floor = match[3];
    return {
      prefix: match[1],
      refNo: match[2],
      floor,
      location: floor.includes('B1') ? 'B1/F Master Water Meter Room' : `${floor} Plant Room`,
    };
  }
  return {
    prefix: '02',
    refNo: 'EAF-B1-02',
    floor: 'B1F',
    location: 'B1/F Master Water Meter Room',
  };
}

export function getCalculateFilenames(meta, filled = true) {
  const base = `Calculate(${meta.floor})(${meta.refNo})`;
  return {
    template: `${base}.csv`,
    filled: `${base}-2.csv`,
    active: filled ? `${base}-2.csv` : `${base}.csv`,
  };
}

function hydraulicDiameter(a, b) {
  if (a <= 0 || b <= 0) return 0;
  return 1.3 * (a * b) ** 0.625 / (a + b) ** 0.25;
}

function colebrook(epsilon, D, Re) {
  if (Re <= 0 || D <= 0) return 0.02;
  let f = 0.02;
  for (let i = 0; i < 20; i += 1) {
    const sqrtF = Math.sqrt(f);
    const expr = epsilon / (3.7 * D) + 2.51 / (Re * sqrtF);
    const newF = 1 / (-2 * Math.log10(expr)) ** 2;
    if (Math.abs(newF - f) < 1e-6) return newF;
    f = newF;
  }
  return f;
}

export function computeSectionPhysics(sec, flowRate) {
  const a = Number(sec.a_mm) || 0;
  const b = Number(sec.b_mm) || 0;
  const L = Number(sec.length_m) || 0;
  const area = (a / 1000) * (b / 1000);
  const velocity = area > 0 ? flowRate / area : 0;
  const D = hydraulicDiameter(a, b);
  const Re = 66.4 * D * velocity;
  const f = colebrook(ROUGHNESS, D, Re);
  const velPressure = 0.5 * AIR_DENSITY * velocity ** 2;

  let cCoeff = 0;
  const code = sec.fitting_code || '';
  if (sec.c_coefficient != null && sec.c_coefficient !== '' && Number(sec.c_coefficient) > 0) {
    cCoeff = Number(sec.c_coefficient);
  } else if (code && ASHRAE_FITTINGS[code] != null) {
    cCoeff = ASHRAE_FITTINGS[code];
  } else if (sec.fitting_name?.toLowerCase().includes('grille')) {
    cCoeff = 15;
  }

  const frictionPaPerM = D > 0 ? ((1000 * f) / D) * velPressure : 0;
  const frictionLoss = L > 0 && D > 0 ? frictionPaPerM * L : 0;

  let fittingLoss = cCoeff * velPressure;
  const fixed = FIXED_LOSS_PA[sec.fitting_name];
  if (fixed != null && !(cCoeff > 0)) {
    fittingLoss = fixed;
  }

  const totalLoss = frictionLoss + fittingLoss;

  return {
    D_mm: Math.round(D),
    Re: Math.round(Re),
    f: Number(f.toFixed(4)),
    velocity_ms: Number(velocity.toFixed(2)),
    velocity_pressure_pa: Number(velPressure.toFixed(2)),
    friction_pa_per_m: Number(frictionPaPerM.toFixed(2)),
    c_coefficient: cCoeff,
    friction_loss_pa: Number(totalLoss.toFixed(2)),
  };
}

function padRow(values, width = 60) {
  const row = Array(width).fill('');
  values.forEach((v, i) => {
    if (i < width) row[i] = v ?? '';
  });
  return row;
}

function fmt(val, decimals = 2) {
  if (val === '' || val == null) return '';
  const n = Number(val);
  if (Number.isNaN(n)) return String(val);
  return decimals === 0 ? `${Math.round(n)} ` : `${n.toFixed(decimals)} `;
}

export function buildSheetModel(sections, settings) {
  const {
    flowRate = 0.25,
    refNo = 'EAF-B1-02',
    floor = 'B1F',
    location = 'B1/F Master Water Meter Room',
    projectName = 'Dedicated Rehousing at Ma Tau Kok',
    specifiedEsp = 400,
    offeredEsp = 450,
  } = settings;

  const rows = [];
  const editable = [];
  const formulas = {};
  const sectionRowMap = [];

  const markEditable = (r, c, key) => {
    editable.push({ r, c, key });
  };

  rows.push(padRow(['', "Young's Engineering Company Limited"]));
  rows.push(padRow(['', projectName]));
  rows.push(padRow([]));
  rows.push(padRow(['', 'External Static Pressure Calculation']));
  rows.push(padRow([]));

  rows.push(padRow(['', 'Location : ', '', '', '', location]));
  markEditable(5, 5, 'location');

  rows.push(padRow(['', 'Ref. No : ', '', '', '', refNo, '', '', '', '', '', '', '', '', '', 'Flow Rate (m3/s) :', '', '', fmt(flowRate, 2), fmt(flowRate, 2)]));
  markEditable(6, 5, 'refNo');
  markEditable(6, 18, 'flowRate');
  markEditable(6, 19, 'flowRateOffered');

  rows.push(padRow(['', 'Area Served : ', '', '', '', location, '', '', '', '', '', '', '', '', '', 'External Static Pressure (Pa) :', '', '', fmt(specifiedEsp, 0), fmt(offeredEsp, 0)]));
  markEditable(7, 18, 'specifiedEsp');
  markEditable(7, 19, 'offeredEsp');

  rows.push(padRow([]));
  rows.push(padRow([]));
  rows.push(padRow(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Duct', '', 'Fittiing']));
  rows.push(padRow(['Sectiobn', 'Air', 'Duct ', '', '', 'Type of ', 'Main Duct Size', '', '', 'Branch Duct', '', '', 'Hydraulic\nDiameter', 'Reynolds\nNumber', 'Roughness\nFactor', 'Darcy\nFriction', 'Total\nLength', 'Friction\nFactor', 'Fitting', ' Velocity ', ' Velocity ', ' Friction ']));
  rows.push(padRow(['', 'Qty.', 'Section', '', '', 'Fitting', 'a', 'x', 'b', 'SIZE', '', '', 'D', 'Re', 'ε', 'f', 'L', '(1000f/D)(ρV2/2)', 'Loss', '', 'Pressure ', ' Loss ']));
  rows.push(padRow(['', '(m3/s)', '', '', '', '', '(mm)', '', '(mm)', '(mm)', '', '', '(mm)', '(mm)', '(mm)', '(mm)', '(m)', '(Pa/m)', 'Coefficient', ' (m/s) ', ' (Pa) ', ' (Pa) ']));

  const suction = sections.filter((s) => s.type === 'Suction');
  const discharge = sections.filter((s) => s.type === 'Discharge');

  rows.push(padRow(['', 'Suction']));

  let sectionNum = 1;
  let totalLoss = 0;

  [...suction, ...discharge].forEach((sec, idx) => {
    if (idx === suction.length) {
      rows.push(padRow(['Fan']));
      rows.push(padRow(['', 'Discharge']));
    }

    const p = computeSectionPhysics(sec, flowRate);
    totalLoss += p.friction_loss_pa;

    const r = rows.length;
    sectionRowMap.push({ row: r, sectionId: sec.id, sectionNum });

    rows.push(padRow([
      '', String(sectionNum), fmt(flowRate, 3), '', '', '',
      sec.fitting_name, String(sec.a_mm), 'x', String(sec.b_mm), '', '', '',
      fmt(p.D_mm, 0), fmt(p.Re, 0), '0.15 ', fmt(p.f, 2),
      sec.length_m ? fmt(sec.length_m, 1) : '',
      fmt(p.friction_pa_per_m, 2), p.c_coefficient ? fmt(p.c_coefficient, 2) : '',
      fmt(p.velocity_ms, 2), fmt(p.velocity_pressure_pa, 2), fmt(p.friction_loss_pa, 2),
    ]));

    markEditable(r, 6, `section.${sec.id}.fitting_name`);
    markEditable(r, 7, `section.${sec.id}.a_mm`);
    markEditable(r, 9, `section.${sec.id}.b_mm`);
    markEditable(r, 16, `section.${sec.id}.length_m`);
    markEditable(r, 18, `section.${sec.id}.c_coefficient`);

    formulas[`${r},12`] = 'D = 1.30×(a×b)^0.625/(a+b)^0.25';
    formulas[`${r},13`] = 'Re = 66.4×D×V';
    formulas[`${r},19`] = 'V = Q/(a×b)';
    formulas[`${r},20`] = 'Pv = 0.5×ρ×V²';
    formulas[`${r},21`] = 'ΔP = f×L + C×Pv';

    sectionNum += 1;
  });

  if (sections.length === 0) {
    rows.push(padRow(['', 'Suction']));
    for (let i = 1; i <= 5; i += 1) {
      rows.push(padRow(['', String(i), '', '', '', '', '', 'x', '', 'x', '', 'x', '#DIV/0!', '#DIV/0!', '0.15 ', '#DIV/0!', '', '#DIV/0!', '', '#DIV/0!', '#DIV/0!']));
    }
    rows.push(padRow(['Fan']));
    rows.push(padRow(['', 'Discharge']));
  }

  rows.push(padRow([]));

  const safety = totalLoss * 0.2;
  const grand = totalLoss + safety;
  const totalRow = rows.length;
  rows.push(padRow(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Total Pressure Loss', '', '', fmt(totalLoss, 2)]));
  formulas[`${totalRow},21`] = 'SUM(friction loss column)';
  rows.push(padRow(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Safety Factor :', '20%', fmt(safety, 2)]));
  formulas[`${totalRow + 1},21`] = 'Total × 20%';
  rows.push(padRow(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', fmt(grand, 2)]));
  formulas[`${totalRow + 2},21`] = 'Total + Safety';

  while (rows.length < 45) rows.push(padRow([]));

  rows.push(padRow(['', 'Remarks :', '', '', '(1) * The Calculation Data are based on the ASHRAE Fundamentals Handbook ']));

  return {
    rows,
    editable,
    formulas,
    sectionRowMap,
    meta: { flowRate, refNo, floor, location, projectName, specifiedEsp, offeredEsp },
    totals: { totalLoss, safety, grand },
  };
}

export function applySheetEdit(sheetModel, sections, key, value) {
  const settings = { ...sheetModel.meta };
  const updatedSections = sections.map((s) => ({ ...s }));

  if (key === 'location') settings.location = value;
  else if (key === 'refNo') settings.refNo = value;
  else if (key === 'flowRate') settings.flowRate = parseFloat(value) || 0;
  else if (key === 'flowRateOffered') settings.flowRate = parseFloat(value) || 0;
  else if (key === 'specifiedEsp') settings.specifiedEsp = parseFloat(value) || 0;
  else if (key === 'offeredEsp') settings.offeredEsp = parseFloat(value) || 0;
  else if (key.startsWith('section.')) {
    const parts = key.split('.');
    const id = parts[1];
    const field = parts[2];
    const idx = updatedSections.findIndex((s) => String(s.id) === id);
    if (idx >= 0) {
      updatedSections[idx] = {
        ...updatedSections[idx],
        [field]:
          field.includes('_mm') || field === 'length_m' || field === 'c_coefficient'
            ? parseFloat(value) || 0
            : value,
      };
    }
  }

  const newModel = buildSheetModel(updatedSections, settings);
  return { sheetModel: newModel, sections: updatedSections, settings };
}

export function sheetToCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? '');
          if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(','),
    )
    .join('\n');
}

export function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
