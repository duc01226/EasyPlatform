---
name: code-simplifier
description: '[Code Quality] Use when you need to simplify and refine code for clarity, consistency, and maintainability while preserving all functionality.'
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

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Lower the cost of the next change — cut coupling, hidden state, duplicated knowledge, unclear intent — by simplifying and refining code for clarity, consistency, and maintainability without altering any observable behavior. — why: every simplification serves future change cost, not aesthetics.

> **MANDATORY IMPORTANT MUST ATTENTION** Plan task to READ:
>
> - `docs/project-reference/code-review-rules.md` — anti-patterns, review checklists **(READ FIRST)**
> - `project-structure-reference.md` — project patterns/structure
>
> If not found, search for: project documentation, coding standards, architecture docs.

**Workflow:**

1. **Phase 0: Detect** — Classify artifact type (backend/frontend/test/config) and scope
2. **Identify Targets** — Recent git changes or specified files (skip generated/vendor)
3. **Analyze** — Apply simplification dimensions (see below)
4. **Apply** — One refactoring type at a time following KISS/DRY/YAGNI
5. **Verify** — Run related tests, confirm no behavior changes
6. **Self-Recursive Check** — Re-run this skill's simplification analysis until no simplification findings remain
7. **Self-Review Gate (MANDATORY when code changed)** — If this skill modified any files, self-invoke `$code-review` scoped to ONLY those changed files; skip + log if nothing changed

**Key Rules:**

- Preserve all existing functionality — no behavior changes
- Follow the project's documented patterns (entity expressions, fluent helpers, store base, BEM)
- Easy to Change is the primary simplification goal for source files; DRY, SOLID, abstraction, and patterns are valid only when they lower future edit sites or cognitive load
- Tests pass after every change
- Apply simplification only when certain it preserves behavior — NEVER apply when unsure

## Phase 0: Artifact Detection

**MUST ATTENTION** classify before simplifying — detection drives focus and optional escalation only:

| Artifact Type    | Detection                                                                  | Key Focus                                                                                       |
| ---------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Backend          | Backend source files for the current stack (e.g. `.cs`)                    | Domain-model expressions, fluent API, DRY via OOP, SOLID                                        |
| Frontend         | Frontend source files for the current stack (e.g. `.ts`, `.html`, `.scss`) | BEM, store base, subscription cleanup, component base                                           |
| Tests            | Test source files for the current stack (e.g. `*Test.cs`, `*.spec.ts`)     | Assertions, async-assertion helpers (e.g. an await-until-condition poll helper), data isolation |
| Config/Generated | Migrations, generated/vendor files (e.g. `*.generated.*`)                  | **SKIP** — NEVER simplify generated/migration code                                              |

Optional escalation by artifact:

| Artifact             | Escalate only when                                       |
| -------------------- | -------------------------------------------------------- |
| Source code/diffs    | Broad review is requested after simplifier loop is clean |
| Security-sensitive   | Security-specific risk is present                        |
| Performance-critical | Performance behavior is part of the change               |
| Plans/docs/specs     | Artifact review is explicitly requested                  |

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
- Favor project-owned boundaries around external libraries, for example
  component/service input-output contracts, when they localize future library
  changes; reject pass-through wrappers that add ceremony without lowering
  change cost.
- A simpler design that is easy to change beats a sophisticated design that
  isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule would raise change cost, this principle wins.

---

## Simplification Mindset

**Skeptical-first:** Verify before simplifying. Every change needs proof it preserves behavior.

- NEVER assume code redundant — trace call paths and read implementations first
- Before removing/replacing: grep all usages confirming nothing depends on current form
- Before flagging convention violation: grep 3+ existing examples — codebase convention wins
- Every simplification requires `file:line` evidence of what was verified
- Apply simplification only when certain it preserves behavior; if unsure → DO NOT apply

## Simplification Dimensions

Dimension-based reasoning replaces fixed checklists. Each dimension has a `Think:` prompt forcing first-principles reasoning.

### Dimension 1: Readability

> **Think:** Would a new engineer understand this in 30 seconds? What forces multiple file traces?

- Schema visibility: functions computing data structures need output-shape comment
- Non-obvious pipelines: A→B→C transformations need brief pipeline explanation
- Self-documenting signatures: params explain role; remove unused params
- Magic values: replace unexplained numbers/strings with named constants
- Naming clarity: names reveal intent without reading implementation

### Dimension 2: DRY & Abstraction

> **Think:** Pattern appearing ≥3 places? What base class/generic eliminates duplication?

