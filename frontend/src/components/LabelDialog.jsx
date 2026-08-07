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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">
            {isNewBox ? 'Label New Component' : 'Correct Component Label'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Quick presets</label>
            <div className="flex flex-wrap gap-1.5">
              {FITTING_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-2 py-1 text-[10px] rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Component name *</label>
            <input
              required
              value={form.fitting_name}
              onChange={(e) => setForm({ ...form, fitting_name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500 outline-none"
              placeholder="e.g. Damper, Run, Silencer"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500 outline-none"
            >
              <option value="Suction">Suction</option>
              <option value="Discharge">Discharge</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">a (mm)</label>
              <input
                type="number"
                value={form.a_mm}
                onChange={(e) => setForm({ ...form, a_mm: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">b (mm)</label>
              <input
                type="number"
                value={form.b_mm}
                onChange={(e) => setForm({ ...form, b_mm: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">L (m)</label>
              <input
                type="number"
                step="0.01"
                value={form.length_m}
                onChange={(e) => setForm({ ...form, length_m: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">ASHRAE code</label>
            <input
              value={form.fitting_code}
              onChange={(e) => setForm({ ...form, fitting_code: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-mono focus:border-blue-500 outline-none"
              placeholder="e.g. CR9-4"
            />
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Saving stores this label and bounding box for training. Similar components on future
            drawings will be recognized automatically.
          </p>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium flex items-center justify-center gap-2"
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
