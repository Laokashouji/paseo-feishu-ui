# Paseo plugin implementation research

Current integration target: Paseo 0.8.0, inspected 2026-09-11. The plugin has a client-only `index.client.tsx`, runtime modules under `client/`, SDK imports from `/client` and `/client/react-native`, and a `>=0.8.0 <0.9.0` manifest requirement. All browser code is isolated in `client/web.ts`; the project omits the DOM TypeScript library. The old `addClientSide` registration has been removed.

The native appearance gap is documented in [native mobile support](native-mobile-support.md). Theme palettes are supported, but a complete native message skin cannot preserve current message behavior through the public 0.8.0 renderer contract.

The following 0.7.2 research is historical evidence for the original adapter; API names and navigation claims must be checked against the installed 0.8 SDK before new changes.

## Sources

- [Documentation index](https://paseo.sh/llms.txt)
- [Version selector](https://paseo.sh/docs/plugins.md)
- [v0.8 migration](https://paseo.sh/docs/plugins/v0.8/migration.md) and [reference](https://paseo.sh/docs/plugins/v0.8/reference.md)
- The scaffold produced by `paseo plugin init`, pinned to `@getpaseo/plugin@0.7.2`.
- The installed package's `dist/contracts.d.ts` and the installed desktop client bundle.

The local daemon is reachable and its existing root `pluginsEnabled` setting is already true.

## Available extension points

| API | Capability | Relevance |
| --- | --- | --- |
| `addTheme` | Registers light/dark palettes in Appearance | Native panels, menus, terminal, syntax and status colors |
| `addClientSide` | One client entrypoint with cleanup per installation | Desktop/browser layout adapter |
| `addSurface`, `addSidebarItem` | React Native full-page body and navigation entry | Plugin controls and a visual reference preview |
| `addWorkspacePanel` | Workspace/agent tabs, including explorer placement | Optional contextual tools |
| `addCommandCenterItem` | Global/workspace/agent actions | Quick access to plugin controls |
| `addTimelineTransformer`, `addTimelineRenderer` | Replace timeline entries | Available, but replacing messages would require preserving streaming and actions |
| `handle`, typed RPC | Node subprocess handlers | Machine-local plugin behavior |

`PluginSurfaceProps.navigation` can open a real agent or workspace in 0.7.2. The prose reference contains an older contradictory claim that native navigation is unavailable; the installed type and bundle are authoritative for this target.

## Constraints that affect a full UI skin

The palette contract exposes seven required colors and an optional accent; it does not expose typography, sidebar geometry, spacing, icon replacement, or a root-layout slot. A native theme alone cannot reproduce the current Feishu window's four columns. A full desktop skin therefore requires a client adapter using browser DOM/CSS in addition to the supported palette registration. This adapter is version-sensitive and must be isolated, reversible, and gated to the web platform. React Native iOS/Android can consume the palette but cannot run a DOM adapter.

The client has semantic `data-testid` hooks for sidebar navigation, workspace lists, the workspace title/tabs, composer, user/assistant messages, permission cards, and settings. These are better integration points than generated React Native Web class names. Their presence still needs verification in each supported Paseo version.

Before implementing the desktop adapter, read [the exact anchor inventory and interaction constraints](desktop-adapter.md), including the installed RNW selected/expanded-state filtering caveat.

Client runtime imports are limited to host-provided React, React Native, TanStack Query, Zod and Paseo plugin modules. Node APIs belong in server modules. A client entrypoint receives the selected host's existing Paseo connection; it should not open another authenticated connection.

Installed runtime inspection adds three integration constraints:

- Public `navigation.openAgent/openWorkspace` is available on surface and panel props, but not on the persistent `addClientSide` context. Keep native navigation controls and handlers for the persistent shell.
- Standalone sidebar surfaces have the SDK/RPC providers but lack the client-state provider used by `useWorkspace/useAgent`; those hooks throw there in 0.7.2. Query through the host-scoped SDK in a standalone surface, and use selector hooks in contextual panels.
- A persistent entrypoint runs separately for each connected host. Shared document styles need reference-counted ownership and synchronous teardown so a disconnected host or an old reload cannot remove another live instance's styles.

Theme registration does not activate the theme. Select it through Appearance for local validation. All light plugin themes share the `pluginLight` root class, so that class alone cannot identify this skin. A version-specific adapter can read the exact `pluginThemeId` in `@paseo:app-settings`, together with rendered palette values, without modifying host settings. Theme changes, reload, disable, and multi-host disconnect remain runtime verification requirements.

Reload recompiles the source and tears down the old contribution. The daemon need not be restarted. Typecheck before each install/reload, then require `paseo plugin ls --json` to report running and inspect logs. UI verification must include the actual native client and cleanup on disable.

## Local Feishu reference

Captured the user's running Feishu window with the authorized macOS ScreenCaptureKit API. The window is 1342 × 750 logical pixels. ScreenCaptureKit produced a window-only reference; a separate full-desktop `screencapture` also succeeded. Translucent navigation fills vary with the capture method and the windows behind Feishu, so compare geometry against the window-only capture and judge the navigation fill in context. Source screenshots are preserved under ignored `.local/reference/` because they include real chat content and a watermark.

Measured structural boundaries are x=180, x=340 and x=646: app navigation 180 px, group navigation 160 px, conversation list 300 px, a 6 px gutter, and the remaining chat area. Approximate dominant fills are navigation `#e7ebf7`, group rail `#f1f3f5`, list/chat `#fafafa`, selected row `#e5ebf9`, and composer `#fdfdfd`. Capture variation and watermark pixels mean these colors should be judged visually as well as numerically.

The design workflow is the installed OpenDesign plugin's `open-design-mode` v0.5.3, through its independently registered local MCP and signed OpenDesign 0.21.1 runtime. A brief was collected once; generation follows its confirmed mode and the same workflow identifier. Implementation begins after the design is generated and compared with the real reference.


Follow-up dark-reference measurement corrected the original list boundary: list ends at x640; x640–646 is a real frame/gutter, not list content. Both native theme contributions share this separated geometry. `addTheme` selects a native light/dark appearance, so inherited menu, syntax and status palettes switch together. There is no public persistent theme setter on the client contribution; users select either theme through native Appearance.
