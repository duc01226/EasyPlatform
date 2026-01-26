# Refinement Workflow Details

Detailed phase descriptions for the `/refine` skill.

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

## Phase 6: Prioritization & Estimation

Read `.claude/skills/shared/team-frameworks.md` for RICE, MoSCoW, and INVEST frameworks.

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

### Update Source Idea

After PBI creation:
- Set source idea status to `approved`
- Add link to created PBI in idea file

### Template Reference

See: `team-artifacts/templates/pbi-template.md`

---

## Anti-Patterns to Avoid

| Anti-Pattern | Better Approach |
|--------------|-----------------|
| Refining vague ideas | Return to `/idea` for clarification |
| Skipping hypothesis validation | Always run Phase 3 for new features |
| Solution-first thinking | Start with problem, not solution |
| Generic acceptance criteria | Use GIVEN/WHEN/THEN with specifics |
| Ignoring domain context | Load business docs if applicable |
| Too large PBI (XL+) | Break into smaller items |
| Missing "Out of Scope" | Explicitly list exclusions |
| Assuming instead of asking | Run validation interview |

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
| **Domain Context** | BR/entity context loaded (if applicable) |
| **Stakeholder Aligned** | Validation interview completed |
