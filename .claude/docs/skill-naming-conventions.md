# Skill Naming Conventions

Reference guide for naming Claude Code skills consistently in YourProject.

## Core Rules

1. **Format:** lowercase-hyphen-case only
2. **Max Length:** 64 characters
3. **Characters:** `a-z`, `0-9`, `-` (no underscores, spaces)
4. **Match:** `name` field MUST ATTENTION match directory name exactly

## Canonical Order Rule (subject-first)

**Rule:** when a skill belongs to a subject family, name it `<subject>-<verb>` (subject-first), NOT `<verb>-<subject>`. Example: `architecture-review`, not `review-architecture`.

**Rationale:** subject-first is the codebase majority — the `*-review` pattern (`security-review`, `performance-review`, `code-review`, `integration-test-review`, `knowledge-review`, `architecture-scalability-review`, `production-readiness-review`, `quality-gate-review`, `plan-review`) outnumbers the `review-*` outliers, and it keeps subject families grouped alphabetically (`architecture-design`, `architecture-review`, `architecture-review-full`, `architecture-scalability-review`; `spec`, `spec-clarify`, `spec-discovery`, `spec-index`; `plan`, `plan-execute`, `plan-review`, `plan-validate`; `integration-test`, `integration-test-review`, `integration-test-verify`; `graph-*`). Grouping by subject lowers discovery cost and future change cost.

**Trade-off accepted:** subject-first sacrifices _action-family_ adjacency (all `review-*` no longer sort together) in exchange for _subject-family_ adjacency (`architecture-*`, `spec-*`, `plan-*`, `integration-test-*` each stay grouped). Chosen because slash-command discovery keys on the subject a user is thinking about (`architecture`, `spec`, `plan`) more naturally than on the shared action, and the `*-review` majority already dominates — so the minority pays the smaller migration cost.

**Pure-action carve-out (verb-first allowed):** a skill that is a single action with NO subject family stays verb-first: `fix`, `scout`, `refine`, `investigate`, `prove-fix`, `debug-investigate`, `seed-test-data`, `scaffold`, `brainstorm`, `prioritize`, `plan`, `test`, `story`, `idea`.

**Modifier+noun and noun-compound names are NOT verb-first** and are unaffected: `web-research`/`deep-research` (modifier qualifies the noun `research`), `knowledge-synthesis`/`knowledge-review` (already subject-first: `knowledge` + action), `design-spec` (the noun compound "design specification", a produced artifact), `web-design-guidelines` (noun compound).

### Audit — every architecture + workflow step-skill classified

| Skill                                                                                                                                                                                       | Pattern                            | Subject family?         | Verdict                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------- | ---------------------------------------------------------------------- |
| `review-architecture`                                                                                                                                                                       | verb-first                         | `architecture-*` exists | **rename → `architecture-review`**                                     |
| `review-architecture-full`                                                                                                                                                                  | verb-first                         | `architecture-*` exists | **rename → `architecture-review-full`**                                |
| `review-changes`                                                                                                                                                                            | verb-first                         | `*-review` majority     | **rename → `changes-review`**                                          |
| `review-domain-entities`                                                                                                                                                                    | verb-first                         | `*-review` majority     | **rename → `domain-entities-review`**                                  |
| `review-artifact`                                                                                                                                                                           | verb-first                         | `*-review` majority     | **rename → `artifact-review`**                                         |
| `review-ui`                                                                                                                                                                                 | verb-first                         | `*-review` majority     | **rename → `ui-review`**                                               |
| `architecture-design`                                                                                                                                                                       | subject-first                      | `architecture-*`        | keep                                                                   |
| `architecture-scalability-review`                                                                                                                                                           | subject-first                      | `architecture-*`        | keep                                                                   |
| `security-review`, `performance-review`, `production-readiness-review`, `code-review`, `quality-gate-review`, `knowledge-review`                                                            | subject-first                      | `*-review`              | keep                                                                   |
| `integration-test`, `integration-test-review`, `integration-test-verify`                                                                                                                    | subject-first                      | `integration-test-*`    | keep                                                                   |
| `plan`, `plan-execute`, `plan-review`, `plan-validate`                                                                                                                                      | subject-first / carve-out (`plan`) | `plan-*`                | keep                                                                   |
| `spec`, `spec-clarify`, `spec-discovery`, `spec-index`                                                                                                                                      | subject-first                      | `spec-*`                | keep                                                                   |
| `design-spec`                                                                                                                                                                               | noun compound                      | artifact name           | keep — "design spec" is a produced artifact, neither token is the verb |
| `web-research`, `deep-research`                                                                                                                                                             | modifier+noun                      | `research`              | keep — modifier qualifies the noun, not verb-first                     |
| `knowledge-synthesis`, `knowledge-review`                                                                                                                                                   | subject-first                      | `knowledge-*`           | keep — subject + action already                                        |
| `scout`, `investigate`, `debug-investigate`, `refine`, `fix`, `prove-fix`, `seed-test-data`, `scaffold`, `brainstorm`, `prioritize`, `story`, `idea`, `test`                                | verb-first                         | none (pure action)      | keep (carve-out)                                                       |
| `domain-analysis`, `tech-stack-research`, `changelog`, `docs-update`, `watzup`, `story`, `pbi-*`, `dor-gate`, `linter-setup`, `harness-setup`, `feature-presentation`, `excalidraw-diagram` | subject-first / noun / carve-out   | various                 | keep                                                                   |

