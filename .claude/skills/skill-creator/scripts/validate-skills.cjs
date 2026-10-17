#!/usr/bin/env node

/**
 * validate-skills.cjs
 *
 * Scans all SKILL.md files, validates YAML frontmatter against official Claude Code schema,
 * reports invalid fields, and optionally fixes them (--fix flag).
 *
 * Usage:
 *   node .claude/skills/skill-creator/scripts/validate-skills.cjs           # Report only
 *   node .claude/skills/skill-creator/scripts/validate-skills.cjs --fix     # Report + auto-fix
 *   node .claude/skills/skill-creator/scripts/validate-skills.cjs --path <dir>  # Scan specific dir
 *
 * Official schema: https://code.claude.com/docs/en/skills
 */

const fs = require('fs');
const path = require('path');

// The validator is also a portable release artifact: users may copy this
// script (and a skills tree) without the rest of this repository.  Prefer the
// project's shared root resolver when it is available, but never make that
// repository-only helper a hard runtime dependency.
let resolveProjectRoot;
try {
  ({ resolveProjectRoot } = require('../../../scripts/lib/project-root.cjs'));
} catch (_) {
  resolveProjectRoot = null;
}

function fallbackProjectRoot({ cwd, env, mutation = false }) {
  const explicit = env && typeof env.CLAUDE_PROJECT_DIR === 'string'
    ? env.CLAUDE_PROJECT_DIR.trim()
    : '';
  if (explicit && mutation) {
    if (!path.isAbsolute(explicit)) throw new Error('CLAUDE_PROJECT_DIR must be an absolute path');
    let exists = false;
    try { exists = fs.statSync(explicit).isDirectory(); } catch (_) {}
    if (!exists) throw new Error('CLAUDE_PROJECT_DIR must name an existing directory');
  }
  if (explicit && path.isAbsolute(explicit)) return path.resolve(explicit);

  let current = path.resolve(cwd || process.cwd());
  while (true) {
    if (fs.existsSync(path.join(current, '.claude'))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(cwd || process.cwd());
}

// --- Configuration ---
const args = process.argv.slice(2);
const FIX_MODE = args.includes('--fix');
// Contents lists are body text, so writing them is a separate, explicit request.
const FIX_CONTENTS = args.includes('--fix-contents');
const MUTATES = FIX_MODE || FIX_CONTENTS;
let PROJECT_ROOT;
try {
  if (resolveProjectRoot) {
    const resolution = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env });
    if (MUTATES && resolution.error) throw new Error(resolution.error);
    PROJECT_ROOT = resolution.rootDir;
  } else {
    PROJECT_ROOT = fallbackProjectRoot({ cwd: process.cwd(), env: process.env, mutation: MUTATES });
  }
} catch (error) {
  if (MUTATES) {
    console.error(`Refusing to fix skills: ${error.message}`);
    process.exit(2);
  }
  PROJECT_ROOT = fallbackProjectRoot({ cwd: process.cwd(), env: process.env });
}
const pathArg = args.indexOf('--path');
const requestedScan = pathArg !== -1 && args[pathArg + 1]
  ? path.resolve(PROJECT_ROOT, args[pathArg + 1])
  : path.resolve(PROJECT_ROOT, '.claude/skills');

function canonicalIfPresent(target) {
  try { return fs.realpathSync.native(target); } catch (_) { return path.resolve(target); }
}

