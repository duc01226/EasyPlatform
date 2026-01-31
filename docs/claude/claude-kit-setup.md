# Claude Kit Setup - Comprehensive Guide

> Complete documentation for the EasyPlatform Claude Code Kit configuration, ACE learning system, hooks, skills, agents, and workflow orchestration.

## Executive Summary

The `.claude/` directory contains a sophisticated Claude Code Kit that transforms Claude from a basic code assistant into an intelligent, self-improving development partner. Key capabilities:

- **ACE (Agentic Context Engineering)**: Self-learning system that captures patterns, learns from outcomes, and injects relevant knowledge into sessions
- **18 Specialized Agents**: Role-specific subagents for scouting, planning, debugging, reviewing, etc.
- **70+ Skills**: Domain-specific capabilities from backend development to AI prompting
- **Workflow Orchestration**: Intent detection with multilingual support, automatic workflow routing, and auto-checkpoints
- **Notification System**: Multi-provider alerts (Discord, Slack, Telegram) for task completion
- **Todo Enforcement**: Ensures planned, structured task execution
- **Memory Persistence**: Cross-session learning with delta management

---

## Directory Structure

```
.claude/
├── settings.json           # Main configuration (permissions, hooks, plugins)
├── settings.local.json     # Developer-specific overrides (gitignored)
├── settings.local.json.example # Template for local settings
├── workflows.json          # Workflow definitions with multilingual triggers
├── .ck.json               # Claude Kit project-specific settings
├── agents/                 # 18 specialized subagent definitions
│   ├── scout.md           # Codebase exploration
│   ├── planner.md         # Implementation planning
│   ├── code-reviewer.md   # Code quality assessment
│   ├── debugger.md        # Issue investigation
│   └── ...                # 14 more agents
├── config/                 # Configuration templates
│   ├── README.md          # Directory documentation
│   ├── release-notes-template.yaml  # Release notes structure
│   ├── skill-template.md  # Template for new skills
│   └── agent-template.md  # Template for new agents
├── hooks/                  # Event-driven processing
│   ├── ace-*.cjs          # ACE learning system hooks
│   ├── session-init.cjs   # Session initialization
│   ├── workflow-router.cjs # Intent detection
│   ├── todo-enforcement.cjs # Task tracking
│   ├── tool-output-swap.cjs # External memory swap hook
│   ├── config/            # Hook configurations
│   │   └── swap-config.json # Swap thresholds and limits
│   ├── notifications/     # Multi-provider notification system
│   │   ├── notify.cjs     # Main router
│   │   ├── lib/
│   │   │   ├── env-loader.cjs  # .env cascade loader
│   │   │   └── sender.cjs      # HTTP with throttling
│   │   └── providers/
│   │       ├── discord.cjs
│   │       ├── slack.cjs
│   │       └── telegram.cjs
│   └── lib/               # Shared utilities
│       ├── ace-constants.cjs
│       ├── ace-playbook-state.cjs
│       ├── ace-lesson-schema.cjs
│       ├── ace-outcome-classifier.cjs
│       └── swap-engine.cjs  # External memory swap engine
├── skills/                 # 70+ capability modules
│   ├── SKILL.md files     # Individual skill definitions
│   └── references/        # Skill reference documentation
├── playbooks/              # Playbook schemas
│   └── metadata.schema.json
├── memory/                 # Persistent learning storage
│   ├── deltas.json        # Active learned patterns
│   ├── delta-candidates.json
│   ├── events-stream.jsonl
│   └── archive/           # Historical data
├── scripts/                # Utility scripts
│   ├── resolve_env.py     # Environment resolution
│   ├── generate_catalogs.py
│   └── ...
└── workflows/              # Workflow guidelines
    └── development-rules.md
```

---

## ACE - Agentic Context Engineering

### Overview

ACE is a self-learning system that observes skill executions, extracts patterns from outcomes, and injects learned knowledge into future sessions. It creates a feedback loop where Claude becomes more effective over time.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ACE Learning Loop                             │
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐           │
│  │   Session    │    │    Skill     │    │   Event      │           │
│  │    Start     │───▶│  Execution   │───▶│   Emitter    │           │
│  └──────────────┘    └──────────────┘    └──────────────┘           │
│         ▲                                       │                    │
│         │                                       ▼                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐           │
│  │   Session    │◀───│   Curator    │◀───│  Reflector   │           │
│  │   Inject     │    │   Pruner     │    │   Analysis   │           │
│  └──────────────┘    └──────────────┘    └──────────────┘           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Components

#### 1. Event Emitter (`ace-event-emitter.cjs`)

**Hook**: PostToolUse (Bash|Skill tools)
**Output**: `.claude/memory/events-stream.jsonl`

Captures execution metadata for Skill and Bash tool invocations:

**Skill Events:**
- Skill name and arguments (sanitized)
- Outcome classification (success/failure/partial)
- Error type classification (validation, type, syntax, notFound, permission, timeout, network, memory)
- Severity level
- Duration and exit code
- Context (branch, workflow, file patterns)

**Bash Events:**
- Command summary (first word + subcommand for common tools)
- Intent classification (git, package, dotnet, nx, docker, kubernetes, http, filesystem, shell)
- Outcome and error classification
- Trivial command filtering (echo, pwd, which, whoami, date, env skipped)

```javascript
// Skill event structure
{
  "event_id": "evt_1736712000_abc123",
  "timestamp": "2025-01-12T12:00:00Z",
  "tool": "Skill",
  "skill": "cook",
  "outcome": "success",
  "error_type": null,
  "severity": 0,
  "duration_ms": 5000
}

// Bash event structure
{
  "event_id": "evt_1736712000_xyz789",
  "timestamp": "2025-01-12T12:00:00Z",
  "tool": "Bash",
  "command": "git status",
  "intent": "git",
  "outcome": "success",
  "exit_code": 0,
  "severity": 0
}
```

#### 2. Reflector Analysis (`ace-reflector-analysis.cjs`)

**Hook**: PreCompact (manual/auto)
**Input**: `events-stream.jsonl`
**Output**: `delta-candidates.json`

Analyzes accumulated events and extracts patterns:
- Groups events by skill + error_type
- Requires minimum 3 events for pattern (5 for analysis)
- Generates problem/solution/condition descriptions
- Calculates confidence scores
- Filters by 80% confidence threshold

```javascript
// Delta candidate structure
{
  "delta_id": "ace_1736712000_xyz",
  "problem": "cook skill encounters validation errors requiring input verification",
  "solution": "Verify all required inputs are provided and properly formatted before skill execution",
  "condition": "When using /cook skill",
  "helpful_count": 10,
  "not_helpful_count": 2,
  "confidence": 0.83
}
```

#### 3. Curator Pruner (`ace-curator-pruner.cjs`)

**Hook**: PreCompact (chained after reflector)
**Input**: `delta-candidates.json`
**Output**: `deltas.json`

Manages playbook quality:
- Promotes candidates with ≥80% confidence to active playbook
- Merges similar deltas (85% similarity threshold)
- Prunes stale deltas (>90 days old)
- Enforces max 50 active deltas
- Archives overflow to `archive/` directory

#### 4. Session Inject (`ace-session-inject.cjs`)

**Hook**: SessionStart (SessionStart:compact/SessionStart:resume)
**Input**: `deltas.json`
**Output**: Injects into session context

Injects learned patterns at session start:
- Loads top deltas sorted by confidence
- Limits to 500 tokens
- Formats as "ACE Learned Patterns" section
- Includes condition, problem, solution for each delta

```markdown
<!-- ACE Learned Patterns (3 active) -->
**When using /cook skill**: cook skill execution pattern showing reliable success
→ Continue using this skill pattern (100% success rate observed)
```

### Configuration Constants

```javascript
// .claude/hooks/lib/ace-constants.cjs
module.exports = {
  HUMAN_WEIGHT: 3.0,           // Human feedback worth 3x automated
  SIMILARITY_THRESHOLD: 0.85,  // 85% for duplicate detection
  CONFIDENCE_THRESHOLD: 0.80,  // 80% to promote to active
  MAX_DELTAS: 50,              // Maximum active patterns
  MAX_COUNT: 1000,             // Max feedback count per delta
  MAX_SOURCE_EVENTS: 10,       // Max source event IDs to store
  STALE_DAYS: 90,              // Days before auto-pruning
  LOCK_TIMEOUT_MS: 5000,       // File lock timeout
  MAX_INJECTION_TOKENS: 500    // Token budget for session inject
};
```

### State Management (`ace-playbook-state.cjs`)

Provides thread-safe operations:
- **File Locking**: Prevents race conditions with O_EXCL atomic lock creation
- **Atomic Writes**: Write to temp file → rename pattern for crash safety
- **Similarity**: Jaccard token overlap for delta deduplication
- **CRUD Operations**: loadDeltas, saveDeltas, loadCandidates, saveCandidates, archiveDeltas

---

## Hooks System

### Hook Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          HOOK LIFECYCLE FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ SESSION START                                                        │    │
│  │  ├── session-init.cjs ──────────► Set CK_* env vars, detect project │    │
│  │  ├── session-resume.cjs ────────► Restore todos after compact       │    │
│  │  └── ace-session-inject.cjs ───► Inject learned patterns (500 tok) │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ USER PROMPT SUBMIT                                                   │    │
│  │  ├── workflow-router.cjs ───────► Detect intent, route workflow     │    │
│  │  └── dev-rules-reminder.cjs ───► Inject development rules           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PRE TOOL USE (Before execution)                                      │    │
│  │  ├── todo-enforcement.cjs ─────► Block /cook without todos          │    │
│  │  ├── scout-block.cjs ──────────► Prevent wasteful queries           │    │
│  │  ├── privacy-block.cjs ────────► Filter sensitive files             │    │
│  │  └── *-context.cjs (4 hooks) ──► Inject domain patterns on edit:    │    │
│  │       ├── backend-csharp-context.cjs     (.cs files)                │    │
│  │       ├── frontend-typescript-context.cjs (.ts/.tsx)                │    │
│  │       ├── design-system-context.cjs      (UI work)                  │    │
│  │       └── scss-styling-context.cjs       (.scss files)              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│                            [TOOL EXECUTION]                                  │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ POST TOOL USE (After execution)                                      │    │
│  │  ├── todo-tracker.cjs ─────────► Track TodoWrite changes            │    │
│  │  ├── post-edit-prettier.cjs ──► Auto-format edited files            │    │
│  │  ├── workflow-step-tracker.cjs ► Track workflow progress            │    │
│  │  ├── ace-event-emitter.cjs ───► Log skill execution to JSONL        │    │
│  │  └── ace-feedback-tracker.cjs ► Track helpful/not-helpful signals   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PRE COMPACT (Before context compaction)                              │    │
│  │  ├── write-compact-marker.cjs ─► Mark compaction point              │    │
│  │  ├── save-context-memory.cjs ──► Persist todos before compact       │    │
│  │  ├── ace-reflector-analysis.cjs► Extract patterns from events       │    │
│  │  └── ace-curator-pruner.cjs ──► Promote/prune deltas                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ NOTIFICATION (Task completion)                                       │    │
│  │  └── notify.cjs ───────────────► Send Discord/Slack/Telegram alert  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Hook Quick Reference

| Hook | Count | Key Handlers |
|------|-------|--------------|
| SessionStart | 3 | session-init, session-resume, ace-session-inject |
| UserPromptSubmit | 2 | workflow-router, dev-rules-reminder |
| PreToolUse | 7 | todo-enforcement, scout-block, privacy-block, 4× context hooks |
| PostToolUse | 7 | todo-tracker, prettier, workflow-step, ace-event, ace-feedback, tool-output-swap, compact-suggestion |
| PreCompact | 4 | write-marker, save-memory, ace-reflector, ace-curator |
| Notification | 1 | notify.cjs (Discord/Slack/Telegram) |
| **Total** | **24** | Across 6 hook types |

### Hook Types

| Hook              | Trigger Event                    | Use Case                              |
|-------------------|----------------------------------|---------------------------------------|
| SessionStart      | New session begins               | Environment setup, pattern injection  |
| SubagentStart     | Subagent spawned                 | Context inheritance                   |
| UserPromptSubmit  | User sends message               | Workflow detection, todo enforcement  |
| PreToolUse        | Before tool execution            | Validation, logging                   |
| PostToolUse       | After tool execution             | Event capture, feedback tracking      |
| PreCompact        | Before context compaction        | Pattern analysis, playbook curation   |
| SessionEnd        | Session terminates               | Cleanup, final sync                   |
| Notification      | System notifications             | User feedback capture                 |

