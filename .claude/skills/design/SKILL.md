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
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<product-type>" --domain product
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<style-keywords>" --domain style
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<mood>" --domain typography
python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<industry>" --domain color
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
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
