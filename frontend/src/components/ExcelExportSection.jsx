import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import ExcelPreviewGrid from './ExcelPreviewGrid';
import {
  parsePdfFilename,
  getCalculateFilenames,
  buildSheetModel,
  applySheetEdit,
  sheetToCsv,
  downloadCsv,
} from '../utils/calculateSheet';

export default function ExcelExportSection({
  parsedSections,
  flowRate,
  fileName,
  onSectionsChange,
  onFlowRateChange,
  statusMessage,
  onStatusChange,
}) {
  const fileMeta = useMemo(() => parsePdfFilename(fileName || ''), [fileName]);
  const filenames = useMemo(() => getCalculateFilenames(fileMeta, true), [fileMeta]);

  const [sheetModel, setSheetModel] = useState(null);
  const [localSections, setLocalSections] = useState(parsedSections);

  useEffect(() => {
    setLocalSections(parsedSections);
  }, [parsedSections]);

  useEffect(() => {
    const model = buildSheetModel(localSections, {
      flowRate,
      refNo: fileMeta.refNo,
      floor: fileMeta.floor,
      location: fileMeta.location,
    });
    setSheetModel(model);
  }, [localSections, flowRate, fileMeta]);

  const handleCellEdit = (key, value) => {
    const result = applySheetEdit(sheetModel, localSections, key, value);
    setSheetModel(result.sheetModel);
    setLocalSections(result.sections);
    onSectionsChange?.(result.sections);
    if (key === 'flowRate' || key === 'flowRateOffered') {
      onFlowRateChange?.(result.settings.flowRate);
    }
    onStatusChange?.('Sheet updated — calculated columns recalculated.');
  };

  const handleDownloadTemplate = () => {
    const emptyModel = buildSheetModel([], {
      flowRate: 0,
      refNo: fileMeta.refNo,
      floor: fileMeta.floor,
      location: '',
    });
    downloadCsv(getCalculateFilenames(fileMeta, false).template, sheetToCsv(emptyModel.rows));
    onStatusChange?.(`Downloaded empty template: ${getCalculateFilenames(fileMeta, false).template}`);
  };

  const handleDownloadFilled = () => {
    if (!sheetModel) return;
    downloadCsv(filenames.filled, sheetToCsv(sheetModel.rows));
    onStatusChange?.(`Downloaded filled calculation: ${filenames.filled}`);
  };

  const verifiedCount = localSections.filter((s) => s.manually_labeled).length;

  return (
    <div className="h-full flex flex-col gap-4 min-h-[calc(100vh-8rem)]">
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Young's Standard Calculate Sheet</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Preview & edit · Output: <span className="font-mono text-emerald-300">{filenames.filled}</span>
              {fileName && (
                <span className="text-slate-500"> · from {fileName}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-2 text-xs rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Template (.csv)
          </button>
          <button
            type="button"
            onClick={handleDownloadFilled}
            disabled={localSections.length === 0}
            className="px-4 py-2 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download {filenames.filled}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
          <p className="text-[10px] text-slate-500 uppercase">Floor / Ref</p>
          <p className="text-sm font-mono text-white mt-1">{fileMeta.floor} · {fileMeta.refNo}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
          <p className="text-[10px] text-slate-500 uppercase">Sections</p>
          <p className="text-xl font-bold text-white mt-1">{localSections.length}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
          <p className="text-[10px] text-slate-500 uppercase">Total ΔP</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">
            {sheetModel?.totals?.grand?.toFixed(2) ?? '—'} Pa
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
          <p className="text-[10px] text-slate-500 uppercase">Verified labels</p>
          <p className="text-xl font-bold text-amber-400 mt-1">{verifiedCount}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
        <RefreshCw className="w-3 h-3" />
        <span>
          <span className="text-amber-300">Amber cells</span> = editable inputs ·{' '}
          <span className="text-emerald-300">Green cells</span> = auto-calculated (D, Re, V, ΔP) ·
          Click a cell to edit or view formula
        </span>
      </div>

      <div className="flex-1 min-h-[400px]">
        {localSections.length === 0 ? (
          <div className="h-full flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 text-slate-500 text-sm">
            Complete Step 1 and Step 3 first — duct sections are required to populate the sheet.
          </div>
        ) : (
          <ExcelPreviewGrid sheetModel={sheetModel} onCellEdit={handleCellEdit} />
        )}
      </div>

      <p className="text-xs text-slate-500 shrink-0">{statusMessage}</p>
    </div>
  );
}
