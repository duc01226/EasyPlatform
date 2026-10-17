---
name: project-skill-protocol
version: 1.0.1
description: '[Utilities] Use when a project adds, changes, lists or removes its OWN protocol rules layered over a framework skill (additive only). list | add | update | delete.'
---

## Quick Summary

**Goal:** Give a project a registry of named **protocol overlays** — extra project rules layered onto framework skills — with create / read / update / delete over that registry, so a skill picks up this project's conventions on every run **without the portable framework being edited**.

**Summary:** read-this-if-nothing-else digest —

- **Two files, two jobs.** The INDEX defaults to `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it); a matching `referenceDocs[]` filename may relocate it within that root. The BODY is `<Protocols directory>/<slug>.md`, where the index header declares a project-relative directory and `docs/project-protocols/` is the default. The registry is independent from task-specific `referenceDocs` selection; omission or `[]` never disables overlay lookup. Never bulk-read bodies.
- **ADDITIVE ONLY — the rule that governs every other rule.** An overlay ADDS rules on top of a skill's protocol; it never replaces, overrides, disables, or reinterprets one. Invariant: removing every overlay returns each skill to exactly its documented behavior.
- **Resolution is specificity-based, not order-based.** `exact` > `glob` > `*`, winner tier takes all — and that ordering ranks overlays against EACH OTHER, never against the skill.
- **Project payload, not framework.** Overlays live under `docs/`, never `.claude/`. A rule that stabilizes and generalizes gets PROMOTED to a real skill via `/skill-creator`.
- **ADD authors the best version, then confirms it.** The user's raw wording is raw material, NEVER the artifact. Infer intent, generalize past the incident, draft the body, then run the rules through **`/prompt-enhance`** and the prompt-engineering rubric (imperative · observable · decidable · one rule per line · carries its WHY) — an overlay is an AI instruction that fires unattended, so a vague rule is a nondeterministic one. Show what changed and why, and always offer "save my wording verbatim".
- **`/learn` routes here.** When a user asks to learn/remember a rule for one skill, or for the kind of task a skill owns, `/learn` asks the user which carrier to use (overlay recommended) and then calls this skill's `add`/`update`; read `.claude/skills/learn/SKILL.md` § *Skill-Specific Project-Protocol Route* when invoked from `/learn`. Every gate below still applies in full. A broad, short, project-wide rule that is not about one skill's own steps is not an overlay: `/learn` routes it to the root `CLAUDE.md` project-rules section or a reference doc instead.
- **Two writes, one turn.** Body + index row, nothing else: the `skill-overlay-remind` hook reads the registry at runtime and names the matched bodies when a skill starts, so no `CLAUDE.md` block and no mirror sync is involved. Report every path touched. Never commit.

**Workflow:**

1. **Resolve mode** — parse the invocation into `list` | `add` | `update` | `delete` (Phase 0)
2. **Load contract + index** — read `references/registry.md`, then the index; empty registry branches early
3. **Execute mode** — LIST (Phase 1) · ADD (Phase 2) · UPDATE (Phase 3) · DELETE (Phase 4)
4. **Two writes** — body and index row, in the same turn
5. **Discovery check** — a written body states its target, scope and when it applies before its rules; the index keeps its purpose header on top and stays routed from the docs index
6. **Report** — state every path touched; never commit

**Key Rules:**

**MUST ATTENTION** resolve the mode FIRST — a leading `list`/`add`/`update`/`delete` token is a MODE; ambiguous → ask, never guess
**MUST ATTENTION** an overlay is ADDITIVE ONLY and is a brief, not an authority escalation — it can never waive an active route policy, git discipline, a review gate, or a user-confirmation gate
**MUST ATTENTION** ADD/UPDATE run the drafted rules through `/prompt-enhance` + the prompt-engineering rubric BEFORE the additive-only screen — the deliverable is a precise AI instruction, never a transcription of the request
**MUST ATTENTION** ADD ends at a PROPOSAL GATE — NEVER write a draft the user has not seen, and always offer "save my wording verbatim"
**MUST ATTENTION** every write touches the body AND the index row in the SAME turn — a body with no row is unreachable, a row with no body is a broken resolution
**MUST ATTENTION** a written body is live for every host the next time its target skill starts: the hook and the universal `project-protocol-overlay` protocol read the registry directly, so no root-file block and no mirror sync is written or needed
**MUST ATTENTION** never overwrite on a `Target`+`Scope` collision — ask update-vs-create

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

---

## Contents

- [Quick Summary](#quick-summary)
- [Project Skill Protocol (project overlay registry)](#project-skill-protocol-project-overlay-registry)
- [Storage Contract](#storage-contract)
- [Phase 0: Resolve Mode (BLOCKING — before any file read)](#phase-0-resolve-mode-blocking--before-any-file-read)
- [Phase 1: LIST](#phase-1-list)
- [Phase 2: ADD](#phase-2-add)
- [Phase 3: UPDATE](#phase-3-update)
- [Phase 4: DELETE](#phase-4-delete)
- [Two Writes, One Turn](#two-writes-one-turn)
- [Anti-Rationalization](#anti-rationalization)
- [Closing Reminders](#closing-reminders)

# Project Skill Protocol (project overlay registry)

## Storage Contract

| Artifact | Path | Written by | Read when |
| --- | --- | --- | --- |
| **Index** | `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it); a matching `referenceDocs[]` filename may relocate the file within that root | this skill only | every invocation, and whenever overlays resolve |
| **Bodies** | `<Protocols directory>/<slug>.md` (default `docs/project-protocols/`) | this skill only | only for a MATCHED target |

