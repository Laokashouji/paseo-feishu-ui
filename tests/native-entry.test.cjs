const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function loadNativeEntry(platform) {
  const cache = new Map();
  const sandbox = { console };
  for (const name of ['window', 'document', 'localStorage', 'CSS', 'MutationObserver']) {
    Object.defineProperty(sandbox, name, { get() { throw new Error(`Native touched ${name}`); } });
  }
  const context = vm.createContext(sandbox);
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const evaluate = vm.runInContext(`(function(require,module,exports){${source}\n})`, context);
    evaluate((specifier) => {
      if (specifier === 'react-native') return { Platform: { OS: platform }, View: 'View', Text: 'Text', ScrollView: 'ScrollView' };
      if (specifier === '@getpaseo/plugin/client/react-native') return { Icon: 'Icon' };
      if (specifier === 'zod' || specifier === 'react' || specifier === 'react/jsx-runtime') return require(specifier);
      if (specifier.startsWith('.')) {
        const target = ['.ts', '.tsx'].map(ext => path.resolve(path.dirname(file), specifier + ext)).find(fs.existsSync);
        assert.ok(target, `Missing module ${specifier}`);
        return load(target);
      }
      throw new Error(`Unexpected native runtime import: ${specifier}`);
    }, module, module.exports);
    return module.exports;
  }
  return load(path.join(root, 'index.client.tsx')).default;
}

for (const platform of ['ios', 'android']) {
  test(`${platform} loads the client entry without browser globals`, () => {
    const registered = { themes: [], surfaces: [], screens: [], commands: [] };
    const client = {
      addTheme(value) { registered.themes.push(value); return () => {}; },
      addSurface(id, Component) { registered.surfaces.push({ id, Component }); return () => {}; },
      addSettingsScreen(value) { registered.screens.push(value); return () => {}; },
      addCommandCenterItem(value) { registered.commands.push(value); return () => {}; },
    };
    const cleanup = loadNativeEntry(platform)(client);
    assert.deepEqual(registered.themes.map(t => t.appearance), ['light', 'dark']);
    assert.equal(registered.screens.length, 1);
    let opened;
    registered.commands[0].onSelect({ openSettings(id) { opened = id; } });
    assert.equal(opened, 'appearance');
    for (const theme of registered.themes) {
      const props = { theme: { colors: { surface0: theme.colors.background, surface1: theme.colors.raised,
        surface2: theme.colors.control, foreground: theme.colors.foreground, foregroundMuted: theme.colors.mutedForeground,
        accent: theme.colors.accent, border: theme.colors.border } }, layout: { platform, compact: true }, host: { id: 'test', label: 'test' } };
      const tree = registered.screens[0].Component(props);
      assert.equal(tree.type, 'View');
      assert.match(JSON.stringify(tree), /仅配色/);
      assert.match(JSON.stringify(tree), /尚未完成手机换肤/);
    }
    cleanup();
    cleanup();
  });
}
