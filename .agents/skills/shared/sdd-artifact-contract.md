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
- MUST ATTENTION require traceability from requirement -> accepted decision -> accountable task -> canonical scenario/case (TC by default) -> executing test/assertion -> code evidence -> docs/spec update.
- MUST ATTENTION mark unknowns explicitly; never let AI guess missing acceptance criteria, invariants, auth rules, or failure behavior.
- MUST ATTENTION treat tests as intent guards: each canonical case (TC under the strict default profile) names the business intent/invariant and maps to an executing assertion that fails when that intent breaks.
- MUST ATTENTION exclude migration code from test-writing scope: schema/data migrations are one-time execution paths, not core application logic.
- MUST ATTENTION allow any supported AI tool to plan, implement, review, or verify when it has this contract, synced context, and local project docs.
- NEVER edit generated agent mirrors directly; update `.claude` source and sync later.

## Shared-Vs-Project Boundary

- Shared, reusable AI-SDD principles belong in `.claude` source files, primarily this file or other `.claude/skills/shared/*` references.
- Project-specific additions belong in the project-reference docs root (default `docs/project-reference/**`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) only when they name local paths, commands, products, modules, architecture decisions, naming conventions, evidence formats, or ownership rules.
- Generated agent mirrors receive shared rules through sync. In this repository, those mirrors include `.agents/skills/**`, `.codex/agents/*.toml`, and `AGENTS.md`. Edit the `.claude` source instead and let sync propagate; never edit those mirrors directly — why: the next sync overwrites direct mirror edits.
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

## Semantic Obligations And Representation Profiles

The quality obligations are representation-neutral. Resolve `docs/project-config.json → specArtifacts` before authoring or reviewing: a valid profile selects its configured spec layout, identifiers, carriers, and cardinality; an absent profile selects the strict default below. A declared but malformed, unsupported, or unresolvable profile is `BLOCKED`; report the validation evidence and never treat it as absent or fall back. Do not infer a profile from repository language, a file extension, or one example.

When `specArtifacts` is absent, the strict business default is the TC format in `shared/tc-format.md`, including its Section 8 representation and one-TC-to-many-tests mapping. A valid native profile replaces the default representation at the canonical owner; it does not add a parallel case registry. A configured YAML, inline-data, or other carrier is a representation choice, not another source of truth.

Every profile preserves this semantic chain:

`Requirement/Invariant -> accepted Decision -> accountable Task -> canonical Scenario/Case -> executing Test + inspected assertion/result -> Source evidence -> spec/doc reconciliation`

The canonical scenario or case remains linked to its requirement or invariant, intent, expected positive and negative outcomes, actual executor and assertion, implementation evidence, and reconciliation status. Every case requiring executable proof maps to at least one actually executing test or an explicitly approved manual-QC carrier; otherwise report it as uncovered or `UNKNOWN`/`BLOCKED` per the selected profile, never `PASS`. A profile may define one test for several scenarios, several test or variant rows for one scenario, or another explicit cardinality. Preserve the owner-qualified scenario identity and any variant-row identity; map every claimed result to its actual executor and inspected assertion. An aggregate result proves only the rows whose assertions are shown to execute.

For example, a configured native profile may keep scenario IDs in the owning spec and its existing YAML or inline case-data carrier, let one aggregate executor cover several owner-qualified scenarios, and let one scenario have multiple variant rows. The rows express the existing scenario contract; they do not create a second scenario registry.

| Profile check | Pass condition | Fail condition |
| --- | --- | --- |
| Strict default business profile | `specArtifacts` is absent, so canonical business cases use the TC/Section 8 contract in `shared/tc-format.md`. | A consumer silently omits TC/Section 8 obligations or treats an unconfigured format as native. |
| Configured native profile | A valid profile selects one canonical source, its identifiers, carriers, and cardinality; each owner/scenario/variant maps to the actual test assertion and outcome. | A profile-specific test summary is accepted without inspecting its mapped assertions or scenario outcomes. |
| Declared invalid profile | A malformed, unsupported, or unresolvable `specArtifacts` profile blocks with its validation evidence; it is never treated as absence. | The strict default is silently substituted or a guessed profile is used. |
| Registry ownership | Native cases replace the default representation at the same canonical owner; indexes or generated views remain projections. | TC and native scenario records duplicate the same case or split its intent across competing registries. |
| Product decomposition | Independent, releasable product outcomes drive outcome slices; technical tasks remain delivery tasks. | Numbered technical stages are counted as product outcomes solely because they are separately ordered or verified. |

Profile selection may change representation and cardinality only. It does not waive M1-M7, evidence quality, intent and outcome checks, invariant/property and boundary-case coverage, preservation of healthy behavior, actual test execution, operation-authority gates, or reconciliation to the canonical owner. The TC-specific section and field names below describe the strict default profile; apply their semantic checks through the corresponding fields in a configured native profile.

## AI-SDD Mandates (M1-M7) — BLOCKING