Path contract:

1. Resolve the index below `docsRoots.projectReference.path`, defaulting to `docs/project-reference/` when `docsRoots.projectReference.path` in `docs/project-config.json` is omitted.
2. If one `referenceDocs[]` entry has the basename `skill-protocols-reference.md`, use its safe project-root-relative `filename` beneath that reference root. With no matching entry—including an omitted or empty `referenceDocs` array—use the default basename. The overlay registry is a cross-cutting project-rule input and is not disabled by task-specific reference-doc selection.
3. Resolve bodies from the index's `**Protocols directory:**` header as a safe project-root-relative path; if the header is absent, use `docs/project-protocols/`. The row's Body link is never followed.

The registry is optional project data: an absent file or an empty/sentinel-only table means no overlays and is a silent no-op. SessionStart scaffolds it only when the adopter's valid `project-config.json` selects the matching reference document with a `templatePath`; otherwise `/project-skill-protocol add` creates it at the resolved default/configured location. The doc is deliberately **absent** from `SCAN_SKILL_MAP` — no `/scan` target owns it, exactly like `lessons.md` is owned by `/learn` and `custom-prompts-reference.md` by `/custom-prompt`.

**Empty-registry test (use this everywhere).** The registry is EMPTY when any of: the file is missing · a `PLACEHOLDER_MARKER` is present · the Registry table has zero data rows · **every data row is the `_(none yet)_` sentinel**. Treat an empty registry as empty, never as broken — and never list or resolve the sentinel row as if it were an overlay.

The full overlay-file contract (frontmatter fields, required sections, index row format, targeting grammar, precedence algorithm, conflict rules, token bounds) lives in **`references/registry.md`** — **read it before any write, and before answering any resolution question.**

---

## Phase 0: Resolve Mode (BLOCKING — before any file read)

Parse the invocation text. An explicit flag always wins; otherwise the **leading token** decides.

| Invocation | Mode |
| --- | --- |
| `--mode={list\|add\|update\|delete}` | that mode, verbatim — no inference |
| empty, `list`, `ls`, `show`, `all` | **LIST** |
| leading `add`, `create`, `new`, `save` | **ADD** |
| leading `update`, `edit`, `change`, `revise` | **UPDATE** |
| leading `delete`, `remove`, `drop` | **DELETE** |
| anything else | **ADD**, but only after the ambiguity gate confirms it is not a list request |

**Ambiguity gate (BLOCKING).** A leading write-verb that is plausibly part of the rule text (`/project-skill-protocol add a context tag to every review finding` — where "add a context tag …" is itself the rule) → do NOT pick silently. `ask user question tool`: *"Create a new overlay whose rule is '…'"* vs *"Show the overlays already defined"*. — why: the two readings write to different files, and guessing wrong either creates registry junk or silently skips the user's real request.

