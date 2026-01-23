---
name: refine
version: 2.0.0
description: Transform ideas into Product Backlog Items using BA best practices, hypothesis validation, and domain research. Use when converting ideas to PBIs, validating problem hypotheses, adding acceptance criteria, or refining requirements. Triggers on "create pbi", "refine idea", "convert to pbi", "acceptance criteria", "make actionable", "validate hypothesis".
allowed-tools: Read, Write, Edit, Grep, Glob, TodoWrite, WebSearch, AskUserQuestion
infer: true
---

# Idea Refinement to PBI

Transform captured ideas into actionable Product Backlog Items using Business Analysis best practices, Hypothesis-Driven Development, and domain research.

## When to Use

- Idea artifact ready for refinement
- Need to validate problem hypothesis before building
- Converting concept to implementable item
- Adding acceptance criteria to requirements
- Researching domain/market context for new features

## Quick Reference

### Workflow Overview

| Phase | Name | Key Activity | Output |
|-------|------|--------------|--------|
| 1 | Idea Intake | Load artifact, detect module | Context loaded |
| 2 | Domain Research | WebSearch market/competitors | Research summary |
| 3 | Problem Hypothesis | Validate problem exists | Confirmed hypothesis |
| 4 | Elicitation | Apply BABOK techniques | Requirements extracted |
| 5 | Acceptance Criteria | Write BDD scenarios | GIVEN/WHEN/THEN |
| 6 | Prioritization | Apply RICE/MoSCoW | Priority assigned |
| 7 | Validation | Interview user | Assumptions confirmed |
| 8 | PBI Generation | Create artifact | PBI file saved |

### Output

- **Path:** `team-artifacts/pbis/{YYMMDD}-pbi-{slug}.md`
- **ID Pattern:** `PBI-{YYMMDD}-{NNN}`

---

## Phase 1: Idea Intake & Context Loading

### Process

1. Read idea artifact from path or find by ID in `team-artifacts/ideas/`
2. Extract: problem statement, value proposition, target users, scope
3. Check `module` field in frontmatter for BravoSUITE domain

### Module Detection

**If module present:** Load business feature context (see BravoSUITE Integration)

**If module absent:**
1. Run `Glob("docs/business-features/*/README.md")` to discover modules
2. Analyze idea text for module keywords
3. Prompt if ambiguous: "Which BravoSUITE module?" + list + "None"

**Skip conditions:** Infrastructure ideas, cross-cutting concerns

---

## Phase 2: Domain Research

### When to Trigger

- New market/domain unfamiliar to team
- Competitive landscape unclear
- Industry best practices needed
- User explicitly requests `--research`

### Skip When

- Internal tooling with no market equivalent
- Well-understood domain
- Time-constrained refinement

### Process

1. Extract key domain terms from idea
2. Use WebSearch for context:

| Query Type | Template |
|------------|----------|
| Market trends | `"{domain} market trends 2026"` |
| Competitors | `"{domain} software solutions comparison"` |
| Best practices | `"{feature-type} best practices UX"` |
| Similar solutions | `"how {competitor} handles {feature}"` |

3. Summarize findings (max 3 bullets)

### Output Template

```markdown
## Domain Research Summary
- **Market context:** {1-sentence finding}
- **Competitor landscape:** {key players, gaps identified}
- **Best practices:** {relevant pattern to adopt}
- **Sources:** {links}
```

---

## Phase 3: Problem Hypothesis Validation

### Why This Matters

42% of startups fail due to no market need (CB Insights). Validate before building.

### Problem Hypothesis Template

```markdown
**We believe** [target users/persona]
**Experience** [specific problem]
**Because** [root cause]
**We'll know this is true when** [validation metric/evidence]
```

### Value Hypothesis Template

```markdown
**We believe** [feature/solution]
**Will deliver** [value/benefit]
**To** [target users]
**We'll know we're right when** [success metric]
```

### Validation Process

1. Draft hypothesis from idea content
2. Use AskUserQuestion to validate:
   - "Is this the core problem we're solving?"
   - "Who exactly experiences this? How often?"
   - "What evidence do we have this problem exists?"
3. If validated, proceed to Phase 4
4. If invalidated, return idea for clarification

### Skip When

- `--skip-hypothesis` flag provided
- Idea already contains validated hypothesis
- Bug fix or technical debt (no new problem)

---

## Phase 4: Requirements Elicitation (BABOK Core 5)

Select technique based on context:

