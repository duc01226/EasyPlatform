---
name: arch-cross-service-integration
description: '[Architecture] Use when designing or implementing cross-service communication, data synchronization, or service boundary patterns.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Design and implement cross-service communication, data sync, and service boundary patterns.

**Workflow:**

1. **Pre-Flight** — Identify source/target services, data ownership, sync vs async
2. **Choose Pattern** — Entity Event Bus (recommended), Direct API, never shared DB
3. **Implement** — Producer + Consumer with dependency waiting and race condition handling
4. **Test** — Verify create/update/delete flows, out-of-order messages, force sync

**Key Rules:**

- Read another service's data via the message bus or its API; never access its database directly — why: direct DB access couples services and breaks data ownership
- Use `LastMessageSyncDate` for conflict resolution (only update if newer)
- Consumers must wait for dependencies with `TryWaitUntilAsync`
- Messages defined in shared project (search for: shared message definitions, bus message classes)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

> **MANDATORY IMPORTANT MUST ATTENTION** Plan ToDo Task to READ the following project-specific reference doc:
>
> - `backend-patterns-reference.md` — backend CQRS, entity event bus, message bus patterns
>
> If file not found, search for: cross-service message definitions, entity event producers, message bus consumers.

# Cross-Service Integration Workflow

## When to Use This Skill

- Designing service-to-service communication
- Implementing data synchronization
- Analyzing service boundaries
- Troubleshooting cross-service issues

## Pre-Flight Checklist

- [ ] Identify source and target services
- [ ] Determine data ownership
- [ ] Choose communication pattern (sync vs async)
- [ ] Map data transformation requirements

## Service Boundaries

> **Note:** Search for `project-structure-reference.md` or the project's service directories to discover the platform's service map, data ownership matrix, and shared infrastructure components.

## Communication Patterns

### Pattern 1: Entity Event Bus (Recommended)

**Use when**: Source service owns data, target services need copies.

```
Source Service                    Target Service
┌────────────┐                   ┌────────────┐
│  Employee  │──── Create ────▶ │ Repository │
│ Repository │                   └────────────┘
└────────────┘                          │
      │                                 │
      │ Auto-raise                      │
      ▼                                 ▼
┌────────────┐                   ┌────────────┐
│  Producer  │── MsgBus  ────▶ │  Consumer  │
└────────────┘                   └────────────┘
```

**⚠️ MUST ATTENTION READ:** CLAUDE.md for Entity Event Bus Producer and Message Bus Consumer implementation patterns.

### Pattern 2: Direct API Call

**Use when**: Real-time data needed, no local copy required.

```csharp
// In Service A, calling Service B API
public class ServiceBApiClient
{
    private readonly HttpClient _client;

    public async Task<UserDto?> GetUserAsync(string userId)
    {
        var response = await _client.GetAsync($"/api/User/{userId}");
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<UserDto>();
    }
}
```

**Considerations**:

- Add circuit breaker for resilience
- Cache responses when possible
- Handle service unavailability

### Pattern 3: Shared Database View (Anti-Pattern!)

**:x: DO NOT USE**: Violates service boundaries

```csharp
// WRONG - Direct cross-service database access
var accountsData = await accountsDbContext.Users.ToListAsync();
```

## Data Ownership Matrix

> **Note:** Search for `project-structure-reference.md` or the project's documentation for the entity ownership matrix. Each entity should have exactly ONE owning service; consumers receive synced copies via message bus.

## Synchronization Patterns

### Full Sync (Initial/Recovery)

```csharp
// For initial data population or recovery
public class FullSyncJob : BackgroundJobExecutor // project background job base (see docs/project-reference/backend-patterns-reference.md)
{
    public override async Task ProcessAsync(object? param)
    {
        // Fetch all from source
        var allEmployees = await sourceApi.GetAllAsync();

        // Upsert to local
        foreach (var batch in allEmployees.Batch(100))
        {
            await localRepo.CreateOrUpdateManyAsync(
                batch.Select(MapToLocal),
                dismissSendEvent: true);
        }
    }
}
```

### Incremental Sync (Event-Driven)

