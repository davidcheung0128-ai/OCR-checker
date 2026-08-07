import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import SidebarNav, { PageHeader } from './SidebarNav';
import UploadSection from './UploadSection';
import SettingsBar from './SettingsSection';
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
  const [statusMessage, setStatusMessage] = useState('Ready — upload a PDF drawing to begin.');
  const [drawMode, setDrawMode] = useState(false);
  const [reboxTargetId, setReboxTargetId] = useState(null);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [pendingBbox, setPendingBbox] = useState(null);
  const [isNewBox, setIsNewBox] = useState(false);
  const [savingLabel, setSavingLabel] = useState(false);
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

  const handleRefresh = () => {
    if (activeStep === 1 && fileInputRef.current) {
      setStatusMessage('Ready — upload a PDF drawing to begin.');
    } else {
      setStatusMessage(`Refreshed — ${parsedSections.length} section(s) loaded.`);
    }
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

      const seedNote = data.training_seed
        ? ` Using basic training from ${data.training_seed} (${sections.length} components).`
        : '';
      const learnedMsg =
        data.learned_labels_applied > 0
          ? ` ${data.learned_labels_applied} matched from saved labels.`
          : '';
      const mineruNote = data.mineru_ok === false ? ' (MinerU offline — seed labels used.)' : '';
      setStatusMessage(`Analysis complete — go to Step 2 to review labels.${seedNote}${learnedMsg}${mineruNote}`);
      if (sections.length > 0) setActiveStep(2);
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
    setStatusMessage(`Draw a box around component #${selectedSectionId}.`);
  };

  const handleDrawModeChange = (enabled) => {
    setDrawMode(enabled);
    if (enabled) setReboxTargetId(null);
  };

  const handleDeleteSection = async () => {
    if (!selectedSectionId || !selectedSection) return;

    const deleted = selectedSection;
    const remaining = parsedSections.filter((s) => s.id !== selectedSectionId);
    setParsedSections(remaining);
    setSelectedSectionId(remaining[0]?.id ?? null);

    try {
      await axios.post(`${API_BASE_URL}/api/feedback`, {
        filename: file?.name || 'unknown.pdf',
        original: deleted.fitting_name,
        corrected: '[DELETED]',
        bbox: deleted.bbox || { x: 0, y: 0, w: 0, h: 0 },
        section_type: deleted.type,
        fitting_code: deleted.fitting_code || '',
        section_id: deleted.id,
      });
      setStatusMessage(`Removed #${deleted.id} "${deleted.fitting_name}".`);
    } catch (err) {
      setStatusMessage(`Removed #${deleted.id} locally.`);
    }
  };

  const handleLabelSave = async (labelData) => {
    if (!pendingBbox) return;
    setSavingLabel(true);

    try {
      if (isNewBox || !selectedSection) {
        const newId = parsedSections.length
          ? Math.max(...parsedSections.map((s) => s.id)) + 1
          : 1;
        const newSection = { id: newId, ...labelData, bbox: pendingBbox, manually_labeled: true };

        await saveFeedback(null, labelData, pendingBbox);
        setParsedSections((prev) => [...prev, newSection]);
        setSelectedSectionId(newId);
        setStatusMessage(`Component #${newId} "${labelData.fitting_name}" saved.`);
      } else {
        const updated = parsedSections.map((sec) =>
          sec.id === selectedSectionId
            ? { ...sec, ...labelData, bbox: pendingBbox, manually_labeled: true, learned_from_training: false }
            : sec,
        );

        await saveFeedback(selectedSection, labelData, pendingBbox);
        setParsedSections(updated);
        setStatusMessage(`Component #${selectedSectionId} corrected and saved.`);
      }

      setLabelDialogOpen(false);
      setPendingBbox(null);
    } catch (err) {
      setStatusMessage(`Failed to save: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSavingLabel(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <SidebarNav
        activeStep={activeStep}
        onStepChange={setActiveStep}
        statusMessage={statusMessage}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <PageHeader activeStep={activeStep} onRefresh={handleRefresh} refreshing={analyzing} />

        <main className="flex-1 overflow-auto p-5 bg-[#f0f2f5]">
          {activeStep === 1 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 min-h-[calc(100vh-9rem)]">
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
                emptyMessage="Upload a PDF to preview your drawing here."
              />
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4 min-h-[calc(100vh-9rem)] flex flex-col">
              <SettingsBar
                flowRate={flowRate}
                setFlowRate={setFlowRate}
                scaleRatio={scaleRatio}
                setScaleRatio={setScaleRatio}
                compact
              />
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 min-h-0">
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
                  emptyMessage="No drawing loaded. Upload a PDF in Step 1 first."
                />
                <div className="xl:col-span-5 min-h-[520px]">
                  <DuctTable
                    analyzing={analyzing}
                    parsedSections={parsedSections}
                    onFieldChange={handleFieldChange}
                    selectedId={selectedSectionId}
                    onSelectRow={setSelectedSectionId}
                    drawMode={drawMode}
                    onStartDrawForSelected={handleStartDrawForSelected}
                    onDeleteSelected={handleDeleteSection}
                    learnedCount={learnedCount}
                  />
                </div>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <ExcelExportSection
              parsedSections={parsedSections}
              flowRate={flowRate}
              fileName={file?.name}
              onSectionsChange={setParsedSections}
              onFlowRateChange={setFlowRate}
              statusMessage={statusMessage}
              onStatusChange={setStatusMessage}
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
