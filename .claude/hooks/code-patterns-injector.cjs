#!/usr/bin/env node
/**
 * Code Patterns Injector - Edit/Write Trigger Hook
 *
 * Injects EasyPlatform code patterns on-demand when editing code files.
 * Trigger: PreToolUse:Edit|Write|MultiEdit
 *
 * Domain detection:
 *   .cs files in src/(Backend|Platform|Services|PlatformExampleApp) → backend patterns
 *   .ts/.tsx/.html files in src/Frontend or libs/ → frontend patterns
 *
 * Dedup: Checks transcript for domain-specific markers in last 300 lines.
 *   Backend: "## EasyPlatform Backend Code Patterns"
 *   Frontend: "## EasyPlatform Frontend Code Patterns"
 * After context compaction, re-injects on next trigger.
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

// --- Constants ---
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const BACKEND_PATTERNS_PATH = path.resolve(PROJECT_DIR, '.ai/docs/backend-code-patterns.md');
const FRONTEND_PATTERNS_PATH = path.resolve(PROJECT_DIR, '.ai/docs/frontend-code-patterns.md');
const BACKEND_MARKER = '## EasyPlatform Backend Code Patterns';
const FRONTEND_MARKER = '## EasyPlatform Frontend Code Patterns';
const DEDUP_LINES = 300;
const VALID_TOOLS = new Set(['Edit', 'Write', 'MultiEdit']);

// --- Functions ---

function shouldInjectForFile(filePath) {
  if (!filePath) return { backend: false, frontend: false };
  const ext = path.extname(filePath).toLowerCase();
  const normalized = filePath.replace(/\\/g, '/');

  return {
    backend: ext === '.cs' && /src\/(Backend|Platform|Services|PlatformExampleApp)/i.test(normalized),
    frontend: ['.ts', '.tsx', '.html'].includes(ext) && /src\/Frontend|libs\//i.test(normalized)
  };
}

function getRecentTranscript(transcriptPath) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return '';
    const transcript = fs.readFileSync(transcriptPath, 'utf-8');
    return transcript.split('\n').slice(-DEDUP_LINES).join('\n');
  } catch {
    return '';
  }
}

function readPatternFiles(injectBackend, injectFrontend) {
  const parts = [];
  if (injectBackend && fs.existsSync(BACKEND_PATTERNS_PATH)) {
    parts.push(fs.readFileSync(BACKEND_PATTERNS_PATH, 'utf-8'));
  }
  if (injectFrontend && fs.existsSync(FRONTEND_PATTERNS_PATH)) {
    parts.push(fs.readFileSync(FRONTEND_PATTERNS_PATH, 'utf-8'));
  }
  return parts.length > 0 ? parts.join('\n\n---\n\n') : null;
}

// --- Main ---

async function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);

    // Only handle Edit/Write/MultiEdit
    if (!VALID_TOOLS.has(payload.tool_name)) process.exit(0);

    // Load config (optional)
    try {
      const { loadConfig } = require('./lib/ck-config-utils.cjs');
      const config = loadConfig();
      if (config.codePatterns?.enabled === false) process.exit(0);
    } catch { /* config optional */ }

    // Determine domain from file path
    const filePath = payload.tool_input?.file_path || payload.tool_input?.filePath || '';
    const { backend, frontend } = shouldInjectForFile(filePath);

    if (!backend && !frontend) process.exit(0);

    // Check dedup per domain (allows both BE + FE in fullstack sessions)
    const recentTranscript = getRecentTranscript(payload.transcript_path || '');
    const injectBackend = backend && !recentTranscript.includes(BACKEND_MARKER);
    const injectFrontend = frontend && !recentTranscript.includes(FRONTEND_MARKER);

    if (!injectBackend && !injectFrontend) process.exit(0);

    // Read and output patterns
    const content = readPatternFiles(injectBackend, injectFrontend);
    if (content) console.log(content);

    process.exit(0);
  } catch {
    process.exit(0); // Non-blocking — always exit successfully
  }
}

main();
