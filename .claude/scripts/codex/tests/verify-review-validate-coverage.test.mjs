import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const verifierPath = path.resolve(thisDir, '..', 'verify-review-validate-coverage.mjs');
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const {
    findCoverageViolations,
    REVIEW_FAMILY_SKILLS,
    GRADER_SKILLS,
    VALIDATE_ROUTE_PATTERN,
    FIX_LOOP_BLOCK_PATTERN
} = await import(pathToFileURL(verifierPath).href);

// A minimal review-skill body carrying findings/severity language but NO validate route.
const FINDINGS_NO_ROUTE = [
    '# Some Review',
    'Report each **finding** with a **Severity** (CRITICAL/HIGH/MEDIUM) and PASS/FAIL verdict.',
    'Fix every CRITICAL and HIGH issue.'
].join('\n');

// Same body PLUS the specific why-review route → satisfies the positive rule.
const FINDINGS_WITH_ROUTE = [
    FINDINGS_NO_ROUTE,
    'Before any fix, run `/why-review --validate-findings <report-path>` to validate the findings.'
].join('\n');

// TC-CONVLOOP-040 — FAIL fixture trips the coverage (positive) rule.
test('TC-CONVLOOP-040: findings language without the validate route is a coverage violation', () => {
    const violations = findCoverageViolations('some-review', FINDINGS_NO_ROUTE, { isGrader: false });
    assert.equal(violations.length, 1);
    assert.equal(violations[0].rule, 'coverage');
    assert.match(violations[0].message, /some-review/);
    assert.match(violations[0].message, /validate-findings/);
});

// TC-CONVLOOP-041 — PASS fixture satisfies the positive rule.
test('TC-CONVLOOP-041: findings language WITH the validate route passes', () => {
    const violations = findCoverageViolations('some-review', FINDINGS_WITH_ROUTE, { isGrader: false });
    assert.equal(violations.length, 0);
});

// TC-CONVLOOP-042 — every real review-family skill passes post-Phases-01-04 (the gate that proves
// Phases 01-04 actually closed the coverage matrix). Reads the live SKILL.md files.
test('TC-CONVLOOP-042: all real review-family skills pass both rules', () => {
    const graderSet = new Set(GRADER_SKILLS);
    const failures = [];
    for (const skillName of REVIEW_FAMILY_SKILLS) {
        const filePath = path.join(repoRoot, '.claude', 'skills', skillName, 'SKILL.md');
        assert.ok(fs.existsSync(filePath), `review-family skill missing on disk: ${skillName}/SKILL.md`);
        const content = fs.readFileSync(filePath, 'utf8');
        const violations = findCoverageViolations(skillName, content, { isGrader: graderSet.has(skillName) });
        for (const v of violations) failures.push(v.message);
    }
    assert.deepEqual(failures, [], `real review-family skills must have zero gaps:\n${failures.join('\n')}`);
});

// TC-CONVLOOP-043 — the allow-list is exactly the 14 SC3 review skills; no non-review skill leaks in
// (so a skill merely using the word "finding"/"Severity" is never scanned = no false positive).
test('TC-CONVLOOP-043: allow-list is the 14 review-family skills, no non-review skill included', () => {
    assert.equal(REVIEW_FAMILY_SKILLS.length, 14);
    for (const nonReview of ['plan', 'investigate', 'scout', 'fix', 'plan-execute', 'why-review']) {
        assert.ok(!REVIEW_FAMILY_SKILLS.includes(nonReview), `non-review skill must NOT be scanned: ${nonReview}`);
    }
    // Every grader is also a member of the review-family allow-list.
    for (const grader of GRADER_SKILLS) {
        assert.ok(REVIEW_FAMILY_SKILLS.includes(grader), `grader must also be a review-family member: ${grader}`);
    }
});

