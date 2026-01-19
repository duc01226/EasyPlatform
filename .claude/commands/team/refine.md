---
name: refine
description: Refine an idea into a Product Backlog Item with acceptance criteria
allowed-tools: Read, Write, Edit, Grep, Glob, TodoWrite
arguments:
  - name: idea-file
    description: Path to idea file or IDEA-ID
    required: true
---

# Refine Idea to PBI

Transform a raw idea into a structured Product Backlog Item with business documentation cross-reference.

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

### 8. Suggest Next Steps

- "/story {pbi-file}" - Create user stories
- "/test-spec {pbi-file}" - Create test specification
- "/design-spec {pbi-file}" - Create design specification

## Output Format

Use template from `team-artifacts/templates/pbi-template.md`

Add these fields to frontmatter:
```yaml
related_module: "{Module name}"
related_entities: []
business_docs_link: "docs/business-features/{Module}/"
related_features: []
related_test_specs: []
```

Add this section to PBI:
```markdown
## Business Documentation Reference
<!-- Auto-populated from /refine command -->
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
/refine team-artifacts/ideas/260119-po-idea-advanced-search-filters.md
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
