<!-- PROMPT-PROTOCOLS:START -->

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

## Prompt Protocol Mirror (Auto-Synced, Primacy Anchor)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **PARALLELIZE:** Before executing the task list, tag each task `PAR` (independent inputs + write set disjoint from every other `PAR` task) or `SEQ` (name the blocking dependency), group `PAR` tasks into waves, declare the wave plan, and spawn each wave's sub-agents in ONE message — all-return barrier per wave, fan-out one level deep unless a sub-agent's own definition authorizes further fan-out. Sequential-by-default is a defect when tasks are independent; do not parallelize shared write targets, output-consuming tasks, trivial single-file work, ordering a skill or workflow explicitly fixes, or user-approval gates.
7. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

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
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec (`docs/specs/**` if one exists) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
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
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.
  <!-- PROMPT-PROTOCOLS:END -->

## Codex Hookless Project Reference Gate

Codex uses static project-reference loading instead of runtime-injected project docs. Before coding, planning, debugging, testing, or reviewing:

- Read `docs/project-config.json` for project-specific commands, module paths, workflow settings, and doc paths.
- Read `docs/project-reference/docs-index-reference.md` to route to the right project-reference files.
- Read `docs/project-reference/lessons.md` for always-on project guardrails.
- For spec, test-case, `docs/specs/`, behavior-change, or public-contract work, read the spec routing set named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized.
- If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.
- For situation-specific work, open the referenced project doc directly; do not rely on prior conversation text as proof that the doc is loaded.

<!-- WORKFLOWS:START -->

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

## Workflow Protocol (Hookless)

Use this protocol for workflow execution in Codex (no hook dependency):

1. Detect: execute explicit `$skill`, `$workflow-*`, or `$start-workflow <id>` prompts directly; otherwise match request against workflow catalog and skill list.
2. Analyze: choose the best path: direct execution, skill, standard workflow, or custom step combination.
3. Auto-select: pick the best path yourself without asking the user to choose between direct/skill/workflow/custom options.
4. Activate: execute direct work, invoke the selected skill, start the selected workflow sequence, or run the custom sequence.
5. Tasking: create tasks for each workflow/custom/skill step when the selected path has multiple steps.
6. Execute: run steps in order, validate outputs, and report completion.

Workflow source: `.claude/workflows.json` (19 workflows).

## Workflow Catalog

### Quick Keyword Lookup (match prompt -> workflow)

| If prompt mentions...                                                                                                 | Workflow ID                       | Workflow Name                                             |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| review my project architecture, run an architecture health check, check is this production ready                      | `workflow-architecture-audit`     | Architecture Audit                                        |
| implement a large, complex, or ambiguous feature that needs research                                                  | `workflow-big-feature`            | Big Feature (Research + Implement)                        |
| a bug, error, crash                                                                                                   | `workflow-bugfix`                 | Bug Fix                                                   |
| initial feature spec generation from zero, maintaining spec sync after code changes, quarterly spec health audits     | `workflow-code-to-spec`           | Code to Feature Spec                                      |
| generate, update, or maintain e2e/playwright tests from code/spec                                                     | `workflow-e2e`                    | E2E Testing                                               |
| implement a well-defined feature, add a component, build a capability                                                 | `workflow-feature`                | Feature Implementation                                    |
| create or update business feature documentation                                                                       | `workflow-feature-spec`           | Business Feature Documentation                            |
| start a new project from scratch, init a greenfield project, plan a new application                                   | `workflow-greenfield-init`        | Greenfield Project Init                                   |
| po/ba wants a grooming-ready pbi backlog, user stories, tdd test specifications                                       | `workflow-idea-to-pbi`            | Idea to PBI                                               |
| turn a raw product idea, vision, or problem statement into one canonical                                              | `workflow-idea-to-spec`           | Idea to Feature Spec                                      |
| make all integration tests pass, fix failing integration tests, drive the integration test suite to                   | `workflow-integration-test-green` | Integration Test Green (Verify · Adjudicate · Fix · Loop) |
| restructure, reorganize, clean up                                                                                     | `workflow-refactor`               | Code Refactoring                                          |
| research a topic from web sources, a business/market viability evaluation, a marketing strategy                       | `workflow-research`               | Research & Synthesis                                      |
| review current uncommitted, staged, or unstaged changes before committing                                             | `workflow-review-changes`         | Review Current Changes                                    |
| seed test data, implement data seeders, realistic development environment data                                        | `workflow-seed-test-data`         | Seed Test Data                                            |
| fixing a bug update test specs, code changes update test specs, pr review update test specs                           | `workflow-spec-sync`              | Spec Sync (Post-Change)                                   |
| create all pbis from an existing, convert a large feature spec into, dependent pbis from docs/specs                   | `workflow-spec-to-pbi`            | Spec to PBI Backlog                                       |
| visualize, diagram, draw                                                                                              | `workflow-visualize`              | Visual Diagram                                            |
| write integration tests for a specific, add test coverage to an untested, update integration tests after code changes | `workflow-write-integration-test` | Write Integration Tests                                   |

### Workflow Details (full sequence + protocol)

### workflow-architecture-audit — Architecture Audit

- Description: Architecture Audit — audit the whole project's architecture, scalability, and production readiness in one pass; synthesize one consolidated Architecture Health Report with three sub-scores and one combined verdict. Read-only: fixes route to a follow-up plan/feature workflow.
- When To Use: User wants to review my project architecture, run an architecture health check, check is this production ready, or audit scalability/coupling across the whole project
- Sequence: `scout -> architecture-review-full -> why-review -> docs-update -> workflow-end -> watzup`

Protocol:

```text
ARCHITECTURE AUDIT (READ-ONLY, ONE PASS, PROGRESSIVE SYNTHESIS):

- This workflow audits the WHOLE project architecture + scalability + production readiness in one pass and synthesizes ONE consolidated Architecture Health Report that grows from IN PROGRESS to FINISHED.
- The core step `architecture-review-full` runs INLINE in the main session because it SPAWNS sub-agents. It: (1) resolves scope (whole project / current diff / specific path); (2) fans out the three deliberately-non-overlapping reviewers as PARALLEL read-only sub-agents in ONE message behind an all-return barrier — `architecture-scalability-review` (architect, scorecard /20), `architecture-review` (architect, 13-category PASS/WARN/BLOCKED), `production-readiness-review` (code-reviewer, SRE /24 + 8-item gate); (3) PROGRESSIVE SYNTHESIS — creates the ONE consolidated report file at status `IN PROGRESS` when fan-out starts and MERGES each child's findings into it AS that child returns (never held in memory to the end), DEDUPING the siblings' intentional cross-references (one underlying issue = one finding citing every source); (4) FIX-REPORT-PER-REVIEW `$why-review` gate — a SINGLE merged `$why-review` pass that WALKS EACH of the three review faces plus the dedup and fixes the consolidated report in place (revise severities, remove false positives, restore any distinct issue the dedup collapsed); (5) FINALIZE — lock the combined verdict (worst-case rollup: any BLOCKED / NOT READY / HIGH RISK dominates) and flip the report status to `FINISHED`.
- Parallelism lives INSIDE `architecture-review-full` (it owns the fan-out + all-return barrier), so this workflow declares NO workflow-level parallel groups.
- The workflow-level `why-review` step is the FINAL VALIDATION GATE over the AUDIT FINDINGS — a distinct altitude from the engine's per-face finding-level fix, and the machine-visible guarantee that no audit finding ships without a why-review pass. EVERY prior step routes its output into this gate, and the gate BOTH validates findings AND reviews results across the steps it can reach: (a) the `scout` scope map — validate nothing in-scope was missed and nothing out-of-scope pulled in; (b) the FINALIZED consolidated report — verdict-rollup correctness, dedup completeness, cross-review severity consistency, and each of the three review faces' contributions intact. `docs-update` runs AFTER this gate and is NOT validated by it — it self-validates its own doc diff by re-invoking `why-review` inline on non-trivial edits before workflow-end. Each PRIOR step, on completion, MUST hand its findings + results forward to this gate; a prior step is not done until its output has been routed to the final `why-review`. `docs-update`, which runs after the gate, owns validation of its own output.
- This is a READ-ONLY audit: it produces findings + a verdict only. Every validated finding routes to a FOLLOW-UP `$plan` or feature workflow that owns the fix — no fixes are applied in this workflow.
- SCALE-TECHNIQUE MATRIX (advisory deliverable): the consolidated Architecture Health Report MUST include the merged Technique Applicability Matrix produced by the three sub-reviewers via SYNC:scale-technique-gate — derive the tier ONCE: architecture-scalability-review's tier is authoritative for the merged matrix, note (do not merge) any divergent child tier — then list each warranted technique as PRESENT / MISSING-WARRANTED / N/A-by-scale / OVER-ENGINEERED with advice. This matrix is ADVISORY guidance only: it is deduped onto one axis and NEVER changes any sub-score, the combined verdict, or a gate result. Full catalog: .claude/docs/scale-technique-catalog.md.
- SCENARIO-STRESS MATRIX (advisory deliverable): the consolidated Architecture Health Report MUST also include the merged Scenario Stress Matrix produced by the three sub-reviewers via SYNC:scenario-stress-eval — pin ONE authoritative scale tier AND business-criticality read (architecture-scalability-review's derived T-tier + B-tier is canonical; note, do not merge, any divergent child read) — then judge each in-scope scenario (big-traffic / big-data / dependency-failure / node-loss / data-corruption / self-heal survival vs. business need) WITHSTANDS / DEGRADES-GRACEFULLY / FAILS-HARD / N/A-by-business / OVER-HARDENED. Like the technique matrix this is ADVISORY guidance only: deduped onto one axis, it NEVER changes any sub-score, the combined verdict, or a gate result. Full catalog: .claude/docs/scenario-stress-catalog.md.
- After the final `why-review` gate confirms the report, `docs-update` refreshes any impacted documentation, then `workflow-end` clears state and `watzup` wraps up.
```

### workflow-big-feature — Big Feature (Research + Implement)

- Description: Research-driven feature development for large, complex, or ambiguous features in an existing project — includes idea refinement, market research, business evaluation, domain analysis, tech stack research, and full implementation
- When To Use: User wants to implement a large, complex, or ambiguous feature that needs research, market analysis, business evaluation, domain modeling, or tech stack analysis before implementation. Big new module, major enhancement, cross-cutting capability, or feature where scope is unclear
- Sequence: `idea -> web-research -> deep-research -> business-evaluation -> spec-discovery -> domain-analysis -> why-review -> tech-stack-research -> architecture-design -> architecture-scalability-review -> why-review -> plan -> plan-review -> refine -> why-review -> artifact-review --type=pbi -> story -> why-review -> artifact-review --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> spec -> spec [mode=tests] -> why-review -> artifact-review --type=spec-tests -> spec-clarify -> plan -> plan-review -> scaffold -> architecture-review-full -> plan-validate -> why-review -> plan-execute -> seed-test-data -> domain-entities-review -> integration-test -> integration-test-review -> integration-test-verify -> spec [mode=sync] -> workflow-review-changes -> security-review -> changelog -> test -> scan --target=domain-entities -> docs-update -> workflow-end -> watzup`

Protocol:

```text
BIG FEATURE PROTOCOL (Research-Driven):
For large/ambiguous features in an existing codebase that need research before implementation.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. EVERY research stage requires ask the user directly validation before proceeding
2. Save artifacts to plan directory at EVERY step
3. Present 2-4 options for every major decision with confidence %
4. New Tech/Lib Gate: evaluate top 3 alternatives before adding any new dependency

STEP SELECTION GATE:
After workflow activation, auto-select the applicable steps and skip irrelevant conditional steps. Default step set:
- [x] Discovery Interview (idea)
- [x] Market Research (web-research)
- [x] Deep Research (deep-research)
- [x] Business Evaluation (business-evaluation)
- [x] Refine to PBI (refine)
- [x] Spec Discovery (spec-discovery) — investigate existing Feature Specs + related code before domain modeling; surfaces related/overlapping/affected specs + gaps + the invariant landscape, then a scope-decision gate (NEW/EXTEND/SPLIT). CONDITIONAL: short-circuits on an empty corpus
- [x] Domain Analysis & ERD (domain-analysis)
- [x] Tech Stack Research (tech-stack-research)
- [x] Architecture Scalability Review (architecture-scalability-review) — grade project architecture + scalability BEFORE feature build
- [x] User Stories (story)
- [x] Feature Spec Consolidation (spec) — folds story/pbi-mockup into the tech-free 8-section Feature Spec; these are INPUTS, not re-authored
- [x] Test Specifications (spec [mode=tests])
- [x] Test Spec Review (artifact-review --type=spec-tests)
- [x] Spec Clarification (spec-clarify) — review the consolidated Feature Spec vs the discovered system, audit hypotheses/decisions, and confirm every non-obvious decision with the user (ask the user directly) before the second (implementation) plan
- [x] Implementation Plan (plan)
- [x] Plan Review (plan-review)
- [x] Plan Validation (plan-validate)
- [x] Design Rationale Review (why-review)
- [x] Foundation Review (architecture-review-full) — CONDITIONAL: after $scaffold, grade the built foundation (architecture + scalability + production-readiness) and fix BLOCKED/WARN findings before $plan-execute; skip when $scaffold was skipped
- [x] Implementation (plan-execute)
- [x] Seed Test Data (seed-test-data) — seed QC happy-path data via application-layer commands after implementation
- [x] Domain Entity Review (domain-entities-review) — CONDITIONAL: skip if no domain entity files changed
- [x] Integration Tests (integration-test)
- [x] Review Changes (workflow-review-changes) — consolidated review + fix loop
- [x] Changelog (changelog)
- [x] Tests (test)
- [x] Documentation (docs-update)
- [x] Summary (watzup)

Auto-skip steps that are irrelevant to the prompt; mark skipped steps as completed with a short reason.

PLAN PHASES (quick reference):
- PLAN₁ (after architecture-design): High-level architecture plan. Scope: system design, component boundaries, data flow, tech choices. Based on: research findings + domain analysis.
- PLAN₂ (after artifact-review --type=spec-tests): Sprint-ready implementation plan. Scope: concrete tasks, file changes, test infrastructure, phased steps. Based on: stories + test specs + dependency tables.
The two plans serve different purposes — PLAN₁ is strategic, PLAN₂ is tactical.

SECOND PLANNING ROUND:
After stories + reviews are complete, a second $plan + $plan-review cycle runs.
The first $plan (after architecture-design) is high-level architecture based on research + domain analysis.
The second $plan (after artifact-review --type=spec-tests) incorporates the concrete stories, test specifications, dependency tables, and refinement details into a sprint-ready implementation plan with phased steps.
This ensures the implementation plan reflects all discovered requirements, test strategy, and story dependencies.

TEST SPECIFICATIONS (after artifact-review --type=story, BEFORE second plan):
After stories are reviewed, write TDD specs ($spec [mode=tests]) based on story acceptance criteria.
Review specs ($artifact-review --type=spec-tests) for coverage and correctness.
The second $plan then incorporates test strategy alongside implementation tasks.

ARCHITECTURE SCAFFOLDING (after second plan-review, CONDITIONAL):
The $scaffold step is CONDITIONAL — AI must first self-investigate for existing base abstractions.
Grep for: abstract/base classes, generic interfaces, infrastructure abstractions (IRepository, IUnitOfWork), utility layers (Extensions, Helpers, Utils), frontend foundations (base component/service/store), DI registrations.
If existing scaffolding found → SKIP $scaffold step, mark completed.
If NO foundational abstractions found → PROCEED: create all base abstract classes, generic interfaces, infrastructure abstractions, and shared utilities with OOP/SOLID principles BEFORE any feature story implementation.
All infrastructure behind interfaces with at least one concrete implementation (Dependency Inversion).
For existing projects adding a new module, adapt scaffolding to extend existing base classes rather than creating duplicates.
POST-SCAFFOLD FOUNDATION REVIEW GATE (after $scaffold, before $plan-execute): run $architecture-review-full on the built foundation (architecture-review + architecture-scalability-review + production-readiness-review → one consolidated Architecture Health Report) and fix ALL BLOCKED/WARN findings BEFORE $plan-execute — features MUST build on a reviewed, verified foundation, never on an unreviewed skeleton. CONDITIONAL: skip this review when $scaffold was skipped (existing foundation reused — nothing new to review). Honors the scale-tier guard — it ADVISES right-sized structure, never forces heavyweight architecture onto a small T0/B0 project.
MANDATORY SPEC-DRIVEN BIG-FEATURE GATES:
- Read docs/project-reference/spec-principles.md before $story and $spec [mode=tests] to lock intent and non-negotiable invariants.
- $spec [mode=tests] + $artifact-review --type=spec-tests MUST map each invariant to Section 8 TC IDs.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-machine flows, tests MUST assert persisted state transitions and invalid-transition rejection.
- Before $workflow-end, enforce three-way sync: spec docs ↔ TDD docs ↔ test code via $spec [mode=tests] + $artifact-review --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec [mode=sync] + $docs-update.
SCALE-TECHNIQUE GATE (advisory): during the tech-stack-research, architecture-design, architecture-scalability-review, and architecture-review-full steps, apply SYNC:scale-technique-gate — derive the target scale tier from evidence (T0 internal / T1 <10k / T2 10k–1M / T3 millions+), judge which system-design techniques (rate limiting, caching, load balancing, queues, sharding, autoscaling, CI/CD, observability, DR, etc.) that tier WARRANTS, and record the Technique Applicability Matrix (each warranted technique judged PRESENT / MISSING-WARRANTED / N/A-by-scale / OVER-ENGINEERED). Advise on warranted-but-missing gaps AND advise AGAINST over-provisioning below tier (do NOT add Kubernetes/sharding/multi-region for a small system). production-readiness-review + performance-review run later inside workflow-review-changes. Advisory guidance only — it never changes a score or verdict. Full catalog: .claude/docs/scale-technique-catalog.md.
SCENARIO-STRESS EVAL (advisory): complementing the scale-technique gate top-down, during the tech-stack-research, architecture-design, architecture-scalability-review, and architecture-review-full steps (production-readiness-review + performance-review run later inside workflow-review-changes; and whenever solution-architect authors resilience posture), apply SYNC:scenario-stress-eval — REUSE the scale tier already derived by SYNC:scale-technique-gate, derive the orthogonal business-criticality tier (B0 non-critical / B1 important / B2 business-critical / B3 mission-critical or regulated) from evidence, then stress-test the design against concrete scenarios (traffic spike, sustained + data-volume growth, dependency down/slow, node/zone/region loss, data loss/corruption, poison-message/retry storm, cascading/backpressure, cold start, clock skew/duplicate delivery). Record a Scenario Stress Matrix judging each IN-SCOPE scenario WITHSTANDS / DEGRADES-GRACEFULLY / FAILS-HARD / N/A-by-business / OVER-HARDENED with self-heal + trade-off notes. Apply the criticality-signal floor: regulated / PII / financial / health data, money movement, authentication/identity, or legal-compliance scope floors B at B2+ even absent SLA/SLO docs. Right-size in BOTH directions — advise on FAILS-HARD gaps the business warrants AND advise AGAINST OVER-HARDENED resilience a lean B0/B1 system does not need. Advisory guidance only — it never changes a score or verdict. Full catalog: .claude/docs/scenario-stress-catalog.md.
BROWNFIELD DESIGN-PHASE DIVERGENCE (rationale): big-feature intentionally OMITS greenfield's design-phase security-review, performance-review, linter-setup, and harness-setup — an existing codebase already has that tooling, and the later workflow-review-changes batch runs security-review + performance-review + production-readiness-review on the actual change. Adding them at design time would re-run setup the brownfield project already has (anti-over-engineering).
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (spec→code→tests→review loop): §8 must derive universally-quantified Invariant/Property TCs (for-ALL-inputs rules + boundary counter-cases) for every [HARD] §4 rule and §5 invariant — not just example scenarios — and back them with property/metamorphic tests whose quality bar is the MUTATION-SCORE gate (a surviving mutant on changed core-logic = a missing invariant → write the killing test), NOT line-coverage %. Every behavior-changing finding feeds the Dual-Feedback Ledger into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a code-only fix. Re-review the whole package (spec + tests + code, not just the diff) and loop until a complete review pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
DOMAIN-ENTITY REFERENCE REFRESH (CONDITIONAL TERMINAL STEP):
- After $test and before $docs-update, run $scan --target=domain-entities when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence represented in docs/project-reference/domain-entities-reference.md.
- Otherwise mark the scan step completed with a cited skip reason naming the changed files and why they are outside this scope.
```