- Same-suffix classes (`*Entity`, `*Dto`, `*Service`) → shared base
- Repeated logic blocks → extract to helper/extension method
- YAGNI gate: NEVER extract for hypothetical future use — 3+ occurrences required

### Dimension 3: Right Responsibility

> **Think:** Logic in lowest layer that can own it? Could moving it down enable reuse?

- `Entity/Model → Domain Service → Application Service → Controller` (logic belongs lowest)
- Business logic in controllers → move down
- Mapping in handlers → move to DTO methods

### Dimension 4: Complexity Reduction

> **Think:** What is cognitive load? Can nesting/conditionals flatten?

- Nesting >3 → refactor (early returns, extract methods)
- Methods >20 lines → extract
- Complex conditionals → flatten or Strategy pattern (3+ branching occurrences only)

### Dimension 5: Database Performance

> **MANDATORY IMPORTANT MUST ATTENTION**
>
> 1. **Paging:** ALL list queries MUST use pagination. NEVER unbounded `GetAll()`, `ToList()`, `Find()` without `Skip/Take` or cursor-based paging.
> 2. **Indexes:** ALL filter fields, foreign keys, sort columns MUST have database indexes. Entity expressions must match index field order. Collections need index management methods.

## Project Patterns

### Backend

- Extract entity static expressions (search: entity expression pattern)
- Use fluent helpers (search: fluent helper pattern in `docs/project-reference/backend-patterns-reference.md`)
- Move mapping to DTO mapping methods (search: DTO mapping pattern)
- Use project validation fluent API (see `docs/project-reference/backend-patterns-reference.md`)
- Verify entity expressions have database indexes
- Verify document DB collections have index management methods

### Frontend

- Use project store base (search: store base class) for state management
- Apply subscription cleanup (search: subscription cleanup pattern) to all subscriptions
- BEM class naming on ALL template elements
- Use the project's base classes (search: base component class, store component base class)

## Graph Intelligence (MANDATORY if graph.db exists)

Before simplifying, trace what depends on target:

```
python .claude/scripts/code_graph trace <file> --direction downstream --json
```

Verify simplified code preserves same interface for all traced consumers. Cross-service MESSAGE_BUS consumers are especially fragile — may depend on exact message shape.

Additional queries:

- Verify no callers break: `python .claude/scripts/code_graph query callers_of <function> --json`
- Check dependents: `python .claude/scripts/code_graph query importers_of <module> --json`
- Batch analysis: `python .claude/scripts/code_graph batch-query file1 file2 --json`

## Execution

```
spawn_agent(agent_type="code-simplifier", prompt="Review and simplify [target files]")
```

**Example:**

```typescript
// Before
function getData() {
    const result = fetchData();
    if (result !== null && result !== undefined) {
        return result;
    } else {
        return null;
    }
}

// After
function getData() {
    return fetchData() ?? null;
}
```

## Constraints

- **Preserve functionality** — no behavior changes
- **Tests passing** — verify after every change
- **Follow patterns** — use the project's conventions, never invent
- **Doc staleness** — cross-ref changed files against feature docs, test specs, READMEs; flag updates needed

---

## Self-Recursive Verification (MANDATORY after simplifications)

After simplifications applied, verification requires a **self-recursive simplification pass** over the updated diff. Do NOT spawn a fresh-context reviewer to re-review this skill's own findings. Repeat analyze → simplify → verify until this skill finds no further simplification opportunities, or stop on an unsafe/no-progress/user-decision blocker.

## Self-Review Gate (MANDATORY when this skill changed code)

> **This skill is a code MUTATOR. It owns the review of its own output.** Once the self-recursive simplification loop above is clean, gate the result:
>
> 1. **Did this skill modify any files?** Determine the exact set of files this skill changed (its own edits — not the whole working tree).
>     - **No files changed** → SKIP this gate and **log the skip reason** ("code-simplifier made no changes — no self-review needed"). Done.
>     - **Files changed** → continue.
> 2. **Self-invoke `$code-review` scoped to ONLY the changed files.** Pass the explicit changed-file set as the review target — not the full diff, not unrelated files.
> 3. **Integrate the `$code-review` findings.** If it surfaces blocking issues caused by the simplification, fix them (behavior-preserving only) and re-run the self-recursive loop + this gate. If issues are out of simplification scope, report them up — do not silently drop.
>
> **Recursion safety:** `$code-review` is a LEAF review skill — it does NOT invoke `$code-simplifier` back, so there is no cycle. Use `$code-review` here, NEVER `$review-changes` (the heavyweight workflow that itself contains `$code-simplifier` and would recurse).
>
> **Why this gate exists:** `$code-simplifier` rewrites code after the main review batch has already run. Without this gate, the simplifier's output would ship unreviewed. This gate moves that review responsibility into the mutator itself — so the `workflow-review-changes` workflow no longer needs a separate `$code-review` step after `$code-simplifier`.

