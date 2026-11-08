const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(file, mocks = {}) {
  file = path.resolve(root, file);
  if (!Object.keys(mocks).length && cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'module', 'exports', code)(id => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    return id.startsWith('.') ? load(path.resolve(path.dirname(file), id) + '.ts') : require(id);
  }, module, module.exports);
  if (!Object.keys(mocks).length) cache.set(file, module.exports);
  return module.exports;
}
function harness() {
  let cursor = 0, slots = [], effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  return {
    react: {
      createContext: value => ({ Provider: 'Context', value }), useContext: context => context.value,
      useState(initial) { const i = cursor++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
      useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
      useEffect(effect, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i]?.cleanup?.(); slots[i] = { deps }; effects.push(() => { slots[i].cleanup = effect(); }); } },
    },
    render(Component, props = {}) { cursor = 0; effects = []; const tree = Component(props); effects.forEach(effect => effect()); return tree; },
  };
}
function all(node, test) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => all(child, test));
  return [...(test(node) ? [node] : []), ...all(node.props?.children, test)];
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const { dictionaries, translatedLanguages, messageKey } = load('src/i18n/translations.ts');
const { createTranslator, resolveLocale, weekdayNames, formatRepeat } = load('src/i18n/locale.ts');
const { LANGUAGES, DEFAULT_PREFERENCES, decodePreferences } = load('src/data/app-preferences.ts');
const placeholders = value => [...new Set(value.match(/\{\w+\}/g))].sort();
const covered = source => !/[a-z]/i.test(source) || translatedLanguages.forEach(locale => assert.ok(dictionaries[locale][messageKey(source)], `${locale}: missing ${source}`));

