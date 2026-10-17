# `$architecture --mode=review` — architecture compliance review reference

> Loaded by `architecture/SKILL.md`'s Mode Dispatch when invoked as `$architecture --mode=review [scope] [--report-only]`. Formerly `/architecture-review`. This contract is the whole invocation: run it exactly as written, standalone or as a workflow step. `$ARGUMENTS` in this file means the invocation text after `--mode=review`.

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `$start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

## Quick Summary

**Goal:** Review changed code against the architecture and contracts the project actually establishes. Preserve ownership, consistency, boundaries, and generated artifact integrity; classify framework-specific pattern checks from project evidence so the handoff carries a trustworthy, actionable PASS/WARN/BLOCKED decision.

**Summary:**

- Ground each check in project config, applicable references, accepted ADRs and established code; honor N/A. Architecture knowledge is a recognition aid, not overriding authority. Read context → select scope → trace blast radius → review all 13 applicable categories serially → report → self-audit and Phase-5 `$why-review` → hand off.
- Preserve ownership, consistency, boundaries and generated artifacts. Prove violations with `file:line` and relevant counterexamples; route sibling-owned depth rather than duplicate it. Workload evidence precedes scale advice; missing capacity evidence yields INFO/route. Inspect machine-access contracts only when applicable.
- Keep review read-only; validate findings before routing fixes. The declared fix loop restarts Phase 0 with fresh tasks after fixes, except LOW deferral: Round 1 clears all findings; Round 2 clears CRITICAL/HIGH/MEDIUM and defers LOW; binary gates always block. Persist `tmp/reports/arch-review-{date}-{slug}.md` incrementally.
- `--report-only` runs Phases 0–5 only: no fixes/restarts, nested fan-out, questions or writes beyond the report. Return validated severity groups, verdict, material-trade-off handoffs and next steps. Standalone Next Steps asks; parent/workflow/sub-agent contexts return recommendations.

**Default scope:** All uncommitted changes (staged + unstaged). Override: specify files, directories, services, or full codebase.

> **MANDATORY MUST ATTENTION** Plan tasks to read project context BEFORE reviewing. Read `docs/project-config.json` first, resolve the project-reference root using `docsRoots.projectReference.path` when configured, then read `docs-index-reference.md` and `lessons.md` from that root. Use the docs index and changed-file triggers to select applicable references:
>
> - `project-structure-reference.md` — when module, service, layer, ownership, or deployment boundaries are in scope.
> - `backend-patterns-reference.md` — when backend, API, persistence, or messaging code is in scope; apply its N/A decisions.
> - `frontend-patterns-reference.md` — when frontend files are in scope; apply its N/A decisions.
> - `code-review-rules.md` — when present and relevant to the review.
> - Accepted ADRs — when the changed area may affect a recorded decision.
>
> Missing or stale required context → run the project’s initialization or narrow documentation setup route before ordinary review. Rules come from project evidence — NOT general knowledge.

**Workflow:**

1. **Phase 0: Load Architecture Rules** — Read project architecture docs (rules come from docs, NEVER general knowledge)
2. **Phase 1: Determine Scope** — Changed files (default) or user-specified scope
3. **Phase 2: Blast Radius** — assess by grep/read; an optional `$graph-code --mode=blast-radius` hint when the change looks high-risk
4. **Phase 3: Architecture Review** — Classify applicability for each file, then review all applicable checks serially across the 13 categories (0 tooling → 12 data, consistency & tenancy)
5. **Phase 4: Finalize** — Generate compliance report with PASS/BLOCKED/WARN verdicts
6. **Phase 5: Why-Review Self-Validation Gate** — Adversarially validate own findings via `$why-review` before handoff (MANDATORY when any finding exists)
7. **Next Steps** — `ask user question tool`: `$code-simplifier` / `$code-quality-review` / skip (standalone only — see the [Next Steps](#next-steps) exemption)

**Key Rules (top 3 critical first):**

- MUST ATTENTION read project architecture docs in Phase 0 BEFORE reviewing — rules come from docs, NEVER general knowledge.
- Every violation needs `file:line` proof. Grep 3+ relevant examples/counterexamples when established code patterns are the evidence; use config, references, and accepted ADRs as direct evidence and check for conflicting code.
- MUST ATTENTION review one category at a time: doc rule → source evidence → verdict — NEVER scan categories simultaneously.
- MUST ATTENTION when an agent-facing surface or accepted future contract is in scope, apply `SYNC:ai-agent-as-user-access`; inspect the existing setup and classify only evidenced identity, authorization, capability, safety, contract, audit, or observability gaps as PASS/WARN/BLOCKED. If not applicable, record evidence-backed N/A or no finding; never prescribe every machine surface.
- Write findings to `tmp/reports/arch-review-{date}-{slug}.md`.
- BLOCKED = must fix before merge | WARN = review and decide | PASS = compliant.
- Review is read-only until `$why-review --validate-findings` confirms findings; fixes happen only in the validated fix loop — the caller's fix step when a parent skill/workflow invoked this review, `$fix --target=review` when standalone. Every applied fix requires a fresh full architecture review from Phase 0 with new tasks. Apply the round severity bar: Round 1 clears at zero open findings; Round 2 clears at zero CRITICAL/HIGH/MEDIUM, with LOW findings deferred. No-edit LOW deferral needs no repair pass; failed binary gates remain blocking.

## Contents

- [Quick Summary](#quick-summary)
- [Your Mission](#your-mission)
- [Report-Only Mode (`--report-only`)](#report-only-mode---report-only)
- [First Principle — Easy to Change · Easy to Scale · Easy to Maintain](#first-principle--easy-to-change--easy-to-scale--easy-to-maintain)
- [Quality Tooling Principle — Tech-Stack Adaptive](#quality-tooling-principle--tech-stack-adaptive)
- [Review Mindset (NON-NEGOTIABLE)](#review-mindset-non-negotiable)
- [Ownership & Handoff (own vs delegate)](#ownership--handoff-own-vs-delegate)
- [Phase 0: Load Architecture Rules (MANDATORY FIRST)](#phase-0-load-architecture-rules-mandatory-first)
- [Phase 1: Determine Scope](#phase-1-determine-scope)
- [Phase 2: Blast Radius (optional graph hint)](#phase-2-blast-radius-optional-graph-hint)
- [Phase 3: Architecture Review](#phase-3-architecture-review)
- [Phase 4: Finalize — Architecture Compliance Report](#phase-4-finalize--architecture-compliance-report)
- [Architecture Boundary Check (Automated)](#architecture-boundary-check-automated)
- [Systematic Review Strategy](#systematic-review-strategy)
- [Phase 5: Why-Review Self-Validation Gate (MANDATORY when findings exist)](#phase-5-why-review-self-validation-gate-mandatory-when-findings-exist)
- [Next Steps](#next-steps)
- [AI Agent Integrity Gate (NON-NEGOTIABLE)](#ai-agent-integrity-gate-non-negotiable)
- [Sub-Agent Type Override](#sub-agent-type-override)
- [Mode protocols](#mode-protocols)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Your Mission

<task>
$ARGUMENTS
</task>

## Report-Only Mode (`--report-only`)

> **Use when** a caller runs this skill as a read-only leaf — e.g. a workflow specialist parallel batch, a delegated review lane, or a review batch — and another step owns every fix. `--report-only` in `$ARGUMENTS` is an execution flag, not a scope override; review-only is the default; standalone `--fix-loop` alone runs repair/restart phases.
>
> **MANDATORY — when `--report-only` is passed, read `.claude/skills/workflow-review-changes/references/caller-mode.md` § `--report-only` in full FIRST.** It holds the rules every read-only leaf shares (no fix or restart, scope from the caller's brief, no nested fan-out, no user questions, write only the report, return contract); the rules below are this skill's own.
>
> 1. **Run Phases 0–5 only.** Phase 3 still reviews every applicable category serially; Phase 5 `$why-review --validate-findings` still validates every finding. No fix, no full-review restart, no fresh-context re-review round, and no Next Steps `ask user question tool`: return the validated report; the caller owns fixes and any re-review. — why: two writers of one artifact inside a barrier race each other.
> 2. **Default scope.** When the brief names no files, diff or target, use the default uncommitted-changes scope and record it in the report.
> 3. **No nested fan-out.** Skip the Systematic Review Strategy's delegated assignments; review sequentially in this context, respecting working-set bounds.
> 4. **Return** the report path, the local verdict (PASS/WARN/BLOCKED/N/A), validated findings grouped Critical/High/Medium/Low per the mapping below, every unconfirmed material trade-off (the `SYNC:trade-off-interrogation-gate` non-asking handoff), and the next-step recommendations the Next Steps prompt would have offered.
>
> **Severity mapping (local verdict → caller tier, per `SYNC:severity-rubric` domain-vocabulary normalization).** Classify each finding by consequence; the local label sets the starting tier, and the report records both (`BLOCKED→High`):
>
> | Local finding | Caller tier |
> | --- | --- |
> | `BLOCKED` with immediate material risk — data loss/corruption, cross-tenant exposure, authority/safety bypass, critical-path silent failure — or a failed binary gate | **Critical** |
> | `BLOCKED`, any other must-fix-before-merge violation (broken boundary/contract/invariant, accepted-ADR contradiction, removed quality gate) | **High** (Medium only when evidence shows a bounded consequence; the local BLOCKED still holds) |
> | `WARN` with a consequential impact (credible defect, coupling/resilience/testability drift, unrecorded one-way door) | **Medium** (High when the consequence warrants) |
> | `WARN` where evidence shows no credible present material impact | **Low** |
> | `PASS`, `N/A`, or an advisory INFO block (technique applicability, scenario stress) | not a finding |
> | Evidence missing to choose a tier | `NOT VERIFIABLE` — stays open, never Low |
>
> For this mode the declared step order ends at Phase 5; stopping there is the mode's contract, not a skipped step.

## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles` (full body under Mode protocols below); its closing digest ends this file.

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
- Before flagging a pattern based on code: inspect 3+ relevant examples/counterexamples where they exist; documented config, references, or accepted ADRs are also evidence, and conflicts must be surfaced.
- Question: "Actually a violation, or an established exception?"

## Ownership & Handoff (own vs delegate)

This skill = one reviewer in a multi-reviewer pipeline — `workflow-review-changes` runs it beside the siblings below. Review ONLY what this skill owns; route the rest so findings are not double-reported across reviewers.

