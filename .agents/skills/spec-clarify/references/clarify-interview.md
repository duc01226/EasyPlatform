# Spec-Clarify Interview Catalog

> Loaded by `spec-clarify` Step 2 (Hypothesis & decision audit) and Step 4 (Clarification gate).
> This file is the **category catalog** the interview walks, the **per-context audit matrix** that
> decides which categories fire, and the **budget defaults** used when no `Spec Validation:` line is injected.
> Keep it in sync with `SKILL.md` — it carries detail; `SKILL.md` carries the workflow and gates.

## How the interview uses this catalog

1. Resolve the validation **context** (Phase-0 of `SKILL.md`): `AUTHORED-SPEC` | `EXISTING-SPEC` | `TEST-SPEC`.
2. Resolve the **budget** `MIN-MAX`: read the injected `Spec Validation: questions=MIN-MAX` line; fall back to
   the per-context default below when absent (standalone run).
3. Walk **every category whose applicability is ✅ or ◑ for the detected context** (the per-context matrix). For
   each, run the audit prompts to surface encoded assumptions / defaults / scope-boundaries / ambiguities.
4. Classify each surfaced item **OBVIOUS / NON-OBVIOUS / CONFLICTS** (per `SKILL.md` Step 2). OBVIOUS items are
   documented-and-proceeded; **NON-OBVIOUS + CONFLICTS + high-impact** items become gate questions.
5. Take gate questions to the user via a direct user question: **ask ≥MIN when ≥MIN real decisions exist**, never
   exceed MAX, ≤4 options per call, recommended option first, issue multiple calls when there are >4 decisions.
   When fewer than MIN genuine decisions exist, ask only the genuine ones and record "below-MIN: only N real
   decisions surfaced" — NEVER invent filler questions to hit MIN.

> **Coverage, not volume.** The goal is to _probe every applicable category_ (breadth) and surface every decision
> that would change the spec — bounded by the budget so the user is never fatigued by low-value or invented
> questions. Breadth of probing is mandatory; question count is capped.

## Budget defaults (when `Spec Validation: questions=MIN-MAX` is absent)

| Context         | Default MIN-MAX | Rationale                                                                                        |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------ |
| `AUTHORED-SPEC` | `5-10`          | A freshly-authored §1-8 encodes the most unconfirmed author assumptions → widest audit.          |
| `EXISTING-SPEC` | `4-8`           | A canonical §1-8 is already vetted; validate the decisions that drive decomposition before PBIs. |
| `TEST-SPEC`     | `3-6`           | A refined-idea + §8 TC set is narrower; validate coverage + implied-rule decisions.              |

Workflow `injectContext` overrides these per flow (Phase 02 supplies `questions=5-10` / `3-6` / `4-8`). The
injected line wins; the table is the standalone fallback.

## Per-context audit matrix

Legend: ✅ always probe · ◑ probe when present/relevant · ▫ usually out of scope (probe only if a signal appears).

| #   | Category                                 | §ref      | AUTHORED-SPEC | EXISTING-SPEC | TEST-SPEC |
| --- | ---------------------------------------- | --------- | ------------- | ------------- | --------- |
| 1   | Scope & Boundaries                       | §1        | ✅            | ✅            | ◑         |
| 2   | Actors, Roles & Permissions              | §7        | ✅            | ✅            | ◑         |
| 3   | Business Rules & Invariants              | §4/§5     | ✅            | ✅            | ✅        |
| 4   | Data Model, Lifecycle & States           | §5        | ✅            | ✅            | ◑         |
| 5   | Process Flows, Edge & Error cases        | §6        | ✅            | ✅            | ◑         |
| 6   | Acceptance-Criteria completeness         | §3        | ✅            | ✅            | ◑         |
| 7   | Test-Case coverage (presence/scope only) | §8        | ◑             | ◑             | ✅        |
| 8   | Cross-Spec Conflicts & Overlaps          | landscape | ✅            | ✅            | ✅        |
| 9   | Non-Functional & Constraints             | §1/§4     | ◑             | ◑             | ▫         |

- **AUTHORED-SPEC** — full §1-8 audit; every author assumption is a candidate. Widest matrix.
- **EXISTING-SPEC** — weight the categories that DRIVE decomposition (§3 US/AC, §4 BR, §5 ERD, §6 flows, §7 perms,
  §8 TCs); the spec is canonical input, so validate decisions before PBIs, do NOT re-author (confirmed changes
  route via `$spec [mode=update]`).
- **TEST-SPEC** — center on refined-idea coverage, §8 TC decisions, and implied rules the §8 set assumes but no
  §4 rule states yet (idea-to-pbi deep mode has no §1-7 draft).

## Category catalog

For each category: **Audits** (what decision space it covers) and **Audit prompts** (questions to ASK YOURSELF to
surface encoded decisions — each surfaced decision that is NON-OBVIOUS/CONFLICTS/high-impact becomes a gate question).

