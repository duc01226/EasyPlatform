# Claude Code Workflow System - Quick Reference

> Automatic intent detection + multi-step workflow orchestration via hooks.

## How It Works

```
User Prompt → Hook (workflow-router.cjs) → Pattern Match → Inject Instructions → LLM Follows
```

1. **Hook intercepts** every prompt before LLM sees it
2. **Pattern matching** against `workflows.json` determines intent
3. **Instructions injected** as system context ("MUST FOLLOW: /plan → /cook → /test")
4. **LLM executes** each skill in sequence

## Key Files

| File | Purpose |
|------|---------|
| `.claude/settings.json` | Hook registration (when scripts run) |
| `.claude/workflows.json` | Workflow definitions (patterns, sequences) |
| `.claude/hooks/workflow-router.cjs` | Core detection engine |
| `.claude/hooks/dev-rules-reminder.cjs` | Session context injection |

## Workflow Types

| Workflow | Triggers | Sequence |
|----------|----------|----------|
| **Feature** | "add", "implement", "create" | `/plan` → `/cook` → `/test` → `/code-review` |
| **Bugfix** | "fix", "bug", "broken", "crash" | `/debug` → `/plan` → `/fix` → `/test` |
| **Refactor** | "refactor", "improve", "clean up" | `/plan` → `/code` → `/test` → `/code-review` |
| **Investigation** | "how does", "where is", "explain" | `/scout` → `/investigate` |
| **Documentation** | "doc", "readme", "document" | `/docs/update` → `/watzup` |

## Detection Logic

```javascript
// 1. Check override prefix
if (prompt.startsWith('quick:')) → Skip detection

// 2. Check explicit command
if (prompt.startsWith('/')) → Skip detection

// 3. Pattern match each workflow
for (workflow of workflows) {
  if (excludePatterns.match(prompt)) → Skip this workflow
  if (triggerPatterns.match(prompt)) → Score += 10
}

// 4. Select highest scoring workflow (lowest priority number wins ties)
```

## Override Methods

| Method | Example | Effect |
|--------|---------|--------|
| `quick:` prefix | `quick: add a button` | Skip workflow, direct handling |
| Explicit command | `/plan implement dark mode` | Bypass detection, run command |
| Say "quick" | When asked "Proceed?" | Abort workflow, handle directly |

## Configuration Example

```json
// .claude/workflows.json
{
  "settings": {
    "enabled": true,
    "confirmHighImpact": true,
    "overridePrefix": "quick:"
  },
  "workflows": {
    "feature": {
      "triggerPatterns": ["\\b(implement|add|create)\\b"],
      "excludePatterns": ["\\b(fix|bug)\\b"],
      "sequence": ["plan", "cook", "test"],
      "confirmFirst": true,
      "priority": 10
    }
  }
}
```

## Mandatory Todo Task Creation (CRITICAL)

**Before executing ANY workflow, you MUST create a todo list for each step:**

```
User: "Fix the login bug"
     ↓
Claude creates todo list:
- [ ] Execute /scout - Find relevant files
- [ ] Execute /investigate - Build knowledge graph
- [ ] Execute /debug - Root cause analysis
- [ ] Execute /plan - Create fix plan
- [ ] Execute /fix - Implement fix
- [ ] Execute /code-review - Review changes
- [ ] Execute /test - Verify fix
     ↓
Claude marks each todo as completed after execution
```

**Why mandatory?**
- Provides visibility into multi-step progress
- Prevents skipped steps
- Enables user to track remaining work
- Ensures systematic execution

## Execution Example

```
User: "Add dark mode toggle"
     ↓
Hook: Matches "add" → Feature workflow (100% confidence)
     ↓
Injects: "MUST FOLLOW: /plan → /cook → /test"
     ↓
Claude: "Detected: Feature Implementation. Proceed? (yes/no/quick)"
     ↓
User: "yes"
     ↓
Claude: Creates todo list with all workflow steps
     ↓
Claude: Executes Skill("plan") → marks todo done → Skill("cook") → marks todo done → ...
```

## Why It Works

LLM follows workflows because:
- Instructions injected as `<system-reminder>` blocks
- Phrases like "MUST FOLLOW" treated as authoritative
- Numbered steps provide clear execution order
- **Todo task tracking** provides visible progress and completion markers

**No built-in workflow logic** - just context injection + todo tracking that influences LLM behavior.

---

*Full documentation: [workflow-orchestration-system.md](workflow-orchestration-system.md)*
