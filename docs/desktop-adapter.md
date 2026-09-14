# Desktop adapter contract: Paseo 0.8.0

Updated 2026-09-11: the desktop shell inserts a single-child `display: contents` wrapper above the sidebar width controller. `sidebarFrame` skips only these wrappers (at most three), then requires a real flex row with exactly two children. The validated sibling receives the chat frame style. This restores the 6px inset and 8px corners; blindly using the immediate parent loses the separation on 0.8. Source lives in `client/web.ts`.

Source inspection and initial native integration verification completed on 2026-09-07. This document records version-specific constraints; see [verification](verification.md) for observed behavior and remaining coverage limits.

Inspected the installed web bundle `index-a14e171f25e905c272fe59b4f86aca06.js`, SHA-256 `e0bf84a5218b90f1575ead487f4cce8d20f06027eb76df1a9efdef9283c2cdc8`, and matching `@getpaseo/plugin@0.7.2` types. Detailed local reports and extracted module citations are preserved under `.local/initial-research/`.

## Layout constraints

The reference's first three columns total 646 px: 180 px app navigation, 160 px groups, 300 px conversations and a 6 px gutter. Paseo's sidebar defaults to 320 px, clamps to 200–600 px, and reserves 400 px for the center. Changing the saved sidebar width alone cannot reproduce the reference. Validate the adapter's visual width, resizing, hidden-sidebar state, focused panes, and responsive collapse together.

The native sidebar contains a single grouped list. Group headers and rows are nested; collapsed groups unmount their rows, and show-more controls limit rendered content. DOM row counts are not authoritative totals. Preserve React-owned row nodes and native grouping preferences. Separating a category rail from the conversation list remains an implementation and runtime-validation requirement.

There is no semantic ID on the sidebar root. Find the smallest common ancestor of the expected visible navigation, list, footer, and resize anchors, validate its structure, and add only plugin-owned markers. Loading and compact variants may lack the required anchors. Preserve titlebar drag and OS chrome hit areas.

## Useful anchors

Literal IDs map to `[data-testid="…"]`. Scope selectors to a validated region; split panes may produce multiple matches.

| Area | IDs or selectors |
| --- | --- |
| Main navigation | `sidebar-global-new-workspace`, `sidebar-sessions`, `sidebar-schedules`, `sidebar-command-center-search` |
| Footer and host | `sidebar-add-project`, `sidebar-home`, `sidebar-settings`, `sidebar-hosts-trigger`, `sidebar-help` |
| Native list mode and resize | `sidebar-display-preferences-menu`, `left-sidebar-resize-handle` |
| Scroll containers | `sidebar-status-list-scroll`, `sidebar-project-workspace-list-scroll` |
| Workspace rows | `[data-testid^="sidebar-workspace-row-"]` |
| Pins | `sidebar-pinned-section`, `sidebar-pinned-list`, `sidebar-pinned-show-more` |
| Header | `workspace-header-title`, `workspace-header-subtitle` |
| Tab containers | `workspace-tabs-row`, `workspace-tabs-scroll` |
| Actual tabs | `[data-testid^="workspace-tab-"][aria-selected]` |
| Native tab actions | `workspace-new-tab-button`, `workspace-explorer-toggle` |
| Composer | `message-input-root`, `[data-composer-input]`, `composer-readonly-content` |
| Attachments and suggestions | `message-input-attach-button`, `composer-attachment-tray`, `composer-autocomplete-popover` |
| Transcript | `agent-chat-scroll`, `[data-history-row-id]`, `user-message`, `assistant-message` |
| Permission and question UI | `permission-request-question`, `permission-request-deny`, `permission-request-accept`, `permission-plan-card`, `question-form-card` |

Dynamic workspace/project suffixes are opaque composite keys. Use exact attribute comparison or `CSS.escape`; do not infer host, workspace, or agent IDs by splitting them.

The `sidebar-status-group-` prefix includes headers, `rows-` containers, and `show-more-` buttons. It is not a header-only selector. The `workspace-tab-` prefix also includes tooltips and modified indicators; qualify actual tabs by their explicit `aria-selected` attribute.

## State and interaction boundaries

The installed RNW prop filter drops composite `accessibilityState`. A VM execution of its pure allowlist/picker modules confirmed that workspace `selected` and status-header `expanded` do not survive that filter. Do not assume workspace rows expose `aria-selected` or status headers expose `aria-expanded`. Tabs explicitly pass `aria-selected`, which does survive. Confirm the actual DOM when implementing.

Preserve native workspace selection and hover backgrounds (`surfaceSidebarSelected` and `surfaceSidebarHover`). A blanket row background override would erase selection even if the rows otherwise look correct.

`message-input-root` is also a keyboard focus-scope boundary. Its first child can be an autofocus helper, not the visible editor wrapper. Preserve editor identity, draft state, selection, IME composition, handlers, attachments, disabled/read-only states, and send/stop/queue behavior. Locate the visible wrapper by its editor and toolbar containment after runtime inspection.

Transcript rows can use absolute positioning, `translateY`, and virtual spacers. Preserve those measurements and scroll behavior when styling bubbles and text. Keep permission controls, question forms, menus, and portaled overlays visible and operable; navigation code must not synthesize permission-button clicks.

Public navigation, exact theme identity, and multi-host cleanup constraints are recorded in [plugin research](paseo-plugin-research.md).

## Runtime verification gate

