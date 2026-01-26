# Implementation Workflow

Detailed phase instructions for feature implementation.

---

## Phase 1: Discovery & Analysis

### 1A: Requirement Decomposition

```markdown
## Feature Analysis
- **Feature Name**: [Name]
- **Business Objective**: [What problem does this solve?]
- **Affected Services**: [Services list]
- **Scope**: [New entity? New command? UI change?]
```

### 1B: Codebase Investigation

Search for related code using targeted patterns:

```bash
# Find related entities
grep -r "class.*{RelatedConcept}" --include="*.cs" src/

# Find existing patterns
grep -r "{SimilarFeature}Command" --include="*.cs"

# Check domain boundaries
grep -r "namespace.*{ServiceName}\.Domain" --include="*.cs"

# Find API endpoints
grep -r "\[Route.*{feature}\]" --include="*.cs"
```

Additional targeted searches to ensure no critical infrastructure is missed:

- `.*EventHandler.*{EntityName}|{EntityName}.*EventHandler`
- `.*BackgroundJob.*{EntityName}|{EntityName}.*BackgroundJob`
- `.*Consumer.*{EntityName}|{EntityName}.*Consumer`
- `.*Service.*{EntityName}|{EntityName}.*Service`
- `.*Helper.*{EntityName}|{EntityName}.*Helper`

**Priority files**: Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers, frontend Components `.ts`.

### 1C: Pattern Recognition

- [ ] Find similar features in codebase
- [ ] Identify which patterns apply (CQRS, Event-driven, etc.)
- [ ] Check for reusable components
- [ ] Map dependencies

---

## Phase 2: Knowledge Graph Construction

### External Memory File

Create analysis file at `.ai/workspace/analysis/{feature-name}-implementation.md` with sections:

- `## Metadata` -- Original prompt + task description in markdown box
- `## Progress` -- Phase, Items Processed, Total Items, Current Operation, Current Focus
- `## Errors` / `## Assumption Validations` / `## Performance Metrics`
- `## Memory Management` / `## Processed Files`
- `## File List` -- All discovered file paths (numbered)
- `## Knowledge Graph` -- Per-file analysis (use shared template)

### Batch Processing

1. Count total files in file list
2. Split into batches of 10 files in priority order
3. Create todo tasks for each batch
4. After every 10 files: update `Items Processed`, run CONTEXT_ANCHOR_CHECK

### Backend Impact Analysis

```markdown
## Backend Changes Required

### Domain Layer
- [ ] New Entity: `{EntityName}.cs`
- [ ] Entity Expressions: Static query expressions
- [ ] Value Objects: `{ValueObject}.cs`

### Application Layer
- [ ] Commands: `Save{Entity}Command.cs`
- [ ] Queries: `Get{Entity}ListQuery.cs`
- [ ] Event Handlers: `{Action}On{Event}EntityEventHandler.cs`
- [ ] DTOs: `{Entity}Dto.cs`

### Persistence Layer
- [ ] Entity Configuration: `{Entity}EntityConfiguration.cs`
- [ ] Migrations: Add/Update schema

### API Layer
- [ ] Controller: `{Entity}Controller.cs`
- [ ] Endpoints: POST/GET/PUT/DELETE
```

### Frontend Impact Analysis

```markdown
## Frontend Changes Required

### Components
- [ ] List Component: `{entity}-list.component.ts`
- [ ] Form Component: `{entity}-form.component.ts`
- [ ] Detail Component: `{entity}-detail.component.ts`

### State Management
- [ ] Store: `{entity}.store.ts`
- [ ] State Interface: `{Entity}State`

### Services
- [ ] API Service: `{entity}-api.service.ts`

### Routing
- [ ] Route definitions
- [ ] Guards if needed
```

### Overall Analysis (Phase 1C)

Write comprehensive summary showing:
- Complete end-to-end workflows discovered
- Key architectural patterns and relationships
- All business logic workflow: Frontend Component -> Controller -> Command/Query -> EventHandler -> Others
- Integration points and dependencies

---

## Phase 3: Plan Generation

Read the ENTIRE analysis file, then generate a detailed implementation plan under `## Plan` heading.

The plan MUST follow coding conventions and patterns from `CLAUDE.md`.

### Implementation Checklist Template

```markdown
## Implementation Order
1. Domain Layer (Entity, Expressions)
2. Persistence Layer (Configuration, Migration)
3. Application Layer (Commands, Queries, DTOs)
4. API Layer (Controller)
5. Frontend (Store, Components, Routing)

## Checklist
- [ ] Step 1: Create Entity
- [ ] Step 2: Create Entity Configuration
- [ ] Step 3: Generate Migration
- [ ] Step 4: Create DTO
- [ ] Step 5: Create Save Command
- [ ] Step 6: Create List Query
- [ ] Step 7: Create Controller
- [ ] Step 8: Create Frontend Store
- [ ] Step 9: Create Frontend Components
- [ ] Step 10: Add Routing
- [ ] Step 11: Test Integration

## Evidence Log
[Track all decisions and findings here]
```

---

## Phase 4: Approval Gate

Present plan for explicit user approval. Do NOT proceed without it.

In **autonomous mode** (`--autonomous`): present plan, wait for approval, then execute all remaining steps without further gates.

---

## Phase 5: Execution

Before creating or modifying ANY file, first load its relevant entry from Knowledge Graph.

### Backend Implementation (bottom-up)

1. **Domain Layer**: Entity with properties, expressions, validation
2. **Persistence Layer**: Entity configuration + migration
3. **Application Layer**: DTO (with MapToEntity), Command (Command+Handler+Result in ONE file), Query
4. **API Layer**: Controller with endpoint methods

### Frontend Implementation (service-first)

1. **API Service**: Extend `PlatformApiService`
2. **Store**: Extend `PlatformVmStore<TState>` with effects
3. **Components**: Extend `AppBaseVmStoreComponent` or `AppBaseFormComponent`

---

## Phase 6: Verification

Run type checks, tests, and validate integration. See `validation-checklist.md` for detailed items.
