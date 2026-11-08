const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const { load, harness, tick } = require('./check-actions.cjs');
const { createTranslator } = load('src/i18n/locale.ts');
const { SUPPORT_EMAIL, PRIVACY_SECTIONS, supportMailto } = load('src/data/privacy-info.ts');
const { DEFAULT_PREFERENCES } = load('src/data/app-preferences.ts');
const { habitFromDraft, emptyDraft } = load('src/data/habit-draft.ts');
const { control } = load('src/components/design-tokens.ts');
const t = createTranslator('en');
function all(node, test) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => all(child, test));
  return [...(test(node) ? [node] : []), ...all(node.props?.children, test)];
}
const native = { View: 'View', Text: 'Text', TextInput: 'TextInput', ScrollView: 'ScrollView', Pressable: 'Pressable',
  StyleSheet: { create: styles => styles, absoluteFill: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 } } };
const theme = { useTheme: () => ({ colors: {}, mode: 'dark' }), createThemedStyles: factory => () => factory({}) };
const locale = { useTranslation: () => ({ t, locale: 'en' }) };
async function check() {
  for (const platform of ['ios', 'android']) {
    const h = harness(), callbacks = new Map(), removed = [], state = { currentState: 'active', addEventListener(event, callback) { callbacks.set(event, callback); return { remove() { removed.push(event); } }; } };
    let covered = false;
    const { AppPrivacyProvider, PrivacySurface } = load('src/components/app-privacy.tsx', {
      react: { ...h.react, createContext: () => ({ Provider: 'Provider' }), useContext: () => covered },
      'react-native': { ...native, AppState: state, Platform: { OS: platform } }, './theme': theme, '../i18n/context': locale, './app-icon': 'AppIcon',
    });
    const render = () => { const node = h.render(() => AppPrivacyProvider({ children: 'app' })); covered = node.props.value; return node; };
    render(); assert.equal(covered, false);
    const emit = value => { state.currentState = value; callbacks.get('change')(value); render(); };
    emit('inactive'); assert.equal(covered, true, 'Cover starts before the background transition, without an animation');
    let surface = PrivacySurface({ children: 'private history' });
    assert.equal(surface.props.children[0].props.pointerEvents, 'none');
    assert.equal(surface.props.children[0].props.accessibilityElementsHidden, true);
    assert.equal(surface.props.children[0].props.importantForAccessibility, 'no-hide-descendants');
    const cover = surface.props.children[1]; assert.equal(cover.props.accessibilityLabel, 'App hidden');
    assert.equal(cover.props.onStartShouldSetResponder(), true);
    assert.ok(!JSON.stringify(cover).includes('private history'), 'Cover never copies habit content');
    emit('background'); assert.equal(covered, true); emit('active'); assert.equal(covered, false);
    surface = PrivacySurface({ children: 'draft remains intact' }); assert.equal(surface.props.children[0].props.children, 'draft remains intact');
    assert.equal(surface.props.children[1], false, 'Returning restores the existing content without remounting or clearing drafts');
    if (platform === 'android') {
      callbacks.get('blur')(); render(); assert.equal(covered, true, 'Android notification shade covers content while state remains active');
      callbacks.get('focus')(); render(); assert.equal(covered, false);
      callbacks.get('blur')(); emit('background'); emit('active'); assert.equal(covered, false, 'A stale Android blur cannot leave the app stuck behind the cover');
    } else assert.deepEqual([...callbacks.keys()], ['change']);
    state.currentState = null;
    const initial = harness();
    const fresh = load('src/components/app-privacy.tsx', { react: { ...initial.react, createContext: () => ({ Provider: 'Provider' }) },
      'react-native': { ...native, AppState: state, Platform: { OS: platform } }, './theme': theme, '../i18n/context': locale, './app-icon': 'AppIcon' }).AppPrivacyProvider;
    assert.equal(initial.render(() => fresh({})).props.value, true, 'Unknown startup state stays covered');
    assert.equal(removed.length, 0);
  }
  const close = () => {}, Modal = load('src/components/private-modal.tsx', { 'react-native': { Modal: 'NativeModal' }, './app-privacy': { PrivacySurface: 'PrivacySurface' } }).default;
  const wrapped = Modal({ children: 'sheet', visible: true, transparent: true, animationType: 'none', onRequestClose: close });
  assert.equal(wrapped.props.onRequestClose, close); assert.equal(wrapped.props.visible, true); assert.equal(wrapped.props.transparent, true);
  assert.equal(wrapped.props.children.type, 'PrivacySurface'); assert.equal(wrapped.props.children.props.children, 'sheet');

  // Enforce cover coverage for future native sheets as well as the current ones.
  const sourceRoot = path.resolve(__dirname, '../src');
  function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? files(path.join(dir, item.name)) : /\.tsx?$/.test(item.name) ? [path.join(dir, item.name)] : []); }
  let modalSurfaces = 0;
  for (const file of files(sourceRoot)) {
    const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function inspect(node) {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier.text === 'react-native') {
        for (const specifier of node.importClause?.namedBindings?.elements ?? []) {
          if ((specifier.propertyName?.text ?? specifier.name.text) === 'Modal') assert.equal(path.basename(file), 'private-modal.tsx', 'Every native Modal must use the shared privacy surface');
        }
      }
      if (ts.isImportDeclaration(node) && node.moduleSpecifier.text.endsWith('/private-modal')) modalSurfaces++;
      if (ts.isCallExpression(node) && /^(console\.(log|info|warn|error|debug)|fetch|XMLHttpRequest)$/.test(node.expression.getText(ast))) assert.fail('Audit unexpected diagnostics/network output before shipping: ' + file);
      ts.forEachChild(node, inspect);
    }
    inspect(ast);
  }
  assert.ok(modalSurfaces >= 11);
  assert.equal(SUPPORT_EMAIL, 'kaustuvkaran@gmail.com');
  const mail = new URL(supportMailto('Help & support? #1'));
  assert.equal(mail.protocol, 'mailto:'); assert.equal(mail.pathname, SUPPORT_EMAIL);
  assert.deepEqual([...mail.searchParams.keys()], ['subject']); assert.equal(mail.searchParams.get('subject'), 'Help & support? #1');

  const h = harness(); let opened = [], fail = true, finish;
  const Screen = load('src/screens/privacy-support-screen.tsx', { react: h.react, 'react-native': { ...native, Linking: { openURL: async uri => { opened.push(uri); if (fail) throw Error('No mail app'); return new Promise(resolve => { finish = resolve; }); } } },
    '../components/preference-ui': { PrimaryButton: 'PrimaryButton', usePreferenceStyles: () => ({}) }, '../components/theme': theme, '../i18n/context': locale,
  }).default;
  const render = page => h.render(() => Screen({ page }));
  let tree = render('privacy'); assert.equal(all(tree, node => node.props?.accessibilityRole === 'header').length, PRIVACY_SECTIONS.length);
  assert.equal(opened.length, 0, 'Opening privacy never transmits content');
  const email = () => all(tree, node => node.type === 'PrimaryButton')[0];
  await email().props.onPress(); await tick(); tree = render('privacy');
  assert.equal(all(tree, node => node.props?.accessibilityRole === 'alert').length, 1, 'No email handler has an inline recovery path');
  assert.ok(all(tree, node => node.type === 'Text' && node.props.children === SUPPORT_EMAIL)[0].props.selectable);
  fail = false; email().props.onPress(); tree = render('support'); assert.equal(email().props.disabled, true);
  email().props.onPress(); await tick(); assert.equal(opened.length, 2, 'Repeated taps cannot launch duplicate email drafts'); finish(); await tick();
  tree = render('support'); assert.equal(email().props.disabled, false);

  const today = new Date(2026, 10, 8), habit = habitFromDraft({ ...emptyDraft(), name: 'Private habit' }, today, 'personal');
  const mh = harness(), edits = [];
  const { MonthCalendar } = load('src/components/habit-views.tsx', { react: mh.react, 'react-native': native, './private-modal': 'Modal', './theme': theme, '../i18n/context': locale,
    './app-preferences': { useAppPreferences: () => ({ preferences: DEFAULT_PREFERENCES }) }, './draggable-habit': 'Draggable', './haptic-pressable': 'Pressable', './app-icon': 'AppIcon',
    './habit-ui': { HabitIcon: 'HabitIcon', RoundButton: 'RoundButton', Chevron: 'Chevron', Checkmark: 'Checkmark' },
  });
  tree = mh.render(() => MonthCalendar({ habit, month: today, today, onNote: day => edits.push(day) }));
  const editable = all(tree, node => node.props?.accessibilityActions?.some(action => action.name === 'longpress'));
  assert.equal(editable.length, 1); editable[0].props.onAccessibilityAction({ nativeEvent: { actionName: 'longpress' } });
  assert.deepEqual(edits, ['2026-11-08'], 'Screen-reader users can open the day editor without a physical long press');
  editable[0].props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }); assert.equal(edits.length, 1);
  console.log(`Privacy checks passed: iOS/Android state transitions, root/sheet covers, hidden accessibility content, unchanged drafts, ${modalSurfaces} covered modal modules, no app diagnostics/network output, support mail privacy/errors, translated policy and accessible calendar editing. Minimum standalone target: ${control.touch} points. Native snapshot timing remains a device check.`);
}
check().catch(error => { console.error(error); process.exitCode = 1; });
