---
name: code-quality-review
version: 2.4.0
description: '[Code Quality] Use when evaluating received review feedback, reviewing named code on request, or verifying a completion claim. Current diffs: changes-review; rationale: why-review.'
execution-mode: subagent
context-budget: critical
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

> **Review modes:** For review/audit work, standalone defaults to `--review-only` (`--report-only` alias); `--fix-loop` enables review → validate → authorized fix → fresh re-review, default cap 3. `--fix-loop --loop-owner=caller` returns a read-only pass to the caller that owns fixes/re-review. Create triage, review, validation and re-review todo tasks first; apply the carried `review-policy` contract for LOW deferral and user-approved bounded extensions. Non-review modes and terminal findings validation keep their own dispatch.

**Goal:** Verify feedback, request targeted code-reviewer reviews, and gate completion claims so accepted code is correct, easy to change and convention-aligned.

**Summary:**

- Evaluate feedback, review named code, or verify completion; current/branch diffs route to `changes-review`. Prepared inputs establish scope, never acceptance.
- Create report → assess blast radius and full-pipeline impact → detect risks, plan compliance and surfaces → review each file → holistic assessment → final result → validate findings → fix validated blockers → full re-review after fixes.
- Direct named-code reviews resolve the requested files and applicable rules, including a conditional domain entity quality task for new or updated entities. Feedback evaluation uses the supplied evidence. Trace consumers/dependents and tests; cite `file:line` before acceptance.
- Round 1 closes every validated severity; from round 2 CRITICAL/HIGH/MEDIUM block and LOW-only defers. Failed binary gates always block; retain the shared LOW deferral and fresh post-fix evidence rule.

> **Routing boundary:** If the user asks to review current changes, uncommitted work, staged/unstaged diffs, or a branch-to-branch diff, use `changes-review` instead.

> **Dispatched as a leaf reviewer** (a sub-agent whose brief assigns your scope): review exactly that scope with every review rule in this skill and return the report. Batching, fan-out, validation passes, the fix loop, re-review rounds, user questions and next steps belong to your caller — except the in-batch `/why-review --validate-findings` over your own report that a batch brief explicitly assigns under the shared adaptive review plan, which you run and record as `validated: in-batch`. When the scope is too large to review well, say so in your return instead of sampling or spawning reviewers.

> **Shared engine (keep in sync):** `code-quality-review` and `changes-review` share the same review-protocol `SYNC:` blocks. Canonical source: `.claude/skills/shared/sync-inline-versions.md`; policy: `SYNC:shared-protocol-duplication-policy`. When you change a shared block in one skill, update the canonical file AND the sibling skill so the two never drift. The skills differ only in entry intent (explicit scope / feedback / completion-gate vs git diff) — not in review quality.

> **MANDATORY** Before reviewing, search for project-specific reference docs:
>
> **Coding standards** — search: `code-review-rules`, `coding-standards`, `style-guide`, `contributing`
> **Architecture** — search: `patterns-reference`, `architecture`, `adr`
> **Test conventions** — search: `integration-test-reference`, `test-guide`, `test-conventions`
> **Design system** — search: `design-system`, `design-tokens`, `component-library`
>
> Read found docs relevant to the selected surface; UI design authorities apply to UI changes. Resolve the canonical artifact/case profile from config and required references before spec/test checks: use native owners, roles, IDs, carriers and cardinality when declared; strict §3/§4/§5/§8 and TC examples below apply only when absent. Invalid or unresolved declarations stay BLOCKED; do not create a shadow registry. None found → inspect local code/config and state material assumptions.

**Workflow:**

1. **Create Review Report** — Init `tmp/reports/code-review-{date}-{slug}.md`

2. **Phase 0: Blast Radius** — assess by grep/read first; an optional graph hint when the change looks high-risk
3. **Phase 0.1: Change Context & Full-Pipeline Impact Trace (MANDATORY comprehension-first)** — Note the change context, then holistically trace the main affected area's full pipeline across BOTH boundaries — client↔server tier (FE↔BE) AND service/event/external — classifying each seam/touchpoint NONE/ADDITIVE/BREAKING (explicit N/A for single-tier or monolith)
4. **Phase 0.3: Risk Detection** — Detect dependency, migration, bus/event, API, security, config, and infra risks
5. **Phase 0.5: Plan Compliance** — Verify changed files and tests against active plan when present
6. **Phase 0.7: Surface Detection** — Classify files by language + directory semantics + change nature → route sub-agents; invoke `/ui-design --mode=review` when frontend/UI files are present
7. **Phase 1: File-by-File** — Review each file, update report with correctness, convention, DRY, intent, test, and docs checks
8. **Phase 2: Holistic** — Re-read accumulated report, assess overall approach, architecture, duplication, and cross-boundary behavior
9. **Phase 3: Final Result** — Update report with overall assessment, critical issues, recommendations, docs staleness, and test gaps
10. **Fix Loop: Validate → Fix → Full Re-Review** — When findings exist, validate them first, fix only validated findings that block the current round, then restart the full review after the fix cycle (including round-1 LOW fixes); round-2 LOW-only findings are recorded/deferred and do not open another round.

**Key Rules:**

