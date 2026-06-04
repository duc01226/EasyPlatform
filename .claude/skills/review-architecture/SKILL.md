---
name: review-architecture
version: 1.4.0
description: '[Code Quality] Use when reviewing architecture compliance for layers, messaging, service boundaries, CQRS, repos, and entity events.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Ensure changes preserve architecture boundaries, ownership, message flow, and generated artifact integrity before handoff — validating changed code against layers, service boundaries, message flow, CQRS, repositories, entity events, frontend architecture, generated artifacts, recorded architecture decisions (ADRs), and quality tooling.

**Summary:**

- Phase 0 is non-negotiable and first: load the project architecture docs (`backend-patterns-reference.md`, `project-structure-reference.md`, `frontend-patterns-reference.md`, `code-review-rules.md`) — every rule and base-class/symbol name comes from those docs, NEVER general knowledge; the framework names in Categories 2–8 are illustrative only.
- Review serially, one category at a time (Cat 0 tooling baseline → Cat 9 ADR conformance): doc rule → source evidence → `file:line` proof + grep 3+ counterexamples → PASS/WARN/BLOCKED. Never scan categories in parallel; codebase convention wins over a suspected violation.
- Stay in lane: deep-review only what this skill OWNS (layers, messaging/CQRS/repos/service boundaries, entity events, frontend architecture, quality tooling, generated artifacts, ADRs); record a one-line `→ route to {sibling}` pointer for security/performance/DDD/UI/test findings instead of expanding them.
- Read-only until validated: after producing any finding, run the Phase 5 `/why-review` self-validation gate before handoff; fixes happen only in the validated fix loop, and every fix restarts a full review from Phase 0. Write findings to `plans/reports/arch-review-{date}-{slug}.md`.

**Default scope:** All uncommitted changes (staged + unstaged). Override: specify files, directories, services, or full codebase.

> **MANDATORY MUST ATTENTION** Plan tasks to READ architecture docs BEFORE reviewing:
>
> 1. `docs/project-reference/backend-patterns-reference.md` — CQRS, messaging, repos, validation, entity events, layer rules **(READ FIRST — primary rules source)**
> 2. `docs/project-reference/project-structure-reference.md` — service map, layer structure, DB ownership
> 3. `docs/project-reference/frontend-patterns-reference.md` — component hierarchy, store, API patterns **(frontend files only)**
> 4. `docs/project-reference/code-review-rules.md` — anti-patterns, conventions
>
> Not found → search: "architecture documentation", "service patterns", "messaging patterns". Rules come from docs — NOT general knowledge.

**Workflow:**

1. **Phase 0: Load Architecture Rules** — Read project architecture docs
2. **Phase 1: Determine Scope** — Changed files (default) or user-specified scope
3. **Phase 2: Blast Radius** — Run `/graph-blast-radius` if graph.db exists
4. **Phase 3: Architecture Review** — Check each file against all applicable categories
5. **Phase 4: Finalize** — Generate compliance report with PASS/BLOCKED/WARN verdicts

**Key Rules (top 3 critical first):**

- MUST ATTENTION read project architecture docs in Phase 0 BEFORE reviewing — rules come from docs, NEVER general knowledge.
- Every violation needs `file:line` proof + grep 3+ counterexamples before flagging — NEVER speculate.
- MUST ATTENTION review one category at a time: doc rule → source evidence → verdict — NEVER scan categories simultaneously.
- Write findings to `plans/reports/arch-review-{date}-{slug}.md`.
- BLOCKED = must fix before merge | WARN = review and decide | PASS = compliant.
- Review is read-only until `/why-review --validate-findings` confirms findings; fixes happen only in the validated fix loop or downstream plan/feature-implement, and every fix restarts a full architecture review from Phase 0 with a fresh task breakdown.

## Your Mission

<task>
$ARGUMENTS
</task>

## First Principle — Easy to Change

> **Success metric: future change cost.** DRY, SRP, abstraction, patterns, naming, layering, tests exist to make next change cheaper.

Before applying any rule, ask: **does this lower or raise future change cost?**

- Reject "best practices" raising cost: premature abstraction, speculative generality, leaky indirection, ceremony without payoff. — why: cost added now with no payoff is debt, not quality.
- Name real enemies: **coupling, hidden state, duplicated knowledge, unclear intent, irreversible decisions exposed too early**.
- Prefer simple reversible design over sophisticated rigid design. — why: reversible decisions cost less to undo when wrong.
- If downstream rule raises change cost, this principle wins.

---

## Quality Tooling Principle — Tech-Stack Adaptive

> Architecture review includes automated quality guardrails. Without stack-appropriate linting, formatting, type checks, static analysis, dependency/security-review scanning, CI enforcement, defects depend on reviewer memory.

Evaluate detected stacks, not fixed tool list:

