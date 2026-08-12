import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const verifierPath = path.resolve(thisDir, '..', 'verify-provenance-markers.mjs');
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const {
    findMarkerViolations,
    findBannerViolations,
    findConsumerViolations,
    parseSections,
    DECLARED_TAGS,
    GUARDED_SECTIONS
} = await import(pathToFileURL(verifierPath).href);

// ---------------------------------------------------------------------------
// Fixtures
//
// The preamble holds the LEGEND, the one block where a bare `— VERIFY` is
// legitimate: the vocabulary has to name the token in order to define it.
// Everywhere else a `— VERIFY` must attach to a declared marker.
// ---------------------------------------------------------------------------

const PREAMBLE = [
    '# Architecture Knowledge Catalog',
    '',
    '> **Consumed by:** `architecture-design` · `architecture-review` · `architecture-review-full`.',
    '>',
    '> **MUST ATTENTION** provenance is part of every load-bearing claim in **§3, §8, §9, §10**. The ROW is the'
        + ' only scope unit. A trailing `— VERIFY` means the claim has **not** been checked against a primary'
        + ' source. NEVER quote a `— VERIFY` row as settled fact in a finding.',
    ''
].join('\n');

// Mirrors §3's real banner shape: a `[textbook]` section default, a list of laws illustrating that
// DEFAULT, then a CRITERION-based exception. It names the exception's tag WITHOUT the bracketed form —
// writing `[model-knowledge]` would trip check 5, and writing `— VERIFY` would re-mark the banner
// itself, which is the scope collision R4-F1 removed.
const S3_BANNER_OK = '> **Provenance — default basis for this section:** rows are `[textbook]` — MOST rows name a'
    + ' published, citable result (Conway, CAP, Amdahl, Little\'s, Parnas). **Exception — a row whose title hedges'
    + ' (`-ish`) or that synthesizes a rule from other laws is NOT `[textbook]`; mark it inline with the legend\'s'
    + ' `model-knowledge` basis (no primary source named)**, and NEVER cite such a row as a named authority.';

const PLAIN_BANNER = '> **Provenance — default basis for this section:** `[model-knowledge] — VERIFY` unless a'
    + ' row carries its own marker.';

const S3_ROWS = [
    '| Law | Statement | Use |',
    '| --- | --- | --- |',
    '| **Conway** | System structure mirrors org communication structure | Change the org or accept what you get |',
    '| **Integration cost (Metcalfe-ish)** | Links grow quadratically | Why brokers exist `[model-knowledge] — VERIFY` |',
    '| **CAP-aware clock rule** | Wall clocks disagree without bound | Never order events by wall clock `[model-knowledge] — VERIFY` |'
];

/** Build a syntactically complete catalog; override any guarded section's banner or rows. */
function catalog({ s3Banner = S3_BANNER_OK, s3Rows = S3_ROWS, s8Banner = PLAIN_BANNER, extraLines = [] } = {}) {
    return [
        PREAMBLE,
        '## 3. Laws & Theorems',
        '',
        s3Banner,
        '',
        ...s3Rows,
        ...extraLines,
        '',
        '## 8. Data & Storage',
        '',
        s8Banner,
        '',
        '## 9. Consistency',
        '',
        PLAIN_BANNER,
        '',
        '## 10. Messaging',
        '',
        PLAIN_BANNER,
        ''
    ].join('\n');
}

const all = (content) => [...findMarkerViolations(content), ...findBannerViolations(content)];

// ---------------------------------------------------------------------------
// Check 1 + 5 — the two checks Round 4 confirmed already fire (regression locks)
// ---------------------------------------------------------------------------

// TC-PROV-001 (attack i-b) — an undeclared/typo'd tag reads as authoritative provenance while
// matching no rule, so it must fail Check 1.
test('TC-PROV-001: an undeclared tag in marker position is a violation', () => {
    const content = catalog({
        extraLines: ['| **Typo row** | Statement | Consequence `[texbook: Some Work]` |']
    });
    const violations = findMarkerViolations(content);
    assert.equal(violations.length, 1);
    assert.match(violations[0], /texbook/);
    assert.match(violations[0], /not a declared tag/);
});

// TC-PROV-002 (attack i-c) — a bare `[model-knowledge]` declares a claim unverified in the catalog's
// own vocabulary while leaving every consumer guard (which keys on `— VERIFY`) untripped.
test('TC-PROV-002: bare [model-knowledge] without the — VERIFY suffix is a violation', () => {
    const content = catalog({
        extraLines: ['| **Bare row** | Statement | Consequence `[model-knowledge]` |']
    });
    const violations = findMarkerViolations(content).filter((v) => /bare/.test(v));
    assert.equal(violations.length, 1);
    assert.match(violations[0], /model-knowledge/);
});

