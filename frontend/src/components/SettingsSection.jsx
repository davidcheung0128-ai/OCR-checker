import React from 'react';
import { Layers } from 'lucide-react';

export default function SettingsSection({ flowRate, setFlowRate, scaleRatio, setScaleRatio }) {
  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-md space-y-4">
      <h2 className="text-md font-semibold text-slate-200 mb-2 flex items-center gap-2">
        <Layers className="w-4 h-4 text-blue-400" /> 2. 系統與比例尺設定
      </h2>
      
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 mb-1">設計總風量 (m³/s)</label>
          <input 
            type="number" step="0.01" 
            value={flowRate} 
            onChange={(e) => setFlowRate(parseFloat(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1">比例尺校準 (mm/px)</label>
          <input 
            type="number" step="0.1" 
            value={scaleRatio} 
            onChange={(e) => setScaleRatio(parseFloat(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
}