# Affirmative-Rewrite Rubric (Principles #10 + #11)

> **Canonical rubric** for the affirmative-directive + rationale enhancement pass.
> Embedded verbatim in every batch-subagent prompt (Phases 5-9) and applied by Phases 3-4.
> Source principles: `prompt-enhance/SKILL.md:294-295` (`SYNC:context-engineering-principles` #10/#11).

## The two principles (the only mandate)

- **#10 Affirmative Directives** — State the action to take, not only the action to avoid. A bare "don't X" leaves the correct action unspecified, so the model substitutes an arbitrary alternative. **Keep `NEVER`/forbidden guardrails for hard invariants — but pair each with the right path** ("Do X" not just "Don't do Y").
- **#11 Rationale-Carrying Instructions** — A rule shipped with its reason generalizes to edge cases the rule never enumerated and survives compression. Append a terse `— why: …` clause to every non-obvious rule. **The reason names the failure prevented or outcome wanted — it never restates the rule.**

## Triage gate — decide the class BEFORE editing

Every prohibition occurrence is class **A**, **B**, or **C**. Only B/C are edited; A is keep-verbatim (may only gain a positive path and/or a why).

| Class                    | Definition (machine rule)                                                                                                                                                                            | Action                                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — hard guardrail**   | Line contains an UPPERCASE guardrail token: `NEVER`, `MUST ATTENTION`, `MUST NOT`, `ALWAYS`, `MANDATORY`, `BLOCKING`, `HARD-GATE`. **Uppercase `NEVER`/`MUST ATTENTION` ⇒ class A unconditionally.** | KEEP the prohibition verbatim. You may ADD a positive path and/or a `— why:`. NEVER delete or downcase the guardrail.                                      |
| **B — soft prohibition** | Soft-cased `do not` / `don't` / `Do NOT` / `avoid` with **no** uppercase guardrail token on the line.                                                                                                | Rewrite to affirmative form. A non-empty `rewrite_justification` is MANDATORY (states why this was not a disguised invariant).                             |
| **C — missing why**      | Any non-obvious rule (A or B) with no `— why` / `because` / rationale clause.                                                                                                                        | Append a terse `— why: <failure prevented>`. Orthogonal to A/B — a row can be `A + missing-why` (keep + add why) or `B + missing-why` (rewrite + add why). |

> **Ambiguity default (validated):** if a line reads like a real invariant but lacks an uppercase token (e.g. `never work from memory alone`), pre-bucket it **B** but **rewrite-with-justification is required** — fill `rewrite_justification` explaining why it is safe to rephrase. Uncertain → rewrite + justify, never silently skip. An empty justification field BLOCKS the row.

## Affirmative phrasing patterns (B rewrites)

State the destination, then optionally the hazard. The action must be unambiguous on its own.

| ❌ Prohibition-only (B)                   | ✅ Affirmative (+ optional why)                                                                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| "Don't map in handlers."                  | "Map in the DTO via `MapToEntity()` — handlers stay mapping-free. — why: one mapping site, no drift."                                           |
| "Avoid manual signals."                   | "Use `PlatformVmStore` + `effectSimple()` for state. — why: manual signals bypass lifecycle teardown → leaks."                                  |
| "Do not skip reproduction."               | "Reproduce with evidence first (error/stack/screenshot), then isolate. — why: a fix without a repro can't be verified."                         |
| "Don't work from memory alone."           | "Re-read the analysis file before implementing. — why: memory drifts across long context; the file is ground truth."                            |
| "Avoid direct DB access across services." | "Cross-service reads go through the RabbitMQ message bus. — why: direct DB access couples services and breaks ownership."                       |
| "Do not assume the first hypothesis."     | "Verify each hypothesis against an actual code trace before acting. — why: the first guess is often the nearest-attention trap, not the cause." |

## Keep-NEVER criteria (class A — never soften)

Keep the prohibition verbatim when ANY holds:

- It is an UPPERCASE guardrail token (the machine rule above).
- It guards a hard invariant where the negative case is the whole point (security, data loss, irreversibility, cross-service contract).
- The forbidden action is a known, tempting AI failure mode (e.g. "NEVER fix at the crash site", "NEVER commit without asking").

For class A, the enhancement is ADDITIVE only: pair the `NEVER X` with the positive path (`— do Y instead`) and/or a `— why:`. The token count of guardrail lexemes must not drop.

## Terse-why format (#11)

- Form: `— why: <failure prevented or outcome wanted>`. One clause, lowercase after the dash, no period needed.
- The reason names a CONSEQUENCE, never restates the rule.
    - ❌ `— why: because you must use the repository` (restates rule)
    - ✅ `— why: generic repo skips service-scoped query filters → cross-tenant leak`
- Skip `— why` only when the reason is self-evident from the rule itself (truly obvious). When in doubt, add it.

## Density-preservation invariant (HARD)

- **Rule-density rule** (mirrors `prompt-enhance/SKILL.md:293`): per file, post-edit count of guardrail lexemes (`MUST ATTENTION`/`NEVER`/`ALWAYS`/`MANDATORY`/`BLOCKING`) **≥ pre-edit**, counted across **ALL casings** (`NEVER`/`Never`/`never`).
- **No casing downgrade:** a B-rewrite must not convert an UPPERCASE guardrail to lowercase as a side effect (that would evade the count).
- **Per-guardrail fingerprint:** each guardrail keeps its fingerprint (lexeme + following 6-8 tokens) unless its worksheet disposition is a justified `rewritten`. A specific guardrail vanishing under a stable total is a FAIL (Phase-10 set-diff).
- Affirmative rewrites should ADD signal (the positive path), so density typically rises, never falls.

## Scope guardrails

- Edit instruction PROSE only. NEVER edit: code fences, YAML frontmatter, file paths, code-literals (e.g. `=== 'never'`, `case 'never'`, enum keys, `@param` names).
- Edit only `local` rows in Phases 5-9. `sync_managed=y` rows are owned by the canonical source (Phase 3) or the hook REMINDERS/anchors (Phase 4) — fixing the copy would be overwritten on next propagation.

## Worked BAD → GOOD (full-line, in-context)

```
BAD:   > **NEVER** map entities in command handlers.
GOOD:  > **NEVER** map entities in command handlers — map in the DTO via `MapToEntity()`. — why: one mapping site prevents field drift across handlers.
       (class A: prohibition kept verbatim, positive path + why ADDED)

BAD:   - Avoid putting business logic in components.
GOOD:  - Place business logic in the entity/model (lowest layer); components only handle UI events. — why: logic in components duplicates across every consumer.
       (class B: rewritten affirmative + why; no uppercase token was present)

BAD:   > Do not skip steps.
GOOD:  > Execute steps in declared order. — why: skipped setup steps leave later steps acting on missing state.
       (class B: affirmative; "Do not" had no uppercase guardrail token)
```