### 1. Scope & Boundaries (§1 Overview)

- **Audits:** what is in vs out of scope; the boundary the feature stops at; which adjacent capability owns the rest.
- **Audit prompts:** What did the author silently exclude? Is any "out of scope" line actually a decision the user
  must confirm? Where does this feature hand off to an adjacent capability — is that hand-off boundary deliberate?
  Does the scope match the originating idea, or did it narrow/widen without confirmation?

### 2. Actors, Roles & Permissions (§7)

- **Audits:** who can perform each operation; default-deny vs default-allow; role inheritance; unauthenticated access.
- **Audit prompts:** Every operation — which role(s) may invoke it, and was that assigned or assumed? Any operation
  with no §7 permission line (silent default)? Does any role here conflict with a role an adjacent spec already
  defines? Is there an admin/override path the spec doesn't state?

### 3. Business Rules & Invariants (§4 BR / §5 invariants)

- **Audits:** each `[HARD]`/`[SOFT]` rule; invariants the feature must ESTABLISH and invariants it must RESPECT
  (from domain-analysis / adjacent specs); rule boundaries and thresholds.
- **Audit prompts:** Is each `[HARD]` marker correct, or is a `[SOFT]` actually hard (or vice versa)? Every threshold
  / limit / window — was the exact value confirmed or guessed? Any existing invariant from the landscape this rule
  could violate? Any rule whose boundary (`<` vs `<=`, inclusive/exclusive) is unstated?

### 4. Data Model, Lifecycle & States (§5)

- **Audits:** entity states and transitions; what is persisted; uniqueness/identity; deletion/archival semantics;
  optionality of fields.
- **Audit prompts:** What states can an entity be in, and is every transition (including failure/rollback) defined?
  Is delete hard or soft? Which fields are required vs optional, and was that confirmed? Any identity/uniqueness
  rule assumed but not stated? Does the lifecycle agree with the adjacent spec that shares this entity?

### 5. Process Flows, Edge & Error cases (§6)

- **Audits:** the happy path; each branch; concurrency/ordering; partial-failure and retry behavior; idempotency.
- **Audit prompts:** For each flow, what happens on the unhappy branch — is it specified or assumed? Concurrent
  callers / out-of-order events — defined? What is the partial-failure state, and is it recoverable? Is any
  operation assumed idempotent without saying so?

### 6. Acceptance-Criteria completeness (§3 US/AC)

- **Audits:** every user story has testable ACs; ACs cover negative/edge paths; no story the idea implies is missing.
- **Audit prompts:** Does each story the idea implies exist? Does each story have an AC for the failure path, not
  only success? Is any AC vague ("works correctly") rather than mechanically verifiable? Any AC that encodes a
  default value the user never confirmed?

### 7. Test-Case coverage — presence/scope only (§8)

- **Audits:** each implied operation + its edge cases has a §8 TC; each `[HARD]` §4 rule has at least one §8
  property/invariant TC. **CROSS-CHECK that the TC exists — do NOT audit TC quality here.**
- **Audit prompts:** Which implied operation or edge case has no §8 TC at all? Which `[HARD]` rule has no covering
  property TC? (Defer universal-quantification / boundary-counter-case / mutation depth to
  `review-artifact --type=spec-tests` — surfacing a _missing_ TC is in scope; judging an _existing_ TC's rigor is not.)

### 8. Cross-Spec Conflicts & Overlaps (discovered landscape)

- **Audits:** behaviors an adjacent/related spec already owns; duplicate or contradictory rules; shared entities;
  forward-impact on affected specs.
- **Audit prompts:** Does any rule here duplicate or contradict a discovered spec's rule? Does this feature touch an
  entity another spec owns — are the two definitions consistent? Which affected specs change behavior because of
  this one, and is that intended? Every CONFLICTS-class item MUST go to the gate AND be reconciled.

### 9. Non-Functional & Constraints (§1/§4)

- **Audits:** performance/latency/volume expectations; retention; localization; compliance/audit; explicit
  technical constraints that belong in the spec as business constraints (tech-free framing).
- **Audit prompts:** Any volume/latency/retention assumption baked into a rule without confirmation? Any
  compliance/audit obligation the idea implies but the spec omits? (Probe only when a signal appears — usually ▫
  for TEST-SPEC.)

## Classification reminder (mirrors SKILL.md Step 2)

- **OBVIOUS** — a single reasonable reading any competent reader shares → document in the Decisions Log, proceed.
- **NON-OBVIOUS** — more than one defensible reading, or an unconfirmed default → gate question.
- **CONFLICTS** — disagrees with a discovered landscape spec or an existing invariant → gate question + reconcile.
- **When the class itself is unclear → default NON-OBVIOUS.** A silently-picked default ships a spec the user
  never agreed to; one confirmation round is cheaper than that failure.
