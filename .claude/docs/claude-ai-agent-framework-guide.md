# Claude AI Agent Framework — Architecture & Best Practices

> How to engineer Claude Code into a self-reinforcing, hallucination-resistant, context-aware AI development agent through hooks, skills, workflows, and specialized agents.

**Audience:** AI engineers, tech leads, and teams wanting to build reliable AI-assisted development systems.
**Scope:** What each layer does, why it exists, how the pieces compose, the design principles behind every decision, and which AI agent best practices each addresses.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [The Three Pillars](#3-the-three-pillars-hooks-skills-workflows)
4. [Hook System Deep Dive](#4-hook-system-deep-dive)
5. [Skill System Deep Dive](#5-skill-system-deep-dive)
6. [Workflow System Deep Dive](#6-workflow-system-deep-dive)
7. [Project Configuration — Generic & Reusable](#7-project-configuration--generic--reusable)
8. [AI Agent Best Practices Applied](#8-ai-agent-best-practices-applied)
    - 8.9 [TDD Workflow & Unified Test Specification System](#89-tdd-workflow--unified-test-specification-system)
    - 8.10 [Full Development Lifecycle Coverage](#810-full-development-lifecycle-coverage)
    - 8.12 [E2E Testing System — Framework-Agnostic AI-Assisted E2E](#812-e2e-testing-system--framework-agnostic-ai-assisted-e2e)
    - 8.13 [Greenfield Project Support — AI as Solution Architect](#813-greenfield-project-support--ai-as-solution-architect)
    - 8.14 [Big Feature Workflow — Research-Driven Development](#814-big-feature-workflow--research-driven-development)
    - 8.15 [Prompt Engineering Principles Applied](#815-prompt-engineering-principles-applied)
    - 8.16 [Context Engineering Principles Applied](#816-context-engineering-principles-applied)
9. [State Management & Recovery](#9-state-management--recovery)
10. [Testing Infrastructure](#10-testing-infrastructure)
11. [Quick Reference](#11-quick-reference)
12. [The Agent System](#12-the-agent-system--specialized-subagents)
13. [Summary — Philosophy & Principles](#summary--philosophy--principles)

---

## 1. Executive Summary

This framework wraps Claude Code in a **3-layer framework** — **34 hooks**, **203+ skills**, **47 workflows**, and **24 specialized agents** — that transforms a generic LLM into a project-aware, quality-enforced, hallucination-resistant development agent. The framework covers the **entire software development lifecycle** — from idea capture and TDD test specification through implementation, testing, E2E testing, code review, and documentation — with AI as a first-class participant at every stage.

**Core insight:** LLMs forget, hallucinate, and drift. Instead of hoping the AI "just gets it right," this framework uses **programmatic guardrails** (hooks) and **prompt-engineered protocols** (skills/workflows) to enforce correctness at every stage.

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHAT THE FRAMEWORK SOLVES                     │
├─────────────────────────────────────────────────────────────────┤
│  Problem               │  Solution Layer     │  Mechanism       │
│────────────────────────│─────────────────────│──────────────────│
│  AI forgets context    │  Hooks              │  Auto-injection  │
│  AI hallucinates code  │  Skills/Protocols   │  Evidence gates  │
│  AI skips steps        │  Workflows          │  Step enforcement│
│  AI ignores patterns   │  project-config     │  Dynamic context │
│  AI loses state        │  Swap engine        │  External memory │
│  AI drifts from plan   │  Edit enforcement   │  Task gating     │
│  AI skips test specs   │  TDD skills/flows   │  Unified TC IDs  │
│  AI misses lifecycle   │  47 workflows       │  Full SDLC cover │
│  AI skips research   │  big-feature wf      │  Step-select gate  │
│  AI skips E2E tests    │  E2E skills/flows   │  Recording→test  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. System Architecture Overview

### High-Level Architecture

```mermaid
graph TB
    subgraph "User Layer"
        U[Developer Prompt]
    end

    subgraph "Routing Layer"
        WR[Workflow Router<br/>workflow-router.cjs]
        AUQ[AskUserQuestion<br/>Confirm Workflow]
    end

    subgraph "Enforcement Layer — 34 Hooks"
        subgraph "Safety Hooks"
            PB[Path Boundary Block]
            PR[Privacy Block]
            SB[Scout Block]
        end
        subgraph "Quality Hooks"
            EE[Edit Enforcement]
            SE[Skill Enforcement]
            SBC[Search Before Code]
        end
        subgraph "Context Injection Hooks"
            BC[Backend Context]
            FC[Frontend Context]
            DC[Design System Context]
            CP[Code Patterns Injector]
            LI[Lessons Injector]
        end
    end

    subgraph "Intelligence Layer — 203+ Skills"
        SP[Shared Protocols<br/>5 modules]
        IS[Implementation Skills<br/>cook, fix, refactor]
        QS[Quality Skills<br/>code-review, prove-fix]
        PS[Planning Skills<br/>plan, investigate, scout]
    end

    subgraph "Orchestration Layer — 47 Workflows"
        FW[Feature Workflow]
        BW[Bugfix Workflow]
        RW[Refactor Workflow]
        IW[Investigation Workflow]
    end

    subgraph "State Layer"
        TS[Todo State]
        WS[Workflow State]
        ES[Edit State]
        SW[Swap Engine<br/>External Memory]
    end

    subgraph "Configuration Layer"
        PC[project-config.json<br/>Generic & Reusable]
        CK[.ck.json<br/>Hook Config]
        ST[settings.json<br/>Hook Registration]
    end

    U --> WR
    WR --> AUQ
    AUQ --> FW & BW & RW & IW
    FW & BW & RW & IW --> IS & QS & PS
    IS & QS & PS --> SP
    SP --> BC & FC & DC & CP
    BC & FC --> PC
    EE & SE --> TS
    SW --> ES
    PB & PR & SB --> ST
```

### Component Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant Router as Workflow Router
    participant Hook as Hook System
    participant Skill as Skill Engine
    participant State as State Manager
    participant LLM as Claude LLM

    User->>Router: Submit prompt
    Router->>Router: Detect workflow match
    Router->>User: AskUserQuestion (confirm workflow)
    User->>Router: Confirm activation

    Router->>Skill: Activate workflow step 1 (/scout)
    Skill->>Hook: PreToolUse (Grep/Glob)
    Hook->>Hook: Safety check (path boundary, privacy)
    Hook->>LLM: Inject context (backend patterns, lessons)
    LLM->>LLM: Execute tool with injected context
    Hook->>State: PostToolUse (track tool count, swap large output)

    Skill->>Hook: PreToolUse (Edit/Write)
    Hook->>Hook: Edit enforcement (task exists?)
    Hook->>Hook: Search-before-code check
    Hook->>LLM: Inject code patterns + review rules
    LLM->>LLM: Make edit
    Hook->>State: Track edit count, run formatter

    State->>State: Persist todo state to disk
    Skill->>Router: Step complete → next step
```

---

## 3. The Three Pillars: Hooks, Skills, Workflows

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        THREE-PILLAR ARCHITECTURE                        │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │      HOOKS        │  │      SKILLS      │  │    WORKFLOWS     │      │
│  │  (Enforcement)    │  │  (Intelligence)  │  │  (Orchestration) │      │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤      │
│  │ • Run as shell    │  │ • Markdown prompts│  │ • JSON sequences │      │
│  │   processes       │  │   with YAML front │  │   of skill steps │      │
│  │ • Trigger on      │  │   matter          │  │ • Routed via     │      │
│  │   lifecycle events│  │ • Define AI       │  │   keyword detect │      │
│  │ • Block/allow/    │  │   behavior &      │  │ • User confirms  │      │
│  │   inject context  │  │   protocols       │  │   before activate│      │
│  │ • Persist state   │  │ • Enforce evidence│  │ • Steps tracked  │      │
│  │   across sessions │  │   & quality gates │  │   via todo system│      │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤      │
│  │ ANALOGY:          │  │ ANALOGY:          │  │ ANALOGY:          │      │
│  │ Middleware in a   │  │ Expert knowledge  │  │ CI/CD pipeline   │      │
│  │ web framework     │  │ loaded on demand  │  │ with stage gates │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
│                                                                         │
│  Hooks are PROGRAMMATIC (Node.js) — they execute reliably.              │
│  Skills are PROMPT-BASED (Markdown) — they guide AI reasoning.          │
│  Workflows are DECLARATIVE (JSON) — they define execution order.        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why three layers?** Each solves a different failure mode:

| Failure Mode                             | Layer         | Mechanism                                                                  |
| ---------------------------------------- | ------------- | -------------------------------------------------------------------------- |
| AI ignores instructions in long contexts | **Hooks**     | Inject reminders programmatically at every tool call                       |
| AI invents code patterns                 | **Skills**    | Load project-specific patterns into context on demand                      |
| AI skips investigation steps             | **Workflows** | Enforce step sequence with todo tracking                                   |
| AI forgets learned lessons               | **Hooks**     | Re-inject `docs/project-reference/lessons.md` on every prompt + every edit |
| AI makes changes without understanding   | **Hooks**     | Block edits until search evidence exists                                   |
| AI skips test planning                   | **Workflows** | TDD workflows enforce spec-before-code sequence                            |
| AI uses inconsistent test IDs            | **Skills**    | Unified `TC-{FEATURE}-{NNN}` format across all skills                      |

---

## 4. Hook System Deep Dive

### 4.1 What Hooks Are

Hooks are **Node.js scripts** that execute as child processes at specific lifecycle events. They receive JSON input on stdin and produce output on stdout. Exit codes control behavior:

```
Exit 0  →  Allow (inject context via stdout)
Exit 1  →  Block (user can override with APPROVED: prefix)
Exit 2  →  Block (security — no override possible)
```

### 4.2 Hook Lifecycle Events

```mermaid
graph LR
    subgraph "Session Events"
        SS[SessionStart] --> UPS[UserPromptSubmit]
        UPS --> PTU[PreToolUse]
        PTU --> TOOL[Tool Executes]
        TOOL --> POTU[PostToolUse]
        POTU --> PTU
        PTU --> PC[PreCompact]
        PC --> SS
        POTU --> SE[SessionEnd]
    end

    subgraph "Subagent Events"
        SAS[SubagentStart]
    end

    subgraph "Notification Events"
        N[Notification]
        STOP[Stop]
    end

    style SS fill:#4CAF50,color:white
    style SE fill:#f44336,color:white
    style PTU fill:#2196F3,color:white
    style POTU fill:#FF9800,color:white
    style UPS fill:#9C27B0,color:white
```

### 4.3 The 34 Hooks — Organized by Purpose

```
HOOK SYSTEM (34 hooks)
│
├── SESSION LIFECYCLE (7 hooks)
│   ├── session-init.cjs ─────────── Load config, set 25 env vars
│   ├── session-init-docs.cjs ────── Initialize reference docs from project-config
│   ├── post-compact-recovery.cjs ── Restore state after context compaction
│   ├── session-resume.cjs ────────── Restore todos from checkpoints
│   ├── npm-auto-install.cjs ──────── Install missing npm packages
│   ├── session-end.cjs ──────────── Cleanup swap files, save state
│   └── subagent-init.cjs ─────────── Inject context into subagents
│
├── PROMPT PROCESSING (3 hooks)
│   ├── init-prompt-gate.cjs ──────── Block until project-config exists
│   ├── workflow-router.cjs ───────── Detect & inject workflow catalog
│   └── prompt-context-assembler.cjs ─ Assemble dev rules + lessons + reminders
│
├── SAFETY & BLOCKING (4 hooks)
│   ├── path-boundary-block.cjs ──── Block access outside project root
│   ├── privacy-block.cjs ─────────── Block .env, credentials, keys
│   ├── scout-block.cjs ──────────── Block node_modules, dist, obj
│   └── windows-command-detector ──── Block Windows CMD in Git Bash
│
├── QUALITY ENFORCEMENT (3 hooks)
│   ├── edit-enforcement.cjs ──────── Require tasks before edits
│   ├── skill-enforcement.cjs ─────── Require tasks before skills
│   └── search-before-code.cjs ────── Require Grep/Glob before Edit
│
├── CONTEXT INJECTION (10 hooks)
│   ├── backend-context.cjs ───────── Backend patterns for server files
│   ├── frontend-context.cjs ──────── Frontend patterns for client files
│   ├── design-system-context.cjs ── Design tokens for UI components
│   ├── scss-styling-context.cjs ─── Styling patterns for style files
│   ├── code-patterns-injector.cjs ── Project-specific code patterns
│   ├── knowledge-context.cjs ──────── Framework/domain knowledge
│   ├── lessons-injector.cjs ──────── Past mistakes from lessons.md
│   ├── role-context-injector.cjs ── Role-based guidance (PO/BA/QA/Dev)
│   ├── figma-context-extractor ──── Figma design context
│   └── code-review-rules-injector ── Code review standards
│
├── POST-PROCESSING (7 hooks)
│   ├── tool-output-swap.cjs ──────── Externalize large outputs (>50KB)
│   ├── post-edit-prettier.cjs ────── Auto-format after edits
│   ├── artifact-path-resolver.cjs ── Resolve artifact paths in outputs
│   ├── bash-cleanup.cjs ─────────── Clean temp files
│   ├── todo-tracker.cjs ─────────── Persist todo state to disk
│   ├── workflow-step-tracker.cjs ── Track workflow step completion
│   └── write-compact-marker.cjs ─── Save recovery state pre-compact
│
└── SUPPORT INFRASTRUCTURE (25 lib modules)
    ├── State: ck-session-state, workflow-state, todo-state, edit-state
    ├── Context: context-injector-base, prompt-injections, context-tracker
    ├── Memory: swap-engine (externalize large outputs)
    ├── Config: ck-paths, ck-config-loader, project-config-loader, ck-config-utils
    ├── Session: session-init-helpers, test-fixture-generator
    └── Utils: debug-log, hook-runner, stdin-parser, dedup-constants, ck-env-utils, ck-git-utils, ck-plan-resolver
```

### 4.4 How Context Injection Works

This is the **most important pattern** in the framework. Every time the AI edits a file, relevant knowledge is automatically injected:

```mermaid
graph TB
    subgraph "AI Requests Edit"
        E[Edit src/Services/Orders/CreateOrderCommand.ts]
    end

    subgraph "PreToolUse Hook Pipeline"
        BC[backend-context.cjs]
        CP[code-patterns-injector.cjs]
        LI[lessons-injector.cjs]
        SBC[search-before-code.cjs]
        EE[edit-enforcement.cjs]
    end

    subgraph "Context Loaded"
        P1[backend-patterns-reference.md<br/>Architecture patterns, repository rules]
        P2[Code patterns from similar files]
        P3[docs/project-reference/lessons.md<br/>Past mistakes to avoid]
        P4[Recent search evidence check]
        P5[Task existence verification]
    end

    subgraph "project-config.json"
        PC[pathRegexes: src/Services/<br/>fileExtensions: project-specific<br/>patternsDoc: backend-patterns-reference.md]
    end

    E --> BC & CP & LI & SBC & EE
    BC --> PC
    PC --> P1
    CP --> P2
    LI --> P3
    SBC --> P4
    EE --> P5

    P1 & P2 & P3 --> INJ[Injected into LLM context<br/>before edit executes]
    P4 -->|No evidence?| BLOCK1[❌ Block: Search first]
    P5 -->|No task?| BLOCK2[❌ Block: Create task first]
```

**Why this matters:** The AI receives ~50-100KB of project-specific context **automatically**, without the developer needing to remember to ask for it.

### 4.5 Deduplication — Preventing Context Bloat

Hooks check the last N lines of the conversation transcript for dedup markers before re-injecting:

```
┌─────────────────────────────────────────────────────┐
│  DEDUP MECHANISM                                     │
│                                                      │
│  Hook                    │ Marker           │ Lines  │
│──────────────────────────│──────────────────│────────│
│  backend-context.cjs     │ ## Backend Context│  300  │
│  frontend-context.cjs    │ ## Frontend Context│ 300  │
│  code-patterns-injector  │ ## Code Patterns  │  300  │
│  lessons-injector (prompt)│ ## Learned Lessons│   50  │
│  search-before-code      │ Recent Grep/Glob │  100  │
│                                                      │
│  IF marker found in last N lines → SKIP injection    │
│  IF not found → INJECT (context was compacted away)  │
└─────────────────────────────────────────────────────┘
```

**Why:** Without dedup, the same 50KB backend patterns doc would be injected on every single edit, consuming the context window. With dedup, it's injected once per compaction cycle.

### 4.6 Blocking Hierarchy

```
SECURITY BLOCKS (Exit 2) — Cannot override
├── path-boundary-block: Files outside project root
└── scout-block: Bulk access to node_modules, dist, obj

FEATURE BLOCKS (Exit 1) — User can override
├── privacy-block: .env, credentials (override: APPROVED: prefix)
├── edit-enforcement: No active task (override: create task first)
├── skill-enforcement: No active task for implementation skills
└── search-before-code: No recent Grep/Glob evidence

ADVISORY (Exit 0) — Context injection, no blocking
├── All context injection hooks
├── Lessons injection
└── Role context injection
```

---

## 5. Skill System Deep Dive

### 5.1 What Skills Are

Skills are **Markdown files with YAML frontmatter** that define AI behavior patterns. When activated, their content is loaded into the LLM context, guiding reasoning and enforcing protocols.

```yaml
# .claude/skills/{skill-name}/SKILL.md
---
name: prove-fix
description: '[Code Quality] Prove fix correctness with code proof traces'
version: 1.2.0
allowed-tools: Read, Grep, Glob, Bash, Write, TaskCreate
---
# Skill body (Markdown)
## Protocol
1. For each changed file, trace proof chain...
2. Declare confidence level...
```

### 5.2 Skill Categories (203+ skills)

```mermaid
mindmap
  root((203+ Skills))
    Quality & Verification
      code-review
      prove-fix
      quality-gate
      review-changes
      review-post-task
      code-simplifier
      sre-review
    Planning & Research
      plan
      plan-fast
      plan-hard
      plan-review
      plan-validate
      investigate
      scout
      research
    Implementation
      cook
      cook-fast
      cook-hard
      fix
      fix-types
      fix-hard
      refactoring
      api-design
    Testing & TDD
      tdd-spec
      test-spec
      integration-test
      e2e-test
      test-specs-docs
      test
      webapp-testing
    Requirements & Ideas
      idea
      refine
      story
      prioritize
      product-owner
      design-spec
    Debug & Diagnosis
      debug
      fix-issue
      fix-ci
      fix-test
      fix-logs
      performance
    Documentation
      feature-docs
      docs-update
      changelog
      release-notes
      docs-seeker
    Architecture
      arch-cross-service-integration
      arch-performance-optimization
      arch-security-review
      domain-analysis
      tech-stack-research
    Process & Collaboration
      workflow-start
      workflow-end
      handoff
      acceptance
      retro
    Frontend & Design
      frontend-design
      ui-ux-pro-max
      web-design-guidelines
    AI & Tools
      sequential-thinking
      ai-multimodal
      custom-agent
      mcp-management
    Workflow Triggers (18)
      workflow-feature
      workflow-big-feature
      workflow-bugfix
      workflow-greenfield
      workflow-refactor
      ... 13 more
```

### 5.3 Shared Protocols — The Foundation

Five shared modules enforce universal behavior across all 203+ skills:

```
.claude/skills/shared/
├── understand-code-first-protocol.md   ← READ before WRITE
├── evidence-based-reasoning-protocol.md ← Prove before claim
├── scan-and-update-reference-doc-protocol.md
├── design-system-check.md
└── web-research-protocol.md
```

#### Protocol 1: Understand Code First

```
┌─────────────────────────────────────────────────────────────────┐
│  UNDERSTAND CODE FIRST PROTOCOL                                  │
│                                                                   │
│  BEFORE writing any code, you MUST:                              │
│                                                                   │
│  1. SEARCH for 3+ similar implementations (Grep/Glob)           │
│     └─ "How does the codebase already do this?"                  │
│                                                                   │
│  2. READ the target file (Read tool)                             │
│     └─ "What exists here now?"                                   │
│                                                                   │
│  3. VALIDATE assumptions with evidence                            │
│     └─ "Is my understanding correct? Proof: file:line"           │
│                                                                   │
│  4. For non-trivial tasks (>3 files):                            │
│     └─ Write analysis to .ai/workspace/analysis/                 │
│                                                                   │
│  ANTI-PATTERNS (FORBIDDEN):                                       │
│  ❌ Guessing constructor signatures                               │
│  ❌ Assuming DI registrations                                      │
│  ❌ Inventing new patterns when existing ones work                │
│  ❌ Making changes without reading current code                   │
└─────────────────────────────────────────────────────────────────┘
```

#### Protocol 2: Evidence-Based Reasoning

```
┌─────────────────────────────────────────────────────────────────┐
│  EVIDENCE-BASED REASONING PROTOCOL                               │
│                                                                   │
│  CONFIDENCE LEVELS:                                               │
│                                                                   │
│    95-100%  ████████████████████  Recommend freely                │
│             Full trace, all services checked                      │
│                                                                   │
│    80-94%   ████████████████░░░░  Recommend with caveats          │
│             Main paths verified, edge cases unverified            │
│                                                                   │
│    60-79%   ████████████░░░░░░░░  Recommend cautiously            │
│             Partial trace, need more evidence                    │
│                                                                   │
│    <60%     ████░░░░░░░░░░░░░░░░  ❌ DO NOT RECOMMEND            │
│             Insufficient evidence — STOP and investigate         │
│                                                                   │
│  FORBIDDEN PHRASES:                                               │
│  "obviously..."    → Replace with: "Pattern found in 8 files"    │
│  "I think..."      → Replace with: "Evidence from file:42"       │
│  "probably..."     → Replace with: "Needs verification: [list]"  │
│  "should be..."    → Replace with: "Grep shows 12 instances"     │
│  "this is because" → Replace with: "file:line shows..."          │
│                                                                   │
│  BREAKING CHANGE RISK MATRIX:                                     │
│  HIGH   → Full usage trace + all 5 services + impact analysis    │
│  MEDIUM → Usage trace + test verification + all 5 services       │
│  LOW    → Code review only                                       │
│                                                                   │
│  VALIDATION CHECKLIST (skip none):                                │
│  □ Find ALL implementations (grep "class.*:.*IInterface")        │
│  □ Trace ALL registrations (grep "AddScoped|AddSingleton")       │
│  □ Verify ALL usage sites (grep -r "ClassName" = 0)              │
│  □ Check string literals / reflection / dynamic invocations      │
│  □ Check config references (appsettings.json, env vars)          │
│  □ Cross-service check — ALL 5 microservices                     │
│  □ Assess impact — what breaks if removed?                       │
│  □ Declare confidence — X% with evidence list                    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 How Skills Activate

```mermaid
flowchart TB
    A[User prompt arrives] --> B{Explicit /skill-name?}
    B -->|Yes| C[Load SKILL.md directly]
    B -->|No| D{Workflow detected?}
    D -->|Yes| E[Workflow step activates skill]
    D -->|No| F{Keyword match in<br/>skill descriptions?}
    F -->|Yes| G[Auto-activate matching skill]
    F -->|No| H[Use general LLM reasoning]

    C & E & G --> I[SKILL.md content loaded<br/>into LLM context]
    I --> J[Shared protocols<br/>also loaded]
    J --> K[AI follows skill instructions<br/>with evidence requirements]

    style C fill:#4CAF50,color:white
    style E fill:#2196F3,color:white
    style G fill:#FF9800,color:white
```

---

## 6. Workflow System Deep Dive

### 6.1 What Workflows Are

Workflows are **JSON-defined sequences of skills** stored in `.claude/workflows.json`. They ensure the AI follows a disciplined step-by-step process rather than jumping straight to code.

```json
{
    "bugfix": {
        "name": "Bug Fix",
        "confirmFirst": false,
        "whenToUse": "User reports a bug, error, crash, failure",
        "whenNotToUse": "New feature implementation, refactoring",
        "sequence": [
            "scout",
            "feature-investigation",
            "debug",
            "plan",
            "plan-review",
            "plan-validate",
            "why-review",
            "fix",
            "prove-fix",
            "code-simplifier",
            "review-changes",
            "code-review",
            "changelog",
            "test",
            "docs-update",
            "watzup",
            "workflow-end"
        ],
        "preActions": {
            "readFiles": ["docs/project-reference/backend-patterns-reference.md"],
            "injectContext": "Debug mindset: Never assume first hypothesis..."
        }
    }
}
```

### 6.2 Workflow Catalog (47 Workflows)

```
WORKFLOW CATALOG
│
├── DEVELOPMENT (12) ★ includes TDD workflows + big-feature
│   ├── feature ─────────── scout→investigate→plan→cook→security→performance→test→docs
│   ├── big-feature ─────── idea→research→evaluate→domain→techstack→plan→cook→test→docs ★ NEW
│   ├── tdd-feature ─────── scout→investigate→tdd-spec→plan→cook→integration-test→test→docs ★ TDD
│   ├── bugfix ──────────── scout→investigate→debug→plan→fix→prove-fix→test
│   ├── hotfix ──────────── scout→plan→fix→prove-fix→test (fast path)
│   ├── refactor ────────── scout→investigate→plan→cook→test→docs
│   ├── batch-operation ─── plan→cook→review→test
│   ├── migration ───────── scout→investigate→plan→cook→test
│   ├── package-upgrade ─── scout→investigate→plan→cook→test
│   ├── idea-to-tdd ─────── idea→refine→tdd-spec ★ TDD (idea-to-test-specs pipeline)
│   ├── test-spec-update ── review-changes→tdd-spec→test-specs-docs→integration-test→test ★ NEW
│   ├── test-to-integration scout→integration-test→test→watzup ★ NEW
│   ├── e2e-from-recording ─ scout→e2e-test→test→watzup ★ E2E from Chrome recording
│   ├── e2e-update-ui ────── scout→e2e-test→test→watzup ★ Update screenshot baselines
│   └── e2e-from-changes ─── scout→e2e-test→test→watzup ★ Sync E2E with code changes
│
├── QUALITY (5)
│   ├── quality-audit ───── code-review→plan→cook→test
│   ├── security-audit ──── scout→security→watzup (read-only)
│   ├── performance ─────── scout→investigate→plan→cook→test
│   ├── review-changes ──── change review→watzup
│   └── code-review ─────── code-review→watzup
│
├── PLANNING (5)
│   ├── greenfield-init ─── idea→research→evaluate→domain→techstack→plan→tdd-spec→story→review
│   ├── pre-development ─── quality-gate→plan→plan-review→plan-validate
│   ├── investigation ───── scout→investigate (read-only)
│   ├── design-workflow ─── design-spec→code-review
│   └── release-prep ────── sre-review→quality-gate→release-notes
│
├── RESEARCH & CONTENT (4)
│   ├── research ──────────── web-research→deep-research→synthesis→review
│   ├── business-evaluation ── web-research→deep-research→market→evaluate→review
│   ├── marketing-strategy ── web-research→deep-research→market→strategy→review
│   └── course-building ───── web-research→deep-research→course→review
│
├── DOCUMENTATION (4)
│   ├── documentation ───── scout→investigate→plan→docs-update
│   ├── feature-docs ────── scout→investigate→plan→docs-update
│   ├── test-spec-gen ───── test-spec→quality-gate
│   └── visualize ─────────── scout→investigate→excalidraw-diagram
│
├── REQUIREMENTS (6)
│   ├── idea-to-pbi ─────── idea→refine→story→prioritize
│   ├── pbi-to-tests ────── tdd-spec→quality-gate ★ UPDATED (uses unified tdd-spec)
│   ├── sprint-planning ─── planning→dependency
│   ├── sprint-retro ────── status→retro
│   ├── team-sync ───────── status→agenda
│   └── pm-reporting ────── status→dependency
│
├── QUALITY (extended — 8 total above)
│   ├── testing ───────────── test→watzup
│   ├── test-verify ─────── scout→integration-test→test→watzup
│   └── verification ────── scout→investigate→test→fix→prove-fix→test
│
├── PROCESS (6)
│   ├── full-feature-lifecycle ── idea→refine→design→plan→cook→test→accept
│   ├── po-ba-handoff ─── idea→review→handoff→refine
│   ├── ba-dev-handoff ── review→quality-gate→handoff→plan
│   ├── design-dev-handoff ── design→review→handoff→plan
│   ├── dev-qa-handoff ── handoff→test-spec
│   └── qa-po-acceptance ── quality-gate→handoff→acceptance
│
└── INFRASTRUCTURE (2)
    ├── deployment ──────── scout→investigate→plan→cook→test
    └── devops ──────────── scout→investigate→plan→cook→test
```

### 6.3 Workflow Detection & Confirmation

```mermaid
sequenceDiagram
    participant User
    participant Router as workflow-router.cjs<br/>(UserPromptSubmit hook)
    participant Ask as AskUserQuestion
    participant Skill as Skill Engine
    participant Todo as Task System

    User->>Router: "There's a bug in employee validation"

    Note over Router: Keyword analysis:<br/>"bug" → bugfix workflow<br/>Confidence: HIGH

    Router->>Router: Inject workflow catalog<br/>into LLM context

    Note over Router: LLM reads catalog,<br/>detects "bugfix" match

    Router->>Ask: Present options:<br/>1. Activate Bugfix (Recommended)<br/>2. Execute directly

    Ask->>User: "Detected: Bugfix workflow.<br/>Activate? (scout→debug→fix→prove-fix→test)"

    User->>Ask: Confirms: Activate Bugfix

    Ask->>Skill: /workflow-start bugfix

    Skill->>Todo: Create tasks for ALL steps:<br/>1. [Bugfix] /scout<br/>2. [Bugfix] /investigate<br/>3. [Bugfix] /debug<br/>4. [Bugfix] /plan<br/>...17 steps total

    loop Each workflow step
        Todo->>Skill: Mark step in_progress
        Skill->>Skill: Execute step
        Skill->>Todo: Mark step completed
    end
```

**Why confirm first?** Two reasons:

1. **Prevents misrouting** — "fix this test" could be `bugfix` or `test` workflow
2. **User agency** — Developer may want to skip investigation for a known issue

### 6.4 Pre-Actions — Context Loading Before Execution

Each workflow defines `preActions` that load context before any step executes:

```json
{
    "preActions": {
        "readFiles": ["docs/project-reference/backend-patterns-reference.md", "docs/project-reference/code-review-rules.md"],
        "injectContext": "Role: API Designer\nMulti-line instruction text that guides AI behavior..."
    }
}
```

This ensures the AI has domain knowledge **before** it starts working, not after it makes mistakes.

---

## 7. Project Configuration — Generic & Reusable

### 7.1 Why project-config.json Exists

The hook and skill system is **project-agnostic**. All project-specific knowledge lives in `docs/project-config.json`. This means the entire `.claude/` framework can be reused across different projects by swapping one config file.

```mermaid
graph LR
    subgraph "Generic Framework (reusable)"
        H[34 Hooks]
        S[203+ Skills]
        W[46 Workflows]
    end

    subgraph "Project-Specific (swappable)"
        PC[project-config.json]
    end

    subgraph "Project A: Enterprise App"
        PA[Backend + Frontend<br/>5 microservices<br/>Database + Cache]
    end

    subgraph "Project B: Another Project"
        PB[Node.js + React<br/>3 services<br/>PostgreSQL]
    end

    H & S & W --> PC
    PC -->|Config A| PA
    PC -->|Config B| PB
```

### 7.2 Configuration Sections

```json
{
    "$schema": "v2",

    "framework": {
        "name": "Your Framework Name",
        "backendPatternsDoc": "docs/project-reference/backend-patterns-reference.md",
        "frontendPatternsDoc": "docs/project-reference/frontend-patterns-reference.md",
        "searchPatternKeywords": ["yourPattern1", "yourPattern2"]
    },

    "contextGroups": [
        {
            "name": "Backend Services",
            "pathRegexes": ["src[\\\\/]services[\\\\/]", "src[\\\\/]api[\\\\/]"],
            "fileExtensions": [".ts", ".py", ".cs", ".go"],
            "patternsDoc": "docs/project-reference/backend-patterns-reference.md",
            "rules": ["Use service-specific repositories", "Use validation framework, never throw raw exceptions", "Side effects go in event handlers"]
        },
        {
            "name": "Frontend Apps",
            "pathRegexes": ["src[\\\\/]web[\\\\/]", "src[\\\\/]client[\\\\/]"],
            "fileExtensions": [".ts", ".tsx", ".vue", ".html", ".scss"],
            "patternsDoc": "docs/project-reference/frontend-patterns-reference.md",
            "rules": ["Extend project base components", "Use project state management", "Follow project CSS conventions"]
        }
    ],

    "modules": [
        {
            "name": "orders-service",
            "type": "backend",
            "path": "src/services/orders",
            "database": "postgresql",
            "port": 5100
        }
        // ... add all your modules
    ],

    "designSystem": {
        "appMappings": [
            {
                "name": "web-app",
                "docFile": "DesignSystem.md",
                "pathRegexes": ["src[\\\\/]web[\\\\/]"]
            }
        ]
    },

    "referenceDocs": ["project-structure-reference.md", "backend-patterns-reference.md", "frontend-patterns-reference.md", "code-review-rules.md", "lessons.md"]
}
```

### 7.3 How Hooks Consume Config

```mermaid
flowchart TB
    A["AI edits: src/services/orders/create-order.ts"] --> B["backend-context.cjs triggers"]
    B --> C["Load project-config.json"]
    C --> D{"Match pathRegexes"}
    D -->|"src/services/ matches Backend Services"| E["Read patternsDoc:
    backend-patterns-reference.md"]
    E --> F["Inject rules:
    • Use service-specific repositories
    • Use validation framework
    • Side effects in event handlers"]
    F --> G["AI receives project-specific
    backend patterns"]

    D -->|"src/web/ matches Frontend Apps"| H["Read patternsDoc:
    frontend-patterns-reference.md"]
    H --> I["Inject rules:
    • Extend project base components
    • Use project state management
    • Follow CSS conventions"]
```

---

## 8. AI Agent Best Practices Applied

This section maps each framework mechanism to the **AI agent best practice** it implements.

### 8.1 Context Injection Rules — Preventing AI Amnesia

```
┌─────────────────────────────────────────────────────────────────┐
│  BEST PRACTICE: Context Injection at Decision Points             │
│                                                                   │
│  PROBLEM: LLMs have limited context windows. Project knowledge   │
│  gets pushed out during long conversations. After compaction,    │
│  all context is lost.                                             │
│                                                                   │
│  SOLUTION: Hooks re-inject relevant knowledge automatically      │
│  at every decision point (edit, prompt, tool use).               │
│                                                                   │
│  IMPLEMENTATION:                                                  │
│                                                                   │
│  Event                │ Injected Context              │ Hook     │
│───────────────────────│───────────────────────────────│──────────│
│  Every user prompt    │ Workflow catalog               │ router  │
│  Every user prompt    │ Development rules              │ rules   │
│  Every user prompt    │ Learned lessons                │ lessons │
│  Edit backend file    │ Backend patterns (up to 60KB)  │ backend │
│  Edit frontend file   │ Frontend patterns              │ frontend│
│  Edit style file      │ Styling guide                  │ scss    │
│  Edit UI component    │ Design system tokens           │ design  │
│  Activate code-review │ Code review rules              │ cr-rules│
│  Context compaction   │ Recovery state                 │ compact │
│  Subagent spawned     │ Project context + lessons      │ sub-init│
│                                                                   │
│  DEDUP: Each injection checks for its marker in last 300 lines  │
│  of transcript. Skips if already present. Re-injects after      │
│  compaction when markers are gone.                               │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Reminder Rules — Preventing AI Attention Drift

```mermaid
graph TB
    subgraph "The Forgetting Problem"
        F1[AI reads CLAUDE.md at session start]
        F2[After 20+ tool calls, instructions<br/>are far back in context]
        F3[AI starts ignoring rules]
        F4[After compaction, rules<br/>are completely gone]
    end

    subgraph "The Reminder Solution"
        R1[prompt-context-assembler.cjs<br/>Re-injects rules + lessons EVERY prompt]
        R2[lessons-injector.cjs<br/>Re-injects lessons on edit context]
    end

    F1 --> F2 --> F3
    F2 --> F4
    R1 -.->|prevents| F3
    R2 -.->|prevents| F3

    style F3 fill:#f44336,color:white
    style F4 fill:#f44336,color:white
    style R1 fill:#4CAF50,color:white
    style R2 fill:#4CAF50,color:white
```

**Key insight:** Rules in CLAUDE.md are read once at session start. Rules injected via hooks are re-read on every prompt. The hooks turn one-time instructions into persistent reminders.

### 8.3 Workflow Confirmation — Preventing AI Autopilot

```
┌─────────────────────────────────────────────────────────────────┐
│  BEST PRACTICE: Always Confirm Before Acting                     │
│                                                                   │
│  PROBLEM: AI detects "feature" keyword and immediately starts    │
│  implementing without confirming scope or approach.              │
│                                                                   │
│  SOLUTION: Mandatory AskUserQuestion before workflow activation  │
│                                                                   │
│  FLOW:                                                            │
│                                                                   │
│  User: "Add a delete button to user profile"                     │
│                    ↓                                              │
│  AI detects: "feature" workflow                                   │
│                    ↓                                              │
│  AI MUST ask:                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Detected: Feature Implementation workflow.                 │  │
│  │  Steps: scout→investigate→plan→cook→test→docs              │  │
│  │                                                              │  │
│  │  ○ Activate Feature Workflow (Recommended)                  │  │
│  │  ○ Execute directly without workflow                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                    ↓                                              │
│  User confirms → Workflow activates                               │
│  User declines → Direct execution (no step enforcement)          │
│                                                                   │
│  WHY: Prevents misrouting. "Fix this test" could be:             │
│  - bugfix workflow (if test reveals a bug)                       │
│  - test workflow (if test code needs fixing)                     │
│  - investigation workflow (if user wants to understand test)     │
└─────────────────────────────────────────────────────────────────┘
```

### 8.4 Plan Confirmation — Preventing AI "Ready, Fire, Aim"

```mermaid
flowchart TB
    A["Non-trivial task detected"] --> B["/plan skill activates"]
    B --> C{"Simple or Complex?"}
    C -->|"Less than 5 files"| D["/plan-fast"]
    C -->|"5+ files"| E["/plan-hard
    Subagent deep research"]

    D & E --> F["Write plan to plans/ directory"]
    F --> G["/plan-review
    Critical evaluation of plan"]
    G --> H["/plan-validate
    3-8 questions via AskUserQuestion"]

    H --> I{"User answers questions"}
    I -->|"Clarification needed"| H
    I -->|"Plan approved"| J["Implementation begins"]

    J --> K["edit-enforcement.cjs
    Warns at 4 files, re-warns at 8"]

    style H fill:#FF9800,color:white
    style K fill:#f44336,color:white
```

**The 3-question minimum:** `/plan-validate` asks 3-8 critical questions about the plan before implementation. This catches:

- Scope misunderstandings
- Missing edge cases
- Wrong architectural assumptions
- Unstated dependencies

### 8.5 Sequential Thinking — Preventing AI Shallow Reasoning

```
┌─────────────────────────────────────────────────────────────────┐
│  BEST PRACTICE: Force Sequential Thinking for Complex Problems   │
│                                                                   │
│  TOOLS:                                                           │
│  1. /sequential-thinking skill — Structured multi-step analysis  │
│  2. /debug skill — Systematic root cause investigation           │
│  3. Sequential-thinking MCP server — External reasoning tool     │
│                                                                   │
│  WHEN ACTIVATED:                                                  │
│  - Complex debugging (multiple possible root causes)             │
│  - Architectural decisions (multiple valid approaches)           │
│  - Performance analysis (layered bottlenecks)                    │
│  - Security review (attack surface analysis)                     │
│                                                                   │
│  HOW IT WORKS:                                                    │
│                                                                   │
│  Step 1: State the problem precisely                              │
│  Step 2: List ALL hypotheses (don't commit to first one)         │
│  Step 3: For EACH hypothesis, find supporting/contradicting      │
│          evidence (file:line citations)                           │
│  Step 4: Rank hypotheses by evidence strength                    │
│  Step 5: Test highest-ranked hypothesis                          │
│  Step 6: If wrong, update rankings and test next                 │
│                                                                   │
│  KEY RULE: "Never assume first hypothesis → verify with traces"  │
│                                                                   │
│  INTEGRATION:                                                     │
│  - bugfix workflow injects: "Debug mindset is NON-NEGOTIABLE"    │
│  - /prove-fix requires proof traces for every change             │
│  - /investigate requires Knowledge Graph per file                │
└─────────────────────────────────────────────────────────────────┘
```

### 8.6 Anti-Hallucination Protocol — Code Proof Tracing

This is the **most critical best practice** in the framework.

```mermaid
flowchart TB
    subgraph "Before Any Claim"
        A[AI wants to say:<br/>'This method should be public']
    end

    subgraph "Required Evidence Chain"
        B1[1. grep 'class.*:.*IInterface'<br/>Find ALL implementations]
        B2[2. grep 'AddScoped.*IName'<br/>Trace ALL registrations]
        B3[3. grep -r 'ClassName'<br/>Verify ALL usage sites]
        B4[4. Check string literals<br/>reflection, factories]
        B5[5. Check config references<br/>appsettings.json]
        B6[6. Cross-service check<br/>ALL 5 microservices]
        B7[7. Assess impact<br/>What breaks if changed?]
        B8[8. Declare confidence<br/>X% with evidence list]
    end

    subgraph "Confidence Gate"
        C1["95-100% → Recommend"]
        C2["80-94% → Recommend with caveats"]
        C3["60-79% → Recommend cautiously"]
        C4["<60% → ❌ STOP. Gather more evidence"]
    end

    A --> B1 --> B2 --> B3 --> B4 --> B5 --> B6 --> B7 --> B8
    B8 --> C1 & C2 & C3 & C4

    style C4 fill:#f44336,color:white
    style C1 fill:#4CAF50,color:white
```

**The prove-fix skill** takes this further by requiring a **proof trace** for every bug fix:

```
## Recommendation: Change visibility of ProcessPayment to public

### Evidence
1. **orders-service/PaymentProcessor.ts:42** — Currently internal
2. **Grep Result** — Found 3 call sites expecting public access
3. **Framework Documentation** — Base service class exposes public API
4. **Similar Patterns** — ProcessRefund (public), ProcessInvoice (public)

### Confidence: 92%
- ✅ Verified: Main usage in Orders, Accounts
- ⚠️ Unverified: Surveys service (no payment module found)
- ❓ Assumptions: No reflection-based access

### Risk Assessment
If Wrong: Build error in consuming services
Mitigation: Grep for all references before changing
```

### 8.7 Search Before Code — Preventing Pattern Invention

```
┌─────────────────────────────────────────────────────────────────┐
│  BEST PRACTICE: Search Before Create                             │
│                                                                   │
│  HOOK: search-before-code.cjs                                    │
│  TRIGGER: PreToolUse on Edit|Write|MultiEdit                     │
│  BEHAVIOR: Blocks edit if no Grep/Glob in last 100 transcript   │
│            lines (unless file < 20 lines or "skip search")      │
│                                                                   │
│  WHY:                                                             │
│  AI generating code without searching first leads to:            │
│  ❌ Inventing new patterns when project has established ones      │
│  ❌ Wrong constructor signatures (hallucinated from training data)│
│  ❌ Missing DI registrations (guessed instead of verified)        │
│  ❌ Duplicate implementations (didn't know similar code exists)   │
│                                                                   │
│  FLOW:                                                            │
│  1. AI tries to Write new command handler                        │
│  2. Hook checks: was there a recent Grep for similar handlers?   │
│  3. If NO → ❌ Block: "Search for existing patterns first"       │
│  4. If YES → ✅ Allow: AI has evidence                           │
│                                                                   │
│  EXCEPTION: Trivial files (< 20 lines) skip the check           │
└─────────────────────────────────────────────────────────────────┘
```

### 8.8 Lessons System — Learning From Mistakes

```mermaid
flowchart TB
    subgraph "Mistake Happens"
        M[AI makes wrong assumption<br/>e.g., used wrong repository type]
    end

    subgraph "Lesson Captured"
        L1[User or AI identifies the mistake]
        L2[Run /learn skill]
        L3[Append to docs/project-reference/lessons.md:<br/>'Always use service-specific repository,<br/>never generic base repository']
    end

    subgraph "Lesson Persisted"
        P1[lessons-injector.cjs<br/>Injects on EVERY prompt]
        P2[lessons-injector.cjs<br/>Injects on EVERY edit]
        P3[subagent-init.cjs<br/>Injects into subagents]
    end

    subgraph "Mistake Prevented"
        R[AI reads lesson BEFORE<br/>making same mistake]
    end

    M --> L1 --> L2 --> L3
    L3 --> P1 & P2 & P3
    P1 & P2 & P3 --> R

    style M fill:#f44336,color:white
    style R fill:#4CAF50,color:white
```

**Properties:**

- Max 50 lessons (FIFO trim — oldest removed when full)
- Injected with dedup on prompt (checks last 50 transcript lines)
- Injected WITHOUT dedup on edit (performance: avoids I/O per edit)
- Persists across sessions (stored in `docs/project-reference/lessons.md`)
- Shared with subagents (via `subagent-init.cjs`)

### 8.9 TDD Workflow & Unified Test Specification System

The framework includes a **complete test-driven development (TDD) system** with unified test case identification, interactive specification generation, and bidirectional traceability between specs and code.

#### Unified TC Format: `TC-{FEATURE}-{NNN}`

All test-related skills use a **single TC ID format** across the entire project, eliminating namespace collisions between parallel systems:

```
┌─────────────────────────────────────────────────────────────────┐
│  UNIFIED TEST CASE ID FORMAT                                      │
│                                                                   │
│  Format: TC-{FEATURE}-{NNN}                                      │
│  Example: TC-GM-001 (Goal Management, test case 1)               │
│  Example: TC-CI-025 (Check-In, test case 25)                     │
│                                                                   │
│  Feature Codes (from module-codes.md):                           │
│  Define 2-3 letter codes per domain feature.                    │
│  Examples: GM (Goal Mgmt), CI (Check-In), AUTH (Auth),          │
│            ORD (Orders), INV (Inventory), USR (Users)           │
│  Group codes by service/module in module-codes.md.              │
│                                                                   │
│  SOURCE OF TRUTH: Feature docs Section 17 (canonical registry)  │
│  DASHBOARD: docs/test-specs/ (aggregated cross-module views)    │
│  CODE LINK: Test annotation linking test to TC ID               │
│             e.g., tag/trait/decorator in test files               │
└─────────────────────────────────────────────────────────────────┘
```

#### TDD Skill Chain

Four skills form a connected test specification pipeline:

```mermaid
flowchart LR
    subgraph "Spec Generation"
        TS["/tdd-spec<br/>Unified TC Writer"]
        TSP["/test-spec<br/>Heavyweight Planning"]
    end

    subgraph "Persistence"
        FD["Feature Doc<br/>Section 17<br/>(Source of Truth)"]
        TSD["/test-specs-docs<br/>Dashboard Sync"]
        DASH["docs/test-specs/<br/>(Cross-Module Dashboard)"]
    end

    subgraph "Code Generation"
        IT["/integration-test<br/>Test Code Generator"]
        CODE["*.IntegrationTests/<br/>TC annotation per test"]
    end

    TS -->|"Write TCs"| FD
    TSP -->|"Plan TCs"| TS
    FD -->|"Aggregate"| TSD
    TSD -->|"Sync"| DASH
    FD -->|"Source TCs"| IT
    IT -->|"Generate"| CODE
    CODE -->|"Traceability"| FD

    style TS fill:#4CAF50,color:white
    style FD fill:#2196F3,color:white
    style CODE fill:#FF9800,color:white
```

#### `/tdd-spec` — The Core Skill (3 Modes)

```
┌─────────────────────────────────────────────────────────────────┐
│  /tdd-spec — UNIFIED TC WRITER                                    │
│                                                                   │
│  Mode 1: TDD-FIRST                                               │
│  Input: PBI / user story (no code yet)                           │
│  Action: Generate TC specs from requirements                     │
│  Evidence: "TBD (pre-implementation)"                            │
│  Next: /integration-test → /plan → /cook                        │
│                                                                   │
│  Mode 2: IMPLEMENT-FIRST                                         │
│  Input: Existing codebase (code already written)                 │
│  Action: Analyze code paths → generate TC specs                  │
│  Evidence: file:line references to actual code                   │
│  Next: /integration-test → /test                                 │
│                                                                   │
│  Mode 3: UPDATE                                                   │
│  Input: Existing TCs + code changes                              │
│  Action: Diff TCs against current code → find gaps               │
│  Evidence: Updated file:line references                          │
│  Next: /test → /review-changes                                   │
│                                                                   │
│  ALL MODES:                                                       │
│  • Write TCs to feature doc Section 17 (canonical)              │
│  • Use AskUserQuestion for TC review with user                  │
│  • Optionally sync to docs/test-specs/ dashboard                │
│  • Unified format: TC-{FEATURE}-{NNN}                           │
└─────────────────────────────────────────────────────────────────┘
```

#### TDD Workflows

Two dedicated workflows support test-driven development:

| Workflow               | Sequence                                                                                          | Use Case                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **idea-to-tdd**        | `/idea` → `/refine` → `/tdd-spec`                                                                 | Go from raw idea to test specifications with interactive discovery and testability assessment |
| **tdd-feature**        | `/scout` → `/investigate` → `/tdd-spec` → `/plan` → `/cook` → `/integration-test` → `/test` → ... | Full TDD cycle: write test specs FIRST, then implement, then generate tests and verify        |
| **pbi-to-tests**       | `/tdd-spec` → `/quality-gate`                                                                     | Quick path from existing PBI to test specifications using unified TC format                   |
| **e2e-from-recording** | `/scout` → `/e2e-test` → `/test` → `/watzup`                                                      | Generate Playwright E2E tests from Chrome DevTools recordings                                 |
| **e2e-update-ui**      | `/scout` → `/e2e-test` → `/test` → `/watzup`                                                      | Update E2E screenshot baselines after UI changes                                              |
| **e2e-from-changes**   | `/scout` → `/e2e-test` → `/test` → `/watzup`                                                      | Sync E2E tests when test specs or source code changes                                         |

#### Interactive Idea & Requirement Capture

The `/idea` and `/refine` skills include interactive discovery to improve test-driven thinking:

```
/idea — Step 6.5: Discovery Interview (MANDATORY)
├── Problem Clarity: "What problem does this solve?"
├── User Persona: "Who benefits most?"
├── Scope: "What's the smallest valuable version?"
├── Testability: "How would you verify this works?" ← ALWAYS included
├── Impact: "How many users/processes affected?"
└── Constraints: "Any technical/business constraints?"

/refine — Phase 5.5: Testability Assessment
├── Testing approach: TDD-first vs Implement-first vs Parallel
├── Test levels: Integration only, Integration + E2E, Unit + Integration + E2E
└── AC-to-TC mapping table (seed for /tdd-spec)
```

### 8.10 Full Development Lifecycle Coverage

The framework supports AI-assisted development across **every phase** of the software development lifecycle:

```
┌─────────────────────────────────────────────────────────────────┐
│           AI-ASSISTED DEVELOPMENT LIFECYCLE                       │
│                                                                   │
│  PHASE              │ Skills/Workflows       │ AI Value           │
│─────────────────────│────────────────────────│────────────────────│
│  0. INCEPTION       │ /greenfield            │ Solution architect │
│     (Greenfield)    │ greenfield-init wf     │ mode: research,    │
│                     │ solution-architect     │ DDD, tech choices, │
│                     │ /domain-analysis       │ waterfall planning │
│                     │ /tech-stack-research   │                    │
│─────────────────────│────────────────────────│────────────────────│
│  0.5 BIG FEATURE    │ big-feature workflow   │ Research-driven    │
│     (Existing proj) │ /domain-analysis       │ development for    │
│                     │ /tech-stack-research   │ complex features   │
│                     │ step-select gate       │ with optional skip │
│─────────────────────│────────────────────────│────────────────────│
│  1. IDEATION        │ /idea (interactive)    │ Structured         │
│                     │ /product-owner         │ discovery,         │
│                     │ idea-to-pbi workflow   │ testability check  │
│─────────────────────│────────────────────────│────────────────────│
│  2. REQUIREMENTS    │ /refine (interactive)  │ PBI generation,    │
│                     │ /story, /prioritize    │ acceptance criteria│
│                     │ /design-spec           │ with TC seeds      │
│─────────────────────│────────────────────────│────────────────────│
│  3. TEST SPECS      │ /tdd-spec (unified)    │ TDD-first or      │
│                     │ /test-spec (planning)  │ implement-first    │
│                     │ idea-to-tdd workflow   │ test case gen      │
│─────────────────────│────────────────────────│────────────────────│
│  4. PLANNING        │ /plan, /plan-review    │ Evidence-based     │
│                     │ /plan-validate         │ plans with user    │
│                     │ /why-review            │ Q&A validation     │
│─────────────────────│────────────────────────│────────────────────│
│  5. IMPLEMENTATION  │ /cook, /cook-hard      │ Pattern-enforced   │
│                     │ /fix, /refactoring     │ coding with auto   │
│                     │ feature workflow        │ context injection  │
│─────────────────────│────────────────────────│────────────────────│
│  6. TESTING         │ /integration-test      │ Test gen from      │
│                     │ /test, /webapp-testing │ TDD specs, auto    │
│                     │ tdd-feature workflow   │ build verification │
│─────────────────────│────────────────────────│────────────────────│
│  7. CODE REVIEW     │ /code-review           │ Automated quality  │
│                     │ /review-changes        │ checks, pattern    │
│                     │ /prove-fix, /sre-review│ compliance, proofs │
│─────────────────────│────────────────────────│────────────────────│
│  8. DOCUMENTATION   │ /docs-update           │ Auto-detect stale  │
│                     │ /feature-docs          │ docs, generate     │
│                     │ /changelog             │ changelogs, sync   │
│─────────────────────│────────────────────────│────────────────────│
│  9. HANDOFF         │ /handoff, /acceptance  │ Structured role    │
│                     │ /qc-specialist         │ transitions with   │
│                     │ po-ba/ba-dev workflows │ quality gates      │
│─────────────────────│────────────────────────│────────────────────│
│  10. OPERATIONS     │ /devops, /deployment   │ Infrastructure     │
│                     │ /sre-review            │ automation and     │
│                     │ deployment workflow    │ readiness checks   │
└─────────────────────────────────────────────────────────────────┘
```

**Key insight:** No phase is "AI-free." The framework ensures AI has the right context, constraints, and quality gates at every stage — from the first idea sketch to production deployment review.

### 8.11 How to Use — Test Generation & Documentation Cases

This section provides concrete prompts and expected flows for every test generation scenario supported by the framework.

#### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  TEST SPECIFICATION ARCHITECTURE                                │
│                                                                 │
│  SOURCE OF TRUTH           DASHBOARD              CODE LINK     │
│  ┌───────────────┐    ┌──────────────────┐   ┌──────────────┐  │
│  │ Feature Docs   │───→│ docs/test-specs/  │   │ Test Code    │  │
│  │ Section 17     │    │ {Module}/README   │   │ (annotated   │  │
│  │ TC-{FEAT}-{N}  │←───│ (cross-module     │   │  with TC ID  │  │
│  │                │    │  dashboard)       │   │  per test)   │  │
│  └───────┬───────┘    └──────────────────┘   └──────┬───────┘  │
│          │                                           │          │
│          └───────── TRACEABILITY ────────────────────┘          │
│                                                                 │
│  Skills:  /tdd-spec (write TCs) → /integration-test (test code) │
│           /test-specs-docs (sync dashboard)                     │
│                                                                 │
│  Workflows: pbi-to-tests, tdd-feature, test-spec-update,       │
│             test-to-integration                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Case 1: Existing Code → Generate Test Specs

**Scenario:** Code already exists (commands, queries, entities) but no test specifications have been written yet.

**Prompt examples:**

```
# Direct skill invocation
/tdd-spec generate test specs for Orders feature from existing code

# With specific command
/tdd-spec implement-first mode for CreateOrderCommand

# Workflow (if starting fresh on a module)
/workflow-start pbi-to-tests
```

**What happens:**

1. `/tdd-spec` detects **implement-first mode** (code exists, no/incomplete TCs)
2. Greps for commands, queries, entities in target service
3. Traces code paths: Controller → Command → Handler → Entity → Event Handler
4. Generates TC outlines with `Evidence: {file}:{line}` references
5. Presents TC list via `AskUserQuestion` for interactive review
6. Writes approved TCs to feature doc Section 17 (canonical)
7. Optionally updates `docs/test-specs/` dashboard

**Output locations:**

| Artifact             | Path                                                                     |
| -------------------- | ------------------------------------------------------------------------ |
| TCs (canonical)      | `docs/business-features/{App}/detailed-features/{feature}.md` Section 17 |
| Dashboard (optional) | `docs/test-specs/{Module}/README.md`                                     |

---

#### Case 2: PBI or Plan → Generate Test Specs (TDD-First)

**Scenario:** A PBI, user story, or detailed plan exists. You want to write test specs before implementing.

**Prompt examples:**

```
# Direct skill invocation
/tdd-spec create test specs from PBI for order processing feature

# Full TDD workflow (recommended)
/workflow-start tdd-feature

# Idea-to-TDD pipeline
/workflow-start idea-to-tdd
```

**What happens:**

1. `/tdd-spec` detects **TDD-first mode** (PBI exists, no implementation yet)
2. Reads PBI from `team-artifacts/pbis/` or user-provided document
3. Extracts acceptance criteria, identifies test categories (CRUD, validation, permissions, workflows, edge cases)
4. Generates TC outlines with `Evidence: TBD (pre-implementation)`
5. Interactive review via `AskUserQuestion`
6. Writes TCs to feature doc Section 17
7. Suggests: `/integration-test` to generate test stubs, or `/plan` to start implementation

**TDD workflow sequence:**

```
tdd-feature: scout → investigate → tdd-spec → plan → plan-review →
             plan-validate → why-review → cook → integration-test →
             test → code-simplifier → review-changes → code-review →
             sre-review → changelog → docs-update → watzup → workflow-end
```

---

#### Case 3: Sync Test Specs ↔ Feature Docs (Bidirectional)

**Scenario:** Test specs exist in `docs/test-specs/` but not in feature docs Section 17, or vice versa. Need to reconcile.

**Prompt examples:**

```
# Forward sync: feature docs → test-specs/ dashboard
/test-specs-docs sync test specs for Orders module

# Reverse sync: test-specs/ → feature docs
/test-specs-docs reverse sync to feature docs for Orders

# Full bidirectional reconciliation
/tdd-spec sync test specs for Orders feature

# Bidirectional with dashboard update
/test-specs-docs full sync for Orders module
```

**What happens (bidirectional via /tdd-spec sync mode):**

1. Reads feature doc Section 17 TCs
2. Reads `docs/test-specs/{Module}/README.md` TCs
3. Greps for TC annotations (e.g., test tags/traits) in test files
4. Builds 3-way comparison:

```
| TC ID     | Feature Doc? | test-specs/? | Test Code? | Action         |
|-----------|-------------|-------------|----------|----------------|
| TC-GM-001 | ✅          | ✅          | ✅       | None           |
| TC-GM-025 | ✅          | ❌          | ✅       | Add to dashboard|
| TC-GM-030 | ❌          | ✅          | ❌       | Add to feat doc|
```

5. Reconciles: writes missing TCs to whichever system lacks them
6. **Feature docs remain source of truth** — conflicts use feature doc version

**Direction detection keywords:**

| User says                              | Direction                            | Skill                 |
| -------------------------------------- | ------------------------------------ | --------------------- |
| "sync test specs", "update dashboard"  | Forward (feature docs → test-specs/) | `/test-specs-docs`    |
| "sync to feature docs", "reverse sync" | Reverse (test-specs/ → feature docs) | `/test-specs-docs`    |
| "full sync", "bidirectional"           | Both directions                      | `/tdd-spec` sync mode |

---

#### Case 4: Bug Fix / Code Changes / PR → Update Test Specs

**Scenario:** After fixing a bug, implementing changes, or reviewing a PR — test specs and feature docs need updating to reflect what changed.

**Prompt examples:**

```
# After a bug fix (detects git changes automatically)
/tdd-spec update test specs after bugfix

# After code changes
/tdd-spec update test specs based on current changes

# After a PR
/tdd-spec update test specs from PR #123

# Full workflow (recommended for significant changes)
/workflow-start test-spec-update
```

**What happens:**

1. `/tdd-spec` detects **update mode** (existing TCs + code changes/bugfix/PR)
2. Reads existing Section 17 TCs
3. Runs `git diff` (or `git diff main...HEAD` for PRs) to find code changes
4. Identifies: new commands/queries not covered, changed behaviors, removed features
5. For bugfixes: adds a **regression TC** (e.g., `TC-GM-040: Regression — goal title validation bypass`)
6. Generates gap analysis
7. Updates **both** feature docs Section 17 AND `docs/test-specs/` dashboard
8. Suggests: `/integration-test` to generate/update tests for changed TCs

**test-spec-update workflow sequence:**

```
test-spec-update: review-changes → tdd-spec → test-specs-docs →
                  integration-test → test → workflow-end
```

**Key difference from Case 1:** Update mode preserves existing TC IDs, only adding/modifying what changed. It also generates regression TCs for bugfixes.

---

#### Case 5: Test Specs → Generate Integration Tests

**Scenario:** Test specifications exist in feature docs Section 17 (or `docs/test-specs/`). Now generate integration test code.

**Prompt examples:**

```
# From specific command
/integration-test CreateOrderCommand

# From git changes (auto-detect)
/integration-test

# Full workflow
/workflow-start test-to-integration

# After /tdd-spec created specs
/tdd-spec → /integration-test
```

**What happens:**

1. `/integration-test` reads feature doc Section 17 for TC codes matching target domain
2. Builds mapping: TC code → test method name (e.g., `TC-ORD-001` → `CreateOrder_WhenValidData_ShouldCreateSuccessfully`)
3. Reads existing integration tests in same service for conventions (namespace, base class, naming)
4. Generates test file with:
    - TC annotation/tag linking each test to its TC code
    - `// TC-ORD-001: Description` comment before each test
    - Real DI (no mocks), unique test data helpers, entity assertion helpers
5. Runs build to verify compilation
6. Verifies bidirectional traceability: every test ↔ doc TC

**test-to-integration workflow sequence:**

```
test-to-integration: scout → integration-test → test → watzup → workflow-end
```

**If TCs are missing:** `/integration-test` auto-creates TC entries in Section 17 before generating tests. For comprehensive spec creation first, use `/tdd-spec` → `/integration-test`.

---

#### Case 6: Review Test Quality & Fix Flaky Tests

**When:** Existing tests intermittently fail, or you want a quality audit of integration tests.

**Prompt examples:**

```
# Review test quality for a domain
/integration-test review Orders

# Full test verification workflow
/workflow-start test-verify
```

**What happens:**

1. `/integration-test` enters REVIEW mode — scans all test files in the target domain
2. Checks for flaky patterns:
    - DB assertions without async polling (e.g., checking state changed by background event handlers without retry/wait)
    - Hardcoded delays instead of condition-based polling
    - Non-unique test data causing cross-test interference
    - Race conditions from shared mutable state
3. Checks best practices: collection attributes, TC annotations, minimum test count, no mocks
4. Generates quality report with severity levels (HIGH/MEDIUM/LOW)

**test-verify workflow sequence:**

```
test-verify: scout → integration-test (review) → test → integration-test (diagnose) → watzup → workflow-end
```

---

#### Case 7: Diagnose Test Failures (Test Bug vs Code Bug)

**When:** Tests are failing and you need to determine whether the test code or the application code is wrong.

**Prompt examples:**

```
# Diagnose a specific test class
/integration-test diagnose OrderCommandIntegrationTests

# After running tests that fail
/test → /integration-test diagnose {FailingTestClass}
```

**What happens:**

1. `/integration-test` enters DIAGNOSE mode — reads the failing test and traces the application code path
2. Walks a decision tree:
    - Compilation error? → Test not updated after code change (TEST BUG)
    - Assertion failure with correct expected value? → Application logic wrong (CODE BUG)
    - Intermittent failure? → Missing async polling or non-unique data (TEST BUG — flaky)
    - Validation error on happy path? → Test sends invalid data (TEST BUG) or rule too strict (CODE BUG)
3. Generates diagnosis report classifying each failure as TEST BUG, CODE BUG, or INFRA ISSUE
4. Provides specific fix recommendations with file:line evidence

---

#### Case 8: Verify Test-Spec Traceability

**When:** You want to ensure all test code maps to specs and all specs map to tests — no orphans.

**Prompt examples:**

```
# Verify traceability for a service
/integration-test verify {Service}

# Full verification workflow
/workflow-start test-verify
```

**What happens:**

1. `/integration-test` enters VERIFY-TRACEABILITY mode
2. Collects test methods with TC annotations from the test project
3. Collects TC entries from feature doc Section 17
4. Builds 3-way traceability matrix: test code ↔ feature doc ↔ test-specs dashboard
5. Identifies:
    - Orphaned tests (have annotation but no matching TC in docs)
    - Orphaned TCs (documented but no matching test)
    - Behavior mismatches (test does something different from what spec says)
6. For mismatches, determines which source is correct:
    - Test passes + spec disagrees → update spec
    - Test fails + spec describes expected behavior → update test
7. Generates traceability report with recommended fixes

---

#### Case 9: End-to-End Test Health Check

**When:** You want a comprehensive test health assessment combining quality, failures, and traceability.

**Prompt examples:**

```
# Full test verification workflow (recommended)
/workflow-start test-verify

# Manual sequence
/integration-test review Orders → /test → /integration-test diagnose {failures} → /integration-test verify {Service}
```

**What happens (test-verify workflow):**

1. **Scout** — finds all test files and related specs
2. **Review** — audits quality, flags flaky patterns
3. **Run tests** — executes test suite, collects pass/fail results
4. **Diagnose** — for any failures, determines root cause (test bug vs code bug)
5. **Summarize** — consolidated report with prioritized action items

**Output:** Single consolidated report covering quality issues, failure diagnoses, and traceability gaps — all prioritized by severity.

---

#### Quick Reference: Which Skill for Which Case?

```
┌─────────────────────────────────────────────────────────────────┐
│  CASE → SKILL / WORKFLOW LOOKUP                                 │
│                                                                 │
│  CASE                    │ PRIMARY SKILL   │ WORKFLOW            │
│─────────────────────────│────────────────│────────────────────│
│  Code → test specs       │ /tdd-spec       │ pbi-to-tests       │
│  PBI → test specs (TDD)  │ /tdd-spec       │ tdd-feature        │
│  Sync specs ↔ docs       │ /tdd-spec or    │ —                  │
│                          │ /test-specs-docs│                    │
│  Bug/PR → update specs   │ /tdd-spec       │ test-spec-update   │
│  Specs → test code       │ /integration-   │ test-to-integration│
│                          │  test           │                    │
│  Full TDD cycle          │ /tdd-spec then  │ tdd-feature        │
│                          │ /integration-   │                    │
│                          │  test           │                    │
│  Idea → specs            │ /idea → /refine │ idea-to-tdd        │
│                          │ → /tdd-spec     │                    │
│  Review test quality     │ /integration-   │ test-verify        │
│                          │  test review    │                    │
│  Diagnose test failures  │ /integration-   │ test-verify        │
│                          │  test diagnose  │                    │
│  Verify traceability     │ /integration-   │ test-verify        │
│                          │  test verify    │                    │
│  Full test health check  │ (all 3 modes)   │ test-verify        │
│  Recording → E2E test    │ /e2e-test       │ e2e-from-recording │
│  UI change → baseline    │ /e2e-test       │ e2e-update-ui      │
│  Code change → E2E sync  │ /e2e-test       │ e2e-from-changes   │
└─────────────────────────────────────────────────────────────────┘
```

---

### 8.12 E2E Testing System — Framework-Agnostic AI-Assisted E2E

The framework includes a comprehensive **end-to-end testing system** that auto-detects the project's E2E stack from `docs/project-config.json` and provides AI-assisted test generation, maintenance, and execution across any E2E framework.

#### E2E Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│  E2E TESTING ARCHITECTURE                                        │
│                                                                   │
│  project-config.json          SKILL              OUTPUT           │
│  ┌──────────────────┐    ┌──────────────────┐  ┌──────────────┐ │
│  │ e2eTesting:      │───▶│  /e2e-test        │─▶│ Test files   │ │
│  │  framework: ...  │    │  (auto-detect)    │  │ Page objects │ │
│  │  architecture: . │    │                   │  │ Step defs    │ │
│  │  entryPoints: .  │    │  3 modes:         │  └──────────────┘ │
│  └──────────────────┘    │  • from-recording │                   │
│                          │  • from-changes   │                   │
│  ┌──────────────────┐    │  • update-ui      │                   │
│  │ Feature Doc TCs  │───▶│                   │                   │
│  │ TC-{MOD}-{NNN}   │    └──────────────────┘                   │
│  └──────────────────┘                                            │
│                                                                   │
│  Supported: Playwright, Selenium+SpecFlow, Cypress, any stack   │
│  TC Traceability: TC-{MODULE}-E2E-{NNN} in test names            │
└─────────────────────────────────────────────────────────────────┘
```

#### How It Works — Auto-Detection

The `/e2e-test` skill reads `docs/project-config.json` → `e2eTesting` section to determine:

- **Framework** (Playwright, Selenium+SpecFlow, Cypress, etc.)
- **Architecture** (POM pattern, BDD, direct tests)
- **Entry points** (key base classes, config files)
- **Run commands** (how to execute tests)
- **Best practices** (project-specific conventions)

This means the AI agent adapts to whatever E2E stack the project uses — no hardcoded assumptions.

#### E2E Skill — 3 Modes

```text
┌─────────────────────────────────────────────────────────────────┐
│  /e2e-test — FRAMEWORK-AGNOSTIC E2E TEST ASSISTANT               │
│                                                                   │
│  Mode 1: FROM-RECORDING                                          │
│  Input: Browser recording (DevTools JSON, HAR, etc.)             │
│  Action: Convert recording → test file + page object             │
│  Adapts to: Playwright .spec.ts, SpecFlow .feature, Cypress .cy │
│                                                                   │
│  Mode 2: UPDATE-UI                                                │
│  Input: Git diff showing UI changes                              │
│  Action: Identify affected tests → update baselines/assertions   │
│  Adapts to: Screenshot baselines, assertion updates              │
│                                                                   │
│  Mode 3: FROM-CHANGES                                             │
│  Input: Changed test specs or source code                        │
│  Action: Sync E2E tests with code/spec changes                   │
│  Output: Updated/new test implementations                        │
│                                                                   │
│  ALL MODES:                                                       │
│  • Read project-config.json e2eTesting for framework detection   │
│  • Read entryPoints for base classes and patterns                │
│  • Follow bestPractices from config                              │
│  • Add TC-{MODULE}-E2E-{NNN} references to test names           │
│  • Use e2e-test-reference.md as pattern guide                    │
└─────────────────────────────────────────────────────────────────┘
```

#### E2E Workflows

Three dedicated workflows support E2E testing scenarios:

| Workflow               | Sequence                                     | Use Case                                             |
| ---------------------- | -------------------------------------------- | ---------------------------------------------------- |
| **e2e-from-recording** | `/scout` → `/e2e-test` → `/test` → `/watzup` | Browser recording → generate E2E test                |
| **e2e-update-ui**      | `/scout` → `/e2e-test` → `/test` → `/watzup` | UI visual changes → update test baselines/assertions |
| **e2e-from-changes**   | `/scout` → `/e2e-test` → `/test` → `/watzup` | Code/spec changes → sync E2E test implementations    |

#### Case 10: Recording → E2E Test

**Scenario:** QC tester records a browser interaction and wants to generate an E2E test.

**Prompt examples:**

```bash
# Direct skill invocation
/e2e-test from recording path/to/recording.json

# With context
/e2e-test generate test from recording for Login feature

# Full workflow (recommended)
/workflow-start e2e-from-recording
```

**What happens:**

1. `/e2e-test` reads `project-config.json` → `e2eTesting` to detect framework
2. Reads `entryPoints` to understand base classes and patterns
3. Validates recording file exists
4. Loads test specs from feature docs (TC-{MODULE}-{NNN})
5. Generates test file following project conventions:
    - Page Object class (using project's POM pattern)
    - Test assertions using project's assertion patterns
    - TC references in test names for traceability
6. Runs test to verify it passes
7. Reports generated files

---

#### Case 11: UI Changes → Update Tests

**Scenario:** UI changed intentionally, and existing E2E tests need updating.

**Prompt examples:**

```bash
/e2e-test update tests after UI changes
/workflow-start e2e-update-ui
```

**What happens:**

1. `/e2e-test` analyzes git diff for UI changes
2. Maps changed files to affected test files
3. Updates assertions, selectors, or baselines as needed
4. Runs tests to verify changes work
5. Reports updated files

---

#### Case 12: Code/Spec Changes → Sync E2E Tests

**Scenario:** Test specifications or source code changed, and E2E tests need updating.

**Prompt examples:**

```bash
/e2e-test sync tests with spec changes
/workflow-start e2e-from-changes
```

**What happens:**

1. `/e2e-test` detects change type from git diff
2. Loads affected test specifications (TC-{MODULE}-{NNN})
3. Updates or generates test implementations following project patterns
4. Ensures traceability: each TC has corresponding E2E test
5. Runs tests to verify changes work

---

#### project-config.json — e2eTesting Section

The `/e2e-test` skill relies on the `e2eTesting` section in `docs/project-config.json`. Example:

```json
{
    "e2eTesting": {
        "framework": "selenium-specflow",
        "language": "csharp",
        "guideDoc": "docs/project-reference/e2e-test-reference.md",
        "architecture": {
            "pattern": "page-object-model",
            "bddFramework": "specflow",
            "testRunner": "xunit",
            "settingsClass": "YourAutomationTestSettings",
            "startupClass": "BaseYourStartup"
        },
        "runCommands": {
            "all": "dotnet test src/AutomationTest/...",
            "filter": "dotnet test --filter \"FullyQualifiedName~{TestName}\""
        },
        "bestPractices": [
            "Extend BddStepDefinitions<TSettings, TContext> for step defs",
            "Use Page Object Model hierarchy",
            "Use WaitUntilAssertSuccess for resilient assertions"
        ],
        "entryPoints": [
            "src/Platform/{YourFramework}.AutomationTest/Pages/Page.cs",
            "src/Platform/{YourFramework}.AutomationTest/TestCases/BddStepDefinitions.cs"
        ]
    }
}
```

Each project configures this section during `/project-config` setup (Phase 2h). The AI agent reads it at runtime — no hardcoded framework assumptions.

#### Selector Strategy (Generic Best Practices)

```text
┌─────────────────────────────────────────────────────────────────┐
│  E2E SELECTOR PRIORITY (general guidelines)                      │
│                                                                   │
│  PRIORITY │ PATTERN                    │ WHY                      │
│───────────│────────────────────────────│──────────────────────────│
│  1 (Best) │ data-testid / data-test   │ Explicit test contract   │
│  2        │ BEM class / semantic CSS   │ Stable, intentional      │
│  3        │ Component selector         │ Framework-specific       │
│  4        │ Role + aria-label          │ Accessibility-based      │
│  5        │ Text content               │ Last resort, fragile     │
│                                                                   │
│  AVOID (unstable across framework versions):                     │
│  ✗ Auto-generated classes (.ng-*, .v-*, .css-*)                 │
│  ✗ Deep CSS paths, :nth-child()                                 │
│  ✗ XPath (brittle, hard to maintain)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

### 8.13 Greenfield Project Support — AI as Solution Architect

The framework doesn't just assist with existing codebases — it guides **new project inception** from raw idea to approved implementation plan, acting as a Solution Architect and Business Domain Expert.

#### The Problem

When an AI agent encounters an empty project directory, most AI tools fail in predictable ways:

```
┌─────────────────────────────────────────────────────────────────┐
│  AI FAILURES IN GREENFIELD PROJECTS                              │
│                                                                   │
│  Failure                    │ Why It Happens                     │
│─────────────────────────────│────────────────────────────────────│
│  Skips straight to code     │ No patterns to search → generates │
│                             │ from generic training data         │
│  Wrong tech stack choice    │ No evidence to ground decisions;  │
│                             │ picks "popular" not "appropriate"  │
│  No domain modeling         │ No existing entities to read →    │
│                             │ invents schema on the fly          │
│  Missing infrastructure     │ Jumps to features, skips CI/CD,   │
│                             │ project scaffold, dev tooling      │
│  No user collaboration      │ AI decides everything silently;   │
│                             │ user gets a fait accompli          │
│  Context hooks fail         │ Session-init creates skeleton     │
│                             │ files in empty projects            │
└─────────────────────────────────────────────────────────────────┘
```

#### The Solution — Two-Layer Detection + Waterfall Workflow

The framework solves this with **automatic greenfield detection** and a **structured inception workflow**:

```mermaid
flowchart TB
    A[User opens project directory] --> B{hasProjectContent?}
    B -->|No dirs except .claude/.git| C[Skip session-init hooks<br/>No skeleton files created]
    B -->|Has content dirs| D{isGreenfieldProject?}
    D -->|No code dirs, no manifests| E[Greenfield Mode<br/>Skills switch to<br/>Solution Architect]
    D -->|Code exists| F[Normal Mode<br/>Standard hooks & skills]

    E --> G[/greenfield workflow<br/>11-step waterfall inception]
    G --> H[idea → research → evaluate →<br/>domain model → tech stack →<br/>plan → validate → stories]

    style C fill:#FF9800,color:white
    style E fill:#4CAF50,color:white
    style F fill:#2196F3,color:white
```

#### Detection Logic

Two complementary functions in `session-init-helpers.cjs`:

```
┌─────────────────────────────────────────────────────────────────┐
│  GREENFIELD DETECTION                                            │
│                                                                   │
│  hasProjectContent(dir)                                          │
│  ─────────────────────                                           │
│  Returns FALSE if root has NO directories except:                │
│  .claude, .git, .github, .vscode, .idea, node_modules, .ai      │
│  → Used to SKIP session-init hooks in truly empty projects       │
│                                                                   │
│  isGreenfieldProject(dir)                                        │
│  ────────────────────────                                        │
│  Returns TRUE when ALL of:                                       │
│  • No code directories with content:                             │
│    src/, app/, lib/, server/, client/, backend/, frontend/,      │
│    cmd/, pkg/, internal/, packages/                              │
│  • No manifest files:                                            │
│    package.json, *.sln, *.csproj, Cargo.toml, go.mod,          │
│    pyproject.toml, requirements.txt, pom.xml, build.gradle,     │
│    Gemfile, composer.json, Makefile, CMakeLists.txt              │
│  • No populated project-config.json                              │
│                                                                   │
│  STILL GREENFIELD (planning artifacts, no code):                 │
│  ✅ .claude/ + README.md + .gitignore                           │
│  ✅ docs/ + plans/ + team-artifacts/                             │
│  ✅ Empty src/ (scaffolded but no files inside)                  │
│                                                                   │
│  NOT GREENFIELD (code or tech stack present):                    │
│  ❌ app/page.tsx (Next.js) or lib/utils.rb (Ruby)               │
│  ❌ package.json (Node.js) or *.sln (.NET)                      │
│  ❌ Populated project-config.json                                │
└─────────────────────────────────────────────────────────────────┘
```

#### Greenfield-Init Workflow (14 Steps)

```
greenfield-init: FULL WATERFALL INCEPTION
│
├── 1.  /idea ──────────────── Discovery interview: problem, vision, constraints
├── 2.  /web-research ──────── WebSearch: competitors, market, existing solutions
├── 3.  /deep-research ─────── WebFetch: extract findings from top sources
├── 4.  /business-evaluation ── Viability, risk matrix, value proposition
├── 5.  /refine ────────────── Refine to PBI with acceptance criteria
├── 6.  /domain-analysis ───── DDD: bounded contexts, aggregates, ERD ★ NEW
├── 7.  /tech-stack-research ── Compare top 3 options per layer with pros/cons ★ NEW
├── 8.  /plan ──────────────── Architecture plan (informed by domain + tech research)
├── 9.  /security ──────────── Security architecture review ★ NEW
├── 10. /performance ───────── Performance architecture review ★ NEW
├── 11. /plan-validate ─────── 3-8 questions: confirm all decisions with user
├── 12. /tdd-spec ──────────── Test strategy, spec generation
├── 13. /story ─────────────── Break into prioritized PBIs with dependencies
└── 14. /plan-review ───────── Final review, risk assessment, approval

Every step saves artifacts to plans/{id}/ directory.
Every step uses AskUserQuestion to validate with user.
confirmFirst: true — user must confirm before activation.
```

#### Solution Architect Agent

The `solution-architect` agent (Opus model) provides domain expertise throughout:

| Capability            | What It Does                                                   |
| --------------------- | -------------------------------------------------------------- |
| Discovery Interview   | Problem statement, vision, constraints, team skills            |
| Market Research       | WebSearch + WebFetch for competitive landscape                 |
| Tech Stack Evaluation | Comparison matrix with pros/cons, confidence %, recommendation |
| DDD Domain Modeling   | Bounded contexts, aggregates, entities, domain events          |
| Project Structure     | Folder layout, monorepo/polyrepo, CI/CD skeleton               |
| CLAUDE.md Generation  | Starter instructions file for the new project                  |

#### Skill Greenfield Mode

Nine skills auto-detect greenfield and switch behavior:

| Skill                  | Normal Mode                             | Greenfield Mode                                           |
| ---------------------- | --------------------------------------- | --------------------------------------------------------- |
| `/plan`                | Read project patterns, create plan      | Route to `/plan-hard`, suggest greenfield workflow        |
| `/plan-hard`           | Analyze codebase + research             | Skip codebase analysis, delegate to solution-architect    |
| `/plan-fast`           | Quick minimal plan                      | Redirect to `/plan-hard` (greenfield needs deep research) |
| `/idea`                | Detect module, load feature context     | Skip module detection, broader problem-space capture      |
| `/refine`              | Refine PBI with existing domain context | Add DDD domain modeling, tech constraint capture          |
| `/domain-analysis`     | Analyze existing domain entities/events | Full DDD from scratch: bounded contexts, aggregates, ERD  |
| `/tech-stack-research` | Evaluate additions to existing stack    | Full stack comparison: top 3 per layer, confidence %      |
| `/story`               | Feature stories from existing patterns  | Foundation PBIs: infra, scaffold, CI/CD, first feature    |
| `/cook`                | Implement from plan                     | Scaffold project structure from approved plan             |

**Detection is per-skill-activation** (not cached from session start), so it stays accurate even as the project evolves during a session.

#### Why This Matters — Philosophy

The greenfield support embodies the framework's core philosophy: **don't let the AI skip the thinking**. Starting a new project requires:

1. **Understanding before building** — Discovery interview, not immediate scaffolding
2. **Evidence-based decisions** — Market research and tech evaluation with confidence %, not "just use React"
3. **User collaboration** — Every stage validates with `AskUserQuestion`, not AI-decided architecture
4. **Artifact preservation** — Every stage writes to plan directory, surviving context compaction
5. **Domain-first, code-second** — DDD modeling before tech stack, business value before implementation

The result: AI acts as a strategic advisor who **earns trust through structured thinking**, not a code generator that skips to `npm init`.

---

### 8.14 Big Feature Workflow — Research-Driven Development

For **large, complex, or ambiguous features** in existing projects that need research before implementation, the `big-feature` workflow bridges the gap between `feature` (well-defined) and `greenfield-init` (new project).

#### The Problem It Solves

```
FEATURE COMPLEXITY SPECTRUM

  Simple/Well-Defined          Complex/Ambiguous            New Project
  ────────────────── ──────────────────────────── ──────────────────
  Use: feature wf    Use: big-feature wf ★ NEW    Use: greenfield wf

  Examples:           Examples:                    Examples:
  • Add delete button • New analytics module       • Brand-new SaaS app
  • Fix validation    • AI-powered matching        • New microservice
  • CRUD endpoint     • Cross-service integration  • Greenfield project
```

Without `big-feature`, developers faced a false choice: use `feature` (skip research, risk wrong architecture) or use `greenfield-init` (overkill for adding to an existing project).

#### Workflow Sequence (23 Steps with Step-Selection Gate)

```
big-feature: RESEARCH-DRIVEN FEATURE DEVELOPMENT
│
├── RESEARCH PHASE (7 steps — skippable per feature)
│   ├── /idea ──────────────── Discovery interview
│   ├── /web-research ──────── Market/competitor analysis
│   ├── /deep-research ─────── Deep-dive top sources
│   ├── /business-evaluation ── Viability, risk, ROI
│   ├── /refine ────────────── Acceptance criteria, PBI
│   ├── /domain-analysis ───── DDD: bounded contexts, aggregates, ERD
│   └── /tech-stack-research ── Compare top 3 options per tech layer
│
├── PLANNING PHASE (5 steps)
│   ├── /story ─────────────── User stories with dependencies
│   ├── /plan ──────────────── Implementation plan
│   ├── /plan-review ───────── Critical review
│   ├── /plan-validate ─────── 3-8 user questions
│   └── /why-review ────────── Design rationale check
│
├── IMPLEMENTATION PHASE (4 steps)
│   ├── /cook ──────────────── Pattern-enforced coding
│   ├── /code-simplifier ───── YAGNI/KISS/DRY pass
│   ├── /review-changes ────── Pre-commit review
│   └── /code-review ──────── Quality audit
│
└── QUALITY & WRAP PHASE (7 steps)
    ├── /sre-review ────────── Production readiness
    ├── /security ──────────── Security review
    ├── /performance ───────── Performance review
    ├── /changelog ─────────── Changelog entry
    ├── /test ──────────────── Test execution
    ├── /docs-update ───────── Documentation sync
    └── /watzup ────────────── Summary & doc staleness
```

#### Step-Selection Gate Pattern

A key innovation: **long workflows let users deselect irrelevant steps** before execution.

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP-SELECTION GATE (big-feature + greenfield workflows)       │
│                                                                  │
│  After user confirms workflow activation, AI presents:          │
│                                                                  │
│  "Which research steps apply to this feature?"                  │
│  [x] Discovery Interview (/idea)                                │
│  [x] Market Research (/web-research)                            │
│  [ ] Deep Research (/deep-research) ← user deselects           │
│  [ ] Business Evaluation (/business-evaluation) ← deselected   │
│  [x] Refine to PBI (/refine)                                   │
│  [x] Domain Analysis (/domain-analysis)                         │
│  [x] Tech Stack Research (/tech-stack-research)                 │
│  [x] ... remaining steps                                        │
│                                                                  │
│  Deselected steps are marked completed immediately.             │
│  This prevents a 23-step workflow from blocking a feature       │
│  that only needs 15 of those steps.                             │
│                                                                  │
│  WHEN TO USE:                                                    │
│  • Internal feature → skip market research                      │
│  • Known tech stack → skip tech-stack-research                  │
│  • Simple domain → skip domain-analysis                         │
│  • Pure backend → skip frontend-related reviews                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why this matters for AI agents:** Long workflows risk user abandonment. The step-selection gate gives users control over process overhead while maintaining the structured sequence for steps they do use. It's the difference between "mandatory 23-step bureaucracy" and "pick the rigor level that fits your feature."

---

### 8.15 Prompt Engineering Principles Applied

This section maps **established prompt engineering techniques** to specific framework mechanisms, proving that the framework's design is grounded in research-backed AI best practices.

#### Principle 1: Role Prompting (System Identity)

```
┌─────────────────────────────────────────────────────────────────┐
│  ROLE PROMPTING — Assign AI a specific expert identity           │
│                                                                   │
│  Research basis: LLMs produce higher-quality outputs when        │
│  given a specific role identity that activates relevant          │
│  training knowledge and constrains behavior.                     │
│                                                                   │
│  WHERE APPLIED:                                                   │
│                                                                   │
│  Layer          │ Role Assignment                │ Mechanism       │
│─────────────────│────────────────────────────────│─────────────────│
│  Workflow       │ "Role: Security Architect"     │ preActions.     │
│  preActions     │ "Role: API Designer"           │ injectContext   │
│  (workflows.    │ "Role: Solution Architect"     │ field in JSON   │
│   json)         │ "Role: Debug Investigator"     │                 │
│─────────────────│────────────────────────────────│─────────────────│
│  Agent defs     │ "You are a senior code         │ Agent .md files │
│  (.claude/      │  reviewer with 15 years..."    │ system prompt   │
│   agents/)      │ "You are a solution architect" │ section         │
│─────────────────│────────────────────────────────│─────────────────│
│  Hook injection │ "Tech Lead Communication Mode" │ prompt-context- │
│  (UserPrompt    │ "Be skeptical. Apply critical  │ assembler.cjs   │
│   Submit)       │  thinking..."                  │                 │
│─────────────────│────────────────────────────────│─────────────────│
│  Skill headers  │ "Act as TDD Specialist"        │ SKILL.md body   │
│                 │ "Act as Domain Expert (DDD)"   │ instructions    │
│                                                                   │
│  EFFECT: Each workflow step activates a different expert          │
│  persona. The AI doesn't just generate code — it thinks          │
│  like a Security Architect during /security, switches to         │
│  SRE mindset during /sre-review, and becomes a Domain Expert     │
│  during /domain-analysis.                                        │
└─────────────────────────────────────────────────────────────────┘
```

#### Principle 2: Chain-of-Thought (Structured Reasoning)

```
┌─────────────────────────────────────────────────────────────────┐
│  CHAIN-OF-THOUGHT — Force step-by-step reasoning                 │
│                                                                   │
│  Research basis: Prompting LLMs to "think step by step"          │
│  dramatically improves accuracy on complex tasks (Wei et al.)    │
│                                                                   │
│  WHERE APPLIED:                                                   │
│                                                                   │
│  1. WORKFLOW SEQUENCES — The entire workflow system IS chain-    │
│     of-thought at macro scale. Instead of "implement feature,"   │
│     the AI is forced through:                                    │
│     scout → investigate → plan → review → validate → cook       │
│     Each step produces an intermediate artifact that feeds       │
│     the next step's reasoning.                                   │
│                                                                   │
│  2. /sequential-thinking SKILL — Explicit structured reasoning:  │
│     Step 1: State the problem precisely                          │
│     Step 2: List ALL hypotheses                                  │
│     Step 3: For EACH, find supporting/contradicting evidence     │
│     Step 4: Rank by evidence strength                            │
│     Step 5: Test highest-ranked                                  │
│                                                                   │
│  3. /debug SKILL — Forces hypothesis-driven debugging:           │
│     "Never assume first hypothesis → verify with traces"         │
│                                                                   │
│  4. /prove-fix SKILL — Proof chain for every change:             │
│     Change → Evidence → Confidence % → Risk Assessment           │
│                                                                   │
│  5. /plan-validate — 3-8 critical questions force the AI to      │
│     reason about gaps, edge cases, and assumptions before        │
│     implementing.                                                │
│                                                                   │
│  EFFECT: The AI can't skip from question to answer. Every        │
│  workflow forces intermediate reasoning steps that catch          │
│  errors the AI would miss in a single-shot response.             │
└─────────────────────────────────────────────────────────────────┘
```

#### Principle 3: Few-Shot Pattern Matching

```
┌─────────────────────────────────────────────────────────────────┐
│  FEW-SHOT LEARNING — Show examples, not just instructions        │
│                                                                   │
│  Research basis: LLMs follow demonstrated patterns more          │
│  reliably than verbal instructions alone.                        │
│                                                                   │
│  WHERE APPLIED:                                                   │
│                                                                   │
│  1. CONTEXT INJECTION HOOKS — When editing a backend file,       │
│     backend-context.cjs injects backend-patterns-reference.md    │
│     (~60KB of real code examples from the project). The AI       │
│     sees actual repository patterns, validation patterns,        │
│     event handler patterns — not generic instructions.           │
│                                                                   │
│  2. SEARCH-BEFORE-CODE HOOK — Forces the AI to grep for 3+      │
│     similar implementations before writing code. Those grep      │
│     results ARE the few-shot examples — real code from the       │
│     project showing "this is how we do it."                      │
│                                                                   │
│  3. REFERENCE DOCS — Auto-initialized from project scans:        │
│     • /scan-backend-patterns populates real CQRS examples       │
│     • /scan-frontend-patterns populates real component examples  │
│     • /scan-design-system populates real design tokens           │
│                                                                   │
│  4. SKILL PROTOCOLS — Each skill includes concrete examples:     │
│     "Example recommendation format: Evidence from file:42..."    │
│     "Example TC format: TC-GM-001..."                            │
│                                                                   │
│  EFFECT: Instead of "use the repository pattern," the AI sees    │
│  5 real repository implementations from this codebase. Pattern   │
│  matching replaces pattern invention.                             │
└─────────────────────────────────────────────────────────────────┘
```

#### Principle 4: Structured Output & Formatting

```
┌─────────────────────────────────────────────────────────────────┐
│  STRUCTURED OUTPUT — Constrain response format for consistency   │
│                                                                   │
│  WHERE APPLIED:                                                   │
│                                                                   │
│  1. CONFIDENCE DECLARATIONS — Every recommendation must state:   │
│     "Confidence: 85% — Verified in Orders, Accounts.             │
│      Unverified: Surveys service"                                │
│                                                                   │
│  2. RISK MATRICES — Breaking changes must use:                   │
│     | Risk | Likelihood | Impact | Mitigation |                  │
│                                                                   │
│  3. TEST CASE FORMAT — Unified TC-{FEAT}-{NNN}:                  │
│     All skills use identical format preventing drift.             │
│                                                                   │
│  4. PLAN FILES — Written to plans/ with consistent structure:    │
│     Problem → Analysis → Options → Recommendation → Tasks        │
│                                                                   │
│  5. REPORT FORMAT — Tech lead communication mode enforces:       │
│     Executive Summary → Risk Assessment → Strategic Options →    │
│     Recommended Approach → Operational Considerations             │
│                                                                   │
│  EFFECT: Consistent formatting prevents the AI from giving       │
│  a vague "this looks fine" when the protocol demands a           │
│  structured risk matrix with evidence citations.                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Principle 5: Negative Prompting (Anti-Patterns)

```
┌─────────────────────────────────────────────────────────────────┐
│  NEGATIVE PROMPTING — Explicitly forbid common AI mistakes       │
│                                                                   │
│  WHERE APPLIED:                                                   │
│                                                                   │
│  1. EVIDENCE PROTOCOL — Forbidden phrases list:                  │
│     ❌ "obviously..."  → "Pattern found in 8 files"              │
│     ❌ "I think..."    → "Evidence from file:42"                  │
│     ❌ "probably..."   → "Needs verification: [list]"            │
│     ❌ "should be..."  → "Grep shows 12 instances"               │
│                                                                   │
│  2. UNDERSTAND-CODE-FIRST PROTOCOL — Anti-patterns:              │
│     ❌ Guessing constructor signatures                            │
│     ❌ Assuming DI registrations                                  │
│     ❌ Inventing new patterns when existing ones work             │
│                                                                   │
│  3. CLAUDE.md GOLDEN RULES — "NEVER use generic repo..."        │
│     "NEVER throw exceptions for validation..."                   │
│     "NEVER direct database access cross-service..."              │
│                                                                   │
│  4. LESSONS SYSTEM — Past mistakes become future prohibitions:   │
│     "NEVER define duplicate constants inline"                    │
│     "NEVER use early returns in merged modules"                  │
│                                                                   │
│  EFFECT: LLMs are more responsive to "don't do X" + reason      │
│  than "do Y" alone. Negative examples activate different         │
│  reasoning paths than positive instructions.                      │
└─────────────────────────────────────────────────────────────────┘
```

#### Principle 6: Iterative Refinement & Self-Correction

```
┌─────────────────────────────────────────────────────────────────┐
│  ITERATIVE REFINEMENT — Multi-pass review catches errors         │
│                                                                   │
│  WHERE APPLIED:                                                   │
│                                                                   │
│  Workflow steps that force self-correction:                      │
│                                                                   │
│  /cook ────────→ /code-simplifier ──→ /review-changes ──→       │
│  (generate)      (simplify/clean)     (self-review)              │
│                                                                   │
│  /fix ─────────→ /prove-fix ────────→ /test                     │
│  (apply fix)     (prove correctness)  (verify fix works)         │
│                                                                   │
│  /plan ────────→ /plan-review ──────→ /plan-validate             │
│  (create plan)   (critique plan)      (user validates)            │
│                                                                   │
│  Each pass uses a DIFFERENT evaluation lens:                     │
│  • /code-simplifier: "Is this the simplest correct solution?"   │
│  • /review-changes: "Does this follow project conventions?"     │
│  • /code-review: "Does this meet quality standards?"            │
│  • /sre-review: "Is this production-ready?"                     │
│  • /security: "Are there vulnerabilities?"                      │
│                                                                   │
│  EFFECT: Single-pass generation catches ~70% of issues.          │
│  Three review passes with different lenses catch ~95%.           │
│  This multi-pass pattern is why workflows have 15-23 steps.     │
└─────────────────────────────────────────────────────────────────┘
```

#### Summary: Prompt Engineering Techniques → Framework Mapping

| Prompt Engineering Technique  | Framework Implementation                                                 |
| ----------------------------- | ------------------------------------------------------------------------ |
| **Role prompting**            | Workflow preActions, agent definitions, hook-injected personas           |
| **Chain-of-thought**          | Workflow step sequences, /sequential-thinking, /debug, /prove-fix        |
| **Few-shot examples**         | Context injection hooks, search-before-code, reference doc scans         |
| **Structured output**         | Confidence declarations, risk matrices, TC format, plan templates        |
| **Negative prompting**        | Forbidden phrases, anti-pattern lists, NEVER rules, lessons system       |
| **Iterative refinement**      | Multi-pass review (cook→simplify→review→code-review→sre→security)        |
| **Task decomposition**        | Workflows decompose "implement feature" into 15+ discrete steps          |
| **Retrieval-augmented gen.**  | Context hooks inject project-specific docs at decision points            |
| **Self-consistency checking** | /prove-fix requires proof traces; /plan-validate asks critical questions |

---

### 8.16 Context Engineering Principles Applied

Context engineering is the discipline of **managing what information reaches the LLM, when, and how** — treating the context window as a scarce computational resource. This framework implements context engineering as a first-class architectural concern.

#### The Context Engineering Problem

```
┌─────────────────────────────────────────────────────────────────┐
│  WHY CONTEXT ENGINEERING MATTERS                                  │
│                                                                   │
│  Claude Code context window: ~200K tokens                        │
│  A typical project's full context: >>200K tokens                 │
│  Backend patterns doc alone: ~60KB (~15K tokens)                 │
│  Frontend patterns doc: ~57KB (~14K tokens)                      │
│  CLAUDE.md: ~20KB (~5K tokens)                                   │
│  Full code context after 30 tool calls: 150K+ tokens             │
│                                                                   │
│  PROBLEM: You can't load everything. Loading everything           │
│  degrades quality (attention dilution). Loading nothing           │
│  causes hallucination (no grounding).                            │
│                                                                   │
│  SOLUTION: Load the RIGHT context at the RIGHT time.             │
│  This is context engineering.                                     │
└─────────────────────────────────────────────────────────────────┘
```

#### Principle 1: Just-In-Time Context Injection

```
┌─────────────────────────────────────────────────────────────────┐
│  JIT CONTEXT — Load context at the moment of need, not upfront   │
│                                                                   │
│  ANTI-PATTERN: Load all docs at session start                    │
│  → Wastes 30K+ tokens, most unused                              │
│  → Attention diluted across irrelevant context                   │
│                                                                   │
│  FRAMEWORK APPROACH:                                              │
│                                                                   │
│  Trigger               │ Context Loaded          │ Size  │ Hook  │
│────────────────────────│─────────────────────────│───────│───────│
│  Edit backend file     │ Backend patterns doc    │ ~60KB │ BC    │
│  Edit frontend file    │ Frontend patterns doc   │ ~57KB │ FC    │
│  Edit style file       │ SCSS styling guide      │ ~30KB │ SC    │
│  Edit UI component     │ Design system tokens    │ ~56KB │ DC    │
│  Activate code-review  │ Code review rules       │ ~10KB │ CR    │
│  Every user prompt     │ Dev rules + lessons     │ ~5KB  │ PCA   │
│  Subagent spawned      │ CLAUDE.md + lessons     │ ~25KB │ SI    │
│                                                                   │
│  KEY INSIGHT: A frontend edit session NEVER loads backend         │
│  patterns. A backend session NEVER loads design tokens. The       │
│  AI gets ~60KB of precisely relevant context instead of           │
│  ~200KB of everything.                                            │
│                                                                   │
│  IMPLEMENTATION: PreToolUse hooks check the file path against    │
│  project-config.json pathRegexes → load matching patternsDoc.    │
│  Path-based routing is the core context engineering mechanism.    │
└─────────────────────────────────────────────────────────────────┘
```

#### Principle 2: Context Deduplication

```
┌─────────────────────────────────────────────────────────────────┐
│  DEDUP — Never inject the same context twice in one window       │
│                                                                   │
│  WITHOUT DEDUP:                                                   │
│  Edit file 1 → inject 60KB backend patterns                     │
│  Edit file 2 → inject 60KB backend patterns AGAIN                │
│  Edit file 3 → inject 60KB backend patterns AGAIN                │
│  = 180KB wasted on duplicate context = context window blown      │
│                                                                   │
│  WITH DEDUP (marker-based):                                       │
│  Edit file 1 → inject 60KB + dedup marker "## Backend Context"  │
│  Edit file 2 → check last 300 lines for marker → FOUND → SKIP  │
│  Edit file 3 → check last 300 lines for marker → FOUND → SKIP  │
│  = 60KB total, context window preserved                          │
│                                                                   │
│  AFTER COMPACTION:                                                │
│  Edit file 4 → check last 300 lines for marker → NOT FOUND →   │
│  Re-inject 60KB (compaction removed the marker = context lost)   │
│                                                                   │
│  DEDUP CONFIG per hook:                                           │
│  • backend-context: marker "## Backend Context", window 300      │
│  • frontend-context: marker "## Frontend Context", window 300    │
│  • lessons-injector (prompt): marker "## Learned Lessons", 50    │
│  • search-before-code: marker "Recent Grep/Glob", 100           │
│                                                                   │
│  WHY VARIABLE WINDOWS: Lessons (small, 50 lines) need frequent   │
│  re-injection. Backend patterns (large, 300 lines) stay longer.  │
│  The dedup window trades freshness against context budget.        │
└─────────────────────────────────────────────────────────────────┘
```

#### Principle 3: External Memory (Context Offloading)

```
┌─────────────────────────────────────────────────────────────────┐
│  EXTERNAL MEMORY — Move large data OUT of the context window     │
│                                                                   │
│  Three external memory systems:                                   │
│                                                                   │
│  1. SWAP ENGINE (tool-output-swap.cjs)                           │
│     • Trigger: Tool output >50KB                                 │
│     • Action: Write to /tmp/ck/swap/, replace with summary       │
│     • Effect: 500-line grep result → 10-line summary + pointer   │
│     • Recovery: Swap files persist after compaction              │
│                                                                   │
│  2. TODO STATE (todo-tracker.cjs)                                │
│     • Trigger: Every TaskCreate/TaskUpdate                       │
│     • Action: Write to .claude/.ck-todo-state.json               │
│     • Effect: Task progress survives compaction                  │
│     • Recovery: post-compact-recovery.cjs reads state back       │
│                                                                   │
│  3. WORKFLOW STATE (workflow-step-tracker.cjs)                   │
│     • Trigger: Every workflow step completion                    │
│     • Action: Write to .claude/.ck-workflow-state.json           │
│     • Effect: "You were on step 5 of bugfix" survives compact   │
│     • Recovery: post-compact-recovery.cjs restores progress     │
│                                                                   │
│  4. PLAN FILES (plans/ directory)                                │
│     • Trigger: /plan, /plan-hard skills                         │
│     • Action: Write implementation plan to disk                  │
│     • Effect: Plan survives compaction, can be re-read           │
│     • Unlike context: files on disk have unlimited "memory"      │
│                                                                   │
│  META-PRINCIPLE: The context window is volatile RAM.              │
│  Disk files are persistent storage. Move state that must          │
│  survive to disk. Keep only active reasoning in context.         │
└─────────────────────────────────────────────────────────────────┘
```

#### Principle 4: Context Budget Management

```
┌─────────────────────────────────────────────────────────────────┐
│  CONTEXT BUDGET — Allocate tokens intentionally, not randomly    │
│                                                                   │
│  BUDGET ALLOCATION (approximate per session):                    │
│                                                                   │
│  Category                 │ Tokens  │ % of Window │ Managed By   │
│───────────────────────────│─────────│─────────────│──────────────│
│  CLAUDE.md (always loaded)│ ~5K     │ 2.5%        │ System       │
│  Injected rules/lessons   │ ~3K     │ 1.5%        │ Hooks        │
│  Workflow catalog         │ ~4K     │ 2%          │ Router hook  │
│  Pattern docs (JIT)       │ ~15K    │ 7.5%        │ Context hooks│
│  Tool outputs (net)       │ ~100K   │ 50%         │ Swap engine  │
│  AI reasoning/responses   │ ~60K    │ 30%         │ LLM          │
│  State recovery           │ ~3K     │ 1.5%        │ Recovery hook│
│  Safety margin            │ ~10K    │ 5%          │ Compaction   │
│───────────────────────────│─────────│─────────────│──────────────│
│  Total                    │ ~200K   │ 100%        │              │
│                                                                   │
│  KEY DECISIONS:                                                   │
│  • Pattern docs are JIT (not upfront) to save 50% of budget     │
│  • Swap engine reclaims ~80% of large tool outputs               │
│  • Dedup prevents duplicate injection consuming 2x budget        │
│  • Lessons are small (~1K) so injected frequently                │
│  • Compaction threshold leaves 5% safety margin                  │
│                                                                   │
│  WITHOUT this budget management: context exhaustion after         │
│  ~15 tool calls. WITH it: productive sessions of 50+ tool calls. │
└─────────────────────────────────────────────────────────────────┘
```

#### Principle 5: Context Recovery After Amnesia

```
┌─────────────────────────────────────────────────────────────────┐
│  RECOVERY — Restore context after compaction destroys it          │
│                                                                   │
│  COMPACTION EVENT:                                                │
│  Context window full → system summarizes old messages →          │
│  all injected context, tool results, and state are LOST          │
│                                                                   │
│  RECOVERY PIPELINE:                                               │
│                                                                   │
│  1. PRE-COMPACT (write-compact-marker.cjs):                      │
│     Save: current task ID, workflow step, edit count, timestamp  │
│     → .claude/.ck-compact-marker.json                            │
│                                                                   │
│  2. POST-COMPACT (post-compact-recovery.cjs):                    │
│     Read: todo state, workflow state, compact marker              │
│     Inject: "You were on step 5 of bugfix workflow.              │
│              Task #3 (implement fix) is in_progress.             │
│              You've edited 4 files so far."                      │
│                                                                   │
│  3. RE-INJECTION (automatic on next tool use):                   │
│     Dedup markers are gone (compacted away) →                    │
│     Context hooks re-inject: patterns, lessons, rules            │
│     Net effect: full context restored within 1-2 tool calls      │
│                                                                   │
│  RESULT: The AI resumes exactly where it left off.                │
│  From the user's perspective, compaction is invisible.            │
└─────────────────────────────────────────────────────────────────┘
```

#### Principle 6: Context Isolation via Agents

```
┌─────────────────────────────────────────────────────────────────┐
│  ISOLATION — Prevent context pollution between concerns           │
│                                                                   │
│  PROBLEM: A main session doing feature implementation +          │
│  code review + test execution fills its context with             │
│  irrelevant cross-concern data.                                   │
│                                                                   │
│  SOLUTION: Delegate to specialized agents with isolated context  │
│                                                                   │
│  Main Session Context              Agent Context (isolated)      │
│  ┌────────────────────┐           ┌────────────────────┐        │
│  │ Implementation      │ ──spawn→ │ Code Review Agent   │        │
│  │ state, plan,        │           │ Only: diff + rules  │        │
│  │ patterns             │           │ No: impl state      │        │
│  └────────────────────┘           └────────────────────┘        │
│                                                                   │
│  24 agents × isolated contexts = no cross-contamination          │
│  Each agent inherits: CLAUDE.md + lessons (via subagent-init)   │
│  Each agent ignores: unrelated session state                     │
│                                                                   │
│  PARALLEL BENEFIT: 4 code-reviewer agents reviewing different    │
│  file groups simultaneously, each with focused context.           │
└─────────────────────────────────────────────────────────────────┘
```

#### Summary: Context Engineering Techniques → Framework Mapping

| Context Engineering Principle  | Framework Implementation                                                      |
| ------------------------------ | ----------------------------------------------------------------------------- |
| **Just-in-time injection**     | PreToolUse hooks load docs only when editing matching file paths              |
| **Deduplication**              | Marker-based dedup with configurable window (50-300 lines)                    |
| **External memory**            | Swap engine, todo state, workflow state, plan files on disk                   |
| **Context budget management**  | JIT loading + swap + dedup = 50+ tool call sessions vs 15 without             |
| **Recovery after amnesia**     | Pre-compact save → post-compact restore → auto re-injection pipeline          |
| **Context isolation**          | 24 specialized agents with independent context windows                        |
| **Path-based routing**         | project-config.json pathRegexes drive which docs load for which files         |
| **Tiered injection frequency** | Lessons (every prompt) vs patterns (every edit) vs design tokens (UI only)    |
| **Output compression**         | Swap engine replaces 500-line outputs with 10-line summaries + disk pointers  |
| **State persistence**          | External JSON files survive compaction; disk = persistent, context = volatile |

---

## 9. State Management & Recovery

### 9.1 The Compaction Problem

```
┌─────────────────────────────────────────────────────────────────┐
│  THE COMPACTION PROBLEM                                          │
│                                                                   │
│  Claude Code has a finite context window (~200K tokens).         │
│  When it fills up, the system "compacts" — summarizing old       │
│  messages to free space.                                         │
│                                                                   │
│  WHAT'S LOST after compaction:                                    │
│  ❌ Read file state (Edit tool requires prior Read)              │
│  ❌ Todo task context (which tasks were in progress)             │
│  ❌ Workflow step progress (which step we're on)                 │
│  ❌ Injected context (patterns, rules, lessons)                  │
│  ❌ Edit count tracking (how many files changed)                 │
│                                                                   │
│  WHAT'S PRESERVED:                                                │
│  ✅ File system state (actual code changes)                      │
│  ✅ Git state (commits, branches)                                │
│  ✅ External state files (swap, todo, workflow)                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Recovery Architecture

```mermaid
sequenceDiagram
    participant Session as Active Session
    participant Compact as Compaction
    participant Disk as External State (Disk)
    participant Recovery as Recovery Hooks

    Note over Session: Normal operation

    Session->>Disk: todo-tracker.cjs writes todo state
    Session->>Disk: workflow-step-tracker.cjs writes progress
    Session->>Disk: tool-output-swap.cjs writes large outputs
    Session->>Disk: edit-state tracks file edit counts

    Note over Compact: Context window full → Compact

    Compact->>Disk: write-compact-marker.cjs saves marker

    Note over Recovery: Session resumes after compact

    Recovery->>Disk: post-compact-recovery.cjs reads todo state
    Recovery->>Disk: Reads workflow progress
    Recovery->>Disk: Reads edit state
    Recovery->>Session: Injects recovery context:<br/>"You were on step 5 of bugfix workflow,<br/>task 3 of 7 in progress"

    Note over Session: Context injection hooks<br/>re-inject patterns, rules, lessons<br/>(dedup markers gone → fresh injection)
```

### 9.3 External Memory — Swap Engine

For large tool outputs (>50KB grep results, file reads), the swap engine externalizes them:

```
┌─────────────────────────────────────────────────────────────────┐
│  SWAP ENGINE                                                      │
│                                                                   │
│  PROBLEM: A Grep returning 500 matches fills the context window  │
│  SOLUTION: Replace large output with a pointer to disk file      │
│                                                                   │
│  Before Swap:                                                     │
│  [500 lines of grep results consuming 30KB of context]           │
│                                                                   │
│  After Swap:                                                      │
│  "Results externalized to /tmp/ck/swap/grep-abc123.txt           │
│   Summary: 500 matches across 47 files                           │
│   Top 10 matches shown inline..."                                │
│                                                                   │
│  THRESHOLD: >50KB output triggers swap                            │
│  RECOVERY: swap files available for re-read after compaction     │
│  CLEANUP: session-end.cjs removes swap files on exit             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Testing Infrastructure

### 10.1 Test Coverage

```
┌─────────────────────────────────────────────────────────────────┐
│  HOOK TEST INFRASTRUCTURE: 527 Tests                             │
│                                                                   │
│  Suite                         │ Tests │ Coverage Area            │
│────────────────────────────────│───────│──────────────────────────│
│  test-all-hooks.cjs            │  300  │ All 34 hook behaviors    │
│  test-lib-modules.cjs          │   10  │ Core lib modules         │
│  test-lib-modules-extended.cjs │  122  │ Extended lib + greenfield│
│  test-swap-engine.cjs          │   50  │ Swap engine edge cases   │
│  test-context-tracker.cjs      │   23  │ Context tracker          │
│  test-init-reference-docs.cjs  │    5  │ Init reference docs      │
│  test-shared-utilities.cjs     │   17  │ Shared utilities         │
│────────────────────────────────│───────│──────────────────────────│
│  Total                         │  527  │                          │
│                                                                   │
│  Additional suites in tests/suites/:                              │
│  • context.test.cjs — Context injection behavior                 │
│  • integration.test.cjs — Cross-hook interactions                │
│  • lifecycle.test.cjs — Session lifecycle events                 │
│  • security.test.cjs — Safety/blocking hooks                     │
│  • workflow.test.cjs — Workflow routing                          │
│  • notification.test.cjs — Notification providers                │
│  • bugfix-regression.test.cjs — Regression tests                 │
│                                                                   │
│  Run all: node .claude/hooks/tests/test-all-hooks.cjs            │
│  See CLAUDE.md "Development Commands" for full test list         │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 Why Test Hooks?

Hooks are the **safety net** for the entire system. A broken hook means:

- Security blocks bypassed (path boundary, privacy)
- Context injection fails (AI loses project knowledge)
- Edit enforcement disabled (AI makes unchecked changes)
- State persistence breaks (todo, workflow, edit tracking)

Testing ensures the framework remains reliable as hooks evolve.

---

## 11. Quick Reference

### Complete Request Lifecycle

```mermaid
flowchart TB
    A[User submits prompt] --> B[init-prompt-gate.cjs<br/>Config populated?]
    B -->|No| BLOCK1[❌ Block until config exists]
    B -->|Yes| C[workflow-router.cjs<br/>Inject workflow catalog]
    C --> D[prompt-context-assembler.cjs<br/>Inject dev rules + lessons + reminders]

    D --> H{LLM processes prompt<br/>with injected context}

    H -->|Tool: Edit| I[PreToolUse pipeline]
    I --> I1[windows-command-detector]
    I1 --> I2[scout-block]
    I2 --> I3[privacy-block]
    I3 --> I4[path-boundary-block]
    I4 --> I5[edit-enforcement<br/>Task exists?]
    I5 -->|No task| BLOCK2[❌ Block: Create task first]
    I5 -->|Task exists| I6[search-before-code<br/>Evidence exists?]
    I6 -->|No search| BLOCK3[❌ Block: Search first]
    I6 -->|Evidence found| I7[Context injection:<br/>backend/frontend/design/patterns/lessons]
    I7 --> EXEC[Tool executes]

    EXEC --> J[PostToolUse pipeline]
    J --> J1[tool-output-swap<br/>Large output?]
    J1 --> J2[post-edit-prettier<br/>Format file]
    J2 --> J3[todo-tracker<br/>Update state]

    J3 --> H

    style BLOCK1 fill:#f44336,color:white
    style BLOCK2 fill:#f44336,color:white
    style BLOCK3 fill:#f44336,color:white
    style EXEC fill:#4CAF50,color:white
```

### AI Best Practice → Framework Mapping

| AI Agent Best Practice                         | Framework Mechanism                                        | Layer     |
| ---------------------------------------------- | ---------------------------------------------------------- | --------- |
| **Context injection at decision points**       | 10 context injector hooks, auto-triggered by file path     | Hooks     |
| **Reminder rules prevent forgetting**          | 3 UserPromptSubmit hooks re-inject on every prompt         | Hooks     |
| **Generic & configurable via config**          | project-config.json drives all context injection           | Config    |
| **Prompt engineering quality**                 | 203+ skills with YAML frontmatter + behavior protocols     | Skills    |
| **Confirm workflow before acting**             | workflow-router.cjs → AskUserQuestion → confirm            | Workflows |
| **Confirm plan with questions**                | /plan-validate asks 3-8 questions before implementation    | Skills    |
| **Sequential thinking for complex problems**   | /sequential-thinking skill + /debug skill                  | Skills    |
| **Code proof tracing prevents hallucination**  | evidence-based-reasoning-protocol + /prove-fix             | Skills    |
| **Search before create**                       | search-before-code.cjs blocks edits without evidence       | Hooks     |
| **State survives context compaction**          | Swap engine + todo-tracker + compact-recovery              | State     |
| **Lessons persist across sessions**            | docs/project-reference/lessons.md + lessons-injector.cjs   | Hooks     |
| **Subagents inherit project context**          | subagent-init.cjs injects CLAUDE.md + lessons              | Hooks     |
| **Safety boundaries**                          | path-boundary, privacy, scout blocks (exit code 2)         | Hooks     |
| **Task-gated edits**                           | edit-enforcement.cjs requires TaskCreate before edits      | Hooks     |
| **Auto-formatting**                            | post-edit-prettier.cjs runs formatter after every edit     | Hooks     |
| **Doc staleness detection**                    | /watzup skill cross-references changes vs. docs/           | Skills    |
| **Unified test specification**                 | /tdd-spec writes TCs to feature doc Section 17             | Skills    |
| **TDD-first workflow**                         | tdd-feature: spec→plan→implement→test→verify               | Workflows |
| **Interactive requirement capture**            | /idea discovery interview + /refine testability check      | Skills    |
| **Test-to-code traceability**                  | TC-{FEATURE}-{NNN} → test annotation linking to TC ID      | Skills    |
| **E2E from browser recordings**                | /e2e-test + Chrome DevTools Recorder → Playwright          | Skills    |
| **Screenshot assertion baselines**             | e2e-update-ui workflow + toHaveScreenshot()                | Workflows |
| **Greenfield project inception**               | isGreenfieldProject() detection → solution-architect agent | Hooks     |
| **AI as solution architect**                   | /greenfield skill + greenfield-init workflow (waterfall)   | Workflows |
| **Research-driven big features**               | big-feature workflow with step-selection gate              | Workflows |
| **DDD domain modeling**                        | /domain-analysis skill: bounded contexts, ERD, aggregates  | Skills    |
| **Tech stack comparison with evidence**        | /tech-stack-research: top 3 per layer, confidence %        | Skills    |
| **Step-selection gate for long workflows**     | big-feature + greenfield preActions let user deselect      | Workflows |
| **Workflow trigger shortcuts**                 | 18 workflow-\* skills for instant activation via /command  | Skills    |
| **Prompt engineering (role + CoT + evidence)** | Skills use role prompting, chain-of-thought, few-shot      | Skills    |
| **Context engineering (JIT + dedup + budget)** | Hooks manage context window with precision injection       | Hooks     |

### File Structure

```
.claude/
├── settings.json ──────── Hook registration (9 events, 34 hooks)
├── .ck.json ──────────── Hook-specific config
├── .ckignore ─────────── Scout block patterns
├── workflows.json ─────── 47 workflow definitions
├── workflows/ ──────────── Workflow rules (development-rules.md, etc.)
├── hooks/ ─────────────── 34 hooks + 25 lib modules + 527 tests
│   ├── session-init.cjs
│   ├── workflow-router.cjs
│   ├── prompt-context-assembler.cjs
│   ├── edit-enforcement.cjs
│   ├── ...
│   ├── lib/ ──────────── Shared modules
│   │   ├── swap-engine.cjs
│   │   ├── context-injector-base.cjs
│   │   ├── prompt-injections.cjs
│   │   ├── todo-state.cjs
│   │   └── ...
│   └── tests/ ────────── Test suites
├── skills/ ────────────── 203+ skill directories
│   ├── {skill-name}/SKILL.md
│   ├── shared/ ───────── 5 shared protocols + references (module-codes.md)
│   └── _templates/ ───── Skill scaffolding
├── agents/ ────────────── 24 agent definitions
├── docs/ ─────────────── Framework documentation (co-located)
└── patterns/ ──────────── Anti-hallucination patterns

docs/
├── project-config.json ── Generic project configuration
├── project-reference/ ──── Reference docs (auto-initialized by hooks)
│   ├── project-structure-reference.md
│   ├── backend-patterns-reference.md ── Injected on backend file edits
│   ├── frontend-patterns-reference.md ── Injected on frontend file edits
│   ├── code-review-rules.md ── Injected on code-review skill
│   ├── domain-entities-reference.md ── Entity catalog & cross-service sync
│   ├── lessons.md ──────────── Persistent learned lessons (max 50)
│   ├── design-system/ ──────── Per-app design tokens
│   └── ...
└── business-features/ ──── Feature docs per service module
```

---

## 12. The Agent System — Specialized Subagents

### 12.1 What Agents Are

Agents are **Markdown files** (`.claude/agents/*.md`) that define specialized AI subprocesses. Each agent receives a focused system prompt, restricted tool set, and domain-specific instructions. They run as child processes of the main Claude Code session.

```
AGENT SYSTEM (24 agents)
│
├── IMPLEMENTATION AGENTS
│   ├── backend-developer ──── .NET CQRS patterns, entities, events
│   ├── fullstack-developer ── Parallel implementation with file ownership
│   └── git-manager ─────────── Stage, commit, push with conventions
│
├── QUALITY & REVIEW AGENTS
│   ├── code-reviewer ────────── Report-driven code review
│   ├── code-simplifier ──────── YAGNI/KISS/DRY cleanup
│   ├── tester ───────────────── Test execution & coverage
│   ├── integration-tester ──── TC-based integration tests
│   └── e2e-runner ──────────── Framework-agnostic E2E tests
│
├── PLANNING & ARCHITECTURE AGENTS
│   ├── planner ─────────────── Implementation plan creation
│   ├── architect ───────────── System design & ADR creation
│   ├── solution-architect ──── Greenfield project inception & design
│   ├── scout ───────────────── Codebase file discovery
│   ├── scout-external ──────── External tool-based scouting
│   └── researcher ──────────── Web research & documentation
│
├── PROJECT MANAGEMENT AGENTS
│   ├── project-manager ─────── Status tracking & reporting
│   ├── product-owner ───────── PBI management & prioritization
│   ├── business-analyst ────── Requirements & user stories
│   └── qc-specialist ──────── Quality gates & compliance
│
├── CONTENT & DOCS AGENTS
│   ├── docs-manager ────────── Documentation synchronization
│   ├── knowledge-worker ────── Research synthesis & reports
│   └── journal-writer ──────── Technical difficulty journaling
│
└── SPECIALIZED AGENTS
    ├── ui-ux-designer ──────── Interface design & accessibility
    ├── database-admin ──────── DB optimization & migrations
    └── debugger ────────────── Root cause analysis & diagnostics
```

### 12.2 Why Agents Matter

Agents solve two critical problems:

1. **Context isolation** — Each agent gets a focused context window without polluting the main session. A code reviewer doesn't need implementation state; a scout doesn't need review findings.

2. **Parallel execution** — Multiple agents can run simultaneously (e.g., 4 code-reviewer agents reviewing different file categories in parallel), dramatically reducing time for large tasks.

**Key design:** Agents inherit project context via `subagent-init.cjs` — they automatically receive CLAUDE.md instructions, learned lessons, and active workflow state.

---

## Summary — Philosophy & Principles

### The Core Thesis

**LLMs are powerful but unreliable.** They forget context in long conversations, hallucinate APIs that don't exist, invent patterns instead of following established ones, and skip essential steps when not supervised. The question isn't whether AI makes mistakes — it's whether your system catches them before they reach production.

This framework answers that question with **defense in depth**: multiple independent layers that each catch a different class of failure. The framework is grounded in two engineering disciplines: **prompt engineering** (how to instruct the AI effectively — Section 8.15) and **context engineering** (how to manage what information reaches the AI — Section 8.16).

### Four Complementary Layers

1. **Hooks** (programmatic) — Guarantee enforcement. Context injection, safety blocks, and state persistence run as Node.js processes. They cannot be ignored, forgotten, or hallucinated away. The AI doesn't choose to follow them — they execute regardless.

2. **Skills** (prompt-based) — Guide reasoning. Evidence-based protocols, confidence levels, and proof traces shape how the AI thinks about code changes. They turn vague intentions into disciplined investigation.

3. **Workflows** (declarative) — Enforce process. Step sequences ensure investigation before implementation, planning before coding, and review before commit. They prevent "ready, fire, aim."

4. **Agents** (specialized) — Divide and conquer. Isolated subprocesses with focused context, restricted tools, and domain expertise. They enable parallelism without context pollution.

### Design Principles

| Principle                         | Implementation                                                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trust but verify**              | Every AI claim must cite `file:line` evidence. The `evidence-based-reasoning-protocol` makes speculation forbidden.                                                                    |
| **Fail closed, not open**         | Safety hooks use `exit 2` (non-overridable block). When in doubt, block and explain rather than allow and hope.                                                                        |
| **Convention over configuration** | `project-config.json` centralizes all project-specific knowledge. Hooks read it at runtime — no hardcoded assumptions.                                                                 |
| **Enforce at the boundary**       | Hooks run as separate processes at lifecycle boundaries. The AI can't bypass them because they execute outside the LLM's control loop.                                                 |
| **Learn from mistakes**           | The `/learn` skill captures AI errors into `lessons.md`. The `lessons-injector.cjs` hook re-injects them on every prompt and edit. Past mistakes become future guardrails.             |
| **Search before create**          | `search-before-code.cjs` blocks file creation/modification until evidence of codebase search exists. This prevents pattern invention and ensures code follows established conventions. |
| **Plan before implement**         | `edit-enforcement.cjs` requires `TaskCreate` before any file edit. Combined with workflow step tracking, this ensures AI doesn't skip from question to code without a plan.            |
| **State survives amnesia**        | External state files (todo, workflow progress, swap) persist to disk. After context compaction, `post-compact-recovery.cjs` restores progress — the AI resumes where it left off.      |

### What Makes This Framework Different

Most AI coding tools focus on **generation** — producing code faster. This framework focuses on **quality** — producing code that's correct, consistent, and maintainable. The key insight:

> **The bottleneck in AI-assisted development isn't speed of generation — it's reliability of output.**

A 10x faster code generator that produces incorrect code 20% of the time is worse than a 5x faster generator that produces correct code 99% of the time. This framework optimizes for the latter.

### The AI as Strategic Advisor — Not Just a Code Generator

The framework elevates the AI from a code autocomplete tool to a **strategic development partner**:

| Traditional AI Coding Tool   | This Framework                                                        |
| ---------------------------- | --------------------------------------------------------------------- |
| Generates code from prompts  | Investigates codebase, then generates code matching existing patterns |
| No memory between sessions   | Learned lessons persist and prevent repeated mistakes                 |
| Implements immediately       | Plans, validates with user, reviews plan, then implements             |
| Uses generic patterns        | Reads project-specific patterns from reference docs                   |
| Works on existing code only  | Guides greenfield inception AND big-feature research                  |
| Single-shot responses        | Multi-step workflows with quality gates at each stage                 |
| User must remember all rules | Hooks inject rules automatically — human memory not required          |
| Loads all context upfront    | JIT context injection — right docs at right time (context eng.)       |
| One-pass generation          | Multi-pass review: cook→simplify→review→code-review→sre (prompt eng.) |

**For greenfield projects**, the AI becomes a full Solution Architect — conducting market research, evaluating tech stacks with confidence percentages, modeling domains with DDD, and collaborating with the user at every decision point. The AI earns trust through structured thinking, not just fast output.

**For established projects**, the AI becomes a senior team member who always reads the docs first, follows the team's conventions, cites evidence for every claim, and catches its own mistakes before they ship.

### Why This Works — The Deeper Insight

The framework succeeds because it aligns with how LLMs actually fail:

| LLM Failure Mode            | Root Cause                                                  | Framework Counter                                                |
| --------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| **Pattern invention**       | Training data generalizes; your project is specific         | Context injection puts real patterns in every prompt             |
| **Context amnesia**         | Long conversations exceed attention; compaction drops state | External state files + recovery hooks restore progress           |
| **Skipped steps**           | LLMs optimize for shortest path to output                   | Workflow enforcement makes process non-negotiable                |
| **Confident hallucination** | LLMs can't distinguish recall from confabulation            | Evidence gates demand `file:line` proof for every claim          |
| **Convention drift**        | Without reminders, AI reverts to generic patterns           | Hook injection re-injects project conventions on every edit      |
| **Repeated mistakes**       | Each session starts fresh with no memory of past errors     | Lessons system persists errors and re-injects them as guardrails |

**The meta-principle:** Don't fight the LLM's nature — build infrastructure around it. Accept that it forgets, and build state persistence. Accept that it hallucinates, and build evidence gates. Accept that it drifts, and build convention injection. The framework doesn't make the AI smarter — it makes the AI's environment smarter.

### The Result

**34 hooks**, **203+ skills**, **47 workflows**, and **24 specialized agents** working in concert to deliver:

- **Fewer hallucinations** — Evidence gates, search-before-code, and proof traces catch AI fabrications before they reach files
- **Better code quality** — Pattern injection ensures AI follows project conventions, not generic training data
- **Full lifecycle coverage** — From greenfield inception through idea capture, test specification, implementation, code review, and documentation
- **Consistent adherence** — Programmatic enforcement means quality doesn't degrade in long sessions or complex tasks
- **Recovery from amnesia** — External state persistence means context compaction doesn't lose progress
- **Persistent learning** — Mistakes captured once prevent recurrence across all future sessions
- **Prompt engineering depth** — Role prompting, chain-of-thought, few-shot, negative prompting, and iterative refinement applied systematically across 203+ skills (Section 8.15)
- **Context engineering precision** — JIT injection, dedup, external memory, budget management, and recovery keep the AI informed without overwhelming its context window (Section 8.16)

The framework is **generic and reusable**. Replace `project-config.json` with your project's specifics, and the entire system adapts — different tech stack, different patterns, different conventions, same quality enforcement.

### Adopting This Framework — What to Do First

If you want to apply this framework to your own project:

1. **Copy `.claude/` directory** — hooks, skills, workflows, agents. These are project-agnostic.
2. **Run `/project-config`** — Populate `docs/project-config.json` with your tech stack, services, file patterns.
3. **Run scan skills** — `/scan-project-structure`, `/scan-backend-patterns`, `/scan-frontend-patterns` to populate reference docs from your codebase.
4. **Start working** — Hooks auto-inject your patterns, workflows enforce your process, skills guide AI reasoning.
5. **For greenfield projects** — Run `/greenfield` to start the waterfall inception workflow. The framework auto-detects empty projects and switches to Solution Architect mode.

**Time to value:** ~30 minutes for an existing project (config + 3 scans). Zero config for greenfield (auto-detected).

---

_This guide documents a living system. As hooks, skills, and workflows evolve, update this document to match. Use `/watzup` to detect doc staleness after changes._
