# Skill Naming Conventions

Reference guide for naming Claude Code skills consistently in BravoSUITE.

## Core Rules

1. **Format:** lowercase-hyphen-case only
2. **Max Length:** 64 characters
3. **Characters:** `a-z`, `0-9`, `-` (no underscores, spaces)
4. **Match:** `name` field MUST match directory name exactly

## Prefix Conventions

### `tasks-` Prefix (Autonomous Mode)

**Purpose:** Autonomous/headless workflows that run without continuous user interaction.

**Characteristics:**
- Structured phases with approval gates
- Creates artifacts in `.ai/workspace/`
- Minimal user prompts during execution
- Explicit approval before implementation

**BravoSUITE Examples:**
| Skill | Purpose |
|-------|---------|
| `tasks-test-generation` | Generate tests autonomously |
| `tasks-documentation` | Auto-generate docs |
| `tasks-feature-implementation` | Implement features with approval gates |
| `tasks-code-review` | Comprehensive automated review |
| `tasks-spec-update` | Update specifications |

**When to Use:**
- Skill can operate independently for extended periods
- Output needs validation before proceeding
- Workflow has discrete phases

### `arch-` Prefix (Architecture)

**Purpose:** Architecture-level analysis and design skills.

**Characteristics:**
- System-wide impact
- Cross-cutting concerns
- Design patterns and decisions

**BravoSUITE Examples:**
| Skill | Purpose |
|-------|---------|
| `arch-security-review` | Security vulnerability analysis |
| `arch-performance-optimization` | System-wide performance |
| `arch-cross-service-integration` | Service boundary design |

**When to Use:**
- Skill affects multiple services/modules
- Decisions impact system architecture
- Analysis requires system-wide view

### Frontend Patterns (via docs + hooks)

**Approach:** Frontend patterns are handled via `docs/frontend-patterns-reference.md` (auto-injected by `frontend-typescript-context.cjs` hook). No tech-stack-specific skill needed — keeps the skill catalog generic.

**When to Use:**
- `frontend-design` — for UI implementation
- `web-design-guidelines` — for UI compliance review
- Pattern reference docs — auto-injected when editing `.ts` files
- Implements BravoSUITE frontend patterns
- Creates Angular-specific code

### No Prefix (General)

**Purpose:** General skills that work interactively or apply broadly.

**BravoSUITE Examples:**
- `debug` - Systematic debugging (any language)
- `documentation` - Doc enhancement
- `code-review` - Interactive code review

**When to Use:**
- Skill is language/framework agnostic
- Interactive mode is primary use case
- Skill applies to many contexts

## Variant Pattern

Interactive and autonomous variants of the same skill:

```
skill-name          # Interactive (user-engaged)
tasks-skill-name    # Autonomous (headless)
```

**Cross-Reference Requirement:**
Each variant MUST reference the other in its description:

```markdown
> **Skill Variant:** Use this skill for **interactive X**.
> For autonomous X, use `tasks-X` instead.
```

## Shared Module Pattern

### `shared/` Directory

**Purpose:** Reusable content blocks extracted from 3+ skills to eliminate duplication (DRY).

**Location:** `.claude/skills/shared/{module-name}.md`

**Naming Rules:**
- Use lowercase-hyphen-case (same as skill names)
- Name describes the content purpose, not the consuming skills
- Must include a `README.md` index file

**Current Modules:**
| Module | Purpose |
|--------|---------|
| `evidence-based-reasoning-protocol.md` | Evidence-based reasoning: core rules, confidence levels, validation chain, risk matrix |
| `understand-code-first-protocol.md` | Read-before-write protocol, assumption validation, external memory |
| `design-system-check.md` | Frontend design system doc locations |
| `module-detection-keywords.md` | BravoSUITE module keyword lists |

**Guidelines:**
- Only extract content duplicated across 3+ skills
- Keep modules under 500 words
- Self-contained (no dependencies on other shared modules)
- Skills reference via: `**Prerequisites:** Read \`.claude/skills/shared/{file}.md\` before executing.`

### `references/` Subdirectory

**Purpose:** Progressive disclosure -- keeps SKILL.md concise while storing detailed reference material in separate files.

**Location:** `.claude/skills/{skill-name}/references/{topic}.md`

**When to Use:**
- SKILL.md exceeds ~200 lines of detailed content
- Reference material is only needed for specific sub-tasks
- Content is supplementary (examples, deep-dives, checklists)

**Naming Rules:**
- Files use lowercase-hyphen-case
- Name describes the topic, not the skill (e.g., `cqrs-patterns.md` not `backend-ref.md`)

**Example:**
```
.claude/skills/databases/
|-- SKILL.md              # Core patterns (~100 lines)
+-- references/
    |-- mongodb-guide.md   # MongoDB deep-dive
    +-- sql-patterns.md    # SQL optimization guide
```

## Anti-Patterns

| Issue | Example | Fix |
|-------|---------|-----|
| Redundant suffix | `debugging-skill` | `debug` |
| Mixed case | `DebugHelper` | `debug-helper` |
| Underscores | `task_runner` | `task-runner` |
| Overly specific | `angular-19-nx-component` | `frontend-design` |
| No variant reference | Missing cross-link | Add blockquote |
| Shared module < 3 consumers | Extracting for 2 skills | Keep inline until 3+ |
| Over-extraction to references/ | Moving core logic to references | Keep essential patterns in SKILL.md |

## Versioning

### Version Format

Skills use semantic versioning: `MAJOR.MINOR.PATCH`

| Component | When to Increment |
|-----------|-------------------|
| MAJOR | Breaking changes (renamed, merged, deleted) |
| MINOR | New features, significant enhancements |
| PATCH | Bug fixes, minor documentation updates |

### Initial Versions

| Skill State | Starting Version |
|-------------|------------------|
| New skill | `1.0.0` |
| Existing, stable | `2.0.0` |
| Recently enhanced | `3.0.0` |
| Merged/consolidated | `X.0.0` (major bump) |

### Frontmatter

```yaml
---
name: skill-name
version: 2.0.0
description: ...
---
```

## Naming Checklist

- [ ] Uses lowercase-hyphen-case
- [ ] Under 64 characters
- [ ] Directory name matches `name` field
- [ ] Appropriate prefix (or none)
- [ ] Variant cross-references added
- [ ] Description includes trigger keywords
- [ ] Has `version` field in frontmatter
- [ ] Shared module references use correct path format (if applicable)
- [ ] Large skills use `references/` for progressive disclosure (if >200 lines)

## Related Documentation

- [Skills Overview](skills/README.md) - Full skills catalog
- [Development Skills](skills/development-skills.md) - Backend, frontend, database skills