Every AI-SDD artifact (feature doc, engineering spec, test spec, task/story, initiative) MUST satisfy the mandates that apply to its tree and authorship model or be REJECTED and reworked. M1-M6 are the default gates for canonical business artifacts; M7 is a business-tree gate and a routing rule for keeping architecture-derived cases in the technical tree. Derived technical specs declare their exemptions explicitly (for example, M1-exempt) and still MUST NOT author business content or weaken M7 for the business tree. These are hard gates, not guidance. Create/update skills MUST NOT emit violations; review/gate skills MUST FAIL on applicable mandate violations (M6). Each mandate points to the detailed gate/section that defines its full checklist, so this block stays a stable named anchor rather than a duplicate of the gates below.

| ID     | Mandate                       | Rule (one line)                                                                                                                                                                | Full checklist in            |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| **M1** | Tech-agnostic prose           | Narrative, headings, summaries, tables, glossaries MUST NOT name frameworks, products, language-native types, or product/design-pattern class names.                           | Tech-Agnostic Spec Writing   |
| **M2** | No source code in prose       | Prose MUST NOT contain class/method names, file paths, namespaces, or language constructs; use business operation names. Source identifiers live only inside evidence carriers. | Tech-Agnostic Spec Writing   |
| **M3** | Abstract-IDs-first trace      | Configured logical requirement, rule, operation, and scenario/case IDs are the PRIMARY citation spine; the strict default business profile uses FR-/BR-/OP-/TC-. Evidence uses stack-portable abstract anchors (`[Source: namespace/service/id]`), NEVER physical `file:line`. | Traceability Schema          |
| **M4** | AI-implementability           | One valid interpretation per requirement; observable completion states; named failure modes; no hallucination bait.                                                            | AI-Implementability Gate     |
| **M5** | Rebuild-from-scratch purpose  | A competent team with zero codebase knowledge can re-implement identical business behavior on ANY stack from the artifact alone.                                                | Implementation-Complete Gate |
| **M6** | Review enforces applicable mandates | Every review/gate skill MUST check every mandate that applies to the artifact tree/model and FAIL with the specific mandate ID(s) violated and a concrete reason.                         | Enforcement Roles            |
| **M7** | Business-visibility           | A business-tree artifact contains ONLY cases a user or QC can **demo** as a business outcome. Architecture-derived cases or case counts (TCs in the strict default profile) are FORBIDDEN — they belong to technical coverage. | Business-Visibility Gate     |

**Carrier carve-outs (NOT M1/M2 violations):** `[Source: ...]`, `**Evidence**`, `CoveredBy:` fields (legacy `**IntegrationTest:**` only as migration input); YAML frontmatter keys; ` ```mermaid ``` ` blocks; and dedicated rebuild/reimplementation guides. Source identifiers are permitted ONLY inside these carriers — never in narrative prose. — why: quarantining real references keeps prose stack-portable while preserving an auditable code link.

### Enforcement Roles

- **Create/update skills** (feature docs, engineering specs, test specs, tasks/stories, initiatives, doc sync) MUST enforce the applicable mandate set at authoring time. Business-tree artifacts enforce M1-M7. Derived technical specs enforce their generator contract and declared exemptions, and MUST route business content back to the business tree instead of authoring it.
- **Review/gate skills** (feature-doc review, spec review, story/task review, challenge, artifact review, change review, readiness-check gate) MUST CHECK the applicable mandate set and FAIL with the violated mandate ID(s) and a specific reason. A review that passes an applicable violation is itself defective (M6).

> Project repositories MAY extend these mandates with local banned-token lists, evidence formats, and ID namespaces in the project-reference docs root (default `docs/project-reference/**`; path from `docsRoots.projectReference.path` in `docs/project-config.json`), but MUST NOT weaken M1-M7.
>
> ⚠️ **M7 is the mandate a project is most tempted to weaken**, because M7 is the only mandate that DELETES work rather than rewording it — and it is the one whose violations arrive one bugfix at a time, each individually defensible. **A local "our sync/consumer cases are business-critical, so they stay" extension IS a weakening of M7**, whatever it is titled. If a case is genuinely business-critical, it is demoable — rewrite it demoably and it survives M7 untouched. **A case that cannot be rewritten demoably is precisely the case M7 exists to move.**

## Core Cycle

Every non-trivial code-changing workflow follows:

`spec -> plan -> tasks -> implement -> verify -> update spec/docs`

Bugfix workflows use the same cycle with a root-cause gate before regression tests:

`current behavior -> expected behavior -> code bug vs spec bug -> regression case in the configured profile (TC by default) -> fix -> proof -> sync`

## Required Artifacts

