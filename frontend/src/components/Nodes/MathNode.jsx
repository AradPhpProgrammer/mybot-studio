import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { PlusCircle, MinusCircle, XCircle, DivideCircle, ArrowRight } from 'lucide-react';
import { useI18n } from '../../locales/i18n';

const MATH_ICONS = {
  math_add: { icon: PlusCircle, sym: '+', op: ['+', '-', '×', '÷'], color: 'text-sky-500 bg-sky-500/15 border-sky-500/30' },
  math_subtract: { icon: MinusCircle, sym: '-', op: ['-', '+', '×', '÷'], color: 'text-orange-500 bg-orange-500/15 border-orange-500/30' },
  math_multiply: { icon: XCircle, sym: '×', op: ['×', '+', '-', '÷'], color: 'text-indigo-500 bg-indigo-500/15 border-indigo-500/30' },
  math_divide: { icon: DivideCircle, sym: '÷', op: ['÷', '+', '-', '×'], color: 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30' }
};

export default function MathNode({ id, data, selected, type }) {
  const { t } = useI18n();
  const { setNodes } = useReactFlow();
  const conf = MATH_ICONS[type] || MATH_ICONS.math_add;
  const Icon = conf.icon;

  const nodeId = id || data?.id;
  const update = (field, value) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n
      )
    );
  };

  const a = data?.input_a !== undefined ? data.input_a : '';
  const b = data?.input_b !== undefined ? data.input_b : '';
  const op = data?.operator || conf.sym;
  const out = data?.output_variable || 'result';

  return (
    <div
      className={`min-w-[320px] rounded-xl border bg-surface shadow-lg transition-all ${
        selected ? 'border-sky-500 ring-2 ring-sky-500/40' : 'border-border hover:border-muted'
      }`}
    >
      {/* Input execution handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="exec"
        className="!w-3 !h-3 !bg-sky-500 !border-2 !border-surface cursor-crosshair"
      />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border bg-surface-secondary/50 rounded-t-xl">
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${conf.color}`}>
          <Icon size={15} />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
            {t('nodes.math.category') || 'Math & Formula'}
          </div>
          <div className="text-xs font-semibold text-foreground">
            {t(`nodes.${type}.name`) || `${conf.sym} Math Calculation`}
          </div>
        </div>
        <span className="ms-auto text-[10px] px-2 py-0.5 rounded-full bg-surface text-muted border border-border font-mono">
          ${out}
        </span>
      </div>

      {/* Math Layout: A [op] B -> Output */}
      <div className="p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Input A */}
          <input
            type="text"
            value={a}
            onChange={(e) => update('input_a', e.target.value)}
            placeholder="A ($score)"
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-xs font-mono text-foreground text-center outline-none focus:border-sky-500"
          />

          {/* Operator */}
          <select
            value={op}
            onChange={(e) => update('operator', e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-xs font-black text-sky-500 outline-none focus:border-sky-500 cursor-pointer"
          >
            {conf.op.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>

          {/* Input B */}
          <input
            type="text"
            value={b}
            onChange={(e) => update('input_b', e.target.value)}
            placeholder="B (10)"
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-xs font-mono text-foreground text-center outline-none focus:border-sky-500"
          />
        </div>

        {/* Output Variable field */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted block">
            {t('inspector.output_variable') || 'Store Result in Variable'}:
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-muted">$</span>
            <input
              type="text"
              value={out}
              onChange={(e) => update('output_variable', e.target.value)}
              placeholder="result"
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-tertiary border border-border text-xs font-mono text-foreground outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Output Handle Circle */}
      <Handle
        type="source"
        position={Position.Right}
        id="exec"
        className="!w-3 !h-3 !bg-sky-500 !border-2 !border-surface cursor-crosshair"
      />
    </div>
  );
}
