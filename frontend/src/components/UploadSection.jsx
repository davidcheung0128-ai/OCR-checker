import React from 'react';
import { Upload, FileText } from 'lucide-react';

export default function UploadSection({ file, fileInputRef, onFileUpload }) {
  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-md">
      <h2 className="text-md font-semibold text-slate-200 mb-4 flex items-center gap-2">
        <Upload className="w-4 h-4 text-blue-400" /> 1. 上傳工程圖紙 (PDF)
      </h2>
      
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-600 hover:border-blue-500 bg-slate-800/50 hover:bg-slate-800 p-8 rounded-lg cursor-pointer text-center transition duration-200"
      >
        <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-sm text-slate-300 font-medium">點擊上傳或將 2D HVAC PDF 拖曳至此</p>
        <p className="text-xs text-slate-500 mt-1">支援 Vector PDF / PNG 格式</p>
        <input ref={fileInputRef} type="file" accept=".pdf,.png" className="hidden" onChange={onFileUpload} />
      </div>

      {file && (
        <div className="mt-4 p-3 bg-slate-700/50 rounded-lg text-xs text-slate-300 flex justify-between items-center">
          <span className="truncate max-w-[200px]">{file.name}</span>
          <span className="text-emerald-400 font-medium">已載入</span>
        </div>
      )}
    </div>
  );
}