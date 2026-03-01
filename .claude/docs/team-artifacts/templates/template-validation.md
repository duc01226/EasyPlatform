# Template Validation Checklist

Use this checklist to validate idea and PBI templates before committing.

## Idea Template Validation

### Frontmatter

- [ ] `id` follows IDEA-YYMMDD-NNN format
- [ ] `status` is valid (draft | under_review | approved | rejected | implemented)
- [ ] `priority` is valid (P1 | P2 | P3 | unset)
- [ ] `tags` are lowercase and hyphenated
- [ ] `template_version` is "2.0"

### BravoSUITE Domain (if applicable)

- [ ] `module` is valid (bravoGROWTH | bravoTALENTS | bravoSURVEYS | bravoINSIGHTS | Accounts)
- [ ] `related_features` list matches features in module README
- [ ] `feature_doc_path` points to existing file
- [ ] `entities` list uses exact entity names from .ai.md files

### Content Sections

- [ ] "Problem Statement" clearly defines the problem
- [ ] "Proposed Solution" is concise and actionable
- [ ] "Domain Context" section populated (if domain feature)
- [ ] Business rules referenced (if applicable)

## PBI Template Validation

### Frontmatter

- [ ] `id` follows PBI-YYMMDD-NNN format
- [ ] `title` is clear and concise
- [ ] `status` is valid (backlog | ready | in_progress | done | blocked)
- [ ] `effort` uses valid values (XS | S | M | L | XL)
- [ ] `idea_reference` links to valid idea (if from refinement)
- [ ] `template_version` is "2.0"

### BravoSUITE Domain (if applicable)

- [ ] `module` matches idea template (if from refinement)
- [ ] `primary_feature_doc` points to existing file
- [ ] Related business rules section populated
- [ ] Existing BRs reference valid BR-{MOD}-XXX rules from docs

### Content Sections

- [ ] Description is clear and implementation-focused
- [ ] Related Business Rules section complete:
    - [ ] Existing rules referenced with source links
    - [ ] New rules defined (if applicable)
    - [ ] Conflicts/clarifications flagged
- [ ] Acceptance Criteria follow BDD format (GIVEN/WHEN/THEN)
- [ ] Test case IDs follow TC-{MOD}-{FEATURE}-XXX format (domain features)
- [ ] Evidence format mentioned (file:line)
- [ ] Reference Documentation section has valid links

### Cross-References

- [ ] All internal links resolve correctly
- [ ] Feature doc paths exist
- [ ] .ai.md entity links exist
- [ ] Business rule IDs exist in referenced feature docs

## Validation Commands

```bash
# Check idea frontmatter format
grep -A 25 "^---$" team-artifacts/ideas/IDEA-*.md | head -n 27

# Check PBI frontmatter format
grep -A 30 "^---$" team-artifacts/pbis/PBI-*.md | head -n 32

# List all modules referenced
grep -h "^module:" team-artifacts/ideas/*.md team-artifacts/pbis/*.md 2>/dev/null | sort | uniq

# Validate feature doc paths exist
for path in $(grep -h "feature_doc_path:" team-artifacts/**/*.md 2>/dev/null | cut -d'"' -f2); do
  [ -f "$path" ] || echo "Missing: $path"
done

# Find business rules referenced
grep -rh "BR-[A-Z]\{3\}-[0-9]\{3\}" team-artifacts/ 2>/dev/null | sort | uniq
```

## Common Issues & Fixes

### Issue: Module not detected

**Fix:** Add keywords from `.claude/skills/shared/module-detection-keywords.md` to idea description

### Issue: related_features list empty

**Fix:** Manually read `docs/business-features/{module}/README.md` and extract from Quick Navigation

### Issue: Business rule IDs don't match docs

**Fix:** Search feature docs for `BR-{MOD}-` pattern and update references

### Issue: Test case format inconsistent

**Fix:** Check Section 15 of related feature doc for correct TC-{MOD}-{FEATURE}-XXX format

### Issue: Entity names don't match domain vocabulary

**Fix:** Use exact entity names from .ai.md files:

- bravoTALENTS: Candidate (not Applicant), Job, JobApplication
- bravoGROWTH: Goal, Kudos, PerformanceReview, CheckIn

## Version History

| Version | Date       | Changes                                                  |
| ------- | ---------- | -------------------------------------------------------- |
| 2.0     | 2026-01-19 | Added BravoSUITE domain context fields, BR/TC validation |
| 1.0     | Initial    | Basic template structure                                 |
