# Claude Code Documentation

> Comprehensive AI-assisted development documentation for YourProject

## Quick Links

| Goal                           | Document                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **New to Claude Code?**        | [quick-start.md](./quick-start.md) - 5-minute onboarding                                                                           |
| **Need a skill?**              | [skills/README.md](./skills/README.md) - <!-- COUNT:skills -->104<!-- /COUNT --> skills catalog                                                                        |
| **Building a feature?**        | [skills/README.md](./skills/README.md) + project-reference root patterns                                                           |
| **Verifying user experience?** | [configuration/experience-verification.md](./configuration/experience-verification.md) - portable evidence and acceptance contract |
| **Reviewing the framework?**   | [framework-review-guide.md](./framework-review-guide.md) - how to measure, intended designs, known limits; read before any audit against vendor guidance |
| **Understanding hooks?**       | [hooks/README.md](./hooks/README.md) - <!-- COUNT:hooks -->36<!-- /COUNT --> top-level hook files deep-dive                                                           |
| **Understanding workflows?**   | `.claude/workflows.json` canonical catalog plus opt-in prompt injection - <!-- COUNT:workflows -->17<!-- /COUNT --> workflows                                             |
| **Switch machinery off/on?** | [Runtime modes](./configuration/README.md#framework-runtime-mode) — global and checkout settings |
| **Configuring Claude?**        | [configuration/README.md](./configuration/README.md)                                                                               |
| **Tracking team work?** | [configuration/README.md#team-work-tracking](./configuration/README.md#team-work-tracking) - optional shared tracker and local app |
| **Team collaboration?**        | [team-collaboration-guide.md](./team-collaboration-guide.md) - PO, BA, QA, QC, UX workflows                                        |
| **Graph intelligence?**        | [code-graph-mechanism.md](./code-graph-mechanism.md) - How structural code analysis works                                          |
| **Setup graph?**               | [code-graph-setup.md](./code-graph-setup.md) - Install Python deps + build graph                                                   |

For task-selected project configuration, run `node .claude/scripts/project-context.cjs --context`; add `--section <key>` as needed. Read [configuration/README.md](./configuration/README.md#just-in-time-path-rules) when enabling complete paged path lookup or changing context delivery.

## Documentation Map

Project-owned branches below sit at their DEFAULT roots; `docs/project-config.json` (`specRoots` / `docsRoots`) relocates them.

```
.claude/docs/
|-- README.md                 <- You are here (Navigation hub)
|-- quick-start.md            5-minute onboarding guide
|
|-- skills/                   Skill catalog and usage guides
|   |-- README.md             Skills overview + full catalog
|   +-- (patterns)           → docs/project-reference/
|
|-- hooks/                    36 top-level hook files, 66 lib modules
|   |-- README.md             Hooks overview, lessons system, session lifecycle
|   +-- extending-hooks.md    How to create custom hooks
|
|-- code-graph-mechanism.md  How the structural knowledge graph works
|-- code-graph-setup.md      Setup guide for Python + Tree-sitter
|-- development-rules.md     Dev rules extracted from CLAUDE.md (static reference)
|-- framework-review-guide.md  Read before auditing the framework against vendor guidance
|-- anti-hallucination-patterns.md  AI failure mode catalog + remediation patterns
|
|-- agents/                   Subagent configurations
|   |-- README.md             Agents overview
|   +-- agent-patterns.md     When/how to use each agent
|
|-- configuration/            All configuration files
|   |-- README.md             Config overview
|   |-- settings-reference.md settings.json reference
|   |-- output-styles.md      Custom output styles
|   +-- experience-verification.md  Observable-surface evidence and acceptance
|
+-- troubleshooting.md        Consolidated troubleshooting guide
```

## Quick Decision Trees

### "I need to..."

| Task                       | Command                              | Skill                         |
| -------------------------- | ------------------------------------ | ----------------------------- |
| Implement a feature        | `/feature-implement`                 | `feature-implement`           |
| Fix a bug                  | `/fix`                               | `investigate --mode=debug`    |
| Create a PR, ready to merge | `/pull-request`                     | `pull-request`                |
| Commit and push            | `/commit --push`                     | `commit`                      |
| Understand code            | `/investigate`                       | `investigate`                 |
| Plan implementation        | `/plan`                              | `plan`                        |
| Run tests                  | `/test`                              | `test`                        |
| Review code                | `/review`                            | `code-quality-review`                 |
| Debug issues               | `/investigate --mode=debug`          | `investigate --mode=debug`    |
| Create user story          | `/work-item --mode=story`                             | `work-item --mode=story`            |
| Prioritize planned work         | `/prioritize`                        | `prioritize`                  |
| Quality gate (pre-dev)     | `/work-item --mode=dor`                          | `work-item --mode=dor`                    |
| Quality gate (pre-qa)      | `/work-item --mode=review --type=spec-tests` | `work-item --mode=review`             |
| Quality gate (pre-release) | `/production-readiness-review`       | `production-readiness-review` |
| Create test cases          | `/spec [mode=tests]`                 | `spec [mode=tests]`           |
| Create design spec         | `/design-spec`                       | `design-spec`                 |
| Analyze blast radius       | `/graph-code --mode=blast-radius`    | `graph-code --mode=blast-radius` |
| Build code graph           | `/graph-code --mode=build`           | `graph-code --mode=build`     |
| Review integration tests   | `/integration-test --mode=review`           | `integration-test --mode=review`     |
| Verify test traceability   | `/integration-test --mode=verify`           | `integration-test --mode=verify`     |
| Review an AI feature       | `/ai-engineering-review`             | `ai-engineering-review`       |
| Enhance AI prompts         | `/prompt-enhance`                    | `prompt-enhance`              |
| Create task visual mockup   | `/work-item --mode=mockup`                        | `work-item --mode=mockup`                  |

### "I want to learn about..."

| Topic                                       | Start Here                                                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| How skills work                             | [skills/README.md](./skills/README.md)                                                                          |
| How skills are activated                    | [skills/README.md](./skills/README.md)                                                                          |
| How lessons system works                    | [hooks/README.md](./hooks/README.md) — `/learn` skill + lessons read contract in the hook-delivered universal bundle |
| How hooks intercept events                  | [hooks/README.md](./hooks/README.md) — hook catalog + lifecycle                                                 |
| Hook execution order by event               | [hooks/README.md](./hooks/README.md) — hook catalog + execution order                                           |
| Session lifecycle (init → compact → resume) | [hooks/README.md#session-lifecycle](./hooks/README.md#session-lifecycle)                                        |
| Workflow detection and routing              | Default-on `workflow-route-inject.cjs` (gate) and `workflow-catalog-inject.cjs` (catalog), the only carriers of the route; per-person mode `ask` / `auto` / `off` (project default, `~/.claude/.ck.json`, `.claude/.ck.local.json`, env `CK_WORKFLOW_ROUTE_MODE`); definitions in `.claude/workflows.json` |
| How to create custom hooks                  | [hooks/extending-hooks.md](./hooks/extending-hooks.md)                                                          |
| How to configure output                     | [configuration/output-styles.md](./configuration/output-styles.md)                                              |
| Manual tracker maintenance and shell discovery | [manual-operations.md](../skills/task-track/references/manual-operations.md) — exact requests, placing a record in context, catalogue, authority and recovery |
| Exact concerns and saved producer checkpoints | [integration-guide.md](../skills/task-track/references/integration-guide.md) — original declarers, current verification and pre-publication self-check |
| How team collaboration works                | [team-collaboration-guide.md](./team-collaboration-guide.md)                                                    |
| How to update code review rules             | [hooks/README.md#code-review-rules](./hooks/README.md#code-review-rules)                                        |

## Document Sizes (for context planning)

| Document                            | Lines | Tokens (est.) | Load Time |
| ----------------------------------- | ----- | ------------- | --------- |
| quick-start.md                      | ~180  | ~500          | Fast      |
| skills/README.md                    | ~350  | ~900          | Fast      |
| _(see the project-reference root)_  |       |               |           |
| hooks/README.md                     | ~310  | ~800          | Fast      |
| configuration/settings-reference.md | ~390  | ~1000         | Moderate  |
| troubleshooting.md                  | ~415  | ~1100         | Moderate  |

**Tip:** Load smaller docs first. Reference larger docs only when needed.

## Core Pattern References

Unprefixed filenames resolve inside the project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path.

| Document                                                     | When to Use                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| `project-structure-reference.md`                             | Understanding project structure                             |
| `backend-patterns-reference.md`                              | Backend development tasks (project-specific companion doc)  |
| `frontend-patterns-reference.md`                             | Frontend development tasks (project-specific companion doc) |
| `integration-test-reference.md`                              | Test fixtures, patterns, module abbreviations               |
| `feature-spec-reference.md`                                  | Feature doc templates, app/service mapping                  |
| `domain-entities-reference.md`                               | Domain entity catalog, relationships, cross-service sync    |
| [skill-naming-conventions.md](./skill-naming-conventions.md) | Skill naming rules and prefix guide                         |
| `.claude/skills/shared/protocols/measured-capacity-engineering.md` | Read when designing, testing or reviewing capacity, hot paths, cache placement or scaling — shared decision contract |
| `.claude/skills/performance-review/references/performance-knowledge.md` §6.1, §10.1 | Read when proving safe cache placement or designing a workload-defined capacity experiment |
| [configuration/README.md](./configuration/README.md)         | Settings schema, permissions, hooks config                  |
| [ux-journey-process.md](./ux-journey-process.md)             | Read FIRST when generating, planning or reviewing any user-facing surface — journey-first `UX-1`–`UX-11` (Journey Report, design-authority read), before [design-knowledge.md](./design-knowledge.md) (`DD-*`) and [design-review-checklist.md](./design-review-checklist.md) (`CL-*`) |

## Complete Guides (Large Reference Docs)

| Document                                                | Size  | Use Case           |
| ------------------------------------------------------- | ----- | ------------------ |
| `configured styling reference` (project-reference root) | ~30KB | BEM, design tokens |

## Related Documentation

| Location                                  | Content                               |
| ----------------------------------------- | ------------------------------------- |
| `CLAUDE.md` (project root)                | Root instructions (always read first) |
| `design-system/` (project-reference root) | Frontend design system                |
| The business spec root                    | Tech-free 8-section Feature Specs     |

## How to Use This Documentation

1. **Start with `CLAUDE.md`** (project root) - Essential rules and quick decisions
2. **New to Claude Code?** - Follow [quick-start.md](./quick-start.md)
3. **Find the right skill** - Browse [skills/README.md](./skills/README.md)
4. **Activate skills** - Check [skills/README.md](./skills/README.md) for triggers
5. **Understand internals** - Dive into [hooks/](./hooks/) for deep knowledge
6. **Troubleshoot issues** - See [troubleshooting.md](./troubleshooting.md)

## Statistics

| Category               | Count |
| ---------------------- | ----- |
| Skills                 | <!-- COUNT:skills -->104<!-- /COUNT --> |
| Hook files (top-level) | <!-- COUNT:hooks -->36<!-- /COUNT --> |
| Lib Modules            | <!-- COUNT:lib-modules -->66<!-- /COUNT --> |
| Hook Events            | 10     |
| Agents                 | <!-- COUNT:agents -->25<!-- /COUNT --> |
| Workflows              | <!-- COUNT:workflows -->17<!-- /COUNT --> |
| Hook Tests             | 133   |
| Hook Test Files        | 124 suites + 9 top-level test files |
| Framework Markdown Files | 43 (`.claude/docs/**/*.md`) |

---

_Last updated: 2026-06-11 | Source: `.claude/` directory analysis_

## Closing reminders
