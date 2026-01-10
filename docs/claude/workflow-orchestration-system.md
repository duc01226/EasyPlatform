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
    "Notification": [{ "hooks": [{ "type": "command", "command": "node .claude/hooks/notify-waiting.js" }] }],
    "SessionStart": [
      { "matcher": "startup|resume|clear|compact", "hooks": [{ "type": "command", "command": "node .claude/hooks/session-init.cjs" }] },
      { "matcher": "startup|resume|compact", "hooks": [{ "type": "command", "command": "node .claude/hooks/session-resume.cjs" }] }
    ],
    "SubagentStart": [{ "matcher": "*", "hooks": [{ "type": "command", "command": "node .claude/hooks/subagent-init.cjs" }] }],
    "UserPromptSubmit": [{ "hooks": [
      { "type": "command", "command": "node .claude/hooks/workflow-router.cjs" },
      { "type": "command", "command": "node .claude/hooks/dev-rules-reminder.cjs" }
    ]}],
    "PreToolUse": [
      { "matcher": "Skill", "hooks": [{ "type": "command", "command": "node .claude/hooks/todo-enforcement.cjs" }] },
      { "matcher": "Bash|Glob|Grep|Read|Edit|Write", "hooks": [
        { "type": "command", "command": "node .claude/hooks/scout-block.cjs" },
        { "type": "command", "command": "node .claude/hooks/privacy-block.cjs" }
      ]},
      { "matcher": "Edit|Write|MultiEdit", "hooks": [
        { "type": "command", "command": "node .claude/hooks/design-system-context.cjs" },
        { "type": "command", "command": "node .claude/hooks/backend-csharp-context.cjs" },
        { "type": "command", "command": "node .claude/hooks/frontend-typescript-context.cjs" },
        { "type": "command", "command": "node .claude/hooks/scss-styling-context.cjs" }
      ]}
    ],
    "PreCompact": [{ "matcher": "manual|auto", "hooks": [
      { "type": "command", "command": "node .claude/hooks/write-compact-marker.cjs" },
      { "type": "command", "command": "node .claude/hooks/save-context-memory.cjs" }
    ]}],
    "PostToolUse": [
      { "matcher": "TodoWrite", "hooks": [{ "type": "command", "command": "node .claude/hooks/todo-tracker.cjs" }] },
      { "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "node .claude/hooks/post-edit-prettier.cjs" }] },
      { "matcher": "Skill", "hooks": [{ "type": "command", "command": "node .claude/hooks/workflow-step-tracker.cjs" }] }
    ],
    "SessionEnd": [{ "matcher": "clear", "hooks": [{ "type": "command", "command": "node .claude/hooks/session-end.cjs" }] }]
  }
}
```

#### Hook Event Reference

| Event | When It Fires | Hooks | Purpose |
|-------|---------------|-------|---------|
| `Notification` | Claude needs user attention | `notify-waiting.js` | Desktop/sound notification |
| `SessionStart` | Session startup/resume/clear/compact | `session-init.cjs`, `session-resume.cjs` | Init env, restore todos from checkpoint |
| `SubagentStart` | When subagent spawns | `subagent-init.cjs` | Inject context to subagents |
| `UserPromptSubmit` | Every user message | `workflow-router.cjs`, `dev-rules-reminder.cjs` | Intent detection, context injection |
| `PreToolUse` | Before tool execution | `todo-enforcement.cjs`, `scout-block.cjs`, `privacy-block.cjs`, `*-context.cjs` | Policy enforcement, context injection |
| `PreCompact` | Before context compaction | `write-compact-marker.cjs`, `save-context-memory.cjs` | State persistence, checkpoint creation |
| `PostToolUse` | After tool execution | `todo-tracker.cjs`, `post-edit-prettier.cjs`, `workflow-step-tracker.cjs` | State tracking, formatting |
| `SessionEnd` | Session clear | `session-end.cjs` | Cleanup state files |

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
    lines.push('2. **CREATE TODO LIST (MANDATORY):** Use TodoWrite to create a task for each step');
    lines.push('');
    lines.push('3. **ASK:** "Proceed with this workflow? (yes/no/quick)"');
    lines.push('   - "yes" → Execute full workflow');
    lines.push('   - "no" → Ask what they want instead');
    lines.push('   - "quick" → Skip workflow, handle directly');
    lines.push('');
    lines.push('4. **EXECUTE:** Execute each step, marking todos as completed after each');
  } else {
    lines.push('### Instructions (MUST FOLLOW)');
    lines.push('');
    lines.push('1. **ANNOUNCE:** Tell the user:');
    lines.push(`   > "Detected: **${workflow.name}** workflow. Following: ${sequenceDisplay}"`);
    lines.push('');
    lines.push('2. **CREATE TODO LIST (MANDATORY):** Use TodoWrite to create a task for each step');
    lines.push('');
    lines.push('3. **EXECUTE:** Follow the workflow sequence, marking todos as completed after each step');
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
      "sequence": ["plan", "cook", "code-review", "test", "docs-update", "watzup"],
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
      "sequence": ["debug", "plan", "fix", "code-review", "test"],
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
      "sequence": ["plan", "code", "code-review", "test"],
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

2. **CREATE TODO LIST (MANDATORY):** Use TodoWrite to create a task for each step

3. **ASK:** "Proceed with this workflow? (yes/no/quick)"
   - "yes" → Execute full workflow
   - "no" → Ask what they want instead
   - "quick" → Skip workflow, handle directly

4. **EXECUTE:** Execute each step, marking todos as completed after each

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

Claude generates this response and creates todo list:

```
> Detected: **Feature Implementation** workflow.
> I will follow: /plan → /cook → /test → /code-review → /docs-update → /watzup

