# Claude Config Directory

Centralized configuration templates for Claude skills and workflows.

## Purpose

This directory provides a single source of truth for reusable configuration templates that can be referenced by skills, agents, and workflows.

## Files

| File | Purpose |
|------|---------|
| `release-notes-template.yaml` | Template for release notes generation |
| `skill-template.md` | Template for creating new skills |
| `agent-template.md` | Template for creating new agents |

## Usage

### In Skills/Scripts

```javascript
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.load(fs.readFileSync('.claude/config/release-notes-template.yaml', 'utf8'));
```

### Creating New Skills

1. Copy `skill-template.md` to `.claude/skills/{skill-name}/SKILL.md`
2. Update frontmatter with skill details
3. Add skill-specific content and examples
4. Optionally create `references/` subdirectory for detailed docs

### Creating New Agents

1. Copy `agent-template.md` to `.claude/agents/{agent-name}.md`
2. Update frontmatter with agent details
3. Define agent behavior, constraints, and process

## Conventions

- **YAML files**: Use for structured configuration (templates, mappings)
- **Markdown files**: Use for documentation and skill/agent definitions
- **File naming**: Use lowercase with hyphens (e.g., `release-notes-template.yaml`)
