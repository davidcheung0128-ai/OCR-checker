import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

export default function SettingsBar({ flowRate, setFlowRate, scaleRatio, setScaleRatio, compact = false }) {
  if (compact) {
    return (
      <div className="fse-card px-4 py-3 flex flex-wrap items-end gap-4">
        <SlidersHorizontal className="w-4 h-4 text-[#1e5a8a] shrink-0 mb-2" />
        <div className="flex-1 min-w-[120px]">
          <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Flow (m³/s)</label>
          <input
            type="number"
            step="0.01"
            value={flowRate}
            onChange={(e) => setFlowRate(parseFloat(e.target.value))}
            className="fse-input py-1.5 text-sm font-mono mt-0.5"
          />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Scale (mm/px)</label>
          <input
            type="number"
            step="0.1"
            value={scaleRatio}
            onChange={(e) => setScaleRatio(parseFloat(e.target.value))}
            className="fse-input py-1.5 text-sm font-mono mt-0.5"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fse-card p-6 max-w-lg w-full">
      <h2 className="text-sm font-bold text-gray-800 mb-5 flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4 text-[#1e5a8a]" />
        System Settings
      </h2>
      <div className="space-y-5">
        <div>
          <label className="fse-label">Design total airflow (m³/s)</label>
          <input
            type="number"
            step="0.01"
            value={flowRate}
            onChange={(e) => setFlowRate(parseFloat(e.target.value))}
            className="fse-input font-mono"
          />
        </div>
        <div>
          <label className="fse-label">Scale calibration (mm/px)</label>
          <input
            type="number"
            step="0.1"
            value={scaleRatio}
            onChange={(e) => setScaleRatio(parseFloat(e.target.value))}
            className="fse-input font-mono"
          />
        </div>
      </div>
    </div>
  );
}
