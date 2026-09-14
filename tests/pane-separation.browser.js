// Read-only: run in the installed desktop renderer with the sidebar and a chat visible.
(() => {
  if (innerWidth < 760) throw new Error('Desktop sidebar required');
  const visible = element => element.getBoundingClientRect().width > 0;
  const sidebar = document.querySelector('[data-pf-sidebar]');
  const center = document.querySelector('[data-pf-center]');
  if (!sidebar || !center) throw new Error('Open a workspace with its sidebar');
  const s = sidebar.getBoundingClientRect();
  const c = center.getBoundingClientRect();
  const failures = [];
  if (Math.abs(c.left - s.right) > 1 || Math.abs(c.top - 6) > 1 ||
      Math.abs(innerWidth - c.right - 6) > 1 || Math.abs(innerHeight - c.bottom - 6) > 1)
    failures.push('Chat frame must keep its 6px outer inset beside the sidebar');
  if (getComputedStyle(center).borderTopLeftRadius !== '8px') failures.push('Missing chat corner');
  const composer = [...center.querySelectorAll('[data-pf-composer-box]')].find(visible);
  if (!composer) throw new Error('Open a chat with a visible composer');
  const box = composer.getBoundingClientRect();
  if (box.left < c.left || box.right > c.right || box.bottom > c.bottom)
    failures.push('Composer leaves the chat frame');
  if (document.documentElement.scrollWidth > innerWidth) failures.push('Horizontal page overflow');
  return { pass: failures.length === 0, viewport: [innerWidth, innerHeight], failures };
})()
