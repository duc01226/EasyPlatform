# `$domain-analysis --mode=review` — domain entity and value-object DDD quality review reference

> Read this complete contract when `$domain-analysis --mode=review [changes | scan [<module>]] [--report-only]` is selected. It replaces default business analysis with evidence-based A–P/E2 review, finding validation, and the severity-gated fix/re-review loop. `--report-only` returns validated findings without fixes. Read `entity-quality.md` for the shared quality criteria; use `ddd-reference.md` sections only for additional modeling decisions.

## Quick Summary

**Goal:** Review entity/VO design against discovered project conventions so invariants and aggregate boundaries remain safe.

**Summary:** Discover conventions/scope/paradigm → search/report → A–P/E2 → holistic fit/fresh-context gate → final report/score → validate/fix/full restart → standalone Next Steps. Adapt to each aggregate's paradigm/subdomain; persist evidence per file. `--report-only` returns after validation and leaves fixes to its caller.

**Workflow:** Execute Phases 0–5 in order; restart the full review after validated blocking fixes. Offer Next Steps only after standalone closure; `--report-only` stops after validation.

**Key Rules:** Discover conventions first; require `file:line` at >80% confidence; validate before fixes and fully re-review afterward. Round 1: zero open findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred. Failed binary gates always block. Persist findings per file, never batch.

| Severity | Consequence |
| --- | --- |
| CRITICAL | Silent runtime failure, corruption or validation bypass; blocks merge |
| HIGH | Incorrect behavior, invariant gap or architectural violation; must fix |
| MEDIUM | Design debt, maintainability or likely future bug; should fix |
| LOW | Convention, documentation or minor clarity |

## Contents

