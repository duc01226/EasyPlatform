# Understand — Teaching Report Template

> Loaded by `/understand` Step 4. This file is the **canonical shape of the report file**. The skill's in-chat output is a summary of this document; this document is the deliverable the developer keeps, re-reads, and argues with.

**Path:** `tmp/reports/understand-{YYMMDD}-{HHmm}-{slug}.md` — a working artifact, not a tracked doc. Resolve the directory per SKILL.md Step 3: `docs/project-config.json` if it names one, else `tmp/reports/`; if none of those is git-ignored, the report is **delivered in chat** and the blocker reported — never written to a tracked path.

**Audience:** the developer who did NOT write this code (even when they nominally did — AI wrote it). Assume zero memory of the reasoning, full ability to judge it once shown.

---

## Contents

- [The Sections — ALL mandatory](#the-sections--all-mandatory)
- [Target forms — the single-owner contract](#target-forms--the-single-owner-contract)
- [Skeleton](#skeleton)
- [§0 Detailed Summary — the authoring contract](#0-detailed-summary--the-authoring-contract)
- [Caps vs split triggers — the distinction, written down once](#caps-vs-split-triggers--the-distinction-written-down-once)
- [Scaled report layout — ONE file: spine, then a block per group](#scaled-report-layout--one-file-spine-then-a-block-per-group)
- [Level tuning — sections stay, size flexes](#level-tuning--sections-stay-size-flexes)
- [Self-check before writing the file](#self-check-before-writing-the-file)

## The Sections — ALL mandatory

A report missing any **⚠ drop-risk** section below is INCOMPLETE — those are the ones that turn a description into teaching.

| §   | Section              | Answers                                              | Fails when                                                    |
| --- | -------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| 0 ⚠ | Detailed Summary     | If I read only this, what do I now know?              | It is a table of contents, it introduces a claim no section below carries, or it reproduces evidence a section below owns instead of pointing at it |
|     | **Part I — Orient**  | *What is this, and what does it look like?*           |                                                                |
| 1   | What Was Done        | What is this, in developer terms? before → after      | It restates the commit message                                 |
| 2 ⚠ | Visual Map           | What does this system look like?                      | A mandatory diagram is missing, empty, or drawn from expectation instead of evidence |
| 3 ⚠ | User Stories & Business Rules | Who wants this, and what rule protects them?  | Stories are invented, or it cites `TC-*` IDs that do not exist  |
|     | **Part II — Route**  | *Where do I start reading?*                           |                                                                |
| 4 ⚠ | Review Path          | Which files first, then which, and why that order?    | It is a file list — no order, no reason, no exit criterion     |
|     | **Part III — Depth** | *How and why does it actually work?*                  |                                                                |
| 5 ⚠ | Concepts You Need    | What must I know to follow §6?                        | Jargon is used before it is taught                             |
| 6   | How It Works         | What actually executes, in what order?                | It narrates code instead of explaining flow + invariants       |
| 7   | Why This Solution    | What forces made this the answer?                     | "It's cleaner" / "best practice" with no causal chain          |
| 8 ⚠ | Options Considered   | What ELSE could have been done, and what would it cost? | Fewer than 2 real alternatives, or pros/cons are generic    |
| 9   | Trade-offs Accepted  | What did we pay for what we bought?                   | Only upside is listed — a trade-off with no cost is a lie      |
| 10  | Impact & Blast Radius | Who/what else moves because of this?                 | It lists changed files instead of affected behavior            |
|     | **Part IV — Prove & Push Back** | *How do I see it work, and where do I push?* |                                                        |
| 11 ⚠ | Test & Demo         | How do I run it, show it, and know it is right?       | Commands are guessed, case IDs are invented, or proof is claimed without a run |
| 12 ⚠ | Your Call           | What would I change, and how expensive is changing it? | It has no actionable lever                                    |
| 13 ⚠ | Challenge This      | Where is this weakest? What should I push back on?    | It is self-congratulatory, or it asks the reader a real question that blocks |

## Target forms — the single-owner contract

> **This file is the SOLE owner of the target-form contract.** `SKILL.md`, `references/review-path.md`, and `references/diagram-catalog.md` carry a pointer here and **no form list of their own**. Everything a form needs — its sections, its §4 route shape, its §2 diagrams — is defined in the four tables below and nowhere else.
>
> **Adding a form is a four-edit change, all in this file:** one row in the registry, then one row in EACH of the three detail tables. TC-CP-011 fails until all four agree — a form added to the registry but missing from a detail table is a test failure, not a silent gap. That is the whole point of keeping them together.

### The form registry — the ONE enumeration

Every other table in the skill keys off this ID column. Step 0's prompt-signal table decides *which* form a prompt resolves to; **which forms exist is decided here**.

| ID | Target form | The target is… |
| --- | --- | --- |
| **F1** | Diff | A change to code — commit, PR, branch range, or working tree |
| **F2** | Subsystem | A module, service, or feature area as it currently stands — no change in scope |
| **F3** | Plan / not-yet-built | A plan, roadmap, or phased design whose code does not exist yet |
| **F4** | Concept | A pattern, technique, or idea — explained through the repo's own instances of it |
| **F5** | Un-fixed bug/error | A live defect with no fix yet — a symptom, a stack trace, a failing case |
| **F6** | Code change with NO user-facing story | Refactor, lockfile bump, config edit, internal rename — serves no user-facing capability |

**A single-decision target ("why X over Y", Step 0's decision row) gets no ID of its own — it borrows one, decided by whether there is code to cite.** Step 1's gather-branch names three sources — *"the relevant code + its rationale (comments, git blame, the plan's alternatives section)"* — so both cases are live:

- **Decision already implemented** → **F1** (or **F2** if the question is about a standing subsystem rather than a change). §8 is already the alternatives table the prompt is asking for; §12's levers are the `file:line` levers of the code that implemented it.
- **Decision not yet built** — the source is a plan's alternatives section → **F3**. There is no `file:line` for §12 to point at and nothing for §11 to demo, and F3 already answers both correctly.

### Table 1 of 3 — the sections still land, in a different form

§2, §3, §4, §8, §10, §11, and §12 read as if the target is a change to code that serves a user-facing story. Several mean something different per form: a **plan** has no code to route through or blast radius yet, a **concept** has no chosen option, an **un-fixed bug** has no fix to demo, and a **no-story change** serves no user-facing capability at all.

**This never licenses dropping a section** — every ⚠ section is mandatory at every level, in every form. Where the honest answer is *"this target has none"*, write that in one line **with the reason**; that is a filled section. An empty fence, an "N/A" stub, an invented `file:line`, or a synthesised user story is not.

| Form | §2 Visual Map | §3 Stories & Rules | §4 Review Path | §8 Options | §10 Blast Radius | §11 Test & Demo | §12 Your Call |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **F1 · Diff** | Traced components, entities, and flows the change touches | The stories this change serves and the rules it protects | Review order over the changed files | Alternatives to the chosen implementation | Upstream callers, downstream dependents | Run the tests, demo the change | *if you want X → change `file:line`* |
| **F2 · Subsystem** | The subsystem's internal structure and its external boundary | The stories the subsystem serves and the rules it protects | Reading order over the subsystem, seeded at its public contract | Alternatives to the chosen implementation | Upstream callers, downstream dependents | Run the tests, demo the capability | *if you want X → change `file:line`* |
| **F3 · Plan / not-yet-built** | The phase flowchart plus the **existing** system the plan lands in — planned nodes dashed and labelled *"planned — not yet built"* | The stories the plan intends to serve, marked *"intended — not yet implemented"*, and the rules they will have to protect | Verification order over the plan's phases — read against the code each phase claims to change, all `[context — not changed]` | Alternatives to the plan's **approach and sequencing** — what else could deliver it, and in what order | The blast radius the plan **will** create once built, and what it forecloses — labelled as projected | The checkable claim per phase: what command or observation would show that phase landed correctly — **no demo, and say why: the code does not exist yet** | *if you want X → change which phase, and what that costs downstream* — levers on the plan, not on code that does not exist |
| **F4 · Concept** | Conceptual nodes, labelled *"conceptual — not traced to code"* | The situations the concept exists **for**, and the rule it enforces — no `TC-*` IDs; say so | A route through the repo's own instances of the concept — every file is `[context — not changed]` | Alternatives **to the concept itself** — what you'd use instead, with the same pros/cons/cost rigor | What adopting it costs — what it constrains, what it forecloses | The smallest runnable instance in this repo that lets you *see* the concept work | *if your situation has property X → this concept stops paying for itself* — the adoption/abandon levers, no `file:line` |
| **F5 · Un-fixed bug** | The path from trigger to symptom, with the suspect node marked | The story currently broken, and the rule the defect violates | Investigation order — the symptom site walking back toward the cause | Candidate root causes, each with evidence for and against | What the defect is currently corrupting, and what silently depends on it | The reproduction — the exact steps that make it fail, plus the observation that confirms or kills the hypothesis | *if the cause is X → the fix lands at layer Y* — the levers on the fix not yet made |
| **F6 · No user-facing story** | The traced components as they are — the diagram carries the refactor's before/after shape | **State plainly: "no user-facing story — this change serves {maintainability · security · dependency currency · performance}"**, then give the **invariants that must survive it** and their REAL test IDs. NEVER synthesise a story for a dependency bump | Review order over the changed files, weighted to the **call sites** rather than the definitions — that is where a behavior-preserving change stops preserving behavior | Alternatives to the chosen implementation (unchanged — a refactor still chose a shape) | Upstream callers, downstream dependents — plus the silent-break risk, which is the whole risk surface of a no-story change | Run the tests — the demo is *"behavior is unchanged"*, so the proof is the **existing** suite passing, named explicitly, not a new walkthrough | *if you want X → change `file:line`* (unchanged) |

**The rule this preserves:** the anti-hallucination bar in SKILL.md Step 1 forbids inventing a deliberation that never happened; the `[BLOCKING]` ⚠ drop-risk bar closing SKILL.md Step 4 forbids dropping §2/§3/§4/§5/§8/§11/§12/§13. A code-free target satisfies both by answering the section's *question* in the form its target actually has — never by fabricating a `file:line` and never by writing an "N/A" stub.

### Table 2 of 3 — what §4's route means per form

The route algorithm, its eight-field grammar, and its failure modes live in `references/review-path.md`. What changes per form is only the three fields below — **no form gets an N/A**.

| Form | Route means | Seed (stage 1 starts here) | Exit criteria are about |
| --- | --- | --- | --- |
| **F1 · Diff** | Review order | Lowest-layer changed file | Whether each change is correct against its layer's standard |
| **F2 · Subsystem** | Reading order | The subsystem's public contract | Whether you could now modify it safely |
| **F3 · Plan / not-yet-built** | Verification order | The phase that freezes contracts for later phases | Whether each phase's claims are checkable |
| **F4 · Concept** | A route through the repo's own instances of the concept | The clearest instance found by grep | Whether you could recognise a correct and an incorrect use |
| **F5 · Un-fixed bug** | Investigation order | The symptom site, walking back toward the cause | Whether the hypothesis survived this stage's evidence |
| **F6 · No user-facing story** | Review order weighted to **call sites over definitions** | The most-referenced changed symbol — found by grep, not by diff order | Whether behavior is genuinely unchanged **at this call site**, which is the only risk such a change carries |

For **F4** the file group is example call sites rather than changed files — every entry is `[context — not changed]` because nothing here is a diff. Say so in *why now* rather than dropping the marker.

### Table 3 of 3 — what §2's diagrams show per form

Which diagrams are mandatory, how each is derived, and what to emit when one cannot be derived live in `references/diagram-catalog.md`. What changes per form is only the content below. Every form gets every mandatory diagram, in the form that target actually has — **no cell is ever "N/A"**. D5 is absent from this table because it renders in §4, not §2; its per-form shape is Table 2's *Route means* column.

| Form | D1 flowchart | D2 erDiagram | D3 sequenceDiagram | D4 state (conditional) | D7 story map |
| --- | --- | --- | --- | --- | --- |
| **F1 · Diff** | Changed components + their callers/callees | Entities the diff touches | The flow the diff changes | If a touched entity has a lifecycle | The stories the diff serves → the stages that review them |
| **F2 · Subsystem** | The subsystem's internal structure + its external boundary | The subsystem's owned entities | Its primary use-case flow | If it owns a state machine | The capabilities it offers → the stages that read them |
| **F3 · Plan / not-yet-built** | Target architecture the plan produces | Entities the plan introduces or alters | The flow the plan enables | If the plan adds lifecycle states | Intended stories → the phases that deliver them |
| **F4 · Concept** | The concept's moving parts and how they relate | The concept's nouns as an abstract model | The concept's mechanism as an interaction | If the concept IS a lifecycle | The situations it exists for → the instances that show each |
| **F5 · Un-fixed bug** | The path from trigger to symptom, with the suspect node marked | Entities whose state is being corrupted | The failing sequence — with the divergence point marked | The illegal transition, if the bug is a state defect | The broken story → the investigation stage that reaches it |
| **F6 · No user-facing story** | Changed components + their **call sites**, which carry the whole risk | Entities the change touches, unchanged shape shown as unchanged | The flow that must behave identically before and after | If a touched entity has a lifecycle | **The invariants that must survive** → the stages that verify each. Node label says *"invariant, not story"* |

For **F4** the nodes are conceptual, not `file:line` — that is a change of form, not a licence to skip. Label the diagram *"conceptual — not traced to code"* so the reader calibrates.

---

## Skeleton

````markdown
# Understand — {resolved scope}

**Date:** {YYYY-MM-DD HH:mm} · **Scope:** {what is explained} · **Style level:** {N} ({name})
**Sources read:** {file:line list / plan path / diff range} · **Graph trace:** {ran | not applicable — reason}

> **How to read this:** **§0** is the whole report in short — read it and you hold the main knowledge; everything below is the evidence and the depth. **Part I (§1–§3)** shows you what this is — the picture, and the business it serves. **Part II (§4)** routes you: where to start reading and in what order. **Part III (§5–§10)** goes deep — how it works, why this shape, what it cost. **Part IV (§11–§13)** is yours: run it, steer it, and disagree with any of it on evidence.

## 0. Detailed Summary

> **Read only this and you hold the main knowledge.** Everything below is the evidence and the depth.

**Purpose:** {one sentence — why this exists at all}

**The change in one paragraph**

{What it is, where it lives, and before → after in BEHAVIOR terms. **A paragraph, not a sentence count** — as many sentences as the change needs to be understood, and no ceiling. Someone who reads this and nothing else should be able to say what happened and why it matters.}

**What you need to know**

{One bullet per item below, **for every item that applies**. This list is the **minimum set, never a maximum**. Each bullet is ONE line and carries its `file:line` or `§N` pointer. At ≥2 groups it repeats **per group** — a 12-group report has 12 key mechanics, not one.}

- **Key mechanic** — {what actually makes it work} → §6
- **Business rule at stake** — {the rule, and who it protects} → §3
- **Decisive design force** — {the constraint that made this the answer} → §7
- **Closest rejected alternative** — {option} lost because {specific reason} → §8
- **Highest-leverage trade-off** — bought {X}, paid with {Y} → §9
- **Blast-radius headline** — {what else moves because of this} → §10
- **Proof verdict** — {what is tested; what is protected by nothing} → §11
- **Weakest link** — {the part the author trusts least} → §13
- {Anything load-bearing that fits none of these categories gets its OWN bullet — the list orients, it does not bound.}

**Start here**

{The §4 start-here file and why — verbatim from §4. The two must never disagree.}

**Groups** *(at ≥2 groups only — one row per group, and nothing more)*

| G | Group | Takeaway | Anchor |
| --- | --- | --- | --- |
| G1 | {name} | {the one line that matters about this group} | [#g1-{slug}](#g1-{slug}) |

**The one thing to double-check:** {one sentence — what a reviewer should verify first, stated as an action}

# Part I — Orient

## 1. What Was Done

{2–6 sentences. Name the thing, where it lives, and state before → after in BEHAVIOR terms, not file terms.}

| | Before | After |
| --- | --- | --- |
| {behavior//property} | {…} | {…} |

**In one sentence:** {the single sentence a teammate needs}

**Where this sits in the system that already existed** *(mandatory whenever the target is a change — a diff, a plan, or a fix)*

{2–5 sentences on the PRE-EXISTING system this plugs into, written for a reader with **zero memory of it**. Name the capability that was already there and how it already worked, the contract or convention this change had to fit (`file:line`), and what it deliberately left alone. A reviewer who cannot say what was already true cannot tell a deliberate change from an accidental one — which is the difference between reviewing and rubber-stamping.}

{Then, in one line: **what a reviewer must already understand before Stage 1 makes sense** — the concepts §5 will teach and the surrounding files §4 admits as `[context — not changed]`. This is the section that owes the reader the *full* context; §4 owes only the context needed to walk the route.}

## 2. Visual Map

> Diagram contract: `references/diagram-catalog.md`. **D1, D2, D3 and D7 are mandatory for every target.** D4/D6 fire only on their observable trigger. A mandatory diagram that cannot be derived degrades to a **stated blocker** — never to silence, and never to an empty fence.

**D1 — System / component**

```mermaid
flowchart TD
    {traced nodes; changed nodes marked; layers grouped as subgraphs; edges labelled with the relationship}
```

**D2 — Domain model**

```mermaid
erDiagram
    {entities with tech-agnostic types only — string/number/boolean/date/list/map; PK/FK marked; quoted cardinality labels}
```

**D3 — {flow name}** {one per main flow — draw them all; no maximum}

```mermaid
sequenceDiagram
    {participants are components, not files; show the failure branch when the change has one}
```

**D7 — Story map** {mandatory; restates §3 and §4 as one picture — introduces no claim neither section already carries}

```mermaid
flowchart LR
    subgraph Stories["Who wants what"]
        {one node per §3 story — or per invariant, for a target with no user-facing story}
    end
    subgraph Rules["What must hold"]
        {one node per business rule/invariant, carrying its file:line}
    end
    subgraph Route["Where you meet it"]
        {one node per §4 stage that reviews it}
    end
    {story --> rule --> stage}
    {rule -.->|"REAL TC id, or ⚠ no test"| stage}
```

{**D4 — Lifecycle** `stateDiagram-v2` — only when an in-scope entity has a status/state/phase field, a lifecycle enum, or a transition guard. Mark the transitions this change touches.}
{**D6 — Phases** `flowchart LR` — only when the target is a plan or multi-phase sequence. Edges are declared dependencies, not numbering.}

**Provenance:** solid `-->` = traced · dashed `-.->` = inferred. Every dashed edge is named here: {…, or "none — every edge above is traced"}
**Could not derive:** {what, and why — or "nothing; every node above is verified"}

## 3. User Stories & Business Rules

{The business this code serves, before the code that serves it. One block per MAIN story — group minor variants under the case list, don't inflate. Prefer the spec's stories; else synthesise one per distinct **real** user-facing capability the code delivers. A target that delivers none takes the no-story form (**F6**) instead — **never synthesise a story to fill the section.**}

### Story {A} — {user-facing capability}

> *As a {role}, I want {capability} so that {value}.*

- **Business rules / invariants it protects:** {the rule in domain words, and where it is enforced — `file:line`}
- **What breaks for the user if the rule breaks:** {the concrete consequence, not "data integrity"}
- **Proven by:** `{REAL TC-* / test IDs}` — **never invent a case ID.** Use the actual spec `TC-*` and/or the test `it`/`[Fact]` names and scenarios. Nothing covers it → write *"no test covers this story"* and record it as a coverage gap
- **Read it in:** §4 Stage {N}

---

# Part II — Route

## 4. Review Path — where to start, and in what order

> Route contract: `references/review-path.md`. Every stage carries all eight fields; a stage missing any of them is a failed stage. Repeat the stage block below per stage — as many stages as the change genuinely needs, and no ceiling.

**Start here:** `{one file}` — {why this file first, in one sentence}

```mermaid
flowchart TD
    {D5 — one node per stage, edges are reading order, at least one back-edge showing where a failed check sends you}
```

> **Stage {N} · {what this stage is about, in domain words}** — {N} min
>
> - `{path}` — changed
> - `{path}` — `[context — not changed]` *({invariant owner | interface satisfied | base-class contract | governing spec/TC})*
> - *further context available: {paths}* {only when a stage exceeds 3 context files — named, not routed}
>
> **Why now:** {the reason it precedes the next stage; state the layer call so a misfile is visible}
> **What to check:** {concrete, checkable items — never "review the code"}
> **Red flags:** {sourced from the repo's own rules via the route contract's ladder; never invent a house rule}
> **Exit criterion:** *{a question the reviewer can answer}*

{*Route derived by grep, not graph trace — ordering within stages is approximate.* ← include this line ONLY when no graph was available}

---

# Part III — Depth

## 5. Concepts You Need

{Every concept without which §6 is unreadable — however many that is. Skip nothing that is load-bearing; add nothing that is decoration. **No maximum.** If the change needs no new concept, write "No new concepts — this is plain {X}" and say why.}

### {Concept name}

- **What it is:** {2–5 lines, plain language, first principles before jargon}
- **Why it applies here:** {the specific reason THIS problem summons THIS concept}
- **Where you can see it:** `{file:line}` — {what to look at there}
- **Mental model:** {one analogy — only if the concept is genuinely dense}
- **What breaks without it:** {the concrete failure this concept prevents}

## 6. How It Works

{The execution story. Entry point → data flow → decision points → persistence/output. Use a numbered walk or a small diagram. Every concrete claim carries `file:line`.}

**Flow:**

1. `{file:line}` — {what happens, and why here}
2. …

**Invariants held:** {the rules that must never break, and where they are enforced}
**Edge cases handled:** {each one, plus what would happen if it were not}
**Edge cases NOT handled:** {explicit — silence here is how bugs ship}

## 7. Why This Solution

{Not "what it does". WHY this shape and not another. Drill to the why-behind-the-why: the constraint, the force, the prior failure, the future cost being avoided.}

- **The forces:** {constraints that narrowed the option space — existing patterns, perf, data model, team convention, deadline, backward compat}
- **The decisive reason:** {the one force that actually picked the winner}
- **Why not the obvious approach:** {the thing a competent engineer would have guessed, and the specific reason it loses}
- **Confidence:** {N}% — {evidence this rationale is real vs reconstructed}

## 8. Options Considered

> **[MANDATORY]** At least 2 alternatives beyond the chosen one, OR an explicit, argued statement that the option space is genuinely empty. Generic pros/cons ("faster", "cleaner") are a FAILED section — every pro/con must be specific to THIS codebase and cite evidence where it can.

> **[ANTI-HALLUCINATION]** Label every option's provenance. Never invent a deliberation that did not happen.
> `[deliberated]` = actually weighed while doing the work · `[reconstructed]` = surfaced now, after the fact, for the developer's judgement.

| Option | How it would work | Pros | Cons | Cost to switch later | Verdict |
| --- | --- | --- | --- | --- | --- |
| **A. {chosen} ✅** | {…} | {specific} | {specific — the chosen option HAS cons} | — | Chosen: {one-line reason} |
| **B. {alt}** `[deliberated]` | {…} | {…} | {…} | {S/M/L + why} | Rejected: {the disqualifying reason} |
| **C. {alt}** `[reconstructed]` | {…} | {…} | {…} | {S/M/L + why} | Viable — {what would make it win} |

**The closest call:** {which option was nearest to winning, and the single fact that decided it. If nothing was close, say so and explain why the decision was easy.}

**What would flip the decision:** {concrete condition — "if {X} exceeds {N}", "if we ever need {Y}"}

## 9. Trade-offs Accepted

| We gained | We paid | Reversible? |
| --- | --- | --- |
| {…} | {…} | {Cheap / Moderate / Expensive — and WHY} |

**Now expensive to reverse:** {schema, public contract, cross-service message, shared-layer abstraction, persisted data shape — name them explicitly, or state "nothing here is hard to reverse" and justify it}
**Debt knowingly taken:** {what we accepted and the condition under which it must be repaid}

## 10. Impact & Blast Radius

- **Directly changed behavior:** {who sees a difference, in what situation}
- **Upstream callers affected:** {`file:line` — from graph trace where available}
- **Downstream dependents affected:** {`file:line`}
- **Silent-break risk:** {things that compile/pass but change meaning — config, generated files, docs, templates}
- **Test coverage of this change:** {which tests protect it; which behavior is protected by NOTHING}
- **Follow-ups left open:** {…}

---

# Part IV — Prove & Push Back

## 11. Test & Demo — see it work

{How to run it, and how to show it to a room. One block per case, and every case cites a REAL ID — **never invent a case number.**}

**Run it:**

```bash
{the project's own commands, read from docs/project-config.json — never guessed}
{any secret renders as a placeholder: <redacted:connstring>, <redacted:apikey>}
```

**One-time demo setup:** {roles, configuration, seed data, which app/screen — staged via real paths}

### {A1} — {short case title} · `{REAL TC-ID(s)}`

- **Setup / preconditions:** {exact state to stage first}
- **Demo steps:**
    1. {actor} {action} on {screen/endpoint} with {input}
    2. {next action}
    3. {observe/where to look}
- **Expected result:** {observable outcome, phrased as the discriminator vs old behaviour}
- **How the domain stores/changes data & solves it:** {what field/column/table/value is persisted or changed and by which entity/migration/handler `file:line`; then the rule/method/invariant that consumes it to produce the outcome, and why this storage makes the case correct — edge cases, legacy fallback, cross-tier parity}. _(If display-only: state "no storage change" and describe the computed representation that solves it.)_
- **Proof:** {✅ proven by executed test `id` | ⚠️ trace-verified / demo-only}

**Test-execution transparency:**

- **Proven this session:** {suites/cases actually executed + pass/fail counts}
- **Not executed:** {cases only trace-verified + why (e.g. runner blocker)} — demo these live instead of via a green run

## 12. Your Call — Decision Levers

> This section exists so you can steer, not just approve.

| If you want… | Change this | Effort | Risk |
| --- | --- | --- | --- |
| {a different behavior/trade-off} | `{file:line}` — {the specific edit} | {S/M/L} | {…} |

- **Cheapest thing to change your mind about:** {…}
- **Most expensive thing to change your mind about:** {…} — decide it now, not later
- **Revisit signals:** {the observable conditions that should make you re-open this decision — load, team size, a feature on the roadmap, an error rate}
- **If you disagree with the chosen option:** the smallest change that flips it is {…}

## 13. Challenge This

> **[RHETORICAL — do not answer here, and nothing waits on you.]** These are the questions a skeptical reviewer would ask. They are written down so you can pressure-test the work at your own pace, and push back with evidence if you land somewhere else.

**The weakest link, named by the author:** {the single part of this that would fail a hostile review first — be honest, this is the most valuable line in the report}

**Pressure-test these:**

1. {A question that attacks the core assumption — "this assumes {X} stays true; what happens the day it doesn't?"}
2. {A question that attacks the option choice — "if {condition} were 10× larger, would option B win?"}
3. {A question that attacks the mechanics — "what happens if {edge case} arrives concurrently?"}
4. {A question that attacks the scope — "what did this change NOT do that a reader might assume it did?"}

**Pre-mortem:** it is 3 months later and this is being reverted. The most likely reason is {…}, and the earliest signal would be {…}.

**Where the author's confidence is lowest:** {claim} — {N}% — {what evidence would raise it}
````

---

## §0 Detailed Summary — the authoring contract

> §0 is the section a reader opens first and the one the run writes last. These three rules are what make that safe. They live here, outside the skeleton, because they govern how §0 is produced — they are not text the report emits.

**§0 has NO maximum length.** It is as long as the main knowledge requires — a one-line change needs a paragraph, a whole-project report needs a page or more, and neither is capped. **NEVER drop a bullet, a group row, or a rule to fit a length; there is no length to fit.**

What keeps §0 compact is not a word count but a **division of labour: §0 carries the knowledge, the sections below carry the evidence.** State the conclusion and point at the section that proves it — never reproduce a `file:line` walk, a full options table, or a diagram here. A §0 that has become a second copy of the report is failing the content rule, and the fix is to replace the reproduced evidence with a pointer, never to cut knowledge. — why: a length cap forces a run to drop knowledge to fit, which fails the more important half of what §0 is for; a content rule tells the run exactly *what* to cut instead.

**Authoring order: reserved first, written last.** Before section one is written, reserve the stub:

```markdown
## 0. Detailed Summary

_pending — filled last, from the written sections_
```

Fill it **last, from what is written on disk — never from memory.** — why: this is the rule the spine already proves (see *Spine skeleton* below); a section that belongs at the top can only be written at the end, and reserving the stub keeps the file coherent at every intermediate moment, which is what the crash-safety rule protects.

**§0 introduces NO new claim.** Every line restates something §1–§13 already carries — the same constraint D7 runs on (`references/diagram-catalog.md`), and for the same reason: a section that may only restate is a section that cannot hallucinate. A claim in §0 that appears nowhere below is a defect **in §0**, fixed by deleting it or by fixing the section that should have carried it — never by leaving both. This also makes "is §0 correct?" a mechanical cross-check rather than a judgement call.

---

## Caps vs split triggers — the distinction, written down once

> **No rule in this contract caps what the report SAYS.** There is no maximum on concepts, flows, stages, context files, options, challenges, or §0's length. A limit that binds makes a run **drop knowledge to fit** — and a reader cannot skim toward something that is not there. That is the failure this skill exists to prevent.
>
> The numeric limits that remain are **split triggers**, and they cap nothing: exceeding one **adds structure** rather than removing content — `≤8 files / ≤2000 diff-lines` splits a **group**, `≤12 groups` nests a **level**, `~20 nodes` splits a **diagram** (or collapses it into subgraphs, which preserves every node). Every one of them makes the report *bigger and more navigable*, never smaller.
>
> **Deleting a split trigger does not remove a cap; it removes the structure that makes a large target readable.** A 60-file single group still produces a report — a thin, summary-shaped one whose §1–§13 are no longer answerable about it alone. Do not confuse the two, and do not "finish the job" of removing caps by deleting a trigger.

## Scaled report layout — ONE file: spine, then a block per group

> Fires when `SKILL.md` Step 0.5 produced **≥2 understanding groups**. One group → the skeleton above, unchanged, zero overhead. **The report is ONE file at every tier and every group count**; this section owns only the SHAPE inside it. The tier→layout mapping lives in `SKILL.md` Step 3 and the grouping/accumulation process in `references/scale-protocol.md`.

**Always `understand-{YYMMDD}-{HHmm}-{slug}.md`.** One group → the skeleton above. **≥2 groups** → the spine region, then one `# G{n}` block appended per group, in group order.

**More than 12 groups** → nest **in the same file**: an intervening `# Context — {name}` heading per bounded context, groups as `## G{n}` beneath it, and the ledger nested one level. The ≤12-per-level cap and `[NO SILENT TRUNCATION]` are unchanged.

— why: a directory is a deliverable nobody opens as a whole; anchors survive copy, share, and concatenation where paths do not. **Do not re-split this for size** — size is what §0 and the ledger are for.

### Altitude — every section is owed ONCE, at the level where its answer differs

| Altitude | Owns |
| --- | --- |
| **Spine** | §1 the whole scope · §2 the group map (D8) + the scope-level system view · §4 the **group route** · §9/§10 the cross-cutting trade-offs and blast radius no single group can see · §13 the whole-scope weakest link · the group **ledger** |
| **Group block** | The full §1–§13 **in that group's scope** — its diagrams, its stories with REAL IDs, its stage file route, concepts, mechanics, why-this-solution, options, trade-offs, impact, test & demo, levers, challenges |

A section may be answered on the spine INSTEAD of inside a group **only when its answer is genuinely identical across groups**, and the block then carries a one-line **pointer** — `§5 — shared concept, see spine: optimistic concurrency`. **A pointer is a filled section; an empty heading, an "N/A" stub, or silence is a dropped one.** — why: scale is the most rationalized excuse for dropping a section, and it is never a valid one.

### Spine region

The **spine** is not a file — it is the **header region of the one report file**: everything above the first `# G1`. Create it **before the first group block**, with every scope-wide heading present and stubbed `_pending — filled after the group blocks land_`. — why: those sections belong at the top but can only be written last; reserving them keeps the file coherent at every intermediate moment.

````markdown
# Understand — {resolved scope}

**Date:** {YYYY-MM-DD HH:mm} · **Tier:** {S2|S3|S4} · **Groups:** {N} · **Style level:** {N} ({name})
**Grouping axis:** {module | capability | flow | layer slice | structural} — {the rung, and why it was the first that fit}
**Sources read:** {…} · **Graph trace:** {ran | not applicable — reason} · **Delegated:** {`/investigate` G1–G3 | none}

> **How to read this:** **§0** is the whole report in short. §4 names which GROUP to open first. Each group block below is a full report in its own scope; this spine region carries what they share and what only appears when you look across them.

## 0. Detailed Summary

_pending — filled last, from the written blocks_

## Group ledger

| ID | Group | Scope | Depends on | Status | Anchor | Takeaway |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | {name — no "and" in it} | {paths · file count} | — | written | [#g1-{slug}](#g1-{slug}) | {one line} |
| G2 | {…} | {…} | G1 | pending | — | — |

**Coverage:** {N of N groups written} · **Deferred or dropped:** {named explicitly — paths and why — or "none"}

# Part I — Orient (whole scope)

## 1. What Was Done — across the whole scope
## 2. Visual Map — D8 group map + the scope-level system view

# Part II — Route (across groups)

## 4. Group Route — which group to read first, and why

# Part III — Depth (cross-cutting only)

## 9. Trade-offs Accepted — the ones no single group can see
## 10. Impact & Blast Radius — across group boundaries

# Part IV — Prove & Push Back (whole scope)

## 13. Challenge This — the weakest link of the whole scope
````

**Group blocks are appended BELOW this region, in group order** — nothing is written above the spine after the run starts.

### Group block skeleton

Header, then **§1–§13 exactly as the skeleton above**, scoped to the group:

````markdown
# G{n} — {group name}

**Scope:** {explicit paths} · **Depends on:** {G… | —} · **Why one unit:** {the cohesion sentence}
**Reads with:** [§0 Detailed Summary](#0-detailed-summary) and the spine region — {which shared sections this block points at, by anchor}
````

The heading is `# G{n} — {group name}` and **never changes once written** — the ledger's anchors point at it.

**At ≥2 groups, wrap each group block in a `<details>` element** so the report opens as a one-screen index that expands on demand:

````markdown
<details>
<summary><b>G{n} — {group name}</b> · {the one-line takeaway from the ledger}</summary>

{the full # G{n} block — every section, unchanged}

</details>
````

The `<summary>` line carries the **same** takeaway as the ledger row — one derivation, two consumers, so they cannot disagree. **Never** put a group's only copy of a fact in the summary line; it is a label, not content. The block inside is byte-for-byte what it would be uncollapsed — collapsing changes what the reader **sees first**, never what the report **says**.

— why: §0 and the ledger tell you the report is long; `<details>` is what makes the length navigable instead of merely admitted. It renders natively in GitHub, VS Code preview, and every common markdown viewer. **Caveat, stated so nobody is surprised:** in a plain-text reader or a markdown-to-PDF converter that strips HTML, the tags render as literal text and every block shows expanded — the content is all still there and in order, only the folding is lost. That is the correct failure direction: degraded presentation, never withheld knowledge. At ONE group, do not collapse — there is nothing to navigate between.

---

## Level tuning — sections stay, size flexes

> **Diagram COUNT is level-invariant.** Level compresses prose; it NEVER deletes a diagram. A diagram is the densest representation available — which is precisely what a level-5 reader wants most. §2's mandatory D1–D3 + D7 and §4's D5 appear at every level, ELI5 through God Mode. What flexes is label vocabulary and the amount of prose around them.

**§0 and the teaching sections:**

| Level | §0 Detailed Summary | §5 Concepts | §6 How | §8 Options | §13 Challenge |
| --- | --- | --- | --- | --- | --- |
| 0 ELI5 | Same bullets; each gets a plain-language clause explaining the term it uses | Analogy-led, one idea at a time, zero jargon | Story form, step by step | Plain-language "we could also have…" | Gentle "here's what to wonder about" |
| 1 Junior | Same bullets; each gets a plain-language clause | Full definition + why it exists as a concept at all | Every step spelled out, terms defined inline | Full table, teach WHY each con matters | Concrete, tied to code they can open |
| 2 Mid | Same bullets; domain vocabulary, one line each | Definition + the pattern family it belongs to | Flow + edge cases in full | Full table + cost-to-switch reasoning | Design-level challenges |
| 3 Senior | Same bullets; one line each | Name it, one-line refresher, focus on why-here | Summarized flow, full edge cases/invariants | Full table, terse cells | Trade-off and reversibility challenges |
| 4 Tech Lead | Same bullets; one terse line each | Name only unless non-standard | Compressed; emphasis on contracts + risk | Focus on cost-to-switch and flip conditions | Strategic/architectural challenges |
| 5 God Mode | Same bullets; one terse line each — no bullet is dropped for terseness | Only genuinely unusual concepts | Bullet flow, assume mechanics | Terse matrix, lead with the closest call | The weakest link + pre-mortem, nothing else |

> **§0's bullet set is level-invariant.** Level tunes the vocabulary and the prose around each bullet — it never removes a bullet, never merges two, and **never imposes a length limit** (see *§0 — the authoring contract* above). A level-5 §0 is every bullet, terse.

**The orient / route / prove sections:**

| Level | §2 Visual Map | §3 Stories | §4 Review Path | §11 Test & Demo |
| --- | --- | --- | --- | --- |
| 0–1 | Same diagrams; plain-language node labels; one sentence per diagram saying what to look at | Story and rule in everyday words; spell out why the rule matters | Longer time-boxes; "what to check" written as instructions | Every step keyboard-level explicit |
| 2–3 | Same diagrams; domain-term labels; one orientation line each | Story + rule + enforcement site | Standard stages; checks stated as items | Steps at task level; full storage trace |
| 4–5 | Same diagrams; terse labels; no prose beyond the provenance and blocker lines | Rule and invariant only — the story line stays, the exposition goes | Fewest stages the bound allows; checks as one-liners | Command + discriminator + proof status; storage trace stays |

**MUST ATTENTION:** at level 5 the report is short — it is never partial. Every ⚠ drop-risk section still appears, and so does every mandatory diagram.

---

## Self-check before writing the file

- [ ] **§0 is present, sits before `# Part I`, and carries every required bullet** — the purpose line, the paragraph, the full *What you need to know* set, the start-here line, the group ledger at ≥2 groups, and the double-check line. **No length check applies, and nothing was cut to fit one**
- [ ] **Every §0 claim traces to a section below it** — no claim appears in §0 that §1–§13 do not carry, and no evidence is reproduced from the section that owns it (a `file:line` walk, an options table, or a diagram in §0 is a pointer that should have stayed a pointer)
- [ ] **§0's start-here line matches §4's verbatim** — the two are one derivation with two readers, so they cannot be allowed to disagree
- [ ] Every section present, and each ⚠ drop-risk section verified individually — §0, §2, §3, §4, §5, §8, §11, §12, §13 are the ones most often silently dropped
- [ ] §2 carries D1, D2, D3, and D7 — each either derived or carrying a stated blocker; no empty fence, and nothing drawn from expectation instead of evidence
- [ ] D7's nodes all restate §3 stories/rules and §4 stages — no story, rule, or stage appears in D7 that is absent from those sections, and every test edge cites a REAL ID or `⚠ no test`
- [ ] Every dashed edge in §2 is named beneath its diagram; no diagram contains a fabricated node or edge
- [ ] §3 and §11 cite only REAL `TC-*` / test IDs — a story or case with no test says so instead of inventing one
- [ ] For a change target, §1 states **where it sits in the system that already existed** — the pre-existing capability, the contract it fits (`file:line`), and what it left alone
- [ ] §4 has one "start here" file, a D5 flowchart with at least one back-edge, and an exit criterion per stage phrased as a question the reviewer can answer
- [ ] Every concrete claim cites `file:line`, a plan path, or is labelled as inference with confidence
- [ ] §8 has ≥2 alternatives with SPECIFIC pros/cons and provenance labels, or an argued empty option space
- [ ] The chosen option in §8 lists real cons (a chosen option with no cons means the analysis is not done)
- [ ] §9 lists a real cost, not only benefits
- [ ] §11's proof status is honest — `✅ ran` only for a test actually executed this session; everything else is `⚠️ trace-verified`
- [ ] §13 names a weakest link the author actually believes in
- [ ] **No secret value anywhere** — connection strings, tokens, keys, and customer identifiers render as `<redacted:…>` placeholders, in diagrams, stage tables, and run-command blocks alike
- [ ] No question in the report expects an answer from the reader, and nothing in the flow waits for one
- [ ] Jargon in §6 was defined in §5 first
- [ ] Chat received the executive summary — plus the report path when a file was written, or Step 3's blocker line when it could not resolve one — so the explanation never lives only in the file
- [ ] **At ≥2 groups:** the spine region exists with its ledger, **every row marked `written` resolves to a `# G{n}` heading present in this file that carries its sections**, and the coverage line names anything deferred or dropped instead of implying full coverage
- [ ] **At ≥2 groups:** every group block carries all ⚠ drop-risk sections in its own scope — or a one-line pointer to the spine for a genuinely shared answer, never an "N/A" stub
- [ ] **At ≥2 groups:** the spine's §4 is a GROUP route (which group first, and why), while each block's §4 is a stage file route inside that group — the two are different altitudes, never a copy of each other
- [ ] **At ≥2 groups:** the report is still **ONE file** — no directory, no index file, no per-group file — and every ledger anchor resolves to a heading inside it
