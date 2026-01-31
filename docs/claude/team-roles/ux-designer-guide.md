# UX Designer Guide

> **Complete guide for UX Designers using Claude Code to create design specifications, document component states, and ensure accessibility compliance.**

---

## Quick Start

```bash
# Create design specification from PBI
/team-design-spec team-artifacts/pbis/260119-ba-pbi-biometric-auth.md

# Review implementation for accessibility
/team-design-spec --review src/app/auth/biometric-login.component.ts
```

**Output Location:** `team-artifacts/team-design-specs/`
**Naming Pattern:** `{YYMMDD}-ux-designspec-{slug}.md`

---

## Your Role in the Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    DESIGN WORKFLOW                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   BA ──> PBI ──> [YOU] ──/team-design-spec──> Dev                │
│                    │                       │                 │
│                    └──────review───────────┘                 │
│                              │                               │
│                         QC ──/quality-gate                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Your Responsibilities

| Task | Command | Output |
|------|---------|--------|
| Create design specs | `/team-design-spec` | `team-artifacts/team-design-specs/*.md` |
| Document component states | Manual | State matrix in spec |
| Define design tokens | Manual | Token reference table |
| Accessibility review | `/team-design-spec --review` | A11y compliance report |
| Responsive breakpoints | Manual | Breakpoint specifications |

---

## Commands

### `/team-design-spec` - Generate Design Specification

**Purpose:** Create comprehensive design specifications for development handoff.

#### Basic Usage

```bash
# From PBI
/team-design-spec team-artifacts/pbis/260119-ba-pbi-biometric-auth.md

# For specific component
/team-design-spec --component "BiometricLoginPrompt"

# With accessibility focus
/team-design-spec PBI-260119-001 --focus accessibility

# Review existing implementation
/team-design-spec --review src/app/auth/biometric-login.component.ts
```

#### What Claude Generates

```markdown
---
id: DS-260119-001
feature: "Biometric Authentication"
source_pbi: PBI-260119-001
author: "UX Designer"
created: 2026-01-19
figma: "https://figma.com/file/xxx"
status: draft
---

## Overview
Design specification for biometric authentication login flow.

## Component Hierarchy

```
BiometricLoginScreen
├── BiometricPrompt
│   ├── Icon (faceid/fingerprint)
│   ├── Title
│   ├── Subtitle
│   └── CancelButton
├── FallbackSection
│   ├── Divider
│   └── PasswordLink
└── ErrorState
    ├── ErrorIcon
    ├── ErrorMessage
    └── RetryButton
```

## Component States

### BiometricPrompt

| State | Visual | Behavior |
|-------|--------|----------|
| Default | Face ID icon, "Use Face ID to login" | Waiting for user |
| Scanning | Pulsing animation | System scanning |
| Success | Checkmark icon, green | Transition to dashboard |
| Failed | Shake animation | Show retry option |
| Timeout | Warning icon | Show fallback options |

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--biometric-icon-size` | 64px | Main icon |
| `--biometric-icon-color` | var(--primary-500) | Default state |
| `--biometric-success-color` | var(--success-500) | Success state |
| `--biometric-error-color` | var(--error-500) | Error state |

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | <768px | Full screen, centered |
| Tablet | 768-1024px | Modal, 400px wide |
| Desktop | >1024px | Modal, 400px wide |

## Accessibility

- Face ID icon: `aria-label="Face ID authentication"`
- Screen reader: "Authenticating with Face ID"
- Focus trap within modal
- Escape key dismisses
```

---

## Design Specification Structure

### Required Sections

Every design spec must include:

1. **Overview** - Feature description and context
2. **Component Hierarchy** - Tree structure of components
3. **Component States** - All visual states per component
4. **Design Tokens** - CSS custom properties used
5. **Responsive Breakpoints** - Layout at each breakpoint
6. **Accessibility** - WCAG requirements and implementation
7. **Interactions** - User interaction specifications
8. **Assets** - Icons, images, illustrations needed

### Component States Matrix

Document every possible state for each component:

```markdown
## Component States

### ButtonPrimary

| State | Background | Text | Border | Shadow | Cursor |
|-------|------------|------|--------|--------|--------|
| Default | primary-500 | white | none | sm | pointer |
| Hover | primary-600 | white | none | md | pointer |
| Active | primary-700 | white | none | none | pointer |
| Focus | primary-500 | white | 2px primary-300 | sm | pointer |
| Disabled | gray-300 | gray-500 | none | none | not-allowed |
| Loading | primary-500 | - | none | sm | wait |

### State Transitions