[Creates todo list via TodoWrite:]
- [ ] Execute /plan - Create implementation plan
- [ ] Execute /cook - Implement feature
- [ ] Execute /test - Run tests
- [ ] Execute /code-review - Review changes
- [ ] Execute /docs-update - Update documentation
- [ ] Execute /watzup - Summarize changes

Proceed with this workflow? (yes/no/quick)
```

#### Phase 4: User Confirms → Sequential Skill Execution with Todo Tracking

User says "yes", then Claude executes each step with todo tracking:

```
Step 1: Claude calls Skill tool with skill="plan"
  → Skill loads plan.md template
  → Claude creates implementation plan
  → Writes to plans/251231-1128-dark-mode/README.md
  → Marks "/plan" todo as completed ✓

Step 2: Claude calls Skill tool with skill="cook"
  → Skill loads cook.md template
  → Claude implements the feature
  → Creates src/components/DarkModeToggle.tsx
  → Marks "/cook" todo as completed ✓

Step 3: Claude calls Skill tool with skill="code-review"
  → Reviews changes for correctness + convention compliance
  → Generates review summary
  → Marks "/code-review" todo as completed ✓

Step 4: Claude calls Skill tool with skill="test"
  → Skill loads test.md template
  → Claude runs tests
  → Verifies all tests pass
  → Marks "/test" todo as completed ✓

Step 5: Claude calls Skill tool with skill="docs-update"
  → Updates documentation
  → Marks "/docs-update" todo as completed ✓

Step 6: Claude calls Skill tool with skill="watzup"
  → Generates summary of changes
  → Marks "/watzup" todo as completed ✓
