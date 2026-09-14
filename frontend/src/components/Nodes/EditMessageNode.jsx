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

        {/* Button count hint (full keyboard editing is in the floating inspector) */}
        {buttons.length > 0 && (
          <div className="px-2.5 py-1 rounded-lg bg-surface-tertiary/60 border border-orange-500/20 text-[10px] text-muted">
            {t('nodes.action_edit_message.buttons_count') || 'Buttons:'} {buttons.length} row(s) — edit in the floating panel
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