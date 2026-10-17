# UX Journey Process — Journey-First Design, from the User's Job to the Screen

> **Role:** the **authoritative knowledge body** for _how an expert UX designer derives an interface from the people who use it_. Owns the JOURNEY-FIRST LAWS, the NINE-STAGE EXPERT PROCESS, the JOURNEY REPORT template, the MAIN-JOURNEY selection rule, the INFORMATION-PRIORITY method, the BUSINESS-LOGIC → INTERACTION map, the UX LAWS reference, and the WALKTHROUGH validation method. Owns NO procedure — procedure lives in the consuming skills; the executable gate is `SYNC:ux-journey-gate` (`UX-1`–`UX-11`).
>
> **Consumed by:** `ui-design` (all modes and both lanes) · `design-spec` · `work-item --mode=mockup` · `plan` · `work-item --mode=review` · `workflow-spec-to-mockup` · `workflow-planned-work`, plus the `ui-ux-designer` agent. A carrier belongs here ONLY if it carries `SYNC:ux-journey-gate` (inline, as a guide line, or as a reminder) or an explicit pointer to this file. NEVER add an aspirational consumer.
>
> **Drift-guard:** the `UX-*` clause text is single-sourced in `SYNC:ux-journey-gate` (`.claude/skills/shared/sync-inline-versions.md`); this file is the deep catalog behind it. On any change here, grep `ux-journey-process.md` and `SYNC:ux-journey-gate` and update every consumer.
>
> **Where this sits among the design rule sets — four questions, asked in this order:**
>
> | Order | Rule set | The question | Home |
> | --- | --- | --- | --- |
> | 1 | `UX-1`–`UX-11` | _Does this interface exist to move THESE users through THEIR journeys, with the right information at each decision?_ | this file + `SYNC:ux-journey-gate` |
> | 2 | `UI-1.1`–`UI-9.4` | _Is it usable, accessible and consistent?_ (a measurable floor) | `SYNC:ui-ux-design-principles` |
> | 3 | `DD-1`–`DD-8` | _Is it THIS product's interface, or any generator's?_ (identity) | `.claude/docs/design-knowledge.md` |
> | 4 | `CL-1`–`CL-6` | _Did the review actually look, with evidence, and rank it?_ (review procedure) | `.claude/docs/design-review-checklist.md` |
>
> `UX-*` runs FIRST because the other three judge a surface whose purpose it defines: a screen can be accessible (`UI-*`), distinctive (`DD-*`) and well reviewed (`CL-*`) and still ask the user for the wrong thing at the wrong step. Report a defect ONCE, under whichever ID the consuming skill already uses.
>
> **Precedence:** accepted product decisions and the project's own specs, design principles, design system and ADRs → the brief → this catalog. A house convention is intentional; surface a genuine conflict to the user with both sides, NEVER resolve it silently.
>
> **Provenance.** Named laws and methods carry their published source inline (`[published: author year]`). Process ordering follows common practice in Garrett, _The Elements of User Experience_ (2002: strategy → scope → structure → skeleton → surface) and the Design Council Double Diamond (2005: discover → define → develop → deliver). Everything else is `[model-knowledge]` UX-practice consensus: guidance, not measured law. NEVER quote a heuristic as a threshold unless a project contract or platform standard sets it.

---

## Quick Summary

**Goal:** Every generated mockup, design, design spec or UI plan derives from an explicit, evidence-backed analysis of who uses it, what job they came to do, and how they move through the screens to finish it. Screens, information priority and interactions are then CONSEQUENCES of that analysis, not taste.

**Summary:**

