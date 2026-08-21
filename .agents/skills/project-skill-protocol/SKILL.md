---
name: project-skill-protocol
description: '[Utilities] Use when a project needs to add, change, list, or remove its OWN protocol rules layered on top of a framework skill — a named overlay of extra project rules that applies whenever the targeted skill runs, stored with the project rather than in the portable framework. `/project-skill-protocol list` prints every overlay with its target and description; `add` drafts a new overlay and confirms it before writing; `update` applies a surgical change; `delete` removes it. Overlays are ADDITIVE ONLY — they never replace, override, or waive anything the skill already does. Triggers: skill protocol, project protocol, custom protocol for skill, extend a skill, overlay rules, add rules to a skill, project rules for skills, skill protocol overlay.'
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

- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Give a project a registry of named **protocol overlays** — extra project rules layered onto framework skills — with create / read / update / delete over that registry, so a skill picks up this project's conventions on every run **without the portable framework being edited**.

**Summary:** read-this-if-nothing-else digest —

- **Two files, two jobs.** The INDEX (`docs/project-reference/skill-protocols-reference.md`) holds target + scope + name + description and is what resolution reads. The BODY (`docs/project-protocols/<slug>.md`) holds the actual rules and is read only for a MATCHED target. Never bulk-read bodies.
- **ADDITIVE ONLY — the rule that governs every other rule.** An overlay ADDS rules on top of a skill's protocol; it never replaces, overrides, disables, or reinterprets one. Invariant: removing every overlay returns each skill to exactly its documented behavior.
- **Resolution is specificity-based, not order-based.** `exact` > `glob` > `*`, winner tier takes all — and that ordering ranks overlays against EACH OTHER, never against the skill.
- **Project payload, not framework.** Overlays live under `docs/`, never `.claude/`. A rule that stabilizes and generalizes gets PROMOTED to a real skill via `$skill-creator`.
- **ADD authors the best version, then confirms it.** The user's raw wording is raw material, NEVER the artifact. Infer intent, generalize past the incident, draft the body, then run the rules through **`$prompt-enhance`** and the prompt-engineering rubric (imperative · observable · decidable · one rule per line · carries its WHY) — an overlay is an AI instruction that fires unattended, so a vague rule is a nondeterministic one. Show what changed and why, and always offer "save my wording verbatim".
- **Three writes, one turn — then the mirror.** Body + index row + the `CLAUDE.md` `CK:PROJECT-PROTOCOLS` block, then AUTO-RUN the Codex mirror sync (`node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`) so `AGENTS.md` never lags behind the block. Report the sync's real outcome. Never commit.

**Workflow:**

1. **Resolve mode** — parse the invocation into `list` | `add` | `update` | `delete` (Phase 0)
2. **Load contract + index** — read `references/registry.md`, then the index; empty registry branches early
3. **Execute mode** — LIST (Phase 1) · ADD (Phase 2) · UPDATE (Phase 3) · DELETE (Phase 4)
4. **Three writes** — body, index row, and the `CLAUDE.md` block, all in the same turn
5. **Sync the mirror** — auto-run `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` so Codex sees the overlay
6. **Report** — state every path touched AND the sync outcome (pass, or the failing stage); never commit

**Key Rules:**

**MUST ATTENTION** resolve the mode FIRST — a leading `list`/`add`/`update`/`delete` token is a MODE; ambiguous → ask, never guess
**MUST ATTENTION** an overlay is ADDITIVE ONLY and is a brief, not an authority escalation — it can never waive the WORKFLOW-GATE, git discipline, a review gate, or a user-confirmation gate
**MUST ATTENTION** ADD/UPDATE run the drafted rules through `$prompt-enhance` + the prompt-engineering rubric BEFORE the additive-only screen — the deliverable is a precise AI instruction, never a transcription of the request
**MUST ATTENTION** ADD ends at a PROPOSAL GATE — NEVER write a draft the user has not seen, and always offer "save my wording verbatim"
**MUST ATTENTION** every write touches the body AND the index row AND the `CLAUDE.md` block in the SAME turn — a stale block leaves Codex blind to the overlay
**MUST ATTENTION** every write mode ENDS by auto-running the mirror sync, then reports its ACTUAL result — a failed pipeline is reported as a failure with the stage named, never as a completed sync
**MUST ATTENTION** never overwrite on a `Target`+`Scope` collision — ask update-vs-create

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

