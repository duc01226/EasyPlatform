import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';
import { DEFAULT_FRAMEWORK_PACKAGE_NAME, frameworkPackageName, frameworkPkg, isFrameworkRepo } from './framework-repo.helper.mjs';
// DERIVED from the generator that produces the projection PORT-013 measures — never a literal, so
// the bound tracks the live budget instead of silently going loose when it moves.
import { AGENTS_ROOT_LIMIT_BYTES } from '../sync-context-workflows.mjs';

// Portability contract: copying ONLY `.claude/` into a new project that has NO root package.json
// must still run the full sync+verify pipeline. The framework's script execution is self-contained in
// `.claude` (the standalone runner `run-codex-sync.mjs`); the npm scripts merely delegate to it. These
// tests are the regression matrix for "everything works from a bare `.claude` copy" — they fail loudly
// if a node_modules dependency creeps into the pipeline, if the npm entrypoints stop delegating, if the
// runner drifts behind the npm verify set, or if the export payload loses a pipeline script.
//
// This file holds TWO related portability-contract groups — the filename names the headline guarantee,
// not the only one, so do NOT split or rename it:
//   • No-package-json group (PORT-001/002/006/007/009/015): pure bare-`.claude` behavior — the pipeline
//     imports only `node:` built-ins, startup installation no-ops, the runner self-locates + fails fast,
//     and the export payload ships NO root package.json. None of these read a package.json.
//   • npm-delegation group (PORT-003/004/005/008/010): the inverse guarantee — WHEN THIS REPO'S root
//     package.json exists, its npm entrypoints (`sync:all`/`verify:all`/`codex:verify:all`) only
//     delegate to the in-`.claude` runner and never under-verify relative to it. These read
//     package.json by design, and are therefore GUARDED by `frameworkPkg()` — an adopting project has
//     its own package.json (or none), and asserting easy-claude's script names against it aborted the
//     sync pipeline at stage 5 of 19 in every adopting project, after stages 1-4 had already written
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
const readJsonOrNull = file => { try { return JSON.parse(fsSync.readFileSync(file, 'utf8')); } catch { return null; } };

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
// The runner spawns codex scripts as `path.join(sourceScriptsDir, "<name>.mjs")`, portable skill
// scripts as `path.join(rootDir, ".claude", ...)`, and hook suites via `hooksRunner`; all shapes are
// matched below so a newly wired source-owned gate cannot escape the portability closure.
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
    for (const match of src.matchAll(/path\.join\(rootDir,\s*((?:["'][^"']+["']\s*,\s*)*["'][^"']+["'])\)/g)) {
        const segments = [...match[1].matchAll(/["']([^"']+)["']/g)].map(part => part[1]);
        const rel = segments.join('/');
        if (/\.(?:cjs|mjs|js)$/.test(rel)) files.add(rel);
    }
    for (const m of src.matchAll(/["'](hooks)["'],\s*["'](tests)["'],\s*["']([\w.-]+\.cjs)["']/g)) {
        files.add(`.claude/${m[1]}/${m[2]}/${m[3]}`);
    }

    // These directories are expanded dynamically by the runner. Include every executable module,
    // including nested support files, so a helper cannot import an adopter-local dependency while
    // the runner and export checks continue to inspect only the current hand-written roster.
    async function addJavaScriptTree(relativeDir) {
        const absoluteDir = path.join(repoRoot, ...relativeDir.split('/'));
        for (const entry of await fs.readdir(absoluteDir, { withFileTypes: true }).catch(() => [])) {
            const child = `${relativeDir}/${entry.name}`;
            if (entry.isDirectory()) await addJavaScriptTree(child);
            else if (entry.isFile() && /\.(?:mjs|cjs|js)$/.test(entry.name)) files.add(child);
        }
    }
    for (const relativeDir of [
        '.claude/scripts/codex/tests',
        '.claude/scripts/tests',
        '.claude/scripts/lib',
        '.claude/hooks',
    ]) {
        await addJavaScriptTree(relativeDir);
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
function bareSpecifiers(source, relativeFile = '') {
    const found = new Set();
    // Fixture programs live in template literals. Mask their bodies before the line scanner so
    // an adopter-side `import 'yaml'` remains test data while every executed wrapper is still
    // inspected. Escaped backticks remain inside the literal; interpolation expressions are
    // intentionally masked too because they belong to the fixture string, not the wrapper module.
    let state = 'code';
    let escaped = false;
    const templateExpressionDepth = [];
    const syntaxSpecifiers = [];
    let scanSource = '';
    for (let index = 0; index < source.length; index += 1) {
        const char = source[index];
        const next = source[index + 1];
        if (state === 'code' && !/[\w$]/.test(source[index - 1] ?? '')) {
            const tail = source.slice(index);
            const call = tail.match(/^(?:require|import)\s*\(\s*['"]([^'"]+)['"]\s*\)/);
            const staticFrom = tail.match(/^(?:import|export)\b(?:(?!;)[\s\S]){0,500}?\bfrom\s*['"]([^'"]+)['"]/);
            const sideEffect = tail.match(/^import\s+['"]([^'"]+)['"]/);
            const match = call ?? staticFrom ?? sideEffect;
            if (match) {
                syntaxSpecifiers.push({
                    specifier: match[1],
                    lineIndex: source.slice(0, index).split(/\r?\n/).length - 1,
                });
            }
        }
        if (state === 'template') {
            scanSource += char === '\n' || char === '\r' ? char : ' ';
            if (escaped) { escaped = false; continue; }
            if (char === '\\') { escaped = true; continue; }
            if (char === '$' && next === '{') {
                scanSource += ' ';
                index += 1;
                templateExpressionDepth.push(1);
                state = 'code';
                continue;
            }
            if (char === '`') state = 'code';
            continue;
        }
        if (state === 'line-comment') {
            scanSource += char === '\n' || char === '\r' ? char : ' ';
            if (char === '\n') state = 'code';
            continue;
        }
        if (state === 'block-comment') {
            scanSource += char === '\n' || char === '\r' ? char : ' ';
            if (char === '*' && next === '/') { scanSource += ' '; index += 1; state = 'code'; }
            continue;
        }
        if (state === 'single' || state === 'double') {
            scanSource += char;
            if (escaped) { escaped = false; continue; }
            if (char === '\\') { escaped = true; continue; }
            if ((state === 'single' && char === "'") || (state === 'double' && char === '"')) state = 'code';
            continue;
        }
        if (char === '/' && next === '/') { scanSource += '  '; index += 1; state = 'line-comment'; continue; }
        if (char === '/' && next === '*') { scanSource += '  '; index += 1; state = 'block-comment'; continue; }
        if (templateExpressionDepth.length > 0 && char === '{') {
            templateExpressionDepth[templateExpressionDepth.length - 1] += 1;
            scanSource += char;
            continue;
        }
        if (templateExpressionDepth.length > 0 && char === '}') {
            const last = templateExpressionDepth.length - 1;
            templateExpressionDepth[last] -= 1;
            if (templateExpressionDepth[last] === 0) {
                templateExpressionDepth.pop();
                state = 'template';
                scanSource += ' ';
                continue;
            }
        }
        if (char === "'") { state = 'single'; scanSource += char; continue; }
        if (char === '"') { state = 'double'; scanSource += char; continue; }
        if (char === '`') { state = 'template'; scanSource += ' '; continue; }
        scanSource += char;
    }
    const sourceLines = source.split(/\r?\n/);
    const optionalAdopterLine = [
        'const document = req',
        'uire("yaml").parseDocument(yamlSource); // portability:optional-adopter-dependency',
    ].join('');
    const isAllowedOptionalLoad = (specifier, lineIndex) =>
        relativeFile === '.claude/scripts/codex/tests/spec-carrier-reader-yaml-normalization.test.mjs'
        && specifier === 'yaml'
        && sourceLines[lineIndex]?.trim() === optionalAdopterLine;
    const addIfBare = (specifier, lineIndex) => {
        if (specifier.startsWith('node:') || specifier.startsWith('.') || specifier.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(specifier)) return;
        if (BUILTINS.has(specifier) || BUILTINS.has(specifier.split('/')[0])) return;
        if (isAllowedOptionalLoad(specifier, lineIndex)) return;
        found.add(specifier);
    };
    const maskedLines = scanSource.split(/\r?\n/);
    for (const [lineIndex, line] of maskedLines.entries()) {
        const specs = [];
        const staticImport = line.match(/^\s*import\b[^'"]*['"]([^'"]+)['"]/);
        if (staticImport) specs.push(staticImport[1]);
        for (const m of line.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
        for (const m of line.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
        for (const specifier of specs) addIfBare(specifier, lineIndex);
    }
    // Executable imports may span lines, occur in template interpolation, or re-export bindings.
    // They are collected only while the state machine is in executable code, keeping fixture strings
    // and template bodies out of the result without hiding `${...}` expressions.
    for (const { specifier, lineIndex } of syntaxSpecifiers) addIfBare(specifier, lineIndex);
    return [...found];
}

// ── PORT-001 — zero node_modules dependency in the pipeline ──────────────────────────────────────
// The whole portability story rests on this: a bare `.claude` copy has no node_modules, so every
// script the runner spawns must import only `node:` built-ins + relative files.
async function assertPortableDependencies(read = readRel) {
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
        const bare = bareSpecifiers(await read(rel), rel);
        if (bare.length) offenders.push(`${rel}: ${bare.join(', ')}`);
    }
    assert.deepEqual(offenders, [], `pipeline scripts must not depend on node_modules:\n${offenders.join('\n')}`);
}

// ── PORT-002 — startup installation is a safe no-op without package.json ─────────────────────────
// This guarantee previously had a second startup owner. The owner is now
// `startup-install.cjs`, reached from the single registered SessionStart hook, which decides whether
// a package manager may run. `configStatus: { exists: false }` is the load-bearing part of the setup,
// not boilerplate — `docs/project-config.json` is exactly what a fresh `.claude` copy does not have
// yet, so this is the absent-config path. A regression that made that path default to "install"
// would fail here rather than shelling out in someone's Python or .NET repo.
test('PORT-002 the startup-install owner no-ops cleanly when no package.json is present', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'port-noinstall-'));
    createdDirs.push(dir);
    const owner = path.join(repoRoot, '.claude', 'hooks', 'lib', 'startup-install.cjs');
    const program = `
        const owner = require(${JSON.stringify(owner)});
        const result = owner.buildInstallRequest({
            projectRoot: process.cwd(),
            source: 'startup',
            configStatus: { exists: false }
        });
        process.stdout.write(JSON.stringify({
            outcome: result.outcome,
            manager: result.manager ?? null,
            request: result.request ?? null,
            diagnostic: owner.formatDiagnostic(result)
        }));
    `;
    const { code, stdout, stderr } = await run(process.execPath, ['-e', program], {
        cwd: dir,
        env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    });
    assert.equal(code, 0, `owner must load and decide with no package.json present:\n${stderr}`);
    const result = JSON.parse(stdout);
    assert.equal(result.outcome, 'noop-no-manifest', 'a project with no root manifest is a clean no-op');
    assert.equal(result.manager, null, 'no manager may be selected without a root manifest');
    assert.equal(result.request, null, 'no install request may be built without a root manifest');
    assert.equal(result.diagnostic, null, 'a bare copy must stay silent — a no-op is not worth a warning');
});

