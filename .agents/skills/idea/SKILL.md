---
name: idea
description: '[Project Management] Use when capturing new ideas, feature requests, or concepts for future refinement.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Capture raw product ideas as structured backlog artifacts with project module context.

> **MANDATORY IMPORTANT MUST ATTENTION** task tracking task to READ project-specific reference doc:
> `project-structure-reference.md` — project patterns and structure. Not found → search: project documentation, coding standards, architecture docs.

**Workflow:**

1. **Gather Info** — Ask problem, value, scope, target users
2. **Generate Artifact** — Create idea file with ID (`IDEA-YYMMDD-NNN`) + draft status
3. **Detect Module** — Auto-match project module, load feature context from docs
4. **Discovery Interview** — a direct user question 3-5 structured questions (MANDATORY)
5. **Validate** — Confirm problem statement, scope, stakeholders (MANDATORY)
6. **Suggest Next** — Point to `$refine` for PBI creation

**Key Rules:**

- Output: `team-artifacts/ideas/{YYMMDD}-{role}-idea-{slug}.md`
- Validation NEVER optional — MANDATORY step
- Auto-detect module silently; prompt only when ambiguous
- MUST ATTENTION include `t_shirt_size` (XS/S/M/L/XL) in artifact for early sizing
- **[BLOCKING] Tech-agnostic output:** the problem statement stays tech-agnostic per `docs/project-reference/spec-principles.md` §3 (all modes, not only greenfield) — name no framework/product/language/design-pattern; defer any stack preference to the later tech-research phase.

## Greenfield Mode

> **Auto-detected:** No codebase found (no `src/`, `app/`, `lib/`, `server/`, `packages/` dirs; no `package.json`/`*.sln`/`go.mod`; no `project-config.json`) → greenfield mode. Planning artifacts (`docs/`, `plans/`, `.claude/`) don't count — project must have actual code dirs with content.

**When greenfield detected:**