test('TC-PROV-002b: the declared vocabulary is exactly the three legend terms', () => {
    assert.deepEqual(DECLARED_TAGS, ['textbook', 'vendor-doc', 'model-knowledge']);
    assert.deepEqual(GUARDED_SECTIONS, [3, 8, 9, 10]);
});

// ---------------------------------------------------------------------------
// Check 2 — bypass ii: the substring allowlist exempted any line containing an
// ordinary English word (`marked`, `means`). Legitimacy is a BLOCK property
// (the legend), never a word property.
// ---------------------------------------------------------------------------

// TC-PROV-003 (attack ii) — THE BYPASS. A table row with a free-floating `— VERIFY` and no marker,
// on a line that happens to contain the word "marked", must still fail Check 2.
test('TC-PROV-003: a free-floating — VERIFY outside the legend is a violation even when the line says "marked"', () => {
    const content = catalog({
        extraLines: ['| **Sneaky row** | Statement | Consequence is marked — VERIFY |']
    });
    const violations = findMarkerViolations(content).filter((v) => /does not attach/.test(v));
    assert.equal(
        violations.length,
        1,
        'an ordinary English word must not exempt a line from Check 2 — legitimacy is block-scoped'
    );
});

// TC-PROV-003b — the same for `means`, and for a line quoting the consumer guard's own wording.
// Both words appear in real prose constantly; neither may buy an exemption outside the legend.
test('TC-PROV-003b: neither "means" nor guard-quoting prose exempts a row from Check 2', () => {
    for (const cell of [
        '| **Row A** | Statement | This means — VERIFY |',
        '| **Row B** | Statement | A row or section banner — VERIFY |'
    ]) {
        const violations = findMarkerViolations(catalog({ extraLines: [cell] }))
            .filter((v) => /does not attach/.test(v));
        assert.equal(violations.length, 1, `must be a violation: ${cell}`);
    }
});

// TC-PROV-004 — the legitimate case Check 2 must keep allowing: the legend defines the token, so it
// names it without attaching it. Scoped by BLOCK (the preamble), not by vocabulary.
test('TC-PROV-004: bare — VERIFY inside the legend/preamble block is allowed', () => {
    const violations = findMarkerViolations(catalog()).filter((v) => /does not attach/.test(v));
    assert.deepEqual(violations, [], 'the legend must be free to define the token it introduces');
});

// ---------------------------------------------------------------------------
// Check 4 — bypasses iii-a / iii-b: the 5-phrase blocklist matched only one
// author's happened-to-be wording. The invariant is structural: a banner may
// state a CRITERION, never name which rows are the exceptions.
// ---------------------------------------------------------------------------

// TC-PROV-005 (attack iii-a) — THE BYPASS. A banner naming a row title as the exception is a second,
// hand-maintained mechanism that goes stale on the next row added.
test('TC-PROV-005: a banner naming a row title after an exception keyword is a violation', () => {
    const banner = '> **Provenance — default basis for this section:** rows are `[textbook]`.'
        + ' The exception is Integration cost (Metcalfe-ish), which is not a published result.';
    const violations = findBannerViolations(catalog({ s3Banner: banner }));
    assert.equal(violations.length, 1, 'naming an exception row in a banner must fail Check 4');
    assert.match(violations[0], /§3/);
    assert.match(violations[0], /Integration cost/);
});

// TC-PROV-006 (attack iii-b) — the same defect in different words. Phrasing must not decide the verdict.
test('TC-PROV-006: a differently-worded row enumeration is equally a violation', () => {
    const banner = '> **Provenance — default basis for this section:** rows are `[textbook]`,'
        + ' specifically: Integration cost (Metcalfe-ish) and CAP-aware clock rule are not.';
    const violations = findBannerViolations(catalog({ s3Banner: banner }));
    assert.equal(violations.length, 1, 'Check 4 must key on structure, not on one author\'s phrasing');
    assert.match(violations[0], /§3/);
});

// TC-PROV-006b — the historical phrasings stay caught (no regression from the old blocklist).
test('TC-PROV-006b: the previously-blocklisted phrasings remain violations', () => {
    for (const clause of [
        'Exception — today that is Integration cost (Metcalfe-ish).',
        'Exception — namely: CAP-aware clock rule.',
        'The exceptions are Integration cost (Metcalfe-ish) and CAP-aware clock rule.'
    ]) {
        const banner = `> **Provenance — default basis for this section:** rows are \`[textbook]\`. ${clause}`;
        const violations = findBannerViolations(catalog({ s3Banner: banner }));
        assert.equal(violations.length, 1, `must still be caught: ${clause}`);
    }
});

