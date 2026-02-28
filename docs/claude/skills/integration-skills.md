# Integration Skills

> Infrastructure, AI tools, context management, and skill creation

## Overview

Integration skills extend Claude Code with cloud deployment, browser automation, AI multimedia processing, memory management, and custom skill creation capabilities.

## Infrastructure/DevOps Skills

### `devops`

**Triggers:** Cloudflare, Docker, GCP, deploy, Workers, R2, containers

Cloud infrastructure deployment and management across multiple platforms.

#### Platform Selection

| Platform | Best For | Key Products |
|----------|----------|--------------|
| Cloudflare | Edge-first, <50ms latency, zero egress | Workers, R2, D1, KV, Pages, Durable Objects |
| Docker | Local dev, microservices, Kubernetes | Containers, Compose, multi-stage builds |
| Google Cloud | Enterprise scale, ML/AI, managed DBs | Compute Engine, GKE, Cloud Run, Cloud SQL |

#### Quick Start

```bash
# Cloudflare Workers
npm install -g wrangler
wrangler init my-worker && wrangler deploy

# Docker
docker build -t myapp . && docker run -p 3000:3000 myapp

# Google Cloud
gcloud run deploy my-service --image gcr.io/project/image --region us-central1
```

#### Decision Matrix

| Need | Choose |
|------|--------|
| Sub-50ms latency globally | Cloudflare Workers |
| Zero egress storage | Cloudflare R2 |
| SQL with global reads | Cloudflare D1 |
| Containerized workloads | Docker + Cloud Run/GKE |
| Managed Kubernetes | GKE |
| Browser automation at edge | Cloudflare Browser Rendering |

#### Source

Location: `.claude/skills/devops/`

---

### `chrome-devtools`

**Triggers:** Puppeteer, browser automation, screenshots, web scraping

Browser automation via Puppeteer scripts with persistent sessions.

#### Available Scripts

| Script | Purpose |
|--------|---------|
| `navigate.js` | Navigate to URLs |
| `screenshot.js` | Capture screenshots (auto-compress >5MB) |
| `click.js` / `fill.js` | Interact with elements |
| `aria-snapshot.js` | Get accessibility tree (YAML with refs) |
| `select-ref.js` | Interact by ARIA ref |
| `console.js` | Monitor console messages |
| `network.js` | Track HTTP requests |
| `performance.js` | Measure Core Web Vitals |

#### ARIA Snapshot Workflow

```bash
# 1. Get accessibility tree
node aria-snapshot.js --url https://example.com

# 2. Identify element ref from output (e.g., [ref=e5])

# 3. Interact by ref
node select-ref.js --ref e5 --action click

# 4. Verify result
node screenshot.js --output ./result.png
```

#### Session Persistence

```bash
# Scripts maintain browser session across executions
node navigate.js --url https://example.com/login
node fill.js --selector "#email" --value "user@example.com"
node click.js --selector "button[type=submit]"

# Close when done
node navigate.js --url about:blank --close true
```

#### Source

Location: `.claude/skills/chrome-devtools/`

---

### `media-processing`

**Triggers:** FFmpeg, ImageMagick, video, audio, RMBG

Multimedia processing with FFmpeg, ImageMagick, and AI background removal.

#### Capabilities

- **FFmpeg:** Video/audio encoding, format conversion, streaming (HLS/DASH), filtering
- **ImageMagick:** Image manipulation, batch processing, effects, composition
- **RMBG:** AI-powered background removal

#### Source

Location: `.claude/skills/media-processing/`

---

### `mobile-development`

**Triggers:** mobile, React Native, Flutter, iOS, Android

Cross-platform mobile app development.

#### Source

Location: `.claude/skills/mobile-development/`

---

## AI/ML Tools Skills

### `ai-multimodal`

**Triggers:** Gemini, audio, video, images, transcription, image generation

Process and generate multimedia using Google Gemini API.

#### Capabilities

