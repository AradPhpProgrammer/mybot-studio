import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, MoveUp, MoveDown, Grid, Sparkles } from 'lucide-react';
import { useI18n } from '../../locales/i18n';

export default function ReplyKeyboardBuilder({
  rows = [],
  onChange,
  onClose
}) {
  const { t } = useI18n();
  const [internalRows, setInternalRows] = useState(rows);

  // Sync internal state when external rows change
  useEffect(() => {
    setInternalRows(rows);
  }, [rows]);

  const activeRows = internalRows;

  // Selection state: { rIdx, bIdx }
  const [selected, setSelected] = useState(() => {
    if (rows.length > 0 && rows[0]?.length > 0) return { rIdx: 0, bIdx: 0 };
    return null;
  });

  // Current selected button
  const currentBtn = selected && activeRows[selected.rIdx]?.[selected.bIdx]
    ? activeRows[selected.rIdx][selected.bIdx]
    : null;

  const commitRows = (newRows) => {
    setInternalRows(newRows);
    onChange?.(newRows);
  };

  // Add the very first button (full-width) into a new row
  const handleAddFirstButton = (e) => {
    e?.stopPropagation?.();
    const newBtn = {
      text: 'Button 1',
      callback_data: `btn_key_${Date.now().toString().slice(-4)}`,
      style: 'default'
    };
    const newRows = [[newBtn]];
    commitRows(newRows);
    setSelected({ rIdx: 0, bIdx: 0 });
  };

  // Add button to existing row
  const handleAddButtonToRow = (rIdx, e) => {
    e?.stopPropagation?.();
    const newBtn = {
      text: `Button ${activeRows[rIdx].length + 1}`,
      callback_data: `btn_key_${Date.now().toString().slice(-4)}`,
      style: 'default'
    };
    const newRows = activeRows.map((r, i) => (i === rIdx ? [...r, newBtn] : [...r]));
    commitRows(newRows);
    setSelected({ rIdx, bIdx: newRows[rIdx].length - 1 });
  };

  // Add a brand-new row with one full-width button
  const handleAddNewRow = (e) => {
    e?.stopPropagation?.();
    const newBtn = {
      text: `Button Row ${activeRows.length + 1}`,
      callback_data: `btn_key_${Date.now().toString().slice(-4)}`,
      style: 'default'
    };
    const newRows = [...activeRows, [newBtn]];
    commitRows(newRows);
    setSelected({ rIdx: newRows.length - 1, bIdx: 0 });
  };

  // Update selected button properties
  const updateSelectedBtn = (field, value) => {
    if (!selected) return;
    const { rIdx, bIdx } = selected;
    const newRows = activeRows.map((r, ri) =>
      ri === rIdx
        ? r.map((b, bi) => (bi === bIdx ? { ...b, [field]: value } : b))
        : [...r]
    );
    commitRows(newRows);
  };

  // Delete selected button
  const handleDeleteSelected = (e) => {
    e?.stopPropagation?.();
    if (!selected) return;
    const { rIdx, bIdx } = selected;
    const newRow = activeRows[rIdx].filter((_, bi) => bi !== bIdx);
    let newRows;
    if (newRow.length === 0) {
      newRows = activeRows.filter((_, ri) => ri !== rIdx);
    } else {
      newRows = activeRows.map((r, ri) => (ri === rIdx ? newRow : [...r]));
    }
    commitRows(newRows);
    setSelected(null);
  };

  return (
    <div className="w-full bg-surface border-t border-border p-3.5 space-y-3 shrink-0 animate-in slide-in-from-bottom-5 duration-150 z-30 max-h-72 overflow-y-auto">
      {/* Top Header / Close Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-border text-xs font-bold text-foreground">
        <div className="flex items-center gap-1.5">
          <Grid size={14} className="text-red-400" />
          <span>{t('mockup.reply_keyboard') || 'Reply Keyboard Builder'}</span>
        </div>
        <button
          onClick={onClose}
          type="button"
          className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Top Management Toolbar: Shows up once a button is selected */}
      {currentBtn ? (
        <div className="p-2 rounded-xl bg-surface-secondary/70 border border-border flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Identifier Input */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
            <span className="text-[10px] text-muted font-semibold uppercase">ID:</span>
            <input
              type="text"
              value={currentBtn.callback_data || ''}
              onChange={(e) => updateSelectedBtn('callback_data', e.target.value)}
              placeholder="btn_identifier"
              className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-xs font-mono text-foreground outline-none focus:border-accent"
            />
          </div>

          {/* Color Picker: 3 Pill Circles + 1 Crossed Circle for No Color */}
          <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border">
            {/* Primary (Blue) */}
            <button
              type="button"
              onClick={() => updateSelectedBtn('style', 'primary')}
              title="Blue (Primary)"
              className={`w-5 h-5 rounded-full bg-blue-500 transition-all ${
                currentBtn.style === 'primary' ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : 'opacity-70 hover:opacity-100'
              }`}
            />
            {/* Success (Green) */}
            <button
              type="button"
              onClick={() => updateSelectedBtn('style', 'success')}
              title="Green (Success)"
              className={`w-5 h-5 rounded-full bg-emerald-500 transition-all ${
                currentBtn.style === 'success' ? 'ring-2 ring-offset-1 ring-emerald-500 scale-110' : 'opacity-70 hover:opacity-100'
              }`}
            />
            {/* Danger (Red) */}
            <button
              type="button"
              onClick={() => updateSelectedBtn('style', 'danger')}
              title="Red (Danger)"
              className={`w-5 h-5 rounded-full bg-red-500 transition-all ${
                currentBtn.style === 'danger' ? 'ring-2 ring-offset-1 ring-red-500 scale-110' : 'opacity-70 hover:opacity-100'
              }`}
            />
            {/* Transparent / No Color (Circle with Cross) */}
            <button
              type="button"
              onClick={() => updateSelectedBtn('style', 'default')}
              title="Transparent (Default)"
              className={`w-5 h-5 rounded-full border-2 border-muted/80 flex items-center justify-center transition-all ${
                !currentBtn.style || currentBtn.style === 'default'
                  ? 'ring-2 ring-offset-1 ring-muted scale-110 border-foreground'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <X size={10} className="text-muted-foreground" />
            </button>
          </div>

          {/* Row / Delete Actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleAddNewRow}
              className="px-2 py-1 rounded-lg bg-surface border border-border text-[11px] text-foreground hover:bg-surface-secondary flex items-center gap-1 font-medium"
              title="Add New Row"
            >
              <Plus size={11} />
              <span>Row</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="p-1.5 rounded-lg text-danger hover:bg-danger/10 border border-transparent hover:border-danger/30 transition-colors"
              title="Delete Selected Button"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ) : rows.length > 0 ? (
        <div className="text-[11px] text-muted text-center py-1">
          Click any button below to edit its identifier, color, or text.
        </div>
      ) : null}

      {/* Buttons Canvas Area */}
      {activeRows.length === 0 ? (
        /* Empty State: Large Box with Dashed Border + Central (+) */
        <div
          onClick={handleAddFirstButton}
          className="w-full h-28 rounded-2xl border-2 border-dashed border-border hover:border-red-400/80 bg-surface-secondary/40 hover:bg-red-500/5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-surface border border-border group-hover:scale-110 group-hover:border-red-400 flex items-center justify-center text-muted group-hover:text-red-400 transition-all shadow-md">
            <Plus size={20} />
          </div>
          <span className="text-xs font-semibold text-muted group-hover:text-foreground transition-colors">
            {t('mockup.add_first_button') || 'Click to Add First Button (Full Width)'}
          </span>
        </div>
      ) : (
        /* Existing Buttons Rows */
        <div className="space-y-2">
          {activeRows.map((row, rIdx) => (
            <div key={rIdx} className="flex items-center gap-1.5">
              {row.map((btn, bIdx) => {
                const isSelected = selected?.rIdx === rIdx && selected?.bIdx === bIdx;

                // Color styles
                let colorClass = 'bg-surface-secondary border-border text-foreground';
                if (btn.style === 'primary') colorClass = 'bg-blue-600/20 border-blue-500/60 text-blue-400 font-semibold';
                if (btn.style === 'success') colorClass = 'bg-emerald-600/20 border-emerald-500/60 text-emerald-400 font-semibold';
                if (btn.style === 'danger') colorClass = 'bg-red-600/20 border-red-500/60 text-red-400 font-semibold';

                return (
                  <div
                    key={bIdx}
                    onClick={() => setSelected({ rIdx, bIdx })}
                    className={`flex-1 min-w-[60px] p-2 rounded-xl border text-center transition-all cursor-pointer shadow-xs relative flex items-center justify-center ${colorClass} ${
                      isSelected ? 'ring-2 ring-accent border-accent scale-[1.01]' : 'hover:border-muted-foreground'
                    }`}
                  >
                    <input
                      type="text"
                      value={btn.text || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newRows = activeRows.map((r, ri) =>
                          ri === rIdx
                            ? r.map((b, bi) => (bi === bIdx ? { ...b, text: val } : b))
                            : [...r]
                        );
                        commitRows(newRows);
                      }}
                      placeholder="Button Text"
                      className="w-full bg-transparent text-center font-medium text-xs outline-none cursor-text truncate"
                    />
                  </div>
                );
              })}

              {/* (+) Add sibling button to this row */}
              <button
                type="button"
                onClick={(e) => handleAddButtonToRow(rIdx, e)}
                className="p-2 rounded-xl border border-dashed border-border hover:border-accent text-muted hover:text-accent bg-surface transition-all shrink-0"
                title="Add button next to this row"
              >
                <Plus size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
