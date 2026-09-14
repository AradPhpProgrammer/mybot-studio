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
  Sliders
} from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import { api } from '../../services/api';

const CANDIDATE_FIELDS = [
  { key: 'telegram_id', label_en: 'Numeric Telegram ID', label_fa: 'شناسه عددی تلگرام', default: true, required: true },
  { key: 'chat_id', label_en: 'Chat ID', label_fa: 'شناسه چت', default: true, required: true },
  { key: 'first_name', label_en: 'First Name', label_fa: 'نام کوچک', default: true, required: false },
  { key: 'start_date', label_en: 'First Start Date', label_fa: 'تاریخ اولین استارت', default: true, required: false },
  { key: 'username', label_en: 'Telegram @Username', label_fa: 'نام کاربری (@username)', default: false, required: false },
  { key: 'last_name', label_en: 'Last Name', label_fa: 'نام خانوادگی', default: false, required: false },
  { key: 'language_code', label_en: 'Language Code', label_fa: 'کد زبان تلگرام', default: false, required: false },
  { key: 'balance', label: 'User Balance / Credits', label_fa: 'موجودی حساب کاربر', default: false, required: false },
  { key: 'ref_code', label: 'Referral / Deep-Link Code', label_fa: 'کد معرف / لینک ورودی', default: false, required: false },
  { key: 'inviter_id', label: 'Inviter Telegram ID', label_fa: 'شناسه معرف', default: false, required: false },
  { key: 'last_seen', label: 'Last Activity Date', label_fa: 'تاریخ آخرین فعالیت', default: false, required: false },
  { key: 'total_starts', label: 'Total Starts Count', label_fa: 'شمارنده تعداد استارت', default: false, required: false },
  { key: 'custom_variables', label: 'Flow Set-Variables (NoSQL)', label_fa: 'متغیرهای سفارشی فلو', default: false, required: false },
];

