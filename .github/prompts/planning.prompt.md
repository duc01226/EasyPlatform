---
description: "Implementation planning with mental models and risk assessment"
---

# Implementation Planning

Strategic planning framework using mental models, risk assessment, and structured decomposition.

## Core Principle

**Plan before implementing ANY non-trivial task.**

Exceptions: Single-line fixes, user says "just do it", pure research with no changes.

## Mental Models

### 1. Decomposition

Break complex problems into independent, manageable pieces.

**Technique:**
- Identify distinct subtasks
- Find natural boundaries
- Minimize dependencies
- Enable parallel work

**Example:**
```
Task: Add user authentication
├─ Backend: JWT token generation
├─ Backend: User validation
├─ Frontend: Login form
├─ Frontend: Auth state management
└─ Integration: Token storage
```

### 2. Working Backwards

Start from desired outcome, work back to current state.

**Technique:**
1. Define success criteria
2. Identify what's needed for success
3. Work backward to current state
4. Fill gaps

**Example:**
```
Goal: Dashboard shows real-time data
  ↑ Need: WebSocket connection
  ↑ Need: WebSocket endpoint
  ↑ Need: Data source configured
  ↑ Current: Static data only
```

### 3. 80/20 Rule (Pareto Principle)

Focus on 20% of work that delivers 80% of value.

**Technique:**
- Identify core functionality
- Separate essential from nice-to-have
- Implement core first
- Add enhancements later (if needed)

**Example:**
```
Essential (Do First):
- User can create account
- User can login
- User can logout

Nice-to-have (Later):
- Profile pictures
- OAuth providers
- Remember me
```

### 4. Risk Assessment

Identify and mitigate risks early.

**Risk Matrix:**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| API breaking change | High | High | Version API, deprecate old |
| Performance degradation | Medium | High | Benchmark before/after |
| Data migration failure | Low | Critical | Test on copy first |
| Missing dependency | Medium | Low | Check early, document |

### 5. Dependency Management

Map and sequence dependencies.

**Technique:**
```
A (no deps)
├─ B (depends on A)
│  ├─ D (depends on B)
│  └─ E (depends on B)
└─ C (depends on A)
   └─ F (depends on C)

Execution order: A → (B, C) parallel → (D, E, F) parallel
```

## Plan Structure

### 1. Problem Statement

**What are we solving?**

- Clear description of problem
- Current state vs desired state
- Success criteria (measurable)
- Constraints and requirements

**Template:**
```
Problem: [Description]
Current: [Current state]
Desired: [Target state]
Success: [Measurable criteria]
Constraints: [Limitations]
```

### 2. Investigation Phase

**What do we know?**

- Related code locations
- Existing patterns to follow
- Dependencies to consider
- Risks to mitigate

**Checklist:**
- [ ] Searched for similar implementations
- [ ] Identified service boundaries
- [ ] Checked for existing utilities
- [ ] Reviewed relevant documentation

### 3. Approach Decision

**How will we solve it?**

- Chosen approach with justification
- Alternatives considered and rejected
- Pattern selection
- Technology choices

**Template:**
```
Approach: [Chosen solution]
Why: [Justification]
Alternatives: [Why not chosen]
Patterns: [Which patterns apply]
```

### 4. Task Breakdown

**What specific steps?**

- Numbered list of concrete tasks
- Each task is independently verifiable
- Dependencies clearly marked
- Parallel work identified

**Format:**
```
1. [Task] - [Est. time] - [Deps: none]
2. [Task] - [Est. time] - [Deps: 1]
3. [Task] - [Est. time] - [Deps: 1]
4. [Task] - [Est. time] - [Deps: 2,3]
```

### 5. Verification Plan

**How do we know it works?**

- Test strategy
- Verification steps
- Rollback plan
- Monitoring approach

**Checklist:**
- [ ] Unit tests for core logic
- [ ] Integration tests for endpoints
- [ ] Manual testing checklist
- [ ] Performance benchmarks
- [ ] Rollback procedure documented

## YAGNI/KISS/DRY Principles

### YAGNI (You Aren't Gonna Need It)

**Don't build what you don't need right now.**

**Questions:**
- Is this needed for current requirements?
- Is this used anywhere?
- Can we add it later when needed?

**Examples:**
- ❌ Add comprehensive logging framework → ✅ Add simple console logging
- ❌ Build flexible plugin system → ✅ Hard-code single implementation
- ❌ Create reusable component library → ✅ Build specific component needed

### KISS (Keep It Simple, Stupid)

**Simplest solution that works.**

**Questions:**
- Is there a simpler approach?
- Am I over-engineering this?
- Can I reduce complexity?

**Examples:**
- ❌ Complex state machine → ✅ Simple if/else logic
- ❌ Abstract factory pattern → ✅ Direct instantiation
- ❌ Custom framework → ✅ Use existing tool

