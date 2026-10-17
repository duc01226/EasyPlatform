---
name: understand
version: 5.1.0
description: '[Process] Use when a developer needs to understand and judge scoped work: a change set, subsystem, decision, plan or concept — flow, rationale, trade-offs, testing. Bugs: investigate --mode=debug; one feature''s code flow: investigate.'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Teach developers enough about scoped work to review it, judge its design, and change it safely.

**Summary:** Explain the prompt's target through evidence, diagrams, a reading route, alternatives, and verification. Resolve scope/contracts → size and create tasks → gather → order → open the report → teach and synthesize → summarize and close. Larger targets add groups; every run retains the full report contract.

**Workflow:** Execute Steps 0–5 below in order; load scale detail only at S2+.

**Key Rules:**

- Deliver §0–§13, mandatory diagrams, and review stages in ONE file at every tier, plus a chat executive summary. No light mode or section opt-out.
- Read-only on code, plans, and docs; write only git-ignored working artifacts. Never write any git-tracked path or reproduce secret values.
- Ground concrete claims in evidence; label inference, reconstructed alternatives, and unexecuted checks honestly.
- Teach and close: no quiz, teach-back, waiting for answers, findings verdict, or comprehension gate.

**Invocation:** Standalone only: workflows and wrap-up skills do not invoke `/understand`. Explain current context with bare `/understand`, or exactly the target named by the user. This prepares a human review; `/changes-review` and `/code-quality-review` perform it. `/demo-guide` owns presenter-facing demonstrations.

## Contents

