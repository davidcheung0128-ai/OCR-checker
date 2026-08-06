import React from 'react';
import { Layers } from 'lucide-react';

export default function SettingsSection({ flowRate, setFlowRate, scaleRatio, setScaleRatio }) {
  return (
    <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-md max-w-xl w-full">
      <h2 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
        <Layers className="w-5 h-5 text-blue-400" /> System & Scale Settings
      </h2>

      <div className="space-y-6 text-sm">
        <div>
          <label className="block text-slate-400 mb-2">Design total airflow (m³/s)</label>
          <input
            type="number"
            step="0.01"
            value={flowRate}
            onChange={(e) => setFlowRate(parseFloat(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white font-mono focus:border-blue-500 outline-none"
          />
          <p className="text-xs text-slate-500 mt-1.5">Used for velocity and Darcy/Colebrook pressure drop calculations.</p>
        </div>

        <div>
          <label className="block text-slate-400 mb-2">Scale calibration (mm/px)</label>
          <input
            type="number"
            step="0.1"
            value={scaleRatio}
            onChange={(e) => setScaleRatio(parseFloat(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white font-mono focus:border-blue-500 outline-none"
          />
          <p className="text-xs text-slate-500 mt-1.5">Converts drawing pixel measurements to real-world millimetres.</p>
        </div>
      </div>
    </div>
  );
}
