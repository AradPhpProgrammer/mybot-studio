import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Repeat } from 'lucide-react';
import { useI18n } from '../../locales/i18n';

export default function LoopNode({ id, data, selected }) {
  const { t } = useI18n();
  const { setNodes } = useReactFlow();

  const nodeId = id || data?.id;
  const update = (field, value) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n
      )
    );
  };

  const count = data?.count !== undefined ? data.count : 3;
  const outVar = data?.output_variable || 'iteration';

  return (
    <div
      className={`min-w-[280px] rounded-xl border bg-surface shadow-lg transition-all ${
        selected ? 'border-violet-500 ring-2 ring-violet-500/40' : 'border-border hover:border-muted'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="exec"
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-surface cursor-crosshair"
      />

      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border bg-surface-secondary/50 rounded-t-xl cursor-grab active:cursor-grabbing custom-drag-handle">
        <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-500">
          <Repeat size={15} />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-violet-500">
            {t('nodes.action_loop.category') || 'Loop / Flow'}
          </div>
          <div className="text-xs font-semibold text-foreground">
            {t('nodes.action_loop.name') || 'Loop (Repeat)'}
          </div>
        </div>
        <span className="ms-auto text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500 border border-violet-500/20 font-mono">
          {count}x
        </span>
      </div>

      <div className="p-3 space-y-2.5 nodrag nopan">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] font-medium text-muted">
            {t('inspector.loop_count') || 'Repeat Count'}:
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={count}
            onChange={(e) => update('count', Math.max(1, parseInt(e.target.value) || 1))}
            className="w-24 px-2.5 py-1 rounded-lg bg-surface-secondary border border-border text-xs font-mono text-foreground text-center outline-none focus:border-violet-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted block">
            {t('inspector.iteration_var') || 'Iteration Counter Variable'}:
          </label>
          <input
            type="text"
            value={outVar}
            onChange={(e) => update('output_variable', e.target.value)}
            placeholder="iteration"
            className="w-full px-2.5 py-1.5 rounded-lg bg-surface-tertiary border border-border text-xs font-mono text-foreground outline-none focus:border-violet-500"
          />
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="exec"
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-surface cursor-crosshair"
      />
    </div>
  );
}
