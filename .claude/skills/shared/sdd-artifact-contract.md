# AI-SDD Artifact Contract

Project-neutral shared contract for AI spec-driven development. This is the home for reusable principles, gates, artifact rules, and protocol language that should apply across repositories.

> **[IMPORTANT]** MUST ATTENTION keep reusable AI-SDD principles in `.claude`; put only repository-specific extensions in project config/reference docs.
> **[IMPORTANT]** MUST ATTENTION preserve the SDD cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> **[IMPORTANT]** MUST ATTENTION sync this shared contract through generated agent mirrors later; never edit generated mirrors directly.

## Quick Summary

**Goal:** Define portable AI-SDD artifact rules that any repository can reuse without project-specific coupling.

**Workflow:**

1. **Classify** — Decide whether rule is generic shared guidance or local project extension.
2. **Anchor** — Apply the core SDD cycle, artifact gates, traceability schema, and drift checks.
3. **Adapt** — Load project config/reference docs only for local paths, formats, ownership, and commands.
4. **Sync** — Mirror shared `.claude` source into generated agent artifacts during the later sync step.

**Key Rules:**

- MUST ATTENTION keep reusable principles in `.claude`; project-reference docs only add local repository extensions.
- MUST ATTENTION require traceability from requirement -> design decision -> task -> TC/test -> code evidence -> docs/spec update.
- MUST ATTENTION mark unknowns explicitly; never let AI guess missing acceptance criteria, invariants, auth rules, or failure behavior.
- MUST ATTENTION treat tests as intent guards: each TC names the business intent/invariant and fails when that intent breaks.
- MUST ATTENTION exclude migration code from test-writing scope: schema/data migrations are one-time execution paths, not core application logic.
- MUST ATTENTION allow any supported AI tool to plan, implement, review, or verify when it has this contract, synced context, and local project docs.
- NEVER edit generated agent mirrors directly; update `.claude` source and sync later.

## Shared-Vs-Project Boundary

- Shared, reusable AI-SDD principles belong in `.claude` source files, primarily this file or other `.claude/skills/shared/*` references.
- Project-specific additions belong in `docs/project-reference/**` only when they name local paths, commands, products, modules, architecture decisions, naming conventions, evidence formats, or ownership rules.
- Generated agent mirrors receive shared rules through sync. In this repository, those mirrors include `.agents/skills/**`, `.codex/CODEX_CONTEXT.md`, and `AGENTS.md`. Edit the `.claude` source instead and let sync propagate; never edit those mirrors directly — why: the next sync overwrites direct mirror edits.
- In generated mirrors, `.claude` means this repository's upstream skill source; standalone consumers should apply the same rule to their own authoritative source directory.
- If a rule can be reused unchanged by another repository, keep it out of project-reference docs and place it in `.claude`.
- If a project-reference doc needs a reusable rule, reference `shared/sdd-artifact-contract.md` and add only the local extension.

## Tool-Neutral Execution

- Any supported AI tool may run the SDD cycle when it has this contract, synced context, and repository reference docs.
- A workflow may use one tool or multiple tools; correctness comes from artifacts, evidence, tests, and review, not from requiring a named tool set.
- Tool-specific adapters may translate paths or commands for their runtime, but they must preserve this shared contract and keep local project rules outside shared files.

## Core Model

AI spec-driven development treats the spec as the primary artifact and requires agents to implement against it. Code, tests, and documentation are downstream evidence of the spec.

Common maturity levels:

| Level          | Meaning                                                                           |
| -------------- | --------------------------------------------------------------------------------- |
| Spec-first     | Spec guides initial development but may drift after implementation                |
| Spec-anchored  | Spec evolves alongside code and is updated with every meaningful behavior change  |
| Spec-as-source | Humans edit specs only; implementation can be generated or regenerated from specs |

Move toward spec-as-source only after drift metrics, traceability, and verification are consistently healthy.

