# `$integration-test --mode=review` — integration-test review modes

> Read in full on `$integration-test --mode=review [--review-only|--fix-loop]`. Standalone defaults to review-only; fix-loop repairs validated findings and freshly reviews, up to three rounds. Caller-owned leaves stay read-only. Apply the entrypoint’s shared `review-policy`.

## Quick Summary

**Goal:** Determine whether integration tests protect intended behavior through realistic, repeatable, observable boundaries and remain aligned with source and canonical specs.

**Summary:**

- **Mode boundary:** review-only reports once; fix-loop repairs the validated test/source/spec findings within scope and re-runs all eight gates.
- Review the package, not isolated test files: governing spec/cases + production path + integration tests + runner/config evidence.
- Workflow specialists join `--fix-loop --loop-owner=caller` and return a read-only current pass. `--prove-tests` may inspect existing runner evidence or run the configured relevant suite only when the caller owns test execution; it does not open another review round.
- Preserve the AI-surface lens when the tested path calls a model, prompt, agent, tool/MCP, retrieval, or guardrail.

**Workflow:** Resolve scope/profile → trace spec/test/source package → run eight quality gates once → validate/deduplicate → verdict/report → stop.

**Key Rules:**

- Three review rounds by default in fix-loop; LOW-only at cap is accepted, MEDIUM+ or failed gates require a user-approved bounded extension.
- Review-only/caller-owned leaves write reports only; the fix-loop owner performs authorized repairs.
- Never weaken assertions, add skips, widen timeouts, or rewrite source/tests to force green.

## Contents

