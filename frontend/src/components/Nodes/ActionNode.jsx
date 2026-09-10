import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Database, Clock, Globe, BellRing, Settings } from 'lucide-react';

const ACTION_ICONS = {
  action_set_variable: Database,
  action_delay: Clock,
  action_http_request: Globe,
  action_answer_callback: BellRing
};

export default function ActionNode({ data, selected, type }) {
  const Icon = ACTION_ICONS[type] || Settings;

  let title = 'Action';
  let detail = '';

  if (type === 'action_set_variable') {
    title = 'Set Variable';
    detail = `${data.variable_name || 'var'} ${data.operation === 'add' ? '+=' : '='} ${data.value || 0}`;
  } else if (type === 'action_delay') {
    title = 'Delay';
    detail = `Wait ${data.seconds || 1}s`;
  } else if (type === 'action_http_request') {
    title = 'HTTP Request';
    detail = `${data.method || 'POST'} ${data.url || ''}`;
  } else if (type === 'action_answer_callback') {
    title = 'Answer Callback';
    detail = data.text || 'Notification';
  }

  return (
    <div
      className={`min-w-[220px] rounded-xl border bg-surface/95 backdrop-blur-md shadow-lg transition-all duration-200 ${
        selected ? 'border-accent ring-2 ring-accent/40 shadow-accent/10' : 'border-border hover:border-muted'
      }`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="exec"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-surface transition-transform hover:scale-125"
      />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border/70 bg-surface-secondary/50 rounded-t-xl">
        <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-500">
          <Icon size={15} />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-purple-500">Operation</div>
          <div className="text-xs font-semibold text-foreground">{title}</div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="px-2.5 py-1.5 rounded-lg bg-surface-tertiary border border-border/50 text-[11px] font-mono text-foreground truncate">
          {detail}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="exec"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-surface transition-transform hover:scale-125"
      />
    </div>
  );
}