| This skill OWNS (deep-review here)                                                                                            | Delegate to sibling (one-line pointer only — do NOT deep-review)         |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Layer boundaries, dependency direction, business-logic placement                                                            | —                                                                         |
| Messaging, CQRS, data-access, service-era, event-handling, and service-boundary conventions when applicable                | —                                                                         |
| Frontend architecture and lifecycle/style conventions established by the project                                               | Visual/SCSS/responsive/z-index quality → `ui-design --mode=review`                      |
| Quality-tooling baseline, generated-artifact integrity, ADR / recorded-decision conformance                                 | —                                                                         |
| Architecture-level auth PLACEMENT (a gate exists at the boundary)                                                           | OWASP, secrets, dependency/supply-chain, authz-matrix depth → `security-audit` |
| Structural soundness of a hot path (no obvious N+1 introduced by the diff)                                                  | Query plans, indexing depth, latency/throughput budgets → `performance-review` |
| —                                                                                                                          | Domain entity / value-object DDD design quality → `domain-analysis --mode=review` |
| —                                                                                                                          | Integration-test assertion quality, coverage, traceability → `integration-test --mode=review` |
| —                                                                                                                          | Runtime production-readiness of service/API changes (observability wiring, rollback) → `production-readiness-review` |
| —                                                                                                                          | AI surface? Only if the design adds or changes a model call, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-engineering-gate.md`, route depth to `ai-engineering-review`; else skip this row |

When a finding clearly belongs to a sibling, record one-line `→ route to {skill}` pointer and move on — NEVER expand it. — why: duplicated findings across reviewers inflate severity counts and bury issues each reviewer uniquely owns.

## Phase 0: Load Architecture Rules (MANDATORY FIRST)

> **MUST ATTENTION:** Read project docs BEFORE reviewing. Rules come from docs, NEVER general knowledge.

Every doc below sits under the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path):

- read `backend-patterns-reference.md` — extract messaging naming, layer rules, CQRS patterns, repo rules, entity event handler patterns, validation patterns
- read `project-structure-reference.md` — extract service map, layer structure, DB ownership
- frontend files in scope → read `frontend-patterns-reference.md`
- read `code-review-rules.md` — extract anti-patterns + review rules directly

**Universal reasoning layer (secondary, never authoritative):** consult `.claude/docs/architecture-knowledge.md` for the coupling taxonomy + four coupling dimensions, the distributed-monolith detection signature, the ~100-entry anti-pattern catalog, and the symptom→root-cause triage matrix. Use it to RECOGNIZE a defect class the project docs do not name explicitly. **Honor its provenance markers in §3/§8/§9/§10:** a row or section banner marked `— VERIFY` is an UNVERIFIED assertion — it may seed a hypothesis, but NEVER quote it as the authority for a finding; confirm against the named source (or the project's own docs) first.

> **MUST ATTENTION — precedence is absolute.** Project reference docs and accepted ADRs > the knowledge catalog > general knowledge. **NEVER report a deviation from the catalog as a project violation**, and NEVER let a catalog entry override an established, grepped codebase convention. Every catalog-derived observation is a HYPOTHESIS until you have BOTH `file:line`/config/topology evidence AND the named quality attribute it damages — otherwise record it as INFO or drop it. — why: universal patterns applied as project rules generate confident false positives, the most expensive output this skill can produce.

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

## Phase 2: Blast Radius (optional graph hint)

- Assess the blast radius by grep/reading callers and dependents first.
- Optional: when grep and reading files alone may not reveal a high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), the code graph (`.code-graph/graph.db`) can add callers, dependents and impacted tests. Treat it as a hint, NOT proof: the graph can be stale or incomplete (it lags uncommitted edits and unindexed paths) — verify anything that matters by reading the files/grep. Skip it for low-risk or local changes. When it applies, `$graph-code --mode=blast-radius` can add impacted files.
- Record: impacted file count, cross-service impact, risk level (graph numbers are hints; confirm by reading).
- Prioritize review by highest-impact files first.
- No graph, or a stale one → proceed on grep/reading; never a finding.

Optional, per changed file with downstream impact:

```bash
python .claude/scripts/code_graph trace <changed-file> --direction downstream --json
```

For changes touching message or event contracts, trace the project's actual consumers, handlers, and downstream effects.

## Phase 3: Architecture Review

Create report: `tmp/reports/arch-review-{date}-{slug}.md`

Per file in scope, evaluate the categories that apply to the file type and change. Pattern applicability requires project evidence; do not infer a stack or architecture from this skill's examples.

MUST ATTENTION review serially. Per applicable category: read docs/source evidence → derive risk with `Think:` → grep 3+ examples/counterexamples where relevant → record PASS/WARN/BLOCKED. NEVER scan categories simultaneously — why: parallel scanning collapses per-category evidence into one undifferentiated pass and drops findings.

> **Pattern applicability gate (MUST ATTENTION):** Before judging any concrete architecture, framework, stack, transport, persistence, or project-convention check in Categories 0–12 or elsewhere in this skill, record it as **Applicable** or **N/A** in the review report, with its evidence (`docs/project-config.json`, a configured project-reference doc, an accepted ADR, or established code in the relevant boundary). Check at least three relevant examples when code is the evidence. A project-reference doc that marks a pattern N/A remains authoritative unless a later accepted ADR or established current code provides contrary evidence; surface doc/code conflicts instead of resolving them silently. If config, references, ADRs, and relevant code do not establish a pattern, record N/A and do not BLOCK because the project lacks it. N/A skips that pattern's implementation-specific checklist; still assess any real invariant, ownership, consistency, idempotency, coupling, or boundary-quality concern using the project's actual design.

| Pattern-specific check | Applicability evidence to record |
| --- | --- |
| Layer names, dependency direction, domain purity, and port placement | Configured architecture/layer rules, project references, accepted ADRs, or established module dependencies |
| Message transport and delivery guarantees | Configured broker/transport or message contract, project references, accepted ADRs, or established producers/consumers |
| Message naming, producer/consumer bases, outbox, retries, ordering, and replay | Evidence for each named convention; a configured transport alone does not establish these choices |
| CQRS, command/query file layout, validation API, DTO mapping, and entity events | Evidence for each convention separately; one does not imply the others |
| Repository abstractions, query extensions, and database indexes | Project data-access contract, configured store/schema, accepted ADRs, or established repository/query patterns for each check |
| Legacy/modern service eras and frontend base/store/API/lifecycle/style conventions | Project references, accepted ADRs, config, or established code for the affected service or frontend; classify separately |

> **Portability note (MUST ATTENTION):** Framework symbols, base-class names, directory conventions, and patterns mentioned across Categories 0–12 are examples, not default requirements. Resolve applicable project references from config and the docs index, then use the applicability gate above to map each concrete check to project evidence. Flag deviations from an established project convention; NEVER treat a hardcoded name or a pattern's absence as a project violation.

---

### Category 0: Quality Tooling Baseline — Severity: BLOCKED/WARN

**Think:** Can project automatically catch style, type, complexity, security, dependency, boundary regressions for detected stacks?

- Detect production stacks via `docs/project-config.json`, relevant docs, manifests, lock files, build files, CI.
- Inventory gates: formatter, linter, code/static analyzer, compiler/type checker, dependency audit/SCA/SBOM, SAST, test/coverage, architecture/dependency-boundary checks, pre-commit, CI/build.
- Verify stack-appropriate coverage: `.editorconfig`/language analyzers, JavaScript/TypeScript linting, UI template linting when supported, formatter config, dependency vulnerability scans, semantic security analysis.
- BLOCKED when production stack lacks runnable lint/static-analysis/type-check command and equivalent enforced gate, or CI/build references missing/broken quality command.
- WARN when tooling local-only, not wired into CI/build/pre-commit, partial for active production code, broadly/unexplainedly suppressed, unclear on generated-code exclusions, or stale for stack.
- **Scope to the change (MUST ATTENTION):** On normal change-level review, *pre-existing* tooling gap unrelated to diff is WARN with single note — NEVER BLOCK whole review on standing, change-unrelated condition. Reserve BLOCKED for: new stack/service introduced by this change with no gate, change itself removing/breaking existing gate, or explicit full-codebase/greenfield audit scope. — why: change review that BLOCKs on unrelated standing gap produces noise that buries regression the diff actually introduced.
- Before recommending tools, find current official/ecosystem setup and cite it; recommend capabilities first, tools second.

**Fitness-function enforcement (architectural rules must be EXECUTABLE):** an architectural rule not automatically verified is a SUGGESTION and will be violated within a quarter. Check whether the project's own recorded architectural rules have a machine check — and whether THIS change adds a rule with no check:

| Rule the project records | Fitness function expected (any equivalent counts) |
| --- | --- |
| Layer / dependency direction | Architecture test in CI (ArchUnit / NetArchTest / dependency-cruiser / import-linter / lint boundary rules) |
| No module cycles | Cycle detection failing the build |
| Domain purity | Assertion that the domain package imports no framework/ORM/HTTP namespace |
| API / event schema compatibility | OpenAPI-or-protobuf diff gate · schema-registry backward-compat check · consumer contract tests |
| Multi-tenant isolation | Test asserting a cross-tenant query returns zero rows (see Category 12) |
| Resilience | "Every outbound call has a timeout" lint or test |
| Performance / bundle budget | Latency-or-size assertion in the pipeline |
| Test strength / no vacuous assertions | Mutation-or-fault-injection gate scoped to CHANGED code; where no tool exists, a recorded defect-seeding drill (break a top invariant → record which named test went red → restore). Line coverage % is a diagnostic, NEVER the gate |

- **WARN** when a recorded architectural rule has NO machine check and relies on review discipline alone. **BLOCKED** when this change REMOVES or disables an existing architecture/boundary check, or introduces a new enforced-by-prose-only boundary while the project already has a fitness-function mechanism available.
- Existing violation backlog is fine if it is a RATCHET (new violations blocked, count only decrements) — a "cleanup later" comment with no gate is WARN.

**Violation format:**

```
BLOCKED: {stack} has no enforced lint/static-analysis/type-check quality gate ({evidenceFile}:{line})
WARN: recorded architecture rule "{rule}" has no fitness function — enforced by review discipline only ({docFile}:{line})
```

---

### Category 1: Architecture Boundaries and Layers — Severity: BLOCKED/WARN when an evidenced rule is violated

**Applicability:** Apply named layer rules, domain purity, and dependency-inversion requirements only when config, project references, accepted ADRs, or established code define those boundaries. Otherwise record those pattern checks N/A and review the actual module dependencies, ownership, and change coupling.

**Think:** What are the actual module or layer boundaries? Which imports are allowed by the project's contract, and where does the changed behavior's invariant or state belong?

- Read any architecture and layer rules present in `docs/project-config.json`, configured references, and accepted ADRs. Do not assume a particular config key or layer taxonomy.
- Determine a file's module/layer from the project's own structure and established dependencies; do not infer `Domain/`, `Application/`, `Persistence/`, or `Service/` from a path alone.
- Scan the configured language's imports against documented dependency constraints. When none are defined, assess whether the change introduces concrete coupling, cycles, or a boundary leak and cite its impact.
- Place state changes and behavior with the owner of the relevant invariant under the project's architecture; do not impose a fixed Entity/Service/Controller ordering.
- Enforce inward-only dependencies, domain purity, or policy/adapter port placement only when that architecture is evidenced.
- Keep domain concepts out of generic shared or infrastructure layers where those layers exist; cite the consumer-specific coupling and affected boundary.
- **Module cycles (WARN/BLOCKED by evidenced impact):** where package/module boundaries exist, detect new cycles with the project dependency tool or graph. Report one only when it violates a documented acyclic rule or creates a concrete dependency, initialization, testing, build, or release problem; a graph cycle alone is not a violation.
- **Domain purity (pattern-specific):** when an evidenced domain layer exists, check only the framework/infrastructure dependencies that its project contract excludes. Otherwise record N/A.
- **Shared/infra layer domain leak (WARN/BLOCKED by impact):** where a generic/shared/infrastructure layer exists, assess whether it references consumer-specific concepts or rules. Cite the resulting coupling and affected reuse boundary; keep generic types domain-free and place consumer-specific behavior in the consumer.
- **Cohesion / dumping ground (WARN):** a new or growing `Utils`/`Common`/`Shared`/`Helpers`/`Managers` module that everything imports is coincidental cohesion — it becomes the coupling hub and the cycle source. Test: "how many DIFFERENT reasons would make me edit this file?" More than one actor ⇒ split.
- **Pass-through layer (WARN):** a layer that only forwards calls unchanged (sinkhole) adds cost with no responsibility — collapse it or give it a real job.
- **Shallow module / pass-through method (WARN):** a new type whose public interface is nearly as large as its implementation, or a method that only forwards to the next layer with no added responsibility, earns nothing — it is interface cost with no hidden complexity. Judge module VALUE as *functionality hidden ÷ interface surface*: many tiny one-method classes ("classitis") raise total complexity while looking modular. Prefer pulling the complexity DOWNWARD into one deep module over spreading it across N call sites. — why: reviewers count classes and read it as modularity, so this defect is the one that survives review and then makes every future change touch five files.
- **Dependency inversion / port placement (pattern-specific):** when project evidence requires ports in a policy/domain module, check the declaration site and dependency direction. Otherwise record that specific placement rule N/A and assess the actual dependency boundary.
- **Wrong-abstraction extraction (WARN):** a diff that MERGES two code paths that look alike but change for DIFFERENT reasons creates a shared module with two actors. Duplication is cheaper than the wrong abstraction — require three real occurrences sharing the same reason to change (**rule of three**) before extracting. Verify against the project's own strategic-DRY decision before flagging. — why: a premature abstraction is defended by everyone who depends on it, so its cost compounds while duplication's cost stays linear.

**Violation format:**

```
BLOCKED: {layer} layer file {filePath}:{line} imports from {forbiddenLayer} layer ({importStatement})
WARN/BLOCKED: {filePath}:{line} introduces module cycle {A} → {B} → {A}, violating {documentedRuleOrImpact} ({evidenceFile}:{line})
BLOCKED: shared/infra {filePath}:{line} references consumer domain concept {concept} — shared layer must stay domain-free
```

---

### Category 2: Asynchronous Messaging and Message Buses — Severity: BLOCKED/WARN when an evidenced contract or risk is breached

**Applicability:** Mark transport-specific checks N/A unless project config, references, an accepted ADR, or established code show that the project uses or requires the transport. Classify message naming/type, producer/consumer bases, outbox, retry, ordering, replay, and acknowledgement rules separately; evidence for a bus does not establish every sub-pattern. For another asynchronous mechanism, inspect its actual contract without imposing bus-specific infrastructure.

**Think:** What state or contract crosses the boundary, who owns it, and what delivery, consistency, and failure guarantees does the project rely on?

- Enforce message names, event/request types, fields, producer/consumer abstractions, and dependency-wait mechanisms only when project evidence establishes those conventions.
- Trace changes that update data and publish or enqueue work. Assess partial-failure outcomes against the business invariant; require an outbox, CDC, or another mechanism only when the project contract defines it. Report a demonstrated consistency failure even when no named outbox convention exists.
- Read the actual delivery contract. Where retries, replay, or reordering can repeat or change the order of work, verify that the consumer preserves the relevant business state; use the project's established idempotency and ordering mechanisms.
- Review retry bounds, dead-letter handling, and durability settings only when the configured transport and changed flow make them relevant. Use that transport's documented guarantees; do not assume a broker, acknowledgement model, or exact retry policy.
- Check message compatibility when the changed contract can reach old and new consumers during a supported rollout. Require project-defined versioning or compatibility rules where they exist.
- Preserve data ownership across service boundaries. Require a particular communication path only when the project's references, accepted ADRs, or established code define it.

**Violation format:**

```
BLOCKED: {filePath}:{line} violates the evidenced messaging or delivery contract ({evidenceFile}:{line})
BLOCKED: {filePath}:{line} creates a demonstrated partial-failure or duplicate-effect path that violates {invariant}
```

---

### Category 3: CQRS and Application Patterns — Severity: BLOCKED/WARN when the specific convention applies

**Applicability:** Classify CQRS, command/query file layout, validation API, DTO mapping, and entity-event handling separately. Apply each requirement only when project config, references, an accepted ADR, or established code in the relevant boundary demonstrates it. Otherwise mark that check N/A and evaluate the actual validation/error, mapping, invariant-ownership, and side-effect consistency behavior without imposing a framework shape.

**File organization (project-specific when documented):**

- Follow the project's documented command/query/handler placement and grouping when it exists. Do not require one-file or separate-file layouts unless project evidence establishes that exact choice.

**Validation:**

- Preserve the project's documented validation and error-signaling contract. Require a specific result type, fluent API, exception policy, or sync/async validation hook only when project evidence names it.

**Mapping:**

- Follow the project's established mapping boundary. DTO-owned mapping and specific base methods are requirements only when project evidence establishes them; otherwise assess whether the changed mapping has a clear owner and preserves invariants.

**Side effects and consistency:**

- Preserve ownership, transaction boundaries, idempotency, and failure behavior for side effects. Require entity event handlers or a particular folder only when the project uses or requires that pattern.
- Use an entity-event-handler folder only when project evidence establishes that convention.
- Where the project has separate handlers, review whether each has a coherent responsibility and whether failure isolation matches the documented contract.

---

### Category 4: Data Access and Repository Patterns — Severity: BLOCKED/WARN when the specific convention applies

**Applicability:** Repository interfaces, service-specific repositories, query extensions, and database-index requirements are separate checks. Mark each applicable only when the project's data-access contract, configured store/schema, accepted ADR, or established code demonstrates it; otherwise record N/A and inspect the project's actual persistence boundary.

- Preserve documented data ownership and persistence boundaries; require a repository abstraction only when the project establishes one.
- Require a query-extension or expression pattern only when references or established code show it.
- Review database indexes only when a configured database and changed query/schema are in scope; justify concerns from the actual query shape and workload rather than requiring an index for every filter, foreign key, or sort field.

**Violation format:**

```
BLOCKED: {filePath}:{line} violates the evidenced repository/data-access contract ({evidenceFile}:{line})
```

---

### Category 5: Service Pattern Era — Severity: BLOCKED/WARN only when a project-defined split applies

**Applicability:** Record N/A unless project references, accepted ADRs, config, or established code define distinct eras and identify the affected service/module. Do not assume every project has a legacy/modern split.

**New services:** When the project defines a modern baseline, check new services against that documented checklist and use its severity.

**Existing services:** Flag mixed-era patterns only when project evidence shows the mixture creates a concrete inconsistency or maintenance risk. A consistent legacy implementation is not a violation by itself.

**Determining era:** Resolve the affected module's era from project references, accepted ADRs, config, or established code; if none is established, record N/A.

---

### Category 6: Side Effects and Event Handlers — Severity: BLOCKED/WARN when an evidenced contract or invariant is violated

**Applicability:** Classify entity/domain events, handler placement, producer bases, filters, and naming separately. Require each event-specific convention only when config, project references, an accepted ADR, or established code demonstrates it. Otherwise mark that check N/A.

**Think:** Where does the project own this side effect and its consistency boundary? What happens on failure, retry, or duplicate execution?

- Evaluate side effects in their actual transaction and failure context. A command or request handler is not inherently the wrong owner; report concrete coupling, partial-commit, or downstream failure consequences.
- Follow the event-handler location, base type, filter, and naming convention established by the project when that pattern applies.
- Where work may retry, replay, or run concurrently, check idempotency and invariant ownership against the actual delivery contract.
- Where separate handlers are established, assess whether responsibility boundaries and failure isolation match the project contract.

---

### Category 7: Service and Module Boundaries — Severity: BLOCKED/WARN when an evidenced boundary or ownership contract is violated

**Applicability:** Review service-specific rules when config, references, accepted ADRs, or established code show distinct service ownership. Apply the same ownership and coupling reasoning to meaningful module boundaries. A message bus is required only when the project's boundary contract establishes it.

**Think:** Which module or service owns the changed state? Does the change cross that boundary using its documented contract, and what coupling or consistency consequence follows?

- Resolve the actual data owners and communication contract from config, project references, accepted ADRs, and relevant code. Assess whether the change crosses that contract or adds coupling with concrete consequences.
- Direct database access or project references across an evidenced ownership boundary are findings only when they violate the project's contract or transfer writes without the owner's authorization; do not prescribe a message bus by default.
- **One writer per owned dataset (BLOCKED when ownership is established):** when project evidence identifies an owner, flag a change that adds an unauthorized writer. If ownership is unclear, record that uncertainty and trace actual write paths before concluding.
- **Shared domain library (WARN by impact):** when domain modules are shared across independently changing services, assess release, semantic, and operational coupling. Do not reject reuse by category name alone; cite the affected change path and project decision.
- **Data-shaped boundaries (WARN by impact):** treat noun-named CRUD modules as a hypothesis, not a violation. Flag only when evidence shows the boundary creates avoidable synchronous dependencies or obscures ownership; route domain redesign to `domain-analysis`.

**Violation format:**

```
BLOCKED: {filePath}:{line} violates the documented boundary or data-owner contract ({evidenceFile}:{line})
```

---

### Category 8: Frontend Architecture (frontend files only) — Severity: BLOCKED/WARN when the evidenced convention or invariant is violated

**Applicability:** Classify component bases, state stores, API-service wrappers, subscription/resource cleanup, CSS naming, and layer conventions separately. Mark a check N/A unless frontend references, config, an accepted ADR, or established code shows that convention.

**Think:** How does this frontend stack own state, data access, component lifetimes, and presentation boundaries?

Verify frontend-specific conventions against the configured frontend reference and relevant source; do not infer a component framework or design system from this checklist.

- Require component bases, state-management patterns, API wrappers, lifecycle operators, or CSS naming only when project evidence establishes those exact conventions.
- Assess state and side-effect ownership against the project's actual component/service/module boundaries; do not impose a Model > Service > Component order.
- Where subscriptions, effects, or other owned resources exist, check cleanup against the framework lifecycle and project contract.

> **Boundary with `$ui-design --mode=review`:** This category owns frontend architecture and lifecycle findings grounded in the project's actual stack. Visual layout and styling quality — including content overflow, responsiveness, sizing, layering, and CSS details — belong to `$ui-design --mode=review`, which `$changes-review` invokes when frontend changes are present. Defer visual/styling depth there to avoid double-reporting.

---

### Category 9: ADR / Recorded-Decision Conformance (if recorded ADRs exist) — Severity: BLOCKED/WARN

**Think:** Does any changed file contradict a binding decision recorded in an *accepted* ADR — a rejected library/technology, a forbidden dependency direction, a recorded quality-attribute/NFR budget, a banned pattern — without a superseding ADR?

> This category closes design→review loop: `$architecture --mode=design` emits ADRs + fitness-function choices; this category verifies changed code still conforms to them. Checks CONFORMANCE only — NEVER re-runs deep performance or security analysis (those route to siblings in the Ownership & Handoff matrix).

- Locate recorded decisions under the ADR root (default `docs/adr/**`; a `docsRoots.adr.path` entry in `docs/project-config.json` overrides the path), or the ADR location named in the project's reference docs. Read only ADRs with `Status: Accepted` — skip `Superseded`/`Proposed`/`Rejected`.
- Extract each accepted ADR's binding constraints: chosen vs rejected options, layer/dependency rules, NFR targets (latency/throughput/availability/RPO-RTO), banned patterns.
- Per changed file, check conformance against those constraints — grep the diff for reintroduced rejected options or forbidden references; cite `file:line`.
- **BLOCKED** when change contradicts an accepted ADR's binding decision and no superseding ADR exists. Correct way to change a recorded decision = new superseding ADR (per the ADR-0001 lifecycle recorded under the configured ADR root), NEVER a silent violation in the diff. — why: silent ADR violations erode the decision record and let rejected options creep back unreviewed.
- **WARN** when change drifts from a recorded guideline, or is NFR-impacting against a recorded budget — flag it and route depth check to `performance-review`/`security-audit`.
- **New one-way door with NO ADR (WARN, or BLOCKED when the project mandates ADRs):** when the diff makes a decision that is expensive to REVERSE and no ADR records it, flag it. One-way doors: a new data model or primary-key strategy · a tenancy-model change · a consistency-model change on a read path · a NEW sync-vs-async choice at a boundary · a new public API or event contract · a new service boundary · a new cloud-primitive lock-in · an auth/identity model change · a data residency or retention decision. — why: an unrecorded irreversible decision cannot be enforced by this category later, and the next engineer relitigates or silently breaks it.
- No ADRs exist → record "No recorded ADRs — conformance N/A" and skip (this category NEVER blocks a project that has chosen not to keep ADRs). Do NOT retroactively demand ADRs for pre-existing decisions on a change-level review — scope to what the diff decides.

**Violation format:**

```
BLOCKED: {filePath}:{line} contradicts {adr-id} ("{decision}") with no superseding ADR
WARN: {filePath}:{line} makes a hard-to-reverse decision ({decision}) with no recorded ADR
```

---

### Category 10: Project Spec and Test Contract — Severity: BLOCKED/WARN when the project contract applies

**Applicability:** Determine the project's spec and test-case formats from `docs/project-config.json`, configured project-reference docs, accepted ADRs, and existing artifacts. If the project maintains a canonical spec/test-case system for the changed behavior, apply its format and traceability rules. Otherwise record the spec axis N/A and use the project's actual test contract; do not require Feature Spec sections or property-based testing by default.

**Think:** Does the project's applicable contract require this behavior-affecting architecture change to be recorded and guarded? Do the relevant spec, tests, and code agree?

- When the project requires a spec and test case for the changed contract, carry a **Dual-Feedback row** in its actual format: name the governing spec rule and the test that guards it. When no project spec system applies, record why the spec axis is N/A and assess test coverage against the project's test contract.
- BLOCKED when an evidenced `[HARD]` architecture rule or cross-boundary invariant lacks the test protection required by the project. Require a universally-quantified property test plus boundary counter-case only when the project's test contract supports or requires that form; otherwise assess the strongest applicable test for the invariant.
- When a project spec exists, review it together with the relevant tests and structural diff; record a stale/missing spec only when the project's contract requires one. Keep a behavior-changing fix from being code-only where its documented spec/test cycle applies.

**Violation format:**

```
BLOCKED: {filePath}:{line} [HARD] {rule/invariant} lacks required project test protection (spec axis: {present/N/A} | test evidence: {file:line or missing})
```

---

### Category 11: Scalability & Coupling Regression — Severity: BLOCKED/WARN

> **Diff-scoped regression guard, NOT a project audit.** This category catches architecture/scalability regressions a change *introduces*; it does NOT re-grade the whole system. Init/on-demand grading of all 10 scorecard areas is owned by `architecture --mode=scalability`. Cross-cutting spec-loop discipline (Category 10) also applies to findings from this category. Cross-references Category 7 (service boundaries) and Category 9 (ADR / recorded-decision conformance).

**Think:** Does this diff introduce a new **sync cross-context** call, shared-DB reach, statefulness, or copy-pasted cross-context logic that regresses module isolation, loose coupling, or horizontal scaling — turning a clean boundary into **distributed-monolith** coupling?

**Workload evidence gate (before any scalability verdict):** derive read/write ratio · sustained/peak RPS/events · dominant query/write shapes · dataset size/growth · payload size · burst duration · hot-key/tenant skew · user regions · p95/p99 + SLO/RPO/RTO · consistency/staleness budget. If the project records none, state `scale profile unknown`, keep technique observations INFO/advisory, and route measurement depth to `performance-review`/`production-readiness-review` — NEVER invent a high-scale requirement.

**Judge the FOUR coupling dimensions SEPARATELY — low code coupling proves nothing on its own:**

| Dimension | Question | Evidence to pull |
| --- | --- | --- |
| **Code** | Who imports whom? Any cycle? | Import graph / `trace --direction both` |
| **Temporal (runtime)** | Must both be UP at once? A sync chain makes your SLO the PRODUCT of the chain's | Call graph across the boundary, sync vs async |
| **Semantic (contract)** | Does a change in their MEANING force a change in mine? | Shared schema, shared entity/domain lib, shared enum |
| **Operational (deployment)** | Must these ship TOGETHER? If yes they ARE one service | Release coordination, shared version pin |

> **Distributed-monolith signature (BLOCKED when the diff moves the system toward it):** LOW code coupling + HIGH temporal + semantic + deployment coupling. Concrete detection: services that must release together · a shared database or shared entity/domain library · a request synchronously traversing ≥4 services · one team blocked by another's deploy · "we roll back all services together." — why: it pays every distributed cost and buys none of the benefits; it is the most expensive and most common modern architecture failure, and every diff that deepens it makes the exit harder.

- **BLOCKED** when a change adds a NEW forbidden cross-context dependency, a circular context dependency, or a direct **sync cross-context** call where the recorded architecture requires an event/message or an owned contract (producer calling consumer directly — "I call you" instead of "you listen to me").
- **BLOCKED** when the diff adds a NEW outbound network call, lock or long query with **no timeout** — a missing timeout is the single most common resilience defect, and the dangerous dependency failure is SLOW, not down: it exhausts your pool while every health check stays green. Also flag uncapped or unjittered retries on the new call, and retries on a NON-idempotent operation.
- **BLOCKED** when the diff deepens a synchronous chain to ≥4 hops, or adds a sync hop to a path the recorded architecture requires to be async. Availability MULTIPLIES down a sync chain (five 99.9% deps ⇒ ~99.5%) and latency SUMS.
- **WARN** for a new connascence of **Value** or **Timing** ACROSS a boundary (two services that must change a value together, or that depend on execution order). That is a BOUNDARY error, not a bug to patch — either the invariant belongs in one transactional boundary, or it must be made eventual ON PURPOSE with a designed compensating action. Route the redesign to `domain-analysis`.
- **BLOCKED** when a change makes a previously **stateless**/scalable path stateful in a way that breaks horizontal scaling — in-memory session/cache assumed node-local, sticky-instance state, a new SPOF, or unbounded fan-out on a hot path — where the ADR/scale budget requires statelessness.
- **BLOCKED** when a change contradicts a recorded availability target by adding a single-instance load balancer/cache/queue/database or failover path with no redundant authority/health routing. **WARN** when a new replicated topology omits its sync/async/quorum acknowledgement, promotion authority, RPO/RTO, or multi-primary conflict rule. — why: replication without failure semantics is a copy, not a high-availability design.
- **WARN** when a diff changes public work from synchronous completion to queued/background processing but still reports success as completed, with no accepted/pending/succeeded/failed state, status lookup/callback, or terminal-failure owner. — why: fast acknowledgement is not completed work; hiding this creates false success and invisible backlog.
- **WARN** when a new cache/CDN path has no authoritative source, cache policy, invalidation/TTL+purge strategy, cache-key dimensions (`Vary`, identity/tenant/permission), max size/eviction, or warranted stampede/hot-key/cold-start protection. Route hit-rate/query depth to `performance-review`; keep cross-tenant key omission in Category 12. — why: caching moves load and consistency obligations; it does not erase them.
- **WARN** when a change jumps to partitioning/sharding, multi-region writes, or another datastore without evidence that query/index/pool tuning, caching, available vertical headroom, and read replicas/read models cannot meet the target. Require query-aligned distribution, hotspot analysis, resharding and cross-shard transaction/query consequences; route benchmark depth to `performance-review`. — why: sharding is the hardest database scale choice to reverse.
- **WARN** for **cross-context duplication** (copy-pasted domain rule/util across contexts — a DRY regression), a new shared-DB read across a boundary, or a distributed-monolith smell with weaker evidence; record the smell and route the deep fix.
- **Detect-only smells → route, do NOT deep-analyze here:** local hot-path/query/N+1 latency → `performance-review`; rollout/capacity/SRE/runtime readiness → `production-readiness-review`; bounded-context / aggregate re-modeling → `domain-analysis`; auth/secret/tenant-boundary coupling → `security-audit`. This category flags the regression at `file:line`; the sibling owns the depth. — why: a diff reviewer that re-runs full capacity/DDD analysis blows its context and duplicates the sibling's job.
- Behavior-affecting findings carry a Dual-Feedback row (spec axis + test axis) per Category 10 — a coupling/scaling regression that changes a contract MUST enrich BOTH the spec AND a guarding test, never code-only.

