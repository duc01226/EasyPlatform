# Troubleshooting & Support

> Portable troubleshooting for the Claude Code enhancement framework. The `.claude/` directory is reusable; project-specific behavior comes from the adopting project's configuration and reference docs.

**MUST** identify the active host and required operation first. **MUST** distinguish a foreign-host tool name from a genuinely unavailable capability. **MUST** fix the owning source or configuration while preserving workflow gates; never disable a gate to hide an error.

## Quick Navigation

- [Start with context and setup](#start-with-context-and-setup)
- [Skills or workflows not discovered](#skills-or-workflows-not-discovered)
- [Hooks not running](#hooks-not-running)
- [Windows Git or Git Bash unavailable](#windows-git-or-git-bash-unavailable)
- [Bash goes silent](#bash-goes-silent)
- [Configuration not applied](#configuration-not-applied)
- [An edit or command is blocked](#an-edit-or-command-is-blocked)
- [Tests or tooling fail](#tests-or-tooling-fail)
- [Code graph unavailable or stale](#code-graph-unavailable-or-stale)
- [Generated docs or mirrors are stale](#generated-docs-or-mirrors-are-stale)
- [Getting help](#getting-help)

## Start with Context and Setup

Run diagnostics from the project root—the directory that contains `.claude/`.

1. Confirm the host tools are available:

    ```bash
    claude --version
    node --version
    git --version
    ```

    The framework requires Node.js 18 or newer. Code-graph features are optional and additionally require Python 3.10 or newer.

2. Run `/project-init`. It is the idempotent setup and re-evaluation entry point for project configuration, reference docs, root instructions, and optional graph setup.

3. Check the generated project context:
    - `docs/project-config.json` describes the current project.
    - The project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path — contains project-specific patterns and conventions.
    - `CLAUDE.md` contains the project instructions used by Claude Code.
    - `AGENTS.md` and `.codex/` are relevant when Codex compatibility is enabled.

4. If a warning says that context is missing or stale, rerun `/project-init`. Use a targeted `/scan --target=<key>` when only one reference document is outdated.

The portability boundary is intentional:

| Reusable framework assets                                                                                             | Project-owned context                                                               |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `.claude/skills/`, `.claude/agents/`, `.claude/hooks/`, `.claude/workflows/`, `.claude/scripts/`, and `.claude/docs/` | `docs/project-config.json`, `docs/project-reference/`, `CLAUDE.md`, and `AGENTS.md` |

Do not copy project-owned context from one project into another. Regenerate it with `/project-init` instead.

## Skills or Workflows Not Discovered

### A discovered skill reports that the `Skill` tool is missing

Check the active host before diagnosing an installation problem. Codex executes a loaded skill's instructions with its available tools; it does not require Claude Code's separately named `Skill` tool. Read the registered `.agents/skills/<name>/SKILL.md` when executing a Codex skill. Reading `.claude/**` to inspect canonical source does not change the active host.

Continue through the host-native execution path when the required operation is available. Ask for help only when an actual capability is missing, naming the required step and the failed capability check. Keep every workflow gate and authority boundary intact. Read `.claude/docs/skills/README.md` when distinguishing skill loading from execution.

### A skill is missing or has stale metadata

1. Confirm the skill directory contains a `SKILL.md` entry point:

    ```text
    .claude/skills/<skill-name>/SKILL.md
    ```

2. Ask `/framework-config --mode=help` for the current command and skill catalog.

3. If the catalog is stale, regenerate it from the project root. The catalog scripts need PyYAML, which is declared in `.claude/scripts/requirements.txt`. If PyYAML is missing, the script stops and prints the install command for the interpreter that ran it, for example `python3 -m pip install -r .claude/scripts/requirements.txt`. On Windows it prints the command for PowerShell. If that interpreter is externally managed (PEP 668: uv, Homebrew and recent Debian or Ubuntu Pythons), pip refuses to install into it, so the script instead prints how to create the framework's shared virtual environment at `tmp/claude-temp/.venv`, install into it, and put it first on `PATH`. The hook tests look up `python` (then `py -3`) on `PATH`, so they need that environment first on `PATH` too.

    ```bash
    # Windows
    py -3 .claude/scripts/generate_catalogs.py --skills

    # macOS/Linux
    python3 .claude/scripts/generate_catalogs.py --skills
    ```

4. Restart the Claude Code session after adding or copying skills.

### A workflow is not selected

Workflow selection is model-driven. Check that `.claude/workflows.json` exists and is valid, then use the explicit skill or `/start-workflow <workflow-id>` when you need deterministic routing.

Validate the workflow catalog with:

```bash
node -e "JSON.parse(require('fs').readFileSync('.claude/workflows.json', 'utf8')); console.log('workflows.json OK')"
```

If the workflow catalog or project instructions are stale, run `/project-init` and restart the session.

If the route gate arrives as a short preview, the route output is past the 10,000 characters a host shows in full: its second line says so and names the size that fits. Shorten `portability.workflowRouteProtocol` to about 3,300 characters or fewer.

## Hooks Not Running

Hook registrations live in `.claude/settings.json`, and registered commands resolve the project root through `CLAUDE_PROJECT_DIR`.

### Codex desktop hooks fail with exit code 127

If the error says `node: command not found`, Node is missing from the desktop process's
environment even when it works in Terminal. A GUI app does not necessarily inherit the
terminal's version-manager setup.

Regenerate the Codex hook mirror from the canonical framework:

```bash
node .claude/scripts/codex/sync-hooks.mjs
```

Project-root Node hooks use a self-contained `/bin/sh` bootstrap on macOS and Linux.
It checks `CK_NODE_PATH` first, then `PATH`, Volta/asdf/mise shims, NVM's default, and
Homebrew/system Node locations. Discovery preserves stdin, suppresses manager initialization
output, and prepends the selected executable's directory to the hook's `PATH` for child
processes. It never sources shell profiles or installs a runtime. Configure NVM's default
with `nvm alias default <installed-version>` if needed. An invalid explicit `CK_NODE_PATH`
fails with an actionable error rather than silently selecting another runtime.

Windows uses Codex's `commandWindows` override and retains the native `node -e` launcher;
Node must be installed and available in the app's Windows `PATH`. WSL uses the Linux
bootstrap and a Linux Node installation. Custom non-project hook commands keep their
authored behavior and must arrange their own runtime.

For a custom POSIX installation, set `CK_NODE_PATH` to the Node executable in the app's
environment. Do not put a developer's home directory or version-specific runtime path in
tracked hook configuration. After regeneration, review/trust the changed hook definitions
in Codex's Hooks settings and reopen the session if the host has not reloaded them.
The `commandWindows` override is documented in the [official Codex hook reference](https://learn.chatgpt.com/docs/hooks).

### Check the registration and hook file

```bash
node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json', 'utf8')); console.log('settings.json OK')"
node --check .claude/hooks/<hook-name>.cjs
```

Confirm that:

- The hook file named by the registration exists under `.claude/hooks/`.
- The registration uses the correct Claude Code event and matcher.
- The command points into the current project's `.claude/hooks/` directory.
- The session was restarted after changing settings.

A session-start warning `Hook registration incomplete in .claude/settings.json` means the settings register one entry of a hook set without the other: for the workflow route, `workflow-route-inject.cjs` (the gate) without `workflow-catalog-inject.cjs` (the catalog), or the reverse. This is the usual result of keeping a settings file across a framework upgrade that added an entry. Copy the missing entry from the framework's `.claude/settings.json` under the same event, run `/sync-codex`, and restart the session.

### Run the framework test suites

```bash
# Primary hook tests
node .claude/hooks/tests/test-all-hooks.cjs

# Aggregate hook and discovered-suite tests
node .claude/hooks/tests/run-all-tests.cjs
```

To exercise one hook directly, provide the JSON event payload it expects. For example:

```bash
# POSIX shells
printf '%s\n' '{"hook_event_name":"SessionStart"}' | node .claude/hooks/session-init.cjs

# PowerShell
'{"hook_event_name":"SessionStart"}' | node .claude/hooks/session-init.cjs
```

Read [hooks/README.md](./hooks/README.md) for the event table, registration rules, safety gates, and test-runner details.

## Windows Git or Git Bash Unavailable

The portable Windows capability check is owned by the same integrity-first
`verify-install.cjs` SessionStart hook. It probes existing Git-for-Windows before
attempting repair and requires a native Git root with `git.exe`, `git-bash.exe`,
and a working `bash.exe` beneath that root. A WSL/System32 `bash.exe` or a
Windows App Execution Alias is not Git Bash for this contract.

Repair is attempted only for an explicit `startup` event. When the capability is
missing, broken, or incomplete, the hook validates a trusted App Installer/WinGet
binary and may start one detached, bounded worker for the fixed `Git.Git`
package. `resume`, `clear`, and `compact` only probe; they never launch repair.
If WinGet/App Installer, UAC, policy, ACL, or process creation cannot be proved
safe, the hook reports a fixed advisory outcome and leaves the host unchanged.
The next startup probes again, so a repaired installation does not require a
second installer path.

The resulting `PATH` prefix and `CK_GIT_EXE`, `CK_GIT_BASH_EXE`, and
`CK_GIT_BASH_PATH` values are child/session-local. They make Git and Git Bash
available to hooks or manager children that the framework launches; they cannot
change the already-running PowerShell/cmd parent. A healthy native installation
therefore produces no repair diagnostic even if the parent shell's `bash` name
still resolves to another provider.

Optional policy is `hooks.windowsGit.enabled` and `hooks.windowsGit.autoRepair`.
Both default to `true`; `enabled: false` disables integration and repair, while
`autoRepair: false` keeps the read-only probe. An invalid project config skips
repair but does not disable `.claude` integrity verification. PortableGit and
generic installer fallbacks are intentionally not part of this automatic path.

To exercise the path without changing the machine, run the focused suite:

```text
node .claude/hooks/tests/run-all-tests.cjs --filter=windows-git --verbose
```

If the startup capability or dependency install appears stuck, do not delete a
lock because of its age. The lock is outside the project and is reclaimable only
when its recorded canonical root, host, PID/process-start identity, descendant
state, and owner token still match and positive evidence proves every owner
process is dead. If any part of that proof is unavailable, leave the lock in
place and retry at a later startup; the runner fails closed rather than starting
a duplicate manager or repair worker.

## Bash Goes Silent

If every Bash call suddenly returns no output and exit 0, while a deliberately failing probe such as
`exit 7` also reports 0, treat that as a hook/dispatcher incident—not as a successful command. The
framework cannot reproduce or repair a private Claude Code dispatcher process from inside the project,
but the Bash hook chain can now identify its own decision and failure paths.

1. Start a fresh session first. Hook and shell state is process/session scoped; a fresh Claude Code
   session reinitializes the Bash process. If the symptom returns, continue the checks below.
2. Enable the opt-in trace for that session:

    ```powershell
    $env:CLAUDE_HOOK_DEBUG = '1'
    $env:CLAUDE_PROJECT_DIR = (Get-Location).Path
    ```

    The trace is one JSON record per Bash-path hook at the platform temp path
    `ck/debug/bash-hooks.log` (override it with `CLAUDE_HOOK_DEBUG_LOG`). It records hook, decision,
    exit code, duration, and error classification, but never command/path contents.

3. Bisect the two Bash registrations in `.claude/settings.json` by feeding the same benign payload to each
   hook. A normal result is exit 0 with empty stdout/stderr. Run the following from PowerShell:

    ```powershell
    $payload = '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"echo hi"}}'
    $payload | node .claude/hooks/doc-sync-gate.cjs
    $LASTEXITCODE
    ```

    Repeat for `review-commit-gate.cjs`. An error must be visible; gate evaluation errors
    intentionally exit 2. From a POSIX shell, use the same payload with:

    ```bash
    payload='{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"echo hi"}}'
    printf '%s\n' "$payload" | node .claude/hooks/doc-sync-gate.cjs
    printf 'exit=%s\n' "$?"
    ```

4. If the hook probes are healthy but Claude Bash is still silent, temporarily disable only the Bash
   registrations. First make a recoverable backup, then edit `.claude/settings.json` as follows:

    ```powershell
    Copy-Item .claude/settings.json .claude/settings.json.bash-silent-backup -Force
    ```

    Remove the one PreToolUse group whose matcher is exactly `Bash` (it contains two hooks). Leave
    the other groups intact: `AskUserQuestion` notification and `Write|Edit|MultiEdit` doc-sync warning.
    Restore the backup immediately after the incident:

    ```powershell
    Copy-Item .claude/settings.json.bash-silent-backup .claude/settings.json -Force
    ```

    Restart Claude Code after either edit; hook settings are loaded at session start. A fresh session also
    recreates the session-scoped Bash/dispatcher path and is the normal recovery when the failure is
    external to the framework.

The regression suite for this path is:

```text
node .claude/hooks/tests/run-all-tests.cjs --filter=bash-hook-contract --verbose
```

If a fresh session restores Bash, preserve the debug log and report the first hook decision/error plus
the Claude Code version. If no hook emits a block/error, include the exact `exit 7` probe and session
boundary in the report—the framework hooks cannot account for a dispatcher-level silent success.

## Configuration Not Applied

Check the configuration surface that owns the behavior:

| File                          | Owns                                                      |
| ----------------------------- | --------------------------------------------------------- |
| `.claude/settings.json`       | Claude Code settings and hook registrations               |
| `.claude/settings.local.json` | Local, uncommitted overrides when present                 |
| `.claude/.ck.json`            | Framework options such as output style and assertions     |
| `.claude/workflows.json`      | Workflow definitions and sequences                        |
| `docs/project-config.json`    | Project paths, tools, patterns, and reference-doc routing |

Validate the required JSON files together:

```bash
node -e "for (const f of ['.claude/settings.json', '.claude/.ck.json', '.claude/workflows.json', 'docs/project-config.json']) { JSON.parse(require('fs').readFileSync(f, 'utf8')); console.log(f + ' OK') }"
```

Then:

1. Check `.claude/settings.local.json` for a local override if the behavior differs between machines.
2. Confirm that the setting name belongs to the file you edited; similarly named settings are not interchangeable.
3. Restart Claude Code so session-start configuration is loaded again.
4. Run `/project-init` if the issue involves project paths, generated reference docs, root instructions, or graph configuration.

See [configuration/README.md](./configuration/README.md) for precedence and file-specific options.

## An Edit or Command Is Blocked

Blocking is expected when a safety gate detects a risky target or command. Use the message emitted by the gate to identify the cause:

| Gate                     | Typical cause                                            | Safe next check                                                      |
| ------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------- |
| `review-commit-gate.cjs` | A commit was attempted without a review fix-loop receipt | Review the intended candidate, then use the explicit commit workflow |

Do not disable a safety gate globally to bypass one blocked operation. Confirm the target, reduce the scope, or correct the command first.

## Tests or Tooling Fail

Start with the smallest relevant check:

```bash
node --version
node .claude/hooks/tests/test-all-hooks.cjs
```

If the primary suite passes but the aggregate suite fails, rerun the affected suite with the runner's filter and verbose options:

```bash
node .claude/hooks/tests/run-all-tests.cjs --filter=<suite-name> --verbose
```

For catalog or graph scripts, use the Python command appropriate to the host. On Windows, use `py -3`; on macOS/Linux, use `python3`. Keep the working directory at the project root so relative `.claude/` and `docs/` paths resolve correctly.

When reporting a failure, include the first error, the command, the current directory, and the relevant tool versions. Redact tokens, keys, credentials, and other sensitive values.

## Code Graph Unavailable or Stale

The code graph is optional. Skills and hooks continue to work without it, with less structural context.

### Check graph status

```bash
# Windows
py -3 .claude/scripts/code_graph status --json

# macOS/Linux
python3 .claude/scripts/code_graph status --json
```

### Build or resynchronize the graph

```bash
# Windows
py -3 .claude/scripts/code_graph build --json
py -3 .claude/scripts/code_graph sync --json

# macOS/Linux
python3 .claude/scripts/code_graph build --json
python3 .claude/scripts/code_graph sync --json
```

If Python dependencies are missing, follow [code-graph-setup.md](./code-graph-setup.md). If project configuration is not populated, run `/project-init` before building the graph.

## Generated Docs or Mirrors Are Stale

Some files are generated from canonical sources. Fix the source and then run the appropriate synchronization command; do not hand-edit a generated mirror and expect it to persist.

| Symptom                                              | Recovery                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| Skill catalog does not match `.claude/skills/`       | Run `generate_catalogs.py --skills`                                |
| Project reference docs are missing or generic        | Run `/project-init` or the relevant `/scan --target=<key>`         |
| `CLAUDE.md` sections are stale                       | Run `/ai-context-refresh` through the project setup route          |
| `AGENTS.md` or `.codex/` differs from Claude sources | Run `/sync-codex` after updating the canonical Claude-side sources |
| Graph state does not match the current checkout      | Run the graph `sync` command or `/graph-code --mode=build`                     |

When stale guidance names a consumer project, first verify whether the problem is in project-owned context (`docs/project-config.json`, `docs/project-reference/`, or generated root instructions) rather than in the portable `.claude/` framework.

## Getting Help

Start with the reference that owns the problem:

- [Universal setup guide](./universal-setup-guide.md) for adoption and project initialization.
- [Hooks reference](./hooks/README.md) for lifecycle events, registrations, gates, and tests.
- [Configuration reference](./configuration/README.md) for settings and precedence.
- [Code graph setup](./code-graph-setup.md) for optional graph prerequisites and commands.
- [AI debugging protocol](./AI-DEBUGGING-PROTOCOL.md) for evidence-based investigation.

Before asking for help, collect:

1. The command or prompt that failed.
2. The project-root path, operating system, and tool versions.
3. The first diagnostic or stack trace, including the command's exit code.
4. Whether `/project-init` and the relevant test command have been run.

Never include secrets in a report.

_Source: portable framework documentation and the linked authoritative references._

## Closing Reminders

**MUST** identify the active host, capture the first failure and use the owning diagnostic route. **MUST** use available native capabilities; reading `.claude/**` source never changes hosts. **MUST** preserve gates, repair canonical source or project configuration and regenerate stale mirrors; evidence an actual unavailable capability before reporting a blocker.
