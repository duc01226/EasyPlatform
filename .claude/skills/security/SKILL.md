---
name: security
version: 1.0.0
description: '[Code Quality] Perform security review on specified scope'
disable-model-invocation: false
execution-mode: subagent
context-budget: high
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

## Quick Summary

**Goal:** Perform security review against OWASP Top 10 and project authorization patterns.

**Workflow:**

1. **Scope** — Identify security-sensitive code areas
2. **Audit** — Review against OWASP categories and platform security patterns
3. **Report** — Document findings with severity and remediation

**Key Rules:**

- Analysis Mindset: systematic review, not guesswork
- Check both backend and frontend attack surfaces
- Use project authorization attributes and entity-level access expressions (see docs/project-reference/backend-patterns-reference.md)

<scope>$ARGUMENTS</scope>

## Analysis Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- Do NOT assume code is secure at face value — verify by reading actual implementations
- Every vulnerability finding must include `file:line` evidence
- If you cannot prove a vulnerability with a code trace, state "potential risk, not confirmed"
- Question assumptions: "Is this actually exploitable?" → trace the input path to confirm
- Challenge completeness: "Are there other attack vectors?" → check all input boundaries
- No "looks secure" without proof — state what you verified and how

Activate `arch-security-review` skill and follow its workflow.

**CRITICAL**: Present your security findings. Wait for explicit user approval before implementing fixes.

## Sub-Agent Type Override

> **MANDATORY:** Security reviews spawn `security-auditor` sub-agent for Round 2, NOT `code-reviewer`.
> **Rationale:** `security-auditor` has dedicated OWASP protocols, auth flow analysis, injection risk tracing, dependency CVE checking, and microservices boundary security context that `code-reviewer` lacks.

## Recursive Quality Loop

1. **Round 1:** Main agent (or `arch-security-review` skill) runs analysis → draft findings report
2. **Round 2:** Spawn fresh `security-auditor` sub-agent (`subagent_type: "security-auditor"`) — ZERO memory of Round 1. Include in prompt: OWASP Top 10 checklist, auth flows, injection risks, dependency CVEs, microservices boundary security.
3. Issues found → fix → Round 3 with NEW fresh `security-auditor` sub-agent
4. Max 3 rounds → escalate to user via `AskUserQuestion`
5. **Clean Round 1 ENDS the review.** When issues are found, fix and spawn a fresh sub-agent for Round 2 — main agent rationalizes own work, fresh eyes catch what was dismissed.

<!-- SYNC:sub-agent-selection -->

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** NEVER use `code-reviewer` for specialized domains (architecture, security, performance, DB, E2E, integration-test, git).

<!-- /SYNC:sub-agent-selection -->

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation/Scout | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

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

> Run `python .claude/scripts/code_graph query callers_of <function> --json` to trace all entry points into sensitive functions.

## Graph Intelligence (RECOMMENDED if graph.db exists)

If `.code-graph/graph.db` exists, enhance analysis with structural queries:

- **Trace data flow to sensitive functions:** `python .claude/scripts/code_graph query callers_of <function> --json`
- **What does this function call?** `python .claude/scripts/code_graph query callees_of <function> --json`
- **Batch analysis:** `python .claude/scripts/code_graph batch-query file1 file2 --json`

> See `<!-- SYNC:graph-assisted-investigation -->` block above for graph query patterns.

### Graph-Trace for Data Flow Analysis

When graph DB is available, use `trace` to analyze data flow paths for security review:

- `python .claude/scripts/code_graph trace <entry-point> --direction downstream --json` — trace data flow from input to all consumers (find where untrusted data travels)
- `python .claude/scripts/code_graph trace <sensitive-file> --direction upstream --json` — find all entry points that reach sensitive code
- Trace reveals cross-service MESSAGE_BUS flows where data crosses trust boundaries

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `quality-audit` workflow** (Recommended) — security → sre-review → test
> 2. **Execute `/security` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/sre-review (Recommended)"** — Production readiness review
- **"/performance"** — Analyze performance next
- **"Skip, continue manually"** — user decides

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.

<!-- /SYNC:evidence-based-reasoning:reminder -->
<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → trace → verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->
<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
