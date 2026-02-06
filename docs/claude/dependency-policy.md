# Dependency Policy

> Evaluate every new dependency before adding it. Platform alternatives always win.

## Evaluation Criteria

| Criterion | Threshold | Rationale |
|---|---|---|
| **Last release** | < 12 months | Abandoned packages accumulate CVEs silently |
| **License** | MIT / Apache-2.0 / BSD | GPL/AGPL impose copyleft obligations on the host project |
| **Transitive deps** | < 10 | Each transitive dep is an unaudited attack surface |
| **Platform alternative** | Must check | Easy.Platform already covers CQRS, validation, repos, jobs, bus |

## Process

1. **Search existing code first** — `grep`/`glob` for the capability you need
2. **Check platform equivalents** — `src/Platform/` base classes often provide what you need
3. **Evaluate** — Apply the four criteria above; document any trade-offs
4. **Document decision** — Add a one-liner in PR description: `Dep: <package> — <reason>`

## Decision Flow

```text
Need a capability?
├── Already in codebase? → Reuse (STOP)
├── Platform base class? → Extend (STOP)
├── Passes all 4 criteria? → Add with justification
└── Fails any criterion? → Find alternative or implement
```

## Examples

- **HTTP client (backend):** Use `HttpClient` via DI — no Flurl/RestSharp needed
- **Validation:** Use `PlatformValidationResult` — no FluentValidation needed
- **Background jobs:** Use `PlatformApplicationBackgroundJobExecutor` — no Hangfire needed
- **State management (frontend):** Use `PlatformVmStore` — no NgRx/Akita needed

## What This Does NOT Catch

This policy checks maintenance signals, not whether developers understand what existing
dependencies do. A passing score means the package is maintained and license-compatible —
it says nothing about whether the team has read its source or understands its failure modes.

> **Rule of thumb:** If you cannot explain what the dependency does in one sentence
> without reading its README, you do not understand it well enough to add it.
