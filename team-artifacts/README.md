# Team Artifacts

Centralized location for cross-role collaboration artifacts.

## Folder Structure

| Folder | Purpose | Who Creates | Who Consumes |
|--------|---------|-------------|--------------|
| `/ideas/` | Raw ideas, feature requests | Anyone | PO, BA |
| `/pbis/` | Refined Product Backlog Items | BA, PO | Dev, QA, Designer |
| `/test-specs/` | Test specifications and cases | QA | QA, Dev, QC |
| `/design-specs/` | Design documentation | Designer | Dev, QA |
| `/qc-reports/` | Quality gate reports | QC | All |
| `/templates/` | Templates for artifacts | Maintainers | All |

## Naming Convention

```
{YYMMDD}-{role}-{type}-{slug}.md
```

**Roles:** `po`, `ba`, `dev`, `qa`, `qc`, `ux`, `pm`
**Types:** `idea`, `pbi`, `story`, `testspec`, `designspec`, `gate`

## Workflows

### Idea → Production
```
/idea → /refine → /story → /prioritize → /plan → /cook → /test-spec → /test-cases → /quality-gate
```

### Quick Commands
| Command | Creates | In Folder |
|---------|---------|-----------|
| `/idea` | Idea artifact | `/ideas/` |
| `/refine {idea}` | PBI from idea | `/pbis/` |
| `/story {pbi}` | User stories | `/pbis/` |
| `/test-spec {pbi}` | Test spec | `/test-specs/` |
| `/design-spec {pbi}` | Design spec | `/design-specs/` |
| `/quality-gate {artifact}` | QC report | `/qc-reports/` |

## Status Lifecycle

```
draft → under_review → approved → in_progress → done
                    ↘ rejected
```

## Best Practices

1. **One artifact per file** - No monolithic documents
2. **Link, don't duplicate** - Reference other artifacts by ID
3. **Update status** - Keep frontmatter current
4. **Add evidence** - Link to code, designs, test results
5. **Quality gates** - Run `/quality-gate` before major transitions

## Versioning

- **Primary:** Git history provides version tracking
- **Major revisions:** Use `{filename}-v2.md` naming when needed
- **Audit trails:** Optional `revision_history` in frontmatter

## Getting Started

1. Copy template from `/templates/` folder
2. Rename following naming convention
3. Fill in frontmatter (id, title, status)
4. Complete relevant sections
5. Move to appropriate folder