- [Quick Summary](#quick-summary)
- [Modes and Round Ownership](#modes-and-round-ownership)
- [Scope and Case Profile](#scope-and-case-profile)
- [Single Review Pass — Eight Gates](#single-review-pass--eight-gates)
- [Execution Evidence](#execution-evidence)
- [Finding Validation and Verdict](#finding-validation-and-verdict)
- [Report Shape](#report-shape)
- [Mode protocols](#mode-protocols)
- [Closing Reminders](#closing-reminders)

## Modes and Round Ownership

Create tasks for triage/plan, review, findings validation, authorized fixes, fresh re-review and final checks before execution. In review-only, run the full domain pass once and hand off. In fix-loop, validate findings, repair at the owner, then freshly review the settled target. Keep one shared three-round budget and the LOW/extension rules in `review-policy`; caller-owned leaves never start another loop or edit.

## Scope and Case Profile

1. Resolve `docs/project-config.json`, the configured integration-test command, relevant reference docs, and `specArtifacts`.
2. Valid native profile: use its intent/contracts/evidence roles, case identity, carrier dialect, and cardinality. Absent profile: use the strict-default feature-spec/TC contract. Malformed profile: `BLOCKED`, no fallback.
3. Locate the whole package:
   - canonical intent/contract and case/scenario;
   - production entry path and owned outcome;
   - integration test and assertion path;
   - fixtures/builders/data isolation and runner configuration.
4. Create `tmp/reports/integration-test-review-{YYMMDD}-{HHmm}-{slug}.md` before findings.

## Single Review Pass — Eight Gates

Judge each gate `PASS`, `FAIL`, `N/A`, or `NOT VERIFIABLE` with `file:line`/config/runner evidence.

### 1. Assertion value

- Does the assertion fail when the protected rule breaks, or does it only prove no exception/status bookkeeping?
- Name the mutant or behavioral break that should make the case red.

### 2. Owned outcome

- Assert the business/entity/system outcome the tested component owns, not queue attempts, delivery bookkeeping, sleeps, or another process's mutable internals.
- For async behavior, assert convergence independent of which worker completes it.

### 3. Repeatability and isolation

- Test data/state is isolated under the configured concurrency model; cleanup removes only owned resources.
- Reruns do not depend on order, shared leftovers, wall-clock luck, or a blind delay.

### 4. Behavior ownership

- Setup uses the production boundary when that boundary is under test; unrelated preconditions may use project-native fixtures/builders without bypassing the protected contract.
- A failure is provisionally classified SOURCE-WRONG, TEST-WRONG, TEST-NOT-OPTIMAL, ENVIRONMENT-BLOCKED, or AMBIGUOUS before any recommendation.

### 5. Spec/case traceability

- Owner + case/scenario + optional variant resolves to the actual executor and inspected assertion.
- Identity text alone is not proof; preserve configured many-to-many mappings.

### 6. Spec ↔ tests ↔ code consistency

- Triangulate all three faces and classify divergence as CODE-WRONG, SPEC-STALE, SPEC-SILENT, TEST-GAP, WEAK-TEST, or AMBIGUOUS.
- Green tests never normalize drift. A changed invariant missing from the canonical owner remains incomplete.

### 7. Change coverage

- Every changed behavior, error path, edge/boundary, authorization rule, state transition, and regression risk has appropriate integration coverage or an evidence-backed reason another test tier owns it.
- Do not require integration tests for mechanics already better proven by a narrower/lower-cost test.

### 8. Real-world fidelity

- Sequence, timing, actors, topology, and data can occur in production—or an impossible-state test labels and justifies its corruption/recovery purpose.
- Use observable readiness/postconditions and native runner waits; no assertion retry, timeout widening, or fixed sleep masking.

### Conditional AI-surface lens

If the tested path calls a model, prompt, agent, tool/MCP, retrieval, eval or guardrail (see `node .claude/scripts/ai-signal-scan.cjs`), read `.claude/skills/shared/protocols/ai-engineering-gate.md` and apply it within this pass; otherwise record N/A. Review deterministic seams/mocks at the correct boundary, tool authorization, untrusted outputs, bounded retries/spend, eval/trace evidence, fallback/kill switch and owned-outcome assertions. Route deep concerns to `ai-engineering-review --report-only` within the same pass.

## Execution Evidence

- `--report-only`: do not run tests. Review source, specs, and any existing exact runner output supplied by the caller.
- `--prove-tests`: run the configured relevant suite once only when this invocation is the final proof owner and no parent verify-last step will run it later. Record exact command, exit code, scope, and output location.
- Any failure follows the test-failure investigation route. Report the adjudicated finding; only the fix-loop owner may repair and re-review.

## Finding Validation and Verdict

1. Deduplicate findings by root cause/owner.
2. Confirm reachable consequence, evidence, confidence, and normalized severity. Validate findings through `$why-review --validate-findings <report-path>` (called with `--loop-owner=caller`, leave that call to the caller, which validates the merged report once); terminal validation is part of round 1 and never opens another review round.
3. Emit:
   - `PASS` — all gates clear with no validated blocking finding.
   - `PASS_WITH_NOTES` — LOW observations only.
   - `CHANGES_REQUESTED` — validated test/source/spec findings require caller action.
   - `BLOCKED` — required profile, environment, owner intent, or execution evidence is unavailable.
4. Review-only stops; fix-loop repairs validated findings and performs a fresh complete review.

## Report Shape

```markdown
# Integration Test Review — {scope}

## Verdict
PASS | PASS_WITH_NOTES | CHANGES_REQUESTED | BLOCKED
Review rounds: {spent}/{budget}

## Package Traced
| spec/case | production owner | test/assertion | runner |

## Gate Results
| gate | status | evidence | note |

## Findings
### [SEVERITY] Short title
- Evidence and reachable path:
- Protected intent/consequence:
- Fault classification:
- Owner and recommended correction:
- Confidence:

## Coverage and Limits
- AI-surface lens: applied/N/A + evidence
- Test execution: deferred/proved + exact evidence
- Unverified items and owner
```

Inside a workflow, return the verdict/report path to the parent without next-step prompts.

## Mode protocols

The protocols below are carried in full because only this mode needs them; the protocols shared with test generation are guide lines in `integration-test/SKILL.md`.

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

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Determine whether integration tests protect intended behavior through realistic, repeatable, observable boundaries and remain aligned with source and canonical specs.

**MUST ATTENTION Route:** scope/profile → spec/test/source package and preparation → eight gates and applicable AI lens → validate/deduplicate → verdict/report → stop.

- **MUST ATTENTION** review-only reports once; fix-loop validates → fixes → freshly reviews within the shared three-round cap.
- **MUST ATTENTION** review-only and caller-owned leaves never edit; standalone fix-loop repairs validated findings at their owner and freshly re-reviews.
- **MUST ATTENTION** preserve assertion value, owned outcome, repeatability, behavior ownership, traceability, three-way sync, change coverage, and fidelity.
- **MUST ATTENTION** keep the conditional AI-surface lens and route deep findings to the AI reviewer within each current review pass.
- **MUST ATTENTION** test execution is deferred when a parent verify-last gate owns it.

| Temptation | Required action |
| --- | --- |
| Fix the test while reviewing | Return the adjudicated finding; the caller owns the repair. |
| Add another round to settle uncertainty | Report missing proof; at the shared cap ask for a bounded extension, never claim uncertainty as clean. |
