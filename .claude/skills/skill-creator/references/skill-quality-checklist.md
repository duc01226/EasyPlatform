# Skill Quality Checklist

## Validation Criteria

### Structure (Required)
- [ ] SKILL.md exists with valid YAML frontmatter
- [ ] `name` and `description` fields present
- [ ] SKILL.md <100 lines total
- [ ] Directory name matches `name` field (kebab-case)

### Content Quality
- [ ] Purpose clear in first 2 lines
- [ ] Workflow/decision tree present (not just prose)
- [ ] Heavy content moved to references/ (progressive disclosure)
- [ ] No duplicate info between SKILL.md and references/
- [ ] Imperative writing style (verb-first, not "you should")
- [ ] References/ files also <100 lines each

### Metadata Quality
- [ ] Description includes trigger keywords for auto-activation
- [ ] Description specific enough to avoid false triggers
- [ ] `infer` set correctly (true for auto-activate, false for manual-only)

### Scripts Quality (if applicable)
- [ ] Tests written and passing
- [ ] `.env.example` provided for required env vars
- [ ] Env loading follows standard order
- [ ] Python has `requirements.txt`
- [ ] No bash-only scripts (portability)

## Scoring (0-10)
| Criteria | Weight | Score |
|----------|--------|-------|
| Concision (<100 lines SKILL.md) | 2 | |
| Progressive disclosure | 2 | |
| Auto-activation accuracy | 2 | |
| Actionable instructions | 2 | |
| No duplication with other skills | 1 | |
| Script reliability (if any) | 1 | |

**Pass threshold: 7/10**

## Common Anti-Patterns
- SKILL.md >100 lines (move content to references/)
- Inline code examples >5 lines (move to references/)
- Documentation-style prose instead of actionable instructions
- Duplicating content already in other skills or docs/
- Missing `Read:` directives to reference files
- Generic description that triggers on unrelated queries
- "Task Planning Notes" boilerplate at end (remove)
- Second-person writing ("You should...") instead of imperative

## Iteration Signals
After using a skill, watch for:
- Claude re-discovering info already in the skill -> improve SKILL.md clarity
- Claude ignoring bundled scripts -> improve description/references
- Skill triggering on wrong queries -> narrow description keywords
- Skill NOT triggering when needed -> add trigger keywords to description
