import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Header from './Header';
import SidebarNav from './SidebarNav';
import UploadSection from './UploadSection';
import SettingsSection from './SettingsSection';
import DuctTable from './DuctTable';
import DocumentPreview from './DocumentPreview';
import LabelDialog from './LabelDialog';
import ExcelExportSection from './ExcelExportSection';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  const [activeStep, setActiveStep] = useState(1);
  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [parsedSections, setParsedSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [flowRate, setFlowRate] = useState(0.25);
  const [scaleRatio, setScaleRatio] = useState(1.0);
  const [statusMessage, setStatusMessage] = useState('Ready — upload a PDF drawing in Step 1.');
  const [drawMode, setDrawMode] = useState(false);
  const [reboxTargetId, setReboxTargetId] = useState(null);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [pendingBbox, setPendingBbox] = useState(null);
  const [isNewBox, setIsNewBox] = useState(false);
  const [savingLabel, setSavingLabel] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [learnedCount, setLearnedCount] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const annotations = useMemo(
    () =>
      parsedSections.map((sec) => ({
        id: sec.id,
        type: sec.type,
        label: sec.fitting_name,
        bbox: sec.bbox,
        manually_labeled: sec.manually_labeled,
      })),
    [parsedSections],
  );

  const selectedSection = parsedSections.find((s) => s.id === selectedSectionId);

  const saveFeedback = async (section, labelData, bbox) => {
    await axios.post(`${API_BASE_URL}/api/feedback`, {
      filename: file?.name || 'unknown.pdf',
      original: section?.fitting_name || 'Unknown',
      corrected: labelData.fitting_name,
      bbox,
      section_type: labelData.type,
      fitting_code: labelData.fitting_code,
      section_id: section?.id ?? null,
    });
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setAnalyzing(true);
    setActiveStep(1);
    setStatusMessage('Sending to FSEE MinerU and VLLM for drawing analysis…');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const sections = data.sections || [];
      setParsedSections(sections);
      setSelectedSectionId(sections[0]?.id ?? null);
      setLearnedCount(data.learned_labels_applied || 0);

      const learnedMsg =
        data.learned_labels_applied > 0
          ? ` ${data.learned_labels_applied} component(s) matched from saved training.`
          : '';
      setStatusMessage(`Analysis complete — review and correct labels in Step 3.${learnedMsg}`);
    } catch (err) {
      console.error(err);
      setStatusMessage(`Analysis failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFieldChange = (index, field, value) => {
    const updated = [...parsedSections];
    updated[index][field] = value;
    setParsedSections(updated);
  };

  const handleBoxDrawn = useCallback((bbox) => {
    setPendingBbox(bbox);
    setDrawMode(false);
    const targetId = reboxTargetId ?? selectedSectionId;
    setIsNewBox(!targetId);
    if (targetId) setSelectedSectionId(targetId);
    setLabelDialogOpen(true);
    setReboxTargetId(null);
  }, [reboxTargetId, selectedSectionId]);

  const handleStartDrawForSelected = () => {
    if (!selectedSectionId) return;
    setReboxTargetId(selectedSectionId);
    setDrawMode(true);
    setStatusMessage(`Draw a box around component #${selectedSectionId} on the drawing.`);
  };

  const handleDrawModeChange = (enabled) => {
    setDrawMode(enabled);
    if (enabled) setReboxTargetId(null);
  };

  const handleLabelSave = async (labelData) => {
    if (!pendingBbox) return;
    setSavingLabel(true);

    try {
      if (isNewBox || !selectedSection) {
        const newId = parsedSections.length
          ? Math.max(...parsedSections.map((s) => s.id)) + 1
          : 1;
        const newSection = {
          id: newId,
          ...labelData,
          bbox: pendingBbox,
          manually_labeled: true,
        };

        await saveFeedback(null, labelData, pendingBbox);
        setParsedSections((prev) => [...prev, newSection]);
        setSelectedSectionId(newId);
        setStatusMessage(`Component #${newId} "${labelData.fitting_name}" saved for training.`);
      } else {
        const updated = parsedSections.map((sec) =>
          sec.id === selectedSectionId
            ? {
                ...sec,
                ...labelData,
                bbox: pendingBbox,
                manually_labeled: true,
                learned_from_training: false,
              }
            : sec,
        );

        await saveFeedback(selectedSection, labelData, pendingBbox);
        setParsedSections(updated);
        setStatusMessage(
          `Component #${selectedSectionId} corrected to "${labelData.fitting_name}" and saved for training.`,
        );
      }

      setLabelDialogOpen(false);
      setPendingBbox(null);
    } catch (err) {
      console.error(err);
      setStatusMessage(`Failed to save label: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSavingLabel(false);
    }
  };

  const handleExportExcel = async () => {
    if (parsedSections.length === 0) return;
    setExporting(true);
    setStatusMessage('Calculating Darcy/Colebrook pressure drop and generating Excel…');

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/export/excel`,
        {
          flow_rate: flowRate,
          ref_no: file?.name?.replace('.pdf', '') || 'EAF-B1-02',
          sections: parsedSections.map((s) => ({
            id: s.id,
            type: s.type,
            fitting_name: s.fitting_name,
            a_mm: s.a_mm,
            b_mm: s.b_mm,
            length_m: s.length_m,
            fitting_code: s.fitting_code,
          })),
        },
        { responseType: 'blob' },
      );

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ESP_Calculation_${file?.name?.replace('.pdf', '') || 'report'}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      setStatusMessage('Excel download complete.');
    } catch (err) {
      console.error(err);
      setStatusMessage(`Export failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col">
      <Header />

      <div className="flex flex-1 min-h-0">
        <SidebarNav activeStep={activeStep} onStepChange={setActiveStep} />

        <main className="flex-1 overflow-auto p-6">
          {activeStep === 1 && (
            <div className="h-full grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-[calc(100vh-8rem)]">
              <UploadSection
                file={file}
                fileInputRef={fileInputRef}
                onFileUpload={handleFileUpload}
                analyzing={analyzing}
              />
              <DocumentPreview
                fileUrl={filePreviewUrl}
                fileName={file?.name}
                fileType={file?.type}
                className="min-h-[480px]"
                emptyMessage="Upload a PDF in the panel on the left to preview your drawing here."
              />
            </div>
          )}

          {activeStep === 2 && (
            <div className="flex items-start justify-center min-h-[calc(100vh-8rem)]">
              <SettingsSection
                flowRate={flowRate}
                setFlowRate={setFlowRate}
                scaleRatio={scaleRatio}
                setScaleRatio={setScaleRatio}
              />
            </div>
          )}

          {activeStep === 3 && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[calc(100vh-8rem)]">
              <DocumentPreview
                fileUrl={filePreviewUrl}
                fileName={file?.name}
                fileType={file?.type}
                annotations={annotations}
                selectedId={selectedSectionId}
                onSelect={setSelectedSectionId}
                showArrows
                drawMode={drawMode}
                onDrawModeChange={handleDrawModeChange}
                onBoxDrawn={handleBoxDrawn}
                className="xl:col-span-7 min-h-[520px]"
                emptyMessage="No drawing loaded. Go to Step 1 and upload a PDF first."
              />
              <div className="xl:col-span-5 min-h-[520px]">
                <DuctTable
                  analyzing={analyzing}
                  parsedSections={parsedSections}
                  onFieldChange={handleFieldChange}
                  statusMessage={statusMessage}
                  selectedId={selectedSectionId}
                  onSelectRow={setSelectedSectionId}
                  drawMode={drawMode}
                  onStartDrawForSelected={handleStartDrawForSelected}
                  learnedCount={learnedCount}
                />
              </div>
            </div>
          )}

          {activeStep === 4 && (
            <ExcelExportSection
              parsedSections={parsedSections}
              flowRate={flowRate}
              statusMessage={statusMessage}
              onExportExcel={handleExportExcel}
              exporting={exporting}
            />
          )}
        </main>
      </div>

      <LabelDialog
        open={labelDialogOpen}
        onClose={() => {
          setLabelDialogOpen(false);
          setPendingBbox(null);
        }}
        onSave={handleLabelSave}
        initialSection={isNewBox ? null : selectedSection}
        isNewBox={isNewBox}
        saving={savingLabel}
      />
    </div>
  );
}
