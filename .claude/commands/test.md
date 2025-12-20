---
description: Run tests for a specific project or all projects
allowed-tools: Bash, Read, Glob, TodoWrite
---

Run tests for: $ARGUMENTS

## Instructions

1. **Identify the project type** from the arguments:
   - If argument contains "Web" or is in `src/PlatformExampleAppWeb/` → Frontend (Angular/Nx)
   - If argument is a `.csproj` file or .NET project name → Backend (.NET)
   - If no argument or "all" → Run both backend and frontend tests

2. **For Backend (.NET) projects**:

   ```bash
   dotnet test <project>.csproj --verbosity normal
   ```

   Common test projects:
   - `src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Tests/`
   - `src/Platform/Easy.Platform.Tests/`

3. **For Frontend (Angular/Nx) projects**:

   ```bash
   cd src/PlatformExampleAppWeb && nx test <project>
   ```

   Common test projects:
   - `platform-core`
   - `text-snippet-domain`
   - `playground-text-snippet`

4. **Report results**:
   - Show pass/fail summary
   - Highlight any failing tests with file locations
   - If tests fail, offer to investigate and fix

5. **If no specific project provided**, list available test projects and ask which to run.