### Hook Configuration (settings.json)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": ["SessionStart:compact", "SessionStart:resume"],
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/ace-session-inject.cjs"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Skill",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/ace-event-emitter.cjs"
          }
        ]
      }
    ]
  }
}
```

### Key Hooks

#### session-init.cjs
- Detects project type (monorepo, npm, pip)
- Sets 30+ CK_* environment variables
- Injects coding level guidelines
- Outputs user assertions for context

#### workflow-router.cjs
- Pattern-based intent detection from user prompts
- Supports 5 languages (en, vi, zh, ja, ko)
- Routes to appropriate workflow sequence
- Tracks workflow state across messages

#### todo-enforcement.cjs
- Blocks implementation skills without active todos
- Allows research skills (scout, investigate, plan)
- Bypass with "quick:" prefix
- Ensures structured task execution

#### compact-suggestion.cjs
- Suggests `/compact` after 50 tool calls
- Tracks heavy tools: Bash, Read, Grep, Glob, Skill, Edit, Write, MultiEdit, WebFetch, WebSearch
- One-time suggestion per session (no spam)
- Auto-resets when /compact detected
- State: `.claude/.compact-state.json` via `lib/compact-state.cjs`
- Test: `CK_DEBUG=1 echo '{"tool_name":"Read"}' | node .claude/hooks/compact-suggestion.cjs`

#### code-review-rules-injector.cjs
- Auto-injects project-specific code review rules when running review skills
- Triggers on: `code-review`, `review-pr`, `review-changes`, `tasks-code-review` (and prefix variants)
- Rules file: `docs/code-review-rules.md` (external, not in `.claude/`)
- Config: `.claude/.ck.json` under `codeReview` section
- Test: `echo '{"tool_name":"Skill","tool_input":{"skill":"code-review"}}' | node .claude/hooks/code-review-rules-injector.cjs`

**Configuration (.claude/.ck.json):**
```json
{
  "codeReview": {
    "rulesPath": "docs/code-review-rules.md",
    "injectOnSkills": ["code-review", "review-pr", "review-changes", "tasks-code-review"],
    "enabled": true
  }
}
```

**To update code review rules:**
1. Edit `docs/code-review-rules.md` directly
2. Changes take effect immediately on next `/code-review` skill invocation
3. No hook restart required

---

## Notification System

### Overview

Multi-provider notification system that alerts users when Claude completes tasks or needs input. Supports Discord, Slack, and Telegram with automatic provider detection and smart throttling.

### Architecture

```
User → Claude Task → Notification Hook → notify.cjs
                                              │
                         ┌────────────────────┼────────────────────┐
                         ▼                    ▼                    ▼
                    Discord              Slack               Telegram
                   (webhook)           (webhook)            (Bot API)