function isWithin(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

const PROJECT_ROOT_CANONICAL = canonicalIfPresent(PROJECT_ROOT);
const SCAN_DIR = canonicalIfPresent(requestedScan);
if (!isWithin(PROJECT_ROOT_CANONICAL, SCAN_DIR)) {
  console.error(`Refusing to scan outside project root: ${requestedScan}`);
  process.exit(2);
}

// Official Claude Code SKILL.md frontmatter fields
// Source: https://code.claude.com/docs/en/skills
// The fields the Claude Code skills reference documents (https://code.claude.com/docs/en/skills).
// Re-read that page before changing this list; `metadata` is the host's own free-form map.
const VALID_FIELDS = new Set([
  'name',
  'description',
  'when_to_use',
  'argument-hint',
  'arguments',
  'disable-model-invocation',
  'user-invocable',
  'allowed-tools',
  'disallowed-tools',
  'model',
  'effort',
  'context',
  'agent',
  'background',
  'hooks',
  'paths',
  'shell',
  'metadata',
  'license',
  'compatibility',
]);

// --- Project-configurable convention fields (portability) ---
// This script ships GENERIC. Project-specific frontmatter conventions (version,
// triggers, execution-mode, etc.) are NOT hardcoded — they are declared per-project
// in `docs/project-config.json` under `skillConventions`, so the same validator drops
// into any repo without source edits. With no config, only the official Anthropic
// schema is accepted (strict mode) plus the universal deprecation/typo fixes below.
//
// project-config.json shape:
//   "skillConventions": {
//     "conventionFields": ["version", "activation", "triggers"],  // → INFO, not ERROR
//     "removableFields":  ["infer"],                              // → WARN + (--fix) remove
//     "fieldFixes":       { "tools": "allowed-tools" }            // → WARN + (--fix) rename
//   }

// Universal defaults — these are objectively-wrong fields, not project taste:
// `infer` is a deprecated Claude field; `tools` is the canonical typo for `allowed-tools`.
const DEFAULT_REMOVABLE_FIELDS = ['infer'];
const DEFAULT_FIELD_FIXES = { 'tools': 'allowed-tools' };
// Lifecycle metadata is consumed by the portable catalog/GC tooling itself,
// so it is a framework convention rather than an unknown vendor field. The
// validator still validates its values below; accepting the names must not
// turn malformed lifecycle state into a silent pass.
const DEFAULT_LIFECYCLE_FIELDS = ['status', 'deprecated_by', 'deprecated_since', 'removal_after'];
const LIFECYCLE_STATUSES = new Set(['active', 'deprecated', 'experimental']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// Other convention fields remain fully project-driven.
const DEFAULT_CONVENTION_FIELDS = [];

/**
 * Load skill-convention config from the project's project-config.json.
 * Honors the configured portability path (.ck.json portability.projectConfigPath)
 * when the hooks loader is present; otherwise falls back to docs/project-config.json.
 * Degrades to generic defaults when no config exists — works in any project.
 */
function loadSkillConventions() {
  let configPath = path.resolve(PROJECT_ROOT, 'docs/project-config.json');
  try {
    const loader = require(path.resolve(PROJECT_ROOT, '.claude/hooks/lib/project-config-loader.cjs'));
    if (loader && loader.CONFIG_PATH) configPath = loader.CONFIG_PATH;
  } catch { /* hooks loader absent — use default path */ }

  let sc = {};
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (cfg && typeof cfg.skillConventions === 'object') sc = cfg.skillConventions;
  } catch { /* no/invalid config — generic defaults only */ }

  const convention = Array.isArray(sc.conventionFields) ? sc.conventionFields : [];
  const removable = Array.isArray(sc.removableFields) ? sc.removableFields : [];
  const fixes = (sc.fieldFixes && typeof sc.fieldFixes === 'object') ? sc.fieldFixes : {};

  return {
    conventionFields: new Set([...DEFAULT_CONVENTION_FIELDS, ...DEFAULT_LIFECYCLE_FIELDS, ...convention]),
    removableFields: new Set([...DEFAULT_REMOVABLE_FIELDS, ...removable]),
    fieldFixes: { ...DEFAULT_FIELD_FIXES, ...fixes },
    configPath,
    configured: Object.keys(sc).length > 0,
  };
}

const SKILL_CONVENTIONS = loadSkillConventions();
// Project convention fields → flagged INFO, not ERROR.
const PROJECT_CONVENTION_FIELDS = SKILL_CONVENTIONS.conventionFields;
// Removable fields → WARN, removed by --fix.
const REMOVABLE_FIELDS = SKILL_CONVENTIONS.removableFields;
// Field typos/aliases → WARN, renamed by --fix.
const FIELD_FIXES = SKILL_CONVENTIONS.fieldFixes;

// --- Helpers ---

/**
 * Parse YAML frontmatter from SKILL.md content.
 * Returns { fields: Map<string, {line, value, lines}>, startLine, endLine, raw, allLines }
 */
function parseFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0].trim() !== '---') return null;

  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return null;

  const fields = new Map();
  let currentField = null;

  for (let i = 1; i < endIdx; i++) {
    const line = lines[i];
    const fieldMatch = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (fieldMatch) {
      currentField = fieldMatch[1];
      fields.set(currentField, { line: i, value: fieldMatch[2], lines: [i] });
    } else if (currentField && (line.startsWith('  ') || line.startsWith('\t'))) {
      const existing = fields.get(currentField);
      if (existing) existing.lines.push(i);
    }
  }

  return {
    fields,
    startLine: 0,
    endLine: endIdx,
    raw: lines.slice(0, endIdx + 1).join('\n'),
    allLines: lines,
  };
}

