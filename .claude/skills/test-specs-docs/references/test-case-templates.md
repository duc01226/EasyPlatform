# Test Case Templates & Document Structure

Templates for test case generation, document structure, and analysis methodology.

---

## External Memory-Driven Test Analysis

Build a structured knowledge model in `.ai/workspace/analysis/[feature-name].md`.

### Phase 1A: Initialization and Discovery
1. Initialize analysis file with standard headings
2. Discovery searches for all feature-related files
3. Prioritize: Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers, front-end Components

### Phase 1B: Systematic File Analysis

For each file, document in `## Knowledge Graph`:
- Standard fields plus testing-specific:
  - `coverageTargets`: Specific coverage goals
  - `edgeCases`: Edge cases and boundary conditions
  - `businessScenarios`: Business scenarios supported
  - `detailedFunctionalRequirements`: Business logic and functional requirements
  - `detailedTestCases`: Business logic test cases (Given...When...Then)

---

## Mandatory Document Structure

```markdown
# [Feature Name] - Comprehensive QA Test Cases

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Entity Relationship Diagram](#2-entity-relationship-diagram)
3. [Detailed Test Cases](#3-detailed-test-cases)
4. [Traceability Matrix](#4-traceability-matrix)
5. [Coverage Analysis](#5-coverage-analysis)

## 1. Feature Overview

**Epic:** [Epic Name]

- **Summary (The Why):** As a [user type], I want to [action], so that [benefit].

**User Story 1:** [Story Title]

- **ID:** US-XXX-001
- **Story:** As a [role], I want to [action], so that [benefit].
- **Acceptance Criteria:**
    - AC 1: GIVEN [context] WHEN [action] THEN [result]
    - AC 2: ...

**Business Requirements:**

- [Each business requirement]

**Roles/Permission Authorization:**

- [Each role and permission]

### 1-A. Cross Services Business Logic Overview

[Cross Service Consumer Producer Business Logic]

## 2. Entity Relationship Diagram

### Core Entities and Relationships
[Entity descriptions with properties and relationships]

### Mermaid Diagram
[Entity relationship mermaid diagram]

## 3. Detailed Test Cases

### [Priority Level (Critical/High/Medium/Low)]:

#### TC-001: [Test Case Name]

**Feature Module:** [Module]
**Business Requirement:** BR-XXX
**Priority:** Critical/High/Medium/Low

**Given** [initial context]
**And** [additional context]
**When** [action performed]
**Then** the system should:
- [Expected outcome 1]
- [Expected outcome 2]

**Component Interaction Flow:**
Frontend -> Controller -> Command/Query -> Repository -> Event -> Consumer

**Test Data:**
- [Required test data]

**Expected Outcomes:**
- [Detailed outcomes]

**Edge Cases to Validate:**
- [Edge case 1]
- [Edge case 2]

## 4. Traceability Matrix
[Bidirectional mapping between tests and business components]

## 5. Coverage Analysis
[Multi-dimensional coverage validation with percentages]
```

---

## Test Case Priority Groups

Generate test cases in 4 priority groups:

| Priority | Level | Criteria |
|----------|-------|----------|
| Critical (P0) | Must pass | Security, auth, data integrity |
| High (P1) | Core path | Main business workflows |
| Medium (P2) | Secondary | Filters, sorting, reporting |
| Low (P3) | Nice-to-have | UI polish, tooltips, preferences |

---

## Comprehensive Test Case Template

```markdown
#### TC-{MOD}-{FEAT}-{NUM}: [Descriptive Test Name]

**Feature Module:** [Module]
**Business Requirement:** BR-XXX
**Priority:** Critical/High/Medium/Low

**Given** [initial context]
**And** [additional context]
**When** [action performed]
**Then** the system should:
- [Expected outcome 1]
- [Expected outcome 2]

**Component Interaction Flow:**
Frontend -> Controller -> Command/Query -> Repository -> Event -> Consumer

**Test Data:**
- [Required test data]

**Expected Outcomes:**
- [Detailed outcomes]

**Edge Cases to Validate:**
- [Edge case 1]
- [Edge case 2]
```

---

## Test Case Guidelines

- **Evidence-based testing**: Base test cases on actual code behavior
- **Complete coverage**: Cover all conditional logic paths
- **Component tracing**: Include workflow between components
- **Priority classification**: Critical (P0), High (P1), Medium (P2), Low (P3)
- **BDD format**: Use Given/When/Then consistently
- **Traceability**: Link test cases to requirements bidirectionally

---

## Overall Analysis Phase

Write comprehensive summary showing:
- Complete end-to-end workflows discovered
- Key architectural patterns and relationships
- All business logic workflows
- Integration points and dependencies

---

## Approval Gate

**CRITICAL**: Present test plan with coverage analysis for explicit approval before generating full test cases. DO NOT proceed without approval.