**Violation format:**

```
BLOCKED: {filePath}:{line} new sync cross-context call to {context} — recorded architecture requires event/message (route deep coupling design to domain-analysis)
WARN: {filePath}:{line} cross-context duplication of {rule/util} — DRY regression (route shared-lib decision to architecture --mode=scalability / scaffold)
```

**Technique applicability (advisory — INFO, does NOT alter this category's verdict):** When the diff touches a scale-sensitive surface, invoke `SYNC:scale-technique-gate` — derive the scale tier from evidence, then emit the Technique Applicability Matrix as an **INFO/advisory** block noting warranted-but-missing techniques and any `OVER-ENGINEERED` ones. This is guidance only: it is NEVER a BLOCKED/WARN finding, does NOT change the Category 11 severity, and does NOT feed the Phase 4 verdict table. A `MISSING-WARRANTED` technique is advice to consider, not a regression. Full catalog → `.claude/docs/scale-technique-catalog.md`.

---

### Category 12: Data, Consistency & Tenancy Boundaries — Severity: BLOCKED/WARN

> **Diff-scoped, and the LEAST reversible category.** Data outlives every service, framework and team: a defect here can cause migration cost, silent divergence, or an ownership breach. Skip when the diff touches no persistence, consistency boundary, message consumer, or tenant-scoped data. When the category applies, classify each check below independently as Applicable or N/A: publication consistency only for state-plus-message/effect flows · delivery idempotency only where retry/replay can repeat work · isolation checks only for transactional concurrent state · fencing only for distributed locks/election · tenant checks only for tenant/identity-scoped data · migration checks only for schema changes under the actual deployment strategy · query/cache/replication checks only for those configured surfaces. A surface's presence does not imply every other pattern. Overlaps with Category 2 (messaging delivery) and Category 7 (dataset ownership) — record the finding ONCE in the category that owns the mechanism, and cross-reference.

**Think:** For each applicable surface, does the change preserve the business invariant through partial failure, replay, concurrency, ownership, rollout, or staleness? Record N/A for checks whose triggering resource or contract is absent.

**Consistency & atomicity (BLOCKED):**

- **Dual write** — state committed to one store and a message/webhook/second-store effect performed independently, with no project-defined atomic publication or consistency mechanism. Outbox/CDC are examples, not defaults. Cross-reference Category 2.
- **Non-idempotent consumer or mutation** — a changed message handler or unsafe endpoint with no dedup key, version check, or naturally idempotent write, under at-least-once delivery or client retry. Cross-reference Category 2.
- **Cross-network transaction** — a storage transaction held open across an HTTP/RPC/queue call. Locks held during I/O can convert one slow dependency into a storage-wide stall.
- **Distributed transaction across services** — assess availability, coupling, recovery, and consistency against the project's accepted boundary contract. Recommend a saga, outbox, and compensation only when they fit that contract; compensation records a new business fact, not a pretend rollback of a real-world effect.
- **Unprotected concurrent invariant** — when a transactional store is in scope, identify its isolation and concurrency guarantees, then verify that read-check-write invariants cannot race. For relational databases, constraints, row/range locks, serializable execution with retry handling, or conditional writes are possible mechanisms; use the configured engine's contract rather than prescribing one mechanism universally.
- **Range invariant under row locking** — when the project uses relational row locks, verify that the selected lock/constraint protects ranges or rows that do not yet exist. Use the datastore's documented mechanism for other storage models.
- **Distributed lock / leader election** — when a changed flow uses one, verify stale-owner protection, lease expiry, and recovery against the project's storage and coordination contract. A fencing token is one proven mechanism where supported. Review quorum sizing only when the changed deployment uses a quorum protocol; derive failure tolerance from that protocol rather than applying a node-count rule to unrelated systems.
- **Distributed ordering or expiry (WARN/BLOCKED by impact):** when correctness depends on ordering across hosts or multi-region writes, assess the clock and conflict-resolution guarantees. Use the project's supported version, logical-clock, or bounded-clock mechanism; do not assume wall-clock order is sufficient.

**Staleness (WARN):**

- A newly eventually-consistent read path with **no declared, monitored staleness budget** — unbounded, unmeasured lag IS the defect.
- A read-after-write path newly routed to a replica with no **read-your-writes** guarantee (sticky read / read-from-primary / version token). Most user-visible "consistency bugs" are this, not missing linearizability.
- A replication/failover change with no declared acknowledgement semantics or data-loss window: synchronous replication buys lower RPO with write latency/availability cost; asynchronous replication buys latency with lag/failover loss risk; quorum must name read/write thresholds; multi-primary must name conflict resolution. Route runtime failover drills to `production-readiness-review`.

**Tenant isolation (only when tenant/identity-scoped data is in scope; BLOCKED by demonstrated exposure):**

- A tenant-scoped query, repository method, projection, background job, export or report with **no tenant predicate**, where the project's mechanism (row-level security / ORM global filter / mandatory repository base) does not automatically apply it. **One missing `WHERE tenant_id = ?` is a cross-tenant breach that passes every functional test.**
- `tenant_id` (or user/role/price) taken from a **client-supplied field** rather than the authenticated principal. Cross-reference `security-audit` for authz depth — this category owns only the BOUNDARY placement.
- A cache, memo, or shared in-memory map keyed WITHOUT the tenant/identity/permission dimension. **Cache-key omission is a recurring cross-tenant leak vector that no functional test detects.**
- **WARN** when a tenant-isolation change lands with no test asserting a cross-tenant read returns ZERO rows (the fitness function from Category 0).

**Migrations & schema (only when a schema change is in scope; severity by rollout impact):**

- A **breaking schema change in one deploy** — for example, dropping/renaming a field, narrowing a type, or adding a required field without a default — while the evidenced deployment strategy runs old and new versions together. Assess the migration sequence against that rollout contract; expand–contract is one option when compatible with the project's tooling and release process.
- A migration whose retry or rollback behavior violates the project's migration-runner and release contract, or that blocks writes on a large table where the documented availability target and workload require an online/batched strategy.

**Data-access structure (only when a database query or storage path is in scope; route query-plan depth to `performance-review`):**

- Unbounded query with no store-side filter or pagination on a path whose result set grows with data (memory and latency can scale with the result set). **Check row COUNT before row SIZE** — pushing a supported filter to the store beats projecting columns.
- Deep `OFFSET` pagination when keyset/cursor pagination is supported and fits the access pattern; a new query filter/FK/sort with no index when the configured datastore and workload warrant one; analytics query newly added against a primary whose project role is transactional.
- Composite index whose ordered prefix does not match the changed filter/join/sort shape, or an added index with no write-cost/plan evidence. Route plan/selectivity depth to `performance-review`.
- Distributed cache treated as source of truth (data unrecoverable after eviction/restart), a new unbounded cache, or a cache with no invalidation/consistency contract.
- A new denormalized copy with no mechanism keeping it aligned where the project contract requires it to track an authoritative source.
- A new shard/partition key with no evidence of uniform distribution + query alignment, no hot-key/whale-tenant analysis, or no resharding plan; sharding added before earlier scaling rungs are proven insufficient.
- Large immutable blobs/media/backups placed in the transactional database/block volume without access-pattern justification or object-storage comparison; database files placed on object storage without a database-supported abstraction. Block storage fits DB/filesystem random I/O; object storage fits keyed blobs and archival scale; shared file storage fits required filesystem semantics. — why: application data type and physical storage substrate are different decisions.

**Lifecycle (WARN):**

- A new field covered by the project's privacy, retention, residency, or regulated-data requirements with no applicable handling decision — retrofitting erasure into denormalized or immutable stores can be costly or constrained.
- New public identifier exposing an internal sequential PK (enumerable, leaks volume).

**Violation format:**

```
BLOCKED: {filePath}:{line} commits {stateChange} and performs {effect} without the project's required atomicity/consistency mechanism — invariant can diverge
BLOCKED: {filePath}:{line} tenant-scoped access lacks the project's required isolation enforcement — cross-tenant read possible
BLOCKED: {filePath}:{line} cache key omits tenant/identity dimension ({key}) — cross-tenant leak
BLOCKED: {migrationFile}:{line} changes schema incompatibly while old and new versions run together — use a migration sequence compatible with the release contract
BLOCKED: {filePath}:{line} concurrent check-then-act at {isolationLevel} has no store-supported protection for {invariant} — conflicting writes possible
BLOCKED: {filePath}:{line} distributed lock lacks the project's required stale-owner and recovery protection — split brain possible
WARN: {filePath}:{line} relies on wall-clock ordering where the contract requires cross-host order — use the project's supported ordering mechanism
WARN: {filePath}:{line} new eventually-consistent read path with no declared staleness budget or SLI
WARN: {filePath}:{line} adds sharding before earlier scaling rungs are proven insufficient or without a reshard/hot-key plan
WARN: {filePath}:{line} cache/CDN path has no authoritative source + invalidation/key/eviction contract
```

**MUST ATTENTION** before any Category-12 finding, record the triggering surface and classify the specific check as Applicable or N/A; inspect its actual configured mechanism and verify lower-layer enforcement before flagging. Check tenant filters only for tenant-scoped data and outbox/atomic-publication mechanisms only for state-plus-effect flows; neither is a universal requirement. — why: automatic enforcement and alternative consistency designs can make a missing call-site pattern correct.

---

## Phase 4: Finalize — Architecture Compliance Report

Update report with final sections:

### Verdict Scoring

| Verdict     | Condition                                                                        |
| ----------- | -------------------------------------------------------------------------------- |
| **BLOCKED** | 1+ BLOCKED findings — must fix before merge                                      |
| **WARN**    | 0 BLOCKED, 1+ WARN findings — review and decide                                 |
| **PASS**    | 0 BLOCKED, 0 WARN, and at least one applicable check — all applicable checks pass |
| **N/A**     | No architecture check applies to the reviewed scope; state the reason            |

### Report Structure

```markdown
# Architecture Review Report — {date}

## Scope

- Files reviewed: {count}
- Modules/services/packages affected: {list or N/A}
- Blast radius: {summary from Phase 2}

## Verdict: {PASS | WARN | BLOCKED | N/A}

## BLOCKED Findings (Must Fix)

### {Category}: {description}

- **File:** {path}:{line}
- **Rule:** {rule from project evidence: configured reference, accepted ADR, or established code pattern}
- **Evidence:** {what was found}
- **Fix:** {what to change}

## WARN Findings (Review)

### {Category}: {description}

- **File:** {path}:{line}
- **Rule:** {rule from project evidence: configured reference, accepted ADR, or established code pattern}
- **Evidence:** {what was found}
- **Recommendation:** {suggested action}

## PASS Categories

- {list of categories that passed with no findings}

## Pattern Applicability

| Check | Status | Evidence or N/A reason |
| --- | --- | --- |
| {architecture/framework/project convention} | {Applicable/N/A} | {config, configured reference, accepted ADR, or established code `file:line`} |

## Architecture Health Summary

- Quality Tooling Baseline: {PASS/WARN/BLOCKED/N/A}
- Architecture Boundaries and Layers: {PASS/WARN/BLOCKED/N/A}
- Messaging and Delivery: {PASS/WARN/BLOCKED/N/A}
- Application Patterns (CQRS/validation/mapping): {PASS/WARN/BLOCKED/N/A}
- Data Access and Repository Patterns: {PASS/WARN/BLOCKED/N/A}
- Project-Defined Service Patterns: {PASS/WARN/BLOCKED/N/A}
- Side Effects and Event Handling: {PASS/WARN/BLOCKED/N/A}
- Service and Module Boundaries: {PASS/WARN/BLOCKED/N/A}
- Frontend Architecture: {PASS/WARN/BLOCKED/N/A}
- ADR / Recorded-Decision Conformance: {PASS/WARN/BLOCKED/N/A}
- Project Spec and Test Contract: {PASS/WARN/BLOCKED/N/A}
- Scalability & Coupling Regression (4 coupling dimensions): {PASS/WARN/BLOCKED}
- Data, Consistency & Tenancy Boundaries: {PASS/WARN/BLOCKED/N/A}
- Technique applicability (advisory — INFO, does NOT alter verdict): {matrix summary or N/A-by-scale}
```

> The "Technique applicability" line is **advisory/INFO only** — it reports the scale-tier technique matrix as guidance and NEVER changes any category severity or the Phase 4 verdict.

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

## Systematic Review Strategy

Not run under `--report-only` — that mode reviews sequentially in this context.

1. **Categorize** — Group related service/layer/concern flows with their callers and rules.
2. **Choose assignments** — Follow `SYNC:systematic-review-batching`: inline, bounded sequential or authorized fresh `architect` reviewers according to risk, working-set fit and delegation cost; retain the architecture-specific checklist. File counts do not require parallelism or hierarchy.
3. **Synchronize** — Collect findings, cross-reference service boundaries.
4. **Consolidate** — Single holistic report with per-category verdicts.

---

## Phase 5: Why-Review Self-Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff — catch over-flagged Highs, false positives, severity inflation at source, not downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when report's verdict is unconditional PASS with literally zero findings. Also skip when called with `--loop-owner=caller`: the caller validates the merged report once (`$start-workflow` → Workflow-step mode).

**Protocol:**

1. Read own finalized report from `tmp/reports/{skill}-{date}-{slug}.md`
2. Invoke `$why-review` skill with arg: `validate findings in tmp/reports/{skill}-{date}-{slug}.md — verify each finding has file:line proof, steel-man each rejected interpretation, and stress-test severity classifications`
3. Read validation verdict path returned by why-review, expected as `tmp/reports/why-review-validate-{date}.md`
4. **why-review demotes/removes any finding →** UPDATE own finalized report with revised severities, remove false positives, add `## Why-Review Validation Notes` section citing what changed + why.
5. **why-review confirms all findings →** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."

**Self-audit your OWN findings FIRST (before invoking why-review):** run the 11 thinking red flags in `.claude/docs/architecture-knowledge.md` §20.3 against each draft finding and each recommendation. The four that fire most often in this skill: **you cannot name what your recommendation SACRIFICES** · **you say "best practice" instead of naming the forces it balances** · **you flagged a scale problem you cannot evidence** · **you are treating a two-way door as irreversible**. Any hit invalidates the REASONING — demote or delete the finding, do not reword it. — why: a finding that survives only because it sounds authoritative consumes the team's fix budget and trains them to ignore the report.

**Skip conditions (record explicit reason if skipping):**

- Verdict unconditional PASS with zero findings → log "Skipped — no findings to validate".
- Why-review skill itself is active context (avoid recursion).
- Called with `--loop-owner=caller` → log "Skipped — the caller validates the merged report once".


---

## Next Steps

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`$start-workflow` → Step Execution Protocol, Workflow-step mode).

