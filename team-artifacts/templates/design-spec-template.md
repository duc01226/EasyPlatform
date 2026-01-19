---
id: DS-{YYMMDD}-{NNN}
feature: "{Feature name}"
source_pbi: "{PBI-XXXXXX-NNN}"
designer: "{Designer name}"
created: {YYYY-MM-DD}
updated: {YYYY-MM-DD}
status: draft | review | approved | implemented
figma: "{Figma URL}"
---

# Design Specification: {Feature Name}

## 1. Overview

### 1.1 Purpose
<!-- What user problem does this design solve? -->

### 1.2 User Personas
| Persona | Needs | Goals |
|---------|-------|-------|
| {Name} | {Needs} | {Goals} |

### 1.3 Design Principles Applied
- [ ] Mobile-first
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Consistency with design system
- [ ] Performance-conscious

---

## 2. Screen Inventory

| Screen | Type | Breakpoints | Status |
|--------|------|-------------|--------|
| {Screen name} | Page / Modal / Component | Mobile, Tablet, Desktop | Draft |

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

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | 320-767px | |
| Tablet | 768-1023px | |
| Desktop | 1024px+ | |

---

## 6. Design Tokens Used

| Category | Tokens |
|----------|--------|
| Colors | `--color-*` |
| Typography | `--font-*` |
| Spacing | `--spacing-*` |
| Borders | `--border-*` |
| Shadows | `--shadow-*` |

---

## 7. Figma Extracted Specs

> Auto-extracted via `/figma-extract` or `/design-spec` command

### 7.1 Colors
| Name | Hex | Usage |
|------|-----|-------|
| {extracted} | | |

### 7.2 Typography
| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| {extracted} | | | | |

### 7.3 Spacing & Layout
| Element | Padding | Margin | Gap |
|---------|---------|--------|-----|
| {extracted} | | | |

### 7.4 Component Hierarchy
```
{extracted-component-tree}
```

### 7.5 Extraction Metadata
- **Source URL**: {figma_link}
- **Node ID**: {node_id}
- **Extracted**: {timestamp}
- **Status**: {success|partial|failed}

---

## 8. Assets

| Asset | Format | Size | Usage |
|-------|--------|------|-------|
| {Icon name} | SVG | 24x24 | {Where used} |

---

## 9. Handoff Checklist

- [ ] All screens in Figma complete
- [ ] Design tokens documented
- [ ] Responsive breakpoints specified
- [ ] Accessibility requirements noted
- [ ] Animation specs defined
- [ ] Asset exports prepared
- [ ] Dev review completed

---

## 10. Related

- Figma: [{Link text}]({Figma URL})
- Design System: [{Link}](../../docs/design-system/)
- PBI: [{PBI ID}](../pbis/{pbi-file}.md)

---
*To hand off to development, share design spec link with developer.*
