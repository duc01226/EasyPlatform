---
name: branch-comparison
description: Use when comparing branches, analyzing git diffs, reviewing changes between branches, or analyzing what changed.
---

# Branch Comparison for EasyPlatform

## Git Diff Analysis

```bash
# Primary change detection
git diff --name-status [source-branch]..[target-branch]
git diff --stat [source-branch]..[target-branch]
git log --oneline [source-branch]..[target-branch]
```

## Change Classification

| Type     | Focus Areas                               |
| -------- | ----------------------------------------- |
| Backend  | Commands, Queries, Entities, Repositories |
| Frontend | Components, Stores, Services, Templates   |
| Config   | appsettings, package.json, project files  |
| Database | Migrations, Entity changes, Index updates |

## Impact Analysis Workflow

1. **Discover Changes**: Run git diff commands
2. **Classify Changes**: Backend/Frontend/Config/DB
3. **Find Related Files**: Importers, dependents, tests
4. **Assess Impact**: Critical > High > Medium > Low
5. **Document**: Summary of affected areas

## Related File Discovery

For each changed file, find:

- Files that import this file
- Files this file depends on
- Associated test files
- API consumers/producers
- UI components using this

## Analysis Template

```markdown
## Change Summary

**Branch Comparison:** [source] → [target]
**Total Files Changed:** X
**Commits:** Y

### Changes by Category

| Category | Files | Impact |
| -------- | ----- | ------ |
| Backend  | X     | High   |
| Frontend | Y     | Medium |

### Critical Changes

1. [File path] - [Description of change]
2. [File path] - [Description of change]

### Cross-Service Impact

- [Service A] → [Service B]: [Description]

### Recommended Review Focus

1. [Area requiring attention]
2. [Area requiring attention]
```

## Checklist

- [ ] All changed files identified
- [ ] Related/dependent files discovered
- [ ] Impact levels assessed
- [ ] Cross-service impacts noted
- [ ] Breaking changes flagged
