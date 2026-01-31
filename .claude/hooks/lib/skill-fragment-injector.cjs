#!/usr/bin/env node
'use strict';

/**
 * ACE Skill Fragment Injector - Delta-to-skill enrichment
 *
 * Part of Agentic Context Engineering (ACE) Phase 2.3.
 * Appends collapsible context fragments to skill SKILL.md files
 * when promoted deltas match the skill's domain keywords.
 *
 * Called by ace-curator-pruner.cjs after delta promotion.
 * Not a standalone hook — library module only.
 *
 * Configuration:
 * - Fragment cleanup: Manual only (user control)
 * - Max fragments per skill: 5
 * - Min keyword matches: 2
 * - Max skills per delta: 3
 *
 * @module skill-fragment-injector
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SKILLS_DIR = path.join(process.cwd(), '.claude', 'skills');
const MAX_FRAGMENTS_PER_SKILL = 5;
const MIN_KEYWORD_MATCHES = 2;
const MAX_SKILLS_PER_DELTA = 3;

// Fragment markers
const FRAGMENT_START_MARKER = '<!-- ACE-GENERATED CONTEXT FRAGMENT';
const FRAGMENT_END_MARKER = '</details>';

/**
 * Skill-to-keywords mapping for main project.
 * Maps skill directory names to domain keywords.
 * Skill files live at .claude/skills/{name}/SKILL.md
 */
const SKILL_MAPPING = {
  // Backend (7 keywords)
  'easyplatform-backend': ['cqrs', 'repository', 'entity', 'migration', 'command', 'handler', 'query'],

  // API (6 keywords)
  'api-design': ['api', 'endpoint', 'controller', 'route', 'rest', 'dto'],

  // Database (6 keywords)
  'database-optimization': ['query', 'index', 'performance', 'sql', 'database', 'n+1'],

  // Frontend - consolidated from 4 skills (16 keywords)
  'frontend-angular': [
    'component', 'angular', 'template', 'directive',
    'store', 'state', 'observable', 'signal', 'rxjs',
    'form', 'validation', 'formcontrol', 'formgroup',
    'api-service', 'httpclient', 'service'
  ],

  'frontend-design': ['design', 'ui', 'ux', 'style', 'css', 'layout', 'scss'],

  // Testing (varies)
  'bug-diagnosis': ['debug', 'error', 'bug', 'fix', 'trace', 'issue', 'exception'],
  'test': ['test', 'jest', 'xunit', 'coverage', 'assertion', 'spec'],

  // DevOps (varies)
  'build': ['deploy', 'docker', 'ci', 'cd', 'pipeline', 'cloud', 'build'],
  'git-pr': ['git', 'commit', 'branch', 'merge', 'push', 'pull-request', 'pr'],

  // Architecture (varies)
  'arch-cross-service-integration': ['service', 'integration', 'message', 'bus', 'event', 'rabbitmq', 'messagebus'],
  'performance': ['performance', 'optimize', 'cache', 'latency', 'bottleneck', 'slow'],
  'arch-security-review': ['security', 'auth', 'permission', 'vulnerability', 'authorize', 'role']
};

/**
 * Escape special regex characters in a string
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for regex
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Resolve and validate skill SKILL.md path (prevent path traversal)
 * @param {string} skillName - Skill directory name
 * @returns {{ valid: boolean, skillPath?: string, reason?: string }}
 */
function validateSkillPath(skillName) {
  if (!skillName || typeof skillName !== 'string') {
    return { valid: false, reason: 'Invalid skill name' };
  }

  // Reject traversal attempts
  if (skillName.includes('..') || skillName.includes('/') || skillName.includes('\\')) {
    return { valid: false, reason: 'Invalid characters in skill name' };
  }

  // Main project uses .claude/skills/{name}/SKILL.md structure
  const skillPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
  const resolved = path.resolve(skillPath);

  // Verify resolved path stays within SKILLS_DIR
  if (!resolved.startsWith(path.resolve(SKILLS_DIR))) {
    return { valid: false, reason: 'Path traversal attempt detected' };
  }

  return { valid: true, skillPath: resolved };
}

/**
 * Match delta to skills based on keyword overlap.
 * Concatenates problem+solution, counts keyword hits per skill.
 * @param {Object} delta - Delta with problem and solution fields
 * @returns {string[]} Top matching skill names (max 3)
 */
