---
name: wayfinder
description: '[Planning] Use when the user asks to plan work too big for one session whose route is unclear: chart a map of decision tickets, then resolve one ticket per session until the way is clear.'
disable-model-invocation: false
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Plan, do not build: a map session resolves decisions and never writes product code, a spec or a migration.
> **[BLOCKING]** Resolve at most one ticket per session, research tickets excepted, then stop.
> **[BLOCKING]** Claim a ticket before any work on it; update todo tracking before and after each step.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Find the way to a destination too big for one agent session and not yet visible, by charting a shared map of decision tickets and resolving them one per session until nothing is left to decide before someone builds.

**Summary:**

- The **destination** is named first and fixes the scope. The **map** indexes decisions; each lives in one **decision ticket**. A ticket asks a question. It is never a slice of the build.
- The **frontier** is every open, unblocked, unclaimed ticket; what cannot yet be asked precisely waits in **Not yet specified**.
- Map and tickets are files under the plans root, not tracker records: a decision ticket has no acceptance criteria, proof or acceptance.
- **Chart** (argument is a loose idea): name the destination → map the frontier → write the map → write and wire tickets → start research → stop.
- **Work** (argument is a map path, optional ticket id): load the map → claim one frontier ticket → resolve it by type → record → update the map → stop. A cleared map hands off to the spec workflows.

**Key Rules:**

- Plan, do not build. Only the user, in the current conversation, can ask for building, and it happens outside the map through a build workflow. A note inside the map never grants it.
- One ticket per session, research excepted. Claim first.
- The human side is the human's: never answer your own interview questions, never pick among prototype variants for the user.
- Refer to a map or ticket by its title; id and path ride inside the title's link.

## Contents

