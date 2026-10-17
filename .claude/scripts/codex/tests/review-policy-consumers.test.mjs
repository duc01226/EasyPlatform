import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Reuse the repo's single owner of EOL normalization rather than hand-rolling a second one.
// `extract-sync-block.cjs` documents why this matters: the canonical markdown is committed LF
// but a Windows checkout (`core.autocrlf=true`) materializes CRLF, so any comparison that
// normalizes only ONE side reports a checkout-format artifact as canonical drift.
const { normalizeEol } = createRequire(import.meta.url)('../../lib/extract-sync-block.cjs');
const fsSync = createRequire(import.meta.url)('node:fs');
const { execFileSync, spawnSync } = createRequire(import.meta.url)('node:child_process');
const reviewReceipt = createRequire(import.meta.url)('../../../hooks/lib/review-receipt.cjs');

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..', '..');
const read = relative => fs.readFile(path.join(root, relative), 'utf8');
const canonicalPath = path.join(root, '.claude', 'skills', 'shared', 'sync-inline-versions.md');
// Consumers carry canonical multi-round review-policy inline, or an official guide backed by
// the exact published full body (BR-PDL-11). Both forms retain the consumer-specific anchors.
// Plan and integration reviews default to read-only and join the shared loop when opted in.
const consumers = [
    '.claude/skills/changes-review/SKILL.md',
    '.claude/skills/workflow-review-changes/SKILL.md'
];
const planModeReviewPath = '.claude/skills/plan/references/mode-review.md';
// These are the canonical carriers that embed the shared severity-rubric
// block. Keep this inventory explicit: adding a review-family consumer without
// adding it here would allow a locally-reworded severity scale to drift.
const severityConsumers = [
    '.claude/skills/architecture/references/mode-full.md',
    '.claude/skills/architecture/references/mode-review.md',
    '.claude/skills/changes-review/SKILL.md',
    '.claude/skills/code-quality-review/SKILL.md',
    '.claude/skills/code-simplifier/SKILL.md',
    '.claude/skills/domain-analysis/references/mode-review.md',
    '.claude/skills/architecture/references/mode-scalability.md',
    '.claude/skills/feature-implement/SKILL.md',
    '.claude/skills/plan/references/mode-execute.md',
    '.claude/skills/fix/SKILL.md',
    '.claude/skills/integration-test/references/mode-review.md',
    '.claude/skills/knowledge-review/SKILL.md',
    '.claude/skills/work-item/references/mode-review.md',
    '.claude/skills/performance-review/SKILL.md',
    '.claude/skills/plan/references/mode-review.md',
    '.claude/skills/production-readiness-review/SKILL.md',
    '.claude/skills/security-audit/SKILL.md',
    '.claude/skills/spec/references/mode-clarify.md',
    '.claude/skills/ui-design/references/mode-review.md',
    '.claude/skills/why-review/SKILL.md',
    '.claude/skills/workflow-bugfix/SKILL.md',
    '.claude/skills/workflow-feature/SKILL.md',
    '.claude/skills/workflow-integration-test/SKILL.md',
    '.claude/skills/workflow-review-changes/SKILL.md'
];
// A severity consumer may carry the rubric as a guide entry (shared P25 recognizer, never a copied
// line format) instead of the body; the full text then lives in `shared/protocols/severity-rubric.md`,
// which must equal the canonical body exactly as an inline body must. Every consumer is a skill.
const guideCarrier = createRequire(import.meta.url)('../../lib/protocol-guide-carrier.cjs');
const severityProjectionPath = path.join(root, '.claude', 'skills', 'shared', 'protocols', 'severity-rubric.md');
function carriesSeverityRubric(text, projectionText, expected) {
    return carriesCanonicalProtocol(text, 'severity-rubric', projectionText, expected);
}
// The same rule for any tag (sensor row N2, P26 scratch run): an inline body must equal canonical;
// a guide entry counts only while its projection file equals canonical. Neither form fails.
function carriesCanonicalProtocol(text, tag, projectionText, expected) {
    const inline = body(text, tag);
    if (inline !== null) return inline === expected;
    return projectionText != null && guideCarrier.hasGuideEntry(text, tag) &&
        normalizeEol(projectionText).trim() === expected;
}
const projectionTextOf = (tag) => {
    const file = path.join(root, '.claude', 'skills', 'shared', 'protocols', `${tag}.md`);
    return fsSync.existsSync(file) ? fsSync.readFileSync(file, 'utf8') : null;
};

function body(text, tag) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = normalizeEol(text).match(new RegExp(`<!--\\s*SYNC:${escaped}\\s*-->\\s*([\\s\\S]*?)\\s*<!--\\s*/SYNC:${escaped}\\s*-->`));
    return match ? match[1].trim() : null;
}

