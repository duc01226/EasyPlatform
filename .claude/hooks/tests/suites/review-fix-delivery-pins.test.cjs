'use strict';

/**
 * Content pins for instruction text that a review-and-fix round corrected. Each pin reads the shipped
 * framework file (`.claude/` travels with the bundle, so this reads the framework's own published text, never
 * the adopter's project files) and fails when the corrected contract is lost:
 *
 * - caller-owned review children stay read-only while the coordinator owns fixes and fresh passes;
 *   review-only overrides the workflow default without dropping coverage or deferred duties;
 * - the architect agent invokes the security and performance audits only when asked for by name;
 * - `/fix` reads a target reference first when inference selects the branch, as an explicit flag does.
 *
 * Portability: no project config, git state or environment key is read; files are located from this file.
 * The pins read the framework repo's own shipped text, so they run only in the framework repo (an adopter
 * that edits its copy of these files keeps a green suite).
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CLAUDE_DIR = path.resolve(__dirname, '..', '..', '..');
const REPO_ROOT = path.resolve(CLAUDE_DIR, '..');
const { isFrameworkRepo } = require(path.join(__dirname, '..', 'lib', 'framework-repo-guard.cjs'));

const IS_FRAMEWORK_REPO = isFrameworkRepo(REPO_ROOT);
const SKIP_REASON = "reads the framework repo's own shipped text (framework-repo signal)";
const guarded = fn => ({ skip: IS_FRAMEWORK_REPO ? false : SKIP_REASON, fn });

function shipped(...segments) {
    return fs.readFileSync(path.join(CLAUDE_DIR, ...segments), 'utf8').replace(/\r\n?/g, '\n');
}

/** The single line that starts with `prefix` (after optional list marker), failing when absent. */
function lineStarting(text, prefix, label) {
    const line = text.split('\n').find(candidate => candidate.replace(/^\s*(?:[-*]|\d+\.)\s+/, '').startsWith(prefix));
    assert.ok(line, `${label}: no line starts with ${JSON.stringify(prefix)}`);
    return line;
}

const tests = [
    {
        name: '[review-fix-delivery-pins] caller-owned leaves validate read-only; the coordinator owns fixes, fresh passes and deferred duties',
        ...guarded(() => {
            // Given the shared caller contract and the general review executor
            const contract = shipped('skills', 'workflow-review-changes', 'references', 'caller-mode.md');
            const changes = shipped('skills', 'changes-review', 'SKILL.md');
            const policy = shipped('skills', 'shared', 'protocols', 'review-policy.md');
            assert.match(contract, /explicit review-only request overrides the workflow's fix-loop default/);
            assert.match(contract, /child reviews and validates its assigned pass read-only; the caller waits for all reports, fixes once, and requests fresh passes/);
            assert.match(contract, /never permission for parallel source mutation or a nested loop/);
            assert.match(contract, /Deferral never skips a gate/);
            assert.match(contract, /Preserve complete target coverage, required rules and report findings/);
            assert.match(policy, /it never edits source, starts another loop or asks the user/);
            // The executor may choose its review topology, but cannot create another fixing owner.
            assert.match(changes, /Decide inline work or authorized reviewers and group related flows as useful/);
            assert.match(changes, /all readers join its loop without concurrent writers/);
            assert.match(changes, /Review-only returns the validated report without source changes/);
            // And no other leaf's report-only section was loosened by the exemption
            for (const [leaf, file] of [['security-audit', ['SKILL.md']], ['performance-review', ['SKILL.md']], ['ui-design --mode=review', ['references', 'mode-review.md']]]) {
                const text = shipped('skills', leaf.split(' ')[0], ...file);
                assert.ok(/\*\*No nested fan-out\.\*\*/.test(text), `${leaf}: lost its own no-nested-fan-out rule`);
            }
        })
    },
    {
        name: '[review-fix-delivery-pins] the architect agent invokes the security and performance audits only when named, else reads the two design-altitude sections and applies them',
        ...guarded(() => {
            // Given the architect workflow step that evaluates the security and performance lenses
            const evaluate = lineStarting(shipped('agents', 'architect.md'), '**Evaluate**', 'architect Evaluate step');
            // Then the audits are invoked only on a named brief or a user request
            assert.ok(/only when the brief names them or the user asks for that audit/.test(evaluate), 'architect Evaluate step lost its named-only condition');
            // And otherwise the agent reads, in full and before applying the lenses, the two design-altitude sections by heading (the agent body holds no lens rules of its own)
            assert.ok(/otherwise read in full, BEFORE applying the lenses/.test(evaluate), 'architect Evaluate step lost the mandatory read before applying the lenses');
            assert.ok(/section `Architecture-Altitude Performance Review` of `\.claude\/skills\/performance-review\/SKILL\.md`/.test(evaluate), 'architect Evaluate step no longer names the performance design-altitude section');
            assert.ok(/section `Report-Only Mode` of `\.claude\/skills\/security-audit\/SKILL\.md`/.test(evaluate), 'architect Evaluate step no longer names the security design-altitude rule');
            // And the read lines point at headings that exist in the skills (a renamed heading fails here, not silently in a design review)
            assert.ok(/^## Architecture-Altitude Performance Review$/m.test(shipped('skills', 'performance-review', 'SKILL.md')), 'performance-review lost the Architecture-Altitude Performance Review heading');
            const security = shipped('skills', 'security-audit', 'SKILL.md');
            assert.ok(/^## Report-Only Mode /m.test(security) && /design altitude/.test(security), 'security-audit lost the Report-Only Mode section or its design-altitude rule');
            // And running the whole audits stays an explicit choice: the step does not auto-invoke them
            assert.ok(/a wave brief that names no sibling specialist is not a request for a duplicate audit/.test(evaluate), 'architect Evaluate step lost the no-duplicate-audit guarantee');
            assert.ok(!/invoke `security-audit` \/ `performance-review` \(architecture-altitude section\) on demand/.test(evaluate), 'architect Evaluate step still auto-invokes the audits');
        })
    },
    {
        name: '[review-fix-delivery-pins] /fix reads the target reference first when inference selects a branch, like an explicit --target',
        ...guarded(() => {
            // Given the /fix routing text for a run with no --target
            const text = shipped('skills', 'fix', 'SKILL.md');
            const inferred = lineStarting(text, 'No `--target` (or an unrecognized value)', '/fix no-target routing line');
            // Then an inferred branch reads its reference in full first, and the read is blocking
            assert.ok(/inference selects a branch \(`types\|ci\|logs\|test\|ui`\)/.test(inferred), '/fix no-target line lost the inferred-branch clause');
            assert.ok(/references\/target-<name>\.md` in full FIRST \(BLOCKING\)/.test(inferred), '/fix no-target line lost the blocking read of the target reference');
            // And every branch that has a reference file is one the clause can name
            for (const name of ['types', 'ci', 'logs', 'test', 'ui']) {
                assert.ok(fs.existsSync(path.join(CLAUDE_DIR, 'skills', 'fix', 'references', `target-${name}.md`)), `references/target-${name}.md is missing`);
            }
        })
    }
];

module.exports = { name: 'review-fix-delivery-pins', tests };
