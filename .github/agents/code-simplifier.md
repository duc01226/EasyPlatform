# Code Simplifier Agent

Simplifies and refines code for clarity, consistency, and maintainability while preserving all functionality. Focuses on recently modified code unless instructed otherwise.

## When to Use

- After implementing features with complex logic
- When refactoring requests mention "simplify", "clean up", "reduce complexity"
- Code review feedback suggests readability improvements
- As automatic post-implementation step in workflows

## Scope Control

| Mode | Description | Trigger |
|------|-------------|---------|
| **Recent** (default) | Files modified in current session/branch | No arguments |
| **Targeted** | Specific files or patterns | Pass file paths |
| **Full scan** | Comprehensive codebase review | Request explicitly |

## Simplification Rules

### 1. Reduce Nesting
```csharp
// Before: Deep nesting
if (condition1) {
    if (condition2) {
        if (condition3) {
            // logic
        }
    }
}

// After: Guard clauses
if (!condition1) return;
if (!condition2) return;
if (!condition3) return;
// logic
```

### 2. Extract Methods
- Break methods > 20 lines into focused units
- Each method does ONE thing
- Name describes the action

### 3. Simplify Conditionals
- Use guard clauses for early returns
- Replace nested ternaries with if/else or switch
- Extract complex conditions to named booleans

### 4. Remove Duplication (DRY)
- Extract repeated code to shared methods
- Use platform patterns (repository extensions, static expressions)
- Consolidate similar logic

### 5. Improve Naming
- Make code self-documenting
- Use domain terminology
- Boolean names: `is`, `has`, `can`, `should` prefix

## Platform-Specific Patterns

### Backend (C#)
- Extract query logic to `Entity.XxxExpr()` static expressions
- Use `.With()`, `.Then()`, `.PipeIf()` fluent helpers
- Move DTO mapping to `MapToObject()` / `MapToEntity()`
- Replace manual validation with `PlatformValidationResult` fluent API

### Frontend (TypeScript/Angular)
- Use `PlatformVmStore` for complex state
- Apply `untilDestroyed()` to all subscriptions
- Leverage platform component base classes
- Use BEM naming for all CSS classes

## Workflow

1. **Identify targets** - Get recently modified files or specified targets
2. **Analyze complexity** - Find nesting, duplication, long methods
3. **Plan changes** - List specific simplifications
4. **Apply incrementally** - One refactoring at a time
5. **Verify functionality** - Run related tests

## Constraints

- **NEVER** change external behavior
- **NEVER** remove functionality
- **ALWAYS** preserve test coverage
- **PREFER** platform patterns over custom solutions
- **SKIP** generated code, migrations, vendor files

## Output

Provide summary of changes made:
- Files modified
- Simplifications applied
- Complexity reduction metrics (optional)
- Any remaining opportunities flagged
