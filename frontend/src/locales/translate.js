import en from './en.json' with { type: 'json' };
import fa from './fa.json' with { type: 'json' };
import ar from './ar.json' with { type: 'json' };
import ru from './ru.json' with { type: 'json' };

export const bundledLocales = { en, fa, ar, ru };
export function currentLanguage() {
  try { return globalThis.localStorage?.getItem('mybot_lang') || 'en'; }
  catch { return 'en'; }
}

/** Also usable by services and the outer error boundary, without a React hook. */
export function translate(path, vars = null, lang = currentLanguage()) {
  const lookup = locale => path.split('.').reduce((value, part) => value?.[part], locale);
  const value = lookup(bundledLocales[lang] || en) ?? lookup(en) ?? path;
  return typeof value === 'string' && vars
    ? value.replace(/\{(\w+)\}/g, (match, key) => key in vars ? String(vars[key]) : match)
    : value;
}
