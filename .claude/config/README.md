# Claude Config Directory

Centralized configuration templates for Claude skills and workflows.

## Purpose

This directory provides a single source of truth for reusable configuration templates that can be referenced by skills, agents, and workflows.

## Files

| File | Purpose |
|------|---------|
| `release-notes-template.yaml` | Template for release notes generation |
| `skill-template.md` | Template for creating new skills |
| `agent-template.md` | Template for creating new agents |
| `vanilla-settings.json` | Session settings that run Claude Code without the framework (see [Run without the framework](#run-without-the-framework)) |
| `skill-profiles.json` | Skill-profile presets (`full`, `standard`, `minimal`), the curated `calledByOthers` list and the `entrySkills` list, read by `.claude/scripts/sync-skill-profile.cjs` (see [Skill profile](#skill-profile)) |

## Run without the framework

Start one session with the framework switched off, without deleting or editing `.claude/`. Run from the project root; the command is the same in PowerShell, cmd, bash and zsh:

```bash
claude --settings .claude/config/vanilla-settings.json --disable-slash-commands
```

| Part | Turns off | Also affects |
| --- | --- | --- |
| `disableAllHooks: true` | Every project hook: context injection, the workflow route reminder, the review commit gate and the other safety hooks | Any custom status line and `@` file-suggestion command |
| `instructionFiles: "managed-only"` | Project `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules/` and every `AGENTS.md` at launch | Your own `~/.claude/CLAUDE.md` too. Auto memory and organization-managed instructions still load, and a subdirectory's `CLAUDE.md` or path-scoped rules still load when Claude reads a file there |
| `--disable-slash-commands` | Every skill and custom command, so workflows cannot start | Your personal skills and commands too. Leave the flag off to keep skills while hooks and project instructions stay off |

Project agents in `.claude/agents/` and the permission rules in `.claude/settings.json` stay active. `--settings` overrides the same keys in every settings file for this session only; the next plain `claude` session runs the full framework again.

To keep the framework but change how workflows start, set the workflow route mode instead (`off` = no workflow or workflow skill starts without an explicit request, `auto` = ask, recommending the full workflow first, `ask` = the default) — for the team in `docs/project-config.json`, or for yourself in `~/.claude/.ck.json`, `.claude/.ck.local.json` or env `CK_WORKFLOW_ROUTE_MODE` (see `.claude/docs/configuration/README.md`).

## Adopter quick settings

Ask the assistant about framework settings or request `/framework-config` (`$framework-config` on Codex). It explains options without requiring JSON keys and applies requested changes in checkout, user or team scope. Questions stay read-only.


Common ways to make the framework lighter for one project. Team settings go in `docs/project-config.json` and are validated by its schema (`node .claude/hooks/lib/project-config-schema.cjs --validate docs/project-config.json`); personal settings go in `.claude/.ck.local.json`, which git ignores. Read `.claude/docs/configuration/README.md` when you need a key's full contract.

| Need | Setting or action | Undo |
| --- | --- | --- |
| Turn framework machinery off globally | `node .claude/scripts/framework-mode.cjs off --scope=user`; all shipped hooks plus Claude/Codex skills in registered checkouts; run `apply` once in each new checkout | Run `on` at the same scope, or `reset` to inherit; start fresh sessions |
| Silence hook context injection but keep commit reviews | `node .claude/scripts/framework-mode.cjs quiet --scope=checkout`; use `--scope=user` for every project | Run `on` or `reset` at the same scope |
| Workflows ask before they start | `portability.workflowActivation.default: "confirm"` (or `"manual"`). A default only tightens a workflow's own tier; `portability.workflowActivation.overrides` sets one workflow's tier exactly, looser included. A valid value in `.claude/.ck.local.json` wins for you alone | Remove the key |
| No automatic workflow routing | `portability.workflowRouteMode: "off"` (team: project config; personal: `~/.claude/.ck.json`, `.claude/.ck.local.json` or env `CK_WORKFLOW_ROUTE_MODE=off`; no regeneration either way, the hook reads the setting directly); the route hook then sends a short routing-off notice instead of the catalog | Set `ask` (or `auto`) |
| Ask before matched heavy skills | `portability.skillAutoTrigger: false` (team project config, personal `~/.claude/.ck.json` or `.claude/.ck.local.json`; environment `CK_SKILL_AUTO_TRIGGER=0`). Runtime instruction asks once to run a suitable matched skill or skip and execute directly, and waits for the answer; no match proceeds directly. Named requests and authorized dependencies remain eligible. Covers framework skills except `commit`/`pull-request`/`framework-config`; preserves automatic commit and pull-request test/review decisions and their required dependencies, without a second commit/push confirmation. No visibility/permission changes or regeneration. See `.claude/docs/configuration/README.md` → Skill auto-trigger for precedence and enforcement limits | Set `true` or remove the deciding preference |
| Reading a file stops pulling authoring docs | Per convention class: `on: "edit"` on the `contextGroups[]` entry (`read`, `edit` or `both`; default `both`). For every class: `conventionInjection.onRead: false` | Remove `on` / the key |
| Code graph only when the project wants it | `hooks.codeGraph.enabled`: `auto` (default: active only once `.code-graph/graph.db` exists, built with `/graph-code --mode=build`), `on`, or `off` (graph hooks silent, graph CLI refuses) | Remove the key |
| No `Fix-Origin:` commit trailer | Nothing to do: it is off by default. Set `commit.fixOriginTrailer: true` to opt in; it applies to new commits only, and a check that demands it on older commits must be made forward-only rather than rewriting history | Remove the key |
| The host's built-in code reviewer | Type `/code-review` (or its `/review` alias) in Claude Code; the framework ships no skill of that name (its own review skill is `code-quality-review`), so the built-in runs. The same holds for `/security-review`, `/deep-research`, `/release-notes` and `/design`, whose framework skills are `security-audit`, `source-deep-dive`, `release-doc` and `ui-design`. It stops working if `code-review` is set `off` (see [Skill visibility and settings precedence](#skill-visibility-and-settings-precedence)) | None needed |
| Fewer skills in the model's list | `skillProfile` in `docs/project-config.json`, then `node .claude/scripts/sync-skill-profile.cjs` (see [Skill profile](#skill-profile)) | Remove `skillProfile` and run the sync again |
| Your own compaction window | The framework sets none, so each host uses its default. Claude: `/autocompact <size>`, or an `env` entry in `.claude/settings.local.json`. Codex and OpenCode: see "No compaction pin" in `.claude/docs/configuration/README.md` | Remove your value |
| One session without the framework | Claude: the launcher in [Run without the framework](#run-without-the-framework). Codex: `[features] hooks = false` in your personal Codex config (hooks off; project instructions and skills still load). OpenCode: start it with the environment variable `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1` (stops loading `.claude/skills`) | Per session |

## Skill profile

For explicit-only entry points, list their skill folder names in `skillProfile.commandOnly` and sync.
This uses Claude's native `user-invocable-only` override (equivalent to `disable-model-invocation: true`)
and generates Codex `policy.allow_implicit_invocation: false`. Keep worker/review dependencies callable.
The list is reversible: remove an owned entry and rerun the sync to restore its original setting.

`skillProfile` in `docs/project-config.json` sets which skills the model sees, for the whole team. Keys: `preset` (`full` | `standard` | `minimal`, defined in `skill-profiles.json`), the lists `nameOnly`, `commandOnly` and `off` (skill folder names; a skill sits in at most one list), and `allowHidingCalledSkills` (default `false`). Check a key's contract with `node .claude/skills/project-config/scripts/project-config-help.cjs --search=skillProfile`.

Apply it with `node .claude/scripts/sync-skill-profile.cjs` (`--check` = read-only; exits non-zero when the result is stale or refused). The sync writes only the keys it owns into `.claude/settings.json` `skillOverrides` and records them in the team-tracked ledger `.claude/skill-profile.generated.json`; a key someone else wrote is never adopted or overwritten (a differing value prints a `conflict:` line). With no `skillProfile` and no owned keys it reads nothing and writes nothing. Removing `skillProfile` and running the sync again restores the original settings bytes.

- **Called skills are protected.** A skill that a workflow step, an agent `skills:` entry, the curated `calledByOthers` list or the `entrySkills` list (the workflow runner `start-workflow`, `commit` and the setup skills that routing gates and hooks start) names is never made `commandOnly` or `off` unless `allowHidingCalledSkills: true`; otherwise every host sync refuses and writes nothing. `nameOnly` is allowed for any skill.
- **Fail-closed inputs.** A `.claude/workflows.json` without a `workflows` map, a malformed profile, or a non-map `skillOverrides` stops the sync. The Codex sync also stops on a project config that is not valid JSON, because it cannot tell whether the config hides skills.

| List | Claude (`skillOverrides`) | Codex (`agents/openai.yaml` of the skill mirror, via `/sync-codex`) | OpenCode (`opencode.json` `permission.skill`, via the OpenCode sync) |
| --- | --- | --- | --- |
| `nameOnly` | `name-only`: out of the model's list, callable by name | `allow_implicit_invocation: false` only for a skill nothing starts; a called skill keeps implicit invocation (one note line), so preset `standard` hides nothing on Codex | No entry (no effect) |
| `commandOnly` | `user-invocable-only`: only a user's `/name` starts it | Implicit invocation off | `deny` plus a generated command |
| `off` | `off`: a call by name fails | Implicit invocation off | `deny` plus a generated command |

A skill whose frontmatter already sets `disable-model-invocation: true` is left out of the `minimal` preset, and a skill that ships its own `agents/openai.yaml` without the policy is skipped on Codex with a conflict line. (A skill whose own `disable-model-invocation: true` meets such a file instead stops the Codex sync before any mirror file is written.)

## Skill visibility and settings precedence

- **Precedence (Claude Code, per key):** `--settings` flag > `.claude/settings.local.json` > `.claude/settings.json` > the user file `~/.claude/settings.json`. Put a personal override in `.claude/settings.local.json`; a value in your user file loses to a team key of the same name.
- **`off` also blocks the built-in skill of that name.** A project skill named like a built-in replaces the built-in's `/name`, and `skillOverrides` `"<name>": "off"` disables both: the built-in does not come back. That includes the `/review` alias, which reaches the built-in code reviewer only while `code-review` is not `off`. There is no profile setting that turns a framework skill off and restores the built-in.
- **The framework avoids built-in names.** `.claude/scripts/codex/tests/skill-builtin-names.test.mjs` fails when any project skill takes one — framework or your own — so rename a colliding skill of yours. The one owner-accepted exception is `plan`: `/plan` runs the framework's planning skill, and plan mode stays reachable without that command.

### Renamed skills — migrating an adopting project

Five framework skills were renamed so the Claude Code built-ins of the same name stay reachable:

| Old name | New name | Built-in it no longer hides |
| --- | --- | --- |
| `code-review` | `code-quality-review` | `/code-review` (and its `/review` alias) |
| `security-review` | `security-audit` | `/security-review` |
| `deep-research` | `source-deep-dive` | `/deep-research` |
| `release-notes` | `release-doc` | `/release-notes` |
| `design` | `ui-design` | `/design` |

After refreshing `.claude/` from the framework:

1. **Delete the old skill folders** `.claude/skills/{code-review,security-review,deep-research,release-notes,design}/`. Copying `.claude/` over an existing one never removes them, and a leftover folder keeps hiding its built-in.
2. **Rename the old names in `docs/project-config.json`:** `skillProfile` lists, `contextGroups[].skills` and `contextGroups[].evidenceSkills`, and any steps of your own workflows. A stale name no longer matches the renamed skill.
3. **Update project overlays** whose Target is an old name (`/project-skill-protocol list`). Targets match by exact name, so an old one stops applying without a warning.
4. **Re-run `node .claude/scripts/sync-skill-profile.cjs`** when you use `skillProfile`: it removes the `skillOverrides` keys it wrote for the old names, and until then a committed `"code-review": "off"` still blocks the built-in. Then run `/sync-codex` to regenerate the Codex and OpenCode mirrors.

### Planned-work merge and workflow phases — migrating an adopting project

Three planning workflows are now one, `workflow-planned-work`, with a mode per former workflow. There is no alias: the old ids no longer resolve.

| Old name | New name | What changes for the caller |
| --- | --- | --- |
| `workflow-initiative-to-task` | `workflow-planned-work` | Mode `idea-to-tasks`, the default (`--from=idea --to=tasks`); step ids `initiative-to-task-*` are `idea-to-tasks-*`. |
| `workflow-initiative-to-spec` | `workflow-planned-work` | Mode `idea-to-spec` (`--from=idea --to=spec`); step ids `initiative-to-spec-*` are `idea-to-spec-*`. |
| `workflow-spec-to-task` | `workflow-planned-work` | Mode `spec-to-tasks` (`--from=spec --to=tasks`); step ids `spec-to-task-*` are `spec-to-tasks-*`. |
| `workflow-greenfield-init` (idea to built first slice) | `workflow-greenfield-init` (idea to reviewed foundation), then `workflow-implement-spec` | The id stays; the run stops after the foundation review and hands the first slice, its spec and the approved plan to `/workflow-implement-spec`, whose near-end E2E always runs for it. |
| One todo per workflow step | One todo per phase (`phases` in `.claude/workflows.json`) | Each phase todo lists its steps as rows with run or skip evidence; a workflow of your own without `phases` keeps one todo per step. |
| Route mode `auto` started a matched workflow without asking | Every route mode asks the workflow question before a self-selected workflow starts | `auto` now only recommends the full workflow first; an explicit `/workflow-*` request still runs with no question. |

After refreshing `.claude/`: delete `.claude/skills/{workflow-initiative-to-task,workflow-initiative-to-spec,workflow-spec-to-task}/`, rename the old ids wherever your `docs/project-config.json` names them (`portability.workflowActivation.overrides` included: an override on an old id no longer applies), then run `/sync-codex`.

### Work-tracker vocabulary — migrating an adopting project

The work tracker and the skills around it use one vocabulary: initiative, task, story, subtask and area, each kind with its own statuses. Skills, templates, keys, tracker commands and stored records that used other words were renamed or replaced with it. There is no alias: an old name no longer resolves.

| Old name | New name | What changes for the caller |
| --- | --- | --- |
| `pbi` | `work-item` | `/work-item --mode={refine\|story\|mockup\|challenge\|review\|dor}`; modes unchanged, `--type=pbi` is `--type=task`, `--reuse=pbi-review` is `--reuse=task-review`. The record it writes is a task. |
| `idea` | `initiative` | `/initiative`; the record it writes is an initiative. |
| `workflow-idea-to-pbi` | `workflow-initiative-to-task`, since merged into `workflow-planned-work` | Workflow id and step ids `idea-to-pbi-*` became `initiative-to-task-*`, now mode `idea-to-tasks` with step ids `idea-to-tasks-*` (see the planned-work merge above). |
| `workflow-spec-to-pbi` | `workflow-spec-to-task`, since merged into `workflow-planned-work` | Workflow id and step ids `spec-to-pbi-*` became `spec-to-task-*`, now mode `spec-to-tasks` with step ids `spec-to-tasks-*`. |
| `workflow-idea-to-spec` | `workflow-initiative-to-spec`, since merged into `workflow-planned-work` | Workflow id and step ids `idea-to-spec-*` became `initiative-to-spec-*`, now mode `idea-to-spec` with step ids `idea-to-spec-*`. |
| `pbi-template.md`, `idea-template.md` | `task-template.md`, `initiative-template.md` | Framework template files (same folder as before, framework-owned path); new records use `TASK-{YYMMDD}-{NNN}` and `INITIATIVE-{YYMMDD}-{NNN}`. |
| `shared/releasable-pbi-contract.md` | `shared/releasable-task-contract.md` | Update any pointer of your own. |
| Frontmatter keys `source_idea`, `idea_reference`, `pbi_references`, `parent_pbi`, `source_pbi` (design spec and test spec) | `source_initiative`, `initiative_reference`, `task_references`, `parent_task`, `source_task` | New artifacts write the new key. `migrate` does not rewrite authored keys: an existing artifact keeps the earlier key and it is read as the same link. |
| Task key `epic_reference` or `project_reference`; initiative keys `review_outcome` and `priority_label` | Tracker-owned values: an `area` tag, the initiative status and the initiative priority level | New artifacts carry no such key; the value is recorded through `/task-track`. An existing artifact keeps its key byte for byte, and nothing reads it. |
| Demo-guide fence `<!-- PBI:START -->` / `<!-- PBI:END -->` | `<!-- task:START -->` / `<!-- task:END -->` | `/demo-guide` recognises the earlier fence in an existing guide and replaces that block in place. |
| Readiness-check verdict `READY_FOR_GROOMING` | `READY_TO_PLAN` | `/work-item --mode=dor` writes the new token. No framework code reads it: update any script of your own that parses the verdict text, and expect the earlier token in reports written before the upgrade. |
| Mirror wording "Task tracker mandate", "create/update task tracking" | "Todo tracking mandate", "create/update todo tracking" | The session's step list is called todo tracking, so "task" names the tracker's delivery record only. Update any check of your own that matches the earlier sentence. |
| Tracker selector `--group EXACT_GROUP_ID` (workspace request key `groupId`) | `--scope EXACT_ID` (`scopeId`) | Names one exact area or initiative on `inspect`, `check` and `report`; `ready` accepts it and still lists the whole project. The old option is refused as unknown. |
| Tracker operation `group` (a member list and a purpose stored on the group) | `tag` (`areaIds`, `initiativeIds`) | The tag is saved on the tagged record. A request that names `group`, or a `project` or `vision` kind, is refused. |
| Save request `schemaVersion: 2` | `schemaVersion: 3` | A version 2 request is refused whole: update the procedure that produced it. |
| Delivery lifecycle of eight states (`taskTracking.schemaVersion: 3`) | The same eight plus `implemented`, in a project that declares `taskTracking.schemaVersion: 4` | Nothing changes for a project that keeps declaring 3: it is never offered or given the state, and its records stay readable by a copy that predates version 4. Declare 4 to use the state, after every copy that reads the project is updated; no record is converted, and a save request may state 3 or 4. Read `.claude/skills/task-track/references/manual-operations.md` → Vocabulary versions 3 and 4. |
| `taskTracking.groupLabels`; `kindLabels.project`, `kindLabels.vision` | `taskTracking.levelLabels`, `taskTracking.typeLabels`; `kindLabels.area` | `migrate` turns declared group labels into level and type labels. It refuses with `CONFIG_NOT_REWRITABLE` while the configuration holds `kindLabels.project` or `kindLabels.vision`, a kind label the current vocabulary uses for something else, or a group label beside a different label for the level or type it becomes: remove, rename or reconcile those first, as the reason names. In a current project the earlier keys are unknown fields. |
| Stored records in the earlier vocabulary (`projects/`, `visions/`, groups that list their members, `taskTracking.schemaVersion: 2`) | `areas/` and `initiatives/`, a level per area, a type per initiative, and tags stored on each tagged record | **The project is read-only until `migrate` has run**: reads show the current words with the same numbers, every save is refused with `MIGRATION_REQUIRED`, and automatic upkeep is skipped. |
| Stored records in the first vocabulary (`pbis/`, `ideas/`, `epics/`, or `taskTracking.schemaVersion: 1`) | Not read or migrated by this copy | Every read, save and `migrate` answers `UNSUPPORTED_VOCABULARY`: upgrade the project with a framework copy that supports the first vocabulary, then migrate it with this one. |

After refreshing `.claude/` from the framework:

1. **Delete the old skill folders** `.claude/skills/{pbi,idea,workflow-idea-to-pbi,workflow-spec-to-pbi,workflow-idea-to-spec}/`. Copying `.claude/` over an existing one never removes them, and a stale copy keeps producing save requests in the earlier vocabulary, which the tracker refuses.
2. **Bring a first-vocabulary project forward with the copy that supports it.** A project that still stores `pbis/`, `ideas/` or `epics/`, or declares `taskTracking.schemaVersion: 1`, is refused by name by this copy: migrate it with a framework copy that supports the first vocabulary, commit the result, then use this one. **Declare the earlier vocabulary when the project has no tracker configuration and no `projects/` or `visions/` folder** but its records carry the earlier mark: set `taskTracking.schemaVersion: 2` in the project configuration. Without it the project reads as current, each such record is flagged and left out of the counts, and `migrate` refuses with `EARLIER_VOCABULARY_RECORD`, naming this fix.
3. **Migrate the stored records**: preview with `node .claude/skills/task-track/scripts/task-track.cjs migrate --root . --dry-run`, then run the same command without `--dry-run`. Read `.claude/skills/task-track/references/manual-operations.md` first. Run it on the line that holds the latest records, last when a branch delivers it, and bring every branch cut before it across as that guide's section "Branches cut before the migration" states. The record root and the project configuration must be clean in version control, and rollback is restoring both from there or from your own backup. Where version control cannot restore them (no Git checkout, or paths Git ignores) the run is refused with `NO_RESTORE_POINT` until a person confirms a restorable backup with `--backup-confirmed`; the preview says so beforehand. The preview names the work that must be verified again afterwards. A migration that stopped part-way is completed by running the same command again; to abandon it instead, restore both, remove what the migration created as the result states, then run the command with `--abandon`, the only way to abandon: it checks that the earlier project is back whole and removes only the progress record.
4. **Rename the old names in `docs/project-config.json`** (`skillProfile` lists, `contextGroups[].skills`, `contextGroups[].evidenceSkills`, steps of your own workflows) and in **project overlays** whose Target is an old name, and update any script or saved request of your own that uses `--group`, the `group` operation, a `project` or `vision` kind or request version 2; then re-run `node .claude/scripts/sync-skill-profile.cjs` when you use `skillProfile`, and `/sync-codex` to regenerate the mirrors.
5. **Relaunch a tracker app that was already running.** A local workspace started before the upgrade keeps serving what it loaded then. Close it and launch it again; a page that receives a response it cannot read refuses whole and asks for the relaunch.

**Branches cut before the migration.** A branch cut before the migration still carries records in the earlier form, and the two forms are never merged record by record. Read `.claude/skills/task-track/references/manual-operations.md`, section "Branches cut before the migration", before adding or changing records on such a branch or merging one: it states the rule (bring the branch up to the migrated line first, then repeat its record changes through the tracker) and what the tracker does with an earlier-form record that arrives anyway. A record that carries the earlier mark, or sits in `projects/`, `visions/`, `pbis/`, `ideas/` or `epics/`, is flagged and left out of the counts, and saves refuse until it is removed. The one case no read flags is a record file with no tracker metadata, which carries no vocabulary mark; following that rule is what keeps such a file out.

## Codex trust entries

`codex exec -s workspace-write` adds a `trust_level = "trusted"` entry for its working directory to the user file `~/.codex/config.toml` without asking. A test fixture or spike that runs Codex in a temp project must snapshot that file first and restore it afterwards, so the run leaves no trusted temp paths behind.

## Usage

### In Skills/Scripts

```javascript
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.load(fs.readFileSync('.claude/config/release-notes-template.yaml', 'utf8'));
```

### Creating New Skills

1. Copy `skill-template.md` to `.claude/skills/{skill-name}/SKILL.md`
2. Update frontmatter with skill details
3. Add skill-specific content and examples
4. Optionally create `references/` subdirectory for detailed docs

### Creating New Agents

1. Copy `agent-template.md` to `.claude/agents/{agent-name}.md`
2. Update frontmatter with agent details
3. Define agent behavior, constraints, and process

## Conventions

- **YAML files**: Use for structured configuration (templates, mappings)
- **Markdown files**: Use for documentation and skill/agent definitions
- **File naming**: Use lowercase with hyphens (e.g., `release-notes-template.yaml`)
