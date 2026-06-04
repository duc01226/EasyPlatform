---
name: refactoring
version: 2.2.0
description: '[Code Quality] Use when you need restructure code without changing behavior using extract method, extract class, rename, move, and inline patterns.'
---

## Quick Summary

**Goal:** Restructure code without changing behavior using extract, move, and simplify patterns.

**Workflow:**

1. **Analysis** — Identify target, map dependencies with Grep, assess impact, verify test coverage
2. **Plan** — Document refactoring type, changes, and risks
3. **Execute** — Apply refactoring (extract method/class, move to entity/extension, simplify conditionals)
4. **Verify** — Run tests, confirm no behavior change, check compilation

**Key Rules:**

- Establish test coverage first, then refactor — never refactor code that has no existing tests — why: tests are the only proof the refactor preserved behavior
- Make small incremental changes; never mix refactoring with feature work
- Place logic in the lowest appropriate layer (Entity > Service > Component)

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, a refactor, a test, or an abstraction, ask:
**does this make the next change cheaper or more expensive?**

- Reject "best practices" that raise change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name the real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- A simpler design that is easy to change beats a sophisticated design that
  isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule would raise change cost, this principle wins.

---

## Investigation Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- Verify any "unused" code with grep across ALL services before touching it — do NOT assume it is dead — why: dynamic/reflection/cross-service callers don't surface in a casual read
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

The principle below is stack-neutral: **push logic down to the lowest layer that owns the data** (here, an entity-owned predicate replaces an inline condition in the handler/use-case). The code is one stack's instantiation — translate the shape to your language.

**Example (illustrative — adapt to your language):**

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

## Layer-Down Refactorings (worked examples)

These three refactorings share one principle: **move logic out of the orchestration layer (handler/use-case) into the layer that owns the concern** — reused logic into a shared helper, query logic into a data-access extension, mapping into the DTO. The shapes translate to any stack (a "helper" is any cohesive collaborator; an "extension" is any way your language attaches reusable query methods; "DTO owns mapping" is the rule that the data-transfer type, not the orchestrator, defines its own conversion). See the project's backend-patterns reference for the concrete primitives on your stack.

**Example (illustrative — adapt to your language):**

### Handler to Helper — reused logic moves to a shared collaborator

```csharp
// BEFORE: Reused logic in multiple handlers
var order = await repo.FirstOrDefaultAsync(Order.UniqueExpr(userId, customerId), ct)
    ?? await CreateOrderAsync(userId, customerId, ct);

// AFTER: Extracted to Helper
// In OrderHelper.cs
public async Task<Order> GetOrCreateOrderAsync(string userId, string customerId, CancellationToken ct)
{
    return await repo.FirstOrDefaultAsync(Order.UniqueExpr(userId, customerId), ct)
        ?? await CreateOrderAsync(userId, customerId, ct);
}
```

### Handler to Repository Extension — query logic moves to the data-access layer

```csharp
// BEFORE: Query logic in handler
var orders = await repo.GetAllAsync(
    e => e.CustomerId == customerId && e.Status == Status.Active && e.WarehouseIds.Contains(warehouseId), ct);

// AFTER: Extracted to extension
// In OrderRepositoryExtensions.cs
public static async Task<List<Order>> GetActiveByWarehouseAsync(
    this I{Service}RootRepository<Order> repo, string customerId, string warehouseId, CancellationToken ct)
{
    return await repo.GetAllAsync(
        Order.OfCustomerExpr(customerId)
            .AndAlso(Order.IsActiveExpr())
            .AndAlso(e => e.WarehouseIds.Contains(warehouseId)), ct);
}
```

### Mapping to DTO — the data-transfer type owns its own conversion

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

> Run `python .claude/scripts/code_graph connections <file> --json` on refactored files to find all consumers needing updates.

## Graph Intelligence (RECOMMENDED if graph.db exists)

If `.code-graph/graph.db` exists, enhance analysis with structural queries:

- **Impact of restructuring -- trace callers:** `python .claude/scripts/code_graph query callers_of <function> --json`
- **Impact of restructuring -- check importers:** `python .claude/scripts/code_graph query importers_of <module> --json`
- **Batch analysis:** `python .claude/scripts/code_graph batch-query file1 file2 --json`

> See the `SYNC:graph-assisted-investigation` block above for graph query patterns.

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
> 1. **Activate `workflow-refactor` workflow** (Recommended) — scout → investigate → plan → plan-execute → review → production-readiness-review → test → docs
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

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

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

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `/sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone. — why: long context drifts from the file; the file is ground truth
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation. — why: divergent patterns fragment the codebase and slow every future reader
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
> 1. **DRY via OOP:** Identify classes/modules with the same purpose, naming pattern, or lifecycle. Apply your knowledge of the project's language/framework to determine the idiomatic abstraction (base class, mixin, trait, protocol, decorator). 3+ similar patterns → extract to shared abstraction.
> 2. **Right Responsibility:** Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
> 3. **SOLID:** Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
> 4. **After extraction/move/rename:** Grep ENTIRE scope for dangling references. Zero tolerance.
> 5. **YAGNI gate:** NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
>
> **Anti-patterns to flag:** God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.
>
> **Serial Attention for Design Quality** — Scan one quality dimension at a time (serial passes), not all concerns at once. — why: split attention misses violations that single-focus passes catch.
>
> 1. **Identify applicable dimensions** — Based on the code's language, domain, and patterns, determine which quality dimensions apply: DRY, SOLID principles (SRP/OCP/LSP/ISP/DIP), OOP idioms, cohesion/coupling, GRASP, Law of Demeter, CQRS invariants, etc. Your list is NOT fixed — derive from what the code actually does.
> 2. **One focused pass per dimension** — Dedicate single-focus attention to EACH dimension in sequence. Do NOT mix concerns across passes.
> 3. **Threshold: 3+ similar patterns = MANDATORY extraction** — Not optional suggestion. Flag as mandatory structural fix requiring action.
> 4. **2+ violations of same kind = structural finding** — Report as "pattern problem" needing architectural resolution, not a list of individual instances.

<!-- /SYNC:design-patterns-quality -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:design-patterns-quality:reminder -->

**IMPORTANT MUST ATTENTION** check DRY via OOP, right responsibility layer, SOLID. Grep for dangling refs after moves.

<!-- /SYNC:design-patterns-quality:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → trace → verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

## Closing Reminders

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Graph-Assisted Investigation:** ALWAYS run ≥1 graph command on key files when graph.db exists.
- **Nested Task Creation:** Expand child phases and link parent when nested.
- **Project Reference Docs:** ALWAYS read required project-reference docs and cite before target work.
- **Critical Thinking:** Apply critical + sequential thinking; traced proof, confidence >80% to act.
- **Understand Code First:** ALWAYS search 3+ patterns and read code before any modification.
- **Evidence:** Cite `file:line` for every claim; NEVER recommend below 60% confidence.
- **Design Patterns Quality:** DRY via OOP, lowest-layer responsibility, SOLID; grep dangling refs after moves.
- **Source/Test Drift:** When source behavior changes, reconcile affected tests from evidence.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.
