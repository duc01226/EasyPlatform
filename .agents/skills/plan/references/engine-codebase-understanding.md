# Planning Engine — Codebase Understanding

### 3. Codebase Understanding (**Skip if:** Provided with scout reports)

#### Core Activities

##### Parallel Scout Agents

- Use `$scout --ext` (external engine) or `$scout` (internal, default) slash command to search the codebase for files needed to complete the task
- Each scout locates files needed for specific task aspects
- Wait for all scout agents to report back before analysis
- Efficient for finding relevant code across large codebases

##### Essential Documentation Review

ALWAYS read these files first:

1. **`./.claude/docs/development-rules.md`** (IMPORTANT)
    - File Name Conventions
    - File Size Management
    - Development rules and best practices
    - Code quality standards
    - Security guidelines

2. **`./docs/project-reference/backend-patterns-reference.md`** + **`./docs/project-reference/frontend-patterns-reference.md`**
    - Backend: CQRS, repositories, entities, validation, message bus
    - Frontend: component base classes, state management, API services
    - Naming conventions and coding standards

3. **`./docs/project-reference/project-structure-reference.md`**
    - Service architecture, ports, directory tree
    - Tech stack and module codes

4. **`./docs/design-guidelines.md`** (if exists)
    - Design system guidelines
    - Branding and UI/UX conventions
    - Component library usage

##### Environment Analysis

- Review development environment setup
- Analyze dotenv files and configuration
- Identify required dependencies
- Understand build and deployment processes

##### Pattern Recognition

- Study existing patterns in codebase
- Identify conventions and architectural decisions
- Note consistency in implementation approaches
- Understand error handling patterns

##### Integration Planning

- Identify how new features integrate with existing architecture
- Map dependencies between components
- Understand data flow and state management
- Consider backward compatibility

#### Codebase Understanding Best Practices

- Start with documentation before diving into code
- Use scouts for targeted file discovery
- Document patterns found for consistency
- Note any inconsistencies or technical debt
- Consider impact on existing features
