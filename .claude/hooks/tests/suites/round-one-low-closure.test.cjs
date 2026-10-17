'use strict';
// Business intent: LOW deferral cannot waive post-fix review or failed gates.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const policy = require('../../../scripts/lib/review-policy.cjs');
const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const tests = [
    { name: 'TC-R1LC-001 a scoped LOW fix cannot claim a fresh whole-target review', fn: () => {
        assert.throws(() => policy.evaluateRound({ round: 1, findings: [{ id: 'low', severity: 'LOW', resolution: 'scoped-fix-verified' }] }), /resolution/);
        assert.equal(policy.evaluateRound({ round: 2, findings: [{ id: 'low', severity: 'LOW' }] }).canComplete, true);
        assert.equal(policy.evaluateRound({ round: 3, findings: [{ id: 'low', severity: 'LOW' }], hardGates: [{ id: 'tests', kind: 'test', status: 'FAIL' }] }).status, 'ESCALATE');
    } },
    { name: 'TC-R1LC-004 every post-fix edit requires fresh review including simplification', skip: isFrameworkRepo(root) ? false : 'authoring source contract', fn: () => {
        // The post-fix review re-runs the same review occurrences, so its trigger set lives in the workflow context and its skill
        const w = JSON.parse(fs.readFileSync(path.join(root,'.claude/workflows.json'),'utf8')).workflows['workflow-review-changes'];
        const skill = fs.readFileSync(path.join(root, '.claude/skills/workflow-review-changes/SKILL.md'), 'utf8');
        for (const [owner, text] of [['injectContext', w.preActions.injectContext], ['SKILL.md', skill]]) {
            assert.match(text, /any fix, simplification, spec\/doc\/test repair or validated blocking finding the fix step rejects needs (that|this) fresh (re-)?review/i, owner);
            assert.match(text, /a narrower spot check never replaces it/, owner);
            assert.doesNotMatch(text, /no post-fix (full )?re-review/i, `${owner} never exempts a fix from the post-fix review`);
        }
    } }
];
module.exports = { name: 'round-one-low-closure', tests };
