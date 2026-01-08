---
title: "Mandatory Code Evidence for Documentation"
description: "Enforce code proof evidence in all documentation generation across Claude Code and GitHub Copilot"
status: completed
priority: P1
effort: 2h
branch: main
tags: [documentation, claude-code, copilot, tooling]
created: 2026-01-08
---

# Plan: Mandatory Code Evidence for Documentation

## Executive Summary

Update all documentation generation configs (Claude Code + GitHub Copilot) to enforce mandatory code proof evidence in test cases. Every test case must have verifiable `file:line` references, with 3-pass verification protocol to prevent hallucination.

## Validation Summary

**Validated:** 2026-01-08
**Questions:** 4

### Confirmed Decisions
- **Scope**: Include documentation commands (`.claude/commands/docs/*.md`)
- **Migration**: Require evidence retroactively (all docs, not just new)
- **Verification**: 3-pass protocol for ALL documentation types
- **Output Format**: Include status column (✅ Verified / ⚠️ Stale / ❌ Missing)

### Action Items
- [x] Add Phase 4 for documentation commands
- [x] Update risk mitigation from "grandfather" to "retroactive enforcement"
- [x] Add status column to evidence format

---

## Progress Overview

| Phase | Description | Status | Files |
|-------|-------------|--------|-------|
| 0 | Skills - Claude & Copilot | ✅ Done | 4 files |
| 1 | Claude Code Remaining | ✅ Done | 2 files |
| 2 | Copilot Prompts | ✅ Done (2026-01-08) | 3 files |
| 3 | Copilot Agents | ✅ Done (2026-01-08) | 2 files |
| 4 | Documentation Commands | ✅ Done (2026-01-08) | 3 files |

## Key Evidence Format

```markdown
**Evidence**: `{RelativeFilePath}:{LineNumber}` or `{RelativeFilePath}:{StartLine}-{EndLine}`
```

### Valid Examples
| Type | Example |
|------|---------|
| Single line | `ErrorMessage.cs:83` |
| Line range | `MoveApplicationInPipelineCommand.cs:140-156` |
| Multiple | `Handler.cs:42-52`, `Entity.cs:35-50` |

### Forbidden
- Template placeholders: `{FilePath}:{LineRange}`
- Vague: "Based on CQRS pattern"
- Missing lines: `SomeFile.cs`

## Implementation Phases

### Phase 0: Skills (COMPLETED)
- [x] `.claude/skills/feature-docs/SKILL.md`
- [x] `.claude/skills/business-feature-docs/SKILL.md`
- [x] `.github/skills/feature-docs/SKILL.md`
- [x] `.github/skills/business-feature-docs/SKILL.md`

### [Phase 1: Claude Code Remaining](./phase-01-claude-remaining.md) - ✅ DONE
- [x] `.claude/skills/test-specs-docs/SKILL.md`
- [x] `.claude/agents/docs-manager.md`

### [Phase 2: Copilot Prompts](./phase-02-copilot-prompts.md) - ✅ DONE (2026-01-08)
- [x] `.github/prompts/documentation.prompt.md`
- [x] `.github/prompts/docs-init.prompt.md`
- [x] `.github/prompts/docs-update.prompt.md`

### [Phase 3: Copilot Agents](./phase-03-copilot-agents.md) - ✅ DONE (2026-01-08)
- [x] `.github/agents/docs-manager.md`
- [x] `.github/agents/docs-manager.agent.md`

### [Phase 4: Documentation Commands](./phase-04-commands.md) - ✅ DONE (2026-01-08)
- [x] `.claude/commands/docs/init.md`
- [x] `.claude/commands/docs/update.md`
- [x] `.claude/commands/docs/summarize.md`

## Research

- [Claude Code Research](./research/researcher-claude-docs-report.md)
- [GitHub Copilot Research](./research/researcher-copilot-docs-report.md)

## Success Criteria

- [x] All 14 files updated with evidence requirements
- [x] Evidence format consistent across all configs
- [x] 3-pass verification protocol in all doc skills
- [x] Quality checklists include evidence validation
- [x] Status column (✅/⚠️/❌) in evidence tables
- [x] No template placeholders in output docs

## Risk Assessment

| Risk | L | I | Mitigation |
|------|---|---|------------|
| Existing docs need updates | M | M | Retroactive enforcement - update when touched |
| Slows documentation generation | L | M | Evidence sources table speeds lookup |
| Line numbers stale after changes | M | M | Status column shows ⚠️ Stale, verification catches |
