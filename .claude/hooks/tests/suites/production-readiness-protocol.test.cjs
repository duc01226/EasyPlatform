/**
 * Production Readiness Protocol Test Suite
 *
 * Validates that:
 * - Protocol file exists with all required sections
 * - All enhanced skill files reference the protocol
 * - Each skill has the correct production readiness additions
 */

const path = require('path');
const fs = require('fs');
const { assertTrue, assertContains } = require('../lib/assertions.cjs');

// Project root (4 levels up from suites/)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// File paths
const PROTOCOL_PATH = path.join(PROJECT_ROOT, '.claude', 'skills', 'shared', 'scaffold-production-readiness-protocol.md');
const SCAFFOLD_SKILL = path.join(PROJECT_ROOT, '.claude', 'skills', 'scaffold', 'SKILL.md');
const REFINE_SKILL = path.join(PROJECT_ROOT, '.claude', 'skills', 'refine', 'SKILL.md');
const REFINE_REVIEW_SKILL = path.join(PROJECT_ROOT, '.claude', 'skills', 'refine-review', 'SKILL.md');
const STORY_SKILL = path.join(PROJECT_ROOT, '.claude', 'skills', 'story', 'SKILL.md');
const ARCH_DESIGN_SKILL = path.join(PROJECT_ROOT, '.claude', 'skills', 'architecture-design', 'SKILL.md');

// Load file contents
function readFile(filePath) {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
}

const protocol = readFile(PROTOCOL_PATH);
const scaffoldSkill = readFile(SCAFFOLD_SKILL);
const refineSkill = readFile(REFINE_SKILL);
const refineReviewSkill = readFile(REFINE_REVIEW_SKILL);
const storySkill = readFile(STORY_SKILL);
const archDesignSkill = readFile(ARCH_DESIGN_SKILL);

// ============================================================================
// Protocol File Existence & Structure Tests
// ============================================================================

const protocolTests = [
    {
        name: '[prod-readiness] protocol file exists',
        fn: async () => {
            assertTrue(protocol !== null, 'scaffold-production-readiness-protocol.md should exist');
        }
    },
    {
        name: '[prod-readiness] protocol has Code Quality Tooling section',
        fn: async () => {
            assertContains(protocol, '## 1. Code Quality Tooling', 'Protocol should have Code Quality Tooling section');
        }
    },
    {
        name: '[prod-readiness] protocol has Error Handling Foundation section',
        fn: async () => {
            assertContains(protocol, '## 2. Error Handling Foundation', 'Protocol should have Error Handling Foundation section');
        }
    },
    {
        name: '[prod-readiness] protocol has Loading State Management section',
        fn: async () => {
            assertContains(protocol, '## 3. Loading State Management', 'Protocol should have Loading State Management section');
        }
    },
    {
        name: '[prod-readiness] protocol has Docker Development Environment section',
        fn: async () => {
            assertContains(protocol, '## 4. Docker Development Environment', 'Protocol should have Docker Development Environment section');
        }
    },
    {
        name: '[prod-readiness] protocol has Integration Points section',
        fn: async () => {
            assertContains(protocol, '## 5. Integration Points', 'Protocol should have Integration Points section');
        }
    },
    {
        name: '[prod-readiness] protocol has frontend linter options (ESLint, Biome, oxlint)',
        fn: async () => {
            assertContains(protocol, 'ESLint', 'Protocol should mention ESLint');
            assertContains(protocol, 'Biome', 'Protocol should mention Biome');
            assertContains(protocol, 'oxlint', 'Protocol should mention oxlint');
        }
    },
    {
        name: '[prod-readiness] protocol has .NET analyzer options (Roslyn, StyleCop, Roslynator)',
        fn: async () => {
            assertContains(protocol, 'Roslyn', 'Protocol should mention Roslyn');
            assertContains(protocol, 'StyleCop', 'Protocol should mention StyleCop');
            assertContains(protocol, 'Roslynator', 'Protocol should mention Roslynator');
        }
    },
    {
        name: '[prod-readiness] protocol has pre-commit hook options (Husky, Lefthook)',
        fn: async () => {
            assertContains(protocol, 'Husky', 'Protocol should mention Husky');
            assertContains(protocol, 'Lefthook', 'Protocol should mention Lefthook');
        }
    },
    {
        name: '[prod-readiness] protocol has Docker Compose profiles pattern',
        fn: async () => {
            assertContains(protocol, 'profile', 'Protocol should mention Docker profiles');
            assertContains(protocol, 'docker-compose', 'Protocol should mention docker-compose');
        }
    },
    {
        name: '[prod-readiness] protocol has verification checklists',
        fn: async () => {
            assertContains(protocol, 'Verification Checklist', 'Protocol should have verification checklists');
        }
    }
];

// ============================================================================
// Skill Reference Tests — all enhanced skills must reference the protocol
// ============================================================================

