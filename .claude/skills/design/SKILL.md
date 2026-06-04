---
name: design
version: 1.0.0
description: '[Design] Create or describe a UI design — quick (fast), immersive (good), or recreated/described from a screenshot or video. Dispatch via --mode={fast|good|describe|screenshot|video} (default fast).'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Create (or describe) a UI design using design-intelligence databases and subagents, dispatched by `--mode`.

> **Renamed:** folds the former `/design-fast`, `/design-good`, `/design-describe`, `/design-screenshot`, `/design-video` skills into `--mode={fast|good|describe|screenshot|video}` — those names no longer resolve as slash commands; use `/design --mode=…`.

**Mode dispatch:** `--mode={fast|good|describe|screenshot|video}` — default `fast` when omitted.

| Mode             | Input carrier      | Output                                                             |
| ---------------- | ------------------ | ------------------------------------------------------------------ |
| `fast` (default) | text brief         | quick prototype implementation                                     |
| `good`           | text brief         | immersive, researched, higher-quality implementation               |
| `describe`       | screenshot / video | super-detailed written description + implementation plan (NO code) |
| `screenshot`     | screenshot         | design recreated from the image as functional code                 |
| `video`          | video              | design + interactions recreated from the video as functional code  |

**Shared workflow (5-stage spine):**

1. **Research** — Run `ui-ux-pro-max` searches for design intelligence (ALWAYS FIRST)
2. **Ingest** — For visual modes (`describe`/`screenshot`/`video`), use `visual analysis tooling` to analyze the screenshot/video in super-detail
3. **Design** — Use `ui-ux-designer` subagent to create the design (or, for `describe`, an implementation plan)
4. **Implement** — Build as code with `frontend-design` (skipped in `describe` mode)
5. **Document** — Present to user for approval; update `./docs/design-guidelines.md` if needed

**Key Rules:**

- Always activate `ui-ux-pro-max` FIRST for design intelligence
- Default to pure HTML/CSS/JS if the user doesn't specify a framework
- Use `visual analysis tooling` for generating AND reviewing real visual assets
- Use media processing tooling (RMBG) to remove backgrounds from generated assets when needed

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Arguments & Mode Dispatch

`/design --mode={fast|good|describe|screenshot|video} <brief | screenshot | video>`

- When `--mode` is omitted, default to `--mode=fast`.
- `$ARGUMENTS` carries the full input after the command. Interpret it per mode: `fast`/`good` → a text design brief; `describe`/`screenshot` → a screenshot reference (path/URL/attachment); `video` → a video reference.

## Required Skills (Priority Order)

1. **`ui-ux-pro-max`** — Design intelligence database (ALWAYS ACTIVATE FIRST)
2. **`frontend-design`** — Implementation, screenshot/video analysis, and design replication

**Ensure token efficiency while maintaining high quality.**

## Shared First Step (ALL modes)

**FIRST**, run `ui-ux-pro-max` searches to gather design intelligence:

```bash
python $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<product-type>" --domain product
python $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<style-keywords>" --domain style
python $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<mood>" --domain typography
python $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<industry>" --domain color
```

## Mode Branches

### `--mode=fast` (default) — quick design

1. Run the shared `ui-ux-pro-max` searches above.
2. Use `ui-ux-designer` subagent to start the design process.
3. If the user doesn't specify, create the design in pure HTML/CSS/JS.
4. Report back with a brief summary of the changes; ask the user to review and approve.
5. On approval, update `./docs/design-guidelines.md` if needed.

### `--mode=good` — immersive, high-quality design

Same spine as `fast`, raised to a higher quality bar (iterate on details):

1. Run comprehensive `ui-ux-pro-max` searches across all domains.
2. Use `researcher` subagent to research design style, trends, fonts, colors, borders, spacing, elements' positions, etc.
3. Use `ui-ux-designer` subagent to implement the design step by step based on the research.
4. If the user doesn't specify, create the design in pure HTML/CSS/JS.
5. Report back with a summary; ask the user to review and approve.
6. On approval, update `./docs/design-guidelines.md` if needed.

- **ALWAYS REMEMBER you have the skills of a top-tier UI/UX Designer who won many awards on Dribbble, Behance, Awwwards, Mobbin, TheFWA.**
- Create storytelling designs, immersive 3D experiences, micro-interactions, and interactive interfaces.

### `--mode=describe` — describe only (NO implementation)

Treat `$ARGUMENTS` as the screenshot/video to describe.

