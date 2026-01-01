---
name: feature-docs
description: Use when generating comprehensive feature documentation with verified test cases and code evidence.
---

# Feature Documentation for EasyPlatform

## Documentation Structure

```markdown
# Feature Name

## Overview

Brief description of what the feature does.

## Architecture

- Service Responsibilities
- Design Patterns Used
- Integration Points

## Domain Model

- Entities and relationships
- Enumerations
- Value Objects

## Workflows

### Workflow 1: [Name]

1. Trigger: [What initiates]
2. Processing: [What happens]
3. Result: [What is produced]

## API Reference

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| /api/... | POST   | Creates...  |

## Test Specifications

### P0 - Critical

### P1 - High

### P2 - Medium
```

## Test Case Format (BDD)

```markdown
### TS-[CATEGORY]-P0-001: [Test Name]

**Priority:** P0 - Critical
**Component:** [Component]

**GIVEN** [initial context]
**WHEN** [action performed]
**THEN** [expected outcome]

**Code Reference:**

- File: `[file-path]`
- Lines: [line-range]
```

## Discovery Checklist

- [ ] Domain entities identified
- [ ] Commands/Queries mapped
- [ ] Event handlers found
- [ ] API endpoints documented
- [ ] Frontend components listed
- [ ] Cross-service messages identified

## Documentation Guidelines

| Principle        | Practice                              |
| ---------------- | ------------------------------------- |
| Evidence-based   | Every claim has code reference        |
| No hallucination | Verify with actual file reads         |
| Code snippets    | Include actual code, not paraphrased  |
| Line numbers     | Always include current line numbers   |
| BDD format       | GIVEN/WHEN/THEN for all test cases    |
| Priority levels  | P0 (critical), P1 (high), P2 (medium) |

## Verification Passes

1. **First Pass**: Verify all code references exist
2. **Second Pass**: Random sampling verification
3. **Cross-reference**: Verify internal links work
