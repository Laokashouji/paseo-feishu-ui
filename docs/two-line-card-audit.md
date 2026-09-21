# Tool header audit — 2026-09-21

Scope: the installed Paseo 0.8.0 desktop app, both open windows, and the adapter's header rules. Live evidence covers mounted rows, including cached tabs, not every historical row or every possible provider tool. No conversation text or private screenshots are included here.

| Header kind | Current presentation | Evidence |
| --- | --- | --- |
| Task activity: added, started, completed | Native icon + task text; status heading visually hidden in 0.3.5 | Reported conversation, browser regression |
| Task creation count without task text | One visible heading | Host rendering contract, browser regression |
| Shell / Terminal with command | One command line | Mounted desktop cards, existing regression |
| Read / Edit / Write with path | Native icon + path | Mounted desktop cards, existing regression |
| Explore with description | Search icon + description | Existing regression and 0.3.3 verification |
| Search with summary | Native icon + search summary on one line in 0.3.6 | Browser regression; plugin reloaded, native card appearance unverified |
| Task notification with summary | Native icon + notification summary on one line in 0.3.6 | Browser regression; plugin reloaded, native card appearance unverified |
| Custom tool title repeating its identifier summary | Native icon + original summary on one line in 0.3.7; comparison ignores case and space/underscore/hyphen separators | Mounted desktop reproduction, browser regression |
| Other tools or tool groups with a summary | Default two-line header unless covered above | Adapter rule; not all provider variants reproduced |
| Taskcreate / Taskupdate / Tasklist without summary | One tool-name line | Mounted desktop cards |

Other default two-line candidates include Glob, Grep, Fetch and WebSearch when the host supplies a distinct secondary summary. These are code-path possibilities, not additional live reproductions. File, Explore, task, Search, Task notification and duplicate-title previews fall back to a visible title when their secondary text is missing or blank. Duplicate-title matching is limited to individual tool badges; distinct descriptions and aggregate groups retain their headings. Expanded card details are intentionally multiline and are outside this header audit.
