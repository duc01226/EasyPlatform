import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';
import { DEFAULT_FRAMEWORK_PACKAGE_NAME, frameworkPackageName, frameworkPkg, isFrameworkRepo } from './framework-repo.helper.mjs';

// Portability contract: copying ONLY `.claude/` into a new project that has NO root package.json
// must still run the full sync+verify pipeline. The framework's script execution is self-contained in
// `.claude` (the standalone runner `run-codex-sync.mjs`); the npm scripts merely delegate to it. These
// tests are the regression matrix for "everything works from a bare `.claude` copy" — they fail loudly
// if a node_modules dependency creeps into the pipeline, if the npm entrypoints stop delegating, if the
// runner drifts behind the npm verify set, or if the export payload loses a pipeline script.
//
// This file holds TWO related portability-contract groups — the filename names the headline guarantee,
// not the only one, so do NOT split or rename it:
//   • No-package-json group (PORT-001/002/006/007/009): pure bare-`.claude` behavior — the pipeline
//     imports only `node:` built-ins, npm-auto-install no-ops, the runner self-locates + fails fast,
//     and the export payload ships NO root package.json. None of these read a package.json.
//   • npm-delegation group (PORT-003/004/005/008/010): the inverse guarantee — WHEN THIS REPO'S root
//     package.json exists, its npm entrypoints (`sync:all`/`verify:all`/`codex:verify:all`) only
//     delegate to the in-`.claude` runner and never under-verify relative to it. These read
//     package.json by design, and are therefore GUARDED by `frameworkPkg()` — an adopting project has
//     its own package.json (or none), and asserting easy-claude's script names against it aborted the
//     sync pipeline at stage 4 of 16 in every adopting project, after stages 1-3 had already written
//     `.agents/`, `.codex/` and `AGENTS.md`. Runner-side assertions in this group stay UNCONDITIONAL.
//   • Guard integrity (PORT-011): the conditional self-checks above can pass by not running, so this
//     locks the guard to resolve true in this repo. Without it, a package rename silently disables the
//     whole npm-delegation group while the suite still reports green.
//
// Keep this taxonomy in step when adding a PORT id — an unlisted id is how a reader concludes a
// guarantee is unguarded when it is not (and vice versa).

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const runnerRel = '.claude/skills/sync-codex/scripts/run-codex-sync.mjs';
const runnerAbs = path.join(repoRoot, ...runnerRel.split('/'));

const readRel = async rel => fs.readFile(path.join(repoRoot, ...rel.split('/')), 'utf8');
const exists = async p => { try { await fs.access(p); return true; } catch { return false; } };

const createdDirs = [];
after(async () => {
    await Promise.all(createdDirs.map(d => fs.rm(d, { recursive: true, force: true }).catch(() => {})));
});

function run(cmd, args, opts = {}) {
    return new Promise(resolve => {
        const child = spawn(cmd, args, { ...opts });
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', d => { stdout += d; });
        child.stderr?.on('data', d => { stderr += d; });
        child.on('close', code => resolve({ code, stdout, stderr }));
        child.on('error', err => resolve({ code: -1, stdout, stderr: stderr + String(err) }));
    });
}

