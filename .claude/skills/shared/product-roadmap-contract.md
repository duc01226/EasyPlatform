# Product Roadmap and Plan-Gate Contract

Project-neutral contract for outcome-first planning. This contract is upstream of Feature Specs, tasks, stories, and implementation plans.

## Quick Summary

**Goal:** Keep product boundaries outcome-first while preventing ordinary initiative, spec, and task workflows from creating the product roadmap artifact (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path); embed decomposition only for genuinely large ideas (`isLargeIdea`), and reserve the standalone roadmap writer for explicit requests.

**Summary:**

- **Default chain:** idea → four-signal `isLargeIdea` check → complete `large_idea_decomposition` in the owning task/spec only when true → read-only propagation to stories, scenarios, mock-ups, presentations, plans, and tests.
- **Ordinary chain:** all signals false → omit decomposition, roadmap, milestone, and scope-brief placeholders; continue the owning workflow without a roadmap writer.
- **Explicit chain:** explicit roadmap request → `{roadmap-file}` → approved milestone/scope brief → scenario → `## Plan Gate` → plan/review/validation/implementation.
- **Technical branches:** framework/library changes use `FRAMEWORK-LIBRARY`; isolated brownfield changes use `EXEMPT`; neither branch fabricates product roadmap artifacts.

**Main steps:** classify the branch → evaluate the four signals → require or omit the five-field decomposition → propagate stable slice IDs read-only → apply the matching Plan Gate and owner approval.

**Workflow:** classify branch → verify the four signals → validate all five decomposition fields when triggered → propagate stable slice IDs read-only → apply the matching Plan Gate and owner approval.

**Key Rules:** ordinary routes NEVER write a roadmap file; independentlySliceable alone is not a trigger; downstream artifacts MUST NOT reinterpret or create decomposition; explicit roadmap writing requires explicit user intent.

## Path placeholders

Two roots in this contract are relocatable. Resolve both before writing or citing any path; the two placeholders below stand for the RESOLVED value everywhere they appear in this document.

- `{roadmap-file}` — the product roadmap artifact: default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path.
- `{plan-dir}` — one plan's stable handoff directory, `{plans-root}/{plan-id}/`. The plans root resolves in THREE tiers, highest first: a `docsRoots.plans.path` entry in `docs/project-config.json` WINS; `.ck.json` `paths.plans` is the fallback when project-config declares nothing; the hardcoded `plans/` is last. The `{plan-id}` naming convention (`{YYMMDD-HHmm}-{slug}`) is unchanged by the root.

## Artifact chains

The default idea chain is embedded and artifact-owned:

```text
idea
  -> isLargeIdea signal check
  -> large_idea_decomposition in the owning task/spec artifact (only when true)
  -> stories, scenario, mock-up, and all-task presentation consume the same slice IDs
  -> plan/test/review gates
```

Only an explicit product-roadmap deliverable uses the separate product artifact chain:

```text
explicit roadmap request
  -> {roadmap-file}
  -> selected milestone + approved scope brief
  -> {plan-dir}/scenario-analysis.md
  -> {plan-dir}/plan.md with ## Plan Gate
  -> plan review + human validation
  -> implementation
```

A framework/library protocol change uses a technical chain:

```text
framework/library change
  -> technical scope brief + operational scenarios
  -> {plan-dir}/plan.md with ## Plan Gate
  -> plan review + human validation
  -> implementation and verifier evidence
```

Each arrow is a handoff. A roadmap path and milestone ID are required only for the explicit roadmap chain. Embedded and framework/library artifacts MUST use their own branch values and MUST NOT fabricate `{roadmap-file}`, a product milestone, or a scope brief merely because the idea is large.

When no active `plan.md` exists yet, an explicit roadmap selection, an embedded large-idea handoff, an explicit EXEMPT scope, or a framework/library change creates the stable handoff directory `{plan-dir}` — that is, `{YYMMDD-HHmm}-{slug}/` under the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the root, with `.ck.json` `paths.plans` as the fallback tier). Any required scope brief, scenario analysis, and later plan MUST use that same `plan-id`; `tmp/reports/` is reserved for review/report artifacts and is not a scope-brief handoff location.

## Product roadmap versus implementation plan