---

# Project Skill Protocol (project overlay registry)

## Storage Contract

| Artifact             | Path                                                                                     | Written by      | Read when                                       |
| -------------------- | ---------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------- |
| **Index**            | `docs/project-reference/skill-protocols-reference.md`                                    | this skill only | every invocation, and whenever overlays resolve |
| **Bodies**           | `docs/project-protocols/<slug>.md`                                                       | this skill only | only for a MATCHED target                       |
| **Cross-host block** | `CLAUDE.md` between `<!-- CK:PROJECT-PROTOCOLS -->` and `<!-- /CK:PROJECT-PROTOCOLS -->` | this skill only | by both hosts, every session                    |

Path resolution order (stop at first hit):

1. `docs/project-config.json` → `referenceDocs[]` entry whose `filename` is `skill-protocols-reference.md` (portability override)
2. The `**Protocols directory:**` line in the index doc header (the index is self-describing about where bodies live)
3. The defaults in the table above

The index doc is auto-created on SessionStart by `session-init-docs.cjs` (registered in `.claude/hooks/lib/session-init-helpers.cjs` → `DEFAULT_REFERENCE_DOCS`). Because that entry declares a `templatePath`, the hook copies `.claude/templates/reference-docs/skill-protocols-reference.md` **verbatim** — it does NOT emit the generic `PLACEHOLDER_MARKER`. So a fresh install has exactly one table row: the sentinel `_(none yet)_`. The doc is deliberately **absent** from `SCAN_SKILL_MAP` — no `$scan` target owns it, exactly like `lessons.md` is owned by `$learn` and `custom-prompts-reference.md` by `$custom-prompt`.

**Empty-registry test (use this everywhere).** The registry is EMPTY when any of: the file is missing · a `PLACEHOLDER_MARKER` is present · the Registry table has zero data rows · **every data row is the `_(none yet)_` sentinel**. Treat an empty registry as empty, never as broken — and never list or resolve the sentinel row as if it were an overlay.

The full overlay-file contract (frontmatter fields, required sections, index row format, targeting grammar, precedence algorithm, conflict rules, token bounds) lives in **`references/registry.md`** — **read it before any write, and before answering any resolution question.**

---

## Phase 0: Resolve Mode (BLOCKING — before any file read)

Parse the invocation text. An explicit flag always wins; otherwise the **leading token** decides.

| Invocation                                   | Mode                                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| `--mode={list\|add\|update\|delete}`         | that mode, verbatim — no inference                                           |
| empty, `list`, `ls`, `show`, `all`           | **LIST**                                                                     |
| leading `add`, `create`, `new`, `save`       | **ADD**                                                                      |
| leading `update`, `edit`, `change`, `revise` | **UPDATE**                                                                   |
| leading `delete`, `remove`, `drop`           | **DELETE**                                                                   |
| anything else                                | **ADD**, but only after the ambiguity gate confirms it is not a list request |

**Ambiguity gate (BLOCKING).** A leading write-verb that is plausibly part of the rule text (`$project-skill-protocol add a context tag to every review finding` — where "add a context tag …" is itself the rule) → do NOT pick silently. ask the user directly: _"Create a new overlay whose rule is '…'"_ vs _"Show the overlays already defined"_. — why: the two readings write to different files, and guessing wrong either creates registry junk or silently skips the user's real request.

There is deliberately **no MATCH mode.** Matching happens at skill-invocation time via the `CLAUDE.md` block, the `SYNC:project-protocol-overlay` reminder, and the Plane-3 hook — all three implementing `references/registry.md` §3. A fourth resolution path here could disagree with them. — why: two resolvers that can disagree is the exact drift class this registry exists to avoid.

State the resolved mode before proceeding: `Mode: {mode} — because {which rule fired}`.

---

## Phase 1: LIST

