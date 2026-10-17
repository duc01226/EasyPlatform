---
name: tech-spec
description: '[Documentation] Use when generating the DERIVED technical spec view over code and tests, or reporting §8 TC drift. Generator only, never authors business content. generate|audit|sync.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `$start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

> **Portability:** the technical root is read from `docs/project-config.json` → `specRoots.technical.path` (declared `authorship: "derived"`, `m1Policy: "exempt"`). NEVER hardcode a root. `{TechRoot}/{Service}/{Component}.md` is a **pattern** — `{Service}` and `{Component}` are placeholders resolved from the repo, never literal names.

**[IMPORTANT] todo tracking** — Break ALL work into small tasks BEFORE starting (one task per emitted artifact).

**Goal:** For annotation-compatible projects, project code and configured test annotations into a regenerable technical view without creating a second source of truth; route native-case reconciliation to its canonical owner and never report unsupported generation as empty success.

**Summary:**

- Project code and configured `TestSpec` / `TechnicalSpec` annotations into a DERIVED technical view; business content belongs to `$spec`.
- Resolve profile/root/scope/mode → derive facts → instantiate fixed templates → stamp/write each artifact immediately → verify banners, anchors, emit set, secrets and idempotency.
- Native profiles route `sync` to `$spec [mode=sync]` and return `UNSUPPORTED` for generation. Absent `techSpecScan` is `NOT CONFIGURED`; malformed profiles block. Never substitute strict §8/TC defaults for a declared native profile or claim empty success.
- Read [references/author.md](references/author.md) before `generate` or `audit`, and [references/sync.md](references/sync.md) before strict-default `sync`. Audit reports freshness without mutation; sync reports/routes drift without authoring.

**Scope:** Write only under `specRoots.technical.path`; the Feature Spec under `specRoots.business.path` owns §1–§8. Technical prose is M1-exempt (`m1Policy: "exempt"`), but business content and the forbidden emit set below remain banned. Read `spec-system-reference.md` under the configured project-reference root when resolving project ownership (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides the path; open it directly through docs-index routing). Read [the SDD artifact contract](../shared/sdd-artifact-contract.md) when resolving shared artifact obligations: one authored business owner, derived technical views only.

**Inputs:** supported annotation mode reads the code tree (command/query handlers, event consumers, background jobs, producers, sagas, outbox) and configured test annotations (`TestSpec` / `TechnicalSpec`). **Code is the technical source of truth** — this skill projects a view and never populates a parallel canonical layer. A native profile is not an input to this annotation generator.

**Modes:**

| Mode       | Trigger                                    | Input                                          | Output                                                                       |
| ---------- | ------------------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `generate` | default — only when the annotation generator contract applies | code + configured test annotations | `{TechRoot}/{Service}/{Component}.md`, all DERIVED (`references/author.md`); native profiles are unsupported |
| `audit`    | explicit request — staleness check          | code/test mtimes or git vs an existing derived view | Stale-list report when configured; otherwise `NOT CONFIGURED`. Never mutates |
| `sync`     | "sync tests" / "reconcile tests" / harvest  | native profile, or §8 TCs under strict default | Native: `$spec [mode=sync]` report. Default: §8/test drift and route-only `CoveredBy:` / orphan report (`references/sync.md`) |

**Tooling:**

Run from the project root with Node.js (`node --version` to probe); the generator uses built-ins and bundled framework modules, with no third-party package install. These Node commands work on Windows, macOS and Linux. If Node is unavailable, use the host’s supported runtime setup and re-probe; report a missing required runtime instead of claiming generation.

These are the ONLY invocations. `.claude/` is portable and self-running — never route this tooling
through a host `package.json` script, which does not exist in a project that copied only the bundle.
Before an interactive generation, resolve the profile and require the supported annotation contract. An absent `techSpecScan` is `NOT CONFIGURED`; do not invoke `--optional` and present its successful skip as coverage.

- `node .claude/skills/tech-spec/scripts/generate-tech-specs.mjs` — regenerate the derived technical
  views from code/test annotations.
