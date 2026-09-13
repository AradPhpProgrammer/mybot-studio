import React, { useState, useEffect, useRef } from 'react';
import { Search, Play, Terminal, MousePointerClick, MessageSquare, Send, GitBranch, Database, Clock, Globe, BellRing, Sparkles, X, Plus, Minus, XCircle, DivideCircle } from 'lucide-react';
import { useI18n } from '../../locales/i18n';

const NODE_DEFINITIONS = [
  // Triggers
  {
    type: 'trigger_start',
    category: 'triggers',
    title_en: 'Start Command (/start)',
    title_fa: 'دستور شروع (/start)',
    desc_en: 'Fires when user presses /start or uses a deep link / referral code.',
    desc_fa: 'هنگام ارسال دستور /start یا ورود با لینک رفرال فعال می‌شود.',
    icon: Play,
    color: 'text-emerald-500',
    data: { extract_referral: true, referral_variable: 'ref_code' }
  },
  {
    type: 'trigger_command',
    category: 'triggers',
    title_en: 'Custom Command (//)',
    title_fa: 'دستور اختصاصی (//)',
    desc_en: 'Fires on slash commands (e.g. /help) and auto-syncs with Telegram menu.',
    desc_fa: 'هنگام ارسال دستور با اسلش و همگام‌سازی خودکار با منوی تلگرام.',
    icon: Terminal,
    color: 'text-emerald-500',
    data: { command: '/help', description: 'Help' }
  },
  {
    type: 'trigger_callback',
    category: 'triggers',
    title_en: 'Button Click (Callback)',
    title_fa: 'کلیک روی دکمه شیشه‌ای',
    desc_en: 'Fires when user clicks an inline keyboard button.',
    desc_fa: 'هنگامی که کاربر روی یک دکمه شیشه‌ای کلیک می‌کند.',
    icon: MousePointerClick,
    color: 'text-emerald-500',
    data: { callback_data: 'btn_action' }
  },
  {
    type: 'trigger_message',
    category: 'triggers',
    title_en: 'Message Received',
    title_fa: 'دریافت پیام متنی',
    desc_en: 'Fires on user text message or matching pattern.',
    desc_fa: 'هنگام دریافت پیام متنی یا الگوی مشخص.',
    icon: MessageSquare,
    color: 'text-emerald-500',
    data: { match_mode: 'any', pattern: '' }
  },

  // Messages
  {
    type: 'action_send_message',
    category: 'messages',
    title_en: 'Send Message / Media',
    title_fa: 'ارسال پیام / مدیا',
    desc_en: 'Sends text, photos, videos with styled buttons.',
    desc_fa: 'ارسال متن، عکس، ویدیو با دکمه‌های رنگی.',
    icon: Send,
    color: 'text-blue-500',
    data: { media_type: 'text', text: 'Hello! Welcome to MyBot Studio.', enable_auto_chat_action: true, expandable_quote: false, has_spoiler: false, buttons: [], keyboard_type: 'inline' }
  },
  {
    type: 'action_answer_callback',
    category: 'messages',
    title_en: 'Answer Callback (Alert)',
    title_fa: 'پاسخ به کلیک (Alert)',
    desc_en: 'Dismisses Telegram loading spinner and displays alert.',
    desc_fa: 'بستن لودینگ دکمه و نمایش پیام هشدار.',
    icon: BellRing,
    color: 'text-blue-500',
    data: { text: 'Action confirmed.', show_alert: false }
  },

  // Logic
  {
    type: 'action_condition',
    category: 'logic',
    title_en: 'Branch (If / Else)',
    title_fa: 'شرط (IF / Else)',
    desc_en: 'Branches execution flow based on condition.',
    desc_fa: 'انشعاب جریان بر اساس شرط منطقی.',
    icon: GitBranch,
    color: 'text-amber-500',
    data: { condition: 'user.balance >= 10', input_a: '', operator: '>=', input_b: '' }
  },
  {
    type: 'action_set_variable',
    category: 'logic',
    title_en: 'Set User Variable',
    title_fa: 'تنظیم / تغییر متغیر',
    desc_en: 'Stores dynamic user state in database.',
    desc_fa: 'ذخیره یا تغییر متغیر کاربر در دیتابیس.',
    icon: Database,
    color: 'text-purple-500',
    data: { variable_name: '', operation: 'set', value: '' }
  },
  {
    type: 'action_delay',
    category: 'logic',
    title_en: 'Delay / Wait',
    title_fa: 'تأخیر زمانی (Wait)',
    desc_en: 'Waits for specified seconds before proceeding.',
    desc_fa: 'ایجاد وقفه زمانی چند ثانیه‌ای.',
    icon: Clock,
    color: 'text-purple-500',
    data: { seconds: 2 }
  },
  {
    type: 'action_http_request',
    category: 'logic',
    title_en: 'HTTP Request / Webhook',
    title_fa: 'درخواست وب‌هوک / HTTP',
    desc_en: 'Sends GET or POST request to external APIs.',
    desc_fa: 'ارسال ریکوئست به وب‌هوک یا APIهای خارجی.',
    icon: Globe,
    color: 'text-purple-500',
    data: { url: 'https://api.example.com/data', method: 'POST', output_variable: 'result' }
  },

  // Math
  {
    type: 'math_add',
    category: 'math',
    title_en: 'Math: Add (+)',
    title_fa: 'محاسبه: جمع (+)',
    desc_en: 'Adds Input A and Input B.',
    desc_fa: 'جمع دو ورودی A و B.',
    icon: Plus,
    color: 'text-sky-500',
    data: { input_a: '', input_b: '', output_variable: 'result' }
  },
  {
    type: 'math_subtract',
    category: 'math',
    title_en: 'Math: Subtract (-)',
    title_fa: 'محاسبه: تفریق (-)',
    desc_en: 'Subtracts Input B from Input A.',
    desc_fa: 'تفریق ورودی B از ورودی A.',
    icon: Minus,
    color: 'text-orange-500',
    data: { input_a: '', input_b: '', output_variable: 'result' }
  },
  {
    type: 'math_multiply',
    category: 'math',
    title_en: 'Math: Multiply (*)',
    title_fa: 'محاسبه: ضرب (*)',
    desc_en: 'Multiplies Input A by Input B.',
    desc_fa: 'ضرب ورودی A در ورودی B.',
    icon: XCircle,
    color: 'text-indigo-500',
    data: { input_a: '', input_b: '', output_variable: 'result' }
  },
  {
    type: 'math_divide',
    category: 'math',
    title_en: 'Math: Divide (/)',
    title_fa: 'محاسبه: تقسیم (/)',
    desc_en: 'Divides Input A by Input B.',
    desc_fa: 'تقسیم ورودی A بر ورودی B.',
    icon: DivideCircle,
    color: 'text-emerald-500',
    data: { input_a: '', input_b: '', output_variable: 'result' }
  }
];

