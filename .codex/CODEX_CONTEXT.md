<!-- PROMPT-PROTOCOLS:START -->

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

## Prompt Protocol Mirror (Auto-Synced, Primacy Anchor)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.

---

## SYNC:rationalization-prevention

> **Rationalization Prevention** — AI skips steps via these evasions. Recognize and reject:
>
> | Evasion                      | Rebuttal                                                      |
> | ---------------------------- | ------------------------------------------------------------- |
> | "Too simple for a plan"      | Simple + wrong assumptions = wasted time. Plan anyway.        |
> | "I'll test after"            | RED before GREEN. Write/verify test first.                    |
> | "Already searched"           | Show grep evidence with `file:line`. No proof = no search.    |
> | "Just do it"                 | Still need task tracking. Skip depth, never skip tracking.    |
> | "Just a small fix"           | Small fix in wrong location cascades. Verify file:line first. |
> | "Code is self-explanatory"   | Future readers need evidence trail. Document anyway.          |
> | "Combine steps to save time" | Combined steps dilute focus. Each step has distinct purpose.  |

---

## SYNC:output-quality-principles

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — AI can `grep | wc -l`. Counts go stale instantly
> 2. No directory trees — AI can `glob`/`ls`. Use 1-line path conventions
> 3. No TOCs — AI reads linearly. TOC wastes tokens
> 4. No examples that repeat what rules say — one example only if non-obvious
> 5. Lead with answer, not reasoning. Skip filler words and preamble
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end, if any

---

## SYNC:graph-assisted-investigation

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

---

## SYNC:cross-service-check

> **Cross-Service Check** — Microservices/event-driven: MANDATORY before concluding investigation, plan, spec, or feature doc. Missing downstream consumer = silent regression.
>
> | Boundary            | Grep terms                                                                      |
> | ------------------- | ------------------------------------------------------------------------------- |
> | Event producers     | `Publish`, `Dispatch`, `Send`, `emit`, `EventBus`, `outbox`, `IntegrationEvent` |
> | Event consumers     | `Consumer`, `EventHandler`, `Subscribe`, `@EventListener`, `inbox`              |
> | Sagas/orchestration | `Saga`, `ProcessManager`, `Choreography`, `Workflow`, `Orchestrator`            |
> | Sync service calls  | HTTP/gRPC calls to/from other services                                          |
> | Shared contracts    | OpenAPI spec, proto, shared DTO — flag breaking changes                         |
> | Data ownership      | Other service reads/writes same table/collection → Shared-DB anti-pattern       |
>
> **Per touchpoint:** owner service · message name · consumers · risk (NONE / ADDITIVE / BREAKING).
>
> **BLOCKED until:** Producers scanned · Consumers scanned · Sagas checked · Contracts reviewed · Breaking-change risk flagged

---

## SYNC:cross-service-check:reminder

**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

---

## SYNC:root-cause-debugging

> **Root Cause Debugging** — Systematic approach, never guess-and-check.
>
> 1. **Reproduce** — Confirm the issue exists with evidence (error message, stack trace, screenshot)
> 2. **Isolate** — Narrow to specific file/function/line using binary search + graph trace
> 3. **Trace** — Follow data flow from input to failure point. Read actual code, don't infer.
> 4. **Hypothesize** — Form theory with confidence %. State what evidence supports/contradicts it
> 5. **Verify** — Test hypothesis with targeted grep/read. One variable at a time.
> 6. **Fix** — Address root cause, not symptoms. Verify fix doesn't break callers via graph `connections`
>
> **NEVER:** Guess without evidence. Fix symptoms instead of cause. Skip reproduction step.

---

## SYNC:end-to-start-debugger-trace

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and the lowest shared point that protects all downstream consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

---

## SYNC:end-to-start-debugger-trace:reminder

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

---

## SYNC:scan-and-update-reference-doc

> **Scan & Update Reference Doc** — Surgical updates only, never full rewrite.
>
> 1. **Read existing doc** first — understand current structure and manual annotations
> 2. **Detect mode:** Placeholder (only headings, no content) → Init mode. Has content → Sync mode.
> 3. **Scan codebase** for current state (grep/glob for patterns, counts, file paths)
> 4. **Diff** findings vs doc content — identify stale sections only
> 5. **Update ONLY** sections where code diverged from doc. Preserve manual annotations.
> 6. **Update metadata** (date, counts, version) in frontmatter or header
> 7. **NEVER** rewrite entire doc. NEVER remove sections without evidence they're obsolete.

---

## SYNC:red-flag-stop-conditions

> **Red Flag Stop Conditions** — STOP and escalate to user via ask the user directly when:
>
> 1. Confidence drops below 60% on any critical decision
> 2. Changes would affect >20 files (blast radius too large)
> 3. Cross-service boundary is being crossed
> 4. Security-sensitive code (auth, crypto, PII handling)
> 5. Breaking change detected (interface, API contract, DB schema)
> 6. Test coverage would decrease after changes
> 7. Approach requires technology/pattern not in the project
>
> **NEVER proceed past a red flag without explicit user approval.**

---

## SYNC:double-round-trip-review

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass finds no issues. **A clean review ENDS the loop — no further rounds required.**
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **Issues found (FAIL, or any non-zero findings)** → run the active review skill's findings-validation gate first; for review skills the default gate is `$why-review --validate-findings <report-path>`. Fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `spawn_agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision: clean → END; issues → validate findings → fix → restart from the first review phase. Continue until a complete review pass finds zero issues. If the same validated finding repeats for 3 full invocations with no progress, or a fix requires product/owner input, escalate via a direct user question.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review — no mandatory Round 2
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - No arbitrary sub-agent-round cap replaces the clean-review requirement; use the 3 repeated-no-progress blocker rule only to avoid infinite spinning
> - Track recursive invocation count and repeated blockers in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed.**

---

## SYNC:logic-and-intention-review

> **Logic & Intention Review** — Verify WHAT code does matches WHY it was changed.
>
> 1. **Change Intention Check:** Every changed file MUST ATTENTION serve the stated purpose. Flag unrelated changes as scope creep.
> 2. **Happy Path Trace:** Walk through one complete success scenario through changed code
> 3. **Error Path Trace:** Walk through one failure/edge case scenario through changed code
> 4. **Acceptance Mapping:** If plan context available, map every acceptance criterion to a code change
> 5. **Tests Verify Intent:** For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
> 6. **Migration Test Exclusion:** Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
>
> **NEVER mark review PASS without completing both traces (happy + error path).**

---

## SYNC:behavioral-delta-matrix

> **Behavioral Delta Matrix** — MANDATORY for bugfix reviews. Produce this table BEFORE PASS/FAIL verdict. Narrative descriptions don't substitute.
>
> | Input state | Pre-fix behavior   | Post-fix behavior | Delta                                |
> | ----------- | ------------------ | ----------------- | ------------------------------------ |
> | {condition} | {current behavior} | {fixed behavior}  | Preserved ✓ / Fixed ✓ / REGRESSION ✗ |
>
> **Rules:** ≥3 rows · ≥1 row the bug report did NOT mention · REGRESSION delta → FAIL until a preservation test covers it (`spec-tests-template.md#preservation-tests-mandatory-for-bugfix-specs`)
>
> **BLOCKED until:** ≥3 rows · ≥1 row outside bug report · no unmitigated REGRESSION

---

## SYNC:bug-detection

> **Bug Detection** — MUST ATTENTION check categories 1-4 for EVERY review. Never skip.
>
> 1. **Null Safety:** Can params/returns be null? Are they guarded? Optional chaining gaps? `.find()` returns checked?
> 2. **Boundary Conditions:** Off-by-one (`<` vs `<=`)? Empty collections handled? Zero/negative values? Max limits?
> 3. **Error Handling:** Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
> 4. **Resource Management:** Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
> 5. **Concurrency (if async):** Missing `await`? Race conditions on shared state? Stale closures? Retry storms?
> 6. **Stack-Specific:** Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
>
> **Classify:** CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO

---

## SYNC:test-spec-verification

> **Test Spec Verification** — Map changed code to test specifications.
>
> 1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
> 2. Every changed code path MUST ATTENTION map to a corresponding test case/spec (or flag as "needs test case")
> 3. New functions/endpoints/handlers → flag for test spec creation
> 4. Migration files are excluded from TC/test creation; schema/data migrations are one-time execution paths, not core application logic.
> 5. If spec evidence fields exist, verify they point to actual code (`file:line`, not stale references)
> 6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
> 7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
> 8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
>
> **NEVER skip test mapping.** Untested code paths are the #1 source of production bugs.

---

## SYNC:integration-test-sync-check

> **Integration Test Sync Check** — Verify changed business logic files have corresponding tests.
>
> 1. From changed files → identify **business logic files**: handlers, commands, queries, services, controllers, resolvers, event processors. Naming varies by stack — infer from project conventions (e.g., `*Service.*`, `*Handler.*`, `*Controller.*`, `*Command.*`, `*Query.*`, `*Resolver.*`). Exclude migration files: schema/data migrations are one-time execution paths, not core application logic.
> 2. For each identified file → search for a corresponding test file. Infer test naming from existing tests in the project (e.g., `*.test.ts`, `*Tests.java`, `*_test.py`, `*.spec.js`, `*Tests.cs`). Check standard test directories (`tests/`, `spec/`, `__tests__/`, or adjacent test projects/packages).
> 3. If test EXISTS → check if test methods cover changed behavior (new methods/parameters/logic paths)
> 4. If test MISSING → **MANDATORY**: use a direct user question: "Business logic file `{file}` has no integration tests — run `$integration-test` before proceeding, or confirm tests already written?" Options: "Run `$integration-test` first" (Recommended) | "Tests already written/updated — proceed"
> 5. Severity: **HIGH** — missing tests for changed business logic MUST be surfaced to the user; do NOT silently flag and continue
>
> **Surface every business-logic change that lacks test coverage for an explicit a direct user question decision — never silently skip. — why: a silent skip ships untested business logic to production.**

---

## SYNC:iterative-phase-quality

> **Iterative Phase Quality** — Score complexity BEFORE planning.
>
> **Complexity signals:** >5 files +2, cross-service +3, new pattern +2, DB migration +2
> **Score >=6 →** MUST ATTENTION decompose into phases. Each phase:
>
> - ≤5 files modified
> - ≤3h effort
> - Follows cycle: plan → implement → review → fix → verify
> - Start Phase N+1 only after Phase N passes VERIFY — why: building on an unverified phase compounds errors downstream
>
> **Phase success = all TCs pass + code-reviewer agent approves + no CRITICAL findings.**

---

## SYNC:design-patterns-quality

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

---

## SYNC:complexity-prevention

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

---

## SYNC:plan-granularity

> **Plan Granularity** — Every phase must pass 5-point check before implementation:
>
> 1. Lists exact file paths to modify (not generic "implement X")
> 2. No planning verbs (research, investigate, analyze, determine, figure out)
> 3. Steps ≤30min each, phase total ≤3h
> 4. ≤5 files per phase
> 5. No open decisions or TBDs in approach
>
> **Failing phases →** create sub-plan. Repeat until ALL leaf phases pass (max depth: 3).
> **Self-question:** "Can I start coding RIGHT NOW? If any step needs 'figuring out' → sub-plan it."

---

## SYNC:preservation-inventory

> **Preservation Inventory** — MANDATORY for bugfix plans. Trigger keywords in plan title/frontmatter: `fix`, `bug`, `regression`, `broken`, `defect`. Author MUST produce this table BEFORE writing implementation steps.
>
> **Columns:** `Invariant | file:line | Why (data consequence if broken) | Verification (TC-ID or grep)`
>
> **BLOCKED until:** ≥3 rows · every File cell has `file:line` · every Verification cell has TC-ID or grep (not "manually verify")

---

## SYNC:cross-cutting-quality

> **Cross-Cutting Quality** — Check across all changed files:
>
> 1. **Error handling consistency** — same error patterns across related files
> 2. **Logging** — structured logging with correlation IDs for traceability
> 3. **Security** — no hardcoded secrets, input validation at boundaries, auth checks present
> 4. **Performance** — no N+1 queries, unnecessary allocations, or blocking calls in async paths
> 5. **Observability** — health checks, metrics, tracing spans for new endpoints

---

## SYNC:scaffold-production-readiness

> **Scaffold Production Readiness** — Every scaffolded project MUST ATTENTION include 5 foundations:
>
> 1. **Code Quality Tooling** — linting, formatting, pre-commit hooks, CI gates. Specific tool choices → `docs/project-reference/` or `project-config.json`.
> 2. **Error Handling Foundation** — HTTP interceptor, error classification (4xx/5xx taxonomy), user notification, global uncaught handler.
> 3. **Loading State Management** — counter-based tracker (not boolean toggle), skip-token for background requests, 300ms flicker guard.
> 4. **Docker Development Environment** — compose profiles (`dev`/`test`/`infra`), multi-stage Dockerfile, health checks on all services, non-root production user.
> 5. **Integration Points** — document each outbound boundary; configure retry + circuit breaker + timeout; integration tests for happy path and failure path.
>
> **BLOCK `$cook` if any foundation is unchecked.** Present 2-3 options per concern via a direct user question before implementing.

---

## SYNC:harness-setup

> **Harness Engineering** — An outer agent harness has two jobs: raise first-attempt quality + provide self-correction feedback loops before human review.
>
> **Controls split:**
>
> | Axis        | Type          | Examples                                                                      | Frequency        |
> | ----------- | ------------- | ----------------------------------------------------------------------------- | ---------------- |
> | Feedforward | Computational | `.editorconfig`, strict compiler flags, enforced module boundaries            | Always-on        |
> | Feedforward | Inferential   | `CLAUDE.md` conventions, skill prompts, architecture notes, pattern catalogs  | Always-on        |
> | Feedback    | Computational | Linters, type checks, pre-commit hooks, ArchUnit/arch-fitness tests, CI gates | Pre-commit → CI  |
> | Feedback    | Inferential   | `$code-review` skill, `$sre-review`, `$security-review`, LLM-as-judge passes  | Post-commit → CI |
>
> **Three harness types:**
>
> 1. **Maintainability** — Complexity, duplication, coverage, style. Easiest: rich deterministic tooling.
> 2. **Architecture fitness** — Module boundaries, dependency direction, performance budgets, observability conventions.
> 3. **Behaviour** — Functional correctness. Hardest: requires approved fixtures or strong spec-first discipline.
>
> **Keep quality left:** pre-commit sensors fire first (cheap), CI sensors fire second, post-review last (expensive).
>
> **Research-driven:** Never hardcode tool choices. Detect tech stack → research ecosystem → present top 2-3 options → user decides. Enforce strictest defaults; loosen only with explicit approval.
>
> **Harnessability signals:** Strong typing, explicit module boundaries, opinionated frameworks = easier to harness. Treat these as greenfield architectural choices, not just style preferences.

---

## SYNC:two-stage-task-review

> **Two-Stage Task Review** — Both stages MUST ATTENTION complete before marking task done.
>
> **Stage 1: Self-review** — Immediately after implementation:
>
> - Requirements met? No regressions? Code quality acceptable?
>
> **Stage 2: Cross-review** — Via `code-reviewer` subagent:
>
> - Catches blind spots, convention drift, missed edge cases
>
> **NEVER skip Stage 2.** Self-review alone misses 40%+ of issues.

---

## SYNC:web-research

> **Web Research** — Structured web search for evidence gathering.
>
> 1. Form 3-5 specific search queries (not generic questions)
> 2. Use WebSearch for each query, collect top 3-5 sources
> 3. Validate source credibility (official docs > blogs > forums)
> 4. Cross-validate claims across 2+ sources before citing
> 5. Write findings to research report with source URLs
>
> **NEVER cite a single source as authoritative. Always cross-validate.**

---

## SYNC:graph-impact-analysis

> **Graph Impact Analysis** — When `.code-graph/graph.db` exists, run `blast-radius --json` to detect ALL files affected by changes (7 edge types: CALLS, MESSAGE_BUS, API_ENDPOINT, TRIGGERS_EVENT, PRODUCES_EVENT, TRIGGERS_COMMAND_EVENT, INHERITS). Compute gap: impacted_files - changed_files = potentially stale files. Risk: <5 Low, 5-20 Medium, >20 High. Use `trace --direction downstream` for deep chains on high-impact files.

---

## SYNC:ui-wireframe

> **UI Wireframe** — Process visual design input (Figma URLs, screenshots, wireframes) via appropriate tool BEFORE creating wireframes. Use box-drawing ASCII characters for spatial layout. Classify every component into exactly ONE tier: Common (cross-app reusable) / Domain-Shared (cross-domain) / Page (single-page). Duplicate UI code = wrong tier. Search existing component libraries before creating new (>=80% match = reuse). Detail level varies by skill (idea=rough, story=full decomposition).

---

## SYNC:ui-wireframe-protocol

> **UI Wireframe Protocol** — Wireframe-to-implementation flow: (1) Process design input (Figma/screenshot/sketch via visual analysis tooling). (2) Create ASCII wireframe with box-drawing chars. (3) Build component inventory with tier classification (Common/Domain-Shared/Page). (4) Document states (Default/Loading/Empty/Error). (5) Map to design tokens. (6) Define responsive breakpoints. Search existing component libraries before creating new. Progressive detail by skill level (idea=sketch, story=full tree+specs).

---

## SYNC:knowledge-graph-template

> **Knowledge Graph Template** — For each analyzed file, document: filePath, type (entity, command, query, event handler, controller, consumer, component, store, service, or repository-specific equivalent), architecturalPattern, content summary, symbols, dependencies, businessContext, referenceFiles, relevanceScore (1-10), evidenceLevel (verified/inferred), abstractions, and moduleContext. Investigation fields: entryPoints, outputPoints, dataTransformations, errorScenarios. Messaging fields: messageName, messageProducers, crossBoundaryIntegration. UI fields: componentHierarchy, stateManagementStores, dataBindingPatterns, validationStrategies.

---

## SYNC:module-detection

> **Module Detection** — Detect target module from PBI/idea keywords. Match against `docs/specs/` directory names. Load `docs/specs/{module}/` context for domain rules. If ambiguous, ask user. Module list derived from codebase — do NOT hardcode.

---

## SYNC:ba-team-decision-model

> **BA Team Decision Model** — 2/3 majority vote: Dev BA PIC + UX BA + Designer BA per squad. 2 of 3 agree = decision final. 3-way split = escalate to full squad + Tech Leads + Engineering Manager.
>
> **Technical Veto:** Dev BA PIC can unilaterally veto on: architecture feasibility, dependency correctness, cross-service impact, performance, security. CANNOT veto: UI/UX design, visual design, business value, user research.
>
> **Rules:** Disagree-and-commit after vote. Grooming override requires >75% non-BA squad vote. Record decisions in PBI Validation Summary (member, role, vote, notes).
>
> **Escalation:** Tech uncertainty → Engineering Manager. Business value → PO. Design feasibility → UX BA + Designer BA consensus.

---

## SYNC:refinement-dor-checklist

> **Refinement DoR Checklist** — ALL 7 criteria MUST ATTENTION pass before grooming:
>
> 1. **User story template** — "As a {role}, I want {goal}, so that {benefit}" format
> 2. **AC testable & unambiguous** — GIVEN/WHEN/THEN. No "should/might/TBD/various/appropriate". Min 3 scenarios (happy, edge, error) + 1 auth scenario
> 3. **Wireframes attached** — UI features: `## UI Layout` with wireframe + components + states + tokens. Backend-only: explicit "N/A"
> 4. **UI design ready** — Visual design + component decomposition tree. Backend-only: "N/A"
> 5. **AI pre-review passed** — `$review-artifact --type=pbi` or `$pbi-challenge` returned PASS or WARN (not FAIL)
> 6. **Story points estimated** — Fibonacci 1-21 + complexity (Low/Medium/High). >13 SP → recommend split
> 7. **Dependencies table complete** — Dependency, Type (must-before/can-parallel/blocked-by/independent), Status
>
> **Failure fixes:** Vague AC → specify exact CRUD + roles. Missing auth → add roles × CRUD table. No wireframes → UX BA creates. TBD in AC → replace with decision.

