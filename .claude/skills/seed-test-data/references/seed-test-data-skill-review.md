## Mode: Review (seed-data convention audit)

> **Read when `--mode=review` is selected or Generate reaches self-audit.** Audit every [Universal Seed Data Rule](../SKILL.md#universal-seed-data-rules) and project seeder convention with per-item evidence. Review is read-only; report confirmed defects to Generate for correction, then re-audit.

### R0 — Resolve the review target

Resolve the target in this order:

1. **Explicit target** — review exactly the named seeder file, class or feature area.
2. **Current changes** — use `git diff --name-only`, `git diff --cached --name-only` and untracked files, filtered by discovered seeder naming. Review every changed or added seeder.
3. **Work-context result** — seeders created or edited earlier in this session/work context.

If none resolves, ask which seeder to review; never assume a target.

### R1 — Read the conventions BEFORE reviewing (BLOCKING)

Before any verdict, read in full:

- `seed-test-data-reference.md` under the resolved project-reference root (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it): locations, base/interface, environment/count keys, DI/UoW lifetime, Required Patterns and Verification Checklist.
- The loader-selected project config → `Data Seeders` context group: source roots, naming and run commands.
- [Universal Seed Data Rules](../SKILL.md#universal-seed-data-rules): the graded principles.
- Every target seeder: re-read it; never review from memory.

Apply Generate's **Discover conventions** step: confirm the actual seeder base/interface, environment gate and count key with `file:line`. Grade these discovered owners, not generic defaults.

> A skeleton reference (`TODO` placeholders) requires an explicit missing/incomplete-reference finding; grade against discovered `file:line` conventions instead.

### R2 — Review checklist (grade EVERY item: `file:line` evidence or FAIL)

**Universal rules:**

- [ ] **Environment gate is the FIRST check** — dev/enabled-config only, NEVER production.
- [ ] **Command-based** — domain entities created ONLY via application-layer commands; ZERO direct repo/DB writes.
- [ ] **No duplicated logic** — seeder feeds realistic inputs; commands own validation / domain / event side-effects.
- [ ] **Idempotency** — count-before-seed gate present; running N times converges to target (no duplicates).
- [ ] **Count-configurable** — count read from the discovered config key; NEVER hardcoded (zero → no-op).
- [ ] **Restart-safe loop** — loop starts at `existing_count`, NEVER 0.
- [ ] **Scoped DI per iteration** — fresh scope per loop iteration; no shared DbContext/session.
- [ ] **Real-world reachable state** — every seeded entity is a state the application itself could produce; any direct store write fabricating an otherwise-unreachable state carries a comment justifying WHY it is legitimate; seeded entities carry plausible relative timing, not one shared instant.
- [ ] **Spec-consistency** — every seeded scenario satisfies the selected canonical contract invariants (strict-default §5 only when no native contract is declared; invalid/unresolved profile → BLOCKED); any encoded domain rule (precondition / status / default) is reflected in the spec (and tests where testable), not seeder-only.
- [ ] **Run identity and public-path setup** — every run has a unique reusable identity, keyed synthetic values, and supported application-path arrangement.
- [ ] **Accumulation and integrity** — `target` vs explicit `additive` mode is declared; additive runs preserve prior data and prove before/created/after counts, unique keys, command success, and invariant/reference integrity.
- [ ] **Redacted evidence** — reports/logs expose only safe identifiers and exact counts/status; credentials, tokens, headers, connection strings, PII, and full payloads are redacted.

**Project-specific conventions (from the reference doc):**

- [ ] Seeder lives in the configured folder and extends the project's discovered base class / interface.
- [ ] Registered via the project's documented DI / registration mechanism.
- [ ] Env-gate key + count key match the documented keys AND exist in dev config.
- [ ] Seeder marker (email/name prefix, created-by, dedicated flag) is deterministic across restarts.
- [ ] Conforms to the reference doc's Required Patterns + Verification Checklist.

### R3 — Verdict

Per item: **PASS / FAIL / N/A** with `file:line` evidence and confidence (>80% required to assert a FAIL; <60% → "insufficient evidence", verify before grading). Overall verdict is **PASS only if ZERO universal-rule FAILs**.

- **PASS** → report the evidence table; if idempotency/count tests are absent, suggest `/integration-test`.
- **FAIL** → list each violation, responsible `file:line` and correct pattern from [Anti-Patterns](../SKILL.md#anti-patterns) or the reference doc. Hand confirmed defects to Generate's **Classify** step as broken seeders; re-run `--mode=review` after correction. Never edit the seeder in Review.

### Review-mode task plan (TaskCreate — required)

1. Resolve the target (R0).
2. Read the conventions, config, rules and targets (R1).
3. Confirm base/interface, environment gate and count key with `file:line` (R1).
4. Grade every universal and project item (R2).
5. Report the verdict with per-item evidence (R3).
6. Hand confirmed FAILs to Generate and re-review after correction; otherwise report PASS and next-step suggestion (R3).
7. Analyze AI mistakes & lessons learned.

---
