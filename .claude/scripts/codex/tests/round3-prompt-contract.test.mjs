import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = relative => fs.readFileSync(path.join(root, '.claude', relative), 'utf8');
const skill = name => read(`skills/${name}/SKILL.md`);
// A loop skill's contract is SKILL.md plus its point-of-use references (sorted), joined with '\n':
// the `--fix-loop` modes of why-review, changes-review and workflow-review-changes live in
// `references/fix-loop.md`, read first when the flag is present.
const skillContract = name => {
    const refs = path.join(root, '.claude', 'skills', name, 'references');
    const parts = [skill(name)];
    if (fs.existsSync(refs)) {
        for (const file of fs.readdirSync(refs).filter(entry => entry.endsWith('.md')).sort()) parts.push(fs.readFileSync(path.join(refs, file), 'utf8'));
    }
    return parts.join('\n');
};
const local = text => text.replace(/<!-- SYNC:([^\s>]+) -->[\s\S]*?<!-- \/SYNC:\1 -->/g, '');
const policy = createRequire(import.meta.url)('../../lib/review-policy.cjs');
const { resolveWorkflowManifest } = createRequire(import.meta.url)('../../lib/workflow-manifest.cjs');

// These checks protect instruction contracts, not claims about model execution.
// Each mutation restores an actual contradictory clause or removes an essential
// instruction. It must fail the SAME assertion used on the real source.
function rejects(check, source, before, after) {
    assert.ok(source.includes(before), `mutation anchor exists: ${before}`);
    // Replace every occurrence so repeated operational instructions cannot leave a surviving copy
    // that makes a weakened contract appear valid.
    const mutant = source.replaceAll(before, after);
    assert.notEqual(mutant, source);
    assert.throws(() => check(mutant), { code: 'ERR_ASSERTION' });
}

function assertAcceptance(text) {
    assert.match(text, /replace visual baselines ONLY after inspection and an explicit `HUMAN-ACCEPTED` record/);
    assert.match(text, /Preserve the previous accepted baseline while acceptance is missing, ambiguous, rejected, or environment-blocked/);
    assert.doesNotMatch(text, /ALWAYS update visual baselines when UI changes/);
}

test('R3-PROMPT-025: visual candidates cannot redefine expectations without acceptance', () => {
    const source = read('agents/e2e-runner.md');
    assertAcceptance(source);
    rejects(assertAcceptance, source, 'replace visual baselines ONLY after inspection and an explicit `HUMAN-ACCEPTED` record', 'ALWAYS update visual baselines when UI changes');
    rejects(assertAcceptance, source, 'Preserve the previous accepted baseline while acceptance is missing, ambiguous, rejected, or environment-blocked', 'Replace the previous baseline immediately');
});

function assertSyncHandoff(text) {
    assert.match(text, /Sync Codex Mirrors/);
    assert.match(text, /one executable pipeline/);
    assert.match(text, /--skip=claude-md/);
    assert.match(text, /not a nested `\/sync-codex` skill call/);
    assert.match(text, /TaskCreate: "Sync Codex mirrors from updated CLAUDE\.md → invoke \/sync-codex"/);
    assert.doesNotMatch(text, /Report stale Codex mirrors → instruct user/);
}

test('R3-PROMPT-026: CLAUDE.md completion invokes the shared mirror runner after final edits', () => {
    // Given the canonical AI-context source and its generated template.
    const source = local(skill('ai-context-refresh'));

    // When the source contract and mutation guards are evaluated.
    assertSyncHandoff(source);
    rejects(assertSyncHandoff, source, 'one executable pipeline', 'two unrelated pipelines');
    rejects(assertSyncHandoff, source, '--skip=claude-md', '--skip=wrong-stage');
    rejects(assertSyncHandoff, source, 'TaskCreate: "Sync Codex mirrors from updated CLAUDE.md → invoke /sync-codex"', 'TaskCreate: "Report stale Codex mirrors → instruct user"');
    // The generated root holds project information only; the mirror handoff lives in the skill, not the template.
    const template = read('skills/ai-context-refresh/references/claude-md-template.md');
    assert.doesNotMatch(template, /sync-codex|Never auto-run/);
    // Then final CLAUDE.md authoring has one safe, non-recursive mirror handoff.
});

