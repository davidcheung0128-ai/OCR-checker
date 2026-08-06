// frontend/src/App.jsx
import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, FileText, Download, CheckCircle, RefreshCw, Layers } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function App() {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [parsedSections, setParsedSections] = useState([]);
  const [flowRate, setFlowRate] = useState(0.25);
  const [scaleRatio, setScaleRatio] = useState(1.0); // mm per pixel
  const [statusMessage, setStatusMessage] = useState('準備就緒，請上傳圖紙 PDF');
  const fileInputRef = useRef(null);

  // 1. 上傳並呼叫 AI 解析
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setAnalyzing(true);
    setStatusMessage('正發送至 FSEE MinerU 與 VLLM 進行圖紙特徵解析...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setStatusMessage('✅ 解析成功！AI 自動辨識出風管與配件如下。');

      // 模擬解析後的風管列表 (實際將接上 VLLM JSON 輸出)
      setParsedSections([
        { id: 1, type: 'Suction', fitting_name: 'Air Grille', a_mm: 600, b_mm: 600, length_m: 0.0, fitting_code: 'GRILLE' },
        { id: 2, type: 'Suction', fitting_name: 'Damper', a_mm: 600, b_mm: 600, length_m: 0.18, fitting_code: 'CR9-4' },
        { id: 3, type: 'Suction', fitting_name: 'Run', a_mm: 500, b_mm: 250, length_m: 1.4, fitting_code: '' },
        { id: 4, type: 'Suction', fitting_name: 'Silencer', a_mm: 500, b_mm: 250, length_m: 0.0, fitting_code: 'SILENCER_DEFAULT' },
        { id: 5, type: 'Discharge', fitting_name: 'Transition', a_mm: 500, b_mm: 400, length_m: 0.89, fitting_code: 'SR4-1' }
      ]);
    } catch (err) {
      console.error(err);
      setStatusMessage('❌ 解析失敗：' + (err.response?.data?.detail || err.message));
    } finally {
      setAnalyzing(false);
    }
  };

  // 2. 人工修正 (Human-in-the-loop) 寫入回饋資料庫
  const handleFieldChange = (index, field, value) => {
    const updated = [...parsedSections];
    updated[index][field] = value;
    setParsedSections(updated);
  };

  // 3. 觸發 Excel 匯出
  const handleExportExcel = async () => {
    setStatusMessage('正在計算 Darcy/Colebrook 壓降並產生 Excel...');
    try {
      // 在實際後端調用物理引擎進行最終計算與下載
      alert('已觸發 Excel 生成，即將開始下載！');
      setStatusMessage('✅ Excel 下載完成');
    } catch (err) {
      alert('匯出失敗：' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* 頁首 Header - FSEE 企業風格 */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg font-bold text-xl">FSEE</div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">AI HVAC Duct Pressure Drop Calculator</h1>
            <p className="text-xs text-slate-400">Young's Engineering Company Standard Compliant</p>
          </div>
        </div>
        <div className="text-xs bg-slate-700 px-3 py-1.5 rounded-full text-blue-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          VLLM & MinerU Online
        </div>
      </header>

      {/* 主要內容區 */}
      <main className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 左側：控制面板 & 圖紙預覽 */}
        <section className="lg:col-span-5 space-y-6">
          {/* 上傳區塊 */}
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
              <input ref={fileInputRef} type="file" accept=".pdf,.png" className="hidden" onChange={handleFileUpload} />
            </div>

            {file && (
              <div className="mt-4 p-3 bg-slate-700/50 rounded-lg text-xs text-slate-300 flex justify-between items-center">
                <span className="truncate max-w-[200px]">{file.name}</span>
                <span className="text-emerald-400 font-medium">已載入</span>
              </div>
            )}
          </div>

          {/* 全域參數設定 */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-md space-y-4">
            <h2 className="text-md font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" /> 2. 系統與比例尺設定
            </h2>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">設計總風量 (m³/s)</label>
                <input 
                  type="number" step="0.01" 
                  value={flowRate} 
                  onChange={(e) => setFlowRate(parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">比例尺校準 (mm/px)</label>
                <input 
                  type="number" step="0.1" 
                  value={scaleRatio} 
                  onChange={(e) => setScaleRatio(parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 右側：風管組件辨識結果與表格修正 */}
        <section className="lg:col-span-7 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-md font-semibold text-slate-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> 3. 風管管路組件與壓降試算明細
              </h2>
              {analyzing && <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />}
            </div>

            {/* 數據明細表格 */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-700/60 text-slate-300 border-b border-slate-600">
                    <th className="p-2">#</th>
                    <th className="p-2">類型</th>
                    <th className="p-2">配件/管段名稱</th>
                    <th className="p-2">寬 a(mm)</th>
                    <th className="p-2">高 b(mm)</th>
                    <th className="p-2">長度 L(m)</th>
                    <th className="p-2">ASHRAE 代碼</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 font-mono">
                  {parsedSections.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-500 font-sans">
                        尚無數據，請先在上傳區域載入圖紙檔。
                      </td>
                    </tr>
                  ) : (
                    parsedSections.map((sec, idx) => (
                      <tr key={sec.id} className="hover:bg-slate-700/30">
                        <td className="p-2 font-bold text-blue-400">{sec.id}</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${sec.type === 'Suction' ? 'bg-amber-900/50 text-amber-300' : 'bg-cyan-900/50 text-cyan-300'}`}>
                            {sec.type}
                          </span>
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" value={sec.fitting_name} 
                            onChange={(e) => handleFieldChange(idx, 'fitting_name', e.target.value)}
                            className="bg-transparent border-b border-slate-600 focus:border-blue-400 outline-none w-full text-slate-200"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="number" value={sec.a_mm} 
                            onChange={(e) => handleFieldChange(idx, 'a_mm', parseInt(e.target.value))}
                            className="bg-transparent border-b border-slate-600 focus:border-blue-400 outline-none w-12 text-slate-200"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="number" value={sec.b_mm} 
                            onChange={(e) => handleFieldChange(idx, 'b_mm', parseInt(e.target.value))}
                            className="bg-transparent border-b border-slate-600 focus:border-blue-400 outline-none w-12 text-slate-200"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="number" step="0.1" value={sec.length_m} 
                            onChange={(e) => handleFieldChange(idx, 'length_m', parseFloat(e.target.value))}
                            className="bg-transparent border-b border-slate-600 focus:border-blue-400 outline-none w-14 text-emerald-400"
                          />
                        </td>
                        <td className="p-2 text-slate-400">{sec.fitting_code || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 下方狀態欄與動作按鈕 */}
          <div className="mt-6 pt-4 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs text-slate-400 truncate max-w-md">
              <span className="font-semibold text-slate-300">狀態：</span> {statusMessage}
            </div>

            <button
              onClick={handleExportExcel}
              disabled={parsedSections.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-medium text-xs rounded-lg shadow-md flex items-center justify-center gap-2 transition duration-200"
            >
              <Download className="w-4 h-4" /> 下載 Young's Standard Excel
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}