### workflow-bugfix — Bug Fix

- Description: Systematic debugging and fix workflow with end-to-start debugger trace before fix
- When To Use: User reports a bug, error, crash, failure, regression, stale/incorrect final output, or something not working; wants to fix/debug/troubleshoot an issue with end-to-start trace
- Sequence: `scout -> investigate -> debug-investigate -> spec [mode=amend] -> plan -> plan-review -> plan-validate -> why-review -> spec [mode=tests] -> why-review -> artifact-review --type=spec-tests -> integration-test -> fix -> prove-fix -> integration-test -> integration-test-review -> integration-test-verify -> spec [mode=sync] -> workflow-review-changes -> changelog -> test -> scan --target=domain-entities -> docs-update -> demo-guide -> workflow-end -> watzup`

Protocol:

```text
BUG FIX PROTOCOL (TDD-FIRST):
PROJECT CONTEXT: Apply the shared SDD Artifact Contract from shared/sdd-artifact-contract.md in the active skills root. Read docs/project-config.json and docs/project-reference/docs-index-reference.md for project-specific conventions. Any supported AI tool may implement or review when this context is synced.
1. Scout: Find files related to the reported issue
2. Investigate: Understand current vs expected behavior and unchanged behavior that must be preserved
   IMPORTANT: When analyzing 'unused' code during investigation:
   - Follow Investigation Protocol (CLAUDE.md)
   - Require grep evidence, confidence >=80%, cross-module/service checks (see docs/project-config.json → workflowPatterns.crossModuleValidation)
   - Use $investigate skill for removal/refactoring decisions
3. Debug: Identify root cause with evidence (file:line)
3b. END-TO-START DEBUGGER TRACE GATE: Start at the observed final symptom/output, identify the final reader, trace backward through storage/projection, writer, consumer/job, producer/origin, enumerate all feeder paths, and build a hypothesis matrix. BLOCKED until owning fix layer and forward convergence proof are written.
4. Plan fix with minimal blast radius
5. Validate plan before implementing
6. Validate fix rationale with $why-review
6b. SPEC-BUG GATE — Run BEFORE writing regression TCs:
   Ask: "Is this a Code Bug or a Spec Bug?"
   • CODE BUG (code doesn't match spec — most common): Spec correctly describes expected behavior. Code diverged. Proceed to step 7.
   • SPEC BUG (spec documented wrong behavior; code implemented the spec faithfully): Do NOT write regression TCs yet. First run $spec [mode=update] to correct the affected Feature Spec sections (§1-7, plus §8 if a TC encoded the wrong behavior). Then return to step 7.
   • AMBIGUOUS: Ask user: "Did the spec ever correctly document this behavior?"
   SIGNAL: Spec MATCHES buggy code → Spec Bug. Spec says X but code does Y → Code Bug.
7. Write test specs ($spec [mode=tests]): Create TC specs asserting the CORRECT (fixed) expected behavior — not the buggy behavior. These become the regression guard.
7b. UI-INTENT / INTERACTION-SURFACE REFRESH — CONDITIONAL: only when the fix changes user-facing behavior (else state the skip reason — backend-only fix, no §6 change). When user-facing behavior changed, run $spec (ui-intent intent) alongside the spec [mode=sync] reconciliation to refresh the affected Feature Spec §6 interaction surface — View Inventory, Key UI States, and the per-story click-path the bug touched — and link the governing design-spec so the §6 interaction-surface stays in sync with the corrected behavior.
8. Review test specs with $artifact-review --type=spec-tests
9. WRITE INTEGRATION TEST — RED phase: Implement integration test(s) based on the bug reproduction spec. Run the test(s) — they MUST FAIL. A passing test means it does NOT actually catch the bug. Never proceed to fix until the test(s) fail.
10. Fix the identified issue
11. PROVE FIX: Build code proof traces per change, confidence scores, stack-trace-style evidence. MANDATORY — never skip.
12. RE-RUN INTEGRATION TESTS — GREEN phase: Run integration tests again — expect all to PASS. This confirms the fix resolves the bug AND regression guard is in place.
13. Review integration tests with $integration-test-review — verify tests have real assertion value, not just smoke/existence checks.
14. Code review for quality and regression risk
15. Update changelog
16. Run full test suite to verify fix and no regressions
17. Summary report of fix and verification results

PERFORMANCE-SDD ROUTE: If this bug fix is performance-related (latency, throughput, memory, query speed, load behavior), run $performance-review and require SLA/benchmark evidence: target metric, baseline, measurement command, and acceptable regression budget. Do not use performance scope to bypass functional no-regression checks: run $test and relevant functional checks when behavior can change. Update the affected Feature Spec (docs/specs/{Bucket}/) for changed SLA, performance constraints, or behavior boundaries.
MANDATORY INVARIANT-PRESERVING BUGFIX LOOP:
- Do not encode buggy behavior into specs/tests. Confirm intended invariant from spec docs first.
- $spec [mode=tests] MUST capture preserved invariants and newly-fixed invariants explicitly.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): regression tests MUST assert entity state before/after transitions and invalid transition rejection.
- RED/GREEN harness proof is mandatory: first $integration-test must fail on the bug, second $integration-test must pass after fix.
- $workflow-end is BLOCKED until specs, TCs, and test code are synchronized via $spec [mode=tests] + $artifact-review --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec [mode=sync] + $docs-update. Performance-related work may delegate measurement to $performance-review, but spec/test/docs sync remains required whenever behavior, public contract, SLA, performance constraints, or docs/spec boundaries change.
- Code-to-spec extraction is reference-only until accepted by the canonical spec owner.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (spec→fix→tests→review loop): the regression §8 TCs must include universally-quantified Invariant/Property TCs (for-ALL-inputs rules + boundary counter-cases) for every [HARD] §4 rule and §5 invariant the bug touched — not just the single reproduction example — backed by property/metamorphic tests whose quality bar is the MUTATION-SCORE gate (a surviving mutant on the fixed core-logic = a missing invariant → write the killing test), NOT line-coverage %. Every behavior-changing finding feeds the Dual-Feedback Ledger into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a code-only patch. Re-review the whole package (spec + tests + fix, not just the diff) and loop until a complete review pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
DOMAIN-ENTITY REFERENCE REFRESH (CONDITIONAL TERMINAL STEP):
- After $test and before $docs-update, run $scan --target=domain-entities when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence represented in docs/project-reference/domain-entities-reference.md.
- Otherwise mark the scan step completed with a cited skip reason naming the changed files and why they are outside this scope.
```

### workflow-code-to-spec — Code to Feature Spec

- Description: Code-to-spec — authors and maintains ONE canonical artifact per capability FROM existing code: the tech-free 8-section Feature Spec at docs/specs/{Bucket}/README.{Feature}.md (code is the technical source of truth; derived bucket INDEX/ERD are regenerable aids). Modes: init-full (zero → Feature Specs), update (incremental sync from code changes), audit (staleness check). For idea→spec (no code yet) use workflow-idea-to-spec.
- When To Use: Initial Feature Spec generation from zero docs, maintaining spec sync after code changes, quarterly spec health audits, before tech migrations, after major features land — authors + three-way-syncs the canonical Feature Spec. Use spec-index instead when only regenerating derived indexes/ERDs.
- Sequence: `scout -> plan -> plan-review -> plan-validate -> spec -> spec [mode=tests] -> artifact-review --type=spec-tests -> artifact-review -> docs-update -> workflow-end -> watzup`

Protocol:

```text
SPEC-DRIVEN-DEV PROTOCOL:
Modes: init-full | update | audit.
Step 0: auto-detect mode, map changed services → App Bucket, confirm capability name(s).
Scale gate: 4+ capabilities = MUST spawn one spec sub-agent per capability in ONE message.
ONE canonical artifact: docs/specs/{Bucket}/README.{Feature}.md (tech-free 8-section Feature Spec; §5 holds the Mermaid ERD INLINE). No separate A-E engineering tree — code is the technical source of truth. Derived bucket INDEX.md/ERD are optional regenerable aids (spec-index mode=index).
Update mode: git diff → impact map → spec [mode=update] (§1-7) → spec [mode=tests] (§8) → artifact-review --type=spec-tests → spec [mode=sync] (§8 ↔ test code) → optional spec-index index refresh.
UI-INTENT / INTERACTION-SURFACE REFRESH — CONDITIONAL: only when the changed code carries user-facing behavior (else state the skip reason — backend-only change, no §6 change). When user-facing behavior is present, the spec authoring step MUST refresh the Feature Spec §6 interaction surface from the implemented code — View Inventory, Key UI States, and the per-story click-path — and link the governing design-spec so the §6 interaction-surface stays coupled to the real UI; backend-only capabilities skip it.
New PBI/requirement update mode: run dor-gate when a new/changed PBI is being made implementation-ready; run pbi-mockup only for UI/user-journey changes.
Audit mode: compare Feature Spec git-history timestamps vs source-code git log → staleness reports.
See .claude/skills/workflow-code-to-spec/SKILL.md for full protocol.
MANDATORY SPEC-DRIVEN SYNC GATES:
- Three-way sync contract (Feature Spec §1-7 ↔ §8 TCs ↔ test code, including the STATE MACHINE DATA ASSERT mandate) is canonical in docs/project-reference/spec-system-reference.md → Three-Way Sync Triad — follow it exactly.
- Run docs-update as a near-final sync before workflow-end; watzup runs after workflow-end for every mode to keep Feature Specs and derived indexes aligned.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (extract spec→derive properties→sync tests→re-review loop): when generating §8 from code, derive universally-quantified Invariant/Property TCs (for-ALL-inputs rules + boundary counter-cases) for every [HARD] §4 rule and §5 invariant the code enforces — not just example scenarios; the test-quality bar for the synced tests is the MUTATION-SCORE gate (a surviving mutant on the spec'd core-logic = a missing invariant → write the killing test), NOT line-coverage %. Any behavior the spec and tests do not jointly cover feeds the Dual-Feedback Ledger into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE). Re-review the whole package (spec + tests + code, not just the diff) and loop until a complete pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
```

### workflow-e2e — E2E Testing

- Description: Generate, update, or maintain E2E/Playwright tests — source-parameterized (changes | recording | update-ui)
- When To Use: User wants to generate, update, or maintain E2E/Playwright tests from code/spec changes (--source=changes), a Chrome DevTools recording (--source=recording), or for UI screenshot baselines (--source=update-ui)
- Sequence: `scout -> e2e-test -> test -> docs-update -> workflow-end -> watzup`

Protocol:

```text
E2E WORKFLOW (source-parameterized):
Resolve --source={changes|recording|update-ui} and follow the matching protocol block in .claude/skills/workflow-e2e/SKILL.md:
- changes: detect change type from git diff (spec/code/API) -> load affected TC-{FEATURE}-{NNN} -> update/generate test implementations -> ensure each TC has a corresponding test -> run tests -> report coverage.
- recording: validate recording JSON -> identify app/feature -> run convert-recording.ts -> map TCs to recording steps -> apply project CSS conventions (docs/project-config.json → workflowPatterns.cssMethodology) -> add screenshot assertions -> Page Object if complex -> run + report.
- update-ui: identify visual diff (SCSS/HTML/TS) -> map to page objects -> find affected specs -> regenerate screenshots (--update-snapshots) -> visual review old vs new -> confirm intentional with user -> report.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (E2E tier — tailored): trace each E2E scenario to the §8 invariant/behavior it guards (name the protected rule, not just the click path) so a scenario fails only when that intended behavior breaks. Property/metamorphic generation and the MUTATION-SCORE assertion gate are scoped to unit/integration core-logic and are N/A at the E2E tier — do NOT force them here. Any coverage gap found feeds the Dual-Feedback Ledger into BOTH the spec (the missing/changed behavior) AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a test-only fix.
```

### workflow-feature — Feature Implementation

- Description: Full feature development workflow with search-first approach, planning, implementation, testing, and documentation
- When To Use: User wants to implement a well-defined feature, add a component, build a capability, develop a module, implement/execute an existing plan, create a new API endpoint, or design an API contract, TDD/test-first development, spec-driven feature implementation with test specs written before code
- Sequence: `scout -> investigate -> spec-discovery -> domain-analysis -> why-review -> spec -> spec-clarify -> plan -> plan-review -> plan-validate -> why-review -> spec [mode=tests] -> why-review -> artifact-review --type=spec-tests -> plan -> plan-review -> plan-execute -> seed-test-data -> domain-entities-review -> spec [mode=tests] -> why-review -> artifact-review --type=spec-tests -> spec [mode=sync] -> integration-test -> integration-test-review -> integration-test-verify -> workflow-review-changes -> security-review -> changelog -> test -> scan --target=domain-entities -> docs-update -> demo-guide -> workflow-end -> watzup`

Protocol:

