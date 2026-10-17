# fix — `--target=ui` — UI / visual-defect branch

> Read by `/fix --target=ui` FIRST, before any other step of the branch (the router `SKILL.md` → **Target Routing**). The Debug Mindset, Confidence & Evidence Gate, Root-Cause Prerequisite Gate and the `SYNC:*` protocol bodies this branch cites live in `SKILL.md`.

## `--target=ui` — UI / visual-defect branch

**Goal:** Diagnose and fix UI/UX issues — layout, styling, responsiveness, and visual bugs.

**Key Rules:**

- Follow the project's documented styling and class-naming convention; use BEM only when the project selects it. Treat styling classes as styling hooks, not semantic E2E locators.
- Check responsive states and sizes supported by the target platform; use breakpoints only where that platform supports them.
- **Pre-read (design authority):** read configured design-system docs and token files when present. Otherwise follow the project's frontend references, accepted ADRs, and observed source; do not invent a shared token system or canonical component classes.

**Required skills (when applicable):** `ui-design` (local design-intelligence search + implementation patterns) → `web-design-guidelines` for web surfaces or the target platform's accessibility guidance for non-web UI (use project guidance when present, otherwise its native standard) → `ui-design --mode=review` (source-level review when applicable).

**Workflow:**

**FIRST** — use the `ui-design` skill's local search to understand context and common issues:

```bash
# Windows: py -3 · macOS/Linux: python3 (same arguments)
py -3 .claude/skills/ui-design/scripts/search.py "<product-type>" --domain product
py -3 .claude/skills/ui-design/scripts/search.py "<style-keywords>" --domain style
py -3 .claude/skills/ui-design/scripts/search.py "accessibility" --domain ux
py -3 .claude/skills/ui-design/scripts/search.py "z-index animation" --domain ux
```

If the user provides screenshots/videos, use the `visual analysis tooling` skill to describe the issue in detail so developers can predict the root causes.

> **🛑 After identifying the UI root cause, present findings + proposed fix → `ask user question tool` → wait for approval before any code change.**

1. Use the `ui-ux-designer` subagent to implement the fix against the configured design authority, or the brief and observed project conventions when no design system is configured.
2. Capture the affected view and state with platform-supported visual tooling when available, then analyze it with the appropriate visual-analysis skill. Repeat until addressed.
3. Use platform-appropriate automation or interaction checks to verify the fix against the design authority.
4. Use the `tester` subagent to compile and test; report back. Repeat until all tests pass.
5. **If the user approves:** run the `docs-manager` subagent to update `./docs`, and update plan progress inline in the main session.
6. Report a summary; suggest next steps.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.