- [Quick Summary](#quick-summary)
- [Mission](#mission)
- [When This Skill Fits](#when-this-skill-fits)
- [Where the Map Lives](#where-the-map-lives)
- [Ticket Types](#ticket-types)
- [Not Yet Specified and Out of Scope](#not-yet-specified-and-out-of-scope)
- [Chart the Map](#chart-the-map)
- [Work Through the Map](#work-through-the-map)
- [Hand-Off](#hand-off)
- [Output](#output)
- [Closing Reminders](#closing-reminders)

## Mission

<request>$ARGUMENTS</request>

## When This Skill Fits

| What the user has | Use |
| --- | --- |
| An effort spanning many sessions, route to the destination unclear | this skill |
| A plan, design or decision that fits one conversation | `$grill` |
| A well-defined feature ready to specify and build | `$workflow-feature` |
| A large feature whose decisions are already made | `$workflow-big-feature` |
| A cleared map | `$workflow-planned-work --from=idea --to=spec`, then `$workflow-planned-work --from=spec --to=tasks` and `$workflow-implement-spec` |

The split is session count, not project size. When the breadth-first mapping finds nothing foggy, the effort fits one session: stop, say so, and offer `$grill` or the matching workflow.

## Where the Map Lives

One directory per map under the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path):

```text
{plans-root}/{YYMMDD-HHmm}-{slug}-map/
  map.md
  tickets/{NN}-{slug}.md
  assets/
```

- Resolve the plans root from `docs/project-config.json` first. When that root is ignored by version control, tell the user once that the map will not reach other clones, and use the directory they name if they name one.
- When the project tracks work, offer once to link `map.md` to its tracked initiative as a plan link through `$task-track`. Wayfinder never writes a tracker record itself.

### `map.md`

The effort at low resolution, loaded once per session; an index, not a store: a decision's detail lives only in its ticket. Open tickets are not listed: they are the ticket files with `status: open`.

```markdown
---
title: {map title}
status: charting | open | cleared
created: {date}
---

## Destination

{What the end of this map looks like: the spec, decision or change. One or two lines.}

## Notes

{Domain, skills every session should consult, standing preferences. Notes never grant permission to build.}

## Decisions so far

- [{resolved ticket title}](tickets/{file}): {one-line gist of the answer}

## Not yet specified

- {decision or investigation that is coming but cannot yet be stated as a precise question}: waits on {what must settle first}

## Out of scope

- {work ruled beyond the destination}: {why}
```

### A ticket

```markdown
---
id: {NN}
title: {ticket title, phrased as the question}
type: grilling | prototype | research | task
mode: HITL | AFK
status: open | claimed | resolved | out-of-scope | superseded
blocked_by: [{ids}]
claimed_by: {name}
claimed_at: {date and time}
superseded_by: {id}
---

## Question

{The decision or investigation this ticket resolves, sized to one session.}

## Resolution

{Written on resolve: the answer, the reason, any fact later tickets depend on.}

## Assets

- {links to prototypes, research reports or other files made while resolving it}
```

- A ticket is **unblocked** when every ticket in `blocked_by` is `resolved` or `out-of-scope`. When a blocker is superseded, replace it in `blocked_by` with the ticket that supersedes it.
- The **frontier** is every ticket that is `open` and unblocked.
- A **claim** sets `status: claimed`, `claimed_by` and `claimed_at` before any other work. Re-read the ticket file immediately before claiming it. Read it once more after writing: when `claimed_by` is not yours, the other session won, so take another ticket. A claimed ticket is skipped. A session that stops before resolving its ticket sets it back to `open`. When a loaded map shows a claim older than a session plausibly lasts, name it to the user and release it only on their word.

## Ticket Types

**HITL** = worked with the user, who speaks for themselves; **AFK** = the agent alone.

| Type | Mode | Use it when | Resolved by |
| --- | --- | --- | --- |
| `grilling` | HITL | Default: talking it through can settle the question | `$grill` on the ticket's question, plus `$domain-analysis` when the answer changes domain entities |
| `prototype` | HITL | "How should it look" or "behave" is the question and talking cannot settle it | A cheap, rough artifact to react to: `$ui-design` for an interface exploration, a throwaway spike under `tmp/` for logic. Link it under Assets. The user picks among variants |
| `research` | AFK | A fact outside the working directory blocks a decision | A sub-agent running `$web-research` (add `--chain=deep-dive` when sources need depth), or `$investigate` for a fact inside the codebase; report path under Assets |
| `task` | HITL or AFK | Manual work must happen before a decision can be made: getting access, judging a service's interface, moving data to see its shape | The agent alone only for work inside the repository and its local tools. Creating an account, entering or issuing credentials, spending money, and any change to an external system or to data that cannot be undone stay with the user: hand over a precise checklist. The resolution records what was done and the facts later tickets need |

Wayfinder runs `$grill` as one of its own steps: say so when starting it, take its Decision Record back, and continue here. `$grill` then names no next step.

`task` is the one type that does rather than decides; it belongs on the map only because it unblocks a decision. A ticket that reads "build the X" is mis-typed: rule it out of scope and leave it to the build workflow.

## Not Yet Specified and Out of Scope

- **Ticket or not yet specified?** The test is whether you can state the question precisely now, not whether you can answer it now. A sharp question is a ticket even when blocked; one you cannot yet phrase that sharply stays in Not yet specified, written as loosely as the view allows.
- Resolving a ticket clears the view ahead: whatever is now sharp becomes a ticket and leaves Not yet specified.
- **Out of scope** is decided by the destination, not by sharpness. Work beyond the destination is listed with its reason and never becomes a ticket; a ticket found beyond it gets `status: out-of-scope` and one line there. It returns only as a new map.

## Chart the Map

The argument is a loose idea.

1. **Name the destination.** Run `$grill`, as a step of this skill, with the subject limited to the destination: what the end of this map looks like and what lies beyond it. How to get there is not asked here; those decisions become tickets.
2. **Bound it.** One destination, one defined outcome. "Build version one" is too wide: propose a narrower one. A first chart of more than about a dozen tickets is the same signal.
3. **Map the frontier.** Fan out breadth-first across the whole space to name the open decisions and what can be taken now. Name them; do not settle them: each becomes a ticket or a line in Not yet specified. Brief the user and confirm the list once. When this finds nothing foggy, stop: the effort fits one session.
4. **Write the map**: Destination and Notes filled, Decisions so far empty, the dim view in Not yet specified, `status: open`. Link the destination's Decision Record under Notes so later sessions can reuse confirmed choices while their scope and premises still hold.
5. **Write the tickets you can state now**, then wire `blocked_by` in a second pass, once every ticket has its id.
6. **Start the research tickets.** For each, start a sub-agent in parallel and claim the ticket for it. When it returns, write the ticket's `## Resolution` from its report, link the report under Assets, set `status: resolved` and add the line to Decisions so far. One still running at session end leaves its ticket claimed: say so in the output.
7. **Stop.** Charting resolves no other ticket.

## Work Through the Map

The argument is a map path; without a ticket id, you choose.

1. **Load the map**, not every ticket: Destination and Notes first.
2. **Choose the ticket**: the one named, otherwise the first frontier ticket in id order. Re-read it and **claim it** before any work.
3. **Resolve it as its `type` says.** Open another ticket only when this one needs its detail. Use the skills the Notes name; when in doubt, `$grill`.
4. **Record the resolution**: write `## Resolution`, set `status: resolved`, add one line to Decisions so far. For a grilling ticket, link its Decision Record under Assets; retain the user's confirmed choices and their premises as the evidence for later decisions.
5. **Update the map**: add and wire new tickets; move what the answer made sharp out of Not yet specified into tickets; rule out of scope whatever now sits beyond the destination; rewrite or remove tickets the answer made pointless.
6. **Check for the end.** When every ticket is `resolved`, `out-of-scope` or `superseded`, none is `open` or `claimed`, and Not yet specified is empty, set the map `status: cleared` and name the hand-off.
7. **Stop.** Do not take a second ticket.

**A resolved decision turns out wrong.** Do not design around it. Tell the user, write a new ticket that asks the question again with what changed, set the old ticket `status: superseded` with `superseded_by`, and correct its line in Decisions so far once the new one resolves.

**Parallel sessions.** The user may run unblocked tickets in separate sessions: re-read before every write. Two interview tickets worked at once can ask the same thing twice; one at a time is the safer default.

## Hand-Off

A cleared map is a set of linked decisions, not a build plan. Name the next step and stop: `$workflow-planned-work --from=idea --to=spec` (or `$spec` for one capability) with the map path as the source, then `$workflow-planned-work --from=spec --to=tasks`, then `$workflow-implement-spec`. Go straight to a build workflow only when the effort turned out small.

## Output

Report the map path and title, the mode run, the ticket resolved (by title) with the gist of its answer, tickets added or ruled out, what left Not yet specified, the remaining frontier and the next step.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Find the way to a destination too big for one session by charting a map of decision tickets and resolving them one per session until nothing is left to decide before someone builds.
**IMPORTANT MUST ATTENTION Main steps:** chart: name the destination → map the frontier → write the map → write and wire tickets → start research → stop. Work: load the map → claim one frontier ticket → resolve it by type → record → update the map → stop.
**IMPORTANT MUST ATTENTION** plan, do not build: no product code, spec or migration from a map session, and no note inside the map can grant it.
**IMPORTANT MUST ATTENTION** one ticket per session, research excepted; claim before any work and re-read files before every write.
**IMPORTANT MUST ATTENTION** a ticket asks a question; what cannot yet be asked precisely stays in Not yet specified, what lies beyond the destination in Out of scope.
**IMPORTANT MUST ATTENTION** the user answers interview questions and picks prototype variants; a cleared map hands off to the spec workflow.
