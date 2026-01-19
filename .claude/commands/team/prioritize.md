---
name: prioritize
description: Prioritize backlog items using a specified framework
allowed-tools: Read, Write, Edit, Grep, Glob
arguments:
  - name: framework
    description: Prioritization framework (rice, moscow, value-effort)
    required: false
    default: rice
  - name: scope
    description: all | sprint | feature-{name}
    required: false
    default: all
---

# Prioritize Backlog

Order Product Backlog Items using prioritization frameworks.

## Pre-Workflow

### Activate Skills

- Activate `product-owner` skill for prioritization frameworks (RICE, MoSCoW, Value/Effort)

## Workflow

1. **Load PBIs**
   - Read all PBIs from `team-artifacts/pbis/`
   - Filter by scope if specified
   - Exclude done/rejected items

2. **Apply Framework**

   **RICE Score:**
   ```
   For each PBI, estimate:
   - Reach: # users per quarter
   - Impact: 0.25 | 0.5 | 1 | 2 | 3
   - Confidence: 0.5 | 0.8 | 1.0
   - Effort: Person-weeks

   Score = (R × I × C) / E
   ```

   **MoSCoW:**
   ```
   Classify each PBI:
   - Must Have: Release blocker
   - Should Have: Important, not critical
   - Could Have: Nice to have
   - Won't Have: Not this release
   ```

   **Value vs Effort:**
   ```
   Plot on 2x2 matrix:
   - Quick Wins: High value, low effort (do first)
   - Strategic: High value, high effort (plan carefully)
   - Fill-ins: Low value, low effort (if time permits)
   - Time Sinks: Low value, high effort (avoid)
   ```

3. **Generate Ordered List**
   - Sort by score/classification
   - Assign numeric priority (1 = highest)

4. **Update PBIs**
   - Update `priority` field in each PBI frontmatter

5. **Output Report**
   ```markdown
   ## Backlog Priority - {Date}

   **Framework:** {framework}
   **Scope:** {scope}

   | Rank | PBI | Score | Rationale |
   |------|-----|-------|-----------|
   | 1 | {title} | {score} | {why} |
   ```

## Example

```bash
/prioritize rice
/prioritize moscow scope:sprint
```
