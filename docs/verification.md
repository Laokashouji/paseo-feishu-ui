# Task snapshot continuity — 0.3.4, 2026-09-17

- Read-only inspection of the reported conversation found five `todo_list` rows between Taskcreate/Taskupdate calls. All five lacked response frames; their neighboring tool cards ended or restarted a bubble. The rows had one content child, shared a parent, and had no virtual index gaps. The installed Paseo 0.8.0 bundle confirms TodoListCard uses ExpandableBadge without the tool badge test ID.
- The adapter now recognizes the native `todo_` row prefix plus the direct content/card structure and existing header guards. Task snapshots receive the tool-card styling and join the shared response. No native node or handler is replaced. Frame membership uses current-pass tool recognition so recycled nodes cannot retain stale bubble edges.
- `npm run test:browser` failed before the fix with `[single, null, single, null]` instead of `[start, middle, middle, middle]`. It now passes at 1342px and 390px in both themes, with zero edge gaps, aligned widths, one avatar, native keyboard expansion/focus, footer and virtual-gap boundaries, permission/user exclusions, and recycled/malformed row cleanup. Synthetic screenshots were reviewed. Typecheck and native-entry smoke tests pass.
- The local plugin was reloaded after temporarily disabling the other host's installation to release the shared adapter; the other installation was then enabled again. Native post-fix visual verification remains pending: the desktop renderer reported `document.visibilityState === "hidden"` and did not paint the requested navigation, so its captured image is not post-fix evidence. The original workspace route was restored; drafts, theme, scroll position, and daemon lifetime were not changed. Live task streaming and native iOS/Android hardware were not exercised; native mobile remains palette-only.

# Claude Code Explore previews — 0.3.3, 2026-09-16

- Explore headers now show a search icon and a single description line. The accessible title remains; an empty description restores the visible title. Exact name matching leaves other subagent types unchanged. The native icon stays in the DOM for status detection.
- Typecheck, native-entry smoke tests and browser regression passed. Light/dark fixtures at 1342px and 390px covered centering, accessibility, overflow, expansion, running/failed states, missing descriptions, node reuse, theme isolation and multi-owner cleanup. Browser screenshots were reviewed.
- In installed macOS Paseo 0.8.0, two actual Claude Code Explore cards changed from 58px to 48px tall; icon/text/header center differences changed from 10px to 0. The chat measured 608px for both client width and scroll width. A private native screenshot confirmed both single-line search previews. One card expanded to native details, retained its header identity, and was collapsed again; the original scroll position was restored.
- The local plugin was reloaded with the second host temporarily disabled to release the shared adapter. Both hosts were then enabled. The temporary diagnostic plugin was removed, its client list emptied and its loopback bridge stopped; no daemon restart was needed.
- Live Explore streaming/failures, native light/compact rendering and iOS/Android hardware were not exercised. State/compact checks above use browser fixtures; official native mobile support remains palette-only.

# File operation icon/path previews — 0.3.2, 2026-09-14

- Read, Edit and Write headers now show the native icon and one line of path text. Missing/empty paths keep the action heading; paths are not rewritten. The visually hidden action name remains in Chrome's accessibility tree, and native file/disclosure handlers retain their identity.
- Typecheck, native-entry smoke tests and the browser regression passed. The actual adapter was exercised with all three file operations at 1342px and 390px in light/dark themes, including long-path clipping, equal icon/text/header centers, native open-file and expansion handlers, a missing path, node reuse as Search, theme exit and two-owner cleanup. Browser screenshots were reviewed; these are synthetic RNW-shaped fixtures, not mobile hardware tests.
- In installed macOS Paseo 0.8.0, the first local reload retained the older adapter because a second connected host still owned it. Temporarily disabling that host's plugin, reloading the local plugin and re-enabling the other host installed the revised shared adapter. Both hosts remained enabled afterward; the desktop reported two owners and one style node.
- Native dark-theme DOM inspection found seven Edit cards marked with the new file preview; the laid-out offscreen card measured a 20px path row with equal icon/text/header centers. The active chat had equal client/scroll widths of 1268px. The user was working in another conversation, so its navigation, scroll, theme, window and draft were preserved. This is native layout evidence, not an on-screen file-card visual check.
- Live file streaming, native file-opening actions, native light/compact rendering and iOS/Android hardware were not exercised in this revision. Official native mobile support remains palette-only.

# Shared response bubbles and first-line previews — 0.3.1, 2026-09-14

Addresses the user's three follow-up observations: tools extended 42px into the avatar gutter, Shell used an unnecessary two-line heading, and native Thinking exposed neither a collapsed preview nor a centered visual title.