function matchDeltaToSkills(delta) {
  if (!delta || !delta.problem || !delta.solution) return [];

  const searchText = `${delta.problem} ${delta.solution}`.toLowerCase();
  const matches = [];

  for (const [skill, keywords] of Object.entries(SKILL_MAPPING)) {
    const matchScore = keywords.reduce((score, keyword) => {
      return score + (searchText.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);

    // Require minimum keyword matches for relevance
    if (matchScore >= MIN_KEYWORD_MATCHES) {
      matches.push({ skill, score: matchScore });
    }
  }

  // Sort by score descending, return top N skill names
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, MAX_SKILLS_PER_DELTA).map(m => m.skill);
}

/**
 * Count existing ACE fragments in file content
 * @param {string} content - File content
 * @returns {number} Fragment count
 */
function countFragments(content) {
  const matches = content.match(new RegExp(escapeRegex(FRAGMENT_START_MARKER), 'g'));
  return matches ? matches.length : 0;
}

/**
 * Build markdown fragment for a delta
 * @param {Object} delta - Delta object
 * @returns {string} Formatted collapsible fragment
 */
function buildFragment(delta) {
  const date = new Date().toISOString().slice(0, 10);
  const confidence = delta.confidence || 0;
  const confidencePct = Math.round((typeof confidence === 'number' && confidence <= 1 ? confidence * 100 : confidence));
  const deltaId = delta.delta_id || delta.id || 'unknown';

  return `
${FRAGMENT_START_MARKER} (added ${date}) -->
<!-- Confidence: ${confidencePct}% | Delta: ${deltaId} -->
<details>
<summary>Learned: ${delta.problem}</summary>

${delta.solution}

</details>
`;
}

/**
 * Find position to insert fragment in skill file.
 * Searches for closing markers; falls back to end of file.
 * @param {string} content - Skill file content
 * @returns {number} Character index for insertion
 */
function findInsertPosition(content) {
  const closingPatterns = [
    /^## References/im,
    /^## See Also/im,
    /^<!--\s*END/im
  ];

  for (const pattern of closingPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match.index;
    }
  }

  // Default: end of file (before trailing newlines)
  return content.trimEnd().length;
}

/**
 * Append delta fragment to a skill's SKILL.md file
 * @param {string} skillName - Skill directory name
 * @param {Object} delta - Delta to inject
 * @returns {{ success: boolean, reason?: string }}
 */
