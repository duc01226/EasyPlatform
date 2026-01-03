---
agent: 'agent'
description: 'Analyze the codebase and update documentation to reflect current state'
tools: ['read', 'search', 'edit', 'execute']
---

# Update Documentation

Analyze the codebase and update documentation to reflect the current state.

## Phase 1: Codebase Analysis

1. Run `ls -la` to identify actual project directories
2. Explore key directories to understand current project structure:
   - `src/PlatformExampleApp/` - Backend microservices
   - `src/Platform/` - Framework core
   - `src/PlatformExampleAppWeb/` - Frontend applications
3. Compare current state with existing documentation
4. Identify changes, additions, and removals

## Phase 2: Documentation Update

Update documentation files as needed:

### Core Documentation
- `README.md`: Update project overview (keep under 300 lines)
- `docs/project-overview-pdr.md`: Update project overview and PDR
- `docs/codebase-summary.md`: Update codebase summary
- `docs/code-standards.md`: Update coding standards
- `docs/system-architecture.md`: Update system architecture

### Optional Documentation
- `docs/project-roadmap.md`: Update project roadmap
- `docs/deployment-guide.md`: Update deployment guide
- `docs/design-guidelines.md`: Update design guidelines

## Additional Requests

${input:requests}

## Guidelines

- Use `docs/` directory as the source of truth for documentation
- Preserve existing content structure where possible
- Mark deprecated or removed features clearly
- Include timestamps for major updates
- Reference actual file paths from the codebase

**IMPORTANT**: Focus on documentation updates only - do not implement code changes.