## AI-SDD Mandates (M1-M6) — BLOCKING

Every AI-SDD artifact (feature doc, engineering spec, test spec, PBI/story, idea) MUST satisfy mandates M1-M6 or be REJECTED and reworked. These are hard gates, not guidance. Create/update skills MUST NOT emit violations; review/gate skills MUST FAIL on them (M6). Each mandate points to the detailed gate/section that defines its full checklist, so this block stays a stable named anchor rather than a duplicate of the gates below.

| ID     | Mandate                      | Rule (one line)                                                                                                                                                                                                                                                                     | Full checklist in            |
| ------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **M1** | Tech-agnostic prose          | Narrative, headings, summaries, tables, glossaries MUST NOT name frameworks, products, language-native types, or product/design-pattern class names.                                                                                                                                | Tech-Agnostic Spec Writing   |
| **M2** | No source code in prose      | Prose MUST NOT contain class/method names, file paths, namespaces, or language constructs; use business operation names. Source identifiers live only inside evidence carriers.                                                                                                     | Tech-Agnostic Spec Writing   |
| **M3** | Abstract-IDs-first trace     | Logical IDs (FR-/BR-/OP-/TC-) are the PRIMARY citation spine in prose; evidence rides on stack-portable abstract anchors (`[Source: namespace/service/id]`), NEVER physical `file:line`. Physical coordinates live only in the provenance sidecar. Taxonomy: `shared/tc-format.md`. | Traceability Schema          |
| **M4** | AI-implementability          | One valid interpretation per requirement; observable completion states; named failure modes; no hallucination bait.                                                                                                                                                                 | AI-Implementability Gate     |
| **M5** | Rebuild-from-scratch purpose | A competent team with zero codebase knowledge can re-implement identical business behavior on ANY stack from the artifact alone.                                                                                                                                                    | Implementation-Complete Gate |
| **M6** | Review enforces M1-M5        | Every review/gate skill MUST check M1-M5 and FAIL with the specific mandate ID(s) violated and a concrete reason.                                                                                                                                                                   | Enforcement Roles            |

**Carrier carve-outs (NOT M1/M2 violations):** `[Source: ...]`, `**Evidence**`, `**IntegrationTest**` fields; YAML frontmatter keys; ` ```mermaid ``` ` blocks; and dedicated rebuild/reimplementation guides. Source identifiers are permitted ONLY inside these carriers — never in narrative prose. — why: quarantining real references keeps prose stack-portable while preserving an auditable code link.

### Enforcement Roles

- **Create/update skills** (feature docs, engineering specs, test specs, PBIs/stories, ideas, doc sync) MUST enforce M1-M5 at authoring time. If an artifact would violate any mandate, STOP and rework before emitting it.
- **Review/gate skills** (feature-doc review, spec review, story/PBI review, challenge, artifact review, change review, definition-of-ready gate) MUST CHECK M1-M5 and FAIL with the violated mandate ID(s) and a specific reason. A review that passes an M1-M5 violation is itself defective (M6).

> Project repositories MAY extend these mandates with local banned-token lists, evidence formats, and ID namespaces in `docs/project-reference/**`, but MUST NOT weaken M1-M6.

## Core Cycle

Every non-trivial code-changing workflow follows:

`spec -> plan -> tasks -> implement -> verify -> update spec/docs`

Bugfix workflows use the same cycle with a root-cause gate before regression tests:

`current behavior -> expected behavior -> code bug vs spec bug -> regression TC -> fix -> proof -> sync`

## Required Artifacts

