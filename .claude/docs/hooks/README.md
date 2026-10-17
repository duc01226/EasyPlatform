# Hooks Reference

> <!-- COUNT:hooks -->36<!-- /COUNT --> top-level `.cjs` hooks and <!-- COUNT:lib-modules -->66<!-- /COUNT --> lib modules for context-aware AI behavior (some hooks register on multiple events; the unified notification router lives under `.claude/hooks/notifications/notify.cjs`)

## Contents

- [Overview](#overview)
- [Hook Events](#hook-events)
- [Hook Catalog](#hook-catalog)
- [Team work observer](#team-work-observer)
- [Lessons System](#lessons-system)
- [Matcher vocabulary and limits](#matcher-vocabulary-and-limits)
- [Session Lifecycle](#session-lifecycle-1)
- [Lib Modules](#lib-modules)
- [Per-File Convention Injection](#per-file-convention-injection)
- [Session Prompt Ledger](#session-prompt-ledger)
- [Workflow Route Injection](#workflow-route-injection)
- [Hook Input/Output](#hook-inputoutput)
- [Configuration](#configuration-1)
- [Testing](#testing)
- [Related Documentation](#related-documentation)

## Overview

Hooks are Node.js scripts (`.cjs`, plus one `.js`) that execute at specific Claude Code lifecycle events, enabling session initialization, safety gates, graph maintenance, code formatting, and optional runtime guidance. The universal framework rules (the `universal` group of `protocol-groups.json`), the workflow route (profile-specific gate cues and catalog delivery, in the mode each person chose) and the project skill-overlay reminder arrive only from runtime hooks; the root `CLAUDE.md` holds project information only. Mode `on` requires working hooks; intentional `quiet` and `off` modes are supported. Read [runtime modes](../configuration/README.md#framework-runtime-mode) to configure them.

```
SessionStart hooks → UserPromptSubmit hooks → PreToolUse hooks → [Tool runs] → PostToolUse hooks
       ↓                    ↓                       ↓                                ↓
  Verify install         Intake + routing     Validate/block              Format edits
  Install deps                                Guard boundaries            Update graph
  Init state             route reminder       Block unsafe ops            Convention reminder
  Load docs / graph
```

> **Context injection (current architecture).** The universal rules every task follows arrive from the
> universal hook (`protocol-inject-universal-<n>.cjs`, see [Protocol Delivery](#protocol-delivery)): on a session's first prompt,
> again after about 150K tokens of growth or a compaction (a compaction reported at session start delivers it at once), and to every sub-agent once per spawn. The workflow route is delivered only by the default-on
> `workflow-route-inject.cjs` hook (profile-specific gate guidance, per the person's route mode). In compatible delivery, `workflow-catalog-inject.cjs` supplies the compact catalog; concise delivery retrieves selection depth explicitly (see [Context delivery profiles](#context-delivery-profiles)). `CLAUDE.md` and `AGENTS.md` hold project information
> only. The PreToolUse hooks are blocking/advisory **gates** and a few utility hooks; every hook below maps to a real
> registration in `.claude/settings.json`. Plan/skill/todo enforcement and compaction-state
> recovery are **model-driven rules** delivered by those protocols. `file-convention-inject.cjs` is an accelerator: the
> complete mode replaces the root's static table with mandatory pre-action
> `node .claude/hooks/lib/file-conventions.cjs --lookup <path> --complete`; read every page and required reference.
> Legacy mode retains the "Automatic Skill Activation" table and bounded lookup. Automatic reminders never prove pre-action coverage.

## Hook Events

Counts below are registration counts in `.claude/settings.json` (a hook registered on
two events is counted once per event).

| Event              | Trigger                      | Hooks | Use Cases                                                                                                                                                 |
| ------------------ | ---------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SessionStart`     | Session begins/resumes       | 18    | Integrity preflight + guarded startup-install request validation, init state, load docs, init graph, record condensation, re-anchor the prompt ledger, and re-deliver the universal bundle after a compaction (four registered bin handlers, matcher `compact|clear`; concise uses bin 1 only); after a compaction (matcher `compact`) also re-deliver the core principles, the UI reuse reminder, the workflow route and catalog, and the verdict and AI-feature directives when the latest recorded prompt asks for one |
| `SessionEnd`       | Session ends                 | 2     | Main-session desktop alert and cleanup temp/swap files                                                                                                    |
| `UserPromptSubmit` | Before processing user input | 16    | Deliver the universal protocol bundle (four bins in compatible, one in concise), check project readiness and graph state, optionally inject profile-specific routing (compatible gate/catalog outputs or a concise cue with explicit catalog lookup), route commit, verdict and AI-feature prompts, re-deliver the core principles, record prompts in the ledger, and offer eligible task-tracking guidance |
| `PreToolUse`       | Before tool execution        | 6     | Conditional root-cause reminder, direct Claude AskUserQuestion notification, commit-operation gates, and document-sync warnings                                                            |
| `PostToolUseFailure` | Started tool fails         | 1     | Claude-native conditional root-cause reminder; shares the shell preflight dedup record, ignores explicit interruptions |
| `PostToolUse`      | After tool completes         | 20    | Format code, update graph, per-file convention reminder, re-deliver the prompt ledger and an advisory token checkpoint at task steps, deliver skill protocols and the skill-overlay reminder on a `Skill` load or a `SKILL.md` read, and re-deliver the quality-skill digest after any tool result once per scope and ~150K tokens |
| `SubagentStart`    | Sub-agent starts             | 14    | Deliver the protocols of the agent's preloaded skills, minus bodies the agent file already carries, the universal bundle (four bins in compatible, one in concise), the skill activation policy, the core principles and the UI reuse reminder to every agent type, plus the verdict and AI-feature directives when the session's latest recorded prompt asks for one (see [Protocol Delivery](#protocol-delivery)) |
| `UserPromptExpansion` | Typed `/command` expands  | 6     | Deliver the protocols of the skill a typed command loads and remind the agent to read the skill's project overlay files (see [Protocol Delivery](#protocol-delivery))                                                   |
| `Notification`     | Idle/waiting events          | 1     | System notification (`.claude/hooks/notifications/notify.cjs`)                                                                                            |
| `Stop`             | Response complete            | 1     | Turn-complete alert; Codex question alert when the final assistant message ends in `?` (`.claude/hooks/notifications/notify.cjs`)                         |

> `SubagentStart` carries the five `protocol-inject-<group>.cjs` delivery steps, the four `protocol-inject-universal-<n>.cjs` bins (the bins are also registered on `UserPromptSubmit` and on `SessionStart` with matcher `compact|clear`) and the prompt-time context hooks that do not belong to the main session alone: `skill-activation-inject.cjs`, `core-principles-inject.cjs`, `ui-reuse-remind.cjs`, `judgement-integrity-route.cjs` and `ai-feature-route.cjs`. The workflow route and catalog, commit and task-tracking routes, init gate and prompt ledger stay main-session only (routing, commits, tracking saves, setup questions and the user's prompt record belong there); `UserPromptExpansion` carries the five group steps and
> `skill-overlay-remind.cjs`. Standing sub-agent guidance stays static in the agent `.md` files.

---

## Hook Catalog

### Session Lifecycle

| Hook                                     | Event                                      | Matcher                                                  | Purpose                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verify-install.cjs`                     | SessionStart                               | `startup\|resume\|clear\|compact`                        | Install integrity preflight (runs first: missing hook files, and a hook set that settings register only in part), then guarded startup dependency installation on an explicit `startup` event — the runner owns the per-project lock, the post-lock recheck and the process-tree cleanup proof                                                                                                     |
| `session-init.cjs`                       | SessionStart                               | `startup\|resume\|clear\|compact`                        | Initialize session: detect project, write env vars, validate config, cleanup temp files                                                                                                                                                                                                                                    |
| `session-init-docs.cjs`                  | SessionStart                               | `startup`                                                | Config skeleton + reference doc placeholder creation                                                                                                                                                                                                                                                                       |
| `graph-session-init.cjs`                 | SessionStart                               | `startup\|resume`                                        | Check Python/tree-sitter/graph.db, then `sync` the graph with git HEAD (skips if config not populated or the code graph is not active — see [Code graph mode](#code-graph-mode)). `resume` included so a session resumed after someone else's commits landed still reconciles                                                                                                                        |
| `session-end.cjs`                        | SessionEnd                                 | _(all reasons)_                                         | Revoke this session's Git leases on actual endings; preserve recovery on resume/other and leases on legacy compact; clean up temp/swap files and stale snapshots                                                                                                                                                                        |
| `.claude/hooks/notifications/notify.cjs` | SessionEnd, Stop, PreToolUse, Notification | –, `AskUserQuestion`, `AskUserPrompt\|permission_prompt` | Desktop dialog/toast + optional Telegram/Discord/Slack, dispatched concurrently within the 3 s SessionEnd budget; main-session end (skipped on reason `clear`), direct Claude `AskUserQuestion`, and Codex `Stop` questions when the final message ends in `?`; existing turn-complete and input/permission alerts remain. |

> **Notification router skips and limits.** A `SessionEnd` alert is skipped for a subagent (`agent_id`), a `clear` reset, or a conversation of unknown kind — the OpenCode bridge forwards every session deletion so cleanup runs, marking it `conversation_kind: "unknown"` when session metadata is missing (`notifications/notify.cjs:122-170`, `.claude/scripts/opencode/templates/easy-claude-hooks.js.tmpl:311-313`). A `Stop` (turn-complete) alert is held back until the main session has finished its job. It is skipped for a delegated conversation (`agent_id`; the OpenCode bridge marks a child session's `session.idle` this way, `easy-claude-hooks.js.tmpl:266-270,322`), while Claude's `background_tasks` still lists an unfinished `subagent`, `workflow` or `MCP task`, and while `session_crons` holds a one-shot wakeup. Each finished delegated task wakes the main session for another turn, so without this every sub-agent completion raised its own alert. Background `shell` and `monitor` tasks and recurring crons do not hold the alert, because a dev server or log tail may never end and would silence a finished job for good. Codex runs `Stop`/`SessionEnd` hooks for the main thread only, so the sync no longer installs the legacy `notify` command, which Codex ran after every turn of every thread, sub-agent threads included. Each remote request aborts after 2000 ms (for `SessionEnd`, less — the budget counts from process start so the hook stays inside its 3 s limit); a timed-out send is logged and skipped without pausing the channel, while a failed channel (HTTP error, connection failure) pauses for 5 minutes (`notifications/lib/sender.cjs`). Read `Notifications/README.AssistantSessionNotifications.md` under the business spec root (`specRoots.business.path` in project config) when changing alert behavior or copy.

`verify-install.cjs` is the ONLY registered SessionStart owner of startup
dependency installation. It runs the integrity scan first, then — on an explicit
`startup` source only — hands the decision to `lib/startup-install.cjs`, which
selects the manager from the project's own lockfile and manifest, takes a private
per-project lock, rechecks completeness after acquiring it, and proves its process
tree stopped. The hook stays non-blocking either way: it prints at most one
diagnostic line and never a stack trace.

The integrity scan also checks that the settings register a hook set in full. The
workflow route is two entries, `workflow-route-inject.cjs` and
`workflow-catalog-inject.cjs`; a `.claude/settings.json` that registers one without
the other gives every prompt the gate without the catalog, or the reverse, with no
error. The scan names the registered entry, the missing one and what prompts lose in
one `Hook registration incomplete` block. Every registered file is present in that
state, so the startup work still runs; a copy that is also missing files reports both
in the one `Install incomplete` block. Registering neither entry is left alone.

**Upgrade expectation.** A re-export
(`node .claude/scripts/export-claude.mjs "<project-root>" --force`) replaces
`.claude/settings.json` with the framework's, so new hook entries arrive with it. A
project that keeps its own settings file across an upgrade does not gain them: copy
each new entry from the framework's `.claude/settings.json` under the same event, then
run `/sync-codex` so the Codex and OpenCode mirrors register it too.

The manager executable and its arguments are NOT configurable. The hook only ever
runs a fixed, version-matched argv from its own support matrix, so no project
config can turn it into an arbitrary command runner. What a project CAN set is
`hooks.startupInstall` in `docs/project-config.json` — `enabled`,
`packageManager` and `allowLifecycleScripts`; see the configuration reference.
Disabling installation never disables the integrity scan.

On Windows, the same owner also probes the machine-native Git capability. A
healthy result requires a canonical Git-for-Windows root containing `git.exe`,
`git-bash.exe`, and a working `bash.exe` under that root; WSL/System32 and
Windows App Execution Alias `bash.exe` entries are not accepted as Git Bash.
When the capability is missing, broken, or incomplete on an explicit `startup`,
the hook validates the trusted Windows App Installer/WinGet binary and may start
one detached, bounded repair worker with the fixed `Git.Git` package command:
`install --id Git.Git --exact --source winget --silent --disable-interactivity
--accept-source-agreements --accept-package-agreements`. Repair is skipped for
non-startup events, disabled/invalid policy, or an unavailable/unverifiable
WinGet/App Installer boundary; the next startup always probes again. UAC or
machine policy failures are advisory, fail closed, and never become an
unbounded installer path. PortableGit and generic installer fallbacks are
intentionally deferred.

The capability is published only to child/session environments: the resolved
Git and Git Bash paths are prefixed to the child `PATH` and exposed as
`CK_GIT_EXE`, `CK_GIT_BASH_EXE`, and `CK_GIT_BASH_PATH`. A child hook or manager
can therefore run native Git/Git Bash, but a child process cannot mutate the
already-running parent shell. The per-user repair resource uses the same
canonical private OS-temp lock discipline as startup installation, so concurrent
sessions re-probe and coordinate rather than launching duplicate repairs.

### Startup safety and recovery contract

The dependency runner holds one private lock per `SHA-256(realpath(projectRoot))`
under a canonicalized OS-temp parent, outside the adopter project. The child
record includes the canonical root, host identity, PID/process-start identity,
descendant/process-group identity, and an unguessable owner token. Parent and
child privacy are validated before atomic exclusive creation: POSIX requires the
current UID, `0700` directory and `0600` record; Windows requires an ACL limited
to the current user and trusted system principals. Symlink/reparse paths,
unsafe redirected temp parents, nonprivate ACLs, and unverifiable states fail
closed.

The manager deadline is 120 seconds. Process-tree cleanup has a separate maximum
of 30 seconds after timeout or normal exit when descendants remain. If every
process is not proven stopped, the lock is retained, no retry or age-only reclaim
occurs, one sanitized warning is emitted, and SessionStart returns. A contender
polls every 100 ms for at most five seconds; only verified live-owner contention
returns `install already in progress`. Stale recovery requires matching root,
host, PID/process-start identity, and token, positive proof that the owner and
all descendants are dead, an unchanged owner record, and atomic reacquisition.
Operators must never delete a lock because it is old; if any proof is unavailable,
leave it retained for a later startup.

### Exact package-manager matrix required in the hook reference

The following table is the executable support contract. The left side of each
argv pair is the default script-suppressed form; the right side is effective
only when `allowLifecycleScripts: true` and the host grants
`CK_STARTUP_INSTALL_TRUST=1`. Lock-preserving flags remain on the opt-in path.

| Manager / supported version | Lockfile evidence                                                                  | Locked argv (default / opt-in)                                                                                   | Lockless argv (default / opt-in)                                             | Additional documented skip boundary                                                                                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm `10.x` / `11.x`         | Exactly one of `package-lock.json` or `npm-shrinkwrap.json`; manager signals agree | `ci --ignore-scripts` / `ci`                                                                                     | `install --ignore-scripts` / `install`                                       | Skip unknown versions, both npm lockfiles, another manager lockfile, or conflicts. `npm ci` replaces the existing root `node_modules` tree when it rebuilds dependencies.               |
| npm `12.x`                  | `package-lock.json`                                                                | `ci --ignore-scripts` / `ci`                                                                                     | `install --ignore-scripts` / `install`                                       | Shrinkwrap-only is an unsupported lockfile, not lockless; skip both npm lockfiles and conflicts. `npm ci` replaces the existing root `node_modules` tree when it rebuilds dependencies. |
| pnpm `9.15.0`               | `pnpm-lock.yaml`; manager signals agree                                            | `install --frozen-lockfile --ignore-scripts` / `install --frozen-lockfile`                                       | `install --ignore-scripts` / `install`                                       | Skip other pnpm 9 versions, unsupported versions/lockfiles, or conflicts. Do not pass `--pm-on-fail`.                                                                                   |
| pnpm `12.x`                 | `pnpm-lock.yaml`; manager signals agree                                            | `install --frozen-lockfile --ignore-scripts --pm-on-fail=error` / `install --frozen-lockfile --pm-on-fail=error` | `install --ignore-scripts --pm-on-fail=error` / `install --pm-on-fail=error` | Skip unsupported versions/lockfiles or conflicts; `--pm-on-fail=error` prevents pinned-CLI downloads.                                                                                   |
| Yarn Classic `1.x`          | `yarn.lock`; exact trusted external version                                        | `install --frozen-lockfile --ignore-scripts --non-interactive` / `install --frozen-lockfile --non-interactive`   | `install --ignore-scripts --non-interactive` / `install --non-interactive`   | Skip unknown versions and unsafe `.yarnrc` `yarn-path` forwarding; never apply Berry flags.                                                                                             |
| Yarn Berry `2.4.x`          | `yarn.lock`; exact trusted external version; no unsafe `yarnPath`                  | `install --immutable --skip-builds` / `install --immutable`                                                      | `install --skip-builds` / `install`                                          | Skip Berry 2.0–2.3, unsupported versions/lockfiles, conflicts, plugins, or unsafe forwarding.                                                                                           |
| Yarn Berry `3.x`–`4.x`      | `yarn.lock`; exact trusted external version; no unsafe `yarnPath`                  | `install --immutable --mode=skip-build` / `install --immutable`                                                  | `install --mode=skip-build` / `install`                                      | Skip unsupported/new majors, versions/lockfiles, conflicts, plugins, or unsafe forwarding.                                                                                              |
| Bun `1.2.x`                 | `bun.lock`; `bun.lockb` unsupported                                                | `install --frozen-lockfile --ignore-scripts` / `install --frozen-lockfile`                                       | `install --ignore-scripts` / `install`                                       | Skip other Bun versions, `.lockb`, unsupported lockfiles, or conflicts; Bun `trustedDependencies` still applies after opt-in.                                                           |

`project.packageManagers` is absent or empty for no signal, or exactly one
string matching `^(npm|pnpm|yarn|bun)(?:@\d+\.\d+\.\d+)?$`; malformed or
multiple entries fail closed, and an exact version pin must match the trusted
external executable. A missing lockfile alone is not a conflict: `auto` uses
npm only when no manager signal exists. Root-manifest installs may change the
selected manager's native workspace graph. Yarn PnP is static-only: the hook
never executes `.pnp.js`/`.pnp.cjs`; malformed, stale, escaping, or inconclusive
presence evidence skips. Corepack shims, project-local shims, unsafe Windows
launches, manager extensions (`.pnpmfile`, Yarn plugins, nonempty inherited
`YARN_PLUGINS`), and unsafe forwarded `yarnPath` are independent skip boundaries.

The project config is not an executable-command surface. `enabled: false`
disables installation but leaves integrity verification active; an absent config
uses portable defaults, an absent root `package.json` is a clean install no-op,
and invalid config skips installation with one fixed diagnostic.

### Frontend reuse reminder

`ui-reuse-remind.cjs` delivers the canonical `ui-system-context:reminder` digest on every user prompt, at every sub-agent start, right after a compaction and before matching frontend reads/changes or plan loads. It asks the agent to find/read the project design system, tokens, shared UI controls and usage examples, follow house conventions and record reuse gaps. It does not preload target files or prove discovery.

The default-on hook shares one reminder record across prompt and pre-tool events in each conversation scope; the default window is 100,000 tokens of transcript growth. Transcript compaction marks and a SessionStart `compact|clear` private-generation reset, changed reminder text or changed settings re-arm it; a `compact` report also delivers at once, and a `clear` waits for the next prompt. No transcript means one delivery until compaction/content change; wall-clock time alone does not re-arm. Failed output earns no credit; absent/blank session identity and missing-source notices emit without a record. Its private digest record and reset generation cannot suppress or invalidate full protocol or universal delivery. Shell paths are bounded literal hints with no expansion or execution. Read [../configuration/README.md](../configuration/README.md#frontend-reuse-reminder) when configuring the matchers or interval.

### Quality-skill reminder

`quality-skill-remind.cjs` (PostToolUse, every tool) re-delivers the canonical `SYNC:quality-skill-routing:reminder` digest after a tool result, so a long run keeps the review, test and failure routes in attention: `why-review` for a rationale, decision, claim or statement; `changes-review` for a focused diff or simple pull request; `workflow-review-changes` for a complex, risky or cross-module pull request or change set; the project's test skills for tests; `investigate --mode=debug` for a failure or error. The universal bundle carries the full `quality-skill-routing` protocol. One record per scope (main conversation or one sub-agent): the first tool result delivers, then only ~150K tokens of growth, a compaction or a changed digest re-delivers, so a running sub-agent regains it after its own compaction. Read [../configuration/README.md](../configuration/README.md#advisory-prompt-routers) when turning it off.

### Failure investigation reminder

`failure-investigation-remind.cjs` emits a conditional, compact hint to load the registered `investigate --mode=debug` skill before fixing unexpected errors or failed tests. Shell `PreToolUse` (`Bash|exec_command`) covers hosts without reliable hook failure status; Claude-native `PostToolUseFailure` covers other started tools and ignores explicit interruptions. It does not inspect commands or output, start skills or waive read-only roles and user authority.

One private record shares successful delivery credit across both triggers per session/agent scope. Default re-delivery is after 150,000 estimated transcript tokens; time alone never re-arms it. Compaction, clear, shorter transcripts, changed text/settings and new scopes re-arm it. Transcriptless hosts receive it once per session/reset/content/configuration window; missing session identity remains silent. Failed output earns no credit. This record cannot credit full diagnostic protocols. Codex/OpenCode retain the pre-shell and silent reset paths and explicitly report the unsupported native failure event. Read [../configuration/README.md](../configuration/README.md#failure-investigation-reminder) when configuring this reminder. Native invocation depends on enabled/trusted host handlers and remains unverified outside the exercised fixtures.

The OpenCode bridge queues pre-tool context and appends it to the output of the next tool that completes in the session, where it stays in the conversation; when a tool fails, is blocked or returns no text output, the next model system transform delivers it instead. It consumes the context once, keeps sessions separate, retains it when the model sink is absent, and clears it on compaction/deletion. Pending transport is bounded to 256 sessions, 32 unique contexts and 64 KiB per session; overflow emits a safe warning. On that fallback path the context reaches one model request while the hook credits the delivery for the whole window, so a later failure in that window carries no reminder there. This in-memory transport can lose pending context on a process restart; hook stdout credit is not model acknowledgment or proof of adherence. Read `.claude/scripts/opencode/templates/easy-claude-hooks.js.tmpl` when changing this legacy bridge transport and regenerate through `/sync-opencode`.

### Prompt Intake (UserPromptSubmit)

Prompt hooks may warn, synchronize state, record the prompt ledger, or emit optional advisory context. Only explicit safety gates block.

| Hook                            | Event            | Matcher | Purpose                                                                                                                                                                                                                                          |
| ------------------------------- | ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ui-reuse-remind.cjs` | UserPromptSubmit, PreToolUse, SubagentStart, SessionStart:`compact\|clear` | `*` / frontend file operations and plan loads | Concise design-system/shared-control reuse reminder; default-on, project-configurable, deduplicated across triggers per scope for 100K tokens. |
| `init-prompt-gate.cjs`          | UserPromptSubmit | `*`     | Warn/route until project context, root instructions and docs are current; optional note when the code graph is switched on but not built                                                                                                                                                                 |
| `workflow-route-inject.cjs`     | UserPromptSubmit, SessionStart:`compact` | `*`     | The only carrier of the workflow route: advisory state line + gate injection per route mode (`ask` default, `auto`; team default in project config, personal override in `~/.claude/.ck.json`, ignored `.claude/.ck.local.json` or env `CK_WORKFLOW_ROUTE_MODE`); mode `off` delivers a short routing-OFF notice instead. The catalog is the second output, `workflow-catalog-inject.cjs` |
| `workflow-catalog-inject.cjs`   | UserPromptSubmit, SessionStart:`compact` | `*`     | Second output of the workflow route: the workflow catalog, in the first form that fits the cap; silent when routing is off or skill auto-trigger is disabled                                                                                     |
| `commit-skill-route.cjs`        | UserPromptSubmit | `*`     | Advisory: when a prompt asks to commit, remind the agent to run the `commit` skill instead of a raw `git commit` (`review-commit-gate.cjs` is the back stop)                                                                                     |
| `judgement-integrity-route.cjs` | UserPromptSubmit, SubagentStart, SessionStart:`compact` | `*`     | Advisory: when a prompt asks for a verdict (theory check, evaluation, gap/issue hunt), inject the `SYNC:judgement-integrity` answer why-review naming the lean the prompt carries, so the answer neither echoes the premise nor invents findings; at agent start and after a compaction it classifies the latest recorded prompt |
| `core-principles-inject.cjs`    | UserPromptSubmit, SubagentStart, SessionStart:`compact` | `*`     | Advisory: re-deliver the `SYNC:core-engineering-principles` gate (Easy to change · Easy to scale · Easy to maintain), deduplicated per session scope to about once per 150k tokens; also fires on task/plan step boundaries (PostToolUse), at every sub-agent start and right after a compaction |
| `ai-feature-route.cjs`          | UserPromptSubmit, SubagentStart, SessionStart:`compact` | `*`     | Advisory: when a prompt asks to build, plan, change or review an AI feature (an AI technique AND an action on it) and is not about the framework's own machinery, inject ONE short directive (one read pointer to the protocol file, the review route) once per session window; silent otherwise; at agent start and after a compaction it classifies the latest recorded prompt |
| `task-tracking-route.cjs` | UserPromptSubmit | `*` | Eligible task-tracking purpose and concern notice; preserves actual selection, pending/Skip controls and permissions; no procedure, save, proof or acceptance |

### Gates (PreToolUse)

| Hook                     | Matcher                             | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui-reuse-remind.cjs` | `Read\|Edit\|Write\|MultiEdit\|NotebookEdit\|apply_patch\|Bash\|exec_command\|Skill` | Advisory before frontend operations/plan activation; current design system and shared controls first. |
| `doc-sync-gate.cjs`      | `Bash` and `Write\|Edit\|MultiEdit` | Doc⇄Code sync gate — WARN-only (every path exits 0; warnings go to stderr): warns when a `git commit` stages behavioral code in an enforced area without touching its Feature Spec, and per-edit when enforced-area code drifts past `last_synced`                                                                                                                                                                                                                    |
| `review-commit-gate.cjs` | `Bash`                              | Review-before-commit gate — require a matching full-changeset review or low-risk/user `skip` receipt for every supported commit statement, bound to the exact repository storage, base tree, and candidate tree. Supports default staged content, `-a`/`--all`, and explicit literal `-- <files>`; unsupported Git contexts or candidate-computation errors fail closed with recovery guidance. A worktree review survives staging only when those exact trees match. |

> **Plan/skill/todo enforcement is model-driven.** Edits, skills and task completion are governed by
> the universal `task-planning-rules` protocol (delivered by the universal hook), not by a
> blocking gate. The project-reference doc rule is the universal `project-reference-docs-guide` protocol.

### Lessons Injection

The lessons file (`lessons.md` in the project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) reading contract is the universal `project-reference-docs-guide` protocol
(delivered by the universal hook); the model re-reads `lessons.md` on demand
(including after compaction) per that contract — there is no runtime lessons-inject
hook.

Lessons are managed via the `/learn` skill. See `.claude/skills/learn/SKILL.md`.

### Workflow Automation

| Hook                            | Event                  | Purpose                                                                                                                                                        |
| ------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init-prompt-gate.cjs`          | UserPromptSubmit       | Warn/route until project context, root instructions and docs are current; optional note when the code graph is switched on but not built                                                                               |
| `workflow-route-inject.cjs`     | UserPromptSubmit, SessionStart:`compact` | Inject the `Route mode:` state line and the gate (filtered to the route mode) when the effective `portability.workflowRouteMode` is `ask` or `auto`, otherwise (`off`) a short routing-OFF notice; advisory and fail-open |
| `workflow-catalog-inject.cjs`   | UserPromptSubmit, SessionStart:`compact` | Second output of the workflow route: the compact workflow/skill catalog, in the first form that fits the cap; silent when routing is off or skill auto-trigger is disabled; advisory and fail-open |
| `commit-skill-route.cjs`        | UserPromptSubmit       | Per-prompt commit-intent reminder to run the `commit` skill; advisory and fail-open                                                                            |
| `skill-activation-inject.cjs`   | UserPromptSubmit, SubagentStart, SessionStart:`startup\|resume\|compact\|clear` | Runtime `portability.skillAutoTrigger` policy (default true): false asks once to run a suitable matched framework skill or skip and execute directly (no match proceeds directly), except commit/pull-request/framework-config keep normal triggers; named requests, operation-specific required calls and authorized dependencies remain eligible; commit and pull-request use the commit skill's automatic decision policy: never ask about tests or review, skip tests only when already passed this session or really small; commits default to lightweight commit-review through `commit.reviewMode`, while configured risk-based mode and PR scope use Low skip / Medium why-review / High changes-review for at most two rounds; never transfer old Skip or Git authority. Full policy on every restricted prompt, delegated start and recovery; cached presence never replaces it. Agent scopes are isolated and failed/unrecorded delivery retries in full; restoring auto replaces prior restriction. Advisory model guidance, no permission mutation. OpenCode additionally refreshes at system-context transformation, including delegated sessions. |
| `judgement-integrity-route.cjs` | UserPromptSubmit, SubagentStart, SessionStart:`compact` | Per-prompt anti-confirmation-bias answer why-review on verdict prompts, and on agent starts and compactions while the latest recorded prompt is one; advisory and fail-open |
| `core-principles-inject.cjs`    | UserPromptSubmit, PostToolUse:`TodoWrite\|TaskCreate\|TaskUpdate\|update_plan`, SubagentStart, SessionStart:`compact` | Core engineering principles reminder (change · scale · maintain); ledger-deduplicated, re-armed by ~150k tokens of growth or compaction; delivered at once on a compaction report and once per sub-agent spawn; advisory and fail-open |
| `ai-feature-route.cjs`          | UserPromptSubmit, SubagentStart, SessionStart:`compact` | Once-per-window AI-engineering gate directive and review routing on prompts that ask to act on an AI feature; silent on bare questions and framework-meta prompts; advisory and fail-open |
| `task-tracking-route.cjs` | UserPromptSubmit | Eligible task-tracking purpose and concern notice, deduplicated per actual session/agent context; silent when off, unavailable, quoted or unrelated; advisory and fail-open |
| `session-init-docs.cjs`         | SessionStart:`startup` | Config skeleton + reference doc placeholder creation                                                                                                           |

> Plan/skill/todo enforcement and cross-compaction todo persistence are **model-driven
> guidance** (the universal `task-planning-rules` protocol + `TaskList` re-read on resume), not
> gate hooks.

### Commit Gates

| Hook                     | Matcher | Purpose                                                                                                                     |
| ------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| `review-commit-gate.cjs` | `Bash`  | Require a review fix-loop receipt over the exact changeset before an agent commit; a low-risk/user `skip` receipt clears it |

### Context Management & Utility

| Hook                            | Event                                                                                                                 | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `post-edit-prettier.cjs`        | PostToolUse:`Edit\|Write\|MultiEdit`                                                                                  | Auto-run the PROJECT-configured formatter on edited files (resolved from project-config `formatting`; framework default is Prettier); terminate the complete formatter process tree on timeout                                                                                                                                                                                                                                                                                                                                                                                           |
| `graph-auto-update.cjs`         | PostToolUse:`Edit\|Write\|MultiEdit`                                                                                  | Incremental graph update after file edits (debounced); runs only while the code graph is active                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `graph-prompt-sync.cjs`         | UserPromptSubmit                                                                                                      | Re-sync the graph when git HEAD moved since the last prompt (pull/checkout/merge). Gated on a cheap `git rev-parse HEAD` compare, so Python spawns only when HEAD actually changed; runs only while the code graph is active; never blocks the prompt                                                                                                                                                                                                                                                                                                                                                                              |
| `workflow-route-inject.cjs`     | UserPromptSubmit; SessionStart:`compact`                                                                              | Default-on workflow route delivery (state line, gate and optional project protocol; the catalog is the separate `workflow-catalog-inject.cjs` output) in the person's route mode (`ask` default, `auto`, `off`; see Route mode below). Tracked team config can opt out; `.claude/.ck.local.json` controls only the developer's runtime refresh. Appends an optional project-supplied `portability.workflowRouteProtocol` in its own marker block. Deduplicates by session/scope/content hash, re-arms on compaction or ~4.5 MB of transcript growth, delivers again at once (as the SessionStart context envelope) on the host's compaction report, and always fails open. While routing is off it delivers a short routing-OFF notice under the same dedup, overriding every instruction that would self-start a workflow. A thin entry that runs `runHook('route')` of `lib/workflow-route-delivery.cjs` |
| `workflow-catalog-inject.cjs`   | UserPromptSubmit; SessionStart:`compact`                                                                              | Second output of the workflow route: the workflow catalog, in the first form that fits the cap; silent when routing is off, skill auto-trigger is disabled, or both concise sources are valid (selection then retrieves the catalog explicitly). A thin entry that runs `runHook('catalog')` of `lib/workflow-route-delivery.cjs`; it keeps its own delivery record, so it is deduplicated and re-armed independently of the gate, and always fails open                                                                                                                                                                                                                          |
| `commit-skill-route.cjs`        | UserPromptSubmit                                                                                                      | Commit-request router: when the prompt asks to commit (not negated, not a hash reference, not already `/commit`/`$commit`), inject a directive to run the `commit` skill. No dedup ledger, always fails open                                                                                                                                                                                                                                                                                                                                                                             |
| `judgement-integrity-route.cjs` | UserPromptSubmit; SubagentStart; SessionStart:`compact`                                                               | Judgement-integrity router: when the prompt asks for a verdict (theory confirmation, evaluation/judgement, root cause, gap/issue hunt; not an explicit `/why-review` call, not code), inject the canonical `SYNC:judgement-integrity:reminder` plus lean-specific guidance (problem-presumed / confirmation-sought / evaluation). Accelerator for the static `critical-thinking-mindset:full` rule. A sub-agent start or a compaction report carries no prompt, so there it classifies the session's latest recorded prompt (`routedPrompt` in `lib/prompt-route-utils.cjs`; no prompt ledger, no directive) and answers with the JSON context envelope; no dedup ledger, always fails open                                                                                                                                                   |
| `ai-feature-route.cjs`          | UserPromptSubmit; SubagentStart; SessionStart:`compact`                                                               | AI-feature router: fires only when the prompt names an AI technique AND asks to act on it (build, plan, integrate, review, audit, fix…) and is not about this framework's own machinery. Concrete product techniques (RAG, embeddings, vector store, prompt injection, OpenAI/GPT, a provider name beside API/SDK — the Claude API/SDK/Agent SDK included, "Claude Code" excluded — function calling, fine-tuning a model, semantic search, model routing) survive one framework cue; generic vocabulary (LLM, AI feature/chatbot, agentic app, system prompt, guardrails, hallucination, tool calling, MCP server, prompt engineering, an eval harness for a model) needs none; two distinct framework cues (`.claude`/CLAUDE.md, skill, sub-agent, hook, workflow, gate/protocol/framework, mirror, waste) silence it outright. A prompt with no AI vocabulary loads no heavy module. Emits ONE directive of at most 700 characters by construction (at most three named signals, dropped from the end until the text fits) — the gate in a sentence, five terse rules, one read pointer (`ai-engineering-gate.md`, or `ai-feature-framing-gate.md` when planning) and the review route (`ai-engineering-review` skill / `ai-engineering-reviewer` sub-agent) — and never sends the reader to the knowledge or checklist docs. De-duplicated by `deliverOnce` of the convention ledger (`lib/convention-ledger.cjs`, group `ai-feature-route`, byte window of about 150K tokens, no age re-arm): a compaction or clear (host-reported, or a Claude or Codex compaction mark in the transcript) re-arms it, transcript growth of the window re-arms it, and a prompt without a session id is never delivered. Detection favours precision over recall: generic AI vocabulary beside framework words may stay silent, and a few look-alike prompts may draw one short directive — the file class, the scan and the review skill are the nets. Not on an explicit `/ai-engineering-review` call or in code spans / host envelopes. A sub-agent start (its own scope, once per spawn) and a compaction report (delivered at once, absorbing the host's boundary line) classify the session's latest recorded prompt. `.ck.json` `aiFeatureRoute.enabled: false` / `CK_AI_FEATURE_ROUTE=0` disables it; always fails open |
| `task-tracking-route.cjs` | UserPromptSubmit | Eligible task-tracking purpose and concern notice, deduplicated per actual session/agent context; silent when off, unavailable, quoted or unrelated; advisory and fail-open |
| `prompt-ledger.cjs`             | UserPromptSubmit; SessionStart:`compact\|resume\|clear`; PostToolUse:`TodoWrite\|TaskCreate\|TaskUpdate\|update_plan` | Session prompt ledger (accelerator, never a gate): records every user prompt under `tmp/prompt-ledger/<session>/` with secrets redacted, pins the first prompt as the original goal, and re-delivers a short digest only when that reminder is no longer present (condensation, long growth, checkpoint). On by default; `promptLedger.enabled: false` / `CK_PROMPT_LEDGER=0` disables; always exit 0, silent on any failure. See [Session Prompt Ledger](#session-prompt-ledger)                                                                                                        |
| `token-budget-checkpoint.cjs`   | PostToolUse:`TodoWrite\|TaskCreate\|TaskUpdate\|update_plan`                                                          | Advisory token checkpoint (never blocks): each time the session's non-cached tokens (input + cache writes + output, main + sub-agents; cache reads never count) cross the next multiple of `hooks.tokenBudget.checkpointTokens` (docs/project-config.json; default on, 500,000), adds one note with the total, the threshold and the completed-step count, suggesting a progress report. Main conversation only; marker `tmp/token-budget/<session>/usage-state.json`; silent on a host whose transcript it cannot read; always exit 0 |
| `core-principles-inject.cjs`    | UserPromptSubmit; PostToolUse:`TodoWrite\|TaskCreate\|TaskUpdate\|update_plan`; SubagentStart; SessionStart:`compact` | Core engineering principles reminder: in concise delivery, verifies or retries the universal core through its success-only ledger (see [Context delivery profiles](#context-delivery-profiles)); in compatible delivery, re-delivers the canonical `SYNC:core-engineering-principles` body (Easy to change · Easy to scale · Easy to maintain) on prompts, task/plan step boundaries, every sub-agent start (its own scope) and right after a compaction (delivered at once; in concise delivery universal bin 1 owns those two events). Convention-ledger dedup per session scope (main or one sub-agent); re-armed by content change, compaction, or `corePrinciplesInject.reinjectAfterTokens` (default 150000) × `BYTES_PER_TOKEN` of transcript growth. Reinforces the `**Core engineering principles:**` line of the universal `critical-thinking-mindset` protocol; advisory, always fails open |
| `quality-skill-remind.cjs`      | PostToolUse:`*`                                                                                                       | Quality-skill reminder after tool results: re-delivers the canonical `SYNC:quality-skill-routing:reminder` digest (reviews → `why-review`, `changes-review` or `workflow-review-changes`; tests → the project's test skills; failures or errors → `investigate --mode=debug`) as `additionalContext`. Convention-ledger dedup per scope (main or one sub-agent) in `<project>/tmp/protocol-delivery`: the first tool result of a scope delivers, then only ~150K tokens of growth, a compaction (including a running sub-agent's own) or a changed digest re-delivers; elapsed time never does. One process per tool result; `qualitySkillReminder.enabled: false` / `CK_QUALITY_SKILL_REMINDER=0` disables it; always fails open |
| `file-convention-inject.cjs`    | PostToolUse:`Read\|Edit\|Write\|MultiEdit\|NotebookEdit`; SessionStart:`compact\|clear`                               | Per-file convention reminder (accelerator, never a gate): after a read/change, emits `additionalContext` with the rules, skill protocols and reference docs of the convention classes (`contextGroups[]`) the file belongs to — only classes not already present in this working context (including the `ui-ux-gate` class for front-end files). Opt-in `conventionInjection.enabled`; with NO project config file the built-in fallback delivers the `ui-ux-gate` and `ai-feature-gate` classes; always exit 0, silent on any failure; registered on PostToolUse with a 10-second host `timeout` (below the 15-second runner budget) so the host stops a runaway pattern after that bound (config regexes also run under a ~100 ms vm time budget of their own). See [Per-File Convention Injection](#per-file-convention-injection) |

> **Advisory router opt-outs.** `core-principles-inject.cjs` is on by default: `.claude/.ck.json` `corePrinciplesInject.enabled: false` / `CK_CORE_PRINCIPLES_INJECT=0` turns it off and `corePrinciplesInject.reinjectAfterTokens` (default 150000) sets its interval. `quality-skill-remind.cjs` is on by default: `qualitySkillReminder.enabled: false` / `CK_QUALITY_SKILL_REMINDER=0` turns it off. `commit-skill-route.cjs`, `judgement-integrity-route.cjs` and `ai-feature-route.cjs` are on by default and read their switch only after a prompt matches: `.claude/.ck.json` `commitSkillRoute.enabled: false` / `CK_COMMIT_SKILL_ROUTE=0`, `judgementIntegrityRoute.enabled: false` / `CK_JUDGEMENT_INTEGRITY_ROUTE=0` and `aiFeatureRoute.enabled: false` / `CK_AI_FEATURE_ROUTE=0` (`lib/prompt-route-utils.cjs` `isRouterEnabled`). Read [../configuration/README.md § Advisory prompt routers](../configuration/README.md#advisory-prompt-routers) when turning one off.

> Large-output externalization, compaction snapshots/markers, transcript recovery,
> temp-file cleanup, and subagent-truncation detection are no longer hooks. Compaction-state
> recovery is **re-anchoring guidance** in the universal protocols (re-read files / `TaskList`
> on resume); `session-init.cjs` / `session-end.cjs` handle the remaining temp cleanup.

### Protocol Delivery

A domain-model signal delivers the compact entity-change gate to planning, implementation, fix and review skills that declare it. Entity/value-object wording and domain/entity/aggregate/value-object paths establish a candidate signal; the agent confirms semantic relevance before reading `domain-analysis/references/entity-quality.md`. Hooks never eagerly load that detailed reference. Readable unrelated context withholds the gate; unreadable context retains the conservative compact fallback.

A converted skill keeps one guide line per shared protocol (`<!-- PROTOCOL-GUIDES:START -->` block); the group hooks deliver the published text of those protocols once per session when the skill loads. A miss degrades to the guide line (read the file by path), never to silence. Read `ContextDelivery/README.ProtocolDelivery.md` in the business spec root (default `docs/specs`; `specRoots.business.path` overrides) when changing delivery behavior, and `0004-protocol-delivery-hybrid.md` in the ADR root (default `docs/adr`; a `docsRoots.adr.path` entry in `docs/project-config.json` overrides the path) for why delivery is hybrid.

| Hook                                  | Group (in `.claude/skills/shared/protocol-groups.json`)                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `protocol-inject-review.cjs`          | `review` — running a review, rating findings, the fix and re-review loop                             |
| `protocol-inject-evidence-trace.cjs`  | `evidence-trace` — evidence, investigation, debugging, code-graph use, reasoning integrity           |
| `protocol-inject-workflow-task.cjs`   | `workflow-task` — task tracking, planning, workflow execution, sub-agent orchestration, persistence  |
| `protocol-inject-spec-test.cjs`       | `spec-test` — specs, test cases, tests, spec-test-code sync, reference docs                          |
| `protocol-inject-design.cjs`          | `design` — architecture and code design quality, engineering foundations, UI/UX design               |
| `protocol-inject-universal-<n>.cjs` (n = 1–4) | `universal` — the framework rules every task follows (workflow, planning, evidence, ownership, closing reminders, the AI-mistake and reasoning rules, the project-reference and overlay rules); one hook per bin of the group's authored `bins` layout, see [Universal bundle](#universal-bundle) |
| `skill-overlay-remind.cjs`            | not a protocol group — reminds the agent, when a skill starts, which project overlay files apply to it; see [Skill overlay reminder](#skill-overlay-reminder) |

Each group entry is a three-line call to `runHook('<group>')` in `lib/protocol-delivery.cjs`, each universal bin a three-line call to `runHook(<n>)` in `lib/universal-delivery.cjs`; the five group entries and the overlay reminder register on every skill load path of the host:

- **Claude** (`.claude/settings.json`): PostToolUse `Skill`; PostToolUse `Read` with `"if": "Read(**/SKILL.md)"` on each handler (no process starts for any other read); `UserPromptExpansion` (typed `/command`); `SubagentStart` registered with no agent-type matcher, so every agent type (skill preloaders, `Explore`, `Plan`, general-purpose, custom agents) reaches the five group handlers and the four universal bins; each handler decides per agent and exits early when it has nothing to deliver. `UserPromptSubmit` carries the four universal bins.
- **Codex** (`.codex/hooks.json`, generated by `.claude/scripts/codex/sync-hooks.mjs`): `UserPromptExpansion` is remapped to `UserPromptSubmit` (`$<skill>` tokens); the `Read` group is rendered on PostToolUse `Bash`, whose early exit passes only a command naming `SKILL.md`; the `Skill`/`Read` groups themselves are skipped (`matcher-names-no-codex-tool`); `SubagentStart` and the universal bins on `UserPromptSubmit` are mirrored like their source groups; `SubagentStart` is matcherless (an agent-name list would render anchored as `^(?:…)$`, because Codex matchers are unanchored regexes). Protocol handlers use the lean launcher and `additionalContextLimit: 3000`.
- **OpenCode** (`.opencode/plugins/easy-claude-hooks.js`, generated by `.claude/scripts/opencode/sync-hooks.mjs`): PostToolUse `Skill` (the skill name arrives in `tool_input.name`) and `Read`; the bridge evaluates a handler's `Read(<glob>)` `if` before spawning it (true only for the `Read` tool whose `file_path` matches the glob as given or relative to the project root; `**/` = any directory prefix, case-insensitive on Windows) and runs any other `if` form unfiltered. `SubagentStart` and `UserPromptExpansion` are reported `unsupported-by-opencode`.

> **Codex hook trust — review new delivery steps in `/hooks`.** Codex runs a project hook only after the project is trusted and the hook's hash is stored, so a new or changed protocol handler is skipped silently until the user reviews it in `/hooks`; until then the guide lines are the delivery path for skill protocols and the universal rules are not delivered (see [Hook-only delivery: host requirements](#hook-only-delivery-host-requirements)). Handlers that did not change render byte-identically, so their earlier review still holds.

- **Relevance first:** a `Skill` load, a `Read` of `skills/<name>/SKILL.md`, a Codex shell command naming `SKILL.md`, a typed command, a Codex prompt containing `$`, or an agent start. Anything else exits before any project module loads.
- **Once per session and scope:** one record per tag under `<project>/tmp/protocol-delivery/<session>/<scope>/`, keyed by a hash of the published text; re-armed after compaction or 4,500,000 bytes of transcript growth (the `lib/workflow-route-delivery.cjs` values). Only tags delivered in full are recorded; a tag named by path is re-offered in full on the next load. An unwritable store still delivers, without de-dup.
- **Packing:** each message fits the 9,500-character bin; overflow is named by path from `.claude/skills/shared/protocols/index.json`. Skills on the `inlineSkills` list keep their bodies inline and receive nothing.
- **Trigger-gated protocols:** a tag marked `"trigger": "<name>"` in `protocol-groups.json` (design, journey, copy: `ui`; `domain-entity-change-gate`: `domain-model`; `ai-engineering-gate`: `ai-feature`) is delivered in full only when a loaded skill is one of the trigger's `skills` (owners), or the trigger's `pattern` matches the event text (skill or typed-command arguments, a Codex prompt) or the session's recorded prompts (`tmp/prompt-ledger/<session>/ledger.json`, last 40 entries), or its `pathPattern` matches the last 128 KB of the conversation record or those prompts. A gated tag that does not apply is neither delivered nor named and writes no record, so a later load whose context shows the subject still receives it; the skill's guide line remains the path. An unknown trigger, a bad regex or a failing context read delivers unconditionally. Read `deliveryTriggers` in `protocol-groups.json` when adding a trigger.
- **Agent-carried protocols:** at `SubagentStart`, a tag whose full `<!-- SYNC:tag -->` body sits between paired fences in the starting agent's own file is not delivered again (`agentInlines`; a `:reminder` never counts). Applies only when the agent file's declared `name` equals the agent type.
- **Sub-agents:** every `SubagentStart` of a valid agent type (custom, general-purpose, `Explore`, `Plan`, with or without preloaded skills, agent file absent or untrusted) receives the universal bundle, once per spawn (the spawn is its own ledger scope; a start without an agent id gets a one-off scope, `agentStartInput` in `lib/convention-ledger.cjs`). The group hooks deliver only the protocols of the agent's preloaded skills. The same start also carries the core principles, the UI reuse reminder and, when the session's latest recorded prompt asks for one, the verdict and AI-feature directives. A resumed agent gets them again only after its own compaction (the ledger reads the agent's transcript). **Limit:** no host event reports a running sub-agent's compaction, so until it is resumed only tool-event hooks reach it again (`quality-skill-remind.cjs` and the per-file conventions).
- **Shared core-principles record (compatible profile):** `core-principles-inject.cjs` records its delivery in the same store (`<project>/tmp/protocol-delivery`) under the tag `core-engineering-principles`, keyed by the same hash of the published text (`sharedRecordFor()` in `protocol-delivery.cjs`); a delivery by either hook marks the tag delivered for both. Each reader keeps its own window (the reminder 150k tokens, the protocol hook 4,500,000 bytes) and a compaction re-arms both. With no published projection the reminder keeps a private content-hash record.
- **Output:** JSON `hookSpecificOutput.additionalContext`; an unknown group prints one stderr line and nothing else; exit code is always 0.
- **Codex inline list:** `CODEX_INLINE_TAGS` in `.claude/scripts/codex/migrate-claude-to-codex.mjs` (empty) names protocols the Codex skill mirror keeps as full text instead of guide lines.

#### Universal bundle

In the compatible profile, the `universal` group of `.claude/skills/shared/protocol-groups.json` holds the framework rules every task follows; no file carries them: not `CLAUDE.md`, `AGENTS.md`, a skill or an agent. The group's `bins` entry is the authored layout: each bin lists the ordered tags of one message, and the projection build (`node .claude/scripts/build-protocol-projection.cjs`) fails when a universal tag sits in no bin, a bin names a foreign or repeated tag, or a rendered bin exceeds 9,500 characters. One hook process delivers one bin (`protocol-inject-universal-<n>.cjs`), with its own ledger record `universal-bin-<n>`, so a bin that went missing is delivered again without the others.

- **When:** `UserPromptSubmit` on the session's first prompt, and again only after about 150K tokens (`UNIVERSAL_REINJECT_TOKENS` × `BYTES_PER_TOKEN` bytes of conversation growth since that bin's last delivery) or after a compaction; `SessionStart` with source `compact` or `clear` delivers every bin at once (a run with no prompt after the compaction keeps its rules; the bin's own record is replaced, so the next prompt is silent), while `startup` and `resume` deliver nothing and record nothing; a bundle that cannot be rendered (unreadable `protocol-groups.json`, `protocols/index.json` or protocols folder) is reported by bin 1 alone as one `universal protocols unavailable (<reason>)` line, with no record, so the next event retries; the route hook likewise reports an unreadable `workflows.json` or gate file in one line; `SubagentStart` for every agent type, once per spawn. Any other event, and a prompt that is not the first, end before a project module loads.
- **Dedup:** the session ledger `lib/convention-ledger.cjs` (`deliverOnce`, `isPresent`, compaction marks), store `<project>/tmp/protocol-delivery`. A session without an id or an unusable store delivers without a record (a duplicate is accepted over a miss); a live peer lock skips.
- **Message:** header `<!-- CK:UNIVERSAL-PROTOCOLS n/N -->`, then protocol bodies in bin order from `.claude/skills/shared/protocols/<tag>.md`. An incomplete bin retains readable rules and names missing or empty files in a bounded notice. It forgets its previous record and never records partial delivery, so later eligible events retry and repair of identical bytes delivers once. Complete bins keep their own dedup. Oversized damaged text uses explicit read paths so the notice stays inside 9,500 characters.
- **Hosts:** Claude Code, Codex (`.codex/hooks.json`, derived from `settings.json` by `sync-hooks.mjs`; the four bins are on its SessionStart allowlist `codexSessionStartMirrors`) and the OpenCode bridge (`chat.message` is its `UserPromptSubmit`; its `session.compacted` runs the `compact` SessionStart group; OpenCode has no `SubagentStart`). In mode `on`, working hooks are required for delivery.

#### Context delivery profiles

`contextDelivery.profile` in the existing `.ck` loader selects `compatible`
(shipping default) or candidate `concise`. Read the
[configuration contract](../configuration/README.md#context-delivery-profile)
when choosing precedence, invalid-value recovery or rollback.

Concise bin 1 delivers the canonical `concise-agent-core` projection with the
same success-only ledger, session/child scopes, growth and compaction/clear
re-arm rules. Bins 2–4 are silent. The independent principles hook uses that
same core record and can recover a failed delivery; role delivery suppresses
principles only after a current successful core record in the same scope. A missing, unsafe,
empty or oversized core retains compatible rules, names the missing source
and remains retryable. Other specialist protocols and full role-agent carriers
keep their existing triggers and unread-source fallback.

The route hook supplies concise cues with actual mode/source. Those cues
include task-to-skill choices and the custom-simple audit example; registered
skill descriptions and `SKILL.md` remain the invocation authority. The automatic
catalog carrier is silent only with both valid concise sources; selection reads
`node .claude/scripts/workflow-catalog.cjs --mode=<mode>` explicitly, with the mode the cue states. Missing route depth keeps
compatible route/catalog delivery. Ask/auto/off, skill activation restrictions,
project route prose and explicit invocation semantics keep their existing owners.
Profile settings grant no authority. Hosts still require reviewed, enabled hooks;
no static root fallback or hookless support is added. Native Windows/macOS/Linux
and Claude/Codex/OpenCode rollout evidence is separate from fixture proof.

#### Skill overlay reminder

`skill-overlay-remind.cjs` fires on the events that mark a skill activation (PostToolUse `Skill`, PostToolUse `Read` of a `SKILL.md`, `UserPromptExpansion`; Codex: prompt and shell read). It resolves the project's skill-protocol registry through `lib/skill-protocol-overlay.cjs` and, when the skill has overlays, emits at most three lines: the skill name and the overlay body paths to read, plus the additive-only rule (overlays never waive the workflow route rules, git discipline, a review gate or a user-confirmation gate). It is silent when the registry is absent or empty or no row matches. One ledger record per skill and scope: the reminder repeats after about 150K tokens of growth, a compaction, or a changed overlay set.

### Hook-only delivery: host requirements

The universal rules, the workflow route and the skill-overlay reminder reach a session only through hooks. No root file, skill or agent carries a fallback copy, so each host must run them when runtime mode is `on`:

- **Intentional opt-out is supported.** Runtime mode `quiet` suppresses context injection while preserving operational checks; `off` skips every framework hook. In mode `on`, missing or untrusted hooks are a delivery failure. Read [runtime modes](../configuration/README.md#framework-runtime-mode) for scope and precedence.
- **Kept settings need the new entries.** A project that keeps its own `.claude/settings.json` across a framework upgrade does not gain hook entries added since; `verify-install.cjs` names a route registered without its catalog, or the reverse, at session start (see [Session Lifecycle](#session-lifecycle)).
- **Codex: review the handlers in `/hooks` before they run.** Codex runs a project hook only after the project is trusted and the hook's hash is stored. Until the `protocol-inject-universal-<n>`, `workflow-route-inject`, `workflow-catalog-inject` and `skill-overlay-remind` handlers are reviewed in `/hooks`, a Codex session receives no universal rules and no route, and no static fallback exists. Review them after the first `/sync-codex` and after any change to a handler.
- **OpenCode sub-agents: delivery is unverified.** OpenCode has no `SubagentStart`. A task-tool sub-agent receives the universal bundle only when its child session's first `chat.message` fires the bridge's `UserPromptSubmit` with the child's own session id; no test exercises that path. To check, inspect a sub-agent transcript for `CK:UNIVERSAL-PROTOCOLS 1/4` in compatible delivery or `CK:UNIVERSAL-PROTOCOLS 1/1` in concise delivery. A source or fixture check does not verify that native child-session path.

### Code graph mode

`hooks.codeGraph.enabled` in `docs/project-config.json` (`auto` when omitted, `on`, `off`) gates the four graph hooks through `codeGraphMode()` in `lib/graph-utils.cjs`: `on` = active; `auto` = active only when `.code-graph/graph.db` exists, otherwise dormant; `off`, or a malformed section or value, = off. While dormant or off, `graph-session-init.cjs` installs, probes and syncs nothing, `graph-auto-update.cjs` and `graph-prompt-sync.cjs` start no process, and `init-prompt-gate.cjs` shows no graph note. Only mode `on` without a built graph shows the graph-not-built note, once per session (a marker under the OS temp `ck/markers` dir; without a host session id the shared marker expires after 24 h). `/graph-code --mode=build` installs the Python graph tooling on first use. The graph CLI (`.claude/scripts/code_graph`) resolves the mode like the hooks: it reads the project config where `portability.projectConfigPath` in `.claude/.ck.json` relocates it, both readers treat a malformed section or value as `off`, and in mode `off` the CLI refuses every command with exit 1. Tests prove "no process started" with `CK_GRAPH_SPAWN_STUB`: when it names a file, every graph process is logged there as a JSON line and not started.

---

## Team work observer

`task-tracking-observer.cjs` registers on PostToolUse `Edit|Write|MultiEdit|NotebookEdit|apply_patch` with a three-second bounded owner. It emits deduplicated reminders for actual successful public edit targets, including delete/move hints; generated/private/temp/dependency paths are excluded. Hints never grant readiness, proof, acceptance or a canonical saved checkpoint. Optional project mode defaults to `off`. Shell scripts and external editors are not assumed instrumented; explicit check/report/checkpoint provides recovery. See [linked integration](../../skills/task-track/references/integration-guide.md).

`task-tracking-route.cjs` registers on UserPromptSubmit with a three-second limit. A fresh eligible, unquoted work/publication prompt receives one concise purpose and concern notice when tracking and its instructions are available. Repeated context, off/unavailable tracking, quoted examples and unrelated prompts are silent. The notice preserves the actual skill-selection choice, pending answer, same-task Skip and permissions; it starts no procedure and supplies no save, proof or acceptance. `lib/task-tracking-advisory.cjs` owns bounded eligibility and receipts, without scanning the planned work or persisting raw prompt/item content. Read [manual operations](../../skills/task-track/references/manual-operations.md) for actual maintenance authority and [linked integration](../../skills/task-track/references/integration-guide.md#exact-linked-concerns) for exact concerns.

## Lessons System

The lessons system is a simple manual learning mechanism. Paths in the diagram show the DEFAULT project-reference docs root; a `docsRoots.projectReference.path` entry in `docs/project-config.json` relocates it.

```
USER TEACHING                         READ-ON-DEMAND (static contract)
/learn "always use X"                 CLAUDE.md / agent / skill instructions
         ↓                                    ↓
/learn skill appends to               model re-reads
docs/project-reference/lessons.md     docs/project-reference/lessons.md
         ↓                                    ↓
- [YYYY-MM-DD] lesson text             on demand (incl. after compaction)
Max 50 entries (FIFO trim)
```

> The standing read-lessons contract is the universal `project-reference-docs-guide` protocol
> (delivered by the universal hook); there is no runtime lessons inject hook.

**How to teach:**

- Type `/learn always use the project-specific repository interface` → lesson saved to `lessons.md` in the project-reference docs root
- A broad, short (≤ 3 lines), project-specific rule can instead be saved to the `## Project Rules & Context` section of the root `CLAUDE.md` after you confirm the exact line; `/learn` then runs `sync-codex` so `AGENTS.md` follows
- Type `/learn list` → view current lessons
- Type `/learn remove 3` → remove lesson #3
- Say "remember this" or "always do X" → auto-inferred, asks confirmation

---

## Matcher vocabulary and limits

`.claude/settings.json` is the one hook source: the Codex and OpenCode projections are generated
from it. A matcher therefore lists names from every host. `AskUserPrompt` is the name the OpenCode
bridge emits for a question prompt, and `apply_patch`, `exec_command` and `update_plan` are Codex
tools. A name a host never emits is inert on that host, so keep such names when editing a matcher.

Most hooks declare no `timeout` in settings because they bound themselves: the shared runner
(`lib/hook-runner.cjs`) stops an async hook after 15 seconds and `post-edit-prettier.cjs` stops its
formatter after 10. Settings declare a `timeout` for two purposes only: a short cap (3 or 10 seconds) on advisory
reminder and observer hooks, and the 3-second allowance at session end, where a host gives a hook
without its own limit less time than cleanup may need. Before reviewing any of this against vendor guidance, read
[../framework-review-guide.md](../framework-review-guide.md).

## Session Lifecycle

`session-end.cjs` is registered without a reason matcher so actual host endings reach cleanup.
It declares a 3-second limit, the same session-end budget the notification hook uses: a host
gives an end hook without its own limit only its short default (about 1 to 1.5 seconds).
Every end revokes only that session's Git leases. Known reset/exit reasons (`clear`, `logout`,
`prompt_input_exit`, and the OpenCode `exit` alias) remove its swap and snapshot; `resume`,
`other`, and unknown reasons preserve recovery. The legacy `compact` payload only prunes old
swap files and leaves leases unchanged; actual Claude compaction uses SessionStart.

```
SESSION START (13 hooks)                        DURING SESSION
  verify-install.cjs ───────────────────┐         graph-auto-update.cjs (after edits)
    └── partial-copy preflight          │         post-edit-prettier.cjs (after edits)
  session-init.cjs ─────────────────────┤         file-convention-inject.cjs (after reads/edits)
  file-convention-inject.cjs (compact|clear: record condensation, no output)
  prompt-ledger.cjs (compact|resume|clear: re-anchor the original request)
  protocol-inject-universal-1..4.cjs (compact|clear: re-deliver the universal bundle)
  core-principles, judgement, ai-feature, ui-reuse, workflow route + catalog (compact: re-deliver)
  skill-activation-inject.cjs (startup|resume|compact|clear: skill auto-trigger policy)
    ├── cleanup temp files              │         prompt-ledger.cjs (task checkpoints)
    │                                   │         token-budget-checkpoint.cjs (task checkpoints)
    │                                   │         core-principles-inject.cjs (task checkpoints, ~150k-token dedup)
    │                                   │         quality-skill-remind.cjs (every tool result, ~150k-token dedup)
    │                                   │         protocol-inject-*.cjs (skill load, agent start)
    ├── detectProjectType()             │       PROMPT (UserPromptSubmit)
    ├── resolvePlanPath()               │         init-prompt-gate.cjs (gate)
    └── writeEnv() (CK_* vars)          │         graph-prompt-sync.cjs (HEAD-change resync)
  session-init-docs.cjs                 │       PRETOOLUSE GATES
  graph-session-init.cjs ───────────────┘         review-commit-gate
                                                  doc-sync-gate (WARN)
                                                SESSION END (2 hooks)
                                                    session-end.cjs
                                                      ├── revoke session-scoped Git leases (actual endings)
                                                      ├── cleanup temp files
                                                      └── swap cleanup (known reset/exit; preserve resume/other; prune legacy compact)
                                                    notifications/notify.cjs (main-session alert)
                                                STOP → .claude/hooks/notifications/notify.cjs (notification)
```

> Plan/skill/todo enforcement and compaction snapshot/recovery are no longer hooks —
> that behavior is **model-driven guidance** in the universal protocols (re-read files /
> `TaskList` on resume).

---

## Lib Modules

<!-- COUNT:lib-modules -->66<!-- /COUNT --> direct `.cjs` modules under `.claude/hooks/lib/`.

### State Management

| Module                  | Purpose                                                                          |
| ----------------------- | -------------------------------------------------------------------------------- |
| `ck-session-state.cjs`  | Session state persistence                                                        |
| `workflow-state.cjs`    | Workflow progress tracking across compaction                                     |
| `todo-state.cjs`        | Todo list state persistence                                                      |
| `agent-files-state.cjs` | Shared detection of missing root agent-instruction files (CLAUDE.md / AGENTS.md) |

### External Memory

| Module            | Purpose                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| `swap-engine.cjs` | Core engine: externalize large outputs, generate pointers, manage swap lifecycle |

### ClaudeKit (CK) Infrastructure

| Module                 | Purpose                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `ck-paths.cjs`         | Centralized path constants (`/tmp/ck/`, swap, edit, todo dirs)                                  |
| `framework-runtime.cjs` | Shared runtime mode resolution and entrypoint guard; `on`, `quiet`, `off` across every registered hook |
| `ck-config-loader.cjs` | Config loading and merging                                                                      |
| `ck-config-schema.cjs` | Validate `.claude/.ck.json` against expected schema (warns on typos/unknown keys, never blocks) |
| `context-delivery.cjs` | Adapts the effective profile and reads confined concise projections; configuration remains owned by the CK loader |
| `ck-config-utils.cjs`  | Facade for config utilities                                                                     |
| `ck-env-utils.cjs`     | Environment variable detection                                                                  |
| `ck-git-utils.cjs`     | Low-level git utilities                                                                         |
| `ck-path-utils.cjs`    | Path resolution/normalization; `isAbsolutePathWithin` is the canonical containment check        |
| `ck-plan-resolver.cjs` | Resolve active plan from session or branch context                                              |

### Security / Authority

| Module                      | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `command-inspection.cjs`    | Pure bounded Bash tokenization with static/dynamic provenance and no command execution                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `git-statement.cjs`         | Pure Git / GitHub CLI statement classifier for `review-commit-gate.cjs`: tokenizes each static Bash statement through `command-inspection.cjs`, normalizes Git global options and repository identity, and classifies it allow / protected / deny / unknown; each caller owns its own policy                                                                                                                                                                                                             |
| `git-operation-lease.cjs`   | Short-lived session/project/repository/operation bookkeeping with replay-safe issue/revoke/check lifecycle. **Scoped speedbump, not a security boundary:** the store is an ordinary directory that is not tamper-proof (`git-operation-lease.cjs:14`) and `issueLease` performs no issuer-authority check, so any process able to write the store can mint one. It raises the cost of an accidental push; it does not stop a determined one, and it is never a substitute for the user's explicit request. |
| `path-boundary-policy.cjs`  | Pure command/path role classification helper; library module, not a registered hook                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `project-root.cjs`          | Resolve and validate the consuming project root across cwd/script/env launch shapes                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `review-receipt.cjs`        | Snapshots, issues, verifies, skips, and clears short-lived review receipts bound to the exact repository, base tree, and candidate tree                                                                                                                                                                                                                                                                                                                                                                    |
| `sensitive-path-policy.cjs` | Pure sensitive-path classification shared by sensitive-path consumers                                                                                                                                                                                                                                                                                                                                                                                                                                      |

### Context / Prompt Support

| Module                       | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `universal-delivery.cjs`     | Delivery of the `universal` group: the authored `bins` layout (each bin one message of at most 9,500 characters with a `<!-- CK:UNIVERSAL-PROTOCOLS n/N -->` header, rendered by `renderBin`, which the projection build also uses), `runHook(n)` for `protocol-inject-universal-<n>.cjs` (early exit before any project module loads; UserPromptSubmit on the first prompt and again after 150K tokens of growth or a compaction; SubagentStart once per spawn), one ledger record per bin and scope, fail-open delivery when the store is unusable |
| `workflow-route-delivery.cjs` | Delivery of the workflow route as two hook outputs: `runHook('route')` for `workflow-route-inject.cjs` (state line, gate filtered to the route mode, project protocol; the off notice in mode `off`) and `runHook('catalog')` for `workflow-catalog-inject.cjs` (the catalog in the first form within `PAYLOAD_CAP`), any other part name writing nothing; builders `buildInjection` / `buildCatalogInjection`, the one-line notices for an unreadable gate or registry, the size line of a route output past `HOST_OUTPUT_LIMIT`, prompt-directive handling, one ledger record per output with fail-open delivery |
| `session-init-helpers.cjs`   | SessionStart helpers: reference doc placeholders, config init                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `doc-sync-classify.cjs`      | Pure classification shared by both `doc-sync-gate.cjs` matchers (commit-time WARN + per-edit WARN, both advisory exit 0)                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `file-conventions.cjs`       | Pure convention-class matcher and renderer: trigger targets, membership (include/exclude/extension, plus bounded content signals for code files: `contentRegexes` / `contentExtensions`, read only for classes that declare them), precedence + cap, content tag `[[convention:name@hash8]]`, budgeted digest, legacy static-table rows, and complete paged or legacy `--lookup <path>` CLI                                                                                                                                                                                                                                                                                                                          |
| `convention-ledger.cjs`      | Delivery memory for `file-convention-inject.cjs`: per session/working-context records, short claim locks, condensation signals (SessionStart report + transcript marks), presence rule, static-instruction credit, stale-session pruning; `deliverOnce` owns the check → lock → re-check → write → record sequence for both outputs of `workflow-route-delivery.cjs`, `core-principles-inject.cjs` and the reminder hooks; `deliverWithCompaction` also delivers at once on the host's compaction report (forgets the record, absorbs the boundary line written after it); `agentStartInput` gives a sub-agent start without an agent id a one-off scope                                                                                                                                                             |
| `prompt-ledger-store.cjs`    | Session prompt record for `prompt-ledger.cjs`: settings resolution, secret redaction, per-entry truncation and entry cap (original request pinned), atomic ledger/markdown/delivery writes, digest + pin rendering with `[[prompt-ledger@hash8]]`, presence rule, clear rotation and stale-session pruning                                                                                                                                                                                                                                                          |
| `prompt-route-utils.cjs`     | Advisory prompt-router helpers for UserPromptSubmit hooks (`commit-skill-route.cjs`, `judgement-integrity-route.cjs`, `ai-feature-route.cjs`, `core-principles-inject.cjs`, `quality-skill-remind.cjs`): `routedPrompt` returns the prompt a router classifies (the session's latest recorded prompt at a sub-agent start or a compaction report) and `routerOutput` its event's output form; `stripCode` drops fenced/inline code so quoted commands never read as intent; `isHostEnvelope` / `userPromptText` reuse the host-envelope predicates of `prompt-ledger-store.cjs` so host wrappers never count as user text; `readUserPrompt` returns the prompt minus host envelopes; `isRouterEnabled(section, envVar)` reads the `.ck.json` / env opt-out; `loadRouterSettings(projectDir, section)` returns the whole merged section (used by `core-principles-inject.cjs` for `reinjectAfterTokens`); re-exports `isHookEntryPoint` from `hook-runner.cjs`                           |
| `protocol-delivery.cjs`      | Protocol delivery for the five `protocol-inject-<group>.cjs` entries: resolves the loaded skill or agent from the event (skill name, `SKILL.md` path, typed command, `$<name>` token, agent type) with name and path containment checks, reads the skill's guide block, filters by group, the inline-skill list, the delivery trigger of gated protocols and bodies the starting agent file already inlines, packs the published text into ≤ 9,500-character messages (overflow named by path), and runs the hook entry (`runHook`: bounded stdin, early exit before any other module loads, per-session de-dup under `tmp/protocol-delivery`); never delivers a `universal` tag (`universal-delivery.cjs` owns it) |
| `session-usage.cjs`          | Token usage of one Claude session, main + sub-agent transcripts, each response counted once (message.id + requestId, last line wins); non-cached `total` (cache reads reported apart); full read (`readUsage`) for the usage report and a resumable incremental read (`readUsageIncremental`) for the checkpoint hook, with capped chunks and a counted skip for over-cap lines |
| `convention-merge.cjs`       | Stack-agnostic convention-class detection from existing config keys + additive merge (add / keep maintainer and edited / refresh unedited detected, never remove); CLI `--detect [--merge] [--write] [--enable]`                                                                                                                                                                                                                                                                                                                                                    |
| `doc-stamp-guard.cjs`        | Owns the invariant "a tracked doc's bytes change ONLY when its meaning changes": normalizes away clock-derived stamps (`Last scanned`, `Last verified`, `last_updated`, `Regenerated`) and whitespace, then answers whether a write or a staged diff carries real content. Content-derived tokens (COUNT markers, hashes) are deliberately NOT masked. CLI `--staged` (list stamp-only staged diffs, exit 3), `--check <doc> --candidate <file>` (exit 3 = no-op), `--record-verified <doc>` (log a no-change pass to the untracked ledger). Never mutates the repo |
| `skill-protocol-overlay.cjs` | Resolves the project's skill-protocol overlay for a skill about to run: matches the skill name against the registry's `Target` column (exact > glob > `*`, most specific tier wins outright), resolves each matched row to `<protocols-dir>/<Name>.md`, and rejects a malformed or directory-escaping name unread. Consumed by `skill-overlay-remind.cjs`. Overlays are additive only and never waive a gate |

### Configuration

| Module                           | Purpose                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `project-config-loader.cjs`      | Load and validate project configuration, generate project summary                                                            |
| `project-config-schema.cjs`      | Project config JSON schema definition                                                                                        |
| `project-reference-registry.cjs` | Resolves reference-doc aliases, owners, and scan targets; validates selected docs and contains paths within configured roots |
| `spec-artifact-profile.cjs`      | Validates configured spec-artifact profiles and matches identifiers against declared grammars                                |
| `test-fixture-generator.cjs`     | Generate test fixture data for hook tests                                                                                    |

### Startup Installation

| Module                     | Purpose                                                                                                                                                                                                                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `startup-install.cjs`      | Owns startup dependency installation end to end: validates the request against project and manager preconditions, then runs the selected manager under the project lock. `runStartupInstall` is the boundary the hook calls; `buildInstallRequest` is the decision half, useful on its own in tests. |
| `startup-install-lock.cjs` | The private per-project lock the runner holds while a manager runs — owner liveness, post-acquire recheck, and proof the whole process tree stopped before the lock is reclaimed.                                                                                                                    |
| `windows-git.cjs`          | Probes native Git/Git Bash, validates trusted WinGet, starts the bounded `Git.Git` repair worker, and publishes child-local `PATH`/`CK_GIT_*` capability values.                                                                                                                                     |

### Team Work Tracking

| Module | Purpose |
| --- | --- |
| `task-artifact-store.cjs` | Portable record inspection and byte-preserving owned-field patches |
| `task-progress-reader.cjs` | Consistent scoped work views, verification and unique-task metrics; on request, the delivery figures of every area and every initiative and the read of one exact record |
| `task-tracking.cjs` | Common versioned operation owner and read-only operation catalogue for CLI, app and upkeep |
| `task-tracking-advisory.cjs` | Bounded optional prompt guidance and deduplicated session/agent delivery receipts; no canonical work writer |
| `task-tracking-concerns.cjs` | Bounded read-only exact ID/path concerns, declared relationship direction/owner/rationale, current verification and partial/unavailable diagnostics |
| `task-tracking-config.cjs` | Optional policy, members, profiles and protective limits |
| `task-tracking-deletion.cjs` | Previewed exact draft deletion and local recovery |
| `task-tracking-earlier-project.cjs` | Pure whole-project mapping of records stored in the earlier vocabulary to current terms; the one result both earlier-project readers show and the migration writes |
| `task-tracking-files.cjs` | Project-contained byte IO and atomic publication |
| `task-tracking-identity.cjs` | Read-only selected-checkout Git/custom actor resolution and stale-selection revalidation |
| `task-tracking-lock.cjs` | Bounded cooperating-writer locks |
| `task-tracking-migration.cjs` | Explicit resumable move of a project from the earlier vocabulary to the current one, with a progress record, refused reads and saves while it is open, and an independent recount |
| `task-tracking-placement.cjs` | Bounded read-only placement candidates from current areas, initiatives, similar records and governing specs; selects and writes nothing |
| `task-tracking-policy.cjs` | Shared lifecycle, authority, criteria/proof, graph and health rules |
| `task-tracking-profile.cjs` | Capability diagnostics; native capabilities unavailable without owner proof |
| `task-tracking-report.cjs` | Owned offline reports in the full, packed or detail-free form, optional size budget, refresh and viewer requests |
| `task-tracking-upkeep.cjs` | Exact session links, saved checkpoints and observer hints |
| `task-tracking-vocabulary.cjs` | Single owner of tracker words: kinds, record locations, lifecycles and permitted steps, levels, types, priorities and link relations, current and earlier, with the earlier-to-current mapping |

See [setup](../configuration/README.md#team-work-tracking) and [linked integration](../../skills/task-track/references/integration-guide.md). CLI/app policy has one common owner.

### General Utilities

| Module                  | Purpose                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `debug-log.cjs`         | Debug logging (file + stderr)                                                                                                                                                                    |
| `hook-runner.cjs`       | Hook execution wrapper with error handling; also exports `isHookEntryPoint(module)` — the entry-point check every hook uses so it runs under both `node <hook>` and the Codex `node -e` launcher |
| `stdin-parser.cjs`      | Parse JSON from hook stdin                                                                                                                                                                       |
| `temp-file-cleanup.cjs` | tmpclaude file cleanup                                                                                                                                                                           |
| `graph-utils.cjs`       | Python detection, graph availability check, code-graph mode (`codeGraphMode`), CLI invocation wrapper                                                                                                                               |

---

## Per-File Convention Injection

Keeps the right conventions in the model's attention at the moment it reads or changes a file of a given kind (tests, specs, backend, frontend, general code, …). Spec: `ContextDelivery/README.PerFileConventionInjection.md` in the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path.

**Configuration** — every `contextGroups[]` entry is a convention class; `conventionInjection` switches delivery on (absent ⇒ off, silent). **No project config file at all** ⇒ built-in fallback: delivery on with the `ui-ux-gate` and `ai-feature-gate` classes (`builtinFallbackConfig()` in `lib/file-conventions.cjs`), so a framework install without setup still gets the design rules on front-end files and the AI-engineering protocol on model-calling code; an existing config — without the switch, or malformed — never falls back. `referenceDocs[]` filenames resolve inside the project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path:

```json
{
    "contextGroups": [
        {
            "name": "integration-test",
            "pathRegexes": [],
            "pathGlobs": ["**/*.test.cjs"],
            "excludePathGlobs": ["**/fixtures/**"],
            "priority": 100,
            "skills": ["integration-test"],
            "referenceDocs": ["docs/project-reference/integration-test-reference.md"],
            "rules": ["Explicit Given/When/Then; clean temp dirs in finally"]
        }
    ],
    "conventionInjection": {
        "enabled": true,
        "maxChars": 4000,
        "maxClassesPerEdit": 4,
        "reinjectAfterBytes": 4500000,
        "reinjectAfterMinutes": 30,
        "blindReinjectAfterMinutes": 5,
        "onRead": true
    }
}
```

- **Membership:** `fileExtensions` filter (if any) AND any include (`pathRegexes` on `/`-prefixed repo-relative path, `pathGlobs`, `fileNameRegexes` on the base name, or a content signal) AND no exclude. Case-insensitive; files outside the project, folders, removals and host-reported failures are ignored. Containment is by filesystem identity: a path inside the project as spelled stays in-project, a differently-spelled path (symlink, macOS `/var` → `/private/var`) that resolves into the project counts as in-project, and a path whose identity cannot be established (broken or looping symlink) is outside.
- **Content signals (`contentRegexes` + `contentExtensions`, optional `contentLabel`):** a class may also match a file by what it contains. `contentRegexes` are case-insensitive regexes tested against the first 16 KiB of the file (`CONTENT_LIMITS.maxConfigBytes`; the framework's own audited `AI_FEATURE_GATE` sources, and a project's identical copy of them, see the first 64 KiB, `maxBytes`), and only for files whose extension is in `contentExtensions` (text/code types). Exclusions are decided first, so an excluded file is never read; a file already matched by a path/name include is not read either; only a class that declares content signals ever causes a read. The read is bounded and fail-open: files over 2 MiB, binary samples (a NUL byte), folders, missing or unreadable files never match and never throw, and `createContentReader` never reads through a link that resolves (by `realpath`) outside the project root or whose resolution fails. Disk content is read (PostToolUse runs after the edit); `matchGroups`/`lookup` take a `ctx.readContent(rel)` reader (`createContentReader(projectDir)`), and the static Automatic Skill Activation row names `content signals: <label> in N code file types`. Limits (validated by the config schema, mirrored by the runtime, `CONTENT_LIMITS`): at most 64 regexes of up to 500 characters, 64 extensions, an 80-character label; `contentRegexes` without `contentExtensions` is a config error. **Regex safety:** a count or length cap does not bound one pattern's running time, so a config regex gets three layers. (1) A best-effort PRE-FILTER: `isSafeContentRegex` (`contentRegexLintReason`, mirrored by value in `project-config-schema.cjs`; a test compares the two) refuses a blank, over-long or uncompilable pattern, a back-reference, a repeated group that contains a large repetition (`(x+)+`), a large repetition over alternatives that can start alike (`(a|aa)+`), adjacent large repetitions over the same or a wildcard-like atom (`a*a*`, `.*.*`) and more than 10 loop-free optional elements in total (`?`, `{0,3}`, empty alternatives; V8 cannot interrupt compiling a long chain of them); "large" = unbounded or above 100. The validator reports each as `unsafe content regex (<reason>)`; the runtime IGNORES such a source. The lint is a blacklist, so other slow patterns pass it. (2) The TIME BUDGET: every source that is not byte-identical to a shipped `AI_FEATURE_GATE` source (trust is by the exact source text, never by class name) runs inside `vm` under a timeout, about 100 ms in total per file and class (`CONTENT_REGEX_BUDGET_MS`); a timeout is no match, and a source that timed out is skipped for the rest of the process (a fresh hook process starts clean; the scan and `--lookup` CLIs stall at most once per source). The timeout interrupts matching (backtracking), not V8's compilation of a loop-free optional chain, which the lint cap covers. (3) The shipped sources run directly, vetted by the perf and lint tests. Over-cap lists differ by design: the validator rejects them, the runtime truncates to the first 64 usable regexes and 64 extensions. The signals enter the content version only when declared, so classes without them keep their version and static tags.
- **Deliverable:** a class with `rules`, `skills`, `referenceDocs`, `guideDoc` or `patternsDoc`. Styling/design-only classes are never delivered.
- **Per-class trigger (`on`):** `read`, `edit` or `both`; omitted or unrecognized = `both`, and config validation names an invalid value. A `Read` delivers only `read|both` classes, in conditional wording (`If you will edit this file, read first: …`, or `… follow the conventions below` when no doc is listed); a create/change/move delivers only `edit|both` classes in the mandatory wording. The filter runs before the `maxClassesPerEdit` cap. `lookup`/`--lookup` list what a change would deliver. `on` enters the content version only when it is not `both`, so existing classes keep their version. Setup detection (`convention-merge`) writes `on: edit` on a new detected class that carries reference docs or skills and never changes a maintainer's value; the `ui-ux-gate` class declares `both`, so a Read still puts the gate in context before the first edit.
- **Precedence:** `priority` ascending (100 specific · 500 default · 900 general), ties by declaration order, capped at `maxClassesPerEdit` before presence; the reminder says "earlier section wins on conflict". A rule shared by several classes is shown once.
- **Only what is missing:** a class is skipped while its record in this session + working context (main, or the helper agent id) has the current content version, was delivered after the last condensation, and the conversation grew less than `reinjectAfterBytes` since (transcript bytes, ~5–6 per visible character, so the 4500000 default ≈ 200K tokens; a history shorter than at delivery counts as absent; size unknown ⇒ age below a time limit, `blindReinjectAfterMinutes` (5) when the scope is blind — no transcript AND no condensation ever observed for it — and `reinjectAfterMinutes` (30) otherwise). A class left out by the size budget is never recorded. A record keeps the wording it was delivered in: a read-form (conditional) record never satisfies a later change, so the first change re-delivers the class once in the mandatory wording. A current `[[convention:name@hash8]]` tag in EVERY existing root carrier (CLAUDE.md and AGENTS.md) counts as delivered at session start for the main context only. Condensation signals: SessionStart `compact|clear` (Claude) and `compact_boundary`/`compactionMarkers` lines in the transcript. The SessionStart report does not name the condensed context, so it re-arms main plus any helper whose own transcript cannot be measured; a helper with a measurable transcript uses its own marks only.
- **Per-class window and evidence** (not rendered, not part of `hash8`): `reinjectAfterTokens` (20000–2000000) gives one class its own re-arm distance, converted at 22 transcript bytes per token (the measurement behind the 4500000-byte default), so 150000 tokens ⇒ 3300000 bytes. `evidenceDocs` (ALL complete reads) / `evidenceSkills` (ANY complete load) count as present only when a distinct request and its successful reply occur in this working context after the latest condensation and within the window. A full `Read` (default or offset 1, no limit), or a resolved local `Skill`, must return exactly the current complete project-owned document or `.claude/skills/<name>/SKILL.md` body. The scanner recognizes raw strings and concatenated all-text blocks paired by unique `tool_use.id` / `tool_result.tool_use_id`; errors, partial or foreign content, missing or duplicate identities, launch acknowledgments, raw slash commands and unknown result shapes give no credit. Completion sets the evidence position, and the oldest required document completion sets the all-document window; a fully loaded listed skill is sufficient on its own. A verified hit is recorded as an `evidence` delivery and nothing is sent. Unavailable current content, shell reads or unrecognized host decorations cost an extra reminder, never an unproven suppression.
- **UI/UX gate (`ui-ux-gate`):** the framework class `UI_UX_GATE` in `lib/file-conventions.cjs` (re-exported by `lib/convention-merge.cjs`). Setup detection proposes it only when the config records front-end evidence (a `modules[]` kind starting `frontend`, or non-empty `styling.fileExtensions`), so a configured project without a front-end never pays; delivery stays behind `conventionInjection.enabled`. With no project config file it is the built-in fallback class (same content version as the detected class, so running setup later does not re-send it). Members by file name: html/htm/xhtml, razor/cshtml, hbs/handlebars/ejs/pug/twig/liquid/njk, css/scss/sass/less/styl/pcss, jsx/tsx/vue/svelte/astro, Angular `*.component.ts`, xaml/axml/storyboard/xib, and Android `res/layout*/…xml`; NOT mdx (documentation prose), ts/js (mostly logic), swift/kt/dart (SwiftUI, Compose and Flutter share the extension with non-UI code, which a path matcher cannot separate). Payload: a compact digest naming `UI-1.1`–`UI-9.4` (`SYNC:ui-ux-design-principles`), `DD-1`–`DD-8` (`.claude/docs/design-knowledge.md`), `CL-1`–`CL-6` with §0.5 / B12–B15 / E9–E11 / §R / I15 / K10 (`.claude/docs/design-review-checklist.md`) and calibration (`.claude/docs/design-review-calibration.md`), with MUST-read of those docs. Window `reinjectAfterTokens: 150000`; evidence = both the checklist and design-knowledge read, or either of `ui-design`, `design-spec` loaded (only skills that carry the whole gate, journey-first rule included, count as evidence). Timing: Claude's Edit/Write of an existing file requires a prior Read, so the Read trigger delivers the gate before the first edit; a brand-new file gets it right after its first Write (delivery is PostToolUse-only by design — never blocks), and the design protocols (delivered by the UI-triggered hook, `ui` trigger) plus mandatory complete pre-action lookup (or the legacy static `ui-ux-gate` row) cover the remaining cases. Widen or narrow membership by editing the class in `contextGroups[]`. Tests: `tests/suites/ui-ux-gate-inject.test.cjs`.
- **AI-feature gate (`ai-feature-gate`):** the framework class `AI_FEATURE_GATE` in `lib/file-conventions.cjs` (`on: both`, priority 100, window `reinjectAfterTokens: 150000`). Members: AI-surface directories (`prompts`, `llm`, `rag`, `embeddings`, `guardrails`, `mcp` as whole path segments; a folder named `agents`, `retrieval` or `evals` alone is not one, and a media, PDF, archive, `.bin`, lock, source-map or minified file under one is not a member), prompt file names (`*.prompt.*`, `*.prompts.*`, `*.prompty`, `system[-_.]prompt*`, `prompt[-_.]template*`), and code files (notebooks included: a source line may start after a quote or an escaped newline) whose content shows a model or vector-store SDK import (built from the shared `AI_SDK` list), a provider API call shape (`messages.create(… model`, `chat.completions.create(`, `<model receiver>.generateContent(`), a provider host, a `model` argument naming a model id, or an MCP server class. A bare vendor or model name, `tool_use`, `tool_calls` or `system_prompt` is NOT a signal, and a file with no AI surface costs nothing. Excluded: dependency/build output, `tmp/`/`temp/`, the framework's agent folders (`.claude`, `.agents`, `.codex`, `.opencode`), `docs/`, all `*.md`. Payload: three short rules and ONE read doc, `.claude/skills/shared/protocols/ai-engineering-gate.md` (the digest stays under 1400 characters); the checklist and knowledge docs are read by section, on demand, never whole. Evidence = the protocol file and the checklist read, or the `ai-engineering-review` skill loaded. Setup detection (`convention-merge`) proposes it only when a dependency manifest (`package.json` dependencies, `requirements*.txt`, `pyproject.toml`, `go.mod`, `pom.xml`, `build.gradle(.kts)`, `*.csproj`, at the root or up to two folders down, bounded reads) names an AI SDK from the same list. `node .claude/scripts/ai-signal-scan.cjs [--staged|--unstaged|--base <ref>|--files a b] [--json]` applies this same class to a change set for review-time triage. `--base <ref>` is what a branch or PR review examines: `git diff <ref>...HEAD` (the merge-base range) UNION the local changes, de-duplicated; `--base` with no ref, an empty ref or an unsafe ref is an error that scans nothing. The JSON `status` is `surface` (a file was found), `clean` (a complete scan found none — the only status that means "skip the AI review") or `unknown` (git error, missing/rejected base, a file list cut at `MAX_FILES` with no hit, or `--files` with no path or with paths outside the project); the text form and `--json` both carry signal names only (matcher, content label; `signals.content` holds the label), never text taken from a scanned file, and the text form says `UNKNOWN` for an incomplete scan. The exit code is always 0. Tests: `tests/suites/ai-feature-gate-inject.test.cjs`, `tests/suites/ai-signal-scan.test.cjs`, `tests/suites/ai-feature-route.test.cjs`, `tests/suites/ai-gate-zero-cost.test.cjs` (the zero-cost invariants).
- **Content version:** `hash8` covers the rendered items AND membership (`pathRegexes`, `pathGlobs`, `fileNameRegexes`, `excludePath*`, normalized `fileExtensions`, and — when declared — `contentRegexes`, `contentExtensions`, `contentLabel`) plus the renderer version, so a matcher edit re-delivers and refreshes the static rows. Changing it invalidates every carrier tag: regenerate CLAUDE.md/AGENTS.md (`run-codex-sync.mjs`) or consumers lose static credit until they do — an extra reminder, never a missed one.
- **Cost and opt-out:** the `Read` trigger costs ~15 ms per read (one config load plus a stat of the transcript) and is kept because a read almost always precedes the first edit of a file. To silence reads for one class set its `on: edit`; to silence all reads set `conventionInjection.onRead: false` (the hook still runs); to remove the cost entirely delete the PostToolUse group from `.claude/settings.json` — static rows and `--lookup` keep working.
- **Diagnostics:** `CK_DEBUG=1` (or `true`) makes the hook explain each decision on stderr (`[file-convention-inject] skip: …` / `delivered: …`). Diagnostics never touch stdout and never change delivery.
- **Retention:** a session folder in the store is removed once its newest entry is older than 7 days — swept on SessionStart `compact|clear` and, on the delivering path, at most once per 24 h (`_prune.json` marker), at most 50 sessions per sweep. A folder is removed only when it passes **two independent tests**: it carries the ownership marker `<session>/_owner.json` naming this ledger as owner, AND it is ledger-shaped (`_session.json`, `*.tmp`, and `main`/`agent-*` scope dirs holding only `*.json|*.lock|*.tmp`). Shape alone is NOT sufficient and never was safe on its own — `CK_CONVENTIONS_DIR` may point anywhere, and an unrelated directory can coincidentally match the shape, so shape-only pruning could delete a foreign directory outright. A folder that fails either test cannot be aged at all, so it is never swept. **Pre-existing unmarked folders are therefore never adopted and never pruned** — there is no signal that distinguishes a legacy ledger directory from a foreign one, and that indistinguishability is exactly the hazard; a live session re-marks itself on its next write, so only abandoned legacy directories linger, at a few KB each in a temp store. Missed prune costs disk; a false prune costs data. Paths that deliver nothing never write to the store.
- **Shape and budget:** first line = must-read references + skill protocols, one tagged section per class, last line repeats the references + lookup command. Over `maxChars`, the lowest-precedence class drops its rules first, then is omitted.
- **Store:** `CK_TMP_DIR/conventions` (override `CK_CONVENTIONS_DIR`); records are written only after stdout is flushed, and a ~10 s claim lock prevents duplicate reminders from simultaneous triggers.
- **Setup:** `/project-config` 2r, `/project-init` step 2b and `/scan` Phase 4 run `node .claude/hooks/lib/convention-merge.cjs --detect --merge [--write]` (additive; never clobbers maintainer or edited classes; `--enable` never overrides an explicit `enabled: false`; `--write` replaces the config atomically). A mirrored copy of the static-table builder resolves this lib through the generator's project root first, then `CLAUDE_PROJECT_DIR`/cwd, and only accepts a copy exporting the full renderer contract.
- **Static rows (legacy mode):** each row renders include patterns, then `ext <types>` and `· not <exclusions>` when the class has them, so a row never claims files the hook skips.
- **Doc routing:** `docs-manager --mode=update` routes edits of `contextGroups[]`/`conventionInjection` here; `.claude/scripts/doc-impact-map.cjs` matches classes by their `patternsDoc`/`guideDoc` fields only (regex/guide-doc routing), not by the delivery matchers.

| Host                   | Delivery                                                                                                                                                       | Condensation re-arm                                                                                                                                                                        | Helper-agent separation                 | Status                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | -------------------------------- |
| Claude Code            | PostToolUse `additionalContext` on `Read\|Edit\|Write\|MultiEdit\|NotebookEdit`                                                                                | SessionStart `compact\|clear` + transcript marks + byte/age re-arm                                                                                                                         | `agent_id` scope + sub-agent transcript | Runtime-verified (this repo)     |
| Codex                  | PostToolUse `additionalContext` for `apply_patch` (Add/Update targets; a moved file counts only at its Move-to destination), mirrored via `run-codex-sync.mjs` | SessionStart `compact\|clear` is mirrored for the allowlisted runtime producers + byte re-arm; the blind age limit (`blindReinjectAfterMinutes`, 5 min) is the fallback when neither fires | None (no helper id) ⇒ shared main scope | Doc-verified, runtime-unverified |
| A shell read | Complete `--lookup <path> --complete` before access: all pages and required references; legacy mode retains static table + bounded lookup                               | Model re-reads per static rules                                                                                                                                                            | n/a                                     | CLI available in both modes      |

**Codex SessionStart is selectively mirrored.** Static-only producers remain
omitted under `static-startup-context-authoritative`, because their content is
already carried by `AGENTS.md`. The runtime producer
allowlist mirrors `session-init-docs.cjs`, `file-convention-inject.cjs`,
`prompt-ledger.cjs`, `verify-install.cjs`, `skill-activation-inject.cjs`, `ui-reuse-remind.cjs`, `failure-investigation-remind.cjs`, the four `protocol-inject-universal-<n>.cjs` bins and the compaction re-delivery of `core-principles-inject.cjs`, `judgement-integrity-route.cjs`, `ai-feature-route.cjs`, `workflow-route-inject.cjs` and `workflow-catalog-inject.cjs`: the first three publish state read
by mirrored consumers, `verify-install.cjs` probes/repairs native Git/Git
Bash and publishes a machine capability that static context cannot represent, the skill policy refreshes personal runtime selection, the UI and failure reminders record private compact/clear generations for blind contexts, and the bins and the prompt-time context hooks re-deliver their context after a compaction (matchers `compact|clear` and `compact`; no static carrier holds it).
Groups without an allowlisted producer are recorded as skipped; Codex's
SessionStart matcher vocabulary otherwise matches `startup|resume|clear|compact`.
The sync report and divergence oracle are the source of truth for this
allowlist; current runtime verification remains explicitly marked below.

---

## Session Prompt Ledger

Keeps the user's ORIGINAL request — and every later prompt of the session — recoverable and in attention, however long the run. Spec: `ContextDelivery/README.SessionPromptLedger.md` in the business spec root.

**Configuration** (`.claude/.ck.json`; on by default, no config needed):

```json
{ "promptLedger": { "enabled": true, "maxPromptChars": 4000, "maxEntries": 200, "reinjectAfterBytes": 1000000, "reinjectAfterMinutes": 45 } }
```

- **Record:** every non-empty prompt of an identified session is redacted, bounded and appended to `tmp/prompt-ledger/<session>/ledger.json` + `ledger.md` (override `CK_PROMPT_LEDGER_DIR`) with `seq`, time, a ≤160-char goal line and the prompt text. Entry 1 is the original request and is never evicted; over `maxEntries` the oldest later entries drop with a recorded count. A prompt without a `session_id` is NOT recorded (no shared fallback file can mix sessions).
- **User input only:** host-generated payloads that arrive on the prompt channel (`<task-notification>`, `<system-reminder>`, `<cross-session-message>`, command echoes) are stripped from the recorded text, and a payload carrying nothing else is not recorded at all — a machine notice can never become the pinned goal.
- **Honest origin:** when the record is created while the conversation is already ≥ 20 000 bytes, the first entry is labelled "first recorded prompt (record started mid-session, the original request may be earlier)" in the pin note, the digest and `ledger.md`, instead of being called the original goal.
- **Only when missing:** the first prompt returns a one-line pin notice; afterwards the digest is delivered only when the last delivery is no longer present — same presence rule as the convention ledger (delivered after the last condensation AND transcript growth below `reinjectAfterBytes`; size unknown ⇒ age below `reinjectAfterMinutes`). Condensation signals reuse `convention-ledger.cjs` (`scanCompaction`) plus this store's own SessionStart report.
- **Triggers:** UserPromptSubmit (record + re-anchor), SessionStart `compact` (record condensation, deliver), `resume` (deliver when absent), `clear` (archive the record so the next prompt is the new original request), PostToolUse `TodoWrite|TaskCreate|TaskUpdate|update_plan` in the MAIN conversation (checkpoint re-anchor; a helper agent never receives it — its goal travels in its brief).
- **Digest shape:** original goal first, ≤8 newest goal lines plus a count of the rest, the record path, then the verify line with `[[prompt-ledger@hash8]]`; ≤1600 chars and never starting with `[`/`{` (Codex JSON sniffing). Prompt text is labelled quoted user data, never instructions.
- **Secrets:** private keys, AWS/GitHub/Slack/Google/Stripe/`sk-` keys, JWTs, `Bearer`/`Basic`/`Token` credentials, URL credentials and secret assignments (`password`, `secret`, `*_token`, `connection_string`, `cookie`, … including `_`-prefixed env-var names such as `DB_PASSWORD`) are replaced by `[REDACTED:<kind>]` BEFORE anything is stored or shown; the count is kept per entry. A redaction marker written by the prompt itself is neutralised first, so it can never shield a real value.
- **Retention:** when a session's first prompt creates a record, ledger-shaped session folders untouched for 7 days are removed (≤50 per run); a folder that is not ledger-shaped is never deleted (`CK_PROMPT_LEDGER_DIR` may point anywhere).
- **Opt-out / diagnostics:** `promptLedger.enabled: false` or `CK_PROMPT_LEDGER=0|off|false` makes it inert (the hook-delivered `task-planning-rules` protocol of the universal bundle still binds the model to pin the goal itself). `CK_DEBUG=1` explains each decision on stderr. Any failure ⇒ no output, exit 0.

**Host matrix** — the UserPromptSubmit path is self-sufficient by design: it
both records and re-anchors, and the goal-pinning rule itself arrives through
the universal bundle's task-planning protocol. In runtime mode `on`, working hooks are required for delivery. Codex additionally mirrors the allowlisted SessionStart producers;
the distance rules (growth / age) remain the fallback when no condensation or
transcript signal is observable (`prompt-ledger.test.cjs::TC-SPL-016`).

| Host                                                      | Events that fire                                                                                           | Record + pin                                            | Re-anchor mechanism                                                                                                                        | Status                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| Claude Code                                               | UserPromptSubmit · SessionStart `compact\|resume\|clear` · PostToolUse checkpoints                         | UserPromptSubmit (plaintext)                            | Condensation report + transcript marks + growth/age + task checkpoints                                                                     | Runtime-verified (this repo)     |
| Codex                                                     | UserPromptSubmit · SessionStart `compact\|resume\|clear` (allowlisted producers) · PostToolUse checkpoints | UserPromptSubmit (plaintext)                            | SessionStart condensation signal + growth/age distance; `update_plan` checkpoint best-effort                                               | Doc-verified, runtime-unverified |

---

## Workflow Route Injection

The workflow route uses two registered hook outputs, one per hook file. Compatible delivery emits both; concise delivery emits route cues and reads the catalog before selection (see [Context delivery profiles](#context-delivery-profiles)). The outputs are separate because a host cuts any single hook output above 10,000 characters to a short preview (`PAYLOAD_CAP` = 9,500 keeps a margin). Both hook files are thin entries of `lib/workflow-route-delivery.cjs`, which owns the two outputs. `workflow-route-inject.cjs` calls `runHook('route')` and writes the **route output**: the `Route mode:` state line, the gate and an optional project protocol, inside `<!-- CK:RUNTIME-WORKFLOW-ROUTE -->`. `workflow-catalog-inject.cjs` calls `runHook('catalog')` and writes the **catalog output**: the current workflow and skill catalog in compact form, inside `<!-- CK:RUNTIME-WORKFLOW-CATALOG -->`. An entry that names any other part writes nothing (one stderr line), never a second copy of the route output.

- **Compact catalog (catalog output):** one row per workflow with id, effective activation tier, step count, a when-to-use hint of whole clauses, at most 190 characters, and the `[a ∥ b]` parallel-phase marks; skills are listed by name. Step lists are left out: `start-workflow <id>` resolves the full sequence from `.claude/workflows.json`.
- **Gate (route output, compatible profile):** always delivered in full, whatever form the catalog takes, from the `<!-- CK:WORKFLOW-GATE -->` block of `.claude/skills/shared/workflow-first-gate.md`, keeping only the lines fenced `<!-- CK:GATE-MODE ask -->` / `<!-- CK:GATE-MODE auto -->` for the resolved mode (both variants ask the workflow question only when the route is to start a catalog workflow; the `auto` variant recommends the full workflow first, never for a `manual` tier). No root file carries the route; this hook is its only carrier.
- **Decision discovery:** the shared gate selects `grill` for unresolved choices fitting one conversation and `wayfinder` for dependent unresolved choices spanning sessions. Size alone does not select a map. Saved plans and specs keep their validators, and an owning workflow's interview is reused. Linked confirmed decisions travel forward only while scope and premises hold; discovery preserves human choices, required gates and its stop/no-build boundary. Selection remains model-driven guidance, subject to explicit requests and configured automatic-selection restrictions.
- **Size fallback (catalog output only):** the cap is measured on the catalog output alone, so the catalog form depends on the registry and never on the length of the gate or of a project protocol. When the compact form exceeds the cap, the catalog output takes the first form that fits: the compact rows without the step-skill names; an index with id, tier and parallel-phase marks; an index with id and tier; a pointer only, with no workflow rows. Every form keeps the barrier legend's advancement clause and the pointer to `.claude/workflows.json`. The wf-cycle W5 check reads the catalog output: it verifies barrier-mark parity only for the compact catalog and the marked index, and requires the advancement clause in every form.
- **Route output size:** the framework never drops or cuts the gate or a project route protocol, so a long protocol makes the route output longer; what the model then sees is the host's decision: a host shows one hook output in full up to 10,000 characters and only a short preview of a longer one, the gate included. With the shipped gate, a protocol of about 3,300 characters or fewer keeps the route output within the 9,500-character cap, and one longer than about 3,850 takes it past 10,000. A route output longer than 10,000 characters says so on its second line, where the preview still shows it: its size, where to read the gate and the protocol in full, and the protocol size that fits. A shorter output carries no such line.

- **Route mode:** `ask` (default), `auto` or `off`, resolved once by `resolveWorkflowRouteMode` in `.claude/scripts/lib/workflow-routing-config.cjs`. Precedence, later wins: default → team `docs/project-config.json` `portability.workflowRouteMode` → `~/.claude/.ck.json` → git-ignored `.claude/.ck.local.json` → env `CK_WORKFLOW_ROUTE_MODE` → this session's prompt directive. No project config, no key, or an invalid or corrupt value in any source falls through to the next source and ends at `ask`; the hook never fails on it. The legacy boolean `portability.workflowAutoDetect` reads as `off`/`ask` inside each file. Full reference and per-OS paths: [../configuration/README.md § Workflow route mode](../configuration/README.md#workflow-route-mode-per-person).
- **Prompt directive:** a prompt whose whole first line is `workflow-mode: ask|auto|off` (or `/framework-config --mode=workflow <mode>`, `$framework-config --mode=workflow <mode>` on Codex; optional trailing `save`) sets the mode for this prompt and the rest of the session (state file `_route-mode.json` in the session's ledger directory under `tmp/workflow-routing/`), wins over every other source, re-delivers the new route even after one was delivered, and with `save` writes `~/.claude/.ck.json`. The route output records and acknowledges the directive; the catalog output reads the same first line to pick its mode and writes neither session state nor an acknowledgement (the hooks of one event run in parallel). Prose mentioning the words, a later line, a code fence or trailing words is not a directive. The `framework-config --mode=workflow` skill and `node .claude/scripts/workflow-mode.cjs` show the winning source and persist a mode.
- **Hosts:** Claude, Codex (the mirrored `.codex/hooks.json` launcher, needing project trust) and the OpenCode bridge all run these two hook files. No root file carries a route pointer; runtime modes `quiet` and `off` intentionally deliver no route; mode `on` requires working hooks.
- **Custom protocol:** `portability.workflowRouteProtocol` (team or developer-local, resolved through the same cascade with a valid local value replacing the team value). A string is inline markdown; an object carries inline `text` and/or a repo-relative `path` read at runtime (absolute/`..` and privacy-sensitive configured names or physically resolved targets such as `.env`/credentials/keys are rejected; aliases to eligible public files remain readable, and a file over 20,000 bytes is truncated with a visible marker). The resolved text is appended after the gate, in the route output, inside `<!-- CK:WORKFLOW-ROUTE-PROTOCOL -->`. Runtime-only — it is never stamped into tracked context, and it is part of the delivery content hash so a change re-delivers.
- **Delivery:** advisory plaintext on `UserPromptSubmit`; malformed input, missing session identity and output failures produce no context and exit successfully. An unreadable or empty gate (including marker-only or mode-filtered empty guidance) makes the route output the state line and one gate-unavailable notice. An unavailable catalog (a corrupt or missing `.claude/workflows.json`) makes the catalog output one line, `workflow catalog unavailable: <reason>; read .claude/workflows.json`, while the route output still carries the full gate. An unusable ledger store delivers without a record, accepting a duplicate over silence.
- **Dedup:** session + scope + content hash in `tmp/workflow-routing/`, one record per output (groups `workflow-route` and `workflow-catalog`). Each output is delivered once per conversation and re-delivered without the other: a changed gate or protocol re-delivers the route output at once, a changed catalog the catalog output.
- **Re-arm:** each output, on its own record, after a detected compaction, transcript shrink, or 4,500,000 bytes of transcript growth (the portable proxy for roughly 200K tokens). A host that exposes no transcript-size or compaction evidence stays deduplicated for the session; elapsed wall time alone does not prove that the context crossed the token boundary.
- **Mode `off`:** the route output is a short notice (`<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->`, no gate) instead, deduplicated and re-armed the same way, and the catalog output is silent. The catalog output is also silent when `portability.skillAutoTrigger` is false, where the route output carries the auto-trigger notice in place of the gate. Skill descriptions and skill-level next-step workflow suggestions never read the mode, so the notice tells the model that `off` overrides them: no self-started workflow or workflow skill, skip a skill's switch-to-workflow step, run a workflow (or the one skill the user names) only on an explicit request, every quality gate still binding. Changing the mode mid-session delivers the new form on the next prompt.
- **Activation tiers:** each row shows the workflow's effective tier (`auto`, `confirm`, `manual`): its `.claude/workflows.json` `activation` value, raised by `portability.workflowActivation.default` (a default only tightens) or replaced by a per-workflow `overrides` entry (which may loosen). The team value lives in `docs/project-config.json`; a valid `.claude/.ck.local.json` value wins per setting, and overrides merge per workflow id (`resolveActivationTier` in `.claude/scripts/lib/workflow-routing-config.cjs`). In mode `ask` every tier asks the workflow question before a self-routed catalog workflow start (direct, single-skill and custom-simple routes ask nothing) and the tier only orders its recommendation; in mode `auto` the tier decides whether it asks (legend in the catalog). A `manual` workflow's wrapper skill also sets `disable-model-invocation: true`, which the Codex mirror turns into `agents/openai.yaml` `policy.allow_implicit_invocation: false`.
- **Explicit invocation:** skills and workflows remain directly invokable while automatic routing is disabled because their source definitions are unchanged.
- **Full opt-out for one session:** `claude --settings .claude/config/vanilla-settings.json --disable-slash-commands` turns off hooks, project instructions and skills without editing `.claude/` (see `.claude/config/README.md`).

Both hook files are projected into `.codex/hooks.json` and the OpenCode hook bridge. Neither projection copies a personal setting into tracked output.

---

## Hook Input/Output

### Input (stdin)

Hooks receive JSON via stdin with event-specific payload:

```json
{
    "tool_name": "Edit",
    "tool_input": {
        "file_path": "/path/to/file.ts",
        "old_string": "...",
        "new_string": "..."
    },
    "session_id": "abc123"
}
```

### Output (stdout)

`UserPromptSubmit` guidance is plaintext stdout by default. Claude and Codex both accept non-JSON
stdout on this event as prompt context, so `init-prompt-gate.cjs` keeps the same reminder behavior
on both hosts. JSON `hookSpecificOutput.additionalContext` remains available when a hook needs
structured control, but the stale-doc/project-init reminder does not need it.

Keep prompt guidance plaintext, but do not let the emitted text start with `{` or `[` after
trimming. Codex may route JSON-looking stdout through its event-specific JSON parser before
treating it as plaintext context, which can surface as an invalid `UserPromptSubmit` JSON error.

Do not generalize this rule to every event: Codex `Stop` and `SubagentStop` require JSON output,
while `UserPromptSubmit` specifically accepts plaintext context.

### Exit Codes

| Code | Meaning                                        |
| ---- | ---------------------------------------------- |
| `0`  | Success, allow operation to proceed            |
| `2`  | Block operation (with error message on stderr) |

> All hooks exit 0 (non-blocking) except blocking safety gates (`review-commit-gate`) which exit 2 to block. `init-prompt-gate.cjs` and `doc-sync-gate.cjs` are WARN-only — every code path exits 0.

### Bash PreToolUse reliability contract

The two registered Bash hooks use the shared `runPreToolHookSync` completion contract in
`.claude/hooks/lib/hook-runner.cjs`:

- An allow decision exits `0` with empty stdout. Diagnostics and advisory warnings belong on stderr.
  `doc-sync-gate.cjs` advisory warning is written to stderr; no allow path emits stdout.
- A block decision exits `2` with a human-readable stderr message and never writes a decision-looking
  object to stdout unless the hook is deliberately returning the documented `hookSpecificOutput` object.
- Error diagnostics are written to stderr. The commit gates use exit 2; doc-sync uses exit 0 for
  input and handler errors.
- Hooks set `process.exitCode` after writing output so Node can drain stdout/stderr. They must not call
  `process.exit()` immediately after emitting a block or rewrite response.

For a one-session diagnostic trace, set `CLAUDE_HOOK_DEBUG=1`. Each Bash-path invocation appends one
JSON record containing the hook, tool, decision, exit code, and duration (never the command or path) to:

```text
%TEMP%/ck/debug/bash-hooks.log       # Windows
$TMPDIR/ck/debug/bash-hooks.log      # POSIX (or the platform temp directory)
```

Set `CLAUDE_HOOK_DEBUG_LOG` to override the file during a test or incident. The file rotates at 1 MiB
to `<name>.1`; a logging failure is reported on stderr and does not change the policy decision.

---

## Configuration

The WARN-only doc-sync gate reads `workflowPatterns.docSyncGate` in the project config:
`enabled: false` explicitly opts out; `enforcedAreas` accepts objects such as
`{ "name": "Area", "codePathPrefixes": ["src/Area/"] }`, with a nonblank bucket name and at least
one nonblank code prefix. Malformed declarations disable the advisory with a stderr diagnostic.
Prefix matching uses directory boundaries. The gate assumes bucket/README Feature Specs and
their AC/BR/TC sections; a project with a native spec layout should disable it until a matching
adapter is implemented. This setting does not disable any other spec/test/code checks.

### Hook Registration (`.claude/settings.json`)

Hooks are registered in `settings.json` under `hooks.{EventName}[].hooks[]`. Each registration specifies a `command` and `matcher`:

```json
{
    "hooks": {
        "PreToolUse": [
            {
                "hooks": [
                    {
                        "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/doc-sync-gate.cjs",
                        "type": "command"
                    }
                ],
                "matcher": "Bash"
            }
        ]
    }
}
```

### Hook-Specific Config (`.claude/.ck.json`)

Doc paths in this file are defaults resolved against the project-reference docs root — a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides that root.

```json
{
    "codeReview": {
        "enabled": true,
        "rulesPath": "docs/project-reference/code-review-rules.md"
    }
}
```

---

## Testing

The primary runner declares 133 tests. The aggregate runner `run-all-tests.cjs` discovers 2097 tests declared across 124 suite files. Source inventory is not an execution result; read the runner output for observed discovery, outcomes and skips. The aggregate includes eighteen task-tracking suites with 590 declared executors.

| Test Surface          | Count | File/Location                                                     |
| --------------------- | ----- | ----------------------------------------------------------------- |
| Primary hook runner   | 133   | `.claude/hooks/tests/test-all-hooks.cjs`                          |
| Aggregate runner      | 2097 | `.claude/hooks/tests/run-all-tests.cjs` (all suites, declared)  |
| Standalone test files | TODO  | `tests/test-*.cjs/.js` excluding runner (re-verify before citing) |
| Lib unit tests        | TODO  | `lib/__tests__/*.test.cjs` (re-verify before citing)              |

Run all primary hook tests: `node .claude/hooks/tests/test-all-hooks.cjs`

Run the full aggregate suite: `node .claude/hooks/tests/run-all-tests.cjs`

---

## Related Documentation

- [architecture.md](./architecture.md) — Hook runtime contract and layer boundaries
- [extending-hooks.md](./extending-hooks.md) — Creating custom hooks
- [../configuration/README.md](../configuration/README.md) — Configuration hierarchy and hooks config
- [../skills/README.md](../skills/README.md) — Skills catalog

---

_Source: `.claude/settings.json` (authoritative hook registrations) + `.claude/hooks/` | Hooks + lib modules | Lessons via `/learn` skill_
