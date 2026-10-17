---
id: DS-{YYMMDD}-{NNN}
feature: '{Feature name}'
source_task: '{TASK-XXXXXX-NNN}'
designer: '{Designer name}'
created: { YYYY-MM-DD }
updated: { YYYY-MM-DD }
status: draft | review | approved | implemented
design_links: # Design-tool links for the screens/components this spec covers
    - label: '{Screen/Component name}'
      url: '{Design link}'
template_version: '2.1'
---

# Design Specification: {Feature Name}

## 1. Overview

### 1.1 Purpose

<!-- What user problem does this design solve? -->

### 1.2 User Personas

| Persona | Needs   | Goals   |
| ------- | ------- | ------- |
| {Name}  | {Needs} | {Goals} |

### 1.3 Design Principles Applied

- [ ] Mobile-first
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Consistency with design system
- [ ] Performance-conscious

---

## 2. Screen Inventory

| Screen        | Primary task        | Container (why)                                                        | Breakpoints             | Status |
| ------------- | ------------------- | ---------------------------------------------------------------------- | ----------------------- | ------ |
| {Screen name} | {the one verb it serves} | Full view / Dialog / Side panel / Stepped flow / Inline — {why it fits the task} | Mobile, Tablet, Desktop | Draft  |

### 2.1 Information Priority (per screen)

<!-- Every piece of information and every input the user meets on this screen. Classify it for THIS screen's task:
     now = the task needs it here · later = deferred to a follow-up step or the record's own edit view · not here = owned elsewhere.
     A screen whose `now` column exceeds its task is an overload — resolve it here, before visual design. -->

| Screen   | Item (information or input) | Priority (now / later / not here) | Why / where it goes instead | Required at this step? |
| -------- | --------------------------- | --------------------------------- | --------------------------- | ---------------------- |
| {Screen} | {Item}                      | now                               | {reason}                    | yes / no               |

**Complexity budget:** {inputs per step · sections per view · equal-weight actions per view} vs the project budget (`uiReview.complexityBudget` in the project config) when declared — otherwise state the counts and the reasoning for the primary user.

---

## 3. Component Specifications

### 3.1 {Component Name}

**Visual:**

```
┌─────────────────────────┐
│  Component ASCII art    │
│  or description         │
└─────────────────────────┘
```

**States:**
| State | Description | Visual Change |
|-------|-------------|---------------|
| Default | | |
| Hover | | |
| Active | | |
| Disabled | | |
| Error | | |
| Loading | | |

**Design Tokens:**
| Property | Token | Value |
|----------|-------|-------|
| Background | `--color-bg-primary` | #FFFFFF |
| Text | `--color-text-primary` | #1A1A1A |
| Border | `--border-radius-md` | 8px |
| Spacing | `--spacing-md` | 16px |

**Accessibility:**

- Focus indicator: {description}
- Screen reader: {aria attributes}
- Keyboard navigation: {tab order}

---

## 4. Interaction Patterns

### 4.1 {Interaction Name}

**Trigger:** {User action}
**Animation:**

- Duration: {ms}
- Easing: {easing function}
- Properties: {what animates}

**Micro-interactions:**

- {Description}

---

## 5. Responsive Behavior

| Breakpoint | Width      | Layout Changes |
| ---------- | ---------- | -------------- |
| Mobile     | 320-767px  |                |
| Tablet     | 768-1023px |                |
| Desktop    | 1024px+    |                |

---

## 6. Design Tokens Used

| Category   | Tokens        |
| ---------- | ------------- |
| Colors     | `--color-*`   |
| Typography | `--font-*`    |
| Spacing    | `--spacing-*` |
| Borders    | `--border-*`  |
| Shadows    | `--shadow-*`  |

---

## 7. Assets

| Asset       | Format | Size  | Usage        |
| ----------- | ------ | ----- | ------------ |
| {Icon name} | SVG    | 24x24 | {Where used} |

---

## 8. Handoff Checklist

- [ ] All screens in design tool complete
- [ ] Design tokens documented
- [ ] Responsive breakpoints specified
- [ ] Accessibility requirements noted
- [ ] Animation specs defined
- [ ] Asset exports prepared
- [ ] Dev review completed

---

## 9. Related

### Design Links

| Design        | Link                        | Notes |
| ------------- | --------------------------- | ----- |
| Main File     | [{File name}]({File URL})   | -     |
| {Screen 1}    | [{Link text}]({Design URL}) |       |
| {Component 1} | [{Link text}]({Design URL}) |       |

### Other References

- Design System: [{Link}](../../docs/project-reference/design-system/) — link assumes the default project-reference root; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it
- Task: [{task ID}](../tasks/{task-file}.md)

---

_To hand off to development, share design spec link with developer._
