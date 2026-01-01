---
agent: 'agent'
description: 'Analyze the codebase and generate a documentation summary report'
tools: ['read', 'search']
---

# Summarize Documentation

Analyze the codebase based on existing documentation and generate a summary report.

## Input Parameters

**Focused Topics:** ${input:topics}
Specify topics to focus on (e.g., "authentication", "API endpoints", "frontend components")
Default: all topics

**Scan Codebase:** ${input:scan:No,Yes}
Whether to scan the actual codebase or rely on existing documentation
Default: No (use existing docs)

## Process

### If Using Existing Documentation
1. Read `docs/codebase-summary.md` for context
2. Read relevant documentation files in `docs/`
3. Generate summary based on focused topics

### If Scanning Codebase
1. Explore directories relevant to focused topics
2. Cross-reference with existing documentation
3. Identify any gaps or outdated information

## Output Format

Provide a structured summary report:

```markdown
## Documentation Summary Report

### Topics Covered
- [Topic 1]: Brief summary
- [Topic 2]: Brief summary

### Key Findings
- [Finding 1]
- [Finding 2]

### Documentation Gaps (if any)
- [Gap 1]
- [Gap 2]

### Recommendations
- [Recommendation 1]
- [Recommendation 2]
```

**IMPORTANT**: This is a read-only analysis - do not modify any files.
