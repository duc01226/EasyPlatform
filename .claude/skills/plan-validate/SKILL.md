---
name: plan-validate
version: 1.0.0
description: '[Planning] Validate plan with critical questions interview'
---

> **[BLOCKING]** This skill MUST ATTENTION use `AskUserQuestion` to interview the user. Completing without asking at least one question is a violation.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

<!-- SYNC:plan-quality -->

> **Plan Quality** — Every plan phase MUST ATTENTION include test specifications.
>
> 1. Add `## Test Specifications` section with TC-{FEAT}-{NNN} IDs to every phase file
> 2. Map every functional requirement to ≥1 TC (or explicit `TBD` with rationale)
> 3. TC IDs follow `TC-{FEATURE}-{NNN}` format — reference by ID, never embed full content
> 4. Before any new workflow step: call `TaskList` and re-read the phase file
> 5. On context compaction: call `TaskList` FIRST — never create duplicate tasks
> 6. Verify TC satisfaction per phase before marking complete (evidence must be `file:line`, not TBD)
>
> **Mode:** TDD-first → reference existing TCs with `Evidence: TBD`. Implement-first → use TBD → `/tdd-spec` fills after.

<!-- /SYNC:plan-quality -->

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

## Quick Summary

**Goal:** Interview the user with critical questions to validate assumptions and surface issues in a plan before coding begins.

**Workflow:**

1. **Read Plan** — Parse plan.md and phase files for decisions, assumptions, risks
2. **Extract Topics** — Scan for architecture, assumptions, tradeoffs, risks, scope keywords
3. **Generate Questions** — Formulate concrete questions with 2-4 options each
4. **Interview User** — Present questions using configured count range
5. **Document Answers** — Add Validation Summary section to plan.md

**Key Rules:**

- Only ask about genuine decision points; don't manufacture artificial choices
- Prioritize questions that could change implementation significantly
- Do NOT modify phase files; just document what needs updating

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Your mission

Interview the user with critical questions to validate assumptions, confirm decisions, and surface potential issues in an implementation plan before coding begins.

## Plan Resolution

1. If `$ARGUMENTS` provided -> Use that path
2. Else check `## Plan Context` section -> Use active plan path
3. If no plan found -> Ask user to specify path or run `/plan-hard` first

## Configuration (from injected context)

Check `## Plan Context` section for validation settings:

- `mode` - Controls auto/prompt/off behavior
- `questions` - Range like `3-8` (min-max)

These values are automatically injected from user config. Use them as constraints.

## Workflow

### Step 1: Read Plan Files

Read the plan directory:

- `plan.md` - Overview and phases list
- `phase-*.md` - All phase files
- Look for decision points, assumptions, risks, tradeoffs

### Step 2: Extract Question Topics

Scan plan content for:

| Category         | Keywords to detect                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architecture** | "approach", "pattern", "design", "structure", "database", "API"                                                                                         |
| **Assumptions**  | "assume", "expect", "should", "will", "must", "default"                                                                                                 |
| **Tradeoffs**    | "tradeoff", "vs", "alternative", "option", "choice", "either/or"                                                                                        |
| **Risks**        | "risk", "might", "could fail", "dependency", "blocker", "concern"                                                                                       |
| **Scope**        | "phase", "MVP", "future", "out of scope", "nice to have"                                                                                                |
| **New Tech/Lib** | "install", "add package", "new dependency", "npm install", "dotnet add", framework names not in project                                                 |
| **Test Specs**   | "TC-", "test case", "coverage", "TDD", "test specification", "test spec"                                                                                |
| **Preservation** | (auto-trigger on bugfix keywords in plan title/frontmatter: "fix", "bug", "regression", "broken", "defect"; always scan Preservation Inventory section) |

### Step 3: Generate Questions

For each detected topic, formulate a concrete question:

**Question format rules:**

- Each question must have 2-4 concrete options
- Mark recommended option with "(Recommended)" suffix
- Include "Other" option is automatic - don't add it
- Questions should surface implicit decisions

**Example questions:**

```
Category: Architecture
Question: "How should the validation results be persisted?"
Options:
1. Save to plan.md frontmatter (Recommended) - Updates existing plan
2. Create validation-answers.md - Separate file for answers
3. Don't persist - Ephemeral validation only
```

