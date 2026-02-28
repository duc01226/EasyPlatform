# ADR-001: Decision Record Format

## Status

Accepted

## Date

2026-01-22

## Context

BravoSUITE is a complex enterprise platform with multiple microservices (bravoTALENTS, bravoGROWTH, bravoSURVEYS, bravoINSIGHTS, Accounts) that need to evolve cohesively. Significant architectural decisions have historically been made without formal documentation, leading to:

1. **Knowledge loss** - Reasoning behind decisions forgotten over time
2. **Inconsistent patterns** - Different services adopting different approaches
3. **Repeated debates** - Same decisions revisited without historical context
4. **Onboarding friction** - New team members lack context for existing architecture

We need a lightweight, consistent format for capturing architectural decisions that balances thoroughness with maintainability.

## Decision

Adopt Architecture Decision Records (ADRs) using a BravoSUITE-customized template stored in `docs/architecture-decisions/`.

### Key Elements

1. **Global sequential numbering**: ADR-001, ADR-002, etc. (not per-service)
2. **Service checklist**: Explicit marking of affected services
3. **Migration section**: Captures required changes and their scope
4. **Alternatives table**: Structured comparison of options considered
5. **Architect agent**: Claude Code agent to assist with ADR creation and review

### Template Location

`docs/templates/adr-template.md`

### Workflow

1. Developer/architect identifies need for ADR (see criteria below)
2. Use architect agent or create manually from template
3. Submit as part of PR or separate documentation PR
4. Team reviews and provides feedback
5. Update status: Proposed → Accepted/Rejected
6. Update README.md index

## Affected Services

- [x] bravoTALENTS (Recruitment)
- [x] bravoGROWTH (HR/Employee)
- [x] bravoSURVEYS (Surveys)
- [x] bravoINSIGHTS (Analytics)
- [x] Accounts (Authentication)
- [x] Frontend WebV2 (Angular 19)
- [x] Frontend Web (Angular 12 legacy)
- [x] Platform Core

All services and teams should follow this format for architectural decisions.

## Consequences

### Positive

- Decisions are documented with full context and rationale
- Historical decisions are discoverable and searchable
- New team members can understand "why" behind architecture
- Reduces repeated debates on settled decisions
- Creates audit trail for compliance and governance

### Negative

- Additional overhead for documenting decisions
- Requires discipline to maintain and update
- May create false sense of finality (decisions can change)

### Neutral

- ADRs are immutable once accepted; superseding decisions create new ADRs
- Format may evolve based on team feedback

## Migration Required

- [ ] Database migrations (EF Core / MongoDB)
- [ ] Message bus event schema changes
- [ ] API contract breaking changes
- [ ] Frontend component updates
- [x] Configuration changes
- [ ] Data migration scripts

Configuration change: Claude Code architect agent added (`.claude/agents/architect.md`)

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Wiki pages | Familiar, searchable | No versioning, no PR review, scattered | Rejected |
| Confluence | Rich formatting | Separate from codebase, access control issues | Rejected |
| RFC documents | Thorough, formal | Too heavyweight for most decisions | Rejected |
| ADRs in repo | Version controlled, co-located with code, PR-reviewable | Requires Markdown discipline | **Selected** |

## Implementation Notes

### When to Create ADR

**Required:**
- New service or major service modification
- Cross-service communication changes
- Database technology selection
- Authentication/authorization changes
- Third-party integration decisions
- Breaking API changes
- Significant performance optimizations

**Optional:**
- Internal refactoring within single service
- Bug fixes
- Minor feature additions

### ADR Lifecycle

```
Proposed → Under Review → Accepted
                       → Rejected

Accepted → Deprecated (no longer applies)
         → Superseded by ADR-XXX (replaced)
```

### Using the Architect Agent

```bash
# In Claude Code
> Use the architect agent to create an ADR for [topic]
```

The agent will:
1. Gather context about the decision
2. Auto-activate arch-* skills for comprehensive review
3. Create ADR following the template
4. Update the README index

## Related

- **ADRs:** N/A (this is the first ADR)
- **Skills:** arch-cross-service-integration, arch-security-review, arch-performance-optimization
- **Docs:** [ADR Template](../templates/adr-template.md)

---
*Generated with Claude Code architect agent*
