#!/usr/bin/env node
'use strict';

/**
 * ACE Event Emitter - Generator Role
 *
 * Captures execution feedback for Skill and Bash tools and appends to events stream.
 * Part of Agentic Context Engineering (ACE) implementation.
 *
 * Privacy: Metadata only - no stdout/stderr content stored per user decision.
 *
 * Hook: PostToolUse (Bash|Skill)
 * Output: .claude/memory/events-stream.jsonl
 *
 * @module ace-event-emitter
 */

const fs = require('fs');
const path = require('path');
const {
  classifyOutcome,
  classifyError,
  calculateSeverity,
  extractFilePattern,
  generateEventId,
  detectNegativeFeedback
} = require('./lib/ace-outcome-classifier.cjs');
const {
  ensureDirs,
  MEMORY_DIR
} = require('./lib/ace-playbook-state.cjs');
const {
  MAX_STDIN_BYTES,
  MAX_EVENT_FILE_BYTES
} = require('./lib/ace-constants.cjs');

// Constants
const EVENTS_FILE = path.join(MEMORY_DIR, 'events-stream.jsonl');
const EVENTS_ARCHIVE_DIR = path.join(MEMORY_DIR, 'events-archive');

/**
 * Read stdin synchronously with size limit (PostToolUse provides JSON payload)
 * @returns {string} stdin content (empty if exceeds MAX_STDIN_BYTES)
 */
function readStdinSync() {
  try {
    const content = fs.readFileSync(0, 'utf-8');
    // Prevent OOM from unbounded stdin
    if (content.length > MAX_STDIN_BYTES) {
      return '';
    }
    return content.trim();
  } catch (e) {
    return '';
  }
}

/**
 * Rotate events file if exceeds size limit
 */
function rotateEventsIfNeeded() {
  try {
    if (!fs.existsSync(EVENTS_FILE)) return;

    const stats = fs.statSync(EVENTS_FILE);
    if (stats.size < MAX_EVENT_FILE_BYTES) return;

    // Create archive directory
    if (!fs.existsSync(EVENTS_ARCHIVE_DIR)) {
      fs.mkdirSync(EVENTS_ARCHIVE_DIR, { recursive: true });
    }

    // Archive current file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(EVENTS_ARCHIVE_DIR, `events-${timestamp}.jsonl`);
    fs.renameSync(EVENTS_FILE, archivePath);
  } catch (e) {
    // Ignore rotation errors - non-critical
  }
}

/**
 * Extract context metadata from environment
 * @returns {Object} Context object with branch, workflow, etc.
 */
function extractContext() {
  return {
    branch: process.env.GIT_BRANCH || process.env.CK_GIT_BRANCH || null,
    workflow_step: process.env.CK_WORKFLOW_STEP || null,
    workflow_name: process.env.CK_WORKFLOW_NAME || null,
    session_type: process.env.CK_SESSION_TYPE || null
  };
}

/**
 * Summarize skill args for metadata (no sensitive content)
 * @param {string} args - Skill arguments
 * @returns {string|null} Summarized args
 */
function summarizeArgs(args) {
  if (!args || typeof args !== 'string') return null;

  // Extract only safe patterns
  const safePatterns = [];

  // Check for file references
  if (args.includes('.ts') || args.includes('.cjs') || args.includes('.js')) {
    safePatterns.push('file_ref');
  }
  if (args.includes('.cs') || args.includes('.csproj')) {
    safePatterns.push('dotnet_ref');
  }
  if (args.includes('--') || args.includes('-')) {
    safePatterns.push('has_flags');
  }
  if (args.includes('quick:')) {
    safePatterns.push('quick_mode');
  }

  return safePatterns.length > 0 ? safePatterns.join(',') : 'generic';
}

/**
 * Trivial commands to skip (noise reduction)
 * These commands provide no learning value
 */
const TRIVIAL_COMMANDS = /^(echo|pwd|which|whoami|date|env)\s*$/;

/**
 * Detect intent category for Bash commands
 * @param {string} command - Bash command string
 * @returns {string} Intent category
 */
function detectIntent(command) {
  if (/npm|yarn|pnpm/.test(command)) return 'package';
  if (/git\s+(push|pull|commit|merge|rebase|checkout|branch)/.test(command)) return 'git';
  if (/dotnet\s+(build|test|run|publish|restore)/.test(command)) return 'dotnet';
  if (/nx\s+(test|build|serve|lint|e2e)/.test(command)) return 'nx';
  if (/docker|docker-compose/.test(command)) return 'docker';
  if (/kubectl|helm/.test(command)) return 'kubernetes';
  if (/curl|wget|fetch/.test(command)) return 'http';
  if (/mkdir|rm|cp|mv|chmod/.test(command)) return 'filesystem';
  return 'shell';
}

/**
 * Summarize command for metadata (truncate long commands)
 * @param {string} command - Full command string
 * @returns {string} Summarized command
 */
