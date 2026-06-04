---
name: workflow-idea-to-pbi
description: '[Workflow] Use when activating the Idea to PBI workflow for turning an idea — or a raw product vision/problem — into prioritized PBIs and stories (single-PBI deep mode, or multi-opportunity discovery mode).'
disable-model-invocation: false
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

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** [Workflow] Trigger Idea to PBI workflow in one of two modes. **SINGLE-PBI DEEP** — capture or review idea/artifact, refine, author the §1-7 Feature Spec draft, generate TDD test specs from the idea, model the domain, plan, derive the PBI and stories, challenge review, DoR gate, mockup, prioritize (idea → draft Feature Spec → specs → from those specs to PBI). **MULTI-OPPORTUNITY DISCOVERY** — a raw product vision/problem → brainstorm (optionally web-research → deep-research) → RICE opportunity map → user multi-select → a light per-opportunity PBI loop → cross-PBI ranked backlog.

**Mode Detection Gate (FIRST — pick the track before any step, then declare it):**

| Input                                                        | Mode                            | Track                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ONE concrete idea / ticket / brief                           | **Single-PBI Deep**             | full track incl. `spec [mode=draft]` + `spec [mode=tests]` + `plan`/`plan-review`/`plan-validate` → 1 deeply-groomed PBI. SKIP `brainstorm`/`web-research`/`deep-research`.                                                                                                                |
| Raw product vision / problem spanning multiple opportunities | **Multi-Opportunity Discovery** | `brainstorm` (optionally `web-research` → `deep-research`) → RICE map → multi-select → light per-opportunity loop → cross-PBI `prioritize`. `spec [mode=draft]` + `spec [mode=tests]` + `plan` cycle are **deep-mode only — never per opportunity**; `domain-analysis` runs once up front. |

When the input is ambiguous, ask via a direct user question before step 1.

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

**Single-PBI Deep mode:**

- PO or BA has a raw idea and needs to shape it into a grooming-ready PBI
- PO is handing off an existing ticket, PRD, or brief to the BA team for refinement
- Single-PBI refinement with stories, test specifications, challenge review, and DoR validation
- Feature needs a structured PBI before entering a sprint

**Multi-Opportunity Discovery mode:**

- PO/BA has a raw product vision or problem statement that spans several opportunities, and needs a prioritized backlog of multiple PBIs out of it in one pass
- A discovery sprint is needed: structured brainstorm → RICE opportunity map → multi-select → N PBIs → cross-PBI ranking (no implementation)

## When NOT to Use

- Just want a (provisional) Feature Spec from an idea, no backlog → use `workflow-idea-to-spec`
- Already have canonical Feature Specs and only need the backlog → use `workflow-spec-to-pbi` (spec-first entry)
- Implementation-only (PBI already exists and is DoR-ready) → use `workflow-feature` or `workflow-big-feature`
- Bug fixes → use `workflow-bugfix`

## Key Mechanics

### 1. Step Selection Gate

After confirming the workflow, present the full step list and let the user deselect irrelevant steps:

```
- [x] Brainstorm (brainstorm)                      — DISCOVERY MODE ONLY; RICE opportunity map
- [ ] Market research (web-research)               — DISCOVERY MODE, CONDITIONAL
- [ ] Deep research (deep-research)                 — DISCOVERY MODE, CONDITIONAL; runs only when web-research ran
- [x] Idea capture (idea)                          — REPEATS per opportunity in discovery mode
- [x] Spec & code discovery (spec-discovery)       — investigate related/affected specs + code before authoring
- [ ] Review existing artifact (review-artifact)   — CONDITIONAL
- [ ] PO → BA handoff (handoff)                    — CONDITIONAL
- [x] Refine to PBI (refine)                        — REPEATS per opportunity in discovery mode
- [x] Refinement rationale review (why-review)
- [x] Feature Spec draft (spec [mode=draft])        — DEEP MODE ONLY; §1-7 Feature Spec (provisional) before §8 tests
- [x] Test specifications (spec [mode=tests])       — DEEP MODE ONLY; idea → draft → specs
- [x] Test-spec rationale review (why-review)       — deep mode
- [x] Test specification review (review-artifact --type=spec-tests)  — deep mode
- [ ] Domain analysis (domain-analysis)            — CONDITIONAL; discovery mode runs it ONCE up front
- [x] Domain rationale review (why-review)
- [x] Implementation plan (plan)                    — DEEP MODE ONLY
- [x] Plan review (plan-review)                     — deep mode
- [x] Plan validation (plan-validate)               — deep mode
- [x] Plan rationale review (why-review)            — deep mode
- [x] PBI review (review-artifact --type=pbi)       — from specs to PBI; REPEATS per opportunity
- [x] User stories (story)                          — REPEATS per opportunity
- [x] Story rationale review (why-review)
- [x] Story review (review-artifact --type=story)   — REPEATS per opportunity
- [x] Dev BA PIC challenge (pbi-challenge)          — REPEATS per opportunity
- [x] Definition of Ready gate (dor-gate)           — REPEATS per opportunity
- [x] PBI HTML mock-up (pbi-mockup)                — CONDITIONAL; REPEATS per opportunity
- [x] Backlog prioritization (prioritize)           — cross-PBI in discovery mode
- [x] Documentation synchronization (docs-update)
```

