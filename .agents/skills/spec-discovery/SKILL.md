---
name: spec-discovery
description: '[Investigation] Use when about to author a new Feature Spec from an idea — investigate all existing Feature Specs AND related code logic first to surface related/overlapping/affected specs, missing features, missing test cases/user stories, system unknowns, and the invariant landscape, before any spec is drafted.'
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

Codex uses static project-reference loading instead of runtime-injected project docs.
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

**Goal:** Before a single line of a new Feature Spec is authored, deliver the pre-spec landscape — every existing Feature Spec the idea relates to / overlaps / depends on / would affect, the related code logic, the missing features and missing test cases / user stories, the system unknowns, and the invariant landscape the new spec must respect — so the author never ships a duplicate, contradicts a [HARD] rule, or specs into a blind spot.

**Summary:**

- This is BOTH spec-aware and code-aware: it reads `docs/specs/**` (the canonical Feature Specs) AND delegates to `$scout` + code-graph for the code logic the idea touches. Spec-only or code-only discovery misses half the landscape.
- It runs BEFORE `spec [mode=draft]` and feeds it. Its job is to decide WHETHER a new standalone spec is even the right move — the alternative is extending an existing spec, which only a spec-corpus scan can reveal.
- It is INLINE on the main agent (NOT a sub-agent) because step 5 is a BLOCKING a direct user question scope-decision gate that only works inline. It MAY spawn sub-agents for parallel spec reads, but it orchestrates and gates inline.
- Greenfield short-circuit: when there are no specs AND no code, auto-detect it, record the reason, skip the heavy discovery, and hand off a minimal landscape — never grind through empty discovery.

**Workflow:**

0. **Scope** — read the framed capability (brainstorm/idea output); extract keywords, candidate entities/actors, target spec bucket.
1. **Spec-corpus discovery** — `Glob docs/specs/**/README.*.md`; read §1/§4/§5/§8 of each candidate; classify each as EXTENDS / OVERLAPS / DEPENDS-ON / AFFECTED / UNRELATED.
2. **Code-logic discovery** — `$scout {keywords}` + MANDATORY graph expansion on key files when `.code-graph/graph.db` exists; bridge code→spec via §8 `[Source:]` anchors.
3. **Gap & invariant analysis** — missing features, missing test cases / user stories, system unknowns (<80% confidence), and the existing [HARD] rules / §5 invariants the idea must respect.
4. **Report** — write `plans/{plan-dir}/research/spec-discovery-{slug}.md` incrementally (Related Specs · Related Code · Affected Specs · Gaps · Invariant Landscape · Open Questions).
5. **Scope-decision gate (BLOCKING a direct user question)** — recommend NEW / EXTEND existing X / SPLIT into N, and confirm which existing specs to cross-reference.
6. **Handoff** — feed entities, invariants, cross-refs, and gaps into `domain-analysis` + `spec [mode=draft]`.

**Key Rules:**

- Landscape over implementation — surface related/overlapping/affected specs + the invariant landscape fast; this is NOT the spec author and NOT a deep investigation.
- INLINE execution — the step 5 user gate is BLOCKING and only works inline; spawn sub-agents only for parallel spec reads, never delegate the whole skill.
- NEVER auto-pick NEW — step 5 is a BLOCKING user gate. OVERLAPS is exactly what the spec scan exists to catch; recommend, then let the user decide scope.
- NEVER skip graph expansion when `.code-graph/graph.db` exists; when absent, grep + read still bridge code→spec via `[Source:]` anchors.

# Spec-Discovery — Pre-Spec Landscape Investigation

---

## When to Use

- About to author a NEW Feature Spec from an idea / requirement / brainstorm output, before `spec [mode=draft]` runs.
- Need to know whether the idea is genuinely new or overlaps an existing spec (duplicate-spec prevention).
- Need the invariant landscape — the existing [HARD] rules and §5 invariants a new capability must respect or might violate.

**NOT for:** authoring the spec (use `spec [mode=draft]`), deep root-cause analysis of existing code (use `investigate`), generating Section 8 test cases (use `spec [mode=tests]`), regenerating the derived bucket index/ERD (use `spec-index`).