- **Report-Driven**: Build report incrementally; re-read for big picture
- **Detect First**: Assess blast radius (grep/read; an optional graph hint may help), then classify change types and file surfaces before any review
- **Easy to Change for Code**: Treat future change cost as the primary code-quality metric; DRY, SOLID, abstraction, and patterns are tools only when they reduce change amplification
- **No Performative Agreement**: Technical evaluation only ("You're right!" banned)
- **Verification Gates**: Evidence required before completion claims
- **Review Current Diffs Elsewhere**: Current changes, staged/unstaged diffs, and branch diffs belong to `changes-review`
- **A clean review pass ENDS the review once the persisted `minRounds` is met.** Do not spend a fresh-context pass re-reviewing known findings before validation/fix; re-review after fixes change the target or to satisfy an explicitly declared independent-pass minimum.

## Contents

- [Quick Summary](#quick-summary)
- [Code Review](#code-review)
- [Review Mindset (NON-NEGOTIABLE)](#review-mindset-non-negotiable)
- [First Principle — Easy to Change · Easy to Scale · Easy to Maintain](#first-principle--easy-to-change--easy-to-scale--easy-to-maintain)
- [Core Principles (ENFORCE ALL)](#core-principles-enforce-all)
- [Graph-Enhanced Review (optional advice)](#graph-enhanced-review-optional-advice)
- [Review Approach (Report-Driven Two-Phase — CRITICAL)](#review-approach-report-driven-two-phase--critical)
- [Validated Fix + Full Re-Review (MANDATORY when findings are fixed)](#validated-fix--full-re-review-mandatory-when-findings-are-fixed)
- [Clean Code Rules (MUST ATTENTION CHECK)](#clean-code-rules-must-attention-check)
- [Data Lifecycle Rules (MUST ATTENTION CHECK)](#data-lifecycle-rules-must-attention-check)
- [Legacy Pattern Compliance](#legacy-pattern-compliance)
- [When to Use This Skill](#when-to-use-this-skill)
- [Quick Decision Tree](#quick-decision-tree)
- [Receiving Feedback Protocol](#receiving-feedback-protocol)
- [Requesting Review Protocol](#requesting-review-protocol)
- [Verification Gates Protocol](#verification-gates-protocol)
- [Related](#related)
- [Systematic Review Strategy](#systematic-review-strategy)
- [Architecture Boundary Check](#architecture-boundary-check)
- [Phase 4: Why-Review Self-Validation Gate (MANDATORY when findings exist)](#phase-4-why-review-self-validation-gate-mandatory-when-findings-exist)
- [Next Steps](#next-steps)
- [AI Agent Integrity Gate (NON-NEGOTIABLE)](#ai-agent-integrity-gate-non-negotiable)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

# Code Review

Three practices: receiving feedback with technical rigor, requesting systematic reviews via code-reviewer subagent, enforcing verification gates before completion claims.

> Optional: `python .claude/scripts/code_graph query tests_for <function> --json` on changed functions can hint at coverage gaps (verify by reading the tests).

## Review Mindset (NON-NEGOTIABLE)

**Skeptical. Every claim needs traced proof `file:line`. Confidence >80% to act.**

- NEVER accept code correctness at face value — trace call paths
- NEVER include finding without `file:line` evidence (grep results, read confirmations)
- ALWAYS question: "Does this actually work?" → trace it. "Is this all?" → grep cross-service
- ALWAYS verify side effects: check consumers + dependents before approving

## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles`, published at `.claude/skills/shared/protocols/core-engineering-principles.md`; read its full text when absent from current context; its closing digest ends this file.

**Skill focus:** favor project-owned boundaries around external libraries (for example component/service input-output contracts) when they localize future library changes; reject pass-through wrappers that add ceremony without lowering change cost.

---

## Core Principles (ENFORCE ALL)

| Principle          | Rule                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| **YAGNI**          | Flag code solving hypothetical problems (unused params, speculative interfaces)                             |
| **KISS**           | Flag unnecessary complexity. "Is there a simpler way?"                                                      |
| **DRY**            | Compare repeated responsibilities; share only with aligned ownership/change reasons and lower change cost                                  |
| **Clean Code**     | Readable intent, cohesive responsibilities and purposeful names; size/nesting signal investigation, not automatic refactors              |
| **Convention**     | MUST ATTENTION grep 3+ existing examples before flagging violations. Codebase convention wins over textbook |
| **No Bugs**        | Trace logic paths. Verify edge cases (null, empty, boundary). Check error handling                          |
| **Proof Required** | Every claim backed by `file:line` evidence. Speculation is forbidden                                        |
| **Doc Staleness**  | Cross-ref changed files against related docs. Flag stale/missing updates                                    |

**Technical correctness over social comfort.** Verify before implementing. Evidence before claims.

## Graph-Enhanced Review (optional advice)

For a high-risk shared contract, many callers, cross-module/service flow or public API, `.code-graph/graph.db` may suggest callers, dependents and impacted tests beyond grep/read. Its hints can lag uncommitted or unindexed files; verify them by reading. Skip low-risk/local work. Possible queries:

1. `python .claude/scripts/code_graph graph-blast-radius --json` — prioritize files by impact (most dependents first)
2. `python .claude/scripts/code_graph query tests_for <function_name> --json` — flag untested changed functions
3. `python .claude/scripts/code_graph trace <file> --direction downstream --json` — downstream impact (events, bus, cross-service)
4. `python .claude/scripts/code_graph trace <file> --direction both --json` — full flow context for controllers/commands/handlers
5. A wide graph blast radius (>20 impacted nodes) is a rough high-risk hint — confirm by reading before flagging it in the report.

## Review Approach (Report-Driven Two-Phase — CRITICAL)

**MANDATORY FIRST: Create Todo Tasks**

| Task                                                                   | Status      |
| ---------------------------------------------------------------------- | ----------- |
| `[Review] Create report file`                                          | in_progress |
| `[Review Phase 0] Assess blast radius (grep/read; optional graph hint)` | pending     |
| `[Review Phase 0.1] Note change context + holistic full-pipeline trace across BOTH boundaries — client↔server tier (FE↔BE) AND service/event/external — classify each seam/touchpoint NONE/ADDITIVE/BREAKING (MANDATORY comprehension-first; N/A for single-tier/monolith)` | pending     |
| `[Review Phase 0.3] Detect high-risk change types`                     | pending     |
| `[Review Phase 0.5] Plan compliance check (skip if no active plan)`    | pending     |
| `[Review Phase 0.7] Detect categories + route sub-agents`              | pending     |
| `[Review Phase 0.7b] /ui-design --mode=review sub-review — skip if no frontend/UI files in changeset` | pending     |
| `[Review Phase 0.7c] Domain entity quality — conditional on new or updated domain entities, value objects or aggregates` | pending |
| `[Review Phase 1] File-by-file review + update report`                 | pending     |
| `[Review Phase 2] Holistic assessment`                                 | pending     |
| `[Review Phase 3] Final findings, docs triage, and test sync findings` | pending     |
| `[Review Fix Loop] Validate findings, fix validated blocking findings, and full re-review until the current severity bar is clear` | pending     |
| `[Review Final] Consolidate all rounds`                                | pending     |

**Step 0: Create Report File**

Create `tmp/reports/code-review-{date}-{slug}.md` with Scope, Files to Review sections.

**Phase 0: Blast Radius (grep/read first; optional graph hint)**

Assess impact by grep/reading callers and dependents before reviewing. Optional, for a high-risk change when `.code-graph/graph.db` exists: `python .claude/scripts/code_graph graph-blast-radius --json` (or the project equivalent) can add hints — it may be stale or incomplete, so verify by reading.

- Record impacted files count, untested changed functions, and risk level in the report (mark graph-derived numbers as hints)
- Prioritize high-impact files during Phase 1

Without a graph (or with a stale one), proceed to Phase 0.1 on grep/reading; never a finding.

**Phase 0.1: Change Context Comprehension & Full-Pipeline Impact Trace (MANDATORY — comprehension-first)**

> **MANDATORY:** Before file-by-file or dimensional review, comprehend the change and trace the main affected pipeline across every boundary. Phase 0 supplies impact data; apply **Cross-Stack Impact Trace** and **Cross-Service Check** here to inform Phase 0.3 risk tasks and Phase 2 assessment, preserving both later phases.

Write a one-paragraph **Change Context** note (what changed · intent · originating tier · main affected feature/flow), then run both traces per the **Cross-Stack Impact Trace** and **Cross-Service Check** protocols (full published sources named by the guides; read applicable text absent from current context).

**Phase 0.3: Detect High-Risk Change Types**

Before file review, inspect the target diff or explicit file set for:

- Bugfix, failed verification, stale/incorrect final output, regression, or behavior-changing fix — require `Debugger Trace: End -> Start`, all feeder paths, hypothesis matrix, owning fix layer, and forward convergence proof; missing trace evidence is a High/Critical review finding
- Dependency upgrades — semver, breaking changes, advisories, peer compatibility
- Migrations or schema changes — rollback, lock/volume impact, zero-downtime deployment, idempotent backfill
- Bus events/messages — consumer existence, idempotency, retries, poison/dead-letter handling
- API contract changes — backward compatibility, caller alignment, auth, required response fields
- Security changes — enforcement coverage, privilege escalation, negative tests, duplicated permission strings
- Config/env changes — all environments covered, no secrets, fail-fast behavior, setup docs
- Infra changes — dev/prod parity, pinned versions, CI/CD permissions, reproducible builds

Create focused review tasks for every true signal and complete them before dimensional review.

**Phase 0.5: Plan Compliance Check (CONDITIONAL)**

If active plan context exists, verify scope, test evidence, and success criteria against the plan before file review; otherwise record the skip reason.

**Goal Contract mapping (CONDITIONAL — when an active goal exists):** Resolve the active Goal Contract per the goal-contract-satisfaction-loop protocol (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`; plans root default `plans/`, overridable via `docsRoots.plans.path` in `docs/project-config.json`). When found, map the reviewed changes to the saved success criteria in the report — which criteria this changeset advances (with `file:line` evidence), which it leaves untouched, and any change serving NO saved criterion (flag as scope drift unless justified). Record `No active goal — mapping skipped.` when none exists; do NOT create a goal file from inside a review.

**Phase 0.7: Detect Review Categories**

Before any review — classify the changeset and route sub-agents:

| Signal in changed files                  | Route to                                                |
| ---------------------------------------- | ------------------------------------------------------- |
| Auth/permission/token/encryption files   | `security-auditor`                                      |
| Query files, caching, batch processing   | `performance-optimizer`                                 |
| Source code (logic, handlers, services)  | `code-reviewer`                                         |
| Frontend/UI files (components, templates, `.html`/`.scss`/`.css`, design-system) | `/ui-design --mode=review` (see Phase 0.7b) |
| AI surface? Only if the change creates or changes a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`) | read `.claude/skills/shared/protocols/ai-engineering-gate.md`; `/ai-engineering-review --report-only`, fold its findings in; otherwise skip this row |
| Docs, plans, specs, markdown             | `general-purpose`                                       |
| Mixed changeset with security/perf files | Spawn specialized sub-agent first, then `code-reviewer` |

**Phase 0.7b: Frontend/UI Sub-Review (CONDITIONAL — `/ui-design --mode=review`)**

If the changeset contains any frontend/UI files matching the project's configured UI patterns (components, templates, `.html`/`.scss`/`.css`, design-system tokens), invoke `/ui-design --mode=review` as a sub-review so UI-specific concerns are covered — long-content overflow (wrap vs ellipsis+tooltip), responsive multi-screen flex, flex-grow with min/max over fixed px, semantic z-index discipline (no raw numbers, no `!important`), and BEM classes on all template elements. Fold its findings into this report's Phase 3 results.

**Skip (record reason)** when no frontend/UI files are present in the changeset — log "Skipped Phase 0.7b — no frontend/UI files in changeset".

**Phase 0.7c: Domain Entity Quality (CONDITIONAL)**

For new or updated domain entities/VOs/aggregates, read [the conditional task contract](../changes-review/SKILL.md#domain-entity-quality-conditional-task); it routes the shared quality criteria only when relevant. Complete the task or incorporate the named caller's domain pass. No surface → record inspected paths and skip; leaves return gaps without nested delegation.

**Phase 0.8: Derive Review Categories**

Group changed files by: file language (extension), directory semantics (path), change nature (new entity, schema, config, UI, test).

For each category: name it, create sub-task, derive concerns using `SYNC:category-review-thinking` (first principles — NOT a fixed checklist).

> Category list = Phase 1 work breakdown. Each category → own section in report.

**Phase 1: File-by-File Review (Build Report)**

For EACH file, immediately update report:

- File path, Change Summary, Purpose, Issues Found
- **Convention check:** Grep 3+ similar patterns — does new code follow existing convention?
- **Correctness check:** Trace logic — null, empty, boundary, error cases handled?
- **DRY check:** Grep for similar/duplicate code — does this logic exist elsewhere?
- **Intention check:** Does the change serve the stated purpose? Flag unrelated modifications
- **Test check:** Changed behavior has corresponding test/spec coverage or a documented gap
- **Documentation check:** Related docs, specs, and READMEs still match the changed behavior

**Phase 2: Holistic Review (Re-read Report)**

After all files reviewed, re-read accumulated report:

- **Technical Solution**: Overall approach coherent as unified plan?
- **Responsibility**: Is behavior placed with its documented owner, and are consumers kept behind the project's intended boundaries?
- **Data ownership**: Are constants/config/derivations at the invariant or contract owner established by this architecture?
- **Duplication**: Grep to verify — duplicated logic across changes?
- **Architecture**: Does the change preserve the project’s selected dependency, module and service boundaries where present?
- **Plan Compliance**: If active plan → check `## Plan Context`: impl matches requirements, TCs have code evidence (not "TBD"), no requirement unaddressed
- **Design Patterns**: Do actual coupling, duplicated knowledge or variation justify a simpler/shared owner? Preserve fitting local branches and independent responsibilities; do not require base classes or a particular layer.
- **Cross-Boundary Behavior**: Callers/callees aligned? API/event contracts consistent? New wiring reachable?
- **Whole-diff correctness** (every behavior-changing diff): cover the complete behavior flows per `SYNC:whole-diff-correctness`. One reader owns a fitting working set; otherwise the parent assigns bounded overlapping flow leaves and cross-flow synthesis with complete entry/range/rule coverage. Batches add depth but never replace flow coverage.
- **Test Sync**: Business logic changes have corresponding tests or explicit user-facing gap
- **Translation Sync**: Multilingual UI text changes have translation updates or explicit risk acceptance
- **Bugfix Trace Completeness**: If the diff is a bugfix or behavior-changing fix, the review report must state whether final-state trace, feeder paths, hypothesis matrix, owning fix layer, forward convergence proof, and tests/proof mapping are complete

**MUST ATTENTION CHECK — Spec-Loop Test Discipline (changed core logic):** Review the whole canonical intent/contracts + tests + code package through the resolved profile. Use the project’s required mutation/fault/intent-strength proof; a surviving required probe exposes a missing invariant, while line coverage alone proves no assertion strength. Universally quantified hard invariants need property/boundary coverage in the selected case format. Every behavior-changing finding records both spec feedback and the mapped executor/assertion/result action. Adjudicate CODE-WRONG / SPEC-STALE / AMBIGUOUS / SPEC-SILENT through the shared owner. A proven spec-silent invariant must be added to the selected canonical intent/contracts and guarding evidence case/test; strict-default §4/§3/§5/§8 and TC only when no native contract exists. Never leave the rule only in code/tests or fabricate execution.

**MUST ATTENTION CHECK — Clean Code:** YAGNI (unused params, speculative interfaces)? KISS (simpler exists)? Does size/nesting obscure intent or amplify changes under the project’s conventions?

**MUST ATTENTION CHECK — Correctness:** Null/empty/boundary handled? Error paths caught? Async race conditions? Trace happy + error paths.

**Documentation Staleness Check:**

For each changed file — grep file name/module across `docs/` and AI tooling dirs. Changed behavior → flag stale doc (specific section + what changed). **Flag the staleness only — never auto-fix docs here.**

Common staleness patterns: count/limit changed → docs embedding that number | API/contract changed → API usage docs | hook/skill added/removed → catalogs/README | schema changed → entity reference docs.

**Phase 3: Final Review Result**

Update report: Overall Assessment, Critical Issues, High Priority, Architecture Recommendations, Cross-Boundary Impact (from Phase 0.1 — per client↔server seam AND per service/event/external touchpoint: NONE / ADDITIVE / BREAKING with routed fix; or explicit "Single-tier / monolith — N/A"), Documentation Staleness, Positive Observations.

If documentation staleness is detected, recommend `docs-manager --mode=update` and list exact stale sections; do not silently pass stale docs.

## Validated Fix + Full Re-Review (MANDATORY when findings are fixed)

After Phase 3, do not spawn a fresh reviewer just to re-review the same finding set. First validate findings, then fix only validated findings that block the current round. Because fixes change the review target, restart the full review after the fix cycle (including round-1 LOW fixes); from round 2 onward a LOW-only result is deferred and does not trigger another cycle. If that restarted protocol uses sub-agents, construct each Agent call with the canonical template from `SYNC:review-protocol-injection`:

1. Copy Agent call shape from `SYNC:review-protocol-injection` verbatim
2. Embed full verbatim body of all 11 SYNC blocks: `SYNC:spec-tests-code-triangulation`, `SYNC:evidence-based-reasoning`, `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:complexity-prevention`, `SYNC:logic-and-intention-review`, `SYNC:test-spec-verification`, `SYNC:fix-layer-accountability`, `SYNC:rationalization-prevention`, `SYNC:graph-assisted-investigation`, `SYNC:understand-code-first`
3. Task: `"Run a full fresh code-review pass over the current assigned scope after validated fixes were applied. Focus: cross-cutting concerns, interaction bugs, convention drift, missing pieces, subtle edge cases, logic errors, test spec gaps, and regressions introduced by the fixes."`
4. Target Files: `"use the explicit files, plan scope, or reviewer-provided target range"`
5. Report: `tmp/reports/code-review-rerun{N}-{date}.md`

After sub-agent returns:

1. **Read** report from `tmp/reports/code-review-rerun{N}-{date}.md`
2. **Integrate** findings as `## Re-Review {N} Findings` — DO NOT filter or override
3. **If findings remain:** validate the new finding set before any additional fixes
4. **Repeat only after another fix cycle:** restart the full review again after validated fixes are applied; if the same blocker repeats across 2 full invocations with no progress, escalate via `ask user question tool`

## Clean Code Rules (MUST ATTENTION CHECK)

| #   | Rule                      | Details                                                                                                                                 |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **No Magic Values**       | Name values when they encode shared policy or unexplained meaning; retain obvious local literals                                                                                                          |
| 2   | **Type Annotations**      | Use the project’s supported type/static-checking conventions; do not impose syntax absent from its language                                                                                    |
| 3   | **Single Responsibility** | Keep cohesive responsibilities; inspect the actual dispatcher/error contract before splitting handlers or assuming swallowed exceptions |
| 4   | **DRY**                   | Share aligned rules/behavior when an evidenced owner reduces future change cost; independent look-alikes may remain separate                                                                                                    |
| 5   | **Naming**                | Names reveal purpose, not mechanism: specific names (`orderRecords` not `data`), Verb+Noun methods, is/has/can/should booleans, no unexplained abbreviations; public/cross-layer abstractions name the capability or domain contract and keep provider details on concrete adapters (`IStorage`/`Storage` → `AzureBlobStorage`), with narrow contracts and local interface syntax |
| 6   | **Performance**           | Judge complexity and bounds against expected/worst workload. Apply supported projection, paging and batching where the actual data path warrants them                                     |
| 7   | **Entity Indexes**        | When persistence/search is in scope, verify the configured store’s actual access paths, index/query semantics and relevant volume evidence; no universal ORM/index recipe      |

## Data Lifecycle Rules (MUST ATTENTION CHECK)

**Decision test:** _"Delete the DB and start fresh — does this data still need to exist?"_ Yes → **Seeder/fixture**. No → **Migration**.

| Type                 | Contains                                                                                | NEVER contains                                   |
| -------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Seeder / Fixture** | Default records, system config, reference data (idempotent — safe to run every startup) | Schema changes                                   |
| **Migration**        | Schema changes, column adds/removes, data transforms, index changes                     | Default records, permission seeds, system config |

Apply project's language/framework conventions. Principle universal — implementation project-specific.

## Legacy Pattern Compliance

When reviewing files with legacy and modern patterns:

1. **Detect legacy signals** — search `project-config.json`, `package.json`, or equivalent for `"legacy"`, version flags, feature annotations
2. **Read what "legacy" means** — grep 3+ legacy files to understand pattern constraints vs. modern files
3. **Derive compliance rules** — what lifecycle/memory management differences exist between legacy/modern for this tech stack?
4. **Apply tech stack knowledge** to flag anti-patterns

NEVER assume any specific framework's lifecycle. Derive from codebase evidence.

## When to Use This Skill

| Practice               | Triggers                                                                                   | MUST ATTENTION READ                            |
| ---------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| **Receiving Feedback** | Review comments received, feedback unclear/questionable, conflicts with existing decisions | `references/code-review-reception.md`          |
| **Requesting Review**  | After each subagent task, major feature done, targeted review scope, after complex bug fix | `references/requesting-code-review.md`         |
| **Verification Gates** | Before any completion claim, commit, push, or PR. ANY success/satisfaction statement       | `references/verification-before-completion.md` |

## Quick Decision Tree

```
SITUATION?
│
├─ Received feedback
│  ├─ Unclear items? → STOP, ask for clarification first
│  ├─ From human partner? → Understand, then implement
│  └─ From external reviewer? → Verify technically before implementing
│
├─ Completed work
│  ├─ Major feature/task? → Request code-reviewer subagent review
│  └─ Before merge? → Request code-reviewer subagent review
│
└─ About to claim status
   ├─ Have fresh verification? → State claim WITH evidence
   └─ No fresh verification? → RUN verification command first
```

## Receiving Feedback Protocol

**Pattern:** READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND → IMPLEMENT

- NEVER use performative agreement ("You're right!", "Great point!", "Thanks for...")
- NEVER implement before verification
- MUST ATTENTION restate requirement, ask questions, or push back with technical reasoning
- ask for clarification on ALL unclear items BEFORE starting
- grep for usage before implementing suggested "proper" features (YAGNI check)

**Source handling:** Human partner → implement after understanding. External reviewer → verify technically, push back if wrong.

**Full protocol:** `references/code-review-reception.md`

## Requesting Review Protocol

1. Get git SHAs: `BASE_SHA=$(git rev-parse HEAD~1)` and `HEAD_SHA=$(git rev-parse HEAD)`
2. Dispatch code-reviewer subagent with: WHAT_WAS_IMPLEMENTED, PLAN_OR_REQUIREMENTS, BASE_SHA, HEAD_SHA, DESCRIPTION
3. Act on feedback: Critical → fix immediately. Important → fix before proceeding. Minor → note for later.

**Full protocol:** `references/requesting-code-review.md`

## Verification Gates Protocol

**Iron Law: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE**

**Gate:** IDENTIFY command → RUN it → READ output → VERIFY it confirms claim → THEN claim. Skip any step = lying.

| Claim            | Required Evidence               |
| ---------------- | ------------------------------- |
| Tests pass       | Test output shows 0 failures    |
| Build succeeds   | Build command exit 0            |
| Bug fixed        | Original symptom test passes    |
| Requirements met | Line-by-line checklist verified |

**Red Flags — STOP:** "should"/"probably"/"seems to", satisfaction before verification, committing without verification, trusting agent reports.

**Full protocol:** `references/verification-before-completion.md`

## Related

- `code-simplifier`
- `investigate --mode=debug`

---

## Systematic Review Strategy

> Apply **Systematic Review Batching** to choose the smallest approach preserving full coverage and every gate from risk, related flows, working-set fit and delegation cost. File counts are planning cues; inline, bounded sequential, authorized fresh parallel review and bounded synthesis retain the same obligations.

---

## Architecture Boundary Check

For each changed file, verify no forbidden layer imports:

1. **Read rules** from `docs/project-config.json` → `architectureRules.layerBoundaries`
2. **Determine layer** — match file path against each rule's `paths` glob patterns
3. **Scan imports** — grep for the configured language's import/include statements
4. **Check violations** — import path contains forbidden layer name → violation
5. **Exclude framework** — skip files matching `architectureRules.excludePatterns`
6. **BLOCK on violation** — `"BLOCKED: {layer} layer file {filePath} imports from {forbiddenLayer} ({importStatement})"`

If `architectureRules` absent in project-config.json → skip silently.

---

## Phase 4: Why-Review Self-Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff. Catches over-flagged Highs, false positives, and severity inflation at the source rather than letting them propagate downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `tmp/reports/{skill}-{date}-{slug}.md`
2. Invoke `/why-review` skill with arg: `validate findings in tmp/reports/{skill}-{date}-{slug}.md — verify each finding has file:line proof, steel-man each rejected interpretation, and stress-test severity classifications`
3. Read the validation verdict path returned by why-review, expected as `tmp/reports/why-review-validate-{date}.md`
4. **If why-review demotes/removes any finding:** UPDATE own finalized report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings → log "Skipped — no findings to validate"
- Why-review skill itself is the active context (avoid recursion)

**Why:** Adversarial validation catches false positives and inflated severity before the caller accepts them as ground truth.

---

## Next Steps

Choose and report the best supported next step under `SYNC:review-decision-autonomy`; do not ask the user to select `/fix`, `/watzup` or manual continuation. Continue a fixing or closing workflow only when already authorized; a report-only review returns its findings and recommended remedy.

## AI Agent Integrity Gate (NON-NEGOTIABLE)

**Completion ≠ Correctness.** Before reporting ANY work done:

1. **Grep every removed name.** Extraction/rename/delete → grep confirms 0 dangling refs across ALL file types.
2. **Ask WHY before changing.** Existing values intentional until proven otherwise.
3. **Verify ALL outputs.** One build passing ≠ all builds passing.
4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — scope, lifetime, base class, constraints.
5. **New artifact = wired artifact.** Created something? Prove it's registered, imported, reachable by all consumers.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. This prevents context loss from long files. For simple tasks, choose the smallest gate-preserving task breakdown without a skip question.

> **Critical Purpose:** Ensure quality — no flaws, bugs, missing updates, stale content. Verify code AND documentation.

> **External Memory:** Complex work → write findings incrementally to `tmp/reports/` — prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY — every claim, finding, recommendation requires `file:line` proof + confidence % (>80% act, <80% verify first).

> **Ownership & reuse:** Inspect actual consumers, invariants and change reasons before recommending sharing. Similar names/lifecycles do not require a base class. Choose the project’s idiom only when it reduces change cost; retain applicable quality-tooling checks.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `bug-detection` — Four bug-detection categories checked on every review; reviewing code for defects → .claude/skills/shared/protocols/bug-detection.md
- `category-review-thinking` — Derive review concerns per category of changed files from domain knowledge; reviewing a changeset that spans several file categories → .claude/skills/shared/protocols/category-review-thinking.md
- `complexity-prevention` — Change-cost lens on complexity (Ousterhout); designing or reviewing code → .claude/skills/shared/protocols/complexity-prevention.md
- `core-engineering-principles` — Core quality gate: easy to change, easy to scale, easy to maintain, judged by future change cost; planning, implementing or reviewing any change → .claude/skills/shared/protocols/core-engineering-principles.md
- `cross-service-check` — Scan producers, consumers, sagas and shared contracts for cross-service impact; concluding an investigation, plan or spec in a service-based system → .claude/skills/shared/protocols/cross-service-check.md
- `cross-stack-impact-trace` — Trace the changed area end to end across the client-server seam before judging files; starting a review of a diff that touches more than one tier → .claude/skills/shared/protocols/cross-stack-impact-trace.md
- `design-patterns-quality` — Design quality: one owner per rule, fitted patterns, no speculative abstraction; designing or reviewing code structure → .claude/skills/shared/protocols/design-patterns-quality.md
- `domain-entity-change-gate` — DDD entity, value object and aggregate change gate; planning, implementing or reviewing a domain model change → .claude/skills/shared/protocols/domain-entity-change-gate.md
- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; investigating non-trivial bugs or failed verification, changing code behavior, or tracing unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `fix-layer-accountability` — Fix at the component that owns the violated contract, not at the crash site; choosing where to apply a fix → .claude/skills/shared/protocols/fix-layer-accountability.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `graph-assisted-investigation` — Optional hint: a code-graph query can add callers and dependents when grep may miss a high-risk blast radius, and it can be stale; a high-risk change where grep and reading alone may miss the blast radius → .claude/skills/shared/protocols/graph-assisted-investigation.md
- `logic-and-intention-review` — Check that what the code does matches why it changed, with happy and error path traces; reviewing a code change against its stated intent → .claude/skills/shared/protocols/logic-and-intention-review.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `output-quality-principles` — Readable guidance and verified contents for long skill/doc files; writing, updating or auditing a skill or reference document, or another Markdown artifact over 200 lines → .claude/skills/shared/protocols/output-quality-principles.md
- `rationalization-prevention` — Recognize and reject the evasions used to skip required steps; tempted to skip a step, a test or a review → .claude/skills/shared/protocols/rationalization-prevention.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md
- `review-principle-awareness` — Classify the change context first, then apply the current principles that fit it; starting any review → .claude/skills/shared/protocols/review-principle-awareness.md
- `review-protocol-injection` — Verbatim template and protocol blocks for every fresh sub-agent review prompt; spawning a fresh sub-agent to review → .claude/skills/shared/protocols/review-protocol-injection.md
- `sequential-thinking-protocol` — Structured multi-step reasoning with revision, branch and hypothesis markers; planning, debugging or reviewing complex or ambiguous work → .claude/skills/shared/protocols/sequential-thinking-protocol.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `systematic-review-batching` — Triage all files and plan adaptive review with complete coverage and no fixed size caps; choosing review assignments or handling working-set overflow → .claude/skills/shared/protocols/systematic-review-batching.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `test-spec-verification` — Map changed code to its test specifications; reviewing or verifying changed behavior → .claude/skills/shared/protocols/test-spec-verification.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md
- `whole-diff-correctness` — Read a behavior-changing diff once as one change and hunt cross-file defects through real situations; reviewing a behavior-changing diff → .claude/skills/shared/protocols/whole-diff-correctness.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:design-patterns-quality:reminder -->

**IMPORTANT MUST ATTENTION** select patterns from project evidence and real needs; keep one owner per rule, justify abstractions by change cost, and grep affected scope for dangling references after extraction, move, or rename.

<!-- /SYNC:design-patterns-quality:reminder -->

<!-- SYNC:complexity-prevention:reminder -->

**IMPORTANT MUST ATTENTION** assess change amplification, cognitive load, coupling, leaked detail and invariant ownership from project evidence. Extract only when a real owner or consumer lowers change cost; no universal layer order or numeric threshold.

<!-- /SYNC:complexity-prevention:reminder -->


<!-- SYNC:rationalization-prevention:reminder -->

**MUST ATTENTION** follow ALL steps regardless of perceived simplicity; "too simple to plan" is an evasion, not a reason. Plan anyway, test first, show grep evidence with `file:line`.

<!-- /SYNC:rationalization-prevention:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**Optional advice:** the code graph (`.code-graph/graph.db`) can hint at a high-risk blast radius grep misses; it can be stale, so verify by reading files. Never required.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:logic-and-intention-review:reminder -->

**IMPORTANT MUST ATTENTION** verify WHAT the code does matches WHY it changed, and every changed file serves the stated purpose. Trace happy + error paths. Flag scope creep.

<!-- /SYNC:logic-and-intention-review:reminder -->

<!-- SYNC:bug-detection:reminder -->

**IMPORTANT MUST ATTENTION** check null safety, boundary conditions, error handling, resource management for every review.

<!-- /SYNC:bug-detection:reminder -->

<!-- SYNC:whole-diff-correctness:reminder -->

**MUST ATTENTION** Trace the complete changed behavior, including success/error paths and cross-file interactions. Adapt grouping to context, preserve complete coverage and evidence, and verify the settled post-fix target before PASS.

<!-- /SYNC:whole-diff-correctness:reminder -->

<!-- SYNC:test-spec-verification:reminder -->

**IMPORTANT MUST ATTENTION** map every changed function/endpoint/code path to a test case. Search for the project's test spec format near changed files. Flag untested paths and coverage gaps; recommend test creation.

<!-- /SYNC:test-spec-verification:reminder -->

<!-- SYNC:translation-sync-check:reminder -->

**Review/audit invocations:** follow `SYNC:review-decision-autonomy` for every decision prompt; choose supported recommendations without asking, preserve round-extension approval and actual authority.

**IMPORTANT MUST ATTENTION** for multilingual UI text changes, verify translation updates are present or explicitly accepted by the user as risk (`ask user question tool` when missing) before PASS.

<!-- /SYNC:translation-sync-check:reminder -->

<!-- SYNC:cross-stack-impact-trace:reminder -->

**MUST ATTENTION** FIRST review action — note change context + holistically trace full pipeline of main affected area across client↔server seam (BE→FE forward, FE→BE backward). Verify both tiers still agree on route/DTO/field/type/nullability/auth; any mismatch = BREAKING finding. Skip only for single-tier / docs-only changes (state so).

<!-- /SYNC:cross-stack-impact-trace:reminder -->

<!-- SYNC:cross-service-check:reminder -->

**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

<!-- /SYNC:cross-service-check:reminder -->

<!-- SYNC:fix-layer-accountability:reminder -->

**IMPORTANT MUST ATTENTION** trace full data flow and fix at the owning layer, not the crash site. Audit all access sites before adding `?.`.

<!-- /SYNC:fix-layer-accountability:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** use structured reasoning for complex or ambiguous work, implicitly when visible markers would clutter. Verify hypotheses, revise assumptions, and close with confidence, assumptions, open questions and a concrete next action.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** for non-trivial bugs, failed verification, regression fixes, behavior-changing code or unclear code flow, trace backward from the observed output through every feeder path before fixing. Establish hypotheses, the authoritative invariant owner and forward proof; retain validation at untrusted boundaries. Ordinary artifact review or graph lookup alone does not trigger a debugging workflow.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->


<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:systematic-review-batching:reminder -->

**MUST ATTENTION** Triage all files, write a short review plan and create review/validation/fix/re-review tasks first. Choose inline work or authorized specialists from risk, relationships and context headroom; no fixed file/line/byte caps. Persist coverage, reconcile interactions and validate findings before fixes or PASS.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->


<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `/start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

**Review/audit invocations:** follow `SYNC:review-decision-autonomy` for every decision prompt; choose supported recommendations without asking, preserve round-extension approval and actual authority.

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `ask user question tool` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->



<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->



<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** lead with useful guidance and readable priorities; preserve action-changing conditions/numbers and required structures. When writing, updating or auditing Markdown skill/doc content, verify top, heading-linked contents over 200 lines (stricter owner thresholds remain); refresh after edits and report gaps in read-only audits. Remove report bulk; judge semantic value rather than word counts.

<!-- /SYNC:output-quality-principles:reminder -->

<!-- SYNC:domain-entity-change-gate:reminder -->

**MUST ATTENTION** only for relevant entity/VO/aggregate changes, read `domain-analysis/references/entity-quality.md`: establish fit → plan owned decisions/proof → implement through all write/load paths → review the same rules. Keep simple models simple; unresolved material decisions or required proof block. Use one caller-owned review pass.

<!-- /SYNC:domain-entity-change-gate:reminder -->

## Closing Reminders

**MUST ATTENTION** resolve the named scope and applicable rules → review current source and connected flows → validate findings → verify any fixes through fresh review; feedback evaluation uses the supplied evidence.

**IMPORTANT MUST ATTENTION Goal:** Verify feedback, request targeted code-reviewer reviews, and gate completion claims so accepted code is correct, easy to change and convention-aligned.

**IMPORTANT MUST ATTENTION — Main steps:** create report → blast-radius (grep/read; optional graph hint) + full-pipeline trace → detect risks/plan/surfaces, including domain entity quality when entities change → file-by-file review → holistic review → final result → validate findings before fixes → full re-review after fixes; current/branch diff requests route to `changes-review`.

**MUST ATTENTION** apply the triggered protocols named by the guides above: systematic coverage, evidence and full-flow tracing; category/intention/test review; validation before repair at the contract owner; fresh full re-review under the current severity bar. Read the bodies when triggered; this digest grants no gate skip. Embed all 11 required review protocol bodies in emitted reviewer prompts.

- **MANDATORY** Nested Task Expansion Contract — when invoked inside a workflow, STILL expand internal phases via `TaskCreate` with `[N.M] /skill-name — phase` prefix and `TaskUpdate(parentTaskId, addBlockedBy: [childIds])` linkage. Workflow row is container, not substitute.
- **MANDATORY** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY** choose evidence-supported review decisions under `SYNC:review-decision-autonomy`; preserve round-extension approval and action authority
- **MANDATORY** add final review task to verify work quality
- **MANDATORY MUST ATTENTION** search for project-specific reference docs BEFORE reviewing (coding standards, architecture, test conventions)
- **MANDATORY MUST ATTENTION** Phase 0: detect change type FIRST — route auth/perf files to specialized sub-agents before general review
- **MANDATORY MUST ATTENTION** run `/why-review` after completing this review to validate design rationale, alternatives considered, and risk assessment
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

| Evasion | Rebuttal |
| ------- | -------- |
| "Purpose obvious" | Anchor it anyway — primacy/recency keeps outcome active through long prompts. |
| "Existing reminders enough" | Echo Goal in Closing Reminders — bottom anchor prevents drift. |
| "Skip evidence for prompt edits" | Cite changed file evidence and verify no stale protocol text remains. |

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->


<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->