- A failing browser regression measured the old tool/body left edges at 261px/303px. It passes after sharing native frame edges and the avatar gutter. Fixture checks now cover mixed tool/body continuity, one avatar, native footer boundaries, virtual index gaps, command-only headings and equal icon/text/header midpoints at 1342px/390px in light/dark themes.
- `npm run typecheck`, native-entry smoke tests and browser tests passed. The browser harness executes the actual reasoning registration and pure transformer as well as the adapter; theme exit unregisters it, and releasing one of two owners retains the other registration. Native iOS/Android still do not register this renderer.
- Native macOS 0.8.0, 1512×949: actual command headers measure 46px, with icon/text/header centers equal. After installing the same code on a remote daemon, all observed native Thinking labels in its cached transcripts were replaced by exposed-text previews, without unavailable-renderer placeholders. A visible transcript contained 24 custom thinking cards; sampled header/icon/text centers were equal (including y124 for an on-screen thought).
- `tests/response-bubble.browser.js` passed on 86 native rows across two mixed responses. No edge gaps, horizontal misalignment, duplicate avatars or crossing of unrelated rows/footers were found. The transcript measured 860px for both client width and scroll width. A separate 451px-wide chat pane also had no horizontal overflow; this was inside a desktop split layout, not an iOS or compact-form-factor check.
- A native cached reasoning card expanded to complete selectable text and a copy control, retained its header identity, and was returned to its prior collapsed state. System clipboard contents were not changed. ScreenCaptureKit captured and visually confirmed the new shared frame and thought preview in the actual desktop app.
- Local directory plugin was reloaded. a remote daemon (also Paseo 0.8.0) was missing this plugin and now runs a Git installation of code commit `the 0.3.1 source revision`, tracking `main`. This is required because timeline contributions apply to the conversation's host. The actual desktop registry had two owners and exactly one style node.
- The user's active theme, window size, navigation and drafts were not changed for testing. Live light-theme/compact-form-factor rendering, real clipboard contents, live thought streaming, permissions, file actions and iOS hardware remain unverified for this revision. Existing mock copy success/failure tests and native action preservation checks remain separate from real-device coverage.

Temporary diagnostic plugin was removed, its connection list was empty, and the loopback bridge was stopped. No daemon was restarted. The historical body-only avatar check below is superseded by `tests/response-bubble.browser.js` for the shared-frame implementation.

# Thinking and tool cards — 0.3.0, 2026-09-14

Implements the approved [OpenDesign direction](../design/thinking-tools/REVIEW.md) in the existing desktop/browser adapter on Paseo 0.8.0. Official native iOS/Android still receive palettes only; no iPhone was available and no native timeline replacement was introduced.

- Compact individual native cards with 8px corners, Chinese visual titles for known tools, blue running/red failure states, and a neutral idle `详情` hint. Native detail, file, permission and timeline ownership stay intact. Copy uses the public clipboard utility and copies current complete native detail text.
- Installed macOS renderer at 1512×949: all 33 mounted badges in one sampled conversation were marked; thinking headers measured 46px and tools with summaries approximately 61px. Transcript width equaled scroll width (860px). Native thinking and shell expansion retained the exact header and parent nodes. Shell detail kept its native horizontal scroller (497px viewport / 1597px content).
- After the final production reload, pane-separation regression passed at 1512×949. The message-grouping regression passed on one complete response with 39 blocks, confirming that native fragments still form a continuous card. Earlier attempts without mounted multi-block responses were unmet preconditions, not passes.
- The added copy control was checked in an already mounted, cached native transcript while the user operated another page: exactly one control appeared, native header identity was retained, and collapse removed it. This checks native integration, not visible geometry or the system clipboard. Actual clipboard success and rejection are covered with a public-utility mock in the browser fixture.
- `npm run typecheck` and `npm test` passed. The latter executes the actual entry for iOS/Android with throwing browser globals and React Native stubs; it is not a device test.
- `npm run test:browser` passed in installed Chrome with the actual transpiled adapter and a synthetic RNW-shaped transcript. Checks include 1342px/390px light/dark layouts, long command containment, minimum hit targets, complete copy text and failure feedback, thinking/tool role changes, running → failure → hover → row reuse, native click handlers, malformed structures, permission visibility, message continuity, theme identity isolation, collapse, aggregate-group copy retirement, and multiple-owner teardown. Optional `SCREENSHOT_DIR` saves fixture captures; these are not native screenshots.
- This pass did not switch the user's live theme or resize the active window during concurrent use. Live light-theme, compact native tool sheets, real failed/streaming calls, system clipboard, native file opening, permissions, IME and iOS/Android hardware remain unverified for this revision. Browser fixture coverage does not substitute for those checks.

The local directory installation was reloaded and reports `running`; Git commits alone do not trigger reload. Temporary diagnostic plugin `feishu-ui-check` was removed and its authenticated bridge had zero renderer connections before shutdown. Private captures stay outside Git. No daemon restart, draft edits or agent messages were used for verification.