---

## Phase 0: Classify Corpus & Short-Circuit

**Before any discovery**, classify what landscape exists. This decides which steps run.

| Corpus state           | Detection                                                         | Route                                                                        |
| ---------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Specs + code**       | `docs/specs/**/README.*.md` present AND source files for keywords | Full run — steps 1, 2, 3, 4, 5, 6                                            |
| **Specs only**         | Specs present, no code yet (provisional/draft-era project)        | Steps 1, 3, 4, 5 — skip step 2 code discovery (record "no code yet")         |
| **Code only**          | No specs yet, code exists                                         | Steps 2, 3, 4, 5 — step 1 records "no existing specs", bridge gaps from code |
| **Greenfield (empty)** | No specs AND no source for keywords                               | **Short-circuit** — record reason, skip heavy discovery, minimal handoff     |

> **Greenfield / empty-corpus short-circuit.** When Phase 0 detects no specs AND no code: record `Corpus: greenfield — no specs, no code for {keywords}` with the `Glob`/grep evidence that proved it, skip steps 1–3, write a minimal landscape report (just the framed scope + open questions), and hand off to `spec [mode=draft]`. Run the step 5 scope gate ONLY if there is something to decide (e.g. two plausible buckets); with nothing to decide, default to NEW and state the assumption in one line.

---

## Workflow

### Step 0: Frame the Scope

Read the framed capability — the brainstorm / idea / requirement text that triggered this. Extract:

