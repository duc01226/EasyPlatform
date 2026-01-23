---
name: refine
description: Refine an idea into a Product Backlog Item with hypothesis validation, domain research, and acceptance criteria
allowed-tools: Read, Write, Edit, Grep, Glob, TodoWrite, WebSearch, AskUserQuestion
arguments:
  - name: idea-file
    description: Path to idea file or IDEA-ID
    required: true
  - name: --research
    description: Trigger domain/market research phase
    required: false
  - name: --skip-hypothesis
    description: Skip hypothesis validation (existing validated idea)
    required: false
---

# Refine Idea to PBI

Transform a raw idea into a structured Product Backlog Item.

## Workflow

### Step 1: Load Idea
- Read idea file from path or find by ID in `team-artifacts/ideas/`
- Extract problem statement, value, users, scope
- Check for `module` field in frontmatter

### Step 1.5: Domain Research (Optional)

**Trigger when:** `--research` flag OR idea mentions new market/domain OR competitive landscape unclear.

**Skip when:** Internal tooling, well-understood domain, time-constrained refinement.

**Process:**
1. Extract key domain terms from idea
2. Use WebSearch for context:
   - Market trends: `"{domain} market trends 2026"`
   - Competitors: `"{domain} software solutions comparison"`
   - Best practices: `"{feature-type} best practices UX"`
3. Summarize findings (max 3 bullets)

**Output to PBI:**
```markdown
## Domain Research Summary
- **Market context:** {1-sentence finding}
- **Competitor landscape:** {key players, gaps identified}
- **Best practices:** {relevant pattern to adopt}
```

### Step 2: Activate Skills & Techniques
- Activate `business-analyst` skill
- Use INVEST criteria for story quality
- Reference BABOK techniques as needed:
  - **Interviews:** For unclear requirements
  - **Document Analysis:** For existing systems
  - **Prototyping:** For UI/UX validation
  - See `refine` skill for technique details

### Step 2.5: Problem Hypothesis Validation

**Skip when:** `--skip-hypothesis` flag OR existing validated hypothesis in idea OR bug fix/tech debt.

**Process:**
1. Extract or draft problem hypothesis:
   ```
   We believe [target users]
   Experience [problem]
   Because [root cause]
   ```
2. Use AskUserQuestion to validate:
   - "Is this the core problem we're solving?"
   - "Who exactly experiences this? How often?"
   - "What evidence do we have this problem exists?"
3. If validated, proceed to Step 3
4. If invalidated, return idea for clarification

**Output to PBI:**
```markdown
## Problem Hypothesis
**Target Users:** {persona}
**Problem:** {validated problem statement}
**Root Cause:** {why this exists}
**Validation:** {how we confirmed}
```

### Step 3: Generate Acceptance Criteria
- Create at least 3 scenarios:
  - Happy path
  - Edge case
  - Error case
- Use GIVEN/WHEN/THEN format

### Step 4: Load Business Feature Context (if BravoSUITE domain)

Check idea frontmatter for `module` field:

**If module present:**
1. Read `docs/business-features/{module}/README.md` (overview + feature list, ~2K tokens)
2. Identify closest matching feature based on idea keywords
3. Read corresponding feature documentation:
   - Full feature doc: `docs/business-features/{module}/detailed-features/*.md` (3-5K tokens)
   - Or `.ai.md` companion: `docs/business-features/{module}/detailed-features/*.ai.md` (~1K tokens)
4. Extract context:
   - **Business Rules:** BR-{MOD}-XXX format
   - **Test Cases:** TC-{MOD}-XXX format with GIVEN/WHEN/THEN
   - **Evidence patterns:** file:line format
   - **Related entities and services**

**If module not present:**
- **Dynamic Discovery:** Run `Glob("docs/business-features/*/README.md")` to discover all modules
- Analyze idea text for module keywords (reference: `.claude/skills/shared/module-detection-keywords.md`)
- Prompt if ambiguous: "Is this for a BravoSUITE domain module?" + list Glob results + "None"
- If selected, follow above process
- If None, proceed to Step 5 (codebase search)

**Multi-module support:**
- If 2+ modules detected, load context for ALL detected modules
- Combine business rules and test case patterns from all modules

**Token Budget:** Target 8-12K tokens total (validated decision: prefer completeness):
- Module README: 2K
- Full feature doc sections: 3-5K per feature
- Multi-module support: Load all detected modules (may increase total)

### Step 4.5: Entity Domain Investigation

**Skip if:** No module detected (non-domain idea).

After loading feature context, investigate related entities in codebase.

**Using .ai.md Files:**
1. Read `.ai.md` companion file for detected feature:
   ```
   Glob("docs/business-features/{module}/detailed-features/*.ai.md")
   ```
2. Extract from `## Domain Model` section:
   - Entity names and base classes
   - Key properties and types
   - Navigation relationships
   - Computed properties

**Codebase Correlation:**
3. Use `## File Locations` section paths to verify entities exist
4. Extract from `## Key Expressions` section:
   - Static expression methods for queries
   - Validation rules

**Cross-Service Dependencies:**
5. Check `## Service Boundaries` section for:
   - Events produced/consumed
   - Related services affected

**Discrepancy Handling:** If .ai.md content differs from source code, flag for doc update but continue with documented info.

**Add to PBI Context:**
```markdown
## Entity Investigation Results

### Primary Entities
- `{EntityName}` - {Brief description} - [Source](path)

### Related Entities
- `{RelatedEntity}` - via {Relationship}

### Key Expressions
- `{ExpressionName}(params)` - {Purpose}

### Cross-Service Events
- Produces: `{EventName}`
- Consumes: `{EventName}` from {Service}

### Discrepancies (if any)
- {Note outdated docs for follow-up}
```