| Artifact                     | Required For                       | Minimum Content                                                                             |
| ---------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Requirements or bug analysis | Feature, task, bugfix               | User/business intent, scope, explicit non-goals, assumptions, unresolved clarifications     |
| Acceptance criteria          | Feature, task, bugfix               | Given/When/Then, EARS, or equivalent testable conditions                                    |
| Design/plan                  | Code-changing work                 | chosen approach, rejected alternatives, risk, affected files, verification strategy         |
| Task graph                   | Multi-step work                    | independently verifiable tasks, dependencies, safe parallelization notes                    |
| Test specs                   | Behavior change                    | Canonical scenario/case identity (TC by default), intent/invariant guarded, priority, evidence, expected outcome/failure, and configured test mapping |
| Implementation evidence      | Code changes                       | files changed, source references, verification output                                       |
| Docs/spec sync               | Behavior or public contract change | updated canonical spec/docs and configured case ↔ executing-test reconciliation (Section 8 TC sync under the strict default profile); skipped reason if not applicable |
| Handoff/closeout             | All workflows                      | remaining risks, commands run, artifacts updated                                            |

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

A spec is test-complete when tests can be derived without reading implementation source. The rules below refer to canonical scenarios/cases; they use TC IDs under the strict default profile and the configured logical identity and carrier under a native profile.

Minimum checklist:

- every functional requirement maps to at least one positive canonical case
- every business rule maps to at least one negative canonical case
- every authorization rule maps to at least one unauthorized-access case
- every state transition maps to at least one valid and one invalid transition case where applicable
- every integration event maps to a publish/consume/idempotency case where applicable
- bugfix specs include preservation cases for behavior that must not regress
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

## Business-Visibility Gate

**[BLOCKING — M7]** The business tree states **intended business behavior**; the technical tree states **how one implementation delivers it**. Both are real; only their contents differ. **M1 (tech-agnostic prose) is NOT sufficient to keep them apart** — M1 governs *vocabulary*, M7 governs *subject matter*, and a technical case written in impeccably tech-free prose satisfies M1 while violating M7. **That gap is the single most common way business specs rot.**

The strict default profile calls business cases Section 8 TCs. A configured native profile may use different identifiers, files, tables, or YAML/test-data carriers; apply the same demo test, coverage-resolution, anti-amputation, and deletion safeguards to its canonical case and variant rows. Do not add TC entries beside an established native case source. The detailed TC headings and carrier examples below describe the default representation; their semantic safeguards apply through the configured profile's fields and identity rules.

### The operative test

> **Could a QC engineer DEMO this as a business outcome, and would a stakeholder recognize the value?**

If the only way to observe it is to inspect a queue, a projection, a consumer, a log, or a stored record that **no user-facing behavior depends on** — it is **TECHNICAL-ONLY** and MUST NOT appear in the business tree.

⚠️ **The test is NOT "can I phrase this without technical words."** Any technical case can be laundered into tech-free prose. *"The system correctly synchronizes the record"* names no framework, passes M1, and is still a technical test case wearing a business costume. **Ask what a user could SEE, not which words were used.**

| | **BUSINESS-VISIBLE** → business tree | **TECHNICAL-ONLY** → technical tree |
| --- | --- | --- |
| **Subject** | a business rule, a user-visible outcome, a business data state | a mechanism that delivers it |
| **Examples** | wrong total/status/permission decision; a documented AC not holding; an incorrect business data state a user relies on | consumer/event-handler/sync not firing; read-model or projection lag; serialization/mapping/round-trip defect; null-reference; query/index performance; race or idempotency; DI/config/migration; retry/timeout; UI rendering/CSS/layout/overflow; data-load or pagination mechanics |
| **Observable by** | a user or QC, in a demo | inspecting infrastructure |

*(Examples are illustrative, never exhaustive — the demo test governs. When genuinely uncertain, ask: "what would the stakeholder SEE change?" No answer → TECHNICAL-ONLY.)*

### Finding the technical cases that ALREADY EXIST — the detection recipe (REPORTS, never blocks)

The demo test above governs **authoring**. It detects **nothing already written** — and a banned-token list cannot
close that gap, because **the tokens are not there**. A technical TC that names no technology scores 0 on every token
rule and stays green forever (the failure `:179` names). **So a token backlog reaching 0 is NOT evidence of a clean
business tree**, and a corpus split must never be driven by one.

**The highest-yield signal is the `When`.** A business TC's `When` is an action a person takes. A technical TC's
`When` is an invocation. Portable grep proxies over a spec tree (no toolchain, no Node):

| Proxy | Catches |
| --- | --- |
| `When .*[A-Z][A-Za-z0-9]+(Query\|Command\|Handler\|Consumer\|Job\|Service\|Repository)` | `When GetRecruiterLeaderboardQuery is called` — the `When` is an invocation |
| `When .* is called\|When .* executes\|When .* runs` | an invocation with the identifier elided |
| `Then [A-Z][A-Za-z0-9]*(\.\| is empty\| is null\| == )` | `Then Items is empty` — the `Then` is a result property, not a sight |
| **Two TCs citing the SAME business-rule ID** (`Proves:` / `Traces:`) | one is likely a technical restatement of the other — it adds **zero** business coverage |

