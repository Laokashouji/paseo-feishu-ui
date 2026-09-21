import { Platform } from 'react-native';
import { copyText } from '@getpaseo/plugin/client/react-native';
import { registerThinking } from './thinking';
import type { PluginClientContext, PluginClientContribution } from '@getpaseo/plugin/client';

// Browser-only structural types stay local; native components cannot reference the DOM.
interface ParentNode {
  querySelector<T extends Element = Element>(selector: string): T | null;
  querySelectorAll<T extends Element = Element>(selector: string): T[];
}
interface Element extends ParentNode {
  children: HTMLElement[];
  parentElement: HTMLElement | null;
  firstElementChild: HTMLElement | null;
  nextElementSibling: HTMLElement | null;
  previousElementSibling: HTMLElement | null;
  tagName: string;
  textContent: string | null;
  isConnected: boolean;
  dataset: Record<string, string | undefined>;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  hasAttribute(name: string): boolean;
  getBoundingClientRect(): { width: number; height: number };
  contains(element: Element): boolean;
  matches(selector: string): boolean;
  closest(selector: string): Element | null;
  remove(): void;
}
interface HTMLElement extends Element {
  className: string;
  classList: { contains(name: string): boolean };
  innerHTML: string;
  innerText: string;
  type: string;
  title: string;
  disabled: boolean;
  append(...elements: HTMLElement[]): void;
  click(): void;
  addEventListener(name: string, callback: () => void): void;
}
type HTMLButtonElement = HTMLElement;
declare const HTMLElement: { new(): HTMLElement };
interface Window {
  innerWidth: number;
  addEventListener(name: string, callback: () => void): void;
  removeEventListener(name: string, callback: () => void): void;
  setInterval(callback: () => void, delay: number): ReturnType<typeof setInterval>;
}
declare const window: Window;
declare const document: ParentNode & {
  body: HTMLElement;
  head: HTMLElement;
  documentElement: HTMLElement;
  createElement(tag: string): HTMLElement;
};
declare const localStorage: { getItem(key: string): string | null };
declare const CSS: { escape(value: string): string };
declare function getComputedStyle(element: Element): {
  flexDirection: string; display: string; position: string; transform: string;
  animationName: string;
  getPropertyValue(name: string): string;
};
declare class MutationObserver {
  constructor(callback: () => void);
  observe(element: Element, options: {childList?: boolean; subtree?: boolean; attributes?: boolean; attributeFilter?: string[]}): void;
  disconnect(): void;
}

const THEME_IDS = {
  light: 'paseo-feishu-ui/theme/feishu-light',
  dark: 'paseo-feishu-ui/theme/feishu-dark',
} as const;
type SkinMode = keyof typeof THEME_IDS;
const REGISTRY = Symbol.for('paseo-feishu-ui.desktop.v1');
/** Paseo 0.8 renders reasoning through the same native badge as tool calls. */
const THINKING_LABEL = 'Thinking';
const TOOL_LABELS: Record<string, string> = {
  Thinking: '思考', Shell: '运行命令', Terminal: '终端', Read: '读取文件',
  Write: '写入文件', Edit: '编辑文件', Search: '搜索', Glob: '查找文件',
  Grep: '搜索内容', Fetch: '读取网页', WebSearch: '搜索网页',
};
type Shared = { owners: Map<symbol, PluginClientContext>; refresh: () => void; release: (owner: symbol) => void; dispose: () => void };
type SkinWindow = Window & { [REGISTRY]?: Shared };
const selector = (id: string) => `[data-testid="${CSS.escape(id)}"]`;
const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };

/** This adapter owns only markers, CSS and auxiliary navigation. Native nodes never move. */
export const installFeishuSkin: PluginClientContribution = (plugin) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  const host = window as SkinWindow;
  const owner = Symbol();
  const shared = host[REGISTRY] ?? (host[REGISTRY] = createAdapter());
  shared.owners.set(owner, plugin);
  shared.refresh();
  return () => {
    shared.release(owner);
    if (!shared.owners.size) {
      shared.dispose();
      if (host[REGISTRY] === shared) delete host[REGISTRY];
    }
  };
};