There is deliberately **no MATCH mode.** Matching happens at skill-invocation time via the universal `project-protocol-overlay` protocol and the `skill-overlay-remind` hook — both implementing `references/registry.md` §3. A fourth resolution path here could disagree with them. — why: two resolvers that can disagree is the exact drift class this registry exists to avoid.

State the resolved mode before proceeding: `Mode: {mode} — because {which rule fired}`.

---

## Phase 1: LIST

1. Read the index. Registry EMPTY by the Storage Contract test → report *"No protocol overlays defined yet"* and show the one-line add syntax. STOP — do not invent examples.
2. Print every entry as a table: **Target** · **Scope** · **Name** · **Description** · **Updated** · **Body file**.
3. Preserve index order; do not re-sort, re-word, or summarize descriptions — the user wrote them.
4. Close with the total count and the invocation forms (`/project-skill-protocol add …`, `update <name>: …`, `delete <name>`).
5. Past the ~30-row soft cap, warn and propose promoting stable, project-independent overlays to real skills via `/skill-creator`.

LIST reads the index ONLY. Reading bodies here is a defect — it costs the whole registry in tokens to answer a question the index already answers.

---

## Phase 2: ADD

**Never store the user's raw wording as-is.** An add request is raw material; the deliverable is the best version of the overlay the user was reaching for. Author it, then get it confirmed.

1. **Infer the rule intent.** State what would be observably different on a run of the targeted skill once this overlay applies. Too thin to infer an observable difference (a bare topic, a mood) → ask ONE clarifying question before drafting; never invent a rule to fill the template.
2. **Resolve the target and scope.** Which skills should this apply to — one named skill (`exact`), a family (`glob`, e.g. `*-review`), or everything (`all`, target `*`)? Not stated → ask; do not default to `*`. — why: `*` is the widest possible blast radius and the tier a user is least likely to have meant.
3. **Generalize.** Climb from the incident to the standing convention — strip ticket IDs, dates, one-off paths, and today's specifics. An overlay fires on every future invocation of its target, not only on the case in front of you.
4. **Draft the body** into the template in `references/registry.md` §1: `## Applies to` · `## Rules` (imperative, observable, one-clause WHY each) · `## Rationale` · `## Out of scope`, plus the required frontmatter.
5. **Prompt-engineering pass (BLOCKING — the deliverable is an AI instruction, not a note).** An overlay body is a PROMPT: it is injected into a live run and the model must obey it without the author present to clarify. Run the drafted `## Rules` through **`/prompt-enhance`** and apply its result.

    Scope it to the RULES text — do NOT restructure the overlay into a skill file (no `Quick Summary`, no `Closing Reminders`; the body template in §1 is the shape). Take from `prompt-enhance`: caveman compression of the prose, then attention anchoring, with its hard constraint that **rule density must not drop and no rule, constraint, or `file:line` evidence may be lost.**

    Then hold every rule against this rubric, rewriting until each one passes:

    | Test | Reject | Prefer |
    | --- | --- | --- |
    | **Imperative** | "it would be good if findings had context" | "Tag every finding with its bounded context" |
    | **Observable** — a reader can tell from the output whether it was followed | "be thorough" | "Cite `file:line` for every claim" |
    | **Decidable** — no vague qualifier the model must guess at | "reasonably", "appropriate", "as needed", "where possible" | a named threshold, list, or condition |
    | **Positive form** — say what to DO, not only what to avoid | "don't skip the schema" | "Read the schema first, then …" |
    | **Self-contained** — no pronoun pointing outside the body, no "as discussed", no ticket reference | "apply the rule from the standup" | the rule, stated |
    | **One rule per line** — a compound rule half-fires | "Validate input and log it and alert" | three numbered rules |
    | **Carries its WHY in one clause** | bare directive | "… — why: a silent failure here is invisible until release" |
    | **Triggerable** — states WHEN it applies if not always | "use the strict parser" | "When the payload is user-supplied, use the strict parser" |

    — why: an overlay fires unattended on every future run of its target. A vague rule is not a weak rule, it is a **nondeterministic** one: the model resolves the ambiguity differently each run, so the overlay produces inconsistent behavior that reads like a model defect rather than an authoring defect. Precision at authoring time is the only point where that is cheap to fix.

    **This pass never adds authority.** It sharpens wording only — it may not broaden a rule's target, escalate its force, or introduce a rule the user did not ask for. Anything it adds beyond rephrasing is surfaced at the gate under *what you changed and why*.