> ### ⚠️ REJECTED PROXY — recorded so it is not re-invented: **the letter-suffixed TC ID** (`TC-X-080` → `TC-X-080a`).
>
> **It looks like the bugfix pump's fingerprint. It is not.**
> Corpus sweeps commonly show that letter suffixes are often just a numbering convention for a **family of related business cases** — e.g.
> `…-006a/b/c/d: Import Rejects a Missing / Wrong-Type / Empty / Oversized File`, four demoable cases sharing a stem.
> **Where a suffixed TC WAS technical, the suffix was incidental — the `When` naming a code identifier was doing all
> the work.** ⚠️ **Wiring this proxy to anything would flag correct business TCs and invite exactly the
> suppression that kills a detector.** **A shared numbering stem is a filing decision, never a semantic one.**

**The same-rule-ID cross-check** (last row) is the strongest signal here — two TCs proving one rule is a
contradiction no wording can hide — **but it is UNMEASURED.** It is reasoned, not controlled. ⚠️ **Measure its
precision on your own corpus before trusting it**: a family of boundary cases may legitimately share one rule ID,
which would false-positive the same way the suffix did.

> **[HARD] These are PROXIES. They REPORT; they NEVER block.** They have false negatives **by construction** — a TC
> reading *"Then the stage average is computed in a single pass"* is technical and matches **none** of them. **The
> pattern that finds a category's obvious members is never the category's definition**, so a clean sweep here is
> **not** evidence of a clean tree; it is evidence the patterns did not match. **Only the demo test, applied to each
> TC's body, decides.** Wiring any of these to `error` earns a suppression, and a suppressed detector is a dead one.

### [HARD] Removing a technical TC from a business spec — the procedure

**A technical TC in a business spec is DELETED, never RELOCATED.** Relocation produces a hand-authored technical
tree — the `hand` + `exempt` shape that competes with the Feature Spec as a second source of truth. **Do not create
one, and do not create one under a new root name: an exemption at a new address is still an exemption.**

**Per TC, in this order. Each step is a gate — a failure STOPS the deletion, it does not soften it.**

1. **Judge the BODY, never the title or the ID.** Apply the demo test to the `Given/When/Then`. Titles lie; a
   business-sounding title routinely fronts an invocation-shaped `When`.
