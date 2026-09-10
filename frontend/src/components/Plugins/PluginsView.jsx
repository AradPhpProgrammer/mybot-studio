import React, { useState, useEffect } from 'react';
import { 
  Puzzle, 
  Check, 
  Send, 
  CreditCard, 
  Radio, 
  Loader2, 
  Sparkles,
  Search
} from 'lucide-react';
import { useI18n } from '../../locales/i18n';
import { api } from '../../services/api';

const ICON_MAP = {
  Radio: Radio,
  CreditCard: CreditCard,
  Puzzle: Puzzle
};

export default function PluginsView() {
  const { t, lang } = useI18n();
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPlugins();
  }, []);

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

  const filtered = plugins.filter(p => {
    const name = lang === 'fa' ? p.name_fa : p.name;
    const desc = lang === 'fa' ? p.description_fa : p.description;
    return name.toLowerCase().includes(search.toLowerCase()) || desc.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex-1 h-screen overflow-y-auto p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-foreground">{t('sidebar.plugins')}</h1>
            <p className="text-xs text-muted">
              مدیریت و فعال‌سازی پلاگین‌های جعبه‌ابزار و ابزارهای پنل مدیریت
            </p>
          </div>

          <div className="relative w-full md:w-64">
            <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl ps-9 pe-3 py-2 text-xs text-foreground placeholder:text-field-placeholder outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Plugins Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-xs text-muted gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span>در حال بارگذاری پلاگین‌ها...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted bg-surface rounded-2xl border border-border">
            پلاگینی یافت نشد.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(plugin => {
              const Icon = ICON_MAP[plugin.icon] || Puzzle;
              return (
                <div
                  key={plugin.key}
                  className="p-5 rounded-2xl bg-surface border border-border hover:border-accent/40 shadow-sm transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-surface-secondary border border-border flex items-center justify-center text-accent shrink-0 shadow-inner">
                        <Icon size={22} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">
                            {lang === 'fa' ? plugin.name_fa : plugin.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-secondary text-muted border border-border">
                            v{plugin.version}
                          </span>
                        </div>
                        <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                          {plugin.plugin_type === 'admin' ? 'پنل ادمین' : 'جعبه‌ابزار بوم'}
                        </span>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggle(plugin.key, plugin.is_active)}
                      className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                        plugin.is_active ? 'bg-accent' : 'bg-surface-secondary border border-border'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-1 ${
                          plugin.is_active ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-xs text-muted leading-relaxed line-clamp-2">
                    {lang === 'fa' ? plugin.description_fa : plugin.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
