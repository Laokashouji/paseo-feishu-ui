// Runs the actual adapter against a synthetic RNW-shaped transcript in installed Chrome.
// This verifies browser behavior, not the native iOS/Android renderer.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const ts = require('typescript');
const puppeteer = require('puppeteer-core');

const root = path.resolve(__dirname, '..');
const adapter = ts.transpileModule(fs.readFileSync(path.join(root, 'client/web.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
}).outputText;

const thinking = ts.transpileModule(fs.readFileSync(path.join(root, 'client/thinking.tsx'), 'utf8'), {
  compilerOptions: {module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2023, jsx:ts.JsxEmit.ReactJSX},
}).outputText;

test('tool cards retain native behavior, contain details, and clean up across states and owners', async (t) => {
  const server = http.createServer((_, res) => res.end('<!doctype html><html><head></head><body></body></html>'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.setViewport({ width: 1342, height: 850 });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(() => {
    document.head.insertAdjacentHTML('beforeend', `<style>
      * { box-sizing:border-box } body { margin:0; color:var(--pf-text); background:var(--pf-canvas); font:14px/20px -apple-system,sans-serif } button { text-align:left; color:inherit; font:inherit } div { display:flex; flex-direction:column; min-width:0 }
      [dir=auto] { display:block } #transcript { width:100%; max-width:860px; margin:auto }
      #native-content, .details { display:flex; flex-direction:column }
      .details { overflow:hidden } .code-scroll { overflow:auto; max-width:100%; display:block }
      pre { width:max-content; margin:0; white-space:pre }
      @keyframes paseo-toolcall-shimmer { from{opacity:.5} to{opacity:1} }
      .shimmer-text { animation:paseo-toolcall-shimmer 2s infinite }
      html { --colors-destructive:#ee4455 }
    </style>`);
    document.body.innerHTML = `<div data-testid="agent-chat-scroll" id="transcript"><div id="native-content">
      <div data-history-row-id="tool:1" id="source"><div><div data-testid="tool-call-badge" id="badge">
        <button id="header"><div><div id="icon"><svg stroke="#888"><path d="M1 1L5 5"/></svg></div><div id="labels">
          <div dir="auto" id="label">Shell</div><div dir="auto" id="summary"></div>
          <span data-testid="tool-call-open-file" id="file" role="button">↗</span>
        </div></div></button>
      </div></div></div>
      <div data-history-row-id="answer:segment:1:block:0"><div><div data-testid="assistant-message" id="answer0">First paragraph</div></div></div>
      <div data-history-row-id="answer:segment:1:block:1"><div><div data-testid="assistant-message" id="answer1">Second paragraph</div></div></div>
      <div data-history-row-id="malformed"><div><div data-testid="tool-call-badge" id="unknown"><button>Changed host structure</button></div></div></div>
      <div data-testid="permission-request-question" id="permission"><button>Allow once</button></div>
    </div></div>`;
    window.q = selector => document.querySelector(selector);
    window.command = 'node example.js ' + 'long-command-'.repeat(90);
    q('#summary').textContent = command;
    window.nativeHeader = q('#header'); window.nativeBadge = q('#badge');
    window.fileCalls = 0; window.toggleCalls = 0;
    q('#file').onclick = event => { event.stopPropagation(); fileCalls++; };
    nativeHeader.onclick = () => {
      toggleCalls++;
      if (q('.details')) { q('.details').remove(); return; }
      const details = document.createElement('div'); details.className = 'details';
      const scroll = document.createElement('div'); scroll.className = 'code-scroll';
      const pre = document.createElement('pre'); pre.textContent = '$ ' + command + '\nresult: done';
      scroll.append(pre); details.append(scroll); nativeBadge.append(details);
    };
    window.selectTheme = (mode, id = `paseo-feishu-ui/theme/feishu-${mode}`) => {
      localStorage.setItem('@paseo:app-settings', JSON.stringify({theme:'plugin', pluginThemeId:id}));
      document.documentElement.className = mode === 'dark' ? 'pluginDark' : 'pluginLight';
      dispatchEvent(new Event('storage'));
    };
    window.copied = [];
    window.exports = {};
    window.require = name => {
      if (name === './thinking') return window.thinkingModule;
      if (name === 'react' || name === 'react/jsx-runtime') return {};
      if (name === 'zod') return {z:{string:()=>({}),enum:()=>({}),object:()=>({})}};
      if (name === 'react-native') return {Platform:{OS:'web'}};
      if (name === '@getpaseo/plugin/client/react-native') return {copyText: async text => {
        if (window.rejectCopy) throw Error('clipboard unavailable');
        copied.push(text);
      }};
      throw Error('Unexpected import ' + name);
    };
  });
  await page.addScriptTag({ content: `((exports,require)=>{${thinking}})(window.exports,window.require)` });
  await page.evaluate(() => {
    window.thinkingModule = exports; window.exports = {};
    window.registrations = new Set();
    window.plugin = {
      addTimelineRenderer(value) { registrations.add(value); return () => registrations.delete(value); },
      addTimelineTransformer(value) { registrations.add(value); return () => registrations.delete(value); },
    };
  });
  await page.addScriptTag({ content: `((exports,require)=>{${adapter}})(window.exports,window.require)` });
  const wait = expression => page.waitForFunction(expression, {timeout:5000});
  await page.evaluate(() => { selectTheme('dark'); window.dispose1 = exports.installFeishuSkin(plugin); window.dispose2 = exports.installFeishuSkin(plugin); });
  await wait('q("#badge").dataset.pfToolState === "idle"');
  assert.deepEqual(await page.evaluate(() => ({
    title:q('#label').dataset.pfToolTitle, nativeTitle:q('#label').textContent,
    unknown:q('#unknown').hasAttribute('data-pf-tool'), permission:getComputedStyle(q('#permission')).display,
    parts:[q('#answer0').dataset.pfMessagePart,q('#answer1').dataset.pfMessagePart],
    styles:document.querySelectorAll('[data-pf-owned="style"]').length,
  })), {title:'运行命令',nativeTitle:'Shell',unknown:false,permission:'flex',parts:['start','end'],styles:1});
  const alignment = await page.evaluate(() => ({
    tool: q('#badge').getBoundingClientRect().x,
    body: q('#answer0').getBoundingClientRect().x,
  }));
  assert.equal(alignment.tool, alignment.body, 'tool rows must share the assistant bubble gutter');
  assert.equal(await page.$eval('#label', e => getComputedStyle(e).display), 'none');
  assert.equal(await page.evaluate(() => thinkingModule.firstThinkingLine('\n**Check native layout**\nThen inspect tool rows')), 'Check native layout');
  assert.deepEqual(await page.evaluate(() => [...registrations].find(r => r.transform).transform({item:{text:'first\nsecond'},phase:'streaming'}).items[0].data), {text:'first\nsecond',phase:'streaming'});
  assert.equal(await page.evaluate(() => registrations.size), 4);
  assert.deepEqual(await page.evaluate(() => {
    const frames = [q('#badge'),q('#answer0'),q('#answer1')].map(e => e.closest('[data-pf-response-part]'));
    return {parts:frames.map(f=>f.dataset.pfResponsePart),avatars:frames.filter(f=>f.hasAttribute('data-pf-response-avatar')).length,
      gaps:frames.slice(1).map((f,i)=>f.getBoundingClientRect().top-frames[i].getBoundingClientRect().bottom)};
  }), {parts:['start','middle','end'],avatars:1,gaps:[0,0]});
  await page.evaluate(() => {
    const footer = document.createElement('div'); footer.id = 'native-footer'; q('#source').append(footer);
  });
  await wait('q("#source").firstElementChild.dataset.pfResponsePart === "single"');
  assert.equal(await page.$eval('#answer0', e => e.closest('[data-pf-response-part]').dataset.pfResponsePart), 'start');
  await page.evaluate(() => { q('#native-footer').remove(); q('#source').dataset.index='0'; q('#answer0').closest('[data-history-row-id]').dataset.index='2'; });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.$eval('#source', e => e.firstElementChild.dataset.pfResponsePart), 'single');
  await page.evaluate(() => { q('#source').removeAttribute('data-index'); q('#answer0').closest('[data-history-row-id]').removeAttribute('data-index'); dispatchEvent(new Event('resize')); });
  await wait('q("#source").firstElementChild.dataset.pfResponsePart === "start"');
  // Paseo emits todo_list snapshots between Taskcreate/Taskupdate calls. Unlike a
  // tool badge, TodoListCard's ExpandableBadge has no data-testid.
  await page.evaluate(() => {
    q('#source').insertAdjacentHTML('afterend', `
      <div data-history-row-id="todo_1" id="todo-source"><div><div id="todo-badge">
        <button id="todo-header"><div><div><svg stroke="#888"><path d="M1 1L5 5"/></svg></div>
        <div><div dir="auto">Created 1 task</div></div></div></button>
      </div></div></div>
      <div data-history-row-id="tool:create" id="task-source"><div><div data-testid="tool-call-badge">
        <button><div><div><svg stroke="#888"/></div><div><div dir="auto">Taskcreate</div></div></div></button>
      </div></div></div>
      <div data-history-row-id="todo_2" id="todo-added"><div><div>
        <button><div><div><svg stroke="#888"/></div><div><div dir="auto">Added task</div><div dir="auto">Check layout</div></div></div></button>
      </div></div></div>`);
    window.nativeTodoHeader = q('#todo-header'); window.todoToggles = 0;
    nativeTodoHeader.onclick = () => {
      todoToggles++;
      if (q('#todo-details')) q('#todo-details').remove();
      else q('#todo-badge').insertAdjacentHTML('beforeend','<div id="todo-details"><div><div dir="auto">Check layout</div></div></div>');
    };
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const responseParts = () => page.evaluate(() => ['source','todo-source','task-source','todo-added']
    .map(id => q('#'+id).firstElementChild.dataset.pfResponsePart ?? null));
  assert.deepEqual(await responseParts(), ['start','middle','middle','middle'], 'task snapshots must not split the assistant bubble');
  for (const width of [1342,390]) {
    await page.setViewport({width,height:844});
    for (const mode of ['light','dark']) {
      await page.evaluate(mode => selectTheme(mode), mode);
      await wait(`document.documentElement.dataset.pfActive === '${mode}'`);
      const measure = () => page.evaluate(() => {
        const frames = ['source','todo-source','task-source','todo-added'].map(id => q('#'+id).firstElementChild)
          .concat([q('#answer0').parentElement,q('#answer1').parentElement]);
        const boxes = frames.map(e => e.getBoundingClientRect());
        return {parts:frames.map(e=>e.dataset.pfResponsePart), gaps:boxes.slice(1).map((b,i)=>b.top-boxes[i].bottom),
          aligned:boxes.every(b=>b.x===boxes[0].x&&b.width===boxes[0].width),
          avatars:frames.filter(e=>e.hasAttribute('data-pf-response-avatar')).length,
          overflow:document.documentElement.scrollWidth>innerWidth};
      });
      const expected = {parts:['start','middle','middle','middle','middle','end'], gaps:[0,0,0,0,0],aligned:true,avatars:1,overflow:false};
      assert.deepEqual(await measure(),expected);
      // Task activities share one-line previews independent of the localized status label.
      for (const label of ['已添加','已开始','已完成','Added task']) {
        await page.evaluate(label => {q('#todo-added [dir="auto"]').textContent=label;},label);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.deepEqual(await page.$eval('#todo-added', row => {
          const header=row.querySelector('button'),label=header.querySelector('[data-pf-tool-label]'),summary=header.querySelector('[data-pf-tool-summary]'),icon=header.querySelector('[data-pf-tool-icon]');
          const center=e=>{const r=e.getBoundingClientRect();return (r.top+r.bottom)/2;};
          return {labelWidth:label.getBoundingClientRect().width,summaryRow:getComputedStyle(summary).gridRowStart,
            centered:Math.abs(center(summary)-center(icon))<1&&Math.abs(center(summary)-center(header))<1};
        }),{labelWidth:1,summaryRow:'1',centered:true});
        const ax=await page.accessibility.snapshot({root:await page.$('#todo-added button')});
        assert.ok(ax.name.includes(label)&&ax.name.includes('Check layout'));
      }
      await page.focus('#todo-header');
      await page.keyboard.press('Enter');
      await wait('q("#todo-details")?.hasAttribute("data-pf-tool-details")');
      assert.deepEqual(await measure(),expected);
      assert.equal(await page.evaluate(() => nativeTodoHeader===q('#todo-header')&&document.activeElement===nativeTodoHeader),true);
      assert.equal(await page.$('#todo-details .pf-tool-copy'),null);
      if (process.env.SCREENSHOT_DIR) await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR, `todo-${mode}-${width}.png`)});
      await page.keyboard.press('Enter');
      await wait('!q("#todo-details")');
    }
  }
  await page.evaluate(() => {q('#todo-added [data-pf-tool-summary]').textContent='  ';});
  await wait('!q("#todo-added [data-pf-tool]").hasAttribute("data-pf-todo-preview")');
  assert.ok(await page.$eval('#todo-added [data-pf-tool-label]',e=>e.getBoundingClientRect().width>1));
  assert.ok(await page.$eval('#todo-source [data-pf-tool-label]',e=>e.getBoundingClientRect().width>1),'created-count-only cards retain their only heading');
  await page.evaluate(() => {q('#todo-added [data-pf-tool-summary]').textContent='Check layout';});
  await wait('q("#todo-added [data-pf-tool]").hasAttribute("data-pf-todo-preview")');
  // A recycled row or changed host shape must retire todo decorations.
  await page.evaluate(() => {q('#todo-source').dataset.historyRowId='compaction_1';dispatchEvent(new Event('resize'));});
  await wait('!q("#todo-badge").hasAttribute("data-pf-tool")');
  assert.equal((await responseParts())[1],null);
  await page.evaluate(() => {q('#todo-source').dataset.historyRowId='todo_1';q('#todo-header').append(document.createElement('div'));});
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal((await responseParts())[1],null);
  await page.evaluate(() => q('#todo-header').lastElementChild.remove());
  await wait('q("#todo-badge").dataset.pfTool === "todo"');
  // Keep footer, virtual-gap, permission and user boundaries even beside tasks.
  await page.evaluate(() => q('#todo-source').insertAdjacentHTML('beforeend','<div id="todo-footer"></div>'));
  await wait('q("#todo-source").firstElementChild.dataset.pfResponsePart === "end"');
  assert.equal((await responseParts())[2],'start');
  await page.evaluate(() => {q('#todo-footer').remove();q('#todo-source').dataset.index='1';q('#task-source').dataset.index='3';});
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal((await responseParts())[2],'start');
  await page.evaluate(() => {q('#todo-source').removeAttribute('data-index');q('#task-source').removeAttribute('data-index');});
  for (const testid of ['permission-request-question','question-form-card','user-message']) {
    await page.evaluate(testid => q('#todo-badge').insertAdjacentHTML('beforeend',`<div id="todo-boundary" data-testid="${testid}"></div>`),testid);
    await wait('!q("#todo-source").firstElementChild.hasAttribute("data-pf-response-part")');
    await page.evaluate(() => q('#todo-boundary').remove());
    await wait('q("#todo-source").firstElementChild.dataset.pfResponsePart === "middle"');
  }
  await page.evaluate(() => {q('#todo-source').remove();q('#task-source').remove();q('#todo-added').remove();});
  await wait('q("#answer0").parentElement.dataset.pfResponsePart === "middle"');
  await page.evaluate(() => { q('#file').click(); nativeHeader.click(); });
  await wait('!!q(".pf-tool-copy")');
  assert.deepEqual(await page.evaluate(() => ({same:nativeHeader === q('#header'), toggles:toggleCalls, files:fileCalls})), {same:true,toggles:1,files:1});
  await page.click('.pf-tool-copy');
  await wait('q(".pf-tool-copy").textContent === "已复制"');
  assert.equal(await page.evaluate(() => copied[0]), await page.evaluate(() => '$ ' + command + '\nresult: done'));
  await page.evaluate(() => { window.rejectCopy = true; q('.pf-tool-copy').click(); });
  await wait('q(".pf-tool-copy").textContent === "复制失败"');
  for (const width of [1342,390]) {
    await page.setViewport({width,height:844});
    for (const mode of ['light','dark']) {
      await page.evaluate(mode => selectTheme(mode), mode);
      await wait(`document.documentElement.dataset.pfActive === '${mode}'`);
      const geometry = await page.evaluate(() => ({
        overflow:document.documentElement.scrollWidth > innerWidth,
        header:q('#header').getBoundingClientRect().height, copy:q('.pf-tool-copy').getBoundingClientRect().height,
        contentScroll:q('.code-scroll').scrollWidth > q('.code-scroll').clientWidth,
        cardColor:getComputedStyle(q('#badge')).backgroundColor,
        iconCenter:(q('#icon').getBoundingClientRect().top + q('#icon').getBoundingClientRect().bottom)/2,
        textCenter:(q('#summary').getBoundingClientRect().top + q('#summary').getBoundingClientRect().bottom)/2,
        headerCenter:(q('#header').getBoundingClientRect().top + q('#header').getBoundingClientRect().bottom)/2,
        toolX:q('#badge').getBoundingClientRect().x, bodyX:q('#answer0').getBoundingClientRect().x,
      }));
      assert.equal(geometry.toolX,geometry.bodyX);
      assert.ok(Math.abs(geometry.iconCenter-geometry.textCenter) < 1);
      assert.ok(Math.abs(geometry.iconCenter-geometry.headerCenter) < 1);
      assert.equal(geometry.overflow,false,`${mode} ${width}: page overflow`);
      assert.ok(geometry.header >= (width < 760 ? 52 : 46));
      assert.ok(geometry.copy >= (width < 760 ? 44 : 36));
      assert.equal(geometry.contentScroll,true);
      assert.notEqual(geometry.cardColor,'rgba(0, 0, 0, 0)');
      assert.equal(await page.$eval('.pf-tool-copy', e => getComputedStyle(e).borderStyle), 'none');
      if (process.env.SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.SCREENSHOT_DIR, {recursive:true});
        await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR, `${mode}-${width}.png`)});
      }
    }
  }
  // File previews retain the action's accessible name and the complete native path.
  // Exercise node reuse as well as layout: a streamed/missing path must restore the title.
  for (const width of [1342,390]) {
    await page.setViewport({width,height:844});
    for (const mode of ['light','dark']) {
      await page.evaluate(mode => selectTheme(mode), mode);
      await wait(`document.documentElement.dataset.pfActive === '${mode}'`);
      for (const name of ['Read','Edit','Write']) {
        const filePath = 'src/' + 'long-directory/'.repeat(20) + 'app.tsx';
        await page.evaluate(({name,filePath}) => {
          q('#label').textContent = name; q('#summary').textContent = filePath;
        }, {name,filePath});
        const actionTitle = {Read:'读取文件',Edit:'编辑文件',Write:'写入文件'}[name];
        await wait(`q("#badge").hasAttribute("data-pf-file-preview") && !q("#badge").hasAttribute("data-pf-command-preview") && q("#label").dataset.pfToolTitle === '${actionTitle}'`);
        const geometry = await page.evaluate(() => {
          const center = e => { const r = e.getBoundingClientRect(); return (r.top+r.bottom)/2; };
          return {labelWidth:q('#label').getBoundingClientRect().width,
            path:q('#summary').textContent, pathHeight:q('#summary').getBoundingClientRect().height,
            icon:center(q('#icon')), text:center(q('#summary')), header:center(q('#header')),
            overflow:document.documentElement.scrollWidth > innerWidth,
            truncated:q('#summary').scrollWidth > q('#summary').clientWidth};
        });
        assert.equal(geometry.labelWidth,1);
        assert.equal(geometry.path,filePath);
        assert.equal(geometry.pathHeight,20);
        assert.ok(Math.abs(geometry.icon-geometry.text) < 1);
        assert.ok(Math.abs(geometry.icon-geometry.header) < 1);
        assert.equal(geometry.overflow,false);
        assert.equal(geometry.truncated,true);
        const header = await page.$('#header');
        const ax = await page.accessibility.snapshot({root:header});
        assert.ok(ax.name.includes(actionTitle) || ax.name.includes(name), `${name}: accessible name ${ax.name}`);
        assert.ok(ax.name.includes(filePath));
        await header.dispose();
        if (name === 'Edit' && process.env.SCREENSHOT_DIR) {
          await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR, `file-${mode}-${width}.png`)});
        }
      }
    }
  }
  await page.evaluate(() => { q('#file').click(); nativeHeader.click(); nativeHeader.click(); });
  await wait('!!q(".pf-tool-copy")');
  assert.deepEqual(await page.evaluate(() => ({same:nativeHeader === q('#header'), toggles:toggleCalls, files:fileCalls})), {same:true,toggles:3,files:2});
  await page.evaluate(() => { q('#summary').textContent = ''; });
  await wait('!q("#badge").hasAttribute("data-pf-file-preview")');
  assert.ok(await page.$eval('#label', e => e.getBoundingClientRect().width > 1));
  // Search and task notifications use their original summary and glyph on one line.
  for (const name of ['Search','Task notification']) {
    const summary = 'Inspect the result ' + 'long-summary-'.repeat(80);
    await page.evaluate(({name,summary}) => {q('#label').textContent=name;q('#summary').textContent=summary;}, {name,summary});
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    for (const width of [1342,390]) {
      await page.setViewport({width,height:844});
      for (const mode of ['light','dark']) {
        await page.evaluate(mode => selectTheme(mode), mode);
        await wait(`document.documentElement.dataset.pfActive === '${mode}'`);
        assert.deepEqual(await page.evaluate(() => {
          const center=e=>{const r=e.getBoundingClientRect();return (r.top+r.bottom)/2;};
          return {hidden:q('#label').getBoundingClientRect().width===1,row:getComputedStyle(q('#summary')).gridRowStart,
            centered:Math.abs(center(q('#summary'))-center(q('#icon')))<1&&Math.abs(center(q('#summary'))-center(q('#header')))<1,
            clipped:q('#summary').scrollWidth>q('#summary').clientWidth,overflow:document.documentElement.scrollWidth>innerWidth,
            glyph:getComputedStyle(q('#icon svg')).visibility};
        }),{hidden:true,row:'1',centered:true,clipped:true,overflow:false,glyph:'visible'});
        const ax=await page.accessibility.snapshot({root:await page.$('#header')});
        assert.ok((ax.name.includes(name)||ax.name.includes('搜索'))&&ax.name.includes(summary));
        if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR, `${name.toLowerCase().replaceAll(' ','-')}-${mode}-${width}.png`)});
      }
    }
    await page.evaluate(() => nativeHeader.click());
    await wait('!q(".details")');
    await page.evaluate(() => nativeHeader.click());
    await wait('!!q(".pf-tool-copy")');
    assert.equal(await page.evaluate(() => nativeHeader===q('#header')),true);
    await page.evaluate(() => {q('#summary').textContent='  ';});
    await wait('!q("#badge").hasAttribute("data-pf-summary-preview")');
    assert.ok(await page.$eval('#label',e=>e.getBoundingClientRect().width>1));
    await page.evaluate(({name,summary})=>{q('#label').textContent=name+' other';q('#summary').textContent=summary;},{name,summary});
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.$eval('#summary',e=>getComputedStyle(e).gridRowStart),'2');
  }
  await page.evaluate(() => {
    q('#label').textContent = 'Explore'; q('#summary').textContent = 'Inspect the navigation flow';
    q('#file').remove();
    window.nativeGlyph = q('#icon svg');
  });
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 850)));
  assert.equal(await page.$eval('#summary', e => getComputedStyle(e).gridRowStart), '1', 'Explore description must use a single row');
  for (const width of [1342,390]) {
    await page.setViewport({width,height:844});
    for (const mode of ['light','dark']) {
      await page.evaluate(mode => selectTheme(mode), mode);
      await wait(`document.documentElement.dataset.pfActive === '${mode}'`);
      assert.equal(await page.$eval('#label', e => e.getBoundingClientRect().width), 1);
      assert.equal(await page.$eval('#icon svg', e => getComputedStyle(e).visibility), 'hidden');
      assert.match(await page.$eval('#icon', e => getComputedStyle(e, '::before').maskImage), /data:image\/svg\+xml/);
      assert.ok(await page.evaluate(() => {
        const center = e => {const r=e.getBoundingClientRect();return (r.top+r.bottom)/2;};
        return Math.abs(center(q('#summary'))-center(q('#icon'))) < 1 && Math.abs(center(q('#header'))-center(q('#icon'))) < 1;
      }));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
      const ax = await page.accessibility.snapshot({root:await page.$('#header')});
      assert.ok(ax.name.includes('Explore') && ax.name.includes('Inspect the navigation flow'));
      if (process.env.SCREENSHOT_DIR) await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR, `explore-${mode}-${width}.png`)});
    }
  }
  await page.evaluate(() => nativeHeader.click());
  await wait('!q(".details")');
  await page.evaluate(() => nativeHeader.click());
  await wait('!!q(".pf-tool-copy")');
  await page.evaluate(() => q('#labels').insertAdjacentHTML('beforeend','<div id="explore-shimmer"><div dir="auto" class="shimmer-text">Explore</div></div>'));
  await wait('q("#badge").dataset.pfToolState === "running"');
  await page.evaluate(() => {q('#explore-shimmer').remove(); nativeGlyph.setAttribute('stroke','#ee4455');});
  await wait('q("#badge").dataset.pfToolState === "failed"');
  assert.equal(await page.$eval('#icon', e => getComputedStyle(e, '::before').backgroundColor), 'rgb(238, 68, 85)');
  assert.equal(await page.evaluate(() => nativeGlyph === q('#icon svg')),true);
  await page.evaluate(() => {q('#summary').textContent = '';});
  await wait('!q("#badge").hasAttribute("data-pf-explore-preview")');
  assert.ok(await page.$eval('#label', e => e.getBoundingClientRect().width > 1));
  await page.evaluate(() => {q('#label').textContent='Explore more'; q('#summary').textContent='Other agent'; nativeGlyph.setAttribute('stroke','#888');});
  await wait('!q("#badge").hasAttribute("data-pf-explore-tool")');
  assert.equal(await page.$eval('#icon svg', e => getComputedStyle(e).visibility), 'visible');
  assert.equal(await page.$eval('#summary', e => getComputedStyle(e).gridRowStart), '2');
  await page.evaluate(() => { q('#label').textContent = 'Thinking'; });
  await wait('q("#badge").dataset.pfTool === "thinking" && q(".details").hasAttribute("data-pf-thinking-details")');
  await page.evaluate(() => { q('#label').textContent = 'Shell'; });
  await wait('!q(".details").hasAttribute("data-pf-thinking-details")');
  await page.evaluate(() => q('#labels').insertAdjacentHTML('beforeend','<div id="shimmer"><div dir="auto" class="shimmer-text">Shell</div></div>'));
  await wait('q("#badge").dataset.pfToolState === "running"');
  await page.evaluate(() => { q('#shimmer').remove(); q('#icon svg').setAttribute('stroke','#ee4455'); });
  await wait('q("#badge").dataset.pfToolState === "failed"');
  await page.evaluate(() => { q('#icon svg').setAttribute('stroke','#888'); q('#icon path').setAttribute('d','m9 18 6-6-6-6'); });
  await page.evaluate(() => dispatchEvent(new Event('resize')));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await wait('q("#badge").dataset.pfToolState === "failed"');
  await page.evaluate(() => { q('#source').dataset.historyRowId = 'tool:2'; dispatchEvent(new Event('resize')); });
  await wait('q("#badge").dataset.pfToolState === "idle"');
  // Reuse as an aggregate group must retire its copy control even when details stay mounted.
  await page.evaluate(() => { q('#badge').dataset.testid='tool-call-group'; dispatchEvent(new Event('resize')); });
  await wait('!q(".pf-tool-copy")');
  await page.evaluate(() => { q('#badge').dataset.testid='tool-call-badge'; dispatchEvent(new Event('resize')); });
  await wait('!!q(".pf-tool-copy")');
  await page.evaluate(() => nativeHeader.click());
  await wait('!q(".pf-tool-copy") && q("#header").dataset.pfToolExpanded === "false"');
  await page.evaluate(() => nativeHeader.click());
  await wait('!!q(".pf-tool-copy")');
  await page.evaluate(() => selectTheme('dark','other-plugin:dark'));
  await wait('!document.documentElement.hasAttribute("data-pf-active")');
  assert.equal(await page.evaluate(() => registrations.size),0);
  assert.equal(await page.evaluate(() => document.querySelectorAll('[data-pf-owned]').length),0);
  await page.evaluate(() => selectTheme('dark'));
  await wait('!!q(".pf-tool-copy")');
  await page.evaluate(() => dispose1());
  assert.equal(await page.evaluate(() => registrations.size),2);
  assert.equal(await page.evaluate(() => document.querySelectorAll('[data-pf-owned="style"]').length),1);
  await page.evaluate(() => { dispose2(); dispose2(); });
  assert.equal(await page.evaluate(() => registrations.size),0);
  assert.equal(await page.evaluate(() => document.querySelectorAll('[data-pf-owned]').length),0);
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('*')].some(el => el.getAttributeNames().some(a => a.startsWith('data-pf-')))),false);
  assert.equal(await page.evaluate(() => !!window[Symbol.for('paseo-feishu-ui.desktop.v1')]),false);
  assert.equal(await page.evaluate(() => nativeHeader === q('#header') && !!q('.details')),true);
  assert.deepEqual(errors,[]);
});
