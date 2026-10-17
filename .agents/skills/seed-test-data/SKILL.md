---
name: seed-test-data
description: '[Dev Data] Use when a workflow step or the user asks for idempotent QC happy-path seeders using public commands. --mode=review audits seeder conventions read-only.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
## Quick Summary

> **Review modes:** For review/audit work, standalone defaults to `--review-only` (`--report-only` alias); `--fix-loop` enables review → validate → authorized fix → fresh re-review, default cap 3. `--fix-loop --loop-owner=caller` returns a read-only pass to the caller that owns fixes/re-review. Create triage, review, validation and re-review todo tasks first; apply the carried `review-policy` contract for LOW deferral and user-approved bounded extensions. Non-review modes and terminal findings validation keep their own dispatch.

**Goal:** Build configurable local-development seeders that exercise happy paths through public application commands, produce realistic QC/performance data, and remain idempotent and restart-safe.

**Summary:** Follow the existing seeder convention; gate the environment first; use a small configurable count, public commands and a fresh DI scope per iteration. Generate: classify → discover conventions → verify dev config → analyze scenarios → locate seeder → implement → validate → self-audit → fresh review → final review handoff → lessons. Review: resolve target → read conventions → grade → report/hand off → lessons; no edits.

**Workflow:** Use Generate by default. A `--mode=review` flag or a request to review/audit/check a seeder selects the read-only audit below.

**Key Rules:**

