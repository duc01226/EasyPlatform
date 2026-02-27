# Agent Orchestration Principles

> Extracted from Boris's AI agent workflow methodology. These principles guide how AI agents should be configured, managed, and improved in a team setting.

---

## 1. Workflow Orchestration

### 1.1 Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 1.2 Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 1.3 Self-Improvement Loop
- After ANY correction from the user: record the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these rules until mistake rate drops
- Review lessons at session start for relevant project

### 1.4 Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 1.5 Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 1.6 Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## 2. Task Management

1. **Plan First**: Write plan with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section
6. **Capture Lessons**: Update lessons after corrections

---

## 3. Core Principles

| Principle | Description |
|-----------|-------------|
| **Simplicity First** | Make every change as simple as possible. Impact minimal code. |
| **No Laziness** | Find root causes. No temporary fixes. Senior developer standards. |
| **Minimal Impact** | Changes should only touch what's necessary. Avoid introducing bugs. |

---

## 4. Key Takeaways for Configuration

### "Done" Redefined
"Done" = runs + passes tests + logs clean + production-ready. Not just "code written."

### Plan-First Prevents Cost Overruns
Without a plan, incorrect agent work = start over + 2-3x cost + tech debt accumulation.

### Self-Improvement Requires Explicit Recording
Agents don't learn across sessions unless patterns are persisted (MEMORY.md, `docs/lessons.md`).

### Autonomous Bug Fixing = Highest ROI
Bug report → auto-check logs → trace → fix. Zero human context-switching needed.

### Agent as Junior Developer Mental Model
Write rules as if onboarding a junior developer: clear requirements, standards, feedback loops.

---

## 5. Application to EasyPlatform

Gap analysis completed 2026-02-23. Improvements implemented in 5 phases:

| Principle | Gap Found | Implementation |
| --------- | --------- | -------------- |
| **1.1 Plan Mode Default** | Plan artifact not verified | `todo-enforcement.cjs` plan gate checks `plans/` dir for implementation skills |
| **1.2 Subagent Strategy** | No registry documentation | `docs/claude/subagent-registry.md` (16 agents, protocols, PATTERN_AWARE set) |
| **1.3 Self-Improvement** | No cross-session lessons | `MEMORY.md` (auto-loaded), `docs/lessons.md` (append-only), `lessons-writer.cjs` |
| **1.4 Verification** | No completion gate | `todo-enforcement.cjs` blocks implementation skills without active todos |
| **1.5 Demand Elegance** | No quality feedback | `/learn` command + `lessons.md` for capturing quality patterns |
| **1.6 Autonomous Bug Fix** | No failure escalation | `auto-fix-trigger.cjs` with 3-tier escalation (suggest → warn → rollback) |

Additional: `quick:` prefix bypasses workflow detection for simple tasks.
