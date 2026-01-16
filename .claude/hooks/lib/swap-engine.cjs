#!/usr/bin/env node
'use strict';

/**
 * Swap Engine - Externalizes large tool outputs to swap files with semantic summaries
 * for post-compaction recovery without re-executing tools.
 * @module swap-engine
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { ensureDir, SWAP_DIR, sanitizeSessionId, getSwapDir, ensureSwapDir } = require('./ck-paths.cjs');

const CONFIG_PATH = path.join(__dirname, '../config/swap-config.json');
const DEFAULT_CONFIG = { enabled: false };

let _configCache = null;

function loadConfig() {
  if (_configCache) return _configCache;

  try {
    _configCache = fs.existsSync(CONFIG_PATH)
      ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
      : DEFAULT_CONFIG;
  } catch (e) {
    _configCache = DEFAULT_CONFIG;
    if (process.env.CK_DEBUG) {
      console.error(`[swap-engine] Config load error: ${e.message}`);
    }
  }
  return _configCache;
}

function normalizePath(filePath) {
  return (filePath || '').replace(/\\/g, '/').toLowerCase();
}

function getDirectorySize(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;

  try {
    return fs.readdirSync(dirPath).reduce((total, file) => {
      const stats = fs.statSync(path.join(dirPath, file));
      return total + (stats.isFile() ? stats.size : 0);
    }, 0);
  } catch (e) {
    return 0;
  }
}

function canExternalize(sessionId, byteSize) {
  const config = loadConfig();
  const currentSize = getDirectorySize(getSwapDir(sessionId));
  return (currentSize + byteSize) <= config.limits.maxTotalBytes;
}

function shouldExternalize(toolName, toolResult, toolInput = {}) {
  const config = loadConfig();
  if (!config.enabled) return false;

  // Prevent recursion - don't externalize swap file reads
  const filePath = toolInput?.file_path || '';
  if (toolName === 'Read' && normalizePath(filePath).includes(normalizePath(SWAP_DIR))) {
    return false;
  }

  const content = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);
  const byteLength = Buffer.byteLength(content, 'utf8');
  const threshold = config.thresholds[toolName] || config.thresholds.default;

  return byteLength > threshold && byteLength <= config.limits.maxSingleFile;
}

function generateSwapId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

// Patterns for extracting code signatures (C#, TypeScript, JavaScript)
const CODE_PATTERNS = [
  /(?:public|internal|private|protected)?\s*(?:sealed|abstract|static|partial)?\s*(?:class|record|struct)\s+\w+(?:<[^>]+>)?/g,
  /(?:public|internal|private|protected)?\s*interface\s+\w+(?:<[^>]+>)?/g,
  /(?:public|internal|private|protected)?\s*enum\s+\w+/g,
  /(?:export\s+)?class\s+\w+(?:<[^>]+>)?/g,
  /(?:export\s+)?(?:async\s+)?function\s+\w+/g,
  /(?:export\s+)?interface\s+\w+(?:<[^>]+>)?/g,
  /(?:export\s+)?type\s+\w+/g,
];

function extractSummary(content, toolName) {
  const maxLen = loadConfig().summary?.maxLength || 500;
  const truncate = (s) => s.slice(0, maxLen) + (s.length > maxLen ? '...' : '');

  if (toolName === 'Read') {
    const sigs = CODE_PATTERNS.flatMap(re => (content.match(re) || []).slice(0, 3));
    if (sigs.length) return sigs.slice(0, 10).map(s => s.trim()).join(', ').slice(0, maxLen);
  }

  if (toolName === 'Grep') {
    const lines = content.split('\n').filter(l => l.trim());
    return truncate(`${lines.length} matches. Preview: ${lines.slice(0, 3).map(l => l.slice(0, 60)).join(' | ')}`);
  }

  if (toolName === 'Glob') {
    const files = content.split('\n').filter(l => l.trim());
    const exts = [...new Set(files.map(f => path.extname(f)).filter(Boolean))].slice(0, 5);
    return truncate(`${files.length} files. Types: ${exts.join(', ')}`);
  }

  return truncate(content);
}

// Patterns for extracting names only (simpler than CODE_PATTERNS)
const NAME_EXTRACTORS = [
  { re: /(?:class|record|struct)\s+(\w+)/g, group: 1 },
  { re: /function\s+(\w+)/g, group: 1 },
  { re: /interface\s+(\w+)/g, group: 1 },
  { re: /enum\s+(\w+)/g, group: 1 },
];

function extractKeyPatterns(content) {
  const maxCount = loadConfig().summary?.keyPatternsCount || 10;
  const patterns = NAME_EXTRACTORS.flatMap(({ re }) =>
    (content.match(re) || []).map(m => m.split(/\s+/).pop())
  );
  return [...new Set(patterns)].slice(0, maxCount);
}

function getIndexPath(sessionId) {
  return path.join(getSwapDir(sessionId), 'index.jsonl');
}

function readIndex(sessionId) {
  const indexPath = getIndexPath(sessionId);
  if (!fs.existsSync(indexPath)) return [];

  try {
    return fs.readFileSync(indexPath, 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  } catch {
    return [];
  }
}

function appendToIndex(sessionId, entry) {
  ensureDir(getSwapDir(sessionId));
  fs.appendFileSync(getIndexPath(sessionId), JSON.stringify(entry) + '\n', 'utf8');
}

function logDebug(msg) {
  if (process.env.CK_DEBUG) console.error(`[swap-engine] ${msg}`);
}

function safeUnlink(filePath) {
  try { fs.unlinkSync(filePath); } catch { /* ignore */ }
}