### DRY (Don't Repeat Yourself)

**Avoid code duplication.**

**Questions:**
- Does this logic exist elsewhere?
- Can I reuse existing code?
- Should I extract common functionality?

**Examples:**
- ❌ Copy-paste validation → ✅ Shared validation function
- ❌ Duplicate API calls → ✅ Reusable service method
- ❌ Repeated calculations → ✅ Extract to utility

## Risk Assessment Matrix

### Risk Categories

**Technical Risks:**
- Breaking changes
- Performance degradation
- Security vulnerabilities
- Data corruption
- Integration failures

**Project Risks:**
- Unclear requirements
- Missing dependencies
- Timeline pressure
- Resource constraints
- Scope creep

### Risk Levels

**Critical (Stop & Reassess):**
- Data loss possible
- Security breach possible
- System-wide outage
- No rollback option

**High (Mitigate First):**
- Breaking changes for users
- Performance significantly worse
- Complex migration required
- Limited testing ability

**Medium (Monitor):**
- Minor breaking changes
- Some performance impact
- Moderate complexity
- Adequate testing available

**Low (Accept):**
- No breaking changes
- Minimal impact
- Simple implementation
- Well-tested

### Mitigation Strategies

**For Critical/High Risks:**
1. Create proof of concept
2. Test on isolated environment
3. Implement feature flags
4. Prepare rollback plan
5. Add comprehensive monitoring
6. Get peer review

**For Medium Risks:**
1. Document approach
2. Add tests
3. Monitor metrics
4. Review with team

**For Low Risks:**
1. Proceed normally
2. Standard testing
3. Basic monitoring

## Decision Trees

### Backend Task Decision

```
Backend Task?
├─ New API endpoint?
│  ├─ Create/Update/Delete? → CQRS Command
│  └─ Read/Query? → CQRS Query
├─ Business logic?
│  └─ Command Handler
├─ Data access?
│  └─ Repository Extension
├─ Side effects?
│  └─ Entity Event Handler
├─ Scheduled task?
│  └─ Background Job
└─ Cross-service?
   └─ Message Bus Consumer
```

### Frontend Task Decision

```
Frontend Task?
├─ Simple component?
│  └─ PlatformComponent
├─ Complex state?
│  └─ PlatformVmStoreComponent + Store
├─ Form handling?
│  └─ PlatformFormComponent
├─ API calls?
│  └─ PlatformApiService
├─ Reusable logic?
│  └─ Extract to platform-core
└─ Cross-domain?
   └─ apps-domains library
```

## Plan Template

```markdown
# Implementation Plan: [Feature Name]

## Problem Statement

**Current:** [Current state]
**Desired:** [Target state]
**Success Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

## Investigation

**Related Code:**
- [File/Location 1]
- [File/Location 2]

**Patterns to Follow:**
- [Pattern 1 with example]
- [Pattern 2 with example]

**Dependencies:**
- [Dependency 1]
- [Dependency 2]

## Approach

**Chosen:** [Solution approach]
**Why:** [Justification]
**Alternatives Rejected:** [Why not chosen]

## Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| [Risk 1] | High | [How to mitigate] |
| [Risk 2] | Medium | [How to mitigate] |

## Tasks

1. **[Task 1]** - Est: 30min - Deps: none
   - [Subtask 1.1]
   - [Subtask 1.2]

2. **[Task 2]** - Est: 1hr - Deps: 1
   - [Subtask 2.1]

3. **[Task 3]** - Est: 45min - Deps: 1
   - [Subtask 3.1]

**Total Estimate:** [Total time]

## Verification

**Tests:**
- [ ] Unit tests for [component]
- [ ] Integration tests for [endpoint]
- [ ] Manual test: [scenario]

**Success Verification:**
- [ ] All tests pass
- [ ] No regressions
- [ ] Performance acceptable
- [ ] Documentation updated

## Rollback

**If something goes wrong:**
1. [Rollback step 1]
2. [Rollback step 2]
```

## Workflow

1. **Receive Task**
   - Understand requirements
   - Identify complexity level
   - Decide if planning needed

2. **Investigate** (if planning needed)
   - Search codebase for patterns
   - Identify dependencies
   - Assess risks

3. **Create Plan**
   - Use template above
   - Apply mental models
   - Break into tasks
   - Get approval

4. **Implement**
   - Follow plan tasks in order
   - Verify each step
   - Update plan if deviations

5. **Verify**
   - Run all verification steps
   - Check success criteria
   - Document completion

## Bottom Line

**Plan for:**
- New features
- Refactoring
- Migrations
- Complex bugs
- Anything non-trivial

**Planning prevents:**
- Rework from wrong approach
- Missing requirements
- Scope creep
- Integration issues
- Unexpected risks

**Investigate → Plan → Approve → Implement → Verify**
