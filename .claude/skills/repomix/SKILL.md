---
name: repomix
version: 1.0.0
description: '[AI & Tools] Package code repositories into single AI-friendly files using Repomix with customizable patterns and multiple output formats. Triggers: repomix, package repo, repository context, codebase snapshot, repo pack.'
disable-model-invocation: true
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

## Quick Summary

**Goal:** Package code repositories into single AI-friendly files using Repomix for LLM analysis.

**Workflow:**

1. **Assess** — Identify target repo (local/remote), output format, sensitivity concerns
2. **Configure** — Set include/ignore patterns, comment removal, output style
3. **Execute** — Run `repomix` with options, monitor token counts
4. **Validate** — Review output for sensitive data, check token limits for target LLM

**Key Rules:**

- Always review output before sharing (security check for API keys, credentials)
- Use `--include` patterns to stay within LLM context limits
- Default output is XML; use `--style markdown` for readable output
- Use `--token-count-tree` to identify token-heavy files before packaging

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Repomix Skill

Repomix packs entire repositories into single, AI-friendly files. Perfect for feeding codebases to LLMs like Claude, ChatGPT, and Gemini.

## When to Use

Use when:

- Packaging codebases for AI analysis
- Creating repository snapshots for LLM context
- Analyzing third-party libraries
- Preparing for security audits
- Generating documentation context
- Investigating bugs across large codebases
- Creating AI-friendly code representations

## Quick Start

### Check Installation

```bash
repomix --version
```

### Install

```bash
# npm
npm install -g repomix

# Homebrew (macOS/Linux)
brew install repomix
```

### Basic Usage

```bash
# Package current directory (generates repomix-output.xml)
repomix

# Specify output format
repomix --style markdown
repomix --style json

# Package remote repository
npx repomix --remote owner/repo

# Custom output with filters
repomix --include "src/**/*.ts" --remove-comments -o output.md
```

## Core Capabilities

### Repository Packaging

- AI-optimized formatting with clear separators
- Multiple output formats: XML, Markdown, JSON, Plain text
- Git-aware processing (respects .gitignore)
- Token counting for LLM context management
- Security checks for sensitive information

### Remote Repository Support

Process remote repositories without cloning:

```bash
# Shorthand
npx repomix --remote yamadashy/repomix

# Full URL
npx repomix --remote https://github.com/owner/repo

# Specific commit
npx repomix --remote https://github.com/owner/repo/commit/hash
```

### Comment Removal

Strip comments from supported languages (HTML, CSS, JavaScript, TypeScript, Vue, Svelte, Python, PHP, Ruby, C, C#, Java, Go, Rust, Swift, Kotlin, Dart, Shell, YAML):

```bash
repomix --remove-comments
```

## Common Use Cases

### Code Review Preparation

```bash
# Package feature branch for AI review
repomix --include "src/**/*.ts" --remove-comments -o review.md --style markdown
```

### Security Audit

```bash
# Package third-party library
npx repomix --remote vendor/library --style xml -o audit.xml
```

### Documentation Generation

```bash
# Package with docs and code
repomix --include "src/**,docs/**,*.md" --style markdown -o context.md
```

### Bug Investigation

```bash
# Package specific modules
repomix --include "src/auth/**,src/api/**" -o debug-context.xml
```

### Implementation Planning

```bash
# Full codebase context
repomix --remove-comments --copy
```

## Command Line Reference

### File Selection

```bash
# Include specific patterns
repomix --include "src/**/*.ts,*.md"

# Ignore additional patterns
repomix -i "tests/**,*.test.js"

# Disable .gitignore rules
repomix --no-gitignore
```

### Output Options

```bash
# Output format
repomix --style markdown  # or xml, json, plain

# Output file path
repomix -o output.md

# Remove comments
repomix --remove-comments

# Copy to clipboard
repomix --copy
```

### Configuration

```bash
# Use custom config file
repomix -c custom-config.json

# Initialize new config
repomix --init  # creates repomix.config.json
```

## Token Management

Repomix automatically counts tokens for individual files, total repository, and per-format output.

Typical LLM context limits:

- Claude Sonnet 4.5: ~200K tokens
- GPT-4: ~128K tokens
- GPT-3.5: ~16K tokens

### Token Count Optimization

Understanding your codebase's token distribution is crucial for optimizing AI interactions. Use the --token-count-tree option to visualize token usage across your project:

```bash
repomix --token-count-tree
```

This displays a hierarchical view of your codebase with token counts:

```
🔢 Token Count Tree:
────────────────────
└── src/ (70,925 tokens)
    ├── cli/ (12,714 tokens)
    │   ├── actions/ (7,546 tokens)
    │   └── reporters/ (990 tokens)
    └── core/ (41,600 tokens)
        ├── file/ (10,098 tokens)
        └── output/ (5,808 tokens)
```

You can also set a minimum token threshold to focus on larger files:

```bash
repomix --token-count-tree 1000  # Only show files/directories with 1000+ tokens
```

This helps you:

- Identify token-heavy files that might exceed AI context limits
- Optimize file selection using --include and --ignore patterns
- Plan compression strategies by targeting the largest contributors
- Balance content vs. context when preparing code for AI analysis

## Security Considerations

Repomix uses Secretlint to detect sensitive data (API keys, passwords, credentials, private keys, AWS secrets).

Best practices:

1. Always review output before sharing
2. Use `.repomixignore` for sensitive files
3. Enable security checks for unknown codebases
4. Avoid packaging `.env` files
5. Check for hardcoded credentials

Disable security checks if needed:

```bash
repomix --no-security-check
```

## Implementation Workflow

When user requests repository packaging:

1. **Assess Requirements**
    - Identify target repository (local/remote)
    - Determine output format needed
    - Check for sensitive data concerns

2. **Configure Filters**
    - Set include patterns for relevant files
    - Add ignore patterns for unnecessary files
    - Enable/disable comment removal

3. **Execute Packaging**
    - Run repomix with appropriate options
    - Monitor token counts
    - Verify security checks

4. **Validate Output**
    - Review generated file
    - Confirm no sensitive data
    - Check token limits for target LLM

5. **Deliver Context**
    - Provide packaged file to user
    - Include token count summary
    - Note any warnings or issues

## Reference Documentation

For detailed information, see:

- [Configuration Reference](./references/configuration.md) - Config files, include/exclude patterns, output formats, advanced options
- [Usage Patterns](./references/usage-patterns.md) - AI analysis workflows, security audit preparation, documentation generation, library evaluation

## Additional Resources

- GitHub: https://github.com/yamadashy/repomix
- Documentation: https://repomix.com/guide/
- MCP Server: Available for AI assistant integration

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
