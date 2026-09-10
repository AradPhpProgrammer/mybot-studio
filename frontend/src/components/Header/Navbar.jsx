import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Save, 
  Play, 
  Download, 
  Upload, 
  Maximize2, 
  Minimize2, 
  Globe, 
  Type, 
  Sun, 
  Moon, 
  Puzzle, 
  ChevronDown, 
  Pin, 
  PinOff,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import { useFont } from '../../fonts/FontContext';

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
  updateInfo,
  theme,
  setTheme
}) {
  const { t, lang, setLang, dir } = useI18n();
  const { currentFont, setFont, availableFonts } = useFont();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [botDropdownOpen, setBotDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);

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

  const isVisible = isPinned || isHovered;

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
        <div className="flex items-center gap-3">
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
            onClick={onExportFlow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-secondary hover:bg-surface-tertiary border border-border text-foreground text-xs font-medium transition-all"
            title={t('navbar.export_json')}
          >
            <Download size={14} />
            <span className="hidden md:inline">{t('navbar.export_json')}</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-secondary hover:bg-surface-tertiary border border-border text-foreground text-xs font-medium cursor-pointer transition-all">
            <Upload size={14} />
            <span className="hidden md:inline">{t('navbar.import_json')}</span>
            <input type="file" accept=".json" onChange={onImportFlow} className="hidden" />
          </label>

          <button
            onClick={onOpenPlugins}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-secondary hover:bg-surface-tertiary border border-border text-foreground text-xs font-medium transition-all"
            title={t('navbar.plugins')}
          >
            <Puzzle size={14} />
            <span className="hidden md:inline">{t('navbar.plugins')}</span>
          </button>
        </div>

        {/* Right / Customization Section */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="p-1.5 rounded-lg bg-surface-secondary hover:bg-surface-tertiary border border-border text-foreground text-xs flex items-center gap-1"
              title={t('navbar.language')}
            >
              <Globe size={14} />
              <span className="uppercase text-[10px] font-bold">{lang}</span>
            </button>

            {langDropdownOpen && (
              <div className="absolute end-0 top-full mt-1 w-32 bg-surface border border-border rounded-xl shadow-2xl p-1 z-50">
                {[
                  { code: 'fa', label: 'فارسی', flag: '🇮🇷' },
                  { code: 'en', label: 'English', flag: '🇺🇸' },
                  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
                  { code: 'ar', label: 'العربية', flag: '🇸🇦' }
                ].map(l => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLang(l.code);
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-start transition-colors ${
                      lang === l.code ? 'bg-accent text-accent-foreground font-semibold' : 'text-foreground hover:bg-surface-secondary'
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font Switcher */}
          <div className="relative">
            <button
              onClick={() => setFontDropdownOpen(!fontDropdownOpen)}
              className="p-1.5 rounded-lg bg-surface-secondary hover:bg-surface-tertiary border border-border text-foreground text-xs"
              title={t('navbar.font')}
            >
              <Type size={14} />
            </button>

            {fontDropdownOpen && (
              <div className="absolute end-0 top-full mt-1 w-44 bg-surface border border-border rounded-xl shadow-2xl p-1 z-50">
                {availableFonts.map(f => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setFont(f.id);
                      setFontDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-start transition-colors ${
                      currentFont === f.id ? 'bg-accent text-accent-foreground font-semibold' : 'text-foreground hover:bg-surface-secondary'
                    }`}
                  >
                    <span>{f.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

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