function assertReadiness(text) {
    assert.match(text, /a failed binary gate blocks PASS at every round regardless of score or owner risk acceptance/);
    assert.match(text, /round 2 blocks CRITICAL\/HIGH\/MEDIUM and defers LOW/);
    assert.match(text, /Overall PASS\/FAIL is separate from the advisory score/);
    assert.doesNotMatch(text, /unaccepted CRITICAL\/HIGH|must be resolved or owner-accepted before PASS|Proceed to commit|VERDICT is advisory/);
}

function assertUi(text) {
    assert.match(text, /any validated CRITICAL\/HIGH\/MEDIUM in round 2/);
    assert.match(text, /Record round-2 LOW findings as deferred/);
    assert.match(text, /Any failed binary gate or unresolved evidence/);
    assert.match(text, /WARN \| MEDIUM when bounded but consequential \| Blocks every round/);
    assert.doesNotMatch(text, /Medium \/ Low → WARN\/INFO|0 BLOCKED, 0 WARN — UI compliant/);
}

test('R3-PROMPT-027/031: advisory scores and category labels cannot bypass eligibility', () => {
    const readiness = local(skill('production-readiness-review'));
    const ui = local(read('skills/ui-design/references/mode-review.md'));
    assertReadiness(readiness);
    assertUi(ui);
    rejects(assertReadiness, readiness, 'a failed binary gate blocks PASS at every round regardless of score or owner risk acceptance', 'an unaccepted CRITICAL/HIGH fail blocks PASS');
    rejects(assertReadiness, readiness, 'round 2 blocks CRITICAL/HIGH/MEDIUM and defers LOW', 'round 2 blocks CRITICAL/HIGH only');
    rejects(assertUi, ui, 'WARN | MEDIUM when bounded but consequential | Blocks every round', 'WARN | Medium / Low → WARN/INFO | Review and decide');
    rejects(assertUi, ui, 'Any failed binary gate or unresolved evidence', 'Only category BLOCKED');
    for (const round of [1, 2]) {
        assert.equal(policy.evaluateRound({ round, findings: [{ id: 'bounded', severity: 'MEDIUM' }] }).canComplete, false);
        assert.equal(policy.evaluateRound({ round, hardGates: [{ id: 'binary', status: 'FAIL' }] }).canComplete, false);
    }
    // Round 3 exists only as the single extension a round-2 CRITICAL/HIGH earns.
    assert.equal(policy.evaluateRound({ round: 2, findings: [{ id: 'material', severity: 'HIGH' }] }).extensionGranted, false);
    assert.equal(policy.evaluateRound({ round: 2, findings: [{ id: 'bounded', severity: 'MEDIUM' }] }).status, 'CONTINUE');
    assert.equal(policy.evaluateRound({ round: 3, findings: [{ id: 'material', severity: 'HIGH' }] }).status, 'ESCALATE');
    // Past the hard cap a review blocker still escalates; only failing test gates continue.
    assert.equal(policy.evaluateRound({ round: 4, findings: [{ id: 'material', severity: 'HIGH' }] }).status, 'ESCALATE');
    assert.equal(policy.evaluateRound({ round: 4, hardGates: [{ id: 'suite', kind: 'test', status: 'FAIL' }] }).status, 'ESCALATE');
    assert.equal(policy.evaluateRound({ round: 1, findings: [{ id: 'polish', severity: 'LOW' }] }).canComplete, false);
    const deferred = policy.evaluateRound({ round: 2, findings: [{ id: 'polish', severity: 'LOW' }] });
    assert.equal(deferred.canComplete, true);
    assert.equal(deferred.deferredLow.length, 1);
    assert.equal(policy.evaluateRound({ round: 1, findings: [] }).canComplete, true);
    assert.equal(policy.evaluateRound({ round: 1, findings: [], minRounds: 2 }).canComplete, false);
    assert.equal(policy.evaluateRound({ round: 2, findings: [], minRounds: 2 }).canComplete, true);
});

function assertFullReport(text) {
    assert.match(text, /Main agent reads the full `tmp\/reports\/` file before synthesis, acceptance, deduplication, or repair planning/);
    assert.match(text, /including every severity and all findings beyond the envelope cap/);
    assert.doesNotMatch(text, /reads `tmp\/reports\/` file only when resolving specific blockers/);
}

