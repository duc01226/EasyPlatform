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
- Use `sequential-thinking` skill and `debugging` skills for sequential thinking, analyzing code, debugging, etc. if needed
- **[IMPORTANT]** Follow the codebase structure and code standards in `./docs` during implementation.
- **[IMPORTANT]** Do not just simulate the implementation or mocking them, always implement the real code.

## Code Quality Guidelines

- Read and follow codebase structure and code standards in `./docs`
- Don't be too harsh on code linting, but **make sure there are no syntax errors and code are compilable**
- Prioritize functionality and readability over strict style enforcement and code formatting
- Use reasonable code quality standards that enhance developer productivity
- Use try catch error handling & cover security standards
- Use `code-reviewer` agent to review code after every implementation
- **[CRITICAL] Class Responsibility Rule:**
  - Logic belongs in LOWEST layer: Entity/Model > Service > Component/Handler
  - Backend: Entity mapping → Command.UpdateEntity() or DTO.MapToEntity(), NOT in Handler
  - Frontend: Constants, column arrays, role lists → static properties in Model class, NOT in Component
  - Frontend: Display logic (CSS class, status text) → instance getter in Model, NOT switch in Component

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

## Mandatory Post-Task Two-Pass Review Protocol

**CRITICAL:** After ANY code changes (bug fix or feature), execute this protocol BEFORE task completion.

### Pass 1: Initial Review

1. Run `git diff` to examine unstaged changes
2. Verify changes correctly implement the task requirements
3. Check compliance with project conventions and best practices:
   - Backend: repository patterns, validation fluent API, DTOs, event handlers
   - Frontend: base classes, stores, BEM classes, untilDestroyed()
4. Identify security vulnerabilities and edge cases
5. Fix any issues found → mark `MADE_CHANGES = true`

### Pass 2: Re-Review (Conditional)

**ONLY IF Pass 1 made changes:**

1. Run `git diff` again to verify all current changes
2. Re-execute full review checklist on updated code
3. Ensure corrections didn't introduce new issues
4. Apply minimal, targeted fixes if needed

### Quick Reference

```bash
# Execute review
/review:post-task

# Or use code-reviewer subagent for complex reviews
Task tool → code-reviewer subagent
```

### Review Checklist Quick Reference

- [ ] Task objective achieved correctly
- [ ] No unrelated/unnecessary modifications
- [ ] Follows project code conventions
- [ ] No security vulnerabilities
- [ ] Edge cases handled
- [ ] Ready for commit
