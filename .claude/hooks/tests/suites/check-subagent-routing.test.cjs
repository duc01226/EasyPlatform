/**
 * Sub-Agent Routing Guard Test Suite (TC-AUDIT-007)
 *
 * Proves `.claude/scripts/check-subagent-routing.cjs` actually guards:
 *   1. the real `.claude/skills` tree is clean (post-U1, integration-test-review
 *      → integration-tester);
 *   2. a synthetic OWN-SELECTION misroute (integration-test domain dispatching
 *      `code-reviewer`) is DETECTED — a guard that can't fail proves nothing;
 *   3. ZERO false positives across all three exclusion classes:
 *      (a) `code-reviewer` inside a `SYNC:*` block body (propagated template),
 *      (b) `code-reviewer` inside an `OVERRIDE:*` block body (post-rename),
 *      (c) prescribed `code-reviewer` fallbacks in skills NOT in the allow-list.
 *
 * Auto-discovered by run-all-tests.cjs; bridged into test-all-hooks.cjs.
 */

const path = require('path');
const {
  scanSkillContent,
  scanSkillsDir,
  DEFAULT_ALLOW_LIST,
} = require('../../../scripts/check-subagent-routing.cjs');
const { assertEqual } = require('../lib/assertions.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKILLS_DIR = path.join(REPO_ROOT, '.claude', 'skills');

const tests = [
  {
    name: '[check-subagent-routing] real .claude/skills tree is clean (post-U1, 0 violations)',
    fn: () => {
      const violations = scanSkillsDir(SKILLS_DIR, DEFAULT_ALLOW_LIST);
      assertEqual(
        violations.length,
        0,
        `Expected 0 violations, got:\n${JSON.stringify(violations, null, 2)}`
      );
    },
  },
  {
    name: '[check-subagent-routing] DETECTS a synthetic integration-test→code-reviewer own-selection misroute',
    fn: () => {
      const synthetic = [
        '## Phase 6: Spawn Fresh Sub-Agents',
        'Spawn fresh sub-agents for the review.',
        '2. Set `subagent_type: "code-reviewer"`',
      ].join('\n');
      const v = scanSkillContent('integration-test-review', synthetic, DEFAULT_ALLOW_LIST);
      assertEqual(v.length, 1, 'exactly one violation detected');
      assertEqual(v[0].assigned, 'code-reviewer', 'flags the wrong agent');
      assertEqual(v[0].required, 'integration-tester', 'names the required specialist');
    },
  },
  {
    name: '[check-subagent-routing] IGNORES code-reviewer inside a SYNC:* block body (propagated template)',
    fn: () => {
      const synthetic = [
        '2. Set `subagent_type: "integration-tester"`',
        '<!-- SYNC:systematic-review-batching -->',
        '  subagent_type: "code-reviewer",',
        '<!-- /SYNC:systematic-review-batching -->',
      ].join('\n');
      const v = scanSkillContent('integration-test-review', synthetic, DEFAULT_ALLOW_LIST);
      assertEqual(v.length, 0, 'SYNC block-body code-reviewer is excluded');
    },
  },
  {
    name: '[check-subagent-routing] IGNORES code-reviewer inside an OVERRIDE:* block body (post-rename)',
    fn: () => {
      const synthetic = [
        '2. Set `subagent_type: "integration-tester"`',
        '<!-- OVERRIDE:review-protocol-injection -->',
        '  subagent_type: "code-reviewer",',
        '<!-- /OVERRIDE:review-protocol-injection -->',
      ].join('\n');
      const v = scanSkillContent('integration-test-review', synthetic, DEFAULT_ALLOW_LIST);
      assertEqual(v.length, 0, 'OVERRIDE block-body code-reviewer is excluded');
    },
  },
  {
    name: '[check-subagent-routing] does NOT flag prescribed code-reviewer fallbacks (skill not in allow-list)',
    fn: () => {
      const synthetic = '  subagent_type: "code-reviewer",';
      assertEqual(
        scanSkillContent('review-domain-entities', synthetic, DEFAULT_ALLOW_LIST).length,
        0,
        'review-domain-entities not guarded (no DDD-entity specialist)'
      );
      assertEqual(
        scanSkillContent('production-readiness-review', synthetic, DEFAULT_ALLOW_LIST).length,
        0,
        'production-readiness-review not guarded (no prod-readiness specialist)'
      );
    },
  },
  {
    name: '[check-subagent-routing] correct own-selection assignment passes',
    fn: () => {
      const synthetic = '  subagent_type: "integration-tester",';
      assertEqual(
        scanSkillContent('integration-test-review', synthetic, DEFAULT_ALLOW_LIST).length,
        0,
        'integration-tester is the required specialist — no violation'
      );
    },
  },
];

module.exports = { name: 'Sub-Agent Routing Guard', tests };
