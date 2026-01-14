---
description: ⚡⚡ Scout codebase with priority-based file discovery and structured output
argument-hint: [user-prompt] [scale]
---

## Purpose

Search the codebase for files needed to complete the task using fast, token-efficient parallel agents with **priority-based categorization**.

## Variables

- **USER_PROMPT**: $1
- **SCALE**: $2 (defaults to 3)
- **REPORT_OUTPUT_DIR**: Use `Report:` from `## Naming` section

---

## PHASE 1: ANALYZE AND PLAN

### Step 1: Parse Search Request

Extract from USER_PROMPT:
- **Keywords**: Entity names, feature names, patterns
- **Intent**: CRUD, investigation, debugging, implementation
- **Scope**: Backend, Frontend, Cross-service, Full-stack

### Step 2: Generate Search Patterns

**HIGH PRIORITY (Always Search):**
```
# Domain Entities
**/Domain/Entities/**/*{keyword}*.cs
**/{Entity}.cs

# CQRS Commands & Queries
**/UseCaseCommands/**/*{keyword}*.cs
**/UseCaseQueries/**/*{keyword}*.cs
**/Save{Entity}Command.cs
**/Get{Entity}*Query.cs

# Event Handlers & Consumers
**/UseCaseEvents/**/*{keyword}*.cs
**/*{keyword}*EventHandler.cs
**/*{keyword}*Consumer.cs

# Controllers
**/Controllers/**/*{keyword}*.cs
**/{Entity}Controller.cs

# Background Jobs
**/*{keyword}*BackgroundJob*.cs
**/*{keyword}*Job.cs
```

**MEDIUM PRIORITY:**
```
# Services & Helpers
**/*{keyword}*Service.cs
**/*{keyword}*Helper.cs

# DTOs & Shared
**/*{keyword}*Dto.cs
**/Shared/**/*{keyword}*.cs

# Frontend Components
**/*{keyword}*.component.ts
**/*{keyword}*.store.ts
**/*{keyword}*-api.service.ts
```

**LOW PRIORITY:**
```
# Tests & Config
**/*{keyword}*.spec.ts
**/*{keyword}*Test*.cs
**/appsettings*.json
```

---

## PHASE 2: PARALLEL EXECUTION

### Step 1: Divide Work

Split directories intelligently for SCALE agents:

| Agent | Focus Area | Directories |
|-------|------------|-------------|
| 1 | Backend Core | `src/PlatformExampleApp/*/Domain/`, `*/Application/UseCaseCommands/`, `*/Application/UseCaseQueries/` |
| 2 | Backend Events/Jobs | `*/Application/UseCaseEvents/`, `*BackgroundJob*`, `*Consumer*`, `Controllers/` |
| 3 | Frontend | `src/PlatformExampleAppWeb/`, `libs/apps-domains/`, `libs/platform-core/` |

### Step 2: Launch Agents

Spawn SCALE number of `Explore` subagents in **parallel** using Task tool:

```
For each agent:
- Assign specific directories from division above
- Include HIGH PRIORITY patterns for assigned area
- Set 3-minute timeout
- Request file paths only (no content)
```

**Agent Prompt Template:**
```
Search [directories] for files related to "[USER_PROMPT]".
Patterns: [relevant patterns for this agent's focus]
Return ONLY file paths, categorized by type.
Timeout: 3 minutes. Be fast and focused.
```

---

## PHASE 3: SYNTHESIZE RESULTS

### Step 1: Collect and Deduplicate

- Gather results from all agents that complete within timeout
- Skip timed-out agents (note coverage gaps)
- Remove duplicate file paths

### Step 2: Categorize by Priority

Organize files into structured output:

