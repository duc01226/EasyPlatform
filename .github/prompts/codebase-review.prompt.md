---
description: "Comprehensive codebase analysis and improvement recommendations"
---

# Codebase Review Prompt

## Overview

Comprehensive scan and analysis of the codebase to identify patterns, issues, and improvement opportunities. Follows systematic two-phase report-driven methodology.

## CRITICAL: Two-Phase Report-Driven Review

**MUST generate TodoWrite tasks for BOTH phases before starting!**

### Phase 1 Todos (File-by-File Review)
```
- [ ] Create review report file
- [ ] Review [file1] - document in report
- [ ] Review [file2] - document in report
- [ ] ... (one todo per file/module to review)
```

### Phase 2 Todos (Holistic Review)
```
- [ ] Read accumulated report for big picture
- [ ] Assess architecture coherence across all changes
- [ ] Check responsibility placement (new code in correct layers?)
- [ ] Detect code duplication across files
- [ ] Generate final recommendations by severity
```

**ALWAYS create a report file FIRST.** Update it as you review each file/module.

## Core Principles

Apply software engineering best practices:

| Principle | Focus |
|-----------|-------|
| **YAGNI** | Identify over-engineering |
| **KISS** | Find unnecessary complexity |
| **DRY** | Spot code duplication |
| **SOLID** | Check design principles |

## Workflow

### Pre-Phase: Research & Discovery

1. **Understand context**
   - Project purpose and domain
   - Technology stack
   - Team conventions

2. **Explore structure**
   - Directory organization
   - Module boundaries
   - Dependency graph

3. **Find existing patterns**
   - Common implementations
   - Framework usage
   - Naming conventions

### Phase 1: File-by-File Review (Build Report)

**For EACH file/module, review and UPDATE the report with:**
```markdown
### [filename/module]
- **Change Summary:** [what exists/changed]
- **Purpose:** [why this code exists]
- **Issues Found:** [list any problems]
- **Suggestions:** [improvements if any]
```

Review each layer systematically:

#### Backend Review

| Area | Check For |
|------|-----------|
| **Architecture** | Clean Architecture adherence, layer separation |
| **CQRS** | Command/Query separation, handler organization |
| **Entities** | Domain modeling, validation, expressions |
| **Repositories** | Pattern usage, extension methods |
| **Events** | Side effect handling, event consumers |
| **Validation** | PlatformValidationResult usage, async validation |
| **Security** | Authorization, input validation, secrets |
| **Performance** | N+1 queries, missing indexes, async usage |

#### Frontend Review

| Area | Check For |
|------|-----------|
| **Components** | Base class usage, lifecycle handling |
| **State** | PlatformVmStore patterns, signal usage |
| **Forms** | Validation, async validators, FormArray |
| **Services** | PlatformApiService extension, caching |
| **Subscriptions** | untilDestroyed() usage, memory leaks |
| **Templates** | BEM naming, accessibility |
| **Performance** | Change detection, lazy loading |

### Phase 2: Holistic Review (Review the Report)

After ALL files reviewed, READ the accumulated report and generate FINAL assessment:
- Review the report as a whole to see big picture
- Evaluate technical solution/codebase completeness
- Check responsibility placement: Are files/methods in the right layer?
- Detect code duplication across files (same logic in multiple places)
- Assess architecture coherence: Does the solution follow Clean Architecture?
- Backend: Are CQRS patterns correct? Event handlers vs direct calls?
- Frontend: Are components, stores, services properly separated?
- Cross-cutting: Is the feature split correctly between backend and frontend?
- Generate final recommendations prioritized by severity

### Issue Categorization

Classify findings by severity:

| Severity | Description | Action |
|----------|-------------|--------|
| **Critical** | Security, data loss, crashes | Immediate fix |
| **High** | Bugs, major performance issues | Fix soon |
| **Medium** | Code smell, minor issues | Plan fix |
| **Low** | Style, minor improvements | Consider |

### Pattern Review

Check for anti-patterns:

#### Backend Anti-Patterns

| Anti-Pattern | Correct Pattern |
|--------------|-----------------|
| Direct cross-service DB access | Message bus communication |
| Side effects in command handlers | Entity event handlers |
| DTO mapping in handlers | DTO owns mapping |
| Manual validation throwing | PlatformValidationResult fluent |
| Custom repository interfaces | Platform repo + extensions |

#### Frontend Anti-Patterns

| Anti-Pattern | Correct Pattern |
|--------------|-----------------|
| Direct HttpClient | Extend PlatformApiService |
| Manual signals | PlatformVmStore |
| Missing untilDestroyed() | Always pipe with cleanup |
| Raw Component | Extend base classes |
| Missing BEM classes | All elements have BEM |

### Security Review

| Check | Look For |
|-------|----------|
| **Authentication** | Proper auth on all endpoints |
| **Authorization** | Role checks, data filtering |
| **Input Validation** | Injection prevention |
| **Secrets** | No hardcoded credentials |
| **Dependencies** | Known vulnerabilities |

### Report Generation

Create comprehensive report:

```markdown
## Codebase Review Report

### Executive Summary
- Overall health: [Good/Fair/Needs Attention]
- Critical issues: [count]
- Areas of excellence: [list]
- Areas for improvement: [list]

### Architecture Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| Clean Architecture | ✅/⚠️/❌ | [Notes] |
| CQRS Implementation | ✅/⚠️/❌ | [Notes] |
| Framework Patterns | ✅/⚠️/❌ | [Notes] |

### Issues Found

#### Critical
| Issue | Location | Recommendation |
|-------|----------|----------------|
| [Issue] | [File:Line] | [Fix] |

#### High Priority
...

#### Medium Priority
...

### Code Quality Metrics

| Metric | Value | Target |
|--------|-------|--------|
| Duplication | X% | <5% |
| Pattern adherence | X% | >90% |
| Test coverage | X% | >80% |

### Recommendations

#### Immediate (Critical)
1. [Action item]

#### Short-term (High Priority)
1. [Action item]

#### Long-term (Improvements)
1. [Action item]

### Positive Patterns Found
- [Good pattern 1]
- [Good pattern 2]

### Next Steps
1. Address critical issues
2. Create tickets for high priority
3. Plan improvements sprint
```

## Review Checklist

### Architecture
- [ ] Clean layer separation
- [ ] No circular dependencies
- [ ] Framework patterns used correctly
- [ ] Consistent project structure

### Code Quality
- [ ] No code duplication (DRY)
- [ ] Single responsibility (SOLID)
- [ ] Appropriate abstraction levels
- [ ] Clear naming conventions

### Security
- [ ] All endpoints authenticated
- [ ] Authorization checks present
- [ ] Input validation
- [ ] No secrets in code

### Performance
- [ ] No N+1 queries
- [ ] Proper async/await
- [ ] Efficient data loading
- [ ] Appropriate caching

### Maintainability
- [ ] Readable code
- [ ] Appropriate comments
- [ ] Tests present
- [ ] Documentation current

## Output Guidelines

- Be concise - prioritize important findings
- Be specific - include file paths and line numbers
- Be actionable - provide clear recommendations
- Be balanced - note positives as well as issues
- Be prioritized - order by severity

## Important

- This is analysis only - do not implement fixes
- Report all findings objectively
- Prioritize security and critical issues
- Provide actionable recommendations

**IMPORTANT:** Focus on analysis and recommendations. Implementation requires separate approval.
