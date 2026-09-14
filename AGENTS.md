# Paseo Feishu UI

This repository skins Paseo; agent execution and workspace state remain owned by Paseo.

- Before changing host integration, read `docs/paseo-plugin-research.md` and verify the installed `@getpaseo/plugin` contract. The plugin API is experimental.
- Before changing visuals, read `design/DESIGN.md` and compare a rendered result with the reference measurements. Keep private desktop captures outside Git.
- Keep browser-specific styling in one disposable client adapter. Reload, disable, and disconnect must remove its DOM nodes, styles, subscriptions, and timers.
- Use semantic host attributes for integration and preserve native keyboard, composer, permission, terminal, and workspace behavior.
- Verify UI changes in the installed Paseo client at desktop and compact widths; report any behavior that could not be exercised.
