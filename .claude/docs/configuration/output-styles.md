# Custom Output Styles

Output styles let a project define reusable response instructions. Store each style in .claude/output-styles/.

## Create a Style

Create .claude/output-styles/my-style.md:

    ---
    name: My Custom Style
    description: Brief description
    keep-coding-instructions: true
    ---

    # My Custom Style

    Instructions for Claude on how to respond.

    ## MANDATORY RULES
    1. **MANDATORY IMPORTANT MUST ATTENTION** do X
    2. **MANDATORY IMPORTANT MUST ATTENTION** do Y

    ## FORBIDDEN
    1. **NEVER** do Z

    ## Response Structure
    1. Section 1
    2. Section 2

## Select a Style

Use the command:

    /output-style my-style

Or set it in configuration:

    {
      "outputStyle": "my-style"
    }

## Related Documentation

- [README.md](./README.md) — Configuration overview
- [settings-reference.md](./settings-reference.md) — All settings

Source files: .claude/output-styles/