- **The mandatory order, BLOCKING, before any design output:** (1) analyze and REPORT the main user journeys (`UX-1`) → (2) read the project's design principles, design system and existing UI when they exist (`UX-2`) → (3) only then generate. No wireframe, mockup, design plan, token table or code comes before the Journey Report.
- **The nine stages (§2):** Frame → Users & jobs → Main journeys → Task & decision analysis → Structure & flow → Information priority → Interaction & states → Design authority → low-fi → hi-fi → Validate & hand off.
- **Journeys come from evidence (§3):** specs, stories and acceptance criteria, business logic in code, existing UI and navigation, domain entities. Tag every claim `SOURCED` (with its location) or `INFERRED`, and confirm a critical inference with the user.
- **Screens are journey steps (§2 S5).** Every view serves at least one step; every step lands on a view; every element traces to a step's need. An orphan element or an unserved step is a defect.
- **Information priority is computed, not felt (§6).** Rank each item by what the user needs AT THE DECISION POINT × how often × the cost of missing it; visual hierarchy then follows the rank.
- **Business rules become interaction (§7).** Prevent errors with constraints, defaults and conditional visibility before you catch them with messages; state machines decide which actions appear.
- **Validate by walking (§9):** a cognitive walkthrough of every main journey on the produced design, plus a traceability matrix, BEFORE handing off.
- **Measure interaction cost and wayfinding (§12):** per main journey count steps, clicks, view changes, fields, decisions and waits against a baseline; every view answers where am I, where can I go, and how do I get back. The primary tier sits in the first viewport; there is no "3-click rule".
- **Close with the UI/UX Gate Report (§13):** one row per gate — `UX-*`, `UI-*`, `DD-*`, `CL-*`, UI copy — each `PASS` / `FAIL → fixed` / `N/A` with evidence; an unresolved `FAIL` blocks hand-off.
- **Depth scales with scope (§10)** — a one-component tweak gets a three-line journey note; a new flow gets the full report. Never zero for a new or reshaped view.

---

## 1. The Laws of Journey-First Design

| Law | Statement | Consequence |
| --- | --- | --- |
| **Form follows the job** | An interface exists so a person can finish a job; every pixel is justified by that job or it goes | Start from the job statement, never from a layout, a component kit or a reference screenshot |
| **A screen is a journey step, not a page** | Users do not visit screens; they move through a task, and a screen is where one or more steps happen | Design the flow first, then the screens that host its steps; a screen with no step is decoration |
| **Hierarchy = priority at the decision point** | What is visually dominant must be what the user needs to decide or act RIGHT NOW | Visual hierarchy is the output of §6's ranking, never an aesthetic preference |
| **Business rules are interaction design** | Validation, permissions, state transitions and limits ARE the interface's behavior | Read the business logic before drawing; a rule the UI ignores becomes an error message the user trips over |
| **Remove steps before styling them** | The best interaction is the one the user never has to make | Count steps, fields and decisions per journey; cut, default or defer before polishing (Tesler: someone must carry the complexity — prefer the system) |
| **The designer is not the user** | Your own intuition is a hypothesis about someone else's context | Ground every journey in evidence; mark inferences and confirm the critical ones |
| **Design for the whole path, not the happy path** | Real journeys include first use, errors, interruptions, returns, and permission limits | Every step names its failure and recovery path, and every view names its empty, loading and error state |
| **Validate by walking, not by looking** | A design that looks right can still strand a user at step 3 | Walk every main journey through the produced design (§9) before calling it done |

**MUST ATTENTION** you will jump to layout by default. A brief that says "design a dashboard" pulls the typical dashboard from training, before anyone has asked what the user needs to decide when they open it. The Journey Report exists to put the user's job between the brief and the pixels.

---

## 2. The Expert Process — nine stages

An expert moves from strategy to surface, and loops back whenever a later stage exposes a gap in an earlier one. Stages 1–4 produce the **Journey Report** (`UX-1`). Stage 8's middle step is the **design-authority read** (`UX-2`). Stage 9 is the **walkthrough** (`UX-8`), the **interaction-cost and wayfinding checks** (`UX-9`, `UX-10`, §12) and the **UI/UX Gate Report** (`UX-11`, §13).

