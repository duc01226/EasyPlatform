# AI Agent Operational Principles (Boris Framework)

> Source: Community analysis of high-performance Claude Code setups
> Purpose: Reference for auditing and improving BravoSUITE's Claude configuration
> Date: 2026-02-24

---

## 1. Plan Mode Default (MANDATORY)

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity
- **Why**: Without plans, rework costs 2-3x and creates lingering technical debt

## 2. Subagent Strategy (PARALLEL EXECUTION)

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution
- **Why**: Parallel execution across 5+ terminals ships code simultaneously

## 3. Self-Improvement Loop (CONTINUOUS LEARNING)

- After ANY correction from user: update `docs/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project
- **Why**: Without this, agent makes the same mistake in every project, day after day

## 4. Verification Before Done (QUALITY GATE)

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness
- **"Done" = runs + passes tests + checks all logs + senior engineer approves for production**
- If any component fails → NOT DONE

## 5. Demand Elegance (BALANCED)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

## 6. Autonomous Bug Fixing (ZERO CONTEXT SWITCH)

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how
- **Flow**: Bug reported → auto-check logs → trace → fix → verify
- **Why**: Makes agent proactive rather than a chatbot that only answers questions

## 7. Periodic Self-Audit (PROACTIVE QUALITY)

- Periodically ask the agent to self-audit the code
- Investigate hidden bugs and prioritize Critical → Low
- Activate self-fixing workflow after audit
- **Why**: Catches issues before they reach production

---

## Task Management Principles

1. **Plan First**: Write plan to checkable items BEFORE implementation
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to track outcomes
6. **Capture Lessons**: Update lessons file after corrections

## Core Quality Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

---

## Audit Checklist (for evaluating current setup)

| Principle | Question | Status |
|-----------|----------|--------|
| Plan Mode Default | Is planning enforced before implementation? | TBD |
| Subagent Strategy | Are subagents used for parallel research/execution? | TBD |
| Self-Improvement Loop | Is there a lessons.md or equivalent learning mechanism? | TBD |
| Verification Before Done | Are quality gates enforced (tests, logs, approval)? | TBD |
| Demand Elegance | Is there a "challenge your own work" step? | TBD |
| Autonomous Bug Fixing | Can agent auto-fix bugs without user prompting each step? | TBD |
| Periodic Self-Audit | Is there a self-audit workflow? | TBD |
| Task Management | Are todos/checkpoints tracked systematically? | TBD |
| Core Quality | Are simplicity/no-laziness/minimal-impact enforced? | TBD |