```text
FEATURE IMPLEMENTATION PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → workflowPatterns and docs/project-reference/docs-index-reference.md for project-specific architecture, test, documentation, naming, and CSS conventions. Apply the shared SDD Artifact Contract from shared/sdd-artifact-contract.md in the active skills root. Any supported AI tool may implement or review when this context is synced.
⚠️ MANDATORY: Search existing code BEFORE planning
1. Scout: Find similar features, patterns, and implementation examples using Grep/Glob
2. Investigate: Study existing patterns - validate with 3+ codebase examples (NOT generic framework docs)
2a. Spec Discovery — CONDITIONAL (short-circuits on empty spec corpus): run $spec-discovery after investigate to investigate all existing Feature Specs AND related code logic FIRST — surfacing related/overlapping/affected specs, missing features/test cases, and the invariant landscape — before authoring the spec.
2b. Domain Analysis — CONDITIONAL: if feature creates/modifies domain entities, run $domain-analysis after spec-discovery to model bounded contexts and ERD before planning.
3. Author Feature Spec: with $spec BEFORE planning, capture intended behavior — §1-7 business rules, invariants, and acceptance criteria the plan and tests are built against. Validate investigation + spec rationale with $why-review.
3b. Spec Clarification (spec-clarify) — BLOCKING ask the user directly gate, BEFORE any planning: validate the freshly-authored §1-7 Feature Spec against the discovered system (AUTHORED-SPEC context), classify each surfaced decision OBVIOUS / NON-OBVIOUS / CONFLICTS, and confirm every NON-OBVIOUS + CONFLICTS + high-impact decision with the user (ask the user directly, recommended option first) before $plan. Spec Validation: questions=5-10.
4. Plan: Design solution following discovered project patterns (architecture, state management, CSS — see docs/project-config.json → workflowPatterns). Include expected behavior, unchanged behavior, and docs/spec/test sync when behavior can change.
5. Validate plan via $plan-review then $plan-validate before any code changes; confirm design rationale with $why-review.
6. Write test specifications with $spec [mode=tests] (before implementation). Review with $artifact-review --type=spec-tests.
7. Update plan with test strategy via $plan (re-plan cycle). Review with $plan-review.
8. Implement with $plan-execute (backend + frontend) — guided by test specs
8b. Domain Entity Review — CONDITIONAL: if domain entity files created/modified, run $domain-entities-review before updating test specs to catch DDD quality issues early.
9. Update test specs to catch implementation gaps with $spec [mode=tests]. Review with $artifact-review --type=spec-tests. Sync §8 TCs ↔ integration test code with $spec [mode=sync].
9b. UI-INTENT / INTERACTION-SURFACE REFRESH — CONDITIONAL: only when the feature adds or changes user-facing behavior (else state the skip reason — backend-only feature, no §6 change). When user-facing behavior is present, run $spec (ui-intent intent) alongside the spec [mode=sync] step to refresh the affected Feature Spec §6 interaction surface — View Inventory, Key UI States, and the per-story click-path — and link the governing $design-spec so the §6 interaction-surface and the design-spec stay coupled to what was actually built.
10. Generate/update integration tests with $integration-test — creates actual test files from TC specifications — then verify with $integration-test-review and $integration-test-verify.
11. Review the full change set with $workflow-review-changes (simplification, code quality, UI, architecture, and patterns compliance).
12. Security review for production readiness with $security-review.
13. Update changelog with feature entry
14. Run tests to verify no regressions
15. Update documentation if feature impacts business docs
16. Summary report of all changes ($workflow-end + $watzup)

PLAN PHASES:
- PLAN₁ (after spec-clarify): Feature design plan. Scope: architecture, file changes, implementation approach.
- PLAN₂ (after artifact-review --type=spec-tests): Updated plan incorporating test strategy. Scope: refine PLAN₁ with test infrastructure, test data setup, spec coverage gaps.

GUARDRAIL: Provide file:line evidence of pattern search in plan. Follow project conventions over generic docs.

PERFORMANCE-SDD ROUTE: If this feature is a performance enhancement (latency, throughput, memory, query speed, load behavior), run $performance-review and require SLA/benchmark evidence: target metric, baseline, measurement command, and acceptable regression budget. Do NOT skip $plan-execute. If behavior can change, run $test and relevant functional no-regression checks. Update the affected Feature Spec (docs/specs/{Bucket}/) for changed SLA, performance constraints, or behavior boundaries.
MANDATORY SPEC-DRIVEN + INVARIANT + TEST HARNESS LOOP:
- Read docs/project-reference/spec-principles.md before $plan and lock feature intent + non-negotiable invariants.
- $spec [mode=tests] MUST map every invariant to TC IDs in §8 Test Specifications.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle behavior, tests MUST assert persisted entity state transitions and invalid-transition rejection.
- $workflow-end is BLOCKED until Feature Spec §1-7, §8 TCs, and test code are synchronized via $spec [mode=tests] + $artifact-review --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec [mode=sync] + $docs-update. Performance-related work may delegate measurement to $performance-review, but spec/test/docs sync remains required whenever behavior, public contract, SLA, performance constraints, or docs/spec boundaries change.
- POST-IMPLEMENTATION SPEC RE-VERIFY (MANDATORY): the $spec authored BEFORE $plan captured intended behavior; after $plan-execute the implemented behavior may have diverged. Before closure, re-verify Feature Spec §1-7 against what was actually built and adjudicate any divergence per SYNC:spec-drift-adjudication (shared/sdd-artifact-contract.md Drift Gates) — CODE-WRONG -> fix code; SPEC-STALE -> run $spec [mode=update] to record the new intended behavior. This is not optional cleanup: a feature that shipped behavior the spec does not describe leaves the spec stale.
- If mismatch exists (spec vs code vs tests), run $spec [mode=update] + $spec [mode=tests] before closure.
- Code-to-spec extraction is reference-only until accepted by the canonical spec owner.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (spec→code→tests→review loop): §8 must derive universally-quantified Invariant/Property TCs (for-ALL-inputs rules + boundary counter-cases) for every [HARD] §4 rule and §5 invariant — not just example scenarios — and back them with property/metamorphic tests whose quality bar is the MUTATION-SCORE gate (a surviving mutant on changed core-logic = a missing invariant → write the killing test), NOT line-coverage %. Every behavior-changing finding feeds the Dual-Feedback Ledger into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a code-only fix. Re-review the whole package (spec + tests + code, not just the diff) and loop until a complete review pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
DOMAIN-ENTITY REFERENCE REFRESH (CONDITIONAL TERMINAL STEP):
- After $test and before $docs-update, run $scan --target=domain-entities when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence represented in docs/project-reference/domain-entities-reference.md.
- Otherwise mark the scan step completed with a cited skip reason naming the changed files and why they are outside this scope.
```

### workflow-feature-spec — Business Feature Documentation

- Description: Business feature documentation with tech-free 8-section Feature Spec template enforcement, plan validation, and mandatory test coverage (TCs in Section 8)
- When To Use: User wants to create or update business feature documentation under the fixed docs/specs Feature Spec root
- Sequence: `scout -> investigate -> plan -> plan-review -> plan-validate -> why-review -> docs-update -> workflow-review-changes -> workflow-end -> watzup`

Protocol:

```text
Role: Documentation Specialist
BUSINESS FEATURE DOC PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → workflowPatterns.featureDocTemplate to find and read the feature doc template — follow its section requirements exactly. Use docs/specs/ for the docs directory.
- TC-{FEATURE}-{NNN} test case format with GIVEN/WHEN/THEN
- Evidence field with `[Source: namespace/service/id]` abstract-anchor format (never physical file:line)
- Cross-reference parent features if sub-feature

MANDATORY UPDATE CHECKLIST (when updating existing docs):
- ALWAYS update the Test Specifications section when documenting new functionality
- Plan MUST ATTENTION include all impacted sections identified from diff analysis
- Plan MUST ATTENTION be validated via $plan-review and $plan-validate before any edits begin

OUTPUT: Complete feature README following template sections.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-greenfield-init — Greenfield Project Init

- Description: Full waterfall project inception from idea through implementation with integration testing
- When To Use: User wants to start a new project from scratch, init a greenfield project, plan a new application, research and plan before coding, bootstrap a new codebase, build something new
- Sequence: `idea -> web-research -> deep-research -> business-evaluation -> spec-discovery -> domain-analysis -> why-review -> tech-stack-research -> architecture-design -> architecture-scalability-review -> why-review -> plan -> plan-review -> security-review -> performance-review -> plan-review -> refine -> why-review -> artifact-review --type=pbi -> story -> why-review -> artifact-review --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> plan-validate -> why-review -> spec [mode=tests] -> why-review -> artifact-review --type=spec-tests -> spec-clarify -> plan -> plan-review -> scaffold -> linter-setup -> harness-setup -> architecture-review-full -> scan --target=ui-system -> scan --target=backend-patterns -> scan --target=integration-tests -> scan --target=project-structure -> why-review -> plan-execute -> domain-entities-review -> spec [mode=tests] -> why-review -> artifact-review --type=spec-tests -> plan -> plan-review -> integration-test -> integration-test-review -> integration-test-verify -> test -> workflow-review-changes -> security-review -> changelog -> test -> scan --target=domain-entities -> docs-update -> workflow-end -> watzup`

Protocol:

```text
GREENFIELD PROJECT INCEPTION PROTOCOL:
You are acting as a Solution Architect for a brand-new project.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. EVERY stage requires ask the user directly validation before proceeding
2. Save artifacts to plan directory at EVERY step
3. All tech recommendations include confidence % and evidence
4. Present 2-4 options for every major decision
5. Delegate architecture decisions to solution-architect agent
6. After workflow activation, auto-select applicable steps and skip irrelevant conditional steps
7. NEVER ask tech stack upfront — business analysis first, tech stack research after domain analysis
8. Domain analysis produces ERD + bounded contexts BEFORE tech stack research
9. Tech stack research compares top 3 options per layer with detailed pros/cons

STEP SELECTION GATE:
After workflow activation, auto-select the applicable steps and skip irrelevant conditional steps. Default step set:
- [x] Discovery Interview (idea)
- [x] Market Research (web-research)
- [x] Deep Research (deep-research)
- [x] Business Evaluation (business-evaluation)
- [x] Refine to PBI (refine)
- [ ] Spec Discovery (spec-discovery) — CONDITIONAL: investigate existing Feature Specs + related code before domain modeling; AUTO-SKIPS at greenfield init (no specs/code yet) — runs only when initializing into a repo that already has specs/code
- [x] Domain Analysis & ERD (domain-analysis) — NEW
- [x] Tech Stack Research (tech-stack-research) — NEW
- [x] Implementation Plan (plan)
- [x] Plan Validation (plan-validate)
- [x] Test Strategy (spec [mode=tests]) — includes integration test strategy
- [ ] Spec Clarification (spec-clarify) — CONDITIONAL: only if a discrete Feature Spec §1-7 is authored (standard greenfield folds the spec into stories + test specs, so this typically auto-skips)
- [x] User Stories (story)
- [x] Final Review (plan-review)
- [x] Foundation Review (architecture-review-full) — post-scaffold gate: grade the built foundation (architecture + scalability + production-readiness) and fix BLOCKED/WARN findings BEFORE $plan-execute
- [x] Reference Doc Set (scan --target=ui-system|backend-patterns|integration-tests|project-structure) — after Foundation Review, before $plan-execute: DERIVE the project-reference doc set from the reviewed foundation + golden-path examples; scaffold already seeded ui-review-principles.md. CONDITIONAL: skip scan --target=ui-system when no UI stack (log reason); the other three always apply

Auto-skip steps that are irrelevant to the prompt; mark skipped steps as completed with a short reason.

PLAN PHASES (quick reference):
- PLAN₁ (after architecture-design): High-level architecture plan. Scope: system design, layer boundaries, component responsibilities, tech choices. Followed by $security-review + $performance-review review of the architecture.
- PLAN₂ (after artifact-review --type=spec-tests): Sprint-ready implementation plan. Scope: concrete tasks, file changes, scaffolding needs, test infrastructure. Based on: stories + test specs from TDD-SPEC₁.
- PLAN₃ (after TDD-SPEC₂ post-implementation): Integration test architecture plan. Scope: test file structure, test data setup, CI integration. Based on: implementation code + updated test specs.
The three plans serve progressively detailed purposes — architecture → implementation → test infrastructure.

SECOND PLANNING ROUND:
After stories + TDD specs are generated and reviewed, a second $plan + $plan-review cycle runs.
This second plan incorporates the concrete stories, test specs, and dependency tables into a detailed implementation plan.
The first plan is high-level architecture; the second plan is sprint-ready with phased implementation steps.

ARCHITECTURE SCAFFOLDING (after second plan-review, CONDITIONAL):
The $scaffold step is CONDITIONAL — AI must first self-investigate for existing base abstractions.
Grep for: abstract/base classes, generic interfaces, infrastructure abstractions (IRepository, IUnitOfWork), utility layers (Extensions, Helpers, Utils), frontend foundations (base component/service/store), DI registrations.
If existing scaffolding found → SKIP $scaffold step, mark completed.
If NO foundational abstractions found → PROCEED: create all base abstract classes, generic interfaces, infrastructure abstractions, and shared utilities with OOP/SOLID principles BEFORE any feature story implementation.
All infrastructure behind interfaces with at least one concrete implementation (Dependency Inversion).
The scaffolded project should be copy-ready as a starter template for similar projects.

IMPLEMENTATION & INTEGRATION TESTING (after scaffold):
After scaffolding, the workflow continues with full implementation and integration testing:
1. $architecture-review-full reviews the built foundation (architecture-review + architecture-scalability-review + production-readiness-review → one consolidated Architecture Health Report); fix ALL BLOCKED/WARN findings BEFORE $plan-execute so every feature builds on a reviewed, verified foundation. Honors the scale-tier guard — ADVISES right-sized structure, never forces heavyweight architecture onto a small T0/B0 project. Then the reference-doc set is ESTABLISHED before any feature code: $scan --target=ui-system, $scan --target=backend-patterns, $scan --target=integration-tests, and $scan --target=project-structure DERIVE the full docs/project-reference set (design-system + scss-styling-guide + frontend/backend patterns + integration-test + project-structure) FROM the reviewed-and-fixed foundation + the Phase-03 golden-path examples, so downstream feature work reads accurate references from day one; scaffold has already hand-authored docs/project-reference/ui-review-principles.md (the UI-review PRINCIPLES the $ui-review gate reads). Skip $scan --target=ui-system when the project has no UI stack (log the reason); the other three always apply.
2. $why-review validates design rationale before coding
3. $plan-execute implements the feature (backend + frontend)
4. $domain-entities-review reviews domain entity DDD quality — CONDITIONAL: skip if no domain entity files in changeset. Detects anemic model, missing invariants, VO misclassification before integration tests are written.
5. $spec [mode=tests] writes test specifications (feature doc Section 8)
6. $artifact-review --type=spec-tests validates spec coverage and correctness
7. Third $plan + $plan-review cycle plans integration test architecture
8. $integration-test generates integration tests from specs
9. $test runs all tests to verify TCs pass
10. $workflow-review-changes for quality (use the canonical changes-review workflow sequence from .claude/workflows.json: changes-review, why-review findings validation, parallel review batch, code-simplifier, verification, plan/plan-review/why-review/plan-execute, and full re-review restart)
11. $security-review for production readiness
12. $changelog + final $test + $docs-update + $watzup to close
This ensures greenfield projects ship with integration test coverage from day one.
SCALE-TECHNIQUE GATE (advisory): during the tech-stack-research, architecture-design, architecture-scalability-review, and production-readiness-review steps, apply SYNC:scale-technique-gate — derive the target scale tier from evidence (T0 internal / T1 <10k / T2 10k–1M / T3 millions+), judge which system-design techniques (rate limiting, caching, load balancing, queues, sharding, autoscaling, CI/CD, observability, DR, etc.) that tier WARRANTS, and record the Technique Applicability Matrix (each warranted technique judged PRESENT / MISSING-WARRANTED / N/A-by-scale / OVER-ENGINEERED). Advise on warranted-but-missing gaps AND advise AGAINST over-provisioning below tier (do NOT add Kubernetes/sharding/multi-region for a small system). Advisory guidance only — it never changes a score or verdict. Full catalog: .claude/docs/scale-technique-catalog.md.
SCENARIO-STRESS EVAL (advisory): complementing the scale-technique gate top-down, during the tech-stack-research, architecture-design, architecture-scalability-review, production-readiness-review, and performance-review steps (and whenever solution-architect authors resilience posture), apply SYNC:scenario-stress-eval — REUSE the scale tier already derived by SYNC:scale-technique-gate, derive the orthogonal business-criticality tier (B0 non-critical / B1 important / B2 business-critical / B3 mission-critical or regulated) from evidence, then stress-test the design against concrete scenarios (traffic spike, sustained + data-volume growth, dependency down/slow, node/zone/region loss, data loss/corruption, poison-message/retry storm, cascading/backpressure, cold start, clock skew/duplicate delivery). Record a Scenario Stress Matrix judging each IN-SCOPE scenario WITHSTANDS / DEGRADES-GRACEFULLY / FAILS-HARD / N/A-by-business / OVER-HARDENED with self-heal + trade-off notes. Apply the criticality-signal floor: regulated / PII / financial / health data, money movement, authentication/identity, or legal-compliance scope floors B at B2+ even absent SLA/SLO docs. Right-size in BOTH directions — advise on FAILS-HARD gaps the business warrants AND advise AGAINST OVER-HARDENED resilience a lean B0/B1 system does not need. Advisory guidance only — it never changes a score or verdict. Full catalog: .claude/docs/scenario-stress-catalog.md.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (spec→code→tests→review loop): §8 must derive universally-quantified Invariant/Property TCs (for-ALL-inputs rules + boundary counter-cases) for every [HARD] §4 rule and §5 invariant — not just example scenarios — and back them with property/metamorphic tests whose quality bar is the MUTATION-SCORE gate (a surviving mutant on changed core-logic = a missing invariant → write the killing test), NOT line-coverage %. Every behavior-changing finding feeds the Dual-Feedback Ledger into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a code-only fix. Re-review the whole package (spec + tests + code, not just the diff) and loop until a complete review pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
```

### workflow-idea-to-pbi — Idea to PBI

- Description: PO/BA idea → grooming-ready backlog. TWO modes: (1) SINGLE-PBI DEEP — one concrete idea/ticket/brief → deep single PBI via idea → draft Feature Spec → TDD test specs → domain → plan → PBI/stories → challenge → DoR → mockup → prioritize; (2) MULTI-OPPORTUNITY DISCOVERY — a raw vision/problem → brainstorm (optionally web-research → deep-research) → RICE opportunity map → user multi-select → light per-opportunity PBI loop → cross-PBI ranked backlog. For idea → ONE provisional Feature Spec only (no backlog) use workflow-idea-to-spec.
- When To Use: PO/BA wants a grooming-ready PBI backlog from an idea. SINGLE-PBI DEEP: a raw idea — or a handed-off artifact/ticket/brief — through to ONE grooming-ready PBI with a provisional Feature Spec, user stories, TDD test specifications, Dev BA PIC challenge, DoR validation, wireframes, and prioritization. MULTI-OPPORTUNITY DISCOVERY: a raw product vision/problem statement → structured brainstorm → RICE opportunity map → user multi-select → multiple PBIs (light per-opportunity loop) → cross-PBI ranked backlog. For idea → ONE provisional Feature Spec only (no backlog), use workflow-idea-to-spec
- Sequence: `web-research -> deep-research -> brainstorm -> idea -> spec-discovery -> artifact-review -> refine -> why-review -> spec [mode=draft] -> spec [mode=tests] -> why-review -> artifact-review --type=spec-tests -> spec-clarify -> domain-analysis -> why-review -> plan -> plan-review -> plan-validate -> why-review -> artifact-review --type=pbi -> story -> why-review -> artifact-review --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> design-spec -> prioritize -> docs-update -> feature-presentation -> workflow-end -> watzup`

Protocol:

```text
IDEA TO PBI PROTOCOL:
Capture and refine a raw idea — or a handed-off artifact/ticket/brief — into a grooming-ready PBI via an idea → test specs → (from those specs) PBI/stories/plan flow, with domain analysis, challenge review, DoR validation, and wireframe. Apply the shared SDD Artifact Contract from shared/sdd-artifact-contract.md in the active skills root and read docs/project-config.json plus docs/project-reference/docs-index-reference.md for project-specific conventions. Any supported AI tool may produce or review artifacts when this context is synced.