const referenceTests = [
    {
        name: '[prod-readiness] scaffold SKILL.md references protocol',
        fn: async () => {
            assertTrue(scaffoldSkill !== null, 'scaffold SKILL.md should exist');
            assertContains(scaffoldSkill, 'scaffold-production-readiness-protocol.md', 'Scaffold should reference the protocol');
        }
    },
    {
        name: '[prod-readiness] refine SKILL.md references protocol',
        fn: async () => {
            assertTrue(refineSkill !== null, 'refine SKILL.md should exist');
            assertContains(refineSkill, 'scaffold-production-readiness-protocol.md', 'Refine should reference the protocol');
        }
    },
    {
        name: '[prod-readiness] story SKILL.md references protocol',
        fn: async () => {
            assertTrue(storySkill !== null, 'story SKILL.md should exist');
            assertContains(storySkill, 'scaffold-production-readiness-protocol.md', 'Story should reference the protocol');
        }
    },
    {
        name: '[prod-readiness] architecture-design SKILL.md references protocol',
        fn: async () => {
            assertTrue(archDesignSkill !== null, 'architecture-design SKILL.md should exist');
            assertContains(archDesignSkill, 'scaffold-production-readiness-protocol.md', 'Architecture-design should reference the protocol');
        }
    },
    {
        name: '[prod-readiness] refine-review SKILL.md references protocol',
        fn: async () => {
            assertTrue(refineReviewSkill !== null, 'refine-review SKILL.md should exist');
            assertContains(refineReviewSkill, 'scaffold-production-readiness-protocol.md', 'Refine-review should reference the protocol');
        }
    }
];

// ============================================================================
// Skill Content Tests — each skill has the correct production readiness additions
// ============================================================================

const contentTests = [
    {
        name: '[prod-readiness] scaffold has Production Readiness Scaffolding section',
        fn: async () => {
            assertContains(scaffoldSkill, 'Production Readiness Scaffolding', 'Scaffold should have Production Readiness Scaffolding section');
        }
    },
    {
        name: '[prod-readiness] scaffold has Code Quality Tooling subsection',
        fn: async () => {
            assertContains(scaffoldSkill, 'Code Quality Tooling', 'Scaffold should have Code Quality subsection');
        }
    },
    {
        name: '[prod-readiness] scaffold has Error Handling subsection',
        fn: async () => {
            assertContains(scaffoldSkill, 'Error Handling', 'Scaffold should have Error Handling subsection');
        }
    },
    {
        name: '[prod-readiness] scaffold has Loading State subsection',
        fn: async () => {
            assertContains(scaffoldSkill, 'Loading State', 'Scaffold should have Loading State subsection');
        }
    },
    {
        name: '[prod-readiness] scaffold has Docker subsection',
        fn: async () => {
            assertContains(scaffoldSkill, 'Docker', 'Scaffold should have Docker subsection');
        }
    },
    {
        name: '[prod-readiness] scaffold has verification gate',
        fn: async () => {
            assertContains(scaffoldSkill, 'Verification', 'Scaffold should have verification gate');
        }
    },
    {
        name: '[prod-readiness] refine has Production Readiness Concerns table',
        fn: async () => {
            assertContains(refineSkill, 'Production Readiness Concerns', 'Refine should have Production Readiness Concerns section');
            assertContains(refineSkill, 'Code linting', 'Refine should mention code linting concern');
            assertContains(refineSkill, 'Error handling', 'Refine should mention error handling concern');
            assertContains(refineSkill, 'Loading indicators', 'Refine should mention loading indicators concern');
            assertContains(refineSkill, 'Docker integration', 'Refine should mention Docker integration concern');
        }
    },
    {
        name: '[prod-readiness] refine-review has production readiness checklist item',
        fn: async () => {
            assertContains(refineReviewSkill, 'Production readiness concerns', 'Refine-review should check for production readiness concerns');
        }
    },
    {
        name: '[prod-readiness] story has Sprint 0 / Foundation Stories section',
        fn: async () => {
            assertContains(storySkill, 'Sprint 0', 'Story should have Sprint 0 section');
            assertContains(storySkill, 'Foundation Stories', 'Story should have Foundation Stories section');
        }
    },
    {
        name: '[prod-readiness] story mentions linting foundation story',
        fn: async () => {
            assertContains(storySkill, 'linting', 'Story should mention linting as a foundation story');
        }
    },
    {
        name: '[prod-readiness] story mentions error handling foundation story',
        fn: async () => {
            assertContains(storySkill, 'error handling', 'Story should mention error handling as a foundation story');
        }
    },
    {
        name: '[prod-readiness] architecture-design has Scaffold Handoff section',
        fn: async () => {
            assertContains(archDesignSkill, 'Scaffold Handoff', 'Architecture-design should have Scaffold Handoff section');
        }
    },
    {
        name: '[prod-readiness] architecture-design has Tool Choices table template',
        fn: async () => {
            assertContains(archDesignSkill, 'Tool Choices', 'Architecture-design should have Tool Choices table');
        }
    }
];

// ============================================================================
// Export
// ============================================================================

module.exports = {
    name: 'Production Readiness Protocol',
    tests: [...protocolTests, ...referenceTests, ...contentTests]
};
