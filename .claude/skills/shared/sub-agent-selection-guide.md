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
| Performance analysis          | `performance-optimizer`    | N+1, query plans, bundle size, memory, RxJS, change detection |
| Database / migrations         | `database-admin`           | Schema, index impact, locking, replication, backup/restore    |
| E2E tests                     | `e2e-runner`               | Test generation, visual baselines, TC spec traceability       |
| Integration tests             | `integration-tester`       | Microservice test gen, TC traceability, CQRS test patterns    |
| Frontend UI/UX                | `ui-ux-designer`           | Component design, accessibility, responsive, design tokens    |
| Backend feature               | `backend-developer`        | .NET/backend implementation (CQRS, repos, events)             |
| Frontend feature              | `frontend-developer`       | Angular/React/Vue implementation                              |
| Parallel fullstack            | `fullstack-developer`      | Multi-file parallel phases with file ownership boundaries     |
| Git operations                | `git-manager`              | Commit, push, PR — conventional commits, hook enforcement     |
| Research                      | `researcher`               | Web research, library docs, technology evaluation             |
| Planning                      | `planner`                  | Implementation plans, trade-off analysis                      |
| Test running                  | `tester`                   | Test execution, failure analysis, coverage reports            |
| Debugging                     | `debugger`                 | Root cause investigation, log analysis, CI/CD failures        |
| Documentation                 | `docs-manager`             | Doc updates, doc-code sync, staleness detection               |
| Journal/retro                 | `journal-writer`           | Lessons, retrospectives, post-mortem logging                  |
| Product/backlog               | `product-owner`            | PBI, prioritization, sprint planning                          |
| Project status                | `project-manager`          | Progress tracking, cross-agent consolidation                  |
| QC/compliance                 | `qc-specialist`            | Quality gates, audit trails, compliance checklists            |
| Spec compliance               | `spec-compliance-reviewer` | Verify implementation matches spec (before code-reviewer)     |
| Codebase exploration          | `Explore`                  | Fast file/symbol search across large codebases                |
| Business analysis             | `business-analyst`         | Requirements, user stories, acceptance criteria               |
| Greenfield / inception        | `solution-architect`       | New project DDD modeling, tech stack selection                |
| Knowledge synthesis           | `knowledge-worker`         | Research synthesis, structured reports, market analysis       |

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
| Round 3+ | Post-fix re-verification                    | NEW fresh domain-specific agent each time             | ZERO memory            |
| Max      | 3 rounds                                    | Then escalate to user via `AskUserQuestion`           | —                      |

**Key rules:**

- NEVER reuse a sub-agent across rounds — every round spawns a NEW `Agent` call
- NEVER declare PASS after Round 1 alone — main agent rationalizes its own work
- Main agent READS sub-agent reports — NEVER filters or overrides findings

---

## Generic / Cross-Project Applicability

This guide is project-agnostic. All agent types are built into the Claude Code harness.
No project-specific configuration is needed — reference the correct `subagent_type` in `Agent` tool calls.

The skills harness enforces specialization via `## Sub-Agent Type Override` blocks in each SKILL.md.
Update those blocks — not this guide — when project-specific routing decisions differ.
