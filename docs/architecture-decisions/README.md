# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for BravoSUITE.

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](ADR-001-decision-record-format.md) | Decision Record Format | Accepted | 2026-01-22 |
| [ADR-002](ADR-002-integration-testing-approach.md) | Integration Testing Approach for Microservices | Accepted | 2026-02-27 |

## Template

See [ADR Template](../templates/adr-template.md)

## Naming Convention

`ADR-{NNN}-{kebab-case-title}.md`

- Global sequential numbering (ADR-001, ADR-002, etc.)
- Kebab-case title for readability

## Process

1. Create ADR using template via architect agent or manually
2. Status: Proposed -> Review -> Accepted/Rejected
3. Update this index
4. Commit via normal git workflow

## When to Create ADR

- New service or major service modification
- Cross-service communication changes
- Database technology selection
- Authentication/authorization changes
- Third-party integration decisions
- Breaking API changes
- Significant performance optimizations
