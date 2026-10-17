---
name: workflow-research
version: 1.0.0
description: "[Workflow] Research web sources and produce a cited, reviewed deliverable. --output={synthesis|business-eval|marketing|course}."
disable-model-invocation: false
---

<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-research` together with this skill. Call [`/start-workflow workflow-research`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** before triage, analysis or step execution, create one todo per phase of the selected mode, in order, listing every occurrence of that phase as a line, including conditional/optional ones (a mode that declares no phases gets one todo per occurrence); preserve occurrence IDs, roles and barrier groups. Use native todo tools or an equivalent persistent ledger. Then mark the first todo `in_progress`; close each step line with its run or skip evidence, and complete a phase todo only when every line is closed and its applicable exit gates hold.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a todo or turn a conditional skill into an unconditional call; close, in one batch at triage, the todos whose condition is already false there. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `synthesis`: [`/web-research --chain=deep-dive`](../web-research/SKILL.md) (core) → [`/knowledge-synthesis`](../knowledge-synthesis/SKILL.md) (core) → [`/knowledge-review --fix-loop`](../knowledge-review/SKILL.md) (gate) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (3; exit review-converged) → Close (2; exit run-closed)
<!-- workflow-mode:synthesis fingerprint:ed8edfe31886313e9385ad0a8a18aed5072c6368009a258d7c54e008514d9b02 -->
- Mode `business-eval`: [`/web-research --chain=deep-dive`](../web-research/SKILL.md) (core) → [`/market-analysis`](../market-analysis/SKILL.md) (core) → [`/business-evaluation`](../business-evaluation/SKILL.md) (core) → [`/knowledge-review --fix-loop`](../knowledge-review/SKILL.md) (gate) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (4; exit review-converged) → Close (2; exit run-closed)
<!-- workflow-mode:business-eval fingerprint:bb1eafaad9be2c4b1483ac6165360c484dee08040f83f403ffa6c3050dd4787b -->
- Mode `marketing`: [`/web-research --chain=deep-dive`](../web-research/SKILL.md) (core) → [`/market-analysis`](../market-analysis/SKILL.md) (core) → [`/strategy-builder`](../strategy-builder/SKILL.md) (core) → [`/knowledge-review --fix-loop`](../knowledge-review/SKILL.md) (gate) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (4; exit review-converged) → Close (2; exit run-closed)
<!-- workflow-mode:marketing fingerprint:b0e4bb1aff30678ab7f703db24452a741e085cae20c94c9a1ec757fb13889fb0 -->
- Mode `course`: [`/web-research --chain=deep-dive`](../web-research/SKILL.md) (core) → [`/course-builder`](../course-builder/SKILL.md) (core) → [`/knowledge-review --fix-loop`](../knowledge-review/SKILL.md) (gate) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (3; exit review-converged) → Close (2; exit run-closed)
<!-- workflow-mode:course fingerprint:e5ecac5bd853bc1f7f56e420d0afba33433a66a87c42e678231b9c0656fe5cc9 -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`/sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

## Quick Summary

**Goal:** Research a topic from web sources and deliver ONE cited, reviewed artifact in the form `--output` selects: a knowledge report (`synthesis`, default), a business/market viability evaluation (`business-eval`), a marketing strategy (`marketing`), or structured course material (`course`). The workflow produces research artifacts only, never code.

**Use it when** the answer must come from external sources and end in a durable, cited deliverable. **Use a sibling instead** for a quick lookup with no artifact (plain `/web-research`) or for questions about this codebase (`/investigate`).

**IMPORTANT MANDATORY Steps:** resolve the `workflow-research` manifest variant for `--output` first (default `synthesis`), then create one task per phase with a row per returned occurrence (default: /web-research --chain=deep-dive -> /knowledge-synthesis -> /knowledge-review --fix-loop -> /workflow-end -> /watzup).

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

This skill is the canonical Research & Synthesis entry point. Invoke it with `--output=<mode>` (default `synthesis`); `/start-workflow workflow-research` resolves the same variants through `.claude/scripts/lib/workflow-manifest.cjs`. Each variant is a complete sequence, so execute the resolved manifest and never a hand-swapped list.

## Contents

