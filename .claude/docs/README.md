# Claude Code Documentation

> Comprehensive AI-assisted development documentation for YourProject

## Quick Links

| Goal                         | Document                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| **New to Claude Code?**      | [quick-start.md](./quick-start.md) - 5-minute onboarding                                        |
| **Need a skill?**            | [skills/README.md](./skills/README.md) - 258 skills catalog                                     |
| **Building a feature?**      | [skills/README.md](./skills/README.md) + `docs/project-reference/` patterns                     |
| **Understanding hooks?**     | [hooks/README.md](./hooks/README.md) - 37 hooks deep-dive                                       |
| **Understanding workflows?** | `CLAUDE.md` workflow catalog (project root) - 34 workflows                                      |
| **Configuring Claude?**      | [configuration/README.md](./configuration/README.md)                                            |
| **Team collaboration?**      | [team-collaboration-guide.md](./team-collaboration-guide.md) - PO, BA, QA, QC, UX, PM workflows |
| **Graph intelligence?**      | [code-graph-mechanism.md](./code-graph-mechanism.md) - How structural code analysis works       |
| **Setup graph?**             | [code-graph-setup.md](./code-graph-setup.md) - Install Python deps + build graph                |

## Documentation Map

```
.claude/docs/
|-- README.md                 <- You are here (Navigation hub)
|-- quick-start.md            5-minute onboarding guide
|
|-- skills/                   258 skills across 15+ domains
|   |-- README.md             Skills overview + full catalog
|   +-- (patterns)           → docs/project-reference/
|
|-- hooks/                    ~37 logical hooks (53 files), 27 lib modules
|   |-- README.md             Hooks overview, lessons system, session lifecycle
|   |-- architecture.md       System architecture with diagrams
|   |-- external-memory-swap.md  Post-compaction recovery via swap files
|   +-- extending-hooks.md    How to create custom hooks
|
|-- code-graph-mechanism.md  How the structural knowledge graph works
|-- code-graph-setup.md      Setup guide for Python + Tree-sitter
|-- development-rules.md     Dev rules extracted from CLAUDE.md (hook-injected)
|-- anti-hallucination-patterns.md  AI failure mode catalog + remediation patterns
|
|-- agents/                   Subagent configurations
|   |-- README.md             Agents overview
|   +-- agent-patterns.md     When/how to use each agent
|
|-- configuration/            All configuration files
|   |-- README.md             Config overview
|   |-- settings-reference.md settings.json reference
|   +-- output-styles.md      Coding levels 0-5
|
+-- troubleshooting.md        Consolidated troubleshooting guide
```

## Quick Decision Trees

### "I need to..."

| Task                     | Command                    | Skill                     |
| ------------------------ | -------------------------- | ------------------------- |
| Implement a feature      | `/cook`                    | `feature`                 |
| Fix a bug                | `/fix`                     | `debug-investigate`       |
| Create a PR              | `/git/pr`                  | `commit`                  |
| Understand code          | `/scout`                   | `feature-investigation`   |
| Plan implementation      | `/plan`                    | `planning`                |
| Run tests                | `/test`                    | `test-spec`               |
| Review code              | `/review`                  | `code-review`             |
| Debug issues             | `/debug-investigate`       | `debug-investigate`       |
| Create user story        | `/story`                   | `business-analyst`        |
| Prioritize backlog       | `/prioritize`              | `product-owner`           |
| Create test cases        | `/test-spec`               | `test-spec`               |
| Quality checkpoint       | `/quality-gate`            | `qc-specialist`           |
| Create design spec       | `/design-spec`             | `ux-designer`             |
| Analyze blast radius     | `/graph-blast-radius`      | `graph-blast-radius`      |
| Build code graph         | `/graph-build`             | `graph-build`             |
| Review integration tests | `/integration-test-review` | `integration-test-review` |
| Verify test traceability | `/integration-test-verify` | `integration-test-verify` |
| Enhance AI prompts       | `/prompt-enhance`          | `prompt-enhance`          |
| Create PBI visual mockup | `/pbi-mockup`              | `pbi-mockup`              |

### "I want to learn about..."

