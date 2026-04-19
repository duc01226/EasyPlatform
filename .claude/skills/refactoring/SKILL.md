---
name: refactoring
version: 2.1.0
description: '[Code Quality] Restructure code without changing behavior using extract method, extract class, rename, move, and inline patterns. Triggers: refactor, extract method, extract class, rename symbol, restructure code, clean up code, decompose function.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

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

<!-- SYNC:design-patterns-quality -->

> **Design Patterns Quality** — Priority checks for every code change:
>
> 1. **DRY via OOP:** Same-suffix classes (`*Entity`, `*Dto`, `*Service`) MUST ATTENTION share base class. 3+ similar patterns → extract to shared abstraction.
> 2. **Right Responsibility:** Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
> 3. **SOLID:** Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
> 4. **After extraction/move/rename:** Grep ENTIRE scope for dangling references. Zero tolerance.
> 5. **YAGNI gate:** NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
>
> **Anti-patterns to flag:** God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

<!-- /SYNC:design-patterns-quality -->

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

## Quick Summary

**Goal:** Restructure code without changing behavior using extract, move, and simplify patterns.

**Workflow:**

1. **Analysis** — Identify target, map dependencies with Grep, assess impact, verify test coverage
2. **Plan** — Document refactoring type, changes, and risks
3. **Execute** — Apply refactoring (extract method/class, move to entity/extension, simplify conditionals)
4. **Verify** — Run tests, confirm no behavior change, check compilation

**Key Rules:**

- Never refactor without existing test coverage
- Make small incremental changes; never mix refactoring with feature work
- Place logic in the lowest appropriate layer (Entity > Service > Component)

## Investigation Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- Do NOT assume code is unused — verify with grep across ALL services
- Every refactoring recommendation must include `file:line` evidence
- If you cannot prove a code path is safe to change, state "unverified, needs investigation"
- Question assumptions: "Is this really dead code?" → trace all usages including dynamic/reflection
- Challenge completeness: "Have I checked all 5 services?" → cross-service validation required
- No "should be refactored" without proof — demonstrate the improvement with evidence

## ⚠️ MANDATORY: Confidence & Evidence Gate

**MANDATORY IMPORTANT MUST ATTENTION** declare `Confidence: X%` with evidence list + `file:line` proof for EVERY claim.
**95%+** recommend freely | **80-94%** with caveats | **60-79%** list unknowns | **<60% STOP — gather more evidence.**
Breaking changes (removing classes, changing interfaces) require **95%+ confidence** with full cross-service trace.

# Code Refactoring

Expert code restructuring agent. Focuses on structural changes that improve code quality without modifying behavior.

## Refactoring Catalog

### Extract Patterns

| Pattern                | When to Use                         | Example                                   |
| ---------------------- | ----------------------------------- | ----------------------------------------- |
| **Extract Method**     | Long method, duplicated code        | Move logic to private method              |
| **Extract Class**      | Class has multiple responsibilities | Create Helper, Service, or Strategy class |
| **Extract Interface**  | Need abstraction for testing/DI     | Create `I{ClassName}` interface           |
| **Extract Expression** | Complex inline expression           | Move to Entity static expression          |
| **Extract Validator**  | Repeated validation logic           | Create validator extension method         |

### Move Patterns

| Pattern               | When to Use                       | Example                                                                                          |
| --------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Move Method**       | Method belongs to different class | Move from Handler to Helper/Entity                                                               |
| **Move to Extension** | Reusable repository logic         | Create `{Entity}RepositoryExtensions`                                                            |
| **Move to DTO**       | Mapping logic in handler          | Use project DTO base `.MapToEntity()` (see docs/project-reference/backend-patterns-reference.md) |
| **Move to Entity**    | Business logic in handler         | Add instance method or static expression                                                         |

### Simplify Patterns

| Pattern                     | When to Use                  | Example                            |
| --------------------------- | ---------------------------- | ---------------------------------- |
| **Inline Variable**         | Temporary variable used once | Remove intermediate variable       |
| **Inline Method**           | Method body is obvious       | Replace call with body             |
| **Replace Conditional**     | Complex if/switch            | Use Strategy pattern or expression |
| **Introduce Parameter Obj** | Method has many parameters   | Create Command/Query DTO           |

## Workflow

### Phase 1: Analysis

