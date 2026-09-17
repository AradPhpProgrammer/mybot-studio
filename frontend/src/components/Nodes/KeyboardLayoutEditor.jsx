import React, { useEffect, useRef, useState } from 'react';
import { Grid, Plus, Trash2, X, AlertTriangle, CheckCircle2, GripVertical, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import { moveKeyboardButton } from './keyboardMove.mjs';
import { keyboardConnectionStatus } from './keyboardGraph.mjs';

const motion = 'transition-colors duration-150 motion-reduce:transition-none';
const control = `rounded-lg border border-border bg-surface text-foreground hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-40 disabled:cursor-not-allowed ${motion}`;
const styles = { primary: 'var(--accent)', success: 'var(--success)', danger: 'var(--danger)', default: 'var(--border)' };

/** Separate inline/reply markup is intentional: text alone cannot determine it. */
export default function KeyboardLayoutEditor({ nodeId, data = {}, onChange, nodes = [], edges = [], embedded = false, knownIdentifiers = [], variant = 'full' }) {
  const { t } = useI18n();
  const compact = variant === 'compact';
  const label = (key, vars) => t(`nodes.action_keyboard.${key}`, vars);
  const source = embedded ? nodes.find(n => n.id === nodeId) : nodes.find(n => n.id === edges.find(e => e.target === nodeId)?.source);
  const isEdit = source?.type === 'action_edit_message';
  const keyboardType = data?.keyboard_type || (nodes.find(n => n.id === nodeId)?.type === 'action_reply_keyboard' ? 'reply' : 'inline');
  const connected = embedded ? !(isEdit && keyboardType === 'reply') : keyboardConnectionStatus({ id: nodeId, data: { ...data, keyboard_type: keyboardType } }, nodes, edges).valid;
  const buttons = Array.isArray(data?.buttons) ? data.buttons : [];
  const [position, setPosition] = useState(() => buttons[0]?.length ? { r: 0, c: 0 } : null);
  // Undo or another editor can restore fewer rows/columns than the selection.
  // Repair before the next pointer focus, otherwise its editor appears mid-drag.
  useEffect(() => {
    if (position && !buttons[position.r]?.[position.c]) {
      setPosition(buttons[0]?.length ? { r: 0, c: 0 } : null);
    }
  }, [buttons, position]);
  const active = position ? buttons[position.r]?.[position.c] : null;
  const drag = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dropTarget, setDropTarget] = useState(null);
  const [announcement, setAnnouncement] = useState('');

  const updateData = updates => onChange({ ...data, ...updates });
  const commit = next => updateData({ buttons: next });
  const newButton = number => ({ text: label('new_button', { number }), callback_data: `btn_${crypto.randomUUID().slice(0, 8)}`, style: 'default' });
  const addRow = () => {
    commit([...buttons, [newButton(1)]]);
    setPosition({ r: buttons.length, c: 0 });
  };
  const addToRow = r => {
    commit(buttons.map((row, i) => i === r ? [...row, newButton(row.length + 1)] : row));
    setPosition({ r, c: buttons[r].length });
  };
  const edit = (pos, field, value) => commit(buttons.map((row, r) => r === pos.r ? row.map((b, c) => c === pos.c ? { ...b, [field]: value } : b) : row));
  const remove = () => {
    commit(buttons.map((row, r) => r === position.r ? row.filter((_, c) => c !== position.c) : row).filter(row => row.length));
    setPosition(null);
  };
  const move = (from, to) => {
    const result = moveKeyboardButton(buttons, from, to);
    if (!result.position) return;
    commit(result.buttons);
    setPosition(result.position);
    setAnnouncement(label('moved', { row: result.position.r + 1, column: result.position.c + 1 }));
  };
  const clearDrag = () => { drag.current = null; setDragging(false); setDropTarget(null); };
  const beginDrag = (e, from) => {
    e.stopPropagation();
    drag.current = { from, rows: buttons };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', nodeId);
    setPosition(from);
    setDragging(true);
  };
  const over = (e, to) => {
    if (!drag.current || drag.current.rows !== buttons) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dropTarget?.r !== to.r || dropTarget?.c !== to.c) setDropTarget(to);
  };
  const drop = (e, to) => {
    if (!drag.current) return;
    e.preventDefault();
    e.stopPropagation();
    // Reject stale coordinates if a remote/editor update occurred during dragging.
    if (drag.current.rows === buttons) move(drag.current.from, to);
    clearDrag();
  };
  const cardTarget = (e, r, c) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { r, c: c + (e.clientX > rect.left + rect.width / 2 ? 1 : 0) };
  };
  const isTarget = (r, c) => dropTarget?.r === r && dropTarget?.c === c;
  const moves = active ? [
    { key: 'move_left', Icon: ArrowLeft, disabled: position.c === 0, to: { r: position.r, c: position.c - 1 } },
    { key: 'move_right', Icon: ArrowRight, disabled: position.c === buttons[position.r].length - 1, to: { r: position.r, c: position.c + 2 } },
    { key: 'move_up', Icon: ArrowUp, disabled: position.r === 0, to: { r: position.r - 1, c: Math.min(position.c, buttons[position.r - 1]?.length ?? 0) } },
    { key: 'move_down', Icon: ArrowDown, disabled: position.r === buttons.length - 1, to: { r: position.r + 1, c: Math.min(position.c, buttons[position.r + 1]?.length ?? 0) } },
  ] : [];

  return (
    <div data-keyboard-editor data-keyboard-variant={variant} data-graph-editor className={`min-w-0 w-full text-foreground ${compact ? '' : 'overflow-hidden rounded-2xl border border-border bg-surface-secondary'} ${motion}`}>
      <div className={compact ? "flex items-center justify-between flex-wrap gap-2 pb-3" : "flex items-center justify-between gap-3 px-3.5 py-3 border-b border-border bg-surface-tertiary rounded-t-2xl"}>
        {compact ? <span className="text-xs font-medium">{label('mode')}</span> : <div data-keyboard-heading className="flex items-center gap-2 min-w-0">
          <Grid size={18} className="text-accent shrink-0" aria-hidden="true" />
          <div>
            <div className="text-xs font-semibold">{t('nodes.action_keyboard.name')}</div>
            <div className="text-[11px] text-muted">{label(keyboardType === 'inline' ? 'inline' : 'reply')}</div>
          </div>
        </div>}
        <select data-graph-editor aria-label={label('mode')} value={keyboardType}
          onChange={e => { clearDrag(); updateData({ keyboard_type: e.target.value }); }}
          className={`keyboard-mode-select nodrag nopan nowheel max-w-[155px] px-2 py-1.5 text-[11px] ${control}`}>
          <option value="inline">{label('inline')}</option>
          <option value="reply">{label('reply')}</option>
        </select>
      </div>
      <div className={`nodrag nopan nowheel space-y-3 ${compact ? '' : 'p-3 max-h-[560px] overflow-y-auto overscroll-contain'}`}>
        {!compact && <>
        <div data-keyboard-connection className="flex items-start gap-2 p-2.5 rounded-xl border bg-surface-secondary text-[11px] leading-relaxed"
          style={{ borderColor: connected ? 'var(--success)' : 'var(--danger)' }}>
          {connected ? <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" aria-hidden="true" /> : <AlertTriangle size={14} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />}
          <span>{!connected && isEdit && keyboardType === 'reply' ? t('nodes.action_keyboard.reply_requires_send') : label(connected ? isEdit ? 'connected_edit' : 'connected_send' : 'must_follow_message')}</span>
        </div></>}
        {active && <div className="rounded-xl border border-border bg-surface-secondary p-3 space-y-3">
          {keyboardType === 'inline' && <label className="flex items-center gap-2 text-[11px]">
            <span className="shrink-0">{label('callback_id')}</span>
            <input data-graph-editor value={active.callback_data || ''} onChange={e => edit(position, 'callback_data', e.target.value)}
              list={`keyboard-ids-${variant}-${nodeId}`} placeholder={label('callback_placeholder')} dir="ltr" className={`min-w-0 w-full px-2 py-1.5 text-xs font-mono ${control}`} />
          </label>}
          <datalist id={`keyboard-ids-${variant}-${nodeId}`}>{knownIdentifiers.map(value => <option key={value} value={value} />)}</datalist>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div role="group" aria-label={label('color')} className="flex items-center gap-3 p-2 rounded-xl border border-border bg-surface">
              {Object.entries(styles).map(([style, color]) => <button key={style} type="button"
                aria-label={label(`color_${style}`)} title={label(`color_${style}`)} aria-pressed={(active.style || 'default') === style}
                onClick={() => edit(position, 'style', style)}
                style={{ backgroundColor: color, '--tw-ring-offset-color': 'var(--surface)' }}
                className={`w-6 h-6 rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ${motion} ${(active.style || 'default') === style ? 'ring-2 ring-foreground ring-offset-2' : 'hover:ring-2 hover:ring-muted hover:ring-offset-2'}`}>
                {style === 'default' && <X size={12} className="text-foreground" aria-hidden="true" />}
              </button>)}
            </div>
            <button type="button" title={label('delete_button')} aria-label={label('delete_button')} onClick={remove} className={`p-2 ${control}`}>
              <Trash2 size={15} className="text-danger" aria-hidden="true" />
            </button>
          </div>
          <div role="group" aria-label={label('reorder')} className="flex items-center flex-wrap gap-2">
            {moves.map(({ key, Icon, disabled, to }) => <button type="button" key={key} title={label(key)} aria-label={label(key)}
              disabled={disabled} onClick={() => move(position, to)} className={`p-2 ${control}`}><Icon size={14} aria-hidden="true" /></button>)}
            <button type="button" onClick={() => move(position, { r: buttons.length, c: 0 })}
              disabled={buttons.length === position.r + 1 && buttons[position.r].length === 1}
              className={`px-2 py-2 text-[10px] ${control}`}>{label('move_new_row')}</button>
          </div>
        </div>}
        {buttons.length === 0 ? <button type="button" onClick={addRow} className={`flex flex-col items-center justify-center gap-2 w-full h-24 border-dashed ${control}`}>
          <Plus size={20} aria-hidden="true" /><span className="text-xs">{label('add_first')}</span>
        </button> : <>
          {!compact && <p className="text-[11px] text-muted leading-relaxed">{label('drag_hint')}</p>}
          <div className="nowheel overflow-x-auto p-1 -m-1 space-y-2" dir="ltr">
            {buttons.map((row, r) => <div key={r} className="flex items-center gap-2 min-w-max"
              onDragOver={e => over(e, { r, c: row.length })} onDrop={e => drop(e, { r, c: row.length })}>
              {row.map((btn, c) => {
                const chosen = position?.r === r && position?.c === c;
                const color = styles[btn.style] || styles.default;
                return <div key={c} onClick={() => setPosition({ r, c })}
                  onDragOver={e => over(e, cardTarget(e, r, c))} onDrop={e => drop(e, cardTarget(e, r, c))}
                  style={{ borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 12%, var(--surface))` }}
                  className={`relative flex items-center w-[112px] min-w-[80px] grow rounded-xl border p-1 text-foreground ${motion} ${chosen ? 'ring-2 ring-focus' : ''}`}>
                  {isTarget(r, c) && <span aria-hidden="true" className="absolute -left-1.5 top-0 bottom-0 w-0.5 bg-accent rounded-full" />}
                  {c === row.length - 1 && isTarget(r, c + 1) && <span aria-hidden="true" className="absolute -right-1.5 top-0 bottom-0 w-0.5 bg-accent rounded-full" />}
                  <button type="button" draggable onDragStart={e => beginDrag(e, { r, c })} onDragEnd={clearDrag}
                    aria-label={label('drag_button', { number: c + 1, row: r + 1 })} title={label('drag_button', { number: c + 1, row: r + 1 })}
                    onFocus={() => setPosition({ r, c })}
                    className={`shrink-0 p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${motion}`}>
                    <GripVertical size={13} className="text-muted" aria-hidden="true" />
                  </button>
                  <input data-graph-editor value={btn.text || ''} onFocus={() => setPosition({ r, c })} onChange={e => edit({ r, c }, 'text', e.target.value)}
                    aria-label={label('button_text', { number: c + 1, row: r + 1 })} placeholder={label('button_placeholder')} dir="auto"
                    className="w-full min-w-0 bg-transparent text-center text-[11px] py-1.5 outline-none rounded focus-visible:ring-1 focus-visible:ring-focus" />
                </div>;
              })}
              <button type="button" onClick={() => addToRow(r)} title={label('add_to_row', { row: r + 1 })} aria-label={label('add_to_row', { row: r + 1 })}
                className={`p-2 shrink-0 border-dashed ${control}`}><Plus size={13} aria-hidden="true" /></button>
            </div>)}
          </div>
          <button type="button" onClick={addRow} onDragOver={e => over(e, { r: buttons.length, c: 0 })} onDrop={e => drop(e, { r: buttons.length, c: 0 })}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[11px] border-dashed ${control} ${isTarget(buttons.length, 0) ? 'ring-2 ring-focus' : ''}`}>
            <Plus size={14} aria-hidden="true" />{label(dragging ? 'drop_new_row' : 'add_row')}
          </button>
        </>}
        <span role="status" aria-live="polite" className="sr-only">{announcement}</span>
      </div>
    </div>
  );
}