| # | Stage | Question it answers | Output | Methods |
| --- | --- | --- | --- | --- |
| S1 | **Frame** | Why does this exist, for the business and for the user? How will we know it works? | Problem statement, business goal, success metric, constraints | Stakeholder goals, the brief, the spec's outcome, releasable-outcome contract |
| S2 | **Users & jobs** | Who acts here, in what context, with what expertise, how often? What job did they come to do? | Actor list (humans, admins, AI agents, external systems), job statements | Job stories (`When <situation>, I want to <motivation>, so I can <outcome>` `[published: Klement, job stories]`), personas only when evidence supports them |
| S3 | **Main journeys** | Which end-to-end paths matter most? | 3–5 main journeys (fewer when the scope is small), each an ordered step table | Journey mapping, story mapping, §5 selection score |
| S4 | **Task & decision analysis** | At each step, what does the user decide, what do they need to know to decide it, and which rules constrain it? | Per-step decision, information needs, business rules, failure paths | Hierarchical task analysis `[published: Annett & Duncan 1967]`, reading the business logic, state diagrams |
| S5 | **Structure & flow** | Which views host which steps? How does the user move between them? Which container fits each task? | View inventory, navigation map, container per view, entry and exit points | Flow diagram, screen map, container fit (checklist `E9`–`E11`), card sorting and tree testing when navigation is new |
| S6 | **Information priority** | On each view, what must be seen first, what can wait, what belongs elsewhere? | Ranked content and action inventory per view with tiers | §6 method, content inventory, progressive disclosure |
| S7 | **Interaction & states** | How does the UI enforce the rules, give feedback, prevent and recover from errors, and show every state? | Rule-to-interaction map, state list per view, feedback and recovery per action | §7 map, `UI-1.5`, `UI-5.*`, `UI-7.*`, checklist §D and §R |
| S8 | **Design authority → low-fi → hi-fi** | What do the project's principles and system prescribe? Does the structure work before it is styled? | Design-authority read record, low-fi flow and wireframe (ASCII or boxes), then the `DD-3` Design Plan and the visual design | Wireframes, the project design system, existing-UI research, `DD-1`–`DD-8` |
| S9 | **Validate & hand off** | Can each main journey actually be completed on this design? | Walkthrough log, traceability matrix, interaction-cost table, UI/UX Gate Report, open questions, handoff notes | Cognitive walkthrough (§9), interaction-cost and wayfinding checks (§12), gate report (§13), heuristic sweep (`CL-*`), task metrics |

### S1 Frame

State in two or three lines: the problem this solves, for whom, the business goal it serves, and the observable success signal (task completed, time on task, error rate, conversion, fewer support tickets — pick the one the business actually cares about). Name the constraints: platform, regulatory, legacy UI, deadline, the complexity budget when the project declares one. A frame you cannot state is a scope question for the user, not a design decision.

### S2 Users and jobs

List every actor who touches the surface: primary user, secondary users (approvers, viewers, admins), and non-human actors (AI agents, integrations) when they act through the same surface. For each, record context of use (device, environment, interruptions, time pressure), expertise (novice, occasional, expert), and frequency (once, weekly, all day). Write one job statement per actor-job pair. Expertise and frequency drive density, shortcuts and onboarding. A daily expert and a once-a-year novice need different interfaces for the same data (checklist §H).

### S3 Main journeys

A journey is the ordered path from a trigger (why the user starts) to an outcome (what is true when they finish), including where they come from and where they go next. Pick the main journeys with §5, then write each as a step table (§4). Include the entry context (which screen or event brings them here), the exit (where they go next), and the branch points where the path splits.

### S4 Task and decision analysis

For every step, answer four questions: **What does the user decide or do here? What must they know to do it? Which business rule governs it? What can go wrong, and how do they recover?** Read the actual business logic — validation, permissions, state transitions, calculations, limits, side effects — from the spec or the code. The information needs from this stage are the raw input to §6. The rules are the raw input to §7.

### S5 Structure and flow

Group steps into views by task cohesion. Steps that share a decision context and happen together belong together; steps separated by time, role or a hand-off belong apart. Pick each view's container by the task (checklist `E9`): a short focused task can live in a dialog, while a long or multi-section task needs a full view or a stepped flow. Draw the navigation map: entry points, transitions, back and exit paths, and the state carried across each transition. Minimize the steps, context switches and page loads on the main journeys, and keep the rare paths reachable without cluttering the frequent ones.

### S6 Information priority

Apply §6 per view. The result is the view's content and action list, ranked and tiered. This is what the visual hierarchy, the layout order and the primary action implement.

### S7 Interaction and states

Apply §7 per rule and per step. For every view, list the states the journey can put it in: first use or empty, loading, partial, populated, error, success, permission-denied, stale or conflict when concurrency exists. Design the empty, loading and error states first (`UI-1.5`). For every action, define immediate feedback, the result, and recovery (undo is better than confirmation; confirm only the irreversible — `UI-5.3`).

### S8 Design authority → low-fi → hi-fi

