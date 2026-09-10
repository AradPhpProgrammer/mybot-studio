import React, { useState } from 'react';
import { Bot, Lock, User, ArrowRight, Loader2, Sparkles, KeyRound } from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import { api } from '../../services/api';

export default function LoginPage({ onLoginSuccess }) {
  const { t, dir } = useI18n();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError('');
    try {
      const res = await api.login(username.trim(), password.trim());
      localStorage.setItem('mybot_token', res.access_token);
      localStorage.setItem('mybot_secret_path', res.admin_secret_path);
      setLoading(false);
      onLoginSuccess(res);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Invalid username or password');
    }
  };

  return (
    <div className="w-screen h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-surface/80 border border-border rounded-3xl shadow-2xl p-8 backdrop-blur-xl space-y-6 relative z-10 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto shadow-inner">
            <Bot size={28} />
          </div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">
            {t('login.title')}
          </h1>
          <p className="text-xs text-muted">
            {t('login.subtitle')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User size={13} className="text-muted" />
              <span>{t('login.username_label')}</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-field-placeholder outline-none focus:border-accent"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Lock size={13} className="text-muted" />
              <span>{t('login.password_label')}</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-field-placeholder outline-none focus:border-accent font-mono"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs text-center font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-accent-foreground text-xs font-bold shadow-lg hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>{t('login.logging_in')}</span>
              </>
            ) : (
              <>
                <span>{t('login.login_btn')}</span>
                <ArrowRight size={14} className={dir === 'rtl' ? 'rotate-180' : ''} />
              </>
            )}
          </button>
        </form>

        {/* Hint banner */}
        <div className="p-3 rounded-xl bg-surface-secondary border border-border/80 text-[11px] text-muted text-center flex items-center justify-center gap-1.5">
          <KeyRound size={13} className="text-accent" />
          <span>{t('login.default_hint')}</span>
        </div>
      </div>
    </div>
  );
}
