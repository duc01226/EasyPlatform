> **Preservation Inventory** — MANDATORY for bugfix plans. Trigger keywords in plan title/frontmatter: `fix`, `bug`, `regression`, `broken`, `defect`. Author MUST produce this table BEFORE writing implementation steps.
>
> **Columns:** `Invariant | file:line | Why (data consequence if broken) | Verification (configured owner + case/scenario + optional variant + assertion file:line; strict-default TC-ID or grep only when specArtifacts is absent)`
>
> **BLOCKED until:** ≥3 rows · every File cell has `file:line` · with a valid `specArtifacts` profile, each verification resolves to the actual case/executor and inspected assertion at `file:line`; when it is absent, each cell has TC-ID or grep (not "manually verify"); a malformed or unsupported declaration blocks without fallback.