1. **Read the design authority first** (`UX-2`). Before any sketch or visual design, read the project's design principles or guidelines, design system (tokens, components, patterns, icons), styling conventions, and the existing related UI, resolved from `docs/project-config.json` and its reference docs. Record what you read, or `N/A — none configured` with the paths you checked. Adopt the house patterns: a user who knows the rest of the product should recognize this surface (Jakob's law, §8).
2. **Then low-fi** (`UX-7`). Sketch the flow and each view's structure (ASCII boxes are enough) from S5–S7, using the house patterns just read. Walk the main journeys on the sketch before any styling. Structural problems are cheap here and expensive after styling.
3. **Then hi-fi.** Write the `DD-3` Design Plan (colour, type, layout, principles) on top of the structure and apply `UI-*` and `DD-*`. The visual layer must express the priority ranking. It must never reshuffle it.

### S9 Validate and hand off

Run §9: a cognitive walkthrough per main journey and the traceability matrix. Then run §12: the interaction-cost table per journey and the wayfinding checklist per view. Then write the §13 UI/UX Gate Report, covering `UX-*`, applicable `UI-*`, `DD-*`, a `CL-5` triage (or the full `CL-*` sweep for a review deliverable) and UI copy. Hand off with the Journey Report, the traceability matrix, the interaction-cost table, the Gate Report, the states per view, the open questions, and the success metric, so the implementer builds the journey and not only the picture.

---

## 3. Evidence Sources — where journeys come from

Read in this order, and stop when the journeys are well evidenced. Cite each source by path, section or `file:line`.

1. **Governing spec** — the feature spec's interaction surface (view inventory, navigation map, per-story action flows, observable states) and its business rules. Reuse its vocabulary verbatim (`SYNC:ui-intent-layer`).
2. **Planned-work artifacts** — tasks, user stories (`As a / I want / So that`), acceptance criteria (`GIVEN / WHEN / THEN`), interaction flows, and priority.
3. **Business logic in code** — commands and handlers, validators, permission checks, state machines and status enums, calculations, limits, side effects (notifications, emails, integrations). This is where the real rules live when docs are thin.
4. **Existing UI** — related screens, routes and navigation, and the connected flows that link to or from the target (`SYNC:existing-ui-research`).
5. **Domain model** — entities, relationships and statuses (the project's domain reference when it exists), for realistic content and state names.
6. **Research and analytics** — user research, support tickets, usage data, when the project has them.
7. **The brief** — the user's own words, always authoritative on intent.

Tag every journey claim `SOURCED (<location>)` or `INFERRED (<reason>)`. When the **primary actor, their main job, or the success outcome** can only be inferred, confirm it with the user before generating. The gate blocks on those three while the user can be asked; with no question tool (sub-agent, headless run), record each as `INFERRED — unconfirmed (no question tool)` in the report's assumptions and the hand-off, and continue — never block. Other inferences stay in the report as labelled assumptions and open questions.

---

## 4. The Journey Report — template (the BLOCKING first deliverable, `UX-1`)

Present this in the response, or save it in the artifact the skill produces, BEFORE any design output. Keep it as short as the scope allows (§10).

```markdown
## Journey Report — {feature / surface}

**Frame:** {problem} · **Business goal:** {goal} · **Success signal:** {metric} · **Constraints:** {platform, rules, legacy, budget}
**Sources read:** {spec §, task/story, code paths file:line, existing screens} · **Confidence:** {%}

### Actors & jobs
| Actor | Context of use | Expertise · frequency | Job statement (When…, I want to…, so I can…) | Source |
| --- | --- | --- | --- | --- |

### Main journeys (ranked — §5)
| # | Journey | Actor | Trigger → outcome | Why it is main (frequency · value · risk · first-use) |
| --- | --- | --- | --- | --- |

### Journey J1 — {name}
Entry: {where the user comes from} · Exit: {where they go next}
| Step | User intent | Decision / action | Information needed to decide | Business rule (ID/source) | System response & feedback | Failure → recovery | Pain point / opportunity |
| --- | --- | --- | --- | --- | --- | --- | --- |

{repeat per main journey}

### Derived design requirements
- **Views (step → view):** {view role: steps it hosts · container · why}
- **Information priority per view:** {top 3 items · primary action · deferred items}
- **Rules the UI must enforce:** {rule → interaction treatment (§7)}
- **Critical states:** {per view}

### Assumptions & open questions
- INFERRED: {assumption} — {why; confirm?}
- OPEN: {question for the user}
```

The **Derived design requirements** block links analysis to design. Each line must trace back to a journey step, and everything the design later contains must trace to a line here (§9).

---

## 5. Choosing the Main Journeys

Score each candidate journey 1–3 on four factors and keep the top 3–5 (the top 1–2 for a small scope):

| Factor | High (3) when… |
| --- | --- |
| **Frequency** | the actor runs it daily or it is the surface's reason to exist |
| **Business value** | it delivers the releasable outcome, revenue, compliance, or the metric in S1 |
| **Risk / consequence** | a mistake loses data or money, breaks compliance, or is irreversible |
| **First-use criticality** | it is the path a new user must succeed on (onboarding, first creation, first success) |

Rare paths still get designed, as reachable but quiet: admin, bulk and error-recovery paths live in the tertiary tier or a secondary view. A journey you drop from "main" is not deleted; list it under "other journeys" with where it is served.

---

## 6. Information Priority Method

Work per view, at each decision point from S4.

1. **Inventory** every piece of information and every action the view could show, from the journey steps it hosts, the entity fields, and the rules.
2. **Score** each item 1–3 on:
   - **Need at the decision** — does the user need it to make THIS step's decision? (3 = cannot decide without it; 1 = nice to know)
   - **Frequency** — how often the item is used across visits.
   - **Cost of missing it** — what goes wrong if the user misses it (3 = error, loss, compliance breach).
3. **Tier** by score and by the journey:

   | Tier | Rule | Treatment |
   | --- | --- | --- |
   | **Primary** | Needed now, for the main journey's current decision | The view's single focal point (`UI-1.1`), top of the reading order, strongest signal (`UI-1.2`); ONE primary action matching the journey's next step |
   | **Secondary** | Supports the decision, or is used often | Visible and subdued; grouped by proximity near what it supports |
   | **On demand** | Needed occasionally, by experts, or for edge cases | Progressive disclosure — expanders, details panels, hover or secondary views; always reachable, never in the way |
   | **Not here** | Belongs to another step or view | Moved to its owning view (record where), or deferred to a later step (`now / later / not here` in `SYNC:ui-intent-layer`) |

4. **Check the result:** the primary tier fits the view's first read; the primary action is one clear verb that matches the user's intent; nothing high-cost-of-missing sits in "on demand"; creation asks only for the smallest valid record (checklist `R1`–`R2`).
5. **Order within a tier** by the user's reading and decision order (the journey's step order), not by the database's field order.