**MANDATORY when standalone:** After completing, use `ask user question tool` to present:

- **"$code-simplifier" (Recommended)** — Simplify and refine code
- **"$code-quality-review"** — Deep code quality review
- **"Skip, continue manually"** — user decides

**Exempt** under `--report-only`, when a parent skill or workflow invoked this review, or when running as a sub-agent: do NOT ask — return these next-step recommendations in the returned summary and let the caller decide. — why: `ask user question tool` cannot reach the user from a sub-agent, and a leaf that waits on a prompt stalls its parent's all-return barrier.

> **Combined audit:** For a whole-project architecture + compliance + production-readiness audit in one pass, run `$architecture --mode=full` (or `$start-workflow workflow-architecture-audit`) — it fans out this skill, `architecture --mode=scalability`, and `production-readiness-review` as parallel sub-agents and synthesizes one consolidated report.

## AI Agent Integrity Gate (NON-NEGOTIABLE)

Before reporting ANY work done:

1. **Grep every removed name.** Extraction/rename/delete → grep confirms 0 dangling refs across ALL file types.
2. **Ask WHY before changing.** Existing values intentional until proven otherwise — NEVER "fix" without traced rationale.
3. **Verify ALL outputs.** One build passing ≠ all builds passing — check every affected stack.
4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
5. **New artifact = wired artifact.** Created something? Prove registered, imported, reachable by all consumers.