function appendSkillFragment(skillName, delta) {
  const validation = validateSkillPath(skillName);
  if (!validation.valid) {
    return { success: false, reason: validation.reason };
  }

  const skillPath = validation.skillPath;

  if (!fs.existsSync(skillPath)) {
    return { success: false, reason: `Skill file not found: ${skillPath}` };
  }

  try {
    const content = fs.readFileSync(skillPath, 'utf-8');

    // Check capacity
    const fragmentCount = countFragments(content);
    if (fragmentCount >= MAX_FRAGMENTS_PER_SKILL) {
      return { success: false, reason: `Max fragments reached (${MAX_FRAGMENTS_PER_SKILL})` };
    }

    // Check duplicate by delta ID
    const deltaId = delta.delta_id || delta.id || '';
    if (deltaId && content.includes(`Delta: ${deltaId}`)) {
      return { success: false, reason: 'Delta fragment already exists' };
    }

    // Build and insert
    const fragment = buildFragment(delta);
    const insertPos = findInsertPosition(content);

    const newContent =
      content.slice(0, insertPos).trimEnd() +
      '\n' +
      fragment +
      '\n' +
      content.slice(insertPos);

    fs.writeFileSync(skillPath, newContent, 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

/**
 * Remove a specific fragment from skill file by delta ID.
 * For manual cleanup via ace-skill-cleanup.
 * @param {string} skillName - Skill directory name
 * @param {string} deltaId - Delta ID to remove
 * @returns {{ success: boolean, reason?: string }}
 */
function removeSkillFragment(skillName, deltaId) {
  const validation = validateSkillPath(skillName);
  if (!validation.valid) {
    return { success: false, reason: validation.reason };
  }

  const skillPath = validation.skillPath;
  if (!fs.existsSync(skillPath)) {
    return { success: false, reason: `Skill file not found: ${skillPath}` };
  }

  try {
    let content = fs.readFileSync(skillPath, 'utf-8');

    const escapedDeltaId = escapeRegex(deltaId);
    const fragmentRegex = new RegExp(
      `\\n?${escapeRegex(FRAGMENT_START_MARKER)}[^>]*>\\n<!-- Confidence: \\d+% \\| Delta: ${escapedDeltaId} -->\\n<details>[\\s\\S]*?</details>\\n?`,
      'g'
    );

    const newContent = content.replace(fragmentRegex, '\n');

    if (newContent === content) {
      return { success: false, reason: `Fragment not found for delta: ${deltaId}` };
    }

    fs.writeFileSync(skillPath, newContent, 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

/**
 * List all fragments in a skill file
 * @param {string} skillName - Skill directory name
 * @returns {{ success: boolean, fragments?: Array, reason?: string }}
 */
function listSkillFragments(skillName) {
  const validation = validateSkillPath(skillName);
  if (!validation.valid) {
    return { success: false, reason: validation.reason };
  }

  const skillPath = validation.skillPath;
  if (!fs.existsSync(skillPath)) {
    return { success: false, reason: `Skill file not found: ${skillPath}` };
  }

  try {
    const content = fs.readFileSync(skillPath, 'utf-8');

    const fragmentRegex = new RegExp(
      `${escapeRegex(FRAGMENT_START_MARKER)} \\(added ([^)]+)\\) -->\\n<!-- Confidence: (\\d+)% \\| Delta: ([^>]+) -->\\n<details>\\n<summary>Learned: ([^<]+)</summary>`,
      'g'
    );

    const fragments = [];
    let match;
    while ((match = fragmentRegex.exec(content)) !== null) {
      fragments.push({
        addedDate: match[1],
        confidence: parseInt(match[2], 10),
        deltaId: match[3].trim(),
        problem: match[4]
      });
    }

    return { success: true, fragments };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

/**
 * Get overview of all skills with fragment counts
 * @returns {Array<{skill: string, fragmentCount: number, path: string}>}
 */
function getSkillFragmentStatus() {
  const status = [];

  if (!fs.existsSync(SKILLS_DIR)) return status;

  try {
    const dirs = fs.readdirSync(SKILLS_DIR).filter(d => {
      const skillMd = path.join(SKILLS_DIR, d, 'SKILL.md');
      return fs.existsSync(skillMd);
    });

    for (const dir of dirs) {
      const skillPath = path.join(SKILLS_DIR, dir, 'SKILL.md');
      const content = fs.readFileSync(skillPath, 'utf-8');
      const fragmentCount = countFragments(content);

      if (fragmentCount > 0) {
        status.push({ skill: dir, fragmentCount, path: skillPath });
      }
    }

    return status.sort((a, b) => b.fragmentCount - a.fragmentCount);
  } catch (e) {
    return status;
  }
}

/**
 * Main entry point — match delta to skills and inject fragments.
 * Called by ace-curator-pruner.cjs after delta promotion.
 * @param {Object} delta - Promoted delta object
 * @returns {{ injected: number, skills: string[], errors: string[] }}
 */
function processSkillInjection(delta) {
  const result = { injected: 0, skills: [], errors: [] };

  const matchingSkills = matchDeltaToSkills(delta);
  if (matchingSkills.length === 0) return result;

  for (const skill of matchingSkills) {
    const injectResult = appendSkillFragment(skill, delta);

    if (injectResult.success) {
      result.injected++;
      result.skills.push(skill);
    } else {
      result.errors.push(`${skill}: ${injectResult.reason}`);
    }
  }

  return result;
}

module.exports = {
  // Main entry
  processSkillInjection,
  matchDeltaToSkills,
  appendSkillFragment,

  // Cleanup (manual only)
  removeSkillFragment,
  listSkillFragments,

  // Status/debug
  getSkillFragmentStatus,
  countFragments,

  // Constants (for external use/testing)
  SKILLS_DIR,
  MAX_FRAGMENTS_PER_SKILL,
  SKILL_MAPPING,
  FRAGMENT_START_MARKER,
  FRAGMENT_END_MARKER
};
