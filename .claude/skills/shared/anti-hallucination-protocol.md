# Anti-Hallucination Protocol

Shared validation checkpoints to prevent assumptions, context drift, and unverified claims.

---

## ASSUMPTION_VALIDATION_CHECKPOINT

Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

## EVIDENCE_CHAIN_VALIDATION

Before claiming any relationship:

- "I believe X calls Y because..." -> show actual code
- "This follows pattern Z because..." -> cite specific examples
- "Service A owns B because..." -> grep for actual boundaries

## TOOL_EFFICIENCY_PROTOCOL

- Batch multiple Grep searches into single calls with OR patterns
- Use parallel Read operations for related files
- Combine semantic searches with related keywords
- Batch Write operations when creating multiple files

## CONTEXT_ANCHOR_SYSTEM

Every 10 operations:

1. Re-read the original task description from `## Metadata`
2. Verify the current operation aligns with original goals
3. Check if we're solving the right problem
4. Update the `Current Focus` bullet point in `## Progress`

---

## Confidence Level Thresholds

When making claims about code relationships, patterns, or behavior, declare confidence:

| Level | Threshold | Meaning | Action |
| ----- | --------- | ------- | ------ |
| **High** | ≥90% | Verified with code evidence | Proceed with implementation |
| **Medium** | 70-89% | Partially verified, some inference | Note assumptions, proceed cautiously |
| **Low** | <70% | Inferred, not fully verified | HALT — gather more evidence before proceeding |

**Usage:** "I believe X calls Y (High confidence — verified via grep at `file:line`)."

If confidence is Low on any critical decision, do NOT proceed. Instead: read more code, run tests, or ask the user.

---

## EXTERNAL_MEMORY_PERSISTENCE

Investigation and research findings MUST survive context compaction. Persist to external files.

### When to Persist

- **Research/investigation phase:** Write findings to a report file before starting implementation
- **Subagent results:** When subagents return investigation/research results, persist key findings to file
- **Knowledge graphs:** Write per-file analysis to report file before starting code changes

### Report File Convention

- **Path:** `plans/reports/investigation-{date}-{slug}.md`
- **Template:** Use `.claude/skills/shared/knowledge-graph-template.md` for per-file analysis structure
- **Sections:** `## Metadata` (original task), `## File List`, `## Knowledge Graph`, `## Findings`

### Read-Back Before Implementation

Before modifying ANY code file:

1. Re-read the investigation report to restore context
2. Load the relevant Knowledge Graph entry for the file being modified
3. Verify the planned change aligns with investigation findings

### Context Recovery

If context is compacted or lost:

1. Check `plans/reports/` for investigation reports from this session
2. Re-read the report to restore knowledge
3. Continue from where you left off using the persisted findings

---

## EXTENDED_DISCOVERY_PATTERNS

When implementing features affecting data access, queries, or business logic, search ALL related files comprehensively.

### Backend Discovery (EasyPlatform Structure)

**Query Handlers:**

```bash
grep -r "Query.*{Entity}" src/Backend/*/UseCaseQueries/ --include="*.cs"
grep -r "class.*{Entity}.*Query" src/Backend/*/UseCaseQueries/ --include="*.cs"
```

**Command Handlers:**

```bash
grep -r "Command.*{Entity}" src/Backend/*/UseCaseCommands/ --include="*.cs"
grep -r "class.*{Entity}.*Command" src/Backend/*/UseCaseCommands/ --include="*.cs"
```

**Repository Usages:**

```bash
grep -r "{Entity}Repository\\..*Async" src/Backend/*/Application/ --include="*.cs"
grep -r "I.*{Entity}.*Repository" src/Backend/ --include="*.cs"
```

**Controller Endpoints:**

```bash
grep -r "\[Route.*{entity}" src/Backend/*/Controllers/ --include="*.cs"
grep -r "class.*{Entity}.*Controller" src/Backend/*/Controllers/ --include="*.cs"
```

**Event Handlers:**

```bash
grep -r "EventHandler.*{Entity}|{Entity}.*EventHandler" src/Backend/*/UseCaseEvents/ --include="*.cs"
grep -r "{Entity}.*Event" src/Backend/ --include="*.cs"
```

**Background Jobs:**

```bash
grep -r "BackgroundJob.*{Entity}|{Entity}.*BackgroundJob" src/Backend/ --include="*.cs"
grep -r "PlatformRecurringJob" src/Backend/*/Application/ --include="*.cs"
```

**Message Bus (Cross-Service):**

```bash
grep -r "{Entity}.*BusMessage" src/Backend/ --include="*.cs"
grep -r "Consumer.*{Entity}|{Entity}.*Consumer" src/Backend/ --include="*.cs"
```

### Frontend Discovery (Angular Nx Workspace)

**API Service Calls:**

```bash
grep -r "/{endpoint-path}" src/Frontend/apps/*/src/ --include="*.ts"
grep -r "{ApiServiceName}" src/Frontend/apps/*/src/ --include="*.service.ts"
```

**Components:**

```bash
grep -r "selector:.*{selector-name}" src/Frontend/apps/*/src/ --include="*.component.ts"
grep -r "{ComponentName}" src/Frontend/apps/*/src/ --include="*.component.ts"
```

**Stores (State Management):**

```bash
grep -r "{Entity}.*Store" src/Frontend/apps/*/src/ --include="*.store.ts"
grep -r "PlatformVmStore" src/Frontend/ --include="*.ts"
```

### Cross-Service Discovery

**Check all Backend services:**

```bash
find src/Backend -type d -name "*.Application" | while read svc; do
  echo "=== Checking $svc ==="
  grep -r "{pattern}" "$svc" --include="*.cs"
done
```

**Find all service boundaries:**

```bash
grep -r "PlatformApplicationMessageBusConsumer" src/Backend/ --include="*.cs"
grep -r "PlatformCqrsEntityEventBusMessageProducer" src/Backend/ --include="*.cs"
```

### Usage Guidelines

1. **Replace placeholders:**
   - `{Entity}` → Entity name (e.g., `Employee`, `Leave`, `Goal`)
   - `{entity}` → Lowercase entity (e.g., `employee`, `leave`)
   - `{endpoint-path}` → API path (e.g., `api/employees`)
   - `{ApiServiceName}` → Service name (e.g., `EmployeeApiService`)

2. **When to use:**
   - Before implementing features affecting data filtering/queries
   - Before refactoring CQRS components
   - Before modifying cross-service integrations
   - During bug investigation involving data flow

3. **Batch searches:**
   - Combine patterns with `|` (OR): `"Query.*{Entity}|{Entity}.*Query"`
   - Use parallel grep for related entities
   - Document all findings in Knowledge Graph

---

## Quick Reference Checklist

**Before any major operation:**

- [ ] ASSUMPTION_VALIDATION_CHECKPOINT
- [ ] EVIDENCE_CHAIN_VALIDATION
- [ ] TOOL_EFFICIENCY_PROTOCOL

**Every 10 operations:**

- [ ] CONTEXT_ANCHOR_SYSTEM
- [ ] Update 'Current Focus' in `## Progress`

**Before implementation:**

- [ ] EXTERNAL_MEMORY_PERSISTENCE — findings written to report file
- [ ] Read-back from report file before modifying code

**Emergency:**

- **Context Drift** -> Re-read `## Metadata` section
- **Context Lost** -> Re-read `plans/reports/` investigation reports
- **Assumption Creep** -> Halt, validate with code
- **Evidence Gap** -> Mark as "inferred"
