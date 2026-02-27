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

// Known invalid fields that can be safely removed
const REMOVABLE_FIELDS = new Set([
  'version',
  'license',
  'infer',
]);

// Known field typos/aliases to fix
const FIELD_FIXES = {
  'tools': 'allowed-tools',  // common mistake: "tools" instead of "allowed-tools"
};

// --- Helpers ---

/**
 * Parse YAML frontmatter from SKILL.md content.
 * Returns { fields: Map<string, {line, value}>, startLine, endLine, raw }
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
    // Top-level field (not indented continuation)
    const fieldMatch = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (fieldMatch) {
      currentField = fieldMatch[1];
      fields.set(currentField, { line: i, value: fieldMatch[2], lines: [i] });
    } else if (currentField && (line.startsWith('  ') || line.startsWith('\t'))) {
      // Continuation line for multi-line value (e.g., description: >-)
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
 * Validate a single SKILL.md file.
 * Returns { path, issues[], fixes[] }
 */
function validateSkill(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    const relPath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
    return { path: relPath, issues: [{ severity: 'error', field: null, message: `Could not read file: ${err.message}` }], fixes: [] };
  }
  const relPath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  const result = { path: relPath, issues: [], fixes: [] };

  const fm = parseFrontmatter(content);
  if (!fm) {
    result.issues.push({ severity: 'error', field: null, message: 'No YAML frontmatter found' });
    return result;
  }

  // Check for missing recommended fields
  if (!fm.fields.has('name') && !fm.fields.has('description')) {
    result.issues.push({ severity: 'warn', field: null, message: 'Missing both name and description' });
  }
  if (!fm.fields.has('description')) {
    result.issues.push({ severity: 'warn', field: 'description', message: 'Missing description (recommended for auto-activation)' });
  }

  // Check each field against schema
  for (const [field] of fm.fields) {
    if (VALID_FIELDS.has(field)) continue;

    if (REMOVABLE_FIELDS.has(field)) {
      result.issues.push({
        severity: 'warn',
        field,
        message: `Invalid field "${field}" — not in official schema, ignored by runtime`,
      });
      result.fixes.push({ action: 'remove', field });
    } else if (field in FIELD_FIXES) {
      result.issues.push({
        severity: 'warn',
        field,
        message: `Invalid field "${field}" — did you mean "${FIELD_FIXES[field]}"?`,
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

  // Check for infer content that should be in description
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

  // Collect lines to remove (process in reverse to maintain indices)
  const linesToRemove = new Set();

  for (const fix of fixes) {
    const fieldInfo = fm.fields.get(fix.field);
    if (!fieldInfo) continue;

    if (fix.action === 'remove') {
      for (const lineIdx of fieldInfo.lines) {
        linesToRemove.add(lineIdx);
      }
    } else if (fix.action === 'rename') {
      // Skip rename if target field already exists (avoid duplicates)
      if (fm.fields.has(fix.newField)) {
        // Target exists — remove the old field instead of renaming
        for (const lineIdx of fieldInfo.lines) {
          linesToRemove.add(lineIdx);
        }
      } else {
        const lineIdx = fieldInfo.line;
        lines[lineIdx] = lines[lineIdx].replace(
          new RegExp(`^${fix.field}:`),
          `${fix.newField}:`
        );
      }
    }
  }

  // Remove lines in reverse order
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
  const results = [];

  for (const filePath of skillFiles) {
    const result = validateSkill(filePath);
    results.push(result);

    if (result.issues.length === 0) continue;

    totalIssues += result.issues.length;
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
  console.log(`Total issues: ${totalIssues}`);
  if (FIX_MODE) console.log(`Fixes applied: ${totalFixed}`);

  // Valid fields reference
  console.log('\nValid frontmatter fields (official schema):');
  console.log(`  ${[...VALID_FIELDS].join(', ')}`);
  console.log('Source: https://code.claude.com/docs/en/skills');

  const errorCount = results.reduce(
    (sum, r) => sum + r.issues.filter(i => i.severity === 'error').length, 0
  );
  return errorCount > 0 ? 1 : 0;
}

process.exit(main());
