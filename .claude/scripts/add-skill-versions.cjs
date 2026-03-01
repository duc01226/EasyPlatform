#!/usr/bin/env node
/**
 * Add version field to skills missing it
 * Usage: node add-skill-versions.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const DRY_RUN = process.argv.includes('--dry-run');

// Mature skills (frequently used, well-established)
const MATURE_SKILLS = [
  'debug', 'code-review', 'documentation',
  'test-spec', 'feature', 'frontend-design',
  'feature-docs', 'code-simplifier', 'planning',
  'refactoring', 'api-design', 'commit'
];

function getInitialVersion(skillName, content) {
  // Already has version
  if (/^version:\s/m.test(content)) return null;

  // Mature skills get 2.0.0
  if (MATURE_SKILLS.includes(skillName)) return '2.0.0';

  // Default for existing skills
  return '1.0.0';
}

function addVersion(skillPath, version) {
  let content = fs.readFileSync(skillPath, 'utf-8');

  // Check if already has version
  if (/^version:\s/m.test(content)) {
    return null;
  }

  // Insert version after name field in frontmatter
  const nameMatch = content.match(/^(---[\s\S]*?^name:\s*[^\n]+\n)/m);
  if (nameMatch) {
    content = content.replace(
      nameMatch[0],
      `${nameMatch[0]}version: ${version}\n`
    );
  } else {
    // If no name field, try to add after first ---
    content = content.replace(
      /^(---\n)/,
      `$1version: ${version}\n`
    );
  }

  if (!DRY_RUN) {
    fs.writeFileSync(skillPath, content);
  }

  return content;
}

function main() {
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Adding versions to skills...\n`);

  const skills = fs.readdirSync(SKILLS_DIR);
  let updated = 0;
  let skipped = 0;

  for (const skill of skills) {
    const skillPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;

    const content = fs.readFileSync(skillPath, 'utf-8');
    const version = getInitialVersion(skill, content);

    if (version) {
      const result = addVersion(skillPath, version);
      if (result) {
        console.log(`✓ ${skill}: ${version}${MATURE_SKILLS.includes(skill) ? ' (mature)' : ''}`);
        updated++;
      } else {
        skipped++;
      }
    } else {
      skipped++;
    }
  }

  console.log(`\nSummary: Updated ${updated}, Skipped ${skipped}`);
  if (DRY_RUN) console.log('Run without --dry-run to apply changes.');
}

main();
