#!/usr/bin/env node
/**
 * Code Patterns Injector - Edit/Write Hook
 *
 * Injects EasyPlatform code patterns on-demand when editing code files:
 *   - Backend (.cs) files in src/(Platform|Services|PlatformExampleApp)
 *   - Frontend (.ts/.tsx/.html) files in src/(WebV2|Web) or libs/(platform-core|bravo-common|bravo-domain)
 *
 * Dedup: Checks transcript for "## EasyPlatform Code Patterns" marker
 * in last 300 lines. After context compaction, re-injects on next trigger.
 *
 * Configuration (.ck.json):
 *   codePatterns.enabled - Enable/disable injection (default: true)
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const DEDUP_MARKER = '## EasyPlatform Code Patterns';
const DEDUP_LINES = 300;
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const BACKEND_PATTERNS = path.resolve(PROJECT_DIR, '.ai/docs/backend-code-patterns.md');
const FRONTEND_PATTERNS = path.resolve(PROJECT_DIR, '.ai/docs/frontend-code-patterns.md');

// ═══════════════════════════════════════════════════════════════════════════
// DOMAIN DETECTION
// ═══════════════════════════════════════════════════════════════════════════

function shouldInjectForFile(filePath) {
  if (!filePath) return { backend: false, frontend: false };
  const ext = path.extname(filePath).toLowerCase();
  const normalized = filePath.replace(/\\/g, '/');

  return {
    backend: ext === '.cs' && /src\/(Platform|Services|PlatformExampleApp)/i.test(normalized),
    frontend: ['.ts', '.tsx', '.html'].includes(ext) && /(?:src\/(WebV2|Web)\/)|(?:libs\/(platform-core|bravo-common|bravo-domain)\/)/i.test(normalized)
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEDUP
// ═══════════════════════════════════════════════════════════════════════════

function wasRecentlyInjected(transcriptPath) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
    const transcript = fs.readFileSync(transcriptPath, 'utf-8');
    const recentLines = transcript.split('\n').slice(-DEDUP_LINES).join('\n');
    return recentLines.includes(DEDUP_MARKER);
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PATTERN READING
// ═══════════════════════════════════════════════════════════════════════════

function readPatternFiles(injectBackend, injectFrontend) {
  const parts = [];
  if (injectBackend && fs.existsSync(BACKEND_PATTERNS)) {
    parts.push(fs.readFileSync(BACKEND_PATTERNS, 'utf-8'));
  }
  if (injectFrontend && fs.existsSync(FRONTEND_PATTERNS)) {
    parts.push(fs.readFileSync(FRONTEND_PATTERNS, 'utf-8'));
  }
  return parts.length > 0 ? parts.join('\n\n---\n\n') : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);

    // Only handle Edit/Write/MultiEdit
    if (!['Edit', 'Write', 'MultiEdit'].includes(payload.tool_name)) process.exit(0);

    // Load config
    let config = {};
    try {
      const { loadConfig } = require('./lib/ck-config-utils.cjs');
      config = (loadConfig() || {}).codePatterns || {};
    } catch { /* use defaults */ }

    // Early exit if disabled
    if (config.enabled === false) process.exit(0);

    // Check dedup
    if (wasRecentlyInjected(payload.transcript_path || '')) process.exit(0);

    // Determine domain from file path (MultiEdit uses { edits: [{ file_path }] })
    const filePath = payload.tool_input?.file_path
        || payload.tool_input?.filePath
        || payload.tool_input?.edits?.[0]?.file_path
        || '';
    const { backend, frontend } = shouldInjectForFile(filePath);
    if (!backend && !frontend) process.exit(0);

    // Read and output patterns
    const content = readPatternFiles(backend, frontend);
    if (content) console.log(content);

    process.exit(0);
  } catch {
    process.exit(0); // Non-blocking
  }
}

main();
