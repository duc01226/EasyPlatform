#!/usr/bin/env node
/**
 * Add suffix notes to skills and commands
 * Usage: node add-suffix-notes.cjs [--dry-run] [--type=skills|commands|all]
 *
 * Appends "Task Planning Notes" section to markdown files in:
 * - .claude/commands/ (all .md files)
 * - .claude/skills/ (SKILL.md files only)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SUFFIX_MARKER = '## Task Planning Notes';

const SUFFIX_NOTE = `

## Task Planning Notes

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
`;

/**
 * Recursively find markdown files matching pattern
 * @param {string} baseDir - Base directory to search
 * @param {'SKILL.md' | '*.md'} pattern - File pattern to match
 * @returns {string[]} Array of absolute file paths
 */
function findFiles(baseDir, pattern) {
  const results = [];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      console.error(`  Cannot read directory: ${dir}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        if (pattern === 'SKILL.md' && entry.name === 'SKILL.md') {
          results.push(fullPath);
        } else if (pattern === '*.md' && entry.name !== 'SKILL.md') {
          results.push(fullPath);
        }
      }
    }
  }

  walk(baseDir);
  return results;
}

/**
 * Process a single file - append suffix if not already present
 * @param {string} filePath - Path to file
 * @param {boolean} dryRun - If true, don't modify file
 * @returns {{status: string, reason?: string}}
 */
function processFile(filePath, dryRun) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Check if suffix already exists (idempotency)
  if (content.includes(SUFFIX_MARKER)) {
    return { status: 'skipped', reason: 'already has suffix' };
  }

  if (dryRun) {
    return { status: 'would-update' };
  }

  // Append suffix to end of file
  const newContent = content.trimEnd() + SUFFIX_NOTE;
  fs.writeFileSync(filePath, newContent, 'utf8');

  return { status: 'updated' };
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const typeArg = args.find(a => a.startsWith('--type='));
  const type = typeArg ? typeArg.split('=')[1] : 'all';

  console.log('='.repeat(60));
  console.log('Add Suffix Notes to Skills and Commands');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log(`Type: ${type}`);
  console.log('');

  const stats = { updated: 0, skipped: 0, failed: 0 };

  // Process commands
  if (type === 'all' || type === 'commands') {
    const commandsDir = path.join(ROOT, '.claude/commands');
    const commandFiles = findFiles(commandsDir, '*.md');
    console.log(`\n📁 Processing ${commandFiles.length} command files...`);

    for (const file of commandFiles) {
      try {
        const result = processFile(file, dryRun);
        const statusKey = result.status === 'would-update' ? 'updated' : result.status;
        stats[statusKey]++;

        const rel = path.relative(ROOT, file);
        const icon = result.status === 'skipped' ? '⏭️' : result.status === 'updated' ? '✅' : '🔍';
        console.log(`  ${icon} ${result.status}: ${rel}`);
      } catch (err) {
        stats.failed++;
        console.error(`  ❌ FAILED: ${file} - ${err.message}`);
      }
    }
  }

  // Process skills
  if (type === 'all' || type === 'skills') {
    const skillsDir = path.join(ROOT, '.claude/skills');
    const skillFiles = findFiles(skillsDir, 'SKILL.md');
    console.log(`\n📁 Processing ${skillFiles.length} skill files...`);

    for (const file of skillFiles) {
      try {
        const result = processFile(file, dryRun);
        const statusKey = result.status === 'would-update' ? 'updated' : result.status;
        stats[statusKey]++;

        const rel = path.relative(ROOT, file);
        const icon = result.status === 'skipped' ? '⏭️' : result.status === 'updated' ? '✅' : '🔍';
        console.log(`  ${icon} ${result.status}: ${rel}`);
      } catch (err) {
        stats.failed++;
        console.error(`  ❌ FAILED: ${file} - ${err.message}`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`✅ Updated/Would-update: ${stats.updated}`);
  console.log(`⏭️  Skipped (already has suffix): ${stats.skipped}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log(`📊 Total processed: ${stats.updated + stats.skipped + stats.failed}`);

  if (dryRun && stats.updated > 0) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }

  // Exit with error code if any failures
  if (stats.failed > 0) {
    process.exit(1);
  }
}

main();
