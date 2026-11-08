import { achievements } from './achievements';
import { access } from './access';
import { firstUse } from './first-use';
import { reminders } from './reminders';
import { backups } from './backups';
import { privacy } from './privacy';
import { catalog } from './catalog';
import { messages } from './messages';
import { details } from './details';
import { analytics } from './analytics';
import { icons } from './icons';
import { aliases } from './aliases';

export const translatedLanguages = ['ca', 'de', 'es', 'fr', 'it', 'hu', 'nl', 'pt-BR', 'pt-PT', 'tr', 'be'] as const;
export type Language = 'en' | (typeof translatedLanguages)[number];
export function messageKey(source: string) {
  return source.trim().replace(/\s+/g, ' ').toLowerCase();
}
export const dictionaries = Object.fromEntries(['en', ...translatedLanguages].map(locale => [locale, {}])) as Record<Language, Record<string, string>>;
for (const row of (catalog + messages + details + icons + analytics + achievements + access + firstUse + reminders + backups + privacy).trim().split('\n').filter(Boolean)) {
  const [source, ...translations] = row.split('|');
  if (translations.length !== translatedLanguages.length || translations.some(value => !value)) {
    throw Error('Invalid translation row: ' + source);
  }
  const key = messageKey(source.replace(';', '|'));
  translatedLanguages.forEach((locale, index) => { dictionaries[locale][key] = translations[index]; });
}
for (const [alias, source] of Object.entries(aliases)) {
  for (const locale of translatedLanguages) {
    const translation = dictionaries[locale][messageKey(source)];
    if (!translation) throw Error('Missing shared translation: ' + source);
    dictionaries[locale][messageKey(alias)] = translation;
  }
}
Object.assign(dictionaries.en, {
  '{count} days|one': '{count} day',
  '{count} days left|one': '{count} day left',
  '{count} days to go|one': '{count} day to go',
  '{count} habits|one': '{count} habit',
  '{count} habits archived|one': '{count} habit archived',
});
