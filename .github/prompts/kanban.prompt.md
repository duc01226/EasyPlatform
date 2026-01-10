---
description: "View and manage plans with kanban dashboard"
---

# Kanban Dashboard

Visual dashboard for plans and task management.

## Usage

- `kanban` - View dashboard for `./plans` directory
- `kanban plans/` - View specific directory
- `kanban --stop` - Stop running server

## Features

- Plan cards with progress bars
- Phase status breakdown (completed, in-progress, pending)
- Timeline visualization
- Activity tracking
- Issue and branch links

## Workflow

### View Plans

1. Run kanban command
2. Server starts on local port
3. Open URL in browser
4. View plan cards with progress

### Plan Card Shows

- Title and description
- Priority (P0-P4)
- Effort estimate
- Phase completion (x/y)
- Status indicators

### Phase Status

| Status | Indicator |
|--------|-----------|
| Completed | ✅ Green |
| In Progress | 🔄 Yellow |
| Pending | ⏳ Gray |
| Blocked | 🚫 Red |

## Plan Structure

Dashboard reads from plan files:

```
plans/
├── 260110-feature-auth/
│   ├── plan.md            # Overview
│   ├── phase-01-setup.md  # Phase 1
│   ├── phase-02-impl.md   # Phase 2
│   └── phase-03-test.md   # Phase 3
└── 260109-bug-fix/
    └── plan.md
```

### Plan Frontmatter

```yaml
---
title: "Feature Authentication"
description: "Add OAuth2 authentication"
status: in_progress
priority: P1
effort: 8h
branch: feature/auth
tags: [auth, security]
created: 2026-01-10
---
```

## Dashboard Views

### Kanban Board

```
| Pending | In Progress | Review | Done |
|---------|-------------|--------|------|
| Plan A  | Plan B      | Plan C | Plan D |
```

### Timeline View

```
Jan 8  ----[Plan A]----
Jan 9  --------[Plan B]----
Jan 10 ----[Plan C]----------
```

## Actions

From dashboard:
- Click plan card → View details
- Click phase → Jump to phase file
- Click branch → Open in git
- Click issue → Open in GitHub

## Important

- Keep plan files updated for accurate dashboard
- Use consistent frontmatter format
- Server runs locally (not exposed externally)