| Artifact                     | Required For                       | Minimum Content                                                                                     |
| ---------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| Requirements or bug analysis | Feature, PBI, bugfix               | User/business intent, scope, explicit non-goals, assumptions, unresolved clarifications             |
| Acceptance criteria          | Feature, PBI, bugfix               | Given/When/Then, EARS, or equivalent testable conditions                                            |
| Design/plan                  | Code-changing work                 | chosen approach, rejected alternatives, risk, affected files, verification strategy                 |
| Task graph                   | Multi-step work                    | independently verifiable tasks, dependencies, safe parallelization notes                            |
| Test specs                   | Behavior change                    | TC IDs, intent/invariant guarded, priority, evidence, expected failure mode                         |
| Implementation evidence      | Code changes                       | files changed, source references, verification output                                               |
| Docs/spec sync               | Behavior or public contract change | updated canonical spec/docs, §8 TC ↔ test-code sync if applicable, skipped reason if not applicable |
| Handoff/closeout             | All workflows                      | remaining risks, commands run, artifacts updated                                                    |

## Requirement Quality

Requirements should be structured enough that an implementer can build and test without guessing:

- user story or actor/goal statement
- priority or risk classification
- independent test path
- acceptance scenarios
- functional requirements
- entities, data concepts, or external systems involved
- edge cases and failure modes
- success criteria
- assumptions and explicit clarification markers
- out-of-scope items

Keep product specs focused on what and why. Put implementation details in the plan unless the detail is an externally visible contract or a required constraint.

## Implementation-Complete Gate

A spec is implementation-complete when a competent engineer with no prior codebase knowledge can implement the behavior without guessing.

Minimum checklist:

- every entity or concept has purpose, attributes, constraints, lifecycle states, and invariants
- every operation has validation rules, authorization rules, success result, and named failure modes
- every stateful concept has a complete transition table
- every external dependency has a named contract and failure behavior
- every async flow names trigger, payload, producer, consumer, ordering, idempotency, and retry/failure handling
- every performance, scale, format, uniqueness, security, privacy, or compatibility constraint is explicit
- examples cover at least one success case and one meaningful failure case per primary operation

## Test-Complete Gate

A spec is test-complete when tests can be derived without reading implementation source.

Minimum checklist:

- every functional requirement maps to at least one positive TC
- every business rule maps to at least one negative TC
- every authorization rule maps to at least one unauthorized-access TC
- every state transition maps to at least one valid and one invalid transition TC where applicable
- every integration event maps to a publish/consume/idempotency TC where applicable
- bugfix specs include preservation TCs for behavior that must not regress
- every test names the business intent or invariant it protects and would fail if that intent breaks
- migration code is excluded from test-writing scope because schema/data migrations are one-time execution paths, not core application logic

## AI-Implementability Gate

A spec is AI-implementable when an AI agent can generate correct code with minimal clarifying questions and without inventing APIs, rules, or architecture.

Minimum checklist:

- one valid interpretation per requirement
- observable completion states, not vague phrases like "handle appropriately"
- explicit in-scope and out-of-scope boundaries
- known constraints and limits named
- architecture decisions and existing patterns referenced through project docs or source evidence
- concrete input/output examples
- exhaustive known error cases
- unknowns marked as clarifications instead of guessed
- no hallucination bait such as imaginary APIs, broad "similar to X" shortcuts, or unverified assumptions

Ambiguity test: Could two engineers produce different implementations while both claiming conformance? If yes, add a tiebreaker rule, constraint, or example.

## Tech-Agnostic Spec Writing

**[BLOCKING — M1/M2]** Specs MUST describe business behavior, not implementation mechanics. Narrative prose MUST NOT leak implementation identifiers; framework/product names, language-native types, and class/method/file-path references are permitted ONLY inside evidence carriers (`[Source: ...]`, `**Evidence**`, `**IntegrationTest**`), YAML frontmatter, and ` ```mermaid ``` ` blocks. Authoring tools FAIL the artifact on any prose leak; review tools FAIL the review (M6).

Avoid implementation leakage:

