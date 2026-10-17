# Architecture Knowledge Catalog — Laws, Trade-Offs, Patterns & Anti-Patterns

> **Capacity decisions:** read `.claude/skills/shared/protocols/measured-capacity-engineering.md` when choosing cache placement, capacity targets or a scaling step — model demand/SLO, reduce measured work safely, then prove headroom and recovery. Read `.claude/skills/performance-review/references/performance-knowledge.md` §6.1 and §10.1 when designing the cache contract or benchmark. Throughput evidence and business availability requirements are separate inputs; a low-cost single-instance result does not choose a production topology.

> **Role:** the **authoritative knowledge body** architecture skills reason FROM. Owns the LAWS, TRADE-OFF TABLES, QUALITY-ATTRIBUTE TACTICS, STYLE-SELECTION rules, MODULE-DESIGN principles, PATTERN and ANTI-PATTERN catalogs, the SYMPTOM→CAUSE triage matrix, and the JUDGMENT CHECKLISTS (§20). Owns NO procedure — procedure lives in the consuming skills.
>
> **Consumed by:** `architecture` — mode `--mode=design` (Steps 2, 3A, 3C, 3D, 7, 11) · mode `--mode=review` (Phase 0 + Categories 0, 1, 2, 7, 9, 11, 12) · modes `--mode=scalability` and `--mode=full`. This list is the drift-guard's scope below — a skill belongs here ONLY if it carries an inline `architecture-knowledge.md` pointer, so the list stays greppable and the sweep stays truthful. NEVER add an aspirational consumer.
>
> **Drift-guard:** this file is AUTHORITATIVE for architecture laws, coupling taxonomy, style-selection triggers, and the anti-pattern catalog. Scale tiers stay single-sourced in `scale-technique-catalog.md`; failure scenarios in `scenario-stress-catalog.md`; performance constants in `.claude/skills/performance-review/references/performance-knowledge.md`. On any change here, grep `architecture-knowledge.md` and update every consuming skill's inline pointer.
>
> **MUST ATTENTION** every entry is a CONDITIONAL trade-off, never a rule. A pattern applied without its precondition IS an anti-pattern. Never output "we used pattern X" — output "we accepted cost C to buy property P, and here is the measurement proving P holds."
> **MUST ATTENTION** an anti-pattern match is a HYPOTHESIS, not a finding. Promote it ONLY with `file:line` / config / topology evidence PLUS the named quality attribute it damages — why: pattern-shape matching without evidence is the guess-as-fact failure the consuming review skills exist to prevent.
> **MUST ATTENTION** provenance is part of every load-bearing claim in **§3, §8, §9, §10** — the four highest-consequence sections (laws quoted as authority; data, consistency and messaging rules whose failure mode is data loss or corruption). **The ROW is the only scope unit.** A section banner declares the default basis for every row in that section; a row overrides it with an inline marker. Nothing smaller than a row and nothing between row and section carries a basis — a table COLUMN or CELL never does, so NEVER write a banner that assigns provenance per column: state the section default, then override per row. Each guarded section opens with a **default-basis banner**; a row whose basis differs from the section default carries an inline marker: `[textbook: <work>]` (a named, citable result) · `[vendor-doc: <product/config>]` (a documented product behaviour) · `[model-knowledge]` (asserted from model knowledge, no primary source read). A trailing `— VERIFY` means the claim has **not** been checked against a primary source — either none is named (`[model-knowledge] — VERIFY`) or the named source SHOULD adjudicate it but nobody has read it yet (`[textbook: … — VERIFY]`). Either way the claim is **unverified**. NEVER quote a `— VERIFY` row as settled fact in a finding; cite it as a hypothesis and check the named source **where one is named** — otherwise check the project's own docs or a primary source you locate. NEVER add a marker naming a source you did not actually read without `— VERIFY`. Sections outside §3/§8/§9/§10 — including the ~108 anti-pattern rows in §17 — carry NO markers by deliberate choice: per-row upkeep there costs more than it buys, and every entry is already a hypothesis requiring `file:line` evidence before promotion (see above). — why: an unmarked authoritative-voice rule is indistinguishable from a verified one, so a wrong row propagates into four skills' findings with borrowed authority.
>
> **MUST ATTENTION** the project's OWN reference docs and accepted ADRs OUTRANK this catalog on any conflict — this file supplies universal reasoning, the project supplies binding convention. NEVER flag a deviation from this catalog as a violation of the project — why: hardcoded universal names rot against real repos and break portability.

---

## 1. What Architecture Is — the reasoning frame

Architecture = the set of decisions **expensive to reverse**. Everything cheap to reverse is design; leave it to the implementers.

| Principle                                    | Statement                                              | Consequence for review/design                                                                          |
| -------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **First Law**                                | Everything is a trade-off                              | Any recommendation without a named cost is INCOMPLETE. "It's better" is not an architectural statement |
| **Second Law**                               | _Why_ outranks _how_                                   | A pattern with no recorded rationale becomes cargo cult in one team rotation → require an ADR          |
| **Primary goal = changeability**             | Keep cost-of-change flat as the system grows           | Judge by "what does the NEXT change cost?", never by elegance                                          |
| **Last responsible moment**                  | Defer until deferring costs more than deciding         | Not "decide late" — decide when information peaks and delay-cost starts rising                         |
| **Reversibility ranking**                    | Classify every decision one-way door vs two-way door   | One-way doors REQUIRE an ADR + review; two-way doors get a decision and momentum                       |
| **Accidental vs essential complexity**       | Essential = the problem; accidental = what we added    | Every layer, framework, service and indirection must be BOUGHT with a named quality attribute          |
| **Conceptual integrity**                     | One coherent idea-set beats many locally-optimal ones  | Two competing paradigms in one codebase cost more than either paradigm's weakness                      |
| **YAGNI vs option value**                    | Skip the feature; KEEP the seam                        | A boundary is cheap; a wrong abstraction is not                                                        |
| **Simplicity is the goal, not the fallback** | Simplest design meeting the QUANTIFIED attributes wins | Complexity justified only by a measured requirement, NEVER a hypothetical future                       |
| **Conservation of complexity (Tesler)**      | Complexity moves, it does not vanish                   | "We simplified the service" usually means it moved to the client / runbook / data layer — say WHERE    |

**One-way doors (ADR mandatory):** data model + primary-key strategy · tenancy model · consistency model per read path · sync-vs-async at a boundary · public API/event contract · service boundary lines · cloud-primitive lock-in · auth/identity model · data residency + retention.

**MUST ATTENTION** architecture cannot be derived from functional requirements — almost any structure satisfies them. **Quality attributes with numbers select the structure.** A proposal naming no quantified driving attributes is a guess.

---

## 2. Quality Attributes — quantify or it cannot drive a decision

**Scenario template — all SIX parts, none optional:** `[SOURCE: who/what triggers] [STIMULUS: the event] on [ARTIFACT: what is stimulated] under [ENVIRONMENT: the conditions] SHALL produce [RESPONSE] within [MEASURE: the acceptance threshold + instrument]`

BAD: "must be scalable." GOOD: "5,000 concurrent checkout sessions at 400 rps SHALL complete p99 < 800 ms, ≤0.1% errors, verified by the CI k6 profile."

**MUST ATTENTION** a scenario missing SOURCE or ARTIFACT is untestable — you cannot build a fitness function for "the system" under "load". Name the actor and the component or the scenario is a slogan. — why: unattributed scenarios cannot be assigned an owner, a test, or a budget, so they are never verified and silently degrade.

| Attribute                 | Metric                                                 | Architectural lever                                 |
| ------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| Performance               | p50/p95/p99 latency                                    | caching, locality, denormalization, async offload   |
| Scalability               | rps at fixed p99, cost/request                         | statelessness, partitioning, queues, replicas       |
| Elasticity                | time-to-capacity                                       | autoscaling, warm pools, queue-based load leveling  |
| Availability              | 9s, error budget                                       | redundancy, failover, cells, degradation            |
| Correctness under failure | data-loss events, duplicate rate                       | idempotency, outbox, consistency model              |
| Resilience                | MTTR, blast radius                                     | bulkheads, breakers, shedding                       |
| Durability                | RPO, annual-loss probability                           | replication factor, backups, WAL/fsync policy       |
| Recoverability            | RTO                                                    | DR topology, drilled restores                       |
| Security                  | time-to-detect, blast radius of one credential         | zero trust, least privilege, isolation              |
| Privacy/compliance        | residency, retention, auditability                     | data classification, regional partitioning, tenancy |
| Maintainability           | lead time, files touched per feature, coupling metrics | modularity, layering, contract stability            |
| Testability               | % behavior verifiable without a live env               | DI, ports/adapters, seams, contract tests           |
| Deployability             | deploy frequency, change-fail rate                     | pipeline, decoupled release, flags                  |
| Observability             | MTTD, % requests traced                                | structured logs, traces, SLIs                       |
| Operability               | toil hours, runbook coverage                           | health checks, admin surfaces, automation           |
| Portability               | lock-in surface count                                  | abstraction at boundaries ONLY                      |
| Interoperability          | contract stability, breakage rate                      | versioning, schema registry                         |
| Usability/a11y            | task success, WCAG level                               | frontend architecture, latency budget               |
| Cost efficiency           | $/request, $/tenant, $/MAU                             | right-sizing, tiering, caching, data lifecycle      |

**MUST ATTENTION** attributes CONFLICT — that conflict IS the architecture. Consistency↔availability · latency↔durability · flexibility↔simplicity · security↔usability · cost↔redundancy · performance↔modifiability. **Pick at most 3 DRIVING attributes and record which ones you are SACRIFICING.** A design claiming to maximize everything has decided nothing.

**Availability arithmetic.** Dependencies in a request path MULTIPLY: five 99.9% deps ⇒ ~99.5%. Redundancy in PARALLEL adds 9s ONLY when failure modes are truly independent — shared config, control plane, DNS and deploy pipeline are the usual hidden serial term.

| SLA     | Downtime/year | Downtime/month |
| ------- | ------------- | -------------- |
| 99%     | 3.65 d        | 7.2 h          |
| 99.9%   | 8.77 h        | 43.8 min       |
| 99.95%  | 4.38 h        | 21.9 min       |
| 99.99%  | 52.6 min      | 4.4 min        |
| 99.999% | 5.26 min      | 26 s           |

### Tactics — the MECHANISM inventory per attribute

A tactic is a design move that shifts ONE attribute. Patterns are bundles of tactics; **reason in tactics, not patterns** — why: a pattern imports costs you did not ask for, a tactic buys exactly the property you named.

| Attribute         | Detect / prevent                                                                                                                                                        | Recover / manage                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Availability**  | ping-echo, heartbeat, timeout, sanity check, exception detection, self-test                                                                                             | redundancy (active/passive/spare), rollback, retry, degradation, checkpoint-rollback, removal-from-service, transactions, predictive model, exception prevention |
| **Performance**   | bound queue lengths, throttle/limit event rate, prioritize events, reduce overhead, increase efficiency                                                                 | replicate, cache, introduce concurrency, schedule resources, maintain multiple copies of computation                                                             |
| **Modifiability** | reduce module size, increase cohesion (split by ONE actor), reduce coupling (encapsulate, use an intermediary, restrict dependency direction, abstract common services) | defer binding — config, plugins, feature flags, runtime registration                                                                                             |
| **Security**      | detect intrusion, detect service denial, verify message integrity, detect message delay                                                                                 | resist (authenticate, authorize, encrypt, limit exposure, separate entities), react (revoke access, lock, inform), recover (audit trail, restore)                |
| **Testability**   | specialized test interfaces, executable assertions, limit non-determinism                                                                                               | record/playback, abstract data sources, sandbox, dependency injection seams                                                                                      |
| **Usability**     | maintain task/user/system model                                                                                                                                         | support user initiative (cancel, undo, aggregate), support system initiative (progressive disclosure, optimistic UI)                                             |

**MUST ATTENTION** when a review finds an attribute unmet, prescribe the TACTIC, never the product. "Add a bulkhead per dependency pool" is a finding; "add Kubernetes" is a shopping list. — why: naming the tactic keeps the fix portable across stacks and makes the trade-off legible.

---

## 3. Laws & Theorems

