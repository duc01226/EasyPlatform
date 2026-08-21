# Sub-Agent Selection Guide

> **Purpose:** Canonical routing contract for the Claude Code skills harness.
> When a skill spawns a sub-agent, consult this guide to select the correct agent type.
> Prevents the `code-reviewer` catch-all antipattern that dilutes specialized analysis quality.

---

## Sub-Agent Decision Table

| Domain                          | Sub-agent type             | Key specialization                                                            |
| ------------------------------- | -------------------------- | ----------------------------------------------------------------------------- |
| Code review (general quality)   | `code-reviewer`            | Patterns, conventions, code smells, SOLID                                     |
| Architecture review             | `architect`                | Cross-service, ADR creation, system-level security/perf                       |
| Security audit                  | `security-auditor`         | OWASP, auth flows, injection, CVE, microservices boundaries                   |
| Performance analysis            | `performance-optimizer`    | N+1, query plans, bundle size, memory, RxJS, change detection                 |
| Database / migrations           | `database-admin`           | Schema, index impact, locking, replication, backup/restore                    |
| E2E tests                       | `e2e-runner`               | Test generation, visual baselines, TC spec traceability                       |
| Integration tests               | `integration-tester`       | Microservice test gen, TC traceability, CQRS test patterns                    |
| Frontend UI/UX                  | `ui-ux-designer`           | Component design, accessibility, responsive, design tokens                    |
| Backend feature †               | `backend-developer`        | Configured backend implementation (CQRS, repos, events)                       |
| Frontend feature †              | `frontend-developer`       | Configured frontend implementation                                            |
| Parallel fullstack              | `fullstack-developer`      | Multi-file parallel phases with file ownership boundaries                     |
| Git operations                  | `git-manager`              | Commit, push, PR — conventional commits, hook enforcement                     |
| Research                        | `researcher`               | Web research, library docs, technology evaluation                             |
| Planning                        | `planner`                  | Implementation plans, trade-off analysis                                      |
| Test running                    | `tester`                   | Test execution, failure analysis, coverage reports                            |
| Debugging                       | `debugger`                 | Root cause investigation, log analysis, CI/CD failures                        |
| Documentation                   | `docs-manager`             | Doc updates, doc-code sync, staleness detection                               |
| Journal/retro                   | `journal-writer`           | Lessons, retrospectives, post-mortem logging                                  |
| Product/backlog †               | `product-owner`            | PBI, prioritization, sprint planning                                          |
| Project status                  | `project-manager`          | Progress tracking, cross-agent consolidation                                  |
| Spec compliance                 | `spec-compliance-reviewer` | Verify implementation matches spec (before code-reviewer)                     |
| Codebase exploration (internal) | `scout`                    | Parallel file/symbol search WITH graph CLI + Bash (`.claude/agents/scout.md`) |
| Codebase exploration (external) | `scout-external`           | Same, via external CLIs (Gemini, OpenCode) — `--ext` / `--engine=external`    |
| Business analysis †             | `business-analyst`         | Requirements, user stories, acceptance criteria                               |
| Greenfield / inception          | `solution-architect`       | New project DDD modeling, tech stack selection                                |
| Knowledge synthesis †           | `knowledge-worker`         | Research synthesis, structured reports, market analysis                       |

> **† Dormant routing target** — agent is defined under `.claude/agents/` but **no skill currently hard-dispatches it** (grep-verified 2026-06-16: these names appear only here, or in prose, never as a spawned `agent_type`). Until a skill wires them, route the work via the role's same-name `/`-skill, or the listed generalist — `fullstack-developer` (backend/frontend feature) · `researcher` (knowledge synthesis). Rows are retained as available targets (not deleted) so the routing contract stays complete; consolidation may remove them once their roles are confirmed skill-only.

---

## Anti-Pattern: The code-reviewer Catch-All

**NEVER** use `code-reviewer` as default for specialized domains:

