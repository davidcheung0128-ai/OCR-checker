import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
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
    onStatusChange?.('Sheet updated — values recalculated.');
  };

  const handleDownloadTemplate = () => {
    const emptyModel = buildSheetModel([], {
      flowRate: 0,
      refNo: fileMeta.refNo,
      floor: fileMeta.floor,
      location: '',
    });
    downloadCsv(getCalculateFilenames(fileMeta, false).template, sheetToCsv(emptyModel.rows));
    onStatusChange?.(`Downloaded template: ${getCalculateFilenames(fileMeta, false).template}`);
  };

  const handleDownloadFilled = () => {
    if (!sheetModel) return;
    downloadCsv(filenames.filled, sheetToCsv(sheetModel.rows));
    onStatusChange?.(`Downloaded: ${filenames.filled}`);
  };

  const verifiedCount = localSections.filter((s) => s.manually_labeled).length;

  return (
    <div className="h-full flex flex-col gap-4 min-h-[calc(100vh-9rem)]">
      {/* Summary card — FSE order-card style */}
      <div className="fse-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100">
              <FileSpreadsheet className="w-6 h-6 text-[#1e5a8a]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="fse-badge-blue font-mono">{filenames.filled}</span>
                {fileName && <span className="text-xs text-gray-400">from {fileName}</span>}
              </div>
              <p className="text-sm text-gray-600 mt-1">Young's Standard ESP Calculate Sheet</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleDownloadTemplate} className="fse-btn-secondary text-xs">
              Template (.csv)
            </button>
            <button
              type="button"
              onClick={handleDownloadFilled}
              disabled={localSections.length === 0}
              className="fse-btn-orange flex items-center gap-2 text-xs disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              Download CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-gray-100">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-[10px] text-gray-500 uppercase font-medium">Floor / Ref</p>
            <p className="text-sm font-mono text-gray-800 mt-1">{fileMeta.floor} · {fileMeta.refNo}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-[10px] text-gray-500 uppercase font-medium">Sections</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{localSections.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-[10px] text-gray-500 uppercase font-medium">Total ΔP</p>
            <p className="text-xl font-bold text-green-600 mt-1">
              {sheetModel?.totals?.grand?.toFixed(2) ?? '—'} Pa
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-[10px] text-gray-500 uppercase font-medium">Verified</p>
            <p className="text-xl font-bold text-orange-500 mt-1">{verifiedCount}</p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 shrink-0">
        <span className="text-amber-600 font-medium">Amber</span> = editable ·{' '}
        <span className="text-green-600 font-medium">Green</span> = auto-calculated · Click a cell to edit
      </p>

      <div className="flex-1 min-h-[400px] fse-card overflow-hidden">
        {localSections.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm p-8">
            Complete Steps 1 & 2 first — duct sections are required.
          </div>
        ) : (
          <ExcelPreviewGrid sheetModel={sheetModel} onCellEdit={handleCellEdit} />
        )}
      </div>

      {statusMessage && (
        <p className="text-xs text-gray-400 shrink-0">{statusMessage}</p>
      )}
    </div>
  );
}
