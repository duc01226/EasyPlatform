---
description: Prioritize backlog items using RICE, MoSCoW, or Value-Effort frameworks
argument-hint: [framework: rice|moscow|value-effort]
---

# Backlog Prioritization

Order backlog items using data-driven prioritization frameworks.

**Framework**: $ARGUMENTS

## Pre-Workflow

### Activate Skills

- Activate `prioritize` skill for RICE, MoSCoW, and Value-Effort frameworks
- Activate `product-owner` skill for backlog ordering best practices

## Workflow

### 1. Load Backlog Items

- Scan `team-artifacts/pbis/` for items with status `backlog` or `ready`
- Extract title, description, dependencies, and existing estimates

### 2. Select Framework

- **RICE** - Reach, Impact, Confidence, Effort scoring
- **MoSCoW** - Must/Should/Could/Won't categorization
- **Value-Effort** - 2x2 matrix (quick wins, big bets, fill-ins, avoid)
- If not specified, recommend based on item count and context

### 3. Score Items

- Apply framework criteria to each item
- Ask clarifying questions for missing data
- Calculate composite scores or categorizations

### 4. Generate Ranked List

- Order items by priority score
- Include rationale for top and bottom items
- Highlight dependencies that affect ordering

### 5. Save Output

- Save prioritized backlog to `team-artifacts/analysis/`

## Output

Ranked backlog with framework scores, rationale, and recommended sprint allocation.

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
