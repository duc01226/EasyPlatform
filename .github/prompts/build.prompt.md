---
description: "Build backend (.NET) and/or frontend (Angular) projects"
---

# Build Projects

Build backend and/or frontend projects with error analysis.

## Usage

- `build backend` or `build be` → Build .NET only
- `build frontend` or `build fe` → Build Angular only
- `build` or `build all` → Build both

## Backend (.NET)

```bash
dotnet build EasyPlatform.sln --configuration Release
```

### On Success
- Report warning count
- Show build time

### On Failure
- Show first 3-5 errors with file locations
- Offer to investigate and fix

## Frontend (Angular/Nx)

```bash
cd src/PlatformExampleAppWeb
nx build playground-text-snippet --configuration production
```

### For Libraries
```bash
nx build platform-core
nx build apps-domains
```

### On Success
- Report bundle sizes
- Show build time

### On Failure
- Show compilation errors
- Check for missing dependencies

## Build Order (Both)

1. **Backend first** - APIs must compile
2. **Frontend second** - May depend on generated types

## Common Errors

| Error | Likely Cause | Fix |
|-------|--------------|-----|
| CS0246 | Missing using/reference | Add using statement or package |
| TS2307 | Module not found | Check import path, run npm install |
| NG0300 | Multiple modules | Check module imports |
| NETSDK1004 | Assets file missing | Run dotnet restore |

## Error Analysis

When build fails:
1. Identify error type (compile, runtime, config)
2. Locate file and line number
3. Check recent changes in that area
4. Search for similar patterns in codebase
5. Propose fix

## Important

- Always build backend before frontend when both needed
- Check for uncommitted changes that might cause issues
- Run `dotnet restore` / `npm install` if dependencies changed
