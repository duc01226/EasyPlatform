# Design System Reference

Comprehensive reference for component specifications, accessibility audits, and design tokens.

---

## Component Specification Format

```markdown
### Component: {Name}

**Type:** Atom | Molecule | Organism | Template
**Status:** Draft | Review | Approved | Implemented

#### Visual Specification
```
+-------------------------+
|  ASCII representation   |
+-------------------------+
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

## Design-to-Dev Handoff Checklist

Before sharing design specs with development:
- [ ] Figma link finalized
- [ ] All states documented
- [ ] Design tokens mapped
- [ ] Responsive specs complete
- [ ] Accessibility notes included
- [ ] Animation specs defined
- [ ] Assets exported

---

## Quality Checklist

Before completing design artifacts:
- [ ] All component states documented
- [ ] Design tokens used (no hardcoded values)
- [ ] Responsive behavior specified
- [ ] Accessibility requirements noted
- [ ] Handoff checklist complete