// TC-CONVLOOP-044 — pipeline registration + parity: run-codex-sync.mjs wires the verifier as a
// verify-only stage AND exposes its `--only=` key (the key is derived from the stage id).
test('TC-CONVLOOP-044: verifier is registered as a pipeline stage with an --only key', () => {
    const runnerPath = path.join(repoRoot, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs');
    assert.ok(fs.existsSync(runnerPath), 'run-codex-sync.mjs must exist');
    const runner = fs.readFileSync(runnerPath, 'utf8');
    assert.match(runner, /verify-review-validate-coverage\.mjs/, 'runner must reference the verifier script');
    assert.match(runner, /id:\s*"review-validate-coverage"/, 'runner must register the stage id (which is also the --only key)');
});

// TC-CONVLOOP-045 — loose strings do NOT satisfy the positive rule: a `Findings Validation Gate`
// heading and/or a `SYNC:double-round-trip-review` marker without the actual why-review route still
// fails (the >=85% survival bar lives in the route, not in a heading or a marker).
test('TC-CONVLOOP-045: heading/marker without the why-review route does NOT satisfy coverage', () => {
    const looseBody = [
        FINDINGS_NO_ROUTE,
        '## Findings Validation Gate',
        '<!-- SYNC:double-round-trip-review:reminder -->',
        'Validate findings before fixing.'
    ].join('\n');
    // Guard the matchers directly: neither loose string is the route.
    assert.equal(VALIDATE_ROUTE_PATTERN.test(looseBody), false, 'loose strings must not match the route pattern');
    const violations = findCoverageViolations('some-review', looseBody, { isGrader: false });
    assert.equal(violations.length, 1);
    assert.equal(violations[0].rule, 'coverage');
});

// TC-CONVLOOP-046 — grader negative rule: a grader whose body embeds the fix-loop engine fails,
// even though it also carries the validate route (SC7 boundary — graders never self-converge).
test('TC-CONVLOOP-046: a grader embedding the fix-loop block fails the negative rule', () => {
    const graderWithFixLoop = [
        FINDINGS_WITH_ROUTE,
        '<!-- SYNC:double-round-trip-review:reminder -->',
        'Fix validated findings, then run the full re-review until clean.'
    ].join('\n');
    // Sanity: the fixture does carry the fix-loop marker.
    assert.equal(FIX_LOOP_BLOCK_PATTERN.test(graderWithFixLoop), true);
    const violations = findCoverageViolations('architecture-scalability-review', graderWithFixLoop, { isGrader: true });
    assert.equal(violations.length, 1);
    assert.equal(violations[0].rule, 'grader-boundary');
    assert.match(violations[0].message, /architecture-scalability-review/);
    assert.match(violations[0].message, /double-round-trip-review/);
});

// TC-CONVLOOP-046b — the SAME fix-loop body in a NON-grader (a fixer) is allowed (fixers own the
// loop). Only graders trip the negative rule.
test('TC-CONVLOOP-046b: the fix-loop block in a non-grader review skill is allowed', () => {
    const fixerWithFixLoop = [
        FINDINGS_WITH_ROUTE,
        '<!-- SYNC:double-round-trip-review:reminder -->'
    ].join('\n');
    const violations = findCoverageViolations('integration-test-review', fixerWithFixLoop, { isGrader: false });
    assert.equal(violations.length, 0);
});

// Skills that carry the `/why-review --validate-findings` route but are deliberately NOT scanned as
// review-family: the validator itself, workflow orchestrators that merely wire review skills, and a
// plan/spec gate that reviews via why-review's own recursion rather than emitting an SC finding set.
// Each is excluded by NAME (with a reason) so the exclusion stays a conscious classification, not a glob.
const ROUTE_MENTIONERS_NOT_SCANNED = new Set([
    'why-review',              // the terminal validator that DEFINES the route
    'sync-codex',              // documents the route inside the verify-coverage sensor description
    'workflow-review-changes', // orchestrator: wires review skills, references the route in prose
    'workflow-idea-to-pbi',    // workflow orchestrator: references the route in a gate step
    'plan-review',             // reviews plans via why-review's own recursion engine (not an SC grader)
    'spec-clarify',            // clarification gate: references the route, not a findings grader
    'changes-review-loop',     // convergence-loop orchestrator: runs /changes-review report-only + /why-review --validate-findings + /fix; delegates finding-production to changes-review, not itself an SC grader
    'integration-test-verify-loop' // convergence-loop orchestrator: runs /integration-test-verify + /integration-test-review report-only + /changes-review + /why-review --validate-findings + /fix; delegates finding-production to those reviewers, not itself an SC grader
]);

// TC-CONVLOOP-047 — allow-list COMPLETENESS (closes the allow-list-rot gap). Any skill whose SKILL.md
// carries the `/why-review --validate-findings` route MUST be classified: either a scanned review-family
// member (REVIEW_FAMILY_SKILLS) OR an explicitly-excluded route-mentioner (ROUTE_MENTIONERS_NOT_SCANNED).
// A NEW review skill that copies the gate but is forgotten from the allow-list trips THIS test — so it
// can never silently escape the coverage verifier. The scan is the completeness safety-net for the
// deliberately-scoped runtime allow-list; it lives in the test (like the PORT-* parity locks), not in
// the runtime verifier whose per-skill rules stay glob-free to avoid false positives.
test('TC-CONVLOOP-047: every skill carrying the validate route is classified (allow-list completeness)', () => {
    const skillsDir = path.join(repoRoot, '.claude', 'skills');
    const classified = new Set([...REVIEW_FAMILY_SKILLS, ...ROUTE_MENTIONERS_NOT_SCANNED]);
    const unclassified = [];
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const filePath = path.join(skillsDir, entry.name, 'SKILL.md');
        if (!fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, 'utf8');
        if (VALIDATE_ROUTE_PATTERN.test(content) && !classified.has(entry.name)) {
            unclassified.push(entry.name);
        }
    }
    assert.deepEqual(
        unclassified,
        [],
        `these skills carry the '/why-review --validate-findings' route but are neither in ` +
            `REVIEW_FAMILY_SKILLS nor ROUTE_MENTIONERS_NOT_SCANNED — classify each (add to the verifier's ` +
            `allow-list so it is scanned, or to the excluded route-mentioners set with a reason):\n${unclassified.join('\n')}`
    );
});