---

## 7. Business Logic → Interaction Map

Read each business rule from S4 and choose the lightest treatment that PREVENTS the error before one that REPORTS it (Nielsen: error prevention before error messages).

| Rule kind | Interaction treatment | Anti-pattern |
| --- | --- | --- |
| Required data | Ask only at the step that needs it; clear required markers; sensible defaults from context | A long up-front form with everything required |
| Format / range / limit | Constrained inputs (pickers, masks, steppers), live counters, inline hints before submission | Free text then a rejection after submit |
| Conditional field or option | Show it only when its condition holds; explain why an option is unavailable | Show everything, then error on the invalid combination |
| Permission / role | Hide what the actor can never do; disable with a reason what they cannot do right now; server remains the authority | A visible action that fails with "forbidden" |
| Status / state machine | Show the current status prominently; offer only the transitions valid from it; show what happens next | Every action on every status, gated by error messages |
| Calculation / derived value | Show it read-only, next to its inputs, with how it was derived when trust matters | A number with no provenance the user must re-check elsewhere |
| Irreversible or destructive | Undo when possible; otherwise a confirmation that names the consequence and the object (`UI-5.3`) | A generic "Are you sure?" on every action |
| Asynchronous / long-running | Immediate acknowledgement, progress, a completion signal, and a safe place to leave (`UI-5.1`) | A frozen button or a silent background job |
| Concurrency / stale data | Freshness indicator, conflict resolution that keeps the user's work (`UI-7.5`) | Last-write-wins that silently discards input |
| Side effect (notify, email, charge) | State the side effect before the action and confirm it after | A surprise email or charge |
| Duplicate prevention | Disable while in flight; detect likely duplicates and offer the existing record | Double submission creating two records |

---

## 8. UX Laws & Heuristics — reference

Use these as reasoning tools when a decision needs a WHY. They are heuristics, not thresholds (see Provenance).

