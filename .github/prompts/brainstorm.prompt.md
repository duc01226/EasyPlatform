---
agent: agent
description: Brainstorm solutions for technical challenges. Explore alternatives, evaluate trade-offs, and find optimal approaches.
---

# Solution Brainstorming

Brainstorm solutions for the given technical challenge.

## Challenge
$input

## Core Principles

Operate by the holy trinity of software engineering:
- **YAGNI** - You Aren't Gonna Need It
- **KISS** - Keep It Simple, Stupid
- **DRY** - Don't Repeat Yourself

## Expertise Areas

- System architecture design and scalability patterns
- Risk assessment and mitigation strategies
- Development time optimization
- User Experience (UX) and Developer Experience (DX)
- Technical debt management
- Performance optimization

## Brainstorming Process

### Phase 1: Discovery
Ask clarifying questions:
- What problem are we solving?
- What are the constraints (time, resources, tech stack)?
- Who are the stakeholders?
- What does success look like?
- What's the scope (MVP vs full solution)?

### Phase 2: Research
- Search codebase for similar implementations
- Check existing platform patterns
- Consider EasyPlatform-specific constraints:
  - Backend: Easy.Platform, CQRS, message bus
  - Frontend: Angular 19, PlatformVmStore, BEM

### Phase 3: Generate Options

Present 2-3 viable approaches:

```markdown
## Option A: [Name]

**Description:** [Brief explanation]

**Pros:**
- [Advantage 1]
- [Advantage 2]

**Cons:**
- [Disadvantage 1]
- [Disadvantage 2]

**Effort:** [Low/Medium/High]
**Risk:** [Low/Medium/High]

---

## Option B: [Name]
...
```

### Phase 4: Evaluate Trade-offs

| Criteria | Option A | Option B | Option C |
|----------|----------|----------|----------|
| Complexity | Low/Med/High | | |
| Maintainability | | | |
| Performance | | | |
| Time to implement | | | |
| Platform alignment | | | |
| Future flexibility | | | |

### Phase 5: Recommend

```markdown
## Recommendation

**Preferred Option:** [Option X]

**Rationale:**
[Why this option is best given the constraints]

**Key Considerations:**
- [Important point 1]
- [Important point 2]

**Risks to Monitor:**
- [Risk 1] - Mitigation: [strategy]
```

### Phase 6: Next Steps

If user agrees with recommendation:
- Offer to create detailed implementation plan using `@plan`
- Identify first steps
- List dependencies and prerequisites

## Output Requirements

When brainstorming concludes, create summary including:
- Problem statement and requirements
- Evaluated approaches with pros/cons
- Final recommended solution with rationale
- Implementation considerations and risks
- Success metrics and validation criteria
- Next steps and dependencies

## Critical Constraints

- **DO NOT implement** - only brainstorm and advise
- Validate feasibility before endorsing any approach
- Prioritize long-term maintainability over short-term convenience
- Consider both technical excellence and business pragmatism
- Be brutally honest about trade-offs and limitations

## EasyPlatform-Specific Considerations

**Backend:**
- Use service-specific repositories
- CQRS pattern for commands/queries
- Side effects via Entity Event Handlers
- Cross-service via message bus only

**Frontend:**
- Extend platform base components
- PlatformVmStore for state
- BEM classes on all elements
- untilDestroyed() for subscriptions
