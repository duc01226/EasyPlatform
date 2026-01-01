---
name: documentation
description: Use when enhancing documentation, adding code comments, creating API docs, or improving technical documentation.
---

# Documentation Patterns for EasyPlatform

## Code Documentation Principles

- **Accuracy-first**: Verify every documented feature with actual code
- **User-focused**: Organize based on user needs
- **Example-driven**: Include practical examples
- **Consistency**: Follow established patterns
- **No assumptions**: Always verify behavior before documenting

## XML Comments (C#)

```csharp
/// <summary>
/// Retrieves text snippets filtered by company and optional criteria.
/// </summary>
/// <param name="companyId">The company identifier.</param>
/// <param name="status">Optional status filter.</param>
/// <param name="ct">Cancellation token.</param>
/// <returns>List of matching text snippets.</returns>
/// <exception cref="UnauthorizedException">When user lacks access.</exception>
public async Task<List<TextSnippet>> GetTextSnippetsAsync(
    string companyId,
    TextSnippetStatus? status = null,
    CancellationToken ct = default)
```

## TypeScript/JSDoc Comments

````typescript
/**
 * Loads text snippets and updates component state.
 *
 * @param companyId - The company to load snippets for
 * @param options - Optional filtering options
 * @returns Observable that emits when loading completes
 *
 * @example
 * ```typescript
 * this.loadTextSnippets('company-123', { status: 'active' })
 *   .pipe(this.untilDestroyed())
 *   .subscribe();
 * ```
 */
loadTextSnippets(companyId: string, options?: LoadOptions): Observable<void>
````

## README Structure

```markdown
# Feature Name

## Overview

Brief description of what this feature does.

## Quick Start

\`\`\`typescript
// Minimal example to get started
\`\`\`

## API Reference

### Methods

| Method | Parameters | Returns | Description |
| ------ | ---------- | ------- | ----------- |

### Events

| Event | Payload | When Fired |
| ----- | ------- | ---------- |

## Examples

### Basic Usage

### Advanced Scenarios

## Troubleshooting

Common issues and solutions.
```

## When to Document

- Public APIs (commands, queries, controllers)
- Complex business logic
- Non-obvious behavior
- Configuration options
- Integration points

## When NOT to Document

- Self-explanatory code
- Private implementation details
- Redundant to type signatures

## Documentation Workflow

1. **Analyze** the feature/component
2. **Identify** documentation gaps
3. **Create** draft documentation
4. **Verify** against actual code
5. **Review** for clarity and completeness
