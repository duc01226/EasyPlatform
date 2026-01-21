---
description: Build backend and/or frontend projects
allowed-tools: Bash, Read, Glob, TodoWrite
---

Build projects: $ARGUMENTS

## Instructions

1. **Parse arguments**:
    - `backend` or `be` → Build .NET solution only
    - `frontend` or `fe` → Build Angular/Nx workspace only
    - `all` or no argument → Build both

2. **For Backend (.NET)**:

    ```bash
    dotnet build EasyPlatform.sln --configuration Release
    ```

    - Report any build errors with file locations
    - Show warning count

3. **For Frontend (Angular/Nx)**:

    ```bash
    cd src/Frontend && nx build playground-text-snippet --configuration production
    ```

    - For library builds: `nx build <lib-name>`
    - Report bundle sizes if successful

4. **Build order** (if building both):
    - Backend first (APIs must compile)
    - Frontend second (may depend on generated types)

5. **On build failure**:
    - Show the first 3-5 errors
    - Offer to investigate and fix the issues

## Task Planning Notes

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
