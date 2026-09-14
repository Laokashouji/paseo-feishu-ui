# Rendered comparison, 2026-09-07

OpenDesign 0.21.1 / open-design-mode 0.5.3 generated the initial artifact with the user's selected Local Codex mode. Run and artifact identity are in `provenance.json`. The generation succeeded; its own image export failed. The implementation owner then rendered the actual generated HTML in a Paseo browser viewport and compared its screenshot to the private real Feishu window capture.

At 1342 × 750 CSS pixels, measured column edges are exactly 180, 340 and 646 px. Group rail y=6 and height=738, conversation header height=76, navigation/list backgrounds #e7ebf7 / #fafafa, group fill #f1f3f5, list rows 60 px, and avatars 36 px match the measured reference.

Visual corrections to the exported copy: reduced navigation label weight to 450, changed conversation names to 14 px / 500, reduced composer corner radius from 10 to 8 px and shadow strength, and aligned desktop composer insets to 21 px left, 25 px right and bottom. `desktop.png` is the corrected, fabricated-content rendering at 2× scale.

Intentional Paseo differences: the input retains room for agent/model/permission controls; status groups represent Paseo workspaces; there are no fabricated Feishu contacts, services or unread totals in the production plugin. Preserve native tool/permission cards and virtualized history rather than force chat bubbles on every output type. The reference's large pinned contact grid has no direct native equivalent.

The corrected design also rendered at 640 × 750 without horizontal overflow. It showed the conversation and a 620 px composer, with navigation/list accessible through its back control. Runtime plugin widths and native behavior require separate validation.

## V2: real Feishu dark reference, 2026-09-07

OpenDesign run9298aad5-7247-4a5f-bb59-dcd31702e95c succeeded with deliverableValid=true and artifact version722a9d71-c758-4cab-8720-14130a84a10d. Same project/conversation, previously selected Local Codex. Dark screenshot stayed under ignored `.local/reference`.

Before production edits, rendered the artifact in Paseo's browser at1342×750. Measured nav x0 w180, groups x180 y6 w160 h738, list x340 y6 w300 h738, conversation x646 y6 w690 h738. Composer x666 y608 w650 h116. This matches the corrected reference's actual6px gutter and independent rounded panes. Visually compared the real dark window and sanitized dark preview: retained purple/blue-gray rail, charcoal canvas, raised gray assistant cards, restrained blue selection and thin composer border. The light toggle retained identical geometry and its own surface colors. Captured both sanitized images.

Also rendered390×844: full-width chat, wrapping prose/code and visible composer. The design's floating composer requires scrolling to see the entire long card; production keeps the native flow composer and native permission rows. Synthetic design content and actions are illustrations, not claimed native test results.


Native message rendering correction: the host splits one assistant message into independently measured Markdown blocks. Each block initially received a complete card, which fragmented one answer. The adapter now joins exact native block groups, showing one avatar and one continuous border; it retains native tool rows and completion/copy controls. The committed native-renderer regression first failed on this symptom, then passed in both palettes, compact layout and a partially mounted virtual response.
