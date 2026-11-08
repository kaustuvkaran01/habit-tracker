const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const ts = require('typescript'), babel = require('@babel/core');
const root = path.resolve(__dirname, '..'), domain = path.join(root, 'src/data');
const preset = require.resolve('babel-preset-expo', { paths: [path.dirname(require.resolve('expo/package.json'))] });
function sources(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory()
    ? sources(path.join(dir, item.name)) : /\.tsx?$/.test(item.name) ? [path.join(dir, item.name)] : []);
}
const files = ['App.tsx', 'index.ts'].map(file => path.join(root, file)).concat(sources(path.join(root, 'src')));
for (const file of files) {
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function inspect(node) {
    const specifier = ts.isImportDeclaration(node) || ts.isExportDeclaration(node) ? node.moduleSpecifier
      : ts.isCallExpression(node) && node.expression.getText(ast) === 'require' ? node.arguments[0] : null;
    if (specifier && ts.isStringLiteral(specifier)) {
      const name = specifier.text;
      if (file.startsWith(domain + path.sep)) assert.ok(name.startsWith('./'), `Domain module must not depend on UI/native/services: ${path.relative(root, file)} → ${name}`);
      if (name.startsWith('.')) {
        const target = path.resolve(path.dirname(file), name);
        const resolved = [target, target + '.ts', target + '.tsx', target + '.json', path.join(target, 'index.ts'), path.join(target, 'index.tsx')]
          .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        assert.ok(resolved, `Missing relative import: ${file} → ${name}`);
        // macOS's usual filesystem accepts wrong casing; CI/Linux does not.
        let directory = path.parse(resolved).root;
        for (const part of resolved.slice(directory.length).split(path.sep)) {
          assert.ok(fs.readdirSync(directory).includes(part), `Import casing mismatch: ${file} → ${name}`);
          directory = path.join(directory, part);
        }
        if (file.startsWith(domain + path.sep)) assert.ok(resolved.startsWith(domain + path.sep), 'Domain imports must stay in data/');
      }
    }
    ts.forEachChild(node, inspect);
  }
  inspect(ast);
}
for (const platform of ['ios', 'android']) {
  for (const file of files) babel.transformFileSync(file, { babelrc: false, configFile: false, presets: [preset],
    caller: { name: 'metro', platform, isDev: true, isServer: false, supportsStaticESM: true } });
}
console.log(`${files.length} sources: relative imports/casing, pure domain boundary and iOS/Android Expo transforms pass. No native build or server.`);
