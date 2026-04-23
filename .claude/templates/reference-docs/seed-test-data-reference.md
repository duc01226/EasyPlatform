# Seed Test Data Reference

<!-- Fill in your project's details below -->

> Project-specific supplement to `/seed-test-data`. Replace placeholders with real paths, config keys, and conventions from your codebase.

## Quick Summary

**Goal:** Document how this project seeds test/dev data safely and idempotently.

**Key Rules:**

- Always gate seeding to non-production or explicit config flag
- Always ensure idempotency (`existing >= target` short-circuit)
- Prefer command/application-layer dispatch over direct domain writes
- Use fresh DI/UoW scope per loop iteration when required by your stack

## Seeder Locations

- Primary folder(s): `TODO`
- Core seeder class(es): `TODO`
- Helper/orchestrator class(es): `TODO`

## Config Keys

```json
{
    "TODO_EnableSeedFlag": true,
    "TODO_SeedTargetCount": 0
}
```

## Reference Files (fill with real paths)

1. `TODO` - base seeder abstraction
2. `TODO` - concrete seeder implementation
3. `TODO` - command/helper used by seeder
4. `TODO` - DI registration location

## Required Patterns

### Environment Gate

- Config or environment key: `TODO`
- Guard location: `TODO`

### Idempotency

- Existing-count predicate: `TODO`
- Target-count source: `TODO`
- Loop strategy: `TODO`

### DI/UoW Scope Safety

- Required scope strategy: `TODO`
- Anti-patterns to avoid: `TODO`

## Minimal Template (stack-specific example)

```text
if (!CanSeed()) return;
target = ReadTargetCount();
existing = CountExistingSeededData();
if (existing >= target) return;
for i in [existing..target):
  with fresh scope:
    dispatch create/update command
```

## Verification Checklist

- [ ] Seeder runs only in allowed environments
- [ ] Rerun does not duplicate already-seeded records
- [ ] Count is configurable and restart-safe
- [ ] DI/UoW scope pattern is safe for parallel/loop execution
- [ ] All claims include `file:line` evidence after scan
