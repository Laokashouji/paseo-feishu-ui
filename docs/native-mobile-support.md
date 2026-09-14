# Native mobile skin: official Paseo 0.8.0

Status: blocked on a host API, not implemented. The user uses the official iOS App only and will upgrade it to 0.8.0. An iPhone is not available for debugging. Do not present the desktop's narrow-window checks as iOS verification.

## Verified boundary

The plugin registers two native palettes. All existing message bubbles, spacing and pane geometry are implemented in `client/web.ts`, whose entry returns before accessing browser globals on iOS/Android. The migrated plugin loads on a 0.8.0 host; this does not add native bubble styling.

Inspected the published `@getpaseo/plugin@0.8.0`, installed Paseo Desktop/daemon 0.8.0, and upstream tag [`v0.8.0` (`e432c9b`)](https://github.com/getpaseo/paseo/tree/e432c9b47194d8c20071af2ef68a35e26149031a):

- [`packages/plugin/src/contracts.ts`](https://github.com/getpaseo/paseo/blob/e432c9b47194d8c20071af2ef68a35e26149031a/packages/plugin/src/contracts.ts): `PluginThemeContribution` exposes appearance and colors; it has no message geometry/typography fields.
- [`packages/app/src/plugins/themes/index.ts`](https://github.com/getpaseo/paseo/blob/e432c9b47194d8c20071af2ef68a35e26149031a/packages/app/src/plugins/themes/index.ts): a strict schema rejects additional theme fields. Adding undeclared bubble styles to the plugin is not an extension mechanism.
- [`packages/app/src/plugins/timeline/projection.ts`](https://github.com/getpaseo/paseo/blob/e432c9b47194d8c20071af2ef68a35e26149031a/packages/app/src/plugins/timeline/projection.ts): `sourceTimelineItem` projects user messages as text and IDs, without images, attachments, pending state or capabilities. `transformSourceItem` replaces the entire row; it does not preserve the native message as renderer children. The phase calculation marks only reasoning and running tools as streaming.
- [`packages/app/src/components/message.tsx`](https://github.com/getpaseo/paseo/blob/e432c9b47194d8c20071af2ef68a35e26149031a/packages/app/src/components/message.tsx): `UserMessage` owns attachment pills/lightbox, pending state, copy and `RewindMenu`. `AssistantMessage` owns the native Markdown rules, file/image resolution, reveal and render limits.
- [`packages/plugin/src/client/contracts.ts`](https://github.com/getpaseo/paseo/blob/e432c9b47194d8c20071af2ef68a35e26149031a/packages/plugin/src/client/contracts.ts) and [`react-native.ts`](https://github.com/getpaseo/paseo/blob/e432c9b47194d8c20071af2ef68a35e26149031a/packages/plugin/src/client/react-native.ts): timeline renderers receive replacement data but no native renderer/children/style override. The public UI module does not export the native message or Markdown renderer.

Assistant turn footers are rendered separately by `agent-stream/view.tsx` and `agent-stream/turn-footer.tsx`. Do not infer that all fork actions disappear after replacement. Nevertheless, replacing message kinds also changes the data consumed by grouping/copy logic, and user-message attachments and rewind are definitively absent from the transformer input.

The earlier claim that native renderer APIs alone could deliver a complete mobile skin was too broad. They can draw custom rows; they cannot act as a lossless wrapper around all current native message behavior.

## Upstream request

Title: **feat(plugins): expose native message appearance without replacing timeline items**

On the official Paseo 0.8.0 iOS App, selecting a contributed theme changes colors, but a theme cannot customize message bubbles (background, border, corner radius, padding and spacing). Web plugins can apply DOM styles; this does not work on native clients.

`addTimelineTransformer`/`addTimelineRenderer` are not sufficient for appearance-only customization: projection omits user images/attachments, pending state and capability information, and replacement renderers cannot delegate to `UserMessage` or `AssistantMessage`. Reimplementing those components also duplicates Markdown, code fences, file/image links, streaming reveal and message actions.

Please provide a bounded native message appearance contribution associated with a contributed theme, or a decoration API that retains the original native message renderer and all its callbacks. It should:

1. Apply only while that exact plugin theme is selected, and follow light/dark changes.
2. Style user and assistant bubbles and reasoning surfaces without replacing canonical timeline items.
3. Respect source-message boundaries and virtualized Markdown blocks, so a paragraph does not create a new bubble or avatar.
4. Preserve attachments, pending state, Markdown/code/file links, copy, rewind/fork, streaming, selection, accessibility, permissions and composer drafts.
5. Clear on theme switch, disable, reload and host disconnect, with correct ownership across multiple hosts.
6. Expose capability/version information so an older official client can report that full native appearance is unavailable.

A reduced plain-text replacement is not the requested outcome. A custom iOS build is outside this user's accepted delivery route. Complete adaptation depends on this capability reaching the official client.

Published as [getpaseo/paseo#4697](https://github.com/getpaseo/paseo/issues/4697). This is a feature request, not an implemented host capability.

## Validation

The Node smoke test executes the actual migrated plugin entry with iOS/Android platform values and browser globals that throw on access. It checks both palettes and the native settings body. It does not exercise UIKit, Fabric, native Markdown, keyboard/IME, gestures, VoiceOver, or an actual phone. All such checks remain pending.

## Thinking/tool design delivery — 2026-09-14

Version 0.3.0 implements the approved OpenDesign card appearance in the desktop/browser adapter. Official native iOS/Android still receive the palettes only. The public 0.8 timeline replacement API cannot delegate to the native `ToolCall`/`ToolCallDetailsContent`, file-open actions, Markdown and detail sheets; renderer props also lack the selected contributed-theme identity needed for exact theme gating. Replacing those rows would require reimplementing native behavior. No such replacement is registered. The mobile HTML design and browser fixture demonstrate a visual direction; they do not add or verify an official iOS capability.

Version 0.3.1 introduces a reasoning-only public renderer gated by the web adapter's exact theme selection. It does not change native iOS/Android behavior. Desktop reasoning can safely preserve its plain text with a custom expander; full native bubble/tool skinning remains subject to the boundary above.
