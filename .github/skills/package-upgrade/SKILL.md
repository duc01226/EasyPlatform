---
name: package-upgrade
description: Use when analyzing package upgrades, checking for outdated dependencies, planning npm/NuGet updates, or assessing breaking changes.
---

# Package Upgrade Analysis for EasyPlatform

## Package Discovery

```bash
# Find all package files
# Frontend
find . -name "package.json" -not -path "*/node_modules/*"

# Backend
find . -name "*.csproj" -o -name "Directory.Packages.props"
```

## Analysis Workflow

1. **Inventory**: List all packages with current versions
2. **Research**: Find latest versions and changelogs
3. **Breaking Changes**: Document migration requirements
4. **Risk Assessment**: Categorize by impact
5. **Plan**: Create phased upgrade strategy

## Risk Categories

| Level    | Criteria                                  | Action        |
| -------- | ----------------------------------------- | ------------- |
| Critical | 5+ major versions behind, security issues | Immediate     |
| High     | 3-4 major versions, many breaking changes | Next sprint   |
| Medium   | 1-2 major versions, some breaking changes | Plan upgrade  |
| Low      | Patch/minor updates, backward compatible  | Regular cycle |

## Package Research Template

```markdown
## Package: [name]

**Current:** X.Y.Z
**Latest:** A.B.C
**Gap:** [X major versions behind]

### Breaking Changes

- [v2.0] Change description
- [v3.0] Change description

### Migration Steps

1. Update package reference
2. Fix breaking change A
3. Fix breaking change B

### Peer Dependencies

- [package]: requires >= X.Y.Z
```

## Upgrade Order (Dependencies First)

1. **Foundation**: Node.js, .NET SDK, TypeScript
2. **Framework**: Angular Core, ASP.NET Core
3. **Framework Extensions**: Material, RxJS, EF Core
4. **Third-party Libraries**: UI components, utilities
5. **Dev Tools**: Testing frameworks, linters

## Report Structure

```markdown
# Package Upgrade Report

## Executive Summary

- Total packages: X
- Requiring updates: Y
- Critical security: Z

## By Risk Level

### Critical (Immediate Action)

### High (Next Sprint)

### Medium (Planned)

### Low (Regular Cycle)

## Recommended Upgrade Phases

### Phase 1: Foundation

- Package A: X.Y -> A.B
- Estimated effort: X hours

### Phase 2: Framework

...
```

## Checklist

- [ ] All package files discovered
- [ ] Latest versions researched
- [ ] Breaking changes documented
- [ ] Peer dependencies verified
- [ ] Risk levels assigned
- [ ] Phased plan created
