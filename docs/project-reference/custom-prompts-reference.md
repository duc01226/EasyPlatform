# Custom Prompts — Project Registry

> **Owned by the `/custom-prompt` skill.** No `/scan` target writes this file — like `lessons.md`, it is skill-managed. Hand-edits are allowed but must keep the table shape below, because that table is what request-matching reads.

**Prompts directory:** `docs/project-prompts/`

A custom prompt is a **named, reusable, project-specific procedure** — a name, a one-line description, and a prompt body that reads like a mini-skill. This file is the INDEX: it carries only what request-matching needs. Each prompt's actual protocol lives in its own file under the prompts directory and is read only after the user confirms a match.

## Usage

```
/custom-prompt list                          # every defined prompt with its description
/custom-prompt <free-text request>           # match to the closest prompt, confirm, then run it
/custom-prompt save this prompt task: ...    # add a new prompt
/custom-prompt update <name>: ...            # revise an existing prompt
/custom-prompt delete <name>                 # remove a prompt
```

Two gates are always on: **matching** ends at a confirmation question — a saved prompt never executes on inference alone; and **saving** never stores raw wording — the skill drafts the best version of the prompt (name, one-line description, inferred goal, imperative steps, success criteria) and confirms it with you first, with an option to keep your own wording verbatim.

## Registry

| Name         | Description                                                         | Triggers | Updated | Body |
| ------------ | ------------------------------------------------------------------- | -------- | ------- | ---- |
| _(none yet)_ | Run `/custom-prompt save this prompt task: …` to add the first one. | —        | —       | —    |

## Conventions

- **Descriptions are copied verbatim** from each body's frontmatter — the two must match exactly, or matching scores against text the body does not contain.
- **Keep this index lean** — name, description, triggers, date, link. No step summaries. This file is read on every invocation.
- **Soft cap ~30 entries.** Past that, matching quality degrades; promote the stable, project-independent ones to real skills via `/skill-creator` and remove their rows here.
- **Index rows and body files are written together.** A row without a body is a broken match; a body without a row is unreachable.
- **No secrets in prompt bodies** — reference env vars or the secret store by name.

The full prompt-file contract (frontmatter fields, required sections, scoring rubric) lives in `.claude/skills/custom-prompt/references/registry.md`.
