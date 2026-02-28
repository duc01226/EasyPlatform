# Primary Workflow

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT**: Ensure token efficiency while maintaining high quality.

#### 0. Understand Code First (MANDATORY)
- **MUST READ** `.claude/skills/shared/understand-code-first-protocol.md` before ANY work
- Read existing code before modifying. Validate assumptions with evidence. Search before creating.

#### 1. Planning
- Use `/plan` skill to create an implementation plan with tasks in `./plans` directory.
- Use `/research` skill for investigating technical topics before planning.
- **DO NOT** create new enhanced files, update to the existing files directly.

#### 2. Implementation
- Use `/cook` or `/code` skill to implement the plan.
- Write clean, readable, and maintainable code
- Follow established architectural patterns (CQRS, PlatformVmStore, BEM)
- Handle edge cases and error scenarios
- **[IMPORTANT]** After creating or modifying code file, run compile command/script to check for any compile errors.

#### 3. Testing
- Use `/test` skill to run tests and analyze results.
- Ensure high code coverage
- Test error scenarios
- **IMPORTANT:** Never use fake data, mocks, cheats, or tricks just to pass the build.
- **IMPORTANT:** Always fix failing tests and re-run until all tests pass.

#### 4. Code Quality
- Use `/code-simplifier` skill to clean up code after implementation.
- Use `/code-review` skill to review code quality.
- Follow coding standards and conventions
- Optimize for performance and maintainability

#### 5. Documentation
- Use `/docs-update` skill to update documentation if needed.
- Use `/changelog` skill to update changelog entries.

#### 6. Debugging
- Use `/debug` skill for systematic debugging when issues are reported.
- Use `/fix` skill to apply fixes after root cause is identified.
- Re-run tests after every fix to verify no regressions.