// The files the standalone runner spawns. This is the pipeline transitive closure that MUST run with
// zero npm-installed dependencies in a bare `.claude` copy.
//
// DERIVED from the runner source, not hand-listed. The previous hand-maintained roster had silently
// fallen FOUR verifiers behind (review-validate-coverage, sync-adoption-parity, provenance-markers,
// and the hooks-suite runner), so PORT-001 was no longer scanning them for node_modules imports and
// PORT-007 was no longer checking the export shipped them. That is precisely the enumeration-rot this
// file's own PORT-010 exists to kill — so the roster is now computed.
//
// The runner spawns codex scripts as `path.join(sourceScriptsDir, "<name>.mjs")` and the hook suites
// via a single `hooksRunner` constant; both shapes are matched below.
let pipelineFilesCache = null;
async function pipelineFiles() {
    if (pipelineFilesCache) return pipelineFilesCache;
    const src = await readRel(runnerRel);

    const codexScripts = [...src.matchAll(/sourceScriptsDir,\s*["']([\w.-]+\.mjs)["']/g)].map(m => m[1]);
    // Floor guard: if the shape above ever changes, the regex would match nothing and PORT-001/007
    // would vacuously pass over an empty set — a silent loss of the whole guarantee.
    assert.ok(codexScripts.length >= 8,
        `expected the runner to spawn >=8 codex scripts, matched ${codexScripts.length} — the extraction shape drifted`);

    const files = new Set([runnerRel, ...codexScripts.map(n => `.claude/scripts/codex/${n}`)]);
    for (const m of src.matchAll(/["'](hooks)["'],\s*["'](tests)["'],\s*["']([\w.-]+\.cjs)["']/g)) {
        files.add(`.claude/${m[1]}/${m[2]}/${m[3]}`);
    }

    pipelineFilesCache = [...files];
    return pipelineFilesCache;
}

// Core (built-in) module names, both `node:`-prefixed and the legacy unprefixed form. `.cjs` files use
// the unprefixed names (`require('fs')`, `require('path')`) which are still built-ins, NOT node_modules.
const BUILTINS = new Set(builtinModules);

// Returns bare (node_modules) module specifiers imported/required at the top level of `source`.
// Ignores Node built-ins (prefixed or not), relative (`.`/`..`) and absolute specifiers. Line comments
// are stripped so a specifier named inside a `//` comment (e.g. remediation prose) is never flagged.
function bareSpecifiers(source) {
    const found = new Set();
    for (const raw of source.split(/\r?\n/)) {
        const line = raw.replace(/\/\/.*$/, '');
        const specs = [];
        const staticImport = line.match(/^\s*import\b[^'"]*['"]([^'"]+)['"]/);
        if (staticImport) specs.push(staticImport[1]);
        for (const m of line.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
        for (const m of line.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
        for (const s of specs) {
            if (s.startsWith('node:') || s.startsWith('.') || s.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(s)) continue;
            if (BUILTINS.has(s) || BUILTINS.has(s.split('/')[0])) continue; // legacy unprefixed built-in
            found.add(s);
        }
    }
    return [...found];
}

// ── PORT-001 — zero node_modules dependency in the pipeline ──────────────────────────────────────
// The whole portability story rests on this: a bare `.claude` copy has no node_modules, so every
// script the runner spawns must import only `node:` built-ins + relative files.
test('PORT-001 sync/verify pipeline scripts import only node: built-ins and relative files', async () => {
    const offenders = [];
    const scanList = [...await pipelineFiles()];
    // Include the shared lib closure (the workflow-skills catalog builder the generators require).
    const libDir = path.join(repoRoot, '.claude', 'scripts', 'lib');
    if (await exists(libDir)) {
        for (const e of await fs.readdir(libDir)) {
            if (e.endsWith('.cjs') || e.endsWith('.mjs')) scanList.push(`.claude/scripts/lib/${e}`);
        }
    }
    for (const rel of scanList) {
        const bare = bareSpecifiers(await readRel(rel));
        if (bare.length) offenders.push(`${rel}: ${bare.join(', ')}`);
    }
    assert.deepEqual(offenders, [], `pipeline scripts must not depend on node_modules:\n${offenders.join('\n')}`);
});

// ── PORT-002 — npm-auto-install is a safe no-op without package.json ─────────────────────────────
test('PORT-002 npm-auto-install hook no-ops cleanly when no package.json is present', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'port-noinstall-'));
    createdDirs.push(dir);
    const hook = path.join(repoRoot, '.claude', 'hooks', 'npm-auto-install.cjs');
    const { code, stderr } = await run(process.execPath, [hook], {
        cwd: dir,
        env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    });
    assert.equal(code, 0, 'hook must exit 0 with no package.json');
    assert.doesNotMatch(stderr, /Running npm (ci|install)/, 'hook must NOT attempt an install when package.json is absent');
});

// ── PORT-003/004 — npm entrypoints delegate to the in-`.claude` runner, no embedded chain ────────
test('PORT-003 sync:all/verify:all reference the standalone runner, which exists on disk', async () => {
    // Runner presence is UNCONDITIONAL — it ships inside `.claude`, so it must exist everywhere.
    assert.ok(await exists(runnerAbs), 'the delegated runner script must exist at the documented path');

    const pkg = frameworkPkg(repoRoot);
    if (!pkg) return; // adopting project: the npm entrypoints are this repo's own surface
    for (const name of ['sync:all', 'verify:all']) {
        assert.match(pkg.scripts[name], /run-codex-sync\.mjs/, `${name} must invoke the standalone runner`);
    }
});

test('PORT-004 sync:all/verify:all contain no && chain (orchestration lives in .claude, not package.json)', async () => {
    const pkg = frameworkPkg(repoRoot);
    if (!pkg) return;
    for (const name of ['sync:all', 'verify:all']) {
        assert.ok(!pkg.scripts[name].includes('&&'), `${name} must delegate, not encode a chain in package.json`);
    }
});

// ── PORT-005 — the standalone runner is a SUPERSET of the npm verify set (no silent under-verify) ──
// Locks: every verifier the npm scripts run is also a runner stage, so a bare `.claude` copy can never
// pass the runner yet ship a drifted mirror.
test('PORT-005 runner stages cover the full npm verify set (completeness + parity)', async () => {
    const runnerSrc = await readRel(runnerRel);
    const stageIds = [...runnerSrc.matchAll(/\bid:\s*"([\w-]+)"/g)].map(m => m[1]);
    const required = ['migrate', 'hooks', 'context', 'tests', 'scripts-tests',
        'wf-cycle', 'sk-proto', 'residue', 'sdd', 'sync-divergence'];
    const missingStages = required.filter(id => !stageIds.includes(id));
    assert.deepEqual(missingStages, [], `runner is missing canonical stage id(s): ${missingStages.join(', ')}`);

    // Parity: every verifier script file referenced by a granular npm verify/test script must also be a
    // stage in the runner. Guards against a future npm-only verifier bypassing the standalone path.
    // npm-surface half — framework repo only.
    const pkg = frameworkPkg(repoRoot);
    if (!pkg) return;
    const verifierBasenames = new Set();
    for (const [key, val] of Object.entries(pkg.scripts)) {
        if (!/(verify|test:tooling)/.test(key)) continue;
        if (/^(sync:all|verify:all)$/.test(key)) continue; // these delegate to the runner itself
        for (const m of String(val).matchAll(/([\w-]+\.(?:mjs|cjs))/g)) {
            if (/^verify-/.test(m[1])) verifierBasenames.add(m[1]);
        }
    }
    const missingFromRunner = [...verifierBasenames].filter(b => !runnerSrc.includes(b));
    assert.deepEqual(missingFromRunner, [], `npm verifier(s) not covered by the standalone runner: ${missingFromRunner.join(', ')}`);
});

// ── PORT-008 — npm `verify:all --only` equals the runner's non-mutate (verify) stage set ──
// `verify:all` is an ALLOWLIST (`--only=<ids>`), the inverse risk of PORT-005: a verify stage
// added to the runner but NOT to that list is silently excluded from `npm run verify:all`,
// so the npm path under-verifies while the standalone runner does not. This locks the npm
// verify allowlist to the runner's read-only stage set in BOTH directions. The runner marks
// its mutating (sync) stages `mutate: true`; the verify set is everything else.
test('PORT-008 verify:all --only equals the runner non-mutate stage set (no silent npm under-verify)', async () => {
    const runnerSrc = await readRel(runnerRel);
    // Per-stage parse: stage objects contain no nested braces, so a brace-delimited slice is a
    // safe source-only parse for id + the presence of a `mutate: true` marker on that stage.
    const allIds = [];
    const mutateIds = new Set();
    for (const m of runnerSrc.matchAll(/\{[^{}]*\bid:\s*"([\w-]+)"[^{}]*\}/g)) {
        allIds.push(m[1]);
        if (/\bmutate:\s*true\b/.test(m[0])) mutateIds.add(m[1]);
    }
    assert.ok(mutateIds.size >= 1, 'runner must mark its mutating (sync) stages with mutate: true');
    const verifyIds = allIds.filter(id => !mutateIds.has(id)).sort();

    const pkg = frameworkPkg(repoRoot);
    if (!pkg) return; // npm under-verify is only representable where the npm surface exists
    const onlyMatch = String(pkg.scripts['verify:all']).match(/--only=([\w,-]+)/);
    assert.ok(onlyMatch, 'verify:all must pass an --only allowlist to the runner');
    const onlyIds = onlyMatch[1].split(',').map(s => s.trim()).filter(Boolean).sort();

    assert.deepEqual(onlyIds, verifyIds,
        `verify:all --only must equal the runner's non-mutate (verify) stage set.\n` +
        `  --only:               ${onlyIds.join(', ')}\n` +
        `  runner verify stages: ${verifyIds.join(', ')}`);
});

// ── PORT-010 — `codex:verify:all` must DELEGATE, never re-list stages ────────────────────────────
// The blind spot PORT-005/008 left open: they lock the runner and `verify:all` to each other, but
// `codex:verify:all` was a THIRD hand-maintained "verify everything" surface that nothing checked.
// It silently ran 8 of 9 verifiers (review-validate-coverage was missing, and no granular script for
// it even existed) while `codex:sync` and `codex:sync:copy-skills` both end in it — so three
// entrypoints reported green over an unexecuted gate. Delegation makes the drift unrepresentable
// instead of merely detectable; assertion 3 keeps the granular per-verifier surface complete too.
test('PORT-010 codex:verify:all delegates to the single canonical verify set (no third stage roster)', async () => {
    const pkg = frameworkPkg(repoRoot);
    if (!pkg) return; // the third roster can only exist in this repo's package.json
    const codexAll = String(pkg.scripts['codex:verify:all'] ?? '');
    assert.ok(codexAll, 'codex:verify:all must exist');

    // 1. No `&&` chain — a chain is a hand-maintained roster, which is exactly what drifted.
    assert.ok(!codexAll.includes('&&'),
        `codex:verify:all must not re-list stages in an && chain (it drifted one verifier behind that way).\n  got: ${codexAll}`);

    // 2. It must resolve to the canonical set: either `verify:all` or the runner itself.
    assert.match(codexAll, /(npm run verify:all|run-codex-sync\.mjs)/,
        `codex:verify:all must delegate to verify:all or the standalone runner.\n  got: ${codexAll}`);

    // 3. Every verifier the runner runs as a non-mutate stage must ALSO be reachable as a granular
    //    `codex:verify:*` script, so the per-verifier surface cannot fall behind the runner either.
    const runnerSrc = await readRel(runnerRel);
    const stageVerifiers = new Set();
    for (const m of runnerSrc.matchAll(/\{[^{}]*\bid:\s*"([\w-]+)"[^{}]*\}/g)) {
        if (/\bmutate:\s*true\b/.test(m[0])) continue;
        for (const v of m[0].matchAll(/"(verify-[\w-]+\.mjs)"/g)) stageVerifiers.add(v[1]);
    }
    assert.ok(stageVerifiers.size >= 1, 'runner must declare at least one verify-*.mjs stage');

    const granular = new Set();
    for (const [key, val] of Object.entries(pkg.scripts)) {
        if (!/^codex:verify:/.test(key) || key === 'codex:verify:all') continue;
        for (const m of String(val).matchAll(/(verify-[\w-]+\.mjs)/g)) granular.add(m[1]);
    }
    const unreachable = [...stageVerifiers].filter(v => !granular.has(v)).sort();
    assert.deepEqual(unreachable, [],
        `every non-mutate runner verifier needs a granular codex:verify:* script; missing: ${unreachable.join(', ')}`);
});

// ── PORT-006 — the runner self-locates the repo root and runs standalone from any cwd ────────────
// Proves cwd-independence (resolves repoRoot from import.meta.url, not process.cwd) by running a real
// read-only verifier from a temp cwd. --only=residue keeps it fast and avoids re-entering the test stage.
test('PORT-006 runner executes a read-only verifier standalone from a non-repo cwd', async () => {
    const elsewhere = await fs.mkdtemp(path.join(os.tmpdir(), 'port-cwd-'));
    createdDirs.push(elsewhere);
    const { code, stdout } = await run(process.execPath, [runnerAbs, '--only=residue'], { cwd: elsewhere });
    assert.equal(code, 0, 'runner must exit 0 running a verifier from an unrelated cwd');
    assert.match(stdout, /all 1 stage\(s\) passed/, 'runner must report the verifier stage passed');
});

// ── PORT-007 — export-claude ships a self-contained pipeline payload, no package.json ─────────────
// The canonical "copy .claude into a new project" tool. A bare export must contain the runner AND every
// script it spawns — and crucially NOT a package.json (the new project supplies its own, or none).
test('PORT-007 export-claude payload contains the full pipeline and no package.json', async () => {
    const target = await fs.mkdtemp(path.join(os.tmpdir(), 'port-export-'));
    createdDirs.push(target);
    const exporter = path.join(repoRoot, '.claude', 'scripts', 'export-claude.mjs');
    const { code, stdout, stderr } = await run(process.execPath, [exporter, target], { cwd: repoRoot });
    assert.equal(code, 0, `export-claude must succeed: ${stderr || stdout}`);

    assert.ok(await exists(path.join(target, ...runnerRel.split('/'))), 'exported payload must include the standalone runner');
    for (const rel of await pipelineFiles()) {
        assert.ok(await exists(path.join(target, ...rel.split('/'))), `exported payload missing pipeline script: ${rel}`);
    }
    assert.ok(!(await exists(path.join(target, 'package.json'))), 'export must copy only .claude — no root package.json');
});

// ── PORT-011 — the framework-repo guard must resolve TRUE here (anti-silent-skip lock) ────────────
// PORT-003/004/005/008/010 (and TC-MWG-001/002/003, the adoption-parity npm half, TC-PROV-011b) are
// now conditional on `frameworkPkg()`, because an adopting project supplies its own package.json and
// an unconditional read aborted the pipeline at stage 4 of 16 in EVERY adopting project.
//
// The cost of a conditional self-check is that it can pass by not running. If this repo's package
// `name` is ever changed, all of those tests would skip and the suite would still report green — the
// silent-false-confidence failure mode. This test is the tripwire: it fails loudly on a rename, so the
// guard can only ever be disabled deliberately.
// The identity check must NOT key on the package name it is verifying — that would be circular. It
// keys on an INDEPENDENT signal instead: a package.json whose scripts invoke the standalone runner is
// a framework-tooling package, and such a package must carry the name the guard expects. A bare
// `.claude` copy has no package.json, and an adopting project's own package.json does not wire the
// runner, so both skip without a false alarm.
//
// The expected name is now RESOLVED (project config → upstream default), not a constant, so the
// remedy this test names is "declare your package name in the project config", not "edit a portable
// framework file". A vendoring project that renames its tooling package is the normal case; before
// the name was configurable it was indistinguishable from a rename accident, and the whole guarded
// set skipped there.
test('PORT-011 the framework-repo guard resolves true in this repo (conditional self-checks really run)', async () => {
    let raw;
    try {
        raw = await readRel('package.json');
    } catch {
        return; // bare `.claude` copy: no npm surface, so nothing to self-check
    }
    const pkg = JSON.parse(raw);
    const wiresRunner = Object.values(pkg.scripts ?? {}).some(v => String(v).includes('run-codex-sync.mjs'));
    if (!wiresRunner) return; // adopting project keeping its own npm surface

    const expected = frameworkPackageName(repoRoot);
    assert.equal(pkg.name, expected,
        `this package.json wires the standalone runner, so it IS a framework-tooling package, but the ` +
        `guard expects the name "${expected}" and package.json says "${pkg.name}". Every guarded ` +
        `self-check (PORT-003/004/005/008/010, TC-MWG-001/002/003, TC-PROV-011b, adoption-parity npm ` +
        `half) is therefore SKIPPING. Fix by setting portability.toolingPackageName to "${pkg.name}" in ` +
        `the project config (docs/project-config.json by default) — or, in the upstream framework repo, ` +
        `restore the package name to "${DEFAULT_FRAMEWORK_PACKAGE_NAME}".`);
    assert.equal(isFrameworkRepo(repoRoot), true, 'isFrameworkRepo must be true when running inside this repo');
});

// ── PORT-012 — the expected tooling package name is project data, not a hard-coded constant ──────
//
// Regression for the failure mode PORT-011 could only report, never fix: a project that VENDORS this
// framework and wires the runner into its own npm scripts names that package after ITSELF. With the
// expected name hard-coded, `frameworkPkg()` resolved null there, so every guarded self-check skipped
// while the suite still reported green — the framework's own guards silently off in the one place its
// source was being edited. The remedy has to live in project config, because a portable file cannot
// know the adopting project's package name.
//
// Covers all three arms so a future "simplification" back to a constant fails here: config wins,
// absent/blank config falls back to the upstream default, and the fallback is what the framework repo
// itself relies on (it ships no such config key).
test('PORT-012 tooling package name resolves from project config, falling back to the upstream default', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'port-pkgname-'));
    after(() => fs.rm(tmp, { recursive: true, force: true }));
    const writeConfig = async portability => {
        await fs.mkdir(path.join(tmp, 'docs'), { recursive: true });
        await fs.writeFile(path.join(tmp, 'docs', 'project-config.json'), JSON.stringify({ portability }));
    };

    // 1. No config at all → upstream default (a bare `.claude` copy must still resolve something).
    assert.equal(frameworkPackageName(tmp), DEFAULT_FRAMEWORK_PACKAGE_NAME);

    // 2. Config declares a name → that name wins.
    await writeConfig({ toolingPackageName: 'adopting-project-tooling' });
    assert.equal(frameworkPackageName(tmp), 'adopting-project-tooling');

    // 3. Blank/whitespace is treated as undeclared, not as an empty package name — an empty string
    //    would match no package.json and silently re-disable every guarded self-check.
    await writeConfig({ toolingPackageName: '   ' });
    assert.equal(frameworkPackageName(tmp), DEFAULT_FRAMEWORK_PACKAGE_NAME);

    // 4. End-to-end through the guard itself: a package.json matching the CONFIGURED name must make
    //    the repo read as a framework repo. This is the arm that was broken.
    await writeConfig({ toolingPackageName: 'adopting-project-tooling' });
    await fs.writeFile(path.join(tmp, 'package.json'), JSON.stringify({ name: 'adopting-project-tooling' }));
    assert.equal(isFrameworkRepo(tmp), true, 'a package.json matching the configured name must satisfy the guard');
    assert.equal(frameworkPkg(tmp)?.name, 'adopting-project-tooling');

    // 5. A non-matching package.json still resolves null — the guard must not become vacuous.
    await fs.writeFile(path.join(tmp, 'package.json'), JSON.stringify({ name: 'some-unrelated-app' }));
    assert.equal(isFrameworkRepo(tmp), false, 'an unrelated package.json must NOT satisfy the guard');
});

// ── PORT-009 — runner fails fast (exit 1) on an unknown --only/--skip stage id ────────────────────
// validateStageSelectors() (run-codex-sync.mjs) must reject a mistyped selector id rather than
// silently dropping it: shouldRun() treats an unknown id as "not a member", so `verify:all
// --only=<ids>` with ONE fat-fingered id would skip a verifier and still exit green — defeating the
// "runner never verifies LESS than npm" guarantee PORT-005/008 lock. This is the regression test for
// that fail-fast (the guard had none; manually verified only).
test('PORT-009 runner exits 1 and names the bad id on an unknown --only stage id', async () => {
    const { code, stderr } = await run(process.execPath, [runnerAbs, '--only=residue,bogusXYZ'], { cwd: repoRoot });
    assert.equal(code, 1, 'runner must exit 1 when an --only id is not a known stage');
    assert.match(stderr, /unknown stage id/i, 'stderr must name the unknown stage id, not silently drop it');
});
