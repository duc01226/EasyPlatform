---
name: workflow-greenfield
version: 1.0.0
description: '[Workflow] Trigger Greenfield Project Init workflow — start a new project from scratch with full inception, implementation, and integration testing.'
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

Activate the `greenfield-init` workflow. Run `/workflow-start greenfield-init` with the user's prompt as context.

**Steps:** /idea → /web-research → /deep-research → /business-evaluation → /domain-analysis → /tech-stack-research → /architecture-design → /plan → /security → /performance → /plan-review → /refine → /refine-review → /story → /story-review → /pbi-mockup → /plan-validate → /tdd-spec → /tdd-spec-review → /plan → /plan-review → /scaffold → /why-review → /cook → /review-domain-entities (if domain entity changes) → /tdd-spec → /tdd-spec-review → /plan → /plan-review → /integration-test → /test → /workflow-review-changes → /sre-review → /security → /changelog → /test → /docs-update → /watzup → /workflow-end

---

## Repeated Steps Disambiguation (CRITICAL for task creation)

This workflow has steps that appear multiple times. When creating tasks, use these descriptions to distinguish them:

| Step               | Occurrence   | Task Description                                                |
| ------------------ | ------------ | --------------------------------------------------------------- |
| `/plan`            | 1st (pos 8)  | PLAN₁: High-level architecture plan (after architecture-design) |
| `/plan`            | 2nd (pos 20) | PLAN₂: Sprint-ready implementation plan (after tdd-spec-review) |
| `/plan`            | 3rd (pos 27) | PLAN₃: Integration test architecture plan (post-implementation) |
| `/plan-review`     | 1st (pos 11) | Review PLAN₁ architecture                                       |
| `/plan-review`     | 2nd (pos 21) | Review PLAN₂ implementation                                     |
| `/plan-review`     | 3rd (pos 28) | Review PLAN₃ integration tests                                  |
| `/security`        | 1st (pos 9)  | Architecture security review                                    |
| `/security`        | 2nd (pos 32) | Production readiness security review                            |
| `/tdd-spec`        | 1st (pos 18) | TDD-SPEC₁: Feature test specs (before implementation)           |
| `/tdd-spec`        | 2nd (pos 24) | TDD-SPEC₂: Post-implementation test spec update                 |
| `/tdd-spec-review` | 1st (pos 19) | Review TDD-SPEC₁                                                |
| `/tdd-spec-review` | 2nd (pos 25) | Review TDD-SPEC₂                                                |
| `/test`            | 1st (pos 30) | Test after integration tests                                    |
| `/test`            | 2nd (pos 35) | Final test verification                                         |

**NEVER deduplicate** — each occurrence is a distinct task with a different purpose.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
    <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
    <!-- /SYNC:ai-mistake-prevention:reminder -->
