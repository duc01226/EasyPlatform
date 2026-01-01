---
agent: agent
description: Investigate and explain how existing features or code logic works. READ-ONLY exploration with no code changes.
---

# Feature Investigation

Investigate and explain how an existing feature or logic works.

## Investigation Target
$input

## Key Principle

This is a **READ-ONLY exploration** - no code changes. Focus on understanding and explaining.

## Anti-Hallucination Protocol

Before any claim:
1. "What assumptions am I making about this feature?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about how this works?"

## Investigation Process

### Phase 1: Understand the Question

1. Parse the investigation question
2. Extract keywords for search
3. Identify likely affected services:
   - TextSnippet (Example Service)
   - Platform (Framework Core)
   - PlatformExampleAppWeb (Frontend apps)

### Phase 2: Search for Code

Search patterns:
```
*Command*{Feature}*      # CQRS Commands
*Query*{Feature}*        # CQRS Queries
*{Feature}*Component*    # Angular components
*{Feature}*Service*      # Services
*{Feature}*Entity*       # Domain entities
```

Check key locations:
- `UseCaseCommands/` - Command handlers
- `UseCaseQueries/` - Query handlers
- `UseCaseEvents/` - Event handlers (side effects)
- `Domain/Entities/` - Business entities
- `libs/apps-domains/` - Frontend domain services

### Phase 3: Trace Code Flow

1. **Find entry points** - API endpoint, UI action, scheduled job
2. **Trace through handlers** - Commands, queries, events
3. **Document data flow** - Step by step
4. **Map side effects** - Events, notifications, cross-service calls

### Phase 4: Document Findings

## Output Format

```markdown
## Answer
[Direct answer to the question in 1-2 paragraphs]

## How It Works

### 1. [Entry Point]
[Explanation with code reference at `file:line`]

### 2. [Processing]
[Explanation with code reference at `file:line`]

### 3. [Output/Side Effects]
[Explanation with code reference at `file:line`]

## Key Files
| File | Purpose |
|------|---------|
| `path/to/file.cs:123` | [Purpose] |

## Data Flow
```
[Request] → [Controller] → [Handler] → [Repository] → [Response]
                             ↓
                      [Event Handler] → [Side Effects]
```

## Platform Patterns Used
- [Pattern 1]: Used for...
- [Pattern 2]: Used for...

## Related Features
- [Related feature 1]
- [Related feature 2]

## Want to Know More?
- [Topic 1]
- [Topic 2]
```

## Verification Checklist

Before presenting findings:
- [ ] Found actual code evidence?
- [ ] Traced the full code path?
- [ ] Checked cross-service flows?
- [ ] Documented all findings with file:line?
- [ ] Answered the original question?

**If ANY unchecked → DO MORE INVESTIGATION**
