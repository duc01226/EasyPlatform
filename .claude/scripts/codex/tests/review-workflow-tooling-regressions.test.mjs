import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const normalizeEol = text => text.replace(/\r\n/g, '\n');

test('TC-WFPROTO-005: redundant why-review sweep preserves review-changes validation gate', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'wfproto-sweep-'));
    try {
        const tempScriptDir = path.join(tempRoot, '.claude', 'scripts');
        const tempSkillDir = path.join(tempRoot, '.claude', 'skills', 'workflow-test');
        await fs.mkdir(tempScriptDir, { recursive: true });
        await fs.mkdir(tempSkillDir, { recursive: true });

        await fs.copyFile(
            path.join(repoRoot, '.claude', 'scripts', 'sweep-redundant-why-review.py'),
            path.join(tempScriptDir, 'sweep-redundant-why-review.py')
        );

        await fs.writeFile(
            path.join(tempRoot, '.claude', 'workflows.json'),
            JSON.stringify(
                {
                    workflows: {
                        'review-changes': {
                            sequence: [
                                'review-changes',
                                'why-review',
                                'security-review',
                                'why-review',
                                'docs-update'
                            ]
                        }
                    }
                },
                null,
                2
            ),
            'utf8'
        );

        await fs.writeFile(
            path.join(tempSkillDir, 'SKILL.md'),
            [
                '# Workflow Test',
                '',
                '**Steps:** /review-changes -> /why-review -> /security-review -> /why-review -> /docs-update',
                ''
            ].join('\n'),
            'utf8'
        );

        await execFileAsync('python', [path.join(tempScriptDir, 'sweep-redundant-why-review.py'), '--apply'], {
            cwd: tempRoot
        });

        const workflowConfig = JSON.parse(
            await fs.readFile(path.join(tempRoot, '.claude', 'workflows.json'), 'utf8')
        );
        assert.deepEqual(
            workflowConfig.workflows['review-changes'].sequence,
            ['review-changes', 'why-review', 'security-review', 'docs-update'],
            'sweep must preserve review-changes -> why-review while removing a redundant control pair'
        );

        const skillText = normalizeEol(await fs.readFile(path.join(tempSkillDir, 'SKILL.md'), 'utf8'));
        assert.match(skillText, /\/review-changes -> \/why-review -> \/security-review -> \/docs-update/);
        assert.doesNotMatch(skillText, /\/security-review -> \/why-review/);
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

test('TC-WFPROTO-006: common protocol instructions are reproducible from workflow generator', async () => {
    const generator = require(path.join(repoRoot, '.claude', 'scripts', 'sync-copilot-workflows.cjs'));
    const workflowConfig = JSON.parse(
        await fs.readFile(path.join(repoRoot, '.claude', 'workflows.json'), 'utf8')
    );
    const generated = normalizeEol(generator.generateCommonProtocolFile(workflowConfig));
    const tracked = normalizeEol(
        await fs.readFile(path.join(repoRoot, '.github', 'instructions', 'common-protocol.instructions.md'), 'utf8')
    );

    assert.equal(tracked, generated, 'tracked common protocol file must match generator output');

    const workflow = workflowConfig.workflows['workflow-review-changes'];
    const commandMapping = workflowConfig.commandMapping || {};
    const arrow = '\u2192';
    // Reproduce the generator's barrier-aware rendering (parallelGroups collapse to one token)
    // via its own exported renderer \u2014 single source of truth, no re-flattening drift.
    const parallelGroups = Array.isArray(workflow.parallelGroups) ? workflow.parallelGroups : [];
    const expectedSequence = generator.renderSequenceWithBarriers(
        workflow.sequence,
        parallelGroups,
        ` ${arrow} `,
        step => commandMapping[step]?.copilot || step
    );
    const sectionStart = tracked.indexOf('**workflow-review-changes**');
    assert.notEqual(sectionStart, -1, 'generated workflow catalog must include workflow-review-changes');
    const nextSectionStart = tracked.indexOf('\n**', sectionStart + 1);
    const reviewChangesSection = tracked.slice(
        sectionStart,
        nextSectionStart === -1 ? undefined : nextSectionStart
    );
    const stepsLine = reviewChangesSection
        .split('\n')
        .find(line => line.trim().startsWith('Steps:'));

    assert.match(reviewChangesSection, new RegExp(`Steps: ${expectedSequence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.ok(stepsLine, 'generated review-changes section must include a Steps line');
    assert.ok(!workflow.sequence.includes('plan-validate'), 'review-changes workflow must not include plan-validate');
    assert.doesNotMatch(stepsLine, /plan-validate/);
    assert.doesNotMatch(stepsLine, /review-ui/);
    assert.ok(
        !stepsLine.includes(`code-simplifier ${arrow} code-review ${arrow} integration-test-verify`),
        'code-review must not be a separate workflow-level step after code-simplifier'
    );
});

test('TC-WFPROTO-007: prompt surfaces do not retain stale review workflow guidance', async () => {
    const promptSurfacePaths = [
        '.claude/workflows.json',
        '.claude/workflows/primary-workflow.md',
        '.claude/skills/review-architecture/SKILL.md',
        '.claude/skills/review-ui/SKILL.md',
        '.agents/skills/review-architecture/SKILL.md',
        '.agents/skills/review-ui/SKILL.md',
        '.github/instructions/common-protocol.instructions.md',
        '.codex/CODEX_CONTEXT.md',
        'AGENTS.md'
    ];
    const obsoleteWorkflowSummary = /code-simplifier\s*(?:->|→|\+)\s*review-changes\s*(?:->|→|\+)\s*review-architecture\s*(?:->|→|\+)\s*code-review\s*(?:->|→|\+)\s*performance/;
    const obsoleteReviewUiSibling = /(?:review-ui[`$]?[^.\n]*parallel-batch sibling|Sibling of [`$]?review-architecture)/;

    for (const promptSurfacePath of promptSurfacePaths) {
        const text = normalizeEol(await fs.readFile(path.join(repoRoot, promptSurfacePath), 'utf8'));
        assert.doesNotMatch(
            text,
            obsoleteWorkflowSummary,
            `${promptSurfacePath} must not describe workflow-review-changes with obsolete child-step internals`
        );
        assert.doesNotMatch(
            text,
            obsoleteReviewUiSibling,
            `${promptSurfacePath} must not describe review-ui as an external sibling reviewer`
        );
    }
});

test('TC-WFPROTO-008: review workflow batch prompt uses canonical skill ids and specialized agent types', async () => {
    const workflowText = normalizeEol(await fs.readFile(path.join(repoRoot, '.claude', 'workflows.json'), 'utf8'));
    const skillText = normalizeEol(
        await fs.readFile(path.join(repoRoot, '.claude', 'skills', 'workflow-review-changes', 'SKILL.md'), 'utf8')
    );
    const combined = `${workflowText}\n${skillText}`;

    assert.doesNotMatch(combined, /`performance`, `integration-test-review`, `security`/);
    assert.doesNotMatch(combined, /Agent\(security,/);
    assert.doesNotMatch(combined, /subagent_type(?:`|":\s*)\s*`?code-reviewer`?[^.\n]*Steps 3[–-]7/);
    assert.match(combined, /`performance-review`, `integration-test-review`, `security-review`/);
    assert.match(combined, /Agent\(security-review, subagent_type="security-auditor"/);
    assert.match(combined, /Agent\(review-architecture, subagent_type="architect"/);
});

test('TC-WFADV-021: parallelGroups structural guards reject malformed barrier configs (no silent false-pass)', async () => {
    const { checkParallelGroupsStructure } = await import(
        pathToFileURL(path.join(repoRoot, '.claude', 'scripts', 'codex', 'verify-workflow-cycle-compliance.mjs')).href
    );
    const sequence = ['a', 'b', 'c', 'd'];
    const collect = workflow => {
        const failures = [];
        checkParallelGroupsStructure('wf', workflow, sequence, failures);
        return failures;
    };

    // A well-formed group must pass silently (no false-positive).
    assert.deepEqual(
        collect({ parallelGroups: [{ id: 'reviewers', members: ['a', 'b'], barrier: true, conditionalMembers: ['b'] }] }),
        [],
        'well-formed parallel group must produce zero structural failures'
    );

    // present-but-non-array parallelGroups must FAIL, not be silently treated as "no groups".
    const nonArray = collect({ parallelGroups: { id: 'x', members: ['a', 'b'], barrier: true } });
    assert.ok(
        nonArray.some(f => /must be an array/.test(f)),
        'non-array parallelGroups must be flagged'
    );

    // a group without a usable id must FAIL — the mirror renderers dedup by id, so a missing id
    // would silently drop the barrier token from the rendered mirror.
    const missingId = collect({ parallelGroups: [{ members: ['a', 'b'], barrier: true }] });
    assert.ok(
        missingId.some(f => /non-empty string id/.test(f)),
        'group missing a string id must be flagged'
    );

    // duplicate group ids must FAIL — renderer dedup would collapse them to one token.
    const dupId = collect({
        parallelGroups: [
            { id: 'dup', members: ['a', 'b'], barrier: true },
            { id: 'dup', members: ['c', 'd'], barrier: true }
        ]
    });
    assert.ok(
        dupId.some(f => /duplicate group id/.test(f)),
        'duplicate group id must be flagged'
    );
});