### Step 5: Identify Dependencies (Codebase Search)
- Search codebase for related features
- Note upstream/downstream dependencies
- If domain context loaded, cross-reference with existing implementations

### Step 5.5: Definition of Ready Check

Before creating PBI, verify readiness:

| Criterion | Check |
|-----------|-------|
| **I**ndependent | No blocking dependencies on other PBIs |
| **N**egotiable | Details can still be refined with team |
| **V**aluable | Clear user/business value articulated |
| **E**stimable | Team can estimate effort |
| **S**mall | Can complete in single sprint |
| **T**estable | Has GIVEN/WHEN/THEN acceptance criteria |
| **Problem Validated** | Hypothesis confirmed (Step 2.5) |
| **Domain Context** | BR/entity context loaded (if BravoSUITE) |

**If any fail:** Note in PBI as "Needs Work" with reason, or return to earlier step.

### Step 6: Draft Product Backlog Item

Include Business Feature Context section if domain-related:

```markdown
## Business Feature Context
**Module:** {module}
**Related Feature:** {feature_name}
**Existing Business Rules:** {BR_IDs} (see docs/business-features/{module}/...)
**Test Case Patterns:** {TC_format} with GIVEN/WHEN/THEN
**Evidence Format:** file:line (e.g., {example})
**Related Entities:** {entity_list}
```

This context ensures PBI aligns with existing domain patterns.

### Step 7: Create PBI
- Generate ID: `PBI-{YYMMDD}-{NNN}`
- Link to source idea
- Set status: `backlog`
- Include module and related_features in frontmatter (if domain)

### Step 8: Save Artifact
- Path: `team-artifacts/pbis/{YYMMDD}-ba-pbi-{slug}.md`

### Step 9: Update Idea
- Set idea status: `approved`
- Add link to PBI

### Step 10: Suggest Next Steps
- "/story {pbi-file}" - Create user stories
- "/test-spec {pbi-file}" - Create test specification
- "/design-spec {pbi-file}" - Create design specification
- If domain: "BR/TC validation checklist included - review before sprint planning"

### Step 11: Validation Interview (Final Review)

**Always perform this step after refinement is complete.**

Conduct a brief validation interview with the user to:
1. Surface potential concerns and hidden assumptions
2. Confirm important decisions before sprint planning
3. Brainstorm alternatives or enhancements

**Validation Topics to Cover:**

| Category | Questions to Raise |
|----------|-------------------|
| **Assumptions** | What assumptions are we making about user behavior, data availability, or system state? |
| **Scope** | Is the scope clear? Are there features that should be explicitly excluded? |
| **Dependencies** | Are there external teams, services, or data sources this depends on? |
| **Edge Cases** | What happens when... (empty data, concurrent users, network failure)? |
| **Business Impact** | How does this affect existing workflows or reports? |
| **Technical Risk** | Any concerns about performance, security, or migration? |

**Interview Process:**

1. Use `AskUserQuestion` tool with 3-5 questions covering:
   - Most critical assumption that needs validation
   - Scope boundary that might be unclear
   - Highest-risk technical decision
   - Stakeholder alignment question (if applicable)

2. Document answers in PBI:
   ```markdown
   ## Validation Summary

   **Validated:** {date}
   **Questions asked:** {count}

   ### Confirmed Decisions
   - {decision}: {user's choice}

   ### Concerns Raised
   - {concern}: {resolution or action item}

   ### Action Items (if any)
   - [ ] {follow-up needed}
   ```

3. If validation reveals issues:
   - Update acceptance criteria if needed
   - Add clarification notes
   - Flag for stakeholder discussion if decision is outside scope

**Important:** This is NOT optional. Every refinement must end with validation.

## Business Rules Validation Checklist

For domain-related PBIs, include this checklist in the output:

```markdown
## BR/TC Validation Checklist

### Existing Business Rules Referenced
- [ ] BR-{MOD}-XXX: {Rule description} - Verified applicable
- [ ] BR-{MOD}-YYY: {Rule description} - Verified applicable

### New Business Rules Introduced
- [ ] BR-{MOD}-ZZZ: {New rule description} - Review needed

### Test Case Pattern Alignment
- [ ] TC format follows TC-{MOD}-{FEATURE}-XXX pattern
- [ ] All ACs use GIVEN/WHEN/THEN format
- [ ] Evidence format specified (file:line)

### Conflict Check
- [ ] No conflicts with existing BRs identified
- [ ] Clarifications documented if needed
```

## Example

```bash
/refine team-artifacts/ideas/260119-po-idea-dark-mode-toggle.md
```

Creates: `team-artifacts/pbis/260119-ba-pbi-dark-mode-toggle.md`

```bash
/refine team-artifacts/ideas/260119-po-idea-goal-progress-notification.md
```

Creates with bravoGROWTH context: `team-artifacts/pbis/260119-ba-pbi-goal-progress-notification.md`
- Includes BR-GRO-XXX references
- Uses TC-GRO-GOAL-XXX test case format
- Lists related entities (Goal, Employee, Notification)

## Related

- **Skill:** `refine` - Detailed technique reference (BABOK, HDD)
- **Next:** `/story`, `/test-spec`, `/design-spec`, `/prioritize`
- **Framework:** BABOK Core 5, INVEST, Hypothesis-Driven Development

---

> **Task Management Protocol:**
> - Always plan and break work into many small todo tasks
> - Always add a final review todo task to verify work quality and identify fixes/enhancements
