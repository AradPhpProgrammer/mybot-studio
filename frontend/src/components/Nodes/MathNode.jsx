import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { PlusCircle, MinusCircle, XCircle, DivideCircle } from 'lucide-react';

const MATH_ICONS = {
  math_add: { icon: PlusCircle, sym: '+', label: 'Add (+)', color: 'text-sky-400 bg-sky-500/15 border-sky-500/30' },
  math_subtract: { icon: MinusCircle, sym: '-', label: 'Subtract (-)', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
  math_multiply: { icon: XCircle, sym: '×', label: 'Multiply (×)', color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30' },
  math_divide: { icon: DivideCircle, sym: '÷', label: 'Divide (÷)', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' }
};

export default function MathNode({ data, selected, type }) {
  const conf = MATH_ICONS[type] || MATH_ICONS.math_add;
  const Icon = conf.icon;

  const a = data.input_a !== undefined && data.input_a !== '' ? data.input_a : 'A';
  const b = data.input_b !== undefined && data.input_b !== '' ? data.input_b : 'B';
  const out = data.output_variable || 'result';

  return (
    <div
      className={`min-w-[220px] rounded-xl border bg-surface/95 backdrop-blur-md shadow-lg transition-all ${
        selected ? 'border-accent ring-2 ring-accent/40 shadow-accent/10' : 'border-border hover:border-muted'
      }`}
    >
      {/* Input Handle (stationary, no jitter) */}
      <Handle
        type="target"
        position={Position.Left}
        id="exec"
        className="!w-3 !h-3 !bg-sky-500 !border-2 !border-surface cursor-crosshair"
      />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border/70 bg-surface-secondary/50 rounded-t-xl">
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${conf.color}`}>
          <Icon size={15} />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Math Operation</div>
          <div className="text-xs font-semibold text-foreground">{conf.label}</div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="px-2.5 py-1.5 rounded-lg bg-surface-tertiary border border-border/50 text-[11px] font-mono text-foreground flex items-center justify-between">
          <span>{out} = {a} {conf.sym} {b}</span>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="exec"
        className="!w-3 !h-3 !bg-sky-500 !border-2 !border-surface cursor-crosshair"
      />
    </div>
  );
}