/**
 * Find all SKILL.md files recursively.
 */
function findSkillFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // `_templates/template-skill` is a scaffolding source, not a runnable
      // skill. The catalog and scan_skills.py exclude it, so the validator must
      // share that inventory boundary instead of reporting a phantom skill.
      if (entry.name === 'node_modules' || entry.name.startsWith('.') || entry.name === 'template-skill') continue;
      results.push(...findSkillFiles(fullPath));
    } else if (entry.name === 'SKILL.md') {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Check if description spans multiple YAML lines (breaks catalog parsing).
 */
function isMultilineDescription(fm) {
  const desc = fm.fields.get('description');
  if (!desc) return false;
  return desc.lines.length > 1;
}

function scalarFieldValue(fm, field) {
  const entry = fm.fields.get(field);
  if (!entry) return null;
  const value = String(entry.value || '').trim();
  if (!value || /^null$/i.test(value) || /^~$/.test(value)) return null;
  return value.replace(/^(['"])(.*)\1$/, '$2');
}

function isIsoCalendarDate(value) {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Validate the lifecycle metadata consumed by generate_catalogs.py/scan_skills.py.
 * These fields are framework conventions, but malformed lifecycle state must
 * fail rather than silently changing catalog inclusion or deprecation timing.
 */
function validateLifecycle(fm, result) {
  const status = scalarFieldValue(fm, 'status') || 'active';
  if (!LIFECYCLE_STATUSES.has(status)) {
    result.issues.push({
      severity: 'error', field: 'status',
      message: `Unknown lifecycle status "${status}" — expected active, deprecated, or experimental`,
    });
  }

  const deprecatedBy = scalarFieldValue(fm, 'deprecated_by');
  const deprecatedSince = scalarFieldValue(fm, 'deprecated_since');
  const removalAfter = scalarFieldValue(fm, 'removal_after');

  if (status === 'deprecated' && !deprecatedBy) {
    result.issues.push({ severity: 'error', field: 'deprecated_by', message: 'Deprecated skills must name a replacement in deprecated_by' });
  }
  if (status !== 'deprecated' && (deprecatedBy || deprecatedSince || removalAfter)) {
    result.issues.push({
      severity: 'error', field: 'status',
      message: 'deprecated_by, deprecated_since, and removal_after require status: deprecated',
    });
  }

  for (const [field, value] of [['deprecated_since', deprecatedSince], ['removal_after', removalAfter]]) {
    if (value && !isIsoCalendarDate(value)) {
      result.issues.push({ severity: 'error', field, message: `Lifecycle field "${field}" must use ISO date YYYY-MM-DD` });
    }
  }
  if (deprecatedSince && removalAfter && isIsoCalendarDate(deprecatedSince) && isIsoCalendarDate(removalAfter) && removalAfter < deprecatedSince) {
    result.issues.push({ severity: 'error', field: 'removal_after', message: 'removal_after must not precede deprecated_since' });
  }
}

/**
 * Indexes of the lines outside fenced code, from `start`. Fenced content is sample output or
 * data: it carries no live SYNC fence and no section heading.
 */
function* unfencedLineIndexes(lines, start = 0) {
  let fence = null;
  for (let index = start; index < lines.length; index++) {
    const trimmedLine = lines[index].trimStart();
    let fenceLength = 0;
    if (trimmedLine.startsWith('```') || trimmedLine.startsWith('~~~')) {
      const marker = trimmedLine[0];
      while (trimmedLine[fenceLength] === marker) fenceLength++;
      if (fenceLength >= 3 && !fence) fence = { marker, length: fenceLength };
      else if (fence && fence.marker === marker && fenceLength >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    yield index;
  }
}

/**
 * Report structural body issues without adding destructive auto-fixes.
 */
function validateBody(fm, result) {
  const summaryIndex = fm.allLines.findIndex((line, index) =>
    index > fm.endLine && /^## Quick Summary\s*$/.test(line));
  if (summaryIndex === -1 || summaryIndex >= 30) {
    result.issues.push({
      severity: 'warn', field: null,
      message: `Quick Summary must appear in the first 30 lines (${summaryIndex === -1 ? 'missing' : `found at line ${summaryIndex + 1}`})`,
    });
  }

  const stack = [];
  for (const index of unfencedLineIndexes(fm.allLines, fm.endLine + 1)) {
    // Standalone fences only: inline examples and fenced code samples are
    // prose/data, not live protocol carriers.
    const match = fm.allLines[index].match(/^<!--\s*(\/?)SYNC:([^\s<>]+)\s*-->\s*$/);
    if (!match) continue;

    const [, closing, tag] = match;
    const line = index + 1;
    if (!closing) {
      stack.push({ tag, line });
      continue;
    }

    const expected = stack[stack.length - 1];
    if (!expected) {
      result.issues.push({ severity: 'error', field: null, message: `Unexpected SYNC close "${tag}" at line ${line}` });
    } else if (expected.tag !== tag) {
      result.issues.push({
        severity: 'error', field: null,
        message: `Mismatched SYNC close "${tag}" at line ${line}; expected "${expected.tag}" opened at line ${expected.line}`,
      });
    } else {
      stack.pop();
    }
  }

  for (const { tag, line } of stack) {
    result.issues.push({ severity: 'error', field: null, message: `Unclosed SYNC tag "${tag}" opened at line ${line}` });
  }
}

// --- Contents list of long skill files ---
// A skill file over 100 lines lists its contents inside its first 100 lines: an agent that previews
// the file, or keeps only its start after compaction, still sees the full scope and knows what to
// re-read. The rule covers SKILL.md and every Markdown file the skill bundles. Vendored package
// documents under node_modules are third-party and are not inspected.
//
// This file owns what a correct list is, so the check and the writer cannot disagree: one linked
// entry per section, flat, in document order. `--fix-contents` writes a missing list (after Quick
// Summary in SKILL.md, before the first section elsewhere) and rewrites a stale one in place.
const CONTENTS_LINE_LIMIT = 100;
const CONTENTS_HEADING = /^#{1,3}\s+(?:table of )?contents\s*$/i;

/**
 * The text a Markdown renderer hands to its anchor generator: inline code kept literally,
 * emphasis, link and HTML syntax dropped.
 */
function headingText(text) {
  const codes = [];
  let out = text.replace(/(`+)(.+?)\1/g, (_, __, inner) => {
    codes.push(inner);
    return `\u0000${codes.length - 1}\u0000`;
  });
  out = out.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, '');
  out = out.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1');
  out = out.replace(/(^|[^\w*])\*(?=\S)(.+?)(?<=\S)\*(?!\w)/g, '$1$2').replace(/(^|[^\w])_(?=\S)(.+?)(?<=\S)_(?!\w)/g, '$1$2');
  out = out.replace(/\\([\\`*_{}\[\]()#+\-.!|<>~])/g, '$1');
  return out.replace(/\u0000(\d+)\u0000/g, (_, n) => codes[Number(n)]);
}

/**
 * Headings outside front matter and fenced code, each with the anchor a renderer gives it:
 * lower case, word characters, hyphens and spaces kept, spaces turned into hyphens, repeats numbered.
 */
function documentHeadings(lines) {
  let start = 0;
  if (lines.length && lines[0].trim() === '---') {
    const close = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
    if (close > 0) start = close + 1;
  }
  const seen = new Map();
  const headings = [];
  for (const index of unfencedLineIndexes(lines, start)) {
    const match = lines[index].match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const base = headingText(match[2]).trim().toLowerCase()
      .replace(/[^\p{Alphabetic}\p{M}\p{Nd}\p{Pc}\- ]/gu, '').replace(/ /g, '-');
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    headings.push({ level: match[1].length, text: match[2], line: index, anchor: count ? `${base}-${count}` : base });
  }
  return headings;
}

/**
 * The list a file should carry. Sections are the headings at the file's shallowest level below
 * its title; a file that uses several first-level headings lists its first and second level.
 * When that gives fewer than three entries, the next level present is listed too.
 */
function expectedContents(lines) {
  const headings = documentHeadings(lines);
  const contents = headings.find(heading => CONTENTS_HEADING.test(lines[heading.line])) || null;
  const title = headings.length && headings[0].level === 1 ? headings[0] : null;
  const body = headings.filter(heading => heading !== title && heading !== contents);
  if (body.length === 0) return { contents, entries: [], list: [] };

  const top = Math.min(...body.map(heading => heading.level));
  let limit = top === 1 ? 2 : top;
  let entries = body.filter(heading => heading.level <= limit);
  if (entries.length < 3) {
    const deeper = body.filter(heading => heading.level > limit);
    if (deeper.length) {
      limit = Math.min(...deeper.map(heading => heading.level));
      entries = body.filter(heading => heading.level <= limit);
    }
  }
  const list = entries.map(heading => `- [${heading.text.replace(/\[/g, '\\[').replace(/\]/g, '\\]')}](#${heading.anchor})`);
  return { contents, entries, list };
}

/** The lines a list occupies: the blank lines and list items that follow its heading. */
function contentsRegion(lines, contents) {
  let end = contents.line + 1;
  while (end < lines.length && (lines[end].trim() === '' || /^\s*[-*+] /.test(lines[end]))) end++;
  return { start: contents.line + 1, end };
}

/**
 * Where a missing list goes: before the section that follows Quick Summary in SKILL.md, before the
 * first section elsewhere, and never inside a marker-delimited block that a sync tool owns.
 */
function contentsInsertionLine(lines, entries, isEntryFile) {
  const summary = isEntryFile
    ? entries.findIndex(heading => /^quick summary$/i.test(headingText(heading.text).trim()))
    : -1;
  const anchor = entries[summary + 1];
  if (!anchor) return -1;

  const open = [];
  for (let index = 0; index < anchor.line; index++) {
    const begin = lines[index].match(/^<!--\s*([A-Z][A-Z0-9-]*(?::[A-Za-z0-9-]+)*):START\s*-->\s*$/)
      || lines[index].match(/^<!--\s*(SYNC:[^\s/]+)\s*-->\s*$/);
    const finish = lines[index].match(/^<!--\s*([A-Z][A-Z0-9-]*(?::[A-Za-z0-9-]+)*):END\s*-->\s*$/)
      || lines[index].match(/^<!--\s*\/(SYNC:[^\s]+)\s*-->\s*$/);
    if (begin) open.push({ tag: begin[1], line: index });
    else if (finish) {
      const position = open.map(block => block.tag).lastIndexOf(finish[1]);
      if (position !== -1) open.splice(position, 1);
    }
  }
  return open.length ? open[0].line : anchor.line;
}

/**
 * Returns { message, fixed } for a file whose list is missing, late or stale, or null.
 * `fixed` is the corrected file text when the list can be written mechanically.
 */
function contentsIssue(content, isEntryFile = false) {
  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  const trailingNewline = lines[lines.length - 1] === '';
  if (trailingNewline) lines.pop();
  const long = lines.length > CONTENTS_LINE_LIMIT;

  const { contents, entries, list } = expectedContents(lines);
  const finish = body => body.join(newline) + (trailingNewline ? newline : '');

  if (!contents) {
    if (!long) return null;
    const message = `Contents list must appear in the first ${CONTENTS_LINE_LIMIT} lines of a file over ${CONTENTS_LINE_LIMIT} lines (missing)`;
    const at = contentsInsertionLine(lines, entries, isEntryFile);
    if (at === -1) return { message, fixed: null };
    const before = lines.slice(0, at);
    while (before.length && before[before.length - 1].trim() === '') before.pop();
    if (before.length + 1 >= CONTENTS_LINE_LIMIT) return { message, fixed: null };
    return { message, fixed: finish([...before, '', '## Contents', '', ...list, '', ...lines.slice(at)]) };
  }

  if (long && contents.line >= CONTENTS_LINE_LIMIT) {
    return {
      message: `Contents list must appear in the first ${CONTENTS_LINE_LIMIT} lines of a file over ${CONTENTS_LINE_LIMIT} lines (found at line ${contents.line + 1})`,
      fixed: null,
    };
  }

  const region = contentsRegion(lines, contents);
  const current = lines.slice(region.start, region.end).filter(line => line.trim() !== '');
  if (current.length === list.length && current.every((line, index) => line === list[index])) return null;
  const firstDifference = list.find((line, index) => line !== current[index]) || current[list.length] || '';
  return {
    message: `Contents list does not match the headings (first difference: ${firstDifference.slice(0, 80)}); run with --fix-contents`,
    fixed: finish([...lines.slice(0, region.start), '', ...list, '', ...lines.slice(region.end)]),
  };
}

/**
 * Markdown files a skill bundles beside its SKILL.md, without vendored packages.
 */
function bundledMarkdown(dir, skipped) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      results.push(...bundledMarkdown(fullPath, skipped));
    } else if (entry.name.endsWith('.md') && entry.name !== 'SKILL.md') {
      // Never dereference symbolic links or open devices/pipes during a contents audit.
      if (entry.isFile()) results.push(fullPath);
      else skipped.push(fullPath);
    }
  }
  return results.sort();
}

function validateContents(filePath, content, result) {
  const skillDir = path.dirname(filePath);
  const report = (file, text, isEntryFile) => {
    const issue = contentsIssue(text, isEntryFile);
    if (!issue) return;
    const name = isEntryFile ? '' : `${path.relative(skillDir, file).replace(/\\/g, '/')}: `;
    result.issues.push({ severity: 'warn', field: null, message: `${name}${issue.message}` });
    if (issue.fixed !== null) result.contentsFixes.push({ file, text: issue.fixed });
  };

  report(filePath, content, true);
  const skipped = [];
  const files = bundledMarkdown(skillDir, skipped);
  for (const bundled of skipped) {
    const name = path.relative(skillDir, bundled).replace(/\\/g, '/');
    result.issues.push({ severity: 'warn', field: null, message: `${name}: Contents not inspected (non-regular Markdown entry)` });
  }
  for (const bundled of files) report(bundled, fs.readFileSync(bundled, 'utf-8'), false);
}

/**
 * Validate a single SKILL.md file.
 * Returns { path, issues[], fixes[] }
 */
function validateSkill(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  const result = { path: relPath, issues: [], fixes: [], contentsFixes: [] };

  const fm = parseFrontmatter(content);
  if (!fm) {
    result.issues.push({ severity: 'error', field: null, message: 'No YAML frontmatter found' });
    return result;
  }

  validateBody(fm, result);
  validateContents(filePath, content, result);
  validateLifecycle(fm, result);

  // Missing description
  if (!fm.fields.has('description')) {
    result.issues.push({ severity: 'warn', field: 'description', message: 'Missing description (recommended for auto-activation)' });
  }

  // Multi-line description (breaks catalog parsing)
  if (isMultilineDescription(fm)) {
    result.issues.push({
      severity: 'error',
      field: 'description',
      message: 'Multi-line description detected — catalog parsing may fail. Collapse to single-line quoted string.',
    });
  }

  // Description without category prefix
  if (fm.fields.has('description')) {
    const descVal = fm.fields.get('description').value || '';
    const stripped = descVal.replace(/^['"]/, '');
    if (stripped && !stripped.startsWith('[')) {
      result.issues.push({
        severity: 'info',
        field: 'description',
        message: 'Description missing [Category] prefix (convention: start with [Category])',
      });
    }
  }

  // Name format check
  if (fm.fields.has('name')) {
    const nameVal = fm.fields.get('name').value || '';
    const cleanName = nameVal.replace(/^['"]|['"]$/g, '');
    if (cleanName && !/^[a-z0-9][a-z0-9-]*$/.test(cleanName)) {
      result.issues.push({
        severity: 'error',
        field: 'name',
        message: `Invalid name "${cleanName}" — must be lowercase, hyphens, start with letter/number`,
      });
    }
    if (cleanName.length > 64) {
      result.issues.push({
        severity: 'error',
        field: 'name',
        message: `Name exceeds 64 chars (${cleanName.length})`,
      });
    }
  }

  // Check each field against schema
  for (const [field] of fm.fields) {
    if (VALID_FIELDS.has(field)) continue;

    if (PROJECT_CONVENTION_FIELDS.has(field)) {
      result.issues.push({
        severity: 'info',
        field,
        message: `Field "${field}" — project convention, not in official schema (OK for this project)`,
      });
    } else if (REMOVABLE_FIELDS.has(field)) {
      result.issues.push({
        severity: 'warn',
        field,
        message: `Field "${field}" — not in official schema, ignored by runtime`,
      });
      result.fixes.push({ action: 'remove', field });
    } else if (field in FIELD_FIXES) {
      result.issues.push({
        severity: 'warn',
        field,
        message: `Field "${field}" — did you mean "${FIELD_FIXES[field]}"?`,
      });
      result.fixes.push({ action: 'rename', field, newField: FIELD_FIXES[field] });
    } else {
      result.issues.push({
        severity: 'error',
        field,
        message: `Unknown field "${field}" — not in official schema`,
      });
    }
  }

  // Check for infer→description migration
  if (fm.fields.has('infer') && fm.fields.has('description')) {
    const desc = fm.fields.get('description').value || '';
    if (!desc.toLowerCase().includes('trigger')) {
      result.issues.push({
        severity: 'info',
        field: 'infer',
        message: 'Consider moving infer keywords into description "Triggers on: ..." for auto-activation',
      });
    }
  }

  return result;
}

/**
 * Apply fixes to a SKILL.md file.
 */
function applyFixes(filePath, fixes) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fm = parseFrontmatter(content);
  if (!fm) return false;

  const linesToRemove = new Set();

  for (const fix of fixes) {
    const fieldInfo = fm.fields.get(fix.field);
    if (!fieldInfo) continue;

    if (fix.action === 'remove') {
      for (const lineIdx of fieldInfo.lines) {
        linesToRemove.add(lineIdx);
      }
    } else if (fix.action === 'rename') {
      const lineIdx = fieldInfo.line;
      lines[lineIdx] = lines[lineIdx].replace(
        new RegExp(`^${fix.field}:`),
        `${fix.newField}:`
      );
    }
  }

  const sortedRemoves = [...linesToRemove].sort((a, b) => b - a);
  for (const idx of sortedRemoves) {
    lines.splice(idx, 1);
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  return true;
}

// --- Main ---

function main() {
  console.log(`Scanning skills in: ${SCAN_DIR}`);
  console.log(`Mode: ${MUTATES ? 'REPORT + FIX' : 'REPORT ONLY'}\n`);

  const skillFiles = findSkillFiles(SCAN_DIR);
  console.log(`Found ${skillFiles.length} SKILL.md files\n`);

  let totalIssues = 0;
  let totalFixed = 0;
  let totalContentsWritten = 0;
  let errorCount = 0;
  let warnCount = 0;
  let infoCount = 0;
  const results = [];

  for (const filePath of skillFiles) {
    const result = validateSkill(filePath);
    results.push(result);

    if (result.issues.length === 0) continue;

    totalIssues += result.issues.length;
    for (const issue of result.issues) {
      if (issue.severity === 'error') errorCount++;
      else if (issue.severity === 'warn') warnCount++;
      else infoCount++;
    }

    console.log(`${result.path}:`);
    for (const issue of result.issues) {
      const icon = issue.severity === 'error' ? 'ERROR' : issue.severity === 'warn' ? 'WARN' : 'INFO';
      console.log(`  [${icon}] ${issue.message}`);
    }

    if (FIX_CONTENTS && result.contentsFixes.length > 0) {
      for (const fix of result.contentsFixes) fs.writeFileSync(fix.file, fix.text);
      totalContentsWritten += result.contentsFixes.length;
      console.log(`  WROTE: ${result.contentsFixes.length} contents list(s)`);
    }

    if (FIX_MODE && result.fixes.length > 0) {
      const applied = applyFixes(filePath, result.fixes);
      if (applied) {
        totalFixed += result.fixes.length;
        console.log(`  FIXED: ${result.fixes.map(f => `${f.action} "${f.field}"`).join(', ')}`);
      }
    }
    console.log('');
  }

  // Summary
  console.log('--- Summary ---');
  console.log(`Skills scanned: ${skillFiles.length}`);
  console.log(`Skills with issues: ${results.filter(r => r.issues.length > 0).length}`);
  console.log(`Total issues: ${totalIssues} (${errorCount} errors, ${warnCount} warnings, ${infoCount} info)`);
  if (FIX_MODE) console.log(`Fixes applied: ${totalFixed}`);
  if (FIX_CONTENTS) console.log(`Contents lists written: ${totalContentsWritten}`);

  console.log('\nValid frontmatter fields (official schema):');
  console.log(`  ${[...VALID_FIELDS].join(', ')}`);
  const conv = [...PROJECT_CONVENTION_FIELDS];
  console.log(`Project convention fields (accepted): ${conv.length ? conv.join(', ') : '(none — strict mode)'}`);
  console.log(`  Source: ${SKILL_CONVENTIONS.configured ? SKILL_CONVENTIONS.configPath + ' (skillConventions)' : 'generic defaults — no project-config.json skillConventions block'}`);
  console.log('Official schema: https://code.claude.com/docs/en/skills');

  return errorCount > 0 ? 1 : 0;
}

process.exit(main());
