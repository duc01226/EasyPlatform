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
| `.claude/skills/my-cmd/SKILL.md` | `.github/prompts/my-cmd.prompt.md` |
| Invoked via `/my-cmd` | Invoked via `/my-cmd` or `#prompt:my-cmd` |

**Sync Strategy**:
1. Create in `.github/prompts/` (both read)
2. Or maintain duplicates if behavior differs

## Instructions Sync

| Claude Code | GitHub Copilot |
|-------------|----------------|
| `CLAUDE.md` (root) | `.github/common.copilot-instructions.md` + `.github/workspace.copilot-instructions.md` |
| Single file | Split: generic AI rules (common) + project-specific (workspace) |

**Sync Strategy**:
1. Keep core rules in both CLAUDE.md and workspace.copilot-instructions.md
2. Reference detailed docs from `docs/` (backend-patterns-reference.md, frontend-patterns-reference.md)
3. Generic AI rules go in common.copilot-instructions.md

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
2. Edit `.github/common.copilot-instructions.md` (generic AI rules)
3. Edit `.github/workspace.copilot-instructions.md` (project-specific rules)
4. Keep essential rules in sync across all three
