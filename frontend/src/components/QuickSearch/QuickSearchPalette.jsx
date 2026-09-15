import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Play,
  Terminal,
  MousePointerClick,
  MessageSquare,
  Send,
  Edit3,
  GitBranch,
  Database,
  Clock,
  Globe,
  BellRing,
  Repeat,
  X,
  Plus,
  Minus,
  XCircle,
  DivideCircle,
  Keyboard
} from 'lucide-react';
import { useI18n } from '../../locales/i18n';

const NODE_DEFINITIONS = [
  // Triggers
  {
    type: 'trigger_start',
    category: 'triggers',
    title: 'Start Command (/start)',
    desc: 'Fires when user presses /start or uses a deep link / referral code.',
    icon: Play,
    color: 'text-emerald-500',
    data: { extract_referral: true, referral_variable: 'ref_code' }
  },
  {
    type: 'trigger_command',
    category: 'triggers',
    title: 'Custom Command',
    desc: 'Fires on slash commands (e.g. /help) and auto-syncs with Telegram menu.',
    icon: Terminal,
    color: 'text-emerald-500',
    data: { command: '/help', description: 'Help' }
  },
  {
    type: 'trigger_callback',
    category: 'triggers',
    title: 'Inline Button Event',
    desc: 'Fires when user clicks an inline keyboard button.',
    icon: MousePointerClick,
    color: 'text-blue-500',
    data: { callback_data: 'btn_action' }
  },
  {
    type: 'trigger_keyboard',
    category: 'triggers',
    title: 'Reply Keyboard Event',
    desc: 'Fires when user taps a persistent reply keyboard button.',
    icon: Keyboard,
    color: 'text-red-400',
    data: { callback_data: 'btn_menu' }
  },
  {
    type: 'trigger_message',
    category: 'triggers',
    title: 'Message Received',
    desc: 'Fires on user text message or matching pattern.',
    icon: MessageSquare,
    color: 'text-emerald-500',
    data: { match_mode: 'any', pattern: '' }
  },

  // Messages
  {
    type: 'action_send_message',
    category: 'messages',
    title: 'Send Message / Media',
    desc: 'Sends text, photos, videos with styled buttons.',
    icon: Send,
    color: 'text-blue-500',
    data: {
      media_type: 'text',
      text: 'Hello! Welcome to MyBot Studio.',
      enable_auto_chat_action: true,
      expandable_quote: false,
      has_spoiler: false,
      buttons: [],
      keyboard_type: 'inline'
    }
  },
  {
    type: 'action_edit_message',
    category: 'messages',
    title: 'Edit Message',
    desc: 'Updates an earlier sent message when a button is tapped.',
    icon: Edit3,
    color: 'text-orange-500',
    data: { text: '', buttons: [] }
  },
  {
    type: 'action_answer_callback',
    category: 'messages',
    title: 'Answer Callback (Alert)',
    desc: 'Dismisses Telegram loading spinner and displays alert.',
    icon: BellRing,
    color: 'text-blue-500',
    data: { text: 'Action confirmed.', show_alert: false }
  },

  // Logic & Flow
  {
    type: 'action_condition',
    category: 'logic',
    title: 'Branch (If / Else)',
    desc: 'Branches execution flow based on condition.',
    icon: GitBranch,
    color: 'text-amber-500',
    data: { input_a: '$balance', operator: '>=', input_b: '100' }
  },
  {
    type: 'action_set_variable',
    category: 'logic',
    title: 'Set User Variable',
    desc: 'Stores dynamic user state in database.',
    icon: Database,
    color: 'text-purple-500',
    data: { variable_name: '', operation: 'set', value: '' }
  },
  {
    type: 'action_loop',
    category: 'logic',
    title: 'Loop / Repeat',
    desc: 'Repeats connected action N times with iteration index.',
    icon: Repeat,
    color: 'text-violet-500',
    data: { count: 3, output_variable: 'iteration' }
  },
  {
    type: 'action_delay',
    category: 'logic',
    title: 'Delay / Wait',
    desc: 'Waits for specified seconds before proceeding.',
    icon: Clock,
    color: 'text-purple-500',
    data: { seconds: 2 }
  },
  {
    type: 'action_http_request',
    category: 'logic',
    title: 'HTTP Request / Webhook',
    desc: 'Sends GET or POST request to external APIs.',
    icon: Globe,
    color: 'text-purple-500',
    data: { url: 'https://api.example.com/data', method: 'POST', output_variable: 'result' }
  },

  // Math
  {
    type: 'math',
    category: 'math',
    title: 'Math Calculation (A ⊕ B)',
    desc: 'Calculates A ⊕ B using +, -, ×, or ÷ and stores the result in a variable.',
    icon: Plus,
    color: 'text-sky-500',
    data: { input_a: '', input_b: '', operator: '+', output_variable: 'result' }
  }
];

export default function QuickSearchPalette({ isOpen, onClose, onSelectNode, position, currentBot }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Whether the flow-variables / user database feature is enabled for this bot.
  // When disabled, the "Set User Variable" node is shown blurred & disabled.
  const userDbEnabled = Boolean(currentBot?.settings?.enable_user_database);

  // Nodes that require the user-database feature to be enabled.
  const requiresUserDb = (type) => type === 'action_set_variable';

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = NODE_DEFINITIONS.filter((node) => {
    const title = t(`nodes.${node.type}.name`, node.title);
    const desc = t(`nodes.${node.type}.desc`, node.desc);
    const q = query.toLowerCase();
    return (
      title.toLowerCase().includes(q) ||
      desc.toLowerCase().includes(q) ||
      node.type.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      onSelectNode(filtered[selectedIndex]);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface-secondary/40">
          <Search size={18} className="text-muted" />
          <input
            ref={inputRef}
            type="text"
            placeholder={t('common.search')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-field-placeholder outline-none"
          />
          <button onClick={onClose} className="p-1 rounded-md text-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {/* List of nodes */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">{t('common.no_results')}</div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              const displayTitle = t(`nodes.${item.type}.name`, item.title);
              const displayDesc = t(`nodes.${item.type}.desc`, item.desc);
              const locked = requiresUserDb(item.type) && !userDbEnabled;

              return (
                <div
                  key={item.type}
                  onClick={() => {
                    if (locked) return; // do not add when the DB feature is disabled
                    onSelectNode(item);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    locked
                      ? 'opacity-50 blur-[0.5px] cursor-not-allowed filter'
                      : 'cursor-pointer hover:bg-surface-secondary'
                  } ${
                    isSelected && !locked ? 'bg-accent text-accent-foreground shadow-sm' : 'text-foreground'
                  }`}
                  title={locked
                    ? (t('common.enable_db_node_hint') || 'Enable User Variables Database in bot settings to use this node')
                    : ''}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                      isSelected && !locked
                        ? 'bg-accent-foreground/15 border-accent-foreground/25 text-accent-foreground'
                        : `bg-surface-tertiary border-border ${item.color}`
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{displayTitle}</div>
                    <div
                      className={`text-[11px] truncate ${
                        isSelected && !locked ? 'opacity-80' : locked ? 'text-accent' : 'text-muted'
                      }`}
                    >
                      {locked
                        ? (t('common.locked_node_hint') || 'Enable User Variables Database in Settings')
                        : displayDesc}
                    </div>
                  </div>

                  {locked && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-accent/20 text-accent border border-accent/30 shrink-0">
                      {t('common.locked_badge') || 'Locked'}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