# Paseo 0.8.0 migration validation — 2026-09-11

The plugin's iOS bubble adaptation is **not complete**; see [the verified native API boundary](native-mobile-support.md). The user will use official iOS 0.8.0 and cannot connect an iPhone for testing.

- CLI, local desktop-managed daemon and desktop client report 0.8.0. Before migration the plugin was rejected because its missing manifest requirement implied `<0.8.0`.
- Migrated to a client-only runtime entry and `client/` modules, updated the pinned SDK to 0.8.0 and declared `>=0.8.0 <0.9.0`. No daemon restart. Reload reports `running` and the desktop adapter is active with one owner and one style.
- `npm run typecheck` passed without the DOM library. Browser globals and CSS live only in `client/web.ts`. `npm test` passes for iOS and Android entry execution with throwing browser globals, both palettes and the settings body. These are Node smoke checks with React Native stubs, **not device tests**.
- Installed macOS Electron at 1512×949: a 0.8 `display: contents` wrapper initially prevented the chat frame marker. After the fix, sidebar width is 646px and the chat frame is x646/y6, 860×937, retaining its 6px inset.
- The read-only message-grouping regression passed on the installed renderer: six complete response runs, 16 blocks, no repeated response cards/avatars. The 700px check could not meet the multi-block precondition in the currently visible conversation; it is not recorded as a pass.
- Installed macOS Electron at 700×844: no horizontal page overflow; composer x12/y716, 676×116. ScreenCaptureKit capture succeeded and was visually inspected. This is a resized desktop window, **not iOS**. Original 1512×949 window size restored.
- Dark native Appearance and compact chat captures succeeded. The unchanged light palette was checked through the entry smoke test; a live 0.8 light-theme switch has not been exercised in this pass.
- iOS/Android hardware, IME, live permissions, new streaming turns and file uploads remain untested. Existing user drafts and message history were not modified.

The pane-separation regression also passed at 1920×1050, including the 6px frame inset, 8px corner and composer bounds. A later wide screenshot attempt failed with ScreenCaptureKit `-3811`; the successful settings/compact captures are listed above.

Disable removed every owned node/marker and the document registry. Re-enable restored one owner and one style. The diagnostic plugin was removed, its renderer connection list is empty, and the authenticated loopback bridge has stopped. The local catalog contains only the running production plugin. Private captures remain outside Git under `/tmp/paseo-upgrade-audit`.

## Historical Paseo 0.7.2 validation — 2026-09-07

Native checks use the installed macOS Electron Paseo renderer and ScreenCaptureKit window captures. Design-preview checks are listed separately. Real chats, captures and the authenticated temporary localhost diagnostic bridge stay outside Git.

## Current revision: dual themes and continuous response cards

- Native Appearance lists **飞书 · 浅色** and **飞书 · 暗黑**. Selecting built-in Light clears all owned markers; selecting the exact dark plugin theme restores its adapter class.
- Native 1342×750: sidebar ends at x=646; the list is 300px wide with a 6px gap before the chat. Chat geometry is x=646, y=6, width=690, height=738 with 8px corners. Header rows are 38px + 32px. Transcript and composer start at x=666 with width=650; composer height is 116px. Both native themes were captured with ScreenCaptureKit.
- Dark surfaces match the revised tokens: canvas `#181818`, assistant card `#2c2c2c`, composer `#1d1d1d`.
- Native 820×750: 104px navigation, 254px list and 6px gap; chat starts at x=364 with width=450, and the composer is 410px wide.
- Native 700px compact: composer x=12, width=676, height=116, with no horizontal page overflow. ScreenCaptureKit capture at this width failed with error `-3811`; native renderer geometry and grouping checks passed. A grouped-response capture at 1920px succeeded.
- Draft, selection and textarea identity survived an agent-tab roundtrip. The original draft and selection were restored; no messages were sent. Synthetic composition events passed.
- After the grouping fix, long native history at 1920px dark sampled 24, 23 and 9 mounted virtual rows at successive positions, without overlapping visible rows or horizontal overflow. The grouping check also passed at the midpoint with one partially mounted response. Paseo retains its virtualizer, transforms and spacers; the adapter uses a 16px transcript top inset.

The user identified a rendering bug where each native content block became a separate assistant bubble. The adapter now joins consecutive Markdown blocks from the same exact native message group while preserving distinct tool-interleaved segments, shows the avatar only on block 0 and removes the inner-frame gap. Native footer siblings remain intact.

[`tests/message-grouping.browser.js`](../tests/message-grouping.browser.js) failed before this fix and passed afterward on the actual renderer:

- 1920px dark: **8 responses, 29 blocks**.
- 1920px light: **3 responses, 14 blocks**.
- 700px light compact: **3 responses, 14 blocks**.

