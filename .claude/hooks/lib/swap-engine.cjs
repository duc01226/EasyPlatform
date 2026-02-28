#!/usr/bin/env node
'use strict';

/**
 * External Memory Swap Engine
 *
 * Externalizes large tool outputs to swap files, keeping lightweight pointers
 * in conversation context for post-compaction recovery.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ensureSwapDir, getSwapDir } = require('./ck-paths.cjs');
const { debug, debugError } = require('./debug-log.cjs');
const { deepMerge } = require('./ck-config-utils.cjs');

// Time constants
const MS_PER_HOUR = 3600000;
const MS_PER_DAY = 86400000;

const DEFAULT_CONFIG = {
  enabled: true,
  thresholds: { default: 4096, Read: 8192, Grep: 4096, Bash: 6144, Glob: 2048 },
  retention: { defaultHours: 24, accessedHours: 48, neverAccessedHours: 6 },
  limits: { maxEntriesPerSession: 100, maxTotalBytes: 262144000, maxSingleFile: 5242880 },
  summary: { maxLength: 500, keyPatternsCount: 10 }
};

let _cachedConfig = null;

function loadConfig() {
  if (_cachedConfig) return _cachedConfig;

  const configPath = path.join(__dirname, '../config/swap-config.json');
  try {
    if (fs.existsSync(configPath)) {
      _cachedConfig = deepMerge(DEFAULT_CONFIG, JSON.parse(fs.readFileSync(configPath, 'utf8')));
      return _cachedConfig;
    }
  } catch (err) {
    debug('swap-engine', `Config load error: ${err.message}`);
  }
  _cachedConfig = DEFAULT_CONFIG;
  return _cachedConfig;
}

function shouldExternalize(toolName, toolResult, toolInput = {}) {
  const config = loadConfig();
  if (!config.enabled) return false;

  // Skip swap file reads (prevent recursion) - normalize Windows paths
  const normalizedPath = (toolInput?.file_path || '').replace(/\\/g, '/');
  if (toolName === 'Read' && normalizedPath.includes('/tmp/ck/swap/')) return false;

  const content = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);
  const threshold = config.thresholds[toolName] || config.thresholds.default;

  if (content.length > config.limits.maxSingleFile) {
    debug('swap-engine', 'Output exceeds single file limit, skipping');
    return false;
  }

  return content.length > threshold;
}

function generateSwapId(toolName, toolInput) {
  const data = JSON.stringify({ tool: toolName, input: toolInput, ts: Date.now() });
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 12);
}

function extractSummary(content, toolName) {
  const maxLen = loadConfig().summary.maxLength;
  const truncate = (s) => s.length > maxLen ? s.slice(0, maxLen) + '...' : s;

  if (toolName === 'Read') {
    const patterns = [
      [/(?:public|internal|private)?\s*(?:sealed|abstract|static)?\s*class\s+\w+/g, 3],
      [/(?:public|internal)?\s*interface\s+\w+/g, 2],
      [/(?:public|protected|private|internal)\s+(?:async\s+)?(?:Task<?\w*>?|void|\w+)\s+\w+\s*\(/g, 5],
      [/(?:export\s+)?class\s+\w+/g, 3],
      [/(?:export\s+)?(?:async\s+)?function\s+\w+/g, 3],
      [/export\s+(?:const|let|type|interface)\s+\w+/g, 3]
    ];
    const sigs = patterns.flatMap(([re, n]) => (content.match(re) || []).slice(0, n));
    return sigs.length ? sigs.slice(0, 10).map(s => s.trim()).join(', ') : truncate(content);
  }

  if (toolName === 'Grep') {
    const lines = content.split('\n').filter(l => l.trim());
    return `${lines.length} matches. Preview: ${lines.slice(0, 3).map(l => l.slice(0, 80)).join(' | ')}`;
  }

  if (toolName === 'Bash') {
    const lines = content.split('\n').filter(l => l.trim());
    const hasError = /error|fail|exception/i.test(content);
    const first = lines[0]?.slice(0, 100) || '';
    const last = lines.length > 1 ? lines[lines.length - 1]?.slice(0, 100) : '';
    let summary = `${lines.length} lines.${hasError ? ' [CONTAINS ERRORS]' : ''} Start: ${first}`;
    if (last && last !== first) summary += `... End: ${last}`;
    return summary.slice(0, maxLen);
  }

  if (toolName === 'Glob') {
    const files = content.split('\n').filter(l => l.trim());
    const exts = [...new Set(files.map(f => path.extname(f)).filter(Boolean))].slice(0, 5);
    return `${files.length} files. Types: ${exts.join(', ')}`;
  }

  return truncate(content);
}

function extractKeyPatterns(content, toolName) {
  const maxPatterns = loadConfig().summary.keyPatternsCount;
  const patterns = new Set();

  const extractors = [
    { re: /(?:class|interface)\s+(\w+)/g, group: 1 },
    { re: /(?:public|private|protected|async)\s+\w+\s+(\w+)\s*\(/g, group: 1 },
    { re: /export\s+(?:const|let|function|class|interface|type)\s+(\w+)/g, group: 1 }
  ];

  for (const { re, group } of extractors) {
    let match;
    while ((match = re.exec(content)) !== null) {
      const name = match[group];
      if (name && name.length > 2) patterns.add(name);
    }
  }

  return [...patterns].slice(0, maxPatterns);
}

const LOCK_TIMEOUT_MS = 5000; // 5 second lock timeout

function acquireLock(sessionDir) {
  const lockPath = path.join(sessionDir, '.lock');
  try {
    // Check for stale lock (older than timeout)
    if (fs.existsSync(lockPath)) {
      const lockStat = fs.statSync(lockPath);
      if (Date.now() - lockStat.mtimeMs > LOCK_TIMEOUT_MS) {
        try {
          fs.unlinkSync(lockPath); // Remove stale lock
          debug('swap-engine', 'Removed stale lock');
        } catch (e) {
          // Another process may have removed it - continue to acquire
        }
        // Re-check: another process may have grabbed the lock after we removed stale
        if (fs.existsSync(lockPath)) {
          debug('swap-engine', 'Lock acquired by another process after stale removal');
          return false;
        }
      } else {
        debug('swap-engine', 'Lock held by another process');
        return false;
      }
    }
    // Create lock file with exclusive flag
    fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
    return true;
  } catch (err) {
    if (err.code === 'EEXIST') return false; // Lock already exists
    debug('swap-engine', `Lock acquire error: ${err.message}`);
    return false;
  }
}

function releaseLock(sessionDir) {
  const lockPath = path.join(sessionDir, '.lock');
  try {
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
  } catch (err) {
    debug('swap-engine', `Lock release error: ${err.message}`);
  }
}

function readIndex(sessionDir) {
  const indexPath = path.join(sessionDir, 'index.json');
  try {
    if (fs.existsSync(indexPath)) return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch (err) {
    debug('swap-engine', `Index read error: ${err.message}`);
  }
  return { entries: {}, totalEntries: 0, totalBytes: 0 };
}

function writeIndex(sessionDir, index) {
  try {
    fs.writeFileSync(path.join(sessionDir, 'index.json'), JSON.stringify(index, null, 2), 'utf8');
  } catch (err) {
    debugError('swap-engine', err);
  }
}

async function externalize(sessionId, toolName, toolInput, toolResult) {
  const config = loadConfig();
  const sessionDir = ensureSwapDir(sessionId);
  const content = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2);

  // Acquire lock for index operations
  if (!acquireLock(sessionDir)) {
    debug('swap-engine', 'Could not acquire lock, skipping externalization');
    return null;
  }

  try {
    const index = readIndex(sessionDir);

    // Enforce limits before writing
    if (index.totalEntries >= config.limits.maxEntriesPerSession) {
      debug('swap-engine', `Max entries limit (${config.limits.maxEntriesPerSession}) reached, skipping`);
      return null;
    }

    if ((index.totalBytes || 0) + content.length > config.limits.maxTotalBytes) {
      debug('swap-engine', `Max total bytes limit (${config.limits.maxTotalBytes}) reached, skipping`);
      return null;
    }

    const swapId = generateSwapId(toolName, toolInput);
    const contentPath = path.join(sessionDir, `${swapId}.content`);
    const now = new Date().toISOString();

    const metadata = {
      id: swapId,
      tool: toolName,
      input: toolInput,
      metrics: { charCount: content.length, lineCount: content.split('\n').length, tokenEstimate: Math.ceil(content.length / 4) },
      summary: extractSummary(content, toolName),
      keyPatterns: extractKeyPatterns(content, toolName),
      timestamps: { capturedAt: now, expiresAt: new Date(Date.now() + MS_PER_DAY).toISOString() }
    };

    // Write content and metadata in parallel (async for large files)
    await Promise.all([
      fs.promises.writeFile(contentPath, content, 'utf8'),
      fs.promises.writeFile(path.join(sessionDir, `${swapId}.meta.json`), JSON.stringify(metadata, null, 2), 'utf8')
    ]);

    // Update index after files are written (sync - small file)
    index.entries[swapId] = { tool: toolName, summary: metadata.summary.slice(0, 100), charCount: content.length, capturedAt: now };
    index.totalEntries = Object.keys(index.entries).length;
    index.totalBytes = (index.totalBytes || 0) + content.length;
    index.lastUpdatedAt = now;
    writeIndex(sessionDir, index);

    debug('swap-engine', `Externalized ${toolName} output to ${swapId} (${content.length} chars)`);
    return { swapId, sessionDir, contentPath, metadata };
  } finally {
    releaseLock(sessionDir);
  }
}

function buildPointer(entry) {
  const { swapId, contentPath, metadata } = entry;
  const { charCount, tokenEstimate } = metadata.metrics;
  const filePath = contentPath.replace(/\\/g, '/');

  const patternsSection = metadata.keyPatterns.length
    ? `### Key Patterns\n${metadata.keyPatterns.map(p => `- \`${p}\``).join('\n')}\n`
    : '';

  return `
## External Memory Reference

| Field | Value |
|-------|-------|
| **ID** | \`${swapId}\` |
| **Tool** | ${metadata.tool} |
| **Input** | \`${formatInput(metadata.input)}\` |
| **Size** | ${charCount.toLocaleString()} chars (~${tokenEstimate.toLocaleString()} tokens) - externalized |

### Summary
${metadata.summary}

${patternsSection}### Retrieval
\`\`\`
Read: ${filePath}
\`\`\`

> Content externalized to preserve context. Use Read tool above to retrieve when needed.
`;
}

function formatInput(input) {
  if (!input) return '';
  const { file_path, path: p, pattern, command } = input;
  if (file_path) return file_path;
  if (p) return p;
  if (pattern) return `pattern: ${pattern}`;
  if (command) return command.length > 50 ? command.slice(0, 50) + '...' : command;
  const str = JSON.stringify(input);
  return str.length > 80 ? str.slice(0, 80) + '...' : str;
}

function getSwapEntries(sessionId) {
  const sessionDir = getSwapDir(sessionId);
  return Object.entries(readIndex(sessionDir).entries).map(([id, entry]) => ({
    id,
    tool: entry.tool,
    summary: entry.summary,
    charCount: entry.charCount,
    retrievePath: path.join(sessionDir, `${id}.content`).replace(/\\/g, '/')
  }));
}

function cleanupSwapFiles(sessionId, maxAgeHours = 24) {
  const sessionDir = getSwapDir(sessionId);
  if (!fs.existsSync(sessionDir)) return;

  // Acquire lock for index operations
  if (!acquireLock(sessionDir)) {
    debug('swap-engine', 'Could not acquire lock for cleanup, skipping');
    return;
  }

  try {
    const index = readIndex(sessionDir);
    const config = loadConfig();
    const retentionHours = Math.min(config.retention.defaultHours, maxAgeHours);
    let cleaned = 0;

    // Clean indexed entries
    for (const [id] of Object.entries(index.entries)) {
      const metaPath = path.join(sessionDir, `${id}.meta.json`);
      try {
        if (!fs.existsSync(metaPath)) {
          // Orphan index entry - remove from index
          delete index.entries[id];
          cleaned++;
          continue;
        }

        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        const ageHours = (Date.now() - new Date(meta.timestamps.capturedAt).getTime()) / MS_PER_HOUR;

        if (ageHours > retentionHours) {
          fs.unlinkSync(path.join(sessionDir, `${id}.content`));
          fs.unlinkSync(metaPath);
          delete index.entries[id];
          cleaned++;
        }
      } catch (err) {
        debug('swap-engine', `Cleanup error for ${id}: ${err.message}`);
      }
    }

    // Clean orphan files (not in index)
    try {
      const files = fs.readdirSync(sessionDir);
      const indexedIds = new Set(Object.keys(index.entries));
      for (const file of files) {
        if (file === 'index.json' || file === '.lock') continue;
        const match = file.match(/^([a-f0-9]+)\.(content|meta\.json)$/);
        if (match && !indexedIds.has(match[1])) {
          fs.unlinkSync(path.join(sessionDir, file));
          debug('swap-engine', `Cleaned orphan file: ${file}`);
          cleaned++;
        }
      }
    } catch (err) {
      debug('swap-engine', `Orphan cleanup error: ${err.message}`);
    }

    if (cleaned > 0) {
      index.totalEntries = Object.keys(index.entries).length;
      index.totalBytes = Object.values(index.entries).reduce((sum, e) => sum + (e.charCount || 0), 0);
      writeIndex(sessionDir, index);
      debug('swap-engine', `Cleaned up ${cleaned} swap files for session ${sessionId}`);
    }
  } finally {
    releaseLock(sessionDir);
  }
}

function deleteSessionSwap(sessionId) {
  const sessionDir = getSwapDir(sessionId);
  try {
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      debug('swap-engine', `Deleted swap directory for session ${sessionId}`);
    }
  } catch (err) {
    debugError('swap-engine', err);
  }
}

module.exports = {
  loadConfig,
  DEFAULT_CONFIG,
  deepMerge,
  acquireLock,
  releaseLock,
  shouldExternalize,
  generateSwapId,
  externalize,
  buildPointer,
  extractSummary,
  extractKeyPatterns,
  readIndex,
  writeIndex,
  getSwapEntries,
  cleanupSwapFiles,
  deleteSessionSwap
};