Mark skipped steps as completed immediately. In single-PBI deep mode, deselect `brainstorm`/`web-research`/`deep-research`. In discovery mode, deselect `spec [mode=draft]`, `spec [mode=tests]`, `review-artifact --type=spec-tests`, and the `plan`/`plan-review`/`plan-validate` cycle (deep-mode-only); run `domain-analysis` once up front.

### 1a. Multi-Opportunity Discovery Loop (Discovery Mode core mechanic)

Activated only when the input is a raw product vision/problem spanning multiple opportunities (folded in from the former product-discovery workflow).

1. **Brainstorm → opportunity map.** Run `$brainstorm` with Double Diamond (problem framing → opportunity framing → ideation → convergence). Output a **RICE-scored opportunity map** of 3–8 items to `plans/{plan-dir}/brainstorm-opportunity-map.md`.
2. **Multi-select.** Present the map via a direct user question (`multiSelect: true`): "Which opportunities should we develop into PBIs?"
3. **Opportunity-map why-review gate** (before the loop): challenge whether the top-ranked opportunities are the right problems, whether RICE Reach/Impact are founded or speculative, run a pre-mortem, and name systemic alternatives. FAIL on a high-ranked opportunity → drop it or revisit framing; WARN → document and proceed with user acknowledgment.
4. **Task decomposition gate.** Call task tracking for EVERY task (N opportunities × 8 loop steps = N×8 minimum) BEFORE processing any opportunity — never start the loop without a complete task list.
5. **Per-opportunity light loop** (for EACH selected opportunity — NO `spec [mode=draft]`, NO `spec [mode=tests]`, NO `plan`/`plan-review`/`plan-validate`; `domain-analysis` already ran once up front):
   `$idea` → `$refine` → `$review-artifact --type=pbi` → `$story` → `$review-artifact --type=story` → `$pbi-challenge` → `$dor-gate` → `$pbi-mockup` (skip for backend-only PBIs).
6. **Scale management.** For 6+ selected opportunities, spawn one sub-agent per opportunity (each gets brainstorm context + its task list); the main context runs `$prioritize` at the end. Update a session summary table after every 3 opportunities.
7. **Cross-PBI prioritize.** After ALL opportunities are processed, run `$prioritize` across all session PBIs (cross-PBI RICE + dependency graph) → sprint-ready ranked backlog, flagging Must/Should/Could-Have.

### 2. task tracking Before Starting

**MANDATORY IMPORTANT MUST ATTENTION** — Call task tracking for every step before beginning any work:

```
Task tracking: "Brainstorm → RICE opportunity map" [discovery mode]
Task tracking: "Market research (web-research)" [discovery mode, conditional]
Task tracking: "Deep research (deep-research)" [discovery mode, conditional; only when web-research ran]
Task tracking: "Idea capture"
Task tracking: "Refine to PBI"
Task tracking: "Refinement rationale review (why-review after refine)"
Task tracking: "Feature Spec draft (spec [mode=draft])"
Task tracking: "Test specifications (spec [mode=tests])"
Task tracking: "Test-spec rationale review (why-review after spec [mode=tests])"
Task tracking: "Test specification review (review-artifact --type=spec-tests)"
Task tracking: "Domain analysis (domain-analysis)" [if domain entities change]
Task tracking: "Domain rationale review (why-review after domain-analysis)"
Task tracking: "Implementation plan (plan)"
Task tracking: "Plan review (plan-review)"
Task tracking: "Plan validation (plan-validate)"
Task tracking: "Plan rationale review (why-review after plan-validate)"
Task tracking: "PBI review (review-artifact --type=pbi)"
Task tracking: "User stories (story)"
Task tracking: "Story rationale review (why-review after story)"
Task tracking: "Story review"
Task tracking: "Dev BA PIC challenge"
Task tracking: "Definition of Ready gate"
Task tracking: "PBI HTML mock-up" [if UI]
Task tracking: "Prioritize"
Task tracking: "Documentation synchronization (docs-update)"
Task tracking: "Session summary (watzup)"
```

One task per step. Mark each completed immediately when done — never batch.

