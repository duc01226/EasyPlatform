# Sub-Agent Selection Guide

> **Purpose:** Canonical routing contract for the Claude Code skills harness.
> When a skill spawns a sub-agent, consult this guide to select the correct agent type.
> Prevents the `code-reviewer` catch-all antipattern that dilutes specialized analysis quality.

---

## Sub-Agent Decision Table

| Domain                        | Sub-agent type             | Key specialization                                            |
| ----------------------------- | -------------------------- | ------------------------------------------------------------- |
| Code review (general quality) | `code-reviewer`            | Patterns, conventions, code smells, SOLID                     |
| Architecture review           | `architect`                | Cross-service, ADR creation, system-level security/perf       |
| Security audit                | `security-auditor`         | OWASP, auth flows, injection, CVE, microservices boundaries   |
| AI-feature review (plan or code) | `ai-engineering-reviewer` | LLM calls, prompts, agents, RAG, tool use / MCP, evals, guardrails, cost, safety — spawn ONLY when `node .claude/scripts/ai-signal-scan.cjs --base <review base>` reports `status: surface` (`clean` skips; `unknown` → fallback search or run) or the plan adds one |
| Performance analysis          | `performance-optimizer`    | N+1, query plans, bundle size, memory, RxJS, change detection |
| Database / migrations         | `database-admin`           | Schema, index impact, locking, replication, backup/restore    |
| E2E tests                     | `e2e-runner`               | Test generation, visual baselines, TC spec traceability       |
| Integration tests             | `integration-tester`       | Microservice test gen, TC traceability, CQRS test patterns    |
| Frontend UI/UX                | `ui-ux-designer`           | Component design, accessibility, responsive, design tokens    |
| Backend feature †             | `backend-developer`        | Configured backend implementation (CQRS, repos, events)       |
| Frontend feature †            | `frontend-developer`       | Configured frontend implementation                            |
| Parallel fullstack            | `fullstack-developer`      | Multi-file parallel phases with file ownership boundaries     |
| Git operations                | `git-manager`              | Commit, push, PR — conventional commits, hook enforcement     |
| Research                      | `researcher`               | Web research, library docs, technology evaluation             |
| Planning                      | `planner`                  | Implementation plans, trade-off analysis                      |
| Test running                  | `tester`                   | Test execution, failure analysis, coverage reports            |
| Debugging                     | `debugger`                 | Root cause investigation, log analysis, CI/CD failures        |
| Documentation                 | `docs-manager`             | Doc updates, doc-code sync, staleness detection               |
| Journal/retro                 | `journal-writer`           | Lessons, retrospectives, post-mortem logging                  |
| Spec compliance               | `spec-compliance-reviewer` | Verify implementation matches spec (before code-reviewer)     |
| Codebase exploration (internal) | `/investigate`                  | Main-session file/symbol search with graph-backed tracing |
| Codebase exploration (delegated) | `researcher`         | Read-only landscape research in a scoped report |
| Greenfield / inception        | `solution-architect`       | New project DDD modeling, tech stack selection                |
| Knowledge synthesis †         | `knowledge-worker`         | Research synthesis, structured reports, market analysis       |

> **† Dormant routing target** — agent is defined under `.claude/agents/` but **no skill currently hard-dispatches it** (grep-verified 2026-06-16: these names appear only here, or in prose, never as a spawned `subagent_type`). Until a skill wires them, route the work via the role's same-name `/`-skill, or the listed generalist — `fullstack-developer` (backend/frontend feature) · `researcher` (knowledge synthesis). Rows are retained as available targets (not deleted) so the routing contract stays complete; consolidation may remove them once their roles are confirmed skill-only.

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
| AI-feature plan or diff (model calls, prompts, agents, RAG, tools) reviewed by `code-reviewer` | Switch to `ai-engineering-reviewer` |
| Performance Round 1 running in main context only  | Spawn `performance-optimizer` as Round 1 proactive lead |

---

## Routing Decision Flow

1. **Identify domain** of the task (see decision table above)
2. **Check for `## Sub-Agent Type Override`** section in the skill's SKILL.md
3. **If override exists** → use the specified `subagent_type` — do NOT revert to `code-reviewer`
4. **If no override** → consult this table, select the domain-specific agent
5. **Default to `code-reviewer`** ONLY when domain = "general code quality" with no specialized context

---

## Round Structure for Quality Loops

| Round    | Purpose                                     | Agent                                                 | Memory                 |
| -------- | ------------------------------------------- | ----------------------------------------------------- | ---------------------- |
| Round 1  | Proactive analysis or main-session analysis | Domain-specific agent (e.g., `performance-optimizer`) | —                      |
| Round 2  | Challenge / fresh eyes                      | NEW fresh domain-specific agent                       | ZERO memory of Round 1 |
| Round 2  | Post-fix re-verification                    | NEW fresh domain-specific agent                       | ZERO memory            |
| Max      | 2 rounds                                    | Then escalate to user via `ask user question tool`           | —                      |

**Key rules:**

- NEVER reuse a sub-agent across rounds — every round spawns a NEW `Agent` call
- Clean Round 1 ENDS the review. When issues found, fix → fresh sub-agent re-review (main agent rationalizes its own work; fresh eyes catch dismissed findings).
- Main agent READS sub-agent reports — NEVER filters or overrides findings

---

## Generic / Cross-Project Applicability

This guide is project-agnostic in structure. **Most agent types are project-defined custom agents shipped with this framework under `.claude/agents/`** — only `Explore`, `Plan`, and `general-purpose` are built into the Claude Code harness. Reference the correct `subagent_type` in `Agent` tool calls; the custom agents must be present in `.claude/agents/` for their `subagent_type` to resolve.

The skills harness enforces specialization via `## Sub-Agent Type Override` blocks in each SKILL.md.
Update those blocks — not this guide — when project-specific routing decisions differ.
