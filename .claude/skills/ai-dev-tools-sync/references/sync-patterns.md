# Sync Patterns

Patterns for keeping Claude Code and GitHub Copilot configurations synchronized.

## Skill Sync

Both platforms support skills in `.github/skills/`. Copilot also reads `.claude/skills/`.

**Best Practice**: Create skills in `.github/skills/` for maximum compatibility.

```
.github/skills/my-skill/
├── SKILL.md          # Both platforms read
├── scripts/          # Executable scripts
├── references/       # Progressive disclosure docs
└── assets/           # Templates, images
```

## Prompt/Command Sync

| Claude Code | GitHub Copilot |
|-------------|----------------|
| `.claude/commands/my-cmd.md` | `.github/prompts/my-cmd.prompt.md` |
| Invoked via `/my-cmd` | Invoked via `/my-cmd` or `#prompt:my-cmd` |

**Sync Strategy**:
1. Create in `.github/prompts/` (both read)
2. Or maintain duplicates if behavior differs

## Instructions Sync

| Claude Code | GitHub Copilot |
|-------------|----------------|
| `CLAUDE.md` (root) | `.github/copilot-instructions.md` |
| Single file | Multi-file with `applyTo` patterns |

**Sync Strategy**:
1. Keep core rules in both files
2. Use `.github/instructions/` for path-scoped rules (Copilot-specific)
3. Reference detailed docs from both files

## Agent Sync

Both platforms read `.github/agents/*.md`.

**Single Source**: Maintain agents in `.github/agents/` only.

## Workflow Sync

Claude has workflow orchestration. Copilot uses chat modes.

| Claude Workflow | Copilot Equivalent |
|-----------------|-------------------|
| Sequential agent chains | Chat mode switching |
| `.claude/workflows/` | `.github/chatmodes/` |

## Decision Matrix

| Feature | Location | Reason |
|---------|----------|--------|
| Skills | `.github/skills/` | Maximum compatibility |
| Prompts | `.github/prompts/` | Both platforms read |
| Agents | `.github/agents/` | Shared location |
| Instructions | Both files | Platform-specific nuances |
| Workflows | `.claude/workflows/` | Claude-specific |
| Chat Modes | `.github/chatmodes/` | Copilot-specific |

## Common Sync Tasks

### Add New Skill
```bash
mkdir -p .github/skills/new-skill
# Create SKILL.md with frontmatter
# Add references/ and scripts/ as needed
```

### Add New Prompt
```bash
# Create in .github/prompts/ for both platforms
touch .github/prompts/new-prompt.prompt.md
```

### Update Core Instructions
1. Edit `CLAUDE.md`
2. Edit `.github/copilot-instructions.md`
3. Keep essential rules in sync

### Add Path-Scoped Instructions (Copilot)
```bash
# Copilot-specific feature
touch .github/instructions/backend-cqrs.instructions.md
# Add applyTo: "src/Services/**/*Command*.cs"
```
