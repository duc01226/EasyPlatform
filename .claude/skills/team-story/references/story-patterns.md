# Story Patterns Reference

Detailed patterns for the `/team-story` skill.

---

## Domain Context Loading

When slicing domain-related PBIs, automatically load business context.

### Step 1: Detect Module

**From PBI frontmatter:**
1. Check `module` field
2. If missing, detect from keywords: Read `.claude/skills/shared/module-detection-keywords.md`

### Step 2: Load Feature Context

```
Glob("docs/business-features/{module}/detailed-features/*.md")
```

1. Read module README (first 200 lines)
2. Identify related feature from `related_features` list
3. Extract existing business rules (BR-{MOD}-XXX)
4. Note entity names from feature docs

### Step 3: Apply Domain Vocabulary

| Module | Correct Term | Avoid |
|--------|--------------|-------|
| TextSnippet | Snippet | Note, Text |
| TextSnippet | Category | Tag, Label |
| TextSnippet | Collection | Group, Folder |
| Platform.Core | Repository | DataStore, Persistence |
| Platform.Core | Entity | Model, Record |

### Step 4: Include in Story

```markdown
## Domain Context

**Module:** {detected module}
**Feature:** {related feature}
**Entities:** {Entity1}, {Entity2}
**Business Rules:** BR-{MOD}-XXX (from feature docs)
```

---

## Scenario Templates

### Minimum 3 scenarios per story:

### 1. Happy Path (Positive)

```gherkin
Scenario: User successfully {completes action}
  Given {user has required permissions/state}
  And {required data exists}
  When user {performs valid action}
  Then {primary expected outcome}
  And {secondary verification if needed}
```

### 2. Edge Case (Boundary)

```gherkin
Scenario: System handles {boundary condition}
  Given {edge state: empty list, max items, zero value}
  When user {attempts action at boundary}
  Then {appropriate handling: pagination, warning, default}
```

### 3. Error Case (Negative)

```gherkin
Scenario: System prevents {invalid action}
  Given {precondition}
  When user {provides invalid input OR unauthorized action}
  Then error message "{specific error message}"
  And {system remains in valid state}
  And {no partial changes saved}
```

### Additional Scenario Types

**Security:** Unauthorized access attempt
**Performance:** Response time under load
**Concurrency:** Simultaneous user actions
**Integration:** External service unavailable

---

## SPIDR Splitting Examples

**Paths:** "User can pay by card OR PayPal" -> Story A: Card payment, Story B: PayPal payment

**Data:** "Import CSV, Excel, JSON" -> Story A: CSV import, Story B: Excel import, Story C: JSON import

**Rules:** "Different approval flows by amount" -> Story A: <$1000 auto-approve, Story B: >$1000 manager approval

---

## Story Artifact Template

```markdown
---
id: US-{YYMMDD}-{NNN}
parent_pbi: "{PBI-ID}"
title: "{Brief story title}"
persona: "{User persona}"
priority: P1 | P2 | P3
effort: 1 | 2 | 3 | 5 | 8
status: draft | ready | in_progress | done
module: "{module}"
---

# User Stories for {PBI Title}

## Story 1: {Title}

**As a** {user role}
**I want** {goal}
**So that** {benefit}

### Acceptance Criteria

#### Scenario 1: {Happy path title}
```gherkin
Given {context}
When {action}
Then {outcome}
```

#### Scenario 2: {Edge case title}
```gherkin
Given {edge state}
When {action}
Then {handling}
```

#### Scenario 3: {Error case title}
```gherkin
Given {context}
When {invalid action}
Then error "{message}"
```

---

## Out of Scope

- {Explicitly excluded items}

## Dependencies

- **Upstream:** {What must be done first}
- **Downstream:** {What depends on this}

## Domain Context

**Module:** {module}
**Related Feature:** {feature doc path}
**Entities:** {Entity1}, {Entity2}
**Business Rules:** {BR-XXX references}

## Validation Summary

**Validated:** {date}

### Confirmed
- {decision}: {user choice}

### Action Items
- [ ] {follow-up if any}
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|------------------|
| Horizontal slicing | "Backend story" + "Frontend story" = delays value | Vertical slice: thin end-to-end functionality |
| Single scenario | Missing edge/error cases | Minimum 3 scenarios: happy, edge, error |
| Vague criteria | "Fast", "user-friendly" untestable | Quantify: "< 200ms", "<= 3 clicks" |
| Solution-speak | "Use Redis cache" constrains team | Outcome: "Results return within 200ms" |
| Effort >8 | Won't fit sprint, hard to estimate | Apply SPIDR, split until <= 8 |
| No error scenario | Missing negative test coverage | Always include invalid input handling |
| Generic persona | "As a user" too vague | Specific: "As a hiring manager" |

---

## Validation Step (MANDATORY)

After creating user stories, validate with user.

### Question Categories

| Category | Example Question |
|----------|------------------|
| **Slicing** | "Are the story slices independent enough?" |
| **Size** | "Any story >8 effort that needs further splitting?" |
| **Scenarios** | "Any acceptance criteria missing for edge cases?" |
| **Dependencies** | "Are there hidden dependencies between stories?" |
| **Scope** | "Should anything be explicitly excluded?" |

### Process

1. Generate 2-4 questions focused on slicing quality, scenarios, and dependencies
2. Use `AskUserQuestion` tool to interview
3. Document in story artifact under `## Validation Summary`
4. Update stories based on answers (split if needed)

**This step is NOT optional.**
