# Engineering Foundation Catalog — Project Setup Quality by Profile

Authoritative reference for `SYNC:engineering-foundation-gate`. The inline SYNC block is a condensed
pointer; **this file is the source of truth** for the profile axes, the seven dimensions, the verdict
vocabulary, and the warranting matrix. On any change here, re-run
`.claude/scripts/inject_engineering_foundation_gate.py` so every carrier re-propagates.

> **Companion gates — read the boundary before using this one.**
>
> | Gate                              | Asks                                                                                                 | Catalog                      |
> | --------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------- |
> | `scale-technique-gate`            | Is system-design technique X present at this scale?                                                  | `scale-technique-catalog.md` |
> | `scenario-stress-eval`            | Does the system SURVIVE failure/load scenario Y?                                                     | `scenario-stress-catalog.md` |
> | **`engineering-foundation-gate`** | **Can this team build, run, test and change the system safely — anywhere, repeatably, as it grows?** | **this file**                |
>
> The first two judge the **running system's design**. This one judges the **project's engineering
> foundation** — the setup that makes the system buildable, runnable, testable and changeable. They do
> not overlap: a system can score perfectly on caching and resilience while nobody but its author can
> build it.

---

## 1 · Purpose

A project's foundation is what turns "the code is correct" into "the team can keep it correct". This
gate answers one question per dimension: **would an expert engineer joining this project tomorrow be
able to build it, run it, test it, trust its tests, and change it safely — on their machine, in CI,
and in production — and will that still be true when the codebase is ten times bigger?**

The gate is **purpose-stated and tool-agnostic by design.** It never names a linter, a container
runtime, a mutation-testing tool, a build system, or a load generator. Best practice and tooling turn
over faster than this document can; naming a tool would date the gate and would be wrong in half the
ecosystems it must serve. State the OUTCOME, detect the stack, research what the ecosystem currently
offers, present the top 2–3 options, let the user decide, and record the decision in the project's
config / reference docs so the next run reads it instead of re-deciding.

---

## 2 · Project profile — derive FIRST, from evidence

Every verdict below is relative to the profile. Deriving it is the first obligation; assuming it is a
defect. Cite `file:line`, config, CI definition, or infra manifest for every row below, with confidence.

| Profile element                    | Values                                                                                              | Read it from                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Lifecycle** _(axis)_             | `G` greenfield (foundation being created) · `B` brownfield (foundation exists, under audit)         | presence of source history, existing build/CI config, the invoking workflow |
| **Scale tier** _(axis)_            | `T0` internal/single-instance · `T1` small SaaS (<10k) · `T2` high-scale (10k–1M) · `T3` massive    | **single-sourced in `scale-technique-catalog.md` — reuse, never re-derive** |
| **Business criticality** _(axis)_  | `B0` best-effort · `B1` important · `B2` business-critical · `B3` mission-critical/regulated        | **single-sourced in `scenario-stress-catalog.md` — reuse, never re-derive** |
| **Repo shape** _(axis)_            | `R0` single module · `R1` few modules (2–5) · `R2` many modules / multi-team · `R3` monorepo estate | project structure, build manifests, module/package boundaries, CODEOWNERS   |
| **Runtime surface** _(descriptor)_ | which of: service · web app · mobile · CLI · library · batch/worker · data pipeline                 | entry points, deploy manifests, package targets                             |

**Four axes, one descriptor — the distinction is load-bearing.** `Lifecycle`, `T`, `B` and `R` are the four
profile **axes**, and they are what the rest of this document reads: `Lifecycle` selects the authority split
(§3), and `T`/`B`/`R` drive the warranting matrix (§5). **Runtime surface is a descriptor, not an axis** — it
is ungraded, appears in no warranting column, and never raises or lowers a verdict by itself; it tells you
which dimensions are applicable at all (a published library has no deployment topology to run containerized).
Counting it as a fifth axis is the one way to read this table and disagree with the protocol consumers that
act on it, which enumerate four: the gate's `BLOCKED until` checklist (_"lifecycle + `T` + `B` + `R`"_) and
`SYNC:plan-quality` clause 11 (_"the four profile axes"_).

**Unknown axis → state the assumption explicitly and pick the LOWER tier.** Never default to `T3`/`B3`/`R3`:
over-stating the profile is how a gate turns into busywork that a small team correctly ignores.

