#!/usr/bin/env node
/**
 * Enhance skills with trigger keywords and Related sections
 * Usage: node enhance-skills.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const DRY_RUN = process.argv.includes('--dry-run');

// Skill relationships mapping
const SKILL_RELATIONSHIPS = {
  // Debugging cluster
  'debug': ['code-review', 'feature-investigation'],

  // Code quality cluster
  'code-review': ['code-simplifier', 'debug', 'refactoring'],
  'code-simplifier': ['code-review', 'refactoring'],
  'refactoring': ['code-simplifier', 'code-review'],

  // Planning cluster
  'planning': ['feature', 'problem-solving', 'plan-analysis'],
  'plan-analysis': ['planning', 'feature'],
  'feature': ['planning', 'code-review', 'test-spec'],
  'feature-investigation': ['planning', 'debug', 'documentation'],

  // Testing cluster
  'test-spec': ['test-specs-docs', 'qc-specialist', 'debug'],
  'qc-specialist': ['test-spec', 'code-review'],
  'test-specs-docs': ['test-spec', 'documentation'],

  // Documentation cluster
  'documentation': ['feature-docs', 'changelog', 'release-notes'],
  'feature-docs': ['documentation', 'feature'],
  'changelog': ['documentation', 'release-notes', 'commit'],
  'release-notes': ['changelog', 'documentation'],

  // Frontend cluster
  'frontend-design': ['ui-ux-pro-max', 'shadcn-tailwind'],
  'shadcn-tailwind': ['frontend-design', 'ui-ux-pro-max'],
  'ui-ux-pro-max': ['frontend-design', 'shadcn-tailwind', 'ux-designer'],
  'ux-designer': ['ui-ux-pro-max', 'frontend-design'],

  // Backend cluster
  'api-design': ['databases', 'database-optimization'],
  'databases': ['database-optimization', 'api-design'],
  'database-optimization': ['databases', 'arch-performance-optimization'],

  // Architecture cluster
  'arch-security-review': ['arch-performance-optimization', 'arch-cross-service-integration', 'code-review'],
  'arch-performance-optimization': ['arch-security-review', 'database-optimization'],
  'arch-cross-service-integration': ['arch-security-review', 'api-design'],

  // Tasks cluster (autonomous)
  'tasks-code-review': ['code-review', 'tasks-test-generation'],
  'tasks-documentation': ['documentation', 'tasks-feature-implementation'],
  'tasks-feature-implementation': ['feature', 'tasks-code-review', 'tasks-test-generation'],
  'tasks-spec-update': ['tasks-documentation', 'documentation'],
  'tasks-test-generation': ['test-spec', 'tasks-code-review'],

  // DevOps cluster
  'devops': ['databases', 'api-design'],

  // Git cluster
  'commit': ['changelog', 'branch-comparison'],
  'branch-comparison': ['commit', 'code-review'],

  // Business cluster
  'business-analyst': ['product-owner', 'test-spec', 'planning'],
  'product-owner': ['business-analyst', 'project-manager'],
  'project-manager': ['product-owner', 'planning'],

  // AI/MCP cluster
  'mcp-builder': ['mcp-management', 'claude-code'],
  'mcp-management': ['mcp-builder', 'claude-code'],
  'claude-code': ['mcp-builder', 'mcp-management'],

  // Learning cluster
  'learn': ['memory-management'],
  'memory-management': ['learn', 'context-optimization'],
  'context-optimization': ['memory-management'],
};

// Generate trigger keywords from skill name and common patterns
function generateTriggers(skillName, content) {
  const triggers = new Set();

  // Add skill name variations
  triggers.add(skillName);
  triggers.add(skillName.replace(/-/g, ' '));

  // Extract from skill name
  const parts = skillName.split('-');
  if (parts.length > 1) {
    parts.forEach(p => {
      if (p.length > 3) triggers.add(p);
    });
  }

  // Common keyword patterns based on skill type
  const patterns = {
    'debug': ['debug', 'troubleshoot', 'fix', 'error', 'issue'],
    'test': ['test', 'testing', 'spec', 'coverage', 'unit test'],
    'review': ['review', 'audit', 'check', 'analyze'],
    'doc': ['document', 'docs', 'documentation', 'readme'],
    'plan': ['plan', 'planning', 'design', 'architect'],
    'feature': ['feature', 'implement', 'build', 'create'],
    'frontend': ['frontend', 'ui', 'component', 'angular'],
    'backend': ['backend', 'api', 'server', 'service'],
    'database': ['database', 'db', 'query', 'sql', 'migration'],
    'security': ['security', 'auth', 'permission', 'vulnerability'],
    'performance': ['performance', 'optimize', 'speed', 'latency'],
    'refactor': ['refactor', 'clean', 'simplify', 'restructure'],
  };

  Object.entries(patterns).forEach(([key, keywords]) => {
    if (skillName.includes(key) || content.toLowerCase().includes(key)) {
      keywords.forEach(k => triggers.add(k));
    }
  });

  return Array.from(triggers).slice(0, 8); // Max 8 triggers
}

function enhanceSkill(skillPath) {
  const skillName = path.basename(path.dirname(skillPath));
  let content = fs.readFileSync(skillPath, 'utf-8');
  let modified = false;

  // Check if already has Triggers section
  const hasTriggersSection = /^##\s+Triggers/m.test(content) || /^Triggers:/m.test(content);

  // Check if already has Related section
  const hasRelatedSection = /^##\s+Related/m.test(content) || /^Related:/m.test(content);

  // Skip if both exist
  if (hasTriggersSection && hasRelatedSection) {
    return { skillName, status: 'skipped', reason: 'Already has both sections' };
  }

  const triggers = generateTriggers(skillName, content);
  const related = SKILL_RELATIONSHIPS[skillName] || [];

  // Find position to insert (after description or first paragraph)
  let insertPosition = content.length;

  // Try to find end of frontmatter
  const frontmatterEnd = content.indexOf('---', 4);
  if (frontmatterEnd > 0) {
    // Find first ## heading after frontmatter
    const firstHeading = content.indexOf('\n## ', frontmatterEnd);
    if (firstHeading > 0) {
      insertPosition = firstHeading;
    } else {
      insertPosition = content.length;
    }
  }

  let sectionsToAdd = '';

  // Add Triggers if missing
  if (!hasTriggersSection && triggers.length > 0) {
    sectionsToAdd += `\n## Triggers\n\nActivates on: ${triggers.join(', ')}\n`;
    modified = true;
  }

  // Add Related if missing and we have relationships
  if (!hasRelatedSection && related.length > 0) {
    sectionsToAdd += `\n## Related\n\n${related.map(r => `- \`${r}\``).join('\n')}\n`;
    modified = true;
  }

  if (modified && sectionsToAdd) {
    // Insert after first paragraph or at end
    const insertAt = findInsertPosition(content);
    content = content.slice(0, insertAt) + sectionsToAdd + content.slice(insertAt);

    if (!DRY_RUN) {
      fs.writeFileSync(skillPath, content);
    }

    return { skillName, status: 'enhanced', triggers: triggers.length, related: related.length };
  }

  return { skillName, status: 'skipped', reason: 'No changes needed' };
}

function findInsertPosition(content) {
  // Find the end of frontmatter
  const frontmatterMatch = content.match(/^---[\s\S]*?---\n/);
  if (!frontmatterMatch) return content.length;

  const afterFrontmatter = frontmatterMatch[0].length;

  // Find first ## heading
  const firstHeadingMatch = content.slice(afterFrontmatter).match(/\n## /);
  if (firstHeadingMatch) {
    return afterFrontmatter + firstHeadingMatch.index;
  }

  return content.length;
}

function main() {
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Enhancing skills...\n`);

  const skills = fs.readdirSync(SKILLS_DIR);
  let enhanced = 0;
  let skipped = 0;

  for (const skill of skills) {
    const skillPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;

    const result = enhanceSkill(skillPath);

    if (result.status === 'enhanced') {
      console.log(`✓ ${result.skillName}: +${result.triggers} triggers, +${result.related} related`);
      enhanced++;
    } else {
      skipped++;
    }
  }

  console.log(`\nSummary: Enhanced ${enhanced}, Skipped ${skipped}`);
  if (DRY_RUN) console.log('Run without --dry-run to apply changes.');
}

main();