The regression checks response-level avatars, card borders and adjoining block geometry. It also checks continuation blocks when the start of their response has been virtualized away, and stops a run at unrelated rows or gaps. It does not send messages or change the transcript. Evaluate the complete expression in the native renderer's DevTools console, or through a temporary reviewed diagnostic bridge, after mounting a multi-block answer. A missing continuation block is an unmet test precondition, not a pass. Include a response beginning at block 0 to exercise complete-run geometry as well.

Final typecheck and reload passed. Disabling the revised plugin removed all168 observed markers, all owned nodes and the document registry; re-enabling restored one owner, one style and two auxiliary navigation regions. The grouping regression passed again after re-enable. Removed the diagnostic plugin and verified an empty renderer target list; stopped its bridge, the temporary preview server and this task’s caffeinate. The final plugin catalog contains only the running production plugin, with the dark theme selected and the original1920×1050 native window restored. OpenDesign Studio remains available.

## Design preview

The second OpenDesign artifact was rendered at 1342×750 in both themes and at 390×844 in compact mode. It was compared with the real Feishu reference before production edits. `design/desktop-dark.png` and `design/desktop.png` contain invented data; the preview's simulated actions do not count as native integration checks. See [the design comparison](../design/COMPARISON.md).

## Earlier revision: historical checks

The initial light-only revision passed typecheck, installation, reload and enable with a `running` catalog entry and no load error. Its 306px list and 44px + 32px header measurements were superseded by the current 300px list, 6px gap and 38px + 32px header.

- Status filters hid and restored whole native sections; collapsed groups and project grouping used native controls. Search, display preferences, attachment menus and the appearance command opened their native destinations.
- Native compact navigation opened the actual workspace list, and selection closed it. Sidebar hide/show restored the native menu button and saved width behavior.
- Workspace switching preserved a temporary draft and textarea identity. Loading older history grew content height from 8,354 to 12,422px while Paseo adjusted scroll anchoring.
- Built-in theme changes and disable removed owned nodes, markers and the document registry. Re-enable and reload restored one adapter.
- Two same-document installations shared one adapter with two owners; removing the temporary installation retained the remaining owner. This tested shared ownership, not a real remote-host disconnect.
- That revision's diagnostic plugin and bridge were removed after verification. The current revision’s separate diagnostic session was also removed as recorded above.

## Limits and repeat checks

A live permission request, operating-system IME candidate window, actual file upload, focused/split panes, all pin/show-more combinations and iOS/Android hardware have not been exercised. Preserving native controls does not establish those checks as passed. The native result retains Paseo's state headings and agent controls, which differ from Feishu's contacts and toolbar.

Typecheck before reload. Check both native themes at desktop and compact widths, switch workspaces and tabs, restore a temporary draft without sending, open native search/grouping/attachments, scroll long responses and run the grouping regression. Then verify theme changes, reload, disable and diagnostic cleanup. Keep real chats outside Git and never synthesize permission approval clicks.

## Sidebar callout regression — 2026-09-09

Selecting the reported MR review workspace reproduced the white strip twice. Its native worktree setup alert appeared at x0/y0/w646, overlapping app navigation, groups and the list. The light strip was its primary action button (`foreground` background in the native dark palette). Temporarily removing adapter positioning restored the native slot at the sidebar bottom, isolating the cause to the adapter's omitted callout region.

The adapter now recognizes the native list → callout slot → footer siblings and reserves an intrinsic grid row for the callout in the list column. At1920×1050 the alert is x340/y907.5/w300/h136.5 and the list ends at907.5. Empty callout slots remove the grid markers and restore the list bottom to1044. No alert, action or dismissal is cloned or replaced; the dismissed-state preference is never changed during verification.

The read-only `tests/sidebar-callout.browser.js` failed before the fix (wrong column, list overlap and navigation overlap) and passed afterward at1920×1050,1342×750,1000×750,820×750 and820×500. Both native light/dark appearances passed at desktop width. At700×750, the native compact sidebar retained flex layout and showed the alert within its bounds (x0/y556.5/w350.48/h136.5). Opening the primary action navigated to the matching remote project's settings; no setting was saved. Switching to an ordinary workspace removed both callout markers; switching back restored the slot. A real native screenshot confirmed the top-left overlap is gone.

The layout responds to wrapped alert text without a fixed height or a measuring timer. Its35vh cap retains scroll access for taller notices. Update/Rosetta notices share the audited native slot but were not separately triggered.

After this revision, disable cleared every owned node, marker and adapter registry; re-enable reported running. Removed the temporary diagnostic plugin, verified its renderer target list was empty, and stopped the bridge. The native window was restored to1920×1050. Only the production plugin remains installed locally.
