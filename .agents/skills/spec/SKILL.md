---
name: spec
description: '[Documentation] Use when a workflow step or the user asks for canonical feature specs and test scenarios: author, audit, amend, tests and sync. discovery maps overlaps; clarify confirms decisions; index derives navigation/ERD.'
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

> **[BLOCKING] Mode routing — detect FIRST.** Read the selected reference in full before acting (see [Modes](#modes-resolve-mode-first--blocking)). `discovery`, `clarify`, and `index` replace this file's authoring body: its Artifact Root and Profile Resolution, Applicability and Decomposition Gate, Strict Default rules and Next Steps do not apply to them; their references own those gates. The other seven modes run the body below. Every mode works directly without a workflow.

> **Work tracking:** Keep the project's tracked work current in the same change, as its root instructions (`CLAUDE.md` or `AGENTS.md`) say. When the project uses the portable tracker (`taskTracking.mode` is `observe` or `linked`), read [the linked work integration guide](../task-track/references/integration-guide.md) at capture, start, saved-work, verification, handoff and close-out checkpoints. Inspect exact selected owners and incoming/outgoing declared spec/task/subtask concerns at governing-owner intake and after an actual artifact/case save; disclose partial/unavailable scope and current confidence separately from acceptance history. Audit stays read-only. Retain the actual inherited producer/context; only the primary saving owner records each checkpoint once. Continue untracked without companion tickets; preserve mode/profile gates and explicit acceptance.

## Quick Summary

> **Portability:** the Feature Spec root is CONFIGURED, not fixed — default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path (rationale: `docs/adr/0003-config-driven-doc-and-spec-roots.md`). The spec template defaults to `detailed-feature-spec-template.md` under the templates root (default `docs/templates/`; a `docsRoots.templates.path` entry in `docs/project-config.json` overrides the path) unless `workflowPatterns.featureDocTemplate` points to another template.

**[IMPORTANT] todo tracking** — Break ALL work into small tasks BEFORE starting. Keep task depth proportional to the work.

**Goal:** Author canonical feature intent and test scenarios, then reconcile them with tests and code using the project's declared artifact profile.

**Summary:** Resolve mode → root/type/profile → matching reference → applicability/decomposition → tracked execution → evidence/results → cross-service check → reconciliation and derived-refresh flag. `discovery`, `clarify`, and `index` use their own reference gates; the other seven modes use this body. Native profiles preserve their owner, IDs, carriers and cardinality; the eight-section/TC model applies only without an explicit native contract.

**Workflow:**

1. **Resolve mode first.** Explicit `[mode=<x>]` wins; otherwise infer from request and repository state. Ask before proceeding when ambiguous; never auto-start a mutating mode.
2. **Resolve context and load the body.** Read required project references, resolve root/type/profile/owner/identifiers/carriers, and read the matching mode reference in full. Never run a mode from memory.
3. **Apply gates and execute.** Classify large-idea applicability, break work into tracked tasks, and follow the selected profile's procedure. Preserve applicable M1–M7, evidence, testability, property/boundary, preservation, execution, authority, drift and review gates across representations.
4. **Verify and reconcile.** Trace actual executors, assertions and observed results; use manual-QC only when explicitly authorized, with its approved procedure and observed evidence, never labeled runner-executed. Run the applicable cross-service check. Preserve canonical content; flag derived INDEX/ERD refresh without invoking `[mode=index]` from an authoring mode.

**Key Rules:**

- **AI surface?** Only if the spec adds or changes a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-feature-framing-gate.md` and write its quality bar and failure behavior as cases; otherwise skip this line.
- Resolve the mode and artifact profile and read its matching reference body before any mutation; ambiguous mode → `ask user question tool`, invalid/conflicting profile → `UNKNOWN`/`BLOCKED`.
- Keep the canonical owner and identifiers authoritative; never create duplicate case registries or overwrite existing owner content during `update`.
- Apply the shared AI-SDD/large-idea gates, cross-service check, evidence rules, and review/sync boundaries before concluding.

## Contents

- [Quick Summary](#quick-summary)
- [Artifact Root and Profile Resolution (before the mode body)](#artifact-root-and-profile-resolution-before-the-mode-body)
- [Applicability and Decomposition Gate (before any authoring or mutation)](#applicability-and-decomposition-gate-before-any-authoring-or-mutation)
- [Derived-Index Delegation](#derived-index-delegation)
- [Next Steps](#next-steps)
- [Related Skills](#related-skills)
- [Closing Reminders](#closing-reminders)

## Artifact Root and Profile Resolution (before the mode body)

**MUST ATTENTION** resolve location and format separately. A configured root or template changes where the artifact lives; it does not by itself change the case model.

1. Read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, and `docs/project-reference/lessons.md` (using configured roots when present). For the selected mode, also read the relevant spec system, principles, format, and workflow-cycle references named by the docs index. When config declares `specArtifacts`, validate it and take its `sections.intent`/`contracts`/`evidence` roles, owner path, and case carriers as the native profile; a malformed or unsupported declaration is `BLOCKED`, never a fallback.
2. Classify the target as a hand-authored business/canonical artifact, a generated technical artifact, or another locally governed type. Resolve `specRoots.business.path`, `specRoots.technical.path`, authorship, and policy from config and the owner references. A generated/exempt technical root remains single-writer; this skill does not hand-edit it.
3. Resolve explicit owner/supersession precedence documented by the project references before classifying them as conflicting. Then select exactly one case representation:

| Selection | Evidence | Required behavior |
| --- | --- | --- |
| **Strict default** | No explicit native case contract exists in config or the required project references. | Use `shared/tc-format.md` and the eight-section/Section 8 TC rules below. |
| **Native profile** | Config or required project references explicitly name the canonical owner, section/field roles, logical IDs, case carriers, or case-to-test relation that differs from the strict default. | Use those declarations for every mode. Apply the native branch in the loaded mode body; do not create TC IDs, Section 8, or a parallel case registry unless that is already the declared owner format. |
| **Unresolved** | Config is invalid/incomplete, required references disagree, or the canonical owner/carrier/cardinality cannot be resolved safely. | Report the conflict or missing fact as `UNKNOWN`/`BLOCKED`. Do not silently fall back to TC, call the gap N/A, write an alternate registry, or claim coverage. |

4. A native profile may come from explicit project-reference documentation when config has no profile field. A changed root, template, or filename alone is not enough to infer a different case model. If the docs declare a native identifier but do not locate its canonical owner/carrier, or if a documented conflict has no explicit resolution, the profile is unresolved, not default.
5. Preserve semantic obligations across all selections. For executable coverage, map each required owner/scenario/variant identity to its actual executor, inspected assertion, and observed runner result. Accept manual-QC proof only when the selected profile explicitly authorizes it and its approved procedure and observed evidence are recorded; do not label it runner-executed. An ID match or source mapping alone is not execution proof. **NEVER** report `PASS`/executed without observing the result of the profile's selected execution method; otherwise preserve `mapped/unverified`, uncovered, or `UNKNOWN` as appropriate.

> **Native-profile precedence:** The explicit native branch in the matching mode body governs representation. All TC, Section 8, decade-numbering, `CoveredBy`, and default one-to-many instructions later in this skill or its reference files describe the strict default only. Their semantic protections still apply through the native profile's fields and identity rules; map default section numbers (including the UI-intent and drift examples) to declared native roles without adding default headings or a second owner.

## Applicability and Decomposition Gate (before any authoring or mutation)

Read `.claude/skills/shared/product-roadmap-contract.md` before creating, updating, or amending a Feature Spec. Apply the four-operand `isLargeIdea` rule to every idea-sourced request and preserve any existing branch metadata on audit/tests/sync.

1. If any signal is true, require one complete `large_idea_decomposition` block in the owning Feature Spec: non-empty stable `outcome_slices`, ordered `dependencies_order`, explicit `non_goals`, `risks_evidence` with owners/statuses, and `deferred_work_owner`. The spec owns the business decomposition; stories, tasks, scenarios, plans, mock-ups, and presentations consume it read-only.
2. If all signals are false, author the ordinary single-capability spec without a roadmap path, milestone ID, scope brief, or empty decomposition placeholder. Preserve one actor-facing outcome, in-scope behavior, non-goals, lifecycle terms, source-of-truth state, persistence expectations, and evidence directly in the spec.
3. If the user explicitly requests a product roadmap or selects a milestone from an explicitly supplied roadmap, use the explicit roadmap branch. Resolve and verify the product roadmap (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path), the owner-approved milestone, and its scope brief; route missing approval to `$product-roadmap`. Reading a supplied roadmap never authorizes creating/updating one.
4. For a framework/library change, use the `FRAMEWORK-LIBRARY` technical branch. For an isolated brownfield change, use `EXEMPT`. Neither branch requires a product roadmap or milestone.
5. For `audit`, `tests`, and `sync`, inherit and verify the existing branch metadata; never invent a milestone, silently broaden the spec, or drop a decomposition field.

This gate is product-level and does not relax applicable intent-quality rules in the selected profile. Explicit roadmap references belong only in the explicit branch; embedded decomposition fields belong in the owning artifact; business outcomes, definitions, and boundaries belong in the canonical sections.

### Modes (resolve mode FIRST — BLOCKING)

| Mode     | Use when…                                                                                                                                       | Body                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `draft`  | Author a provisional artifact from an idea/requirement/prompt — **no code yet**; evidence and provisional fields follow the selected profile | `references/author.md` |
| `init`   | No canonical owner exists under the configured business root; author the selected profile's artifact from source | `references/author.md` |
| `update` | Docs exist + code changed — section-impact-mapped updates                                                                                       | `references/author.md` |
| `audit`  | `--audit` flag or user asks — staleness report per section (never mutates docs)                                                                 | [references/author.md](references/author.md#mode-audit-staleness-detection) |
| `amend`  | `[mode=amend]` from the bugfix workflow — minimal owner-scoped intent/contract/scenario touch under the selected profile | `references/author.md` |
| `tests`  | Generate or update canonical test scenarios under the selected profile (strict default: Section 8 TCs) | `references/tests.md`  |
| `sync`   | Reconcile canonical owner/cases ↔ executing test code using the selected profile (forward/reverse/harvest/orphan/staleness) | `references/sync.md`   |
| `discovery` | Before authoring a NEW spec: related/overlapping/affected specs, related code, gaps, invariant landscape, then a BLOCKING scope decision (NEW / EXTEND / SPLIT); `--investigation=<report path>` reuses a same-run investigate report. | `references/mode-discovery.md` |
| `clarify` | After a spec exists: completeness vs the discovered system + BLOCKING user confirmation of every non-obvious or conflicting decision; blocks on unresolved intent. | `references/mode-clarify.md` |
| `index`  | Regenerate (or `audit` for staleness) DERIVED navigation aids — index, cross-capability ERD, reimplementation guide — FROM canonical specs only; `action=index\|audit` or `--audit`. | [references/mode-index.md](references/mode-index.md) |

- **[BLOCKING]** When `[mode=discovery]`, read `references/mode-discovery.md` in full FIRST; it runs INLINE (its scope gate is a BLOCKING `ask user question tool`), never authors or edits a spec, and keeps `--investigation=<report path>` as its optional input.
- **[BLOCKING]** When `[mode=clarify]`, read `references/mode-clarify.md` in full FIRST (its interview catalog `references/clarify-interview.md` loads from it); it runs INLINE, blocks on unresolved intent, and returns `BLOCKED`/`NEEDS-CLARIFICATION` when the user cannot answer — never infer a decision.
- **[BLOCKING]** When `[mode=index]`, read `references/mode-index.md` in full FIRST; it derives aids only from canonical specs, confirms scope/action/artifacts/destination via `ask user question tool` before reading spec bodies, and never writes canonical content. Its `audit` action (`action=audit` / `--audit`) is the derived-aid staleness report, never the spec `audit` mode.

**Invocation names:** `/feature-spec` and `/feature-docs` do not resolve; use `$spec`. Use `$spec [mode=tests|sync]` for `/spec-tests`. For the former `/spec-discovery`, `/spec-clarify` and `/spec-index`: those slash commands no longer exist; use `$spec [mode=discovery]`, `$spec [mode=clarify]` and `$spec [mode=index]`, respectively.

**Supporting references:** Read `references/clarify-interview.md` when running the clarify interview; it owns categories and question budgets. Read `references/spec-tests-template.md` before writing strict-default TCs; it owns the entry template, fidelity and preservation fields.

**Mode resolution (do this before any work):**

1. Parse the mode from the invocation: explicit `[mode=<x>]` arg wins; else infer from request + repo state ("overlap / related specs / duplicate-spec check before a new spec" → `discovery`; "validate or clarify spec decisions with the user / gap-review a spec" → `clarify`; "regenerate or audit the spec index / ERD / reimplementation guide" → `index`; "from idea/requirements/prompt", "draft spec", "no code yet" → `draft`; no canonical owner under the configured business root AND code exists to source from → `init`; docs exist + diff → `update`; "audit/stale" → `audit`; bugfix caller → `amend`; "write/update test specs" or the selected profile's case terms → `tests`; "sync tests" or reconcile canonical cases with tests → `sync`). **`draft` vs `init`:** both author a new artifact, but `draft` sources from idea/requirement text and records evidence/provisional state using the selected profile, while `init` sources from existing code. "No docs" alone does NOT imply `init` — check whether code exists to source from. Never overwrite existing owner content during `update`.
2. If ambiguous, present the detected mode via `ask user question tool` before proceeding — NEVER auto-start a mutating mode.
3. **Read the matching `references/` body** — it is the single source of truth for that mode's procedure, gates, and output contract. Do not run a mode from memory.

**Key Rules (all modes):**

- **[BLOCKING]** Read `docs/project-reference/spec-principles.md` (project-reference docs root default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — repo-local prose/evidence rules (§3 prose scope + §3.2 banned prose-token list). For the AI-implementability criteria + tech-agnostic mandates, read `.claude/skills/shared/sdd-artifact-contract.md` ("AI-Implementability Gate" + mandates M1-M7) — those are the canonical authority, not the local stub.
- **[BLOCKING]** The selected profile's canonical owner, identifiers, evidence fields, and carriers are authoritative. Under the strict default only, each TC uses the `[Source: namespace/service/id]` carrier; `mode=draft` may use its documented provisional state until code exists. A native profile uses its declared evidence form and never gains a duplicate TC registry.
- **[BLOCKING]** Under the strict default, Section 8 is the canonical TC registry; `tests` mode owns generation, `sync` reconciles it, and it MUST NOT be overwritten during author modes or update. Under a native profile, update only the declared owner/carriers and preserve owner/scenario/variant identities.
- Authored artifacts MUST satisfy applicable M1-M7 and the selected profile's section/field contract. The strict default uses the tech-free eight-section template; a native profile follows its declared structure and evidence carriers without importing the default template.
- **[BLOCKING]** `.claude/skills/shared/sdd-artifact-contract.md` defines the semantic floor for every profile. `.claude/skills/shared/tc-format.md` supplies representation-specific rules only when the strict default TC profile is active.

> `docs/project-reference/feature-spec-reference.md` — project-specific Feature Spec patterns (read directly when relevant). `docs/project-reference/domain-entities-reference.md` — domain entity catalog, relationships, cross-service sync. Both filenames resolve inside the project-reference docs root — default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path.

### Strict Default 8-Section Feature Spec Rules (canonical reference)

> **Strict default representation:** Apply this section only when no native case profile is explicitly declared in config or the required project references. A native profile uses the matching native branch in the loaded mode body; it does not inherit this template's sections or case IDs.

**Format:** Tech-free 8-section Feature Spec. Activate the `$spec` skill before editing.

**Read first:** `docs/project-reference/feature-spec-reference.md`, `docs/project-reference/spec-system-reference.md`, and `docs/project-reference/spec-principles.md`. For behavior/public-contract changes, also read `docs/project-reference/workflow-spec-test-code-cycle-reference.md`. (Those filenames resolve inside the project-reference docs root — default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path.)

**8 sections (exact order):** 1. Overview · 2. Glossary · 3. User Stories & Acceptance Criteria · 4. Business Rules · 5. Domain Model · 6. Process Flows & Interaction Surface · 7. Permissions & Roles · 8. Test Specifications. No technical sections (Commands/Events/API/Cross-Service/Performance/Troubleshooting) — code is the technical source of truth.

> §6 carries a tech-agnostic interaction surface (views/nav/observable states/per-story click-paths) per the `SYNC:ui-intent-layer` block this skill carries; backend-only specs state the skip reason explicitly. This does NOT contradict "No technical sections" — the interaction surface is tech-agnostic INTENT (UX roles, information, states, flows), not a technical "UI Pages" section; M1-clean keeps it free of framework/route/CSS/component-class names.

**Mandatory:**

- §1-7 prose is STRICTLY tech-free — no framework/product/language/persistence/messaging/auth names (banned tokens → `spec-principles.md` §3.2). Technical identifiers live ONLY in evidence carriers.
- Section 5 (Domain Model): Mermaid ERD + `[Source: component/{service}/{id}]` abstract anchor per entity (cannot be omitted)
- Section 4 (Business Rules): `[Source: rule/{service}/{id}]` abstract anchor per rule group
- Section 8 (Test Specifications): canonical business TC source — TC-{FEATURE}-{NNN} IDs, each carrying a hidden `[Source: namespace/service/id]` carrier + a `CoveredBy:` field. Legacy `IntegrationTest:` fields are accepted only as migration input.

**Rules:**

- TC IDs live in Section 8 only — never authored elsewhere in the Feature Spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path)
- Section 8 authored via `$spec [mode=tests]`; `$spec [mode=init]` populates it only during initial authoring
- No line-count cap applies to Feature Specs. Split the capability only when TCs>40 or distinct module-level capabilities emerge.

### Applicable M1-M7 Compliance (BLOCKING — apply through the selected profile)

See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)" for the full BLOCKING criteria. Apply them to the target artifact tree and its configured section/carrier roles. The default-specific §1–8 wording below applies only to the strict default profile; native logical IDs, fields, and section roles carry the same applicable obligations.

**M7 — Business-visibility.** Where M7 applies, test the case BODY: *"what would a stakeholder SEE change?"* — no answer → FAIL as TECHNICAL-ONLY. A `When` that is an invocation or a `Then` asserting an internal-only state fails the business-visibility gate. Apply the same gate through the selected profile's scenario/case fields; judge the BODY, never the title or ID.

> **M1 governs vocabulary; M7 governs subject matter.** A technical case in impeccably tech-free prose satisfies M1 while violating M7.
>
> M6 is absent from this list by design: it binds the REVIEWER (a review that passes an M1-M5/M7 violation is itself defective), never the artifact. The artifact-facing set reads **M1-M5 and M7**.

---

## Derived-Index Delegation

This skill owns the canonical artifact and cases selected by the active profile. Indexes and cross-capability ERDs remain derived projections regenerated by `$spec [mode=index]` — never a source of truth, and never authored by an authoring mode. In `update` mode, flag a required derived-artifact refresh but do NOT trigger `[mode=index]` directly (separation of concerns).

---

## Next Steps

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`$start-workflow` → Step Execution Protocol, Workflow-step mode).

**[BLOCKING]** After completing a standalone run, use `ask user question tool` to present options. Do NOT skip it there — user decides:

- **"$spec [mode=tests] (Recommended)"** — Generate/update the selected profile's canonical test scenarios (strict default: Section 8 TCs)
- **"$spec [mode=sync]"** — Reconcile the selected profile's canonical cases with executing test code
- **"$work-item --mode=review --type=spec-tests"** — Review scenario intent, assertion-backed coverage, and profile-specific completeness
- **"Skip, continue manually"** — user decides

---

## Related Skills

| Skill                                | Relationship                                                                                                           | When to Call                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `$spec [mode=index]`                 | **Derived consumer** — assembles a regenerable navigation index/ERD FROM canonical specs (never a source of truth) | AFTER canonical specs exist — refresh the declared index/ERD over the owner artifacts |
| `$spec [mode=discovery]`             | **Pre-spec landscape** — related/overlapping specs, invariants, NEW/EXTEND/SPLIT scope gate | BEFORE `draft`, when specs or related code already exist |
| `$spec [mode=clarify]`               | **Decision gate** — completeness vs the discovered system + user-confirmed non-obvious decisions | AFTER the spec and its cases are authored and reviewed |
| `$work-item --mode=review --type=spec-tests` | **Reviewer** — audits scenario intent and coverage under the selected profile                                         | After `spec [mode=tests]`, to validate completeness and assertion-backed mappings                      |
| `$integration-test`                  | **End consumer** — generates or updates executable tests from the selected profile's canonical scenarios             | After `spec [mode=tests]`, when code generation is the configured next step                             |
| `$docs-manager --mode=update`                       | **Orchestrator** — routes canonical feature intent to this skill                                                                         | Run `$docs-manager --mode=update` for full chain sync; it calls `$spec` internally                                    |
| `$changes-review`                    | **Trigger** — detects feature doc staleness                                                                            | Calls `$docs-manager --mode=update` when a business doc is stale relative to code changes                             |

---

> **[IMPORTANT]** Track small tasks before work and final review. On context loss, inspect existing tasks before creating more. Keep task depth proportional to the work.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `cross-service-check` — Scan producers, consumers, sagas and shared contracts for cross-service impact; concluding an investigation, plan or spec in a service-based system → .claude/skills/shared/protocols/cross-service-check.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `spec-drift-adjudication` — Decide code-wrong versus spec-stale from evidence, never silently; behavior diverges from its spec → .claude/skills/shared/protocols/spec-drift-adjudication.md
- `spec-tests-code-triangulation` — Review spec, tests and code together for mutual consistency first; reviewing behavior that has a spec → .claude/skills/shared/protocols/spec-tests-code-triangulation.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Author canonical feature intent and test scenarios, then reconcile them with tests and code using the project's declared artifact profile.

**IMPORTANT MUST ATTENTION Main steps:** resolve mode → root/type/profile/owner/IDs/carriers → matching reference and project docs → applicability/decomposition → tracked procedure → executor/assertion/result proof → applicable cross-service check → reconciliation and derived-refresh flag. `discovery`, `clarify`, and `index` use their own reference gates.

- **Mode and profile first:** read the matching reference in full; ask when mode is ambiguous. Unsupported carriers, unresolved owners or profiles, and required unexecuted cases remain `UNKNOWN`/`BLOCKED`, never N/A or PASS. Native profiles keep their own section roles, IDs and case carriers; do not add a TC/Section 8 shadow registry.
- **Keep semantic gates:** apply M1–M7 from `shared/sdd-artifact-contract.md`, business visibility, evidence, preservation and drift adjudication. Use `shared/tc-format.md` only for the strict default. Review the whole spec/tests/code package and log missing or disagreeing faces; classify CODE-WRONG / SPEC-STALE / AMBIGUOUS / SPEC-SILENT rather than normalizing to green tests. Capture unwritten invariants in the contract and guarding case/test.
- **Preserve outcome boundaries:** run the four-signal Applicability and Decomposition Gate; require all five `large_idea_decomposition` fields when true, omit roadmap/milestone placeholders when false, and use the roadmap branch only for an explicit request.
- **Prove execution:** an ID or source mapping is insufficient. Trace owner/scenario/variant to the executor, inspected assertion and observed result; preserve authorized manual-QC proof as distinct from runner execution. Ground claims in traced evidence; >80% confidence to act, <60% do not recommend.
- **Trace impact and preserve owners:** in service-based systems scan producers, consumers, sagas and contracts; record owner, message, consumers and NONE/ADDITIVE/BREAKING risk. Preserve canonical content during update/sync. Flag derived INDEX/ERD refresh without invoking index from authoring.
- **Track and inspect:** maintain small tasks and final review; inspect existing tasks after context loss. Search 3+ comparable patterns and spec siblings before authoring, checking local fit rather than imposing defaults.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| "Mode is obvious, skip the `references/` body"   | The body owns gates + output contract — running from memory drifts. Read it every time.      |
| "The case ID is in a test, so it is covered"      | ID/source mapping is not an assertion or observed runner result. Trace the actual owner, executor, assertion, and result. |
| "`update` — just regenerate the cases"            | The configured owner is canonical. Preserve its identity and use `sync` to reconcile drift; never create a shadow registry. |
| "One tech name in prose is harmless"             | One banned token fails M1 and breaks rebuild-on-any-stack. Move it to an evidence carrier.   |
| "Small spec, skip task tracking"                 | Skip depth, NEVER skip tracking — context loss wipes un-tracked progress.                    |
| "Index looks stale, I'll just run `[mode=index]`" | Not an authoring mode's job — flag the refresh need; derived artifacts regenerate in their own invocation. |

**[TASK-PLANNING]** MUST ATTENTION analyze task scope and break into small todo tasks/sub-tasks via todo tracking before acting.

**IMPORTANT MUST ATTENTION** Resolve the mode and profile before authoring · preserve one canonical owner with its configured identifiers/carriers · never report required coverage as PASS without an inspected assertion and observed result — the three rules this skill must never skip.

---
