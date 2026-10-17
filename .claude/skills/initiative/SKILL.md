---
name: initiative
version: 1.3.0
description: '[Project Management] Use when a workflow step or the user asks for an initiative: a structured product idea or feature request ready for task refinement.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Run declared skill steps in order. NEVER skip, reorder, or merge without explicit user approval.
> **[BLOCKING]** Update task tracking before/after each step or sub-skill: `in_progress` → `completed`.
> **[BLOCKING]** Completed steps need brief evidence; skipped steps need an explicit reason.
> **[BLOCKING]** If Task tools are unavailable, maintain an equivalent tracker with synchronized statuses.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **Renamed:** formerly `/idea`; use `/initiative`. The old slash command has no alias. `/work-item --mode=refine` turns the initiative into delivery work.

> **AI-SDD Artifact Contract (M1–M7):** Initiatives stay tech-agnostic business intent; logical IDs belong downstream, and abstract `[Source: namespace/service/id]` anchors stay in a separate evidence carrier. Keep physical code coordinates and repository paths out of portable narrative.
> MUST ATTENTION READ `.claude/skills/shared/sdd-artifact-contract.md` for full mandate and carrier rules.
> **Project Protocol Overlay:** Resolve only the most-specific matching tier; derive body paths from overlay names, report malformed or missing bodies, and apply surviving rules additively without waiving framework or user-confirmation gates.
> MUST ATTENTION READ `.claude/skills/project-skill-protocol/references/registry.md` for the full resolution contract.

> **Work tracking:** Keep the project's tracked work current in the same change, as its root instructions (`CLAUDE.md` or `AGENTS.md`) say. When the project uses the portable tracker (`taskTracking.mode` is `observe` or `linked`), read [the linked work integration guide](../task-track/references/integration-guide.md) at capture, start, saved-work, verification, handoff and close-out checkpoints. Use the actual linked producer and exact items; retain the primary outcome and record optional upkeep once through the common owner. Continue untracked when no link exists; acceptance remains explicit.
>
> **Work record shape:** The initiative file is a work record owned by `/task-track`. Read [Records another skill authors](../task-track/references/integration-guide.md#records-another-skill-authors) before writing or editing it: `status: draft` on capture, no assignee, and no decision or priority key of this skill's own. Approval and every later status, and the initiative's type, priority level, due date and areas, are tracker values recorded through `/task-track`; tracker-owned fields of a tracked record change only there.

## Quick Summary

**Goal:** Turn a vague product idea into a validated, tech-agnostic, module-anchored initiative artifact ready for `/work-item --mode=refine` to convert into a task — preserving problem intent without leaking solution or stack choices.

**Summary:**

- **Purpose:** capture raw idea as structured, validated initiative artifact; preserve problem intent, keep the problem statement tech-agnostic with no solution/stack/IDs, and hand clean narrative to `/work-item --mode=refine`.
- **Main steps/tasks (run in order):** (1) Gather problem/value/users/scope; (2) Generate `INITIATIVE-{YYMMDD}-{NNN}` draft from `initiative-template.md`; (3) Capture problem/value/users; (4) Detect module through project structure and selected-profile canonical indexes/owners silently, prompting only if ambiguous/no match; (5) Load feature context (8-12K tokens: entities, BR-/TC patterns); (6) Save canonical artifact; (6.5) **Discovery Interview** — ONE interview of 4-6 `ask user question tool` questions; (7) **Validation Summary** — written from those answers, then ONE short unconditional `ask user question tool` confirming the revised problem statement / scope (not a second interview); (8) Suggest `/work-item --mode=refine`.
- **Modes/gates:** Existing repo → silently detect module and load context; Greenfield → skip module detection and structure reads, use market/WebSearch context, ask business questions more often, and NEVER ask about tech stack. The Discovery Interview (Step 6.5: 4-6 questions incl. always-on testability, each category asked once) and the Validation Summary with its one confirm question (Step 7) are NON-NEGOTIABLE.
- **Output:** Persist to `initiatives/{YYMMDD}-{role}-initiative-{slug}.md` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path) with `t_shirt_size`; downstream task owns `FR-`/`BR-` IDs and inherits the clean narrative.

> **MANDATORY IMPORTANT MUST ATTENTION** TaskCreate task to READ `project-structure-reference.md` — project patterns and structure. Not found → search project documentation, coding standards, architecture docs.

**Workflow:**