```

### Configuration

1. Copy `.claude/hooks/notifications/.env.example` to `.claude/.env` or `~/.claude/.env`
2. Add credentials for your preferred provider(s)
3. Notifications auto-enable when credentials detected

### Environment Cascade

Priority (highest to lowest):
1. `process.env` - Runtime environment
2. `~/.claude/.env` - User global settings
3. `.claude/.env` - Project settings

### Providers

| Provider | Credential | Setup Guide |
|----------|------------|-------------|
| Telegram | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | Create bot via @BotFather |
| Discord | `DISCORD_WEBHOOK_URL` | Server Settings > Integrations > Webhooks |
| Slack | `SLACK_WEBHOOK_URL` | api.slack.com/apps > Incoming Webhooks |

### Throttling

Provider errors trigger 5-minute cooldown to prevent spam:
- State file: `/tmp/ck-noti-throttle.json`
- Clears automatically on successful send

### Hook Configuration

```json
{
  "Notification": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/notifications/notify.cjs"
        }
      ]
    }
  ]
}
```

---

## Agents System

### Overview

23 specialized subagents with role-specific prompts, tools, and behavioral guidelines. Each agent is defined in `.claude/agents/*.md` with YAML frontmatter.

### Agent Definition Format

```markdown
---
name: agent-name
description: >-
  When to use this agent and what it does
tools: Glob, Grep, Read, ...  # Available tools
model: inherit                 # Model selection
---

[Agent system prompt with instructions]
```

### Available Agents

| Agent             | Purpose                                        | Key Tools                          |
|-------------------|------------------------------------------------|------------------------------------|
| scout             | Codebase exploration with priority categorization | Glob, Grep, Read                  |
| scout-external    | External tool integration (Gemini, OpenCode)   | Bash, WebFetch                     |
| planner           | Implementation planning with mental models     | All tools                          |
| code-reviewer     | Comprehensive code quality assessment          | All tools                          |
| debugger          | Issue investigation and root cause analysis   | All tools                          |
| tester            | Test validation and coverage analysis         | All tools                          |
| database-admin    | Database operations and optimization          | All tools                          |
| docs-manager      | Documentation management                      | All tools                          |
| fullstack-developer | Implementation execution                     | All tools                          |
| git-manager       | Git operations with conventional commits      | Glob, Grep, Read, Bash             |
| journal-writer    | Technical difficulty documentation            | All tools                          |
| mcp-manager       | MCP server integration management             | All tools                          |
| project-manager   | Project coordination and reporting            | All tools (except Bash)            |
| researcher        | Technical research and synthesis              | All tools                          |
| brainstormer      | Solution exploration and architectural debate | All tools                          |
| architect         | System architecture, trade-offs, ADRs         | All tools (opus model)             |
| code-simplifier   | Code refinement for clarity                   | All tools                          |
| copywriter        | Marketing and engagement copy                 | All tools                          |
| ui-ux-designer    | Interface design and accessibility            | All tools                          |

### Agent Output Standards

Agents follow structured output formats:
- **Scout**: Priority-categorized numbered file lists
- **Planner**: Implementation plans with effort estimates
- **Code-reviewer**: Severity-prioritized findings with fixes
- **Debugger**: Root cause analysis with evidence
- **Architect**: Trade-off matrices, ADRs with alternatives, service boundary diagrams

### Architect Agent

Senior architecture agent with 8 mental models for complex design decisions:
- Second-Order Thinking, Systems Thinking, Trade-off Analysis
- Risk-First Architecture, Inversion, 80/20 Rule
- Conway's Law Awareness, Technical Debt Quadrant

**Use for:** Technology trade-offs, service boundaries, ADR creation, integration strategy.

**Model:** opus (for reasoning depth)

See `.claude/agents/architect.md` for full mental models and ADR template.

---

## Skills Framework

### Skill Structure

Each skill is defined in `.claude/skills/{skill-name}/SKILL.md`:

```markdown
---
name: skill-name
description: When to use this skill
triggers: keyword patterns that activate
tools: available tools
---

[Skill instructions and guidelines]

## References (optional)
- references/topic.md
```

### Skill Categories

| Category          | Skills                                              |
|-------------------|-----------------------------------------------------|
| AI/ML             | ai-artist, ai-multimodal, ai-dev-tools-sync        |
| Backend           | backend-development, api-design, migration         |
| Frontend          | frontend-design, shadcn-tailwind, ui-ux-pro-max    |
| Architecture      | performance, plan, security                        |
| DevOps            | devops, test-ui, media-processing          |
| Quality           | code-review, debugging, testing                    |
| Documentation     | documentation, feature-docs, business-feature-docs |
| Platform-specific | easyplatform-backend, frontend-angular-*           |
| Workflow          | commit, context-optimization, memory-management    |

### Skill Activation

Skills activate via:
1. **Explicit**: `/skill-name` or `/skill-name args`
2. **Automatic**: Trigger keyword detection in prompts
3. **Agent delegation**: Agents invoke skills during execution

### Command Variants (cook)

The `/cook` command supports hierarchical variants for different execution modes:

| Command | Mode | Description |
|---------|------|-------------|
| `/cook` | Default | Standard implementation with planning |
| `/cook/fast` | ⚡ Fast | Skip research, minimal planning, trust knowledge |
| `/cook/hard` | ⚡⚡⚡⚡ Thorough | Extra research, detailed planning, mandatory reviews |
| `/cook/parallel` | ⚡⚡⚡ Parallel | Multiple subagents working concurrently |

#### /cook/fast
```
Workflow: Quick Plan → Rapid Implementation → Quick Validation → Optional Commit
Use when: Simple features, bug fixes with known solutions, "just do it"
Trade-off: ~2x faster, skips research/review phases
```

#### /cook/hard
```
Workflow: Deep Research (2-3 agents) → Comprehensive Plan → Verified Implementation → Mandatory Testing → Mandatory Review → Documentation
Use when: Critical production features, security changes, API modifications
Trade-off: Thorough with quality gates (2+ researcher reports, 0 critical findings required)
```

#### /cook/parallel
```
Workflow: Task Decomposition → Parallel Research → Parallel Planning → Parallel Implementation → Integration
Use when: Multi-component features, large refactoring, parallel test writing
Trade-off: ~2-3x faster but higher coordination complexity
Rules: File ownership per subagent, max 3 concurrent, sync points between phases
```

Example parallel task split:
```
"Add user authentication with login UI"
├── Backend API (subagent 1)
│   ├── auth-controller.ts
│   └── auth-service.ts
├── Frontend UI (subagent 2)
│   ├── login-page.component.ts
│   └── login-form.component.ts
└── Tests (subagent 3)
    ├── auth.spec.ts
    └── login.e2e.ts
```

---

## Workflow Orchestration

> How this project's `.claude/` setup automatically detects user intent and orchestrates multi-step development workflows.

### Overview

This workspace implements a **multi-layer orchestration system** for Claude Code that:

1. **Automatically detects** user intent from natural language prompts
2. **Injects workflow instructions** into the LLM's context before it responds
3. **Guides the AI** through multi-step development workflows (plan → implement → test → review)

The system uses **hooks** (JavaScript scripts), **configuration files** (JSON), and **skills** (prompt templates) to achieve zero-touch workflow automation.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLAUDE CODE RUNTIME                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────┐   │
│  │ User Prompt │────▶│ UserPromptSubmit │────▶│ Workflow Router Hook    │   │
│  │             │     │ Hook Event       │     │ (workflow-router.cjs)   │   │
│  └─────────────┘     └──────────────────┘     └───────────┬─────────────┘   │
│                                                           │                  │
│                                   ┌───────────────────────▼────────────────┐│
│                                   │          workflows.json                ││
│                                   │  - Pattern matching rules              ││
│                                   │  - Workflow sequences                  ││
│                                   │  - Command mappings                    ││
│                                   └───────────────────────┬────────────────┘│
│                                                           │                  │
│                                   ┌───────────────────────▼────────────────┐│
│                                   │     Inject Instructions to LLM         ││
│                                   │  "Detected: Feature Implementation"   ││
│                                   │  "Following: /plan → /plan-review..."││
│                                   └───────────────────────┬────────────────┘│
│                                                           │                  │
│  ┌───────────────────────────────────────────────────────▼─────────────────┐│
│  │                          CLAUDE AI (LLM)                                ││
│  │  1. Reads injected instructions                                         ││
│  │  2. Announces workflow to user                                          ││
│  │  3. Executes Skill tool with each step (/plan, /cook, /test...)        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Workflow Configuration (workflows.json)

Defines all workflow types, their trigger patterns, and step sequences:

```json
{
  "$schema": "./workflows.schema.json",
  "version": "1.1.0",
  "settings": {
    "enabled": true,
    "confirmHighImpact": true,
    "showDetection": true,
    "allowOverride": true,
    "overridePrefix": "quick:"
  },
  "workflows": {
    "feature": {
      "name": "Feature Implementation",
      "triggerPatterns": [
        "\\b(implement|add|create|build|develop|make)\\b.*\\b(feature|functionality|capability)\\b",
        "\\bnew\\s+(feature|functionality|capability)\\b"
      ],
      "excludePatterns": ["\\b(fix|bug|error|broken|issue)\\b"],
      "sequence": ["plan", "plan-review", "cook", "code-simplifier", "code-review", "test", "docs-update", "watzup"],
      "confirmFirst": true,
      "priority": 10
    },
    "bugfix": {
      "name": "Bug Fix",
      "triggerPatterns": ["\\b(bug|fix|broken|issue|crash|fail|exception)\\b"],
      "excludePatterns": ["\\b(implement|add|create|build)\\s+new\\b"],
      "sequence": ["scout", "investigate", "debug", "plan", "plan-review", "fix", "code-simplifier", "code-review", "test"],
      "confirmFirst": false,
      "priority": 20
    }
  },
  "commandMapping": {
    "plan": { "claude": "/plan" },
    "cook": { "claude": "/cook" },
    "test": { "claude": "/test" },
    "fix": { "claude": "/fix" },
    "code-review": { "claude": "/review/codebase" }
  }
}
```

### Workflow Types & Priority

| Workflow      | Priority | Sequence | Use Case |
|---------------|----------|----------|----------|
| Feature       | 10       | /plan → /plan-review → /cook → /simplify → /review → /test → /docs → /watzup | New functionality |
| Bugfix        | 20       | /scout → /investigate → /debug → /plan → /plan-review → /fix → /simplify → /review → /test | Error fixes |
| Refactor      | 25       | /plan → /plan-review → /code → /simplify → /review → /test | Code improvement |
| Documentation | 30       | /scout → /investigate → /docs-update → /watzup | Doc updates |
| Review        | 35       | /code-review → /watzup | Code review |
| Testing       | 40       | /test | Test creation |
| Investigation | 50       | /scout → /investigate | Codebase exploration |

*Lower priority number = higher preference when multiple workflows match*

### Workflow Router (workflow-router.cjs)

The **core orchestration engine** intercepts every user prompt:

```javascript
function detectIntent(userPrompt, config) {
  const { workflows, settings } = config;

  // Check for override prefix ("quick:" skips detection)
  if (settings.allowOverride && userPrompt.toLowerCase().startsWith(settings.overridePrefix)) {
    return { skipped: true, reason: 'override_prefix' };
  }

  // Check for explicit command (e.g., "/plan" bypasses detection)
  if (/^\/\w+/.test(userPrompt.trim())) {
    return { skipped: true, reason: 'explicit_command' };
  }

  // Score each workflow by pattern matching
  const scores = [];
  for (const [workflowId, workflow] of Object.entries(workflows)) {
    let score = 0;

    // Check exclude patterns first
    if (workflow.excludePatterns?.some(p => new RegExp(p, 'i').test(userPrompt))) continue;

    // Check trigger patterns
    for (const pattern of workflow.triggerPatterns || []) {
      if (new RegExp(pattern, 'i').test(userPrompt)) score += 10;
    }

    if (score > 0) scores.push({ workflowId, workflow, score });
  }

  // Return highest scoring workflow
  scores.sort((a, b) => (b.score - b.workflow.priority) - (a.score - a.workflow.priority));
  return scores[0] ? { detected: true, ...scores[0] } : { detected: false };
}
```

### Workflow Detection Matrix

| User Prompt                 | Matched Patterns | Excluded By            | Result            |
|-----------------------------|------------------|------------------------|-------------------|
| "Add dark mode feature"     | `add.*feature`   | -                      | Feature workflow  |
| "Fix the login bug"         | `fix`, `bug`     | -                      | Bugfix workflow   |
| "Add a fix for the crash"   | `add`, `fix`     | `fix` excludes feature | Bugfix wins       |
| "/plan dark mode"           | -                | `^\/\w+` (explicit)    | Skip detection    |
| "quick: add button"         | -                | `quick:` prefix        | Skip detection    |
| "How does auth work?"       | `how does.*work` | -                      | Investigation     |

### Override Mechanisms

| Method | Example | Result |
|--------|---------|--------|
| **Quick prefix** | `quick: add a button` | Skip workflow, handle directly |
| **Explicit command** | `/plan implement dark mode` | Execute /plan directly |
| **Say "quick"** | (after detection) `quick` | Cancel workflow |
| **Say "skip"** | (during workflow) `skip` | Skip current step |
| **Say "abort"** | (during workflow) `abort` | Cancel entire workflow |

### Workflow State Persistence

For long-running workflows, the system includes **state persistence** to prevent context loss:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW STATE PERSISTENCE                           │
├─────────────────────────────────────────────────────────────────────────┤
│  Workflow Detected ──▶ Creates .claude/.workflow-state.json             │
│           │                                                             │
│  Each User Prompt ──▶ Checks for active workflow                        │
│           │           ├─▶ Injects continuation reminder                 │
│           │           └─▶ Shows progress: "Step 2/7"                    │
│           │                                                             │
│  Skill Completes ──▶ Updates state, advances to next step               │
│           │                                                             │
│  Workflow Complete ──▶ Clears state file                                │
└─────────────────────────────────────────────────────────────────────────┘
```

**State File Schema** (`.claude/.workflow-state.json`):

```json
{
  "workflowId": "bugfix",
  "workflowName": "Bug Fix",
  "sequence": ["scout", "investigate", "debug", "plan", "plan-review", "fix", "code-simplifier", "code-review", "test"],
  "currentStep": 0,
  "completedSteps": [],
  "startTime": "2026-01-07T15:23:34.000Z",
  "originalPrompt": "fix the login bug",
  "ttlHours": 24
}
```

### Todo Enforcement System

The workspace enforces todo list creation before implementation work via runtime hooks.

```
┌─────────────────────────────────────────────────────────────────┐
│                   TODO ENFORCEMENT FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│  User calls Skill tool (e.g., /cook, /fix)                       │
│           │                                                      │
│  PreToolUse event fires → todo-enforcement.cjs executes          │
│           │                                                      │
│           ├─ Skill in ALLOWED list? → Pass through               │
│           ├─ Has "quick:" bypass? → Pass through                 │
│           └─ Check .todo-state.json for active todos             │
│                   │                                              │
│                   ├─ Has todos → Allow execution                 │
│                   └─ No todos → BLOCK with error message         │
└─────────────────────────────────────────────────────────────────┘
```

**Allowed Skills (No Todos Required):**

| Category | Skills |
|----------|--------|
| Research | `/scout`, `/investigate`, `/research`, `/docs-seeker` |
| Planning | `/plan`, `/plan-fast`, `/plan-hard`, `/plan-validate` |
| Status | `/watzup`, `/checkpoint`, `/kanban`, `/compact` |

**Blocked Skills (Todos Required):**

| Category | Skills |
|----------|--------|
| Implementation | `/cook`, `/fix`, `/code`, `/feature`, `/refactoring` |
| Testing | `/test`, `/debug`, `/build` |
| Review/Git | `/code-review`, `/commit` |

### Context Preservation System

Automatic checkpoint/restore prevents loss of todos and progress during context compaction:

```
┌─────────────────────────────────────────────────────────────────┐
│                CONTEXT PRESERVATION FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│  SAVE (PreCompact)                    RESTORE (SessionStart)     │
│  ─────────────────                    ─────────────────────      │
│  save-context-memory.cjs              session-resume.cjs          │
│           │                                    │                  │
│  1. Export todos from state           1. Find latest checkpoint   │
│  2. Capture context stats             2. Check age (<24h)         │
│  3. Write checkpoint file             3. Parse "Active Todos"     │
│     plans/reports/memory-             4. Restore to state file    │
│     checkpoint-YYMMDD-HHMMSS.md       5. Output reminder to LLM   │
└─────────────────────────────────────────────────────────────────┘
```

**Age Validation:**
- **< 24h:** Auto-restore todos on session resume
- **> 24h:** Warning shown, manual restore required

### Automatic Checkpoints

Workflows can auto-save context at regular intervals:

```json
{
  "settings": {
    "checkpoints": {
      "enabled": true,
      "intervalMinutes": 30,
      "path": "plans/reports",
      "autoSaveOnCompact": true,
      "filenamePattern": "checkpoint-{YYMMDD}-{HHMM}-{slug}.md"
    }
  }
}
```

Workflows with `enableCheckpoints: true`:
- Feature Implementation
- Bug Fix
- Code Investigation
- Code Refactoring

### Complete Execution Flow Example

**User Types:** "Add a dark mode toggle to the settings page"

**Phase 1: Hook Execution**
```
1. UserPromptSubmit event fires
2. workflow-router.cjs executes:
   - Pattern "add" matches feature.triggerPatterns ✓
   - No exclude patterns matched
   - Score: 10 points for "feature" workflow
   - Output: Workflow instructions to stdout
```

**Phase 2: LLM Receives Context**
```
[User Message]
Add a dark mode toggle to the settings page

[System Reminder - from workflow-router.cjs]
## Workflow Detected

**Intent:** Feature Implementation (100% confidence)
**Workflow:** /plan → /plan-review → /cook → /code-simplifier → /code-review → /test → /docs-update → /watzup

### Instructions (MUST FOLLOW)
1. Announce detected workflow to user
2. CREATE TODO LIST (MANDATORY) for each step
3. ASK: "Proceed with this workflow? (yes/no/quick)"
4. EXECUTE each step, marking todos completed
```

**Phase 3: LLM Response**
```
> Detected: **Feature Implementation** workflow.
> I will follow: /plan → /plan-review → /cook → /code-simplifier → /code-review → /test → /docs-update → /watzup

[Creates todo list:]
- [ ] Execute /plan - Create implementation plan
- [ ] Execute /plan-review - Self-review plan
- [ ] Execute /cook - Implement feature
- [ ] Execute /code-simplifier - Simplify code
...

Proceed with this workflow? (yes/no/quick)
```

**Phase 4: Sequential Execution**
```
User: "yes"

Step 1: Claude calls Skill("plan") → Creates plan → ✓
Step 2: Claude calls Skill("plan-review") → Self-reviews plan → ✓
Step 3: Claude calls Skill("cook") → Implements feature → ✓
Step 4: Claude calls Skill("code-simplifier") → Simplifies code → ✓
Step 5: Claude calls Skill("code-review") → Reviews changes → ✓
Step 6: Claude calls Skill("test") → Runs tests → ✓
Step 7: Claude calls Skill("docs-update") → Updates docs → ✓
Step 8: Claude calls Skill("watzup") → Summarizes → ✓
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Workflow not detected | Check patterns in `workflows.json`, verify `settings.enabled` |
| Wrong workflow detected | Review priorities, add exclude patterns, use `quick:` prefix |
| Hook errors | Check script syntax, verify `%CLAUDE_PROJECT_DIR%` resolves |
| State not persisting | Check `.claude/.workflow-state.json` write permissions |

### Best Practices

1. **Define Clear Patterns**: Use specific regex that minimize false positives
2. **Use Exclude Patterns**: Prevent workflow conflicts by excluding competing keywords
3. **Set Appropriate Priorities**: Lower priority number = higher preference
4. **Require Confirmation**: Set `confirmFirst: true` for high-impact workflows
5. **Include Code Review**: Add `/code-review` step after code changes

---

## Memory Management

### Memory Files

| File                    | Purpose                                |
|-------------------------|----------------------------------------|
| `deltas.json`           | Active learned patterns (max 50)       |
| `delta-candidates.json` | Pending patterns awaiting promotion    |
| `events-stream.jsonl`   | Raw skill execution events             |
| `.ace-last-analysis`    | Timestamp of last reflector run        |
| `archive/`              | Archived deltas by date                |

### Delta Schema

```json
{
  "delta_id": "ace_1736712000_abc",
  "problem": "skill X encounters Y errors",
  "solution": "Recommended solution approach",
  "condition": "When using /skill-name",
  "helpful_count": 10,
  "not_helpful_count": 2,
  "human_feedback_count": 1,
  "confidence": 0.89,
  "created": "2025-01-12T00:00:00Z",
  "last_helpful": "2025-01-12T12:00:00Z",
  "source_events": ["evt_1", "evt_2"]
}
```

### Confidence Calculation

```javascript
// Formula: (automated_helpful + human_helpful * 3) / total
confidence = (helpful_count + human_feedback_count * HUMAN_WEIGHT) /
             (helpful_count + human_feedback_count * HUMAN_WEIGHT + not_helpful_count)
```

### Lifecycle

1. **Creation**: Reflector extracts pattern from events → candidate
2. **Promotion**: Curator promotes candidates with ≥80% confidence → active
3. **Reinforcement**: Successful executions increase helpful_count
4. **Degradation**: Failed executions increase not_helpful_count
5. **Pruning**: Deltas older than 90 days or <20% success rate → archived
6. **Overflow**: If >50 active, lowest confidence → archived

---

## External Memory Swap System

### Overview

The External Memory Swap system externalizes large tool outputs to disk files with semantic summaries for **post-compaction recovery** without re-executing tools. This enables Claude to recover exact content after context compaction.

### Critical Constraint

> **PostToolUse hooks CANNOT transform tool output.** They can only observe and inject additional content. The original output still enters context during the active session.

### Value Proposition

| What It Does | What It Does NOT Do |
|--------------|---------------------|
| ✅ Post-compaction exact recovery | ❌ Reduce active session tokens |
| ✅ Semantic summaries for quick reference | ❌ Transform tool output |
| ✅ Session-isolated storage | ❌ Work as virtual memory |
| ✅ Tool-specific threshold tuning | ❌ Provide token savings during session |

### Architecture

```
Tool Execution (Read/Grep/Glob/Bash)
         │
         ▼
┌─────────────────────┐
│  PostToolUse Hook   │
│  tool-output-swap   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐     size < threshold
│  shouldExternalize  │─────────────────────► No action
└─────────┬───────────┘
          │ size >= threshold
          ▼
┌─────────────────────┐
│    externalize()    │──► Write swap files + inject pointer
└─────────────────────┘

... After Context Compaction ...

┌─────────────────────┐
│  SessionStart Hook  │
│ post-compact-recovery│
└─────────┬───────────┘
          │
          ▼
Inject swap inventory table → LLM can Read exact content
```

### Components

| File | Location | Purpose |
|------|----------|---------|
| `swap-engine.cjs` | `.claude/hooks/lib/` | Core externalization logic |
| `tool-output-swap.cjs` | `.claude/hooks/` | PostToolUse hook entry |
| `swap-config.json` | `.claude/hooks/config/` | Thresholds and limits |

### Configuration

```json
{
  "enabled": true,
  "thresholds": {
    "default": 4096,
    "Read": 8192,
    "Grep": 4096,
    "Bash": 6144,
    "Glob": 2048
  },
  "retention": {
    "defaultHours": 24,
    "accessedHours": 48,
    "neverAccessedHours": 6
  },
  "limits": {
    "maxEntriesPerSession": 100,
    "maxTotalBytes": 52428800,
    "maxSingleFile": 5242880
  }
}
```

### Storage Structure

```
{os.tmpdir()}/ck/swap/{sessionId}/
├── index.jsonl          # Session manifest (JSONL format - atomic appends)
├── {uuid}.content       # Raw content (exact)
└── {uuid}.meta.json     # Metadata + summary
```

**Note:** Uses `os.tmpdir()` for cross-platform support (Windows: `%TEMP%`, Unix: `/tmp`)

### Key Functions

#### shouldExternalize(toolName, toolResult, toolInput)
- Checks if swap is enabled
- Prevents recursion (skips swap file reads)
- Compares byte size against tool-specific thresholds
- Returns true if output should be externalized

#### externalize(sessionId, toolName, toolInput, toolResult)
- Validates disk space limits
- Generates UUID for swap entry
- Writes content file and metadata
- Appends to JSONL index (atomic)
- Returns pointer info or null on failure

#### extractSummary(content, toolName)
- Tool-specific summarization:
  - **Read**: Extracts class/function/interface signatures
  - **Grep**: Shows match count and preview
  - **Glob**: Shows file count and extension types
  - **Default**: Truncates content

#### buildPointer(entry)
- Creates markdown reference with:
  - Swap ID, tool, input
  - Size metrics (chars, estimated tokens)
  - Summary and key patterns
  - Retrieval command

### Integration Points

#### PostToolUse Hook (tool-output-swap.cjs)
- Triggered for: Read, Grep, Glob, Bash
- Calls shouldExternalize() → externalize() → buildPointer()
- Outputs markdown pointer to stdout

#### SessionStart Hook (session-resume.cjs)
- Loads swap entries for current session
- Injects inventory table with retrieval paths
- Escapes markdown pipes in summaries

#### SessionEnd Hook (session-end.cjs)
- On "clear": Deletes entire session swap directory
- On "compact": Runs retention cleanup + orphan removal

### Cleanup Behavior

| Trigger | Action |
|---------|--------|
| `/clear` | Delete all swap files for session |
| Context compact | Remove expired files (>24h default) |
| Session end | Cleanup orphan files |

### Safety Features

1. **Fail-open**: All errors exit 0 (never blocks Claude)
2. **Recursion prevention**: Skips reads from swap directory
3. **Session isolation**: Files scoped by session ID
4. **Atomic writes**: JSONL append-only index
5. **Disk limits**: maxTotalBytes, maxEntriesPerSession

---

## Scripts & Utilities

### resolve_env.py

Centralized environment variable resolver with priority hierarchy:

1. Runtime environment variables (highest)
2. Project skill-specific: `.claude/skills/<skill>/.env`
3. Project shared: `.claude/skills/.env`
4. Project global: `.claude/.env`
5. User skill-specific: `~/.claude/skills/<skill>/.env`
6. User shared: `~/.claude/skills/.env`
7. User global: `~/.claude/.env` (lowest)

```bash
# Usage
python .claude/scripts/resolve_env.py GEMINI_API_KEY --skill ai-multimodal
```

### generate_catalogs.py

Generates YAML catalogs from skill data files.

```bash
python .claude/scripts/generate_catalogs.py --skills
```

### Other Scripts

- `scan_skills.py`: Discovers and catalogs skill definitions
- `set-active-plan.cjs`: Plan state management
- `worktree.cjs`: Git worktree operations

---

## Hook Metrics System

### Overview

Performance tracking infrastructure for monitoring hook execution effectiveness. Tracks execution counts, success/failure rates, and latency percentiles.

### Components

| File | Purpose |
|------|---------|
| `hooks/lib/ck-paths.cjs` | Centralized paths for temp files (`/tmp/ck/`) |
| `hooks/lib/hook-metrics-tracker.cjs` | Metrics collection and storage |
| `hooks/metrics-dashboard.cjs` | Visual CLI dashboard |

### Usage

```bash
# View metrics dashboard
node .claude/hooks/metrics-dashboard.cjs

# Watch mode (refresh every 5s)
node .claude/hooks/metrics-dashboard.cjs --watch

# Export as JSON
node .claude/hooks/metrics-dashboard.cjs --json

# Reset all metrics
node .claude/hooks/metrics-dashboard.cjs --reset
```

### Tracking from Hooks

Hooks can opt into metrics tracking:

```javascript
const { trackHook } = require('./lib/hook-metrics-tracker.cjs');

const start = Date.now();
try {
  // Hook logic here
  trackHook('my-hook', { success: true, durationMs: Date.now() - start });
} catch (err) {
  trackHook('my-hook', { success: false, durationMs: Date.now() - start });
  throw err;
}
```

### Metrics Dashboard Output

```
  ┌──────────────────────────────┬────────┬──────────┬────────┬────────┬────────────┐
  │ Hook Name                    │ Total  │ Success  │ p50    │ p99    │ Last Run   │
  ├──────────────────────────────┼────────┼──────────┼────────┼────────┼────────────┤
  │ ace-event-emitter            │  1,234 │   98.5%  │   45ms │  120ms │      2m ago│
  │ workflow-router              │    567 │   99.2%  │   12ms │   35ms │      5m ago│
  │ todo-enforcement             │    890 │  100.0%  │    8ms │   22ms │     10m ago│
  └──────────────────────────────┴────────┴──────────┴────────┴────────┴────────────┘

  Summary
  ├─ Total Hooks: 12
  ├─ Total Executions: 3,456
  ├─ Overall Success Rate: 98.8%
  └─ Data Updated: 2m ago
```

### Storage

- **Path**: `/tmp/ck/hook-metrics.json`
- **Durations**: Keeps last 100 per hook for percentile calculation
- **Sessions**: Tracks per-session stats, prunes to last 50

### ClaudeKit Paths (`ck-paths.cjs`)

Centralized namespace for all temp files:

```javascript
const CK_TMP_DIR = '/tmp/ck';          // Root directory
const MARKERS_DIR = '/tmp/ck/markers'; // Session markers
const METRICS_PATH = '/tmp/ck/hook-metrics.json';
const DEBUG_DIR = '/tmp/ck/debug';
const CALIBRATION_PATH = '/tmp/ck/calibration.json';
```

Benefits:
- Single namespace cleanup (`rm -rf /tmp/ck/`)
- No collisions with other tools
- Easy debugging (all state in one place)

---

## Configuration Files

### settings.json

Main configuration covering:
- **Permissions**: allow/deny/ask lists for tools and commands
- **Hooks**: Event-to-handler mappings
- **Plugins**: Enabled integrations (code-review, lsp, etc.)
- **Models**: Default model settings

### settings.local.json (Developer Overrides)

Developer-specific settings that override `settings.json` without modifying shared configuration. This file is gitignored.

**Load Priority** (highest to lowest):
1. `settings.local.json` - Developer overrides
2. `settings.json` - Project shared settings
3. `~/.claude/settings.json` - User global settings

**Merge Behavior**: Deep merge - local settings add to or override specific values without replacing entire sections.

**Setup**:
```bash
# Copy template and customize
cp .claude/settings.local.json.example .claude/settings.local.json
```

**Example settings.local.json**:
```json
{
  "permissions": {
    "allow": [
      "Bash(python*)",
      "Bash(docker*)",
      "Bash(for*)",
      "Bash(while*)"
    ]
  }
}
```

**Use Cases**:
- Add developer-specific Bash permissions (python, docker, etc.)
- Enable plugins for personal workflows
- Override model settings for testing

### config/ Directory

Centralized configuration templates for skills, agents, and workflows.

| File | Purpose |
|------|---------|
| `release-notes-template.yaml` | Template for release notes generation |
| `skill-template.md` | Template for creating new skills |
| `agent-template.md` | Template for creating new agents |

**Creating New Skills**:
1. Copy `.claude/config/skill-template.md` to `.claude/skills/{skill-name}/SKILL.md`
2. Update YAML frontmatter with skill details
3. Add skill-specific content and examples

**Creating New Agents**:
1. Copy `.claude/config/agent-template.md` to `.claude/agents/{agent-name}.md`
2. Update frontmatter with agent details
3. Define agent behavior and constraints

### .ck.json

Project-specific Claude Kit settings:
- Coding level (0-5 scale)
- Plan naming format
- User assertions (15 EasyPlatform architecture rules)
- Validation settings

### workflows.json

Workflow definitions with:
- Sequence of skills/commands
- Multilingual trigger patterns
- Priority weights
- Copilot command mappings

---

## How Everything Works Together

### Session Lifecycle

```
1. SESSION START
   ├── session-init.cjs → Detect project, set env vars
   ├── ace-session-inject.cjs → Load learned patterns
   └── Output environment context + assertions

2. USER PROMPT
   ├── workflow-router.cjs → Detect intent, suggest workflow
   ├── todo-enforcement.cjs → Check/require todo list
   └── Route to appropriate skill/agent

3. SKILL EXECUTION
   ├── PreToolUse hooks → Validation
   ├── Tool execution
   ├── PostToolUse hooks → ace-event-emitter.cjs
   └── Capture outcome to events-stream.jsonl

4. CONTEXT COMPACTION
   ├── ace-reflector-analysis.cjs → Extract patterns
   ├── ace-curator-pruner.cjs → Promote/prune deltas
   └── Update deltas.json

5. SESSION END
   └── Cleanup, state persistence
```

### Learning Flow

```
Skill Execution → Event Capture → Pattern Extraction → Delta Promotion → Session Injection
       ↑                                                                        │
       └────────────────── Improved Future Executions ◀─────────────────────────┘
```

### Value Proposition

| Component            | Benefit                                                |
|----------------------|--------------------------------------------------------|
| ACE Learning         | Claude improves over time, remembers what works       |
| Specialized Agents   | Expert-level handling for specific task types         |
| Skills Framework     | Consistent, well-documented capabilities              |
| Workflow Orchestration | Structured, complete task execution with checkpoints |
| Notification System  | Never miss task completion, reduced context-switching |
| Todo Enforcement     | No forgotten steps, visible progress                  |
| Memory Persistence   | Cross-session knowledge retention                     |
| Environment Detection | Context-aware behavior                               |

---

## Best Practices

### For Users

1. **Use workflows**: Let intent detection route to appropriate sequence
2. **Maintain todos**: Keep task list updated for visibility
3. **Provide feedback**: Human feedback is weighted 3x
4. **Let ACE learn**: Don't bypass learning hooks
5. **Use agents**: Delegate complex tasks to specialized agents

### For Extension

1. **Add skills**: Create `SKILL.md` with YAML frontmatter
2. **Add agents**: Create `agent.md` in `.claude/agents/`
3. **Add hooks**: Register in `settings.json`
4. **Customize workflows**: Edit `workflows.json`

### Troubleshooting

| Issue                          | Solution                                           |
|--------------------------------|----------------------------------------------------|
| Patterns not injecting         | Check `deltas.json` has entries, hook is active   |
| Events not captured            | Verify PostToolUse hook for Skill tool            |
| Workflow not detected          | Check trigger patterns in workflows.json          |
| Todo enforcement blocking      | Use "quick:" prefix or create todo list           |
| Deltas not promoting           | Need ≥80% confidence from ≥3 events               |

---

## How Hooks Help - Detailed Workflow Execution

This section provides detailed explanations of how each hook category helps and step-by-step workflow execution traces for main use cases.

### Hook Categories and Their Purpose

#### 1. SessionStart Hooks - Environment Bootstrap

**What they do**: Initialize the session environment, detect project context, and inject learned patterns.

**Why they help**:
- **Consistency**: Every session starts with the same context awareness (project type, package manager, framework)
- **Memory**: Previously learned patterns are injected, so Claude doesn't repeat mistakes
- **Efficiency**: Environment variables (`CK_*`) are set once, avoiding repeated detection

**Execution Trace**:
```
User starts Claude session
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ session-init.cjs (fires on: startup|resume|clear|compact)                    │
│                                                                              │
│ 1. Read stdin JSON payload: { source: "startup", session_id: "..." }        │
│                                                                              │
│ 2. Detect project context:                                                   │
│    ├── detectProjectType() → "single-repo" (checks pnpm-workspace.yaml,     │
│    │                          lerna.json, package.json workspaces)          │
│    ├── detectPackageManager() → "npm" (checks lock files)                   │
│    └── detectFramework() → "react" (checks package.json deps)               │
│                                                                              │
│ 3. Set 30+ environment variables via CLAUDE_ENV_FILE:                       │
│    CK_PROJECT_TYPE=single-repo                                               │
│    CK_PACKAGE_MANAGER=npm                                                    │
│    CK_GIT_BRANCH=main                                                        │
│    CK_CODING_LEVEL=4                                                         │
│    CK_NAME_PATTERN=260112-1430-GH-88-{slug}                                  │
│    ...                                                                       │
│                                                                              │
│ 4. Output context summary:                                                   │
│    "Session startup. Project: single-repo | PM: npm | Plan naming: ..."     │
│                                                                              │
│ 5. Inject coding level guidelines (if codingLevel != -1):                   │
│    Output: "# Tech Lead Communication Mode..."                               │
│                                                                              │
│ 6. Output user assertions (15 EasyPlatform rules)                           │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ session-resume.cjs (fires on: startup|resume|compact)                        │
│                                                                              │
│ 1. Load checkpoint from .claude/memory/checkpoints/<session_id>.json        │
│ 2. If checkpoint exists and < 24h old:                                       │
│    ├── Restore todo list state                                               │
│    ├── Restore workflow state                                                │
│    └── Output: "Restored: 3 todos, workflow: feature-implementation"        │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ ace-session-inject.cjs (fires on: startup|resume)                           │
│                                                                              │
│ 1. Load deltas from .claude/memory/deltas.json                               │
│                                                                              │
│ 2. Get top deltas sorted by confidence:                                      │
│    const deltas = getTopDeltas(50);                                          │
│                                                                              │
│ 3. Filter by current context (branch, file patterns):                       │
│    matchesCondition(delta.condition, context)                                │
│                                                                              │
│ 4. Build injection within 500 token budget:                                  │
│    "## ACE Learned Patterns                                                  │
│    > Patterns learned from previous executions                               │
│                                                                              │
│    **When using /cook skill**: Continue using (95% success rate)             │
│    → Verify all required inputs are provided                                 │
│                                                                              │
│    **When using /test on *.cs files**: Add null checks before access        │
│    → Use type guards for potentially undefined values"                       │
│                                                                              │
│ 5. Track injection for feedback:                                            │
│    trackInjection(['ace_001', 'ace_002'])                                    │
│    → Writes to .ace-injection-tracking.json                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 2. UserPromptSubmit Hooks - Intent Detection & Workflow Routing

**What they do**: Analyze user prompts to detect intent and route to appropriate workflows.

**Why they help**:
- **Automation**: Users don't need to know which skills to invoke
- **Consistency**: Same request triggers same workflow sequence
- **Guidance**: Provides step-by-step workflow instructions

**Execution Trace**:
```
User submits: "Add a dark mode toggle to the settings page"
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ workflow-router.cjs                                                          │
│                                                                              │
│ 1. Parse stdin: { prompt: "Add a dark mode toggle..." }                     │
│                                                                              │
│ 2. Check for override prefix ("quick:"):                                     │
│    if (prompt.startsWith("quick:")) → skip detection                        │
│                                                                              │
│ 3. Check for explicit command (/skill):                                      │
│    if (/^\/\w+/.test(prompt)) → skip detection                              │
│                                                                              │
│ 4. Detect intent from workflows.json:                                        │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │ For each workflow in config.workflows:                                │ │
│    │   - Check excludePatterns first (skip if matched)                    │ │
│    │   - Check triggerPatterns: ["\\b(implement|add|create|build)\\b"]    │ │
│    │   - "add" matches → score += 10                                       │ │
│    │   - adjustedScore = score - priority (lower = higher preference)      │ │
│    │                                                                        │ │
│    │ Result: { workflowId: "feature", confidence: 100 }                    │ │
│    └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ 5. Create workflow state:                                                    │
│    createState({                                                             │
│      workflowId: "feature",                                                  │
│      workflowName: "Feature Implementation",                                 │
│      sequence: ["plan", "plan-review", "cook", "code-simplifier", "code-review", "test"],                     │
│      originalPrompt: "Add a dark mode toggle..."                            │
│    })                                                                        │
│    → Saves to .claude/memory/.workflow-state.json                           │
│                                                                              │
│ 6. Generate instructions output:                                             │
│    "## Workflow Detected                                                     │
│    **Intent:** Feature Implementation (100% confidence)                      │
│    **Workflow:** /plan → /plan-review → /cook → /simplify...                │
│                                                                              │
│    ### Instructions (MUST FOLLOW)                                            │
│    1. ANNOUNCE: Tell the user...                                             │
│    2. EXECUTE: Follow the workflow sequence..."                              │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ dev-rules-reminder.cjs                                                       │
│                                                                              │
│ 1. Check if relevant development rules should be injected                   │
│ 2. Based on detected intent, inject relevant guidelines                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3. PreToolUse Hooks - Validation & Context Injection

**What they do**: Validate tool calls before execution and inject domain-specific context.

**Why they help**:
- **Prevention**: Block problematic actions before they happen
- **Guidance**: Inject relevant patterns when editing specific file types
- **Security**: Filter sensitive file access

**Execution Trace** (for Edit tool on a `.cs` file):
```
Claude attempts: Edit(file_path="/src/MyService.cs", ...)
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ todo-enforcement.cjs (matcher: Skill)                                        │
│                                                                              │
│ [Skipped - only triggers for Skill tool, not Edit]                          │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ scout-block.cjs (matcher: Bash|Glob|Grep|Read|Edit|Write)                   │
│                                                                              │
│ 1. Check if running inside /scout skill                                     │
│ 2. If yes and tool is Edit/Write → BLOCK (exit 2)                          │
│    "Scout skills are read-only. Use /cook for modifications."               │
│ 3. If no → Allow (exit 0)                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ privacy-block.cjs (matcher: Bash|Glob|Grep|Read|Edit|Write)                 │
│                                                                              │
│ 1. Check file_path against sensitive patterns:                              │
│    - **/.env*, ~/.ssh/**, ~/.aws/**, **/secrets/**                          │
│ 2. If matches → BLOCK (exit 2)                                              │
│    "Access to sensitive file blocked: .env"                                  │
│ 3. If clean → Allow (exit 0)                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ backend-csharp-context.cjs (matcher: Edit|Write|MultiEdit)                  │
│                                                                              │
│ 1. Check if file_path ends with .cs:                                        │
│    ✓ /src/MyService.cs matches                                               │
│                                                                              │
│ 2. Inject C# backend patterns:                                               │
│    "## C# Backend Context                                                    │
│                                                                              │
│    **Repository Pattern**: Use IPlatformQueryableRootRepository<T,K>        │
│    **Validation**: Use PlatformValidationResult fluent API                  │
│    **Side Effects**: Put in Entity Event Handlers, not command handlers     │
│    **CQRS**: Command + Result + Handler in ONE file                         │
│                                                                              │
│    Example:                                                                  │
│    ```csharp                                                                 │
│    protected override async Task<PlatformValidationResult<T>>               │
│        ValidateRequestAsync(...) => await v                                  │
│            .AndAsync(r => repo.GetByIdAsync(...))                            │
│    ```"                                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
[Tool executes with injected context]
```

**Execution Trace** (for Skill tool - /cook without todos):
```
Claude attempts: Skill(skill="cook", args="add dark mode toggle")
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ todo-enforcement.cjs (matcher: Skill)                                        │
│                                                                              │
│ 1. Parse stdin: { tool_name: "Skill", tool_input: { skill: "cook" } }       │
│                                                                              │
│ 2. Check if skill is in ALLOWED_SKILLS (research/planning):                 │
│    ALLOWED_SKILLS = ['scout', 'investigate', 'plan', 'research', ...]       │
│    'cook' NOT in set → Continue validation                                   │
│                                                                              │
│ 3. Check for bypass marker "quick:" in args:                                 │
│    args = "add dark mode toggle"                                             │
│    No "quick:" prefix found → Continue validation                            │
│                                                                              │
│ 4. Check todo state:                                                         │
│    const state = getTodoState();                                             │
│    state = { hasTodos: false, taskCount: 0, pendingCount: 0 }               │
│                                                                              │
│ 5. NO TODOS → BLOCK (exit 2)                                                 │
│    Output:                                                                   │
│    "## Todo List Required                                                    │
│                                                                              │
│    You must create a todo list before running `/cook`.                      │
│                                                                              │
│    ### Why?                                                                  │
│    Task tracking ensures:                                                    │
│    - No steps are forgotten during implementation                            │
│    - Context preserved if session compacts                                   │
│    - Progress visible to you and the user                                   │
│                                                                              │
│    ### To proceed:                                                           │
│    **Option 1**: Use TodoWrite to create a task list, then retry /cook      │
│    **Option 2**: /cook quick: <args> (bypass, not recommended)"             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4. PostToolUse Hooks - Event Capture & Feedback

**What they do**: Capture execution outcomes and track feedback for learning.

**Why they help**:
- **Learning**: Every execution feeds the ACE learning system
- **Tracking**: Workflow progress is automatically monitored
- **Formatting**: Code is auto-formatted after edits

**Execution Trace** (after successful Skill execution):
```
Skill(/cook) completes successfully
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ todo-tracker.cjs (matcher: TodoWrite)                                        │
│                                                                              │
│ [Skipped - only triggers for TodoWrite tool]                                │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ post-edit-prettier.cjs (matcher: Edit|Write)                                │
│                                                                              │
│ [Skipped - only triggers for Edit/Write tools]                              │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ ace-event-emitter.cjs (matcher: Bash|Skill)                                 │
│                                                                              │
│ 1. Parse stdin payload:                                                      │
│    {                                                                         │
│      tool_name: "Skill",                                                     │
│      tool_input: { skill: "cook", args: "add dark mode" },                  │
│      exit_code: 0,                                                           │
│      duration_ms: 45000                                                      │
│    }                                                                         │
│                                                                              │
│ 2. Check stdin size limit (MAX_STDIN_BYTES = 1MB):                          │
│    if (content.length > 1048576) return '' // Prevent OOM                   │
│                                                                              │
│ 3. Classify outcome:                                                         │
│    classifyOutcome(payload) → 'success'                                      │
│    (checks exit_code, error field, response content)                        │
│                                                                              │
│ 4. Build ACE event:                                                          │
│    {                                                                         │
│      event_id: "evt_1736712000_abc123",                                      │
│      timestamp: "2026-01-12T14:30:00Z",                                      │
│      tool: "Skill",                                                          │
│      skill: "cook",                                                          │
│      skill_args: "file_ref",  // Sanitized summary                          │
│      outcome: "success",                                                     │
│      exit_code: 0,                                                           │
│      severity: 0,                                                            │
│      duration_ms: 45000,                                                     │
│      context: {                                                              │
│        branch: "main",                                                       │
│        workflow_step: "cook",                                                │
│        file_pattern: "**/*.ts"                                               │
│      }                                                                       │
│    }                                                                         │
│                                                                              │
│ 5. Check event file rotation:                                                │
│    rotateEventsIfNeeded()                                                    │
│    if (file_size > 10MB) → archive and create new file                      │
│                                                                              │
│ 6. Append to events stream:                                                  │
│    fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n')             │
│    → .claude/memory/events-stream.jsonl                                      │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ workflow-step-tracker.cjs (matcher: Skill)                                  │
│                                                                              │
│ 1. Load workflow state from .workflow-state.json                            │
│ 2. Check if current skill matches expected step:                            │
│    state.sequence[state.currentStep] === 'cook' ✓                           │
│ 3. Mark step complete:                                                       │
│    state.currentStep++ → 3 (next: 'code-simplifier')                        │
│    state.completedSteps.push('cook')                                        │
│ 4. Save updated state                                                        │
│ 5. Output next step reminder:                                                │
│    "Step completed: /cook. Next: /code-simplifier (4/8)"                    │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ ace-feedback-tracker.cjs (matcher: Skill)                                   │
│                                                                              │
│ 1. Get injected delta IDs for this session:                                 │
│    const deltaIds = getInjectedDeltaIds()                                    │
│    → ['ace_001', 'ace_002'] (from .ace-injection-tracking.json)             │
│                                                                              │
│ 2. Check if skill was successful:                                           │
│    wasSkillSuccessful(payload) → true (exit_code=0, no error)               │
│                                                                              │
│ 3. Find matching deltas (skill matches condition):                          │
│    withLock(() => {                                                          │
│      const deltas = loadDeltas();                                            │
│      const matching = deltaIds.filter(id => {                                │
│        const delta = deltas.find(d => d.delta_id === id);                   │
│        return delta?.condition?.includes('cook');                            │
│      });                                                                     │
│      → ['ace_001'] // This delta mentions /cook                              │
│                                                                              │
│      // Update helpful count for matching deltas                             │
│      delta.helpful_count++;                                                  │
│      delta.last_helpful = new Date().toISOString();                         │
│      delta.confidence = recalculateConfidence(delta);                        │
│                                                                              │
│      saveDeltas(deltas);                                                     │
│    });                                                                       │
│                                                                              │
│ 4. Log feedback:                                                             │
│    "skill | cook | success | 1 deltas"                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5. PreCompact Hooks - Pattern Extraction & Learning

