---
name: experience-review
description: '[Testing] Use when a workflow step or the user asks for runtime review of a UI, API, CLI or service against intended behavior. --rounds=0 reports only; --rounds=N bounds repairs.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
## Quick Summary

> **Review modes:** For review/audit work, standalone defaults to `--review-only` (`--report-only` alias); `--fix-loop` enables review → validate → authorized fix → fresh re-review, default cap 3. `--fix-loop --loop-owner=caller` returns a read-only pass to the caller that owns fixes/re-review. Create triage, review, validation and re-review todo tasks first; apply the carried `review-policy` contract for LOW deferral and user-approved bounded extensions. Non-review modes and terminal findings validation keep their own dispatch.

**Goal:** Exercise the real interface and inspect evidence so acceptance decisions reflect observed behavior.

**Summary:** Resolve intent → plan evidence/capability → start, instrument and exercise → inspect/judge → repair/re-exercise within budget → compare, tear down and hand off. Keep observations, judgments and human acceptance separate.

**Key Rules:**

- `--rounds=N`: integers `0–3`; review-only defaults to `0`, standalone `--fix-loop` defaults to `3`. A numeric budget never grants repair authority; caller-owned passes stay read-only. State mode and budget before observation.
- Keep the evidence matrix and expectations intact; only BLOCKING defects open repair rounds.
- A clean review recommends acceptance; explicit owner acceptance is required before promoting any baseline.

**Workflow:** Follow the six steps in order; track each with evidence or an explicit skip reason using host task tools or an equivalent tracker. Source reading, test-writing and artifact generation alone never verify an experience.

## Contents

