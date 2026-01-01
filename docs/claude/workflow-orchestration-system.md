# Claude Code Workflow Orchestration System

> How this project's `.claude/` setup automatically detects user intent and orchestrates multi-step development workflows.

## Executive Summary

This workspace implements a **multi-layer orchestration system** for Claude Code that:

1. **Automatically detects** user intent from natural language prompts
2. **Injects workflow instructions** into the LLM's context before it responds
3. **Guides the AI** through multi-step development workflows (plan → implement → test → review)

The system uses **hooks** (JavaScript scripts), **configuration files** (JSON), and **skills** (prompt templates) to achieve zero-touch workflow automation.

---

## Architecture Overview

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
│                                   │  "Following: /plan → /cook → /test"   ││
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

---

## Component Deep Dive

### 1. Hook Configuration (`.claude/settings.json`)

Claude Code's hook system allows JavaScript scripts to run at specific lifecycle events. The settings file defines which hooks run when:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/session-init.cjs"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/workflow-router.cjs"
          },
          {
            "type": "command",
            "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/dev-rules-reminder.cjs"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash|Glob|Grep|Read|Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/scout-block.cjs"
          },
          {
            "type": "command",
            "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/privacy-block.cjs"
          }
        ]
      }
    ]
  }
}
```

#### Hook Event Reference

| Event              | When It Fires                             | Purpose                                               |
| ------------------ | ----------------------------------------- | ----------------------------------------------------- |
| `SessionStart`     | Session begins, resumes, clears, compacts | Initialize environment variables, detect project type |
| `UserPromptSubmit` | Every user message submitted              | Detect intent, inject workflow instructions           |
| `PreToolUse`       | Before any tool execution                 | Block unauthorized operations, enforce policies       |
| `PreCompact`       | Before context window compaction          | Track context state for statusline                    |
| `SessionEnd`       | Session ends or clears                    | Cleanup, write markers                                |

---

### 2. Workflow Router (`workflow-router.cjs`)

This is the **core orchestration engine**. It intercepts every user prompt and determines which workflow to trigger.

#### Input: Claude Code passes JSON payload via stdin

```javascript
// Claude Code sends this to the hook's stdin:
{
  "prompt": "Add a dark mode toggle to the settings page",
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.md"
}
```

#### Step 1: Load Configuration

```javascript
function loadWorkflowConfig() {
  const configPaths = [
    path.join(process.cwd(), '.claude', 'workflows.json'),
    path.join(require('os').homedir(), '.claude', 'workflows.json')
  ];

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch (e) {
        console.error(`[workflow-router] Failed to parse ${configPath}: ${e.message}`);
      }
    }
  }

  // Fallback to default config if no file found
  return getDefaultConfig();
}
```

#### Step 2: Detect User Intent

```javascript
function detectIntent(userPrompt, config) {
  const { workflows, settings } = config;

  // Check for override prefix ("quick:" skips workflow detection)
  if (settings.allowOverride && settings.overridePrefix) {
    const lowerPrompt = userPrompt.toLowerCase().trim();
    if (lowerPrompt.startsWith(settings.overridePrefix.toLowerCase())) {
      return { skipped: true, reason: 'override_prefix' };
    }
  }

  // Check for explicit command invocation (e.g., "/plan" bypasses detection)
  if (/^\/\w+/.test(userPrompt.trim())) {
    return { skipped: true, reason: 'explicit_command' };
  }

  // Score each workflow by pattern matching
  const scores = [];

  for (const [workflowId, workflow] of Object.entries(workflows)) {
    let score = 0;
    let matchedPatterns = [];
    let excludeMatched = false;

    // Check exclude patterns first (e.g., "fix" excludes "feature" workflow)
    if (workflow.excludePatterns && workflow.excludePatterns.length > 0) {
      for (const pattern of workflow.excludePatterns) {
        try {
          if (new RegExp(pattern, 'i').test(userPrompt)) {
            excludeMatched = true;
            break;
          }
        } catch (e) {
          // Invalid regex, skip
        }
      }
    }

    if (excludeMatched) continue;

    // Check trigger patterns
    if (workflow.triggerPatterns && workflow.triggerPatterns.length > 0) {
      for (const pattern of workflow.triggerPatterns) {
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(userPrompt)) {
            score += 10;  // Each pattern match adds 10 points
            matchedPatterns.push(pattern);
          }
        } catch (e) {
          // Invalid regex, skip
        }
      }
    }

    if (score > 0) {
      scores.push({
        workflowId,
        workflow,
        score,
        matchedPatterns,
        // Lower priority number = higher preference
        adjustedScore: score - (workflow.priority || 50)
      });
    }
  }

  if (scores.length === 0) {
    return { detected: false };
  }

  // Sort by adjusted score (highest first)
  scores.sort((a, b) => b.adjustedScore - a.adjustedScore);

  const best = scores[0];
  const confidence = Math.min(100, best.score * 10);

  return {
    detected: true,
    workflowId: best.workflowId,
    workflow: best.workflow,
    confidence,
    matchedPatterns: best.matchedPatterns,
    alternatives: scores.slice(1, 3).map(s => s.workflowId)
  };
}
```

#### Step 3: Generate Instructions for LLM

```javascript
function buildWorkflowInstructions(detection, config) {
  const { workflow, workflowId, confidence, alternatives } = detection;
  const { settings, commandMapping } = config;

  const lines = [];

  lines.push('');
  lines.push('## Workflow Detected');
  lines.push('');
  lines.push(`**Intent:** ${workflow.name} (${confidence}% confidence)`);

  // Build workflow sequence display
  const sequenceDisplay = workflow.sequence.map(step => {
    const cmd = commandMapping[step];
    return cmd?.claude || `/${step}`;
  }).join(' → ');

  lines.push(`**Workflow:** ${sequenceDisplay}`);
  lines.push('');

  // For high-impact workflows, require confirmation
  if (workflow.confirmFirst && settings.confirmHighImpact) {
    lines.push('### Instructions (MUST FOLLOW)');
    lines.push('');
    lines.push('1. **FIRST:** Announce the detected workflow to the user:');
    lines.push(`   > "Detected: **${workflow.name}** workflow. I will follow: ${sequenceDisplay}"`);
    lines.push('');
    lines.push('2. **ASK:** "Proceed with this workflow? (yes/no/quick)"');
    lines.push('   - "yes" → Execute full workflow');
    lines.push('   - "no" → Ask what they want instead');
    lines.push('   - "quick" → Skip workflow, handle directly');
    lines.push('');
    lines.push('3. **THEN:** Execute each step in sequence, using the appropriate slash command');
  } else {
    lines.push('### Instructions (MUST FOLLOW)');
    lines.push('');
    lines.push('1. **ANNOUNCE:** Tell the user:');
    lines.push(`   > "Detected: **${workflow.name}** workflow. Following: ${sequenceDisplay}"`);
    lines.push('');
    lines.push('2. **EXECUTE:** Follow the workflow sequence, using each slash command in order');
  }

  return lines.join('\n');
}
```

#### Step 4: Output to stdout (Injected into LLM Context)

```javascript
async function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);
    const userPrompt = payload.prompt || '';

    if (!userPrompt.trim()) process.exit(0);

    const config = loadWorkflowConfig();

    if (!config.settings?.enabled) process.exit(0);

    const detection = detectIntent(userPrompt, config);

    if (detection.skipped || !detection.detected) {
      process.exit(0);
    }

    // This output is appended to the LLM's context as a <system-reminder>
    const instructions = buildWorkflowInstructions(detection, config);
    console.log(instructions);

    process.exit(0);  // Exit 0 = non-blocking success
  } catch (error) {
    console.error(`<!-- Workflow router error: ${error.message} -->`);
    process.exit(0);  // Always exit 0 to not block Claude
  }
}