| Avoid                                         | Prefer                                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| language-native types                         | business-level primitive types and constraints                                           |
| ORM, repository, framework, or mediator names | persistence layer, operation handler, or project-approved business term                  |
| message-broker product names                  | message bus or event bus                                                                 |
| auth-provider product names                   | identity provider, authentication token, role, or permission                             |
| class names and file paths in prose           | business operation names; abstract anchors (`namespace/service/id`) in evidence carriers |
| caller-specific exceptions                    | caller-agnostic business rules                                                           |

Public API paths, product-specific role names, domain terms, or externally visible contract names are acceptable when they are part of the product contract.

## Traceability Schema

**[M3 — Abstract-IDs-first]** Logical identifiers (`RequirementId`/`Invariant`, `TC`) are the PRIMARY citation spine and MUST appear in requirement and rule statements. `Source` evidence uses stack-portable abstract anchors (`[Source: namespace/service/id]`), NEVER physical `file:line` — an anchor names WHICH logical artifact implements/verifies behavior, never WHAT the requirement is, and stays out of narrative prose. Physical coordinates are recoverable only via the provenance sidecar (`docs/specs/.sdd-provenance-map.jsonl`, created on demand; anchor taxonomy in `shared/tc-format.md`). Keeping the logical spine + abstract anchors stable lets specs survive a stack migration with zero re-pointing.

Each requirement or bugfix invariant should trace through this chain:

`Requirement/Invariant -> Design decision -> Task -> TC -> Test code -> Source evidence -> Docs/spec update`

Minimum trace fields:

- `RequirementId` or `Invariant`
- `Decision`
- `Task`
- `TC`
- `Test`
- `Source`
- `Docs`
- `Status`

**TC ↔ Test cardinality is one-to-many.** A `TC` is a business / user-story acceptance scenario written tech-agnostic; it is verified by **one or more** `Test` methods (integration and/or unit, across many components and services), all joined to the TC by the test-spec annotation. The `Test` trace field therefore holds a SET, and a TC is covered when ≥1 annotation-tagged test passes. NEVER split, narrow, or technicalize a business TC to force a 1:1 map to a single test method or production class — that breaks M1 (tech-agnostic) and M5 (rebuild-from-business-intent) and turns the spec into a code mirror instead of a business contract. Conversely, each test maps to exactly one primary TC. (Canonical cardinality contract: `shared/tc-format.md` → TC ↔ Test Code Cardinality.)

Use `N/A` only with evidence:

`N/A - <reason>; Evidence: <command output or [Source: namespace/service/id]>`

## Code-To-Spec And Spec-To-Code

Code-to-spec extraction:

- read existing source and tests before writing or updating specs
- distinguish implemented behavior, intended behavior, and accidental behavior
- cite source evidence for implemented behavior
- mark unverified claims instead of filling gaps with plausible assumptions
- treat extracted specs, TCs, and behavior notes as reference-only until accepted by the canonical spec owner; extraction evidence may inform the spec but must not silently replace accepted intent
- record staleness when source changed after the last spec extraction

Spec-to-code implementation:

- resolve clarifications before implementation when ambiguity changes behavior
- plan against canonical spec, project config, and relevant project-reference docs
- create or update tests before trusting implementation
- implement at the responsible layer
- verify observable behavior, then update specs/docs to reflect the final accepted behavior

## Drift Gates

Reconcile every spec/code/test disagreement to canonical intent using the gates below; never normalize drift only because current code or tests pass. — why: green code/tests can encode the drift itself, silently ratifying the wrong behavior.

- If spec and code disagree, adjudicate canonical product/spec intent before editing either side.
- If the spec is wrong, update the spec first, then update TCs/tests.
- If code is wrong, write/update regression TCs against intended behavior before implementation.
- If tests are stale, update tests to protect intended behavior, not just current behavior.
- If a dashboard differs from the canonical TC source, forward-sync from the canonical source unless an explicit recovery workflow is approved.
- If code correctly enforces a rule the spec never states (spec-silent), add the missing rule and its TC to the spec, then a guarding test — never leave a discovered invariant unwritten. — why: an unwritten invariant is one refactor away from being silently deleted.

