import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Database, Clock, Globe, BellRing } from 'lucide-react';
import { useI18n } from '../../locales/i18n';

export default function ActionNode({ id, data, selected, type }) {
  const { t } = useI18n();
  const { setNodes } = useReactFlow();
  const nodeId = id || data?.id;
  const update = (field, value) => setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n));

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

      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border bg-surface-secondary/50 rounded-t-xl cursor-grab active:cursor-grabbing custom-drag-handle">
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${iconColor}`}>
          <Icon size={15} />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
            {t('sidebar.actions')}
          </div>
          <div className="text-xs font-semibold text-foreground">
            {isHttp
              ? (t('nodes.action_http_request.name'))
              : isDelay
              ? (t('nodes.action_delay.name'))
              : isVar
              ? (t('nodes.action_set_variable.name'))
              : (t('nodes.action_answer_callback.name'))}
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2.5 nodrag nopan">
        {isHttp && (
          <>
            <div className="text-[10px] text-muted flex items-center justify-between">
              <span>{t('nodes.action_http_request.desc')}</span>
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                ${data.output_variable || 'http_response'}
              </span>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted font-medium">{t('inspector.operation')}</label>
              <select value={data.method || 'GET'} onChange={e => update('method', e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] font-mono text-foreground outline-none focus:border-purple-500">
                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted font-medium">{t('inspector.url')}</label>
              <input type="text" value={data.url || ''} onChange={e => update('url', e.target.value)} placeholder="https://api.openai.com/v1/chat..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] font-mono text-foreground outline-none focus:border-purple-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted font-medium">{t('inspector.output_variable')}</label>
              <input type="text" value={data.output_variable ?? 'http_response'} onChange={e => update('output_variable', e.target.value)} placeholder="http_response"
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-purple-500/40 text-[11px] font-mono text-purple-300 outline-none focus:border-purple-500" />
            </div>
          </>
        )}
        {isDelay && (
          <div className="flex items-center gap-2">
            <input type="number" min="0" max="10" value={data.seconds || 1} onChange={e => update('seconds', Number(e.target.value))}
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] font-mono text-foreground outline-none focus:border-indigo-500" />
            <span className="text-[11px] text-muted">{t('common.seconds')}</span>
          </div>
        )}
        {isVar && (
          <>
            <div className="flex items-center gap-2">
              <input type="text" value={data.variable_name || ''} onChange={e => update('variable_name', e.target.value)} placeholder={t('inspector.variable_name')}
                className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] font-mono text-foreground outline-none focus:border-purple-500" />
              <select value={data.operation || 'set'} onChange={e => update('operation', e.target.value)}
                className="px-2 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] text-foreground outline-none focus:border-purple-500">
                {['set', 'add', 'subtract', 'toggle'].map(o => <option key={o} value={o}>{t(`inspector.operation_${o}`)}</option>)}
              </select>
            </div>
            <input type="text" value={data.value || ''} onChange={e => update('value', e.target.value)} placeholder={t('inspector.value')}
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-tertiary border border-border text-[11px] font-mono text-foreground outline-none focus:border-purple-500" />
          </>
        )}
        {isCallback && (
          <>
            <input type="text" value={data.text || ''} onChange={e => update('text', e.target.value)} placeholder={t('inspector.text_content')}
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] text-foreground outline-none focus:border-blue-500" />
            <label className="flex items-center gap-2 text-[11px] cursor-pointer select-none text-foreground">
              <input type="checkbox" checked={!!data.show_alert} onChange={e => update('show_alert', e.target.checked)} className="accent-blue-500 w-3.5 h-3.5" />
              <span>{t('nodes.action_answer_callback.show_alert_label')}</span>
            </label>
          </>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="exec" className="!w-3 !h-3 !bg-purple-500 !border-2 !border-surface cursor-crosshair" />
    </div>
  );
}