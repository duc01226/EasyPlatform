---
name: feature-investigation
description: >-
  Investigate and explain how existing features/logic work. READ-ONLY exploration.
  Triggers: how does, explain, what is the logic, investigate, understand, where is,
  trace, walk through, show me how.
  NOT for: implementing (use feature-implementation), debugging (use debugging).
version: 2.0.0
allowed-tools: Read, Grep, Glob, Task, WebFetch, WebSearch, TodoWrite
infer: true
---

# Feature Investigation

READ-ONLY exploration skill for understanding existing features. No code changes.

## Mode Selection

| Mode | Use When | Workflow |
|------|----------|----------|
| **Interactive** | User available, exploratory question | Real-time collaboration, iterative tracing |
| **Autonomous** | Deep analysis, complex cross-service tracing | Structured 4-phase workflow with analysis artifact |

## Workflow

1. **Discovery** - Search codebase for all files related to the feature/question. Prioritize: Entities > Commands/Queries > EventHandlers > Controllers > Consumers > Components.
2. **Knowledge Graph** - Read and analyze each file. Document purpose, symbols, dependencies, data flow. Batch in groups of 10, update progress after each batch.
3. **Flow Mapping** - Trace entry points through processing pipeline to exit points. Map data transformations, persistence, side effects, cross-service boundaries.
4. **Analysis** - Extract business rules, validation logic, authorization, error handling. Document happy path and edge cases.
5. **Synthesis** - Write executive summary answering the original question. Include key files, patterns used, and text-based flow diagrams.
6. **Present** - Deliver findings using the structured output format. Offer deeper dives on subtopics.

## ⚠️ MUST READ Before Investigation

**IMPORTANT: You MUST read these files before starting. Do NOT skip.**

- **⚠️ MUST READ** `.claude/skills/shared/anti-hallucination-protocol.md` — Assumption validation, evidence chains, context anchoring
- **⚠️ MUST READ** `.claude/skills/shared/knowledge-graph-template.md` — Per-file analysis structure

**If preceded by `/scout`:** Use Scout's numbered file list as analysis targets. Skip redundant discovery. Prioritize HIGH PRIORITY files first.

## Investigation Techniques

Brief inline reference:

| Looking for | Search in |
|---|---|
| Entity CRUD | `UseCaseCommands/`, `UseCaseQueries/` |
| Business logic | `Domain/Entities/`, `*Service.cs` |
| Side effects | `UseCaseEvents/`, `*EventHandler.cs` |
| Cross-service | `*Consumer.cs`, `*BusMessage.cs` |
| API endpoints | `Controllers/`, `*Controller.cs` |
| Frontend | `libs/apps-domains/`, `*.component.ts` |
| Background jobs | `*BackgroundJob*.cs`, `*Job.cs` |

**⚠️ MUST READ — Full techniques, grep patterns, dependency tracing:** `references/investigation-techniques.md`

## Evidence Collection

Autonomous mode writes analysis to `.ai/workspace/analysis/[feature-name]-investigation.md`.

**⚠️ MUST READ — Full per-file template, knowledge graph fields, findings format:** `references/evidence-collection.md`

## Output Format

```markdown
## Answer
[Direct answer in 1-2 paragraphs]

## How It Works
### 1. [Step] - [Explanation with `file:line` reference]
### 2. [Step] - [Explanation with `file:line` reference]

## Key Files
| File | Purpose |
|------|---------|

## Data Flow
[Text diagram: Entry -> Processing -> Persistence -> Side Effects]

## Want to Know More?
- [Subtopic 1]
- [Subtopic 2]
```

## Guidelines

- **Evidence-based**: Every claim needs code evidence. Mark unverified claims as "inferred".
- **Question-focused**: Tie all findings back to the original question.
- **Read-only**: Never suggest changes unless explicitly asked.
- **Layered explanation**: Start simple, offer deeper detail on request.

## Related Skills

- `feature-implementation` - Implementing new features (code changes)
- `debugging` - Debugging and fixing issues
- `scout` - Quick codebase discovery (run before investigation)