```csharp
// Normal operation via message bus
internal sealed class EmployeeSyncConsumer : MessageBusConsumer<EmployeeEventBusMessage> // project message bus base (see docs/project-reference/backend-patterns-reference.md)
{
    public override async Task HandleLogicAsync(EmployeeEventBusMessage message, string routingKey)
    {
        // Check if newer than current (race condition prevention)
        if (existing?.LastMessageSyncDate > message.CreatedUtcDate)
            return;

        // Apply change
        await ApplyChange(message);
    }
}
```

### Conflict Resolution

Use `LastMessageSyncDate` for ordering - only update if message is newer. See CLAUDE.md Message Bus Consumer pattern for full implementation.

## Integration Checklist

### Before Integration

- [ ] Define data ownership clearly
- [ ] Document which fields sync
- [ ] Plan for missing dependencies
- [ ] Define conflict resolution strategy

### Implementation

- [ ] Message defined in shared project
- [ ] Producer filters appropriate events
- [ ] Consumer waits for dependencies
- [ ] Race condition handling implemented
- [ ] Soft delete handled

### Testing

- [ ] Create event flows correctly
- [ ] Update event flows correctly
- [ ] Delete event flows correctly
- [ ] Out-of-order messages handled
- [ ] Missing dependency handled
- [ ] Force sync works

## Troubleshooting

### Message Not Arriving

```bash
# Check message broker queues (search for: queue management commands)

# Check producer is publishing
grep -r "HandleWhen" --include="*Producer.cs" -A 5

# Check consumer is registered
grep -r "AddConsumer" --include="*.cs"
```

### Data Mismatch

```bash
# Compare source and target counts
# In source service DB
SELECT COUNT(*) FROM Employees WHERE IsActive = 1;

# In target service DB
SELECT COUNT(*) FROM SyncedEmployees;
```

### Stuck Messages

```csharp
// Check for waiting dependencies
Logger.LogWarning("Waiting for Company {CompanyId}", companyId);

// Force reprocess
await messageBus.PublishAsync(message.With(m => m.IsForceSync = true));
```

## Anti-Patterns to AVOID

:x: **Direct database access**

```csharp
// WRONG
await otherServiceDbContext.Table.ToListAsync();
```

:x: **Synchronous cross-service calls in transaction**

```csharp
// WRONG
using var transaction = await db.BeginTransactionAsync();
await externalService.NotifyAsync();  // If fails, transaction stuck
await transaction.CommitAsync();
```

:x: **No dependency waiting**

```csharp
// WRONG - FK violation if company not synced
await repo.CreateAsync(employee);  // Employee.CompanyId references Company

// CORRECT
await Util.TaskRunner.TryWaitUntilAsync(() => companyRepo.AnyAsync(...));
```

:x: **Ignoring message order**

```csharp
// WRONG - older message overwrites newer
await repo.UpdateAsync(entity);

// CORRECT - check timestamp
if (existing.LastMessageSyncDate <= message.CreatedUtcDate)
```

## Verification Checklist

- [ ] Data ownership clearly defined
- [ ] Message bus pattern used (not direct DB)
- [ ] Dependencies waited for in consumers
- [ ] Race conditions handled with timestamps
- [ ] Soft delete synchronized properly
- [ ] Force sync mechanism available
- [ ] Monitoring/alerting in place

## Related

- `arch-security-review`
- `api-design`

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (read directly when relevant; do not rely on hook-injected conversation text)

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:evidence-based-reasoning:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
    <!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use a direct user question to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"$plan (Recommended)"** — Create implementation plan from the cross-service integration design
- **"$architecture-design"** — If broader architecture concerns still need decisions
- **"Skip, continue manually"** — user decides

### Council escalation (always-offer, second prompt)

After the existing `## Next Steps` prompt above resolves, present a **second**, independent a direct user question call (do NOT merge into the first):

- **"Skip council — proceed with integration design (Recommended)"** — Continue with the message contracts / consumer topology as designed. Recommended default.
- **"Escalate to $llm-council"** — Run 11 sub-agent council (5 advisors + 5 reviewers + chairman). Best applied when the integration introduces a new message contract consumed by >=3 services, picks between sync API vs. async event for a hot path, or commits to a saga/outbox/orchestration pattern. Cross-service contracts are hard to reverse once consumers deploy. Cheaper alternatives: `$why-review`, `$plan-validate` (run these first if you haven't).

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure unless the user explicitly invoked a workflow/skill and the local protocol treats explicit invocation as confirmation:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