**Criticality-signal floor (inherited from `scenario-stress-catalog.md`):** regulated / PII / financial /
health data, money movement, auth/identity, or legal-compliance scope raises `B` to **at least `B2`**
even absent SLA docs. `B` and `T` are independent — a low-traffic payroll run is low-`T`, high-`B`.

---

## 3 · Verdicts (per dimension)

| Verdict             | Meaning                                                                                 | Action                                                                          |
| ------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `PRESENT`           | Outcome is achieved and proven by cited evidence                                        | none                                                                            |
| `MISSING-WARRANTED` | Profile warrants it; no evidence it exists                                              | **greenfield: BLOCKING** · **brownfield: advise + name the smallest next step** |
| `PARTIAL-WITH-PATH` | Partly achieved; the remaining gap is named, with a concrete incremental step           | advise; carry the step into the plan                                            |
| `N/A-by-profile`    | Below the warranting profile — **a correctly-lean project scores PASS here, not a gap** | none — never report as a deficiency                                             |
| `OVER-ENGINEERED`   | Present but unwarranted at this profile; carrying cost exceeds value                    | **advise AGAINST**, name the carrying cost                                      |
| `UNVERIFIED`        | Could not be checked (no access, no runnable environment)                               | say so honestly — never score an unverified dimension as `PRESENT`              |

### Authority — when this gate blocks and when it only advises

This is the one place this gate deliberately differs from its two companions.

- **CREATING a foundation** (greenfield init, scaffold, a plan that stands up build/test/CI): a
  `MISSING-WARRANTED` dimension is **BLOCKING**. You are choosing the foundation right now; choosing
  to omit a warranted one is a decision that needs to be explicit, not a silent default.
- **AUDITING an existing foundation** (brownfield review, architecture audit, changes review): this
  gate is **ADVISORY**. It emits the matrix and a prioritized adoption path. It **NEVER mutates another
  review's score, `/20`, `/24`, verdict band, or PASS/FAIL** — the same rule that binds
  `scale-technique-gate` and `scenario-stress-eval`. Blocking a review of a ten-year-old codebase on
  foundations it never had produces a useless report, not a better project.

— why the split: the cost of adding a foundation is near zero at creation time and high afterwards.
The gate's strictness should track that cost, not the reviewer's mood.

---

## 4 · The seven foundation dimensions

Each dimension states an **Outcome** (what must be true — the checkable principle), **Proof** (the
evidence that settles it), **Warranted at** (the profile floor), an **Anti-over-engineering guard**,
and the **Depth owner** (the skill that owns detailed review, so this gate stays a gate and does not
duplicate a specialist).

---

### F1 · Reproducible environment — "it runs the same way everywhere"

**Outcome.** A person or machine that has never seen this repo can reach a working, running system by
following one documented path, and gets the same result every time. Nothing required to build or run
it lives only in someone's shell history, personal machine, or memory.

The failure this eliminates is **"works on my machine"** — which is not a joke about carelessness but
a structural property: the build depends on ambient state nobody declared.

**Proof — all of it cited, not asserted:**

- One documented bootstrap path (a command, script, or devcontainer-style definition) takes a clean
  machine to a running system; the doc is current enough that its steps match the repo.
- **Toolchain versions are pinned**, not floating — language runtime, package manager, build tool.
  A range that resolves differently next month is not pinned.
- **Dependencies resolve to exact versions** via a committed lock/manifest, so two people and CI
  install byte-identical trees. Transitive drift is the common leak.
- **Every external prerequisite is declared** (services, databases, brokers, certificates, ports,
  environment variables) with a documented way to obtain or fake each one. An undeclared prerequisite
  is the single most common cause of a broken first day.
- **Configuration is explicit and environment-injected**, never machine-implicit: no absolute local
  paths, no developer-specific hostnames, no "it only works if you already have X installed".
- **Determinism is real**: the same commit produces the same build output; anything intentionally
  non-deterministic (timestamps, build IDs) is named as such.

**Warranted at:** all profiles, from `T0`/`R0`. This is the floor. A one-person `T0` tool still has
a future maintainer, and that maintainer is usually the author, six months later.

**Anti-over-engineering guard:** hermetic/sandboxed build systems and fully-isolated dependency
graphs are warranted at `R2+`; requiring them of an `R0` script is `OVER-ENGINEERED`. A pinned
toolchain plus a lockfile plus an honest README satisfies `R0`/`R1` completely.

