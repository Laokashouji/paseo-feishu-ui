# Tool header audit — 2026-09-18

Scope: the installed Paseo 0.8.0 desktop app, both open windows, and the adapter's header rules. Live evidence covers mounted rows, including cached tabs, not every historical row or every possible provider tool. No conversation text or private screenshots are included here.

| Header kind | Current presentation | Evidence |
| --- | --- | --- |
| Task activity: added, started, completed | Native icon + task text; status heading visually hidden in 0.3.5 | Reported conversation, browser regression |
| Task creation count without task text | One visible heading | Host rendering contract, browser regression |
| Shell / Terminal with command | One command line | Mounted desktop cards, existing regression |
| Read / Edit / Write with path | Native icon + path | Mounted desktop cards, existing regression |
| Explore with description | Search icon + description | Existing regression and 0.3.3 verification |
| Search with summary | **Two lines: action + search summary** | Mounted desktop cards |
| Task notification with summary | **Two lines: notification title + summary** | Reported conversation and other mounted tabs |
| Other tools or tool groups with a summary | Default two-line header unless covered above | Adapter rule; not all provider variants reproduced |
| Taskcreate / Taskupdate / Tasklist without summary | One tool-name line | Mounted desktop cards |

Other default two-line candidates include Glob, Grep, Fetch and WebSearch when the host supplies a secondary summary. These are code-path possibilities, not additional live reproductions. File, Explore and task previews fall back to a visible title when their secondary text is missing or blank. Expanded card details are intentionally multiline and are outside this header audit.
