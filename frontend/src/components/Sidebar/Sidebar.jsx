import React, { useEffect, useRef, useState } from 'react';
import { Bot, LogOut, User } from 'lucide-react';
import { useI18n } from '../../locales/i18n';

export default function Sidebar({ activeTab, onTabChange, onLogout, collapsed, onToggleCollapse }) {
  const { t, dir } = useI18n();
  const [isHovered, setIsHovered] = useState(false);

  const navItems = [
    { id: 'profiles', label: t('sidebar.profiles'), icon: Bot },
    { id: 'plugins', label: t('sidebar.plugins'), icon: Bot },
    { id: 'settings', label: t('sidebar.settings'), icon: Bot },
  ];

  return (
    <aside 
      className={`bg-surface/80 backdrop-blur-xl border-${dir === 'rtl' ? 'e' : 's'} border-border h-screen flex flex-col justify-between p-3 shrink-0 z-20 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Brand */}
      <div className="space-y-4">
        <div className={`flex items-center gap-2 py-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center font-black shrink-0">
            <Bot size={16} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-foreground">{t('common.app_name')}</div>
              <div className="text-[9px] text-muted font-mono">{t('common.version')}</div>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === item.id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground/70 hover:bg-surface-secondary hover:text-foreground'
              } ${collapsed ? 'justify-center' : ''}`}
              title={item.label}
            >
              <item.icon size={16} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="space-y-2 pt-3 border-t border-border/50">
        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
          title={t('sidebar.toggle_menu')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={collapsed ? 'rotate-180' : ''}>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          {!collapsed && <span>{t('sidebar.toggle_menu')}</span>}
        </button>

        {/* User Avatar + Logout */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-2`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
              <User size={14} />
            </div>
            {!collapsed && <span className="text-xs text-foreground font-medium">Admin</span>}
          </div>
          
          <button
            onClick={onLogout}
            className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
            title={t('common.logout')}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