2. 🔴 **[BLOCKING] Resolve the covering test through the MEASURED union of join carriers — never one pattern.**
   **A single join pattern is a structural proxy, not the definition of "covered".** Before ANY deletion pass, MEASURE
   which carriers this corpus actually uses; expect **several coexisting**, e.g.:
   - a test-side annotation/attribute/tag naming the TC ID;
   - a **spec-side** pointer naming the test (`Class::Method`-shaped);
   - bare method-name references, or naming conventions with no machine-readable link at all;
  - **a plain COMMENT naming the TC ID** (`// TC-…`) — carries no machine-readable link, is invisible to every
    attribute/tag join, and can be the only carrier in older test areas.

   🔴 **[BLOCKING] A coverage FIELD named for ONE test tier structurally manufactures false orphans.** If the spec's
   field is `**IntegrationTest:**` but a TC is guarded by a **unit** test (or E2E, contract, property test), **the
   spec has no field in which to name its real covering test** ⇒ it is *forced* to record `none`/`Manual` **no matter
   what actually guards it**. ⚠️ **The stale `Status:` line is then a SYMPTOM, not the defect** — and "fixing" the
   line leaves the generator intact to reproduce it. ⇒ **Name the coverage field for the OBLIGATION (`CoveredBy:`),
   never for a test tier**, and let it name any executing test. **A spec that cannot express where its guard lives
   will lie about having one.**

   **Then treat BOTH failure directions as BLOCKING, because the join fails in both:**
   - 🔴 **FALSE ORPHAN (looks safe to delete, isn't).** Pattern returns nothing ⇒ reads as "no test covers this" ⇒
     reads as "free to delete". **An empty result from ONE carrier is NOT absence of coverage** — the test may exist
     under another carrier, **or under a DIFFERENT ID namespace entirely** (an ID migration that updated the spec but
     never reached the test leaves the spec claiming `Tested` while the test carries the OLD ID). **`not found` ⇒
     `UNKNOWN`, NEVER `ORPHAN`.** Deleting on `UNKNOWN` is deleting on ignorance.
   - 🔴 **FALSE COVERAGE (looks tested, isn't).** The ID resolves — to the wrong test. **TC IDs are NOT guaranteed
     unique**: the same ID may be bound by two unrelated tests, or claimed by a test in a **different module/service**
     that tests different behavior. The check answers "does something carry this string?", **never** "is THIS TC's
     behavior actually guarded?" ⇒ **Confirm the resolved test's SUBJECT matches this TC's `Given/When/Then`.**
     An ID match is a string match; only the body match is evidence.
     - 🔴 **[BLOCKING] The resolved artifact MUST BE A TEST — confirm it, never assume it.** A corpus-wide search for
       the ID matches **PRODUCTION source too**: implementations routinely cite the TC they satisfy in a comment.
       ⇒ A join scoped to "the ID appears somewhere under the source root" **resolves a TC to a production file and
       reports it COVERED.** ⚠️ **This is the direction that LICENSES deletion** — a false orphan merely blocks work;
       false coverage deletes a TC whose only "guard" was the implementation citing it, which guards nothing.
      A comment carrier `// TC-…` can appear in DTOs, domain services, frontend effects, or other production files.
       ⇒ **Require the resolved file to be a test artifact** (test project/suite membership, test-framework
       annotation, or an executing assertion), **and say which of those you checked.**

   **Then, and only then:** the covering test's **rationale — the *why*, not the assertion — MUST already exist in the
   test** (doc-comment, summary, or header comment). **If the why exists ONLY in the spec, DELETING IT DESTROYS IT.**
   ⇒ **STOP. Move the rationale into the test FIRST, then delete.** ⚠️ **This is the step that turns a split into data
   loss, and it is invisible afterwards** — the derived view regenerates and looks complete, because a generator cannot
   miss what was never in its source.

   ⚠️ **Never gate on the spec's OWN `Status:` self-report.** It is untrustworthy in **both** directions — TCs marked
   `Untested`/`Planned` that DO have tests, and TCs marked `Tested` whose named test carries a different ID. **Join on
   the test; the spec's claim about itself is testimony, not evidence.**
   ⚠️ Distinguish **declared-manual** coverage from a **silent gap**. "No automated test" ≠ "untested" when the corpus
   deliberately marks cases manual-QC-only. Conflating them manufactures orphans by the dozen.

3. 🔴 **[BLOCKING] Anti-amputation — a surviving CITATION is not surviving COVERAGE.**
   For **every** business rule the TC cites, **≥1 REMAINING business TC must still cite that rule** — **AND that
   remaining TC's covering test MUST exist (per step 2's union) AND carry the rule's *why*.**
   If a rule would lose all its TCs, **this TC is that rule's only guard — it is NOT purely technical. Do not delete
   it; rewrite it demoably.**
   ⚠️ **A citation-only check PASSES while the rule loses its last automated guard** — the surviving citers can all be
   manual-only or untested, so the rule keeps a demoable sibling **on paper** and zero regression protection in fact.
   This failure mode silently drops a [HARD] rule's automated coverage while count-based gates report success.
   ⚠️ **Without this check the cheapest way to reach any "0 findings" target is to delete the evidence**, and every
   counter reports success.
4. **Verify by count, per file.** `count(before) == count(business after) + count(deleted)`. ⚠️ **Count RAW
   headings, never distinct IDs** — a corpus may contain **duplicate TC IDs**, and **dedup is precisely the
   operation that hides them**: a distinct-count balances while a TC silently disappears.
5. **Leave a pointer where they were**, naming what left and why. **A silent deletion invites the next bugfix to
   refill the hole** — which is the pump this whole procedure exists to stop.

> **Why per-file, and why that is not a compromise:** a TC never migrates between feature files, so the corpus
> invariant is the **SUM of per-file invariants**. **The per-file count needs no tooling and is STRICTLY STRONGER
> than a corpus-wide distinct-count** — it catches the duplicate IDs a global dedup destroys. **If a corpus-wide
> baseline is unavailable, the split is NOT blocked.** ⚠️ *Reaching for the global instrument here is not rigour —
> it is the weaker measurement wearing rigour's clothes.*

### [HARD] The TC floor MUST NOT be architecture-derived

**A business TC count derived from an operation/handler inventory is FORBIDDEN.** A floor of the shape `writes + reads + events + jobs` mints a business TC for every consumer, event handler, and background job, and **moves when the system is re-architected though no business behavior changed** — which directly falsifies **M5** (the same feature as a monolith or as microservices MUST yield the same stories, ACs, and TCs).

**Every floor term MUST name the spec section it reads from**, so closure is checkable by *reading the formula* rather than by trusting a claim about it:

```
business_floor = (user stories × acceptance criteria)
               + count([HARD] business rules)
               + count(entity invariants)
               + count(state transitions) × 2   // valid + invalid
               + count(actors) × 2              // authorized + unauthorized
               + count(observable states)
```

**[HARD] No term may be fed by a source grep.** ⚠️ **A business-shaped formula over a technical input is a technical floor wearing a business name** — e.g. sourcing `count(actors)` from a permission-guard grep lets a new authorization attribute move the "business" floor by +2 with zero business change. **A term's shape is not its input; check the input.**

**Falsifier — the test that decides it (MUST fail before the fix, pass after):** add an authorization attribute naming a new role, **and** add a handler → **the floor MUST NOT move.** If it moves, the floor is architecture-derived regardless of what it is called. *A grep for the formula's spelling reads its NAME; only the falsifier reads its INPUTS.*

### [HARD] A no-op is a correct outcome

**When a change alters no business behavior, the correct business-tree output is ZERO new cases.** Record the verdict — `TECHNICAL-ONLY — no business behavior changed`, naming the surface with evidence — and stop.

- **A no-op is NEVER a coverage failure and MUST NOT be recorded as a gap.** Most bugfixes are technical: the feature was always *supposed* to work this way and the code failed to deliver it. **Pre-fix and post-fix business behavior identical → the rule was already correctly specified → nothing to add.** The spec was not wrong; the code was.
- **An artifact is NOT under-covered because it has fewer cases than the system has handlers.** That comparison reads an architecture count as a business obligation.
- **Never manufacture a business case to satisfy a process.** An artifact that gains a case per bugfix becomes **a changelog of defects instead of a statement of intended behavior** — un-demoable, and useless for re-implementation (M5).
- **Record the verdict either way, naming the surface.** A bare "TECHNICAL-ONLY" with no named surface is a rubber stamp; the citation is what makes it reviewable.

> **Nothing here abolishes an obligation — it re-homes it.** Technical coverage is real and MUST be owned by the technical tree and its integration tests, which is where regression protection belongs. **A split that drops obligations is a regression, not a cleanup.** ⚠️ **A deletion satisfies every "zero hits" check ever written:** always pair an absence check with a presence check, or "removed" passes as "re-homed".

## Verification Controls

**[BLOCKING] The positive-control rule — a negative result from an unvalidated instrument is NOT evidence.**

> **Run every check against a case you KNOW is DIRTY (expect it to FAIL) *and* a case you KNOW is CLEAN (expect it to PASS).**

**A check validated in one direction is half a control:**

| Failure | Symptom | Caught only by |
| --- | --- | --- |
| **False-CLEAN** (permanently-green) | passes on **every** input, including a knowingly-broken one | the **dirty** case |
| **False-ALARM** (permanently-red) | fails on every input — **so it passes every negative test ever written**, while certifying nothing | the **clean** case |

**Both halves are mandatory. Most harnesses specify only the dirty case and are therefore blind to false alarms** — and a false alarm is worse than no check: it manufactures alarming, plausible, entirely fictional findings, and it *looks* like diligence.

- **A count without its query is not evidence.** Publish the exact command beside every number; two different queries legitimately return two different numbers, and a bare number cannot be re-run.
- **A baseline set to "≥ what I already listed" is a mirror, not a measurement.** It passes by construction.
- **A check that only runs AFTER a change cannot distinguish "the fix worked" from "the check never worked."** Run it before, and require it to FAIL.
- **Escaped/quoted metacharacters silently change meaning across shell and regex dialects** — the same string can be a defect in one command and mandatory in the one beside it. **Demonstrate the pattern against its target and paste the hit; never reason that "the regex looks right."**
- **[HARD] A PASS mark is a claim about an OBSERVATION. Write it only AFTER reading the output — never from the expectation.** Recording a result you are confident of, but have not read, is **fabrication**, not shorthand — and it is the single easiest violation to commit while writing *about* verification. **If the command has not returned, the only honest cell is `PENDING`.**
  - ⚠️ **A CORRECT value obtained by fabrication is the dangerous case, not the harmless one.** When the guess matches, nothing ever fails, nobody looks, and the fabricated cell is indistinguishable from a measured one **forever**. *Wrong guesses get caught; right ones become permanent.* **Confidence in a prediction is never a licence to record it as a result.**
- ⚠️ **Reciting this rule confers NO immunity to it.** It is routinely violated by authors who can state it — including *inside audits of this very failure mode*, and including **inside the prose asserting compliance with it**. **That is why it is a mechanism, not a maxim: run the two cases, read the output, then write the mark. Do not introspect.**

## Tech-Agnostic Spec Writing

**[BLOCKING — M1/M2]** Business specs MUST describe business behavior, not implementation mechanics. Narrative prose MUST NOT leak implementation identifiers; framework/product names, language-native types, and class/method/file-path references are permitted ONLY inside evidence carriers (`[Source: ...]`, `**Evidence**`, `CoveredBy:`, legacy `**IntegrationTest:**` as migration input), YAML frontmatter, and ` ```mermaid ``` ` blocks. Authoring tools FAIL the artifact on any prose leak; review tools FAIL the review (M6). Derived technical specs may name implementation details only under their explicit technical-tree exemption and generator contract.

Avoid implementation leakage:

| Avoid                                         | Prefer                                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| language-native types                         | business-level primitive types and constraints                          |
| ORM, repository, framework, or mediator names | persistence layer, operation handler, or project-approved business term |
| message-broker product names                  | message bus or event bus                                                |
| auth-provider product names                   | identity provider, authentication token, role, or permission            |
| class names and file paths in prose           | business operation names; abstract anchors (`namespace/service/id`) in evidence carriers |
| caller-specific exceptions                    | caller-agnostic business rules                                          |

Public API paths, product-specific role names, domain terms, or externally visible contract names are acceptable when they are part of the product contract.

## Traceability Schema

**[M3 — Abstract-IDs-first]** Logical identifiers for requirements/invariants and canonical scenarios/cases are the PRIMARY citation spine and MUST appear in requirement and rule statements. The strict default business profile uses its TC identifiers; a configured native profile uses its declared logical IDs. `Source` evidence uses stack-portable abstract anchors (`[Source: namespace/service/id]`), NEVER physical `file:line` — an anchor names WHICH logical artifact implements/verifies behavior, never WHAT the requirement is, and stays out of narrative prose. Physical coordinates are recoverable only through a provenance sidecar rooted at the configured business-spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides it); the default business profile uses `.sdd-provenance-map.jsonl`. Keeping the logical spine + abstract anchors stable lets specs survive a stack migration with zero re-pointing.

