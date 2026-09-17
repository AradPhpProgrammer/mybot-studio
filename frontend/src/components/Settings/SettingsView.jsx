import React, { useState, useEffect } from 'react';
import { Settings, KeyRound, Globe, Type, Upload, CheckCircle2, AlertCircle, Loader2, Plus, Moon, Sun, Wifi } from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import { useFont } from '../../fonts/FontContext';
import { api } from '../../services/api';

export default function SettingsView({ currentTheme, onThemeChange }) {
  const { t, lang, setLang, dir } = useI18n();
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

  // Proxy settings
  const [cfWorkerUrl, setCfWorkerUrl] = useState('');
  const [httpProxyUrl, setHttpProxyUrl] = useState('');
  const [proxyMode, setProxyMode] = useState('none');
  const [proxyLoading, setProxyLoading] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState(null);

  useEffect(() => {
    loadLanguages();
    loadProxySettings();
  }, []);

  const loadLanguages = async () => {
    try {
      const list = await api.getLanguages();
      setInstalledLanguages(list);
    } catch (e) {
      console.error(e);
    }
  };

  const loadProxySettings = async () => {
    try {
      const res = await api.getProxyConfig();
      setCfWorkerUrl(res.cf_worker_url || '');
      setHttpProxyUrl(res.http_proxy || '');
      setProxyMode(res.proxy_mode || 'none');
    } catch (e) {
      console.error('Failed to load proxy settings', e);
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
      setCredMessage({ text: t('settings.credentials_saved'), type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setCredLoading(false);
      setCredMessage({ text: err.message, type: 'error' });
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
      setLangUploadMessage(`${res.code} - ${t('common.success')}`);
      loadLanguages();
    } catch (err) {
      setLangLoading(false);
      setLangUploadMessage(err.message);
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

    const newFont = { id: fontId, name: customFontName.trim(), family: `'${customFontName.trim()}', sans-serif` };
    setFontList((prev) => [...prev, newFont]);
    setFont(fontId);
    setCustomFontName('');
    setCustomFontCdn('');
  };

  const handleSaveProxy = async () => {
    setProxyLoading(true);
    try {
      await api.saveProxyConfig({ cf_worker_url: cfWorkerUrl, http_proxy: httpProxyUrl, proxy_mode: proxyMode });
      setCredMessage({ text: t('settings.proxy_saved'), type: 'success' });
    } catch (e) {
      setCredMessage({ text: e.message, type: 'error' });
    } finally {
      setProxyLoading(false);
    }
  };

  const handleTestProxy = async () => {
    setProxyLoading(true);
    setProxyTestResult(null);
    try {
      const res = await api.testProxy({ cf_worker_url: cfWorkerUrl, http_proxy: httpProxyUrl });
      setProxyTestResult(res);
    } catch (e) {
      setProxyTestResult({ success: false, error: e.message });
    } finally {
      setProxyLoading(false);
    }
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground">{t('settings.title')}</h1>
          <p className="text-xs text-muted">{t('settings.subtitle')}</p>
        </div>

        {/* 1. Appearance & Theme */}
        <section className="p-6 rounded-2xl bg-surface border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 text-foreground font-bold text-sm">
            <Moon size={17} className="text-accent" />
            <h2>{t('settings.appearance_section')}</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              onClick={() => onThemeChange('dark')}
              className={`p-4 rounded-xl border text-start transition-all ${
                currentTheme === 'dark' ? 'bg-accent text-accent-foreground border-accent' : 'bg-surface-secondary border-border hover:border-muted'
              }`}
            >
              <Moon size={20} className="mb-2" />
              <div className="text-xs font-semibold">{t('settings.theme_dark')}</div>
            </button>
            <button
              onClick={() => onThemeChange('light')}
              className={`p-4 rounded-xl border text-start transition-all ${
                currentTheme === 'light' ? 'bg-accent text-accent-foreground border-accent' : 'bg-surface-secondary border-border hover:border-muted'
              }`}
            >
              <Sun size={20} className="mb-2" />
              <div className="text-xs font-semibold">{t('settings.theme_light')}</div>
            </button>
          </div>
        </section>

        {/* 2. Change Credentials */}
        <section className="p-6 rounded-2xl bg-surface border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 text-foreground font-bold text-sm">
            <KeyRound size={17} className="text-accent" />
            <h2>{t('settings.credentials_section')}</h2>
          </div>

          <form onSubmit={handleUpdateCredentials} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">{t('settings.current_password')}</label>
              <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground outline-none focus:border-accent" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">{t('settings.new_username')}</label>
              <input type="text" required value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="admin" className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground outline-none focus:border-accent" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">{t('settings.new_password')}</label>
              <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground outline-none focus:border-accent" />
            </div>
            <div className="md:col-span-3 flex items-center justify-end pt-2">
              <button type="submit" disabled={credLoading} className="px-5 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-md hover:opacity-90 disabled:opacity-50 transition-all">
                {credLoading ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}{t('settings.save_credentials_btn')}
              </button>
            </div>
          </form>
          {credMessage.text && (
            <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${credMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
              {credMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {credMessage.text}
            </div>
          )}
        </section>

        {/* 3. Language & Localization */}
        <section className="p-6 rounded-2xl bg-surface border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 text-foreground font-bold text-sm">
            <Globe size={17} className="text-accent" />
            <h2>{t('settings.language_section')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted">{t('settings.select_language')}</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ code: 'en', flag: '🇺🇸' }, { code: 'fa', flag: '🇮🇷' }, { code: 'ru', flag: '🇷🇺' }, { code: 'ar', flag: '🇸🇦' }].map((l) => (
                  <button key={l.code} type="button" onClick={() => setLang(l.code)} className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition-all ${lang === l.code ? 'bg-accent text-accent-foreground border-accent shadow-sm' : 'bg-surface-secondary border-border hover:border-muted text-foreground'}`}>
                    <span className="text-base">{l.flag}</span>
                    <span>{t(`languages.${l.code}`)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-surface-secondary border border-dashed border-border flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="text-xs font-bold text-foreground">{t('settings.upload_language_title')}</div>
                <p className="text-[11px] text-muted leading-relaxed">{t('settings.upload_language_desc')}</p>
              </div>
              {langUploadMessage && <div className="text-[11px] p-2 rounded-lg bg-surface border border-border text-foreground">{langUploadMessage}</div>}
              <label className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-surface border border-border hover:bg-surface-tertiary text-xs font-semibold text-foreground cursor-pointer transition-colors">
                <Upload size={14} /><span>{langLoading ? <Loader2 size={14} className="animate-spin" /> : t('settings.upload_btn')}</span>
                <input type="file" accept=".json" onChange={handleLanguageUpload} className="hidden" />
              </label>
            </div>
          </div>
        </section>

        {/* 4. Typography & Fonts */}
        <section className="p-6 rounded-2xl bg-surface border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 text-foreground font-bold text-sm">
            <Type size={17} className="text-accent" />
            <h2>{t('settings.font_section')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted">{t('settings.select_font')}</label>
              <div className="space-y-1.5">
                {fontList.map((f) => (
                  <button key={f.id} type="button" onClick={() => setFont(f.id)} className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all ${currentFont === f.id ? 'bg-accent text-accent-foreground border-accent shadow-sm' : 'bg-surface-secondary border-border hover:border-muted text-foreground'}`}>
                    <span>{f.name}</span>
                    <span className="text-[10px] opacity-70 font-mono">{t('settings.font_sample')}</span>
                  </button>
                ))}
              </div>
            </div>
            <form onSubmit={handleAddCustomFont} className="p-4 rounded-xl bg-surface-secondary border border-border space-y-3">
              <div className="text-xs font-bold text-foreground">{t('settings.add_font_title')}</div>
              <input type="text" required placeholder={t('settings.font_name_placeholder')} value={customFontName} onChange={(e) => setCustomFontName(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-field-placeholder outline-none focus:border-accent" />
              <input type="url" placeholder={t('settings.font_cdn_placeholder')} value={customFontCdn} onChange={(e) => setCustomFontCdn(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground placeholder:text-field-placeholder outline-none focus:border-accent" />
              <button type="submit" className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-xs hover:opacity-90 transition-opacity"><Plus size={14} />{t('settings.add_font_btn')}</button>
            </form>
          </div>
        </section>

        {/* 5. Cloudflare Tunnel & Proxy */}
        <section className="p-6 rounded-2xl bg-surface border border-border space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 text-foreground font-bold text-sm">
            <Wifi size={17} className="text-accent" />
            <h2>{t('settings.proxy_section')}</h2>
          </div>
          <p className="text-xs text-muted">{t('settings.proxy_subtitle')}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">{t('settings.cf_worker_label')}</label>
              <input type="text" value={cfWorkerUrl} onChange={(e) => setCfWorkerUrl(e.target.value)} placeholder={t('settings.cf_worker_placeholder')} className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground outline-none focus:border-accent" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">{t('settings.http_proxy_label')}</label>
              <input type="text" value={httpProxyUrl} onChange={(e) => setHttpProxyUrl(e.target.value)} placeholder={t('settings.http_proxy_placeholder')} className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground outline-none focus:border-accent" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">{t('settings.proxy_routing_mode')}</label>
            <select value={proxyMode} onChange={(e) => setProxyMode(e.target.value)} className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground outline-none focus:border-accent">
              <option value="none">{t('settings.proxy_mode_none')}</option>
              <option value="all">{t('settings.proxy_mode_all')}</option>
              <option value="selected">{t('settings.proxy_mode_selected')}</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleTestProxy} disabled={proxyLoading} className="px-4 py-2 rounded-xl bg-surface-secondary border border-border text-xs font-semibold text-foreground hover:bg-surface-tertiary transition-colors">
              {proxyLoading ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}{t('settings.test_latency_btn')}
            </button>
            <button onClick={handleSaveProxy} disabled={proxyLoading} className="px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-md hover:opacity-90 disabled:opacity-50 transition-all">
              {t('settings.save_proxy_btn')}
            </button>
          </div>

          {proxyTestResult && (
            <div className={`text-xs px-3 py-2 rounded-lg ${proxyTestResult.success ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
              {proxyTestResult.success ? `${t('settings.proxy_test_success', { latency: proxyTestResult.latency_ms })}` : `${t('settings.proxy_test_failed')}: ${proxyTestResult.error}`}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
