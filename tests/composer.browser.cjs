const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const ts = require('typescript');
const puppeteer = require('puppeteer-core');

test('composer styles the input panel without adding a border to its presentation shell', async t => {
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
      * {box-sizing:border-box} body {margin:0} div {display:flex;flex-direction:column;min-width:0}
      main {max-width:700px} .panel {border:1px solid #3b3b3b;border-radius:16px;padding:16px}
      textarea {width:100%;min-width:0} .measure {position:absolute;opacity:0;height:0;width:0}
    </style>`;
    const panel = id => `<div class="panel" id="${id}-panel"><textarea class="measure" data-composer-input></textarea>
      <div><textarea id="${id}-editor" data-composer-input></textarea></div>
      <div><button data-testid="message-input-attach-button">Attach</button><button>Send</button></div></div>`;
    document.body.innerHTML = `<main>
      <div data-testid="message-input-root" id="old">${panel('old')}</div>
      <div data-testid="message-input-root" id="new"><div id="presentation"><div id="body">${panel('new')}</div><div id="overlay"></div></div></div>
      <div data-testid="message-input-root" id="full"><div data-testid="composer-fullscreen">${panel('full')}</div></div>
      <div data-testid="message-input-root" id="unknown"><textarea data-composer-input></textarea><button data-testid="message-input-attach-button">Attach</button></div>
      <div data-testid="message-input-root" id="readonly"><div data-testid="composer-readonly-content">Read only</div></div>
      <button id="outside">Outside</button></main>`;
    window.originalEditor = document.querySelector('#new-editor');
    originalEditor.value = 'Unsent draft';
    window.attachCalls = 0;
    document.querySelector('#new [data-testid="message-input-attach-button"]').onclick = () => attachCalls++;
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
  for (const width of [1342,390]) for (const mode of ['light','dark']) {
    await page.setViewport({width,height:750});
    await page.evaluate(mode => theme(mode),mode);
    await page.waitForFunction(mode => document.documentElement.dataset.pfActive === mode,{},mode);
    assert.deepEqual(await page.$$eval('[data-pf-composer-box]',nodes=>nodes.map(e=>e.id)),['old-panel','new-panel']);
    await page.focus('#new-editor');
    const focused = await page.evaluate(() => {
      const panel = document.querySelector('#new-panel');
      return {border:getComputedStyle(panel).borderColor,shadow:getComputedStyle(panel).boxShadow,
        shell:['presentation','body'].map(id=>{const s=getComputedStyle(document.getElementById(id));return [s.borderWidth,s.padding,s.boxShadow]}),
        overflow:document.documentElement.scrollWidth > innerWidth,
        sameEditor:originalEditor === document.querySelector('#new-editor'),draft:originalEditor.value};
    });
    assert.equal(focused.border,mode === 'dark' ? 'rgb(76, 136, 255)' : 'rgb(51, 112, 255)');
    assert.notEqual(focused.shadow,'none');
    assert.deepEqual(focused.shell,[['0px','0px','none'],['0px','0px','none']]);
    assert.equal(focused.overflow,false);
    assert.equal(focused.sameEditor,true);
    assert.equal(focused.draft,'Unsent draft');
    await page.click('#outside');
    assert.equal(await page.$eval('#new-panel',e=>getComputedStyle(e).boxShadow),'none');
  }
  await page.click('#new [data-testid="message-input-attach-button"]');
  assert.equal(await page.evaluate(()=>attachCalls),1);
  await page.evaluate(() => dispose());
  assert.equal(await page.$$eval('[data-pf-composer-box],[data-pf-owned]',nodes=>nodes.length),0);
  assert.equal(await page.$eval('#new-panel',e=>getComputedStyle(e).borderRadius),'16px');
  assert.equal(await page.$eval('#new-editor',e=>e.value),'Unsent draft');
});
