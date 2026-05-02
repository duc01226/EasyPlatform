#!/usr/bin/env node

/**
 * validate-skills.cjs
 *
 * Scans all SKILL.md files, validates YAML frontmatter against official Claude Code schema,
 * reports invalid fields, and optionally fixes them (--fix flag).
 *
 * Usage:
 *   node .claude/skills/skill-create/scripts/validate-skills.cjs           # Report only
 *   node .claude/skills/skill-create/scripts/validate-skills.cjs --fix     # Report + auto-fix
 *   node .claude/skills/skill-create/scripts/validate-skills.cjs --path <dir>  # Scan specific dir
 *
 * Official schema: https://code.claude.com/docs/en/skills
 */

const fs = require('fs');
const path = require('path');

// --- Configuration ---
const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const args = process.argv.slice(2);
const FIX_MODE = args.includes('--fix');
const pathArg = args.indexOf('--path');
const SCAN_DIR = pathArg !== -1 && args[pathArg + 1]
  ? path.resolve(PROJECT_ROOT, args[pathArg + 1])
  : path.resolve(PROJECT_ROOT, '.claude/skills');

// Official Claude Code SKILL.md frontmatter fields
// Source: https://code.claude.com/docs/en/skills
const VALID_FIELDS = new Set([
  'name',
  'description',
  'argument-hint',
  'disable-model-invocation',
  'user-invocable',
  'allowed-tools',
  'model',
  'context',
  'agent',
  'hooks',
]);

// Project-specific convention fields (not official but widely used in this project)
// These are flagged as INFO, not ERROR
const PROJECT_CONVENTION_FIELDS = new Set([
  'activation',
  'version',
]);

// Known invalid fields that can be safely removed
const REMOVABLE_FIELDS = new Set([
  'license',
  'infer',
]);

// Known field typos/aliases to fix
const FIELD_FIXES = {
  'tools': 'allowed-tools',
};

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
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
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

/**
 * Validate a single SKILL.md file.
 * Returns { path, issues[], fixes[] }
 */
function validateSkill(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  const result = { path: relPath, issues: [], fixes: [] };

  const fm = parseFrontmatter(content);
  if (!fm) {
    result.issues.push({ severity: 'error', field: null, message: 'No YAML frontmatter found' });
    return result;
  }

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

  // Line count check
  const lineCount = content.split('\n').length;
  if (lineCount > 100) {
    result.issues.push({
      severity: 'warn',
      field: null,
      message: `SKILL.md is ${lineCount} lines (recommended <100)`,
    });
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
  console.log(`Mode: ${FIX_MODE ? 'REPORT + FIX' : 'REPORT ONLY'}\n`);

  const skillFiles = findSkillFiles(SCAN_DIR);
  console.log(`Found ${skillFiles.length} SKILL.md files\n`);

  let totalIssues = 0;
  let totalFixed = 0;
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

  console.log('\nValid frontmatter fields (official schema):');
  console.log(`  ${[...VALID_FIELDS].join(', ')}`);
  console.log(`Project convention fields (accepted):  ${[...PROJECT_CONVENTION_FIELDS].join(', ')}`);
  console.log('Source: https://code.claude.com/docs/en/skills');

  return errorCount > 0 ? 1 : 0;
}

process.exit(main());
