# Anti-Hallucination Patterns

> **One-sentence rule:** Never present a guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, and stay skeptical of your own confidence — certainty without evidence is the root of all hallucination.

> **Note:** The mandatory protocol is inlined via `SYNC:evidence-based-reasoning` blocks in skills. This file is the deep-dive reference.

---

## Evidence-Based Reasoning (MANDATORY)

Before making ANY claim: provide `file:line` evidence, grep results, or doc citations.

**If you cannot provide evidence → required output:**

```
Insufficient evidence to determine root cause.

What I've verified: [list]
What I haven't verified: [list]

Recommended next steps:
1. [specific action]
2. [specific action]
```

---

## Forbidden Phrases

| Forbidden                         | Why Dangerous               | Evidence-Based Alternative                                               |
| --------------------------------- | --------------------------- | ------------------------------------------------------------------------ |
| ❌ "should be public"             | Assumes visibility issue    | ✅ "Grep shows 12 similar private methods work fine at [files]"          |
| ❌ "the order matters"            | Assumes framework behavior  | ✅ "Framework docs at [URL] specify order requirements"                  |
| ❌ "need to configure both sides" | Assumes ORM requirement     | ✅ "45 FK configs use single-side pattern at [files]"                    |
| ❌ "this is because..."           | Claims causation            | ✅ "Evidence from [file:line] shows [concrete behavior]"                 |
| ❌ "obviously..."                 | Dismisses verification need | ✅ "Pattern found in 8 locations: [list files]"                          |
| ❌ "I think..."                   | Pure speculation            | ✅ "Based on [evidence], confidence: X%"                                 |
| ❌ "probably..."                  | Uncertain guess             | ✅ "Needs verification: [list what to check]"                            |
| ❌ "usually..."                   | Generalization              | ✅ "Found in 15/20 cases: [pattern description]"                         |
| ❌ "should be X instead of Y"     | Design flaw claim           | ✅ "Pattern X in N places, Y here — reason unknown, need to investigate" |

---

## Confidence Thresholds (MANDATORY)

| Confidence | Action                                                                    |
| ---------- | ------------------------------------------------------------------------- |
| < 60%      | **DO NOT RECOMMEND** — "Insufficient evidence. Need to check [X]"         |
| 60–79%     | Recommend with heavy caveats — "Need to verify X, Y, Z first"             |
| 80–94%     | Recommend with minor caveats — "Verified main pattern, edge cases remain" |
| 95–100%    | Strong recommendation — "Full evidence chain, all services checked"       |

**Format for any architectural recommendation:**

```
Confidence: X%
Evidence: [file:line] — [what it shows]
Unverified: [list]
Risk if wrong: [what breaks]
```

---

## Common Hallucination Patterns

### 1. Visibility Speculation

**Hallucination:** "Method not working because it's private, should be public"
**Truth:** C# access modifiers don't affect intra-class execution. Private helpers are idiomatic.
**Fix:** Grep for `private.*async Task` in the service. Count occurrences. If >5 exist and work, visibility is not the issue.

### 2. Framework Behavior Guesses

**Hallucination:** "Parameter order matters in dependency injection"
**Truth:** .NET DI matches by type, not position.
**Fix:** Find 2+ constructors with varied parameter orders that work. Cite [docs.microsoft.com DI docs].

### 3. ORM Configuration Assumptions

**Hallucination:** "Must configure FK relationship from both sides"
**Truth:** EF Core requires one-side configuration only.
**Fix:** Grep `HasOne.*WithMany.*HasForeignKey` — count one-way vs two-way. In this codebase it's 45:0.

### 4. "Should Be" Syndrome

**Hallucination:** "This should use Repository pattern"
**Fix:** "Found 12 similar components using Repository. This uses direct DbContext. Reason for difference: [investigate or admit unknown]."

---

## Evidence-First Response Pattern

❌ **Bad:**

```
The issue is that the method is private. It should be public.
```

✅ **Good:**

```
Let me verify visibility impact.
[grep -r "private.*async Task" src/Services/{ServiceName} --include="*.cs"]
Found 23 private async Task methods — all work fine (File1:45, File2:78).
Confidence: 95% visibility is NOT the issue.
```

---

## When to Say "I Don't Know"

Say it when:

- Haven't read the relevant files
- Can't find 3+ similar examples
- Confidence < 60%
- Unfamiliar with specific framework behavior

Format:

```
Confidence: 40% — this is speculation, not evidence.
Need to verify:
1. [specific check]
2. [specific check]
```

---

## Closing Reminders

- **MUST ATTENTION** cite `file:line` for every claim — NEVER state as fact without evidence
- **MUST ATTENTION** declare confidence level on every recommendation
- **MUST ATTENTION** if confidence < 60%, say so and list what to investigate — do NOT recommend
- **MUST ATTENTION** use the forbidden phrases table — speculative language signals unreliable output
- **MUST ATTENTION** "I don't know yet" beats a wrong guess every time