// ── PORT-003/004 — every entrypoint is an in-bundle path; NO host npm script may own one ─────────
// The contract inverted: the npm scripts used to be permitted as thin delegating aliases. They are
// now FORBIDDEN outright. A delegating alias is still a second documented interface, and prose that
// teaches `npm run …` teaches a command that does not exist in a Python repo, a .NET repo, or any
// project that copied only `.claude` — the exact confusion this contract removes.
test('PORT-003 the standalone runner exists at the documented in-bundle path', async () => {
    // UNCONDITIONAL — it ships inside `.claude`, so it must exist in every adopting project.
    assert.ok(await exists(runnerAbs), `the runner must exist at ${runnerRel}`);
});

test('PORT-004 no package.json script drives the .claude/.codex framework', async () => {
    const pkg = frameworkPkg(repoRoot);
    if (!pkg) return; // adopting project: its package.json scripts are its own business
    const offenders = Object.entries(pkg.scripts ?? {})
        .filter(([, command]) => /\.claude[\\/]|\.codex[\\/]|run-codex-sync|generate-tech-specs|generate_catalogs/.test(String(command)))
        .map(([name, command]) => `${name}: ${command}`);
    assert.deepEqual(offenders, [],
        'the framework is self-running: every entrypoint is a path inside .claude, never a host npm script.\n' +
        `  offending script(s):\n    ${offenders.join('\n    ')}`);
});