> **Provenance — default basis for this section:** rows are `[textbook]` — MOST rows name a published, citable result (Conway, CAP, PACELC, Amdahl, Universal Scalability Law, Little's, Brooks, Goodhart, Lehman, Ousterhout, Postel, Parnas, the end-to-end argument, Two Generals / FLP, Tene on coordinated omission, Bronson et al. on metastable failure). **Exception — a row whose title hedges (`-ish`) or that synthesizes a rule from other laws is NOT `[textbook]`; mark it inline with the legend's `model-knowledge` basis (no primary source named)**, and NEVER cite such a row as a named authority. Within a `[textbook]` row the **Use** column is this catalog's _interpretation_ of the law for review and design, not a quotation from the source — **a named law is not a licence for its consequence column**, so quote the law and argue the consequence with `file:line` evidence. That caveat applies to every row and is NOT a per-column basis: provenance is declared per row only.

| Law                                      | Statement                                                                                                                                | Use                                                                                                                                                                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Conway**                               | System structure mirrors org communication structure                                                                                     | You cannot ship an architecture the org chart forbids — change the org (reverse Conway) or accept what you'll get                                                                                                                              |
| **CAP**                                  | Under a network PARTITION choose C or A                                                                                                  | Not "pick 2 of 3" — P is given. The choice is CP vs AP _during a partition_                                                                                                                                                                    |
| **PACELC**                               | Partition → A or C; **Else** → Latency or Consistency                                                                                    | The half that matters daily: sync replication costs latency on EVERY request, not only during failures                                                                                                                                         |
| **Amdahl**                               | speedup ≤ `1/(s + p/N)`                                                                                                                  | 5% serial work caps speedup at 20x. A global lock / shared sequence / single coordinator IS the serial section                                                                                                                                 |
| **Universal Scalability Law**            | `C(N)=N/(1+α(N−1)+βN(N−1))`                                                                                                              | Coherency term β makes throughput PEAK then DECLINE — explains "we added nodes and it got slower"                                                                                                                                              |
| **Little**                               | `L = λ × W`                                                                                                                              | Sizes every pool/thread/permit set. 400 rps × 250 ms = 100 in flight                                                                                                                                                                           |
| **Utilization–latency (M/M/1)**          | wait ≈ `S × ρ/(1−ρ)`                                                                                                                     | Knee ~70–80%. NEVER plan steady-state capacity above it                                                                                                                                                                                        |
| **Gall**                                 | Complex working systems evolved from simple working systems                                                                              | Start with the simplest foundation that can grow. For a new business application with one release boundary, a modular monolith is often a good hypothesis; workload, platform, and deployment constraints may justify another starting shape.  |
| **Hyrum**                                | Every observable behavior becomes a contract, bugs included                                                                              | Undocumented ordering/timing/error-text WILL be depended on. Make contracts explicit, hide the rest                                                                                                                                            |
| **Postel / tolerant reader**             | Conservative in what you send, liberal in what you accept                                                                                | Enables independent deploys; still validate at the trust boundary                                                                                                                                                                              |
| **Parnas / information hiding**          | Modularize around what is LIKELY TO CHANGE                                                                                               | The classic error: split by technical layer/step instead of by volatility                                                                                                                                                                      |
| **Dependency Inversion**                 | Policy must not depend on detail; both depend on abstractions                                                                            | The one rule behind hexagonal/clean/onion                                                                                                                                                                                                      |
| **Stable Dependencies**                  | Depend toward stability                                                                                                                  | A stable module must not depend on a volatile one                                                                                                                                                                                              |
| **Acyclic Dependencies**                 | No cycles in the module graph                                                                                                            | A cycle means the two modules are ONE deployable unit whatever the folders say                                                                                                                                                                 |
| **Common Closure**                       | What changes together belongs together                                                                                                   | Beats "what looks alike belongs together" — root of layer-first packaging pain                                                                                                                                                                 |
| **End-to-end argument**                  | Guarantees belong at the endpoints                                                                                                       | A lower layer may optimize but cannot supply a guarantee the endpoints skipped                                                                                                                                                                 |
| **Two Generals / FLP**                   | No reliable agreement over an unreliable channel                                                                                         | **Exactly-once DELIVERY is impossible** — achieve effectively-once via idempotency + dedup                                                                                                                                                     |
| **Tail amplification**                   | Fan-out to N hits a p99 with `1−0.99^N`                                                                                                  | 100-way fan-out ⇒ 63% of requests hit a p99; your backend p99 becomes the user's median                                                                                                                                                        |
| **Integration cost (Metcalfe-ish)**      | Point-to-point links grow `N(N−1)/2`                                                                                                     | 10 services ⇒ 45 possible couplings — why brokers/gateways/registries exist `[model-knowledge] — VERIFY`                                                                                                                                       |
| **Brooks**                               | Adding people to a late project makes it later                                                                                           | Communication overhead `O(N²)`; architecture's job is cutting the N that must talk                                                                                                                                                             |
| **Goodhart**                             | A measure made a target stops measuring                                                                                                  | Coverage %, effort points, LOC. Gate on invariants; measure DORA outcomes                                                                                                                                                                       |
| **Lehman**                               | Software must change or lose utility; complexity grows unless work reduces it                                                            | Refactoring is a maintenance REQUIREMENT, not a nicety                                                                                                                                                                                         |
| **Chesterton's Fence**                   | Don't remove what you don't understand                                                                                                   | Before deleting a guard/constant/retry/index — find why it exists                                                                                                                                                                              |
| **Leaky abstractions**                   | All non-trivial abstractions leak                                                                                                        | Pick abstractions whose leaks you tolerate; NEVER abstract away the failure model                                                                                                                                                              |
| **8 Fallacies of distributed computing** | The network is NOT reliable, latency-free, infinite-bandwidth, secure, topology-stable, single-admin, transport-cost-free or homogeneous | Every one of the 8 is a REVIEW QUESTION. A design that reads as if any fallacy were true has an unhandled failure mode, not a simpler design                                                                                                   |
| **Quorum intersection**                  | `R + W > N` guarantees a read set overlaps the last write set                                                                            | The knob for tunable consistency. `W=1` buys write availability and loses read-your-writes; sloppy quorum (hinted handoff) trades consistency for availability again                                                                           |
| **Fencing / split-brain**                | A lease alone does NOT prevent two live leaders                                                                                          | A paused (GC/VM-stall) leader wakes believing it still holds the lock. **Every lock-protected write MUST carry a monotonically increasing fencing token the storage layer rejects when stale** — otherwise the lock is decorative              |
| **Metastable failure**                   | A system can stay in a degraded high-load state AFTER the trigger is gone                                                                | Sustained by a self-feeding loop: retries, cache misses, queue backlog, GC pressure. Load removal alone does not recover it — **you need a shed/drain/flush escape hatch**, and it explains "the spike ended an hour ago and we're still down" |
| **Coordinated omission**                 | A load generator that waits for slow responses stops issuing requests, deleting the worst latencies from the sample                      | Your p99 is a LIE unless the harness issues on a fixed schedule and counts the missed sends. **NEVER accept a latency number without asking how the load was generated**                                                                       |
| **CAP-aware clock rule**                 | Wall clocks in a distributed system disagree without bound                                                                               | NEVER order distributed events by wall-clock timestamp. Use per-entity versions/sequences, logical/Lamport clocks, vector clocks, HLC, or a bounded-uncertainty clock (TrueTime-class) `[model-knowledge] — VERIFY`                            |
| **Ousterhout (deep modules)**            | Value = functionality behind the interface ÷ interface size                                                                              | The best module hides a LOT behind a small interface. Many tiny classes each exposing everything ("classitis") ADDS complexity while looking modular                                                                                           |

---

## 4. Coupling & Cohesion — the core currency

### Coupling taxonomy (worst → best)

| Kind                   | Meaning                                                        | Verdict                                                 |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| Content / pathological | Reaching into another module's internals or DB tables          | FORBIDDEN — this is the shared-database defect          |
| Common / global        | Shared mutable global state, shared schema, shared config blob | FORBIDDEN at service boundaries                         |
| Control                | Caller passes a flag deciding callee's logic                   | Smell — caller knows too much; split the operation      |
| Stamp                  | Passing a whole object when 2 fields are needed                | Minor; hurts contract stability + test setup            |
| Temporal               | A must run before B, enforced only by convention               | Dangerous — invisible ordering; make explicit or remove |
| Data                   | Parameters/messages carry only what's needed                   | Acceptable target                                       |
| Message                | Interaction only via a published contract/event                | BEST for service boundaries                             |

### The FOUR dimensions — judge each SEPARATELY

1. **Code (afferent/efferent)** — who imports whom. Cycles ⇒ one unit.
2. **Temporal (runtime)** — must both be up at once? Sync chains create AVAILABILITY coupling: your SLO becomes the product of the chain's.
3. **Semantic (contract)** — does a change in their MEANING force a change in mine? Hardest to remove; shared DB schemas maximize it.
4. **Operational (deployment)** — must these ship together? If yes they ARE one service; splitting the repo added network calls and changed nothing.

**MUST ATTENTION — distributed monolith** = LOW code coupling + HIGH temporal + semantic + deployment coupling. It pays every distributed cost and buys none of the benefits; it is the single most common and most expensive modern architecture failure. **Detection signature:** services that must release together · a shared database or shared entity/domain library · a request synchronously traversing ≥4 services · one team blocked by another's deploy · "we roll back all services together."

### Cohesion (high → low)

Functional (one well-defined job — TARGET) → sequential → communicational → procedural → temporal (`StartupUtils`) → logical (`Helpers`, `Managers`) → coincidental (`Common`, `Shared`, `Misc` — WORST).

**Test:** "how many DIFFERENT reasons would make me edit this file?" More than one actor/reason ⇒ SRP violation ⇒ split.

### Connascence — the finer scalpel

Strategy: **reduce degree, improve locality, weaken strength.**

- **Static (visible in code):** Name → Type → Meaning (magic values) → Position (argument order) → Algorithm (both sides implement the same hash/format).
- **Dynamic (runtime-only — far worse):** Execution order → Timing → **Value** (two values must change together) → Identity (both must reference the same instance).

**Rate every instance on THREE axes:** **strength** (how mechanical the refactor is — Name is trivial, Algorithm and Identity are not) · **locality** (how far apart the two ends are — same function ≪ same module ≪ across a service boundary) · **degree** (how many places participate — 2 is a fix, 40 is a migration).

**The three rules, in priority order:** (1) minimize overall connascence · (2) minimize connascence that CROSSES a boundary · (3) MAXIMIZE connascence inside a boundary — that is exactly what cohesion means.

**MUST ATTENTION** connascence of **Value** or **Timing** ACROSS a service boundary is a BOUNDARY ERROR, not a bug to patch. If two services must change a value together atomically they are one transactional boundary — merge them, or make the invariant eventual ON PURPOSE with a designed compensating action.

**MUST ATTENTION** the same connascence at different locality is a different severity — connascence of Meaning inside one function is a nit, the same connascence across two services is a release-coordination defect. NEVER grade connascence without stating its locality and degree. — why: severity graded on strength alone over-reports local nits and under-reports the cross-boundary ones that actually cost releases.

### Module design — depth, not count

| Principle                                              | Statement                                                                                                                                                           | Failure it prevents                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Deep over shallow**                                  | Maximize functionality hidden ÷ interface surface. A module whose interface is nearly as large as its implementation earns nothing                                  | "Classitis" — dozens of one-method classes, each a new thing to learn, total complexity UP            |
| **No pass-through methods/layers**                     | A method or layer that only forwards to the next with no added responsibility is pure interface cost                                                                | The sinkhole layer; the wrapper nobody can delete                                                     |
| **Pull complexity DOWNWARD**                           | When complexity is unavoidable, the module absorbs it so N callers don't each handle it                                                                             | N copies of the same null-check/retry/normalization at every call site                                |
| **Define errors OUT OF EXISTENCE**                     | Redesign the API so the error case cannot occur (`delete` on a missing key is a no-op; `substring` clamps) rather than adding an exception every caller must handle | Error-handling code that outweighs the feature and is wrong in 3 of 7 call sites                      |
| **Design it TWICE**                                    | For any hard-to-reverse decision produce ≥2 MATERIALLY different designs, list what each sacrifices, then choose                                                    | Committing to the first idea that occurred to you — the most common architecture failure with no name |
| **Write the module's SECRET in one sentence** (Parnas) | Decompose around what is LIKELY TO CHANGE, hiding each volatility behind a stable interface                                                                         | Decomposition by processing STEP, which makes every change cross every boundary                       |
| **Comments/ADR capture what code cannot**              | Record the WHY and the rejected alternative at the boundary                                                                                                         | Boundary violated in 3 years because nobody remembers why it exists                                   |

### SOLID — with the limits that make it usable

- **SRP** = one reason to change = **one ACTOR** who requests changes. NOT "one method" and NOT "small". Two actors in one class is the violation; splitting by size is cargo cult.
- **OCP** — extensible along a chosen AXIS. **The axis is a BET.** Guessing wrong buys indirection with no payoff, so choose it from evidence of real variation and a shared reason to change. Repeated examples inform the decision; no occurrence count alone selects the axis or justifies an abstraction.
- **LSP** — the contract includes preconditions, postconditions, invariants, thrown errors and performance class. A subtype that "works but throws differently" already violates it.
- **ISP** — the distributed form: NEVER make a client depend on a schema/endpoint/event field it does not use, or their change becomes your change (Hyrum).
- **DIP** — inversion is only real when **the interface lives in the DOMAIN/policy package** and the adapter package depends inward. An interface declared beside its single implementation in the infrastructure package is a naming convention, not dependency inversion.

### DRY applies to KNOWLEDGE, not to text

**MUST ATTENTION** duplication is CHEAPER than the wrong abstraction. Two code paths that look alike but change for DIFFERENT reasons are NOT duplication — merging them creates a shared module with two actors, and every future change to one breaks the other. For repeated-code extraction, compare the measured cost of duplication with the ownership, coupling, and indirection a shared owner adds. Repetition is evidence to evaluate, not a prerequisite or threshold; extract when a shared reason to change, real consumers, and lower total change cost are supported by evidence. A boundary port is a separate decision: require an evidenced ownership or substitution boundary and name the quality attribute or change cost it buys, even with one implementation. Extracting a wrong abstraction is far harder to undo than extracting a right one is to delay. — why: a premature abstraction is defended by everyone who now depends on it, so the cost compounds while duplication's cost stays linear.

---

## 5. Architecture Styles — selection matrix

| Style                            | Buys                                                                                      | Costs                                                                                                           | Choose when                                                                                                                                                  | Avoid when                                                                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layered / n-tier                 | Simplicity, universal familiarity                                                         | Change ripples; sinkhole pass-through layers; weak domain modeling                                              | Simple CRUD, small team, short horizon                                                                                                                       | Complex rules; independent scaling                                                                                                                |
| **Modular monolith**             | Single deploy + real internal boundaries; near-zero refactor cost                         | One runtime = one blast radius; boundaries can rot without ownership and suitable enforcement                   | New business application with one release boundary and no evidenced need to split deployment, scaling, compliance, availability, or runtime                  | Workload/platform requires independently operated capabilities; an established brownfield architecture already has different justified boundaries |
| Modular core + selected services | Keeps cohesive capabilities together while isolating specific deployment or scaling needs | Multiple operational models and distributed data/consistency costs                                              | A measured hotspot, ownership, compliance, runtime, availability, or fault-isolation boundary                                                                | No independent boundary or operational owner is established                                                                                       |
| Service-based architecture       | Independent deploys for a small set of cohesive capabilities                              | Shared-data pull, network failure modes, and operational overhead                                               | The domain and organization support independently owned/deployed capabilities                                                                                | Boundaries are unclear or services must routinely change/deploy together                                                                          |
| Microservices                    | Independent deploy/scale/technology per capability; team autonomy; fault isolation        | Distributed data, eventual consistency, network failure modes, tracing, substantial platform and operating cost | The workload, compliance, availability, runtime, or independent-ownership needs require multiple service boundaries and the operating model can support them | Distribution is speculative, no ownership/recovery model exists, or the system still needs one coordinated release                                |
| Event-driven (broker/mediator)   | Temporal decoupling, spike absorption, extensibility, replay                              | Eventual consistency, no cheap "current state", hard debugging, ordering + duplicates                           | Async workflows, integration, fan-out, audit/replay                                                                                                          | Request/response with a user awaiting a strict answer                                                                                             |
| CQRS (as a style)                | Independent read/write models + scaling                                                   | Two models, sync lag, more code                                                                                 | Read:write very asymmetric; query shapes ≠ write shapes                                                                                                      | Simple CRUD — classic over-engineering trap                                                                                                       |
| Event sourcing                   | Full audit, temporal queries, rebuildable projections                                     | Steep curve, event schema evolution FOREVER, snapshots, GDPR-erasure conflict                                   | Audit/history is a DOMAIN requirement (ledger, compliance)                                                                                                   | You just want a change log → audit table                                                                                                          |
| Hexagonal / ports & adapters     | Domain isolated from I/O; excellent testability                                           | Extra indirection, mapping code                                                                                 | Non-trivial business logic, multiple entry points                                                                                                            | Thin CRUD forwarding                                                                                                                              |
| Microkernel / plugin             | Extend without touching core; per-customer variation                                      | Plugin contract governance + versioning                                                                         | Product platforms, rules engines                                                                                                                             | Uniform requirements                                                                                                                              |
| Pipeline / pipes & filters       | Composable, restartable stages                                                            | Latency accumulates; poor cross-stage state                                                                     | ETL, media, logs, compilers                                                                                                                                  | Interactive request paths                                                                                                                         |
| Space-based / in-memory grid     | Removes DB bottleneck; extreme elastic throughput                                         | Data-collision risk, complex caching + eventual persistence                                                     | Very high concurrency + spiky (ticketing, betting, trading)                                                                                                  | Strong consistency at scale                                                                                                                       |
| Serverless / FaaS                | Scale-to-zero, no server ops, per-use cost                                                | Cold starts, execution limits, lock-in, hard local dev                                                          | Bursty/irregular, glue, event handlers                                                                                                                       | Steady high throughput (cost inversion), long jobs, latency-critical                                                                              |
| Actor model                      | Per-entity single-threaded consistency + massive concurrency                              | New mental model, supervision, state placement                                                                  | Stateful entities at scale (IoT, game, session state)                                                                                                        | Simple stateless request handling                                                                                                                 |
| Cell-based                       | Bounded blast radius; independent full stacks                                             | Routing layer, N× ops surface, cross-cell data                                                                  | High availability targets, multi-tenant noisy-neighbor control                                                                                               | Small system                                                                                                                                      |
| Data mesh                        | Domain-owned data products; decentralizes analytics bottleneck                            | Governance + platform investment; org change                                                                    | Large orgs where the central data team is the bottleneck                                                                                                     | Small orgs — pure overhead                                                                                                                        |

### Selection procedure (MANDATORY order)

1. Quantify the top 3 driving quality attributes (§2) and name what is sacrificed.
2. ELIMINATE styles that cannot meet them.
3. Among survivors take the **SIMPLEST**.
4. Record an ADR naming the rejected alternative AND the measurable trigger that would revisit it.

Styles can compose when each solves a demonstrated concern. For example, a modular application can use asynchronous events at selected boundaries. Do not prescribe a fixed number of services or a stock combination.

**Greenfield candidate, when it fits:** A modular monolith is one option for a new business application with one release boundary and no measured need for independent deployment, scaling, compliance, availability, or runtime. Select it only when its boundaries fit the domain and operating constraints. Brownfield work follows its existing architecture and accepted ADRs unless a requirement justifies a reviewed migration; an established service platform or workload constraint may justify distributed components from the start.

| Evidence that may justify a separate deployable boundary                                           | Weak justification by itself                    |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Repeated, measured scaling or resource profiles that materially diverge                            | "The codebase feels big"                        |
| A distinct compliance, data-residency, availability, or fault-isolation boundary                   | "Microservices are best practice"               |
| Independent ownership/release is blocked by a shared deploy and the coordination cost is evidenced | A resume, conference talk, or framework support |
| A genuinely different runtime or platform requirement                                              | A new team was hired                            |
| A bounded capability has an explicit contract and can tolerate its data/consistency boundary       | The framework supports it                       |

---

## 6. Domain boundaries & DDD options

Use DDD strategic and tactical patterns when domain complexity, ownership, and change evidence justify them. Otherwise, keep the model and boundaries as simple as the project's invariants and change paths allow; these patterns are options, not mandatory layers.

### Strategic (when DDD boundary modeling fits)

- **Ubiquitous language** — one term, one meaning, INSIDE one context. If "Order" means two things that is TWO contexts, not one confused model.
- **Bounded context** — the boundary within which a model is consistent. **This, not the entity, is the unit of service extraction.** An entity appearing in three contexts should be three models sharing an ID, never one shared class.
- **Core / supporting / generic subdomain** — spend the best design effort on the CORE. Generic subdomains (auth, billing, notifications, search) → **buy or adopt**; building them is a top source of wasted architecture budget.

### Context-mapping patterns

| Pattern                                | Meaning                                            | Use / risk                                                                                                                           |
| -------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Shared kernel                          | Two contexts share a small model                   | Only with one team or tight coordination; creeps into a distributed monolith                                                         |
| Customer / supplier                    | Downstream needs influence upstream                | Healthy WITH real negotiation                                                                                                        |
| Conformist                             | Downstream accepts upstream's model as-is          | Cheap; imports upstream's concepts AND its churn                                                                                     |
| **Anticorruption layer (ACL)**         | Translate an external/legacy model at the boundary | Use when an external or legacy model would otherwise leak into the domain; a thin, stable integration may need only a direct adapter |
| Open host service / published language | Stable public protocol for many consumers          | For widely-consumed capabilities                                                                                                     |
| Separate ways                          | No integration; duplicate deliberately             | Often CORRECT — integration cost can exceed duplication cost                                                                         |
| Big ball of mud                        | Named honestly so it can be quarantined            | Wrap with an ACL; NEVER extend                                                                                                       |

### Tactical (when the project uses DDD tactical modeling)

- **Aggregate = the TRANSACTIONAL consistency boundary.** One aggregate per transaction · reference other aggregates **by ID only** · invariants enforced inside the root · keep them SMALL (large aggregates ⇒ contention + lock churn) · cross-aggregate consistency is EVENTUAL via domain events.
- **Value objects** are under-used — `Money`, `EmailAddress`, `DateRange`, `Quantity` prevent whole bug classes.
- **Domain event** = a business fact, past tense (`OrderPlaced`). `OrderRowUpdated` is not a domain event.
- **Repository** — when repositories are part of the chosen persistence boundary, prefer aggregate/query contracts over a generic wrapper per table. Do not add one when the ORM or data-access layer already provides the needed boundary.

**MUST ATTENTION** the most consequential decomposition error is drawing boundaries around **nouns/data (`UserService`, `ProductService`)** instead of **capabilities/behaviors (`Checkout`, `Fulfilment`, `Pricing`)**. Entity-per-service GUARANTEES every real use case must synchronously traverse many services — a distributed monolith produced by design. Boundary heuristics: what changes together ships together · what must be transactionally consistent stays together · different scale/availability/compliance profile splits · a boundary needing chatty sync coordination is in the WRONG place.

---

## 7. Layering & internal patterns

When Clean / onion / hexagonal architecture is selected, its central rule is **dependencies point inward toward policy/domain code; policy should not depend on volatile infrastructure**. Prefer architecture tests or other mechanical checks when the stack supports them; use project documentation and review checks where automated enforcement is unavailable or too costly.

| Layer          | Belongs here                                                    | **MUST NEVER contain**                                   |
| -------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| Domain         | Business rules, invariants, value objects, domain events        | ORM attributes, HTTP types, SQL, framework imports, DTOs |
| Application    | Use-case orchestration, transaction scope, port interfaces      | SQL, HTTP client detail, UI concerns                     |
| Infrastructure | Adapters implementing ports, mapping, retries                   | Business rules, domain-invariant validation              |
| Presentation   | Serialization, auth wiring, input-shape validation, view models | Business rules, direct persistence access                |

| Pattern                       | Purpose                                   | Trap                                                                                                                                                                                          |
| ----------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transaction script            | One procedure per use case                | Degrades into a God-service as rules grow                                                                                                                                                     |
| Domain model                  | Behavior lives with data                  | Degenerates into anemic model without discipline                                                                                                                                              |
| **Anemic domain model**       | Data bags + service-layer logic           | **ANTI-PATTERN when the domain is complex** — logic scatters, invariants unenforceable. Acceptable ONLY for genuinely thin CRUD, and say so explicitly                                        |
| CQS / CQRS                    | Separate read and write paths             | Apply method-level separation when it clarifies intent or side effects; introduce separate storage/read models only when query/write needs justify their synchronization and maintenance cost |
| Mediator / in-process bus     | Decouple caller from handler              | Over-use makes flow untraceable — keep for cross-module edges, not intra-module calls                                                                                                         |
| Unit of Work                  | One atomic commit per use case            | Leaking it into presentation loses the transaction boundary                                                                                                                                   |
| Specification                 | Composable testable predicates            | Building a query DSL nobody understands                                                                                                                                                       |
| Result/Either over exceptions | Expected failures become explicit types   | Mixing both idioms inconsistently is worse than either                                                                                                                                        |
| **Outbox**                    | Atomic state change + event publication   | Use when durable delivery must agree with a database transaction; see §9. A local/non-durable notification may have a simpler contract                                                        |
| **Idempotency key**           | Safe retries for mutations                | Use when callers or intermediaries may retry a non-idempotent operation; define key scope, result behavior, and retention for the actual retry contract                                       |
| Feature toggle                | Decouple deploy from release              | Flags without an expiry date become permanent branching complexity                                                                                                                            |
| Strangler fig                 | Incremental legacy replacement            | Needs a real facade + traffic control                                                                                                                                                         |
| Branch by abstraction         | Big internal change without a long branch | The abstraction must be honest, not a shim                                                                                                                                                    |
| Sidecar / ambassador          | Cross-cutting out of app code             | Extra hop + per-pod resource cost                                                                                                                                                             |
| Saga                          | Multi-service business transaction        | Compensations are BUSINESS decisions, not technical rollbacks                                                                                                                                 |

**Most-abused GoF patterns:** Singleton (global mutable state, untestable, hidden coupling → prefer a single DI registration) · Service Locator (hides dependencies, defeats compile-time and test-time checks) · Template Method (fragile base class → prefer Strategy) · Decorator stacks so deep behavior and stack traces become unreadable.

**MUST ATTENTION** patterns are a VOCABULARY for a solution you already need, never a menu to shop from. Applying patterns to demonstrate knowledge produces the **Gas Factory** anti-pattern. The right number of patterns is the SMALLEST number removing a DEMONSTRATED pain.

---

## 8. Data architecture

> **Provenance — default basis for this section:** `[model-knowledge] — VERIFY` unless a row carries its own marker. These rules govern the MOST irreversible area in the catalog, so a wrong row here is the expensive kind: check the named source before quoting any row as settled, and prefer the project's own reference docs / ADRs where they speak.

Data outlives every service, framework and team — the MOST irreversible area. Treat every data decision as a one-way door until proven otherwise.

1. **Name the owner of each mutable business dataset.** At an independently owned service boundary, prefer one writer and explicit contracts for other readers/writers. Inside a modular application, modules may share a physical database when ownership and access rules remain clear.
2. **Choose a persistence boundary that matches the deployment and change boundary.** Independently operated services should own their data contract and avoid relying on another service's private tables. In a modular application, logical module ownership may be enough; separate schemas or databases only when their isolation benefit exceeds operational and query costs.
3. **Do not bypass an owned boundary.** Across independently deployed services, use an explicit API/event/data contract instead of mutating another service's private tables. Within one application, direct calls or shared persistence can be valid when allowed by the declared module architecture; keep cross-module writes and hidden schema dependencies visible.
4. **Choose the store by ACCESS PATTERN, not familiarity** (Golden Hammer): relational (relations, transactions, flexible queries — a strong default when those matter) · document (aggregate-shaped reads) · key-value (lookup, cache, sessions) · wide-column (high-volume writes with known query shapes) · graph (traversal-heavy) · time-series (append + rollups) · search (relevance, facets) · vector (semantic/ANN) · columnar/OLAP (aggregation scans) · object storage (blobs, cheap durable bytes). Validate the choice against workload, consistency, operations, and team capability.
5. **Polyglot persistence costs PER STORE**: ops, backup, monitoring, expertise, and transactional impossibility across stores. Each extra store needs its own justification.
6. **Separate OLTP from OLAP.** Analytics on the transactional primary is a top production-incident cause → replica, CDC, or warehouse.
7. **For rolling or overlapping deployments, prefer expand–contract migrations** (add compatible shape → backfill → switch reads/writes → remove old shape after old code is gone). Keep migrations safe to retry and non-blocking on large tables. A coordinated maintenance window can use a simpler migration when downtime and rollback constraints allow it.
8. **Design data lifecycle UP FRONT**: classification (PII/PHI/PCI/public), retention, archival tiering, deletion (GDPR/CCPA erasure), residency. Retrofitting deletion into an event-sourced or heavily-denormalized system is brutally expensive.
9. **Sharding/partitioning:** key must be uniformly distributed AND query-aligned. Time-based ⇒ hot latest partition; tenant-based ⇒ whale tenants become hot shards. Plan resharding (consistent hashing / virtual buckets) BEFORE needing it.
10. **Keys:** sequential ints leak volume and are enumerable; UUIDv4 destroys index locality on write; **prefer time-ordered IDs (UUIDv7/ULID/Snowflake)**. NEVER expose an internal sequential PK as a public identifier.
11. **Denormalization is a PURCHASE** — faster reads paid for with write amplification and an ongoing consistency obligation. Name the mechanism keeping copies correct.
12. **Backups are a hypothesis until a restore is DRILLED.** Measure actual RTO on a schedule.

**Analytical vocabulary:** warehouse (schema-on-write, curated) · lake (schema-on-read, cheap raw — becomes a **data swamp** without catalog + governance) · lakehouse (Iceberg/Delta/Hudi: ACID + time travel over object storage) · **medallion** bronze→silver→gold · ELT over ETL for cloud warehouses · CDC as preferred ingestion · data contracts + catalog + lineage or nobody trusts the numbers.

### Isolation levels — the correctness gap nobody reads

**MUST ATTENTION** "we use transactions" says NOTHING about correctness until the ISOLATION LEVEL is named. Most engines default to Read Committed, which permits the two anomalies that actually corrupt business data.

| Level                              | Still permits                                                                                                                          | Architectural consequence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Read Uncommitted                   | dirty reads                                                                                                                            | Never acceptable for business data                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Read Committed** (usual default) | non-repeatable read, phantom, **lost update**, **write skew**                                                                          | Two concurrent "check-then-act" transactions BOTH pass their check and both write. The classic on-call bug                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Repeatable Read / Snapshot         | phantom (engine-dependent), **write skew** — plus **lost update** on any engine whose "Repeatable Read" is NOT true snapshot isolation | **Name the engine, not the level.** Canonical snapshot isolation (first-committer-wins) DOES prevent lost update and does NOT prevent write skew — each transaction reads a valid snapshot and their combination violates the invariant. But `REPEATABLE READ` is a label, not a guarantee: engines that resolve a write conflict by re-reading the latest row instead of aborting the second committer still permit lost update at this level. NEVER reason from the level name alone `[textbook: Berenson et al., "A Critique of ANSI SQL Isolation Levels" — VERIFY]` |
| Serializable (SSI or 2PL)          | nothing                                                                                                                                | Correct by construction; pay with aborts/retries (SSI) or blocking (2PL) — so the app MUST handle serialization failures                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

**Fix a check-then-act invariant one of FOUR ways — pick deliberately:** (1) push it into a DB CONSTRAINT (unique/check/exclusion — the cheapest and most durable) · (2) `SELECT … FOR UPDATE` on the row(s) the invariant reads, including a materializing row when the conflict is over a _range_ · (3) Serializable isolation + a retry loop · (4) make it a single atomic conditional write (`UPDATE … WHERE version = n` / `WHERE stock > 0`).

**MUST ATTENTION** an invariant spanning ROWS THAT DO NOT YET EXIST (no double-booking, no overlapping shift, at most N per tenant) cannot be protected by row locks — it needs a constraint, an exclusion index, a materializing lock row, or Serializable. NEVER accept "we check before inserting" as protection. — why: the phantom case passes every single-user test and fails only under the concurrency that production supplies.

### Storage-engine choice is an architectural decision

|              | B-Tree (most RDBMS)                                        | LSM-Tree (Cassandra/RocksDB/Scylla-class)                           |
| ------------ | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| Writes       | in-place, higher write amplification per random write      | sequential appends + compaction — much higher write throughput      |
| Reads        | predictable, one path                                      | may touch several levels — mitigated by bloom filters + block cache |
| Space        | fragmentation                                              | compaction debt; **space amplification** during compaction          |
| Tail latency | steadier                                                   | compaction stalls show up in p99                                    |
| Choose when  | mixed read/write, ad-hoc queries, strong secondary indexes | write-heavy ingest with known query shapes                          |

**Also non-negotiable at the data layer:** **WAL + fsync policy IS the durability/latency knob** — group commit and `fsync=off`-style settings trade real data loss for throughput, so the RPO must name the setting · **leftmost-prefix rule** — a composite index `(a,b,c)` serves `a`, `a,b`, `a,b,c`, and NOT `b` alone — barring an engine-specific **index skip scan** on a low-cardinality leading column (MySQL 8.0.13+, Oracle), which is precisely why you confirm against the PLAN rather than the rule; and every index makes writes slower, so index-per-query-shape has a cost ceiling · a **covering** index removes the row fetch entirely · low-selectivity predicates will be ignored by the planner no matter how many indexes exist · **check the query PLAN, not the query text** — the planner's estimate vs actual row counts is where the answer is · connection pool size is a Little's-Law calculation and an unpooled service DOSes its own database.

---

## 9. Consistency & distributed transactions

> **Provenance — default basis for this section:** `[model-knowledge] — VERIFY` unless a row carries its own marker. Isolation-level and consistency-model claims are engine-specific and label-unreliable (`REPEATABLE READ` names a level, not a guarantee) — **name the engine and read its manual** before quoting any row here in a finding.

### Models (strong → weak)

`Linearizable` → `Sequential` → `Causal` (often the sweet spot) → session guarantees (`read-your-writes`, `monotonic reads/writes`) → `Eventual`.

**MUST ATTENTION** most user-perceived "consistency bugs" are missing **SESSION GUARANTEES**, not missing linearizability. "I saved it and it disappeared" = read-your-writes violated by a lagging replica. Fix = sticky reads / read-from-primary-after-write / version tokens — NOT global strong consistency.

**Choosing:** money movement, uniqueness constraints, inventory decrement, auth state ⇒ **strong within ONE aggregate/DB transaction**. Cross-aggregate / cross-service / cross-region ⇒ **eventual, deliberately**, with a business-visible reconciliation + compensation story. **Write down the STALENESS BUDGET** ("search index may lag ≤5 s") and monitor it as an SLI — unbounded unmeasured lag is the real defect.

| Mechanism                         | Guarantee                             | Cost                                                            | Verdict                                                                       |
| --------------------------------- | ------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Local ACID transaction            | Full                                  | None                                                            | ALWAYS prefer — keep the invariant inside one aggregate/DB if at all possible |
| 2PC / XA                          | Atomic                                | Blocking on coordinator failure; poor availability + throughput | AVOID in web-scale distributed systems                                        |
| Saga — orchestrated               | Eventual + compensation               | Central coordinator (a coupling point)                          | Good default for complex flows needing visibility                             |
| Saga — choreographed              | Eventual + compensation               | Logic spread out; flow hard to see                              | Fine ≤4 steps; untraceable beyond                                             |
| **Outbox + idempotent consumers** | Effectively-once propagation          | One table + a relay                                             | **MANDATORY** for any write-then-publish                                      |
| CDC / log tailing                 | Effectively-once propagation          | Couples consumers to internal schema unless mapped              | Great for integration WITH a mapping layer                                    |
| Try-Confirm/Cancel (reservation)  | Business-level atomicity              | Reservation state + expiry                                      | Best for inventory/seats/funds holds                                          |
| Escrow / reservation counters     | High-throughput conditional decrement | Extra model                                                     | Ticketing, stock                                                              |

**Sagas are NOT rollbacks.** A compensation is a NEW business fact (`RefundIssued`, `ShipmentCancelled`), often with real-world side effects that cannot be undone (email sent, package shipped). Design the compensating action as a PRODUCT decision, and design for the intermediate state being VISIBLE to users.

### Coordination primitives — what you are actually relying on

| Primitive                                      | What it really guarantees                                                                                                                                | The trap that bites                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Replication**                                | leader-follower (one writer, lag on reads) · multi-leader (write availability, **conflicts you must resolve**) · leaderless/quorum (tunable via `R+W>N`) | Multi-leader with no named conflict-resolution rule is silent data loss, not high availability                                                                                                                                                                                                                                                                                                               |
| **Quorum**                                     | a read set intersects the last write set when `R+W>N`                                                                                                    | Sloppy quorum / hinted handoff silently drops that guarantee back to eventual                                                                                                                                                                                                                                                                                                                                |
| **Consensus (Raft/Paxos)**                     | agreement on an ORDERED LOG among a majority                                                                                                             | Quorum is `⌊N/2⌋+1`, so fault tolerance is `⌈N/2⌉−1`: **an even-sized cluster tolerates no more failures than the odd size below it** (4 nodes tolerate 1, same as 3) while paying an extra node and a larger quorum — and **2 nodes tolerate ZERO**, strictly worse than 1. Critique the SIZING, never claim an even cluster cannot make progress. Consensus is also expensive, so keep it OFF the hot path |
| **Lease / distributed lock**                   | mutual exclusion _while the holder is alive and honest_                                                                                                  | A GC pause or VM stall makes a dead holder believe it is alive ⇒ split brain. **Fencing token is MANDATORY, not optional**                                                                                                                                                                                                                                                                                   |
| **Failure detection** (heartbeat, phi-accrual) | a SUSPICION level, never a fact                                                                                                                          | You cannot distinguish slow from dead. Aggressive timeouts cause false failovers; lax ones extend outages. Both are choices, so state which you made                                                                                                                                                                                                                                                         |
| **Clocks**                                     | monotonic clock measures elapsed time; wall clock does not                                                                                               | NEVER order distributed events, compute lock expiry, or resolve conflicts by wall clock. Use versions/sequences, Lamport or vector clocks, HLC, or a bounded-uncertainty clock                                                                                                                                                                                                                               |
| **Membership** (gossip / registry)             | eventually-converged view of who is up                                                                                                                   | Two halves of a partition each believe they are the cluster — decide the quorum/fencing story before scaling out                                                                                                                                                                                                                                                                                             |

**MUST ATTENTION** ANY design step reading "we take a distributed lock" MUST also name the fencing token, the lease duration, and what happens when the lease expires mid-operation. NEVER treat a distributed lock as equivalent to a local mutex. — why: an unfenced lock fails exactly once — under the GC pause, at peak, writing corrupted state — and it looks correct in every test.

**Idempotency — the load-bearing requirement of every async system.** Exactly-once delivery is impossible ⇒ **every consumer and every mutating endpoint MUST be idempotent.** Techniques: natural idempotency (`SET status='paid'` vs `balance += x`) · client idempotency key + stored response · dedup table on message ID with TTL · optimistic concurrency via version/ETag · conditional writes (`WHERE version = n`) · monotonic state machines ignoring backward transitions. Also handle **out-of-order** and **duplicate** arrival explicitly — ordering is guaranteed only per partition key, if at all.

---

## 10. Communication, APIs & messaging

> **Provenance — default basis for this section:** `[model-knowledge] — VERIFY` unless a row carries its own marker. Broker/protocol rows describe **product-specific configuration behaviour** that changes across versions and vendors — treat every durability, ordering, retention and delivery-semantics claim as a hypothesis to check against that product's docs, never as a portable law.

### Sync vs async — the highest-leverage integration decision

|              | Synchronous                                            | Asynchronous                                     |
| ------------ | ------------------------------------------------------ | ------------------------------------------------ |
| Availability | MULTIPLIES down the chain                              | Decoupled; broker becomes the shared dependency  |
| Latency      | Sum of the chain                                       | Fast ack, eventual completion                    |
| Complexity   | Simple to reason about                                 | Duplicates, ordering, idempotency, observability |
| Backpressure | Timeouts + shedding                                    | Natural queueing (BOUND it)                      |
| Use when     | The caller genuinely cannot proceed without the answer | Notification, fan-out, work completable later    |

**Rule:** synchronous for QUERIES a user awaits; asynchronous for EFFECTS. A sync chain deeper than 2–3 hops is an availability + latency defect — flatten, cache, or make it an event.

| API style       | Best for                                                              | Weak at                                                                                                                   |
| --------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| REST/HTTP+JSON  | Public APIs, broad compat, HTTP caching, resource CRUD                | Chatty for graph-shaped needs; over/under-fetching                                                                        |
| GraphQL         | Client-driven queries, aggregating sources, bandwidth-limited clients | Caching, rate limiting, cost control (needs depth/complexity limits + persisted queries), resolver N+1 (needs dataloader) |
| gRPC/Protobuf   | Low-latency internal RPC, streaming, strong contracts, codegen        | Browser needs a proxy; less human-debuggable                                                                              |
| Webhooks        | Push to third parties                                                 | Delivery reliability, retries, signature verification                                                                     |
| WebSocket / SSE | Real-time push                                                        | Stateful connections complicate scaling + LB; SSE simpler when one-way suffices                                           |

**API rules that prevent architectural pain:** resource/capability-oriented naming · **version from day one** (URL path versioning is the pragmatic default; version the CONTRACT, not every field) · support ≥N-1 versions with a published deprecation policy + per-version usage telemetry · **cursor/keyset pagination**, never deep `OFFSET`, always a max page size · **idempotency keys on all unsafe mutations** · a machine-readable error contract (stable `code`, `message`, `details`, `traceId`; RFC 9457 problem+json is a good default) — NEVER leak stack traces · explicit rate limits with `Retry-After` · validate at the trust boundary and NEVER trust client-supplied authorization data (IDs, roles, prices, tenant IDs) · **contract-first + contract tests in CI** (OpenAPI/protobuf/AsyncAPI; consumer-driven contracts are what make independent deploys safe) · tolerant reader — unknown fields ignored, never fatal · long-running work ⇒ `202` + status resource · propagate a correlation/trace ID through EVERY hop including async.

### Edge components

| Component     | Legitimate responsibilities                                            | Do NOT put here                                                                                                                                                        |
| ------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API gateway   | TLS, routing, authn, rate limiting, quotas, transforms, versioning     | Business logic → smart-gateway anti-pattern: a shared bottleneck every team queues for                                                                                 |
| BFF           | Client-specific aggregation + shaping owned by the FRONTEND team       | A second business layer duplicating domain rules. Skip BFF with one client or when GraphQL already fills the role — its complexity cost frequently exceeds the problem |
| Service mesh  | mTLS, retries, timeouts, traffic shifting, telemetry, outlier ejection | Worth it only past a service count where per-app libraries hurt more than sidecar ops                                                                                  |
| CDN / edge    | Static + cacheable dynamic, TLS termination, WAF, geo routing          | Uncacheable personalized responses without careful `Vary`/key design                                                                                                   |
| Load balancer | Health checks, outlier ejection, **slow-start for new instances**      | Sticky sessions as a substitute for externalizing state                                                                                                                |

### Message taxonomy — conflating these causes most EDA mess

| Type                       | Semantics                                              | Coupling                               |
| -------------------------- | ------------------------------------------------------ | -------------------------------------- |
| **Command**                | "Do this" — one intended handler, may be rejected      | Sender knows receiver                  |
| **Event (fact)**           | "This happened" — 0..N subscribers, cannot be rejected | Publisher knows nothing of subscribers |
| **Query/request**          | "Tell me" — expects a reply                            | Temporal coupling                      |
| **Document/state message** | Carries a state snapshot                               | Loose                                  |

**MUST ATTENTION** an "event" with exactly one permitted consumer that MUST handle it, whose failure means the flow failed, is a **COMMAND wearing an event costume** — you get async debugging difficulty plus sync coupling. Name it a command and own the coupling honestly.

**Broker choice:** queue (competing consumers, per-message ack/retry/DLQ) · log (durable ordered-per-partition retention, replay, multiple consumer groups — **partition key choice is a design decision**, and the source of hot partitions) · pub/sub topic (fan-out notification) · stream processing (windowed aggregation/joins, with explicit event-time vs processing-time, watermarks, late data).

**Queue vs log — DIFFERENT semantics, not different vendors:**

|                 | Queue                                                                     | Log                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consumption     | message is CONSUMED and gone; work distributes across competing consumers | offset-based; **many independent consumer groups replay the same data**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Ordering        | none (or per-group at best); parallelism is free                          | per PARTITION only; ordering costs you parallelism on that key                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Scale unit      | add consumers freely                                                      | partition count — **hard to increase without rekeying**, so choose it deliberately                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Retention       | until acked                                                               | time/size based; **replay is a first-class capability**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Health SLI      | queue depth + oldest-message age                                          | **consumer lag** — the single most important number in any log-based system                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Durability knob | ack mode                                                                  | replication factor + `min.insync.replicas` + producer `acks` — **`acks=1` accepts data loss on leader failure**. `acks=all` waits for every replica CURRENTLY in the ISR, so `min.insync.replicas` is the FLOOR that decides whether a shrunken ISR rejects the write or silently accepts it: with `min.insync=1` a healthy 3-replica ISR still waits for 3, but the write is accepted with **no error** once the ISR shrinks to the leader alone — i.e. it DEGRADES to `acks=1` durability exactly when you need it most `[vendor-doc: Kafka producer/broker config — VERIFY]` |

**MUST ATTENTION** ordering, parallelism and retention are the THREE things a broker choice actually buys or sells; vendor name is not a design decision. NEVER pick a broker before writing down the required ordering scope (global / per-entity / none), the required replay window, and the durability acknowledgement mode. — why: these three are the only broker properties that are expensive to change later.

**Load-balancing algorithm is a real choice:** round-robin (ignores request cost) · least-connections · **least-outstanding-requests — the strongest general default because it routes away from slow hosts automatically, at the cost of per-host in-flight state in every LB instance** (independent instances each see only a partial view, which is exactly why power-of-two-choices exists; it also herds traffic onto a newly-healthy host, so slow-start is mandatory alongside it) · power-of-two-choices (near-optimal with almost no coordination) · consistent hashing (cache/shard affinity, at the cost of hot keys) · weighted + **slow-start for new instances** (a cold JIT/cache instance given full traffic fails its own health check). Sticky sessions are an admission that state was never externalized.

**Rate limiting — pick the algorithm from the failure you are preventing:** fixed window (simplest; permits a 2× burst across the boundary) · sliding window log (exact, memory-hungry) · sliding window counter (good compromise) · **token bucket (burst-tolerant — the default for public APIs)** · leaky bucket (smooths output, queues instead of rejecting) · **concurrency/in-flight limiter (best when per-request cost is unknown or highly variable — it bounds the resource, not the count)**. Distributed enforcement needs either a shared counter store (a new dependency in the hot path) or per-node quota division (accepting `N ×` slack) — state which. Always return `Retry-After`, and rate-limit BY the dimension being protected (tenant, principal, endpoint), never only by IP.

### Non-negotiables for any event-driven system

1. **Transactional outbox or CDC** — NEVER write DB + publish as two independent operations. **Dual-write failure:** DB commits + publish fails ⇒ silent divergence; publish succeeds + DB rolls back ⇒ phantom downstream data.
2. **Idempotent consumers** with a dedup window.
3. **Bounded queues + DLQ + a redrive procedure + DLQ-depth alerting.** An unbounded queue converts a throughput problem into unbounded latency then OOM. A DLQ nobody watches is data loss with extra steps.
4. **Versioned, registered, backward-compatible schemas** with CI compatibility checks. Event schemas are PUBLIC CONTRACTS forever — in event sourcing, literally forever.
5. **Poison-message handling** — capped retries with exponential backoff + jitter, then DLQ. Infinite retry of an unprocessable message is a self-inflicted outage.
6. **Distributed tracing across async hops** — propagate trace context in headers.
7. **Decide event granularity deliberately per stream:** thin/notification (ID only — restores temporal coupling, adds read load) vs fat/state-transfer (self-contained, but leaks more model and grows payloads). Hybrid (thin event + queryable snapshot endpoint) is common.
8. **NEVER leak internal DB rows as events** — CDC without a mapping layer publishes your schema as a frozen contract (Hyrum).
9. **Assume out-of-order, duplicated, delayed.** Carry a version/sequence per entity; discard backward transitions.
10. **Design the "current state" question** — pure event streams have no cheap "what is true now". Provide materialized read models and own their lag as an SLI.

---

## 11. Reliability, resilience & scalability

**Assume every dependency will fail, be slow, or lie.** The interesting failure is not "down" — it is **SLOW**, which exhausts your resources while looking healthy.

| Pattern                                  | Correct configuration                                                                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Timeout**                              | On EVERY network call, lock and query. Derived from the caller's remaining budget. **A missing timeout is the single most common resilience defect** |
| **Retry + exponential backoff + jitter** | ONLY for idempotent operations and retryable errors; always capped, always jittered — unjittered retries synchronize into a thundering herd          |
| **Retry budget**                         | Cap retries as a % of traffic. **Retry amplification is a top cause of turning a blip into an outage**                                               |
| Circuit breaker                          | Closed→open on failure/latency threshold; half-open probe; MUST have a defined fallback                                                              |
| Bulkhead                                 | Separate pools per dependency/tenant so one slow dependency cannot consume all capacity                                                              |
| Load shedding                            | Shed EARLY at the edge, by priority; fast 429/503. **Shedding beats queueing** — an undrainable queue is just slow failure                           |
| Backpressure                             | Bounded queues, flow control; push slowness upstream instead of buffering                                                                            |
| Rate limiting / quotas                   | Per tenant/client/endpoint; token bucket; documented                                                                                                 |
| Graceful degradation                     | Pre-decide the degraded mode PER FEATURE (stale data, hide module, read-only) — a PRODUCT decision                                                   |
| Static stability / fallback              | Serve last-known-good; avoid fallbacks that themselves call the network                                                                              |
| **Liveness vs readiness**                | DISTINCT. Readiness reflects dependencies; **liveness must NOT** (or a dependency blip restarts the whole fleet). Add startup probes for slow boots  |
| Hedged requests                          | Second request after p95, cancel loser; capped — costs extra load                                                                                    |
| Redundancy & failure domains             | N+1 minimum, spread across AZs; know your SPOFs (DNS, control plane, config store, one shared cache)                                                 |
| Cell-based                               | Independent cells, tenant routing, cell-by-cell deploys                                                                                              |
| Chaos / fault injection                  | Latency, error, dependency-kill, AZ-loss game days — untested resilience is decoration                                                               |
| **Graceful shutdown**                    | Stop accepting → drain in-flight with a deadline → flush buffers/metrics → close pools → exit. Without it EVERY deploy sheds requests                |

**Correlated failure — what actually causes big outages:** shared config push · DNS/cert expiry · a control-plane dependency in the data path · a poison config/flag · retry storms · cache stampede after a flush · a "global" rate limiter or sequence generator · one shared database everything reaches for during degradation. **A dependency in the recovery path that itself depends on you is a deadlock.**

**MUST ATTENTION — metastable failure is why "the spike ended and we're still down".** Retry storms, cold caches, queue backlog and GC pressure form a self-sustaining loop that OUTLIVES its trigger, so removing load does not recover the system. Every high-load path needs a deliberate ESCAPE HATCH — shed load at the edge, drain or truncate the queue, flush/warm the cache, restart with a lower concurrency limit. NEVER assume recovery is automatic once the trigger passes. — why: without an escape hatch the only recovery is a full cold restart under maximum pressure, which is when it is most dangerous.

**DR:** define **RPO** and **RTO** PER DATASET — they drive topology and cost. Ladder: backup/restore (hours) → pilot light → warm standby → active/active (minutes-to-zero, most expensive, hardest consistency). **A DR plan never drilled has an RTO of "unknown".**

### Scalability

**Scale Cube:** **X** horizontal duplication (cheapest, first; requires statelessness) · **Y** functional decomposition · **Z** data partitioning by key.

1. **Stateless app tier.** Externalize session/state. Sticky sessions block scaling, break rebalancing, complicate deploys.
2. **The database is a common bottleneck; measure before restructuring.** Start with query/index fixes and pool sizing per Little's Law, then consider caching or read replicas when freshness requirements allow. Add CQRS/read models only for evidenced query/write asymmetry or independent scaling needs. Choose vertical scaling, partitioning, or sharding from workload evidence; partitioning and sharding are harder to reverse.
3. **Make writes async when the user doesn't need the result** — queue-based load leveling turns a spike into a longer queue instead of an outage.
4. **Move work out of the request path**: background jobs, precomputation, materialized views, write-behind.
5. **Autoscale on the right signal** — queue depth or concurrency, usually NOT CPU; scale-out fast, scale-in slow. Autoscaling CANNOT fix a serialized bottleneck (Amdahl) and can worsen a coherency-bound system (USL).
6. **Hot keys/partitions** — whale tenant, trending item, celebrity user, time-based partition. Mitigate with key salting, dedicated shards/cells, per-tenant limits, request coalescing.
7. **Capacity with numbers:** `1M req/day ≈ 12 rps`; **peak is 2–10× average** — size for peak, below the ~70–80% knee.
8. **Multi-region** buys latency + DR and forces the hardest consistency questions. NEVER "active/active" without deciding conflict resolution.
9. **Measure cost-per-unit-of-work** alongside throughput, or "scalable" means "expensive".

### Caching

**Strategies:** cache-aside (most common) · read-through · write-through · write-behind · refresh-ahead. **Invalidation options:** TTL · event-driven · **versioned/namespaced keys (often best — avoids deletes)** · explicit purge.

**Failure modes:** **stampede/dogpile** (→ request coalescing / single-flight / early probabilistic refresh / TTL jitter) · **penetration** (→ negative caching, bloom filter) · **avalanche** (→ jitter TTLs) · **cold start after flush** (→ warm-up + LB slow-start) · **unbounded cache** (→ OOM; always max size + eviction) · **cache as a correctness crutch** (if the system only works warm, it is not a cache — it is a tier with no durability guarantee).

**MUST ATTENTION** NEVER cache authorization decisions or per-tenant data under a key omitting the identity/tenant/permission dimension. **Cache-key omission is a recurring cross-tenant data-leak vector that passes every functional test.**

---

## 12. Multi-tenancy

| Model                                            | Isolation                    | Cost/ops                                                     | Choose when                                                            |
| ------------------------------------------------ | ---------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Shared DB + shared schema (`tenant_id`) — _pool_ | Application-enforced only    | Cheapest, best density                                       | **Default for most B2B SaaS**                                          |
| Shared DB + schema-per-tenant (bridge)           | Moderate                     | Migration across N schemas; catalog bloat past a few hundred | Rarely best — near silo complexity without regulatory-grade isolation  |
| Database-per-tenant — _silo_                     | Strong                       | Linear cost, N migrations, pool pressure, provisioning time  | Regulated, white-label, per-tenant residency, large enterprise tenants |
| Full stack per tenant                            | Maximum                      | Highest                                                      | Largest / most regulated only                                          |
| Hybrid tiering                                   | Pooled small + siloed whales | Two code paths                                               | The mature scale-up shape                                              |

**MUST ATTENTION** in the pooled model isolation depends on EVERY query carrying the tenant predicate. **One missing `WHERE tenant_id = ?` is a cross-tenant breach that all functional tests pass.** NEVER rely on developer discipline — enforce the predicate at an authoritative boundary that covers every tenant-owned query path. Database **row-level security**, an ORM global filter/interceptor, or a mandatory data-access owner are options selected to fit the project architecture; add a test asserting cross-tenant reads return zero rows. **NEVER take `tenant_id` from a client-supplied field** — derive it from the authenticated principal.

Also design: noisy-neighbor control (per-tenant limits + quotas + bulkheads) · per-tenant SLIs · onboarding/offboarding automation · per-tenant export + deletion · tenant-aware cache keys · per-tenant entitlement without forking code.

---

## 13. Frontend & web delivery

| Rendering strategy                                | Best for                                                    | Cost                                                     |
| ------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------- |
| CSR / SPA                                         | Highly interactive app behind a login                       | Poor first load + SEO; large JS; client state management |
| SSR                                               | Dynamic personalized content needing fast first paint + SEO | Server cost, per-request latency, hydration complexity   |
| SSG                                               | Rarely-changing content                                     | Rebuild to change                                        |
| ISR / on-demand revalidation                      | Large mostly-static catalogs                                | Cache/invalidation complexity                            |
| Streaming SSR + islands / partial hydration / RSC | Best current default for content+interactivity mixes        | Newer mental model, framework coupling                   |
| Edge rendering                                    | Global latency, edge personalization                        | Runtime limits; edge compute + distant DB = worse        |

- **Place frontend responsibilities by their actual owner:** presentation, feature composition, application state/services, API clients, and design-system boundaries may fit when the project uses them. Place business rules with the component that owns their invariants; keep UI handlers from duplicating or bypassing that policy.
- **State taxonomy:** server-cached data (use a data-fetching/caching library — NOT a global store) · client UI state (local, minimal) · **URL state (deep-linkable — most under-used)** · form state · session/auth. **Putting server data in a global store and hand-syncing it is the most common frontend architecture error.**
- **Performance budgets as CI fitness functions:** JS bytes per route, image policy, third-party count, plus a Core Web Vitals budget measured at the **p75 of real field traffic**, never a lab score. **Thresholds are single-sourced in `.claude/skills/performance-review/references/performance-knowledge.md` §7 — read them there, never restate them here** (they are third-party-owned and DO move: INP replaced FID in 2024).
- **Accessibility is architectural** — semantic HTML, focus management, keyboard paths, contrast; WCAG 2.2 AA baseline, automated + manual.
- **Async UI states are part of the contract:** loading, empty, error, partial, offline, optimistic + rollback.
- **Client resilience:** request timeouts, backoff, cancellation on unmount/navigation, rapid-input race handling.
- **Browser auth:** prefer HttpOnly+Secure+SameSite cookies with CSRF protection over localStorage tokens (XSS-exfiltratable); short-lived access + refresh rotation. Client-side authorization is UX ONLY.
- **Micro-frontends** are legitimate only for genuinely independent teams shipping independently. For a single team they are almost always net-negative — use a modular monorepo.

---

## 14. Security architecture

**Principles:** zero trust (no implicit trust from network position; authenticate + authorize EVERY request including service-to-service) · least privilege (deny by default, narrowly-scoped time-bound credentials, per-service identity) · defense in depth · secure defaults · fail securely (an error must not open access) · complete mediation (check on every access, not once at entry) · minimize attack surface · separation of duties · assume breach (design for containment + detection) · economy of mechanism · never roll your own crypto.

| Concern           | Architecture-level control                                                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication    | Centralized IdP, OIDC/OAuth2 (auth-code + PKCE for public clients), MFA, short-lived rotating tokens, workload identity (SPIFFE/mTLS/managed identity)                                                                 |
| **Authorization** | **Server-side on EVERY access.** RBAC → ABAC → ReBAC as complexity grows. **Broken access control is the #1 real-world risk** — object-level checks on every object read (IDOR)                                        |
| Tenant isolation  | §12 — RLS/enforced filters, tenant from token only                                                                                                                                                                     |
| Secrets           | Vault/KMS/managed store; never in code, images, env dumps or logs; automatic rotation; no long-lived static cloud keys                                                                                                 |
| Data protection   | TLS 1.3 in transit + mTLS internally, encryption at rest, field-level encryption/tokenization for PII/PCI, key rotation; classification drives control strength                                                        |
| Input handling    | Allow-list validation at the trust boundary; parameterized queries only; context-correct output encoding; strict deserialization; **SSRF protection on every server-side fetch** (block link-local/metadata endpoints) |
| Uploads           | Type/size limits, out-of-band scanning, object storage outside webroot, distinct serving origin, never execute                                                                                                         |
| Web headers       | CSP (nonce/hash), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame-ancestors, explicit CORS allow-list (never `*` with credentials)                                                      |
| Abuse / DoS       | Rate limits, quotas, WAF, bot management, cost caps on expensive queries (GraphQL depth/complexity), request size limits                                                                                               |
| Supply chain      | Pinned deps + lockfiles, SBOM, SCA in CI, provenance/signing (Sigstore/SLSA), vet before adoption, minimal base images                                                                                                 |
| CI/CD             | Least-privilege runners, OIDC federation over static keys, protected branches, signed artifacts, third-party actions pinned by SHA                                                                                     |
| Audit             | Immutable trail for security-relevant events; **NEVER log secrets/tokens/PII**                                                                                                                                         |
| AI/LLM surfaces   | Treat model output as untrusted input; prompt-injection-resistant tool design; least-privilege tool scopes; human approval for irreversible actions; output validation before execution                                |

Threat-model on the ARCHITECTURE DIAGRAM (STRIDE per boundary, or "what does an attacker gain here?") — the trust boundaries on that diagram are the entire point of drawing it. Record accepted risks.

---

## 15. Observability, delivery & cost

**Monitoring answers "is it broken?"; observability answers "why?".** A system you cannot explain during an incident is not production-ready regardless of test coverage.

- **Metrics** — alertable, low cardinality; percentiles from HISTOGRAMS (**percentiles are not averageable** — a "mean p99" is meaningless).
- **Logs** — structured JSON, leveled, with `trace_id`/`tenant_id`/`request_id`; sampled at volume; never secrets/PII. Unstructured string logs are the most common and most expensive observability gap.
- **Traces** — end-to-end causality across services AND async hops; the only tool answering "where did the time go".
- **Profiles** — continuous CPU/alloc attribution.
- **Change events** — deploys, flag flips, config pushes, migrations, scaling. **Most incidents correlate with a change**; without change overlay MTTR suffers badly.

**Practice:** OpenTelemetry as the vendor-neutral standard, W3C trace context everywhere · golden signals (latency, traffic, errors, saturation), **RED** for services / **USE** for resources · **SLI → SLO → error budget per user journey; alert on SYMPTOMS (SLO burn rate), not causes** · every alert actionable with a runbook · **cardinality is the cost driver** — never put unbounded values in metric labels · dashboards per service AND per journey.

**Delivery:** decouple deploy from release (flags/canary) · trunk-based + short branches · ONE artifact promoted with external config (12-factor) · rolling / blue-green / canary / **dark launch** / **parallel run** (gold standard for risky replacements) · **every deploy backward AND forward compatible for one version** (rolling means both versions run simultaneously — applies to APIs, events and schemas alike) · migrations deploy independently, forward-only, non-blocking · IaC + immutable infra + ephemeral preview envs · pipeline gates: build → unit → static/type → **architecture tests** → integration/contract → security scans → perf smoke → deploy → smoke → canary gate · **DORA** metrics (deploy frequency, lead time, change-fail rate, MTTR) as delivery SLIs · test pyramid + **contract tests** as the load-bearing addition for distributed systems; tests must protect INVARIANTS, not mirror implementation.

**Cost (FinOps) — routinely absent from reviews and routinely why a good design gets replaced.** Model unit economics (`$/request`, `$/tenant`, `$/MAU`) up front; an architecture whose UNIT cost rises with scale fails eventually regardless of elegance. Biggest web-system drivers: **egress and cross-AZ/cross-region traffic** · idle over-provisioned compute · unbounded log/metric/trace retention and cardinality · per-request managed-service pricing at steady high volume · snapshot sprawl · always-on non-prod. **Serverless vs always-on INVERTS with utilization** — model it. Data lifecycle tiering is usually the largest single saving. Tag everything for attribution from day one.

---

## 16. Evolution, governance & socio-technical

**Migration patterns:** strangler fig (default safe modernization — facade + capability-by-capability routing) · branch by abstraction · anticorruption layer · **parallel run / shadow compare** (best available proof for high-risk replacements) · expand–contract · sacrificial architecture (deliberately replaceable — say so out loud). **NEVER big-bang rewrite** a system you don't fully understand: you inherit all undocumented behavior as invisible requirements (Hyrum), lose feature delivery, and discover the real complexity at 80% done.

**Pay architectural debt with a RATCHET, not a project** — forbid new violations via fitness functions, then decrement the existing count over time. "Cleanup cycle later" never happens; a CI counter that can only go down does.

**MUST ATTENTION** an architectural rule NOT automatically verified is a SUGGESTION and will be violated within one quarter. **Governance = executable checks + recorded rationale**, never documents and review meetings.

**ADR minimum content:** Context (forces, constraints, quantified attributes) · Decision · **Alternatives considered with why each was rejected** (the highest-value section — it prevents relitigating and later explains the constraint to whoever is tempted to break it) · Consequences (what we now cannot do easily) · Status · **Revisit trigger** (the measurement that would reopen it).

### Fitness functions — objective automated checks

| Characteristic                | Fitness function                                                                                                                                                                                                                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layer/dependency rules        | ArchUnit / NetArchTest / dependency-cruiser / import-linter in CI                                                                                                                                                                                                                                           |
| No module cycles              | Cycle detection fails the build                                                                                                                                                                                                                                                                             |
| Module boundary (modulith)    | Spring Modulith / package-private enforcement / lint boundaries                                                                                                                                                                                                                                             |
| Domain purity                 | Assert the domain package imports no framework/ORM/HTTP namespace                                                                                                                                                                                                                                           |
| API compatibility             | OpenAPI/protobuf diff gate; consumer contract tests                                                                                                                                                                                                                                                         |
| Event schema compatibility    | Schema-registry backward-compat check in CI                                                                                                                                                                                                                                                                 |
| Performance                   | Latency/throughput assertion in pipeline; frontend bundle + CWV budgets                                                                                                                                                                                                                                     |
| **Test strength**             | Mutation / fault-injection score gate on CHANGED code; where no tool exists, a **recorded defect-seeding drill** (break a top invariant → record which named test went red → restore). **Line coverage is a diagnostic, never a gate** — see `SYNC:harness-setup` and `SYNC:engineering-foundation-gate` F4 |
| **Performance at data scale** | Perf suite seeded to a representative volume AND shape, asserting named latency/memory budgets that FAIL the run; compared across ≥2 volumes ~10× apart so super-linear growth is visible; resource exhaustion bounded, not an OOM kill — F5                                                                |
| **Build scalability**         | Assert an unchanged module is NOT rebuilt; affected-set computation is exercised; cache-hit rate reported rather than assumed — F6                                                                                                                                                                          |
| **Environment parity**        | Clean-machine bootstrap exercised in CI; host and containerized paths run the SAME suite; toolchain + lockfile pinning verified — F1/F2                                                                                                                                                                     |
| Security                      | SAST/SCA/secret/IaC scans with severity gates; no-plaintext-secret test                                                                                                                                                                                                                                     |
| **Multi-tenant isolation**    | Test asserting a cross-tenant query returns zero rows                                                                                                                                                                                                                                                       |
| Resilience                    | Chaos experiment as a scheduled test; "every outbound call has a timeout" lint                                                                                                                                                                                                                              |
| Observability                 | Assert every endpoint emits a trace + structured log with correlation ID                                                                                                                                                                                                                                    |
| Data                          | Migration-reversibility check; no cross-module/cross-schema FK                                                                                                                                                                                                                                              |
| Cost                          | Alert/gate on cost-per-request regression                                                                                                                                                                                                                                                                   |

Also: a **tech radar** (adopt/trial/assess/hold) · lightweight RFC flow · an **architecture advice process** (anyone decides, must seek advice, must record an ADR) which scales far better than an approval board · a **paved road / golden path** so the compliant option is also the EASIEST one — governance by convenience beats governance by policing.

### Socio-technical

- **Conway is not advisory** — use the **reverse Conway maneuver**: design the team boundaries you want the architecture to have.
- **Team Topologies:** stream-aligned (majority) · platform (self-service, reduces others' load) · enabling (temporary uplift) · complicated-subsystem. Interaction modes: collaboration (temporary, expensive) · X-as-a-service (default steady state) · facilitating.
- **Cognitive load is a hard constraint** — a team owning more domains than it can hold produces bad architecture regardless of talent. A service/module should fit ONE team's head.
- **One service, one owner** — shared ownership means nobody owns quality; unowned services rot into the scariest part of the system.
- **Minimize cross-team SYNC dependencies** — each is a delivery queue. If team A waits on team B's deploy, the boundary is wrong or should be a platform capability.
- **You build it, you run it** aligns incentives with operability.
- **Match architecture ambition to platform maturity** — microservices without CI/CD, IaC, observability, tracing and a platform team is the most reliable predictor of a failed migration.
- Architects must stay in the code (or at least reviews + the golden path). Beware the ivory-tower architect and the architect-as-approval-bottleneck.

### Documenting

**C4:** Context → Container → Component → Code (levels 1–2 are highest-value and most often missing). Complement with sequence diagrams for the 3–5 critical flows INCLUDING failure paths · a data/ERD view · a deployment view showing **failure domains and trust boundaries** · a dependency map with sync/async marked · an event catalog. **Every diagram needs a legend, a date and an owner** — an undated diagram is a rumor. Generate/check views from IaC, registry, traces or code where possible. Record the **constraints and "thou shalt nots"**, plus known debt and accepted risks so the next person doesn't mistake them for ignorance.

---

## 17. ANTI-PATTERN CATALOG

> **MUST ATTENTION** each row is a HYPOTHESIS. Promote to a finding ONLY with `file:line`/config/topology evidence + the damaged quality attribute named.

### 17.1 Structural / general

| Anti-pattern                                   | Symptom                                                        | Fix                                                                                                                                              |
| ---------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Big ball of mud                                | No discernible structure; everything reaches everything        | Establish boundaries incrementally (strangler + ACL); freeze new violations with fitness functions                                               |
| Spaghetti / tangled dependencies               | Cannot change one thing without touching many                  | Extract modules along change-together lines                                                                                                      |
| God object / the Blob                          | One class/service with dozens of responsibilities              | Split by actor/reason for change (SRP)                                                                                                           |
| Golden hammer                                  | Same tool/framework/DB for every problem                       | Choose by access pattern + quality attributes; keep a tech radar                                                                                 |
| Résumé-/hype-driven (shiny nickel)             | New tech with no stated problem it solves                      | Require an ADR naming the attribute bought + the exit plan                                                                                       |
| Over-engineering / gas factory                 | Layers and patterns for a simple need                          | Delete indirection with a single implementation; keep the seam, drop the abstraction                                                             |
| Premature optimization / generalization        | Complex design for unmeasured needs or one caller              | Measure the actual change cost; evaluate repeated patterns against shared ownership and reason-to-change evidence; do not extract by count alone |
| Speculative generality / inner-platform effect | Config engine reimplementing its own host language             | Delete unused flexibility; write code                                                                                                            |
| Analysis paralysis                             | Months of design, nothing shipped                              | Slice thin, ship a vertical path, learn                                                                                                          |
| Copy-paste architecture                        | Boilerplate replicated across services                         | Golden-path template + shared libs for genuinely generic concerns                                                                                |
| Not-invented-here                              | Custom auth, ORM, queue                                        | Buy/adopt generic subdomains                                                                                                                     |
| Vendor lock-in by default                      | Proprietary primitives through the domain                      | Isolate vendor at adapters; accept lock-in consciously where the win is large                                                                    |
| Layered pass-through (sinkhole)                | A layer that only forwards unchanged                           | Collapse it or give it a real responsibility                                                                                                     |
| `Utils`/`Common`/`Shared` dumping ground       | Referenced by everything                                       | Coincidental cohesion → coupling hub + cycle source; split by purpose                                                                            |
| **Domain leak into shared/infra layer**        | "Reusable" library references tenant/customer/product concepts | Compiles and passes review silently while coupling the layer to one consumer — keep shared types domain-free; push domain fields into consumers  |
| Architecture by accident                       | No recorded decisions                                          | Start ADRs now, retroactively for load-bearing decisions                                                                                         |
| Ivory tower / PowerPoint architecture          | Diagrams disconnected from code                                | Architects in reviews + own the golden path + fitness functions                                                                                  |
| Wrong abstraction                              | Everyone works around it                                       | Wrong abstraction costs more than duplication — inline it back, re-derive from real usage                                                        |
| Boat anchor                                    | Unused framework kept "just in case"                           | Delete; git remembers                                                                                                                            |

### 17.2 Distributed / microservices

| Anti-pattern                                | Symptom                                                           | Fix                                                                                                                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Distributed monolith**                    | Services release together; shared DB/entity lib; deep sync chains | Redraw boundaries by capability; async where possible; kill shared schema; independent pipelines                                                                          |
| Nanoservices / over-decomposition           | A feature touches 8 tiny services                                 | Merge back along transaction/change boundaries                                                                                                                            |
| Entity services                             | `UserService`, `ProductService` doing CRUD                        | Reorganize around capabilities/business processes                                                                                                                         |
| Shared database                             | Multiple services writing the same tables                         | One writer; expose via API/events/replica                                                                                                                                 |
| Chatty services                             | Dozens of calls per user request                                  | Coarser contracts, aggregation, caching, or merge                                                                                                                         |
| Sync chains ≥4 deep                         | One request traverses many services synchronously                 | Flatten, cache, precompute, or make async                                                                                                                                 |
| **Dual write**                              | Write DB then publish, no atomicity                               | Transactional outbox or CDC                                                                                                                                               |
| No consumer idempotency                     | Duplicate side effects (double charge/email)                      | Dedup key/version checks; naturally idempotent operations                                                                                                                 |
| Missing timeouts/retries/breakers           | One slow dependency stalls the fleet                              | Timeout everything; capped jittered retries; breakers; bulkheads                                                                                                          |
| Retry-storm amplification                   | Load spikes when a dependency is unhealthy                        | Retry budgets, jitter, breakers, edge shedding                                                                                                                            |
| Shared "common" domain library              | Every service depends on one domain lib                           | Lockstep deploys — duplicate small DTOs; share only generic tech utilities                                                                                                |
| Smart gateway / ESB logic in the edge       | Business rules in the gateway                                     | Gateway does routing/authn/limits only                                                                                                                                    |
| Chaotic point-to-point integration          | `N(N−1)/2` bespoke links                                          | Choose integration mechanisms by consumer, ordering, durability, and ownership needs; publish stable contracts and use a broker when it fits those needs                  |
| 2PC across services                         | XA distributed transaction                                        | Saga + outbox + compensation                                                                                                                                              |
| Versionless events/APIs                     | Any producer change breaks consumers                              | Schema registry, compat checks, tolerant readers                                                                                                                          |
| Raw-table CDC as public contract            | Consumers depend on internal columns                              | Map to a published event schema                                                                                                                                           |
| No distributed tracing                      | Cross-service log archaeology                                     | OTel + context propagation incl. async                                                                                                                                    |
| Cache/queue used as a coordination channel  | Services coordinating via a Redis key                             | Explicit contracts; proper state ownership                                                                                                                                |
| **Microservices without platform maturity** | No CI/CD, IaC, tracing, on-call                                   | Establish the operating capabilities required by the proposed services; choose a single-release architecture only when its release, data, and availability boundaries fit |
| Polyglot for its own sake                   | Every service its own stack                                       | Constrain to a small blessed set; exceptions need an ADR                                                                                                                  |

### 17.3 Data

| Anti-pattern                                       | Symptom                                                    | Fix                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| Integration through the database                   | External systems reading/writing your tables               | API/events; a read replica or published view at most                    |
| Anemic model with complex rules                    | Entities are data bags; logic in services                  | Move invariants into entities/value objects, or admit it is CRUD        |
| God table / EAV everywhere                         | 200-column table, or key-value soup                        | Model the real entities; JSON columns only for genuinely open extension |
| Transactions across network calls                  | Locks held during HTTP calls                               | Short local transactions; never hold across I/O                         |
| `SELECT *` / unbounded queries                     | Latency scales with data; OOM as data grows                | Project columns; always paginate; **push the filter to the DB**         |
| N+1 (incl. GraphQL resolvers, lazy loading)        | Query count scales with result size                        | Batch/join/dataloader; eager-load intentionally                         |
| Deep `OFFSET` pagination                           | Later pages slower, unstable under inserts                 | Keyset/cursor pagination                                                |
| Missing/useless indexes or index sprawl            | Full scans, or slow writes and bloat                       | Index by access pattern + selectivity; drop unused                      |
| Analytics on the OLTP primary                      | Reports saturate production                                | Replica, CDC, or warehouse                                              |
| Breaking migration in one deploy                   | Rolling deploy breaks old pods; rollback impossible        | Expand–contract, forward-only, backward-compatible                      |
| Backups never restored                             | "We have backups"                                          | Scheduled restore drills; measure actual RTO                            |
| No data lifecycle/retention                        | Storage grows forever; deletion requests impossible        | Classify, retain, tier, delete by policy — designed in                  |
| Data swamp                                         | Lake with no catalog, lineage or contracts                 | Contracts, catalog, ownership, medallion layering                       |
| Event sourcing for an audit log                    | Enormous complexity for a change history                   | Use an audit table                                                      |
| CQRS on simple CRUD                                | Two models, sync lag, no benefit                           | Single model until a measured asymmetry exists                          |
| **Client-supplied tenant/user/price/role trusted** | Cross-tenant access, privilege escalation, price tampering | Derive from the authenticated principal server-side, always             |
| UUIDv4 clustered PK at scale                       | Write amplification, index fragmentation                   | Time-ordered IDs (UUIDv7/ULID/Snowflake)                                |
| Distributed cache as source of truth               | Data loss on eviction/restart                              | Durable store of record; cache derived and disposable                   |

### 17.4 Runtime / operations

| Anti-pattern                                     | Symptom                                          | Fix                                                        |
| ------------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------- |
| Stateful app servers / sticky sessions as design | Cannot scale or rebalance; deploys drop sessions | Externalize state; stateless tier                          |
| Unbounded queues/pools/caches/result sets        | Latency grows, then OOM                          | Bound everything; backpressure or shed                     |
| Liveness probe checking dependencies             | A dependency blip restarts the fleet             | Liveness = self only; readiness = dependencies             |
| No graceful shutdown                             | Every deploy sheds in-flight requests            | Drain with deadline; close pools; flush                    |
| Autoscaling on CPU for an I/O-bound service      | Scales too late or not at all                    | Scale on concurrency/queue depth/latency                   |
| Capacity planned at high utilization             | Latency cliff under modest growth                | Stay below the ~70–80% knee                                |
| SPOFs not identified                             | One AZ/DNS/config/cache takes everything down    | Map failure domains; redundancy; static stability          |
| Recovery path depends on the failing system      | Cannot deploy the fix because deploy is down     | Break the cycle; data plane independent of control plane   |
| Manual drifting infrastructure                   | "Only one person can restore it"                 | IaC, immutable infra, runbooks                             |
| Deploy ≡ release, no flags/canary                | Every release is all-or-nothing                  | Flags, canary with SLI gates, auto-rollback                |
| Cause-based / noisy alerting                     | Alert fatigue; real incidents missed             | SLO burn-rate symptom alerts; every page actionable        |
| Unstructured logs, no correlation, no tracing    | Incidents unexplainable                          | Structured logs + trace context + OTel                     |
| Cardinality explosion                            | Observability bill exceeds compute bill          | Bound labels; sample; aggregate                            |
| Secrets in code/logs/images                      | Credential leak                                  | Managed store + rotation + scanning                        |
| No load/chaos testing before launch              | First real traffic is the test                   | Load profile in CI; game days                              |
| Cache required for correctness                   | Cold start or flush = outage                     | Cache optional; warm-up + slow-start; graceful degradation |

### 17.5 Frontend

| Anti-pattern                                 | Symptom                                        | Fix                                                              |
| -------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| Business logic in components                 | The same rule reimplemented in 4 screens       | Push to entity/model/service layer                               |
| Server data in a global store, hand-synced   | Stale UI, cache bugs, huge reducers            | Server-cache library; global store for UI state only             |
| Prop drilling / god component                | 1000-line component, deep prop chains          | Composition, context at the right scope, split by responsibility |
| No loading/empty/error/offline states        | UI looks broken or lies                        | Treat async states as part of the contract                       |
| No performance budget                        | LCP/INP regress silently release over release  | CI budgets; route-level code splitting                           |
| Tokens in localStorage                       | XSS ⇒ account takeover                         | HttpOnly+Secure+SameSite cookies + CSRF defense                  |
| Client-side authorization only               | Trivial API bypass                             | Server-side authorization always                                 |
| Magic numbers / no tokens / deep CSS nesting | Visual drift, unmaintainable styles            | Design system + tokens + BEM/scoping + nesting cap               |
| No responsive/overflow handling              | Layout breaks on real data and small screens   | Wrap strategies, truncation rules, worst-case content tests      |
| Uncancelled requests / leaked subscriptions  | Races, stale renders, memory leaks             | Cancel on unmount/navigation; teardown every subscription        |
| Accessibility deferred                       | Retrofit costs a redesign                      | Semantic HTML + a11y gates from the start                        |
| Micro-frontends for one team                 | Version skew, duplicated deps, inconsistent UX | Modular monorepo                                                 |

### 17.6 Process / organizational

| Anti-pattern                                 | Symptom                                      | Fix                                                 |
| -------------------------------------------- | -------------------------------------------- | --------------------------------------------------- |
| Architecture without quantified attributes   | Style chosen by preference or fashion        | Write scenarios with numbers first                  |
| Undocumented decisions                       | Same debate every quarter                    | ADRs with rejected alternatives + revisit triggers  |
| Rules enforced only by review                | Violations accumulate between reviews        | Fitness functions in CI                             |
| Big-bang rewrite                             | Feature freeze; real complexity found at 80% | Strangler fig + parallel run                        |
| "Cleanup cycle later"                       | Debt only grows                              | Ratchet: block new violations, decrement existing   |
| Shared ownership of services                 | Quality has no owner                         | One service, one owner                              |
| Cross-team sync dependencies everywhere      | Delivery is a queue                          | Reverse Conway; self-service platform capabilities  |
| Cognitive overload per team                  | Poor decisions despite strong engineers      | Bound domains; platform team absorbs load           |
| Architect as approval bottleneck             | Queues, workarounds                          | Advice process + paved road + ADRs                  |
| Metric-as-target (Goodhart)                  | 90% coverage and still broken                | Gate on invariants; measure DORA                    |
| Security/observability/cost as a later phase | Discovered in an audit or the bill           | Treat as quality attributes in the SAME design pass |

---

## 18. Symptom → Architectural Root Cause Triage

| Symptom                                        | Likely architectural cause                                                | First evidence to pull                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Small feature touches 10+ files across modules | Wrong boundaries; low cohesion; layer-first packaging                     | Files-changed-per-feature over recent PRs                                                                |
| Services must deploy together                  | Distributed monolith (deployment coupling)                                | Release coordination history; shared libs/schema                                                         |
| One service down ⇒ everything down             | Sync chains; missing timeouts/breakers/degradation                        | Dependency map with sync/async marked                                                                    |
| Latency scales with result-set size            | N+1 / per-item round trip                                                 | Query or call count vs item count                                                                        |
| p99 terrible, p50 fine                         | Fan-out tail, pool saturation, GC, cold cache                             | Per-dependency latency + pool wait + fan-out width                                                       |
| Fine in staging, fails in prod                 | Data volume, concurrency, real network — untested nonfunctional path      | Row counts, concurrency, plan diff                                                                       |
| Cliff at a specific load level                 | Utilization knee, pool exhaustion, working set > cache                    | Pool pending + acquire-wait + hit ratio                                                                  |
| Throughput DROPS as instances are added        | USL coherency term: shared lock, shared DB, chatty coordination           | Contention metrics vs node count                                                                         |
| "I saved it and it disappeared"                | Read-your-writes violated by replica lag                                  | Replica lag + read routing                                                                               |
| Duplicate side effects                         | Non-idempotent consumer under at-least-once delivery                      | Dedup mechanism; redelivery counts                                                                       |
| Events lost / downstream out of sync           | Dual write without outbox/CDC                                             | Publish-vs-commit ordering in code                                                                       |
| Data diverges between services                 | Two writers; no single source of truth                                    | Write-path ownership map                                                                                 |
| One tenant degrades everyone                   | Noisy neighbor; no bulkheads/quotas; hot partition                        | Per-tenant resource + key distribution                                                                   |
| Cross-tenant data appeared                     | Missing tenant predicate or tenant-less cache key                         | Query-interceptor coverage; cache key composition                                                        |
| Cannot change a table without a meeting        | Integration through the database                                          | Who writes/reads the table                                                                               |
| Incidents take hours to diagnose               | No tracing/correlation/structured logs; no change overlay                 | % requests traced; deploy-event overlay                                                                  |
| Every release is scary                         | Deploy≡release, no canary/flags, breaking migrations                      | Change-failure rate, rollback capability                                                                 |
| Costs grow faster than traffic                 | Unit economics unmodeled; egress/cross-AZ, retention, cardinality         | $/request trend by component                                                                             |
| New engineers take months                      | Missing golden path/docs/boundaries; excessive cognitive load             | Onboarding time; module count per team                                                                   |
| Same bug reappears elsewhere                   | The invariant has no consistent owner or callers enforce different policy | Trace all callers; correct the architecture-selected owner and retain validation at untrusted boundaries |

---

## 19. Trade-Off Cheat Sheet

| Buy this                           | Pay with this                                             |
| ---------------------------------- | --------------------------------------------------------- |
| Strong consistency across services | Availability during partitions + latency on every write   |
| Low global latency                 | Consistency, or data-model partitioning                   |
| Independent deployability          | Distributed-systems complexity + platform investment      |
| Team autonomy                      | Duplication + eventual consistency + governance effort    |
| Flexibility / configurability      | Simplicity, debuggability, onboarding speed               |
| Fast reads (denormalized/cached)   | Write amplification + an ongoing consistency obligation   |
| Fast writes (async/write-behind)   | Read staleness + a possible loss window                   |
| Statelessness & elastic scale      | An external state store as a new dependency               |
| Fault isolation (cells/bulkheads)  | Resource overhead + routing + N× ops surface              |
| Reuse (shared library/service)     | Coupling + lockstep release pressure                      |
| Duplication                        | Drift, and fixing bugs in N places                        |
| Vendor managed service             | Lock-in + cost at scale + less control                    |
| Build it yourself                  | Core-domain budget spent on a generic subdomain           |
| Higher verification confidence     | Cycle time                                                |
| Observability depth                | Cost (cardinality/retention) + instrumentation effort     |
| Security controls                  | Developer friction + latency + usability                  |
| Fine-grained services              | Latency, tail amplification, ops overhead, cognitive load |
| Coarse-grained services            | Slower independent evolution, larger blast radius         |

**Candidate starting points for common web business systems** (check the condition and project evidence; these are not universal mandates): relational storage when relationships, transactions, or flexible queries are central · a modular monolith when one release unit fits the workload · synchronous reads for immediate answers and asynchronous effects when eventual consistency is acceptable · REST or gRPC according to consumers and platform support · cursor pagination for large or changing result sets · UTC storage with explicit time zones at input/output boundaries · idempotency for retryable mutations · an outbox when durable publication must be atomic with stored state · cache-aside only with a freshness/invalidation policy · database-enforced tenant isolation when tenancy is a security boundary and the store supports it · trunk-based delivery and flags when the CI/deployment process supports short feedback loops · stateless app nodes when horizontal scaling is needed · OpenTelemetry where its libraries and backend fit · deny-by-default on authorization surfaces · expand–contract for overlapping deployments. For brownfield projects, follow accepted architecture and project references unless a requirement supports a reviewed change; record rationale in proportion to the decision's cost and irreversibility.

---

## 20. Judgment Checklists — the reusable interrogation scripts

> These are the **procedure-free question sets** every consuming skill runs against a decision, a design, or its own reasoning. They own no workflow; the skills decide WHEN to run them.

### 20.1 Ask BEFORE any architecture decision (the pre-decision script)

1. What problem is this solving, in the user's or business's words?
2. What are the top 3 QUANTIFIED quality attributes, and which am I sacrificing?
3. Is this a one-way or two-way door? What makes it reversible or not?
4. What is the simplest thing that could possibly work here?
5. What is the expected load — now, and at 10×? (10×, not 1000×.)
6. What breaks FIRST as load grows, and how will I know?
7. What are the failure modes, and what is the blast radius of each?
8. What is the consistency requirement PER read path — and what staleness is acceptable?
9. Who owns this data, and who else needs it? (One writer. Many readers.)
10. What is the deployment + rollback story, including the data?
11. How will this be tested, and what can only be verified in production?
12. What does it cost — infrastructure, and engineering time to run it?
13. What is the team's actual skill and appetite for operating this?
14. What existing thing could I use instead of building?
15. What would have to be TRUE for this to be the wrong choice — and how would I detect that?

**MUST ATTENTION** question 15 is non-optional: a decision with no stated falsifier and no revisit trigger is a belief, not a decision. — why: without a named trigger nobody ever revisits it, so the decision outlives the constraints that justified it.

### 20.2 Design-review script (run against someone else's design, or your own)

- Are the quality attributes QUANTIFIED, or adjectives?
- Is the data model right, and does exactly one component own each dataset?
- Is every boundary drawn around a CAPABILITY (verb) rather than an entity (noun)?
- Judge all FOUR coupling dimensions separately (§4) — is this a distributed monolith?
- Does every network call have a timeout, a retry policy, and a defined fallback?
- Is every consumer and every unsafe mutation idempotent?
- Is any write-then-publish done without an outbox/CDC?
- Is the isolation level named, and is every check-then-act invariant protected (§8)?
- Does the migration plan survive a rolling deploy (expand–contract), and is rollback possible WITH the data?
- Does every tenant-scoped query and cache key carry the tenant?
- What is the SPOF list, and what is the recovery path — does anything in it depend on the failing system?
- How will an on-call engineer diagnose this at 3am with only logs, metrics and traces?
- What is unit cost per request/tenant, and what happens to it at 10×?
- Which architectural rules have an EXECUTABLE fitness function, and which rely on review discipline?
- Is there an ADR for each one-way door, naming the rejected alternative and the revisit trigger?

### 20.3 Red flags in your OWN thinking (the reviewer's self-audit)

**MUST ATTENTION** run this against your own draft findings and recommendations BEFORE emitting them. Any hit invalidates the reasoning, not just the wording.

1. You picked the technology before stating the requirement.
2. You cannot name what your recommendation SACRIFICES.
3. You are designing for a scale you cannot evidence.
4. You are adding a layer/abstraction with no named quality attribute it buys.
5. You say "best practice" instead of naming the forces it balances.
6. You are copying a pattern from a company whose constraints you do not share.
7. You are splitting a service because the codebase "feels big".
8. You are treating a two-way door as if it were irreversible (analysis paralysis) — or a one-way door as if it were casual (the more expensive error).
9. Your consistency model is "whatever the ORM does".
10. You have no idea what breaks first under load.
11. You would not be able to explain this decision to the person who maintains it in two years.

### 20.4 The judgments that actually separate levels

**When to add complexity** (evidence, not anticipation) · **when to split** (proven trigger, not size) · **when consistency can be relaxed** (per read path, with a measured staleness budget) · **when to buy vs build** (core domain builds; generic subdomains buy) · **when GOOD ENOUGH is correct** (shipping a simpler design that meets the quantified attributes is the senior move, not a compromise).

### 20.5 The seven questions any system design must answer

> **MUST ATTENTION** this is a COMPLETENESS checklist, not a workflow. Like §20.1–§20.4 it owns no procedure and implies no ordering: it tells you WHAT must be answered, never in WHAT ORDER to answer it. **Where a consuming skill declares its own step sequence, that sequence wins** — `architecture --mode=design`, for one, deliberately settles Data & Consistency (Step 3C) BEFORE Integration & API (Step 3D), and NOTHING here overrides it. Treat an unanswered item as a gap to close, not a stage to run.

- **Scope clarified?** — functional scope, then the quantified quality attributes, with every assumption stated explicitly.
- **Sized?** — traffic, data volume, read:write ratio, peak-to-average multiple, growth horizon.
- **Data modelled?** — entities, access patterns, ownership, and the store choice DERIVED from the access pattern.
- **Contract defined?** — the external surface, and what it constrains for every consumer.
- **Design sketched?** — components, their interactions, and sync vs async at each boundary.
- **First bottleneck identified?** — what breaks FIRST, and the specific tactic (§2) that moves it.
- **Failure, operations and cost interrogated?** — failure modes and blast radius, observability, deploy/rollback, unit economics — plus a named statement of what the design trades away.

---

## Closing Reminders

1. **Architecture = decisions expensive to reverse.** Rank by reversibility FIRST; ADR every one-way door with its rejected alternatives and its revisit trigger.
2. **Quantified quality attributes select the structure** — never preference or fashion. Name what you SACRIFICE or you have decided nothing.
3. **Topology follows boundaries and measured requirements.** A modular monolith can fit a product with one release boundary and no evidenced need for independent deployment, scaling, compliance, availability, ownership, or runtime. Preserve a justified brownfield topology; split only for a named, measured boundary.
4. **Coupling is the currency** — judge code, temporal, semantic and deployment coupling SEPARATELY; the distributed monolith is low on the first and high on the other three.
5. **A rule not enforced by a fitness function is a suggestion** and will be violated within a quarter.
6. **Every anti-pattern match is a HYPOTHESIS** until `file:line`/config/topology evidence plus the damaged quality attribute are named. The project's own docs and accepted ADRs OUTRANK this catalog.
7. **Prescribe the TACTIC, never the product** (§2) — and for any hard-to-reverse decision, **design it TWICE** before choosing (§4). A first-idea design with no rejected alternative has not been decided.
8. **Name the isolation level and the coordination primitive's failure mode** — "we use transactions" and "we take a lock" are not designs until the level, the fencing token and the expiry behaviour are stated (§8, §9).
9. **Run §20 before emitting anything:** the 15 pre-decision questions (§20.1), the design-review script (§20.2), and — against your OWN draft findings — the 11 thinking red flags (§20.3). A recommendation whose sacrifice you cannot name FAILS §20.3 and must not ship.
