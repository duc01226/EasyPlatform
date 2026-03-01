---
name: tasks-code-review
version: 1.0.0
description: '[Code Quality] Autonomous subagent variant of code-review. Use when reviewing code changes, pull requests, or performing refactoring analysis with focus on patterns, security, and performance.'

allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Task
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/evidence-based-reasoning-protocol.md` before executing.

> **Critical Purpose:** Ensure quality — no flaws, no bugs, no missing updates, no stale content. Verify both code AND documentation.

## Quick Summary

**Goal:** Autonomous comprehensive code review with structured checklists for architecture, patterns, quality, security, and performance (subagent variant of `code-review`).

**Workflow:**

1. **Understand Context** — Get changed files, full diff, commit messages
2. **Categorize Changes** — Group by layer (Domain, Application, Persistence, Frontend)
3. **Review Each Category** — Backend checklist (Entity, Command/Query, Repository, EventHandler), Frontend checklist (Component, Store, Form, API Service)
4. **Security Review** — Authorization, input validation, sensitive data
5. **Performance Review** — Database (indexes, eager loading, paging), API (parallel ops, caching), Frontend (lazy loading, track-by, OnPush)

**Key Rules:**

- **Autonomous**: Use for comprehensive reviews without user feedback loop
- **Structured Checklists**: Follow category-specific checklists for complete coverage
- **Report Format**: Critical/Major/Minor issues with file:line references
- **Anti-Patterns**: Flag side effects in handlers, wrong repository types, DTO mapping in handlers, N+1 queries

> **Skill Variant:** Use this skill for **autonomous, comprehensive code reviews** with structured checklists. For interactive code review discussions with user feedback, use `code-review` instead.

# Code Review Workflow

## Review Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking. Every claim needs traced proof.**

- Do NOT accept code correctness at face value — verify by reading actual implementations
- Every finding must include `file:line` evidence (grep results, read confirmations)
- If you cannot prove a claim with a code trace, do NOT include it in the report
- Question assumptions: "Does this actually work?" → trace the call path to confirm
- Challenge completeness: "Is this all?" → grep for related usages across services
- Verify side effects: "What else does this change break?" → check consumers and dependents
- No "looks fine" without proof — state what you verified and how

## Core Principles (ENFORCE ALL)

**YAGNI** — Flag code solving hypothetical future problems (unused params, speculative interfaces, premature abstractions)
**KISS** — Flag unnecessarily complex solutions. Ask: "Is there a simpler way that meets the same requirement?"
**DRY** — Actively grep for similar/duplicate code across the codebase. If 3+ similar patterns exist, flag for extraction.
**Clean Code** — Readable > clever. Names reveal intent. Functions do one thing. No deep nesting (≤3 levels). Methods <30 lines.
**Follow Convention** — Before flagging ANY pattern violation, grep for 3+ existing examples in the codebase. Codebase convention wins over textbook rules.
**No Flaws/No Bugs** — Trace logic paths. Verify edge cases (null, empty, boundary values). Check error handling covers failure modes.
**Proof Required** — Every claim backed by `file:line` evidence or grep results. Speculation is forbidden.
**Doc Staleness** — Cross-reference changed files against related docs (feature docs, test specs, READMEs). Flag any doc that is stale or missing updates to reflect current code changes.

## When to Use This Skill

- Reviewing pull requests
- Analyzing code for refactoring
- Pre-commit code quality check
- Security and performance audit

## Review Dimensions

### 1. Architecture Compliance

- [ ] Follows Clean Architecture layers
- [ ] Uses correct repository pattern
- [ ] No cross-service boundary violations
- [ ] Proper separation of concerns

### 2. Pattern Adherence

- [ ] CQRS patterns followed (Command/Query/Handler in ONE file)
- [ ] Entity patterns correct (expressions, computed properties)
- [ ] Frontend component hierarchy respected
- [ ] Project base classes used correctly

### 3. Code Quality & Clean Code

- [ ] Single Responsibility Principle — each function/class does ONE thing
- [ ] No code duplication (DRY) — grep for similar code, extract if 3+ occurrences
- [ ] Meaningful naming — reveals intent, no cryptic abbreviations
- [ ] Appropriate abstractions — no over-engineering for single-use cases
- [ ] YAGNI — no speculative features, unused parameters, premature abstractions
- [ ] KISS — simplest solution that meets the requirement
- [ ] Function length <30 lines, nesting depth ≤3 levels
- [ ] Follows existing codebase conventions (verify with grep for 3+ examples)
- [ ] Edge cases handled: null, empty collections, boundary values
- [ ] Error paths verified: failures caught, logged, propagated correctly

### 4. Security

- [ ] No SQL injection vulnerabilities
- [ ] Authorization checks present
- [ ] Sensitive data handling
- [ ] Input validation

### 5. Performance

- [ ] N+1 query prevention (eager loading)
- [ ] Proper paging for large datasets
- [ ] Parallel operations where applicable
- [ ] Caching considerations

## Review Process

### Step 1: Understand Context

```bash
# Get changed files
git diff --name-only main...HEAD

# Get full diff
git diff main...HEAD

# Check commit messages
git log main...HEAD --oneline
```

### Step 2: Categorize Changes

```markdown
## Files Changed

### Domain Layer

- `Entity.cs` - New entity

### Application Layer

- `SaveEntityCommand.cs` - New command

