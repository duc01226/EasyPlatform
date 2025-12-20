---
description: "Summarize existing documentation and provide analysis"
---

# Documentation Summarize Prompt

## Overview

Analyze the existing documentation in `docs/` directory and produce a summary report with insights and recommendations.

## Arguments

- **Focused Topics**: Specific areas to focus on (default: all)
- **Scan Codebase**: Whether to scan codebase for verification (default: false)

## Workflow

### Phase 1: Documentation Inventory

1. List all documentation files in `docs/` directory
2. Analyze `docs/codebase-summary.md` as primary reference
3. Identify documentation coverage

### Phase 2: Analysis

Analyze documentation for:

| Aspect | Check |
|--------|-------|
| Completeness | Are all major features documented? |
| Accuracy | Does documentation match current code? |
| Consistency | Is terminology consistent across docs? |
| Currency | Are there outdated references? |

### Phase 3: Summary Report

Generate a summary containing:

```markdown
## Documentation Summary Report

### Inventory
| Document | Last Updated | Coverage | Status |
|----------|--------------|----------|--------|
| ... | ... | ... | ✅/⚠️/❌ |

### Coverage Analysis
- Well documented areas: [list]
- Missing documentation: [list]
- Outdated sections: [list]

### Quality Assessment
- Clarity: [rating]
- Completeness: [rating]
- Maintainability: [rating]

### Recommendations
1. [Priority recommendation]
2. [Secondary recommendation]
```

## Key Documentation Files

| File | Purpose |
|------|---------|
| `docs/project-overview-pdr.md` | Project overview and requirements |
| `docs/codebase-summary.md` | Codebase structure |
| `docs/code-standards.md` | Coding conventions |
| `docs/system-architecture.md` | Architecture overview |
| `README.md` | Quick start guide |

## Important

- Use `docs/` directory as the source of truth
- Do not scan the entire codebase unless explicitly requested
- Focus on documentation analysis, not code review

**IMPORTANT:** Do not start implementing code. Focus only on documentation analysis.