| Symptom                                           | Correct fix                                             |
| ------------------------------------------------- | ------------------------------------------------------- |
| Architecture review spawning `code-reviewer`      | Switch to `architect`                                   |
| Security review Round 2 spawning `code-reviewer`  | Switch to `security-auditor`                            |
| Migration review spawning `code-reviewer`         | Switch to `database-admin`                              |
| E2E test generation delegating to `code-reviewer` | Switch to `e2e-runner`                                  |
| Integration test audit spawning `code-reviewer`   | Switch to `integration-tester`                          |
| Performance Round 1 running in main context only  | Spawn `performance-optimizer` as Round 1 proactive lead |

---

## Parallel Dispatch

> **Second half of the routing contract.** The decision table answers _which_ agent type; this section answers _how many at once, and in what grouping_.
> Canonical rules: `SYNC:parallel-subagent-dispatch` in `.claude/skills/shared/sync-inline-versions.md`. Sequential-by-default is a defect — independent tasks with disjoint write targets MUST run concurrently.

### Wave Partitioning

| Step | Action                                                                                                                                                                                                          |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Tag every task `PAR` or `SEQ`.** `PAR` = its inputs exclude every pending task's output AND its write set is disjoint from every other `PAR` task. Every `SEQ` task names the specific dependency forcing it. |
| 2    | **Group `PAR` tasks into waves.** A wave holds tasks with no dependency edge between them. Two writers of the same file NEVER share a wave.                                                                     |
| 3    | **Read-only work parallelizes freely** — search, investigation, review, research, scans carry no write set, so wave width is bounded only by usefulness.                                                        |
| 4    | **Declare the plan before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.                                                                                                  |
| 5    | **Spawn each wave in ONE message** — every `spawn_agent` call in a single response, each member routed through the decision table above.                                                                        |
| 6    | **Barrier per wave** — advance only after EVERY member returns; a skipped conditional member counts as returned. Merge results, mark each task completed/skipped, THEN dispatch the next wave.                  |
| 7    | **One level deep** — a dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.                            |

### Worked Example — Review Fan-Out (live precedent)

`workflow-review-changes` is the canonical wave partition in this repo: it declares its waves as `parallelGroups` in `.claude/workflows.json:358-379`, and fixes the member → `agent_type` mapping in that workflow's `preActions.injectContext` (`.claude/workflows.json:381`).

Wave 1 (`initial-reviews`, `barrier: true`) — `changes-review` plus `why-review --target=whole-review-target`, which consumes no step-1 output. Wave 2 (`reviewers`, `barrier: true`) is the fan-out: seven review steps across six specialist agent types, spawned together, never serialized.

| Wave-2 member                 | Sub-agent type          | Dispatch condition                                        |
| ----------------------------- | ----------------------- | --------------------------------------------------------- |
| `architecture-review`         | `architect`             | Always                                                    |
| `security-review`             | `security-auditor`      | Always                                                    |
| `performance-review`          | `performance-optimizer` | Always                                                    |
| `integration-test-review`     | `integration-tester`    | Always                                                    |
| `production-readiness-review` | `code-reviewer`         | Always — read-only findings/score mode in the batch       |
| `domain-entities-review`      | `code-reviewer`         | **Conditional** — only when domain entity files changed   |
| `ui-review`                   | `ui-ux-designer`        | **Conditional** — only when frontend/UI files are in diff |

Why one wave: all seven are read-only, share no mutable state, and none consumes another's output — so the only cost of serializing them is context burned absorbing each inline report.

**Conditional members** listed in `conditionalMembers` (`.claude/workflows.json:376`) are **skipped entirely — not spawned** when their trigger files are absent, and a skipped member **counts as "returned"** for the barrier. The barrier is not "all spawned agents returned"; it is "every member is either returned or skipped".

**Mutating steps wait for the barrier.** `code-simplifier` modifies code and must operate on the consolidated review snapshot, so it starts only after every wave-2 member has returned or been skipped.

### Parallel-Safety Checklist (run before spawning a wave)

