# Orchestration Protocol

## Quick Summary

**Goal:** Define patterns for chaining and parallelizing subagent execution — sequential dependencies, parallel independence, and failure recovery.

**Key Rules:**

- **Sequential** — Each agent completes fully before the next begins; pass context between agents
- **Parallel** — Only for independent tasks with no file conflicts; plan merge strategy beforehand
- **Recovery** — Check `TaskList` for failure point, resume with context, never lose workflow position

---

### Sequential Chaining

Chain subagents when tasks have dependencies or require outputs from previous steps:

- **Planning → Implementation → Testing → Review**: Feature development
- **Research → Design → Code → Documentation**: New system components
- Each agent completes fully before the next begins
- Pass context and outputs between agents in the chain

### Parallel Execution

Spawn multiple subagents simultaneously for independent tasks:

- **Code + Tests + Docs**: Separate, non-conflicting components
- **Backend + Frontend**: Isolated .NET services and Angular components
- **Multiple Research Topics**: Independent technical areas
- **Careful Coordination**: Ensure no file conflicts or shared resource contention
- **Merge Strategy**: Plan integration points before parallel execution begins

### Recovery

When a subagent fails or produces incomplete results:

1. Check `TaskList` for `in_progress` tasks to identify failure point
2. Resume the failed agent with context from its last output
3. If unrecoverable, mark task as completed with failure notes and proceed
4. After context compaction, use `TaskList` to recover workflow position

---

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** complete each sequential agent fully before starting the next
**MANDATORY IMPORTANT MUST ATTENTION** verify no file conflicts before parallel execution
**MANDATORY IMPORTANT MUST ATTENTION** check `TaskList` to recover workflow position after failures or context compaction
