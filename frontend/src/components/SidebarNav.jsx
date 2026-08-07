import React from 'react';
import { Upload, Layers, CheckCircle, FileSpreadsheet } from 'lucide-react';

const STEPS = [
  { id: 1, label: '上傳圖紙', sublabel: 'Upload PDF', icon: Upload },
  { id: 2, label: '系統設定', sublabel: 'Settings', icon: Layers },
  { id: 3, label: '組件明細', sublabel: 'Label & Review', icon: CheckCircle },
  { id: 4, label: '標準 Excel', sublabel: 'Export Report', icon: FileSpreadsheet },
];

export default function SidebarNav({ activeStep, onStepChange }) {
  return (
    <nav className="w-56 shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col">
      <div className="px-4 py-5 border-b border-slate-700">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Workflow</p>
        <p className="text-sm text-slate-300 mt-0.5">Step-by-step guide</p>
      </div>

      <ul className="flex-1 p-3 space-y-1">
        {STEPS.map(({ id, label, sublabel, icon: Icon }) => {
          const isActive = activeStep === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onStepChange(id)}
                className={`w-full text-left px-3 py-3 rounded-lg flex items-start gap-3 transition duration-150 ${
                  isActive
                    ? 'bg-blue-600/20 border border-blue-500/50 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold shrink-0 ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {id}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-tight">{label}</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">{sublabel}</span>
                </span>
                <Icon className={`w-4 h-4 ml-auto shrink-0 mt-0.5 ${isActive ? 'text-blue-400' : 'text-slate-600'}`} />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