```markdown
## Scout Results: [USER_PROMPT]

### Summary
- **Total Files Found**: X
- **Agents Completed**: X/SCALE
- **Coverage Gaps**: [list any timed-out agent areas]

---

### HIGH PRIORITY (Analyze First)

#### Domain Entities
| # | File | Purpose |
|---|------|---------|
| 1 | `path/Entity.cs` | Core domain entity |

#### Commands & Handlers
| # | File | Purpose |
|---|------|---------|
| 1 | `path/SaveEntityCommand.cs` | Create/Update logic |

#### Queries
| # | File | Purpose |
|---|------|---------|
| 1 | `path/GetEntityListQuery.cs` | List retrieval |

#### Event Handlers
| # | File | Purpose |
|---|------|---------|
| 1 | `path/EntityEventHandler.cs` | Side effect handling |

#### Consumers (Cross-Service)
| # | File | Message Type | Source Service |
|---|------|--------------|----------------|
| 1 | `path/EntityConsumer.cs` | `EntityBusMessage` | [grep for producer] |

#### Controllers
| # | File | Purpose |
|---|------|---------|
| 1 | `path/EntityController.cs` | API endpoints |

#### Background Jobs
| # | File | Purpose |
|---|------|---------|
| 1 | `path/EntityBackgroundJob.cs` | Scheduled processing |

---

### MEDIUM PRIORITY

#### Services & Helpers
| # | File | Purpose |
|---|------|---------|
| 1 | `path/EntityService.cs` | Business logic |

#### Frontend Components
| # | File | Purpose |
|---|------|---------|
| 1 | `path/entity-list.component.ts` | UI component |

#### API Services
| # | File | Purpose |
|---|------|---------|
| 1 | `path/entity-api.service.ts` | HTTP client |

---

### LOW PRIORITY

#### Tests & Config
| # | File | Purpose |
|---|------|---------|
| 1 | `path/EntityTest.cs` | Unit tests |

---

### Suggested Starting Points

1. **[Most relevant file]** - [Why start here]
2. **[Second most relevant]** - [Why]
3. **[Third most relevant]** - [Why]

### Cross-Service Integration (if applicable)

| Source Service | Message | Target Service | Consumer File |
|----------------|---------|----------------|---------------|
| ... | ... | ... | ... |

### Unresolved Questions

- [Any gaps or uncertainties]
```

---

## OUTPUT: Handoff to Investigate

**When followed by `/investigate`:**

Your numbered file list becomes the analysis target. The Investigate command will:
1. **Use your HIGH PRIORITY files** as primary analysis targets
2. **Reference your file numbers** (e.g., "File #3 from Scout")
3. **Skip redundant discovery** - trusts your search results
4. **Follow your Suggested Starting Points** for analysis order

**Ensure your output includes:**
- ✅ Numbered files in priority tables
- ✅ Clear "Suggested Starting Points" section
- ✅ Cross-Service Integration table (for message bus flows)
- ✅ Purpose column explaining each file's role

---

## PHASE 4: CONSUMER CROSS-SERVICE ANALYSIS

**CRITICAL**: For any `*Consumer.cs` files found:

1. Identify the `*BusMessage` type being consumed
2. Run additional grep across ALL services:
   ```
   grep -r "BusMessage" --include="*.cs" src/
   ```
3. Find files that **produce/publish** the message
4. Document in Cross-Service Integration table

---

## Quality Standards

| Metric | Target |
|--------|--------|
| Speed | < 5 minutes total |
| Coverage | All relevant directories searched |
| Accuracy | Only directly relevant files |
| Structure | Organized by priority category |
| Actionable | Clear starting points |

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Agent timeout | Skip, note gap, continue |
| All agents timeout | Manual fallback with Glob/Grep |
| Sparse results | Expand patterns, try synonyms |
| Overwhelming results | Filter to HIGH PRIORITY only |

---

## Output Standards

- **IMPORTANT:** Sacrifice grammar for concision
- **IMPORTANT:** List unresolved questions at end
- **IMPORTANT:** Number all files for easy reference
- Use `file:line` format where possible