**What they do**: Extract patterns from accumulated events and manage the learning playbook before context compaction.

**Why they help**:
- **Memory**: Patterns survive context resets
- **Learning**: Good patterns are promoted, bad ones pruned
- **Efficiency**: Only high-confidence patterns are kept

**Execution Trace** (on context compaction):
```
Context window fills up → Compaction triggered
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ write-compact-marker.cjs (matcher: manual|auto)                             │
│                                                                              │
│ 1. Write timestamp marker:                                                   │
│    → .claude/memory/.compact-marker                                          │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ save-context-memory.cjs (matcher: manual|auto)                              │
│                                                                              │
│ 1. Save current todo list to checkpoint:                                     │
│    → .claude/memory/checkpoints/<session_id>.json                           │
│ 2. Save workflow state                                                       │
│ 3. Save any accumulated context                                             │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ ace-reflector-analysis.cjs (matcher: manual|auto)                           │
│                                                                              │
│ 1. Read events since last analysis:                                          │
│    const events = readEventsSinceLastAnalysis();                             │
│    → 47 events since last .ace-last-analysis timestamp                      │
│                                                                              │
│ 2. Check minimum threshold:                                                  │
│    if (events.length < 5) exit(0) // Need 5+ events                         │
│                                                                              │
│ 3. Extract patterns by grouping:                                             │
│    ┌────────────────────────────────────────────────────────────────────┐   │
│    │ extractPatterns(events)                                             │   │
│    │                                                                      │   │
│    │ Groups by: `${skill}:${error_type || 'success'}`                   │   │
│    │                                                                      │   │
│    │ Example groups:                                                      │   │
│    │ - "cook:success" → 15 events                                        │   │
│    │ - "cook:validation" → 3 events                                      │   │
│    │ - "test:success" → 8 events                                         │   │
│    │ - "test:notFound" → 4 events                                        │   │
│    │                                                                      │   │
│    │ For each group with ≥3 events:                                      │   │
│    │ - Track success_count, failure_count                                │   │
│    │ - Track file_patterns                                               │   │
│    │ - Generate problem/solution/condition                               │   │
│    └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│ 4. Convert patterns to delta candidates:                                     │
│    {                                                                         │
│      delta_id: "ace_1736712000_xyz",                                         │
│      problem: "cook skill execution pattern showing reliable success",      │
│      solution: "Continue using this skill pattern (83% success rate)",      │
│      condition: "When using /cook skill",                                    │
│      helpful_count: 15,                                                      │
│      not_helpful_count: 3,                                                   │
│      confidence: 0.83,                                                       │
│      source_events: ["evt_001", "evt_002", ...]                             │
│    }                                                                         │
│                                                                              │
│ 5. Filter by confidence threshold (80%):                                    │
│    qualifiedCandidates = candidates.filter(c => c.confidence >= 0.80)       │
│    → 2 candidates qualify                                                    │
│                                                                              │
│ 6. Save candidates with deduplication:                                       │
│    saveCandidates(qualifiedCandidates)                                       │
│    → .claude/memory/delta-candidates.json                                    │
│                                                                              │
│ 7. Update analysis marker:                                                   │
│    updateMarker() → .ace-last-analysis = now                                │
│                                                                              │
│ 8. Output:                                                                   │
│    "<!-- ACE Reflector: Generated 2 delta candidate(s) from 47 events -->" │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ ace-curator-pruner.cjs (matcher: manual|auto)                               │
│                                                                              │
│ 1. Load current state:                                                       │
│    const candidates = loadCandidates(); // 2 new candidates                 │
│    const deltas = loadDeltas();         // 45 active deltas                 │
│                                                                              │
│ 2. Use file lock for thread safety:                                          │
│    withLock(() => {                                                          │
│      ...all operations below...                                              │
│    });                                                                       │
│                                                                              │
│ 3. STEP 1 - Promote qualified candidates:                                   │
│    ┌────────────────────────────────────────────────────────────────────┐   │
│    │ promoteQualifiedCandidates(candidates, deltas)                      │   │
│    │                                                                      │   │
│    │ For each candidate with confidence ≥ 80%:                          │   │
│    │   - Check for duplicate in active deltas:                          │   │
│    │     findDuplicate() uses areSimilarDeltas()                        │   │
│    │     (85% similarity on problem + condition + solution)             │   │
│    │                                                                      │   │
│    │   - If duplicate found:                                             │   │
│    │     mergeDeltas(existing, candidate)                               │   │
│    │     → Combine helpful/not_helpful counts                           │   │
│    │     → Recalculate confidence                                        │   │
│    │     → Merge source_events (max 10)                                  │   │
│    │                                                                      │   │
│    │   - If no duplicate:                                                │   │
│    │     Add to promoted list                                            │   │
│    │                                                                      │   │
│    │ Result: { promoted: [1], remaining: [], merged: 1 }                │   │
│    └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│ 4. STEP 2 - Prune stale deltas:                                             │
│    ┌────────────────────────────────────────────────────────────────────┐   │
│    │ pruneStaleDeltas(deltas, pruneDate)                                 │   │
│    │                                                                      │   │
│    │ For each delta:                                                      │   │
│    │   - If created > 90 days ago → stale                               │   │
│    │   - If ≥10 events AND success_rate < 20% → stale                   │   │
│    │                                                                      │   │
│    │ Result: { active: 44, pruned: 2 }                                   │   │
│    └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│ 5. STEP 3 - Enforce max limit (50):                                         │
│    ┌────────────────────────────────────────────────────────────────────┐   │
│    │ enforceMaxLimit(deltas)                                             │   │
│    │                                                                      │   │
│    │ If deltas.length > 50:                                              │   │
│    │   - Sort by confidence descending                                   │   │
│    │   - Keep top 50                                                     │   │
│    │   - Archive overflow                                                │   │
│    │                                                                      │   │
│    │ Result: { kept: 45, overflow: 0 }                                   │   │
│    └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│ 6. Archive pruned deltas:                                                   │
│    archiveDeltas(pruned)                                                    │
│    → .claude/memory/archive/archive_2026-01-12.json                         │
│                                                                              │
│ 7. Save final playbook:                                                     │
│    saveDeltas(finalDeltas)                                                   │
│    → .claude/memory/deltas.json (45 active)                                 │
│                                                                              │
│ 8. Output:                                                                   │
│    "<!-- ACE Curator: +1 promoted, 1 merged, -2 pruned. Active: 45/50 -->" │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Complete Workflow Execution Traces

#### Use Case 1: Feature Implementation Workflow

```
USER: "Add a dark mode toggle to the settings page"

