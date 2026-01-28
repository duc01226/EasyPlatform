#!/usr/bin/env node
/**
 * Session Resume Hook - Auto-restores todo state from checkpoints and injects swap inventory.
 */

const fs = require('fs');
const path = require('path');
const { loadConfig, resolvePlanPath, getReportsPath } = require('./lib/ck-config-utils.cjs');
const { getTodoState, restoreTodosFromCheckpoint } = require('./lib/todo-state.cjs');
const { loadWorkflowConfig } = require('./lib/wr-config.cjs');

let _swapEngine = null;
function getSwapEngine() {
  if (_swapEngine) return _swapEngine;

  try {
    _swapEngine = require('./lib/swap-engine.cjs');
  } catch (e) {
    if (process.env.CK_DEBUG) console.error(`[session-resume] Failed to load swap-engine: ${e.message}`);
    return null;
  }
  return _swapEngine;
}

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

function getCheckpointAgeHours(filename) {
  const match = filename.match(/memory-checkpoint-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.md$/);
  if (!match) return -1;

  const [, year, month, day, hour, min, sec] = match;
  const checkpointDate = new Date(year, month - 1, day, hour, min, sec);
  return (Date.now() - checkpointDate.getTime()) / (1000 * 60 * 60);
}

function extractTodosFromCheckpoint(content) {
  const todosMatch = content.match(/### Active Todos\n\n([\s\S]*?)(?=\n\n#|\n\n---|\n*$)/);
  if (!todosMatch) return null;

  const statusMap = { 'x': 'completed', '~': 'in_progress', ' ': 'pending' };
  const todos = todosMatch[1].split('\n')
    .filter(l => l.trim())
    .flatMap(line => {
      const match = line.match(/^\d+\.\s+\[([ x~])\]\s+(.+)$/);
      return match ? [{ content: match[2].trim(), status: statusMap[match[1]] }] : [];
    });

  if (todos.length === 0) return null;

  const countByStatus = (status) => todos.filter(t => t.status === status).length;
  const metaMatch = content.match(/## Todo List State[\s\S]*?- \*\*Last Updated:\*\* ([^\n]+)/);

  return {
    todos,
    taskCount: todos.length,
    pendingCount: countByStatus('pending'),
    completedCount: countByStatus('completed'),
    inProgressCount: countByStatus('in_progress'),
    timestamp: metaMatch ? metaMatch[1].trim() : null
  };
}

function buildSwapInventory(sessionId) {
  const engine = getSwapEngine();
  if (!engine) return null;

  try {
    const swapEntries = engine.getSwapEntries(sessionId);
    if (swapEntries.length === 0) return null;

    const rows = swapEntries.slice(0, 10).map(entry => {
      const shortSummary = entry.summary.slice(0, 40).replace(/\|/g, '\\|') + (entry.summary.length > 40 ? '...' : '');
      const sizeKB = Math.max(1, Math.round(entry.charCount / 1024));
      return `| \`${entry.id}\` | ${entry.tool} | ${shortSummary} | ${sizeKB}KB | \`Read: ${entry.retrievePath}\` |`;
    });

    if (swapEntries.length > 10) {
      rows.push(`| ... | ... | +${swapEntries.length - 10} more entries | ... | ... |`);
    }

    return [
      '### Externalized Content (Recoverable)',
      '',
      'The following large tool outputs were externalized during this session:',
      '',
      '| ID | Tool | Summary | Size | Retrieve |',
      '|----|------|---------|------|----------|',
      ...rows,
      '',
      '> Use Read tool with the retrieve path to get exact content when needed.'
    ].join('\n');
  } catch (e) {
    if (process.env.CK_DEBUG) console.error(`[session-resume] Swap inventory error: ${e.message}`);
    return null;
  }
}

function outputSwapInventory(sessionId, withHeader = false) {
  const inventory = buildSwapInventory(sessionId);
  if (!inventory) return;
  console.log(withHeader ? `## Session Resume\n\n${inventory}` : inventory);
}

async function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);
    const trigger = payload.trigger || payload.reason || 'unknown';
    if (trigger === 'clear') process.exit(0);

    const sessionId = payload.session_id || process.env.CK_SESSION_ID || 'default';

    const currentState = getTodoState();
    if (currentState.hasTodos && currentState.taskCount > 0) {
      outputSwapInventory(sessionId);
      process.exit(0);
    }

    const config = loadConfig({ includeProject: false, includeAssertions: false });

    // Global checkpoint gate
    const wfConfig = loadWorkflowConfig();
    const checkpointSettings = wfConfig?.settings?.checkpoints;
    if (checkpointSettings?.enabled === false) {
      // Checkpoints disabled — still output swap inventory, skip checkpoint restore
      outputSwapInventory(sessionId, true);
      process.exit(0);
    }

    const resolved = resolvePlanPath(null, config);
    let rawReportsPath = getReportsPath(resolved.path, resolved.resolvedBy, config.plan, config.paths);

    // Fallback to settings.checkpoints.path if no plan-specific path resolved
    if (!resolved.resolvedBy && checkpointSettings?.path) {
      rawReportsPath = checkpointSettings.path;
    }

    const reportsPath = path.resolve(process.cwd(), rawReportsPath);

    const latestCheckpoint = findLatestCheckpoint(reportsPath);
    if (!latestCheckpoint) {
      outputSwapInventory(sessionId, true);
      process.exit(0);
    }

    const ageHours = getCheckpointAgeHours(path.basename(latestCheckpoint));
    if (ageHours > 24) {
      console.log(`## Stale Checkpoint Found\n`);
      console.log(`Checkpoint \`${path.basename(latestCheckpoint)}\` is ${Math.round(ageHours)} hours old.\n`);
      console.log('To restore manually, read the checkpoint file and recreate todos with TodoWrite.');
      process.exit(0);
    }

    const todoData = extractTodosFromCheckpoint(fs.readFileSync(latestCheckpoint, 'utf-8'));
    if (!todoData || todoData.todos.length === 0 || !restoreTodosFromCheckpoint(todoData)) {
      process.exit(0);
    }

    const statusMap = { completed: '[x]', in_progress: '[~]', pending: '[ ]' };
    const todoList = todoData.todos.map((t, i) => `${i + 1}. ${statusMap[t.status]} ${t.content}`).join('\n');

    console.log(`## Previous Session Context Restored\n`);
    console.log(`Recovered from: \`${path.basename(latestCheckpoint)}\``);
    console.log(`Tasks: ${todoData.taskCount} total (${todoData.pendingCount} pending, ${todoData.inProgressCount} in-progress)\n`);
    console.log(`### Recovered Todos\n${todoList}\n`);
    console.log('**Note:** Todo state restored. Use TodoWrite to update the actual todo list if continuing previous work.');

    outputSwapInventory(sessionId);
    process.exit(0);
  } catch (error) {
    if (process.env.CK_DEBUG) console.error(`[session-resume] Error: ${error.message}`);
    process.exit(0);
  }
}

main();