MODE DETECTION GATE (FIRST — pick the track before running any step, then declare it to the user):
- SINGLE-PBI DEEP MODE — input is ONE concrete idea / ticket / brief. Run the deep single-PBI track: idea → spec-discovery → refine → spec [mode=draft] → spec [mode=tests] → artifact-review --type=spec-tests → spec-clarify → domain-analysis → plan → plan-review → plan-validate → PBI → stories → challenge → DoR → mockup → design-spec → prioritize. SKIP brainstorm, web-research, and deep-research.
- MULTI-OPPORTUNITY DISCOVERY MODE — input is a raw product vision / problem statement spanning multiple opportunities. Run brainstorm (optionally web-research → deep-research up front to inform framing) → RICE opportunity map → user multi-select → spec-discovery (ONCE, shared across opportunities) → a LIGHT per-opportunity PBI loop (idea → refine → artifact-review --type=pbi → story → artifact-review --type=story → pbi-challenge → dor-gate → pbi-mockup → design-spec), then cross-PBI prioritize. The spec [mode=draft] Feature Spec authoring step, the spec [mode=tests] step, the spec-clarify validation gate, and the plan/plan-review/plan-validate cycle are SINGLE-PBI-DEEP-MODE ONLY — NEVER run them per opportunity (they would multiply N× and stall discovery). domain-analysis runs ONCE up front (shared across opportunities), not per opportunity.
When the input is ambiguous (single concrete ask vs broad vision), ask by asking the user directly before step 1.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. Each step must invoke its skill invocation — never batch-complete or skip steps
2. artifact-review is CONDITIONAL — skip if no existing artifact; proceed straight to refine
3. why-review runs after refine, after spec [mode=tests], after domain-analysis, after plan-validate, and after story. The standalone gate after artifact-review --type=pbi is omitted because artifact-review --type=pbi (like every review skill) self-invokes $why-review --validate-findings internally as a Findings Validation Gate. Each gate validates WHY before the next artifact step proceeds. FAIL blocks the next artifact step; WARN requires user acknowledgment.
4. spec [mode=draft] authors the canonical tech-free 8-section Feature Spec §1-7 (idea-sourced, provisional: true, §8 Evidence: TBD) right after refine, then spec [mode=tests] and artifact-review --type=spec-tests run on that draft (BEFORE the PBI is drafted) so the idea is captured as a §1-7 Feature Spec plus testable §8 TC specifications first; spec-clarify (SINGLE-PBI DEEP MODE ONLY) then validates those §8 test-spec decisions with the user — ask the user directly on every NON-OBVIOUS / CONFLICTS / high-impact decision — BEFORE domain-analysis and decomposition build on them; domain-analysis and plan/plan-review/plan-validate (grafted from the spec-to-pbi analytical half), then the PBI and stories, are derived FROM those specs (idea → draft Feature Spec → test specs → from those specs to PBI)
5. pbi-challenge is run by a reviewer different from the drafter — confirm reviewer identity before that step
6. dor-gate must pass (PASS or WARN) before pbi-mockup is finalized. For UI PBIs, pbi-mockup AND design-spec both run (mockup first, then UI specs) so the PBI carries a faithful HTML mockup that matches the current UI system PLUS tech-agnostic UI specs — both are CONDITIONAL and SKIP for backend-only PBIs (state the skip reason). Both are gated by the existing-UI-research protocol (SYNC:existing-ui-research) so they faithfully match existing screens/components and connected flows. The code-producing design lanes (design --lane=...) are reference-only and are NOT part of this workflow.
7. Save artifacts at every step to the workflow artifact paths used by the child skills. If artifact roots become configurable later, update the workflow and child skills in the same change.
8. Write output IMMEDIATELY after each step — never batch
9. Run docs-update after prioritize and before workflow-end so specs, workflow-feature docs, and TDD/spec docs stay synchronized
10. Treat AI-generated ideas, PBIs, stories, mockups, and TCs as draft/reference until the owning review or acceptance gate approves them.
11. DISCOVERY MODE: $brainstorm MUST produce a RICE-scored opportunity map (3–8 items) before any $idea step. The per-opportunity loop (idea → refine → artifact-review --type=pbi → story → artifact-review --type=story → pbi-challenge → dor-gate → pbi-mockup) repeats for EACH selected opportunity — NOT once. spec [mode=draft], spec [mode=tests], and the plan/plan-review/plan-validate cycle stay SINGLE-PBI-DEEP-MODE ONLY.
12. DISCOVERY MODE: $prioritize at the end is cross-PBI — it ranks ALL PBIs from this session together. This workflow produces a BACKLOG only (no implementation) — hand off to workflow-feature or workflow-big-feature to build the top-ranked PBI.
13. PRIORITY PROPAGATION & VISIBILITY (MANDATORY, both modes): $prioritize MUST write the computed rank/priority back into every generated PBI's frontmatter `priority` field — never leave a generated PBI without priority. The pbi-mockup generated files AND the feature-presentation deck MUST display each PBI's priority info (rank + RICE/MoSCoW band) — the mockup in its header, the deck in its Scope & backlog slide. This workflow's spec→pbi decomposition half is IDENTICAL to workflow-spec-to-pbi (idea-to-pbi == idea-to-spec + spec-to-pbi).

STEP SELECTION GATE:
After workflow activation, present the full step list and let user deselect irrelevant ones:
- [x] Brainstorm (brainstorm) — DISCOVERY MODE ONLY: Double Diamond → RICE-scored opportunity map (3–8 items); SKIP in single-PBI deep mode
- [ ] Market research (web-research) — DISCOVERY MODE, CONDITIONAL: skip for internal tools or well-understood domains
- [ ] Deep research (deep-research) — DISCOVERY MODE, CONDITIONAL: runs only when web-research ran; deep-dive top sources into an evidence base that feeds brainstorm (skipped automatically when web-research is skipped)
- [x] Idea capture (idea) — REPEATS per selected opportunity in discovery mode
- [x] Spec discovery (spec-discovery) — investigate existing Feature Specs + related code BEFORE drafting PBIs so an already-spec'd capability is never duplicated; surfaces related/affected specs + gaps; runs ONCE up front (shared across opportunities in discovery mode). CONDITIONAL: short-circuits on an empty corpus
- [ ] Review existing artifact (artifact-review) — CONDITIONAL: only if PO artifact/ticket exists
- [x] Refine to PBI (refine) — hypothesis, AC, RICE, GIVEN/WHEN/THEN; REPEATS per opportunity in discovery mode
- [x] Refinement rationale review (why-review) — after refine
- [x] Feature Spec draft (spec [mode=draft]) — SINGLE-PBI DEEP MODE ONLY: author the canonical tech-free 8-section Feature Spec §1-7 (idea-sourced, provisional: true, §8 Evidence: TBD) BEFORE the §8 test specs
- [x] Test specifications (spec [mode=tests]) — SINGLE-PBI DEEP MODE ONLY: generate TCs FROM the refined idea (idea → draft Feature Spec → specs)
- [x] Test-spec rationale review (why-review) — after spec [mode=tests] (deep mode)
- [x] Test specification review (artifact-review --type=spec-tests) — deep mode
- [x] Spec validation (spec-clarify) — SINGLE-PBI DEEP MODE ONLY: validate the §8 test-spec decisions with the user (TEST-SPEC context) before domain-analysis; the light per-opportunity discovery loop EXCLUDES it (would multiply N×)
- [x] Domain analysis (domain-analysis) — CONDITIONAL: skip if no new/changed entities; in discovery mode runs ONCE up front (shared)
- [x] Domain rationale review (why-review) — after domain-analysis
- [x] Implementation plan (plan) — SINGLE-PBI DEEP MODE ONLY
- [x] Plan review (plan-review) — deep mode
- [x] Plan validation (plan-validate) — deep mode
- [x] Plan rationale review (why-review) — after plan-validate (deep mode)
- [x] PBI review (artifact-review --type=pbi)
- [x] User stories (story)
- [x] Story rationale review (why-review) — after story
- [x] Story review (artifact-review --type=story)
- [x] Dev BA PIC challenge (pbi-challenge)
- [x] Definition of Ready gate (dor-gate)
- [x] PBI mockup/wireframe (pbi-mockup) — CONDITIONAL: skip for backend-only PBIs; the mockup MUST faithfully match the current UI system (gated by existing-UI-research) AND link back to the governing Feature Spec §6 interaction surface (View Inventory / Key UI States / per-story click-path) so the mockup is traceable to §6
- [x] UI design spec (design-spec) — CONDITIONAL: skip for backend-only PBIs; authors the PBI's tech-agnostic UI specs right after the mockup so every UI PBI carries BOTH a faithful mockup AND UI specs (both gated by SYNC:existing-ui-research), and the design-spec's View Inventory / Key UI States / per-story click-path must link back to (and stay consistent with) the governing Feature Spec §6 interaction surface
- [x] Backlog prioritization (prioritize)
- [x] Documentation synchronization (docs-update) — near-final sync for specs, workflow-feature docs, and TDD/spec docs
- [x] Stakeholder presentation (feature-presentation) — synthesize all session ideas/specs/PBIs/stories/design-specs/mockups into ONE standalone HTML slide deck for PO/BA/Dev/QC; embeds each existing -mockup.html via <iframe srcdoc> (never regenerated); gap-fills missing PBIs/mockups via workflow-spec-to-pbi / pbi-mockup run as sub-agents

WHY-REVIEW GATES (repeated, purpose-specific):
Run in sequence after refine, after spec [mode=tests], after domain-analysis, after plan-validate, and after story (the after-plan-validate gate covers the rationale before artifact-review --type=pbi; artifact-review --type=pbi also self-invokes $why-review --validate-findings internally as a Findings Validation Gate). Challenge the active artifact rationale before the next artifact step:
- Is this the right next artifact/solution to the stated problem? What was rejected and why?
- Are the acceptance criteria, story, or TC constraints justified? What breaks if they change?
- Pre-mortem: if this PBI ships and fails in 3 months, what breaks?
- Are there simpler alternatives the team has not considered?
Output: Why-Review checklist with PASS/WARN/FAIL + adversarial analysis section.
FAIL blocks the next artifact step — active artifact must be revised first.

TDD-SPEC GATE (after refine + spec [mode=draft], BEFORE the PBI is drafted):
With the canonical §1-7 Feature Spec drafted (spec [mode=draft]), map the refined idea’s acceptance criteria into §8 TC specifications up front, so the PBI, stories, and plan are derived FROM the draft Feature Spec + its test specs:
- Each material acceptance criterion should map to at least one TC ID
- Route planned TC IDs to Feature doc Section 8 through $spec [mode=tests]; $docs-update later verifies workflow-feature docs and §8 TC ↔ integration test code sync
- Cover happy path, validation failure, authorization/permission, and important edge cases where applicable
- Review specs with artifact-review --type=spec-tests before pbi-challenge so reviewers evaluate a testable PBI
- AI-generated TC drafts are reference-only until review and DoR gates accept them.

SPEC-CLARIFY VALIDATION GATE (SINGLE-PBI DEEP MODE ONLY — after artifact-review --type=spec-tests, before domain-analysis — BLOCKING ask the user directly):
Once the §8 test specs are authored and reviewed, spec-clarify validates the decisions encoded in them WITH the user before any domain/plan/decomposition work builds on them. Context = TEST-SPEC (a refined idea + drafted §1-7 Feature Spec + §8 TCs): it walks the applicable validation categories (business rules/invariants the §8 set assumes, test-case coverage gaps, cross-spec conflicts vs the spec-discovery landscape), classifies each surfaced decision OBVIOUS / NON-OBVIOUS / CONFLICTS, and asks the user (ask the user directly, ≤4 options per call, recommended first, multiple calls as needed) to confirm every NON-OBVIOUS + CONFLICTS + high-impact decision. Confirmed answers are written back into the refined idea / §8 + a Decisions Log; residual <80%-confidence items become Open Questions. NEVER runs in MULTI-OPPORTUNITY DISCOVERY MODE (the light per-opportunity loop excludes it). Spec Validation: questions=3-6 (TEST-SPEC context budget — ask ≥3 only when ≥3 genuine decisions surface; never invent filler to hit the minimum).

MULTI-OPPORTUNITY DISCOVERY LOOP (DISCOVERY MODE core mechanic — folded in from product discovery):
The $brainstorm step produces a RICE-scored opportunity map — typically 3–8 opportunities. Present it to the user (ask the user directly, multiSelect: true): 'Which opportunities should we develop into PBIs?'. Run the OPPORTUNITY-MAP WHY-REVIEW gate (below) BEFORE the loop. Then for EACH selected opportunity, run this LIGHT loop (9 steps — NO spec [mode=draft], NO spec [mode=tests], NO spec-clarify, NO plan/plan-review/plan-validate; domain-analysis already ran once up front):
  1. $idea — capture as a structured artifact
  2. $refine — PBI with hypothesis, AC, RICE, GIVEN/WHEN/THEN
  3. $artifact-review --type=pbi — BA quality check
  4. $story — user stories per PBI
  5. $artifact-review --type=story — story quality check
  6. $pbi-challenge — Dev BA PIC review (reviewer ≠ drafter)
  7. $dor-gate — INVEST + DoR pass/fail
  8. $pbi-mockup — wireframe, faithfully matching the current UI system (SKIP for backend-only PBIs)
  9. $design-spec — tech-agnostic UI specs for the PBI (SKIP for backend-only PBIs)
After ALL opportunities are processed: run $prioritize across all PBIs (cross-PBI).

TASK DECOMPOSITION GATE (DISCOVERY MODE): After the user selects opportunities, call task tracking for EVERY task (N opportunities × 9 loop steps = N×9 tasks min) BEFORE processing any opportunity — do NOT start the loop without a complete task list.

SCALE MANAGEMENT (DISCOVERY MODE): For 6+ selected opportunities, spawn one sub-agent per opportunity (each gets brainstorm context + its task list); the main context runs $prioritize at the end. After every 3 opportunities, update the session summary table.

BRAINSTORM STEP REQUIREMENTS (DISCOVERY MODE):
- Detect scenario: problem-solving vs new product vs enhancement
- Apply Double Diamond: problem framing (5 Whys/HMW/JTBD) → opportunity framing (OST/Lean Canvas) → ideation (SCAMPER/Crazy 8s) → convergence (RICE/Kano/2×2)
- Output: opportunity map with 3–8 RICE-scored items, documented in plans/{plan-dir}/brainstorm-opportunity-map.md

OPPORTUNITY-MAP WHY-REVIEW GATE (DISCOVERY MODE — after brainstorm, before the per-opportunity loop):
Before committing to the loop, validate the opportunity map rationale:
- Are the top-ranked opportunities truly the right problems to solve? What was deprioritized and why?
- Are RICE scores well-founded or speculative? Challenge Reach and Impact estimates.
- Pre-mortem: if these opportunities are built and miss in 6 months, what was the root cause?
- Are there systemic alternatives (platform/process change) that make these opportunities unnecessary?
Output: Why-Review checklist with PASS/WARN/FAIL per opportunity. FAIL on a high-ranked opportunity → remove from selection or revisit brainstorm framing; WARN → document risk and proceed with user acknowledgment.

