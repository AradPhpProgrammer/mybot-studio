import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { useI18n } from '../../locales/i18n';

const OPERATORS = ['>', '<', '>=', '<=', '==', '!=', 'and', 'or'];

export default function ConditionNode({ data, selected }) {
  const { t } = useI18n();
  const { setNodes } = useReactFlow();

  const update = (field, value) => setNodes(nds => nds.map(n => n.id === data.id ? { ...n, data: { ...n.data, [field]: value } } : n));

  const op = data.operator || '>=';
  const a = data.input_a !== undefined ? data.input_a : '';
  const b = data.input_b !== undefined ? data.input_b : '';

  return (
    <div className={`min-w-[340px] rounded-xl border bg-surface shadow-lg transition-all ${selected ? 'border-amber-500 ring-2 ring-amber-500/40' : 'border-border hover:border-muted'}`}>
      <Handle type="target" position={Position.Left} id="exec" className="!w-3 !h-3 !bg-amber-500 !border-2 !border-surface cursor-crosshair" />

      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border bg-surface-secondary/50 rounded-t-xl">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
          <GitBranch size={15} />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-amber-500">Branch (IF)</div>
          <div className="text-xs font-semibold text-foreground">{t('nodes.action_condition.name')}</div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <input type="text" value={a} onChange={e => update('input_a', e.target.value)} placeholder="Input A"
            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-surface-secondary border border-border text-xs font-mono text-foreground outline-none focus:border-amber-500" />
          <select value={op} onChange={e => update('operator', e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-surface-secondary border border-border text-xs font-mono text-foreground outline-none focus:border-amber-500">
            {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <input type="text" value={b} onChange={e => update('input_b', e.target.value)} placeholder="Input B"
            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-surface-secondary border border-border text-xs font-mono text-foreground outline-none focus:border-amber-500" />
        </div>
        <div className="px-2.5 py-1.5 rounded-lg bg-surface-tertiary border border-border text-[11px] font-mono text-foreground text-center">
          {a || 'A'} {op} {b || 'B'}
        </div>
      </div>

      {/* TRUE / FALSE forked output handles on separate edges */}
      <div className="relative pb-6">
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-4">
          <Handle type="source" position={Position.Right} id="true" className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-surface cursor-crosshair relative" />
          <Handle type="source" position={Position.Right} id="false" className="!w-3 !h-3 !bg-rose-500 !border-2 !border-surface cursor-crosshair relative" />
        </div>
        <div className="flex justify-end pr-6 text-[9px] font-bold">
          <div className="flex flex-col gap-4">
            <span className="text-emerald-500 text-right">TRUE</span>
            <span className="text-rose-500 text-right">FALSE</span>
          </div>
        </div>
      </div>
    </div>
  );
}