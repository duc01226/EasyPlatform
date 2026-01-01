---
mode: agent
description: "Post-task review to ensure work follows project conventions"
tools: ["codebase", "file", "terminal"]
---

# Post-Task Review

Execute after completing any implementation task to ensure quality and convention compliance.

## Review Checklist

### 1. Code Changes Review
```bash
git diff
git status
```

### 2. Backend Checks (if applicable)
- [ ] **CQRS Pattern:** Command + Result + Handler in ONE file
- [ ] **Validation:** Uses `PlatformValidationResult` fluent API (`.And()`, `.AndAsync()`)
- [ ] **Repository:** Uses `IPlatformQueryableRootRepository<TEntity, TKey>` with extensions
- [ ] **Side Effects:** In entity event handlers (`UseCaseEvents/`), NOT in command handlers
- [ ] **DTO Mapping:** Via `MapToEntity()` / `MapToObject()`, NOT in handlers
- [ ] **Cross-Service:** Uses message bus, NOT direct database access

### 3. Frontend Checks (if applicable)
- [ ] **Component Base:** Extends `AppBaseComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent`
- [ ] **State Management:** Uses `PlatformVmStore`, NOT manual signals
- [ ] **API Service:** Extends `PlatformApiService`, NOT direct `HttpClient`
- [ ] **Subscriptions:** Uses `.pipe(this.untilDestroyed())` for cleanup
- [ ] **BEM Classes:** ALL template elements have BEM classes

### 4. Architecture Checks
- [ ] **Code Responsibility:** Logic in LOWEST layer (Entity > Service > Component)
- [ ] **No Duplication:** Searched for existing implementations
- [ ] **Clean Code:** Single responsibility, meaningful names

### 5. Documentation
- [ ] **Comments:** Only where logic isn't self-evident
- [ ] **No Over-Documentation:** Avoided unnecessary docstrings

## Actions

1. **Review all changes** against checklist
2. **Fix any violations** immediately
3. **Run dual-pass review** if corrections made
4. **Report summary** of review findings

## Output Format

```markdown
## Post-Task Review Report

### Changes Reviewed
- **Files Modified:** [list]
- **Type:** [Backend/Frontend/Both]

### Compliance Status
| Category | Status | Notes |
|----------|--------|-------|
| CQRS Pattern | OK/ISSUE | ... |
| Validation | OK/ISSUE | ... |
| BEM Classes | OK/ISSUE | ... |
| ... | ... | ... |

### Corrections Made
[List of fixes applied, or "None needed"]

### Recommendation
[Ready for commit / Needs attention / Run tests first]
```
