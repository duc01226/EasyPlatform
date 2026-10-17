# Skill Naming Conventions

Reference guide for naming Claude Code skills consistently in YourProject.

## Core Rules

1. **Format:** lowercase-hyphen-case only
2. **Max Length:** 64 characters
3. **Characters:** `a-z`, `0-9`, `-` (no underscores, spaces)
4. **Match:** `name` field MUST ATTENTION match directory name exactly
5. **No built-in names:** never name a skill like a Claude Code built-in command or bundled skill (`code-review`, `security-review`, `design`, …). A project skill replaces the built-in's `/name`, so the built-in disappears. `.claude/scripts/codex/tests/skill-builtin-names.test.mjs` holds the list and fails on a collision; `plan` is the one owner-accepted exception.

## Canonical Order Rule (subject-first)

**Rule:** when a skill belongs to a subject family, name it `<subject>-<verb>` (subject-first), NOT `<verb>-<subject>`. Example: `changes-review`, not `review-changes`.

**Rationale:** subject-first is the codebase majority — the `*-review` pattern (`performance-review`, `code-quality-review`, `knowledge-review`, `production-readiness-review`, `changes-review`, `ai-engineering-review`) outnumbers the `review-*` outliers, and it keeps subject families grouped alphabetically (`architecture` with modes `design`, `review`, `scalability`, `full`; `spec`; `plan`; `integration-test`, `integration-test --mode=review`, `integration-test --mode=verify`; `graph-*`). Grouping by subject lowers discovery cost and future change cost.

**Trade-off accepted:** subject-first sacrifices _action-family_ adjacency (all `review-*` no longer sort together) in exchange for _subject-family_ adjacency (`spec`, `plan`, `integration-test`, `graph-*` each stay grouped). Chosen because slash-command discovery keys on the subject a user is thinking about (`architecture`, `spec`, `plan`) more naturally than on the shared action, and the `*-review` majority already dominates — so the minority pays the smaller migration cost.

**Pure-action carve-out (verb-first allowed):** a skill that is a single action with NO subject family stays verb-first: `fix`, `investigate`, `seed-test-data`, `scaffold`, `brainstorm`, `prioritize`, `plan`, `test`, `initiative`.

**Modifier+noun and noun-compound names are NOT verb-first** and are unaffected: `web-research` (modifier qualifies the noun `research`), `source-deep-dive` (noun compound: a deep dive into sources), `knowledge-synthesis`/`knowledge-review` (already subject-first: `knowledge` + action), `design-spec` (the noun compound "design specification", a produced artifact), `web-design-guidelines` (noun compound).
<!-- KEEP AS WRITTEN: `security-audit` is NOT a `*-review` name (it is `security` + action) and `source-deep-dive` has no `research` token (it is a noun compound). An earlier draft listed both under the wrong pattern; a framework re-sync re-applied it twice. Do not merge the examples back together. -->

### Audit — every architecture + workflow step-skill classified

| Skill                                                                                                                                                                          | Pattern                            | Subject family?         | Verdict                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ----------------------- | ---------------------------------------------------------------------- |
| `review-architecture`                                                                                                                                                          | verb-first                         | `architecture` exists | **rename → `architecture --mode=review`**                                     |
| `review-architecture-full`                                                                                                                                                     | verb-first                         | `architecture` exists | **rename → `architecture --mode=full`**                                |
| `review-changes`                                                                                                                                                               | verb-first                         | `*-review` majority     | **rename → `changes-review`**                                          |
| `review-domain-entities`                                                                                                                                                       | verb-first                         | `*-review` majority     | **rename → `domain-analysis --mode=review`**                                  |
| `review-artifact`                                                                                                                                                              | verb-first                         | `*-review` majority     | **rename → `work-item --mode=review`**                                         |
| `review-ui`                                                                                                                                                                    | verb-first                         | `ui-design` exists     | **rename → `ui-design --mode=review`**                                               |
| `architecture` (modes `design`, `review`, `scalability`, `full`) | subject-first | `architecture` | keep |
| `security-audit`, `performance-review`, `production-readiness-review`, `code-quality-review`, `knowledge-review`, `ai-engineering-review`                                                                      | subject-first                      | `*-review` (`security-audit`: `security` + action) | keep                                                                   |
| `integration-test` (modes `review`, `verify`), `e2e-test` (mode `verify`)                                                                                                                      | subject-first                      | `integration-test`      | keep                                                                   |
| `plan`                                                                                                                                                               | subject-first / carve-out (`plan`) | `plan-*`                | keep                                                                   |
| `spec` (modes `discovery`, `clarify`, `index`)                                                                                                                                 | subject-first                      | `spec`                  | keep                                                                   |
| `design-spec`                                                                                                                                                                  | noun compound                      | artifact name           | keep — "design spec" is a produced artifact, neither token is the verb |
| `web-research`, `source-deep-dive`                                                                                                                                                | modifier+noun / noun compound | `research`, `deep-dive` | keep — neither token is a leading verb |
| `knowledge-synthesis`, `knowledge-review`                                                                                                                                      | subject-first                      | `knowledge-*`           | keep — subject + action already                                        |
| `investigate`, `fix`, `seed-test-data`, `scaffold`, `brainstorm`, `prioritize`, `initiative`, `test`                                                               | verb-first                         | none (pure action)      | keep (carve-out)                                                       |
| `domain-analysis`, `tech-stack-research`, `docs-manager` (modes `init`, `update`), `watzup`, `work-item` (modes `refine`, `story`, `mockup`, `challenge`, `review`, `dor`), `linter-setup`, `harness-setup`, `feature-presentation` | subject-first / noun / carve-out   | various                 | keep                                                                   |

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
| `security-audit` | Security & threat analysis |
| `performance-review` | Performance & scalability |