// TC-PROV-007 — NO FALSE POSITIVE. §3's real banner legitimately names ~15 laws to illustrate its
// DEFAULT ("MOST rows name a published result…") and then states a CRITERION for the exception. The
// naive structural form ("banner contains no row title") would fail this; the clause-scoped form must
// not, because the title list precedes the exception keyword and the exception names a property.
test('TC-PROV-007: a criterion-based exception alongside a default-illustrating law list is clean', () => {
    const violations = findBannerViolations(catalog({ s3Banner: S3_BANNER_OK }));
    assert.deepEqual(
        violations,
        [],
        'naming laws to illustrate the DEFAULT is not enumerating EXCEPTIONS — the clause scope is what separates them'
    );
});

// TC-PROV-007b — the plain whole-section banner form ("… unless a row carries its own marker") uses
// an exception keyword followed by a PROPERTY, not a row title. Must stay clean.
test('TC-PROV-007b: "unless a row carries its own marker" is a criterion, not an enumeration', () => {
    const violations = findBannerViolations(catalog({ s3Banner: PLAIN_BANNER }));
    assert.deepEqual(violations, []);
});

// ---------------------------------------------------------------------------
// Check 3 — banner presence per guarded section
// ---------------------------------------------------------------------------

// TC-PROV-008 — a guarded section without its banner leaves every row silently unattributed.
test('TC-PROV-008: a guarded section with no default-basis banner is a violation', () => {
    const content = catalog({ s8Banner: '> Some other blockquote that is not a provenance banner.' });
    const violations = findBannerViolations(content);
    assert.equal(violations.length, 1);
    assert.match(violations[0], /§8/);
    assert.match(violations[0], /no default-basis banner/);
});

test('TC-PROV-008b: parseSections keys sections by their leading number', () => {
    const sections = parseSections(catalog());
    assert.deepEqual([...sections.keys()], [3, 8, 9, 10]);
    assert.equal(sections.get(3).title, 'Laws & Theorems');
});

// ---------------------------------------------------------------------------
// Check 6 (R4-F3) — consumer-side assertion. The whole convention rests on 3
// skills whose guards key on the LITERAL `— VERIFY` token; a rewording silently
// disarms every guard while the catalog still passes. Guard-bearing consumers
// are identified STRUCTURALLY (a line tying the catalog to a guarded section),
// never by a hand-maintained list.
// ---------------------------------------------------------------------------

const GUARD_BEARING_SKILL = [
    '# Some Architecture Skill',
    'Consult `.claude/docs/architecture-knowledge.md` §3/§8/§9/§10 for laws.',
    'A row or section banner marked `— VERIFY` is an UNVERIFIED assertion — never quote it as authority.'
].join('\n');

// Same skill, guard REWORDED so the token is gone — the R2-F2 failure mode.
const GUARD_REWORDED = [
    '# Some Architecture Skill',
    'Consult `.claude/docs/architecture-knowledge.md` §3/§8/§9/§10 for laws.',
    'A row flagged as unchecked is an UNVERIFIED assertion — never quote it as authority.'
].join('\n');

// A consumer that references the catalog but NOT its guarded sections (e.g. only §20's checklists):
// it carries no provenance guard, so demanding the token would be a false positive.
const NON_GUARD_BEARING_SKILL = [
    '# Orchestrator Skill',
    'Run the `architecture-knowledge.md` §20 coverage sweep and self-audit.'
].join('\n');

// TC-PROV-009 — a reworded guard in a guard-bearing consumer is a violation.
test('TC-PROV-009: a guard-bearing consumer that lost the literal — VERIFY token is a violation', () => {
    const violations = findConsumerViolations(catalog(), (name) =>
        name === 'architecture-design' ? GUARD_REWORDED : GUARD_BEARING_SKILL
    );
    assert.equal(violations.length, 1);
    assert.match(violations[0], /architecture-design/);
    assert.match(violations[0], /VERIFY/);
});

// TC-PROV-009b — all consumers keeping the token is clean.
test('TC-PROV-009b: consumers that keep the token pass', () => {
    const violations = findConsumerViolations(catalog(), () => GUARD_BEARING_SKILL);
    assert.deepEqual(violations, []);
});