export default function BotSettingsModal({ isOpen, onClose, bot, onBotUpdated, onExportFlow, onImportFlow }) {
  const { t, lang } = useI18n();

  const [name, setName] = useState('');
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

  // Database tracking settings
  const [dbMenuOpen, setDbMenuOpen] = useState(false);
  const [trackedFields, setTrackedFields] = useState(['telegram_id', 'chat_id', 'first_name', 'start_date']);
  const [dbFileName, setDbFileName] = useState('');
  const [subscribersCount, setSubscribersCount] = useState(0);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const exportInputRef = useRef(null);

  useEffect(() => {
    if (bot) {
      setName(bot.name || '');
      const s = bot.settings || {};
      setBio(s.bio || '');
      setDescription(s.description || '');
      setIsMiniapp(Boolean(s.is_miniapp_enabled));
      setMiniappUrl(s.miniapp_url || '');
      setAutoChatAction(s.auto_chat_action ?? true);
      setSyncCommands(s.sync_commands_automatically ?? false);
      setCustomProxy(s.custom_proxy || '');
      setCfWorkerUrl(s.cf_worker_url || '');
      setPhotoUrl(s.photo_url || bot.photo_url || '');

      const currentTracked = Array.isArray(s.tracked_user_fields) && s.tracked_user_fields.length > 0
        ? s.tracked_user_fields
        : ['telegram_id', 'chat_id', 'first_name', 'start_date'];
      setTrackedFields(currentTracked);

      // Fetch per-bot DB info
      api.getBotDbSchema?.(bot.id)
        .then((info) => {
          if (info) {
            if (info.database_file) setDbFileName(info.database_file);
            if (typeof info.subscribers_count === 'number') setSubscribersCount(info.subscribers_count);
            if (Array.isArray(info.tracked_fields)) setTrackedFields(info.tracked_fields);
          }
        })
        .catch(() => {});
    }
    setErrorMsg('');
    setSavedSuccess(false);
  }, [bot, isOpen]);

  if (!isOpen || !bot) return null;

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setErrorMsg('');
    try {
      const res = await api.uploadBotAvatar(bot.id, file);
      setPhotoUrl(res.photo_url);
      const updated = {
        ...bot,
        photo_url: res.photo_url,
        settings: { ...bot.settings, photo_url: res.photo_url }
      };
      onBotUpdated?.(updated);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to upload photo');
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
        bio: bio.trim(),
        description: description.trim(),
        is_miniapp_enabled: isMiniapp,
        miniapp_url: miniappUrl.trim(),
        auto_chat_action: autoChatAction,
        sync_commands_automatically: syncCommands,
        custom_proxy: customProxy.trim(),
        cf_worker_url: cfWorkerUrl.trim(),
        tracked_user_fields: trackedFields
      };

      const res = await api.updateBotSettings(bot.id, payload);
      const updatedBot = {
        ...bot,
        name: res.name || payload.name,
        photo_url: photoUrl,
        settings: res.settings || { ...bot.settings, ...payload, photo_url: photoUrl }
      };

      onBotUpdated?.(updatedBot);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 600);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update bot settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface-secondary/50">
          <div className="flex items-center gap-2.5">
            <Sliders size={16} className="text-accent" />
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {t('bot_settings.title') || 'Bot Settings'}
              </h2>
              <p className="text-[11px] text-muted font-mono">@{bot.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1 text-foreground">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Telegram / Instagram Style Profile Photo Circle */}
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-surface-secondary/40 border border-border">
            <div className="relative w-16 h-16 shrink-0">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={name}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-full object-cover border-2 border-border shadow-md cursor-pointer hover:opacity-80 transition-opacity"
                  title="Click to change photo"
                />
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-full border-2 border-dashed border-border bg-surface-secondary flex items-center justify-center text-muted hover:border-accent hover:text-accent transition-colors cursor-pointer"
                  title="Upload profile photo"
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
                {photoUrl ? (lang === 'fa' ? 'تصویر پروفایل ربات' : 'Bot Profile Photo') : (lang === 'fa' ? 'آپلود تصویر پروفایل' : 'Upload Profile Photo')}
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                {lang === 'fa'
                  ? 'برای تغییر یا ثبت لوگوی ربات روی دایره کلیک کنید.'
                  : 'Click the circle to upload a custom avatar for this bot.'}
              </p>
            </div>
          </div>

          {/* Bot Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {t('bot_settings.name_label') || 'Bot Display Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Telegram Bot"
              className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground outline-none focus:border-accent font-sans"
            />
          </div>

          {/* Bot Bio */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {t('bot_settings.bio_label') || 'Bot Bio'}
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Short bio (appears in bot profile info)"
              className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground outline-none focus:border-accent font-sans"
            />
          </div>

          {/* Bot Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {lang === 'fa' ? 'توضیحات قبل از استارت ربات' : 'What can this bot do? (Description)'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shown on the empty chat screen before user presses /start"
              className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-foreground outline-none focus:border-accent resize-none font-sans"
            />
          </div>

          {/* Per-Bot Isolated Database & Field Tracking Collapsible */}
          <div className="rounded-2xl border border-border overflow-hidden bg-surface-secondary/30">
            <button
              type="button"
              onClick={() => setDbMenuOpen(!dbMenuOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-start hover:bg-surface-secondary/60 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Database size={15} className="text-accent" />
                <div>
                  <div className="text-xs font-bold text-foreground">
                    {lang === 'fa' ? 'تنظیمات دیتابیس اختصاصی و فیلدها' : 'Isolated Database & Tracked Fields'}
                  </div>
                  <div className="text-[10px] text-muted font-mono">
                    {dbFileName || `bot_${bot.id}.db`} • {subscribersCount} {lang === 'fa' ? 'مشترک' : 'subscriber(s)'}
                  </div>
                </div>
              </div>
              {dbMenuOpen ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
            </button>

            {dbMenuOpen && (
              <div className="p-3.5 border-t border-border bg-surface space-y-2.5">
                <p className="text-[11px] text-muted leading-relaxed">
                  {lang === 'fa'
                    ? 'هر ربات دیتابیس لوکال مجزای خودش را دارد. فقط فیلدهایی که تیک خورده باشند ذخیره می‌شوند تا دیتابیس شلوغ و سنگین نشود.'
                    : 'Each bot has its own SQLite file. Only checked fields are saved to keep the database fast and clean.'}
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
                          {lang === 'fa' ? f.label_fa : f.label_en}
                          {f.required && (
                            <span className="text-[9px] text-accent ms-1 font-semibold">
                              ({lang === 'fa' ? 'الزامی' : 'required'})
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
                  {t('bot_settings.miniapp_toggle') || 'Telegram Mini App'}
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  {t('bot_settings.miniapp_desc') || 'Enable interactive WebApp button in menu'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={isMiniapp}
                onChange={(e) => setIsMiniapp(e.target.checked)}
                className="w-4 h-4 accent-accent rounded cursor-pointer"
              />
            </div>
            {isMiniapp && (
              <input
                type="url"
                value={miniappUrl}
                onChange={(e) => setMiniappUrl(e.target.value)}
                placeholder="https://your-domain.com/webapp"
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground outline-none focus:border-accent font-mono"
              />
            )}
          </div>

          {/* Auto Chat Action Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-secondary/40 border border-border">
            <div>
              <div className="text-xs font-bold text-foreground">
                {t('bot_settings.auto_typing') || 'Auto Chat Action'}
              </div>
              <p className="text-[11px] text-muted">
                {t('bot_settings.auto_typing_desc') || 'Show typing / sending photo before answering'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoChatAction}
              onChange={(e) => setAutoChatAction(e.target.checked)}
              className="w-4 h-4 accent-accent rounded cursor-pointer"
            />
          </div>

          {/* Sync Commands with BotFather Toggle (default OFF) */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-secondary/40 border border-border">
            <div>
              <div className="text-xs font-bold text-foreground">
                {t('bot_settings.sync_commands') || 'Auto-Sync Slash Commands'}
              </div>
              <p className="text-[11px] text-muted">
                {t('bot_settings.sync_commands_desc') || 'Automatically register flow slash commands (/start, /help) to Telegram menu via setMyCommands'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={syncCommands}
              onChange={(e) => setSyncCommands(e.target.checked)}
              className="w-4 h-4 accent-accent rounded cursor-pointer"
            />
          </div>

          {/* Export / Import Flow */}
          <div className="p-3 rounded-2xl bg-surface-secondary/40 border border-border space-y-2">
            <div className="text-xs font-bold text-foreground">
                          {t('bot_settings.flow_transfer') || 'Template Builder (Export / Import)'}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={onExportFlow}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-surface-secondary hover:bg-surface-tertiary border border-border text-foreground text-xs font-medium transition-all"
                          >
                            <Download size={14} />
                            {t('navbar.export_json') || 'Export JSON'}
                          </button>
                          <button
                            type="button"
                            onClick={() => exportInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-surface-secondary hover:bg-surface-tertiary border border-border text-foreground text-xs font-medium transition-all"
                          >
                            <Upload size={14} />
                            {t('navbar.import_json') || 'Import JSON'}
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
                          {t('bot_settings.flow_transfer_desc') || 'Build a reusable flow template and export it to JSON, or import an existing template.'}
                        </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-muted hover:text-foreground font-medium"
            >
              {t('common.cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-md disabled:opacity-50 transition-all hover:opacity-90"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{t('common.saving') || 'Saving...'}</span>
                </>
              ) : savedSuccess ? (
                <>
                  <Check size={14} />
                  <span>{t('common.saved') || 'Saved!'}</span>
                </>
              ) : (
                <span>{t('common.save') || 'Save Settings'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}