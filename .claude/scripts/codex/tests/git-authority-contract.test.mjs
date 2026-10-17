import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// TC-HARNESS-004: static prompt-contract regression tests, NOT a runtime permission
// evaluator or a measurement of model compliance. No fixture executes Git.
const skill = readFileSync(new URL('../../../skills/plan/references/mode-execute.md', import.meta.url), 'utf8');
const agent = readFileSync(new URL('../../../agents/git-manager.md', import.meta.url), 'utf8');
const commitSkill = readFileSync(new URL('../../../skills/commit/SKILL.md', import.meta.url), 'utf8');
const section = (text, heading) => {
    const start = text.indexOf(heading);
    assert.notEqual(start, -1, `missing ${heading}`);
    return text.slice(start + heading.length).split(/\n## /)[0];
};
const expected = new Map([
    ['implementation-only', []], ['generic approval', []], ['approval-off', []],
    ['stage', ['stage']], ['commit', ['stage', 'commit']], ['push', ['push']],
    ['commit and push', ['stage', 'commit', 'push']], ['create-pr', ['create-pr']],
]);

function operationRows(text) {
    const rows = new Map();
    const body = section(text, '## Git Request Contract');
    for (const match of body.matchAll(/^\| `([^`]+)` \| `([^`]+)` \|/gm)) {
        assert.ok(!rows.has(match[1]), `duplicate request ${match[1]}`);
        rows.set(match[1], match[2] === 'none' ? [] : match[2].split(', '));
    }
    return rows;
}

function assertAuthority(plan, role) {
    // Failure signal: restoring any known unconditional trigger or command path.
    for (const text of [plan, role]) {
        assert.doesNotMatch(text, /auto-commit|finishes a feature\/fix|stage all|git add -A|git reset\s*&&/i);
        assert.doesNotMatch(text, /(?:must|always|mandatory)[^\n.]{0,100}(?:commit after approval|commit when complete|stage after review|push after commit)/i);
        assert.match(text, /operation[^\n]+scope[^\n]+sourceRequest/);
        assert.match(text, /implementation[^\n]+approval[^\n]+never[^\n]+(?:authoriz|grant)/i);
        // Amend is authority-gated like a commit, and never rewrites a pushed commit.
        assert.match(text, /`git commit --amend` only on an explicit amend request, never a pushed commit/);
        // Failure signal: the retired unconditional ban (or "amending is forbidden") coming back.
        assert.doesNotMatch(text, /NEVER `git commit --amend`|amend[^\n.]{0,80}forbidden/i);
    }
    const finalize = section(plan, '## Step 6: Finalize');
    assert.match(finalize, /Implementation complete/);
    assert.match(finalize, /No Git request/);
    assert.match(finalize, /no grant file/i);
    assert.match(finalize, /OPTIONAL GIT REQUEST/);
    const mandatory = plan.split('\n').find(line => line.startsWith('**Mandatory subagent calls:**'));
    assert.ok(mandatory);
    assert.doesNotMatch(mandatory, /git-manager/);
    assert.match(plan, /Conditional subagent call[^\n]+explicit user request/);
    assert.match(role, /stage-only[^\n]+stop/i);
    assert.match(role, /push-only[^\n]+skip[^\n]+staging/i);
    assert.match(role, /unrelated staged[^\n]+stop/i);
    assert.deepEqual(operationRows(role), expected);
}

const secretDiagnosticAnchors = [
    '- **GATE A (hard)', '- SECRETS > 0', '**If SECRETS > 0:**',
    '| Secrets detected', '**IMPORTANT MUST ATTENTION** NEVER commit secrets,',
    '| "Just one secret match,',
];

function assertSecretDiagnostics(role) {
    assert.doesNotMatch(role, /show (?:the )?matched lines|(?:show|display|echo) raw (?:matches|secret values)/i);
    assert.match(role, /Never include raw matches or secret values in chat, tool output, or reports/);
    for (const anchor of secretDiagnosticAnchors) {
        const lines = role.split('\n').filter(line => line.startsWith(anchor));
        assert.equal(lines.length, 1, `one diagnostic anchor: ${anchor}`);
        assert.match(lines[0], /file\/line\/rule\/category and redacted metadata only/);
        assert.match(lines[0], /STOP|[Bb]lock/);
    }
}

test('TC-HARNESS-004 secret-match diagnostics preserve blocking without raw-value disclosure', () => {
    // Source contract only: synthetic wording, no secret reads or model-compliance claim.
    assertSecretDiagnostics(agent);
    assertSecretDiagnostics(agent.replaceAll('\r\n', '\n').replaceAll('\n', '\r\n'));
});

test('TC-HARNESS-004 secret-diagnostic mutants fail at every positive-output anchor', () => {
    assertSecretDiagnostics(agent);
    for (const anchor of secretDiagnosticAnchors) {
        const line = agent.split('\n').find(value => value.startsWith(anchor));
        for (const replacement of ['Show the matched lines', 'diagnostic information']) {
            const mutant = agent.replace(line, line.replace('file/line/rule/category and redacted metadata only', replacement));
            assert.notEqual(mutant, agent);
            assert.throws(() => assertSecretDiagnostics(mutant), { code: 'ERR_ASSERTION' });
        }
    }
});

test('TC-HARNESS-004 commit skill gates amend on an explicit amend request, never a blanket ban', () => {
    // Failure signal: the commit skill reinstating the retired ban, or letting a plain commit request amend.
    assert.doesNotMatch(commitSkill, /amend[^\n.]{0,80}forbidden/i);
    assert.match(commitSkill, /amend only on an explicit amend request for this task's unpushed commit/);
    assert.match(commitSkill, /"amend":true/);
});

test('TC-HARNESS-004 implementation-only completes without Git or a grant file', () => {
    assertAuthority(skill, agent);
    assert.deepEqual(operationRows(agent).get('implementation-only'), []);
});

test('TC-HARNESS-004 generic approval accepts implementation without Git authority', () => {
    assert.deepEqual(operationRows(agent).get('generic approval'), []);
    assert.match(section(skill, '## Step 5: User Approval'), /does not authorize staging, committing, or pushing/);
});

test('TC-HARNESS-004 approval-off changes only the implementation approval gate', () => {
    assert.deepEqual(operationRows(agent).get('approval-off'), []);
    assert.match(section(skill, '## Mode Flags'), /never grants Git authority/);
});

test('TC-HARNESS-004 scoped commit permits necessary staging and a new commit only', () => {
    assert.deepEqual(operationRows(agent).get('commit'), ['stage', 'commit']);
    assert.match(section(agent, '## Git Request Contract'), /sourceRequest[^\n]+actual user message/);
    assert.match(agent, /git add -- path\/to\/authorized-file/);
    assert.doesNotMatch(section(agent, '### TOOL 4: Commit'), /(?:if )?git push/);
});

test('TC-HARNESS-004 separate push request does not stage or commit again', () => {
    assert.deepEqual(operationRows(agent).get('push'), ['push']);
    assert.match(section(agent, '## Git Request Contract'), /remote[^\n]+branch/);
    assert.match(agent, /### Authorized Push/);
    assert.doesNotMatch(section(agent, '### PR TOOL 1:'), /git push/);
});

test('TC-HARNESS-004 bounded property: each request permits exactly its declared operations', () => {
    // Domain: 8 request classes × 4 operations = 32 cases, including generic
    // approval and approval-off. Quality gates may still block an authorized
    // operation; this checks the source authority table, not readiness.
    const rows = operationRows(agent);
    for (const [request, allowed] of expected) {
        for (const operation of ['stage', 'commit', 'push', 'create-pr']) {
            assert.equal(rows.get(request)?.includes(operation), allowed.includes(operation),
                JSON.stringify({ request, operation }));
        }
    }
    // Boundary counter-cases: stage and push are standalone; unknown intent
    // has no table grant, and commit never contains push/create-pr authority.
    assert.deepEqual(rows.get('stage'), ['stage']);
    assert.equal(rows.get('do whatever is needed'), undefined);
    assert.equal(rows.get('commit').includes('push'), false);
});

test('TC-HARNESS-004 seeded authority mutants are rejected at summary/body/closing anchors', () => {
    assertAuthority(skill, agent); // tripwire: valid source must actually pass
    const seeds = ['MUST commit after approval.', 'Always commit when complete.',
        'Mandatory stage after review.', 'Always push after commit.'];
    // Bounded mutation domain: 2 source prompts × 3 anchors × 4 escalations.
    for (const target of ['skill', 'agent']) {
        for (const heading of ['## Quick Summary', '## Workflow', '## Closing Reminders']) {
            for (const seed of seeds) {
                const original = target === 'skill' ? skill : agent;
                assert.ok(original.includes(heading));
                const mutant = original.replace(heading, `${heading}\n${seed}`);
                assert.notEqual(mutant, original);
                assert.throws(() => assertAuthority(target === 'skill' ? mutant : skill,
                    target === 'agent' ? mutant : agent), { code: 'ERR_ASSERTION', operator: 'doesNotMatch' });
            }
        }
    }
    // Semantic mutants toggle each of the 32 permission decisions without
    // suspicious wording: both escalation and loss of benign authority fail.
    const row = (request, operations) => `| \`${request}\` | \`${operations.join(', ') || 'none'}\` |`;
    for (const [request, allowed] of expected) {
        for (const operation of ['stage', 'commit', 'push', 'create-pr']) {
            const changed = allowed.includes(operation)
                ? allowed.filter(value => value !== operation) : [...allowed, operation];
            const mutant = agent.replace(row(request, allowed), row(request, changed));
            assert.notEqual(mutant, agent);
            assert.throws(() => assertAuthority(skill, mutant), { code: 'ERR_ASSERTION', operator: 'deepStrictEqual' });
        }
    }
});
