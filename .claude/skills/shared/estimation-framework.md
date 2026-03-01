# Estimation Framework — Story Points & Complexity

> **Single source of truth** for all estimation across skills. Referenced by: story, refine, business-analyst, planning, plan, plan-hard, plan-fast, prioritize, product-owner, project-manager, quality-gate.

## Story Point Scale (Modified Fibonacci 1-21)

| SP  | Label      | Complexity | Typical Scope                                   | Time Guide |
| --- | ---------- | ---------- | ----------------------------------------------- | ---------- |
| 1   | Trivial    | Low        | Config change, typo fix, single-line edit       | < 2 hours  |
| 2   | Small      | Low        | Single file, clear scope, no unknowns           | Half day   |
| 3   | Medium     | Medium     | 2-3 files, minor unknowns, single component     | 1 day      |
| 5   | Large      | Medium     | Multiple components, some complexity            | 2-3 days   |
| 8   | Very Large | High       | Cross-cutting, significant unknowns             | 3-5 days   |
| 13  | Epic-Story | Very High  | Multi-service, many unknowns — **SHOULD split** | 1 week     |
| 21  | Epic-PBI   | Very High  | Major feature — **MUST split** before sprint    | 1-2 weeks  |

### Splitting Rules

- **SP > 8**: SHOULD be split using SPIDR (Spike/Paths/Interfaces/Data/Rules)
- **SP = 13**: SHOULD split into 2-3 smaller stories before implementation
- **SP = 21**: MUST split — too large for a single sprint item
- **Uncertainty?**: Create a Spike (SP 2-3) to investigate, then re-estimate

## Complexity Classification (Auto-Derived from SP)

| SP Range | Complexity | Risk Level                          |
| -------- | ---------- | ----------------------------------- |
| 1-2      | Low        | Low — single file/component         |
| 3-5      | Medium     | Medium — multi-file, single service |
| 8        | High       | High — cross-component or unknowns  |
| 13-21    | Very High  | Very High — must decompose          |

## T-Shirt to Story Point Mapping

For backward compatibility with T-shirt sizing (used in early refinement).

| T-Shirt | Story Points | Days            |
| ------- | ------------ | --------------- |
| XS      | 1            | 0.5-1           |
| S       | 2            | 1-2             |
| M       | 3-5          | 2-3             |
| L       | 8            | 3-5             |
| XL      | 13-21        | 5+ (must split) |

## Estimation Output Fields

Skills producing estimations MUST include these fields in artifact frontmatter:

```yaml
story_points: 5 # Modified Fibonacci: 1 | 2 | 3 | 5 | 8 | 13 | 21
complexity: Medium # Auto-derived: Low (1-2) | Medium (3-5) | High (8) | Very High (13-21)
```

For plan templates, include both SP and hours:

```yaml
effort: 4h # Hours for scheduling
story_points: 5 # Story points for complexity measurement
```

Phase tables should include:

```markdown
| # | Phase | Status | Effort | SP | Link |
```

## Purpose of Story Points

Story points measure **relative complexity and scope** of work items. They enable:

- Consistent sizing across teams and sprints
- Complexity-based work tracking (human-managed outside AI)
- Splitting decisions (when to decompose items)
- Sprint capacity planning (by humans using historical data)

> **Note:** Velocity tracking (points per sprint, team throughput) is managed by humans outside the AI workflow. AI assigns story points; humans track velocity.