> **[IMPORTANT]** Use todo tracking to break ALL work into small tasks BEFORE starting. Keep task depth proportional to the work.


## Sub-Agent Type Override

> **MANDATORY:** Architecture reviews spawn `architect` sub-agent, NOT `code-reviewer`.
> Keep `agent_type: "architect"` from canonical template below; NEVER revert to `code-reviewer`.
> **Rationale:** `architect` carries cross-service impact analysis, ADR creation, multi-service security/performance context that `code-reviewer` lacks for architecture-level decisions.

<!-- OVERRIDE:review-protocol-injection -->

> **Review Protocol Injection** — Fresh reviewer prompts MUST embed 11 protocol blocks VERBATIM, copied WHOLESALE; these are review-tier renderings. When canonical `SYNC:` protocols change, update their renderings here in the same edit. Copy this template into the Agent `prompt`; replace only `{placeholders}` in Task / Round / Reference Docs / Target Files / Output. Never alter embedded sections at dispatch.
>
> **Why inline expansion:** Fresh reviewers need every rule immediately; file pointers/placeholders depend on reads or hooks that may not fire. The hybrid policy (`SYNC:shared-protocol-duplication-policy`) therefore retains all 11 full bodies in this template, copied wholesale.

### Subagent Type Selection

- `architect` — ALWAYS for architecture reviews (cross-service, ADR, security/performance at system level)
- `code-reviewer` — for code quality reviews only (NOT architecture)

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} review",
  agent_type: "architect",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}; ZERO prior-round memory. Re-read every target with your own tools. Trust no main-agent information beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
