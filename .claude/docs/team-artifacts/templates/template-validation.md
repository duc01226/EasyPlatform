# Template Validation Checklist

Use this checklist to validate initiative and task templates before committing. The work-record fields (`id`, `title`, `intent`, `status`, `priority`, `assigned_to`, `tracking`) follow `.claude/skills/task-track/references/integration-guide.md`, section "Records another skill authors"; read it when a check below and the tracker disagree.

## Initiative Template Validation

### Frontmatter

- [ ] `id` follows INITIATIVE-YYMMDD-NNN format and is unused in every record folder
- [ ] `intent` states the outcome in one sentence
- [ ] `status` is an initiative status (`draft` for a new initiative); approval and every later status are recorded through `/task-track`
- [ ] no decision or priority key of the template's own: approval is the tracker `status` and priority is the tracker's priority level
- [ ] `tags` are lowercase and hyphenated
- [ ] `template_version` is "2.3"

### Project Domain (if applicable)

- [ ] `module` is valid (matches a module in project-config.json backendServices.serviceMap)
- [ ] `related_features` list matches features in module README
- [ ] `feature_doc_path` points to existing file
- [ ] `entities` list uses exact entity names from feature docs Domain Model section

### Content Sections

- [ ] "Problem Statement" clearly defines the problem
- [ ] "Proposed Solution" is concise and actionable
- [ ] "Domain Context" section populated (if domain feature)
- [ ] Business rules referenced (if applicable)

## Task Template Validation

### Frontmatter

- [ ] `id` follows TASK-YYMMDD-NNN format and is unused in every record folder
- [ ] `title` is clear and concise
- [ ] `intent` states the releasable outcome in one sentence
- [ ] `status` is a task status (`draft` for a new task); no `assigned_to` written by hand
- [ ] `priority` is an integer 1-999 or absent; the label sits in `priority_label`
- [ ] `effort` uses valid values (XS | S | M | L | XL)
- [ ] `initiative_reference` links to valid initiative (if from refinement). An existing task may carry the earlier key `idea_reference`; it is read as the same link, and migration does not rewrite authored keys.
- [ ] `template_version` is "2.4"

### Project Domain (if applicable)

- [ ] `module` matches initiative template (if from refinement)
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
- [ ] Test case IDs follow TC-{FEATURE}-{NNN} format (domain features)
- [ ] Evidence format mentioned (`[Source: namespace/service/id]` abstract anchor — never physical `file:line`)
- [ ] Reference Documentation section has valid links

### Cross-References

- [ ] All internal links resolve correctly
- [ ] Feature doc paths exist
- [ ] Domain entity references valid
- [ ] Business rule IDs exist in referenced feature docs

## Validation Commands

The commands below assume the DEFAULT team-artifacts root; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path, and the commands take that root instead.

```bash
# Check initiative frontmatter format
grep -A 25 "^---$" team-artifacts/initiatives/INITIATIVE-*.md | head -n 27

# Check Task frontmatter format
grep -A 30 "^---$" team-artifacts/tasks/TASK-*.md | head -n 32

# List all modules referenced
grep -h "^module:" team-artifacts/initiatives/*.md team-artifacts/tasks/*.md 2>/dev/null | sort | uniq

# Validate feature doc paths exist
for path in $(grep -h "feature_doc_path:" team-artifacts/**/*.md 2>/dev/null | cut -d'"' -f2); do
  [ -f "$path" ] || echo "Missing: $path"
done

# Find business rules referenced
grep -rh "BR-[A-Z]\{3\}-[0-9]\{3\}" team-artifacts/ 2>/dev/null | sort | uniq
```

## Common Issues & Fixes

### Issue: Module not detected

**Fix:** Add keywords matching module names in the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path — to the initiative description

### Issue: related_features list empty

**Fix:** Manually read `{module}/README.md` in the business spec root and extract from Quick Navigation

### Issue: Business rule IDs don't match docs

**Fix:** Search feature docs for `BR-{MOD}-` pattern and update references

### Issue: Test case format inconsistent

**Fix:** Check Section 8 of related feature doc for correct TC-{FEATURE}-{NNN} format

### Issue: Entity names don't match domain vocabulary

**Fix:** Use exact entity names from feature docs Domain Model section. Check project-config.json for module-to-entity mapping.

## Version History

| Version | Date       | Changes                                       |
| ------- | ---------- | --------------------------------------------- |
| 2.0     | 2026-01-19 | Added domain context fields, BR/TC validation |
| 1.0     | Initial    | Basic template structure                      |
