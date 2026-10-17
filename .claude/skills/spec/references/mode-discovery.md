# `/spec [mode=discovery]` — pre-spec landscape investigation reference

> Loaded by `spec/SKILL.md`'s Mode Dispatch when invoked as `/spec [mode=discovery] [--investigation=<report path>]`. This contract REPLACES the spec authoring body for the invocation: it reads the spec corpus and related code, reports the landscape, gates the scope decision with the user, and hands off. It never authors or edits a spec. It runs INLINE on the main agent.

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

## Quick Summary

**Goal:** Before a single line of a new Feature Spec is authored, deliver the pre-spec landscape — every existing Feature Spec the idea relates to / overlaps / depends on / would affect, the related code logic, the missing features and missing test cases / user stories, the system unknowns, and the invariant landscape the new spec must respect — so the author never ships a duplicate, contradicts a [HARD] rule, or specs into a blind spot.

**Summary:**

- This is BOTH spec-aware and code-aware: it reads `<spec root>/**` (the canonical Feature Specs — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND delegates to `/investigate` (plus an optional code-graph hint) for the code logic the idea touches. Spec-only or code-only discovery misses half the landscape.
- It runs BEFORE `spec [mode=draft]` and feeds it. Its job is to decide WHETHER a new standalone spec is even the right move — the alternative is extending an existing spec, which only a spec-corpus scan can reveal.
- It is INLINE on the main agent (NOT a sub-agent) because step 5 is a BLOCKING `ask user question tool` scope-decision gate that only works inline. It MAY spawn sub-agents for parallel spec reads, but it orchestrates and gates inline.
- **Optional input `--investigation=<report path>`** — a same-run `/investigate` report the caller (or the plan) explicitly names. Step 2 reuses it instead of re-running `/investigate` and delegates only slices it does not cover. Without the input, Step 2 runs `/investigate {keywords}` as usual — never assume an earlier investigation from context you were not handed.
- Greenfield short-circuit: when there are no specs AND no code, auto-detect it, record the reason, skip the heavy discovery, and hand off a minimal landscape — never grind through empty discovery.
- **Main steps (0→6) — do ALL in order:** (0) frame scope = keywords/entities/bucket → (1) spec-corpus discovery = Glob all candidate specs under the spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path), read §1/§4/§5/§8, classify each EXTENDS/OVERLAPS/DEPENDS-ON/AFFECTED/UNRELATED with `file:line` → (2) code-logic discovery = `/investigate` + optional graph hint, bridge code→spec via §8 `[Source:]` → (3) gap & invariant analysis = missing features, missing TCs/user stories, system unknowns, [HARD]/§5 invariant landscape → (4) report incrementally to `plans/.../spec-discovery-{slug}.md` → (5) BLOCKING `ask user question tool` scope gate = recommend NEW / EXTEND X / SPLIT, confirm cross-refs → (6) handoff to `domain-analysis` + `spec [mode=draft|update]`.

**Workflow:**

0. **Scope** — read the framed capability (brainstorm/idea output); extract keywords, candidate entities/actors, target spec bucket.
1. **Spec-corpus discovery** — `Glob <spec root>/**/README.*.md` (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path); read §1/§4/§5/§8 of each candidate; classify each as EXTENDS / OVERLAPS / DEPENDS-ON / AFFECTED / UNRELATED.
2. **Code-logic discovery** — reuse the `--investigation=<report path>` report when given, else `/investigate {keywords}`; plus an optional graph hint on key files when `.code-graph/graph.db` exists and the blast radius looks high-risk; bridge code→spec via §8 `[Source:]` anchors.
3. **Gap & invariant analysis** — missing features, missing test cases / user stories, system unknowns (<80% confidence), and the existing [HARD] rules / §5 invariants the idea must respect.
4. **Report** — write `<plans root>/{plan-dir}/research/spec-discovery-{slug}.md` (plans root default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) incrementally (Related Specs · Related Code · Affected Specs · Gaps · Invariant Landscape · Open Questions).
5. **Scope-decision gate (BLOCKING `ask user question tool`)** — recommend NEW / EXTEND existing X / SPLIT into N, and confirm which existing specs to cross-reference.
6. **Handoff** — feed entities, invariants, cross-refs, and gaps into `domain-analysis` + `spec [mode=draft]`.

**Key Rules:**

