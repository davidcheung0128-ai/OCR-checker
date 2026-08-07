import React from 'react';
import { Upload, FileText } from 'lucide-react';

export default function UploadSection({ file, fileInputRef, onFileUpload, analyzing }) {
  return (
    <div className="fse-card p-6 h-full flex flex-col">
      <div className="fse-card-header -mx-6 -mt-6 mb-5">
        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <Upload className="w-4 h-4 text-[#1e5a8a]" />
          Upload Engineering Drawing
        </h2>
        {file && (
          <span className={`fse-badge-${analyzing ? 'orange' : 'green'}`}>
            {analyzing ? 'Analyzing…' : 'Loaded'}
          </span>
        )}
      </div>

      <div
        onClick={() => !analyzing && fileInputRef.current?.click()}
        className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition duration-200 min-h-[200px] ${
          analyzing
            ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
            : 'border-gray-300 hover:border-[#1e5a8a] hover:bg-blue-50/30 cursor-pointer bg-gray-50/50'
        }`}
      >
        <FileText className="w-14 h-14 text-gray-300 mb-4" />
        <p className="text-sm text-gray-700 font-medium">Click to upload or drag a 2D HVAC PDF here</p>
        <p className="text-xs text-gray-400 mt-1">Supports Vector PDF / PNG</p>
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
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-gray-700 flex justify-between items-center">
          <span className="truncate font-medium">{file.name}</span>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500 leading-relaxed">
        After upload, preview appears on the right. AI parsing runs automatically — review labels in Step 2.
      </p>
    </div>
  );
}