- [Workflow Calls and Todo Bootstrap](#workflow-calls-and-todo-bootstrap)
- [Quick Summary](#quick-summary)
- [Output Modes (--output)](#output-modes---output)
- [Question-Scope Triage (first action)](#question-scope-triage-first-action)
- [Required Quality Gates](#required-quality-gates)
- [Recommended Skills](#recommended-skills)
- [Orchestration](#orchestration)
- [Memory & Reporting](#memory--reporting)
- [Evidence Retention](#evidence-retention)
- [Findings & Fix Path](#findings--fix-path)
- [Closing Reminders](#closing-reminders)

## Output Modes (--output)

Pick the mode from the prompt BEFORE creating tasks. When the prompt is ambiguous, use `synthesis` and state the assumption. Every mode shares one research step, `/web-research --chain=deep-dive` (source map, then evidence base; the `/source-deep-dive` procedure runs inside it per `.claude/skills/web-research/references/research-chain.md`), and the `/knowledge-review --fix-loop → /workflow-end` close, followed by `/watzup` only when its condition holds; only the terminal synthesis skill(s) differ. The `/market-analysis` step of `business-eval` and `marketing` reads that evidence base first and searches only the gaps it names.

| `--output`              | Deliverable                          | Terminal synthesis skill(s)                 |
| ----------------------- | ------------------------------------ | ------------------------------------------- |
| **synthesis** (default) | Cited knowledge report               | `/knowledge-synthesis`                      |
| **business-eval**       | Business/market viability evaluation | `/market-analysis` → `/business-evaluation` |
| **marketing**           | Marketing strategy                   | `/market-analysis` → `/strategy-builder`    |
| **course**              | Learner-ready course                 | `/course-builder`                          |

**[BLOCKING] Evidence-artifact identity for `business-eval` and `marketing`:** before invoking the
first research child, derive one stable `ARTIFACT_SLUG` from the user's topic and record the exact
`MARKET_ANALYSIS_PATH = docs/knowledge/strategy/market-analysis/{ARTIFACT_SLUG}.md` in the parent
workflow context/task handoff. Pass those exact values to every child skill. `market-analysis` is the
only producer; it must write and return that path, and `business-evaluation`/`strategy-builder` must
read that exact path rather than deriving a second slug. If a plan directory is active, its
`{plan-dir}/research/market-analysis.md` file is a copy of the same producer artifact, not a second
identity. This token is not needed for the `synthesis` variant. — why: sequence ordering
without a shared artifact key still allows a producer/consumer miss that degrades the final evidence
without failing the workflow.

## Question-Scope Triage (first action)

Classify the question and record it in the workflow report. Scope sets research DEPTH inside the research step's caps (≤10 searches, then ≤8 fetches); it never lowers the evidence bar.

| Scope                          | Signals                                                                           | Depth                                                                                                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Narrow**                     | One fact, definition, or comparison of 2–3 named options                          | 3–5 angle-varied queries; fetch the 2–4 strongest Tier 1–2 sources; a short artifact that still carries every template section the review enforces.                                                                    |
| **Standard**                   | One topic with several angles                                                     | Skill defaults: 5–10 queries, 5–8 fetches.                                                                                                                                                                             |
| **Broad or decision-critical** | Multi-part topic, contested evidence, or a business/strategy decision rides on it | Split into sub-topics, one bounded research pass per sub-topic (each under the caps), then merge the source maps and evidence bases before synthesis. Run the adversarial checks of `/knowledge-review` at full depth. |

## Required Quality Gates

| Gate                                             | Evidence that proves it                                                                                                                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review converged (`review-converged`)            | `/knowledge-review --fix-loop` verdict APPROVED on the final artifact: the gate validated its REVISE/BLOCKED findings, had them fixed at their owner and re-reviewed the fixed artifact in a fresh pass. |
| Citation bar                                     | Every factual claim, number, table row and inference ends with an inline `[N]` citation mapped to a Sources row (Title, URL, Author/Publisher, Date, Tier).                             |
| Cross-validated and calibrated | Factual claims rest on 2+ independent sources; a single-source claim is marked unverified and held below 60%; confidence above 80% needs contradicting evidence addressed; Tier 4 is never cited as fact; findings below 60% and open gaps are flagged. |
| Artifact identity (`business-eval`, `marketing`) | One `MARKET_ANALYSIS_PATH`, written by `market-analysis` and read by its consumer.                                                                                                      |
| Variant closure                                  | The workflow report records the selected mode, resolver fingerprint and ordered occurrence IDs.                                                                                         |
| Run closed (`run-closed`)                        | `/workflow-end` ran last.                                                                                                                                                               |

## Recommended Skills

| Skill                       | Role | When it earns its cost                                                       | Proves / feeds                                                                           |
| --------------------------- | ---- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `/web-research --chain=deep-dive` | core | Always; depth per triage. Runs the `/source-deep-dive` procedure inline; the synthesis skills read its evidence base. | Tiered source map with gaps (`tmp/research/_sources-{slug}.md`), then the cross-validated evidence base (`tmp/research/_evidence-{slug}.md`). |
| Terminal synthesis skill(s) | core | Per the Output Modes table.                                                  | The deliverable.                                                                         |
| `/knowledge-review --fix-loop` | gate | Always. It owns validate → fix → fresh re-review.                         | `review-converged`: template, citation, confidence, source-quality and anti-bias checks. |
| `/workflow-end`             | gate | Always, last.                                                                | `run-closed`, and the short handoff with the artifact path when nothing was built.       |
| `/watzup`                   | optional | The user asked for a session report or an HTML wrap-up, or the session spanned several workflows or prompts that need one consolidated handoff. Skip reason: workflow-end printed the recap, or the short handoff when nothing was built, and every applicable outcome gate passed. | Session report with the artifact path.                                                  |

## Orchestration

You choose inline vs sub-agent, batching and ordering to minimize wall-clock and tokens at equal quality. Narrow questions run inline. For broad questions, independent sub-topic research passes can run as one parallel wave, because each writes only its own source and evidence files. Merge them before synthesis.

Fixed data dependencies: inside the research step the source map exists before the deep dive; the evidence base exists before synthesis; `market-analysis` writes `MARKET_ANALYSIS_PATH` before its consumer reads it; `/knowledge-review` checks the final artifact; `/workflow-end` runs last.

## Memory & Reporting

- Create one task per phase, with a row per resolved occurrence. Child skills expand their own steps under the parent row.
- Create the workflow report FIRST at `tmp/reports/workflow-research-{YYMMDD}-{HHmm}-{slug}.md`: mode, triage, resolver fingerprint, per-step evidence and deviations, and the paths of the source map, evidence base and final artifact. Append after each step.
- Sub-agent briefs carry the topic, the slug, the exact paths and the evidence bar, and make report writing the first deliverable.
- After compaction, re-read `TaskList` and the workflow report before continuing.

## Evidence Retention

Retain this run’s source map and evidence base during synthesis, all review rounds, and owner repairs. Cleanup is an orchestrator lifecycle action after `/knowledge-review` returns APPROVED on the final artifact and `/workflow-end` successfully accepts closure; record the acceptance evidence and exact removed paths in the workflow report. REVISE, BLOCKED, interruption, or closure failure retains the inputs. Remove only this run’s `_sources-{slug}.md` and `_evidence-{slug}.md` if its retention policy permits; never erase another run’s evidence. Cleanup after closure is report housekeeping, not another workflow occurrence.

## Findings & Fix Path

- `/knowledge-review --fix-loop` owns the loop; each of its review passes is read-only. It validates each REVISE/BLOCKED finding against the evidence, has it fixed at its owner, then re-reviews the fixed artifact in a fresh pass. An evidence gap takes a targeted `/source-deep-dive` pass over the existing source map, or a `/web-research --chain=deep-dive` pass on the gap when the map lacks the needed sources. A synthesis defect (missing section, uncited claim, miscalibrated confidence) is fixed in the artifact through its synthesis skill.
- Loop bounds: round 1 exits on zero open findings (LOW deferral); from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, with LOWs deferred and listed; cap 3 review rounds; escalate via `ask user question tool` when a round makes no progress.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->


<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** one cited, reviewed artifact in the selected `--output` form, with `/knowledge-review` converged and every factual claim traceable to a Sources row.

- **MUST ATTENTION** select the `--output` mode and triage the question scope FIRST. Scope sets research depth inside the skill caps; it never lowers the citation or cross-validation bar.
- **MUST ATTENTION** for `business-eval` and `marketing`, derive one `ARTIFACT_SLUG` and `MARKET_ANALYSIS_PATH` before the first research step and pass the exact values to every child.
- **MUST ATTENTION** `/knowledge-review --fix-loop` fixes validated findings at their owner (evidence gap → targeted `/source-deep-dive` or `/web-research --chain=deep-dive` pass, synthesis defect → the artifact), then re-reviews the fixed artifact in a fresh pass.
- **MUST ATTENTION Variant closure:** record the selected `--output` mode, resolver fingerprint, ordered occurrence IDs, each invoked skill's evidence, and every deviation before `/workflow-end`; a variant mismatch is a workflow failure.

**Protocols in force (digest; the guide entries above point to the full text):** Nested Task Creation · Incremental Persistence · Sub-Agent Return Contract · Session Goal Ledger · Workflow Registry Binding.
