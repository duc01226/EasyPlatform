# UI Wireframe Protocol

> Referenced by: idea, refine, story, plan-hard, plan-fast, design-spec skills.
> Use this protocol when generating UI sections in planning artifacts.
> Sections are progressively detailed — see "Progressive Detail by Skill" at the end.

---

## Design Input Handling

When the requirement includes visual design input, process it BEFORE creating wireframes:

| Input Type                               | Processing                                          | Tool                                    |
| ---------------------------------------- | --------------------------------------------------- | --------------------------------------- |
| Figma URL                                | Extract via Figma MCP or screenshot + ai-multimodal | `figma-design` or `ai-multimodal`       |
| Screenshot of existing app               | Extract design guidelines (colors, fonts, spacing)  | `ai-multimodal` with extraction prompts |
| Hand-drawn wireframe photo               | Interpret layout structure and elements             | `ai-multimodal` with wireframe prompts  |
| Digital wireframe (Excalidraw, Balsamiq) | Parse layout and element inventory                  | `ai-multimodal` vision analysis         |
| Text-only requirements                   | Skip visual extraction, proceed to ASCII wireframe  | Direct                                  |

### Wireframe Analysis Prompt (for ai-multimodal)

When analyzing a wireframe or UI image, extract:

1. Page layout structure (regions: header, sidebar, main, footer)
2. All UI elements with position and type (button, input, table, card, etc.)
3. Content hierarchy (primary, secondary, tertiary)
4. Interactive elements (dropdowns, modals, toggles, navigation)
5. Text labels and annotations
6. Navigation patterns (tabs, sidebar menu, breadcrumbs)

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

---

## Component Inventory

List components with behavior and tier:

```markdown
**Components:**

- **{ComponentName}** — {behavior description} _(tier: common | domain-shared | page/app)_
- **{ComponentName}** — {behavior description} _(tier: common | domain-shared | page/app)_
```

---

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

---

## Design Tokens

If project has existing design system (check `docs/project-reference/design-system/README.md`), map components to existing tokens:

```markdown
| Category   | Token            | Value   | Used By          |
| ---------- | ---------------- | ------- | ---------------- |
| Color      | `--primary`      | {value} | Buttons, links   |
| Color      | `--surface`      | {value} | Card backgrounds |
| Spacing    | `--space-md`     | {value} | Card padding     |
| Typography | `--font-heading` | {value} | Section titles   |
```

If new project (no design system yet), document required token categories:

- **Colors:** primary, secondary, surface, background, text, error, success, warning
- **Spacing:** xs, sm, md, lg, xl scale
- **Typography:** heading, body, caption font families + sizes
- **Breakpoints:** mobile (<768px), tablet (768-1023px), desktop (>=1024px)

> For new projects, these become input for `/scaffold` UI Foundation.

---

## Backend-Only Changes

If the change has no UI impact, include the section header with:

```markdown
## UI Layout

N/A — Backend-only change. No UI affected.
```

---

## Component Hierarchy (Never Duplicate UI Code)

Classify every component in the wireframe into one tier:

| Tier              | Location                   | Reuse Scope                | Examples                             |
| ----------------- | -------------------------- | -------------------------- | ------------------------------------ |
| **Common**        | Shared lib / common module | All apps                   | Buttons, modals, tables, form fields |
| **Domain-Shared** | Domain lib / domain module | All apps using that domain | EmployeeCard, GoalProgressBar        |
| **Page/App**      | App-specific module        | Single app only            | DashboardHeader, RecruitmentPipeline |

**Rule:** Before creating a new component, search existing common and domain-shared libraries. Only create page/app-level components for truly app-specific UI. Duplicate UI code = wrong tier.

---

## Component Decomposition Tree

For `refine`, `story`, and `plan` detail levels, decompose UI into a tree:

```
View: {PageName}
├── Section: {RegionName} [EXISTING: {path}] or [NEW]
│   ├── Composite: {GroupName} [EXISTING/NEW]
│   │   ├── Primitive: {ElementName} [EXISTING: {shared/component}]
│   │   └── Primitive: {ElementName} [NEW → tier: common|domain|page]
│   └── Composite: {GroupName} [NEW]
└── Section: {RegionName}
```

### Before Creating New Components (MANDATORY)

1. Search shared/common component library for similar components
2. Search domain-specific libraries
3. If >=80% match found → reuse with props/config
4. If <80% match → create new, classify tier per Component Hierarchy above

### New Component Spec (per NEW component, for story/plan detail level)

| Property       | Value                                                   |
| -------------- | ------------------------------------------------------- |
| Name           | {PascalCase}                                            |
| Tier           | Common / Domain-Shared / Page                           |
| Props/Inputs   | {list with types}                                       |
| Events/Outputs | {list}                                                  |
| States         | Default, Hover, Active, Disabled, Loading, Error, Empty |
| Responsive     | {breakpoint behavior}                                   |
| A11y           | {ARIA roles, keyboard nav}                              |

---

## Responsive Behavior

| Breakpoint | Width      | Layout Change                                          |
| ---------- | ---------- | ------------------------------------------------------ |
| Mobile     | <768px     | {e.g., stack vertical, hide sidebar, full-width cards} |
| Tablet     | 768-1023px | {e.g., 2-column grid, collapsible sidebar}             |
| Desktop    | >=1024px   | {e.g., 3-column grid, fixed sidebar}                   |

---

## Progressive Detail by Skill

| Skill         | Section Name      | Detail Level                                                                          |
| ------------- | ----------------- | ------------------------------------------------------------------------------------- |
| `idea`        | `## UI Sketch`    | Rough layout + key components + design input reference                                |
| `refine`      | `## UI Layout`    | Wireframe + components with tiers + states + token mapping + responsive               |
| `story`       | `## UI Wireframe` | Wireframe + component tree + interaction flow + states + responsive + component specs |
| `plan-hard`   | `## UI Layout`    | Full wireframe per phase + component tree + token mapping                             |
| `plan-fast`   | `## UI Layout`    | Full wireframe per phase + component tree                                             |
| `design-spec` | (full spec)       | Complete specification with all sections                                              |