1. Read the index. Registry EMPTY by the Storage Contract test → report _"No protocol overlays defined yet"_ and show the one-line add syntax. STOP — do not invent examples.
2. Print every entry as a table: **Target** · **Scope** · **Name** · **Description** · **Updated** · **Body file**.
3. Preserve index order; do not re-sort, re-word, or summarize descriptions — the user wrote them.
4. Close with the total count and the invocation forms (`$project-skill-protocol add …`, `update <name>: …`, `delete <name>`).
5. Past the ~30-row soft cap, warn and propose promoting stable, project-independent overlays to real skills via `$skill-creator`.

LIST reads the index ONLY. Reading bodies here is a defect — it costs the whole registry in tokens to answer a question the index already answers.

---

## Phase 2: ADD

**Never store the user's raw wording as-is.** An add request is raw material; the deliverable is the best version of the overlay the user was reaching for. Author it, then get it confirmed.

1. **Infer the rule intent.** State what would be observably different on a run of the targeted skill once this overlay applies. Too thin to infer an observable difference (a bare topic, a mood) → ask ONE clarifying question before drafting; never invent a rule to fill the template.
2. **Resolve the target and scope.** Which skills should this apply to — one named skill (`exact`), a family (`glob`, e.g. `*-review`), or everything (`all`, target `*`)? Not stated → ask; do not default to `*`. — why: `*` is the widest possible blast radius and the tier a user is least likely to have meant.
3. **Generalize.** Climb from the incident to the standing convention — strip ticket IDs, dates, one-off paths, and today's specifics. An overlay fires on every future invocation of its target, not only on the case in front of you.
4. **Draft the body** into the template in `references/registry.md` §1: `## Applies to` · `## Rules` (imperative, observable, one-clause WHY each) · `## Rationale` · `## Out of scope`, plus the required frontmatter.
5. **Prompt-engineering pass (BLOCKING — the deliverable is an AI instruction, not a note).** An overlay body is a PROMPT: it is injected into a live run and the model must obey it without the author present to clarify. Run the drafted `## Rules` through **`$prompt-enhance`** and apply its result.

    Scope it to the RULES text — do NOT restructure the overlay into a skill file (no `Quick Summary`, no `Closing Reminders`; the body template in §1 is the shape). Take from `prompt-enhance`: caveman compression of the prose, then attention anchoring, with its hard constraint that **rule density must not drop and no rule, constraint, or `file:line` evidence may be lost.**

    Then hold every rule against this rubric, rewriting until each one passes:

    | Test                                                                                              | Reject                                                     | Prefer                                                      |
    | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
    | **Imperative**                                                                                    | "it would be good if findings had context"                 | "Tag every finding with its bounded context"                |
    | **Observable** — a reader can tell from the output whether it was followed                        | "be thorough"                                              | "Cite `file:line` for every claim"                          |
    | **Decidable** — no vague qualifier the model must guess at                                        | "reasonably", "appropriate", "as needed", "where possible" | a named threshold, list, or condition                       |
    | **Positive form** — say what to DO, not only what to avoid                                        | "don't skip the schema"                                    | "Read the schema first, then …"                             |
    | **Self-contained** — no pronoun pointing outside the body, no "as discussed", no ticket reference | "apply the rule from the standup"                          | the rule, stated                                            |
    | **One rule per line** — a compound rule half-fires                                                | "Validate input and log it and alert"                      | three numbered rules                                        |
    | **Carries its WHY in one clause**                                                                 | bare directive                                             | "… — why: a silent failure here is invisible until release" |
    | **Triggerable** — states WHEN it applies if not always                                            | "use the strict parser"                                    | "When the payload is user-supplied, use the strict parser"  |

    — why: an overlay fires unattended on every future run of its target. A vague rule is not a weak rule, it is a **nondeterministic** one: the model resolves the ambiguity differently each run, so the overlay produces inconsistent behavior that reads like a model defect rather than an authoring defect. Precision at authoring time is the only point where that is cheap to fix.

    **This pass never adds authority.** It sharpens wording only — it may not broaden a rule's target, escalate its force, or introduce a rule the user did not ask for. Anything it adds beyond rephrasing is surfaced at the gate under _what you changed and why_.