### 1. Interviews

**When:** Deep individual insights needed, stakeholder perspectives vary

**Process:**
1. Prepare open-ended questions (why, how, what-if)
2. Active listening - don't lead the witness
3. Follow-up on unexpected answers
4. Document verbatim quotes for evidence

**Output:** Stakeholder needs, pain points, constraints

### 2. Workshops

**When:** Group consensus needed, complex requirements, multiple stakeholders

**Process:**
1. Define clear agenda and timebox (90 min max)
2. Use facilitator (neutral party)
3. Capture all voices (round-robin, silent voting)
4. Document decisions and dissent

**Output:** Prioritized requirements, consensus decisions

### 3. Document Analysis

**When:** Existing systems/processes to understand, regulatory requirements

**Process:**
1. Gather artifacts: specs, manuals, reports, existing code
2. Extract implicit requirements
3. Note gaps and inconsistencies
4. Cross-reference with stakeholder input

**Output:** As-is state, compliance requirements, gaps

### 4. Observation (Job Shadowing)

**When:** Understand real workflow, users can't articulate needs

**Process:**
1. Shadow users in their environment
2. Note workarounds and pain points
3. Don't interrupt or suggest - just observe
4. Ask clarifying questions afterward

**Output:** Actual vs stated workflow, hidden requirements

### 5. Prototyping

**When:** Visual validation needed, UI/UX requirements unclear

**Process:**
1. Start low-fidelity (sketches, wireframes)
2. Iterate based on feedback
3. Increase fidelity as requirements stabilize
4. Document design decisions

**Output:** Validated UI requirements, interaction patterns

---

## Phase 5: Acceptance Criteria (BDD Format)

### Standard Format

```gherkin
Scenario: {Descriptive title}
  Given {precondition/context}
    And {additional context}
  When {action/trigger}
    And {additional action}
  Then {expected outcome}
    And {additional verification}
```

### Best Practices

| Practice | Description |
|----------|-------------|
| Single trigger | "When" clause has ONE action |
| 3 scenarios minimum | Happy path, edge case, error case |
| No implementation details | Focus on behavior, not how |
| Testable outcomes | "Then" must be verifiable |
| Stakeholder language | No technical jargon |

### Example Scenarios

```gherkin
Scenario: Employee creates goal with valid data
  Given employee has permission to create goals
    And employee is on the goal creation page
  When employee submits goal form with all required fields
  Then goal is created with status "Draft"
    And goal appears in employee's goal list

Scenario: Goal creation fails with missing required field
  Given employee is on the goal creation page
  When employee submits form without title
  Then validation error "Title is required" is displayed
    And goal is not created

Scenario: Manager reviews subordinate goal
  Given manager has direct reports
    And subordinate has submitted goal for review
  When manager opens goal review page
  Then subordinate's goal is visible with "Pending Review" status
```

### BravoSUITE Test Case Format

For domain features, use:
- **Format:** `TC-{MOD}-{FEATURE}-XXX` (e.g., TC-GRO-GOAL-001)
- **Evidence:** `file:line` format
- See `business-analyst` skill for detailed patterns

---

## Phase 6: Prioritization & Estimation

### Quick RICE Score

```
Score = (Reach × Impact × Confidence) / Effort

Reach: Users affected per quarter (100, 500, 1000+)
Impact: 0.25 (minimal) | 0.5 (low) | 1 (medium) | 2 (high) | 3 (massive)
Confidence: 0.5 (low) | 0.8 (medium) | 1.0 (high)
Effort: Person-days (1, 3, 5, 10, 20)
```

### MoSCoW Categories

| Category | Meaning | Action |
|----------|---------|--------|
| **Must Have** | Critical, non-negotiable | Include in MVP |
| **Should Have** | Important but not vital | Plan for release |
| **Could Have** | Nice to have, low effort | If time permits |
| **Won't Have** | Out of scope this cycle | Document for future |

### Effort Estimation

| T-Shirt | Days | When to Use |
|---------|------|-------------|
| XS | 0.5-1 | Config change, simple fix |
| S | 1-2 | Single component, clear scope |
| M | 3-5 | Multiple components, some unknowns |
| L | 5-10 | Cross-cutting, integration needed |
| XL | 10+ | Epic - break down further |

---

## Phase 7: Validation Interview (MANDATORY)

After drafting PBI, validate with user.

### Question Categories

