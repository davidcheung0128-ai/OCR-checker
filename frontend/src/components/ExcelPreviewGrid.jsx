import React, { useMemo, useState } from 'react';
import { columnIndexToLabel } from '../utils/spreadsheetHelpers';

const VISIBLE_COLS = 24;
const PREVIEW_ROWS = 40;

export default function ExcelPreviewGrid({ sheetModel, onCellEdit }) {
  const [selected, setSelected] = useState(null);
  const [editValue, setEditValue] = useState('');

  const editableSet = useMemo(() => {
    const set = new Set();
    sheetModel?.editable?.forEach(({ r, c }) => set.add(`${r},${c}`));
    return set;
  }, [sheetModel]);

  const editableKeys = useMemo(() => {
    const map = {};
    sheetModel?.editable?.forEach(({ r, c, key }) => {
      map[`${r},${c}`] = key;
    });
    return map;
  }, [sheetModel]);

  if (!sheetModel) return null;

  const { rows, formulas } = sheetModel;
  const previewRows = rows.slice(0, PREVIEW_ROWS);

  const handleCellClick = (r, c, value) => {
    setSelected({ r, c });
    setEditValue(String(value ?? '').trim());
  };

  const commitEdit = () => {
    if (!selected) return;
    const key = editableKeys[`${selected.r},${selected.c}`];
    if (key) onCellEdit?.(key, editValue);
    setSelected(null);
  };

  const formulaText = selected
    ? formulas[`${selected.r},${selected.c}`] || (editableSet.has(`${selected.r},${selected.c}`) ? 'Editable input — changes recalculate physics columns' : 'Read-only calculated cell')
    : 'Select a cell to view formula or edit value';

  const cellLabel = selected
    ? `${columnIndexToLabel(selected.c)}${selected.r + 1}`
    : '';

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-700 bg-slate-800 flex items-center gap-3 text-xs shrink-0">
        <span className="font-mono text-blue-400 w-10">{cellLabel}</span>
        <span className="text-slate-400 flex-1 truncate">{formulaText}</span>
        {selected && editableSet.has(`${selected.r},${selected.c}`) && (
          <div className="flex items-center gap-2">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
              className="w-32 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white font-mono"
            />
            <button type="button" onClick={commitEdit} className="px-2 py-1 bg-blue-600 rounded text-white hover:bg-blue-500">
              Apply
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-[10px] font-mono min-w-max">
          <thead className="sticky top-0 z-10 bg-slate-700">
            <tr>
              <th className="w-8 border border-slate-600 bg-slate-800 text-slate-500 p-1" />
              {Array.from({ length: VISIBLE_COLS }, (_, i) => (
                <th key={i} className="border border-slate-600 px-1 py-0.5 text-slate-400 min-w-[52px]">
                  {columnIndexToLabel(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, r) => (
              <tr key={r} className={r >= 10 && r <= 35 ? 'bg-slate-900/80' : ''}>
                <td className="border border-slate-700 bg-slate-800 text-slate-500 text-center p-0.5 sticky left-0">
                  {r + 1}
                </td>
                {Array.from({ length: VISIBLE_COLS }, (_, c) => {
                  const val = row[c] ?? '';
                  const isEditable = editableSet.has(`${r},${c}`);
                  const isSelected = selected?.r === r && selected?.c === c;
                  const isCalc = !isEditable && val && r >= 14 && c >= 12 && c <= 21;

                  return (
                    <td
                      key={c}
                      onClick={() => handleCellClick(r, c, val)}
                      className={`border border-slate-700/80 px-1 py-0.5 max-w-[90px] truncate cursor-cell ${
                        isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-900/40' : ''
                      } ${isEditable ? 'bg-amber-900/20 text-amber-100' : isCalc ? 'bg-emerald-900/10 text-emerald-200' : 'text-slate-300'}`}
                      title={String(val)}
                    >
                      {String(val).replace(/\n/g, ' ')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