Used standalone (outside a review workflow), this self-review gate is sufficient for the simplifier's own changes; you may still finish with `$review-changes` or the active workflow's review gate for broader, whole-changeset coverage.

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If NOT already in workflow, use a direct user question to ask user. Do NOT decide this is "simple enough to skip" — the user decides:
>
> 1. **Activate `workflow-review-changes` workflow** (Recommended) — full review-changes restart gate → validated fix cycle (plan → plan-review → cook) → re-review → docs
> 2. **Execute `$code-simplifier` directly** — run standalone (this skill self-reviews its own changes via the Self-Review Gate)

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing, use a direct user question:

- **"$workflow-review-changes (Recommended)"** — Review all changes before commit
- **"$code-review"** — Full code review
- **"Skip, continue manually"** — user decides

## AI Agent Integrity Gate (NON-NEGOTIABLE)

> **Completion ≠ Correctness.** Before reporting work done, prove it:
>
> 1. **Grep every removed name.** Extraction/rename/delete → grep confirms 0 dangling refs across ALL file types.
> 2. **Ask WHY before changing.** Existing values intentional until proven otherwise. No "fix" without traced rationale.
> 3. **Verify ALL outputs.** One build passing ≠ all builds passing. Check every affected stack.
> 4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
> 5. **New artifact = wired artifact.** Created? Prove registered, imported, reachable by all consumers.

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. For simple tasks, MUST ATTENTION ask user whether to skip.

**Prerequisites:** **MUST ATTENTION READ** before executing:

- `docs/project-reference/domain-entities-reference.md` — domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (read directly when relevant; do not rely on hook-injected conversation text)

> **External Memory:** Complex/lengthy work → write findings to `plans/reports/`. Prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, recommendation requires `file:line` proof or traced evidence (confidence >80% to act, <80% verify first).

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST ATTENTION — flag duplicated patterns for base class extraction. Same-suffix classes (`*Entity`, `*Dto`, `*Service`) MUST ATTENTION inherit common base. Verify stack has linting/analyzer configured.

## Self-Recursive Simplification Loop

**Purpose:** Avoid spending tokens on a fresh-context review of this skill's own findings. The simplifier owns its own convergence loop; broader review workflows can still run after the simplifier reports clean.

Loop:

1. Analyze the current target/diff for simplification findings with `file:line` evidence.
2. Apply only behavior-preserving simplifications that satisfy the evidence gate.
3. Run targeted verification after each change set.
4. Re-read the updated diff and re-run this skill's simplification dimensions.
5. Repeat until this skill finds zero simplification findings.

Stop conditions:

- The same simplification finding repeats for 3 passes with no progress.
- A simplification needs product/owner input or has behavior-change risk.
- Verification cannot run or cannot prove behavior preservation.

Rules:

- Do not spawn a fresh-context reviewer just because simplifications were applied.
- Do not re-review known findings in a fresh context before fixing them.
- Do not hand off as clean until the self-recursive pass finds zero simplification findings.
- After the self-recursive loop is clean, run the **Self-Review Gate** — if any files were changed, self-invoke `$code-review` scoped to those files (recursion-safe leaf skill); skip + log if nothing changed.

<!-- SYNC:ui-system-context -->

> **UI System Context** — For ANY task touching `.ts`, `.html`, `.scss`, or `.css` files:
>
> **MUST ATTENTION READ before implementing:**
>
> 1. `docs/project-reference/frontend-patterns-reference.md` — component base classes, stores, forms
> 2. `docs/project-reference/scss-styling-guide.md` — BEM methodology, SCSS variables, mixins, responsive
> 3. `docs/project-reference/design-system/README.md` — design tokens, component inventory, icons
>
> Reference `docs/project-config.json` for project-specific paths.

<!-- /SYNC:ui-system-context -->

<!-- SYNC:shared-protocol-duplication-policy -->

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first, then grep `SYNC:protocol-name` and update all occurrences.

<!-- /SYNC:shared-protocol-duplication-policy -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

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
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

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

<!-- SYNC:complexity-prevention -->

