const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const ts = require('typescript');
const puppeteer = require('puppeteer-core');

test('sidebar avatars cross transparent host wrappers without resizing status badges', async t => {
  const server = http.createServer((_, res) => res.end('<!doctype html><html><head></head><body></body></html>'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const browser = await puppeteer.launch({headless:true,
    executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setViewport({width:1342,height:750});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(() => {
    document.head.innerHTML = `<style>
      * {box-sizing:border-box} div {display:flex;flex-direction:column;min-width:0}
      .slot {width:16px;height:20px;flex-shrink:0;align-items:center;justify-content:center}
      .box {position:relative;width:16px;height:16px}
      .avatar {width:16px;height:16px;background:#388577;border-radius:4px}
      .badge {position:absolute;right:-4px;bottom:-4px;width:12px;height:12px}
      .dot {width:6px;height:6px} .transparent {display:contents}
    </style>`;
    const avatar = '<div class="avatar"><div dir="auto">P</div></div>';
    const image = '<div class="avatar" role="img"><div style="position:absolute;inset:0;background-size:cover"></div></div>';
    const rows = [avatar,`<div class="transparent">${avatar}</div>`,image,`<div class="transparent">${image}</div>`]
      .map((content,i) => `<div data-testid="sidebar-workspace-row-${i}"><div style="flex-direction:row">
        <div class="slot" data-testid="sidebar-row-project-icon-${i}"><div class="box">${content}
          <div class="badge" role="status" data-testid="project-status-badge"><div class="dot"></div></div>
        </div></div><div>Project ${i}</div></div></div>`).join('');
    document.body.innerHTML = `<div style="flex-direction:row"><div><div>
      <div><button data-testid="sidebar-global-new-workspace">New</button></div>
      <div><div data-testid="sidebar-status-list-scroll"><div>${rows}</div></div></div>
      <div><button data-testid="sidebar-settings">Settings</button></div>
      <div data-testid="left-sidebar-resize-handle"></div>
    </div></div><div data-testid="workspace-pane-main"></div></div>`;
    window.exports = {};
    window.require = name => name === 'react-native' ? {Platform:{OS:'web'}} :
      name === './thinking' ? {registerThinking:()=>()=>{}} : {copyText:async()=>{}};
    window.theme = mode => {
      document.documentElement.className = mode === 'dark' ? 'pluginDark' : 'pluginLight';
      localStorage.setItem('@paseo:app-settings', JSON.stringify({theme:'plugin',pluginThemeId:`paseo-feishu-ui/theme/feishu-${mode}`}));
      dispatchEvent(new Event('storage'));
    };
    theme('dark');
  });
  const source = fs.readFileSync(path.join(__dirname,'../client/web.ts'),'utf8');
  const adapter = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText;
  await page.addScriptTag({content:`((exports,require)=>{${adapter}})(window.exports,window.require)`});
  await page.evaluate(() => { window.dispose = exports.installFeishuSkin({}); });
  await page.waitForSelector('html[data-pf-active]');
  for (const width of [1342,820,390]) for (const mode of ['light','dark']) {
    await page.setViewport({width,height:750});
    await page.evaluate(mode => theme(mode),mode);
    await page.waitForFunction(mode => document.documentElement.dataset.pfActive === mode,{},mode);
    const sizes = await page.evaluate(() => [...document.querySelectorAll('.avatar,.badge,.dot')].map(e =>
      [e.className,e.getBoundingClientRect().width,e.getBoundingClientRect().height]));
    for (const [kind,w,h] of sizes) assert.deepEqual([w,h], Array(2).fill(kind === 'avatar' ? (width >= 760 ? 36 : 16) : kind === 'badge' ? 12 : 6),`${mode}/${width}/${kind}`);
  }
  await page.setViewport({width:1342,height:750});
  await page.evaluate(() => dispose());
  assert.equal(await page.$$eval('[data-pf-row-avatar],[data-pf-row-icon-box],[data-pf-owned]',nodes=>nodes.length),0);
  assert.deepEqual(await page.$$eval('.avatar',nodes=>nodes.map(e=>e.getBoundingClientRect().width)),[16,16,16,16]);
});