| Law / heuristic | What it says | Apply it to |
| --- | --- | --- |
| **Nielsen's 10 usability heuristics** `[published: Nielsen 1994]` | Visibility of system status · match with the real world · user control and freedom · consistency and standards · error prevention · recognition over recall · flexibility and efficiency · aesthetic and minimalist design · help users recognize, diagnose and recover from errors · help and documentation | The baseline sweep; checklist §A carries them as review checks |
| **Hick's law** `[published: Hick 1952; Hyman 1953]` | Decision time grows with the number and complexity of choices | Fewer options per decision, sensible defaults, progressive disclosure, grouped menus |
| **Fitts's law** `[published: Fitts 1954]` | Time to hit a target depends on its distance and size | Large, near primary actions; destructive actions away from frequent ones |
| **Working-memory limits** `[published: Miller 1956; Cowan 2001]` | People hold only a few chunks in mind at once | Chunk information, keep context visible across steps, never make users remember data from a previous screen |
| **Jakob's law** `[published: Nielsen 2000]` | Users spend most of their time in other products and expect yours to work the same way | Follow platform and house conventions; innovate only where it serves the job |
| **Tesler's law** (conservation of complexity) `[published: Tesler]` | Every task has irreducible complexity — someone must carry it | Let the system carry it: defaults, inference, automation |
| **Doherty threshold** `[published: Doherty & Thadani 1982]` | Productivity rises sharply when the system responds within about 400 ms | Immediate feedback, optimistic UI, skeletons for longer waits |
| **Progressive disclosure** `[published: Nielsen Norman Group]` | Show what most users need now; reveal the rest on request | The on-demand tier of §6 |
| **Recognition over recall** `[published: Nielsen 1994]` | Recognizing is easier than remembering | Visible options, recent items, autocomplete, inline examples |
| **Goal-gradient effect** `[published: Hull 1932; Kivetz et al. 2006]` | Motivation rises as the goal gets closer | Show progress in multi-step flows; front-load quick wins |
| **Peak–end rule** `[published: Kahneman et al. 1993]` | People judge an experience by its peak and its end | Make the completion moment clear and satisfying; soften the worst moment (errors, waits) |
| **Serial-position and isolation effects** `[published: Ebbinghaus 1885; von Restorff 1933]` | First and last items are remembered best; the distinct item stands out | Key items first or last; exactly one visually distinct primary action |
| **Postel's law** `[published: RFC 761, 1980]` | Be liberal in what you accept, conservative in what you send | Accept varied input formats and normalize them; output consistent formats |
| **Gestalt grouping** `[published: Wertheimer 1923]` | Proximity, similarity and common region imply relationship | Group by proximity first (`UI-1.3`); a container only for a real boundary |

---

## 9. Validation — walk the journeys

**Cognitive walkthrough** `[published: Wharton, Rieman, Lewis & Polson 1994]` — for each main journey, step through the produced design as the named actor, and for every step answer:

1. Will the user try to achieve the right effect — do they know this step is needed?
2. Will they notice that the correct action is available?
3. Will they associate that action with the effect they want (label, icon and placement match their vocabulary)?
4. After acting, will they see that progress was made (feedback, state change, next step obvious)?

Record each "no" as a finding with the step, the view, the element, and the fix.

**Traceability matrix** — one row per journey step:

| Journey · step | View | Element(s) serving it | Information shown (tier) | Rule enforced | States covered | Walkthrough result |
| --- | --- | --- | --- | --- | --- | --- |

Two defects the matrix exposes: an **unserved step** (a step with no view or element) and an **orphan element** (an element that traces to no step, need or rule — delete it or justify it).

**Metrics when the project can measure them:** task success rate, time on task, error rate, and satisfaction (SUS) or a HEART-style goal-signal-metric set `[published: Rodden, Hutchinson & Fu 2010]`. Name the metric from S1 so the design can be judged after release.

---

## 10. Depth by Scope — proportional, never zero

| Scope | Journey Report depth | Walkthrough |
| --- | --- | --- |
| **Tweak** — one component, copy, or state on an existing view | 3–5 lines: the actor, the journey and step the component serves, the information priority it changes | One-line check that the step still completes |
| **New or reshaped view** | Actors & jobs, 1–2 main journeys with step tables, derived requirements for that view | Walkthrough of those journeys |
| **New flow or feature** | The full template (§4), 3–5 main journeys | Full walkthrough + traceability matrix |
| **Product or large idea** | The full template per capability area, plus the cross-feature navigation map | Full walkthrough per capability + a `CL-*` sweep |

