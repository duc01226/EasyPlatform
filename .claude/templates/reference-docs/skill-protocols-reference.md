# Skill Protocol Overlays — Project Registry

> **Owned by the `/project-skill-protocol` skill.** No `/scan` target writes this file — like `lessons.md` and `custom-prompts-reference.md`, it is skill-managed. Hand-edits are allowed but must keep the table shape below, because that table is what overlay resolution reads.

**Protocols directory:** `docs/project-protocols/`

This is the default project-root-relative body directory. A project may change it by editing this header; the resolver validates it stays inside the project before reading any body.

A skill protocol overlay is a **named, project-specific set of extra rules layered onto a framework skill** — it does not modify the skill. The portable harness under `.claude/` stays untouched; every overlay's content lives in this project's `docs/` plane. This file is the INDEX (the skill map): it carries only what resolution needs — which skills an overlay targets, and where its body lives. Each overlay's actual rules live in their own file under the protocols directory and are read only when a matching skill is invoked.

Every supported host reaches these overlays through hooks: when a skill starts, the `skill-overlay-remind` hook names the body files that match it, and the universal `project-protocol-overlay` protocol tells the assistant how to resolve and apply them. No root file lists them.

## Usage

```
/project-skill-protocol list                     # every overlay with its target and description
/project-skill-protocol add <rules for skill X>  # create a new overlay
/project-skill-protocol update <name>: ...       # revise an existing overlay
/project-skill-protocol delete <name>            # remove an overlay
```

Two gates are always on: **adding** never stores raw wording — the skill drafts the overlay (name, target, one-line description, imperative rules) and confirms it with you first, with an option to keep your own wording verbatim; and **an overlay is a brief, not an authority escalation** — it can add constraints on top of what a skill does, never remove a skill's steps and never widen what the session is allowed to do.

## Registry

| Target       | Scope | Name         | Description                                                      | Updated | Body |
| ------------ | ----- | ------------ | ---------------------------------------------------------------- | ------- | ---- |
| _(none yet)_ | —     | _(none yet)_ | Run `/project-skill-protocol add …` to create the first overlay. | —       | —    |

- **Target** — an exact skill name (`plan`), a glob (`*-review`), or `*` (all skills).
- **Scope** — `exact` | `glob` | `all`; the precedence key, written explicitly so resolution never re-derives it.
- **Name** — the overlay slug; matches the body filename and its frontmatter `name`.
- **Description** — copied verbatim from the body frontmatter.

## Conventions

- **Descriptions are copied verbatim** from each body's frontmatter — the two must match exactly, or resolution presents text the body does not contain.
- **Overlays are ADDITIVE ONLY.** An overlay ADDS rules on top of a skill's own protocol; it never replaces, overrides, disables, or reinterprets a rule the skill already states. The skill's protocol stays fully in force. A body instructing the model to ignore, skip, relax, or reinterpret a framework rule has that line refused at resolution time, and the refusal is reported. Where an overlay rule genuinely conflicts with a framework rule, both are surfaced to you — the overlay never silently wins. Invariant: **removing every overlay returns each skill to exactly its documented behavior.**
- **Precedence is `exact` > `glob` > `*`.** This orders overlays against EACH OTHER, never against the skill. At equal specificity every matching overlay applies; a direct contradiction between two overlays is surfaced to the user, never silently resolved.
- **An overlay is a brief, not an authority escalation** — it cannot waive the WORKFLOW-GATE, git discipline, review gates, or any user-confirmation gate. A body instructing otherwise has that instruction refused, and the refusal is reported.
- **Keep this index lean** — target, scope, name, description, date, link. No rule summaries. This file is read whenever overlays are resolved.
- **Soft cap ~30 rows; body soft cap 4 KB.** Past that, resolution cost stops being negligible — promote stable, project-independent overlays to real skills via `/skill-creator` and remove their rows here.
- **Index rows and body files are written together.** A row without a body is a broken resolution; a body without a row is unreachable.
- **No secrets in overlay bodies** — reference env vars or the secret store by name.

**Two copies of this file exist, and they are not the same thing.** `.claude/templates/reference-docs/skill-protocols-reference.md` is the framework-plane TEMPLATE; `skill-protocols-reference.md` under the configured project-reference root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` relocates it) is the project-plane INDEX. SessionStart copies this template only when the required project config selects the matching `referenceDocs` entry with a `templatePath`; otherwise the registry is optional and `/project-skill-protocol add` can create it. The copies begin byte-identical and are EXPECTED to diverge as soon as the first overlay is added — the Registry table is project data and belongs only to the index. The surrounding contract prose (column meanings, Conventions) is what should stay in step: when the template's contract changes, reconcile the prose in the index, never the rows.

The full overlay-file contract (frontmatter fields, required sections, resolution rules) lives in `.claude/skills/project-skill-protocol/references/registry.md`.