6. **Additive-only screen (BLOCKING).** Read every drafted rule against the targeted skill's own protocol. Any rule that would ignore, skip, replace, relax, disable, or reinterpret a framework rule — or that would waive the WORKFLOW-GATE, git discipline, a review gate, or a user-confirmation gate — is **REFUSED**: drop that line from the draft and name it at the gate as refused, with the reason. The remaining rules proceed. — why: a stored overlay is a persistent instruction; an override rule turns the registry into a standing bypass of every safety control in the harness.
7. **Target-collision check (BLOCKING).** An existing index row with the same `Target` **and** `Scope` → ask the user directly: _update the existing `<name>`_ vs _create a second overlay for the same target_. NEVER overwrite silently. — why: silent overwrite destroys a body the user cannot recover from the index.
8. **Contradiction pre-check (BLOCKING).** Resolve the draft's target per `references/registry.md` §3 and compare its rules against every overlay that would land in the SAME tier. A direct contradiction → surface BOTH rules to the user and let them choose; never resolve it yourself, and never write an overlay you know contradicts a live one without saying so.
9. **PROPOSAL GATE (BLOCKING).** Present the draft before writing anything to disk:
    - the proposed **name**, **target**, **scope**, and **description**, each on its own line
    - the drafted **rules** in full — the user is approving content, not a summary
    - **which skills this will actually match**, resolved and listed by name, so the blast radius is visible rather than inferred
    - **what you changed and why** — one line per substantive edit, plus anything you ADDED that the user never said
    - **the prompt-engineering rewrite**, where step 5 changed the user's phrasing: show the user's wording and yours side by side for any rule whose MEANING could be read differently, so an over-eager rewrite is caught here rather than at the next run
    - **any rule you REFUSED** under step 6, quoted, with the reason
    - **open assumptions** you had to make

    Then ask the user directly with: _Save the improved version (Recommended)_ · _Let me correct the name/target/scope first_ · _Save my wording verbatim instead_ · _Cancel_.

    **NEVER write a draft the user has not seen.** — why: an overlay changes how a skill behaves on every future run; an unreviewed rewrite silently substitutes your inference for the user's intent, and the divergence only surfaces later when the skill does the wrong thing.