═══════════════════════════════════════════════════════════════════════════════
PHASE 1: DETECTION & ROUTING
═══════════════════════════════════════════════════════════════════════════════

┌─ UserPromptSubmit ──────────────────────────────────────────────────────────┐
│ workflow-router.cjs:                                                         │
│   Input: "Add a dark mode toggle..."                                         │
│   Pattern match: "add" → triggers: ["\\b(implement|add|create)\\b"]         │
│   Detected: Feature Implementation (100% confidence)                         │
│   Workflow: plan → plan-review → cook → code-simplifier → code-review → test│
│                                                                              │
│ Output:                                                                      │
│   "## Workflow Detected                                                      │
│    **Intent:** Feature Implementation                                        │
│    **Workflow:** /plan → /plan-review → /cook → /simplify → /review → /test"│
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
PHASE 2: PLANNING (/plan)
═══════════════════════════════════════════════════════════════════════════════

┌─ PreToolUse (Skill: plan) ──────────────────────────────────────────────────┐
│ todo-enforcement.cjs:                                                        │
│   'plan' IN ALLOWED_SKILLS → ALLOWED (no todos required for planning)       │
└─────────────────────────────────────────────────────────────────────────────┘

[Claude executes /plan skill, creates implementation plan]

┌─ PostToolUse ───────────────────────────────────────────────────────────────┐
│ ace-event-emitter.cjs:                                                       │
│   Event: { skill: "plan", outcome: "success", duration: 12000ms }           │
│   → Appended to events-stream.jsonl                                          │
│                                                                              │
│ workflow-step-tracker.cjs:                                                   │
│   Step completed: plan (1/6)                                                 │
│   Next step: plan-review                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
PHASE 3: IMPLEMENTATION (/cook)
═══════════════════════════════════════════════════════════════════════════════

