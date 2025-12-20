# GitHub Copilot Prompts for EasyPlatform

This directory contains comprehensive prompt files for GitHub Copilot to assist with EasyPlatform development.

## Available Prompts

| File | Description | Use When |
|------|-------------|----------|
| [backend-development.prompt.md](backend-development.prompt.md) | Backend patterns, CQRS, repositories, validation | Implementing backend features, commands, queries |
| [frontend-development.prompt.md](frontend-development.prompt.md) | Angular patterns, components, stores, forms | Building UI components, state management |
| [security-review.prompt.md](security-review.prompt.md) | OWASP Top 10, authorization, validation | Reviewing code security, implementing auth |
| [performance-optimization.prompt.md](performance-optimization.prompt.md) | Database queries, API endpoints, rendering | Optimizing slow queries, improving performance |
| [feature-implementation.prompt.md](feature-implementation.prompt.md) | Full feature workflow, planning, testing | Implementing complete features end-to-end |
| [bug-diagnosis.prompt.md](bug-diagnosis.prompt.md) | Root cause analysis, debugging, verification | Diagnosing and fixing bugs systematically |
| [documentation.prompt.md](documentation.prompt.md) | Code comments, API docs, ADRs, guides | Writing documentation, creating ADRs |

## How to Use

### In GitHub Copilot Chat

1. **Reference in chat:**
   ```
   @workspace Using #file:backend-development.prompt.md, create a CQRS command for saving employees
   ```

2. **Ask context-aware questions:**
   ```
   @workspace Based on #file:security-review.prompt.md, review this controller for authorization issues
   ```

3. **Get pattern-specific help:**
   ```
   @workspace Following #file:frontend-development.prompt.md, create a component with PlatformVmStore
   ```

### In Inline Suggestions

1. GitHub Copilot will automatically use these prompts when they're in your workspace
2. Start typing a class/method name and Copilot will suggest code following EasyPlatform patterns
3. The prompts guide Copilot to generate platform-consistent code

## Prompt Structure

Each prompt file includes:

- **Overview**: Purpose and scope
- **Patterns**: Specific code patterns with examples
- **Checklists**: Verification steps
- **Anti-patterns**: Common mistakes to avoid
- **Examples**: Real-world code samples
- **References**: Links to detailed documentation

## Quick Reference

### Backend Development
```
Need backend feature?
├── API endpoint → PlatformBaseController + CQRS Command
├── Business logic → Command Handler in Application layer
├── Data access → Repository Extensions with static expressions
├── Cross-service → Entity Event Consumer
├── Scheduled task → PlatformApplicationBackgroundJob
└── Migration → PlatformDataMigrationExecutor / EF migrations
```

### Frontend Development
```
Need frontend feature?
├── Simple component → PlatformComponent
├── Complex state → PlatformVmStoreComponent + Store
├── Forms → PlatformFormComponent
├── API calls → PlatformApiService
├── Cross-domain → apps-domains library
└── Reusable → platform-core library
```

## Integration with EasyPlatform Docs

These prompts complement the comprehensive documentation in `docs/claude/`:

- **Prompts**: Quick reference for GitHub Copilot
- **Docs**: Detailed explanations and complete patterns

Always refer to the full documentation for:
- In-depth pattern explanations
- Complete code examples
- Architecture decisions
- Advanced scenarios

## Contributing

When adding new prompts:

1. Follow YAML frontmatter format:
   ```yaml
   ---
   description: "Brief description of prompt purpose"
   ---
   ```

2. Include sections:
   - Overview
   - Patterns with examples
   - Checklist
   - Anti-patterns
   - References

3. Keep examples concise but complete
4. Link to detailed docs in `docs/claude/`

## Resources

- [EasyPlatform Documentation](../../docs/claude/)
- [CLAUDE.md](../../CLAUDE.md)
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)

## License

MIT License - See [LICENSE](../../LICENSE)