- **Keywords** — domain nouns and verbs the idea names (entities, actions, features).
- **Candidate entities / actors** — the business objects and roles the idea implies.
- **Target spec bucket** — which `docs/specs/{Bucket}/` the new spec would most likely live in (per the project's module mapping; resolve from `docs/project-reference/feature-spec-reference.md` / `spec-system-reference.md`).

State the framed scope in one line before continuing (e.g. `Discovering for: "bulk order export" — keywords [order, export, batch], bucket Orders`).

### Step 1: Spec-Corpus Discovery

```bash
# Enumerate every canonical Feature Spec
ls docs/specs/**/README.*.md 2>/dev/null   # or: Glob docs/specs/**/README.*.md
```

If NONE → record `No existing specs` and skip to Step 2.

Else, for each candidate spec the keywords touch, read the high-signal sections only (do NOT read whole specs — landscape, not deep-dive):

- **§1 Overview** — what the spec covers (scope boundary).
- **§4 Business-Rule headers** — the BR-{FC}-NN IDs and their [HARD]/[SOFT] tags (feeds invariant landscape).
- **§5 Domain Model** — entities + ERD (overlap detection by shared entities).
- **§8 Test-Case summary** — the TC count + summary table (coverage baseline; missing-TC detection).

Use the bucket `INDEX.md` (produced by `$spec-index`) as a fast navigation map when present — it lists the specs and their entities so you read fewer full files.

**Classify each candidate spec's relationship to the idea** (one label per spec, with `file:line` evidence):

| Relationship            | Meaning                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------- |
| **EXTENDS**             | The idea is a natural addition to this spec's capability — likely an UPDATE, not NEW. |
| **OVERLAPS (dup risk)** | The idea re-states behavior this spec already owns — authoring NEW would duplicate.   |
| **DEPENDS-ON**          | The idea needs this spec's entities/rules to function — cross-reference required.     |
| **AFFECTED**            | The idea would change behavior this spec documents — forward-impact, may need amend.  |
| **UNRELATED**           | Shares a keyword but no real relationship — record to show it was checked.            |

### Step 2: Code-Logic Discovery (only if code exists)

Bridge the idea to the implementation so the spec reflects what actually exists (or what the idea will touch).

1. **Delegate to `$scout {keywords}`** — fast parallel file discovery of the code the idea relates to. Use scout's numbered, prioritized list as targets; do NOT re-grep what scout already mapped.
2. **MANDATORY graph expansion** — when `.code-graph/graph.db` exists, run graph commands YOURSELF (sub-agents cannot) on 2–3 key files scout surfaced:
    ```bash
    python .claude/scripts/code_graph trace <key-entity-or-command> --direction both --json
    python .claude/scripts/code_graph connections <key-file> --json
    ```
    Graph reveals callers, consumers, event chains, and tests grep cannot find — exactly the downstream the new spec must account for.
3. **Delegate ambiguous areas to `$investigate`** — when scout + graph surface a flow whose behavior is unclear (the idea hinges on how it works), hand that narrow slice to `investigate` rather than guessing.
4. **Bridge code → spec** — for each key code file, find its governing spec via the §8 `[Source: namespace/service/id]` anchors / Related Files. A code area with NO governing spec is a gap (record in Step 3); a code area WITH a governing spec strengthens the Step 1 relationship classification.

### Step 3: Gap & Invariant Analysis

From Steps 1–2, synthesize four lists (every item `file:line`-cited or marked "inferred"):

- **Missing features** — behavior the idea implies that NO existing spec or code covers. These are the net-new surface the spec must define.
- **Missing test cases / user stories** — in the specs the idea touches (EXTENDS/AFFECTED), the AC / TC the idea's behavior would require but that are absent today.
- **System unknowns** — anything the discovery could not resolve to >80% confidence (unverified flows, ambiguous ownership, unread cross-service consumers). Name each explicitly — an unknown surfaced is cheaper than a wrong spec.
- **Invariant landscape** — the existing [HARD] business rules (§4) and §5 entity invariants the idea must respect or might violate. This is the single most load-bearing output: a new spec that contradicts a [HARD] rule of a DEPENDS-ON spec ships a defect. List each invariant as "for ALL {inputs}, {invariant} holds — owned by {spec/BR-id}".

### Step 4: Report

Write `plans/{plan-dir}/research/spec-discovery-{slug}.md` (resolve `{plan-dir}` from the active plan; fall back to `plans/reports/spec-discovery-{YYMMDD}-{HHmm}-{slug}.md` when no plan dir exists). Persist **incrementally** — append each section as it is produced, never hold the whole report in memory:

```markdown
# Spec-Discovery: {idea}

## Framed Scope

{keywords, candidate entities/actors, target bucket}

## Related Specs

| Spec | Relationship | Overlap evidence | Action implied |
| ---- | ------------ | ---------------- | -------------- |

## Related Code

{scout's prioritized files + graph evidence — callers/consumers/tests}

## Affected Specs (forward-impact)

{specs whose documented behavior the idea would change}

## Gaps

- Missing features: ...
- Missing TCs / user stories: ...

## Invariant Landscape

- for ALL {inputs}, {invariant} — owned by {spec/BR-id} — idea must {respect/extend}

## Open Questions

- {system unknowns, <80% confidence items}
```

### Step 5: Scope-Decision Gate (BLOCKING a direct user question)

> **MANDATORY MUST ATTENTION — NO EXCEPTIONS:** before any spec is authored, MUST ATTENTION use a direct user question to present the recommended scope. NEVER auto-pick — OVERLAPS detection is the whole reason this skill exists; assuming NEW silently ships duplicates.

Recommend ONE option (with the evidence behind it) and confirm the cross-references:

- **(a) NEW standalone spec** — no EXTENDS/OVERLAPS match; the idea is genuinely net-new. Hand off to `spec [mode=draft]`.
- **(b) EXTEND existing spec X** — an EXTENDS/OVERLAPS match means the idea belongs inside X. **Reroute to `$spec [mode=update]`** against X instead of drafting a new file.
- **(c) SPLIT into N specs** — the idea spans N distinct capabilities (or would breach the size caps); author N specs, each with its own bucket.

Also confirm WHICH existing specs (the DEPENDS-ON / AFFECTED set) the author must cross-reference, so the new/updated spec links them and respects their invariants.

### Step 6: Handoff

Feed the discovery forward:

- **→ `domain-analysis`** — the related entities + invariant landscape (so the domain model is consistent with existing specs).
- **→ `spec [mode=draft]`** (or `spec [mode=update]` if Step 5 chose EXTEND) — the framed scope, the missing features/TCs, the cross-references to link, and the [HARD] rules to respect.

---

## Results Format

```markdown
## Spec-Discovery Results: {idea}

### Recommended Scope

**{NEW | EXTEND spec X | SPLIT into N}** — because {evidence-backed reason}

### Related Specs

| Spec                                | Relationship | Evidence                       | Implied action             |
| ----------------------------------- | ------------ | ------------------------------ | -------------------------- |
| `docs/specs/{Bucket}/README.{X}.md` | OVERLAPS     | §4 BR-X-03 already states this | route to $spec mode=update |

### Related Code

1. `{file}` — {role} — graph: {callers/consumers found}

### Affected Specs (forward-impact)

- `{spec}` — {documented behavior the idea changes}

### Gaps

- Missing features: {list}
- Missing TCs / user stories: {list}

### Invariant Landscape (must respect)

- for ALL {inputs}, {invariant} — owned by {spec/BR-id}

### Open Questions

- {system unknowns, <80% confidence}

**Full report:** plans/{plan-dir}/research/spec-discovery-{slug}.md
```

---

## Related Skills

`scout` (code file discovery — Step 2) | `investigate` (deep-dive ambiguous flows — Step 2) | `spec [mode=draft]` (authors §1–7 from the idea — Step 6 handoff) | `spec [mode=update]` (the EXTEND reroute — Step 5) | `domain-analysis` (entity/invariant modeling — Step 6) | `spec-index` (derived bucket INDEX.md used in Step 1)

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including a task per candidate spec read. This prevents context loss from long specs. For trivial single-spec scopes, AI MUST ATTENTION ask user whether to skip.

- `docs/project-reference/feature-spec-reference.md` — Feature Spec conventions, bucket/module mapping (read before reading any spec).
- `docs/project-reference/spec-system-reference.md` — canonical vs derived spec artifacts, TC format, spec paths.
- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when the idea involves business entities/models).

