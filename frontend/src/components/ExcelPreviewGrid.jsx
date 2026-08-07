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
    ? formulas[`${selected.r},${selected.c}`] ||
      (editableSet.has(`${selected.r},${selected.c}`)
        ? 'Editable — changes recalculate physics columns'
        : 'Read-only calculated cell')
    : 'Select a cell to view formula or edit';

  const cellLabel = selected ? `${columnIndexToLabel(selected.c)}${selected.r + 1}` : '';

  return (
    <div className="flex flex-col h-full min-h-0 bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center gap-3 text-xs shrink-0">
        <span className="font-mono text-[#1e5a8a] font-bold w-10">{cellLabel}</span>
        <span className="text-gray-500 flex-1 truncate">{formulaText}</span>
        {selected && editableSet.has(`${selected.r},${selected.c}`) && (
          <div className="flex items-center gap-2">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
              className="w-32 fse-input py-1 text-xs font-mono"
            />
            <button type="button" onClick={commitEdit} className="fse-btn-primary py-1 px-2 text-xs">
              Apply
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-[10px] font-mono min-w-max">
          <thead className="sticky top-0 z-10 bg-gray-100">
            <tr>
              <th className="w-8 border border-gray-300 bg-gray-200 text-gray-500 p-1" />
              {Array.from({ length: VISIBLE_COLS }, (_, i) => (
                <th key={i} className="border border-gray-300 px-1 py-0.5 text-gray-600 min-w-[52px] font-semibold">
                  {columnIndexToLabel(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, r) => (
              <tr key={r}>
                <td className="border border-gray-200 bg-gray-100 text-gray-500 text-center p-0.5 sticky left-0 font-semibold">
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
                      className={`border border-gray-200 px-1 py-0.5 max-w-[90px] truncate cursor-cell ${
                        isSelected ? 'ring-2 ring-[#1e5a8a] ring-inset bg-blue-50' : ''
                      } ${isEditable ? 'bg-amber-50 text-amber-900' : isCalc ? 'bg-green-50 text-green-800' : 'text-gray-700 bg-white'}`}
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
