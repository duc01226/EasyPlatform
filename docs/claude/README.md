# Claude Code Documentation

> Comprehensive AI-assisted development documentation for BravoSUITE

## Quick Links

| Goal                         | Document                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **New to Claude Code?**      | [quick-start.md](./quick-start.md) - 5-minute onboarding                                                    |
| **Need a skill?**            | [skills/README.md](./skills/README.md) - 152 skills catalog                                                 |
| **Building a feature?**      | [skills/development-skills.md](./skills/development-skills.md)                                              |
| **Understanding hooks?**     | [hooks/README.md](./hooks/README.md) - 35 hooks deep-dive                                                   |
| **Understanding workflows?** | [CLAUDE.md workflow catalog](../../CLAUDE.md#workflow-keyword-lookup--execution-protocol) - 29 workflows    |
| **Configuring Claude?**      | [configuration/README.md](./configuration/README.md)                                                        |
| **Team collaboration?**      | [team-collaboration-guide.md](./team-collaboration-guide.md) - PO, BA, QA, QC, UX, PM workflows             |
| **Full SDLC Guide?**         | [ai-driven-sdlc-team-collaboration.md](./ai-driven-sdlc-team-collaboration.md) - Complete stakeholder guide |

## Documentation Map

```
docs/claude/
|-- README.md                 <- You are here (Navigation hub)
|-- quick-start.md            5-minute onboarding guide
|
|-- skills/                   152 skills across 15+ domains
|   |-- README.md             Skills overview + full catalog
|   |-- development-skills.md Backend, frontend, databases
|   +-- integration-skills.md DevOps, AI tools, MCP
|
|-- hooks/                    35 hooks, 18 lib modules
|   |-- README.md             Hooks overview, lessons system, session lifecycle
|   |-- architecture.md       System architecture with diagrams
|   |-- pattern-learning.md   Pattern learning (YAML patterns + lessons)
|   |-- external-memory-swap.md  Post-compaction recovery via swap files
|   +-- extending-hooks.md    How to create custom hooks
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

| Task                | Command         | Skill                   |
| ------------------- | --------------- | ----------------------- |
| Implement a feature | `/cook`         | `feature`               |
| Fix a bug           | `/fix`          | `debug`                 |
| Create a PR         | `/git/pr`       | `commit`                |
| Understand code     | `/scout`        | `feature-investigation` |
| Plan implementation | `/plan`         | `planning`              |
| Run tests           | `/test`         | `test-spec`             |
| Review code         | `/review`       | `code-review`           |
| Debug issues        | `/debug`        | `debug`                 |
| Create user story   | `/story`        | `business-analyst`      |
| Prioritize backlog  | `/prioritize`   | `product-owner`         |
| Create test cases   | `/test-spec`    | `test-spec`             |
| Quality checkpoint  | `/quality-gate` | `qc-specialist`         |
| Create design spec  | `/design-spec`  | `ux-designer`           |

### "I want to learn about..."

| Topic                                       | Start Here                                                                                |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| How skills work                             | [skills/README.md](./skills/README.md)                                                    |
| How skills are activated                    | [skills/README.md](./skills/README.md)                                                    |
| How lessons system works                    | [hooks/README.md](./hooks/README.md) — `/learn` skill + lessons-injector hook             |
| How pattern learning works                  | [hooks/pattern-learning.md](./hooks/pattern-learning.md) — YAML patterns + lessons        |
| How hooks intercept events                  | [hooks/architecture.md](./hooks/architecture.md)                                          |
| Hook execution order by event               | [hooks-reference.md](./hooks-reference.md) — all 9 events                                 |
| Session lifecycle (init → compact → resume) | [hooks/README.md#session-lifecycle](./hooks/README.md#session-lifecycle)                  |
| External Memory Swap system                 | [hooks/external-memory-swap.md](./hooks/external-memory-swap.md)                          |
| Workflow detection and routing              | [CLAUDE.md workflow catalog](../../CLAUDE.md#workflow-keyword-lookup--execution-protocol) |
| How to create custom hooks                  | [hooks/extending-hooks.md](./hooks/extending-hooks.md)                                    |
| How to configure output                     | [configuration/output-styles.md](./configuration/output-styles.md)                        |
| How team collaboration works                | [team-collaboration-guide.md](./team-collaboration-guide.md)                              |
| How to update code review rules             | [hooks/README.md#code-review-rules](./hooks/README.md#code-review-rules)                  |

## Document Sizes (for context planning)

| Document                            | Lines | Tokens (est.) | Load Time |
| ----------------------------------- | ----- | ------------- | --------- |
| quick-start.md                      | ~180  | ~500          | Fast      |
| skills/README.md                    | ~350  | ~900          | Fast      |
| skills/development-skills.md        | ~500  | ~1300         | Moderate  |
| hooks/README.md                     | ~285  | ~750          | Fast      |
| hooks/architecture.md               | ~310  | ~800          | Fast      |
| hooks/pattern-learning.md           | ~55   | ~150          | Fast      |
| configuration/settings-reference.md | ~390  | ~1000         | Moderate  |
| troubleshooting.md                  | ~415  | ~1100         | Moderate  |

**Tip:** Load smaller docs first. Reference larger docs only when needed.

## Core Pattern References

| Document                                                            | When to Use                                                 |
| ------------------------------------------------------------------- | ----------------------------------------------------------- |
| [architecture.md](./architecture.md)                                | Understanding project structure                             |
| [backend-patterns-reference.md](./backend-patterns-reference.md)    | Backend development tasks (project-specific companion doc)  |
| [frontend-patterns-reference.md](./frontend-patterns-reference.md)  | Frontend development tasks (project-specific companion doc) |
| [project-structure-reference.md](../project-structure-reference.md) | Service list, directory tree, ports, module codes           |
| [integration-test-reference.md](../integration-test-reference.md)   | Test fixtures, patterns, module abbreviations               |
| [feature-docs-reference.md](../feature-docs-reference.md)           | Feature doc templates, app/service mapping                  |
| [anti-patterns.md](./anti-patterns.md)                              | Code review, avoiding mistakes                              |
| [advanced-patterns.md](./advanced-patterns.md)                      | Complex implementations                                     |
| [skill-naming-conventions.md](./skill-naming-conventions.md)        | Skill naming rules and prefix guide                         |
| [model-selection-guide.md](./model-selection-guide.md)              | When to use Opus or Sonnet                                  |
| [hooks-reference.md](./hooks-reference.md)                          | Hook lifecycle, dependencies, state files                   |
| [configuration-guide.md](./configuration-guide.md)                  | Settings schema, permissions, hooks config                  |

## Complete Guides (Large Reference Docs)

| Document                                                                         | Size  | Use Case                  |
| -------------------------------------------------------------------------------- | ----- | ------------------------- |
| [backend-csharp-complete-guide.md](./backend-csharp-complete-guide.md)           | ~76KB | Full C# reference         |
| [frontend-typescript-complete-guide.md](./frontend-typescript-complete-guide.md) | ~57KB | Complete Angular/TS guide |
| [scss-styling-guide.md](./scss-styling-guide.md)                                 | ~30KB | BEM, design tokens        |

## Related Documentation

| Location                                                                     | Content                               |
| ---------------------------------------------------------------------------- | ------------------------------------- |
| [CLAUDE.md](../../CLAUDE.md)                                                 | Root instructions (always read first) |
| [EasyPlatform.README.md](../../EasyPlatform.README.md)                       | Framework deep dive                   |
| [.ai/docs/AI-DEBUGGING-PROTOCOL.md](../../.ai/docs/AI-DEBUGGING-PROTOCOL.md) | Debugging protocol                    |
| [docs/design-system/](../design-system/)                                     | Frontend design system                |
| [docs/business-features/](../business-features/)                             | Business feature docs                 |

## How to Use This Documentation

1. **Start with [CLAUDE.md](../../CLAUDE.md)** - Essential rules and quick decisions
2. **New to Claude Code?** - Follow [quick-start.md](./quick-start.md)
3. **Find the right skill** - Browse [skills/README.md](./skills/README.md)
4. **Activate skills** - Check [skills/README.md](./skills/README.md) for triggers
5. **Understand internals** - Dive into [hooks/](./hooks/) for deep knowledge
6. **Troubleshoot issues** - See [troubleshooting.md](./troubleshooting.md)

## Statistics

| Category            | Count |
| ------------------- | ----- |
| Skills              | 152   |
| Hooks               | 35    |
| Lib Modules         | 18    |
| Hook Events         | 9     |
| Agents              | 22    |
| Workflows           | 29    |
| Tests               | 257   |
| Documentation Files | 32    |

---

*Last updated: 2026-02-28 | Source: `.claude/` directory analysis*