FIRST review the WHOLE PACKAGE. Read `docs/project-config.json`: valid `specArtifacts` profiles select configured `intent/contracts/evidence` roles, identifiers, ownership and test-carrier dialects; only absent profiles use strict-default §3 ACs / §4 BRs / §5 invariants / §8 TCs. Malformed/unsupported declarations are `BLOCKED`, never absent/fallback. Load governing artifact, tests, and changed code TOGETHER; judge mutual consistency before isolated checks.
1. Locate canonical owner sections, guarding tests, and implementing code. Native profiles: preserve owner path + case/scenario ID + optional variant; resolve configured carriers to actual tests. Missing faces are findings (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise; log every disagreement and classify its wrong face:
   - code vs spec: behavior absent from configured `intent/contracts` (or strict-default §3/§4/§5/§8) → CODE-EXTRA or SPEC-STALE; a hard contract/invariant with no enforcing path → CODE-WRONG.
   - tests vs spec: native case without executing assertions, or assertions absent from native rules/cases → TEST-GAP or SPEC-SILENT. Without `specArtifacts`, check strict-default §8 TCs.
   - tests vs code: uncovered changed path → TEST-GAP; test passing a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: enforced but unstated invariants (SPEC-SILENT) MUST become findings, additions to configured `intent`/`contracts`, and `evidence` links to native cases with inspected executing assertions. Without profiles, use strict-default §3/§4/§5/§8 and TC. Enrich; never silently pass.
4. Proceed only after agreement or all disagreements are logged; re-review enriched spec/test packages.
NEVER PASS unlogged spec/test/code disagreements. Diff = entry point; package = judgment unit.

### Evidence-Based Reasoning
Speculation FORBIDDEN; prove every claim.
1. Every claim: cite file:line, grep results, or framework docs
2. Confidence: >80% act freely; 60-80% verify first; <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. Insufficient evidence is valid/expected output
5. Review decision autonomy: choose evidence-supported review approaches, recommendations and next steps without asking the user. Record rationale and preserve every evidence gate. Read-only leaves return remedies to their owner. Only round-limit extension, indispensable facts with no defensible default, and actual missing action authority require a question; never infer consent, accept an open risk or perform an unauthorized operation.
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
Admit a finding only with a reachable trigger path (the caller, input or state that reaches the defect) and a consequence; a concern no supported path reaches is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher.
Classify every finding by consequence (never by effort): CRITICAL = immediate material security/safety/data-loss risk or failed binary gate → block; HIGH = material correctness, contract, privacy, or authority risk → must fix; MEDIUM = bounded consequential edge/resilience/maintainability gap → must clear the current round, or escalate with an explicit residual-risk follow-up that does not create a clean pass; LOW = non-blocking polish with no credible present impact → record/defer from round 2; `NOT VERIFIABLE` is unresolved evidence, not LOW.

### Design Patterns Quality
Every code change:
1. Consistency/reuse: follow documented patterns; justify extraction cost by repetition or real consumer need. Similar names alone never require shared bases.
2. Responsibility: follow config/references/accepted decisions/code; place behavior with its owner. Assume no entity/service/controller hierarchy or forbidden layer without evidence.
3. Apply cohesion/coupling/dependency principles where paradigm assumptions fit; SOLID suits OO boundaries, not every language/codebase.
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI: repetition prompts evaluation, never numeric extraction thresholds. Extract when shared change reasons, real consumers, or evidenced ownership/substitution lower total change cost; no hypothetical-use patterns.
6. Purpose naming: public/cross-layer abstractions name consumer capability/domain/contract, not provider/SDK/framework/database/transport. `IStorage`/`Storage` → `AzureBlobStorage`; use `IAzureStorage` only when Azure-specific semantics are intentionally part of the contract.
7. Contract-fit: read callers/all implementations; narrow over-broad abstractions (`IObjectStore`, `DocumentStore`), never reward misleading generic names.
8. Naming signals: `Manager`, `Helper`, `Utils`, `Data`, `Thing`, `Service`, `Interface`, type decorations/unexplained abbreviations are defects only when hiding purpose/scope/responsibility.
9. Concrete names: provider/strategy/transport/test-double names may distinguish real behavior (`AzureBlobStorage`, `InMemoryStorage`, `RetryingStorage`); exclude from caller contracts unless promised.
10. Preserve local interface syntax/naming: `.NET` `I` prefixes and Google TypeScript unmarked interfaces are both valid.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify behavior matches change intent.
1. Every changed file MUST serve stated purpose; flag unrelated scope creep.
2. Trace one complete success scenario through changed code.
3. Trace one failure/edge scenario through changed code.
4. With plan context, map every acceptance criterion to code.
5. Test/spec changes: tests name protected business rule/invariant and fail when it breaks.
6. Migration exclusion: no migration-code tests; schema/data migrations are one-time paths, not core application logic.
NEVER PASS without both happy/error traces.

### Test Spec Verification
Map changed code to test specs.
1. Discover test/spec format in docs, test cases, BDD features, or spec folders.
2. Every changed path MUST map to a test case/spec or be flagged "needs test case".
3. New functions/endpoints/handlers → test-spec creation flag.
4. Exclude migrations from test/spec creation: one-time execution, not core application logic.
5. Verify existing spec evidence resolves actual code (file:line); flag stale references.
6. Meaningful cases name business intent/invariants; flag implementation-mirroring behavior-only cases.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. Missing changed-path specs → log gap, recommend project test-spec workflow.
NEVER skip test mapping; uncovered paths risk production bugs.

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
Trace execution/data flow; fix the violated contract's owner, never assume the crash site.
MANDATORY before ANY fix:
1. Trace actual origin, transformations, boundaries, failure; invent no absent layers.
2. Identify invalid-state/behavior contract owner from architecture/code evidence.
3. Fix authoritative owner; retain untrusted-boundary validation. Justify multi-file fixes by owned contracts, not file-count thresholds.
4. Inspect relevant existing bypass entries: constructors/adapters/parsers/caches/persistence.
BLOCKED until: The affected path is traced; the owner is supported by file:line evidence; relevant consumers and bypass paths are checked; and the correction point fits the project's architecture.
Anti-patterns (REJECT): assuming the symptom site is the owner; scattering workarounds without tracing the contract; assuming the lowest technical layer is always authoritative; removing validation from a real trust boundary to force a single correction point.

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need todo tracking. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation (optional advice)
Optional: for high-risk blast radius (shared contract/many callers/cross-module/cross-service/public API), .code-graph/graph.db suggests callers/dependents/impacted tests. Treat it as a hint, NOT proof: stale/incomplete graphs lag uncommitted edits/unindexed paths. Verify important results by files/grep; skip low-risk/local changes. An absent or stale graph is never a finding.
Pattern: grep/read → optional graph suggestions → grep/read verification.
- High-risk investigation: trace --direction both on 2-3 entry files
- Fix/debug with wide reach: callers_of on buggy function + tests_for
- Feature touching a shared contract: connections on files to be modified
- Review of a high-risk change: tests_for on changed functions
- Blast radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Optional high-risk hints: python .claude/scripts/code_graph trace <file> --direction both --json if .code-graph/graph.db exists; verify stale-capable caller/dependent hints by files.
4. Map dependents by grep/read callers; optional graph connections/callers_of adds hints.
5. Write investigation to tmp/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Assumptions verified with evidence. (The code graph is optional advice, never a gate.)

## Reference Docs (READ before reviewing)
- code-review-rules.md, under the reference-docs root (default docs/project-reference; docsRoots.projectReference.path in docs/project-config.json overrides it)
- {skill-specific reference docs — e.g., integration-test-reference.md for `integration-test --mode=review`; backend-patterns-reference.md for backend reviews; frontend-patterns-reference.md for frontend reviews}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to tmp/reports/{review-type}-round{N}-{date}.md with sections:
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
- DO choose `architect` agent_type for architecture reviews — do NOT revert to `code-reviewer` (see Sub-Agent Type Override above)
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /OVERRIDE:review-protocol-injection -->

> **Critical Purpose:** Architecture compliance — no layer violations, no messaging anti-patterns, no service boundary breaches, no pattern drift.
> **External Memory:** Complex/lengthy work → write findings to `tmp/reports/`. Prevents context loss, serves as deliverable.
> **Evidence Gate:** MANDATORY — every finding requires `file:line` proof + confidence percentage (>80% act, <80% verify first).

## Mode protocols

The protocols below apply to this mode only; their full text is inline so this reference is self-contained.

<!-- SYNC:ai-agent-as-user-access -->

> **AI Agent as a First-Class User / Machine-Interaction Contract** — Strong recommendation when creating a greenfield system; optional, evidence-gated advice for a big feature or architecture review. Treat an AI agent as a potential non-human actor with its own identity, authority, tenancy, safety policy, and observable outcomes — not as a trusted administrator or UI automation shortcut. This supplements, never replaces, the shared authorization, API, security, and test contracts.
>
> 1. **Classify the actor and relationship.** From product and threat-model evidence, identify agent personas (user-delegated copilot, tenant automation, platform operator, service agent, integration agent), the human or organization it may act for, tenant/resource scope, trust level, allowed autonomy, data/action budgets, and human approval points. An agent is not automatically the human, tenant administrator, or platform administrator.
> 2. **Make one application capability core.** Express business use cases in a stable application boundary reused by human UI and machine surfaces. API, CLI, MCP, WebMCP, webhook/event, SDK, or batch adapters may translate contracts, but must not duplicate domain rules or bypass validation/authentication/authorization. Name and version contracts by purpose, use machine-readable input/output schemas, stable error codes, idempotency for retries, pagination or asynchronous status where needed, timeouts/cancellation, correlation IDs, quotas/rate limits, and deprecation policy.
> 3. **Choose surfaces by evidence.** Use API/OpenAPI for remote machine integrations (`https://spec.openapis.org/oas/latest.html`); CLI for local/operator/automation; MCP for LLM-host discovery of tools, resources, and prompts; WebMCP for a browser-integrated agent when an applicable browser/runtime supports it; webhooks/events for push integration; SDK only when it lowers consumer cost. Evaluate relevant surface(s) and record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, or `BLOCKED`; never build all surfaces without a user/job and owner.
> 4. **MCP contract.** When MCP is applicable, expose least-privilege, capability-oriented tools/resources/prompts over currently supported transports (stdio for local, Streamable HTTP for remote, or another explicitly justified adapter). Tool names and descriptions are concise and truthful; input/output schemas, structured results/errors, pagination, deterministic discovery, progress/cancellation, long-running task polling, idempotency, and audit/tool-call IDs are explicit. Use the official specification (`https://modelcontextprotocol.io/specification/`) and authorization guidance (`https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization`) as the current protocol references.
> 5. **WebMCP is progressive enhancement.** When a web surface and browser-agent support exist, expose narrow page capabilities through the current WebMCP draft API behind a project-owned adapter; never make the domain or primary API contract depend on a draft/browser-only feature. Register only safe, purpose-named tools, validate at server-side/application boundaries, and test direct tool execution against the UI path. Treat tool metadata, page content, and tool output as untrusted input; defend against prompt/output injection and confused-deputy behavior. The official WebMCP page currently labels the proposal a Draft Community Group Report, not a W3C Standard or Standards Track feature (`https://webmachinelearning.github.io/webmcp/`).
> 6. **Secure every agent path.** Give agents distinct authentication and authorization. Resolve delegated human, organization, service-account, or integration identity; enforce deny-by-default, least privilege, tenant/resource scope, action-specific permissions, expiry/revocation, rate/usage budgets, replay/idempotency protection, and separation of duties at the application boundary. No agent self-granting, client-supplied role/tenant claims, privilege escalation, or inbound-token passthrough to downstream services. High-impact, destructive, financial, or privacy-sensitive actions require explicit consent, preview/dry-run, or step-up policy unless an approved autonomous policy says otherwise.
> 7. **Make consent and audit inspectable.** Record who/what acted (agent identity, delegating principal, tenant, client/host, model/session/run where available), capability/tool/action, redacted inputs, policy/consent decision, result/error, correlation ID, and timestamp. Provide discoverable scopes, tool permissions, revoke/rotate paths, and human-visible confirmation for high-impact actions. Keep agent output/data boundaries and retention explicit.
> 8. **Operate it like a product surface.** Document onboarding/discovery, credentials, environment, schema/version compatibility, examples, rate/timeout/error behavior, partial-failure/retry semantics, long-running jobs, support/deprecation, and safe rollback. Monitor adoption, denied calls, latency, errors, retries, quota/cost, sensitive-data exposure signals, and anomalous behavior; provide runbooks and kill/revoke controls.
> 9. **Test the contract and equivalence.** Every agent-facing contract test names the business intent/technical contract and expresses its preconditions, action, and owned outcome in the project's native test format; Given/When/Then is one option. Verify allowed/denied/cross-tenant paths, schema compatibility, the same outcome as the human/API path, idempotent retries/replay, prompt/output injection, unsafe tool descriptions, authorization expiry/revocation, pagination, timeout/cancellation, rate limits, and audit records. Assert the outcome owned by the application, not only tool-call or transport bookkeeping.
> 10. **Apply lifecycle scope correctly.** Greenfield must produce an agent actor/access matrix, selected surfaces and rationale, capability contracts, threat/consent model, test/observability plan, and explicit owner before the first implementation plan; a warranted omission requires an explicit decision/acceptance. Big-feature and `architecture --mode=review` use this as optional advice: inspect existing setup and advise only when agent use is evidenced or a future contract is accepted; safely adapt in the slice, or create an owned `DEFER-AS-OPPORTUNITY` with owner, trigger, dependency order, smallest next step, and cost of delay. If safety/correctness requires the work, mark `BLOCKED`; never silently turn a feature into an agent-platform refactor.
>
> **Required output:** `agent/persona | relationship/delegation | identity/authn | tenant/resource scope | capabilities/actions | selected surface(s) | contract/version | consent/safety | observability/audit | status/owner/next step | acceptance/revisit trigger`.
>
> **BLOCKED until (when applicable/selected):** actor and authority are explicit · each exposed capability has an owner, schema, authz, safety policy, and observable outcome · the selected API/CLI/MCP/WebMCP adapter reuses the application capability core · allowed/denied/cross-tenant paths and high-impact controls are tested · version/discovery/rollback/telemetry are planned · greenfield omissions are explicitly accepted; otherwise record evidence-backed `NOT-APPLICABLE` or `DEFER-AS-OPPORTUNITY`.

<!-- /SYNC:ai-agent-as-user-access -->

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


<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Do not present inference as fact; ground material claims in evidence appropriate to the task.
>
> 1. Cite `file:line` for repository claims, configuration or reference paths for project rules, and URLs or artifact locations for external or observed claims.
> 2. State confidence when a conclusion is uncertain; verify material assumptions before acting and withhold recommendations when evidence is insufficient.
> 3. Trace the consumers, boundaries, or dependencies that exist in the affected path; do not assume services, modules, or architectural styles that the project does not use.
> 4. "I don't have enough evidence" is valid and expected output.
>
> **BLOCKED until:** material claims have traceable evidence, relevant searches are complete, and uncertainties are stated. Search comparable patterns when the task has existing implementations; record when none are available.
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

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

<!-- SYNC:scale-technique-gate -->

> **Scalability & Production-Readiness Technique Gate** — CONDITIONAL, evidence-gated, scale-tiered. Judge which system-design techniques a system *warrants* at its scale — flag warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight ones. **ADVICE-ONLY: emit the matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.**
>
> 1. **Derive the scale tier FIRST — from evidence, never assumed.** Read users/RPS, SLO/latency targets, data volume, tenancy, topology from config/infra/specs; cite `file:line` + confidence. Tiers: `T0` internal/single-instance · `T1` small SaaS (<10k users) · `T2` high-scale (10k–1M) · `T3` massive/multi-region (millions+). Unknown tier → state assumption, do NOT default to T3.
> 2. **Judge each concern group only at/above its warranting tier** (member techniques → owning review skill for depth):
>    - Traffic & Edge — Rate Limiting, Load Balancing, Reverse Proxy, API Gateway, CDN, Edge Caching, WAF, DDoS (T1+; CDN/WAF T2+) → security-audit owns WAF/DDoS
>    - Caching & Data Access — Caching, Cache Invalidation, DB Indexing, Query Optimization, N+1, Connection Pooling (T1+) → performance-review owns depth
>    - Data Scaling & Consistency — Read Replicas, Sharding, Partitioning, Replication, CAP, Eventual Consistency, Locks, Leader Election (T2+; sharding/multi-region T3) → performance-review
>    - Async & Messaging — Message Queues, Pub/Sub, Event-Driven, Saga, DLQ, Distributed Transactions, Backpressure, Webhooks, WebSockets/SSE (T2+)
>    - Resilience — Circuit Breakers, Timeouts, Retries, Backoff, Idempotency, Health Checks, Liveness/Readiness, Failover, Graceful Degradation (T1+) → production-readiness-review
>    - Scaling & Compute — Autoscaling, Horizontal/Vertical Scaling, Serverless Limits, Cold Starts, Cron Jobs, Thread Safety, GC/Memory Leaks (T1+; autoscaling T2+)
>    - Deployment & Release — CI/CD, Docker, Kubernetes, Blue-Green/Canary/Rolling, Rollbacks, Feature Flags, IaC/Terraform/Helm, Build Caching (CI/CD T0+; K8s/canary T2+)
>    - Observability — Monitoring, Logging, Distributed Tracing, Metrics, Alerting, SLOs/SLIs, Error Budgets (T1+; tracing/error-budgets T2+) → production-readiness-review
>    - Security & Compliance — Secrets Management, IAM, OAuth, JWT Rotation, TLS, Encryption at Rest/Transit, CORS, CSRF, SQLi, XSS, SSRF (T0+) → security-audit owns
>    - DR & Infra — Backups, Disaster Recovery, Multi-Region, Chaos Engineering, Schema Versioning, DB Migrations, Cost Optimization (backups T1+; DR/multi-region/chaos T3) → production-readiness-review
> 3. **Assign one of 4 verdicts per warranted technique:** `PRESENT` · `MISSING-WARRANTED` (→ **advise only** — guidance, NOT a score/gate lever) · `N/A-by-scale` (below warranting tier) · `OVER-ENGINEERED` (present but unwarranted at this tier → advise AGAINST).
> 4. **Anti-over-engineering guard (first-class):** do NOT recommend K8s, sharding, multi-region, service mesh, event sourcing, or distributed transactions below their warranting tier. A correctly-lean small system is a PASS, never a gap.
> 5. **Output — Technique Applicability Matrix:** `technique | tier-warranted? | present? | verdict | advice | evidence (file:line/config/infra)`. Full grouped catalog + per-tier baseline → `.claude/docs/scale-technique-catalog.md`. Hosting reviews surface this matrix WITHOUT changing any `/20`, `/24`, verdict band, or PASS/FAIL (per user decision 2026-07-06). **Drift-guard: tier thresholds & per-technique warranting tiers are AUTHORITATIVE in `.claude/docs/scale-technique-catalog.md` — the inline tier summary above is a condensed pointer; on any tier/technique change, update the catalog FIRST, then re-run `.claude/scripts/inject_scale_technique_gate.py` to re-propagate this block.**
>
> **BLOCKED until:** `- [ ]` tier derived from evidence (not assumed) `- [ ]` matrix emitted `- [ ]` over-engineering guard applied `- [ ]` advisory-only (no score/verdict mutation) confirmed

<!-- /SYNC:scale-technique-gate -->

<!-- SYNC:scenario-stress-eval -->

> **Scenario Stress & Resilience Evaluation** — CONDITIONAL, evidence-gated, business-criticality-aware. The top-down companion to `SYNC:scale-technique-gate`: instead of *"is technique X present?"*, put the system UNDER concrete failure/load scenarios and judge whether it SURVIVES, SELF-HEALS, and whether its BUSINESS needs it to. **ADVICE-ONLY: emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.**
>
> 1. **Reuse the scale tier** derived by `SYNC:scale-technique-gate` (or derive it identically from evidence); **also derive business-criticality `B0`–`B3`** from specs/SLA/product docs + the domain, cite `file:line` + confidence. `B0` best-effort · `B1` important · `B2` business-critical · `B3` mission-critical/regulated. Unknown → state the assumption, do **NOT** default to `B3`/`T3`. **Criticality-signal floor (both-directions safety):** regulated / PII / financial / health data, money movement, auth/identity, or legal-compliance scope raises `B` to **at least `B2` even absent SLA/SLO docs**; anti-over-engineering lowers hardening ONLY when NO such signal is present. `B` (blast if it fails) and `T` (scale of load/data) are independent — a low-traffic payroll run is low-`T`, high-`B`.
> 2. **Select in-scope scenarios** — only those the system's `B`/`T` combination warrants (a `B0` internal PoC skips region-loss/DR entirely; a `B3`/`T0` regulated service still needs backups + DR by BUSINESS, not scale).
> 3. **Walk each in-scope scenario:** simulate the stimulus → trace the break path → name the failure signature → answer the self-heal/recovery question (auto-recover? MTTR? manual runbook?) → name the trade-off it forces. Families: traffic spike · sustained growth · data-volume growth · write/ingest burst · dependency down/slow · instance/node loss · zone/region loss · **data loss/corruption** · poison-message/retry-storm · cascading failure/backpressure · cold-start/deploy-blip · clock-skew/duplicate-delivery.
> 4. **Assign one verdict per scenario:** `WITHSTANDS` · `DEGRADES-GRACEFULLY` · `FAILS-HARD` (→ **advise only**) · `N/A-by-business` (not warranted → skip, not a gap) · `OVER-HARDENED` (resilience beyond business need → **advise AGAINST**, cite carrying cost).
> 5. **Anti-over-engineering guard (first-class):** a lean system whose business does not need HA/DR is a PASS; `OVER-HARDENED` flags resilience the business does not warrant. This guard is symmetric with the criticality-signal floor above — never under-harden a `B2`+ system just because its traffic is low.
> 6. **Output — Scenario Stress Matrix:** `scenario | in-scope (B/T)? | verdict | self-heal | trade-off | evidence (file:line/config/infra)`. Full catalog + Business×Scale in-scope baseline + verdict/tier tables → `.claude/docs/scenario-stress-catalog.md`. **ADVISORY-ONLY: NEVER mutate any `/20`, `/24`, verdict band, or gate pass/fail. Drift-guard: scenarios/verdicts/business-tiers are AUTHORITATIVE in the catalog — update it FIRST, then re-run `.claude/scripts/inject_scenario_stress_gate.py`. Scale tier stays single-sourced in `scale-technique-catalog.md`.**
>
> **BLOCKED until:** `- [ ]` scale tier + business-criticality (with criticality-signal floor) derived from evidence `- [ ]` in-scope scenarios selected `- [ ]` matrix emitted `- [ ]` over-hardening guard applied `- [ ]` advisory-only (no score/verdict mutation) confirmed

<!-- /SYNC:scenario-stress-eval -->

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
> **Stop conditions:** confidence <70% on any critical decision → stop and escalate via ask user question tool (70-80% → verify first) · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).

