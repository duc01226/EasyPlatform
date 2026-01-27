---
description: Create UI/UX design specifications from requirements or Figma designs
argument-hint: [pbi-file, story-file, or Figma URL]
---

# Design Specification

Create comprehensive UI/UX design specifications for implementation.

**Input**: $ARGUMENTS

## Pre-Workflow

### Activate Skills

- Activate `design-spec` skill for component specs, design tokens, and accessibility

## Workflow

### 1. Load Requirements

- Read PBI or story file for functional requirements
- Extract acceptance criteria and user flows
- If Figma URL provided, extract design tokens via Figma MCP

### 2. Define Components

- Classify as Atom, Molecule, or Organism
- Specify component hierarchy and composition
- Define props, states, and variants

### 3. Specify Design Details

- Layout and responsive behavior (mobile, tablet, desktop)
- Design tokens (colors, typography, spacing)
- Interaction states (default, hover, active, disabled, error)
- Accessibility requirements (WCAG 2.1 AA)

### 4. Create Dev Handoff

- Component tree with BEM class naming
- State management requirements
- API data requirements
- Edge cases and loading states

### 5. Save Specification

- Save to `team-artifacts/design-specs/` with date prefix

## Output

Design specification with component hierarchy, responsive behavior, accessibility checklist, and dev handoff notes.

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
