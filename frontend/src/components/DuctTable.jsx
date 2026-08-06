import React from 'react';
import { CheckCircle, RefreshCw, Download } from 'lucide-react';

export default function DuctTable({ analyzing, parsedSections, onFieldChange, statusMessage, onExportExcel }) {
  return (
    <section className="lg:col-span-7 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-md flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-md font-semibold text-slate-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" /> 3. 風管管路組件與壓降試算明細
          </h2>
          {analyzing && <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-700/60 text-slate-300 border-b border-slate-600">
                <th className="p-2">#</th>
                <th className="p-2">類型</th>
                <th className="p-2">配件/管段名稱</th>
                <th className="p-2">寬 a(mm)</th>
                <th className="p-2">高 b(mm)</th>
                <th className="p-2">長度 L(m)</th>
                <th className="p-2">ASHRAE 代碼</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 font-mono">
              {parsedSections.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500 font-sans">
                    尚無數據，請先在上傳區域載入圖紙檔。
                  </td>
                </tr>
              ) : (
                parsedSections.map((sec, idx) => (
                  <tr key={sec.id} className="hover:bg-slate-700/30">
                    <td className="p-2 font-bold text-blue-400">{sec.id}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${sec.type === 'Suction' ? 'bg-amber-900/50 text-amber-300' : 'bg-cyan-900/50 text-cyan-300'}`}>
                        {sec.type}
                      </span>
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" value={sec.fitting_name} 
                        onChange={(e) => onFieldChange(idx, 'fitting_name', e.target.value)}
                        className="bg-transparent border-b border-slate-600 focus:border-blue-400 outline-none w-full text-slate-200"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" value={sec.a_mm} 
                        onChange={(e) => onFieldChange(idx, 'a_mm', parseInt(e.target.value))}
                        className="bg-transparent border-b border-slate-600 focus:border-blue-400 outline-none w-12 text-slate-200"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" value={sec.b_mm} 
                        onChange={(e) => onFieldChange(idx, 'b_mm', parseInt(e.target.value))}
                        className="bg-transparent border-b border-slate-600 focus:border-blue-400 outline-none w-12 text-slate-200"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" step="0.1" value={sec.length_m} 
                        onChange={(e) => onFieldChange(idx, 'length_m', parseFloat(e.target.value))}
                        className="bg-transparent border-b border-slate-600 focus:border-blue-400 outline-none w-14 text-emerald-400"
                      />
                    </td>
                    <td className="p-2 text-slate-400">{sec.fitting_code || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-xs text-slate-400 truncate max-w-md">
          <span className="font-semibold text-slate-300">狀態：</span> {statusMessage}
        </div>

        <button
          onClick={onExportExcel}
          disabled={parsedSections.length === 0}
          className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-medium text-xs rounded-lg shadow-md flex items-center justify-center gap-2 transition duration-200"
        >
          <Download className="w-4 h-4" /> 下載 Young's Standard Excel
        </button>
      </div>
    </section>
  );
}