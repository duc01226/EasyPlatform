# Orchestration Protocol

#### Sequential Chaining
Chain subagents when tasks have dependencies or require outputs from previous steps:
- **Planning → Implementation → Testing → Review**: Use for feature development
- **Research → Design → Code → Documentation**: Use for new system components
- Each agent completes fully before the next begins
- Pass context and outputs between agents in the chain

#### Parallel Execution
Spawn multiple subagents simultaneously for independent tasks:
- **Code + Tests + Docs**: When implementing separate, non-conflicting components
- **Backend + Frontend**: Isolated work on .NET services and Angular components
- **Multiple Research Topics**: Different agents researching independent technical areas
- **Careful Coordination**: Ensure no file conflicts or shared resource contention
- **Merge Strategy**: Plan integration points before parallel execution begins

#### Recovery
When a subagent fails or produces incomplete results:
- Check `TaskList` for `in_progress` tasks to identify the failure point
- Resume the failed agent with context from its last output
- If unrecoverable, mark task as completed with failure notes and proceed to next step
- After context compaction, use `TaskList` to recover workflow position