| Artifact | Answers | Must not decide |
| --- | --- | --- |
| Product roadmap | What outcome is validated next, which risks are retired, what is not included, what requires human approval, and what evidence proves the milestone | Framework, database schema, class/module layout, implementation order, delivery dates |
| Scope brief | Which one milestone is selected, actors, user outcome, in-scope behavior, non-goals, terms, source-of-truth state, and success evidence | Technical design or file-level tasks |
| Embedded decomposition block | Which independently releasable slices, dependencies, non-goals, risks/evidence, and deferred owners belong to a large idea | Creating a second roadmap artifact or changing product intent downstream |
| Product outcome slice | Which independently releasable actor-facing outcome is delivered and how completion is observed | A list of implementation phases, modules, files, or test tasks |
| Technical delivery task | Which ordered work item implements or verifies one or more outcomes, with its owner, dependency, and proof | A product outcome or evidence that a user-facing outcome is independently releasable |
| Framework/library technical brief | Which reusable protocol outcome, affected carriers, operational risks, and proof gates are in scope | Adopter product milestones or product business decisions |
| Scenario analysis | Which realistic situations can corrupt data, mislead users, violate access/state rules, or make a demo appear reliable when it is not | Choosing a framework or implementing mitigations |
| Implementation plan | How the approved scope will be built: files, dependencies, phases, tests, commands, and rollback/observability evidence | Inventing unresolved product intent |
| Plan Gate | Whether product intent, scope, scenarios, project skeleton, commands, and proof are clear enough to cook | Replacing owner approval with an AI PASS |

## Roadmap applicability

The product-roadmap artifact is an explicit capability, not a default prerequisite. For any idea, classify the scope first:

```text
isLargeIdea = multipleIndependentOutcomes
            || ambiguousOrResearchHeavy
            || releaseScopeDecomposition
            || oversizedTaskThatMustSplit
```

- When `isLargeIdea=true`, keep the milestone mindset inside `large_idea_decomposition`; do not create `{roadmap-file}` unless the user explicitly requests a roadmap deliverable.
- When all four signals are false, omit the decomposition block, roadmap path, milestone ID, and scope-brief requirement unless the user supplies an existing roadmap as read-only context.
- `independentlySliceable` is a property of an outcome slice, not a fifth trigger by itself.
- Evaluate `multipleIndependentOutcomes` at the product-outcome level. Technical delivery stages alone do not become outcomes or satisfy this signal because they are numbered, independently testable, ordered, or separately owned. If a plan has technical stages such as S1–S9 to deliver one actor-facing outcome, keep those stages in the implementation task graph and define the product outcome once. Map tasks to outcome slices when needed; one task may support multiple outcomes, and one outcome may require multiple tasks.
- `releaseScopeDecomposition` concerns independently releasable product outcomes and their release boundaries, not a technical phase list. A technical stage becomes an outcome slice only when it independently delivers an observable actor-facing outcome with its own release condition.
- When a user explicitly requests a product roadmap, route to the standalone writer and apply `Required roadmap content`.
- An existing user-supplied roadmap may be read as context; reading it never authorizes creating or updating a repository roadmap.
- A framework/library protocol change uses the `FRAMEWORK-LIBRARY` branch below, not a product roadmap or the small-change exemption.

## Embedded large-idea decomposition schema

When any `isLargeIdea` signal is true, the owning task or Feature Spec MUST include one complete `large_idea_decomposition` block. The block is the portable replacement for a default roadmap file:

```yaml
large_idea_decomposition:
  is_large_idea: true
  trigger_signals:
    multiple_independent_outcomes: true | false
    ambiguous_or_research_heavy: true | false
    release_scope_decomposition: true | false
    oversized_task_that_must_split: true | false
  outcome_slices:
    - id: SLICE-{FEATURE}-{NNN}
      outcome: {one independently releasable actor-facing outcome}
      releasable_when: {observable completion condition}
      owning_artifact: {task/spec path or stable artifact ID}
  dependencies_order:
    - before: SLICE-{FEATURE}-{NNN}
      after: SLICE-{FEATURE}-{NNN}
      reason: {business or evidence dependency}
  non_goals:
    - statement: {explicitly deferred behavior}
      owner: {slice, task, or named follow-up owner}
  risks_evidence:
    - risk: {uncertainty or failure mode}
      evidence_needed: {observable validation}
      status: confirmed | open | deferred | blocked
      owner: {person, role, slice, or artifact}
  deferred_work_owner:
    - item: {deferred work}
      owner: {named follow-up owner}
      follow_up_artifact: {task/spec/decision artifact or N/A}
      target_slice: SLICE-{FEATURE}-{NNN} | N/A
  not_yet_specified: # optional, outside the five required fields; omit when nothing is foggy
    - area: {decision or investigation that is coming but cannot yet be stated as a precise question}
      waits_on: {slice, risk or open decision that must settle first}
      owner: {person, role, slice, or artifact that will sharpen it}
```