```

---

## How the LLM "Follows" Workflows

The LLM doesn't have built-in workflow logic. Instead, it follows instructions because they're injected as system context:

| Layer         | Mechanism                | What Happens                                  |
| ------------- | ------------------------ | --------------------------------------------- |
| **Hook**      | JavaScript script        | Runs BEFORE LLM, analyzes prompt              |
| **Injection** | stdout → system-reminder | Instructions appended to LLM's context        |
| **Todo**      | TodoWrite tool           | Creates task list for each workflow step      |
| **Inference** | LLM reads "MUST FOLLOW"  | LLM treats injected text as authoritative     |
| **Tracking**  | TodoWrite updates        | Marks tasks completed after each step         |
| **Tools**     | Skill/Bash/Read/Edit     | LLM calls tools to execute each workflow step |

**Key Insight:** Instructions with phrases like "MUST FOLLOW", "Instructions", and numbered steps influence LLM behavior because they appear as system-level guidance that the model is trained to respect. The **mandatory todo list** reinforces this by creating visible progress tracking.

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
      "sequence": ["plan", "cook", "code-review", "test", "docs-update", "watzup"],
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

## Best Practices

1. **Define Clear Patterns**: Use specific regex patterns that minimize false positives
2. **Use Exclude Patterns**: Prevent workflow conflicts by excluding competing keywords
3. **Set Appropriate Priorities**: Ensure most specific workflows have lower priority numbers
4. **Require Confirmation for High-Impact**: Set `confirmFirst: true` for feature/refactor workflows
5. **Keep Sequences Focused**: Fewer steps = faster execution, more steps = thorough coverage
6. **Code Review**: Include `/code-review` step after code changes to catch issues before commit

---

## Workflow State Persistence

For long-running workflows, the system now includes **state persistence** to prevent context loss.

### How State Persistence Works

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW STATE PERSISTENCE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐                                                    │
│  │ Workflow Detected│──▶ Creates .claude/.workflow-state.json          │
│  └─────────────────┘                                                    │
│           │                                                             │
│           ▼                                                             │
│  ┌─────────────────┐                                                    │
│  │ Each User Prompt │──▶ Checks for active workflow                     │
│  └─────────────────┘    ├─▶ Injects continuation reminder               │
│           │             └─▶ Shows progress: "Step 2/7"                  │
│           ▼                                                             │
│  ┌─────────────────┐                                                    │
│  │ Skill Completes  │──▶ Updates state, advances to next step          │
│  └─────────────────┘                                                    │
│           │                                                             │
│           ▼                                                             │
│  ┌─────────────────┐                                                    │
│  │ Workflow Complete│──▶ Clears state file                             │
│  └─────────────────┘                                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### State File Schema

```json
{
  "workflowId": "bugfix",
  "workflowName": "Bug Fix",
  "sequence": ["debug", "plan", "fix", "test"],
  "currentStep": 0,
  "completedSteps": [],
  "startTime": "2026-01-07T15:23:34.000Z",
  "originalPrompt": "fix the login bug",
  "ttlHours": 24
}
```

### Workflow Control Commands

During an active workflow, users can control progress:

| Command | Effect |
|---------|--------|
| `skip` | Skip current step, advance to next |
| `abort` | Cancel entire workflow |
| `quick:` prefix | Cancel workflow, execute prompt directly |

### Components

| Component | File | Purpose |
|-----------|------|---------|
| State Library | `.claude/hooks/lib/workflow-state.cjs` | CRUD for workflow state |
| Workflow Router | `.claude/hooks/workflow-router.cjs` | Detects workflows, injects reminders |
| Dev Rules Reminder | `.claude/hooks/dev-rules-reminder.cjs` | Shows progress in every prompt |
| Step Tracker | `.claude/hooks/workflow-step-tracker.cjs` | Advances state on skill completion |

### Benefits

1. **Never forgets**: AI always knows current step and remaining work
2. **Progress visibility**: User sees step X/Y on every interaction
3. **Control**: User can skip/abort at any time
4. **Auto-cleanup**: State expires after 24h or on session clear

---

## Todo Enforcement System

The workspace enforces todo list creation before implementation work via runtime hooks.

### Enforcement Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   TODO ENFORCEMENT FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│  User calls Skill tool (e.g., /cook, /fix)                       │
│           │                                                      │
│           ▼                                                      │
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

### Allowed Skills (No Todos Required)

| Category | Skills |
|----------|--------|
| Research | `/scout`, `/scout:ext`, `/investigate`, `/research`, `/explore`, `/docs-seeker` |
| Planning | `/plan`, `/plan:fast`, `/plan:hard`, `/plan:validate`, `/planner` |
| Status | `/watzup`, `/checkpoint`, `/kanban`, `/context-compact` |
| Read-only | `/git-diff`, `/git-status`, `/git-log`, `/branch-comparison` |

### Blocked Skills (Todos Required)

| Category | Skills |
|----------|--------|
| Implementation | `/cook`, `/fix`, `/code`, `/feature`, `/implement`, `/refactor` |
| Testing | `/test`, `/tester`, `/debug`, `/build` |
| Review | `/code-review` |
| Git | `/commit`, `/git-commit`, `/git-manager` |
| Docs | `/docs-update` |

### Bypass Mechanism

Use `quick:` prefix to bypass enforcement:

```
/cook quick: add a simple button
```

### State Tracking

Todo state persisted in `.claude/.todo-state.json`:

```json
{
  "hasTodos": true,
  "taskCount": 5,
  "pendingCount": 3,
  "completedCount": 1,
  "inProgressCount": 1,
  "lastTodos": [{ "content": "...", "status": "pending" }],
  "lastUpdated": "2026-01-10T09:30:00Z"
}
```

### Enforcement Components

| File | Event | Purpose |
|------|-------|---------|
| `todo-enforcement.cjs` | PreToolUse (Skill) | Block implementation without todos |
| `todo-tracker.cjs` | PostToolUse (TodoWrite) | Update state on todo changes |
| `lib/todo-state.cjs` | - | Shared state management library |

---

## Context Preservation System

Automatic checkpoint/restore system prevents loss of todos and progress during context compaction.

### Checkpoint/Restore Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                CONTEXT PRESERVATION FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│  SAVE (PreCompact)                    RESTORE (SessionStart)     │
│  ─────────────────                    ─────────────────────      │
│  Context compaction triggered          Session startup/resume     │
│           │                                    │                  │
│           ▼                                    ▼                  │
│  save-context-memory.cjs              session-resume.cjs          │
│           │                                    │                  │
│           ▼                                    ▼                  │
│  1. Export todos from state           1. Find latest checkpoint   │
│  2. Capture context window stats      2. Check age (<24h)         │
│  3. Write checkpoint file             3. Parse "Active Todos"     │
│     plans/reports/memory-             4. Restore to state file    │
│     checkpoint-YYMMDD-HHMMSS.md       5. Output reminder to LLM   │
└─────────────────────────────────────────────────────────────────┘
```

