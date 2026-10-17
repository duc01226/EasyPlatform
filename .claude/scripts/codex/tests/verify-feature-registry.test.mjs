import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFeatureRegistry } from '../feature-registry.mjs';
import { verifyFeatureRegistry } from '../verify-feature-registry.mjs';

function testCaseLines(entries) {
    return entries.flatMap(entry => [
        `### ${entry.id}: Fixture case`,
        entry.proves ? `**Proves:** ${entry.proves}` : '',
        entry.testLane ? `**Test Lane:** ${entry.testLane}` : '',
        `> **CoveredBy:** ${entry.coveredBy ?? 'Untested'} · **Status:** ${entry.status ?? 'Untested'}`,
        ''
    ]);
}

function fixture({ frontmatter = [], testCases = [], rules = ['BR-FIXTURE-01'], extra = [] } = {}) {
    return [
        '---',
        'module: fixture',
        'service: Fixture',
        'feature_code: FIXTURE',
        ...frontmatter,
        '---',
        '# Fixture Feature',
        '## 1. Overview',
        'Fixture.',
        '## 2. Glossary',
        'Fixture.',
        '## 3. User Stories & Acceptance Criteria',
        'Fixture.',
        '## 4. Business Rules',
        '| Rule ID | Name |',
        '| --- | --- |',
        ...rules.map(id => `| **${id}** | Fixture rule |`),
        '## 5. Domain Model',
        'Fixture.',
        '## 6. Process Flows & Interaction Surface',
        'Fixture.',
        '## 7. Permissions & Roles',
        'Fixture.',
        '## 8. Test Specifications',
        ...testCaseLines(testCases),
        ...extra
    ].join('\n');
}

function registryFor(content, options = {}) {
    return buildFeatureRegistry(
        [
            {
                filePath: 'docs/specs/fixture/README.FixtureFeature.md',
                content
            }
        ],
        options
    );
}

function cases(count) {
    return Array.from({ length: count }, (_, index) => ({
        id: `TC-FIXTURE-${String(index + 1).padStart(3, '0')}`
    }));
}

test('TC-FREG-010: a structurally complete fixture is green', () => {
    const registry = registryFor(
        fixture({
            testCases: [
                {
                    id: 'TC-FIXTURE-001',
                    proves: 'BR-FIXTURE-01',
                    status: 'Tested (two consecutive passes)',
                    coveredBy: '`Fixture.IntegrationTests.Cases::passes`'
                }
            ]
        })
    );
    assert.deepEqual(verifyFeatureRegistry(registry), {
        ok: true,
        summary: { errors: 0, warnings: 0 },
        issues: []
    });
});

test('TC-FREG-011: 40 definitions pass the split gate and 41 fail it', () => {
    const forty = verifyFeatureRegistry(registryFor(fixture({ testCases: cases(40) })));
    const fortyOne = verifyFeatureRegistry(registryFor(fixture({ testCases: cases(41) })));

    assert.equal(forty.ok, true);
    assert.equal(fortyOne.ok, false);
    assert.deepEqual(
        fortyOne.issues.map(issue => issue.code),
        ['SPEC_TC_SPLIT_REQUIRED']
    );
});

test('TC-FREG-013: duplicate definitions and explicitly required missing definitions are rejected', () => {
    const content = fixture({ testCases: [{ id: 'TC-HYPHENATED-FEATURE-09' }, { id: 'TC-HYPHENATED-FEATURE-09' }] });
    const result = verifyFeatureRegistry(registryFor(content), { requiredTcIds: ['TC-HYPHENATED-FEATURE-010'] });

    assert.deepEqual(
        result.issues.map(issue => issue.code),
        ['MISSING_TC_DEFINITION', 'DUPLICATE_TC_ID']
    );
});

test('TC-FREG-014: removing a baseline TC violates stable identity', () => {
    const baselineRegistry = registryFor(fixture({ testCases: cases(2) }));
    const currentRegistry = registryFor(fixture({ testCases: cases(1) }));
    const result = verifyFeatureRegistry(currentRegistry, { baselineRegistry });

    assert.deepEqual(
        result.issues.map(issue => issue.code),
        ['REMOVED_STABLE_TC_ID']
    );
    assert.match(result.issues[0].message, /TC-FIXTURE-002/);
});