**Depth owner:** `scaffold` (greenfield), `architecture --mode=scalability` (brownfield audit).

---

### F2 · Supported execution modes — reproducible paths without a two-mode mandate

**Outcome.** The project has a documented, repeatable way to build, run, and test the capabilities it
actually supports. When it supports or requires multiple execution modes (for example, host and
container, local and managed service, simulator and device), those modes share configuration and
topology where possible and do not silently rot.

**Why this is a real dimension:** contributors need a reliable inner loop and the team needs a
repeatable path for CI, release, and incident reproduction. Host/container parity can provide that
for many services, but some project types have a single useful mode or depend on environments that
cannot be containerized (for example, a device toolchain or a managed/serverless runtime). Requiring
two modes everywhere adds setup and maintenance without improving those projects.

**Proof:**

- Name the execution modes the project uses or promises to contributors/operators and give the
  command or documented path for each.
- Exercise every claimed or required mode. If two modes are intentionally supported, use one source
  of truth for shared configuration/topology and test each mode to the extent its contract differs.
- If only one mode fits the runtime, platform, team, or delivery model, document why; verify that
  path and classify the second-mode comparison `N/A-by-profile` rather than inventing a mode.
- State which path CI/release exercises and explain any environment reach that is unavailable.
- **Cross-platform honesty:** if contributors use different operating systems/devices, document the
  supported path or name the tested boundary.

**Warranted at:** a reproducible build/run/test path is warranted whenever contributors or operators
must repeat those actions. A second mode is warranted only when the project uses/requires it or when
measured CI, deployment, debugging, or environment-parity needs justify maintaining it.

**Anti-over-engineering guard:** do not require containers, Compose, bare-host execution, device
simulation, or a second test direction solely to satisfy this dimension. The defect is a claimed or
required path that is broken or irreproducible, not a mode the project does not need.

**Depth owner:** `scaffold`, `production-readiness-review`.

---

### F3 · Environment-portable test execution — local, CI, and production-shaped

**Outcome.** The same test suites execute against a local environment, against CI, and against a
production-like (or production) environment — **parameterized by configuration, never by forked test
code**. What is unsafe to run against production is excluded by a declared, enforced mechanism, not by
a convention someone has to remember.

**Why:** a test that only ever runs against a developer's local stub proves the stub works. Value comes
from the ability to point the same assertions at a progressively more real environment. Forking the
suite per environment guarantees the environments diverge, because only one fork gets maintained.

**Proof:**

- The suite takes its target environment from **configuration/parameters**; there is no per-environment
  copy of the test code.
- **Environment-specific capability is discovered, not assumed**: a suite that needs a capability the
  target lacks reports `ENVIRONMENT-BLOCKED` — it does not silently pass.
- **Destructive/unsafe-in-production tests are explicitly categorized** and excluded from
  production-shaped runs by an enforced mechanism (a tag, a category, a gate) whose absence would fail
  loudly rather than quietly running something destructive.
- **Data strategy travels**: the suite's data setup works in each target environment it claims —
  which in practice means unique, additive, non-destructive data (see `SYNC:repeatable-test-principle`
  and `SYNC:test-data-isolation`, which own this depth).
- **Read-only/smoke tier for production**: where full suites cannot run against production, a
  declared subset (health, contract, smoke) can, and is.

**Warranted at:** local + CI at all profiles. Production-shaped target at `T1+` or `B2+`.
Running against _actual_ production is warranted only where a safe read-only subset exists — never
demand it otherwise.

**Anti-over-engineering guard:** do not require a production-target capability for a `B0` internal
tool, and never recommend running mutating tests against production. "Runs in prod" means a
**safe, declared, non-mutating subset** unless the project explicitly has an isolated production-shaped
staging environment.

**Depth owner:** `test-architecture-execution-contract` (the tier matrix), `integration-test --mode=review`.

---

### F4 · Test-strength proof — the suite is proven defect-sensitive

**Outcome.** There is evidence that the tests **actually fail when the code is wrong**. A suite that
passes is only meaningful if it is known to be capable of failing for the right reason. Assertions
that would hold regardless of whether the behavior is correct are worse than no tests: they cost
maintenance and buy false confidence.

