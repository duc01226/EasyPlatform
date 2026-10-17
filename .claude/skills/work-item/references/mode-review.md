# `/work-item --mode=review` — artifact quality review reference

> Loaded by `work-item/SKILL.md`'s Mode Dispatch when invoked as `/work-item --mode=review [--type={task|story|spec-tests|design}] [artifact path]`. This contract is the whole invocation: review one artifact (task, story, test spec or design spec) for completeness and quality before handoff. It works called directly with no workflow; every rule, flag, output and gate below is the contract of that mode.

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

## Contents

- [Quick Summary](#quick-summary)
- [First Principle — Easy to Change · Easy to Scale · Easy to Maintain](#first-principle--easy-to-change--easy-to-scale--easy-to-maintain)
- [Adversarial Review Mindset (NON-NEGOTIABLE)](#adversarial-review-mindset-non-negotiable)
- [Type-Specific Checklists (`--type` dispatch)](#type-specific-checklists---type-dispatch)
- [M1-M7 Compliance Gate (BLOCKING — applies to ALL artifact types)](#m1-m7-compliance-gate-blocking--applies-to-all-artifact-types)
- [Output Format (per `--type`)](#output-format-per---type)
- [Validated Fix + Full Re-Review (MANDATORY when fixes are applied)](#validated-fix--full-re-review-mandatory-when-fixes-are-applied)
- [IMPORTANT Task Planning Notes (MUST ATTENTION FOLLOW)](#important-task-planning-notes-must-attention-follow)
- [Bulk Multi-Artifact Sweeps](#bulk-multi-artifact-sweeps)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Quick Summary

**Goal:** Review one artifact (task, design spec, story, or test spec) for completeness and quality so it is evidence-backed, handoff-ready, and free of missing assumptions or acceptance gaps. For generated tasks, prove one independently releasable actor-facing outcome with a complete full-flow surface when UI is involved.

**Summary:** Review one artifact skeptically: identify/infer `--type=task|story|spec-tests|design` → complete all six adversarial techniques and Anti-Bias checks → read/score that type's checklist → enforce M1–M5/M7 → emit its output → validate findings and fix/re-review when needed. Required failures block; otherwise ≥50% Recommended yields PASS, less yields WARN. A generated task must deliver one releasable actor-facing outcome and the applicable full-flow UI surface.

**Workflow:** Identify → adversarial challenge → type checklist → M1-M7 compliance → output → validated-fix/full re-review until the current round bar clears.

**Key Rules:**

- Read only the resolved type's reference before scoring; preserve its output template and SHA-256 artifact identity.
- M1–M5 or applicable M7 failure forces NEEDS WORK with mandate ID + exact section/line. M6 binds this review. For test specs, resolve the case profile and its carrier exemption first; M7 tests demoable subject matter, independently of M1 vocabulary.
- Before any finding-driven edit, run `/why-review --validate-findings <report-path>` and wait for CLEAN. In standalone fix-loop, fix validated findings then freshly review the full artifact; choose inline work or authorized artifact specialists from risk and context. Caller-owned and review-only passes return the report.
- Round 1 clears every open finding, including LOW; Round 2 clears CRITICAL/HIGH/MEDIUM and records deferred LOW. Binary gates always block. Follow the inlined round caps and repeated-blocker escalation below.
- Every finding needs actionable section/line evidence and confidence; do not block on stylistic preferences. Apply the shared releasable-task contract: technical-only scope, incomplete journey, or missing UI page/view/navigation/component/state/demo coverage fails a Required check.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles` (inline body below); its closing digest ends this file.

---

## Adversarial Review Mindset (NON-NEGOTIABLE)

**Default stance: SKEPTIC challenging artifact quality and completeness, not confirming presence of sections.**

> **Presence-quality confusion trap:** Artifact with all required sections LOOKS complete. But sections that exist yet contain weak, ambiguous, or untestable content are worse than missing sections — they create false confidence. This section forces quality challenge beyond existence checks.

### Adversarial Techniques (apply ALL before concluding)

**1. Steel-Man the Alternatives**
Before accepting chosen approach in any design artifact: argue FOR strongest rejected alternative as vigorously as possible. Would a senior domain expert seriously consider it? If yes — artifact's dismissal needs stronger justification.

**2. Assumption Stress Test**
List the 3 biggest assumptions embedded in artifact. For each: "What if this is wrong?" An artifact that breaks when 2 of its 3 core assumptions fail is fragile. Flag unaddressed failure modes.

**3. Acceptance Criteria Testability**
For each acceptance criterion: "Can a QA engineer write a specific automated test for this — without asking clarifying questions?" If not — AC is ambiguous. Flag it. Vague ACs ("feature works correctly") are NOT acceptance criteria.

**4. Pre-Mortem**
Assume artifact is implemented exactly as written and feature fails in production within 3 months. Write the most plausible failure scenario. If you can't find one, look harder — every implementation has a failure mode.

**5. Unseen Alternatives**
Identify 1-2 approaches NOT mentioned in artifact. Genuinely not considered, or considered and excluded without documented reasoning? Missing alternatives without exclusion reasoning = incomplete analysis.

**6. Contrarian Pass**
Before writing any verdict, generate at least 2 sentences arguing the OPPOSITE conclusion. Then decide which argument is stronger based on evidence.

### Forbidden Patterns

- **"Required sections present"** → Presence ≠ quality. What's IN them?
- **"Acceptance criteria are defined"** → Are they TESTABLE? Name the automated test for each.
- **"Scope is well-defined"** → What is explicitly OUT of scope? If nothing is out of scope, the scope is undefined.
- **"Alternatives were considered"** → Were they real alternatives, or strawmen set up to lose?
- **"Looks complete"** → What specific failure mode is NOT addressed?

### Anti-Bias Gate (MANDATORY before finalizing verdict)

- [ ] Steel-manned at least one rejected alternative
- [ ] Identified 3 hidden assumptions and stress-tested them
- [ ] Verified each AC is unambiguously testable (can write automated test without clarification)
- [ ] Ran pre-mortem (one concrete production failure scenario)
- [ ] Identified at least 1 unexamined alternative (not in artifact)
- [ ] Generated at least 2 sentences arguing the opposite verdict

If any box is unchecked → adversarial review incomplete. Go back.

## Type-Specific Checklists (`--type` dispatch)

Select the checklist by artifact type. Pass `--type={task|story|spec-tests|design}` to force a type; if omitted, infer it from the artifact (step 1 "Identify"). An untyped review of a Feature Spec resolves to `spec-tests` with that reference's spec-body (§1-7) section in scope; there is no separate spec type. Each type scores **Required (all must pass)** + **Recommended (≥50% should pass)** → verdict **PASS** (all Required + ≥50% Recommended) | **WARN** (all Required, <50% Recommended) | **FAIL** (any Required fails).

| `--type`     | Artifact             | Checklist + output template (MANDATORY read)                         |
| ------------ | -------------------- | -------------------------------------------------------------------- |
| `task`        | Task | `references/review-type-task.md` — Task Review Result                              |
| `story`      | User story set       | `references/review-type-story.md` — Story Review Result (+ AC Coverage Matrix)   |
| `spec-tests` | Test specification; a Feature Spec (adds the §1-7 spec-body section) | `references/review-type-spec-tests.md` — Test Spec Review Result (+ Coverage Matrix) |
| `design`     | Design spec / mockup | `references/review-type-design.md` — Artifact Review (+ journey-first checks + UI/UX principles pass) |

**[BLOCKING] Read `references/review-type-<type>.md` for the resolved type BEFORE scoring** — it holds that type's Required/Recommended checks and its output template, and this file alone is not enough to review. Read only the resolved type's file. Whatever the type, the report header records `Artifact identity: {path} · sha256:{hex digest of the file bytes} (content hash required; size + mtime is not an identity)` so `/work-item --mode=challenge` and `/work-item --mode=dor` can `--reuse` the report while the artifact is unchanged (`.claude/skills/shared/m1-m7-gates.md` → "Reusing an earlier verdict").

**UI depth:** For a UI-bearing task, story or spec-tests artifact, read only `review-type-design.md` → **Shared UI protocol bodies** before judging that surface. A UI-bearing design review reads that entire selected type reference, including its design-only principles. A non-UI artifact skips UI depth with an evidenced N/A; retain the always-run applicability review.

## M1-M7 Compliance Gate (BLOCKING — applies to ALL artifact types)

> **[BLOCKING] MUST ATTENTION READ `.claude/skills/shared/m1-m7-gates.md`** for the six criteria (M1-M5, M7), the carrier exemption and the M1-vs-M7 rule. Definitions: `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)".
>
> **Contract:** this review enforces M6: any artifact (task, story, design spec, test spec) that violates **M1-M5 or M7** MUST receive a NEEDS WORK verdict that names the violated mandate ID and cites the exact section + line. Passing an **M1-M5/M7** violation makes this review itself defective. (M6 binds THIS review, not the artifact — which is why the artifact-facing set reads M1-M5 **and M7**, never "M1-M6".) For `--type=spec-tests`, resolve the case profile first (`references/review-type-spec-tests.md`); carriers are exempt from M1/M2 only as that profile declares them.

If ANY criterion fails → verdict is NEEDS WORK; list each violated mandate ID with its concrete section/line citation in the Action Items.

## Output Format (per `--type`)

Use the output template in the resolved type's reference. All templates lead with a **Status/Verdict** and `### Required`/`### Recommended` tallies; the `task`/`story`/`spec-tests` shapes add their own evidence sections.

## Validated Fix + Full Re-Review (MANDATORY when fixes are applied)

> **Protocol:** `SYNC:review-protocol-injection` (all inlined in this file).

Review-only and caller-owned passes return validated findings. Standalone fix-loop applies authorized repairs, then freshly reviews the full current artifact under the shared three-round budget. Choose inline work or authorized specialists from risk and context; delegated re-review uses a fresh artifact reviewer. When constructing that prompt:

1. Copy the Agent call shape from the `SYNC:review-protocol-injection` template verbatim
2. Set `subagent_type: "general-purpose"`
3. Copy all 11 complete protocol bodies VERBATIM from the canonical template; never omit a protocol. Apply code-only concerns as N/A when the artifact has no such surface, with evidence.
4. Set the Task as `"Run a full fresh artifact review over the current {artifact-type} after fixes were applied. Focus on: implicit assumptions, missing coverage of edge cases / error scenarios, unverified cross-references, completeness gaps only visible on second reading, whether acceptance criteria are truly testable and measurable, and regressions introduced by fixes."`
5. Set Target Files as the explicit artifact file path(s), and name the rubric files the reviewer reads first: `.claude/skills/work-item/references/mode-review.md`, its `references/review-type-<type>.md` for the resolved type, and `.claude/skills/shared/m1-m7-gates.md`
6. Set report path as `tmp/reports/artifact-review-rerun{N}-{date}.md`

After sub-agent returns:

1. **Read** the sub-agent's report
2. **Integrate** findings as `## Re-Review {N} Findings` in the main report — DO NOT filter or override
3. **If NEEDS WORK:** fix actionable artifact findings, then restart the full artifact review from the beginning
4. **Repeated blocker cap:** if the same blocker repeats across 2 full invocations with no progress, escalate via `ask user question tool`
5. **Final verdict** must incorporate findings from ALL review passes that actually ran

## IMPORTANT Task Planning Notes (MUST ATTENTION FOLLOW)

- Always plan and break work into many small todo tasks using `TaskCreate`
- Always add a final review todo task to verify work quality and identify fixes/enhancements

---

## Bulk Multi-Artifact Sweeps

Inventory every artifact and its governing type, plan review tasks and coverage, then choose connected groups, inline review or authorized specialists from actual risk and context headroom. Preserve every applicable type rubric and cross-artifact interaction; there is no artifact-count threshold or forced delegation.

---

<!-- SYNC:core-engineering-principles -->

> **Core Engineering Principles — Easy to Change · Easy to Scale · Easy to Maintain** — The success metric of every plan, implementation and review is _future change cost_: the next change must be cheap, safe and provable. DRY, reuse, abstraction, interfaces, wrappers, patterns, layering, tests and the harness exist only to serve that goal. Apply this gate BEFORE any narrower design rule or checklist; when a narrower design rule would raise change cost, this principle wins — it never waives a required gate (tests, review, security, user confirmation). It is evidence-gated: judge fit against the project's config, accepted decisions and local patterns, and never impose a technique the project does not use.
>
> 1. **Easy to change.** Keep one owner per piece of knowledge — DRY the rule, not look-alike text. Reuse an existing helper, component or module before writing a new one (search 3+ siblings and cite them). Put purpose-named interfaces or ports at volatile boundaries: wrap a third-party SDK or infrastructure dependency in an adapter when it is volatile, likely to be swapped, or needs a test seam, so a swap touches one place — a stable dependency used directly is fine, and a pass-through wrapper that lowers no change cost is a defect. Keep units small and cohesive with explicit dependencies; no hidden state, boolean traps or leaked implementation detail. Extract an abstraction for a real second consumer or an evidenced change axis, never for speculation; prefer the reversible decision and defer an irreversible one until evidence forces it. Depth → `SYNC:design-patterns-quality`, `SYNC:complexity-prevention`.
> 2. **Easy to scale.** Growth in features, modules, team, data or load must not multiply edit sites or cost. Add a variant by extension (a new handler, registration or config entry), not by editing every switch over the same discriminator. Keep module boundaries and dependency direction explicit. Bound every loop, query, result set, queue and concurrency on the paths that matter, so work grows with the request, not with total data. Scale only what the project's profile warrants — no speculative distribution or infrastructure. Depth → `SYNC:scale-technique-gate`, `SYNC:engineering-foundation-gate` (F5, F6).
> 3. **Easy to maintain.** Protect every changed behavior with tests that name the business intent or invariant and FAIL when it breaks — happy, error, edge, boundary and regression paths, not only the changed line. Tests are repeatable and isolated. The mechanical harness (format, lint, types, build, test — the same command locally and in CI) runs and passes. Names and structure state intent, and docs or specs that embed the behavior stay in sync. Depth → `SYNC:engineering-foundation-gate` (F3, F4, F7), `SYNC:harness-setup`.
>
> **By phase:**
>
> - **Plan** — each phase names what it reuses (`file:line`), the seam or abstraction it adds or why none is needed, the next plausible change and its edit-site count, the growth bound, and the test that proves each invariant — or `N/A` with a reason where an item cannot apply (a docs-only phase has no growth bound).
> - **Implement** — search for reuse before writing; after writing, recount the edit sites of the next plausible change, confirm each new test fails when its intent breaks, and run the harness.
> - **Review** — judge each pillar `PASS` / `FAIL` / `N/A` with `file:line` evidence and name the real enemy: coupling, duplicated knowledge, hidden state, unbounded growth, untested intent, unclear intent or an irreversible decision exposed too early. A finding names its consequence for the next change; absence of a pattern is not a defect.
>
> **Self-check before claiming done:** (1) What is the next plausible change, and how many files would it touch? (2) What breaks at 10× features, data or load? (3) Which named test goes red if this behavior breaks, and does the harness run it?

<!-- /SYNC:core-engineering-principles -->


<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Do not present inference as fact; ground material claims in evidence appropriate to the task.
>
> 1. Cite `file:line` for repository claims, configuration or reference paths for project rules, and URLs or artifact locations for external or observed claims.
> 2. State confidence when a conclusion is uncertain; verify material assumptions before acting and withhold recommendations when evidence is insufficient.
> 3. Trace the consumers, boundaries, or dependencies that exist in the affected path; do not assume services, modules, or architectural styles that the project does not use.
> 4. "I don't have enough evidence" is valid and expected output.
>
> **BLOCKED until:** material claims have traceable evidence, relevant searches are complete, and uncertainties are stated. Search comparable patterns when the task has existing implementations; record when none are available.
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->


<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
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

<!-- /SYNC:goal-contract-satisfaction-loop -->


<!-- SYNC:review-principle-awareness -->

> **Review Applicability / Current-Principles Awareness** — Every review must first classify the change context (greenfield foundation, brownfield feature/refactor, test/docs/config/UI/infra, or actor-facing/machine surface) and take notice of the applicable current principles below. This is an evidence-gated applicability check, not a mandate to flag or build every item.
>
> **Detailed protocol routing — read/apply only when warranted:**
> - `SYNC:scale-ready-foundation` — greenfield foundation is blocking; big-feature brownfield fit/adapt/defer; architecture review is advisory when auditing. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`.
> - `SYNC:test-architecture-execution-contract` — assertion-bearing tests use the project's configured/native format, name the guarded intent/technical contract, and assert an owned outcome; GWT is one valid format. Detailed carriers: `integration-test`, `workflow-greenfield-init`, and the test-architecture review path.
> - `SYNC:ai-agent-as-user-access` — when an AI/machine actor or future contract is evidenced, inspect identity/delegation, capability boundaries, selected API/CLI/MCP/WebMCP/event/SDK surface, safety/consent, audit/observability, and native-format contract tests. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`, `architecture --mode=review`.
> - `SYNC:design-system-check` — when UI changes, inspect the design-system and component-contract obligations; route visual/UX depth to the owning UI review.
>
> **Review behavior:** Check only principles applicable to the reviewed scope; record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, `BLOCKED`, or `UNVERIFIED` with `file:line`/config/CI evidence, status/severity, owner/route, and next step/revisit trigger. Do not invent findings from a generic checklist, flag unrelated pre-existing gaps as regressions, silently expand the requested scope, or mutate a parent gate merely because advice exists.
>
> **Ownership:** `changes-review` coordinates the applicability pass and routes depth to the owning specialist (`architecture --mode=review`, `integration-test --mode=review`, `security-audit`, `performance-review`, `ui-design --mode=review`, `production-readiness-review`, or another matching review). A specialist reports its own lens and does not duplicate or override another review's verdict; existing brownfield gaps stay advisory unless new, safety-relevant, or explicitly in scope.
>
> **Required review note:** `context/scope | principle/protocol checked | evidence | status/verdict | severity | owner/route | next step/revisit trigger`.
>
> **BLOCKED when:** an applicable principle is required for safety/correctness but missing, unowned, or untestable. Otherwise record an evidence-backed `NOT-APPLICABLE`, advisory, `DEFER-AS-OPPORTUNITY`, or `UNVERIFIED` result according to the lifecycle and change context; creating a greenfield foundation remains subject to its own blocking protocol.

<!-- /SYNC:review-principle-awareness -->

<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Fresh reviewer prompts MUST embed 11 protocol blocks VERBATIM, copied WHOLESALE; these are review-tier renderings. When canonical `SYNC:` protocols change, update their renderings here in the same edit. Copy this template into the Agent `prompt`; replace only `{placeholders}` in Task / Round / Reference Docs / Target Files / Output. Never alter embedded sections at dispatch.
>
> **Why inline expansion:** Fresh reviewers need every rule immediately; file pointers/placeholders depend on reads or hooks that may not fire. The hybrid policy (`SYNC:shared-protocol-duplication-policy`) therefore retains all 11 full bodies in this template, copied wholesale.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
Agent({
  description: "Fresh Round {N} review",
  subagent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}; ZERO prior-round memory. Re-read every target with your own tools. Trust no main-agent information beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
FIRST review the WHOLE PACKAGE. Read `docs/project-config.json`: valid `specArtifacts` profiles select configured `intent/contracts/evidence` roles, identifiers, ownership and test-carrier dialects; only absent profiles use strict-default §3 ACs / §4 BRs / §5 invariants / §8 TCs. Malformed/unsupported declarations are `BLOCKED`, never absent/fallback. Load governing artifact, tests, and changed code TOGETHER; judge mutual consistency before isolated checks.
1. Locate canonical owner sections, guarding tests, and implementing code. Native profiles: preserve owner path + case/scenario ID + optional variant; resolve configured carriers to actual tests. Missing faces are findings (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise; log every disagreement and classify its wrong face:
   - code vs spec: behavior absent from configured `intent/contracts` (or strict-default §3/§4/§5/§8) → CODE-EXTRA or SPEC-STALE; a hard contract/invariant with no enforcing path → CODE-WRONG.
   - tests vs spec: native case without executing assertions, or assertions absent from native rules/cases → TEST-GAP or SPEC-SILENT. Without `specArtifacts`, check strict-default §8 TCs.
   - tests vs code: uncovered changed path → TEST-GAP; test passing a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: enforced but unstated invariants (SPEC-SILENT) MUST become findings, additions to configured `intent`/`contracts`, and `evidence` links to native cases with inspected executing assertions. Without profiles, use strict-default §3/§4/§5/§8 and TC. Enrich; never silently pass.
4. Proceed only after agreement or all disagreements are logged; re-review enriched spec/test packages.
NEVER PASS unlogged spec/test/code disagreements. Diff = entry point; package = judgment unit.

### Evidence-Based Reasoning
Speculation FORBIDDEN; prove every claim.
1. Every claim: cite file:line, grep results, or framework docs
2. Confidence: >80% act freely; 60-80% verify first; <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. Insufficient evidence is valid/expected output
5. Review decision autonomy: choose evidence-supported review approaches, recommendations and next steps without asking the user. Record rationale and preserve every evidence gate. Read-only leaves return remedies to their owner. Only round-limit extension, indispensable facts with no defensible default, and actual missing action authority require a question; never infer consent, accept an open risk or perform an unauthorized operation.
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
Admit a finding only with a reachable trigger path (the caller, input or state that reaches the defect) and a consequence; a concern no supported path reaches is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher.
Classify every finding by consequence (never by effort): CRITICAL = immediate material security/safety/data-loss risk or failed binary gate → block; HIGH = material correctness, contract, privacy, or authority risk → must fix; MEDIUM = bounded consequential edge/resilience/maintainability gap → must clear the current round, or escalate with an explicit residual-risk follow-up that does not create a clean pass; LOW = non-blocking polish with no credible present impact → record/defer from round 2; `NOT VERIFIABLE` is unresolved evidence, not LOW.

### Design Patterns Quality
Every code change:
1. Consistency/reuse: follow documented patterns; justify extraction cost by repetition or real consumer need. Similar names alone never require shared bases.
2. Responsibility: follow config/references/accepted decisions/code; place behavior with its owner. Assume no entity/service/controller hierarchy or forbidden layer without evidence.
3. Apply cohesion/coupling/dependency principles where paradigm assumptions fit; SOLID suits OO boundaries, not every language/codebase.
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI: repetition prompts evaluation, never numeric extraction thresholds. Extract when shared change reasons, real consumers, or evidenced ownership/substitution lower total change cost; no hypothetical-use patterns.
6. Purpose naming: public/cross-layer abstractions name consumer capability/domain/contract, not provider/SDK/framework/database/transport. `IStorage`/`Storage` → `AzureBlobStorage`; use `IAzureStorage` only when Azure-specific semantics are intentionally part of the contract.
7. Contract-fit: read callers/all implementations; narrow over-broad abstractions (`IObjectStore`, `DocumentStore`), never reward misleading generic names.
8. Naming signals: `Manager`, `Helper`, `Utils`, `Data`, `Thing`, `Service`, `Interface`, type decorations/unexplained abbreviations are defects only when hiding purpose/scope/responsibility.
9. Concrete names: provider/strategy/transport/test-double names may distinguish real behavior (`AzureBlobStorage`, `InMemoryStorage`, `RetryingStorage`); exclude from caller contracts unless promised.
10. Preserve local interface syntax/naming: `.NET` `I` prefixes and Google TypeScript unmarked interfaces are both valid.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify behavior matches change intent.
1. Every changed file MUST serve stated purpose; flag unrelated scope creep.
2. Trace one complete success scenario through changed code.
3. Trace one failure/edge scenario through changed code.
4. With plan context, map every acceptance criterion to code.
5. Test/spec changes: tests name protected business rule/invariant and fail when it breaks.
6. Migration exclusion: no migration-code tests; schema/data migrations are one-time paths, not core application logic.
NEVER PASS without both happy/error traces.

### Test Spec Verification
Map changed code to test specs.
1. Discover test/spec format in docs, test cases, BDD features, or spec folders.
2. Every changed path MUST map to a test case/spec or be flagged "needs test case".
3. New functions/endpoints/handlers → test-spec creation flag.
4. Exclude migrations from test/spec creation: one-time execution, not core application logic.
5. Verify existing spec evidence resolves actual code (file:line); flag stale references.
6. Meaningful cases name business intent/invariants; flag implementation-mirroring behavior-only cases.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. Missing changed-path specs → log gap, recommend project test-spec workflow.
NEVER skip test mapping; uncovered paths risk production bugs.

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
Trace execution/data flow; fix the violated contract's owner, never assume the crash site.
MANDATORY before ANY fix:
1. Trace actual origin, transformations, boundaries, failure; invent no absent layers.
2. Identify invalid-state/behavior contract owner from architecture/code evidence.
3. Fix authoritative owner; retain untrusted-boundary validation. Justify multi-file fixes by owned contracts, not file-count thresholds.
4. Inspect relevant existing bypass entries: constructors/adapters/parsers/caches/persistence.
BLOCKED until: The affected path is traced; the owner is supported by file:line evidence; relevant consumers and bypass paths are checked; and the correction point fits the project's architecture.
Anti-patterns (REJECT): assuming the symptom site is the owner; scattering workarounds without tracing the contract; assuming the lowest technical layer is always authoritative; removing validation from a real trust boundary to force a single correction point.

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need TaskCreate. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation (optional advice)
Optional: for high-risk blast radius (shared contract/many callers/cross-module/cross-service/public API), .code-graph/graph.db suggests callers/dependents/impacted tests. Treat it as a hint, NOT proof: stale/incomplete graphs lag uncommitted edits/unindexed paths. Verify important results by files/grep; skip low-risk/local changes. An absent or stale graph is never a finding.
Pattern: grep/read → optional graph suggestions → grep/read verification.
- High-risk investigation: trace --direction both on 2-3 entry files
- Fix/debug with wide reach: callers_of on buggy function + tests_for
- Feature touching a shared contract: connections on files to be modified
- Review of a high-risk change: tests_for on changed functions
- Blast radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Optional high-risk hints: python .claude/scripts/code_graph trace <file> --direction both --json if .code-graph/graph.db exists; verify stale-capable caller/dependent hints by files.
4. Map dependents by grep/read callers; optional graph connections/callers_of adds hints.
5. Write investigation to tmp/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Assumptions verified with evidence. (The code graph is optional advice, never a gate.)

## Reference Docs (READ before reviewing)
Read only lane-resolved docs; do not re-resolve the whole set.
- `code-review-rules.md`, inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
- {lane-specific docs the orchestrator resolved — e.g., the pattern doc for the files under review, integration-test-reference.md for a test lane, the governing spec for a spec-compliance lane}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to tmp/reports/{review-type}-round{N}-{date}.md with sections:
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

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` subagent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Use one consequence-based scale across reviews, skills, agents, workflows and hosts. Choose the highest credible tier supported by evidence; never lower it to pass a round. Effort, cost, preference, annoyance, frequency alone and round-budget pressure do not determine severity.
>
> **Finding vs observation:** admit a finding only with an affected user/system/data/contract, shipped consequence, reachable supported trigger (caller, input, state or event sequence), evidence location and confidence percentage. Assess exposure/likelihood and reversibility/detectability before assigning a tier.
>
> **Keep as observations:** advice, preference, duplicates, unsupported concerns, unreachable paths, issues already reported by this change’s compiler/type checker/linter/tests, intended behavior changes, reasoned suppressions predating the change, and pre-existing issues neither touched nor made reachable. Review newly added suppressions. Observations/INFO do not reopen loops.
>
> | Tier | Consequence and boundary examples | Action |
> | --- | --- | --- |
> | CRITICAL | Immediate material security, safety or authority harm; auth bypass; secrets/PII exposure; irreversible destruction; data loss/corruption; critical-path silent failure. | Block immediately; escalate. |
> | HIGH | Material supported-path correctness, invariant, privacy/authority, public-contract or compatibility failure; likely user/downstream harm; missing proof for a behavior-changing fix. | Fix before PASS/merge. |
> | MEDIUM | Bounded consequential edge, resilience, observability, testability, maintainability or architectural gap; credible future defect. | Clear this round; escalate decisions needing an owner. A follow-up is not a clean pass. |
> | LOW | Proven non-blocking polish with no credible present correctness, security, privacy, authority, availability or data-integrity impact: wording, formatting, minor docs/conventions, optional cleanup, cosmetics. | Record/defer; alone never opens another round from round 2 or increases the budget. |
>
> **Consequence decision tree:** check binary gates separately, then select the first evidenced tier from CRITICAL → HIGH → MEDIUM → LOW. Missing evidence is **NOT VERIFIABLE**, not a fifth tier or a LOW fallback: name the missing proof. Unsettled reachability is NOT VERIFIABLE for potential MEDIUM+ impact and an observation for polish. Claims potentially affecting required behavior, security, privacy, authority, availability, data integrity or a gate remain evidence blockers until proved or explicitly owner-accepted with scope, rationale and residual risk. Owner acceptance does not make an open MEDIUM a clean pass or a failed gate pass.
>
> **Hard gates and rounds:** failed tests, required artifacts, security must-fix checks, generated parity and policy compliance block every round, independently of finding severity. The executable helper carries failures as synthetic CRITICAL blockers; reports name the gate and failure evidence. Default review budget is three rounds; unresolved findings or failed required checks at the cap ask the user for a bounded extension under `SYNC:review-policy`. Failed checks never pass by severity deferral.
>
> **Domain-vocabulary normalization and scores:**
> - `BLOCKED`/`HARD FAIL`/`FAIL` are local blocking verdicts, not automatic CRITICAL; classify by consequence while preserving the owning gate. `WARN` can be any tier; `PASS`/compliant is not a finding. INFO/advisory remains observational unless material consequence is evidenced.
> - UI `P0/P1/P2/P3/P4` start at CRITICAL/HIGH/MEDIUM/LOW/LOW; raise only with evidence. P0/P1 accessibility or task-completion floors remain blocking gates.
> - Criterion `0/1/2` → CRITICAL or HIGH (unmet readiness)/MEDIUM (partial consequential gap)/pass; polish is LOW, never forced to `0`.
> - Impact × likelihood: high impact/exposure → CRITICAL/HIGH; material impact with bounded exposure → HIGH/MEDIUM; low impact/exposure → LOW. Record both axes and justify the highest credible tier.
> - Aggregate scorecards and `/20` verdict bands stay separate; sub-80 areas prompt investigation, not automatic severity. Keep advisory deductions separate from blockers. Emit numeric SRE/readiness or impact/likelihood scores with consequence and normalized tier.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `tmp/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: tmp/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> **Review/audit decisions:** apply `SYNC:review-decision-autonomy` before any user-choice or confirmation prompt below. Select the supported recommendation and record its rationale; round-limit extension, indispensable missing facts and operation authority retain their explicit boundaries.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm via `ask user question tool` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `ask user question tool` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->


<!-- SYNC:understand-code-first -->

> **Understand Existing Code First** — For code changes, read and trace the target before planning or editing; do not apply a code workflow to work with no code surface.
>
> 1. Search for relevant existing implementations and cite `file:line`; aim for 3+ comparable examples when they exist, and record when the project has fewer or none.
> 2. Read the target area and its configured project references; identify actual structure, owners, and conventions without assuming a framework, layer model, or base class.
> 3. Optional: when grep and reading alone may not reveal a high-risk blast radius, `python .claude/scripts/code_graph trace <file> --direction both --json` (when `.code-graph/graph.db` exists) can add callers and dependents — a hint that may be stale, verified by reading the files.
> 4. Map affected dependencies and callers with available repository tools (grep, reading); an absent, stale or unsupported graph never blocks or fails the task.
> 5. Write investigation to `tmp/analysis/` for non-trivial tasks (3+ files).
> 6. Re-read the analysis before implementing; update it when evidence changes.
> 7. Follow a fitting local pattern, or state why no suitable pattern exists and justify a project-appropriate choice.
>
> **BLOCKED until:** target and relevant existing patterns are inspected, applicable dependencies are traced, and material assumptions have evidence. If an item does not apply or the repository has no comparable implementation, record that fact rather than fabricating a gate result.

<!-- /SYNC:understand-code-first -->


<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** for code work, read the target and relevant conventions before planning or editing; seek 3+ fitting examples when available and record fewer/none. Do not impose code discovery on work with no code surface. The code graph is optional, stale-able advice for high-risk impact, never a requirement.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->


<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->


## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `/start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses


<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

**Review/audit invocations:** follow `SYNC:review-decision-autonomy` for every decision prompt; choose supported recommendations without asking, preserve round-extension approval and actual authority.

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `ask user question tool` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->


<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->


## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Review one artifact (task, design spec, story, or test spec) for completeness and quality so it is evidence-backed, handoff-ready, and free of missing assumptions or acceptance gaps. For generated tasks, prove one independently releasable actor-facing outcome with a complete full-flow surface when UI is involved.

**IMPORTANT MUST ATTENTION Main steps:** identify/infer `--type` → all six adversarial techniques + Anti-Bias Gate → selected type checklist → M1-M7 gate → per-type output → validate findings, fix current-round blockers and fully re-review. Preserve declared order; no skipping/merging without explicit user approval.

- **Evidence and scope:** actionable section/line findings only; >80% confidence to act, <60% do not recommend. Be a skeptic about quality, not just section presence. Bootstrap child tasks even inside workflows; track synchronized status/evidence/skips and add a final review. Persist findings incrementally.
- **Hard gates:** any M1–M5 or applicable M7 failure is NEEDS WORK with its mandate ID and section/line. M7 asks what a stakeholder would SEE change in the case body; a handler/consumer/job/sync invocation or schema/type/nullability/call-count assertion is technical-only even in clean prose. Respect the selected profile's evidence-carrier exemptions and block unresolved/conflicting profiles.
- **Type-specific checks:** design runs journey checks 7–13 before nine focused UI dimensions/all 40 clauses, citing `UX-*`/`UI-*` + section/line + severity; project design authority wins. Other types keep their own checklists. Test-spec universal hard rules require a property case plus boundary counter-case in the selected profile's carrier (default `[HARD]` §4/§5 TCs).
- **Task outcome:** apply `.claude/skills/shared/releasable-task-contract.md`; technical-only scope, incomplete journeys and isolated UI screens fail Required checks.
- **Fix convergence:** `/why-review --validate-findings <report-path>` must return CLEAN before edits. Fix only validated blockers, then fully restart with a fresh zero-memory `general-purpose` reviewer using the complete 11-body protocol template. Read and integrate every returned finding without filtering; final verdict includes all actual passes. Round 1: zero open findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred; binary gates always block. Follow declared caps; never spawn confirmation after clearing the bar.
- **Dispatch:** classify PAR/SEQ and dispatch disjoint-write waves together with an all-return barrier. Preserve the nested tracking and exact embedded protocols; their full bodies govern, not this digest.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| ------- | -------- |
| "This sync/consumer case is business-critical, so it stays" | If it's business-critical it's demoable — rewrite it demoably. A case that CANNOT be rewritten demoably is exactly what M7 moves out. |


<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->