**Recreation modes** (a screenshot or video to reproduce) still infer the journeys the observed UI serves and report them. Recreating the pixels without the journey reproduces its defects: a violation found on the walk is recorded and corrected, never silently copied.

**Skip ONLY** when the work has no user-facing surface (backend-only, tooling, docs) — state that explicitly so the skip is auditable.

---

## 11. Consumers & Single-Sourcing Map

| Concern | Single source | NEVER duplicate into |
| --- | --- | --- |
| Journey-first gate `UX-1`–`UX-11` | `SYNC:ux-journey-gate` | skill bodies (carry the SYNC block, guide line or reminder instead) |
| Expert process, templates, laws, walkthrough | **this file** | any skill body (point here) |
| Tech-agnostic view inventory, navigation map, per-story flows in specs | `SYNC:ui-intent-layer` | this file (referenced only) |
| Existing-UI inventory and connected flows | `SYNC:existing-ui-research` | — |
| 40 usability clauses `UI-1.1`–`UI-9.4` | `SYNC:ui-ux-design-principles` | this file (referenced only) |
| Visual identity, design plan, tell catalog | `.claude/docs/design-knowledge.md` + `SYNC:design-distinctiveness-gate` | this file |
| Review procedure and check catalog | `.claude/docs/design-review-checklist.md` + `SYNC:design-review-checklist` | this file |
| Project tokens, components, principles | the project's design-system docs under the project-reference root | this file (NEVER names project-specific values) |

---

## 12. Interaction Cost & Navigation (`UX-9`, `UX-10`)

**Interaction cost** is the sum of mental and physical effort a user spends to reach a goal `[published: Nielsen Norman Group, "Interaction Cost"]`: reading, scanning, deciding, remembering, clicking, typing, scrolling and waiting. Measure it per main journey. Never judge by click count alone: the "3-click rule" has no supporting data, and users keep clicking while each click feels like the right path (information scent) `[published: Nielsen Norman Group, "The 3-Click Rule for Navigation Is False"; Porter 2003]`.

| Per main journey, record | Reduce by |
| --- | --- |
| Steps (views or stages crossed) | Merging steps that share one decision context; deferring optional enrichment to later |
| Clicks / taps | Defaults, inline actions, bulk actions, remembered choices |
| View changes / page loads | Inline edit, side panels for peek-and-return, keeping context on screen |
| Fields typed | Defaults from context, pickers, autocomplete, asking only for the smallest valid record (checklist `R1`–`R2`) |
| Decisions | Fewer options per decision (Hick), a recommended default, progressive disclosure |
| Waits | Optimistic UI, background work with a completion signal (`UI-5.1`) |

Compare against the existing flow, or the spec's per-story flow when nothing exists yet. A journey whose cost RISES needs a stated reason. Frequent journeys get the shortest path; rare and admin paths may sit deeper, if they stay reachable and labelled.

**Important information display.** Users give most attention to the first screenful: about 57% of viewing time above the fold and 74% within the first two screenfuls `[published: Nielsen Norman Group, "Scrolling and Attention", 2018]`. They scan rather than read, in F-shaped or layer-cake patterns across headings and the first words of lines `[published: Nielsen Norman Group, "Text Scanning Patterns: Eyetracking Evidence"]`. So the §6 primary tier belongs in the first viewport, and labels, headings and table columns front-load the distinguishing word. Answers come first and detail after (inverted pyramid).

**Wayfinding checklist (every view):**

| Question the user asks | The view must show |
| --- | --- |
| Where am I? | The current location marked in navigation (active item, title, breadcrumb or step indicator). Omitting it is the most common menu mistake `[published: Nielsen Norman Group, "Navigation: You Are Here"]` |
| Where can I go? | Destinations labelled in the user's words, with strong scent — no vague, branded or internal terms |
| How far along am I? | For multi-step flows, the step position and what remains (goal-gradient) |
| How do I get back or out? | Back, cancel or exit that keeps entered data; no trap views |
| What happens next? | The primary action names its outcome; the next journey step is obvious |

