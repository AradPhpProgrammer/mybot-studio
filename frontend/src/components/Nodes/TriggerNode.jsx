import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Play, Terminal, MousePointerClick, MessageSquare, Keyboard } from 'lucide-react';
import CallbackAutocomplete from '../Variables/CallbackAutocomplete';

const ICON_MAP = {
  trigger_start: Play,
  trigger_command: Terminal,
  trigger_callback: MousePointerClick,
  trigger_keyboard: Keyboard,
  trigger_message: MessageSquare
};

export default function TriggerNode({ id, data, selected, type }) {
  const { setNodes, getNodes } = useReactFlow();
  const Icon = ICON_MAP[type] || Play;
  const isStart = type === 'trigger_start';
  const isCommand = type === 'trigger_command';
  const isCallback = type === 'trigger_callback';
  const isKeyboard = type === 'trigger_keyboard';

  const nodeId = id || data?.id;
  const update = (field, value) => setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n));

  const cmd = isCommand
    ? (data.command ?? '')
    : isStart
    ? '/start'
    : (data.callback_data ?? '');

  // Live crawl all nodes on the canvas to harvest any button/callback identifiers
  const suggestions = React.useMemo(() => {
    try {
      const allNodes = getNodes ? getNodes() : [];
      const ids = new Set();
      allNodes.forEach((n) => {
        const btns = n?.data?.buttons;
        if (Array.isArray(btns)) {
          btns.forEach((row) => {
            (row || []).forEach((b) => {
              if (b?.callback_data) ids.add(b.callback_data);
            });
          });
        }
        if (n?.data?.callback_data && n.id !== nodeId) ids.add(n.data.callback_data);
      });
      return Array.from(ids);
    } catch {
      return [];
    }
  }, [getNodes, nodeId]);

  // Theme color based on trigger type:
  // - Inline button event -> Blue
  // - Reply keyboard button event -> Light Red
  // - Start / Commands -> Emerald Green
  const colorTheme = isCallback
    ? {
        border: 'border-blue-500',
        ring: 'ring-blue-500/40',
        handle: '!bg-blue-500',
        iconBg: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
        badge: 'text-blue-400',
        focus: 'focus:border-blue-500',
        label: 'Inline Button Event'
      }
    : isKeyboard
    ? {
        border: 'border-red-400',
        ring: 'ring-red-400/40',
        handle: '!bg-red-400',
        iconBg: 'bg-red-500/15 border-red-500/30 text-red-400',
        badge: 'text-red-400',
        focus: 'focus:border-red-400',
        label: 'Reply Keyboard Event'
      }
    : {
        border: 'border-emerald-500',
        ring: 'ring-emerald-500/40',
        handle: '!bg-emerald-500',
        iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500',
        badge: 'text-emerald-500',
        focus: 'focus:border-emerald-500',
        label: isStart ? 'Start (/start)' : isCommand ? 'Command' : 'Trigger'
      };

  return (
    <div className={`min-w-[230px] rounded-xl border bg-surface shadow-lg transition-all ${selected ? `${colorTheme.border} ring-2 ${colorTheme.ring}` : 'border-border hover:border-muted'}`}>
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border bg-surface-secondary/50 rounded-t-xl cursor-grab active:cursor-grabbing custom-drag-handle">
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${colorTheme.iconBg}`}>
          <Icon size={15} />
        </div>
        <div>
          <div className={`text-[10px] uppercase font-bold tracking-wider ${colorTheme.badge}`}>Trigger</div>
          <div className="text-xs font-semibold text-foreground">{colorTheme.label}</div>
        </div>
      </div>

      <div className="p-3 space-y-2 nodrag nopan">
        {isCommand || isStart ? (
          <input type="text" value={cmd} onChange={e => update('command', e.target.value)}
            className={`w-full px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] font-mono text-foreground outline-none ${colorTheme.focus}`} />
        ) : (
          <CallbackAutocomplete
            value={cmd}
            onChange={(v) => update('callback_data', v)}
            aside={{ suggestions }}
            placeholder={isKeyboard ? "Keyboard identifier (e.g. btn_menu)" : "Inline identifier (e.g. btn_about)"}
            className={`w-full px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] font-mono text-foreground outline-none ${colorTheme.focus}`}
          />
        )}
        {isCommand && (
          <input type="text" value={data.description || ''} onChange={e => update('description', e.target.value)} placeholder="Description (Telegram menu)"
            className={`w-full px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] text-foreground outline-none ${colorTheme.focus}`} />
        )}
      </div>

      <Handle type="source" position={Position.Right} id="exec" className={`!w-3 !h-3 ${colorTheme.handle} !border-2 !border-surface cursor-crosshair`} />
    </div>
  );
}