| Type | Features | Limits |
|------|----------|--------|
| **Audio** | Transcription, speech understanding, music analysis | 9.5h, WAV/MP3/AAC |
| **Images** | Analysis, OCR, object detection, segmentation | 3.6k images, PNG/JPEG/WEBP |
| **Video** | Scene detection, Q&A, temporal analysis, YouTube URLs | 6h, MP4/MOV |
| **PDF** | Tables, forms, charts, multi-page extraction | 1k pages |
| **Image Gen** | Text-to-image with Imagen 4 | - |
| **Video Gen** | Text-to-video with Veo 3 (8s clips with audio) | - |

#### Quick Start

```bash
# Setup
export GEMINI_API_KEY="your-key"
pip install google-genai python-dotenv pillow

# Analyze media
python scripts/gemini_batch_process.py --files image.png --task analyze

# Generate image
python scripts/gemini_batch_process.py --task generate --prompt "description"

# Transcribe audio (split >15min into chunks for full transcript)
python scripts/gemini_batch_process.py --files audio.mp3 --task transcribe
```

#### Models

- **Analysis:** `gemini-2.5-flash` (recommended), `gemini-2.5-pro` (advanced)
- **Image Gen:** `imagen-4.0-generate-001`, `imagen-4.0-ultra-generate-001`
- **Video Gen:** `veo-3.1-generate-preview`

#### Source

Location: `.claude/skills/ai-multimodal/`

---

### `ai-artist`

**Triggers:** prompts, Midjourney, DALL-E, Stable Diffusion, Imagen, Flux

Write and optimize prompts for AI-generated content across text and image models.

#### Covered Topics

- Prompt structure and style keywords
- Negative prompts
- Chain-of-thought and few-shot examples
- Iterative refinement
- Domain-specific patterns (marketing, code, creative writing)

#### Source

Location: `.claude/skills/ai-artist/`

---

### `ai-dev-tools-sync`

**Triggers:** Claude Code, Copilot sync, AI dev tools

Synchronize Claude Code and GitHub Copilot configurations.

#### Source

Location: `.claude/skills/ai-dev-tools-sync/`

---

### `google-adk-python`

**Triggers:** Google ADK, agents, Python

Build AI agents with Google Agent Development Kit (Python).

#### Source

Location: `.claude/skills/google-adk-python/`

---

### `sequential-thinking`

**Triggers:** complex problems, multi-step reasoning

Structured problem-solving through reflective thinking with MCP tool.

#### Source

Location: `.claude/skills/sequential-thinking/`

---

## MCP Skills

### `mcp-builder`

**Triggers:** MCP server, tools, Model Context Protocol

Guide for creating high-quality MCP servers.

#### Development Phases

1. **Research & Planning:** Study API docs, understand agent-centric design
2. **Implementation:** Set up project structure, implement tools systematically
3. **Review & Refine:** Code quality review, test and build
4. **Evaluation:** Create 10 evaluation questions

#### Agent-Centric Design Principles

- Build for workflows, not just API endpoints
- Optimize for limited context (high-signal information)
- Design actionable error messages
- Follow natural task subdivisions

#### Language Support

| Language | Framework | Validation |
|----------|-----------|------------|
| Python | FastMCP / MCP SDK | Pydantic v2 |
| TypeScript | MCP SDK | Zod |

#### Source

Location: `.claude/skills/mcp-builder/`

---

### `mcp-management`

**Triggers:** MCP tools, discover, execute

Manage MCP server integrations - discover, analyze, and execute tools.

#### Source

Location: `.claude/skills/mcp-management/`

---

## Context/Memory Skills

### `memory-management`

**Triggers:** remember, save, persist, checkpoint, knowledge base

Build and maintain knowledge graph across sessions with dual memory system.

#### Two Memory Systems

| System | Storage | Use Case | Persistence |
|--------|---------|----------|-------------|
| **MCP Memory Graph** | In-memory graph DB | Patterns, decisions, learnings | Cross-session |
| **File Checkpoints** | `plans/reports/*.md` | Task progress, analysis | Permanent files |

#### MCP Memory Operations

```javascript
// Create entity
mcp__memory__create_entities([{
    name: 'EmployeeValidation',
    entityType: 'Pattern',
    observations: ['Uses PlatformValidationResult fluent API']
}]);

// Search
mcp__memory__search_nodes({ query: 'validation pattern' });

// Add observations
mcp__memory__add_observations([{
    entityName: 'EmployeeValidation',
    contents: ['Also supports .AndNot()']
}]);
```

