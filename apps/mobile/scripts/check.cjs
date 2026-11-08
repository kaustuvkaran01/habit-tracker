const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { scripts } = require('../package.json');
const root = path.resolve(__dirname, '..');

// Discover the individual checks so a newly added regression cannot silently
// be omitted from the full suite. Run Node directly: no shell or global tools.
const checks = [
  ['typecheck', [require.resolve('typescript/bin/tsc'), '--noEmit']],
  ...Object.entries(scripts).filter(([name]) => name.startsWith('check:')).map(([name, command]) => {
    const match = /^node (scripts\/[\w-]+\.cjs)$/.exec(command);
    if (!match) throw Error(`Unsupported check command: ${name}. Add an explicit Node argument list.`);
    return [name, [path.join(root, match[1])]];
  }),
];
const started = Date.now();
for (const [name, args] of checks) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    console.error(`FAIL ${name}\n${result.stdout ?? ''}${result.stderr ?? ''}`);
    if (result.error) console.error(result.error);
    process.exit(result.status || 1);
  }
  console.log(`PASS ${name}`);
}
console.log(`${checks.length} checks passed in ${((Date.now() - started) / 1000).toFixed(1)}s. Native/device acceptance is separate.`);
