---
description: Investigate and fix a GitHub issue by number
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, TodoWrite, Task
---

Investigate and fix GitHub issue #$ARGUMENTS.

## Steps:

1. **Get Issue Details**
   - Run `gh issue view $ARGUMENTS` to get full issue details
   - Analyze the issue description, error messages, and any linked PRs

2. **Investigate Codebase**
   - Search codebase for related code using grep/glob
   - Identify root cause and affected files
   - Read relevant files to understand the context

3. **Plan the Fix**
   - Create detailed implementation plan
   - List all files that need to be modified
   - Identify any potential side effects

4. **Wait for Approval**
   - Present the plan to the user
   - **DO NOT proceed without explicit approval**

5. **Implement the Fix**
   - After approval, implement the fix following platform patterns from CLAUDE.md
   - Make minimal, focused changes

6. **Verify**
   - Run relevant tests to verify the fix
   - Check for any regressions
