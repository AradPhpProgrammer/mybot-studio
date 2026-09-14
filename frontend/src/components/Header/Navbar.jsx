import React, { useState, useEffect } from 'react';
import { 
  Bot,
    Save,
    Play,
    Pause,
    Maximize2,
    Minimize2,
    Sun,
    Moon,
    Puzzle,
    ChevronDown,
  Pin, 
  PinOff,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Settings as SettingsIcon
} from 'lucide-react';
import { useI18n } from '../../locales/i18n';

export default function Navbar({
  currentBot,
  allBots,
  onSelectBot,
  onBackToDashboard,
  onSaveFlow,
  isDirty,
  isSaving,
  onExportFlow,
  onImportFlow,
  onOpenPlugins,
  onOpenBotSettings,
  onToggleRunBot,
  updateInfo,
  theme,
  setTheme
}) {
  const { t, dir } = useI18n();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [botDropdownOpen, setBotDropdownOpen] = useState(false);
  const [togglingRun, setTogglingRun] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleRunClick = async () => {
    if (!currentBot || togglingRun) return;
    setTogglingRun(true);
    try {
      await onToggleRunBot?.();
    } finally {
      setTogglingRun(false);
    }
  };

  const isVisible = isPinned || isHovered;
  const isRunning = !!currentBot?.is_active;

  return (
    <>
      {/* Top Hover Detection Zone */}
      <div 
        className="fixed top-0 left-0 right-0 h-4 z-40" 
        onMouseEnter={() => setIsHovered(true)}
      />

      {/* Slide-in Top Navbar */}
      <header
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 transform ${
          isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        } bg-surface/90 backdrop-blur-md border-b border-border shadow-xl px-4 py-2.5 flex items-center justify-between`}
      >
        {/* Left / Start Section */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-default hover:bg-default/80 text-foreground text-xs font-medium transition-all"
            title={t('common.back')}
          >
            <ArrowLeft size={14} className={dir === 'rtl' ? 'rotate-180' : ''} />
            <span>{t('common.back')}</span>
          </button>

          {/* Bot Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setBotDropdownOpen(!botDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-secondary hover:bg-surface-tertiary border border-border text-foreground text-xs font-semibold transition-all"
            >
              <Bot size={15} className="text-accent" />
              <span>{currentBot ? `@${currentBot.username}` : t('navbar.no_bot_selected')}</span>
              <ChevronDown size={14} className={`text-muted transition-transform ${botDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {botDropdownOpen && (
              <div className="absolute top-full mt-1 w-56 bg-surface border border-border rounded-xl shadow-2xl p-1 z-50 backdrop-blur-lg">
                <div className="px-2 py-1 text-[11px] font-semibold text-muted">
                  {t('navbar.bots_switch')}
                </div>
                {allBots.map(b => (
                  <button
                    key={b.id}
                    onClick={() => {
                      onSelectBot(b);
                      setBotDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                      currentBot?.id === b.id ? 'bg-accent text-accent-foreground font-semibold' : 'text-foreground hover:bg-surface-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Bot size={14} />
                      <span>{b.name}</span>
                    </div>
                    <span className="text-[10px] opacity-70">@{b.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bot Settings Button */}
          {currentBot && (
            <button
              onClick={onOpenBotSettings}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-secondary hover:bg-surface-tertiary border border-border text-foreground text-xs font-medium transition-all"
              title={t('navbar.bot_settings') || 'Bot Settings'}
            >
              <SettingsIcon size={14} className="text-muted hover:text-foreground" />
              <span className="hidden sm:inline">{t('navbar.bot_settings') || 'Settings'}</span>
            </button>
          )}

          {/* Run / Stop Bot Button */}
          {currentBot && (
            <button
              onClick={handleRunClick}
              disabled={togglingRun}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                isRunning 
                  ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/25 ring-1 ring-emerald-500/20'
                  : 'bg-accent text-accent-foreground hover:opacity-90'
              }`}
              title={isRunning ? (t('navbar.stop_bot') || 'Stop Bot') : (t('navbar.run_bot') || 'Run Bot')}
            >
              {isRunning ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <Pause size={13} className="fill-current" />
                  <span>{t('navbar.running') || 'Running'}</span>
                </>
              ) : (
                <>
                  <Play size={13} className="fill-current" />
                  <span>{t('navbar.run_bot') || 'Run Bot'}</span>
                </>
              )}
            </button>
          )}

          {/* Unsaved Changes Indicator */}
          {isDirty && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/30 text-warning text-[11px] font-medium animate-pulse">
              <AlertCircle size={12} />
              <span>{t('navbar.unsaved_changes')}</span>
            </div>
          )}

          {/* Update Available Badge */}
          {updateInfo?.has_update && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/15 border border-success/30 text-success text-[11px] font-medium">
              <Sparkles size={12} />
              <span>{t('navbar.update_available')} (v{updateInfo.latest_version})</span>
            </div>
          )}
        </div>

        {/* Center / Action Section */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSaveFlow}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all ${
              isDirty 
                ? 'bg-accent text-accent-foreground hover:opacity-90 ring-2 ring-accent/30' 
                : 'bg-surface-secondary text-foreground hover:bg-surface-tertiary border border-border'
            }`}
          >
            {isSaving ? (
              <span>{t('common.saving')}</span>
            ) : (
              <>
                <Save size={14} />
                <span>{isDirty ? t('common.save') : t('common.saved')}</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenPlugins}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-secondary hover:bg-surface-tertiary border border-border text-foreground text-xs font-medium transition-all"
            title={t('navbar.plugins')}
          >
            <Puzzle size={14} />
            <span className="hidden md:inline">{t('navbar.plugins')}</span>
          </button>
        </div>

        {/* Right / Quick Controls Section */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle (HeroUI OKLCH) */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-lg bg-surface-secondary hover:bg-surface-tertiary border border-border text-foreground"
            title="Theme Toggle"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-surface-secondary hover:bg-surface-tertiary border border-border text-foreground"
            title={t('common.fullscreen')}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Pin/Unpin Navbar */}
          <button
            onClick={() => setIsPinned(!isPinned)}
            className={`p-1.5 rounded-lg border transition-all ${
              isPinned ? 'bg-accent text-accent-foreground border-accent' : 'bg-surface-secondary text-muted border-border hover:text-foreground'
            }`}
            title={isPinned ? 'Unpin Navbar' : 'Pin Navbar'}
          >
            {isPinned ? <Pin size={14} /> : <PinOff size={14} />}
          </button>
        </div>
      </header>
    </>
  );
}
