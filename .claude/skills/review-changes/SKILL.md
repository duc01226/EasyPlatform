---
name: review-changes
version: 2.6.0
description: '[Code Quality] Use when reviewing current changes, staged or unstaged diffs, or branch-to-branch diffs.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[TOP REMINDER — WHY-REVIEW FINDINGS-VALIDATION GATE IS NON-NEGOTIABLE]**
>
> If this review produces **ANY** finding (Critical / High / Medium / Low) in standalone mode, you **MUST invoke the `/why-review` skill** through the `Skill` tool with `--validate-findings <report-path>` **before** any fix, docs-update, commit, or handoff. An actual skill call is the ONLY way to pass this gate — re-reading the cited `file:line`s yourself, "self-validating," or any inline/manual substitute does **NOT** count.
>
> **Create the todo the moment the first finding is recorded — never rely on memory:** call `TaskCreate` → `[Review Phase 6] Why-review findings validation gate — invoke /why-review` so the gate is tracked and cannot be skipped. Inside `$workflow-review-changes`, stop after the report; parent step 2 owns validation. Full protocol in **Phase 6**; mirrored in the **Closing Reminders** at the bottom.

## Quick Summary

**Goal:** Review current working-tree, staged, branch, or commit diffs across code, docs, config, infra, and non-code artifacts — finding correctness bugs, flaws, missing updates, stale docs, and convention drift with evidence — so every reviewed change is defect-free, evidence-backed, convention-aligned, and synchronized with required tests/docs before handoff; when code files changed, also prove the code stays easy to change.

**Summary:** read-this-if-nothing-else digest —

- **Report-driven and evidence-gated.** Every finding is written to `plans/reports/code-review-{date}-{slug}.md` with `file:line` proof; speculation is forbidden, "looks fine" is not a verdict, codebase convention (grep 3+ examples) wins over textbook rules.
- **Findings are never auto-fixed on sight.** Standalone mode runs validate (Phase 6 `/why-review --validate-findings`, an actual skill call) → fix (Phase 7) → restart `/review-changes` from Phase 0 over the full diff, looping until one whole pass has zero findings. Inside `$workflow-review-changes` you stop after the report and hand findings to the parent.
- **When code changed, three delegated gates are MANDATORY:** Phase 3.5 `/code-simplifier` (clarity/maintainability), Phase 3.7 `/integration-test-review` Gate-7 coverage (every behavior change → covering test + spec TC), and — for every behavior change — Spec Drift Adjudication + the Dual-Feedback Ledger (the gap feeds BOTH spec AND tests).
- **Docs-update is the unconditional terminal step.** Once the loop converges clean, Phase 8 `/docs-update` ALWAYS runs over the full changeset (deferred only to the parent inside the workflow).

> **Routing boundary:** This skill reviews a **git diff** — working-tree (default), staged, branch, or commit. For an explicit file-set or SHA-range review, processing received review feedback, or a pre-completion verification gate over already-known scope, use `code-review` instead.

> **Shared engine (keep in sync):** `review-changes` and `code-review` share the same review-protocol `SYNC:` blocks. Canonical source: `.claude/skills/shared/sync-inline-versions.md`; policy: `SYNC:shared-protocol-duplication-policy`. When you change a shared block in one skill, update the canonical file AND the sibling skill so the two never drift. The skills differ only in entry intent (diff vs explicit scope) and diff-specific gates (integration-test-sync, translation-sync, the Phase 3.7 integration-test-review coverage gate) — not in review quality.

**Workflow:**

