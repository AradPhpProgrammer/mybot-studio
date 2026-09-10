import React from 'react';
import { Plus, Trash2, GripVertical, Palette } from 'lucide-react';
import { useI18n } from '../../locales/i18n';

const STYLES = [
  { id: 'default', label: 'Default', bg: 'bg-surface-tertiary', text: 'text-foreground' },
  { id: 'primary', label: 'Primary (Blue)', bg: 'bg-blue-600/20 border-blue-500/50', text: 'text-blue-400' },
  { id: 'success', label: 'Success (Green)', bg: 'bg-emerald-600/20 border-emerald-500/50', text: 'text-emerald-400' },
  { id: 'danger', label: 'Danger (Red)', bg: 'bg-red-600/20 border-red-500/50', text: 'text-red-400' }
];

export default function KeyboardEditor({ buttons, onChange }) {
  const { t } = useI18n();

  const addRow = () => {
    const updated = [...buttons, [{ text: 'دکمه جدید', callback_data: 'btn_new', style: 'default' }]];
    onChange(updated);
  };

  const addButtonToRow = (rowIndex) => {
    const updated = [...buttons];
    updated[rowIndex] = [...updated[rowIndex], { text: 'دکمه', callback_data: 'btn_' + Date.now(), style: 'default' }];
    onChange(updated);
  };

  const updateButton = (rowIndex, btnIndex, field, value) => {
    const updated = [...buttons];
    updated[rowIndex] = [...updated[rowIndex]];
    updated[rowIndex][btnIndex] = { ...updated[rowIndex][btnIndex], [field]: value };
    onChange(updated);
  };

  const deleteButton = (rowIndex, btnIndex) => {
    const updated = [...buttons];
    updated[rowIndex] = updated[rowIndex].filter((_, idx) => idx !== btnIndex);
    if (updated[rowIndex].length === 0) {
      updated.splice(rowIndex, 1);
    }
    onChange(updated);
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">دکمه‌های شیشه‌ای (Inline Buttons)</span>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={12} />
          <span>{t('mockup.buttons.add_row')}</span>
        </button>
      </div>

      <div className="space-y-2">
        {buttons.map((row, rIdx) => (
          <div key={rIdx} className="p-2 rounded-xl bg-surface-secondary border border-border space-y-2">
            <div className="flex items-center justify-between text-[10px] text-muted font-medium">
              <span>ردیف {rIdx + 1}</span>
              <button
                type="button"
                onClick={() => addButtonToRow(rIdx)}
                className="flex items-center gap-1 text-[10px] text-accent hover:underline"
              >
                <Plus size={10} />
                <span>{t('mockup.buttons.add_btn')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {row.map((btn, bIdx) => (
                <div key={bIdx} className="flex items-center gap-2 p-1.5 rounded-lg bg-surface border border-border">
                  <input
                    type="text"
                    value={btn.text || ''}
                    onChange={(e) => updateButton(rIdx, bIdx, 'text', e.target.value)}
                    placeholder="عنوان دکمه"
                    className="flex-1 bg-surface-secondary px-2 py-1 rounded text-xs text-foreground outline-none border border-border/50"
                  />

                  <input
                    type="text"
                    value={btn.callback_data || ''}
                    onChange={(e) => updateButton(rIdx, bIdx, 'callback_data', e.target.value)}
                    placeholder="callback_data"
                    className="w-28 bg-surface-secondary px-2 py-1 rounded text-[11px] font-mono text-foreground outline-none border border-border/50"
                  />

                  {/* Color / Style Picker */}
                  <select
                    value={btn.style || 'default'}
                    onChange={(e) => updateButton(rIdx, bIdx, 'style', e.target.value)}
                    className="bg-surface-secondary px-1.5 py-1 rounded text-[11px] text-foreground border border-border/50 outline-none"
                  >
                    <option value="default">🔘 عادی</option>
                    <option value="primary">🔵 Primary (آبی)</option>
                    <option value="success">🟢 Success (سبز)</option>
                    <option value="danger">🔴 Danger (قرمز)</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => deleteButton(rIdx, bIdx)}
                    className="p-1 text-danger hover:bg-danger/10 rounded transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
