import React, { useState, useRef } from 'react';
import { Plus, ArrowRight, Trash2, Loader2, RefreshCw, AlertTriangle, Bot, CheckCircle2, Upload } from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import { api } from '../../services/api';
import NanoGridCanvas from '../Visuals/NanoGridCanvas';

export default function BotsList({
  bots,
  onSelectBot,
  onBotCreated,
  onDeleteBot,
  onRefreshBot,
  onUploadAvatar
}) {
  const { t, dir } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedBot, setVerifiedBot] = useState(null);
  const [warningMessage, setWarningMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshingId, setRefreshingId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const fileInputRef = useRef(null);

  const handleVerifyAndCreate = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsVerifying(true);
    setErrorMessage('');
    setWarningMessage('');
    try {
      const res = await api.createBot(tokenInput.trim(), '', '');
      setVerifiedBot(res.bot);
      if (res.bot?.network_warning) {
        setWarningMessage(res.bot.network_warning);
      }
      setIsVerifying(false);
      onBotCreated();
    } catch (err) {
      setIsVerifying(false);
      setErrorMessage(err.message || 'Token verification failed.');
    }
  };

  const handleOpenBot = (bot) => {
    setModalOpen(false);
    setVerifiedBot(null);
    setTokenInput('');
    setWarningMessage('');
    onSelectBot(bot);
  };

  const handleRefresh = async (e, bot) => {
    e.stopPropagation();
    setRefreshingId(bot.id);
    try {
      await onRefreshBot(bot);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleFileChange = async (e, bot) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUploadAvatar) return;
    e.stopPropagation();
    setUploadingId(bot.id);
    try {
      await onUploadAvatar(bot, file);
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="w-full flex-1 overflow-y-auto p-8 bg-background flex flex-col items-center justify-start relative">
      <NanoGridCanvas />

      {/* Header */}
      <div className="text-center max-w-lg mb-8 z-10 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/50 border border-border text-xs font-semibold text-foreground shadow-xs backdrop-blur-sm">
          <CheckCircle2 size={14} className="text-accent" />
          <span>MyBot Studio v0.1.0</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
          {t('dashboard.welcome')}
        </h1>
        <p className="text-xs md:text-sm text-muted leading-relaxed">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl z-10">
        {bots.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-surface/30 border border-border/50 rounded-3xl backdrop-blur-xl shadow-xl text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-foreground">{t('dashboard.no_profiles_title')}</h2>
              <p className="text-xs text-muted max-w-sm">{t('dashboard.no_profiles_desc')}</p>
            </div>
            <button
              onClick={() => { setModalOpen(true); setVerifiedBot(null); setErrorMessage(''); setWarningMessage(''); }}
              className="group relative w-20 h-20 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all"
              title={t('dashboard.create_bot_btn')}
            >
              <Plus size={36} className="transition-transform group-hover:rotate-90 duration-300" />
              <span className="absolute -bottom-7 text-[11px] font-semibold text-muted group-hover:text-foreground transition-colors whitespace-nowrap">
                {t('dashboard.create_bot_btn')}
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-foreground">{t('sidebar.profiles')} ({bots.length})</div>
              <button
                onClick={() => { setModalOpen(true); setVerifiedBot(null); setErrorMessage(''); setWarningMessage(''); }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-md hover:opacity-90 transition-all"
              >
                <Plus size={15} />
                <span>{t('dashboard.create_bot_btn')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {bots.map((bot) => (
                <div
                  key={bot.id}
                  className="p-5 rounded-2xl bg-surface/40 border border-border/60 hover:border-accent/50 shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col justify-between space-y-4 group backdrop-blur-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-14 shrink-0">
                        {bot.photo_url ? (
                          <img
                            src={bot.photo_url}
                            alt={bot.name}
                            className="w-full h-full rounded-full object-cover border border-border shadow-inner cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); document.getElementById(`avatar-input-${bot.id}`)?.click(); }}
                            title={t('dashboard.upload_photo') || 'Change Photo'}
                          />
                        ) : (
                          <label
                            htmlFor={`avatar-input-${bot.id}`}
                            className="w-14 h-14 rounded-full border-2 border-dashed border-border bg-surface-secondary/60 flex items-center justify-center text-muted group-hover:text-accent transition-colors cursor-pointer"
                            title={t('dashboard.upload_photo') || 'Upload Photo'}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {uploadingId === bot.id ? (
                              <Loader2 size={16} className="animate-spin text-accent" />
                            ) : (
                              <Upload size={18} className="text-muted group-hover:text-accent transition-colors" />
                            )}
                          </label>
                        )}
                        <input
                          id={`avatar-input-${bot.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, bot)}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">{bot.name}</div>
                        <div className="text-xs text-muted font-mono">@{bot.username}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleRefresh(e, bot)}
                        disabled={refreshingId === bot.id}
                        className="p-2 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
                        title={t('dashboard.refresh_bot')}
                      >
                        {refreshingId === bot.id ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteBot(bot.id); }}
                        className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/40 text-[11px] text-muted font-mono">
                    <span>ID: {bot.telegram_bot_id}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {t('common.online')}
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectBot(bot)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface/60 hover:bg-accent hover:text-accent-foreground text-xs font-semibold text-foreground border border-border/60 transition-all shadow-xs"
                  >
                    <span>{t('dashboard.open_studio')}</span>
                    <ArrowRight size={14} className={dir === 'rtl' ? 'rotate-180' : ''} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Bot Token Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-surface/90 border border-border rounded-3xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 backdrop-blur-xl">
            {!verifiedBot ? (
              <form onSubmit={handleVerifyAndCreate} className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground">{t('dashboard.create_bot_btn')}</h3>
                  <p className="text-xs text-muted leading-relaxed">{t('dashboard.no_profiles_desc')}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">{t('dashboard.token_input_label')}</label>
                  <input
                    type="text"
                    required
                    placeholder={t('dashboard.token_placeholder')}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground placeholder:text-field-placeholder outline-none focus:border-accent"
                  />
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs leading-relaxed">
                    {errorMessage}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl text-xs text-muted hover:text-foreground font-medium">{t('common.cancel')}</button>
                  <button type="submit" disabled={isVerifying || !tokenInput.trim()} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-md disabled:opacity-50 transition-all">
                    {isVerifying ? (<><Loader2 size={14} className="animate-spin" /><span>{t('dashboard.verifying_token')}</span></>) : <span>{t('common.confirm')}</span>}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground">{t('dashboard.bot_verified')}</h3>
                  <p className="text-xs text-muted">Bot profile created successfully with starter flow.</p>
                </div>
                {warningMessage && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] text-start leading-relaxed flex items-start gap-2">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    <span>{warningMessage}</span>
                  </div>
                )}
                <div className="p-4 rounded-2xl bg-surface-secondary border border-border text-start space-y-2 text-xs font-medium">
                  <div className="flex justify-between"><span className="text-muted">Bot Name:</span><span className="font-bold text-foreground">{verifiedBot.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Username:</span><span className="font-bold text-foreground font-mono">@{verifiedBot.username}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Bot ID:</span><span className="font-mono text-foreground">{verifiedBot.telegram_bot_id}</span></div>
                </div>
                <button onClick={() => handleOpenBot(verifiedBot)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-lg hover:opacity-90 transition-opacity">
                  <span>{t('dashboard.open_studio')}</span>
                  <ArrowRight size={15} className={dir === 'rtl' ? 'rotate-180' : ''} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
