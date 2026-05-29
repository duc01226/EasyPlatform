---
name: workflow-idea-to-pbi
version: 2.0.0
description: '[Workflow] Use when activating the Idea to PBI workflow for turning ideas into prioritized PBIs and stories.'
disable-model-invocation: true
---

## Quick Summary

**Goal:** [Workflow] Trigger Idea to PBI workflow — capture or review idea/artifact, optional handoff, refine to PBI, validate design rationale, create stories, generate TDD test specs, challenge review, DoR gate, mockup, prioritize.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION apply the shared SDD Artifact Contract from `shared/sdd-artifact-contract.md` in the active skills root; use `docs/project-config.json` and `docs/project-reference/docs-index-reference.md` for project-specific conventions.
- **[BLOCKING] Tech-agnostic output:** idea / PBI / story / problem-statement prose stays tech-agnostic per `docs/project-reference/spec-principles.md` §3 — no framework/product/language/design-pattern names; source paths and class names appear ONLY in evidence fields (`**Evidence**`, `[Source:]`), frontmatter, and Mermaid.
- MUST ATTENTION treat AI-generated ideas, PBIs, stories, mockups, and TCs as draft/reference until their review or acceptance gate approves them.
- MUST ATTENTION allow any supported AI tool to produce or review artifacts when the shared contract, synced context, and local docs are available.
- NEVER skip mandatory workflow or skill gates.

## When to Use

- PO or BA has a raw idea and needs to shape it into a grooming-ready PBI
- PO is handing off an existing ticket, PRD, or brief to the BA team for refinement
- Single-PBI refinement with stories, test specifications, challenge review, and DoR validation
- Feature needs a structured PBI before entering a sprint

## When NOT to Use

- Multiple opportunities from a discovery sprint → use `product-discovery`
- Full feature lifecycle including implementation → use `full-feature-lifecycle`
- Implementation-only (PBI already exists and is DoR-ready) → use `feature` or `big-feature`
- Bug fixes → use `bugfix`

## Key Mechanics

### 1. Step Selection Gate

After confirming the workflow, present the full step list and let the user deselect irrelevant steps:

```
- [x] Idea capture (idea)
- [ ] Review existing artifact (review-artifact)   — CONDITIONAL
- [ ] PO → BA handoff (handoff)                    — CONDITIONAL
- [x] Refine to PBI (refine)
- [x] Refinement rationale review (why-review)
- [x] PBI review (refine-review)
- [x] Reviewed-PBI rationale review (why-review)
- [x] User stories (story)
- [x] Story rationale review (why-review)
- [x] Story review (story-review)
- [x] Test specifications (tdd-spec)
- [x] Test-spec rationale review (why-review)
- [x] Test specification review (tdd-spec-review)
- [x] Dev BA PIC challenge (pbi-challenge)
- [x] Definition of Ready gate (dor-gate)
- [x] PBI HTML mock-up (pbi-mockup)                — CONDITIONAL
- [x] Backlog prioritization (prioritize)
- [x] Documentation synchronization (docs-update)
```

Mark skipped steps as completed immediately.

### 2. TaskCreate Before Starting

**MANDATORY IMPORTANT MUST ATTENTION** — Call `TaskCreate` for every step before beginning any work:

```
TaskCreate: "Idea capture"
TaskCreate: "Refine to PBI"
TaskCreate: "Refinement rationale review (why-review after refine)"
TaskCreate: "PBI review (refine-review)"
TaskCreate: "Reviewed-PBI rationale review (why-review after refine-review)"
TaskCreate: "User stories (story)"
TaskCreate: "Story rationale review (why-review after story)"
TaskCreate: "Story review"
TaskCreate: "Test specifications (tdd-spec)"
TaskCreate: "Test-spec rationale review (why-review after tdd-spec)"
TaskCreate: "Test specification review (tdd-spec-review)"
TaskCreate: "Dev BA PIC challenge"
TaskCreate: "Definition of Ready gate"
TaskCreate: "PBI HTML mock-up" [if UI]
TaskCreate: "Prioritize"
TaskCreate: "Documentation synchronization (docs-update)"
TaskCreate: "Session summary (watzup)"
```

One task per step. Mark each completed immediately when done — never batch.

### 3. Why-Review Gate (After refine-review, Before story)

This is the adversarial design rationale check. Purpose: validate the **WHY** of this PBI before investing in stories.

The workflow contains repeated `/why-review` gates. Use purpose-specific labels in sequence: refinement rationale, reviewed-PBI rationale, story rationale, and test-spec rationale. Do not deduplicate them.

**Challenge prompts:**

- Is this the right solution to the stated problem? What was rejected and why?
- Are the acceptance criteria constraints justified? What happens if any constraint is removed?
- Pre-mortem: if this PBI ships and fails in 3 months, what breaks?
- Are there simpler alternatives not yet considered?
- Does the scope align with the stated business value?

**Output:** Why-Review checklist with PASS / WARN / FAIL.

| Result | Action                                          |
| ------ | ----------------------------------------------- |
| PASS   | Proceed to `/story`                             |
| WARN   | Document risk, proceed with user acknowledgment |
| FAIL   | Revise PBI in `/refine` before continuing       |

### 4. TDD-Spec Gate (After story-review, Before pbi-challenge)

Generate and review test specifications before challenge and DoR gates so reviewers evaluate a testable PBI.

AI-generated TC drafts are reference-only until `/tdd-spec-review`, `/pbi-challenge`, and `/dor-gate` accept them for delivery planning.

**Output requirements:**

