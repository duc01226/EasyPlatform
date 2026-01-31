#!/usr/bin/env node
/**
 * Todo Enforcement Hook (PreToolUse)
 *
 * Blocks skills AND file-modifying tools unless TaskCreate/TodoWrite has been used.
 * Ensures task tracking for any complex or file-changing work.
 *
 * Matched tools (via settings.json matcher):
 *   - Skill: All non-research skills blocked
 *   - Edit, Write, MultiEdit, NotebookEdit: File modifications blocked
 *
 * ALLOWED without todos (read-only research):
 *   - scout, scout-ext, investigate, research, explore
 *   - watzup, context-compact, checkpoint, kanban
 *   - docs-seeker, git-diff, git-status, git-log, branch-comparison
 *
 * BLOCKED without todos (planning + implementation):
 *   - plan, plan-fast, plan-hard, plan-validate (planning workflows)
 *   - cook, fix, code, feature, implement, refactor
 *   - code-review, test, tester, debug, build
 *   - commit, git-commit, git-manager, docs-update
 *   - Edit, Write, MultiEdit, NotebookEdit (file modifications)
 *   - And all other skills not in ALLOWED list
 *
 * When a workflow is active, ALL tools are blocked until todos exist.
 *
 * Bypass: Use "quick:" prefix in Skill args
 *
 * Exit Codes:
 *   0 - Allowed
 *   2 - Blocked (no todos)
 */

const fs = require('fs');
const { getTodoState, recordBypass } = require('./lib/todo-state.cjs');
const { loadState: loadWorkflowState } = require('./lib/workflow-state.cjs');

// Tools that modify files (always require todos)
const FILE_MODIFYING_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

// Skills ALLOWED without todos (read-only research & status only)
const ALLOWED_SKILLS = new Set([
  // Research & Investigation (read-only)
  'scout', 'scout-ext',
  'investigate', 'investigation',
  'research', 'researcher',
  'explore', 'explorer',
  'docs-seeker',

  // Context & Status (no multi-step workflow)
  'watzup', 'context-compact', 'checkpoint', 'ck',
  'kanban',

  // Read-only utilities
  'git-diff', 'git-status', 'git-log',
  'branch-comparison'
]);

// Skills always allowed (workflow control, never blocked)
const ALWAYS_ALLOWED_SKILLS = new Set([
  'workflow-start', 'workflow:start', 'workflow/start'
]);

// Files exempt from todo enforcement (config/settings that are meta-tasks)
// Patterns match both absolute (D:\...) and relative (.claude/...) paths
const EXEMPT_FILE_PATTERNS = [
  /(^|[/\\])\.claude[/\\]/,     // .claude/ config files (hooks, settings, etc.)
  /(^|[/\\])\.github[/\\]/,     // .github/ config files
  /(^|[/\\])plans[/\\]/,        // Plan files
  /(^|[/\\])docs[/\\]claude[/\\]/  // Claude docs
];

// Bypass marker in args
const BYPASS_MARKER = 'quick:';

