import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const verifierPath = path.resolve(thisDir, '..', 'verify-no-project-residue.mjs');
const { findProjectSymbolViolations, projectSymbolDenylist, projectSymbolAllowlist } = await import(
    pathToFileURL(verifierPath).href
);

// TC-SKILLFIX-010 — a denylisted project symbol in a NON-allowlisted generic skill is flagged.
test('TC-SKILLFIX-010: flags a denylisted project symbol in a non-allowlisted file', () => {
    const content = 'Components extend `AppBaseComponent` for lifecycle teardown.';
    const violations = findProjectSymbolViolations(content, '.claude/skills/some-generic/SKILL.md');
    assert.equal(violations.length, 1);
    assert.equal(violations[0].symbol, 'AppBaseComponent');
    assert.equal(violations[0].line, 1);
});

// TC-SKILLFIX-011 — the SAME symbol is exempt in an allowlisted file (per-file exemption).
test('TC-SKILLFIX-011: allowlisted file+symbol is not flagged', () => {
    const content = '- API services MUST extend `PlatformApiService` (BLOCKED)';
    const violations = findProjectSymbolViolations(content, '.claude/skills/review-architecture/SKILL.md');
    assert.equal(violations.length, 0);
});

// TC-SKILLFIX-012 — case-sensitive + word-boundary → no partial/case false positives.
test('TC-SKILLFIX-012: case-sensitive, word-boundary — no partial or case false positives', () => {
    const content = [
        'lowercase appbasecomponent must not match (case differs)',
        'AppBaseComponentStore is a different, longer symbol (right boundary fails)',
        'embeddedPlatformVmStore inside a word (left boundary fails)'
    ].join('\n');
    const violations = findProjectSymbolViolations(content, '.claude/skills/some-generic/SKILL.md');
    assert.equal(violations.length, 0);
});

// TC-SKILLFIX-013 — the allowlist is per-SYMBOL, not whole-file: project-config is exempt only for
// IPlatformRootRepository, so a second denylisted symbol in the same file is still flagged.
test('TC-SKILLFIX-013: allowlist is per-symbol, not whole-file', () => {
    const content = [
        'Use `IPlatformRootRepository<TEntity>` not "follow best practices".',
        'State via `PlatformVmStore`.'
    ].join('\n');
    const violations = findProjectSymbolViolations(content, '.claude/skills/project-config/SKILL.md');
    assert.equal(violations.length, 1);
    assert.equal(violations[0].symbol, 'PlatformVmStore');
    assert.equal(violations[0].line, 2);
});

// TC-SKILLFIX-013b — invariant: every allowlisted symbol is a real denylist member (guards against
// allowlist typos that would silently exempt nothing / drift out of sync with the denylist).
test('TC-SKILLFIX-013b: every allowlisted symbol is a member of the denylist', () => {
    const deny = new Set(projectSymbolDenylist);
    for (const [file, symbols] of Object.entries(projectSymbolAllowlist)) {
        for (const symbol of symbols) {
            assert.ok(deny.has(symbol), `allowlist[${file}] references non-denylisted symbol "${symbol}"`);
        }
    }
});

// Managed-block skipping (parity with the forbidden-term scanner) is opt-in and off by default.
test('TC-SKILLFIX-013c: default scan does NOT skip managed blocks', () => {
    const content = '`AppBaseComponent` sits in plain prose.';
    assert.equal(findProjectSymbolViolations(content, '.claude/skills/some-generic/SKILL.md').length, 1);
});
