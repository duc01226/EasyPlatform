# Code Review: $ARGUMENTS

Perform a comprehensive code review following EasyPlatform standards.

## Review Scope

Target: $ARGUMENTS (can be a PR number, file path, or branch name)

## Review Checklist

### 1. Architecture Compliance
- [ ] Follows Clean Architecture layers (Domain, Application, Persistence, Service)
- [ ] Uses correct repository pattern (I{Service}RootRepository<T>)
- [ ] CQRS pattern: Command/Query + Handler + Result in ONE file
- [ ] No cross-service direct database access

### 2. Code Quality
- [ ] Single Responsibility Principle
- [ ] No code duplication
- [ ] Meaningful variable/method names
- [ ] Appropriate error handling with PlatformValidationResult

### 3. Platform Patterns
- [ ] Uses platform validation fluent API (.And(), .AndAsync())
- [ ] No direct side effects in command handlers (use entity events)
- [ ] DTO mapping in DTO classes, not handlers
- [ ] Static expressions for entity queries

### 4. Security
- [ ] No hardcoded credentials
- [ ] Proper authorization checks
- [ ] Input validation at boundaries
- [ ] No SQL injection risks

### 5. Performance
- [ ] Parallel operations where independent
- [ ] Proper pagination for lists
- [ ] No N+1 query patterns
- [ ] Appropriate use of async/await

## Output Format

Provide feedback in this format:

**Summary:** Brief overall assessment

**Critical Issues:** (Must fix)
- Issue 1: Description and suggested fix
- Issue 2: Description and suggested fix

**Suggestions:** (Nice to have)
- Suggestion 1
- Suggestion 2

**Positive Notes:**
- What was done well
