---
name: workflow-full-feature-lifecycle
version: 1.0.0
description: '[Workflow] Trigger Full Feature Lifecycle workflow — complete feature from idea to release with formal role handoffs (PO→BA→Designer→Dev→QA→PO acceptance).'
disable-model-invocation: true
---

**IMPORTANT MANDATORY Steps:** /idea -> /refine -> /why-review -> /refine-review -> /domain-analysis -> /why-review -> /story -> /why-review -> /story-review -> /pbi-challenge -> /dor-gate -> /pbi-mockup -> /design-spec -> /why-review -> /interface-design -> /frontend-design -> /plan -> /why-review -> /plan-review -> /why-review -> /plan-validate -> /why-review -> /cook -> /review-domain-entities -> /tdd-spec -> /why-review -> /tdd-spec-review -> /integration-test -> /integration-test-review -> /integration-test-verify -> /tdd-spec [direction=sync] -> /workflow-review-changes -> /sre-review -> /quality-gate -> /docs-update -> /watzup -> /acceptance -> /workflow-end

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md`
> 2. **After each file/section reviewed:** Append findings to report immediately — never hold in memory
> 3. **Return to main agent:** Summary only (per SYNC:subagent-return-contract) with `Full report:` path
> 4. **Main agent:** Reads report file only when resolving specific blockers
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.

<!-- /SYNC:subagent-return-contract -->

Activate the `full-feature-lifecycle` workflow. Run `/workflow-start full-feature-lifecycle` with the user's prompt as context.

**Steps:** /idea → /refine → /why-review → /refine-review → /domain-analysis → /why-review → /story → /why-review → /story-review → /pbi-challenge → /dor-gate → /pbi-mockup → /design-spec → /why-review → /interface-design → /frontend-design → /plan → /why-review → /plan-review → /why-review → /plan-validate → /why-review → /cook → /review-domain-entities → /tdd-spec → /why-review → /tdd-spec-review → /integration-test → /integration-test-review → /integration-test-verify → /tdd-spec [direction=sync] → /workflow-review-changes → /sre-review → /quality-gate → /docs-update → /watzup → /acceptance → /workflow-end

## Quick Summary

**Goal:** [Workflow] Trigger Full Feature Lifecycle workflow — complete feature from idea to release with formal role handoffs (PO→BA→Designer→Dev→QA→PO acceptance).

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- NEVER skip mandatory workflow or skill gates.

## Closing Rule

Every step = `TaskUpdate in_progress` → `Skill` tool → complete skill → `TaskUpdate completed`. No shortcuts.

---

**IMPORTANT MANDATORY Steps:** /idea -> /refine -> /why-review -> /refine-review -> /domain-analysis -> /why-review -> /story -> /why-review -> /story-review -> /pbi-challenge -> /dor-gate -> /pbi-mockup -> /design-spec -> /why-review -> /interface-design -> /frontend-design -> /plan -> /why-review -> /plan-review -> /why-review -> /plan-validate -> /why-review -> /cook -> /review-domain-entities -> /tdd-spec -> /why-review -> /tdd-spec-review -> /integration-test -> /integration-test-review -> /integration-test-verify -> /tdd-spec [direction=sync] -> /workflow-review-changes -> /sre-review -> /quality-gate -> /docs-update -> /watzup -> /acceptance -> /workflow-end

<!-- SYNC:ai-mistake-prevention -->

**AI Mistake Prevention** — Failure modes to avoid on every task:
**Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
**Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
**Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
**Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
**When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
**Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
**Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
**Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
**Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
**Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