- Discover project conventions before designing; preserve existing scenarios.
- Seed only local/development environments, default-enabled there; never production. Check environment before any seeding work.
- Use public commands for domain data; keep validation, domain logic and events in those commands.
- Count before creating; resume from `existing_count` to the configured target with fresh scoped DI per iteration.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `$start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Contents

- [Quick Summary](#quick-summary)
- [Required Context](#required-context)
- [Universal Seed Data Rules](#universal-seed-data-rules)
- [Persistent Seed Run Contract](#persistent-seed-run-contract)
- [Protocol (Generate mode)](#protocol-generate-mode)
- [Sub-Agent Routing](#sub-agent-routing)
- [Anti-Patterns](#anti-patterns)
- [Review Loop](#review-loop)
- [Mode: Review (seed-data convention audit)](#mode-review-seed-data-convention-audit)
- [Next Steps](#next-steps)
- [Closing Reminders](#closing-reminders)

## Required Context

Before changes or an audit, read `seed-test-data-reference.md` under the resolved project-reference root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it) and the loader-selected project config's `Data Seeders` group. Discover source roots, naming, commands, base/interface, registration, environment/count keys, marker and scope lifetime with `file:line` evidence. Match existing conventions; if none exists, propose the smallest suitable one.

## Universal Seed Data Rules

0. **Convention first:** follow the discovered project pattern; do not invent a parallel mechanism.
1. **Environment:** check local/development eligibility first, then the enable flag (default on locally); production is always excluded.
2. **Public commands:** create ordinary domain data through the real application entry points, including validation and events. Seeder supplies inputs; commands own business logic.
3. **Configurable count:** read the discovered config key, use a small default, and no-op at zero. The count controls scenario repetition and realistic first-init/many-user volume. For performance claims, compare at least two volumes about 10× apart with realistic distribution, cardinality and skew, rather than identical rows.
4. **Idempotency:** count records by a deterministic seeder marker before creating anything; seed only the remainder and no-op at/above target.
5. **Restart safety:** loop from `existing_count` to `target_count`, never zero; reuse keyed records/identity after interruption and recover without deleting or resetting persistent data.
6. **Scoped DI:** use the project's fresh scope per iteration; do not share a DbContext/session across iterations.
7. **Reachable state:** use valid inputs and plausible relative creation/update/activity timing, rather than one shared instant. An unavoidable direct store-write exception must be labelled and explain why legitimate (legacy/migrated bootstrap, externally owned record, or deliberate corruption-repair fixture); it is not an ordinary domain-seeding path.
8. **Spec consistency:** seeded scenarios satisfy the selected canonical owner’s contract invariants (strict-default §5 only when no native profile is declared). Resolve config/required-reference roles and case carriers; invalid/unresolved contracts stay BLOCKED. Any assumed domain precondition, status/relationship or default belongs in the spec and tests where testable. Property/metamorphic generation and mutation-score gates are N/A for orchestration-only seeders.

## Persistent Seed Run Contract

Record before locating/creating the seeder; carry into verification:

- Arrange prerequisites and domain data through supported public commands/queries; label any justified impossible-state exception.
- Use one unique, non-sensitive `runIdentity` per invocation in synthetic keys/values; a restart of the same run reuses it and never mints another batch. Keep the seeder marker deterministic across restarts (for example a name/email prefix, created-by field or dedicated flag).
- Declare `target` (converges to configured count) or explicitly required `additive` mode. Additive runs preserve prior runs, append deterministic keys and count-check their current batch before resuming.
- Verify `before`, `created`, `after`, the expected count equation, key/marker uniqueness, command success and domain/reference integrity. A mismatch blocks completion.
- Report only counts/status and a safe opaque identity. Redact credentials, tokens, auth headers, connection strings, PII and full fixture payloads.

## Protocol (Generate mode)

Create tasks for the ordered steps before editing; finish with the self-audit before final changes review. Record evidence or a skip reason for each step.

1. **Classify:** new seeder → create using discovered pattern; enhance → read and preserve all existing scenarios; broken → diagnose at the responsible rule before fixing. Ask if task type is unclear.
2. **Discover conventions:** search configured roots for existing seeders and public commands. Read at least three comparable patterns when available; verify their base, scope and lifetime fit. Record base/interface, registration, environment/count keys and marker with `file:line` evidence.
3. **Verify dev config:** ensure environment and count keys exist; add missing keys using the project's dev-config convention.
4. **Analyze feature scope:** identify entity/aggregate, public commands, prerequisites, 3–5 realistic standard/boundary/multi-actor variations and whether count means one scenario or N repetitions per scenario. Record the Persistent Seed Run Contract.
5. **Locate seeder:** enhance an existing feature seeder without breaking its scenarios, or create one using the discovered base/interface and registration.
6. **Implement:** apply the algorithm below with project keys, marker and scope handling.
7. **Validate:** evidence every universal rule and project-required pattern, including registration/config, scope, timing, run integrity and redaction. Resolve applicable Unit/Integration/System/E2E types and modes from actual runner/config evidence: owner/root/data, full/focused commands, zero-match behavior, CI/platform entry point, supported environments, unique identity and repeat proof. Missing applicable fields block handoff; unsupported tiers need evidence-backed N/A.
8. **Self-audit:** run this skill's `--mode=review` on changed seeder code; fix confirmed FAILs through Generate, then re-audit.
9. **Fresh review:** run the Review Loop below. As a workflow step (`nested=true`, defined in [Next Steps](#next-steps)) whose sequence runs `$changes-review` after this step, as `workflow-seed-test-data` does, skip the loop and hand the final independent review to that gate; record `fresh review handed to the workflow's changes-review gate` as the skip reason. Step 8's self-audit still runs. A standalone run keeps the loop.
10. **Final review handoff:** `$changes-review` remains the final changes review after self-audit; follow Next Steps for standalone choices.
11. **Lessons:** analyze AI mistakes and recurring lessons; record unresolved gaps.

### Implementation algorithm

Use discovered project names instead of the illustrative keys below. Registration and DI scope follow the project's convention.

```text
seeder():
  if not is_local_development_environment(): return
  if not seed_enabled_in_config(default=true): return
  target = config.get(discovered_count_key, SMALL_DEFAULT)
  if target <= 0: return
  existing = count_by_seeder_marker()
  if existing >= target: return
  for i from existing to target:
    with fresh_project_scope():
      call_public_application_command(build_realistic_input(i))
```

For explicitly additive runs, apply the count/resume checks to the current batch; preserve prior data.

## Sub-Agent Routing

Use discovery help for a large codebase, a `code-reviewer` for the post-implementation round, a `security-auditor` for credentials/PII, and a `performance-optimizer` for 1000+ records. Persist findings per file rather than batching at the end. Every prompt includes this optional graph guidance: when the graph DB is active and blast radius is high-risk, use `python .claude/scripts/code_graph trace <file> --direction both --json` after grep, then grep-verify the potentially stale result; use the host's verified Python executable.

## Anti-Patterns

