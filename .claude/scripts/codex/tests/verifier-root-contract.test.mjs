import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
// Size the overflow fixture from the verifier's own budget instead of a pinned number. This sentinel
// only proves ROOT SELECTION, so it needs an AGENTS.md that overflows — whatever the current limit
// is. Two hard-coded 32768s here silently stopped overflowing when the budget was raised, turning a
// deliberate change into a root-contract failure that says nothing about roots.
const { AGENTS_ROOT_LIMIT_BYTES } = await import(
    pathToFileURL(path.join(repo, '.claude/scripts/codex/verify-skill-protocol-compliance.mjs')).href
);
const OVERSIZE_AGENTS_BYTES = AGENTS_ROOT_LIMIT_BYTES + 1;
const codex = '.claude/scripts/codex';
const spec = 'docs/specs/Root/README.Root.md';
const names = ['feature-registry', 'no-project-residue', 'provenance-markers', 'review-validate-coverage', 'skill-protocol-compliance', 'sync-adoption-parity', 'sdd-semantic-compliance'];
const write = (root, file, text) => { const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, text); };
const isolatedEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'CLAUDE_PROJECT_DIR' && !key.startsWith('GIT_')));

function seed(root, bad) {
    fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
    fs.mkdirSync(path.join(root, 'nested'));
    write(root, 'docs/project-config.json', JSON.stringify({ specSystem: { featureRegistryRoots: [spec] } }));
    write(root, spec, `---\nfeature_code: ROOT\ntc_status_summary: Untested=${bad ? 2 : 1}\n---\n# Root\n${bad ? '[Part 2](README.Root-Part2.md)\n' : ''}## 8. Test Specifications\n### TC-ROOT-001: Parent\n> **CoveredBy:** Untested · **Status:** Untested\n`);
    if (bad) write(root, 'docs/specs/Root/README.Root-Part2.md', '---\nfeature_code: ROOT\nparent_spec: README.Root.md\n---\n# Root Part 2\n[Parent](README.Root.md)\n### TC-ROOT-002: Continuation\n> **CoveredBy:** Untested · **Status:** Untested\n');
    write(root, '.claude/skills/root-sentinel/SKILL.md', bad ? 'AppBaseComponent\n' : 'Project-neutral fixture.\n');
    write(root, '.claude/skills/code-quality-review/SKILL.md', bad ? '# Review\nReport findings.\n' : '# Review\nReport findings; /why-review --validate-findings\n');
    write(root, '.claude/docs/architecture-knowledge.md', `# Catalog\n\n${[3, 8, 9, 10].map(n => `## ${n}. Section\n> **Provenance — default basis for this section:** \`[textbook]\`\n`).join('\n')}\n${bad ? '`[texbook: ROOT-SENTINEL]`' : '`[textbook: ROOT-SENTINEL]`'}\n`);
    write(root, 'AGENTS.md', bad ? 'x'.repeat(OVERSIZE_AGENTS_BYTES) : `<!-- CK:CODEX-ROOT-PROJECTION -->\nRoot fixture.\n<!-- /CK:CODEX-ROOT-PROJECTION -->\n`);
    for (const dir of ['.agents/skills', '.claude/agents', '.codex/agents']) fs.mkdirSync(path.join(root, dir), { recursive: true });
    write(root, '.claude/scripts/inject_review_skill_blocks.py', 'ALPHA = ["skill-a"]\nMATRIX = [\n ("SYNC:alpha", ALPHA),\n]\n');
    write(root, '.claude/skills/shared/sync-inline-versions.md', '## SYNC:alpha\n\n> Alpha body.\n\n---\n\n## SYNC:alpha:reminder\n\n- Alpha reminder.\n');
    write(root, '.claude/skills/skill-a/SKILL.md', `<!-- SYNC:alpha -->\n${bad ? '> Drifted body.' : '> Alpha body.'}\n<!-- /SYNC:alpha -->\n<!-- SYNC:alpha:reminder -->\n- Alpha reminder.\n<!-- /SYNC:alpha:reminder -->\n`);
    // Separate repositories make the SDD changed-file operand distinguishable.
    const git = spawnSync('git', ['-c', 'init.templateDir=', 'init', '--quiet', root], { env: isolatedEnv(), encoding: 'utf8', timeout: 10000 });
    assert.equal(git.status, 0, git.stderr);
    if (bad) write(root, 'docs/specs/Root/README.RootSentinel.md', '# Root sentinel\nThe flow uses CQRS in prose.\n');
}

function bundle(root, name) {
    for (const file of [`${codex}/verify-${name}.mjs`, '.claude/scripts/lib/project-root.cjs', `${codex}/feature-registry.mjs`]) {
        write(root, file, fs.readFileSync(path.join(repo, file), 'utf8'));
    }
    return path.join(root, codex, `verify-${name}.mjs`);
}

// The timeout is a HANG GUARD, not a performance budget: a root-resolution mutant (e.g.
// `cwd: path.parse(process.cwd()).root`) can point a verifier at a drive root and never return,
// which would wedge the suite. Size it against contention, not against the real cost — a verifier
// invocation is ~110ms on a quiet box, but this file spawns ~10 children per test across 7 tests
// inside a 43-file, 16-way-parallel `node --test` run. At the ~6x whole-suite slowdown observed
// under load, a 15s budget left only ~4x headroom and one unlucky spawn tripped it (ETIMEDOUT on
// test 200 while it was the FASTEST of the seven when run alone). 60s matches the heaviest
// spawning sibling in this suite, workflow-baseline.test.mjs:341.
function invoke(script, cwd, explicit, name, args = []) {
    const env = isolatedEnv();
    if (explicit !== undefined) env.CLAUDE_PROJECT_DIR = explicit;
    const flags = name === 'feature-registry' ? ['--configured-roots'] : name === 'sdd-semantic-compliance' ? ['--enforce-changed'] : [];
    const result = spawnSync(process.execPath, [script, ...flags, ...args], { cwd, env, encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
    assert.equal(result.error, undefined);
    assert.doesNotMatch(result.stderr, /SyntaxError|ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND/);
    return result;
}

const sentinels = {
    'feature-registry': /PASS \(2 canonical TC definitions\)/,
    'no-project-residue': /\.claude\/skills\/root-sentinel\/SKILL\.md:1: project symbol "AppBaseComponent"/,
    'provenance-markers': /architecture-knowledge\.md:15: marker `\[texbook\]` is not a declared tag/,
    'review-validate-coverage': /code-quality-review: carries findings\/severity language but no/,
    'skill-protocol-compliance': new RegExp(`AGENTS\\.md is ${OVERSIZE_AGENTS_BYTES} bytes, above the ${AGENTS_ROOT_LIMIT_BYTES}-byte bounded projection limit`),
    'sync-adoption-parity': /skill-a :: SYNC:alpha.*injected body differs from canonical/,
    'sdd-semantic-compliance': /error SDD022 docs\/specs\/Root\/README\.RootSentinel\.md:/,
};
const output = result => result.stdout + result.stderr;

// Intent: direct CLI root precedence must not be masked by a runner changing cwd.
// Every selector has a conflicting physical script root and/or working directory.
for (const name of names) {
    test(`${name}: direct CLI env, nested cwd and script roots select the sentinel`, () => {
        const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-verifier-root-'));
        try {
            const a = path.join(temp, 'a'), b = path.join(temp, 'b');
            seed(a, true); seed(b, false);
            const scriptA = bundle(a, name), scriptB = bundle(b, name);
            const modes = [
                { script: scriptB, cwd: b, env: a },
                { script: scriptB, cwd: path.join(a, 'nested') },
                { script: scriptA, cwd: path.parse(temp).root },
            ];
            for (const mode of modes) {
                const result = invoke(mode.script, mode.cwd, mode.env, name);
                assert.equal(result.status, name === 'feature-registry' ? 0 : 1, output(result));
                assert.match(output(result), sentinels[name]);
            }
            const clean = invoke(scriptA, a, b, name);
            assert.doesNotMatch(output(clean), sentinels[name]);
            if (name === 'feature-registry') assert.match(clean.stdout, /PASS \(1 canonical TC definitions\)/);
            else if (!['skill-protocol-compliance', 'sdd-semantic-compliance'].includes(name)) assert.equal(clean.status, 0, output(clean));
            // Structural-skeleton failures for C/S are not evidence of root choice:
            // only their exact root-specific diagnostic above is the oracle.
            if (name === 'feature-registry') {
                const explicit = invoke(scriptA, a, a, name, [`--root=${b}`]);
                assert.equal(explicit.status, 0, output(explicit));
                assert.match(explicit.stdout, /PASS \(1 canonical TC definitions\)/);
            }
            // Actual single-operand mutants, written ONLY to private copied bundles.
            const mutations = [
                ['resolveProjectRoot({', '(({ cwd }) => ({ rootDir: cwd }))({', 0],
                ['env: process.env', 'env: {}', 0],
                ['cwd: process.cwd()', 'cwd: path.parse(process.cwd()).root', 1],
                ['scriptPath: fileURLToPath(import.meta.url)', 'scriptPath: undefined', 2],
            ];
            if (name === 'feature-registry') mutations.push(
                ['options.rootDir = resolvedRoot;', 'options.rootDir = process.cwd();', 0],
                ['async function main(resolvedRoot)', 'async function main(_resolvedRoot, resolvedRoot)', 0],
                ['}).rootDir);', '}).rootDir && process.cwd());', 0],
            );
            else if (name === 'sync-adoption-parity' || name === 'sdd-semantic-compliance') mutations.push(['}).rootDir;', '}).rootDir && process.cwd();', 0]);
            else mutations.push(['const rootDir = rootResolution.rootDir;', 'const rootDir = process.cwd();', 0]);
            if (name === 'sdd-semantic-compliance') mutations.push(
                // Replace ONLY the root resolver: the entry gate must still run the CLI, or the
                // mutant would die at startup and count as killed for the wrong reason.
                ['({ resolveProjectRoot, isInvokedAsScript } = require("../lib/project-root.cjs"));', '({ isInvokedAsScript } = require("../lib/project-root.cjs")); resolveProjectRoot = ({ cwd }) => ({ rootDir: cwd });', 0],
                ['getChangedFiles(rootDir, { enforceChanged, staged })', 'getChangedFiles(process.cwd(), { enforceChanged, staged })', 0],
                ['runChecks(rootDir, CHECKS, options)', 'runChecks(process.cwd(), CHECKS, options)', 0],
            );
            for (const [from, to, modeIndex] of mutations) {
                const mode = modes[modeIndex], source = fs.readFileSync(mode.script, 'utf8');
                assert.equal(source.split(from).length, 2, `${name}: unique ${from}`);
                fs.writeFileSync(mode.script, source.replace(from, to));
                try { assert.doesNotMatch(output(invoke(mode.script, mode.cwd, mode.env, name)), sentinels[name], `${name}: mutant ${from} survived`); }
                finally { fs.writeFileSync(mode.script, source); }
            }
            if (name === 'feature-registry') {
                const source = fs.readFileSync(scriptA, 'utf8');
                const from = "!process.argv.slice(2).some(argument => argument.startsWith('--root=')) && resolvedRoot";
                assert.equal(source.split(from).length, 2);
                fs.writeFileSync(scriptA, source.replace(from, 'resolvedRoot'));
                const ignoredExplicit = invoke(scriptA, a, a, name, [`--root=${b}`]);
                assert.match(ignoredExplicit.stdout, /PASS \(2 canonical TC definitions\)/);
                assert.doesNotMatch(ignoredExplicit.stdout, /PASS \(1 canonical TC definitions\)/);
            }
            if (name === 'sdd-semantic-compliance') {
                const standalone = path.join(temp, 'standalone.mjs');
                const source = fs.readFileSync(scriptA, 'utf8');
                fs.writeFileSync(standalone, source);
                assert.match(output(invoke(standalone, a, undefined, name)), sentinels[name]);
                fs.writeFileSync(standalone, source.replace('rootDir: path.resolve(cwd)', 'rootDir: path.parse(cwd).root'));
                assert.doesNotMatch(output(invoke(standalone, a, undefined, name)), sentinels[name]);
            }
        } finally { fs.rmSync(temp, { recursive: true, force: true }); }
    });
}
