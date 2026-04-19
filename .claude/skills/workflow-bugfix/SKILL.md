---
name: workflow-bugfix
version: 1.0.0
description: '[Workflow] Trigger Bug Fix workflow — systematic debugging with root cause investigation, fix, and verification.'
disable-model-invocation: true
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

> **[CRITICAL] Plan Before Fix Gate:** The `/plan → /plan-review → /plan-validate` steps are MANDATORY before `/fix`. You MUST ATTENTION create todo tasks for these plan steps AND complete them before proceeding to fix. Never skip planning — fixes without validated plans lead to incomplete root cause analysis and regressions.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

Activate the `bugfix` workflow. Run `/workflow-start bugfix` with the user's prompt as context.

**Steps:** /scout → /investigate → /debug-investigate → /plan → /plan-review → /plan-validate → /why-review → /tdd-spec → /tdd-spec-review → /integration-test → /fix → /prove-fix → /integration-test → /integration-test-review → /workflow-review-changes → /changelog → /test → /docs-update → /watzup → /workflow-end

> **[PERFORMANCE EXCEPTION]** If this bug fix is performance-related (latency, throughput, memory, query speed), skip `/tdd-spec`, `/tdd-spec-review`, `/integration-test` (both occurrences), `/integration-test-review`, and `/integration-test-verify`. Integration tests verify functional correctness — they cannot measure performance. Use `/test` only to confirm no functional regressions. Activate `/workflow-performance` instead when the primary goal is performance optimization.

> **[TDD-FIRST BUG FIX]** The two `/integration-test` occurrences are intentional and serve distinct purposes:
>
> - **First `/integration-test` (RED phase):** Write a regression test that REPRODUCES the bug. Run it — it MUST FAIL. If it passes, the test does not catch the bug. Never proceed to fix until the test fails.
> - **Second `/integration-test` (GREEN phase):** Re-run integration tests after the fix — expect all to PASS. Confirms the fix works AND the regression guard is in place.
> - **`/integration-test-review`:** Verify tests have real assertion value (not smoke/existence-only checks).

## Repeated Steps Disambiguation (CRITICAL for task creation)

| Step                | Occurrence | Task Description                                          |
| ------------------- | ---------- | --------------------------------------------------------- |
| `/integration-test` | 1st        | INT-TEST₁ — RED phase: write regression test, expect FAIL |
| `/integration-test` | 2nd        | INT-TEST₂ — GREEN phase: re-run after fix, expect PASS    |
