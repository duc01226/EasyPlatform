#!/usr/bin/env node
/**
 * Todo Enforcement Hook (PreToolUse)
 *
 * Blocks implementation-related skills unless TodoWrite has been used.
 * Enforces "strict: all non-research" policy from validation.
 *
 * ALLOWED without todos (research/planning):
 *   - scout, scout:ext, investigate, plan, plan:fast, plan:hard, plan:validate
 *   - research, explore, watzup, docs-seeker, context-compact
 *
 * BLOCKED without todos (implementation):
 *   - cook, fix, code, feature, implement, refactor
 *   - code-review, test, tester, debug, build
 *   - commit, git-commit, git-manager, docs-update
 *   - And all other skills not in ALLOWED list
 *
 * Bypass: Use "quick:" prefix in args
 *
 * Exit Codes:
 *   0 - Allowed
 *   2 - Blocked (no todos)
 */

const fs = require('fs');
const { getTodoState, recordBypass } = require('./lib/todo-state.cjs');

// Skills ALLOWED without todos (research/planning only)
const ALLOWED_SKILLS = new Set([
  // Research & Investigation
  'scout', 'scout:ext', 'scout-ext',
  'investigate', 'investigation',
  'research', 'researcher',
  'explore', 'explorer',
  'docs-seeker',

  // Planning
  'plan', 'plan:fast', 'plan:hard', 'plan:validate',
  'planner',

  // Context & Status
  'watzup', 'context-compact', 'checkpoint', 'ck',
  'kanban',

  // Read-only utilities
  'git-diff', 'git-status', 'git-log',
  'branch-comparison'
]);

// Bypass marker in args
const BYPASS_MARKER = 'quick:';

try {
  // Read stdin
  const stdin = fs.readFileSync(0, 'utf-8').trim();
  if (!stdin) process.exit(0);

  const payload = JSON.parse(stdin);

  // Only check Skill tool calls
  if (payload.tool_name !== 'Skill') {
    process.exit(0);
  }

  // Extract skill name
  const skill = (payload.tool_input?.skill || '').toLowerCase().trim();
  if (!skill) process.exit(0);

  // Allow research/planning skills without todos
  if (ALLOWED_SKILLS.has(skill)) {
    process.exit(0);
  }

  // Check for bypass in args
  const args = (payload.tool_input?.args || '').toLowerCase();
  if (args.includes(BYPASS_MARKER)) {
    recordBypass();
    console.log(`> Todo enforcement bypassed with quick: prefix for /${skill}`);
    process.exit(0);
  }

  // Check todo state
  const state = getTodoState();

  // If todos exist, allow
  if (state.hasTodos && state.taskCount > 0) {
    // Warn if all completed
    if (state.pendingCount === 0 && state.inProgressCount === 0) {
      console.log(`> Note: All ${state.completedCount} todos completed. Consider adding new tasks if more work remains.`);
    }
    process.exit(0);
  }

  // BLOCK: No todos exist for implementation skill
  console.error(`## Todo List Required

You must create a todo list before running \`/${skill}\`.

### Why?
Task tracking ensures:
- No steps are forgotten during implementation
- Context preserved if session compacts
- Progress visible to you and the user

### To proceed:

**Option 1: Create todos first (recommended)**
\`\`\`
Use TodoWrite to create a task list, then retry /${skill}
\`\`\`

**Option 2: Bypass enforcement (not recommended)**
\`\`\`
/${skill} quick: <your args>
\`\`\`

### Allowed without todos:
Research: /scout, /investigate, /research, /explore
Planning: /plan, /plan:hard, /plan:validate
Status: /watzup, /checkpoint
`);

  process.exit(2);

} catch (error) {
  // Fail-open: don't block on errors
  if (process.env.CK_DEBUG) {
    console.error(`[todo-enforcement] Error: ${error.message}`);
  }
  process.exit(0);
}
