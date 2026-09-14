import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../../locales/i18n';

/**
 * Visual editor for inline buttons of a Telegram message.
 * Users define button label, callback identifier, and visual style.
 * Identifiers are dynamically harvested from the current workflow.
 */
export default function KeyboardEditor({ buttons = [], onChange, knownIdentifiers = [] }) {
  const { t } = useI18n();

  const addRow = () => {
    const updated = [...buttons, [{ text: '', callback_data: '', style: 'default' }]];
    onChange(updated);
  };

  const addButtonToRow = (rowIndex) => {
    const updated = [...buttons];
    updated[rowIndex] = [...updated[rowIndex], { text: '', callback_data: '', style: 'default' }];
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

  // Collect all identifiers currently entered across this keyboard
  const localIdentifiers = buttons.flatMap(r => r.map(b => b.callback_data).filter(Boolean));
  const suggestionPool = Array.from(new Set([...knownIdentifiers, ...localIdentifiers]));

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">
          {t('mockup.buttons.inline_title') || 'Inline Keyboard'}
        </span>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={12} />
          <span>{t('mockup.buttons.add_row') || 'Add Row'}</span>
        </button>
      </div>

      <div className="space-y-2">
        {buttons.map((row, rIdx) => (
          <div key={rIdx} className="p-2.5 rounded-xl bg-surface-secondary/70 border border-border space-y-2">
            <div className="flex items-center justify-between text-[10px] text-muted font-medium">
              <span>{t('mockup.buttons.row') || 'Row'} {rIdx + 1}</span>
              <button
                type="button"
                onClick={() => addButtonToRow(rIdx)}
                className="flex items-center gap-1 text-[10px] text-accent hover:underline"
              >
                <Plus size={10} />
                <span>{t('mockup.buttons.add_btn') || 'Add Button'}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {row.map((btn, bIdx) => (
                <div
                  key={bIdx}
                  className="flex-1 min-w-[240px] flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg bg-surface border border-border"
                >
                  <input
                    type="text"
                    value={btn.text || ''}
                    onChange={(e) => updateButton(rIdx, bIdx, 'text', e.target.value)}
                    placeholder={t('mockup.buttons.btn_text') || 'Button text'}
                    className="flex-1 min-w-0 bg-surface-secondary px-2.5 py-1.5 rounded-md text-xs text-foreground placeholder:text-muted outline-none border border-border focus:border-accent"
                  />
                  <CallbackInput
                    value={btn.callback_data || ''}
                    onChange={(v) => updateButton(rIdx, bIdx, 'callback_data', v)}
                    suggestions={suggestionPool}
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <select
                      value={btn.style || 'default'}
                      onChange={(e) => updateButton(rIdx, bIdx, 'style', e.target.value)}
                      className="bg-surface-secondary px-2 py-1.5 rounded-md text-[11px] text-foreground border border-border outline-none focus:border-accent"
                    >
                      <option value="default">{t('mockup.buttons.default') || 'Default'}</option>
                      <option value="primary">{t('mockup.buttons.primary') || 'Primary (Blue)'}</option>
                      <option value="success">{t('mockup.buttons.success') || 'Success (Green)'}</option>
                      <option value="danger">{t('mockup.buttons.danger') || 'Danger (Red)'}</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => deleteButton(rIdx, bIdx)}
                      className="p-1.5 text-danger hover:bg-danger/10 rounded-md transition-colors shrink-0"
                      title={t('common.delete') || 'Delete button'}
                    >
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

/**
 * Autocomplete input for button callback_data / identifier.
 * Suggests identifiers already defined by the user in this or other buttons.
 */
function CallbackInput({ value, onChange, suggestions = [] }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [selIndex, setSelIndex] = useState(0);

  const filtered = suggestions.filter(
    (s) => s && s !== value && s.toLowerCase().includes(filter.toLowerCase())
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

  const pick = (val) => {
    onChange(val);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (open && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered[selIndex]) pick(filtered[selIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }
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
        placeholder={t('mockup.buttons.btn_action') || 'Event ID'}
        className="w-full bg-surface-secondary px-2.5 py-1.5 rounded-md text-[11px] font-mono text-foreground placeholder:text-muted outline-none border border-border focus:border-accent"
      />
      {open && filtered.length > 0 && (
        <div
          className="absolute z-[90] top-full left-0 mt-1 w-full min-w-[200px] bg-surface border border-border rounded-lg shadow-2xl overflow-hidden animate-in fade-in"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1 text-[9px] font-bold text-muted uppercase tracking-wider border-b border-border bg-surface-secondary flex items-center justify-between">
            <span>{t('mockup.buttons.suggest_title') || 'Your Defined IDs'}</span>
            <span className="text-[8px] font-normal">↑↓ Enter</span>
          </div>
          <div id="cb-suggest-list" className="max-h-36 overflow-y-auto p-1">
            {filtered.map((s, i) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                onMouseEnter={() => setSelIndex(i)}
                className={`w-full text-start px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                  i === selIndex
                    ? 'bg-accent/15 ring-1 ring-accent/40 text-foreground'
                    : 'hover:bg-surface-secondary text-foreground'
                }`}
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