### 3. Why-Review Gates (Purpose-Specific, Repeated)

This is the adversarial design rationale check. Purpose: validate the **WHY** of each artifact before investing in the next.

The workflow contains repeated `$why-review` gates after the non-review artifact steps. Use purpose-specific labels in sequence: refinement rationale (after refine), test-spec rationale (after spec [mode=tests]), domain rationale (after domain-analysis), plan rationale (after plan-validate), and story rationale (after story). Do not deduplicate them.

> The standalone gate after `review-artifact --type=pbi` is intentionally omitted: `review-artifact --type=pbi` (like every review skill) already self-invokes `$why-review --validate-findings` as an internal Findings Validation Gate, so a separate why-review step right after it would be duplicate work.

**Challenge prompts:**

- Is this the right solution to the stated problem? What was rejected and why?
- Are the acceptance criteria constraints justified? What happens if any constraint is removed?
- Pre-mortem: if this PBI ships and fails in 3 months, what breaks?
- Are there simpler alternatives not yet considered?
- Does the scope align with the stated business value?

**Output:** Why-Review checklist with PASS / WARN / FAIL.

| Result | Action                                          |
| ------ | ----------------------------------------------- |
| PASS   | Proceed to the next artifact step               |
| WARN   | Document risk, proceed with user acknowledgment |
| FAIL   | Revise PBI in `$refine` before continuing       |

### 4. TDD-Spec Gate (After refine + spec [mode=draft], Before the PBI is drafted)

Author the canonical §1-7 Feature Spec with `$spec [mode=draft]` (idea-sourced, provisional, §8 Evidence: TBD), then generate and review §8 test specifications right after refine — BEFORE the PBI is drafted — so the PBI, stories, and plan are derived FROM the draft Feature Spec + its test specs (idea → draft Feature Spec → specs → from those specs to PBI).

AI-generated TC drafts are reference-only until `$review-artifact --type=spec-tests`, `$pbi-challenge`, and `$dor-gate` accept them for delivery planning.

**Output requirements:**

- Map material acceptance criteria and user stories to TC IDs
- Route planned TC IDs to Feature doc Section 8 through `$spec [mode=tests]`; `$docs-update` later verifies feature docs and §8 TC ↔ integration test code sync.
- Cover happy path, validation failure, authorization/permission, and important edge cases where applicable
- Run `$review-artifact --type=spec-tests` before `$pbi-challenge`

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
| Test specs     | Feature doc Section 8 (canonical TC registry)         |
| DoR result     | Added to PBI artifact                                 |
| Mockup         | HTML mock-up file saved beside PBI artifact           |
| Prioritization | `team-artifacts/backlog/{YYMMDD}-backlog-update.md`   |
| Docs sync      | `plans/reports/docs-update-{YYMMDD}-{HHMM}.md`        |

These roots intentionally match the child skills (`idea`, `refine`, `story`, `pbi-mockup`, `prioritize`, `docs-update`). If artifact roots become configurable later, update this workflow and all child skills in the same change.

Write output IMMEDIATELY after each step — never batch across steps.

### 7. Conditional Skip Rules

| Step                                                       | Skip When                                                                           |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `$brainstorm`                                              | Single-PBI deep mode (one concrete idea/ticket)                                     |
| `$web-research`                                            | Single-PBI deep mode, internal tool, or well-understood domain                      |
| `$deep-research`                                           | Single-PBI deep mode, or whenever web-research is skipped (runs only when it ran)   |
| `$review-artifact`                                         | No existing artifact — raw idea input                                               |
| `$spec [mode=draft]`                                       | Discovery mode (deep-mode only — never per opportunity)                             |
| `$spec [mode=tests]`, `$review-artifact --type=spec-tests` | Discovery mode (deep-mode only — never per opportunity)                             |
| `$domain-analysis`                                         | Idea introduces no new/changed domain entities; in discovery mode run ONCE up front |
| `$plan`, `$plan-review`, `$plan-validate`                  | Discovery mode (deep-mode only — never per opportunity)                             |
| `$pbi-mockup`                                              | Backend-only PBI — no UI changes                                                    |

---

### 8. Near-Final Documentation Synchronization

Run `$docs-update` after `$prioritize` and before `$workflow-end`.

Purpose:

- Sync refined PBI/story outputs into business feature docs where applicable.
- Sync feature doc Section 8 test specifications and `docs/specs/` dashboards after `$review-artifact --type=spec-tests`.
- Verify specs, feature docs, and TDD/spec docs do not drift before workflow closure.
- Record skipped sub-phases explicitly when no impacted docs exist.

---