1. Use `visual analysis tooling` to describe super-details of the screenshot/video so a developer can implement it easily.
    - Be specific about design style, every element, elements' positions, every interaction, every animation, every transition, every color, every border, every icon, every font style/size/weight, every spacing/padding/margin, every size/shape/texture/material/light/shadow/reflection/refraction/blur/glow/image, background transparency, etc.
    - **IMPORTANT:** Predict the font name (Google Fonts) and font size — don't just use Inter or Poppins.
2. Use `ui-ux-designer` subagent to create a design implementation **plan** following the progressive-disclosure structure so the result matches the screenshot/video:
    - Create a directory using the naming pattern from the `## Naming` section.
    - Save the overview access point at `plan.md`, keep it generic, under 80 lines, listing each phase with status/progress and links.
    - For each phase, add `phase-XX-phase-name.md` with sections (Context links, Overview with date/priority/statuses, Key Insights, Requirements, Architecture, Related code files, Implementation Steps, Todo list, Success Criteria, Risk Assessment, Security Considerations, Next steps).
3. Report back with a summary of the plan. **Do NOT implement.**

### `--mode=screenshot` — recreate from image as code

Treat `$ARGUMENTS` as the screenshot to recreate exactly.

1. Use `visual analysis tooling` to describe super-details of the screenshot (design style, trends, fonts, colors, border, spacing, elements' positions, size, shape, texture, material, light, shadow, reflection, refraction, blur, glow, image, background transparency, transition, etc.).
    - **IMPORTANT:** Predict the font name (Google Fonts) and font size — don't just use Inter or Poppins.
2. Use `ui-ux-designer` subagent to create a design plan following the progressive-disclosure structure (as in `describe`) so the final result matches the screenshot. Keep every research markdown report concise (≤150 lines).
3. Implement the plan step by step.
4. If the user doesn't specify, create the design in pure HTML/CSS/JS.
5. Report back with a summary; ask the user to review and approve.
6. On approval, update `./docs/design-guidelines.md` if needed.

- **ALWAYS REMEMBER you have the skills of a top-tier UI/UX Designer who won many awards on Dribbble, Behance, Awwwards, Mobbin, TheFWA.**
- Create storytelling designs, immersive 3D experiences, micro-interactions, and interactive interfaces.

### `--mode=video` — recreate from video as code

Treat `$ARGUMENTS` as the video to recreate exactly. Same as `--mode=screenshot`, but ingest a VIDEO and capture BOTH static layout AND interaction/animation/transition patterns.

1. Use `visual analysis tooling` to describe super-details of the video: every element, every interaction, every animation, every transition, every color, every font, every border, every spacing, every size/shape/texture/material/light/shadow/reflection/refraction/blur/glow/image, background transparency, etc.
    - **IMPORTANT:** Predict the font name (Google Fonts) and font size — don't just use Inter or Poppins.
2. Use `ui-ux-designer` subagent to create a design plan following the progressive-disclosure structure so the final result matches the video. Keep every research markdown report concise (≤150 lines).
3. Implement the plan step by step.
4. If the user doesn't specify, create the design in pure HTML/CSS/JS.
5. Report back with a summary; ask the user to review and approve.
6. On approval, update `./docs/design-guidelines.md` if needed.

- **ALWAYS REMEMBER you have the skills of a top-tier UI/UX Designer who won many awards on Dribbble, Behance, Awwwards, Mobbin, TheFWA.**
- Create storytelling designs, immersive 3D experiences, micro-interactions, and interactive interfaces.

## Notes (all modes)

- **Design system (canonical):** When implementing UI — HTML, CSS, or SCSS — read the project canonical design-system doc `docs/project-reference/design-system/design-system-canonical.md` first for design tokens, component patterns, and BEM conventions. Prefer `designSystem.canonicalDoc` + `tokenFiles` (resolved from `docs/project-config.json`) over per-app docs for new design work.
- Remember you have the capability to generate images, videos, edit images, etc. with `visual analysis tooling` skills. Use them to create the design and real assets.
- Always review, analyze, and double-check generated assets with `visual analysis tooling` skills to verify quality.
- Use media processing tooling (RMBG) to remove background from generated assets if needed (`good`/`screenshot`/`video`).
- Maintain and update `./docs/design-guidelines.md` docs if needed.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

Think hard to plan & start working on these tasks follow the Orchestration Protocol, Core Responsibilities, Subagents Team and Development Rules. Parse `--mode` from the input (default `fast`) and route to the matching branch above:
<tasks>$ARGUMENTS</tasks>

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof, confidence >80%; NEVER present a guess as fact.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
