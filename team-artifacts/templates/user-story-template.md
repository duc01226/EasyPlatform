---
id: US-{YYMMDD}-{NNN}
parent_pbi: "{PBI-XXXXXX-NNN}"
title: "{As a... I want... So that...}"
persona: "{User persona}"
priority: P1 | P2 | P3
effort: 1 | 2 | 3 | 5 | 8 | 13
status: draft | ready | in_progress | done
---

# User Story

## Story
**As a** {user role/persona}
**I want** {goal/desire}
**So that** {benefit/value}

## Acceptance Criteria

### Scenario 1: {Happy path}
```gherkin
Given {precondition}
And {additional context}
When {action}
Then {expected result}
And {additional verification}
```

### Scenario 2: {Edge case}
```gherkin
Given {precondition}
When {action}
Then {expected result}
```

### Scenario 3: {Error case}
```gherkin
Given {precondition}
When {invalid action}
Then {error handling}
```

## UI/UX Notes
<!-- Interaction details, visual requirements -->

## Technical Implementation Notes
<!-- Backend/frontend considerations -->

## Definition of Done
- [ ] Code complete and reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests pass
- [ ] Documentation updated
- [ ] Acceptance criteria verified by QA
- [ ] PO sign-off received

---
*Generated from PBI: {parent_pbi}*
