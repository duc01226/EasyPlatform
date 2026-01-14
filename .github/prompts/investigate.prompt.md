---
agent: agent
description: Investigate and explain how existing features or code logic works using structured knowledge model construction. READ-ONLY exploration with no code changes.
---

# Investigate Feature: $input

Investigate and explain how an existing feature or logic works using structured knowledge model construction.

**KEY PRINCIPLE**: This is a **READ-ONLY exploration** - no code changes. Focus on understanding and explaining.

## Variables

-   **FEATURE**: $input (the feature/logic to investigate)
-   **ANALYSIS_FILE**: `.ai/workspace/analysis/$input-investigation.md`

---

## INPUT: Scout Output Integration

**If preceded by `@workspace /scout`:**

1. **Use the numbered file list** from Scout results as your analysis targets
2. **Prioritize in this order:**
    - HIGH PRIORITY files (Domain Entities, Commands, Queries, Event Handlers, Controllers, Jobs, Consumers)
    - Suggested Starting Points (if provided)
    - MEDIUM PRIORITY files (Services, Helpers, Components)
3. **Skip redundant discovery** - Scout already searched the codebase
4. **Reference files by Scout's numbers** in your analysis (e.g., "File #3 from Scout")

**Scout Output Format Reference:**

```markdown
### HIGH PRIORITY (Analyze First)

| #   | File             | Purpose            |
| --- | ---------------- | ------------------ |
| 1   | `path/Entity.cs` | Core domain entity |

### Suggested Starting Points

1. **[Most relevant file]** - [Why]
```

**If NO Scout output available:** Proceed with Phase 1A discovery as normal.

---

## PHASE 1A: INITIALIZATION AND DISCOVERY

### Step 1: Initialize Analysis File

Create the analysis file at `.ai/workspace/analysis/[feature-name]-investigation.md` with these required sections:

````markdown
## Metadata

```markdown
**Original Prompt:** [User's investigation question]
**Task Description:** [What we're investigating]
**Source Code Structure:** See .ai/prompts/context.md
```
````

## Progress

-   **Phase**: 1A
-   **Items Processed**: 0
-   **Total Items**: 0
-   **Current Operation**: "initialization"
-   **Current Focus**: "[feature summary]"

## Errors

[None yet]

## Assumption Validations

| Assumption | Status                    | Evidence |
| ---------- | ------------------------- | -------- |
| ...        | Pending/Validated/Invalid | ...      |

## File List

[Numbered list of files to analyze]

## Knowledge Graph

[Detailed analysis of each file]

```

### Step 2: Semantic Discovery

Search for related code using multiple patterns:

**Primary Patterns:**
```

_Command_{Feature}* # CQRS Commands
*Query*{Feature}* # CQRS Queries
*{Feature}*EventHandler* # Entity Event Handlers
*{Feature}_Consumer_ # Message Bus Consumers
*{Feature}*BackgroundJob* # Background Jobs
*{Feature}_Controller_ # API Controllers

```

**Secondary Patterns:**
```

._EventHandler._{Feature}|{Feature}.*EventHandler
.*BackgroundJob.*{Feature}|{Feature}.*BackgroundJob
._Consumer._{Feature}|{Feature}.*Consumer
.*Service.*{Feature}|{Feature}.*Service
._Helper._{Feature}|{Feature}.\*Helper

```

**File Types:** `**/*.{cs,ts,html}`

### Step 3: Prioritize Files

**HIGH PRIORITY (Must Analyze):**
1. Domain Entities (`Domain/Entities/`)
2. CQRS Commands (`UseCaseCommands/`)
3. CQRS Queries (`UseCaseQueries/`)
4. Entity Event Handlers (`UseCaseEvents/`)
5. Controllers (`Controllers/`)
6. Background Jobs (`*BackgroundJob*.cs`)
7. Message Bus Consumers (`*Consumer.cs`)
8. Frontend Components (`*.component.ts`)

**MEDIUM PRIORITY:**
- Services, Helpers, DTOs, Repositories

Save ALL file paths as numbered list under `## File List` in analysis file.

---

## PHASE 1B: KNOWLEDGE GRAPH CONSTRUCTION

### Step 1: Batch Processing Setup

Count total files, split into batches of 10. Use TodoWrite to create tasks:

```

-   [ ] Analyze batch 1 (files 1-10)
-   [ ] Analyze batch 2 (files 11-20)
        ...

````

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
````

### Step 3: Cross-Service Analysis (CRITICAL for Consumers)

When analyzing `*Consumer.cs` files extending `PlatformApplicationMessageBusConsumer<T>`:

1. Identify the `*BusMessage` type
2. Grep search ALL services for files that **publish** this message
3. Document producer files and their service locations
4. Map the cross-service data flow

---

## PHASE 2: CODE FLOW TRACING

### Step 1: Entry Points

Identify how the feature is triggered:

-   API Endpoint → Controller → Command/Query Handler
-   UI Action → Component → API Service → Backend
-   Scheduled Job → BackgroundJob → Handler
-   Message → Consumer → Handler

### Step 2: Trace Execution Path

Document in analysis file:

```markdown
## Data Flow

[Request] → [Controller] → [Handler] → [Repository] → [Response]
↓
[Event Handler] → [Side Effects]
↓
[Message Bus] → [Consumer in Other Service]
```

### Step 3: Side Effects Mapping

-   Entity events raised
-   Messages published to bus
-   External service calls
-   Database operations
-   Notifications triggered

---

## PHASE 3: PRESENT FINDINGS

### Output Format

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

| File               | Type    | Purpose   | Relevance |
| ------------------ | ------- | --------- | --------- |
| `path/file.cs:123` | Command | [Purpose] | 10/10     |

## Data Flow Diagram
```

[Visual text diagram of the flow]

```

## Platform Patterns Used

- **Pattern**: How it's applied
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

Before ANY claim, verify:

1. "What assumptions am I making?"
2. "Have I verified with actual code evidence?"
3. "Could I be wrong about how this works?"

### Verification Checklist

-   [ ] Found actual code evidence for each claim?
-   [ ] Traced the full code path?
-   [ ] Checked cross-service message flows?
-   [ ] Documented ALL findings with `file:line`?
-   [ ] Answered the original question?
-   [ ] Listed unresolved questions?

**If ANY unchecked → DO MORE INVESTIGATION**

---

## Progress Tracking

Update `## Progress` section after each batch:

```markdown
-   **Phase**: 1B
-   **Items Processed**: 20
-   **Total Items**: 35
-   **Current Operation**: "analyzing batch 3"
-   **Current Focus**: "Event Handlers"
```

---

## Quick Reference

| Looking for...        | Search in...                           |
| --------------------- | -------------------------------------- |
| Entity CRUD           | `UseCaseCommands/`, `UseCaseQueries/`  |
| Business logic        | `Domain/Entities/`, `*Service.cs`      |
| Side effects          | `UseCaseEvents/`, `*EventHandler.cs`   |
| Cross-service         | `*Consumer.cs`, `*BusMessage.cs`       |
| API endpoints         | `Controllers/`, `*Controller.cs`       |
| Frontend              | `libs/apps-domains/`, `*.component.ts` |
| Background processing | `*BackgroundJob*.cs`, `*Job.cs`        |