test('R3-PROMPT-029: bounded nested return never limits report consumption', () => {
    const source = local(skill('start-workflow'));
    assertFullReport(source);
    rejects(assertFullReport, source, 'Main agent reads the full `tmp/reports/` file before synthesis, acceptance, deduplication, or repair planning', 'Main agent reads `tmp/reports/` file only when resolving specific blockers');
    rejects(assertFullReport, source, 'including every severity and all findings beyond the envelope cap', 'including only salient Critical/High findings');
});

function assertTeaching(text) {
    assert.match(text, /\*\*Delegated return:\*\* A sub-agent emits only the structured/);
    assert.match(text, /\*\*Inline user-facing output:\*\* Preserve the skill's requested explanation or teaching/);
    assert.match(text, /delegated transport limit does not replace that deliverable/);
}

// Sensor row N3 (P26 scratch run). A converted skill carries a shared protocol as a guide line (the
// shared P25 recognizer, never a copied line format) and the hook delivers the projection file; the
// text a model reads is then the skill plus that file. The projection joins only while the guide entry
// is present, so a skill that lost both the body and the guide still fails the same assertion.
const guideCarrier = createRequire(import.meta.url)('../../lib/protocol-guide-carrier.cjs');
function deliveredText(text, tag, skillsDir = path.join(root, '.claude', 'skills')) {
    if (text.includes(`<!-- SYNC:${tag} -->`) || !guideCarrier.hasGuideEntry(text, tag)) return text;
    const projection = path.join(skillsDir, 'shared', 'protocols', `${tag}.md`);
    return fs.existsSync(projection) ? `${text}\n${fs.readFileSync(projection, 'utf8')}` : text;
}

test('R3-PROMPT-030: inline teaching survives delegated transport constraints', () => {
    const own = skill('understand');
    const source = deliveredText(own, 'incremental-persistence');
    assertTeaching(source);
    rejects(assertTeaching, source, "**Inline user-facing output:** Preserve the skill's requested explanation or teaching", '**At return:** Emit only the structured envelope');
    const body = local(own);
    assert.match(body, /teach|explain/i);
});

test('TC-PDL-065 R3-PROMPT-030 reads a guide carrier through its projection only while the guide is present (N3)', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'n3-guide-'));
    try {
        // Given a projection holding the teaching rule and a skill carrying only the guide line
        const tag = 'incremental-persistence';
        const skillsDir = path.join(tmp, 'skills');
        const projection = path.join(skillsDir, 'shared', 'protocols', `${tag}.md`);
        fs.mkdirSync(path.dirname(projection), { recursive: true });
        fs.writeFileSync(projection, "> 3. **Delegated return:** A sub-agent emits only the structured envelope. **Inline user-facing output:** Preserve the skill's requested explanation or teaching; the delegated transport limit does not replace that deliverable.\n");
        const guided = ['# understand', guideCarrier.GUIDE_BLOCK_START, '',
            guideCarrier.formatGuideLine({ tag, summary: 'Persist results per file', when: 'processing many files', path: `.claude/skills/shared/protocols/${tag}.md` }),
            '', guideCarrier.GUIDE_BLOCK_END].join('\n');
        // When the delivered text is checked, Then the guide carrier passes
        assertTeaching(deliveredText(guided, tag, skillsDir));
        // When the guide entry is removed, Then the projection is not joined and the check fails
        assert.throws(() => assertTeaching(deliveredText('# understand\n', tag, skillsDir)), { code: 'ERR_ASSERTION' });
        // When the projection is missing, Then the check fails
        fs.rmSync(projection);
        assert.throws(() => assertTeaching(deliveredText(guided, tag, skillsDir)), { code: 'ERR_ASSERTION' });
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
});

function assertDefaultOnly(text) {
    assert.match(text, /\*\*Supported mode:\*\* use the default `workflow-greenfield-init` sequence resolved from `workflows.json`/);
    assert.doesNotMatch(text, /mode=lean|Lean variant|lean path is a documented gate-skip option/);
}

