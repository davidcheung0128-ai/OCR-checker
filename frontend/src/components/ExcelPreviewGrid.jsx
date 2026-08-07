import React, { useMemo, useState } from 'react';
import { computeSectionPhysics } from '../utils/calculateSheet';

const COLS = [
  { key: 'section', label: 'Section', width: '52px' },
  { key: 'air_qty', label: 'Air Qty.\n(m³/s)', width: '70px' },
  { key: 'fitting', label: 'Type of\nFitting', width: '120px', editable: true },
  { key: 'a', label: 'a\n(mm)', width: '56px', editable: true },
  { key: 'x', label: 'x', width: '24px' },
  { key: 'b', label: 'b\n(mm)', width: '56px', editable: true },
  { key: 'D', label: 'Hydraulic\nDiameter\nD (mm)', width: '72px', formula: 'D = 1.30 (ab)^0.625 / [(a+b)^0.25]' },
  { key: 'Re', label: 'Reynolds\nNumber\nRe', width: '72px', formula: 'Re = 66.4 × D × V' },
  { key: 'eps', label: 'Roughness\nFactor\nε (mm)', width: '64px' },
  { key: 'f', label: 'Darcy\nFriction\nf', width: '56px', formula: "1/√f = -2 log [ε/(3.7D) + 2.51/(Re√f)]" },
  { key: 'L', label: 'Total\nLength\nL (m)', width: '56px', editable: true },
  { key: 'ff', label: 'Friction Factor\n(1000f/D)(ρV²/2)\n(Pa/m)', width: '100px', formula: 'Δpf/L = (1000f/D)×(ρV²/2)' },
  { key: 'C', label: 'Fitting Loss\nCoefficient', width: '80px', editable: true, formula: 'ASHRAE C-factor' },
  { key: 'V', label: 'Velocity\n(m/s)', width: '64px', formula: 'V = Q / (a×b)' },
  { key: 'Pv', label: 'Velocity\nPressure\n(Pa)', width: '72px', formula: 'Pv = 0.5 × ρ × V²' },
  { key: 'dP', label: 'Friction\nLoss\n(Pa)', width: '72px', formula: 'ΔP = L×(Pa/m) + C×Pv' },
  { key: 'note', label: 'ASHRAE / Notes', width: '140px' },
];

function fmt(n, d = 2) {
  if (n == null || Number.isNaN(n)) return '';
  return Number(n).toFixed(d);
}

function SectionRow({
  sec,
  sectionNum,
  flowRate,
  isSelected,
  onSelect,
  onEdit,
  selectedCell,
  onSelectCell,
}) {
  const p = computeSectionPhysics(sec, flowRate);
  const note = [];
  if (sec.fitting_code) note.push(`ASHARE ${sec.fitting_code}`);
  if (sec.theta != null) note.push(`θ= ${sec.theta}`);
  if (sec.area_ratio != null) note.push(`A0/A1= ${sec.area_ratio}`);

  const cells = [
    { key: 'section', value: sectionNum, readOnly: true },
    { key: 'air_qty', value: fmt(flowRate, 3), readOnly: true },
    { key: 'fitting', value: sec.fitting_name, field: 'fitting_name' },
    { key: 'a', value: sec.a_mm, field: 'a_mm' },
    { key: 'x', value: 'x', readOnly: true },
    { key: 'b', value: sec.b_mm, field: 'b_mm' },
    { key: 'D', value: p.D_mm, readOnly: true, calc: true },
    { key: 'Re', value: p.Re, readOnly: true, calc: true },
    { key: 'eps', value: '0.15', readOnly: true },
    { key: 'f', value: fmt(p.f, 2), readOnly: true, calc: true },
    { key: 'L', value: sec.length_m || '', field: 'length_m' },
    { key: 'ff', value: fmt(p.friction_pa_per_m, 2), readOnly: true, calc: true },
    { key: 'C', value: p.c_coefficient ? fmt(p.c_coefficient, 2) : '', field: 'c_coefficient' },
    { key: 'V', value: fmt(p.velocity_ms, 2), readOnly: true, calc: true },
    { key: 'Pv', value: fmt(p.velocity_pressure_pa, 2), readOnly: true, calc: true },
    { key: 'dP', value: fmt(p.friction_loss_pa, 2), readOnly: true, calc: true },
    { key: 'note', value: note.join('  '), readOnly: true },
  ];

  return (
    <tr
      onClick={() => onSelect?.(sec.id)}
      className={`${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'} cursor-pointer`}
    >
      {cells.map((cell) => {
        const col = COLS.find((c) => c.key === cell.key);
        const cellId = `${sec.id}-${cell.key}`;
        const isActive = selectedCell === cellId;
        const editable = col?.editable && !cell.readOnly;

        return (
          <td
            key={cell.key}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(sec.id);
              onSelectCell?.(cellId, cell, col);
            }}
            className={`border border-gray-400 px-1 py-0.5 text-[11px] text-center whitespace-nowrap ${
              cell.calc ? 'bg-green-50/60 text-green-900' : ''
            } ${editable ? 'bg-amber-50/80' : ''} ${isActive ? 'ring-2 ring-inset ring-[#1e5a8a]' : ''}`}
            style={{ minWidth: col?.width }}
            title={col?.formula || ''}
          >
            {editable ? (
              <input
                className="w-full bg-transparent text-center outline-none font-inherit text-[11px]"
                value={cell.value ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  const numeric = ['a_mm', 'b_mm', 'length_m', 'c_coefficient'].includes(cell.field);
                  onEdit?.(sec.id, cell.field, numeric ? parseFloat(raw) || 0 : raw);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              cell.value
            )}
          </td>
        );
      })}
    </tr>
  );
}

