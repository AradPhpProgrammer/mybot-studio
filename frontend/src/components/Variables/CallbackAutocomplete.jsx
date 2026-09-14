import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Known callback_data patterns for quick suggestions while typing a button event name
const COMMON_CALLBACKS = [
  'btn_about', 'btn_help', 'btn_back', 'btn_menu', 'btn_start', 'btn_buy',
  'btn_cancel', 'btn_confirm', 'btn_next', 'btn_prev', 'btn_settings',
  'btn_profile', 'btn_claim', 'btn_balance', 'btn_price', 'btn_invite',
  'btn_support', 'menu_main', 'menu_help', 'menu_settings', 'menu_profile',
  'btn_yes', 'btn_no', 'btn_retry', 'btn_more', 'btn_share', 'btn_subscribe'
];

function slugify(text) {
  if (!text || !text.trim()) return '';
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/**
 * Text input that suggests known button/callback event names as the user types.
 * Suggestions appear in a portal ABOVE the input so they are never clipped by
 * scroll containers or node boundaries. Keyboard: ↑↓ + Enter/Tab to accept.
 */
export default function CallbackAutocomplete({ value, onChange, placeholder, className, aside }) {
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [selIndex, setSelIndex] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0, width: 260 });

  const { suggestions } = aside || {};
  const pool = Array.from(new Set([
    ...COMMON_CALLBACKS,
    ...(suggestions || []),
    slugify(value) && slugify(value),
  ].filter(Boolean)));

  const filtered = pool.filter((s) => s !== value && s.toLowerCase().includes(filter.toLowerCase()));

  // Reposition portal above the input, clamped to viewport
  const reposition = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.max(240, Math.min(r.width, 320));
    const estH = Math.min(filtered.length, 6) * 30 + 30;
    const aboveSpace = r.top;
    const belowSpace = window.innerHeight - r.bottom;
    const x = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    const y = aboveSpace >= estH + 10 ? r.top - estH - 8 : r.bottom + 6;
    setPos({ x, y, width: w });
  };

  useEffect(() => {
    if (open) {
      requestAnimationFrame(reposition);
      const list = document.getElementById('callbacks-suggest-list');
      list?.children[selIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, selIndex, filtered.length, filter]);

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
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (open && filtered.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelIndex((i) => (i + 1) % filtered.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelIndex((i) => (i - 1 + filtered.length) % filtered.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); if (filtered[selIndex]) pick(filtered[selIndex]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onWheel={(e) => e.stopPropagation()}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={className}
      />

      {open && filtered.length > 0 &&
        createPortal(
          <div
            className="fixed z-[10000] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{ left: pos.x, top: pos.y, width: pos.width }}
            onWheel={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-[9px] font-bold text-muted uppercase tracking-wider border-b border-border bg-surface-secondary/50 flex items-center justify-between">
              <span>Callback / Event</span>
              <span className="text-[8px] font-normal text-muted/70">↑↓ Enter</span>
            </div>
            <div id="callbacks-suggest-list" className="max-h-44 overflow-y-auto p-1">
              {filtered.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); pick(s); }}
                  onMouseEnter={() => setSelIndex(i)}
                  className={`w-full text-start px-2.5 py-1.5 rounded text-[11px] font-mono transition-colors ${
                    i === selIndex
                      ? 'bg-accent/15 ring-1 ring-accent/40 text-foreground'
                      : 'hover:bg-surface-secondary text-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}