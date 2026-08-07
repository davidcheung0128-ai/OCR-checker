import React from 'react';
import { RefreshCw, Square, CheckCircle2, Trash2 } from 'lucide-react';

export default function DuctTable({
  analyzing,
  parsedSections,
  onFieldChange,
  statusMessage,
  selectedId,
  onSelectRow,
  drawMode,
  onStartDrawForSelected,
  onDeleteSelected,
  learnedCount = 0,
}) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-md flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-200">Duct Section Details</h2>
        {analyzing && <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />}
      </div>

      <div className="px-4 py-2 border-b border-slate-700/60 bg-slate-800/50 space-y-2">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          AI boxes may be wrong. Select a row, click <strong className="text-emerald-400">Re-box</strong>, then
          draw the correct area. Or use <strong className="text-emerald-400">Draw Box</strong> to add a new component.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onStartDrawForSelected}
            disabled={!selectedId}
            className="flex-1 px-2 py-1.5 text-[11px] rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 flex items-center justify-center gap-1"
          >
            <Square className="w-3 h-3" />
            Re-box #{selectedId || '—'}
          </button>
          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={!selectedId}
            className="px-2 py-1.5 text-[11px] rounded-lg bg-red-900/40 hover:bg-red-900/60 disabled:opacity-40 text-red-300 flex items-center justify-center gap-1 border border-red-800/50"
            title="Delete wrong label box"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
        {learnedCount > 0 && (
          <p className="text-[10px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {learnedCount} component(s) matched from saved training data
          </p>
        )}
        {drawMode && (
          <p className="text-[10px] text-emerald-300 animate-pulse">Draw mode active — drag on the drawing</p>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-700/90 text-slate-300 border-b border-slate-600">
              <th className="p-2">#</th>
              <th className="p-2">Type</th>
              <th className="p-2">Fitting / Run</th>
              <th className="p-2">a</th>
              <th className="p-2">b</th>
              <th className="p-2">L</th>
              <th className="p-2">ASHRAE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50 font-mono">
            {parsedSections.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-500 font-sans">
                  No data yet. Upload a drawing in Step 1 first.
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
                      isSelected ? 'bg-blue-900/30 ring-1 ring-inset ring-blue-500/40' : 'hover:bg-slate-700/30'
                    }`}
                  >
                    <td className="p-2">
                      <span className="font-bold text-blue-400">{sec.id}</span>
                      {sec.manually_labeled && (
                        <span className="ml-1 text-[9px] text-emerald-400" title="Manually verified">✓</span>
                      )}
                      {sec.learned_from_training && !sec.manually_labeled && (
                        <span className="ml-1 text-[9px] text-amber-400" title="From training">★</span>
                      )}
                    </td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          sec.type === 'Suction'
                            ? 'bg-amber-900/50 text-amber-300'
                            : 'bg-cyan-900/50 text-cyan-300'
                        }`}
                      >
                        {sec.type}
                      </span>
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={sec.fitting_name}
                        onChange={(e) => onFieldChange(idx, 'fitting_name', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border-b border-slate-600 focus:border-blue-400 outline-none w-full text-slate-200"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={sec.a_mm}
                        onChange={(e) => onFieldChange(idx, 'a_mm', parseInt(e.target.value, 10))}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border-b border-slate-600 focus:border-blue-400 outline-none w-12 text-slate-200"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={sec.b_mm}
                        onChange={(e) => onFieldChange(idx, 'b_mm', parseInt(e.target.value, 10))}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border-b border-slate-600 focus:border-blue-400 outline-none w-12 text-slate-200"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.1"
                        value={sec.length_m}
                        onChange={(e) => onFieldChange(idx, 'length_m', parseFloat(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border-b border-slate-600 focus:border-blue-400 outline-none w-14 text-emerald-400"
                      />
                    </td>
                    <td className="p-2 text-slate-400">{sec.fitting_code || '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-700">
        <div className="text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Status: </span>
          {statusMessage}
        </div>
      </div>
    </div>
  );
}