**This is the dimension most projects get wrong**, because the usual proxy — line coverage — measures
which lines _ran_, not which behaviors are _protected_. A test can execute every line of a function and
assert nothing that would change if the function's logic inverted.

**Proof — one of these, strongest available first:**

1. **Automated fault injection**: a tool systematically introduces small defects into the code under
   test and reports which survive undetected. A surviving defect is a missing or vacuous assertion —
   the killing test gets written. Gate the build on this signal where the ecosystem offers a workable
   tool.
2. **Deliberate defect-seeding drill** — the fallback that makes this dimension checkable in **every**
   ecosystem, including those with no such tool: for each of the highest-value protected behaviors
   (the invariants and business rules whose breach would be most costly), deliberately break the
   production code, run the suite, and record **which named test went red**. Restore the code. A
   behavior where nothing went red has no real protection — write the test that would have caught it.
   Record the drill: the behavior, the defect introduced, the test that caught it (or the gap found).
3. **Assertion-intent audit** (weakest, but always available): read the assertions and ask of each,
   _"what wrong behavior would this catch?"_ Flag assertions that would hold under an inverted
   implementation, that assert only non-nullness or a type, that re-assert the input, or that assert
   framework/infrastructure bookkeeping rather than the outcome the system owns.

**Line coverage is a DIAGNOSTIC, never a gate.** Low coverage is a useful negative signal (something is
untested). High coverage is not evidence of quality. Never fail a build on a coverage percentage — it
reliably produces tests written to touch lines rather than to protect behavior.

**Warranted at:** all profiles that have tests at all. The _automated_ form is warranted at `T1+`/`B1+`
or wherever a workable tool exists; the drill is the universal floor, and it is cheap — it costs one
edit-run-revert cycle per protected behavior.

**Anti-over-engineering guard:** do not demand a full-repository mutation run on every commit — it is
slow and mostly redundant. Scope the automated signal to **changed code**, and scope the drill to the
**highest-value invariants**, not to every test.

**Scope boundary — do NOT re-litigate a solved question.** Per-change enforcement of this is already
owned by `integration-test --mode=review` **Gate 1**, whose _Mutation Probe Ledger_ is required on both the
tool path and the manual-fallback path, with no PASS without the ledger. **This dimension asks a
different question:** does the PROJECT HAVE a test-strength mechanism wired into its harness at all?
A project can pass every diff-level review and still have no standing sensor, because each review only
ever saw one change. Report the _setup_ gap here and the _assertion_ gap there — never both.

**Depth owner:** `SYNC:harness-setup` (sensor design), `integration-test --mode=review` (per-change
enforcement and assertion quality), `spec [mode=tests]` (which behaviors must be protected).

---

### F5 · Performance & scale-under-data — an executable tier, not an opinion

**Outcome.** Performance is **measured by something that runs and can fail**, against data volumes
representative of the target scale — not merely reasoned about in review. The system is shown to hold
its performance as data grows, and to **degrade rather than die** under volume: no unbounded memory
growth, no out-of-memory crash, no exhausted connection pool, no query that loads an entire table
because nobody ever ran it against a big one.

**Why this is separate from the analysis gates:** `scale-technique-gate` asks whether an index or a
cache is _present_, and `scenario-stress-eval` asks whether the design _would survive_ a data-growth
scenario. Both are reasoning, both are deliberately advice-only, and both can be satisfied by a system
that has never once been run against a large dataset. This dimension asks for the **executable
counterpart**: seed a lot of data, run it, and let the numbers fail the build.

**Proof:**

- A **performance/load tier exists and is runnable** with a documented command, like any other test
  tier (it belongs in the tier matrix — see `SYNC:test-architecture-execution-contract`).
- **Representative data volume** can be generated on demand — a seeding path that produces realistic
  quantities and realistic _shapes_ (distribution, cardinality, skew), not a million identical rows.
  A hot-path query behaves differently against uniform data than against real skew.
- **Explicit budgets that FAIL**: named latency/throughput/memory/resource thresholds that the run
  asserts against. A performance test that only reports numbers is a dashboard, not a gate — someone
  has to read it, and eventually nobody does.
- **Growth is exercised**: behavior is compared across at least two volumes (e.g. 10× apart) so that
  a super-linear curve is visible. A single data point cannot distinguish O(n) from O(n²).