CROSS-PBI PRIORITIZE (DISCOVERY MODE):
- Aggregate ALL PBIs produced this session; apply cross-PBI RICE + a dependency graph
- Produce a sprint-ready ranked backlog; flag Must/Should/Could-Have per release scope
- Output to the configured backlog artifact root

HANDOFF:
At workflow-end, AI MUST ATTENTION present:
- Summary: single-PBI deep mode → 1 PBI created (test specs created/reviewed, plan, DoR result); discovery mode → N PBIs created, X passed DoR, Y need rework, ranked backlog produced; docs sync completed; any blocking items
- Stakeholder deck: ONE standalone HTML slide presentation at team-artifacts/presentations/{YYMMDD}-presentation-{slug}.html synthesizing every PBI/story/spec + embedded mockups for PO/BA/Dev/QC review
- Recommended next workflow: $start-workflow workflow-feature or $start-workflow workflow-big-feature (implement the PBI / top-ranked PBI from the backlog)
- Any DoR failures: list specific blocking criteria that must be resolved
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-idea-to-spec — Idea to Feature Spec

- Description: Idea-to-spec — turns a raw idea/vision/problem statement into ONE canonical, provisional Feature Spec (the tech-free 8-section spec + §8 test specs at docs/specs/{Bucket}/README.{Feature}.md, Evidence: TBD until code lands). STOPS at the reviewed Feature Spec — it does NOT produce a PBI backlog. For a backlog, chain workflow-spec-to-pbi afterward. For code→spec (implementation already exists) use workflow-code-to-spec.
- When To Use: PO/BA wants to turn a raw product idea, vision, or problem statement into ONE canonical (provisional) Feature Spec — spec-driven: idea → framing → Feature Spec (the tech-free 8-section spec + §8 test specs, Evidence: TBD until code lands). STOPS at the reviewed Feature Spec; for a PBI backlog chain workflow-spec-to-pbi next, or use workflow-idea-to-pbi for idea → full backlog in one pass
- Sequence: `web-research -> deep-research -> brainstorm -> spec-discovery -> domain-analysis -> why-review -> idea -> spec [mode=draft] -> spec [mode=tests] -> artifact-review --type=spec-tests -> artifact-review -> design-spec -> spec-clarify -> why-review -> docs-update -> feature-presentation -> workflow-end -> watzup`

Protocol:

```text
IDEA-TO-SPEC PROTOCOL (SPEC-DRIVEN, STOPS AT SPEC):
Converts a raw idea / product vision / problem statement into ONE canonical, provisional Feature Spec. This workflow ENDS at a reviewed Feature Spec — it does NOT decompose into PBIs, stories, or a backlog. If the user wants a backlog, hand off to workflow-spec-to-pbi after this workflow completes.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. Each idea-framing stage (brainstorm, spec-discovery scope gate, domain-analysis, why-review) requires ask the user directly validation before proceeding; the spec-clarify clarification gate likewise requires ask the user directly confirmation of every non-obvious decision before the spec is finalized.
2. Save ALL artifacts to configured artifact and plan roots at EVERY step — write IMMEDIATELY after each task, never batch.
3. (CONDITIONAL) $web-research then $deep-research run BEFORE $brainstorm to gather external market / competitor / best-practice evidence that FEEDS the framing — AUTO-SKIP both for internal tools / well-understood domains (record the skip reason); $deep-research runs only when $web-research ran. $brainstorm then frames the idea (problem framing → opportunity framing → convergence), informed by that evidence when present, and converges on the SINGLE feature/capability to spec. If multiple distinct capabilities emerge, confirm scope with the user and author one Feature Spec per capability (sub-agent per capability for 4+).
4. SPEC-DRIVEN MANDATE: the idea is authored as a canonical Feature Spec via $spec [mode=draft] (idea-sourced, no code yet → §8 Evidence: TBD, provisional marker), then §8 test specs via $spec [mode=tests], then reviewed. NEVER skip the Feature Spec.
5. PROVISIONAL OUTPUT: because no code exists yet, the spec is provisional — §8 TCs carry Evidence: TBD and Status: Planned, and the spec frontmatter carries provisional: true. The first workflow-code-to-spec / spec [mode=update] run against real code upgrades TBD → real [Source:] anchors and clears the provisional flag.
6. NO BACKLOG: this workflow produces the Feature Spec (plus, for UI ideas, its tech-agnostic UI design specs via $design-spec) only — no PBI/story/DoR/mockup/prioritize. $design-spec authors UI SPECS ONLY (no HTML mockup, no backlog) so the spec-only contract holds; the mockup + full backlog belong to workflow-spec-to-pbi (chain it next) or workflow-idea-to-pbi (idea → full backlog one-shot).

STEP SELECTION GATE:
After workflow activation, auto-select the applicable steps and skip irrelevant conditional steps. Default step set:
- [ ] Market & domain research (web-research) — CONDITIONAL, AUTO-SKIP for internal tools or well-understood domains: discover existing products / competitors / market solutions for this idea + the common best-practice patterns, so the brainstorm is informed by what already exists
- [ ] Deep research (deep-research) — CONDITIONAL, runs only when web-research ran: deep-dive the top sources into an evidence base that FEEDS the brainstorm (skipped automatically when web-research is skipped)
- [x] Brainstorm — Double Diamond: problem frame, HMW, SCAMPER, converge on the capability to spec
- [x] Spec discovery (spec-discovery) — investigate existing Feature Specs + related code BEFORE authoring: surface related/overlapping/affected specs, missing features/test-cases/user-stories, system unknowns, and the invariant landscape, then a scope-decision gate (NEW standalone spec / EXTEND an existing spec / SPLIT into N). CONDITIONAL: auto-short-circuits on an empty corpus (greenfield — no specs and no code yet)
- [x] Domain Analysis (domain-analysis) — CONDITIONAL: skip if no new domain entities involved
- [x] Why-Review (why-review) — validate the idea framing is the right problem before authoring the spec
- [x] Idea capture (idea) — capture the converged idea as a structured artifact
- [x] Feature Spec authoring (spec [mode=draft]) — author the canonical tech-free 8-section Feature Spec §1-7 (idea-sourced, provisional) at docs/specs/{Bucket}/README.{Feature}.md
- [x] Feature Spec test specs (spec [mode=tests]) — author §8 TC-{FEATURE}-{NNN} behavioral test cases (Evidence: TBD, Status: Planned)
- [x] Test-spec review (artifact-review --type=spec-tests)
- [x] Feature Spec review (artifact-review) — quality-check the authored Feature Spec
- [x] UI design spec (design-spec) — CONDITIONAL, UI ideas only: author tech-agnostic UI specs for the spec'd capability AND couple them to the governing Feature Spec §6 interaction surface — the design-spec's View Inventory / Key UI States / per-story click-path must link back to (and stay consistent with) §6; NO mockup, NO PBI/backlog (spec-only contract preserved); gated by SYNC:existing-ui-research so specs faithfully match the current UI system. SKIP for backend-only ideas
- [x] Spec clarification (spec-clarify) — review the authored spec vs the discovered system, brainstorm open questions, audit every hypothesis/decision (OBVIOUS / NON-OBVIOUS / CONFLICTS), and ask the user (ask the user directly) to confirm every non-obvious decision before the spec is finalized
- [x] Why-Review (why-review) — validate the authored spec's rationale + completeness
- [x] Docs sync (docs-update) — sync Feature Spec (§8) and derived bucket indexes
- [x] Stakeholder presentation (feature-presentation) — synthesize the authored Feature Spec(s) + design-specs into ONE standalone HTML slide deck for PO/BA/Dev/QC; SPEC-ONLY: design-spec ASCII wireframes + inventory/states/tokens tables, NO HTML mockups (preserves the spec-only contract)

SPEC AUTHORING FLOW (core mechanic — idea → provisional Feature Spec):
  1. (CONDITIONAL) Run $web-research to discover existing products, competitors, market solutions, and common best-practice patterns for this idea — AUTO-SKIP for internal tools / well-understood domains (record the skip reason).
  2. (CONDITIONAL) Run $deep-research to deep-dive the top sources from step 1 into an evidence base — runs only when step 1 ran; its findings FEED the brainstorm.
  3. Run $brainstorm to frame the idea (informed by the research evidence when present) and converge on the capability to spec.
  4. Run $spec-discovery to investigate the surrounding system BEFORE authoring — Glob docs/specs/** to classify every related/overlapping/affected Feature Spec, $scout + graph-trace the related code logic, then surface gaps (missing features/test-cases/user-stories), system unknowns, and the existing invariant landscape the idea must respect. Ends in a BLOCKING scope-decision gate (NEW standalone spec / EXTEND existing spec X via $spec [mode=update] / SPLIT into N). CONDITIONAL: on an empty corpus (no specs + no code) it records the reason and short-circuits.
  5. Run $domain-analysis if new domain entities are implied (skip otherwise).
  6. Run $why-review to validate the idea framing (right problem? pre-mortem? systemic alternatives?).
  7. Run $idea to capture the converged idea as a structured artifact → configured idea artifact root.
  8. Run $spec [mode=draft] to author the canonical tech-free 8-section Feature Spec §1-7 from the idea text + the spec-discovery landscape (cross-reference related specs, respect the discovered invariants; provisional marker) → docs/specs/{Bucket}/README.{Feature}.md.
  9. Run $spec [mode=tests] to author §8 TC-{FEATURE}-{NNN} behavioral test cases (Evidence: TBD, Status: Planned — pure behavior, before any code).
  10. Run $artifact-review --type=spec-tests — test-spec quality check.
  11. Run $artifact-review — Feature Spec quality check.
  12. (CONDITIONAL — UI ideas only) Run $design-spec to author the idea's tech-agnostic UI specs — UI-spec author ONLY: NO mockup, NO PBI/backlog (the spec-only contract is preserved). Gated by the existing-UI-research protocol (SYNC:existing-ui-research) so the specs faithfully match the current UI system's existing screens/components and connected flows. SKIP for backend-only ideas (record the skip reason).
  13. Run $spec-clarify (AUTHORED-SPEC context) to validate the freshly-authored spec vs the discovered system: walk EVERY applicable validation category (scope & boundaries, actors/roles/permissions, business rules/invariants, data model/lifecycle/states, process/edge/error flows, acceptance-criteria completeness, §8 TC coverage, cross-spec conflicts, non-functional), classify every hypothesis/decision (OBVIOUS / NON-OBVIOUS / CONFLICTS), brainstorm open questions, then a BLOCKING clarification gate that asks the user (ask the user directly) to confirm every NON-OBVIOUS + CONFLICTS + high-impact decision within the budget; confirmed answers are written back into §1-8 + a Decisions Log. Loops $spec [mode=update] when material gaps are found.
  14. Run $why-review — validate the authored spec's rationale and completeness.
  15. Run $docs-update to sync the Feature Spec (§8) and derived bucket indexes.
  16. Run $feature-presentation to synthesize the authored Feature Spec(s) + design-specs into ONE standalone HTML slide deck for PO/BA/Dev/QC (spec-only: design-spec ASCII visuals + inventory/states/tokens tables, NO HTML mockups — the spec-only contract holds). Output → team-artifacts/presentations/{YYMMDD}-presentation-{slug}.html.

BRAINSTORM STEP REQUIREMENTS:
- Detect scenario: problem-solving vs new product vs enhancement
- Apply Double Diamond: problem framing (5 Whys/HMW/JTBD) → opportunity framing (OST/Lean Canvas) → ideation (SCAMPER/Crazy 8s) → convergence (pick the capability to spec)
- Output: the converged capability (or a short list, if multiple capabilities — confirm scope with the user)
- Document in plans/{plan-dir}/brainstorm-idea-frame.md

HANDOFF:
At workflow-end, AI MUST ATTENTION present:
- Summary: M Feature Specs authored (provisional), §8 TC counts, open questions (confidence < 80%)
- Feature Specs authored: list the docs/specs/{Bucket}/README.{Feature}.md paths created
- Provisional note: these specs carry Evidence: TBD + provisional: true until code lands — reconcile via workflow-code-to-spec / spec [mode=update] once implemented
- Stakeholder deck: ONE standalone HTML slide presentation at team-artifacts/presentations/{YYMMDD}-presentation-{slug}.html synthesizing the Feature Spec(s) + design-spec visuals for PO/BA/Dev/QC review
- Recommended next workflow: $start-workflow workflow-spec-to-pbi (decompose the Feature Spec(s) into a grooming-ready PBI backlog) OR $start-workflow workflow-feature (implement directly from the spec)

AUTO-SKIP RULES:
- web-research / deep-research: CONDITIONAL — AUTO-SKIP for internal tools / well-understood domains where external market/competitor/best-practice evidence would not change the spec; when run, web-research feeds deep-research which feeds the brainstorm. deep-research is skipped automatically whenever web-research is skipped. Always record the skip reason
- spec-discovery: NEVER skip when any Feature Spec or code exists — it is the pre-spec landscape investigation; CONDITIONAL auto-short-circuit ONLY on a truly empty corpus (no docs/specs/** and no code), recorded with a reason
- spec-clarify: NEVER skip — the user-confirmation gate is the whole point; when zero non-obvious decisions surface it still records the OBVIOUS decisions + verdict and proceeds
- spec [mode=draft] / spec [mode=tests]: NEVER skip — Feature Spec authoring is the spec-driven core of this workflow
- domain-analysis: skip if no new entities/aggregates — ask: 'Does this idea involve new domain entities?'

WHY-REVIEW GATE (after domain-analysis, before spec authoring):
Before committing to authoring the spec, validate the idea framing:
- Is this truly the right problem to solve? What was deprioritized and why?
- Pre-mortem: if this is built and misses in 6 months, what was the root cause?
- Are there systemic alternatives (e.g., platform change, process change) that make this unnecessary?
Output: Why-Review checklist with PASS/WARN/FAIL.
FAIL → revisit brainstorm framing before authoring. WARN → document risk and proceed with user acknowledgment.

SPEC-DISCOVERY SCOPE-DECISION GATE (after spec-discovery, before domain-analysis — BLOCKING ask the user directly):
Before any spec is authored, spec-discovery presents the landscape and asks the user to choose the spec's scope so a duplicate/overlapping spec is never written:
- (a) NEW standalone Feature Spec — nothing existing covers this capability.
- (b) EXTEND existing spec X — reroute to $spec [mode=update] on the named spec instead of authoring a new one.
- (c) SPLIT into N specs — the idea spans multiple capabilities/buckets.
Also confirm WHICH existing specs the author must cross-reference. On an empty corpus this gate is skipped (recorded reason).

SPEC-CLARIFY CLARIFICATION GATE (after artifact-review, before final why-review — BLOCKING ask the user directly):
After the spec is authored and quality-checked, spec-clarify runs in AUTHORED-SPEC context (a freshly-authored full §1-8 — the widest audit). It walks EVERY applicable validation category against the discovered system — scope & boundaries (§1), actors/roles/permissions (§7), business rules & invariants (§4/§5, including invariants the spec must RESPECT from the landscape), data model/lifecycle/states (§5), process/edge/error flows (§6), acceptance-criteria completeness (§3), §8 test-case coverage (presence/scope only — defer TC rigor to artifact-review --type=spec-tests), cross-spec conflicts & overlaps, and non-functional constraints — classifies every surfaced hypothesis/decision OBVIOUS / NON-OBVIOUS / CONFLICTS, and brainstorms open questions (adversarial pre-mortem). It then presents every NON-OBVIOUS + CONFLICTS + high-impact decision as structured options (≤4 per call, recommended first, multiple calls as needed) and asks the user to confirm. Breadth of probing is mandatory; the question count is bounded by the budget — ask ≥MIN only when ≥MIN genuine decisions surface, NEVER invent filler to hit the minimum. Confirmed answers are written back into §1-8 + a Decisions Log; residual <80%-confidence items are logged as Open Questions. Verdict: CLARIFIED or NEEDS-AUTHORING-FIX (loop $spec [mode=update]). Spec Validation: questions=5-10 (AUTHORED-SPEC context budget — the widest of the three because a freshly-authored spec encodes the most unconfirmed author assumptions).
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-integration-test-green — Integration Test Green (Verify · Adjudicate · Fix · Loop)

- Description: Drive an integration-test suite to fully green with a bounded convergence loop — verify the whole system (or the named target), adjudicate every failure with debug-investigate + integration-test-review before any edit, fix at the owning layer, re-verify from scratch, then sync spec TCs, the integration-test reference doc, and feature docs
- When To Use: Make all integration tests pass, fix failing integration tests, drive the integration test suite to green, run the whole integration test suite and fix whatever fails, integration tests are red after a change, verify the whole system integration tests pass repeatably, loop until all integration tests are green, diagnose and fix an intermittent or flaky integration test
- Sequence: `scout -> integration-test-verify-loop -> debug-investigate [on-failure] -> fix [on-failure] -> spec [mode=sync] -> scan --target=integration-tests -> docs-update -> workflow-end -> watzup`

Protocol:

```text
INTEGRATION TEST GREEN PROTOCOL (Verify → Adjudicate → Fix → Re-verify, looped):
⚠️ PROJECT CONTEXT: Read docs/project-config.json → integrationTestVerify (quickRunCommand, testProjectPattern, testProjects, systemCheckCommand, startupScript, referenceDocs) AND framework.integrationTestDoc before any test command. NEVER hardcode a language-specific runner.
⚠️ SCOPE DEFAULT: the WHOLE SYSTEM. With no target in the prompt, verify EVERY integration-test project discoverable via testProjectPattern > testProjects — NOT the git-changed subset. A target named in the prompt (suite, module, feature, diff/branch/PR) narrows the scope; state how it was resolved.

