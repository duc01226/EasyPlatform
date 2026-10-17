# Framework Skills

Read this guide when discovering or maintaining the skills installed in this framework copy.
Each runnable skill has a `SKILL.md` entrypoint; load that entrypoint before following its procedure.
Edit canonical `.claude/skills/` sources and regenerate host mirrors through their owner.

## Contents

- [Discover and select a skill](#discover-and-select-a-skill)
- [Run through the active host](#run-through-the-active-host)
- [Set up selected dependencies](#set-up-selected-dependencies)
- [Author and validate](#author-and-validate)
- [Test and evaluate](#test-and-evaluate)
- [Licenses](#licenses)

## Discover and select a skill

Read [the framework skills guide](../docs/skills/README.md) when choosing a capability or checking
invocation policy. Inspect [the generated catalog](../SKILLS.yaml) for the installed names and
descriptions; skill directories remain the authoring source. Do not assume an upstream example
skill is installed in this copy.

Use the existing scanner from the project root to refresh installed-skill metadata in
`.claude/scripts/skills_data.yaml`. Python commands use
`python3` on macOS/Linux and `py -3` on Windows:

```sh
python3 .claude/scripts/scan_skills.py
```

Read [script setup](../scripts/README.md#installation) when the catalog tools need PyYAML or its
bounded dependency-recovery path.

## Run through the active host

Use `/skill-name` in Claude Code or `$skill-name` in Codex. A named invocation loads guidance;
it does not authorize assignment, acceptance, publication or other separate actions.
Read the selected skill's inputs, modes, required references and completion checks before acting.
Honor the host's active skill-selection controls.

## Set up selected dependencies

Read [INSTALLATION.md](INSTALLATION.md) when preparing a helper or recovering a missing runtime.
Install only dependencies required by the selected operation. A Markdown-only skill does not need
every optional conversion, browser, video or model tool.

## Author and validate

Read [skill-creator](skill-creator/SKILL.md) when creating, auditing, optimizing or packaging skills,
and its [authoring quality gate](skill-creator/references/authoring-quality.md) before accepting an
edit. Use [the source template](_templates/template-skill/SKILL.md) when a new skill needs scaffolding.
Keep conditional detail in directly linked references and preserve each skill's authority and gates.

From the project root:

```sh
node .claude/skills/skill-creator/scripts/validate-skills.cjs
node .claude/skills/skill-creator/scripts/validate-skills.cjs --fix-contents
```

The second command writes missing or stale contents lists. Review its diff. Every skill instruction
file over 100 lines needs current linked contents near the top; shared protocol payloads and legal
notices retain their owner formats. Read [sync-codex](sync-codex/SKILL.md) when source changes leave
Codex mirrors stale; generate them through that owner.

## Test and evaluate

Read [TESTING.md](TESTING.md) when choosing illustrative activation and outcome cases. Those prompts
are test inputs, not recorded passing results. Use the project's configured runner and inspect the
actual output. Structural validation cannot prove that a skill selects correctly or performs its
job; record behavioral or model comparisons that were not run.

## Licenses

Read [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and any skill-local license before copying or
distributing bundled third-party material. Preserve those notices when editing guidance.