| From | To | Trigger | Duration | Easing |
|------|-----|---------|----------|--------|
| Default | Hover | mouseenter | 150ms | ease-out |
| Hover | Active | mousedown | 50ms | ease-in |
| Active | Default | mouseup | 100ms | ease-out |
| Any | Focus | tab/click | 0ms | - |
| Any | Disabled | prop change | 0ms | - |
```

---

## Design Tokens

### Token Naming Convention

```
--{category}-{property}-{variant}-{state}

Categories: color, spacing, typography, shadow, border, animation
Properties: bg, text, border, size, weight, duration, etc.
Variants: primary, secondary, success, error, warning, info
States: default, hover, active, focus, disabled
```

### Token Reference Template

```markdown
## Design Tokens

### Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-bg-primary` | #FFFFFF | #1A1A1A | Page background |
| `--color-bg-secondary` | #F5F5F5 | #2D2D2D | Card background |
| `--color-text-primary` | #1A1A1A | #FFFFFF | Body text |
| `--color-text-secondary` | #666666 | #A0A0A0 | Muted text |
| `--color-brand-primary` | #3B82F6 | #60A5FA | Buttons, links |
| `--color-success` | #22C55E | #4ADE80 | Success states |
| `--color-error` | #EF4444 | #F87171 | Error states |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-xs` | 4px | Icon padding |
| `--spacing-sm` | 8px | Tight gaps |
| `--spacing-md` | 16px | Standard gaps |
| `--spacing-lg` | 24px | Section gaps |
| `--spacing-xl` | 32px | Large sections |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-size-xs` | 12px | Captions |
| `--font-size-sm` | 14px | Body small |
| `--font-size-md` | 16px | Body |
| `--font-size-lg` | 18px | Subheadings |
| `--font-size-xl` | 24px | Headings |
| `--font-weight-normal` | 400 | Body text |
| `--font-weight-medium` | 500 | Emphasis |
| `--font-weight-bold` | 700 | Headings |

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | 0 1px 2px rgba(0,0,0,0.05) | Subtle elevation |
| `--shadow-md` | 0 4px 6px rgba(0,0,0,0.1) | Cards |
| `--shadow-lg` | 0 10px 15px rgba(0,0,0,0.1) | Modals |
| `--shadow-focus` | 0 0 0 3px var(--color-brand-primary-30) | Focus ring |

### Animation

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 150ms | Hover states |
| `--duration-normal` | 300ms | Transitions |
| `--duration-slow` | 500ms | Complex animations |
| `--easing-default` | cubic-bezier(0.4, 0, 0.2, 1) | Standard |
| `--easing-bounce` | cubic-bezier(0.68, -0.55, 0.265, 1.55) | Playful |
```

---

## Responsive Design

### Breakpoint System

```markdown
## Responsive Breakpoints

| Name | Width | Target |
|------|-------|--------|
| `xs` | 0-479px | Small phones |
| `sm` | 480-767px | Large phones |
| `md` | 768-1023px | Tablets |
| `lg` | 1024-1279px | Small laptops |
| `xl` | 1280-1535px | Desktops |
| `2xl` | 1536px+ | Large screens |

### Layout Changes

#### BiometricLoginScreen

| Breakpoint | Layout | Notes |
|------------|--------|-------|
| xs-sm | Full screen, vertical stack | Icon 48px, padding 16px |
| md | Centered modal, 400px | Icon 64px, padding 24px |
| lg+ | Centered modal, 440px | Icon 64px, padding 32px |

### Component Visibility

| Component | xs | sm | md | lg | xl |
|-----------|----|----|----|----|-----|
| BiometricIcon | 48px | 48px | 64px | 64px | 64px |
| HelpText | Hidden | Visible | Visible | Visible | Visible |
| KeyboardShortcuts | Hidden | Hidden | Hidden | Visible | Visible |
```

### Mobile-First Approach

```scss
// Base styles (mobile)
.biometric-prompt {
  padding: var(--spacing-md);

  &__icon {
    width: 48px;
    height: 48px;
  }
}

// Tablet and up
@media (min-width: 768px) {
  .biometric-prompt {
    padding: var(--spacing-lg);

    &__icon {
      width: 64px;
      height: 64px;
    }
  }
}
```

---

## Accessibility (WCAG 2.1 AA)

### Required Compliance

| Criterion | Level | Description |
|-----------|-------|-------------|
| 1.1.1 | A | Non-text Content (alt text) |
| 1.3.1 | A | Info and Relationships (semantic HTML) |
| 1.4.1 | A | Use of Color (not sole indicator) |
| 1.4.3 | AA | Contrast (4.5:1 text, 3:1 UI) |
| 1.4.4 | AA | Resize Text (up to 200%) |
| 2.1.1 | A | Keyboard (all functionality) |
| 2.4.3 | A | Focus Order (logical sequence) |
| 2.4.7 | AA | Focus Visible (clear indicator) |
| 4.1.2 | A | Name, Role, Value (ARIA) |

### Accessibility Checklist

