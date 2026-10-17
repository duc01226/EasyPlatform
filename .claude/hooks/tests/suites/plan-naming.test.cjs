/**
 * TECHNICAL-ONLY: Protect the generic plan-naming config contract; no business TC applies.
 */
'use strict';

const assert = require('node:assert/strict');
const { resolveNamingPattern } = require('../../lib/ck-plan-resolver.cjs');

const tests = [{
    name: '[plan-naming] null prefix keeps extracted IDs while explicit and missing IDs retain their behavior',
    fn: () => {
        // GIVEN a plan naming format with issue and slug placeholders and a stable date format
        const baseConfig = {
            namingFormat: '{date}-{issue}-{slug}',
            dateFormat: 'DATE'
        };

        // WHEN resolving branches with numeric issue IDs and a null prefix
        const issueCases = ['1', '123', '999999999999999999999'];

        // THEN every extracted ID uses the documented generic # fallback
        for (const issueId of issueCases) {
            const result = resolveNamingPattern(
                { ...baseConfig, issuePrefix: null },
                `feat/${issueId}-add-search`
            );
            assert.equal(result, `DATE-#${issueId}-{slug}`);
        }

        // AND explicit prefixes and branches without issue IDs keep their existing behavior
        assert.equal(
            resolveNamingPattern({ ...baseConfig, issuePrefix: 'ABC-' }, 'feat/123-add-search'),
            'DATE-ABC-123-{slug}'
        );
        assert.equal(
            resolveNamingPattern({ ...baseConfig, issuePrefix: null }, 'main'),
            'DATE-{slug}'
        );
    }
}];

module.exports = { name: 'plan-naming', tests };
