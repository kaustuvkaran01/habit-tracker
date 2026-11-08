const assert = require('node:assert/strict');
const { load, harness } = require('./check-actions.cjs');
const { createTranslator } = load('src/i18n/locale.ts');
const { emptyDraft, habitFromDraft } = load('src/data/habit-draft.ts');
const { dateFromKey } = load('src/data/habit-calendar.ts');
const today = dateFromKey('2026-11-07');
function all(node, test) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => all(child, test));
  return [...(test(node) ? [node] : []), ...all(node.props?.children, test)];
}
const native = { StyleSheet: { create: value => value }, View: 'View', Text: 'Text', TextInput: 'TextInput', ScrollView: 'ScrollView', Modal: 'Modal', KeyboardAvoidingView: 'KeyboardAvoidingView', Switch: 'Switch', ActivityIndicator: 'ActivityIndicator', Platform: { OS: 'ios' }, Keyboard: { dismiss() {} }, useWindowDimensions: () => ({ fontScale: 1 }) };
const theme = { useTheme: () => ({ colors: {}, mode: 'dark' }), createThemedStyles: create => () => create({}) };
async function check() {
  let calls = 0, retries = 0, closes = 0;
  const h = harness();
  const Drawer = load('src/components/habit-entry-drawer.tsx', {
    react: h.react, 'react-native': native, './bottom-drawer': 'BottomDrawer', './haptic-pressable': 'Pressable', './habit-ui': { HabitIcon: 'HabitIcon' },
    './app-preferences': { useAppPreferences: () => ({ preferences: { notes: true } }) }, './theme': theme,
    '../i18n/context': { useTranslation: () => ({ t: createTranslator('en'), locale: 'en' }) }, '../utils/feedback': { feedback() {} },
  }).default;
  const props = { visible: true, habit: habitFromDraft({ ...emptyDraft(), name: 'Walking', trackingKind: 'measure', target: '3', unit: 'km' }, today, 'walk'), day: '2026-11-07', today,
    onClose: () => closes++, onSave: async (value, note) => { calls++; assert.deepEqual(value, { kind: 'amount', amount: 2.5 }); assert.equal(note, 'My note'); return false; }, onRetry: async () => { retries++; return true; } };
  const render = () => h.render(() => Drawer(props));
  let tree = render();
  all(tree, node => node.props?.accessibilityLabel === 'Enter total')[0].props.onChangeText('2,5');
  all(tree, node => node.props?.accessibilityLabel === 'Notes')[0].props.onChangeText('My note');
  tree = render();
  const save = all(tree, node => node.type === 'Pressable').at(-1).props.onPress;
  await Promise.all([save(), save()]); tree = render();
  assert.equal(calls, 1, 'A rapid double save records once'); assert.equal(closes, 0, 'A failed write keeps the drawer open');
  assert.ok(all(tree, node => node.type === 'Text').some(node => node.props.children === 'Changes haven’t saved yet.'));
  assert.equal(all(tree, node => node.type === 'TextInput')[0].props.value, '2,5', 'Failed save preserves the amount draft');
  await all(tree, node => node.type === 'Pressable').at(-1).props.onPress();
  assert.equal(calls, 1); assert.equal(retries, 1); assert.equal(closes, 1, 'Retry saves the existing result without replaying the entry');

  const formHarness = harness(); calls = 0; retries = 0; closes = 0;
  const Form = load('src/screens/habit-form-screen.tsx', {
    '../components/private-modal': 'Modal',
    '../components/reminders': { useReminders: () => ({ requestPermission: async () => true }) }, '../components/reminder-status': 'ReminderStatus', '../components/pro-upgrade': { useProUpgrade: () => ({ request: () => false, sheet: null }) },
    react: formHarness.react, 'react-native': native, '../components/haptic-pressable': 'Pressable', '../components/habit-color-palette': 'HabitColorPalette', '../components/app-icon': 'AppIcon', '../components/right-drawer': 'RightDrawer', './habit-icon-screen': 'HabitIconScreen',
    '../components/habit-ui': { HabitIcon: 'HabitIcon', Checkmark: 'Checkmark', Chevron: 'Chevron', RoundButton: 'RoundButton' }, '../components/theme': { ...theme, accentForeground: c => c },
    '../i18n/context': { useTranslation: () => ({ t: createTranslator('en'), locale: 'en' }) }, '../utils/feedback': { feedback() {} },
  }).default;
  const formProps = { onClose: () => closes++, onSave: async draft => { calls++; assert.equal(draft.name, 'My habit'); return false; }, onRetrySave: async () => { retries++; return true; } };
  const renderForm = () => formHarness.render(() => Form(formProps));
  tree = renderForm();
  all(tree, node => node.props?.accessibilityLabel === 'Habit name')[0].props.onChangeText('My habit');
  tree = renderForm();
  await all(tree, node => node.props?.accessibilityLabel === 'Save new habit')[0].props.onPress();
  tree = renderForm(); assert.equal(closes, 0);
  await all(tree, node => node.props?.accessibilityLabel === 'Save new habit')[0].props.onPress();
  assert.equal(calls, 1, 'Retry after creation failure does not create a duplicate habit');
  assert.equal(retries, 1); assert.equal(closes, 1);
  const { choiceGrid, control, space } = load('src/components/design-tokens.ts');
  const { HABIT_COLORS } = load('src/data/habit-draft.ts');
  const paletteHarness = harness(); let selectedColor;
  const Palette = load('src/components/habit-color-palette.tsx', {
    react: paletteHarness.react, 'react-native': native, './haptic-pressable': 'Pressable', './theme': theme,
    '../i18n/context': { useTranslation: () => ({ t: createTranslator('en'), locale: 'en' }) },
  }).default;
  const paletteProps = { value: HABIT_COLORS[0], onChange: color => { selectedColor = color; }, label: 'Habit color' };
  const renderPalette = () => paletteHarness.render(() => Palette(paletteProps));
  for (const width of [180, 248, 288, 320, 361, 416, 600]) {
    tree = renderPalette(); tree.props.onLayout({ nativeEvent: { layout: { width } } }); tree = renderPalette();
    const radios = all(tree, n => n.props?.accessibilityRole === 'radio'), geometry = choiceGrid(width);
    assert.equal(radios.length, 21);
    assert.ok(geometry.columns * geometry.size + (geometry.columns - 1) * space.xxs <= width + 0.001, 'Colour choices fit their available width');
    assert.ok(radios.every(n => n.props.style[1].width >= control.touch && n.props.style[1].height >= control.touch), 'Dense palette never shrinks its touch targets');
    assert.ok(radios.every(n => n.props.style[1].width <= control.primary), 'Tablet swatches stop growing');
  }
  all(tree, n => n.props?.accessibilityRole === 'radio')[3].props.onPress(); assert.equal(selectedColor, HABIT_COLORS[3]);
  paletteProps.value = selectedColor; tree = renderPalette();
  assert.equal(all(tree, n => n.props?.accessibilityState?.checked).length, 1, 'Selection still identifies exactly one colour');
  paletteProps.disabled = true; tree = renderPalette();
  assert.ok(all(tree, n => n.props?.accessibilityRole === 'radio').every(n => n.props.disabled && n.props.accessibilityState.disabled), 'Save/export busy states disable the shared palette');

  console.log('Entry/form UI checks passed: decimal drafts, atomic value/note submission, duplicate-save protection, failed saves remain open, retained drafts and retry without duplicate entries/habits, responsive colour choice geometry, selection and disabled targets.');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
