---
description: Refine an idea into a Product Backlog Item with acceptance criteria
argument-hint: [idea-file or IDEA-ID]
---

# Refine Idea to PBI

Transform a raw idea into a structured Product Backlog Item with business documentation cross-reference.

**Idea File**: $ARGUMENTS

## Pre-Workflow

### Activate Skills

- Activate `business-analyst` skill for requirements analysis and INVEST criteria

## Workflow

### 1. Load Idea

- Read idea file from path or find by ID in `team-artifacts/ideas/`
- Extract problem statement, value, users, scope
- Extract `related_module` from idea frontmatter (if present)

### 2. Load Business Context

1. **If `related_module` present in idea**: Use that module
2. **Otherwise**: Discover module from idea keywords:
    - Glob: `docs/business-features/*/README.md`
    - Parse frontmatter, match `keywords`/`aliases`/`features`
    - Score and select highest match
    - If no match: Prompt user to select from available modules
3. **Read**: `docs/business-features/{Module}/INDEX.md`
4. **Read**: `docs/business-features/{Module}/README.md` (Overview + Requirements sections)
5. **Extract**: `domain_path` from frontmatter for entity inspection (Step 5)
6. **Note**: "Loaded business context from {Module}"

### 2.5. Search Business Documentation

- Glob: `docs/business-features/{Module}/detailed-features/*.md`
- Search for related features by keywords from idea title/problem
- List similar features found with descriptions
- Extract relevant FR-XX IDs (functional requirements)
- Extract relevant TC-XX IDs (test cases)
- Note gaps or overlaps with existing documentation:
    - "This extends existing feature FR-XX"
    - "This fills documentation gap: {description}"
    - "This may overlap with FR-XX - verify differentiation"

### 3. Generate Acceptance Criteria

- Create at least 3 scenarios:
    - Happy path
    - Edge case
    - Error case
- Use GIVEN/WHEN/THEN format
- Reference existing TC-XX patterns where applicable

### 4. Identify Dependencies

1. **Entity Inspection** (using `domain_path` from Step 3):
    - Glob: `{domain_path}/Entities/*.cs`
    - Extract entity class names (extending `RootEntity<`), key properties
    - If no domain_path: Use fallback `src/*App*/**/*.Domain/Entities/*.cs`
2. **Search codebase** for related features
3. **Include dependencies** from business docs
4. **Note** upstream/downstream dependencies
5. **List related entities** from idea + newly discovered entities

### 5. Create PBI

- Generate ID: `PBI-{YYMMDD}-{NNN}`
- Link to source idea
- Set status: `backlog`
- Add frontmatter:
    - `related_module: "{Module}"`
    - `related_entities: [{from idea}]`
    - `business_docs_link: "docs/business-features/{Module}/"`
    - `related_features: [{FR-XX IDs from step 3.5}]`
    - `related_test_specs: [{TC-XX IDs from step 3.5}]`

### 6. Save Artifact

- Path: `team-artifacts/pbis/{YYMMDD}-pbi-{slug}.md`
- Add Business Documentation Reference section

### 7. Update Idea

- Set idea status: `approved`
- Add link to PBI

### 8. Validate Refinement (MANDATORY)

After creating the PBI, conduct a validation interview to:

1. **Surface assumptions**: Identify implicit assumptions that need confirmation
2. **Confirm decisions**: Validate architectural or business decisions made during refinement
3. **Check concerns**: Review potential issues, risks, or blockers
4. **Brainstorm with user**: Discuss alternative approaches or edge cases

#### INVEST Criteria Pre-Check (Flag-Only)

Before asking validation questions, verify PBI meets INVEST:

| Criterion       | Check                                  | Explanation                                          |
| --------------- | -------------------------------------- | ---------------------------------------------------- |
| **Independent** | No blocking dependencies on other PBIs | Minimizes coordination overhead                      |
| **Negotiable**  | Implementation approach flexible       | Details emerge during sprint, not locked upfront     |
| **Valuable**    | Business/user value articulated        | Every PBI delivers something stakeholders care about |
| **Estimable**   | Team can provide rough estimate        | If too vague, split or research first                |
| **Small**       | Completable in 1-2 sprints (or split)  | Enables frequent feedback and course correction      |
| **Testable**    | Acceptance criteria are verifiable     | "How do we know it's done?" must be answerable       |

Flag any failures in validation summary but proceed with questions.

#### Keyword Detection for Question Topics

Scan PBI content for these patterns to generate targeted questions:

