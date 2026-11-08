const assert = require('node:assert/strict');
const { load, harness, tick } = require('./check-actions.cjs');
const { habitFromDraft, emptyDraft } = load('src/data/habit-draft.ts');
const { encodeBackup, decodeBackup, BACKUP_MAX_BYTES } = load('src/data/habit-backup.ts');
const { HABIT_STORAGE_KEY } = load('src/data/habit-storage.ts');
const { createTranslator } = load('src/i18n/locale.ts');
const now = new Date('2026-11-08T12:00:00.000Z'), t = createTranslator('en');
const snapshot = { habits: [habitFromDraft({ ...emptyDraft(), name: 'My habit' }, now, 'habit')], retainedCollections: [] };
function all(node, test) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => all(child, test));
  return [...(test(node) ? [node] : []), ...all(node.props?.children, test)];
}
const text = (node, value) => all(node, n => n.type === 'Text' && n.props.children === value).length > 0;
async function check() {
  const disk = new Map(), folders = new Set(), sizes = new Map(), storage = new Map([[HABIT_STORAGE_KEY,'do not change']]);
  const uri = parts => parts.map(part => typeof part === 'string' ? part : part.uri).reduce((base, next, index) => index === 0 ? next : base.replace(/\/$/, '') + '/' + next.replace(/^\//, ''), '');
  let deferWrite = false, finishWrite, reads = 0, shares = 0, sharing = true, picked = { canceled: true };
  class Directory {
    constructor(...parts) { this.uri = uri(parts); }
    get exists() { return folders.has(this.uri); }
    create() { folders.add(this.uri); }
    delete() { folders.delete(this.uri); for (const key of disk.keys()) if (key.startsWith(this.uri + '/')) disk.delete(key); }
  }
  class File {
    constructor(...parts) { this.uri = uri(parts); }
    get exists() { return disk.has(this.uri); }
    get size() { return sizes.get(this.uri) ?? Buffer.byteLength(disk.get(this.uri) ?? ''); }
    create() { disk.set(this.uri, ''); }
    write(value) { if (deferWrite) return new Promise(resolve => { finishWrite = () => { disk.set(this.uri, value); resolve(); }; }); disk.set(this.uri, value); return Promise.resolve(); }
    async text() { reads++; return disk.get(this.uri); }
    delete() { disk.delete(this.uri); }
  }
  const files = load('src/services/backup-files.ts', {
    'expo-file-system': { Directory, File, Paths: { cache: { uri: 'file:///cache' } } },
    'expo-document-picker': { getDocumentAsync: async options => { assert.equal(options.copyToCacheDirectory, true); assert.equal(options.multiple, false); return picked; } },
    'expo-sharing': { isAvailableAsync: async () => sharing, shareAsync: async path => { shares++; assert.equal(decodeBackup(disk.get(path)).snapshot.habits[0].name, 'My habit'); } },
    '@react-native-async-storage/async-storage': { getItem: async key => storage.get(key) ?? null, setItem: async (key, value) => storage.set(key, value), removeItem: async key => storage.delete(key) },
  });
  await files.exportBackupFile(snapshot, now); assert.equal(shares, 1); assert.equal(disk.size, 0, 'Export temporaries are removed after the share sheet closes');
  deferWrite = true;
  const exporting = files.exportBackupFile(snapshot, now); await tick(); assert.equal(shares, 1, 'SDK 58 asynchronous file writing finishes before sharing');
  finishWrite(); await exporting; deferWrite = false; assert.equal(shares, 2);
  sharing = false; await assert.rejects(files.exportBackupFile(snapshot, now)); assert.equal(disk.size, 0); sharing = true;
  assert.equal(await files.pickBackupFile(), null, 'Picker cancellation is not an import');
  const source = 'file:///cache/DocumentPicker/backup.json';
  disk.set(source, encodeBackup(snapshot, now)); picked = { canceled: false, assets: [{ uri: source, name: 'backup.json', size: 1 }] };
  const selected = await files.pickBackupFile(); assert.equal(selected.backup.snapshot.habits.length, 1); assert.equal(disk.has(source), false);
  disk.set(source, '{bad'); await assert.rejects(files.pickBackupFile()); assert.equal(disk.has(source), false);
  disk.set(source, '{}'); sizes.set(source, BACKUP_MAX_BYTES + 1); const readBefore = reads;
  await assert.rejects(files.pickBackupFile()); assert.equal(reads, readBefore, 'Native file size overrides misleading provider metadata'); sizes.delete(source);
  const original = 'file:///documents/original.json'; disk.set(original, 'keep');
  storage.set('@habit-tracker/import-files/v1', JSON.stringify([original,'file:///cache/%2e%2e/documents/original.json']));
  await files.clearBackupFiles(); assert.equal(disk.get(original), 'keep'); assert.equal(storage.get(HABIT_STORAGE_KEY), 'do not change');

  const h = harness(); let next = { backup: decodeBackup(encodeBackup(snapshot, now)), name: 'backup.json' }, bad = false, exports = 0, restores = 0, eraseCalls = 0, pauses = 0, restoreOk = false, alertButtons;
  const native = { View: 'View', Text: 'Text', TextInput: 'TextInput', StyleSheet: { create: value => value }, Alert: { alert: (_title, _message, buttons) => { alertButtons = buttons; } } };
  const theme = { useTheme: () => ({ colors: {}, mode: 'dark' }), createThemedStyles: f => () => f({}) };
  const Screen = load('src/screens/backup-screen.tsx', { react: h.react, 'react-native': native,
    '../components/haptic-pressable': 'Pressable', '../components/preference-ui': { PrimaryButton: 'PrimaryButton', usePreferenceStyles: () => ({}) },
    '../components/theme': theme, '../i18n/context': { useTranslation: () => ({ t, locale: 'en' }) },
    '../components/reminders': { useReminders: () => ({ prepareForErase: async () => { pauses++; } }) },
    '../services/backup-files': { exportBackupFile: async () => { exports++; }, pickBackupFile: async () => { if (bad) throw Error('Invalid file'); return next; } },
  }).default;
  const props = { snapshot, canExport: true, onRestore: async () => { restores++; return restoreOk; }, onErase: async () => { eraseCalls++; } };
  const render = () => h.render(() => Screen(props)); let tree = render();
  all(tree, n => n.type === 'PrimaryButton' && n.props.children === 'Export backup')[0].props.onPress(); await tick(); assert.equal(exports, 1);
  assert.equal(restores, 0);
  all(tree, n => n.type === 'Pressable' && text(n, 'Choose backup file'))[0].props.onPress(); await tick(); tree = render();
  assert.ok(text(tree, 'Review backup')); assert.equal(restores, 0, 'Reviewing a file cannot change habits');
  all(tree, n => n.type === 'PrimaryButton' && n.props.children === 'Restore backup')[0].props.onPress(); assert.equal(restores, 0);
  alertButtons[0].onPress?.(); assert.equal(restores, 0, 'Cancelling confirmation cannot restore');
  alertButtons[1].onPress(); await tick(); tree = render(); assert.equal(restores, 1); assert.ok(text(tree, 'Review backup'), 'A failed restore retains its preview for retry');
  restoreOk = true; all(tree, n => n.type === 'PrimaryButton' && n.props.children === 'Restore backup')[0].props.onPress(); alertButtons[1].onPress(); await tick(); tree = render();
  assert.equal(restores, 2); assert.equal(text(tree, 'Review backup'), false);
  all(tree, n => n.type === 'Pressable' && text(n, 'Choose backup file'))[0].props.onPress(); await tick(); render();
  bad = true; tree = render(); all(tree, n => n.type === 'Pressable' && text(n, 'Choose backup file'))[0].props.onPress(); await tick(); tree = render();
  assert.equal(text(tree, 'Review backup'), false, 'A failed new file cannot leave an old restore candidate active');
  all(tree, n => n.type === 'Pressable' && text(n, 'Erase all local data'))[0].props.onPress(); tree = render();
  const erase = all(tree, n => n.type === 'Pressable' && text(n, 'Permanently erase local data'))[0];
  assert.equal(erase.props.disabled, true); erase.props.onPress(); await tick(); assert.equal(eraseCalls, 0);
  all(tree, n => n.type === 'TextInput')[0].props.onChangeText('ERASE'); tree = render();
  all(tree, n => n.type === 'Pressable' && text(n, 'Permanently erase local data'))[0].props.onPress(); await tick(); assert.equal(pauses, 1); assert.equal(eraseCalls, 1);

  // Root recovery is checked before mounting any data owners; reset remounts them.
  const rh = harness(), erasedStorage = new Map([[HABIT_STORAGE_KEY,'private'],['foreign','keep']]);
  let reminderCleanup = 0, fileCleanup = 0, hapticResets = 0;
  const previousFrame = global.requestAnimationFrame; global.requestAnimationFrame = fn => fn();
  try {
    const Boundary = load('src/components/local-reset.tsx', {
      react: { ...rh.react, createContext: () => ({ Provider: 'Provider' }) }, 'react-native': { ...native, ActivityIndicator: 'Spinner', Pressable: 'Pressable' },
      '@react-native-async-storage/async-storage': { getItem: async key => erasedStorage.get(key) ?? null, setItem: async (key, value) => erasedStorage.set(key, value), getAllKeys: async () => [...erasedStorage.keys()], removeItem: async key => erasedStorage.delete(key) },
      '../services/reminder-notifications': { clearOwnedReminders: async () => { reminderCleanup++; } }, '../services/backup-files': { clearBackupFiles: async () => { fileCleanup++; } },
      '../utils/feedback': { resetHapticsAfterErase: () => { hapticResets++; } },
    }).LocalResetBoundary;
    let root = rh.render(() => Boundary({ children: 'App' })); assert.notEqual(root.type, 'Provider'); await tick(); root = rh.render(() => Boundary({ children: 'App' }));
    assert.equal(root.type, 'Provider'); const epoch = root.key;
    const wiping = root.props.value.erase(); root = rh.render(() => Boundary({ children: 'App' })); assert.notEqual(root.type, 'Provider'); await wiping;
    root = rh.render(() => Boundary({ children: 'App' })); assert.equal(root.type, 'Provider'); assert.notEqual(root.key, epoch);
    assert.deepEqual([...erasedStorage], [['foreign','keep']]); assert.equal(reminderCleanup, 1); assert.equal(fileCleanup, 1); assert.equal(hapticResets, 2);
  } finally { global.requestAnimationFrame = previousFrame; }
  console.log('Backup UI/file checks passed: asynchronous export, picker cancellation, actual file sizes, temporary-file scope, validated preview, explicit restore, retained failure state, typed erasure and root recovery/remount. Real Files/share-sheet round-trip remains a device check.');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
