---
description: Review all uncommitted changes before commit
allowed-tools: Bash, Read, Glob, Grep, TodoWrite
---

Review all uncommitted changes and provide feedback.

## Steps:

1. **Get Change Summary**
   - Run `git status` to see all changed files
   - Run `git diff` to see actual changes (staged and unstaged)

2. **Analyze Each Changed File**
   For each modified file, check:
   - Does it follow platform patterns from CLAUDE.md?
   - Any security concerns (hardcoded secrets, SQL injection, XSS)?
   - Any performance issues (N+1 queries, missing async/await)?
   - Proper error handling?
   - Code style compliance?

3. **Check for Common Issues**
   - Unused imports or variables
   - Console.log/Debug.WriteLine statements left in
   - Hardcoded values that should be configuration
   - Missing async/await keywords
   - Incorrect exception handling
   - Missing validation

4. **Backend-Specific Checks**
   - CQRS patterns followed correctly
   - Repository usage (no direct DbContext access)
   - Entity DTO mapping patterns
   - Validation using PlatformValidationResult

5. **Frontend-Specific Checks**
   - Component base class inheritance correct
   - State management patterns
   - Memory leaks (missing unsubscribe)
   - Template binding issues

6. **Provide Summary**
   - **Critical Issues**: Must fix before commit
   - **Warnings**: Should consider fixing
   - **Info**: Minor suggestions
   - **Suggested commit message**: Based on changes