┌─ PreToolUse (Skill: cook) ──────────────────────────────────────────────────┐
│ todo-enforcement.cjs:                                                        │
│   'cook' NOT in ALLOWED_SKILLS                                               │
│   Check bypass: args doesn't contain "quick:"                               │
│   Check todos: getTodoState() = { hasTodos: true, taskCount: 3 }            │
│   → ALLOWED (has todos)                                                      │
└─────────────────────────────────────────────────────────────────────────────┘

[Claude creates/uses todos, then implements dark mode]

┌─ PreToolUse (Edit: settings.component.ts) ──────────────────────────────────┐
│ scout-block.cjs: Not in scout → ALLOWED                                      │
│ privacy-block.cjs: Not sensitive → ALLOWED                                  │
│ frontend-typescript-context.cjs:                                             │
│   File: *.ts → Inject Angular patterns:                                      │
│   "## TypeScript/Angular Context                                             │
│    - Extend AppBaseComponent                                                 │
│    - Use PlatformVmStore for state                                          │
│    - Use .pipe(this.untilDestroyed()) for subscriptions"                    │
└─────────────────────────────────────────────────────────────────────────────┘

[Claude edits TypeScript files with injected context]

┌─ PostToolUse (Edit complete) ───────────────────────────────────────────────┐
│ post-edit-prettier.cjs:                                                      │
│   Run prettier on modified file                                              │
│   npx prettier --write settings.component.ts                                │
└─────────────────────────────────────────────────────────────────────────────┘

[Continues editing, CSS, tests...]

┌─ PostToolUse (Skill: cook complete) ────────────────────────────────────────┐
│ ace-event-emitter.cjs:                                                       │
│   Event: { skill: "cook", outcome: "success", duration: 45000ms }           │
│                                                                              │
│ ace-feedback-tracker.cjs:                                                    │
│   Injected deltas: ['ace_001']                                               │
│   delta_001.condition includes 'cook' → match                               │
│   → delta_001.helpful_count++ (was 15, now 16)                              │
│   → delta_001.confidence recalculated: 0.84 → 0.85                          │
│                                                                              │
│ workflow-step-tracker.cjs:                                                   │
│   Step completed: cook (3/6)                                                 │
│   Next step: code-simplifier                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
PHASE 4: TESTING (/test)
═══════════════════════════════════════════════════════════════════════════════

