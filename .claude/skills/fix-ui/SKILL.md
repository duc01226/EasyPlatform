---
name: fix-ui
version: 1.0.0
description: '[Implementation] Analyze and fix UI issues'
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/understand-code-first-protocol.md` AND `.claude/skills/shared/evidence-based-reasoning-protocol.md` before executing.

> **Skill Variant:** Variant of `/fix` — UI/UX visual issue diagnosis and fix.

## Quick Summary

**Goal:** Diagnose and fix UI/UX issues including layout, styling, responsiveness, and visual bugs.

**Workflow:**
1. **Identify** — Locate the component/template causing the visual issue
2. **Diagnose** — Trace CSS/HTML/component logic to find root cause
3. **Fix** — Apply targeted fix (SCSS, template, component logic)
4. **Verify** — Check responsive behavior and cross-browser rendering

**Key Rules:**
- Debug Mindset: every claim needs `file:line` evidence
- Always use BEM classes on template elements
- Check responsive breakpoints when fixing layout issues

## Debug Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking. Every claim needs traced proof.**

- Do NOT assume the first hypothesis is correct — verify with actual code traces
- Every root cause claim must include `file:line` evidence
- If you cannot prove a root cause with a code trace, state "hypothesis, not confirmed"
- Question assumptions: "Is this really the cause?" → trace the actual execution path
- Challenge completeness: "Are there other contributing factors?" → check related code paths
- No "should fix it" without proof — verify the fix addresses the traced root cause

## ⚠️ MANDATORY: Confidence & Evidence Gate

**MUST** declare `Confidence: X%` with evidence list + `file:line` proof for EVERY claim.
**95%+** recommend freely | **80-94%** with caveats | **60-79%** list unknowns | **<60% STOP — gather more evidence.**

## Required Skills (Priority Order)

1. **`visual-component-finder`** - If screenshot/image provided, use to identify the component FIRST
2. **`ui-ux-pro-max`** - Design intelligence database
3. **`web-design-guidelines`** - Design principles
4. **`frontend-design`** - Implementation patterns

Use `ui-ux-designer` subagent to read and analyze `./docs/design-guidelines.md` then fix the following issues:
<issue>$ARGUMENTS</issue>

## Workflow

**FIRST** (after identifying component via `visual-component-finder` if screenshot provided): Run `ui-ux-pro-max` searches to understand context and common issues:

```bash
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<product-type>" --domain product
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<style-keywords>" --domain style
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "accessibility" --domain ux
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "z-index animation" --domain ux
```

If the user provides a screenshots or videos, use `ai-multimodal` skill to describe as detailed as possible the issue, make sure developers can predict the root causes easily based on the description.

1. Use `ui-ux-designer` subagent to implement the fix step by step.
2. Use screenshot capture tools along with `ai-multimodal` skill to take screenshots of the implemented fix (at the exact parent container, don't take screenshot of the whole page) and use the appropriate Gemini analysis skills (`ai-multimodal`, `video-analysis`, or `document-extraction`) to analyze those outputs so the result matches the design guideline and addresses all issues.

- If the issues are not addressed, repeat the process until all issues are addressed.

3. Use `chrome-devtools` skill to analyze the implemented fix and make sure it matches the design guideline.
4. Use `tester` agent to test the fix and compile the code to make sure it works, then report back to main agent.

- If there are issues or failed tests, ask main agent to fix all of them and repeat the process until all tests pass.

5. Project Management & Documentation:
   **If user approves the changes:** Use `project-manager` and `docs-manager` subagents in parallel to update the project progress and documentation:
    - Use `project-manager` subagent to update the project progress and task status in the given plan file.
    - Use `docs-manager` subagent to update the docs in `./docs` directory if needed.
    - Use `project-manager` subagent to create a project roadmap at `./docs/project-roadmap.md` file.
    - **IMPORTANT:** Sacrifice grammar for the sake of concision when writing outputs.
      **If user rejects the changes:** Ask user to explain the issues and ask main agent to fix all of them and repeat the process.
6. Final Report:

- Report back to user with a summary of the changes and explain everything briefly, guide user to get started and suggest the next steps.
- Ask the user if they want to commit and push to git repository, if yes, use `git-manager` subagent to commit and push to git repository.
- **IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
- **IMPORTANT:** In reports, list any unresolved questions at the end, if any.

**REMEMBER**:

- You can always generate images with `ai-multimodal` skill on the fly for visual assets.
- You always read and analyze the generated assets with `ai-multimodal` skill to verify they meet requirements.
- For image editing (removing background, adjusting, cropping), use `media-processing` skill as needed.
- **IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
