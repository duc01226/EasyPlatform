---
name: scan-seed-test-data
version: 1.0.0
description: '[Documentation] Scan seeder patterns and populate/sync docs/project-reference/seed-test-data-reference.md from real code evidence.'
---

> **[IMPORTANT]** Use `TaskCreate` to break work into small tasks before scanning.

## Quick Summary

**Goal:** Populate or sync `docs/project-reference/seed-test-data-reference.md` with project-specific seeder patterns using `file:line` evidence.

**Workflow:**

1. **Read target doc** — detect placeholder vs populated mode
2. **Scan codebase** — collect seeder base classes, env gate, idempotency loop, DI scope pattern, registration pattern
3. **Update doc surgically** — keep structure, refresh stale sections only
4. **Verify** — grep/trace evidence and ensure examples match real files

## Step 1: Detect Mode

Read:

- `docs/project-reference/seed-test-data-reference.md`
- `docs/project-config.json` (`Data Seeders` context group)

Mode rules:

- **Init mode:** placeholder/sparse content -> fill all sections from scan results
- **Sync mode:** existing content -> update only stale/incorrect sections

## Step 2: Collect Seeder Evidence

Run evidence-first scans (adapt to stack, examples below for.NET projects):

```bash
rg -n "DataSeeder|SeedData|CanSeedTestingData|SeedingMinimumDummyItemsCount|ExecuteInjectScopedAsync|ExecuteUowTask" src
rg -n "IPlatformApplicationDataSeeder|AddTransient<IPlatformApplicationDataSeeder" src
rg -n "WaitUntilAsync|SeedAdminUserData|CountAsync\\(" src
```

Graph check (when `.code-graph/graph.db` exists):

```bash
python .claude/scripts/code_graph trace <seeder-file> --direction both --json
```

Minimum evidence to capture:

1. Seeder base class/interface
2. Environment gate method/key
3. Idempotency predicate + count loop pattern
4. DI scope pattern (`ExecuteInjectScopedAsync` vs anti-patterns)
5. Seeder registration pattern in DI
6. Cross-service wait pattern (if used)

## Step 3: Update Reference Doc

Target file:

- `docs/project-reference/seed-test-data-reference.md`

Rules:

1. Keep the existing section structure where possible
2. Replace generic claims with real project evidence
3. Every rule/example requires `file:line` proof
4. Include anti-pattern warnings only when verified in source
5. Prefer short code snippets with clear source path notes

## Step 4: Verify and Report

Verification checklist:

1. Every example path exists
2. Key method/class names are grep-verified
3. Guidance matches current `docs/project-config.json` seeder rules
4. No stale references to removed symbols/files

Write report:

- `plans/reports/scan-seed-test-data-{YYMMDD}-{HHMM}-report.md`

Report sections:

1. Mode detected (init/sync)
2. Evidence summary (`file:line`)
3. Sections updated
4. Open gaps/TODOs

## Closing Reminders

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim
**IMPORTANT MUST ATTENTION** use surgical updates in sync mode (do not rewrite entire doc)
**IMPORTANT MUST ATTENTION** verify DI-scope safety guidance (`ExecuteInjectScopedAsync`) against real source usage
**IMPORTANT MUST ATTENTION** run one graph trace when graph DB is available
