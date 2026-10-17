---
name: framework-config
description: '[Utilities] Use when asking about or configuring the .claude/.codex/.agents/.opencode skills framework: command discovery/help, runtime modes, scoped settings, commit reviews, hooks, workflows or skill visibility. Explains options; changes only requested settings.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
## Quick Summary

**Goal:** Explain framework options and apply only requested settings at their correct scope, with validated saved and effective results.

**Summary:** Choose help/settings/workflow → discover exact keys and effective layers → answer questions read-only or apply the requested change → validate and read back → report the winning value/source.

## Contents

- [Quick Summary](#quick-summary)
- [Framework Configuration and Help](#framework-configuration-and-help)
- [Choose a mode](#choose-a-mode)
- [Help mode](#help-mode)
- [Workflow mode](#workflow-mode)
- [Settings mode](#settings-mode)
- [Discover exact keys and current behavior](#discover-exact-keys-and-current-behavior)
- [Apply a requested setting](#apply-a-requested-setting)
- [Runtime machinery and context injection](#runtime-machinery-and-context-injection)
- [Common language → setting](#common-language--setting)
- [Closing Reminders](#closing-reminders)

# Framework Configuration and Help

Answer framework questions and manage requested settings without requiring the user to know JSON keys.
This lightweight entry skill remains eligible for automatic selection when heavy skill auto-trigger
is disabled. It does not authorize unrelated heavy skills, scans or workflows.

## Choose a mode

`$framework-config [--mode=help|settings|workflow] <request> [options]`
(Codex: `$framework-config`; OpenCode uses its native skill loader.) Infer the mode from natural
language when no flag is given; no arguments shows the three modes and a few common options.

| Mode | Purpose | Examples |
| --- | --- | --- |
| `help` | Command/category search, command details, task recommendations, framework usage | `--mode=help`, `--mode=help review`, `--mode=help "debug a login error"` |
| `settings` | Show/explain/set/reset a framework preference | `--mode=settings show`, `--mode=settings disable heavy auto-trigger --scope=checkout` |
| `workflow` | Show/set workflow route mode ask/auto/off, including session-only changes | `--mode=workflow --show`, `--mode=workflow off --scope=session` |

- A question, “show”, “explain”, “what can I configure”, or missing arguments is read-only. Never
  turn a question or command recommendation into a config edit or execution of that command.
- “Set”, “enable”, “disable”, “change”, or “reset” authorizes only the requested setting change.
- Default write scope is **checkout** for settings. Workflow mode defaults to **session** for a bare
  ask/auto/off selection. Explicit `--scope=session|checkout|user|team` wins; session scope is supported
  only for workflow routing. User means every project; team means the configured project default.
- Application configuration and unrelated product/API questions are outside this skill. Project facts
  use the configured project information; do not invent project facts from generic framework docs.

## Help mode

Run `.claude/scripts/ck-help.py` using the available Python interpreter (`py -3` on Windows), with the
relevant English query (translate non-English search terms). It owns command/category search and task
recommendations. Respect its `@CK_OUTPUT_TYPE` marker: comprehensive-docs, category-guide,
command-details, search-results or task-recommendations. For an explicit catalog/document request,
show the complete relevant output then examples; for a focused question, answer the relevant part with
source pointers. Do not launch recommended heavy skills unless separately authorized.

The help backend's `config/settings/options/switches/env` queries use
`node .claude/scripts/ck-config-help.cjs` for schema-generated settings help. This is help, not mutation.
`$plan` → `$plan --mode=execute` is the planning flow; `$feature-implement` is standalone.

## Workflow mode

- Show the effective mode and every layer using `node .claude/scripts/workflow-mode.cjs --show`
  (add the actual `--session=<id>` when known). Report its source and missing-session note. Never
  infer the current session's value from files alone.
- For a session request, the first-line `$framework-config --mode=workflow ask|auto|off` directive
  (optional `--scope=session`) is applied by the route hook. Old `workflow-mode:` directives remain
  compatible. If natural language did not form a directive, run the helper with the requested mode,
  `--set-session` and the real session id. Never fabricate an id. Without an id/hook, follow the
  requested mode in this conversation and disclose that runtime session persistence is unavailable.
- With `--scope=user` (or legacy `--save`), run the helper `<mode> --save`; checkout (or
  `--save --local`) adds `--local`. It refuses unless git reports the file ignored. A prompt directive
  ending in `--save` also sets the session and saves the user preference, with independent outcomes.
- Team scope and reset use the scoped settings procedure below for `portability.workflowRouteMode`.
  Do not change a tracked file for a personal/session request. Resetting a session preference removes
  the preference using the helper `--reset-session` and the real session id, then reads the effective mode again;
  do not remove the session directory or other hook records.
- Report the helper's effective mode, source, saved file and any higher-precedence override verbatim.
  Precedence: default ask → team → user → checkout → environment → session directive.
  No gate or user choice is waived by a route-mode change. Runtime changes require no mirror sync.

## Settings mode

Resolve the requested preference, apply it only to the selected scope, and report the effective result.

### Configure through the skill

From an updated checkout, use these requests in Claude/OpenCode; Codex uses `$framework-config`:

```text
$framework-config --mode=settings show framework runtime
$framework-config --mode=settings quiet --scope=user
$framework-config --mode=settings off --scope=checkout
$framework-config --mode=settings on --scope=checkout
$framework-config --mode=settings reset framework runtime --scope=checkout
$framework-config --mode=settings apply framework runtime
$framework-config --mode=settings use lightweight commit reviews --scope=checkout
$framework-config --mode=settings choose commit reviews by risk --scope=user
$framework-config --mode=settings make <skill-name> explicit-only --scope=team
```

Replace `<skill-name>` with the registered skill name. Each line is a separate request, not a setup
sequence to execute together. Runtime requests use the CLI below, including `apply` to register and
reconcile this checkout without changing its preference. In `--mode=workflow`, `off` changes routing
only; it does not select `frameworkRuntime.mode: off`.

## Discover exact keys and current behavior

Work from the adopting project's root; use that project's copied framework, never an authoring-repo path.

1. For personal settings and common switches, run `node .claude/scripts/ck-config-help.cjs --json`.
   For project options, run `node .claude/skills/project-config/scripts/project-config-help.cjs --search=<term>`
   or `--section=<section>`. Read only the owning documentation relevant to the question.
2. For commands and general framework help, run `.claude/scripts/ck-help.py` with the available Python
   interpreter (`py -3` on Windows) and the relevant English search terms, or read `.claude/docs/README.md`
   and its linked topic. Present the relevant answer and usable examples; no need to start another skill.
3. Use `.claude/scripts/lib/workflow-routing-config.cjs` to resolve paths and effective runtime choices.
   Its `resolveProjectConfigPath(root)` honors `portability.projectConfigPath` in `.claude/.ck.json`;
   `resolveUserConfigPath()` resolves the actual home; `resolveLocalOverridePath(root)` resolves the checkout.
   For skill activation, `resolveSkillAutoTrigger({rootDir: root})` returns `enabled`, `source` and paths.
   For workflow routing, use `resolveWorkflowRouteMode` and report any session-specific limitation.
4. Never guess a key or silently substitute a different setting. An unsupported option needs an explanation,
   not invented JSON. Existing environment overrides can mask a saved choice; report that explicitly.

## Apply a requested setting

1. Resolve the selected destination: team → configured project config; user → `~/.claude/.ck.json`;
   checkout → `.claude/.ck.local.json`. Verify checkout-local config is git-ignored before writing it;
   if not, add only its ignore entry to the project's ignore file as part of the requested personal setup.
2. Read the existing file as JSON, preserving unrelated keys. An invalid/unreadable existing file is a
   repair issue: report it and do not replace it with an empty object. A missing personal file may be created;
   a missing team config needs the minimum valid project identity rather than a partial invalid config.
3. Merge only the requested key. Reset removes that key from the chosen layer and keeps every other key;
   it exposes the next preference/default rather than forcing a hardcoded value. Do not delete other layers.
4. Validate the candidate before saving: `validateConfig(candidate)` from
   `.claude/hooks/lib/project-config-schema.cjs` for team config, or `validateCkConfig(candidate)` from
   `.claude/hooks/lib/ck-config-schema.cjs` for personal config. Report validation errors without saving.
   Use normal host file tools or a small properly quoted script; never interpolate user text into shell code.
5. Save, reread, validate, and resolve the effective value again. Report the exact file, saved preference,
   winning value/source, and whether regeneration is needed. Runtime switches need no mirror regeneration.
   Native visibility/profile changes use their documented generator; never edit generated mirrors by hand.

## Runtime machinery and context injection

Use the platform-neutral Node CLI from an updated checkout on Windows, macOS or Linux:

```text
node .claude/scripts/framework-mode.cjs show --json
node .claude/scripts/framework-mode.cjs quiet --scope=user
node .claude/scripts/framework-mode.cjs off --scope=checkout
node .claude/scripts/framework-mode.cjs on --scope=checkout
node .claude/scripts/framework-mode.cjs reset --scope=checkout
node .claude/scripts/framework-mode.cjs apply
```

`show --json` inspects all layers and the winning mode without mutation. Execute only the requested
change with `node .claude/scripts/framework-mode.cjs <mode> --scope=<scope>`:

- `on`: normal framework hooks.
- `quiet`: no hook-injected instructions, routing, ledgers or automatic context preparation. Commit review and doc checks, formatting and notifications stay active.
- `off`: all shipped framework hooks return before parsing input or doing work; the CLI also disables this checkout's framework skills in Claude and Codex native discovery.
- `apply`: reconcile native skill visibility with the effective mode without changing the preference; register this checkout for later global changes.
- `reset`: remove only this layer's `frameworkRuntime.mode`, exposing the next layer.

Scopes are `checkout` (default, ignored `.claude/.ck.local.json`), `user` (every project using this version, `~/.claude/.ck.json`) and `team` (configured project config). The same Node command works on Windows, macOS and Linux. A missing team config still needs a valid project identity. The CLI validates and reads back changes, refuses malformed existing settings and unignored checkout settings, and reports a masking environment override.

Precedence: default on → team → user → checkout → `CK_FRAMEWORK_MODE`. No mirror regeneration is needed for the mode change. Use the CLI rather than editing JSON for a complete toggle: it writes personal native overrides outside Git, preserving the team profile and previous settings. Off also removes explicit Claude/Codex skill invocation; restore with this Node command. On/quiet/reset restore the previous profile. Host tool permissions and repository Git/CI hooks remain separate. OpenCode currently receives hook control only.

User-scope native changes cover registered existing checkouts; run `apply` once in each new checkout after its mirrors exist. Older framework copies must be updated before they honor this setting. Direct JSON/environment changes need `apply` for native visibility, as do newly added skills or a changed Codex home. The recovery registry is `~/.claude/framework-runtime-projects.json`; do not delete it while disabled. Conflicting native skill settings fail before the preference is saved. Do not remove user settings to silence a refusal. Report missing checkouts, a masking preference, `recoveryPending` and any unsupported host explicitly. Read `.claude/docs/configuration/README.md#framework-runtime-mode` for recovery and scope limits.

Native settings require fresh Claude/Codex sessions; already delivered context cannot be withdrawn. Read `.claude/docs/configuration/native-session-smoke.md` when verifying native discovery and explicit invocation. Enabled skills retain their own checks, including commit/PR reviews.

“Turn off hook context injection” maps to `quiet`; “turn all machinery off” maps to `off`. Do not change a global preference without a request for user/global scope. Keep `CLAUDE.md` and `AGENTS.md` project-only; never put a framework-mode notice or fallback instructions into them.

## Common language → setting

| Request | Exact setting | Behavior |
| --- | --- | --- |
| “Set framework runtime to on / quiet / off” | `frameworkRuntime.mode: "on" / "quiet" / "off"` | Use the runtime CLI to reconcile hooks and native discovery at the requested scope; default on |
| “Don't automatically start heavy skills” | `portability.skillAutoTrigger: false` | Ask once to run a suitable matched skill or skip and execute directly; named requests, required calls and authorized workflow steps remain allowed |
| “Restore automatic skills” | `portability.skillAutoTrigger: true`, or reset if requested | Later valid preference wins; default true |
| “Use lightweight commit reviews” | `commit.reviewMode: "lightweight"` | Default: automatically run `commit-review --fix-loop` at every commit risk tier, at most two rounds; no review-choice question |
| “Choose commit reviews by risk” | `commit.reviewMode: "risk-based"` | Low skip / Medium why-review / High changes-review; PR whole-branch reviews always retain this policy |
| “Workflows should ask / recommend the full workflow first / only run explicitly” | `portability.workflowRouteMode: "ask" / "auto" / "off"` | Separate workflow routing preference; `ask` and `auto` both ask before a self-selected workflow starts |
| “Make these skills explicit-only for the team” | `skillProfile.commandOnly` in project config | Merge only the requested skill names and regenerate native host projections; profile guards still apply |

Skill-auto-trigger precedence: default → team → user → checkout → `CK_SKILL_AUTO_TRIGGER`.
Commit review precedence: default lightweight → team → user → checkout → `CK_COMMIT_REVIEW_MODE`.
After showing, setting or resetting `commit.reviewMode`, run `node .claude/scripts/lib/commit-review-policy.cjs`
from the requested checkout root and report its winning mode/source. Tests, exact-candidate review
receipts, required project checks and explicit Git authority remain unchanged; invalid settings fail closed.
Native manual-only selection is team-scoped: for a requested team profile change, merge the named
skills into or out of `skillProfile.commandOnly` in the configured project config, preserving its
preset and unrelated list entries. Do not save this team-only profile in personal runtime overrides.
Validate with `resolveProfile(root, candidate)` from `.claude/scripts/sync-skill-profile.cjs` and the
team schema before saving. Report warnings; do not save if validation throws or `refusals` is nonempty.
Then run `node .claude/scripts/sync-skill-profile.cjs` and
`node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` to generate host projections. Keep required
dependencies callable; never set `allowHidingCalledSkills` just to silence a refusal. Removing the
owned list entries and syncing restores invocation defaults. Do not hand-edit generated host files.
`commit`, `pull-request` and this configuration/help entry remain eligible under restricted selection.
An explicitly requested workflow authorizes its scoped planned skill calls, including later/resumed steps
and required nested calls. Commit and pull-request select tests and review under the commit skill's
decision policy without a test/review question. `commit.reviewMode` selects commit review depth;
skill auto-trigger and runtime preferences never approve a skip. Required skills selected by that
policy remain callable even when auto-trigger is disabled.
For a suitable unrequested skill match, false asks once to run that skill or skip and execute directly,
then waits for the answer. Confirmation authorizes its scoped dependencies; Skip keeps direct execution
and required checks without re-asking for the same task. No match proceeds directly without a question.
Named requests and already authorized steps need no skill-choice question.
This runtime switch is model guidance, not a hard permission boundary.

Examples of automatic matches: “How do these .claude skills work?”, “What can I configure in this
.codex framework?”, “Disable heavy skill auto-trigger for me”, “Explain framework hooks”, and
“Which setting controls workflows?”. No file is changed by the questions.

## Closing Reminders

**Goal:** Explain framework options and apply only requested settings at their correct scope, with validated saved and effective results.
**MUST ATTENTION Route:** choose mode → discover keys/layers → answer or apply the requested change → validate/read back → report effective value/source. Keep questions read-only, preserve unrelated keys, and route project facts through project-config. Missing session identity limits persistence; configuration does not authorize heavy tasks or waive their gates.
