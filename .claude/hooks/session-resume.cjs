#!/usr/bin/env node
/**
 * Session Resume Hook (SessionStart)
 *
 * Auto-restores todo state from the most recent checkpoint on session start.
 * This enables seamless task continuity across compactions.
 *
 * Triggered by: SessionStart event (resume, startup after compact)
 *
 * Behavior:
 * - Finds latest memory-checkpoint-*.md file
 * - Extracts todo list from "### Active Todos" section
 * - Restores to .todo-state.json (NOT TodoWrite - just state file)
 * - Outputs reminder to user about recovered context
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const path = require('path');
const {
  loadConfig,
  resolvePlanPath,
  getReportsPath
} = require('./lib/ck-config-utils.cjs');
const {
  getTodoState,
  restoreTodosFromCheckpoint
} = require('./lib/todo-state.cjs');

/**
 * Find the most recent checkpoint file
 * @param {string} reportsPath - Path to reports directory
 * @returns {string|null} Path to latest checkpoint or null
 */
function findLatestCheckpoint(reportsPath) {
  try {
    if (!fs.existsSync(reportsPath)) return null;

    const files = fs.readdirSync(reportsPath)
      .filter(f => f.startsWith('memory-checkpoint-') && f.endsWith('.md'))
      .sort()
      .reverse();

    return files[0] ? path.join(reportsPath, files[0]) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Parse checkpoint age
 * @param {string} filename - Checkpoint filename
 * @returns {number} Hours since checkpoint was created
 */
function getCheckpointAgeHours(filename) {
  try {
    // Format: memory-checkpoint-YYYYMMDD-HHMMSS.md
    const match = filename.match(/memory-checkpoint-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.md$/);
    if (!match) return -1;

    const [, year, month, day, hour, min, sec] = match;
    const checkpointDate = new Date(year, month - 1, day, hour, min, sec);
    const now = new Date();
    return (now - checkpointDate) / (1000 * 60 * 60);
  } catch (e) {
    return -1;
  }
}

/**
 * Extract todos from checkpoint content
 * @param {string} content - Checkpoint file content
 * @returns {Object|null} Extracted todo data or null
 */
function extractTodosFromCheckpoint(content) {
  try {
    // Extract "### Active Todos" section
    const todosMatch = content.match(/### Active Todos\n\n([\s\S]*?)(?=\n\n#|\n\n---|\n*$)/);
    if (!todosMatch) return null;

    const todoLines = todosMatch[1].split('\n').filter(l => l.trim());
    if (todoLines.length === 0) return null;

    // Parse todo format: "1. [x] Task content" or "1. [ ] Task content" or "1. [~] Task content"
    const todos = todoLines.map(line => {
      const match = line.match(/^\d+\.\s+\[([ x~])\]\s+(.+)$/);
      if (!match) return null;

      return {
        content: match[2].trim(),
        status: match[1] === 'x' ? 'completed' :
                match[1] === '~' ? 'in_progress' : 'pending'
      };
    }).filter(Boolean);

    if (todos.length === 0) return null;

    // Calculate counts
    const pending = todos.filter(t => t.status === 'pending').length;
    const completed = todos.filter(t => t.status === 'completed').length;
    const inProgress = todos.filter(t => t.status === 'in_progress').length;

    // Extract metadata from "## Todo List State" section if present
    const metaMatch = content.match(/## Todo List State[\s\S]*?- \*\*Last Updated:\*\* ([^\n]+)/);
    const timestamp = metaMatch ? metaMatch[1].trim() : null;

    return {
      todos,
      taskCount: todos.length,
      pendingCount: pending,
      completedCount: completed,
      inProgressCount: inProgress,
      timestamp
    };
  } catch (e) {
    return null;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);
    const trigger = payload.trigger || payload.reason || 'unknown';

    // Only restore on resume/startup after compact, not on clear
    if (trigger === 'clear') {
      process.exit(0);
    }

    // Check if we already have todo state (don't overwrite)
    const currentState = getTodoState();
    if (currentState.hasTodos && currentState.taskCount > 0) {
      // Already have todos, don't overwrite
      process.exit(0);
    }

    // Load config to find reports path
    const config = loadConfig({ includeProject: false, includeAssertions: false });
    const resolved = resolvePlanPath(null, config);
    const reportsPath = path.resolve(process.cwd(), getReportsPath(resolved.path, resolved.resolvedBy, config.plan, config.paths));

    // Find latest checkpoint
    const latestCheckpoint = findLatestCheckpoint(reportsPath);
    if (!latestCheckpoint) {
      process.exit(0);
    }

    // Check checkpoint age
    const ageHours = getCheckpointAgeHours(path.basename(latestCheckpoint));
    if (ageHours > 24) {
      // Checkpoint too old, warn but don't restore
      console.log(`## Stale Checkpoint Found`);
      console.log('');
      console.log(`Checkpoint \`${path.basename(latestCheckpoint)}\` is ${Math.round(ageHours)} hours old.`);
      console.log('');
      console.log('To restore manually, read the checkpoint file and recreate todos with TodoWrite.');
      process.exit(0);
    }

    // Read and parse checkpoint
    const content = fs.readFileSync(latestCheckpoint, 'utf-8');
    const todoData = extractTodosFromCheckpoint(content);

    if (!todoData || todoData.todos.length === 0) {
      process.exit(0);
    }

    // Restore todo state
    const restored = restoreTodosFromCheckpoint(todoData);
    if (!restored) {
      process.exit(0);
    }

    // Output context for LLM
    console.log(`## Previous Session Context Restored`);
    console.log('');
    console.log(`Recovered from: \`${path.basename(latestCheckpoint)}\``);
    console.log(`Tasks: ${todoData.taskCount} total (${todoData.pendingCount} pending, ${todoData.inProgressCount} in-progress)`);
    console.log('');
    console.log('### Recovered Todos');
    todoData.todos.forEach((t, i) => {
      const status = t.status === 'completed' ? '[x]' :
                     t.status === 'in_progress' ? '[~]' : '[ ]';
      console.log(`${i + 1}. ${status} ${t.content}`);
    });
    console.log('');
    console.log('**Note:** Todo state restored. Use TodoWrite to update the actual todo list if continuing previous work.');

    process.exit(0);
  } catch (error) {
    // Fail-open: don't block session start
    if (process.env.CK_DEBUG) {
      console.error(`[session-resume] Error: ${error.message}`);
    }
    process.exit(0);
  }
}

main();
