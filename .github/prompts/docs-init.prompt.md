---
agent: 'agent'
description: 'Analyze the codebase and create initial documentation'
tools: ['read', 'search', 'edit', 'execute']
---

# Initialize Documentation

Analyze the codebase and create initial documentation structure.

## Phase 1: Codebase Analysis

1. Run `ls -la` to identify actual project directories
2. Explore key directories to understand project structure:
   - `src/PlatformExampleApp/` - Example microservice (TextSnippet)
   - `src/Platform/` - Framework core
   - `src/PlatformExampleAppWeb/` - Frontend applications
3. Identify patterns, technologies, and architecture

## Phase 2: Documentation Creation

Create initial documentation files:

### Required Documentation
- `docs/project-overview-pdr.md`: Project overview and PDR (Product Development Requirements)
- `docs/codebase-summary.md`: Codebase summary with key directories and files
- `docs/code-standards.md`: Codebase structure and coding standards
- `docs/system-architecture.md`: System architecture diagrams and explanations
- `README.md`: Update with project overview (keep under 300 lines)

### Documentation Standards
- Use `docs/` directory as the source of truth
- Include code examples where helpful
- Reference actual file paths from the codebase
- Keep documentation actionable and concise

**IMPORTANT**: Focus on documentation only - do not start implementing code changes.
