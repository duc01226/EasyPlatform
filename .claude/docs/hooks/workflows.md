# Workflow System Documentation

> AI-driven catalog injection for automated workflow selection and execution.

## Overview

The workflow system injects a compact workflow catalog on each qualifying user prompt. The AI reads the catalog, matches user intent against `whenToUse`/`whenNotToUse` fields, and activates the best-matching workflow via `/workflow-start <id>`.

```
User prompt → Catalog injection → AI intent matching → Workflow activation
```

## Hooks

| Hook                        | Trigger             | Purpose                              |
| --------------------------- | ------------------- | ------------------------------------ |
| `workflow-router.cjs`       | UserPromptSubmit    | Inject workflow catalog for AI selection |
| `workflow-step-tracker.cjs` | PostToolUse (Skill) | Track workflow step progress         |

## Catalog Injection

On every non-command prompt ≥15 characters, `workflow-router.cjs` injects:

1. **Workflow Catalog** — ~2 lines per workflow (name, `whenToUse`, `whenNotToUse`, step sequence)
2. **Detection Instructions** — Match prompt → select workflow → call `/workflow-start <id>` → create TaskCreate items
3. **Active Workflow Context** — If a workflow is already active, shows current step and allows auto-switch

### Skip Conditions

Catalog injection is skipped when:
- Prompt starts with `/` (explicit command)
- Prompt is < 15 characters (confirmations like "yes", "ok", "go ahead")
- Workflow settings are disabled

## Workflow State

Stored in `.claude/.workflow-state.json`:

```json
{
  "workflowType": "feature",
  "workflowSteps": ["plan", "plan-review", "cook", "code-simplifier", "code-review", "changelog", "test", "docs-update", "watzup"],
  "currentStepIndex": 2,
  "completedSteps": ["plan", "plan-review"],
  "activePlan": null,
  "todos": [],
  "startedAt": "2026-01-13T09:00:00.000Z",
  "lastUpdatedAt": "2026-01-13T09:30:00.000Z",
  "metadata": {}
}
```

## Workflow Controls

Users can control workflow execution:

| Command         | Effect                          |
| --------------- | ------------------------------- |
| `skip`          | Skip current step, move to next |
| `abort`         | Cancel active workflow          |
| `quick:` prefix | Skip workflow confirmation, execute directly |

## Lib Modules

| Module               | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `wr-config.cjs`      | Load workflow configuration from workflows.json |
| `workflow-state.cjs` | State persistence and step info                |
| `workflow-router.cjs`| Catalog injection + post-activation output     |

## Configuration

Workflow definitions in `.claude/workflows.json` (v2.0.0):

```json
{
  "version": "2.0.0",
  "settings": {
    "enabled": true,
    "showDetection": true,
    "allowOverride": true,
    "overridePrefix": "quick:",
    "confirmHighImpact": true
  },
  "commandMapping": {
    "cook": { "claude": "/cook", "copilot": "/cook" },
    "code-review": { "claude": "/code-review", "copilot": "/code-review" }
  },
  "workflows": {
    "feature": {
      "name": "Feature Implementation",
      "confirmFirst": false,
      "whenToUse": "User wants to implement new functionality...",
      "whenNotToUse": "Bug fixes, documentation...",
      "sequence": ["plan", "plan-review", "cook", "code-simplifier", "code-review", "changelog", "test", "docs-update", "watzup"],
      "preActions": {
        "activateSkill": "...",
        "readFiles": ["..."],
        "injectContext": "..."
      }
    }
  }
}
```

### Workflow Options

| Field          | Type     | Description                                           |
| -------------- | -------- | ----------------------------------------------------- |
| `name`         | string   | Display name                                          |
| `confirmFirst` | bool     | Ask user before starting                              |
| `whenToUse`    | string   | Natural language — when AI should select this workflow |
| `whenNotToUse` | string   | Natural language — when AI should NOT select this      |
| `sequence`     | string[] | Step IDs executed in order                            |
| `preActions`   | object   | Optional: `activateSkill`, `readFiles`, `injectContext` |

## Debugging

View active workflow:
```bash
cat .claude/.workflow-state.json | jq
```

Check workflow definitions:
```bash
cat .claude/workflows.json | jq '.workflows.feature'
```

---

*See also: [Configuration Reference](../configuration.md) | [Session Lifecycle](session/) for workflow state persistence*
