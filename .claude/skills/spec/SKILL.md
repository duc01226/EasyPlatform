---
name: spec
version: 5.0.0
last_reviewed: 2026-06-12
description: '[Documentation] Use to author, audit, amend, or test-spec a business Feature Spec. The single spec skill — modes init|update|audit|amend create/maintain the tech-free 8-section Feature Spec; tests generates Section 8 TC-{FEATURE}-{NNN} test specifications; sync reconciles §8 TCs ↔ integration test code. Per-mode procedure lives in references/{author,tests,sync}.md.'
triggers: 'feature spec, feature documentation, create feature doc, update feature doc, business feature documentation, audit feature spec, amend feature spec, tdd spec, tdd test, test driven, write test specs, create test cases, update test specs, test specifications for feature, test spec for feature, sync test specs, generate test specs from code, update test specs after changes, test specs from PR, test specs from pull request, code to test specs, sync tests, reconcile tests with code, sync test specs to integration tests'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

> **Portability:** `docs/specs/` is the fixed Feature Spec root. `docs/templates/detailed-feature-spec-template.md` remains the default template unless `workflowPatterns.featureDocTemplate` points to another template.

**[IMPORTANT] TaskCreate** — Break ALL work into small tasks BEFORE starting. For simple tasks, ask user whether to skip.

**Goal:** Own the entire Feature Spec lifecycle in one skill — author/maintain tech-free 8-section business Feature Specs (code evidence carried only in Section 8 test-case anchors, never prose), generate Section 8 test specifications, and reconcile those TCs with integration test code — producing a tech-free, AI-implementable Feature Spec whose Section 8 TC registry stays the single source of truth, traceable to integration test code, so any team can rebuild the feature on any stack from the spec alone. The mode you run determines which `references/` body drives work; the shared §8 contract, M1-M6 mandates, and quality philosophy below apply every mode.

> **Renamed:** formerly `/feature-spec` (and earlier `/feature-docs`); the former `/spec-tests` skill is now folded in as `mode=tests` / `mode=sync`. Those names no longer resolve as slash commands — use `/spec` with the matching mode.

### Modes (resolve mode FIRST — BLOCKING)

| Mode     | Use when…                                                                               | Body                   |
| -------- | --------------------------------------------------------------------------------------- | ---------------------- |
| `init`   | No `docs/specs/{Bucket}/` exists — author a full 8-section spec from source             | `references/author.md` |
| `update` | Docs exist + code changed — section-impact-mapped updates                               | `references/author.md` |
| `audit`  | `--audit` flag or user asks — staleness report per section (never mutates docs)         | `references/author.md` |
| `amend`  | `[mode=amend]` from the bugfix workflow — minimal regression-scoped §3/§4/§8 touch only | `references/author.md` |
| `tests`  | Generate or update Section 8 `TC-{FEATURE}-{NNN}` test specifications                   | `references/tests.md`  |
| `sync`   | Reconcile §8 TCs ↔ integration test code (forward/reverse, orphan, staleness)           | `references/sync.md`   |

**Mode resolution (do this before any work):**

1. Parse the mode from the invocation: explicit `[mode=<x>]` arg wins; else infer from request + repo state (no `docs/specs/{Bucket}/` → `init`; docs exist + diff → `update`; "audit/stale" → `audit`; bugfix caller → `amend`; "write/update test specs", "TCs" → `tests`; "sync tests", "reconcile §8 with tests" → `sync`).
2. If ambiguous, present the detected mode via `AskUserQuestion` before proceeding — NEVER auto-start a mutating mode.
3. **Read the matching `references/` body** — it is the single source of truth for that mode's procedure, gates, and output contract. Do not run a mode from memory.

**Key Rules (all modes):**

- **[BLOCKING]** Read `docs/project-reference/spec-principles.md` — spec quality standards, AI-implementability criteria, tech-agnostic rules (§3 surface scope + §3.2 banned prose-token list).
- **[BLOCKING]** EVERY test case MUST carry verifiable code evidence as a `[Source: namespace/service/id]` abstract anchor in its Section 8 hidden carrier — physical `file:line` lives only in the provenance sidecar.
- **[BLOCKING]** Section 8 is the **canonical TC registry** — §8 TCs are the source of truth; integration test code implements them. The `tests` mode owns generation; `sync` mode reconciles drift; the author modes populate §8 only during INIT and MUST NOT overwrite existing TCs during UPDATE.
- Authored docs MUST match the master template's **8 tech-free sections** (Overview, Glossary, User Stories & AC, Business Rules, Domain Model, Process Flows, Permissions & Roles, Test Specifications) + YAML frontmatter — zero technical terms in prose, size caps enforced.
- **[BLOCKING] Canonical TC format authority:** `.claude/skills/shared/tc-format.md` (GWT template, Evidence carrier, decade-numbering, Preservation Tests). **M1-M6 mandates:** `.claude/skills/shared/sdd-artifact-contract.md` — any violation FAILS the artifact.