try {
  // Read stdin
  const stdin = fs.readFileSync(0, 'utf-8').trim();
  if (!stdin) process.exit(0);

  const payload = JSON.parse(stdin);
  const toolName = payload.tool_name || '';

  // Determine if this is a file-modifying tool or a Skill
  const isFileModifyingTool = FILE_MODIFYING_TOOLS.has(toolName);
  const isSkillTool = toolName === 'Skill';

  // Only enforce on Skill and file-modifying tools
  if (!isSkillTool && !isFileModifyingTool) {
    process.exit(0);
  }

  // For file-modifying tools, check if the target file is exempt
  if (isFileModifyingTool) {
    const filePath = payload.tool_input?.file_path || payload.tool_input?.notebook_path || '';
    if (filePath && EXEMPT_FILE_PATTERNS.some(pattern => pattern.test(filePath))) {
      process.exit(0);
    }
  }

  // Extract skill name (only for Skill tool)
  const skill = isSkillTool
    ? (payload.tool_input?.skill || '').toLowerCase().trim()
    : null;

  // For Skill tool: skip if no skill name
  if (isSkillTool && !skill) process.exit(0);

  // Always allow workflow control commands
  if (isSkillTool && ALWAYS_ALLOWED_SKILLS.has(skill)) {
    process.exit(0);
  }

  // Check if a workflow is active — if so, block ALL tools (including research)
  // until todos are created. This closes the gap where research skills like
  // scout/investigate could execute without task tracking during workflows.
  const workflowState = loadWorkflowState();
  const hasActiveWorkflow = !!workflowState;

  // Allow research/planning skills without todos ONLY when no workflow is active
  if (isSkillTool && !hasActiveWorkflow && ALLOWED_SKILLS.has(skill)) {
    process.exit(0);
  }

  // Check for bypass in Skill args
  if (isSkillTool) {
    const args = (payload.tool_input?.args || '').toLowerCase();
    if (args.includes(BYPASS_MARKER)) {
      recordBypass();
      console.log(`> Todo enforcement bypassed with quick: prefix for /${skill}`);
      process.exit(0);
    }
  }

  // Check todo state
  const state = getTodoState();

  // If todos exist, check count against workflow requirements
  if (state.hasTodos && state.taskCount > 0) {
    // When a workflow is active, enforce minimum todo count matching workflow steps
    if (hasActiveWorkflow && workflowState.sequence) {
      const requiredCount = workflowState.sequence.length;
      if (state.taskCount < requiredCount) {
        const missing = requiredCount - state.taskCount;
        console.error(`## Insufficient Todos for Workflow

You have ${state.taskCount} todo(s) but the **${workflowState.workflowName}** workflow requires at least ${requiredCount} (one per step).

### Missing: ${missing} todo(s)
Create one \`TaskCreate\` per workflow step:
${workflowState.sequence.map((step, i) => `${i + 1}. \`/${step}\``).join('\n')}

You must create ALL ${requiredCount} todos before proceeding.`);
        process.exit(2);
      }
    }

    // Warn if all completed
    if (state.pendingCount === 0 && state.inProgressCount === 0) {
      console.log(`> Note: All ${state.completedCount} todos completed. Consider adding new tasks if more work remains.`);
    }
    process.exit(0);
  }

  // Build display name for blocked tool
  const blockedTool = isSkillTool ? `/${skill}` : `${toolName}`;
  const filePath = isFileModifyingTool
    ? (payload.tool_input?.file_path || payload.tool_input?.notebook_path || '')
    : '';
  const fileInfo = filePath ? ` on \`${filePath}\`` : '';

  // BLOCK: No todos exist
  const workflowContext = hasActiveWorkflow
    ? `\n### Active Workflow: ${workflowState.workflowName}\nYou MUST create todo items for each workflow step BEFORE executing any tool.\nUse \`TaskCreate\` to create one todo per workflow step, then retry.\n`
    : '';

  console.error(`## Todo List Required

You must create a todo list before running \`${blockedTool}\`${fileInfo}.
${workflowContext}
### Why?
Task tracking ensures:
- No steps are forgotten during implementation
- Context preserved if session compacts
- Progress visible to you and the user

### To proceed:

**Create todos first (recommended)**
\`\`\`
Use TaskCreate to create task items for your work, then retry
\`\`\`
${isSkillTool ? `
**Bypass enforcement (not recommended)**
\`\`\`
/${skill} quick: <your args>
\`\`\`
` : ''}
### Allowed without todos (read-only):
Research: /scout, /investigate, /research, /explore
Status: /watzup, /checkpoint, /kanban
File edits: .claude/, plans/, docs/claude/ paths are exempt
`);

  process.exit(2);

} catch (error) {
  // Fail-open: don't block on errors
  if (process.env.CK_DEBUG) {
    console.error(`[todo-enforcement] Error: ${error.message}`);
  }
  process.exit(0);
}