---

## SYNC:graph-intelligence-queries

> **Graph Intelligence Queries** — CLI: `python .claude/scripts/code_graph {cmd} --json`. Use `--node-mode file` first (less noise), then `function` for detail.
>
> | Find                    | Command                                      |
> | ----------------------- | -------------------------------------------- |
> | All callers of function | `query callers_of <fn>`                      |
> | All importers of module | `query importers_of <mod>`                   |
> | Tests covering function | `query tests_for <fn>`                       |
> | Class hierarchy         | `query inheritors_of <class>`                |
> | Full connection network | `connections <file>`                         |
> | Multi-file batch        | `batch-query <f1> <f2>`                      |
> | Full system flow (BFS)  | `trace <file> --direction both --depth 3`    |
> | Find node by keyword    | `search <keyword> --kind Function --limit 5` |
> | Shortest path           | `find-path <source> <target>`                |
>
> **Orchestration:** grep → graph → grep (find files → expand network → verify). Iterative grep↔graph is encouraged.

---

## SYNC:design-system-check

> **Design System Check** — Before ANY frontend work, read docs relevant to task type:
>
> 1. `docs/project-reference/design-system/README.md` — tokens, components, icons, themes
> 2. `docs/project-reference/frontend-patterns-reference.md` — base classes, stores, forms, API services
> 3. `docs/project-reference/scss-styling-guide.md` — BEM, SCSS vars, mixins, responsive
>
> App-specific paths: check `docs/project-config.json` → `designSystem.appMappings[]` and `contextGroups[]`.

---

## SYNC:project-reference-docs-guide

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

---

## SYNC:project-reference-docs-guide:reminder

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.

---

## SYNC:shared-protocol-duplication-policy

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first, then grep `SYNC:protocol-name` and update all occurrences.

---

## SYNC:fresh-context-review

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `$cook`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `spawn_agent` tool calls — use `code-reviewer` agent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues (no fixes = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `spawn_agent` call
> - Continue until a complete full review pass has zero findings; if the same blocker repeats 3 times with no progress, escalate via a direct user question
> - Track iteration count and repeated blockers in conversation context (session-scoped, no persistent files)

---

## SYNC:review-protocol-injection

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 10 protocol blocks VERBATIM. The template below has ALL 10 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 10 protocol bodies pre-embedded.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} review",
  agent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Classify: CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO.

### Design Patterns Quality
Priority checks for every code change:
1. DRY via OOP: Same-suffix classes (*Entity, *Dto, *Service) MUST share base class. 3+ similar patterns → extract to shared abstraction.
2. Right Responsibility: Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
3. SOLID: Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
5. Tests Verify Intent: For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
6. Migration Test Exclusion: Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
2. Every changed code path MUST map to a corresponding test case/spec (or flag as "needs test case").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Migration files are excluded from test/spec creation; schema/data migrations are one-time execution paths, not core application logic.
5. If spec evidence fields exist, verify they point to actual code (file:line, not stale references).
6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
NEVER fix at the crash site. Trace the full flow, fix at the owning layer. The crash site is a SYMPTOM, not the cause.
MANDATORY before ANY fix:
1. Trace full data flow — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where bad state ENTERS, not where it CRASHES.
2. Identify the invariant owner — Which layer's contract guarantees this value is valid? Fix at the LOWEST layer that owns the invariant, not the highest layer that consumes it.
3. One fix, maximum protection — If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
4. Verify no bypass paths — Confirm all data flows through the fix point. Check for direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
BLOCKED until: Full data flow traced (origin → crash); Invariant owner identified with file:line evidence; All access sites audited (grep count); Fix layer justified (lowest layer that protects most consumers).
Anti-patterns (REJECT): "Fix it where it crashes" (crash site ≠ cause site, trace upstream); "Add defensive checks at every consumer" (scattered defense = wrong layer); "Both fix is safer" (pick ONE authoritative layer).

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need task tracking. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation
MANDATORY when .code-graph/graph.db exists.
HARD-GATE: MUST run at least ONE graph command on key files before concluding any investigation.
Pattern: Grep finds files → trace --direction both reveals full system flow → Grep verifies details.
- Investigation/Scout: trace --direction both on 2-3 entry files
- Fix/Debug: callers_of on buggy function + tests_for
- Feature/Enhancement: connections on files to be modified
- Code Review: tests_for on changed functions
- Blast Radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Run python .claude/scripts/code_graph trace <file> --direction both --json when .code-graph/graph.db exists.
4. Map dependencies via connections or callers_of — know what depends on your target.
5. Write investigation to .ai/workspace/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Graph trace (if graph.db exists); Assumptions verified with evidence.

