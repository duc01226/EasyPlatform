# UI Wireframe Protocol

> Referenced by: idea, refine, story, plan-hard, plan-fast skills.
> Use this protocol when generating UI sections in planning artifacts.

---

## ASCII Wireframe Standard

Use box-drawing characters for layout visualization:

```
Characters: ┌ ─ ┐ │ └ ┘ ├ ┤ ┬ ┴ ┼ •

Example:
┌──────────┬──────────────────────┐
│ Sidebar  │  ┌─ Section ──────┐  │
│ • Item   │  │ Component      │  │
│ • Item   │  └────────────────┘  │
└──────────┴──────────────────────┘
```

Keep wireframes simple — show spatial relationships, not pixel-perfect design.

## Component Inventory

List components with behavior:

```markdown
**Components:**

- **{ComponentName}** — {behavior description}
- **{ComponentName}** — {behavior description}
```

## States Table

Document UI states for each view:

```markdown
| State   | Behavior                   |
| ------- | -------------------------- |
| Default | {what user sees initially} |
| Loading | {spinner/skeleton}         |
| Empty   | {empty state message}      |
| Error   | {error handling}           |
```

## Backend-Only Changes

If the change has no UI impact, include the section header with:

```markdown
## UI Layout

N/A — Backend-only change. No UI affected.
```

## Component Hierarchy (Never Duplicate UI Code)

Classify every component in the wireframe into one tier:

| Tier              | Location                    | Reuse Scope                | Examples                             |
| ----------------- | --------------------------- | -------------------------- | ------------------------------------ |
| **Common**        | `bravo-common` / shared lib | All apps                   | Buttons, modals, tables, form fields |
| **Domain-Shared** | `bravo-domain` / domain lib | All apps using that domain | EmployeeCard, GoalProgressBar        |
| **Page/App**      | App-specific module         | Single app only            | DashboardHeader, RecruitmentPipeline |

**Rule:** Before creating a new component, search existing common and domain-shared libraries. Only create page/app-level components for truly app-specific UI. Duplicate UI code = wrong tier.

## Progressive Detail by Skill

| Skill       | Section Name      | Detail Level                                       |
| ----------- | ----------------- | -------------------------------------------------- |
| `idea`      | `## UI Sketch`    | Rough layout + key components list                 |
| `refine`    | `## UI Layout`    | Full wireframe + components + states               |
| `story`     | `## UI Wireframe` | Wireframe + components + interaction flow + states |
| `plan-hard` | `## UI Layout`    | Full wireframe per frontend phase                  |
| `plan-fast` | `## UI Layout`    | Full wireframe per frontend phase                  |