export default function QuickSearchPalette({ isOpen, onClose, onSelectNode, position }) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = NODE_DEFINITIONS.filter(node => {
    const title = lang === 'fa' ? node.title_fa : node.title_en;
    const desc = lang === 'fa' ? node.desc_fa : node.desc_en;
    return title.toLowerCase().includes(query.toLowerCase()) || 
           desc.toLowerCase().includes(query.toLowerCase()) ||
           node.type.toLowerCase().includes(query.toLowerCase());
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1)); }
    else if (e.key === 'Enter' && filtered[selectedIndex]) { e.preventDefault(); onSelectNode(filtered[selectedIndex]); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface-secondary/40">
          <Search size={18} className="text-muted" />
          <input ref={inputRef} type="text" placeholder={t('common.search')} value={query} onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }} onKeyDown={handleKeyDown} className="w-full bg-transparent text-sm text-foreground placeholder:text-field-placeholder outline-none" />
          <button onClick={onClose} className="p-1 rounded-md text-muted hover:text-foreground"><X size={16} /></button>
        </div>

        {/* List of nodes */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">{t('common.no_results')}</div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              const displayTitle = lang === 'fa' ? item.title_fa : item.title_en;
              const displayDesc = lang === 'fa' ? item.desc_fa : item.desc_en;
              return (
                <div key={item.type} onClick={() => { onSelectNode(item); onClose(); }} onMouseEnter={() => setSelectedIndex(idx)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-accent text-accent-foreground shadow-sm' : 'hover:bg-surface-secondary text-foreground'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isSelected ? 'bg-accent-foreground/15 border-accent-foreground/25 text-accent-foreground' : `bg-surface-tertiary border-border ${item.color}`}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{displayTitle}</div>
                    <div className={`text-[11px] truncate ${isSelected ? 'opacity-80' : 'text-muted'}`}>{displayDesc}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