> **Complexity Prevention (Ousterhout)** — MANDATORY. Measure code by cost of change: one business change should map to one code change. Flag ALL of the following in review:
>
> 1. **Change amplification** — small business change forces edits in >3 places → structural flaw. Count edit sites for a plausible future change (add variant, add field, add authorization). >3 = reject.
> 2. **Cognitive load** — reader must hold too much context to safely modify. Flag deep inheritance, long parameter lists, boolean traps, implicit ordering dependencies.
> 3. **Cross-cutting duplication at entry points** — logging, error handling, validation, auth, transactions reimplemented per controller/handler/route. Lift to middleware / interceptor / filter / decorator / aspect.
> 4. **Leaked implementation technology** — repos returning `IQueryable`/`QuerySet`/`Criteria`/raw cursors/ORM entities to callers. Return finished results + intent-revealing methods (`GetActiveVipUsers()` not `Query()`).
> 5. **Type-switch scattering** — `switch`/`if`-chains on enum/discriminator in >1 place. New variant = new file, not N edits. One factory/registry switch at the boundary OK; scattered switches = reject.
> 6. **Anemic models** — domain objects with only getters/setters, logic floats in services. Move invariants/behavior onto the object (`order.Checkout()`, not `order.Status = ...`).
> 7. **Primitive obsession** — raw `string`/`int`/`decimal` for account numbers, emails, money, percentages, date ranges, with re-validation at every entry. Wrap in value objects / records / structs that validate once at construction.
> 8. **Inline cross-cutting concerns** — authorization/tenant isolation/audit/sanitization hand-written at top of every handler. Flag intent with declarative markers (`@RequirePermission("Order.Delete")`), enforce once centrally.
> 9. **Shallow modules** — tiny class, big interface (many public methods, many flags, many ctor params) wrapping little logic. A module is deep when a small interface hides a lot of implementation. If interface ≈ implementation cost to learn → inline.
> 10. **Missing base class for repeated component/handler lifecycle** — 3+ forms/CRUD handlers/list views reimplementing loading/dirty/submit/pagination → extract to base class / hook / composable / mixin / trait.
> 11. **Premature vs delayed abstraction** — rule-of-three. First occurrence: write it. Second: notice duplication. Third: extract. Don't build generic frameworks before real variation; don't copy-paste for the 4th time.
> 12. **Embedded utility logic not extracted to helpers** — inline paging loops (`while (hasMore) { skip += take; ... }`), ad-hoc datetime math, string parsing/formatting, collection partitioning, retry/backoff loops, URL/query-string building. If the algorithm is non-trivial AND stack-generic (not business-specific), extract to `util`/`helper`/`extensions` and let consumers call one line. Inline duplicates → duplicated bug surface.
> 13. **Logic in wrong (higher) layer — downshift to callee** — business/derivation logic written in the caller when the callee owns the data. Defaults: Controller code that should be App Service. App Service code that should be Domain Service or Entity. Component code that should be ViewModel/Store/Service. Caller reaching into callee's data shape to compute something → move the computation behind an intent-revealing method on the callee. Lowest responsible layer wins (Entity > Domain Service > App Service > Controller · Model/VM > Store > Component). Higher-layer placement = duplicated logic when a sibling caller needs the same thing.
> 14. **Owner owns the rule — extract on first write** — if a caller inlines logic that derives, normalizes, validates, or computes from another type's data, MOVE it to the owning type. Single use is sufficient — the trigger is wrong responsibility, not duplication. Sibling callers always arrive; inline copies drift silently with no compile error and no name to grep. **Common offenders:** _Backend_ — inlined rules in application-layer handlers / commands / queries / services / controllers that belong on the domain entity / value object / domain service. _Frontend_ — inlined derivations / formatting / validation in components that belong on the model / store / view-model / API service. **Fix:** name the rule once as a method (static or instance) on the owning type; callers invoke by name. Future variant → SECOND named method on the owner, never an inline near-duplicate. **Right responsibility first; reuse is the consequence.**
>
> **Extraction target — where the named rule lives:**
>
> | Shape of the rule                             | Goes to                       |
> | --------------------------------------------- | ----------------------------- |
> | Pure function over an entity's own data       | static method on the entity   |
> | Behavior that mutates / guards entity state   | instance method on the entity |
> | Always-true invariant on a primitive value    | value object constructor      |
> | Needs DI (repo / settings / clock)            | helper class registered in DI |
> | Domain-agnostic algorithm reused across types | util / extension method       |
> | Pure shape / projection conversion            | DTO mapping                   |
>
> **Pre-commit edit-site test (reject if answer is "many"):**
>
> | Change Scenario                                 | Should touch              |
> | ----------------------------------------------- | ------------------------- |
> | Add new variant (customer type, payment method) | 1 new file                |
> | Change HTTP error response format               | 1 middleware/filter       |
> | Add timestamp field to every persisted entity   | 1 base entity/interceptor |
> | Add authorization to a new endpoint             | 1 declarative marker      |
> | Swap database/ORM                               | Data layer only           |
> | Change business calculation rule                | 1 method on owning entity |
> | Add loading indicator pattern to forms          | 1 base component/hook     |
> | Add validation rule to a domain primitive       | 1 value-object ctor       |
> | Change paging/retry/datetime algorithm          | 1 helper/util function    |
> | Change a derivation of entity data              | 1 method on the entity    |
>
> **Operating heuristics:**
>
> - Write the call site first.
> - Count edit sites for plausible future change.
> - Prefer removing code over adding it.
> - Surface assumptions at boundaries, hide details inside.
> - **Pre-reuse scan** — before writing a non-trivial block, grep for similar algorithms (`while.*skip`, `DateTime.*Add`, `split`/`join` chains, paging loops, retry loops). Match existing helper → call it. None exists but pattern is stack-generic → extract to util before second caller appears.
> - **Layer placement test** — ask "if a sibling caller needed this tomorrow, would they re-derive it?" If yes, the logic is in the wrong layer. Move it down.
> - **Open-case-for-future-reuse** — if reviewer spots a block that is likely to appear in another feature (domain-agnostic algorithm, shared lifecycle, recurring derivation), do NOT rationalize with pure YAGNI. Either extract now (if cheap) or create a tracked TODO with the exact extraction target so the second caller does not duplicate silently. Silent duplication is the default failure mode.
> - When in doubt ask: "What would need to change if the requirement shifts?"
>
> **The measure of good code is the cost of change.** Not shortest. Not cleverest. Not most abstracted. Cheapest to safely modify having read a small local portion.

