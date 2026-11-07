const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('require', 'module', 'exports', code)((name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), module, module.exports);
  return module.exports;
}

function engine(stored = null) {
  const calls = [], writes = [];
  const native = { Platform: { OS: 'ios' }, AppState: { currentState: 'active' } };
  let failNative = false;
  const action = (type) => async (value) => { calls.push([type, value]); if (failNative) throw Error('No haptic hardware'); };
  const api = {
    AndroidHaptics: { Context_Click: 'press', Segment_Tick: 'tick', Confirm: 'confirm', Clock_Tick: 'clock', Long_Press: 'long', Reject: 'reject' },
    ImpactFeedbackStyle: { Soft: 'soft', Medium: 'medium', Light: 'light' }, NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
    selectionAsync: action('selection'), impactAsync: action('impact'), notificationAsync: action('notification'), performAndroidHapticsAsync: action('android'),
  };
  const storage = { getItem: async () => stored, setItem: async (key, value) => { writes.push([key, value]); } };
  return {
    service: load('src/utils/feedback.ts', { 'react-native': native, 'expo-haptics': api, '@react-native-async-storage/async-storage': storage }),
    calls, writes, native, storage, api, failNative: () => { failNative = true; },
  };
}

async function run() {
  const originalNow = Date.now;
  let now = 1000;
  Date.now = () => now;
  try {
    const e = engine();
    e.service.feedback();
    assert.equal(e.calls.length, 0, 'No feedback before the saved preference loads');
    await e.service.initializeHaptics();
    assert.equal(e.calls.length, 0, 'Startup must be quiet');
    e.service.feedback('press');
    assert.deepEqual(e.calls.pop(), ['impact', 'soft']);
    now += 20; e.service.feedback('selection'); assert.equal(e.calls.length, 0, 'Suppress rapid repeated ticks');
    e.service.feedback('success'); assert.deepEqual(e.calls.pop(), ['notification', 'success'], 'A reward takes priority over a recent soft press');
    now += 100; e.service.feedback('completion'); assert.deepEqual(e.calls.pop(), ['impact', 'medium']);
    now += 100; e.service.feedback('undo'); assert.deepEqual(e.calls.pop(), ['impact', 'light']);
    now += 100; e.service.feedback('longPress'); assert.deepEqual(e.calls.pop(), ['impact', 'medium']);
    now += 100; e.service.feedback('selection'); assert.deepEqual(e.calls.pop(), ['selection', undefined]);
    now += 100; e.native.Platform.OS = 'android'; e.service.feedback('completion'); assert.deepEqual(e.calls.pop(), ['android', 'confirm']);
    now += 100; e.service.feedback('selection'); assert.deepEqual(e.calls.pop(), ['android', 'tick']);
    now += 100; e.native.Platform.OS = 'web'; e.service.feedback(); assert.equal(e.calls.length, 0);
    e.native.Platform.OS = 'ios'; e.native.AppState.currentState = 'background'; e.service.feedback(); assert.equal(e.calls.length, 0);
    e.native.AppState.currentState = 'active';
    await e.service.setHapticsEnabled(false); e.service.feedback('success'); assert.equal(e.calls.length, 0);
    assert.equal(e.writes.at(-1)[1], 'off');
    now += 100; await e.service.setHapticsEnabled(true); assert.deepEqual(e.calls.pop(), ['selection', undefined]); assert.equal(e.writes.at(-1)[1], 'on');
    now += 100; e.failNative(); assert.doesNotThrow(() => e.service.feedback('completion')); await new Promise(resolve => setImmediate(resolve));

    const off = engine('off'); await off.service.initializeHaptics(); off.service.feedback(); assert.equal(off.calls.length, 0, 'Saved opt-out survives a reload');
    const failedRead = engine(); failedRead.storage.getItem = async () => { throw Error('Cannot read'); };
    await failedRead.service.initializeHaptics(); failedRead.service.feedback(); assert.equal(failedRead.calls.length, 0, 'Failed preference reads default to quiet');
    const race = engine(); let release;
    race.storage.getItem = () => new Promise(resolve => { release = resolve; });
    const initializing = race.service.initializeHaptics(); await race.service.setHapticsEnabled(false); release('on'); await initializing;
    assert.equal(race.service.getHapticsEnabled(), false, 'A late read must not override the user’s new choice');
    assert.equal(race.service.initializeHaptics(), initializing, 'Initialization is shared across repeated mounts');
    const failedWrite = engine(); await failedWrite.service.initializeHaptics();
    let attempts = 0;
    failedWrite.storage.setItem = async () => { if (++attempts === 1) throw Error('Full storage'); };
    await assert.rejects(failedWrite.service.setHapticsEnabled(false));
    assert.equal(failedWrite.service.getHapticsEnabled(), false, 'The local choice still applies if saving fails');
    await failedWrite.service.setHapticsEnabled(true);
    assert.equal(attempts, 2, 'A failed preference write must not block later saves');

    const before = { checkIns: [], rewards: { wallpapers: [], badges: [] } };
    const complete = { ...before, checkIns: ['2026-11-05'] };
    const classify = e.service.completionFeedbackFor;
    assert.equal(classify(before, before, '2026-11-05'), null);
    assert.equal(classify(before, complete, '2026-11-05'), 'completion');
    assert.equal(classify(complete, before, '2026-11-05'), 'undo');
    assert.equal(classify(before, { ...complete, rewards: { wallpapers: [{}], badges: [] } }, '2026-11-05'), 'success');
    assert.equal(classify(before, { ...complete, rewards: { wallpapers: [], badges: [{}] } }, '2026-11-05'), 'success');
    assert.equal(classify(complete, { ...complete, notes: { '2026-11-05': 'Edited note' } }, '2026-11-05'), null);

    const emitted = [], actions = [];
    const Press = load('src/components/haptic-pressable.tsx', { 'react-native': { Pressable: 'NativePressable' }, '../utils/feedback': { feedback: kind => emitted.push(kind) } }).default;
    const event = {};
    let control = Press({ onPress: ev => actions.push(ev), children: 'Go' });
    assert.equal(emitted.length, 0, 'Rendering a control does not trigger a haptic');
    control.props.onPress(event); assert.deepEqual(emitted.splice(0), ['press']); assert.equal(actions[0], event);
    control = Press({ disabled: true, onPress: () => actions.push('disabled') }); control.props.onPress(event); assert.equal(emitted.length, 0); assert.equal(actions.length, 1);
    control = Press({ accessibilityState: { disabled: true }, onPress() {} }); control.props.onPress(event); assert.equal(emitted.length, 0);
    for (const state of [{ accessibilityRole: 'tab', accessibilityState: { selected: true } }, { accessibilityRole: 'radio', accessibilityState: { checked: true } }, { accessibilityRole: 'button', accessibilityState: { selected: true } }]) {
      control = Press({ ...state, onPress() {} }); control.props.onPress(event); assert.equal(emitted.length, 0);
    }
    control = Press({ accessibilityRole: 'checkbox', accessibilityState: { checked: true }, onPress() {} }); control.props.onPress(event); assert.deepEqual(emitted.splice(0), ['selection'], 'Unchecking an option still gives selection feedback');
    control = Press({ haptic: false, onPress() {}, onLongPress: () => actions.push('note') }); control.props.onPress(event); assert.equal(emitted.length, 0, 'Completion controls leave feedback to the committed action');
    control.props.onLongPress(event); assert.deepEqual(emitted.splice(0), ['longPress']); assert.equal(actions.at(-1), 'note');
    const ref = { current: null }, style = { width: 42 }, children = 'Icon';
    control = Press({ ref, style, children, onPress() {} }); assert.equal(control.props.ref, ref); assert.equal(control.props.style, style); assert.equal(control.props.children, children);
    console.log('Haptic checks passed: startup/opt-out, preference races, rate limits, platform effects, unsupported hardware, completion/reward intent, disabled/selected controls, long press and preserved control props.');
  } finally { Date.now = originalNow; }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
