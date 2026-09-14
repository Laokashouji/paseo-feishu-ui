// Read-only native-renderer regression. Open a transcript containing a multi-block answer.
// Evaluate this expression with the local diagnostic bridge described in docs/verification.md.
(() => {
  const chat = [...document.querySelectorAll('[data-testid="agent-chat-scroll"]')]
    .find(el => el.getBoundingClientRect().width > 0);
  if (!chat) throw new Error('Open a native transcript before running this check');
  const rows = [...chat.querySelectorAll('[data-history-row-id]')];
  const groups = [];
  let group = null;
  for (const row of rows) {
    const match = /^(.*):block:(\d+)$/.exec(row.getAttribute('data-history-row-id') || '');
    const message = row.querySelector('[data-testid="assistant-message"]');
    if (!match || !message) { group = null; continue; }
    const previous = group?.parts.at(-1);
    const virtualIndex = row.hasAttribute('data-index') ? Number(row.dataset.index) : null;
    if (!group || group.key !== match[1] || previous.index + 1 !== Number(match[2]) ||
        (previous.virtualIndex !== null && virtualIndex !== null && virtualIndex !== previous.virtualIndex + 1))
      groups.push(group = { key: match[1], parts: [] });
    group.parts.push({ index: Number(match[2]), virtualIndex, message });
  }
  const completeRuns = groups.filter(g => g.parts.length > 1 && g.parts[0].index === 0 &&
    g.parts.every((p, i) => p.index === i));
  if (!groups.some(g => g.parts.some(p => p.index > 0)))
    throw new Error('Scroll to mount a multi-block answer before running this check');
  const failures = [];
  for (const part of groups.flatMap(g => g.parts).filter(p => p.index > 0)) {
    const avatar = getComputedStyle(part.message, '::before');
    if (avatar.content !== 'none' && avatar.display !== 'none' && parseFloat(avatar.width) > 0)
      failures.push('A continuation block creates an avatar');
    if (parseFloat(getComputedStyle(part.message).borderTopWidth) > 0)
      failures.push('A continuation block creates a card top');
  }
  for (const { parts } of completeRuns) {
    const styles = parts.map(p => getComputedStyle(p.message));
    const avatars = parts.filter(p => {
      const s = getComputedStyle(p.message, '::before');
      return s.content !== 'none' && s.display !== 'none' && parseFloat(s.width) > 0;
    }).length;
    if (avatars !== (innerWidth >= 760 ? 1 : 0)) failures.push('Repeated or missing response avatar');
    if (styles.filter(s => parseFloat(s.borderTopWidth) > 0).length !== 1)
      failures.push('A paragraph creates a new card top');
    if (styles.slice(0, -1).some(s => parseFloat(s.borderBottomWidth) > 0))
      failures.push('A paragraph closes the card before the answer ends');
    for (let i = 1; i < parts.length; i++) {
      const a = parts[i - 1].message.getBoundingClientRect();
      const b = parts[i].message.getBoundingClientRect();
      if (a.width && b.width && Math.abs(b.top - a.bottom) > 1)
        failures.push('Gap or overlap splits consecutive paragraphs');
    }
  }
  return { pass: failures.length === 0, checkedResponses: completeRuns.length,
    partialResponseRuns: groups.filter(g => g.parts[0].index > 0).length,
    checkedBlocks: completeRuns.reduce((n, g) => n + g.parts.length, 0), failures: [...new Set(failures)] };
})()