| Check                    | Requirement                                                                                                                                                                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Disjoint write sets      | No two members write the same file. Read-only members trivially pass.                                                                                                                                                                                                                     |
| No output dependency     | No member consumes another member's output — such a task is `SEQ` and belongs in a later wave.                                                                                                                                                                                            |
| Self-contained brief     | Each member gets: goal · exact scope + owned files · reference docs to read · a **unique exact artifact** path · return contract (summary + `Full report:` path, per `SYNC:subagent-return-contract`) · incremental persistence to `plans/reports/` (per `SYNC:incremental-persistence`). |
| Specialist routing       | Every member routed via the decision table above — never `code-reviewer` as a catch-all.                                                                                                                                                                                                  |
| Barrier before next wave | Next wave dispatches only after every member returns or is skipped, findings merged, tasks marked.                                                                                                                                                                                        |
| Mutating steps deferred  | Code-mutating or state-mutating steps run after the barrier, never inside the wave.                                                                                                                                                                                                       |

### Anti-Pattern: Serialized or Mis-Grouped Dispatch

**NEVER** collapse an independent batch into a sequence, and never widen a wave past its dependency edges:

| Symptom                                                           | Correct fix                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Independent review batch run one reviewer at a time               | One wave, all members spawned together — serializing burns context absorbing each inline report   |
| One `spawn_agent` call per turn until the batch is drained        | All `spawn_agent` calls for the wave in a SINGLE message                                          |
| Two sub-agents assigned the same file to write                    | Split by owned files, or move one to the next wave — a shared write target is `SEQ`               |
| Sub-agent fans out its own wave instead of executing its brief    | Fan-out stays with the orchestrator; sub-agent executes its brief one level deep                  |
| Step parallelized while its input is a pending step's output      | Tag it `SEQ`, name the producing step, dispatch it after that step's barrier                      |
| Conditional member spawned with an empty scope "for completeness" | Skip it entirely when its trigger files are absent — a skipped member still satisfies the barrier |
| Next wave started while one member is still running               | Honor the all-return barrier — merge findings, mark tasks, then dispatch                          |

### When NOT to Parallelize

| Condition                   | Reason                                                                        |
| --------------------------- | ----------------------------------------------------------------------------- |
| Shared write target         | Concurrent writers to one file clobber each other — sequence them             |
| Output-consuming dependency | A task needing a pending task's result cannot start early                     |
| Trivial single-file work    | Dispatch + briefing overhead exceeds the gain — do it inline                  |
| Workflow-fixed ordering     | A `sequence` the workflow explicitly orders is not reorderable by convenience |
| Gate awaiting user approval | Approval gates block the wave; nothing downstream dispatches until cleared    |

---

## Routing Decision Flow

1. **Identify domain** of the task (see decision table above)
2. **Check for `## Sub-Agent Type Override`** section in the skill's SKILL.md
3. **If override exists** → use the specified `agent_type` — do NOT revert to `code-reviewer`
4. **If no override** → consult this table, select the domain-specific agent
5. **Default to `code-reviewer`** ONLY when domain = "general code quality" with no specialized context

---

## Round Structure for Quality Loops

| Round    | Purpose                                     | Agent                                                 | Memory                 |
| -------- | ------------------------------------------- | ----------------------------------------------------- | ---------------------- |
| Round 1  | Proactive analysis or main-session analysis | Domain-specific agent (e.g., `performance-optimizer`) | —                      |
| Round 2  | Challenge / fresh eyes                      | NEW fresh domain-specific agent                       | ZERO memory of Round 1 |
| Round 3+ | Post-fix re-verification                    | NEW fresh domain-specific agent each time             | ZERO memory            |
| Max      | 3 rounds                                    | Then escalate to user by asking the user directly     | —                      |

**Key rules:**

- NEVER reuse a sub-agent across rounds — every round spawns a NEW `spawn_agent` call
- Clean Round 1 ENDS the review. When issues found, fix → fresh sub-agent re-review (main agent rationalizes its own work; fresh eyes catch dismissed findings).
- Main agent READS sub-agent reports — NEVER filters or overrides findings

---

## Generic / Cross-Project Applicability

This guide is project-agnostic in structure. **Most agent types are project-defined custom agents shipped with this framework under `.claude/agents/`** — only `Explore`, `Plan`, and `general-purpose` are built into the Claude Code harness. Reference the correct `agent_type` in `spawn_agent` tool calls; the custom agents must be present in `.claude/agents/` for their `agent_type` to resolve.

The skills harness enforces specialization via `## Sub-Agent Type Override` blocks in each SKILL.md.
Update those blocks — not this guide — when project-specific routing decisions differ.
