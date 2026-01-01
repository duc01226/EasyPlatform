---
agent: 'ask'
description: 'Explain code structure, business logic, and patterns'
tools: ['read', 'search']
---

# Explain Code

Provide a comprehensive explanation of the following code or feature:

**Target:** ${input:target}

## Analysis Structure

### 1. Purpose & Business Context

- What problem does this code solve?
- What business requirement does it fulfill?
- How does it fit into the larger system?

### 2. Key Components

- Main classes/functions involved
- Their responsibilities
- How they interact

### 3. Data Flow

```
[Input] → [Processing Steps] → [Output]
```

- Where does data come from?
- How is it transformed?
- Where does it go?

### 4. Dependencies

- External services called
- Repositories accessed
- Other internal components used

### 5. Platform Patterns Used

Identify which EasyPlatform patterns are applied:

| Pattern | Location |
|---------|----------|
| CQRS Command | `UseCaseCommands/` |
| CQRS Query | `UseCaseQueries/` |
| Entity Event Handler | `UseCaseEvents/` |
| Repository Extension | `Repositories/Extensions/` |
| Platform Validation | `.Validate().And()` |
| Store Pattern | `*.store.ts` |
| Form Pattern | `extends AppBaseFormComponent` |

### 6. Edge Cases & Error Handling

- What validation is performed?
- How are errors handled?
- What edge cases are covered?

### 7. Testing Considerations

- What should be tested?
- Key scenarios to cover
- Mocking requirements

## Output Format

Structure your explanation as:

```markdown
## Overview
[Brief 2-3 sentence summary]

## Purpose
[Business context and problem solved]

## Architecture
[Component breakdown with responsibilities]

## Data Flow
[Step-by-step flow diagram]

## Key Patterns
[Platform patterns identified]

## Considerations
[Edge cases, performance, security notes]
```

## Example Questions

- "Explain how the leave request approval flow works"
- "What does the EmployeeStore do and how does it manage state?"
- "How does the SaveGoalCommand validate and process goals?"
- "Explain the message bus consumer for employee sync"
