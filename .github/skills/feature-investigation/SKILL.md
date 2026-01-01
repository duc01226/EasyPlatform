---
name: feature-investigation
description: Use when investigating, exploring, understanding, explaining, or analyzing how an existing feature or logic works. Triggers on keywords like how does, explain, what is the logic, investigate, understand, where is, trace, walk through, show me how.
---

# Feature Investigation & Logic Exploration

Expert full-stack .NET/Angular developer investigating existing features in EasyPlatform.

**KEY PRINCIPLE**: This is a **READ-ONLY exploration skill** - no code changes. Focus on understanding and explaining.

**IMPORTANT**: Always use external memory at `ai_task_analysis_notes/[feature-name]-investigation.ai_task_analysis_notes_temp.md` for structured analysis.

## Core Protocols

### ASSUMPTION_VALIDATION_CHECKPOINT

Before every major claim:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about how this works?"

### EVIDENCE_CHAIN_VALIDATION

Before claiming any relationship:

- "I believe X calls Y because..." - show actual code
- "This follows pattern Z because..." - cite specific examples
- "Service A owns B because..." - grep for actual boundaries

## Investigation Workflow

### Phase 1: Discovery

1. Parse the investigation question
2. Search for related files: entities, commands, queries, handlers, controllers, components
3. Prioritize: Domain Entities -> Commands/Queries -> Event Handlers -> Controllers -> Frontend Components
4. Document all findings before proceeding

### Phase 2: Trace Code Flow

1. **Find entry points** (API endpoint, UI action, scheduled job, message)
2. **Trace through handlers** (commands, queries, event handlers)
3. **Document data flow** step by step
4. **Map side effects** (events, notifications, cross-service calls)

### Phase 3: Document Findings

Document in the analysis file:

- **Data Flow Diagram** (text-based)
- **Key Files** with file:line references
- **Business Logic** extracted from code
- **Platform Patterns** identified

### Phase 4: Present Findings

```markdown
## Answer

[Direct answer to the question in 1-2 paragraphs]

## How It Works

### 1. [First Step]

[Explanation with code reference at `file:line`]

## Key Files

| File                  | Purpose   |
| --------------------- | --------- |
| `path/to/file.cs:123` | [Purpose] |

## Data Flow

[Text diagram showing the flow]
```

## Platform Patterns to Look For

### Backend

- `PlatformCqrsCommand` / `PlatformCqrsQuery` - CQRS entry points
- `PlatformCqrsEntityEventApplicationHandler` - Side effects
- `PlatformApplicationMessageBusConsumer` - Cross-service consumers
- `IPlatformQueryableRootRepository` - Data access

### Frontend

- `AppBaseVmStoreComponent` - State management components
- `PlatformVmStore` - Store implementations
- `effectSimple` / `tapResponse` - Effect handling

## Quick Verification Checklist

Before making any claim:

- [ ] Found actual code evidence?
- [ ] Traced the full code path?
- [ ] Checked cross-service flows?
- [ ] Documented all findings with file:line?
- [ ] Answered the original question?

If ANY unchecked, DO MORE INVESTIGATION.

---

## See Also

- `.github/instructions/backend-dotnet.instructions.md` - Backend patterns
- `.github/instructions/frontend-angular.instructions.md` - Frontend patterns
- `ai-prompt-context.md` - Platform patterns and context