> Note: `arch-security-review` was consolidated into the single `security-audit` skill, and `arch-performance-optimization` into the single `performance-review` skill (no `arch-` prefix — each covers all scopes; `performance-review` additionally carries an architecture-altitude section for design reviews, not only architecture).

**When to Use:**

- Skill affects multiple services/modules
- Decisions impact system architecture
- Analysis requires system-wide view

### Frontend Patterns (via docs)

**Approach:** Frontend patterns are handled via `frontend-patterns-reference.md` in the project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path — read statically per the hook-delivered project-reference-docs gate (`SYNC:project-reference-docs-guide`) when editing frontend files. No tech-stack-specific skill needed — keeps the skill catalog generic.

**When to Use:**

- `ui-design` — for UI implementation (`--lane=marketing` creative, `--lane=product` app UIs)
- `web-design-guidelines` — for UI compliance review
- Pattern reference docs — auto-injected when editing `.ts` files
- Implements YourProject frontend patterns
- Creates Angular-specific code

### No Prefix (General)

**Purpose:** General skills that work interactively or apply broadly.

**Project Examples:**

- `investigate` - Code-flow tracing and systematic bug root-cause debugging via `--mode=debug` (any language)
- `code-quality-review` - Interactive code review

**When to Use:**

- Skill is language/framework agnostic
- Interactive mode is primary use case
- Skill applies to many contexts

## Shared Protocol Pattern (SYNC bodies and guides)

### `shared/` Directory

**Purpose:** Contains the canonical source for all shared protocol content and its generated projection.

**Location:** `.claude/skills/shared/sync-inline-versions.md` (single canonical file)

**Architecture:** One canonical file owns every protocol; every other copy is a generated projection (`SYNC:shared-protocol-duplication-policy`). All skill entrypoints, including the four review-family skills, carry guide lines. Hooks deliver full text from `.claude/skills/shared/protocols/`; read absent applicable full text before acting, including when delivery overflows. The live registry `inlineSkills` list is empty. Agents and mode-reference SYNC bodies retain full text, role reminders remain, and each fresh reviewer prompt receives all 11 complete review-protocol bodies VERBATIM. Universal protocols remain hook-only. The projection is generated; guide lines are written only by `sync-update-blocks.py --mode=guide`.

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
| Redundant suffix               | `debugging-skill`               | `debug-trace`                       |
| Mixed case                     | `DebugHelper`                   | `debug-helper`                      |
| Underscores                    | `task_runner`                   | `task-runner`                       |
| Overly specific                | `angular-19-nx-component`       | `ui-design`                            |
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
- [ ] Not a Claude Code built-in name (`skill-builtin-names.test.mjs` passes)
- [ ] Appropriate prefix (or none)
- [ ] Variant cross-references added
- [ ] Description includes trigger keywords
- [ ] Has `version` field in frontmatter
- [ ] Shared module references use correct path format (if applicable)
- [ ] Large skills use `references/` for progressive disclosure (if >200 lines)

## Related Documentation

- [Skills Overview](skills/README.md) - Full skills catalog
