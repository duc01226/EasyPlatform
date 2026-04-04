---
name: security
version: 1.0.0
description: '[Code Quality] Perform security review on specified scope'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

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

> **Evidence Gate:** MANDATORY IMPORTANT MUST — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

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

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST run at least ONE graph command on key files before concluding any investigation.
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

> **MANDATORY IMPORTANT MUST — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `quality-audit` workflow** (Recommended) — security → sre-review → test
> 2. **Execute `/security` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST — NO EXCEPTIONS** after completing this skill, you MUST use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/sre-review (Recommended)"** — Production readiness review
- **"/performance"** — Analyze performance next
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST** READ the following files before starting:

  <!-- SYNC:evidence-based-reasoning:reminder -->

- **MUST** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
      <!-- /SYNC:evidence-based-reasoning:reminder -->
      <!-- SYNC:graph-assisted-investigation:reminder -->
- **MUST** run at least ONE graph command on key files when graph.db exists. Pattern: grep → trace → verify.
      <!-- /SYNC:graph-assisted-investigation:reminder -->