#### Entity Types

| Type | Purpose |
|------|---------|
| `Pattern` | Recurring code patterns |
| `Decision` | Architectural/design decisions |
| `BugFix` | Bug solutions for reference |
| `ServiceBoundary` | Service ownership |
| `SessionSummary` | End-of-session snapshots |
| `AntiPattern` | Patterns to avoid |

#### Checkpoint Protocol

Create checkpoints every 30-60 minutes during long tasks:

```markdown
# Memory Checkpoint: {Task}
> Created: {timestamp}
> Phase: {phase}

## Key Findings
{discoveries with file paths}

## Progress
- [x] Completed
- [ ] Remaining

## Next Steps
1. {next action}
```

#### Source

Location: `.claude/skills/memory-management/`

---

### `context-optimization`

**Triggers:** context, tokens, compress, optimize

Manage context window efficiently for long sessions.

#### Four Context Strategies

| Strategy | Purpose | When to Use |
|----------|---------|-------------|
| **Writing** | Save critical findings | After discovering patterns/decisions |
| **Selecting** | Retrieve relevant context | Starting related tasks |
| **Compressing** | Summarize long trajectories | Every 10 operations |
| **Isolating** | Delegate to sub-agents | Broad exploration tasks |

#### Token-Efficient Patterns

```javascript
// Read specific sections, not entire files
Read({ file_path: 'large-file.cs', offset: 100, limit: 50 });

// Combined search patterns
Grep({ pattern: 'CreateAsync|UpdateAsync|DeleteAsync', output_mode: 'files_with_matches' });

// Parallel reads
[Read({ file_path: 'file1.cs' }), Read({ file_path: 'file2.cs' })];
```

#### Context Thresholds

- 50K tokens: Consider compression
- 100K tokens: Required compression
- 150K tokens: Critical - save and summarize

#### Source

Location: `.claude/skills/context-optimization/`

---

### `learn`

**Triggers:** remember this, always do, never do, learn pattern

Teach Claude new patterns, preferences, or conventions explicitly.

#### Source

Location: `.claude/skills/learn/`

---

## Skill Management

### `skill-creator`

**Triggers:** create skill, new skill

Guide for creating effective Claude Code skills.

#### Skill Structure

```
.claude/skills/{skill-name}/
├── SKILL.md              # Required (<100 lines)
├── scripts/              # Executable code
├── references/           # Documentation (<100 lines each)
└── assets/               # Templates, images, fonts
```

#### Requirements

- `SKILL.md` must be <100 lines
- Reference files must be <100 lines each (progressive disclosure)
- Scripts must have tests
- Scripts must respect `.env` file hierarchy

#### Progressive Disclosure

1. **Metadata** - Always in context (~100 words)
2. **SKILL.md body** - When skill triggers (<5k words)
3. **Bundled resources** - As needed (unlimited)

#### Creation Process

1. **Understand** with concrete examples
2. **Plan** reusable contents (scripts, references, assets)
3. **Initialize** with `init_skill.py`
4. **Edit** SKILL.md and resources
5. **Package** with `package_skill.py`
6. **Iterate** based on usage feedback

#### Source

Location: `.claude/skills/skill-creator/`

---

## Other Integration Skills

### `docs-seeker`

**Triggers:** find docs, library docs, context7

Search technical documentation using llms.txt sources.

#### Source

Location: `.claude/skills/docs-seeker/`

---

### `repomix`

**Triggers:** codebase export, context

Export codebase for AI context.

#### Source

Location: `.claude/skills/repomix/`

---

### `plans-kanban`

**Triggers:** kanban, task tracking

Kanban-style task management.

#### Source

Location: `.claude/skills/plans-kanban/`

---

## Related Documentation

- [README.md](./README.md) - Skills overview
- [development-skills.md](./development-skills.md) - Backend & frontend skills
- [README.md](./README.md) - Skills overview
- [../hooks/README.md](../hooks/README.md) - Hook system

---

*Source: `.claude/skills/` | Infrastructure, AI, context, and skill management*
