# Thinking and tool-call preview

OpenDesign generated the cross-platform polished core-flow prototype on 2026-09-14 using Local Codex. `index.html` is a standalone copy of the reviewed OpenDesign artifact `thinking-tools.html`. The production plugin was not changed or reloaded during design review. The user subsequently approved implementation; version 0.3.0 applies this direction to native desktop/browser badges. See ../../docs/verification.md for implementation checks and native mobile limits.

## Direction

- Compact individual thinking/tool rows, a shared icon/status/disclosure alignment, subtle completed states, restrained blue running and red failure states.
- Details expand in place; commands scroll inside their own code area. Completed thinking uses explicitly provided sample summary text. Running thinking without a summary shows only its state and an unavailable-summary message.
- One assistant message retains a coherent visual context. This preview does not split paragraphs or logs into new chat replies.
- Permission confirmation is outside the optional whole-process collapse. Whole-process collapse is marked as a future concept; independent timeline-row styling is the implementation priority.
- Dark/light themes use the existing Feishu palettes. Mobile rows remain compact and the composer occupies its own layout space.

## Browser review

Reviewed in local Chrome at 1342 × 850 and 390 × 844, in dark/light themes. Theme switching, individual expansion/collapse, five preview states, permission visibility during whole-process collapse and local permission refusal were exercised. No JavaScript errors or document horizontal overflow were observed. The expanded mobile code area is approximately 303 px wide while its content is approximately 845 px wide, with internal horizontal scrolling. Mobile disclosure rows are 57 px tall; theme and permission controls are at least 44 px tall.

The first review found mobile composer overlap and an aria-expanded mismatch after switching to awaiting; both were corrected in the OpenDesign artifact and the relevant checks repeated. The mobile layout is a browser prototype, not verification in the official iOS Paseo app. Clipboard copying is present but was not exercised against the system clipboard.

## Integration boundary

This is design review only. Official iOS bubble/timeline styling remains subject to Paseo host API support. Do not treat this HTML as an installed native renderer, reparent native timeline records into a synthetic message, or hide native permission/attachment/rewind controls to imitate the prototype.

## User refinements after implementation

On 2026-09-14 the user requested one continuous visual bubble for thinking/tools/body, the first command line instead of “运行命令”, and the first exposed thought line instead of “思考”. Version 0.3.1 applies those refinements with centered icon/text rows. Native rows remain separate for virtualization; only their visual frame edges join. The archived prototype above is the original approved design, not a claim of exact final markup.

The user then chose option A for file operations: native icon plus path, on one line. Version 0.3.2 hides the visual Read/Edit/Write heading only when a nonempty path is present, while retaining its accessible action name and the native path, disclosure, and open-file control. Long paths use single-line ellipsis; path normalization remains owned by Paseo. Other tool categories retain their existing presentation.

On 2026-09-16 the user requested a search icon and a single description line for Claude Code Explore cards. Version 0.3.3 hides the visual Explore heading when a description is present, centers the search icon with the description, and preserves native details, disclosure and status detection. The accessible title remains, and an empty description restores the visible title. Other subagent names retain their native icon and existing layout.
