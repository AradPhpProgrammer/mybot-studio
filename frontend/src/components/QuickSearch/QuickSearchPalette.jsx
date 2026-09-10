import React, { useState, useEffect, useRef } from 'react';
import { Search, Play, Terminal, MousePointerClick, MessageSquare, Send, GitBranch, Database, Clock, Globe, BellRing, Sparkles, X } from 'lucide-react';
import { useI18n } from '../../locales/i18n';

const NODE_DEFINITIONS = [
  // Triggers
  {
    type: 'trigger_start',
    category: 'triggers',
    title: 'دستور شروع (/start)',
    title_en: 'Start Command (/start)',
    desc: 'ورود به ربات یا کلیک روی لینک رفرال',
    icon: Play,
    color: 'text-emerald-500',
    data: { extract_referral: true, referral_variable: 'ref_code' }
  },
  {
    type: 'trigger_command',
    category: 'triggers',
    title: 'دستور اختصاصی (//)',
    title_en: 'Custom Command (//)',
    desc: 'دستوراتی مثل /help یا /wallet با ثبت خودکار',
    icon: Terminal,
    color: 'text-emerald-500',
    data: { command: '/help', description: 'راهنما' }
  },
  {
    type: 'trigger_callback',
    category: 'triggers',
    title: 'کلیک دکمه شیشه‌ای (Callback)',
    title_en: 'Button Click (Callback)',
    desc: 'واکنش به کلیک روی دکمه‌های اینلاین',
    icon: MousePointerClick,
    color: 'text-emerald-500',
    data: { callback_data: 'btn_action' }
  },
  {
    type: 'trigger_message',
    category: 'triggers',
    title: 'دریافت پیام متنی',
    title_en: 'Text Message',
    desc: 'بررسی متن ورودی کاربر با متن دقیق یا Regex',
    icon: MessageSquare,
    color: 'text-emerald-500',
    data: { match_mode: 'any', pattern: '' }
  },

  // Messages
  {
    type: 'action_send_message',
    category: 'messages',
    title: 'ارسال پیام / مدیا',
    title_en: 'Send Message / Media',
    desc: 'ارسال متن، عکس، ویدیو، ویس با دکمه‌های رنگی',
    icon: Send,
    color: 'text-blue-500',
    data: {
      media_type: 'text',
      text: 'پیام جدید',
      enable_auto_chat_action: true,
      expandable_quote: false,
      has_spoiler: false,
      buttons: []
    }
  },
  {
    type: 'action_answer_callback',
    category: 'messages',
    title: 'پاسخ به کال‌بک (Alert / Toast)',
    title_en: 'Answer Callback (Alert)',
    desc: 'بستن اسپینر لودینگ و نمایش هشدار یا پاپ‌آپ',
    icon: BellRing,
    color: 'text-blue-500',
    data: { text: 'انجام شد!', show_alert: false }
  },

  // Logic
  {
    type: 'action_condition',
    category: 'logic',
    title: 'شرط (IF / Else)',
    title_en: 'Branch (IF / Else)',
    desc: 'انشعاب شرطی بر اساس متغیرهای کاربر',
    icon: GitBranch,
    color: 'text-amber-500',
    data: { condition: 'user.balance >= 10' }
  },
  {
    type: 'action_set_variable',
    category: 'logic',
    title: 'تغییر متغیر کاربر (NoSQL)',
    title_en: 'Set User Variable',
    desc: 'افزودن یا تغییر متغیرها در دیتابیس بدون محدودیت',
    icon: Database,
    color: 'text-purple-500',
    data: { variable_name: 'balance', operation: 'add', value: 10 }
  },
  {
    type: 'action_delay',
    category: 'logic',
    title: 'تأخیر زمانی (Wait)',
    title_en: 'Delay (Wait)',
    desc: 'وقفه چند ثانیه‌ای در سناریو',
    icon: Clock,
    color: 'text-purple-500',
    data: { seconds: 2 }
  },
  {
    type: 'action_http_request',
    category: 'logic',
    title: 'درخواست وب‌هوک / HTTP',
    title_en: 'HTTP Request / Webhook',
    desc: 'ارسال درخواست GET یا POST به وب‌سرویس خارجی',
    icon: Globe,
    color: 'text-purple-500',
    data: { url: 'https://api.example.com/data', method: 'POST' }
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
    const title = lang === 'fa' ? node.title : node.title_en;
    return title.toLowerCase().includes(query.toLowerCase()) || node.desc.toLowerCase().includes(query.toLowerCase());
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
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
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              نودی با این مشخصات یافت نشد.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.type}
                  onClick={() => {
                    onSelectNode(item);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-accent text-accent-foreground shadow-sm' : 'hover:bg-surface-secondary text-foreground'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                    isSelected ? 'bg-accent-foreground/15 border-accent-foreground/25 text-accent-foreground' : `bg-surface-tertiary border-border ${item.color}`
                  }`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">
                      {lang === 'fa' ? item.title : item.title_en}
                    </div>
                    <div className={`text-[11px] truncate ${isSelected ? 'opacity-80' : 'text-muted'}`}>
                      {item.desc}
                    </div>
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
