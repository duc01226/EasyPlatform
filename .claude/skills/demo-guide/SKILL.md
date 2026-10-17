---
name: demo-guide
version: 2.3.0
description: '[Documentation] Use when a workflow step or the user asks for demo guides and delivery walkthroughs linking stories and canonical cases to runnable flows and evidence.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Investigate an in-scope feature end-to-end, then produce a stakeholder-ready, proof-carrying demo guide with real stories and profile-defined canonical identities linked to actual test/executor or approved manual-QC evidence, runnable user flows, domain storage/solution, and honest proof levels — UI-first, with technical cases in the closing appendix — so presenters can show behaviour, explain its data, and never claim unearned proof.

**Summary:** Read this if nothing else.

- **Purpose:** MUST ATTENTION investigate before scripting; prove behaviour, user path, storage, and solution with `file:line`; ALWAYS state blockers instead of inventing missing evidence.
- **Main steps (in order):** MUST ATTENTION (0) resolve scope → load output + configured spec contract → size S0–S4 → decompose → create todos; (1) clear the six-question gate + write the Understanding Brief; (2) gather five inventories; (3) map/persist canonical identities to actual carriers + classify channels; (4) trace storage/solution; (5) open guide + ledger and accumulate; (6) write four-part cases; (7) compose the task block at the top; (8) assign proof rungs + transparency; (9) validate.
- **Case contract:** setup + numbered flow + discriminator + domain storage/solution + proof rung/chain. UI cases lead each story; technical cases keep full rigour in the closing appendix.
- **Modes and boundaries:** `feature-or-scope`, `--context`, `--output`, `--lang`, `--html`, `--stories`, `--estimate`; only `--estimate` or an explicit estimation instruction names the estimate target — the demo scope never does; `--lang` emits a translated copy and `--html` follows post-approval Artifact flow; a no-front-end project names its primary demo surface; delegates gather read-only input only; secrets are redacted; deferred work is named in the header and chat summary.

**Workflow:**

0. **Resolve Scope, Load Contract, Size & Create Todos** — prompt → context → ASK; read the template and configured spec contract; size S0–S4; decompose into story groups; create todos BEFORE the first deep read.
1. **Understand the Feature FIRST [BLOCKING]** — clear the comprehension bar; use read-only gathering delegates only when needed; write the Understanding Brief.
2. **Gather the Five Inventories** — discover through `docs/project-config.json`; record each ladder's landing rung.
3. **Map Stories → Cases + Classify the Demo Channel** — preserve profile-defined canonical identities and map them to verified test/executor evidence; name gaps and tag every case 🖥️ UI or 🔧 technical; under no-front-end, UI means the declared primary surface (Step 3.1).
4. **Trace Domain Storage & Solution** — per case, identify persisted/changed data, owner, migration/handler, consuming rule, and `file:line` evidence.
5. **Open the Guide + Ledger, Accumulate** — write the spine first; add one block per story group; update the ledger as each lands.
6. **Write Each Case** — setup → numbered flow → discriminator → domain storage/solution.
7. **Compose the Task Block** — prepend a copy-paste-ready task at the very top: purpose, overall requirements, ALL acceptance criteria / user stories, authorization requirements, and a bottom-up estimate (effort points + man-days) per `SYNC:estimation-framework`, sized over the **estimate target only** — the current changes by default, the target the user names for estimation, or (no change set in scope) the labelled demo scope — never silently the entire feature.
8. **Prove** — assign the proof rung and write the test-execution transparency note.
9. **Validate** — pass the gate below before declaring done.

**Key Rules (the contract):**

- **UNDERSTAND BEFORE YOU SCRIPT.** The Step 1 comprehension bar is a **[BLOCKING] gate**: until you can answer all six questions with `file:line`, you have no demo to write. — why: a demo step invented from a screen name is a demo that fails live, in front of the people it was written for.
- **THE GUIDE OPENS WITH A COPY-PASTE-READY TASK.** Before the demo guide body, the document carries a task block (Step 7) a developer pastes straight into the tracker: purpose/business value · overall requirements (in/out of scope) · **ALL** acceptance criteria and user stories · authorization requirements (or an explicit `None`) · estimation with **effort points AND man-days** derived bottom-up per `SYNC:estimation-framework`. Its content is **sourced, never invented** — copied from the governing spec/task where one exists, else derived from the traced cases with the source stated. — why: the demo and the task record describe the same item; a developer who must re-type it by hand ends up with two different truths.
- **Scope precedence is prompt → current context → ASK.** An explicit feature in the prompt wins; else derive from current work; else `ask user question tool` — NEVER invent a feature.
- **Every case carries four parts:** setup/preconditions · numbered **step-by-step demo flow** · **expected result phrased as the discriminator** vs the old behaviour · **how the domain stores/changes data & solves the feature**. A case missing the storage/solution part is incomplete.
- **DEMO THROUGH THE UI — the audience is a normal user / QC, not an engineer.** Every main case is staged AND observed in the product's front-end. A case whose steps or expected result need an API client, CLI, script, manual job/queue trigger, DB query, log tail, or config edit is a **🔧 technical case**: marked as such and collected in the closing `Appendix — Technical demo (non-UI)` (after the last story, before the transparency note), NEVER among the important cases to test. **Resolve the front-end rung FIRST (Step 3.1)** — a project with no front-end states `No front-end in this project — primary demo surface is {API / CLI / library / background job}`, and that surface REPLACES "front-end" throughout this rule. — why: the room believes what it watches happen in the app; a terminal-driven step proves the code to engineers and proves nothing to the stakeholders the guide was written for.
- **PROOF IS EARNED, NEVER ASSERTED.** Every case sits on one of the four proof rungs (Step 8), and `✅ ran` is licensed **only** by a configured test/executor or explicitly approved manual-QC carrier executed this session with its command/procedure and inspected result recorded. There is no fifth rung: a case you cannot place is a **stated blocker**.
- **REAL IDENTITIES ONLY — NEVER invent a canonical or test ID.** Use the configured native case identity and record actual test/executor references separately; use strict `TC-*` identities only when neither config nor required project references establishes a native profile. A story with no proving carrier says *"no verified carrier covers this"* and is recorded as a coverage gap. — why: a fabricated ID retires a risk that is still live.
- **Cite `file:line` for every storage/behaviour claim** — read the entity, the mapping, and the migration. NEVER infer persistence from a field name.
- **A demo step is traced to a real user path, or it is a stated blocker** — NEVER an invented click, endpoint, or screen, and never state faked by a path a user could not reach.
- **DELEGATE THE GATHERING, NEVER THE SCRIPTING.** Read-only delegates only; their output is INPUT, re-verified at `file:line` before it becomes a claim. NEVER delegate to a mutating or findings-emitting skill (`/fix`, `/changes-review`, `/code-quality-review`, `/plan --mode=execute`).
- **ACCUMULATE ON DISK, NEVER IN CONTEXT.** Open the guide before case one; append per case and per story group; synthesize the guide-level sections **from the written blocks**. — why: partial results on disk beat complete results that never got written.
- **NO SECRET VALUES, ANYWHERE.** Setup steps, run commands, and seed instructions name the setting, the file, and the account **role** — never a credential, token, key, connection string, or customer identifier. Secrets render `<redacted:…>` from the moment they would enter context.
- **NO SILENT TRUNCATION.** Anything deferred, sampled, or dropped is named in the guide header AND the chat summary — bounded coverage must never read as complete coverage.
- **Portable — discover, don't hardcode.** Resolve source roots, spec/test locations, run commands, and output dir from `docs/project-config.json`; degrade gracefully and say which rung you landed on.
- **Scale buys MORE STORY GROUPS, never FEWER PARTS per case.** *"Too big to demo properly"* is a conclusion this skill may never reach.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.**