1. Skip module auto-detection (no modules exist yet)
2. Skip `project-structure-reference.md` read (won't exist)
3. Focus broader problem-space: market gap, competitors, differentiation
4. Output tech-agnostic problem statement
5. Enable WebSearch for market/competitor context
6. Increase a direct user question frequency — capture vision, constraints, team profile, scale expectations
7. **[CRITICAL] NEVER ask about tech stack during idea capture.** Tech stack = research-driven decision AFTER full business analysis (business-evaluation phase). User volunteers preference → acknowledge but defer to tech stack research phase.

## Detailed Workflow

### Step 1: Gather Information

- No title → ask: "What's the idea in one sentence?"
- Ask: "What problem does this solve?"
- Ask: "Who benefits from this?"
- Ask: "Any initial scope thoughts?"

### Step 2: Generate Artifact

- Template: `.claude/docs/team-artifacts/templates/idea-template.md`
- ID: `IDEA-{YYMMDD}-{NNN}` (sequential)
- Status: `draft`

### Step 3: Capture Details

- Document problem statement, expected value, target users

### Step 4: Detect Project Module

**Dynamic Discovery:**

1. Run: `Glob("docs/business-features/*/README.md")`
2. Extract module names from paths
3. Match idea keywords against module keywords

| Scenario             | Action                                                                          |
| -------------------- | ------------------------------------------------------------------------------- |
| Clear match          | Auto-detect — NEVER show confidence levels                                      |
| Ambiguous / no match | Prompt: "Which project module?" + Glob results + "Cross-cutting/Infrastructure" |
| 2+ modules detected  | Load ALL modules, add all to `related_features`                                 |

**If module detected:**

1. Read `docs/business-features/{module}/README.md` (first 200 lines)
2. Extract feature list from Quick Navigation section
3. Add to frontmatter: `module: {detected_module}`, `related_features: [Feature1, Feature2]`

### Step 5: Load Feature Context

1. Read module README overview (~2K tokens)
2. Identify closest matching feature(s)
3. Read corresponding feature doc (3-5K tokens)
4. Extract: related entities, existing business rules (BR-{MOD}-XXX), test case patterns (TC-{FEATURE}-{NNN})

**Token Budget:** Target 8-12K tokens total.

### Step 6: Save Artifact

- Path: `team-artifacts/ideas/{YYMMDD}-{role}-idea-{slug}.md`
- Role: infer from context or ask
- Include domain context if detected

### Step 6.5: Discovery Interview (MANDATORY)

Use a direct user question — 3-5 structured questions. Each MUST ATTENTION have 2-4 options with one marked "(Recommended)".

| Category        | Purpose                           | Example                                   |
| --------------- | --------------------------------- | ----------------------------------------- |
| Problem Clarity | Distinguish problem from solution | "What problem does this solve?" + options |
| User Persona    | Identify primary user             | "Who benefits most?" + role options       |
| Scope           | MVP vs full vision                | "What's smallest valuable version?"       |
| Testability     | Define done?                      | "How would you verify this works?"        |
| Impact          | Business value sizing             | "How many users/processes affected?"      |
| Constraints     | Known blockers                    | "Any technical/business constraints?"     |
| Scale           | Expected load/growth              | "How many users/transactions expected?"   |

> **Greenfield:** NEVER include tech stack questions. Focus on business problem, users, scale, constraints.

**Testability Question (ALWAYS include):**
"How would you verify this feature works correctly?" — Options: manual test steps, automated test criteria, metric thresholds.

Document all answers under `## Discovery Interview`.

### Step 7: Validate Idea (MANDATORY)

a direct user question — 2-3 validation questions:

| Category     | Example Question                                      |
| ------------ | ----------------------------------------------------- |
| Problem      | "Is the problem statement clear and user-focused?"    |
| Value        | "What's the expected business value or user benefit?" |
| Scope        | "Any scope boundaries to clarify now?"                |
| Stakeholders | "Who else should review this idea?"                   |

Document under `## Validation Summary`. Update artifact based on answers.

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

a direct user question after capture:

1. `$refine` — Refine into PBI (Recommended)
2. `$tdd-spec` — Jump straight to test spec
3. `$plan` — Start implementation planning

Output: "Idea captured! To refine into a PBI, run: `$refine {filename}`"
Module detected: "Module context from {module} will be used during refinement."

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

- **{Component}** — {purpose} _(tier: common | domain-shared | page/app)_
```

> Search existing libs before proposing new components.
> Backend-only idea: `## UI Sketch` → `N/A — Backend-only change. No UI affected.`

## Examples

```bash
$idea "Dark mode toggle for settings"
# Creates: team-artifacts/ideas/260119-po-idea-dark-mode-toggle.md

$idea "Add goal progress tracking notification"
# Creates with module context: team-artifacts/ideas/260119-po-idea-goal-progress-notification.md
```

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** Not already in workflow → MUST ATTENTION use a direct user question:
>
> 1. **Activate `idea-to-pbi` workflow** (Recommended) — idea → refine → refine-review → story → story-review → prioritize
> 2. **Execute `$idea` directly** — run standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing skill, use a direct user question:

- **"$refine (Recommended)"** — Transform idea into actionable PBI
- **"$web-research"** — Idea needs market research first
- **"Skip, continue manually"** — user decides

---

> **[IMPORTANT]** task tracking break ALL work into small tasks BEFORE starting — including tasks each file read. Simple tasks: AI MUST ATTENTION ask user whether to skip.

> **External Memory:** Complex/lengthy work (research, analysis, scan, review) → write intermediate findings to `plans/reports/` — prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, recommendation requires `file:line` proof or traced evidence, confidence percentage (>80% act, <80% verify first).

<!-- SYNC:ui-wireframe -->

> **UI Wireframe** — Process visual design input (Figma URLs, screenshots, wireframes) via appropriate tool BEFORE creating wireframes. Use box-drawing ASCII characters for spatial layout. Classify every component into exactly ONE tier: Common (cross-app reusable) / Domain-Shared (cross-domain) / Page (single-page). Duplicate UI code = wrong tier. Search existing component libraries before creating new (>=80% match = reuse). Detail level varies by skill (idea=rough, story=full decomposition).

<!-- /SYNC:ui-wireframe -->

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

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:sequential-thinking-protocol -->

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <80% on any critical decision → escalate via ask the user directly · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).
>
> **Deep-dive:** see `$sequential-thinking` skill (`.claude/skills/sequential-thinking/SKILL.md`) for worked examples (api-design, debug, architecture), advanced techniques (spiral refinement, hypothesis testing, convergence), and meta-strategies (uncertainty handling, revision cascades).

<!-- /SYNC:sequential-thinking-protocol -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `$sequential-thinking` skill.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** task tracking break ALL work into small tasks BEFORE starting
**IMPORTANT MUST ATTENTION** validate all decisions with user via a direct user question — NEVER auto-decide
**IMPORTANT MUST ATTENTION** Discovery Interview + Validation NEVER optional — MANDATORY steps
**IMPORTANT MUST ATTENTION** NEVER ask about tech stack in greenfield mode — defer to business-evaluation phase
**IMPORTANT MUST ATTENTION** auto-detect module silently — prompt only when ambiguous
**IMPORTANT MUST ATTENTION** add final review task to verify work quality

**Anti-Rationalization:**

| Evasion                                   | Rebuttal                                                  |
| ----------------------------------------- | --------------------------------------------------------- |
| "Idea is simple, skip interview"          | NEVER skip — discovery uncovers hidden constraints        |
| "Module is obvious, skip detection"       | Still run `Glob()` — confirm with evidence not assumption |
| "Validation is redundant after interview" | ALWAYS run both — different question categories           |
| "Greenfield check is optional"            | Auto-detect is MANDATORY — no manual override             |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure unless the user explicitly invoked a workflow/skill and the local protocol treats explicit invocation as confirmation:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