| Category | Example Question |
|----------|------------------|
| **Assumptions** | "We assume X is true. Correct?" |
| **Scope** | "Should Y be included or explicitly excluded?" |
| **Dependencies** | "This requires Z. Is that available?" |
| **Edge Cases** | "What happens when data is empty/null?" |
| **Business Impact** | "Will this affect existing reports/workflows?" |
| **Entities** | "Create new entity or extend existing X?" |

### Process

1. Generate 3-5 questions from assumptions, scope, dependencies
2. Use `AskUserQuestion` tool to interview
3. Document in PBI under `## Validation Summary`
4. Update PBI based on answers

### Validation Output Format

```markdown
## Validation Summary

**Validated:** {date}

### Confirmed Decisions
- {decision}: {user choice}

### Assumptions Confirmed
- {assumption}: Confirmed/Modified

### Open Items
- [ ] {follow-up items}
```

**This step is NOT optional - always validate before marking complete.**

---

## Phase 8: PBI Artifact Generation

### Save Location

`team-artifacts/pbis/{YYMMDD}-pbi-{slug}.md`

### Required Sections

1. Frontmatter (ID, source_idea, priority, effort, status, module)
2. Description
3. Business Value
4. Problem Hypothesis (from Phase 3)
5. Related Business Rules (if domain)
6. Acceptance Criteria (from Phase 5)
7. Out of Scope
8. Dependencies
9. Validation Summary (from Phase 7)

### Template Reference

See: `team-artifacts/templates/pbi-template.md`

---

## Definition of Ready Checklist

Before marking PBI as "Ready":

| Criterion | Check |
|-----------|-------|
| **I**ndependent | No blocking dependencies on other PBIs |
| **N**egotiable | Details can still be refined with team |
| **V**aluable | Clear user/business value articulated |
| **E**stimable | Team can estimate effort (XS-XL) |
| **S**mall | Can complete in single sprint |
| **T**estable | Has 3+ GIVEN/WHEN/THEN scenarios |
| **Problem Validated** | Hypothesis confirmed in Phase 3 |
| **Domain Context** | BR/entity context loaded (if BravoSUITE) |
| **Stakeholder Aligned** | Validation interview completed |

---

## BravoSUITE Integration

For domain-related PBIs, load business feature context.

### Module Detection

Reference: `.claude/skills/shared/module-detection-keywords.md`

### Business Rules Extraction

1. Read `docs/business-features/{module}/README.md`
2. Identify related feature doc
3. Extract BR-{MOD}-XXX rules from "Business Rules" section
4. Note conflicts with new requirements

### Entity Context

1. Read `.ai.md` companion file
2. Extract entity names, properties, relationships
3. Identify key expressions for queries

### Token Budget

Target 8-12K tokens for feature context:
- Module README: ~2K tokens
- Feature doc sections: 3-5K per feature

**Detailed patterns:** See `business-analyst` skill

---

## Anti-Patterns to Avoid

| Anti-Pattern | Better Approach |
|--------------|-----------------|
| Refining vague ideas | Return to `/idea` for clarification |
| Skipping hypothesis validation | Always run Phase 3 for new features |
| Solution-first thinking | Start with problem, not solution |
| Generic acceptance criteria | Use GIVEN/WHEN/THEN with specifics |
| Ignoring domain context | Load BravoSUITE docs if applicable |
| Too large PBI (XL+) | Break into smaller items |
| Missing "Out of Scope" | Explicitly list exclusions |
| Assuming instead of asking | Run validation interview |

---

## Templates Quick Reference

### Problem Hypothesis

```markdown
**We believe** {users} **experience** {problem} **because** {cause}.
**Validation:** {metric/evidence}
```

### Value Hypothesis

```markdown
**We believe** {solution} **will deliver** {value} **to** {users}.
**Success metric:** {how we measure}
```

### Acceptance Criteria

```gherkin
Scenario: {Title}
  Given {context}
  When {action}
  Then {outcome}
```

---

## Related

- **Role Skill:** `business-analyst` (detailed patterns)
- **Command:** `/refine`
- **Input:** `/idea` output
- **Next Step:** `/story`, `/test-spec`, `/design-spec`
- **Prioritization:** `/prioritize`

## Triggers

Activates on: refine, refinement, pbi, backlog item, acceptance criteria, hypothesis, validate idea

---

> **Task Management Protocol:**
> - Always plan and break work into many small todo tasks
> - Always add a final review todo task to verify work quality and identify fixes/enhancements