> **External Memory:** Complex/lengthy discovery → write findings incrementally to the research report. Prevents context loss.

> **Evidence Gate:** MANDATORY MUST ATTENTION — every relationship classification, gap, and invariant requires `file:line` proof with confidence % (>80% act, <80% verify first).

<!-- SYNC:graph-assisted-investigation -->

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

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:incremental-persistence -->

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

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

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
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: ≤10 finding bullets, no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the summary lives in the `Full report` on disk. A sub-agent that would exceed the summary shape MUST write the detail to its report and return only the pointer — the orchestrator's context is the scarce resource the whole map-reduce protects.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:nested-task-creation -->

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

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: plans/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:rationalization-prevention -->

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

<!-- /SYNC:rationalization-prevention -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:rationalization-prevention:reminder -->

**MUST ATTENTION** never skip steps via evasions. Plan anyway. Test first. Show grep evidence with `file:line`.

<!-- /SYNC:rationalization-prevention:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**MUST ATTENTION** run at least ONE graph command on key files before concluding when `.code-graph/graph.db` exists.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Before a new Feature Spec is authored, deliver the pre-spec landscape — related/overlapping/affected specs, related code, missing features + missing TCs/user stories, system unknowns, and the invariant landscape the new spec must respect — so the author never ships a duplicate, contradicts a [HARD] rule, or specs into a blind spot.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each is a signpost to its canonical body above):**

- **Graph-Assisted Investigation:** Run one graph command on key code files before concluding the code-discovery step.
- **Incremental Persistence:** Append findings to the research report, never hold the landscape in memory.
- **Subagent Return Contract:** Parallel-spec-read sub-agents return summary only, full findings on disk.
- **Nested Task Creation:** Expand child phases and link parent when nested under a workflow row.
- **Project Reference Docs:** Read `feature-spec-reference.md` + `spec-system-reference.md` + `lessons.md` before reading specs.
- **Task Tracking External Report:** Bootstrap task tracking, persist discovery findings incrementally.
- **Critical Thinking:** Traced proof per relationship/gap/invariant, confidence >80% to act.
- **Evidence:** Cite `file:line`; speculation forbidden, <60% do not recommend.
- **Cross-Service Check:** Scan producers, consumers, sagas, contracts — a missed consumer the idea touches is a silent gap.
- **Rationalization Prevention:** Reject step-skipping evasions; show grep evidence.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**MUST ATTENTION** every protocol above is in force for this spec-discovery — honor its canonical body, not just the digest line.

