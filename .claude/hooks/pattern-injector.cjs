#!/usr/bin/env node
'use strict';

/**
 * Pattern Injector Hook - Injects learned patterns into context
 *
 * Part of Agentic Context Engineering (ACE) implementation.
 * Triggers on: SessionStart (startup|resume), PreToolUse (all tools)
 *
 * Validated decisions:
 * - Comprehensive injection: 5 patterns, ~400 tokens
 * - All tool uses (not just Edit/Write)
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const path = require('path');

const {
  findRelevantPatterns,
  formatPatternInjection,
  getSelectedPatternIds
} = require('./lib/pattern-matcher.cjs');

const { MAX_PATTERN_INJECTION } = require('./lib/pattern-constants.cjs');

const { loadAllPatterns } = require('./lib/pattern-storage.cjs');

/**
 * Get hook type from stdin payload
 * @param {object} payload - Hook payload
 * @returns {'session' | 'tool' | 'unknown'}
 */
function getHookType(payload) {
  if (payload.source) {
    // SessionStart payload
    return 'session';
  }
  if (payload.tool_name || payload.tool_input) {
    // PreToolUse payload
    return 'tool';
  }
  return 'unknown';
}

/**
 * Build context from SessionStart payload
 * @param {object} payload - SessionStart payload
 * @returns {object} Context object
 */
function buildSessionContext(payload) {
  return {
    projectType: process.env.CK_PROJECT_TYPE || 'unknown',
    branch: process.env.CK_GIT_BRANCH || payload.branch,
    framework: process.env.CK_FRAMEWORK || ''
  };
}

/**
 * Build context from PreToolUse payload
 * @param {object} payload - PreToolUse payload
 * @returns {object} Context object
 */
function buildToolContext(payload) {
  const toolName = payload.tool_name;
  const toolInput = payload.tool_input || {};

  const context = {
    toolName,
    projectType: process.env.CK_PROJECT_TYPE || 'unknown',
    branch: process.env.CK_GIT_BRANCH || ''
  };

  // Extract file path from various tool inputs
  if (toolInput.file_path) {
    context.filePath = toolInput.file_path;
  } else if (toolInput.path) {
    context.filePath = toolInput.path;
  } else if (toolInput.pattern) {
    // Glob tool - use pattern as hint
    context.prompt = toolInput.pattern;
  }

  // Extract prompt/description context
  if (toolInput.old_string) {
    context.prompt = toolInput.old_string;
  } else if (toolInput.command) {
    context.prompt = toolInput.command;
  } else if (toolInput.content) {
    context.prompt = toolInput.content.slice(0, 500); // Limit for performance
  }

  return context;
}

/**
 * Write injected pattern IDs to environment
 * Uses process.env only (thread-safe, no file race conditions)
 * @param {string[]} patternIds - Injected pattern IDs
 */
function trackInjectedPatterns(patternIds) {
  // H4: Guard against null/undefined
  process.env.CK_INJECTED_PATTERNS = (patternIds || []).join(',');
  // Note: Removed file-based tracking to avoid race conditions
  // when multiple hooks run concurrently. process.env is sufficient
  // for intra-session pattern tracking.
}

/**
 * Check if pattern injection is disabled
 * @returns {boolean}
 */
function isInjectionDisabled() {
  return process.env.CK_DISABLE_PATTERNS === '1' ||
         process.env.CK_DISABLE_PATTERNS === 'true';
}

/**
 * Handle SessionStart injection
 * @param {object} payload - SessionStart payload
 */
function handleSessionStart(payload) {
  const source = payload.source;

  // Only inject on startup/resume (not on clear/compact)
  if (source !== 'startup' && source !== 'resume') {
    return;
  }

  const context = buildSessionContext(payload);
  const patterns = findRelevantPatterns(context, MAX_PATTERN_INJECTION);

  if (patterns.length === 0) {
    return;
  }

  const injection = formatPatternInjection(patterns);
  if (!injection) {
    return;
  }

  // Output as system-reminder format for Claude to pick up
  console.log(`\n<system-reminder>\n${injection}</system-reminder>\n`);

  // Track for feedback correlation
  const patternIds = getSelectedPatternIds(patterns);
  trackInjectedPatterns(patternIds);

  if (process.env.CK_DEBUG) {
    console.error(`[Pattern] Injected ${patterns.length} patterns at session ${source}`);
  }
}

/**
 * Handle PreToolUse injection
 * @param {object} payload - PreToolUse payload
 */
function handlePreToolUse(payload) {
  const context = buildToolContext(payload);

  // Skip if no useful context
  if (!context.filePath && !context.prompt) {
    return;
  }

  const patterns = findRelevantPatterns(context, MAX_PATTERN_INJECTION);

  if (patterns.length === 0) {
    return;
  }

  const injection = formatPatternInjection(patterns);
  if (!injection) {
    return;
  }

  // Output reminder before tool execution
  console.log(`\n<system-reminder>\n${injection}</system-reminder>\n`);

  // Track for feedback correlation
  const patternIds = getSelectedPatternIds(patterns);
  trackInjectedPatterns(patternIds);

  if (process.env.CK_DEBUG) {
    const fileName = context.filePath ? path.basename(context.filePath) : context.toolName;
    console.error(`[Pattern] Injected ${patterns.length} patterns for ${fileName}`);
  }
}

/**
 * Main hook execution
 */
async function main() {
  try {
    // Check if disabled
    if (isInjectionDisabled()) {
      process.exit(0);
    }

    // Check if any patterns exist
    const allPatterns = loadAllPatterns();
    if (allPatterns.length === 0) {
      process.exit(0);
    }

    // Read payload from stdin
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) {
      process.exit(0);
    }

    const payload = JSON.parse(stdin);
    const hookType = getHookType(payload);

    if (hookType === 'session') {
      handleSessionStart(payload);
    } else if (hookType === 'tool') {
      handlePreToolUse(payload);
    }

    process.exit(0);
  } catch (error) {
    // Non-blocking - always exit 0
    if (process.env.CK_DEBUG) {
      console.error(`[Pattern] Injector error: ${error.message}`);
    }
    process.exit(0);
  }
}

main();