async function check() {
  assert.deepEqual(LANGUAGES.map(item => item.id).filter(id => id !== 'system').sort(), ['en', ...translatedLanguages].sort());
  for (const [locale, dict] of Object.entries(dictionaries)) {
    for (const [key, value] of Object.entries(dict)) assert.deepEqual(placeholders(value), placeholders(key), `${locale}: placeholders for ${key}`);
  }
  const sources = ['catalog', 'messages', 'details', 'icons', 'analytics', 'achievements', 'access', 'first-use', 'reminders', 'backups', 'privacy'].flatMap(name => Object.values(load(`src/i18n/${name}.ts`))[0].trim().split('\n'));
  const keys = sources.map(line => messageKey(line.split('|')[0].replace(';', '|')));
  assert.equal(new Set(keys).size, keys.length, 'Duplicate message keys hide translations');
  for (const locale of translatedLanguages) {
    assert.notEqual(createTranslator(locale)('Settings'), 'Settings');
    assert.equal(createTranslator(locale)('Open {value0}', { value0: 'Workout 🧘 {count}' }).includes('Workout 🧘 {count}'), true, 'User text is interpolated once');
    assert.ok(!createTranslator(locale)('{count} days', { count: 12 }).includes('{count}'));
  }
  const en = createTranslator('en'), be = createTranslator('be');
  assert.equal(en('{count} days', { count: 1 }), '1 day');
  assert.equal(en('{count} days', { count: 2 }), '2 days');
  assert.equal(be('{count} days', { count: 1 }), '1 дзень');
  assert.equal(be('{count} days', { count: 2 }), '2 дні');
  assert.equal(be('{count} days', { count: 5 }), '5 дзён');
  assert.equal(createTranslator('fr')('Future untranslated key'), 'Future untranslated key');
  assert.equal(resolveLocale('system', 'de-DE'), 'de');
  assert.equal(resolveLocale('system', 'pt_BR'), 'pt-BR');
  assert.equal(resolveLocale('system', 'pt-PT'), 'pt-PT');
  assert.equal(resolveLocale('system', 'ja-JP'), 'en');
  assert.equal(resolveLocale('es', 'fr-FR'), 'es');
  assert.equal(weekdayNames('fr', 'long')[0], 'lundi');
  assert.equal(formatRepeat([0, 2], 'fr'), [weekdayNames('fr')[0], weekdayNames('fr')[2]].join(', '));
  assert.equal(formatRepeat(undefined, 'de'), createTranslator('de')('Every day'));

  // Expo Go can expose DateTimeFormat without exposing PluralRules. Reload the
  // translator so its formatter cache cannot hide the missing constructor.
  const NativePluralRules = Intl.PluralRules, NativeNumberFormat = Intl.NumberFormat;
  const translationModule = load('src/i18n/translations.ts');
  const freshLocale = () => load('src/i18n/locale.ts', { './translations': translationModule });
  const counts = [...Array.from({ length: 202 }, (_, i) => i), -1, -2, 0.5, 1.5, 2.5, 1000, 1000000];
  const expected = new Map(['en', ...translatedLanguages].map(locale => [locale,
    counts.map(count => createTranslator(locale)('{count} days', { count })),
  ]));
  try {
    Intl.PluralRules = undefined;
    const withoutPlurals = freshLocale();
    for (const [locale, messages] of expected) {
      const t = withoutPlurals.createTranslator(locale);
      counts.forEach((count, index) => assert.equal(t('{count} days', { count }), messages[index], `${locale}: missing PluralRules at ${count}`));
    }
    Intl.NumberFormat = undefined;
    const withoutFormatters = freshLocale();
    assert.equal(withoutFormatters.createTranslator('en')('{count} days', { count: 1 }), '1 day');
    assert.equal(withoutFormatters.createTranslator('be')('{count} days', { count: 2 }), '2 дні');
    assert.equal(withoutFormatters.createTranslator('fr')('Open {value0}', { value0: 'My habit 🌿' }), 'Ouvrir My habit 🌿');

    // Also tolerate a present constructor rejecting a locale at initialization.
    const Unsupported = class { constructor() { throw new RangeError('Locale unavailable'); } };
    Intl.PluralRules = Unsupported;
    Intl.NumberFormat = Unsupported;
    assert.equal(freshLocale().createTranslator('en')('{count} days', { count: 2 }), '2 days');
  } finally {
    Intl.PluralRules = NativePluralRules;
    Intl.NumberFormat = NativeNumberFormat;
  }

  // Check literal calls, data-driven choices, validation and search keywords.
  for (const dir of ['screens', 'components', 'hooks']) {
    for (const name of fs.readdirSync(path.join(root, 'src', dir)).filter(name => /\.tsx?$/.test(name))) {
      const file = path.join(root, 'src', dir, name), source = fs.readFileSync(file, 'utf8');
      const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      function visit(node) {
        if (ts.isCallExpression(node) && node.expression.getText(ast) === 't') {
          const value = node.arguments[0];
          if (value && ts.isStringLiteral(value) && value.text !== 'Pro') covered(value.text);
          assert.ok(!/^(habit|draft|card)\.(name|description|title|unit)$/.test(value?.getText(ast) ?? ''), 'Do not translate user-entered content');
          assert.ok(!(ts.isBinaryExpression(node.parent) && ['===', '!=='].includes(node.parent.operatorToken.getText(ast))), 'Translate labels, never stored comparisons');
        }
        if (ts.isPropertyAssignment(node) && ['title', 'label', 'description'].includes(node.name.getText(ast)) && ts.isStringLiteral(node.initializer) && node.initializer.text !== 'Pro') covered(node.initializer.text);
        ts.forEachChild(node, visit);
      }
      visit(ast);
    }
  }
  for (const file of ['habit-icons', 'habit-emoji']) for (const item of Object.values(load(`src/data/${file}.ts`)).find(Array.isArray)) covered(item.label);
  for (const { footer } of Object.values(load('src/data/collection-design.ts').WALLPAPER_SCENES)) covered(footer);
  for (const item of Object.values(load('src/components/achievement-reveals.ts').ACHIEVEMENT_REVEALS)) { covered(item.title); covered(item.action); }
  for (const item of load('src/data/privacy-info.ts').PRIVACY_SECTIONS) { covered(item.title); covered(item.description); }
  const iconSource = fs.readFileSync(path.join(root, 'src/screens/habit-icon-screen.tsx'), 'utf8');
  for (const match of iconSource.matchAll(/\['[^']+','([^']+)'\]/g)) covered(match[1]);
  for (const text of ['Lifetime', 'Annual', 'Monthly', 'Light', 'Dark', 'System', ...load('src/data/habit-draft.ts').CATEGORIES]) covered(text);
  for (const text of fs.readFileSync(path.join(root, 'src/data/habit-draft.ts'), 'utf8').matchAll(/return '([^']+)'/g)) covered(text[1]);

  const iconHarness = harness(), picks = [];
  const IconPicker = load('src/screens/habit-icon-screen.tsx', {
    react: iconHarness.react,
    'react-native': { ScrollView: 'ScrollView', TextInput: 'TextInput', View: 'View', Text: 'Text', StyleSheet: { create: value => value } },
    '../components/haptic-pressable': 'Pressable', '../components/app-icon': 'AppIcon',
    '../components/habit-ui': { RoundButton: 'RoundButton', Chevron: 'Chevron' },
    '../components/theme': { createThemedStyles: create => () => create({}), useTheme: () => ({ colors: {}, mode: 'dark' }) },
    '../i18n/context': { useTranslation: () => ({ locale: 'de', t: createTranslator('de') }) },
  }).default;
  const iconProps = { icon: 'pulse', emoji: '', onChange: (...args) => picks.push(args), onBack() {} };
  let iconTree = iconHarness.render(IconPicker, iconProps);
  all(iconTree, node => node.type === 'RoundButton').at(-1).props.onPress();
  iconTree = iconHarness.render(IconPicker, iconProps);
  all(iconTree, node => node.type === 'TextInput')[0].props.onChangeText('Laufen');
  iconTree = iconHarness.render(IconPicker, iconProps);
  const running = all(iconTree, node => node.props?.accessibilityRole === 'radio' && node.props.accessibilityLabel === 'Laufen');
  assert.equal(running.length, 1, 'Icons can be found using translated names');
  running[0].props.onPress();
  assert.equal(picks[0][0], 'habit-run', 'Selecting a translated icon keeps its canonical ID');
  all(iconTree, node => node.props?.accessibilityRole === 'tab')[1].props.onPress();
  iconTree = iconHarness.render(IconPicker, iconProps);
  assert.ok(all(iconTree, node => node.props?.accessibilityRole === 'radio' && node.props.accessibilityLabel === 'Laufen').length > 0, 'Emoji search also uses translated names');

  let stored = JSON.stringify({ ...DEFAULT_PREFERENCES, language: 'fr' });
  const driver = { getItem: async () => stored, setItem: async (_key, value) => { stored = value; } };
  const preferencesHarness = harness();
  const { AppPreferencesProvider } = load('src/components/app-preferences.tsx', { './pro-access': { useProAccess: () => ({ status: 'verified', tier: 'free' }) }, react: preferencesHarness.react, 'react-native': { Alert: { alert() {} } }, '@react-native-async-storage/async-storage': driver });
  preferencesHarness.render(AppPreferencesProvider);
  await tick();
  let preferences = preferencesHarness.render(AppPreferencesProvider).props.value;
  assert.equal(preferences.preferences.language, 'fr', 'Saved language loads on restart');
  const update = preferences.update;
  const native = { Alert: { alert() {} }, StyleSheet: { create: value => value }, View: 'View', Text: 'Text' };
  const pickerHarness = harness();
  const Picker = load('src/screens/settings-preferences-screen.tsx', {
    react: pickerHarness.react, 'react-native': native, '../components/pro-upgrade': { useProUpgrade: () => ({ request: () => false, sheet: null }) },
    '../components/haptic-pressable': 'Pressable', '../components/habit-ui': { Chevron: 'Chevron', Checkmark: 'Checkmark' },
    '../components/app-preferences': { useAppPreferences: () => ({ preferences: preferences.preferences, update }) },
    '../hooks/use-haptics-preference': () => ({ enabled: true }), '../utils/feedback': { feedback() {} },
    '../components/theme': { createThemedStyles: create => () => create({}), useTheme: () => ({ colors: {} }) },
    '../components/preference-ui': { usePreferenceStyles: () => ({}) },
    '../i18n/context': { useTranslation: () => ({ locale: resolveLocale(preferences.preferences.language), t: createTranslator(resolveLocale(preferences.preferences.language)) }) },
  }).default;
  let picker = pickerHarness.render(Picker, { page: 'language' });
  all(picker, node => node.props?.accessibilityLabel === 'Deutsch')[0].props.onPress();
  preferences = preferencesHarness.render(AppPreferencesProvider).props.value;
  assert.equal(preferences.preferences.language, 'de');
  picker = pickerHarness.render(Picker, { page: 'language' });
  assert.ok(all(picker, node => node.type === 'Text').some(node => node.props.children === 'Systemstandard'), 'Picker updates in place');
  await tick();
  assert.equal(decodePreferences(stored).language, 'de', 'Picker selection persists');

  let onActive;
  const localeHarness = harness();
  const { LocaleProvider } = load('src/i18n/context.tsx', {
    react: localeHarness.react, 'react-native': { AppState: { addEventListener: (_name, listener) => { onActive = listener; return { remove() {} }; } } },
    '../components/app-preferences': { useAppPreferences: () => preferences },
  });
  assert.equal(localeHarness.render(LocaleProvider).props.value, 'de');
  preferences = { ...preferences, preferences: { ...preferences.preferences, language: 'es' } };
  assert.equal(localeHarness.render(LocaleProvider).props.value, 'es', 'Provider responds immediately to preference changes');
  const DateTimeFormat = Intl.DateTimeFormat;
  try {
    Intl.DateTimeFormat = () => ({ resolvedOptions: () => ({ locale: 'tr-TR' }) });
    preferences.preferences.language = 'system';
    onActive('active');
    assert.equal(localeHarness.render(LocaleProvider).props.value, 'tr', 'System choice refreshes after returning to the app');
  } finally { Intl.DateTimeFormat = DateTimeFormat; }
  const { emptyDraft, habitFromDraft, draftFromHabit, updateHabitFromDraft } = load('src/data/habit-draft.ts');
  const custom = { ...emptyDraft(), name: 'Save', description: 'Mes propres mots 🧘', icon: 'emoji', emoji: '🌿', categories: ['Health'], unit: 'mes unités' };
  const habit = habitFromDraft(custom, new Date(2026, 10, 7, 12), 'language-test');
  habit.notes['2026-11-07'] = '私のメモ';
  const initialized = load('src/data/habit-entries.ts').initializeEntries(habit);
  assert.deepEqual(updateHabitFromDraft(initialized, draftFromHabit(initialized), new Date(2026, 10, 7, 12)), initialized, 'Language changes do not rewrite custom content or canonical IDs');
  console.log(`Localization checks passed: ${translatedLanguages.length + 1} languages, ${keys.length} messages, placeholder and UI coverage, missing/rejected Intl constructor fallbacks, plurals, dates, live picker, localized icon/emoji search, saved preference, system locale and user-data preservation.`);
}
check().catch(error => { console.error(error); process.exitCode = 1; });
