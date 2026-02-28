---
name: docs-init
version: 1.0.0
description: '[Documentation] Analyze the codebase and create initial documentation'
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI may ask user whether to skip.

## Quick Summary

**Goal:** Analyze the codebase and create initial documentation structure.

**Workflow:**
1. **Scout** -- Parallel codebase scouting to understand project structure
2. **Analyze** -- Identify key patterns, architecture, and documentation gaps
3. **Create** -- Generate initial documentation files

**Key Rules:**
- Use parallel subagents for initial codebase exploration
- Follow existing documentation patterns in docs/ directory
- Create structured docs, not raw dumps

## Phase 1: Parallel Codebase Scouting

**You (main agent) must spawn scouts** - subagents cannot spawn subagents.

1. Run `ls -la` to identify actual project directories
2. Spawn 2-4 `scout-external` (preferred, uses Gemini 2M context) or `scout` (fallback) via Task tool
3. Target directories **that actually exist** - adapt to project structure, don't hardcode paths
4. Merge scout results into context summary

## Phase 2: Documentation Creation (docs-manager Agent)

Pass the gathered file list to `docs-manager` agent to create initial documentation:

- `docs/project-overview-pdr.md`: Project overview and PDR (Product Development Requirements)
- `docs/codebase-summary.md`: Codebase summary
- `docs/code-standards.md`: Codebase structure and code standards
- `docs/system-architecture.md`: System architecture
- Update `README.md` with initial documentation (keep it under 300 lines)

Use `docs/` directory as the source of truth for documentation.

**IMPORTANT**: **Do not** start implementing.

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