function createAdapter(): Shared {
  const owners = new Map<symbol, PluginClientContext>();
  const thinkingRegistrations = new Map<symbol, () => void>();
  const marks = new Map<Element, Map<string, string | null>>();
  const desired = new Map<Element, Set<string>>();
  const copyButtons = new Map<HTMLElement, HTMLButtonElement>();
  const style = document.createElement('style');
  style.dataset.pfOwned = 'style';
  style.textContent = skinCSS;
  let rail: HTMLElement | null = null;
  let listHead: HTMLElement | null = null;
  let sidebar: HTMLElement | null = null;
  let frame = 0;
  let disposed = false;
  let filter = 'all';
  const groups = [ ['all', '全部工作区', 'inbox'], ['attention', '待查看', 'bell'], ['running', '进行中', 'play'], ['done', '已完成', 'check'] ];

  function mark(el: Element | null | undefined, name: string, value = '') {
    if (!el) return;
    name = `data-pf-${name}`;
    let names = desired.get(el);
    if (!names) desired.set(el, names = new Set());
    names.add(name);
    let attrs = marks.get(el);
    if (!attrs) marks.set(el, attrs = new Map());
    if (!attrs.has(name)) attrs.set(name, el.getAttribute(name));
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  }
  function restore(el: Element, attrs: Map<string, string | null>) {
    for (const [name, value] of attrs) value === null ? el.removeAttribute(name) : el.setAttribute(name, value);
  }
  function retireMarks() {
    // React may reuse a connected node for a different role; connectivity alone is insufficient.
    for (const [el, attrs] of marks) {
      for (const [name, value] of attrs) {
        if (el.isConnected && desired.get(el)?.has(name)) continue;
        value === null ? el.removeAttribute(name) : el.setAttribute(name, value);
        attrs.delete(name);
      }
      if (!attrs.size) marks.delete(el);
    }
    for (const [details, button] of copyButtons) {
      if (details.isConnected && button.parentElement === details && desired.get(details)?.has('data-pf-tool-copyable')) continue;
      button.remove(); copyButtons.delete(details);
    }
  }
  function clear() {
    rail?.remove(); listHead?.remove(); rail = listHead = sidebar = null;
    style.remove();
    for (const [el, attrs] of marks) restore(el, attrs);
    marks.clear(); desired.clear();
    for (const button of copyButtons.values()) button.remove();
    copyButtons.clear();
  }
  function selectedTheme(): SkinMode | null {
    try {
      const s = JSON.parse(localStorage.getItem('@paseo:app-settings') || '{}');
      if (s.theme !== 'plugin') return null;
      const mode = (Object.keys(THEME_IDS) as SkinMode[]).find(key => THEME_IDS[key] === s.pluginThemeId);
      if (!mode) return null;
      const classes = document.documentElement.classList;
      const expected = mode === 'light' ? 'pluginLight' : 'pluginDark';
      const opposite = mode === 'light' ? 'pluginDark' : 'pluginLight';
      return classes.contains(expected) && !classes.contains(opposite) ? mode : null;
    } catch { return null; }
  }
  function q(id: string, scope: ParentNode = document) { return scope.querySelector<HTMLElement>(selector(id)); }
  function nativeAction(id: string) { q(id, sidebar ?? document)?.click(); }
  function button(label: string, icon: string, action: () => void) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pf-button';
    b.innerHTML = svg(icon);
    const span = document.createElement('span'); span.textContent = label; b.append(span);
    b.addEventListener('click', action);
    return b;
  }
  function createRails(root: HTMLElement) {
    rail = document.createElement('nav');
    rail.dataset.pfOwned = 'groups'; rail.className = 'pf-groups'; rail.setAttribute('aria-label', '工作区分组');
    const title = document.createElement('div'); title.className = 'pf-group-heading'; title.textContent = '分组'; rail.append(title);
    for (const [id, label, icon] of groups) {
      const b = button(label, icon, () => {
        filter = id;
        // A deliberate group choice may expand that same native group; never infer ARIA state.
        if (id !== 'all' && !q(`sidebar-status-group-rows-${id}`, root)) q(`sidebar-status-group-${id}`, root)?.click();
        reconcile();
      });
      b.dataset.pfGroup = id; rail.append(b);
    }
    const label = document.createElement('div'); label.className = 'pf-group-label'; label.textContent = '工作台'; rail.append(label);
    rail.append(button('搜索工作区', 'search', () => nativeAction('sidebar-command-center-search')));
    rail.append(button('显示偏好', 'sliders', () => nativeAction('sidebar-display-preferences-menu')));
    rail.append(button('添加项目', 'folder', () => nativeAction('sidebar-add-project')));
    const foot = document.createElement('div'); foot.className = 'pf-rail-foot'; foot.textContent = 'Paseo'; rail.append(foot);
    root.append(rail);
    listHead = document.createElement('div'); listHead.dataset.pfOwned = 'list-heading'; listHead.className = 'pf-list-heading';
    const line = document.createElement('div'); line.className = 'pf-list-title'; line.textContent = '工作区';
    const preferences = button('显示偏好', 'sliders', () => nativeAction('sidebar-display-preferences-menu'));
    preferences.className = 'pf-icon-button'; preferences.title = '显示偏好'; line.append(preferences);
    const search = button('搜索（⌘ K）', 'search', () => nativeAction('sidebar-command-center-search'));
    search.className = 'pf-search'; listHead.append(line, search); root.append(listHead);
  }
  function findSidebar(): HTMLElement | null {
    const start = [...document.querySelectorAll<HTMLElement>(selector('sidebar-global-new-workspace'))].find(visible);
    for (let e = start?.parentElement; e && e !== document.body; e = e.parentElement) {
      if (q('sidebar-settings', e) && q('left-sidebar-resize-handle', e) &&
          (q('sidebar-status-list-scroll', e) || q('sidebar-project-workspace-list-scroll', e))) {
        // Stop before an app-wide common ancestor: sidebar must have one width controller and a center sibling.
        if (sidebarFrame(e)) return e;
        return null;
      }
    }
    return null;
  }
  function sidebarFrame(root: HTMLElement) {
    const width = root.parentElement;
    if (!width || width.children.length !== 1) return null;
    let branch = width;
    // 0.8 adds a single-child display:contents host around the sidebar width controller.
    for (let depth = 0; depth < 3 && branch.parentElement; depth++) {
      const parent = branch.parentElement;
      if (getComputedStyle(parent).display !== 'contents') break;
      if (parent.children.length !== 1) return null;
      branch = parent;
    }
    const row = branch.parentElement;
    if (!row || getComputedStyle(row).display !== 'flex' ||
        getComputedStyle(row).flexDirection !== 'row' || row.children.length !== 2) return null;
    return { row, branch };
  }
  function childContaining(root: HTMLElement, target: HTMLElement | null) {
    return target ? [...root.children].find(c => c.contains(target)) as HTMLElement | undefined : undefined;
  }
  function flowColumn(el: Element | null): el is HTMLElement {
    if (!(el instanceof HTMLElement)) return false;
    const css = getComputedStyle(el);
    // These properties are not changed by our frame styling; width/padding guards would reject it.
    return css.display === 'flex' && css.flexDirection === 'column' &&
      css.position !== 'absolute' && css.position !== 'fixed' && css.transform === 'none';
  }
  function markCenter(root: HTMLElement) {
    const frame = sidebarFrame(root);
    if (!frame) return;
    const { row, branch } = frame;
    const siblings = [...row.children].filter(el => el !== branch);
    if (siblings.length !== 1 || !(siblings[0] instanceof HTMLElement)) return;
    const center = siblings[0];
    if (!q('workspace-pane-main', center) && !q('plugin-surface-close', center)) return;
    mark(row, 'shell'); mark(center, 'center');
  }
  function markTranscript(transcript: HTMLElement) {
    const content = transcript.firstElementChild;
    if (transcript.children.length !== 1 || !flowColumn(content) || content.hasAttribute('data-history-row-id')) return;
    mark(content, 'transcript-content');
    const rows = [...content.querySelectorAll<HTMLElement>('[data-history-row-id]')]
      .filter(row => row.closest(selector('agent-chat-scroll')) === transcript);
    for (const [index, row] of rows.entries()) {
      const inner = row.firstElementChild;
      // Completed native rows may append a separate footer sibling. Style only content frame 0.
      if (!flowColumn(inner) || inner.hasAttribute('data-history-row-id')) continue;
      mark(inner, 'message-frame');
      const assistant = q('assistant-message', inner);
      if (!assistant || assistant.parentElement !== inner) continue;
      // Markdown blocks are native timeline rows, not separate messages. Preserve the entire
      // opaque prefix, including :segment: suffixes produced by interleaved tools/streaming.
      const part = /^(.*):block:(\d+)$/.exec(row.dataset.historyRowId ?? '');
      const next = rows[index + 1];
      const nextPart = /^(.*):block:(\d+)$/.exec(next?.dataset.historyRowId ?? '');
      const adjacentVirtual = !row.hasAttribute('data-index') || !next?.hasAttribute('data-index') ||
        Number(next.dataset.index) === Number(row.dataset.index) + 1;
      const joinsNext = !!part && !!nextPart && part[1] === nextPart[1] &&
        Number(nextPart[2]) === Number(part[2]) + 1 && adjacentVirtual &&
        flowColumn(next.firstElementChild) &&
        q('assistant-message', next)?.parentElement === next.firstElementChild;
      // block 0 is the only author boundary, even when earlier virtual blocks are unmounted.
      const starts = !part || Number(part[2]) === 0;
      mark(assistant, 'message-part', starts ? (joinsNext ? 'start' : 'single') : (joinsNext ? 'middle' : 'end'));
      if (joinsNext) mark(inner, 'join-next');
    }
    for (const message of content.querySelectorAll<HTMLElement>(selector('user-message'))) {
      if (message.closest(selector('agent-chat-scroll')) !== transcript || message.children.length !== 1) continue;
      const trailing = q('user-message-trailing-row', message);
      const bubble = trailing?.previousElementSibling;
      if (trailing?.parentElement === message.firstElementChild && bubble instanceof HTMLElement && bubble.tagName === 'DIV') {
        mark(bubble, 'user-bubble');
      }
    }
    markTools(content);
    markResponseFrames(rows);
  }
  /** Consecutive supported native rows share visual edges. Never move rows or bridge a
      virtual gap, user/permission/system row, or the host's completed-turn footer. */
  function markResponseFrames(rows: HTMLElement[]) {
    const eligible = rows.map(row => {
      const frame = row.firstElementChild;
      if (!flowColumn(frame)) return null;
      // Use this pass's tool recognition: a recycled row may still carry an old marker
      // until retireMarks runs at the end of reconciliation.
      const body = frame.querySelector('[data-testid="assistant-message"],[data-testid="feishu-thinking-card"]') ??
        [...frame.querySelectorAll('[data-pf-tool]')].find(tool => desired.get(tool)?.has('data-pf-tool'));
      if (!body || body.closest('[data-history-row-id]') !== row ||
          frame.querySelector('[data-testid="user-message"],[data-testid^="permission-"],[data-testid="question-form-card"]')) return null;
      return frame;
    });
    const joined = (index: number) => {
      const row = rows[index], next = rows[index + 1];
      return !!eligible[index] && !!eligible[index + 1] && row.children.length === 1 &&
        (!row.hasAttribute('data-index') || !next.hasAttribute('data-index') || Number(next.dataset.index) === Number(row.dataset.index) + 1);
    };
    for (const [index, frame] of eligible.entries()) {
      if (!frame) continue;
      const before = index > 0 && joined(index - 1), after = joined(index);
      mark(frame, 'response-part', before ? (after ? 'middle' : 'end') : (after ? 'start' : 'single'));
      const row = rows[index];
      const block = /:block:(\d+)$/.exec(row.dataset.historyRowId ?? '');
      // A truncated virtual run must not create an author at its first mounted continuation.
      const knownStart = index > 0 || !row.hasAttribute('data-index') || Number(row.dataset.index) === 0;
      if (!before && knownStart && (!block || Number(block[1]) === 0)) mark(frame, 'response-avatar');
    }
  }
  /** Decorate native badges, never replace timeline items or their detail/file/permission handlers.
      The 0.8 header is [icon, labelRow], with the original label and optional summary as own Text
      children. Fail closed if that structure changes; generated RNW classes are not selectors. */
  function markTools(scope: HTMLElement) {
    for (const text of scope.querySelectorAll<HTMLElement>(selector('inline-thinking-text'))) {
      if (text.textContent?.trim()) mark(text, 'thinking-text');
    }
    const danger = getComputedStyle(document.documentElement).getPropertyValue('--colors-destructive').trim().toLowerCase();
    // TodoListCard uses the same ExpandableBadge without a testID in Paseo 0.8.
    // Validate its direct row/frame/card path, then apply the shared header guards below.
    // Do not infer a task from translated labels or treat arbitrary timeline rows as tools.
    const todoBadges = new Set<HTMLElement>();
    for (const source of scope.querySelectorAll<HTMLElement>('[data-history-row-id^="todo_"]')) {
      const frame = source.firstElementChild;
      const badge = frame?.firstElementChild ?? null;
      if (flowColumn(frame) && frame.children.length === 1 && flowColumn(badge) &&
          badge.closest('[data-history-row-id]') === source && !badge.hasAttribute('data-testid')) {
        todoBadges.add(badge);
      }
    }
    const badges = new Set([...scope.querySelectorAll<HTMLElement>(`${selector('tool-call-badge')},${selector('tool-call-group')}`), ...todoBadges]);
    for (const badge of badges) {
      // Detail sheets may contain their own native badges. Only process the current transcript.
      if (badge.closest(selector('agent-chat-scroll')) !== scope.closest(selector('agent-chat-scroll'))) continue;
      const header = badge.firstElementChild;
      if (!(header instanceof HTMLElement) || header.children.length !== 1) continue;
      const row = header.firstElementChild;
      if (row?.children.length !== 2) continue;
      const [icon, labels] = row.children;
      const label = labels.firstElementChild;
      if (!label?.matches('[dir="auto"]')) continue;
      const name = label.textContent?.trim() ?? '';
      if (!name) continue;
      const interactive = header.tagName === 'BUTTON' || header.getAttribute('role') === 'button';
      const summary = label.nextElementSibling;
      const kind = todoBadges.has(badge) ? 'todo' : name === THINKING_LABEL ? 'thinking' : badge.matches(selector('tool-call-group')) ? 'group' : 'tool';
      mark(badge, 'tool', kind);
      mark(header, 'tool-header', interactive && !header.disabled ? 'interactive' : 'static');
      mark(row, 'tool-row'); mark(icon, 'tool-icon'); mark(labels, 'tool-labels');
      mark(label, 'tool-label');
      const explore = kind === 'tool' && name === 'Explore';
      if (explore) mark(badge, 'explore-tool');
      if (kind !== 'group' && Object.hasOwn(TOOL_LABELS, name)) mark(label, 'tool-title', TOOL_LABELS[name]);
      if (summary?.matches('[dir="auto"]')) {
        mark(summary, 'tool-summary');
        if (name === 'Shell' || name === 'Terminal') mark(badge, 'command-preview');
        if (kind === 'tool' && ['Read', 'Edit', 'Write'].includes(name) && summary.textContent?.trim()) {
          mark(badge, 'file-preview');
        }
        if (explore && summary.textContent?.trim()) mark(badge, 'explore-preview');
        if (kind === 'todo' && summary.textContent?.trim()) mark(badge, 'todo-preview');
        if (kind === 'tool' && ['Search', 'Task notification'].includes(name) && summary.textContent?.trim()) {
          mark(badge, 'summary-preview');
        }
      }
      // Loading has a native duplicate-text shimmer overlay. Keep the React-owned overlay for
      // state detection but replace its visual shimmer with one restrained status indicator.
      let running = false;
      for (const child of labels.children) {
        if (child.matches('[dir="auto"]') || child.getAttribute('role') === 'button') continue;
        const text = child.firstElementChild;
        if (text?.matches('[dir="auto"]') && getComputedStyle(text).animationName.includes('paseo-toolcall-shimmer')) {
          mark(child, 'tool-shimmer'); running = true;
        }
      }
      // A failed badge uses a native destructive-colored icon. On hover the host swaps it for
      // a chevron; retain an observed error only for the same source row while that chevron shows.
      const source = badge.closest('[data-history-row-id]')?.getAttribute('data-history-row-id') ?? '';
      const glyph = icon.querySelector('svg');
      const stroke = glyph?.getAttribute('stroke')?.trim().toLowerCase();
      const chevron = !!glyph?.querySelector('path[d="m9 18 6-6-6-6"]');
      const failed = !!danger && (stroke === danger || (chevron && !!source && badge.dataset.pfToolSource === source && badge.dataset.pfToolState === 'failed'));
      const state = failed ? 'failed' : running ? 'running' : 'idle';
      mark(badge, 'tool-source', source); mark(badge, 'tool-state', state);
      // The native DOM does not distinguish completed from canceled. Never label either as
      // successful: retain a neutral details hint and leave exact results in the native detail.
      mark(header, 'tool-status', failed ? '失败' : running ? '执行中' : interactive ? '详情' : '');
      const details = badge.children[1];
      const expanded = details instanceof HTMLElement;
      mark(header, 'tool-expanded', String(expanded));
      if (expanded) {
        mark(details, 'tool-details');
        if (kind === 'thinking') mark(details, 'thinking-details');
        if (kind !== 'group' && kind !== 'todo') {
          mark(details, 'tool-copyable');
          let copy = copyButtons.get(details);
          if (!copy?.isConnected) {
            copy = document.createElement('button');
            copy.type = 'button'; copy.className = 'pf-tool-copy'; copy.dataset.pfOwned = 'tool-copy';
            copy.textContent = '复制详情';
            copy.title = '复制完整思考内容，或命令与输出';
            const button = copy;
            button.addEventListener('click', async () => {
              const text = [...details.children].filter(child => !child.hasAttribute('data-pf-owned'))
                .map(child => child.innerText).join('\n');
              if (!text.trim()) { button.textContent = '暂无内容'; return; }
              try {
                await copyText(text);
                if (button.isConnected) button.textContent = '已复制';
              } catch {
                if (button.isConnected) button.textContent = '复制失败';
              }
            });
            details.append(button); copyButtons.set(details, button);
          }
        }
      }
      const openFile = q('tool-call-open-file', labels);
      if (openFile) mark(openFile, 'tool-open-file');
    }
  }
  function reconcile() {
    if (disposed) return;
    const mode = selectedTheme();
    for (const [owner, remove] of thinkingRegistrations) {
      if (mode && owners.has(owner)) continue;
      remove(); thinkingRegistrations.delete(owner);
    }
    if (mode) for (const [owner, plugin] of owners) {
      if (!thinkingRegistrations.has(owner)) thinkingRegistrations.set(owner, registerThinking(plugin));
    }
    if (!mode) { if (style.isConnected || marks.size) clear(); return; }
    desired.clear();
    const root = findSidebar();
    if (sidebar && sidebar !== root) clear();
    if (!style.isConnected) document.head.append(style);
    mark(document.documentElement, 'active', mode);
    if (root) {
      sidebar = root;
      mark(root, 'sidebar'); mark(root.parentElement, 'width');
      markCenter(root);
      mark(childContaining(root, q('sidebar-global-new-workspace', root)), 'nav');
      const list = q('sidebar-status-list-scroll', root) ?? q('sidebar-project-workspace-list-scroll', root);
      const listRegion = childContaining(root, list);
      const footerRegion = childContaining(root, q('sidebar-settings', root));
      mark(listRegion, 'list');
      mark(footerRegion, 'footer');
      // Native setup/update alerts occupy a dedicated sibling between list and footer.
      // Keep the slot in the same React-owned tree and let CSS reserve its intrinsic height.
      const calloutSlot = listRegion?.nextElementSibling;
      if (calloutSlot instanceof HTMLElement && calloutSlot.nextElementSibling === footerRegion &&
          [...calloutSlot.children].some(child => child.getAttribute('role') === 'alert')) {
        mark(calloutSlot, 'callout-slot');
        mark(root, 'has-callout');
      }
      if (!rail?.isConnected) createRails(root);
      const statusMode = !!q('sidebar-status-list-scroll', root);
      if (!statusMode || window.innerWidth < 1180) filter = 'all';
      mark(root, 'filter', filter);
      for (const b of rail!.querySelectorAll<HTMLButtonElement>('[data-pf-group]')) {
        const id = b.dataset.pfGroup!;
        b.disabled = id !== 'all' && (!statusMode || !q(`sidebar-status-group-${id}`, root));
        b.setAttribute('aria-pressed', String(filter === id));
      }
      for (const [id] of groups.slice(1)) {
        const header = q(`sidebar-status-group-${id}`, root);
        const section = header?.parentElement?.parentElement;
        if (section && section.parentElement === list?.firstElementChild) mark(section, 'group-section', id);
      }
      for (const row of root.querySelectorAll<HTMLElement>('[data-testid^="sidebar-workspace-row-"]')) {
        const icon = row.querySelector<HTMLElement>('[data-testid^="sidebar-row-project-icon-"]');
        if (icon?.nextElementSibling) mark(icon.nextElementSibling, 'row-copy');
      }
    }
    // Cached/split workspace panes are scoped individually; never mutate the editor or virtual rows.
    for (const title of document.querySelectorAll<HTMLElement>(selector('workspace-header-title'))) {
      let e = title.parentElement;
      for (let i = 0; e && i < 5; i++, e = e.parentElement) {
        const r = e.getBoundingClientRect();
        if (r.height >= 35 && r.height <= 48 && e.querySelectorAll('button').length >= 2) { mark(e, 'header'); break; }
      }
    }
    for (const transcript of document.querySelectorAll<HTMLElement>(selector('agent-chat-scroll'))) markTranscript(transcript);
    for (const composer of document.querySelectorAll<HTMLElement>(selector('message-input-root'))) {
      const explicit = [...composer.querySelectorAll<HTMLElement>('[data-composer-input]')];
      // A selector union follows DOM order and can select a hidden measurement textarea first.
      const input = explicit.find(visible) ?? (!visible(composer) ? explicit[0] : undefined) ??
        [...composer.querySelectorAll<HTMLElement>('textarea,[contenteditable="true"]')].find(visible);
      const attach = q('message-input-attach-button', composer);
      const box = childContaining(composer, input ?? null);
      if (box && attach && box.contains(attach)) mark(box, 'composer-box');
      const inner = composer.parentElement;
      if (inner?.children.length === 1 && flowColumn(inner)) {
        mark(inner, 'composer-inner');
        const composerFrame = inner.parentElement;
        if (composerFrame?.children.length === 1 && flowColumn(composerFrame)) {
          mark(composerFrame, 'composer-inner');
          const outer = composerFrame.parentElement;
          if (outer?.children.length === 1 && flowColumn(outer) &&
              !outer.matches(selector('workspace-pane-main')) && !q('agent-chat-scroll', outer)) {
            mark(outer, 'composer-outer');
          }
        }
      }
    }
    retireMarks();
  }
  function schedule() { if (!frame && !disposed) frame = requestAnimationFrame(() => { frame = 0; reconcile(); }); }
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  const themeObserver = new MutationObserver(schedule);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', schedule);
  window.addEventListener('storage', schedule);
  // Same-document settings writes do not emit storage; this also catches native list mode changes.
  const interval = window.setInterval(schedule, 750);
  schedule();
  return { owners, refresh: schedule, release(owner) {
    thinkingRegistrations.get(owner)?.(); thinkingRegistrations.delete(owner); owners.delete(owner);
  }, dispose() {
    for (const remove of thinkingRegistrations.values()) remove();
    thinkingRegistrations.clear(); owners.clear();
    disposed = true; observer.disconnect(); themeObserver.disconnect();
    cancelAnimationFrame(frame); clearInterval(interval);
    window.removeEventListener('resize', schedule); window.removeEventListener('storage', schedule);
    clear();
  } };
}