- **Resource exhaustion is a tested outcome**: the system's response to volume beyond its budget is
  known and bounded — backpressure, paging, a clean error — rather than an OOM kill. Unbounded
  result-set loading, unbounded in-memory accumulation, and unbounded concurrency are the three
  recurring causes; each should be provably absent or provably bounded on the paths that matter.
- **Runs where it means something**: a performance number from a laptop under a container CPU limit is
  a regression signal, not a capacity statement. Say which it is.

**Warranted at:** `T1+` or `B2+` for a real tier with budgets. At `T0`/`B0`: a documented largest
expected volume plus one manual check that the system survives it is sufficient — a full load
harness there is `OVER-ENGINEERED`. At `T2+`: growth curves and resource-exhaustion behavior become
non-optional.

**Anti-over-engineering guard:** do not recommend a distributed load-generation platform for a
small internal service. The floor is "we ran it against a lot of data on purpose, and we know what
broke first."

**Depth owner:** `performance-review` (analysis depth, budgets, symptom→cause triage),
`seed-test-data` (volume generation), `scenario-stress-eval` (design-level survival).

---

### F6 · Build & change scalability — cost of a change stays flat as the repo grows

**Outcome.** The time and blast radius of building, testing, and changing the system **do not grow
proportionally with the codebase**. Work is scoped to what a change actually affects; module
boundaries are real enough that the affected set is _computable_ rather than guessed.

**Why:** every project is fast to build on day one. The foundation decision that matters is whether
the tenth module costs the same as the second. Once a full build is slow enough to be annoying,
engineers stop running it locally, feedback moves to CI, cycle time collapses, and the fix is
expensive because the boundaries needed to scope work were never drawn.

**Proof:**

- **The affected set is computable**: given a change, the system can determine which modules /
  sub-domains must be rebuilt and retested — because dependencies between modules are explicit and
  declared, not implicit through a shared everything-bucket.
- **Incrementality and caching are real and measured**: an unchanged module is not rebuilt; a
  no-op build is fast. Claimed caching that never hits is a common and invisible failure.
- **Boundaries are enforced mechanically**, not by convention: an import that violates the intended
  dependency direction fails a check rather than surviving review. Without enforcement, boundaries
  decay silently and the affected set becomes "everything".
- **A declared architecture style exists and is followed** — modular monolith, clean/hexagonal,
  layered, service-oriented, whatever the project has chosen — and the choice is written down where
  the next engineer will find it. The style matters less than the fact that one is declared and
  enforced; an undeclared style is indistinguishable from no style after two years.
- **Technical implementation is hidden behind abstraction** so a technology can be replaced without
  touching business logic. Depth for this — leaked implementation types, shallow modules, change
  amplification, the edit-site test — is owned by `SYNC:complexity-prevention`; this gate checks only
  that the _structure_ supports it.
- **Feedback stays fast**: the inner loop (the check a developer runs before pushing) is scoped and
  quick; the exhaustive run belongs in CI. If the only available check is the slow exhaustive one,
  that is the finding.

**Warranted at:** `R1+` for declared boundaries and a declared style; `R2+` for computable affected
sets, enforced boundary checks, and measured incrementality; `R3` additionally for build-graph-level
scoping across the estate.

**Anti-over-engineering guard:** a single-module `R0` project does not need affected-set computation,
a build graph, or module-boundary enforcement — recommending them is `OVER-ENGINEERED`. Conversely,
splitting a small system into many modules to look modular creates a distributed monolith: coupling
survives the split while the build cost doubles. The trigger is real module count and real team
count, never aesthetics.

