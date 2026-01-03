# EasyPlatform Agent Guidelines

> Specialized AI agents for common development tasks

## Automatic Workflow Detection (CRITICAL)

**BEFORE responding to ANY task, you MUST:**
1. **DETECT** intent from user prompt (see workflow patterns below)
2. **ANNOUNCE** the detected workflow
3. **CONFIRM** for high-impact workflows (features, refactors)
4. **EXECUTE** each step in the workflow sequence

**Workflow Configuration:** `.claude/workflows.json` (single source of truth)
**Workflow Router Agent:** `.github/agents/workflow-router.md`

See root `AGENTS.md` for detailed workflow detection rules.

---

## Available Agents

### Workflow & Routing

| Agent | Purpose | Trigger Keywords | Model |
|-------|---------|------------------|-------|
| **workflow-router** | Detect intent from prompts, route to appropriate workflows | (auto-invoked) | haiku |

### Core Development Agents

| Agent | Purpose | Trigger Keywords | Model |
|-------|---------|------------------|-------|
| **planner** | Research, analyze, create implementation plans for features/architecture | plan, design, architect, how should I, strategy | opus |
| **code-reviewer** | Comprehensive code quality assessment, security audit, performance analysis | review, refactor, improve, clean up, analyze quality, PR review | sonnet |
| **debugger** | Investigate issues, analyze system behavior, diagnose performance problems | bug, error, fix, debug, stack trace, exception, crash, logs | sonnet |
| **tester** | Validate code quality through testing, coverage analysis, build verification | test, coverage, unit test, integration test, validate | haiku |
| **fullstack-developer** | Execute implementation phases, handle backend/frontend/infrastructure tasks | implement, build, create, develop, code | sonnet |

### Research & Planning Agents

| Agent | Purpose | Trigger Keywords | Model |
|-------|---------|------------------|-------|
| **researcher** | Comprehensive research on technologies, documentation, best practices | research, investigate, find docs, explore, compare | haiku |
| **scout** | Quickly locate relevant files across large codebases | find files, locate, search codebase, where is | haiku |
| **scout-external** | File location using external agentic tools (Gemini, OpenCode) | find files external, deep search | haiku |
| **brainstormer** | Generate creative ideas, explore alternatives, problem-solving | brainstorm, ideas, alternatives, what if | sonnet |

### Documentation & Management Agents

| Agent | Purpose | Trigger Keywords | Model |
|-------|---------|------------------|-------|
| **docs-manager** | Manage technical documentation, PDRs, standards, doc updates | document, docs, update readme, standards | haiku |
| **project-manager** | Project oversight, progress tracking, coordination | status, progress, track, coordinate | sonnet |
| **git-manager** | Stage, commit, push code with conventional commits | commit, push, git, version control | haiku |
| **journal-writer** | Document technical difficulties, failures, lessons learned | journal, postmortem, failure, lesson | sonnet |

### Specialized Agents

| Agent | Purpose | Trigger Keywords | Model |
|-------|---------|------------------|-------|
| **database-admin** | Database queries, optimization, migrations, health assessment | database, query, sql, migration, optimize db | sonnet |
| **ui-ux-designer** | Interface designs, wireframes, design systems, accessibility | design, UI, UX, wireframe, layout, responsive | inherit |
| **copywriter** | High-converting marketing copy, social media, landing pages | copy, headline, marketing, content | haiku |
| **mcp-manager** | Manage MCP server integrations, discover tools/prompts/resources | mcp, tools, server, integration | haiku |

## Quick Decision Tree

```
What do you need?
├── Plan/Architecture
│   ├── New feature design → planner
│   ├── Technical research → researcher
│   └── Creative solutions → brainstormer
│
├── Implementation
│   ├── Build feature → fullstack-developer
│   ├── Database work → database-admin
│   └── UI/UX design → ui-ux-designer
│
├── Quality Assurance
│   ├── Code review → code-reviewer
│   ├── Run tests → tester
│   └── Debug issues → debugger
│
├── File Operations
│   ├── Find files → scout
│   └── Deep search → scout-external
│
├── Documentation
│   ├── Update docs → docs-manager
│   └── Record failures → journal-writer
│
├── Git Operations
│   └── Commit/push → git-manager
│
└── Project Management
    ├── Track progress → project-manager
    └── Marketing copy → copywriter
```

## Agent Protocols

### Core Anti-Hallucination Rules

All agents MUST follow these protocols:

1. **ASSUMPTION_VALIDATION_CHECKPOINT**
   - "What assumptions am I making about [X]?"
   - "Have I verified this with actual code evidence?"
   - "Could I be wrong about [specific pattern/relationship]?"

2. **EVIDENCE_CHAIN_VALIDATION**
   - "I believe X calls Y because..." → show actual code
   - "This follows pattern Z because..." → cite specific examples
   - "Service A owns B because..." → grep for actual boundaries

3. **CONTEXT_ANCHOR_SYSTEM**
   - Every 10 operations, re-read original task
   - Verify current operation aligns with goals
   - Check if solving the right problem

### Agent Principles

All agents follow:
- **YAGNI** - You Aren't Gonna Need It
- **KISS** - Keep It Simple, Stupid
- **DRY** - Don't Repeat Yourself
- **Token Efficiency** - Concise output, sacrifice grammar for clarity

### Tool Efficiency

- Batch multiple searches with OR patterns
- Use parallel Read operations for related files
- Combine semantic searches with related keywords
- Complete operations within time targets (scout: 3-5 min)

## EasyPlatform-Specific Rules

### Backend Verification

Before modifying backend code, verify:
- [ ] Correct repository type (`IPlatformQueryableRootRepository<T>`, `IPlatformQueryableRootRepository<T>`)
- [ ] Validation uses fluent API (`.And()`, `.AndAsync()`)
- [ ] No side effects in handlers (use `UseCaseEvents/` instead)
- [ ] DTO mapping in DTO class (`PlatformEntityDto.MapToEntity()`)
- [ ] Command/Handler/Result in ONE file
- [ ] Cross-service uses message bus only

### Frontend Verification

Before modifying frontend code, verify:
- [ ] Correct base class inheritance (`AppBaseComponent`, `AppBaseVmStoreComponent`)
- [ ] Uses `PlatformVmStore` for state
- [ ] Subscriptions use `.pipe(this.untilDestroyed())`
- [ ] API calls through `PlatformApiService`
- [ ] BEM classes on all template elements

## Agent Communication

Agents should:
1. **Present findings** before making changes
2. **Request approval** for significant modifications
3. **Maintain backward compatibility**
4. **Preserve existing tests**
5. **Follow platform patterns**
6. **Update plan files** with task status and next steps

## Report Output Standards

All agent reports should:
- Use naming pattern from injected hooks (includes full path + computed date)
- Include executive summary (3-4 sentences)
- List unresolved questions at the end
- Sacrifice grammar for concision
- Categorize findings by severity (Critical/High/Medium/Low)

## Reference Documentation

- `.github/copilot-instructions.md` - Global development rules
- `.github/instructions/` - Pattern-specific instructions
- `.github/prompts/` - Task-specific prompts
- `docs/claude/` - Detailed pattern documentation
- `CLAUDE.md` - Project-wide AI instructions