- [Quick Summary](#quick-summary)
- [Step 0 — Resolve Scope and Plan the Report (do this first, cheaply)](#step-0--resolve-scope-and-plan-the-report-do-this-first-cheaply)
- [Step 1 — Gather the Material](#step-1--gather-the-material)
- [Step 2 — Order the Material](#step-2--order-the-material)
- [Step 3 — Open the Teaching Report](#step-3--open-the-teaching-report)
- [Step 4 — Teach, Coach & Route: the Report (the deliverable)](#step-4--teach-coach--route-the-report-the-deliverable)
- [Step 5 — Summarize in Chat & Close](#step-5--summarize-in-chat--close)
- [Closing Reminders](#closing-reminders)

## Step 0 — Resolve Scope and Plan the Report (do this first, cheaply)

1. **Resolve scope.** A named target selects its diff, plan, code path, decision, concept, or defect. Bare `/understand` selects current tasks, working-tree changes including untracked files, and an active plan/latest `/watzup` summary if present. On ambiguity, infer the most likely target, state the assumption, and proceed without asking. Announce `Explaining: {scope}`.

2. **Load the three contracts before gathering.** Their output requirements determine the evidence to collect:
   - Read `references/report-template.md` for the full report, options/provenance formats, target-form variants, level tuning, and self-check.
   - Read `references/diagram-catalog.md` for mandatory diagrams, evidence derivation, provenance, and missing-source blockers.
   - Read `references/review-path.md` for layer classification, ordering, context inclusion, and all eight fields per stage.

   Missing reference → name it and the lost detail, then use this entrypoint's inline contracts. Still deliver every section; an unavailable source produces a stated blocker rather than a silent omission.

3. **Size the target BEFORE you read it (cheap signals only — this step costs seconds).** Count, do not estimate: in-scope **files** (`git diff --name-only` + untracked, or a glob of the named area), distinct user-facing **capabilities/flows**, distinct **modules / bounded contexts** (`docs/project-config.json` → modules), and **changed lines** where a diff exists. Read the tier off the table — **first row whose trigger matches, top-down, highest tier first** (promote before dispatch if subsequent decomposition exceeds the selected tier; a point request does not override measured scale) — and announce it in one line (`Scope: S3 · Large — 63 files, 9 capabilities, 4 modules → 8 groups`).

   | Tier | Trigger (first match wins) | Understanding groups | Report shape | How the work runs |
   | --- | --- | --- | --- | --- |
   | **S4 · Program** | Whole repo · multi-service · "explain the project" | Grouped per context, nested | One file | Group agents in waves → context synthesizers → spine |
   | **S3 · Large** | > 40 files **OR** > 6 groups | 6–12 | One file | One sub-agent per group, **every group spawned in ONE wave**, front-loaded fragment writes |
   | **S2 · Multi** | ≥ 10 files **OR** ≥ 2 capabilities/flows/contexts | 2–6 | One file | **Gather fans out** — one read-only gather agent per group, all in ONE wave; orchestrator authors inline from the returns |
   | **S0 · Point** | One file, one decision, one concept, one error | 1 | One file | Inline, section by section |
   | **S1 · Small** | < 10 in-scope files, one capability | 1 | One file | Inline, section by section |

   These thresholds align with the framework's review batching ladder. Tier changes grouping and dispatch, never sections, diagrams, or review stages.

4. **Decompose and create tasks before deep reading.** S0/S1 has one group. At S2+, split into independently explainable groups: each owns answers to §1–§13, has a purpose name without "and", and splits when either ≤8 files / ≤2000 diff-lines bound is exceeded. Walk module/context → capability/story cluster → end-to-end flow → layer slice (horizontal sweeps only) → directory (label "structural grouping — not a conceptual boundary"). Record the chosen rung; continue splitting while smaller units remain cohesive. Nest beyond 12 groups per level in the same file.

   Resume existing tasks first. Create size/decompose, scope-wide gather, open report/ledger, one task per group, synthesis, chat/index, and final contract self-check; S0/S1 additionally tracks report Parts I–IV. Keep exactly one `in_progress`, update before work, and complete immediately after evidence. A group completes only when its full block is appended to the report. Without Task tools, maintain an equivalent written tracker.

   At S2+, declare PAR/SEQ waves and dependencies before dispatch. Scope-wide gather and opening the skeleton are independent; synthesis, summary, and self-check depend on completed blocks. **S2 never assigns fragment ownership:** dispatch read-only gather agents per group in one wave; the orchestrator authors the report. S3+ group agents own disjoint fragments; dispatch together up to host concurrency and wait for every return before advancing. The orchestrator alone writes the combined report. An indivisible oversized group may use ≤3 orchestrator-dispatched gather-axis agents with separate shards, never file splits or nested fan-out.

   **At S2+, read `references/scale-protocol.md` now, before gathering.** It owns group records/order, tasks, accumulation, resume checks, fan-out prompts, shard verification, and split/degradation rules. Missing reference → announce it and follow these inline rules. Unavailable agents or ignored scratch → explain sequentially into the same report, preserving caps, order, and coverage.

## Step 1 — Gather the Material

Gather only the resolved scope. Current context uses active tasks, `git diff --name-only`, untracked paths (`git ls-files --others --exclude-standard`), and existing plan/`watzup` context. Plans use `plan.md` and phase files; subsystems use entry points and their call chains; decisions use relevant code, comments, blame, and recorded alternatives.

Resolve project config and its reference-doc routes for source/spec/test roots, modules, ADRs, and commands; do not impose framework paths on the target project. Record the evidence rung used when an input is absent. Graph trace is optional and may be stale: verify it with reads/grep. Python commands use `py -3` on Windows, `python3` on macOS/Linux.

**Read-only gathering delegates:** try reads/grep/trace first. When an inventory remains incomplete, announce and record the delegate and reason: `/investigate` for locating files or mechanics, `/investigate --mode=debug` for a live defect, `/graph-code --mode=trace` or `--mode=blast-radius` for reach, `/spec [mode=index]` for spec ownership. Never invoke a mutating or findings-emitting skill. Delegated gathering is input, not a finished teaching section; re-verify concrete claims and personally read every cited test ID. At S3+, these investigations belong inside the group agent; scale fragments follow Step 0's separate ownership rules.

Collect six inventories for each group:

| Inventory | Evidence and fallback |
| --- | --- |
| **Diagram sources → §2** | Components from callers/imports; domain model from an existing spec ERD (reuse verbatim), then entity fields, then schema/migrations; sequence from entry/handler chains. Lifecycle field/enum/guard triggers state diagrams. Trace → grep/read → spec/plan → stated blocker; never invent a node or edge. |
| **Stories and cases → §3/§11** | Main capabilities, protected rules, enforcement `file:line`, and real spec IDs/test names. Reconcile the union of spec and test cases; name uncovered stories. Specs → tests → tasks/release/commit notes → diff. Never invent a case ID. |
| **Review classification → §4** | Classify files using `references/review-path.md`. Walk one hop outward for invariant owners, satisfied interfaces, inherited contracts, and governing specs/tests. Mark unchanged context. Trace → imports/references; label grep-derived ordering approximate. |
| **Concepts → §5** | Every load-bearing mechanism, with its code evidence; omit decoration, not essential concepts. |
| **Options → §8** | For each significant decision, use recorded plan/ADR/PR/comment alternatives → log/blame and prior implementations → 3+ fitting sibling patterns → supported library approaches → engineering judgment. `[deliberated]` requires evidence it was weighed; otherwise label `[reconstructed]`. |
| **Demo/run evidence → §11** | Resolve commands from config → CI → runner manifests → stated unresolved-command blocker. Find setup/fixtures and trace persisted field/table, its entity/migration owner, and the consuming rule (`file:line` each). Display-only cases say "no storage change" and explain the computed representation. |

**Redact at collection time:** name settings/files rather than values. Commands, diagrams, tables, fragments, report, and chat use `<redacted:…>` for credentials, connection strings, tokens, keys, and customer identifiers.

## Step 2 — Order the Material

Keep two axes separate:

- **Narrative depth (§5–§10):** highest blast radius, future cost to reverse, and surprising decisions first. Verify reach by callers/imports; an optional graph is only a hint. Cover the whole scope, giving boilerplate, generated code, and mechanical edits a brief mention.
- **Review route (§4):** contract/API → domain invariants → application → persistence → integration → UI → tests → one config/generated skim. Blast radius breaks peer ties; dependencies within a stage precede dependents. Read `references/review-path.md` for the exact algorithm and context markers.

At ≥2 groups, order groups contract-inward: shared contract/invariant owner first, dependencies before dependents, peers by blast radius, remainder in one final skim group. Break cycles at the weakest edge and explain why. This order governs tasks, report blocks, and the spine route. Narrative leverage does not replace it.

## Step 3 — Open the Teaching Report

**HARD RULE:** Write only git-ignored working artifacts, never inside `.claude/`, source, `docs/`, or any git-tracked path. Source, plans, and docs remain read-only.

- **Report:** `tmp/reports/understand-{YYMMDD}-{HHmm}-{slug}.md` — ONE combined file at every tier.
- **Index:** `tmp/understand/{branch}-index.md` (or `temp/understand/` when the project already uses `temp/`), append date · scope · report path · takeaway. Replace branch `/` with `-`. Keep `-index`: `/investigate --mode=explain` owns `{branch}.md` with a different format.

**Resolve each artifact independently.** Report candidates: the configured reports/working-artifacts directory if explicitly declared, then `tmp/reports/`; do not repurpose another config key. Index candidates are above. Verify git-ignore status and take the first ignored candidate, creating it if absent. Announce skipped tracked candidates. If none qualifies, deliver the entire report in chat with a missing-ignored-directory blocker; independently skip an unwritable index with its own blocker. Never fall back to a tracked path or withhold teaching.

**Write before section one:** create the report header, scope/tier, §0 stub, and—at ≥2 groups—a spine region with all ledger rows `pending` and reserved scope-wide headings. Read `references/report-template.md` → Scaled report layout for the spine/block skeleton, folding, and >12-group nesting inside the same file.

Append each section as produced. In Step 2's group order: investigate → analyze → append the block → update ledger to `written` with anchor/takeaway → complete task. Only the orchestrator writes this report. S3+ fragments are verified and appended in group order, never completion order. Hold only the current group; read finished blocks from disk when needed. Fill §0 and scope-wide stubs last from written blocks, then summarize and append the index.

**Resume:** inspect tasks and ledger, verify each `written` heading and its substantive sections against disk, reset absent/truncated blocks to `pending`, re-read contracts, and continue the first unfinished group. At S3+, reuse a complete unmerged fragment after verification rather than gathering it again; re-run incomplete fragments. Name anything sampled, deferred, or dropped in both spine and chat.

**HTML on request:** also write self-contained HTML beside the Markdown under the same ignored-artifact boundary. Reuse `.claude/skills/watzup/references/session-report-template.html` styling, inline CSS, no external assets. Open with `node .claude/scripts/open-report.cjs <path>` (CI/headless opens nothing). Markdown remains the deliverable; name both paths in chat.

## Step 4 — Teach, Coach & Route: the Report (the deliverable)

Follow `references/report-template.md` for the skeleton, the options table, the provenance labels, and the self-check; `references/diagram-catalog.md` for §2; `references/review-path.md` for §4. Every section is mandatory for every scope tier. Cite `file:line` for every concrete claim, and state confidence where a claim rests on inference.

The following inline contract also serves as the missing-reference fallback. Write high level first, detail later:

| Part / § | Required content |
| --- | --- |
| §0 Detailed Summary | Purpose, behavior change paragraph, every load-bearing takeaway with evidence/section pointer, §4 start-here verbatim, group table at ≥2 groups, and one action to double-check. Write last from finished sections; add no new claim and duplicate no detailed evidence. No length limit. |
| Part I — Orient · §1 What Was Done | Before → after behavior, location, and—on a change—the pre-existing capability, contract, deliberately unchanged behavior, and context a zero-memory reviewer needs before Stage 1. |
| §2 Visual Map | Component `flowchart`, domain `erDiagram`, `sequenceDiagram` per main flow, story-map wiring §3 rules/tests to §4 stages; lifecycle `stateDiagram-v2` when observable state exists; phase flowchart for plans; group map at ≥2 groups. Solid edges traced; dashed inferred and named below. Derive every node/edge; state a blocker for each underivable diagram. |
| §3 User Stories & Business Rules | Main "As a … I want … so that …" capabilities, protected rule, enforcement `file:line`, user consequence, and real spec/test IDs. Never invent a case ID; report absent coverage. |
| Part II — Route · §4 Review Path | One start-here file and why; stage flowchart with a back-edge; meaningful stages with all eight fields: number, domain name, file group, why now, checks, sourced red flags, exit question, honest time-box. Include necessary unchanged files marked `[context — not changed]`. |
| Part III — Depth · §5 Concepts You Need | Every load-bearing concept: plain definition → why here → code evidence → consequence without it. Teach terms before using them in §6. |
| §6 How It Works | Entry → data flow → decisions → output/persistence, invariant owners, handled and unhandled edges. |
| §7 Why This Solution | Constraints, decisive force, causal reasoning, and why the obvious approach loses. |
| §8 Options Considered | ≥2 alternatives beyond the chosen option or an argued empty option space; specific pros/cons, switch cost, rejection reason, provenance, closest call, flip condition. Real cons on the chosen option too. |
| §9 Trade-offs Accepted | Gains, costs, reversibility, debt, and repayment trigger. |
| §10 Impact & Blast Radius | Changed behavior, upstream/downstream consumers, silent-break risks, tests, unprotected behavior, follow-ups. |
| Part IV — Prove & Push Back · §11 Test & Demo | Verified project commands, setup, then each real case's steps, observable discriminator, storage/computation trace, and proof status. `✅ ran` only when executed this session; otherwise `⚠️ trace-verified`. State what was/was not proven and why. Missing tests → manual demo plus coverage gap. |
| §12 Your Call | If you want X → change `file:line` → effort → risk; cheapest/most expensive reversal, revisit signals, smallest change flipping the choice. |
| §13 Challenge This | Named weakest link, 3–5 written pressure-test questions, three-month pre-mortem, lowest confidence, evidence that would raise it. |

**Target forms:** `references/report-template.md` is the SOLE owner of the target-form contract: registry plus sections, route, and diagram variants. Read its tables for the resolved target; keep no parallel form registry. A different form changes the answer, not the required section. When the target has no story, chosen option, or blast radius, explain why; do not invent evidence or leave an "N/A" stub.

**Scale:** spine owns whole-scope §1, §2 group/system map, §4 group route, cross-cutting §9/§10, §13 challenge, and ledger. Each group carries §1–§13 in its own scope. An identical shared answer may live once in the spine with a one-line pointer in each affected group; an empty heading is dropped content.

**Teach/coaching:** define concepts before use; first principles before jargon, concrete before abstract. Give an analogy or simpler restatement for dense points; explain what breaks when an assumption fails and the cost paid for each gain. Honor follow-up `eli5`/`eli14`/`elii` requests without initiating a quiz.

**Final contract self-check:** inspect every section in the report and each block; explicitly verify substantive §0, §2, §3, §4, §5, §8, §11, §12, §13. Placeholders fail. Validate diagram provenance, real IDs, honest proof status, pointers/anchors, and full coverage. Teach enough for the reader to re-derive the design, argue for alternatives, name its weakest link, and review in the right order.

## Step 5 — Summarize in Chat & Close

Always post an executive summary condensed from the finished §0: what changed, §4's start-here file/why, highest-value diagram, key concept, decisive rationale, closest rejected alternative, main trade-off/blast radius, and sharpest written challenge. Name the report path when written (`Teaching report → tmp/reports/understand-{…}.md`); otherwise post the artifact blocker alongside the full chat-delivered report.

At ≥2 groups, include tier/count, first group and its start-here file, its report anchor, and ledger coverage with anything deferred/dropped named explicitly. Keep chat executive-level rather than duplicating each group; redact secrets.

Append the index line only if Step 3 resolved an ignored directory; otherwise report the skipped index once. End without tool questions, quiz, teach-back, wait, loop, or any gate on commit/implementation/workflow progress. Respond naturally to later user follow-ups.

---

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

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


## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Teach developers enough about scoped work to review it, judge its design, and change it safely.

**IMPORTANT MUST ATTENTION Main steps:** resolve scope/contracts → size/decompose/tasks → gather six inventories → order narrative/route/groups → open report/ledger → teach every section and synthesize → chat summary/index → close. Verify the final report contract before handoff.

- Preserve every required section, diagram, and review stage; size adds structure rather than dropping knowledge.
- Verify evidence, real test IDs, option provenance, secrets redaction, and ledger/block consistency. Read-only source; ignored artifacts only.
- Post the executive summary with start-here, report path or blocker, and explicit coverage gaps. Challenges are written; nothing waits on the reader.

| Evasion | Required response |
| --- | --- |
| "Small or code-free target; skip a section" | Answer its question in the target's form, or state the evidence blocker; never leave a stub. |
| "A group repeats the spine" | Point to the shared answer only when identical; silence is a dropped section. |
| "The agent says the block is done" | Inspect the fragment and its real IDs before appending; complete the task only when the block is on disk. |