Requiredness rules:

- `outcome_slices` is a non-empty ordered list of independently releasable actor-facing outcomes, each with one stable ID and observable release condition. Do not use it as the implementation task list.
- `dependencies_order` is ordered and explicit. Use `[]` only with `none_identified: true` and a note explaining the check.
- `non_goals` names what is deferred and who owns the boundary. Use `[]` only with an explicit `none_identified` statement.
- `risks_evidence` names the evidence owner and status for each material risk. Use `[]` only with an explicit `none_identified` statement.
- `deferred_work_owner` names every deferred item and its next owner. Use `[]` only when the artifact explicitly records that no work is deferred.
- `not_yet_specified` is optional and never replaces a required field. It lists a decision or investigation you can tell is coming but cannot yet state as a precise question, with what it waits on and who will sharpen it. The test is whether the question can be stated precisely now, not whether it can be answered now: once it can, move it to the field that owns it (a slice, `risks_evidence` or `deferred_work_owner`) and delete the entry. Work ruled out of the idea belongs in `non_goals`: scope puts an item there, sharpness never does.
- Downstream stories, scenarios, tasks, mock-ups, presentations, plans, and reviews consume the block read-only. They may flag a missing, conflicting, or stale field; they must not reinterpret it or create a separate roadmap artifact.
- For an ordinary all-false idea, omit the entire block and do not add roadmap, milestone, or scope-brief fields merely as placeholders.

For a small isolated brownfield change or a bugfix, record an explicit exemption in the scope brief and plan:

```markdown
## Roadmap Applicability
- Status: EXEMPT
- Reason: {why product-level scope is unchanged}
- Owner: {person/role accepting the exemption}
```

An exemption is not permission to guess behavior, skip the existing spec/test gates, or skip user confirmation when a material decision remains.

EXEMPT is a separate applicability branch, not a roadmap status. It does not require `{roadmap-file}` or a milestone ID, and downstream artifacts MUST use explicit `EXEMPT`/`N/A — {reason}` values instead of fabricated roadmap or milestone placeholders. The branch still requires a stable scope brief, scenario analysis, existing spec/test/review gates, commands, observable evidence, and accepting-owner approval.

**Light-profile evidence.** A light-profile plan (a supplied spec, or an XS/S change; `plan/SKILL.md` → Plan profile), on the EXEMPT or FRAMEWORK-LIBRARY branch, may point at inline evidence instead of files: scope `INLINE — spec_baseline <path>@<revision>` or `INLINE — plan.md §1`; scenarios the governing spec's case IDs or `INLINE — plan.md §7`. Approval fields stay, under the same honest-state rules.

For a reusable framework or library change, record the technical branch instead:

```markdown
## Roadmap Applicability
- Status: FRAMEWORK-LIBRARY
- Reason: {reusable protocol/tooling change; no adopter product intent changes}
- Technical outcome: {observable framework outcome}
- Owner: {person/role accepting the technical scope}
- Evidence: {tests, generated-carrier parity, operational checks}
```

`FRAMEWORK-LIBRARY` requires a stable technical scope brief, operational scenario analysis (files, or the light-profile evidence above), known commands, named evidence owners, preserved spec/test/review gates, and accepting-owner approval. It MUST NOT create `{roadmap-file}` or a product milestone.

## Required roadmap content

For roadmap-applicable work, `{roadmap-file}` — default `docs/product-roadmap.md`, relocatable via `docsRoots.productRoadmap.path` in `docs/project-config.json` — is the canonical product-level artifact. It MUST contain:

1. Product outcome and the hypothesis being validated.
2. Actors/owners and the boundary of the product or capability.
3. The business source of truth and critical states in plain language.
4. Outcome-based milestones, each with:
   - user outcome: what a user can accomplish after the milestone;
   - risk retired: which uncertainty or failure mode it reduces;
   - explicit non-goals: what is intentionally deferred;
   - human decisions: choices the owner must approve;
   - evidence gate: observable proof of completion;
   - dependencies and entry conditions.
5. Open questions, decision status, and the current selected milestone.

Milestones are not screens, endpoint lists, or calendar promises. “MVP” means the smallest release that tests the key product hypothesis; it does not mean the smallest number of pages. Deferred work remains visible as later roadmap milestones or explicit non-goals.

