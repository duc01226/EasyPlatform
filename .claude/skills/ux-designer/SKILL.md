---
name: ux-designer
description: Assist UX Designers with design specifications, component documentation, accessibility audits, and design-to-development handoffs. Provides structured workflows for creating design specs from requirements, documenting component states and tokens, and ensuring WCAG compliance. Triggers on "design spec", "component spec", "accessibility audit", "design handoff", "design system", "design tokens", "wireframe", "mockup", "UI specification".
allowed-tools: Read, Write, Edit, Grep, Glob, WebSearch, ai-multimodal
---

# UX Designer Assistant

Help UX Designers create design specifications, document components, conduct accessibility audits, and prepare design-to-development handoffs.

---

## Core Capabilities

### 1. Design Specification Generation
- Transform requirements into design specs
- Document component inventory
- Specify design tokens
- Define responsive behavior

### 2. Component Documentation
- State documentation (default, hover, active, disabled, error, loading)
- Design token mapping
- Accessibility requirements
- Interaction patterns

### 3. Accessibility Audits
- WCAG 2.1 AA compliance checking
- Focus management review
- Screen reader compatibility
- Color contrast verification

### 4. Design-to-Dev Handoff
- Structured handoff checklists
- Asset export preparation
- Animation specifications

---

## Design Specification Generation

### When to Generate
- New feature requires UI changes
- Component needs documentation
- Design system additions

### Command: `/design-spec`
1. Read source PBI/requirements
2. Generate design specification
3. Include component inventory
4. Document design tokens used
5. Add accessibility requirements
6. Save to `team-artifacts/design-specs/`

---

## Component Specification Format

```markdown
### Component: {Name}

**Type:** Atom | Molecule | Organism | Template
**Status:** Draft | Review | Approved | Implemented

#### Visual Specification
```
┌─────────────────────────┐
│  ASCII representation   │
└─────────────────────────┘
```

#### States
| State | Description | CSS Class |
|-------|-------------|-----------|
| Default | | `.component` |
| Hover | | `.component:hover` |
| Active | | `.component:active` |
| Disabled | | `.component.--disabled` |
| Error | | `.component.--error` |
| Loading | | `.component.--loading` |

#### Design Tokens
| Property | Token | Value |
|----------|-------|-------|
| Background | `--color-bg-primary` | #FFFFFF |
| Text | `--color-text-primary` | #1A1A1A |

#### Accessibility
- Focus: {indicator spec}
- ARIA: {attributes needed}
- Keyboard: {tab behavior}
- Screen reader: {announcement}
```

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
- [ ] 1.4.3 Contrast (Minimum): 4.5:1 text, 3:1 large
- [ ] 1.4.11 Non-text Contrast: 3:1 UI components

#### Operable
- [ ] 2.1.1 Keyboard: All functions keyboard accessible
- [ ] 2.4.3 Focus Order: Logical tab sequence
- [ ] 2.4.7 Focus Visible: Clear focus indicator

#### Understandable
- [ ] 3.1.1 Language of Page: lang attribute
- [ ] 3.3.1 Error Identification: Error messages clear
- [ ] 3.3.2 Labels or Instructions: Form labels present

#### Robust
- [ ] 4.1.1 Parsing: Valid HTML
- [ ] 4.1.2 Name, Role, Value: ARIA where needed

### Issues Found
| # | Criterion | Issue | Severity | Fix |
|---|-----------|-------|----------|-----|
| 1 | | | | |

### Audit Status: PASS / FAIL / CONDITIONAL
```

---

## Design Tokens Reference

### Color Tokens
```
--color-bg-primary
--color-bg-secondary
--color-text-primary
--color-text-secondary
--color-text-muted
--color-border
--color-accent
--color-error
--color-success
--color-warning
```

### Typography Tokens
```
--font-family-primary
--font-family-mono
--font-size-xs, sm, md, lg, xl, 2xl
--font-weight-normal, medium, semibold, bold
--line-height-tight, normal, relaxed
```

### Spacing Tokens
```
--spacing-xs, sm, md, lg, xl, 2xl
--spacing-section
--spacing-component
```

### Border Tokens
```
--border-radius-sm, md, lg, full
--border-width-thin, normal, thick
```

### Shadow Tokens
```
--shadow-sm, md, lg
--shadow-inner
```

---

## Responsive Breakpoints

| Breakpoint | Width | Target |
|------------|-------|--------|
| Mobile | 320-767px | Phone portrait |
| Tablet | 768-1023px | Tablet portrait |
| Desktop | 1024-1439px | Desktop |
| Large | 1440px+ | Large desktop |

---

## Workflow Integration

### Creating Design Spec from PBI
When user runs `/design-spec {pbi-file}`:
1. Read PBI and requirements
2. Identify UI components needed
3. Create design specification
4. Add responsive breakpoints
5. Include accessibility requirements
6. Save to `team-artifacts/design-specs/`

---

## Output Conventions

### File Naming
```
{YYMMDD}-ux-designspec-{feature-slug}.md
{YYMMDD}-ux-audit-{feature-slug}.md
```

---

## Design-to-Dev Handoff Checklist

Before sharing design specs with development:
- [ ] Figma link finalized
- [ ] All states documented
- [ ] Design tokens mapped
- [ ] Responsive specs complete
- [ ] Accessibility notes included
- [ ] Animation specs defined
- [ ] Assets exported

*Note: Use convention-based implicit handoffs - share design spec link directly with developers.*

---

## Quality Checklist

Before completing UX artifacts:
- [ ] All component states documented
- [ ] Design tokens used (no hardcoded values)
- [ ] Responsive behavior specified
- [ ] Accessibility requirements noted
- [ ] Handoff checklist complete