### Persistence Layer

- `EntityConfiguration.cs` - EF configuration

### Frontend

- `entity-list.component.ts` - List component
```

### Step 3: Review Each Category

#### Backend Review Checklist

```markdown
## Entity Review

- [ ] Inherits from correct base (RootEntity/RootAuditedEntity)
- [ ] Static expressions for queries
- [ ] Computed properties have empty `set { }`
- [ ] Navigation properties have `[JsonIgnore]`
- [ ] `[TrackFieldUpdatedDomainEvent]` on tracked fields

## Command/Query Review

- [ ] Command + Handler + Result in ONE file
- [ ] Uses service-specific repository
- [ ] Validation uses fluent API
- [ ] No side effects in command handler
- [ ] DTO mapping in DTO class, not handler

## Repository Usage Review

- [ ] Uses `GetQueryBuilder` for reusable queries
- [ ] Uses `WhereIf` for optional filters
- [ ] Parallel tuple queries for count + data
- [ ] Proper eager loading

## Event Handler Review

- [ ] In `UseCaseEvents/` folder
- [ ] Uses project entity event handler base class (see docs/backend-patterns-reference.md)
- [ ] `HandleWhen` is `public override async Task<bool>`
- [ ] Filters by `CrudAction` appropriately
```

#### Frontend Review Checklist

```markdown
## Component Review

- [ ] Correct base class for use case
- [ ] Store provided at component level
- [ ] Loading/error states handled
- [ ] `untilDestroyed()` on subscriptions
- [ ] Track-by in `@for` loops

## Store Review

- [ ] State interface defined
- [ ] `vmConstructor` provides defaults
- [ ] Effects use `observerLoadingErrorState`
- [ ] Immutable state updates

## Form Review

- [ ] `validateForm()` before submit
- [ ] Async validators conditional
- [ ] Dependent validations configured
- [ ] Error messages for all rules

## API Service Review

- [ ] Extends project API service base class (see docs/frontend-patterns-reference.md)
- [ ] Typed responses
- [ ] Caching where appropriate
```

### Step 4: Security Review

```markdown
## Security Checklist

### Authorization

- [ ] Authorization attributes on controllers (see docs/backend-patterns-reference.md)
- [ ] Role checks in handlers
- [ ] Data filtered by company/user context

### Input Validation

- [ ] All inputs validated
- [ ] No raw SQL strings
- [ ] File upload validation

### Sensitive Data

- [ ] No secrets in code
- [ ] Passwords hashed
- [ ] PII handled correctly
```

### Step 5: Performance Review

```markdown
## Performance Checklist

### Database

- [ ] Indexes on filtered columns
- [ ] Eager loading for N+1 prevention
- [ ] Paging for large datasets

### API

- [ ] Response size reasonable
- [ ] Parallel operations used
- [ ] Caching for static data

### Frontend

- [ ] Lazy loading for routes
- [ ] Track-by for lists
- [ ] OnPush change detection
```

## Common Issues to Flag

### :x: Anti-Patterns

```csharp
// Issue: Side effect in command handler
await notificationService.SendAsync(...);

// Issue: Wrong repository type
GenericRootRepository<Entity>  // Should be service-specific

// Issue: DTO mapping in handler
var entity = new Entity { Name = request.Name };  // Should use DTO.MapToEntity()

// Issue: Missing eager loading
var items = await repo.GetAllAsync(...);  // Missing relations
items.ForEach(i => Console.WriteLine(i.Related.Name));  // N+1!
```

```typescript
// Issue: No loading state
this.api.getItems().subscribe(items => this.items = items);

// Issue: Direct mutation
this.state.items.push(newItem);

// Issue: Missing cleanup
this.data$.subscribe(...);  // Missing untilDestroyed()
```

## Review Report Template

```markdown
# Code Review Report

## Summary

- **PR/Changes**: [Description]
- **Reviewer**: AI
- **Date**: [Date]

## Overall Assessment

[APPROVED | APPROVED WITH COMMENTS | CHANGES REQUESTED]

## Strengths

1. [Positive point 1]
2. [Positive point 2]

## Issues Found

### Critical (Must Fix)

1. **[File:Line]**: [Description]
    - Problem: [Explanation]
    - Suggestion: [Fix]

### Major (Should Fix)

1. **[File:Line]**: [Description]

### Minor (Consider Fixing)

1. **[File:Line]**: [Description]

## Recommendations

1. [Recommendation 1]
2. [Recommendation 2]
```

## Review Commands

```bash
# Find potential issues
grep -r "new Entity {" --include="*.cs"  # DTO mapping in handler
grep -r "SendAsync\|NotifyAsync" --include="*CommandHandler.cs"  # Side effects
grep -r "GenericRootRepository" --include="*.cs"  # Generic repository (should be service-specific)

# Check patterns
grep -r "observerLoadingErrorState" --include="*.ts"  # Loading tracking
grep -r "untilDestroyed" --include="*.ts"  # Subscription cleanup
```

## Verification Checklist

- [ ] All changed files reviewed
- [ ] Architecture compliance verified
- [ ] Project patterns followed
- [ ] Security concerns addressed
- [ ] Performance considered
- [ ] Documentation staleness checked (changed files cross-referenced against related docs)
- [ ] Review report generated

## Related

- `code-review`
- `tasks-test-generation`

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