test('R3-PROMPT-032: greenfield advertises only its resolved manifest mode', () => {
    const source = local(skill('workflow-greenfield-init'));
    assertDefaultOnly(source);
    rejects(assertDefaultOnly, source, '**Supported mode:** use the default `workflow-greenfield-init` sequence resolved from `workflows.json`', '**Lean variant (`mode=lean`)** — a trimmed path is available');
    const registry = JSON.parse(read('workflows.json'));
    const manifest = resolveWorkflowManifest(registry, 'workflow-greenfield-init', { rootDir: root });
    assert.equal(manifest.mode, 'default');
    assert.ok(manifest.occurrences.length > 0);
    assert.throws(() => resolveWorkflowManifest(registry, 'workflow-greenfield-init', { rootDir: root, mode: 'lean' }), /Unknown workflow mode: lean/);
});

function assertOwnedClose(text) {
    const report = text.indexOf('4. **Verify workflow ownership baseline**');
    const recap = text.indexOf('6. **Explain the changes');
    const close = text.indexOf('7. **Close only the workflow-owned baseline run**');
    const announce = text.indexOf('8. Mark this task `completed` and announce');
    assert.ok(report >= 0 && recap > report && close > recap && announce > close, 'report → recap → owned close → completion');
    assert.match(text.slice(close, announce), /workflow-baseline\.cjs close` with JSON stdin containing the recorded `rootDir`, `runId`, and `storeDir`/);
    assert.match(text.slice(close, announce), /require `closed === true` and an empty `deletionFailures` array/);
    assert.match(text.slice(close, announce), /retain the closure task as incomplete and report each failure/);
    assert.match(text.slice(close, announce), /preserve the parent run and all sibling runs/);
    assert.match(text.slice(close, announce), /Never call `cleanup-expired` or delete a store directory/);
    assert.match(text.slice(close, announce), /N\/A — no recorded baseline run/);
}

test('R3-PROMPT-041: final report and recap precede exact owned-run close with visible failures', () => {
    const source = local(skill('workflow-end'));
    assertOwnedClose(source);
    for (const anchor of [
        '7. **Close only the workflow-owned baseline run**',
        'workflow-baseline.cjs close` with JSON stdin containing the recorded `rootDir`, `runId`, and `storeDir`',
        'require `closed === true` and an empty `deletionFailures` array',
        'retain the closure task as incomplete and report each failure',
        'preserve the parent run and all sibling runs',
        'Never call `cleanup-expired` or delete a store directory',
        'N/A — no recorded baseline run',
    ]) rejects(assertOwnedClose, source, anchor, 'missing closure instruction');
});

// Each loop's own convergence signal: a review loop converges on a clear bar, the workflow loop
// only on a round that applied zero fixes (a clean review whose simplifier still edits is not done).
const CONVERGENCE_ROW = {
    // why-review carries the outer review/fix loop as its optional `--fix-loop` mode.
    'why-review': '(6) the current round bar is clear',
    'changes-review': '(6) the current round bar is clear',
    // workflow-review-changes carries the outer zero-fix loop as its optional `--fix-loop` mode.
    'workflow-review-changes': '(6) the round applied ZERO fixes'
};
// The zero-fix predicate leaves "edits landed but no review blocker is open" (a simplifier-only
// round) needing its own row: the user-decided rule proves a zero-fix pass within budget and
// escalates at a spent budget, so the workflow loop has one extra row before the blocker row.
test('R3-PROMPT-042/043/044: shared review cap blocks MEDIUM+, missing proof and failed gates, with explicit extension', () => {
    const source = read('skills/shared/protocols/review-policy.md');
    assert.match(source, /three review rounds/);
    assert.match(source, /host question tool/);
    assert.match(source, /Wait for an explicit answer/);
    assert.match(source, /fresh review of the updated target/);
    for (const round of [1, 2, 3]) {
        for (const severity of ['HIGH', 'MEDIUM', 'CRITICAL', 'NOT VERIFIABLE']) {
            assert.equal(policy.evaluateRound({ round, findings: [{ id: 'open', severity }] }).status, round < 3 ? 'CONTINUE' : 'ESCALATE');
        }
        for (const kind of ['test', 'binary']) {
            assert.equal(policy.evaluateRound({ round, hardGates: [{ id: 'gate', kind, status: 'FAIL' }] }).status, round < 3 ? 'CONTINUE' : 'ESCALATE');
        }
    }
    assert.equal(policy.evaluateRound({ round: 3, findings: [{ id: 'polish', severity: 'LOW' }] }).status, 'PASS');
    assert.equal(policy.evaluateRound({ round: 4 }).status, 'ESCALATE');
});
