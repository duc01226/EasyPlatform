---
description: "Update existing documentation based on codebase changes"
---

# Documentation Update Prompt

## Overview

Analyze the codebase and update existing documentation to reflect current state, ensuring documentation stays synchronized with code.

## Workflow

### Phase 1: Codebase Discovery

1. Run `ls -la` to identify actual project directories
2. Scan key source directories for recent changes
3. Compare with existing documentation

### Phase 2: Documentation Update

Update the following documentation files:

#### Core Documentation

| File | Update Focus |
|------|--------------|
| `README.md` | Quick start, prerequisites, links (keep under 300 lines) |
| `docs/project-overview-pdr.md` | Project overview and requirements |
| `docs/codebase-summary.md` | Codebase structure |
| `docs/code-standards.md` | Coding conventions |
| `docs/system-architecture.md` | Architecture diagrams and flow |
| `docs/project-roadmap.md` | Current status and roadmap |

#### Optional Documentation

| File | Update When |
|------|-------------|
| `docs/deployment-guide.md` | Deployment process changes |
| `docs/design-guidelines.md` | UI/UX patterns change |
| `docs/api-reference.md` | API endpoints change |

### Phase 3: Change Documentation

Document what was updated:

```markdown
## Documentation Update Summary

### Updated Files
| File | Changes |
|------|---------|
| docs/codebase-summary.md | Added new Entity section |
| docs/system-architecture.md | Updated data flow diagram |

### New Documentation
- [List any new files created]

### Deprecated/Removed
- [List any outdated sections removed]

### Remaining Gaps
- [List areas still needing documentation]
```

## Update Guidelines

### What to Update
- New features and their usage
- Changed APIs and patterns
- Deprecated functionality
- Architecture changes
- New dependencies

### What to Keep
- Historical context (ADRs)
- Stable patterns that haven't changed
- External references that are still valid

### Documentation Standards
- Keep each document focused on one topic
- Use consistent terminology
- Include code examples for new patterns
- Link related documentation
- Date significant updates

## Important

- Use `docs/` directory as the source of truth
- Preserve existing structure unless reorganization needed
- Remove or mark deprecated content clearly

**IMPORTANT:** Do not start implementing code. Focus only on documentation updates.