Verify actual DOM anchors and editor type; four-column dimensions and independent scrolling; narrow/hidden/focused-pane variants; grouping, pins, show-more, menus and host selection; native agent/workspace switching and draft preservation; IME, attachments, long virtualized history and code; permission-card visibility; exact theme activation; and complete restoration on theme change, reload, disable and disconnect. Two connected installations must not duplicate the adapter or remove each other's styles.

The implementation was exercised in the real native renderer at desktop and compact widths. See [verification](verification.md) for specific results; unexercised cases are listed there rather than inferred from source inspection.

## Native message blocks

`assistant-message` is a Markdown render fragment, not a complete answer. Installed source modules3405/4593 encode flushed rows as `<opaque blockGroupId>:block:<index>`. Parse only the final suffix, preserving any `:segment:` portion. Interleaved tools can create distinct segments from the same provider message ID.

The adapter joins only adjacent rows from the same exact group with consecutive block indexes, additionally requiring consecutive `data-index` values when both are virtual. Block0 carries the single decorative avatar; mounted continuations never gain another avatar when older blocks unmount. Joined inner frames remove their native bottom margin; continuation bubbles omit internal borders/corners. The React-owned rows, transforms, spacers, copy actions and Markdown nodes stay in place.

Completed rows can contain two sibling frames: content then native turn footer. Validate and style frame0 independently; do not mistake the footer sibling for an invalid message or wrap it in a duplicate bubble. Footer has no universal testID. The native virtualizer assumes16px transcript top padding and48px scroll margin, including the32px older-history slot; keep top padding16px at every width.

Theme styling requires both the exact feishu-light/feishu-dark contribution ID and corresponding pluginLight/pluginDark class. Reconciliation retires markers on connected nodes whose roles changed, in addition to cleaning disconnected nodes.

## Thinking and tool cards — 0.8.0

`markTools` decorates the native `ExpandableBadge` used by reasoning, tool calls and tool groups. It requires badge → header → row `[icon, labels]`, with the original label as the labels container's first `[dir="auto"]` child. `Thinking` identifies reasoning; known English tool titles receive a Chinese visual label while native text and event handlers stay intact. Unknown names retain their original title; incompatible structures are left alone. Tool rows are not replaced. Since 0.3.1, reasoning alone uses the public renderer described below.

The second badge child is the expanded native detail wrapper. The adapter keeps it and its vertical/horizontal scroll containers, Markdown, selectable text and file controls. Native compact tool actions may open a detail sheet instead of inline details; that behavior stays native. Portaled detail sheets are outside this transcript adapter.

Running is inferred from the native `paseo-toolcall-shimmer` animation; only the duplicate visual overlay is hidden. Failure is inferred from the native destructive SVG stroke. A known failure is retained while the host swaps its icon to the hover chevron, only for the same nonempty history-row ID. The DOM cannot reliably distinguish completed and canceled calls, so inactive interactive rows show the neutral `详情`, never an invented success state. Exact status remains in native details. This is version-specific; re-verify the source and DOM after a Paseo upgrade.

Expanded individual details receive one owned `复制详情` button using the public `copyText` utility. It copies current native text (thinking, or command and output), excluding plugin-owned controls, and reports clipboard success/failure. Aggregate groups receive no copy control. Collapse, role reuse, unmount, theme switch and final-owner teardown remove the button. No timers or message-content caches are added. The adapter owns styling markers and controls only; native row identities, order, handlers and virtualization remain unchanged.

The standalone inline-thinking plugin's nonempty `inline-thinking-text` remains secondary selectable text. Empty nodes stay unmarked; no summary or hidden reasoning is synthesized.

## Sidebar callout slot

Installed modules3864/3937 place a persistent native callout slot directly between the list region and footer. Worktree setup (and other sidebar notices) render an alert directly inside this slot. Once the plugin positions the other regions absolutely, leaving this slot in normal flow puts it at(0,0) with the whole sidebar width. Recognize the slot by its validated list/footer neighbors and alert child; when populated, use a grid row below the list with intrinsic height. Preserve native primary/dismiss actions and restore ordinary layout when the slot empties. Below760px the native sidebar remains responsible for layout.

## Shared response frame and thinking preview — 0.3.1

Native reasoning omits the text from its collapsed DOM. `client/thinking.tsx` therefore uses the public reasoning transformer/renderer to show the first nonempty provider-exposed line from its complete payload, paced with `useRevealedText`. It preserves all reasoning text, selectable expanded details and copy. Empty text gets a waiting/empty hint; no model reasoning is inferred or synthesized. It does not replace any tool, message, permission or attachment item. This renderer is registered per connected plugin owner only on web and only while the exact Feishu theme is selected, removed on theme exit/owner disconnect, and never registered on native iOS/Android. The plugin must also be installed on each conversation host; a Mac-only installation cannot transform a remote daemon timeline. Switching themes remounts the host's native reasoning row, so expansion is not carried between renderers.

Consecutive structurally validated assistant/tool/thinking row frames now share a background and adjoining border edges, retaining the 42px avatar gutter on desktop. Only the first frame gets a decorative avatar. User, permission, system/unknown rows, native footer siblings, and gaps in virtual indexes break a run. A first mounted Markdown continuation does not invent an avatar. No native node is moved; this visual grouping follows the mounted native order and is not a synthetic canonical turn or a whole-process collapse. `tests/response-bubble.browser.js` supersedes the historical body-only avatar assertions for this revision.

Shell/Terminal headers hide their generic label and show the first command line in a 20px text track. The icon track and header use explicit vertical centering; native full command text, open-file controls and expanded detail remain unchanged.