**Scope boundary.** `architecture --mode=scalability` already SCORES this: gate **G2 Build & CI
Scalability** ("incremental/affected-only/caching strategy exists or a clear N/A rationale is
documented") and gate **G4 Boundary Enforcement** ("dependency direction and module boundaries are
explicit and enforceable"). Where that review has run, **cite its verdict rather than re-scoring** —
this dimension only confirms the question was examined and is not silently absent.

**Depth owner:** `architecture --mode=scalability` (G2/G4 — build/CI scalability, module isolation,
distributed-monolith risk), `architecture --mode=review` (diff-level boundary drift),
`SYNC:complexity-prevention` (cost of change in the code itself).

---

### F7 · Mechanical quality harness — every machine-catchable defect is caught by a machine

**Outcome.** No human reviewer spends attention on a defect class a machine could have caught, and no
such defect reaches the main branch. Every mechanical check runs **locally on the same command CI
runs**, and fires at the earliest cheap point.

**Why:** reviewer attention is the scarcest resource in the project. Every formatting nit, unused
import, or obvious type error that reaches a human is attention stolen from the design and correctness
questions only a human can answer. And a check that exists only in CI teaches people to push to find
out — which is the slowest possible feedback loop.

**Coverage — the classes to account for.** Name them by the defect class they catch, and select
current tooling per ecosystem at decision time:

| Class                      | Catches                                                                   |
| -------------------------- | ------------------------------------------------------------------------- |
| Formatting                 | style churn and diff noise — should be automatic and unarguable           |
| Lint / correctness rules   | known bug patterns, unsafe constructs, dead or unreachable code           |
| Type / static analysis     | contract violations before runtime; the strongest available strictness    |
| Complexity & duplication   | change-amplifying structures, copy-paste divergence                       |
| Architecture fitness       | boundary/dependency-direction violations, layering breaches (executable)  |
| Dependency health          | known vulnerabilities, unmaintained/abandoned packages, license conflicts |
| Secret scanning            | credentials committed to history                                          |
| Build/test gates           | the suite itself, plus the test-strength signal from **F4**               |
| Documentation/config drift | generated artifacts, references, and configs that no longer match source  |

**Proof:**

- Each warranted class is either **present with its command cited**, or explicitly recorded as
  `N/A-by-profile` with a reason. An unlisted class is an unexamined class.
- **Local and CI run the same checks** — same command, same configuration, same version. Divergence
  means CI failures nobody can reproduce.
- **Checks are enforcing, not advisory**: a violation fails something. A warning stream nobody reads
  is not a harness. Where a check is newly introduced to a brownfield project, a **ratchet** (fail on
  new violations, tolerate the existing baseline) is the correct pattern — it is `PRESENT`, not
  `PARTIAL`, because it prevents regression from day one.
- **Strictest reasonable defaults**, loosened only deliberately and with a recorded reason. Every
  disabled rule should be explicable; a large silent suppression list is itself a finding.
- **Fast feedback ordering**: cheap checks first (pre-commit/pre-push), expensive last (CI, scheduled).

**Warranted at:** formatting, lint, type/static analysis, and build/test gates at **all** profiles —
these are the floor. Architecture fitness at `R1+`. Dependency health and secret scanning at any
profile that ships or handles real data (and unconditionally at `B2+`). Complexity/duplication and
drift checks at `R1+`/`T1+`.

**Anti-over-engineering guard:** do not stack four overlapping analyzers that report the same class;
the carrying cost is noise and slow builds, and the result is people learning to ignore output.
One well-configured enforcing check per class beats three advisory ones.

**Depth owner:** `linter-setup` (selection and configuration), `SYNC:harness-setup` (feedforward vs
feedback control design), `security-audit` (dependency/supply-chain and secret depth).

---

## 5 · Warranting matrix (quick reference)

`✓` warranted · `·` not warranted at this profile (a `PASS`, not a gap) · `◐` warranted in reduced form

| Dimension                         | T0/B0/R0 | T1/B1/R1 | T2/B2/R2 | T3/B3/R3 |
| --------------------------------- | :------: | :------: | :------: | :------: |
| F1 Reproducible environment       |    ✓     |    ✓     |    ✓     |    ✓     |
| F2 Supported execution modes      |    ◐     |    ◐     |    ◐     |    ◐     |
| F3 Environment-portable tests     |    ◐     |    ✓     |    ✓     |    ✓     |
| F4 Test-strength proof            |    ◐     |    ✓     |    ✓     |    ✓     |
| F5 Performance & scale-under-data |    ◐     |    ✓     |    ✓     |    ✓     |
| F6 Build & change scalability     |    ·     |    ◐     |    ✓     |    ✓     |
| F7 Mechanical quality harness     |    ◐     |    ✓     |    ✓     |    ✓     |

`◐` means the applicable scope depends on project evidence, as described in that dimension's
_Anti-over-engineering guard_. For F2, a second execution mode is warranted only when the project
supports or requires it; a single reproducible mode may make the comparison `N/A-by-profile` at any
scale. For other dimensions, reduced checks may be appropriate at `T0/B0/R0` (for example F4 = proof
for top invariants; F5 = one documented volume check; F7 = the relevant formatter/lint/type/test
checks). Read the guard and runtime profile, not just the tick.

**The matrix reads on the highest applicable axis as a starting point.** A `T0` system handling
regulated data is `B2` and takes the `B2` column. Repo shape drives F6; scale and criticality drive
the other baseline tiers. Runtime, deployment, and platform evidence may change applicability; record
the reason rather than forcing a tool or mode from the matrix.

---

## 6 · Brownfield adoption ladder

A brownfield audit that returns seven `MISSING-WARRANTED` verdicts and no path is a demoralizing
document nobody acts on. Every brownfield finding must name **the smallest next step that produces
value on its own**. Recommended ordering — each rung is independently valuable and makes the next
cheaper:

1. **Pin and lock (F1).** Pin the toolchain, commit the lockfile, write down the prerequisites.
   Cheapest possible step; immediately stops a class of "works on my machine".
2. **One command, one truth (F1/F7).** Make the checks a developer needs runnable by one local command
   — the same one CI runs. Nothing new is enforced yet; the loop just gets honest.
3. **Ratchet the harness (F7).** Turn on format/lint/types/dependency+secret scanning in
   fail-on-new mode. The existing baseline is tolerated; regression stops today.
4. **Prove the tests (F4).** Run the seeding drill against the top invariants. This usually finds the
   most alarming result of the whole audit, and it needs no tooling or budget.
5. **Repair an applicable execution/environment path (F1/F2/F3).** Verify the project's supported
   modes and target reach; add another mode only when its runtime, team, CI, or deployment contract
   warrants it. Parameterize the suite by target when that fits the existing harness.
6. **Measure before optimizing (F5).** Seed a realistic volume, get one honest number and one budget.
   A single asserted budget beats an unread dashboard.
7. **Draw the boundaries (F6).** Declare the style, then enforce the dependency direction
   mechanically; computable affected sets follow from enforced boundaries, not before them.

Sequence deviations are fine when evidence justifies them — say why. What is not fine is a list of
seven gaps with no first step.

---

## 7 · Tool-agnosticism rule (binding)

**Never hardcode a tool choice in this gate, in a report it produces, or in a protocol derived from
it.** State the outcome; detect the stack; research what the ecosystem currently offers; present the
top 2–3 options with trade-offs; let the user decide; record the decision in the project's config or
reference docs so subsequent runs read the decision instead of re-litigating it.

— why: this gate must stay correct across ecosystems it has never seen and across years of tooling
turnover. An outcome ("mechanically enforced dependency direction") stays true; a tool name is wrong
in most ecosystems on the day it is written and wrong in all of them eventually.

A project that has already recorded its choices is `PRESENT` on that dimension regardless of which
tools it picked, provided the outcome is achieved and proven.

---

## 8 · Output — Foundation Readiness Matrix

Emit one row per dimension, always all seven, never a filtered subset (an omitted row is
indistinguishable from an overlooked one):

| dimension | warranted at this profile? | present? | verdict | evidence (`file:line` / config / CI) | smallest next step |
| --------- | -------------------------- | -------- | ------- | ------------------------------------ | ------------------ |

Precede it with the derived profile — the four axes (`Lifecycle · T · B · R`) each with its confidence and
evidence, plus the runtime surface as a descriptor. Follow it with the ordered adoption path for brownfield,
or the blocking list for greenfield.

---

## 9 · Closing reminder

**Derive the profile from evidence before judging anything.** Never default to the highest tier.

**A lean project that correctly needs less is a PASS, not a gap.** The anti-over-engineering guard is
first-class, symmetric with the criticality floor, and applies to every dimension.

**Blocking when creating a foundation; ADVISORY when auditing one.** When advisory, emit the matrix as
guidance and **NEVER mutate any score, `/20`, `/24`, verdict band, or gate PASS/FAIL.**

**State outcomes, never tools.** Best practice turns over; the outcome does not.

**Drift-guard:** the profile axes, dimensions, verdicts, and warranting matrix are AUTHORITATIVE in
this file. On any change, update this catalog FIRST, then re-run
`.claude/scripts/inject_engineering_foundation_gate.py` to re-propagate the condensed inline block.
Scale tier stays single-sourced in `scale-technique-catalog.md`; business criticality in
`scenario-stress-catalog.md`.