- Map material acceptance criteria and user stories to TC IDs
- Route planned TC IDs to Feature doc Section 15 through `/tdd-spec`; `/docs-update` later verifies feature docs and dashboard sync.
- Cover happy path, validation failure, authorization/permission, and important edge cases where applicable
- Run `/tdd-spec-review` before `/pbi-challenge`

### 5. PBI Output Format

Each PBI artifact must contain:

| Section             | Content                                                     |
| ------------------- | ----------------------------------------------------------- |
| Title               | Clear, actionable                                           |
| Problem Statement   | Why this needs to exist                                     |
| Hypothesis          | If we build X, users will Y, which drives Z                 |
| Acceptance Criteria | GIVEN / WHEN / THEN format                                  |
| RICE Score          | Reach × Impact × Confidence / Effort                        |
| User Stories        | Who / What / Why                                            |
| Test Specs          | TC IDs mapped to acceptance criteria                        |
| DoR Status          | PASS / WARN / FAIL                                          |
| Mockup              | HTML mock-up based on project reference design docs (if UI) |

### 6. Artifact Locations

| Step           | Output Path                                           |
| -------------- | ----------------------------------------------------- |
| Idea           | `team-artifacts/ideas/{YYMMDD}-{role}-idea-{slug}.md` |
| PBI            | `team-artifacts/pbis/{YYMMDD}-pbi-{slug}.md`          |
| Stories        | Added to PBI artifact                                 |
| Test specs     | Feature doc Section 15 / docs/specs dashboard sync    |
| DoR result     | Added to PBI artifact                                 |
| Mockup         | HTML mock-up file saved beside PBI artifact           |
| Prioritization | `team-artifacts/backlog/{YYMMDD}-backlog-update.md`   |
| Docs sync      | `plans/reports/docs-update-{YYMMDD}-{HHMM}.md`        |

These roots intentionally match the child skills (`idea`, `refine`, `story`, `pbi-mockup`, `prioritize`, `docs-update`). If artifact roots become configurable later, update this workflow and all child skills in the same change.

Write output IMMEDIATELY after each step — never batch across steps.

### 7. Conditional Skip Rules

| Step               | Skip When                             |
| ------------------ | ------------------------------------- |
| `/review-artifact` | No existing artifact — raw idea input |
| `/handoff`         | No formal PO→BA handoff needed        |
| `/pbi-mockup`      | Backend-only PBI — no UI changes      |

---

### 8. Near-Final Documentation Synchronization

Run `/docs-update` after `/prioritize` and before `/watzup`.

Purpose:

- Sync refined PBI/story outputs into business feature docs where applicable.
- Sync feature doc Section 15 test specifications and `docs/specs/` dashboards after `/tdd-spec-review`.
- Verify specs, feature docs, and TDD/spec docs do not drift before workflow closure.
- Record skipped sub-phases explicitly when no impacted docs exist.

---

**IMPORTANT MANDATORY Steps:** /idea -> /review-artifact -> /handoff -> /refine -> /why-review -> /refine-review -> /why-review -> /story -> /why-review -> /story-review -> /tdd-spec -> /why-review -> /tdd-spec-review -> /pbi-challenge -> /dor-gate -> /pbi-mockup -> /prioritize -> /docs-update -> /watzup -> /workflow-end

**IMPORTANT MANDATORY Steps:** /idea -> /review-artifact -> /handoff -> /refine -> /why-review -> /refine-review -> /why-review -> /story -> /why-review -> /story-review -> /tdd-spec -> /why-review -> /tdd-spec-review -> /pbi-challenge -> /dor-gate -> /pbi-mockup -> /prioritize -> /docs-update -> /watzup -> /workflow-end

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `idea-to-pbi` workflow. Run `/workflow-start idea-to-pbi` with the user's prompt as context.

**Steps:**
/idea → /review-artifact (conditional) → /handoff (conditional) → /refine → /why-review → /refine-review → /why-review → /story → /why-review → /story-review → /tdd-spec → /why-review → /tdd-spec-review → /pbi-challenge → /dor-gate → /pbi-mockup → /prioritize → /docs-update → /watzup → /workflow-end

> **Conditional steps:**
>
> - `/review-artifact` — skip if no existing artifact/ticket/PRD; proceed straight to `/refine`
> - `/handoff` — skip if no formal PO→BA handoff needed
> - `/pbi-mockup` — skip if PBI is backend-only (no UI changes)

---

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

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md`
> 2. **After each file/section reviewed:** Append findings to report immediately — never hold in memory
> 3. **Return to main agent:** Summary only (per SYNC:subagent-return-contract) with `Full report:` path
> 4. **Main agent:** Reads report file only when resolving specific blockers
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting — one task per step
- **MANDATORY IMPORTANT MUST ATTENTION** run all four purpose-specific why-review gates: after refine, after refine-review, after story, and after tdd-spec; FAIL blocks the next artifact step, WARN requires user acknowledgment
- **MANDATORY IMPORTANT MUST ATTENTION** tdd-spec and tdd-spec-review run after story-review and before pbi-challenge
- **MANDATORY IMPORTANT MUST ATTENTION** pbi-challenge must be run by a reviewer different from the drafter
- **MANDATORY IMPORTANT MUST ATTENTION** dor-gate must pass (PASS or WARN) before pbi-mockup is finalized
- **MANDATORY IMPORTANT MUST ATTENTION** write each artifact immediately — never batch output across steps
- **MANDATORY IMPORTANT MUST ATTENTION** docs-update runs after prioritize and before watzup to sync specs, feature docs, and TDD/spec dashboards
- **MANDATORY IMPORTANT MUST ATTENTION** add a final watzup summary: PBI title, DoR result, any blocking items, recommended next step

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
