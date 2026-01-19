---
name: business-analyst
description: Assist Business Analysts with requirements refinement, user story writing, acceptance criteria in BDD format, and gap analysis. Use when creating user stories, writing acceptance criteria, analyzing requirements, or mapping business processes. Triggers on keywords like "requirements", "user story", "acceptance criteria", "BDD", "GIVEN WHEN THEN", "gap analysis", "process flow", "business rules".
allowed-tools: Read, Write, Edit, Grep, Glob, TodoWrite
---

# Business Analyst Assistant

Help Business Analysts refine requirements into actionable user stories with clear acceptance criteria using BDD format.

---

## Core Capabilities

### 1. Requirements Refinement
- Transform vague requests into specific requirements
- Identify missing information and ambiguities
- Document assumptions and constraints

### 2. User Story Writing

#### Format
```
As a {user role/persona}
I want {goal/desire}
So that {benefit/value}
```

#### INVEST Criteria
- **I**ndependent: No dependencies on other stories
- **N**egotiable: Not a contract, can be refined
- **V**aluable: Delivers user value
- **E**stimable: Can be sized
- **S**mall: Fits in one sprint
- **T**estable: Has clear acceptance criteria

### 3. Acceptance Criteria (BDD Format)

```gherkin
Scenario: {Descriptive title}
  Given {precondition/context}
    And {additional context}
  When {action/trigger}
    And {additional action}
  Then {expected outcome}
    And {additional verification}
```

### 4. Business Rules Documentation

#### Rule Format
```
BR-{MOD}-{NNN}: {Rule name}
IF {condition}
THEN {action/result}
ELSE {alternative}
Evidence: {file}:{line}
```

### 5. Gap Analysis
- Current state vs desired state mapping
- Identify process improvements
- Document integration requirements

---

## Business Features Documentation

### Gap Analysis Enhancement

Use `docs/business-features/` for comprehensive gap analysis during `/refine`:

1. **Load Module Docs**: Read `{Module}/INDEX.md` for feature inventory
2. **Search detailed-features/**: Find similar features by keyword
3. **Extract Requirements**: Note existing FR-XX, TC-XX IDs
4. **Identify Gaps**:
   - Missing test cases for existing features
   - Undocumented edge cases
   - Integration points not covered

### Evidence-Based Refinement

```gherkin
# When refining, cross-reference existing test specs
Given existing test TC-TS-001 covers basic CRUD
And new idea extends search capability
Then acceptance criteria should reference TC-TS-002 (Search)
And note gap: "No test for advanced search filters"
```

### Documentation Paths

| Content | Path |
|---------|------|
| Feature Index | `docs/business-features/{Module}/INDEX.md` |
| Requirements | `docs/business-features/{Module}/README.md` |
| Test Specs | `docs/test-specs/{Module}/README.md` |
| Detailed Features | `docs/business-features/{Module}/detailed-features/` |

### Dynamic Module Discovery

When `/refine` or gap analysis needs module context:

1. **From Idea Frontmatter**: If idea has `related_module`, use that
2. **From Keywords**: Parse idea title/problem, match against module frontmatter
3. **Entity Inspection**: Use `domain_path` from module frontmatter:
   ```
   {frontmatter.domain_path}/Entities/*.cs
   ```

**Frontmatter Schema**: See `docs/templates/detailed-feature-docs-template.md`

### Related Workflows

- `/refine` command auto-searches business documentation
- Extract FR-XX and TC-XX IDs from related features
- Note documentation gaps in PBI output
- Cross-reference entity inspection results from `/idea`

---

## Workflow Integration

### Refining Ideas to PBIs
When user runs `/refine {idea-file}`:
1. Read idea artifact
2. Extract requirements
3. Identify acceptance criteria
4. Create PBI with GIVEN/WHEN/THEN format
5. Save to `team-artifacts/pbis/`

### Creating User Stories
When user runs `/story {pbi-file}`:
1. Read PBI
2. Break into vertical slices
3. Write user stories with AC
4. Ensure INVEST criteria met
5. Save to `team-artifacts/pbis/stories/`

---

## Templates

### User Story Template
```markdown
---
id: US-{YYMMDD}-{NNN}
parent_pbi: "{PBI-ID}"
persona: "{Persona name}"
priority: P1 | P2 | P3
effort: 1 | 2 | 3 | 5 | 8 | 13
status: draft | ready | in_progress | done
---

# User Story

**As a** {user role}
**I want** {goal}
**So that** {benefit}

## Acceptance Criteria

### Scenario 1: {Happy path title}
```gherkin
Given {context}
When {action}
Then {outcome}
```

### Scenario 2: {Edge case title}
```gherkin
Given {context}
When {action}
Then {outcome}
```

### Scenario 3: {Error case title}
```gherkin
Given {context}
When {invalid action}
Then {error handling}
```

## Out of Scope
- {Explicitly excluded item}

## Notes
- {Implementation guidance}
```

---

## Elicitation Techniques

### 5 Whys
1. Why? → {answer}
2. Why? → {answer}
3. Why? → {answer}
4. Why? → {answer}
5. Why? → {root cause}

### SMART Criteria for Requirements
- **S**pecific: Clear and unambiguous
- **M**easurable: Can verify completion
- **A**chievable: Technically feasible
- **R**elevant: Aligned with business goals
- **T**ime-bound: Has a deadline or sprint

---

## Output Conventions

### File Naming
```
{YYMMDD}-ba-story-{slug}.md
{YYMMDD}-ba-requirements-{slug}.md
```

### Requirement IDs
- Functional: `FR-{MOD}-{NNN}` (e.g., FR-GROW-001)
- Non-Functional: `NFR-{MOD}-{NNN}`
- Business Rule: `BR-{MOD}-{NNN}`

### AC IDs
- `AC-{NNN}` per story/PBI

---

## Quality Checklist

Before completing BA artifacts:
- [ ] User story follows "As a... I want... So that..." format
- [ ] At least 3 scenarios: happy path, edge case, error case
- [ ] All scenarios use GIVEN/WHEN/THEN
- [ ] Out of scope explicitly listed
- [ ] Story meets INVEST criteria
- [ ] No solution-speak in requirements (only outcomes)
