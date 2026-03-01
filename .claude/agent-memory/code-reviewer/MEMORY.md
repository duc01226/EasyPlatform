# Code Reviewer Agent Memory

## Skills Genericization Patterns

### Good genericization patterns observed:
- `(search for: store base class)` -- tells AI to discover project-specific pattern dynamically
- `see docs/backend-patterns-reference.md` -- delegates specifics to project-configurable doc files
- `Service code **` instead of `src/Services/**` -- generic label instead of hardcoded path
- Using `{Service}`, `{Framework}`, `{Project}` placeholders in template code

### Common leak categories in genericization work:
1. Framework-specific method names embedded inline (effectSimple, PageBy, MapToEntity, etc.)
2. Hardcoded directory paths (src/Services/, Application/UseCaseQueries/, src/Web/)
3. Project entity names used as code examples (Goal, FormTemplate, etc.)

### Files that serve as "gold standard" for generic skills:
- `.claude/skills/api-design/SKILL.md` -- clean delegation to docs
- `.claude/skills/review-changes/SKILL.md` -- generic doc staleness table labels
- `.claude/skills/learn/SKILL.md` -- convention doc paths without project names
