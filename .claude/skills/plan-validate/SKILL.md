---
name: plan-validate
version: 1.0.0
description: '[Planning] Validate plan with critical questions interview'
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/understand-code-first-protocol.md` before executing.

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

| Category         | Keywords to detect                                                |
| ---------------- | ----------------------------------------------------------------- |
| **Architecture** | "approach", "pattern", "design", "structure", "database", "API"   |
| **Assumptions**  | "assume", "expect", "should", "will", "must", "default"           |
| **Tradeoffs**    | "tradeoff", "vs", "alternative", "option", "choice", "either/or"  |
| **Risks**        | "risk", "might", "could fail", "dependency", "blocker", "concern" |
| **Scope**        | "phase", "MVP", "future", "out of scope", "nice to have"          |

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

## **IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks using `TaskCreate`
- Always add a final review todo task to verify work quality and identify fixes/enhancements
- **MANDATORY FINAL TASKS:** After creating all planning todo tasks, ALWAYS add these two final tasks:
  1. **Task: "Run /plan-validate"** — Trigger `/plan-validate` skill to interview the user with critical questions and validate plan assumptions
  2. **Task: "Run /plan-review"** — Trigger `/plan-review` skill to auto-review plan for validity, correctness, and best practices

## Important Notes

**IMPORTANT:** Only ask questions about genuine decision points - don't manufacture artificial choices.
**IMPORTANT:** If plan is simple with few decisions, it's okay to ask fewer than min questions.
**IMPORTANT:** Prioritize questions that could change implementation significantly.
