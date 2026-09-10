import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play, Terminal, MousePointerClick, MessageSquare } from 'lucide-react';

const ICON_MAP = {
  trigger_start: Play,
  trigger_command: Terminal,
  trigger_callback: MousePointerClick,
  trigger_message: MessageSquare
};

export default function TriggerNode({ data, selected, type }) {
  const Icon = ICON_MAP[type] || Play;
  const isStart = type === 'trigger_start';
  const commandText = data.command || (isStart ? '/start' : data.callback_data || 'Event');

  return (
    <div
      className={`min-w-[220px] rounded-xl border bg-surface/95 backdrop-blur-md shadow-lg transition-all ${
        selected ? 'border-accent ring-2 ring-accent/40 shadow-accent/10' : 'border-border hover:border-muted'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border/70 bg-surface-secondary/50 rounded-t-xl">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Icon size={15} />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Trigger</div>
          <div className="text-xs font-semibold text-foreground">
            {isStart ? 'Start Command (/start)' : type === 'trigger_command' ? 'Custom Command' : 'Button Click'}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-tertiary border border-border/50 text-[11px] font-mono text-foreground">
          <span>{commandText}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-muted">Telegram</span>
        </div>
      </div>

      {/* Output Handle: stationary, reliable */}
      <Handle
        type="source"
        position={Position.Right}
        id="exec"
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-surface cursor-crosshair"
      />
    </div>
  );
}