<!-- /SYNC:sequential-thinking-protocol -->

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

<!-- SYNC:sub-agent-selection -->

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** Route specialized domains (architecture, security, performance, DB, E2E, integration-test, git) to the matching specialist agent (see guide above) — NEVER use `code-reviewer` for these. — why: `code-reviewer` lacks each domain's checklist, so specialized issues slip through.

<!-- /SYNC:sub-agent-selection -->

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

<!-- SYNC:measured-capacity-engineering -->

> **Measured Capacity Engineering** — Apply when planning, building, testing or reviewing a hot path, cache, capacity claim or scaling decision. Preserve the hosting skill's authority, phase order, scores and gates; unrelated work skips this protocol. **Priorities:** model demand and the SLO, remove measured work safely, then prove capacity and recovery before adding infrastructure.
>
> 1. **Define capacity as a workload contract.** Record endpoint/journey mix, think time, reads/writes, payloads, data volume/skew, authentication, environment and latency/error targets. Distinguish active sessions, open connections, in-flight requests, offered RPS and achieved successful RPS. A benchmark's hardware price, user count or CPU limit is not a portable capacity guarantee; DAU requires a separate usage model.
> 2. **Choose and disclose the load model.** Use closed-loop users for journeys; use an open arrival-rate model when testing independently arriving demand. Closed loops can reduce offered traffic as latency rises. Report attempted/completed work, errors/timeouts and dropped iterations, verify generator headroom, and separate component tests from the full journey. Repeat controlled runs with realistic data, warm steady state, cold/expiry cache, sustained load and recovery as warranted; static evidence yields a verification plan, never an invented capacity result.
> 3. **Locate the limiting resource.** Correlate tail latency with queue/pool wait and per-process CPU, runtime stalls, memory/GC, database query plans and lock waits, disk and network. Co-located components compete for resources; high aggregate CPU alone does not identify its owner. Compare one hypothesis-changing optimization at a time under the same workload, then re-profile because the bottleneck can move.
> 4. **Reduce work before multiplying resources.** Bound/filter at the data source, verify query access paths, batch repeated calls, trim payloads and keep synchronous hot-path work small. Select the smallest evidenced fix; urgent capacity or availability requirements can justify scaling first. Read `.claude/skills/performance-review/references/performance-knowledge.md` §10.1 when designing a capacity experiment and §6.1 before selecting a cache layer.
> 5. **Place reuse at the earliest safe boundary.** Compare request/process, shared data and proxy/client caches by work avoided, hit rate, key cardinality, freshness and operating cost. Cache lookup must preserve authorization and all response-varying inputs; personalized data is private/bypassed unless isolation and authorization before every hit are proven. Bound bytes/entries, lifetime and refill concurrency; specify write invalidation, stale-data policy, cross-instance behavior and cold-cache fallback. Verify cross-user isolation and mutation visibility as well as speed.
> 6. **Budget overload and recovery.** Find the measured SLO boundary and keep justified headroom; no universal CPU percentage defines safety. Bound queues, concurrency, pools, retries and dependency demand across all replicas. Exercise cache loss, deploy/warmup and overload: verify bounded degradation/shedding and recovery after demand falls, without dropping correctness, authorization or durability to win a benchmark.
> 7. **Scale the evidenced owner incrementally.** Compare tuning/offload and vertical capacity with horizontal replicas or component separation; name state/session/cache coherence, shared dependency limits, availability and operational costs. A single-instance design can be efficient while failing an availability requirement. Choose distribution only for measured pressure or explicit business/availability needs, with an owner, revisit trigger and reversible next step.
>
> **Evidence output:** workload/SLO/environment | load model and offered/achieved demand | limiting-resource proof | before/after distributions and errors | cache correctness/cold-state proof (if applicable) | headroom/recovery | cost/trade-off and next scaling trigger. Record unavailable measurements explicitly. **Closing priorities:** model demand → reduce work safely → prove capacity/recovery; retain the hosting contract and never generalize anecdotal numbers.

<!-- /SYNC:measured-capacity-engineering -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**Optional advice:** the code graph (`.code-graph/graph.db`) can hint at a high-risk blast radius grep misses; it can be stale, so verify by reading files. Never required.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** use structured reasoning for complex or ambiguous work, implicitly when visible markers would clutter. Verify hypotheses, revise assumptions, and close with confidence, assumptions, open questions and a concrete next action.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

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

<!-- SYNC:scale-technique-gate:reminder -->