<!-- /SYNC:complexity-prevention -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:complexity-prevention:reminder -->

**MUST ATTENTION** apply complexity prevention — one business change = one code change. Flag change amplification (>3 edit sites for future change), scattered type-switches, anemic models, primitive obsession, leaked technology through abstractions, shallow modules, un-extracted utility logic (paging/datetime/string/retry → helpers), and logic in the wrong higher layer (downshift to callee/entity/VM). Don't rationalize silent duplication with pure YAGNI.

<!-- /SYNC:complexity-prevention:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

- **IMPORTANT MUST ATTENTION Goal:** lower the cost of the next change — cut coupling, hidden state, duplicated knowledge, unclear intent — without altering observable behavior
- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks via task tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via a direct user question — never auto-decide
- **MANDATORY IMPORTANT MUST ATTENTION** add final review task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** READ `docs/project-reference/code-review-rules.md` FIRST
- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE modification. Run graph trace when graph.db exists.
- **MANDATORY IMPORTANT MUST ATTENTION** check DRY via OOP (same-suffix → base class), right responsibility (lowest layer), SOLID. Grep dangling refs after changes.
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER simplify generated code, migrations, vendor files
- **MANDATORY IMPORTANT MUST ATTENTION** run the self-recursive simplification loop until this skill finds zero simplification findings; do not spawn a fresh-context reviewer for this skill's own findings.
- **MANDATORY IMPORTANT MUST ATTENTION** Self-Review Gate — when this skill changed code, self-invoke `$code-review` scoped to ONLY the changed files (recursion-safe leaf skill; NEVER `$review-changes`); skip + log when nothing changed. The simplifier owns review of its own output.

**Anti-Rationalization:**

| Evasion                             | Rebuttal                                                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| "Too simple for graph trace"        | Wrong assumptions waste more time. Run trace anyway.                                                                                |
| "Already searched"                  | Show `file:line` evidence. No proof = no search.                                                                                    |
| "Just a small simplification"       | Small change at wrong layer cascades. Verify consumers first.                                                                       |
| "Code is self-explanatory"          | Future readers need evidence trail. Document non-obvious intent.                                                                    |
| "Simplification is safe"            | NEVER assume safe without grepping all usages first.                                                                                |
| "Best practice says abstract it"    | Abstract only when it lowers future change cost; pass-through indirection is complexity, not simplification.                        |
| "Skip recursive check after fixing" | Every simplification changes the diff. Re-run this skill's own simplification analysis until it finds zero simplification findings. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break into small todo tasks using task tracking.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
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
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