function summarizeCommand(command) {
  if (!command) return 'unknown';

  // Extract first part (command name)
  const parts = command.trim().split(/\s+/);
  const cmd = parts[0];

  // For common commands, include subcommand
  if (['git', 'npm', 'yarn', 'dotnet', 'nx', 'docker', 'kubectl'].includes(cmd) && parts.length > 1) {
    return `${cmd} ${parts[1]}`;
  }

  return cmd;
}

/**
 * Build ACE event from Bash tool payload
 * @param {Object} payload - PostToolUse hook payload
 * @returns {Object|null} ACE event object or null if should skip
 */
function processBashTool(payload) {
  const command = payload.tool_input?.command || '';

  // Skip empty or very short commands
  if (!command || command.length < 3) return null;

  // Skip trivial commands (noise reduction)
  if (TRIVIAL_COMMANDS.test(command.trim())) return null;

  const outcome = classifyOutcome(payload);
  const errorType = payload.error ? classifyError(String(payload.error)) : null;
  const intent = detectIntent(command);

  return {
    event_id: generateEventId(),
    timestamp: new Date().toISOString(),
    session_id: process.env.CLAUDE_SESSION_ID || 'unknown',

    // Tool metadata
    tool: 'Bash',
    command: summarizeCommand(command),
    intent: intent,

    // Outcome classification (no content)
    outcome: outcome,
    exit_code: payload.exit_code ?? 0,
    error_type: errorType,
    severity: calculateSeverity(outcome, errorType),

    // Timing (if available)
    duration_ms: payload.duration_ms ?? null,

    // Context
    context: {
      ...extractContext(),
      file_pattern: extractFilePattern(payload.tool_input)
    },

    // ACE metadata
    ace_version: '1.0.0',
    generator: 'ace-event-emitter'
  };
}

/**
 * Build ACE event from Skill tool payload
 * @param {Object} payload - PostToolUse hook payload
 * @returns {Object|null} ACE event object or null if should skip
 */
function processSkillTool(payload) {
  const toolInput = payload.tool_input || {};
  const skillName = toolInput.skill;

  // Skip if skill is missing
  if (!skillName) return null;

  const outcome = classifyOutcome(payload);
  const errorType = payload.error ? classifyError(String(payload.error)) : null;

  return {
    event_id: generateEventId(),
    timestamp: new Date().toISOString(),
    session_id: process.env.CLAUDE_SESSION_ID || 'unknown',

    // Skill metadata
    tool: 'Skill',
    skill: skillName,
    skill_args: toolInput.args ? summarizeArgs(toolInput.args) : null,

    // Outcome classification (no content)
    outcome: outcome,
    exit_code: payload.exit_code ?? 0,
    error_type: errorType,
    severity: calculateSeverity(outcome, errorType),

    // Timing (if available)
    duration_ms: payload.duration_ms ?? null,

    // Context
    context: {
      ...extractContext(),
      file_pattern: extractFilePattern(toolInput)
    },

    // ACE metadata
    ace_version: '1.0.0',
    generator: 'ace-event-emitter'
  };
}

/**
 * Append event to JSONL stream with rotation check
 * @param {Object} event - ACE event object
 */
function appendEvent(event) {
  ensureDirs();

  // Rotate file if exceeds size limit (prevents disk exhaustion)
  rotateEventsIfNeeded();

  const line = JSON.stringify(event) + '\n';

  try {
    fs.appendFileSync(EVENTS_FILE, line, { encoding: 'utf8' });
  } catch (err) {
    // Log error but don't block - non-critical
    const errorLog = path.join(MEMORY_DIR, 'ace-errors.log');
    fs.appendFileSync(errorLog, `${new Date().toISOString()} | append_error | ${err.message}\n`);
  }
}

/**
 * Main execution
 */
function main() {
  try {
    const stdin = readStdinSync();
    if (!stdin) {
      process.exit(0);
    }

    const payload = JSON.parse(stdin);

    // Process based on tool type
    let event = null;

    switch (payload.tool_name) {
      case 'Bash':
        event = processBashTool(payload);
        break;
      case 'Skill':
        event = processSkillTool(payload);
        break;
      default:
        // Ignore other tools
        process.exit(0);
    }

    // Skip if event processing returned null (filtered out)
    if (!event) {
      process.exit(0);
    }

    // Append event to stream
    appendEvent(event);

    // Silent success - non-blocking
    process.exit(0);
  } catch (err) {
    // Non-blocking - always exit cleanly
    // Log error for debugging if needed
    try {
      ensureDirs();
      const errorLog = path.join(MEMORY_DIR, 'ace-errors.log');
      fs.appendFileSync(errorLog, `${new Date().toISOString()} | main_error | ${err.message}\n`);
    } catch (e) {
      // Ignore - truly non-blocking
    }
    process.exit(0);
  }
}

main();
