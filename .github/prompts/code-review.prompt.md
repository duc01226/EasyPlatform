---
agent: 'agent'
description: 'Comprehensive code review following EasyPlatform patterns and best practices'
tools: ['read', 'edit', 'search', 'execute']
---

# Code Review

Perform a comprehensive code review for the following:

**Files/PR to Review:** ${input:target}
**Review Focus:** ${input:focus:All,Architecture,Performance,Security,Patterns,Testing}

## CRITICAL: Two-Phase Report-Driven Review

**MUST generate TodoWrite tasks for BOTH phases before starting!**

### Phase 1 Todos (File-by-File Review)
```
- [ ] Create review report file
- [ ] Review [file1] - document in report
- [ ] Review [file2] - document in report
- [ ] ... (one todo per changed file)
```

### Phase 2 Todos (Holistic Review)
```
- [ ] Read accumulated report for big picture
- [ ] Assess architecture coherence
- [ ] Check responsibility placement
- [ ] Detect cross-file duplication
- [ ] Generate final recommendations
```

**ALWAYS create a report file FIRST.** Update it as you review each file.

### Phase 1: File-by-File Review (Build Report)

For EACH file, document in report:
- **Change Summary:** what changed
- **Purpose:** why this change was made
- **Issues Found:** list any problems
- **Suggestions:** improvements if any

### Phase 2: Holistic Review (Review the Report)

After ALL files reviewed, READ the accumulated report to:
- See big picture of all changes
- Evaluate technical solution completeness
- Check responsibility placement (new code in right layer?)
- Detect code duplication across files
- Assess architecture coherence
- Generate final recommendations by severity

---

## Review Checklist

### Architecture & Patterns

- [ ] Clean Architecture layers respected (Domain, Application, Persistence, Service)
- [ ] CQRS pattern followed (Command + Handler + Result in ONE file)
- [ ] Service-specific repositories used (`IPlatformQueryableRootRepository`, etc.)
- [ ] No side effects in command handlers (use entity event handlers)
- [ ] DTO mapping in DTO classes, not handlers
- [ ] Static expressions defined in entities

### Code Quality

- [ ] Single Responsibility Principle followed
- [ ] No code duplication (search for existing implementations)
- [ ] Meaningful, descriptive names
- [ ] Consistent abstraction levels within methods
- [ ] Early validation and guard clauses
- [ ] Proper error handling with platform patterns

### Validation Patterns

- [ ] `PlatformValidationResult` fluent API used (`.And()`, `.AndAsync()`)
- [ ] Sync validation in Command's `Validate()` method
- [ ] Async validation in Handler's `ValidateRequestAsync()` method
- [ ] Meaningful error messages

### Performance

- [ ] Parallel tuple queries for independent operations
- [ ] `GetQueryBuilder` for reusable queries
- [ ] Proper eager loading (avoiding N+1)
- [ ] `PageBy()` for pagination
- [ ] `WhereIf()` for conditional filtering

### Security

- [ ] Authorization checks at controller and handler levels
- [ ] `RequestContext` used for user/company context
- [ ] No hardcoded sensitive data
- [ ] Input validation at boundaries

### Frontend (if applicable)

- [ ] Correct base class used (AppBaseComponent, AppBaseFormComponent, etc.)
- [ ] Platform API services used (not direct HttpClient)
- [ ] `untilDestroyed()` for subscription management
- [ ] `observerLoadingErrorState()` for loading states
- [ ] `app-loading-and-error-indicator` for UI feedback

## Review Output Format

For each issue found, provide:

1. **Location:** File path and line number
2. **Severity:** Critical | Major | Minor | Suggestion
3. **Issue:** Clear description of the problem
4. **Pattern Violation:** Which EasyPlatform pattern is violated
5. **Fix:** Recommended solution with code example

## Anti-Patterns to Flag

### Backend
- Direct cross-service database access
- Custom repository interfaces instead of extensions
- Manual validation logic instead of fluent API
- Side effects in command handlers
- DTO mapping in handlers

### Frontend
- Direct HttpClient usage
- Manual state management instead of stores
- Missing loading/error states
- Unmanaged subscriptions