```markdown
## Accessibility Requirements

### Visual
- [ ] Color contrast ratio ≥4.5:1 for text
- [ ] Color contrast ratio ≥3:1 for UI elements
- [ ] Focus indicator visible (min 2px)
- [ ] Text resizable to 200% without loss
- [ ] No information conveyed by color alone

### Keyboard
- [ ] All interactive elements focusable
- [ ] Logical focus order (top-to-bottom, left-to-right)
- [ ] No keyboard traps
- [ ] Skip links for repeated content
- [ ] Shortcuts don't conflict with assistive tech

### Screen Reader
- [ ] All images have alt text
- [ ] Form fields have labels
- [ ] Error messages announced
- [ ] State changes announced (aria-live)
- [ ] Landmarks defined (main, nav, etc.)

### Motion
- [ ] Animations respect prefers-reduced-motion
- [ ] No flashing content (3 flashes/sec)
- [ ] Auto-playing media has pause control
```

### ARIA Implementation

```markdown
## ARIA Specifications

### BiometricPrompt Component

```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="biometric-title"
  aria-describedby="biometric-desc"
>
  <h2 id="biometric-title">Face ID Login</h2>
  <p id="biometric-desc">Position your face in front of the camera</p>

  <!-- State announcement -->
  <div aria-live="polite" aria-atomic="true" class="sr-only">
    {{ currentStateAnnouncement }}
  </div>

  <button
    aria-label="Cancel authentication"
    (click)="cancel()"
  >
    Cancel
  </button>
</div>
```

### State Announcements

| State | Announcement |
|-------|--------------|
| Scanning | "Scanning face, please wait" |
| Success | "Authentication successful, redirecting" |
| Failed | "Authentication failed, please try again" |
| Timeout | "Authentication timed out, please try again or use password" |
```

---

## Interaction Specifications

### Micro-interactions

```markdown
## Interactions

### BiometricPrompt Interactions

#### Icon Animation

| Trigger | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Enter | Fade in + scale up | 300ms | ease-out |
| Scanning | Pulse (opacity 1→0.7→1) | 1500ms | ease-in-out, infinite |
| Success | Scale up + checkmark draw | 400ms | ease-out |
| Failed | Shake (x: -5px, 5px, 0) | 300ms | ease-in-out |

#### Button Feedback

| Interaction | Feedback | Duration |
|-------------|----------|----------|
| Hover | Background darken 10% | 150ms |
| Press | Scale 0.98 | 50ms |
| Release | Scale 1.0 | 100ms |
| Focus | Focus ring appears | 0ms |

### Gesture Support (Mobile)

| Gesture | Action |
|---------|--------|
| Swipe down | Dismiss modal |
| Tap outside | Dismiss modal |
| Double tap | Retry authentication |
```

### Loading States

```markdown
## Loading States

### Skeleton Screens

Use skeleton loading for content areas:

```
┌─────────────────────────────────┐
│  ████████  (avatar skeleton)    │
│  ██████████████  (name)         │
│  ████████  (subtitle)           │
└─────────────────────────────────┘
```

### Spinner Usage

| Context | Spinner Type | Size | Position |
|---------|-------------|------|----------|
| Button | Inline | 16px | Replace text |
| Card | Overlay | 32px | Centered |
| Page | Full | 48px | Center screen |
| Inline action | Inline | 14px | After text |

### Progress Indicators

| Operation | Type | Notes |
|-----------|------|-------|
| File upload | Determinate bar | Show percentage |
| Authentication | Indeterminate | Spinner only |
| Data loading | Skeleton | Match content shape |
| Form submit | Button spinner | Disable button |
```

---

## Real-World Examples

### Example 1: Login Screen Design Spec

```markdown
## Design Specification: Login Screen

### Overview
Multi-method login screen supporting email/password, biometric, and SSO.

### Component Hierarchy

```
LoginScreen
├── Header
│   ├── Logo
│   └── LanguageSelector
├── LoginForm
│   ├── EmailInput
│   ├── PasswordInput
│   ├── RememberMeCheckbox
│   └── SubmitButton
├── Divider ("or continue with")
├── SocialLogins
│   ├── GoogleButton
│   ├── AppleButton
│   └── BiometricButton
├── Footer
│   ├── ForgotPasswordLink
│   └── SignUpLink
└── ErrorBanner (conditional)
```

### State Matrix: LoginForm

| State | Email | Password | Button | Error |
|-------|-------|----------|--------|-------|
| Empty | Placeholder | Placeholder | Disabled | Hidden |
| Partial | Value | Empty | Disabled | Hidden |
| Valid | Value | Value | Enabled | Hidden |
| Submitting | Disabled | Disabled | Loading | Hidden |
| Error | Value (red border) | Value | Enabled | Visible |

### Design Tokens

| Token | Value | Context |
|-------|-------|---------|
| `--login-max-width` | 400px | Form container |
| `--login-padding` | 32px | Form padding |
| `--login-gap` | 16px | Field spacing |
| `--login-border-radius` | 12px | Card corners |

### Responsive

| Breakpoint | Layout |
|------------|--------|
| Mobile | Full width, 16px padding |
| Tablet+ | Centered card, max 400px |

### Accessibility

- Form fields: `<label>` elements or `aria-label`
- Error: `aria-describedby` linking to error message
- Password: Toggle visibility button with `aria-pressed`
- Focus: Trap focus within form, auto-focus email on load
```

