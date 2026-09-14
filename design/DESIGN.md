# Feishu desktop reference

Status: OpenDesign generation succeeded; light/dark rendered desktop comparison completed on 2026-09-07. See `COMPARISON.md`.

## Target

Reproduce the user's current Feishu desktop visual language while keeping Paseo's agent and workspace workflows. The reference uses expanded app navigation and a separate grouping column, rather than a narrow icon-only rail.

## Measured frame

Reference viewport: 1342 × 750 logical pixels, captured on macOS at 2026-09-07 02:04 Asia/Shanghai.

| Region | Geometry | Appearance |
| --- | --- | --- |
| App navigation | x=0–180, full height | Soft blue-gray fill, 36 px navigation rows, outline icons, 14 px labels |
| Group navigation | x=180–340, inset 6 px vertically | Cool gray fill, softly rounded left corners, 36 px rows |
| Conversation list | x=340–640 | Near-white fill, 60 px conversation rows, 36 px circular avatars |
| Conversation | x=646–1336 | Near-white canvas, fine separators, 32–36 px avatars |
| Header | 70 px tall (38 + 32) | Title and compact actions, then a tabs row |
| Composer | x=666–1316, bottom=724 | White fill, thin gray border, 8 px radius, muted toolbar |

Body labels appear to use the macOS system/PingFang SC sans-serif family. Match perceived weight and density using system fonts. Titles are around 16 px semibold, primary labels 14 px, and secondary labels 12–13 px. Avoid oversized dashboard headings.

## Color targets

| Token | Value | Role |
| --- | --- | --- |
| navigation | `#e7ebf7` | Expanded app rail |
| groups | `#f1f3f5` | Group column |
| canvas | `#fafafa` | List and conversation |
| paper | `#fdfdfd` | Composer and elevated white surfaces |
| selected | `#e5ebf9` | Current conversation |
| group-selected | `#dee6f5` | Current group |
| accent | `#3370ff` | Feishu-style blue controls |
| text | `#1f2329` | Primary text |
| secondary | `#646a73` | Secondary labels |
| muted | `#8f959e` | Timestamps and outline icons |
| border | `#dee0e3` | Dividers and control borders |

Fills above are dominant sampled colors, except text/accent/border targets chosen from the reference's visual appearance. The screenshot contains slight capture variation and watermarks. Do not optimize for those artifacts.

## Paseo mapping

- App navigation holds meaningful Paseo entry points: workspaces, history, schedules, projects and settings.
- Groups describe existing workspace states and filters.
- Conversations represent real Paseo workspaces; selection opens their native agent tabs.
- The conversation pane retains native messages, streaming, tools, code, file links, permission cards and composer.
- Narrow widths collapse auxiliary columns progressively. The active conversation and composer must remain usable.

## Comparison gate

Before implementation, generate the OpenDesign artifact and render it at the reference viewport. Compare region boundaries, dominant fills, typography, row spacing, selection, header, and composer against the local reference. Record concrete differences and corrections. Use fabricated sample content in deliverables; keep the user's real chats, avatars and watermarks outside the repository.

## Dark revision and pane separation

The v2 reference was captured from the user's running Feishu dark window. The corrected third column is 300px: the remaining6px before x646 is an actual gutter, not part of the list. Group/list and conversation panels have8px outer corners and6px top/bottom insets; right outer inset6px. Both themes use this geometry. See `DESIGN-TOKENS.md` for independent dark/light palettes and `desktop-dark.png` / `desktop.png` for sanitized previews.

Native implementation uses native Appearance theme selection. Decorative assistant/user icons convey roles only; agent identity, times, tools and permission controls remain native. Tool entries stay in their native timeline rows, because regrouping them into the mockup's assistant card would change timeline ownership. Desktop responsive boundaries retain the tested Paseo/macOS safe widths (1180 /950 /760), including room for window controls.