- `node .claude/skills/tech-spec/scripts/generate-tech-specs.mjs --check` — read-only freshness and
  annotation-occurrence completeness gate. It is fail-closed when a project contract is absent or
  malformed; add `--optional` only for an orchestration entry point that should record an absent
  `techSpecScan` contract as a skip (the sync runner's `tech-spec-freshness` stage does exactly this).

**Mode resolution (do this before any work):**

1. Read `docs/project-config.json`; resolve `specArtifacts`, `specRoots.technical.path`, and `techSpecScan` before selecting a procedure. A malformed declared profile blocks; it never falls back to TC.
2. Parse the mode from the invocation: explicit `[mode=<x>]` wins; otherwise infer from the request.
3. A native profile routes `sync` to `$spec [mode=sync]`; its `generate` view is `UNSUPPORTED` and must stop before the annotation generator. Without a native profile, strict §8/TC sync remains the default; generation still requires the configured annotation contract.
4. If scope/mode remains ambiguous, ask via `ask user question tool` before mutation.
5. **Read the matching `references/` body** — it owns that mode's procedure and output contract. Do not run a mode from memory.

**Workflow:** `$investigate` (locate the component) → `$tech-spec` (project the view) → `$changes-review` → `$watzup`

**Key Rules:**

- Resolve config/profile/root and mode before generation; roots, services, components and identifiers are discovered, never hardcoded.
- Native `sync` succeeds only with the configured reconciliation report. Trace each owner/case/variant to its actual executor, assertion and run evidence; names or IDs alone do not prove coverage.
- Generate mechanically, never author or judge: fixed templates, source anchors, immediate writes, whole-tree idempotency. Harvest reports candidates; C1/C2/C6/C7 remain hard errors.

---

## Contents

- [Quick Summary](#quick-summary)
- [The Generator Contract (NON-NEGOTIABLE)](#the-generator-contract-non-negotiable)
- [Step 0 — Scope Gate (MANDATORY FIRST)](#step-0--scope-gate-mandatory-first)
- [Step 1 — Derive the Facts (grep, never recall)](#step-1--derive-the-facts-grep-never-recall)
- [Step 2 — Instantiate the Templates](#step-2--instantiate-the-templates)
- [Step 3 — Stamp & Write](#step-3--stamp--write)
- [Step 4 — Verify (self-check before completing)](#step-4--verify-self-check-before-completing)
- [Hard Prohibitions (NON-NEGOTIABLE)](#hard-prohibitions-non-negotiable)
- [Related Skills](#related-skills)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## The Generator Contract (NON-NEGOTIABLE)

This skill is a **generator**, not an author. Every clause below is structural — none is a preference a future maintainer may relax for convenience.

| # | Clause | Why |
| --- | --- | --- |
| **C1** | **[BLOCKING]** Output is **DERIVED and regenerable** — every generated file carries a `> DERIVED — regenerate with the tech-spec skill; do NOT hand-edit` banner + a regenerate date. It is **NEVER a second source of truth**. | A derived view makes no truth claim, so it cannot compete for canonical status. A hand-editable tree makes one — and then "which is right, the doc or the code?" becomes askable. |
| **C2** | **[BLOCKING]** **Never authors business content.** No user story, no acceptance criterion, no business rule, no §1–§7 prose, no §8 TC is written by this skill — in any mode. The Feature Spec stays the source of truth for all of it. | Carrying the Feature Spec's own artifact types is exactly how a rival tree competes on the Feature Spec's turf. |
| **C3** | **[BLOCKING]** **Never claims to be a source of truth.** The generated files never assert canonical authority. When the view disagrees with code, **code is right by construction and the view is stale — regenerate it.** | A derived aid that asserts canonical authority corrupts the single-writer contract. |
| **C4** | **[BLOCKING]** **Write each artifact immediately** after instantiating it; do NOT accumulate large outputs in context. | A `{Service}/{Component}` fan-out is exactly the case that exhausts context mid-run and loses every unwritten artifact. |
| **C5** | **[BLOCKING]** **Single writer.** This skill is the **sole writer** under `specRoots.technical.path`. Nothing else writes there; it writes nowhere else. | Two writers is how a view becomes a sibling. |
| **C6** | **[BLOCKING]** **Regeneration is idempotent** — regenerating over unchanged source produces an **empty diff**. | This is the tree's flagship oracle: it proves the artifact can be thrown away and rebuilt from its source. If it cannot, the tree holds content of its own — it claims truth, and it is a rival. |
| **C7** | **[BLOCKING]** **A-E filenames are never emitted.** See **Hard Prohibitions**. | An A-E bundle becomes a second source of truth competing with the Feature Spec. |

### C8 — Mechanical detect + route · never judge · never write business content

> **A generator MUST NEVER apply RIT — or any judgment test — at generation time.** Judgment produces data; generators consume data.
> Canonical formulation: [`.claude/skills/shared/sdd-artifact-contract.md`](../shared/sdd-artifact-contract.md) (beside RIT). **Cited, not restated.**

| | Who | When | Output |
| --- | --- | --- | --- |
| **Judgment** (RIT, business-invariant verdicts, visibility classification) | a human, or an AI **outside** this generator | **once**, at authoring/classification time | a **persisted verdict — data** |
| **Generation** | `$tech-spec` | every run | output **mechanically re-derived** from that data |

**Idempotency holds because nothing is re-judged.** The generator reads a verdict it did not make and cannot revise. Same source + same verdicts ⇒ same output, every run. **A generator that judges is not idempotent — it fails C6 against its own tree, permanently, and the failure reports as `hand-edited`, which is the wrong cause and undiagnosable.**

**Two resolutions that are FORBIDDEN, because both look like fixes:**

| Rejected | Why it fails |
| --- | --- |
| **Scope idempotency to only the mechanical sections** | Reintroduces a **per-section carve-out** — an exemption at a new address. A carve-out is this framework's characteristic failure; do not re-mint one inside the oracle. |
| **Cache judgments inside the generator** | The generator then owns a **staleness problem**: a cached verdict that outlives the code it judged, invisible to review and to `git`. **Persisted verdicts belong in the artifact, not in generator state.** |

### C9 — The harvest detector REPORTS; it never gates

> **A structural proxy for a semantic property REPORTS; it never blocks.**
> Canonical formulation: [`.claude/skills/shared/sdd-artifact-contract.md`](../shared/sdd-artifact-contract.md) (beside RIT). **Cited, not restated.**

Harvest **detection** is a structural signal — *an invariant enforced at ≥2 points with no business rule citing it* (the countable property `references/sync.md` step 2 already asks for). It is **mechanical**, so this skill may perform it. Its output is a **candidate list** for human or `$spec [mode=update]` adjudication.

- **NEVER an `error`. NEVER a build gate. NEVER a precondition on regeneration. NEVER a fixture that fails CI.**
- The detector is a **structural proxy**: it infers a semantic property from a correlate, and the rule-citation link it reads is **prose, not a key**. It has false positives (a covered invariant can present as uncovered) **and** false negatives (an invariant enforced at one chokepoint is invisible to a ≥2-point counter).
- **Why it may not gate:** a false positive that blocks a build gets suppressed — **and a suppressed detector is a dead detector.** A `report` cannot be suppressed, because it never blocked anything worth suppressing it for.
- **A detection changes the report, never the tree** — so it cannot break C6.

**The boundary — C9 does NOT license softening anything else:**

| Rule | Operationally defined? | Severity | Why |
| --- | --- | --- | --- |
| **C1** — DERIVED banner | **Yes** — a literal string test | **`error`** | The banner check **is** the rule |
| **C6** — regeneration-idempotency | **Yes** — regenerate, diff empty | **`error`** | **An ORACLE, not a proxy — it re-runs the transform and compares. It does not infer.** |
| **C7** — no A-E resurrection | **Yes** — a **closed** filename set | **`error`** | The filename list **is** the rule |
| **C2** — no `US-`/`AC-`/`BR-` in the technical tree | **Yes** — a static prefix denylist | **`error`** | The prefix list **is** the rule |
| **M1 / tech-token bans on the business tree** | **Yes** — a token denylist | **`error`** | Operationally defined; the spine stands |
| **Harvest detector** | **No** — measures a correlate and **infers** | **REPORT — never gates** | The proxy rule |

> **Do not misread C6 as a proxy.** C6's rule is *"regeneration over unchanged source produces an empty diff"* — **and the empty diff IS the rule.** It executes the property rather than reasoning toward it. Demoting C6 would destroy the only real oracle here. **C6 gates at `error`, and nothing stands behind it to be a proxy for.**

---

## Step 0 — Scope Gate (MANDATORY FIRST)

Before deriving facts or invoking a generator, read the project config and resolve the profile and technical root. Use `ask user question tool` only if scope or mode remains ambiguous. A native-profile generation request returns `UNSUPPORTED` here; do not continue to the annotation generator.

| Dimension       | Question                                                                                          | Auto-Default          |
| --------------- | ------------------------------------------------------------------------------------------------- | --------------------- |
| **Scope** ★     | Which `{Service}` / `{Component}` — one component, one service, or the whole technical root?      | — must confirm        |
| **Mode** ★      | `generate` (supported annotation view only) OR `audit` OR `sync` (native `$spec` report, or strict-default §8 ↔ tests)? | `generate` |
| **Sections**    | Full view, or a subset (use-case inventory / TC↔test map / topology)?                             | Full view             |

> **[BLOCKING]** Resolve `specArtifacts`, `techSpecScan`, and `specRoots.technical.path` from `docs/project-config.json` FIRST. If the technical root is absent, STOP. A native profile does not authorize annotation generation; absent/unsupported generator configuration is `NOT CONFIGURED` / `UNSUPPORTED`, never an empty successful view.
> **[BLOCKING]** If the target `{Service}`/`{Component}` has **no** derivable source (no handlers, consumers, jobs, or annotated tests), STOP — there is nothing to derive from. **NEVER fabricate a component to document.**

---

## Step 1 — Derive the Facts (grep, never recall)

Read `references/author.md` and execute its derivation greps. Extract ONLY mechanically-derivable facts:

1. **Use Case Inventory** — write ops (N), read ops (M), event-driven (K), background jobs (J), and actor roles, per `references/author.md`.
2. **TC↔test map (strict default only)** — join existing configured `TestSpec` annotations for business TC coverage and `TechnicalSpec` for technical-only coverage. Do not apply this map when a native profile is selected; native reconciliation belongs to `$spec [mode=sync]`. **NEVER hand-move annotation data.**
3. **Cross-service topology** — producers, consumers, sagas, shared contracts, data ownership (the `SYNC:cross-service-check` scan below is the procedure).
4. **Anchors** — every fact carries an abstract `[Source: {namespace}/{service}/{id}]` anchor.

> **Scale note:** for a service with many components, you MAY spawn parallel reader sub-agents (one per component) that each return the extracted fields above. This is an optimization, not a gate.
> **[BLOCKING]** Do NOT interpret, rank, assess business relevance, or judge any derived fact (**C8**). Count it, anchor it, emit it.

---

## Step 2 — Instantiate the Templates

Per `references/author.md`: fixed sections, **declared order**, **pinned table sort keys**, templated prose over grepped values.

> **[BLOCKING]** **A fact that cannot be templated is emitted in a table, never narrated.** Free composition is where non-determinism lives, and it breaks **C6**.

---

## Step 3 — Stamp & Write

- Every generated file opens with the `> DERIVED — regenerate with the tech-spec skill; do NOT hand-edit` banner + a regenerate date.
- Write each file immediately after instantiating it; do NOT accumulate large outputs in context (**C4**).

---

## Step 4 — Verify (self-check before completing)

- [ ] **No retired artifacts emitted** — grep your own output paths: zero `M[0-9]` dirs, zero `A-domain-model`/`B-business-rules`/`C-api-contracts`/`D-events`/`E-user-journeys`, zero `00-module-registry`/`01-domain-erd`/`06-reimplementation-guide`.
- [ ] **DERIVED banner + regenerate date present** on each generated file.
- [ ] **No business artifact types** — zero `US-`, `AC-`, `BR-` identifiers anywhere under the technical root (**C2**).
- [ ] **No canonical claims** — the derived files never assert they are the source of truth (**C3**).
- [ ] **Every anchor resolves** — grep the source path; mark `[UNVERIFIED]` rather than guessing.
- [ ] **No secrets** — zero connection strings, credentials, tokens, internal hostnames, or customer data encountered while reading config/seeders/fixtures.
- [ ] **Idempotency** — re-running over unchanged source produces an empty diff (**C6**).

---

## Hard Prohibitions (NON-NEGOTIABLE)

This skill produces only the DERIVED technical view. An A-E engineering tree would compete with the Feature Spec and could be recreated on regeneration. Never create:

| Forbidden output                                                                                          | Why                                                                |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `M##` directories (e.g., `M01/`, `M02/`)                                                                  | Retired per-module partition                                       |
| `A-domain-model.md` / `B-business-rules.md` / `C-api-contracts.md` / `D-events.md` / `E-user-journeys.md` | Retired A-E engineering bundle — content lives in the Feature Spec |
| `00-module-registry.md`                                                                                   | Retired registry                                                   |
| `01-domain-erd.md`                                                                                        | Retired per-system ERD name                                        |
| `06-reimplementation-guide.md`                                                                            | Retired per-system name                                            |
| Any `US-` / `AC-` / `BR-` identifier                                                                      | Business artifact types — the Feature Spec owns them (**C2**)      |
| Any file under `specRoots.business.path`                                                                  | This skill never writes the business tree (**C5**)                 |
| A hand-edit invitation, a "maintained by" line, or any canonical claim                                    | The view is regenerable output (**C1**, **C3**)                    |

**Scope:** this prohibition governs the **emit set** under `specRoots.technical.path` — the filenames this skill may create. It does not ban writing those names in prose elsewhere (an ADR recording the retirement must be able to name them as history).

If a user explicitly asks for an A-E bundle, explain it is retired and offer the derived view instead. If a user asks this skill to write a business rule or user story, **route to `$spec`** — this skill has no authoring path.

---

## Related Skills

| Skill                | Relationship                                                                                                    | When to Call                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `$spec`              | **Business owner** — authors the canonical tech-free 8-section Feature Spec. `$tech-spec` never writes it        | When a harvested candidate needs a rule authored (`mode=update`) |
| `$spec [mode=tests]` | **Owner of strict-default §8 TCs** joined by the annotation view                                                   | When the no-native-profile default needs a canonical TC       |
| `$spec [mode=sync]`  | **Owner of native-profile reconciliation** — consumes the configured owner/case/variant and evidence contract     | When a native profile applies                                 |
| `$spec [mode=index]`        | **Sibling derived-aid generator** over the business tree — same contract shape, different source                | For business-tree navigation aids                             |
| `$integration-test`  | **Consumer** — generates the tests whose annotations this skill joins                                           | When `sync` flags a TC with no covering integration test      |
| `$docs-manager --mode=update`       | **Orchestrator** — may call `$tech-spec` to refresh the derived view after code changes                         | After code changes need a full doc sync                       |

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `cross-service-check` — Scan producers, consumers, sagas and shared contracts for cross-service impact; concluding an investigation, plan or spec in a service-based system → .claude/skills/shared/protocols/cross-service-check.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:cross-service-check:reminder -->

**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

<!-- /SYNC:cross-service-check:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `$start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

- **IMPORTANT MUST ATTENTION Goal:** For annotation-compatible projects, project code and configured test annotations into a regenerable technical view without creating a second source of truth; route native-case reconciliation to its canonical owner and never report unsupported generation as empty success.
- **IMPORTANT MUST ATTENTION Main steps (in order):** resolve `specArtifacts`, `techSpecScan`, and roots → native `sync` to `$spec [mode=sync]` or strict-default §8/TC sync; native generation `UNSUPPORTED`, absent generator config `NOT CONFIGURED` → for supported annotation generation derive facts → instantiate fixed templates → stamp/write immediately → verify outputs. Ask only for unresolved scope/mode; do not fall back or skip the explicit unsupported result.

- **IMPORTANT MUST ATTENTION** Generate, never author: write only the DERIVED technical view, with banner/date, verified `[Source:]` anchors and no canonical claim, business content, retired A-E/`M##` artifacts or secrets. Technology names are allowed by M1 exemption; business types remain banned.
- **IMPORTANT MUST ATTENTION** Never judge or cache judgments during generation. Use fixed templates and pinned sorts; untemplatable facts go in tables. The harvest detector reports, never gates; C1/C2/C6/C7 and business-tree M1 stay at `error`. Whole-tree empty-diff regeneration is the C6 oracle.
- **IMPORTANT MUST ATTENTION** Cite source evidence; confidence >80% to act, <60% marks `[UNVERIFIED]`. Read the selected mode body and require native reconciliation's actual report/executor/assertion/run evidence.
- **IMPORTANT MUST ATTENTION** Track one task per artifact, exactly one `in_progress`, and complete it after writing with evidence. Parallel readers remain optional; tag PAR/SEQ, dispatch disjoint waves together and wait at the barrier. Include final consistency review.
- **Cross-Service Check:** scan producers, consumers, sagas and contracts; record owners, consumers and breaking risk.

**Anti-Rationalization:**

| Evasion                                                       | Rebuttal                                                                                                          |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| "I found real insight the grep missed — I'll just add a note" | That is authoring. The view holds nothing of its own. Un-greppable nuance belongs in a code comment or an ADR next to the code. |
| "This component needs a business rule written down"           | Route to `$spec [mode=update]`. This skill detects and reports; it has no authoring path.                          |
| "The regenerate diff is noisy — I'll scope idempotency to the mechanical sections" | That is a per-section carve-out — the exemption disease at a new address. **Shrink the prose surface; NEVER relax the oracle.** |
| "The harvest detector found a real gap — make it fail the build" | NEVER. It is a proxy; a proxy that blocks gets suppressed, and a suppressed detector is dead. Report it.          |
| "The tech tree is M1-exempt, so business content is fine too" | Two orthogonal properties. `m1Policy` governs tech-agnostic strictness; it says nothing about business content. `US-`/`AC-`/`BR-` stay banned. |
| "Hand-editing this one file is faster than regenerating"      | A hand-edited derived file is a build failure. Fix the generator or the source, then regenerate.                   |
| "I'll cache the judgment so the next run is consistent"       | Generator-owned state is a staleness problem invisible to review and to `git`. Verdicts live in the artifact.      |
| "A-E would express this better for engineers"                 | A-E is retired and has resurrected once already. Emit the derived view.                                            |
