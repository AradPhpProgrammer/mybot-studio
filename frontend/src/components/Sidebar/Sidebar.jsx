import React from 'react';
import { Bot, Puzzle, Settings, LogOut, ChevronRight, ChevronLeft } from 'lucide-react';
import { useI18n } from '../../locales/i18n';

export default function Sidebar({ activeTab, onTabChange, onLogout }) {
  const { t, dir } = useI18n();

  const navItems = [
    { id: 'profiles', label: t('sidebar.profiles'), icon: Bot },
    { id: 'plugins', label: t('sidebar.plugins'), icon: Puzzle },
    { id: 'settings', label: t('sidebar.settings'), icon: Settings },
  ];

  return (
    <aside className="w-64 bg-surface border-e border-border h-screen flex flex-col justify-between p-4 shrink-0 select-none z-20">
      {/* Brand */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 rounded-xl bg-accent text-accent-foreground flex items-center justify-center font-black shadow-md">
            <Bot size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">MyBot Studio</div>
            <div className="text-[10px] text-muted font-mono">v1.0.0 Enterprise</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'text-foreground/80 hover:bg-surface-secondary hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} />
                  <span>{item.label}</span>
                </div>
                {dir === 'rtl' ? (
                  <ChevronLeft size={14} className={`opacity-60 ${isActive ? 'opacity-100' : ''}`} />
                ) : (
                  <ChevronRight size={14} className={`opacity-60 ${isActive ? 'opacity-100' : ''}`} />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="pt-4 border-t border-border/80">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-danger hover:bg-danger/10 transition-colors"
        >
          <LogOut size={16} />
          <span>{t('common.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
