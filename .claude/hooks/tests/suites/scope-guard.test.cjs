'use strict';

/**
 * Lean supplied-spec scope guard.
 *
 * Business intent: implementing an already-written spec must not grow scope silently.
 * The workflow owns a lightweight `spec_baseline` identity in its run report; `plan`
 * keeps its phases within governing intent; `plan --mode=review` checks that boundary once.
 * This suite protects those outcomes without forcing Git-object storage, plan
 * frontmatter, or a dedicated baseline section into every plan.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILLS_DIR = path.resolve(__dirname, '..', '..', '..', 'skills');
const readSkill = name => fs.readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');

const plan = () => readSkill('plan');
const review = () => fs.readFileSync(path.join(SKILLS_DIR, 'plan', 'references', 'mode-review.md'), 'utf8').replace(/\r\n/g, '\n');
const workflow = () => readSkill('workflow-implement-spec');

const tests = [
    {
        name: '[scope-guard] TC-GWF-023 workflow records the supplied spec identity before planning',
        fn: () => {
            const text = workflow();
            assert.match(text, /Before `\/plan`, the workflow report records the supplied spec path and revision as `spec_baseline`/);
            assert.match(text, /`\/plan` names it as governing intent/);
        }
    },
    {
        name: '[scope-guard] TC-GWF-024 plan --mode=review checks supplied scope without prescribing storage mechanics',
        fn: () => {
            const text = review();
            assert.match(text, /If a supplied spec baseline exists, review against that baseline and separate proposed additions/);
            assert.match(text, /Is the outcome governed by a clear owner\/spec, with non-goals and no silent expansion/);
            assert.doesNotMatch(text, /git hash-object|git cat-file|baseline unrecoverable/);
        }
    },
    {
        name: '[scope-guard] TC-GWF-025 behavior outside the baseline requires owner approval',
        fn: () => {
            const planText = plan();
            const workflowText = workflow();
            assert.match(planText, /Put proposed behavior outside it under `Proposed additions — owner approval required`/);
            assert.match(workflowText, /becomes a question, never an accepted plan phase/);
        }
    },
    {
        name: '[scope-guard] TC-GWF-026 plan phases and acceptance gates remain inside the supplied baseline',
        fn: () => {
            assert.match(workflow(), /keeps every phase and acceptance gate within that baseline/);
            assert.match(plan(), /Desired observable outcome and governing intent\/spec/);
        }
    },
    {
        name: '[scope-guard] TC-GWF-027 plans without a supplied spec keep the generic planning contract',
        fn: () => {
            const text = plan();
            assert.equal((text.match(/\*\*Supplied spec:\*\*/g) || []).length, 1);
            assert.match(text, /Write `plan\.md` under the configured plans root/);
            assert.doesNotMatch(text, /spec_baseline:|git hash-object/);
        }
    },
    {
        name: '[scope-guard] TC-GWF-045 baseline handling stays lightweight and workflow-owned',
        fn: () => {
            const workflowText = workflow();
            const planText = plan();
            assert.match(workflowText, /workflow report records the supplied spec path and revision as `spec_baseline`/);
            assert.doesNotMatch(planText, /Supplied-Spec Scope Baseline|git hash-object|frontmatter carries `spec_baseline`/);
        }
    },
    {
        name: '[scope-guard] TC-GWF-046 missing or changed requested behavior stops before planning',
        fn: () => {
            const text = workflow();
            assert.match(text, /requested behavior is not in the supplied spec, STOP before `\/plan`/);
            assert.match(text, /Never guess the missing behavior and never drop it silently/);
            assert.match(text, /switch to `workflow-feature`, which updates the spec first/);
        }
    }
];

module.exports = { name: 'scope-guard', tests };
