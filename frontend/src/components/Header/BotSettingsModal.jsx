import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  Loader2,
  Check,
  AlertCircle,
  Upload,
  Download,
  Database,
  ChevronDown,
  ChevronUp,
  Sliders,
  Eye,
  EyeOff,
  Key
} from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import { api } from '../../services/api';

const CANDIDATE_FIELDS = [
  { key: 'telegram_id', default: true, required: true },
  { key: 'chat_id', default: true, required: true },
  { key: 'first_name', default: true, required: false },
  { key: 'start_date', default: true, required: false },
  { key: 'username', default: false, required: false },
  { key: 'last_name', default: false, required: false },
  { key: 'language_code', default: false, required: false },
  { key: 'balance', default: false, required: false },
  { key: 'ref_code', default: false, required: false },
  { key: 'inviter_id', default: false, required: false },
  { key: 'last_seen', default: false, required: false },
  { key: 'total_starts', default: false, required: false },
  { key: 'custom_variables', default: true, required: false },
];

export default function BotSettingsModal({ isOpen, onClose, bot, onBotUpdated, onExportFlow, onImportFlow }) {
  const { t, dir } = useI18n();

  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [bio, setBio] = useState('');
  const [description, setDescription] = useState('');
  const [isMiniapp, setIsMiniapp] = useState(false);
  const [miniappUrl, setMiniappUrl] = useState('');
  const [autoChatAction, setAutoChatAction] = useState(true);
  const [syncCommands, setSyncCommands] = useState(false);
  const [customProxy, setCustomProxy] = useState('');
  const [cfWorkerUrl, setCfWorkerUrl] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [failedPhotoUrl, setFailedPhotoUrl] = useState('');

  // Database tracking settings
  const [dbMenuOpen, setDbMenuOpen] = useState(false);
  const [trackedFields, setTrackedFields] = useState(() => CANDIDATE_FIELDS.filter((f) => f.default).map((f) => f.key));
  const [dbFileName, setDbFileName] = useState('');
  const [subscribersCount, setSubscribersCount] = useState(0);
  // One editable state for both controls; the saved master flag is authoritative on load.
  const enableUserDb = trackedFields.includes('custom_variables');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const exportInputRef = useRef(null);

  useEffect(() => {
    // Reset transient dialog state only on the open transition, never on a bot-content
    // change while the dialog stays open (a save can update the bot and set a warning).
    if (isOpen) {
      setErrorMsg('');
      setSavedSuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let cancelled = false;
    if (bot && isOpen) {
      setName(bot.name || '');
      setToken('');
      setShowToken(false);
      const s = bot.settings || {};
      setBio(s.bio || '');
      setDescription(s.description || '');
      setIsMiniapp(Boolean(s.is_miniapp_enabled));
      setMiniappUrl(s.miniapp_url || '');
      setAutoChatAction(s.auto_chat_action ?? true);
      setSyncCommands(s.sync_commands_automatically ?? false);
      setCustomProxy(s.custom_proxy || '');
      setCfWorkerUrl(s.cf_worker_url || '');
      setPhotoUrl(s.photo_url || bot.photo_url || '/default-bot.png');
      setFailedPhotoUrl('');
      const currentTracked = Array.isArray(s.tracked_user_fields)
        ? s.tracked_user_fields
        : CANDIDATE_FIELDS.filter((f) => f.default).map((f) => f.key);
      // Legacy tracked lists omitted custom_variables even when the feature was on.
      // Only an explicit false master flag disables it; preserve all other choices.
      setTrackedFields([
        ...currentTracked.filter((key) => key !== 'custom_variables'),
        ...(s.enable_user_database !== false ? ['custom_variables'] : [])
      ]);

      // Schema is informational only: never replace editable settings with a late response.
      setDbFileName('');
      setSubscribersCount(0);
      api.getBotDbSchema?.(bot.id)
        .then((info) => {
          if (info && !cancelled) {
            if (info.database_file) setDbFileName(info.database_file);
            if (typeof info.subscribers_count === 'number') setSubscribersCount(info.subscribers_count);
          }
        })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [bot, isOpen]);

  if (!isOpen || !bot) return null;

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setErrorMsg('');
    try {
      const res = await api.uploadBotAvatar(bot.id, file);
      setFailedPhotoUrl('');
      setPhotoUrl(res.photo_url);
      const { token: _token, ...safeBot } = bot;
      const { token: _settingsToken, ...safeSettings } = bot.settings || {};
      const updated = {
        ...safeBot,
        photo_url: res.photo_url,
        settings: { ...safeSettings, photo_url: res.photo_url }
      };
      onBotUpdated?.(updated);
    } catch (err) {
      setErrorMsg(err.message || t('bot_settings.upload_error'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const toggleField = (key, required) => {
    if (required) return;
    setTrackedFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        name: name.trim() || bot.name,
        token: token.trim() || undefined,
        bio: bio.trim(),
        description: description.trim(),
        is_miniapp_enabled: isMiniapp,
        miniapp_url: miniappUrl.trim(),
        auto_chat_action: autoChatAction,
        sync_commands_automatically: syncCommands,
        custom_proxy: customProxy.trim(),
        cf_worker_url: cfWorkerUrl.trim(),
        enable_user_database: enableUserDb,
        tracked_user_fields: trackedFields
      };

      const res = await api.updateBotSettings(bot.id, payload);
      // Replacement credentials are write-only: never return them to cached bot state.
      const { token: _submittedToken, ...safePayload } = payload;
      const { token: _oldToken, ...safeBot } = bot;
      const { token: _oldSettingsToken, ...safeSettings } = bot.settings || {};
      const { token: _responseToken, ...responseSettings } = res.settings || {};
      const updatedBot = {
        ...safeBot,
        name: res.name || payload.name,
        username: res.username || bot.username,
        photo_url: photoUrl,
        settings: res.settings ? responseSettings : { ...safeSettings, ...safePayload, photo_url: photoUrl }
      };

      setToken('');
      onBotUpdated?.(updatedBot);
      if (Object.values(res.telegram_sync || {}).some((success) => success === false)) {
        setErrorMsg(t('bot_settings.telegram_sync_warning'));
        return;
      }
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 600);
    } catch (err) {
      const diagnostics = {
        bot_token_verification_failed: 'bot_settings.token_verification_failed',
        bot_username_read_only: 'bot_settings.username_read_only_hint'
      };
      setErrorMsg(diagnostics[err.message] ? t(diagnostics[err.message]) : err.message || t('bot_settings.save_error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div role="dialog" aria-modal="true" aria-labelledby="bot-settings-title" dir={dir} className="bot-settings-dialog w-full max-w-lg bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface-secondary/50">
          <div className="flex items-center gap-2.5">
            <Sliders size={16} className="text-accent" />
            <div>
              <h2 id="bot-settings-title" className="text-sm font-bold text-foreground">
                {t('bot_settings.title')}
              </h2>
              <p className="text-[11px] text-muted font-mono">@{bot.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="bot-settings-form min-h-0 p-5 space-y-4 overflow-y-auto flex-1 text-foreground">
          {errorMsg && (
            <div role="alert" className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Telegram / Instagram Style Profile Photo Circle */}
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-surface-secondary/40 border border-border">
            <div className="relative w-16 h-16 shrink-0">
              <button type="button" className="rounded-full" disabled={uploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                aria-label={t('bot_settings.tracked_fields.profile_photo_upload')}>
              {failedPhotoUrl !== "/default-bot.png" ? (
                <img
                  src={failedPhotoUrl === photoUrl || !photoUrl ? "/default-bot.png" : photoUrl}
                  alt=""
                  onError={(e) => setFailedPhotoUrl(e.currentTarget.getAttribute("src"))}
                  className="w-16 h-16 rounded-full object-cover border-2 border-border shadow-md cursor-pointer hover:opacity-80 transition-opacity"
                  title={t('bot_settings.tracked_fields.profile_photo_upload')}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full border-2 border-dashed border-border bg-surface-secondary flex items-center justify-center text-muted hover:border-accent hover:text-accent transition-colors cursor-pointer"
                  title={t('bot_settings.tracked_fields.profile_photo_upload')}
                >
                  {uploadingPhoto ? (
                    <Loader2 size={20} className="animate-spin text-accent" />
                  ) : (
                    <div className="w-6 h-6 border-2 border-current rounded flex items-center justify-center">
                      <Upload size={13} />
                    </div>
                  )}
                </div>
              )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold text-foreground">
                {t(photoUrl ? 'bot_settings.tracked_fields.profile_photo_title' : 'bot_settings.tracked_fields.profile_photo_upload')}
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                {t('bot_settings.tracked_fields.profile_photo_desc')}
              </p>
            </div>
          </div>

          {/* Shared label/control rows keep both scripts on the same baseline. */}
          <div className="settings-identity-grid">
            <div className="settings-field">
              <label htmlFor="bot-display-name">{t('bot_settings.name_label')}</label>
              <input id="bot-display-name" type="text" value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('bot_settings.name_placeholder')}
                className="settings-field-input" />
            </div>
            <div className="settings-field">
              <label htmlFor="bot-username" className="flex items-center justify-between gap-1">
                <span>{t('bot_settings.username_label')}</span>
                <span id="bot-username-hint" className="text-[10px] text-muted">{t('bot_settings.username_read_only_hint')}</span>
              </label>
              <input id="bot-username" type="text" value={bot.username || ''} dir="ltr" readOnly
                aria-describedby="bot-username-hint"
                className="settings-field-input cursor-default" spellCheck={false} autoCapitalize="none" />
            </div>
            <div className="settings-field">
              <label htmlFor="bot-telegram-id">{t('bot_settings.bot_id_note')}</label>
              <input id="bot-telegram-id" type="text" value={bot.telegram_bot_id ?? ''} dir="ltr" readOnly
                className="settings-field-input cursor-default" />
            </div>
          </div>

          {/* Bot Token */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Key size={12} className="text-accent" />
                <span>{t('bot_settings.token_label')}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="text-[10px] text-muted hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {showToken ? <EyeOff size={11} /> : <Eye size={11} />}
                <span>{t(showToken ? 'bot_settings.hide_token' : 'bot_settings.show_token')}</span>
              </button>
            </label>
            <input
              id="bot-token" aria-label={t('bot_settings.token_label')}
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t('bot_settings.token_placeholder')}
              dir="ltr" autoComplete="new-password"
              className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs font-mono text-foreground outline-none focus:border-accent"
            />
          </div>

          {/* Bot Bio */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {t('bot_settings.bio_label')}
            </label>
            <input
              type="text"
              id="bot-bio" aria-label={t('bot_settings.bio_label')}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('bot_settings.bio_placeholder')}
              className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground outline-none focus:border-accent font-sans"
            />
          </div>

          {/* Bot Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {t('bot_settings.tracked_fields.description_label')}
            </label>
            <textarea
              aria-label={t('bot_settings.tracked_fields.description_label')}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('bot_settings.tracked_fields.description_placeholder')}
              className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground outline-none focus:border-accent resize-none font-sans"
            />
          </div>

          {/* Per-Bot Isolated Database & Field Tracking Collapsible */}
          <div className="rounded-2xl border border-border overflow-hidden bg-surface-secondary/30">
            <button
              type="button"
              onClick={() => setDbMenuOpen(!dbMenuOpen)}
              aria-expanded={dbMenuOpen}
              className="w-full px-4 py-3 flex items-center justify-between text-start hover:bg-surface-secondary/60 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Database size={15} className="text-accent" />
                <div>
                  <div className="text-xs font-bold text-foreground">
                    {t('bot_settings.tracked_fields.db_title')}
                  </div>
                  <div className="text-[10px] text-muted font-mono">
                    {dbFileName || `bot_${bot.id}.db`} • {subscribersCount} {t('bot_settings.tracked_fields.subscribers')}
                  </div>
                </div>
              </div>
              {dbMenuOpen ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
            </button>

            {dbMenuOpen && (
              <div className="p-3.5 border-t border-border bg-surface space-y-2.5">
                {/* Master toggle: enable flow-variables / user database */}
                <label className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-colors ${
                    enableUserDb
                      ? 'bg-accent/15 border-accent/50'
                      : 'bg-surface-secondary/60 border-border hover:border-accent/40'
                  }`}>
                  <div className="flex items-start gap-2">
                    <Database size={15} className={enableUserDb ? 'text-accent' : 'text-muted'} />
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        {t('bot_settings.enable_database')}
                      </div>
                      <div className="text-[11px] text-muted leading-relaxed">
                        {t('bot_settings.enable_database_desc')}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableUserDb}
                    onChange={() => toggleField('custom_variables', false)}
                    className="rounded border-border accent-accent w-4 h-4 shrink-0"
                  />
                </label>

                {!enableUserDb && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted">
                    <ChevronUp size={12} className="text-accent" />
                    <span>
                      {t('common.enable_db_node_hint')}
                    </span>
                  </div>
                )}

                <p className="text-[11px] text-muted leading-relaxed">
                  {t('bot_settings.tracked_fields.db_desc')}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {CANDIDATE_FIELDS.map((f) => {
                    const isChecked = trackedFields.includes(f.key);
                    return (
                      <label
                        key={f.key}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-colors ${
                          isChecked
                            ? 'bg-accent/10 border-accent/40 text-foreground font-medium'
                            : 'bg-surface-secondary/50 border-border text-muted hover:text-foreground'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={f.required}
                          onChange={() => toggleField(f.key, f.required)}
                          className="rounded border-border accent-accent w-3.5 h-3.5"
                        />
                        <span className="flex-1 truncate">
                          {t(`bot_settings.tracked_fields.fields.${f.key}`)}
                          {f.required && (
                            <span className="text-[9px] text-accent ms-1 font-semibold">
                              ({t('bot_settings.tracked_fields.required')})
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Mini App Toggle */}
          <div className="p-3 rounded-2xl bg-surface-secondary/40 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-foreground">
                  {t('bot_settings.miniapp_toggle')}
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  {t('bot_settings.miniapp_desc')}
                </p>
              </div>
              <input
                type="checkbox"
                aria-label={t('bot_settings.miniapp_toggle')}
                checked={isMiniapp}
                onChange={(e) => setIsMiniapp(e.target.checked)}
                className="w-4 h-4 shrink-0 accent-accent rounded cursor-pointer"
              />
            </div>
            {isMiniapp && (
              <input
                type="url"
                value={miniappUrl}
                onChange={(e) => setMiniappUrl(e.target.value)}
                placeholder={t('bot_settings.miniapp_url')} dir="ltr" aria-label={t('bot_settings.miniapp_url')}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground outline-none focus:border-accent font-mono"
              />
            )}
          </div>

          {/* Auto Chat Action Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-secondary/40 border border-border">
            <div>
              <div className="text-xs font-bold text-foreground">
                {t('bot_settings.auto_typing')}
              </div>
              <p className="text-[11px] text-muted">
                {t('bot_settings.auto_typing_desc')}
              </p>
            </div>
            <input
              type="checkbox"
              aria-label={t('bot_settings.auto_typing')}
                checked={autoChatAction}
              onChange={(e) => setAutoChatAction(e.target.checked)}
              className="w-4 h-4 shrink-0 accent-accent rounded cursor-pointer"
            />
          </div>

          {/* Sync Commands with BotFather Toggle (default OFF) */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-secondary/40 border border-border">
            <div>
              <div className="text-xs font-bold text-foreground">
                {t('bot_settings.sync_commands')}
              </div>
              <p className="text-[11px] text-muted">
                {t('bot_settings.sync_commands_desc')}
              </p>
            </div>
            <input
              type="checkbox"
              aria-label={t('bot_settings.sync_commands')}
                checked={syncCommands}
              onChange={(e) => setSyncCommands(e.target.checked)}
              className="w-4 h-4 shrink-0 accent-accent rounded cursor-pointer"
            />
          </div>

          {/* Export / Import Flow */}
          <div className="p-3 rounded-2xl bg-surface-secondary/40 border border-border space-y-2">
            <div className="text-xs font-bold text-foreground">
                          {t('bot_settings.flow_transfer')}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={onExportFlow}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-surface-secondary hover:bg-surface-tertiary border border-border text-foreground text-xs font-medium transition-all"
                          >
                            <Download size={14} />
                            {t('navbar.export_json')}
                          </button>
                          <button
                            type="button"
                            onClick={() => exportInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-surface-secondary hover:bg-surface-tertiary border border-border text-foreground text-xs font-medium transition-all"
                          >
                            <Upload size={14} />
                            {t('navbar.import_json')}
                          </button>
                          <input
                            ref={exportInputRef}
                            type="file"
                            accept=".json,application/json"
                            className="hidden"
                            onChange={onImportFlow}
                          />
                        </div>
                        <p className="text-[10px] text-muted">
                          {t('bot_settings.flow_transfer_desc')}
                        </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-muted hover:text-foreground font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-md disabled:opacity-50 transition-all hover:opacity-90"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{t('common.saving')}</span>
                </>
              ) : savedSuccess ? (
                <>
                  <Check size={14} />
                  <span>{t('common.saved')}</span>
                </>
              ) : (
                <span>{t('common.save')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}