```
Category: Assumptions
Question: "The plan assumes API rate limiting is not needed. Is this correct?"
Options:
1. Yes, rate limiting not needed for MVP
2. No, add basic rate limiting now (Recommended)
3. Defer to Phase 2
```

```
Category: Preservation (MANDATORY when plan title/frontmatter contains: fix, bug, regression, broken, defect)
Question: "List 2-3 inputs where the CURRENT code is correct. Will your fix change behavior on any of them? If yes, why is that correct?"
Options (multi-select):
1. "Current code correct on: {input A}. Fix preserves behavior on A." (Recommended — no behavior change on preserved input)
2. "Current code correct on: {input B}. Fix CHANGES behavior on B because: {justification}"
3. "Current code has NO preserved-correctness inputs — every input was broken" (rare; requires user confirmation)
4. "Unsure — need to investigate before answering" (STOP: run /plan-hard preservation analysis)
```

**Follow-up rules:**

- If option 2 is selected, the `plan.md` Preservation Inventory section MUST cite a TC (Preservation TC from Phase 5) asserting option 2's new behavior is intended.
- If option 4 is selected, `plan-validate` returns BLOCKED status — recommend `/plan-hard` to re-investigate current code before proceeding.
- If option 3 is selected, `AskUserQuestion` follow-up: "Confirm: current code has NO preserved invariant on any input? [Yes, every input was broken / No, I missed some — re-investigate]"

### Step 4: Interview User

Use `AskUserQuestion` tool to present questions.

**Rules:**

- Use question count from `## Plan Context` -> `Validation: mode=X, questions=MIN-MAX`
- Group related questions when possible (max 4 questions per tool call)
- Focus on: assumptions, risks, tradeoffs, architecture

### Step 5: Document Answers

After collecting answers, update the plan:

1. Add `## Validation Summary` section to `plan.md`:

```markdown
## Validation Summary

**Validated:** {date}
**Questions asked:** {count}

### Confirmed Decisions

- {decision 1}: {user choice}
- {decision 2}: {user choice}

### Action Items

- [ ] {any changes needed based on answers}
```

1. If answers require plan changes, note them but **do not modify phase files** - just document what needs updating.

## Output

After validation completes, provide summary:

- Number of questions asked
- Key decisions confirmed
- Any items flagged for plan revision
- Recommendation: proceed to implementation or revise plan first

## **IMPORTANT Task Planning Notes (MUST ATTENTION FOLLOW)**

- Always plan and break work into many small todo tasks using `TaskCreate`
- Always add a final review todo task to verify work quality and identify fixes/enhancements
- **MANDATORY FINAL TASKS:** After creating all planning todo tasks, ALWAYS add these two final tasks:
    1. **Task: "Run /plan-validate"** — Trigger `/plan-validate` skill to interview the user with critical questions and validate plan assumptions
    2. **Task: "Run /plan-review"** — Trigger `/plan-review` skill to auto-review plan for validity, correctness, and best practices

## Important Notes

**IMPORTANT:** Only ask questions about genuine decision points - don't manufacture artificial choices.
**IMPORTANT:** If plan is simple with few decisions, it's okay to ask fewer than min questions.
**IMPORTANT:** Prioritize questions that could change implementation significantly.
**MANDATORY IMPORTANT MUST ATTENTION** If plan introduces new tech/packages/libraries, ask user: "Plan uses {lib}. Were alternatives evaluated? Confirm choice or research more?"

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/cook (Recommended)"** — Begin implementation with validated plan
- **"/refine"** — If plan needs PBI refinement first
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

<!-- SYNC:understand-code-first:reminder -->

- **IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
      <!-- /SYNC:understand-code-first:reminder -->
      <!-- SYNC:plan-quality:reminder -->
- **IMPORTANT MUST ATTENTION** include `## Test Specifications` with TC IDs per phase. Call `TaskList` before creating new tasks.
    <!-- /SYNC:plan-quality:reminder -->
- **IMPORTANT MUST ATTENTION** for bugfix plans, trigger Preservation question (keywords: fix, bug, regression, broken, defect)
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->
