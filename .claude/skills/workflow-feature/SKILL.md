---
name: workflow-feature
version: 1.0.0
description: '[Workflow] Trigger Feature Implementation workflow — implement a well-defined feature with investigation, planning, implementation, and review.'
disable-model-invocation: true
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

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

Activate the `feature` workflow. Run `/workflow-start feature` with the user's prompt as context.

**Steps:** /scout → /feature-investigation → /domain-analysis (if entity changes) → /plan → /plan-review → /plan-validate → /why-review → /tdd-spec → /tdd-spec-review → /plan → /plan-review → /cook → /review-domain-entities (if entity changes) → /tdd-spec → /tdd-spec-review → /test-specs-docs → /integration-test → /integration-test-review → /integration-test-verify → /workflow-review-changes → /sre-review → /security → /changelog → /test → /docs-update → /watzup → /workflow-end

> **[PERFORMANCE EXCEPTION]** If this feature is a performance enhancement (query optimization, caching, throughput improvement, latency reduction), skip `/tdd-spec` (both occurrences), `/tdd-spec-review` (both occurrences), PLAN₂ + its `/plan-review`, `/test-specs-docs`, `/integration-test`, `/integration-test-review`, and `/integration-test-verify`. Do NOT skip `/cook` — implementation still runs. Integration tests verify functional correctness — they cannot measure performance. Use `/test` only to confirm no functional regressions. Activate `/workflow-performance` instead.

## Repeated Steps Disambiguation (CRITICAL for task creation)

This workflow has steps that appear multiple times. When creating tasks, use these descriptions to distinguish them:

| Step               | Occurrence   | Task Description                                 |
| ------------------ | ------------ | ------------------------------------------------ |
| `/plan`            | 1st (pos 3)  | PLAN₁: Investigation-based implementation plan   |
| `/plan`            | 2nd (pos 9)  | PLAN₂: Sprint-ready plan incorporating TDD specs |
| `/plan-review`     | 1st (pos 4)  | Review PLAN₁                                     |
| `/plan-review`     | 2nd (pos 10) | Review PLAN₂                                     |
| `/tdd-spec`        | 1st (pos 7)  | TDD-SPEC₁: Pre-implementation test specs         |
| `/tdd-spec`        | 2nd (pos 11) | TDD-SPEC₂: Post-implementation test spec update  |
| `/tdd-spec-review` | 1st (pos 8)  | Review TDD-SPEC₁                                 |
| `/tdd-spec-review` | 2nd (pos 12) | Review TDD-SPEC₂                                 |

**NEVER deduplicate** — each occurrence is a distinct task with a different purpose.

---

## Conditional UI Planning

When a feature involves UI changes (detected during `/scout` or `/feature-investigation`):

- If image/wireframe/Figma URL is provided → route to `/wireframe-to-spec` or `/figma-design` before `/plan`
- If `/plan` detects frontend phases → ensure `ui-wireframe-protocol.md` sections are included in plan phases
- This is advisory — NOT a mandatory workflow step change. The existing workflow sequence remains unchanged.

## Closing Rule

Every step = `TaskUpdate in_progress` → `Skill` tool → complete skill → `TaskUpdate completed`. No shortcuts.
