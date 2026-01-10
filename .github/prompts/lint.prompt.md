---
description: "Run linters and fix issues for backend or frontend"
---

# Lint Code

Run linters and optionally auto-fix issues.

## Usage

- `lint backend` or `lint be` → .NET analyzers
- `lint frontend` or `lint fe` → ESLint/Prettier
- `lint fix` → Auto-fix where possible
- `lint` → Run both, report only

## Backend (.NET)

### Check

```bash
dotnet build EasyPlatform.sln /p:TreatWarningsAsErrors=false
```

### Analyzer Codes

| Prefix | Category |
|--------|----------|
| CA* | Code Analysis (Microsoft) |
| IDE* | Code Style |
| CS* | Compiler warnings |
| SA* | StyleCop |

### Common Issues

| Code | Issue | Fix |
|------|-------|-----|
| CA1062 | Null check needed | Add null validation |
| IDE0059 | Unused assignment | Remove or use variable |
| CA2007 | ConfigureAwait | Add `.ConfigureAwait(false)` |

## Frontend (Angular/Nx)

### Check

```bash
cd src/PlatformExampleAppWeb
nx lint playground-text-snippet
nx lint platform-core
```

### Auto-Fix

```bash
nx lint playground-text-snippet --fix
npx prettier --write "apps/**/*.{ts,html,scss}" "libs/**/*.{ts,html,scss}"
```

### Common Issues

| Rule | Issue | Fix |
|------|-------|-----|
| @typescript-eslint/no-unused-vars | Unused variable | Remove or use |
| @angular-eslint/no-empty-lifecycle | Empty ngOnInit | Remove or implement |
| prettier/prettier | Formatting | Run prettier --write |

## Report Format

```
## Lint Results

### Errors (must fix)
- [file:line] CA1062: Validate parameter 'x'

### Warnings (should fix)
- [file:line] IDE0059: Unnecessary assignment

### Info (optional)
- [file:line] Style suggestion
```

## Auto-Fix Behavior

When `fix` specified:
1. Apply safe auto-fixes
2. Report what was fixed
3. List remaining issues needing manual attention

## Important

- Always review auto-fixed changes
- Some fixes may change behavior
- Run tests after fixing
