# Confidence Scoring & No-Hallucination Gates

## Scoring Rubric

| Scenario | Max Confidence | Action |
|----------|---------------|--------|
| ≥3 signals with grep evidence (`file:line`) | 95-100% | Report as confirmed match |
| 2 signals with grep evidence | 85-95% | Report as confirmed match |
| 1 grep-verified + 1 inferred signal | 60-75% | Show candidates, note uncertainty |
| 1 signal only (grep-verified) | 50-70% | Show candidates, ask user |
| All inferred, no grep evidence | 0-49% | **HALT — do NOT claim any match** |

## Weight Calculation

```
Total = (text_match × 0.30) + (bem_match × 0.25) + (material_match × 0.20)
      + (layout_match × 0.10) + (color_match × 0.10) + (data_match × 0.05)
```

Each signal scores 0% (no match) or its full weight (matched with grep evidence).

**Both rules apply simultaneously (hard floors):**
1. **Weight sum** determines the raw score from the formula above
2. **Signal count minimum** caps the maximum reportable confidence:
   - 1 grep-verified signal → capped at 70% (even if weight sum is higher)
   - 2 grep-verified signals → uncapped, ≥85% achievable
   - ≥3 grep-verified signals → 95-100% achievable
3. **Final confidence** = min(weight sum, signal-count cap)

These rules are complementary: the weight formula scores HOW WELL signals match,
the signal-count minimum ensures ENOUGH independent evidence exists.

## 5 Mandatory Verification Gates

### Gate 1: SIGNAL_REALITY_CHECK
Before searching:
- "Am I reading text that ACTUALLY exists in the screenshot?"
- "Is this static template text, or dynamic data?"
- Rule: Only grep static labels. Skip dynamic data (names, dates, counts).

### Gate 2: MATCH_EVIDENCE_REQUIREMENT
For every claimed match:
- "I matched X because signal Y found at `file:line`" — cite ACTUAL grep result
- Minimum 2 independent signals must corroborate for ≥85%
- Single-signal: capped at 70%

### Gate 3: FALSE_POSITIVE_CHECK
After finding a candidate:
- Grep the SAME signals across ALL component templates
- If multiple components match → report ALL, don't pick one
- "Are there OTHER components with the same text/widgets?"

### Gate 4: COMPOSITION_VERIFICATION
When building component graph:
- "Does the template at `file:line` ACTUALLY contain `<child-selector>`?"
- Read actual HTML for each parent-child edge
- NEVER infer from TS imports or module declarations

### Gate 5: CONFIDENCE_HONEST_REPORTING
Before final report:
- "Is my score based on grep evidence, or intuition?"
- Each signal score MUST cite a specific grep result
- Any "inferred but not found" signal → cap total at 70% (1-verified cap)
- If total <85% → show candidates with breakdown, ask user

## HALT Conditions

**STOP and ask user if:**
- No text signal matches any template (0 grep hits)
- All signals are inferred, none verified
- Two components match equally well
- Screenshot appears to be from a different app or unrecognized page

**HALT output format:**
```markdown
## No Confident Match Found

**Best candidates:**
| Component | Confidence | Matched Signals | Missing Signals |
|-----------|-----------|-----------------|-----------------|
| X | 72% | text: "Search" | BEM: not found |
| Y | 68% | mat-table | text: no match |

**Ambiguity:** [explain what's unclear]
**Question:** Does this screenshot show [candidate A] or [candidate B]?
```
