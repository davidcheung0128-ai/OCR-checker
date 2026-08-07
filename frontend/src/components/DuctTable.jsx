import React from 'react';
import { RefreshCw, Square, CheckCircle2, Trash2, List } from 'lucide-react';

const ASHRAE_PRESETS = [
  'GRILLE',
  'CR9-4',
  'SILENCER_DEFAULT',
  'FLEX_DEFAULT',
  'SR4-1',
  'CR3-1',
  'CR3-6',
  'SR2-1',
  'ER1-1',
];

export default function DuctTable({
  analyzing,
  parsedSections,
  onFieldChange,
  selectedId,
  onSelectRow,
  drawMode,
  onStartDrawForSelected,
  onDeleteSelected,
  learnedCount = 0,
}) {
  return (
    <div className="fse-card flex flex-col h-full overflow-hidden">
      <div className="fse-card-header">
        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <List className="w-4 h-4 text-[#1e5a8a]" />
          Duct Section Details
        </h2>
        <div className="flex items-center gap-2">
          {parsedSections.length > 0 && (
            <span className="fse-badge-blue">{parsedSections.length} items</span>
          )}
          {analyzing && <RefreshCw className="w-4 h-4 text-[#1e5a8a] animate-spin" />}
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80 space-y-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onStartDrawForSelected}
            disabled={!selectedId}
            className="flex-1 fse-btn-secondary py-1.5 text-xs flex items-center justify-center gap-1 disabled:opacity-40"
          >
            <Square className="w-3 h-3" />
            Re-box #{selectedId || '—'}
          </button>
          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={!selectedId}
            className="fse-btn-danger flex items-center gap-1 disabled:opacity-40"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
        {learnedCount > 0 && (
          <p className="text-[10px] text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {learnedCount} matched from training data
          </p>
        )}
        {drawMode && (
          <p className="text-[10px] text-orange-600 font-medium">
            Draw mode — drag on the drawing to add a <strong>new</strong> component (use Re-box to replace the selected one)
          </p>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr className="text-gray-500 border-b border-gray-200">
              <th className="p-2.5 font-semibold">#</th>
              <th className="p-2.5 font-semibold">Type</th>
              <th className="p-2.5 font-semibold">Fitting / Run</th>
              <th className="p-2.5 font-semibold">a</th>
              <th className="p-2.5 font-semibold">b</th>
              <th className="p-2.5 font-semibold">L</th>
              <th className="p-2.5 font-semibold">ASHRAE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {parsedSections.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-10 text-center text-gray-400">
                  {analyzing
                    ? 'Detecting duct fittings…'
                    : 'No boxes yet. Use Draw to box fittings on the duct, then Save Training.'}
                </td>
              </tr>
            ) : (
              parsedSections.map((sec, idx) => {
                const isSelected = selectedId === sec.id;
                return (
                  <tr
                    key={sec.id}
                    onClick={() => onSelectRow?.(sec.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="p-2.5">
                      <span className="font-bold text-[#1e5a8a]">{sec.id}</span>
                      {sec.manually_labeled && <span className="ml-1 text-green-500 text-[9px]">✓</span>}
                      {sec.learned_from_training && !sec.manually_labeled && (
                        <span className="ml-1 text-amber-500 text-[9px]">★</span>
                      )}
                    </td>
                    <td className="p-2.5">
                      <select
                        value={sec.type || 'Suction'}
                        onChange={(e) => onFieldChange(idx, 'type', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border-0 outline-none cursor-pointer ${
                          sec.type === 'Discharge'
                            ? 'bg-cyan-100 text-cyan-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        <option value="Suction">Suction</option>
                        <option value="Discharge">Discharge</option>
                      </select>
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={sec.fitting_name}
                        onChange={(e) => onFieldChange(idx, 'fitting_name', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border-b border-gray-200 focus:border-[#1e5a8a] outline-none w-full text-gray-800"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        value={sec.a_mm}
                        onChange={(e) => onFieldChange(idx, 'a_mm', parseInt(e.target.value, 10))}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border-b border-gray-200 focus:border-[#1e5a8a] outline-none w-12 text-gray-800 font-mono"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        value={sec.b_mm}
                        onChange={(e) => onFieldChange(idx, 'b_mm', parseInt(e.target.value, 10))}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border-b border-gray-200 focus:border-[#1e5a8a] outline-none w-12 text-gray-800 font-mono"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        step="0.1"
                        value={sec.length_m}
                        onChange={(e) => onFieldChange(idx, 'length_m', parseFloat(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border-b border-gray-200 focus:border-[#1e5a8a] outline-none w-14 text-green-700 font-mono"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        list={`ashrae-presets-${sec.id}`}
                        value={sec.fitting_code || ''}
                        placeholder="—"
                        title="ASHRAE / fitting code (editable)"
                        onChange={(e) => onFieldChange(idx, 'fitting_code', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border-b border-gray-200 focus:border-[#1e5a8a] outline-none w-24 text-gray-700 font-mono"
                      />
                      <datalist id={`ashrae-presets-${sec.id}`}>
                        {ASHRAE_PRESETS.map((code) => (
                          <option key={code} value={code} />
                        ))}
                      </datalist>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
