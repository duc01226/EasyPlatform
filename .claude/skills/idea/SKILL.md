---
name: idea
version: 1.1.0
description: '[Project Management] Capture and structure product ideas as backlog artifacts. Use when capturing new ideas, feature requests, or concepts for future refinement. Triggers on keywords like "capture idea", "new idea", "feature idea", "add to backlog", "quick idea".'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[IMPORTANT]** `TaskCreate` break ALL work into small tasks BEFORE starting — including tasks each file read. Simple tasks: AI MUST ATTENTION ask user whether to skip.

> **External Memory:** Complex/lengthy work (research, analysis, scan, review) → write intermediate findings to `plans/reports/` — prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, recommendation requires `file:line` proof or traced evidence, confidence percentage (>80% act, <80% verify first).

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Capture raw product ideas as structured backlog artifacts with project module context.

> **MANDATORY IMPORTANT MUST ATTENTION** TaskCreate task to READ project-specific reference doc:
> `project-structure-reference.md` — project patterns and structure. Not found → search: project documentation, coding standards, architecture docs.

**Workflow:**

1. **Gather Info** — Ask problem, value, scope, target users
2. **Generate Artifact** — Create idea file with ID (`IDEA-YYMMDD-NNN`) + draft status
3. **Detect Module** — Auto-match project module, load feature context from docs
4. **Discovery Interview** — `AskUserQuestion` 3-5 structured questions (MANDATORY)
5. **Validate** — Confirm problem statement, scope, stakeholders (MANDATORY)
6. **Suggest Next** — Point to `/refine` for PBI creation

**Key Rules:**

- Output: `team-artifacts/ideas/{YYMMDD}-{role}-idea-{slug}.md`
- Validation NEVER optional — MANDATORY step
- Auto-detect module silently; prompt only when ambiguous
- MUST ATTENTION include `t_shirt_size` (XS/S/M/L/XL) in artifact for early sizing

## Greenfield Mode

> **Auto-detected:** No codebase found (no `src/`, `app/`, `lib/`, `server/`, `packages/` dirs; no `package.json`/`*.sln`/`go.mod`; no `project-config.json`) → greenfield mode. Planning artifacts (`docs/`, `plans/`, `.claude/`) don't count — project must have actual code dirs with content.

**When greenfield detected:**

1. Skip module auto-detection (no modules exist yet)
2. Skip `project-structure-reference.md` read (won't exist)
3. Focus broader problem-space: market gap, competitors, differentiation
4. Output tech-agnostic problem statement
5. Enable WebSearch for market/competitor context
6. Increase `AskUserQuestion` frequency — capture vision, constraints, team profile, scale expectations
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

Use `AskUserQuestion` — 3-5 structured questions. Each MUST ATTENTION have 2-4 options with one marked "(Recommended)".

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

`AskUserQuestion` — 2-3 validation questions:

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

`AskUserQuestion` after capture:

1. `/refine` — Refine into PBI (Recommended)
2. `/tdd-spec` — Jump straight to test spec
3. `/plan` — Start implementation planning

Output: "Idea captured! To refine into a PBI, run: `/refine {filename}`"
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

<!-- SYNC:ui-wireframe -->

> **UI Wireframe** — Process visual design input (Figma URLs, screenshots, wireframes) via appropriate tool BEFORE creating wireframes. Use box-drawing ASCII characters for spatial layout. Classify every component into exactly ONE tier: Common (cross-app reusable) / Domain-Shared (cross-domain) / Page (single-page). Duplicate UI code = wrong tier. Search existing component libraries before creating new (>=80% match = reuse). Detail level varies by skill (idea=rough, story=full decomposition).

<!-- /SYNC:ui-wireframe -->

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
/idea "Dark mode toggle for settings"
# Creates: team-artifacts/ideas/260119-po-idea-dark-mode-toggle.md

/idea "Add goal progress tracking notification"
# Creates with module context: team-artifacts/ideas/260119-po-idea-goal-progress-notification.md
```

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** Not already in workflow → MUST ATTENTION use `AskUserQuestion`:
>
> 1. **Activate `idea-to-pbi` workflow** (Recommended) — idea → refine → refine-review → story → story-review → prioritize
> 2. **Execute `/idea` directly** — run standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing skill, use `AskUserQuestion`:

- **"/refine (Recommended)"** — Transform idea into actionable PBI
- **"/web-research"** — Idea needs market research first
- **"Skip, continue manually"** — user decides

---

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

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
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** `TaskCreate` break ALL work into small tasks BEFORE starting
**IMPORTANT MUST ATTENTION** validate all decisions with user via `AskUserQuestion` — NEVER auto-decide
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

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
