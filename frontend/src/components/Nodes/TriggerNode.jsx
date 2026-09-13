import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Play, Terminal, MousePointerClick, MessageSquare } from 'lucide-react';

const ICON_MAP = { trigger_start: Play, trigger_command: Terminal, trigger_callback: MousePointerClick, trigger_message: MessageSquare };

export default function TriggerNode({ id, data, selected, type }) {
  const { setNodes } = useReactFlow();
  const Icon = ICON_MAP[type] || Play;
  const isStart = type === 'trigger_start';
  const isCommand = type === 'trigger_command';

  const nodeId = id || data?.id;
  const update = (field, value) => setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n));

  const cmd = isCommand ? (data.command || '') : (isStart ? '/start' : (data.callback_data || 'btn_action'));

  return (
    <div className={`min-w-[230px] rounded-xl border bg-surface shadow-lg transition-all ${selected ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-border hover:border-muted'}`}>
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border bg-surface-secondary/50 rounded-t-xl">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
          <Icon size={15} />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-500">Trigger</div>
          <div className="text-xs font-semibold text-foreground">{isStart ? 'Start (/start)' : isCommand ? 'Command' : 'Button Click'}</div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {isCommand || isStart ? (
          <input type="text" value={cmd} onChange={e => update('command', e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] font-mono text-foreground outline-none focus:border-emerald-500" />
        ) : (
          <input type="text" value={cmd} onChange={e => update('callback_data', e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] font-mono text-foreground outline-none focus:border-emerald-500" />
        )}
        {isCommand && (
          <input type="text" value={data.description || ''} onChange={e => update('description', e.target.value)} placeholder="Description (Telegram menu)"
            className="w-full px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] text-foreground outline-none focus:border-emerald-500" />
        )}
      </div>

      <Handle type="source" position={Position.Right} id="exec" className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-surface cursor-crosshair" />
    </div>
  );
}