- [Quick Summary](#quick-summary)
- [Report-Only Mode (`--report-only`)](#report-only-mode---report-only)
- [Canonical Owner — Domain Entity Change Gate](#canonical-owner--domain-entity-change-gate)
- [First Principle — Easy to Change · Easy to Scale · Easy to Maintain](#first-principle--easy-to-change--easy-to-scale--easy-to-maintain)
- [Phase 0: Project Discovery + Mode Detection + Blast Radius](#phase-0-project-discovery--mode-detection--blast-radius)
- [Phase 1: Collect Files + Grep Patterns + Create Report](#phase-1-collect-files--grep-patterns--create-report)
- [Phase 2: Entity-by-Entity DDD Review](#phase-2-entity-by-entity-ddd-review)
- [Phase 3: Holistic Synthesis + Fresh-Context Gate](#phase-3-holistic-synthesis--fresh-context-gate)
- [Phase 4: Final Report Generation](#phase-4-final-report-generation)
- [Universal DDD Quick Reference](#universal-ddd-quick-reference)
- [Systematic Review Strategy](#systematic-review-strategy)
- [Output Summary Format](#output-summary-format)
- [Phase 5: Why-Review Self-Validation Gate (MANDATORY when findings exist)](#phase-5-why-review-self-validation-gate-mandatory-when-findings-exist)
- [Next Steps](#next-steps)
- [Mode Detection](#mode-detection)
- [Mode protocols](#mode-protocols)
- [Closing Reminders](#closing-reminders)

## Report-Only Mode (`--report-only`)

> **Use when** a caller runs this mode as a read-only leaf — e.g. a workflow specialist parallel batch, a delegated domain-entity gate, or a review batch — and another step owns every fix. `--report-only` in `$ARGUMENTS` is an execution flag, not a scope (`changes`/`scan` still resolve per [Mode Detection](#mode-detection)); review-only is the default; standalone `--fix-loop` alone runs repair/restart phases.
>
> **MANDATORY — when `--report-only` is passed, read `.claude/skills/workflow-review-changes/references/caller-mode.md` § `--report-only` in full FIRST.** It holds the rules every read-only leaf shares (no fix or restart, scope from the caller's brief, no nested fan-out, no user questions, write only the report, return contract); the rules below are this skill's own.
>
> 1. **Run Phases 0–4, then the Phase 5 Why-Review Self-Validation Gate only.** Phase 5 `$why-review --validate-findings` still validates every finding. The Phase 5 fix and full-review restart, the Phase 3 fresh-context `code-reviewer` spawn, and the Next Steps `ask user question tool` do not run: return the validated report; the caller owns fixes and any re-review. Contradictory Phase 2 evidence that would have triggered a fresh read is recorded under `Unresolved Questions` as `NOT VERIFIABLE`. — why: two writers of one artifact inside a barrier race each other.
> 2. **Default scope.** Use the files, diff or module the brief names (else default `changes`); trace affected models and write/load/event paths under Mode Detection. Record selected changes and implicated dependencies without expanding into an unrelated repository audit.
> 3. **No nested fan-out.** Skip the Systematic Review Strategy's delegated assignments; review files sequentially in this context, still appending findings per file and respecting working-set bounds.
> 4. **Return** the report path, the health score, validated findings grouped Critical/High/Medium/Low per the mapping below, every unconfirmed material trade-off (the `SYNC:trade-off-interrogation-gate` non-asking handoff), and the next-step recommendations the Next Steps prompt would have offered.
>
> **Severity mapping.** This mode's native tiers are the shared `SYNC:severity-rubric` tiers, so they map 1:1: CRITICAL→Critical · HIGH→High · MEDIUM→Medium · LOW→Low, each still classified by consequence. The health score is an evidence input, never a tier; `Positive Observations`, informational notes, and `Unresolved Questions` are not findings; a finding without the evidence to choose a tier is `NOT VERIFIABLE` — it stays open, never Low.
>
> For this mode the declared step order ends at the Phase 5 validation gate; stopping there is the mode's contract, not a skipped step.


## Canonical Owner — Domain Entity Change Gate

> `$domain-analysis --mode=review` is the **canonical owner** of `SYNC:domain-entity-change-gate`. Planning, implementation and change-review entrypoints carry the compact gate and route here for a full review, so a design planned under the gate is reviewed under the same rules. Read `entity-quality.md` when this mode reviews entity work; it owns the shared decisions and detailed criteria. The gate's 6 decision points map to this skill as: classification → **A** · invariant ownership + failure signalling → **E/M** · aggregate boundary + concurrency → **F/P** · construction vs reconstitution → **N** · events → **H/O** · test obligation → **E2**; paradigm detection is **0.4** and subdomain fit is **3.1**.
>
> Do NOT apply the gate as a separate pass when running this mode — Phase 2 A–P **is** the gate, in full. Record `Gate is this skill's own body — A–P checklist owns it.` — why: a second pass over the same rules duplicates findings and inflates severity counts.
>
> Change detailed quality criteria in `entity-quality.md`. Change shared trigger/phase/exit rules in `.claude/skills/shared/sync-inline-versions.md` first, then propagate and rebuild its projections. Keep this index aligned; never edit generated copies.


## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles` (full body in the protocol section of this file); its closing digest ends this file.


## Phase 0: Project Discovery + Mode Detection + Blast Radius

> **MANDATORY FIRST STEP.** Phase 0 gates all other work — wrong base classes = wrong checklist.

Create tasks for Phases 0–5 and final lessons review before any work. Set Phase 0 in progress; complete phases immediately with evidence.

### 0.1 Discover Project Stack and Entity Conventions

Read `CLAUDE.md` and discovered entity/backend/code-review references under the configured reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides). Locate build/runtime markers, entity/VO bases and persistence annotations in configured source roots. If docs are absent, infer conventions from fitting existing entities; seek 3+ when available and record scarcity. Use `none`/N/A for absent bases, ORM or framework mechanisms; never invent requirements.

**Record in report (required before Phase 2):**

| Convention | Discovered Value |
| --- | --- |
| Entity base class(es) | `{class names with file:line}` |
| VO base class(es) | `{class names with file:line}` |
| Validation API | `{how validation done}` |
| Domain exception type | `{exception class used}` |
| Navigation/FK pattern | `{annotation + FK property pattern}` |
| Persistence annotations | `{ORM annotations}` |
| Failure-signalling convention | `{throws domain exception \| returns Result/Either \| mixed}` |
| Concurrency mechanism | `{version/rowversion/etag field on roots, or none}` |
| Modelling paradigm | `{OO-mutable \| type-driven/immutable \| event-sourced}` (0.4) |

If project reference docs exist → read them and extract: service-specific base class requirements, documented anti-patterns, naming conventions, cross-service rules.

### 0.2 Determine Entity File Scope

Resolve the caller's selected changes/module through Mode Detection. Include affected models even when their definitions are unchanged; record the write/load/event path connecting each to the selected change. Empty entity filename results alone never prove irrelevance.

### 0.3 Blast Radius Analysis

For high-risk blast radius, an existing `.code-graph/graph.db` can supplement grep/read tracing; verify its possibly stale hints in source. Use the framework's discovered graph command, adapted to the host.

Record: entity file count, downstream consumers, risk level. Use to prioritize review order (highest-impact first).

### 0.4 Modelling Paradigm Detection (— gates which per-file rules apply)

Detect per affected aggregate from source: OO-mutable, immutable/type-driven, event-sourced, or another evidenced model. Read `entity-quality.md` → Applicability before selecting criteria. Adapt encapsulation, mutation and reconstitution checks to that model; no mandatory class/base/setter/union shape. Record fit and N/A evidence before Phase 2. When tactical DDD does not fit, review actual invariants under the project's architecture.

## Phase 1: Collect Files + Grep Patterns + Create Report

**Create report FIRST:** `tmp/reports/domain-entities-review-{date}-{slug}.md`

Initialize with: Mode, Tech Stack, Discovered Conventions, Blast Radius Summary.

### Mandatory Search Intent

run high-signal searches BEFORE reading individual files. Derive the actual roots, file globs, framework markers, and naming conventions from `docs/project-config.json` plus the repository's project-reference docs. Do not copy a source-root, extension, framework type, or folder name from this skill as if it were canonical.

Search for these intent categories with the configured source roots and discovered stack syntax:

- Validation methods that hide or bypass the base/domain validation path.
- Relationship/navigation fields that can serialize recursively or expose internal graph structure.
- Value objects with mutable public state or missing structural equality.
- Domain methods throwing low-context generic errors instead of configured domain/validation errors.
- Business conditionals and entity mutation leaking into a higher layer when the entity/value object owns the invariant.
- Duplicated queries/rules whose documented owner differs from their actual callers; keep query construction at the project-appropriate boundary.
- Entity classes missing identity markers required by the configured persistence framework.
- Domain models performing direct persistence, network, or infrastructure work.

Build stack-specific `rg` searches from those intents; configured roots, syntax and markers determine the commands.

Write ALL grep results to report IMMEDIATELY.

### Categorize Files

| Category | Definition |
| --- | --- |
| Aggregate Root | Entry point owning an atomic consistency boundary; repository optional |
| Entity | Has identity; accessed/persisted through root |
| Value Object | Structural equality; must be immutable |
| Unknown | Establish domain meaning before applying entity criteria; DTO/config shapes may be N/A |


## Phase 2: Entity-by-Entity DDD Review

Read [entity-quality.md](entity-quality.md) when this phase applies. It is the single owner of the decisions, quality dimensions and completion gate used by planning, implementation and review. For each scoped model, inspect relevant callers/write/load paths and append evidence immediately. The A–P/E2 index below routes to its named dimensions; it adds no second checklist or automatic severity floor.

### Per-File Review Checklist

#### A. Entity vs Value Object Classification

Apply **Identity and equality** in `entity-quality.md`.

#### B. Base Class Compliance

Apply **Persistence and dependencies; reuse required bases only when the project establishes them** in `entity-quality.md`.

#### C. Value Object Immutability and Equality

Apply **Encapsulation and values; Identity and equality** in `entity-quality.md`.

#### D. Encapsulation and Anemic Domain Model

Apply **Behavior and failure atomicity; Encapsulation and values; assess subdomain fit first** in `entity-quality.md`.

#### E. Domain Invariants

Apply **Invariant ownership** in `entity-quality.md`.

#### E2. Spec-Loop Discipline — Invariant → Property-TC Mapping

Apply **Tests and specification; Proof and completion gate** in `entity-quality.md`.

#### F. Aggregate Design

Apply **Aggregate boundaries** in `entity-quality.md`.

#### G. Navigation / Relationship Properties

Apply **Aggregate boundaries; Persistence and dependencies; prevent unsafe serialization and unloaded-navigation access where reachable** in `entity-quality.md`.

#### H. Domain Events

Apply **Domain and integration events** in `entity-quality.md`.

#### I. Static Query Expressions

Apply **Scale and change safety; Persistence and dependencies; no mandatory entity-owned query syntax** in `entity-quality.md`.

#### J. Naming and Ubiquitous Language

Apply **Language and context** in `entity-quality.md`.

#### K. Code Smells

Apply **Language and context; Scale and change safety; a smell needs a demonstrated consequence, not a size threshold** in `entity-quality.md`.

#### L. OOP Principles

Apply **Language and context; Persistence and dependencies; apply OO principles only to OO boundaries** in `entity-quality.md`.

#### M. Invariant vs Validation Ownership + Failure Signalling

Apply **Invariant ownership; Behavior and failure atomicity** in `entity-quality.md`.

#### N. Construction vs Reconstitution

Apply **Construction and reconstitution; Lifecycle and deletion** in `entity-quality.md`.

#### O. Event Dispatch Timing + Contract Boundary

Apply **Domain and integration events; pre-commit internal handlers can be intentional** in `entity-quality.md`.

#### P. Aggregate Concurrency + Transaction Boundary

Apply **Concurrency and retries; Aggregate boundaries** in `entity-quality.md`.

## Phase 3: Holistic Synthesis + Fresh-Context Gate

After all Phase 2 files are reviewed, synthesize cross-entity DDD concerns in the current report. Do not spawn a fresh sub-agent only because findings exist. Findings must go through the why-review validation gate before any fix.

### 3.1 Model-Level Dimensions (— judged over affected relationships)

Review **Language and context**, **Aggregate boundaries**, and **Scale and change safety** in `entity-quality.md` across the affected models. Trace shared owners and divergent rules before recommending consolidation or separation. Consumer-specific rules leaking into generic infrastructure need a concrete coupling consequence. Preserve legitimately separate models and accepted shared kernels.

Judge subdomain fit before anemia findings: simple CRUD or functional rule owners can be correct; complex rules scattered across bypassable consumers require one authoritative owner. Core/supporting/generic labels guide investigation, not mandatory rich models or buy-versus-build verdicts. Record fit evidence and the effect on the next change.

Spawn a fresh `code-reviewer` sub-agent only when one of these conditions is true (never under `--report-only` — see [Report-Only Mode](#report-only-mode---report-only)):

- A validated-finding fix cycle has already changed the entity review target and this is the full re-review restart.
- The user/workflow explicitly requests an independent high-risk synthesis pass for broad entity-model changes.
- Phase 2 produced contradictory evidence that cannot be resolved in the current session without an independent read.

When triggered, dispatch a fresh `code-reviewer` with zero prior-round memory. Build the brief from Phase 0 conventions/reference paths and Phase 1 target files; require its own complete reads of this mode, applicable DDD-reference sections and the targets.

The brief must contain the complete `SYNC:review-protocol-injection` template (all 11 full bodies, verbatim from `.claude/skills/shared/sync-inline-versions.md`); pointers/digests do not substitute for injected bodies.

Assign holistic model coherence, classification, aggregate boundaries, navigation/serialization, language, cross-context translation, paradigm/subdomain fit, concurrency and set-based invariants. Include null-safe computed/navigation paths, empty/zero/negative boundaries, failure signalling and root-only mutation. Apply A–P/E2 and discovered conventions; trace cause to the invariant owner before suggesting a fix. Optional graph hints require source verification.

Require **PASS/FAIL, severity-grouped evidence, cross-cutting concerns, aggregate coherence and refactoring priorities** in `tmp/reports/domain-entities-rerun{N}-{date}.md`; return path/status. Infer conventions from 3+ entities when references are absent. No finding without `file:line`; >80% report, 60–80% verify, <60% withhold. Judge anemia against subdomain fit; do not overrule local patterns.

After sub-agent returns:

1. Read the sub-agent report
2. Integrate as `## Re-Review {N} Findings` in main report — NEVER filter or override
3. If findings remain: validate the new finding set before any additional fixes
4. Repeat only after another validated-finding fix cycle; if the same blocker repeats across 2 full invocations with no progress, escalate via `ask user question tool`
5. Final verdict MUST incorporate every review pass that actually ran


## Phase 4: Final Report Generation

Write the report with these sections:

- **Metadata:** mode, stack, entity/VO bases, scope, date, entity count and blast radius/downstream consumers (graph hint optional).
- **Health Score:** 100 - (CRITICAL×25 + HIGH×10 + MEDIUM×3 + LOW×1), min 0. Score is evidence, not severity.
- **Critical / High / Medium / Low:** each finding includes description, `file:line`, consequence and fix. Keep informational notes separate.
- **Re-Review Findings:** integrate every fresh pass without filtering.
- **Positive Observations:** evidence-backed strengths.
- **Refactoring Priority:** targets and reasons, highest impact first.
- **Repository-Specific Rules Applied:** rule and evidence.
- **Unresolved Questions:** question, owner and next step.

## Universal DDD Quick Reference

### Entity vs Value Object / Aggregate Boundary (reused from `domain-analysis`)

> Modeling primers live once in `references/ddd-reference.md`; read only the relevant section for strategic or persistence alternatives. Tactical quality criteria live in `entity-quality.md`, shared by planning, implementation and this review. Identity and consistency semantics decide entity/root classification, not storage shape.

### Invariant Enforcement Decision Table

Read `entity-quality.md` → **Invariant ownership**, **Behavior and failure atomicity**, and **Concurrency and retries** when judging enforcement. Use the documented owner and actual transaction mechanism; keep untrusted-input validation at its boundary.

### Invariant vs Validation Decision Table

State the rule and its scope. Input-shape validation and domain invariants may overlap; a user-caused rejection can be correct behavior. Reject invalid state at the authoritative owner using the project's failure convention, with no partial mutation.

### Paradigm Adaptation Table (from Phase 0.4)

Mutable models guard mutation, immutable models return valid replacements, event-sourced models validate commands and replay facts without external side effects. Choose the actual model; no required setter, union, inheritance or ORM shape.

### Code Smell Signals

Read `entity-quality.md` → **Quality dimensions** when a smell suggests a risk. Size, field counts, method presence and missing patterns are investigation cues, not defects without consequences.

### Related decisions

Read `entity-quality.md` → **Feedforward and execution** when checking plan-to-code consistency; preserve settled decisions and identify missing proof.

## Systematic Review Strategy

> Follow `SYNC:systematic-review-batching` to choose from risk, related flows, working-set fit and delegation cost; file counts are planning cues. Not run under `--report-only` — that mode reviews sequentially in this context.

1. Record the chosen scope/approach, reason, fit and coverage before source reads.
2. Group related module/aggregate/type flows and preserve cross-group links.
3. Review inline or in bounded sequential assignments; use authorized fresh parallel `code-reviewer` assignments when independent flows or necessary depth justify delegation.
4. Each reviewer: Phase 2 checklist + discovered project-specific rules → write to `tmp/reports/domain-entities-{group}-round1-{date}.md`
5. Main agent consolidates: cross-aggregate violations, naming consistency, model coherence


## Output Summary Format

Return the health score, findings grouped by severity with `file:line` and fix, positive observations, unresolved questions, and report path. Include every pass and deferred item.

## Phase 5: Why-Review Self-Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff. Catches over-flagged Highs, false positives, and severity inflation at the source rather than letting them propagate downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY under the skip conditions below (an unconditional zero-finding PASS, the recursion guard, or a caller-owned validation).

**Protocol:**

1. Read own finalized report from `tmp/reports/domain-entities-review-{date}-{slug}.md`
2. Invoke `$why-review` skill with arg: `validate findings in tmp/reports/domain-entities-review-{date}-{slug}.md — verify each finding has file:line proof, steel-man each rejected interpretation, and stress-test severity classifications`
3. Read the validation verdict path returned by why-review, expected as `tmp/reports/why-review-validate-{date}.md`
4. **If why-review demotes/removes any finding:** UPDATE own finalized report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings → log "Skipped — no findings to validate"
- Why-review skill itself is the active context (avoid recursion)
- Called with `--loop-owner=caller` → log "Skipped — the caller validates the merged report once" (`$start-workflow` → Workflow-step mode)



## Next Steps

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`$start-workflow` → Step Execution Protocol, Workflow-step mode).

when standalone, use `ask user question tool` after completing to present:

- **`$fix` (Recommended if FAIL)** — Fix validated findings that block the current round (Round 1: all severities; Round 2: CRITICAL/HIGH/MEDIUM; LOW-only is deferred)
- **`$scan --target=domain-entities`** — Update domain-entities-reference.md (scan mode)
- **`$integration-test`** — Add integration tests for newly-enforced invariants
- **`$docs-manager --mode=update`** — Update feature docs if entity contracts changed
- **"Skip, continue manually"** — user decides

**Exempt** under `--report-only`, when a parent skill or workflow invoked this review, or when running as a sub-agent: do NOT ask — return these next-step recommendations in the returned summary and let the caller decide; the caller's fix step owns any fix. — why: `ask user question tool` cannot reach the user from a sub-agent, and a leaf that waits on a prompt stalls its parent's all-return barrier.




## Mode Detection

**Determine the review scope BEFORE any other work** (the invocation already selected `--mode=review`; `--report-only` composes with any scope):

| Invocation | Scope | Files |
| --- | --- | --- |
| `$domain-analysis --mode=review` (default) | **changes** | Worktree changes and implicated models/write/load/event paths |
| `$domain-analysis --mode=review changes` | **changes** | Selected diff and implicated models/write/load/event paths |
| `$domain-analysis --mode=review scan` | **scan** | All discovered models and relevant write/load/event paths |
| `$domain-analysis --mode=review scan <module>` | **scan-service** | Named module's models and relevant paths; trace external contracts as dependencies |

**Semantic scope detection — adapt to discovered stack:**

Honor an explicit caller range/file set. For standalone worktree changes, include tracked edits and relevant new/untracked files; use the following discovery commands (deleted/renamed owners require the selected base for comparison):

```bash
git diff --name-only HEAD
git ls-files --others --exclude-standard
rg --files {configured-source-roots}
```

Use discovered naming conventions as locators, not inclusion/exclusion rules. Inspect changed behavior and trace handlers, imports, jobs, adapters, loads and events to the actual entity/VO/aggregate or invariant owner, including unchanged definitions. Bound inspection to the selected changes/module and dependencies needed to assess their effects; never hardcode source roots, extensions or domain folders.

After tracing, no semantic domain surface → record `No domain-entity surface — gate N/A` with inspected paths and reason. Unresolved relevance or inaccessible required paths → `NOT VERIFIABLE` with the missing evidence; never report clean from an empty filename match.


## Mode protocols

> Full protocol bodies carried by this mode (canonical text: `.claude/skills/shared/sync-inline-versions.md`).

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
> - **Boundary naming:** When the category exposes public or cross-layer types, APIs, events, or modules, verify that names describe the capability, domain purpose, or contract rather than the current provider/framework/transport; concrete adapters may carry those details. Check callers and implementations before flagging a name, and treat generic names (`Manager`, `Helper`, `Utils`, `Data`) as signals rather than automatic violations.
> - **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
> - **Documentation:** Do related docs, specs, or READMEs reflect the changes?
>
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a todo tracking sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
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

<!-- SYNC:core-engineering-principles -->

> **Core Engineering Principles — Easy to Change · Easy to Scale · Easy to Maintain** — The success metric of every plan, implementation and review is _future change cost_: the next change must be cheap, safe and provable. DRY, reuse, abstraction, interfaces, wrappers, patterns, layering, tests and the harness exist only to serve that goal. Apply this gate BEFORE any narrower design rule or checklist; when a narrower design rule would raise change cost, this principle wins — it never waives a required gate (tests, review, security, user confirmation). It is evidence-gated: judge fit against the project's config, accepted decisions and local patterns, and never impose a technique the project does not use.
>
> 1. **Easy to change.** Keep one owner per piece of knowledge — DRY the rule, not look-alike text. Reuse an existing helper, component or module before writing a new one (search 3+ siblings and cite them). Put purpose-named interfaces or ports at volatile boundaries: wrap a third-party SDK or infrastructure dependency in an adapter when it is volatile, likely to be swapped, or needs a test seam, so a swap touches one place — a stable dependency used directly is fine, and a pass-through wrapper that lowers no change cost is a defect. Keep units small and cohesive with explicit dependencies; no hidden state, boolean traps or leaked implementation detail. Extract an abstraction for a real second consumer or an evidenced change axis, never for speculation; prefer the reversible decision and defer an irreversible one until evidence forces it. Depth → `SYNC:design-patterns-quality`, `SYNC:complexity-prevention`.
> 2. **Easy to scale.** Growth in features, modules, team, data or load must not multiply edit sites or cost. Add a variant by extension (a new handler, registration or config entry), not by editing every switch over the same discriminator. Keep module boundaries and dependency direction explicit. Bound every loop, query, result set, queue and concurrency on the paths that matter, so work grows with the request, not with total data. Scale only what the project's profile warrants — no speculative distribution or infrastructure. Depth → `SYNC:scale-technique-gate`, `SYNC:engineering-foundation-gate` (F5, F6).
> 3. **Easy to maintain.** Protect every changed behavior with tests that name the business intent or invariant and FAIL when it breaks — happy, error, edge, boundary and regression paths, not only the changed line. Tests are repeatable and isolated. The mechanical harness (format, lint, types, build, test — the same command locally and in CI) runs and passes. Names and structure state intent, and docs or specs that embed the behavior stay in sync. Depth → `SYNC:engineering-foundation-gate` (F3, F4, F7), `SYNC:harness-setup`.
>
> **By phase:**
>
> - **Plan** — each phase names what it reuses (`file:line`), the seam or abstraction it adds or why none is needed, the next plausible change and its edit-site count, the growth bound, and the test that proves each invariant — or `N/A` with a reason where an item cannot apply (a docs-only phase has no growth bound).
> - **Implement** — search for reuse before writing; after writing, recount the edit sites of the next plausible change, confirm each new test fails when its intent breaks, and run the harness.
> - **Review** — judge each pillar `PASS` / `FAIL` / `N/A` with `file:line` evidence and name the real enemy: coupling, duplicated knowledge, hidden state, unbounded growth, untested intent, unclear intent or an irreversible decision exposed too early. A finding names its consequence for the next change; absence of a pattern is not a defect.
>
> **Self-check before claiming done:** (1) What is the next plausible change, and how many files would it touch? (2) What breaks at 10× features, data or load? (3) Which named test goes red if this behavior breaks, and does the harness run it?

<!-- /SYNC:core-engineering-principles -->


<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

<!-- /SYNC:goal-contract-satisfaction-loop -->

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation (optional advice)** — Optional: for high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), `.code-graph/graph.db` may add callers, dependents and impacted tests beyond grep/read. Treat it as a hint, NOT proof: stale or incomplete graphs lag uncommitted edits and unindexed paths. verify anything that matters by reading files/grep. Skip it for low-risk or local changes.
>
> An absent or stale graph is never a finding and never blocks, fails or gates work.
>
> **Pattern:** grep/read → optional graph suggestions → grep/read verification.
>
> | Situation                          | Optional graph query                         |
> | ---------------------------------- | -------------------------------------------- |
> | High-risk investigation            | `trace --direction both` on 2-3 entry files  |
> | Fix/debug with wide reach          | `callers_of` on buggy function + `tests_for` |
> | Feature touching a shared contract | `connections` on files to be modified        |
> | Review of a high-risk change       | `tests_for` on changed functions             |
> | Blast radius                       | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Start `--node-mode file` (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->


<!-- SYNC:review-principle-awareness -->

> **Review Applicability / Current-Principles Awareness** — Every review must first classify the change context (greenfield foundation, brownfield feature/refactor, test/docs/config/UI/infra, or actor-facing/machine surface) and take notice of the applicable current principles below. This is an evidence-gated applicability check, not a mandate to flag or build every item.
>
> **Detailed protocol routing — read/apply only when warranted:**
> - `SYNC:scale-ready-foundation` — greenfield foundation is blocking; big-feature brownfield fit/adapt/defer; architecture review is advisory when auditing. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`.
> - `SYNC:test-architecture-execution-contract` — assertion-bearing tests use the project's configured/native format, name the guarded intent/technical contract, and assert an owned outcome; GWT is one valid format. Detailed carriers: `integration-test`, `workflow-greenfield-init`, and the test-architecture review path.
> - `SYNC:ai-agent-as-user-access` — when an AI/machine actor or future contract is evidenced, inspect identity/delegation, capability boundaries, selected API/CLI/MCP/WebMCP/event/SDK surface, safety/consent, audit/observability, and native-format contract tests. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`, `architecture --mode=review`.
> - `SYNC:design-system-check` — when UI changes, inspect the design-system and component-contract obligations; route visual/UX depth to the owning UI review.
>
> **Review behavior:** Check only principles applicable to the reviewed scope; record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, `BLOCKED`, or `UNVERIFIED` with `file:line`/config/CI evidence, status/severity, owner/route, and next step/revisit trigger. Do not invent findings from a generic checklist, flag unrelated pre-existing gaps as regressions, silently expand the requested scope, or mutate a parent gate merely because advice exists.
>
> **Ownership:** `changes-review` coordinates the applicability pass and routes depth to the owning specialist (`architecture --mode=review`, `integration-test --mode=review`, `security-audit`, `performance-review`, `ui-design --mode=review`, `production-readiness-review`, or another matching review). A specialist reports its own lens and does not duplicate or override another review's verdict; existing brownfield gaps stay advisory unless new, safety-relevant, or explicitly in scope.
>
> **Required review note:** `context/scope | principle/protocol checked | evidence | status/verdict | severity | owner/route | next step/revisit trigger`.
>
> **BLOCKED when:** an applicable principle is required for safety/correctness but missing, unowned, or untestable. Otherwise record an evidence-backed `NOT-APPLICABLE`, advisory, `DEFER-AS-OPPORTUNITY`, or `UNVERIFIED` result according to the lifecycle and change context; creating a greenfield foundation remains subject to its own blocking protocol.

<!-- /SYNC:review-principle-awareness -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Use one consequence-based scale across reviews, skills, agents, workflows and hosts. Choose the highest credible tier supported by evidence; never lower it to pass a round. Effort, cost, preference, annoyance, frequency alone and round-budget pressure do not determine severity.
>
> **Finding vs observation:** admit a finding only with an affected user/system/data/contract, shipped consequence, reachable supported trigger (caller, input, state or event sequence), evidence location and confidence percentage. Assess exposure/likelihood and reversibility/detectability before assigning a tier.
>
> **Keep as observations:** advice, preference, duplicates, unsupported concerns, unreachable paths, issues already reported by this change’s compiler/type checker/linter/tests, intended behavior changes, reasoned suppressions predating the change, and pre-existing issues neither touched nor made reachable. Review newly added suppressions. Observations/INFO do not reopen loops.
>
> | Tier | Consequence and boundary examples | Action |
> | --- | --- | --- |
> | CRITICAL | Immediate material security, safety or authority harm; auth bypass; secrets/PII exposure; irreversible destruction; data loss/corruption; critical-path silent failure. | Block immediately; escalate. |
> | HIGH | Material supported-path correctness, invariant, privacy/authority, public-contract or compatibility failure; likely user/downstream harm; missing proof for a behavior-changing fix. | Fix before PASS/merge. |
> | MEDIUM | Bounded consequential edge, resilience, observability, testability, maintainability or architectural gap; credible future defect. | Clear this round; escalate decisions needing an owner. A follow-up is not a clean pass. |
> | LOW | Proven non-blocking polish with no credible present correctness, security, privacy, authority, availability or data-integrity impact: wording, formatting, minor docs/conventions, optional cleanup, cosmetics. | Record/defer; alone never opens another round from round 2 or increases the budget. |
>
> **Consequence decision tree:** check binary gates separately, then select the first evidenced tier from CRITICAL → HIGH → MEDIUM → LOW. Missing evidence is **NOT VERIFIABLE**, not a fifth tier or a LOW fallback: name the missing proof. Unsettled reachability is NOT VERIFIABLE for potential MEDIUM+ impact and an observation for polish. Claims potentially affecting required behavior, security, privacy, authority, availability, data integrity or a gate remain evidence blockers until proved or explicitly owner-accepted with scope, rationale and residual risk. Owner acceptance does not make an open MEDIUM a clean pass or a failed gate pass.
>
> **Hard gates and rounds:** failed tests, required artifacts, security must-fix checks, generated parity and policy compliance block every round, independently of finding severity. The executable helper carries failures as synthetic CRITICAL blockers; reports name the gate and failure evidence. Default review budget is three rounds; unresolved findings or failed required checks at the cap ask the user for a bounded extension under `SYNC:review-policy`. Failed checks never pass by severity deferral.
>
> **Domain-vocabulary normalization and scores:**
> - `BLOCKED`/`HARD FAIL`/`FAIL` are local blocking verdicts, not automatic CRITICAL; classify by consequence while preserving the owning gate. `WARN` can be any tier; `PASS`/compliant is not a finding. INFO/advisory remains observational unless material consequence is evidenced.
> - UI `P0/P1/P2/P3/P4` start at CRITICAL/HIGH/MEDIUM/LOW/LOW; raise only with evidence. P0/P1 accessibility or task-completion floors remain blocking gates.
> - Criterion `0/1/2` → CRITICAL or HIGH (unmet readiness)/MEDIUM (partial consequential gap)/pass; polish is LOW, never forced to `0`.
> - Impact × likelihood: high impact/exposure → CRITICAL/HIGH; material impact with bounded exposure → HIGH/MEDIUM; low impact/exposure → LOW. Record both axes and justify the highest credible tier.
> - Aggregate scorecards and `/20` verdict bands stay separate; sub-80 areas prompt investigation, not automatic severity. Keep advisory deductions separate from blockers. Emit numeric SRE/readiness or impact/likelihood scores with consequence and normalized tier.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:systematic-review-batching -->

> **Adaptive Review Planning** — Triage the complete target and make a short plan before deep review. Optimize attention and time while preserving coverage and all applicable quality gates.
>
> 1. **Understand the work.** Inventory all changed paths/status and intent; distinguish behavior, contracts, tests, docs/config and mechanical outputs. Identify risk, dependency links and governing rules. Prioritize the paths whose failure has the largest consequence; size alone does not decide depth.
> 2. **Choose an approach.** Review inline when useful. Group connected behavior with its callers, tests and rules; use authorized specialist agents for independent work or necessary expertise. Decide grouping, read sizes and concurrency from the actual working set, context headroom and delegation cost. There are no universal file, line, byte or group-size caps, and no mandated split or hierarchy. Preserve host limits and leave room to reason.
> 3. **Track and persist.** Create todo tasks for the planned review work, findings validation and fix/re-review checks. Track coverage so every file is reviewed or accounted for by relevant evidence; generated/mechanical changes can use verified generator/parity or pattern checks with an explicit rationale. Read relevant source and rules on demand, persist findings and remaining work as you go, and resume from that record after interruption. If context is tight, checkpoint and regroup; never silently truncate or call unreviewed work clean.
> 4. **Coordinate and validate.** Give each delegated reviewer a clear scope, governing rules, report path and the required full review protocol template. Independent readers may run together; fixes wait until their reports return. Validate findings before acting, preserve rejected/re-tiered candidates and reconcile conflicts by evidence. The coordinator independently checks material findings, uncertain claims and cross-group interactions, choosing additional validation where risk warrants it. Reconcile all coverage and required checks before the final verdict.
>
> **Quality bar:** a thousand-file review may need several passes, but file count never waives end-to-end correctness, required rules, tests, finding validation or fresh post-fix review.

<!-- /SYNC:systematic-review-batching -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `tmp/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: tmp/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> **Review/audit decisions:** apply `SYNC:review-decision-autonomy` before any user-choice or confirmation prompt below. Select the supported recommendation and record its rationale; round-limit extension, indispensable missing facts and operation authority retain their explicit boundaries.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm via `ask user question tool` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `ask user question tool` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

<!-- SYNC:understand-code-first -->

> **Understand Existing Code First** — For code changes, read and trace the target before planning or editing; do not apply a code workflow to work with no code surface.
>
> 1. Search for relevant existing implementations and cite `file:line`; aim for 3+ comparable examples when they exist, and record when the project has fewer or none.
> 2. Read the target area and its configured project references; identify actual structure, owners, and conventions without assuming a framework, layer model, or base class.
> 3. Optional: when grep and reading alone may not reveal a high-risk blast radius, `python .claude/scripts/code_graph trace <file> --direction both --json` (when `.code-graph/graph.db` exists) can add callers and dependents — a hint that may be stale, verified by reading the files.
> 4. Map affected dependencies and callers with available repository tools (grep, reading); an absent, stale or unsupported graph never blocks or fails the task.
> 5. Write investigation to `tmp/analysis/` for non-trivial tasks (3+ files).
> 6. Re-read the analysis before implementing; update it when evidence changes.
> 7. Follow a fitting local pattern, or state why no suitable pattern exists and justify a project-appropriate choice.
>
> **BLOCKED until:** target and relevant existing patterns are inspected, applicable dependencies are traced, and material assumptions have evidence. If an item does not apply or the repository has no comparable implementation, record that fact rather than fabricating a gate result.

<!-- /SYNC:understand-code-first -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** for code work, read the target and relevant conventions before planning or editing; seek 3+ fitting examples when available and record fewer/none. Do not impose code discovery on work with no code surface. The code graph is optional, stale-able advice for high-risk impact, never a requirement.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**Optional advice:** the code graph (`.code-graph/graph.db`) can hint at a high-risk blast radius grep misses; it can be stale, so verify by reading files. Never required.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->


<!-- SYNC:systematic-review-batching:reminder -->

**MUST ATTENTION** Triage all files, write a short review plan and create review/validation/fix/re-review tasks first. Choose inline work or authorized specialists from risk, relationships and context headroom; no fixed file/line/byte caps. Persist coverage, reconcile interactions and validate findings before fixes or PASS.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->


<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

**Review/audit invocations:** follow `SYNC:review-decision-autonomy` for every decision prompt; choose supported recommendations without asking, preserve round-extension approval and actual authority.

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `ask user question tool` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->


<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

## Closing Reminders

**Goal:** Review entity/VO design against discovered project conventions so invariants and aggregate boundaries remain safe.

**MUST ATTENTION** Phase 0 discovery/paradigm/scope → 1 search/report → 2 A–P/E2 → 3 holistic fit/fresh-context gate → 4 report/score → 5 validate/fix/full restart → standalone Next Steps. `--report-only` ends after validation: no fixes, restart, delegation or user questions.

- Discover before judging; verify callers and all execution paths. Require `file:line` and >80% confidence (60–80% verify first; <60% do not recommend).
- Adapt rules per aggregate and subdomain; check pattern fit, base class, scope and lifetime. Two or more same-kind violations signal a structural concern.
- Validate all findings before fixing; respect the round severity bar and binary gates. A clean pass ENDS the review only once the persisted `minRounds` is met. Each fix invalidates the prior verdict.
- Bootstrap all phase tasks plus the final lessons review; keep one in progress, complete with evidence, resume existing tasks after context loss, and persist findings per file.

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->