> `docs/project-reference/feature-spec-reference.md` — project-specific Feature Spec patterns (read directly when relevant). `docs/project-reference/domain-entities-reference.md` — domain entity catalog, relationships, cross-service sync.

### M1-M6 Compliance (BLOCKING — applies to every authored spec and every TC)

See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)" for the full BLOCKING criteria. In brief: **M1** tech-agnostic prose; **M2** no source code in prose; **M3** logical-IDs-first traceability with a SEPARATE `[Source:]` carrier; **M4** AI-implementability (one interpretation, named success/failure); **M5** rebuild-from-scratch on any stack from §1-8 prose alone. Tech terms are allowed ONLY inside evidence carriers (`**Evidence**`, `IntegrationTest`, `[Source:]`), YAML frontmatter, and ` ```mermaid ``` ` blocks.

---

## Derived-Index Delegation

This skill owns the **canonical** Feature Spec (§1-8) and its §8 TC registry. The bucket `INDEX.md` and cross-capability ERD are **derived** artifacts regenerated by `/spec-index` FROM these specs — never a source of truth, and never authored here. In `update` mode, flag "derived spec artifact refresh may be required" but do NOT trigger `/spec-index` directly (separation of concerns).

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `workflow-feature` workflow** (Recommended) — spec-driven with tests by default: scout → investigate → domain-analysis → why-review → spec → plan → plan-review → plan-validate → why-review → spec [mode=tests] → why-review → review-artifact --type=spec-tests → plan → plan-review → cook → review-domain-entities → spec [mode=tests] → why-review → review-artifact --type=spec-tests → spec [mode=sync] → integration-test → integration-test-review → integration-test-verify → workflow-review-changes → sre-review → security-review → changelog → test → docs-update → workflow-end → watzup
> 2. **Execute `/spec` directly** — run this skill standalone in the resolved mode

---

## Next Steps

**[BLOCKING]** After completing, use `AskUserQuestion` to present options. Do NOT skip — user decides:

- **"/spec [mode=tests] (Recommended)"** — Generate/update Section 8 test specs for the documented features (if you just authored/updated a spec)
- **"/spec [mode=sync]"** — Reconcile Section 8 TCs ↔ integration test code
- **"/review-artifact --type=spec-tests"** — Audit TC coverage + GIVEN/WHEN/THEN quality
- **"Skip, continue manually"** — user decides

---

## Related Skills

| Skill                                | Relationship                                                                                                           | When to Call                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `/spec-index`                        | **Derived consumer** — assembles a regenerable navigation index/ERD FROM these Feature Specs (never a source of truth) | AFTER specs exist — (re)generate the bucket `INDEX.md` / cross-capability ERD over the canonical specs |
| `/review-artifact --type=spec-tests` | **Reviewer** — audits TC coverage in Section 8                                                                         | After `spec [mode=tests]`, to validate TC completeness and GIVEN/WHEN/THEN quality                     |
| `/integration-test`                  | **End consumer** — generates test code from TCs in Section 8                                                           | After `spec [mode=tests]`, to produce actual integration test files                                    |
| `/docs-update`                       | **Orchestrator** — calls this skill as Phase 2                                                                         | Run `/docs-update` for full chain sync; it calls `/spec` internally                                    |
| `/review-changes`                    | **Trigger** — detects feature doc staleness                                                                            | Calls `/docs-update` when a business doc is stale relative to code changes                             |

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:cross-service-check -->

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

<!-- /SYNC:cross-service-check -->

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **IMPORTANT MUST ATTENTION Goal:** Produce a tech-free, AI-implementable Feature Spec whose Section 8 TC registry stays the single source of truth, traceable to integration test code — so any team can rebuild the feature on any stack from the spec alone
- **IMPORTANT MUST ATTENTION [BLOCKING]** Resolve the mode FIRST and read its `references/` body — never run `init`/`update`/`audit`/`amend`/`tests`/`sync` from memory
- **IMPORTANT MUST ATTENTION [BLOCKING]** Break work into small `TaskCreate` tasks BEFORE starting — do NOT write a single line of output without a task list
- **IMPORTANT MUST ATTENTION [BLOCKING]** EVERY test case MUST carry verifiable code evidence as a `[Source: namespace/service/id]` abstract anchor in its Section 8 hidden carrier — physical `file:line` → provenance sidecar only
- **IMPORTANT MUST ATTENTION [BLOCKING]** Section 8 is the canonical TC registry — existing TCs MUST NOT be overwritten during `update`; `tests` mode owns generation, `sync` mode reconciles drift
- **IMPORTANT MUST ATTENTION [REQUIRED]** Authored docs: 8 tech-free sections in exact order, zero technical terms in prose (code is the technical source of truth), size caps enforced
- **IMPORTANT MUST ATTENTION [REQUIRED]** Search codebase for 3+ similar patterns before creating new content; add a final review task to verify work quality

**[TASK-PLANNING]** MUST ATTENTION analyze task scope and break into small todo tasks/sub-tasks via TaskCreate before acting.

---
