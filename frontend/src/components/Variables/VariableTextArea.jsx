import React, { useRef, useState, useLayoutEffect } from 'react';

// Built-in Telegram user variables shown when user types "$"
export const BUILTIN_VARIABLES = [
  { key: 'first_name', label: 'First name', desc: "User's first name (e.g. Arad)" },
  { key: 'last_name', label: 'Last name', desc: "User's last name (optional)" },
  { key: 'username', label: 'Username', desc: "User's @username (no @)" },
  { key: 'user_id', label: 'User ID', desc: 'Numeric Telegram user ID' },
  { key: 'id', label: 'User ID (alias)', desc: 'Numeric Telegram user ID' },
  { key: 'name', label: 'Name', desc: 'First name alias' },
  { key: 'language', label: 'Language', desc: "User's app language code" },
  { key: 'balance', label: 'User balance', desc: 'Variable: balance (if set)' },
];

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
  // Protect $$ -> literal $
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
 * Variable textarea (VS Code-like): type "$" to open a suggestion dropdown
 * of builtin variables. Typing inserts $first_name etc.
 * Textarea shows plain text; a rendered preview shows orange $vars.
 */
export default function VariableTextArea({ value, onChange, placeholder, className, rows }) {
  const taRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [caret, setCaret] = useState({ x: 0, y: 0 });
  const [selIndex, setSelIndex] = useState(0);

  const filtered = BUILTIN_VARIABLES.filter(v => v.key.includes(filter) || v.label.toLowerCase().includes(filter));

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    // Detect "$" + word after caret to open menu
    const caretPos = e.target.selectionStart || 0;
    const before = v.slice(0, caretPos);
    const m = before.match(/\$([A-Za-z0-9_]*)$/);
    if (m) {
      setFilter(m[1]);
      setOpen(true);
      setSelIndex(0);
      // Rough position: bottom of textarea
      const r = e.target.getBoundingClientRect();
      setCaret({ x: r.left + 20, y: r.bottom - 60 });
    } else {
      setOpen(false);
    }
  };

  const insertVar = (key) => {
    if (!taRef.current) return;
    const el = taRef.current;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const before = value.slice(0, start);
    const after = value.slice(end);
    // Remove partial typed "$fil..." token before caret
    const tokenRemoved = before.replace(/\$[A-Za-z0-9_]*$/, '');
    const newVal = tokenRemoved + '$' + key + after;
    onChange(newVal);
    setOpen(false);
    // Move caret after inserted token
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
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={className || 'w-full bg-surface-secondary border border-border rounded-xl p-2.5 text-xs text-foreground placeholder:text-field-placeholder outline-none focus:border-accent resize-none font-sans'}
      />
      {open && (
        <div
          className="absolute z-50 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ left: caret.x, top: caret.y, minWidth: 260, maxWidth: 320 }}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-muted uppercase tracking-wider border-b border-border bg-surface-secondary/50">
            Variables <span className="text-orange-400 font-mono">$</span>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 && <div className="p-3 text-xs text-muted">No matching variable. Use {"$$"} for a literal $.</div>}
            {filtered.map((v, i) => (
              <button
                key={v.key}
                onMouseDown={(e) => { e.preventDefault(); insertVar(v.key); }}
                onMouseEnter={() => setSelIndex(i)}
                className={`w-full flex flex-col text-start px-3 py-1.5 rounded-lg transition-colors ${i === selIndex ? 'bg-surface-secondary' : 'hover:bg-surface-secondary'}`}
              >
                <span className="text-xs font-mono text-orange-400">${v.key}</span>
                <span className="text-[10px] text-muted">{v.desc}</span>
              </button>
            ))}
          </div>
          <div className="px-3 py-1 text-[9px] text-muted border-t border-border">
            Tip: type {"$$"} for a literal dollar sign
          </div>
        </div>
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
          <span key={i} className="text-orange-400 font-semibold">{p.text}</span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}