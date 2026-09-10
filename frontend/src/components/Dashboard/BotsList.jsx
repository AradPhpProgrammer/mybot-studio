import React, { useState } from 'react';
import { 
  Bot, 
  Plus, 
  ArrowRight, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles,
  Layers
} from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import { api } from '../../services/api';

export default function BotsList({
  bots,
  onSelectBot,
  onBotCreated,
  onDeleteBot
}) {
  const { t, dir } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [proxyInput, setProxyInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedBot, setVerifiedBot] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleVerifyAndCreate = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsVerifying(true);
    setErrorMessage('');
    try {
      const res = await api.createBot(tokenInput.trim(), proxyInput.trim(), proxyInput.trim());
      setVerifiedBot(res.bot);
      setIsVerifying(false);
      onBotCreated();
    } catch (err) {
      setIsVerifying(false);
      setErrorMessage(err.message || 'اعتبارسنجی توکن با تلگرام ناموفق بود.');
    }
  };

  const handleOpenBot = (bot) => {
    setModalOpen(false);
    setVerifiedBot(null);
    setTokenInput('');
    onSelectBot(bot);
  };

  return (
    <div className="w-full h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center max-w-lg mb-10 z-10 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-xs font-semibold text-foreground shadow-xs">
          <Sparkles size={14} className="text-accent" />
          <span>MyBot Studio v1.0</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
          {t('dashboard.welcome')}
        </h1>
        <p className="text-xs md:text-sm text-muted leading-relaxed">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-4xl z-10">
        {bots.length === 0 ? (
          /* Empty State exactly as requested by user */
          <div className="flex flex-col items-center justify-center p-12 bg-surface/70 border border-border rounded-3xl backdrop-blur-xl shadow-xl text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-foreground">
                {t('dashboard.no_profiles_title')}
              </h2>
              <p className="text-xs text-muted max-w-sm">
                {t('dashboard.no_profiles_desc')}
              </p>
            </div>

            {/* Circular Plus Action Button */}
            <button
              onClick={() => {
                setModalOpen(true);
                setVerifiedBot(null);
                setErrorMessage('');
              }}
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
          /* Bot Profiles Grid */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-foreground">پروفایل‌های ربات شما ({bots.length})</div>
              <button
                onClick={() => {
                  setModalOpen(true);
                  setVerifiedBot(null);
                  setErrorMessage('');
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-md hover:opacity-90 transition-all"
              >
                <Plus size={15} />
                <span>{t('dashboard.create_bot_btn')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bots.map((bot) => (
                <div
                  key={bot.id}
                  className="p-5 rounded-2xl bg-surface/80 border border-border hover:border-accent/50 shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col justify-between space-y-4 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 font-bold">
                        <Bot size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">{bot.name}</div>
                        <div className="text-xs text-muted">@{bot.username}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteBot(bot.id)}
                      className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="حذف ربات"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/60 text-[11px] text-muted font-mono">
                    <span>ID: {bot.telegram_bot_id}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-semibold">
                      آنلاین
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectBot(bot)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-secondary hover:bg-accent hover:text-accent-foreground text-xs font-semibold text-foreground transition-all"
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
          <div className="w-full max-w-md bg-surface border border-border rounded-3xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95">
            {!verifiedBot ? (
              <form onSubmit={handleVerifyAndCreate} className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground">
                    {t('dashboard.create_bot_btn')}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    {t('dashboard.no_profiles_desc')}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    {t('dashboard.token_input_label')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('dashboard.token_placeholder')}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground placeholder:text-field-placeholder outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    {t('dashboard.proxy_optional')}
                  </label>
                  <input
                    type="text"
                    placeholder="https://your-cf-worker.workers.dev"
                    value={proxyInput}
                    onChange={(e) => setProxyInput(e.target.value)}
                    className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-field-placeholder outline-none focus:border-accent"
                  />
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs">
                    {errorMessage}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-muted hover:text-foreground font-medium"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifying || !tokenInput.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-md disabled:opacity-50 transition-all"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>{t('dashboard.verifying_token')}</span>
                      </>
                    ) : (
                      <span>تایید و ادامه</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Verified Bot Success Card */
              <div className="text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground">
                    {t('dashboard.bot_verified')}
                  </h3>
                  <p className="text-xs text-muted">
                    اطلاعات ربات با موفقیت از سرورهای تلگرام دریافت شد:
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-secondary border border-border text-start space-y-2 text-xs font-medium">
                  <div className="flex justify-between">
                    <span className="text-muted">نام ربات:</span>
                    <span className="font-bold text-foreground">{verifiedBot.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">یوزرنیم:</span>
                    <span className="font-bold text-foreground">@{verifiedBot.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">شناسه عددی (Bot ID):</span>
                    <span className="font-mono text-foreground">{verifiedBot.telegram_bot_id}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenBot(verifiedBot)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-accent-foreground text-xs font-semibold shadow-lg hover:opacity-90 transition-opacity"
                >
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