### Example 2: Dashboard Widget Spec

```markdown
## Design Specification: Stats Widget

### Overview
Compact widget displaying key metrics with trend indicators.

### Component Hierarchy

```
StatsWidget
├── Header
│   ├── Title
│   └── InfoTooltip
├── MainStat
│   ├── Value
│   └── Unit
├── TrendIndicator
│   ├── Arrow (up/down)
│   └── Percentage
└── Sparkline (optional)
```

### Variants

| Variant | Use Case | Visual |
|---------|----------|--------|
| Default | Standard metric | Value + trend |
| Compact | Dashboard grid | Value only |
| Expanded | Detail view | Value + trend + sparkline |
| Comparison | A/B metrics | Two values side by side |

### State Matrix

| State | Value | Trend | Sparkline | Actions |
|-------|-------|-------|-----------|---------|
| Loading | Skeleton | Skeleton | Skeleton | Disabled |
| Loaded | Number | Arrow + % | Chart | Enabled |
| Error | "—" | Hidden | Hidden | Retry |
| Empty | "No data" | Hidden | Hidden | Enabled |

### Color by Trend

| Trend | Color Token | Icon |
|-------|-------------|------|
| Positive | `--color-success` | ↑ |
| Negative | `--color-error` | ↓ |
| Neutral | `--color-text-secondary` | → |

### Animation

| Trigger | Animation |
|---------|-----------|
| Load | Number count up (500ms) |
| Update | Flash highlight (300ms) |
| Hover | Subtle scale (1.02) |
```

---

## Working with Other Roles

### ← From Business Analyst

**Receiving PBIs:**
1. Review acceptance criteria for UI implications
2. Identify components needed
3. Flag missing UX requirements

**Questions to Ask:**
- What user personas are involved?
- What are the error scenarios?
- Any existing patterns to follow?

### → To Development Team

**Design Handoff Checklist:**
- [ ] Component hierarchy documented
- [ ] All states specified
- [ ] Design tokens defined
- [ ] Responsive breakpoints clear
- [ ] Accessibility requirements listed
- [ ] Interaction specs complete
- [ ] Assets exported and linked

**Figma Handoff:**
```bash
# Include in design spec
figma: "https://figma.com/file/xxx"
figma_page: "Login Flow"
figma_frames: ["Login Screen", "States", "Responsive"]
```

### ↔ With QC Specialist

**Quality Gate Support:**
- Provide accessibility requirements for pre-dev gate
- Review implementation for design compliance
- Sign off on visual QA

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                 UX DESIGNER QUICK REFERENCE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CREATE DESIGN SPEC                                          │
│  /team-design-spec team-artifacts/pbis/PBI-XXX.md                 │
│  /team-design-spec --component "ComponentName"                    │
│  /team-design-spec --review src/app/component.ts                  │
│                                                              │
│  REQUIRED SECTIONS                                           │
│  1. Overview          5. Responsive Breakpoints              │
│  2. Component Hierarchy  6. Accessibility                    │
│  3. Component States  7. Interactions                        │
│  4. Design Tokens     8. Assets                              │
│                                                              │
│  TOKEN NAMING                                                │
│  --{category}-{property}-{variant}-{state}                   │
│  Example: --color-bg-primary-hover                           │
│                                                              │
│  WCAG 2.1 AA REQUIREMENTS                                    │
│  Text contrast: ≥4.5:1                                       │
│  UI contrast: ≥3:1                                           │
│  Focus visible: ≥2px indicator                               │
│  Keyboard: All interactive elements                          │
│                                                              │
│  OUTPUT LOCATIONS                                            │
│  Design Specs: team-artifacts/team-design-specs/                  │
│                                                              │
│  NAMING: {YYMMDD}-ux-designspec-{slug}.md                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [Team Collaboration Guide](../team-collaboration-guide.md) - Full system overview
- [Business Analyst Guide](./business-analyst-guide.md) - PBI handoff details
- [QC Specialist Guide](./qc-specialist-guide.md) - Quality gate process
- [SCSS Styling Guide](../scss-styling-guide.md) - BEM methodology and styling

---

*Last updated: 2026-01-19*