[Similar flow: PreToolUse validation → execution → PostToolUse tracking]

┌─ PostToolUse (Skill: test complete) ────────────────────────────────────────┐
│ ace-event-emitter.cjs:                                                       │
│   Event: { skill: "test", outcome: "success", exit_code: 0 }                │
│                                                                              │
│ workflow-step-tracker.cjs:                                                   │
│   Step completed: test (6/6)                                                 │
│   Workflow complete!                                                         │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
PHASE 5: CODE REVIEW (/code-review)
═══════════════════════════════════════════════════════════════════════════════

[Similar flow...]

┌─ PostToolUse (Skill: code-review complete) ─────────────────────────────────┐
│ workflow-step-tracker.cjs:                                                   │
│   Step completed: code-review (5/6)                                         │
│   Next step: test                                                            │
│   Output: "Step completed: /code-review. Next: /test (6/6)"                 │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
PHASE 6: CONTEXT COMPACTION (if triggered)
═══════════════════════════════════════════════════════════════════════════════

┌─ PreCompact ────────────────────────────────────────────────────────────────┐
│ save-context-memory.cjs:                                                     │
│   Save todos, workflow state to checkpoint                                   │
│                                                                              │
│ ace-reflector-analysis.cjs:                                                  │
│   47 events since last analysis                                              │
│   Patterns extracted:                                                        │
│   - cook:success (15 events) → candidate                                     │
│   - test:success (8 events) → candidate                                     │
│   2 candidates written to delta-candidates.json                              │
│                                                                              │
│ ace-curator-pruner.cjs:                                                      │
│   1 candidate promoted (new pattern)                                         │
│   1 candidate merged (existing pattern)                                      │
│   2 stale patterns pruned                                                    │
│   Final: 46 active deltas                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Use Case 2: Bug Fix Workflow with Learning

```
USER: "Fix the login error on mobile devices"

═══════════════════════════════════════════════════════════════════════════════
PHASE 1: DETECTION & SESSION INJECT
═══════════════════════════════════════════════════════════════════════════════

┌─ SessionStart (if new session) ─────────────────────────────────────────────┐
│ ace-session-inject.cjs:                                                      │
│   Loaded 46 active deltas                                                    │
│   Filtered to 5 relevant for current context                                │
│   Injected:                                                                  │
│   "## ACE Learned Patterns                                                   │
│                                                                              │
│    **When debugging authentication**: Check token expiry first              │
│    → 90% of auth bugs are expired tokens                                     │
│                                                                              │
│    **When using /debug skill**: Verify reproduction steps                   │
│    → Prevents investigating phantom bugs"                                    │
│                                                                              │
│   Tracked: injectedDeltaIds = ['ace_017', 'ace_023']                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ UserPromptSubmit ──────────────────────────────────────────────────────────┐
│ workflow-router.cjs:                                                         │
│   Pattern match: "fix", "error" → triggers: ["\\b(bug|fix|error)\\b"]       │
│   Detected: Bug Fix (100% confidence)                                        │
│   Workflow: scout → investigate → debug → plan → fix → test                 │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
PHASE 2: INVESTIGATION (/scout, /investigate, /debug)
═══════════════════════════════════════════════════════════════════════════════

[Scout finds relevant files - no todos required (in ALLOWED_SKILLS)]
[Investigate analyzes patterns - no todos required]
[Debug identifies root cause - no todos required]

═══════════════════════════════════════════════════════════════════════════════
PHASE 3: FIX WITH INJECTED PATTERNS
═══════════════════════════════════════════════════════════════════════════════

[Claude uses injected pattern: "Check token expiry first"]
[Finds the bug: token validation missing on mobile user agent]

┌─ PostToolUse (Skill: debug complete) ───────────────────────────────────────┐
│ ace-feedback-tracker.cjs:                                                    │
│   Skill: debug, outcome: success                                             │
│   Injected delta 'ace_017' mentions 'debug' → match                         │
│   delta_017.helpful_count++ (pattern was useful!)                           │
│   Confidence: 0.87 → 0.88                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
PHASE 4: USER NEGATIVE FEEDBACK (Learning from mistakes)
═══════════════════════════════════════════════════════════════════════════════

USER: "That's not the issue, the problem is different"

┌─ UserPromptSubmit ──────────────────────────────────────────────────────────┐
│ ace-feedback-tracker.cjs (also runs on UserPromptSubmit):                   │
│   detectNegativeFeedback("That's not the issue...") → true                  │
│   (Matched pattern: "not the issue", "problem is different")                │
│                                                                              │
│   isHumanFeedback = true, wasSuccessful = false                             │
│   For all injected deltas in this session:                                   │
│   → delta_017.not_helpful_count++ (human negative feedback)                 │
│   → Confidence recalculated with human weight (3x):                         │
│     Previous: (helpful=20 + human*3) / (20 + 3 + 3) = 0.88                  │
│     After: (20 + 3) / (20 + 3 + 4) = 0.85                                   │
│                                                                              │
│   Log: "human_negative | 'That's not the issue...' | 2 deltas"              │
└─────────────────────────────────────────────────────────────────────────────┘

[Claude continues debugging with corrected approach]
```

---

### Summary: How Hooks Help

| Hook Category | Key Benefits | Impact |
|---------------|--------------|--------|
| **SessionStart** | Environment bootstrap, pattern injection | Every session starts informed |
| **UserPromptSubmit** | Intent detection, workflow guidance | Consistent task execution |
| **PreToolUse** | Validation, context injection | Prevents mistakes, provides guidance |
| **PostToolUse** | Event capture, feedback tracking | Enables learning from outcomes |
| **PreCompact** | Pattern extraction, playbook curation | Knowledge survives context resets |
| **Notification** | Alert delivery | Never miss important events |

**The Hook System Creates a Learning Loop**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   SESSION START          EXECUTION              COMPACTION                  │
│   ┌───────────┐         ┌───────────┐          ┌───────────┐               │
│   │ Inject    │         │ Capture   │          │ Extract   │               │
│   │ Patterns  │────────▶│ Events    │─────────▶│ Patterns  │               │
│   └───────────┘         └───────────┘          └───────────┘               │
│        ▲                      │                      │                       │
│        │                      │                      │                       │
│        │                      ▼                      ▼                       │
│        │              ┌───────────┐          ┌───────────┐                  │
│        │              │ Track     │          │ Promote/  │                  │
│        │              │ Feedback  │          │ Prune     │                  │
│        │              └───────────┘          └───────────┘                  │
│        │                      │                      │                       │
│        │                      ▼                      │                       │
│        │              ┌───────────┐                  │                       │
│        └──────────────│ Update    │◀─────────────────┘                       │
│                       │ Deltas    │                                          │
│                       └───────────┘                                          │
│                                                                              │
│   Claude improves over time through continuous feedback and learning        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ACE Technical Reference - Implementation Deep Dive

This section provides a comprehensive technical reference for the ACE (Agentic Context Engineering) system, explaining the implementation details, design decisions, and how to extend or customize the learning system.

### File Structure and Data Flow

```
.claude/memory/
├── events-stream.jsonl      # Raw event log (PostToolUse captures)
├── delta-candidates.json    # Staging area (patterns awaiting promotion)
├── deltas.json              # Active playbook (promoted patterns)
├── archive/                 # Pruned/overflow deltas
│   └── archive_2026-01-12.json
├── .ace-last-analysis       # Timestamp marker for incremental processing
├── .ace-injection-tracking.json  # Which deltas were injected per session
└── deltas.lock              # File lock for concurrent access
```

**Data Flow Diagram:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ACE LEARNING LOOP                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐                                                           │
│  │ PostToolUse  │ ─── Bash/Skill execution ───> events-stream.jsonl         │
│  │ (CAPTURE)    │     exit_code, duration,      (append-only log)           │
│  └──────────────┘     skill, error_type                                     │
│         │                                                                   │
│         │ PreCompact trigger (manual|auto)                                  │
│         ↓                                                                   │
│  ┌──────────────┐                                                           │
│  │ Reflector    │ ─── Pattern extraction ───> delta-candidates.json         │
│  │ (ANALYZE)    │     group by skill+error,     (staging area)              │
│  └──────────────┘     calculate confidence                                  │
│         │                                                                   │
│         │ Same PreCompact trigger (chained)                                 │
│         ↓                                                                   │
│  ┌──────────────┐                                                           │
│  │ Curator      │ ─── Quality control ───> deltas.json                      │
│  │ (PROMOTE)    │     80% threshold,           (active playbook)            │
│  └──────────────┘     dedup, prune, limit                                   │
│         │                                                                   │
│         │ SessionStart trigger (startup|resume)                             │
│         ↓                                                                   │
│  ┌──────────────┐                                                           │
│  │ SessionInject│ ─── Context injection ───> Claude's context window        │
│  │ (INJECT)     │     top N by confidence,     (stdout capture)             │
│  └──────────────┘     500 token budget                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Delta Schema - Why Structured Format Matters

The ACE system uses a structured delta format rather than simple guidelines. This provides Claude with more context about WHEN and WHY to apply learned patterns.

**Structured Delta Format:**

```javascript
{
  delta_id: "ace_01HQXYZ...",           // Unique ID for tracking
  problem: "cook skill encounters validation errors requiring input verification",
  solution: "Verify all required inputs are provided and properly formatted before skill execution",
  condition: "When using /cook skill on *.cs files",
  helpful_count: 15,                     // Automated success signals
  not_helpful_count: 2,                  // Automated failure signals
  human_feedback_count: 3,               // Explicit thumbs up (weighted 3x)
  confidence: 0.87,                      // Calculated score
  created: "2026-01-10T08:30:00Z",
  last_helpful: "2026-01-12T09:00:00Z",
  source_events: ["evt_001", "evt_002"]  // Traceability
}
```

**Why Structured is Better:**

| Aspect | Simple Guideline | Structured Delta | Why It Matters |
|--------|------------------|------------------|----------------|
| **Context** | None | `condition` field | Claude knows WHEN to apply the pattern |
| **Clarity** | Vague | Problem + Solution | Claude understands the failure mode AND fix |
| **Debugging** | Impossible | `source_events` | You can trace WHY a delta was created |
| **Scoring** | Binary | `confidence` | Prioritize high-value patterns |
| **Lifecycle** | Unknown | `created`, `last_helpful` | Enable age-based pruning |

**Claude's Cognitive Advantage:**

Simple format - Claude gets a rule but no context:
```
- Always run tests before committing
```
Claude might apply this when you're just exploring code.

Structured format - Claude gets problem/solution/condition:
```
- **When:** When using /commit skill
  **Problem:** Commits fail CI because tests weren't run locally
  **Solution:** Always run tests before committing to catch regressions
```
Claude knows: "This applies specifically when I'm about to commit, and the reason is CI failures."

---

### Learning Loop - Detailed Code Flow

#### Stage 1: Event Capture (PostToolUse)

**File:** `ace-event-emitter.cjs`
**Trigger:** After every Bash or Skill tool execution

```javascript
// Core capture logic
function processBashTool(toolInput, toolResult) {
  const command = toolInput?.command || '';
  const exitCode = extractExitCode(toolResult);

  return {
    event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    tool: 'Bash',
    skill: detectSkillFromCommand(command),  // e.g., 'npm', 'git', 'dotnet'
    outcome: exitCode === 0 ? 'success' : 'failure',
    error_type: exitCode !== 0 ? classifyError(toolResult) : null,
    context: {
      command_prefix: command.slice(0, 100),
      exit_code: exitCode,
      duration_ms: extractDuration(toolResult)
    }
  };
}

// Error taxonomy for pattern grouping
function classifyError(output) {
  if (/ENOENT|not found|No such file/i.test(output)) return 'notFound';
  if (/permission denied|EACCES/i.test(output)) return 'permission';
  if (/timeout|ETIMEDOUT/i.test(output)) return 'timeout';
  if (/type.*error|undefined is not/i.test(output)) return 'type';
  if (/syntax.*error|unexpected token/i.test(output)) return 'syntax';
  if (/validation|invalid|required/i.test(output)) return 'validation';
  return 'unknown';
}

// Append with rotation at 10MB
function appendEvent(event) {
  rotateEventsIfNeeded();  // Prevents disk exhaustion
  fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n');
}
```