- Landscape over implementation — surface related/overlapping/affected specs + the invariant landscape fast; this is NOT the spec author and NOT a deep investigation.
- INLINE execution — the step 5 user gate is BLOCKING and only works inline; spawn sub-agents only for parallel spec reads, never delegate the whole skill.
- NEVER auto-pick NEW — step 5 is a BLOCKING user gate. OVERLAPS is exactly what the spec scan exists to catch; recommend, then let the user decide scope.
- The graph is optional advice; grep + read always bridge code→spec via `[Source:]` anchors, and an absent or stale graph is never a finding.

# Discovery — Pre-Spec Landscape Investigation

---

## Contents

- [Quick Summary](#quick-summary)
- [Discovery — Pre-Spec Landscape Investigation](#discovery--pre-spec-landscape-investigation)
- [When to Use](#when-to-use)
- [Phase 0: Classify Corpus & Short-Circuit](#phase-0-classify-corpus--short-circuit)
- [Workflow](#workflow)
- [Results Format](#results-format)
- [Related Skills](#related-skills)
- [Mode protocols](#mode-protocols)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## When to Use

- About to author a NEW Feature Spec from an idea / requirement / brainstorm output, before `spec [mode=draft]` runs.
- Need to know whether the idea is genuinely new or overlaps an existing spec (duplicate-spec prevention).
- Need the invariant landscape — the existing [HARD] rules and §5 invariants a new capability must respect or might violate.

**NOT for:** authoring the spec (use `spec [mode=draft]`), deep root-cause analysis of existing code (use `investigate`), generating Section 8 test cases (use `spec [mode=tests]`), regenerating the derived bucket index/ERD (use `spec [mode=index]`).

---

## Phase 0: Classify Corpus & Short-Circuit

**Before any discovery**, classify what landscape exists. This decides which steps run.

| Corpus state                | Detection                                                              | Route                                                                        |
| --------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Specs + code**            | `<spec root>/**/README.*.md` present AND source files for keywords (default `docs/specs`; `specRoots.business.path` in `docs/project-config.json` overrides the root) | Full run — steps 1, 2, 3, 4, 5, 6                                            |
| **Specs only**              | Specs present, no code yet (provisional/draft-era project)            | Steps 1, 3, 4, 5 — skip step 2 code discovery (record "no code yet")        |
| **Code only**               | No specs yet, code exists                                             | Steps 2, 3, 4, 5 — step 1 records "no existing specs", bridge gaps from code |
| **Greenfield (empty)**      | No specs AND no source for keywords                                  | **Short-circuit** — record reason, skip heavy discovery, minimal handoff     |

> **Greenfield / empty-corpus short-circuit.** When Phase 0 detects no specs AND no code: record `Corpus: greenfield — no specs, no code for {keywords}` with the `Glob`/grep evidence that proved it, skip steps 1–3, write a minimal landscape report (just the framed scope + open questions), and hand off to `spec [mode=draft]`. Run the step 5 scope gate ONLY if there is something to decide (e.g. two plausible buckets); with nothing to decide, default to NEW and state the assumption in one line.

---

## Workflow

### Step 0: Frame the Scope

Read the framed capability — the brainstorm / idea / requirement text that triggered this. Extract:

- **Keywords** — domain nouns and verbs the idea names (entities, actions, features).
- **Candidate entities / actors** — the business objects and roles the idea implies.
- **Target spec bucket** — which `<spec root>/{Bucket}/` the new spec would most likely live in — spec root default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path (per the project's module mapping; resolve from `feature-spec-reference.md` / `spec-system-reference.md` in the project-reference docs root, default `docs/project-reference`, relocatable via `docsRoots.projectReference.path`).

State the framed scope in one line before continuing (e.g. `Discovering for: "bulk order export" — keywords [order, export, batch], bucket Orders`).

### Step 0.5: Declare the Discovery Wave

Step 1 (specs), Step 2 (code), and the invariant/test-case sweep read DIFFERENT inputs and produce DIFFERENT report sections — they are PAR. Running them one after another triples the wall time of the gate that stands between an idea and a duplicate spec, for zero safety gain. Declare the wave before Step 1, then spawn its members in ONE message:

| Wave-1 member                      | Scope (read-only)                                                                       | Route to                                                              | Feeds                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| **Spec-corpus sweep**              | the `<spec root>/**` candidates the keywords touch (default `docs/specs`; `specRoots.business.path` in `docs/project-config.json` overrides it) — §1/§4/§5/§8 ONLY, never whole specs | one `investigate` per bucket when the corpus is large; inline for a small one | Related Specs · Affected Specs         |
| **Related-code discovery**         | the code the idea touches (the Step 2 delegation)                                        | `/investigate {keywords}` — or the supplied `--investigation=` report (no member spawned) | Related Code                           |
| **Invariant / test-case landscape** | [HARD] BRs (§4), §5 entity invariants, existing §8 TC coverage of the touched specs      | one `investigate`; fold into the corpus sweep when the corpus is small      | Invariant Landscape · Missing TCs      |

Rules binding this wave: each member owns a **unique artifact path** under `tmp/reports/spec-discovery-{slug}/`; no worker writes `spec-discovery-{slug}.md`. After the barrier, YOU are the sole reducer: read and validate every artifact, then synthesize the final report in section order. A missing artifact is rerun or reported, never silently replaced by a bounded summary.

**SEQ — keep these OUT of the wave (each names its blocker):** the optional Step 2 graph hint (YOU run it, and only after the code member returns its key files) · Step 3 gap & invariant reconciliation (consumes all three members) · the Step 5 scope-decision gate (a BLOCKING `ask user question tool` cannot block from inside a sub-agent) · Step 6 handoff.

Phase 0's corpus state shrinks the wave: **Specs only** → drop the code member · **Code only** → drop the corpus sweep · **Greenfield** → no wave at all (short-circuit).

### Step 1: Spec-Corpus Discovery

```bash
# Enumerate every canonical Feature Spec
ls docs/specs/**/README.*.md 2>/dev/null   # or: Glob docs/specs/**/README.*.md — docs/specs is the DEFAULT spec root; specRoots.business.path in docs/project-config.json overrides it
```

If NONE → record `No existing specs` and skip to Step 2.

Else, for each candidate spec the keywords touch, read the high-signal sections only (do NOT read whole specs — landscape, not deep-dive):

- **§1 Overview** — what the spec covers (scope boundary).
- **§4 Business-Rule headers** — the BR-{FC}-NN IDs and their [HARD]/[SOFT] tags (feeds invariant landscape).
- **§5 Domain Model** — entities + ERD (overlap detection by shared entities).
- **§8 Test-Case summary** — the TC count + summary table (coverage baseline; missing-TC detection).

Use the bucket `INDEX.md` (produced by `/spec [mode=index]`) as a fast navigation map when present — it lists the specs and their entities so you read fewer full files.

**Classify each candidate spec's relationship to the idea** (one label per spec, with `file:line` evidence):

| Relationship             | Meaning                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------ |
| **EXTENDS**              | The idea is a natural addition to this spec's capability — likely an UPDATE, not NEW. |
| **OVERLAPS (dup risk)**  | The idea re-states behavior this spec already owns — authoring NEW would duplicate.   |
| **DEPENDS-ON**           | The idea needs this spec's entities/rules to function — cross-reference required.     |
| **AFFECTED**             | The idea would change behavior this spec documents — forward-impact, may need amend.  |
| **UNRELATED**            | Shares a keyword but no real relationship — record to show it was checked.            |

### Step 2: Code-Logic Discovery (only if code exists)

Bridge the idea to the implementation so the spec reflects what actually exists (or what the idea will touch).

1. **Get the investigation.** When the caller passed `--investigation=<report path>` (an existing same-run investigate report that covers these keywords), read it and use its numbered, prioritized list as targets; delegate to `/investigate` ONLY for keyword slices the report does not cover. With no such input, **delegate to `/investigate {keywords}`** — fast parallel file discovery of the code the idea relates to. Either way, use investigate's list as targets and do NOT re-grep what it already mapped.
2. **Optional graph hint** — when grep and reading alone may not reveal a high-risk blast radius and `.code-graph/graph.db` exists, run graph commands YOURSELF (sub-agents do not) on 2–3 key files investigate surfaced; the graph can be stale or incomplete, so verify by reading:
    ```bash
    python .claude/scripts/code_graph trace <key-entity-or-command> --direction both --json
    python .claude/scripts/code_graph connections <key-file> --json
    ```
    The graph may surface callers, consumers, event chains, and tests grep misses — candidates for the downstream the new spec must account for; confirm each by reading.
3. **Delegate ambiguous areas to `/investigate`** — when investigate (plus any graph hint) surfaces a flow whose behavior is unclear (the idea hinges on how it works), hand that narrow slice to `investigate` rather than guessing.
4. **Bridge code → spec** — for each key code file, find its governing spec via the §8 `[Source: namespace/service/id]` anchors / Related Files. A code area with NO governing spec is a gap (record in Step 3); a code area WITH a governing spec strengthens the Step 1 relationship classification.

### Step 3: Gap & Invariant Analysis

From Steps 1–2, synthesize four lists (every item `file:line`-cited or marked "inferred"):

- **Missing features** — behavior the idea implies that NO existing spec or code covers. These are the net-new surface the spec must define.
- **Missing test cases / user stories** — in the specs the idea touches (EXTENDS/AFFECTED), the AC / TC the idea's behavior would require but that are absent today.
- **System unknowns** — anything the discovery could not resolve to >80% confidence (unverified flows, ambiguous ownership, unread cross-service consumers). Name each explicitly — an unknown surfaced is cheaper than a wrong spec.
- **Invariant landscape** — the existing [HARD] business rules (§4) and §5 entity invariants the idea must respect or might violate. This is the single most load-bearing output: a new spec that contradicts a [HARD] rule of a DEPENDS-ON spec ships a defect. List each invariant as "for ALL {inputs}, {invariant} holds — owned by {spec/BR-id}".

### Step 4: Report

Write `<plans root>/{plan-dir}/research/spec-discovery-{slug}.md` — plans root default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path — (resolve `{plan-dir}` from the active plan; fall back to `tmp/reports/spec-discovery-{YYMMDD}-{HHmm}-{slug}.md`, a FIXED framework path, when no plan dir exists). Persist **incrementally** — append each section as it is produced, never hold the whole report in memory:

```markdown
# Spec-Discovery: {initiative}

## Framed Scope
{keywords, candidate entities/actors, target bucket}

## Related Specs
| Spec | Relationship | Overlap evidence | Action implied |
| ---- | ------------ | ---------------- | -------------- |

## Related Code
{investigate's prioritized files + graph evidence — callers/consumers/tests}

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

### Step 5: Scope-Decision Gate (BLOCKING `ask user question tool`)

> **MANDATORY MUST ATTENTION — NO EXCEPTIONS:** before any spec is authored, MUST ATTENTION use `ask user question tool` to present the recommended scope. NEVER auto-pick — OVERLAPS detection is the whole reason this skill exists; assuming NEW silently ships duplicates.

Recommend ONE option (with the evidence behind it) and confirm the cross-references:

- **(a) NEW standalone spec** — no EXTENDS/OVERLAPS match; the idea is genuinely net-new. Hand off to `spec [mode=draft]`.
- **(b) EXTEND existing spec X** — an EXTENDS/OVERLAPS match means the idea belongs inside X. **Reroute to `/spec [mode=update]`** against X instead of drafting a new file.
- **(c) SPLIT into N specs** — the idea spans N distinct capabilities (or would breach the size caps); author N specs, each with its own bucket.

Also confirm WHICH existing specs (the DEPENDS-ON / AFFECTED set) the author must cross-reference, so the new/updated spec links them and respects their invariants.

### Step 6: Handoff

Feed the discovery forward:

- **→ `domain-analysis`** — the related entities + invariant landscape (so the domain model is consistent with existing specs).
- **→ `spec [mode=draft]`** (or `spec [mode=update]` if Step 5 chose EXTEND) — the framed scope, the missing features/TCs, the cross-references to link, and the [HARD] rules to respect.

---

## Results Format

Paths in the template below are DEFAULTS — spec root `docs/specs`, plans root `plans/`; `specRoots.business.path` and `docsRoots.plans.path` entries in `docs/project-config.json` override them. `tmp/reports/` is a fixed framework path.

```markdown
## Spec-Discovery Results: {initiative}

### Recommended Scope
**{NEW | EXTEND spec X | SPLIT into N}** — because {evidence-backed reason}

### Related Specs
| Spec | Relationship | Evidence | Implied action |
| --- | --- | --- | --- |
| `docs/specs/{Bucket}/README.{X}.md` | OVERLAPS | §4 BR-X-03 already states this | route to /spec mode=update |

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

`investigate` (code discovery and deep-dive ambiguous flows — Step 2) | `spec [mode=draft]` (authors §1–7 from the idea — Step 6 handoff) | `spec [mode=update]` (the EXTEND reroute — Step 5) | `domain-analysis` (entity/invariant modeling — Step 6) | `spec [mode=index]` (derived bucket INDEX.md used in Step 1)

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. This prevents context loss from long specs. Keep task depth proportional to the work.

These three filenames resolve inside the project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path.

- `feature-spec-reference.md` — Feature Spec conventions, bucket/module mapping (read before reading any spec).
- `spec-system-reference.md` — canonical vs derived spec artifacts, TC format, spec paths.
- `domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when the idea involves business entities/models).

> **External Memory:** Complex/lengthy discovery → write findings incrementally to the research report. Prevents context loss.

> **Evidence Gate:** MANDATORY MUST ATTENTION — every relationship classification, gap, and invariant requires `file:line` proof with confidence % (>80% act, <80% verify first).

## Mode protocols

The protocols below apply to this mode only; their full text is inline so this reference is self-contained. The `spec` skill already carries `cross-service-check` and `evidence-based-reasoning`.

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation (optional advice)** — Optional: for high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), `.code-graph/graph.db` may add callers, dependents and impacted tests beyond grep/read. Treat it as a hint, NOT proof: stale or incomplete graphs lag uncommitted edits and unindexed paths. verify anything that matters by reading files/grep. Skip it for low-risk or local changes.
>
> An absent or stale graph is never a finding and never blocks, fails or gates work.
>
> **Pattern:** grep/read → optional graph suggestions → grep/read verification.
>
> | Situation                          | Optional graph query                         |
> | ---------------------------------- | -------------------------------------------- |
> | High-risk investigation            | `trace --direction both` on 2-3 entry files  |
> | Fix/debug with wide reach          | `callers_of` on buggy function + `tests_for` |
> | Feature touching a shared contract | `connections` on files to be modified        |
> | Review of a high-risk change       | `tests_for` on changed functions             |
> | Blast radius                       | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Start `--node-mode file` (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for every visual-artifact review and for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `tmp/reports/{skill}-{date}-{slug}.md` and record Run ID, Task ID, Attempt ID, target scope, and target fingerprint. When visual artifacts are in scope, also record their ordered inventory and total; identify each screenshot, image, photo, or snapshot by path/name plus state and viewport when known.
> 2. **Checkpoint each review unit:** After each file or section, append findings, evidence, changed paths, and gaps immediately. For visual artifacts, open exactly ONE artifact, inspect it, and append its record BEFORE opening the next artifact. Each record includes artifact identity, state/viewport, inspection status, observations, severity-tagged issues with evidence, an explicit `none` when no issue exists, and any gap. NEVER batch multiple visual artifacts into one later write and never hold their findings in memory.
> 2a. **Resume from disk:** Treat the report's artifact records as the progress ledger. After interruption or context loss, read the report, derive processed and remaining artifacts from the ordered inventory, and continue at the first unprocessed artifact without duplicating completed records.
> 3. **Delegated return:** A sub-agent emits only the structured `SYNC:subagent-return-contract` envelope with exact totals, salient Critical/High findings (maximum ten), current attempt, and `Full report:` path. **Inline user-facing output:** Preserve the skill's requested explanation or teaching, with links to the persisted evidence; the delegated transport limit does not replace that deliverable. Do not paste a full review report into an envelope.
> 4. **Parent synthesis from persisted evidence:** The main agent reads the full report for synthesis, acceptance, deduplication, and repair planning — not only when a named blocker exists. For visual review, reconcile the ordered inventory against the artifact records before concluding; a missing record is incomplete review, never a clean result. Preserve all severities beyond the transport cap.
> 5. **Read-only boundary:** A read-only leaf may write its report/repair proposal but MUST NOT edit source, generated output, or user data; the parent/owner performs repairs after acceptance.
> 6. **Advancement gate:** The parent records `ACCEPTED` for the current Attempt ID only after reconciling target, totals, gaps, and changed paths; stale or late attempts cannot advance dependent work.
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings, and a large image set makes a final batch write especially fragile. Each per-unit disk write survives compaction. Partial results are better than no results, while explicit identity prevents a late result or a resumed image from being mistaken for the current run.
>
> **Report naming:** `tmp/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->


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

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY the structured envelope below. Main agent reads the envelope first, then opens the referenced report for synthesis, acceptance, deduplication, or repair planning; a full report is never pasted inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
> Run ID: [stable run identifier]
> Task ID: [parent task or phase identifier]
> Attempt ID: [monotonic attempt/revision identifier]
> Target: [exact files/paths or scope] @ [target fingerprint/commit]
> Changed paths: [none | exact paths]
> Finding totals: Critical=[n] | High=[n] | Medium=[n] | Low=[n]
> Acceptance: PENDING | ACCEPTED | REJECTED — parent records the decision
>
> ### Findings (Critical/High surfaced — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Gaps / Unverified
>
> - [missing host, runtime, coverage, or evidence limitation]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description, or `none`]
>
> Full report: tmp/reports/[skill-name]-[date]-[slug].md
> ```
>
> The ten-bullet limit is a transport limit, not a visibility limit: the full report may contain more than ten Medium/Low findings when no named blocker exists, and the parent MUST read it when synthesizing or deduplicating. The parent MUST reject a stale, duplicate, or superseded `Attempt ID` and MUST accept the current attempt before advancing a dependent step. Read-only leaves write repair proposals/reports only; they do not edit source, generated carriers, or user files.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the envelope lives in the incrementally-written report. A sub-agent that would exceed the summary shape MUST persist the detail and return only the pointer; bounded transport must never become bounded visibility.

<!-- /SYNC:subagent-return-contract -->

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

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:rationalization-prevention:reminder -->

**MUST ATTENTION** follow ALL steps regardless of perceived simplicity; "too simple to plan" is an evasion, not a reason. Plan anyway, test first, show grep evidence with `file:line`.

<!-- /SYNC:rationalization-prevention:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**Optional advice:** the code graph (`.code-graph/graph.db`) can hint at a high-risk blast radius grep misses; it can be stale, so verify by reading files. Never required.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->


## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `/start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses


## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Before a single line of a new Feature Spec is authored, deliver the pre-spec landscape — every existing Feature Spec the idea relates to / overlaps / depends on / would affect, the related code logic, the missing features and missing test cases / user stories, the system unknowns, and the invariant landscape the new spec must respect — so the author never ships a duplicate, contradicts a [HARD] rule, or specs into a blind spot.

**IMPORTANT MUST ATTENTION Workflow:** Phase 0 classify the corpus and short-circuit when empty → declare the parallel discovery wave → Step 1 scan related specs → Step 2 discover related code and graph paths → Step 3 reconcile gaps and invariants → Step 4 persist the report → Step 5 obtain the blocking scope decision → Step 6 hand off to `domain-analysis` and `spec [mode=draft|update]`.

**IMPORTANT MUST ATTENTION** Apply the inline mode protocols and the parent skill's evidence/cross-service contracts; the digest never substitutes for their bodies.

- Stay in the landscape lane: classify every relevant spec with cited evidence, inspect related code, bridge code→spec through `[Source:]`, and list owned [HARD]/§5 invariants, gaps and unresolved confidence limits. Read project lessons and spec references first; use configured roots.
- Run INLINE. Parallel readers own unique artifacts; the main agent validates every return and alone reduces them before the blocking NEW/EXTEND/SPLIT decision. Never auto-pick NEW in a nonempty landscape or delegate the whole skill.
- Reuse an explicitly supplied same-run `--investigation=` report; investigate only uncovered slices. Graph hints are optional and verified by grep/read; their absence never waives code discovery.
- Greenfield requires proof of no specs AND no code: skip heavy discovery, persist minimal scope/questions, and run the scope gate only when a real decision remains. Otherwise record the NEW assumption and hand off.
- Persist each report section as produced; use the declared return contract and task statuses. Handoff supplies entities, invariants, cross-references and gaps to `domain-analysis` and the chosen draft/update mode.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| "The idea is obviously new, skip the spec scan"  | OVERLAPS is exactly what the scan catches. Classify every candidate spec first.   |
| "No graph available, skip code discovery"        | Grep + read still bridge code→spec via `[Source:]` anchors. Discovery is required. |
| "I'll just guess the right scope"                | Step 5 is a BLOCKING user gate. NEVER auto-pick NEW — recommend, then let user decide. |
| "Spec corpus is huge, read just one spec"        | Glob ALL candidates the keywords touch; reading one hides the overlap in another. |
| "I'll author the draft while I'm here"           | Landscape only. Authoring is `spec [mode=draft]`; deep flow analysis is `investigate`. |
| "Invariants are the author's problem"            | A spec contradicting a [HARD] rule ships a defect. List the invariant landscape now. |
| "Delegate the whole skill to a sub-agent, faster"| The step 5 gate is BLOCKING and inline-only. Spawn sub-agents only for spec reads. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
