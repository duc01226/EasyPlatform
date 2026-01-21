---
name: product-owner
description: Assist Product Owners with idea capture, backlog management, prioritization frameworks, and stakeholder communication. Use when working with product ideas, backlog items, sprint planning, or prioritization decisions. Triggers on keywords like "idea", "backlog", "prioritize", "sprint planning", "user value", "stakeholder", "product vision".
allowed-tools: Read, Write, Edit, Grep, Glob, TodoWrite, WebSearch
---

# Product Owner Assistant

Help Product Owners capture ideas, manage backlogs, and make prioritization decisions using established frameworks.

---

## Core Capabilities

### 1. Idea Capture
- Transform raw concepts into structured idea artifacts
- Identify problem statements and value propositions
- Tag and categorize for future refinement

### 2. Backlog Management
- Create and refine Product Backlog Items (PBIs)
- Maintain backlog ordering (not categories)
- Track dependencies and blockers

### 3. Prioritization Frameworks

#### RICE Score
```
RICE = (Reach × Impact × Confidence) / Effort

Reach: # users affected per quarter
Impact: 0.25 (minimal) | 0.5 (low) | 1 (medium) | 2 (high) | 3 (massive)
Confidence: 0.5 (low) | 0.8 (medium) | 1.0 (high)
Effort: Person-months
```

#### MoSCoW
- **Must Have**: Critical for release, non-negotiable
- **Should Have**: Important but not vital
- **Could Have**: Nice to have, low effort
- **Won't Have**: Out of scope this cycle

#### Value vs Effort Matrix
```
         High Value
             │
    Quick    │    Strategic
    Wins     │    Priorities
─────────────┼─────────────
    Fill     │    Time
    Ins      │    Sinks
             │
         Low Value
   Low Effort    High Effort
```

### 4. Sprint Planning Support
- Capacity planning based on velocity
- Sprint goal definition
- Commitment vs forecast distinction

---

## Artifact Templates

### Idea Template Location
`team-artifacts/templates/idea-template.md`

### PBI Template Location
`team-artifacts/templates/pbi-template.md`

---

## Business Features Reference

### Context Loading for Ideas

When creating ideas via `/idea` command, load relevant business documentation:

1. **Identify Module**: Match idea keywords to `docs/business-features/` modules
2. **Load INDEX.md**: Get feature table for overlap detection
3. **Load README.md**: Extract requirements (FR-XX) for reference
4. **Check Gaps**: Note if idea fills documented gap vs extends existing

### Module Documentation Structure

```
docs/business-features/{Module}/
├── INDEX.md          # Feature navigation table
├── README.md         # 15-section module documentation
├── API-REFERENCE.md  # Endpoint documentation
└── detailed-features/
    └── *.md          # Deep-dive feature docs
```

### Dynamic Module Discovery

Modules are discovered from frontmatter in `docs/business-features/*/README.md`:

```yaml
# Frontmatter schema (see docs/templates/detailed-feature-docs-template.md)
module: ModuleName
keywords: [term1, term2]      # Match against user input
aliases: [shortname]          # Exact match
features: [sub-feature]       # Sub-feature keywords
domain_path: src/.../Domain   # For entity inspection
```

**Discovery Algorithm**:
1. Glob all module README.md files
2. Parse YAML frontmatter
3. Match user keywords against `keywords`, `aliases`, `features`
4. Return module with highest match count
5. Fallback: prompt user to select from available modules

### Related Workflows

- `/idea` command discovers modules via frontmatter and loads context
- `/refine` uses `domain_path` from frontmatter for entity inspection
- Use INDEX.md feature table to prevent duplicate work
- Reference existing FR-XX IDs when related

---

## Workflow Integration

### Creating Ideas
When user says "new idea" or "feature request":
1. Use `/idea` command workflow
2. Populate idea-template.md
3. Save to `team-artifacts/ideas/`
4. Suggest next step: `/refine {idea-file}`

### Prioritizing Backlog
When user says "prioritize" or "order backlog":
1. Read all PBIs in `team-artifacts/pbis/`
2. Apply requested framework (RICE, MoSCoW, Value/Effort)
3. Output ordered list with scores
4. Update priority field in PBI frontmatter

---

## Output Conventions

### File Naming
```
{YYMMDD}-po-idea-{slug}.md
{YYMMDD}-pbi-{slug}.md
```

### Priority Values
- Numeric ordering: 1 (highest) to 999 (lowest)
- Never use High/Medium/Low categories

### Status Values
`draft` | `under_review` | `approved` | `rejected` | `in_progress` | `done`

---

## Anti-Patterns to Avoid

1. **Category-based priority** - Use ordered sequence, not High/Med/Low
2. **Vague acceptance criteria** - Require GIVEN/WHEN/THEN format
3. **Scope creep** - Explicitly list "Out of Scope"
4. **Missing dependencies** - Always identify upstream/downstream

---

## Integration Points

| When | Trigger | Action |
|------|---------|--------|
| Idea captured | `/idea` complete | Suggest `/refine` |
| PBI ready | PBI approved | Notify BA for stories |
| Sprint planned | Sprint goal set | Update PBI assignments |

---

## Stakeholder Communication Templates

### Sprint Review Summary
```markdown
## Sprint {N} Review

**Sprint Goal:** {goal}
**Status:** {achieved | partially | not achieved}

### Completed Items
| PBI | Value Delivered |
|-----|-----------------|
| | |

### Carried Over
| PBI | Reason | Plan |
|-----|--------|------|
| | | |

### Key Metrics
- Velocity: {points}
- Commitment: {%}
```

### Roadmap Update
```markdown
## Roadmap Update - {Date}

### This Quarter
| Priority | Item | Target | Status |
|----------|------|--------|--------|
| 1 | | | |

### Next Quarter
| Item | Dependencies | Notes |
|------|--------------|-------|
| | | |

### Deferred
| Item | Reason |
|------|--------|
| | |
```

---

## Quality Checklist

Before completing PO artifacts:
- [ ] Problem statement is user-focused, not solution-focused
- [ ] Value proposition quantified or qualified
- [ ] Priority has numeric order
- [ ] Dependencies explicitly listed
- [ ] Status frontmatter current

## Task Planning Notes

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