Treat direct domain inserts, duplicated validation, hardcoded counts, missing environment/count gates, loops starting at zero, shared scope and same-instant timestamps as violations of the corresponding Universal Seed Data Rule. Correct them at that rule's owner; use the documented exception only for justified special fixtures.

## Review Loop

**Workflow step:** skip this loop when a later `$changes-review` gate of the same workflow owns the final review (Generate step 9); the step-8 self-audit still covers the convention checklist and the universal seeder rules.

**Round 1:** After implementation, spawn fresh `code-reviewer` sub-agent with zero memory of implementation:

```
Review seeder at [file:path]. Verify with file:line evidence for each:
1. Environment gate is FIRST check
2. Idempotency: count-before-seed pattern present
3. Loop starts at existing_count not 0
4. Zero application-layer command bypasses (direct repo/DB = FAIL)
5. No hardcoded count — config key read
6. Scoped DI per iteration
Report: PASS or FAIL with file:line for each finding.
```

**Completion:** A clean pass ends review once the persisted `minRounds` is met; perform additional independent passes only when explicitly required.

**Fix loop:** If FAIL → validate findings → fix validated findings that block the current round → restart full review from first phase. Round 1 treats every open validated finding as blocking (LOW deferral); from round 2 onward, a LOW-only result ends the loop with LOWs recorded under `## Deferred LOW Findings (severity floor, round ≥2)`, while CRITICAL/HIGH/MEDIUM and failed binary gates remain blocking. When restarted review uses sub-agents, NEVER reuse them across rounds. If the same blocker repeats across 2 full invocations with no progress, escalate to user.
NEVER fix unvalidated findings. Do not spawn a fresh sub-agent only to re-review known findings before validation/fix.

---

## Mode: Review (seed-data convention audit)

Read [references/seed-test-data-skill-review.md](references/seed-test-data-skill-review.md) when Review is selected or Generate reaches self-audit, before resolving or grading the target. It owns R0–R3, the checklist and review task plan; Universal Seed Data Rules and the Persistent Seed Run Contract remain mandatory. Review is read-only; confirmed fixes return to Generate, followed by another audit.

## Next Steps

> **Inside a workflow** (THIS run is a step of a `[Workflow]` row: its own phase tasks are linked to that parent row, `nested=true` — a `[Workflow]` row that merely exists in the current task list, such as an abandoned one, does not count): skip the prompt below — the workflow's own next step is the next action. **Otherwise (standalone, or only an unrelated `[Workflow]` row exists):**

After Generate’s self-audit and fresh review, ask with the native question tool:

- `$workflow-review-changes (Recommended)` — final review before commit.
- `$integration-test` — write idempotency/count tests.
- `Skip, continue manually` — user decides.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `real-world-fidelity-testing` — Integration, E2E and system tests exercise real boundaries; authoring, reviewing or repairing integration, E2E or system tests → .claude/skills/shared/protocols/real-world-fidelity-testing.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Build configurable local-development seeders that exercise happy paths through public application commands, produce realistic QC/performance data, and remain idempotent and restart-safe.

**MUST ATTENTION Route:** classify → discover conventions → verify dev config → analyze scenarios/run contract → locate seeder → implement → validate → read-only self-audit → fresh review → final review handoff → lessons. Keep tasks synchronized and evidence every completion/skip.

**Review route (`--mode=review`):** resolve target → read conventions → grade every item → report/hand off → lessons. Fix through Generate, then re-audit.

**Priorities:** convention first; environment gate first and never production; public commands own business logic. Use a small configurable count, deterministic markers, resumed loops and fresh scopes. Preserve run identity/data, verify counts and integrity, redact evidence. Review reports only; validate findings before Generate fixes and full re-review.

| Temptation | Required action |
| --- | --- |
| Skip self-audit or fresh review for a simple seeder | Run both before final review handoff; only a later `$changes-review` gate of the same workflow replaces the fresh review (Generate step 9). |
| Fix a finding during Review mode | Validate it, fix through Generate, then re-audit. |

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** for code work, read the target and relevant conventions before planning or editing; seek 3+ fitting examples when available and record fewer/none. Do not impose code discovery on work with no code surface. The code graph is optional, stale-able advice for high-risk impact, never a requirement.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->


<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->
