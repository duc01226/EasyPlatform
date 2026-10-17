# Scan Target: seed-test-data

> One entry of the scan target registry — index, selection rules, path roots and the custom-doc contract are in `../targets.md` (read it first). The `$scan --target=seed-test-data` host (`../../SKILL.md`) loads this file for that run only.

This target scans seeder and dev-data patterns into the seed-test-data reference doc.

- **doc:** `<ref>/seed-test-data-reference.md`
- **applies when:** an owned project/test data seeder, reusable fixture loader, or repeatable sample-data setup is evidenced in source/config.
- **skip when:** there is no seed/data-loading owner; ordinary inline test setup alone does not establish a seeder capability.
- **description:** `[Documentation] Use when recording evidenced seed and reusable sample-data setup.`
- **sub-agents:** the main agent performs the evidence scan; a fresh-eyes verifier re-checks cited examples. Do not dispatch optional test/data branches without a corresponding capability.

### Phase 0 detection — owner, purpose, safety, and mode

Read the target doc, optional validated project config, and any optional seed/data capability section that exists, then classify mode:
- `<ref>/seed-test-data-reference.md`
- project-config's declared data/seed paths and settings, if present

| Mode | Condition | Behavior |
| --- | --- | --- |
| **Init** | missing or placeholder doc | write only evidence-backed applicable sections; note material unknowns |
| **Sync** | existing real content | update only stale or newly evidenced sections |

### Evidence scan

Start from verified source/config roots and locate possible seed owners, invocations, setup/teardown, sample-data assets, and repository-defined data-loading commands. Search terms such as `seed`, `fixture`, `sample data`, `bootstrap`, `loader`, `factory`, or `setup` are leads only; adapt them to the languages/frameworks found and follow callers to establish real use.

Distinguish persistent project/demo data, test fixtures, migrations, and one-shot administrative loaders. Record only patterns present in source: environment/tenant/permission guards, transaction or scope management, idempotency, cleanup, registration, cross-process synchronization, and data ownership. A script may have no base class or DI registration; those structures are never prerequisites.

Use a repository graph only when its database and supported trace command are available and verified; source definitions and callers remain the evidence authority. Do not execute seeders or mutate project data as part of this documentation scan.

Capture at minimum the evidenced entry point and purpose, who owns the data, where/when the loader runs, and how safety and repeatability/cleanup are handled when applicable. If a relevant safeguard cannot be established, state the evidence gap instead of inventing one.

### Target Sections

| Section | Content |
| --- | --- |
| **Seeder/Fixture Capability** | Actual owner, entry point, intent (project/demo/test), and verified invocation path. |
| **Safety & Scope** | Environment, data scope, authorization, and tenant boundaries only when present; identify destructive behavior and guardrails. |
| **Repeatability & Cleanup** | Idempotency or cleanup behavior where relevant; state explicitly when a loader is one-shot or no protection is established. |
| **Data Ownership & Persistence** | Data/schema owner and transaction/scope rules where evidenced. |
| **Registration & Cross-Boundary Effects** | Runtime registration, asynchronous convergence, or downstream effects only when present. |
| **Verified Risks** | Anti-patterns or safety gaps directly established by source; omit speculation. |

### Content Rules / exceptions
Follow shared `output-quality-principles`. Surgical sync only; every rule/example needs `file:line` proof. Preserve valid local section structure, include risk warnings only when verified, and prefer short snippets with source-path notes. Never include secret values or production records.

### Special slivers
- A base class, interface, dependency-injection container, scoped execution helper, count loop, environment key, or cross-service wait is optional. Document it only when source shows it.
- Treat the optional project-config seed/data capability as optional: do not create it merely to fill this reference doc. When a separate config update is requested, use only supported schema fields and evidence-backed values.
- Verify each invocation, guard, registration, owner, cleanup mechanism, and cited code example against its actual definition and call path. Graph analysis is optional, not a substitute for source checks.
- **Safety:** never copy secret values, tokens, connection strings with credentials, or production personal data into reports/docs. Record variable/reference names and mechanisms only.
- Report → `tmp/reports/seed-test-data-scan-{YYMMDD}-{HHMM}-report.md` (mode, evidence summary `file:line`, sections updated, open gaps).

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "Every project seeder must use a base class/DI scope/count loop" | Trace the actual entry point and lifecycle; record only structures this project uses and flag a gap only when the data risk requires it. |
| "A familiar seed filename proves the loader is active" | Follow its invocation/registration path and verify its current purpose before documenting. |
| "The missing optional seed config makes this target invalid" | Optional capability config may be absent; document only source-backed behavior without scaffolding it. |
| "There is no safety issue because it is only test data" | Verify target environment, data scope, secret handling, and cleanup; distinguish placeholders from real sensitive data. |
| "Document the anti-pattern I expect to find" | Include risks only when verified in source. |
| "A full rewrite is cleaner" | Sync mode is surgical; preserve valid local sections and update stale claims only. |
| "Skip fresh-eyes verification after findings" | Recheck every cited entry point and safeguard after updating the doc. |

### prompt-enhance
`$prompt-enhance <ref>/seed-test-data-reference.md`
