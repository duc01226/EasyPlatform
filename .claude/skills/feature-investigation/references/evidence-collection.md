# Evidence Collection

Per-file analysis structure, knowledge graph construction, and structured findings format.

---

## Analysis File Setup

Create `.ai/workspace/analysis/[feature-name]-investigation.md` with:

```markdown
## Metadata
> Original question: [user's exact question]

## Investigation Question
[Clearly stated investigation goal]

## Progress
- **Phase**: 1
- **Items Processed**: 0 / [total]
- **Current Focus**: [original question]

## File List
[All discovered files, grouped by priority]

## Knowledge Graph
[Per-file analysis entries - see template below]

## Data Flow
[Flow diagrams and pipeline documentation]

## Findings
[Populated in Phase 2+]
```

---

## Per-File Analysis Entry

For each file, document in `## Knowledge Graph`:

### Core Fields

- `filePath`: Full path
- `type`: Component classification (Entity, Command, Handler, Controller, Component, Store, etc.)
- `architecturalPattern`: Design pattern used
- `content`: Purpose and logic summary
- `symbols`: Key classes, interfaces, methods
- `dependencies`: Imports/injections
- `relevanceScore`: 1-10 (to investigation question)
- `evidenceLevel`: "verified" or "inferred"

### Investigation-Specific Fields

- `entryPoints`: How this code is triggered/called
- `outputPoints`: What this code produces/returns
- `dataTransformations`: How data is modified
- `conditionalLogic`: Key decision points and branches
- `errorScenarios`: What can go wrong, error handling
- `externalDependencies`: External services, APIs, databases

### Cross-Service Fields (if applicable)

- `messageBusMessage`: Message type consumed/produced
- `messageBusProducers`: Who sends this message
- `crossServiceIntegration`: Cross-service data flow

**Rule:** After every 10 files, update progress and re-check alignment with original question.

---

## Structured Findings Format

### Phase 2: Comprehensive Analysis

#### Workflow Analysis

1. **Happy Path** - Normal successful execution flow
2. **Error Paths** - How errors are handled at each stage
3. **Edge Cases** - Special conditions
4. **Authorization** - Permission checks
5. **Validation** - Input validation at each layer

#### Business Logic Extraction

1. **Core Business Rules** - What rules govern this feature
2. **State Transitions** - Entity state changes
3. **Side Effects** - Notifications, events, external calls

### Phase 3: Synthesis

#### Executive Summary

- One-paragraph answer to user's question
- Top 5-10 key files
- Key patterns used

#### Detailed Explanation

- Step-by-step walkthrough with `file:line` references
- Architectural decisions explained

#### Diagrams

```
+-----------+     +-----------+     +-----------+
| Component |---->|  Command  |---->|  Handler  |
+-----------+     +-----------+     +-----------+
                                          |
                                          v
                                    +-----------+
                                    |Repository |
                                    +-----------+
```

---

## Presentation Format

```markdown
## Answer
[Direct answer in 1-2 paragraphs]

## How It Works
### 1. [First Step]
[Explanation with code reference at `file:line`]

### 2. [Second Step]
[Explanation with code reference at `file:line`]

## Key Files
| File | Purpose |
|------|---------|
| `path/to/file.cs:123` | [Purpose] |

## Data Flow
[Text diagram]

## Want to Know More?
- [Topic 1]
- [Topic 2]
```