6. **Additive-only screen (BLOCKING).** Read every drafted rule against the targeted skill's own protocol. Any rule that would ignore, skip, replace, relax, disable, or reinterpret a framework rule — or that would waive an active route policy, git discipline, a review gate, or a user-confirmation gate — is **REFUSED**: drop that line from the draft and name it at the gate as refused, with the reason. The remaining rules proceed. — why: a stored overlay is a persistent instruction; an override rule turns the registry into a standing bypass of every safety control in the harness.
7. **Target-collision check (BLOCKING).** An existing index row with the same `Target` **and** `Scope` → `ask user question tool`: *update the existing `<name>`* vs *create a second overlay for the same target*. NEVER overwrite silently. — why: silent overwrite destroys a body the user cannot recover from the index.
8. **Contradiction pre-check (BLOCKING).** Resolve the draft's target per `references/registry.md` §3 and compare its rules against every overlay that would land in the SAME tier. A direct contradiction → surface BOTH rules to the user and let them choose; never resolve it yourself, and never write an overlay you know contradicts a live one without saying so.
9. **PROPOSAL GATE (BLOCKING).** Present the draft before writing anything to disk:
    - the proposed **name**, **target**, **scope**, and **description**, each on its own line
    - the drafted **rules** in full — the user is approving content, not a summary
    - **which skills this will actually match**, resolved and listed by name, so the blast radius is visible rather than inferred
    - **what you changed and why** — one line per substantive edit, plus anything you ADDED that the user never said
    - **the prompt-engineering rewrite**, where step 5 changed the user's phrasing: show the user's wording and yours side by side for any rule whose MEANING could be read differently, so an over-eager rewrite is caught here rather than at the next run
    - **any rule you REFUSED** under step 6, quoted, with the reason
    - **open assumptions** you had to make

    Then `ask user question tool` with: *Save the improved version (Recommended)* · *Let me correct the name/target/scope first* · *Save my wording verbatim instead* · *Cancel*.

    **NEVER write a draft the user has not seen.** — why: an overlay changes how a skill behaves on every future run; an unreviewed rewrite silently substitutes your inference for the user's intent, and the divergence only surfaces later when the skill does the wrong thing.

