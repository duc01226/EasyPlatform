---
description: ⚡ Fast implementation - skip research, minimal planning
argument-hint: [tasks]
---

Start working on these tasks immediately with minimal planning:
<tasks>$ARGUMENTS</tasks>

**Mode:** FAST - Skip research, minimal planning, trust your knowledge.

## Workflow

1. **Quick Planning** (skip research phase)
   - Analyze task requirements directly
   - Create minimal todo list with `TodoWrite`
   - NO researcher subagents, NO scout commands

2. **Rapid Implementation**
   - Use `/code` directly on tasks
   - Skip multi-step planning documents
   - Focus on working code over documentation

3. **Quick Validation**
   - Run type-check and compile
   - Manual spot-check over full test suite
   - Skip code-reviewer subagent

4. **Commit** (optional)
   - Ask user if ready to commit via `AskUserQuestion`
   - If yes, use `/git:cm`

## When to Use

- Simple features with clear requirements
- Bug fixes with known solutions
- Refactoring tasks
- When user says "just do it"

## Trade-offs

| Aspect | Fast Mode | Full Mode |
|--------|-----------|-----------|
| Research | Skipped | Multiple agents |
| Planning | Minimal | Full plan docs |
| Testing | Quick check | Full test suite |
| Review | Skipped | Code-reviewer |
| Speed | ~2x faster | Thorough |