**IMPORTANT MUST ATTENTION** scale-technique gate: derive the scale tier from evidence FIRST (T0 internal · T1 <10k · T2 10k–1M · T3 millions+), then judge each warranted technique `PRESENT`/`MISSING-WARRANTED`/`N/A-by-scale`/`OVER-ENGINEERED`. Advise on warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight techniques (anti-over-engineering). **ADVICE-ONLY — emit the Technique Applicability Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scale-technique-catalog.md` (authoritative for tier thresholds & per-technique warranting tiers — on any change update the catalog FIRST, then re-run `inject_scale_technique_gate.py`).

<!-- /SYNC:scale-technique-gate:reminder -->

<!-- SYNC:scenario-stress-eval:reminder -->

**IMPORTANT MUST ATTENTION** scenario-stress gate: reuse the scale tier `T0`–`T3` AND derive business-criticality `B0`–`B3` from evidence first — apply the **criticality-signal floor** (regulated/PII/financial/health data · money movement · auth/identity · legal-compliance → at least `B2` even absent SLA docs; do NOT default to `B3`). Select only the scenarios the `B`/`T` combination warrants, then walk each (simulate → trace → failure signature → self-heal/MTTR → trade-off) and assign `WITHSTANDS`/`DEGRADES-GRACEFULLY`/`FAILS-HARD`/`N/A-by-business`/`OVER-HARDENED`. Anti-over-engineering is first-class (a lean system that needs no HA/DR is a PASS) AND symmetric (never under-harden a `B2`+ system for low traffic). **ADVICE-ONLY — emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scenario-stress-catalog.md` (authoritative for scenarios/verdicts/business-tiers — on any change update the catalog FIRST, then re-run `inject_scenario_stress_gate.py`; scale tier stays single-sourced in `scale-technique-catalog.md`).

<!-- /SYNC:scenario-stress-eval:reminder -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `$start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses


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


<!-- SYNC:ai-agent-as-user-access:reminder -->

**IMPORTANT MUST ATTENTION** Greenfield strongly recommends treating AI agents as first-class non-human actors from inception; choose evidence-backed API/CLI/MCP/WebMCP/event/SDK surfaces over one application capability core with authorization, consent, schemas, idempotency, audit, contract tests in the project's native format (GWT is one option), and observability. Big feature and architecture review are optional/advisory: inspect evidence, adapt, defer as an owned opportunity, record `NOT-APPLICABLE`, or block safety gaps; never build every surface or assume agent = administrator.

<!-- /SYNC:ai-agent-as-user-access:reminder -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Review changed code against project-evidenced architecture and contracts; preserve invariant and data ownership, consistency, coupling, boundary quality, and generated artifact integrity; hand off evidence-backed PASS/WARN/BLOCKED findings and concrete next steps.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Graph-Assisted Investigation (optional):** the code graph is a stale-able hint for high-risk blast radius, never required.
- **Nested Task Creation:** Child skill expands visible phase tasks; link parent when nested.
- **Task Tracking External Report:** Bootstrap tasks; persist plan/review findings to `tmp/reports/` incrementally.
- **Sequential Thinking Protocol:** Multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS markers and confidence closer.
- **Evidence-Based Reasoning:** Cite `file:line` for every claim; <60% confidence = do NOT recommend.
- **Double-Round-Trip Review:** Validate findings, fix only current-round blocking findings, and full re-review until the round severity bar is clear (Round 1: zero open findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred; binary gates always block).
- **Sub-Agent Selection:** Route specialized domains to the matching specialist agent, NEVER `code-reviewer`.
- **Source/Test Drift Check:** Source behavior changes → inspect affected tests; decide fix vs update.
- **Systematic Review Batching:** choose inline, bounded sequential or authorized fresh review from risk, related flows, fit and delegation cost; reconcile complete coverage.
- **Severity Rubric:** Classify by consequence Critical/High/Medium/Low using `SYNC:severity-rubric`; round 1 blocks on every open validated finding (LOW deferral), round 2 blocks only CRITICAL/HIGH/MEDIUM, and LOW is recorded/deferred. Failed binary gates always block.
- **Category Review Thinking:** Derive each category's concerns from first principles with evidence, NEVER a checklist.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.
- **AI Agent as User:** Optional, evidence-gated review of agent identity/delegation, least-privilege capabilities, selected API/CLI/MCP/WebMCP/event surfaces, safety/consent, contract tests, audit, and observability; record N/A, owned deferral, or blockers rather than inventing gaps or expanding scope.

**IMPORTANT MUST ATTENTION** read `docs/project-config.json` and resolve applicable architecture references in Phase 0 BEFORE reviewing — project config, configured references, accepted ADRs, and established code determine the rule; never assume a stack, path, or framework convention from general knowledge — why: hardcoded framework names rot on rename and break portability to other repos.
**IMPORTANT MUST ATTENTION** every violation requires `file:line` proof + confidence >80% (60-80% verify first, <60% do NOT recommend); inspect 3+ relevant code examples when the code establishes the pattern, and check for exceptions where relevant. Use config, references, and accepted ADRs as direct evidence; surface conflicting evidence instead of choosing silently. NEVER speculate — instead state "Insufficient evidence. Verified: [...]. Not verified: [...]."
**IMPORTANT MUST ATTENTION** review serially, one category at a time (Cat 0 tooling baseline → Cat 12 data, consistency & tenancy): doc rule → source evidence → `Think:` derivation → PASS/WARN/BLOCKED. NEVER scan categories simultaneously — why: parallel scanning collapses per-category evidence and drops findings.
**IMPORTANT MUST ATTENTION** review every applicable Phase-3 category and record each concrete architecture, framework, stack, transport, persistence, or project-convention check as Applicable or N/A with project evidence — never stop early. Category subjects: 0 quality tooling · 1 actual architecture boundaries · 2 messaging/delivery · 3 application conventions · 4 data access · 5 project-defined service eras · 6 side effects/events · 7 service/module boundaries · 8 frontend conventions (frontend files only) · 9 ADR conformance · 10 spec-loop discipline · 11 scalability/coupling · 12 data, consistency, and tenancy. N/A skips only the named implementation pattern; assess invariant ownership, data ownership, idempotency, coupling, and boundary quality wherever the changed flow makes them relevant — why: the review catches real regressions without turning framework examples into false requirements.
**IMPORTANT MUST ATTENTION** judge coupling in FOUR separate dimensions — code, temporal (runtime), semantic (contract), operational (deployment). Low code coupling proves nothing: the distributed-monolith signature is low code coupling + high temporal + semantic + deployment coupling (services releasing together, shared DB or shared domain lib, sync chain ≥4 hops) — why: a diff that deepens it looks clean file-by-file and makes the exit permanently harder.
**IMPORTANT MUST ATTENTION** prove workload before technique — read/write ratio, peak load, query shapes, growth, hot-key skew, geography and consistency budgets — then judge measure/tune → vertical and/or stateless horizontal from headroom + availability → cache/CDN/read replicas or queue/LSM write path → partition/shard LAST. No evidence = INFO/route, NEVER a scale violation; a lean system that meets its targets is compliant.
**IMPORTANT MUST ATTENTION** check high-consequence data and consistency risks only when their trigger applies: state-plus-effect flows without a contract-compatible consistency mechanism · repeatable work without sufficient idempotency · tenant-scoped access without the project's isolation enforcement · incompatible schema changes during overlapping releases · unbounded outbound work · concurrent invariants without store-supported protection · distributed locks without stale-owner/recovery protection. Outboxes, tenant predicates, SQL isolation/locks, and fencing tokens are possible mechanisms, not universal requirements; inspect the project's actual contract and implementation — why: the failure modes are broadly relevant but their correct protections depend on the system.
**IMPORTANT MUST ATTENTION** self-audit your OWN draft findings against the 11 thinking red flags (`.claude/docs/architecture-knowledge.md` §20.3) BEFORE Phase 5 — a finding whose SACRIFICE you cannot name, one resting on "best practice", one asserting a scale problem with no evidence, or one treating a two-way door as irreversible is DEMOTED or DELETED, never reworded — why: a finding that survives on authoritative tone alone consumes the team's fix budget and teaches them to ignore the report.
**IMPORTANT MUST ATTENTION** when the project uses modules or port/adapter boundaries, judge a module by functionality hidden ÷ interface surface and check whether a port is declared where the project dependency rule requires it; otherwise assess actual cohesion and coupling without requiring a port pattern — why: interface count alone does not prove useful modularity.
**IMPORTANT MUST ATTENTION** universal architecture knowledge (`.claude/docs/architecture-knowledge.md`) is a RECOGNITION aid, never authority — project reference docs and accepted ADRs OUTRANK it, an anti-pattern match is a HYPOTHESIS until `file:line`/config/topology evidence AND the damaged quality attribute are both named, and a grepped codebase convention beats any catalog entry — why: catalog-shaped false positives are confident, plausible, and the most expensive output this skill can produce.
**IMPORTANT MUST ATTENTION** follow the phase order Phase 0 → 1 → 2 → 3 → 4 → 5 → Next Steps; Phase 5 `$why-review` self-validation is MANDATORY whenever any finding exists, and Next Steps MUST present `$code-simplifier` / `$code-quality-review` / skip via `ask user question tool` when standalone (under `--report-only`, a parent skill/workflow, or a sub-agent, return them in the summary instead) — why: the AI repeatedly forgets the validation gate and stops at Phase 4, shipping unvalidated severities downstream.
**IMPORTANT MUST ATTENTION** `--report-only` declares Phases 0–5 only — scope from the caller's brief, no fix, no restart, no nested sub-agent fan-out, no `ask user question tool`, no writer beyond the report; return the report path plus validated findings grouped Critical/High/Medium/Low via the BLOCKED/WARN mapping — why: a read-only leaf that fixes, fans out, asks, or regenerates docs stalls or races its barrier siblings.
**IMPORTANT MUST ATTENTION** break work into small tasks using todo tracking BEFORE starting; mark one `in_progress`/`completed` at a time; on context loss call the current task list first — why: resume existing tasks, never duplicate after compaction.
**IMPORTANT MUST ATTENTION** stay in lane — deep-review only what this skill OWNS (layers, messaging/CQRS/repos/service boundaries, entity events, frontend architecture, quality tooling, generated artifacts, ADRs); record a one-line `→ route to {sibling}` pointer for security/performance/DDD/UI/integration-test findings instead of expanding them
**IMPORTANT MUST ATTENTION** each framework, base-class, directory, transport, storage, test, and file-layout check anywhere in this skill needs its own applicability evidence from config, project references, accepted ADRs, or established code; record unsupported or explicitly N/A patterns as N/A and NEVER flag their absence.
**IMPORTANT MUST ATTENTION** scope tooling/ADR/spec-loop severity to the change — a pre-existing gap unrelated to the diff is WARN with one note, reserve BLOCKED for a new stack/service with no gate, a change removing an existing gate, an accepted-ADR contradiction with no superseding ADR, or an evidenced `[HARD]` rule/invariant lacking test protection required by the project's contract — why: blocking on standing change-unrelated conditions buries the regression the diff actually introduced.
**IMPORTANT MUST ATTENTION** when the project maintains a spec/test contract, review the WHOLE package (spec + tests + structural diff), not the diff alone — each behavior-affecting finding carries a Dual-Feedback row in the project's format. Otherwise record the spec axis N/A and assess the project's actual test contract; do not invent a spec requirement — why: a boundary change that compiles but is never asserted can regress silently when a sibling caller is next touched.
**Optional advice:** for a high-risk cross-service blast radius grep may miss, the code graph can add hints — it may be stale; verify by reading. Never required.
**IMPORTANT MUST ATTENTION** evaluate pattern fit before flagging — copying-nearby ≠ matching preconditions; verify the same scope, lifetime, project contract, constraints, and established exceptions before calling a deviation a violation.
**IMPORTANT MUST ATTENTION** review-only and caller-owned passes stay read-only; standalone `--fix-loop` fixes only validated findings within scope; after ANY finding run the Phase 5 `$why-review --validate-findings` self-validation gate BEFORE handoff, and every validated fix restarts a full review from Phase 0 with a fresh task breakdown — why: AI reports inherit confirmation bias; adversarial validation demotes false-positive Highs at the source.
**IMPORTANT MUST ATTENTION** write findings to `tmp/reports/arch-review-{date}-{slug}.md` incrementally and synthesize from disk; use `ask user question tool` to present next steps (`$code-simplifier` / `$code-quality-review` / skip) after completing a standalone review — why: long reviews exhaust context before a final batch write, losing findings.

**Anti-Rationalization:**

| Evasion                              | Rebuttal                                                           |
| ------------------------------------ | ------------------------------------------------------------------ |
| "Tests pass, so the data path is fine" | When data, messaging, locking, or tenancy is in scope, inspect the relevant Category 12 consistency and ownership contract; functional tests alone may miss these failures. |
| "It is inside a transaction, so it is atomic" | When a transactional store is in scope, name its isolation level and engine, then assess the actual concurrent invariant. |
| "It takes a distributed lock, so it is exclusive" | When a distributed lock is in scope, verify the project's stale-owner and recovery protections, including fencing where its contract requires it. |
| "These two blocks look the same — extract them" | Same shape ≠ same reason to change. Rule of three, and the wrong abstraction costs more than duplication. |
| "Data/migration concerns belong to the DBA" | They are the least reversible decisions in the diff. Category 12 owns the boundary; route only query-plan depth to `performance-review`. |

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->
