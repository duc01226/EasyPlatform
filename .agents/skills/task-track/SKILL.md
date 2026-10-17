---
name: task-track
description: '[Project Management] Use for explicit project-owned tracker guidance (--mode=guide), or portable-engine work records, placement, linked concerns, lifecycle, evidence, acceptance and local status. Existing engine modes and bare inspect remain supported.'
disable-model-invocation: true
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
## Quick Summary

**Goal:** Support the selected project's tracker conventions or the portable work engine through one
explicit entry point. Read only the selected route's reference before acting. These modes are
skill purposes, not CLI flags; never pass `--mode=guide` to the engine command.

| Invocation | Read and follow |
| --- | --- |
| `--mode=guide` | [Project guide](references/project-guide.md): discover the selected checkout's root-linked work-tracking instruction and use its documented mechanism |
| Bare invocation, or `--mode=inspect\|maintain\|link\|lifecycle\|verify\|accept\|report\|serve` | [Engine protocol](references/engine-protocol.md): preserve the bare `inspect` default and existing operation safeguards |
| Any other mode | Refuse without an operation |

Choose by the invocation, never by the presence of a tracker folder, root pointer or configured
engine. When both exist, explicit `guide` uses project instructions; an old mode still uses the
engine protocol. Project prohibitions and unsupported engine capabilities remain binding;
never switch routes to bypass a refusal. Guide mode does not initialize, enroll or migrate a
tracker, and does not require portable-engine configuration.

Honor the active host's Run/Skip and disabled-selection controls. This skill remains manual-only;
a named authorized invocation remains usable. Invocation supplies guidance, not permission for
assignment, acceptance, publication or other actions beyond the user's request.

## Project customization

For engine command recipes, read [manual operations](references/manual-operations.md) when the selected
engine route needs exact requests, placement or refusal recovery. Read [the integration guide](references/integration-guide.md)
when recording an actual saved producer checkpoint or interpreting exact linked concerns. These are
engine references; project-guide mode keeps the selected project's own guide and mechanism.

Read the selected checkout's root instructions (`CLAUDE.md` or `AGENTS.md`) when resolving its
work-tracking guide. The project owns its guide path, storage, lifecycle, placement, evidence,
acceptance and checks. Change those at the project owner; keep them out of this portable skill.
Additive project overlays may add steps, but cannot replace either route's requirements or waive
an authority or verification gate.

## Closing reminders

Select the route explicitly; read its reference before acting; preserve project rules and actual
human authority. Report only checks and outcomes observed.