**IMPORTANT MUST ATTENTION** be BOTH spec-aware AND code-aware — read `docs/specs/**` (§1/§4/§5/§8 of related specs) AND delegate to `$scout` + code-graph; spec-only or code-only discovery misses half the landscape — why: overlap lives in the spec corpus, downstream impact lives in the code.
**IMPORTANT MUST ATTENTION** run INLINE — the step 5 scope-decision gate is a BLOCKING a direct user question that only works inline; spawn sub-agents only for parallel spec reads, NEVER delegate the whole skill — why: a delegated user gate cannot block, so the author would proceed before the user decides scope.
**IMPORTANT MUST ATTENTION** NEVER auto-pick NEW — classify every candidate spec EXTENDS/OVERLAPS/DEPENDS-ON/AFFECTED/UNRELATED with `file:line` evidence, then recommend and let the user decide via the BLOCKING gate — why: OVERLAPS detection is the entire reason this skill runs before the author; silently picking NEW ships a duplicate spec.
**MUST ATTENTION** stay in the LANDSCAPE lane — surface related/overlapping/affected specs + the invariant landscape fast; do NOT author the spec (that is `spec [mode=draft]`) and do NOT deep-dive every flow (that is `investigate`) — why: scope creep into authoring/analysis duplicates the next steps and burns the budget.
**MUST ATTENTION** graph expand is MANDATORY when `.code-graph/graph.db` exists — run at least ONE graph command on 2–3 key files scout surfaced; when absent, grep + read still bridge code→spec via `[Source:]` anchors — why: structural callers/consumers/event chains the new spec must account for are invisible to grep.
**MUST ATTENTION** capture the invariant landscape explicitly — list every existing [HARD] rule (§4) and §5 invariant the idea must respect, as "for ALL {inputs}, {invariant} — owned by {spec/BR-id}" — why: a new spec that contradicts a DEPENDS-ON spec's [HARD] rule ships a defect.
**MUST ATTENTION** apply the greenfield short-circuit — when no specs AND no code, record the reason with `Glob`/grep evidence, skip heavy discovery, hand off a minimal landscape; run the scope gate only if there is something to decide — why: grinding through empty discovery wastes the budget and produces nothing.
**MUST ATTENTION** persist the report incrementally (per-section) to the research file — never hold the whole landscape in memory — why: context cutoff mid-discovery loses every finding; disk writes survive compaction.
**MUST ATTENTION** read required project docs first (always `lessons.md`; `feature-spec-reference.md` + `spec-system-reference.md` for spec conventions) BEFORE reading any spec — project conventions override generic assumptions.

**Anti-Rationalization:**

| Evasion                                           | Rebuttal                                                                               |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| "The idea is obviously new, skip the spec scan"   | OVERLAPS is exactly what the scan catches. Classify every candidate spec first.        |
| "No graph available, skip code discovery"         | Grep + read still bridge code→spec via `[Source:]` anchors. Discovery is required.     |
| "I'll just guess the right scope"                 | Step 5 is a BLOCKING user gate. NEVER auto-pick NEW — recommend, then let user decide. |
| "Spec corpus is huge, read just one spec"         | Glob ALL candidates the keywords touch; reading one hides the overlap in another.      |
| "I'll author the draft while I'm here"            | Landscape only. Authoring is `spec [mode=draft]`; deep flow analysis is `investigate`. |
| "Invariants are the author's problem"             | A spec contradicting a [HARD] rule ships a defect. List the invariant landscape now.   |
| "Delegate the whole skill to a sub-agent, faster" | The step 5 gate is BLOCKING and inline-only. Spawn sub-agents only for spec reads.     |

**IMPORTANT MUST ATTENTION** spec-aware AND code-aware · INLINE (step 5 gate is BLOCKING) · NEVER auto-pick NEW — cite `file:line` with confidence >80% — these survive any long context, anchored top and bottom.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

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
  **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

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

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
