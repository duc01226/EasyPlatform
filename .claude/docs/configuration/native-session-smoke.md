# Native session smoke check

Read this guide when changing framework runtime or native skill visibility. Use fresh Claude and
Codex processes: inherited authoring context can conceal a discovery failure. One session per host
is the minimum comparison; a mode or invocation-policy change needs another fresh session.

## Isolation

Prepare separate disposable Git repositories under the workspace `tmp/`, copying the changed branch's
framework source and generated host files. Omit ignored runtime state and credentials. Keep these
fixtures separate from the branch's Git history and any real remote. Use the host's configured model.
For deterministic native-loader probes, use isolated host configuration directories. For authenticated
model probes, use existing host authentication without copying or displaying credentials.

Read `.claude/config/README.md#codex-trust-entries` before a Codex write-capable probe; prefer read-only
probes and capture only task-relevant results. Do not grant hook trust or wider tool permissions merely
to get a green result. Missing authentication, trust or host capabilities is an explicit test limitation.

## Cases and evidence

| Case | Expected evidence |
| --- | --- |
| `quiet` | Context-producing hooks emit nothing; review gate remains active. Native skill profile is unchanged. |
| An ordinary feature request | Manual-only workflow entry is not automatically invoked. Use a harmless canary body in the disposable fixture to observe discovery without starting real delivery. |
| Explicit manual-only skill request | Native loader runs the named canary and returns its marker. |
| `off` via the CLI | Framework skills disappear from Claude's native command/catalog list; Codex `skills/list` reports the framework paths disabled. Built-ins and unrelated skills retain their policy. |
| Restore `quiet` / `on` | Previous manual-only entries and callable review/configuration dependencies return. |
| Requested commit review selection | The real policy helper selects `commit-review`, at most two rounds, for default low and high risk. `risk-based` restores tier selection; PR selection stays independent. |
| Commit/push prompting | Inspect actual tool/permission events in a disposable local-only Git fixture. A policy-helper result alone does not prove absence of a native approval dialog. |

Capture native command lists or loader metadata and JSON tool events, alongside the exact installed
host versions, mode and fixture paths. An absent invocation in one stochastic model response is only
a smoke result; native discovery metadata and regression tests are stronger evidence for the setting.
Never report an unexecuted Git or live-model scenario as passing. Store logs under `tmp/reports/`.

## Limits

These switches do not remove ordinary project instructions, personal plugins, host-managed rules or
repository/CI checks. The native off adapter currently targets Claude and Codex. Global reconciliation
covers registered checkouts; new copies need `node .claude/scripts/framework-mode.cjs apply`.

Use fresh sessions, preserve external settings, and distinguish loader evidence from model behavior.
