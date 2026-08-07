import React from 'react';
import { Upload, Tag, FileSpreadsheet, RefreshCw } from 'lucide-react';

export const NAV_STEPS = [
  { id: 1, label: '上傳圖紙', sublabel: 'Upload Drawing', icon: Upload },
  { id: 2, label: '組件標註', sublabel: 'Label & Review', icon: Tag },
  { id: 3, label: '試算表匯出', sublabel: 'Calculate Export', icon: FileSpreadsheet },
];

export const PAGE_TITLES = {
  1: { title: '上傳圖紙 Upload Drawing', icon: Upload },
  2: { title: '組件標註 Label & Review', icon: Tag },
  3: { title: '試算表匯出 Calculate Export', icon: FileSpreadsheet },
};

export default function SidebarNav({ activeStep, onStepChange, statusMessage }) {
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col shadow-sm">
      {/* Logo — official FSE Engineering Group Ltd mark */}
      <div className="px-4 py-4 border-b border-gray-100">
        <img
          src="/fse-logo.png"
          alt="FSE Engineering Group Ltd · 豐盛機電工程集團有限公司"
          className="w-full h-auto object-contain"
        />
        <p className="text-[10px] text-gray-400 mt-2 leading-snug">
          AI HVAC Duct Pressure Drop Calculator
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_STEPS.map(({ id, label, sublabel, icon: Icon }) => {
          const isActive = activeStep === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onStepChange(id)}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-150 ${
                isActive
                  ? 'bg-blue-50 text-[#1e5a8a] border border-blue-100 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 border border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#1e5a8a]' : 'text-gray-400'}`} />
              <span className="min-w-0">
                <span className={`block text-sm font-medium leading-tight ${isActive ? 'text-[#1e5a8a]' : 'text-gray-700'}`}>
                  {label}
                </span>
                <span className="block text-[10px] text-gray-400 mt-0.5">{sublabel}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Status footer */}
      <div className="p-4 border-t border-gray-100 space-y-3">
        <div className="fse-card p-3 bg-gray-50">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-gray-700">System Online</span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed">VLLM & MinerU connected</p>
        </div>
        {statusMessage && (
          <p className="text-[10px] text-gray-400 line-clamp-3 leading-relaxed">{statusMessage}</p>
        )}
      </div>
    </aside>
  );
}

export function PageHeader({ activeStep, onRefresh, refreshing }) {
  const page = PAGE_TITLES[activeStep] || PAGE_TITLES[1];
  const Icon = page.icon;

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
      <div className="w-40" />
      <div className="flex items-center gap-2.5">
        <Icon className="w-5 h-5 text-[#1e5a8a]" />
        <h1 className="text-base font-bold text-gray-800">{page.title}</h1>
      </div>
      <div className="w-40 flex justify-end">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="fse-btn-secondary flex items-center gap-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>
    </header>
  );
}
