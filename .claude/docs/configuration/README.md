# Configuration Reference

## Overview

Claude Code uses multiple configuration files to customize behavior, permissions, hooks, workflows, and integrations. This guide covers all configuration options and their effects.

```
.claude/
├── settings.json        # Main settings (hooks, permissions, plugins)
├── .ck.json             # Claude Kit configuration (levels, assertions)
├── .ck.local.json       # Optional developer-local CK overrides (gitignored)
├── workflows.json       # Workflow automation definitions
└── .mcp.json            # MCP server integrations
CLAUDE.md                # Project instructions at repo root (read by Claude)
```

---

## Configuration Files

### settings.json

**Purpose:** Core Claude Code settings including hooks, permissions, and plugins.

| Section          | Purpose                        |
| ---------------- | ------------------------------ |
| `permissions`    | Tool allow/deny/ask rules      |
| `hooks`          | Event-based hook registrations |
| `env`            | Environment variables          |
| `attribution`    | Commit/PR footer text          |
| `enabledPlugins` | Plugin toggles                 |
| `statusLine`     | Custom status line command     |

**See:** [settings-reference.md](./settings-reference.md) for complete reference.

---

### settings.local.json

**Purpose:** Local overrides not committed to git (gitignored).

**Location:** `.claude/settings.local.json`

**Common uses:** API keys and secrets, personal preferences, development-only hooks, local MCP servers.

```json
{
    "mcpServers": {
        "local-db": {
            "command": "node",
            "args": ["./local-mcp-server.js"],
            "env": { "DB_HOST": "localhost" }
        }
    }
}
```

---

### .ck.json

**Purpose:** Claude Kit settings for output style, planning, and hook behavior. Project-specific architecture and coding conventions belong in `docs/project-config.json` and its referenced project documentation.

```json
{
    "plan": {
        "namingFormat": "{date}-{issue}-{slug}",
        "dateFormat": "YYMMDD-HHmm",
        "validation": {
            "mode": "auto",
            "minQuestions": 3,
            "maxQuestions": 8
        }
    },
    "assertions": ["Search for existing implementations before creating new code", "Follow the project's documented architecture and conventions"]
}
```

| Field               | Type     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `plan.namingFormat` | string   | Plan directory naming pattern                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `plan.validation`   | object   | Plan validation interview. `mode`: `auto` (default) runs the interview after `/plan` saves its plan (standalone, or in a workflow that lists no validate step), `prompt` asks first, `off` skips it — inside a workflow it never skips the Plan Gate approval question; a direct `/plan --mode=validate` and a `/plan --mode=validate` workflow step always run. `minQuestions` is the breadth floor and `maxQuestions` the size of one question round, never a cap on the interview |
| `assertions`        | string[] | Legacy compatibility field. The standard SessionStart path does not add it to prompt context; active project rules belong in `docs/project-config.json` and its reference docs                                                                                                                                                                                                                                                                                                       |
| `locale`            | object   | Language settings for thinking/responses                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `trust`             | object   | Trust passphrase configuration                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

In this repository, the SessionStart hook loads `.ck.json` settings but does not inject the `assertions` array into prompt text. Keep this field only for compatibility with external consumers; use `contextGroups` and project reference docs for active project conventions.

**See:** [output-styles.md](./output-styles.md) for custom output styles.

### Context delivery profile

The optional, closed `.ck` section `{"contextDelivery":{"profile":"compatible"}}`
selects framework instruction delivery. Values are `compatible` and `concise`.
Precedence is default → personal `~/.claude/.ck.json` → tracked
`.claude/.ck.json` → checkout `.claude/.ck.local.json`. An empty section inherits;
a malformed effective declaration reports `CONTEXT_PROFILE_INVALID` without its
value and falls back to compatible. A settings file that exists but holds no
readable JSON object counts as an invalid declaration of its layer for this option
only, and the message names the layer and its file. An explicit higher-precedence valid profile
recovers. This setting does not change workflow routing, host permissions or
project configuration validation.

