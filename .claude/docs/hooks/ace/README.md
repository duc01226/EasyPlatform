# ACE (Agentic Context Engineering) System

> Self-learning system that captures execution patterns and injects learned context.

## Overview

ACE observes Claude Code execution, extracts successful patterns as "deltas", and injects them into future sessions. This enables Claude to learn from past interactions without requiring explicit user training.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Event Capture                              │
│  (ace-event-emitter.cjs)                                         │
│  PostToolUse: Bash|Skill → events-stream.jsonl                   │
└────────────────────────────────────────────────────────────────┬─┘
                                                                 │
                                                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Reflection Analysis                         │
│  (ace-reflector-analysis.cjs)                                    │
│  PreCompact: events-stream.jsonl → delta-candidates.json         │
└────────────────────────────────────────────────────────────────┬─┘
                                                                 │
                                                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                         Curation & Pruning                        │
│  (ace-curator-pruner.cjs)                                        │
│  PreCompact: delta-candidates.json → deltas.json                 │
│  - Promotes candidates with confidence ≥ 80%                     │
│  - Enforces max 50 deltas limit                                  │
│  - Deduplicates (85% similarity threshold)                       │
│  - Prunes stale patterns (90 days, <20% success rate)            │
└────────────────────────────────────────────────────────────────┬─┘
                                                                 │
                                                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Session Injection                          │
│  (ace-session-inject.cjs)                                        │
│  SessionStart: deltas.json → context (500 tokens max)            │
└──────────────────────────────────────────────────────────────────┘
```

## Hooks

| Hook | Trigger | Purpose |
|------|---------|---------|
| `ace-event-emitter.cjs` | PostToolUse (Bash\|Skill) | Captures execution events |
| `ace-reflector-analysis.cjs` | PreCompact | Extracts delta candidates |
| `ace-curator-pruner.cjs` | PreCompact | Promotes/prunes deltas |
| `ace-session-inject.cjs` | SessionStart (startup\|resume) | Injects deltas |
| `ace-feedback-tracker.cjs` | PostToolUse (Skill), UserPromptSubmit | Tracks effectiveness |

## Configuration (ace-constants.cjs)

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_DELTAS` | 50 | Maximum active deltas |
| `CONFIDENCE_THRESHOLD` | 0.80 | Minimum confidence for promotion |
| `SIMILARITY_THRESHOLD` | 0.85 | Deduplication threshold |
| `STALE_DAYS` | 90 | Days before age-based pruning |
| `PRUNE_MIN_SUCCESS_RATE` | 0.20 | Minimum success rate (20%) |
| `MAX_INJECTION_TOKENS` | 500 | Token budget for injection |
| `HUMAN_WEIGHT` | 3.0 | Weight for explicit feedback |
| `OUTCOME_WEIGHT` | 1.0 | Weight for implicit outcomes |

## Storage

| File | Purpose |
|------|---------|
| `.claude/memory/events-stream.jsonl` | Raw event stream (JSONL format) |
| `.claude/memory/delta-candidates.json` | Candidate patterns pending promotion |
| `.claude/memory/deltas.json` | Active playbook (promoted patterns) |
| `.claude/memory/.ace-injection-tracking.json` | Tracks which deltas were injected per session |

## Data Flow

### 1. Event Capture (`ace-event-emitter.cjs`)

Captures tool execution results to event stream:

```jsonl
{"timestamp":"2026-01-13T09:00:00Z","tool":"Skill","name":"commit","outcome":"success","duration_ms":1234}
{"timestamp":"2026-01-13T09:01:00Z","tool":"Bash","command":"npm test","exit_code":0}
```

**Triggers**: PostToolUse for Bash and Skill tools.

### 2. Reflection Analysis (`ace-reflector-analysis.cjs`)

Analyzes event stream during compaction, extracts patterns:

- Groups related events by session/task
- Identifies successful patterns (exit_code 0, explicit success markers)
- Generates delta candidates with initial confidence

**Triggers**: PreCompact (manual|auto).

### 3. Curation (`ace-curator-pruner.cjs`)

Manages playbook quality:

**Promotion criteria**:
- Confidence ≥ 80%
- Not a duplicate of existing delta (< 85% similarity)

**Pruning criteria**:
- Age > 90 days
- Success rate < 20% (after 10+ events)

**Deduplication**:
Uses string similarity on delta content. Merges similar deltas, combining confidence scores.

### 4. Injection (`ace-session-inject.cjs`)

Injects top deltas at session start:

```markdown
## ACE Learned Patterns

> Patterns learned from previous executions (auto-generated).

- **When:** Working with C# files
  **Pattern:** Always use PlatformValidationResult for validation
```

**Budget**: ~500 tokens (2000 characters).

**Matching**: Filters by condition field:
- Skill conditions (e.g., "when using /commit")
- File pattern conditions (e.g., "*.cs files")
- Defaults to including if no specific condition

## Confidence Calculation

```
confidence = (helpful_count * HUMAN_WEIGHT + outcome_success * OUTCOME_WEIGHT) /
             (total_events * max(HUMAN_WEIGHT, OUTCOME_WEIGHT))
```

Where:
- `helpful_count`: Explicit user confirmations
- `outcome_success`: Implicit success (exit code 0, no errors)
- `HUMAN_WEIGHT`: 3.0 (explicit feedback weighted 3x)
- `OUTCOME_WEIGHT`: 1.0

## Lib Modules

| Module | Purpose |
|--------|---------|
| `ace-constants.cjs` | Configuration constants |
| `ace-lesson-schema.cjs` | Delta/lesson data structures, formatting |
| `ace-outcome-classifier.cjs` | Classifies success/failure from events |
| `ace-playbook-state.cjs` | Read/write operations for playbook files |
| `ace-sync-copilot.cjs` | Syncs deltas with GitHub Copilot instructions |
| `ar-candidates.cjs` | Candidate management |
| `ar-events.cjs` | Event stream processing |
| `ar-generation.cjs` | Delta content generation |

## Relationship to Pattern Learning

ACE and Pattern Learning are **complementary systems**:

| Aspect | ACE | Pattern Learning |
|--------|-----|------------------|
| **Source** | Tool execution outcomes | User prompts/corrections |
| **Detection** | Automatic (implicit) | User-triggered (explicit) |
| **Storage** | `memory/deltas.json` | `learned-patterns/*.yaml` |
| **Confidence** | Outcome-weighted | Decay-based |
| **Injection** | SessionStart only | SessionStart + PreToolUse |

ACE learns from "what worked", Pattern Learning learns from "what user corrected".

## Debugging

Enable debug logging:
```bash
CK_DEBUG=1 claude
```

Check injection log:
```bash
cat .claude/memory/ace-injection.log
```

View active deltas:
```bash
cat .claude/memory/deltas.json | jq '.deltas[:5]'
```

---

*See also: [Pattern Learning](../patterns/)*