---

## Contents

- [Quick Summary](#quick-summary)
- [Demo Guide — Investigate-First, Proof-Carrying Demo Script](#demo-guide--investigate-first-proof-carrying-demo-script)
- [Invocation](#invocation)
- [Step 0 — Resolve Scope, Load the Contract, Size & Create Todos (cheap — costs seconds)](#step-0--resolve-scope-load-the-contract-size--create-todos-cheap--costs-seconds)
- [Step 1 — Understand the Feature FIRST **\[BLOCKING GATE\]**](#step-1--understand-the-feature-first-blocking-gate)
- [Step 2 — Gather the Five Inventories (portable discovery)](#step-2--gather-the-five-inventories-portable-discovery)
- [Step 3 — Map Stories → Cases (persist the map)](#step-3--map-stories--cases-persist-the-map)
- [Step 4 — Trace Domain Storage & Solution (the distinctive step)](#step-4--trace-domain-storage--solution-the-distinctive-step)
- [Step 5 — Open the Guide + Ledger, Accumulate Story by Story](#step-5--open-the-guide--ledger-accumulate-story-by-story)
- [Step 6 — Write Each Case (four mandatory parts)](#step-6--write-each-case-four-mandatory-parts)
- [Step 7 — Compose the Task Block (top of the guide)](#step-7--compose-the-task-block-top-of-the-guide)
- [Step 8 — Prove (the proof ladder)](#step-8--prove-the-proof-ladder)
- [Step 9 — Validate](#step-9--validate)
- [Configuration](#configuration)
- [Integration with Other Skills](#integration-with-other-skills)
- [Closing Reminders](#closing-reminders)

# Demo Guide — Investigate-First, Proof-Carrying Demo Script

You are an **investigator first, a presenter's coach second** — the order is the point.

- **Investigate:** identify capability/before→after, state owner, click→persistence→display flow, and governing rule. Read the code; NEVER infer persistence from a name.
- **Coach:** provide a live real-user script, old-behaviour discriminator, and honest trace-vs-test proof statement.

> **Success bar:** the presenter can stage preconditions without asking anyone, run every case without improvising, explain where data is stored and why it is correct, and distinguish green tests from trace-only demos. Otherwise it is a wish-list, not a demo guide.

Instructions, not documentation: this skill teaches HOW to build the guide from real project evidence, adapting to whatever the project actually has (specs, tests, tasks, or just a diff).

## Invocation

```
/demo-guide [feature-or-scope] [--context] [--output path] [--lang xx] [--html] [--stories "A,B"] [--estimate "<target>"]
```

| Flag / arg         | Meaning                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `feature-or-scope` | Named feature, spec title, task/story id, path, or free-text scope. Highest precedence. Sets the DEMO scope only, never the estimate target. |
| `--context`        | Force "derive scope from current working context" (branch diff / staged + unstaged / active work). |
| `--output path`    | Where to write the guide. Default: project demo-guide dir (see Configuration), else a temp file.   |
| `--lang xx`        | Also emit a translated copy in the given language (keep code identifiers/paths/IDs in English).    |
| `--html`           | After the markdown, offer/produce a self-contained HTML runbook (via the Artifact flow).           |
| `--stories "A,B"`  | Restrict to the named stories instead of all main stories.                                         |
| `--estimate "<target>"` | Name the estimate target (story, task/story id, files, slice, or `whole feature`) — Step 7 rung 1. Absent → current changes. |

## Step 0 — Resolve Scope, Load the Contract, Size & Create Todos (cheap — costs seconds)

**0.1 Resolve scope (prompt → context → ASK).** Apply this defining precedence:

1. **Prompt names scope** → use it; normalize to a spec, task/story ID, changed files, or keywords; confirm real artifacts.
2. **Prompt empty / only "generate demo guide"** → derive current context until signal: active task/workflow goal → `git status` + staged/unstaged `git diff` + branch → recent commits vs main → in-progress plan/spec/release-note.
3. **No usable signal** → **STOP and `ask user question tool`**: *"Which feature should I generate the demo guide for?"* Offer 2-4 found candidates plus free text. NEVER pick silently.

State the resolved scope and its source in one line (e.g. `Scope: <feature> — derived from branch diff (7 changed files)`).

**0.2 Load the output and spec contracts BEFORE Step 1.** Read `references/demo-guide-template.md` for structure, case blocks, proof rungs, storage fields, and translation/HTML rules. **If missing**, name the absent file and use this file's inline Step 6–8 contract; still deliver the full guide, with only template elaboration unavailable. Read `docs/project-config.json` and routed spec references to resolve the case profile before asking what proves a case:

| Evidence | Case contract |
| --- | --- |
| Explicit `specArtifacts` profile in config | Use its canonical root, sections, identities, carriers, and declared mapping relation; consult routed references for meaning. |
| No machine profile, but required references define a native model | Use the documented native owner, identities, carriers, and mapping relation. |
| Neither config nor references defines a native model | Use the strict `TC-*` identity and Section 8 default, with its one-TC-to-many-tests mapping. |

For a native profile, **MUST ATTENTION** preserve owner-qualified scenario identity and variants exactly; map each to actual test/executor or explicitly approved manual-QC carriers and inspected assertions or observed outcomes. Derive cardinality only from the declared contract and verified artifacts. **NEVER** treat an aggregate pass as proof for uninspected rows; leave their result unknown or blocked. Test names and guide-local labels are references, not canonical IDs; never flatten namespaces, invent IDs, create a second registry, or assume one-to-one mapping. Conflicts or unknown mappings remain blockers.

**0.3 Size the target into a tier (count, do not estimate).** Count in-scope **files**, user-facing **capabilities/flows**, **modules/bounded contexts** (`docs/project-config.json` → modules), and changed lines when a diff exists. Use the first matching row top-down, highest tier first. S0 is eligible only when no larger-scope trigger matches; an explicit point request does not override measured scale. Provisional grouping is a cheap scope signal; if decomposition later exceeds the selected tier, promote and announce the tier before dispatch. Announce it: `Scope: S2 · Multi — 14 files, 3 capabilities → 3 story groups`.

| Tier            | Trigger (first match wins)                             | Story groups        | How the work runs                         |
| --------------- | ------------------------------------------------------ | ------------------- | ----------------------------------------- |
| **S4 · Program**| Whole product · multi-service · "demo the whole thing" | Grouped per context | Group agents → context synthesis → spine  |
| **S3 · Large**  | > 40 files **OR** > 6 story groups                     | 6–12                | One sub-agent per group, front-loaded writes |
| **S2 · Multi**  | ≥ 10 files **OR** ≥ 2 capabilities/flows/contexts      | 2–6                 | Inline, story group by story group        |
| **S0 · Point**  | One case, one bug fix, one screen                      | 1                   | Inline, case by case                      |
| **S1 · Small**  | < 10 in-scope files, one capability                    | 1                   | Inline, case by case                      |

> These tiers govern demo story grouping and dispatch. Review assignments follow `SYNC:systematic-review-batching` from risk, related flows, working-set fit and delegation cost; a demo tier does not prescribe the review topology.

**Tier is a SHAPE dial, not depth:** it changes group count and dispatch, but NEVER removes a case part, proof rung, or storage explanation.

**0.4 Decompose into story groups, then create the todos — BEFORE any deep read.**

- **A story group is a demoable unit** — one user-facing capability staged in one sitting, ≤ 8 files or ≤ 2000 diff-lines. Choose the first decomposition rung yielding ≥2 cohesive groups: **capability / user story** → **end-to-end flow** → **module / bounded context** → **screen or endpoint cluster** (last resort: *"structural grouping — not a story boundary"*). Record the rung. S0/S1 → exactly one group. A 🔧 technical case NEVER forms its own group; it goes to the closing appendix (Step 3.1) — why: a group must be showable to a user.
- **[BLOCKING] Create the todo list BEFORE gathering.** `TaskList` FIRST; interrupted/compacted runs resume todos, never duplicate them. Create one todo per group plus: *size & decompose · understand-gate · scope-wide gather · open guide + ledger · proof & transparency · validate*. Exactly one `in_progress`. **A group todo completes ONLY when its block is on disk**; evidence is the path plus its cases, not a context summary — why: an interrupted run must show its exact stopping point.

## Step 1 — Understand the Feature FIRST **[BLOCKING GATE]**

**No demo step, expected result, or storage claim before this gate clears.** Investigation makes the guide true.

**Comprehension bar — answer all six with `file:line` for each story group:**

1. **What capability is delivered, and what did the system do before?** State the before → after behaviour; the expected result must discriminate it.
2. **Which entity/aggregate owns the changed state, and which field/column/table holds it?** Read entity, mapping/configuration, and migration — not the property name.
3. **What is the end-to-end flow?** Entry screen/endpoint/job → validation → handler/domain rule → persistence → read path rendering the presenter's outcome.
4. **Which business rule/invariant makes the result correct, and where is it enforced?** This is the stakeholder's *"but what if…"* test.
5. **What preconditions exist, and which REAL user path stages each?** Roles, configuration, seed data, and prior state must be user-reachable.
6. **What proves it?** The configured canonical owner/scenario identity (plus variant when defined) mapped to the actual test/executor or explicitly approved manual-QC carrier and its inspected assertion/observed outcome; runnable status here and cases with no carrier.

**Cannot answer one?** Keep investigating or delegate. NEVER paper over the gap with a plausible step.

| The gate needs…                                                        | Invoke                              | Feeds                                        |
| ---------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------- |
| Where the feature's files even are, across a large or unfamiliar repo  | `/investigate`                            | Step 0.4 group decomposition + file lists    |
| How the existing feature actually works, beyond what one read shows    | `/investigate`                      | Bar Q1 · Q3 · Q4 → the storage/solution block |
| Why a fixed defect now behaves differently (bug-fix demo)              | `/investigate --mode=debug`                | Bar Q1's before → after discriminator        |
| The call/flow chain and which read path renders the outcome            | `/graph-code --mode=trace` · `/graph-code --mode=blast-radius` (optional hints) | Bar Q3 · the "where to look" demo step     |
| Which spec owns the capability, when finding it is itself the problem  | `/spec [mode=index]` · `/spec`             | Bar Q6 → canonical identity + actual carrier |

1. **Read-only delegates ONLY.** NEVER invoke a skill that mutates files or issues findings/verdicts (`/fix`, `/changes-review`, `/code-quality-review`, `/why-review`, `/plan --mode=execute`) — this skill emits a script, not a verdict, and mutates nothing but its own output.
2. **MUST ATTENTION delegate on evidence of need — NEVER by reflex.** Try read + grep + trace first, within the group's budget. Announce each delegation in one line and record it in the guide header: `Delegated: /investigate — Story B mechanics`. — why: the reader calibrates on the provenance chain exactly as on a grep-derived claim.
3. **A delegate's output is INPUT, never a finished block.** Re-verify every claim at `file:line` before it enters the guide; a canonical identity or executor reference that arrives through a delegate is still one you must verify yourself. The anti-hallucination bar does not relax by passing through another skill.
4. **At tier S3+, delegation happens INSIDE the group's sub-agent**, never in the orchestrator. — why: delegating from the orchestrator pulls a whole investigation transcript into the one context the grouping exists to protect.

**Gate exit:** write the Understanding Brief to disk before Step 2 ends. For each group, include six answers with `file:line`, delegations, and every unanswered question as a named blocker, never blank. Steps 4, 6, and 7 use this brief, never memory.

## Step 2 — Gather the Five Inventories (portable discovery)

Use the same `docs/project-config.json` and required project-reference docs to locate (do NOT hardcode) **source roots** (entities, handlers, migrations, models), **spec/feature-doc locations and profiles** (canonical owners, sections, identities, carriers, and declared mapping relation), **test locations** (integration/unit/e2e — ground truth of "what is proven"), **release/changelog/task-story** dirs, and **run/test commands**. This skill runs on unfamiliar repos; a hardcoded framework path is a guess wearing a citation.

Use the case contract resolved in Step 0.2 throughout the inventories and story map; do not reselect or reinterpret it per source.

Each inventory walks its ladder top-down and **records its landing rung**. **Every ladder ends in a stated blocker; none has an invention rung.**

1. **Story & case-evidence inventory** (feeds the story map and §Quick-reference). The main user-facing capabilities in scope, each as *As a … I want … so that …*, plus the configured canonical case identities and actual test/executor or explicitly approved manual-QC carriers proving each. Under the strict default, preserve the spec `TC-*` identity and link its real test carriers. Follow the declared mapping relation; never merge canonical IDs with executor names into one namespace or assume a one-to-one mapping. _Ladder:_ canonical specs → actual test/executor sources → tasks/release notes/commit messages → the diff itself → **state that no story source exists**.
2. **Domain storage & solution inventory** (feeds each case's fourth part). Per case: the persisted field/column/table, the owning entity/value object, the migration that added or altered it, the value actually written (anchored/computed), and the rule/method/invariant that consumes it. _Ladder:_ entity + mapping + migration read → graph trace of the writer/reader → schema dump → **state the blocker**.
3. **Demo path & setup inventory** (feeds setup/preconditions and the numbered steps). The real user path to each precondition: roles/permissions, configuration flags, seed or fixture entry points, which app/screen/endpoint, and what input. _Ladder:_ existing seeders/fixtures → e2e test setup → manual path traced through the UI/API code → **state that the precondition cannot be staged**.
4. **Proof inventory** (feeds the proof rung per case). Which configured tests/executors or approved manual-QC carriers exist, which are runnable here (resolve the command/procedure — never guess it), and what actually ran or was observed this session. _Ladder:_ `project-config.json` commands → the CI workflow's own commands/procedures → the test-runner manifest (`package.json` scripts, `*.csproj`, `Makefile`) → **state that no carrier or run procedure could be resolved**.
5. **Discriminator inventory** (feeds every expected result). Per case, the value/state that would have been WRONG under the old behaviour — from the diff, the fixed defect, the spec's AC, or the test's assertion. _Ladder:_ the test assertion → the diff's before/after → the spec AC → **state that the discriminator is unknown** rather than writing "it succeeds".

> **[SECURITY]** Record every command, credential, and account in **placeholder form** at the moment of collection — not at write time. Environment variables, connection strings, tokens, keys, passwords, and customer identifiers are referenced by NAME and rendered `<redacted:…>`; demo accounts are named by **role** (`<demo user: approver>`), never by real login. This is the point where a secret would first enter context, so it is the point that must refuse it.

> Read the code path from the stored field to the reader that solves the case; optionally, when `.code-graph/graph.db` exists, `python .claude/scripts/code_graph trace <entity-or-handler> --direction both --json` can hint at the flow (it may be stale — verify at `file:line`). The "how the domain solves the feature" claim is backed by `file:line` evidence, not guesswork.

## Step 3 — Map Stories → Cases (persist the map)

- **Main user story** = user-facing capability/outcome. Prefer spec stories; otherwise synthesize one per distinct capability from ACs/tests. Keep minor variants under cases; do not inflate the count.
- **Cases per story** = presentation cases traced to profile-defined canonical identities and actual proving carriers — NEVER invent or repurpose IDs. A story without a verified carrier is a **coverage gap to report**, never a plausible ID.

Write the story → case map to disk before any case block; cross-check the full changed-file list so no main area is missed — why: the map is the coverage contract, and context-only work can vanish at cutoff.

**3.1 Classify every case by DEMO CHANNEL — UI-first [BLOCKING before any case block is written].**

The reader is a **normal user / QC driving the running app** — no terminal, API client, database console, or log tail. Classify every mapped case into exactly ONE channel; the channel determines placement.

**FIRST resolve the PROJECT's primary demo surface — one rung, stated once, before classifying cases.** Discover whether a front-end exists; record the landing rung and repeat it verbatim in the guide header.

| Rung | Resolve when | What it changes below |
| ---- | ------------ | --------------------- |
| **Front-end present** | a discriminating signal resolves to a real user-facing app | Default — everything below applies exactly as written. |
| **`No front-end in this project — primary demo surface is {API / CLI / library / background job}`** | no signal resolves | That surface REPLACES the front-end throughout — **including the channel table below**: read "front-end" as that surface and "non-UI" as "not that surface", so its cases are the main-body channel, ordered first, and the appendix holds only what is not demoable on that surface either. The main-channel marker stays `🖥️`, but the WORD `UI` is replaced by the surface name everywhere the split is written. |

**Discriminating signals** (`docs/project-config.json`): `modules[*].kind` (front-end/app/web vs library/service) · `e2eTesting.framework` (`"none"` means no browser surface) · `styling.guideDoc` · `designSystem.appMappings`. **NEVER test `framework.frontendPatternsDoc`**: it is a scaffold default and proves nothing. Whichever signal decides, state the rung; NEVER switch silently — why: without it, backend, CLI, library, and API products get an empty main body, an all-appendix guide, and a false thin-surface finding.

| Channel | Test (first failure decides) | Placement |
| ------- | ---------------------------- | --------- |
| **🖥️ UI case** — *the demo* | Staged **and** observed entirely through the product's front-end: screens, forms, clicks, navigation, visible output | Main body, inside its story group, ordered first |
| **🔧 Technical case** | ANY step or expected result needs a non-UI surface — HTTP/API client, CLI, script, manual job/queue trigger, DB query, log or file inspection, config edit | Closing `## Appendix — Technical demo (non-UI)` — after every story, before the transparency note |

- **UI cases carry the demo; technical cases are the appendix.** Order each story's cases UI-first, and NEVER let a technical case open a story, head the quick-reference table, or count as a main case to test. — why: the room believes what it watches happen in the app.
- **Hybrid = UI case.** A case demoed on screen whose data can ALSO be confirmed in the DB or logs stays a UI case — put that confirmation on its own **`Deeper confirmation (optional, non-UI)`** line, NEVER as a numbered demo step and NEVER on the proof chain. — why: every numbered step must be runnable by the presenter on screen with no tooling the audience has; and the proof chain is typed as `file:line` links a challenger can walk, so a runtime action ("query `orders` after clicking Save") on that line is an entry the auditor cannot open.
- **A story whose ONLY demonstration is technical is a stated finding.** Record `no UI demo path — technical only` in the story header and route its cases to the appendix. NEVER invent a screen, button, or admin page to make a case look UI-demoable. **Silent under the no-front-end rung** — a project with no front-end by design has no missing UI path to report; there the finding fires only when a case is not demoable on the project's primary surface either. — why: an invented surface fails live, and the audience discovers it before you do.
- **Announce the split in the guide header** — `Cases: 11 🖥️ UI · 3 🔧 technical (appendix)`. **Under the no-front-end rung** the split counts the primary surface as the main channel, and a large appendix is NOT a thin-surface finding — the stated rung already explains it. — why: for a product that HAS a front-end, a guide that is mostly appendix is telling the team the feature's user-visible surface is thin — a finding worth surfacing, not a formatting detail.
- **A technical case keeps the FULL four-part block and its proof rung** — it is demoted in ORDER and PROMINENCE, never in rigour. It obeys **every** per-case rule below: the four parts, real-user-path setup with no faked state, the `file:line` storage claim, the proof rung and chain; only its **observation** surface may be non-UI. — why: the appendix is a placement, not a lower evidence bar — and "not a main case" must never be read as "not bound by the per-case rules".

## Step 4 — Trace Domain Storage & Solution (the distinctive step)

For **each case** — UI and 🔧 technical — read the owning code and answer both questions with `file:line` evidence:

- **How is domain data stored or changed?** Identify persisted field(s)/column(s)/table, owning value object/entity, migration, anchored/computed value, and additive/nullable/backfilled status. Read entity, DTO mapping, and migration — NEVER infer persistence from names.
- **How does the domain solve the feature?** Identify the rule/method/invariant consuming that data to produce the outcome (resolver/derivation/gate), and why storage makes it correct — including edge cases, legacy fallback, and cross-tier parity.

For a display-only case, state **explicitly** that persistence does not change and describe the **representation** (computed value/shape and why correct). *"No storage change"* is valid; an empty block is not.

## Step 5 — Open the Guide + Ledger, Accumulate Story by Story

**Create the guide file BEFORE case one** and append as you produce it. NEVER hold the whole guide in context for one final write.

**Write order is fixed:** title + a `<!-- task:START -->` / `<!-- task:END -->` placeholder marked `pending` (filled in Step 7) → header — scope/source, sources, delegations, tier/group count, **group ledger** rows `pending`, and empty `Appendix — Technical demo (non-UI)` heading → each group (trace → write main cases → **append 🔧 technical cases to the appendix** → mark its ledger row `written` with `main / technical` split → complete its todo) → guide-level sections (storage summary, quick-reference table, transparency note) **from written blocks** → chat summary. NEVER hold more than the current group; read finished blocks from disk — why: the appendix is last in the document but technical cases are written per group, preventing context loss.

**After a cutoff, compaction, or resume:** `TaskList` → read the ledger → **verify every `written` row against the filesystem** — a group's cases live in **TWO** places, so check BOTH: the file exists AND carries that group's main-channel cases AND its 🔧 technical cases in the appendix; an absent or truncated block in **either** location resets the row to `pending` → re-read the contract and the Understanding Brief → continue at the first unfinished group. NEVER restart a finished group and never re-derive a written block from memory.

> **[NO SILENT TRUNCATION]** If any cap, budget, or interruption leaves part of the resolved scope uncovered, name what was deferred or dropped **in the guide header AND in the chat summary** — *"Story D (bulk import, 9 cases) deferred — not covered by this guide."* — why: bounded coverage that reads as complete coverage sends a presenter into a room unprepared for the question nobody examined.

**Write location — the demo guide is a DELIVERABLE, not a working artifact.** Write it to the project's demo-guide dir (Configuration); it is shared and version-controlled. **This deliberately differs from `/understand`, whose report is git-ignored** — do NOT copy that rule here — why: a guide the team cannot find is unused.

## Step 6 — Write Each Case (four mandatory parts)

Follow `references/demo-guide-template.md`. Per **case** — UI and 🔧 technical — the guide MUST contain:

1. **Setup / preconditions** — exact state (roles, configuration, seed data, app/screen), staged through **real user paths**; never fake unreachable state. Secrets use `<redacted:…>`, accounts use roles.
2. **Step-by-step demo flow** — numbered, concrete click/action steps: actor, screen, input, and observation. **Every 🖥️ UI step runs in the front-end**; endpoint, command, query, or log inspection appears ONLY in a 🔧 technical appendix case. An untraceable step is a **stated blocker**, never an invented click.
3. **Expected result** — observable **discriminator**: the value that would have been WRONG under old behaviour, not generic "it succeeds".
4. **How the domain stores/changes data + solves it** — Step 4 in plain team language with `file:line` anchors.

**Order inside every story: 🖥️ UI cases first** (happy path → variants → edge cases → legacy). 🔧 Technical cases are NOT inline; put them in the closing `Appendix — Technical demo (non-UI)` with the same four-part shape, after the last story — why: presenters read top-down.

Also include: scope/source header with `{n} UI · {n} technical` split, story groups, **main case quick-reference table** (canonical identity · actual carrier reference(s) · what it proves · proof rung — main-channel cases only), **domain storage summary** per story, closing **technical demo appendix**, and **test-execution transparency note**. Keep prose tight.

`--lang` given → emit a translated copy (prose translated; code identifiers, `file:line`, configured canonical IDs, executor references, and numeric values kept verbatim). `--html` given → follow the Artifact flow to render a self-contained runbook **after** the markdown is approved.

## Step 7 — Compose the Task Block (top of the guide)

**Purpose:** a developer/PO copies this block straight into the work tracker (Jira/ADO/Linear) without re-typing anything. It sits **above** the demo-guide body, immediately under the document title, fenced by `<!-- task:START -->` / `<!-- task:END -->` so it can be selected and copied in one go.

**[BLOCKING] SOURCE IT, NEVER INVENT IT.** Fill every field from evidence already gathered in Steps 1–6:

1. **A governing task / spec / story exists** (the business spec root — default `docs/specs/**`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path — a task or story artifact, a tracker item found in Step 2) → **copy its wording** for requirements, stories, and acceptance criteria; normalize formatting only. Cite the source path in the block header.
2. **No such artifact** → derive from the traced cases and code, and label the block `derived from code + demo cases this session — not yet reviewed by the PO`.
3. **A field has no evidence** → write the explicit negative (`None — no authorization behaviour in this item`), NEVER a plausible filler. An invented acceptance criterion is worse than an absent one: it enters the tracker as a commitment nobody agreed to.

**Mandatory fields (all present; an inapplicable one states why):**

| Field | Content | Sourced from |
| --- | --- | --- |
| **Title + type** | One-line item title · `Feature \| Enhancement \| Bug \| Tech` | Resolved scope (Step 0.1) |
| **Purpose / business value** | Why the item exists, for whom, and the outcome it buys — 2–4 sentences, no implementation detail | Spec/task, or Step 1 bar Q1 (before → after) |
| **Overall requirements** | What the item must deliver, as a short numbered list, plus explicit **In scope** / **Out of scope** lines | Spec/task, Step 3 story→case map |
| **User stories (ALL)** | Every main story in scope, `As a {role}, I want {capability} so that {value}` — the same stories the guide demos, none omitted | Step 3 map (one per story group) |
| **Acceptance criteria (ALL)** | Preserve each source AC's canonical ID, wording, and structure. Add local display numbering only when the source has no stable AC ID. For derived criteria, use Given/When/Then only where every clause is supported by evidence. Trace each AC to its demo case, configured canonical case identity, and actual carrier (`AC-{source ID} ↔ {owner}/{scenario}[/{variant}] → {carrier ref}`). Under the strict default, trace to the real `TC-*` ID. | Spec ACs where they exist, else the Step 6 discriminators |
| **Authorization requirements** | Roles/permissions required to exercise the item, tenancy or data-visibility scoping, and any audit obligation — each with `file:line` from a read guard/policy/attribute. No such behaviour → `None — no authorization behaviour in this item` | Code read in Step 4 (guards, policies, role checks) |
| **Estimation** | `Estimate target:` line + `effort_points` + `man_days_traditional` + `man_days_ai` and the supporting frontmatter, per `SYNC:estimation-framework` (inlined below) | Bottom-up over the **estimate target** only — the current changes by default, the target the user names for estimation, or (no change set in scope) the labelled demo scope — never silently the whole feature the guide demos |
| **Dependencies / prerequisites** | Blocking items, migrations, configuration, or external systems — or `None` | Steps 2 and 4 |
| **Definition of Done** | The item's DoD, including the coverage gaps this guide reports as open | Steps 3 and 8 |

**Estimate target — size the change, not the feature.** The guide may demo a whole feature for context, but the estimate covers ONLY the estimate target, resolved by this precedence:

1. **User names an estimate target** — the `--estimate "<target>"` flag, or an explicit estimation instruction in the prompt (e.g. "estimate only story B", "size the whole feature") → estimate exactly that. A demo scope (`feature-or-scope`, `--stories`) named without an estimation instruction is NOT an estimate target.
2. **Default → the current changes only** — the union of branch commits vs the default branch and the staged + unstaged diff (the active task's delta only when git shows no change set), narrowed to the part inside the resolved demo scope. Pre-existing, unchanged feature code is context, never estimated work.
3. **No change set inside the demo scope** (no diff — e.g. demoing already-merged work — or no changed file falls inside the demo scope) → the resolved demo scope (named, or derived in Step 0.1), under its own fallback label. NEVER silently widen beyond it.

Write the resolved target as the first line of the Estimation field — `Estimate target: current changes — {n} files on {diff source}` · `Estimate target: user-named — {target}` · `Estimate target: named scope (no change set) — {scope} ({scope source})`. When the target is narrower than the item the task block describes, add `EP/man-days cover the estimate target only, not the full item above.` `blast_radius` and test count are computed over that target; name the unchanged surrounding feature in `estimate_reasoning` (e), and keep `estimate_scope_included`/`estimate_scope_excluded` as the shared work-category lists.

**Estimation — apply the shared protocol, do not improvise one.** Use `SYNC:estimation-framework` exactly as `/plan`, `/work-item --mode=refine`, `/work-item --mode=story` and `/work-item --mode=dor` apply it:

- **Bottom-up first:** decompose the estimate-target work into phases → hours → `likely_days = ceil(Σ hours / 6) × productivity_factor`; add the risk margin; emit a **min–max range** whenever `likely_days ≥ 3`.
- **Effort points are DERIVED from days, never the driver.** Disagreement > 50% → trust bottom-up and downgrade EP.
- **Emit the full frontmatter** the protocol mandates — `effort_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `risk_margin_pct`, `risk_factors`, `blast_radius`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` — inside a fenced `yaml` block so it survives the copy-paste.
- **State the estimate's nature honestly.** A demo guide is normally written **after** the work is done, so the number is a **retrospective sizing for the task record**, not a forecast; say which it is in one line. When a team-agreed task estimate covers **exactly the estimate target**, **reuse that estimate verbatim** and note any delta against this bottom-up pass instead of silently replacing it — why: overwriting a team-agreed estimate with a private re-derivation corrupts velocity data. When the team-agreed estimate covers a wider item than the target (the whole feature vs this change), cite it as context and do NOT copy it as this target's number.
- Estimate the **target work**, not the demo. Writing this guide is never part of the number.

**Write order:** the task block is composed **after** the cases exist (its ACs and stories are read back from the written blocks) but **prepended** to the file — open the guide's spine in Step 5 with a `<!-- task:START -->` / `<!-- task:END -->` placeholder carrying `pending`, and fill it here from disk. An existing guide may carry this block between `<!-- PBI:START -->` / `<!-- PBI:END -->`: treat it as the same block, replace it in place and write the `task` fence — NEVER prepend a second block. NEVER re-derive stories or ACs from memory.

## Step 8 — Prove (the proof ladder)

Every case sits on exactly one rung. State it per case AND in the quick-reference table.

| Rung                | Means                                                                       | Licence                                                             |
| ------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `✅ ran`            | A configured test/executor or explicitly approved manual-QC carrier was **executed this session** | The ONLY rung that may claim pass. Record the command/procedure and inspected result. |
| `⚠️ trace-verified` | Code read end-to-end, the `file:line` chain is complete, not executed       | Demo it live; say it was not run.                                    |
| `📄 spec-only`      | Asserted by a canonical spec case under the configured profile; the code path was not traced | Weakest rung — say so explicitly.                                    |
| `❌ no coverage`    | Verified that no permitted test/executor or explicitly approved manual-QC carrier is mapped to this case | A reported gap. NEVER filled with a plausible ID.                    |

**There is no fifth rung.** A case you cannot place on one of these four is a **stated blocker**, not a case you quietly promote.

**Proof chain per case** — the `file:line` links a challenger can walk: **where the value is written** → **where it is read** → **where the presenter sees it**. A case whose chain has a missing link cannot sit above `📄 spec-only`.

**Transparency note (mandatory, at the end of the guide):** what was proven this session (tests/executors or approved manual-QC procedures executed, with inspected results), what was not and why (runner blocker, environment, no coverage), and which cases are therefore being shown live rather than via a passing run. NEVER imply a run that did not happen.

## Step 9 — Validate

Before declaring done, verify each — evidence, not assertion:

- **MUST ATTENTION** the resolved scope and its source (prompt / context / user-confirmed) are recorded in the guide header.
- **MUST ATTENTION** the Step 1 comprehension bar was cleared per story group, with `file:line` per answer, and the Understanding Brief is on disk.
- **MUST ATTENTION** every main user story is present with its profile-defined canonical case identities mapped to verified test/executor or explicitly approved manual-QC carriers — **no invented IDs** — and every story with no proving carrier is named as a coverage gap.
- **MUST ATTENTION** every case has all four parts: setup · numbered demo flow · expected result as the discriminator · domain storage/solution.
- **MUST ATTENTION** every case is classified 🖥️ UI or 🔧 technical — **under the no-front-end rung `UI` reads as the rung's primary surface, and the header, case headings and quick-reference table carry that surface name instead** — main-channel cases lead their story and the quick-reference table, technical cases appear ONLY in the closing appendix, and the `{n} 🖥️ · {n} 🔧 technical` split is in the guide header.
- **MUST ATTENTION** no numbered demo step of a UI case requires a terminal, API client, DB console, log tail, or config edit — such a confirmation belongs on the case's `Deeper confirmation (optional, non-UI)` line — never on the proof chain — or the case belongs in the technical appendix.
- **MUST ATTENTION** a story with no UI demo path says so explicitly (`no UI demo path — technical only`) — no invented screen, button, or admin page anywhere in the guide.
- **MUST ATTENTION** every storage/behaviour claim cites `file:line` from a read entity/migration/handler — nothing inferred from a name.
- **MUST ATTENTION** the task block is at the TOP of the guide, fenced by `<!-- task:START -->` / `<!-- task:END -->`, and carries every mandatory field — purpose · overall requirements with in/out of scope · ALL user stories · ALL acceptance criteria with source identities preserved and each traced to its demo case, configured canonical identity, and verified carrier (strict `TC-*` under the default) · authorization requirements or an explicit `None` · estimation · dependencies · DoD.
- **MUST ATTENTION** the task block names its source (governing spec/task path, or `derived from code + demo cases this session`), and **no requirement, story, or acceptance criterion in it is invented** — each traces to a read artifact or a traced case.
- **MUST ATTENTION** the estimate opens with one of the three `Estimate target:` labels and sizes ONLY that target — the current changes by default, the target the user named for estimation, or (no change set in scope) the labelled demo scope — never silently the entire feature; a target narrower than the task item carries the `estimate target only` note.
- **MUST ATTENTION** the estimate carries BOTH `effort_points` and man-days (`man_days_traditional` + `man_days_ai`), was derived **bottom-up per `SYNC:estimation-framework`** with EP derived from days, emits the mandated frontmatter fields inside a fenced `yaml` block, states whether it is a retrospective sizing or a forecast, and reuses an existing team-agreed estimate verbatim only where it covers exactly the estimate target (noting any delta).
- **MUST ATTENTION** every case carries a proof rung and a proof chain; `✅ ran` appears only where the configured command/procedure was executed this session and its inspected result was recorded.
- **MUST ATTENTION** no secret value appears anywhere — settings, files, and account roles named; credentials rendered `<redacted:…>`.
- **MUST ATTENTION** anything deferred, sampled, or dropped is named in the guide header AND the chat summary.
- **MUST ATTENTION** the ledger's `written` rows are verified against the filesystem, and the output landed at the resolved path; translation/HTML produced only if requested.

## Configuration

Resolve everything project-specific from `docs/project-config.json`; an optional block overrides demo-guide defaults:

```json
{
    "demoGuide": {
        "outputDir": "docs/demo-guides",
        "specDir": null,
        "translateDefaultLang": null,
        "storyGranularity": "main"
    }
}
```

**`specDir` is an OVERRIDE, never a default.** Leave it `null` (or omit it) and resolve the spec
root from `getSpecDocsPath()` in `.claude/hooks/lib/project-config-loader.cjs`, which reads
`specRoots.business.path` from `docs/project-config.json` and falls back to `docs/specs/`. Set
`specDir` only to point this skill at a spec tree that differs from the project's business spec
root. When you hand any spec path to a sub-agent, pass the RESOLVED value — a leaf agent inherits
knowledge only from its own definition and cannot correct a stale root it was given.

Block or file absent → degrade gracefully: default `outputDir` to the project's docs/demo dir if one exists, else a temp file; discover spec/test/source locations from the project-reference docs; and **state the fallbacks you used**.

## Integration with Other Skills

- **`/understand`** — reuse its Purpose→How→Why framing for the "how the domain solves the feature" explanation. ⚠️ **Boundary — decide by audience, not by overlap:** `/understand` §11 *Test & Demo* is **reviewer-facing** — how to run and see the change you are about to review, scoped to that change. This skill is **presenter-facing** — a standalone, stakeholder-ready script that walks a room through a whole feature. The per-case block is deliberately the same shape in both so they converge instead of drifting; showing finished work to people → here, preparing to review it → `/understand`.
- **`/investigate`** / **`/investigate --mode=debug`** / **`/graph-code --mode=trace`** — the Step 1 gate's read-only gather delegates. Their output is INPUT, re-verified at `file:line`; they never author a case block.
- **`/spec`** — the canonical source of stories, requirements, acceptance criteria, and scenario identities under the project's configured profile. The demo guide is a derived presentation view: preserve canonical owner/IDs and wording, then map each presentation case to the profile-defined scenario identity and actual carrier(s), following documented cardinality. Test names and guide-local labels are not spec IDs; never create a parallel case registry. Where no native contract exists in config or required references, retain the strict `TC-*`/Section 8 default and its one-TC-to-many-tests mapping. **M7 still governs business-tree contents:** every canonical business scenario must express a user/QC-demoable business outcome on a real supported surface; architecture-only mechanics do not become business cases merely because tests execute them. If no surface exposes a business outcome, report the M7 issue. An outcome reachable only through an API/CLI or another technical channel may still pass M7 and belongs in this guide's technical appendix; the job firing or handler invocation alone is not the outcome. Evaluate M7 by intended business result, not executor surface, and never invent a screen to hide a missing demo path.
- **`/work-item --mode=refine`** / **`/work-item --mode=story`** / **`/work-item --mode=dor`** — the owners of the task artifact itself. The Step 7 block is a **tracker-ready summary of an item this guide demos**, sized with the SAME `SYNC:estimation-framework` protocol so the two cannot drift; when one of those skills has already produced the task, **copy its wording** rather than re-author it, and never overwrite its team-agreed estimate — reuse that estimate as the number only when it covers exactly the estimate target (Step 7).
- **`/plan`** — the canonical consumer of `SYNC:estimation-framework`; if a plan for this item exists, reuse only the bottom-up phase hours that fall inside the estimate target instead of re-deriving them.
- **`/release-doc`** — sibling generator; `demo-guide` is presenter-facing (how to show it), it is change-facing (what changed).
- **`/commit`** — commit the generated guide when the user wants it version-controlled.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — one per story group (understand → trace → write) so a long feature can't overflow context. Persist the Understanding Brief and the story→case map early; NEVER hold them only in memory.

**IMPORTANT MANDATORY Steps:** resolve-scope-load-contract-size-and-create-todos-first -> understand-the-feature-blocking-gate-six-question-bar -> gather-five-inventories-with-ladders -> map-stories-to-real-case-ids-and-classify-ui-vs-technical-channel -> trace-domain-storage-and-solution -> open-guide-and-ledger-accumulate-story-by-story -> write-each-case-four-parts -> compose-the-task-block-at-the-top -> place-every-case-on-the-proof-ladder -> validate

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.**

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `estimation-framework` — Bottom-up estimation with derived effort points and a min-max range; estimating effort → .claude/skills/shared/protocols/estimation-framework.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `graph-assisted-investigation` — Optional hint: a code-graph query can add callers and dependents when grep may miss a high-risk blast radius, and it can be stale; a high-risk change where grep and reading alone may miss the blast radius → .claude/skills/shared/protocols/graph-assisted-investigation.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `output-quality-principles` — Readable guidance and verified contents for long skill/doc files; writing, updating or auditing a skill or reference document, or another Markdown artifact over 200 lines → .claude/skills/shared/protocols/output-quality-principles.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** for code work, read the target and relevant conventions before planning or editing; seek 3+ fitting examples when available and record fewer/none. Do not impose code discovery on work with no code surface. The code graph is optional, stale-able advice for high-risk impact, never a requirement.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**Optional advice:** the code graph (`.code-graph/graph.db`) can hint at a high-risk blast radius grep misses; it can be stale, so verify by reading files. Never required.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** lead with useful guidance and readable priorities; preserve action-changing conditions/numbers and required structures. When writing, updating or auditing Markdown skill/doc content, verify top, heading-linked contents over 200 lines (stricter owner thresholds remain); refresh after edits and report gaps in read-only audits. Remove report bulk; judge semantic value rather than word counts.

<!-- /SYNC:output-quality-principles:reminder -->

<!-- SYNC:estimation-framework:reminder -->

- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); EP DERIVED. UI cost usually dominates — bump EP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `effort_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap EP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. EP 13 SHOULD split, EP 21 MUST split.

<!-- /SYNC:estimation-framework:reminder -->


## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Investigate an in-scope feature end-to-end, then produce a stakeholder-ready, proof-carrying demo guide with real stories and profile-defined canonical identities linked to actual test/executor or approved manual-QC evidence, runnable user flows, domain storage/solution, and honest proof levels — UI-first, with technical cases in the closing appendix — so presenters can show behaviour, explain its data, and never claim unearned proof.

**IMPORTANT MUST ATTENTION** Main order: resolve scope → load output + configured spec contract → size/decompose → create todos → clear six-question gate + write Understanding Brief → gather five inventories → map/persist profile-defined identities to actual carriers + classify channels → trace storage/solution → open guide + ledger and accumulate → write four-part cases → compose the sourced task block at the top (estimate per `SYNC:estimation-framework`) → assign proof rungs + transparency → validate. Preserve the [BLOCKING] understanding and UI-first channel gates.

**IMPORTANT MUST ATTENTION** Modes/flags: `feature-or-scope`, `--context`, `--output`, `--lang`, `--html`, `--stories`, `--estimate`; only `--estimate` or an explicit estimation instruction names the estimate target; `--lang` translates, `--html` follows the post-approval Artifact flow, and no-front-end projects state a primary demo surface.

- **MUST ATTENTION** clear the six-question Understanding Brief with cited answers for each story group before scripting. Resolve scope prompt → context → ASK, size/decompose before deep reads, and scale through more complete groups. Delegates gather read-only input; re-verify their claims, and at S3+ delegate inside the group agent.
- **MUST ATTENTION** preserve canonical owner/scenario/variant identities, source AC wording and declared carrier cardinality. Never invent IDs, click paths, reachable state, permissions or proof. Every case keeps setup, numbered flow, old-behaviour discriminator and cited storage/solution; display-only cases state no storage change and explain representation.
- **MUST ATTENTION** main cases use the real front-end; technical cases retain full rigor in the closing appendix. Resolve the no-front-end primary-surface rung first and apply it throughout. Optional DB/log confirmation is its own non-numbered line, never the proof chain. Declare the channel split and a missing main-surface path rather than inventing one.
- **MUST ATTENTION** use the four proof rungs and written → read → seen chain. `✅ ran` requires a configured or approved carrier executed this session with inspected results; an unplaceable case is blocked. Keep the transparency note and coverage gaps explicit.
- **MUST ATTENTION** open guide + ledger before case one, append each group's main and appendix cases, and verify both locations on resume. Compose the top fenced task from written blocks and sourced artifacts; include every mandatory field. Estimate only the Step7 target under the shared protocol, with full frontmatter and retrospective/forecast label; reuse a team-agreed estimate only for an exact target match.
- **MUST ATTENTION** discover project paths/commands and state fallbacks. Write the shareable deliverable to its configured directory; redact secrets on collection, not afterward. Name every deferred/sampled/dropped item in both header and chat. Validate identity mappings, AC/story coverage, proof claims and ledger against source artifacts before completion.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| --- | --- |
| "The suite was green earlier" | This-session inspected execution alone earns `✅ ran`. |
| "No front-end, so everything is appendix" | Declare the primary surface; it replaces front-end in channel classification. |
| "The demo scope is the estimate target" | Use the Step7 precedence; unchanged context is not estimated work. |
| "The delegate says the group is written" | Verify its main and appendix blocks on disk. |
| "A plausible ID or click path is enough" | Cite the actual identity/path or record a blocker. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
