import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { PlusCircle, MinusCircle, XCircle, DivideCircle } from 'lucide-react';

const MATH_ICONS = {
  math_add: { icon: PlusCircle, sym: '+', op: ['+', '-', '×', '÷'], color: 'text-sky-500 bg-sky-500/15 border-sky-500/30' },
  math_subtract: { icon: MinusCircle, sym: '-', op: ['-', '+', '×', '÷'], color: 'text-orange-500 bg-orange-500/15 border-orange-500/30' },
  math_multiply: { icon: XCircle, sym: '×', op: ['×', '+', '-', '÷'], color: 'text-indigo-500 bg-indigo-500/15 border-indigo-500/30' },
  math_divide: { icon: DivideCircle, sym: '÷', op: ['÷', '+', '-', '×'], color: 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30' }
};

export default function MathNode({ data, selected, type }) {
  const { setNodes } = useReactFlow();
  const conf = MATH_ICONS[type] || MATH_ICONS.math_add;
  const Icon = conf.icon;

  const update = (field, value) => setNodes(nds => nds.map(n => n.id === data.id ? { ...n, data: { ...n.data, [field]: value } } : n));

  const a = data.input_a || '';
  const b = data.input_b || '';
  const op = data.operator || conf.sym;
  const out = data.output_variable || 'result';

  return (
    <div className={`min-w-[300px] rounded-xl border bg-surface shadow-lg transition-all ${selected ? 'border-sky-500 ring-2 ring-sky-500/40' : 'border-border hover:border-muted'}`}>
      {/* Input handle -> connects to output circle by default flow */}
      <Handle type="target" position={Position.Left} id="exec" className="!w-3 !h-3 !bg-sky-500 !border-2 !border-surface cursor-crosshair" />

      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border bg-surface-secondary/50 rounded-t-xl">
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${conf.color}`}>
          <Icon size={15} />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Math Operation</div>
          <div className="text-xs font-semibold text-foreground">{conf.sym} Math</div>
        </div>
        <span className="ms-auto text-[9px] px-2 py-0.5 rounded-full bg-surface text-muted border border-border font-mono">{out}</span>
      </div>

      {/* A [op] B */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <input type="text" value={a} onChange={e => update('input_a', e.target.value)} placeholder="A"
            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-surface-secondary border border-border text-xs font-mono text-foreground text-center outline-none focus:border-sky-500" />
          <select value={op} onChange={e => update('operator', e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-surface-secondary border border-border text-xs font-black text-foreground outline-none focus:border-sky-500">
            {conf.op.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <input type="text" value={b} onChange={e => update('input_b', e.target.value)} placeholder="B"
            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-surface-secondary border border-border text-xs font-mono text-foreground text-center outline-none focus:border-sky-500" />
        </div>
        <input type="text" value={out} onChange={e => update('output_variable', e.target.value)} placeholder="Output variable (e.g. result)"
          className="w-full px-2.5 py-1.5 rounded-lg bg-surface-tertiary border border-border text-[11px] font-mono text-foreground outline-none focus:border-sky-500" />
      </div>

      {/* Output circle */}
      <Handle type="source" position={Position.Right} id="exec" className="!w-3 !h-3 !bg-sky-500 !border-2 !border-surface cursor-crosshair" />
    </div>
  );
}