# Skill Creation Process (Detailed)

Expanded narrative for `skill-creator` Mode 1. Follow in order; skip a step only with a clear reason.

## Anatomy of a Skill

```
.claude/skills/skill-name/
├── SKILL.md (required)        # YAML frontmatter + markdown instructions
└── (optional)
    ├── scripts/               # Executable code (Python/Node) — deterministic, repeated logic
    ├── references/            # Docs loaded into context as needed (schemas, API specs, guides)
    └── assets/                # Files used in OUTPUT (templates, icons, fonts, boilerplate)
```

**Progressive disclosure — three load levels:**

1. Metadata (`name` + `description`) — always in context (~100 words)
2. SKILL.md body — loaded when the skill triggers
3. Bundled resources — as needed by Claude (scripts run without entering context)

## Step 1 — Understand With Concrete Examples

Gather real usage examples and trigger phrases. Ask (sparingly): "What functionality should it support?", "Give examples of how it'd be used", "What would a user say that should trigger this skill?". Conclude when the supported functionality is clear.

## Step 2 — Plan Reusable Contents

For each example, decide how to execute from scratch, then identify what to bundle:

- Re-written code each time → a `scripts/` helper (e.g. `scripts/rotate_pdf.py`)
- Re-discovered schema/domain knowledge → a `references/` doc (e.g. `references/schema.md`)
- Re-typed boilerplate → an `assets/` template (e.g. `assets/hello-world/`)

Scripts must have tests and respect `.env` order: `process.env` > `.claude/skills/<skill>/.env` > `.claude/skills/.env` > `.claude/.env`.

## Step 3 — Initialize

`scripts/init_skill.py <skill-name> --path <output-dir>` scaffolds the directory, a template SKILL.md with frontmatter + TODOs, and example `scripts/`/`references/`/`assets/` dirs. Customize or delete the examples.

## Step 4 — Edit

Write for _another_ Claude instance: include non-obvious procedural knowledge, domain detail, and reusable assets. Start with the bundled resources (may need user-provided assets/docs), then write SKILL.md.

**Writing style:** imperative/infinitive (verb-first). "To accomplish X, do Y" — not second person. Objective, instructional, consistent.

SKILL.md answers: (1) purpose in a few sentences, (2) when to use it, (3) in practice, how Claude uses it — referencing every bundled resource so Claude knows they exist.

**Resource guidance:**

- **scripts/** — prefer Node/Python over bash (bash is poorly supported on Windows). Python scripts need `requirements.txt` + `.env.example`. Write and run tests until they pass; run manually on real cases.
- **references/** — load-as-needed docs; split large files. Sacrifice grammar for concision. Avoid duplication: info lives in SKILL.md OR a reference, not both — prefer references for detail to keep SKILL.md lean.
- **assets/** — output files only (never loaded into context): templates, icons, boilerplate, fonts.

## Step 5 — Package

`scripts/package_skill.py <skill-folder> [output-dir]` validates (frontmatter, naming, structure, resource refs) then zips. On failure it reports and exits without packaging — fix and rerun.

## Step 6 — Iterate

Use the skill on real tasks, notice struggles, update SKILL.md / resources, retest. Best done right after use with fresh context of how it performed.

## Combining Skills

Group narrow topics into one skill by domain — e.g. `cloudflare`, `cloudflare-r2`, `cloudflare-workers`, `docker`, `gcloud` → a single `devops` skill. Prefer extending an existing skill over creating a near-duplicate.