Each requirement or bugfix invariant should trace through this chain:

`Requirement/Invariant -> accepted Decision -> accountable Task -> canonical Scenario/Case -> executing Test + inspected assertion/result -> Source evidence -> Docs/spec reconciliation`

Minimum trace fields:

- `RequirementId` or `Invariant`
- `Decision`
- `Task`
- canonical `Scenario/Case` identity (a TC under the strict default profile)
- actual `Test` executor(s), assertion(s), and result(s), using the configured cardinality
- `Source`
- `Docs`
- `Status`

**Default TC ↔ Test cardinality is one-to-many.** Under `shared/tc-format.md`, a business TC is a user-story acceptance scenario verified by **one or more** tests, with each test mapped to one primary TC except a documented alias/deprecation bridge. This is the strict default profile. A configured native profile may declare another relation, including one executor covering multiple owner-qualified scenarios and multiple variant rows or tests for one scenario. In every profile, do not split a business outcome to fit a test method; do not mark aggregate coverage without tracing every claimed scenario/variant to an actual executing assertion and result. Unknown coverage remains unknown. (Default cardinality details: `shared/tc-format.md` → TC ↔ Test Code Cardinality.)

Use `N/A` only with evidence:

`N/A - <reason>; Evidence: <command output or [Source: namespace/service/id]>`

