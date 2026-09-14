// Native renderer regression: open a workspace that shows a sidebar setup/update alert.
// Read-only. Never dismiss the callout: dismissal changes a persisted user preference.
(() => {
  if (innerWidth < 760) throw new Error('Open the desktop sidebar at a width of at least 760px');
  const root = document.querySelector('[data-pf-sidebar]');
  const alerts = [...(root?.querySelectorAll('[role="alert"]') ?? [])]
    .filter(el => el.getBoundingClientRect().height > 0);
  if (!alerts.length) throw new Error('Select a workspace with a native sidebar callout');
  const list = root.querySelector('[data-pf-list]').getBoundingClientRect();
  const heading = root.querySelector('.pf-list-heading').getBoundingClientRect();
  const nav = root.querySelector('[data-pf-nav]').getBoundingClientRect();
  const failures = [];
  for (const alert of alerts) {
    const r = alert.getBoundingClientRect();
    const slot = alert.parentElement.getBoundingClientRect();
    if (r.left < list.left - 1 || r.right > list.right + 1)
      failures.push('Callout escapes the workspace list column');
    if (slot.top < list.bottom - 1 || list.top < heading.bottom - 1)
      failures.push('Callout overlaps the workspace list or heading');
    if (r.left < nav.right && r.right > nav.left && r.top < nav.bottom && r.bottom > nav.top)
      failures.push('Callout covers application navigation');
    if (slot.bottom > innerHeight || slot.height <= 0 || list.height < 60)
      failures.push('Callout or workspace list has unusable bounds');
    for (const button of alert.querySelectorAll('button')) {
      const b = button.getBoundingClientRect();
      if (b.left < slot.left - 1 || b.right > slot.right + 1)
        failures.push('Callout action escapes its slot');
    }
  }
  return { pass: !failures.length, alerts: alerts.length, viewport: [innerWidth, innerHeight], failures };
})()