- Detect stacks from project-reference docs, manifests, lock files, build files, CI before recommending tools.
- Per production stack, verify formatter/style config, linter/code analyzer, compiler/type-check strictness, dependency/vulnerability scanning, tests/coverage, CI/pre-commit enforcement.
- Prefer official or ecosystem-standard tooling; local docs absent/stale → check current official docs before recommending setup.
- MUST ATTENTION recommend enforceable best practice only: installed but unwired tool = WARN; production source with no relevant automated quality gate = BLOCKED.
- Identify missing capability first; map to local equivalent before prescribing new tooling. — why: prescribing a tool that duplicates an existing gate adds noise, not coverage.

---

## Review Mindset (NON-NEGOTIABLE)

Skeptical. Every claim needs traced proof, confidence >80%.

- NEVER flag violations without reading actual code + tracing dependency — READ the code, trace the import chain, then flag.
- Every finding MUST include `file:line` evidence.
- Before flagging pattern violation: grep 3+ existing examples — codebase convention wins.
- Question: "Actually a violation, or an established exception?"

## Ownership & Handoff (own vs delegate)

This skill = one reviewer in a multi-reviewer pipeline — `workflow-review-changes` runs it beside the siblings below. Review ONLY what this skill owns; route the rest so findings are not double-reported across reviewers.

| This skill OWNS (deep-review here)                                                                                      | Delegate to sibling (one-line pointer only — do NOT deep-review)                                                     |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Layer boundaries, dependency direction, business-logic placement                                                        | —                                                                                                                    |
| Messaging patterns, CQRS structure, repository patterns, service-pattern era, entity event handlers, service boundaries | —                                                                                                                    |
| Frontend ARCHITECTURE (base classes, store/effect, API-service base, subscription teardown, CSS-class presence)         | Visual/SCSS/responsive/z-index quality → `review-ui`                                                                 |
| Quality-tooling baseline, generated-artifact integrity, ADR / recorded-decision conformance                             | —                                                                                                                    |
| Architecture-level auth PLACEMENT (a gate exists at the boundary)                                                       | OWASP, secrets, dependency/supply-chain, authz-matrix depth → `security-review`                                      |
| Structural soundness of a hot path (no obvious N+1 introduced by the diff)                                              | Query plans, indexing depth, latency/throughput budgets → `performance-review`                                       |
| —                                                                                                                       | Domain entity / value-object DDD design quality → `review-domain-entities`                                           |
| —                                                                                                                       | Integration-test assertion quality, coverage, traceability → `integration-test-review`                               |
| —                                                                                                                       | Runtime production-readiness of service/API changes (observability wiring, rollback) → `production-readiness-review` |

When a finding clearly belongs to a sibling, record one-line `→ route to {skill}` pointer and move on — NEVER expand it. — why: duplicated findings across reviewers inflate severity counts and bury issues each reviewer uniquely owns.

## Phase 0: Load Architecture Rules (MANDATORY FIRST)

> **MUST ATTENTION:** Read project docs BEFORE reviewing. Rules come from docs, NEVER general knowledge.

- read `docs/project-reference/backend-patterns-reference.md` — extract messaging naming, layer rules, CQRS patterns, repo rules, entity event handler patterns, validation patterns
- read `docs/project-reference/project-structure-reference.md` — extract service map, layer structure, DB ownership
- frontend files in scope → read `docs/project-reference/frontend-patterns-reference.md`
- read `docs/project-reference/code-review-rules.md` — extract anti-patterns + review rules directly

## Phase 1: Determine Scope

**Default (no override):** Review all uncommitted changes.

```bash
git status          # List changed files
git diff            # Staged + unstaged changes
git diff --cached   # Staged only
```

- Collect file list to review.
- Categorize: backend (.cs), frontend (.ts/.html), config, docs, other.
- Filter to architecture-relevant files (skip pure docs, configs, tests unless architecture-relevant).

## Phase 2: Blast Radius (if graph.db exists)

- `.code-graph/graph.db` exists → call `/graph-blast-radius` skill.
- Record: impacted file count, cross-service impact, risk level.
- Prioritize review by highest-impact files first.
- Graph unavailable → note "Graph not available — skipping blast radius" and proceed.

Per changed file with downstream impact:

```bash
python .claude/scripts/code_graph trace <changed-file> --direction downstream --json
```

Flag MESSAGE_BUS consumers or event handlers impacted by changes.

## Phase 3: Architecture Review

Create report: `plans/reports/arch-review-{date}-{slug}.md`

Per file in scope, evaluate against ALL applicable categories. Skip categories not applicable to file type.

MUST ATTENTION review serially. Per applicable category: read docs/source evidence → derive risk with `Think:` → grep 3+ examples/counterexamples → record PASS/WARN/BLOCKED. NEVER scan categories simultaneously — why: parallel scanning collapses per-category evidence into one undifferentiated pass and drops findings.