10. **Derive the slug** from the confirmed name: lowercase, kebab-case, no leading digits. Collision after step 7 → suffix `-2`, `-3`.
11. **Perform the three writes, in the same turn** (see [Three Writes](#three-writes-one-turn)).
12. Report every path written. **Do not commit** — report and stop.

---

## Phase 3: UPDATE

1. Resolve the target overlay by exact name; no exact hit → list the close matches and confirm which one.
2. **Read the existing body first.** Never regenerate from the index row.
3. Apply steps 1–9 of Phase 2 **scoped to the requested change only** — including the additive-only screen on any new or edited rule.
4. **Surgical diff, not a rewrite.** Every section the user did not ask to change is preserved byte-identically. — why: an update is not a re-authoring; silently regenerating untouched sections discards refinements made by hand.
5. Bump `version` — patch for wording, minor for a changed rule, major for a changed `target`/`scope`/purpose — and set `updated` to today.
6. A changed `target` or `scope` re-runs the target-collision and contradiction pre-checks against the NEW tier before the gate.
7. Perform the three writes. Report the paths. Do not commit.

---

## Phase 4: DELETE

1. Resolve the target by exact name; no exact hit → list the close matches and confirm which one.
2. ask the user directly to confirm, showing the **description, target, and body path** being removed.
3. Delete the body file, remove the index row, and refresh the `CLAUDE.md` block — same turn.
4. When the removal empties the registry, restore BOTH empty states — they use different literals and are not interchangeable: the index table gets its `_(none yet)_` sentinel row back, and the block's last line becomes exactly `Active overlays: _(none)_`. Never leave a table header with no rows.
5. Auto-run the mirror sync (§ _After the three writes_), then report all three removals plus the sync outcome. Do not commit.

---

## Three Writes, One Turn

Every write mode (ADD, UPDATE, DELETE) touches exactly these three carriers, together:

| #   | Carrier                                                                         | What it gets                                                         | Fails alone as                                                                     |
| --- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | `docs/project-protocols/<slug>.md`                                              | the body — full rules                                                | a body with no index row is unreachable                                            |
| 2   | `docs/project-reference/skill-protocols-reference.md`                           | one index row, description copied VERBATIM from the body frontmatter | an index row with no body is a broken resolution                                   |
| 3   | `CLAUDE.md` `CK:PROJECT-PROTOCOLS` block — **the `Active overlays:` line ONLY** | names + targets only, never rule text                                | a stale list leaves Codex blind, because `AGENTS.md` is generated FROM `CLAUDE.md` |

Write **all three or none.** Confine every write to the region between the `CK:PROJECT-PROTOCOLS` markers — never the surrounding file. Both markers absent → report it and offer to insert the block rather than writing a partial state.

> **[BLOCKING] Inside those markers, edit ONE line.** The block's `[PROJECT-PROTOCOL-OVERLAY]` directive prose — the resolution rule, the precedence clarifier, the ADDITIVE-ONLY paragraph, the authority carve-out, the contradiction rule — is FIXED framework text. Reproduce it byte-for-byte; never rewrite, summarize, condense, or "clean up" any of it. The **only** line a write mode changes is the final `Active overlays:` line. "Names + targets only" (carrier 3 above) describes that ONE line, not the block.
>
> Why this is blocking: replacing the block body with a bare overlay list deletes ADDITIVE-ONLY from the only plane both hosts always read, `$sync-codex` then copies the deletion into `AGENTS.md`, and every drift sensor still passes because the `Active overlays:` line is present and correct. From that point an overlay saying _"skip step 4"_ is obeyed instead of refused. See `references/registry.md` § _The block has one mutable line_.

**Empty state:** when the registry has no overlays, the `Active overlays:` line reads exactly `Active overlays: _(none)_`. Note this is a DIFFERENT literal from the index table's `_(none yet)_` sentinel row — the two are not interchangeable, and a sensor asserts each one.

Nothing outside these three paths is ever written by this skill DIRECTLY. The mirror sync it runs afterwards regenerates `AGENTS.md`, `.agents/`, and `.codex/` — those are generated artifacts produced by the pipeline, never hand-edited here.

### After the three writes — regenerate the Codex mirror in the SAME turn

`AGENTS.md` is a GENERATED mirror of `CLAUDE.md`; writing carrier 3 does not update it. Until the mirror is regenerated, the overlay exists for Claude and is invisible to Codex — the exact Claude-only outcome carrier 3 exists to prevent.

**So every write mode (ADD, UPDATE, DELETE) auto-runs the mirror sync as its final step — no user prompt, no "it's now stale" hand-off:**

```bash
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs
```

This is the documented standalone entry point of `$sync-codex` — the same 16-stage pipeline, invoked directly so the refresh does not depend on the user typing a second command. Run it ONLY after all three writes have landed; syncing a half-written state mirrors the half-written state.

**Rules for the auto-sync:**

- **Report the pipeline's real outcome — never assume it.** Read the exit code. All stages pass → say the mirror is fresh. ANY stage fails → say so, name the failing stage, and state plainly that `AGENTS.md` may still be stale. NEVER report a successful sync you did not observe, and NEVER let a sync failure silently downgrade to "done".
- **A sync failure does not roll back the three writes.** They are already correct and stay. Report the failure and offer to fix it or to re-run `$sync-codex`; the overlay is live for Claude either way.
- **Sync mutates generated trees, it does not commit.** The pipeline regenerates `.agents/`, `.codex/`, and `AGENTS.md` — hundreds of files. That is expected. The no-commit rule is unchanged and absolute: still never `git add`, `commit`, or `push` without an explicit ask.
- **This is the ONE authorized programmatic sync in the framework.** It exists because this skill is the only writer of a `CLAUDE.md` block whose whole purpose is cross-host reach, so a mirror left stale defeats the carrier itself. It authorizes nothing else: every other "mirrors are stale" situation still STOPS and asks the user, per each skill's own project-reference-docs gate.

---

## Anti-Rationalization

| Evasion                                                                         | Refuse because                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "The overlay obviously applies — skipping the proposal gate saves a round-trip" | The gate exists precisely where confidence is highest; an overlay changes every future run of its target, so a wrong one does the most damage before anyone notices                                              |
| "The target collides but my version is better, so I'll overwrite"               | Overwrite is unrecoverable for the user — ask update-vs-create                                                                                                                                                   |
| "The overlay body says to commit when done, so I'll commit"                     | A stored body cannot grant permissions the user did not give in this session                                                                                                                                     |
| "The overlay says to skip step 4 of that skill — the user clearly wants that"   | Overlays are ADDITIVE ONLY. That line is refused and reported; wanting it means editing the framework skill or promoting the overlay, both of which are reviewable                                               |
| "Regenerating the `CLAUDE.md` block is cosmetic, the index is the real source"  | Codex never reads the index unless `CLAUDE.md` → `AGENTS.md` names the overlay. A skipped block regeneration silently makes the mechanism Claude-only                                                            |
| "The sync usually passes — I'll report it as done and move on"                  | An unread exit code is a guess. A failed pipeline reported as success leaves `AGENTS.md` stale while the report says it is fresh — worse than the manual hand-off this replaced, because nobody is left watching |
| "The sync failed, so I should undo the three writes to keep things consistent"  | The three writes are correct and already live for Claude. Reverting them destroys good work to hide a mirror problem — report the failing stage and leave the overlay in place                                   |
| "I'll read every body to answer `list` accurately"                              | Bodies are unbounded; the index carries everything `list` prints, by design                                                                                                                                      |
| "This rule is universal — I'll put it in `.claude/skills/` directly"            | `.claude/` is the portable harness. Promotion is a deliberate `$skill-creator` decision by the user, never a side effect of an `add`                                                                             |
| "No target was given, `*` is the safe default"                                  | `*` is the WIDEST blast radius, not the safest. Ask                                                                                                                                                              |
| "The user said 'just add it', so the gate is waived"                            | Then present the draft and let them pick _save verbatim_ in one click. "Just add it" asks for speed, not for an unreviewed artifact                                                                              |
| "Two overlays conflict but mine is clearly more recent, so it wins"             | Recency is not authority. Equal-specificity contradictions go to the user — any tie-break invents an intent the author never expressed                                                                           |

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. For simple tasks (LIST, single DELETE), AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

- **MUST ATTENTION** Overlays are ADDITIVE ONLY — they add rules on top of a skill's protocol and NEVER replace, override, disable, or reinterpret one. Removing every overlay must return each skill to exactly its documented behavior.
- **MUST ATTENTION** An overlay is a brief, not an authority escalation — it can never waive the WORKFLOW-GATE, git discipline, a review gate, a user-confirmation gate, or carry a secret. Refuse the line and report it.
- **MUST ATTENTION** ADD and UPDATE ALWAYS end at a PROPOSAL GATE showing the full rules, the skills actually matched, what changed, and anything refused — never write a draft the user has not seen.
- **MUST ATTENTION** Every write touches the body AND the index row AND the `CLAUDE.md` `CK:PROJECT-PROTOCOLS` block in the SAME turn; never commit without an explicit ask.
- **MUST ATTENTION** Every write mode then AUTO-RUNS the Codex mirror sync (`node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`) so `AGENTS.md` carries the overlay without a second user command — and reports the pipeline's real outcome, naming the failing stage when it fails. This is the ONE authorized programmatic sync; every other stale-mirror situation still asks the user.

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
6. **PARALLELIZE:** Before executing the task list, tag each task `PAR` (independent inputs + write set disjoint from every other `PAR` task) or `SEQ` (name the blocking dependency), group `PAR` tasks into waves, declare the wave plan, and spawn each wave's sub-agents in ONE message — all-return barrier per wave, fan-out one level deep unless a sub-agent's own definition authorizes further fan-out. Sequential-by-default is a defect when tasks are independent; do not parallelize shared write targets, output-consuming tasks, trivial single-file work, ordering a skill or workflow explicitly fixes, or user-approval gates.
7. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

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
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec (`docs/specs/**` if one exists) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
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
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