1. Scout: resolve the target scope to a concrete test-project list (fast when the scope is the whole system — record the discovered project list as the scope string).
2. Integration Test Verify Loop ($integration-test-verify-loop): the core convergence engine. Sets the Goal Contract FIRST, then loops:
   a. Run $integration-test-verify INLINE over the fixed scope (passed explicitly) — 2 consecutive green runs without DB reset, real Passed/Failed/Skipped counts.
   b. On ANY failure, adjudicate BEFORE any edit by running BOTH INLINE: $debug-investigate (end-to-start trace to a file:line root cause at the invariant-owning layer, validated by its own $why-review gate) AND $integration-test-review in REPORT-ONLY mode (8 gates: assertion value, data state, repeatability, domain logic, spec traceability, three-way sync, change coverage, scenario fidelity) — it STOPS after its findings report; the loop owns fixing and re-running.
   c. Emit ONE written Fault Verdict per failure: TEST-WRONG | TEST-NOT-OPTIMAL | SOURCE-WRONG | ENVIRONMENT-BLOCKED | AMBIGUOUS, each with file:line evidence and confidence. AMBIGUOUS → ask the user directly, never a silent pick between source and test.
   d. $fix at the OWNING layer (Entity > Service > Handler), never the crash site. SOURCE-WRONG keeps/strengthens the test that caught it. TEST-NOT-OPTIMAL repairs the SCENARIO with an ARRANGE-phase barrier on a real observable.
   e. CONDITIONAL $changes-review — in EVERY round that applied ANY fix (source, test, scenario, or spec), run $changes-review INLINE and REPORT-ONLY over that round's fix diff (the files changed since the round's snapshot), validate its findings with $why-review --validate-findings, and fold every VALIDATED finding into the SAME round's fix set. No fix landed → skip with a recorded reason. Unfixable validated findings → STOP and escalate. This SUBSUMES the SOURCE-WRONG verdict's own changes-review obligation — run it once per round over the whole fix diff, never twice, and never open a nested review→fix loop inside a round.
   f. Round Integrity Check (BLOCKING): executed test count must not decrease, skipped count must not increase, scope must not shrink.
   g. Re-verify from a FRESH full run. Round cap 3; failing count not shrinking across 2 rounds, failures increasing, cap hit with failures open, lost coverage, an open validated $changes-review finding, or ENVIRONMENT-BLOCKED → STOP and escalate by asking the user directly.
3. Spec Sync ($spec [mode=sync]): reconcile §8 TC-{FEATURE}-{NNN} specs ↔ the executing test code. Update each TC CoveredBy field with all covering {File}::{MethodName} links (1 TC → many tests is correct).
4. Integration Test Doc Scan ($scan --target=integration-tests): regenerate the integration-test project-reference doc so patterns, fixtures, helper conventions, and suite inventory reflect the tests as they now stand after the loop.
5. Docs Update ($docs-update): update every OTHER impacted doc — feature-doc evidence fields, version history, and any doc embedding test counts or coverage claims that the loop changed.
6. Close the workflow and summarize.