// ── PORT-005 — every verifier that exists on disk is wired into the runner ──────────────────────
// The original parity partner was the npm verify set; with that surface gone, the only remaining way
// a verifier can be written and never executed is to ship the file without a stage. That is now the
// assertion: the FILESYSTEM is the roster, so the check is stronger than the npm one it replaces
// (the npm set could itself have omitted a verifier — and PORT-010's history shows it did).
test('PORT-005 runner stages cover every verifier on disk (no unwired gate)', async () => {
    const runnerSrc = await readRel(runnerRel);
    const stageIds = [...runnerSrc.matchAll(/\bid:\s*"([\w-]+)"/g)].map(m => m[1]);
    const required = ['migrate', 'hooks', 'context', 'tests', 'scripts-tests',
        'wf-cycle', 'sk-proto', 'residue', 'sdd', 'sync-divergence'];
    const missingStages = required.filter(id => !stageIds.includes(id));
    assert.deepEqual(missingStages, [], `runner is missing canonical stage id(s): ${missingStages.join(', ')}`);

    const codexDir = path.join(repoRoot, '.claude', 'scripts', 'codex');
    const onDisk = (await fs.readdir(codexDir)).filter(name => /^verify-[\w-]+\.mjs$/.test(name));
    assert.ok(onDisk.length >= 8, `expected >=8 verifier files on disk, found ${onDisk.length}`);
    // `verify-configurable-root-literals.mjs` is an authoring-time literal sweep, not a build gate —
    // it is deliberately not a stage, and is named here so its absence is a decision, not an omission.
    const notAStage = new Set(['verify-configurable-root-literals.mjs']);
    const unwired = onDisk.filter(name => !notAStage.has(name) && !runnerSrc.includes(name)).sort();
    assert.deepEqual(unwired, [],
        `verifier(s) exist on disk but no runner stage executes them: ${unwired.join(', ')}`);
});

