import React from 'react';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import { Edit3, Link2, AlertCircle } from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import VariableTextArea from '../Variables/VariableTextArea';

export default function EditMessageNode({ id, data, selected }) {
  const { t } = useI18n();
  const { setNodes } = useReactFlow();
  const edges = useEdges();

  const nodeId = id || data?.id;

  // Is there an incoming edge from a Send Message node?
  const hasSendInput = edges.some(
    (e) => e.target === nodeId && (e.targetHandle === 'exec' || !e.targetHandle)
  );

  const update = (field, value) =>
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n))
    );

  const text = data?.text || '';
  const buttons = data?.buttons || [];

  return (
    <div
      className={`min-w-[300px] rounded-xl border bg-surface shadow-lg transition-all ${
        selected ? 'border-orange-500 ring-2 ring-orange-500/40' : 'border-border hover:border-muted'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="exec"
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-surface cursor-crosshair"
      />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border bg-surface-secondary/50 rounded-t-xl cursor-grab active:cursor-grabbing custom-drag-handle">
        <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500">
          <Edit3 size={15} />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-orange-500">
            {t('nodes.action_edit_message.category') || 'Message'}
          </div>
          <div className="text-xs font-semibold text-foreground">
            {t('nodes.action_edit_message.name') || 'Edit Message'}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2 nodrag nopan">
        {/* Connection requirement notice */}
        <div
          className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-[10px] border ${
            hasSendInput
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-warning/10 border-warning/30 text-warning'
          }`}
        >
          {hasSendInput ? (
            <>
              <Link2 size={12} className="mt-0.5 shrink-0" />
              <span>
                {t('nodes.action_edit_message.connected') || 'Will edit the message sent by the connected node above.'}
              </span>
            </>
          ) : (
            <>
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <span>
                {t('nodes.action_edit_message.not_connected') ||
                  'Connect this node after a Send Message node to edit that message. Without text it will warn the user.'}
              </span>
            </>
          )}
        </div>

        {/* Editable text */}
        <VariableTextArea
          value={text}
          onChange={(v) => update('text', v)}
          rows={3}
          placeholder={t('nodes.action_edit_message.text_placeholder') || 'New message text / caption (type $ for variables)'}
          className="w-full px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] text-foreground leading-relaxed outline-none focus:border-orange-500 resize-none"
        />

        {/* Buttons preview on canvas */}
        {buttons.length > 0 && (
          <div className="space-y-1 pt-1.5 mt-0.5 border-t border-border nodrag nopan">
            {buttons.map((row, rIdx) => (
              <div key={rIdx} className="flex gap-1">
                {row.map((btn, bIdx) => {
                  let c = 'bg-surface-secondary dark:bg-[#151d30] border-border text-foreground';
                  if (btn.style === 'primary') c = 'bg-blue-600/20 border-blue-500/50 text-blue-400 font-semibold';
                  if (btn.style === 'success') c = 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400 font-semibold';
                  if (btn.style === 'danger') c = 'bg-red-600/20 border-red-500/50 text-red-400 font-semibold';
                  return (
                    <div
                      key={bIdx}
                      className={`flex-1 py-1 px-1.5 rounded-md border text-[10px] text-center truncate ${c}`}
                      title={btn.callback_data ? `Callback: ${btn.callback_data}` : btn.url ? `URL: ${btn.url}` : ''}
                    >
                      {btn.text || 'Button'}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="exec"
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-surface cursor-crosshair"
      />
    </div>
  );
}