function svg(name: string) {
  const paths: Record<string, string> = {
    inbox: '<path d="M3 4h18v16H3zM3 13h5l2 3h4l2-3h5"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    sliders: '<path d="M4 7h6m4 0h6M4 17h10m4 0h2"/><circle cx="12" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
    folder: '<path d="M3 6h6l2-2h4l2 2h4v14H3z"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.inbox}</svg>`;
}

/** All native overrides are scoped to the exact active plugin theme and disposable markers. */
const skinCSS = `
html[data-pf-active] {
 --pf-nav:180px; --pf-groups:160px; --pf-list:300px; --pf-sidebar:646px; --pf-content:1000px;
 --pf-nav-start:#e7ebf7; --pf-nav-end:#dce7ee; --pf-gutter:#cbd8e0; --pf-group-bg:#f1f3f5;
 --pf-canvas:#fafafa; --pf-paper:#fdfdfd; --pf-raised:#fdfdfd; --pf-selected:#e5ebf9;
 --pf-group-selected:#dee6f5; --pf-hover:#edf0f7; --pf-control:#eff0f3;
 --pf-text:#1f2329; --pf-secondary:#646a73; --pf-muted:#8f959e; --pf-border:#dee0e3; --pf-accent:#3370ff;
 --colors-surface-sidebar-selected:var(--pf-selected)!important; --colors-surface-sidebar-hover:var(--pf-hover)!important;
}
html[data-pf-active="dark"] {
 --pf-nav-start:#322d3b; --pf-nav-end:#2e3438; --pf-gutter:#30383c; --pf-group-bg:#1e1f22;
 --pf-canvas:#181818; --pf-paper:#1d1d1d; --pf-raised:#2c2c2c; --pf-selected:#262f44;
 --pf-group-selected:#29344c; --pf-hover:#272a30; --pf-control:#202126;
 --pf-text:#d1d1d1; --pf-secondary:#9b9b9b; --pf-muted:#737373; --pf-border:#3b3b3b; --pf-accent:#4c88ff;
}
html[data-pf-active] [data-testid="workspace-header-title"] { font-size:16px!important; font-weight:600!important; }
html[data-pf-active] [data-testid="workspace-header-subtitle"] { font-size:12px!important; }
html[data-pf-active] [data-testid="workspace-tabs-row"] { background:var(--pf-canvas)!important; border-color:var(--pf-border)!important; }
html[data-pf-active] [data-testid^="workspace-tab-"][aria-selected] { border-radius:0!important; border-bottom:2px solid transparent; background:transparent!important; }
html[data-pf-active] [data-testid^="workspace-tab-"][aria-selected="true"] { border-bottom-color:var(--pf-accent)!important; }
html[data-pf-active] [data-pf-composer-box] { border:1px solid var(--pf-border)!important; border-radius:8px!important; background:var(--pf-paper)!important; box-shadow:none!important; }
html[data-pf-active] [data-pf-composer-box]:focus-within { border-color:var(--pf-accent)!important; box-shadow:0 0 0 2px color-mix(in srgb,var(--pf-accent) 15%,transparent)!important; }
html[data-pf-active] [data-composer-input] { font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif!important; font-size:14px!important; line-height:22px!important; }
html[data-pf-active] [data-composer-input]::placeholder { color:var(--pf-muted)!important; opacity:1!important; }
html[data-pf-active] [data-pf-user-bubble] { background:var(--pf-selected)!important; border-radius:8px 3px 8px 8px!important; }
html[data-pf-active] [data-testid="user-message-timestamp"] { color:var(--pf-muted)!important; font-size:11px!important; }
html[data-pf-active] .pf-groups, html[data-pf-active] .pf-list-heading { display:none; }
@media(min-width:760px) {
 html[data-pf-active] [data-pf-width] { width:var(--pf-sidebar)!important; min-width:var(--pf-sidebar)!important; max-width:var(--pf-sidebar)!important; }
 html[data-pf-active] [data-pf-sidebar] { background:linear-gradient(90deg,transparent calc(100% - 6px),var(--pf-gutter) 0),linear-gradient(var(--pf-nav-start),var(--pf-nav-end))!important; border-right:0!important; position:relative!important; }
 html[data-pf-active] [data-pf-nav] { position:absolute!important; top:0!important; left:0!important; width:var(--pf-nav)!important; bottom:110px!important; overflow:auto!important; background:transparent!important; }
 html[data-pf-active] [data-pf-nav] > div:first-child { min-height:36px!important; }
 html[data-pf-active] [data-pf-nav] button { min-height:36px; }
 html[data-pf-active] [data-pf-nav] button [dir="auto"] { font-size:14px!important; font-weight:450!important; }
 html[data-pf-active] [data-pf-nav] button { border-radius:7px!important; }
 html[data-pf-active] [data-pf-footer] { position:absolute!important; bottom:0!important; left:0!important; width:var(--pf-nav)!important; min-height:92px!important; padding:12px 8px!important; flex-direction:column!important; align-items:stretch!important; justify-content:flex-end!important; gap:14px!important; border-top:1px solid var(--pf-border)!important; background:transparent!important; }
 html[data-pf-active] [data-pf-footer] > div { justify-content:space-between!important; }
 html[data-pf-active] [data-pf-list] { position:absolute!important; left:calc(var(--pf-nav) + var(--pf-groups))!important; top:76px!important; bottom:6px!important; width:var(--pf-list)!important; background:var(--pf-canvas)!important; border-radius:0 0 8px 0!important; }
 html[data-pf-active] [data-testid="sidebar-status-list-scroll"] > div, html[data-pf-active] [data-testid="sidebar-project-workspace-list-scroll"] > div { padding-left:0!important; padding-right:0!important; }
 html[data-pf-active] [data-testid^="sidebar-workspace-row-"] { min-height:60px!important; width:calc(100% - 16px)!important; margin-left:8px!important; margin-right:8px!important; padding:10px 8px!important; border-radius:7px!important; justify-content:center!important; }
 html[data-pf-active] [data-testid^="sidebar-row-project-icon-"] { width:36px!important; height:36px!important; flex:0 0 36px!important; margin-right:4px!important; }
 html[data-pf-active] [data-testid^="sidebar-row-project-icon-"] > div, html[data-pf-active] [data-testid^="sidebar-row-project-icon-"] > div > div:first-child { width:36px!important; height:36px!important; border-radius:50%!important; }
 html[data-pf-active] [data-testid^="sidebar-row-project-icon-"] [dir="auto"] { font-size:15px!important; }
 html[data-pf-active] [data-pf-row-copy] { min-width:0!important; }
 html[data-pf-active] [data-pf-row-copy] > div:first-child > [dir="auto"] { font-size:14px!important; font-weight:500!important; }
 html[data-pf-active] [data-testid="sidebar-workspace-timestamp"] { font-size:11px!important; color:var(--pf-muted)!important; }
 html[data-pf-active] [data-pf-group-section] { margin-bottom:4px!important; }
 html[data-pf-active] [data-pf-filter="attention"] [data-pf-group-section]:not([data-pf-group-section="attention"]),
 html[data-pf-active] [data-pf-filter="running"] [data-pf-group-section]:not([data-pf-group-section="running"]),
 html[data-pf-active] [data-pf-filter="done"] [data-pf-group-section]:not([data-pf-group-section="done"]) { display:none!important; }
 html[data-pf-active] [data-testid="left-sidebar-resize-handle"] { display:none!important; }
 html[data-pf-active] [data-pf-header] { height:38px!important; min-height:38px!important; border-radius:8px 8px 0 0!important; background:var(--pf-canvas)!important; border-color:var(--pf-border)!important; }
 html[data-pf-active] [data-testid="workspace-tabs-row"] { height:32px!important; min-height:32px!important; }
 html[data-pf-active] [data-pf-composer-inner] { width:100%!important; max-width:var(--pf-content)!important; }
 html[data-pf-active] .pf-list-heading { display:flex; flex-direction:column; gap:6px; position:absolute; top:6px; left:calc(var(--pf-nav) + var(--pf-groups)); width:var(--pf-list); height:70px; border-radius:0 8px 0 0; box-sizing:border-box; padding:5px 12px; background:var(--pf-canvas); border-bottom:1px solid var(--pf-border); color:var(--pf-text); font:14px/1.4 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif; }
 html[data-pf-active] .pf-list-title { height:25px; display:flex; align-items:center; justify-content:space-between; font-weight:600; }
 html[data-pf-active] .pf-search { display:flex; align-items:center; gap:8px; height:30px; flex:none; padding:0 9px; background:var(--pf-control); border:0; border-radius:6px; color:var(--pf-muted); font:12px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif; cursor:pointer; }
 html[data-pf-active] .pf-icon-button { width:28px; height:25px; display:grid; place-items:center; background:none; color:var(--pf-secondary); border:0; border-radius:4px; cursor:pointer; }
 html[data-pf-active] .pf-icon-button span { display:none; }
 html[data-pf-active] .pf-icon-button svg, html[data-pf-active] .pf-search svg { width:16px; height:16px; }
 html[data-pf-active] .pf-icon-button:hover, html[data-pf-active] .pf-search:hover { background:var(--pf-selected); }
 html[data-pf-active] [data-pf-owned] button:focus-visible { outline:2px solid var(--pf-accent); outline-offset:-2px; }
}
@media(min-width:1180px) {
 html[data-pf-active] .pf-groups { display:flex; flex-direction:column; box-sizing:border-box; position:absolute; left:var(--pf-nav); top:6px; bottom:6px; width:var(--pf-groups); padding:10px 6px; background:var(--pf-group-bg); border-radius:8px 0 0 8px; border-right:1px solid var(--pf-border); color:var(--pf-text); font:14px/1.5 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif; overflow:auto; }
 html[data-pf-active] .pf-group-heading { height:40px; display:flex; align-items:center; padding:0 8px; font-weight:600; }
 html[data-pf-active] .pf-button { flex:none; height:36px; display:flex; align-items:center; gap:10px; width:100%; padding:0 8px; margin-bottom:2px; border:0; border-radius:6px; background:none; color:var(--pf-secondary); font:inherit; text-align:left; cursor:pointer; }
 html[data-pf-active] .pf-button svg { width:17px; height:17px; flex:none; }
 html[data-pf-active] .pf-button[aria-pressed="true"] { background:var(--pf-group-selected); color:var(--pf-text); font-weight:500; }
 html[data-pf-active] .pf-button:hover { background:var(--pf-hover); }
 html[data-pf-active] .pf-button:disabled { opacity:.4; cursor:default; }
 html[data-pf-active] .pf-group-label { margin:20px 8px 8px; color:var(--pf-muted); font-size:12px; }
 html[data-pf-active] .pf-rail-foot { margin-top:auto; padding:20px 8px 4px; color:var(--pf-muted); font-size:12px; }
}
@media(min-width:950px) and (max-width:1179px) { html[data-pf-active] { --pf-nav:160px; --pf-groups:0px; --pf-sidebar:466px; } }
@media(min-width:760px) and (max-width:949px) {
 html[data-pf-active] { --pf-nav:104px; --pf-groups:0px; --pf-list:254px; --pf-sidebar:364px; }
 html[data-pf-active] [data-pf-nav] button [dir="auto"], html[data-pf-active] [data-pf-footer] [dir="auto"] { display:none!important; }
 html[data-pf-active] [data-pf-footer] > div { flex-wrap:wrap!important; gap:8px!important; }
 html[data-pf-active] [data-pf-nav] button { justify-content:center!important; padding:0!important; }
}

html[data-pf-active] [data-pf-transcript-content] { padding:16px 20px!important; }
html[data-pf-active] [data-pf-message-frame] { width:100%!important; max-width:var(--pf-content)!important; padding-left:0!important; padding-right:0!important; }
html[data-pf-active] [data-pf-composer-outer] { padding:0 20px 20px!important; }
html[data-pf-active] [data-pf-composer-inner] { width:100%!important; max-width:var(--pf-content)!important; }
html[data-pf-active] [data-pf-composer-box] { min-height:116px; padding:12px!important; }
html[data-pf-active] [data-pf-user-bubble] { padding:10px 12px!important; }
html[data-pf-active] [data-testid="assistant-message"] {
 position:relative!important; background:var(--pf-raised)!important; border:1px solid var(--pf-border)!important;
 border-radius:8px!important; padding:16px 20px!important; min-width:0!important;
}
html[data-pf-active] [data-testid="assistant-message"] [data-paseo-markdown-tag="p"] { margin-bottom:8px!important; }
html[data-pf-active] [data-testid="assistant-message"] [data-paseo-markdown-tag="p"] [dir="auto"] { font-size:14px!important; line-height:24px!important; }
@media(min-width:760px) {
 html[data-pf-active] [data-pf-shell] { background:var(--pf-gutter)!important; }
 html[data-pf-active] [data-pf-center] { margin:6px 6px 6px 0!important; min-width:0!important; border-radius:8px!important; background:var(--pf-canvas)!important; }
 html[data-pf-active] [data-pf-center] [data-testid="workspace-pane-main"] { border-radius:8px!important; }
 html[data-pf-active] [data-testid="assistant-message"] { margin-left:42px!important; width:calc(100% - 42px)!important; }
 html[data-pf-active] [data-testid="assistant-message"]::before {
  content:""; position:absolute; left:-43px; top:0; width:32px; height:32px; border-radius:50%; pointer-events:none;
  background:var(--pf-accent) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='m9 18 5-8 4 12 5-8' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/32px;
 }
 html[data-pf-active] [data-testid="user-message"] { position:relative!important; padding-right:42px!important; }
 html[data-pf-active] [data-testid="user-message"] > div { max-width:80%!important; }
 html[data-pf-active] [data-testid="user-message"]::after {
  content:""; position:absolute; right:0; top:0; width:32px; height:32px; border-radius:50%; pointer-events:none;
  background:#526079 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='12' r='4' fill='none' stroke='white' stroke-width='1.5'/%3E%3Cpath d='M9 25v-2a7 7 0 0 1 14 0v2' fill='none' stroke='white' stroke-width='1.5'/%3E%3C/svg%3E") center/32px;
 }
}
@media(min-width:760px) and (max-width:1179px) {
 html[data-pf-active] [data-pf-list] { border-bottom-left-radius:8px!important; }
 html[data-pf-active] .pf-list-heading { border-top-left-radius:8px; }
}
@media(max-width:759px) {
 html[data-pf-active] [data-pf-transcript-content] { padding:16px 12px!important; }
 html[data-pf-active] [data-pf-composer-outer] { padding:0 12px 12px!important; }
 html[data-pf-active] [data-testid="assistant-message"] { padding:14px!important; }
}

/* One native message can contain many Markdown block rows. Join their visual edges only;
   Paseo still owns every row, measurement, streaming update and copy/permission action. */
html[data-pf-active] [data-pf-message-frame][data-pf-join-next] { margin-bottom:0!important; }
html[data-pf-active] [data-pf-message-part="start"] { border-bottom:0!important; border-bottom-left-radius:0!important; border-bottom-right-radius:0!important; padding-bottom:8px!important; }
html[data-pf-active] [data-pf-message-part="middle"] { border-top:0!important; border-bottom:0!important; border-radius:0!important; padding-top:0!important; padding-bottom:8px!important; }
html[data-pf-active] [data-pf-message-part="end"] { border-top:0!important; border-top-left-radius:0!important; border-top-right-radius:0!important; padding-top:0!important; }
html[data-pf-active] [data-pf-message-part="middle"]::before,
html[data-pf-active] [data-pf-message-part="end"]::before { content:none!important; display:none!important; }

/* OpenDesign thinking/tool rows. Native source rows, detail scroll views, copy controls,
   open-file actions and permission cards keep their ownership and event handlers. */
html[data-pf-active] [data-pf-tool] {
 min-width:0!important; width:100%!important; box-sizing:border-box!important;
 margin:0 0 6px!important; padding:0!important;
 border:1px solid var(--pf-border)!important; border-radius:8px!important;
 background:var(--pf-raised)!important; overflow:hidden!important;
}
html[data-pf-active] [data-pf-tool-header] {
 position:relative!important; width:100%!important; min-width:0!important;
 min-height:46px!important; justify-content:center!important; box-sizing:border-box!important; padding:9px 80px 9px 12px!important;
 border:0!important; border-radius:0!important; background:transparent!important;
}
html[data-pf-active] [data-pf-tool-header="interactive"]:hover { background:var(--pf-hover)!important; }
html[data-pf-active] [data-pf-tool-header="interactive"]:focus-visible { outline:2px solid var(--pf-accent); outline-offset:-2px; }
html[data-pf-active] [data-pf-tool-header]::before {
 content:attr(data-pf-tool-status); position:absolute; right:30px; top:50%; transform:translateY(-50%);
 color:var(--pf-secondary); font:11px/18px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;
 white-space:nowrap; pointer-events:none;
}
html[data-pf-active] [data-pf-tool-header="interactive"]::after {
 content:""; position:absolute; top:50%; right:14px; width:5px; height:5px;
 border-right:1.5px solid var(--pf-muted); border-bottom:1.5px solid var(--pf-muted);
 transform:translateY(-70%) rotate(45deg); pointer-events:none;
}
html[data-pf-active] [data-pf-tool-expanded="true"]::after { transform:translateY(-20%) rotate(225deg); }
html[data-pf-active] [data-pf-tool-row] {
 display:grid!important; grid-template-columns:18px minmax(0,1fr)!important; align-items:center!important;
 gap:9px!important; min-width:0!important;
}
html[data-pf-active] [data-pf-tool-icon] { display:flex!important; align-items:center!important; justify-content:center!important; width:18px!important; height:20px!important; margin:0!important; }
html[data-pf-active] [data-pf-tool-icon] svg { width:16px!important; height:16px!important; }
html[data-pf-active] [data-pf-tool-labels] {
 position:relative!important; display:grid!important; grid-template-columns:minmax(0,1fr) auto!important;
 align-items:center!important; gap:2px 6px!important; min-width:0!important;
}
html[data-pf-active] [data-pf-tool-label] {
 grid-column:1; grid-row:1; min-width:0!important; color:var(--pf-text)!important;
 white-space:nowrap!important; overflow:hidden!important; text-overflow:ellipsis!important;
 font:600 12px/18px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif!important;
 opacity:1!important;
}
html[data-pf-active] [data-pf-tool-label][data-pf-tool-title] { font-size:0!important; line-height:0!important; height:18px!important; }
html[data-pf-active] [data-pf-tool-label][data-pf-tool-title]::before { content:attr(data-pf-tool-title); display:block; text-align:left; font-size:12px; line-height:18px; }
html[data-pf-active] [data-pf-tool-summary] {
 grid-column:1; grid-row:2; min-width:0!important; max-width:100%!important; margin:0!important;
 color:var(--pf-secondary)!important; font-size:12px!important; line-height:18px!important;
 white-space:nowrap!important; overflow:hidden!important; text-overflow:ellipsis!important;
}
html[data-pf-active] [data-pf-tool-open-file] { grid-column:2; grid-row:1 / span 2; min-width:28px; min-height:28px; margin:0!important; }
html[data-pf-active] [data-pf-tool-shimmer] { visibility:hidden!important; pointer-events:none!important; }
html[data-pf-active] [data-pf-tool-state="running"] > [data-pf-tool-header]::before { color:var(--pf-accent); }
html[data-pf-active] [data-pf-tool-state="failed"] { border-color:var(--colors-destructive,var(--pf-border))!important; }
html[data-pf-active] [data-pf-tool-state="failed"] > [data-pf-tool-header]::before { color:var(--colors-destructive,var(--pf-text)); }
html[data-pf-active] [data-pf-tool-details] {
 min-width:0!important; max-width:100%!important; box-sizing:border-box!important;
 border:0!important; border-top:1px solid var(--pf-border)!important; border-radius:0!important;
 margin:0!important; padding:0!important; background:var(--pf-paper)!important;
}
html[data-pf-active] [data-pf-thinking-details] { padding:10px 12px!important; }
html[data-pf-active] .pf-tool-copy {
 order:-1; align-self:flex-end; min-height:36px; min-width:70px; margin:2px 8px;
 padding:0 8px; border:0; border-radius:6px; background:transparent; color:var(--pf-secondary);
 font:12px/20px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif; cursor:pointer;
}
html[data-pf-active] .pf-tool-copy:hover { background:var(--pf-hover); color:var(--pf-text); }
html[data-pf-active] .pf-tool-copy:focus-visible { outline:2px solid var(--pf-accent); outline-offset:-2px; }
html[data-pf-active] [data-pf-thinking-details] [dir="auto"] { color:var(--pf-secondary)!important; font-size:13px!important; line-height:22px!important; }
html[data-pf-active] [data-pf-thinking-text] { color:var(--pf-secondary)!important; font-size:13px!important; line-height:22px!important; }
@media(max-width:759px) {
 html[data-pf-active] [data-pf-tool-header] { min-height:52px!important; padding:9px 76px 9px 10px!important; }
 html[data-pf-active] [data-pf-tool-open-file] { min-width:44px; min-height:44px; }
 html[data-pf-active] .pf-tool-copy { min-height:44px; }
}

/* Match the approved shared assistant bubble without reparenting native virtual rows. */
html[data-pf-active] [data-pf-response-part] {
 position:relative!important; box-sizing:border-box!important; border:1px solid var(--pf-border)!important;
 border-top:0!important; border-bottom:0!important; background:var(--pf-raised)!important;
 padding:0 20px 6px!important; margin-top:0!important; margin-bottom:0!important; border-radius:0!important;
}
html[data-pf-active] [data-pf-response-part="start"],
html[data-pf-active] [data-pf-response-part="single"] {
 border-top:1px solid var(--pf-border)!important; border-top-left-radius:8px!important; border-top-right-radius:8px!important; padding-top:16px!important;
}
html[data-pf-active] [data-pf-response-part="end"],
html[data-pf-active] [data-pf-response-part="single"] {
 border-bottom:1px solid var(--pf-border)!important; border-bottom-left-radius:8px!important; border-bottom-right-radius:8px!important; padding-bottom:16px!important; margin-bottom:4px!important;
}
html[data-pf-active] [data-pf-response-part] [data-testid="assistant-message"] {
 border:0!important; border-radius:0!important; padding:0!important; margin:0!important; width:100%!important; background:transparent!important;
}
html[data-pf-active] [data-pf-response-part] [data-testid="assistant-message"]::before { content:none!important; display:none!important; }
html[data-pf-active] [data-pf-response-part] [data-pf-tool] { margin-bottom:0!important; }
html[data-pf-active] [data-pf-command-preview] [data-pf-tool-label] { display:none!important; }
html[data-pf-active] [data-pf-command-preview] [data-pf-tool-summary] {
 grid-row:1!important; height:20px!important; font-size:13px!important; line-height:20px!important;
 white-space:pre!important; text-align:left!important;
}
html[data-pf-active] [data-pf-command-preview] [data-pf-tool-open-file] { grid-row:1!important; }
/* Keep visually hidden tool names available to assistive technology. */
html[data-pf-active] :is([data-pf-file-preview],[data-pf-explore-preview],[data-pf-todo-preview],[data-pf-summary-preview]) > [data-pf-tool-header] [data-pf-tool-label] {
 position:absolute!important; width:1px!important; height:1px!important; margin:-1px!important;
 padding:0!important; border:0!important; overflow:hidden!important; clip-path:inset(50%)!important;
}
html[data-pf-active] :is([data-pf-file-preview],[data-pf-explore-preview],[data-pf-todo-preview],[data-pf-summary-preview]) > [data-pf-tool-header] [data-pf-tool-summary] {
 grid-row:1!important; height:20px!important; font-size:13px!important; line-height:20px!important;
 text-align:left!important;
}
html[data-pf-active] :is([data-pf-file-preview],[data-pf-summary-preview]) [data-pf-tool-open-file] { grid-row:1!important; }
/* Preserve the native glyph for status detection while drawing Explore's search icon. */
html[data-pf-active] [data-pf-explore-tool] > [data-pf-tool-header] [data-pf-tool-icon] { position:relative!important; }
html[data-pf-active] [data-pf-explore-tool] > [data-pf-tool-header] [data-pf-tool-icon] svg { visibility:hidden!important; }
html[data-pf-active] [data-pf-explore-tool] > [data-pf-tool-header] [data-pf-tool-icon]::before {
 content:""; position:absolute; width:16px; height:16px; top:2px; left:1px; pointer-events:none;
 background:var(--pf-secondary);
 mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='10.5' cy='10.5' r='6.5'/%3E%3Cpath d='m16 16 5 5'/%3E%3C/svg%3E") center/contain no-repeat;
}
html[data-pf-active] [data-pf-explore-tool][data-pf-tool-state="running"] > [data-pf-tool-header] [data-pf-tool-icon]::before { background:var(--pf-accent); }
html[data-pf-active] [data-pf-explore-tool][data-pf-tool-state="failed"] > [data-pf-tool-header] [data-pf-tool-icon]::before { background:var(--colors-destructive,var(--pf-text)); }
@media(min-width:760px) {
 html[data-pf-active] [data-pf-response-part] { margin-left:42px!important; width:calc(100% - 42px)!important; }
 html[data-pf-active] [data-pf-response-avatar]::before {
  content:""; position:absolute; left:-43px; top:0; width:32px; height:32px; border-radius:50%; pointer-events:none;
  background:var(--pf-accent) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='m9 18 5-8 4 12 5-8' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/32px;
 }
}
@media(max-width:759px) {
 html[data-pf-active] [data-pf-response-part] { padding-left:14px!important; padding-right:14px!important; }
}

/* Native callouts are siblings of the list. Reserve an intrinsic grid row so a
   wrapping setup/update notice never falls through to the absolute nav at (0, 0). */
@media(min-width:760px) {
 html[data-pf-active] [data-pf-sidebar][data-pf-has-callout] {
  display:grid!important;
  grid-template-columns:var(--pf-nav) var(--pf-groups) var(--pf-list) 6px;
  grid-template-rows:76px minmax(0,1fr) auto 6px;
 }
 html[data-pf-active] [data-pf-has-callout] [data-pf-list] {
  position:relative!important; left:auto!important; top:auto!important; bottom:auto!important;
  grid-column:3; grid-row:2; min-height:0!important; border-radius:0!important;
 }
 html[data-pf-active] [data-pf-callout-slot] {
  grid-column:3; grid-row:3; min-width:0!important; max-height:35vh; overflow:auto!important;
  background:var(--pf-canvas)!important; border-radius:0 0 8px 0;
 }
}
@media(min-width:760px) and (max-width:1179px) {
 html[data-pf-active] [data-pf-callout-slot] { border-bottom-left-radius:8px; }
}
`;
