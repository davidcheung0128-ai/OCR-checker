import React from 'react';

export default function Header() {
  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center shadow-lg">
      <div className="flex items-center space-x-3">
        <div className="bg-blue-600 text-white p-2 rounded-lg font-bold text-xl">FSEE</div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide">AI HVAC Duct Pressure Drop Calculator</h1>
          <p className="text-xs text-slate-400">Young's Engineering Company Standard Compliant</p>
        </div>
      </div>
      <div className="text-xs bg-slate-700 px-3 py-1.5 rounded-full text-blue-300 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        VLLM & MinerU Online
      </div>
    </header>
  );
}