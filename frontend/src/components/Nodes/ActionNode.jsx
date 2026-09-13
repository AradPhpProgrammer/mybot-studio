import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Database, Clock, Globe, BellRing } from 'lucide-react';

export default function ActionNode({ data, selected, type }) {
  const { setNodes } = useReactFlow();
  const update = (field, value) => setNodes(nds => nds.map(n => n.id === data.id ? { ...n, data: { ...n.data, [field]: value } } : n));

  const isHttp = type === 'action_http_request';
  const isDelay = type === 'action_delay';
  const isVar = type === 'action_set_variable';
  const isCallback = type === 'action_answer_callback';

  const iconColor = isHttp ? 'text-purple-500 bg-purple-500/15 border-purple-500/30'
    : isDelay ? 'text-indigo-500 bg-indigo-500/15 border-indigo-500/30'
    : isCallback ? 'text-blue-500 bg-blue-500/15 border-blue-500/30'
    : 'text-purple-500 bg-purple-500/15 border-purple-500/30';
  const Icon = isHttp ? Globe : isDelay ? Clock : isCallback ? BellRing : Database;

  return (
    <div className={`min-w-[260px] rounded-xl border bg-surface shadow-lg transition-all ${selected ? 'border-purple-500 ring-2 ring-purple-500/40' : 'border-border hover:border-muted'}`}>
      <Handle type="target" position={Position.Left} id="exec" className="!w-3 !h-3 !bg-purple-500 !border-2 !border-surface cursor-crosshair" />

      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border bg-surface-secondary/50 rounded-t-xl">
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${iconColor}`}>
          <Icon size={15} />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Action</div>
          <div className="text-xs font-semibold text-foreground">
            {isHttp ? 'HTTP Request' : isDelay ? 'Delay / Wait' : isVar ? 'Set Variable' : 'Answer Callback'}
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {isHttp && (
          <>
            <select value={data.method || 'GET'} onChange={e => update('method', e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] font-mono text-foreground outline-none focus:border-purple-500">
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input type="text" value={data.url || ''} onChange={e => update('url', e.target.value)} placeholder="https://api.example.com..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] font-mono text-foreground outline-none focus:border-purple-500" />
            <input type="text" value={data.output_variable || ''} onChange={e => update('output_variable', e.target.value)} placeholder="Output variable (e.g. api_response)"
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-tertiary border border-border text-[11px] font-mono text-foreground outline-none focus:border-purple-500" />
          </>
        )}
        {isDelay && (
          <div className="flex items-center gap-2">
            <input type="number" min="0" max="10" value={data.seconds || 1} onChange={e => update('seconds', Number(e.target.value))}
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] font-mono text-foreground outline-none focus:border-indigo-500" />
            <span className="text-[11px] text-muted">seconds</span>
          </div>
        )}
        {isVar && (
          <>
            <div className="flex items-center gap-2">
              <input type="text" value={data.variable_name || ''} onChange={e => update('variable_name', e.target.value)} placeholder="Variable name"
                className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] font-mono text-foreground outline-none focus:border-purple-500" />
              <select value={data.operation || 'set'} onChange={e => update('operation', e.target.value)}
                className="px-2 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] text-foreground outline-none focus:border-purple-500">
                {['set', 'add', 'subtract', 'toggle'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <input type="text" value={data.value || ''} onChange={e => update('value', e.target.value)} placeholder="Value"
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-tertiary border border-border text-[11px] font-mono text-foreground outline-none focus:border-purple-500" />
          </>
        )}
        {isCallback && (
          <>
            <input type="text" value={data.text || ''} onChange={e => update('text', e.target.value)} placeholder="Alert text"
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] text-foreground outline-none focus:border-blue-500" />
            <label className="flex items-center gap-2 text-[11px] text-foreground">
              <input type="checkbox" checked={!!data.show_alert} onChange={e => update('show_alert', e.target.checked)} className="accent-blue-500" />
              Show as popup alert
            </label>
          </>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="exec" className="!w-3 !h-3 !bg-purple-500 !border-2 !border-surface cursor-crosshair" />
    </div>
  );
}