import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import en from '../../locales/en.json';
import fa from '../../locales/fa.json';
import { useI18n } from '../../locales/i18n';

// Variable list is defined centrally in the locale JSON files (locales.*.variables)
// so names and descriptions are translated and extended without touching component code.
const VARIABLE_ORDER = [
  'first_name', 'last_name', 'username', 'user_id', 'chat_id', 'message_id',
  'callback_data', 'payload', 'date', 'balance', 'ref_code', 'referrer',
  'inviter_id', 'deep_link', 'bot_name', 'bot_username', 'starts', 'last_seen',
  'day', 'hour', 'now', 'random'
];

const VARIABLE_DESCS = { en, fa };
const DEFAULT_LANG = 'en';

export function buildVariables(lang = DEFAULT_LANG) {
  const dict = VARIABLE_DESCS[lang] || VARIABLE_DESCS[DEFAULT_LANG];
  const vars = dict?.variables || VARIABLE_DESCS[DEFAULT_LANG].variables || {};
  return VARIABLE_ORDER
    .filter((k) => k in vars)
    .map((key) => ({ key, desc: vars[key] }));
}

// Default English list (kept for non-hook consumers like KeyboardEditor)
export const BUILTIN_VARIABLES = buildVariables(DEFAULT_LANG);

// Regex matches a $var token at the current caret or whole text
export function extractDollarTokens(text) {
  const tokens = [];
  const re = /\$([A-Za-z_][A-Za-z0-9_]*)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    tokens.push({ name: m[1], index: m.index });
  }
  return tokens;
}

// Renders text with $$ escaped and $var colored orange (used in preview)
export function renderHighlighted(text) {
  if (!text) return [];
  const sections = [];
  let last = 0;
  const re = /\$\$|\$([A-Za-z_][A-Za-z0-9_]*)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) sections.push({ text: text.slice(last, m.index) });
    if (m[0] === '$$') {
      sections.push({ text: '$' }); // literal
    } else {
      sections.push({ text: m[0], highlight: true, name: m[1] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) sections.push({ text: text.slice(last) });
  return sections;
}

/**
 * VS Code-like variable textarea (type "$" for a suggestion dropdown).
 * Fully keyboard accessible: ArrowUp/Down navigate, Enter/Tab accepts,
 * mouse click + hover glow, dark-mode safe, and blocks canvas pan/zoom
 * while typing. Typing "$..." inserts "$first_name" etc.
 */
export default function VariableTextArea({ value, onChange, placeholder, className, rows, onEnter, onSelect }) {
  const { lang } = useI18n();
  const taRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [selIndex, setSelIndex] = useState(0);
  // Portal position computed from the textarea rect so the popup breaks out of any scroll container
  const [portalPos, setPortalPos] = useState({ x: 0, y: 0 });

  const activeVariables = buildVariables(lang);
  const filtered = activeVariables.filter(
    (v) => v.key.includes(filter) || (v.desc && v.desc.toLowerCase().includes(filter.toLowerCase()))
  );

  useEffect(() => {
    if (open) {
      // Bring highlighted item into view
      const list = typeof document !== 'undefined' ? document.getElementById('var-suggest-list') : null;
      const item = list?.children[selIndex];
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, selIndex, filtered.length]);

  const saveCaret = async () => {
    // Compute exact screen rect so the portal can sit flush above/below
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Prefer opening ABOVE the input; only fall back below when there isn't
      // enough viewport space above (popup approx 260px tall).
      const above = r.top > 300;
      setPortalPos({
        x: Math.min(r.left, window.innerWidth - 360),
        y: above ? r.top - 8 : r.bottom + 6,
      });
    });
  };

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    const caretPos = e.target.selectionStart || 0;
    const before = v.slice(0, caretPos);
    const m = before.match(/\$([A-Za-z0-9_]*)$/);
    if (m) {
      setFilter(m[1]);
      setOpen(true);
      setSelIndex(0);
      saveCaret(e.target);
    } else {
      setOpen(false);
    }
  };

  const handleKeyDown = (e) => {
    // Block canvas pan/zoom while popup is open & avoid propagation
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
      if (e.key === 'Enter') {
        e.preventDefault();
        insertVar(filtered[selIndex].key);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        insertVar(filtered[selIndex].key);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }

    // Only call onEnter when multiline behavior lets us (Enter without popup)
    if (e.key === 'Enter' && onEnter) {
      onEnter(e);
    }
  };

  const insertVar = (key) => {
    if (!taRef.current) return;
    const el = taRef.current;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const tokenRemoved = before.replace(/\$[A-Za-z0-9_]*$/, '');
    const newVal = tokenRemoved + '$' + key + after;
    onChange(newVal);
    setOpen(false);
    requestAnimationFrame(() => {
      el.focus();
      const pos = (tokenRemoved + '$' + key).length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="relative">
      <textarea
        ref={taRef}
        rows={rows || 3}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={onSelect}
        onKeyUp={(e) => {
          e.stopPropagation();
          onSelect?.(e);
        }}
        onMouseUp={(e) => {
          onSelect?.(e);
        }}
        onWheel={(e) => e.stopPropagation()}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={
          className ||
          'w-full bg-surface-secondary border border-border rounded-xl p-2.5 text-xs text-foreground placeholder:text-field-placeholder outline-none focus:border-accent resize-none font-sans'
        }
      />

      {open && filtered.length > 0 &&
        createPortal(
          <div
            className="fixed z-[10000] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{ left: portalPos.x, top: portalPos.y, minWidth: 290, width: 'min(340px, 90vw)' }}
            onWheel={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-[10px] font-bold text-muted uppercase tracking-wider border-b border-border bg-surface-secondary/50 flex items-center justify-between">
              <span>
                Variables <span className="text-orange-400 font-mono">$</span>
              </span>
              <span className="text-[9px] font-normal text-muted/70">
                ↑↓ Enter Esc
              </span>
            </div>
            <div id="var-suggest-list" className="max-h-52 overflow-y-auto p-1">
              {filtered.map((v, i) => (
                <button
                  key={v.key}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    insertVar(v.key);
                  }}
                  onMouseEnter={() => setSelIndex(i)}
                  className={`w-full flex flex-col text-start px-3 py-1.5 rounded-lg transition-colors ${
                    i === selIndex
                      ? 'bg-accent/15 ring-1 ring-accent/40 text-foreground'
                      : 'hover:bg-surface-secondary text-foreground'
                  }`}
                >
                  <span className="text-xs font-mono text-orange-400">${v.key}</span>
                  <span className="text-[10px] text-muted">{v.desc}</span>
                </button>
              ))}
            </div>
            <div className="px-3 py-1 text-[9px] text-muted border-t border-border">
              Tip: type <span className="font-mono text-orange-400">$$</span> for a literal dollar sign
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

/** Renders highlighted text as React nodes with orange $vars. */
export function HighlightedText({ text }) {
  const parts = renderHighlighted(text);
  return (
    <>
      {parts.map((p, i) =>
        p.highlight ? (
          <span key={i} className="text-orange-400 font-semibold">
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}