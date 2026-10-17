import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolvePythonCommand } from '../../../hooks/tests/lib/python-command.cjs';

const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const normalizeEol = text => text.replace(/\r\n/g, '\n');
// A skill's contract is SKILL.md plus its point-of-use references (sorted), joined with '\n':
// workflow-review-changes keeps its `--fix-loop` mode in `references/fix-loop.md`, read first when the flag is present.
async function readSkillContract(name) {
    const dir = path.join(repoRoot, '.claude', 'skills', name);
    const parts = [await fs.readFile(path.join(dir, 'SKILL.md'), 'utf8')];
    const refs = await fs.readdir(path.join(dir, 'references')).catch(error => {
        if (error.code === 'ENOENT') return [];
        throw error;
    });
    for (const file of refs.filter(entry => entry.endsWith('.md')).sort()) {
        parts.push(await fs.readFile(path.join(dir, 'references', file), 'utf8'));
    }
    return parts.join('\n');
}

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
                                'security-audit',
                                'why-review',
                                'docs-manager --mode=update'
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
                '**Steps:** /changes-review -> /why-review -> /security-audit -> /why-review -> /docs-manager --mode=update',
                ''
            ].join('\n'),
            'utf8'
        );

        const python = resolvePythonCommand({ cwd: tempRoot });
        await execFileAsync(python.command, [...python.baseArgs, path.join(tempScriptDir, 'sweep-redundant-why-review.py'), '--apply'], {
            cwd: tempRoot, timeout: 10000, windowsHide: true
        });

        const workflowConfig = JSON.parse(
            await fs.readFile(path.join(tempRoot, '.claude', 'workflows.json'), 'utf8')
        );
        assert.deepEqual(
            workflowConfig.workflows['changes-review'].sequence,
            ['changes-review', 'why-review', 'security-audit', 'docs-manager --mode=update'],
            'sweep must preserve changes-review -> why-review while removing a redundant control pair'
        );

        const skillText = normalizeEol(await fs.readFile(path.join(tempSkillDir, 'SKILL.md'), 'utf8'));
        assert.match(skillText, /\/changes-review -> \/why-review -> \/security-audit -> \/docs-manager --mode=update/);
        assert.doesNotMatch(skillText, /\/security-audit -> \/why-review/);
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

test('TC-WFPROTO-007: prompt surfaces do not retain stale review workflow guidance', async () => {
    const promptSurfacePaths = [
        '.claude/workflows.json',
        '.claude/workflows/primary-workflow.md',
        '.claude/skills/architecture/references/mode-review.md',
        '.claude/skills/ui-design/references/mode-review.md',
        '.agents/skills/architecture/references/mode-review.md',
        '.agents/skills/ui-design/references/mode-review.md',
        'AGENTS.md'
    ];
    const obsoleteWorkflowSummary = /code-simplifier\s*(?:->|→|\+)\s*changes-review\s*(?:->|→|\+)\s*architecture(?:-review| --mode=review)\s*(?:->|→|\+)\s*code-review\s*(?:->|→|\+)\s*performance/;
    const obsoleteReviewUiSibling = /(?:ui-design --mode=review[`$]?[^.\n]*parallel-batch sibling|Sibling of [`$]?architecture(?:-review| --mode=review))/;

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
            `${promptSurfacePath} must not describe ui-design --mode=review as an external sibling reviewer`
        );
    }
});

test('TC-WFPROTO-008: review workflow batch prompt uses canonical skill ids and specialized agent types', async () => {
    const workflowText = normalizeEol(await fs.readFile(path.join(repoRoot, '.claude', 'workflows.json'), 'utf8'));
    const skillText = normalizeEol(
        await fs.readFile(path.join(repoRoot, '.claude', 'skills', 'workflow-review-changes', 'SKILL.md'), 'utf8')
    );
    const combined = `${workflowText}\n${skillText}`;

    assert.doesNotMatch(combined, /`performance`, `integration-test --mode=review`, `security`/);
    assert.doesNotMatch(combined, /Agent\(security,/);
    assert.doesNotMatch(combined, /subagent_type(?:`|":\s*)\s*`?code-reviewer`?[^.\n]*Steps 3[–-]7/);
    const workflow = JSON.parse(workflowText).workflows['workflow-review-changes'];
    const contracts = new Map(workflow.sequence.filter(step => typeof step === 'object').map(step => [step.id, step]));
    assert.equal(contracts.get('performance-review').skill, 'performance-review');
    assert.equal(contracts.get('integration-tests-review').skill, 'integration-test');
    assert.match(contracts.get('integration-tests-review').args, /--mode=review/);
    assert.equal(contracts.get('security-audit').skill, 'security-audit');
    assert.equal(contracts.get('architecture-compliance-review').skill, 'architecture');
    assert.match(contracts.get('architecture-compliance-review').args, /--mode=review/);
    assert.match(skillText, /appropriate specialist when expertise or independent judgment is needed/);

});

test('TC-WFADV-022: adaptive orchestration keeps full-target and post-fix review obligations', async () => {
    const w = JSON.parse(await fs.readFile(path.join(repoRoot,'.claude/workflows.json'),'utf8')).workflows['workflow-review-changes'];
    const source = normalizeEol(await readSkillContract('workflow-review-changes'));
    assert.equal(w.defaultMode,'fix-loop');
    assert.equal(w.sequence[0].id,'initial-changes-review');
    assert.equal(w.sequence[1].id,'whole-target-why-review');
    assert.equal(w.stepMeta['initial-changes-review'].executionMode,'inline');
    assert.ok(!w.parallelGroups, 'agent chooses grouping; there is no forced topology');
    assert.match(source,/Wait for every report before fixing/);
    assert.match(source,/Re-run general, whole-target rationale and every applicable specialist lens/);
    assert.match(source,/no fixed file\/line\/byte caps/);
    assert.match(source,/Always create the phase todos, one row per occurrence, before running a skill/);
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

test('TC-HARNESS-006: review consumers name the executable canonical policy', async () => {
    const shared = normalizeEol(await fs.readFile(
        path.join(repoRoot, '.claude', 'skills', 'shared', 'sync-inline-versions.md'), 'utf8'
    ));
    const policy = await import(pathToFileURL(path.join(repoRoot, '.claude', 'scripts', 'lib', 'review-policy.cjs')).href);
    assert.match(shared, /## SYNC:review-policy/);
    assert.match(shared, /blockingFindings\(round, findings, hardGates\)/);
    assert.equal(policy.MAX_ROUNDS, 3);
    assert.deepEqual(
        policy.blockingFindings(2, [{ id: 'low', severity: 'LOW' }]),
        [],
        'round-two LOW floor must be executable, not merely prose'
    );
    assert.equal(
        policy.blockingFindings(2, [], [{ id: 'tests', status: 'FAIL' }]).length,
        1,
        'binary gates remain blocking at the LOW floor'
    );
});