export default function ExcelPreviewGrid({
  sections,
  settings,
  onSectionEdit,
  onSettingsEdit,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [formulaBar, setFormulaBar] = useState('Select a cell to view its formula');

  const flowRate = settings.flowRate ?? 0.25;
  const suction = sections.filter((s) => s.type === 'Suction');
  const discharge = sections.filter((s) => s.type === 'Discharge');

  const { totalLoss, safety, grand } = useMemo(() => {
    let total = 0;
    sections.forEach((sec) => {
      total += computeSectionPhysics(sec, flowRate).friction_loss_pa;
    });
    const sf = total * 0.2;
    return { totalLoss: total, safety: sf, grand: total + sf };
  }, [sections, flowRate]);

  const handleSelectCell = (cellId, cell, col) => {
    setSelectedCell(cellId);
    if (col?.formula) {
      setFormulaBar(col.formula);
    } else if (col?.editable) {
      setFormulaBar(`Editable: ${col.label.replace(/\n/g, ' ')}`);
    } else {
      setFormulaBar(String(cell.value ?? ''));
    }
  };

  let sectionNum = 1;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden text-gray-900">
      {/* Formula bar */}
      <div className="px-3 py-1.5 border-b border-gray-300 bg-gray-50 flex items-center gap-2 text-xs shrink-0">
        <span className="font-mono text-[#1e5a8a] font-semibold w-8">fx</span>
        <span className="text-gray-600 truncate">{formulaBar}</span>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {/* Document header — matches Young's Excel */}
        <div className="mb-3">
          <h1 className="text-xl font-bold font-serif text-black">Young&apos;s Engineering Company Limited</h1>
          <p className="text-sm italic text-gray-700 mt-0.5">
            <input
              className="bg-amber-50 border-b border-amber-200 outline-none italic px-1"
              value={settings.projectName || "Dedicated Rehousing at Ma Tau Kok"}
              onChange={(e) => onSettingsEdit?.('projectName', e.target.value)}
            />
          </p>
          <h2 className="text-base font-bold underline mt-3 mb-3">External Static Pressure Calculation</h2>

          <div className="flex flex-wrap justify-between gap-4 text-xs mb-2">
            <div className="space-y-1">
              <div className="flex gap-2 items-center">
                <span className="w-24 font-semibold">Location :</span>
                <input
                  className="bg-amber-50 border-b border-amber-200 outline-none px-1 min-w-[220px]"
                  value={settings.location || ''}
                  onChange={(e) => onSettingsEdit?.('location', e.target.value)}
                />
              </div>
              <div className="flex gap-2 items-center">
                <span className="w-24 font-semibold">Ref. No :</span>
                <input
                  className="bg-amber-50 border-b border-amber-200 outline-none px-1 font-mono"
                  value={settings.refNo || ''}
                  onChange={(e) => onSettingsEdit?.('refNo', e.target.value)}
                />
              </div>
              <div className="flex gap-2 items-center">
                <span className="w-24 font-semibold">Area Served :</span>
                <input
                  className="bg-amber-50 border-b border-amber-200 outline-none px-1 min-w-[220px]"
                  value={settings.location || ''}
                  onChange={(e) => onSettingsEdit?.('location', e.target.value)}
                />
              </div>
            </div>

            <table className="border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-gray-400 px-2 py-1 bg-gray-100" />
                  <th className="border border-gray-400 px-3 py-1 bg-gray-100 font-semibold">Specified</th>
                  <th className="border border-gray-400 px-3 py-1 bg-gray-100 font-semibold">Offered</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-400 px-2 py-1 font-semibold">Flow Rate (m³/s) :</td>
                  <td className="border border-gray-400 px-2 py-1 text-right bg-amber-50">
                    <input
                      type="number"
                      step="0.01"
                      className="w-16 text-right bg-transparent outline-none"
                      value={flowRate}
                      onChange={(e) => onSettingsEdit?.('flowRate', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right">{fmt(flowRate, 2)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 px-2 py-1 font-semibold">External Static Pressure (Pa) :</td>
                  <td className="border border-gray-400 px-2 py-1 text-right bg-amber-50">
                    <input
                      type="number"
                      className="w-16 text-right bg-transparent outline-none"
                      value={settings.specifiedEsp ?? 400}
                      onChange={(e) => onSettingsEdit?.('specifiedEsp', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right bg-amber-50">
                    <input
                      type="number"
                      className="w-16 text-right bg-transparent outline-none"
                      value={settings.offeredEsp ?? 450}
                      onChange={(e) => onSettingsEdit?.('offeredEsp', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Main calculation table */}
        <div className="overflow-x-auto border border-gray-500">
          <table className="border-collapse w-full min-w-[1100px]">
            <thead>
              <tr className="bg-[#d9e1f2]">
                {COLS.map((col) => (
                  <th
                    key={col.key}
                    className="border border-gray-500 px-1 py-1 text-[10px] font-bold text-center leading-tight align-bottom"
                    style={{ minWidth: col.width }}
                    title={col.formula || ''}
                  >
                    {col.label.split('\n').map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Suction header */}
              <tr className="bg-gray-100">
                <td colSpan={COLS.length} className="border border-gray-400 px-2 py-1 text-xs font-bold">
                  Suction
                </td>
              </tr>
              {suction.map((sec) => {
                const num = sectionNum;
                sectionNum += 1;
                return (
                  <SectionRow
                    key={sec.id}
                    sec={sec}
                    sectionNum={num}
                    flowRate={flowRate}
                    isSelected={selectedId === sec.id}
                    onSelect={setSelectedId}
                    onEdit={onSectionEdit}
                    selectedCell={selectedCell}
                    onSelectCell={handleSelectCell}
                  />
                );
              })}

              {/* Fan separator */}
              <tr className="bg-yellow-50">
                <td colSpan={COLS.length} className="border border-gray-400 px-2 py-1 text-xs font-bold">
                  Fan
                </td>
              </tr>

              {/* Discharge header */}
              <tr className="bg-gray-100">
                <td colSpan={COLS.length} className="border border-gray-400 px-2 py-1 text-xs font-bold">
                  Discharge
                </td>
              </tr>
              {discharge.map((sec) => {
                const num = sectionNum;
                sectionNum += 1;
                return (
                  <SectionRow
                    key={sec.id}
                    sec={sec}
                    sectionNum={num}
                    flowRate={flowRate}
                    isSelected={selectedId === sec.id}
                    onSelect={setSelectedId}
                    onEdit={onSectionEdit}
                    selectedCell={selectedCell}
                    onSelectCell={handleSelectCell}
                  />
                );
              })}

              {sections.length === 0 && (
                <tr>
                  <td colSpan={COLS.length} className="border border-gray-400 px-4 py-8 text-center text-gray-400 text-sm">
                    No duct sections yet — complete Steps 1 &amp; 2 first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mt-3">
          <table className="border-collapse text-xs">
            <tbody>
              <tr>
                <td className="border border-gray-400 px-3 py-1 font-semibold bg-gray-50">Total Pressure Loss</td>
                <td className="border border-gray-400 px-3 py-1 text-right font-mono bg-green-50 w-24">{fmt(totalLoss, 2)}</td>
              </tr>
              <tr>
                <td className="border border-gray-400 px-3 py-1 font-semibold bg-gray-50">Safety Factor : 20%</td>
                <td className="border border-gray-400 px-3 py-1 text-right font-mono bg-green-50">{fmt(safety, 2)}</td>
              </tr>
              <tr>
                <td className="border border-gray-400 px-3 py-1 font-bold bg-gray-100">Grand Total (Pa)</td>
                <td className="border border-gray-400 px-3 py-1 text-right font-mono font-bold bg-green-100">{fmt(grand, 2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Remarks / formulas from CSV */}
        <div className="mt-5 text-[11px] text-gray-700 leading-relaxed space-y-0.5 border-t border-gray-200 pt-3">
          <p className="font-semibold">Remarks :</p>
          <p>(1) * The Calculation Data are based on the ASHRAE Fundamentals Handbook</p>
          <p>(2) Velocity Pressure = 0.5 × Density of Air (1.2 kg/m³) × (Velocity of Air)²</p>
          <p>(3) Duct Friction Loss = Total Length × Friction factor</p>
          <p className="pl-4">Darcy Equation: Δpf = (1000fL/D) × (ρV²/2)</p>
          <p className="pl-4">Colebrook&apos;s Equation: 1/√f = -2 log [ε/(3.7D) + 2.51/(Re√f)]</p>
          <p className="pl-4">Hydraulic Diameter D = 1.30 (ab)^0.625 / [(a+b)^0.25]</p>
          <p className="pl-4">Re = 66.4DV</p>
          <p>(4) Fitting Friction Loss = Fitting Loss Coefficient × Velocity Pressure</p>
        </div>
      </div>
    </div>
  );
}
