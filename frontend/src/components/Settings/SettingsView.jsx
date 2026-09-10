import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  KeyRound, 
  Globe, 
  Type, 
  Shield, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Plus, 
  ExternalLink 
} from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import { useFont } from '../../fonts/FontContext';
import { api } from '../../services/api';

export default function SettingsView() {
  const { t, lang, setLang } = useI18n();
  const { currentFont, setFont, availableFonts } = useFont();

  // Credentials form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [credLoading, setCredLoading] = useState(false);
  const [credMessage, setCredMessage] = useState({ text: '', type: '' });

  // Languages list
  const [installedLanguages, setInstalledLanguages] = useState([]);
  const [langLoading, setLangLoading] = useState(false);
  const [langUploadMessage, setLangUploadMessage] = useState('');

  // Custom Font form
  const [customFontName, setCustomFontName] = useState('');
  const [customFontCdn, setCustomFontCdn] = useState('');
  const [fontList, setFontList] = useState(availableFonts);

  // Global Proxy
  const [cfWorkerUrl, setCfWorkerUrl] = useState('');
  const [httpProxyUrl, setHttpProxyUrl] = useState('');

  useEffect(() => {
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    try {
      const list = await api.getLanguages();
      setInstalledLanguages(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newUsername || !newPassword) return;

    setCredLoading(true);
    setCredMessage({ text: '', type: '' });
    try {
      const res = await api.changeCredentials(currentPassword, newUsername, newPassword);
      setCredLoading(false);
      setCredMessage({ text: res.message || 'Credentials updated successfully.', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setCredLoading(false);
      setCredMessage({ text: err.message || 'Error updating credentials.', type: 'error' });
    }
  };

  const handleLanguageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLangLoading(true);
    setLangUploadMessage('');
    try {
      const res = await api.uploadLanguage(file);
      setLangLoading(false);
      setLangUploadMessage(`زبان ${res.code} با موفقیت نصب شد!`);
      loadLanguages();
    } catch (err) {
      setLangLoading(false);
      setLangUploadMessage(`خطا: ${err.message}`);
    }
  };

  const handleAddCustomFont = (e) => {
    e.preventDefault();
    if (!customFontName.trim()) return;

    const fontId = customFontName.toLowerCase().replace(/\s+/g, '-');
    if (customFontCdn.trim()) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = customFontCdn.trim();
      document.head.appendChild(link);
    }

    const newFont = {
      id: fontId,
      name: customFontName.trim(),
      family: `'${customFontName.trim()}', sans-serif`
    };

    setFontList((prev) => [...prev, newFont]);
    setFont(fontId);
    setCustomFontName('');
    setCustomFontCdn('');
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground">{t('settings.title')}</h1>
          <p className="text-xs text-muted">{t('settings.subtitle')}</p>
        </div>

        {/* 1. Change Credentials */}
        <section className="p-6 rounded-2xl bg-surface border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 text-foreground font-bold text-sm">
            <KeyRound size={17} className="text-accent" />
            <h2>{t('settings.credentials_section')}</h2>
          </div>

          <form onSubmit={handleUpdateCredentials} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">{t('settings.current_password')}</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">{t('settings.new_username')}</label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">{t('settings.new_password')}</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground outline-none focus:border-accent"
              />
            </div>

            <div className="md:col-span-3 flex items-center justify-between pt-2">
              {credMessage.text && (
                <div
                  className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                    credMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  }`}
                >
                  {credMessage.type === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  <span>{credMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={credLoading}
                className="ms-auto px-5 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-md hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {credLoading ? 'در حال ذخیره...' : t('settings.save_credentials_btn')}
              </button>
            </div>
          </form>
        </section>

        {/* 2. Language & Localization */}
        <section className="p-6 rounded-2xl bg-surface border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 text-foreground font-bold text-sm">
            <Globe size={17} className="text-accent" />
            <h2>{t('settings.language_section')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Active Language Picker */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted">{t('settings.select_language')}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { code: 'en', name: 'English (Default)', flag: '🇺🇸' },
                  { code: 'fa', name: 'فارسی', flag: '🇮🇷' },
                  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
                  { code: 'ar', name: 'العربية', flag: '🇸🇦' }
                ].map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLang(l.code)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                      lang === l.code
                        ? 'bg-accent text-accent-foreground border-accent shadow-sm'
                        : 'bg-surface-secondary border-border hover:border-muted text-foreground'
                    }`}
                  >
                    <span className="text-base">{l.flag}</span>
                    <span>{l.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Language JSON File */}
            <div className="p-4 rounded-xl bg-surface-secondary border border-dashed border-border flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="text-xs font-bold text-foreground">{t('settings.upload_language_title')}</div>
                <p className="text-[11px] text-muted leading-relaxed">{t('settings.upload_language_desc')}</p>
              </div>

              {langUploadMessage && (
                <div className="text-[11px] p-2 rounded-lg bg-surface border border-border text-foreground font-medium">
                  {langUploadMessage}
                </div>
              )}

              <label className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-surface border border-border hover:bg-surface-tertiary text-xs font-semibold text-foreground cursor-pointer transition-colors">
                <Upload size={14} />
                <span>{langLoading ? 'در حال آپلود...' : t('settings.upload_btn')}</span>
                <input type="file" accept=".json" onChange={handleLanguageUpload} className="hidden" />
              </label>
            </div>
          </div>
        </section>

        {/* 3. Typography & Fonts */}
        <section className="p-6 rounded-2xl bg-surface border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 text-foreground font-bold text-sm">
            <Type size={17} className="text-accent" />
            <h2>{t('settings.font_section')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Active Font Picker */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted">{t('settings.select_font')}</label>
              <div className="space-y-1.5">
                {fontList.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFont(f.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all ${
                      currentFont === f.id
                        ? 'bg-accent text-accent-foreground border-accent shadow-sm'
                        : 'bg-surface-secondary border-border hover:border-muted text-foreground'
                    }`}
                  >
                    <span>{f.name}</span>
                    <span className="text-[10px] opacity-70 font-mono">ABC فارسی</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Add Custom Font */}
            <form onSubmit={handleAddCustomFont} className="p-4 rounded-xl bg-surface-secondary border border-border space-y-3">
              <div className="text-xs font-bold text-foreground">{t('settings.add_font_title')}</div>
              <input
                type="text"
                required
                placeholder={t('settings.font_name_placeholder')}
                value={customFontName}
                onChange={(e) => setCustomFontName(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-field-placeholder outline-none focus:border-accent"
              />
              <input
                type="url"
                placeholder={t('settings.font_cdn_placeholder')}
                value={customFontCdn}
                onChange={(e) => setCustomFontCdn(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground placeholder:text-field-placeholder outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-xs hover:opacity-90 transition-opacity"
              >
                <Plus size={14} />
                <span>{t('settings.add_font_btn')}</span>
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
