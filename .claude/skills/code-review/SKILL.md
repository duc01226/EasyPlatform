---
name: code-review
version: 2.1.0
description: '[Code Quality] Use when receiving code review feedback (especially if unclear or technically questionable), when completing tasks requiring review before proceeding, or before making completion claims. Covers receiving feedback with technical rigor, requesting reviews via code-reviewer subagent, and verification gates requiring evidence before status claims.'
allowed-tools: Read, Grep, Glob, Bash, Write, TaskCreate, Edit, AskUserQuestion
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

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
> 1. **DRY via OOP:** Same-suffix classes (`*Entity`, `*Dto`, `*Service`) MUST share base class. 3+ similar patterns → extract to shared abstraction.
> 2. **Right Responsibility:** Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
> 3. **SOLID:** Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
> 4. **After extraction/move/rename:** Grep ENTIRE scope for dangling references. Zero tolerance.
> 5. **YAGNI gate:** NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
>
> **Anti-patterns to flag:** God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

<!-- /SYNC:design-patterns-quality -->
<!-- SYNC:double-round-trip-review -->

> **Deep Multi-Round Review** — THREE mandatory escalating-depth rounds. NEVER combine. NEVER PASS after Round 1 alone.
>
> **Round 1:** Normal review building understanding. Read all files, note issues.
> **Round 2:** MANDATORY re-read ALL files from scratch. Focus on:
>
> - Cross-cutting concerns missed in Round 1
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces (what should exist but doesn't)
>
> **Round 3:** MANDATORY adversarial simulation (for >3 files or cross-cutting changes). Pretend you are using/running this code RIGHT NOW:
>
> - "What input causes failure? What error do I get?"
> - "1000 concurrent users — what breaks?"
> - "After deployment rollback — backward compatible?"
> - "Can I debug issues from logs/monitoring output?"
>
> **Rules:** NEVER rely on prior round memory — re-read everything. NEVER declare PASS after Round 1. Final verdict must incorporate ALL rounds.
> **Report must include `## Round 2 Findings` and `## Round 3 Findings` sections.**

<!-- /SYNC:double-round-trip-review -->

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

> **Critical Purpose:** Ensure quality — no flaws, no bugs, no missing updates, no stale content. Verify both code AND documentation.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- SYNC:rationalization-prevention -->

> **Rationalization Prevention** — AI skips steps via these evasions. Recognize and reject:
>
> | Evasion                      | Rebuttal                                                      |
> | ---------------------------- | ------------------------------------------------------------- |
> | "Too simple for a plan"      | Simple + wrong assumptions = wasted time. Plan anyway.        |
> | "I'll test after"            | RED before GREEN. Write/verify test first.                    |
> | "Already searched"           | Show grep evidence with `file:line`. No proof = no search.    |
> | "Just do it"                 | Still need TaskCreate. Skip depth, never skip tracking.       |
> | "Just a small fix"           | Small fix in wrong location cascades. Verify file:line first. |
> | "Code is self-explanatory"   | Future readers need evidence trail. Document anyway.          |
> | "Combine steps to save time" | Combined steps dilute focus. Each step has distinct purpose.  |

<!-- /SYNC:rationalization-prevention -->
<!-- SYNC:logic-and-intention-review -->

> **Logic & Intention Review** — Verify WHAT code does matches WHY it was changed.
>
> 1. **Change Intention Check:** Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
> 2. **Happy Path Trace:** Walk through one complete success scenario through changed code
> 3. **Error Path Trace:** Walk through one failure/edge case scenario through changed code
> 4. **Acceptance Mapping:** If plan context available, map every acceptance criterion to a code change
>
> **NEVER mark review PASS without completing both traces (happy + error path).**

<!-- /SYNC:logic-and-intention-review -->
<!-- SYNC:bug-detection -->

> **Bug Detection** — MUST check categories 1-4 for EVERY review. Never skip.
>
> 1. **Null Safety:** Can params/returns be null? Are they guarded? Optional chaining gaps? `.find()` returns checked?
> 2. **Boundary Conditions:** Off-by-one (`<` vs `<=`)? Empty collections handled? Zero/negative values? Max limits?
> 3. **Error Handling:** Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
> 4. **Resource Management:** Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
> 5. **Concurrency (if async):** Missing `await`? Race conditions on shared state? Stale closures? Retry storms?
> 6. **Stack-Specific:** JS: `===` vs `==`, `typeof null`. C#: `async void`, missing `using`, LINQ deferred execution.
>
> **Classify:** CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO

<!-- /SYNC:bug-detection -->
<!-- SYNC:test-spec-verification -->

> **Test Spec Verification** — Map changed code to test specifications.
>
> 1. From changed files → find TC-{FEAT}-{NNN} in `docs/business-features/{Service}/detailed-features/{Feature}.md` Section 17
> 2. Every changed code path MUST map to a corresponding TC (or flag as "needs TC")
> 3. New functions/endpoints/handlers → flag for test spec creation
> 4. Verify TC evidence fields point to actual code (`file:line`, not stale references)
> 5. Auth changes → TC-{FEAT}-02x exist? Data changes → TC-{FEAT}-01x exist?
> 6. If no specs exist → log gap and recommend `/tdd-spec`
>
> **NEVER skip test mapping.** Untested code paths are the #1 source of production bugs.

<!-- /SYNC:test-spec-verification -->

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix (ex *Entity, *Dto, \*Service, etc...) MUST inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

## Quick Summary

**Goal:** Ensure technical correctness through three practices: receiving feedback with verification over performative agreement, requesting systematic reviews via code-reviewer subagent, and enforcing verification gates before completion claims.

> **MANDATORY IMPORTANT MUST** Plan ToDo Task to READ the following project-specific reference docs:
>
> - `docs/project-reference/code-review-rules.md` — anti-patterns, review checklists, quality standards **(READ FIRST)**
> - `backend-patterns-reference.md` — backend CQRS, validation, entity patterns
> - `frontend-patterns-reference.md` — component hierarchy, store, forms patterns
> - `docs/project-reference/design-system/README.md` — design tokens, component inventory, icons
>
> If files not found, search for: project coding standards, architecture documentation.

**Workflow:**

1. **Create Review Report** — Initialize report file in `plans/reports/code-review-{date}-{slug}.md`
2. **Phase 1: File-by-File** — Review each file, update report with issues (naming, typing, magic numbers, responsibility)
3. **Phase 2: Holistic Review** — Re-read accumulated report, assess overall approach, architecture, duplication
4. **Phase 3: Final Result** — Update report with overall assessment, critical issues, recommendations

**Key Rules:**

- **Report-Driven**: Build report incrementally, re-read for big picture
- **Two-Phase**: Individual file review → holistic assessment of accumulated findings
- **No Performative Agreement**: Technical evaluation, not social comfort ("You're right!" banned)
- **Verification Gates**: Evidence required before any completion claims (tests pass, build succeeds)

# Code Review

Three practices: (1) Receiving feedback with technical rigor, (2) Requesting systematic reviews via code-reviewer subagent, (3) Enforcing verification gates before completion claims.

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST run at least ONE graph command on key files before concluding any investigation.
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

> Run `python .claude/scripts/code_graph query tests_for <function> --json` on changed functions to flag coverage gaps.

## Review Mindset (NON-NEGOTIABLE)

**Be skeptical. Every claim needs traced proof with `file:line` evidence. Confidence >80% to act.**

- NEVER accept code correctness at face value — trace call paths to confirm
- NEVER include a finding without `file:line` evidence (grep results, read confirmations)
- ALWAYS question: "Does this actually work?" → trace it. "Is this all?" → grep cross-service.
- ALWAYS verify side effects: check consumers and dependents before approving

## Core Principles (ENFORCE ALL)

| Principle          | Rule                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| **YAGNI**          | Flag code solving hypothetical problems (unused params, speculative interfaces)                   |
| **KISS**           | Flag unnecessary complexity. "Is there a simpler way?"                                            |
| **DRY**            | Grep for similar/duplicate code. 3+ similar patterns → flag for extraction                        |
| **Clean Code**     | Readable > clever. Names reveal intent. Functions do ONE thing. Nesting <=3. Methods <30 lines    |
| **Convention**     | MUST grep 3+ existing examples before flagging violations. Codebase convention wins over textbook |
| **No Bugs**        | Trace logic paths. Verify edge cases (null, empty, boundary). Check error handling                |
| **Proof Required** | Every claim backed by `file:line` evidence. Speculation is forbidden                              |
| **Doc Staleness**  | Cross-ref changed files against related docs. Flag stale/missing updates                          |

**Technical correctness over social comfort.** Verify before implementing. Evidence before claims.

## Graph-Enhanced Review (RECOMMENDED if graph.db exists)

1. `python .claude/scripts/code_graph graph-blast-radius --json` — prioritize files by impact (most dependents first)
2. `python .claude/scripts/code_graph query tests_for <function_name> --json` — flag untested changed functions
3. `python .claude/scripts/code_graph trace <file> --direction downstream --json` — downstream impact (events, bus, cross-service)
4. `python .claude/scripts/code_graph trace <file> --direction both --json` — full flow context for controllers/commands/handlers
5. Wide blast radius (>20 impacted nodes) = high-risk. Flag in report.

## Review Approach (Report-Driven Two-Phase - CRITICAL)

**⛔ MANDATORY FIRST: Create Todo Tasks**
Before starting, call TaskCreate with review phase tasks:

- `[Review Phase 1] Create report file` - in_progress
- `[Review Phase 1] Review file-by-file and update report` - pending
- `[Review Phase 2] Re-read report for holistic assessment` - pending
- `[Review Phase 3] Generate final review findings` - pending
- `[Review Round 2] Focused re-review of all files` - pending
- `[Review Final] Consolidate Round 1 + Round 2 findings` - pending
  Update todo status as each phase completes.

**Step 0: Create Report File**

- Create `plans/reports/code-review-{date}-{slug}.md`
- Initialize with Scope, Files to Review sections

**Phase 1: File-by-File Review (Build Report)**
For EACH file, **immediately update report** with:

- File path, Change Summary, Purpose, Issues Found
- Check naming, typing, magic numbers, responsibility placement
- **Convention check:** Grep for 3+ similar patterns in codebase — does new code follow existing convention?
- **Correctness check:** Trace logic paths — does the code handle null, empty, boundary values, error cases?
- **DRY check:** Grep for similar/duplicate code — does this logic already exist elsewhere?

**Phase 2: Holistic Review (Review the Report)**
After ALL files reviewed, **re-read accumulated report** to see big picture:

- **Technical Solution**: Does overall approach make sense as unified plan?
- **Responsibility**: New files in correct layers? Logic in LOWEST layer?
- **Backend**: Mapping in Command/DTO (not Handler)?
- **Frontend**: Constants/columns in Model (not Component)?
- **Duplication**: Any duplicated logic across changes? Similar code elsewhere? (grep to verify)
- **Architecture**: Clean Architecture followed? Service boundaries respected?
- **Plan Compliance (if active plan exists):** Check `## Plan Context` → if plan path exists, verify: implementation matches plan requirements, plan TCs have code evidence (not "TBD"), no plan requirement unaddressed
- **Design Patterns** (per `design-patterns-quality-checklist.md`): Pattern opportunities (switch→Strategy, scattered new→Factory)? Anti-patterns (God Object, Copy-Paste, Circular Dependency)? DRY via base classes/generics? Right responsibility layer? Tech-agnostic abstractions?

**MUST CHECK — Clean Code:** YAGNI (unused params, speculative interfaces)? KISS (simpler alternative exists)? Methods >30 lines or nesting >3? Abstractions for single-use?

**MUST CHECK — Correctness:** Null/empty/boundary handled? Error paths caught and propagated? Async race conditions? Trace one happy path + one error path through business logic.

**Documentation Staleness Check:**

Cross-reference changed files against related documentation:

| Changed file pattern   | Docs to check                                                                  |
| ---------------------- | ------------------------------------------------------------------------------ |
| Service code `**`      | Business feature docs for affected service                                     |
| Frontend code `**`     | Frontend patterns doc, relevant business-feature docs                          |
| Framework code `**`    | Backend patterns doc, advanced patterns doc                                    |
| `.claude/hooks/**`     | `.claude/docs/hooks/README.md`, hook count tables in `.claude/docs/hooks/*.md` |
| `.claude/skills/**`    | `.claude/docs/skills/README.md`, skill catalogs                                |
| `.claude/workflows/**` | `CLAUDE.md` workflow catalog, `.claude/docs/` references                       |

Flag stale counts/tables/examples, missing docs for new features, outdated test specs. **Do NOT auto-fix** — flag in report with specific stale section and what changed.

**Phase 3: Final Review Result**
Update report with: Overall Assessment, Critical Issues, High Priority, Architecture Recommendations, Documentation Staleness, Positive Observations

## Round 2: Focused Re-Review (MANDATORY)

> **Protocol:** Deep Multi-Round Review (inlined via SYNC:double-round-trip-review above)

After completing Phase 3 (Round 1), execute a **second full review round**:

1. **Re-read** the Round 1 report to understand what was already caught
2. **Re-scan** ALL reviewed files — do NOT rely on Round 1 memory
3. **Focus on** what Round 1 typically misses:
    - Cross-cutting concerns spanning multiple files
    - Subtle edge cases (null, empty, boundary, off-by-one)
    - Naming inconsistencies across files
    - Missing pieces (error handling, validation, tests)
    - Convention drift (grep to verify against codebase patterns)
    - Over-engineering that seemed justified in Round 1
4. **Update report** with `## Round 2 Findings` section
5. **Final verdict** must incorporate findings from BOTH rounds

## Clean Code Rules (MUST CHECK)

| #   | Rule                      | Details                                                                                                                                 |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **No Magic Values**       | All literals → named constants                                                                                                          |
| 2   | **Type Annotations**      | Explicit parameter and return types on all functions                                                                                    |
| 3   | **Single Responsibility** | One concern per method/class. Event handlers/consumers: one handler = one concern. NEVER bundle — platform swallows exceptions silently |
| 4   | **DRY**                   | No duplication; extract shared logic                                                                                                    |
| 5   | **Naming**                | Specific (`employeeRecords` not `data`), Verb+Noun methods, is/has/can/should booleans, no abbreviations                                |
| 6   | **Performance**           | No O(n²) (use dictionary). Project in query (not load-all). ALWAYS paginate. Batch-by-IDs (not N+1)                                     |
| 7   | **Entity Indexes**        | Collections: index management methods. EF Core: composite indexes. Expression fields match index order. Text search → text indexes      |

## Data Lifecycle Rules (MUST CHECK)

**Decision test:** _"Delete DB and start fresh — does this data still need to exist?"_ Yes → **Seeder**. No → **Migration**.

| Type          | Contains                                                               | NEVER contains                                   |
| ------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| **Seeder**    | Default records, system config, reference data (idempotent, every run) | Schema changes                                   |
| **Migration** | Schema changes, column adds/removes, data transforms, indexes          | Default records, permission seeds, system config |

```
// ❌ Seed data in migration — lost after DB reset
class SeedDefaultRecords : DataMigrationExecutor { ... }
// ✅ Idempotent seeder — always runs
class ApplicationDataSeeder { if (exists) return; else create(); }
```

## Legacy Frontend Pattern Compliance

When reviewing legacy frontend apps (check `docs/project-config.json` → `modules[].tags` for `"legacy"`), MUST verify:

- [ ] Component extends base component class (search for: app base component hierarchy) with `super(...)` in constructor
- [ ] Uses subscription cleanup pattern (search for: subscription cleanup pattern) — NO manual `Subject` destroy
- [ ] Services extend API service base class — NO direct `HttpClient`
- [ ] Store API calls use store effect pattern — NOT deprecated patterns

**CRITICAL anti-patterns to flag:**

```typescript
// ❌ Manual destroy Subject / takeUntil pattern
private destroy$ = new Subject<void>();
.pipe(takeUntil(this.destroy$))

// ❌ Raw Component without base class
export class MyComponent implements OnInit, OnDestroy { }
```

## When to Use This Skill

| Practice               | Triggers                                                                                   | MUST READ                                      |
| ---------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| **Receiving Feedback** | Review comments received, feedback unclear/questionable, conflicts with existing decisions | `references/code-review-reception.md`          |
| **Requesting Review**  | After each subagent task, major feature done, before merge, after complex bug fix          | `references/requesting-code-review.md`         |
| **Verification Gates** | Before any completion claim, commit, push, or PR. ANY success/satisfaction statement       | `references/verification-before-completion.md` |

## Quick Decision Tree

```
SITUATION?
│
├─ Received feedback
│  ├─ Unclear items? → STOP, ask for clarification first
│  ├─ From human partner? → Understand, then implement
│  └─ From external reviewer? → Verify technically before implementing
│
├─ Completed work
│  ├─ Major feature/task? → Request code-reviewer subagent review
│  └─ Before merge? → Request code-reviewer subagent review
│
└─ About to claim status
   ├─ Have fresh verification? → State claim WITH evidence
   └─ No fresh verification? → RUN verification command first
```

## Receiving Feedback Protocol

**Pattern:** READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND → IMPLEMENT

- NEVER use performative agreement ("You're right!", "Great point!", "Thanks for...")
- NEVER implement before verification
- MUST restate requirement, ask questions, or push back with technical reasoning
- MUST ask for clarification on ALL unclear items BEFORE starting
- MUST grep for usage before implementing suggested "proper" features (YAGNI check)

**Source handling:** Human partner → implement after understanding. External reviewer → verify technically, push back if wrong.

**Full protocol:** `references/code-review-reception.md`

## Requesting Review Protocol

1. Get git SHAs: `BASE_SHA=$(git rev-parse HEAD~1)` and `HEAD_SHA=$(git rev-parse HEAD)`
2. Dispatch code-reviewer subagent with: WHAT_WAS_IMPLEMENTED, PLAN_OR_REQUIREMENTS, BASE_SHA, HEAD_SHA, DESCRIPTION
3. Act on feedback: Critical → fix immediately. Important → fix before proceeding. Minor → note for later.

**Full protocol:** `references/requesting-code-review.md`

## Verification Gates Protocol

**Iron Law: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE**

**Gate:** IDENTIFY command → RUN it → READ output → VERIFY it confirms claim → THEN claim. Skip any step = lying.

| Claim            | Required Evidence               |
| ---------------- | ------------------------------- |
| Tests pass       | Test output shows 0 failures    |
| Build succeeds   | Build command exit 0            |
| Bug fixed        | Original symptom test passes    |
| Requirements met | Line-by-line checklist verified |

**Red Flags — STOP:** "should"/"probably"/"seems to", satisfaction before verification, committing without verification, trusting agent reports.

**Full protocol:** `references/verification-before-completion.md`

## Related

- `code-simplifier`
- `debug-investigate`
- `refactoring`

---

## Systematic Review Protocol (for 10+ changed files)

> **When the changeset is large (10+ files), categorize files by concern, fire parallel `code-reviewer` sub-agents per category, then synchronize findings into a holistic report.** See `review-changes/SKILL.md` § "Systematic Review Protocol" for the full 4-step protocol (Categorize → Parallel Sub-Agents → Synchronize → Holistic Assessment).

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `quality-audit` workflow** (Recommended) — code-review → plan → code → review-changes → test
> 2. **Execute `/code-review` directly** — run this skill standalone

---

## Architecture Boundary Check

For each changed file, verify it does not import from a forbidden layer:

1. **Read rules** from `docs/project-config.json` → `architectureRules.layerBoundaries`
2. **Determine layer** — For each changed file, match its path against each rule's `paths` glob patterns
3. **Scan imports** — Grep the file for `using` (C#) or `import` (TS) statements
4. **Check violations** — If any import path contains a layer name listed in `cannotImportFrom`, it is a violation
5. **Exclude framework** — Skip files matching any pattern in `architectureRules.excludePatterns`
6. **BLOCK on violation** — Report as critical: `"BLOCKED: {layer} layer file {filePath} imports from {forbiddenLayer} layer ({importStatement})"`

If `architectureRules` is not present in project-config.json, skip this check silently.

---

## Next Steps

**MANDATORY IMPORTANT MUST — NO EXCEPTIONS** after completing this skill, you MUST use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/fix (Recommended)"** — If review found issues that need fixing
- **"/watzup"** — If review is clean, wrap up session
- **"Skip, continue manually"** — user decides

## AI Agent Integrity Gate (NON-NEGOTIABLE)

> **Completion ≠ Correctness.** Before reporting ANY work done, prove it:
>
> 1. **Grep every removed name.** Extraction/rename/delete touched N files? Grep confirms 0 dangling refs across ALL file types.
> 2. **Ask WHY before changing.** Existing values are intentional until proven otherwise. No "fix" without traced rationale.
> 3. **Verify ALL outputs.** One build passing ≠ all builds passing. Check every affected stack.
> 4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
> 5. **New artifact = wired artifact.** Created something? Prove it's registered, imported, and reachable by all consumers.

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST** READ the following files before starting:

<!-- SYNC:evidence-based-reasoning:reminder -->

- **MUST** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
  <!-- /SYNC:evidence-based-reasoning:reminder -->
  <!-- SYNC:design-patterns-quality:reminder -->
- **MUST** check DRY via OOP (same-suffix → base class), right responsibility (lowest layer), SOLID. Grep for dangling refs after changes.
  <!-- /SYNC:design-patterns-quality:reminder -->
  <!-- SYNC:double-round-trip-review:reminder -->
- **MUST** execute TWO review rounds. Round 2 re-reads from scratch — never skip or combine with Round 1.
  <!-- /SYNC:double-round-trip-review:reminder -->
  <!-- SYNC:rationalization-prevention:reminder -->
- **MUST** follow ALL steps regardless of perceived simplicity. "Too simple to plan" is an evasion, not a reason.
  <!-- /SYNC:rationalization-prevention:reminder -->
  <!-- SYNC:graph-assisted-investigation:reminder -->
- **MUST** run at least ONE graph command on key files when graph.db exists. Pattern: grep → graph trace → grep verify.
  <!-- /SYNC:graph-assisted-investigation:reminder -->
  <!-- SYNC:logic-and-intention-review:reminder -->
- **MUST** verify every changed file serves stated purpose. Trace happy + error paths. Flag scope creep.
  <!-- /SYNC:logic-and-intention-review:reminder -->
  <!-- SYNC:bug-detection:reminder -->
- **MUST** check null safety, boundary conditions, error handling, resource management for every review.
  <!-- /SYNC:bug-detection:reminder -->
  <!-- SYNC:test-spec-verification:reminder -->
- **MUST** map every changed function/endpoint to a TC-{FEAT}-{NNN}. Flag gaps, recommend `/tdd-spec`.
      <!-- /SYNC:test-spec-verification:reminder -->