| Topic                                       | Start Here                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| How skills work                             | [skills/README.md](./skills/README.md)                                        |
| How skills are activated                    | [skills/README.md](./skills/README.md)                                        |
| How lessons system works                    | [hooks/README.md](./hooks/README.md) — `/learn` skill + lessons-injector hook |
| How hooks intercept events                  | [hooks/architecture.md](./hooks/architecture.md)                              |
| Hook execution order by event               | [hooks/README.md](./hooks/README.md) — hook catalog + execution order         |
| Session lifecycle (init → compact → resume) | [hooks/README.md#session-lifecycle](./hooks/README.md#session-lifecycle)      |
| External Memory Swap system                 | [hooks/external-memory-swap.md](./hooks/external-memory-swap.md)              |
| Workflow detection and routing              | `CLAUDE.md` workflow catalog (project root)                                   |
| How to create custom hooks                  | [hooks/extending-hooks.md](./hooks/extending-hooks.md)                        |
| How to configure output                     | [configuration/output-styles.md](./configuration/output-styles.md)            |
| How team collaboration works                | [team-collaboration-guide.md](./team-collaboration-guide.md)                  |
| How to update code review rules             | [hooks/README.md#code-review-rules](./hooks/README.md#code-review-rules)      |

## Document Sizes (for context planning)

| Document                            | Lines | Tokens (est.) | Load Time |
| ----------------------------------- | ----- | ------------- | --------- |
| quick-start.md                      | ~180  | ~500          | Fast      |
| skills/README.md                    | ~350  | ~900          | Fast      |
| _(see docs/project-reference/)_     |       |               |           |
| hooks/README.md                     | ~310  | ~800          | Fast      |
| hooks/architecture.md               | ~310  | ~800          | Fast      |
| configuration/settings-reference.md | ~390  | ~1000         | Moderate  |
| troubleshooting.md                  | ~415  | ~1100         | Moderate  |

**Tip:** Load smaller docs first. Reference larger docs only when needed.

## Core Pattern References

| Document                                                     | When to Use                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| `docs/project-reference/project-structure-reference.md`      | Understanding project structure                             |
| `docs/project-reference/backend-patterns-reference.md`       | Backend development tasks (project-specific companion doc)  |
| `docs/project-reference/frontend-patterns-reference.md`      | Frontend development tasks (project-specific companion doc) |
| `docs/project-reference/integration-test-reference.md`       | Test fixtures, patterns, module abbreviations               |
| `docs/project-reference/feature-docs-reference.md`           | Feature doc templates, app/service mapping                  |
| `docs/project-reference/domain-entities-reference.md`        | Domain entity catalog, relationships, cross-service sync    |
| [skill-naming-conventions.md](./skill-naming-conventions.md) | Skill naming rules and prefix guide                         |
| [configuration/README.md](./configuration/README.md)         | Settings schema, permissions, hooks config                  |

## Complete Guides (Large Reference Docs)

| Document                                       | Size  | Use Case                             |
| ---------------------------------------------- | ----- | ------------------------------------ |
| `docs/backend-complete-guide.md`               | ~76KB | Full backend reference (in `docs/`)  |
| `docs/frontend-complete-guide.md`              | ~57KB | Complete frontend guide (in `docs/`) |
| `docs/project-reference/scss-styling-guide.md` | ~30KB | BEM, design tokens (in `docs/`)      |

## Related Documentation

| Location                                | Content                               |
| --------------------------------------- | ------------------------------------- |
| `CLAUDE.md` (project root)              | Root instructions (always read first) |
| `docs/project-reference/design-system/` | Frontend design system                |
| `docs/business-features/`               | Business feature docs                 |

## How to Use This Documentation

1. **Start with `CLAUDE.md`** (project root) - Essential rules and quick decisions
2. **New to Claude Code?** - Follow [quick-start.md](./quick-start.md)
3. **Find the right skill** - Browse [skills/README.md](./skills/README.md)
4. **Activate skills** - Check [skills/README.md](./skills/README.md) for triggers
5. **Understand internals** - Dive into [hooks/](./hooks/) for deep knowledge
6. **Troubleshoot issues** - See [troubleshooting.md](./troubleshooting.md)

## Statistics

| Category                 | Count |
| ------------------------ | ----- |
| Skills                   | 258   |
| Hooks (logical)          | ~37   |
| Hook files (incl. parts) | 53    |
| Lib Modules              | 27    |
| Hook Events              | 9     |
| Agents                   | 28    |
| Workflows                | 48    |
| Tests                    | 300   |
| Documentation Files      | 30    |

---

_Last updated: 2026-04-13 | Source: `.claude/` directory analysis_
