---
agent: agent
description: Investigate and explain how existing features or code logic works using structured knowledge model construction. READ-ONLY exploration with no code changes.
---

# Feature Investigation

Investigate and explain how an existing feature or logic works using structured knowledge model construction.

## Investigation Target

$input

## Key Principle

This is a **READ-ONLY exploration** - no code changes. Focus on understanding and explaining through systematic evidence gathering.

---

## PHASE 1A: INITIALIZATION AND DISCOVERY

### Step 1: Initialize Analysis File

Create external memory at `ai_task_analysis_notes/[feature-name]-investigation.ai_task_analysis_notes_temp.md`:

```markdown
## Metadata

```markdown
**Original Prompt:** [Investigation question]
**Task Description:** [What we're investigating]
**Source Code Structure:** See ai-prompt-context.md
```

## Progress

- **Phase**: 1A
- **Items Processed**: 0
- **Total Items**: 0
- **Current Operation**: "initialization"
- **Current Focus**: "[feature summary]"

## Errors

[None yet]

## Assumption Validations

| Assumption | Status | Evidence |
|------------|--------|----------|
| ... | Pending/Validated/Invalid | ... |

## File List

[Numbered list of files to analyze]

## Knowledge Graph

[Detailed analysis of each file]
```

### Step 2: Semantic Discovery

Search patterns by priority:

**HIGH PRIORITY (Must Find):**
```
*Command*{Feature}*           # CQRS Commands
*Query*{Feature}*             # CQRS Queries
*{Feature}*EventHandler*      # Entity Event Handlers
*{Feature}*Consumer*          # Message Bus Consumers
*{Feature}*BackgroundJob*     # Background Jobs
*{Feature}*Controller*        # API Controllers
Domain/Entities/*{Feature}*   # Domain Entities
```

**Secondary Patterns:**
```
.*EventHandler.*{Feature}|{Feature}.*EventHandler
.*BackgroundJob.*{Feature}|{Feature}.*BackgroundJob
.*Consumer.*{Feature}|{Feature}.*Consumer
.*Service.*{Feature}|{Feature}.*Service
```

### Step 3: Prioritize and Number Files

Save ALL found files as numbered list in `## File List`:

| Priority | File Type |
|----------|-----------|
| HIGH | Domain Entities, Commands, Queries, Event Handlers, Controllers, Jobs, Consumers, Components |
| MEDIUM | Services, Helpers, DTOs, Repositories |
| LOW | Tests, Config |

---

## PHASE 1B: KNOWLEDGE GRAPH CONSTRUCTION

### Step 1: Batch Processing

Split files into batches of 10. Use TodoWrite:
```
- [ ] Analyze batch 1 (files 1-10)
- [ ] Analyze batch 2 (files 11-20)
```

### Step 2: File Analysis Schema

For each file in `## Knowledge Graph`:

```markdown
### [#] [FileName]

- **filePath**: Full path to file
- **type**: Entity | Command | Query | EventHandler | Consumer | Controller | Job | Component | Service
- **architecturalPattern**: CQRS | Repository | EventSourcing | MessageBus
- **content**: Summary of purpose and logic
- **symbols**: Key classes, interfaces, methods
- **dependencies**: Imported modules / using statements
- **businessContext**: How it contributes to business requirements
- **referenceFiles**: Other files using this file's symbols
- **relevanceScore**: 1-10 (10 = most relevant)
- **evidenceLevel**: verified | inferred
- **uncertainties**: Aspects you're unsure about
- **platformAbstractions**: Base classes used (PlatformCqrsCommand, etc.)
- **serviceContext**: Which microservice owns this
- **dependencyInjection**: DI registrations
- **genericTypeParameters**: Generic type relationships

#### Targeted Analysis

**For Backend:**
- authorizationPolicies, commands, queries
- repositoryPatterns, businessRuleImplementations

**For Consumers (CRITICAL):**
- messageBusMessage: The `*BusMessage` type consumed
- messageBusProducers: Files that SEND this message (grep ALL services)
- crossServiceIntegration: Service communication flow

**For Frontend:**
- componentHierarchy, routeConfig, stateManagementStores
- dataBindingPatterns, validationStrategies
```

### Step 3: Cross-Service Analysis

For `*Consumer.cs` extending `PlatformApplicationMessageBusConsumer<T>`:
1. Identify `*BusMessage` type
2. Grep ALL services for producers
3. Map cross-service data flow

---

## PHASE 2: CODE FLOW TRACING

### Entry Points

How is the feature triggered?
- API Endpoint → Controller → Command/Query Handler
- UI Action → Component → API Service → Backend
- Scheduled Job → BackgroundJob → Handler
- Message → Consumer → Handler

### Execution Path

```markdown
## Data Flow

[Request] → [Controller] → [Handler] → [Repository] → [Response]
                              ↓
                       [Event Handler] → [Side Effects]
                              ↓
                       [Message Bus] → [Consumer in Other Service]
```

### Side Effects

- Entity events raised
- Messages published to bus
- External service calls
- Notifications triggered

---

## PHASE 3: OUTPUT FORMAT

```markdown
## Executive Summary

[1-2 paragraph direct answer to the investigation question]

## How It Works

### 1. [Entry Point]
[Explanation with `file:line` reference]

### 2. [Core Processing]
[Explanation with `file:line` reference]

### 3. [Side Effects]
[Explanation with `file:line` reference]

## Key Files

| # | File | Type | Purpose | Relevance |
|---|------|------|---------|-----------|
| 1 | `path/file.cs:123` | Command | [Purpose] | 10/10 |

## Data Flow Diagram

```
[Visual text diagram of the flow]
```

## Platform Patterns Used

- **Pattern**: How it's applied

## Cross-Service Integration

| Source Service | Message | Target Service | Consumer |
|----------------|---------|----------------|----------|
| ... | ... | ... | ... |

## Unresolved Questions

- [Question 1]
- [Question 2]

## Want to Know More?

- [Related topic 1]
- [Related topic 2]
```

---

## Anti-Hallucination Protocol

Before ANY claim:
1. "What assumptions am I making?"
2. "Have I verified with actual code evidence?"
3. "Could I be wrong?"

### Verification Checklist

- [ ] Found actual code evidence?
- [ ] Traced the full code path?
- [ ] Checked cross-service flows?
- [ ] Documented with `file:line`?
- [ ] Answered the original question?
- [ ] Listed unresolved questions?

**If ANY unchecked → DO MORE INVESTIGATION**

---

## Quick Reference

| Looking for... | Search in... |
|----------------|--------------|
| Entity CRUD | `UseCaseCommands/`, `UseCaseQueries/` |
| Business logic | `Domain/Entities/`, `*Service.cs` |
| Side effects | `UseCaseEvents/`, `*EventHandler.cs` |
| Cross-service | `*Consumer.cs`, `*BusMessage.cs` |
| API endpoints | `Controllers/`, `*Controller.cs` |
| Frontend | `libs/apps-domains/`, `*.component.ts` |
| Background jobs | `*BackgroundJob*.cs`, `*Job.cs` |