## Scope brief minimum

For a roadmap-applicable selection, the selected milestone MUST produce `scope-brief.md` with:

- `roadmap: {roadmap-file}` (the resolved path, not the placeholder);
- `milestone_id` and approved milestone outcome;
- primary actor and user outcome;
- in-scope behaviors and explicit non-goals;
- definitions for ambiguous lifecycle terms (`draft`, `ready`, `published`, `delivered`, `paid`, `refunded`, or equivalent);
- source-of-truth state and persistence expectation;
- known risks and human decisions, each `confirmed`, `deferred`, or `blocked`;
- completion evidence and redaction rules.

The scope brief lives at `{plan-dir}/scope-brief.md`. If selection happens before an active plan exists, generate `{plan-id}` once from the selection timestamp and milestone slug, create that directory, and pass the exact path to `/scenario` and `/plan`.

For an EXEMPT isolated change, the same stable path MUST contain:

- a `## Roadmap Applicability` block with `Status: EXEMPT`, a reason, and the accepting owner;
- `roadmap: EXEMPT — {reason}` and `milestone_id: EXEMPT` rather than a roadmap path or fabricated milestone;
- the primary actor, observable outcome, in-scope behavior, explicit non-goals, relevant lifecycle terms, source-of-truth state, persistence expectation, known risks/decisions, and completion evidence;
- the exact scope needed to prove the change is isolated from product-level outcomes.

For a `FRAMEWORK-LIBRARY` change, the stable path MUST contain:

- a `## Roadmap Applicability` block with `Status: FRAMEWORK-LIBRARY`, technical outcome, reason, owner, and evidence owner;
- `roadmap: NOT APPLICABLE — framework/library branch` and a technical `milestone_id` only when useful for the plan registry, never a product milestone;
- affected canonical sources and generated carriers, operational failure/recovery scenarios, commands, test owners, and completion evidence;
- no adopter product roadmap path or fabricated product decisions.

## Scenario minimum

`scenario-analysis.md` MUST list realistic triggers and expected outcomes for the selected scope or EXEMPT change. At minimum, consider duplicate submission/replay/refresh, invalid input, concurrent edits, deletion/orphans, state transition boundaries, authorization/ownership/isolation, partial failure/recovery, and evidence/secret leakage when applicable. Each high-impact scenario maps to an invariant, a prevention/detection expectation, and planned evidence or a canonical scenario/case ID from the configured profile (TC by default).

Case identity and test cardinality follow `shared/sdd-artifact-contract.md`: Section 8 TC with one-to-many test mapping is the strict default; a declared native profile may use owner-qualified scenario IDs and its existing YAML/inline carrier to declare a many-to-many mapping. One executor may cover several scenarios, and one scenario may have variant rows, but aggregate evidence proves only rows whose assertions execute in the mapped test.

## Plan Gate

For roadmap-applicable work, `plan.md` MUST include one machine-readable status block and a human-readable checklist:

```markdown
## Plan Gate
- Status: READY | BLOCKED
- Roadmap: {roadmap-file}
- Milestone: M{n} — {outcome}
- Scope brief: {plan-dir}/scope-brief.md
- Scenarios: {plan-dir}/scenario-analysis.md
- Product decisions: CONFIRMED | OPEN — {decision IDs}
- Project skeleton: CONFIRMED | MISSING — {frontend/backend/data/config status}
- Commands: CONFIRMED | MISSING — {build/test/run commands}
- Evidence plan: CONFIRMED | MISSING — {journey, assertions, artifacts, redaction}
- Human approval: APPROVED | REQUIRED
```

`READY` requires: the selected outcome and boundaries match the roadmap; ambiguous terms are defined; no material product decision is OPEN; high-impact scenarios have expected outcomes and proof; the initial skeleton and commands are known (or explicitly not applicable); and the human owner has approved the scope and plan gate. `BLOCKED` stops implementation and routes to the missing upstream decision. AI confidence is evidence for a question, never approval.

For an EXEMPT change, use this branch instead of the roadmap/milestone fields above:

```markdown
## Plan Gate
- Status: EXEMPT
- Roadmap: EXEMPT — {reason}
- Milestone: EXEMPT — product-level scope unchanged
- Scope brief: {plan-dir}/scope-brief.md | INLINE — {light-profile pointer}
- Scenarios: {plan-dir}/scenario-analysis.md | INLINE — {light-profile pointer}
- Product decisions: N/A — {why no product decision changed}
- Project skeleton: CONFIRMED | MISSING — {frontend/backend/data/config status}
- Commands: CONFIRMED | MISSING — {build/test/run commands}
- Evidence plan: CONFIRMED | MISSING — {journey, assertions, artifacts, redaction}
- Human approval: APPROVED | REQUIRED
```

