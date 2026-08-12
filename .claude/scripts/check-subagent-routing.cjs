#!/usr/bin/env node

/**
 * Sub-Agent Routing Guard (anti-drift lint)
 *
 * Prevents the `integration-test-review` → `code-reviewer` misroute (and its
 * class) from recurring after the Phase-1 audit fix. It scans the OWN-SELECTION
 * `subagent_type:` assignment lines in `.claude/skills/**​/SKILL.md` against a
 * CURATED `domain → required-specialist` allow-list and FAILS on a mismatch.
 *
 * Why a curated allow-list and not a blanket "no code-reviewer" heuristic:
 *   A blanket rule would false-flag the PRESCRIBED no-specialist fallbacks
 *   (`domain-entities-review`, `production-readiness-review` → `code-reviewer`;
 *   `plan-review`, `artifact-review` → `general-purpose`) that are correct
 *   because no domain specialist agent exists for them. Only domains that HAVE a
 *   real specialist are guarded — extend ALLOW_LIST when a new specialist lands.
 *
 * What is EXCLUDED from the scan (never flagged):
 *   (a) Skills not in ALLOW_LIST — covers every prescribed generic fallback.
 *   (b) Any line inside a `<!-- SYNC:* -->` or `<!-- OVERRIDE:* -->` block —
 *       the canonical review-protocol template body and propagated shared blocks
 *       (e.g. `SYNC:systematic-review-batching`) legitimately carry a generic
 *       `code-reviewer`; they are managed elsewhere, not own-selection.
 *
 * Usage:
 *   node .claude/scripts/check-subagent-routing.cjs            # scan, exit 1 on misroute
 *   node .claude/scripts/check-subagent-routing.cjs --json     # machine-readable
 *
 * Also consumed as a module by
 *   .claude/hooks/tests/suites/check-subagent-routing.test.cjs
 * (auto-discovered by run-all-tests.cjs; bridged into test-all-hooks.cjs).
 */

const fs = require('fs');
const path = require('path');

// Curated domain (skill dir name) → required specialist subagent_type.
// SEED: the integration-test family — the one proven HIGH-severity drift case
// (guide :19/:51 + sibling integration-test override + parent workflow all
//  mandate `integration-tester`). Add a row only when a real specialist exists
// for the domain AND that domain must never fall back to `code-reviewer`.
const DEFAULT_ALLOW_LIST = {
  'integration-test-review': 'integration-tester',
  'integration-test': 'integration-tester',
};

// A SYNC/OVERRIDE block OPENER: `<!-- SYNC:tag -->` / `<!-- OVERRIDE:tag -->`.
// The closer carries a leading slash (`<!-- /SYNC:tag -->`) so `\s*` (spaces
// only) cannot reach the tag — OPENER never matches a closer. Test closer first.
const OPENER_RE = /<!--\s*(?:SYNC|OVERRIDE):[\w-]+\s*-->/;
const CLOSER_RE = /<!--\s*\/(?:SYNC|OVERRIDE):[\w-]+\s*-->/;
// Own-selection assignment form only (quoted). The arrow-prose routing-table
// form (`→ \`code-reviewer\``) has no `subagent_type:` token and is not a
// dispatch assignment, so it is intentionally NOT matched.
const SUBAGENT_RE = /subagent_type:\s*["']([A-Za-z0-9_-]+)["']/;

/**
 * Scan a single SKILL.md body for own-selection routing violations.
 * Pure (no FS) so tests can feed synthetic content.
 *
 * @returns {Array<{skill,line,assigned,required,text}>}
 */
function scanSkillContent(skillName, content, allowList = DEFAULT_ALLOW_LIST) {
  const required = allowList[skillName];
  if (!required) return []; // not a guarded domain

  const violations = [];
  const lines = content.split(/\r?\n/);
  let blockDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Block boundaries are not own-selection lines.
    if (CLOSER_RE.test(line)) {
      blockDepth = Math.max(0, blockDepth - 1);
      continue;
    }
    if (OPENER_RE.test(line)) {
      blockDepth += 1;
      continue;
    }
    if (blockDepth > 0) continue; // inside a SYNC/OVERRIDE block — excluded

    const m = line.match(SUBAGENT_RE);
    if (m && m[1] !== required) {
      violations.push({
        skill: skillName,
        line: i + 1,
        assigned: m[1],
        required,
        text: line.trim(),
      });
    }
  }

  return violations;
}

/** Recursively collect every SKILL.md path under a skills dir. */
function walkSkillFiles(skillsDir) {
  const out = [];
  if (!fs.existsSync(skillsDir)) return out;

  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    const full = path.join(skillsDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkSkillFiles(full));
    } else if (entry.isFile() && entry.name === 'SKILL.md') {
      out.push(full);
    }
  }
  return out;
}

/** Scan an on-disk skills tree. Skill name = the SKILL.md's parent dir name. */
function scanSkillsDir(skillsDir, allowList = DEFAULT_ALLOW_LIST) {
  const violations = [];
  for (const file of walkSkillFiles(skillsDir)) {
    const skillName = path.basename(path.dirname(file));
    if (!allowList[skillName]) continue;
    const content = fs.readFileSync(file, 'utf8');
    for (const v of scanSkillContent(skillName, content, allowList)) {
      violations.push({ ...v, file });
    }
  }
  return violations;
}

function main() {
  const asJson = process.argv.includes('--json');
  const skillsDir = path.resolve(__dirname, '..', 'skills');
  const violations = scanSkillsDir(skillsDir, DEFAULT_ALLOW_LIST);

  if (asJson) {
    console.log(JSON.stringify({ ok: violations.length === 0, violations }, null, 2));
  } else if (violations.length === 0) {
    const domains = Object.keys(DEFAULT_ALLOW_LIST).join(', ');
    console.log(`OK — no sub-agent routing drift (guarded domains: ${domains}).`);
  } else {
    console.error(`FAIL — ${violations.length} sub-agent routing violation(s):`);
    for (const v of violations) {
      console.error(
        `  ${v.file}:${v.line} — ${v.skill} dispatches "${v.assigned}", ` +
        `must be "${v.required}"\n    ${v.text}`
      );
    }
  }

  process.exit(violations.length === 0 ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = {
  DEFAULT_ALLOW_LIST,
  scanSkillContent,
  walkSkillFiles,
  scanSkillsDir,
};
