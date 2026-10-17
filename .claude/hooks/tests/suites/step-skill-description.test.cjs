/**
 * Step-Skill Description Test Suite
 *
 * A skill that a workflow runs as a step describes itself as "Use when a workflow step or the user
 * asks for <job>. <one-line what>", after its optional `[Category]` tag, in at most 250 characters.
 * The form keeps direct `/name` use and workflow steps working while cutting model self-selection on
 * loose matches. The `workflow-*` wrappers are routed by the workflow catalog, not by this form, so
 * they are excluded.
 *
 * Coverage:
 *   TC-ADS-032 — on a temp fixture project (its own `workflows.json` with two step skills and their
 *                SKILL.md files), a description in the form at exactly 250 characters passes; one
 *                without the prefix, or 251 characters long, fails and names the skill.
 *   TC-ADS-033 — a fixture step whose skill is a `workflow-*` wrapper is excluded from the rule.
 *   TC-ADS-050 — in the framework repo, every step skill of the real `.claude/workflows.json` matches
 *                the form; in any other project the row is reported skipped with its reason, because
 *                an adopter may add workflow steps with its own skills.
 *
 * Portability: the rule rows build a temp project and never read this repo's registry or skills. The
 * self-check row is gated by the shared synchronous framework-repo guard (the runner reads `skip`
 * while it builds the test list). Paths use node:path; nothing is OS-specific.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { removeTempDir } = require('../lib/hook-runner.cjs');
const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const { resolveAllWorkflowManifests } = require('../../../scripts/lib/workflow-manifest.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const LIVE_SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own step-skill descriptions (framework-repo signal)';

const PREFIX = 'Use when a workflow step or the user asks for';
const FORM = /^(?:\[[^\]\r\n]+\] )?Use when a workflow step or the user asks for \S/;
const MAX_CHARS = 250;

/** The frontmatter `description` value (single-quoted, double-quoted or bare), or null. */
function frontmatterDescription(text) {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
    if (!fm) return null;
    const line = fm[1].split(/\r?\n/).find(entry => /^description:/.test(entry));
    if (!line) return null;
    const raw = line.replace(/^description:\s*/, '');
    if (/^'.*'$/.test(raw)) return raw.slice(1, -1).replace(/''/g, '\'');
    if (/^".*"$/.test(raw)) return JSON.parse(raw);
    return raw;
}

/** Every step skill of the project's workflows (all modes), `workflow-*` wrappers excluded. */
function stepSkills(rootDir) {
    const document = JSON.parse(fs.readFileSync(path.join(rootDir, '.claude', 'workflows.json'), 'utf8'));
    const skills = new Set();
    for (const id of Object.keys(document.workflows)) {
        for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir })) {
            for (const { skill } of manifest.occurrences) if (!skill.startsWith('workflow-')) skills.add(skill);
        }
    }
    return [...skills].sort();
}

/** Lint the step skills of `rootDir`; returns { checked, problems } with one problem line per broken rule. */
function lintStepSkillDescriptions(rootDir) {
    const checked = stepSkills(rootDir);
    const problems = [];
    for (const skill of checked) {
        const description = frontmatterDescription(fs.readFileSync(path.join(rootDir, '.claude', 'skills', skill, 'SKILL.md'), 'utf8'));
        if (description === null) problems.push(`${skill}: no frontmatter description`);
        else {
            if (!FORM.test(description)) problems.push(`${skill}: description must start with "${PREFIX} …" (after an optional [Category] tag)`);
            if (description.length > MAX_CHARS) problems.push(`${skill}: description is ${description.length} chars, over ${MAX_CHARS}`);
        }
    }
    return { checked, problems };
}

/** A description in the form, padded to exactly `length` characters. */
function formDescription(length) {
    const head = `[Fixture] ${PREFIX} a fixture job. `;
    return head + 'x'.repeat(length - head.length - 1) + '.';
}

/** Write a temp project (workflows.json + one SKILL.md per skill), run fn(root), remove it. */
function withFixtureProject(workflows, descriptions, fn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'step-skill-description-'));
    try {
        fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
        fs.writeFileSync(path.join(root, '.claude', 'workflows.json'), JSON.stringify({ version: '1', workflows }, null, 2));
        for (const [skill, description] of Object.entries(descriptions)) {
            const dir = path.join(root, '.claude', 'skills', skill);
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${skill}\ndescription: '${description.replace(/'/g, '\'\'')}'\n---\n\n# ${skill}\n`);
        }
        return fn(root);
    } finally {
        removeTempDir(root);
    }
}

const TWO_STEP_FLOW = { 'fx-flow': { sequence: ['alpha', 'beta'] } };

const tests = [
    {
        name: '[step-skill-description] TC-ADS-032: a 250-char description in the form passes; no prefix or 251 chars fails, naming the skill',
        fn: () => {
            // Given a fixture registry with two step skills whose descriptions follow the form, one at exactly 250 chars
            const valid = { alpha: formDescription(MAX_CHARS), beta: `${PREFIX} a second job. It does one thing.` };
            assert.equal(valid.alpha.length, MAX_CHARS);
            // When the lint runs, Then both are checked and nothing is reported
            withFixtureProject(TWO_STEP_FLOW, valid, root => {
                const { checked, problems } = lintStepSkillDescriptions(root);
                assert.deepEqual(checked, ['alpha', 'beta']);
                assert.deepEqual(problems, []);
            });
            // When beta loses the prefix, Then beta is named for the form
            withFixtureProject(TWO_STEP_FLOW, { ...valid, beta: '[Fixture] Use when doing a second job.' }, root => {
                const { problems } = lintStepSkillDescriptions(root);
                assert.equal(problems.length, 1, problems.join('\n'));
                assert.match(problems[0], /^beta: description must start with/);
            });
            // When alpha grows to 251 chars, Then alpha is named for the length
            withFixtureProject(TWO_STEP_FLOW, { ...valid, alpha: formDescription(MAX_CHARS + 1) }, root => {
                const { problems } = lintStepSkillDescriptions(root);
                assert.deepEqual(problems, [`alpha: description is ${MAX_CHARS + 1} chars, over ${MAX_CHARS}`]);
            });
        },
    },
    {
        name: '[step-skill-description] TC-ADS-033: a workflow-* wrapper step is excluded from the rule',
        fn: () => {
            // Given a fixture step whose skill is a workflow-* wrapper with a description outside the form
            const workflows = { 'fx-flow': { sequence: ['alpha', 'workflow-fixture-end'] } };
            const descriptions = { alpha: `${PREFIX} a job. It does one thing.`, 'workflow-fixture-end': '[Workflow] Closes the fixture run.' };
            // When the lint runs, Then the wrapper is neither checked nor reported
            withFixtureProject(workflows, descriptions, root => {
                const { checked, problems } = lintStepSkillDescriptions(root);
                assert.deepEqual(checked, ['alpha']);
                assert.deepEqual(problems, []);
            });
        },
    },
    {
        name: '[step-skill-description] TC-ADS-050: every step skill of the framework workflows.json matches the form',
        skip: LIVE_SKIP,
        fn: () => {
            // Given the framework repo's own registry and skills, When the lint runs
            const { checked, problems } = lintStepSkillDescriptions(REPO_ROOT);
            // Then no description breaks the form, and the check is not vacuous
            assert.deepEqual(problems, [], `step-skill descriptions:\n  ${problems.join('\n  ')}`);
            assert.ok(checked.length >= 20, `expected the real step-skill set, got ${checked.length}`);
        },
    },
];

module.exports = { name: 'step-skill-description', tests };
