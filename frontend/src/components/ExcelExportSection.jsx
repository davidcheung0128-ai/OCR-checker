import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import ExcelPreviewGrid from './ExcelPreviewGrid';
import {
  parsePdfFilename,
  getCalculateFilenames,
  buildSheetModel,
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

  const [localSections, setLocalSections] = useState(parsedSections);
  const [settings, setSettings] = useState({
    flowRate,
    refNo: fileMeta.refNo,
    floor: fileMeta.floor,
    location: fileMeta.location,
    projectName: 'Dedicated Rehousing at Ma Tau Kok',
    specifiedEsp: 400,
    offeredEsp: 450,
  });

  useEffect(() => {
    setLocalSections(parsedSections);
  }, [parsedSections]);

  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      flowRate,
      refNo: fileMeta.refNo,
      floor: fileMeta.floor,
      location: fileMeta.location,
    }));
  }, [flowRate, fileMeta]);

  const handleSectionEdit = (id, field, value) => {
    const updated = localSections.map((s) =>
      s.id === id ? { ...s, [field]: value } : s,
    );
    setLocalSections(updated);
    onSectionsChange?.(updated);
  };

  const handleSettingsEdit = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'flowRate') onFlowRateChange?.(value);
      return next;
    });
  };

  const handleDownloadTemplate = () => {
    const emptyModel = buildSheetModel([], {
      flowRate: 0,
      refNo: settings.refNo,
      floor: settings.floor,
      location: '',
    });
    downloadCsv(getCalculateFilenames(fileMeta, false).template, sheetToCsv(emptyModel.rows));
    onStatusChange?.(`Downloaded template: ${getCalculateFilenames(fileMeta, false).template}`);
  };

  const handleDownloadFilled = () => {
    const model = buildSheetModel(localSections, settings);
    downloadCsv(filenames.filled, sheetToCsv(model.rows));
    onStatusChange?.(`Downloaded: ${filenames.filled}`);
  };

  return (
    <div className="h-full flex flex-col gap-4 min-h-[calc(100vh-9rem)]">
      <div className="fse-card p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
            <FileSpreadsheet className="w-5 h-5 text-[#1e5a8a]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="fse-badge-blue font-mono">{filenames.filled}</span>
              {fileName && <span className="text-xs text-gray-400">from {fileName}</span>}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Young&apos;s ESP Calculate Sheet — editable preview</p>
          </div>
        </div>
        <div className="flex gap-2">
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
            Download {filenames.filled}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[520px] fse-card overflow-hidden">
        <ExcelPreviewGrid
          sections={localSections}
          settings={settings}
          onSectionEdit={handleSectionEdit}
          onSettingsEdit={handleSettingsEdit}
        />
      </div>

      {statusMessage && <p className="text-xs text-gray-400 shrink-0">{statusMessage}</p>}
    </div>
  );
}
