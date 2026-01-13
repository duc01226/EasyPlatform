# Pattern Learning Documentation

> Learns user patterns from prompts and injects them contextually.

## Overview

Pattern Learning captures user corrections and preferences, storing them as patterns that are injected into future contexts. Unlike ACE (which learns from outcomes), Pattern Learning captures explicit user feedback.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       Pattern Detection                           │
│  (pattern-learner.cjs)                                           │
│  UserPromptSubmit: User corrections → learned-patterns/*.yaml    │
│                                                                   │
│  Detection keywords:                                             │
│  - Negation: "no,", "don't", "never", "avoid"                    │
│  - Redirection: "instead", "rather", "prefer"                    │
│  - Quality: "wrong", "incorrect", "should be"                    │
│  - Explicit: "/learn", "remember this", "always do"              │
└────────────────────────────────────────────────────────────────┬─┘
                                                                 │
                                                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Pattern Injection                          │
│  (pattern-injector.cjs)                                          │
│                                                                   │
│  Triggers:                                                       │
│  - SessionStart (startup|resume): Inject relevant patterns       │
│  - PreToolUse (*): Context-aware injection                       │
│                                                                   │
│  Scoring (weighted):                                             │
│  - File path match: 40%                                          │
│  - Category match: 20%                                           │
│  - Keyword match: 20%                                            │
│  - Tag match: 10%                                                │
│  - Confidence: 10%                                               │
└──────────────────────────────────────────────────────────────────┘
```

## Hooks

| Hook | Trigger | Purpose |
|------|---------|---------|
| `pattern-learner.cjs` | UserPromptSubmit | Detect and save patterns |
| `pattern-injector.cjs` | SessionStart, PreToolUse | Inject matching patterns |

## Configuration (pattern-constants.cjs)

### Detection

| Constant | Value | Description |
|----------|-------|-------------|
| `MIN_PATTERN_SCORE` | 0.4 | Minimum score for detection |
| `MIN_PATTERN_CONFIDENCE` | 0.3 | Minimum initial confidence |
| `CONTEXT_BOOST_EDIT` | 0.2 | Boost when AI just edited |
| `CODE_BLOCK_BOOST` | 0.15 | Boost when code block present |

### Confidence

| Constant | Value | Description |
|----------|-------|-------------|
| `INITIAL_CONFIDENCE_IMPLICIT` | 0.3 | Initial confidence (detected) |
| `INITIAL_CONFIDENCE_EXPLICIT` | 0.6 | Initial confidence (`/learn`) |
| `CONFIDENCE_BOOST_CONFIRM` | 0.2 | Boost on confirmation (+20%) |
| `CONFIDENCE_PENALTY_CONFLICT` | 0.1 | Penalty on conflict (-10%) |
| `PRUNE_THRESHOLD` | 0.2 | Prune below 20% confidence |

### Decay

| Constant | Value | Description |
|----------|-------|-------------|
| `CONFIDENCE_DECAY_DAYS` | 30 | Days before decay starts |
| `CONFIDENCE_DECAY_RATE` | 0.05 | 5% decay per period |
| `PATTERN_ARCHIVE_RETENTION_DAYS` | 90 | Archive retention |

### Injection

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_PATTERN_INJECTION` | 5 | Max patterns per context |
| `PATTERN_TOKEN_BUDGET` | 400 | Token budget |
| `MIN_RELEVANCE_SCORE` | 0.3 | Minimum relevance for injection |
| `CONFIDENCE_INJECTION_THRESHOLD` | 0.4 | Minimum confidence for injection |

## Storage

Patterns stored in `.claude/learned-patterns/`:

```
learned-patterns/
├── backend.yaml      # Backend (C#, API) patterns
├── frontend.yaml     # Frontend (TS, Angular) patterns
├── workflow.yaml     # Workflow (hooks, CI) patterns
├── general.yaml      # Uncategorized patterns
├── index.yaml        # Pattern index/metadata
└── archive/          # Archived (pruned) patterns
```

### Pattern Schema (YAML)

```yaml
patterns:
  - id: "pat_abc123"
    content: "Always use PlatformValidationResult for validation in command handlers"
    category: "backend"
    confidence: 0.8
    created: "2026-01-13T09:00:00Z"
    last_used: "2026-01-13T10:00:00Z"
    use_count: 5
    trigger:
      keywords: ["validation", "command", "handler"]
      file_patterns: ["*.cs", "*CommandHandler.cs"]
    source: "explicit"  # or "implicit"
```

## Pattern Matching Algorithm

When injecting patterns, the system calculates a relevance score:

```
relevance = (file_path_match * 0.4) +
            (category_match * 0.2) +
            (keyword_match * 0.2) +
            (tag_match * 0.1) +
            (confidence * 0.1)
```

### 1. File Path Match (40%)

```javascript
// Checks if current file matches pattern's file_patterns
// Uses glob-style matching: *.cs, **/*.component.ts
if (pattern.trigger.file_patterns.some(fp => minimatch(filePath, fp))) {
  score += 0.4;
}
```

### 2. Category Match (20%)

Categories inferred from file path:

| Category | File Patterns |
|----------|--------------|
| `backend` | `*.cs`, `*Handler.cs`, `*Repository.cs`, `*Controller.cs` |
| `frontend` | `*.ts`, `*.tsx`, `*.component.ts`, `*.store.ts`, `*.scss` |
| `workflow` | `*.cjs`, `*.yaml`, `hooks/`, `.github/`, `scripts/` |
| `general` | Everything else |

### 3. Keyword Match (20%)

```javascript
// Checks if current context contains pattern's keywords
const contextText = (prompt || description).toLowerCase();
if (pattern.trigger.keywords.some(kw => contextText.includes(kw))) {
  score += 0.2;
}
```

### 4. Tag Match (10%)

Tags extracted from:
- File path segments
- Filename words (camelCase/kebab-case split)
- Prompt keywords (4+ character words)

### 5. Confidence (10%)

Pattern's confidence score contributes 10% to relevance.

## Detection Keywords

### High Confidence Triggers

```javascript
CORRECTION_KEYWORDS = {
  negation: ['no,', "don't", 'never', 'avoid', 'stop', 'not like that'],
  redirection: ['instead', 'rather', 'use x not y', 'prefer', 'better to'],
  quality: ['wrong', 'incorrect', 'mistake', 'should be', 'actually'],
  explicit: ['/learn', '/remember', 'remember this', 'always do']
};
```

### Keyword Weights

```javascript
KEYWORD_WEIGHTS = {
  negation: 0.3,
  redirection: 0.35,
  quality: 0.25,
  explicit: 1.0  // /learn commands always trigger
};
```

### Ignored Patterns (False Positives)

```javascript
IGNORE_PATTERNS = [
  /\?$/,                      // Questions
  /^(can you|could you)/i,    // Requests
  /^(what|how|where|when)/i,  // Questions
  /^(yes|ok|sure|thanks)/i,   // Confirmations
  /^(please|help)/i           // Polite requests
];
```

## Lib Modules

| Module | Purpose |
|--------|---------|
| `pattern-constants.cjs` | Configuration constants |
| `pattern-detector.cjs` | Detects patterns in prompts |
| `pattern-extractor.cjs` | Extracts pattern content |
| `pattern-matcher.cjs` | Relevance scoring |
| `pattern-storage.cjs` | YAML read/write operations |

## Usage Examples

### Explicit Pattern Learning

```
User: /learn Always use async/await instead of .then() chains in this project
```

Creates pattern with `confidence: 0.6` (explicit), triggers on `async`, `await`, `then`.

### Implicit Pattern Detection

```
User: No, don't use HttpClient directly. Always extend PlatformApiService.
```

Detected via "No, don't" (negation), creates pattern with `confidence: 0.3`.

### Pattern Injection

When editing `user.service.ts`:
```markdown
## Learned Patterns (5 relevant)

- **API Services**: Always extend PlatformApiService, never use HttpClient directly
- **Subscriptions**: Always use .pipe(this.untilDestroyed()) for cleanup
```

## Relationship to ACE

| Aspect | Pattern Learning | ACE |
|--------|-----------------|-----|
| **Source** | User prompts/corrections | Tool execution outcomes |
| **Detection** | Keyword-based | Outcome-based |
| **Storage** | `learned-patterns/*.yaml` | `memory/deltas.json` |
| **Injection timing** | SessionStart + PreToolUse | SessionStart only |
| **Confidence model** | Time-decay based | Event-weighted |

Both systems complement each other:
- Pattern Learning: "What user explicitly taught"
- ACE: "What worked in practice"

## Debugging

View all patterns:
```bash
cat .claude/learned-patterns/backend.yaml
```

Check pattern index:
```bash
cat .claude/learned-patterns/index.yaml
```

View injected patterns (in session):
```bash
# Patterns injected are shown at session start
# Check Claude's context for "## Learned Patterns" section
```

---

*See also: [ACE System](../ace/) for outcome-based learning*