The shipping default is **compatible pending rollout evidence**. Its size is a
known, measured limit, recorded in
[the framework review guide](../framework-review-guide.md#known-limits); a review
reports it only with a new measurement. Concise is a
candidate for evaluation: one essential core replaces the four universal bins,
principles share its successful-delivery record, and a compact route cue points
to selection depth. Compact cues retain task-to-skill examples, custom-simple
route declarations and registered skill discovery. Read-only audits can choose
investigation → option comparison → rationale review → report, while retaining
required gates. Read [hook delivery](../hooks/README.md#context-delivery-profiles)
when checking lifecycle, missing-source recovery or host support. Before selecting
a workflow, run `node .claude/scripts/workflow-catalog.cjs --mode=<mode>` with the mode the
route cue states; the existing catalog
renderer retains tiers and bounded fallback. Unknown/unreadable specialist
triggers retain existing full delivery; required skills and safe additive overlays
still load independently of workflows.

To evaluate, set `contextDelivery.profile` to `concise` in the ignored checkout
file, preserving its other preferences. To roll back, set it explicitly to
`compatible` in that file. Removal restores lower-precedence settings. A content
hash change re-arms delivery; compaction/clear and child scopes keep their existing
rules. No automatic migration rewrites an adopter's settings.

Run `node .claude/scripts/context-delivery-audit.cjs render` for both profiles
through the same seven carriers. Token estimates use the optional
`context-delivery-tokens.py` with `tiktoken` installed in an isolated Python
environment: Windows `py -3`, macOS/Linux `python3`. Pipe the renderer JSON to that
script; neither tool reads private host prompts. The default estimate counts
emitted text, including its markers, with the JSON envelope excluded equally for
both profiles. User prompts, project roots, tool
schemas and later reads are outside that scoped budget; later catalog/diagnosis
text is reported separately. Whole-session usage and latency need actual runtime
evidence.

Read [portable adoption](../framework-portability.md#concise-guidance-evidence)
when preparing the frozen paired evaluation, native platform/host proof and
promotion decision. Token savings alone never authorize default promotion.

### Experience verification

Project-specific user/downstream experience review is configured in
`docs/project-config.json` under `experienceVerification`. It supports
web/mobile/desktop/terminal/API/library/background/generated surfaces without
assuming a particular runner. See
[experience-verification.md](./experience-verification.md) for the evidence,
baseline, and explicit-acceptance lifecycle.

#### Code Review Configuration

The `codeReview` section records which project-specific review-rule doc the review skills/agents read. No hook or script reads this section: review skills read the rules on demand via the hook-delivered project-reference-docs gate (`SYNC:project-reference-docs-guide`), so these fields document intent and change no behavior.

| Field            | Type     | Description                                                                                                                                                                                                                         |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`        | boolean  | Whether review skills/agents consult the rules doc (default: `true`)                                                                                                                                                                |
| `rulesPath`      | string   | Path to rules markdown file (default: `code-review-rules.md` in the project-reference docs root, itself defaulting to `docs/project-reference` unless `docsRoots.projectReference.path` in `docs/project-config.json` overrides it) |
| `injectOnSkills` | string[] | Skills associated with the review-rules doc                                                                                                                                                                                         |

**To update code review rules:** Edit `code-review-rules.md` in the project-reference docs root directly. Review skills/agents read it on demand via the project-reference-docs gate.

### Team work tracking

Choose the instruction route explicitly. `task-track --mode=guide` follows the selected
checkout's root-linked work-tracking guide, using that project's storage, lifecycle, update
mechanism and checks. Customize those in the project guide and point to it from `CLAUDE.md`
or `AGENTS.md`; no `taskTracking` section or native writer registration is required. Read
[project guidance](../../skills/task-track/references/project-guide.md) when using that mode.
Missing or unresolved guidance makes no tracker write and never falls back to the engine.

Bare `task-track` still means engine `inspect`; every existing explicit engine mode retains
its behavior even when a project guide also exists. The skill remains manual-only. Read
[the engine protocol](../../skills/task-track/references/engine-protocol.md) when using those
modes. The configuration below applies to that engine. A project overlay may add a local
step, but cannot replace route rules or bypass a writer refusal.

Tracking works without a shared member registry when the selected checkout has usable Git author settings. The optional example below configures shared custom identities and policy; merge only needed fields into the project config selected by `portability.projectConfigPath` (default `docs/project-config.json`), retaining the other sections. `docsRoots.teamArtifacts.path` defaults to `team-artifacts` and can select the team's existing artifact folder.

Resolve the selected checkout and config through the existing project-config loader. Copying the framework does not enroll a project: absent tracking settings use neutral defaults and automatic upkeep is `off`. An explicitly requested actor-dependent action can resolve the local author without writing a shared member or enabling upkeep. `help` needs no project config; supported inspection uses the selected roots without initializing or rewriting them.

When already authorized work needs missing or invalid project context repaired, perform the narrow [project-config](../../skills/project-config/SKILL.md) setup; use [project-init](../../skills/project-init/SKILL.md) when broader required project context also needs setup. The minimum valid config is a non-empty `project.name` derived from that adopter's metadata or root directory, with no inferred stack or tracking capability. Do not create a second tracker initializer. Merge only the needed evidence-backed fields, validate the selected file, reread it, and make repeated setup a no-op when the requested state already exists. Needed safe setup follows the active task's authority; a configured disablement or unresolved member/profile decision is preserved rather than filled from the example.

| Selected configuration                                                           | Required handling                                                                                                                                   |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| No config, or valid minimal project identity with no tracking section            | Retain neutral tracking defaults; create required project context only through the existing setup owner when the authorized task needs it           |
| Valid custom config path, artifact roots, members or profile                     | Resolve those actual values; preserve unrelated/custom content and unmanaged host settings, with no authoring-project paths copied into the adopter |
| Explicit automatic tracking `off`, opted-out item, or restricted skill selection | Keep that choice; setup does not enable automatic upkeep, relink work or authorize a heavy skill                                                    |
| Malformed declared config or tracking capability                                 | Refuse affected operations with the original sources retained; route narrow repair to the project-config owner, then validate before retry          |
| Declared native profile without demonstrated owner capabilities                  | Report unavailable and retain its sources; registration does not authorize portable serialization or infer a native writer                          |

```json
{
    "docsRoots": { "teamArtifacts": { "path": "team-artifacts" } },
    "taskTracking": {
        "schemaVersion": 4,
        "mode": "linked",
        "profile": { "kind": "portable-markdown", "version": 1 },
        "members": [{ "id": "member-1", "displayName": "Example member", "active": true }],
        "report": { "enabled": true, "autoRefresh": true }
    }
}
```

Replace the optional example member with actual custom identities, or omit `members` to use local Git identity. IDs survive display-name changes; aliases must resolve unambiguously. An absent section means mode `off` and an empty shared member registry; it does not prevent an explicitly permitted local-author action or change the existing explicit common-core capture route. A malformed declared section refuses affected operations. `off` disables automatic upkeep, `observe` gives reminders, and `linked` permits bounded activity at actual saved checkpoints for exact session-linked items. Off/observe optional checkpoints exit before author lookup. Explicit human actions remain separate. A ticket is optional.

`taskTracking.schemaVersion` names the vocabulary the stored records use: `4` is the current vocabulary (initiative, task, story, subtask and area, each kind with its own statuses); `3` is the same vocabulary without the `implemented` delivery state, and a project that declares it is never offered or given that state, so a framework copy that predates version 4 still reads it; `2` is the earlier one. A project at `2`, or an unconfigured project holding the earlier group folders (`projects/`, `visions/`), is read in the current words and is read-only: every save is refused with `MIGRATION_REQUIRED` and automatic upkeep is skipped until `migrate` has run. A project at `1`, the first vocabulary, or an unconfigured one holding `pbis/`, `ideas/` or `epics/`, is refused by name with `UNSUPPORTED_VOCABULARY`: this copy neither reads nor migrates it, so upgrade it with a framework copy that supports the first vocabulary, then migrate. Read [the migration procedure](../../skills/task-track/references/manual-operations.md) before running it, and [Work-tracker vocabulary](../../config/README.md#work-tracker-vocabulary--migrating-an-adopting-project) for the upgrade steps.

#### Areas, initiatives and labels

An area says where work belongs and an initiative says why it is done. Both are optional, and so is every tag: any record may be tagged to any number of areas, and any record but an area to any number of initiatives, the tag is saved on the tagged record through the `tag` operation, and no record lists its members. An area may carry a level and sits under any number of parent areas; a parent is never at a deeper level than its child, and an `application`-level area has no parent. An initiative carries a type, its own statuses (`draft`, `approved`, `committed`, `done`, `canceled`) and optionally a priority level (`high`, `medium`, `low`); an initiative, a task, a story or a subtask may carry a due date. This introduces no required wrapper and no fixed nesting depth. Read [areas and tags](../../skills/task-track/references/manual-operations.md#areas-and-tags) for the actual retained request, preview, actor and conflict guards.

| Area level, shallowest first | Default display label |
| ---------------------------- | --------------------- |
| `application`                | Application           |
| `product`                    | Product               |
| `module`                     | Module                |
| `feature`                    | Feature               |

| Initiative type | Default display label |
| --------------- | --------------------- |
| `feedback`      | Feedback              |
| `idea`          | Idea                  |
| `initiative`    | Initiative            |

Optional `taskTracking.levelLabels` accepts only the four level keys, and optional `taskTracking.typeLabels` only the three type keys. Each declared value is nonblank text, at most 160 characters before trimming, with no control characters; display trims surrounding whitespace. Omitted keys use defaults, including when the object or tracking configuration is absent. Duplicate label text is legal. Labels supply no owner selection, tag, permission or executable instruction, and never change a stored level, the order of levels or a count; commands select stable item IDs. Malformed declared labels refuse affected operations rather than silently defaulting. Pinned reads use the labels and tags of the selected commit, preserving local/shared source distinctions. `taskTracking.groupLabels` belongs to the earlier vocabulary: it is accepted only in a project that declares `schemaVersion: 2`, where the migration turns it into level and type labels (and refuses while a different label is already declared for the level or type a group label becomes), and it is an unknown field in a current project.

Optional `taskTracking.kindLabels` sets a display word for a kind, keyed by the current kind words (`initiative`, `task`, `story`, `subtask`, `area`). It follows the same text rules as a level label and changes displayed text only: stored kinds, identities, folders, counts, requests and results keep the tracker's words. A label may not borrow text that already means something else, compared without regard to letter case or surrounding blanks, and may not repeat another kind's label; either is refused as invalid configuration (`INVALID_CONFIG`), and the refusal names the field and the label. Which text is taken depends on the vocabulary the project declares. At `schemaVersion: 3` it is every other word of either vocabulary (a kind, a status, a level, a type, a priority level, a group purpose or a link relation) and every other default label of the current one. At `schemaVersion: 2` the keys are the earlier kinds (so `area` is an unknown field there) and the taken text is the words and default labels of the earlier vocabulary alone, so a label that was valid when it was declared keeps the project readable; a label the current vocabulary uses for something else is not shown, and `migrate` names it before any change, with the rename as the next action. The link relation that carries a kind's word is shown under that kind's label as well.

A framework copy older than a vocabulary version refuses a configuration that declares it: one that predates version 4 refuses `schemaVersion: 4` by name, and one older than the current structure refuses `schemaVersion: 3`, `levelLabels` or `typeLabels`, and a copy older than `kindLabels`, `report.detail` or `report.maxBytes` refuses a configuration that carries them. Update every copy of the framework before a project uses any of these.

Use `inspect --root CHECKOUT --scope EXACT_ID` or `check --root CHECKOUT --scope EXACT_ID` through `node .claude/skills/task-track/scripts/task-track.cjs` to read one exact area or initiative; omit `--scope` for project scope, and add `--figures` to `inspect` for the delivery figures of every area and every initiative. Delivery is stated by one rule for the project, every area and every initiative: it comes only from tags, counts each eligible task once in a scope, excludes canceled/retired tasks and gives no credit to a story, a subtask, an initiative or an area. An area's scope is the tasks tagged to it or to any area beneath it, so a parent's figure is not the sum of its children; an initiative's scope is the tasks linked directly to it; a task with no area belongs to the project as a whole. An area's status changes no figure. Read exact `scope.eligibleTaskIds`, excluded/supporting identities and coverage before relying on counts. Partial, malformed or bounded scope retains reasons and withholds a complete percentage; an empty scope states none; an unavailable scope has null metrics. Global work and exact linked concerns remain inspectable, with current proof, historical acceptance and owner health separate. Supported portable reads require no custom vocabulary or native adapter.

The core package requires Node 18+ and pins `yaml` 2.9.1 in its manifest and lockfile. The optional app requires Node 20+. From the selected checkout, the same commands work on Windows, macOS or Linux:

```text
node --version
node .claude/skills/task-track/scripts/task-track.cjs identity --root .
node .claude/skills/task-track/scripts/task-track.cjs inspect --root .
node .claude/skills/task-track/scripts/task-track.cjs report --root .
node .claude/skills/task-track/scripts/task-track.cjs serve --root .
```

`help` and `identity` use Node built-ins. Every other command needs the pinned parser and installs it by itself when it is missing or at another version, so no setup step comes first. The install is one attempt of `npm ci --omit=dev --ignore-scripts --no-audit --no-fund` inside `.claude/skills/task-track`, with npm's own network wait held to 30 seconds and no retries: runtime packages only, the lockfile's exact version and integrity hash, package scripts off. It runs through the startup installer's launcher and lock rather than its own: an npm found on PATH outside the project, a fixed command template on Windows, one install per folder at a time, and an install still running after 120 seconds stopped as a whole process tree. A second command started meanwhile waits up to a minute and then uses the first one's install. No registry credentials or personal npm settings are passed unless `CK_STARTUP_INSTALL_TRUST=1` grants them; set it when the registry, proxy or certificates come from an npmrc file. A completed install prints `{"status":"setup","installed":[…]}` on stderr and the command then answers normally.

When the install cannot complete, the command refuses with `PACKAGE_SETUP_FAILED`, the cause and what to do by hand; a package is never reported usable after a failed or stopped install. Causes are: no npm on PATH, or only one inside the project; npm ending with an error or being stopped at the limit; another setup of the folder still running; a lock the machine cannot prove private to one account; a missing lockfile or manifest; or `CK_AUTO_INSTALL_DEPENDENCIES=0`. Running the printed `npm ci` command inside the folder is the by-hand route, including where npm is a version-manager link that automatic setup cannot start. An automatic install omits the skill's own development packages; rerun `npm ci --include=dev` there before the workspace browser tests. Hooks never install; they stay advisory when the parser is missing. For implicit identity, Git must be available and the selected path must be its exact checkout root. The read-only `identity` command returns the selected actor/name/source without changing settings or work. It reads effective `user.email` and `user.name`, honoring ordinary local/global/includeIf/worktree configuration; injected Git author/context variables cannot substitute another root or person. No remote credentials, passwords or credential helpers are read. Git author metadata is attribution, not authentication or additional permission.

Automatic identity uses the lower-case email as ID and the author name, or full lower-case email when name is missing. Addresses use printable ASCII U+0021–U+007E, exactly one `@` with nonempty portions, no spaces/control and at most 254 characters; no mailbox/network check occurs. Automatic/profile names allow 254 characters with no controls; configured display names retain 160. Custom slug IDs retain 80, configured email IDs and valid email aliases allow 254, and ordinary aliases retain 160. Unambiguous configured ID/email-alias matching keeps custom spelling/name; display-name similarity cannot choose an implicit actor. An explicit `--actor EXACT_CUSTOM_ID` always keeps that exact configured choice, without falling back to Git. An inactive custom actor retains its existing operation-specific eligibility, including permitted unassignment; inactive recipients cannot receive new assignment.

`serve` binds one loopback checkout and defaults to read-only, without resolving an author. A writable local launch needs no shared enrollment, `--open` opens it in the machine's own browser, and `--terminal` runs it in a terminal window of its own:

```text
node .claude/skills/task-track/scripts/task-track.cjs serve --root . --write --open --terminal
```

With `--terminal` the command writes a launcher script under the project `tmp/task-tracking/launch/`, asks the machine to open it in a terminal window (macOS Terminal, a Windows console window, or the first available Linux terminal program) and returns; the workspace runs in that window and stops when the window is closed or Ctrl+C is pressed there. Without `--terminal` the workspace runs in the calling process. No window is opened when `CI` is set, `CK_NO_AUTO_OPEN=1`, a Linux session has no display, a path holds a character the launcher script cannot carry, or the launcher folder is a link or leaves the project; the command then reports `not-opened` with the reason.

For an existing configured custom identity, preserve explicit selection:

```text
node .claude/skills/task-track/scripts/task-track.cjs serve --root . --write --open --actor member-1
```

`--open` asks for Google Chrome when it is installed and the default browser otherwise, with a literal launcher per platform and only this workspace's loopback address as its argument. It opens nothing when `CI` is set, with `CK_NO_AUTO_OPEN=1`, or on Linux without `DISPLAY` or `WAYLAND_DISPLAY`. The single output line carries `launch.status`: `requested` with the browser asked, or `not-opened` with the reason. The app keeps serving either way, and a request does not prove a page opened.

The launcher is given a launch link, not the session address: it attaches one page, once, and expires after a minute. The link still reaches the launcher as a process argument. On Linux it can stay in the browser's command line when the browser was not already open, where other local accounts can read it; on macOS it is visible only for the moment the `open` command runs; on Windows other standard accounts cannot read it. Someone who read it would have to use it within that minute and before the real page does, and the real page would then report the link as already used. On a machine shared with other signed-in users, leave `--open` off and open the printed address yourself.

An attached tab keeps its session for as long as the tab lives, so a reload stays attached. Opening the address without a session shows nothing of the work: the page says that one address serves one workspace and, for a launch that used `--open`, offers `Open this workspace`, which asks the running command to open a new attached tab on its own machine. That request needs no session, returns only the launch outcome, is limited to one every few seconds, and is refused for a launch without `--open`. A page cannot choose another folder; another project is served by launching it from its own checkout.

The writable app and session `link` accept either an independently resolved current local author or an exact configured custom ID. `apply` can omit `--actor`, but its retained JSON `actor.memberId` remains mandatory and must match the independently resolved caller; never take identity from that body or rewrite it on retry. Keep the explicit custom-ID recipe for existing workflows. New assignment/start requires an eligible active configured member or currently validated local author. Only writable worktree data adds the current implicit actor as a self-assignment choice; historical/read-only/pinned snapshots grant no new eligibility.

An unavailable Git checkout/process gives `IDENTITY_UNAVAILABLE`; a selected path that differs from the exact Git checkout root gives `WRONG_ROOT`; unusable email/name, invalid custom selection or ambiguity gives `INVALID_MEMBER`. These refuse the identity-dependent action without changing work, shared settings or members. Correct the normal author configuration or select a valid custom actor; tracker setup does not mutate Git settings. If an implicit email changes after launch/link, `STALE_ACTOR` preserves the pending request/draft and successful primary; explicitly relaunch/relink and reconsider the action without rebinding the old retry. A mismatched app request gives `WRONG_ACTOR`. Ordinary reading/reporting/advisory guidance stays useful without identity lookup.

Keep the launch URL private: its fragment carries an ephemeral token. Drafts stay in memory and disappear when the page closes or reloads; stop the server with Ctrl+C. The generated `tmp/task-tracking/project-status.html` stays readable offline. Inspection has no limit on the total size of a project's records and the specs and sources they link to: a project is read whole, and only a single file larger than the per-file budget is reported as unavailable; coverage is then partial and that file is named. The full report has no size limit and is never refused for its size; it lists every inspected record and states when inspection itself was incomplete. Optional `taskTracking.report.detail` (`full`, `packed` or `none`; default `packed`, the compact version) sets how much record detail the default report carries, and optional `taskTracking.report.maxBytes` (a positive whole number of bytes) makes the tool write the richest form that fits. Unset, a compact report is held to 15 MiB and the full version to no budget. `packed` holds the same detail as `full` in a file several times smaller and opens it with scripts on, which suits a copy that is published or sent; it is compression, not protection. A compact report says at the top and beside its list of records that it is the compact version; `report --detail full` writes the full version. Every form lists every inspected record. `report --open` requests a viewer; the request alone does not prove it opened. The app's `Report` tab always shows the full version in place for the scope selected there, written by the same report path, brings it up to date when the tab is opened and on `Refresh report`, and works in a read-only session. The report is shown in a sandboxed frame with no access to the app page or its session, and the page's content policy admits the report's one script and one stylesheet by content hash only. Optional `healthOwnerId` selects an existing item; health requires a deliberate dated assessment and never follows delivery percentage.

An authorized save by an unregistered Git contributor retains only bounded `id` and `displayName` in that record's `tracking.memberProfiles`, together with its ordinary history/receipt. Repeated saves preserve the first captured name and prior contributors; configured actors add no redundant profile. Configured names take display precedence. Saved historical profiles are inactive display attribution and cannot authorize acting, new assignment or health ownership. A separately permitted local-only dated attestation remains history, but an ordinary later read shows health Unknown without an eligible configured owner; eligible configured-owner attestations retain the existing policy.

For a direct item entry, append `&item=<encoded stable ID>` and optionally `&owner=<encoded project-relative owner path>` to the private launch URL fragment. The app consumes these selectors once, removes the fragment, and selects only a unique owner in the inspected project. A missing or ambiguous target shows a reason and offers the current work list; it never switches projects.

Stopping the server stops new admission and drains admitted actions and their responses. Shutdown has a 20-second deadline. If admitted work remains, the CLI reports an indeterminate outcome rather than claiming it was canceled or saved; inspect the record and retry the original operation identity. A forced transport close cannot cancel an already admitted filesystem operation.

The CLI and app share `.claude/hooks/lib/task-tracking.cjs` policy. Proposals live in the selected checkout; `report --ref <local-ref>` reads one pinned local Git commit without fetch or worktree substitution, so remote freshness stays unknown. Current test proof and explicit human acceptance are separate. A saved primary remains saved when report or tracking upkeep is pending. Retain the original request/checkpoint and recover only pending work. Prefer cancellation/retirement; exact draft deletion requires a current preview and retains local recovery bytes. Ended work (canceled or retired) that nothing references can be deleted entirely with `--delete-item`, an explicit reason and a current preview; open, started or accepted work is canceled or retired first, and nothing cascades. A state outside the usual steps, such as canceled work back to draft, is set with the `transition` operation, `correction: true`, a reason and `--change-state`; delivery work is never placed in `done` this way. Each usual step of an initiative (approve, commit, close as done, cancel, reopen) needs `--decide`, an explicit decision by a person; a correction of one needs `--change-state` and a reason instead. Read `.claude/skills/task-track/references/manual-operations.md` when you need the recipe for any of these actions. Clearing local recovery ends that replay horizon.

Native registration grants no capability. Native mutation and rendering remain unavailable until the owner supplies footprint, retry and read proofs; requests refuse with original sources preserved and no portable serializer fallback. See [task-track](../../skills/task-track/SKILL.md) for purpose-mode routing, [manual operations](../../skills/task-track/references/manual-operations.md) for catalogue-derived recipes and refusals, and [linked integration](../../skills/task-track/references/integration-guide.md) for exact concerns, producer checkpoints and recovery. Standalone pull requests use the `pull-request` producer; nested procedures retain their linked saving producer and actual context. Publication success remains separate from filesystem observation, proof and acceptance.

### Per-file convention injection

`docs/project-config.json` `contextGroups[]` entries double as convention classes; the optional top-level `conventionInjection` object switches the per-file reminder hook (`file-convention-inject.cjs`) on. Absent object or `enabled` not `true` ⇒ the hook is silent.

```json
{
    "contextGroups": [
        {
            "name": "feature-spec",
            "pathRegexes": [],
            "pathGlobs": ["docs/specs/**/*.md"],
            "priority": 100,
            "skills": ["spec"],
            "referenceDocs": ["docs/project-reference/feature-spec-reference.md"]
        },
        {
            "name": "general-code",
            "pathRegexes": [],
            "pathGlobs": ["**/*"],
            "excludePathGlobs": ["**/node_modules/**", "tmp/**"],
            "fileExtensions": [".js", ".cjs"],
            "priority": 900,
            "referenceDocs": ["docs/project-reference/code-review-rules.md"]
        }
    ],
    "conventionInjection": { "enabled": true }
}
```

| `conventionInjection` field | Default   | Allowed       | Meaning                                                                                                         |
| --------------------------- | --------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| `enabled`                   | `false`   | boolean       | Explicit opt-in                                                                                                 |
| `maxChars`                  | `4000`    | 500–10000     | Reminder size cap                                                                                               |
| `maxClassesPerEdit`         | `4`       | 1–10          | Classes per trigger (applied before dedup)                                                                      |
| `reinjectAfterBytes`        | `4500000` | ≥ 4500000     | Conversation-history growth (transcript bytes, ~5–6 per visible character, ≈200K tokens) that re-arms a class   |
| `reinjectAfterMinutes`      | `30`      | 1–1440        | Age re-arm when history size is unknown but condensations ARE observed (host report or transcript mark)         |
| `blindReinjectAfterMinutes` | `5`       | 1–1440        | Age re-arm when the scope is blind — no transcript AND no condensation ever observed, so age is the only signal |
| `onRead`                    | `true`    | boolean       | Reads trigger reminders too                                                                                     |
| `compactionMarkers`         | `[]`      | regex strings | Extra transcript condensation marks                                                                             |

Each group may also set `on` — which file operation delivers it: `read`, `edit`, or `both` (default `both`, so an omitted `on` keeps delivery on reads and edits). `edit` keeps a group's read-first docs and skill pointers off plain reads; `conventionInjection.onRead: false` still turns read delivery off for every group. Any other value is a validation error naming the group and `read|edit|both`.

A class may also match a file by what it contains: `contentRegexes` (case-insensitive regexes tested against the first 16 KiB of the file; the framework's own `ai-feature-gate` patterns see the first 64 KiB) plus `contentExtensions` (the text/code extensions that are scanned), with an optional short `contentLabel` shown in the generated activation table. Files over 2 MiB, binary, missing or unreadable never match, a path that resolves outside the project (a link out) is never read, an excluded path is never read, and only classes that declare content signals cause a read. Limits the validator enforces: at most 64 regexes of up to 500 characters, at most 64 extensions, a label of up to 80 characters; `contentRegexes` without `contentExtensions` is an error. A regex whose running time cannot be bounded — a repeated group that repeats (`(x+)+`), alternatives that can start alike under a repetition (`(a|aa)+`), back-to-back open-ended repetitions (`a*a*`, `.*.*`) or a back-reference — is an error (`unsafe content regex`), and the runtime ignores such a regex if it reaches it; use bounded repetitions such as `{0,80}`. A list over its cap is an error for the validator; the runtime keeps only the first 64 usable entries. The framework's `ai-feature-gate` class uses this to deliver the AI-engineering protocol on files that call a model SDK.

Class fields deciding membership (`pathRegexes`, `pathGlobs`, `fileNameRegexes`, `excludePathRegexes`, `excludePathGlobs`, `fileExtensions`, and the content signals below) are part of the class's content version, so editing one re-delivers the class and changes its `[[convention:name@hash8]]` tag — regenerate CLAUDE.md/AGENTS.md afterwards. `guideDoc`/`patternsDoc` are the only fields used for documentation-impact routing (`.claude/scripts/doc-impact-map.cjs`); the delivery matchers are not.

Validate with `node .claude/hooks/lib/project-config-schema.cjs --validate docs/project-config.json`. Typical errors: `contextGroups[1] ("general-code"): needs at least one include matcher (pathRegexes, pathGlobs, fileNameRegexes, or contentRegexes with contentExtensions)`, a duplicate or blank `name`, a malformed regex (the error names the class), or an out-of-range `conventionInjection.<field>`. Unknown group fields and a non-whole `priority` are warnings. Check what a file receives: `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`. Details: [../hooks/README.md § Per-File Convention Injection](../hooks/README.md#per-file-convention-injection).

### Session prompt ledger

The optional `.claude/.ck.json` `promptLedger` object tunes the prompt-ledger hook (`prompt-ledger.cjs`), which records every user prompt of a session and re-anchors the original goal after condensation. It is ON by default — no config needed; `enabled: false` (or `CK_PROMPT_LEDGER=0|off|false`) makes it inert, leaving the hook-delivered `task-planning-rules` protocol (`SYNC:session-goal-ledger`) as the only carrier.

```json
{ "promptLedger": { "enabled": true, "maxPromptChars": 4000, "maxEntries": 200, "reinjectAfterBytes": 1000000, "reinjectAfterMinutes": 45 } }
```

| `promptLedger` field   | Default   | Allowed   | Meaning                                                          |
| ---------------------- | --------- | --------- | ---------------------------------------------------------------- |
| `enabled`              | `true`    | boolean   | Record prompts and deliver reminders                             |
| `maxPromptChars`       | `4000`    | 200–20000 | Per-prompt stored size before a truncation marker                |
| `maxEntries`           | `200`     | 2–1000    | Entries kept per session (the original request is never evicted) |
| `reinjectAfterBytes`   | `1000000` | ≥ 50000   | Conversation-history growth that re-arms the reminder            |
| `reinjectAfterMinutes` | `45`      | 1–1440    | Age re-arm when history size is unknown                          |

Records live in `tmp/prompt-ledger/<session>/` (override `CK_PROMPT_LEDGER_DIR`) and are pruned after 7 days. Out-of-range values are clamped, not rejected. Details: [../hooks/README.md § Session Prompt Ledger](../hooks/README.md#session-prompt-ledger).

### Advisory prompt routers

Five accelerators are ON by default and inject a short directive (four on prompts, one after tool results); the universal rules (delivered by the universal hook) still bind without them, so turning one off loses only the reminder. `.claude/.ck.local.json` overrides `.ck.json` per key (local wins), and the switch accepts `false` or the strings `"0"`, `"off"`, `"false"`, `"no"`, `"disabled"`.

| Hook                            | Injects when                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Opt-out (`.claude/.ck.json`)                          | Env opt-out                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------- |
| `commit-skill-route.cjs`        | the prompt asks for a commit — run the `commit` skill, never a raw `git commit` (`review-commit-gate.cjs` still blocks an unreviewed commit)                                                                                                                                                                                                                                                                                                                                                                                             | `{ "commitSkillRoute": { "enabled": false } }`        | `CK_COMMIT_SKILL_ROUTE=0`        |
| `judgement-integrity-route.cjs` | the prompt asks for a verdict, root cause, evaluation, or gap hunt — the `SYNC:judgement-integrity:reminder` directive; also at a sub-agent start and after a compaction while the latest recorded prompt is one                                                                                                                                                                                                                                                                                                                         | `{ "judgementIntegrityRoute": { "enabled": false } }` | `CK_JUDGEMENT_INTEGRITY_ROUTE=0` |
| `core-principles-inject.cjs`    | first prompt, task step or sub-agent start of a session scope, at once after a compaction, then again after ~`reinjectAfterTokens` (default 150000) of transcript growth — the `SYNC:core-engineering-principles` gate                                                                                                                                                                                                                                                                                                                   | `{ "corePrinciplesInject": { "enabled": false } }`    | `CK_CORE_PRINCIPLES_INJECT=0`    |
| `ai-feature-route.cjs`          | the prompt asks to build, plan, change or review an AI feature (an AI technique such as LLM calls, RAG, embeddings, tool/function calling or the Claude API/SDK — not "Claude Code" — AND an action on it) and is not about the framework's own machinery — one short directive (one protocol pointer, the `ai-engineering-review` skill / reviewer sub-agent route) once per session window; questions and framework-meta prompts stay silent; also at a sub-agent start and after a compaction while the latest recorded prompt is one | `{ "aiFeatureRoute": { "enabled": false } }`          | `CK_AI_FEATURE_ROUTE=0`          |
| `quality-skill-remind.cjs`      | the first tool result of a scope, then again after ~150K tokens of growth or a compaction — the `SYNC:quality-skill-routing:reminder` digest (reviews → `why-review`, `changes-review` or `workflow-review-changes`; tests → the project's test skills; failures or errors → `investigate --mode=debug`)                                                                                                                                                                                                                                 | `{ "qualitySkillReminder": { "enabled": false } }`    | `CK_QUALITY_SKILL_REMINDER=0`    |

In concise delivery, the principles hook checks the shared universal-core record
and retries that core when needed. Its standalone reminder switch does not
disable universal guidance.

### Failure investigation reminder

The default-on `failure-investigation-remind.cjs` is configured in the optional project config (`docs/project-config.json`, resolved by the project-config loader), not `.ck.json`:

```json
{ "hooks": { "failureInvestigationReminder": { "enabled": true, "reinjectAfterTokens": 150000 } } }
```

`enabled` is boolean. `reinjectAfterTokens` is an integer from 20000 through 2000000. Missing configuration uses the defaults; malformed declared configuration is rejected by the shared validator. Disable with `enabled: false`.

Shell preflight emits a conditional root-cause hint without claiming a failure. Claude's native `PostToolUseFailure` shares its private dedup record; explicit interruptions stay silent. No command/output text is parsed. Delivery re-arms after configured transcript-byte-estimated growth, context loss or changed text/settings; wall-clock time does not count as tokens. A host without a transcript gets one hint per session/reset/content/configuration window. Missing session identity stays silent; output failure earns no credit. The hint neither starts a skill nor grants full-protocol credit or action authority. Read [../hooks/README.md](../hooks/README.md#failure-investigation-reminder) for host coverage. Codex/OpenCode report native failure events as unsupported and use pre-shell plus silent compact/clear resets; native host invocation still requires trusted/enabled handlers.

OpenCode's legacy bridge appends pending pre-tool context once to the output of the next tool that completes in the session, and falls back to the next model system transform when no tool output can carry it, with session isolation and compact/delete cleanup. Its transport limits are 256 pending sessions, 32 unique contexts and 64 KiB per session; overflow warns without raw context. Pending in-memory text does not survive process restart, and stdout credit does not prove model consumption or adherence. These are transport limits, separate from the configurable reminder interval.

### Framework runtime mode

Read this section when switching framework machinery off, reducing injected context, or restoring normal operation. Every shipped hook checks the switch before context delivery or operational side effects. Protocol hooks first reject irrelevant events using only Node built-ins, then check the mode before reading or writing delivery ledgers.

| Mode    | Behavior                                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `on`    | Normal hooks and their existing individual preferences. Default.                                                                                             |
| `quiet` | No context injection, routing reminders, prompt ledgers or automatic context preparation. Commit review and doc checks, formatting and notifications remain. |
| `off`   | All shipped framework hooks stop. The CLI also disables framework skills in Claude and Codex native discovery until restored.                                |

Use these platform-neutral commands from the project (Windows, macOS and Linux):

```text
node .claude/scripts/framework-mode.cjs show --json
node .claude/scripts/framework-mode.cjs apply
node .claude/scripts/framework-mode.cjs quiet --scope=checkout
node .claude/scripts/framework-mode.cjs off --scope=user
node .claude/scripts/framework-mode.cjs on --scope=user
node .claude/scripts/framework-mode.cjs reset --scope=checkout
```

The exact setting is `frameworkRuntime.mode`. Precedence is default `on` → tracked project config → personal `~/.claude/.ck.json` → ignored `.claude/.ck.local.json` → `CK_FRAMEWORK_MODE`. User scope uses `%USERPROFILE%\.claude\.ck.json` on Windows and the home `.claude/.ck.json` on macOS/Linux. Team scope honors `portability.projectConfigPath`. Each valid higher layer wins; an invalid runtime value expresses no preference, and schema validation rejects invalid saves. The CLI preserves other settings and refuses to overwrite malformed existing files. Reset removes only the selected preference. `show --json` explains every layer and the winning source.

Quiet also inherits native context and tool defaults: the bundle no longer sets Claude `skillListingBudgetFraction` or `CLAUDE_CODE_ENABLE_TODO_TOOLS`, and Codex sync no longer enlarges its project-instruction budget. These are host settings outside the hook switch; removing them prevents the framework from adding that overhead in quiet mode. User-supplied host overrides still apply. The native Claude `workflowKeywordTriggerEnabled: false` opt-out remains, so a keyword does not activate its Workflow tool.

The next hook sees the change without regeneration. **Start fresh Claude/Codex sessions after a native skill change**; existing conversation instructions cannot be withdrawn. The CLI overlays Claude `.claude/settings.local.json` with `skillOverrides: off` and appends a checkout-specific `skills.config` block to the Codex user config (`CODEX_HOME/config.toml`, otherwise `~/.codex/config.toml`). Native `off` includes invocation by name; use this Node CLI to re-enable the framework. Restoring `on`, `quiet` or `reset` restores previous native overrides, leaving the team profile, tracked mirrors and unrelated skills/settings intact. No skills are uninstalled. Project instructions, host tool permissions, repository Git hooks and CI remain separate. OpenCode currently receives the hook switch only; its native skill visibility is not managed by this CLI.

Every mutating CLI command registers its checkout in `~/.claude/framework-runtime-projects.json`. User-scope changes reconcile **registered existing checkouts**, honoring each checkout override. Run `apply` once in a new checkout after generating its mirrors; it registers and reconciles the effective preference without changing it. Direct JSON/environment edits change hooks immediately but need `apply` to reconcile native discovery. Re-run `apply` after adding skills or changing the native Codex home. Global settings cannot discover arbitrary repositories that have never registered. Older framework copies must be updated before they honor the new setting.

The registry is a persistent recovery owner, not disposable output: it records original skill overrides and owned Codex blocks, never full copies of native settings. Do not delete it while a checkout is disabled. Writes are serialized; interrupted native writes can be completed by rerunning `apply`. A stale lock identifies the original process and must only be removed after that process has ended. Changed owned overrides, nonignored Claude local settings, missing mirrors, symlinks and pre-existing user/project Codex `skills.config` declarations are reported before mutation rather than overwritten. Reconcile the named conflict before retrying; `show --json` reports incomplete native state as `recoveryPending`. Managed or session-specific host overrides can still supersede file settings.

Sync verification exercises hooks with a child-process-only `on` override; it does not change saved chat preferences or native visibility. Root `CLAUDE.md` and `AGENTS.md` contain project guidance, with no framework instructions, fallback or navigation. Read `.claude/docs/configuration/native-session-smoke.md` when verifying actual Claude/Codex discovery after changing these controls.

An explicit commit/push request is the operation's authorization: run required checks and proceed without a second confirmation. Commit alone does not authorize push. Native host approval dialogs, when imposed by that host, are separate from framework prompts.

### Commit review selection

`commit.reviewMode` selects the review for requested commits. Default `lightweight` automatically runs
`commit-review --fix-loop` at every risk tier, with at most two rounds. `risk-based` restores Low skip /
Medium why-review / High changes-review. The lightweight skill reviews the exact commit in five instructions, validates findings inline and loads only its short receipt guide for fix-loop execution. It does not routinely load why-review, delegate reviewers or create a separate review workflow. Required project/specialist checks and exact-candidate receipts
still apply. PR whole-branch reviews and CI repairs remain risk-based; a nested commit reuses matching
PR evidence rather than running a second review.

```json
{ "commit": { "reviewMode": "lightweight" } }
```

Put this key in the team project config, `~/.claude/.ck.json` for every project, or the ignored
`.claude/.ck.local.json` for this checkout. Later wins: default → team → user → checkout →
`CK_COMMIT_REVIEW_MODE`. Remove the key to reset that layer. Do not replace unrelated settings.
The environment accepts `lightweight` or `risk-based`; malformed declared settings fail closed.
On Windows, macOS and Linux, inspect the effective setting and selected action from the checkout root:

```text
node .claude/scripts/lib/commit-review-policy.cjs
node .claude/scripts/lib/commit-review-policy.cjs --risk=high --operation=commit
node .claude/scripts/lib/commit-review-policy.cjs --risk=high --operation=pull-request
```

The helper only reports the selection; the skill executes it. It does not authorize Git operations,
waive tests, mint receipts or change native permissions. Shipped permissions have no Git commit/push
ask rules, including force-push patterns. An explicit operation request remains required; no follow-up
confirmation or unsolicited offer to commit/push is part of the framework flow.

### Hook-only delivery: host requirements

The universal rules (`protocol-inject-universal-<n>.cjs` bins), the workflow route (`workflow-route-inject.cjs` for the gate, `workflow-catalog-inject.cjs` for the catalog) and the skill-overlay reminder (`skill-overlay-remind.cjs`) are delivered only by hooks; `CLAUDE.md` and `AGENTS.md` hold project information only and no static fallback exists.

- **Intentional opt-out is supported:** `quiet` and `off` omit injected guidance. In `on`, a host that fails to run hooks cannot deliver the configured rules, route or overlay reminder.
- **Settings kept across an upgrade:** a re-export replaces `.claude/settings.json`; a project that keeps its own file must copy new hook entries from the framework's settings, then run `/sync-codex`. At session start `verify-install.cjs` names a route entry registered without the other (gate without catalog, or the reverse).
- **Codex:** the project must be trusted and each new or changed handler reviewed in `/hooks` before it runs. Until then Codex receives no universal rules and no route. Review the handlers after the first `/sync-codex` and after any handler change.
- **OpenCode sub-agents:** OpenCode has no `SubagentStart`; a sub-agent receives the universal bundle only if its child session's first `chat.message` fires the bridge's `UserPromptSubmit`. That path is unverified (no test covers it); inspect a sub-agent transcript for `CK:UNIVERSAL-PROTOCOLS 1/4` in compatible delivery or `CK:UNIVERSAL-PROTOCOLS 1/1` in concise delivery to check.

Per-handler detail: [../hooks/README.md § Hook-only delivery: host requirements](../hooks/README.md#hook-only-delivery-host-requirements).

### Workflow route mode (per person)

The workflow route — how a prompt becomes a direct answer, a skill, a custom route or a workflow — is delivered **only by hooks**, in the mode each person chooses: `workflow-route-inject.cjs` writes the route output (the `Route mode:` state line and the gate) and `workflow-catalog-inject.cjs` writes the workflow catalog as a second output. The root files (`CLAUDE.md`, `AGENTS.md`) carry no route text and no pointer.

The injection column below describes compatible delivery. Concise delivery keeps
the same routing effects, with compact route cues and explicit catalog retrieval
before selection; mode `off` still emits only its notice.

| Mode            | What the hooks inject                                              | Effect                                                                                                                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ask` (default) | The gate, and the compact workflow catalog as a second output      | The **workflow question** (full workflow · slimmer custom route · execute directly) is asked only when the model's own route is to start a catalog workflow, on the first task of a session; a direct, single-skill or custom-simple route proceeds without asking; an explicit request runs with no question |
| `auto`          | The gate and the catalog, with the full workflow recommended first | The **workflow question** is still asked before a self-selected workflow starts; its recommended option is the full workflow for an `auto` or `confirm` tier, never for `manual`; an explicit request runs with no question                                                                                   |
| `off`           | A short state notice only — no gate, and no catalog output         | No workflow or workflow skill starts without an explicit request; the model executes directly or with the one skill you name. Every quality gate still binds                                                                                                                                                  |

An explicit request (`/workflow-*`, `/start-workflow <id>`, `$workflow-*` on Codex, or asking in words) runs in every mode. So does a workflow that an explicit skill step, the skill you named or an already-running parent workflow requires (for example `/commit` running `/workflow-integration-test --mode=green` to fix a failing test): it is part of that run, not a self-matched workflow — it asks no workflow question and `off` does not skip it; `ask`, `auto` and `off` govern only a workflow the model chooses to start. Mid-session the model never auto-activates a workflow in `ask` or `auto`; `off` is stated once per session.

**Who sets it.** The team may set a default in the tracked project config; each person overrides it in a file that is never committed, or in an environment variable. Precedence, later wins:

| #   | Source                       | Scope                   | Where                                                                                                   |
| --- | ---------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | Framework default            | everyone                | `ask`                                                                                                   |
| 2   | Tracked project config       | team                    | `docs/project-config.json` → `portability.workflowRouteMode`                                            |
| 3   | Personal file, every project | you                     | `~/.claude/.ck.json` → `portability.workflowRouteMode`                                                  |
| 4   | Personal file, this checkout | you                     | `.claude/.ck.local.json` → `portability.workflowRouteMode` (git-ignored by `.claude/.gitignore`)        |
| 5   | Environment                  | you, this shell or host | `CK_WORKFLOW_ROUTE_MODE` set to `ask`, `auto` or `off` (`0`, `false`, `no`, `disabled` also mean `off`) |
| 6   | This session                 | you, this conversation  | first line of a prompt: `workflow-mode: ask`, `auto` or `off` (see below)                               |

The user file is the same `.ck.json` the framework already reads from your home directory. The home directory is `os.homedir()`: `%USERPROFILE%\.claude\.ck.json` on Windows, `$HOME/.claude/.ck.json` on macOS and Linux. A blank, malformed, unreadable or unknown value in any layer is ignored and the next lower layer decides. The tracked `.claude/.ck.json` is never read for this key. With no project config at all, or a project config without the key, nothing above layer 1 applies and the mode is `ask`. Personal layers (3-6) never reach tracked output: the generators read layers 1-2 only.

```json
{ "portability": { "workflowRouteMode": "off" } }
```

Examples: `CK_WORKFLOW_ROUTE_MODE=auto claude` (bash/zsh) or `$env:CK_WORKFLOW_ROUTE_MODE = 'auto'` (PowerShell) for one session; the JSON above in `~/.claude/.ck.json` for every project you work on; in `.claude/.ck.local.json` for one checkout. The legacy boolean `portability.workflowAutoDetect` still works in every file that takes the key: `false` reads as `off`, `true` as `ask`, and `workflowRouteMode` wins when both are present. A team `off` takes effect on the next prompt: the hook reads the project config directly, so nothing needs regenerating.

**In a prompt, or with the skill.** Start a prompt with `workflow-mode: auto` (or `/framework-config --mode=workflow auto`, `$framework-config --mode=workflow auto` on Codex) as its whole first line — only `ask`, `auto` or `off` after the keyword, optionally followed by `save` — and the hook applies that mode to this prompt and the rest of the session (kept in the session's state under `tmp/workflow-routing/`), ahead of every other source when that session state is saved. If session recording fails, the hook applies the mode to this prompt, explicitly reports "session preference NOT saved", and states that later prompts use the recorded/configured mode. With `save` it also writes `~/.claude/.ck.json`; that personal-file result is reported independently and a successful personal save participates in later prompts through the normal preference order. Prose that merely mentions the words, or a directive on a later line or inside a code fence, does nothing. The first task after the directive counts as the session's first task for the workflow rule. The `framework-config --mode=workflow` skill (`/framework-config --mode=workflow [ask|auto|off] [--save] [--local] [--show]`) shows the effective mode and which source decided it, or persists it (`--save` = user file; `--local` = this checkout's file, refused unless git ignores it); `node .claude/scripts/workflow-mode.cjs` does the same from a shell. Every delivered route block, and the off notice, opens with a line `Route mode: <mode> (<source>)`, so the state is visible without the skill. A missing or invalid value anywhere falls back to `ask` and never blocks the hook.

**Hosts.** Claude runs the two route hooks from `.claude/settings.json`; Codex runs them from the mirrored `.codex/hooks.json` (a project hook needs the project trusted and its hash reviewed in `/hooks`); OpenCode runs them through the generated `.opencode/plugins/easy-claude-hooks.js` bridge. All three execute the same files with the same resolver, so the mode behaves identically. A host that runs no hook, or whose hooks are disabled or not yet trusted, delivers no route at all (no root file carries a pointer or fallback): see [Hook-only delivery: host requirements](#hook-only-delivery-host-requirements).

The route is two hook outputs because a host cuts any single output above 10,000 characters to a short preview. Each output is advisory plaintext, never blocks a prompt, is delivered once per session on its own record, and re-arms after a mode or content change, compaction, or about 4.5 MB of transcript growth (the framework proxy for roughly 200K tokens). The gate is always written in full. The catalog output alone is sized to the cap, so its form depends only on the registry: one too large for the compact catalog drops the step-skill names first, then falls back to an index, whatever the length of the gate or of a project route protocol. With routing `off`, or with `portability.skillAutoTrigger` false, no catalog output is sent.

To run a session with the whole framework off — hooks, project instructions and skills — without editing `.claude/`, start `claude --settings .claude/config/vanilla-settings.json --disable-slash-commands` (details and trade-offs: `.claude/config/README.md`).

### Workflow activation tiers

Each `.claude/workflows.json` entry may declare `activation` (default `auto`):

In route modes `ask` (the default; [Workflow route mode](#workflow-route-mode-per-person)) and `auto`, every tier asks the **workflow question** before a catalog workflow the model routes to on its own starts (a direct, single-skill or custom-simple route asks nothing); `ask` lets the tier order the recommendation, `auto` recommends the full workflow first (never for a `manual` tier); in mode `off` nothing starts unasked. The tier and the mode are unrelated settings that share the word `auto`. The question is one question offering (a) the full workflow with its step count, (b) a slimmer custom route listing its steps with every required gate kept, (c) direct execution — recommended option first, with a one-line reason. The tier only decides which option is recommended:

| Tier      | Recommended option                                                                                          | Enforced by                                                                                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auto`    | By catalog fit: the full workflow when >80% of its unconditional steps do real work, else the slimmer route | Route gate, `start-workflow`                                                                                                                                                         |
| `confirm` | The full workflow only when no leaner route would satisfy the request                                       | Route gate, `start-workflow`; OpenCode `permission.skill` `ask` on the wrapper skill                                                                                                 |
| `manual`  | Never the full workflow; it runs only when the user picks it or asks for it explicitly                      | Route gate, `start-workflow`, the wrapper skill's `disable-model-invocation: true` (Claude) and the generated `agents/openai.yaml` `policy.allow_implicit_invocation: false` (Codex) |

Framework defaults: every workflow is tier `auto` except the two heaviest, `workflow-big-feature` and `workflow-greenfield-init`, which are `confirm`. The workflow question is asked on the first task of a session only; mid-session the model neither starts a workflow nor asks to. No framework workflow ships `manual`; a project that wants one opts in with `portability.workflowActivation`. An explicit request (`/workflow-<id>`, `/start-workflow <id>`, `$workflow-<id>` on Codex, or asking in words) runs any tier with no question. Changing a workflow to or from `manual` also means changing its wrapper skill's `disable-model-invocation` — a test fails when the two disagree.

A project can tighten these tiers without forking `workflows.json` through `portability.workflowActivation` in `docs/project-config.json`:

```json
{ "portability": { "workflowActivation": { "default": "confirm", "overrides": { "workflow-bugfix": "auto" } } } }
```

| `portability.workflowActivation` field | Default                | Allowed                                          | Meaning                                                                                                                 |
| -------------------------------------- | ---------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `default`                              | none (framework tiers) | `auto`, `confirm`, `manual`                      | Floor applied to every workflow: the effective tier is the stricter of this and the framework tier, so it only tightens |
| `overrides`                            | none                   | map of workflow id → `auto`, `confirm`, `manual` | Pins one workflow's tier; wins over `default` and the framework tier, so it may loosen                                  |

Tier order is `auto` < `confirm` < `manual`. Omitting the object keeps every framework tier. An unknown tier in either field is a validation error naming the key and `auto|confirm|manual`. A developer may override it in the git-ignored `.claude/.ck.local.json` (same nesting): each setting in `.claude/.ck.local.json` wins over the team value; overrides merge per workflow id, so a local `overrides`-only object keeps the team `default`.

### Custom workflow-route protocol

The route output can carry project-supplied additional route rules via `portability.workflowRouteProtocol`. The team value lives in `docs/project-config.json`; a developer can override it in the git-ignored `.claude/.ck.local.json` (a valid local value replaces the team value). The value is either an inline string or an object `{ "text"?, "path"? }` where `path` is a repo-relative markdown file read at runtime (absolute paths and `..` segments are rejected):

```json
{ "portability": { "workflowRouteProtocol": { "path": "docs/project-protocols/route.md" } } }
```

`workflow-route-inject.cjs` appends the resolved text after the gate in its own marker block (`<!-- CK:WORKFLOW-ROUTE-PROTOCOL -->`), advisory only and never blocking; a protocol never changes the catalog's form. **Keep it to about 3,300 characters or fewer.** The framework never drops or cuts a protocol, but it shares one hook output with the gate, and a host shows one hook output in full only up to 10,000 characters: past that the model gets a short preview, the gate included. With the shipped gate, about 3,300 characters keeps the route output within the 9,500-character cap and about 3,850 takes it past 10,000; the route output then says so on its second line, where the preview still shows it, and names the protocol size that fits. A `path` naming a privacy-sensitive file (`.env`, credentials, secrets, `*.pem`/`*.key`) is refused — the validator rejects it and the runtime treats it as no opinion. The runtime also checks the physically resolved project-relative target, so a public alias cannot expose a private target; aliases to eligible public files remain readable. A file over 20,000 bytes is truncated with a visible marker. It is runtime-only and is never stamped into tracked `CLAUDE.md`/`AGENTS.md`/Codex context.

### Just-in-time path rules

When inlined `contextGroups[].rules` push the generated root context past its byte budget, the team can opt out of inlining them in `docs/project-config.json`:

```json
{ "portability": { "inlinePathRules": false } }
```

`SECTION:golden-rules` then names the rule-bearing groups and requires pre-action lookup. Enable `conventionInjection.completeLookup: true` with `conventionInjection.enabled: true` to retrieve **every** matching read/edit class through `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`. Read all returned pages, repeating with `--page N`. Pages stay within 9,500 characters; automatic PostToolUse reminders keep their caps and are only accelerators. This mode also replaces the generated path pre-read table with one pointer.

The generator requires named, unique rule-bearing groups and a library advertising complete lookup support. Older libraries or configurations without this opt-in retain the legacy proof: all rule groups must fit the class cap and worst-case digest size. If either delivery proof fails, rules remain inline and `[WARN] INLINE_PATH_RULES` names the missing precondition. Read `.claude/skills/ai-context-refresh/SKILL.md` when enabling this mode.

For task-scoped config discovery, run `node .claude/scripts/project-context.cjs --context`; add `--section <top-level-key>` for each required section. The loader validates the **entire** config before projection, preserves absent versus explicit-empty reference selection, and resolves relocated config/docs-index paths. Missing config is supported; malformed declarations fail with no projected output. Read the full config when editing it.

### Startup dependency installation

`docs/project-config.json` `hooks.startupInstall` tunes the startup dependency install. Its single
consumer is the registered SessionStart integrity hook `.claude/hooks/verify-install.cjs`, which runs
the install-integrity scan first and then delegates policy to `.claude/hooks/lib/startup-install.cjs`.
The install is attempted only on an explicit `startup` session source and only when the project root
manifest declares dependencies that are not installed; no root manifest, no declared dependencies, or
dependencies already present are clean no-ops. A partial `.claude` bundle reports the repair path
and attempts no install at all.

```json
{
    "hooks": {
        "startupInstall": {
            "enabled": true,
            "packageManager": "auto",
            "allowLifecycleScripts": false
        }
    }
}
```

| `hooks.startupInstall` field | Type    | Default  | Allowed                              | Meaning                                                                                                   |
| ---------------------------- | ------- | -------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `enabled`                    | boolean | `true`   | boolean                              | `false` disables installation only (outcome `skip-disabled`)                                              |
| `packageManager`             | string  | `"auto"` | `auto`, `npm`, `pnpm`, `yarn`, `bun` | One manager **signal**, never a precedence override                                                       |
| `allowLifecycleScripts`      | boolean | `false`  | boolean                              | A repository **request** only — effective solely with the `CK_STARTUP_INSTALL_TRUST=1` host grant (below) |

**The section and every property in it are optional.** An omitted property keeps the portable default,
and the defaults are identical whether the property, the whole `hooks` section, or the entire
`docs/project-config.json` file is absent: `enabled: true`, `packageManager: "auto"`,
`allowLifecycleScripts: false`. A project that declares nothing behaves exactly as it did before the
section existed, so declare it only to record a needed non-default.

**A declared `packageManager` is a signal, not an override.** A non-`auto` value joins the other
available signals — the root manifest's Corepack `packageManager` field, `project.packageManagers`,
every recognized root lockfile, and a detected Yarn PnP install — and all of them must resolve to one
manager (and to at most one pinned version) or the install fails closed with `skip-manager-conflict`
and runs nothing. Declaring `"npm"` in a project carrying `pnpm-lock.yaml` therefore installs nothing;
it does not switch the project to npm. With no signal at all the historical `npm` fallback applies.

**Disabling installation never disables integrity verification.** `enabled: false` short-circuits the
install only; `verify-install.cjs` still scans the `.claude` bundle for missing hook files and
transitive requires, and still reports a partial copy.

**The manager executable and its arguments are not configurable — by design.** No config key can
supply a command, a flag, or a path. The hook only ever runs a fixed, version-matched argv taken from
its own support matrix, so no project config can turn the startup hook into an arbitrary command
runner, under a fixed 120-second deadline for the manager process. That closed argv is what makes
this section safe to expose at all. `allowLifecycleScripts: true` only removes the suppression
argument that matrix row already defines (`--ignore-scripts`, `--skip-builds`, or
`--mode=skip-build`); it grants nothing else, manager-native policy such as Bun's
`trustedDependencies` still governs dependency scripts, and a project-loaded manager extension
(a `pnpmfile`, `YARN_PLUGINS`, a `.yarnrc` `yarn-path`) skips the install regardless of the opt-in.

**`allowLifecycleScripts: true` needs a second, host-side signal to do anything.** A repository can
only REQUEST unsuppressed scripts; the environment variable `CK_STARTUP_INSTALL_TRUST=1` is the grant,
and the effective value is `allowLifecycleScripts === true && CK_STARTUP_INSTALL_TRUST === '1'`. This
is deliberate: a checked-in config travels with a clone, so it must not be able to authorize running a
dependency's install scripts on a machine whose owner never agreed to that. Without the grant the
install still proceeds with suppression intact — so the failure mode of setting only the config key is
SILENT (you get `--ignore-scripts` anyway, and the diagnostic vocabulary has no code for "request not
granted"). Grant it per machine in `.claude/settings.local.json`, which is git-ignored:

```json
{
    "env": {
        "CK_STARTUP_INSTALL_TRUST": "1"
    }
}
```

The same grant has a **second effect that is easy to miss**: without it the runner sanitizes the
manager's child environment — known registry-credential variables are stripped and npm's user and
global config paths are pointed at a credential-free device path, so an ambient `.npmrc` cannot be
read. Granting trust stops that sanitization, which is what lets a private-registry install
authenticate, and equally what exposes those credentials to whatever lifecycle scripts now run. Grant
it when a project genuinely needs built native dependencies or a private registry at session start;
leave it ungranted otherwise.

**Supported breadth.** Managers `npm`, `pnpm`, `yarn`, `bun` across the matrix rows `npm@10-11`,
`npm@12`, `pnpm@9.15.0`, `pnpm@12`, `yarn@1`, `yarn@2.4`, `yarn@3-4`, `bun@1.2`; recognized root
lockfiles `package-lock.json` and `npm-shrinkwrap.json` (npm), `pnpm-lock.yaml` (pnpm), `yarn.lock`
(yarn), `bun.lock` and `bun.lockb` (bun); platforms `win32`, `linux`, `darwin`. A manager version
outside the matrix, an ambiguous lockfile pair, a lockfile that is recognized but unsupported on the
installed version (npm 12 with only `npm-shrinkwrap.json`, Bun 1.2 with only the legacy `bun.lockb`),
an unsupported platform, or a Corepack shim all skip instead of guessing — a pinned dependency graph is
never reinterpreted as lockless.

**Config states.** An absent config file uses the defaults above. An invalid config file skips
installation with `skip-config-invalid`, and a config loader that cannot be loaded at all skips with
`skip-config-unavailable` — it fails closed rather than falling through to the enabled default, because
an adopter's explicit disablement cannot be established. Diagnostics are one-line, fixed-vocabulary
strings on stderr; they never echo a path, a config value, or manager output, and most skips are silent
no-ops.

Validate with `node .claude/hooks/lib/project-config-schema.cjs --validate docs/project-config.json`
(`--describe` prints the authoritative field list). Hook-side details:
[../hooks/README.md](../hooks/README.md).

### Code graph switch

`docs/project-config.json` `hooks.codeGraph.enabled` decides whether the code-graph hooks and CLI run:

| Value              | Meaning                                                  |
| ------------------ | -------------------------------------------------------- |
| `"auto"` (default) | Active only when `.code-graph/graph.db` exists           |
| `"on"`             | Always active                                            |
| `"off"`            | Graph hooks stay silent and the graph CLI refuses to run |

Omitting the key or the `codeGraph` object means `"auto"`. Any other value is a validation error naming `auto|on|off`.

### Token checkpoint

> **Read by `token-budget-checkpoint.cjs`.** The checkpoint hook (PostToolUse on `TodoWrite|TaskCreate|TaskUpdate|update_plan`, main conversation only) reads `hooks.tokenBudget` on every task/plan step and counts the session's main and sub-agent Claude transcripts. On a host whose transcript it cannot read, it stays silent. A malformed section keeps the checkpoint off until the config is fixed. Claude users can also check spend with `/context`.

`docs/project-config.json` `hooks.tokenBudget` tunes an advisory checkpoint at task/plan step boundaries: each time the session's non-cached tokens (input + cache creation + output; cache reads never count) cross the next multiple of `checkpointTokens`, the model gets one note suggesting a progress report and asking whether to continue. It never blocks.

```json
{ "hooks": { "tokenBudget": { "enabled": true, "checkpointTokens": 500000 } } }
```

| `hooks.tokenBudget` field | Type    | Default  | Allowed        | Meaning                             |
| ------------------------- | ------- | -------- | -------------- | ----------------------------------- |
| `enabled`                 | boolean | `true`   | boolean        | `false` turns the note off          |
| `checkpointTokens`        | integer | `500000` | 50000–20000000 | Non-cached tokens between two notes |

A `checkpointTokens` value outside the range, or not a whole number, is a validation error naming the key and the range.

### Commit `Fix-Origin` trailer

`docs/project-config.json` `commit.fixOriginTrailer` (boolean, default `false`) opts a project into the author-declared `Fix-Origin: <feedback|regression|not-applicable>` trailer. When `true`, the `commit` skill writes it on new commits only; existing commits are never reworded to add it. When omitted or `false`, commit messages carry no `Fix-Origin` trailer.

### Pull-request target branch

`docs/project-config.json` `pullRequest.targetBranch` (string, default `main`) is the base branch the `pull-request` skill branches from and opens PRs into. Two things take precedence over it: a base branch named in the request, and the base of a PR already open for the current branch. When omitted, the skill uses `main`.

### Pull-request update of a pushed branch

`docs/project-config.json` `pullRequest.pushedBranchUpdate` (`merge` | `rebase`, default `merge`) decides how the `pull-request` skill brings a PR branch whose commits are already pushed up to date with the target. It changes only the method: in both modes the skill updates such a branch only when GitHub reports it conflicting or behind, or when asked, because every update makes a new head. `merge` merges the target in and never rewrites a pushed commit. `rebase` rebases the branch onto the target and pushes it with `git push --force-with-lease=<branch>:<sha>`, only when every replayed commit belongs to the current git user and the local branch contains the remote one; otherwise the skill merges. Choose `rebase` when the project wants feature branches kept linear, so catch-up merge commits never reach the target through a merge-commit PR merge. The target branch is never force-pushed in either mode, and a branch that was never pushed is rebased in both.

### Configure without knowing JSON keys

Ask “How do these .claude skills work?”, “What can I configure in this .codex framework?” or
“Disable automatic heavy skills for this checkout”. The `framework-config` skill selects automatically
from its description and handles framework help plus show/explain/set/reset. Explicit commands:
`/framework-config` (Claude/OpenCode), `$framework-config` (Codex).

The skill also handles runtime modes, commit review selection and the team's explicit-only skill list.
For example, `/framework-config --mode=settings quiet --scope=user`,
`/framework-config --mode=settings use lightweight commit reviews --scope=checkout`, or
`/framework-config --mode=settings make <skill-name> explicit-only --scope=team`.
Read `.claude/skills/framework-config/SKILL.md` when applying these requests, registering a new checkout
with `apply`, or resetting one layer. Runtime `off` is separate from workflow routing `off`.

Questions are read-only. Changes default to checkout scope; say “for every project” for your user
preference or “for the team” for the project default. Existing JSON is merged and validated, and reset
removes only the selected layer’s key. This helper remains eligible when heavy auto-trigger is off and
in the minimal visibility preset, unless you explicitly impose a native permission override.

### Skill auto-trigger (runtime, per developer)

Set `portability.skillAutoTrigger: false` to ask before starting a suitable matched framework skill: run
the skill, or skip it and execute directly. Named user requests and required hook/protocol calls stay
callable. Default: `true` (today's behavior). This treats **all framework skills and workflow wrappers as heavy except `commit`,
`pull-request` and the lightweight `framework-config` help/configuration entry**; personal, bundled and third-party skills are outside its scope.

```json
{ "portability": { "skillAutoTrigger": false } }
```

Place this in the configured project config (default `docs/project-config.json`, overridden by
`.claude/.ck.json` `portability.projectConfigPath`) for the team, `~/.claude/.ck.json` for yourself
across projects, or git-ignored `.claude/.ck.local.json` for this checkout. Later valid values win:
default → team → user → checkout-local → `CK_SKILL_AUTO_TRIGGER`. Environment values accept
`0/false/off/no/disabled` and `1/true/on/yes/enabled`; config values must be actual booleans.
Use `true` to override a team `false`. Missing, malformed and invalid layers express no opinion.
The hook reads effective preferences at runtime; changing this preference needs **no regeneration**.

Restricted mode distinguishes **selection** from **execution**:

- Ordinary “fix this”, “review these changes” or “implement this” prompts do not authorize a matching
  heavy skill by themselves. If a suitable skill matches, the assistant names it, explains its fit and
  asks once: **Run the matched skill** or **Skip the skill and execute directly**. It waits for your
  answer. Confirmation authorizes that skill and its scoped dependencies; Skip proceeds directly
  with required quality/safety checks and no replacement skill. The same task is not asked again on
  follow-up, delegation or resume. With no suitable match, the assistant executes directly without
  a question. Explicit named requests and already authorized steps need no skill-choice question.
- An operation-specific hook/protocol may require a named skill for an operation already active.
  Once an authorized skill/workflow starts, its required dependencies remain eligible. Optional
  suggestions, generic discovery guidance and self-starting a preloaded agent do not qualify.
- `commit` is a five-line coordinator; `pull-request` owns [its whole-branch policy](../../skills/pull-request/references/check-policy.md): they never ask whether to run tests or review. Tests are skipped only when the affected tests already passed in the session for unchanged content or the change is really small; otherwise scoped tests run and failures are fixed until all pass. Commits default to lightweight `commit-review` at every risk tier through `commit.reviewMode`. In configured `risk-based` mode, and for PR whole-branch scope, low risk skips review, medium risk runs `why-review`, and high risk runs `changes-review`. Reviews are fix loops of at most two rounds. Findings still open at that cap stop the operation uncommitted with a report. Changed content needs fresh evidence, not an old Skip. An explicit instruction about tests or review overrides the automatic choice, and the selected review
  can run its required reviewers, findings validation and fix loop as written.
  The auto-trigger preference does not decide tests/review, approve Skip, or grant Git authority; the skill decision policy owns those decisions.
- The competing automatic workflow catalog is suppressed. Existing workflow-route restrictions and
  native permissions/manual-only skills remain in force.

The same `skill-activation-inject.cjs` emits the full policy on every restricted prompt, delegated
start and recovery. It never substitutes a presence-based reminder. Isolated agent reset state records
confirmed writes only; missing storage and failed output leave the next full replay eligible.
Codex mirrors the runtime producer; OpenCode refreshes it at system-context
transformation for main and child sessions and discards cached startup copies of this policy.
Restoring auto mode emits a reset in scopes that previously received the restriction, then stays silent.

**Why not the native manual-only flags?** Claude's `disable-model-invocation`/user-only overrides and
OpenCode's skill `deny` can reject model calls, including hook-directed calls. Codex documents explicit
user invocation with `allow_implicit_invocation: false`, but no portable hook exception. This switch
therefore changes no frontmatter, `agents/openai.yaml`, `skillOverrides` or `permission.skill` entries.
Existing `skillProfile` settings may still block a requested call; this mode does not override them.

**Enforcement limit:** this is an assistant-selection instruction, not a hard access-control boundary.
Skills remain discoverable, so it reduces unsolicited procedure execution rather than catalog context
size. Adapter tests prove policy delivery and preserved call paths; they do not prove every model obeys
the instruction on every turn. Hosts must run the framework hooks (and OpenCode its generated bridge).

An explicitly requested workflow also authorizes its required and selected applicable skill steps within the declared workflow scope, recorded in a todo/task plan, including later or resumed execution and their required nested calls. A plan created from ordinary task wording cannot authorize a heavy workflow by itself.

### Skill profile

`docs/project-config.json` `skillProfile` sets, for the whole team, which skills the model sees. `preset` picks a base from `.claude/config/skill-profiles.json`: `full` (no overrides), `standard` (skills other skills or hooks start leave the model's list but stay callable by name), or `minimal` (only the entry skills stay listed). The lists `nameOnly`, `commandOnly` (only a user's `/name` starts it) and `off` (skill folder names; one list per skill) apply on top of the preset.

Apply it with `node .claude/scripts/sync-skill-profile.cjs` (`--check` is read-only). The guard refuses, and writes nothing, when `commandOnly` or `off` would hide a called skill — one a workflow step or an agent `skills:` entry starts, or one on the curated `calledByOthers` or `entrySkills` list (the workflow runner and the setup skills that gates and hooks start) — unless `allowHidingCalledSkills: true`. `nameOnly` is allowed for any skill. Read `.claude/config/README.md#skill-profile` when you need the per-host effect (Claude `skillOverrides`, Codex, OpenCode), the ownership ledger, or the fail-closed inputs.

---

### workflows.json

**Purpose:** Canonical workflow definitions and execution metadata. Use the route mode (`portability.workflowRouteMode`, [Workflow route mode](#workflow-route-mode-per-person)) to choose how a matched workflow starts or to turn automatic routing off, and a workflow's `activation` tier ([Workflow activation tiers](#workflow-activation-tiers)) to choose which option the workflow question recommends.

```json
{
    "version": "2.4.0",
    "workflows": {
        "feature": {
            "sequence": ["plan", "feature-implement", "test", "code-quality-review", "docs-manager --mode=update"],
            "whenToUse": "User wants to implement new functionality"
        }
    }
}
```

**Schema:** Each workflow entry supports `activation`, `defaultMode`, `description`, `intent`, `name`, `outcomeGates`, `parallelGroups`, `preActions`, `sequence`, `stepMeta`, `variants`, `whenToUse` (`WorkflowEntry` in `.claude/workflows.schema.json`). `variants` holds one complete `sequence` per mode (plus optional `parallelGroups`, `stepMeta` and `outcomeGates`), `defaultMode` names the default mode, and a variant's own `outcomeGates` are added to the entry-level `outcomeGates` that every mode shares. There are NO `priority` or `triggers` properties. When runtime routing is enabled, the model semantically matches the prompt against `whenToUse`; otherwise the catalog remains available only through explicitly invoked workflow skills.

**Live catalog (17 workflows):** `workflow-big-feature`, `workflow-bugfix`, `workflow-e2e`, `workflow-feature`, `workflow-implement-spec`, `workflow-feature-spec`, `workflow-greenfield-init`, `workflow-planned-work`, `workflow-refactor`, `workflow-research`, `workflow-review-changes`, `workflow-architecture-audit`, `workflow-code-to-spec`, `workflow-spec-to-mockup`, `workflow-spec-sync`, `workflow-seed-test-data`, `workflow-integration-test`.

| Workflow                  | Sequence (abridged, from `workflows.json`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | whenToUse (abridged)                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `workflow-feature`        | investigate → … → spec + test specs → plan → plan --mode=execute → integration-test → spec sync → review → verify → workflow-end                                                                                                                                                                                                                                                                                                                                                                                                        | Well-defined feature; no canonical spec has the behavior yet                     |
| `workflow-implement-spec` | investigate → spec [mode=clarify] → plan → plan --mode=execute → seed-test-data (conditional) → integration-test (conditional) → spec [mode=sync] (when behavior differs) → workflow-review-changes `--tests=defer` → integration-test --mode=verify → workflow-e2e (on request; a gate in `--mode=greenfield-slice`) → test `--proven=@verify` → workflow-end → watzup (conditional)                                                                                                                                                   | Behavior already written in a canonical spec or TC set; a greenfield first slice |
| `workflow-bugfix`         | investigate --mode=debug → … → fix → … → workflow-end                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Bug, error, crash, regression; end-to-start trace                                |
| `workflow-refactor`       | investigate → plan → … → plan --mode=execute → … → workflow-end                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Restructure code without behavior change                                         |
| `workflow-review-changes` | triage → changes-review + whole-target why-review + triage-selected specialists (`--fix-loop --loop-owner=caller` read-only passes; independent lenses may run together) (`integration-test --mode=review --prove-tests` always runs unless a parent passes `--tests=defer`, the verify-last order) (the simplifier is a report-only lens) → validate findings once → `fix --target=review` → domain refresh + docs-manager --mode=update → fresh re-run of every applicable lens on the settled target → workflow-end (top level only) | Whole pull request or complex, risky changes                                     |

---

### .mcp.json

**Purpose:** Model Context Protocol server integrations.

```json
{
    "mcpServers": {
        "github": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "" }
        },
        "context7": {
            "command": "npx",
            "args": ["-y", "@context7/mcp-server"]
        }
    }
}
```

| Server     | Purpose                                                               |
| ---------- | --------------------------------------------------------------------- |
| `github`   | GitHub API integration (issues, PRs, repos)                           |
| `context7` | Optional library-docs accelerator for `/web-research` (host-agnostic) |

---

### opencode.json (recommended defaults)

**Purpose:** opencode's project config. The framework ships recommended defaults and reconciles them into each consuming project through `/sync-opencode`.

| Item                                           | Path                                                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Source of truth (edit this to change defaults) | `.opencode/opencode.recommended.json`                                                                 |
| Generated target (created/updated by the sync) | `<project-root>/opencode.json`                                                                        |
| Writer / verifier                              | `.claude/scripts/opencode/sync-config.mjs` (`--check` verifies)                                       |
| Sub-agent mirror source of truth               | `.claude/agents/*.md`                                                                                 |
| Sub-agent mirror target (generated)            | `.opencode/agent/<name>.md` — one per canonical agent, `mode: subagent` + the canonical body verbatim |
| Sub-agent mirror writer / verifier             | `.claude/scripts/opencode/sync-agents.mjs` (`--check` verifies)                                       |

**To update a default recommended opencode setting:** edit `.opencode/opencode.recommended.json` and run `/sync-opencode` (or `node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs`). The `config` stage deep-merges the recommended defaults into the project-root `opencode.json` — recommended keys win at every leaf, project-only keys survive untouched, and a project with no root config receives the recommended defaults verbatim. A malformed existing root config is reported, never clobbered.

**Adopting the framework in a new project:** copy the `.opencode/` folder (including `opencode.recommended.json`) plus `.claude/`, then run `/sync-opencode` to generate/update the project's root `opencode.json`, the hooks bridge, the `.opencode/agent/*.md` sub-agent mirror, the `permission.skill` entries and the `.opencode/commands/<name>.md` files. Do NOT copy `.opencode/skill-permissions.generated.json` (the skill-permission ownership ledger) or `.opencode/commands/`: both are generated per project. The ledger records its project's name (`project.name` from the project config, default `docs/project-config.json`), so a ledger copied from another project is ignored and treated as empty.

**No compaction pin (all three surfaces):**

The portable bundle sets no auto-compaction budget on any host, so each host compacts at its own default and each person picks their own value. Keep a personal budget in personal or local config, never in a file the bundle ships to the whole team.

| Surface     | Host default (no pin)                                                                                               | Set your own                                                                                                                                                                                                                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code | Compacts near the model's context limit: about 967K on a 1M-window model; 200K models are unchanged                 | `/autocompact 500k` (saved as `autoCompactWindow` in your user settings) · `claude --autocompact 500k` (one launch) · `env.CLAUDE_CODE_AUTO_COMPACT_WINDOW` in `~/.claude/settings.json` (all projects) or `.claude/settings.local.json` (this project only). Never put it in `.claude/settings.json`: that shared scope outranks user settings, and the env var overrides `/autocompact` |
| Codex       | Codex's own default                                                                                                 | `model_auto_compact_token_limit` in `~/.codex/config.toml`, or top-level in the project `.codex/config.toml`                                                                                                                                                                                                                                                                              |
| opencode    | The model's registry window; the bundled model declares a 1M `context` and 384K `output`, so it compacts at 968,000 | `provider.<id>.models.<model>.limit` in the project-root `opencode.json` or your global opencode config                                                                                                                                                                                                                                                                                   |

**Retiring the old pin.** Earlier bundles pinned 500K on every host. `/sync-codex` removes a top-level `model_auto_compact_token_limit` from `.codex/config.toml` only when its value is exactly `500000`, along with the bundled comment block above it when that block is unchanged. `/sync-opencode` removes the pinned model's `limit` from the root `opencode.json` only when it is exactly `{ "context": 500000, "output": 384000 }`. Any other value belongs to the user: the sync keeps it and prints one `kept user-set …` line. A personal 500K budget should therefore live in user-level config (`~/.codex/config.toml`, the global opencode config), where no sync looks.

**Codex `AGENTS.md` read budget:** sync adds no `project_doc_max_bytes` override. It removes the exact former top-level `98304` value and preserves custom values, alternate spellings and nested settings. Retirement stops at the first table, multiline string or multiline collection, conservatively preserving complex user configuration. A deliberate personal `98304` value belongs in user config, which sync never edits for this migration. Project-only instructions should fit the native 32 KiB limit, including nested `AGENTS.md` files; reduce instruction volume rather than increasing a framework allowance. The projection reports overflow without truncating content.

opencode has no absolute compaction threshold — it compacts relative to the model's declared window, so a `limit.context` you set is the knob (it compacts at `limit.context - min(limit.output, 32000)`). `compaction.reserved` is inert for this model: opencode reads it only for models that declare `limit.input`. Read the `sync-opencode` skill ("Compaction: host default") for the exact formula before setting your own `limit`.

> `.opencode/opencode.recommended.json` MUST NOT be renamed to `.opencode/opencode.json`: opencode auto-loads that path as project config, so it would stop being a template.

**See:** the `sync-opencode` skill for the full stage roster and merge/portability contract.

---

## Quick Configuration Guide

### Enable/Disable Features

```json
// .ck.json
{
  "promptLedger": { "enabled": false },      // Disable prompt-ledger recording
  "commitSkillRoute": { "enabled": false },        // Disable the commit-skill prompt router
  "judgementIntegrityRoute": { "enabled": false }, // Disable the judgement-integrity prompt router
  "aiFeatureRoute": { "enabled": false },          // Disable the AI-feature prompt router
  "qualitySkillReminder": { "enabled": false }     // Disable the quality-skill reminder after tool results
}

// settings.json
{
  "enabledPlugins": {
    "playwright@claude-plugins-official": false  // Disable plugin
  }
}
```

### Store Active Project Rules

Keep tracked `.claude` defaults project-neutral. Put path-specific conventions in
`docs/project-config.json` `contextGroups` and authoritative detail in the
referenced project docs. `.ck.json.assertions` is retained for compatibility,
but its values are not injected into the standard prompt context.

### Tailor AI-feature review to a project

The AI-engineering gate ships project-neutral. A project adds its own rules only through these routes, never by editing `.claude/skills/shared/protocols/ai-*.md`, the `ai-engineering-review` skill or the reviewer agent:

| Need                                                                                                                              | Route                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Which files are AI surface (an internal LLM wrapper, prompt folders, another SDK) and the short rules or docs delivered with them | Declare a `contextGroups` class named `ai-feature-gate` in `docs/project-config.json` (at least one include matcher, then `pathRegexes`, `contentRegexes`, `rules`, `referenceDocs`). It replaces the built-in class for the per-file hook and `ai-signal-scan.cjs` (`classSource: config`). |
| Provider, approved models, data boundary, risk tier, eval thresholds                                                              | Record them in an ADR or a project reference doc listed in the docs index or `referenceDocs`. Project policy outranks the `AE-*` clauses, and the review records `Project policy read: <paths>`.                                                                                             |
| An extra review rule for one skill (for example a house eval threshold for `ai-engineering-review`)                               | `/project-skill-protocol add` — an additive overlay that can never waive the gate.                                                                                                                                                                                                           |
| Turn the prompt reminder off                                                                                                      | `.claude/.ck.json` `aiFeatureRoute.enabled: false` or `CK_AI_FEATURE_ROUTE=0`.                                                                                                                                                                                                               |

Validate with `node .claude/hooks/lib/project-config-schema.cjs --validate docs/project-config.json`. A matcher change alters the class's content tag, so regenerate `CLAUDE.md` and `AGENTS.md` afterwards.

### Customize Plan Naming

```json
// .ck.json
{
    "plan": {
        "namingFormat": "{date}-{issue}-{slug}",
        "dateFormat": "YYMMDD-HHmm",
        "issuePrefix": "GH-"
    }
}
```

### Add Tool Permissions

```json
// settings.json
{
    "permissions": {
        "allow": ["Bash(docker:*)"],
        "deny": ["Bash(rm -rf /*)"],
        "ask": ["Bash(npm publish:*)"]
    }
}
```

---

## Configuration Inheritance

Configuration is loaded in order with later files overriding earlier:

1. **Claude Code defaults** - Built-in settings
2. **User settings** - `~/.claude/settings.json`
3. **Project settings** - `.claude/settings.json`
4. **Session settings** - Runtime modifications

---

## Environment Variables

Set a personal switch as an `env` entry in the git-ignored `.claude/settings.local.json`, or in your shell.

| Variable                                                                                | Purpose                                                                                                                                                                              |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CLAUDE_PROJECT_DIR`                                                                    | Project root directory, set by the host and used in hook commands                                                                                                                    |
| `CK_DEBUG`                                                                              | `1` or `true`: framework hooks print diagnostics to stderr (`.claude/hooks/lib/debug-log.cjs`)                                                                                       |
| `CLAUDE_HOOK_DEBUG`                                                                     | `1` or `true`: hooks append a lifecycle trace (no transcript text) to a log file, rotated at 1 MB, keeping one backup                                                                |
| `CLAUDE_HOOK_DEBUG_LOG`                                                                 | Path of that trace file; default `<os temp>/ck/debug/bash-hooks.log`                                                                                                                 |
| `CK_NO_AUTO_OPEN`                                                                       | `1`: HTML reports (`watzup`, `understand`) print their path instead of opening, and `task-track` `serve --open` starts no browser; nothing opens under `CI` or headless Linux either |
| `CK_AUTO_INSTALL_DEPENDENCIES`                                                          | `0`, `off` or `false`: no automatic dependency install (catalog tooling's PyYAML recovery, the `task-track` pinned package); the tool refuses with the by-hand command instead       |
| `CK_STARTUP_INSTALL_TRUST`                                                              | `1`: host grant that lets `hooks.startupInstall.allowLifecycleScripts: true` take effect (see [Startup dependency installation](#startup-dependency-installation))                   |
| `CK_PROMPT_LEDGER`                                                                      | `0` / `false` / `off` / `no`: turns the session prompt ledger off, like `promptLedger.enabled: false` in `.ck.json`                                                                  |
| `CK_PROMPT_LEDGER_DIR`                                                                  | Directory for prompt-ledger records instead of `<project>/tmp/prompt-ledger`                                                                                                         |
| `CK_COMMIT_SKILL_ROUTE`                                                                 | `0`: stops the reminder to commit through the `commit` skill, like `commitSkillRoute.enabled: false`                                                                                 |
| `CK_JUDGEMENT_INTEGRITY_ROUTE`                                                          | `0`: stops the judgement-integrity reminder, like `judgementIntegrityRoute.enabled: false`                                                                                           |
| `CK_AI_FEATURE_ROUTE`                                                                   | `0`: stops the AI-feature (AI-engineering gate) reminder, like `aiFeatureRoute.enabled: false`                                                                                       |
| `CK_QUALITY_SKILL_REMINDER`                                                             | `0`: stops the quality-skill reminder after tool results, like `qualitySkillReminder.enabled: false`                                                                                 |
| `DOC_SYNC_OVERRIDE`                                                                     | `1`: silences the doc-sync commit warning (the gate only warns, never blocks); each use is appended to the gate's audit log                                                          |
| `ENABLE_DESKTOP_NOTIFICATIONS`                                                          | `false`: turns off desktop turn-complete alerts (on by default)                                                                                                                      |
| `DISCORD_WEBHOOK_URL` / `SLACK_WEBHOOK_URL` / `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | Setting one turns on turn-complete alerts in that chat channel; setup: `.claude/hooks/notifications/docs/`                                                                           |
| `PYTHON_PATH`                                                                           | Python executable tried first when session start detects the Python version                                                                                                          |
| `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS`                                                   | `1` when starting OpenCode: it stops loading `.claude/skills` for that session                                                                                                       |
| `GITHUB_PERSONAL_ACCESS_TOKEN`                                                          | GitHub MCP server auth                                                                                                                                                               |

---

## Permission Configuration

### Allowlist Patterns

```json
{
    "permissions": {
        "allow": ["Tool/**", "Tool(pattern:*)", "Bash(npm:*)", "Bash(git commit:*)", "Read(src/**)", "Write(src/**, !*.secret)"]
    }
}
```

### Common Permission Sets

**Read-only development:**

```json
{
    "permissions": {
        "allow": ["Read/**", "Glob/**", "Grep/**"],
        "deny": ["Write/**", "Edit/**", "Bash(rm:*)"]
    }
}
```

**Full development access:**

```json
{
    "permissions": {
        "allow": ["Read/**", "Write/**", "Edit/**", "Glob/**", "Grep/**", "Bash(npm:*)", "Bash(git:*)", "Bash(node:*)"]
    }
}
```

---

## Hook Configuration

### Event Types

| Event                 | When Triggered                     |
| --------------------- | ---------------------------------- |
| `SessionStart`        | Session begins                     |
| `UserPromptSubmit`    | User sends message                 |
| `PreToolUse`          | Before tool execution              |
| `PostToolUse`         | After tool execution               |
| `PostToolUseFailure`  | Started tool fails (Claude native) |
| `Stop`                | Response complete                  |
| `PreCompact`          | Before context compaction          |
| `SessionEnd`          | Session ends                       |
| `SubagentStart`       | Subagent spawning                  |
| `UserPromptExpansion` | Typed `/command` expands           |
| `Notification`        | Idle/waiting events                |

> These are the Claude Code events available for hooks. This framework registers no `PreCompact` hook. `SubagentStart` and `UserPromptExpansion` carry only protocol-delivery handlers: `SubagentStart` the five `protocol-inject-<group>.cjs` group handlers (full protocol texts for skill-preloading agents) and the four `protocol-inject-universal-<n>.cjs` bins (the universal bundle, to every agent type; the bins are also registered on `UserPromptSubmit` and on `SessionStart` with matcher `compact|clear`); `UserPromptExpansion` the five group handlers and `skill-overlay-remind.cjs` for typed `/command` skills. Standing sub-agent context stays static in `agents/*.md`. Read `../hooks/README.md` when you need the per-event registration counts.

### Hook Structure

```json
{
    "hooks": {
        "EventName": [
            {
                "matcher": "ToolPattern",
                "hooks": [
                    {
                        "type": "command",
                        "command": "node .claude/hooks/hook.cjs",
                        "timeout": 60
                    }
                ]
            }
        ]
    }
}
```

### Matcher Patterns

| Pattern               | Matches                |
| --------------------- | ---------------------- |
| `"Write"`             | Exact tool name        |
| `"Write\|Edit"`       | Multiple tools (regex) |
| `"*"` or `""`         | All tools              |
| `"mcp__server__tool"` | MCP tool               |

---

## Common Customizations

### Adding a New MCP Server

```json
{
    "mcpServers": {
        "my-server": {
            "command": "npx",
            "args": ["-y", "@my/mcp-server"],
            "env": { "API_KEY": "${MY_API_KEY}" }
        }
    }
}
```

### Adding a Custom Hook

```json
{
    "hooks": {
        "PostToolUse": [
            {
                "matcher": "Write|Edit",
                "hooks": [
                    {
                        "type": "command",
                        "command": "node .claude/hooks/my-custom-hook.cjs",
                        "timeout": 30
                    }
                ]
            }
        ]
    }
}
```

---

## Troubleshooting

### Configuration Not Applied

1. Check file syntax: `node -e "console.log(JSON.parse(require('fs').readFileSync('.claude/settings.json')))"`
2. Verify file location
3. Check for local override in settings.local.json
4. Restart Claude Code session

### Hook Not Running

1. Check matcher pattern matches tool
2. Verify hook script exists
3. Check timeout setting
4. Run hook manually: `echo '{}' | node .claude/hooks/hook.cjs`

### Permission Denied

1. Check allow patterns match file path
2. Check for deny patterns overriding
3. Verify glob syntax

---

## Related Documentation

- [settings-reference.md](./settings-reference.md) - Complete settings.json reference
- [output-styles.md](./output-styles.md) - Custom output styles
- [../hooks/README.md](../hooks/README.md) - Hook system overview
- [../hooks/extending-hooks.md](../hooks/extending-hooks.md) - Creating custom hooks

---

_Source: `.claude/` configuration files_

## Closing reminders

**MUST** keep project facts in the configured project-config file and machine permission in personal/ignored local policy. **MUST** validate declared settings and retain native host permissions. **MUST** resolve required review evidence and rule errors before acceptance.

## Frontend reuse reminder

Read this section when changing frontend reuse discovery reminders. The default-on `ui-reuse-remind.cjs` hook gives a concise reminder on user prompts and before frontend file operations or plan loads. Configure it in `docs/project-config.json`:

```json
{
    "hooks": {
        "uiReuseReminder": {
            "enabled": true,
            "reinjectAfterTokens": 100000,
            "useDefaultMatchers": true,
            "pathGlobs": ["custom-ui/**/*.view"],
            "excludePathGlobs": ["custom-ui/generated/**"]
        }
    }
}
```

All fields are optional; absent project config uses the defaults. The interval is an integer from 20,000 through 2,000,000 tokens. Malformed declared configuration leaves this advisory hook silent; repair it through project-config. `pathGlobs` adds project-specific paths; `useDefaultMatchers: false` replaces built-in includes with those globs. Exclusions always win; dependency/build output, disposable output and generated host mirrors are excluded. Plan activation remains a trigger independently of frontend matchers. `enabled: false` disables both prompt and pre-tool reminders.

Built-in includes reuse the common UI/UX matcher: HTML/templates, CSS/style preprocessors, JSX/TSX, Vue, Svelte, Astro, Angular component files and native markup/layout files. Added defaults cover ERB/Haml/Slim, HEEx/LEEx/EEx, Blade, FXML/QML/Qt UI, UXML/USS and WXML/WXSS. Shared-language files (JS/TS, Dart, Swift, Kotlin, Java, C#, PHP, Ruby, Python) match only under component/page/view/screen/widget/layout/composable/frontend/client/web/UI directories. These paths are discovery hints; inspect actual ownership before applying UI rules. Unusual stacks use project globs. Either slash is accepted on Windows, macOS and Linux.

The reminder directs discovery through the optional `designSystem`, `styling`, `componentSystem`, selected reference docs and actual component owners; it does not assume default docs exist or invent tokens or controls. The plan skill carries the full `ui-system-context` guide plus its short closing reminder. Hook delivery is advisory and never proves that the agent read these sources.
