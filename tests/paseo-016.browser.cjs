const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const ts = require('typescript');
const puppeteer = require('puppeteer-core');

test('0.16 docked sidebar and tool headers preserve native actions and turn boundaries', async t => {
  const server = http.createServer((_, res) => res.end('<!doctype html><html><body></body></html>'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const browser = await puppeteer.launch({ headless: true,
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({ width: 1342, height: 750 });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(() => {
    document.head.innerHTML = `<style>
      *{box-sizing:border-box} body{margin:0} div{display:flex;flex-direction:column;min-width:0}
      button{color:inherit;font:inherit} .row{flex-direction:row} .contents{display:contents}
      .indent{border-left:2px solid #888;padding-left:12px} #center{flex:1}
    </style>`;
    const tool = (id, disabled = false) => `<div data-testid="tool-call-badge" id="${id}"><div class="row">
      <button id="${id}-toggle" ${disabled ? 'disabled aria-disabled="true"' : ''}>
        <div><svg stroke="#888"><path d="M1 1L5 5"/></svg></div>
        <div><div dir="auto">Read</div><div dir="auto">src/example.ts</div></div>
      </button><button data-testid="tool-call-open-file" aria-label="Open file" id="${id}-file"><svg width="16" height="16"><path d="M1 1L5 5"/></svg></button>
    </div></div>`;
    document.body.innerHTML = `<div class="row"><div><div><div style="display:none"></div><div><div id="sidebar">
      <div><div role="button" data-testid="sidebar-sessions">History</div><div role="button" data-testid="sidebar-search">Search</div></div>
      <div><div data-testid="sidebar-project-workspace-list-scroll"><div>Project</div></div></div>
      <div><div><div role="alert">Setup failed</div></div></div>
      <div data-testid="sidebar-footer"><button data-testid="sidebar-footer-overflow">More</button></div>
      <div data-testid="left-sidebar-resize-handle"></div>
    </div></div></div></div><div id="gap"></div><div id="center">
      <div data-testid="workspace-pane-main"><div data-testid="agent-chat-scroll"><div>
        <div data-history-row-id="tool:1" data-index="0"><div>${tool('tool')}</div></div>
        <div data-history-row-id="reply:block:0" data-index="1"><div><div class="contents"><div data-testid="assistant-message">First</div></div></div></div>
        <div data-history-row-id="reply:block:1" data-index="2"><div><div class="contents"><div data-testid="assistant-message">Second</div></div></div></div>
        <div data-history-row-id="collapsed" data-index="3"><div><div class="indent">${tool('nested')}</div></div></div>
        <div data-history-row-id="disabled" data-index="4"><div>${tool('disabled', true)}</div></div>
        <div data-history-row-id="permission" data-index="5"><div><div data-testid="permission-request-question"><button id="permission">Allow</button></div></div></div>
      </div></div></div>
    </div></div>`;
    window.actions = { toggle: 0, file: 0, search: 0, more: 0, permission: 0 };
    window.nativeToggle = document.querySelector('#tool-toggle');
    nativeToggle.onclick = () => actions.toggle++;
    document.querySelector('#tool-file').onclick = () => actions.file++;
    document.querySelector('[data-testid="sidebar-search"]').onclick = () => actions.search++;
    document.querySelector('[data-testid="sidebar-footer-overflow"]').onclick = () => actions.more++;
    document.querySelector('#permission').onclick = () => actions.permission++;
    window.exports = {};
    window.require = name => name === 'react-native' ? { Platform: { OS: 'web' } } :
      name === './thinking' ? { registerThinking: () => () => {} } : { copyText: async () => {} };
    window.theme = mode => {
      document.documentElement.className = mode === 'dark' ? 'pluginDark' : 'pluginLight';
      localStorage.setItem('@paseo:app-settings', JSON.stringify({ theme: 'plugin', pluginThemeId: `paseo-feishu-ui/theme/feishu-${mode}` }));
      dispatchEvent(new Event('storage'));
    };
    theme('dark');
  });
  const adapter = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../client/web.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText;
  await page.addScriptTag({ content: `((exports,require)=>{${adapter}})(window.exports,window.require)` });
  await page.evaluate(() => { window.dispose = exports.installFeishuSkin({}); });
  await page.waitForSelector('#tool-toggle[data-pf-tool-header]');
  for (const width of [1342, 390]) for (const mode of ['light', 'dark']) {
    await page.setViewport({ width, height: 750 });
    await page.evaluate(mode => theme(mode), mode);
    await page.waitForFunction(mode => document.documentElement.dataset.pfActive === mode, {}, mode);
    const result = await page.evaluate(() => {
      const q = s => document.querySelector(s);
      const file = q('#tool-file').getBoundingClientRect(), labels = q('#tool [data-pf-tool-labels]').getBoundingClientRect();
      return {
        original: q('#tool-toggle') === nativeToggle,
        sidebar: q('#sidebar').hasAttribute('data-pf-sidebar'),
        center: q('#center').hasAttribute('data-pf-center'),
        callout: q('#sidebar').hasAttribute('data-pf-has-callout'),
        fileSeparate: file.left >= labels.right,
        disabled: q('#disabled-toggle').dataset.pfToolHeader,
        parts: [...document.querySelectorAll('[data-testid="assistant-message"]')].map(e => e.dataset.pfMessagePart),
        nestedResponse: q('#nested').closest('[data-history-row-id]').firstElementChild.dataset.pfResponsePart ?? null,
        permissionStyled: !!q('#permission').closest('[data-pf-response-part],[data-pf-tool]'),
      };
    });
    assert.equal(result.original, true);
    assert.equal(result.fileSeparate, true, `${width}/${mode} file button overlaps labels`);
    assert.equal(result.disabled, 'static');
    assert.deepEqual(result.parts, ['start', 'end']);
    assert.equal(result.nestedResponse, null);
    assert.equal(result.permissionStyled, false);
    if (width >= 760) for (const key of ['sidebar', 'center', 'callout']) assert.equal(result[key], true, key);
  }
  await page.setViewport({ width: 1342, height: 750 });
  await page.waitForSelector('.pf-groups');
  const actions = await page.evaluate(() => {
    document.querySelector('#tool-toggle').click();
    document.querySelector('#tool-file').click();
    [...document.querySelectorAll('.pf-groups button')].find(e => e.textContent === '搜索工作区').click();
    [...document.querySelectorAll('.pf-groups button')].find(e => e.textContent === '添加项目').click();
    return window.actions;
  });
  assert.deepEqual(actions, { toggle: 1, file: 1, search: 1, more: 1, permission: 0 });
  await page.evaluate(() => dispose());
  assert.equal(await page.$$eval('[data-pf-owned],[data-pf-tool],[data-pf-sidebar],[data-pf-center]', nodes => nodes.length), 0);
  assert.deepEqual(errors, []);
});