## Reference Docs (READ before reviewing)
- docs/project-reference/code-review-rules.md
- {skill-specific reference docs — e.g., integration-test-reference.md for integration-test-review; backend-patterns-reference.md for backend reviews; frontend-patterns-reference.md for frontend reviews}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to plans/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 10 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` agent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

---

## SYNC:repeatable-test-principle

> **Infinitely Repeatable Tests** — Tests MUST run N times without failure. Like manual QC — run the suite 100 times, each run just adds more data. Verification is only PASS after the relevant suite/project passes 3 consecutive runs without database reset.
>
> 1. **Unique data per run:** Use the project's unique ID generator for ALL entity IDs created in tests. NEVER hardcode IDs.
> 2. **Additive only:** Tests create data, never delete/reset. Prior test runs MUST NOT interfere with current run.
> 3. **No schema rollback dependency:** Tests work with current schema only. Never rely on schema rollback or migration reversals.
> 4. **Idempotent seeders:** Fixture-level seeders use create-if-missing pattern (check existence before insert). Test-level data uses unique IDs per execution.
> 5. **No cleanup required:** No teardown, no database reset between runs. Each test is isolated by unique seed data, not by cleanup.
> 6. **Unique names/codes:** When entities require unique names/codes, append a unique suffix using the project's ID generator.
> 7. **Migration code excluded:** Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.

---

## SYNC:fix-layer-accountability

> **Fix-Layer Accountability** — NEVER fix at the crash site. Trace the full flow, fix at the owning layer.
>
> AI default behavior: see error at Place A → fix Place A. This is WRONG. The crash site is a SYMPTOM, not the cause.
>
> **MANDATORY before ANY fix:**
>
> 1. **Trace full data flow** — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where the bad state ENTERS, not where it CRASHES.
> 2. **Identify the invariant owner** — Which layer's contract guarantees this value is valid? That layer is responsible. Fix at the LOWEST layer that owns the invariant — not the highest layer that consumes it.
> 3. **One fix, maximum protection** — Ask: "If I fix here, does it protect ALL downstream consumers with ONE change?" If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
> 4. **Verify no bypass paths** — Confirm all data flows through the fix point. Check for: direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
>
> **BLOCKED until:** `- [ ]` Full data flow traced (origin → crash) `- [ ]` Invariant owner identified with `file:line` evidence `- [ ]` All access sites audited (grep count) `- [ ]` Fix layer justified (lowest layer that protects most consumers)
>
> **Anti-patterns (REJECT these):**
>
> - "Fix it where it crashes" — Crash site ≠ cause site. Trace upstream.
> - "Add defensive checks at every consumer" — Scattered defense = wrong layer. One authoritative fix > many scattered guards.
> - "Both fix is safer" — Pick ONE authoritative layer. Redundant checks across layers send mixed signals about who owns the invariant.

---

## SYNC:context-engineering-principles

> **Context Engineering Principles** — Research-backed principles for prompt quality. Source: Anthropic prompt engineering guide, Stanford "lost-in-the-middle" research, 2025-2026 LLM context optimization studies.
>
> 1. **Primacy-Recency Effect** — LLM performance drops 15-47% for middle-context information (Stanford). AI attention peaks at first/last 10% of text. **Action:** Place the 3 most critical rules in both the first 5 lines AND the last 5 lines of every prompt. Queries at end improve quality by up to 30% (Anthropic).
> 2. **High-Signal Density** — Anthropic: _"Identify the smallest collection of high-signal tokens that maximize the probability of the desired outcome."_ **Action:** Every line should change AI behavior. If removing a line doesn't change output → cut it. Target ≥8 rules (MUST ATTENTION/NEVER/ALWAYS) per 100 lines.
> 3. **Context Rot** — LLM performance degrades as context length grows — even when all content is relevant. Compression (5-20x) maintains or improves accuracy while saving 70-94% tokens. **Action:** Compress aggressively. Shorter, denser prompts outperform longer, diluted ones.
> 4. **Structured > Prose** — Tables, bullets, XML/markdown parse faster than paragraphs. Constrained formats reduce error rates vs free-text. **Action:** Convert narrative to tables/bullets. Use markdown headers for semantic sections.
> 5. **RCCF Framework** — Modern LLMs (2025+) already know how to reason. What they need: **R**ole (personality), **C**ontext (grounding), **C**onstraints (guardrails), **F**ormat (structure). Constraints and format matter more than verbose instructions.
> 6. **Checkbox Avoidance** — `[ ]` syntax triggers mechanical compliance — AI ticks boxes without reasoning. Bullet rules force reading and evaluation. **Action:** Replace `- [ ] Check X` with `- MUST ATTENTION verify X`.
> 7. **Example Economy** — 3-5 examples optimal for few-shot; diminishing returns after. **Action:** 1 best example per pattern. Use BAD→GOOD pairs (2-3 lines each) for anti-patterns.
> 8. **Deferred Tool Loading** — Claude Code delays loading tool definitions when they exceed 10% of context window. **Action:** Keep injected docs well under 10% of context budget. Docs exceeding ~3,000 lines are too large for injection — split or compress.
> 9. **Rule Density Verification** — Post-optimization rule count (MUST ATTENTION/NEVER/ALWAYS) must be ≥ pre-optimization count. Compression should preserve or increase density, never decrease it. **Action:** Count before and after every optimization pass.
> 10. **Affirmative Directives** — Models comply with affirmative directives more reliably than prohibitions; a bare "don't X" leaves the correct action unspecified, so the model substitutes an arbitrary alternative. **Action:** State the action to take, not only the action to avoid. Keep `NEVER`/forbidden guardrails for hard invariants — but pair each with the right path ("Do X" not just "Don't do Y").
> 11. **Rationale-Carrying Instructions** — A rule shipped with its reason generalizes to edge cases the rule never enumerated and survives compression; a bare imperative gets misapplied or silently dropped. **Action:** Append a terse `— why: …` clause to every non-obvious rule. The reason names the failure prevented or outcome wanted — never restates the rule.

---

## SYNC:prompt-enhancement-transforms-base

> **Prompt Enhancement Transforms (Base)** — Transforms 1-3 are identical across all `$prompt-enhance` ops (`--op=compress|expand|enhance`). Transform 4 is per-op (conciseness pass for compress/enhance; structural clarity pass for expand) and stays local to each op branch.
>
> ### Transform 1: Inline Summaries for READ References
>
> **Problem:** AI sees `MUST ATTENTION READ file.md` and skips it.
> **Solution:** Add a 2-3 line summary of key rules BEFORE the read instruction.
>
> **Before:**
>
> ```
> MUST ATTENTION READ .claude/protocols/evidence.md
> ```
>
> **After:**
>
> ```
> > **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim requires `file:line` proof.
> > Confidence: >95% recommend freely, 80-94% with caveats, <80% DO NOT recommend.
>
> MUST ATTENTION READ .claude/protocols/evidence.md for full details.
> ```
>
> **Scope rules:**
>
> - `.claude/` protocol files → always add an inline summary (stable, belongs to framework)
> - `docs/project-reference/` files → NO inline summary (project-specific). Add: `(Claude may inject this via hooks; Codex must open this file directly using docs-index routing)`
>
> ### Transform 2: Top Summary Section
>
> Required structure (first 20 lines after frontmatter):
>
> ```markdown
> > **[IMPORTANT]** task tracking instruction...
>
> > **Protocol Name** — [inline summary]. MUST ATTENTION READ `path` for details.
>
> ## Quick Summary
>
> **Goal:** [One sentence — what this skill achieves AND the ultimate outcome it must cause]
>
> **Workflow:**
>
> 1. **[Step]** — [description]
>
> **Key Rules:**
>
> - [Most critical constraint]
> ```
>
> ### Transform 3: Bottom Closing Reminders
>
> Add at the very end of the file:
>
> ```markdown
> ---
>
> ## Closing Reminders
>
> **IMPORTANT MUST ATTENTION Goal:** [same goal as Quick Summary]
> **IMPORTANT MUST ATTENTION** [echo rule #1 from the top section]
> **IMPORTANT MUST ATTENTION** [echo rule #2]
> **IMPORTANT MUST ATTENTION** [echo rule #3]
> **IMPORTANT MUST ATTENTION** add a final review task to verify work quality
> ```
>
> Pick 3-5 rules AI most commonly violates. Bottom section re-anchors attention after the long middle.

---

## SYNC:subagent-return-contract

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.

---

## SYNC:incremental-persistence

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md`
> 2. **After each file/section reviewed:** Append findings to report immediately — never hold in memory
> 3. **Return to main agent:** Summary only (per SYNC:subagent-return-contract) with `Full report:` path
> 4. **Main agent:** Reads report file only when resolving specific blockers
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

---

## SYNC:task-tracking-external-report

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: plans/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

---

## SYNC:task-tracking-external-report:reminder

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

---

## SYNC:nested-task-creation

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

---

## SYNC:nested-task-creation:reminder

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

---

## SYNC:parallel-phase-advancement

> **Parallel-Phase Advancement (model-driven)** — How to run AND advance a declared parallel batch of workflow steps. Tool-agnostic: identical under Claude, Codex, and Copilot — none depends on a hook. Mirrors the universal context-file rule ("Workflow Step Advancement & Parallel Phases" in CLAUDE.md / AGENTS.md / copilot-instructions).
>
> 1. **Declare the group.** Name the members of the parallel phase up-front — which steps run together, and mark any conditional member with its trigger.
> 2. **Spawn ALL members in ONE message.** Dispatch every member together (multiple `spawn_agent`/sub-agent calls in a single response) — never drip them one per turn.
> 3. **Barrier — advance ONLY after EVERY member returns.** A member is "returned" when its work completes inline OR its sub-agent returns; a conditional member whose trigger is absent counts as returned. Do NOT advance, and do NOT start the next step, until the whole group has returned.
> 4. **A sub-agent return advances the step identically to an inline call.** Advancement is YOUR judgment against the task list — never wait for a hook or tool event. Mark each member `completed` (or "Skipped — <reason>") as the batch resolves.
> 5. **Mutating steps wait for the barrier.** Never start a code-mutating step (e.g. `code-simplifier`) until the full batch has returned — it must act on the complete review snapshot, not a partial one.
> 6. **Hooks are accelerators only.** Any step-tracking hook may emit a "next step" hint as an optimization; correctness MUST NOT depend on it. Codex and Copilot run with no hooks and advance entirely by this rule.
>
> **Blocked until:** `- [ ]` all members spawned in one message `- [ ]` every member returned (incl. skipped conditional) `- [ ]` each member marked completed/skipped `- [ ]` mutating step deferred until after the barrier.

---

## SYNC:critical-thinking-mindset

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

---

## SYNC:ai-mistake-prevention

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

---

## SYNC:source-test-drift-check

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

---

## SYNC:spec-drift-adjudication

> **Spec drift adjudication (code-wrong vs spec-stale).** Whenever changed behavior diverges from a canonical Feature Spec (business rule, acceptance criterion, flow, state transition, or §8 TC under `docs/specs/`), you MUST NOT silently pick a side. Adjudicate per `shared/sdd-artifact-contract.md` → **Drift Gates**:
>
> 1. **Detect** — compare the change against the spec's documented intent. No divergence → record `Spec in sync` and move on.
> 2. **Classify** the divergence:
>     - **CODE-WRONG** — the spec correctly states intended behavior and the change violates it → BLOCKING finding; fix the code/test against intended behavior (write/adjust a regression TC first).
>     - **SPEC-STALE** — the change is the new intended behavior and the spec now documents the old/wrong behavior → update the spec FIRST via `$spec [mode=update]`, then sync `$spec [mode=tests]` + `$spec [mode=sync]`.
>     - **AMBIGUOUS** — intended behavior is unclear → a direct user question (or the canonical spec owner) before editing either side.
> 3. **Never normalize drift just because code/tests are green** — green can encode the drift itself. Reconcile to canonical intent, never to whichever side currently passes.
>
> A behavior-changing review/implementation that leaves a spec divergence unadjudicated is INCOMPLETE.

---

## SYNC:sub-agent-selection

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** Route specialized domains (architecture, security, performance, DB, E2E, integration-test, git) to the matching specialist agent (see guide above) — NEVER use `code-reviewer` for these. — why: `code-reviewer` lacks each domain's checklist, so specialized issues slip through.

---

## SYNC:sequential-thinking-protocol

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <80% on any critical decision → escalate via ask the user directly · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).
>
> **Deep-dive:** see `$sequential-thinking` skill (`.claude/skills/sequential-thinking/SKILL.md`) for worked examples (API design, debugging, architecture), advanced techniques (spiral refinement, hypothesis testing, convergence), and meta-strategies (uncertainty handling, revision cascades).

---

## SYNC:sequential-thinking-protocol:reminder

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `$sequential-thinking` skill.

---

## SYNC:goal-contract-satisfaction-loop

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

---

## SYNC:goal-contract-satisfaction-loop:reminder

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

---

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.

---

## SYNC:rationalization-prevention

> **Rationalization Prevention** — AI skips steps via these evasions. Recognize and reject:
>
> | Evasion                      | Rebuttal                                                      |
> | ---------------------------- | ------------------------------------------------------------- |
> | "Too simple for a plan"      | Simple + wrong assumptions = wasted time. Plan anyway.        |
> | "I'll test after"            | RED before GREEN. Write/verify test first.                    |
> | "Already searched"           | Show grep evidence with `file:line`. No proof = no search.    |
> | "Just do it"                 | Still need task tracking. Skip depth, never skip tracking.    |
> | "Just a small fix"           | Small fix in wrong location cascades. Verify file:line first. |
> | "Code is self-explanatory"   | Future readers need evidence trail. Document anyway.          |
> | "Combine steps to save time" | Combined steps dilute focus. Each step has distinct purpose.  |

---

## SYNC:output-quality-principles

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — AI can `grep | wc -l`. Counts go stale instantly
> 2. No directory trees — AI can `glob`/`ls`. Use 1-line path conventions
> 3. No TOCs — AI reads linearly. TOC wastes tokens
> 4. No examples that repeat what rules say — one example only if non-obvious
> 5. Lead with answer, not reasoning. Skip filler words and preamble
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end, if any

---

## SYNC:graph-assisted-investigation

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

---

## SYNC:cross-service-check

> **Cross-Service Check** — Microservices/event-driven: MANDATORY before concluding investigation, plan, spec, or feature doc. Missing downstream consumer = silent regression.
>
> | Boundary            | Grep terms                                                                      |
> | ------------------- | ------------------------------------------------------------------------------- |
> | Event producers     | `Publish`, `Dispatch`, `Send`, `emit`, `EventBus`, `outbox`, `IntegrationEvent` |
> | Event consumers     | `Consumer`, `EventHandler`, `Subscribe`, `@EventListener`, `inbox`              |
> | Sagas/orchestration | `Saga`, `ProcessManager`, `Choreography`, `Workflow`, `Orchestrator`            |
> | Sync service calls  | HTTP/gRPC calls to/from other services                                          |
> | Shared contracts    | OpenAPI spec, proto, shared DTO — flag breaking changes                         |
> | Data ownership      | Other service reads/writes same table/collection → Shared-DB anti-pattern       |
>
> **Per touchpoint:** owner service · message name · consumers · risk (NONE / ADDITIVE / BREAKING).
>
> **BLOCKED until:** Producers scanned · Consumers scanned · Sagas checked · Contracts reviewed · Breaking-change risk flagged

---

## SYNC:cross-service-check:reminder

**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

---

## SYNC:root-cause-debugging

> **Root Cause Debugging** — Systematic approach, never guess-and-check.
>
> 1. **Reproduce** — Confirm the issue exists with evidence (error message, stack trace, screenshot)
> 2. **Isolate** — Narrow to specific file/function/line using binary search + graph trace
> 3. **Trace** — Follow data flow from input to failure point. Read actual code, don't infer.
> 4. **Hypothesize** — Form theory with confidence %. State what evidence supports/contradicts it
> 5. **Verify** — Test hypothesis with targeted grep/read. One variable at a time.
> 6. **Fix** — Address root cause, not symptoms. Verify fix doesn't break callers via graph `connections`
>
> **NEVER:** Guess without evidence. Fix symptoms instead of cause. Skip reproduction step.

---

## SYNC:end-to-start-debugger-trace

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and the lowest shared point that protects all downstream consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

---

## SYNC:end-to-start-debugger-trace:reminder

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

---

## SYNC:scan-and-update-reference-doc

> **Scan & Update Reference Doc** — Surgical updates only, never full rewrite.
>
> 1. **Read existing doc** first — understand current structure and manual annotations
> 2. **Detect mode:** Placeholder (only headings, no content) → Init mode. Has content → Sync mode.
> 3. **Scan codebase** for current state (grep/glob for patterns, counts, file paths)
> 4. **Diff** findings vs doc content — identify stale sections only
> 5. **Update ONLY** sections where code diverged from doc. Preserve manual annotations.
> 6. **Update metadata** (date, counts, version) in frontmatter or header
> 7. **NEVER** rewrite entire doc. NEVER remove sections without evidence they're obsolete.

---

## SYNC:red-flag-stop-conditions

> **Red Flag Stop Conditions** — STOP and escalate to user via ask the user directly when:
>
> 1. Confidence drops below 60% on any critical decision
> 2. Changes would affect >20 files (blast radius too large)
> 3. Cross-service boundary is being crossed
> 4. Security-sensitive code (auth, crypto, PII handling)
> 5. Breaking change detected (interface, API contract, DB schema)
> 6. Test coverage would decrease after changes
> 7. Approach requires technology/pattern not in the project
>
> **NEVER proceed past a red flag without explicit user approval.**

---

## SYNC:double-round-trip-review

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass finds no issues. **A clean review ENDS the loop — no further rounds required.**
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **Issues found (FAIL, or any non-zero findings)** → run the active review skill's findings-validation gate first; for review skills the default gate is `$why-review --validate-findings <report-path>`. Fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `spawn_agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision: clean → END; issues → validate findings → fix → restart from the first review phase. Continue until a complete review pass finds zero issues. If the same validated finding repeats for 3 full invocations with no progress, or a fix requires product/owner input, escalate via a direct user question.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review — no mandatory Round 2
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - No arbitrary sub-agent-round cap replaces the clean-review requirement; use the 3 repeated-no-progress blocker rule only to avoid infinite spinning
> - Track recursive invocation count and repeated blockers in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed.**

---

## SYNC:logic-and-intention-review

> **Logic & Intention Review** — Verify WHAT code does matches WHY it was changed.
>
> 1. **Change Intention Check:** Every changed file MUST ATTENTION serve the stated purpose. Flag unrelated changes as scope creep.
> 2. **Happy Path Trace:** Walk through one complete success scenario through changed code
> 3. **Error Path Trace:** Walk through one failure/edge case scenario through changed code
> 4. **Acceptance Mapping:** If plan context available, map every acceptance criterion to a code change
> 5. **Tests Verify Intent:** For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
> 6. **Migration Test Exclusion:** Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
>
> **NEVER mark review PASS without completing both traces (happy + error path).**

---

## SYNC:behavioral-delta-matrix

> **Behavioral Delta Matrix** — MANDATORY for bugfix reviews. Produce this table BEFORE PASS/FAIL verdict. Narrative descriptions don't substitute.
>
> | Input state | Pre-fix behavior   | Post-fix behavior | Delta                                |
> | ----------- | ------------------ | ----------------- | ------------------------------------ |
> | {condition} | {current behavior} | {fixed behavior}  | Preserved ✓ / Fixed ✓ / REGRESSION ✗ |
>
> **Rules:** ≥3 rows · ≥1 row the bug report did NOT mention · REGRESSION delta → FAIL until a preservation test covers it (`spec-tests-template.md#preservation-tests-mandatory-for-bugfix-specs`)
>
> **BLOCKED until:** ≥3 rows · ≥1 row outside bug report · no unmitigated REGRESSION

---

## SYNC:bug-detection

> **Bug Detection** — MUST ATTENTION check categories 1-4 for EVERY review. Never skip.
>
> 1. **Null Safety:** Can params/returns be null? Are they guarded? Optional chaining gaps? `.find()` returns checked?
> 2. **Boundary Conditions:** Off-by-one (`<` vs `<=`)? Empty collections handled? Zero/negative values? Max limits?
> 3. **Error Handling:** Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
> 4. **Resource Management:** Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
> 5. **Concurrency (if async):** Missing `await`? Race conditions on shared state? Stale closures? Retry storms?
> 6. **Stack-Specific:** Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
>
> **Classify:** CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO

---

## SYNC:test-spec-verification

> **Test Spec Verification** — Map changed code to test specifications.
>
> 1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
> 2. Every changed code path MUST ATTENTION map to a corresponding test case/spec (or flag as "needs test case")
> 3. New functions/endpoints/handlers → flag for test spec creation
> 4. Migration files are excluded from TC/test creation; schema/data migrations are one-time execution paths, not core application logic.
> 5. If spec evidence fields exist, verify they point to actual code (`file:line`, not stale references)
> 6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
> 7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
> 8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
>
> **NEVER skip test mapping.** Untested code paths are the #1 source of production bugs.

---

## SYNC:integration-test-sync-check

> **Integration Test Sync Check** — Verify changed business logic files have corresponding tests.
>
> 1. From changed files → identify **business logic files**: handlers, commands, queries, services, controllers, resolvers, event processors. Naming varies by stack — infer from project conventions (e.g., `*Service.*`, `*Handler.*`, `*Controller.*`, `*Command.*`, `*Query.*`, `*Resolver.*`). Exclude migration files: schema/data migrations are one-time execution paths, not core application logic.
> 2. For each identified file → search for a corresponding test file. Infer test naming from existing tests in the project (e.g., `*.test.ts`, `*Tests.java`, `*_test.py`, `*.spec.js`, `*Tests.cs`). Check standard test directories (`tests/`, `spec/`, `__tests__/`, or adjacent test projects/packages).
> 3. If test EXISTS → check if test methods cover changed behavior (new methods/parameters/logic paths)
> 4. If test MISSING → **MANDATORY**: use a direct user question: "Business logic file `{file}` has no integration tests — run `$integration-test` before proceeding, or confirm tests already written?" Options: "Run `$integration-test` first" (Recommended) | "Tests already written/updated — proceed"
> 5. Severity: **HIGH** — missing tests for changed business logic MUST be surfaced to the user; do NOT silently flag and continue
>
> **Surface every business-logic change that lacks test coverage for an explicit a direct user question decision — never silently skip. — why: a silent skip ships untested business logic to production.**

---

## SYNC:iterative-phase-quality

> **Iterative Phase Quality** — Score complexity BEFORE planning.
>
> **Complexity signals:** >5 files +2, cross-service +3, new pattern +2, DB migration +2
> **Score >=6 →** MUST ATTENTION decompose into phases. Each phase:
>
> - ≤5 files modified
> - ≤3h effort
> - Follows cycle: plan → implement → review → fix → verify
> - Start Phase N+1 only after Phase N passes VERIFY — why: building on an unverified phase compounds errors downstream
>
> **Phase success = all TCs pass + code-reviewer agent approves + no CRITICAL findings.**

---

## SYNC:design-patterns-quality

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

---

## SYNC:complexity-prevention

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

---

## SYNC:plan-granularity

> **Plan Granularity** — Every phase must pass 5-point check before implementation:
>
> 1. Lists exact file paths to modify (not generic "implement X")
> 2. No planning verbs (research, investigate, analyze, determine, figure out)
> 3. Steps ≤30min each, phase total ≤3h
> 4. ≤5 files per phase
> 5. No open decisions or TBDs in approach
>
> **Failing phases →** create sub-plan. Repeat until ALL leaf phases pass (max depth: 3).
> **Self-question:** "Can I start coding RIGHT NOW? If any step needs 'figuring out' → sub-plan it."

---

## SYNC:preservation-inventory

> **Preservation Inventory** — MANDATORY for bugfix plans. Trigger keywords in plan title/frontmatter: `fix`, `bug`, `regression`, `broken`, `defect`. Author MUST produce this table BEFORE writing implementation steps.
>
> **Columns:** `Invariant | file:line | Why (data consequence if broken) | Verification (TC-ID or grep)`
>
> **BLOCKED until:** ≥3 rows · every File cell has `file:line` · every Verification cell has TC-ID or grep (not "manually verify")

---

## SYNC:cross-cutting-quality

> **Cross-Cutting Quality** — Check across all changed files:
>
> 1. **Error handling consistency** — same error patterns across related files
> 2. **Logging** — structured logging with correlation IDs for traceability
> 3. **Security** — no hardcoded secrets, input validation at boundaries, auth checks present
> 4. **Performance** — no N+1 queries, unnecessary allocations, or blocking calls in async paths
> 5. **Observability** — health checks, metrics, tracing spans for new endpoints

---

## SYNC:scaffold-production-readiness

> **Scaffold Production Readiness** — Every scaffolded project MUST ATTENTION include 5 foundations:
>
> 1. **Code Quality Tooling** — linting, formatting, pre-commit hooks, CI gates. Specific tool choices → `docs/project-reference/` or `project-config.json`.
> 2. **Error Handling Foundation** — HTTP interceptor, error classification (4xx/5xx taxonomy), user notification, global uncaught handler.
> 3. **Loading State Management** — counter-based tracker (not boolean toggle), skip-token for background requests, 300ms flicker guard.
> 4. **Docker Development Environment** — compose profiles (`dev`/`test`/`infra`), multi-stage Dockerfile, health checks on all services, non-root production user.
> 5. **Integration Points** — document each outbound boundary; configure retry + circuit breaker + timeout; integration tests for happy path and failure path.
>
> **BLOCK `$cook` if any foundation is unchecked.** Present 2-3 options per concern via a direct user question before implementing.

---

## SYNC:harness-setup

> **Harness Engineering** — An outer agent harness has two jobs: raise first-attempt quality + provide self-correction feedback loops before human review.
>
> **Controls split:**
>
> | Axis        | Type          | Examples                                                                      | Frequency        |
> | ----------- | ------------- | ----------------------------------------------------------------------------- | ---------------- |
> | Feedforward | Computational | `.editorconfig`, strict compiler flags, enforced module boundaries            | Always-on        |
> | Feedforward | Inferential   | `CLAUDE.md` conventions, skill prompts, architecture notes, pattern catalogs  | Always-on        |
> | Feedback    | Computational | Linters, type checks, pre-commit hooks, ArchUnit/arch-fitness tests, CI gates | Pre-commit → CI  |
> | Feedback    | Inferential   | `$code-review` skill, `$sre-review`, `$security-review`, LLM-as-judge passes  | Post-commit → CI |
>
> **Three harness types:**
>
> 1. **Maintainability** — Complexity, duplication, coverage, style. Easiest: rich deterministic tooling.
> 2. **Architecture fitness** — Module boundaries, dependency direction, performance budgets, observability conventions.
> 3. **Behaviour** — Functional correctness. Hardest: requires approved fixtures or strong spec-first discipline.
>
> **Keep quality left:** pre-commit sensors fire first (cheap), CI sensors fire second, post-review last (expensive).
>
> **Research-driven:** Never hardcode tool choices. Detect tech stack → research ecosystem → present top 2-3 options → user decides. Enforce strictest defaults; loosen only with explicit approval.
>
> **Harnessability signals:** Strong typing, explicit module boundaries, opinionated frameworks = easier to harness. Treat these as greenfield architectural choices, not just style preferences.

---

## SYNC:two-stage-task-review

> **Two-Stage Task Review** — Both stages MUST ATTENTION complete before marking task done.
>
> **Stage 1: Self-review** — Immediately after implementation:
>
> - Requirements met? No regressions? Code quality acceptable?
>
> **Stage 2: Cross-review** — Via `code-reviewer` subagent:
>
> - Catches blind spots, convention drift, missed edge cases
>
> **NEVER skip Stage 2.** Self-review alone misses 40%+ of issues.

---

## SYNC:web-research

> **Web Research** — Structured web search for evidence gathering.
>
> 1. Form 3-5 specific search queries (not generic questions)
> 2. Use WebSearch for each query, collect top 3-5 sources
> 3. Validate source credibility (official docs > blogs > forums)
> 4. Cross-validate claims across 2+ sources before citing
> 5. Write findings to research report with source URLs
>
> **NEVER cite a single source as authoritative. Always cross-validate.**

---

## SYNC:graph-impact-analysis

> **Graph Impact Analysis** — When `.code-graph/graph.db` exists, run `blast-radius --json` to detect ALL files affected by changes (7 edge types: CALLS, MESSAGE_BUS, API_ENDPOINT, TRIGGERS_EVENT, PRODUCES_EVENT, TRIGGERS_COMMAND_EVENT, INHERITS). Compute gap: impacted_files - changed_files = potentially stale files. Risk: <5 Low, 5-20 Medium, >20 High. Use `trace --direction downstream` for deep chains on high-impact files.

---

## SYNC:ui-wireframe

> **UI Wireframe** — Process visual design input (Figma URLs, screenshots, wireframes) via appropriate tool BEFORE creating wireframes. Use box-drawing ASCII characters for spatial layout. Classify every component into exactly ONE tier: Common (cross-app reusable) / Domain-Shared (cross-domain) / Page (single-page). Duplicate UI code = wrong tier. Search existing component libraries before creating new (>=80% match = reuse). Detail level varies by skill (idea=rough, story=full decomposition).

---

## SYNC:ui-wireframe-protocol

> **UI Wireframe Protocol** — Wireframe-to-implementation flow: (1) Process design input (Figma/screenshot/sketch via visual analysis tooling). (2) Create ASCII wireframe with box-drawing chars. (3) Build component inventory with tier classification (Common/Domain-Shared/Page). (4) Document states (Default/Loading/Empty/Error). (5) Map to design tokens. (6) Define responsive breakpoints. Search existing component libraries before creating new. Progressive detail by skill level (idea=sketch, story=full tree+specs).

---

## SYNC:knowledge-graph-template

> **Knowledge Graph Template** — For each analyzed file, document: filePath, type (entity, command, query, event handler, controller, consumer, component, store, service, or repository-specific equivalent), architecturalPattern, content summary, symbols, dependencies, businessContext, referenceFiles, relevanceScore (1-10), evidenceLevel (verified/inferred), abstractions, and moduleContext. Investigation fields: entryPoints, outputPoints, dataTransformations, errorScenarios. Messaging fields: messageName, messageProducers, crossBoundaryIntegration. UI fields: componentHierarchy, stateManagementStores, dataBindingPatterns, validationStrategies.

---

## SYNC:module-detection

> **Module Detection** — Detect target module from PBI/idea keywords. Match against `docs/specs/` directory names. Load `docs/specs/{module}/` context for domain rules. If ambiguous, ask user. Module list derived from codebase — do NOT hardcode.

---

## SYNC:ba-team-decision-model

> **BA Team Decision Model** — 2/3 majority vote: Dev BA PIC + UX BA + Designer BA per squad. 2 of 3 agree = decision final. 3-way split = escalate to full squad + Tech Leads + Engineering Manager.
>
> **Technical Veto:** Dev BA PIC can unilaterally veto on: architecture feasibility, dependency correctness, cross-service impact, performance, security. CANNOT veto: UI/UX design, visual design, business value, user research.
>
> **Rules:** Disagree-and-commit after vote. Grooming override requires >75% non-BA squad vote. Record decisions in PBI Validation Summary (member, role, vote, notes).
>
> **Escalation:** Tech uncertainty → Engineering Manager. Business value → PO. Design feasibility → UX BA + Designer BA consensus.

---

## SYNC:refinement-dor-checklist

> **Refinement DoR Checklist** — ALL 7 criteria MUST ATTENTION pass before grooming:
>
> 1. **User story template** — "As a {role}, I want {goal}, so that {benefit}" format
> 2. **AC testable & unambiguous** — GIVEN/WHEN/THEN. No "should/might/TBD/various/appropriate". Min 3 scenarios (happy, edge, error) + 1 auth scenario
> 3. **Wireframes attached** — UI features: `## UI Layout` with wireframe + components + states + tokens. Backend-only: explicit "N/A"
> 4. **UI design ready** — Visual design + component decomposition tree. Backend-only: "N/A"
> 5. **AI pre-review passed** — `$review-artifact --type=pbi` or `$pbi-challenge` returned PASS or WARN (not FAIL)
> 6. **Story points estimated** — Fibonacci 1-21 + complexity (Low/Medium/High). >13 SP → recommend split
> 7. **Dependencies table complete** — Dependency, Type (must-before/can-parallel/blocked-by/independent), Status
>
> **Failure fixes:** Vague AC → specify exact CRUD + roles. Missing auth → add roles × CRUD table. No wireframes → UX BA creates. TBD in AC → replace with decision.

---

## SYNC:graph-intelligence-queries

> **Graph Intelligence Queries** — CLI: `python .claude/scripts/code_graph {cmd} --json`. Use `--node-mode file` first (less noise), then `function` for detail.
>
> | Find                    | Command                                      |
> | ----------------------- | -------------------------------------------- |
> | All callers of function | `query callers_of <fn>`                      |
> | All importers of module | `query importers_of <mod>`                   |
> | Tests covering function | `query tests_for <fn>`                       |
> | Class hierarchy         | `query inheritors_of <class>`                |
> | Full connection network | `connections <file>`                         |
> | Multi-file batch        | `batch-query <f1> <f2>`                      |
> | Full system flow (BFS)  | `trace <file> --direction both --depth 3`    |
> | Find node by keyword    | `search <keyword> --kind Function --limit 5` |
> | Shortest path           | `find-path <source> <target>`                |
>
> **Orchestration:** grep → graph → grep (find files → expand network → verify). Iterative grep↔graph is encouraged.

---

## SYNC:design-system-check

> **Design System Check** — Before ANY frontend work, read docs relevant to task type:
>
> 1. `docs/project-reference/design-system/README.md` — tokens, components, icons, themes
> 2. `docs/project-reference/frontend-patterns-reference.md` — base classes, stores, forms, API services
> 3. `docs/project-reference/scss-styling-guide.md` — BEM, SCSS vars, mixins, responsive
>
> App-specific paths: check `docs/project-config.json` → `designSystem.appMappings[]` and `contextGroups[]`.

---

## SYNC:project-reference-docs-guide

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

---

## SYNC:project-reference-docs-guide:reminder

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.

---

## SYNC:shared-protocol-duplication-policy

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first, then grep `SYNC:protocol-name` and update all occurrences.

---

## SYNC:fresh-context-review

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `$cook`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `spawn_agent` tool calls — use `code-reviewer` agent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues (no fixes = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `spawn_agent` call
> - Continue until a complete full review pass has zero findings; if the same blocker repeats 3 times with no progress, escalate via a direct user question
> - Track iteration count and repeated blockers in conversation context (session-scoped, no persistent files)

---

## SYNC:review-protocol-injection

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 10 protocol blocks VERBATIM. The template below has ALL 10 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 10 protocol bodies pre-embedded.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} review",
  agent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Classify: CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO.

### Design Patterns Quality
Priority checks for every code change:
1. DRY via OOP: Same-suffix classes (*Entity, *Dto, *Service) MUST share base class. 3+ similar patterns → extract to shared abstraction.
2. Right Responsibility: Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
3. SOLID: Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
5. Tests Verify Intent: For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
6. Migration Test Exclusion: Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
2. Every changed code path MUST map to a corresponding test case/spec (or flag as "needs test case").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Migration files are excluded from test/spec creation; schema/data migrations are one-time execution paths, not core application logic.
5. If spec evidence fields exist, verify they point to actual code (file:line, not stale references).
6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
NEVER fix at the crash site. Trace the full flow, fix at the owning layer. The crash site is a SYMPTOM, not the cause.
MANDATORY before ANY fix:
1. Trace full data flow — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where bad state ENTERS, not where it CRASHES.
2. Identify the invariant owner — Which layer's contract guarantees this value is valid? Fix at the LOWEST layer that owns the invariant, not the highest layer that consumes it.
3. One fix, maximum protection — If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
4. Verify no bypass paths — Confirm all data flows through the fix point. Check for direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
BLOCKED until: Full data flow traced (origin → crash); Invariant owner identified with file:line evidence; All access sites audited (grep count); Fix layer justified (lowest layer that protects most consumers).
Anti-patterns (REJECT): "Fix it where it crashes" (crash site ≠ cause site, trace upstream); "Add defensive checks at every consumer" (scattered defense = wrong layer); "Both fix is safer" (pick ONE authoritative layer).

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need task tracking. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation
MANDATORY when .code-graph/graph.db exists.
HARD-GATE: MUST run at least ONE graph command on key files before concluding any investigation.
Pattern: Grep finds files → trace --direction both reveals full system flow → Grep verifies details.
- Investigation/Scout: trace --direction both on 2-3 entry files
- Fix/Debug: callers_of on buggy function + tests_for
- Feature/Enhancement: connections on files to be modified
- Code Review: tests_for on changed functions
- Blast Radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Run python .claude/scripts/code_graph trace <file> --direction both --json when .code-graph/graph.db exists.
4. Map dependencies via connections or callers_of — know what depends on your target.
5. Write investigation to .ai/workspace/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Graph trace (if graph.db exists); Assumptions verified with evidence.

## Reference Docs (READ before reviewing)
- docs/project-reference/code-review-rules.md
- {skill-specific reference docs — e.g., integration-test-reference.md for integration-test-review; backend-patterns-reference.md for backend reviews; frontend-patterns-reference.md for frontend reviews}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to plans/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 10 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` agent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

---

## SYNC:repeatable-test-principle

> **Infinitely Repeatable Tests** — Tests MUST run N times without failure. Like manual QC — run the suite 100 times, each run just adds more data. Verification is only PASS after the relevant suite/project passes 3 consecutive runs without database reset.
>
> 1. **Unique data per run:** Use the project's unique ID generator for ALL entity IDs created in tests. NEVER hardcode IDs.
> 2. **Additive only:** Tests create data, never delete/reset. Prior test runs MUST NOT interfere with current run.
> 3. **No schema rollback dependency:** Tests work with current schema only. Never rely on schema rollback or migration reversals.
> 4. **Idempotent seeders:** Fixture-level seeders use create-if-missing pattern (check existence before insert). Test-level data uses unique IDs per execution.
> 5. **No cleanup required:** No teardown, no database reset between runs. Each test is isolated by unique seed data, not by cleanup.
> 6. **Unique names/codes:** When entities require unique names/codes, append a unique suffix using the project's ID generator.
> 7. **Migration code excluded:** Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.

---

## SYNC:fix-layer-accountability

> **Fix-Layer Accountability** — NEVER fix at the crash site. Trace the full flow, fix at the owning layer.
>
> AI default behavior: see error at Place A → fix Place A. This is WRONG. The crash site is a SYMPTOM, not the cause.
>
> **MANDATORY before ANY fix:**
>
> 1. **Trace full data flow** — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where the bad state ENTERS, not where it CRASHES.
> 2. **Identify the invariant owner** — Which layer's contract guarantees this value is valid? That layer is responsible. Fix at the LOWEST layer that owns the invariant — not the highest layer that consumes it.
> 3. **One fix, maximum protection** — Ask: "If I fix here, does it protect ALL downstream consumers with ONE change?" If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
> 4. **Verify no bypass paths** — Confirm all data flows through the fix point. Check for: direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
>
> **BLOCKED until:** `- [ ]` Full data flow traced (origin → crash) `- [ ]` Invariant owner identified with `file:line` evidence `- [ ]` All access sites audited (grep count) `- [ ]` Fix layer justified (lowest layer that protects most consumers)
>
> **Anti-patterns (REJECT these):**
>
> - "Fix it where it crashes" — Crash site ≠ cause site. Trace upstream.
> - "Add defensive checks at every consumer" — Scattered defense = wrong layer. One authoritative fix > many scattered guards.
> - "Both fix is safer" — Pick ONE authoritative layer. Redundant checks across layers send mixed signals about who owns the invariant.

---

## SYNC:context-engineering-principles

> **Context Engineering Principles** — Research-backed principles for prompt quality. Source: Anthropic prompt engineering guide, Stanford "lost-in-the-middle" research, 2025-2026 LLM context optimization studies.
>
> 1. **Primacy-Recency Effect** — LLM performance drops 15-47% for middle-context information (Stanford). AI attention peaks at first/last 10% of text. **Action:** Place the 3 most critical rules in both the first 5 lines AND the last 5 lines of every prompt. Queries at end improve quality by up to 30% (Anthropic).
> 2. **High-Signal Density** — Anthropic: _"Identify the smallest collection of high-signal tokens that maximize the probability of the desired outcome."_ **Action:** Every line should change AI behavior. If removing a line doesn't change output → cut it. Target ≥8 rules (MUST ATTENTION/NEVER/ALWAYS) per 100 lines.
> 3. **Context Rot** — LLM performance degrades as context length grows — even when all content is relevant. Compression (5-20x) maintains or improves accuracy while saving 70-94% tokens. **Action:** Compress aggressively. Shorter, denser prompts outperform longer, diluted ones.
> 4. **Structured > Prose** — Tables, bullets, XML/markdown parse faster than paragraphs. Constrained formats reduce error rates vs free-text. **Action:** Convert narrative to tables/bullets. Use markdown headers for semantic sections.
> 5. **RCCF Framework** — Modern LLMs (2025+) already know how to reason. What they need: **R**ole (personality), **C**ontext (grounding), **C**onstraints (guardrails), **F**ormat (structure). Constraints and format matter more than verbose instructions.
> 6. **Checkbox Avoidance** — `[ ]` syntax triggers mechanical compliance — AI ticks boxes without reasoning. Bullet rules force reading and evaluation. **Action:** Replace `- [ ] Check X` with `- MUST ATTENTION verify X`.
> 7. **Example Economy** — 3-5 examples optimal for few-shot; diminishing returns after. **Action:** 1 best example per pattern. Use BAD→GOOD pairs (2-3 lines each) for anti-patterns.
> 8. **Deferred Tool Loading** — Claude Code delays loading tool definitions when they exceed 10% of context window. **Action:** Keep injected docs well under 10% of context budget. Docs exceeding ~3,000 lines are too large for injection — split or compress.
> 9. **Rule Density Verification** — Post-optimization rule count (MUST ATTENTION/NEVER/ALWAYS) must be ≥ pre-optimization count. Compression should preserve or increase density, never decrease it. **Action:** Count before and after every optimization pass.
> 10. **Affirmative Directives** — Models comply with affirmative directives more reliably than prohibitions; a bare "don't X" leaves the correct action unspecified, so the model substitutes an arbitrary alternative. **Action:** State the action to take, not only the action to avoid. Keep `NEVER`/forbidden guardrails for hard invariants — but pair each with the right path ("Do X" not just "Don't do Y").
> 11. **Rationale-Carrying Instructions** — A rule shipped with its reason generalizes to edge cases the rule never enumerated and survives compression; a bare imperative gets misapplied or silently dropped. **Action:** Append a terse `— why: …` clause to every non-obvious rule. The reason names the failure prevented or outcome wanted — never restates the rule.

---

## SYNC:prompt-enhancement-transforms-base

> **Prompt Enhancement Transforms (Base)** — Transforms 1-3 are identical across all `$prompt-enhance` ops (`--op=compress|expand|enhance`). Transform 4 is per-op (conciseness pass for compress/enhance; structural clarity pass for expand) and stays local to each op branch.
>
> ### Transform 1: Inline Summaries for READ References
>
> **Problem:** AI sees `MUST ATTENTION READ file.md` and skips it.
> **Solution:** Add a 2-3 line summary of key rules BEFORE the read instruction.
>
> **Before:**
>
> ```
> MUST ATTENTION READ .claude/protocols/evidence.md
> ```
>
> **After:**
>
> ```
> > **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim requires `file:line` proof.
> > Confidence: >95% recommend freely, 80-94% with caveats, <80% DO NOT recommend.
>
> MUST ATTENTION READ .claude/protocols/evidence.md for full details.
> ```
>
> **Scope rules:**
>
> - `.claude/` protocol files → always add an inline summary (stable, belongs to framework)
> - `docs/project-reference/` files → NO inline summary (project-specific). Add: `(Claude may inject this via hooks; Codex must open this file directly using docs-index routing)`
>
> ### Transform 2: Top Summary Section
>
> Required structure (first 20 lines after frontmatter):
>
> ```markdown
> > **[IMPORTANT]** task tracking instruction...
>
> > **Protocol Name** — [inline summary]. MUST ATTENTION READ `path` for details.
>
> ## Quick Summary
>
> **Goal:** [One sentence — what this skill achieves AND the ultimate outcome it must cause]
>
> **Workflow:**
>
> 1. **[Step]** — [description]
>
> **Key Rules:**
>
> - [Most critical constraint]
> ```
>
> ### Transform 3: Bottom Closing Reminders
>
> Add at the very end of the file:
>
> ```markdown
> ---
>
> ## Closing Reminders
>
> **IMPORTANT MUST ATTENTION Goal:** [same goal as Quick Summary]
> **IMPORTANT MUST ATTENTION** [echo rule #1 from the top section]
> **IMPORTANT MUST ATTENTION** [echo rule #2]
> **IMPORTANT MUST ATTENTION** [echo rule #3]
> **IMPORTANT MUST ATTENTION** add a final review task to verify work quality
> ```
>
> Pick 3-5 rules AI most commonly violates. Bottom section re-anchors attention after the long middle.

---

## SYNC:subagent-return-contract

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.

---

## SYNC:incremental-persistence

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md`
> 2. **After each file/section reviewed:** Append findings to report immediately — never hold in memory
> 3. **Return to main agent:** Summary only (per SYNC:subagent-return-contract) with `Full report:` path
> 4. **Main agent:** Reads report file only when resolving specific blockers
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

---

## SYNC:task-tracking-external-report

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: plans/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

---

## SYNC:task-tracking-external-report:reminder

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

---

## SYNC:nested-task-creation

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

---

## SYNC:nested-task-creation:reminder

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

---

## SYNC:parallel-phase-advancement

> **Parallel-Phase Advancement (model-driven)** — How to run AND advance a declared parallel batch of workflow steps. Tool-agnostic: identical under Claude, Codex, and Copilot — none depends on a hook. Mirrors the universal context-file rule ("Workflow Step Advancement & Parallel Phases" in CLAUDE.md / AGENTS.md / copilot-instructions).
>
> 1. **Declare the group.** Name the members of the parallel phase up-front — which steps run together, and mark any conditional member with its trigger.
> 2. **Spawn ALL members in ONE message.** Dispatch every member together (multiple `spawn_agent`/sub-agent calls in a single response) — never drip them one per turn.
> 3. **Barrier — advance ONLY after EVERY member returns.** A member is "returned" when its work completes inline OR its sub-agent returns; a conditional member whose trigger is absent counts as returned. Do NOT advance, and do NOT start the next step, until the whole group has returned.
> 4. **A sub-agent return advances the step identically to an inline call.** Advancement is YOUR judgment against the task list — never wait for a hook or tool event. Mark each member `completed` (or "Skipped — <reason>") as the batch resolves.
> 5. **Mutating steps wait for the barrier.** Never start a code-mutating step (e.g. `code-simplifier`) until the full batch has returned — it must act on the complete review snapshot, not a partial one.
> 6. **Hooks are accelerators only.** Any step-tracking hook may emit a "next step" hint as an optimization; correctness MUST NOT depend on it. Codex and Copilot run with no hooks and advance entirely by this rule.
>
> **Blocked until:** `- [ ]` all members spawned in one message `- [ ]` every member returned (incl. skipped conditional) `- [ ]` each member marked completed/skipped `- [ ]` mutating step deferred until after the barrier.

---

## SYNC:critical-thinking-mindset

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

---

## SYNC:ai-mistake-prevention

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

---

## SYNC:source-test-drift-check

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

---

## SYNC:spec-drift-adjudication

> **Spec drift adjudication (code-wrong vs spec-stale).** Whenever changed behavior diverges from a canonical Feature Spec (business rule, acceptance criterion, flow, state transition, or §8 TC under `docs/specs/`), you MUST NOT silently pick a side. Adjudicate per `shared/sdd-artifact-contract.md` → **Drift Gates**:
>
> 1. **Detect** — compare the change against the spec's documented intent. No divergence → record `Spec in sync` and move on.
> 2. **Classify** the divergence:
>     - **CODE-WRONG** — the spec correctly states intended behavior and the change violates it → BLOCKING finding; fix the code/test against intended behavior (write/adjust a regression TC first).
>     - **SPEC-STALE** — the change is the new intended behavior and the spec now documents the old/wrong behavior → update the spec FIRST via `$spec [mode=update]`, then sync `$spec [mode=tests]` + `$spec [mode=sync]`.
>     - **AMBIGUOUS** — intended behavior is unclear → a direct user question (or the canonical spec owner) before editing either side.
> 3. **Never normalize drift just because code/tests are green** — green can encode the drift itself. Reconcile to canonical intent, never to whichever side currently passes.
>
> A behavior-changing review/implementation that leaves a spec divergence unadjudicated is INCOMPLETE.

---

## SYNC:sub-agent-selection

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** Route specialized domains (architecture, security, performance, DB, E2E, integration-test, git) to the matching specialist agent (see guide above) — NEVER use `code-reviewer` for these. — why: `code-reviewer` lacks each domain's checklist, so specialized issues slip through.

---

## SYNC:sequential-thinking-protocol

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <80% on any critical decision → escalate via ask the user directly · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).
>
> **Deep-dive:** see `$sequential-thinking` skill (`.claude/skills/sequential-thinking/SKILL.md`) for worked examples (API design, debugging, architecture), advanced techniques (spiral refinement, hypothesis testing, convergence), and meta-strategies (uncertainty handling, revision cascades).

---

## SYNC:sequential-thinking-protocol:reminder

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `$sequential-thinking` skill.

---

## SYNC:goal-contract-satisfaction-loop

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

---

## SYNC:goal-contract-satisfaction-loop:reminder

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

---

**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.
  <!-- PROMPT-PROTOCOLS:END -->

# Codex Context (Hookless Parity)

Purpose: provide Codex with the same core principles and lessons normally injected by Claude hooks.

Source hooks:

- `.claude/hooks/lib/prompt-injections.cjs`
- `.claude/hooks/code-patterns-injector.cjs`
- `.claude/hooks/mindset-injector.cjs`
- `.claude/hooks/lessons-injector.cjs`
- `docs/project-reference/lessons.md`

Last synced: 2026-05-29

## Codex Hookless Project Reference Gate

Codex does not receive Claude hook-injected project docs or project config summaries. Before coding, planning, debugging, testing, or reviewing:

- Read `docs/project-config.json` for project-specific commands, module paths, workflow settings, and doc paths.
- Read `docs/project-reference/docs-index-reference.md` to route to the right project-reference files.
- Read `docs/project-reference/lessons.md` for always-on project guardrails.
- For spec, test-case, `docs/specs/`, behavior-change, or public-contract work, read the spec routing set named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized.
- If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.
- For situation-specific work, open the referenced project doc directly; do not rely on prior conversation text as proof that the doc is loaded.

## Critical Thinking Mindset

- Apply critical thinking and sequential thinking.
- Every claim needs traced proof.
- Confidence threshold: >80% to act; <80% verify first.
- Anti-hallucination principle: never present a guess as fact.
- Cite sources for claims, admit uncertainty, self-check output, cross-reference independently, and remain skeptical of your own confidence.

## Root Cause Principle

- Never patch symptoms.
- Trace full call chain to find who is responsible.
- Fix at the correct layer (Entity > Service > Handler).
- If a fix feels like a workaround, it is likely not the root cause.

## Common AI Mistake Prevention

- Re-read files after context compaction; edit requires prior read in current context.
- Grep for old terms after bulk replacements; verify docs/config/catalog references.
- Check downstream references before deleting files or components.
- After memory loss, inspect existing state before creating new artifacts.
- Verify AI-generated API/class/method references against real code.
- Trace full dependency chains after edits.
- When renaming, grep all consumer file types.
- Trace all code paths, including early exits and error branches.
- Update docs that embed canonical data when sources change.
- Verify sub-agent results after context recovery.
- Cross-check complete target lists against parallel sub-agent splits.
- Use custom agent types with explicit instructions; do not rely on implicit tool behavior.
- Persist sub-agent findings incrementally, not only at the end.
- Ask "whose responsibility?" before fixing; repair the responsible layer.
- Grep all removed symbols after refactors/extractions.
- Assume existing values may be intentional; inspect comments/blame/context before changing.
- Verify all affected outputs, not only the first successful one.
- Do not copy nearby patterns blindly; verify matching preconditions.
- Use holistic-first debugging: verify config/env/DB/endpoints/DI/data prerequisites before deep code hypotheses.
- Keep changes surgical: bugfix changes should map directly to the bug unless explicitly announcing enhancement scope.
- Surface ambiguity before coding; do not silently choose one interpretation.
- Activate a suitable workflow/skill before substantial execution.
- Use adversarial review mindset: test assumptions, alternatives, and failure modes.
- Front-load report writing for long reviews; append findings per section/file.
- After compaction, re-verify claimed completed steps against real current state.
- For OOM triage, validate row-count/unbounded-query causes before row-size micro-optimizations.
- Keep domain concepts out of generic/shared/infra layers; push consumer-specific domain (tenant/customer/product IDs, business entities, feature rules) into the consumer via subclass/composition — a silent leak couples a reusable layer to one consumer.

## Lessons Learned (Project)

Top rules:

- Verify all preconditions (config, env vars, DB names, DI registrations) before code-layer hypotheses.
- Fix responsible layer; never patch symptom sites.
- For parallel async with repo/UoW: use `ExecuteInjectScopedAsync`, never `ExecuteUowTask`.
- Name by purpose, not content-membership lists.
- Persist sub-agent findings incrementally, not only as final batch.
- On Windows shell, verify Python alias (`where python` / `where py`) before assuming command names.

Debugging and root-cause reasoning:

- Holistic-first debugging: list all preconditions first (config, env vars, DB names, endpoints, DI regs, credentials, permissions, data prerequisites), verify each with evidence, then form hypotheses.
- Ask "whose responsibility?" before fixing: caller vs callee responsibility must be explicit.
- Trace data lifecycle (creation -> transformation -> consumption), not only error site.
- Keep code caller-agnostic; do not encode caller-specific assumptions into business logic.

Architecture invariants:

- Parallel async + repo/UoW MUST use `ExecuteInjectScopedAsync` (new UoW + new DI scope per iteration).
- Bus message naming must reflect schema ownership with service prefix; feature services should use request messages for core services.

Naming and abstraction:

- Use purpose-driven names. If adding/removing a member forces renaming, abstraction is content-driven and likely wrong.

Environment and tooling:

- Windows bash: do not assume `python` or `python3` resolves; verify aliases first and prefer `py` on Windows when appropriate.

## Workflow and Learning Protocol

- Break substantial work into small tasks before execution.
- Maintain evidence-first decisions and report unresolved questions explicitly.
- At end of tasks, extract reusable failure-mode lessons (root-cause level, not symptom level).
- Only retain lessons that are broadly reusable and likely to recur without reminders.

<!-- WORKFLOWS:START -->

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

## Workflow Protocol (Hookless)

Use this protocol for workflow execution in Codex (no hook dependency):

1. Detect: execute explicit `$skill`, `$workflow-*`, or `$start-workflow <id>` prompts directly; otherwise match request against workflow catalog and skill list.
2. Analyze: choose the best path: direct execution, skill, standard workflow, or custom step combination.
3. Auto-select: pick the best path yourself without asking the user to choose between direct/skill/workflow/custom options.
4. Activate: execute direct work, invoke the selected skill, start the selected workflow sequence, or run the custom sequence.
5. Tasking: create tasks for each workflow/custom/skill step when the selected path has multiple steps.
6. Execute: run steps in order, validate outputs, and report completion.

Workflow source: `.claude/workflows.json` (17 workflows).

## Workflow Catalog

### Quick Keyword Lookup (match prompt -> workflow)

| If prompt mentions...                                                                                                 | Workflow ID                       | Workflow Name                      |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------- |
| implement a large, complex, or ambiguous feature that needs research                                                  | `workflow-big-feature`            | Big Feature (Research + Implement) |
| a bug, error, crash                                                                                                   | `workflow-bugfix`                 | Bug Fix                            |
| generate, update, or maintain e2e/playwright tests from code/spec                                                     | `workflow-e2e`                    | E2E Testing                        |
| implement a well-defined feature, add a component, build a capability                                                 | `workflow-feature`                | Feature Implementation             |
| create or update business feature documentation                                                                       | `workflow-feature-spec`           | Business Feature Documentation     |
| start a new project from scratch, init a greenfield project, plan a new application                                   | `workflow-greenfield-init`        | Greenfield Project Init            |
| take a raw idea — or, tdd test specifications, dev ba pic challenge review                                            | `workflow-idea-to-pbi`            | Idea to PBI                        |
| go from a raw product idea, vision, or problem statement through structured brainstorming                             | `workflow-product-discovery`      | Product Discovery                  |
| restructure, reorganize, clean up                                                                                     | `workflow-refactor`               | Code Refactoring                   |
| research a topic from web sources, a business/market viability evaluation, a marketing strategy                       | `workflow-research`               | Research & Synthesis               |
| review current uncommitted, staged, or unstaged changes before committing                                             | `workflow-review-changes`         | Review Current Changes             |
| seed test data, implement data seeders, realistic development environment data                                        | `workflow-seed-test-data`         | Seed Test Data                     |
| initial feature spec generation from zero, maintaining spec sync after code changes, quarterly spec health audits     | `workflow-spec-driven-dev`        | Spec-Driven Development            |
| fixing a bug update test specs, code changes update test specs, pr review update test specs                           | `workflow-spec-sync`              | Spec Sync (Post-Change)            |
| create all pbis from an existing, convert a large feature spec into, dependent pbis from docs/specs                   | `workflow-spec-to-pbi`            | Spec to PBI Backlog                |
| visualize, diagram, draw                                                                                              | `workflow-visualize`              | Visual Diagram                     |
| write integration tests for a specific, add test coverage to an untested, update integration tests after code changes | `workflow-write-integration-test` | Write Integration Tests            |

### Workflow Details (full sequence + protocol)

### workflow-big-feature — Big Feature (Research + Implement)

- Description: Research-driven feature development for large, complex, or ambiguous features in an existing project — includes idea refinement, market research, business evaluation, domain analysis, tech stack research, and full implementation
- When To Use: User wants to implement a large, complex, or ambiguous feature that needs research, market analysis, business evaluation, domain modeling, or tech stack analysis before implementation. Big new module, major enhancement, cross-cutting capability, or feature where scope is unclear
- When Not To Use: Small/well-defined features (use workflow-feature), new project from scratch (use workflow-greenfield-init), bug fixes, test-only tasks
- Sequence: `idea -> web-research -> deep-research -> business-evaluation -> domain-analysis -> why-review -> tech-stack-research -> architecture-design -> why-review -> plan -> plan-review -> refine -> why-review -> review-artifact --type=pbi -> story -> why-review -> review-artifact --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> spec -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> plan -> plan-review -> scaffold -> plan-validate -> why-review -> cook -> review-domain-entities -> integration-test -> integration-test-review -> integration-test-verify -> spec [mode=sync] -> workflow-review-changes -> sre-review -> security-review -> changelog -> test -> docs-update -> workflow-end -> watzup`

Protocol:

```text
BIG FEATURE PROTOCOL (Research-Driven):
For large/ambiguous features in an existing codebase that need research before implementation.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. EVERY research stage requires ask the user directly validation before proceeding
2. Save artifacts to plan directory at EVERY step
3. Present 2-4 options for every major decision with confidence %
4. New Tech/Lib Gate: evaluate top 3 alternatives before adding any new dependency

STEP SELECTION GATE:
After workflow activation, auto-select the applicable steps and skip irrelevant conditional steps. Default step set:
- [x] Discovery Interview (idea)
- [x] Market Research (web-research)
- [x] Deep Research (deep-research)
- [x] Business Evaluation (business-evaluation)
- [x] Refine to PBI (refine)
- [x] Domain Analysis & ERD (domain-analysis)
- [x] Tech Stack Research (tech-stack-research)
- [x] User Stories (story)
- [x] Feature Spec Consolidation (spec) — folds story/pbi-mockup into the tech-free 8-section Feature Spec; these are INPUTS, not re-authored
- [x] Test Specifications (spec [mode=tests])
- [x] Test Spec Review (review-artifact --type=spec-tests)
- [x] Implementation Plan (plan)
- [x] Plan Review (plan-review)
- [x] Plan Validation (plan-validate)
- [x] Design Rationale Review (why-review)
- [x] Implementation (cook)
- [x] Domain Entity Review (review-domain-entities) — CONDITIONAL: skip if no domain entity files changed
- [x] Integration Tests (integration-test)
- [x] Review Changes (workflow-review-changes) — consolidated review + fix loop
- [x] SRE Review (sre-review)
- [x] Changelog (changelog)
- [x] Tests (test)
- [x] Documentation (docs-update)
- [x] Summary (watzup)

Auto-skip steps that are irrelevant to the prompt; mark skipped steps as completed with a short reason.

PLAN PHASES (quick reference):
- PLAN₁ (after architecture-design): High-level architecture plan. Scope: system design, component boundaries, data flow, tech choices. Based on: research findings + domain analysis.
- PLAN₂ (after review-artifact --type=spec-tests): Sprint-ready implementation plan. Scope: concrete tasks, file changes, test infrastructure, phased steps. Based on: stories + test specs + dependency tables.
The two plans serve different purposes — PLAN₁ is strategic, PLAN₂ is tactical.

SECOND PLANNING ROUND:
After stories + reviews are complete, a second $plan + $plan-review cycle runs.
The first $plan (after architecture-design) is high-level architecture based on research + domain analysis.
The second $plan (after review-artifact --type=spec-tests) incorporates the concrete stories, test specifications, dependency tables, and refinement details into a sprint-ready implementation plan with phased steps.
This ensures the implementation plan reflects all discovered requirements, test strategy, and story dependencies.

TEST SPECIFICATIONS (after review-artifact --type=story, BEFORE second plan):
After stories are reviewed, write TDD specs ($spec [mode=tests]) based on story acceptance criteria.
Review specs ($review-artifact --type=spec-tests) for coverage and correctness.
The second $plan then incorporates test strategy alongside implementation tasks.

ARCHITECTURE SCAFFOLDING (after second plan-review, CONDITIONAL):
The $scaffold step is CONDITIONAL — AI must first self-investigate for existing base abstractions.
Grep for: abstract/base classes, generic interfaces, infrastructure abstractions (IRepository, IUnitOfWork), utility layers (Extensions, Helpers, Utils), frontend foundations (base component/service/store), DI registrations.
If existing scaffolding found → SKIP $scaffold step, mark completed.
If NO foundational abstractions found → PROCEED: create all base abstract classes, generic interfaces, infrastructure abstractions, and shared utilities with OOP/SOLID principles BEFORE any feature story implementation.
All infrastructure behind interfaces with at least one concrete implementation (Dependency Inversion).
For existing projects adding a new module, adapt scaffolding to extend existing base classes rather than creating duplicates.
MANDATORY SPEC-DRIVEN BIG-FEATURE GATES:
- Read docs/project-reference/spec-principles.md before $story and $spec [mode=tests] to lock intent and non-negotiable invariants.
- $spec [mode=tests] + $review-artifact --type=spec-tests MUST map each invariant to Section 8 TC IDs.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-machine flows, tests MUST assert persisted state transitions and invalid-transition rejection.
- Before $workflow-end, enforce three-way sync: spec docs ↔ TDD docs ↔ test code via $spec [mode=tests] + $review-artifact --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec [mode=sync] + $docs-update.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-bugfix — Bug Fix

- Description: Systematic debugging and fix workflow with end-to-start debugger trace before fix
- When To Use: User reports a bug, error, crash, failure, regression, stale/incorrect final output, or something not working; wants to fix/debug/troubleshoot an issue with end-to-start trace
- When Not To Use: New feature implementation, code improvement/refactoring, investigation-only (no fix), documentation updates
- Sequence: `scout -> investigate -> debug-investigate -> spec [mode=amend] -> plan -> plan-review -> plan-validate -> why-review -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> integration-test -> fix -> prove-fix -> integration-test -> integration-test-review -> integration-test-verify -> spec [mode=sync] -> workflow-review-changes -> changelog -> test -> docs-update -> workflow-end -> watzup`

Protocol:

```text
BUG FIX PROTOCOL (TDD-FIRST):
PROJECT CONTEXT: Apply the shared SDD Artifact Contract from shared/sdd-artifact-contract.md in the active skills root. Read docs/project-config.json and docs/project-reference/docs-index-reference.md for project-specific conventions. Any supported AI tool may implement or review when this context is synced.
1. Scout: Find files related to the reported issue
2. Investigate: Understand current vs expected behavior and unchanged behavior that must be preserved
   IMPORTANT: When analyzing 'unused' code during investigation:
   - Follow Investigation Protocol (CLAUDE.md)
   - Require grep evidence, confidence >=80%, cross-module/service checks (see docs/project-config.json → workflowPatterns.crossModuleValidation)
   - Use $investigate skill for removal/refactoring decisions
3. Debug: Identify root cause with evidence (file:line)
3b. END-TO-START DEBUGGER TRACE GATE: Start at the observed final symptom/output, identify the final reader, trace backward through storage/projection, writer, consumer/job, producer/origin, enumerate all feeder paths, and build a hypothesis matrix. BLOCKED until owning fix layer and forward convergence proof are written.
4. Plan fix with minimal blast radius
5. Validate plan before implementing
6. Validate fix rationale with $why-review
6b. SPEC-BUG GATE — Run BEFORE writing regression TCs:
   Ask: "Is this a Code Bug or a Spec Bug?"
   • CODE BUG (code doesn't match spec — most common): Spec correctly describes expected behavior. Code diverged. Proceed to step 7.
   • SPEC BUG (spec documented wrong behavior; code implemented the spec faithfully): Do NOT write regression TCs yet. First run $spec [mode=update] to correct the affected Feature Spec sections (§1-7, plus §8 if a TC encoded the wrong behavior). Then return to step 7.
   • AMBIGUOUS: Ask user: "Did the spec ever correctly document this behavior?"
   SIGNAL: Spec MATCHES buggy code → Spec Bug. Spec says X but code does Y → Code Bug.
7. Write test specs ($spec [mode=tests]): Create TC specs asserting the CORRECT (fixed) expected behavior — not the buggy behavior. These become the regression guard.
8. Review test specs with $review-artifact --type=spec-tests
9. WRITE INTEGRATION TEST — RED phase: Implement integration test(s) based on the bug reproduction spec. Run the test(s) — they MUST FAIL. A passing test means it does NOT actually catch the bug. Never proceed to fix until the test(s) fail.
10. Fix the identified issue
11. PROVE FIX: Build code proof traces per change, confidence scores, stack-trace-style evidence. MANDATORY — never skip.
12. RE-RUN INTEGRATION TESTS — GREEN phase: Run integration tests again — expect all to PASS. This confirms the fix resolves the bug AND regression guard is in place.
13. Review integration tests with $integration-test-review — verify tests have real assertion value, not just smoke/existence checks.
14. Code review for quality and regression risk
15. Update changelog
16. Run full test suite to verify fix and no regressions
17. Summary report of fix and verification results

PERFORMANCE-SDD ROUTE: If this bug fix is performance-related (latency, throughput, memory, query speed, load behavior), run $performance-review and require SLA/benchmark evidence: target metric, baseline, measurement command, and acceptable regression budget. Do not use performance scope to bypass functional no-regression checks: run $test and relevant functional checks when behavior can change. Update the affected Feature Spec (docs/specs/{Bucket}/) for changed SLA, performance constraints, or behavior boundaries.
MANDATORY INVARIANT-PRESERVING BUGFIX LOOP:
- Do not encode buggy behavior into specs/tests. Confirm intended invariant from spec docs first.
- $spec [mode=tests] MUST capture preserved invariants and newly-fixed invariants explicitly.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): regression tests MUST assert entity state before/after transitions and invalid transition rejection.
- RED/GREEN harness proof is mandatory: first $integration-test must fail on the bug, second $integration-test must pass after fix.
- $workflow-end is BLOCKED until specs, TCs, and test code are synchronized via $spec [mode=tests] + $review-artifact --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec [mode=sync] + $docs-update. Performance-related work may delegate measurement to $performance-review, but spec/test/docs sync remains required whenever behavior, public contract, SLA, performance constraints, or docs/spec boundaries change.
- Code-to-spec extraction is reference-only until accepted by the canonical spec owner.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-e2e — E2E Testing

- Description: Generate, update, or maintain E2E/Playwright tests — source-parameterized (changes | recording | update-ui)
- When To Use: User wants to generate, update, or maintain E2E/Playwright tests from code/spec changes (--source=changes), a Chrome DevTools recording (--source=recording), or for UI screenshot baselines (--source=update-ui)
- When Not To Use: Non-E2E test work (unit/integration tests → use the test/integration-test workflows)
- Sequence: `scout -> e2e-test -> test -> docs-update -> workflow-end -> watzup`

Protocol:

```text
E2E WORKFLOW (source-parameterized):
Resolve --source={changes|recording|update-ui} and follow the matching protocol block in .claude/skills/workflow-e2e/SKILL.md:
- changes: detect change type from git diff (spec/code/API) -> load affected TC-{FEATURE}-{NNN} -> update/generate test implementations -> ensure each TC has a corresponding test -> run tests -> report coverage.
- recording: validate recording JSON -> identify app/feature -> run convert-recording.ts -> map TCs to recording steps -> apply project CSS conventions (docs/project-config.json → workflowPatterns.cssMethodology) -> add screenshot assertions -> Page Object if complex -> run + report.
- update-ui: identify visual diff (SCSS/HTML/TS) -> map to page objects -> find affected specs -> regenerate screenshots (--update-snapshots) -> visual review old vs new -> confirm intentional with user -> report.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-feature — Feature Implementation

- Description: Full feature development workflow with search-first approach, planning, implementation, testing, and documentation
- When To Use: User wants to implement a well-defined feature, add a component, build a capability, develop a module, implement/execute an existing plan, create a new API endpoint, or design an API contract, TDD/test-first development, spec-driven feature implementation with test specs written before code
- When Not To Use: Bug fixes, test-only tasks, workflow-feature requests/ideas (no implementation), PBI/story creation, design specs, large/ambiguous features needing workflow-research (use workflow-big-feature)
- Sequence: `scout -> investigate -> domain-analysis -> why-review -> spec -> plan -> plan-review -> plan-validate -> why-review -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> plan -> plan-review -> cook -> review-domain-entities -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> spec [mode=sync] -> integration-test -> integration-test-review -> integration-test-verify -> workflow-review-changes -> sre-review -> security-review -> changelog -> test -> docs-update -> workflow-end -> watzup`

Protocol:

```text
FEATURE IMPLEMENTATION PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → workflowPatterns and docs/project-reference/docs-index-reference.md for project-specific architecture, test, documentation, naming, and CSS conventions. Apply the shared SDD Artifact Contract from shared/sdd-artifact-contract.md in the active skills root. Any supported AI tool may implement or review when this context is synced.
⚠️ MANDATORY: Search existing code BEFORE planning
1. Scout: Find similar features, patterns, and implementation examples using Grep/Glob
2. Investigate: Study existing patterns - validate with 3+ codebase examples (NOT generic framework docs)
2b. Domain Analysis — CONDITIONAL: if feature creates/modifies domain entities, run $domain-analysis after investigate to model bounded contexts and ERD before planning.
3. Author Feature Spec: with $spec BEFORE planning, capture intended behavior — §1-7 business rules, invariants, and acceptance criteria the plan and tests are built against. Validate investigation + spec rationale with $why-review.
4. Plan: Design solution following discovered project patterns (architecture, state management, CSS — see docs/project-config.json → workflowPatterns). Include expected behavior, unchanged behavior, and docs/spec/test sync when behavior can change.
5. Validate plan via $plan-review then $plan-validate before any code changes; confirm design rationale with $why-review.
6. Write test specifications with $spec [mode=tests] (before implementation). Review with $review-artifact --type=spec-tests.
7. Update plan with test strategy via $plan (re-plan cycle). Review with $plan-review.
8. Implement with $cook (backend + frontend) — guided by test specs
8b. Domain Entity Review — CONDITIONAL: if domain entity files created/modified, run $review-domain-entities before updating test specs to catch DDD quality issues early.
9. Update test specs to catch implementation gaps with $spec [mode=tests]. Review with $review-artifact --type=spec-tests. Sync §8 TCs ↔ integration test code with $spec [mode=sync].
10. Generate/update integration tests with $integration-test — creates actual test files from TC specifications — then verify with $integration-test-review and $integration-test-verify.
11. Review the full change set with $workflow-review-changes (simplification, code quality, UI, architecture, and patterns compliance).
12. SRE review for production readiness with $sre-review; security review with $security-review.
13. Update changelog with feature entry
14. Run tests to verify no regressions
15. Update documentation if feature impacts business docs
16. Summary report of all changes ($workflow-end + $watzup)

PLAN PHASES:
- PLAN₁ (after investigate): Feature design plan. Scope: architecture, file changes, implementation approach.
- PLAN₂ (after review-artifact --type=spec-tests): Updated plan incorporating test strategy. Scope: refine PLAN₁ with test infrastructure, test data setup, spec coverage gaps.

GUARDRAIL: Provide file:line evidence of pattern search in plan. Follow project conventions over generic docs.

PERFORMANCE-SDD ROUTE: If this feature is a performance enhancement (latency, throughput, memory, query speed, load behavior), run $performance-review and require SLA/benchmark evidence: target metric, baseline, measurement command, and acceptable regression budget. Do NOT skip $cook. If behavior can change, run $test and relevant functional no-regression checks. Update the affected Feature Spec (docs/specs/{Bucket}/) for changed SLA, performance constraints, or behavior boundaries.
MANDATORY SPEC-DRIVEN + INVARIANT + TEST HARNESS LOOP:
- Read docs/project-reference/spec-principles.md before $plan and lock feature intent + non-negotiable invariants.
- $spec [mode=tests] MUST map every invariant to TC IDs in §8 Test Specifications.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle behavior, tests MUST assert persisted entity state transitions and invalid-transition rejection.
- $workflow-end is BLOCKED until Feature Spec §1-7, §8 TCs, and test code are synchronized via $spec [mode=tests] + $review-artifact --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec [mode=sync] + $docs-update. Performance-related work may delegate measurement to $performance-review, but spec/test/docs sync remains required whenever behavior, public contract, SLA, performance constraints, or docs/spec boundaries change.
- POST-IMPLEMENTATION SPEC RE-VERIFY (MANDATORY): the $spec authored BEFORE $plan captured intended behavior; after $cook the implemented behavior may have diverged. Before closure, re-verify Feature Spec §1-7 against what was actually built and adjudicate any divergence per SYNC:spec-drift-adjudication (shared/sdd-artifact-contract.md Drift Gates) — CODE-WRONG -> fix code; SPEC-STALE -> run $spec [mode=update] to record the new intended behavior. This is not optional cleanup: a feature that shipped behavior the spec does not describe leaves the spec stale.
- If mismatch exists (spec vs code vs tests), run $spec [mode=update] + $spec [mode=tests] before closure.
- Code-to-spec extraction is reference-only until accepted by the canonical spec owner.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-feature-spec — Business Feature Documentation

- Description: Business feature documentation with tech-free 8-section Feature Spec template enforcement, plan validation, and mandatory test coverage (TCs in Section 8)
- When To Use: User wants to create or update business feature documentation under the fixed docs/specs Feature Spec root
- When Not To Use: Bug fixes, feature implementation, test writing, debugging, refactoring
- Sequence: `scout -> investigate -> plan -> plan-review -> plan-validate -> why-review -> docs-update -> workflow-review-changes -> review-post-task -> workflow-end -> watzup`

Protocol:

```text
Role: Documentation Specialist
BUSINESS FEATURE DOC PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → workflowPatterns.featureDocTemplate to find and read the feature doc template — follow its section requirements exactly. Use docs/specs/ for the docs directory.
- TC-{FEATURE}-{NNN} test case format with GIVEN/WHEN/THEN
- Evidence field with `[Source: namespace/service/id]` abstract-anchor format (never physical file:line)
- Cross-reference parent features if sub-feature

MANDATORY UPDATE CHECKLIST (when updating existing docs):
- ALWAYS update the Test Specifications section when documenting new functionality
- Plan MUST ATTENTION include all impacted sections identified from diff analysis
- Plan MUST ATTENTION be validated via $plan-review and $plan-validate before any edits begin

OUTPUT: Complete feature README following template sections.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-greenfield-init — Greenfield Project Init

- Description: Full waterfall project inception from idea through implementation with integration testing
- When To Use: User wants to start a new project from scratch, init a greenfield project, plan a new application, research and plan before coding, bootstrap a new codebase, build something new
- When Not To Use: Existing codebase with code, bug fixes, feature implementation, refactoring existing code
- Sequence: `idea -> web-research -> deep-research -> business-evaluation -> domain-analysis -> why-review -> tech-stack-research -> architecture-design -> why-review -> plan -> plan-review -> security-review -> performance-review -> plan-review -> refine -> why-review -> review-artifact --type=pbi -> story -> why-review -> review-artifact --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> plan-validate -> why-review -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> plan -> plan-review -> scaffold -> linter-setup -> harness-setup -> why-review -> cook -> review-domain-entities -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> plan -> plan-review -> integration-test -> integration-test-review -> integration-test-verify -> test -> workflow-review-changes -> sre-review -> security-review -> changelog -> test -> docs-update -> workflow-end -> watzup`

Protocol:

```text
GREENFIELD PROJECT INCEPTION PROTOCOL:
You are acting as a Solution Architect for a brand-new project.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. EVERY stage requires ask the user directly validation before proceeding
2. Save artifacts to plan directory at EVERY step
3. All tech recommendations include confidence % and evidence
4. Present 2-4 options for every major decision
5. Delegate architecture decisions to solution-architect agent
6. After workflow activation, auto-select applicable steps and skip irrelevant conditional steps
7. NEVER ask tech stack upfront — business analysis first, tech stack research after domain analysis
8. Domain analysis produces ERD + bounded contexts BEFORE tech stack research
9. Tech stack research compares top 3 options per layer with detailed pros/cons

STEP SELECTION GATE:
After workflow activation, auto-select the applicable steps and skip irrelevant conditional steps. Default step set:
- [x] Discovery Interview (idea)
- [x] Market Research (web-research)
- [x] Deep Research (deep-research)
- [x] Business Evaluation (business-evaluation)
- [x] Refine to PBI (refine)
- [x] Domain Analysis & ERD (domain-analysis) — NEW
- [x] Tech Stack Research (tech-stack-research) — NEW
- [x] Implementation Plan (plan)
- [x] Plan Validation (plan-validate)
- [x] Test Strategy (spec [mode=tests]) — includes integration test strategy
- [x] User Stories (story)
- [x] Final Review (plan-review)

Auto-skip steps that are irrelevant to the prompt; mark skipped steps as completed with a short reason.

PLAN PHASES (quick reference):
- PLAN₁ (after architecture-design): High-level architecture plan. Scope: system design, layer boundaries, component responsibilities, tech choices. Followed by $security-review + $performance-review review of the architecture.
- PLAN₂ (after review-artifact --type=spec-tests): Sprint-ready implementation plan. Scope: concrete tasks, file changes, scaffolding needs, test infrastructure. Based on: stories + test specs from TDD-SPEC₁.
- PLAN₃ (after TDD-SPEC₂ post-implementation): Integration test architecture plan. Scope: test file structure, test data setup, CI integration. Based on: implementation code + updated test specs.
The three plans serve progressively detailed purposes — architecture → implementation → test infrastructure.

SECOND PLANNING ROUND:
After stories + TDD specs are generated and reviewed, a second $plan + $plan-review cycle runs.
This second plan incorporates the concrete stories, test specs, and dependency tables into a detailed implementation plan.
The first plan is high-level architecture; the second plan is sprint-ready with phased implementation steps.

ARCHITECTURE SCAFFOLDING (after second plan-review, CONDITIONAL):
The $scaffold step is CONDITIONAL — AI must first self-investigate for existing base abstractions.
Grep for: abstract/base classes, generic interfaces, infrastructure abstractions (IRepository, IUnitOfWork), utility layers (Extensions, Helpers, Utils), frontend foundations (base component/service/store), DI registrations.
If existing scaffolding found → SKIP $scaffold step, mark completed.
If NO foundational abstractions found → PROCEED: create all base abstract classes, generic interfaces, infrastructure abstractions, and shared utilities with OOP/SOLID principles BEFORE any feature story implementation.
All infrastructure behind interfaces with at least one concrete implementation (Dependency Inversion).
The scaffolded project should be copy-ready as a starter template for similar projects.

IMPLEMENTATION & INTEGRATION TESTING (after scaffold):
After scaffolding, the workflow continues with full implementation and integration testing:
1. $why-review validates design rationale before coding
2. $cook implements the feature (backend + frontend)
3. $review-domain-entities reviews domain entity DDD quality — CONDITIONAL: skip if no domain entity files in changeset. Detects anemic model, missing invariants, VO misclassification before integration tests are written.
4. $spec [mode=tests] writes test specifications (feature doc Section 8)
5. $review-artifact --type=spec-tests validates spec coverage and correctness
6. Third $plan + $plan-review cycle plans integration test architecture
7. $integration-test generates integration tests from specs
8. $test runs all tests to verify TCs pass
9. $workflow-review-changes for quality (use the canonical review-changes workflow sequence from .claude/workflows.json: review-changes, why-review findings validation, parallel review batch, code-simplifier, verification, plan/plan-review/why-review/cook, and full re-review restart)
10. $sre-review + $security-review for production readiness
11. $changelog + final $test + $docs-update + $watzup to close
This ensures greenfield projects ship with integration test coverage from day one.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-idea-to-pbi — Idea to PBI

- Description: PO/BA workflow (idea → specs → from specs to PBI): capture or review idea/artifact, refine, generate TDD test specs from the idea, model the domain, plan, derive the PBI and user stories, challenge review, DoR gate, mockup, prioritize
- When To Use: PO or BA wants to take a raw idea — OR PO is handing off an existing artifact/ticket/brief to BA — through to a grooming-ready PBI with user stories, TDD test specifications, Dev BA PIC challenge review, DoR validation, wireframes, and backlog prioritization
- When Not To Use: Already have a drafted PBI (use pbi-challenge standalone), already have canonical Feature Specs and only need the backlog (use workflow-spec-to-pbi for spec-first entry), implementing a workflow-feature (use workflow-feature or workflow-big-feature)
- Sequence: `idea -> review-artifact -> refine -> why-review -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> domain-analysis -> why-review -> plan -> plan-review -> plan-validate -> why-review -> review-artifact --type=pbi -> story -> why-review -> review-artifact --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> prioritize -> docs-update -> workflow-end -> watzup`

Protocol:

```text
IDEA TO PBI PROTOCOL:
Capture and refine a raw idea — or a handed-off artifact/ticket/brief — into a grooming-ready PBI via an idea → test specs → (from those specs) PBI/stories/plan flow, with domain analysis, challenge review, DoR validation, and wireframe. Apply the shared SDD Artifact Contract from shared/sdd-artifact-contract.md in the active skills root and read docs/project-config.json plus docs/project-reference/docs-index-reference.md for project-specific conventions. Any supported AI tool may produce or review artifacts when this context is synced.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. Each step must invoke its skill invocation — never batch-complete or skip steps
2. review-artifact is CONDITIONAL — skip if no existing artifact; proceed straight to refine
3. why-review runs after refine, after spec [mode=tests], after domain-analysis, after plan-validate, and after story. The standalone gate after review-artifact --type=pbi is omitted because review-artifact --type=pbi (like every review skill) self-invokes $why-review --validate-findings internally as a Findings Validation Gate. Each gate validates WHY before the next artifact step proceeds. FAIL blocks the next artifact step; WARN requires user acknowledgment.
4. spec [mode=tests] and review-artifact --type=spec-tests run right after refine (BEFORE the PBI is drafted) so the idea is captured as testable TC specifications first; domain-analysis and plan/plan-review/plan-validate (grafted from the spec-to-pbi analytical half), then the PBI and stories, are derived FROM those specs (idea → specs → from specs to PBI)
5. pbi-challenge is run by a reviewer different from the drafter — confirm reviewer identity before that step
6. dor-gate must pass (PASS or WARN) before pbi-mockup is finalized
7. Save artifacts at every step to the workflow artifact paths used by the child skills. If artifact roots become configurable later, update the workflow and child skills in the same change.
8. Write output IMMEDIATELY after each step — never batch
9. Run docs-update after prioritize and before workflow-end so specs, workflow-feature docs, and TDD/spec docs stay synchronized
10. Treat AI-generated ideas, PBIs, stories, mockups, and TCs as draft/reference until the owning review or acceptance gate approves them.

STEP SELECTION GATE:
After workflow activation, present the full step list and let user deselect irrelevant ones:
- [x] Idea capture (idea)
- [ ] Review existing artifact (review-artifact) — CONDITIONAL: only if PO artifact/ticket exists
- [x] Refine to PBI (refine) — hypothesis, AC, RICE, GIVEN/WHEN/THEN
- [x] Refinement rationale review (why-review) — after refine
- [x] Test specifications (spec [mode=tests]) — generate TCs FROM the refined idea (idea → specs)
- [x] Test-spec rationale review (why-review) — after spec [mode=tests]
- [x] Test specification review (review-artifact --type=spec-tests)
- [x] Domain analysis (domain-analysis) — CONDITIONAL: skip if no new/changed entities; model aggregates/ERD
- [x] Domain rationale review (why-review) — after domain-analysis
- [x] Implementation plan (plan)
- [x] Plan review (plan-review)
- [x] Plan validation (plan-validate)
- [x] Plan rationale review (why-review) — after plan-validate
- [x] PBI review (review-artifact --type=pbi)
- [x] User stories (story)
- [x] Story rationale review (why-review) — after story
- [x] Story review (review-artifact --type=story)
- [x] Dev BA PIC challenge (pbi-challenge)
- [x] Definition of Ready gate (dor-gate)
- [x] PBI mockup/wireframe (pbi-mockup) — CONDITIONAL: skip for backend-only PBIs
- [x] Backlog prioritization (prioritize)
- [x] Documentation synchronization (docs-update) — near-final sync for specs, workflow-feature docs, and TDD/spec docs

WHY-REVIEW GATES (repeated, purpose-specific):
Run in sequence after refine, after spec [mode=tests], after domain-analysis, after plan-validate, and after story (the after-plan-validate gate covers the rationale before review-artifact --type=pbi; review-artifact --type=pbi also self-invokes $why-review --validate-findings internally as a Findings Validation Gate). Challenge the active artifact rationale before the next artifact step:
- Is this the right next artifact/solution to the stated problem? What was rejected and why?
- Are the acceptance criteria, story, or TC constraints justified? What breaks if they change?
- Pre-mortem: if this PBI ships and fails in 3 months, what breaks?
- Are there simpler alternatives the team has not considered?
Output: Why-Review checklist with PASS/WARN/FAIL + adversarial analysis section.
FAIL blocks the next artifact step — active artifact must be revised first.

TDD-SPEC GATE (after refine, BEFORE the PBI is drafted):
Map the refined idea’s acceptance criteria into TC specifications up front, so the PBI, stories, and plan are derived FROM the test specs:
- Each material acceptance criterion should map to at least one TC ID
- Route planned TC IDs to Feature doc Section 8 through $spec [mode=tests]; $docs-update later verifies workflow-feature docs and §8 TC ↔ integration test code sync
- Cover happy path, validation failure, authorization/permission, and important edge cases where applicable
- Review specs with review-artifact --type=spec-tests before pbi-challenge so reviewers evaluate a testable PBI
- AI-generated TC drafts are reference-only until review and DoR gates accept them.

HANDOFF:
At workflow-end, AI MUST ATTENTION present:
- Summary: PBI created, test specs created/reviewed, docs sync completed, DoR result (PASS/WARN/FAIL), any blocking items
- Recommended next workflow: $start-workflow workflow-feature or $start-workflow workflow-big-feature (if PBI is ready to implement)
- Any DoR failures: list specific blocking criteria that must be resolved
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-product-discovery — Product Discovery

- Description: Product discovery: raw vision or problem → structured brainstorm → prioritized opportunity map → N PBIs with stories, challenge review, DoR gate, and wireframes → cross-PBI ranked backlog ready for sprint planning
- When To Use: PO/BA wants to go from a raw product idea, vision, or problem statement through structured brainstorming into a prioritized backlog of multiple PBIs with stories, challenge review, DoR validation, wireframes, and cross-PBI ranking — full product discovery sprint output without implementation
- When Not To Use: Single well-defined workflow-feature (use workflow-feature or workflow-idea-to-pbi), implementation-only work (use workflow-feature or workflow-big-feature), bug fixes (use workflow-bugfix), research-only without PBI output (use $investigate skill or deep-research)
- Sequence: `brainstorm -> web-research -> domain-analysis -> why-review -> idea -> refine -> why-review -> review-artifact --type=pbi -> story -> why-review -> review-artifact --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> review-changes -> prioritize -> workflow-end -> watzup`

Protocol:

```text
PRODUCT DISCOVERY PROTOCOL:
Converts a raw product vision or problem statement into a grooming-ready backlog of multiple PBIs through structured PO/BA discovery techniques.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. EVERY workflow-research stage requires ask the user directly validation before proceeding
2. Save ALL artifacts to configured artifact and plan roots at EVERY step — write IMMEDIATELY after each task, never batch
3. $brainstorm output MUST produce a scored opportunity map (RICE) before any $idea step
4. TASK DECOMPOSITION GATE: After user selects opportunities, call task tracking for EVERY task (N opportunities x 8 steps = Nx8 tasks min) BEFORE processing any opportunity — do NOT start the loop without a complete task list
5. The workflow-idea-to-pbi loop (steps 4-11) repeats for EACH opportunity selected from the map — NOT just once
6. pbi-challenge requires Dev BA PIC (not the drafter) — confirm reviewer identity before that step
7. dor-gate must pass (PASS or WARN) before pbi-mockup
8. $prioritize at the end is cross-PBI — ranks ALL PBIs from this session together
9. This workflow produces a BACKLOG only — no implementation. Hand off to the workflow-feature or workflow-big-feature workflow.
10. SCALE MANAGEMENT: For 6+ opportunities, spawn one sub-agent per opportunity (each gets brainstorm context + task list); main context runs $prioritize at end. After every 3 opportunities, update session summary table.

STEP SELECTION GATE:
After workflow activation, auto-select the applicable steps and skip irrelevant conditional steps. Default step set:
- [x] Brainstorm — Double Diamond: problem frame, HMW, SCAMPER, opportunity map (RICE-scored)
- [x] Market Research (web-research) — CONDITIONAL: skip for internal tools or when domain is well-understood
- [x] Domain Analysis (domain-analysis) — CONDITIONAL: skip if no new domain entities involved
- [x] Idea capture (idea) — REPEATS per opportunity
- [x] PBI refinement (refine) — REPEATS per opportunity: hypothesis, AC, RICE, GIVEN/WHEN/THEN
- [x] PBI review (review-artifact --type=pbi) — REPEATS per opportunity
- [x] User stories (story) — REPEATS per opportunity
- [x] Story review (review-artifact --type=story) — REPEATS per opportunity
- [x] Dev BA PIC challenge (pbi-challenge) — REPEATS per opportunity
- [x] Definition of Ready gate (dor-gate) — REPEATS per opportunity
- [x] PBI mockup/wireframe (pbi-mockup) — CONDITIONAL per opportunity: skip for backend-only PBIs
- [x] Cross-PBI prioritization (prioritize)

MULTI-OPPORTUNITY LOOP (core mechanic):
The $brainstorm step produces a scored opportunity map — typically 3–8 opportunities ranked by RICE.
For EACH opportunity the team selects to develop:
  1. Run $idea to capture as structured artifact → configured idea artifact root
  2. Run $refine to create PBI with hypothesis, AC, RICE, GIVEN/WHEN/THEN → configured PBI artifact root
  3. Run $review-artifact --type=pbi — BA quality check
  4. Run $story — user stories per PBI
  5. Run $review-artifact --type=story — story quality check
  6. Run $pbi-challenge — Dev BA PIC review (challenge prompts, AC quality, feasibility)
  7. Run $dor-gate — INVEST check, DoR pass/fail
  8. Run $pbi-mockup — wireframe (SKIP for backend-only PBIs)
After ALL opportunities are processed: run $prioritize across all PBIs.

BRAINSTORM STEP REQUIREMENTS:
- Detect scenario: problem-solving vs new product vs enhancement
- Apply Double Diamond: problem framing (5 Whys/HMW/JTBD) → opportunity framing (OST/Lean Canvas) → ideation (SCAMPER/Crazy 8s) → convergence (RICE/Kano/2x2)
- Output: opportunity map with 3–8 scored items
- Present map to user: 'Which opportunities should we develop into PBIs?' (ask the user directly, multiSelect: true)
- Document in plans/{plan-dir}/brainstorm-opportunity-map.md

CROSS-PBI PRIORITIZE STEP:
- Aggregate all PBIs produced in this session
- Apply cross-PBI RICE scoring and dependency graph
- Produce a sprint-ready ranked backlog
- Flag Must-Have vs Should-Have vs Could-Have per release scope
- Output: configured backlog artifact root/product-discovery-{date}-backlog.md

HANDOFF:
At workflow-end, AI MUST ATTENTION present:
- Summary: N PBIs created, X passed DoR, Y need rework
- Recommended next workflow: $start-workflow workflow-feature (implement the top-ranked PBI from the backlog) OR $start-workflow workflow-big-feature (if single large PBI needs deep workflow-research + implementation)
- Any PBIs that failed DoR gate: list blocking items

AUTO-SKIP RULES:
- web-research: skip if user says 'internal tool', 'well-understood domain', or 'no market workflow-research needed'
- domain-analysis: skip if no new entities/aggregates — ask: 'Does this product involve new domain entities?'
- pbi-mockup: skip per-PBI if PBI is backend-only (no UI changes)

WHY-REVIEW GATE (after domain-analysis, before per-opportunity loop):
Before committing to the per-PBI loop, validate the opportunity map rationale:
- Are the top-ranked opportunities truly the right problems to solve? What was deprioritized and why?
- Are RICE scores well-founded or speculative? Challenge Reach and Impact estimates.
- Pre-mortem: if these opportunities are built and miss in 6 months, what was the root cause?
- Are there systemic alternatives (e.g., platform change, process change) that make these opportunities unnecessary?
Output: Why-Review checklist with PASS/WARN/FAIL per opportunity.
FAIL on a high-ranked opportunity → remove from selection or revisit brainstorm framing.
WARN → document risk and proceed with user acknowledgment.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-refactor — Code Refactoring

- Description: Code improvement and restructuring workflow with search-first approach
- When To Use: User wants to restructure, reorganize, clean up, or improve existing code without changing behavior; technical debt
- When Not To Use: Bug fixes, new feature development
- Sequence: `scout -> investigate -> plan -> plan-review -> plan-validate -> why-review -> code -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> spec [mode=sync] -> integration-test -> integration-test-review -> integration-test-verify -> workflow-review-changes -> sre-review -> changelog -> test -> docs-update -> workflow-end -> watzup`

Protocol:

```text
Role: Refactoring Specialist
REFACTORING PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → workflowPatterns for project-specific architecture patterns, code hierarchy, and naming conventions.
⚠️ MANDATORY: Search existing code BEFORE planning
1. Scout: Find similar refactoring patterns, identify target architecture examples using Grep/Glob
2. Investigate: Study existing patterns - validate with 3+ codebase examples (NOT generic framework docs)
3. Plan: Identify code smells, define target architecture following discovered project patterns
4. Validate plan  --  ensure no behavioral changes, only structural
5. Validate design rationale with $why-review (features/refactors)
6. Implement incrementally  --  small, verifiable steps
7. Verify test specs still match after refactoring with $spec [mode=tests]. Review with $review-artifact --type=spec-tests. Sync Feature Spec §8 ↔ test code with $spec [mode=sync].
8. Verify/update integration tests with $integration-test — ensures tests reflect refactored code paths.
9. Simplify: Remove dead code, flatten nesting, extract duplicates
   CRITICAL: Before removing any code:
   - Use $investigate skill for 'unused' code verification
   - Require evidence: grep results + confidence ≥80% + cross-module/service validation
   - See Investigation Protocol (CLAUDE.md)
10. Code review: Verify no functional regressions
11. SRE review for production readiness
12. Update changelog with refactoring summary
13. Run tests  --  all existing tests MUST ATTENTION pass
14. Summary report of structural improvements

GUARDRAILS:
- Refactoring MUST ATTENTION NOT change observable behavior
- Follow project patterns from docs/project-config.json → workflowPatterns (architecture, code hierarchy, naming)
- Apply project code responsibility hierarchy from docs/project-config.json → workflowPatterns.codeHierarchy
- Provide file:line evidence of pattern search in plan

PERFORMANCE-SDD ROUTE: If this refactor is performance-driven (query optimization, caching, reducing allocations, improving throughput), run $performance-review for benchmark evidence while preserving observable behavior. Do not use performance/refactor scope to bypass spec, test, or docs sync when behavior, public contract, SLA, performance constraint, state timing boundary, or docs/spec boundary changes. Pure behavior-preserving optimization may skip new TC/integration-test generation only with explicit skip reason and invariant-preservation evidence. $test remains mandatory.
MANDATORY REFACTOR INVARIANT SAFETY GATES:
- Preserve existing intent/invariants; refactor MUST NOT change observable behavior unless explicitly approved.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-machine logic, tests MUST assert persisted transitions and invalid-transition rejection.
- Before $workflow-end, maintain three-way sync: spec docs ↔ TDD docs ↔ test code via $spec [mode=tests] + $review-artifact --type=spec-tests + $spec [mode=sync] + $integration-test + $integration-test-review + $integration-test-verify + $docs-update. Performance-driven refactors may delegate measurement to $performance-review, but observable behavior preservation and required spec/test/docs sync remain closure gates.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-research — Research & Synthesis

- Description: Research & Synthesis: gather web sources on a topic, then synthesize into one of four artifacts selected by --output — cited knowledge report (synthesis), business/market viability evaluation (business-eval), marketing strategy (marketing), or structured course material (course)
- When To Use: User wants to research a topic from web sources and synthesize the findings into a deliverable — a cited knowledge report, a business/market viability evaluation, a marketing strategy, or structured course material
- When Not To Use: Implementing code or features (use workflow-feature/big-feature), fixing bugs (use workflow-bugfix), updating project documentation (use the docs-update skill), investigating how existing code works (use $investigate skill), turning workflow-research into a PBI backlog (use workflow-product-discovery)
- Sequence: `web-research -> deep-research -> knowledge-synthesis -> knowledge-review -> workflow-end`

Protocol:

```text
RESEARCH & SYNTHESIS PROTOCOL:
The canonical entry point is the $workflow-research skill — it dispatches to one of four synthesis sequences via --output={synthesis|business-eval|marketing|course}. The Sequence below is the DEFAULT (--output=synthesis); for the other three intents keep the shared research scaffold (web-research → deep-research → … → knowledge-review → workflow-end) and swap ONLY the terminal synthesis skill(s) per the OUTPUT DISPATCH table.

OUTPUT DISPATCH (select by intent BEFORE creating tasks; default synthesis):
- synthesis (knowledge report): $web-research → $deep-research → $knowledge-synthesis → $knowledge-review → $workflow-end
- business-eval (business/market evaluation): $web-research → $deep-research → $market-analysis → $business-evaluation → $knowledge-review → $workflow-end
- marketing (marketing strategy): $web-research → $deep-research → $market-analysis → $strategy-builder → $knowledge-review → $workflow-end
- course (course material): $web-research → $deep-research → $course-builder → $knowledge-review → $workflow-end

RULES:
- Detect the target artifact from the prompt and pick the matching --output BEFORE creating tasks; if ambiguous, default to synthesis and state the assumption.
- Create the task tracking plan from the SELECTED --output sequence (not the default) when it differs.
- Each step MUST ATTENTION invoke its skill invocation — marking a task completed without skill invocation is a workflow violation.
- Keep claims evidence-based with cited sources; confidence >80% to assert.
- This workflow produces research artifacts only — no code implementation.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-review-changes — Review Current Changes

- Description: Review uncommitted changes, plan and fix issues, then re-review recursively until clean
- When To Use: User wants to review current uncommitted, staged, or unstaged changes before committing
- When Not To Use: PR reviews, codebase reviews, branch comparisons
- Sequence: `review-changes -> why-review -> [parallel ⇉ all-return barrier: review-architecture, review-domain-entities*, performance-review, integration-test-review, security-review] -> code-simplifier -> plan -> plan-review -> cook -> review-changes -> docs-update -> workflow-end -> watzup`
- Parallel phase = all-return barrier: spawn ALL members together (one message); advance only after EVERY member returns (a skipped conditional member, marked `*`, counts as returned). A sub-agent completion advances the step identically to an inline call.

Protocol:

```text
PRE-COMMIT REVIEW (RECURSIVE):

[BLOCKING] SEQUENCING RULE — review-changes (step 1) MUST run FIRST and complete before any other reviewer; why-review (step 2) runs immediately after to validate those findings before the parallel batch.
- Step 1 (`review-changes`) establishes the baseline: surface analysis (BE/FE/SCSS file counts), review mode (DIMENSIONAL/BE-ONLY/FE-ONLY/FE-SPLIT/TOOLING), integration test sync gaps, multilingual translation gaps. The parallel batch depends on this baseline summary.
- Step 2 (`why-review`) is a FINDINGS-VALIDATION gate: it sanity-checks the review-changes findings (each finding warranted, evidence-backed, not a false positive) BEFORE expensive parallel reviewers run. It validates findings only — NOT the fix plan (`plan-review` at step 10 reviews the fix plan's design). If step 1 found zero issues, step 2 passes through with nothing to validate.
- The PARALLEL BATCH (`review-architecture`, `review-domain-entities`, `performance-review`, `integration-test-review`, `security-review`) MUST be spawned together in a single message via specialized `spawn_agent` tool calls (`architect`, `code-reviewer`, `performance-optimizer`, `integration-tester`, `security-auditor`). They are read-only and independent — no shared mutable state, no ordering dependency between them.
- The UI/frontend quality gate (`$review-ui`) is NOT a separate workflow step — it is owned by `review-changes` (step 1), which invokes it internally (ui-ux-designer sub-agent) as its UI dimension whenever the diff contains files matching the project's configured frontend/UI file patterns. Skip entirely when no frontend files changed.
- `review-domain-entities` is a CONDITIONAL member of the batch: include it ONLY when domain entity files changed. Skip it entirely (do not spawn it) when its trigger files are absent.
- NEVER start the batch before steps 1 and 2 complete. NEVER serialize the batch (burns 50K+ tokens absorbing inline reports). NEVER start `code-simplifier` until ALL spawned sub-agents return — code-simplifier modifies code and must operate on the consolidated review snapshot.
- After the parallel batch returns: TaskUpdate the batch steps to completed, read all sub-agent reports, synthesize Critical/High/Medium/Low findings into a consolidation summary, then proceed to `code-simplifier` sequentially.

- Review all staged and unstaged changes
- Check for: security issues, debug artifacts (console.log, debugger), incomplete code, style violations
- Verify no sensitive files (.env, credentials) are staged
- Check architecture compliance, naming, patterns
- DOMAIN ENTITY REVIEW: If domain entity files in changeset (Domain/, Entities/, ValueObjects/ directories), run $review-domain-entities to check DDD quality (anemic model, VO immutability, invariant enforcement). Skip entirely if no entity files changed.
- UI/FRONTEND REVIEW: Owned by step 1 (`review-changes`). When the changeset contains files matching the project's configured frontend/UI file patterns, `review-changes` invokes $review-ui internally (ui-ux-designer sub-agent) as its UI dimension to check long-content overflow (wrap vs ellipsis+tooltip), responsive multi-screen via flex, flex-vs-fixed sizing (prefer min/max + flex-grow over fixed px), z-index scale discipline (no raw numbers, no !important), and SCSS/BEM quality. Not a separate workflow step. Skip entirely if no frontend files changed.
- Report findings with file:line references
- Output: PASS (safe to commit) or ISSUES FOUND (with list)
- If ISSUES FOUND: validate findings, plan fixes for validated findings, review and sanity-check the fix plan, implement fixes, then re-run review-changes (step 12)
- RECURSIVE (CONDITIONAL, INLINE): Step 12 re-runs `review-changes` INLINE in the main session — but ONLY if `cook` actually changed files. If `cook` applied no file changes, skip step 12 and go straight to docs-update. When it runs, loop plan -> cook -> review-changes until one complete review pass has zero findings; stop only when the same validated blocker repeats 3 full invocations with no progress.
- LOGIC REVIEW: Verify changes match their stated intention. Trace business logic paths. Clean code can be wrong code.
- BUG DETECTION: Check for null safety, boundary conditions, resource leaks, concurrency issues per bug-detection-protocol.
- TEST SPEC VERIFICATION: Cross-reference changes against TC-{FEATURE}-{NNN} test specifications. Flag untested code paths.
- INTEGRATION TEST SYNC: Identify changed business logic files (handlers, services, controllers, commands, queries, resolvers — infer from project conventions). For each, verify a corresponding test file exists. If missing, surface to user via ask the user directly — mandatory, not advisory.
- MULTILINGUAL UI SYNC CHECK: If UI-facing files changed and project localization is multilingual (`localization.enabled` + `supportedLocales.length > 1`), verify translation file updates. If missing, surface via ask the user directly — mandatory, not advisory.
- DOC SYNC DEFERRAL: DO NOT update Feature Specs or test spec TCs during review steps. The dedicated docs-update step handles all of this: $spec (§1-7 Feature Spec) + $spec [mode=tests] (§8 test spec update) + $spec [mode=sync] (§8 TCs ↔ test code) + optional $spec-index [mode=index] (derived bucket INDEX/ERD refresh). TEST SPEC VERIFICATION above is READ-ONLY cross-reference only — flag gaps, do not write.
MANDATORY REVIEW-CHANGES GATES:
- SPEC/TDD/TEST THREE-WAY SYNC is blocking: changed behavior must match specs + TCs + test code.
- SPEC DRIFT ADJUDICATION (apply SYNC:spec-drift-adjudication): for every behavior-changing file, do NOT silently flag a one-directional 'stale doc'. Adjudicate per shared/sdd-artifact-contract.md Drift Gates whether the divergence is CODE-WRONG (change violates an intended spec rule/AC/invariant -> BLOCKING finding, fix code/test against intended behavior) or SPEC-STALE (intentional new behavior the spec no longer reflects -> run $spec [mode=update] FIRST, then $spec [mode=tests] + $spec [mode=sync]); AMBIGUOUS -> ask the user directly before editing either side. Never normalize drift just because code/tests are green. Unadjudicated behavior-vs-spec divergence is a blocking finding.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-transition changes, verify persisted-state assertions and invalid-transition rejection tests.
- Missing or stale docs/tests are blocking findings; route fixes through $spec [mode=tests] + $review-artifact --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec [mode=sync] + $docs-update.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-seed-test-data — Seed Test Data

- Description: Generate or enhance test data seeders that simulate QC happy-path scenarios for a feature area. Scouts existing patterns, implements idempotent command-based seeders, reviews compliance, simplifies.
- When To Use: User wants to seed test data, implement data seeders, generate realistic development environment data, add happy-path scenarios for a feature, create dummy data for manual QC testing, fill dev database with realistic test cases
- When Not To Use: Writing integration tests (use workflow-write-integration-test), production data migration (use $db-migrate skill), seeding reference/config data without domain commands
- Sequence: `scout -> investigate -> seed-test-data -> review-changes -> code-simplifier -> docs-update -> workflow-end -> watzup`

Protocol:

```text
SEED TEST DATA PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → 'Data Seeders' context group for project-specific seeder base class, file location, config keys, and DI registration pattern. Then read docs/project-reference/seed-test-data-reference.md for the complete project-specific implementation guide.

UNIVERSAL RULES (apply to ALL projects):
1. Environment gate FIRST — development or config-enabled only. NEVER production.
2. Command-based ONLY — call application-layer commands. NEVER direct DB/repo for domain entities. Seeder = QC orchestrator.
3. No duplicate logic — commands own validation + domain rules; seeder provides valid inputs.
4. Idempotency — check existing count BEFORE seeding; seed only remaining = target - existing.
5. Count-configurable — read count from project config key (see project-config.json). Loop from existing to target.
6. Restart-safe — idempotency inherently handles restarts.

PROJECT-SPECIFIC CONTEXT:
- Read docs/project-config.json → 'Data Seeders' rules for environment gate key, count key, and DI registration.
- Read docs/project-reference/seed-test-data-reference.md for implementation template, reference files, and project-specific DI scope rules.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-spec-driven-dev — Spec-Driven Development

- Description: Unified spec-driven development — authors and maintains ONE canonical artifact per capability: the tech-free 8-section Feature Spec at docs/specs/{Bucket}/README.{Feature}.md (code is the technical source of truth; derived bucket INDEX/ERD are regenerable aids). Modes: init-full (zero → Feature Specs), update (incremental sync from code changes), audit (staleness check).
- When To Use: Initial Feature Spec generation from zero docs, maintaining spec sync after code changes, quarterly spec health audits, before tech migrations, after major features land — authors + three-way-syncs the canonical Feature Spec. Use spec-index instead when only regenerating derived indexes/ERDs.
- When Not To Use: Understanding one specific feature (use $investigate skill), authoring/updating a single Feature Spec (use spec directly), regenerating only the derived bucket index/ERD (use spec-index directly)
- Sequence: `scout -> plan -> plan-review -> plan-validate -> spec -> spec [mode=tests] -> review-artifact --type=spec-tests -> review-artifact -> docs-update -> workflow-end -> watzup`

Protocol:

```text
SPEC-DRIVEN-DEV PROTOCOL:
Modes: init-full | update | audit.
Step 0: auto-detect mode, map changed services → App Bucket, confirm capability name(s).
Scale gate: 4+ capabilities = MUST spawn one spec sub-agent per capability in ONE message.
ONE canonical artifact: docs/specs/{Bucket}/README.{Feature}.md (tech-free 8-section Feature Spec; §5 holds the Mermaid ERD INLINE). No separate A-E engineering tree — code is the technical source of truth. Derived bucket INDEX.md/ERD are optional regenerable aids (spec-index mode=index).
Update mode: git diff → impact map → spec [mode=update] (§1-7) → spec [mode=tests] (§8) → review-artifact --type=spec-tests → spec [mode=sync] (§8 ↔ test code) → optional spec-index index refresh.
New PBI/requirement update mode: run dor-gate when a new/changed PBI is being made implementation-ready; run pbi-mockup only for UI/user-journey changes.
Audit mode: compare Feature Spec git-history timestamps vs source-code git log → staleness reports.
See .claude/skills/workflow-spec-driven-dev/SKILL.md for full protocol.
MANDATORY SPEC-DRIVEN SYNC GATES:
- Three-way sync contract (Feature Spec §1-7 ↔ §8 TCs ↔ test code, including the STATE MACHINE DATA ASSERT mandate) is canonical in docs/project-reference/spec-system-reference.md → Three-Way Sync Triad — follow it exactly.
- Run docs-update as a near-final sync before workflow-end; watzup runs after workflow-end for every mode to keep Feature Specs and derived indexes aligned.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-spec-sync — Spec Sync (Post-Change)

- Description: Update test specs and feature docs after code changes, bug fixes, or PR reviews
- When To Use: After fixing a bug update test specs, after code changes update test specs, after PR review update test specs, sync test specs after changes, update test documentation after implementation
- When Not To Use: New workflow-feature implementation (use workflow-feature), no code changes yet, idea refinement
- Sequence: `workflow-review-changes -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> spec [mode=sync] -> integration-test -> integration-test-review -> integration-test-verify -> test -> docs-update -> workflow-end`

Protocol:

```text
TEST SPEC UPDATE WORKFLOW:
Use after code changes, bug fixes, or PR reviews to keep test specs in sync.
1. Review what changed (git diff or PR diff)
2. Update test specs in the Feature Spec §8 (Test Specifications) using $spec [mode=tests] — §8 is the canonical in-place home; there is no separate dashboard (retired 2026-06-10)
3. Sync §8 ↔ integration test code via $spec [mode=sync] (forward: §8 TCs → test code)
4. Generate/update integration tests for changed TCs
5. Run tests to verify

Key: $spec [mode=tests] diffs existing TCs against current code, adds regression TCs for bugfixes.
MANDATORY TEST-SPEC UPDATE GATES:
- Treat spec docs + Section 8 as intent/invariant source; do not encode buggy behavior as expected.
- Three-way sync contract (§8 TCs ↔ test code, including the STATE MACHINE DATA ASSERT mandate for affected lifecycle transitions) is canonical in docs/project-reference/spec-system-reference.md → Three-Way Sync Triad — follow it exactly.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-spec-to-pbi — Spec to PBI Backlog

- Description: Generate a complete, dependency-aware PBI backlog from existing canonical Feature Specs (docs/specs/{Bucket}/). Audits spec freshness, decomposes large Feature Specs by capability and feature, creates PBIs/stories/DoR evidence, and produces a ranked backlog.
- When To Use: User wants to create all PBIs from an existing Feature Spec, convert a large Feature Spec into a complete prioritized backlog, generate dependent PBIs from docs/specs, split a very big Feature Spec into sprint-ready PBIs, or produce a ranked implementation order from a bucket of Feature Specs.
- When Not To Use: Raw product vision without any Feature Spec (use workflow-product-discovery), one informal idea (use workflow-idea-to-pbi), implementation work after PBIs are ready (use workflow-feature or workflow-big-feature), spec generation/update only (use workflow-spec-driven-dev).
- Sequence: `scout -> spec-index -> domain-analysis -> why-review -> plan -> plan-review -> plan-validate -> why-review -> refine -> why-review -> review-artifact --type=pbi -> story -> why-review -> review-artifact --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> prioritize -> docs-update -> workflow-end -> watzup`

Protocol:

```text
SPEC TO PBI BACKLOG PROTOCOL:
Use when the user has existing canonical Feature Specs at docs/specs/{Bucket}/README.{Feature}.md and wants all implementable PBIs created from them.

MANDATORY RULES:
1. Treat the Feature Specs as canonical input; do not brainstorm unrelated opportunities. Decompose each PBI from spec sections (§3 US/AC, §4 BR, §5 ERD, §6 flows, §7 permissions, §8 TCs).
2. Run spec-index audit first if a Feature Spec may be stale vs code.
3. Build a capability x feature/operation inventory before creating any PBI.
4. Decompose large Feature Specs into independently deliverable vertical slices. Create explicit shared/foundation PBIs for cross-cutting prerequisites.
5. For each PBI, include acceptance criteria, story points, dependencies, priority, domain impact, spec [mode=tests] needs, and DoR status. Carry §4 BR-/§3 US- logical IDs as the primary citation spine.
6. Run domain-analysis when the spec implies new/changed entities, aggregates, invariants, state machines, or cross-service ownership.
7. Run prioritize once at the end across all generated PBIs to produce a dependency-aware ranked backlog.
8. Write artifacts immediately after each capability/feature is processed; never hold all PBIs in memory.
9. Run docs-update after prioritize and before workflow-end so Feature Specs (§8) and derived indexes stay synchronized.

SCALE GATE:
- 1-3 capabilities: process inline with task tracking.
- 4-10 capabilities: split tasks by capability and feature group.
- 10+ capabilities or very large specs: process incrementally by capability group, maintain a coverage matrix, and stop only when every spec feature is mapped to PBI/Shared Task/Out-of-scope.

OUTPUTS:
- team-artifacts/pbis/{date}-pbi-{slug}.md for each PBI.
- team-artifacts/backlog/spec-to-pbi-{date}-backlog.md with rank, dependency graph, priority, and recommended order.
- plans/reports/spec-to-pbi-{date}-{bucket}.md with source spec coverage and unresolved questions.
- docs-update report confirming Feature Specs and derived indexes are synchronized.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-visualize — Visual Diagram

- Description: Create visual Excalidraw diagrams from codebase investigation or web research
- When To Use: User wants to visualize, diagram, draw, or create visual representation of workflows, architectures, concepts, systems, or research findings
- When Not To Use: Text-only documentation, code implementation, bug fixes, non-visual outputs
- Sequence: `scout -> investigate -> excalidraw-diagram -> workflow-end`

Protocol:

```text
VISUAL DIAGRAM PROTOCOL:
This workflow creates Excalidraw diagrams. Two paths based on source:

PATH A — Codebase Visualization (default if topic is about this project):
1. Scout: Find relevant files, architecture, and code patterns
2. Investigate: Trace code paths, understand relationships and data flow
3. Diagram: Generate .excalidraw file visualizing the findings

PATH B — Knowledge Visualization (if topic requires web research):
1. Web Research: Research the topic broadly (max 10 WebSearch)
2. Deep Research: Deep-dive into top sources (max 8 WebFetch)
3. Diagram: Generate .excalidraw file visualizing the synthesized knowledge

GUARDRAILS:
- Ask user which path (A or B) if ambiguous
- Output .excalidraw files to docs/diagrams/ (create dir if needed)
- Use kebab-case filenames describing the diagram subject
- MUST ATTENTION render and validate diagram (render-view-fix loop)
- Read references/color-palette.md and references/element-templates.md before generating
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-write-integration-test — Write Integration Tests

- Description: Write or update integration tests for existing code — spec-first: investigate domain logic → write/update specs → generate test code → 7-gate review (incl. change coverage) → run and verify
- When To Use: Write integration tests for a specific command/handler, add test coverage to an untested feature, update integration tests after code changes, integration test authoring from scratch for a feature area, cover uncommitted code changes with integration tests, generate integration tests from existing test specs or feature docs, review/audit existing integration tests for quality, flakiness, traceability, or failures
- When Not To Use: No implementation yet (use workflow-feature or workflow-bugfix), spec-only with no code generation (use $spec [mode=tests] directly)
- Sequence: `scout -> investigate -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> integration-test -> integration-test-review -> integration-test-verify -> spec [mode=sync] -> docs-update -> workflow-end -> watzup`

Protocol:

```text
WRITE INTEGRATION TEST PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → framework.integrationTestDoc for project-specific test patterns, helper classes, and async wait conventions.
⚠️ MANDATORY: Understand domain logic BEFORE writing assertions
1. Scout: Find target command/handler files; locate existing integration tests in same service for pattern matching
2. Investigate: Read the handler/entity/event source — understand WHAT fields change, WHAT entities are created/updated/deleted, WHAT event handlers fire. This is the prerequisite for correct assertions.
3. TDD Spec: Write/update test specs in feature doc Section 8 (TC-{FEATURE}-{NNN} codes). Path: docs/specs/{Bucket}/README.{Feature}.md. Authors new TCs and updates existing TCs for changed behavior.
4. TDD Spec Review: Validate spec coverage — GIVEN/WHEN/THEN completeness, happy path + validation failure + auth paths, no duplicate TC codes
5. Integration Test: Generate test files from TC specs. FROM-PROMPT for specific target, FROM-CHANGES for git diff.
   RULES (project-specific patterns from docs/project-config.json → framework.integrationTestDoc):
   - NO smoke-only tests (no-exception alone is FORBIDDEN)
   - ALL DB assertions wrapped in project async-wait helper
   - ALL string data uses project unique-data helper
   - Each test method has TC spec annotation linking to TC-{FEATURE}-{NNN}
   - Minimum 3 tests per command: happy path + validation failure + DB state check
6. Integration Test Review: 7-gate quality check (assertion value, data state, repeatability, domain logic, traceability, three-way sync, change coverage). Gate 7: every behavior-changing production file in the change set maps to a covering test (integration-first; unit fallback needs justification) AND a spec TC. Validate findings, fix only validated issues, then restart the full integration-test review after fixes. NEVER proceed with CRITICAL/HIGH issues outstanding.
7. Integration Test Verify: Run tests via quickRunCommand from docs/project-config.json → integrationTestVerify. Report exact pass/fail counts with test runner output. NEVER mark complete without real output.
8. Test Specs Docs: Sync cross-module spec dashboard. Update IntegrationTest fields with {File}::{MethodName} traceability links.
9. Docs Update: Update feature doc evidence fields and version history if test coverage changed materially.
10. Summary report

GUARDRAIL: Read handler source BEFORE writing any assertions. Use project async-wait helper for all DB assertions — no exceptions.
MANDATORY WRITE-INTEGRATION-TEST GATES:
- Read docs/project-reference/spec-principles.md before $spec [mode=tests] and keep invariant language explicit in TCs.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-machine behavior, generated integration tests MUST assert persisted state transitions and invalid-transition rejection.
- Maintain three-way sync before $workflow-end: spec docs ↔ TDD docs ↔ test code via $spec [mode=tests] + $review-artifact --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec [mode=sync] + $docs-update.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

<!-- CK:WORKFLOW-SKILLS -->

## Workflow & Skills Catalog

Session-start reference derived from `.claude/workflows.json` — use it to pick a route on any prompt: run a standard workflow, compose a custom workflow from the step-skills, invoke a single skill, or execute directly.

### Workflow Skills (53 composable steps)

Distinct step-skills used across the workflows above — compose these into a custom workflow when no standard workflow fits.

| Skill                     | Use for                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `architecture-design`     | [Architecture] Use when designing solution architecture across backend, frontend, deployment, monitoring, testing, and code quality.                                                                                                                                                                                                                                               |
| `brainstorm`              | [Content] Use when you need to brainstorm as a PO/BA — structured ideation for problem-solving, new product creation, or feature enhancement.                                                                                                                                                                                                                                      |
| `business-evaluation`     | [Content] Use when you need to evaluate business idea viability: Business Model Canvas, financial projections, risk matrix, go-to-market, execution plan.                                                                                                                                                                                                                          |
| `changelog`               | [Documentation] Use when you need to generate or update changelog entries.                                                                                                                                                                                                                                                                                                         |
| `code`                    | [Implementation] Use when you need to start coding & testing an existing plan. Flags: --approval=off (auto/trust mode, no approval gate), --tests=off (skip the test step), --parallel (parallel phase execution via subagents).                                                                                                                                                   |
| `code-simplifier`         | [Code Quality] Use when you need to simplify and refine code for clarity, consistency, and maintainability while preserving all functionality.                                                                                                                                                                                                                                     |
| `cook`                    | [Implementation] Use when you need to implement a feature [step by step].                                                                                                                                                                                                                                                                                                          |
| `debug-investigate`       | [Fix & Debug] Use when investigating a bug''s root cause — reproduce the symptom, trace it end-to-start through the code, form and test hypotheses, and pinpoint the defect before any fix.                                                                                                                                                                                        |
| `deep-research`           | [Research] Use when deeply researching top sources from web-research.                                                                                                                                                                                                                                                                                                              |
| `docs-update`             | [Documentation] Use when updating impacted documentation after code, spec, or test changes.                                                                                                                                                                                                                                                                                        |
| `domain-analysis`         | [Architecture] Use when you need to analyze business domain: bounded contexts, aggregates, entities, ERD, domain events, and cross-context integration.                                                                                                                                                                                                                            |
| `dor-gate`                | [Code Quality] Use when you need to validate a PBI against Definition of Ready before grooming.                                                                                                                                                                                                                                                                                    |
| `e2e-test`                | [Testing] Use when generating, updating, or maintaining E2E tests from recordings, specs, or code changes.                                                                                                                                                                                                                                                                         |
| `excalidraw-diagram`      | [Utilities] Use when the user wants to visualize workflows, architectures, or concepts as Excalidraw diagram JSON files.                                                                                                                                                                                                                                                           |
| `fix`                     | [Implementation] Use when you need to analyze and fix issues [INTELLIGENT ROUTING]. Flag: --target={ci\|issue\|logs\|test\|types\|ui} scopes the fix; --target=types resolves TypeScript errors inline.                                                                                                                                                                            |
| `harness-setup`           | [Quality] Use when setting up an agent quality harness with feedforward guides and feedback sensors.                                                                                                                                                                                                                                                                               |
| `idea`                    | [Project Management] Use when capturing new ideas, feature requests, or concepts for future refinement.                                                                                                                                                                                                                                                                            |
| `integration-test`        | [Testing] Use when you need to generate or review integration tests.                                                                                                                                                                                                                                                                                                               |
| `integration-test-review` | [Code Quality] Use when you need to review integration tests for assertion quality, bug protection, repeatability, and test-spec traceability — AND verify the review target (changed production code) has test coverage (integration-first) with spec↔test↔code alignment.                                                                                                        |
| `integration-test-verify` | [Testing] Use when you need to verify integration tests pass after writing and reviewing them.                                                                                                                                                                                                                                                                                     |
| `investigate`             | [Fix & Debug] Use when you need to investigate and explain how existing features or logic work. Flag: --mode=explain produces a one-way developer-narrative explanation (Purpose → How → Why → Impact) tuned by coding level; use $understand for the standalone prompt-driven explainer.                                                                                          |
| `knowledge-review`        | [Research] Use when you need to review knowledge artifacts for completeness, citation quality, confidence accuracy, and template compliance.                                                                                                                                                                                                                                       |
| `knowledge-synthesis`     | [Research] Use when you need to synthesize research findings into structured report using template.                                                                                                                                                                                                                                                                                |
| `linter-setup`            | [Quality] Use when you need to research and configure code quality tooling for any tech stack — linters, formatters, static analysis, pre-commit hooks, and CI gates.                                                                                                                                                                                                              |
| `pbi-challenge`           | [Code Quality] Use when you need an AI-assisted Dev BA PIC review of PBI drafts.                                                                                                                                                                                                                                                                                                   |
| `pbi-mockup`              | [Project Management] Use when you need to generate an HTML mockup report from PBI and story artifacts.                                                                                                                                                                                                                                                                             |
| `performance-review`      | [Debugging] Use when analyzing or optimizing performance bottlenecks: database queries, N+1 fan-out, indexing, API latency, memory, concurrency, frontend rendering, caching, and distributed paths.                                                                                                                                                                               |
| `plan`                    | [Planning] Use when you need intelligent plan creation with prompt enhancement. Flag: --mode={ci\|cro} (default none — standard planning); --mode=ci plans a fix from a GitHub Actions CI run/log, --mode=cro plans conversion-rate optimization (25-item CRO framework).                                                                                                          |
| `plan-review`             | [Planning] Use when you need to auto-review a plan for validity, correctness, and best practices — recursive: review, validate findings with why-review, fix validated findings, full re-review until no findings.                                                                                                                                                                 |
| `plan-validate`           | [Planning] Use when you need to validate a plan with critical questions interview.                                                                                                                                                                                                                                                                                                 |
| `prioritize`              | [Project Management] Use when you need to prioritize backlog items using RICE, MoSCoW, or Value-Effort frameworks.                                                                                                                                                                                                                                                                 |
| `prove-fix`               | [Code Quality] Use when you need to prove fix correctness with code proof traces, confidence scoring, and stack-trace-style evidence chains.                                                                                                                                                                                                                                       |
| `refine`                  | [Project Management] Use when converting ideas to PBIs, validating problem hypotheses, adding acceptance criteria, or refining requirements.                                                                                                                                                                                                                                       |
| `review-architecture`     | [Code Quality] Use when reviewing architecture compliance for layers, messaging, service boundaries, CQRS, repos, and entity events.                                                                                                                                                                                                                                               |
| `review-artifact`         | [Code Quality] Use when you need to review artifact quality (PBI, user story, test spec, design spec) before handoff. Supports --type={pbi\|story\|spec-tests\|design}.                                                                                                                                                                                                            |
| `review-changes`          | [Code Quality] Use when reviewing current changes, staged or unstaged diffs, or branch-to-branch diffs.                                                                                                                                                                                                                                                                            |
| `review-domain-entities`  | [DDD Quality] Use when you need to review domain entities and value objects for DDD design quality.                                                                                                                                                                                                                                                                                |
| `review-post-task`        | [Code Quality] Use when you need two-pass code review for task completion.                                                                                                                                                                                                                                                                                                         |
| `scaffold`                | [Architecture] Use when scaffolding reusable OOP/SOLID project foundations before feature implementation.                                                                                                                                                                                                                                                                          |
| `scout`                   | [Investigation] Use when quickly locating relevant files and affected areas across a large codebase.                                                                                                                                                                                                                                                                               |
| `security-review`         | [Code Quality] Use when you need to perform a security review or audit on any scope — application code (OWASP Top 10 2025), secrets exposure, dependency/supply-chain malware, third-party repository vetting before install, infrastructure/config, CI/CD pipeline, AI-agent risks, and host/VPS compromise detection.                                                            |
| `seed-test-data`          | [Dev Data] Use when you need to implement or enhance test data seeders that simulate QC happy-path scenarios via application-layer commands.                                                                                                                                                                                                                                       |
| `spec`                    | [Documentation] Use to author, audit, amend, or test-spec a business Feature Spec. The single spec skill — modes init\|update\|audit\|amend create/maintain the tech-free 8-section Feature Spec; tests generates Section 8 TC-{FEATURE}-{NNN} test specifications; sync reconciles §8 TCs ↔ integration test code. Per-mode procedure lives in references/{author,tests,sync}.md. |
| `spec-index`              | [General] Use when you need to (re)generate a DERIVED navigation index, cross-capability ERD, or reimplementation guide assembled FROM the canonical Feature Specs under docs/specs/\*\*. Never extracts a separate A-E engineering tree.                                                                                                                                          |
| `sre-review`              | [Code Quality] Use when reviewing service-layer and API changes for production readiness.                                                                                                                                                                                                                                                                                          |
| `story`                   | [Project Management] Use when creating user stories from PBIs, slicing features, or breaking down requirements.                                                                                                                                                                                                                                                                    |
| `tech-stack-research`     | [Architecture] Use when you need to research, analyze, and compare tech stack options as a solution architect.                                                                                                                                                                                                                                                                     |
| `test`                    | [Testing] Use when you need to run tests locally and analyze the summary report.                                                                                                                                                                                                                                                                                                   |
| `watzup`                  | [Utilities] Use when you need to review recent changes and wrap up the work.                                                                                                                                                                                                                                                                                                       |
| `web-research`            | [Research] Use when starting a web research task — discover, gather, and triage candidate sources on a topic to feed deeper investigation.                                                                                                                                                                                                                                         |
| `why-review`              | [Code Quality] Use when reviewing rationale and change quality for plans, PBIs, commits, diffs, docs, specs, reports, or explicit artifacts.                                                                                                                                                                                                                                       |
| `workflow-end`            | [Process] Use when you need to end the active workflow and clear state.                                                                                                                                                                                                                                                                                                            |
| `workflow-review-changes` | [Workflow] Use when activating the Review Current Changes workflow for review, fix, and re-review recursively until all issues resolved.                                                                                                                                                                                                                                           |

<!-- /CK:WORKFLOW-SKILLS -->

<!-- WORKFLOWS:END -->
