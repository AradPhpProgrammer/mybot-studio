import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { GitBranch, CheckCircle2, XCircle } from 'lucide-react';
import { useI18n } from '../../locales/i18n';

const OPERATORS = ['>=', '<=', '==', '!=', '>', '<', 'and', 'or'];

export default function ConditionNode({ id, data, selected }) {
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

  const op = data?.operator || '>=';
  const a = data?.input_a !== undefined ? data.input_a : '';
  const b = data?.input_b !== undefined ? data.input_b : '';

  return (
    <div
      className={`min-w-[340px] rounded-xl border bg-surface shadow-lg transition-all ${
        selected ? 'border-amber-500 ring-2 ring-amber-500/40' : 'border-border hover:border-muted'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="exec"
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-surface cursor-crosshair"
      />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border bg-surface-secondary/50 rounded-t-xl cursor-grab active:cursor-grabbing custom-drag-handle">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
          <GitBranch size={15} />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-amber-500">
            {t('nodes.action_condition.category')}
          </div>
          <div className="text-xs font-semibold text-foreground">
            {t('nodes.action_condition.name')}
          </div>
        </div>
      </div>

      {/* Input Comparison: Input A [op] Input B */}
      <div className="p-3 space-y-2 nodrag nopan">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={a}
            onChange={(e) => update('input_a', e.target.value)}
            placeholder={t('inspector.input_a')}
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-xs font-mono text-foreground outline-none focus:border-amber-500"
          />
          <select
            value={op}
            onChange={(e) => update('operator', e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-surface-secondary border border-border text-xs font-mono font-bold text-amber-500 outline-none focus:border-amber-500 cursor-pointer"
          >
            {OPERATORS.map((o) => (
              <option key={o} value={o}>
                {o === 'and' ? t('inspector.operator_and') : o === 'or' ? t('inspector.operator_or') : o}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={b}
            onChange={(e) => update('input_b', e.target.value)}
            placeholder={t('inspector.input_b')}
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-xs font-mono text-foreground outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Output Branches (TRUE / FALSE) */}
      <div className="border-t border-border/80 px-3 py-2 space-y-2">
        {/* True Branch */}
        <div className="relative flex items-center justify-end gap-2 pr-5 py-1 rounded-md bg-emerald-500/5">
          <CheckCircle2 size={13} className="text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500 tracking-wider">
            {t('nodes.action_condition.true_branch')}
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-surface cursor-crosshair"
            style={{ right: -6, top: '50%' }}
          />
        </div>

        {/* False Branch */}
        <div className="relative flex items-center justify-end gap-2 pr-5 py-1 rounded-md bg-rose-500/5">
          <XCircle size={13} className="text-rose-500" />
          <span className="text-[10px] font-bold text-rose-500 tracking-wider">
            {t('nodes.action_condition.false_branch')}
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="!w-3 !h-3 !bg-rose-500 !border-2 !border-surface cursor-crosshair"
            style={{ right: -6, top: '50%' }}
          />
        </div>
      </div>
    </div>
  );
}
