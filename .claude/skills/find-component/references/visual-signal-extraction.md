# Visual Signal Extraction Guide

Extract these 6 signal types from screenshots. List ONLY what you ACTUALLY see — never infer.

## Signal Taxonomy

| # | Signal | Weight | Grep Pattern | Example |
|---|--------|--------|-------------|---------|
| 1 | Text Content | 30% | `grep "exact text" *.html` | "Task Management", "Search tasks" |
| 2 | BEM Block Class | 25% | `grep 'class="block-name' *.html` | `.task-list`, `.task-detail` |
| 3 | Material Widgets | 20% | `grep "mat-widget" *.html` | `mat-table`, `mat-chip-listbox` |
| 4 | Layout Structure | 10% | Compare against known SCSS patterns | sidebar+detail, card grid |
| 5 | Color Patterns | 10% | Match to SCSS variables/hardcoded | priority badges, status colors |
| 6 | Data Shape | 5% | `grep "columnName" *.ts` | column headers → entity props |

## Decision Tree

```
Can you read TEXT in the screenshot?
├── YES → Extract all static text (headers, labels, buttons, placeholders)
│         Skip dynamic data (names, dates, counts)
│         → grep each unique string in *.component.html
├── NO  → Continue to next signal
│
Can you identify MATERIAL COMPONENTS?
├── mat-table (grid/rows) → narrow to components using mat-table
├── mat-chip (pill buttons) → narrow to components using mat-chip
├── mat-expansion-panel (accordion) → narrow to components using expansion
├── mat-form-field (input fields) → check fill vs outline appearance
├── mat-tab-group → likely a page container component
├── mat-datepicker → likely a form/detail component
│
Can you identify the LAYOUT PATTERN?
├── Sidebar + detail pane → likely a page/shell component
├── Full-width card grid → likely a dashboard or list component
├── Centered form (max-width) → likely a detail/edit component
├── Statistics cards + table → likely a list component with summary
│
Can you identify DISTINCTIVE COLORS?
├── Color badges (green/blue/amber/red) → check component-index.json for matches
├── Left-border colored cards → check component-index.json for matches
├── Fill-style form fields → likely a detail/edit component
└── Outline-style form fields → likely a detail/edit component
NOTE: Always verify against component-index.json — never hardcode component names here.
```

## Extraction Checklist

1. [ ] List every visible text string (headers, labels, buttons, tooltips)
2. [ ] Identify Material widgets by visual appearance
3. [ ] Note the page layout pattern (sidebar, grid, form, tabs)
4. [ ] Note distinctive colors/badges
5. [ ] Note column headers or field labels (maps to entity properties)
6. [ ] Note any icons (mat-icon names if recognizable)

## Static vs Dynamic Text Rule

**Grep-able (static):** Tab labels, button text, headers, placeholders, error messages
**NOT grep-able (dynamic):** User data, timestamps, counts, IDs, generated content

Only use static text for Signal 1 matching.
