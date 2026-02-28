# Evidence-Based Reasoning Protocol

> **MANDATORY** for all skills that modify code, review code, make architectural recommendations, or diagnose issues.
> Speculation is FORBIDDEN. Every claim must be backed by evidence.
> Ref: [CLAUDE.md](CLAUDE.md) Evidence-Based Reasoning section | [Anti-Hallucination Patterns](.claude/patterns/anti-hallucination-patterns.md) (optional deep-dive)

---

## Core Rules

1. **Evidence before conclusion** — Cite `file:line`, grep results, or framework docs. Never use "obviously...", "I think...", "this is because..." without proof.
2. **Confidence declaration required** — Every recommendation must state confidence level with evidence list.
3. **Inference alone is FORBIDDEN** — Always upgrade to code evidence (grep results, file reads). When unsure: *"I don't have enough evidence yet. Need to investigate [specific items]."*
4. **Cross-service validation** — Check all services in the project before recommending architectural changes.

## Pre-Claim Verification Checklist

For ANY statement claiming "This is wrong...", "This should be...", "The issue is...", "This needs to change...":

**You are BLOCKED until you provide:**

- [ ] **Evidence File Path** — `file:line` format
- [ ] **Grep Search Performed** — command + result count
- [ ] **Similar Pattern Found** — 3+ examples in codebase
- [ ] **Framework Documentation** — cited if claiming framework behavior
- [ ] **Confidence Level** — X% with evidence list

**If checklist incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]. Investigate further?"`

## Forbidden Phrases (without evidence)

| Forbidden | Evidence-Based Alternative |
|-----------|--------------------------|
| "should be public/private" | "Grep shows N similar methods at [files]" |
| "the order matters" | "Framework docs at [URL] specify..." |
| "this is because..." | "Evidence from [file:line] shows..." |
| "obviously..." / "I think..." | "Based on [evidence], confidence: X%" |
| "probably..." / "usually..." | "Found in N/M cases: [pattern]" |

## Confidence Levels

| Level | Criteria | Action |
|-------|----------|--------|
| **95-100%** | Full trace, all checklist items verified, all services checked | Recommend freely |
| **80-94%** | Main paths verified, some edge cases unverified | Recommend with caveats |
| **60-79%** | Implementation found, usage partially traced | Recommend cautiously |
| **<60%** | Insufficient evidence | **DO NOT RECOMMEND** — gather more evidence |

**Format:** `Confidence: 85% — Verified main usage in [service], did not check [other services]`

**When < 80%:** List what's verified vs. unverified, ask user before proceeding.

## Breaking Change Risk Matrix

| Risk | Criteria | Required Evidence |
|------|----------|-------------------|
| **HIGH** | Removing registrations, deleting classes, changing interfaces | Full usage trace + impact analysis + all services |
| **MEDIUM** | Refactoring methods, changing signatures | Usage trace + test verification + all services |
| **LOW** | Renaming, formatting, comments | Code review only |

## Validation Chain (for code removal/refactoring/replacement)

Before recommending changes, complete this chain — skip none:

1. **Find ALL implementations** — `grep "class.*:.*IInterfaceName" --include="*.cs"`
2. **Trace ALL registrations** — `grep "AddScoped.*IName|AddSingleton.*IName" --include="*.cs"`
3. **Verify ALL usage sites** — injection points, method calls
4. **Check all services** — verify across every service in the project
5. **Assess impact** — what breaks if removed?
6. **Declare confidence** — X% based on [evidence list]

**If ANY step incomplete → STOP. State "Insufficient evidence."**

## Code Removal Checklist

Before recommending removal of ANY code:

- [ ] No static references (`grep -r "ClassName"` returns 0)
- [ ] No string literals or dynamic invocations (reflection, factories, message bus)
- [ ] No DI container registrations (`services.Add*<ClassName>`)
- [ ] No configuration references (appsettings.json, env vars)
- [ ] No test dependencies
- [ ] Cross-service impact checked (all microservices)

## Investigation Patterns

- **Service comparison:** Find working reference → compare implementations → verify differences → recommend based on proven pattern.
- **Use `/investigate` skill** for: removing registrations/classes, cross-service changes, "this seems unused" claims, breaking change assessment.

## Assumption Validation Checkpoint

Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

## Tool Efficiency

- Batch multiple Grep searches with OR patterns
- Use parallel Read for related files
- Combine semantic searches with related keywords

## Context Anchor

Every 10 operations:

1. Re-read original task description
2. Verify current operation aligns with goals
3. Check if solving the right problem

---

## See Also

- `.claude/patterns/anti-hallucination-patterns.md` — Comprehensive examples and verification commands (optional deep-dive)
- `.claude/skills/shared/understand-code-first-protocol.md` — Read-before-write protocol
- `CLAUDE.md` "Evidence-Based Reasoning & Investigation Protocol" — Breaking change assessment (always in context)