> **Portability note (MUST ATTENTION):** Concrete framework symbols, base-class names, directory conventions in Categories 2–8 below are **illustrative examples** — authoritative form for repository under review sourced from Phase 0 reference docs (`backend-patterns-reference.md`, `frontend-patterns-reference.md`, `project-structure-reference.md`), so verify code against those docs. On any stack, map each example to project's equivalent as named in its own reference docs, flag deviations from project's **actual** convention — NEVER from these literal names. Same discipline as Category 5: read project docs at review time; NEVER treat hardcoded name as universal.

---

### Category 0: Quality Tooling Baseline — Severity: BLOCKED/WARN

**Think:** Can project automatically catch style, type, complexity, security, dependency, boundary regressions for detected stacks?

- Detect production stacks via `docs/project-config.json`, relevant docs, manifests, lock files, build files, CI.
- Inventory gates: formatter, linter, code/static analyzer, compiler/type checker, dependency audit/SCA/SBOM, SAST, test/coverage, architecture/dependency-boundary checks, pre-commit, CI/build.
- Verify stack-appropriate coverage: `.editorconfig`/language analyzers, JavaScript/TypeScript linting, UI template linting when supported, formatter config, dependency vulnerability scans, semantic security analysis.
- BLOCKED when production stack lacks runnable lint/static-analysis/type-check command and equivalent enforced gate, or CI/build references missing/broken quality command.
- WARN when tooling local-only, not wired into CI/build/pre-commit, partial for active production code, broadly/unexplainedly suppressed, unclear on generated-code exclusions, or stale for stack.
- **Scope to the change (MUST ATTENTION):** On normal change-level review, _pre-existing_ tooling gap unrelated to diff is WARN with single note — NEVER BLOCK whole review on standing, change-unrelated condition. Reserve BLOCKED for: new stack/service introduced by this change with no gate, change itself removing/breaking existing gate, or explicit full-codebase/greenfield audit scope. — why: change review that BLOCKs on unrelated standing gap produces noise that buries regression the diff actually introduced.
- Before recommending tools, find current official/ecosystem setup and cite it; recommend capabilities first, tools second.

**Violation format:**

```
BLOCKED: {stack} has no enforced lint/static-analysis/type-check quality gate ({evidenceFile}:{line})
```

---

### Category 1: Clean Architecture Layers — Severity: BLOCKED

**Think:** What layer is this file in? What layers can it legally import from? Does any import break inward-only flow (Service/API → Application → Domain ← Persistence)?

- Read `docs/project-config.json` → `architectureRules.layerBoundaries` for project-specific rules.
- Determine layer from file path: Domain/, Application/, Persistence/, Service/.
- Scan configured language's import/include statements — flag imports from forbidden layers.
- MUST ATTENTION verify business logic in correct layer: Entity/Domain > Service/Application > Controller/Component.
- NEVER allow direct infrastructure access from Domain — keep repo interfaces in Domain, implementations in Persistence. — why: Domain depending on infrastructure inverts the dependency rule and couples core logic to a swappable detail.
- NEVER allow business logic in API/Controller layer — push it down to Entity/Domain or Application.

**Violation format:**

```
BLOCKED: {layer} layer file {filePath}:{line} imports from {forbiddenLayer} layer ({importStatement})
```

---

### Category 2: Message Bus Patterns — Severity: BLOCKED/WARN

**Think:** Does this message correctly name its type (event vs request)? Does it extend the right base class? Is producer/consumer relationship correctly oriented — does the leader service own the event?

**Naming (BLOCKED):**

- Event messages + request messages MUST follow project's bus-message naming convention — encode owning service + feature + action, with distinct suffix distinguishing event-kind from request-kind messages. Resolve exact convention + suffixes from `backend-patterns-reference.md`.
- Grep existing examples in source for current stack's message-naming pattern before flagging — codebase convention wins.

**Base classes (BLOCKED):** Verify against bus base types named in `backend-patterns-reference.md` (Phase 0); concrete names are illustrative examples.

- Bus messages MUST extend project's trackable/payload bus-message base — see `backend-patterns-reference.md`.
- Consumers MUST extend project's message-bus consumer base — see `backend-patterns-reference.md`.
- Producers MUST extend project's event-bus-message producer base — see `backend-patterns-reference.md`.

**Upstream/Downstream (BLOCKED):**

- Leader service owns entity data → defines event message for it.
- Follower services consume events — NEVER produce events about data they don't own. — why: producing events about non-owned data forks the source of truth across services.
- NO circular listening: A→B + B→A for same data = boundary violation.
- Consumers MUST implement project's cross-message dependency-wait primitive for cross-message data dependencies — see `backend-patterns-reference.md`.

**Ordered delivery (WARN):**

- Messages requiring ordered processing MUST set project's ordered-delivery / sub-queue partition key to meaningful value (resolve concrete API from `backend-patterns-reference.md`).
- Unordered messages leave it unset / null.

