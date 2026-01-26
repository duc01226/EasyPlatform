# BravoSUITE Refinement Workflow

Project-specific refinement patterns for BravoSUITE domain modules.

---

## Module Detection Keywords

| Module | Keywords |
|--------|----------|
| bravoTALENTS | candidate, job, interview, recruitment, CV, applicant |
| bravoGROWTH | goal, kudos, performance, check-in, timesheet |
| bravoSURVEYS | survey, question, response, distribution |
| bravoINSIGHTS | dashboard, report, analytics |

Reference: `.claude/skills/shared/module-detection-keywords.md`

---

## Business Feature Context Loading

### Step 1: Detect Module

**From PBI/Idea frontmatter:**
1. Check `module` field
2. If missing, detect from keywords above

### Step 2: Load Feature Context

```
Glob("docs/business-features/{module}/detailed-features/*.md")
```

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

### Multi-Module Support

- If 2+ modules detected, load context for ALL detected modules
- Combine business rules and test case patterns from all modules
- May increase total token budget beyond single-module target

### Token Budget

Target 8-12K tokens total for feature context:
- Module README: ~2K tokens
- Full feature doc sections: 3-5K per feature
- Multi-module: Load all detected modules (may increase total)

---

## Entity Domain Investigation

**Skip if:** No module detected (non-domain idea).

After loading feature context, investigate related entities in codebase.

### Using .ai.md Files

1. Read `.ai.md` companion file for detected feature:
   ```
   Glob("docs/business-features/{module}/detailed-features/*.ai.md")
   ```
2. Extract from `## Domain Model` section:
   - Entity names and base classes
   - Key properties and types
   - Navigation relationships
   - Computed properties

### Codebase Correlation

3. Use `## File Locations` section paths to verify entities exist
4. Extract from `## Key Expressions` section:
   - Static expression methods for queries
   - Validation rules

### Cross-Service Dependencies

5. Check `## Service Boundaries` section for:
   - Events produced/consumed
   - Related services affected

### Discrepancy Handling

If `.ai.md` content differs from source code, flag for doc update but continue with documented info.

### Output Template

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

---

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

---

## BravoSUITE Test Case Format

For domain features, use:
- **Format:** `TC-{MOD}-{FEATURE}-XXX` (e.g., TC-GRO-GOAL-001)
- **Evidence:** `file:line` format
- See `business-analyst` skill for detailed patterns

---

## PBI Business Feature Context Section

Include this section in the PBI output if domain-related:

```markdown
## Business Feature Context
**Module:** {module}
**Related Feature:** {feature_name}
**Existing Business Rules:** {BR_IDs} (see docs/business-features/{module}/...)
**Test Case Patterns:** {TC_format} with GIVEN/WHEN/THEN
**Evidence Format:** file:line (e.g., {example})
**Related Entities:** {entity_list}
```

---

## Example (BravoSUITE)

```bash
/refine team-artifacts/ideas/260119-po-idea-goal-progress-notification.md
```

Creates with bravoGROWTH context: `team-artifacts/pbis/260119-ba-pbi-goal-progress-notification.md`
- Includes BR-GRO-XXX references
- Uses TC-GRO-GOAL-XXX test case format
- Lists related entities (Goal, Employee, Notification)
