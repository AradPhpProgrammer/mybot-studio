import React, { useLayoutEffect, useRef, useState } from 'react';
import { useUpdateNodeInternals } from '@xyflow/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '../../locales/i18n';

// Presentation state only: collapsing never rewrites graph data or connections.
const FOLD_KEY = 'mybot_node_folds';
let collapsedByNode = (() => { try { return new Map(Object.entries(JSON.parse(localStorage.getItem(FOLD_KEY) || '{}'))); } catch { return new Map(); } })();
const WIDTH_KEY = 'mybot_node_fold_widths';
const widthsByNode = (() => { try { return JSON.parse(localStorage.getItem(WIDTH_KEY) || '{}'); } catch { return {}; } })();
const persistFolds = () => { try { localStorage.setItem(FOLD_KEY, JSON.stringify(Object.fromEntries(collapsedByNode))); } catch {} };

export function collapsibleNode(Component) {
  return function CollapsibleNode(props) {
    const { t } = useI18n();
    const [collapsed, setCollapsed] = useState(() => collapsedByNode.get(props.id) || false);
    const [width, setWidth] = useState(() => widthsByNode[props.id] || null);
    const content = useRef(null);
    const updateInternals = useUpdateNodeInternals();
    const previousCollapsed = useRef(collapsed);
    useLayoutEffect(() => {
      if (previousCollapsed.current !== collapsed) updateInternals(props.id);
      previousCollapsed.current = collapsed;
    }, [collapsed, props.id, updateInternals]);
    const data = props.data || {};
    const summary = data.text || data.command || data.url || data.callback_data ||
      (data.buttons || []).flat().map(button => button.text).filter(Boolean).join(' · ') ||
      data.output_variable || t(`nodes.${props.type === 'action_reply_keyboard' ? 'action_keyboard' : props.type}.desc`);
    return <div className={`node-fold-shell ${collapsed ? 'node-folded' : ''}`} style={collapsed && width ? { width } : undefined}>
      <div ref={content} className="node-fold-content"><Component {...props} /></div>
      {collapsed && <div className="node-fold-summary custom-drag-handle bg-surface border border-border rounded-xl px-3 py-2 text-foreground">
        <div className="text-xs font-semibold">{t(`nodes.${props.type === 'action_reply_keyboard' ? 'action_keyboard' : props.type}.name`)}</div>
        <div className="text-[11px] text-muted truncate mt-1">{summary}</div>
      </div>}
      <button type="button" data-node-collapse aria-expanded={!collapsed}
        aria-label={t(collapsed ? 'canvas.expand_node' : 'canvas.collapse_node')}
        title={t(collapsed ? 'canvas.expand_node' : 'canvas.collapse_node')}
        className="nodrag nopan node-fold-toggle bg-surface-secondary border border-border text-muted hover:text-foreground hover:bg-surface-tertiary focus-visible:ring-2 focus-visible:ring-focus node-fold-toggle-shadow-none"
        onClick={event => { event.stopPropagation(); if (!collapsed) { const nextWidth = content.current.offsetWidth; setWidth(nextWidth); widthsByNode[props.id] = nextWidth; try { localStorage.setItem(WIDTH_KEY, JSON.stringify(widthsByNode)); } catch {} } setCollapsed(value => { collapsedByNode.set(props.id, !value); persistFolds(); return !value; }); }}>
        {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
    </div>;
  };
}