## Security And Governance Checklist

For AI-assisted changes, explicitly consider:

- secrets and credentials must not be copied into prompts, examples, specs, or tests
- PII or sensitive data must use project-approved anonymized fixtures
- generated code is owned by the implementer and must be reviewed like human-written code
- dependencies, generated assets, and tool outputs must have provenance reviewed before use
- irreversible actions require human approval unless the active project protocol explicitly permits automation
- tool permissions should be least-privilege and auditable
- input/output handling must account for prompt injection, sensitive disclosure, supply-chain risk, excessive agency, and unbounded consumption when AI systems are involved

## Metrics

Capture these when the workflow scope is large enough to justify measurement:

- `requirementsWithAcceptanceCriteria`
- `unresolvedClarifications`
- `traceabilityCoverage`
- `specDriftFindings`
- `reviewReworkCount`
- `agentReworkLoops`
- `hallucinatedReferenceCount`
- `securityOrPrivacyFindings`
- `changeFailureRate`
- `escapedDefectRate`
- `developerConfidence`

Combine delivery, quality, security, and developer-experience signals into the success measure; never let one metric stand alone. — why: a single metric is easy to game and hides regressions in the dimensions it ignores.

## Common Anti-Patterns

| Anti-Pattern                       | Risk                              | Fix                                                           |
| ---------------------------------- | --------------------------------- | ------------------------------------------------------------- |
| "Handle errors appropriately"      | agent invents failure behavior    | name error condition, code/status, and user-visible result    |
| "Validate input"                   | missing or invented validation    | list every validated field and rule                           |
| "Authorized users"                 | wrong auth model                  | name role, permission, and ownership condition                |
| "Similar to feature X"             | imports irrelevant behavior       | specify independently; cross-reference only shared concepts   |
| no invariants                      | compound rules missed             | state every always-true condition                             |
| missing state machine              | invented transitions              | document every valid and invalid transition                   |
| implementation-specific spec prose | stack coupling and migration drag | use business terms; put implementation in plan                |
| happy-path-only tests              | regressions escape                | include negative, authorization, edge, and preservation tests |

## Project Adaptation Clause

This contract defines generic artifact mechanics. Before applying it in a repository:

1. Read `docs/project-config.json` for project-specific paths, commands, modules, workflow patterns, and test settings.
2. Read `docs/project-reference/docs-index-reference.md` to discover the relevant reference docs.
3. Read only the reference docs needed for the active task.
4. Follow the target repository's canonical spec/test/doc owners.
5. If `docs/project-config.json` or a required project-reference doc is missing or stale, auto-run `/project-init` or the narrow setup route (`/project-config`, `/docs-init`, `/scan-all`, or `/scan --target=<key>`) before applying project-specific rules.

## Source Practices

This contract intentionally summarizes stable practices rather than embedding long external excerpts. When updating it, verify claims against current primary sources or clearly mark the basis as local operating policy.

Useful external references to re-check when changing the contract:

- GitHub Spec Kit documentation
- Kiro specs documentation
- Martin Fowler, Specification by Example
- Addy Osmani, How to Write a Good Spec for AI Agents
- OWASP Top 10 for LLM Applications
- NIST secure software development guidance for AI systems

## Closing Reminders

- MUST ATTENTION shared reusable principles live in `.claude` and sync to generated agent mirrors; project-reference docs only add local repository extensions.
- MUST ATTENTION core cycle is `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
- MUST ATTENTION specs, tests, and code stay traceable through requirements, decisions, tasks, TCs, evidence, and docs.
- MUST ATTENTION when adapting this contract, read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`; if either file or a required reference doc is missing or stale, auto-run `/project-init` or the narrow setup route before ordinary project-specific work.
- NEVER edit `.agents`, `.codex`, or `AGENTS.md` mirrors directly; source change belongs in `.claude`, sync happens later.
