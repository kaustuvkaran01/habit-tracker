const assert = require('node:assert/strict');
const { load } = require('./check-actions.cjs');
const { createTranslator } = load('src/i18n/locale.ts');
const { habitFromDraft, emptyDraft } = load('src/data/habit-draft.ts');
const { FREE_ACCESS } = load('src/data/pro-access.ts');
const { control } = load('src/components/design-tokens.ts');
function all(node, test) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => all(child, test));
  return [...(test(node) ? [node] : []), ...all(node.props?.children, test)];
}
const t = createTranslator('en'), choices = [], restores = [], moves = [];
const modulePages = load('src/screens/settings-page-content.tsx', {
  'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: value => value, hairlineWidth: 1 } },
  '../components/theme': { useTheme: () => ({ choice: 'Dark', setChoice: choice => choices.push(choice) }), createThemedStyles: create => () => create({}) },
  '../i18n/context': { useTranslation: () => ({ t }) }, '../components/haptic-pressable': 'Pressable', '../components/habit-ui': { HabitIcon: 'HabitIcon' }, '../components/app-icon': 'AppIcon',
  '../components/preference-ui': { PreferenceIcon: 'PreferenceIcon', usePreferenceStyles: () => ({}) },
  './backup-screen': 'Backup', './settings-guide-screen': 'Guide', './settings-preferences-screen': 'Preferences', './privacy-support-screen': 'PrivacySupport',
});
const Pages = modulePages.default, today = new Date(2026, 10, 8);
const make = id => habitFromDraft({ ...emptyDraft(), name: id }, today, id);
const archive = { ...make('archived'), archived: true, archivedOn: '2026-11-01' };
const props = { habits: [make('first'), archive, make('middle'), make('last')], today, access: FREE_ACCESS,
  backupTools: { snapshot: null, canExport: false, onRestore() {}, onErase() {} }, onBackupBusyChange() {}, onRestore: id => restores.push(id), onMove: (...args) => moves.push(args) };
function route(page, extra = {}) { return Pages({ ...props, page, ...extra }); }
function content(page, extra) { const node = route(page, extra); return typeof node.type === 'function' ? node.type(node.props) : node; }
for (const page of Object.keys(modulePages.SETTINGS_PAGE_TITLES)) assert.ok(route(page), `Every Settings page has an explicit route: ${page}`);
for (const page of ['general', 'overview', 'language']) { assert.equal(route(page).type, 'Preferences'); assert.equal(route(page).props.page, page); }
for (const page of ['privacy', 'support']) { assert.equal(route(page).type, 'PrivacySupport'); assert.equal(route(page).props.page, page); }
assert.equal(route('guide').type, 'Guide'); assert.equal(route('backup').type, 'Backup');
assert.equal(route('backup').props.onBusyChange, props.onBackupBusyChange);
assert.equal(route('backup', { backupTools: undefined }), null, 'Absent backup tools cannot fall through to reorder actions');
let tree = content('theme'); const radios = all(tree, n => n.props?.accessibilityRole === 'radio');
assert.equal(radios.length, 3); assert.deepEqual(radios.map(n => n.props.accessibilityState.checked), [false, true, false]);
radios[0].props.onPress(); radios[2].props.onPress(); assert.deepEqual(choices, ['Light', 'System']);
assert.equal(radios[0].props.style({ pressed: false })[0].minHeight, control.row, 'Theme row keeps the existing design-system target');
for (const [access, label] of [[FREE_ACCESS, '23 days left'], [{ status: 'verified', tier: 'pro' }, 'No expiry'], [{ status: 'unavailable' }, 'Archive cleanup paused']]) {
  tree = content('archived', { access }); assert.ok(all(tree, n => n.type === 'Text' && n.props.children === label).length);
  const restore = all(tree, n => n.props?.accessibilityLabel === 'Restore archived')[0]; restore.props.onPress(); assert.equal(restores.at(-1), 'archived');
}
assert.ok(all(content('archived', { habits: [] }), n => n.type === 'Text' && n.props.children === 'No archived habits').length);
tree = content('reorder'); const arrows = all(tree, n => n.type === 'Pressable');
assert.equal(arrows.length, 6, 'Archived habits have no reorder controls');
assert.deepEqual(arrows.map(n => n.props.disabled), [true, false, false, false, false, true]);
arrows[1].props.onPress(); arrows[2].props.onPress(); assert.deepEqual(moves, [['first', 1], ['middle', -1]]);
assert.ok(all(content('reorder', { habits: [archive] }), n => n.type === 'Text' && n.props.children === 'No active habits').length);
console.log('Settings page checks passed: all ten routes, missing-tool safety, theme selection/targets, Free/Pro/unknown archive copy, restore identity, reorder bounds and empty states. Navigation/dismissal is also checked by first-use regression.');