#### Stage 2: Pattern Extraction (PreCompact - Reflector)

**File:** `ace-reflector-analysis.cjs`
**Trigger:** PreCompact event (manual or auto context compaction)

```javascript
function extractPatterns(events) {
  const groups = {};

  for (const event of events) {
    // Group by skill + error_type combination
    const key = `${event.skill}:${event.error_type || 'success'}`;

    if (!groups[key]) {
      groups[key] = {
        skill: event.skill,
        error_type: event.error_type,
        success_count: 0,
        failure_count: 0,
        events: [],
        file_patterns: new Set()
      };
    }

    // Track outcomes
    if (event.outcome === 'success') groups[key].success_count++;
    if (event.outcome === 'failure') groups[key].failure_count++;

    groups[key].events.push(event.event_id);
  }

  // Only patterns with 3+ events qualify (filters noise)
  return Object.values(groups).filter(g => g.events.length >= 3);
}

// Confidence formula with human weight
function calculateConfidence(helpful, notHelpful, humanFeedback) {
  const HUMAN_WEIGHT = 3;
  const totalPositive = helpful + (humanFeedback * HUMAN_WEIGHT);
  const totalNegative = notHelpful;
  const total = totalPositive + totalNegative;
  return total > 0 ? totalPositive / total : 0;
}
```

**Why 3+ events minimum?** Single occurrences could be noise. 3+ events suggest a real pattern.

#### Stage 3: Quality Control (PreCompact - Curator)

**File:** `ace-curator-pruner.cjs`
**Trigger:** PreCompact event (chained after Reflector)

```javascript
const CONFIDENCE_THRESHOLD = 0.80;  // 80% confidence required
const MAX_DELTAS = 50;              // Playbook size limit
const PRUNE_AGE_DAYS = 90;          // Stale pattern removal
const MIN_SUCCESS_RATE = 0.20;      // 20% minimum success rate
const SIMILARITY_THRESHOLD = 0.85;  // 85% for deduplication

function promoteQualifiedCandidates(candidates, deltas) {
  const promotable = candidates.filter(c =>
    calculateConfidence(c) >= CONFIDENCE_THRESHOLD
  );

  for (const candidate of promotable) {
    // Check for similar existing delta
    const duplicate = findDuplicate(candidate, deltas);

    if (duplicate) {
      // Merge counts instead of creating duplicate
      mergeDeltas(duplicate, candidate);
    } else {
      // Add as new delta
      deltas.push(candidate);
    }
  }
}

function isStale(delta, pruneDate) {
  // Age-based pruning
  if (new Date(delta.created) < pruneDate) return true;

  // Performance-based pruning
  const total = delta.helpful_count + delta.not_helpful_count;
  if (total >= 10) {
    const successRate = delta.helpful_count / total;
    if (successRate < MIN_SUCCESS_RATE) return true;
  }
  return false;
}

// Similarity using Jaccard token overlap
function stringSimilarity(str1, str2) {
  const tokenize = s => new Set(s.toLowerCase().split(/[\s,.:;]+/).filter(Boolean));
  const tokens1 = tokenize(str1);
  const tokens2 = tokenize(str2);

  const intersection = [...tokens1].filter(t => tokens2.has(t)).length;
  const union = new Set([...tokens1, ...tokens2]).size;

  return union > 0 ? intersection / union : 0;
}
```

**Quality Gates Summary:**

| Gate | Threshold | Purpose |
|------|-----------|---------|
| Confidence | 80% | Only promote validated patterns |
| Max deltas | 50 | Prevent context overflow |
| Age | 90 days | Keep playbook fresh |
| Success rate | 20% min | Remove consistently failing patterns |
| Similarity | 85% | Prevent redundant entries |

#### Stage 4: Context Injection (SessionStart)

**File:** `ace-session-inject.cjs`
**Trigger:** SessionStart (startup or resume)

```javascript
const MAX_INJECTION_TOKENS = 500;
const CHARS_PER_TOKEN = 4;  // Conservative estimate
const MAX_CHARS = MAX_INJECTION_TOKENS * CHARS_PER_TOKEN;  // 2000 chars

function buildInjection(deltas, context) {
  // Filter by context match
  const relevantDeltas = deltas.filter(d =>
    matchesCondition(d.condition, context)
  );

  // Build injection within token budget
  let injection = '\n## ACE Learned Patterns\n\n';
  injection += '> Patterns learned from previous executions (auto-generated).\n\n';

  let charCount = injection.length;
  const injectedIds = [];

  // Add deltas until budget exhausted (already sorted by confidence)
  for (const delta of relevantDeltas) {
    const formatted = formatDeltaForInjection(delta);
    const lineLength = formatted.length + 1;

    if (charCount + lineLength > MAX_CHARS) break;  // Budget exceeded

    injection += formatted + '\n';
    charCount += lineLength;
    injectedIds.push(delta.delta_id);
  }

  return { injection, injectedIds };
}

function formatDeltaForInjection(delta) {
  return `- **When:** ${delta.condition}\n  **Problem:** ${delta.problem}\n  **Solution:** ${delta.solution}`;
}
```

**Why Token Budget Matters:**
- Claude's context window is finite
- Without budget, 50 deltas × ~100 chars = 5000 chars = ~1250 tokens wasted
- With 500 token budget, only top ~10 highest-confidence deltas inject
- Higher confidence = more valuable = prioritized

---

### Concurrency Safety

**File:** `ace-playbook-state.cjs`

```javascript
// File locking prevents race conditions
function acquireLock() {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;  // 5 second timeout

  while (Date.now() < deadline) {
    try {
      // O_EXCL fails if file exists - atomic lock creation
      fs.writeFileSync(LOCK_FILE, process.pid.toString(), { flag: 'wx' });
      return true;
    } catch (err) {
      if (err.code === 'EEXIST') {
        // Check if lock is stale (owning process dead)
        const pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10);
        if (!isProcessAlive(pid)) {
          fs.unlinkSync(LOCK_FILE);  // Remove stale lock
          continue;
        }
        sleepSync(LOCK_RETRY_DELAY_MS);  // Wait and retry
      }
    }
  }
  return false;  // Lock acquisition failed
}

function withLock(fn) {
  if (!acquireLock()) throw new Error('Lock timeout');
  try {
    return fn();
  } finally {
    releaseLock();
  }
}

// Atomic write prevents corruption on crash
function atomicWriteJSON(filePath, data) {
  const tmpPath = filePath + '.tmp';
  const bakPath = filePath + '.bak';

  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));  // Write temp

  if (fs.existsSync(filePath)) {
    fs.renameSync(filePath, bakPath);  // Backup original
  }

  fs.renameSync(tmpPath, filePath);  // Atomic rename

  try { fs.unlinkSync(bakPath); } catch {}  // Cleanup backup
}
```

---

### Why This Design Produces Better Results

**Real-World Scenarios:**

| Scenario | Simple Design | Current ACE | Outcome |
|----------|--------------|-------------|---------|
| **Noisy pattern**: npm test fails 8/10 times due to env issue | Creates "npm test often fails" (useless) | Confidence = 20%, below 80% → NOT promoted | Noise filtered |
| **Context overflow**: 50 deltas accumulated | All 50 inject = ~1250 tokens wasted | Budget = 500 tokens, only top ~10 inject | Context preserved |
| **Similar patterns**: "Run tests" and "Run tests before commit" | Both added separately | 85% similarity → merged with combined counts | No redundancy |
| **Stale pattern**: 6-month-old pattern, codebase changed | Stays forever | Pruned after 90 days | Playbook fresh |

---

### Extending the ACE System

#### Adding Custom Event Classification

Edit `ace-event-emitter.cjs` to add new error types:

```javascript
function classifyError(output) {
  // Add custom classifications
  if (/rate.*limit|429|too many requests/i.test(output)) return 'rateLimit';
  if (/authentication|401|unauthorized/i.test(output)) return 'auth';
  // ... existing classifications
}
```

#### Customizing Confidence Weights

Edit `ace-constants.cjs`:

```javascript
module.exports = {
  HUMAN_WEIGHT: 3.0,           // Increase for more human influence
  CONFIDENCE_THRESHOLD: 0.80,  // Lower for faster promotion
  MAX_DELTAS: 50,              // Increase for larger playbook
  STALE_DAYS: 90,              // Decrease for faster pruning
};
```

#### Adding Custom Pattern Generation

Edit `ace-reflector-analysis.cjs` to customize problem/solution text:

```javascript
function generateSolution(pattern) {
  // Add custom solutions for your error types
  const solutions = {
    rateLimit: 'Implement exponential backoff for API calls',
    auth: 'Verify authentication tokens are valid before requests',
    // ... existing solutions
  };
  return solutions[pattern.error_type] || defaultSolution(pattern);
}
```

---

## Pattern Learning System

### Overview

The Pattern Learning system provides **explicit pattern teaching** alongside the ACE automatic learning system. While ACE learns from skill execution outcomes, the Pattern Learning system allows users to directly teach Claude patterns, preferences, and conventions.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Pattern Learning System                          │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │    User      │    │   Pattern    │    │   Pattern    │          │
│  │   /learn     │───▶│   Learner    │───▶│   Storage    │          │
│  └──────────────┘    │    Hook      │    │    YAML      │          │
│                      └──────────────┘    └──────────────┘          │
│                             │                   │                   │
│                             ▼                   ▼                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Session    │◀───│   Pattern    │◀───│   Pattern    │          │
│  │   Inject     │    │   Injector   │    │   Matcher    │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | File | Purpose |
|-----------|------|---------|
| Pattern Learner | `pattern-learner.cjs` | Detects user corrections and explicit teachings |
| Pattern Injector | `pattern-injector.cjs` | Injects relevant patterns at session start and tool use |
| Pattern Matcher | `lib/pattern-matcher.cjs` | Calculates relevance scores for pattern selection |
| Pattern Storage | `lib/pattern-storage.cjs` | YAML storage and index management |

### Hook Events

| Event | Hook | Purpose |
|-------|------|---------|
| SessionStart (startup\|resume) | pattern-injector.cjs | Inject patterns at session start |
| PreToolUse (*) | pattern-injector.cjs | Inject context-relevant patterns |
| UserPromptSubmit | pattern-learner.cjs | Detect corrections and teachings |

### Usage

**Explicit Teaching:**
```
/learn always use PlatformValidationResult instead of throwing exceptions
/learn [wrong] throw new ValidationException() [right] return PlatformValidationResult.Invalid()
```

**Pattern Management:**
```
/learned-patterns                    # List all patterns
/learned-patterns view <id>          # View pattern details
/learned-patterns boost <id>         # Increase confidence
/learned-patterns archive <id>       # Archive pattern
```

### Storage Structure

```
.claude/learned-patterns/
├── index.yaml              # Pattern lookup index
├── backend/                # C#/.NET patterns
├── frontend/               # Angular/TypeScript patterns
├── workflow/               # Development process patterns
├── general/                # Cross-cutting patterns
└── archive/                # Archived patterns
```

### Confidence System

- **Explicit teaching** (`/learn`): Starts at 80% confidence
- **Implicit corrections**: Starts at 40% confidence
- **Confirmation**: +10% confidence
- **Conflict**: -15% confidence
- **Decay**: After 30 days unused
- **Auto-archive**: Below 20% confidence

### Dual System Architecture

The Pattern Learning system operates **independently** from ACE:

| System | Storage | Learning Method | Injection |
|--------|---------|-----------------|-----------|
| ACE | `deltas.json` | Automatic from skill outcomes | SessionStart |
| Patterns | `learned-patterns/*.yaml` | Explicit user teaching | SessionStart + PreToolUse |

Both systems coexist and complement each other:
- **ACE** learns what works from execution outcomes
- **Patterns** learn explicit preferences and conventions from users

---

## Related Documentation

- [Architecture](./architecture.md) - System architecture and planning protocol
- [Troubleshooting](./troubleshooting.md) - Investigation protocol and common issues
- [Backend Patterns](./backend-patterns.md) - CQRS, Repository, Entity patterns
- [Frontend Patterns](./frontend-patterns.md) - Component, Store, Form patterns
- [Decision Trees](./decision-trees.md) - Quick decision guides
- [Skills README](.claude/skills/README.md) - Skill development guide
- [Agent Skills Spec](.claude/skills/agent_skills_spec.md) - Agent specification