1. **Identify Target**: Locate code to refactor
2. **Map Dependencies**: Find all usages with Grep
3. **Assess Impact**: List affected files and tests
4. **Verify Tests**: Ensure test coverage exists
5. **External Memory**: Write analysis to `.ai/workspace/analysis/{refactoring-name}.analysis.md`. Re-read before planning.

### Phase 2: Plan

Document refactoring plan:

```markdown
## Refactoring Plan

**Target**: [file:line_number]
**Type**: [Extract Method | Move to Extension | etc.]
**Reason**: [Why this refactoring improves code]

### Changes

1. [ ] Create/modify [file]
2. [ ] Update usages in [files]
3. [ ] Run tests

### Risks

- [Potential issues]
```

### Phase 3: Execute

```csharp
// BEFORE: Logic in handler
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    var isValid = entity.Status == Status.Active &&
                  entity.User?.IsActive == true &&
                  !entity.IsDeleted;
    if (!isValid) throw new Exception();
}

// AFTER: Extracted to entity static expression
// In Entity.cs
public static Expression<Func<Entity, bool>> IsActiveExpr()
    => e => e.Status == Status.Active &&
            e.User != null && e.User.IsActive &&
            !e.IsDeleted;

// In Handler
var entity = await repository.FirstOrDefaultAsync(Entity.IsActiveExpr(), ct)
    .EnsureFound("Entity not active");
```

### Phase 4: Verify

1. Run affected tests
2. Verify no behavior change
3. Check code compiles
4. Review for consistency

## Project-Specific Refactorings

### Handler to Helper

```csharp
// BEFORE: Reused logic in multiple handlers
var employee = await repo.FirstOrDefaultAsync(Employee.UniqueExpr(userId, companyId), ct)
    ?? await CreateEmployeeAsync(userId, companyId, ct);

// AFTER: Extracted to Helper
// In EmployeeHelper.cs
public async Task<Employee> GetOrCreateEmployeeAsync(string userId, string companyId, CancellationToken ct)
{
    return await repo.FirstOrDefaultAsync(Employee.UniqueExpr(userId, companyId), ct)
        ?? await CreateEmployeeAsync(userId, companyId, ct);
}
```

### Handler to Repository Extension

```csharp
// BEFORE: Query logic in handler
var employees = await repo.GetAllAsync(
    e => e.CompanyId == companyId && e.Status == Status.Active && e.DepartmentIds.Contains(deptId), ct);

// AFTER: Extracted to extension
// In EmployeeRepositoryExtensions.cs
public static async Task<List<Employee>> GetActiveByDepartmentAsync(
    this I{Service}RootRepository<Employee> repo, string companyId, string deptId, CancellationToken ct)
{
    return await repo.GetAllAsync(
        Employee.OfCompanyExpr(companyId)
            .AndAlso(Employee.IsActiveExpr())
            .AndAlso(e => e.DepartmentIds.Contains(deptId)), ct);
}
```

### Mapping to DTO

```csharp
// BEFORE: Mapping in handler
var config = new AuthConfig
{
    ClientId = req.Dto.ClientId,
    Secret = encryptService.Encrypt(req.Dto.Secret)
};

// AFTER: DTO owns mapping
// In AuthConfigDto.cs : DtoBase<AuthConfig> // project DTO base class (see docs/project-reference/backend-patterns-reference.md)
public override AuthConfig MapToObject() => new AuthConfig
{
    ClientId = ClientId,
    Secret = Secret  // Handler applies encryption
};

// In Handler
var config = req.Dto.MapToObject()
    .With(c => c.Secret = encryptService.Encrypt(c.Secret));
```

## Index Impact Check

> **[IMPORTANT] Database Performance Protocol (MANDATORY):**
>
> 1. **Paging Required** — ALL list/collection queries MUST ATTENTION use pagination. NEVER load all records into memory. Verify: no unbounded `GetAll()`, `ToList()`, or `Find()` without `Skip/Take` or cursor-based paging.
> 2. **Index Required** — ALL query filter fields, foreign keys, and sort columns MUST ATTENTION have database indexes configured. Verify: entity expressions match index field order, database collections have index management methods, migrations include indexes for WHERE/JOIN/ORDER BY columns.

When extracting expressions or moving queries, verify index coverage:

