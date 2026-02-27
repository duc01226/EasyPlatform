#!/usr/bin/env node
'use strict';

/**
 * Post-Edit Rule Verification Hook (PostToolUse: Edit|Write|MultiEdit)
 *
 * Closes the feedback loop: context injectors teach rules before edits;
 * this hook verifies compliance after edits and emits soft reminders.
 *
 * Reads the ACTUAL edited file from disk (not new_string snippets) so
 * regex patterns have full class/method context. Supports negative patterns
 * to reduce false positives.
 *
 * Advisory only — always exits 0.
 *
 * @module post-edit-rule-check
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const { parseStdinSync } = require('./lib/stdin-parser.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// RULES TABLE
// ═══════════════════════════════════════════════════════════════════════════

const RULES = [
  {
    id: 'raw-httpclient',
    ext: ['.ts'],
    pattern: /HttpClient/,
    negativePattern: /extends\s+PlatformApiService/,
    message: 'Use PlatformApiService, not HttpClient directly'
  },
  {
    id: 'missing-untilDestroyed',
    ext: ['.ts'],
    pattern: /\.subscribe\s*\(/,
    negativePattern: /untilDestroyed\(\)/,
    message: 'Missing .pipe(untilDestroyed()) before .subscribe()'
  },
  {
    id: 'throw-validation',
    ext: ['.cs'],
    pattern: /throw\s+new\s+.*ValidationException/,
    message: 'Use PlatformValidationResult fluent API, never throw ValidationException'
  },
  {
    id: 'side-effect-in-handler',
    ext: ['.cs'],
    // Scoped: match CommandHandler class name followed by SendAsync/PublishAsync
    // within ~2000 chars (avoids crossing class boundaries in multi-class files)
    pattern: /class\s+\w+CommandHandler[\s\S]{0,2000}?(SendAsync|PublishAsync)/,
    negativePattern: /class\s+\w+EventHandler/,
    message: 'Side effects belong in Entity Event Handlers, not command handlers'
  },
  {
    id: 'dto-mapping-in-handler',
    ext: ['.cs'],
    // Scoped: match CommandHandler (not QueryHandler) with MapTo within ~2000 chars
    pattern: /class\s+\w+CommandHandler[\s\S]{0,2000}?\.MapTo(Entity|Object)/,
    message: 'DTO owns mapping — call MapToEntity()/MapToObject() from DTO layer'
  },
  {
    id: 'raw-component',
    ext: ['.ts'],
    pattern: /extends\s+PlatformComponent\b/,
    negativePattern: /extends\s+AppBase/,
    message: 'Extend AppBaseComponent, not PlatformComponent directly'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// EXEMPT PATHS
// ═══════════════════════════════════════════════════════════════════════════

const EXEMPT_PATH_PATTERNS = [
  /(^|[/\\])\.claude[/\\]/,
  /(^|[/\\])plans[/\\]/,
  /(^|[/\\])docs[/\\]/,
  /(^|[/\\])node_modules[/\\]/,
  /\.md$/i
];

const MAX_FILE_SIZE = 100 * 1024; // 100KB

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getSessionDir() {
  const id = process.env.CLAUDE_SESSION_ID || process.env.CK_SESSION_ID || 'unknown';
  return path.join(os.tmpdir(), 'ck', id);
}

/**
 * Read a JSON file from the session directory, returning fallback on any error.
 */
function readSessionJson(filename, fallback) {
  try {
    const p = path.join(getSessionDir(), filename);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch { return fallback; }
}

/**
 * Write a JSON object to a file in the session directory. Fail-open.
 */
function writeSessionJson(filename, data) {
  try {
    const dir = getSessionDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), JSON.stringify(data));
  } catch {} // Fail-open
}

function loadFiredRules() {
  return readSessionJson('rule-violations.json', {});
}

function markRuleFired(ruleId) {
  const fired = loadFiredRules();
  fired[ruleId] = new Date().toISOString();
  writeSessionJson('rule-violations.json', fired);
}

function isExemptPath(filePath) {
  if (!filePath) return true;
  const normalized = filePath.replace(/\\/g, '/');
  return EXEMPT_PATH_PATTERNS.some(p => p.test(normalized));
}

function extractFilePath(payload) {
  const input = payload.tool_input || {};
  return input.file_path || input.filePath || '';
}

function readEditedFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_FILE_SIZE) return null;
    return fs.readFileSync(filePath, 'utf-8');
  } catch { return null; }
}

function checkRules(fileContent, ext) {
  return RULES.filter(r =>
    r.ext.includes(ext) &&
    r.pattern.test(fileContent) &&
    (!r.negativePattern || !r.negativePattern.test(fileContent))
  );
}

function buildAdvisory(violations) {
  const items = violations.map(v =>
    `- **${v.id}**: ${v.message}`
  ).join('\n');

  return `
## Post-Edit Rule Check

The following patterns were detected in the edited file:

${items}

These are advisory reminders based on CLAUDE.md rules. Not blocking.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MEASUREMENT
// ═══════════════════════════════════════════════════════════════════════════

function incrementSessionCounter(violationCount) {
  const metrics = readSessionJson('violation-metrics.json', {});
  metrics.totalEditsChecked = (metrics.totalEditsChecked || 0) + 1;
  metrics.totalViolations = (metrics.totalViolations || 0) + violationCount;
  metrics.lastUpdated = new Date().toISOString();
  writeSessionJson('violation-metrics.json', metrics);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

try {
  const payload = parseStdinSync({ context: 'post-edit-rule-check' });
  if (!payload) process.exit(0);

  const toolName = payload.tool_name || '';
  if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) {
    process.exit(0);
  }

  const filePath = extractFilePath(payload);
  if (!filePath || isExemptPath(filePath)) {
    process.exit(0);
  }

  const ext = path.extname(filePath).toLowerCase();
  if (!['.ts', '.cs'].includes(ext)) {
    process.exit(0);
  }

  const fileContent = readEditedFile(filePath);
  if (!fileContent) {
    process.exit(0);
  }

  const violations = checkRules(fileContent, ext);

  // Measurement: always count edits checked
  incrementSessionCounter(violations.length);

  if (violations.length === 0) {
    process.exit(0);
  }

  // Dedup: only emit advisory for rules not yet fired this session
  const firedRules = loadFiredRules();
  const newViolations = violations.filter(v => !firedRules[v.id]);

  if (newViolations.length === 0) {
    process.exit(0);
  }

  // Mark fired and record frequency
  for (const v of newViolations) {
    markRuleFired(v.id);
    try {
      require('./lib/lessons-writer.cjs').recordLessonFrequency(v.id, v.message);
    } catch {} // Phase 3 may not be deployed yet
  }

  console.log(buildAdvisory(newViolations));
  process.exit(0);
} catch (error) {
  // Fail-open: always exit 0
  process.exit(0);
}
