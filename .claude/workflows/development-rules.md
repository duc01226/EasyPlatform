# Development Rules

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT:** You ALWAYS follow these principles: **YAGNI (You Aren't Gonna Need It) - KISS (Keep It Simple, Stupid) - DRY (Don't Repeat Yourself)**

## General
- **File Naming**: Use kebab-case for file names with a meaningful name that describes the purpose of the file, doesn't matter if the file name is long, just make sure when LLMs read the file names while using Grep or other tools, they can understand the purpose of the file right away without reading the file content.
- **File Size Management**: Keep individual code files under 200 lines for optimal context management
  - Split large files into smaller, focused components/modules
  - Use composition over inheritance for complex widgets
  - Extract utility functions into separate modules
  - Create dedicated service classes for business logic
- Use `docs-seeker` skill for exploring latest docs of plugins/packages if needed
- Use `gh` bash command to interact with Github features if needed
- Use `psql` bash command to query Postgres database for debugging if needed
- Use `ai-multimodal` skill for describing details of images, videos, documents, etc. if needed
- Use `ai-multimodal` skill and `imagemagick` skill for generating and editing images, videos, documents, etc. if needed
- Use `sequential-thinking` skill and `debug` skills for sequential thinking, analyzing code, debugging, etc. if needed
- **[IMPORTANT]** Follow the codebase structure and code standards in `./docs` during implementation.
- **[IMPORTANT]** Do not just simulate the implementation or mocking them, always implement the real code.
- **[CRITICAL] Class Responsibility Rule:**
  - Logic belongs in LOWEST layer: Entity/Model > Service > Component/Handler
  - Backend: Entity mapping → Command.UpdateEntity() or DTO.MapToEntity(), NOT in Handler
  - Frontend: Constants, column arrays, role lists → static properties in Model class, NOT in Component
  - Frontend: Display logic (CSS class, status text) → instance getter in Model, NOT switch in Component

## Code Quality Guidelines
- Read and follow codebase structure and code standards in `./docs`
- Don't be too harsh on code linting, but **make sure there are no syntax errors and code are compilable**
- Prioritize functionality and readability over strict style enforcement and code formatting
- Use reasonable code quality standards that enhance developer productivity
- Use try catch error handling & cover security standards
- Use `code-reviewer` agent to review code after every implementation

## Documentation Workflow (MANDATORY)

### Business Feature Documentation
When creating/updating files in `docs/business-features/**`:
1. **MUST** run `/business-feature-docs` skill first
2. **MUST** read template: `docs/templates/detailed-feature-docs-template.md`
3. **MUST** reference: `docs/features/README.ExampleFeature1.md`
4. **MUST** include all 26 sections in correct order
5. **MUST** include Quick Navigation table with Audience column
6. **MUST** use TC-{MOD}-XXX format for test cases with GIVEN/WHEN/THEN

### General Documentation
When creating/updating files in `docs/**`:
1. Check for existing templates in `docs/templates/`
2. Check for sibling docs in same folder as reference
3. Use `/feature-docs` skill for single-file feature docs
4. Use `/documentation` skill for general docs

## Pre-commit/Push Rules
- Run linting before commit
- Run tests before push (DO NOT ignore failed tests just to pass the build or github actions)
- Keep commits focused on the actual code changes
- **DO NOT** commit and push any confidential information (such as dotenv files, API keys, database credentials, etc.) to git repository!
- Create clean, professional commit messages without AI references. Use conventional commit format.

## Code Implementation
- Write clean, readable, and maintainable code
- Follow established architectural patterns
- Implement features according to specifications
- Handle edge cases and error scenarios
- **DO NOT** create new enhanced files, update to the existing files directly.

## Doc Review (MANDATORY at session wrap-up)

After completing any code changes, check for stale documentation before closing the task:

1. Run `git diff --name-only` to list changed files.
2. Map changed files to relevant docs:
   - `.claude/hooks/**` → `docs/claude/claude-kit-setup.md`, `.claude/docs/hooks/README.md`, `.claude/docs/hooks/enforcement.md`
   - `.claude/skills/**`, `.claude/workflows.json`, `.claude/settings.json` → `docs/claude/claude-kit-setup.md`
   - `src/Backend/**/*.cs` → `docs/business-features/` (relevant module), `docs/claude/backend-patterns.md`, `CHANGELOG.md`
   - `src/Frontend/**/*.ts` → `docs/business-features/` (relevant module), `docs/claude/frontend-patterns.md`, `CHANGELOG.md`
   - `src/Platform/**` → `docs/architecture-overview.md`, `CHANGELOG.md`
   - `CLAUDE.md` structural changes → `docs/claude/README.md`
3. For each potentially stale doc: flag it in the final review task or update it immediately.
4. Output `No doc updates needed` if no mapping applies.

**Use the `/watzup` skill** to perform this check automatically at the end of any work session.