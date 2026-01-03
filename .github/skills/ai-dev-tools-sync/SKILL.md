---
name: ai-dev-tools-sync
description: Synchronize Claude Code and GitHub Copilot configurations. Use when asked to update Claude setup, update Copilot setup, sync AI dev tools, add skills/prompts/agents across both platforms, or align Claude and Copilot configurations.
---

# AI Dev Tools Sync

Keep Claude Code and GitHub Copilot configurations in sync.

## When to Use

Trigger on: "update Claude", "update Copilot", "sync AI tools", "add new skill/prompt/agent"

## Quick Reference

| Claude Code | GitHub Copilot | Location |
|-------------|----------------|----------|
| Skills | Skills | `.github/skills/` (shared) |
| commands/*.md | prompts/*.prompt.md | `.github/prompts/` (shared) |
| Agents | Agents | `.github/agents/` (shared) |
| CLAUDE.md | copilot-instructions.md | Root + `.github/` |

## Sync Workflow

1. **Read Current Setup**
   - `.claude/workflows/` - Claude workflow config
   - `.github/copilot-instructions.md` - Copilot instructions
   - `CLAUDE.md` - Claude root instructions

2. **Research Latest Features**
   - Search: "GitHub Copilot features 2026"
   - Check: https://github.com/github/awesome-copilot

3. **Implement Changes**
   - Skills → `.github/skills/` (both platforms read)
   - Prompts → `.github/prompts/` (both platforms read)
   - Instructions → Update both `CLAUDE.md` and `copilot-instructions.md`

## Compatibility

- Copilot reads `.claude/skills/` (backward compatibility)
- Both read `.github/prompts/*.prompt.md`
- Both read `.github/agents/*.md`
- Both support `AGENTS.md` routing

## Extended Reference

See `.claude/skills/ai-dev-tools-sync/` for detailed references:
- `references/copilot-features.md` - Full feature catalog
- `references/sync-patterns.md` - Sync patterns and decision matrix
