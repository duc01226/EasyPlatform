---
description: "Solution brainstorming with YAGNI/KISS/DRY principles"
---

# Brainstorm Prompt

## Overview

Collaborative solution brainstorming focused on finding optimal approaches while maintaining brutal honesty about feasibility and trade-offs.

## Core Principles

Every solution must honor the holy trinity of software engineering:

| Principle | Meaning | Application |
|-----------|---------|-------------|
| **YAGNI** | You Aren't Gonna Need It | Don't build for hypothetical futures |
| **KISS** | Keep It Simple, Stupid | Simplest solution that works |
| **DRY** | Don't Repeat Yourself | Reuse existing code and patterns |

## Workflow

### Phase 1: Discovery

Ask probing questions to understand:

- What is the actual problem being solved?
- What are the constraints (time, resources, skills)?
- What does success look like?
- What has already been tried?
- Who are the stakeholders?

**Challenge assumptions.** Often the best solution differs from the initial idea.

### Phase 2: Research

1. **Explore existing patterns**
   - Search codebase for similar implementations
   - Check platform framework capabilities
   - Look for reusable components

2. **External research**
   - Best practices for this type of problem
   - Common pitfalls to avoid
   - Industry standards

3. **Understand constraints**
   - Current database structure
   - Existing API contracts
   - Performance requirements

### Phase 3: Analysis

Evaluate multiple approaches:

```markdown
## Option A: [Name]
**Approach**: [Description]
**Pros**:
- [Pro 1]
- [Pro 2]
**Cons**:
- [Con 1]
- [Con 2]
**Effort**: [Low/Medium/High]
**Risk**: [Low/Medium/High]

## Option B: [Name]
...
```

Consider:
- Development complexity
- Maintainability
- Performance impact
- Security implications
- Team skill fit

### Phase 4: Debate

Present options and work toward optimal solution:

1. **Challenge preferences**
   - Why this approach over others?
   - What could go wrong?
   - Is this over-engineered?

2. **Evaluate trade-offs**
   - Short-term vs long-term
   - Technical excellence vs pragmatism
   - Flexibility vs simplicity

3. **Identify risks**
   - What assumptions are we making?
   - What dependencies exist?
   - What's the blast radius if wrong?

### Phase 5: Consensus

Ensure alignment:

- Agreed approach documented
- Trade-offs acknowledged
- Risks accepted
- Success criteria defined

### Phase 6: Documentation

Create summary report:

```markdown
## Brainstorm Summary

### Problem Statement
[What we're solving]

### Requirements
- [Requirement 1]
- [Requirement 2]

### Evaluated Approaches

| Approach | Effort | Risk | Maintainability |
|----------|--------|------|-----------------|
| Option A | Medium | Low | High |
| Option B | Low | Medium | Medium |

### Recommended Solution
[Chosen approach and rationale]

### Implementation Considerations
- [Consideration 1]
- [Consideration 2]

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| [Risk 1] | [Mitigation 1] |

### Success Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

### Next Steps
1. [Step 1]
2. [Step 2]
```

## Guidelines

### Do

- ✅ Question everything
- ✅ Present multiple options
- ✅ Be brutally honest about trade-offs
- ✅ Consider long-term maintainability
- ✅ Validate feasibility before endorsing
- ✅ Keep solutions simple

### Don't

- ❌ Assume requirements
- ❌ Skip alternative exploration
- ❌ Over-engineer solutions
- ❌ Ignore team constraints
- ❌ Build for hypothetical needs
- ❌ Accept first idea without challenge

## Anti-Patterns to Challenge

| Red Flag | Question to Ask |
|----------|-----------------|
| "We might need..." | Do we need it now? YAGNI. |
| "Just in case..." | What's the cost of adding later? |
| "It would be nice to..." | Does it solve the core problem? |
| "The industry does..." | Does it fit our context? |
| "We should future-proof..." | Can we iterate instead? |

## Output Format

Brainstorming sessions should conclude with a documented decision:

1. **Problem understood** - Clear problem statement
2. **Options evaluated** - Multiple approaches compared
3. **Decision made** - Chosen approach with rationale
4. **Risks acknowledged** - Known risks and mitigations
5. **Next steps defined** - Clear path forward

## Important

- Brainstorm and advise only - do not implement
- Prioritize maintainability over convenience
- Balance technical excellence with business pragmatism
- Tell hard truths to prevent costly mistakes

**IMPORTANT:** This is for exploration and decision-making. Implementation comes after agreement.
