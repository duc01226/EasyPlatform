# Planning Protocol

## MANDATORY: Always Plan Before Implement

**CRITICAL INSTRUCTION:** Before implementing ANY task (bug fixes, new features, refactoring, analysis with changes), you MUST:

1. **Enter Plan Mode First** - Use `EnterPlanMode` tool automatically for non-trivial tasks
2. **Investigate & Analyze** - Explore codebase, understand context, identify affected areas
3. **Create Implementation Plan** - Write detailed plan with specific files, changes, and approach
4. **Get User Approval** - Present plan and wait for user confirmation before any code changes
5. **Only Then Implement** - Execute the approved plan

## Applies To

- Bug diagnosis and fixes
- New feature implementation
- Code refactoring
- Any task requiring file modifications

## Exceptions (Can Implement Directly)

- Single-line typo fixes
- User explicitly says "just do it" or "skip planning"
- Pure research/exploration with no code changes

## Planning Checklist

Before starting implementation:

- [ ] Understood the requirements completely
- [ ] Explored relevant codebase areas
- [ ] Identified all files that need changes
- [ ] Considered edge cases and error handling
- [ ] Verified no existing solution exists
- [ ] Created step-by-step implementation plan
- [ ] Got user approval for the plan

**DO NOT** start writing code without presenting a plan first. Always investigate, plan, then implement.