**Result:** exactly 6 breakers — the `review-*` skills. No 7th breaker surfaced.

## Prefix Conventions

### `arch-` Prefix (Architecture)

**Purpose:** Architecture-level analysis and design skills.

**Characteristics:**

- System-wide impact
- Cross-cutting concerns
- Design patterns and decisions

**Project Examples:**
| Skill | Purpose |
| -------------------------------- | ------------------------------- |
| `security-review` | Security & threat analysis |
| `performance-review` | Performance & scalability |

> Note: `arch-security-review` was consolidated into the single `security-review` skill, and `arch-performance-optimization` into the single `performance-review` skill (no `arch-` prefix — each covers all scopes; `performance-review` additionally carries an architecture-altitude section for design reviews, not only architecture).

**When to Use:**

- Skill affects multiple services/modules
- Decisions impact system architecture
- Analysis requires system-wide view

### Frontend Patterns (via docs)

**Approach:** Frontend patterns are handled via `docs/project-reference/frontend-patterns-reference.md`, read statically per the project-reference-docs gate in `CLAUDE.md` when editing frontend files. No tech-stack-specific skill needed — keeps the skill catalog generic.

**When to Use:**

- `design` — for UI implementation (`--lane=marketing` creative, `--lane=product` app UIs)
- `web-design-guidelines` — for UI compliance review
- Pattern reference docs — auto-injected when editing `.ts` files
- Implements YourProject frontend patterns
- Creates Angular-specific code

### No Prefix (General)

**Purpose:** General skills that work interactively or apply broadly.

**Project Examples:**

- `debug-investigate` - Systematic debugging (any language)
- `documentation` - Doc enhancement
- `code-review` - Interactive code review

**When to Use:**

- Skill is language/framework agnostic
- Interactive mode is primary use case
- Skill applies to many contexts

## Shared Protocol Pattern (SYNC Inline)

### `shared/` Directory

**Purpose:** Contains the canonical source for all SYNC-inlined protocol content.

**Location:** `.claude/skills/shared/sync-inline-versions.md` (single canonical file)

**Architecture:** Standalone protocol files have been deleted. All protocol content is now inlined directly into consuming skills via `<!-- SYNC:tag -->` blocks. This approach improves AI compliance by ~40% compared to file-read indirection.

**To update protocols:**

1. Edit `.claude/skills/shared/sync-inline-versions.md` (canonical source)
2. Run `grep SYNC:protocol-name` to find all consuming skills
3. Update all copies (or use `/sync-skills-shared-protocols` skill to automate)

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
.claude/skills/media processing tooling/
|-- SKILL.md                 # Core patterns (~100 lines)
+-- references/
    |-- ffmpeg-filters.md    # FFmpeg filter deep-dive
    +-- imagemagick-batch.md # ImageMagick batch operations
```

## Anti-Patterns

| Issue                          | Example                         | Fix                                 |
| ------------------------------ | ------------------------------- | ----------------------------------- |
| Redundant suffix               | `debugging-skill`               | `debug-investigate`                 |
| Mixed case                     | `DebugHelper`                   | `debug-helper`                      |
| Underscores                    | `task_runner`                   | `task-runner`                       |
| Overly specific                | `angular-19-nx-component`       | `design`                            |
| No variant reference           | Missing cross-link              | Add blockquote                      |
| Shared module < 3 consumers    | Extracting for 2 skills         | Keep inline until 3+                |
| Over-extraction to references/ | Moving core logic to references | Keep essential patterns in SKILL.md |

## Versioning

### Version Format

Skills use semantic versioning: `MAJOR.MINOR.PATCH`

| Component | When to Increment                           |
| --------- | ------------------------------------------- |
| MAJOR     | Breaking changes (renamed, merged, deleted) |
| MINOR     | New features, significant enhancements      |
| PATCH     | Bug fixes, minor documentation updates      |

### Initial Versions

| Skill State         | Starting Version     |
| ------------------- | -------------------- |
| New skill           | `1.0.0`              |
| Existing, stable    | `2.0.0`              |
| Recently enhanced   | `3.0.0`              |
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
