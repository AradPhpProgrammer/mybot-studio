import React, { useState, useEffect } from 'react';
import { X, Bot, Save, Globe, Terminal, Sparkles, Check, AlertCircle } from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import { api } from '../../services/api';

export default function BotSettingsModal({ isOpen, onClose, bot, onBotUpdated }) {
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [description, setDescription] = useState('');
  const [isMiniAppEnabled, setIsMiniAppEnabled] = useState(false);
  const [miniAppUrl, setMiniAppUrl] = useState('');
  const [autoChatAction, setAutoChatAction] = useState(true);
  const [customProxy, setCustomProxy] = useState('');
  const [cfWorkerUrl, setCfWorkerUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (bot) {
      setName(bot.name || '');
      const s = bot.settings || {};
      setBio(s.bio || '');
      setDescription(s.description || '');
      setIsMiniAppEnabled(!!s.is_miniapp_enabled);
      setMiniAppUrl(s.miniapp_url || '');
      setAutoChatAction(s.auto_chat_action !== false);
      setCustomProxy(s.custom_proxy || '');
      setCfWorkerUrl(s.cf_worker_url || '');
      setSavedSuccess(false);
      setErrorMsg('');
    }
  }, [bot, isOpen]);

  if (!isOpen || !bot) return null;

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    setSavedSuccess(false);
    try {
      const payload = {
        name: name.trim() || bot.name,
        bio: bio.trim(),
        description: description.trim(),
        is_miniapp_enabled: isMiniAppEnabled,
        miniapp_url: miniAppUrl.trim(),
        auto_chat_action: autoChatAction,
        custom_proxy: customProxy.trim(),
        cf_worker_url: cfWorkerUrl.trim()
      };

      const res = await api.updateBotSettings(bot.id, payload);
      const updatedBot = {
        ...bot,
        name: res.name || payload.name,
        settings: res.settings || { ...bot.settings, ...payload }
      };

      onBotUpdated?.(updatedBot);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update bot settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-secondary/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <Bot size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {t('bot_settings.title') || 'Bot Settings'}
              </h2>
              <p className="text-[11px] text-muted">@{bot.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Bot Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              {t('bot_settings.name_label') || 'Bot Display Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Bot"
              className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground outline-none focus:border-accent"
            />
          </div>

          {/* Bio / Short description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              {t('bot_settings.bio_label') || 'Bot Bio / Description'}
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Short bio shown in Telegram profile..."
              className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground outline-none focus:border-accent resize-none"
            />
          </div>

          {/* MiniApp Settings */}
          <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles size={14} className="text-accent" />
                  <span>{t('bot_settings.miniapp_toggle') || 'Telegram Mini App (Web App)'}</span>
                </div>
                <div className="text-[11px] text-muted">
                  {t('bot_settings.miniapp_desc') || 'Enable interactive WebApp button in menu'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={isMiniAppEnabled}
                onChange={(e) => setIsMiniAppEnabled(e.target.checked)}
                className="w-4 h-4 accent-accent cursor-pointer"
              />
            </div>

            {isMiniAppEnabled && (
              <div className="pt-2 border-t border-border/60">
                <label className="text-[11px] font-medium text-muted block mb-1">
                  {t('bot_settings.miniapp_url') || 'Mini App Web URL'}
                </label>
                <input
                  type="url"
                  value={miniAppUrl}
                  onChange={(e) => setMiniAppUrl(e.target.value)}
                  placeholder="https://yourapp.example.com"
                  className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-foreground outline-none focus:border-accent font-mono"
                />
              </div>
            )}
          </div>

          {/* Auto Chat Action */}
          <div className="p-3 rounded-xl border border-border bg-surface-secondary/40 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-foreground">
                {t('bot_settings.auto_typing') || 'Auto Chat Action (Typing Indicator)'}
              </div>
              <div className="text-[11px] text-muted">
                {t('bot_settings.auto_typing_desc') || 'Displays typing / uploading status before sending'}
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoChatAction}
              onChange={(e) => setAutoChatAction(e.target.checked)}
              className="w-4 h-4 accent-accent cursor-pointer"
            />
          </div>

          {/* Custom Proxy & CF Worker */}
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {t('bot_settings.cf_worker') || 'Cloudflare Worker Reverse Proxy URL'}
              </label>
              <input
                type="url"
                value={cfWorkerUrl}
                onChange={(e) => setCfWorkerUrl(e.target.value)}
                placeholder="https://telegram-proxy.example.workers.dev"
                className="w-full px-3 py-1.5 rounded-lg bg-surface-secondary border border-border text-xs text-foreground font-mono outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {t('bot_settings.custom_proxy') || 'HTTP / SOCKS5 Proxy'}
              </label>
              <input
                type="text"
                value={customProxy}
                onChange={(e) => setCustomProxy(e.target.value)}
                placeholder="http://127.0.0.1:10809"
                className="w-full px-3 py-1.5 rounded-lg bg-surface-secondary border border-border text-xs text-foreground font-mono outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border bg-surface-secondary/50 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-surface transition-colors"
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-md disabled:opacity-50"
          >
            {savedSuccess ? (
              <>
                <Check size={14} />
                <span>{t('common.saved') || 'Saved!'}</span>
              </>
            ) : saving ? (
              <span>{t('common.saving') || 'Saving...'}</span>
            ) : (
              <>
                <Save size={14} />
                <span>{t('common.save') || 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
