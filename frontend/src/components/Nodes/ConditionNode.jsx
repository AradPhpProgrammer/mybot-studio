import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch, Check, X } from 'lucide-react';

export default function ConditionNode({ data, selected }) {
  return (
    <div
      className={`min-w-[240px] rounded-xl border bg-surface/95 backdrop-blur-md shadow-lg transition-all duration-200 ${
        selected ? 'border-accent ring-2 ring-accent/40 shadow-accent/10' : 'border-border hover:border-muted'
      }`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="exec"
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-surface transition-transform hover:scale-125"
      />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border/70 bg-surface-secondary/50 rounded-t-xl">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
          <GitBranch size={15} />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-amber-500">Condition (IF)</div>
          <div className="text-xs font-semibold text-foreground">شرط منطقی</div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="px-2.5 py-1.5 rounded-lg bg-surface-tertiary border border-border/50 text-[11px] font-mono text-foreground truncate">
          if {data.condition || 'true'}
        </div>
      </div>

      {/* Output Handles (True / False) */}
      <div className="relative">
        <Handle
          type="source"
          position={Position.Right}
          id="true"
          style={{ top: '30%' }}
          className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-surface transition-transform hover:scale-125"
        />
        <div className="absolute right-4 text-[9px] font-bold text-emerald-500" style={{ top: '15%' }}>
          TRUE
        </div>

        <Handle
          type="source"
          position={Position.Right}
          id="false"
          style={{ top: '70%' }}
          className="!w-3 !h-3 !bg-rose-500 !border-2 !border-surface transition-transform hover:scale-125"
        />
        <div className="absolute right-4 text-[9px] font-bold text-rose-500" style={{ top: '55%' }}>
          FALSE
        </div>
      </div>
    </div>
  );
}