## Code-To-Spec And Spec-To-Code

Code-to-spec extraction:

- read existing source and tests before writing or updating specs
- distinguish implemented behavior, intended behavior, and accidental behavior
- cite source evidence for implemented behavior
- mark unverified claims instead of filling gaps with plausible assumptions
- treat extracted specs, cases (TCs under the strict default profile), and behavior notes as reference-only until accepted by the canonical spec owner; extraction evidence may inform the spec but must not silently replace accepted intent
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
- If the spec is wrong, update the spec first, then update cases and tests in the configured profile.
- If code is wrong, write/update a regression case against intended behavior before implementation.
- If tests are stale, update tests to protect intended behavior, not just current behavior.
- If a dashboard differs from the canonical case source, forward-sync from that source unless an explicit recovery workflow is approved.
- If code correctly enforces a rule the spec never states (spec-silent), add the missing rule and its canonical case to the spec, then a guarding test — never leave a discovered invariant unwritten. — why: an unwritten invariant is one refactor away from being silently deleted.

### [HARD] A translated or duplicated spec is a MIRROR, not a peer

**Two spec files describing the SAME feature are a second source of truth** — the exact shape this contract
forbids everywhere else. A translation, a localized copy, a "simplified" variant, or a per-audience duplicate is
**DERIVED**, and derived artifacts obey the same rule as generated agent mirrors: **edit the source, propagate to
the mirror — never the reverse.**

- **[BLOCKING] Every duplicated/translated spec MUST name its authoritative source**, machine-readably (e.g. a
  frontmatter `derived_from:` / `source_of_truth:` key). **A duplicate with no declared source is UNGOVERNABLE** —
  no reader, and no gate, can tell which side is right. ⇒ Declare the source, or delete the duplicate.
- 🔴 **[BLOCKING] NEVER reconcile mirror → source.** When they disagree, **the source wins by definition** and the
  mirror is re-derived. ⚠️ **Reconciling the other way silently promotes the mirror's drift into canon** — and
  because the mirror usually LOOKS more polished (someone recently edited it), it is the more tempting side to
  believe. **Recency is not authority.**
- **[BLOCKING] A mirror MUST NOT be the only home of any rule, TC, or rationale.** If it is, that content is
  **lost at the next re-derive**, invisibly — the same data-loss shape as deleting a why that lives only in a spec.
- **Drift in a mirror is a defect in the MIRROR, never evidence about the source.** A mirror that contradicts a
  `[HARD]` rule is not a competing interpretation — **it is a broken copy asserting a business rule the system does
  not implement.**

> ⚠️ **Why this is a HARD gate and not hygiene:** a mirror drifts **silently and asymmetrically**. It typically
> holds FEWER cases than its source (translation lags), drops the fields translators see as boilerplate (**the
> `Business Intent` / rationale paragraphs**, precisely the content Gate 2 exists to protect), and — worst —
> **inverts rules through ordinary translation ambiguity**, e.g. a scope quantifier rendered as *"the first
> record"* where the source says *"every record created in that operation."* **Each of those reads as a
> legitimate spec to anyone who opens only the mirror.** ⚠️ **M5 is what breaks:** if two files disagree about the
> business rule, *"a competent team can re-implement identical behavior from the artifact alone"* is **false** —
> the team re-implements whichever file it happened to open. **A spec corpus with an unreconciled mirror has no
> source of truth; it has two candidates and a coin flip.**