GUARDRAIL — NEVER force green: no weakened or removed assertions, no skip annotations, no widened assertion timeouts, no retries wrapped around a failing assertion, no repository-hacked domain data, no narrowed scope. Fix the scenario or the product defect, then restart the 2-run gate from run 1.
GUARDRAIL — a suite that got greener by losing tests REGRESSED. The Round Integrity Check is blocking, not advisory.
GUARDRAIL — ENVIRONMENT-BLOCKED is not a loop condition: STOP, mark BLOCKED, and point the user at startupScript. NEVER change a test because the system was down.
GUARDRAIL — no fix ships un-code-reviewed: the loop's only convergence signal is "the tests went green", and a green test cannot see a wrong-layer fix, a broken invariant elsewhere, dead code, or a security/performance regression. Every round that lands a fix code-reviews that fix in the SAME round.
MANDATORY INTEGRATION-TEST-GREEN GATES:
- The Goal Contract is set FIRST (before round 1) with one required Success Criterion: a fresh full $integration-test-verify over the scope reports ZERO failed tests across 2 consecutive runs without a DB reset, with no test deleted, skipped, or weakened to get there.
- $integration-test-verify, $debug-investigate, $integration-test-review, and $changes-review run INLINE via the skill invocation — NEVER as sub-agents (their in-session $why-review and fix/re-review gates are lost). Their OWN internal fan-outs (verify per-project integration-tester agents, review phase agents) stay sub-agents by their own design.
- $integration-test-review runs REPORT-ONLY inside the loop. If it cannot be constrained and self-fixes anyway, treat that as the round fix half and skip $fix for that round — never double-fix.
- Every pass/fail claim is backed by actual test-runner output. "All passed" without counts and names is theater, not verification.
- Documentation sync is part of DONE, not an optional tail: $spec [mode=sync] + $scan --target=integration-tests + $docs-update all run after convergence so the spec TCs, the integration-test reference doc, and the feature docs match the suite the loop actually left behind.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: a test must protect a named business rule/invariant and FAIL when that intent breaks — never merely mirror current behavior. A failure that is "fixed" by relaxing the test destroys the only signal the suite had.
- Test-Failure Fault Adjudication: a green-again suite is NOT the goal; the correct verdict on what was actually wrong is. Triangulate the failure against the governing spec (docs/specs/** §3 ACs / §4 BRs / §5 invariants / §8 TCs) AND the source before fixing either side. Spec silent or ambiguous → STOP and ask the user.
```

### workflow-refactor — Code Refactoring

- Description: Code improvement and restructuring workflow with search-first approach
- When To Use: User wants to restructure, reorganize, clean up, or improve existing code without changing behavior; technical debt
- Sequence: `scout -> investigate -> plan -> plan-review -> plan-validate -> why-review -> plan-execute -> spec [mode=tests] -> why-review -> artifact-review --type=spec-tests -> spec [mode=sync] -> integration-test -> integration-test-review -> integration-test-verify -> workflow-review-changes -> changelog -> test -> scan --target=domain-entities -> docs-update -> workflow-end -> watzup`

Protocol:

```text
Role: Refactoring Specialist
REFACTORING PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → workflowPatterns for project-specific architecture patterns, code hierarchy, and naming conventions.
⚠️ MANDATORY: Search existing code BEFORE planning
1. Scout: Find similar refactoring patterns, identify target architecture examples using Grep/Glob
2. Investigate: Study existing patterns - validate with 3+ codebase examples (NOT generic framework docs)
3. Plan: Identify code smells, define target architecture following discovered project patterns
4. Validate plan  --  ensure no behavioral changes, only structural
5. Validate design rationale with $why-review (features/refactors)
6. Implement incrementally  --  small, verifiable steps
7. Verify test specs still match after refactoring with $spec [mode=tests]. Review with $artifact-review --type=spec-tests. Sync Feature Spec §8 ↔ test code with $spec [mode=sync].
8. Verify/update integration tests with $integration-test — ensures tests reflect refactored code paths.
9. Simplify: Remove dead code, flatten nesting, extract duplicates
   CRITICAL: Before removing any code:
   - Use $investigate skill for 'unused' code verification
   - Require evidence: grep results + confidence ≥80% + cross-module/service validation
   - See Investigation Protocol (CLAUDE.md)
10. Code review: Verify no functional regressions
11. Update changelog with refactoring summary
12. Run tests  --  all existing tests MUST ATTENTION pass
13. Summary report of structural improvements

GUARDRAILS:
- Refactoring MUST ATTENTION NOT change observable behavior
- Follow project patterns from docs/project-config.json → workflowPatterns (architecture, code hierarchy, naming)
- Apply project code responsibility hierarchy from docs/project-config.json → workflowPatterns.codeHierarchy
- Provide file:line evidence of pattern search in plan

PERFORMANCE-SDD ROUTE: If this refactor is performance-driven (query optimization, caching, reducing allocations, improving throughput), run $performance-review for benchmark evidence while preserving observable behavior. Do not use performance/refactor scope to bypass spec, test, or docs sync when behavior, public contract, SLA, performance constraint, state timing boundary, or docs/spec boundary changes. Pure behavior-preserving optimization may skip new TC/integration-test generation only with explicit skip reason and invariant-preservation evidence. $test remains mandatory.
MANDATORY REFACTOR INVARIANT SAFETY GATES:
- Preserve existing intent/invariants; refactor MUST NOT change observable behavior unless explicitly approved.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-machine logic, tests MUST assert persisted transitions and invalid-transition rejection.
- Before $workflow-end, maintain three-way sync: spec docs ↔ TDD docs ↔ test code via $spec [mode=tests] + $artifact-review --type=spec-tests + $spec [mode=sync] + $integration-test + $integration-test-review + $integration-test-verify + $docs-update. Performance-driven refactors may delegate measurement to $performance-review, but observable behavior preservation and required spec/test/docs sync remain closure gates.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (spec→refactor→tests→review loop): §8 must carry universally-quantified Invariant/Property TCs (for-ALL-inputs rules + boundary counter-cases) for every [HARD] §4 rule and §5 invariant the refactor must PRESERVE — not just example scenarios — backed by property/metamorphic tests whose quality bar is the MUTATION-SCORE gate (a surviving mutant on the restructured core-logic = a preserved invariant left unguarded → write the killing test), NOT line-coverage %. Every behavior-affecting finding feeds the Dual-Feedback Ledger into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a code-only change. Re-review the whole package (spec + tests + code, not just the diff) and loop until a complete review pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
```

### workflow-research — Research & Synthesis

- Description: Research & Synthesis: gather web sources on a topic, then synthesize into one of four artifacts selected by --output — cited knowledge report (synthesis), business/market viability evaluation (business-eval), marketing strategy (marketing), or structured course material (course)
- When To Use: User wants to research a topic from web sources and synthesize the findings into a deliverable — a cited knowledge report, a business/market viability evaluation, a marketing strategy, or structured course material
- Sequence: `web-research -> deep-research -> knowledge-synthesis -> knowledge-review -> workflow-end`

Protocol:

```text
RESEARCH & SYNTHESIS PROTOCOL:
The canonical entry point is the $workflow-research skill — it dispatches to one of four synthesis sequences via --output={synthesis|business-eval|marketing|course}. The Sequence below is the DEFAULT (--output=synthesis); for the other three intents keep the shared research scaffold (web-research → deep-research → … → knowledge-review → workflow-end) and swap ONLY the terminal synthesis skill(s) per the OUTPUT DISPATCH table.

OUTPUT DISPATCH (select by intent BEFORE creating tasks; default synthesis):
- synthesis (knowledge report): $web-research → $deep-research → $knowledge-synthesis → $knowledge-review → $workflow-end
- business-eval (business/market evaluation): $web-research → $deep-research → $market-analysis → $business-evaluation → $knowledge-review → $workflow-end
- marketing (marketing strategy): $web-research → $deep-research → $market-analysis → $strategy-builder → $knowledge-review → $workflow-end
- course (course material): $web-research → $deep-research → $course-builder → $knowledge-review → $workflow-end

RULES:
- Detect the target artifact from the prompt and pick the matching --output BEFORE creating tasks; if ambiguous, default to synthesis and state the assumption.
- Create the task tracking plan from the SELECTED --output sequence (not the default) when it differs.
- Each step MUST ATTENTION invoke its skill invocation — marking a task completed without skill invocation is a workflow violation.
- Keep claims evidence-based with cited sources; confidence >80% to assert.
- This workflow produces research artifacts only — no code implementation.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-review-changes — Review Current Changes

- Description: Review uncommitted changes, plan and fix issues, then re-review recursively until clean
- When To Use: User wants to review current uncommitted, staged, or unstaged changes before committing
- Sequence: `[parallel ⇉ all-return barrier: changes-review, why-review --target=whole-review-target] -> why-review -> [parallel ⇉ all-return barrier: architecture-review, domain-entities-review*, performance-review, integration-test-review, security-review, production-readiness-review, ui-review*] -> code-simplifier -> plan -> plan-review -> plan-execute -> changes-review -> why-review -> scan --target=domain-entities -> docs-update -> workflow-end -> watzup`
- Parallel phase = all-return barrier: spawn ALL members together (one message); advance only after EVERY member returns (a skipped conditional member, marked `*`, counts as returned). A sub-agent completion advances the step identically to an inline call.

Protocol:

```text
PRE-COMMIT REVIEW (RECURSIVE):

[BLOCKING] INITIAL PARALLEL PHASE — launch `why-review --target=whole-review-target` (step 2) as a fresh read-only `code-reviewer` sub-agent, then immediately run `changes-review` (step 1) INLINE while it is active. Advance only after BOTH return.
- Step 1 (`changes-review`) establishes the dimensional baseline: surface analysis (BE/FE/SCSS file counts), review mode, integration-test sync gaps, multilingual translation gaps, spec drift, and internal UI review.
- Step 2 (`why-review --target=whole-review-target`) independently runs FULL mode over the WHOLE review target + current changes. It consumes no step-1 output and validates its own findings before returning.
- Step 3 (`why-review`) is a FINDINGS-VALIDATION gate over the step-1 findings only. It runs after the initial all-return barrier and BEFORE the specialist parallel batch. The fix plan's design is reviewed by `plan-review` at step 13.
- The SPECIALIST PARALLEL BATCH (`architecture-review`, `domain-entities-review`, `performance-review`, `integration-test-review`, `security-review`, `production-readiness-review`, `ui-review`) MUST be spawned together in a single message via specialized `spawn_agent` tool calls (`architect`, `code-reviewer`, `performance-optimizer`, `integration-tester`, `security-auditor`, `code-reviewer`, `ui-ux-designer`). They are read-only and independent — no shared mutable state, no ordering dependency between them. `production-readiness-review` runs here in READ-ONLY findings/score mode (SRE 12-criteria /24 + Extended SRE Readiness gate) like every other batch member — its standalone 'Validated Fix + Full Re-Review' fixer loop is DEFERRED to the workflow's mutating steps (`code-simplifier` / `plan-execute`), same standalone-vs-batch duality as `security-review`.
- The UI/frontend quality gate (`$ui-review`) runs in TWO places by design (keep both): (a) INTERNALLY inside `changes-review` (step 1), which invokes it as its UI dimension whenever the diff contains frontend files; AND (b) as a DEDICATED CONDITIONAL member of the parallel batch (`ui-review`, dispatched via the `ui-ux-designer` sub-agent). Both are gated on the same trigger — frontend files present in the diff — so both are SKIPPED entirely when no frontend files changed.
- `ui-review` is a CONDITIONAL member of the batch: include it ONLY when the diff contains files matching the project's configured frontend/UI file patterns. Skip it entirely (do not spawn it) when no frontend files changed.
- `domain-entities-review` is a CONDITIONAL member of the batch: include it ONLY when domain entity files changed. Skip it entirely (do not spawn it) when its trigger files are absent.
- NEVER start the specialist batch before the steps 1–2 initial barrier clears and step 3 completes. NEVER serialize the batch (burns 50K+ tokens absorbing inline reports). NEVER start `code-simplifier` until ALL spawned sub-agents return — code-simplifier modifies code and must operate on the consolidated review snapshot.
- After the parallel batch returns: TaskUpdate the batch steps to completed, read all sub-agent reports, synthesize Critical/High/Medium/Low findings into a consolidation summary, then proceed to `code-simplifier` sequentially.

- Review all staged and unstaged changes
- Check for: security issues, debug artifacts (console.log, debugger), incomplete code, style violations
- Verify no sensitive files (.env, credentials) are staged
- Check architecture compliance, naming, patterns
- DOMAIN ENTITY REVIEW: If domain entity files in changeset (Domain/, Entities/, ValueObjects/ directories), run $domain-entities-review to check DDD quality (anemic model, VO immutability, invariant enforcement). Skip entirely if no entity files changed.
- UI/FRONTEND REVIEW: Runs in TWO places (keep both) when the changeset contains files matching the project's configured frontend/UI file patterns: (a) INTERNALLY — step 1 (`changes-review`) invokes $ui-review as its UI dimension; AND (b) as a DEDICATED CONDITIONAL parallel-batch member (`ui-review` via the ui-ux-designer sub-agent). Both check long-content overflow (wrap vs ellipsis+tooltip), responsive multi-screen via flex, flex-vs-fixed sizing (prefer min/max + flex-grow over fixed px), z-index scale discipline (no raw numbers, no !important), SCSS/BEM quality, and async UI states (loading/error/empty). Skip both entirely if no frontend files changed.
- Report findings with file:line references
- Output: PASS (safe to commit) or ISSUES FOUND (with list)
- If ISSUES FOUND: validate findings, plan fixes for validated findings, review and sanity-check the fix plan, implement fixes, then re-run changes-review (step 15)
- RECURSIVE (CONDITIONAL, INLINE): Step 15 re-runs `changes-review` INLINE in the main session — but ONLY if `plan-execute` actually changed files. If `plan-execute` applied no file changes, skip step 15 and go straight to the step 16 holistic why-review. When it runs, loop plan -> plan-execute -> changes-review until one complete review pass has zero findings; stop only when the same validated blocker repeats 3 full invocations with no progress.
- HOLISTIC WHY-REVIEW (step 16, ALWAYS, FULL MODE, INLINE): after the step-15 changes-review loop converges clean, run `why-review` STANDALONE in FULL mode (NOT --validate-findings) over the WHOLE review target combined with the current changes — the complete changeset and the surrounding code/spec/docs it touches reviewed as one artifact, with the full adversarial rationale gate. This is a DIFFERENT lens from the step-3 findings-validation gate and the dimensional reviewers: it catches design-rationale, hidden-coupling, easy-to-change and whole-package gaps the per-file/per-dimension passes miss. If it surfaces findings, re-enter the plan -> plan-execute -> changes-review fix loop, then re-run step 16, looping run -> fix -> run until a complete full-mode why-review pass finds zero new findings (max re-do / 3-repeat-blocker escalation per why-review's own goal gate). Only then proceed to docs-update (step 17). This step is the reason the workflow now catches what a standalone why-review of the target would catch but the dimensional batch alone did not.
- LOGIC REVIEW: Verify changes match their stated intention. Trace business logic paths. Clean code can be wrong code.
- BUG DETECTION: Check for null safety, boundary conditions, resource leaks, concurrency issues per bug-detection-protocol.
- TEST SPEC VERIFICATION: Cross-reference changes against TC-{FEATURE}-{NNN} test specifications. Flag untested code paths.
- INTEGRATION TEST SYNC: Identify changed business logic files (handlers, services, controllers, commands, queries, resolvers — infer from project conventions). For each, verify a corresponding test file exists. If missing, surface to user by asking the user directly — mandatory, not advisory.
- MULTILINGUAL UI SYNC CHECK: If UI-facing files changed and project localization is multilingual (`localization.enabled` + `supportedLocales.length > 1`), verify translation file updates. If missing, surface by asking the user directly — mandatory, not advisory.
- DOC SYNC DEFERRAL: DO NOT update Feature Specs or test spec TCs during review steps. The dedicated docs-update step handles all of this: $spec (§1-7 Feature Spec) + $spec [mode=tests] (§8 test spec update) + $spec [mode=sync] (§8 TCs ↔ test code) + optional $spec-index [mode=index] (derived bucket INDEX/ERD refresh). TEST SPEC VERIFICATION above is READ-ONLY cross-reference only — flag gaps, do not write.
MANDATORY REVIEW-CHANGES GATES:
- SPEC/TDD/TEST THREE-WAY SYNC is blocking: changed behavior must match specs + TCs + test code.
- SPEC DRIFT ADJUDICATION (apply SYNC:spec-drift-adjudication): for every behavior-changing file, do NOT silently flag a one-directional 'stale doc'. Adjudicate per shared/sdd-artifact-contract.md Drift Gates whether the divergence is CODE-WRONG (change violates an intended spec rule/AC/invariant -> BLOCKING finding, fix code/test against intended behavior) or SPEC-STALE (intentional new behavior the spec no longer reflects -> run $spec [mode=update] FIRST, then $spec [mode=tests] + $spec [mode=sync]); AMBIGUOUS -> ask the user directly before editing either side. Never normalize drift just because code/tests are green. Unadjudicated behavior-vs-spec divergence is a blocking finding.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-transition changes, verify persisted-state assertions and invalid-transition rejection tests.
- Missing or stale docs/tests are blocking findings; route fixes through $spec [mode=tests] + $artifact-review --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec [mode=sync] + $docs-update.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (review = the spec→code→tests loop's closing pass): the test-quality bar for changed core-logic is the MUTATION-SCORE gate (Gate 1 — a surviving mutant on a changed line = a missing invariant → write the killing test), NOT line-coverage %; flag any [HARD] §4 rule or §5 invariant lacking a universally-quantified Invariant/Property TC (for-ALL-inputs + boundary counter-case). Every behavior-changing finding MUST emit a Dual-Feedback Ledger row that feeds BOTH the spec AND the tests — a blank Spec-feedback OR Test-feedback cell that survives to the fix phase = the review is INCOMPLETE, never a code-only fix. Re-review the whole package (spec + tests + code, not just the diff) and loop until a complete review pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
```

### workflow-seed-test-data — Seed Test Data

- Description: Generate or enhance test data seeders that simulate QC happy-path scenarios for a feature area. Scouts existing patterns, implements idempotent command-based seeders, reviews compliance, simplifies.
- When To Use: User wants to seed test data, implement data seeders, generate realistic development environment data, add happy-path scenarios for a feature, create dummy data for manual QC testing, fill dev database with realistic test cases
- Sequence: `scout -> investigate -> seed-test-data -> changes-review -> code-simplifier -> docs-update -> workflow-end -> watzup`

Protocol:

```text
SEED TEST DATA PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → 'Data Seeders' context group for project-specific seeder base class, file location, config keys, and DI registration pattern. Then read docs/project-reference/seed-test-data-reference.md for the complete project-specific implementation guide.

UNIVERSAL RULES (apply to ALL projects):
1. Environment gate FIRST — development or config-enabled only. NEVER production.
2. Command-based ONLY — call application-layer commands. NEVER direct DB/repo for domain entities. Seeder = QC orchestrator.
3. No duplicate logic — commands own validation + domain rules; seeder provides valid inputs.
4. Idempotency — check existing count BEFORE seeding; seed only remaining = target - existing.
5. Count-configurable — read count from project config key (see project-config.json). Loop from existing to target.
6. Restart-safe — idempotency inherently handles restarts.

PROJECT-SPECIFIC CONTEXT:
- Read docs/project-config.json → 'Data Seeders' rules for environment gate key, count key, and DI registration.
- Read docs/project-reference/seed-test-data-reference.md for implementation template, reference files, and project-specific DI scope rules.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (seeder tier — tailored): seeders are orchestration, not business logic, so property/metamorphic generation and the MUTATION-SCORE gate are N/A here — do NOT force them. Apply the dual-feedback half: every seeded scenario MUST stay consistent with the §5 invariants (commands own validation; a seeder that produces state violating an invariant is a bug), and any DOMAIN RULE a seeder encodes (a required precondition, a status/relationship the scenario assumes) belongs in the spec — feed it into BOTH the spec (the rule) AND, where that rule is testable, the tests, never a seeder-only fix.
```

### workflow-spec-sync — Spec Sync (Post-Change)

- Description: Update test specs and feature docs after code changes, bug fixes, or PR reviews
- When To Use: After fixing a bug update test specs, after code changes update test specs, after PR review update test specs, sync test specs after changes, update test documentation after implementation
- Sequence: `workflow-review-changes -> spec [mode=tests] -> why-review -> artifact-review --type=spec-tests -> spec [mode=sync] -> integration-test -> integration-test-review -> integration-test-verify -> test -> docs-update -> workflow-end`

Protocol:

```text
TEST SPEC UPDATE WORKFLOW:
Use after code changes, bug fixes, or PR reviews to keep test specs in sync.
1. Review what changed (git diff or PR diff)
2. Update test specs in the Feature Spec §8 (Test Specifications) using $spec [mode=tests] — §8 is the canonical in-place home; there is no separate dashboard (retired 2026-06-10)
3. Sync §8 ↔ integration test code via $spec [mode=sync] (forward: §8 TCs → test code)
3b. UI-INTENT / INTERACTION-SURFACE REFRESH — CONDITIONAL: only when the changed behavior is user-facing (else state the skip reason — backend-only change, no §6 change). When user-facing behavior changed, run $spec (ui-intent intent) alongside the spec [mode=sync] step to refresh the affected Feature Spec §6 interaction surface — View Inventory, Key UI States, and the per-story click-path — and link the governing design-spec so the §6 interaction-surface stays in sync with the changed behavior.
4. Generate/update integration tests for changed TCs
5. Run tests to verify

Key: $spec [mode=tests] diffs existing TCs against current code, adds regression TCs for bugfixes.
MANDATORY TEST-SPEC UPDATE GATES:
- Treat spec docs + Section 8 as intent/invariant source; do not encode buggy behavior as expected.
- Three-way sync contract (§8 TCs ↔ test code, including the STATE MACHINE DATA ASSERT mandate for affected lifecycle transitions) is canonical in docs/project-reference/spec-system-reference.md → Three-Way Sync Triad — follow it exactly.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (sync = the spec→tests loop, re-reviewed to zero): for every changed/added [HARD] §4 rule and §5 invariant, sync a universally-quantified Invariant/Property TC (for-ALL-inputs rule + boundary counter-case) — not just example scenarios — and back it with property/metamorphic tests whose quality bar is the MUTATION-SCORE gate (a surviving mutant on the changed core-logic = a missing invariant → write the killing test), NOT line-coverage %. Every behavior-changing finding feeds the Dual-Feedback Ledger into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a test-only or spec-only edit. Re-review the whole package (spec + tests + code, not just the diff) and loop until a complete pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
```

### workflow-spec-to-pbi — Spec to PBI Backlog

- Description: Generate a complete, dependency-aware PBI backlog from existing canonical Feature Specs (docs/specs/{Bucket}/). Audits spec freshness, decomposes large Feature Specs by capability and feature, creates PBIs/stories/DoR evidence, and produces a ranked backlog.
- When To Use: User wants to create all PBIs from an existing Feature Spec, convert a large Feature Spec into a complete prioritized backlog, generate dependent PBIs from docs/specs, split a very big Feature Spec into sprint-ready PBIs, or produce a ranked implementation order from a bucket of Feature Specs.
- Sequence: `scout -> spec-index -> domain-analysis -> why-review -> spec-clarify -> plan -> plan-review -> plan-validate -> why-review -> refine -> why-review -> artifact-review --type=pbi -> story -> why-review -> artifact-review --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> design-spec -> prioritize -> docs-update -> feature-presentation -> workflow-end -> watzup`

Protocol:

```text
SPEC TO PBI BACKLOG PROTOCOL:
Use when the user has existing canonical Feature Specs at docs/specs/{Bucket}/README.{Feature}.md and wants all implementable PBIs created from them.

MANDATORY RULES:
1. Treat the Feature Specs as canonical input; do not brainstorm unrelated opportunities. Decompose each PBI from spec sections (§3 US/AC, §4 BR, §5 ERD, §6 flows, §7 permissions, §8 TCs).
2. Run spec-index audit first if a Feature Spec may be stale vs code (the freshness-vs-code audit). Then, after domain-analysis + its why-review and BEFORE any decomposition (plan / refine), run spec-clarify to validate the spec's DECISIONS with the user (EXISTING-SPEC context): it does NOT re-author the canonical spec — confirmed material changes route via $spec [mode=update] FIRST — and complements the spec-index audit (freshness-vs-code on one side, decision-confirmation-with-the-user on the other).
3. Build a capability x feature/operation inventory before creating any PBI.
4. Decompose large Feature Specs into independently deliverable vertical slices. Create explicit shared/foundation PBIs for cross-cutting prerequisites.
5. For each PBI, include acceptance criteria, story points, dependencies, priority, domain impact, spec [mode=tests] needs, and DoR status. Carry §4 BR-/§3 US- logical IDs as the primary citation spine.
6. Run domain-analysis when the spec implies new/changed entities, aggregates, invariants, state machines, or cross-service ownership.
7. For each UI PBI, run pbi-mockup THEN design-spec (both CONDITIONAL — SKIP for backend-only PBIs with a stated skip reason; both gated by SYNC:existing-ui-research). pbi-mockup produces a faithful HTML mockup matching the current UI system; design-spec authors the PBI's tech-agnostic UI specs. Both MUST link back to the governing Feature Spec §6 interaction surface — the mockup and the design-spec's View Inventory / Key UI States / per-story click-path must trace to (and stay consistent with) §6. This mirrors workflow-idea-to-pbi so the spec→pbi decomposition half is IDENTICAL across both workflows (idea-to-pbi == idea-to-spec + spec-to-pbi).
8. Run prioritize once at the end across all generated PBIs to produce a dependency-aware ranked backlog. PRIORITY PROPAGATION (MANDATORY): prioritize MUST write the computed rank/priority back into every generated PBI's frontmatter `priority` field — never leave a generated PBI without priority. Every generated PBI carries priority info.
9. Write artifacts immediately after each capability/feature is processed; never hold all PBIs in memory.
10. Run docs-update after prioritize and before workflow-end so Feature Specs (§8) and derived indexes stay synchronized.
11. Run feature-presentation after docs-update (before workflow-end) to synthesize all generated PBIs/stories/specs/design-specs/mockups into ONE standalone HTML stakeholder deck for PO/BA/Dev/QC; it embeds each existing -mockup.html via <iframe srcdoc> (never regenerated) and MUST surface each PBI's priority/rank in the Scope & backlog slide.
12. PRIORITY VISIBILITY (MANDATORY): the pbi-mockup generated files AND the feature-presentation deck MUST display each PBI's priority info (rank + RICE/MoSCoW band) — the mockup in its header, the deck in its Scope & backlog slide.

SCALE GATE:
- 1-3 capabilities: process inline with task tracking.
- 4-10 capabilities: split tasks by capability and feature group.
- 10+ capabilities or very large specs: process incrementally by capability group, maintain a coverage matrix, and stop only when every spec feature is mapped to PBI/Shared Task/Out-of-scope.

SPEC-CLARIFY VALIDATION GATE (after domain-analysis + why-review, before plan / decomposition — BLOCKING ask the user directly):
The Feature Spec is canonical INPUT — spec-clarify validates the DECISIONS that drive decomposition WITH the user before any PBI is built, so the backlog is never decomposed from unconfirmed assumptions. Context = EXISTING-SPEC (a vetted full §1-8): it weights the decomposition-driving categories (§3 US/AC, §4 BR/invariants, §5 ERD, §6 flows, §7 permissions, §8 TC coverage) and cross-spec conflicts vs the discovered landscape, classifies each decision OBVIOUS / NON-OBVIOUS / CONFLICTS, and asks the user (ask the user directly, ≤4 options per call, recommended first, multiple calls as needed) to confirm every NON-OBVIOUS + CONFLICTS + high-impact one. It does NOT re-author the canonical spec — confirmed material changes route via $spec [mode=update] FIRST, then decomposition resumes. SCALE NOTE: the budget bounds the question count, not the audit breadth — for 4+ capabilities, validate the cross-cutting / shared decisions plus a sample per capability within the budget rather than exhaustively re-asking each. Spec Validation: questions=4-8 (EXISTING-SPEC context budget — ask ≥4 only when ≥4 genuine decisions surface; never invent filler to hit the minimum).

OUTPUTS:
- team-artifacts/pbis/{date}-pbi-{slug}.md for each PBI (each carries a `priority` frontmatter field).
- team-artifacts/pbis/{date}-pbi-{slug}-mockup.html for each UI PBI (header shows priority/rank).
- team-artifacts/design-specs/{date}-designspec-{slug}.md for each UI PBI (tech-agnostic UI specs).
- team-artifacts/backlog/spec-to-pbi-{date}-backlog.md with rank, dependency graph, priority, and recommended order.
- team-artifacts/presentations/{YYMMDD}-presentation-{slug}.html — the stakeholder deck synthesizing all PBIs (with priority/rank), stories, specs, design-specs, and mockups.
- plans/reports/spec-to-pbi-{date}-{bucket}.md with source spec coverage and unresolved questions.
- docs-update report confirming Feature Specs and derived indexes are synchronized.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-visualize — Visual Diagram

- Description: Create visual Excalidraw diagrams from codebase investigation or web research
- When To Use: User wants to visualize, diagram, draw, or create visual representation of workflows, architectures, concepts, systems, or research findings
- Sequence: `scout -> investigate -> excalidraw-diagram -> workflow-end`

Protocol:

```text
VISUAL DIAGRAM PROTOCOL:
This workflow creates Excalidraw diagrams. Two paths based on source:

PATH A — Codebase Visualization (default if topic is about this project):
1. Scout: Find relevant files, architecture, and code patterns
2. Investigate: Trace code paths, understand relationships and data flow
3. Diagram: Generate .excalidraw file visualizing the findings

PATH B — Knowledge Visualization (if topic requires web research):
1. Web Research: Research the topic broadly (max 10 WebSearch)
2. Deep Research: Deep-dive into top sources (max 8 WebFetch)
3. Diagram: Generate .excalidraw file visualizing the synthesized knowledge

GUARDRAILS:
- Ask user which path (A or B) if ambiguous
- Output .excalidraw files to docs/diagrams/ (create dir if needed)
- Use kebab-case filenames describing the diagram subject
- MUST ATTENTION render and validate diagram (render-view-fix loop)
- Read references/color-palette.md and references/element-templates.md before generating
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-write-integration-test — Write Integration Tests

- Description: Write or update integration tests for existing code — spec-first: investigate domain logic → write/update specs → generate test code → 7-gate review (incl. change coverage) → run and verify
- When To Use: Write integration tests for a specific command/handler, add test coverage to an untested feature, update integration tests after code changes, integration test authoring from scratch for a feature area, cover uncommitted code changes with integration tests, generate integration tests from existing test specs or feature docs, review/audit existing integration tests for quality, flakiness, traceability, or failures
- Sequence: `scout -> investigate -> spec [mode=tests] -> why-review -> artifact-review --type=spec-tests -> integration-test -> integration-test-review -> integration-test-verify -> spec [mode=sync] -> docs-update -> workflow-end -> watzup`

Protocol:

```text
WRITE INTEGRATION TEST PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → framework.integrationTestDoc for project-specific test patterns, helper classes, and async wait conventions.
⚠️ MANDATORY: Understand domain logic BEFORE writing assertions
1. Scout: Find target command/handler files; locate existing integration tests in same service for pattern matching
2. Investigate: Read the handler/entity/event source — understand WHAT fields change, WHAT entities are created/updated/deleted, WHAT event handlers fire. This is the prerequisite for correct assertions.
3. TDD Spec: Write/update test specs in feature doc Section 8 (TC-{FEATURE}-{NNN} codes). Path: docs/specs/{Bucket}/README.{Feature}.md. Authors new TCs and updates existing TCs for changed behavior.
4. TDD Spec Review: Validate spec coverage — GIVEN/WHEN/THEN completeness, happy path + validation failure + auth paths, no duplicate TC codes
5. Integration Test: Generate test files from TC specs. FROM-PROMPT for specific target, FROM-CHANGES for git diff.
   RULES (project-specific patterns from docs/project-config.json → framework.integrationTestDoc):
   - NO smoke-only tests (no-exception alone is FORBIDDEN)
   - ALL DB assertions wrapped in project async-wait helper
   - ALL string data uses project unique-data helper
   - Each test method has TC spec annotation linking to TC-{FEATURE}-{NNN}
   - Minimum 3 tests per command: happy path + validation failure + DB state check
6. Integration Test Review: 7-gate quality check (assertion value, data state, repeatability, domain logic, traceability, three-way sync, change coverage). Gate 7: every behavior-changing production file in the change set maps to a covering test (integration-first; unit fallback needs justification) AND a spec TC. Validate findings, fix only validated issues, then restart the full integration-test review after fixes. NEVER proceed with CRITICAL/HIGH issues outstanding.
7. Integration Test Verify: Run tests via quickRunCommand from docs/project-config.json → integrationTestVerify. Report exact pass/fail counts with test runner output. NEVER mark complete without real output.
8. Test Specs Docs: Sync cross-module spec dashboard. Update CoveredBy fields with {File}::{MethodName} traceability links.
9. Docs Update: Update feature doc evidence fields and version history if test coverage changed materially.
10. Summary report

GUARDRAIL: Read handler source BEFORE writing any assertions. Use project async-wait helper for all DB assertions — no exceptions.
MANDATORY WRITE-INTEGRATION-TEST GATES:
- Read docs/project-reference/spec-principles.md before $spec [mode=tests] and keep invariant language explicit in TCs.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-machine behavior, generated integration tests MUST assert persisted state transitions and invalid-transition rejection.
- Maintain three-way sync before $workflow-end: spec docs ↔ TDD docs ↔ test code via $spec [mode=tests] + $artifact-review --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec [mode=sync] + $docs-update.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (spec→tests→review loop): §8 must derive universally-quantified Invariant/Property TCs (for-ALL-inputs rules + boundary counter-cases) for every [HARD] §4 rule and §5 invariant the target code enforces — not just example scenarios — and the generated tests must be property/metamorphic where the rule is universal; the assertion-quality bar is the MUTATION-SCORE gate (a surviving mutant on the covered core-logic = a missing invariant → write the killing test), NOT line-coverage %. Every coverage/behavior finding feeds the Dual-Feedback Ledger into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a test-only fix. Re-review the whole package (spec + tests + code, not just the diff) and loop until a complete pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
```

<!-- CK:WORKFLOW-SKILLS -->

## Workflow & Skills Catalog

Session-start reference derived from `.claude/workflows.json` — use it to pick a route on any prompt: run a standard workflow, compose a custom workflow from the step-skills, invoke a single skill, or execute directly.

### Workflow Skills (61 composable steps)

Distinct step-skills used across the workflows above — compose these into a custom workflow when no standard workflow fits.

| Skill                             | Use for                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `architecture-design`             | [Architecture] Use when designing solution architecture across backend, frontend, data & consistency, integration & APIs, deployment, monitoring, testing, and code quality. Architecture laws, style-selection triggers, coupling taxonomy, trade-off tables and the anti-pattern catalog live in `.claude/docs/architecture-knowledge.md`.                                                                                                                                                                                                                                               |
| `architecture-review`             | [Code Quality] Use when reviewing architecture compliance for layers, messaging, service boundaries, CQRS, repos, entity events, and data/consistency/tenancy boundaries. Universal architecture laws, coupling taxonomy and the anti-pattern catalog live in `.claude/docs/architecture-knowledge.md` (project docs always outrank it).                                                                                                                                                                                                                                                   |
| `architecture-review-full`        | [Architecture] Use when auditing the ENTIRE project architecture and production readiness in one pass — bundles architecture-review + architecture-scalability-review + production-readiness-review at project or diff scope, then synthesizes one consolidated Architecture Health Report.                                                                                                                                                                                                                                                                                                |
| `architecture-scalability-review` | [Architecture] Use when grading project architecture and scalability quality for greenfield init or brownfield audit: build/CI scalability, distributed-monolith risk, module isolation, dependency discipline, loose coupling, horizontal scaling, DRY, abstraction, clean architecture, observability, and delivery.                                                                                                                                                                                                                                                                     |
| `artifact-review`                 | [Code Quality] Use when you need to review artifact quality (PBI, user story, test spec, design spec) before handoff. Supports --type={pbi\|story\|spec-tests\|design}.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `brainstorm`                      | [Content] Use when you need to brainstorm as a PO/BA — structured ideation for problem-solving, new product creation, or feature enhancement.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `business-evaluation`             | [Content] Use when you need to evaluate business idea viability: Business Model Canvas, financial projections, risk matrix, go-to-market, execution plan.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `changelog`                       | [Documentation] Use when you need to generate or update changelog entries.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `changes-review`                  | [Code Quality] Use when reviewing current changes, staged or unstaged diffs, or branch-to-branch diffs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `code-simplifier`                 | [Code Quality] Use when you need to simplify and refine code for clarity, consistency, and maintainability while preserving all functionality.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `debug-investigate`               | [Fix & Debug] Use when investigating a bug's root cause — reproduce the symptom, trace it end-to-start through the code, form and test hypotheses, and pinpoint the defect before any fix.                                                                                                                                                                                                                                                                                                                                                                                                 |
| `deep-research`                   | [Research] Use when deeply researching top sources from web-research.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `demo-guide`                      | [Documentation] Use when you need to generate a step-by-step demo guide (demo script / walkthrough) covering all main user stories and their test cases — scope from a named feature, else the current working context, else confirm with the user — explaining for each case how the domain data is stored/changed and how the domain solves the feature. Triggers: demo guide, generate demo guide, demo script, demo walkthrough, how to demo, prepare demo, sprint demo, user story demo.                                                                                              |
| `design-spec`                     | [Project Management] Use when you need to create UI/UX design specifications from requirements, PBIs, or user stories. Use --mode=wireframe to convert hand-drawn/digital wireframes or UI sketches into structured specs.                                                                                                                                                                                                                                                                                                                                                                 |
| `docs-update`                     | [Documentation] Use when updating impacted documentation after code, spec, or test changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `domain-analysis`                 | [Architecture] Use when you need to analyze business domain: bounded contexts, aggregates, entities, ERD, domain events, and cross-context integration.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `domain-entities-review`          | [DDD Quality] Use when you need to review domain entities and value objects for DDD design quality.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `dor-gate`                        | [Code Quality] Use when you need to validate a PBI against Definition of Ready before grooming.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `e2e-test`                        | [Testing] Use when generating, updating, or maintaining E2E tests from recordings, specs, or code changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `excalidraw-diagram`              | [Utilities] Use when the user wants to visualize workflows, architectures, or concepts as Excalidraw diagram JSON files.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `feature-presentation`            | [Documentation] Use when you need to synthesize all generated specs, PBIs, ideas and mockups into one standalone HTML slide presentation for stakeholders (PO/BA/Dev/QC).                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `fix`                             | [Implementation] Use when you need to analyze and fix issues [INTELLIGENT ROUTING]. Flag: --target={ci\|issue\|logs\|test\|types\|ui} scopes the fix; --target=types resolves TypeScript errors inline.                                                                                                                                                                                                                                                                                                                                                                                    |
| `harness-setup`                   | [Quality] Use when setting up an agent quality harness with feedforward guides and feedback sensors.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `idea`                            | [Project Management] Use when capturing new ideas, feature requests, or concepts for future refinement.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `integration-test`                | [Testing] Use when you need to generate or review integration tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `integration-test-review`         | [Code Quality] Use when you need to review integration tests for assertion quality, bug protection, repeatability, and test-spec traceability — AND verify the review target (changed production code) has test coverage (integration-first) with spec↔test↔code alignment.                                                                                                                                                                                                                                                                                                                |
| `integration-test-verify`         | [Testing] Use when you need to verify integration tests pass after writing and reviewing them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `integration-test-verify-loop`    | [Testing] Use when you need to drive an integration-test suite to fully green — each round runs $integration-test-verify (whole system by default, or the target named in the prompt), and on ANY failure combines $debug-investigate + $integration-test-review (report-only) to adjudicate the fault (test wrong · test not optimal · source wrong), then $fix to resolve it at the owning layer, then $changes-review on that round's fix diff, then re-runs a FRESH full verify — looping until the whole suite passes its 2-consecutive-green-runs gate with zero failures.           |
| `investigate`                     | [Fix & Debug] Use when you need to investigate and explain how existing features or logic work. Flag: --mode=explain produces a one-way developer-narrative explanation (Purpose → How → Why → Impact) tuned by coding level; use $understand for the standalone prompt-driven explainer.                                                                                                                                                                                                                                                                                                  |
| `knowledge-review`                | [Research] Use when you need to review knowledge artifacts for completeness, citation quality, confidence accuracy, and template compliance.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `knowledge-synthesis`             | [Research] Use when you need to synthesize research findings into structured report using template.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `linter-setup`                    | [Quality] Use when you need to research and configure code quality tooling for any tech stack — linters, formatters, static analysis, pre-commit hooks, and CI gates.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `pbi-challenge`                   | [Code Quality] Use when you need an AI-assisted Dev BA PIC review of PBI drafts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pbi-mockup`                      | [Project Management] Use when you need to generate an HTML mockup report from PBI and story artifacts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `performance-review`              | [Debugging] Use when analyzing or optimizing performance bottlenecks: database queries, N+1 fan-out, indexing, API latency, memory/GC, concurrency and pool saturation, algorithmic complexity (O(n²)), network/protocol round trips, frontend rendering and Core Web Vitals, caching, and distributed/resilience paths. Calibration constants and domain laws (latency ladder, Little's Law, utilization knee, CWV thresholds, symptom→cause triage) live in references/performance-knowledge.md.                                                                                         |
| `plan`                            | [Planning] Use when you need intelligent plan creation with prompt enhancement. Flag: --mode={ci\|cro} (default none — standard planning); --mode=ci plans a fix from a GitHub Actions CI run/log, --mode=cro plans conversion-rate optimization (25-item CRO framework).                                                                                                                                                                                                                                                                                                                  |
| `plan-execute`                    | [Implementation] Use when you need to start coding & testing an existing plan. Flags: --approval=off (auto/trust mode, no approval gate), --tests=off (skip the test step), --parallel={auto\|on\|off} (default off — sequential; --parallel/=on opts in to parallel sub-agent waves; =auto fans out only when the plan declares PAR/SEQ tags and write sets).                                                                                                                                                                                                                             |
| `plan-review`                     | [Planning] Use when you need to auto-review a plan for validity, correctness, and best practices — recursive: review, validate findings with why-review, fix validated findings, full re-review until no findings.                                                                                                                                                                                                                                                                                                                                                                         |
| `plan-validate`                   | [Planning] Use when you need to validate a plan with critical questions interview.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `prioritize`                      | [Project Management] Use when you need to prioritize backlog items using RICE, MoSCoW, or Value-Effort frameworks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `production-readiness-review`     | [Code Quality] Use when reviewing service-layer and API changes for production readiness.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `prove-fix`                       | [Code Quality] Use when you need to prove fix correctness with adversarial code proof traces — a skeptic tries to DISPROVE the fix and trace all related paths first, with confidence scoring and stack-trace-style evidence chains, so confidence is earned by surviving attack, not by confirming it works.                                                                                                                                                                                                                                                                              |
| `refine`                          | [Project Management] Use when converting ideas to PBIs, validating problem hypotheses, adding acceptance criteria, or refining requirements.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `scaffold`                        | [Architecture] Use when scaffolding reusable OOP/SOLID project foundations before feature implementation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `scan`                            | [Documentation] Use when scanning the codebase to (re)generate ONE project-reference doc. Parameterized by `--target=<key>`: project-structure \| backend-patterns \| frontend-patterns \| scss-styling \| design-system \| code-review-rules \| domain-entities \| feature-spec \| docs-index \| e2e-tests \| integration-tests \| seed-test-data \| ui-system. Shared 4-phase scan engine; per-target detail lives in references/targets.md. `ui-system` is an orchestrator meta-target (`kind: orchestrator`) that runs the 3 UI child scans in parallel instead of the 4-phase engine. |
| `scout`                           | [Investigation] Use when quickly locating relevant files and affected areas across a large codebase.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `security-review`                 | [Code Quality] Use when you need to perform a security review or audit on any scope — application code (OWASP Top 10 2025), secrets exposure, dependency/supply-chain malware, third-party repository vetting before install, infrastructure/config, CI/CD pipeline, AI-agent risks, and host/VPS compromise detection.                                                                                                                                                                                                                                                                    |
| `seed-test-data`                  | [Dev Data] Use when you need to implement or enhance test data seeders that simulate QC happy-path scenarios via application-layer commands. Flag: --mode=review reviews a target seeder (or the current changes / current work-context result) against every universal seed-data rule AND the project-specific seeder conventions — read-only, evidence-backed PASS/FAIL.                                                                                                                                                                                                                 |
| `spec`                            | [Documentation] Use to author, audit, amend, or test-spec a business Feature Spec. The single spec skill — modes draft\|init\|update\|audit\|amend create/maintain the tech-free 8-section Feature Spec; draft authors a provisional spec from an idea/requirement (no code yet, Evidence: TBD); tests generates Section 8 TC-{FEATURE}-{NNN} test specifications; sync reconciles §8 TCs ↔ executing test code. Per-mode procedure lives in references/{author,tests,sync}.md.                                                                                                            |
| `spec-clarify`                    | [Code Quality] Use to validate a spec artifact's decisions with the user across three contexts — a freshly-authored Feature Spec (idea-to-spec), an existing canonical spec before PBI decomposition (spec-to-pbi), or a refined idea + §8 test-specs (idea-to-pbi deep mode). Detects the context, walks every applicable validation category, and runs an exhaustive but budget-bounded blocking clarification gate so every non-obvious or conflicting decision is confirmed before the artifact drives downstream work.                                                                |
| `spec-discovery`                  | [Investigation] Use when about to author a new Feature Spec from an idea — investigate all existing Feature Specs AND related code logic first to surface related/overlapping/affected specs, missing features, missing test cases/user stories, system unknowns, and the invariant landscape, before any spec is drafted.                                                                                                                                                                                                                                                                 |
| `spec-index`                      | [General] Use when you need to (re)generate a DERIVED navigation index, cross-capability ERD, or reimplementation guide assembled FROM the canonical Feature Specs under docs/specs/\*\*. Never extracts a separate A-E engineering tree.                                                                                                                                                                                                                                                                                                                                                  |
| `story`                           | [Project Management] Use when creating user stories from PBIs, slicing features, or breaking down requirements.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `tech-stack-research`             | [Architecture] Use when you need to research, analyze, and compare tech stack options as a solution architect.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `test`                            | [Testing] Use when you need to run tests locally and analyze the summary report.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `ui-review`                       | [Code Quality] Use when reviewing UI/frontend changes for long-content overflow, responsive multi-screen layout (flex-wrap / row-to-column on small devices), flex-vs-fixed sizing, z-index discipline, SCSS/BEM styling quality, and async UI states & feedback (loading indicator, error surface, empty state).                                                                                                                                                                                                                                                                          |
| `watzup`                          | [Utilities] Use when you need to review recent changes and wrap up the work.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `web-research`                    | [Research] Use when starting a web research task — discover, gather, and triage candidate sources on a topic to feed deeper investigation.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `why-review`                      | [Code Quality] Use when reviewing rationale and change quality for plans, PBIs, commits, diffs, docs, specs, reports, or explicit artifacts.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `workflow-end`                    | [Process] Use when you need to end the active workflow and clear state.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `workflow-review-changes`         | [Workflow] Use when activating the Review Current Changes workflow for review, fix, and re-review recursively until all issues resolved.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

<!-- /CK:WORKFLOW-SKILLS -->

<!-- WORKFLOWS:END -->