**IMPORTANT MANDATORY Steps:** $brainstorm -> $web-research -> $deep-research -> $idea -> $spec-discovery -> $review-artifact -> $refine -> $why-review -> $spec [mode=draft] -> $spec [mode=tests] -> $why-review -> $review-artifact --type=spec-tests -> $spec-clarify -> $domain-analysis -> $why-review -> $plan -> $plan-review -> $plan-validate -> $why-review -> $review-artifact --type=pbi -> $story -> $why-review -> $review-artifact --type=story -> $pbi-challenge -> $dor-gate -> $pbi-mockup -> $prioritize -> $docs-update -> $workflow-end -> $watzup

> **Mode gating of the canonical sequence above** — **Single-PBI deep mode:** skip $brainstorm + $web-research + $deep-research; run the full deep track (one PBI). **Discovery mode:** run $brainstorm (optionally $web-research → $deep-research), skip $spec [mode=draft], $spec [mode=tests], $review-artifact --type=spec-tests, $spec-clarify, $plan, $plan-review, $plan-validate; loop $idea→/refine→/review-artifact --type=pbi→/story→/review-artifact --type=story→/pbi-challenge→/dor-gate→/pbi-mockup per selected opportunity, then $prioritize cross-PBI.

> **[BLOCKING]** Each step MUST ATTENTION invoke its skill invocation — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `workflow-idea-to-pbi` workflow. Run `$start-workflow workflow-idea-to-pbi` with the user's prompt as context.

**Steps:**
$brainstorm → $web-research → $deep-research → $idea → $spec-discovery → $review-artifact → $refine → $why-review → $spec [mode=draft] → $spec [mode=tests] → $why-review → $review-artifact --type=spec-tests → $spec-clarify → $domain-analysis → $why-review → $plan → $plan-review → $plan-validate → $why-review → $review-artifact --type=pbi → $story → $why-review → $review-artifact --type=story → $pbi-challenge → $dor-gate → $pbi-mockup → $prioritize → $docs-update → $workflow-end → $watzup

> **Conditional / mode-gated steps:**
>
> - `$brainstorm`, `$web-research`, `$deep-research` — DISCOVERY MODE only; skip in single-PBI deep mode (`$deep-research` runs only when `$web-research` ran)
> - `$spec [mode=draft]`, `$spec [mode=tests]`, `$review-artifact --type=spec-tests`, `$plan`, `$plan-review`, `$plan-validate` — DEEP MODE only; never run per opportunity in discovery mode
> - `$review-artifact` — skip if no existing artifact/ticket/PRD; proceed straight to `$refine`
> - `$domain-analysis` — skip if the idea introduces no new/changed domain entities; in discovery mode run once up front
> - `$pbi-mockup` — skip if PBI is backend-only (no UI changes)

---

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

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

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
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: ≤10 finding bullets, no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the summary lives in the `Full report` on disk. A sub-agent that would exceed the summary shape MUST write the detail to its report and return only the pointer — the orchestrator's context is the scarce resource the whole map-reduce protects.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each line is a signpost to its canonical body above):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** Expand child phases, link parent when nested, one `in_progress` at a time.
- **Critical Thinking:** Traced `file:line` proof per claim, confidence >80% to act.
- **Incremental Persistence:** Write findings to `plans/reports/` per file — never hold in memory.
- **Sub-Agent Return Contract:** Sub-agents return summary only; full detail to report on disk.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting — one task per step
- **MANDATORY IMPORTANT MUST ATTENTION** run all five purpose-specific why-review gates: after refine, after spec [mode=tests], after domain-analysis, after plan-validate, and after story; FAIL blocks the next artifact step, WARN requires user acknowledgment
- **MANDATORY IMPORTANT MUST ATTENTION** spec [mode=draft] authors the §1-7 Feature Spec (provisional) right after refine, then spec [mode=tests] and review-artifact --type=spec-tests run before the PBI is drafted (idea → draft Feature Spec → specs → from those specs to PBI); both spec [mode=draft] and spec [mode=tests] are SINGLE-PBI DEEP MODE ONLY (never per opportunity in discovery mode)
- **MANDATORY IMPORTANT MUST ATTENTION** pbi-challenge must be run by a reviewer different from the drafter
- **MANDATORY IMPORTANT MUST ATTENTION** dor-gate must pass (PASS or WARN) before pbi-mockup is finalized
- **MANDATORY IMPORTANT MUST ATTENTION** write each artifact immediately — never batch output across steps
- **MANDATORY IMPORTANT MUST ATTENTION** docs-update runs after prioritize and before workflow-end to sync specs, feature docs, and TDD/spec dashboards
- **MANDATORY IMPORTANT MUST ATTENTION** add a final watzup summary: PBI title, DoR result, any blocking items, recommended next step

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
  **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
