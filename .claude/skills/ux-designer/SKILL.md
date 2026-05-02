---
name: ux-designer
version: 1.0.0
description: '[Project Management] Assist UX Designers with design specifications, component documentation, accessibility audits, and design-to-development handoffs. Use when creating design specs, documenting components, auditing accessibility, or preparing handoffs. Triggers on keywords like "design spec", "component spec", "accessibility audit", "design handoff", "design system", "design tokens", "UI specification", "wireframe".'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Assist UX Designers with design specs, component docs, accessibility audits, and dev handoffs.

**Workflow:**

1. **Design Spec** — Generate component specs from PBI with tokens, states, responsive behavior
2. **Component Doc** — Document states, variants, interactions, BEM classes, ARIA
3. **Accessibility Audit** — WCAG 2.1 AA checklist with issue tracking and remediation
4. **Design Handoff** — Developer-ready specs with assets, animations, and source links

**Key Rules:**

- All components must map to BEM class naming
- Design tokens only (no hardcoded values)
- All 7 states documented (default, hover, active, focus, disabled, error, loading)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# UX Designer Assistant

Help UX Designers create design specifications, document components, perform accessibility audits, and facilitate handoffs to development.

---

## Core Capabilities

### 1. Design Specification Generation

- Create detailed design specs from requirements
- Document component inventory
- Map design tokens to implementation
- Define responsive breakpoints

### 2. Component Documentation

- Document component states and variants
- Define interaction behaviors
- Specify accessibility requirements
- Map to BEM class naming

### 3. Accessibility Audits

- WCAG 2.1 AA compliance verification
- Contrast ratio checking
- Keyboard navigation review
- Screen reader compatibility

### 4. Design Handoffs

- Generate developer-ready specifications
- Export asset requirements
- Document animation specs
- Link to design source files

---

## Design Specification Format

### Component Specification

```markdown
### Component: {Name}

**Type:** Atom | Molecule | Organism | Template
**Status:** Draft | Review | Approved | Implemented

#### Visual Specification
```

┌─────────────────────────┐
│ ASCII representation │
└─────────────────────────┘

```

#### States
| State    | Description       | CSS Class               |
| -------- | ----------------- | ----------------------- |
| Default  | Normal appearance | `.component`            |
| Hover    | Mouse over        | `.component:hover`      |
| Active   | Being clicked     | `.component:active`     |
| Focus    | Keyboard focused  | `.component:focus`      |
| Disabled | Not interactive   | `.component.--disabled` |
| Error    | Validation failed | `.component.--error`    |
| Loading  | Awaiting data     | `.component.--loading`  |

#### Design Tokens
| Property   | Token                    | Value   |
| ---------- | ------------------------ | ------- |
| Background | `--color-bg-primary`     | #FFFFFF |
| Text       | `--color-text-primary`   | #1A1A1A |
| Border     | `--color-border-default` | #E5E5E5 |
| Spacing    | `--spacing-md`           | 16px    |

#### Accessibility
- **Focus:** {visible focus indicator spec}
- **ARIA:** {required attributes}
- **Keyboard:** {tab order and shortcuts}
- **Screen reader:** {expected announcements}

#### Responsive Behavior
| Breakpoint | Width      | Changes           |
| ---------- | ---------- | ----------------- |
| Desktop    | >= 1200px  | Full layout       |
| Tablet     | 768-1199px | Collapsed sidebar |
| Mobile     | < 768px    | Single column     |
```

---

## Workflow Integration

### Creating Design Spec from PBI

When user runs `/design-spec {pbi-file}`:

1. Read PBI and acceptance criteria
2. Identify UI components needed
3. Generate component specifications
4. Document design tokens
5. Add accessibility requirements
6. Save to `team-artifacts/design-specs/`

### Accessibility Audit

When user says "accessibility audit":

1. Identify feature/component to audit
2. Apply WCAG 2.1 AA checklist
3. Document issues found
4. Suggest remediations
5. Generate audit report

---

## Accessibility Audit Template

