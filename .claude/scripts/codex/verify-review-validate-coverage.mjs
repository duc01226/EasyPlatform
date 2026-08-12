#!/usr/bin/env node

// Self-Review Convergence Loop — enforcement sensor (SC8).
//
// Read-only static verifier: statically asserts that the "converge-to-zero self-review +
// adversarial finding-validation" convention (Phases 01-04) is actually WIRED into every
// review-family skill, turning the convention into a build gate for FUTURE review skills at
// author time — where regressions actually enter. It cannot catch a runtime skip (an agent that
// ignores the gate mid-turn); it catches an AUTHOR who ships a review skill without the gate.
//
// Two assertions over an explicit review-family allow-list (NOT a repo-wide glob, so a non-review
// skill that merely uses the word "finding" is never scanned):
//   1. COVERAGE (positive rule): a finding-producing review skill MUST contain the specific
//      `/why-review --validate-findings` route. A bare `Findings Validation Gate` heading or a
//      `SYNC:double-round-trip-review` marker does NOT satisfy it — the one-place >=85% survival
//      bar lives in the why-review route, so an inline gate that never reaches why-review would
//      silently bypass the bar.
//   2. GRADER BOUNDARY (negative rule): a validate-only grader (produces a JUDGMENT, routes fixes
//      to siblings) MUST NOT embed `SYNC:double-round-trip-review` (the full fix-loop engine, whose
//      body verbatim IS the fix-loop) — a grader validates + anti-bias only, it never self-converges
//      (SC7 over-engineering guard).
//
// Exit non-zero on any gap. Fail-soft on an unreadable/missing skill file (warn + continue) so an
// unexpected file cannot crash the sync pipeline; a genuine missing-gate in a readable file is the
// only hard failure this verifier raises.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = process.cwd();

// SC3 review-family allow-list — the 14 finding-producing review skills. The scan is scoped to
// these names ONLY (never a repo-wide glob) so a non-review skill using "finding"/"Severity" is
// never flagged (TC-CONVLOOP-043).
export const REVIEW_FAMILY_SKILLS = [
    'changes-review',
    'code-review',
    'architecture-review',
    'architecture-review-full',
    'architecture-scalability-review',
    'security-review',
    'performance-review',
    'integration-test-review',
    'domain-entities-review',
    'production-readiness-review',
    'artifact-review',
    'ui-review',
    'quality-gate-review',
    'knowledge-review'
];

// SC7 grader allow-list — validate-only graders that emit a JUDGMENT (a scorecard; a
// PASS/FAIL/CONDITIONAL verdict) and route fixes to siblings. They carry the validate + anti-bias
// gate but MUST NOT embed the converge-to-zero fix-loop. Every grader is also a review-family skill.
export const GRADER_SKILLS = [
    'architecture-scalability-review',
    'quality-gate-review'
];

// Findings/severity/verdict language — presence means the skill produces findings and therefore
// owes the validate route. Any one match qualifies.
const FINDINGS_LANGUAGE_PATTERNS = [
    /\bfindings?\b/i,
    /\bseverity\b/i,
    /PASS\/FAIL/,
    /CRITICAL\/HIGH/
];

// The SPECIFIC route that satisfies the positive rule. Matches `/why-review --validate-findings`
// and `why-review --validate-findings` (leading slash optional; whitespace/newline between tokens).
// Deliberately does NOT match a bare `Findings Validation Gate` heading or a
// `<!-- SYNC:double-round-trip-review -->` marker — only the literal why-review route counts.
export const VALIDATE_ROUTE_PATTERN = /why-review\s+--validate-findings/;

// The fix-loop engine marker. Its expanded body verbatim IS the converge-to-zero fix-loop, so any
// reference to it inside a grader proves the grader embeds the loop (the definitive SC7 guard —
// catches the fix-loop regardless of surrounding prose wording).
export const FIX_LOOP_BLOCK_PATTERN = /double-round-trip-review/;

function normalize(filePath) {
    return path.relative(rootDir, filePath).split(path.sep).join('/');
}

/**
 * Pure core — apply both rules to one skill's SKILL.md text. Exported for the unit test so PASS/FAIL
 * fixtures can be asserted without touching disk.
 * @param {string} skillName
 * @param {string} content — the SKILL.md body
 * @param {{ isGrader?: boolean }} [options]
 * @returns {Array<{ rule: string, skill: string, message: string }>}
 */
export function findCoverageViolations(skillName, content, options = {}) {
    const { isGrader = false } = options;
    const violations = [];

    const hasFindingsLanguage = FINDINGS_LANGUAGE_PATTERNS.some((re) => re.test(content));
    const hasValidateRoute = VALIDATE_ROUTE_PATTERN.test(content);

    // POSITIVE rule (coverage): findings language present -> the why-review validate route MUST be
    // present. A loose `Findings Validation Gate` heading or a `SYNC:double-round-trip-review`
    // marker alone does NOT satisfy it (TC-CONVLOOP-045).
    if (hasFindingsLanguage && !hasValidateRoute) {
        violations.push({
            rule: 'coverage',
            skill: skillName,
            message:
                `${skillName}: carries findings/severity language but no '/why-review --validate-findings' route ` +
                `(a 'Findings Validation Gate' heading or a 'SYNC:double-round-trip-review' marker alone does NOT ` +
                `satisfy the >=85% finding-survival bar — wire the why-review route)`
        });
    }

    // NEGATIVE rule (grader boundary, SC7): a validate-only grader MUST NOT embed the fix-loop
    // engine. A grader that carries `SYNC:double-round-trip-review` injects the self-convergence a
    // grader must not have (TC-CONVLOOP-046).
    if (isGrader && FIX_LOOP_BLOCK_PATTERN.test(content)) {
        violations.push({
            rule: 'grader-boundary',
            skill: skillName,
            message:
                `${skillName}: is a validate-only grader but embeds 'SYNC:double-round-trip-review' (the fix-loop ` +
                `engine) — a grader validates + anti-bias only, it never self-converges (SC7)`
        });
    }

    return violations;
}

async function main() {
    const failures = [];
    const graderSet = new Set(GRADER_SKILLS);

    for (const skillName of REVIEW_FAMILY_SKILLS) {
        const filePath = path.join(rootDir, '.claude', 'skills', skillName, 'SKILL.md');
        const content = await fs.readFile(filePath, 'utf8').catch(() => null);
        if (content === null) {
            // Fail-soft: an unreadable/missing skill file warns and is skipped rather than crashing
            // the pipeline (Phase 5 risk mitigation). Only a missing-gate in a readable file fails.
            console.warn(`[codex-verify-review-validate-coverage] WARN: cannot read ${normalize(filePath)} — skipped`);
            continue;
        }
        for (const violation of findCoverageViolations(skillName, content, { isGrader: graderSet.has(skillName) })) {
            failures.push(violation.message);
        }
    }

    if (failures.length > 0) {
        console.error('[codex-verify-review-validate-coverage] FAIL');
        for (const failure of failures) {
            console.error(`- ${failure}`);
        }
        process.exitCode = 1;
        return;
    }

    console.log('[codex-verify-review-validate-coverage] PASS');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    await main();
}
