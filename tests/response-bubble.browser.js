// Read-only regression for mixed thinking/tool/body bubbles in the installed web renderer.
// Evaluate with a visible transcript containing at least one mixed response.
(() => {
  const chat = [...document.querySelectorAll('[data-testid="agent-chat-scroll"]')].find(e => e.clientWidth > 0);
  if (!chat) throw new Error('Open a native transcript before running this check');
  const rows = [...chat.querySelectorAll('[data-history-row-id]')];
  const frames = [...chat.querySelectorAll('[data-pf-response-part]')];
  const groups = [];
  for (const frame of frames) {
    if (!groups.length || ['start', 'single'].includes(frame.dataset.pfResponsePart)) groups.push([]);
    groups.at(-1).push(frame);
  }
  const mixed = groups.filter(group => group.some(f => f.querySelector('[data-pf-tool],[data-testid="feishu-thinking-card"]')) &&
    group.some(f => f.querySelector('[data-testid="assistant-message"]')));
  if (!mixed.length) throw new Error('Mount a response containing both tools and body text');
  const failures = [];
  for (const group of groups) {
    for (let i = 1; i < group.length; i++) {
      const previous = group[i - 1], frame = group[i];
      const a = previous.getBoundingClientRect(), b = frame.getBoundingClientRect();
      if (Math.abs(a.bottom - b.top) > 1) failures.push('Gap or overlap splits one response');
      if (Math.abs(a.x - b.x) > 1 || Math.abs(a.width - b.width) > 1) failures.push('Bubble edges are unaligned');
      const rowA = previous.closest('[data-history-row-id]'), rowB = frame.closest('[data-history-row-id]');
      if (rows.indexOf(rowB) !== rows.indexOf(rowA) + 1 || rowA.children.length !== 1)
        failures.push('Bubble crosses an unrelated row or completed-turn footer');
      if (rowA.hasAttribute('data-index') && rowB.hasAttribute('data-index') && Number(rowB.dataset.index) !== Number(rowA.dataset.index) + 1)
        failures.push('Bubble crosses a virtual gap');
    }
    const avatars = group.filter(f => {
      const style = getComputedStyle(f, '::before');
      return style.content !== 'none' && style.display !== 'none';
    }).length;
    if (avatars > (innerWidth >= 760 ? 1 : 0)) failures.push('Repeated response avatar');
    for (const frame of group) {
      const body = frame.querySelector('[data-testid="assistant-message"]');
      if (body && getComputedStyle(body, '::before').content !== 'none') failures.push('Paragraph creates an avatar');
    }
  }
  return { pass: !failures.length, frames: frames.length, groups: groups.length, mixedResponses: mixed.length,
    viewport: [innerWidth, innerHeight], failures: [...new Set(failures)] };
})()
