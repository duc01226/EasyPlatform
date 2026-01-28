---
name: scout
version: 1.0.0
description: Fast codebase file discovery for task-related files. Use when quickly locating relevant files across a large codebase, beginning work on features spanning multiple directories, or before making changes that might affect multiple parts. Triggers on "find files", "locate", "scout", "search codebase", "what files".
infer: false
allowed-tools: Glob, Grep, Read, Task, TodoWrite
---

# Scout - Fast Codebase File Discovery

Fast codebase search to locate files needed for a task. Token-efficient, parallel execution.

**KEY PRINCIPLE**: Speed over depth. Return file paths only - no content analysis.

---

## When to Use

- Quickly locating relevant files across a large codebase
- Beginning work on features spanning multiple directories
- Before making changes that might affect multiple parts
- Mapping file landscape before investigation or implementation
- Finding all files related to an entity, feature, or keyword

**NOT for**: Deep code analysis (use `feature-investigation`), debugging (use `debugging`), or implementation (use `feature-implementation`).

---

## Quick Reference

| Input               | Description                                         |
| ------------------- | --------------------------------------------------- |
| `USER_PROMPT`       | What to search for (entity names, feature keywords) |
| `SCALE`             | Number of parallel agents (default: 3)              |

---

## Workflow

### Step 1: Analyze Search Request

Extract keywords from USER_PROMPT to identify:
- Entity names (e.g., TextSnippet, Employee)
- Feature names (e.g., authentication, notification)
- File types needed (backend, frontend, or both)

### Step 2: Execute Parallel Search

Spawn SCALE number of `Explore` subagents in parallel using `Task` tool.

#### Agent Distribution Strategy

- **Agent 1 - Backend Core**: `src/Backend/*/Domain/`, `src/Backend/*/Application/UseCaseCommands/`, `src/Backend/*/Application/UseCaseQueries/`
- **Agent 2 - Backend Infra**: `src/Backend/*/Application/UseCaseEvents/`, `src/Backend/*/Api/Controllers/`, `src/Backend/*/Application/BackgroundJobs/`
- **Agent 3 - Frontend**: `src/Frontend/apps/`, `src/Frontend/libs/apps-domains/`, `src/Frontend/libs/platform-core/`

### Step 3: Synthesize Results

Combine results into a **numbered, prioritized file list**.

---

## Search Patterns by Priority

```
# HIGH PRIORITY - Core Logic
**/Domain/Entities/**/*{keyword}*.cs
**/UseCaseCommands/**/*{keyword}*.cs
**/UseCaseQueries/**/*{keyword}*.cs
**/UseCaseEvents/**/*{keyword}*.cs
**/*{keyword}*.component.ts
**/*{keyword}*.store.ts

# MEDIUM PRIORITY - Infrastructure
**/Controllers/**/*{keyword}*.cs
**/BackgroundJobs/**/*{keyword}*.cs
**/*Consumer*{keyword}*.cs
**/*{keyword}*-api.service.ts

# LOW PRIORITY - Supporting
**/*{keyword}*Helper*.cs
**/*{keyword}*Service*.cs
**/*{keyword}*.html
```

---

## Results Format

```markdown
## Scout Results: {USER_PROMPT}

### High Priority - Core Logic
1. `src/Backend/.../Domain/Entities/{Entity}.cs`
2. `src/Backend/.../UseCaseCommands/{Entity}/Save{Entity}Command.cs`
...

### Medium Priority - Infrastructure
10. `src/Backend/.../Api/Controllers/{Entity}Controller.cs`
...

### Frontend Files
30. `src/Frontend/apps/.../features/{entity}/{entity}-list.component.ts`
...

**Total Files Found:** {count}

### Suggested Starting Points
1. `{most relevant file}` - {reason}
2. `{second most relevant}` - {reason}
```

---

## See Also

- `feature-investigation` skill - Deep analysis of discovered files
- `feature-implementation` skill - Implementing features after scouting
- `planning` skill - Creating implementation plans from scouted files

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**
- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
