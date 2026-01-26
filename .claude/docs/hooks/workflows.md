# Workflow System Documentation

> Detects user intent and routes to appropriate workflows.

## Overview

The workflow system analyzes user prompts to detect intent (feature, bug fix, refactor, etc.) and routes to predefined workflow sequences.

## Hooks

| Hook                        | Trigger             | Purpose                          |
| --------------------------- | ------------------- | -------------------------------- |
| `workflow-router.cjs`       | UserPromptSubmit    | Detect intent, activate workflow |
| `workflow-step-tracker.cjs` | PostToolUse (Skill) | Track workflow progress          |

## Intent Detection

```
User prompt → Keyword analysis → Intent classification → Workflow activation
```

### Intent Types

| Intent            | Trigger Keywords                                    | Workflow Sequence                                                                                 |
| ----------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Feature**       | implement, add, create, build, develop, new feature | /plan → /plan:review → /cook → /code-simplifier → /review → /test → /docs/update → /watzup        |
| **Bug Fix**       | bug, fix, error, broken, issue, crash, not working  | /scout → /investigate → /debug → /plan → /plan:review → /fix → /code-simplifier → /review → /test |
| **Documentation** | docs, document, readme, update docs                 | /scout → /investigate → /docs-update → /watzup                                                    |
| **Refactoring**   | refactor, restructure, clean up, improve code       | /plan → /plan:review → /code → /code-simplifier → /review → /test                                 |
| **Code Review**   | review, check, audit code, PR review                | /code-review → /watzup                                                                            |
| **Investigation** | how does, where is, explain, understand, find       | /scout → /investigate                                                                             |

## Workflow State

Stored in `.claude/.workflow-state.json`:

```json
{
  "active_workflow": "feature",
  "current_step": 3,
  "total_steps": 8,
  "steps": [
    { "skill": "/plan", "status": "completed" },
    { "skill": "/plan:review", "status": "completed" },
    { "skill": "/cook", "status": "in_progress" },
    { "skill": "/code-simplifier", "status": "pending" },
    { "skill": "/review:codebase", "status": "pending" },
    { "skill": "/test", "status": "pending" },
    { "skill": "/docs/update", "status": "pending" },
    { "skill": "/watzup", "status": "pending" }
  ],
  "started_at": "2026-01-13T09:00:00Z"
}
```

## Output Format

When workflow is detected:

```markdown
## Active Workflow

**Workflow:** Feature Implementation
**Progress:** Step 3/8
**Current Step:** `/cook`
**Remaining:** /cook → /code-simplifier → /review:codebase → /test → /docs/update → /watzup

### Instructions (MUST FOLLOW)

1. **CONTINUE** the workflow by executing: `/cook`
2. After completing this step, proceed to the next step in sequence
3. Do NOT skip steps unless explicitly instructed by the user
```

## Workflow Controls

Users can control workflow execution:

| Command         | Effect                          |
| --------------- | ------------------------------- |
| `skip`          | Skip current step, move to next |
| `abort`         | Cancel active workflow          |
| `quick:` prefix | Bypass workflow detection       |

## Lib Modules

| Module               | Purpose                   |
| -------------------- | ------------------------- |
| `wr-config.cjs`      | Workflow definitions      |
| `wr-control.cjs`     | Workflow state management |
| `wr-detect.cjs`      | Intent detection logic    |
| `wr-output.cjs`      | Output formatting         |
| `workflow-state.cjs` | State persistence         |

## Configuration

Workflow definitions in `.claude/workflows.json`:

```json
{
  "feature": {
    "name": "Feature Implementation",
    "triggers": ["implement", "add", "create", "build"],
    "steps": ["/plan", "/plan:review", "/cook", "/code-simplifier", "/review:codebase", "/test", "/docs/update", "/watzup"]
  }
}
```

## Debugging

View active workflow:
```bash
cat .claude/.workflow-state.json | jq
```

Check workflow definitions:
```bash
cat .claude/workflows.json | jq '.feature'
```

---

*See also: [Session Lifecycle](session/) for workflow state persistence*