### Checkpoint File Format

Saved to `plans/reports/memory-checkpoint-{timestamp}.md`:

```markdown
# Context Memory Checkpoint

## Session Info
- **Timestamp:** 2026-01-10T09:30:00Z
- **Branch:** main

## Todo List State
- **Total Tasks:** 5
- **Pending:** 3, **In Progress:** 1

### Active Todos
1. [ ] Implement dark mode toggle
2. [~] Update settings component
3. [x] Create color theme constants
```

### Age Validation

- **< 24h:** Auto-restore todos on session resume
- **> 24h:** Warning shown, manual restore required

### Manual Checkpoint

Use `/checkpoint` command for richer context saves with task description, findings, and next steps.

### Preservation Components

| File | Event | Purpose |
|------|-------|---------|
| `save-context-memory.cjs` | PreCompact | Save todos to checkpoint |
| `session-resume.cjs` | SessionStart | Restore todos from checkpoint |
| `lib/todo-state.cjs` | - | Export/restore todo state |

---

## Summary

The Claude Code workflow orchestration system in this project achieves **declarative workflow automation**:

1. **Define once**: Patterns and sequences in `workflows.json`
2. **Run automatically**: Hooks intercept prompts and inject instructions
3. **Todo first**: LLM creates task list BEFORE executing any workflow step (MANDATORY)
4. **AI follows**: Claude reads injected instructions and executes workflows
5. **Track progress**: Each step marked completed via TodoWrite after execution
6. **Override easily**: `quick:` prefix or explicit commands bypass automation
7. **Never forgets**: State persistence ensures long workflows complete fully

This architecture separates **intent detection** (JavaScript hooks) from **execution** (LLM + skills + todo tracking), creating a maintainable and extensible workflow system with visible progress.