// ── PORT-008 — `--verify-only` IS the canonical read-only set, derived not transcribed ──────────
// The drift this replaces: `verify:all` carried the read-only roster as a hand-copied `--only=<15
// ids>` string in package.json. A verify stage added to the runner but not to that string was
// silently excluded, so the npm path under-verified while the runner did not — and an adopter with
// no package.json had no way to reproduce "run every gate" at all.
//
// `--verify-only` derives the set from each stage's own `mutate` marker, making the drift
// UNREPRESENTABLE rather than merely detectable. This runs the real runner (not a source parse), so
// it grades the executed selection, which is what a transcribed list could never guarantee.
test('PORT-008 --verify-only selects exactly the runner non-mutate stage set', async () => {
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

    // `--list-stages` is the reader-facing roster; it must classify exactly the same way, or the
    // command the docs tell an adopter to run misreports what `--verify-only` will do.
    const listed = await run(process.execPath, [runnerAbs, '--list-stages'], { cwd: repoRoot });
    assert.equal(listed.code, 0, `--list-stages must exit 0: ${listed.stderr}`);
    const listedVerifyIds = [...listed.stdout.matchAll(/^\s*\d+\.\s+([\w-]+)\s+verify\b/gm)].map(m => m[1]).sort();
    assert.deepEqual(listedVerifyIds, verifyIds,
        `--list-stages must classify the same verify set the mutate markers declare.\n` +
        `  --list-stages: ${listedVerifyIds.join(', ')}\n` +
        `  mutate-marker: ${verifyIds.join(', ')}`);

    // And the SELECTION itself: `--verify-only` combined with an `--only` of a mutating stage must
    // select nothing, proving the filter really excludes mutators rather than merely labelling them.
    const mutatingOnly = await run(process.execPath, [runnerAbs, '--verify-only', `--only=${[...mutateIds][0]}`], { cwd: repoRoot });
    assert.equal(mutatingOnly.code, 1, '--verify-only must exclude a mutating stage even when --only names it');
    assert.match(mutatingOnly.stderr, /no stages selected/);
});

