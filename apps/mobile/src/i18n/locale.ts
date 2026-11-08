import { dictionaries, messageKey, translatedLanguages, type Language } from './translations';

export function resolveLocale(choice: string, system = Intl.DateTimeFormat().resolvedOptions().locale): Language {
  const value = (choice === 'system' ? system : choice).replace(/_/g, '-').toLowerCase();
  if (value.split('-')[0] === 'pt') return value.split('-').includes('br') ? 'pt-BR' : 'pt-PT';
  return translatedLanguages.find(locale => locale === value.split('-')[0]) ?? 'en';
}

type Values = Record<string, string | number>;

// Cardinal rules for our bundled languages when the runtime has no PluralRules.
// The app uses these categories for day and habit counts (not ordinals).
// https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
function counterPlural(locale: Language, value: number): 'one' | 'few' | 'many' | 'other' {
  const n = Math.abs(value);
  if (!Number.isFinite(n)) return 'other';
  if (locale === 'be') {
    if (!Number.isInteger(n)) return 'other';
    if (n % 10 === 1 && n % 100 !== 11) return 'one';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return 'few';
    return 'many';
  }
  if ((locale === 'fr' || locale === 'pt-BR') && n < 2) return 'one';
  if (n === 1) return 'one';
  if (['ca', 'es', 'fr', 'it', 'pt-BR', 'pt-PT'].includes(locale) && n > 0 && Number.isInteger(n) && n % 1000000 === 0) return 'many';
  return 'other';
}

const translators = new Map<Language, (source: string, values?: Values) => string>();
export function createTranslator(locale: Language) {
  const cached = translators.get(locale);
  if (cached) return cached;
  let plurals: Intl.PluralRules | undefined;
  let numbers: Intl.NumberFormat | undefined;
  try {
    if (typeof Intl.PluralRules === 'function') plurals = new Intl.PluralRules(locale);
  } catch { /* A runtime may expose the API without supporting this locale. */ }
  try {
    if (typeof Intl.NumberFormat === 'function') numbers = new Intl.NumberFormat(locale);
  } catch { /* Preserve readable counts when a formatter is unavailable. */ }
  const dictionary = dictionaries[locale];
  const t = (source: string, values: Values = {}): string => {
    const key = messageKey(source);
    const plural = typeof values.count === 'number' ? (plurals?.select(values.count) ?? counterPlural(locale, values.count)) : '';
    const message = (plural && dictionary[key + '|' + plural]) || dictionary[key] || source;
    return message.replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = values[name];
      return typeof value === 'number' ? (numbers?.format(value) ?? String(value)) : value ?? match;
    });
  };
  translators.set(locale, t);
  return t;
}

const weekdays = new Map<string, string[]>();
export function weekdayNames(locale: string, width: 'short' | 'long' = 'short') {
  const key = `${locale}:${width}`;
  let names = weekdays.get(key);
  if (!names) {
    names = Array.from({ length: 7 }, (_, index) => new Date(2026, 0, 5 + index, 12).toLocaleDateString(locale, { weekday: width }));
    weekdays.set(key, names);
  }
  return names;
}
export function formatRepeat(days: number[] | undefined, locale: Language) {
  const values = days ?? [0, 1, 2, 3, 4, 5, 6];
  return values.length === 7 ? createTranslator(locale)('Every day') : values.map(day => weekdayNames(locale)[day]).join(', ');
}