**Navigation map checks:** every main journey has a visible entry point · no dead-end or orphan view · every view works from a deep link (users often arrive mid-product, not from the home view) · navigation placement and labels stay consistent across views · the hierarchy stays shallow on frequent paths, with depth only where scent is strong.

---

## 13. The UI/UX Gate Report (`UX-11`)

Every design output closes with this table, in the response or the artifact. It is the AI's self-check that ALL design rule sets ran. A gate missing from the table counts as not checked.

```markdown
## UI/UX Gate Report — {surface}
| Gate | Scope checked | Result | Evidence (location / measurement) |
| --- | --- | --- | --- |
| UX-1 Journey Report | {journeys} | PASS | {report section} |
| UX-2 Design authority read | {paths} | PASS / N/A (none configured) | {paths checked} |
| UX-3 Screens = journey steps | {views} | PASS / FAIL → fixed | {traceability rows} |
| UX-4 Important information first | {views} | … | {primary tier per view, first-viewport check} |
| UX-5 Rules → interaction | {rules} | … | … |
| UX-6 Mental model | … | … | … |
| UX-7 Low-fi before hi-fi | … | … | {sketch reference} |
| UX-8 Walkthrough + traceability | {journeys} | … | {walkthrough log} |
| UX-9 Interaction cost | {journeys} | … | {steps · clicks · view changes · fields · decisions vs baseline} |
| UX-10 Navigation & wayfinding | {views} | … | {where-am-I / back-path per view} |
| UI-1.1–UI-9.4 usability & a11y floor | {applicable clauses} | … | {measured contrast, targets, states} |
| DD-1–DD-8 identity | {design plan} | … | {generic-test revision} |
| CL-1–CL-6 review checklist | {full sweep or CL-5 triage} | … | {findings by P0–P3} |
| UI copy (`SYNC:ui-copywriting`) | {strings} | … | … |
```

Result values: `PASS` · `FAIL → fixed` (name the fix) · `FAIL — open` (blocks hand-off; goes to Open Questions with an owner) · `N/A (reason)`. Never mark `PASS` without evidence. An unmeasurable check is `NOT VERIFIABLE`, never a guessed number (checklist `CL-2`).

---

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** derive every interface from the people who use it — who they are, the job they came to do, and how they move through the screens to finish it — so screens, information priority and interactions are consequences of that analysis, never taste.

**IMPORTANT MUST ATTENTION** follow the BLOCKING order: analyze and REPORT the main user journeys (`UX-1`) → read the project's design principles, design system and existing UI when they exist (`UX-2`) → only then generate. No wireframe, mockup, design plan, token or code comes first.

**IMPORTANT MUST ATTENTION** ground journeys in evidence (§3) — spec, stories, business logic, existing UI — tagged `SOURCED` or `INFERRED`, and confirm an inferred primary actor, main job or success outcome with the user — with no question tool, record it `INFERRED — unconfirmed (no question tool)` and continue, never block.

**IMPORTANT MUST ATTENTION** compute information priority per decision point (§6) and let the visual hierarchy implement it; turn business rules into prevention, not error messages (§7).

**IMPORTANT MUST ATTENTION** measure interaction cost per main journey and check wayfinding on every view (§12), then close every design output with the UI/UX Gate Report covering `UX-*`, `UI-*`, `DD-*`, `CL-*` and UI copy (§13). An unlisted gate was not checked, and an unresolved `FAIL` blocks hand-off.

**IMPORTANT MUST ATTENTION** walk every main journey through the produced design (§9) and fix every unserved step and orphan element before hand-off. Scale depth to scope (§10), but never to zero for a new or reshaped view.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| --- | --- |
| "The brief is clear, the journey is obvious" | Then the report takes five lines. An unwritten journey is an unchecked assumption. |
| "It's just a mockup" | A mockup is where stakeholders approve the flow; a mockup without the journey approves a picture. |
| "I'll read the design system while building" | `UX-2` runs BEFORE generation — a design built first and reconciled later is rework, and the reconciliation usually loses. |
| "The screenshot already shows the layout" | Recreation still serves a journey; infer it, report it, and record the violations the walk exposes. |
| "There's no spec, so I can't know the rules" | The rules are in the stories, the acceptance criteria and the code; read them, or list the unknowns as open questions. |
| "Everything on this screen is important" | Then nothing is. Score it (§6); one focal point, one primary action. |