// Normalize on BOTH sides. `body()` normalized the consumer but this side did not, so an LF string
// was compared against a CRLF one and every multi-line block failed — a checkout-format artifact
// reported as canonical drift, which is the false alarm that trains a maintainer to distrust the
// guard. The contract is byte-exact BODY TEXT; the line ending is a property of the working copy,
// not of the protocol. This matcher stops at `\n---\n` OR `\n## SYNC:` — the same block-end rule
// extract-sync-block and the Python readers now share (sync-reader-parity.test.cjs guards it).
function canonicalBody(text, tag) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = normalizeEol(text)
        .match(new RegExp(`^## SYNC:${escaped}\\s*\\n([\\s\\S]*?)(?=\\n---\\s*\\n|\\n## SYNC:)`, 'm'));
    return match ? match[1].trim() : null;
}

function stripSyncBlocks(text) {
    return text.replace(/<!-- SYNC:([^>]+) -->[\s\S]*?<!-- \/SYNC:\1 -->/g, '');
}

// A skill's contract is its SKILL.md plus every sibling `references/*.md` (sorted), read as one text:
// a mode section moved to a point-of-use reference is still the skill's contract, so a pinned phrase
// must hold wherever it lives. Takes the SKILL.md path (absolute, or relative to the repo root).
function readSkillContract(skillFile) {
    const file = path.isAbsolute(skillFile) ? skillFile : path.join(root, skillFile);
    const refs = path.join(path.dirname(file), 'references');
    const texts = [fsSync.readFileSync(file, 'utf8')];
    if (fsSync.existsSync(refs)) {
        for (const name of fsSync.readdirSync(refs).filter(entry => entry.endsWith('.md')).sort()) {
            texts.push(fsSync.readFileSync(path.join(refs, name), 'utf8'));
        }
    }
    return texts.join('\n');
}

function gitAvailable() {
    try {
        return spawnSync('git', ['--version'], { encoding: 'utf8', windowsHide: true }).status === 0;
    } catch (_) {
        return false;
    }
}

function listSkillMarkdownFiles(directory) {
    let entries;
    try {
        entries = fsSync.readdirSync(directory, { withFileTypes: true });
    } catch (error) {
        // Concurrent golden-layout tests create and remove a scratch skill directory. The exact
        // issuer inventory assertion below keeps a vanished real skill from becoming a vacuous pass.
        if (error.code === 'ENOENT') return [];
        throw error;
    }
    return entries.flatMap(entry => {
        if (entry.name === '__golden__') return [];
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return listSkillMarkdownFiles(fullPath);
        return entry.isFile() && entry.name === 'SKILL.md' ? [fullPath] : [];
    });
}

