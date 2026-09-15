import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Send, Image, Video, Mic, FileText } from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import VariableTextArea from '../Variables/VariableTextArea';

const MEDIA_ICONS = { text: Send, photo: Image, video: Video, voice: Mic, document: FileText };
const MEDIA_TYPES = ['text', 'photo', 'video', 'voice', 'document'];

export default function MessageNode({ id, data, selected }) {
  const { t } = useI18n();
  const { setNodes } = useReactFlow();
  const nodeId = id || data?.id;
  const update = (field, value) => setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n));

  const mediaType = data.media_type || 'text';
  const Icon = MEDIA_ICONS[mediaType] || Send;
  const buttons = data.buttons || [];
  const keyboardType = data.keyboard_type || 'inline';

  return (
    <div className={`min-w-[300px] rounded-xl border bg-surface shadow-lg transition-all ${selected ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-border hover:border-muted'}`}>
      <Handle type="target" position={Position.Left} id="exec" className="!w-3 !h-3 !bg-blue-500 !border-2 !border-surface cursor-crosshair" />

      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border bg-surface-secondary/50 rounded-t-xl cursor-grab active:cursor-grabbing custom-drag-handle">
        <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 overflow-hidden">
          {data.custom_icon_url ? (
            <img src={data.custom_icon_url} alt="icon" className="w-full h-full object-cover" />
          ) : (
            <Icon size={15} />
          )}
        </div>
        <div className="flex-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-blue-500">
            {t('nodes.action_send_message.name') || 'Message / Media'}
          </div>
          <div className="text-xs font-semibold text-foreground capitalize">
            {mediaType}
          </div>
        </div>
        {/* Keyboard type dropdown */}
        <select value={keyboardType} onChange={e => update('keyboard_type', e.target.value)}
          className="text-[9px] px-1.5 py-0.5 rounded-lg bg-surface border border-border text-foreground font-mono uppercase outline-none focus:border-blue-500">
          <option value="inline">{t('inspector.inline_keyboard') || 'Inline'}</option>
          <option value="reply">{t('inspector.reply_keyboard') || 'Reply'}</option>
        </select>
      </div>

      <div className="p-3 space-y-2 nodrag nopan">
        {/* Media type dropdown */}
        <select value={mediaType} onChange={e => update('media_type', e.target.value)}
          className="w-full px-2 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] text-foreground outline-none focus:border-blue-500">
          {MEDIA_TYPES.map(m => (
            <option key={m} value={m}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </option>
          ))}
        </select>

        <VariableTextArea
          value={data.text || ''}
          onChange={(v) => update('text', v)}
          rows={2}
          placeholder={t('nodes.action_send_message.desc') || 'Message text / caption (type $ for variables)'}
          className="w-full px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] text-foreground leading-relaxed outline-none focus:border-blue-500 resize-none"
        />

        {mediaType !== 'text' && (
          <input type="text" value={data.media_url || ''} onChange={e => update('media_url', e.target.value)} placeholder="https://... or file_id"
            className="w-full px-2.5 py-1.5 rounded-lg bg-surface-tertiary border border-border text-[11px] font-mono text-foreground outline-none focus:border-blue-500" />
        )}

        {/* Buttons preview */}
        {buttons.length > 0 && (
          <div className="space-y-1 pt-1.5 mt-0.5 border-t border-[#1e293b] dark:border-[#2b3750] nodrag nopan">
            {buttons.map((row, rIdx) => (
              <div key={rIdx} className="flex gap-1">
                {row.map((btn, bIdx) => {
                  let c = 'bg-surface-secondary dark:bg-[#151d30] border-border text-foreground';
                  if (btn.style === 'primary') c = 'bg-blue-600/20 border-blue-500/50 text-blue-400 font-semibold';
                  if (btn.style === 'success') c = 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400 font-semibold';
                  if (btn.style === 'danger') c = 'bg-red-600/20 border-red-500/50 text-red-400 font-semibold';
                  return <div key={bIdx} className={`flex-1 text-center py-1 px-1.5 rounded text-[10px] border truncate ${c}`}>{btn.text || 'Button'}</div>;
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="exec" className="!w-3 !h-3 !bg-blue-500 !border-2 !border-surface cursor-crosshair" />
    </div>
  );
}