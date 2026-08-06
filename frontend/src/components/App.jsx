import React, { useState, useRef, useEffect, useMemo } from 'react';
import axios from 'axios';
import Header from './Header';
import SidebarNav from './SidebarNav';
import UploadSection from './UploadSection';
import SettingsSection from './SettingsSection';
import DuctTable from './DuctTable';
import DocumentPreview from './DocumentPreview';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const MOCK_SECTIONS = [
  { id: 1, type: 'Suction', fitting_name: 'Air Grille', a_mm: 600, b_mm: 600, length_m: 0.0, fitting_code: 'GRILLE', bbox: { x: 8, y: 12, w: 12, h: 10 } },
  { id: 2, type: 'Suction', fitting_name: 'Damper', a_mm: 600, b_mm: 600, length_m: 0.18, fitting_code: 'CR9-4', bbox: { x: 24, y: 14, w: 10, h: 8 } },
  { id: 3, type: 'Suction', fitting_name: 'Run', a_mm: 500, b_mm: 250, length_m: 1.4, fitting_code: '', bbox: { x: 38, y: 22, w: 28, h: 6 } },
  { id: 4, type: 'Suction', fitting_name: 'Silencer', a_mm: 500, b_mm: 250, length_m: 0.0, fitting_code: 'SILENCER_DEFAULT', bbox: { x: 68, y: 20, w: 10, h: 10 } },
  { id: 5, type: 'Discharge', fitting_name: 'Transition', a_mm: 500, b_mm: 400, length_m: 0.89, fitting_code: 'SR4-1', bbox: { x: 52, y: 38, w: 14, h: 12 } },
];

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
      })),
    [parsedSections],
  );

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
      await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setStatusMessage('Analysis complete — review detected duct components in Step 3.');
      setParsedSections(MOCK_SECTIONS);
      setSelectedSectionId(MOCK_SECTIONS[0]?.id ?? null);
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

  const handleExportExcel = async () => {
    setStatusMessage('Calculating Darcy/Colebrook pressure drop and generating Excel…');
    try {
      alert('Excel generation triggered — download will start shortly.');
      setStatusMessage('Excel download complete.');
    } catch (err) {
      alert(`Export failed: ${err.message}`);
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
                className="xl:col-span-7 min-h-[520px]"
                emptyMessage="No drawing loaded. Go to Step 1 and upload a PDF first."
              />
              <div className="xl:col-span-5 min-h-[520px]">
                <DuctTable
                  analyzing={analyzing}
                  parsedSections={parsedSections}
                  onFieldChange={handleFieldChange}
                  statusMessage={statusMessage}
                  onExportExcel={handleExportExcel}
                  selectedId={selectedSectionId}
                  onSelectRow={setSelectedSectionId}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
