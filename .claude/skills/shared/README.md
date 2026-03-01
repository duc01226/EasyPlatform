# Shared Skill Modules

Reusable content blocks extracted from multiple skills to eliminate duplication. Each module is self-contained and referenced by 3+ skills via `**Prerequisites:** **MUST READ** ...` lines.

## Modules

| File | Purpose | Words | Consumer Skills | Status |
|------|---------|-------|----------------|--------|
| `evidence-based-reasoning-protocol.md` | Consolidated evidence-based reasoning: core rules, confidence levels, validation chain, risk matrix, code removal checklist | ~740 | All code-modifying and analysis skills (50) | **Active** |
| `understand-code-first-protocol.md` | Read-before-write protocol, assumption validation, external memory | ~350 | All code-modifying skills (34+) | **Active** |
| `design-system-check.md` | Mandatory design system doc locations and key files to read before frontend work | 145 | frontend-design, web-design-guidelines | **Active** |
| `module-detection-keywords.md` | Module keyword lists for automatic context loading | 127 | idea, product-owner, refine, story (4) | **Active** |
| `references/module-codes.md` | Single source of truth for TC ID formats, service codes, feature codes | ~200 | test-spec, test-specs-docs, integration-test, tasks-test-generation (4) | **Active** |

## Guidelines for Adding New Shared Modules

1. **3+ skill rule**: Only extract content duplicated across 3 or more skills
2. **Under 500 words**: Keep modules concise and focused (exception: `evidence-based-reasoning-protocol.md` at ~740 words — justified as the most critical cross-cutting protocol)
3. **Self-contained**: No dependencies on other shared modules
4. **Skill-specific stays inline**: Do not over-extract; keep customizations in each skill
5. **Reference format**: Skills reference shared modules via `**Prerequisites:** **MUST READ** \`.claude/skills/shared/{file}.md\` before executing.`
6. **Version bump**: When extracting content from a skill, bump its patch version (X.Y.Z -> X.Y.Z+1)
7. **New skills**: Use `_templates/template-skill/SKILL.md` as starting point — it includes protocol references by default
