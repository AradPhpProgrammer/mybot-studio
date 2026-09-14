import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import { BUILTIN_VARIABLES } from '../Variables/VariableTextArea';

// Optional: suggested callback_data values based on button text
function suggestCallback(text) {
  if (!text || !text.trim()) return [];
  const t = text.trim();
  const base = t.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!base) return [];
  return [base, base.slice(0, 32)];
}

// Known callback_data patterns for quick suggestions while typing
const COMMON_CALLBACKS = [
  'btn_about', 'btn_help', 'btn_back', 'btn_menu', 'btn_start', 'btn_buy', 'btn_cancel',
  'btn_confirm', 'btn_next', 'btn_prev', 'btn_settings', 'btn_profile', 'btn_claim',
  'btn_balance', 'btn_price', 'btn_invite', 'btn_support', 'menu_main', 'menu_help'
];

export default function KeyboardEditor({ buttons, onChange }) {
  const { t } = useI18n();

  const addRow = () => {
    const updated = [...buttons, [{ text: '', callback_data: 'btn_new', style: 'default' }]];
    onChange(updated);
  };

  const addButtonToRow = (rowIndex) => {
    const updated = [...buttons];
    updated[rowIndex] = [...updated[rowIndex], { text: '', callback_data: 'btn_' + Date.now(), style: 'default' }];
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
    if (updated[rowIndex].length === 0) updated.splice(rowIndex, 1);
    onChange(updated);
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">{t('mockup.buttons.inline_title')}</span>
        <button type="button" onClick={addRow} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity">
          <Plus size={12} />
          {t('mockup.buttons.add_row')}
        </button>
      </div>

      <div className="space-y-2">
        {buttons.map((row, rIdx) => (
          <div key={rIdx} className="p-2 rounded-xl bg-surface-secondary border border-border space-y-2">
            <div className="flex items-center justify-between text-[10px] text-muted font-medium">
              <span>{t('mockup.buttons.row')} {rIdx + 1}</span>
              <button type="button" onClick={() => addButtonToRow(rIdx)} className="flex items-center gap-1 text-[10px] text-accent hover:underline">
                <Plus size={10} />
                {t('mockup.buttons.add_btn')}
              </button>
            </div>

            {/* Responsive row: buttons wrap, delete always inside */}
            <div className="flex flex-wrap gap-2">
              {row.map((btn, bIdx) => (
                <div key={bIdx} className="flex-1 min-w-[230px] flex flex-col sm:flex-row sm:items-center gap-2 p-1.5 rounded-lg bg-surface border border-border">
                  <input
                    type="text"
                    value={btn.text || ''}
                    onChange={(e) => updateButton(rIdx, bIdx, 'text', e.target.value)}
                    placeholder={t('mockup.buttons.btn_text')}
                    className="flex-1 min-w-0 bg-surface-secondary px-2 py-1 rounded text-xs text-foreground outline-none border border-border/50"
                  />
                  <CallbackInput
                    value={btn.callback_data || ''}
                    onChange={(v) => updateButton(rIdx, bIdx, 'callback_data', v)}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      value={btn.style || 'default'}
                      onChange={(e) => updateButton(rIdx, bIdx, 'style', e.target.value)}
                      className="bg-surface-secondary px-1.5 py-1 rounded text-[11px] text-foreground border border-border/50 outline-none"
                    >
                      <option value="default">{t('mockup.buttons.default')}</option>
                      <option value="primary">{t('mockup.buttons.primary')}</option>
                      <option value="success">{t('mockup.buttons.success')}</option>
                      <option value="danger">{t('mockup.buttons.danger')}</option>
                    </select>
                    <button type="button" onClick={() => deleteButton(rIdx, bIdx)} className="p-1.5 text-danger hover:bg-danger/10 rounded transition-colors shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Callback input with autocomplete popup (suggests matching names, like the $ variable menu) */
function CallbackInput({ value, onChange }) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [selIndex, setSelIndex] = useState(0);

  // Combine common callbacks + suggestion from button text (passed via dataset)
  const suggestions = useMemoSuggestions(value);

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(filter.toLowerCase()) && s !== value
  );

  useEffect(() => {
    if (open) {
      const list = document.getElementById('cb-suggest-list');
      list?.children[selIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, selIndex, filtered.length]);

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    if (v.trim().length >= 1) {
      setFilter(v);
      setOpen(true);
      setSelIndex(0);
    } else {
      setOpen(false);
    }
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (open && filtered.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelIndex((i) => (i + 1) % filtered.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelIndex((i) => (i - 1 + filtered.length) % filtered.length); return; }
      if (e.key === 'Enter') { e.preventDefault(); pick(filtered[selIndex]); return; }
      if (e.key === 'Tab') { e.preventDefault(); if (filtered[selIndex]) pick(filtered[selIndex]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    }
  };

  const pick = (val) => {
    onChange(val);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex-1 min-w-0">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onWheel={(e) => e.stopPropagation()}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={t('mockup.buttons.btn_action') || 'Event name'}
        className="w-full bg-surface-secondary px-2 py-1 rounded text-[11px] font-mono text-foreground outline-none border border-border/50"
      />
      {open && filtered.length > 0 && (
        <div
          className="absolute z-[90] top-full left-0 mt-1 w-full min-w-[220px] bg-surface border border-border rounded-lg shadow-2xl overflow-hidden animate-in fade-in"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-[9px] font-bold text-muted uppercase tracking-wider border-b border-border bg-surface-secondary/50 flex items-center justify-between">
            <span>{t('mockup.buttons.suggest_title') || 'Suggestions'}</span>
            <span className="text-[8px] font-normal">↑↓ Enter</span>
          </div>
          <div id="cb-suggest-list" className="max-h-40 overflow-y-auto p-1">
            {filtered.map((s, i) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(s); }}
                onMouseEnter={() => setSelIndex(i)}
                className={`w-full text-start px-2.5 py-1.5 rounded text-[11px] font-mono transition-colors ${i === selIndex ? 'bg-accent/15 ring-1 ring-accent/40 text-foreground' : 'hover:bg-surface-secondary text-foreground'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function useMemoSuggestions(value) {
  // Both common callback patterns + a suggestion derived from the current value
  const text = value;
  const fromValue = text && text.trim() ? suggestCallback(text) : [];
  return Array.from(new Set([...COMMON_CALLBACKS, ...fromValue, text && text.trim()].filter(Boolean)));
}