- [Quick Summary](#quick-summary)
- [Procedure](#procedure)
- [Output](#output)
- [Closing Reminders](#closing-reminders)

## Procedure

### 1. Resolve intent and scope

**MUST READ** the loader-resolved project config when present, its docs index and `lessons.md`, relevant surface references, and the governing spec, acceptance criteria, design decision, API/CLI/library contract or operator runbook. Absent config is supported; derive facts from repository evidence. Missing or contradictory intent is `AMBIGUOUS`: ask the owner before choosing an expectation.

Record actor, job, expected outcome, invariants, unchanged behavior, impacted surfaces/states, accepted evidence and conditions. Review the smallest scope that protects these behaviors.

For E2E/browser/user-flow surfaces, read `.claude/skills/shared/e2e-quality-protocol.md` and record its applicable gate rows: intent/invariant, auth/data, evidence, cleanup and traceability. Route static test-code findings to the test owner and static styling/component findings to `$ui-design --mode=review`; this skill owns runtime and inspected visual evidence.

### 2. Plan evidence and resolve capability

Create a matrix before execution:

`surface id/kind | applicability | purpose/states | entry point/runner | localRun/log channels | fixture/identity | platform/device/viewport/locale/network | evidence root | accepted expectation`

Classify from project, repository and tool evidence:

- `APPLICABLE`: the surface and required runner, data, services and inspection capability are available.
- `NOT-APPLICABLE`: the surface does not exist; cite config and repository evidence.
- `ENVIRONMENT-BLOCKED`: a relevant surface lacks a required capability; name it and preserve diagnostics.
- `UNVERIFIED`: required observations or judgments remain missing; never relabel this as N/A.

Without `experienceVerification`, use an evidenced existing runner and record the adoption limitation; never invent defaults. Keep disposable reports/evidence under project `tmp/` or `temp/`, including configured evidence storage.

Resolve lifecycle from `experienceVerification.surfaces[].localRun`: dependency/start/readiness/log/teardown. When absent, derive commands from package/task/compose/CI scripts or run instructions, cite `file:line` and propose the derived `localRun` in the report. Unresolved commands, ports, accounts or fixtures remain blocked.

When `e2eTesting.execution` exists, match `surfaceIds[]` to the configured surfaces: surface `localRun` owns lifecycle; the E2E profile owns auth/data/browser/evidence/convergence. Fill missing values only from evidenced project references, runner config, scripts and fixture/auth docs.

### 3. Start, instrument and exercise

Bring up the whole system: backing services → supported migration/seed path → surface. Poll the declared readiness check within its timeout; process-started, an open port and a fixed sleep are insufficient. Record recipe, versions/profile, readiness and diagnostics. Never disable auth or stub a failing dependency to make review possible.

Attach runtime capture before the first interaction, include startup evidence, and keep it through teardown. For web surfaces capture console levels, page errors/unhandled rejections, failed requests and applicable server logs; otherwise capture stdout/stderr and configured log channels. An empty capture requires proof that the listener was attached.

Drive the journey through the real user interface, chaining outputs from earlier actions. Use the configured browser/device/desktop driver, real CLI, API client, supported service input or generator as appropriate. Do not bypass the interface through internal calls or direct state writes.

Use the runner's bounded native waits or an evidenced helper for actionability and observable postconditions. Apply action delays/visibility only as the project contract requires; delays never prove readiness. Record relevant preconditions, actions, expected/actual results, settle signals, conditions, timestamps and evidence references. Cover matrix states: relevant failure, empty, loading, offline, permission, recovery and boundary cases.

Read the captured logs and actual responses, transcripts, persisted outcomes or generated artifacts; redact secrets. For visual reviews, **read [references/visual-captures.md](references/visual-captures.md) before the first image** and follow the configured capture contract. Unavailable interaction/inspection is blocked; saved but unread evidence is unverified.

### 4. Inspect and judge

Persist observations before judgments, linked to evidence. Judge against intent as `PASS`, `FAIL`, `PARTIAL` or `NOT-VERIFIABLE`; confidence is metadata, never approval. Do not infer interaction, accessibility, timing or data correctness from an image alone.

Classify findings:

- **BLOCKING:** objective acceptance/invariant failure, broken required state, unusable layout, measured accessibility-floor failure, wrong/missing output, runtime ERROR, uncaught exception, unhandled rejection or journey-critical failed request. Route errors outside your ownership to their owner without downgrading them.
- **ADVISORY:** polish, taste, visual identity and warnings/deprecations. Attempt a small behavior-preserving warning fix only within an already authorized round; otherwise record emitter and disposition. Advisory findings never open a round or hold acceptance open.

Inspect the environment as a competing cause before attributing a defect. Missing proof is `UNVERIFIED` or `ENVIRONMENT-BLOCKED`, not a proven defect or pass. Never suppress/filter logs, lower their level, swallow errors or invent measurements to clear a finding.

### 5. Repair and re-exercise

Skip repairs in review-only, report-only, caller-owned passes or `--rounds=0`. Only standalone `--fix-loop` repairs within the selected budget; each round follows this sequence:

1. Adjudicate BLOCKING findings with observation and `file:line` evidence: `SOURCE-WRONG`, `EXPECTATION-WRONG`, `TEST-CONDITION-INVALID`, `ENVIRONMENT-BLOCKED` or `AMBIGUOUS`. Ask the owner for ambiguity; an expectation issue is routed, not rewritten here.
2. Use `$fix` at the invariant's owning layer (`--target=ui` for visual/layout defects). Expectations, baselines, snapshots, tests, fixtures, assertions and acceptance criteria remain read-only.
3. Run `$changes-review` INLINE, report-only, on the round's fix diff; fold validated findings into that round. Record a skip when nothing changed.
4. Re-exercise and judge the current build over the SAME matrix with fresh logs and required captures. Restart and poll readiness if startup/config/dependencies/schema/build changed.
5. **Round Integrity Check:** no dropped surface/state/viewport/condition, applicability downgrade, weakened journey/criterion, omitted required capture or detached/filtered log channel. Restore coverage and rerun if this fails.
6. Append round number, BLOCKING counts in/out, verdicts, changed paths and review outcome.

Convergence requires a fresh full exercise with zero BLOCKING defects AND a passed integrity check. Stop and escalate through the host's question tool when defects remain at the cap, fail to shrink across two consecutive rounds, increase, or a round becomes `ENVIRONMENT-BLOCKED`. Report `NOT-CONVERGED` or the actual capability limitation, never a partial pass.

### 6. Compare, tear down and hand off

Compare the settled evidence once. When an accepted expectation exists, use the read-only classifier with JSON through its supported input:

```text
node .claude/scripts/lib/experience-verification.cjs compare
```

No accepted expectation → `CANDIDATE-BASELINE-PENDING-ACCEPTANCE`; same expectation → `NO-REGRESSION`; changed output with unchanged intent → `POTENTIAL-REGRESSION`; intended change → `INTENDED-CHANGE-PENDING-ACCEPTANCE`. Record invalid conditions, ambiguity or missing evidence explicitly. Preserve prior expectations; never run snapshot updates or replace a baseline to clear a mismatch.

Tear down only processes/services you started, including on blocked/failed branches, and record the result. Leave pre-existing developer processes alone.

## Output

Maintain an incremental report with scope/budget, intent/authority, matrix, exact commands/exit statuses, lifecycle/readiness/teardown, actions/settle signals, inspected evidence, runtime errors/warnings and disposition, observations/judgments, BLOCKING/ADVISORY findings, repair log, expectation decision, gaps and next owner/action. Visual reviews include capture records and reconciliation from the visual reference.

Keep the final reply concise: verdict, material findings or limits, acceptance status, next action and full report link. Distinguish `OBSERVED`, `JUDGED`, `HUMAN-ACCEPTED`, `UNVERIFIED`, `ENVIRONMENT-BLOCKED` and `NOT-APPLICABLE`.

A complete clean review yields `AGENT-RECOMMENDED-ACCEPT` as a judgment and stays `ACCEPTANCE-PENDING` until an explicit owner decision exists. Copy `HUMAN-ACCEPTED` only from a record with `acceptedBy`, `acceptedAt`, `intentRef`, `evidenceRefs`, scope and any residual risk. Hand off evidence for that decision; never sign for the owner. Accepted evidence may later become deterministic regression material through the owning test workflow; ordinary tests remain model-free.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `e2e-visual-design-contract` — Evidence and baseline rules for visual review in E2E and human QC; handling visual-review evidence or visual baseline updates → .claude/skills/shared/protocols/e2e-visual-design-contract.md
- `environment-fault-hypothesis` — Weigh the environment as a competing cause, with a named discriminator; judging a bug report, failing test, error or unexpected output → .claude/skills/shared/protocols/environment-fault-hypothesis.md
- `experience-acceptance-contract` — Review and evidence contract for a user-facing or observable surface; a change creates or changes a user-facing or observable surface → .claude/skills/shared/protocols/experience-acceptance-contract.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md
- `review-principle-awareness` — Classify the change context first, then apply the current principles that fit it; starting any review → .claude/skills/shared/protocols/review-principle-awareness.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:e2e-visual-design-contract:reminder -->

**MUST ATTENTION** visual E2E/QC resolves the project design authority first, applies project design-system and frontend decisions plus applicable `UI-*`/`DD-*`/`CL-*` roles, records component ownership using the project's taxonomy or observed boundaries, sends static source findings to `$ui-design --mode=review` and runtime image evidence to `$experience-review`, captures states and transitions required by the configured evidence contract, reloads the convention docs then reads and records each required capture before synthesizing findings with coverage gaps, treats `UIX`/UI/accessibility-floor findings as blocking and `UIX-POLISH`/DD identity as advisory, never invents measurements, and never auto-promotes baselines; non-visual runs state `N/A`.

<!-- /SYNC:e2e-visual-design-contract:reminder -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

<!-- SYNC:environment-fault-hypothesis:reminder -->

**MUST ATTENTION** environment-fault gate: a bug, failed test, error, or odd output is NOT proof of a code defect. Sweep environment preconditions (versions, deps/install state, config & env vars, services, ports/network/clock, permissions, leftover state) and resource/transience suspects (RAM, CPU, disk, handles, network, timeouts) as a competing hypothesis, cite the discriminator you ran, and fix an environment cause in the environment — never by editing code or weakening a test. "Flaky" is a symptom, not a verdict.

<!-- /SYNC:environment-fault-hypothesis:reminder -->

<!-- SYNC:experience-acceptance-contract:reminder -->

**MUST ATTENTION** classify the configured surface, read intended purpose, bring the whole system up locally and POLL readiness before observing, exercise the actual observable feature through its real interface, synchronize browser/UI actions with the project's configured runner waits and observable pre/postconditions, and apply action delays only when its contract requires them. Capture and READ the runtime log stream and relevant evidence, separate OBSERVED/JUDGED/HUMAN-ACCEPTED/UNVERIFIED/ENVIRONMENT-BLOCKED/NOT-APPLICABLE, preserve old expectations on mismatch, and require explicit acceptance before baseline promotion. A runtime ERROR is a defect even when the output looked right; a WARNING is advisory. Never silence a log, invent a measurement, or infer acceptance from a screenshot, passing test, or agent confidence; ordinary tests remain model-free.

<!-- /SYNC:experience-acceptance-contract:reminder -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Exercise the real interface and inspect evidence so acceptance decisions reflect observed behavior.

**IMPORTANT MUST ATTENTION Main steps:** resolve intent → plan evidence/capability → start, instrument and exercise → inspect/judge → repair/re-exercise → compare, tear down and hand off.

Review-only, caller-owned passes and `--rounds=0` are product-read-only; standalone `--fix-loop --rounds=1–3` permits only validated BLOCKING repairs within budget and actual authority. Preserve the matrix and expectations; human acceptance alone permits baseline promotion.

| Evasion | Required action |
|---|---|
| “The final screen passed” | Read required logs and evidence; runtime errors remain defects. |
| “Update the snapshot to clear it” | Preserve expectations and hand candidate evidence to the owner. |


<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->