```markdown
## Accessibility Audit: {Feature}

**Date:** {Date}
**Auditor:** {Name}
**Standard:** WCAG 2.1 AA

### Criteria Checklist

#### Perceivable

- [ ] 1.1.1 Non-text Content: Alt text for images
- [ ] 1.3.1 Info and Relationships: Semantic HTML
- [ ] 1.3.2 Meaningful Sequence: Logical reading order
- [ ] 1.4.1 Use of Color: Not sole means of conveying info
- [ ] 1.4.3 Contrast (Minimum): 4.5:1 text, 3:1 large text
- [ ] 1.4.4 Resize Text: Readable at 200% zoom
- [ ] 1.4.11 Non-text Contrast: 3:1 for UI components

#### Operable

- [ ] 2.1.1 Keyboard: All functions keyboard accessible
- [ ] 2.1.2 No Keyboard Trap: Can navigate away
- [ ] 2.4.1 Bypass Blocks: Skip navigation available
- [ ] 2.4.3 Focus Order: Logical tab sequence
- [ ] 2.4.4 Link Purpose: Clear from link text
- [ ] 2.4.6 Headings and Labels: Descriptive
- [ ] 2.4.7 Focus Visible: Clear focus indicator

#### Understandable

- [ ] 3.1.1 Language of Page: lang attribute set
- [ ] 3.2.1 On Focus: No unexpected context change
- [ ] 3.2.2 On Input: No unexpected context change
- [ ] 3.3.1 Error Identification: Clear error messages
- [ ] 3.3.2 Labels or Instructions: Form labels present

#### Robust

- [ ] 4.1.1 Parsing: Valid HTML
- [ ] 4.1.2 Name, Role, Value: ARIA where needed

### Issues Found

| #   | Criterion | Issue | Severity | Recommendation |
| --- | --------- | ----- | -------- | -------------- |
| 1   |           |       | P1/P2/P3 |                |

### Audit Status: PASS / FAIL / CONDITIONAL

**Remediation Priority:**
{List items by severity}
```

---

## Design Tokens Reference

### Color System

```
Primary:    --color-primary-{50-900}
Secondary:  --color-secondary-{50-900}
Neutral:    --color-neutral-{50-900}
Success:    --color-success-{main, light, dark}
Warning:    --color-warning-{main, light, dark}
Error:      --color-error-{main, light, dark}
Info:       --color-info-{main, light, dark}
```

### Spacing Scale

```
--spacing-xs:  4px
--spacing-sm:  8px
--spacing-md:  16px
--spacing-lg:  24px
--spacing-xl:  32px
--spacing-2xl: 48px
```

### Typography

```
--font-size-xs:   12px
--font-size-sm:   14px
--font-size-base: 16px
--font-size-lg:   18px
--font-size-xl:   20px
--font-size-2xl:  24px
--font-size-3xl:  30px
```

---

## BEM Naming Integration

All component specifications must map to BEM classes:

### Pattern

```
Block:    .component-name
Element:  .component-name__element
Modifier: .component-name__element.--modifier
```

### Example

```scss
.user-card {
    &__avatar {
    }
    &__name {
    }
    &__actions {
        &.--collapsed {
        }
    }
}
```

---

## Design-to-Dev Handoff Checklist

Before sharing design specs with development:

- [ ] All component states documented
- [ ] Design tokens mapped to variables
- [ ] BEM class names defined
- [ ] Responsive breakpoints specified
- [ ] Accessibility notes included
- [ ] Animation/transition specs (if any)
- [ ] Figma/design file linked
- [ ] Assets exported (if needed)

---

## Output Conventions

### File Naming

```
{YYMMDD}-ux-designspec-{feature-slug}.md
{YYMMDD}-ux-audit-{feature-slug}.md
{YYMMDD}-ux-component-{component-name}.md
```

### Design Spec Structure

1. Overview
2. Component Inventory
3. Component Specifications (each)
4. Design Tokens Used
5. Responsive Behavior
6. Accessibility Requirements
7. Handoff Checklist

---

## Quality Checklist

Before completing UX artifacts:

- [ ] All states documented (default, hover, active, focus, disabled, error, loading)
- [ ] Design tokens mapped (no hardcoded values)
- [ ] BEM classes defined
- [ ] Responsive behavior specified
- [ ] Accessibility requirements included
- [ ] Links to design source provided

## Related

- `ui-ux-pro-max`
- `frontend-design`

---

<!-- SYNC:ai-mistake-prevention -->

**AI Mistake Prevention** — Failure modes to avoid on every task:
**Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
**Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
**Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
**Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
**When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
**Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
**Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
**Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
**Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
**Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
