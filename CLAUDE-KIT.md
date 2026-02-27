# ClaudeKit - AI Development Toolkit for Claude Code

> **Multi-Agent Orchestration Platform** | Ship Production Code in Hours

---

## Executive Summary

ClaudeKit is a production-ready toolkit enhancing Claude Code with multi-agent orchestration, 60+ skills, 30+ workflows, and 12+ MCP integrations. Available in commercial ($99) and open-source versions, it addresses context management, output consistency, and workflow automation for solo developers and teams.

**Key Value**: 50-70% time savings on repetitive tasks, consistent code quality, transparent audit trails.

---

## Product Versions

| Aspect | Engineer Kit (Paid) | Open-Source |
|--------|---------------------|-------------|
| **Price** | $99 (lifetime) | Free |
| **Agents** | 14+ specialized | 20 agents |
| **Commands** | 50+ slash commands | 27+ commands |
| **Skills** | 60+ production-ready | 30+ skills |
| **Modes** | Standard | 7 behavioral modes |
| **Support** | Discord + Email | Community |
| **Updates** | Automatic | Manual |

### Commercial Products

- **Engineer Kit** ($99): AI agent orchestration, testing, code review, documentation, git workflow
- **Marketing Kit** ($99, Q1 2026): Lead generation, content automation, SEO, CRM integration
- **Combo Bundle** ($149, Q1 2026): Both kits combined

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Human (Architect/Reviewer)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     ClaudeKit Orchestrator                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Commands  │  │    Skills   │  │   MCP Integrations  │  │
│  │   (50+)     │  │    (60+)    │  │       (12+)         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Development  │    │  Operations   │    │   Extended    │
│    Agents     │    │    Agents     │    │    Agents     │
│  (Planner,    │    │  (Git, Docs,  │    │  (CI/CD,      │
│  Researcher,  │    │  Project,     │    │  Security,    │
│  Tester...)   │    │  DB Admin)    │    │  API Design)  │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## Agents (14+ Specialized)

### Development Agents

| Agent | Purpose |
|-------|---------|
| **Planner** | Creates detailed implementation roadmaps |
| **Researcher** | Gathers and analyzes information |
| **Tester** | Generates comprehensive test suites |
| **Debugger** | Identifies and fixes issues systematically |
| **Brainstormer** | Ideates solutions and approaches |
| **Code Reviewer** | Evaluates code quality and patterns |
| **Scout** | Maps codebase structure internally |
| **Scout External** | Analyzes external codebases |
| **Fullstack Developer** | Handles frontend/backend implementation |

### Operations Agents

| Agent | Purpose |
|-------|---------|
| **Git Manager** | Version control automation |
| **Docs Manager** | Documentation lifecycle |
| **Project Manager** | Workflow orchestration |
| **Database Admin** | Database operations and optimization |
| **UI/UX Designer** | Design specifications and patterns |

### Extended Agents

| Agent | Purpose |
|-------|---------|
| **Journal Writer** | Records technical difficulties |
| **MCP Manager** | MCP server discovery and execution |
| **Copywriter** | Marketing and content writing |
| **CI/CD Manager** | Pipeline management |
| **Security Auditor** | Vulnerability assessment |

---

## Commands Reference

### Workflow Commands

| Command | Description |
|---------|-------------|
| `/plan` | Creates detailed implementation plans |
| `/cook` | Generates code implementations |
| `/test` | Creates test suites |
| `/debug` | Analyzes and fixes issues |
| `/bootstrap` | Initializes new projects |
| `/execute-plan` | Executes planned tasks |

### Fix Commands

| Command | Use Case |
|---------|----------|
| `/fix-fast` | Quick fixes |
| `/fix-hard` | Complex issues |
| `/fix-ui` | UI-specific fixes |
| `/fix-types` | TypeScript type errors |
| `/fix-parallel` | Multi-file parallel fixes |
| `/fix-ci` | CI/CD pipeline fixes |
| `/fix-test` | Test failures |

### Design Commands

| Command | Output |
|---------|--------|
| `/design-3d` | 3D design elements |
| `/design-fast` | Quick mockups |
| `/design-good` | High-quality designs |
| `/design-screenshot` | Screenshot-based design |
| `/design-video` | Video UI concepts |

### Git Commands

| Command | Action |
|---------|--------|
| `/commit` | Commit with message |
| `/git-cp` | Commit and push |
| `/git-pr` | Create pull request |
| `/git-merge` | Merge branches |

### Content Commands

| Command | Purpose |
|---------|---------|
| `/content-good` | High-quality content |
| `/content-cro` | Conversion-optimized |
| `/content-enhance` | Content improvement |
| `/content-fast` | Quick content generation |

### Context Management

| Command | Function |
|---------|----------|
| `/mode` | Switch behavioral modes |
| `/index` | Index project files |
| `/load` | Load project context |
| `/checkpoint` | Save progress checkpoint |
| `/spawn` | Parallel task execution |

---

## Skills Library

### Development Skills

| Category | Skills |
|----------|--------|
| **Frontend** | Next.js, React, Tailwind CSS, shadcn/ui, Three.js |
| **Backend** | Node.js, Python, Go, Rust, FastAPI, Django |
| **Database** | PostgreSQL, MongoDB, Redis |
| **DevOps** | Docker, Cloudflare Workers, GCP, GitHub Actions |
| **Testing** | pytest, vitest, Playwright |

### AI/ML Skills

| Skill | Capabilities |
|-------|--------------|
| **ai-multimodal** | Gemini API: audio transcription, image analysis, video processing |
| **google-adk-python** | Google Agent Development Kit |
| **context-engineering** | Memory architectures, multi-agent patterns |
| **sequential-thinking** | Step-by-step reasoning with revision |

