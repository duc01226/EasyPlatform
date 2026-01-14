---
description: Run linters and fix issues for backend or frontend
allowed-tools: Bash, Read, Edit, Glob, TodoWrite
---

Run linting: $ARGUMENTS

## Instructions

1. **Parse arguments**:
   - `backend` or `be` → Run .NET analyzers
   - `frontend` or `fe` → Run ESLint/Prettier
   - `fix` → Auto-fix issues where possible
   - No argument → Run both, report only

2. **For Backend (.NET)**:

   ```bash
   dotnet build EasyPlatform.sln /p:TreatWarningsAsErrors=false
   ```

   - Check for analyzer warnings (CA*, IDE*, etc.)
   - Report code style violations

3. **For Frontend (Angular/Nx)**:

   ```bash
   cd src/PlatformExampleAppWeb
   nx lint playground-text-snippet
   nx lint platform-core
   ```

   With auto-fix:

   ```bash
   nx lint playground-text-snippet --fix
   npx prettier --write "apps/**/*.{ts,html,scss}" "libs/**/*.{ts,html,scss}"
   ```

4. **Report format**:
   - Group issues by severity (error, warning, info)
   - Show file paths and line numbers
   - Suggest fixes for common issues

5. **Auto-fix behavior**:
   - If `fix` argument provided, apply safe auto-fixes
   - Report what was fixed vs what needs manual attention