10. **Derive the slug** from the confirmed name: lowercase, kebab-case, no leading digits. Collision after step 7 → suffix `-2`, `-3`.
11. **Perform the two writes, in the same turn** (see [Two Writes](#two-writes-one-turn)).
12. Report every path written. **Do not commit** — report and stop.

---

## Phase 3: UPDATE

1. Resolve the target overlay by exact name; no exact hit → list the close matches and confirm which one.
2. **Read the existing body first.** Never regenerate from the index row.
3. Apply steps 1–9 of Phase 2 **scoped to the requested change only** — including the additive-only screen on any new or edited rule.
4. **Surgical diff, not a rewrite.** Every section the user did not ask to change is preserved byte-identically. — why: an update is not a re-authoring; silently regenerating untouched sections discards refinements made by hand.
5. Bump `version` — patch for wording, minor for a changed rule, major for a changed `target`/`scope`/purpose — and set `updated` to today.
6. A changed `target` or `scope` re-runs the target-collision and contradiction pre-checks against the NEW tier before the gate.
7. Perform the two writes. Report the paths. Do not commit.

---

## Phase 4: DELETE

1. Resolve the target by exact name; no exact hit → list the close matches and confirm which one.
2. `ask user question tool` to confirm, showing the **description, target, and body path** being removed.
3. Delete the body file and remove the index row — same turn.
4. When the removal empties the registry, the index table gets its `_(none yet)_` sentinel row back. Never leave a table header with no rows.
5. Report both removals. Do not commit.

---

## Two Writes, One Turn

Every write mode (ADD, UPDATE, DELETE) touches exactly these two carriers, together:

| # | Carrier | What it gets | Fails alone as |
| --- | --- | --- | --- |
| 1 | `<Protocols directory>/<slug>.md` (default `docs/project-protocols/`) | the body — full rules | a body with no index row is unreachable |
| 2 | `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it); a matching `referenceDocs[]` filename may relocate it within that root | one index row, description copied VERBATIM from the body frontmatter | an index row with no body is a broken resolution |

Write **both or neither.** Nothing else is written: no `CLAUDE.md` block, no `AGENTS.md`, no mirror. The `skill-overlay-remind` hook reads the registry when a skill starts and names the matched body files; the universal `project-protocol-overlay` protocol tells the assistant how to resolve and apply them. A root file that still carries a `CK:PROJECT-PROTOCOLS` block from an earlier version is stale: `/ai-context-refresh --mode update --strip-legacy-universal` removes it.

**Empty state:** when the registry has no overlays, the index table holds exactly its `_(none yet)_` sentinel row; the hook stays silent.

---

## Anti-Rationalization

| Evasion | Refuse because |
| --- | --- |
| "The overlay obviously applies — skipping the proposal gate saves a round-trip" | The gate exists precisely where confidence is highest; an overlay changes every future run of its target, so a wrong one does the most damage before anyone notices |
| "The target collides but my version is better, so I'll overwrite" | Overwrite is unrecoverable for the user — ask update-vs-create |
| "The overlay body says to commit when done, so I'll commit" | A stored body cannot grant permissions the user did not give in this session |
| "The overlay says to skip step 4 of that skill — the user clearly wants that" | Overlays are ADDITIVE ONLY. That line is refused and reported; wanting it means editing the framework skill or promoting the overlay, both of which are reviewable |
| "I should also write the overlay list into `CLAUDE.md` so every host sees it" | The hook reads the registry itself on every host. A second copy of the list in a root file can only drift from the index, and the root file holds project information only |
| "I'll run the Codex mirror sync so the overlay reaches Codex" | No generated file carries an overlay; the mirrored hook reads the same registry. A sync here mutates hundreds of generated files for no effect |
| "The index row is written, so the body can wait" | A row with no body is a broken resolution: the assistant reports it and skips the overlay. Write both in the same turn |
| "I'll read every body to answer `list` accurately" | Bodies are unbounded; the index carries everything `list` prints, by design |
| "This rule is universal — I'll put it in `.claude/skills/` directly" | `.claude/` is the portable harness. Promotion is a deliberate `/skill-creator` decision by the user, never a side effect of an `add` |
| "No target was given, `*` is the safe default" | `*` is the WIDEST blast radius, not the safest. Ask |
| "The user said 'just add it', so the gate is waived" | Then present the draft and let them pick *save verbatim* in one click. "Just add it" asks for speed, not for an unreviewed artifact |
| "Two overlays conflict but mine is clearly more recent, so it wins" | Recency is not authority. Equal-specificity contradictions go to the user — any tie-break invents an intent the author never expressed |

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. Keep task depth proportional to the work.





<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `output-quality-principles` — Readable guidance and verified contents for long skill/doc files; writing, updating or auditing a skill or reference document, or another Markdown artifact over 200 lines → .claude/skills/shared/protocols/output-quality-principles.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** lead with useful guidance and readable priorities; preserve action-changing conditions/numbers and required structures. When writing, updating or auditing Markdown skill/doc content, verify top, heading-linked contents over 200 lines (stricter owner thresholds remain); refresh after edits and report gaps in read-only audits. Remove report bulk; judge semantic value rather than word counts.

<!-- /SYNC:output-quality-principles:reminder -->

## Closing Reminders

- **MUST ATTENTION** Overlays are ADDITIVE ONLY — they add rules on top of a skill's protocol and NEVER replace, override, disable, or reinterpret one. Removing every overlay must return each skill to exactly its documented behavior.
- **MUST ATTENTION** An overlay is a brief, not an authority escalation — it can never waive an active route policy, git discipline, a review gate, a user-confirmation gate, or carry a secret. Refuse the line and report it.
- **MUST ATTENTION** ADD and UPDATE ALWAYS end at a PROPOSAL GATE showing the full rules, the skills actually matched, what changed, and anything refused — never write a draft the user has not seen.
- **MUST ATTENTION** Every write touches the body AND the index row in the SAME turn and nothing else (no `CLAUDE.md` block, no mirror sync); never commit without an explicit ask.
- **MUST ATTENTION** The registry is read at runtime by the `skill-overlay-remind` hook and the universal `project-protocol-overlay` protocol; a written overlay is live on every supported host the next time its target skill starts.
