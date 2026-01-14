Simplify and refine code for clarity, consistency, and maintainability.

## Scope

**Target:** $ARGUMENTS (default: recently modified files)

## Simplification Actions

| Action | Description |
|--------|-------------|
| Reduce nesting | Flatten deep if/else chains with guard clauses |
| Extract methods | Break long methods into focused units |
| Simplify conditionals | Use early returns, named booleans |
| Remove duplication | Apply DRY, use platform patterns |
| Improve naming | Make code self-documenting |

## Workflow

1. **Identify targets**
   - If no arguments: `git diff --name-only HEAD~1` for recent changes
   - If arguments provided: use specified files/patterns
   - Skip: generated code, migrations, vendor files

2. **Analyze each file**
   - Identify complexity hotspots (nesting > 3, methods > 20 lines)
   - Find duplicated code patterns
   - Check naming clarity

3. **Apply simplifications**
   - One refactoring type at a time
   - Preserve all functionality
   - Follow platform patterns

4. **Verify**
   - Run related tests if available
   - Confirm no behavior changes

## Platform Patterns to Apply

### Backend (C#)
- Extract to `Entity.XxxExpr()` static expressions
- Use fluent helpers: `.With()`, `.Then()`, `.PipeIf()`
- Move mapping to DTO `MapToObject()` / `MapToEntity()`

### Frontend (TypeScript)
- Use `PlatformVmStore` for state
- Apply `untilDestroyed()` to subscriptions
- Ensure BEM class naming

## Constraints

- **Preserve functionality** - No behavior changes
- **Keep tests passing** - Verify after changes
- **Follow patterns** - Use platform conventions
- **Document intent** - Add comments only where non-obvious

## Example

```
User: /code-simplifier src/Domain/Entities/Employee.cs

Claude:
1. Analyzed Employee.cs (145 lines)
2. Found: 2 nested conditionals, 1 duplicated expression
3. Applied:
   - Extracted IsActiveInCompanyExpr() static expression
   - Replaced nested if with guard clause in Validate()
   - Renamed `x` to `employee` in lambda
4. Tests: All passing
5. Complexity reduced: 145 → 128 lines
```