`EXEMPT` requires the explicit scope-brief exemption, a matching scenario artifact (the light-profile evidence above counts), preserved existing spec/test/review gates, known commands and evidence, and accepting-owner approval. It does not require a roadmap or milestone, and it MUST NOT be upgraded to `READY` merely because the change is small.

For embedded large-idea work, use this branch:

```markdown
## Plan Gate
- Status: DECOMPOSITION-EMBEDDED | BLOCKED
- Roadmap: NOT APPLICABLE — embedded large-idea decomposition
- Milestone: NOT APPLICABLE — slice IDs live in the owning artifacts
- Decomposition owner: {task/spec path or explicit ordinary-route owner}
- Scope brief: NOT REQUIRED — no separate roadmap artifact
- Scenarios: {path or conditional embedded scenario evidence}
- Product decisions: CONFIRMED | OPEN — {decision IDs}
- Project skeleton: CONFIRMED | MISSING — {status}
- Commands: CONFIRMED | MISSING — {commands}
- Evidence plan: CONFIRMED | MISSING — {slice, journey, assertions, redaction}
- Human approval: APPROVED | REQUIRED
```

For a framework/library change, use this branch:

```markdown
## Plan Gate
- Status: FRAMEWORK-LIBRARY | BLOCKED
- Roadmap: NOT APPLICABLE — framework/library branch
- Milestone: {technical registry ID or NOT APPLICABLE}
- Scope brief: {plan-dir}/scope-brief.md | INLINE — {light-profile pointer}
- Scenarios: {plan-dir}/scenario-analysis.md | INLINE — {light-profile pointer}
- Product decisions: N/A — no adopter product intent changed
- Framework owner: APPROVED | REQUIRED
- Project skeleton: CONFIRMED | MISSING — {status}
- Commands: CONFIRMED | MISSING — {commands}
- Evidence plan: CONFIRMED | MISSING — {parity, tests, failure/recovery, redaction}
- Human approval: APPROVED | REQUIRED
```

`DECOMPOSITION-EMBEDDED` requires the complete five-field block whenever any signal is true and a gap check in every downstream artifact that claims coverage. `FRAMEWORK-LIBRARY` requires the technical scope/scenario/evidence chain and never upgrades itself into a product roadmap.

## Handoff rules

- Feature Spec frontmatter carries roadmap path/milestone only for the explicit roadmap branch; embedded specs carry the decomposition block and stable slice IDs, while framework specs carry the technical branch.
- Task/story artifacts carry the same decomposition block and slice IDs when `isLargeIdea=true`; they do not create a roadmap path or milestone. Explicit-roadmap artifacts may carry the selected milestone; EXEMPT artifacts carry the explicit exemption reason/owner instead.
- Plans cite the applicable scope/scenario evidence; embedded plans cite owning artifacts and gap checks, while framework plans cite technical scope, failure/recovery scenarios, and generated-carrier evidence.
- Review and validation skills FAIL or BLOCK on a missing applicable branch, unresolved material decisions, or missing owner approval. They do not turn a large idea into a default roadmap writer.

## Evidence hygiene

Use observable business evidence: persisted state after refresh/reopen, valid/invalid transition result, authorization outcome, duplicate/replay behavior, audit/history outcome, and redacted screenshots/logs where appropriate. Never place credentials, tokens, payment details, or personal data in roadmap, scenario, plan, or evidence artifacts.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Keep product boundaries outcome-first: classify the four signals, embed the complete five-field decomposition only for a true large idea, propagate stable slice IDs read-only, and create/update the product roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides the path) only after an explicit roadmap request.

**IMPORTANT MUST ATTENTION Main steps:** classify branch → evaluate `isLargeIdea` → require/omit the decomposition block → select EXPLICIT-ROADMAP, DECOMPOSITION-EMBEDDED, FRAMEWORK-LIBRARY, or EXEMPT Plan Gate → verify scenario/evidence/commands/approval → hand off to plan/review/implementation.

**IMPORTANT MUST ATTENTION** ordinary all-false scope omits roadmap placeholders; `independentlySliceable` alone does not trigger decomposition; downstream consumers read the block and never create a second roadmap artifact.
