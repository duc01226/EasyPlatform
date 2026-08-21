import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const normalizeEol = text => text.replace(/\r\n/g, '\n');

test('TC-WFPROTO-005: redundant why-review sweep preserves changes-review validation gate', async () => {
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
                        'changes-review': {
                            sequence: [
                                'changes-review',
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
                '**Steps:** /changes-review -> /why-review -> /security-review -> /why-review -> /docs-update',
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
            workflowConfig.workflows['changes-review'].sequence,
            ['changes-review', 'why-review', 'security-review', 'docs-update'],
            'sweep must preserve changes-review -> why-review while removing a redundant control pair'
        );

        const skillText = normalizeEol(await fs.readFile(path.join(tempSkillDir, 'SKILL.md'), 'utf8'));
        assert.match(skillText, /\/changes-review -> \/why-review -> \/security-review -> \/docs-update/);
        assert.doesNotMatch(skillText, /\/security-review -> \/why-review/);
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

test('TC-WFPROTO-007: prompt surfaces do not retain stale review workflow guidance', async () => {
    const promptSurfacePaths = [
        '.claude/workflows.json',
        '.claude/workflows/primary-workflow.md',
        '.claude/skills/architecture-review/SKILL.md',
        '.claude/skills/ui-review/SKILL.md',
        '.agents/skills/architecture-review/SKILL.md',
        '.agents/skills/ui-review/SKILL.md',
        '.codex/CODEX_CONTEXT.md',
        'AGENTS.md'
    ];
    const obsoleteWorkflowSummary = /code-simplifier\s*(?:->|→|\+)\s*changes-review\s*(?:->|→|\+)\s*architecture-review\s*(?:->|→|\+)\s*code-review\s*(?:->|→|\+)\s*performance/;
    const obsoleteReviewUiSibling = /(?:ui-review[`$]?[^.\n]*parallel-batch sibling|Sibling of [`$]?architecture-review)/;

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
            `${promptSurfacePath} must not describe ui-review as an external sibling reviewer`
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
    assert.match(combined, /Agent\(architecture-review, subagent_type="architect"/);
});

test('TC-WFADV-022: whole-target why-review starts in parallel with changes-review and preserves the final gate', async () => {
    const workflows = JSON.parse(
        await fs.readFile(path.join(repoRoot, '.claude', 'workflows.json'), 'utf8')
    ).workflows;
    const workflow = workflows['workflow-review-changes'];
    const skillText = normalizeEol(
        await fs.readFile(path.join(repoRoot, '.claude', 'skills', 'workflow-review-changes', 'SKILL.md'), 'utf8')
    );
    const codexContextText = normalizeEol(
        await fs.readFile(path.join(repoRoot, '.codex', 'CODEX_CONTEXT.md'), 'utf8')
    );
    const loopSkillText = normalizeEol(
        await fs.readFile(path.join(repoRoot, '.claude', 'skills', 'workflow-review-changes-loop', 'SKILL.md'), 'utf8')
    );
    const workflowVerifierText = normalizeEol(
        await fs.readFile(path.join(repoRoot, '.claude', 'scripts', 'codex', 'verify-workflow-cycle-compliance.mjs'), 'utf8')
    );

    assert.deepEqual(
        workflow.sequence.slice(0, 3),
        ['changes-review', 'why-review --target=whole-review-target', 'why-review'],
        'initial whole-target review must be a distinct sequence occurrence before findings validation'
    );
    assert.deepEqual(
        workflow.parallelGroups.find(group => group.id === 'initial-reviews'),
        {
            id: 'initial-reviews',
            members: ['changes-review', 'why-review --target=whole-review-target'],
            conditionalMembers: [],
            barrier: true
        },
        'changes-review and whole-target why-review must share an unconditional all-return barrier'
    );
    assert.deepEqual(
        workflow.stepMeta['why-review --target=whole-review-target'],
        { executionMode: 'subagent', contextBudget: 'high' },
        'whole-target why-review must run out-of-band so changes-review can remain inline'
    );
    assert.deepEqual(
        workflow.sequence.slice(-6),
        ['changes-review', 'why-review', 'scan --target=domain-entities', 'docs-update', 'workflow-end', 'watzup'],
        'the settled-state final holistic why-review must remain after the conditional re-review and before terminal documentation sync'
    );
    assert.match(skillText, /Initial Parallel Phase \(Steps 1[–-]2\)/);
    assert.match(skillText, /fresh `code-reviewer` sub-agent[^\n]*FULL mode/);
    assert.match(skillText, /Advance only after BOTH return/);
    assert.match(skillText, /step 16[^\n]*settled[^\n]*whole target/i);
    assert.match(
        codexContextText,
        /plan-execute -> changes-review -> why-review -> scan --target=domain-entities -> docs-update/,
        'generated guidance must preserve the later conditional changes-review occurrence'
    );
    assert.match(loopSkillText, /full 20-step sequence/);
    assert.doesNotMatch(loopSkillText, /full 19-step sequence/);
    assert.match(loopSkillText, /fix cycle, steps 12[–-]15/);
    assert.doesNotMatch(loopSkillText, /fix cycle, steps 11[–-]14/);
    assert.doesNotMatch(
        loopSkillText,
        /workflow-review-changes\/SKILL\.md:\d/,
        'loop protocol must use stable named-section references instead of shifted line coordinates'
    );
    assert.match(workflowVerifierText, /step-15 re-review is inline by design/);
    assert.doesNotMatch(workflowVerifierText, /step-12 re-review is inline by design/);
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