// ── PORT-010 — exactly ONE "verify everything" roster exists, and it is the runner ───────────────
// History: `codex:verify:all` was a THIRD hand-maintained roster beside the runner and `verify:all`.
// It silently ran 8 of 9 verifiers while `codex:sync` and `codex:sync:copy-skills` both ended in it,
// so three entrypoints reported green over an unexecuted gate. Deleting the npm surface removes two
// of the three rosters outright; this test keeps the remaining invariant enforceable — every
// non-mutate verifier is reachable individually AND collectively from inside the bundle, with no
// second list anywhere. Granular reachability is now the file path itself, which cannot fall behind.
test('PORT-010 each runner verifier is individually runnable from its in-bundle path', async () => {
    const runnerSrc = await readRel(runnerRel);
    const stageVerifiers = new Set();
    for (const m of runnerSrc.matchAll(/\{[^{}]*\bid:\s*"([\w-]+)"[^{}]*\}/g)) {
        if (/\bmutate:\s*true\b/.test(m[0])) continue;
        for (const v of m[0].matchAll(/"(verify-[\w-]+\.mjs)"/g)) stageVerifiers.add(v[1]);
    }
    assert.ok(stageVerifiers.size >= 1, 'runner must declare at least one verify-*.mjs stage');

    // Each verifier must exist at the path the runner spawns, so `node .claude/scripts/codex/<name>`
    // is always a valid standalone invocation — the replacement for the granular npm scripts.
    const missing = [];
    for (const name of stageVerifiers) {
        if (!(await exists(path.join(repoRoot, '.claude', 'scripts', 'codex', name)))) missing.push(name);
    }
    assert.deepEqual(missing.sort(), [], `runner spawns verifier(s) that do not exist on disk: ${missing.join(', ')}`);

    // And no second roster may reappear: `--verify-only` is derived, so any hard-coded comma list of
    // stage ids inside the runner (other than a doc comment) would be a transcription waiting to drift.
    assert.doesNotMatch(runnerSrc, /--only=tests,scripts-tests/,
        'the read-only roster must stay derived from mutate markers, never re-transcribed as an --only list');
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
// Its nested ignore file must also protect the developer-local routing override in the new repo.
test('PORT-007 export-claude payload contains the full pipeline and no package.json', { skip: !isFrameworkRepo(repoRoot) }, async () => {
    const target = await fs.mkdtemp(path.join(os.tmpdir(), 'port-export-'));
    createdDirs.push(target);
    const exporter = path.join(repoRoot, '.claude', 'scripts', 'export-claude.mjs');
    const { code, stdout, stderr } = await run(process.execPath, [exporter, target, '--include-untracked'], { cwd: repoRoot });
    assert.equal(code, 0, `export-claude must succeed: ${stderr || stdout}`);

    assert.ok(await exists(path.join(target, ...runnerRel.split('/'))), 'exported payload must include the standalone runner');
    for (const rel of await pipelineFiles()) {
        assert.ok(await exists(path.join(target, ...rel.split('/'))), `exported payload missing pipeline script: ${rel}`);
    }
    assert.ok(!(await exists(path.join(target, 'package.json'))), 'export must copy only .claude — no root package.json');

    const defaultTarget = await fs.mkdtemp(path.join(os.tmpdir(), 'port-export-default-'));
    createdDirs.push(defaultTarget);
    const defaultExport = await run(process.execPath, [exporter, defaultTarget], { cwd: repoRoot });
    assert.equal(defaultExport.code, 0, `default export-claude must succeed: ${defaultExport.stderr || defaultExport.stdout}`);

    const portableIgnore = path.join(defaultTarget, '.claude', '.gitignore');
    assert.ok(await exists(portableIgnore), 'exported payload must include the nested portable .gitignore');
    assert.match(await fs.readFile(portableIgnore, 'utf8'), /^\/\.ck\.local\.json\s*$/m,
        'portable .gitignore must explicitly protect the developer-local routing override');
    assert.match(await fs.readFile(portableIgnore, 'utf8'), /^\/worktrees\/\s*$/m,
        'portable framework exports must exclude developer-local repository checkouts');

    const initialized = await run('git', ['init', '--quiet'], { cwd: defaultTarget });
    assert.equal(initialized.code, 0, `fresh target Git initialization must succeed: ${initialized.stderr}`);
    await fs.writeFile(path.join(defaultTarget, '.claude', '.ck.local.json'),
        '{"portability":{"workflowAutoDetect":true}}\n', 'utf8');
    const ignored = await run('git', ['check-ignore', '-v', '--', '.claude/.ck.local.json'], { cwd: defaultTarget });
    assert.equal(ignored.code, 0, 'copied .ck.local.json must be ignored in a fresh target repository');
    assert.match(ignored.stdout.replaceAll('\\', '/'), /\.claude\/\.gitignore:\d+:\/\.ck\.local\.json/,
        'the copied nested .gitignore must own the ignore decision');
    const ignoredWorktree = await run('git', ['check-ignore', '-v', '--', '.claude/worktrees/local-checkout/README.md'], { cwd: defaultTarget });
    assert.equal(ignoredWorktree.code, 0, 'a local checkout must be ignored in a fresh target repository');
    assert.match(ignoredWorktree.stdout.replaceAll('\\', '/'), /\.claude\/\.gitignore:\d+:\/worktrees\//,
        'the portable ignore owner must exclude local worktrees without a project-specific root rule');
    // Sub-agent memory holds notes about one checkout; committed, it would ship to every adopter.
    for (const dir of ['agent-memory', 'agent-memory-local']) {
        const ignoredMemory = await run('git', ['check-ignore', '-v', '--', `.claude/${dir}/docs-manager/MEMORY.md`], { cwd: defaultTarget });
        assert.equal(ignoredMemory.code, 0, `agent memory under .claude/${dir}/ must be ignored in a fresh target repository`);
        assert.match(ignoredMemory.stdout.replaceAll('\\', '/'), new RegExp(`\\.claude/\\.gitignore:\\d+:/${dir}/`),
            'the portable ignore owner must exclude agent memory without a project-specific root rule');
    }
});

// ── PORT-015 — the copied runner owns CLAUDE.md preflight before mirror sync ─────────
// This is the end-to-end regression for the adoption case: copy only `.claude` into a project with
// no package.json, let the in-bundle runner resolve that project from its own path, and verify the
// preflight's three safe states. The test deliberately selects only `claude-md`, so a failure names
// the source-root handoff rather than a later mirror prerequisite.
test('PORT-015 copied runner initializes missing CLAUDE.md and leaves markerless project-owned roots untouched', { skip: !isFrameworkRepo(repoRoot) }, async () => {
    // Given a copied .claude bundle and a consuming project with no root package.json
    const target = await fs.mkdtemp(path.join(os.tmpdir(), 'port-preflight-'));
    createdDirs.push(target);
    const exporter = path.join(repoRoot, '.claude', 'scripts', 'export-claude.mjs');
    const exported = await run(process.execPath, [exporter, target, '--include-untracked'], { cwd: repoRoot });
    assert.equal(exported.code, 0, `export-claude must succeed: ${exported.stderr || exported.stdout}`);
    await fs.mkdir(path.join(target, 'docs'), { recursive: true });
    await fs.writeFile(
        path.join(target, 'docs', 'project-config.json'),
        JSON.stringify({ project: { name: 'Portable preflight' } }) + '\n',
        'utf8'
    );
    await fs.mkdir(path.join(target, 'nested', 'work'), { recursive: true });
    const runner = path.join(target, ...runnerRel.split('/'));

    // When the runner preflights a missing root from a nested cwd, Then it initializes CLAUDE.md
    const init = await run(process.execPath, [runner, '--only=claude-md'], {
        cwd: path.join(target, 'nested', 'work'),
        env: { ...process.env, CLAUDE_PROJECT_DIR: repoRoot },
    });
    assert.equal(init.code, 0, `missing-root preflight must initialize successfully: ${init.stderr || init.stdout}`);
    assert.match(init.stdout, /CLAUDE\.md missing.*init required/i);
    assert.match(init.stdout, /all 1 stage\(s\) passed/i);
    const initialized = await fs.readFile(path.join(target, 'CLAUDE.md'), 'utf8');
    // A generated root carries project information only: no universal-guide sentinel, no protocol text
    assert.match(initialized, /<!-- SECTION:/);
    assert.doesNotMatch(initialized, /CK:UNIVERSAL-GUIDES|CK:CRITICAL-THINKING|CK:AI-MISTAKE-PREVENTION|CK:WORKFLOW-ROUTE-POINTER/);

    // Given a project-owned markerless root, When the preflight runs,
    // Then it continues without overwriting the root or creating a backup: nothing is generated into it.
    const markerless = '# Project-owned instructions\n\nKeep this exact text.\n';
    await fs.writeFile(path.join(target, 'CLAUDE.md'), markerless, 'utf8');
    const kept = await run(process.execPath, [runner, '--only=claude-md'], {
        cwd: path.join(target, 'nested', 'work'),
        env: { ...process.env, CLAUDE_PROJECT_DIR: repoRoot },
    });
    assert.equal(kept.code, 0, `a markerless root is project-owned and must not stop the pipeline: ${kept.stderr || kept.stdout}`);
    assert.match(kept.stdout, /markerless/i);
    assert.equal(await fs.readFile(path.join(target, 'CLAUDE.md'), 'utf8'), markerless);
    assert.equal(await exists(path.join(target, '.claude-md.backup')), false, 'a markerless preflight must not create a backup');
});

test('PORT-001 sync/verify pipeline scripts import only node: built-ins and relative files', async () => {
    await assertPortableDependencies();
});

test('PORT-001 scans real imports in fixture-heavy executed modules', async () => {
    const victim = '.claude/scripts/codex/tests/spec-carrier-reader-yaml.test.mjs';
    await assert.rejects(assertPortableDependencies(async rel => {
        const source = await readRel(rel);
        return rel === victim
            ? `import 'synthetic-wrapper-dependency'; // portability:optional-adopter-dependency\n${source}`
            : source;
    }), /synthetic-wrapper-dependency/);
});

test('PORT-001 scans nested support modules in the executable test closure', async () => {
    const victim = '.claude/scripts/codex/tests/support/spec-carrier-test-support.mjs';
    assert.ok((await pipelineFiles()).includes(victim), 'nested support helper must be in the portability closure');
    await assert.rejects(assertPortableDependencies(async rel => {
        const source = await readRel(rel);
        return rel === victim ? `import 'synthetic-transitive-dependency';\n${source}` : source;
    }), /synthetic-transitive-dependency/);
});

test('PORT-001 detects multiline imports and re-exports', async () => {
    const victim = '.claude/scripts/codex/tests/support/spec-carrier-test-support.mjs';
    const multilineDependency = ['synthetic', 'multiline-dependency'].join('-');
    const reexportDependency = ['synthetic', 'reexport-dependency'].join('-');
    await assert.rejects(assertPortableDependencies(async rel => {
        const source = await readRel(rel);
        if (rel !== victim) return source;
        const importFixture = ['im', 'port {\n  synthetic\n} fr', `om '${multilineDependency}';`].join('');
        const reexportFixture = ['ex', 'port { synthetic } fr', `om '${reexportDependency}';`].join('');
        return [importFixture, reexportFixture, source].join('\n');
    }), error => {
        assert.match(error.message, new RegExp(multilineDependency));
        assert.match(error.message, new RegExp(reexportDependency));
        return true;
    });
});

test('PORT-001 scans executable template interpolation, multiline calls, and split side-effect imports', async () => {
    const victim = '.claude/scripts/codex/tests/support/spec-carrier-test-support.mjs';
    const interpolationDependency = ['synthetic', 'interpolation-dependency'].join('-');
    const requireDependency = ['synthetic', 'multiline-require'].join('-');
    const sideEffectDependency = ['synthetic', 'side-effect'].join('-');
    await assert.rejects(assertPortableDependencies(async rel => {
        const source = await readRel(rel);
        if (rel !== victim) return source;
        const interpolation = ['const value = `prefix ${await im', `port('${interpolationDependency}')}`, '`;'].join('');
        const multilineRequire = ['const helper = req', `uire(\n  '${requireDependency}'\n);`].join('');
        const sideEffectImport = ['im', `port\n  '${sideEffectDependency}';`].join('');
        return [interpolation, multilineRequire, sideEffectImport, source].join('\n');
    }), error => {
        assert.match(error.message, new RegExp(interpolationDependency));
        assert.match(error.message, new RegExp(requireDependency));
        assert.match(error.message, new RegExp(sideEffectDependency));
        return true;
    });
});

test('PORT-001 scans the hook runner closure and rejects allowlisted packages outside the exact optional load', async () => {
    const victim = '.claude/hooks/tests/run-all-tests.cjs';
    assert.ok((await pipelineFiles()).includes(victim), 'hook runner must be in the portability closure');
    await assert.rejects(assertPortableDependencies(async rel => {
        const source = await readRel(rel);
        const disallowed = ['req', "uire('yaml'); // portability:optional-adopter-dependency"].join('');
        return rel === victim ? `${disallowed}\n${source}` : source;
    }), /yaml/);
});

test('PORT-014 executed CJS suites cannot escape the dependency closure', async () => {
    const candidates = (await fs.readdir(path.join(repoRoot, '.claude/scripts/tests')))
        .filter(name => name.endsWith('.test.cjs'));
    assert.ok(candidates.length > 0, 'real scripts stage must have CJS fixtures');
    const closure = await pipelineFiles();
    for (const name of candidates) assert.ok(closure.includes(`.claude/scripts/tests/${name}`), `CJS test omitted: ${name}`);
    const victim = `.claude/scripts/tests/${candidates[0]}`;
    await assert.rejects(assertPortableDependencies(async rel => {
        const source = await readRel(rel);
        return rel === victim ? `${source}\nrequire('synthetic-adopter-local-dependency');\n` : source;
    }), /synthetic-adopter-local-dependency/);
});

// ── PORT-013 — a relocated .claude + generated .codex bundle remains root-relative ─────────────
// This is the user-facing portability contract: export the framework into one project, generate
// its Codex surfaces, copy those directories to a second project, and run from a nested cwd. No
// module may retain an absolute path to this checkout or require the source repository's package.
test('PORT-013 relocated .claude and .codex bundles resolve from the consuming project root', { skip: !isFrameworkRepo(repoRoot) }, async () => {
    const exported = await fs.mkdtemp(path.join(os.tmpdir(), 'port-relocated-export-'));
    const relocated = await fs.mkdtemp(path.join(os.tmpdir(), 'port-relocated-copy-'));
    createdDirs.push(exported, relocated);
    const exporter = path.join(repoRoot, '.claude', 'scripts', 'export-claude.mjs');
    const { code: exportCode, stderr: exportErr } = await run(process.execPath, [exporter, exported, '--include-untracked'], { cwd: repoRoot });
    assert.equal(exportCode, 0, `export-claude must succeed: ${exportErr}`);

    await fs.mkdir(path.join(exported, 'docs'), { recursive: true });
    await fs.mkdir(path.join(exported, 'nested', 'work'), { recursive: true });
    await fs.writeFile(path.join(exported, 'CLAUDE.md'), '# Portable project\n', 'utf8');
    await fs.writeFile(path.join(exported, 'docs', 'project-config.json'), '{}\n', 'utf8');

    const exportedRunner = path.join(exported, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs');
    const first = await run(process.execPath, [exportedRunner, '--only=migrate,hooks,context'], {
        cwd: path.join(exported, 'nested', 'work')
    });
    assert.equal(first.code, 0, `exported bundle must sync from a nested cwd: ${first.stderr || first.stdout}`);

    for (const name of ['.claude', '.codex', '.agents']) {
        await fs.cp(path.join(exported, name), path.join(relocated, name), { recursive: true });
    }
    for (const name of ['CLAUDE.md', 'AGENTS.md']) {
        await fs.copyFile(path.join(exported, name), path.join(relocated, name));
    }
    await fs.cp(path.join(exported, 'docs'), path.join(relocated, 'docs'), { recursive: true });
    await fs.mkdir(path.join(relocated, 'nested', 'work'), { recursive: true });

    const relocatedRunner = path.join(relocated, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs');
    const second = await run(process.execPath, [relocatedRunner, '--only=context'], {
        cwd: path.join(relocated, 'nested', 'work')
    });
    assert.equal(second.code, 0, `relocated bundle must sync from a nested cwd: ${second.stderr || second.stdout}`);
    const agents = await fs.readFile(path.join(relocated, 'AGENTS.md'), 'utf8');
    assert.doesNotMatch(agents, /Workflow Protocol \(Hook-Independent\)|Workflow Catalog|CODEX_CONTEXT/);
    assert.equal(await exists(path.join(relocated, '.codex', 'CODEX_CONTEXT.md')), false, 'no context file is generated');
    assert.ok(Buffer.byteLength(agents, 'utf8') <= AGENTS_ROOT_LIMIT_BYTES, 'relocated root projection must remain bounded');

    // The adopter path must survive the VERIFIER, not just the generator. AGENTS.md carries project
    // information only, so the verifier requires ZERO protocol-body copies in it.
    const skProto = await run(process.execPath, [relocatedRunner, '--only=sk-proto'], {
        cwd: path.join(relocated, 'nested', 'work')
    });
    // Assert the EXIT CODE, not merely the absence of a message: a `doesNotMatch` alone would pass
    // vacuously on any unrelated failure, which is the same class of vacuous check this assertion
    // exists to prevent. The message match then names WHICH contract must not be the one that broke.
    assert.equal(skProto.code, 0, `a CK-fence-less adopter root must pass sk-proto: ${skProto.stderr || skProto.stdout}`);
    assert.doesNotMatch(
        skProto.stdout + skProto.stderr,
        /body signature .* found \d+×/,
        'a CK-fence-less adopter root must not fail the bounded-root protocol-body occurrence contract'
    );
    assert.doesNotMatch(agents, new RegExp(exported.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

// ── PORT-011 — the framework-repo guard must resolve TRUE here (anti-silent-skip lock) ────────────
// PORT-003/004/005/008/010 (and TC-MWG-001/002/003, the adoption-parity npm half, TC-PROV-011b) are
// now conditional on `frameworkPkg()`, because an adopting project supplies its own package.json and
// an unconditional read aborted the pipeline at stage 5 of 19 in EVERY adopting project.
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
    // The independent signal USED to be "this package.json wires the standalone runner". That signal
    // is gone by design: the framework is self-running, so NO package.json may drive it (PORT-004).
    // The replacement is an EXPLICIT declaration in project config — `portability.toolingPackageName`.
    // A project that declares one is stating "this repo's package.json is the framework-tooling
    // package", which is exactly the claim this tripwire verifies. A bare `.claude` copy declares
    // nothing and skips; an adopting project that declares its own name is held to its own name.
    const declared = readJsonOrNull(path.join(repoRoot, 'docs', 'project-config.json'))?.portability?.toolingPackageName;
    if (typeof declared !== 'string' || !declared.trim()) return;

    const expected = frameworkPackageName(repoRoot);
    assert.equal(pkg.name, expected,
        `the project config declares this repo's tooling package, so it IS a framework-tooling ` +
        `package, but the guard expects the name "${expected}" and package.json says "${pkg.name}". Every guarded ` +
        `self-check (PORT-003/004/005/008/010, TC-MWG-001/002/003, TC-PROV-011b, TC-DOCROOT-038, ` +
        `adoption-parity npm half) is therefore SKIPPING. Fix by setting portability.toolingPackageName to "${pkg.name}" in ` +
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

test('PORT-013 runner rejects duplicate --only/--skip selectors before stage execution', async () => {
    for (const args of [
        ['--only=residue', '--only=sdd'],
        ['--skip=migrate', '--skip=hooks']
    ]) {
        const { code, stderr } = await run(process.execPath, [runnerAbs, ...args], { cwd: repoRoot });
        assert.equal(code, 1, `${args[0]} ${args[1]} must fail instead of silently selecting the first flag`);
        assert.match(stderr, /duplicate --(?:only|skip) flag/);
    }
});
