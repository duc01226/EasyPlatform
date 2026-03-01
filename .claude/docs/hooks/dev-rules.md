# Development Rules Documentation

> Context-aware development guidance based on file types.

## Overview

Development rules hooks inject context-specific guidance when editing files. Each hook targets specific file patterns and injects relevant patterns, best practices, and reminders.

## Hooks

| Hook | Trigger | Target Files |
|------|---------|--------------|
| `backend-csharp-context.cjs` | Edit\|Write\|MultiEdit | `*.cs` files |
| `frontend-typescript-context.cjs` | Edit\|Write\|MultiEdit | `*.ts`, `*.tsx` frontend files |
| `design-system-context.cjs` | Edit\|Write\|MultiEdit | UI component files |
| `scss-styling-context.cjs` | Edit\|Write\|MultiEdit | `*.scss`, `*.css` files |
| `dev-rules-reminder.cjs` | UserPromptSubmit | All prompts (periodic) |

## File Pattern Detection

### backend-csharp-context.cjs

**Matches**: Files ending with `.cs`

**Injects**:
- CQRS command/query patterns (see docs/backend-patterns-reference.md)
- Repository usage patterns
- Validation patterns
- Entity event handlers
- DTO mapping conventions

**Example injection**:
```markdown
## C# Development Context

- Use project validation API for validation (never throw exceptions)
- DTOs own mapping via `MapToEntity()` / `MapToObject()`
- Side effects go in Entity Event Handlers, not command handlers
```

### frontend-typescript-context.cjs

**Matches**: Files in frontend directories ending with `.ts`, `.tsx`

**Injects**:
- Component hierarchy (project base classes - see docs/frontend-patterns-reference.md)
- State management (project store - see docs/frontend-patterns-reference.md)
- Subscription cleanup (`untilDestroyed()`)
- BEM CSS naming conventions

**Example injection**:
```markdown
## Frontend Development Context

- Extend project component base classes (see docs/frontend-patterns-reference.md)
- Always use `.pipe(this.untilDestroyed())` for subscriptions
- All elements must have BEM classes (`block__element --modifier`)
```

### design-system-context.cjs

**Matches**: Component files (`.component.ts`, template files)

**Injects**:
- Design system tokens
- Color palette
- Typography scale
- Spacing conventions

### scss-styling-context.cjs

**Matches**: `*.scss`, `*.css` files

**Injects**:
- SCSS variable usage
- BEM methodology
- Responsive breakpoints
- Project style imports

### dev-rules-reminder.cjs

**Triggers**: UserPromptSubmit (periodic, not every prompt)

**Injects**:
- General development rules from `.claude/workflows/development-rules.md`
- Current session context
- Plan naming conventions

## Lib Modules

| Module | Purpose |
|--------|---------|
| `dr-context.cjs` | Context detection logic |
| `dr-paths.cjs` | File path pattern matching |
| `dr-template.cjs` | Template rendering |

## How Injection Works

1. **PreToolUse** event fires for Edit/Write/MultiEdit
2. Hook checks `tool_input.file_path` against patterns
3. If match, loads relevant context template
4. Outputs context as markdown to Claude's context

## Configuration

Context templates stored in `.claude/hooks/templates/` or inline in hook files.

**Template variables**:
- `{{file_path}}` - Current file being edited
- `{{project_type}}` - Detected project type
- `{{framework}}` - Detected framework

## Example Flow

```
User: Edit src/app/users/user.component.ts

PreToolUse fires
  → frontend-typescript-context.cjs matches *.ts
  → design-system-context.cjs matches *.component.ts

Claude receives:
  ## Frontend Development Context
  [Angular/TypeScript patterns]

  ## Design System Context
  [Design tokens and conventions]
```

## Debugging

Check which hooks match a file:
```bash
# In settings.json, find PreToolUse hooks with Edit|Write matcher
cat .claude/settings.json | jq '.hooks.PreToolUse[] | select(.matcher | test("Edit|Write"))'
```

---

*See also: [Enforcement](enforcement.md) for blocking hooks*