| Category         | Keywords to Detect                                                |
| ---------------- | ----------------------------------------------------------------- |
| **Architecture** | "approach", "pattern", "design", "structure", "database", "API"   |
| **Assumptions**  | "assume", "expect", "should", "will", "must", "default"           |
| **Tradeoffs**    | "tradeoff", "vs", "alternative", "option", "choice", "either/or"  |
| **Risks**        | "risk", "might", "could fail", "dependency", "blocker", "concern" |
| **Scope**        | "phase", "MVP", "future", "out of scope", "nice to have"          |
| **Decisions**    | "decide", "TBD", "TODO", "unclear", "needs discussion"            |

#### Validation Question Categories

| Category                | What to Ask                                                      |
| ----------------------- | ---------------------------------------------------------------- |
| **Assumptions**         | "The PBI assumes X. Is this correct?"                            |
| **Scope**               | "Should Y be included in this PBI or deferred to a future item?" |
| **Risks**               | "This depends on Z. Is that available/stable?"                   |
| **Acceptance**          | "Is acceptance criterion X complete or are there edge cases?"    |
| **Entities**            | "Should we create new entity or extend existing X?"              |
| **Integration**         | "How should this integrate with {related feature}?"              |
| **Important Decisions** | "This requires deciding X. What's your preference?"              |
| **Brainstorm**          | "Any alternative solutions we should consider?"                  |

#### Validation Process

1. **Run INVEST check**, note any failures
2. **Scan PBI for keywords** to identify question topics
3. **Generate 3-5 questions** based on:
    - Assumptions made during entity inspection
    - Decisions about scope and boundaries
    - Dependencies identified
    - Gap analysis results
    - Acceptance criteria completeness
    - Keyword detection findings

4. **Ask user via Copilot chat**:
    - Group related questions (max 4 per response)
    - Provide concrete options with recommendations
    - Include context from the refinement
    - Ask brainstorm question for alternatives

5. **Document validation results** in the PBI:

    ```markdown
    ## Validation Summary

    **Validated:** {date}
    **Questions asked:** {count}
    **INVEST Score:** {pass count}/6

    ### INVEST Flags

    - {criterion}: {Pass/Fail - reason if fail}

    ### Confirmed Decisions

    - {decision 1}: {user choice}
    - {decision 2}: {user choice}

    ### Open Items

    - [ ] {any items needing follow-up}

    ### Assumptions Confirmed

    - {assumption 1}: Confirmed by {user}
    - {assumption 2}: Modified - {new understanding}

    ### Brainstorm Notes

    - {alternative approaches discussed}
    - {ideas for future consideration}

    ### Important Decisions Made

    - {decision 1}: {choice} - {rationale}
    ```

6. **Update PBI if needed** based on validation answers

### 9. Suggest Next Steps

- "/team__story {pbi-file}" - Create user stories
- "/team__test-spec {pbi-file}" - Create test specification
- "/team__design-spec {pbi-file}" - Create design specification

## Output Format

Use template from `team-artifacts/templates/pbi-template.md`

Add these fields to frontmatter:

```yaml
related_module: '{Module name}'
related_entities: []
business_docs_link: 'docs/business-features/{Module}/'
related_features: []
related_test_specs: []
```

Add this section to PBI:

```markdown
## Business Documentation Reference

<!-- Auto-populated from /team__refine prompt -->

- **Module**: {Module name}
- **Module Docs**: [docs/business-features/{Module}/](docs/business-features/{Module}/)
- **Related Features**: {FR-XX IDs}
- **Related Test Specs**: {TC-XX IDs}
- **Gap Analysis**: {Notes from business-features search}
```

## Business Documentation Search Strategy

1. **Keyword Extraction**: Parse idea title and problem for domain keywords
2. **Feature Matching**: Search detailed-features/*.md for similar features
3. **Requirement Cross-Reference**: Extract FR-XX IDs that relate to this PBI
4. **Test Coverage**: Note TC-XX IDs that might need updates or serve as templates
5. **Gap Identification**: Identify undocumented areas the PBI addresses

## Example

```bash
/team__refine team-artifacts/ideas/260119-po-idea-advanced-search-filters.md
```

Workflow:

1. Loads idea with `related_module: TextSnippet`
2. Activates business-analyst skill
3. Loads TextSnippet INDEX.md and README.md
4. Searches detailed-features/ → finds "Full-Text Search" feature
5. Extracts FR-TS-003 (Search Snippets), TC-TS-002 (Search tests)
6. Notes: "This extends FR-TS-003 with advanced filtering"
7. Generates acceptance criteria referencing TC-TS-002 patterns
8. Creates: `team-artifacts/pbis/260119-pbi-advanced-search-filters.md`
9. **Validates with user**: Asks 3-5 questions about assumptions, scope, risks
10. Documents validation results and updates PBI if needed

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
