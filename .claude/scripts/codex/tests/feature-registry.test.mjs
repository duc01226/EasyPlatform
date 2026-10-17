import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFeatureRegistry, parseFeatureSpecDocument, parseTestCaseId, serializeFeatureRegistry } from '../feature-registry.mjs';

function spec({ feature = 'SAMPLE', testCases = [], frontmatter = [], businessRules = ['BR-SAMPLE-01'], extra = [] } = {}) {
    return [
        '---',
        'module: sample',
        'service: Sample',
        `feature_code: ${feature}`,
        ...frontmatter,
        '---',
        '',
        '# Sample Feature',
        '',
        '## 1. Overview',
        '',
        'Sample.',
        '',
        '## 2. Glossary',
        '',
        'Sample.',
        '',
        '## 3. User Stories & Acceptance Criteria',
        '',
        'Sample.',
        '',
        '## 4. Business Rules',
        '',
        '| Rule ID | Name |',
        '| --- | --- |',
        ...businessRules.map(id => `| **${id}** | Sample rule |`),
        '',
        '## 5. Domain Model',
        '',
        'Sample.',
        '',
        '## 6. Process Flows & Interaction Surface',
        '',
        'Sample.',
        '',
        '## 7. Permissions & Roles',
        '',
        'Sample.',
        '',
        '## 8. Test Specifications',
        '',
        ...testCases.flatMap(entry => [
            `### ${entry.id}: ${entry.title ?? 'Sample case'}`,
            '',
            entry.proves ? `**Proves:** ${entry.proves}` : '',
            entry.testLane ? `**Test Lane:** ${entry.testLane}` : '',
            `> **CoveredBy:** ${entry.coveredBy ?? 'Untested'} · **Status:** ${entry.status ?? 'Untested'}`,
            ''
        ]),
        ...extra
    ].join('\n');
}

test('TC-FREG-001: TC identifiers are parsed from the right edge when feature IDs contain hyphens', () => {
    assert.deepEqual(parseTestCaseId('TC-HYPHENATED-FEATURE-09'), {
        id: 'TC-HYPHENATED-FEATURE-09',
        featureId: 'HYPHENATED-FEATURE',
        ordinal: 9,
        ordinalText: '09'
    });
    assert.deepEqual(parseTestCaseId('TC-INS-CE-002-001'), {
        id: 'TC-INS-CE-002-001',
        featureId: 'INS-CE-002',
        ordinal: 1,
        ordinalText: '001'
    });
    assert.equal(parseTestCaseId('TC-INS-CE-002-not-a-number'), null);
});

test('TC-FREG-002: status notes retain their text while Tested is counted as the raw and release family', () => {
    const document = parseFeatureSpecDocument({
        filePath: 'docs/specs/sample/README.SampleFeature.md',
        content: spec({
            testCases: [
                {
                    id: 'TC-HYPHENATED-FEATURE-001',
                    status: 'Tested (generation half only)',
                    coveredBy: '`Sample.IntegrationTests.Cases::passes`'
                }
            ]
        })
    });

    assert.equal(document.testCases[0].status, 'Tested (generation half only)');
    assert.equal(document.testCases[0].rawStatus, 'Tested');
    assert.equal(document.testCases[0].releaseStatus, 'Tested');
});

test('TC-FREG-003: Planned remains visible in raw counts and groups under Untested for release summaries', () => {
    const registry = buildFeatureRegistry([
        {
            filePath: 'docs/specs/sample/README.SampleFeature.md',
            content: spec({
                testCases: [
                    { id: 'TC-SAMPLE-001', status: 'Tested', coveredBy: '`Sample.IntegrationTests.Cases::passes`' },
                    { id: 'TC-SAMPLE-002', status: 'Partial', coveredBy: '`Sample.IntegrationTests.Cases::partial`' },
                    { id: 'TC-SAMPLE-003', status: 'Untested' },
                    { id: 'TC-SAMPLE-004', status: 'Planned', coveredBy: '_none_' }
                ]
            })
        }
    ]);

    assert.equal(registry.counts.definitions, 4);
    assert.equal(registry.counts.raw.Untested, 1);
    assert.equal(registry.counts.raw.Planned, 1);
    assert.equal(registry.counts.release.Untested, 2);
});

test('TC-FREG-004: parent_spec and part_of continuations aggregate under their canonical parent', () => {
    const parentPath = 'docs/specs/sample/README.SampleFeature.md';
    const registry = buildFeatureRegistry([
        {
            filePath: parentPath,
            content: spec({ testCases: [{ id: 'TC-SAMPLE-001' }] })
        },
        {
            filePath: 'docs/specs/sample/README.SampleFeature-Part2.md',
            content: spec({
                frontmatter: ['parent_spec: README.SampleFeature.md'],
                testCases: [{ id: 'TC-SAMPLE-002' }]
            })
        },
        {
            filePath: 'docs/specs/sample/README.SampleFeature-Part3.md',
            content: spec({
                frontmatter: ['part_of: README.SampleFeature.md'],
                testCases: [{ id: 'TC-SAMPLE-003' }]
            })
        }
    ]);

    assert.equal(registry.features.length, 1);
    assert.equal(registry.features[0].canonicalPath, parentPath);
    assert.deepEqual(
        registry.features[0].testCases.map(entry => entry.id),
        ['TC-SAMPLE-001', 'TC-SAMPLE-002', 'TC-SAMPLE-003']
    );
});

test('TC-FREG-005: registry serialization is deterministic regardless of document input order', () => {
    const inputs = [
        {
            filePath: 'docs/specs/z/README.ZFeature.md',
            content: spec({ feature: 'Z', testCases: [{ id: 'TC-Z-001' }] })
        },
        {
            filePath: 'docs/specs/a/README.AFeature.md',
            content: spec({ feature: 'A', testCases: [{ id: 'TC-A-001' }] })
        }
    ];

    assert.equal(serializeFeatureRegistry(buildFeatureRegistry(inputs)), serializeFeatureRegistry(buildFeatureRegistry([...inputs].reverse())));
});