1. **Phase 0: Blast Radius** — Call `/graph-blast-radius` skill FIRST (if `.code-graph/graph.db` exists)
2. **Phase 0.3: Change Types** — Detect high-risk change types; create risk tasks
3. **Phase 0.5: Plan Compliance** — Verify against active plan (conditional)
4. **Phase 0.7: Surface Detection** — AI categorizes changed files; creates dimension tasks
5. **Phase 1: Collect** — Run git status/diff, create report file
6. **Phase 2: File Review** — Review each changed file, update report incrementally
7. **Phase 3: Fresh-Context Gate** — Skip when findings already exist; run a second-round sub-agent only for an explicit user/workflow/high-risk synthesis trigger
8. **Phase 3.5: Code-Simplifier Optimization (MANDATORY when code files changed)** — Invoke `/code-simplifier` scoped to the changed code files to surface clarity/consistency/maintainability simplifications; record them as findings that flow into the same validation/fix loop (skip docs-only diffs)
9. **Phase 3.7: Integration-Test-Review Coverage Gate (MANDATORY when behavior-bearing code changed)** — Invoke `/integration-test-review` over the full diff; its 7 quality gates audit changed tests AND its Gate 7 (Change Coverage) maps every behavior-changing production file to a covering test (integration-first; unit fallback needs justification) and a spec TC. GAP/SPEC-GAP results become findings for the same validation/fix loop (skip docs-only diffs; deferred to the parent's dedicated step inside `$workflow-review-changes`)
10. **Phase 4: Finalize** — Generate critical issues, recommendations, suggested commit message
11. **Phase 5: Docs Triage** — Record stale-doc findings for validation/fix loop
12. **Phase 6: Why-Review Findings Validation (standalone-only; REQUIRED before any standalone fix)** — Whenever the report contains one or more findings, you MUST invoke the `/why-review` skill (an actual `Skill`-tool call) with `--validate-findings` to verify every finding is correct, proof-backed, reasonable, and best-practice before fixing. This is a genuine skill invocation — re-reading the cited lines yourself, "self-validating," or any inline/manual substitute does NOT satisfy this gate. When this skill is step 1 inside `$workflow-review-changes`, stop after the report; parent step 2 owns findings validation.
13. **Phase 7: Recursive Fix + Full Re-Review Loop (standalone-only)** — If validated findings remain in standalone mode, auto-fix them, then re-invoke `/review-changes` from Phase 0 with a fresh task breakdown over the full current diff; repeat until an entire review pass has zero findings. When inside `$workflow-review-changes`, parent steps 10-15 own plan/feature-implement/restart.
14. **Phase 8: Mandatory Final Docs-Update Gate (MANDATORY — runs once the review/fix loop converges clean)** — After the review reaches zero findings and all fixes are applied, ALWAYS invoke `/docs-update` over the full changeset as the terminal step so no stale docs survive. This is unconditional (not gated on a flagged finding) — `/docs-update` independently detects impacted docs the review may not have surfaced. When inside `$workflow-review-changes`, the parent workflow's `/docs-update` step owns this; do not run it locally.

**Key Rules:**

- Report-driven: ALWAYS write findings to `plans/reports/code-review-{date}-{slug}.md`
- MUST ATTENTION create todo tasks for ALL phases before starting
- Skeptical: every claim needs `file:line` proof
- Verify convention by grepping 3+ existing examples before flagging violations
- Actively check DRY violations, YAGNI/KISS over-engineering, correctness bugs
- When changed files include source code, run the Easy-to-Change gate: estimate future edit sites, coupling, hidden state, duplicated knowledge, unclear intent, and abstraction boundary health
- When changed files include source code, run the Phase 3.5 `/code-simplifier` optimization gate over the changed code files — its simplification opportunities are findings that flow through the same Phase 6 validation → Phase 7 fix loop (never auto-applied unvalidated)
- When changed files include behavior-bearing code, run the Phase 3.7 `/integration-test-review` coverage gate over the full diff — every behavior change must map to a covering test (integration-first) and a spec TC; GAP/SPEC-GAP verdicts are findings for the same Phase 6 → Phase 7 loop, never silently logged
- Cross-reference changed files against related docs — flag stale docs, test specs, READMEs
- MANDATORY FINAL step: once the review/fix loop converges to zero findings, ALWAYS run the Phase 8 `/docs-update` sweep over the full changeset — unconditional, never skipped on a clean verdict — why: a clean code review still leaves docs stale unless docs-update reconciles them against the actual changes
- Findings are not eligible for auto-fix until Phase 6 why-review validation returns CLEAN for the current finding set
- Every fix cycle invalidates the prior review result; restart `/review-changes` from Phase 0 and review the full updated diff, including the fixes
- Continue review → validate findings → fix → full re-review until a complete review pass returns zero findings; do not add a fresh-context pass just because findings exist or a fix cycle restarted the review

> **MANDATORY** Plan ToDo Task to discover and READ project-specific reference docs:
>
> 1. Search for code standards docs: `*code-review*`, `*patterns*`, `*conventions*`, `*style-guide*` — read any found
> 2. Search for architecture docs: `*architecture*`, `*adr-*`, `README.md` at service/module roots
> 3. Look for docs referencing changed technology areas (backend, frontend, infra, etc.)
> 4. Read docs most relevant to the categories of files changed

**Prerequisites:** **MUST ATTENTION READ** before executing:

> **Critical Purpose:** Ensure quality — no flaws, no bugs, no missing updates, no stale content. Verify both artifacts AND documentation.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

> **OOP & DRY Enforcement:** MANDATORY — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix MUST ATTENTION inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

# Code Review: Current Or Branch Diff

Review current changes or explicit branch/commit diffs against project standards.

## Review Scope

Target: current working-tree changes by default; explicit branch/tag/commit diff when user asks branch comparison.

Use these sources:

- Current changes: `git status`, `git diff`, and `git diff --cached`
- Branch diff: `git diff <base>...<head>` plus `git diff --name-only <base>...<head>`
- Commit range: `git diff <base>..<head>` plus `git diff --name-only <base>..<head>`

## Review Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80%.**

- Verify correctness by reading actual implementations, never accept it at face value
- Every finding MUST include `file:line` evidence (grep results, read confirmations)
- Include a claim only when a trace proves it; otherwise leave it out of the report
- Question assumptions: "Does this actually work?" → trace call path to confirm
- Challenge completeness: "Is this all?" → grep related usages
- Verify side effects: "What else does this change break?" → check consumers and dependents
- No "looks fine" without proof — state what was verified and how

## First Principle — Easy to Change

Apply this gate when diff includes source-code or code-adjacent files
(`.cs`, `.ts`, `.html`, `.scss`, `.css`, tests, scripts, build/config-as-code).
Pure docs-only changes skip this gate except for executable examples or code
snippets.

> **Success metric: _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — all serve one goal: **make next change cheaper**.

When evaluating code, refactor, test, or abstraction, ask: **does this make next change cheaper or more expensive?**

- Reject "best practices" raising change cost: premature abstraction, speculative generality, leaky indirection, ceremony without payoff.
- Name real enemies in findings: **coupling, hidden state, duplicated knowledge, unclear intent, irreversible decisions exposed too early**.
- Favor project-owned boundaries around external libraries, e.g. component/service input-output contracts, when they localize future library changes; reject pass-through wrappers adding ceremony without lowering change cost.
- Simpler design easy to change beats sophisticated design that isn't.

Apply this lens **before** specific rules, patterns, or checklists below. If downstream rule raises change cost, this principle wins.

---

## Core Principles (ENFORCE ALL)

**YAGNI** — Flag code solving hypothetical future problems (unused parameters, speculative interfaces, premature abstractions)
**KISS** — Flag unnecessarily complex solutions. "Is there a simpler way meeting same requirement?"
**DRY** — Actively grep for similar/duplicate code before accepting new code. 3+ similar patterns → flag for extraction.
**Clean Code** — Readable > clever. Names reveal intent. Functions do one thing. No deep nesting.
**Follow Convention** — Before flagging ANY pattern violation, grep for 3+ existing examples. Codebase convention wins over textbook rules.
**No Flaws/No Bugs** — Trace logic paths. Verify edge cases (null, empty, boundary values). Check error handling covers failure modes.
**Proof Required** — Every claim backed by `file:line` evidence or grep results. Speculation FORBIDDEN.
**Doc Staleness** — Cross-reference changed files against related docs (feature docs, test specs, READMEs). Flag stale or missing updates.

> Run `python .claude/scripts/code_graph batch-query <f1> <f2> --json` on changed files for test coverage and caller impact.

## Blast Radius Pre-Analysis (MANDATORY FIRST STEP)

> **IMPORTANT MANDATORY MUST ATTENTION:** FIRST action in every review. Call `/graph-blast-radius` BEFORE any other review work.

If `.code-graph/graph.db` exists, run graph-blast-radius analysis before reviewing changes:

- Call `/graph-blast-radius` skill (runs `python .claude/scripts/code_graph blast-radius --json`)
- Include in review: impacted files count, untested changes, risk level based on blast radius size
- Use results to prioritize file review order (highest-impact files first)

### Graph-Assisted Change Review

For each changed file, trace full impact:

1. `python .claude/scripts/code_graph trace <changed-file> --direction downstream --json` — all files affected by changes
2. Flag any affected file NOT covered by tests
3. Catches cross-service impact simple diff review misses

## Review Approach (Report-Driven Multi-Phase — CRITICAL)

**MANDATORY FIRST: Create Todo Tasks for Review Phases**
Before starting, call TaskCreate with:

- [ ] `[Review Phase 0] Run /graph-blast-radius to analyze change impact` - in_progress **(MUST ATTENTION BE FIRST)**
- [ ] `[Review Phase 0.3] Detect high-risk change types, create risk tasks` - pending
- [ ] `[Review Phase 0.7] Categorize changed files, create dimension review tasks` - pending
- [ ] `[Review Phase 0.5] Plan compliance check (skip if no active plan)` - pending
- [ ] `[Review Phase 1] Get changes and create report file` - pending
- [ ] `[Review Phase 2] Review file-by-file and update report` - pending
- [ ] `[Review Phase 3] Evaluate fresh-context gate; skip when findings already exist` - pending
- [ ] `[Review Phase 3.5] Run /code-simplifier on changed code files to optimize code quality` - pending **(MANDATORY when code files changed; skip docs-only diffs)**
- [ ] `[Review Phase 3.7] Run /integration-test-review coverage gate over full diff` - pending **(MANDATORY when behavior-bearing code changed; skip docs-only diffs; deferred to parent step inside `$workflow-review-changes`)**
- [ ] `[Review Phase 4] Generate final review findings` - pending
- [ ] `[Review Phase 5] Record stale-doc findings for validation/fix loop` - pending
- [ ] `[Review Phase 6] Why-review findings validation gate before any fix` - pending **(MANDATORY when findings exist)**
- [ ] `[Review Phase 7] Auto-fix validated findings and restart /review-changes from Phase 0` - pending **(MANDATORY when validated findings remain)**
- [ ] `[Review Phase 8] Run /docs-update over full changeset to sync all impacted docs` - pending **(MANDATORY FINAL — always runs once review converges to zero findings; never skipped)**

Update todo status as each phase completes.

> **Note:** If Phase 1 reveals 10+ changed files, replace Phase 2-4 tasks with Systematic Review Protocol tasks:
> `[Review Phase 2] Categorize and fire parallel sub-agents`, `[Review Phase 3] Synchronize and cross-reference`, `[Review Phase 3.5] Run /code-simplifier on changed code files`, `[Review Phase 3.7] Run /integration-test-review coverage gate`, `[Review Phase 4] Generate consolidated report`

**Phase 0: Run Graph Blast Radius Analysis (MANDATORY FIRST STEP)**

> **IMPORTANT MANDATORY MUST ATTENTION:** FIRST action before ANY other review work.

- Call `/graph-blast-radius` skill
- Record in report: changed files count, impacted files count, untested changes, risk level
- Use blast radius output to prioritize which files to review most carefully in Phase 2
- If `.code-graph/graph.db` does not exist, note "Graph not available — skipping blast radius" and proceed to Phase 0.3

**Phase 0.3: Change Type Detection + Risk Tasks (MANDATORY)**

> **Purpose:** Identify HIGH-RISK change types in this diff before dimensional review.
> Each detected type creates a focused risk task. Change types are ORTHOGONAL to file category:
> the same file can be both a migration AND a security change — detect all independently.

**Step 1: Detect change types**

```bash
git diff --name-only HEAD       # unstaged
git diff --cached --name-only   # staged
# For branch or commit-range review, use the user-provided diff source:
git diff --name-only <base>...<head>
```

Evaluate each change type for this diff:

| Change Type        | Detection Signal (adapt to project's actual conventions)                                                                            | TRUE if...                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **DepUpgrade**     | Dependency manifest changed (`package.json`, `*.csproj`, `Gemfile`, `go.mod`, `requirements.txt`, `Cargo.toml`, `pom.xml`, etc.)    | A version number changed in any dependency manifest       |
| **Migration**      | File path or name suggests schema change (contains `migration`, `schema`, `alter_table`, or matches project's migration convention) | Any migration-convention file appears in the diff         |
| **BusEvent**       | New or modified event/message definition or consumer (infer from project conventions: consumer naming, message type directories)    | A consumer or event class is new or its contract changed  |
| **ApiContract**    | API definition file changed (controller, route handler, OpenAPI/GraphQL schema) with route or field differences                     | Diff shows route/action/field additions or removals       |
| **SecurityChange** | Auth/permission definition changed — infer from project conventions (auth middleware, permission constants, policy definitions)     | Any auth or permission gate is added, removed, or changed |
| **ConfigChange**   | Configuration files changed (e.g., `*.json`, `*.yaml`, `*.env*`, `*Config*`, `*Options*`, `*Settings*`, `*.toml`)                   | Any config-convention file appears                        |
| **InfraChange**    | Infrastructure definition changed (`Dockerfile`, `docker-compose*.yml`, CI/CD pipelines, k8s manifests, IaC files)                  | Any infra-convention file appears                         |

Record in report:

```
## Change Type Analysis
DepUpgrade: [YES/NO] | Migration: [YES/NO] | BusEvent: [YES/NO]
ApiContract: [YES/NO] | SecurityChange: [YES/NO] | ConfigChange: [YES/NO] | InfraChange: [YES/NO]
```

**Step 2: Create change-type risk tasks (ALWAYS before any review work)**

> **MANDATORY:** Call `TaskCreate` for each TRUE signal. Do NOT create tasks for FALSE signals.
> The concerns listed are starting points — apply domain knowledge beyond them.

| Condition           | TaskCreate subject                                                                                   | Key concerns to investigate (starting points — expand with domain knowledge)                                                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DepUpgrade TRUE     | `[Review-DepUpgrade] Dependency upgrade — semver, breaking changes, security advisories`             | Major/minor/patch? Read upstream CHANGELOG for breaking API changes. Grep deprecated API usage. Check transitive dependency changes. Known security advisories for new version? Peer dependency compatibility? Tests still passing?                                   |
| Migration TRUE      | `[Review-Migration] DB migration — rollback path, volume impact, zero-downtime`                      | Rollback/Down script exists? Table size estimate — large tables need lock analysis. NOT NULL column without default on non-empty table? Indexes created with no-lock option? Deployment ordering (before/after service deploy)? Backfill idempotent if run twice?     |
| BusEvent TRUE       | `[Review-BusEvent] Cross-service event/message — consumer, idempotency, retry, poison pill`          | Consumer exists for new event? Retry strategy: prerequisite data not synced → wait-retry vs silent skip? Handler safe to run twice (idempotency)? Malformed message handling / dead-letter configured? Ordering assumptions vs broker guarantees?                     |
| ApiContract TRUE    | `[Review-ApiContract] API contract change — backward compat, client alignment, auth`                 | Additive or breaking? Breaking → versioning or coordinated deploy required. All callers (UI, other services, tests) still compatible? New endpoint protected appropriately? No required response fields added without client update?                                  |
| SecurityChange TRUE | `[Review-SecurityChange] Security/permission change — all paths covered, no privilege escalation`    | All code paths reaching the gate covered? Negative test verifying unauthorized access DENIED? Privilege escalation possible? BOTH enforcement AND display control updated? Permission definition in single authoritative place (no duplicated strings risking drift)? |
| ConfigChange TRUE   | `[Review-ConfigChange] Config/env change — all environments, no secrets committed`                   | New config key present in ALL environment configs? Hardcoded default masking missing production config? Any secret value in the diff? → CRITICAL if yes. Documented in setup guide? App fails fast if config missing?                                                 |
| InfraChange TRUE    | `[Review-InfraChange] Infrastructure change — env parity, no dev values in prod, reproducible build` | Change affects all environments consistently? Hardcoded dev values (localhost, debug flags, dev credentials)? Pinned image/dependency versions? Local dev impact documented? CI/CD secret/permission requirements documented?                                         |

**AI-SDD risk lenses:** Apply these lenses when the changed files touch specs, workflows, tooling, or shared guidance.

| Lens                        | Review focus                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| Contract/API/routes         | Public behavior, clients, generated specs, and regression tests still agree.                   |
| Permissions/security-review | Enforcement, display controls, negative tests, and authoritative permission definitions align. |
| Config/flags                | All environments, examples, fail-fast behavior, and docs are current.                          |
| Docs/spec/test drift        | Canonical specs, Section 8 TCs, dashboards, and test code are synchronized or explicitly N/A.  |
| Generated mirrors           | Shared skill/workflow/tooling changes were synced to generated agent surfaces.                 |
| Reference-only artifacts    | AI-extracted specs/TCs remain draft/reference until accepted by the owning review gate.        |

**Step 3: Work through change-type tasks before dimensional review**

For each created change-type task:

1. Set task to `in_progress`
2. Work through ALL applicable concerns — the table above is a starting point, not a ceiling
3. For each concern: cite `file:line` for PASS or describe finding for FAIL/WARN
4. Write findings under `## {Task Subject} Findings` in report
5. Set task to `completed`

> **IMPORTANT:** Complete ALL change-type tasks FIRST, then proceed to Phase 0.7.
> If no change-type signals detected, log `"No high-risk change types detected"` and proceed.

**Phase 0.7: Change Surface Detection + Dynamic Review Tasks (MANDATORY)**

> **Purpose:** Let AI categorize the changes by nature and create review tasks accordingly.
> Derive categories from what the project's actual changed files are, never assume a fixed set.
> **Think, don't classify into a preset grid.** The AI owns this step entirely.

**Step 1: Derive categories from the diff**

```bash
git diff --name-only HEAD        # unstaged
git diff --cached --name-only    # staged
# For branch or commit-range review, use the user-provided diff source:
git diff --name-only <base>...<head>
```

For each changed file, infer its category by examining:

- **Language/extension:** What technology or domain does this file belong to?
- **Directory semantics:** What layer, module, or concern does this path represent in the project?
- **Change nature:** Is this logic, data schema, configuration, documentation, infrastructure, styling, testing, or tooling?

**Do NOT map to fixed buckets.** Derive categories that fit the current repository's actual structure and vocabulary.

Common category types to consider as starting points (not exhaustive — derive what fits):

- _Server-side logic_ — business rules, API handlers, services, consumers, event processors
- _Client-side logic_ — UI components, state management, API integration
- _Data/Schema_ — migrations, schemas, seed data, domain models
- _Styles/Assets_ — CSS/SCSS, design tokens, images, fonts
- _Configuration_ — app settings, env vars, feature flags
- _Infrastructure_ — Docker, CI/CD, pipelines, cloud manifests
- _Documentation/Specs_ — markdown docs, ADRs, feature specs, test specs
- _Tests_ — unit, integration, E2E test files
- _Build/Tooling_ — build scripts, linters, formatters, bundlers, agent scripts
- _Security_ — auth config, permission definitions, certificates

Record in report:

```
## Change Surface
{Category name} ({category type}): {N} files
{Category name} ({category type}): {M} files
...
```

**Step 2: For each category, enumerate concerns and create a task**

> **This is where you THINK, not fill in blanks.** Apply `SYNC:category-review-thinking` for each category.

For EACH identified category:

1. **Understand the domain:** What is this category's purpose? What invariants govern it? Who depends on it?
2. **Read project conventions:** Grep for style guides, patterns docs, READMEs specific to this area
3. **Derive concerns from first principles** — DO NOT limit to any fixed list; trust your domain knowledge
4. **Create a `TaskCreate` task** named `[Review-{Category}] {brief concern summary}` listing derived concerns
5. **Select the appropriate sub-agent type** (see Sub-Agent Type Selection)

> **ALWAYS create:** `[Review-General]` — universal quality: correctness, YAGNI/KISS/DRY, doc staleness, test coverage. Runs across ALL changed files regardless of other categories.

**Sub-Agent Type Selection:**

| Category Nature                        | `subagent_type`                                               |
| -------------------------------------- | ------------------------------------------------------------- |
| Code logic (any stack)                 | `code-reviewer`                                               |
| Implements a documented spec/PBI       | `spec-compliance-reviewer` (pre-pass, before `code-reviewer`) |
| Security, auth, permissions            | `security-auditor`                                            |
| Performance, query efficiency, latency | `performance-optimizer`                                       |
| Documentation, plans, specs, ADRs      | `general-purpose`                                             |
| Infrastructure, CI/CD, config          | `general-purpose`                                             |
| Mixed or default                       | `code-reviewer`                                               |

> **Spec-compliance pre-pass (when the changeset implements a documented `docs/specs/**`capability or a PBI/story):** spawn`spec-compliance-reviewer`FIRST — it verifies the implementation matches the spec (catches spec drift, missing requirements, extra features) BEFORE the`code-reviewer`quality pass runs. Skip when no spec/PBI governs the change (then`code-reviewer`is the sole code pass). This is the one wired dispatch site for`spec-compliance-reviewer` (`sub-agent-selection-guide.md` "Spec compliance" row).

> **UI/frontend dimension (OWNED by this skill):** When a _Client-side logic_ or _Styles/Assets_ category surfaces frontend files matching the project's configured frontend/UI file patterns, `/review-changes` owns the UI review and invokes `/review-ui` as its UI dimension — preferably as a dedicated `ui-ux-designer` sub-agent spawned in the same parallel batch as the other dimensional agents (inline-fold its checklist only when sub-agent spawning is unavailable). The checklist: long-content overflow (wrap vs ellipsis+tooltip), responsive multi-screen via flex, flex-grow vs fixed sizing (prefer min/max + flex over fixed px), z-index scale discipline (no raw numbers, no `!important`), and SCSS/BEM quality. This is the SAME behavior in both standalone and workflow contexts — `/review-ui` is NOT a separate workflow step; it always runs here. Skip entirely if no frontend files changed.

**Step 3: Work through tasks in order**

For each created task:

1. Set task to `in_progress` before starting
2. Review ONLY files in that category's scope
3. Apply `SYNC:category-review-thinking` — trust your domain knowledge beyond the examples there
4. Write findings to report under `## {Task Subject} Findings` section
5. Set task to `completed` before starting next task

> **NEVER mark a dimension task completed by scanning.** Work through each relevant file explicitly.
> For large categories (10+ files): escalate to a parallel sub-agent using the Systematic Review Protocol.

**Phase 0.5: Plan Compliance Check (CONDITIONAL — only when active plan exists)**

Check `## Plan Context` in injected context:

- If "Plan: none" → skip, log "No active plan — skipping plan compliance"
- If "Plan: {path}" → load plan and verify:

1. Read `{plan-path}/plan.md` — get phase list and scope
2. Read relevant phase files — extract files to modify, test specifications, success criteria
3. Verify (**MUST ATTENTION** — all four):
    - **Scope match** — changed files listed in plan phases (warn on unplanned files)
    - **Test evidence** — tests mapped to completed phases have evidence (file:line), not "TBD"
    - **Success criteria met** — phase success criteria satisfied by changes
    - **Test intent traceability** — mapped tests name the business rule/invariant they protect, not just current behavior
4. Add "Plan Compliance" section to review report

**Phase 1: Get Changes and Create Report File (MUST ATTENTION)**

- Identify diff source: current working tree, staged changes, branch comparison, or commit range
- Run `git status` for current changes, or `git diff --name-only <base>...<head>` for branch comparisons
- Run `git diff` or `git diff <base>...<head>` to see actual changes
- Create `plans/reports/code-review-{date}-{slug}.md`
- Initialize with Scope, Files to Review, Blast Radius Summary sections

**Phase 2: File-by-File Review (Build Report Incrementally)**

For EACH changed file, read and **immediately update report** with:

- File path and change type (added/modified/deleted)
- Change Summary: what modified/added
- Purpose: why change exists
- **Convention check:** Grep 3+ similar patterns — does new code follow existing convention?
- **Correctness check:** Trace logic paths — handles null, empty, boundary values, error cases?
- **DRY check:** Grep similar/duplicate code — does this logic already exist elsewhere?
- **Intention check:** Does change serve stated purpose? Flag unrelated modifications
- **Logic trace:** Trace one happy path + one error path. Logic matches requirements?
- **Semantic correctness:** Does the artifact DO what it's supposed to?
- Issues Found: naming, typing, responsibility, patterns, bugs, over-engineering, logic errors
- Continue to next file, repeat

**Phase 3: Fresh-Context Gate (Conditional Protocol — branch on findings and Phase 0.7 surface)**

> **Protocol:** `SYNC:double-round-trip-review` + `SYNC:fresh-context-review` + `SYNC:review-protocol-injection` (all inlined above).
> **INVARIANT:** Phase 3 is review-only. It may add findings, but it MUST NOT fix or validate them. Existing findings do not require a fresh-context re-review; any non-zero finding set flows to Phase 6 why-review validation, then Phase 7 auto-fix + full `/review-changes` restart from Phase 0. A Phase 7 restart alone is NOT a Phase 3 trigger.

**Entry gate:**

1. If Phase 2 or any dimensional review already found findings, **SKIP Phase 3**. Record: `Skipped fresh-context pass because findings already exist; Phase 6 why-review validation is the required next gate.` Then proceed to Phase 4 consolidation and Phase 6 validation.
2. If there are zero findings and no explicit independent-review trigger, **SKIP Phase 3**. Record: `Skipped fresh-context pass because the current review is clean and no second-round trigger exists.` Then proceed to Phase 4 finalization.
3. Run Phase 3 only when the current finding set is zero **and** at least one trigger exists:
    - the user explicitly requested a second-round/fresh-context review;
    - the selected workflow explicitly requires an independent reviewer for this invocation;
    - high-risk multi-domain changes need synthesis before a clean verdict.

**Anti-waste rule:** Do not run Phase 3 to re-review known findings before Phase 6. Do not run Phase 3 solely because Phase 7 restarted the review after fixes. The restarted review is already the required full pass; if it has zero findings and no explicit trigger above, finalize cleanly.

If the entry gate allows Phase 3, check categories from Phase 0.7 — if multiple distinct domains changed (e.g., server-side + client-side), run **Synthesis Mode**. Otherwise run **Holistic Mode**.

---

**[SYNTHESIS MODE — when multiple distinct domains changed]**

Spawn a **Synthesis Agent** as Round 2. Purpose: catch cross-boundary issues individual dimensional tasks cannot see.

When constructing Agent call prompt:

1. Copy Agent call shape from `SYNC:review-protocol-injection` template verbatim, `subagent_type: "code-reviewer"`
2. Embed all 11 universal SYNC blocks verbatim
3. Set Task as:

    ```
    Synthesis review — cross-boundary concerns ONLY across the changed domains in this diff.
    You have these dimensional findings as context: {summary from each dimensional task}.
    Re-read ALL changed files from scratch via your own tool calls.

    Focus ONLY on cross-boundary concerns — do NOT re-review each domain's internals:
    1. Contract Alignment: Do callers match what callees expose? (routes, parameters, field names, types)
    2. Data Consistency: Are field names/types consistent across layer boundaries?
    3. Security Boundary: Is auth enforced on BOTH sides (enforcement AND display control)?
    4. Cross-Layer Naming: Same concept named differently across layers?
    5. Missing Wiring: New producer with no consumer? New consumer with no producer? New feature with no doc?
    6. Documentation: Docs reflect changes in BOTH domains together?
    ```

4. Set Target Files as `"use the selected diff source from Phase 1"`
5. Set report path as `plans/reports/synthesis-review-{date}.md`

After sub-agent returns:

1. **Read** synthesis report
2. **Integrate** findings as `## Synthesis Round Findings` in main report — DO NOT filter or override
3. **If findings exist:** do NOT fix here; mark Phase 3 complete and proceed to Phase 6 why-review validation
4. **If no findings exist:** proceed to Phase 4 finalization as a clean synthesis pass

---

**[HOLISTIC MODE — when single domain changed]**

No cross-boundary synthesis needed. Spawn standard holistic Round 2.

When constructing Agent call prompt:

1. Copy Agent call shape from `SYNC:review-protocol-injection` template verbatim
2. Select `subagent_type` based on domain's dominant concern (see Sub-Agent Type Selection)
3. Set Task as: `"Review the selected diff holistically. Focus on big picture — overall technical approach coherence, architecture layers, logic placement (lowest layer), DRY violations, YAGNI/KISS, function complexity. Domain: {category from Phase 0.7} — apply domain knowledge for this category accordingly."`
4. Set Target Files as `"use the selected diff source from Phase 1"`
5. Set report path as `plans/reports/code-review-changes-round{N}-{date}.md`

After sub-agent returns:

1. **Read** sub-agent's report
2. **Integrate** findings as `## Round {N} Findings (Fresh Sub-Agent)` in main report — DO NOT filter or override
3. **If findings exist:** do NOT fix here; mark Phase 3 complete and proceed to Phase 6 why-review validation
4. **If no findings exist:** proceed to Phase 4 finalization as a clean holistic pass
5. **Final verdict** must incorporate findings from ALL review passes executed in this invocation

The following checks are handled by sub-agent but can be verified in Phase 4:

**Clean Code & Over-engineering Checks:**

- MUST ATTENTION **YAGNI:** Code solving hypothetical future problems? Unused params, speculative interfaces?
- MUST ATTENTION **KISS:** Unnecessarily complex solution? Could this be simpler while meeting the same requirement?
- MUST ATTENTION **Function complexity:** Methods too long? Nesting too deep? Multiple responsibilities?
- MUST ATTENTION **Readability:** Would a new team member understand without reading the full implementation?

**Documentation Staleness Check (REQUIRED):**

For each changed file, identify related documentation:

- Search for feature docs, architecture references, READMEs at module/service roots, API docs, test specs, setup guides
- Flag any doc where content no longer matches the changed artifact
- Flag missing docs for new features or components that should be documented
- **Flag in the report** with the specific stale section and what changed. Do not fix yet; Phase 6 must validate the finding before Phase 7 invokes `/docs-update` or applies doc edits.

**Spec Drift Adjudication (REQUIRED when behavior changed):** Apply `SYNC:spec-drift-adjudication`. For every behavior-bearing change, compare it against the canonical Feature Spec under `docs/specs/` and classify any divergence as **CODE-WRONG** (change violates an intended spec rule/AC/invariant → BLOCKING finding, fix code/test), **SPEC-STALE** (intentional behavior change the spec no longer reflects → route to `/spec [update]` + `/spec [mode=tests] [update]`), **AMBIGUOUS** (`AskUserQuestion` before editing either side), or **SPEC-SILENT** (code correctly enforces an invariant no spec artifact states → ENRICH: add the §4 BR/§3 AC + a §8 TC via `/spec [update]` + `/spec [mode=tests]`, then a guarding test). Record the verdict per changed behavior (`Spec in sync` when no divergence). Do not normalize drift just because code/tests pass. This is the bidirectional generalization of the post-bugfix "Was spec wrong?" check — it runs for ALL behavior-changing reviews, not only post-bugfix. Flag findings here; Phase 6 validates and Phase 7 fixes (CODE-WRONG fixes route through the fix loop; SPEC-STALE and SPEC-SILENT fixes route to the canonical spec updater before `/docs-update`).

**Correctness & Bug Detection:** Apply `SYNC:bug-detection` — null safety, boundaries, error handling, resource cleanup, concurrency.

**Test Spec Verification:** Apply `SYNC:test-spec-verification` — locate specs, verify coverage, flag gaps.

**Integration Test Sync:** Apply `SYNC:integration-test-sync-check` — surface missing tests via `AskUserQuestion`.

**Translation Sync:** Apply `SYNC:translation-sync-check` — for multilingual UI text changes, require translation updates or explicit user risk acceptance.

**Phase 3.5: Code-Simplifier Quality Optimization (MANDATORY when code files changed)**

> **Purpose:** A correctness review proves the change WORKS; this gate proves the changed code stays **easy to read, consistent, and cheap to change**. Bug-finding (Phases 2-3) and simplification optimization are different lenses — run both. `/code-simplifier` is the canonical owner of clarity/consistency/maintainability refinement, so this skill delegates to it rather than duplicating that logic.

**Entry gate:**

- Run when the diff includes source-code or code-adjacent files (`.cs`, `.ts`, `.tsx`, `.html`, `.scss`, `.css`, tests, scripts, build/config-as-code).
- **SKIP** for docs-only / markdown-only diffs. Record: `Skipped Phase 3.5 — no code files in diff.`

**Protocol:**

1. Set the `[Review Phase 3.5]` task to `in_progress`.
2. **Invoke `/code-simplifier`** scoped to the **changed code files only** (pass the Phase 1 diff source — working-tree, staged, branch, or commit range — so it refines the related changed files, NOT the whole codebase). Direct it to surface reuse, DRY, KISS/YAGNI, naming, dead-code, altitude/layer-placement, and readability simplifications.
3. **Capture, do NOT auto-apply.** In review context, `/code-simplifier` runs in _report_ mode: integrate its recommendations into the main report under `## Code-Simplifier Optimization Findings` with `file:line` evidence and a one-line rationale each. These are findings, not edits.
4. Set the `[Review Phase 3.5]` task to `completed`.

**Pipeline integration:** Phase 3.5 findings are ordinary findings — they consolidate in Phase 4, are validated in Phase 6 (`/why-review --validate-findings` filters false-positive or change-cost-raising simplifications), and only validated ones are fixed in Phase 7. NEVER let `/code-simplifier` mutate the working tree before Phase 6 validates its suggestions.

**Parent workflow boundary:** When this skill is invoked as step 1 inside `$workflow-review-changes`, still run Phase 3.5 (it is a review dimension, producing findings for the report) but do NOT fix here — the parent workflow's `/code-simplifier` self-review and `/feature-implement` fix cycle own application. Record the findings and hand the report to parent step 2.

**Phase 3.7: Integration-Test-Review Coverage Gate (MANDATORY when behavior-bearing code changed)**

> **Purpose:** Phases 2-3 prove the change is correct as written; this gate proves the change is **covered and specced**. `/integration-test-review` is the canonical owner of the 7-gate test-quality audit — its Gate 7 (Change Coverage) maps every behavior-changing production file in the diff to a covering test (integration-first; unit fallback needs explicit justification) AND a spec TC. This skill delegates to it rather than duplicating that logic. `SYNC:integration-test-sync-check` stays as the lightweight file-pairing check; this gate goes deeper — assertion quality, data-state verification, repeatability, and bidirectional spec↔test↔code alignment over the full change set.

**Entry gate:**

- Run when the diff includes behavior-bearing source code: handlers, commands, queries, services, entities, event consumers, controllers, background jobs, or frontend logic.
- **SKIP** for docs-only / markdown-only / pure styling-asset diffs. Record: `Skipped Phase 3.7 — no behavior-bearing code in diff.`

**Protocol:**

1. Set the `[Review Phase 3.7]` task to `in_progress`.
2. **Invoke `/integration-test-review`** scoped to the Phase 1 diff source (working-tree, staged, branch, or commit range) so it audits the **FULL change set** — changed production code AND changed test files, never just the test files. It runs all 7 quality gates, builds the Gate 7 Coverage Mapping Table, and cross-checks spec TCs in both directions.
3. **Capture, do NOT auto-fix.** Integrate its output into the main report under `## Integration-Test-Review Findings`: per-gate verdicts, the Coverage Mapping Table, and every GAP / SPEC-GAP / unjustified COVERED-UNIT as a finding (GAP = HIGH severity minimum; CRITICAL for auth/money/data-integrity paths).
4. Set the `[Review Phase 3.7]` task to `completed`.

**Pipeline integration:** Phase 3.7 findings are ordinary findings — consolidated in Phase 4, validated in Phase 6, fixed in Phase 7. GAP fixes WRITE the missing test via `/integration-test`; SPEC-GAP fixes run `/spec [mode=tests] [update]`. The Phase 7 restart then re-audits coverage over the full updated diff, including the new tests.

**Parent workflow boundary:** When this skill is invoked as step 1 inside `$workflow-review-changes`, do NOT run Phase 3.7 locally — the parent workflow's dedicated `/integration-test-review` step owns the 7-gate audit and coverage mapping. Record `Phase 3.7 deferred to parent workflow /integration-test-review step.` (`SYNC:integration-test-sync-check` still applies locally as the lightweight pairing check.)

**Phase 4: Generate Final Review Result**

Update report with final sections (**MUST ATTENTION** — include every section below):

- Overall Assessment (big picture summary)
- Critical Issues (must fix before merge)
- High Priority (should fix)
- Architecture Recommendations
- Documentation Staleness (list stale docs with what changed, or "No doc updates needed")
- Spec Drift Adjudication (per behavior-changing file: CODE-WRONG / SPEC-STALE / AMBIGUOUS / SPEC-SILENT / `Spec in sync`, with the routed fix; or "No behavior change — N/A")
- Dual-Feedback Ledger (REQUIRED — see below; or "No behavior change — N/A")
- Positive Observations
- Suggested commit message (based on changes)

> **Dual-Feedback Ledger (REQUIRED for every behavior-changing finding).** A behavior gap must feed back into BOTH the spec AND the tests — not merely fix the code. The Spec Drift Adjudication row above and the Phase 3.7 Gate 7 coverage row each cover only ONE axis; this ledger unifies them into a single "update BOTH" assertion so neither is silently skipped. For each behavior-changing finding, emit one row with two cells:
>
> | Finding (`file:line`) | Spec feedback                                                                                                                            | Test feedback                                                                                                                            |
> | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
> | `{cite}`              | `{the §8 spec/Feature-Spec update needed — e.g. /spec [update] then /spec [mode=tests], OR N/A-because-CODE-WRONG-spec-already-correct}` | `{the TC/regression test needed — e.g. new §8 regression TC via /spec [mode=tests], or covering integration test via /integration-test}` |
>
> - **A blank cell on EITHER axis = FAIL.** "N/A" alone is not allowed — every N/A must carry its reason inline (e.g. `N/A — CODE-WRONG: canonical spec already describes the correct behavior, so no spec edit; only the regression TC is owed`).
> - **CODE-WRONG** finding → Spec feedback is typically `N/A — spec correct`, Test feedback is REQUIRED (`regression TC first`, per `SYNC:spec-drift-adjudication`).
> - **SPEC-STALE** finding → BOTH cells are non-N/A: Spec feedback = `/spec [update]` then `/spec [mode=tests]`; Test feedback = the new/updated TC + guarding test.
> - **SPEC-SILENT** finding (code correctly enforces an invariant the spec never states) → BOTH cells are non-N/A: Spec feedback = add the missing §4 BR / §3 AC (+ §5 invariant if applicable) and a §8 TC via `/spec [update]` + `/spec [mode=tests]`; Test feedback = the new property/regression test guarding the now-written invariant. The highest-value capture — never leave a discovered invariant only in code or only in tests.
> - **Covered-but-stale TC** (Gate 7 SPEC-GAP routed by `/integration-test-review` — its Gate 7 classifies a TC that exists but no longer describes current behavior as a SPEC-GAP, not a satisfied coverage row): Spec feedback = correct the stale §8 TC via `/spec [mode=tests] [update]`; Test feedback = update the guarding test to the corrected TC.
> - This ledger is itself an ordinary finding set: it consolidates here (Phase 4), is validated in Phase 6 (`/why-review --validate-findings` confirms BOTH axes are present for each behavior change), and its owed spec/test actions are applied in Phase 7. A ledger row with a blank axis that survives to Phase 7 = the review is INCOMPLETE.

## Phase 5: Docs-Update Triage (CONDITIONAL)

If Documentation Staleness Check in Phase 4 identified stale docs:

1. Record impacted documentation and the proposed sync/update path in the review report
2. Add each stale-doc item to the Phase 6 findings validation payload
3. Do NOT invoke `/docs-update` yet; stale-doc findings are fixed in Phase 7 only after `/why-review --validate-findings` returns CLEAN for them
4. If Phase 7 later applies doc fixes, the next recursive `/review-changes` invocation must re-review the updated docs from Phase 0

> **Phase 5 triages only the docs the review FLAGGED.** Regardless of whether anything is flagged here, the **mandatory Phase 8 final `/docs-update` gate** still runs once the review converges clean — it independently detects impacted docs this triage may have missed. Phase 5 is conditional; Phase 8 is unconditional.

## Readability Checklist (MUST ATTENTION evaluate)

Before approving, verify artifacts are **easy to read, maintain, understand**:

- **Schema visibility** — Function computes data structure? Comment shows output shape so readers don't trace code
- **Non-obvious data flows** — Data transforms through multiple steps? Brief comment explains pipeline
- **Self-documenting signatures** — Params explain their role; flag unused params
- **Magic values** — Unexplained numbers/strings → named constants or inline rationale
- **Naming clarity** — Variables/functions reveal intent without reading implementation

## Review Checklist

### 1. Architecture Compliance (MUST ATTENTION)

- Follows project's layer/module boundaries (read `docs/project-config.json` or equivalent)
- No cross-module/service direct data access where boundaries exist
- Logic placed in lowest responsible layer (not in orchestrators/top-layer classes)

### 2. Code Quality & Clean Code (MUST ATTENTION)

- Single Responsibility Principle — each function/class does ONE thing
- No code duplication (DRY) — grep for similar code, extract if 3+ occurrences
- Appropriate error handling following project patterns
- No magic numbers/strings (extract to named constants)
- Type annotations on all functions (where language requires)
- Early returns/guard clauses used
- YAGNI — no speculative features, unused parameters, premature abstractions
- KISS — simplest solution meeting requirement
- Follows existing codebase conventions (verify with grep for 3+ examples)

### 2.5. Naming Conventions (MUST ATTENTION)

- Names reveal intent (WHAT not HOW)
- Specific names, not generic (`orderRecords` not `data`)
- Booleans: prefix with state-indicating verb (`isActive`, `hasPermission`, `canEdit`)
- No cryptic abbreviations

### 3. Project-Specific Patterns (MUST ATTENTION)

- Read project's patterns/conventions reference docs BEFORE flagging violations
- Verify 3+ existing examples before concluding a pattern is a violation
- Flag deviation from project patterns with evidence (`file:line` showing existing pattern)

### 4. Security (MUST ATTENTION)

- No hardcoded credentials, tokens, or secrets
- Proper authorization checks at all entry points
- Input validation at system boundaries (user input, external APIs, message payloads)
- No injection risks (SQL, command, template, etc.)

### 5. Performance (MUST ATTENTION)

- No O(n²) complexity where O(n) or O(1) is possible (use lookup structures)
- No N+1 query patterns (batch load related data before iterating)
- Pagination for all list queries (never fetch unbounded result sets)
- Parallel operations where independent (not forced sequential)
- Async/await used correctly (no blocking in async context)
- Query patterns have appropriate indexes

### 6. Common Issues (MUST ATTENTION)

- Unused imports or variables
- Debug/logging statements left in that should not be in production
- Hardcoded values that should be configuration
- Missing async/await or promise handling
- Incorrect or absent exception handling
- Missing validation at boundaries

### 6.5 Bugfix Debugger Trace Gate (MUST ATTENTION)

For bugfix, failed-verification, stale/incorrect final output, regression, or behavior-changing fixes, FAIL review if any required proof is missing:

- `Debugger Trace: End -> Start` names the observed final state and final reader/query/renderer/assertion
- backward hops are evidenced from reader -> storage/projection/cache -> writer -> consumer/handler/job -> producer/origin
- all feeder paths that can write the final state are enumerated or explicitly marked unknown
- hypothesis matrix classifies root causes as primary, contributing, ruled out, latent, or unknown
- owning fix layer is justified as the lowest shared owner, not the symptom site by default
- forward convergence proof and regression test/proof mapping show why the final symptom cannot persist

### 7. Documentation Staleness (MUST ATTENTION)

- For each changed file: identify related docs (feature docs, architecture references, READMEs)
- Changed logic → verify relevant feature/module docs still accurate
- Changed tooling (scripts, configs, CI) → verify setup/getting-started docs still accurate
- New feature/component added → flag if corresponding doc missing
- Test specs reflect current behavior after changes
- API changes reflected in relevant API docs or specs
- **Spec-drift adjudication** (`SYNC:spec-drift-adjudication`): for every behavior-changing file, decide whether a divergence from the canonical Feature Spec is CODE-WRONG (change is the defect — BLOCKING, fix code/test), SPEC-STALE (change is intended — update spec via `/spec [update]` first), AMBIGUOUS (intended behavior unclear — `AskUserQuestion` before editing either side), or SPEC-SILENT (code correctly enforces an invariant no spec artifact states — enrich: add §4 BR/§3 AC + §8 TC + guarding test). Do not flag a divergence as a one-directional "stale doc" without naming which side is canonical. Unadjudicated behavior-vs-spec divergence is a FAIL; an unwritten-but-enforced invariant left uncaptured is equally a FAIL.

### 8. M1-M6 Compliance Gate — Code-to-Spec Drift (BLOCKING, MUST ATTENTION)

> **Contract:** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)". This review enforces M6 for any spec/feature-doc/PBI/story/test-spec touched by — or supposed to be synced by — this change. Frame each check as: **did this change introduce M1/M2 prose leakage, break a logical-ID mapping (M3), or create AC/expected-result ambiguity (M4)?** A FAIL must name the violated mandate ID and cite the changed file + line. Passing an introduced M1-M5 violation makes this review itself defective.
>
> Carriers are EXEMPT from M1/M2 — source identifiers stay CORRECT inside `[Source: ...]`, `**Evidence**`, `**IntegrationTest**` fields, YAML frontmatter, and ` ```mermaid ``` ` blocks. Only flag leakage in spec/doc narrative prose. Banned prose token list: `docs/project-reference/spec-principles.md` §3.2. Scope this gate to changed artifact files (`docs/specs/**`, PBI/story/test-spec files in the diff); SKIP with a one-line note when the diff touches no such artifact.

- **M1 — No introduced tech leakage in prose.** FAIL if the diff adds a framework/product, language-native type, or product/design-pattern class name to spec/doc narrative prose, headings, or AC text (banned list in `spec-principles.md` §3.2). Cite the changed file + line + token.
- **M2 — No introduced source code in prose.** FAIL if the diff expresses a requirement as a class/method/file-path/namespace used as a noun instead of a business operation. Source identifiers belong only in evidence carriers. Cite the changed line.
- **M3 — Logical-ID mapping preserved.** FAIL if the change adds a requirement/rule/TC without a logical ID (`FR-/BR-/OP-/TC-`), strips a logical ID, demotes it below the `[Source:]` evidence, writes physical code coordinates or repository-root paths instead of a stack-portable abstract anchor (`[Source: namespace/service/id]`), OR drops the `[Source:]` abstract-anchor evidence (evidence is REQUIRED and KEPT — SECONDARY to the logical ID; a code move alone does NOT change the anchor — physical coords live only in the provenance sidecar).
- **M4 — No introduced AC ambiguity.** FAIL if the change leaves an AC/expected-result vague ("handle appropriately", "process normally", "as needed"), implementable two different ways while both claim conformance, or with no observable completion state / named error condition.
- **M5 — Spec stays rebuildable.** FAIL if the change makes the spec/doc depend on reading the new code to be understood (a zero-codebase-knowledge team could no longer re-implement on a different stack from the artifact alone). Cite the file + missing detail.

If ANY item fails → the verdict is FAIL; list each violated mandate ID with its changed-file/line citation in the Critical Issues or High Priority section.

## Output Format

Provide feedback in this format:

**Summary:** Brief overall assessment

**Critical Issues:** (Must fix before commit)

- Issue 1: Description and suggested fix

**High Priority:** (Should fix)

- Issue 1: Description

**Suggestions:** (Nice to have)

- Suggestion 1

**Documentation Staleness:** (Docs that may need updating)

- Doc 1: What is stale and why
- `No doc updates needed` — if no changed file maps to a doc

**Spec Drift Adjudication:** (Behavior-changing changes only — per `SYNC:spec-drift-adjudication`)

- `<behavior/file>` → CODE-WRONG | SPEC-STALE | AMBIGUOUS | SPEC-SILENT — verdict + routed fix (`/spec [update]`, regression TC, `AskUserQuestion`, or enrich-spec: add §4 BR/§3 AC + §8 TC + guarding test)
- `Spec in sync` — if changed behavior matches the canonical Feature Spec
- `No behavior change — N/A` — if the diff is docs/tooling/style only

**Debugger Trace Gaps:** (Bugfix/behavior-changing changes only)

- `Trace complete` — if the required trace, feeder paths, hypothesis matrix, owner, and forward proof are present
- Gap 1: Missing or weak trace evidence and why it blocks PASS

**Goal Satisfaction:** (MANDATORY before any PASS verdict — resolve the active Goal Contract per the goal-contract-satisfaction-loop protocol: active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`; if none exists, record `No active goal — skipped: {one-line reason}`)

| Success Criterion | Evidence                                 | Status            |
| ----------------- | ---------------------------------------- | ----------------- |
| {saved criterion} | {file:line, command output, report path} | PASS/FAIL/BLOCKED |

- Overall PASS is BLOCKED while any required criterion is FAIL — a code-quality-clean review that misses the saved goal is NOT a PASS.
- BLOCKED status requires a user-facing escalation reason recorded in the matrix row and the goal file.
- Cite evidence references; never restate the goal text or copy secrets/sensitive payloads into the matrix or goal file.
- After the verdict, update the goal file: append an Iteration Log entry and sync its Goal Satisfaction matrix.

**Positive Notes:**

- What was done well

**Suggested Commit Message:**

```
type(scope): description

- Detail 1
- Detail 2
```

---

## Systematic Review Protocol (for 10+ changed files)

> When Phase 1 finds 10+ changed files, apply the **Systematic Review Batching** protocol (map-reduce: size-capped batches + hierarchical synthesis) defined below.

---

## Workflow Recommendation

> **MANDATORY — NO EXCEPTIONS:** If NOT already in a workflow, MUST use `AskUserQuestion` to ask user. Do NOT judge task complexity or decide "simple enough to skip" — user decides, not you:
>
> 1. **Activate `workflow-review-changes` workflow** (Recommended) — run the canonical workflow from `.claude/workflows.json`; it sequences this skill, findings validation, parallel reviewers, `code-simplifier` self-review, fix-plan cycle, full re-review restart, docs, and handoff.
> 2. **Execute `/review-changes` directly** — run this skill standalone

---

## Architecture Boundary Check

For each changed file, verify no import from forbidden layer:

1. **Read rules** from `docs/project-config.json` → `architectureRules.layerBoundaries`
2. **Determine layer** — For each changed file, match path against each rule's `paths` glob patterns
3. **Scan imports** — Grep file for import statements
4. **Check violations** — If any import path contains layer name listed in `cannotImportFrom`, it is a violation
5. **Exclude framework** — Skip files matching any pattern in `architectureRules.excludePatterns`
6. **BLOCK on violation** — Report as critical: `"BLOCKED: {layer} layer file {filePath} imports from {forbiddenLayer} layer ({importStatement})"`

If `architectureRules` not present in project-config.json, skip silently.

---

## Phase 6: Why-Review Findings Validation Gate (MANDATORY before fixing findings)

> **Purpose:** Validate own findings BEFORE any fix. Verify EVERY finding is **correct, proof-backed (`file:line`), reasonable, and convention-aligned**. Catch false positives, inflated severity, and missed improvements before code/doc edits.

> **MANDATORY:** REQUIRED todo task whenever findings exist. Register via `TaskCreate` as `[Review Phase 6] Why-review findings validation gate` (already in Phase task list above). Do NOT fix, docs-update, commit, or hand off until this gate passes CLEAN or reaches an explicit blocked state.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when report verdict is unconditional PASS with literally zero findings.

> **UNCONDITIONAL INVOCATION:** If even one finding exists, the `/why-review` skill MUST be invoked via the `Skill` tool before any fix, docs-update, commit, or handoff. There is NO inline alternative — manually re-reading the cited `file:line`s, re-tracing in your head, or declaring the findings "already validated" does NOT count. The only way to pass this gate is an actual `/why-review --validate-findings` skill call that returns a verdict.

**Parent workflow boundary:** When this skill is invoked as step 1 inside `$workflow-review-changes`, do NOT run this Phase 6 locally. Stop after the review report and hand it to parent workflow step 2; the parent runs `/why-review --validate-findings` before any parallel reviewers or fixes.

**Protocol (capped re-do loop):**

1. Read own finalized report from `plans/reports/{skill}-{date}-{slug}.md`
2. **Invoke the `/why-review` skill via the `Skill` tool** (terminal `--validate-findings` mode — runs in the SAME main-agent session, never spawns a sub-agent, never recurses). "Same session" means the why-review skill executes in this conversation — it does NOT mean you may substitute your own inline re-reading for the skill call. The skill MUST actually run. Pass arg: `--validate-findings plans/reports/{skill}-{date}-{slug}.md — for EACH finding verify (a) file:line proof exists and is accurate, (b) the finding is correct (re-trace the cited code), (c) severity is reasonable and not inflated, (d) it reflects project best practices/conventions; steel-man each rejected interpretation; and surface any MISSED finding or enhancement opportunity the review overlooked`
3. Read the validation verdict path returned by why-review, expected as `plans/reports/why-review-validate-{date}.md`
4. **Classify the why-review verdict:**
    - **CLEAN** — all findings confirmed correct / proof-backed / reasonable / best-practice, AND no new finding issue or enhancement opportunity surfaced → append `## Why-Review Validation` line to own report ("All N findings re-validated against actual code; no changes."), gate PASSES; if N > 0, proceed immediately to Phase 7.
    - **HAS ISSUES** — why-review demotes/removes a finding, flags a missing or inaccurate proof, OR surfaces a new finding issue / enhancement opportunity → go to step 5.
5. **Reconcile:** UPDATE own finalized report — revise severities, remove false positives, add the surfaced findings/enhancements, and record a `## Why-Review Validation Notes` section citing what changed and why.
6. **RE-DO `/why-review --validate-findings`** on the UPDATED report (return to step 2) — re-validation is required ONLY because the report changed. Each pass is terminal (validate mode never recurses); the loop is owned and bounded HERE. Repeat until a why-review round comes back CLEAN, or **max 2 re-do rounds** (3 total validate passes) is reached.
7. **If still not CLEAN after the cap:** record unresolved items under `## Why-Review Validation — Unresolved` and escalate to the user via `AskUserQuestion` instead of silently looping.

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings → log "Skipped — no findings to validate" and do NOT run Phase 7
- `/why-review` itself is the active skill context → do NOT recurse; why-review re-validates via its own terminal `--validate-findings` mode (see its `Findings Validation Gate`)

**Why this exists:** AI reports can inherit confirmation bias, false positives, and severity inflation. Validation proves findings before edits; re-validation after report changes closes the gap where corrected findings are never checked again.

---

## Phase 7: Recursive Auto-Fix + Full Re-Review Loop (MANDATORY when validated findings remain)

> **Purpose:** Fixes change the review target. Next check MUST be a full new `/review-changes` invocation from Phase 0, not continuation from old review state.

**Trigger:** Phase 6 returns CLEAN and the validated report still contains one or more findings, weaknesses, stale-doc items, missing-test items, or required improvements.

**Parent workflow boundary:** When this skill is invoked as step 1 inside `$workflow-review-changes`, do NOT auto-fix or re-invoke `/review-changes` from here. Parent workflow steps 10-15 own `/plan`, `/plan-review`, `/plan-validate`, `/why-review`, `/feature-implement`, and the full restart gate.

**Protocol:**

1. Create fresh fix-cycle tasks before editing: one task per validated finding, one targeted-verification task, one `/review-changes` restart task.
2. Auto-fix validated findings at the owning layer. Stale docs: run `/docs-update` or edit canonical docs only after validation. Tests/specs: update canonical artifact before derived dashboards.
3. Run targeted verification for the fix set: tests, lint, docs/spec sync, SDD, graph, or config checks as applicable.
4. Append `## Fix Cycle {N}` to the review report: findings fixed, files changed, verification commands/results, and unresolved items with reasons.
5. **Re-invoke `/review-changes` in the SAME main-agent session** on the full current review target:
    - Create brand-new task list for all phases
    - Re-run Phase 0 blast radius, Phase 0.3 risk detection, Phase 0.7 surface categorization, Phase 1 diff collection, and later phases
    - Re-read all changed files from scratch, including original changes and Phase 7 fixes
    - Treat previous report as historical context only; never reuse prior findings as truth
6. Repeat Phase 0 → Phase 7 until one complete `/review-changes` invocation produces unconditional PASS with zero findings and Phase 6 is skipped as "no findings to validate".

**Stop conditions:**

- If the same validated finding repeats for 3 full review invocations with no observable progress, stop and ask the user for a decision instead of spinning.
- If a finding cannot be safely auto-fixed without product/owner input, record the blocker and ask the user.
- If required verification tools or sub-skills are unavailable, stop and ask before adapting the protocol.

**Non-negotiable rules:**

- NEVER fix findings before `/why-review --validate-findings` confirms the current finding set.
- NEVER mark review clean after a fix without rerunning the full `/review-changes` protocol from Phase 0.
- NEVER review only the fixed files after a fix; review the full current diff because fixes can interact with earlier changes.
- NEVER reuse old todo tasks after restart; each recursive review invocation breaks down all phases again.
- NEVER declare unconditional PASS without the Output Format's Goal Satisfaction matrix showing every required saved criterion PASS (or BLOCKED with a user-facing escalation reason). A required-criterion FAIL is a validated finding for this fix loop.

---

## Phase 8: Mandatory Final Docs-Update Gate (MANDATORY — always runs after the review/fix loop converges clean)

> **Purpose:** Guarantee **no stale docs survive the change**. Phases 5-7 fix only docs the review _flagged_ as findings; this terminal gate runs `/docs-update` unconditionally so impacted docs the dimensional review never surfaced still get reconciled against the actual changes. A clean code-review verdict does NOT imply docs are current.

**Trigger:** The review has converged — one full `/review-changes` pass produced zero findings and all validated fixes are applied. This gate ALWAYS runs in standalone mode; it is NOT gated on a flagged staleness finding.

**Parent workflow boundary:** When this skill is invoked as step 1 inside `$workflow-review-changes`, do NOT run Phase 8 locally — the parent workflow's own `/docs-update` step (after `/feature-implement` and the restart gate) owns the final docs sync. Record `Phase 8 deferred to parent workflow /docs-update step.`

**Protocol:**

1. Set the `[Review Phase 8]` task to `in_progress`.
2. **Invoke `/docs-update`** over the FULL changeset (the Phase 1 diff source plus any Phase 7 fixes). Let it detect impacted docs from the changes — feature docs, architecture references, READMEs, API docs, test specs, setup/getting-started guides.
3. If the Phase 4 Spec Drift Adjudication (`SYNC:spec-drift-adjudication`) returned any **SPEC-STALE** verdict — the canonical Feature Spec no longer reflects the intended behavior (includes the post-bugfix case where the spec documents the bug as correct behavior) — run `/spec [update]` BEFORE `/docs-update` so the spec is corrected to intended behavior first. Never let `/docs-update` codify broken or superseded behavior. CODE-WRONG verdicts are NOT a spec edit — they were already fixed in the Phase 7 code-fix loop. Any **SPEC-SILENT** verdict — an invariant the code already enforces but no spec artifact states — is an ENRICHMENT: run `/spec [update]` (add the §4 BR/§3 AC) + `/spec [mode=tests]` (add the §8 TC) BEFORE `/docs-update`, then ensure a guarding test exists; never leave the discovered invariant unwritten.
4. Record applied doc updates (or `No impacted docs — verified N changed files against related docs`) under `## Phase 8 Docs-Update` in the review report.
5. Set the `[Review Phase 8]` task to `completed`.

**Termination guarantee:** Distinguish two edit kinds in Phase 8. **Docs PROSE edits** (narrative/reference doc text, no new spec rule) do NOT re-trigger the loop (no code behavior changed); they ARE subject to the M1-M6 spec-drift check (Review Checklist §8) and a final read-back — termination preserved. **SPEC-CONTENT edits** — a newly WRITTEN spec rule (a SPEC-SILENT invariant promoted to §3/§4/§8, or a SPEC-STALE correction that changes documented intent) — trigger exactly ONE bounded, module-scoped re-review of the whole package (spec + tests + code for the affected module) against the enriched spec, to confirm the newly-written rule is actually enforced in code and guarded by a test, and to surface any further hidden rule. That single bounded pass terminates unless it itself produces a new validated finding (which then enters the normal loop). Termination stays guaranteed: the bounded pass is module-scoped and runs at most once per enrichment — not a full Phase-0 restart — and a clean bounded pass ends the skill. This converts enrichment from "fires once at the end, never rechecked" into "fires, then gets one convergence pass," instead of looping review↔docs forever.

> **MANDATORY:** Never declare the review complete or hand off until Phase 8 has run (or been explicitly deferred to the parent workflow). A passing review with skipped docs-update is an INCOMPLETE review.

---

## Next Steps

**MANDATORY — NO EXCEPTIONS** after completing this skill, MUST use `AskUserQuestion` to present options. Do NOT skip because task seems "simple" or "obvious" — user decides:

- **"/code-review (Recommended)"** — Deeper code quality review
- **"/watzup"** — Wrap up session and review all changes
- **"Skip, continue manually"** — user decides

## AI Agent Integrity Gate (NON-NEGOTIABLE)

> **Completion ≠ Correctness.** Before reporting ANY work done, prove it:
>
> 1. **Grep every removed name.** Extraction/rename/delete touched N files? Grep confirms 0 dangling refs across ALL file types.
> 2. **Ask WHY before changing.** Existing values are intentional until proven otherwise. No "fix" without traced rationale.
> 3. **Verify ALL outputs.** One build passing ≠ all builds passing. Check every affected stack.
> 4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
> 5. **New artifact = wired artifact.** Created something? Prove it's registered, imported, reachable by all consumers.

## Related Skills

| Skill                         | Relationship                                                                                                                                           | When to Call                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/docs-update`                | **Mandatory terminal gate (Phase 8)** — final docs sync after the review/fix loop converges; also the primary fix path for flagged staleness           | ALWAYS at Phase 8 once review is clean (standalone) — unconditional; AND during Phase 7 for validated staleness findings. Deferred to parent in `$workflow-review-changes`. |
| `/spec-index`                 | **Derived index** — regenerates the bucket `INDEX.md`/ERD FROM the Feature Specs (never a source of truth)                                             | After specs change, to refresh navigation aids — NOT for correcting specs                                                                                                   |
| `/spec [update]`              | **Canonical spec updater** — corrects feature doc §1-8 (the single source of truth)                                                                    | Called internally by docs-update; call directly for targeted update — and BEFORE docs-update if a spec-was-wrong scenario is detected                                       |
| `/spec [mode=tests] [update]` | **Test spec updater** — called when test cases may be stale                                                                                            | Called internally by docs-update; call directly for targeted test case update                                                                                               |
| `/integration-test-review`    | **Mandatory coverage gate (Phase 3.7)** — 7-gate test-quality audit + Gate 7 change-coverage mapping (every behavior change → covering test + spec TC) | ALWAYS at Phase 3.7 when behavior-bearing code changed (standalone); deferred to the parent's dedicated step in `$workflow-review-changes`. Skip only docs-only diffs       |
| `/review-ui`                  | **UI/frontend quality gate** — overflow, responsive flex, z-index, SCSS/BEM                                                                            | Owned by this skill — invoked internally as the UI dimension (ui-ux-designer sub-agent) when the diff has frontend/UI files; NOT a separate workflow step                   |
| `/code-simplifier`            | **Quality-optimization dimension** — clarity/consistency/maintainability simplifications                                                               | Owned by this skill — invoked internally in Phase 3.5 (report mode) when the diff has code files; its findings flow through Phase 6 validation → Phase 7 fix                |
| `/code-review`                | **Code quality** — deeper review of changed code                                                                                                       | Always follows review-changes quality pass                                                                                                                                  |

## Standalone Chain

> **When called outside a workflow** (i.e., user ran /review-changes directly):

```
review-changes (you are here)
  │
  ├─ Phase 3.5: Code-simplifier optimization (INTERNAL — /code-simplifier over changed code files, report mode)
  │    → Simplification findings feed Phase 6 validation → Phase 7 fix (skip docs-only diffs)
  │
  ├─ Phase 3.7: Integration-test-review coverage gate (INTERNAL — /integration-test-review over the FULL diff, 7 gates)
  │    → Gate 7 maps every behavior-changing production file to a covering test (integration-first) + spec TC
  │    → GAP/SPEC-GAP verdicts feed Phase 6 validation → Phase 7 fix
  │    → GAP fix = WRITE the missing test via /integration-test; SPEC-GAP fix = /spec [mode=tests] [update] (skip docs-only diffs)
  │
  ├─ Follow-on quality checks (review-architecture → code-review → performance)
  │
  ├─ Phase 5: Documentation Staleness Triage
  │    → If stale docs detected: [REQUIRED] include as finding for Phase 6 validation
  │    → If validated in Phase 6: [REQUIRED] fix in Phase 7 via /docs-update or canonical doc edit
  │    → Then recursively restart /review-changes from Phase 0
  │
  ├─ Integration test check (SYNC:integration-test-sync-check):
  │    → If logic changes touch tested areas: [REQUIRED] → /integration-test [from-changes]
  │    → Then: /integration-test-review → /integration-test-verify
  │
  ├─ Translation sync check (SYNC:translation-sync-check):
  │    → If multilingual UI text changes lack locale updates: [REQUIRED] AskUserQuestion + explicit decision
  │
  ├─ Spec drift adjudication (SYNC:spec-drift-adjudication) — ALL behavior-changing reviews:
  │    For every behavior-bearing change diverging from the canonical Feature Spec, classify:
  │    → CODE-WRONG (change violates an intended spec rule/AC/invariant) → [REQUIRED] BLOCKING finding; fix code/test (regression TC first)
  │    → SPEC-STALE (intentional new behavior the spec no longer reflects) → [REQUIRED] /spec [update] BEFORE /docs-update, then /spec [mode=tests] [update]
  │    → AMBIGUOUS → [REQUIRED] AskUserQuestion (or canonical spec owner) before editing either side
  │    → SPEC-SILENT (code enforces a correct invariant the spec never states) → [REQUIRED] enrich: /spec [update] add §4 BR/§3 AC + /spec [mode=tests] add §8 TC, then guarding test
  │    Bugfix sub-case: if post-bugfix AND spec documents the bug as expected behavior → SPEC-STALE; never let /docs-update codify broken behavior.
  │    Never normalize drift just because code/tests are green.
  │
  ├─ Phase 6 + Phase 7 recursive loop
  │    → If ANY findings exist: /why-review --validate-findings
  │    → If validated findings remain: auto-fix, verify, then restart /review-changes from Phase 0
  │    → Repeat until a full review invocation has zero findings
  │
  ├─ Phase 8: [MANDATORY FINAL after zero findings] → /docs-update over the full changeset
  │    → ALWAYS runs (unconditional) — syncs every impacted doc so none stay stale
  │    → docs PROSE edits (no new spec rule); M1-M6 check + read-back, NO full code re-review (guarantees termination)
  │    → SPEC-CONTENT edits (a newly written spec rule — SPEC-SILENT promoted to §3/§4/§8, or a SPEC-STALE correction changing documented intent) → exactly ONE bounded, module-scoped re-review of the affected module's package (spec + tests + code) to confirm the new rule is enforced in code + guarded by a test; that single pass terminates unless it itself yields a new validated finding (then normal loop). At most once per enrichment, never a full Phase-0 restart.
  │    → A passing review with skipped docs-update is an INCOMPLETE review
  │
  └─ [RECOMMENDED after Phase 8] → /watzup
        Summary of all review findings, doc changes, and test coverage status.
```

> **[CRITICAL — TOP 3 RULES]**
>
> 1. **MUST ATTENTION Phase 0 graph blast-radius FIRST** — NEVER skip; informs entire review order
> 2. **Findings trigger validate → fix → full restart.** Run `/why-review --validate-findings`, fix validated findings, then rerun `/review-changes` from Phase 0 until a full pass has zero findings.
> 3. **MUST ATTENTION TaskCreate ALL phases** before starting; missing tests MUST surface via `AskUserQuestion` — NOT silently logged

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. Prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:systematic-review-batching -->

> **Systematic Review Batching (map-reduce)** — When a changeset is large, do NOT review files one-by-one. Partition into size-capped batches, fire one specialized sub-agent per batch in parallel, then reduce. This bounds EVERY context — each batch agent AND the orchestrator — so coverage stays complete as file count grows.
>
> **Trigger ladder (one ordered escalation — not competing thresholds):**
>
> 1. **< 10 changed files** → sequential per-file review (default; no batching).
> 2. **≥ 10 changed files** → switch to systematic parallel mode. Announce: `"Detected {N} changed files. Switching to systematic parallel review protocol."` Then: categorize → size-capped batches → flat consolidation.
> 3. **categories > 6 OR files > 40** → additionally insert the hierarchical synthesis tier (below). Everything from rung 2 still applies.
>
> **Step 1 — Categorize.** Group changed files into logical categories derived from the project's actual structure (not forced). Category is the _concern axis_; orient with these examples, derive what fits the repository:
>
> | Category Type       | Example Groupings                                                     |
> | ------------------- | --------------------------------------------------------------------- |
> | Agent/Tooling       | AI scripts, hooks, skill definitions, workflow configs, linting rules |
> | Root config/docs    | Root README, project config, CI/CD pipeline configs                   |
> | Reference docs      | Architecture docs, patterns references, setup guides                  |
> | Feature/domain docs | Business feature documentation, spec files, ADRs                      |
> | Backend logic       | Service/handler/controller source (infer from project structure)      |
> | Frontend logic      | UI component/state/API source (infer from project structure)          |
> | Data/Schema         | Migrations, schema files, seed data                                   |
> | Tests               | Unit, integration, E2E test files                                     |
> | Infrastructure      | Docker, k8s, CI/CD, cloud manifests                                   |
>
> **Step 2 — Size-capped batches.** One sub-agent per batch of **≤8 files OR ≤2000 diff-lines**, whichever hits first. Category stays the concern axis, but any category exceeding a cap splits into multiple size-capped batches (30 backend files → 4 batches). Size caps — not category caps — make "many files" safe: a category cap alone lets one giant category blow a single agent's context.
>
> **Step 2a — Sub-agent type per batch** (match the batch's dominant concern):
>
> - Code logic (any stack) → `code-reviewer`
> - Security-sensitive changes → `security-auditor`
> - Performance-critical paths → `performance-optimizer`
> - Docs, plans, specs, configs, infra → `general-purpose`
>
> Each batch sub-agent receives: its full file list; `SYNC:category-review-thinking` as its primary thinking model — derive each category's concerns from first principles, NOT a fixed checklist (if the consuming skill does not carry that block, apply category-first thinking directly); project reference docs relevant to its concern (discover via `*patterns*`, `*conventions*`, `*style-guide*`); cross-reference verification instructions (counts, tables, links). All batch agents run in parallel and write findings to `plans/reports/` (per `SYNC:task-tracking-external-report`); reducers read from disk, never from memory.
>
> **Step 3 — Reduce.**
>
> - **Flat reduction (rung 2, ≤6 categories AND ≤40 files):** the orchestrator collects each batch report, cross-references counts/tables/contracts ACROSS batches, detects gaps visible only across categories (feature in code but missing from docs; new API endpoint with no client call), and consolidates into one categorized holistic report.
> - **Hierarchical reduction (rung 3, > 6 categories OR > 40 files):** insert a mid-tier — each concern gets ONE synthesizer agent that reads only its own batch reports and emits a single concern-synthesis. The orchestrator reads the **concern-syntheses (~5)**, never the raw batch reports — keeping the reducer's context O(#concerns), not O(#files).
>     - **Cross-concern interaction pass (mandatory at rung 3 — closes the synthesis-tier blind spot):** concern-siloed synthesis can drop an interaction spanning two concerns AND two batches (tainted source in data-layer/batch 7 → sink in api/batch 3). So: (a) each concern-synthesizer MUST emit an explicit **"cross-concern interaction candidates"** list — entities/symbols/contracts it touched that plausibly bind to another concern (shared DTOs, event names, table/collection names, exported symbols); (b) the orchestrator MUST run the Step-3 cross-reference/gap step **over those candidate lists across all concern-syntheses**, not only within a batch, before concluding. Without this pass the tier trades completeness for context-bounding on exactly the large diffs it targets.
>
> **Step 4 — Holistic assessment.** With all findings combined, judge: overall coherence as a unified intent; cross-category sync (docs match code? contracts match callers?); risk areas where categories interact; missing doc/spec updates for changed artifacts.
>
> **No silent truncation.** If any cap forces sampling or a batch is dropped for budget, ANNOUNCE the dropped/sampled scope explicitly — bounded coverage must never read as complete coverage.

<!-- /SYNC:systematic-review-batching -->

<!-- SYNC:end-to-start-debugger-trace -->

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and the lowest shared point that protects all downstream consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

<!-- /SYNC:end-to-start-debugger-trace -->

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
> **Stop conditions:** confidence <80% on any critical decision → escalate via AskUserQuestion · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).
>
> **Deep-dive:** see `/sequential-thinking` skill (`.claude/skills/sequential-thinking/SKILL.md`) for worked examples (API design, debugging, architecture), advanced techniques (spiral refinement, hypothesis testing, convergence), and meta-strategies (uncertainty handling, revision cascades).

<!-- /SYNC:sequential-thinking-protocol -->

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone. — why: long context drifts from the file; the file is ground truth
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation. — why: divergent patterns fragment the codebase and slow every future reader
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

<!-- SYNC:design-patterns-quality -->

> **Design Patterns Quality** — Priority checks for every code change:
>
> 1. **DRY via OOP:** Identify classes/modules with the same purpose, naming pattern, or lifecycle. Apply your knowledge of the project's language/framework to determine the idiomatic abstraction (base class, mixin, trait, protocol, decorator). 3+ similar patterns → extract to shared abstraction.
> 2. **Right Responsibility:** Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
> 3. **SOLID:** Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
> 4. **After extraction/move/rename:** Grep ENTIRE scope for dangling references. Zero tolerance.
> 5. **YAGNI gate:** NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
>
> **Anti-patterns to flag:** God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.
>
> **Serial Attention for Design Quality** — Scan one quality dimension at a time (serial passes), not all concerns at once. — why: split attention misses violations that single-focus passes catch.
>
> 1. **Identify applicable dimensions** — Based on the code's language, domain, and patterns, determine which quality dimensions apply: DRY, SOLID principles (SRP/OCP/LSP/ISP/DIP), OOP idioms, cohesion/coupling, GRASP, Law of Demeter, CQRS invariants, etc. Your list is NOT fixed — derive from what the code actually does.
> 2. **One focused pass per dimension** — Dedicate single-focus attention to EACH dimension in sequence. Do NOT mix concerns across passes.
> 3. **Threshold: 3+ similar patterns = MANDATORY extraction** — Not optional suggestion. Flag as mandatory structural fix requiring action.
> 4. **2+ violations of same kind = structural finding** — Report as "pattern problem" needing architectural resolution, not a list of individual instances.

<!-- /SYNC:design-patterns-quality -->

<!-- SYNC:complexity-prevention -->

> **Complexity Prevention (Ousterhout)** — MANDATORY. Measure code by cost of change: one business change should map to one code change. Flag ALL of the following in review:
>
> 1. **Change amplification** — small business change forces edits in >3 places → structural flaw. Count edit sites for a plausible future change (add variant, add field, add authorization). >3 = reject.
> 2. **Cognitive load** — reader must hold too much context to safely modify. Flag deep inheritance, long parameter lists, boolean traps, implicit ordering dependencies.
> 3. **Cross-cutting duplication at entry points** — logging, error handling, validation, auth, transactions reimplemented per controller/handler/route. Lift to middleware / interceptor / filter / decorator / aspect.
> 4. **Leaked implementation technology** — repos returning `IQueryable`/`QuerySet`/`Criteria`/raw cursors/ORM entities to callers. Return finished results + intent-revealing methods (`GetActiveVipUsers()` not `Query()`).
> 5. **Type-switch scattering** — `switch`/`if`-chains on enum/discriminator in >1 place. New variant = new file, not N edits. One factory/registry switch at the boundary OK; scattered switches = reject.
> 6. **Anemic models** — domain objects with only getters/setters, logic floats in services. Move invariants/behavior onto the object (`order.Checkout()`, not `order.Status = ...`).
> 7. **Primitive obsession** — raw `string`/`int`/`decimal` for account numbers, emails, money, percentages, date ranges, with re-validation at every entry. Wrap in value objects / records / structs that validate once at construction.
> 8. **Inline cross-cutting concerns** — authorization/tenant isolation/audit/sanitization hand-written at top of every handler. Flag intent with declarative markers (`@RequirePermission("Order.Delete")`), enforce once centrally.
> 9. **Shallow modules** — tiny class, big interface (many public methods, many flags, many ctor params) wrapping little logic. A module is deep when a small interface hides a lot of implementation. If interface ≈ implementation cost to learn → inline.
> 10. **Missing base class for repeated component/handler lifecycle** — 3+ forms/CRUD handlers/list views reimplementing loading/dirty/submit/pagination → extract to base class / hook / composable / mixin / trait.
> 11. **Premature vs delayed abstraction** — rule-of-three. First occurrence: write it. Second: notice duplication. Third: extract. Don't build generic frameworks before real variation; don't copy-paste for the 4th time.
> 12. **Embedded utility logic not extracted to helpers** — inline paging loops (`while (hasMore) { skip += take; ... }`), ad-hoc datetime math, string parsing/formatting, collection partitioning, retry/backoff loops, URL/query-string building. If the algorithm is non-trivial AND stack-generic (not business-specific), extract to `util`/`helper`/`extensions` and let consumers call one line. Inline duplicates → duplicated bug surface.
> 13. **Logic in wrong (higher) layer — downshift to callee** — business/derivation logic written in the caller when the callee owns the data. Defaults: Controller code that should be App Service. App Service code that should be Domain Service or Entity. Component code that should be ViewModel/Store/Service. Caller reaching into callee's data shape to compute something → move the computation behind an intent-revealing method on the callee. Lowest responsible layer wins (Entity > Domain Service > App Service > Controller · Model/VM > Store > Component). Higher-layer placement = duplicated logic when a sibling caller needs the same thing.
> 14. **Owner owns the rule — extract on first write** — if a caller inlines logic that derives, normalizes, validates, or computes from another type's data, MOVE it to the owning type. Single use is sufficient — the trigger is wrong responsibility, not duplication. Sibling callers always arrive; inline copies drift silently with no compile error and no name to grep. **Common offenders:** _Backend_ — inlined rules in application-layer handlers / commands / queries / services / controllers that belong on the domain entity / value object / domain service. _Frontend_ — inlined derivations / formatting / validation in components that belong on the model / store / view-model / API service. **Fix:** name the rule once as a method (static or instance) on the owning type; callers invoke by name. Future variant → SECOND named method on the owner, never an inline near-duplicate. **Right responsibility first; reuse is the consequence.**
>
> **Extraction target — where the named rule lives:**
>
> | Shape of the rule                             | Goes to                       |
> | --------------------------------------------- | ----------------------------- |
> | Pure function over an entity's own data       | static method on the entity   |
> | Behavior that mutates / guards entity state   | instance method on the entity |
> | Always-true invariant on a primitive value    | value object constructor      |
> | Needs DI (repo / settings / clock)            | helper class registered in DI |
> | Domain-agnostic algorithm reused across types | util / extension method       |
> | Pure shape / projection conversion            | DTO mapping                   |
>
> **Pre-commit edit-site test (reject if answer is "many"):**
>
> | Change Scenario                                 | Should touch              |
> | ----------------------------------------------- | ------------------------- |
> | Add new variant (customer type, payment method) | 1 new file                |
> | Change HTTP error response format               | 1 middleware/filter       |
> | Add timestamp field to every persisted entity   | 1 base entity/interceptor |
> | Add authorization to a new endpoint             | 1 declarative marker      |
> | Swap database/ORM                               | Data layer only           |
> | Change business calculation rule                | 1 method on owning entity |
> | Add loading indicator pattern to forms          | 1 base component/hook     |
> | Add validation rule to a domain primitive       | 1 value-object ctor       |
> | Change paging/retry/datetime algorithm          | 1 helper/util function    |
> | Change a derivation of entity data              | 1 method on the entity    |
>
> **Operating heuristics:**
>
> - Write the call site first.
> - Count edit sites for plausible future change.
> - Prefer removing code over adding it.
> - Surface assumptions at boundaries, hide details inside.
> - **Pre-reuse scan** — before writing a non-trivial block, grep for similar algorithms (`while.*skip`, `DateTime.*Add`, `split`/`join` chains, paging loops, retry loops). Match existing helper → call it. None exists but pattern is stack-generic → extract to util before second caller appears.
> - **Layer placement test** — ask "if a sibling caller needed this tomorrow, would they re-derive it?" If yes, the logic is in the wrong layer. Move it down.
> - **Open-case-for-future-reuse** — if reviewer spots a block that is likely to appear in another feature (domain-agnostic algorithm, shared lifecycle, recurring derivation), do NOT rationalize with pure YAGNI. Either extract now (if cheap) or create a tracked TODO with the exact extraction target so the second caller does not duplicate silently. Silent duplication is the default failure mode.
> - When in doubt ask: "What would need to change if the requirement shifts?"
>
> **The measure of good code is the cost of change.** Not shortest. Not cleverest. Not most abstracted. Cheapest to safely modify having read a small local portion.

<!-- /SYNC:complexity-prevention -->

<!-- SYNC:double-round-trip-review -->

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass finds no issues. **A clean review ENDS the loop — no further rounds required.**
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **Issues found (FAIL, or any non-zero findings)** → run the active review skill's findings-validation gate first; for review skills the default gate is `/why-review --validate-findings <report-path>`. Fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `Agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision: clean → END; issues → validate findings → fix → restart from the first review phase. Continue until a complete review pass finds zero issues. If the same validated finding repeats for 3 full invocations with no progress, or a fix requires product/owner input, escalate via `AskUserQuestion`.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review — no mandatory Round 2
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - No arbitrary sub-agent-round cap replaces the clean-review requirement; use the 3 repeated-no-progress blocker rule only to avoid infinite spinning
> - Track recursive invocation count and repeated blockers in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `/feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `Agent` tool calls — use `code-reviewer` subagent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues (no fixes = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `Agent` call
> - Continue until a complete full review pass has zero findings; if the same blocker repeats 3 times with no progress, escalate via `AskUserQuestion`
> - Track iteration count and repeated blockers in conversation context (session-scoped, no persistent files)

<!-- /SYNC:fresh-context-review -->

<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM. The template below has ALL 11 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 11 protocol bodies pre-embedded.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
Agent({
  description: "Fresh Round {N} review",
  subagent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
DO THIS FIRST — before any per-protocol check below. The review target is the WHOLE PACKAGE, not the diff alone: load the behavior's spec (§3 ACs / §4 BRs / §8 TCs), its tests, and the changed code TOGETHER, and reason about their mutual consistency BEFORE judging any one in isolation.
1. Locate all three faces: the Feature Spec section(s) governing the changed behavior, the tests that guard it, and the production code that implements it. A missing face is itself a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise — every disagreement is a finding; classify which face is wrong:
   - code vs spec: behavior the code does that no §3/§4/§8 rule describes → CODE-EXTRA or SPEC-STALE; a [HARD] §4 rule or §5 invariant with no enforcing code path → CODE-WRONG.
   - tests vs spec: a §8 TC with no test, or a test asserting behavior no TC/rule names → TEST-GAP or SPEC-SILENT.
   - tests vs code: a changed code path with no covering test → TEST-GAP; a test that still passes against a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: any invariant the code enforces but the spec never states (SPEC-SILENT) MUST be surfaced as a finding to add into §3/§4/§8 AND guarded with a test — the enrichment loop, never a silent pass.
4. Only after the three faces agree — or every disagreement is logged as a finding — proceed to the per-protocol checks below; when enrichment adds spec/test content, re-review the package against the enriched spec.
NEVER mark review PASS while any spec/test/code face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Classify: CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO.

### Design Patterns Quality
Priority checks for every code change:
1. DRY via OOP: Same-suffix classes (*Entity, *Dto, *Service) MUST share base class. 3+ similar patterns → extract to shared abstraction.
2. Right Responsibility: Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
3. SOLID: Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
5. Tests Verify Intent: For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
6. Migration Test Exclusion: Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
2. Every changed code path MUST map to a corresponding test case/spec (or flag as "needs test case").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Migration files are excluded from test/spec creation; schema/data migrations are one-time execution paths, not core application logic.
5. If spec evidence fields exist, verify they point to actual code (file:line, not stale references).
6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
NEVER fix at the crash site. Trace the full flow, fix at the owning layer. The crash site is a SYMPTOM, not the cause.
MANDATORY before ANY fix:
1. Trace full data flow — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where bad state ENTERS, not where it CRASHES.
2. Identify the invariant owner — Which layer's contract guarantees this value is valid? Fix at the LOWEST layer that owns the invariant, not the highest layer that consumes it.
3. One fix, maximum protection — If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
4. Verify no bypass paths — Confirm all data flows through the fix point. Check for direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
BLOCKED until: Full data flow traced (origin → crash); Invariant owner identified with file:line evidence; All access sites audited (grep count); Fix layer justified (lowest layer that protects most consumers).
Anti-patterns (REJECT): "Fix it where it crashes" (crash site ≠ cause site, trace upstream); "Add defensive checks at every consumer" (scattered defense = wrong layer); "Both fix is safer" (pick ONE authoritative layer).

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need TaskCreate. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation
MANDATORY when .code-graph/graph.db exists.
HARD-GATE: MUST run at least ONE graph command on key files before concluding any investigation.
Pattern: Grep finds files → trace --direction both reveals full system flow → Grep verifies details.
- Investigation/Scout: trace --direction both on 2-3 entry files
- Fix/Debug: callers_of on buggy function + tests_for
- Feature/Enhancement: connections on files to be modified
- Code Review: tests_for on changed functions
- Blast Radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Run python .claude/scripts/code_graph trace <file> --direction both --json when .code-graph/graph.db exists.
4. Map dependencies via connections or callers_of — know what depends on your target.
5. Write investigation to .ai/workspace/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Graph trace (if graph.db exists); Assumptions verified with evidence.

## Reference Docs (READ before reviewing)
- `.claude/docs/development-rules.md` — canonical development rules, code-quality guidelines, and pre-commit checklist
- docs/project-reference/code-review-rules.md
- {skill-specific reference docs — e.g., integration-test-reference.md for integration-test-review; backend-patterns-reference.md for backend reviews; frontend-patterns-reference.md for frontend reviews}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to plans/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` subagent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

<!-- SYNC:logic-and-intention-review -->

> **Logic & Intention Review** — Verify WHAT code does matches WHY it was changed.
>
> 1. **Change Intention Check:** Every changed file MUST ATTENTION serve the stated purpose. Flag unrelated changes as scope creep.
> 2. **Happy Path Trace:** Walk through one complete success scenario through changed code
> 3. **Error Path Trace:** Walk through one failure/edge case scenario through changed code
> 4. **Acceptance Mapping:** If plan context available, map every acceptance criterion to a code change
> 5. **Tests Verify Intent:** For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
> 6. **Migration Test Exclusion:** Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
>
> **NEVER mark review PASS without completing both traces (happy + error path).**

<!-- /SYNC:logic-and-intention-review -->

<!-- SYNC:bug-detection -->

> **Bug Detection** — MUST ATTENTION check categories 1-4 for EVERY review. Never skip.
>
> 1. **Null Safety:** Can params/returns be null? Are they guarded? Optional chaining gaps? `.find()` returns checked?
> 2. **Boundary Conditions:** Off-by-one (`<` vs `<=`)? Empty collections handled? Zero/negative values? Max limits?
> 3. **Error Handling:** Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
> 4. **Resource Management:** Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
> 5. **Concurrency (if async):** Missing `await`? Race conditions on shared state? Stale closures? Retry storms?
> 6. **Stack-Specific:** Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
>
> **Classify:** CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO

<!-- /SYNC:bug-detection -->

<!-- SYNC:test-spec-verification -->

> **Test Spec Verification** — Map changed code to test specifications.
>
> 1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
> 2. Every changed code path MUST ATTENTION map to a corresponding test case/spec (or flag as "needs test case")
> 3. New functions/endpoints/handlers → flag for test spec creation
> 4. Migration files are excluded from TC/test creation; schema/data migrations are one-time execution paths, not core application logic.
> 5. If spec evidence fields exist, verify they point to actual code (`file:line`, not stale references)
> 6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
> 7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
> 8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
>
> **NEVER skip test mapping.** Untested code paths are the #1 source of production bugs.

<!-- /SYNC:test-spec-verification -->

<!-- SYNC:integration-test-sync-check -->

> **Integration Test Sync Check** — Verify changed business logic files have corresponding tests.
>
> 1. From changed files → identify **business logic files**: handlers, commands, queries, services, controllers, resolvers, event processors. Naming varies by stack — infer from project conventions (e.g., `*Service.*`, `*Handler.*`, `*Controller.*`, `*Command.*`, `*Query.*`, `*Resolver.*`). Exclude migration files: schema/data migrations are one-time execution paths, not core application logic.
> 2. For each identified file → search for a corresponding test file. Infer test naming from existing tests in the project (e.g., `*.test.ts`, `*Tests.java`, `*_test.py`, `*.spec.js`, `*Tests.cs`). Check standard test directories (`tests/`, `spec/`, `__tests__/`, or adjacent test projects/packages).
> 3. If test EXISTS → check if test methods cover changed behavior (new methods/parameters/logic paths)
> 4. If test MISSING → **MANDATORY**: use `AskUserQuestion`: "Business logic file `{file}` has no integration tests — run `/integration-test` before proceeding, or confirm tests already written?" Options: "Run `/integration-test` first" (Recommended) | "Tests already written/updated — proceed"
> 5. Severity: **HIGH** — missing tests for changed business logic MUST be surfaced to the user; do NOT silently flag and continue
>
> **Surface every business-logic change that lacks test coverage for an explicit `AskUserQuestion` decision — never silently skip. — why: a silent skip ships untested business logic to production.**

<!-- /SYNC:integration-test-sync-check -->

<!-- SYNC:translation-sync-check -->

> **Translation Sync Check** — Verify multilingual UI changes include translation updates.
>
> 1. Determine multilingual mode from project config: `localization.enabled === true` and `supportedLocales.length > 1`
> 2. Detect UI-facing file changes via extensions/path patterns (`.ts`, `.tsx`, `.html`, `.css`, `.scss` plus `localization.uiPathPatterns` when configured)
> 3. For multilingual UI changes, verify translation resource diffs exist (`localization.translationFilePatterns` when configured)
> 4. If translation updates are missing → **MANDATORY**: use `AskUserQuestion`: "UI text changed in a multilingual project, but translation updates were not detected. Run translation sync now or proceed with explicit risk acceptance?" Options: "Run translation sync first" (Recommended) | "Proceed with explicit risk acceptance"
> 5. Severity: **HIGH** — no silent pass for multilingual UI text changes without explicit translation-sync decision
>
> **Do NOT silently skip. Multilingual UI text changes require explicit translation-sync confirmation.**

<!-- /SYNC:translation-sync-check -->

<!-- SYNC:category-review-thinking -->

> **Category Review Thinking** — A thinking framework for reviewing any category of changed files. NOT a fixed checklist — derive concerns from domain knowledge; the examples are starting points only. Your knowledge of the category exceeds any list here — trust it.
>
> **Step 1 — Understand the category's role.** What is this category responsible for in the overall system? What invariants must it uphold? What are its consumer contracts (who depends on it, what do they expect)?
>
> **Step 2 — Read project conventions for this category.** Search for reference docs, style guides, ADRs, or READMEs specific to this area. Grep 3+ existing similar files — extract naming conventions, structural patterns, shared base classes. If no docs exist, derive conventions empirically from existing code.
>
> **Step 3 — Derive concerns from first principles.** Apply all that are relevant; expand beyond this list based on the actual category:
>
> - **Correctness:** Does the logic match the intent? Trace happy path AND error path.
> - **Boundary contracts:** Are interfaces/APIs/events/protocols honored? No implicit coupling introduced?
> - **Project conventions:** Does new code follow the patterns found in Step 2? Evidence-confirmed, not assumed.
> - **Security:** Auth enforced at every entry point? Input validated at boundaries? No secrets in the diff?
> - **Performance:** Unbounded operations? N+1 patterns? Blocking calls in async context? Unindexed queries?
> - **Maintainability:** DRY? Single responsibility? Complexity within reason? Names reveal intent?
> - **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
> - **Documentation:** Do related docs, specs, or READMEs reflect the changes?
>
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a `TaskCreate` sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
>
> **Illustrative concern examples by category type** (not exhaustive — trust your knowledge beyond this):
>
> - _Server-side logic:_ handler/service structure conventions, validation layer placement, side-effect isolation, cross-service boundary enforcement, data-access layer separation, error propagation strategy
> - _Client-side logic:_ component lifecycle management, resource cleanup (subscriptions, listeners, timers), state management patterns, API integration layer separation, reactive stream composition
> - _Data/Schema:_ migration reversibility (rollback script), lock impact on table volume, backfill idempotency, index coverage for query patterns, deployment ordering
> - _Configuration:_ present in ALL environments? No secrets in diff? App fails fast if config missing (not silently null)? Documented in setup guide?
> - _Infrastructure:_ dev/prod parity? No hardcoded dev values (localhost, debug flags)? Pinned image/dependency versions? CI/CD secret requirements documented?
> - _Styles/Assets:_ follows project naming conventions? Uses design variables/tokens (no hardcoded magic values)? Correct scope (no global side effects from component styles)?
> - _Documentation:_ accurate? Links valid? Examples still match current code/behavior? Covers new scenarios?
> - _Tests:_ assertions verify specific outcomes (not just "no exception")? Idempotent (repeatable N times)? Covers edge cases, not just happy path?
> - _Security artifacts:_ all code paths reach the gate? Negative tests exist (unauthorized denied)? Both enforcement AND display control updated?
> - _Build/Tooling:_ rule changes apply consistently? No exceptions that silently swallow violations? Impact on CI runtime documented?

<!-- /SYNC:category-review-thinking -->

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation/Scout | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

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

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `/sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: plans/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:spec-drift-adjudication -->

> **Spec drift adjudication (code-wrong vs spec-stale).** Whenever changed behavior diverges from a canonical Feature Spec (business rule, acceptance criterion, flow, state transition, or §8 TC under `docs/specs/`), you MUST NOT silently pick a side. Adjudicate per `shared/sdd-artifact-contract.md` → **Drift Gates**:
>
> 1. **Detect** — compare the change against the spec's documented intent. No divergence → record `Spec in sync` and move on.
> 2. **Classify** the divergence:
>     - **CODE-WRONG** — the spec correctly states intended behavior and the change violates it → BLOCKING finding; fix the code/test against intended behavior (write/adjust a regression TC first).
>     - **SPEC-STALE** — the change is the new intended behavior and the spec now documents the old/wrong behavior → update the spec FIRST via `/spec [mode=update]`, then sync `/spec [mode=tests]` + `/spec [mode=sync]`.
>     - **AMBIGUOUS** — intended behavior is unclear → `AskUserQuestion` (or the canonical spec owner) before editing either side.
>     - **SPEC-SILENT** — the code correctly enforces an invariant/behavior that NO canonical spec artifact (§3 AC, §4 BR, §5 invariant, §8 TC) states → not drift but an UNWRITTEN rule discovered by review. ENRICH the spec via the **Invariant Harvest** pass (`/spec [mode=sync] direction=harvest` → `spec/references/sync.md`): prove it is always-true (≥2 enforcement points or a rejecting guard), express it as a universally-quantified property, then add the rule to §4 (or §3/§5) AND a §8 TC via `/spec [update]` + `/spec [mode=tests]` and add the guarding test. A discovered invariant left only in code (or only in tests) is INCOMPLETE — this is the highest-value capture (the rule nobody wrote down).
> 3. **Never normalize drift just because code/tests are green** — green can encode the drift itself. Reconcile to canonical intent, never to whichever side currently passes.
>
> A behavior-changing review/implementation that leaves a spec divergence unadjudicated is INCOMPLETE; an unwritten-but-enforced invariant left uncaptured (no §4/§8 entry) is equally INCOMPLETE.

<!-- /SYNC:spec-drift-adjudication -->

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

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by how easy it is to fix. One scale across all reviews so a "High" means the same thing everywhere.
>
> | Severity | Action      | Definition                                                                |
> | -------- | ----------- | ------------------------------------------------------------------------- |
> | CRITICAL | Block merge | Silent runtime failure, data corruption, validation bypass, security hole |
> | HIGH     | Must fix    | Incorrect behavior, invariant gap, architectural violation                |
> | MEDIUM   | Should fix  | Design debt, maintainability, likely future bug                           |
> | LOW      | Nice to fix | Convention, documentation, minor clarity                                  |
>
> **Score-based skills** map their numeric scale onto these tiers — do not invent a parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (criterion unmet, blocks production readiness), `1` = MEDIUM (partial, should fix), `2` = pass (no finding).
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): map the resulting cell to the nearest tier — high-impact + high-likelihood → CRITICAL/HIGH; low-impact OR low-likelihood → MEDIUM/LOW.
>
> A finding's tier drives the gate: CRITICAL/HIGH must be resolved or explicitly accepted by the owner before PASS; MEDIUM/LOW may ship with a tracked follow-up.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
  <!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:design-patterns-quality:reminder -->

**IMPORTANT MUST ATTENTION** check DRY via OOP, right responsibility layer, SOLID. Grep for dangling refs after moves.

<!-- /SYNC:design-patterns-quality:reminder -->

<!-- SYNC:complexity-prevention:reminder -->

**IMPORTANT MUST ATTENTION** apply complexity prevention — one business change = one code change. Flag change amplification (>3 edit sites for future change), scattered type-switches, anemic models, primitive obsession, leaked technology through abstractions, shallow modules, un-extracted utility logic (paging/datetime/string/retry → helpers), and logic in the wrong higher layer (downshift to callee/entity/VM). Don't rationalize silent duplication with pure YAGNI.

<!-- /SYNC:complexity-prevention:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → trace → verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:logic-and-intention-review:reminder -->

**IMPORTANT MUST ATTENTION** verify WHAT code does matches WHY it changed. Trace happy + error paths.

<!-- /SYNC:logic-and-intention-review:reminder -->

<!-- SYNC:bug-detection:reminder -->

**IMPORTANT MUST ATTENTION** check null safety, boundaries, error handling, resource management for every review.

<!-- /SYNC:bug-detection:reminder -->

<!-- SYNC:test-spec-verification:reminder -->

**IMPORTANT MUST ATTENTION** map changed code paths to test cases. Flag untested paths.

<!-- /SYNC:test-spec-verification:reminder -->

<!-- SYNC:integration-test-sync-check:reminder -->

**IMPORTANT MUST ATTENTION** check changed logic files for matching tests. Surface missing tests via `AskUserQuestion` — mandatory, not advisory.

<!-- /SYNC:integration-test-sync-check:reminder -->

<!-- SYNC:translation-sync-check:reminder -->

**IMPORTANT MUST ATTENTION** for multilingual UI text changes, verify translation updates. If missing, require explicit user decision via `AskUserQuestion`.

<!-- /SYNC:translation-sync-check:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `/sequential-thinking` skill.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:systematic-review-batching:reminder -->

- **MANDATORY** Large changeset → batch by size cap (≤8 files OR ≤2000 diff-lines), one parallel sub-agent per batch; never review many files one-by-one.
- **MANDATORY** > 6 categories OR > 40 files → add the hierarchical synthesis tier; each concern-synthesizer emits cross-concern interaction candidates and the orchestrator runs the cross-concern pass before concluding.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify findings Critical/High/Medium/Low by consequence; Critical/High block PASS until fixed or owner-accepted.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure every reviewed change is defect-free, evidence-backed, convention-aligned, and synchronized with required tests/docs before handoff; when code files changed, also prove the code stays easy to change.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each line is a signpost to its canonical body above — MUST ATTENTION honor the full block, NEVER act on the digest alone):**

- **Systematic Batching:** ≥10 files → size-capped parallel batches.
- **Debugger Trace:** bug/fix → End→Start backward trace gate.
- **Critical Thinking:** every claim traced; confidence >80% to act.
- **Sequential Thinking:** multi-step Thought N/M with markers.
- **Understand Code First:** grep 3+, read code before changes.
- **Design Patterns Quality:** DRY/SOLID, right responsibility layer.
- **Complexity Prevention:** one business change = one code change.
- **Double Round-Trip Review:** validate → fix → full re-review until clean.
- **Fresh Context Review:** fresh zero-memory sub-agent after fixes.
- **Review Protocol Injection:** embed 11 protocols verbatim into sub-agent prompts.
- **Logic And Intention Review:** WHAT code does matches WHY changed.
- **Bug Detection:** null, boundaries, error handling, resource cleanup.
- **Test Spec Verification:** map changed paths to test cases.
- **Integration Test Sync:** missing tests surface via `AskUserQuestion`.
- **Translation Sync:** multilingual UI text changes need translation updates.
- **Category Review Thinking:** derive categories from file + change nature.
- **Graph-Assisted Investigation:** run graph trace on key files.
- **Nested Task Creation:** expand child phases, link parent.
- **Project Reference Docs:** read required docs including `lessons.md`.
- **Task Tracking + Report:** bootstrap tasks, persist findings incrementally.
- **Source/Test Drift:** behavior change → reconcile affected tests.
- **Spec Drift:** classify CODE-WRONG/SPEC-STALE/AMBIGUOUS/SPEC-SILENT, route fix.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Severity Rubric:** classify Critical/High/Medium/Low by consequence.

> **[CRITICAL — TOP 3 RULES REPEATED]**
>
> 1. **MUST ATTENTION Phase 0 graph blast-radius FIRST** — NEVER skip; informs entire review priority order
> 2. **MUST ATTENTION findings follow the active ownership boundary.** Standalone mode runs Phase 6 validate → Phase 7 fix → full `/review-changes` restart; inside `$workflow-review-changes`, stop after the report and hand findings to parent step 2, then parent steps 10-15 own plan/feature-implement/restart.
> 3. **MUST ATTENTION TaskCreate ALL phases** before starting; missing tests MUST surface via `AskUserQuestion`

- **MANDATORY** Nested Task Expansion Contract — when invoked inside a workflow, STILL expand internal phases via `TaskCreate` with `[N.M] $review-changes — phase` prefix and `TaskUpdate(parentTaskId, addBlockedBy: [childIds])` linkage. Workflow row is container, not substitute.
- **MANDATORY** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY** validate decisions with user via `AskUserQuestion` — NEVER auto-decide
- **MANDATORY** add final review todo task to verify work quality
- **MANDATORY** discover and READ project-specific reference docs before starting
- **MANDATORY** Phase 0 graph blast-radius is FIRST step — NEVER skip it
- **MANDATORY** any finding must be validated before fix; standalone mode invokes `/why-review --validate-findings`, while `$workflow-review-changes` parent mode stops after the report and delegates validation to parent step 2
- **MANDATORY** after fixing validated findings in standalone mode, recursively invoke `/review-changes` again from Phase 0 with a brand-new task breakdown and review the full current diff, not only the fixed files; in parent mode, parent steps 10-15 own the fix plan, feature-implement, and full restart
- **MANDATORY** continue validate → fix → full restart until one complete review invocation has zero findings; standalone mode executes that loop locally, parent mode reports findings to `$workflow-review-changes` for the loop
- **MANDATORY** documentation staleness check is REQUIRED in every review — flag stale docs even if not auto-fixing
- **MANDATORY** run the **Phase 8 final `/docs-update` gate** once the review/fix loop converges to zero findings — ALWAYS, unconditional, never skipped on a clean verdict (deferred only inside `$workflow-review-changes` to the parent's docs-update step) — why: a passing code review still leaves docs stale until docs-update reconciles every impacted doc against the actual changes; a clean review with skipped docs-update is INCOMPLETE
- **MANDATORY** run the **Phase 3.5 Code-Simplifier Optimization gate** whenever the diff includes code files — invoke `/code-simplifier` (report mode) over the changed code files, record its clarity/consistency/maintainability findings in the report, and route them through Phase 6 validation → Phase 7 fix; skip ONLY for docs-only diffs (record the skip reason) — why: correctness review proves it works, the simplifier gate proves it stays cheap to change, and the step is silently dropped without an anchored reminder
- **MANDATORY** run the **Phase 3.7 Integration-Test-Review Coverage Gate** whenever the diff includes behavior-bearing code — invoke `/integration-test-review` over the FULL change set (production code AND tests); its Gate 7 must map every behavior change to a covering test (integration-first; unit fallback justified) and a spec TC, and every GAP/SPEC-GAP becomes a finding for Phase 6 validation → Phase 7 fix (GAP fix = write the missing test); skip ONLY for docs-only diffs with recorded reason, and defer to the parent's dedicated `/integration-test-review` step inside `$workflow-review-changes` — why: a correct-looking change with no covering test or stale spec ships unprotected behavior; the pairing check alone proves file names, not coverage
- **MANDATORY** missing tests for changed business logic MUST surface to user via `AskUserQuestion` — NOT silently logged
- **MANDATORY** run the **Phase 6 Why-Review Findings Validation Gate** whenever ANY finding exists in standalone mode — invoke the `/why-review` skill through the `Skill` tool with `--validate-findings` (terminal mode, same session; an ACTUAL skill call — re-reading the cited lines yourself or any inline/manual self-validation does NOT satisfy this gate). The moment the first finding is recorded, register `[Review Phase 6] Why-review findings validation gate — invoke /why-review` via `TaskCreate` so it is never forgotten. Verify every finding is correct, proof-backed, reasonable, and best-practice; RE-DO it ONLY if it surfaces finding issues or enhancement opportunities (max 2 re-dos, then escalate via `AskUserQuestion`); then Phase 7 fixes validated findings and restarts this skill. Inside `$workflow-review-changes`, do not run Phase 6/7 locally; parent step 2 and steps 10-15 own those gates.
- **MANDATORY** follow declared step order; NEVER skip, reorder, or merge steps without explicit user approval
- **MANDATORY** every skipped step includes explicit reason; every completed step includes concise evidence
- **MANDATORY** Report-driven — write every finding to `plans/reports/code-review-{date}-{slug}.md` incrementally as each file/dimension is reviewed, NOT in one final batch — why: the report is external memory AND the deliverable; findings held only in context are lost on compaction
- **MANDATORY** Evidence Gate — back every claim, finding, and recommendation with `file:line` proof or a traced call chain plus a confidence read (>80% act, 60-80% verify first, <60% DO NOT recommend); speculation is FORBIDDEN output and "insufficient evidence" is a valid verdict — why: an unproven finding wastes the author's time and erodes trust in the whole report
- **MANDATORY** Convention-before-flag — grep 3+ existing examples before flagging ANY pattern, naming, or style violation; codebase convention wins over textbook rules — why: flagging against a rule the project never adopted manufactures false positives
- **MANDATORY** Enforce YAGNI / KISS / DRY / Clean Code on changed code — flag speculative generality, needless complexity, and duplicated knowledge; 3+ similar patterns = MANDATORY extraction, 2+ same-kind violations = a structural finding (not individual nits) — why: these are the day-to-day forms of the Easy-to-Change success metric
- **MANDATORY** Spec Drift Adjudication runs for EVERY behavior-changing review (not only post-bugfix) — classify each divergence CODE-WRONG / SPEC-STALE / AMBIGUOUS / SPEC-SILENT and route the owed fix (CODE-WRONG → fix code + regression TC; SPEC-STALE/SPEC-SILENT → `/spec [update]` + `/spec [mode=tests]`; AMBIGUOUS → `AskUserQuestion`); record `Spec in sync` when none — why: passing code and tests can still silently normalize a spec violation
- **MANDATORY** Dual-Feedback Ledger — every behavior-changing finding must feed BOTH the spec AND the tests; a blank or bare-"N/A" cell on either axis = FAIL (each N/A carries its reason inline) — why: fixing only the code leaves the spec or its TC stale and the gap reopens next change
- **MANDATORY** Bugfix Debugger Trace Gate (§6.5) — for bugfix / regression / failed-verification / stale-output / behavior-changing fixes, FAIL the review unless an End→Start debugger trace, enumerated feeder paths, hypothesis matrix, lowest-owning-fix-layer justification, and forward-convergence + regression-test proof are all present — why: a fix without a trace patches the symptom site and the bug recurs
- **MANDATORY** Fresh-Context Gate (Phase 3) is review-ONLY — it may ADD findings but NEVER fixes or validates them, NEVER re-reviews known findings, and does NOT run merely because Phase 7 restarted; any non-zero finding set flows straight to Phase 6 — why: re-reviewing known findings burns context without adding signal
- **MANDATORY** Integrate sub-agent and synthesis findings RAW into the main report — read them, NEVER filter, soften, or override them — why: the main agent rationalizes away its own mistakes; the zero-memory sub-agent exists to catch exactly those
- **MANDATORY** When the diff includes frontend/UI files, `/review-changes` OWNS the UI dimension — run `/review-ui` (prefer a `ui-ux-designer` sub-agent in the same parallel batch): long-content overflow, responsive flex sizing, z-index discipline, SCSS/BEM quality; skip only when no frontend files changed — why: `/review-ui` is never a separate workflow step, so a skipped UI pass ships UI defects unreviewed
- **MANDATORY** M1-M6 Code-to-Spec Drift Gate (§8, BLOCKING) for any spec/feature-doc/PBI/story/test-spec the change touches or should sync — FAIL on introduced tech leakage (M1) / source-code-as-prose (M2) / broken logical-ID mapping (M3) / AC ambiguity (M4) / spec no longer rebuildable from artifact alone (M5); a FAIL must name the violated mandate ID + changed file:line; carriers (`[Source:]`, `**Evidence**`, frontmatter, mermaid) are EXEMPT — why: passing an introduced M1-M5 violation makes the review itself defective
- **MANDATORY** Architecture Boundary Check — for each changed file, read `architectureRules.layerBoundaries` from `docs/project-config.json`, match the file's layer, grep its imports, and BLOCK as Critical on any import from a `cannotImportFrom` layer; skip silently when `architectureRules` is absent — why: a layer-boundary breach compiles and ships silently while rotting the architecture
- **MANDATORY** AI Agent Integrity Gate before reporting ANY work done — grep every removed name (0 dangling refs across ALL file types), ask WHY before changing an existing value, verify ALL affected outputs (one green ≠ all green), evaluate pattern fit before copying nearby code (same scope/lifetime/base class/constraints), and prove every new artifact is wired (registered, imported, reachable) — why: completion ≠ correctness, and an unverified "done" is an untested hypothesis
- **MANDATORY** Large changeset (≥10 changed files) → Systematic Review Batching — categorize, size-cap batches (≤8 files OR ≤2000 diff-lines), fire one parallel sub-agent per batch, then reduce; >6 categories OR >40 files adds the hierarchical synthesis tier with the cross-concern interaction pass; ANNOUNCE any dropped/sampled scope — never review many files one-by-one and never let bounded coverage read as complete — why: a single agent's context silently truncates on big diffs, leaving files unreviewed

> **[BOTTOM REMINDER — WHY-REVIEW FINDINGS-VALIDATION GATE IS NON-NEGOTIABLE]**
>
> Same rule as the **Top Reminder**, repeated so it survives long contexts: ANY finding in standalone mode → you **MUST invoke the `/why-review` skill** (`Skill` tool, `--validate-findings <report-path>`) before any fix, docs-update, commit, or handoff. No inline/manual self-validation substitutes for the actual skill call. **`TaskCreate` the `[Review Phase 6]` gate the moment the first finding lands** so it can never be forgotten. Inside `$workflow-review-changes`, defer to parent step 2.

**Anti-Rationalization:**

| Evasion                                   | Rebuttal                                                                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Too simple for graph blast-radius"       | Phase 0 graph check sets risk order; run it or record graph unavailable.                                                                             |
| "No findings, skip docs/tests"            | Clean verdict still needs proof that docs/tests were checked or explicitly not relevant.                                                             |
| "Finding is obvious, fix now"             | Invoke the `/why-review` skill (`--validate-findings`) first — an actual skill call, not inline self-validation; unvalidated findings are not fixes. |
| "I already re-checked the lines myself"   | Inline re-reading does NOT pass Phase 6. The gate requires a real `/why-review` skill invocation that returns a verdict.                             |
| "Only re-check fixed files"               | Fixes can interact with earlier changes; restart `/review-changes` from Phase 0 on the full diff.                                                    |
| "Sub-agent already reviewed"              | Main report must integrate raw findings and not override or filter them.                                                                             |
| "Already searched project conventions"    | Show 3+ `file:line` examples. No evidence means no search.                                                                                           |
| "DRY/SOLID requires this abstraction"     | Prove it lowers future change cost; otherwise it is ceremony, not quality.                                                                           |
| "Review found no bugs, skip simplifier"   | Bug-finding ≠ simplification. Run Phase 3.5 `/code-simplifier` on changed code files anyway.                                                         |
| "No test files changed, skip test review" | The review target is the CHANGE, not the test files. Phase 3.7 Gate 7 maps every behavior change to a covering test + spec TC.                       |
| "Test file with matching name exists"     | Name pairing ≠ coverage. Phase 3.7 `/integration-test-review` proves assertion-level coverage of the changed behavior.                               |
| "Clean review, docs surely fine"          | Clean code ≠ current docs. Run the Phase 8 `/docs-update` sweep before handoff — it is mandatory, not conditional.                                   |
| "Behavior changed but spec + tests pass"  | Passing ≠ in-sync. Run Spec Drift Adjudication AND the Dual-Feedback Ledger; classify the divergence and route the owed spec/test fix.               |
| "Bug fixed, ship it"                      | A bugfix review FAILS without the §6.5 End→Start trace, feeder enumeration, hypothesis matrix, and regression proof.                                 |
| "Confident enough, no need to cite"       | <80% confidence = verify first; no `file:line` = speculation, which is forbidden output. State what you traced and how.                              |
| "It reads fine, looks correct"            | "Looks fine" is not proof. Trace one happy path + one error path and cite the lines before calling it correct.                                       |
| "Frontend tweak, skip UI review"          | `/review-changes` owns the UI dimension — any frontend file in the diff triggers `/review-ui`; it is never a separate step to defer.                 |
| "Nearby code does it this way, copy it"   | Closest example ≠ matching preconditions. Prove the new context shares the same scope, lifetime, base class, and constraints before copying.         |
| "Spec prose names the class, harmless"    | Introduced tech/source-as-prose in spec narrative is an M1/M2 FAIL (§8). Name the mandate ID + changed file:line; carriers are the only exemption.   |
| "Import compiles, layer is fine"          | Compiling ≠ allowed. Check `architectureRules.layerBoundaries`; a `cannotImportFrom` breach is a BLOCKING Critical, not a style nit.                 |
| "Many files, I'll just read them all"     | One context truncates silently on big diffs. ≥10 files → size-capped parallel batches + reduce; announce any dropped/sampled scope.                  |

**[TASK-PLANNING]** Break scope into small todo tasks before acting; maintain one `in_progress`; add final review todo.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

**IMPORTANT MUST ATTENTION** graph blast-radius runs first when `.code-graph/graph.db` exists.
**IMPORTANT MUST ATTENTION** every claim needs `file:line` proof; every stale docs/tests decision needs evidence.
**IMPORTANT MUST ATTENTION Goal:** Ensure every reviewed change is defect-free, evidence-backed, convention-aligned, and synchronized with required tests/docs before handoff; when code files changed, also prove the code stays easy to change.
