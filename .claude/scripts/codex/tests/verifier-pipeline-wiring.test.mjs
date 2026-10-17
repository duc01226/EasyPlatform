import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { frameworkPkg } from './framework-repo.helper.mjs';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const read = rel => fs.readFileSync(path.join(repoRoot, ...rel.split('/')), 'utf8');

function runnerStageIds(source) {
    return [...source.matchAll(/\bid:\s*["']([\w-]+)["']/g)].map(match => match[1]);
}

test('TC-PIPE-WIRE-001: CLAUDE preflight precedes freshness and registry gates in the 19-stage runner', () => {
    // Given the runner source defines the canonical sync stage roster.
    const runner = read('.claude/skills/sync-codex/scripts/run-codex-sync.mjs');
    const ids = runnerStageIds(runner);

    // When the roster order is inspected.
    assert.equal(ids.length, 19, `source docs and runner contract require 19 stages, got ${ids.length}`);
    assert.deepEqual(ids.slice(0, 5), ['claude-md', 'migrate', 'hooks', 'context', 'tests']);
    assert.deepEqual(ids.slice(4, 8), ['tests', 'scripts-tests', 'tech-spec-freshness', 'feature-registry']);
    assert.match(runner, /generate-tech-specs\.mjs[\s\S]*id:\s*["']tech-spec-freshness["'][\s\S]*["']--check["']/);
    assert.match(runner, /id:\s*["']feature-registry["'][^\n]*verify-feature-registry\.mjs/);
    // Then CLAUDE.md reconciliation is before mirror generation and the later release gates.
});

test('TC-PIPE-WIRE-002: source skill docs expose the read-only commands and the complete stage roster', () => {
    // Given the source skill documentation is the human-readable pipeline contract.
    const techSpec = read('.claude/skills/tech-spec/SKILL.md');
    const syncCodex = read('.claude/skills/sync-codex/SKILL.md');

    // When the documented commands and stage table are inspected.
    assert.match(techSpec, /generate-tech-specs\.mjs --check/);
    assert.doesNotMatch(techSpec, /npm run /,
        'the skill must document the in-framework path, never a host npm script it cannot rely on');
    assert.match(syncCodex, /19 stages, sequential/);
    assert.match(syncCodex, /\| 1\s+\| claude-md/);
    assert.match(syncCodex, /\| 7\s+\| tech-spec-freshness/);
    assert.match(syncCodex, /\| 8\s+\| feature-registry/);
    // Then the docs describe the same 19-stage order as the executable runner.
});

// TC-PIPE-WIRE-003 — both release gates carry their exact flags INSIDE the runner, not in a host
// npm script. The predecessor asserted four package.json strings; those scripts are gone, because a
// portable framework cannot depend on a host `package.json` existing. The flags are what actually
// matter (`--check --optional`, `--configured-roots --optional` make each gate an optional project
// capability rather than a hard failure in an adopting project), so they are asserted where they are
// now executed — which makes the check unconditional instead of framework-repo-only.
test('TC-PIPE-WIRE-003: both release gates carry their optional-capability flags inside the runner', () => {
    const runner = read('.claude/skills/sync-codex/scripts/run-codex-sync.mjs');

    const techSpec = runner.match(/\{[^{}]*\bid:\s*["']tech-spec-freshness["'][^{}]*\}/);
    assert.ok(techSpec, 'the runner must declare the tech-spec-freshness stage');
    assert.match(techSpec[0], /["']--check["']/, 'the freshness gate must stay read-only (--check)');

    const registry = runner.match(/\{[^{}]*\bid:\s*["']feature-registry["'][^{}]*\}/);
    assert.ok(registry, 'the runner must declare the feature-registry stage');
    assert.match(registry[0], /verify-feature-registry\.mjs/);
    assert.match(registry[0], /["']--configured-roots["']/, 'the registry gate must read the project-declared roots');

    // Neither gate may be a mutating stage, so both are selected by the derived `--verify-only` set.
    for (const [name, stage] of [['tech-spec-freshness', techSpec[0]], ['feature-registry', registry[0]]]) {
        assert.doesNotMatch(stage, /\bmutate:\s*true\b/, `${name} is a read-only gate`);
    }
});
