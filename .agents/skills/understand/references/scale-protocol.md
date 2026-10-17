# Scale Protocol — sizing, understanding groups, task breakdown, accumulation

> Loaded at SKILL.md Step 0.5, **only when the sized tier is S2 or larger**. S0/S1 runs never pay for this file — one group, append per section, done.

**S2 gather agents receive no fragment path.** They return bounded evidence to the orchestrator, which alone authors the combined report; fragment/shard ownership starts at S3+.
>
> This file answers the four questions a big target makes unavoidable: **what is one group**, **what order do the groups go in**, **what tasks exist before the first deep read**, and **how does the ONE report file accumulate so a run that dies mid-way still leaves finished work on disk**.
>
> **The deliverable is a single combined markdown file at every tier and every group count.** Scale changes how many groups exist and how the work is dispatched — never how many files come out.
>
> **The tier table lives in `SKILL.md` Step 0.4 and NOWHERE else.** This file starts from an already-announced tier. — why: two copies of a threshold table drift, and the tier decides the shape of everything below.

**The invariant this whole file exists to protect:** a bigger target buys **MORE GROUPS**, never **FEWER SECTIONS**. Scope flexes; the report contract does not.

---

## Contents

- [1. What counts as one understanding group](#1-what-counts-as-one-understanding-group)
- [2. Group order — contract-inward at group altitude](#2-group-order--contract-inward-at-group-altitude)
- [3. Task breakdown — BLOCKING, before the first deep read](#3-task-breakdown--blocking-before-the-first-deep-read)
- [4. Accumulation — the report grows on disk, never in context](#4-accumulation--the-report-grows-on-disk-never-in-context)
- [5. Resumability — what to do after a cutoff, compaction, or resume](#5-resumability--what-to-do-after-a-cutoff-compaction-or-resume)
- [6. Sub-agent fan-out (tier S3+)](#6-sub-agent-fan-out-tier-s3)
- [7. Split triggers and the truncation rule](#7-split-triggers-and-the-truncation-rule)
- [8. Degradation ladder](#8-degradation-ladder)

## 1. What counts as one understanding group

A group is an **explainable unit**: something whose §1–§13 can be answered *about that unit alone*, by a reader who has read the spine and nothing else. If a candidate group cannot carry its own "what was done / how it works / why this shape / how to test it", it is not a group — it is a fragment of one.

**Three tests, all must pass:**

| Test | Passes when | Fails when |
| --- | --- | --- |
| **Cohesion** | One sentence names what the group is *for* without "and" | The name is a list of unrelated things |
| **Answerability** | §1, §6, §7, §11 are answerable inside the group | Half the answer lives in another group |
| **Size** | ≤ 8 files **OR** ≤ 2000 diff-lines, whichever hits first | Either cap is exceeded → split |

The size caps are the framework's existing map-reduce caps (`SYNC:systematic-review-batching`), **adopted deliberately** so `understand` and the review skills never partition the same target two different ways. — why: a reader who runs both skills on one change should meet the same boundaries twice, not two competing maps.

### Decomposition axis — walk the ladder, stop at the first rung yielding ≥2 cohesive groups

1. **Bounded context / service / module** — `docs/project-config.json` → `modules` (or the repo's own top-level boundaries). Strongest: the boundary is already the team's.
2. **User-facing capability / story cluster** — one group = one story (or one tight family) plus every layer that serves it. Best for a feature-shaped target; makes §3 fall out for free.
3. **End-to-end flow** — entry point → handler → persistence → response, one group per flow. Best when capabilities overlap heavily.
4. **Layer slice** — contracts · domain · application · persistence · integration · UI. Use **only** for a horizontal sweep (a rename, a signature change, a cross-cutting policy) where every other axis produces one group.
5. **Directory / package** — last resort. Label the grouping *"structural grouping — not a conceptual boundary"* in the spine. — why: an unlabelled structural split reads as a domain claim the code does not make.

**Record which rung you landed on, in the spine.** The reader calibrates on it exactly as they calibrate on a grep-derived route.

### Group record — the fields every group carries in the spine ledger

| Field | Rule |
| --- | --- |
| **ID** | `G1…Gn`, stable for the whole run — the tasks, the block headings and anchors, and the group map all key off it |
| **Name** | What the group is *about*, in domain words — never a path, never a layer number |
| **Scope** | The explicit path/file list (or the diff subset). No wildcards a reader cannot expand |
| **Why one unit** | The cohesion sentence — the one that has no "and" in it |
| **Depends on** | The groups whose contracts this one consumes (`—` when none). Drives the group order below |
| **Anchor** | `#g{n}-{slug}` — the group's heading anchor in the report file, filled the moment the block is appended |
| **Fragment** | *S3+ fan-out only* — the git-ignored scratch path the group's sub-agent writes (`tmp/understand/fragments/{run-slug}/G{n}.md`). **Never the deliverable**, never linked, never the answer to "where is the report" |
| **Status** | `pending` → `in progress` → `written` — mirrors the task, never replaces it |
| **Takeaway** | One line, written when the block lands. The spine is readable from this column alone |

---

## 2. Group order — contract-inward at group altitude

Same principle as `references/review-path.md`, one level up: **meaning before mechanism.**

1. **Seed:** the group that owns the contract or the domain invariant the other groups consume.
2. **Then dependencies before dependents** — a group is read after every group it depends on.
3. **Cycles:** break at the weakest edge and say so in one line — *"G3 ⇄ G5 are mutually dependent; read G3 first because it owns the persisted shape."* — why: silently linearising a cycle hides the coupling that is often the most important thing in the report.
4. **Tie-break peers by blast radius, descending** — the same tie-break `references/review-path.md` adopts inside a stage.
5. **Ungrouped remainder** (config, generated, lockfiles, boilerplate) collapses into ONE final skim group. Never distributed.

This order governs **three** things at once: the task order, the write order, and the spine's §4 group route. They never disagree — one derivation, three consumers.

---

## 3. Task breakdown — BLOCKING, before the first deep read

> **MUST ATTENTION** create the tasks BEFORE gathering, not after. — why: the gather step is where a long run dies; a task list built afterwards records nothing about where it stopped.

1. **the current task list FIRST.** An interrupted or compacted run resumes its existing tasks — never duplicates them. Matching tasks already present → resume at the first non-`completed` one.
2. **Create the fixed spine tasks + one task per group:**

    | Task | Subject shape | Completed when |
    | --- | --- | --- |
    | Size & decompose | `understand — size target & decompose into groups` | Tier + group registry announced |
    | Scope-wide gather | `understand — gather scope-wide material` | The shared inventories exist (concepts, contracts, project-config, run commands) |
    | Open the report | `understand — open report + ledger` | The report file exists on disk, carrying the spine region and the ledger |
    | **Per group ×N** | `understand — G{n} {group name}` | **That group's block is APPENDED TO THE REPORT FILE** — evidence is its `# G{n}` heading in that file plus the sections beneath it, never a summary in context |
    | Cross-group synthesis | `understand — cross-group synthesis` | Spine's scope-wide sections filled, group map rendered |
    | Close | `understand — chat summary + index` | Summary posted, index line appended (or its blocker stated) |
    | Self-check | `understand — contract self-check` | Every ⚠ drop-risk section verified per group and on the spine |

3. **Exactly one `in_progress`.** Transition it before the work and `completed` immediately after the evidence is on disk — never batch transitions. — why: a batched transition is indistinguishable from a run that skipped the work.
4. **A group task NEVER completes on a summary.** The evidence is the block in the report file. A group "explained in context but not written" is an unfinished task, because the context is the thing about to be lost.
5. **No Task tool available** → maintain the identical list as a written tracker in the spine's ledger, with the same one-at-a-time transitions. The discipline is the deliverable, not the tool.
6. **S0/S1 still gets tasks** — one per report part (I · II · III · IV). — why: a run that dies mid-report must show the reader where it stopped, at every size.

---

## 4. Accumulation — the report grows on disk, never in context

**Write order is fixed:**

**Everything below happens inside ONE file** — the report is a single combined markdown file at every tier and every group count. "Spine" names the **header region at the top of that file**, not a separate document.

1. **Spine region first, before any group work.** It carries the header, the resolved scope + tier, the group ledger (all rows `pending`), a `## 0. Detailed Summary` stub, and **stub headings** for the scope-wide sections. — why: §0 and the scope-wide sections belong at the TOP but can only be *written* at the end; reserving them keeps the file readable at every intermediate moment.
2. **Then group by group, in the §2 order:** investigate → analyze → **append that group's block into the same file** → update its ledger row (`written` + takeaway + anchor) → complete the task. One group entirely finished before the next starts.
3. **Then §0 and the scope-wide sections**, filled into their reserved stubs by editing the file — the group blocks are already written **in it** and are what you synthesize *from*, never memory.
4. **Then the chat summary + index line.**

**Never hold more than the current group in context.** A finished block is read back from disk if it is needed again. — why: the whole point of grouping is that no single context ever has to hold the whole target.

**Ledger is the source of truth for progress**, not the conversation. A row says `written` only when its `# G{n}` heading is present in the report file with its sections beneath it.

**Layout, spine skeleton, group-block skeleton, and the >12-group nesting rule are owned by `references/report-template.md` ("Scaled report layout").** Read them there; do not improvise a second layout, and never split the file for size — size is what §0, the ledger, and the anchors are for.

---

## 5. Resumability — what to do after a cutoff, compaction, or resume

> **MUST ATTENTION** every "already done" claim from before the interruption is an untested hypothesis until the disk confirms it.

1. the current task list → find the first non-`completed` task.
2. Read the spine's ledger.
3. **Verify each `written` row against what is actually on disk**, in two stages:
    1. **In the report file:** the row's `# G{n}` heading is present AND carries its sections. A row claiming `written` with no heading (or a block truncated mid-section) is reset to `pending`. — why: a sub-agent or a run can die between the write and the ledger update, in either order.
    2. **At S3+, before re-running any reset group:** check its `Fragment` path. A **complete** fragment that never got concatenated is appended into the report and its row set to `written` — never re-derived. An incomplete fragment is discarded and the group re-runs. — why: re-deriving a block that already exists on disk pays the most expensive cost in the run twice.
4. Re-read the contracts (`report-template` · `diagram-catalog` · `review-path` · this file) before writing again — context loss wipes them.
5. Continue at the first unfinished group. **NEVER restart finished groups** and never re-derive a finished block from memory.

---

## 6. Sub-agent fan-out (tier S3+)

At S3+ one context cannot hold the target. Dispatch **one sub-agent per group**, and spawn **every member of a wave in ONE message** — never one agent per turn. Group agents share no write target (each owns its own fragment), so the entire group set is ONE wave, bounded only by the host's concurrency; when the set exceeds that bound, split it into consecutive waves and barrier between them rather than dripping agents out one at a time.

**Declare before the first spawn** — `Parallel plan: wave 1 = [G1…G8] · wave 2 = [G9…G12] · SEQ = [synthesis, spine, self-check]` — then advance only after EVERY member of the wave returns. A group correctly never spawned (empty after decomposition, out of resolved scope) counts as returned; never hold a wave open for it. — why: an undeclared wave silently degrades into the sequential run it was meant to replace, and nothing in the output shows that it did.

### 6.1 Axis fan-out — MORE THAN ONE agent for ONE oversized group

A group that sits at or above the size guard (> 8 files or > 2000 diff-lines) **and that the decomposition axis could not split further** — a genuinely cohesive but large unit — gets **multiple agents**, split by **gather axis, never by file**. The Step 1 inventories are mutually blind and read-only, so they parallelize cleanly, and each one is exactly the kind of pass that a single agent covering the whole group does thinnest.

- **Split by axis, not by file.** Two agents each holding half a group's files each see half a mechanism and both report it confidently. Two agents holding all the files but different questions see the whole mechanism twice, from angles that do not overlap. — why: file-splitting a cohesive group manufactures the exact partial-view failure the group tests exist to prevent.
- **Each axis agent writes its OWN shard** — `tmp/understand/fragments/{run-slug}/G{n}.{axis}.md`, created FIRST and appended per section, exactly as a whole-group fragment. **Never a shared fragment path:** N appenders to one file is the same lost-update race that §6 forbids for the report, one directory down.
- **The ORCHESTRATOR spawns axis agents — a group agent NEVER spawns its own.** Fan-out stays one level deep; an agent that re-partitions its own brief re-decides a split the orchestrator already made, with less information than the orchestrator had. — why: nested fan-out is unbounded in principle and invisible in the wave declaration, so the barrier stops meaning what it says.
- **Merge shards in SECTION order, not completion order**, into one `# G{n}` block before it enters the report — the same rule §6 applies to fragments, one level down. Verify every shard on disk first; a missing shard is a re-run, never a silently shortened block.
- **Cap: ≤ 3 axis agents per group**, and axis fan-out applies only to groups that actually breach the size guard — a normal group stays one agent. When the cap bites, say which axes were folded together, per the no-silent-truncation rule.

**Each sub-agent's prompt MUST carry, verbatim:**

- The group record (ID, name, explicit file list, cohesion sentence, depends-on).
- **Its FRAGMENT path (`tmp/understand/fragments/{run-slug}/G{n}.md`), and the instruction to CREATE that fragment file FIRST and append per section** — the write is the first deliverable, not the last. — why: long sub-agents hit their budget before a final batched write, and the findings die with them.
- The instruction to read `references/report-template.md`, `references/diagram-catalog.md`, and `references/review-path.md` from disk before writing — the section shape, the mandatory diagram set, and the eight-field stage rule are not summarizable.
- The anti-hallucination rules verbatim: **REAL `TC-*`$test IDs only**, derived diagrams only (solid = traced, dashed = inferred and named, fabricated = failed section), `file:line` on every concrete claim, `[deliberated]` vs `[reconstructed]` labels, `<redacted:…>` for every secret.
- **Read-only:** the sub-agent writes its fragment and nothing else. No source, plan, doc, tracked path — and **not the report file** — ever. The fragment path must be verified git-ignored (`git check-ignore`) before the first write, exactly as `SKILL.md` Step 3 requires of the report, and the `<redacted:…>` rule binds a fragment exactly as it binds the report: a secret in a scratch file is still a secret on disk.
- The return contract: **a summary plus the fragment path**, never the block body. ≤10 lines: what the group is, its start-here file, its weakest link, its coverage gaps, its blockers. — this bounds the sub-agent's **message**, not the report; the block itself is uncapped.

**EXACTLY ONE PROCESS EVER WRITES THE REPORT FILE — the orchestrator.** Sub-agents write fragments only, and never the deliverable, at any tier. — why: N concurrent appenders to one path is a lost-update race with no lock available; the second writer silently clobbers the first, and the missing block reads as a group that was never explained.

**Then the orchestrator VERIFIES, THEN CONCATENATES** — for every returned group, in this order:

1. **Verify the fragment:** it exists; its ⚠ drop-risk sections are present and substantive; its cited `TC-*` IDs actually exist (spot-check by grep). A returned summary is evidence of a *reply*, never evidence of a *block*. — why: an agent that died after its summary and before its last section leaves a plausible report with a hole in it, and only the disk shows which.
2. **Append verified fragments into the report IN GROUP ORDER — never completion order.** The §2 order already governs the task order, the write order, and the spine's §4 group route; concatenation is its fourth consumer, so the file reads the same way whichever agent finished first. — why: ordering by completion introduces a second, non-deterministic order and breaks the promise §4's route makes to the reader.
3. **Update each ledger row to `written` as its block lands** — not when its agent returned. A fragment that fails verification is **re-run, never concatenated**, and its row stays `pending` until a good block lands.

Fragments are scratch: namespaced per run, safe to delete once the report is complete, and never required after it. They are never presented, never linked, and never the answer to *"where is the report"*.

**No sub-agents available** (host, permission, or user preference) → run the identical protocol sequentially inline, same caps, same order, same per-group write — **skipping fragments entirely and appending each block straight into the report**, since a single sequential writer has no race to avoid. Slower, never weaker. Say once that fan-out was unavailable.

---

## 7. Split triggers and the truncation rule

> **Every row below ADDS structure when exceeded — none of them caps what the report says.** `references/report-template.md` → *Caps vs split triggers* owns the distinction. Deleting a row here removes the structure that makes a large target readable; it does not remove a cap.

| Guard | Rule |
| --- | --- |
| Group size | ≤ 8 files OR ≤ 2000 diff-lines → split beyond |
| Groups per level | ≤ 12 → beyond that, **nest in the same file**: a `# Context — {name}` heading per bounded context, that context's groups beneath it, ledger nested one level. Never a second file |

> **[NO SILENT TRUNCATION]** If any cap, budget, or interruption means part of the resolved scope was **sampled, deferred, or dropped**, say so explicitly in the spine AND in the chat summary — *"G7–G9 (integration layer, 22 files) deferred — not covered by this report."* Bounded coverage that reads as complete coverage is the single most damaging failure this protocol can produce: the reader retires a risk nobody examined. — why: an admitted gap is a finding; a hidden gap is a lie with a report's authority.

---

## 8. Degradation ladder

Every rung is a **stated** degradation — the report is still owed in full, only the elaboration is lost.

| Missing | Degrade to | Say |
| --- | --- | --- |
| `docs/project-config.json` modules | Capability or flow axis (rung 2/3) | *"No module map — grouped by capability."* |
| Graph (`.code-graph/graph.db`) | Grep of imports/references for dependencies and group edges | *"Group edges derived by grep, not trace — dependency order is approximate."* |
| Task tool | Written tracker in the ledger | *"Task tool unavailable — tracking in the ledger."* |
| Sub-agents | Sequential inline, same caps | *"Fan-out unavailable — groups explained sequentially."* |
| Fragment directory not writable (or not git-ignored) | Sequential inline, same caps — blocks appended straight into the report | *"Scratch unavailable — groups explained sequentially into the report."* |
| Git-ignored write directory | Chat delivery per `SKILL.md` Step 3 — spine first, then each group block in order, as they are produced | *"No git-ignored working directory — delivering the report in chat, group by group."* |

---

**MUST ATTENTION** size before you read · decompose into explainable groups · create the tasks before the first deep read · open the ONE report file before the first section · one group at a time, appended on disk · exactly one writer of that file · verify every claimed block against its heading in it · announce anything dropped. A bigger target buys MORE GROUPS, never FEWER SECTIONS — and never more files.