**Also verify:**

- NEVER direct cross-service DB access — MUST use message bus. — why: direct DB reach couples services and bypasses ownership boundaries.
- last-sync-timestamp field on message used for conflict resolution in consumers (resolve concrete field from `backend-patterns-reference.md`).
- Inbox/Outbox pattern for reliable delivery (verify project's inbox/outbox enablement config — see `backend-patterns-reference.md`).

---

### Category 3: CQRS Compliance — Severity: BLOCKED/WARN

**Think:** Is Command+Result+Handler in one file? Is validation using fluent API (not exceptions)? Does DTO own mapping, not the handler? Are side effects in event handlers, not command handlers?

**File organization (BLOCKED):**

- Command + Result + Handler MUST be in ONE file under the command folder for the feature _(resolve concrete folder from project's structure reference / `docs/project-config.json`; e.g. `{command-folder}/{Feature}/`)_
- Query + Result + Handler MUST be in ONE file under the query folder for the feature _(resolve concrete folder from project's structure reference / `docs/project-config.json`; e.g. `{query-folder}/{Feature}/`)_

**Validation (BLOCKED):**

- MUST use project's validation-result fluent API — NEVER throw exceptions for validation; return validation result instead — verify exact type + method names in `backend-patterns-reference.md`. — why: exceptions for expected-invalid input conflate control flow with errors and skip the validation pipeline.
- Sync validation in command's validate hook, async in request-validation hook — see `backend-patterns-reference.md` for hook names.

**DTO mapping (BLOCKED):**

- DTOs MUST own entity mapping via project's DTO base mapping methods — NEVER map in command handlers; map in the DTO instead — see `backend-patterns-reference.md` for method names.

**Side effects (BLOCKED):**

- NEVER put side effects (notifications, sync, cascade updates) in command handlers — place them in Entity Event Handlers instead. — why: side effects in the handler couple the command to downstream concerns and cascade failures.
- Side effects go in Entity Event Handlers under project's event-handler folder _(resolve from project's structure reference / `docs/project-config.json`; e.g. `{event-handler-folder}/`)_
- Each handler = one independent concern (failures don't cascade).

---

### Category 4: Repository Patterns — Severity: BLOCKED

**Think:** Is this using a service-specific repo interface, not the generic one? Are complex queries extracted to RepositoryExtensions?

- MUST use project's service-specific repository abstraction — NEVER the generic root-repository base directly; per-service naming scheme defined in `backend-patterns-reference.md`. — why: the generic base leaks unbounded query surface and erases per-service boundaries.
- Complex queries MUST use project's repository-extension pattern with static expressions _(e.g. `RepositoryExtensions`)_
- All query filter/FK/sort columns MUST have database indexes.

**Violation format:**

```
BLOCKED: {filePath}:{line} uses the generic root-repository base instead of the service-specific repository — see backend-patterns-reference.md for the required naming
```

---

### Category 5: Service Pattern Era (Legacy vs Modern Split) — Severity: BLOCKED (new services) / WARN (existing)

**Think:** When project distinguishes legacy vs modern service patterns (e.g., auth scheme, telemetry stack, permission model, language-version syntax), is this a new service (must follow modern) or an existing legacy service (expect legacy patterns)? Is the modern pattern partially mixed into a legacy service without full migration?

**New services — BLOCKED if any legacy-only pattern used.** Identify project's modern-pattern checklist from injected reference docs (e.g., `project-structure-reference.md`, ADRs, scaffolding templates) and verify every item.

**Existing legacy services — WARN if modern patterns partially mixed without full migration.** Flag legacy patterns only when partial mixing creates inconsistency; in their own consistent context they are expected, NOT violations.

**Determining era:** Read project's reference docs at review time — service-pattern era assignments are project-specific and listed authoritatively there. NEVER hardcode service names in this skill. — why: hardcoded service names rot the moment the project renames or adds a service, and break portability to other repos.

---

### Category 6: Entity Event Handlers — Severity: BLOCKED/WARN

**Think:** Are side effects defined inline in command handlers (wrong) or in project's event-handler folder (correct)? Does each handler have a single concern?

**Location (BLOCKED):**

- Entity event handlers MUST be in project's event-handler folder _(resolve from project's structure reference / `docs/project-config.json`; e.g. `{event-handler-folder}/`)_
- NEVER inline side effects in command handlers — move them to a dedicated entity event handler. — why: inline side effects couple the command to downstream concerns and cascade failures.

**Implementation (BLOCKED):**

- MUST extend project's entity-event application-handler base — see `backend-patterns-reference.md`.
- MUST implement CRUD-action filter hook — see `backend-patterns-reference.md` for hook name.
- One handler = one independent concern.

**Naming (WARN):**

- Convention: `{Action}On{Trigger}EntityEventHandler`
- Grep existing examples before flagging.

**Producer patterns (BLOCKED):**

- Bus message producers MUST extend project's event-bus-message producer base — see `backend-patterns-reference.md`.
- MUST implement message-build + action-filter hooks — see `backend-patterns-reference.md` for hook names.

---

### Category 7: Service Boundaries — Severity: BLOCKED

**Think:** Does any code reach directly into another service's database or project reference? All cross-service data flow MUST go through the message bus.

- NEVER direct DB access to another service's database — route through the message bus. — why: direct DB reach couples services and bypasses ownership boundaries.
- NEVER `using` reference to another service's domain/persistence project — depend on shared message contracts instead.
- Cross-service communication via message bus only (event bus or request bus).
- Shared data through shared message projects, NOT direct references.
- Verify service-to-DB mapping from `project-structure-reference.md`.

**Violation format:**

```
BLOCKED: {filePath}:{line} references {otherService} domain/persistence directly — must use message bus
```

---

### Category 8: Frontend Architecture (if frontend files in scope) — Severity: BLOCKED/WARN

**Think:** Are components extending the right base class? Is state going through the store? Are subscriptions properly cleaned up?

Verify against `frontend-patterns-reference.md` (Phase 0, frontend files); concrete names are illustrative examples.

- Components MUST extend project's component base classes (BLOCKED) — see `frontend-patterns-reference.md`.
- State MUST use project's view-model store + reactive-effect pattern — NEVER manual signals or direct HTTP client (BLOCKED); route state through the store — see `frontend-patterns-reference.md`.
- API services MUST extend project's API-service base (BLOCKED) — see `frontend-patterns-reference.md`.
- All subscriptions MUST use project's auto-teardown operator — NEVER manual unsubscribe (BLOCKED). — why: manual unsubscribe is forgotten on early-return paths and leaks subscriptions — see `frontend-patterns-reference.md`.
- All template elements MUST carry project's CSS-naming-convention classes (WARN) — see `frontend-patterns-reference.md`.
- Logic in lowest layer: Model > Service > Component (WARN).

> **Boundary with `/review-ui`:** This category owns frontend ARCHITECTURE — base classes, view-model store / reactive-effect pattern, API-service base, subscription teardown, layer placement, CSS-naming-class presence. VISUAL/styling quality — long-content overflow, responsive multi-screen flex, flex-vs-fixed sizing, z-index discipline, SCSS/CSS detail — owned by `/review-ui`, which `/review-changes` invokes as its UI dimension when frontend changes present. Flag missing base classes / store / teardown here; defer SCSS-quality depth + visual-layout findings to review-ui to avoid double-reporting.

---

### Category 9: ADR / Recorded-Decision Conformance (if `docs/adr/**` or recorded ADRs exist) — Severity: BLOCKED/WARN

**Think:** Does any changed file contradict a binding decision recorded in an _accepted_ ADR — a rejected library/technology, a forbidden dependency direction, a recorded quality-attribute/NFR budget, a banned pattern — without a superseding ADR?

> This category closes design→review loop: `/architecture-design` emits ADRs + fitness-function choices; this category verifies changed code still conforms to them. Checks CONFORMANCE only — NEVER re-runs deep performance or security analysis (those route to siblings in the Ownership & Handoff matrix).

- Locate recorded decisions: `docs/adr/**` (or ADR location named in project's reference docs). Read only ADRs with `Status: Accepted` — skip `Superseded`/`Proposed`/`Rejected`.
- Extract each accepted ADR's binding constraints: chosen vs rejected options, layer/dependency rules, NFR targets (latency/throughput/availability/RPO-RTO), banned patterns.
- Per changed file, check conformance against those constraints — grep the diff for reintroduced rejected options or forbidden references; cite `file:line`.
- **BLOCKED** when change contradicts an accepted ADR's binding decision and no superseding ADR exists. Correct way to change a recorded decision = new superseding ADR (per `docs/adr/0001` lifecycle), NEVER a silent violation in the diff. — why: silent ADR violations erode the decision record and let rejected options creep back unreviewed.
- **WARN** when change drifts from a recorded guideline, or is NFR-impacting against a recorded budget — flag it and route depth check to `performance-review`/`security-review`.
- No ADRs exist → record "No recorded ADRs — conformance N/A" and skip (this category NEVER blocks a project that has chosen not to keep ADRs).

**Violation format:**

```
BLOCKED: {filePath}:{line} contradicts {adr-id} ("{decision}") with no superseding ADR
```

---

### Category 10: Spec-Loop Discipline (applies across all categories) — Severity: BLOCKED/WARN

**Think:** Does each behavior-affecting architecture finding feed BOTH the spec and a guarding test, or only the code? Does any [HARD] rule or cross-boundary invariant ship with no property TC?

- BLOCKED when a `[HARD]` architecture rule or cross-boundary invariant (layer contract, message-ownership rule, CQRS/repo invariant, service-boundary guarantee) has **no universally-quantified property TC + boundary counter-case** — an example-only test does not guard a rule that must hold for ALL inputs.
- Every behavior-affecting architecture finding MUST carry a **Dual-Feedback row** (spec axis + test axis): the spec NAMES the changed contract/invariant AND a test GUARDS it — blank either axis = INCOMPLETE; NEVER record an architecture finding as code-only.
- Review the whole package — spec + tests + structural diff — NOT the structural diff alone; loop until zero new spec-loop gaps remain, each cycle enriching the spec. — why: a boundary change that compiles but is never asserted regresses silently the next time a sibling service is touched.

**Violation format:**

```
BLOCKED: {filePath}:{line} [HARD] {rule/invariant} has no property TC (spec axis: {present/blank} | test axis: {present/blank})
```

---

## Phase 4: Finalize — Architecture Compliance Report

Update report with final sections:

### Verdict Scoring

| Verdict     | Condition                                       |
| ----------- | ----------------------------------------------- |
| **BLOCKED** | 1+ BLOCKED findings — must fix before merge     |
| **WARN**    | 0 BLOCKED, 1+ WARN findings — review and decide |
| **PASS**    | 0 BLOCKED, 0 WARN — architecture compliant      |

### Report Structure

```markdown
# Architecture Review Report — {date}

## Scope

- Files reviewed: {count}
- Services affected: {list}
- Blast radius: {summary from Phase 2}

## Verdict: {PASS | WARN | BLOCKED}

## BLOCKED Findings (Must Fix)

### {Category}: {description}

- **File:** {path}:{line}
- **Rule:** {rule from project doc}
- **Evidence:** {what was found}
- **Fix:** {what to change}

## WARN Findings (Review)

### {Category}: {description}

- **File:** {path}:{line}
- **Rule:** {rule from project doc}
- **Evidence:** {what was found}
- **Recommendation:** {suggested action}

## PASS Categories

- {list of categories that passed with no findings}

## Architecture Health Summary

- Quality Tooling Baseline: {PASS/WARN/BLOCKED}
- Clean Architecture: {PASS/WARN/BLOCKED}
- Messaging Patterns: {PASS/WARN/BLOCKED}
- CQRS Compliance: {PASS/WARN/BLOCKED}
- Repository Patterns: {PASS/WARN/BLOCKED}
- Service Pattern Era: {PASS/WARN/BLOCKED}
- Entity Event Handlers: {PASS/WARN/BLOCKED}
- Service Boundaries: {PASS/WARN/BLOCKED}
- Frontend Architecture: {PASS/WARN/BLOCKED/N/A}
- ADR / Recorded-Decision Conformance: {PASS/WARN/BLOCKED/N/A}
- Spec-Loop Discipline (property-TC + dual-feedback): {PASS/WARN/BLOCKED}
```

---

## Architecture Boundary Check (Automated)

Per changed file:

1. Read `docs/project-config.json` → `architectureRules.layerBoundaries`
2. Determine layer — match file path against each rule's `paths` glob patterns
3. Scan imports — grep for configured language's import/include statements
4. Check violations — import path contains layer name in `cannotImportFrom` = violation
5. Exclude framework — skip files matching `architectureRules.excludePatterns`
6. BLOCK on violation: `"BLOCKED: {layer} layer file {filePath} imports from {forbiddenLayer} layer ({importStatement})"`

`architectureRules` absent from project-config.json → skip silently.

---

## Systematic Review Protocol (10+ changed files)

1. **Categorize** — Group files by service/layer/concern.
2. **Parallel Sub-Agents** — Launch one `architect` sub-agent per category with architecture-specific checklist.
3. **Synchronize** — Collect findings, cross-reference service boundaries.
4. **Consolidate** — Single holistic report with per-category verdicts.

---

## Phase 5: Why-Review Self-Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff. Catches over-flagged Highs, false positives, severity inflation at source rather than letting them propagate downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `plans/reports/{skill}-{date}-{slug}.md`
2. Invoke `/why-review` skill with arg: `validate findings in plans/reports/{skill}-{date}-{slug}.md — verify each finding has file:line proof, steel-man each rejected interpretation, and stress-test severity classifications`
3. Read validation verdict path returned by why-review, expected as `plans/reports/why-review-validate-{date}.md`
4. **why-review demotes/removes any finding →** UPDATE own finalized report with revised severities, remove false positives, add `## Why-Review Validation Notes` section citing what changed + why.
5. **why-review confirms all findings →** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."

**Skip conditions (record explicit reason if skipping):**

- Verdict unconditional PASS with zero findings → log "Skipped — no findings to validate".
- Why-review skill itself is active context (avoid recursion).

**Why this exists:** AI sub-agent reports inherit confirmation bias — orchestrator absorbs severity claims as ground truth. The 2026-05-09 review incident produced 5 Highs; adversarial validation demoted 3 of them. Codify as standard practice.

---

## Next Steps

**MANDATORY — NO EXCEPTIONS:** After completing, use `AskUserQuestion` to present:

- **"/code-simplifier" (Recommended)** — Simplify and refine code
- **"/code-review"** — Deep code quality review
- **"Skip, continue manually"** — user decides

## AI Agent Integrity Gate (NON-NEGOTIABLE)

Before reporting ANY work done:

1. **Grep every removed name.** Extraction/rename/delete → grep confirms 0 dangling refs across ALL file types.
2. **Ask WHY before changing.** Existing values intentional until proven otherwise — NEVER "fix" without traced rationale.
3. **Verify ALL outputs.** One build passing ≠ all builds passing — check every affected stack.
4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
5. **New artifact = wired artifact.** Created something? Prove registered, imported, reachable by all consumers.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. Simple tasks: ask user whether to skip.

<!-- OVERRIDE:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `/feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle, or when the user/workflow explicitly requests an independent high-risk architecture synthesis pass. A review pass that finds issues triggers validation first; it does NOT trigger a fresh-context pass over the same findings before validation/fix.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn a NEW `Agent` tool call — use `architect` subagent_type for architecture reviews (see Sub-Agent Type Override above)
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns a NEW `Agent` call
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - NEVER skip the full review restart after a validated fix cycle — every fix invalidates the prior verdict
> - Continue until a complete full review pass has zero findings; if the same blocker repeats across 3 full invocations with no progress, escalate via `AskUserQuestion`
> - Track iteration count in conversation context (session-scoped, no persistent files)

<!-- /OVERRIDE:fresh-context-review -->

## Sub-Agent Type Override

> **MANDATORY:** Architecture reviews spawn `architect` sub-agent, NOT `code-reviewer`.
> Keep `subagent_type: "architect"` from canonical template below; NEVER revert to `code-reviewer`.
> **Rationale:** `architect` carries cross-service impact analysis, ADR creation, multi-service security/performance context that `code-reviewer` lacks for architecture-level decisions.

<!-- OVERRIDE:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM. The template below has ALL 11 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 11 protocol bodies pre-embedded.

### Subagent Type Selection

- `architect` — ALWAYS for architecture reviews (cross-service, ADR, security/performance at system level)
- `code-reviewer` — for code quality reviews only (NOT architecture)

### Canonical Agent Call Template (Copy Verbatim)

```
Agent({
  description: "Fresh Round {N} review",
  subagent_type: "architect",
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
- DO choose `architect` subagent_type for architecture reviews — do NOT revert to `code-reviewer` (see Sub-Agent Type Override above)
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /OVERRIDE:review-protocol-injection -->

> **Critical Purpose:** Architecture compliance — no layer violations, no messaging anti-patterns, no service boundary breaches, no pattern drift.

> **External Memory:** Complex/lengthy work → write findings to `plans/reports/`. Prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY — every finding requires `file:line` proof + confidence percentage (>80% act, <80% verify first).

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

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

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

<!-- SYNC:sub-agent-selection -->

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** Route specialized domains (architecture, security, performance, DB, E2E, integration-test, git) to the matching specialist agent (see guide above) — NEVER use `code-reviewer` for these. — why: `code-reviewer` lacks each domain's checklist, so specialized issues slip through.

<!-- /SYNC:sub-agent-selection -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

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

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → trace → verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

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

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

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

**IMPORTANT MUST ATTENTION Goal:** Ensure changes preserve architecture boundaries, ownership, message flow, and generated artifact integrity before handoff — validating changed code against layers, service boundaries, message flow, CQRS, repositories, entity events, frontend architecture, generated artifacts, recorded architecture decisions (ADRs), and quality tooling.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Graph-Assisted Investigation:** Run one graph command on key files when graph.db exists.
- **Nested Task Creation:** Child skill expands visible phase tasks; link parent when nested.
- **Project Reference Docs Guide:** Read required project-reference docs before target work; `lessons.md` always.
- **Task Tracking External Report:** Bootstrap tasks; persist plan/review findings to `plans/reports/` incrementally.
- **Critical Thinking Mindset:** Traced proof per claim, confidence >80%; NEVER present guess as fact.
- **Sequential Thinking Protocol:** Multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS markers and confidence closer.
- **Evidence-Based Reasoning:** Cite `file:line` for every claim; <60% confidence = do NOT recommend.
- **Double-Round-Trip Review:** Validate findings, fix, full re-review until a clean pass.
- **Sub-Agent Selection:** Route specialized domains to the matching specialist agent, NEVER `code-reviewer`.
- **Source/Test Drift Check:** Source behavior changes → inspect affected tests; decide fix vs update.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Systematic Review Batching:** Large changeset → size-capped parallel batches, then reduce; NEVER one-by-one.
- **Severity Rubric:** Classify by consequence Critical/High/Medium/Low; Critical/High block PASS.
- **Category Review Thinking:** Derive each category's concerns from first principles with evidence, NEVER a checklist.

**IMPORTANT MUST ATTENTION** read project architecture docs in Phase 0 BEFORE reviewing — every rule and base-class/symbol name comes from `backend-patterns-reference.md` / `project-structure-reference.md` / `frontend-patterns-reference.md` / `code-review-rules.md`, NEVER general knowledge — why: hardcoded framework names rot on rename and break portability to other repos.
**IMPORTANT MUST ATTENTION** every violation requires `file:line` proof + confidence >80% (60-80% verify first, <60% do NOT recommend); grep 3+ existing counterexamples before flagging — codebase convention wins. NEVER speculate — instead state "Insufficient evidence. Verified: [...]. Not verified: [...]."
**IMPORTANT MUST ATTENTION** review serially, one category at a time (Cat 0 tooling baseline → Cat 10 spec-loop): doc rule → source evidence → `Think:` derivation → PASS/WARN/BLOCKED. NEVER scan categories simultaneously — why: parallel scanning collapses per-category evidence and drops findings.
**IMPORTANT MUST ATTENTION** break work into small tasks using `TaskCreate` BEFORE starting; mark one `in_progress`/`completed` at a time; on context loss call `TaskList` first — why: resume existing tasks, never duplicate after compaction.
**IMPORTANT MUST ATTENTION** stay in lane — deep-review only what this skill OWNS (layers, messaging/CQRS/repos/service boundaries, entity events, frontend architecture, quality tooling, generated artifacts, ADRs); record a one-line `→ route to {sibling}` pointer for security/performance/DDD/UI/integration-test findings instead of expanding them — why: duplicated findings across reviewers inflate severity counts and bury issues each reviewer uniquely owns.
**IMPORTANT MUST ATTENTION** framework symbols/base-class/directory names in Categories 2–8 are illustrative examples only — map each to the repository's actual convention as named in its own Phase 0 reference docs; flag deviations from the project's REAL convention, NEVER from these literal names.
**IMPORTANT MUST ATTENTION** scope tooling/ADR/spec-loop severity to the change — a pre-existing gap unrelated to the diff is WARN with one note, reserve BLOCKED for a new stack/service with no gate, a change removing an existing gate, an accepted-ADR contradiction with no superseding ADR, or a `[HARD]` rule/invariant with no property TC — why: blocking on standing change-unrelated conditions buries the regression the diff actually introduced.
**IMPORTANT MUST ATTENTION** review the WHOLE package (spec + tests + structural diff), not the diff alone — every behavior-affecting architecture finding carries a Dual-Feedback row (spec NAMES the contract/invariant AND a test GUARDS it); blank either axis = INCOMPLETE — why: a boundary change that compiles but is never asserted regresses silently when a sibling service is next touched.
**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when `.code-graph/graph.db` exists (grep → `trace --direction both` → verify) — why: trace reveals cross-service blast radius grep alone cannot.
**IMPORTANT MUST ATTENTION** evaluate pattern fit before flagging — copying-nearby ≠ matching preconditions; verify same scope, lifetime, base class, constraints, established-exception status before calling a deviation a violation.
**IMPORTANT MUST ATTENTION** review is read-only until validated — NEVER fix code in this skill; after ANY finding run the Phase 5 `/why-review --validate-findings` self-validation gate BEFORE handoff, and every validated fix restarts a full review from Phase 0 with a fresh task breakdown — why: AI reports inherit confirmation bias; adversarial validation demotes false-positive Highs at the source.
**IMPORTANT MUST ATTENTION** write findings to `plans/reports/arch-review-{date}-{slug}.md` incrementally and synthesize from disk; use `AskUserQuestion` to present next steps (`/code-simplifier` / `/code-review` / skip) after completing review — why: long reviews exhaust context before a final batch write, losing findings.

**Anti-Rationalization:**

| Evasion                                                  | Rebuttal                                                                                                       |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| "Too simple for architecture review"                     | Simple code hides layer violations. Apply all phases.                                                          |
| "Already read the docs"                                  | Show the extracted `file:line` rule — no recall = no read.                                                     |
| "I know this framework's base classes"                   | Resolve from Phase 0 reference docs — literal names are illustrative; the project's convention wins.           |
| "Just flag obvious violations"                           | Gray areas matter most. Apply `Think:` to every applicable category.                                           |
| "Found a violation, I'll just fix it"                    | Read-only skill. Validate via `/why-review` first, then route the fix; every fix restarts review from Phase 0. |
| "This finding is clearly someone else's domain, skip it" | Record a one-line `→ route to {sibling}` pointer — surfacing the route is owned here; expanding it is not.     |
| "Graph not needed here"                                  | Run ONE trace. 5 seconds → full blast radius revealed.                                                         |
| "Skill reviews only changed files"                       | Default scope, not a limit. User can override.                                                                 |

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.
