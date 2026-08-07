import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const FITTING_PRESETS = [
  { name: 'Air Grille', code: 'GRILLE', type: 'Suction' },
  { name: 'Damper', code: 'CR9-4', type: 'Suction' },
  { name: 'Run', code: '', type: 'Suction' },
  { name: 'Silencer', code: 'SILENCER_DEFAULT', type: 'Suction' },
  { name: 'Transition', code: 'SR4-1', type: 'Discharge' },
  { name: 'Elbow', code: 'ELBOW', type: 'Suction' },
  { name: 'T-Junction', code: 'TEE', type: 'Suction' },
];

export default function LabelDialog({
  open,
  onClose,
  onSave,
  initialSection,
  isNewBox,
  saving,
}) {
  const [form, setForm] = useState({
    fitting_name: initialSection?.fitting_name || '',
    type: initialSection?.type || 'Suction',
    a_mm: initialSection?.a_mm ?? 500,
    b_mm: initialSection?.b_mm ?? 250,
    length_m: initialSection?.length_m ?? 0,
    fitting_code: initialSection?.fitting_code || '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        fitting_name: initialSection?.fitting_name || '',
        type: initialSection?.type || 'Suction',
        a_mm: initialSection?.a_mm ?? 500,
        b_mm: initialSection?.b_mm ?? 250,
        length_m: initialSection?.length_m ?? 0,
        fitting_code: initialSection?.fitting_code || '',
      });
    }
  }, [open, initialSection]);

  if (!open) return null;

  const applyPreset = (preset) => {
    setForm((prev) => ({
      ...prev,
      fitting_name: preset.name,
      fitting_code: preset.code,
      type: preset.type,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.fitting_name.trim()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">
            {isNewBox ? 'Label New Component' : 'Correct Component Label'}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="fse-label text-xs">Quick presets</label>
            <div className="flex flex-wrap gap-1.5">
              {FITTING_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-2 py-1 text-[10px] rounded-full bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-[#1e5a8a] border border-gray-200"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="fse-label">Component name *</label>
            <input
              required
              value={form.fitting_name}
              onChange={(e) => setForm({ ...form, fitting_name: e.target.value })}
              className="fse-input"
              placeholder="e.g. Damper, Run, Silencer"
            />
          </div>

          <div>
            <label className="fse-label">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="fse-input"
            >
              <option value="Suction">Suction</option>
              <option value="Discharge">Discharge</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="fse-label">a (mm)</label>
              <input
                type="number"
                value={form.a_mm}
                onChange={(e) => setForm({ ...form, a_mm: parseInt(e.target.value, 10) || 0 })}
                className="fse-input font-mono"
              />
            </div>
            <div>
              <label className="fse-label">b (mm)</label>
              <input
                type="number"
                value={form.b_mm}
                onChange={(e) => setForm({ ...form, b_mm: parseInt(e.target.value, 10) || 0 })}
                className="fse-input font-mono"
              />
            </div>
            <div>
              <label className="fse-label">L (m)</label>
              <input
                type="number"
                step="0.01"
                value={form.length_m}
                onChange={(e) => setForm({ ...form, length_m: parseFloat(e.target.value) || 0 })}
                className="fse-input font-mono"
              />
            </div>
          </div>

          <div>
            <label className="fse-label">ASHRAE code</label>
            <input
              value={form.fitting_code}
              onChange={(e) => setForm({ ...form, fitting_code: e.target.value })}
              className="fse-input font-mono"
              placeholder="e.g. CR9-4"
            />
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed">
            Saving stores this label for training. Similar components will be recognized on future drawings.
          </p>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 fse-btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 fse-btn-primary flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save & Train'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