1. **Gather Info** — Ask problem, value, scope, target users
2. **Generate Artifact** — Create `INITIATIVE-YYMMDD-NNN` file from template with `draft` status
3. **Capture Details** — Record problem statement, value, target users
4. **Detect Module** — Auto-match module and load feature context from docs
5. **Load Context** — Read related module/feature docs within the 8-12K budget
6. **Save Artifact** — Persist to the canonical initiatives path
6.5. **Discovery Interview** — ONE interview: `ask user question tool` 4-6 structured questions (MANDATORY)
7. **Validation Summary** — derived from the interview answers, then ONE unconditional confirm `ask user question tool` on the revised problem statement / scope (MANDATORY)
8. **Suggest Next** — Point to `/work-item --mode=refine` for task creation

**Key Rules:**

- Output: `initiatives/{YYMMDD}-{role}-initiative-{slug}.md` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path)
- Validation NEVER optional — MANDATORY.
- Auto-detect module silently; prompt only when ambiguous or no match.
- MUST ATTENTION include `t_shirt_size` (XS/S/M/L/XL) in artifact for early sizing
- **[BLOCKING] Tech-agnostic output (M1):** Keep the problem statement tech-agnostic in all modes per `spec-principles.md` §3 in the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path); name no framework/product/language/design-pattern; defer stack preference to tech research.
- **M3 Logical-ID Assignment (forward to task):** Initiatives assign no logical IDs. When advanced via `/work-item --mode=refine`, the task assigns `FR-`/`BR-` IDs as the PRIMARY citation spine and carries `[Source: namespace/service/id]` abstract anchors separately from business-intent prose; never put physical code coordinates or repository-root paths in the initiative. Keep problem/value narrative free of source identifiers so the task inherits it cleanly.

## Contents