function externalize(sessionId, toolName, toolInput, toolResult) {
  const sessionDir = ensureSwapDir(sessionId);
  const content = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2);
  const byteSize = Buffer.byteLength(content, 'utf8');
  const config = loadConfig();

  if (!canExternalize(sessionId, byteSize)) {
    logDebug(`Disk limit reached for session: ${sessionId}`);
    return null;
  }

  if (readIndex(sessionId).length >= config.limits.maxEntriesPerSession) {
    logDebug(`Max entries reached for session: ${sessionId}`);
    return null;
  }

  const swapId = generateSwapId();
  const contentPath = path.join(sessionDir, `${swapId}.content`);
  const metaPath = path.join(sessionDir, `${swapId}.meta.json`);
  const capturedAt = new Date().toISOString();

  try {
    fs.writeFileSync(contentPath, content, 'utf8');
  } catch (e) {
    logDebug(`Write failed: ${e.message}`);
    return null;
  }

  const metadata = {
    id: swapId,
    tool: toolName,
    input: toolInput,
    metrics: {
      charCount: content.length,
      byteSize,
      lineCount: content.split('\n').length,
      tokenEstimate: Math.ceil(content.length / 4)
    },
    summary: extractSummary(content, toolName),
    keyPatterns: extractKeyPatterns(content),
    timestamps: { capturedAt, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }
  };

  try {
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
  } catch (e) {
    safeUnlink(contentPath);
    logDebug(`Metadata write failed: ${e.message}`);
    return null;
  }

  try {
    appendToIndex(sessionId, {
      id: swapId,
      tool: toolName,
      summary: metadata.summary.slice(0, 100),
      charCount: content.length,
      capturedAt
    });
  } catch (e) {
    safeUnlink(contentPath);
    safeUnlink(metaPath);
    logDebug(`Index append failed: ${e.message}`);
    return null;
  }

  return { swapId, sessionDir, contentPath, metadata };
}

function formatInput(input) {
  if (!input) return '(none)';
  if (input.file_path) return input.file_path;
  if (input.pattern) return `pattern: ${input.pattern}`;
  if (input.command) return input.command.slice(0, 50);
  return JSON.stringify(input).slice(0, 50);
}

function buildPointer(entry) {
  const { swapId, contentPath, metadata } = entry;
  const { charCount, tokenEstimate } = metadata.metrics;
  const filePath = contentPath.replace(/\\/g, '/');
  const keyPatterns = metadata.keyPatterns.length
    ? metadata.keyPatterns.map(p => `- \`${p}\``).join('\n')
    : '(none extracted)';

  return `
## External Memory Reference

| Field | Value |
|-------|-------|
| **ID** | \`${swapId}\` |
| **Tool** | ${metadata.tool} |
| **Input** | \`${formatInput(metadata.input)}\` |
| **Size** | ${charCount.toLocaleString()} chars (~${tokenEstimate.toLocaleString()} tokens) |

### Summary
${metadata.summary}

### Key Patterns
${keyPatterns}

### Retrieval
\`\`\`
Read: ${filePath}
\`\`\`

> Content externalized. Use Read tool above to retrieve exact content when needed.
`;
}

function getSwapEntries(sessionId) {
  const sessionDir = getSwapDir(sessionId);
  return readIndex(sessionId).map(entry => ({
    id: entry.id,
    tool: entry.tool,
    summary: entry.summary,
    charCount: entry.charCount,
    retrievePath: path.join(sessionDir, `${entry.id}.content`).replace(/\\/g, '/')
  }));
}

function deleteSwapEntry(sessionDir, id) {
  safeUnlink(path.join(sessionDir, `${id}.content`));
  safeUnlink(path.join(sessionDir, `${id}.meta.json`));
}

function cleanupSwapFiles(sessionId, maxAgeHours = 24) {
  const sessionDir = getSwapDir(sessionId);
  if (!fs.existsSync(sessionDir)) return;

  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

  const validEntries = readIndex(sessionId).filter(entry => {
    const capturedTime = new Date(entry.capturedAt).getTime();
    const age = isNaN(capturedTime) ? Infinity : now - capturedTime;
    if (age > maxAgeMs) {
      deleteSwapEntry(sessionDir, entry.id);
      return false;
    }
    return true;
  });

  const indexPath = getIndexPath(sessionId);
  const tempPath = indexPath + '.tmp';
  try {
    fs.writeFileSync(tempPath, validEntries.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
    fs.renameSync(tempPath, indexPath);
  } catch (e) {
    safeUnlink(tempPath);
    logDebug(`Cleanup write failed: ${e.message}`);
  }
}

function cleanupOrphans(sessionId) {
  const sessionDir = getSwapDir(sessionId);
  if (!fs.existsSync(sessionDir)) return;

  const indexedIds = new Set(readIndex(sessionId).map(e => e.id));

  try {
    fs.readdirSync(sessionDir)
      .filter(f => f.endsWith('.content'))
      .map(f => path.basename(f, '.content'))
      .filter(id => !indexedIds.has(id))
      .forEach(id => {
        deleteSwapEntry(sessionDir, id);
        logDebug(`Cleaned orphan: ${id}`);
      });
  } catch (e) {
    logDebug(`Orphan cleanup error: ${e.message}`);
  }
}

function deleteSessionSwap(sessionId) {
  const sessionDir = getSwapDir(sessionId);
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }
}

module.exports = {
  // Config
  loadConfig,
  SWAP_DIR,

  // Path helpers
  getSwapDir,
  ensureSwapDir,
  normalizePath,
  sanitizeSessionId,

  // Core functions
  shouldExternalize,
  externalize,
  extractSummary,
  extractKeyPatterns,
  buildPointer,

  // Index operations
  getSwapEntries,
  readIndex,

  // Cleanup
  cleanupSwapFiles,
  cleanupOrphans,
  deleteSessionSwap
};