#### 🔴 [BLOCKING] "Which file is the mirror" is answered PER-RULE, never PER-FILE

**The rule above assumes ONE axis of authority. Real corpora have TWO, and they dissociate:**

| Axis | Question | Naive proxy that FAILS |
| --- | --- | --- |
| **Wording-recency** | which file's prose was cleaned/translated more recently? | `last_updated:`, tidier language, "looks canonical" |
| **Content-completeness** | which file is the only home of a given rule, TC, or rationale? | file size, TC count, directory name |

⚠️ **A duplicate can be the WORDING-MIRROR and the CONTENT-SUPERSET at the same time** — an older, less-polished
ancestor that nonetheless still holds rules its cleaned-up descendant never received. **Reading "mirror" off the
wording axis and then deleting the file destroys every rule that lived only on the content axis** — and the
deletion reports success, because file-granularity hides the N rule-level deletes inside it.

**Failure example:** a cleaned descendant held 26 TCs while its ancestor held 36. File-level retirement would have erased 10 tested cases and a uniquely held [HARD] rule. Wording authority and content completeness must therefore be assessed separately.

- 🔴 **[BLOCKING] RECENCY IS NOT COMPLETENESS.** The reciprocal of *"recency is not authority"* above, and the
  half every reader supplies for themselves incorrectly. **A newer file routinely holds FEWER rules.** A `[HARD]`
  rule does not become non-canonical by living in the file someone stopped editing.
- 🔴 **[BLOCKING] Before declaring EITHER file the mirror, MEASURE the set difference in BOTH directions.**
  A one-directional diff finds only the drift you went looking for. ⚠️ **Compare BODIES, not titles or IDs** —
  matching titles hide reused IDs (one ID, two unrelated subjects) and diverged bodies under identical headings.
  **Publish both counts and the query.**
- 🔴 **[BLOCKING] Deleting a "mirror" file MUST clear the SAME bars as deleting each TC inside it** — Gate 2
  (covering test resolved through the MEASURED carrier union; `not found ⇒ UNKNOWN, NEVER ORPHAN`) and Gate 3
  (anti-amputation), **once per rule and per TC.** A file-level delete is N TC-level deletes wearing one approval.
- **When the axes disagree, the resolution is MERGE-THEN-RETIRE, never RETIRE:** forward-port every rule/TC/why
  that the content-superset uniquely holds INTO the wording-authoritative file (**IDs verbatim — never renumber**),
  **verify the port landed by re-reading the target**, and only then may retirement of the duplicate be *proposed*
  to a human. **Additive first, subtractive only after — and never in one step.**
- ⚠️ **This does NOT contradict *"never reconcile mirror → source"* above — the two govern DIFFERENT operations,
  and conflating them is how one of these gates gets "resolved" away:**
  | The files… | Operation | Verdict |
  | --- | --- | --- |
  | **DISAGREE** about a rule (both state it, differently) | take the mirror's version | 🔴 **FORBIDDEN** — the source wins by definition; this is Gate 6 |
  | **DO NOT OVERLAP** — the mirror states a rule the source is SILENT on | port it into the source | ✅ **REQUIRED** — this sub-gate, and the Drift Gate on spec-silent rules |
  **Absence is not disagreement.** The source cannot "win" a contest it never entered — deleting a rule because
  the authoritative file omits it treats silence as a verdict. Gate 6 resolves CONFLICTS; this sub-gate resolves
  GAPS. Apply the rule that matches which of the two you actually measured.

> ⚠️ **The generalization worth carrying:** *the axis that identifies a category's obvious members is not the
> category's definition.* Wording-recency identifies most mirrors correctly, which is exactly what makes it
> trusted as the definition — and exactly why the case it misclassifies is the one that costs data. **Any
> single-signal test for "which artifact is derived" is a proxy; name the signal you used and state what it
> cannot see.**

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
2. Read `docs-index-reference.md` in the project-reference docs root (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides the path) to discover the relevant reference docs.
3. Read only the reference docs needed for the active task.
4. Follow the target repository's canonical spec/test/doc owners.
5. If `docs/project-config.json` or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-manager --mode=init`, `$scan-all`, or `$scan --target=<key>`) before applying project-specific rules.

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
- MUST ATTENTION specs, tests, and code stay traceable through requirements, decisions, tasks, canonical scenarios/cases (TCs under the strict default profile), evidence, and docs.
- MUST ATTENTION when adapting this contract, read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`; if either file or a required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route before ordinary project-specific work.
- NEVER edit `.agents`, `.codex`, or `AGENTS.md` mirrors directly; source change belongs in `.claude`, sync happens later.