- [Quick Summary](#quick-summary)
- [Greenfield Mode](#greenfield-mode)
- [Detailed Workflow](#detailed-workflow)
- [Output Formats](#output-formats)
- [Examples](#examples)
- [Next Steps](#next-steps)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Greenfield Mode

> **Auto-detected:** No codebase means no discovered source directories, manifest files, or populated `project-config.json`; planning artifacts (`docs/`, `plans/`, `.claude/`) don't count. Require actual code directories with content.

**Greenfield actions:**

1. Skip module detection (no modules exist yet)
2. Skip `project-structure-reference.md` (won't exist)
3. Focus on market gap, competitors, differentiation
4. Keep problem statement tech-agnostic
5. Enable WebSearch for market/competitor context
6. Increase `ask user question tool` frequency — capture vision, constraints, team profile, scale expectations
7. **[CRITICAL] NEVER ask about tech stack during initiative capture.** Stack is a research-driven decision AFTER full business analysis (business-evaluation phase); acknowledge volunteered preferences, then defer to tech-stack research.

## Detailed Workflow

### Step 1: Gather Information

- No title → ask: "What's the idea in one sentence?" Ask: "What problem does this solve?" "Who benefits from this?" "Any initial scope thoughts?"

### Step 2: Generate Artifact

- Template: `.claude/docs/team-artifacts/templates/initiative-template.md` (framework-owned path — NOT the configurable team-artifacts root in `docs/project-config.json`); ID: `INITIATIVE-{YYMMDD}-{NNN}` (the next number no existing record uses); `intent`: one sentence stating the outcome; status: `draft`.

### Step 3: Capture Details

- Document problem statement, expected value, and target users.

### Step 4: Detect Project Module

**Dynamic Discovery:**

1. Resolve modules and canonical artifact owners from config, required references and existing indexes. A valid native contract supplies its own owner/roles/identifiers; absent-profile strict defaults may use module/bucket READMEs and canonical `README.*.md` owners. Invalid/unresolved declarations stay BLOCKED. Match initiative intent to this discovered structure; a filename alone does not select a profile.

| Scenario             | Action                                                                          |
| -------------------- | ------------------------------------------------------------------------------- |
| Clear match          | Auto-detect — NEVER show confidence levels                                      |
| Ambiguous / no match | Prompt: "Which project module?" + Glob results + "Cross-cutting/Infrastructure" |
| 2+ modules detected  | Load ALL modules, add all to `related_features`                                 |

**If module detected:**

1. Read the discovered module/index overview and relevant owner sections; use verified navigation to select the related capabilities. Do not require a module README or treat a preview as a complete required read.
2. Add frontmatter: `module: {detected_module}`, `related_features: [Feature1, Feature2]`.

### Step 5: Load Feature Context

1. Read the selected module/index overview and identify the closest capability owner(s).
2. Read relevant intent/contracts/evidence using the resolved profile; extract related concepts, rules and case identities. `BR-`/`TC-` are absent-profile examples, never a parallel namespace for native owners. Keep the context budget and explicit missing-owner gaps.

**Token Budget:** Target 8-12K tokens total.

### Step 6: Save Artifact

- Path: `initiatives/{YYMMDD}-{role}-initiative-{slug}.md` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path); infer role from context or ask; include detected domain context.

> **Artifact Path (canonical convention)** — Command `/initiative` → base path `initiatives/` inside the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path), role token `po`, type `initiative`. Filename pattern: `{YYMMDD}-{role}-{type}-{slug}.md` → e.g. `260119-po-initiative-dark-mode-toggle.md`. Slug = lowercased basename, non-alphanumeric → `-`, trimmed, max 50 chars.

- **Work record hand-off:** the saved file follows [Records another skill authors](../task-track/references/integration-guide.md#records-another-skill-authors). When `taskTracking.mode` is `observe` or `linked`, or the user asks for tracking, offer once to track it through `/task-track --mode=maintain`, handing over what the capture settled (its type, and a priority level, a due date or an area when the user stated one) for that section's hand-off to record; otherwise continue untracked. On an initiative that already has a `tracking` block, edit only the body and this skill's own keys. Capturing or validating an initiative never approves it: approval is a person's decision recorded through `/task-track --mode=lifecycle`.

### Step 6.5: Discovery Interview (MANDATORY — the ONE interview)

> **Decision log:** inside a workflow, read the run's `## Decisions` first (`/start-workflow` → Step Execution Protocol, Decision log): ask only what it leaves open or new evidence reopened, cite reused answers instead of asking again, and append every new answer.

Apply the Decision Interview protocol: brief the user first on the drafted problem, value, users and scope, then ask. Use `ask user question tool` for 4-6 structured questions, a hard cap for this interview, batched into as few calls as the tool allows; each question MUST ATTENTION be a decision card with 2-4 options, what each option gives and costs, and one marked "(Recommended)" with its reason. Every category is asked AT MOST ONCE across this skill — there is no second question round on the same category. Ask a question only after the answers it depends on: a category that depends on an earlier answer goes in a later call.

| Category        | Purpose                           | Example                                   |
| --------------- | --------------------------------- | ----------------------------------------- |
| Problem Clarity | Distinguish problem from solution; confirm the statement is user-focused | "What problem does this solve?" + options |
| User Persona    | Identify primary user             | "Who benefits most?" + role options       |
| Scope           | MVP vs full vision; boundaries to settle now | "What's the smallest valuable version?"   |
| Testability     | Define done?                      | "How would you verify this works?"        |
| Impact / Value  | Business value sizing             | "What value, and how many users/processes affected?" |
| Constraints     | Known blockers                    | "Any technical/business constraints?"     |
| Scale           | Expected load/growth              | "How many users/transactions expected?"   |
| Stakeholders    | Who else should review            | "Who else should review this initiative?"       |

> **Greenfield:** NEVER include tech-stack questions; focus on business problem, users, scale, constraints.

**Testability Question (ALWAYS include):** "How would you verify this feature works correctly?" — Options: manual test steps, automated test criteria, metric thresholds.

Document all answers under `## Discovery Interview`, and list each category the cap left unasked as `Not asked` (`/work-item --mode=refine` reads this section and asks only the categories it leaves unanswered).

### Step 7: Validation Summary (MANDATORY — derived summary + ONE confirm question, not a second interview)

Write `## Validation Summary` from the Discovery Interview answers: the confirmed decisions and the follow-up action items, and update the artifact from them. Then ALWAYS ask ONE short `ask user question tool` ("Is the revised problem statement / scope right?") confirming it, whether or not the answers changed the Step 3 text; no other question is asked in this step.

**Validation Output Format:**

```markdown
## Validation Summary

**Validated:** {date}

### Confirmed

- {decision}: {user choice}

### Action Items

- [ ] {follow-up if any}
```

### Step 8: Suggest Next Step

After capture, use `ask user question tool`:

1. `/work-item --mode=refine` — Refine into task (Recommended)
2. `/spec [mode=tests]` — Jump straight to test spec
3. `/plan` — Start implementation planning

Output: "Initiative captured! To refine into a task, run: `/work-item --mode=refine {filename}`". If detected, add: "Module context from {module} will be used during refinement."

## Output Formats

### Domain Context Section

```markdown
## Domain Context (Project Features)

### Module

{module_name}

### Related Features

- {Feature1} - [docs link]
- {Feature2} - [docs link]

### Domain Entities

- **Primary:** {Entity1}, {Entity2}
- **Related:** {Entity3}

### Existing Business Rules

- BR-{MOD}-XXX: {Brief description}
```

### UI Sketch Section

```markdown
## UI Sketch

### Layout

{Rough ASCII wireframe — see UI wireframe protocol}

### Key Components

- **{Component}** — {purpose} _(project owner/boundary; tier only when the project defines one)_
```

> Search existing libs before proposing new components.
> Backend-only initiative: `## UI Sketch` → `N/A — Backend-only change. No UI affected.`

## Examples

Paths below show the default team-artifacts root; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides it.

```bash
/initiative "Dark mode toggle for settings"
# Creates: <team-artifacts root>/initiatives/260119-po-initiative-dark-mode-toggle.md

/initiative "Add goal progress tracking notification"
# Creates with module context: <team-artifacts root>/initiatives/260119-po-initiative-goal-progress-notification.md
```

---

## Next Steps

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`/start-workflow` → Step Execution Protocol, Workflow-step mode).

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** After completion, use `ask user question tool`:

- **"/work-item --mode=refine (Recommended)"** — Transform initiative into actionable task
- **"/web-research"** — Initiative needs market research first
- **"Skip, continue manually"** — user decides

---

> **[IMPORTANT]** Before starting, use `TaskCreate` for small tasks. Keep task depth proportional to the work.

> **External Memory:** For complex/lengthy research, analysis, scans, or reviews, write intermediate findings to `tmp/reports/` — prevents context loss and preserves a deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, or recommendation needs `file:line` proof or traced evidence; confidence >80% acts, <80% verifies first.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `decision-interview` — Brief the user, then ask every material decision as a decision card in dependency-ordered rounds; asking the user to confirm, choose or validate decisions → .claude/skills/shared/protocols/decision-interview.md
- `sequential-thinking-protocol` — Structured multi-step reasoning with revision, branch and hypothesis markers; planning, debugging or reviewing complex or ambiguous work → .claude/skills/shared/protocols/sequential-thinking-protocol.md
- `ui-wireframe` — Wireframe from the design inputs using the project's component owners; sketching a user interface → .claude/skills/shared/protocols/ui-wireframe.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:decision-interview:reminder -->

**MUST ATTENTION** interview: look up facts yourself · brief before the first question · ask every material decision the hosting skill's budget allows, in dependency order, as a decision card (options with gains and costs, a reasoned recommendation) · never pad or self-answer · play answers back and record unasked decisions as unconfirmed.

<!-- /SYNC:decision-interview:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** use structured reasoning for complex or ambiguous work, implicitly when visible markers would clutter. Verify hypotheses, revise assumptions, and close with confidence, assumptions, open questions and a concrete next action.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** Run declared steps in order; NEVER skip, reorder, or merge without explicit user approval.
**IMPORTANT MUST ATTENTION** Set task `in_progress` before each step/sub-skill; set `completed` after.
**IMPORTANT MUST ATTENTION** Completed steps need concise evidence; skipped steps need explicit reasons.
**IMPORTANT MUST ATTENTION** If Task tools unavailable, maintain an equivalent synchronized tracker.

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Turn a vague product idea into a validated, tech-agnostic, module-anchored initiative artifact ready for `/work-item --mode=refine` to convert into a task — preserving problem intent without leaking solution or stack choices.

**IMPORTANT MUST ATTENTION — Main steps (run in order, NEVER skip/reorder):** (1) Gather info; (2) Generate artifact `INITIATIVE-{YYMMDD}-{NNN}` draft from `initiative-template.md`; (3) Capture problem/value/users; (4) Detect module through project structure and selected-profile canonical indexes/owners; (5) Load feature context (8-12K budget); (6) Save to canonical path; (6.5) Discovery Interview (ONE interview, `ask user question tool` 4-6); (7) Validation Summary derived from its answers + ONE confirm `ask user question tool`; (8) Suggest next → `/work-item --mode=refine`. — why: AI keeps dropping the skill's own mid-pipeline steps; the interview and module detection are the most-forgotten.

**IMPORTANT MUST ATTENTION** Mode gate: existing codebase → detect module and load context; Greenfield → skip module and structure reads, use market/WebSearch context, ask business questions more often, and NEVER ask about tech stack.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **UI Wireframe:** for UI-bearing initiatives, use project ownership/observed boundaries; search existing components and reuse only when behavior/platform contracts fit. Backend-only is N/A.
- **AI-SDD M1–M3:** Keep initiative prose tech-agnostic business intent; defer logical IDs and `[Source: ...]` carriers to the downstream task.
- **Sequential Thinking:** multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS markers and confidence closer.

**IMPORTANT MUST ATTENTION** Discovery Interview (Step 6.5) + Validation Summary (Step 7) NEVER optional — run the ONE `ask user question tool` interview and the ONE Step 7 confirm question even for "simple" initiatives and never re-ask a category — why: discovery uncovers hidden constraints and confirms problem framing, and a repeated question burns the PO's time.
**IMPORTANT MUST ATTENTION** ALWAYS keep problem statement tech-agnostic (M1, `spec-principles.md` §3, all modes) — name no framework/product/language/design-pattern; defer any stack preference to the later tech-research phase — why: task inherits the narrative cleanly downstream
**IMPORTANT MUST ATTENTION** in greenfield mode NEVER ask about tech stack — acknowledge a volunteered preference, then defer to the business-evaluation phase — why: stack is a research-driven decision after business analysis, not a capture-time guess
**IMPORTANT MUST ATTENTION** `TaskCreate` break ALL work into small tasks BEFORE starting — including a task to READ `project-structure-reference.md` (skip in greenfield — it won't exist)
**IMPORTANT MUST ATTENTION** validate all decisions with user via `ask user question tool` — NEVER auto-decide — and NEVER show confidence levels on an auto-detected module match
**IMPORTANT MUST ATTENTION** auto-detect module from the evidenced project structure and selected artifact owners/indexes — prompt only when ambiguous or no match; greenfield → skip module detection — why: confirm with `Glob()` evidence, not assumption
**IMPORTANT MUST ATTENTION** assign NO logical IDs (M3) — an initiative is tech-agnostic business intent only; the downstream task owns `FR-`/`BR-` assignment and `[Source: namespace/service/id]` anchors — why: keep the problem/value narrative free of source identifiers so the task inherits it cleanly
**IMPORTANT MUST ATTENTION** include `t_shirt_size` (XS/S/M/L/XL) in the artifact and keep the feature-context load within the 8-12K token budget — why: early sizing feeds prioritization; over-budget reads dilute attention
**IMPORTANT MUST ATTENTION** persist to `initiatives/{YYMMDD}-{role}-initiative-{slug}.md` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path), then hand off to `/work-item --mode=refine` for task conversion — why: canonical path keeps downstream tooling aligned
**IMPORTANT MUST ATTENTION** the initiative file is a work record owned by `/task-track`: unused `id`, `status: draft`, no assignee, no decision or priority key of this skill's own; approval, type, priority level and due date are recorded only through `/task-track`, and on a tracked initiative so are `title`/`intent`/`status`/`priority` — why: a second status vocabulary makes the tracker refuse the record
**IMPORTANT MUST ATTENTION** on UI-bearing initiatives, search existing components and reuse when behavior/platform contracts fit; classify by project ownership/observed boundaries. A visual percentage does not establish compatibility; backend-only work is N/A.
**IMPORTANT MUST ATTENTION** cite `file:line` proof or traced evidence for every claim/recommendation, confidence >80% to act, <80% verify first — why: certainty without evidence is the root of hallucination
**IMPORTANT MUST ATTENTION** add a final review task to verify work quality

**Anti-Rationalization:**

| Evasion                                   | Rebuttal                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| "Initiative is simple, skip interview"          | NEVER skip — discovery uncovers hidden constraints                       |
| "Module is obvious, skip detection"       | Still run `Glob()` — confirm with evidence not assumption                |
| "Validation is redundant after interview" | ALWAYS run both — the confirm question checks the derived problem statement / scope, not a new category |
| "Greenfield check is optional"            | Auto-detect is MANDATORY — no manual override                           |
| "User mentioned a framework, capture it"  | Stay tech-agnostic — acknowledge, defer to tech-research phase           |
| "I'll assign FR-/BR- IDs now"             | NO logical IDs at initiative stage — the task assigns them downstream           |
| "Reuse an existing component? new is faster" | For UI, search existing components and verify behavior/platform fit before proposing a new owner; use the project’s taxonomy |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

**IMPORTANT MUST ATTENTION** the 3 rules to never skip: (1) run BOTH Discovery + Validation `ask user question tool` gates; (2) keep the problem statement tech-agnostic (no stack/IDs); (3) cite `file:line` evidence, confidence >80% to act.
