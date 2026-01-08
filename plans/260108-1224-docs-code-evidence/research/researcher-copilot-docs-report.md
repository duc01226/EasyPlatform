# GitHub Copilot Documentation Config Research

## Files Found

| File | Purpose | Has Evidence Rules |
|------|---------|-------------------|
| `.github/skills/feature-docs/SKILL.md` | Feature docs skill | ✅ Updated |
| `.github/skills/business-feature-docs/SKILL.md` | Business docs skill | ✅ Updated |
| `.github/prompts/documentation.prompt.md` | Core doc standards | ❌ Needs update |
| `.github/prompts/docs-init.prompt.md` | Initialize docs | ❌ Needs update |
| `.github/prompts/docs-update.prompt.md` | Update docs | ❌ Needs update |
| `.github/agents/docs-manager.md` | Docs agent | ❌ Needs update |
| `.github/agents/docs-manager.agent.md` | Docs agent variant | ❌ Needs update |

## Current State

### Skills (UPDATED)
- Mandatory evidence format added
- Verification protocol included
- Anti-hallucination checklist present

### Prompts & Agents (NOT UPDATED)
- No mandatory evidence requirements
- Missing verification tables
- No test case evidence format

## Gaps

1. **documentation.prompt.md** - Core prompt lacks evidence section
2. **docs-init.prompt.md** - No evidence requirements in init workflow
3. **docs-update.prompt.md** - Update workflow missing evidence verification
4. **docs-manager agents** - No code evidence verification instructions

## Recommended Changes

1. Add code evidence section to all docs prompts
2. Update docs-manager agents with verification protocol
3. Add evidence validation to quality checklists
