import { useState, useEffect, createContext, useContext } from 'react';
import fa from './fa.json';
import en from './en.json';
import ru from './ru.json';
import ar from './ar.json';

const BUNDLED_LOCALES = { en, fa, ru, ar };

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('mybot_lang') || 'en');
  const [translations, setTranslations] = useState(BUNDLED_LOCALES[lang] || en);

  useEffect(() => {
    localStorage.setItem('mybot_lang', lang);
    const selected = BUNDLED_LOCALES[lang] || en;
    setTranslations(selected);
    const dir = selected._meta?.dir || 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const t = (path, fallback = '') => {
    const parts = path.split('.');
    let cur = translations;
    for (const p of parts) {
      if (!cur || typeof cur !== 'object') return fallback || path;
      cur = cur[p];
    }
    return cur !== undefined ? cur : (fallback || path);
  };

  const changeLanguage = (newLang) => {
    if (BUNDLED_LOCALES[newLang]) {
      setLang(newLang);
    }
  };

  return (
    <I18nContext.Provider value={{ lang, setLang: changeLanguage, t, dir: translations._meta?.dir || 'ltr' }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
