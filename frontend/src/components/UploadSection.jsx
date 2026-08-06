import React from 'react';
import { Upload, FileText } from 'lucide-react';

export default function UploadSection({ file, fileInputRef, onFileUpload, analyzing }) {
  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-md h-full">
      <h2 className="text-md font-semibold text-slate-200 mb-4 flex items-center gap-2">
        <Upload className="w-4 h-4 text-blue-400" /> Upload Engineering Drawing
      </h2>

      <div
        onClick={() => !analyzing && fileInputRef.current?.click()}
        className={`border-2 border-dashed border-slate-600 hover:border-blue-500 bg-slate-800/50 hover:bg-slate-800 p-8 rounded-lg text-center transition duration-200 ${
          analyzing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-sm text-slate-300 font-medium">Click to upload or drag a 2D HVAC PDF here</p>
        <p className="text-xs text-slate-500 mt-1">Supports Vector PDF / PNG</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={onFileUpload}
          disabled={analyzing}
        />
      </div>

      {file && (
        <div className="mt-4 p-3 bg-slate-700/50 rounded-lg text-xs text-slate-300 flex justify-between items-center">
          <span className="truncate">{file.name}</span>
          <span className="text-emerald-400 font-medium shrink-0 ml-2">
            {analyzing ? 'Analyzing…' : 'Loaded'}
          </span>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500 leading-relaxed">
        After upload, the drawing preview appears on the right. AI parsing runs automatically and
        detected duct components will be available in Step 3.
      </p>
    </div>
  );
}
