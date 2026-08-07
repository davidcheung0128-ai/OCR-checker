import React from 'react';
import { Download, FileSpreadsheet, Calculator } from 'lucide-react';

export default function ExcelExportSection({
  parsedSections,
  flowRate,
  statusMessage,
  onExportExcel,
  exporting,
}) {
  const suctionCount = parsedSections.filter((s) => s.type === 'Suction').length;
  const dischargeCount = parsedSections.filter((s) => s.type === 'Discharge').length;
  const verifiedCount = parsedSections.filter((s) => s.manually_labeled).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30">
            <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Young's Standard Excel</h2>
            <p className="text-sm text-slate-400 mt-1">
              Generate the ESP calculation sheet with Darcy/Colebrook friction losses and ASHRAE
              fitting coefficients.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700">
            <p className="text-[10px] uppercase text-slate-500 tracking-wide">Sections</p>
            <p className="text-2xl font-bold text-white mt-1">{parsedSections.length}</p>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700">
            <p className="text-[10px] uppercase text-slate-500 tracking-wide">Suction</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{suctionCount}</p>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700">
            <p className="text-[10px] uppercase text-slate-500 tracking-wide">Discharge</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">{dischargeCount}</p>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700">
            <p className="text-[10px] uppercase text-slate-500 tracking-wide">Verified</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{verifiedCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-700 mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-300 mb-2">
            <Calculator className="w-4 h-4 text-blue-400" />
            <span className="font-medium">Calculation inputs</span>
          </div>
          <ul className="text-xs text-slate-400 space-y-1 ml-6 list-disc">
            <li>Design flow rate: <span className="text-white font-mono">{flowRate} m³/s</span></li>
            <li>Friction: Colebrook equation with ε = 0.15 mm roughness</li>
            <li>Fitting losses: ASHRAE coefficient lookup</li>
            <li>Output: Young's Engineering ESP Calculation template</li>
          </ul>
        </div>

        {parsedSections.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            Complete Step 1 and Step 3 first — at least one duct section is required.
          </div>
        ) : (
          <button
            type="button"
            onClick={onExportExcel}
            disabled={exporting}
            className="w-full px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-medium rounded-lg shadow-lg flex items-center justify-center gap-2 transition duration-200"
          >
            <Download className="w-5 h-5" />
            {exporting ? 'Generating Excel…' : "Download Young's Standard Excel"}
          </button>
        )}

        <p className="text-xs text-slate-500 mt-4 text-center">{statusMessage}</p>
      </div>
    </div>
  );
}