function withReceiptFixture(fn) {
    const workspaceTemp = path.join(root, 'tmp');
    fsSync.mkdirSync(workspaceTemp, { recursive: true });
    const fixtureRoot = fsSync.mkdtempSync(path.join(workspaceTemp, 'review-policy-receipts-'));
    const repository = path.join(fixtureRoot, 'repo');
    const storeDir = path.join(fixtureRoot, 'store');
    fsSync.mkdirSync(repository);
    fsSync.mkdirSync(storeDir);
    try {
        const git = args => execFileSync('git', args, { cwd: repository, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
        git(['init', '-q']);
        git(['config', 'user.email', 'harness-test@example.invalid']);
        git(['config', 'user.name', 'Harness Test']);
        fsSync.writeFileSync(path.join(repository, '.gitignore'), '/tmp/\n/temp/\n');
        fsSync.writeFileSync(path.join(repository, 'file.txt'), 'base\n');
        git(['add', '.gitignore', 'file.txt']);
        git(['commit', '-q', '-m', 'fixture base']);
        return fn({ repository, storeDir, git });
    } finally {
        fsSync.rmSync(fixtureRoot, { recursive: true, force: true });
    }
}

test('TC-HARNESS-006: all canonical review consumers use exact inline or guide-backed policy and required anchors', async () => {
    const canonical = await fs.readFile(canonicalPath, 'utf8');
    const expected = canonicalBody(canonical, 'review-policy');
    assert.ok(expected && expected.includes('blockingFindings(round, findings, hardGates)'));
    const tag = 'review-policy';
    const projection = projectionTextOf(tag);
    // Reuse the existing canonical-carrier seam: discovery never replaces exact full-text parity.
    const guided = [guideCarrier.GUIDE_BLOCK_START, '',
        guideCarrier.formatGuideLine({ tag, summary: 'Review policy', when: 'deciding review round eligibility', path: '.claude/skills/shared/protocols/review-policy.md' }),
        '', guideCarrier.GUIDE_BLOCK_END].join('\n');
    const inline = `<!-- SYNC:${tag} -->\n\n${expected}\n\n<!-- /SYNC:${tag} -->`;
    assert.equal(carriesCanonicalProtocol(guided, tag, `${expected}\r\n`, expected), true);
    assert.equal(carriesCanonicalProtocol(inline, tag, null, expected), true);
    assert.equal(carriesCanonicalProtocol('# Skill\n', tag, `${expected}\n`, expected), false);
    assert.equal(carriesCanonicalProtocol(guided, tag, null, expected), false);
    assert.equal(carriesCanonicalProtocol(guided, tag, '> Drifted policy.\n', expected), false);
    // A correct guide cannot mask an edited inline body on the same consumer.
    assert.equal(carriesCanonicalProtocol(`${guided}\n<!-- SYNC:${tag} -->\n\n> Edited policy.\n\n<!-- /SYNC:${tag} -->`, tag, `${expected}\n`, expected), false);
    for (const relative of consumers) {
        const text = await fs.readFile(path.join(root, relative), 'utf8');
        assert.ok(carriesCanonicalProtocol(text, tag, projection, expected),
            `${relative} must carry exact canonical review-policy inline, or an official guide whose published full body equals canonical`);
        // Policy anchors belong to the full body, delivered inline or through its verified guide.
        const effectivePolicy = body(text, tag) ?? normalizeEol(projection).trim();
        assert.match(effectivePolicy, /review-policy\.cjs/);
        assert.match(effectivePolicy, /target fingerprint/);
        assert.match(effectivePolicy, /deferred LOW/i);
    }
});

test('TC-HARNESS-006: plan review supports read-only and the shared fix-loop', async () => {
    const text = await fs.readFile(path.join(root, planModeReviewPath), 'utf8');
    assert.match(text, /standalone defaults to review-only/i);
    assert.match(text, /fix-loop/i);
    assert.match(text, /fresh.*review/i);
    assert.match(text, /three-round/);
    assert.match(text, /caller-owned leaves.*read-only/i);
    assert.doesNotMatch(text, /maxRounds = 1|ONE ROUND MAXIMUM/);
});

test('TC-HARNESS-006: shared severity rubric normalizes domain vocabularies', async () => {
    const canonical = await fs.readFile(canonicalPath, 'utf8');
    const expected = canonicalBody(canonical, 'severity-rubric');
    assert.ok(expected, 'canonical severity rubric must exist');
    assert.match(expected, /Domain-vocabulary normalization/i);
    assert.match(expected, /Finding vs observation/i);
    assert.match(expected, /Consequence decision tree/i);
    assert.match(expected, /Boundary examples/i);
    assert.match(expected, /Scorecards.*\/20/i);
    assert.match(expected, /BLOCKED.*HARD FAIL.*FAIL/i);
    assert.match(expected, /P0.*P1.*P2.*P3.*P4/i);
    assert.match(expected, /INFO.*advisory/i);
    const projection = await fs.readFile(severityProjectionPath, 'utf8').catch(() => null);
    for (const relative of severityConsumers) {
        const text = await fs.readFile(path.join(root, relative), 'utf8');
        assert.ok(carriesSeverityRubric(text, projection, expected),
            `${relative} must carry the canonical severity rubric inline, or a severity-rubric guide entry whose projection file equals canonical`);
    }
});

test('TC-PDL-065: a severity consumer passes with a guide entry backed by a canonical projection and fails when both forms are missing', () => {
    const expected = '> Fixture rubric.';
    // Given a consumer that holds a guide entry instead of the rubric body, and a projection equal to canonical
    const guided = [guideCarrier.GUIDE_BLOCK_START, '',
        guideCarrier.formatGuideLine({ tag: 'severity-rubric', summary: 'Rubric', when: 'classifying a finding', path: '.claude/skills/shared/protocols/severity-rubric.md' }),
        '', guideCarrier.GUIDE_BLOCK_END].join('\n');
    // When it is checked, Then it passes
    assert.equal(carriesSeverityRubric(guided, `${expected}\r\n`, expected), true);
    // When the guide is removed too (both forms missing), Then it fails
    assert.equal(carriesSeverityRubric('# Skill\n', `${expected}\n`, expected), false);
    // When the projection is missing or drifted, Then it fails
    assert.equal(carriesSeverityRubric(guided, null, expected), false);
    assert.equal(carriesSeverityRubric(guided, '> Drifted rubric.\n', expected), false);
    // And an inline body is still held to exact parity
    assert.equal(carriesSeverityRubric(`<!-- SYNC:severity-rubric -->\n\n${expected}\n\n<!-- /SYNC:severity-rubric -->`, null, expected), true);
    assert.equal(carriesSeverityRubric('<!-- SYNC:severity-rubric -->\n\n> Edited.\n\n<!-- /SYNC:severity-rubric -->', `${expected}\n`, expected), false);
});

test('TC-HARNESS-006: workflow owns fixes and fresh review after all reports', () => {
    const workflow = readSkillContract('.claude/skills/workflow-review-changes/SKILL.md');
    assert.match(workflow, /Wait for every report before fixing/);
    assert.match(workflow, /--loop-owner=caller/);
    assert.match(workflow, /Re-run general, whole-target rationale and every applicable specialist lens/);
});

test('TC-HARNESS-006: concise changes review preserves validation before fix and fresh review', () => {
    const changes = readSkillContract('.claude/skills/changes-review/SKILL.md');
    assert.match(changes, /validate-findings/);
    assert.match(changes, /fresh.*review/i);
    assert.match(changes, /LOW/);
});

test('TC-HARNESS-006: fix preserves explicit LOW requests while honoring the loop floor', async () => {
    const fix = await fs.readFile(path.join(root, '.claude', 'skills', 'fix', 'SKILL.md'), 'utf8');
    assert.match(fix, /Review-loop severity floor/);
    assert.match(fix, /CRITICAL.*immediate material.*failed binary gate/i);
    assert.match(fix, /HIGH.*material supported-path correctness/i);
    assert.match(fix, /MEDIUM.*bounded but consequential/i);
    assert.match(fix, /LOW.*non-blocking polish/i);
    assert.match(fix, /Round 1 is strict \(CRITICAL\/HIGH\/MEDIUM\/LOW\)/);
    assert.match(fix, /from round 2 onward only CRITICAL\/HIGH\/MEDIUM reopen a fix or re-review round/);
    assert.match(fix, /standalone user request to fix a LOW-severity issue remains valid/);
});

test('TC-HARNESS-006: simplifier loop uses the shared round floor', async () => {
    const simplifier = await fs.readFile(path.join(root, '.claude', 'skills', 'code-simplifier', 'SKILL.md'), 'utf8');
    assert.match(simplifier, /Self-Recursive Check.*current round's exit bar/s);
    assert.match(simplifier, /Round 1 requires zero validated findings at any severity/s);
    assert.match(simplifier, /from Round 2 onward only validated CRITICAL\/HIGH\/MEDIUM findings reopen the loop/is);
    assert.match(simplifier, /LOW findings are recorded as deferred and do not justify another cycle/s);
    assert.doesNotMatch(simplifier, /Self-Recursive Check.*until no simplification findings remain/);
});

test('TC-HARNESS-006: plan --mode=execute does not collapse review acceptance to critical-only', async () => {
    const executeMode = await fs.readFile(path.join(root, '.claude', 'skills', 'plan', 'references', 'mode-execute.md'), 'utf8');
    assert.match(executeMode, /current severity bar/);
    assert.match(executeMode, /Round 1[^\n]*zero (?:open )?validated findings/);
    assert.match(executeMode, /Round 2[^\n]*zero validated CRITICAL\/HIGH\/MEDIUM/);
    assert.match(executeMode, /LOW findings (?:recorded|deferred)/i);
    assert.doesNotMatch(executeMode, /Repeat until no critical issues/);
    assert.doesNotMatch(executeMode, /Critical issues must be 0 \(Step 4 gate\)/);
    assert.doesNotMatch(executeMode, /tests 100% · 0 critical · explicit approval/);
});

test('TC-HARNESS-006: integration review supports both modes without weakening its eight gates', async () => {
    const review = await fs.readFile(path.join(root, '.claude/skills/integration-test/references/mode-review.md'), 'utf8');
    assert.match(review, /standalone defaults to review-only/i);
    assert.match(review, /fix-loop.*eight gates/i);
    assert.match(review, /caller-owned leaves.*read-only/i);
    assert.match(review, /three-round/);
    assert.doesNotMatch(review, /ONE ROUND MAXIMUM|maxRounds = 1/);
    for (const gate of ['Assertion value','Owned outcome','Repeatability and isolation','Behavior ownership','Spec/case traceability','Spec ↔ tests ↔ code consistency','Change coverage','Real-world fidelity']) assert.ok(review.includes(gate));
});

test('TC-HARNESS-006: the write variant of the integration-test workflow invokes one review pass without an internal review loop', async () => {
    const workflows = JSON.parse(await fs.readFile(path.join(root, '.claude', 'workflows.json'), 'utf8'));
    const workflow = workflows.workflows['workflow-integration-test'];
    const context = workflow.preActions.injectContext;
    const reviewGate = workflow.variants.write.outcomeGates.find(gate => gate.satisfiedBy.includes('integration-test --mode=review'));
    assert.equal(reviewGate.id, 'review-converged');
    assert.match(context, /performs one evidence-backed review pass over all eight gates/);
    assert.match(context, /later review.*new explicit invocation/i);
    assert.doesNotMatch(context, /round 2\+|review converges/i);
});

test('TC-HARNESS-006: implementation surfaces use normalized severity terms', async () => {
    const feature = await fs.readFile(path.join(root, '.claude', 'skills', 'feature-implement', 'SKILL.md'), 'utf8');
    for (const [relative, text] of [
        ['.claude/skills/feature-implement/SKILL.md', feature]
    ]) {
        assert.match(text, /SYNC:severity-rubric/);
        assert.match(text, /CRITICAL.*HIGH.*MEDIUM.*LOW/s, `${relative} must expose the canonical four-tier vocabulary`);
        assert.match(text, /failed binary gate|binary gates.*blocking/i, `${relative} must preserve hard-gate precedence`);
    }
    assert.match(feature, /Round 2 fixes only validated CRITICAL\/HIGH\/MEDIUM findings/);
    assert.match(feature, /LOW-only findings are recorded as deferred and do not reopen the loop/);
});

test('TC-HARNESS-006: seeded stale-policy mutant is rejected by exact-body parity', async () => {
    const canonical = await fs.readFile(canonicalPath, 'utf8');
    const expected = canonicalBody(canonical, 'review-policy');
    const mutant = '<!-- SYNC:review-policy -->\n> maxRounds=2; LOW findings are discarded\n<!-- /SYNC:review-policy -->';
    assert.notEqual(body(mutant, 'review-policy'), expected);
    assert.match(expected, /Default maximum is three review rounds/);
    assert.match(expected, /checkpoint the report under `tmp\/reports\/`/);
});

test('retired double-round review body and reminder cannot be loaded', async () => {
    const canonical = await fs.readFile(canonicalPath, 'utf8');
    assert.doesNotMatch(canonical, /^## SYNC:double-round-trip-review(?::reminder)?$/m);
    await assert.rejects(fs.access(path.join(root, '.claude', 'skills', 'shared', 'protocols', 'double-round-trip-review.md')));
});

test('R3-PROMPT-023/030: every existing carrier has exact updated body and balanced fences', async () => {
    const canonical = await fs.readFile(canonicalPath, 'utf8');
    const tags = ['incremental-persistence'];
    const skillsRoot = path.join(root, '.claude', 'skills');
    const agentsRoot = path.join(root, '.claude', 'agents');
    const candidates = (await fs.readdir(skillsRoot, { withFileTypes: true }))
        .filter(entry => entry.isDirectory()).map(entry => path.join(skillsRoot, entry.name, 'SKILL.md'));
    candidates.push(...(await fs.readdir(agentsRoot)).filter(name => name.endsWith('.md')).map(name => path.join(agentsRoot, name)));
    const seen = new Map(tags.map(tag => [tag, 0]));
    for (const file of candidates) {
        let source;
        try { source = await fs.readFile(file, 'utf8'); } catch (error) {
            if (error.code === 'ENOENT') continue; // shared/support directories are not skills
            throw error;
        }
        for (const tag of tags) {
            const open = `<!-- SYNC:${tag} -->`;
            const close = `<!-- /SYNC:${tag} -->`;
            if (!source.includes(open) && !source.includes(close)) continue;
            assert.equal(source.split(open).length - 1, 1, `${file}: exactly one ${tag} open`);
            assert.equal(source.split(close).length - 1, 1, `${file}: exactly one ${tag} close`);
            assert.ok(source.indexOf(open) < source.indexOf(close), `${file}: ${tag} fence order`);
            assert.equal(body(source, tag), canonicalBody(canonical, tag), `${file}: exact ${tag} body`);
            seen.set(tag, seen.get(tag) + 1);
        }
    }
    for (const [tag, count] of seen) assert.ok(count > 0, `non-vacuous carrier inventory for ${tag}`);
});

test('R3-PROMPT-031: visual review consumers persist one artifact result before opening the next', async () => {
    const canonical = await fs.readFile(canonicalPath, 'utf8');
    const expected = canonicalBody(canonical, 'incremental-persistence');
    assert.match(expected, /MANDATORY for every visual-artifact review/);
    assert.match(expected, /open exactly ONE artifact, inspect it, and append its record BEFORE opening the next artifact/);
    assert.match(expected, /an explicit `none` when no issue exists/);
    assert.match(expected, /derive processed and remaining artifacts from the ordered inventory/);
    assert.match(expected, /a missing record is incomplete review, never a clean result/);

    const visualConsumers = [
        '.claude/skills/experience-review/SKILL.md',
        '.claude/skills/e2e-test/references/mode-verify.md',
        '.claude/skills/workflow-e2e/SKILL.md',
    ];
    const projection = projectionTextOf('incremental-persistence');
    for (const relative of visualConsumers) {
        const text = await fs.readFile(path.join(root, relative), 'utf8');
        assert.ok(carriesCanonicalProtocol(text, 'incremental-persistence', projection, expected),
            `${relative} must carry the canonical per-artifact persistence contract (inline, or a guide entry whose projection equals canonical)`);
    }
});

test('TC-PDL-065 visual-consumer check (R3-PROMPT-031) accepts a guide entry backed by a canonical projection (N2)', () => {
    // Given a canonical body, a guide carrier (guide line, no body) and a projection equal to canonical
    const tag = 'incremental-persistence';
    const expected = '> **Incremental Persistence** — fixture body.';
    const guided = [guideCarrier.GUIDE_BLOCK_START, '',
        guideCarrier.formatGuideLine({ tag, summary: 'Persist results per file', when: 'processing many files', path: `.claude/skills/shared/protocols/${tag}.md` }),
        '', guideCarrier.GUIDE_BLOCK_END].join('\n');
    // When the carrier check runs, Then the guide carrier and an equal inline body pass
    assert.equal(carriesCanonicalProtocol(guided, tag, `${expected}\r\n`, expected), true);
    assert.equal(carriesCanonicalProtocol(`<!-- SYNC:${tag} -->\n\n${expected}\n\n<!-- /SYNC:${tag} -->`, tag, null, expected), true);
    // When both forms are missing, Then it fails
    assert.equal(carriesCanonicalProtocol('# Skill\n', tag, expected, expected), false);
    // When the projection is missing or drifted, Then the guide alone fails
    assert.equal(carriesCanonicalProtocol(guided, tag, null, expected), false);
    assert.equal(carriesCanonicalProtocol(guided, tag, '> Drifted.', expected), false);
    // When a drifted inline body sits beside a guide, Then the body still decides and fails
    assert.equal(carriesCanonicalProtocol(`${guided}\n<!-- SYNC:${tag} -->\n\n> Old.\n\n<!-- /SYNC:${tag} -->`, tag, expected, expected), false);
});

test('retired fresh-context overrides do not return in specialist review modes', async () => {
    for (const file of [['architecture', 'references', 'mode-review.md'], ['ui-design', 'references', 'mode-review.md']]) {
        const source = await fs.readFile(path.join(root, '.claude', 'skills', ...file), 'utf8');
        assert.doesNotMatch(source, /(?:SYNC|OVERRIDE):fresh-context-review/);
        assert.match(source, /OVERRIDE:review-protocol-injection/);
    }
});

test('R3-PROMPT-023: local clean-pass summaries cannot override an explicit minimum', async () => {
    const files = [
        ...['code-quality-review', 'knowledge-review', 'production-readiness-review', 'security-audit', 'seed-test-data']
            .map(name => `.claude/skills/${name}/SKILL.md`),
        '.claude/skills/domain-analysis/references/mode-review.md',
        // Leaf reviewer agents (code-reviewer) are not listed: they no longer carry the round loop,
        // so they state no clean-pass termination of their own; the orchestrating skills above own it.
    ];
    const assertMinimum = line => assert.match(line, /persisted `minRounds` is met/, 'clean-pass termination retains explicit minimum');
    for (const relative of files) {
        const source = (await fs.readFile(path.join(root, relative), 'utf8'))
            .replace(/<!-- SYNC:([^\s>]+) -->[\s\S]*?<!-- \/SYNC:\1 -->/g, '');
        const lines = source.split(/\r?\n/).filter(line => /clean.{0,60}(?:ENDS|ends)/.test(line));
        assert.ok(lines.length > 0, `${relative}: non-vacuous local termination carriers`);
        for (const line of lines) {
            assertMinimum(line);
            const mutant = line.replace('persisted `minRounds` is met', 'current round is clean');
            assert.throws(() => assertMinimum(mutant), { code: 'ERR_ASSERTION' });
        }
    }
});

const receiptIssuers = [
    {
        kind: 'commit-review',
        file: '.claude/skills/commit-review/SKILL.md'
    },
    {
        kind: 'changes-review',
        file: '.claude/skills/changes-review/SKILL.md',
        captureAnchor: 'Before reviewing, also capture the exact full candidate',
        reviewAnchor: 'Run the report-only review pass INLINE'
    },
    {
        kind: 'why-review',
        file: '.claude/skills/why-review/SKILL.md',
        captureAnchor: 'Before each full-mode pass, capture its qualifying candidate',
        reviewAnchor: 'Run the full-mode review pass INLINE'
    },
    {
        kind: 'workflow-review-changes',
        file: '.claude/skills/workflow-review-changes/SKILL.md',
        captureAnchor: 'Also capture the exact full candidate before review',
        reviewAnchor: 'Run the workflow INLINE'
    }
];

test('TC-FIT-012: every review receipt issuer binds the pre-review full candidate and excludes subsets', async () => {
    assert.deepEqual(receiptIssuers.map(issuer => issuer.kind).sort(), [...reviewReceipt.REVIEW_KINDS].sort(),
        'every accepted receipt kind has a declared full-candidate review owner');
    const discoveredIssuers = new Set();
    for (const file of listSkillMarkdownFiles(path.join(root, '.claude', 'skills'))) {
        let contract;
        try { contract = readSkillContract(file); } catch (error) {
            // Same race as listSkillMarkdownFiles: a scratch skill directory can vanish mid-scan.
            if (error.code === 'ENOENT') continue;
            throw error;
        }
        const source = stripSyncBlocks(contract);
        for (const match of source.matchAll(/review-receipt\.cjs issue --kind=([a-z-]+)\b/g)) {
            if (match[1] === 'skip') continue;
            discoveredIssuers.add(`${path.relative(root, file).split(path.sep).join('/')}#${match[1]}`);
        }
    }
    assert.deepEqual([...discoveredIssuers].sort(),
        receiptIssuers.map(issuer => `${issuer.file}#${issuer.kind}`).sort(),
        'every in-scope receipt issuer is in the reviewed consumer inventory');
    for (const issuer of receiptIssuers) {
        const source = stripSyncBlocks(readSkillContract(issuer.file));
        const ref = fsSync.readFileSync(path.join(root, path.dirname(issuer.file), 'references/fix-loop.md'), 'utf8');
        const captureAt = ref.indexOf('snapshot --target=<worktree|staged|commit-descriptor>');
        const issueAt = ref.indexOf('review-receipt.cjs issue');
        assert.ok(captureAt >= 0 && issueAt > captureAt, 'capture precedes final receipt issuance');
        assert.match(ref, /original pre-review snapshot/);
        assert.match(ref, /Never reconstruct or capture a new snapshot at issuance/);
        assert.match(ref, /Subset, artifact-only and historical/);
        const issueLines = source.match(new RegExp(`review-receipt\\.cjs issue --kind=${issuer.kind}[^\\r\\n]*`, 'g')) || [];
        assert.equal(issueLines.length, 1, `${issuer.file}: exactly one terminal issuer command`);
        assert.match(issueLines[0], /--scope=full-changeset --snapshot-json=/);
        assert.match(issueLines[0], /exact saved JSON/);
        assert.doesNotMatch(source, new RegExp(`review-receipt\\.cjs issue --kind=${issuer.kind}(?![^\\r\\n]*--snapshot-json=)`),
            `${issuer.file}: no bare or terminally recaptured receipt is allowed`);
    }
});

test('TC-FIT-012: review and commit prompts preserve the configured semantic profile', async () => {
    for (const relative of receiptIssuers.map(issuer => issuer.file)) {
        const source = stripSyncBlocks(readSkillContract(relative));
        assert.match(source, /configured canonical (?:owner|spec)/i, `${relative}: resolve the native canonical owner`);
        assert.match(source, /profile-declared (?:canonical )?scenario\/case/i, `${relative}: retain native scenario identity`);
        assert.match(source, /(?:assertion\/result|executing test)/i, `${relative}: require executable test evidence`);

        const specRepresentationLines = source.split(/\r?\n/).filter(line =>
            /\bTCs?\b/i.test(line) || /§(?:3|4|5|8)\s+(?:BR|AC|TC|invariant)|§(?:3|4|5|8)(?:\/§?(?:3|4|5|8))+/i.test(line));
        for (const line of specRepresentationLines) {
            assert.match(line, /strict[- ]default|default profile/i,
                `${relative}: default §/TC representation must remain conditional: ${line}`);
        }
    }

    const commit = stripSyncBlocks(await fs.readFile(path.join(root, '.claude/skills/commit/SKILL.md'), 'utf8'));
    assert.match(commit, /exact commit descriptor/);
    assert.match(commit, /matching review receipt or policy-eligible skip/);
    assert.match(commit, /refresh evidence after changes/);
    const prPolicy = await fs.readFile(path.join(root, '.claude/skills/pull-request/references/check-policy.md'), 'utf8');
    assert.match(prPolicy, /check --target=commit-descriptor --descriptor-json=/);
    assert.match(prPolicy, /snapshot --target=commit-descriptor --descriptor-json=/);
    assert.match(prPolicy, /issue --kind=skip --scope=full-changeset --snapshot-json=/);
    assert.match(prPolicy, /`ERROR` is a blocker, never `CLEAN`/);
    assert.match(prPolicy, /Neither review evidence nor a skip waives CI, spec\/test reconciliation/);
    assert.doesNotMatch(commit + prPolicy, /review-receipt\.cjs skip --reason=/);

});

test('TC-FIT-012: receipt issuance rejects a changed candidate and identical staging preserves identity', { skip: !gitAvailable() }, () => {
    withReceiptFixture(({ repository, storeDir, git }) => {
        const file = path.join(repository, 'file.txt');
        fsSync.writeFileSync(file, 'reviewed candidate\n');
        const reviewed = reviewReceipt.captureReviewTarget({ repository, cwd: repository, target: 'worktree' });
        assert.equal(reviewed.status, 'CHANGED');

        fsSync.writeFileSync(file, 'changed after review\n');
        assert.throws(() => reviewReceipt.issueReceipt({
            repository, storeDir, snapshot: reviewed, scope: 'full-changeset', kind: 'changes-review'
        }), /reviewed target changed/);
        assert.equal(fsSync.readdirSync(storeDir).length, 0, 'stale review cannot mint a receipt');

        fsSync.writeFileSync(file, 'same content before staging\n');
        const finalReviewed = reviewReceipt.captureReviewTarget({ repository, cwd: repository, target: 'worktree' });
        assert.equal(finalReviewed.status, 'CHANGED');
        reviewReceipt.issueReceipt({ repository, storeDir, snapshot: finalReviewed, scope: 'full-changeset', kind: 'changes-review' });
        git(['add', 'file.txt']);

        const staged = reviewReceipt.captureReviewTarget({ repository, cwd: repository, target: 'staged' });
        assert.equal(staged.status, 'CHANGED');
        assert.equal(staged.candidateTree, finalReviewed.candidateTree, 'staging identical content preserves tree identity');
        assert.equal(staged.fingerprint, finalReviewed.fingerprint, 'target mode does not change candidate fingerprint');
        assert.equal(reviewReceipt.matchReviewReceipt({ repository, storeDir, snapshot: staged }), 'changes-review',
            'a commit candidate with the identical tree can use the reviewed worktree candidate');
    });
});


test('review mode authority stays consistent at repair branches and closing reminders', async () => {
    const policy = await read('.claude/skills/shared/protocols/review-policy.md');
    assert.match(policy, /normalize absent `--fix-loop`/);
    assert.match(policy, /Local fix\/restart sections execute only in standalone fix-loop/);
    for (const skill of ['plan', 'integration-test']) {
        const mode = await read(`.claude/skills/${skill}/references/mode-review.md`);
        assert.match(mode, /review-only and caller-owned leaves never edit; standalone fix-loop repairs/);
        assert.doesNotMatch(mode, /never edit .*inside this mode/);
    }
    const experience = await read('.claude/skills/experience-review/SKILL.md');
    assert.match(experience, /Skip repairs in review-only, report-only, caller-owned passes or `--rounds=0`/);
    assert.match(experience, /numeric budget never grants repair authority/);
    const rationale = await read('.claude/skills/why-review/SKILL.md');
    assert.doesNotMatch(rationale, /2 re-dos|3 full cycles/);
    assert.match(rationale, /Reconcile report defects in the current pass/);
});

test('standalone fix-loop remains reachable in plan, audit and knowledge modes', async () => {
    const ai = await read('.claude/skills/ai-engineering-review/SKILL.md');
    assert.match(ai, /standalone.*fix-loop.*repairs.*artifact/is);
    assert.doesNotMatch(ai, /read-only always|never under[^\n]*--mode=plan|not in plan mode/i);
    const security = await read('.claude/skills/security-audit/SKILL.md');
    assert.match(security, /standalone fix-loop authorizes scoped repairs/i);
    assert.doesNotMatch(security, /wait for explicit approval before fixes/i);
    const full = await read('.claude/skills/architecture/references/mode-full.md');
    assert.match(full, /standalone.*fix-loop.*repairs.*repeat/is);
    assert.match(full, /No fixed agent count is required/);
    assert.doesNotMatch(full, /Applies NO fixes|fixes are NEVER applied here|NEVER re-implement[^\n]*inline|spawn ALL THREE/i);
    const scale = await read('.claude/skills/architecture/references/mode-scalability.md');
    assert.match(scale, /Standalone `--fix-loop` repairs authorized findings/);
    assert.doesNotMatch(scale, /does not self-converge a fix-loop|No fix-loop:|do not restart this review over its own fixes/);
    const knowledge = await read('.claude/skills/knowledge-review/SKILL.md');
    assert.match(knowledge, /standalone fix-loop repairs validated findings between passes/i);
    assert.doesNotMatch(knowledge, /NEVER modify the audited artifact|output is a verdict, NEVER an edit|READ-ONLY — do not modify the artifact/);
});

test('every applied LOW repair requires fresh review across local consumers', async () => {
    const files = [
        '.claude/skills/architecture/references/mode-review.md',
        '.claude/skills/ui-design/references/mode-review.md',
        '.claude/skills/code-simplifier/SKILL.md',
        '.claude/skills/plan/references/mode-execute.md',
        '.claude/docs/claude-ai-agent-framework-guide.md',
        '.claude/docs/claude-ai-agent-framework-guide.html'
    ];
    for (const file of files) {
        const source = await read(file);
        assert.doesNotMatch(source, /except a round-1 LOW-only fix set|none for a round-1 LOW-only fix set|LOW closes by[^\n]*scoped check|LOW closed by scoped check/);
        assert.match(source, /(?:every applied fix|every applied.*repair)[^\n]*(?:fresh|review)/i, file);
    }
});


test('local closing rules preserve bounded review and complete adaptive dispatch', async () => {
    const plan = await read('.claude/skills/plan/references/mode-review.md');
    assert.doesNotMatch(plan, /Stop at 1\/1|Report the correction; the author owns revision/);
    assert.match(plan, /standalone fix-loop repairs validated findings before fresh review/);
    const workItem = await read('.claude/skills/work-item/references/mode-review.md');
    assert.doesNotMatch(workItem, /omit code-specific protocols|10\+ artifacts|using a fresh `general-purpose` artifact reviewer/);
    assert.match(workItem, /all 11 complete protocol bodies VERBATIM/);
    assert.match(workItem, /no artifact-count threshold or forced delegation/);
    for (const file of [
        '.claude/skills/workflow-spec-sync/SKILL.md',
        '.claude/skills/workflow-integration-test/references/variant-write.md'
    ]) {
        const source = await read(file);
        assert.doesNotMatch(source, /Failing tests are not capped|loop until green/i, file);
        assert.match(source, /at exhaustion ask and wait before a bounded extension/i, file);
    }
});