// TC-PROV-009c — NO FALSE POSITIVE on a consumer that references the catalog outside the guarded
// sections. `architecture-review-full` is exactly this case (its pointers target §20), so the check
// must skip it rather than demand a guard it has no reason to carry.
test('TC-PROV-009c: a consumer referencing only non-guarded sections is skipped, not failed', () => {
    const violations = findConsumerViolations(catalog(), (name) =>
        name === 'architecture-review-full' ? NON_GUARD_BEARING_SKILL : GUARD_BEARING_SKILL
    );
    assert.deepEqual(violations, [], 'a skill with no provenance guard must not be required to have one');
});

// TC-PROV-009d — an unreadable consumer is skipped (fail-soft), matching the catalog-absent policy:
// a project that copied `.claude` partially must not wedge its pipeline.
test('TC-PROV-009d: an absent consumer skill is skipped (fail-soft)', () => {
    const violations = findConsumerViolations(catalog(), () => null);
    assert.deepEqual(violations, []);
});

// ---------------------------------------------------------------------------
// Live-file gates — the checks above prove the LOGIC; these prove the REPO
// currently satisfies it (the property the pipeline stage actually asserts).
// ---------------------------------------------------------------------------

// TC-PROV-010 — the live catalog passes every check, including the consumer assertion.
test('TC-PROV-010: the live catalog and its live consumers pass all checks', () => {
    const catalogPath = path.join(repoRoot, '.claude', 'docs', 'architecture-knowledge.md');
    if (!fs.existsSync(catalogPath)) return; // fail-soft, same policy as the verifier
    const content = fs.readFileSync(catalogPath, 'utf8');
    const readSkill = (name) => {
        const filePath = path.join(repoRoot, '.claude', 'skills', name, 'SKILL.md');
        return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
    };
    const failures = [...all(content), ...findConsumerViolations(content, readSkill)];
    assert.deepEqual(failures, [], `live catalog must be clean:\n${failures.join('\n')}`);
});

// TC-PROV-011 — pipeline registration. The runner is the single source of truth for the pipeline, and
// it lives inside `.claude`, so this half MUST hold in every project that copied the framework.
test('TC-PROV-011: the verifier is registered as a pipeline stage in the standalone runner', () => {
    const runnerPath = path.join(repoRoot, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs');
    assert.ok(fs.existsSync(runnerPath), 'run-codex-sync.mjs must exist');
    const runner = fs.readFileSync(runnerPath, 'utf8');
    assert.match(runner, /verify-provenance-markers\.mjs/, 'runner must reference the verifier script');
    assert.match(runner, /id:\s*["']provenance-markers["']/, 'runner must register the stage id (also the --only key)');
});

// TC-PROV-011b — npm-surface parity, but ONLY in the framework's own repo.
//
// A project that adopts the framework copies `.claude` and keeps its own root package.json (or has
// none at all — `export-claude` deliberately ships no package.json, and PORT-007 asserts that). So an
// UNCONDITIONAL package.json assertion here would fail in every adopting project and abort the sync
// pipeline at its own test stage. The npm scripts are a convenience surface of THIS repo, not part of
// the portable contract — hence the self-identification guard.
test('TC-PROV-011b: package.json exposes the stage (framework repo only)', () => {
    const pkgPath = path.join(repoRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) return; // adopting project with no root package.json
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.name !== 'easy-claude-tooling') return; // adopting project's own package.json

    assert.ok(
        pkg.scripts['codex:verify:provenance-markers'],
        'package.json must expose the single-stage script'
    );
    assert.match(
        pkg.scripts['verify:all'],
        /provenance-markers/,
        'verify:all must include the provenance-markers stage'
    );
});

// TC-PROV-012 — peer-convention lock: EVERY codex verifier has a unit test beside it. This test
// exists because `verify-provenance-markers` shipped without one while 7/7 peers had one, and the
// gap is what let three phrase-list bypasses through. The lock makes the next omission fail here.
test('TC-PROV-012: every codex verifier has a matching unit test (peer-convention lock)', () => {
    const codexDir = path.join(repoRoot, '.claude', 'scripts', 'codex');
    const verifiers = fs
        .readdirSync(codexDir)
        .filter((name) => name.startsWith('verify-') && name.endsWith('.mjs'));
    assert.ok(verifiers.length >= 8, `expected at least 8 verifiers, found ${verifiers.length}`);
    const untested = verifiers.filter(
        (name) => !fs.existsSync(path.join(codexDir, 'tests', name.replace(/\.mjs$/, '.test.mjs')))
    );
    assert.deepEqual(
        untested,
        [],
        `every verifier needs a tests/<name>.test.mjs — a verifier whose only executed case is the live `
            + `repo has no negative coverage at all:\n${untested.join('\n')}`
    );
});