- [ ] New expression fields have indexes in DbContext?
- [ ] Moved queries still use indexed fields?
- [ ] Refactored filters maintain index selectivity order?
- [ ] List queries use pagination (no unbounded GetAll/ToList)?

## Safety Checklist

Before any refactoring:

- [ ] Searched all usages across ALL services (static + dynamic + reflection)?
- [ ] Test coverage exists?
- [ ] Documented in todo list?
- [ ] Changes are incremental?
- [ ] No behavior change verified?
- [ ] **Confidence declared** — `Confidence: X%` with evidence list?

**If ANY checklist item incomplete → STOP. State "Insufficient evidence to proceed."**

## Code Responsibility Refactoring (Priority Check)

**⚠️ MUST ATTENTION READ:** CLAUDE.md "Code Responsibility Hierarchy" for the Entity/Model > Service > Component layering rule. When refactoring, verify logic is in the LOWEST appropriate layer.

## Component HTML & SCSS Standards

**⚠️ MUST ATTENTION READ:** CLAUDE.md "Component HTML Template Standard (BEM Classes)" and `docs/project-reference/scss-styling-guide.md` for BEM class requirements and host/wrapper styling patterns. When refactoring components, ensure all HTML elements have proper BEM classes.

## Anti-Patterns

- **Big Bang Refactoring**: Make small, incremental changes
- **Refactoring Without Tests**: Ensure coverage first
- **Mixing Refactoring with Features**: Do one or the other
- **Breaking Public APIs**: Maintain backward compatibility
- **Logic in Wrong Layer**: Leads to duplicated code - move to lowest appropriate layer

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation/Scout | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

> Run `python .claude/scripts/code_graph connections <file> --json` on refactored files to find all consumers needing updates.

## Graph Intelligence (RECOMMENDED if graph.db exists)

If `.code-graph/graph.db` exists, enhance analysis with structural queries:

- **Impact of restructuring -- trace callers:** `python .claude/scripts/code_graph query callers_of <function> --json`
- **Impact of restructuring -- check importers:** `python .claude/scripts/code_graph query importers_of <module> --json`
- **Batch analysis:** `python .claude/scripts/code_graph batch-query file1 file2 --json`

> See `<!-- SYNC:graph-assisted-investigation -->` block above for graph query patterns.

### Graph-Trace for Refactoring Impact

When graph DB is available, BEFORE refactoring, trace to verify all consumers:

- `python .claude/scripts/code_graph trace <file-to-refactor> --direction downstream --json` — all downstream consumers that depend on this code
- `python .claude/scripts/code_graph trace <file-to-refactor> --direction both --json` — full picture: callers + consumers
- Flag any consumer NOT covered in your refactoring plan — it may break silently

## Related

- `code-simplifier`
- `code-review`

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `refactor` workflow** (Recommended) — scout → investigate → plan → code → review → sre-review → test → docs
> 2. **Execute `/refactoring` directly** — run this skill standalone

---

## AI Agent Integrity Gate (NON-NEGOTIABLE)

> **Completion ≠ Correctness.** Before reporting ANY work done, prove it:
>
> 1. **Grep every removed name.** Extraction/rename/delete touched N files? Grep confirms 0 dangling refs across ALL file types.
> 2. **Ask WHY before changing.** Existing values are intentional until proven otherwise. No "fix" without traced rationale.
> 3. **Verify ALL outputs.** One build passing ≠ all builds passing. Check every affected stack.
> 4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
> 5. **New artifact = wired artifact.** Created something? Prove it's registered, imported, and reachable by all consumers.

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
    <!-- SYNC:understand-code-first:reminder -->
- **IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
    <!-- /SYNC:understand-code-first:reminder -->
    <!-- SYNC:evidence-based-reasoning:reminder -->
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
    <!-- /SYNC:evidence-based-reasoning:reminder -->
    <!-- SYNC:design-patterns-quality:reminder -->
- **IMPORTANT MUST ATTENTION** check DRY via OOP, right responsibility layer, SOLID. Grep for dangling refs after moves.
    <!-- /SYNC:design-patterns-quality:reminder -->
    <!-- SYNC:graph-assisted-investigation:reminder -->
- **IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → trace → verify.
    <!-- /SYNC:graph-assisted-investigation:reminder -->
    <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->