test('TC-FREG-015: continuation parent and relative markdown links must resolve', () => {
    const parentPath = 'docs/specs/fixture/README.FixtureFeature.md';
    const partPath = 'docs/specs/fixture/README.FixtureFeature-Part2.md';
    const linkedPath = 'docs/specs/fixture/README.RelatedFeature.md';
    const registry = buildFeatureRegistry(
        [
            { filePath: parentPath, content: fixture({ testCases: cases(1), extra: ['[Related](README.RelatedFeature.md)'] }) },
            {
                filePath: partPath,
                content: fixture({
                    frontmatter: ['parent_spec: README.FixtureFeature.md'],
                    rules: [],
                    testCases: [{ id: 'TC-FIXTURE-002' }]
                })
            }
        ],
        { availablePaths: [linkedPath] }
    );
    assert.equal(verifyFeatureRegistry(registry).ok, true);

    const missing = buildFeatureRegistry([
        {
            filePath: partPath,
            content: fixture({
                frontmatter: ['parent_spec: README.MissingFeature.md'],
                testCases: cases(1),
                extra: ['[Missing](README.MissingRelatedFeature.md)']
            })
        }
    ]);
    assert.deepEqual(
        verifyFeatureRegistry(missing).issues.map(issue => issue.code),
        ['MISSING_PARENT_SPEC', 'BROKEN_SPEC_LINK']
    );
});

test('TC-FREG-016: declared TC and BR ranges reject missing definitions and TC references reject missing BR targets', () => {
    const registry = registryFor(
        fixture({
            frontmatter: ['tc_ranges:', '  - TC-HYPHENATED-FEATURE-09..10', '  - TC-HYPHENATED-FEATURE-001..003', 'br_ranges: [BR-FIXTURE-01..02]'],
            rules: ['BR-FIXTURE-01'],
            testCases: [
                { id: 'TC-HYPHENATED-FEATURE-09', proves: 'BR-FIXTURE-02' },
                { id: 'TC-HYPHENATED-FEATURE-10' },
                { id: 'TC-HYPHENATED-FEATURE-001' },
                { id: 'TC-HYPHENATED-FEATURE-003' }
            ]
        })
    );
    const result = verifyFeatureRegistry(registry);

    assert.deepEqual(
        result.issues.map(issue => issue.code),
        ['INCOMPLETE_DECLARED_RANGE', 'INCOMPLETE_DECLARED_RANGE', 'MISSING_BR_TARGET']
    );
    assert.match(result.issues[0].message + result.issues[1].message, /TC-HYPHENATED-FEATURE-002/);
    assert.doesNotMatch(result.issues[0].message + result.issues[1].message, /TC-HYPHENATED-FEATURE-009/);
    assert.match(result.issues[0].message + result.issues[1].message, /BR-FIXTURE-02/);
});

test('TC-FREG-017: release summaries group Planned under Untested and reject stale totals', () => {
    const green = registryFor(
        fixture({
            frontmatter: ['tc_status_summary: Tested=1, Untested=2'],
            testCases: [
                { id: 'TC-FIXTURE-001', status: 'Tested', coveredBy: '`Fixture.IntegrationTests.Cases::passes`' },
                { id: 'TC-FIXTURE-002', status: 'Untested' },
                { id: 'TC-FIXTURE-003', status: 'Planned', coveredBy: '_none_' }
            ]
        })
    );
    assert.equal(verifyFeatureRegistry(green).ok, true);

    const stale = registryFor(
        fixture({
            frontmatter: ['tc_status_summary: Tested=0, Untested=3'],
            testCases: [
                {
                    id: 'TC-FIXTURE-001',
                    status: 'Tested',
                    coveredBy: '`Fixture.IntegrationTests.Cases::passes`'
                }
            ]
        })
    );
    assert.deepEqual(
        verifyFeatureRegistry(stale).issues.map(issue => issue.code),
        ['STALE_STATUS_SUMMARY', 'STALE_STATUS_SUMMARY']
    );
});

test('TC-FREG-018: Tested requires concrete CoveredBy and an explicit lane must match it', () => {
    const registry = registryFor(
        fixture({
            frontmatter: ['test_lane: integration'],
            testCases: [
                { id: 'TC-FIXTURE-001', status: 'Tested', coveredBy: 'Untested' },
                { id: 'TC-FIXTURE-002', status: 'Tested', coveredBy: '`Fixture.UnitTests.Cases::passes`' }
            ]
        })
    );
    const result = verifyFeatureRegistry(registry);

    assert.deepEqual(
        result.issues.map(issue => issue.code),
        ['STATUS_WITHOUT_COVERAGE', 'COVERAGE_LANE_MISMATCH']
    );
});

test('TC-FREG-019: intentional live-like debt is returned as findings, not mistaken for a fixture regression', () => {
    const debt = registryFor(fixture({ testCases: cases(41) }));
    const result = verifyFeatureRegistry(debt);

    assert.equal(result.ok, false);
    assert.deepEqual(
        result.issues.map(issue => issue.code),
        ['SPEC_TC_SPLIT_REQUIRED']
    );
    assert.equal(result.summary.errors, 1);
});