main();
```

---

### 3. Workflow Configuration (`workflows.json`)

Defines all workflow types, their trigger patterns, and step sequences:

```json
{
  "$schema": "./workflows.schema.json",
  "version": "1.1.0",
  "description": "Workflow automation configuration for Claude Code",

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
      "description": "Full feature development with planning, implementation, testing, documentation",
      "triggerPatterns": [
        "\\b(implement|add|create|build|develop|make)\\b.*\\b(feature|functionality|capability|module|component)\\b",
        "\\bnew\\s+(feature|functionality|capability)\\b",
        "\\b(implement|add|create|build)\\s+(?!test|doc|comment)"
      ],
      "excludePatterns": [
        "\\b(fix|bug|error|broken|issue)\\b",
        "\\b(doc|document|readme)\\b"
      ],
      "sequence": ["plan", "cook","dual-pass-review", "code-review",  "test", "docs-update", "watzup"],
      "confirmFirst": true,
      "priority": 10
    },

    "bugfix": {
      "name": "Bug Fix",
      "description": "Systematic debugging and fix workflow",
      "triggerPatterns": [
        "\\b(bug|fix|broken|issue|crash|fail|exception)\\b",
        "\\b(error|errors)\\s+(in|with|on|when|while|returned|returning)\\b",
        "\\bnot\\s+working\\b",
        "\\bdoesn'?t\\s+work\\b"
      ],
      "excludePatterns": [
        "\\b(implement|add|create|build)\\s+new\\b",
        "\\bfeature\\b"
      ],
      "sequence": ["debug", "plan", "fix", "dual-pass-review", "code-review","test"],
      "confirmFirst": false,
      "priority": 20
    },

    "refactor": {
      "name": "Code Refactoring",
      "description": "Code improvement and restructuring workflow",
      "triggerPatterns": [
        "\\b(refactor|restructure|reorganize|clean\\s*up)\\b",
        "\\bimprove\\s+(the|this)?\\s*\\w*\\s*(code|handling|logic|structure|performance)\\b"
      ],
      "excludePatterns": [
        "\\b(bug|broken|crash|fail)\\b"
      ],
      "sequence": ["plan", "code","dual-pass-review", "code-review", "test"],
      "confirmFirst": true,
      "priority": 25
    },

    "investigation": {
      "name": "Code Investigation",
      "description": "Codebase exploration and understanding workflow",
      "triggerPatterns": [
        "\\bhow\\s+(does|do|is|are)\\b.*\\b(work|function|implemented|handle)\\b",
        "\\bwhere\\s+(is|are|does)\\b.*\\b(code|logic|function|class|handler|handled)\\b",
        "\\bexplain\\s+(the|how|this)\\b.*\\b(code|logic|pattern|implementation)\\b"
      ],
      "excludePatterns": [
        "\\b(implement|fix|create|add)\\b"
      ],
      "sequence": ["scout", "investigate"],
      "confirmFirst": false,
      "priority": 50
    }
  },

  "commandMapping": {
    "plan": { "claude": "/plan" },
    "cook": { "claude": "/cook" },
    "code": { "claude": "/code" },
    "test": { "claude": "/test" },
    "fix": { "claude": "/fix" },
    "debug": { "claude": "/debug" },
    "code-review": { "claude": "/review/codebase" },
    "dual-pass-review": { "claude": "/dual-pass-review", "description": "Mandatory dual-pass review" },
    "docs-update": { "claude": "/docs/update" },
    "watzup": { "claude": "/watzup" },
    "scout": { "claude": "/scout" },
    "investigate": { "claude": "/investigate" }
  }
}
```

#### Priority System

Lower priority number = higher preference when multiple workflows match:

| Workflow      | Priority | Use Case                               |
| ------------- | -------- | -------------------------------------- |
| Feature       | 10       | New functionality (highest priority)   |
| Bugfix        | 20       | Error fixes                            |
| Refactor      | 25       | Code improvement                       |
| Documentation | 30       | Doc updates                            |
| Review        | 35       | Code review                            |
| Testing       | 40       | Test creation                          |
| Investigation | 50       | Codebase exploration (lowest priority) |

---

### 4. Session Initialization (`session-init.cjs`)

Runs once per session to set up environment variables and detect project context:

```javascript
async function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    const data = stdin ? JSON.parse(stdin) : {};
    const envFile = process.env.CLAUDE_ENV_FILE;
    const source = data.source || 'unknown';  // 'startup', 'resume', 'clear', 'compact'
    const sessionId = data.session_id || null;

    const config = loadConfig();

    // Detect project characteristics
    const detections = {
      type: detectProjectType(config.project?.type),      // 'monorepo', 'library', 'single-repo'
      pm: detectPackageManager(config.project?.packageManager), // 'npm', 'pnpm', 'yarn', 'bun'
      framework: detectFramework(config.project?.framework)     // 'next', 'react', 'vue', etc.
    };

    // Write environment variables for other hooks to use
    if (envFile) {
      writeEnv(envFile, 'CK_SESSION_ID', sessionId || '');
      writeEnv(envFile, 'CK_PROJECT_TYPE', detections.type || '');
      writeEnv(envFile, 'CK_PACKAGE_MANAGER', detections.pm || '');
      writeEnv(envFile, 'CK_FRAMEWORK', detections.framework || '');
      writeEnv(envFile, 'CK_GIT_BRANCH', getGitBranch() || '');
      writeEnv(envFile, 'CK_PLANS_PATH', config.paths.plans);
      writeEnv(envFile, 'CK_DOCS_PATH', config.paths.docs);
    }

    // Output context summary (injected into LLM context)
    console.log(`Session ${source}. Project: ${detections.type} | PM: ${detections.pm}`);

    // Inject user assertions if configured
    if (config.assertions?.length > 0) {
      console.log(`\nUser Assertions:`);
      config.assertions.forEach((assertion, i) => {
        console.log(`  ${i + 1}. ${assertion}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error(`SessionStart hook error: ${error.message}`);
    process.exit(0);
  }
}
```

---

### 5. Development Rules Reminder (`dev-rules-reminder.cjs`)

Injects session context, paths, and naming patterns into every prompt:

```javascript
function buildReminder(params) {
  const {
    devRulesPath,
    reportsPath,
    plansPath,
    docsPath,
    planLine,
    gitBranch,
    namePattern,
    validationMode,
    validationMin,
    validationMax
  } = params;

  return [
    `## Session`,
    `- DateTime: ${new Date().toLocaleString()}`,
    `- CWD: ${process.cwd()}`,
    ``,
    `## Rules`,
    ...(devRulesPath ? [`- Read and follow development rules: "${devRulesPath}"`] : []),
    `- Markdown files are organized in: Plans → "plans/" directory, Docs → "docs/" directory`,
    `- Follow **YAGNI - KISS - DRY** principles`,
    ``,
    `## **[IMPORTANT] Consider Modularization:**`,
    `- Check existing modules before creating new`,
    `- Use kebab-case naming with descriptive names`,
    `- Write descriptive code comments`,
    ``,
    `## Paths`,
    `Reports: ${reportsPath} | Plans: ${plansPath}/ | Docs: ${docsPath}/`,
    ``,
    `## Plan Context`,
    planLine,
    `- Reports: ${reportsPath}`,
    ...(gitBranch ? [`- Branch: ${gitBranch}`] : []),
    `- Validation: mode=${validationMode}, questions=${validationMin}-${validationMax}`,
    ``,
    `## Naming`,
    `- Report: \`${reportsPath}{type}-${namePattern}.md\``,
    `- Plan dir: \`${plansPath}/${namePattern}/\``,
    `- Replace \`{type}\` with: agent name, report type, or context`,
    `- Replace \`{slug}\` with: descriptive-kebab-slug`
  ];
}
```

---

## Complete Execution Flow Example

### User Types: "Add a dark mode toggle to the settings page"

#### Phase 1: Hook Execution (Before LLM Sees Prompt)

```
┌────────────────────────────────────────────────────────────────────┐
│ CLAUDE CODE RUNTIME                                                │
│                                                                    │
│  1. User submits prompt via CLI                                    │
│                                                                    │
│  2. UserPromptSubmit event fires                                   │
│                                                                    │
│  3. workflow-router.cjs executes:                                  │
│     Input:  {"prompt": "Add a dark mode toggle to the settings..."}│
│     Logic:                                                         │
│       - Pattern "add" matches feature.triggerPatterns ✓            │
│       - Pattern "feature" NOT in prompt, but "add" alone matches   │
│       - No exclude patterns matched ("fix", "bug" not present)     │
│       - Score: 10 points for "feature" workflow                    │
│       - Confidence: 100%                                           │
│     Output: Workflow instructions printed to stdout                │
│                                                                    │
│  4. dev-rules-reminder.cjs executes:                               │
│     Output: Session context, paths, naming patterns to stdout      │
└────────────────────────────────────────────────────────────────────┘
```

#### Phase 2: LLM Receives Combined Context

Claude sees this in its context window:

```
[User Message]
Add a dark mode toggle to the settings page

[System Reminder - from workflow-router.cjs]
## Workflow Detected

**Intent:** Feature Implementation (100% confidence)
**Workflow:** /plan → /cook → /test → /code-review → /docs-update → /watzup

### Instructions (MUST FOLLOW)

1. **FIRST:** Announce the detected workflow to the user:
   > "Detected: **Feature Implementation** workflow. I will follow: /plan → /cook → /test → /code-review → /docs-update → /watzup"

2. **ASK:** "Proceed with this workflow? (yes/no/quick)"
   - "yes" → Execute full workflow
   - "no" → Ask what they want instead
   - "quick" → Skip workflow, handle directly

3. **THEN:** Execute each step in sequence, using the appropriate slash command

[System Reminder - from dev-rules-reminder.cjs]
## Session
- DateTime: 12/31/2025, 11:28:03 AM
- CWD: C:\GitSources\EasyPlatform

## Plan Context
- Plan: none
- Reports: plans/reports/
- Branch: feature/new-feature
- Validation: mode=prompt, questions=3-8

## Naming
- Report: `plans/reports/{type}-251231-1128-{slug}.md`
- Plan dir: `plans/251231-1128-{slug}/`
```

#### Phase 3: LLM Inference (Claude Follows Instructions)

Claude generates this response:

```
> Detected: **Feature Implementation** workflow.
> I will follow: /plan → /cook → /test → /code-review → /docs-update → /watzup

Proceed with this workflow? (yes/no/quick)
```

#### Phase 4: User Confirms → Sequential Skill Execution

User says "yes", then Claude executes each step:

```
Step 1: Claude calls Skill tool with skill="plan"
  → Skill loads plan.md template
  → Claude creates implementation plan
  → Writes to plans/251231-1128-dark-mode/README.md

Step 2: Claude calls Skill tool with skill="cook"
  → Skill loads cook.md template
  → Claude implements the feature
  → Creates src/components/DarkModeToggle.tsx

Step 3: Claude calls Skill tool with skill="test"
  → Skill loads test.md template
  → Claude runs tests
  → Verifies all tests pass

Step 4: Claude calls Skill tool with skill="dual-pass-review"
  → First Pass: Reviews unstaged changes for correctness + convention compliance
  → If first pass made corrections: Execute Second Pass
  → Second Pass: Full re-review of current unstaged changes
  → Generates review summary with approval status

Step 5: Claude calls Skill tool with skill="docs-update"
  → Updates documentation

Step 6: Claude calls Skill tool with skill="watzup"
  → Generates summary of changes
```

---

## How the LLM "Follows" Workflows

The LLM doesn't have built-in workflow logic. Instead, it follows instructions because they're injected as system context:

| Layer         | Mechanism                | What Happens                                  |
| ------------- | ------------------------ | --------------------------------------------- |
| **Hook**      | JavaScript script        | Runs BEFORE LLM, analyzes prompt              |
| **Injection** | stdout → system-reminder | Instructions appended to LLM's context        |
| **Inference** | LLM reads "MUST FOLLOW"  | LLM treats injected text as authoritative     |
| **Tools**     | Skill/Bash/Read/Edit     | LLM calls tools to execute each workflow step |

**Key Insight:** Instructions with phrases like "MUST FOLLOW", "Instructions", and numbered steps influence LLM behavior because they appear as system-level guidance that the model is trained to respect.

---

## Workflow Detection Matrix

| User Prompt                 | Matched Patterns | Excluded By            | Result                 |
| --------------------------- | ---------------- | ---------------------- | ---------------------- |
| "Add dark mode feature"     | `add.*feature`   | -                      | Feature workflow       |
| "Fix the login bug"         | `fix`, `bug`     | -                      | Bugfix workflow        |
| "Add a fix for the crash"   | `add`, `fix`     | `fix` excludes feature | Bugfix wins            |
| "/plan dark mode"           | -                | `^\/\w+` (explicit)    | Skip detection         |
| "quick: add button"         | -                | `quick:` prefix        | Skip detection         |
| "How does auth work?"       | `how does.*work` | -                      | Investigation          |
| "Refactor the user service" | `refactor`       | -                      | Refactor workflow      |
| "Update the README"         | `readme`         | -                      | Documentation workflow |

---

## Override Mechanisms

### 1. Quick Prefix

Prefix any message with `quick:` to skip workflow detection:

```
quick: add a simple button to the header
```

Result: Direct handling, no workflow orchestration.

### 2. Explicit Commands

Start with a slash command to bypass detection:

```
/plan implement dark mode
```

Result: Directly executes `/plan` skill without workflow detection.

### 3. Say "quick" After Detection

When prompted "Proceed with this workflow?":

```
quick
```

Result: Skips the full workflow, handles request directly.

---

## Configuration File Reference

### `.claude/settings.json` - Hook Registration

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "hooks": [
        { "type": "command", "command": "node .claude/hooks/workflow-router.cjs" },
        { "type": "command", "command": "node .claude/hooks/dev-rules-reminder.cjs" }
      ]
    }]
  }
}
```

### `.claude/workflows.json` - Workflow Definitions

```json
{
  "settings": {
    "enabled": true,
    "confirmHighImpact": true,
    "overridePrefix": "quick:"
  },
  "workflows": {
    "feature": {
      "triggerPatterns": ["..."],
      "excludePatterns": ["..."],
      "sequence": ["plan", "cook","dual-pass-review", "code-review", "test"],
      "priority": 10
    }
  }
}
```

### `.claude/commands/*.md` - Skill Templates

Each workflow step maps to a skill template that guides Claude's behavior for that step.

---

## Troubleshooting

### Workflow Not Detected

1. Check if patterns in `workflows.json` match your prompt
2. Verify `settings.enabled` is `true`
3. Check if an exclude pattern is blocking detection
4. Try explicit command: `/plan your task`

### Wrong Workflow Detected

1. Review pattern priorities (lower number = higher priority)
2. Add exclude patterns to prevent false matches
3. Use `quick:` prefix to bypass detection

### Hook Errors

1. Check hook script syntax: `node .claude/hooks/workflow-router.cjs`
2. Verify `%CLAUDE_PROJECT_DIR%` resolves correctly
3. Hooks always exit 0 to prevent blocking Claude

---

## Dual-Pass Review System

The dual-pass review is a **mandatory quality gate** that runs after any code changes to ensure correctness and convention compliance.

### How It Works

```text
┌─────────────────────────────────────────────────────────────────┐
│                    DUAL-PASS REVIEW FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Code Changes Made (cook/fix/code)                              │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ FIRST PASS: Review Unstaged Changes                     │    │
│  │  - Task correctness                                     │    │
│  │  - Convention compliance (CLAUDE.md patterns)           │    │
│  │  - Development rules (YAGNI, KISS, DRY)                 │    │
│  │  - Code quality                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│           │                                                     │
│           ▼                                                     │
│     Issues Found?                                               │
│        │      │                                                 │
│        No     Yes                                               │
│        │      │                                                 │
│        │      ▼                                                 │
│        │  Fix Issues → Changes Made                             │
│        │      │                                                 │
│        │      ▼                                                 │
│        │  ┌─────────────────────────────────────────────────┐   │
│        │  │ SECOND PASS: Full Re-review                     │   │
│        │  │  - All dimensions checked again                 │   │
│        │  │  - Verify fixes correct                         │   │
│        │  │  - No regressions introduced                    │   │
│        │  └─────────────────────────────────────────────────┘   │
│        │      │                                                 │
│        ▼      ▼                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Generate Review Summary                                  │    │
│  │  - APPROVED / NEEDS ATTENTION                           │    │
│  │  - Passes executed: 1 or 2                              │    │
│  │  - Ready for commit: Yes/No                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Review Dimensions

| Dimension             | What It Checks                                              |
| --------------------- | ----------------------------------------------------------- |
| Task Correctness      | Changes address original requirement, no missing pieces     |
| Convention Compliance | Clean Architecture, CQRS patterns, BEM naming, base classes |
| Development Rules     | YAGNI, KISS, DRY, logic in lowest layer                     |
| Code Quality          | Syntax errors, naming, SRP, error handling, security        |

### Workflows Using Dual-Pass Review

| Workflow | Sequence                                                         |
| -------- | ---------------------------------------------------------------- |
| Feature  | plan → cook → test → **dual-pass-review** → docs-update → watzup |
| Bug Fix  | debug → plan → fix → test → **dual-pass-review**                 |
| Refactor | plan → code → test → **dual-pass-review**                        |

### Key Principle

**Second pass is CONDITIONAL** - Only executes if first pass made corrections. This prevents unnecessary overhead when code is already clean.

---

## Best Practices

1. **Define Clear Patterns**: Use specific regex patterns that minimize false positives
2. **Use Exclude Patterns**: Prevent workflow conflicts by excluding competing keywords
3. **Set Appropriate Priorities**: Ensure most specific workflows have lower priority numbers
4. **Require Confirmation for High-Impact**: Set `confirmFirst: true` for feature/refactor workflows
5. **Keep Sequences Focused**: Fewer steps = faster execution, more steps = thorough coverage
6. **Dual-Pass Review**: Always included after code changes to catch issues before commit

---

## Summary

The Claude Code workflow orchestration system in this project achieves **declarative workflow automation**:

1. **Define once**: Patterns and sequences in `workflows.json`
2. **Run automatically**: Hooks intercept prompts and inject instructions
3. **AI follows**: Claude reads injected instructions and executes workflows
4. **Override easily**: `quick:` prefix or explicit commands bypass automation

This architecture separates **intent detection** (JavaScript hooks) from **execution** (LLM + skills), creating a maintainable and extensible workflow system.
