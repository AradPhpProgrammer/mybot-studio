import React, { useState, useEffect } from 'react';
import { 
  Puzzle, 
  X, 
  Check, 
  Send, 
  CreditCard, 
  Radio, 
  Loader2, 
  Layers,
  Sparkles
} from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import { api } from '../../services/api';

const ICON_MAP = {
  Radio: Radio,
  CreditCard: CreditCard,
  Puzzle: Puzzle
};

export default function PluginsModal({ isOpen, onClose, currentBot }) {
  const { t, lang } = useI18n();
  const pluginText = (plugin, field) => plugin[`${field}_${lang}`] || plugin[field] || '';
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Broadcast Tool state
  const [broadcastText, setBroadcastText] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadPlugins();
    }
  }, [isOpen]);

  const loadPlugins = async () => {
    setLoading(true);
    try {
      const data = await api.getPlugins();
      setPlugins(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (pluginKey, currentStatus) => {
    try {
      await api.togglePlugin(pluginKey, !currentStatus);
      setPlugins(prev => prev.map(p => p.key === pluginKey ? { ...p, is_active: !currentStatus } : p));
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-3xl shadow-2xl p-6 space-y-6 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <Puzzle size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">{t('plugins.modal_title')}</h2>
              <p className="text-[11px] text-muted">{t('plugins.modal_subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Plugins List */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-xs text-muted gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span>{t('plugins.loading')}</span>
            </div>
          ) : (
            plugins.map(plugin => {
              const Icon = ICON_MAP[plugin.icon] || Puzzle;
              return (
                <div
                  key={plugin.key}
                  className="p-4 rounded-2xl bg-surface-secondary border border-border/80 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-accent shrink-0">
                      <Icon size={20} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {pluginText(plugin, 'name')}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface text-muted border border-border">
                          v{plugin.version}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                          {plugin.plugin_type === 'admin' ? t('plugins.admin_type') : t('plugins.canvas_type')}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted leading-relaxed">
                        {pluginText(plugin, 'description')}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggle(plugin.key, plugin.is_active)}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                      plugin.is_active ? 'bg-accent' : 'bg-surface-tertiary border border-border'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-1 ${
                        plugin.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface-secondary hover:bg-surface-tertiary text-xs font-semibold text-foreground"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