### Document Processing

| Skill | Format |
|-------|--------|
| **pdf** | PDF manipulation |
| **docx** | Word documents |
| **xlsx** | Excel spreadsheets |
| **pptx** | PowerPoint presentations |

### Debugging Framework

| Skill | Approach |
|-------|----------|
| **systematic-debugging** | Four-phase investigation |
| **root-cause-tracing** | Backward bug tracing |
| **defense-in-depth** | Layer-by-layer validation |
| **verification-before-completion** | Output confirmation |

### Problem-Solving

| Skill | Technique |
|-------|-----------|
| **collision-zone-thinking** | Force unrelated concepts together |
| **inversion-exercise** | Flip assumptions |
| **scale-game** | Test at extremes |
| **simplification-cascades** | Component elimination |
| **when-stuck** | Dispatch to appropriate technique |

---

## Behavioral Modes (Open-Source)

| Mode | Purpose | Token Impact |
|------|---------|--------------|
| **default** | Balanced responses | Baseline |
| **brainstorm** | Creative ideation | +20% |
| **token-efficient** | Compressed output | -30% |
| **deep-research** | Thorough analysis | +50% |
| **implementation** | Code-focused | Baseline |
| **review** | Quality assessment | +10% |
| **orchestration** | Multi-agent coordination | +30% |

---

## MCP Integrations

| Server | Functionality |
|--------|---------------|
| **Context7** | Documentation retrieval |
| **Sequential Thinking** | Step-by-step reasoning |
| **Playwright** | Browser automation |
| **Memory** | Knowledge persistence |
| **Filesystem** | File operations |

---

## Installation

### CLI Installation (Paid Version)

```bash
# Install CLI
npm install -g claudekit-cli

# Create new project
ck new my-project --kit engineer

# Initialize in existing project
ck init

# Check for updates
ck update --check
```

### Authentication

```bash
# Install GitHub CLI
brew install gh  # macOS

# Authenticate (OAuth, NOT PAT)
gh auth login
# Select "Login with a web browser"
```

### Open-Source Installation

```bash
# Clone repository
git clone https://github.com/duthaho/claudekit

# Copy to .claude directory
cp -r claudekit/.claude /your-project/
```

### Skills Plugin Installation

```bash
# Via plugin marketplace
/plugin marketplace add mrgoonie/claudekit-skills
/plugin install ai-ml-tools@claudekit-skills
```

---

## Workflow Examples

### Feature Development

```
/plan [feature description]
    └── Creates implementation roadmap
        │
        ▼
/cook [implementation task]
    └── Generates production code
        │
        ▼
/test [component]
    └── Creates test suite
        │
        ▼
/commit
    └── Commits with conventional message
```

### Bug Fix Workflow

```
/debug [error description]
    └── Systematic investigation
        │
        ▼
/fix-hard [issue]
    └── Implements fix
        │
        ▼
/test
    └── Validates fix
```

### Comprehensive Delivery

```
Brainstorm → Plan → Cook → Test → Review → Ship
```

---

## Typical Workflow Chains

| Workflow | Command Sequence |
|----------|------------------|
| **Feature** | `/scout` → `/plan` → `/cook` → `/review-changes` → `/code-review` → `/test` → `/docs-update` → `/watzup` |
| **Bug Fix** | `/scout` → `/investigate` → `/debug` → `/plan` → `/fix` → `/review-changes` → `/code-review` → `/test` → `/watzup` |
| **Refactor** | `/scout` → `/plan` → `/code` → `/review-changes` → `/code-review` → `/test` → `/watzup` |
| **Documentation** | `/scout` → `/plan` → `/docs-update` → `/review-changes` → `/watzup` |
| **Full Delivery** | `/brainstorm` → `/plan` → `/cook` → `/review-changes` → `/test` → `/watzup` |

---

## Comparison: ClaudeKit vs Raw Claude Code

| Aspect | Raw Claude Code | With ClaudeKit |
|--------|-----------------|----------------|
| **Context Management** | Manual | Automated checkpoints |
| **Code Consistency** | Variable | Enforced patterns |
| **Workflow Automation** | None | 30+ workflows |
| **Multi-Agent** | Single agent | 14+ specialized agents |
| **Documentation** | Manual | Auto-generated |
| **Token Efficiency** | Baseline | Up to 70% savings |

---

## Risk Assessment (For Adoption)

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Vendor lock-in | Medium | Medium | Open-source alternative exists |
| Learning curve | Low | Low | Comprehensive docs, familiar patterns |
| Integration conflicts | Low | Medium | Isolated .claude directory |
| Update breaking changes | Low | Medium | Semantic versioning, changelogs |

---

## Resources

### Official Links

- **Website**: [claudekit.cc](https://claudekit.cc)
- **Documentation**: [docs.claudekit.cc](https://docs.claudekit.cc)
- **CLI Repository**: [github.com/mrgoonie/claudekit-cli](https://github.com/mrgoonie/claudekit-cli)
- **Skills Repository**: [github.com/mrgoonie/claudekit-skills](https://github.com/mrgoonie/claudekit-skills)
- **Open-Source Version**: [github.com/duthaho/claudekit](https://github.com/duthaho/claudekit)

### Community

- **Discord**: Available via website
- **GitHub Organization**: [github.com/claudekit](https://github.com/claudekit)

### Contact

- **Email**: hello@claudekit.cc
- **Creator**: Goon Nguyen

---

## Compliance

- Stripe Verified
- SOC 2 Certified
- GDPR Compliant
- 30-day money-back guarantee

---

*Last updated: 2025-12-30*
