#!/usr/bin/env node

// Literal-residue verifier for the relocatable docs/spec roots.
//
// WHAT IT PROVES (SC-7)
// `docs/project-config.json` can relocate the docs and spec roots, but a hardcoded `docs/specs/`
// in prose still instructs the AI to read the DEFAULT path. Code readers are a handful of files;
// prose occurrences outnumber them roughly 20:1. This verifier is the only surface that can tell
// a converted repo from an unconverted one, so it enumerates every remaining hardcoded root
// literal in the surfaces an agent actually reads and fails when one is not accounted for.
//
// RESIDUE IS COMPUTED, NEVER DECLARED
// Every run walks the scan scope and derives the live per-file occurrence counts. The allowlist is
// consulted ONLY as a suppression list — it is never the source of truth for what remains. A file
// that gets converted simply stops appearing in the residue report; no allowlist edit is required
// or expected. That is what keeps parallel conversion phases from racing over one JSON file.
//
// MIGRATION-AWARE STALENESS
// While the conversion is in flight (default `--migrating`) an allowlist entry whose file has zero
// remaining occurrences is a WARNING: it is printed and counted but does not fail the build, so a
// converting phase never has to also mutate the allowlist to stay green. The terminal gate runs
// `--strict`, where the same condition is an ERROR, deletes the stale entries in one serial pass,
// and keeps `--strict` on the invocation from then on.
//
// A missing `reason` is an ERROR in BOTH modes — a bare path list decays into permanent
// suppression, and the reason string is what keeps each entry a live, falsifiable statement.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { resolveProjectRoot, isInvokedAsScript } = require('../lib/project-root.cjs');

/**
 * The relocatable roots, each declarable under `specRoots` / `docsRoots` in the project config.
 *
 * `tmp/reports` is DELIBERATELY ABSENT and must never be added: `tmp/` and `temp/` are FIXED
 * framework invariants with no config key and no portability token, so tracking them here would
 * invite a future contributor to make them configurable.
 */
export const TRACKED_LITERALS = [
    'docs/specs',
    'docs/project-reference',
    'docs/adr',
    'docs/templates',
    'plans/',
    'team-artifacts',
    'docs/product-roadmap.md',
];

/**
 * The surfaces SC-7 claims: authored files an agent reads directly.
 *
 * The third entry is the PROJECT-REFERENCE root at its DEFAULT value. That root is itself
 * relocatable (`docsRoots.projectReference.path`), so this constant is the default table, not the
 * scan scope — use `resolveScanRoots(rootDir)`, which substitutes the configured value. Keeping the
 * literal here would have meant the gate silently scanned NOTHING in any project that relocated its
 * reference docs: the exact class of defect this verifier exists to catch, in the verifier itself.
 */
export const SCAN_ROOTS = ['.claude', 'CLAUDE.md', 'docs/project-reference'];

/** Scan roots that are FIXED framework invariants — no config key, never relocatable. */
const FRAMEWORK_SCAN_ROOTS = ['.claude', 'CLAUDE.md'];

/** Read + parse a JSON file, or `null` when absent/unreadable/malformed. */
async function readJsonFile(absPath) {
    try {
        return JSON.parse(await fs.readFile(absPath, 'utf8'));
    } catch {
        return null;
    }
}

/**
 * Locate the project config, honoring `.claude/.ck.json`'s `portability.projectConfigPath`.
 *
 * Read with a plain parse rather than `hooks/lib/project-config-loader` on purpose: PORT-001
 * requires every pipeline script to import only `node:` built-ins and relative files, so this
 * verifier must not reach across into the hook layer.
 */
async function projectConfigPathFor(rootDir) {
    const configured = (await readJsonFile(path.join(rootDir, '.claude', '.ck.json')))?.portability?.projectConfigPath;
    const rel = typeof configured === 'string' && configured.trim() ? configured.trim() : 'docs/project-config.json';
    return path.isAbsolute(rel) ? rel : path.join(rootDir, rel);
}

/** The configured project-reference root, slash-free, falling back to the documented default. */
export async function resolveRefDocsRoot(rootDir) {
    const configured = (await readJsonFile(await projectConfigPathFor(rootDir)))?.docsRoots?.projectReference?.path;
    if (typeof configured !== 'string' || !configured.trim()) return 'docs/project-reference';
    const raw = configured.trim();
    // Reject absolute/rooted values BEFORE normalization. Stripping a leading slash or backslash
    // turns `/etc/ref` into the harmless-looking `etc/ref` and `C:\\ref` into `C:/ref`, masking an
    // escape the canonical loader rejects — `project-config-loader.cjs` documents this exact class
    // ("a `..`-only check would still let an ABSOLUTE root through").
    if (raw.startsWith('/') || raw.startsWith('\\') || /^[a-zA-Z]:/.test(raw)) return 'docs/project-reference';
    const normalized = raw.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
    // A blank or repo-escaping value falls back rather than scanning outside the repository.
    if (!normalized || normalized.split('/').includes('..')) return 'docs/project-reference';
    return normalized;
}

/**
 * Framework-plane surfaces: `.claude/**` plus the root-level filenames the framework allowlist owns.
 * A project-plane allowlist entry targeting one of these would let an adopter silently disable
 * residue enforcement on the portable bundle — the cross-plane leakage the two-plane split prevents.
 */
function isFrameworkPlaneFile(file) {
    const normalized = String(file).replaceAll('\\', '/').replace(/^\.\//, '');
    return normalized === 'CLAUDE.md' || normalized.startsWith('.claude/');
}

/** The scan scope for THIS repository: the fixed framework roots plus the configured docs root. */
export async function resolveScanRoots(rootDir) {
    return [...FRAMEWORK_SCAN_ROOTS, await resolveRefDocsRoot(rootDir)];
}

/**
 * Generated mirrors carry the converted text only after the user runs the owning sync. Scanning them
 * would report each source's state twice and go red in the window between a source edit and the
 * sync. SC-7 over mirrors is proven transitively instead: source is clean AND a divergence gate
 * proves the mirror matches the source — `verify-sync-divergence` for `AGENTS.md`, `.codex/` and
 * `.agents/`, and the `verify-opencode-agents` stage of `run-opencode-sync.mjs` for `.opencode/`.
 */
export const MIRROR_PREFIXES = ['AGENTS.md', '.codex/', '.agents/', '.opencode/'];

/**
 * Test fixtures legitimately hardcode the DEFAULT paths to prove the default still works; banning
 * the literal there would force those tests to stop testing the default.
 */
export const EXCLUDED_PREFIXES = ['.claude/hooks/tests/'];

/**
 * Other checkouts the agent host keeps inside the scanned `.claude` root. Each is a whole working
 * tree with its own `.claude/`, reference docs and mirrors, so walking into one reports another
 * branch's files as THIS checkout's residue, under paths no allowlist entry can name.
 */
export const NESTED_CHECKOUT_DIRS = ['.claude/worktrees'];

/** `.claude/skills/<name>/tests/**` — same fixture rationale, expressed positionally. */
const SKILL_TESTS_PATTERN = /^\.claude\/skills\/[^/]+\/tests\//;

// `.claude/scripts/<pkg>/tests/` — the same fixture rationale for script-level test suites.
const SCRIPT_TESTS_PATTERN = /^\.claude\/scripts\/.*\/tests\//;

const ignoredParts = new Set(['node_modules', '.git', '.venv', '__pycache__', 'tmp', 'temp']);
const ignoredExtensions = new Set(['.pyc', '.pyo', '.exe', '.dll', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.zip', '.db']);

/** The config file whose presence on a line marks the default-plus-override (form b) idiom. */
const CONFIG_FILE_MARKER = 'project-config.json';

/** Keys that identify a fenced block as an example of the project config itself. */
const CONFIG_EXAMPLE_KEYS = /"(specRoots|docsRoots)"\s*:/;

const DEFAULT_ALLOWLIST_REL = '.claude/scripts/codex/config/root-literal-allowlist.json';

/**
 * The PROJECT-plane allowlist, resolved beside the reference docs it suppresses.
 *
 * WHY THERE ARE TWO
 * The framework allowlist above ships inside `.claude` and is copied verbatim into every adopting
 * project, so an adopter's own file paths must never be written into it — that is project residue in
 * a portable file, and it would carry one project's suppressions into the next one that copies the
 * bundle. `verify-no-project-residue` exists to stop exactly that.
 *
 * The project plane (`{REF_DOCS_ROOT}/**`) is project-authored content: `/scan` fills those docs
 * with the project's OWN resolved paths, which is why an adopter accumulates literals there that are
 * correct rather than residual. Those suppressions belong to the project, so they live with the
 * project — in a file that relocates automatically with the configured root and is simply absent in
 * the upstream framework repo.
 *
 * Absent file = zero entries and no error. It is optional by construction.
 */
async function projectAllowlistRelFor(rootDir) {
    return `${await resolveRefDocsRoot(rootDir)}/root-literal-allowlist.json`;
}

async function exists(target) {
    try {
        await fs.access(target);
        return true;
    } catch {
        return false;
    }
}

function toRel(rootDir, target) {
    return path.relative(rootDir, target).replaceAll('\\', '/');
}

/** True when a repo-relative path is outside the scan contract for any reason. */
export function isExcluded(relPath) {
    // A root-literal allowlist is a suppression LIST, not prose an agent reads: every key in it is
    // necessarily a path containing a tracked literal, so scanning one makes it flag itself.
    if (path.posix.basename(relPath) === 'root-literal-allowlist.json') return true;
    if (MIRROR_PREFIXES.some(prefix => relPath === prefix || relPath.startsWith(prefix))) return true;
    if (EXCLUDED_PREFIXES.some(prefix => relPath.startsWith(prefix))) return true;
    if (NESTED_CHECKOUT_DIRS.some(dir => relPath === dir || relPath.startsWith(`${dir}/`))) return true;
    if (SKILL_TESTS_PATTERN.test(relPath)) return true;
    if (SCRIPT_TESTS_PATTERN.test(relPath)) return true;
    if (relPath.split('/').some(part => ignoredParts.has(part))) return true;
    if (ignoredExtensions.has(path.extname(relPath).toLowerCase())) return true;
    return false;
}

async function* walk(rootDir, target) {
    if (!(await exists(target))) return;
    const stat = await fs.lstat(target);
    if (stat.isSymbolicLink()) return;
    const rel = toRel(rootDir, target);
    if (rel && isExcluded(rel)) return;
    if (stat.isFile()) {
        yield target;
        return;
    }
    if (!stat.isDirectory()) return;
    for (const entry of await fs.readdir(target, { withFileTypes: true })) {
        yield* walk(rootDir, path.join(target, entry.name));
    }
}

/**
 * Mark every line that sits inside a fenced code block which exemplifies the project config.
 *
 * A block qualifies when its body names the config file, when it declares one of the root-carrying
 * config keys, or when one of the three lines immediately above the opening fence introduces it as
 * the config file. Those are examples of the mechanism itself, so the literal paths inside them are
 * the point rather than residue.
 */
export function computeConfigFenceMask(lines) {
    const mask = new Array(lines.length).fill(false);
    const fence = /^\s*(`{3,}|~{3,})/;
    let index = 0;
    while (index < lines.length) {
        if (!fence.test(lines[index])) {
            index += 1;
            continue;
        }
        const openIndex = index;
        const marker = lines[openIndex].trim().slice(0, 3);
        let closeIndex = openIndex + 1;
        while (closeIndex < lines.length && !lines[closeIndex].trim().startsWith(marker)) closeIndex += 1;
        const body = lines.slice(openIndex + 1, Math.min(closeIndex, lines.length)).join('\n');
        const lead = lines.slice(Math.max(0, openIndex - 3), openIndex).join('\n');
        if (body.includes(CONFIG_FILE_MARKER) || CONFIG_EXAMPLE_KEYS.test(body) || lead.includes(CONFIG_FILE_MARKER)) {
            for (let i = openIndex; i <= Math.min(closeIndex, lines.length - 1); i++) mask[i] = true;
        }
        index = closeIndex + 1;
    }
    return mask;
}

/**
 * Pure core (exported for unit tests): the unaccounted occurrences in one file's `content`.
 *
 * PASS predicates, any one of which clears an occurrence:
 *   1. the line also names `docs/project-config.json` — the form (b) default-plus-override sentence
 *      that tells the reader the literal is a DEFAULT and where the override lives;
 *   2. the line sits inside a fenced block exemplifying the config file;
 *   3. (applied by the caller) the whole FILE is allowlisted.
 */
export function findLiteralOccurrences(content) {
    const lines = content.split(/\r?\n/);
    const fenceMask = computeConfigFenceMask(lines);
    const occurrences = [];
    lines.forEach((line, index) => {
        const matched = TRACKED_LITERALS.filter(literal => line.includes(literal));
        if (matched.length === 0) return;
        if (line.includes(CONFIG_FILE_MARKER)) return;
        if (fenceMask[index]) return;
        occurrences.push({ line: index + 1, literals: matched, text: line.trim() });
    });
    return occurrences;
}

/** Parse + shape-validate the allowlist. Returns `{ entries, errors }`; `entries` is path -> reason. */
export function parseAllowlist(raw, relPath = DEFAULT_ALLOWLIST_REL) {
    const errors = [];
    const entries = new Map();
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        return { entries, errors: [`${relPath}: not valid JSON — ${error.message}`] };
    }
    const files = parsed && typeof parsed === 'object' ? parsed.files : null;
    if (!files || typeof files !== 'object' || Array.isArray(files)) {
        return { entries, errors: [`${relPath}: missing a "files" object`] };
    }
    for (const [file, entry] of Object.entries(files)) {
        const reason = entry && typeof entry === 'object' ? entry.reason : null;
        if (typeof reason !== 'string' || reason.trim() === '') {
            errors.push(`${relPath}: entry "${file}" is missing a non-empty "reason" naming its owning phase`);
            continue;
        }
        entries.set(file.replaceAll('\\', '/'), reason.trim());
    }
    return { entries, errors };
}

/** Walk the scan scope and return `{ residue: Map<relPath, occurrence[]>, scanned: number }`. */
export async function scanRepository(rootDir, { scanRoots } = {}) {
    const roots = scanRoots ?? await resolveScanRoots(rootDir);
    const residue = new Map();
    let scanned = 0;
    for (const scanRoot of roots) {
        for await (const filePath of walk(rootDir, path.join(rootDir, scanRoot))) {
            const content = await fs.readFile(filePath, 'utf8').catch(() => null);
            if (content === null) continue;
            scanned += 1;
            const occurrences = findLiteralOccurrences(content);
            if (occurrences.length > 0) residue.set(toRel(rootDir, filePath), occurrences);
        }
    }
    return { residue, scanned };
}

function parseCliArgs(argv) {
    const options = {
        rootDir: process.cwd(),
        strict: false,
        json: false,
        optional: false,
        emitAllowlist: false,
        allowlistPath: null,
        projectAllowlistPath: null,
        scanRoots: null,
    };
    for (const argument of argv) {
        if (argument === '--strict') options.strict = true;
        else if (argument === '--migrating') options.strict = false;
        else if (argument === '--json') options.json = true;
        else if (argument === '--optional') options.optional = true;
        else if (argument === '--emit-allowlist') options.emitAllowlist = true;
        else if (argument.startsWith('--out=')) options.outPath = argument.slice('--out='.length);
        else if (argument.startsWith('--root=')) options.rootDir = path.resolve(argument.slice('--root='.length));
        else if (argument.startsWith('--allowlist=')) options.allowlistPath = argument.slice('--allowlist='.length);
        else if (argument.startsWith('--project-allowlist=')) options.projectAllowlistPath = argument.slice('--project-allowlist='.length);
        else if (argument.startsWith('--scan-roots=')) options.scanRoots = argument.slice('--scan-roots='.length).split(',').filter(Boolean);
    }
    return options;
}

export async function run(options) {
    const rootDir = options.rootDir;
    const allowlistRel = options.allowlistPath ?? DEFAULT_ALLOWLIST_REL;
    const allowlistAbs = path.isAbsolute(allowlistRel) ? allowlistRel : path.join(rootDir, allowlistRel);

    const { residue, scanned } = await scanRepository(rootDir, { scanRoots: options.scanRoots ?? undefined });

    if (options.emitAllowlist) {
        const files = {};
        for (const file of [...residue.keys()].sort()) files[file] = { reason: 'pending conversion — phase NN' };
        return { emitted: { files }, residue, scanned, errors: [], warnings: [], violations: [] };
    }

    const raw = await fs.readFile(allowlistAbs, 'utf8').catch(() => null);
    if (raw === null) {
        if (options.optional) {
            return { residue, scanned, errors: [], warnings: [], violations: [], skipped: `no allowlist at ${allowlistRel}` };
        }
        return { residue, scanned, errors: [`allowlist not found at ${allowlistRel}`], warnings: [], violations: [] };
    }

    const { entries, errors } = parseAllowlist(raw, allowlistRel);
    const frameworkFiles = new Set(entries.keys());

    // Merge the OPTIONAL project-plane allowlist. Absent file = no entries, no error: the upstream
    // framework repo ships none, and an adopter that has not needed one yet must stay green.
    const projectAllowlistRel = options.projectAllowlistPath ?? await projectAllowlistRelFor(rootDir);
    const projectAllowlistAbs = path.isAbsolute(projectAllowlistRel)
        ? projectAllowlistRel
        : path.join(rootDir, projectAllowlistRel);
    const projectRaw = await fs.readFile(projectAllowlistAbs, 'utf8').catch(() => null);
    const projectParsed = projectRaw === null
        ? { entries: new Map(), errors: [] }
        : parseAllowlist(projectRaw, projectAllowlistRel);
    // A path declared in BOTH planes keeps the framework reason: the portable file is authoritative
    // for its own surfaces, and a project must not silently re-explain a framework suppression.
    for (const [file, reason] of projectParsed.entries) {
        // The project plane owns project docs only. A key targeting the portable framework bundle
        // (.claude/**, CLAUDE.md) is rejected loudly: the framework plane is authoritative there,
        // and silently honouring it would suppress a framework violation the portable file never
        // blessed (the $contract's "FRAMEWORK PLANE ONLY" rule).
        if (isFrameworkPlaneFile(file)) {
            errors.push(`${projectAllowlistRel}: project-plane entry targets a framework surface (${file}) — the framework plane at ${allowlistRel} is authoritative for .claude/** and CLAUDE.md; remove the project entry`);
            continue;
        }
        if (!entries.has(file)) entries.set(file, reason);
    }
    errors.push(...projectParsed.errors);
    /** Which allowlist a suppression came from — so a stale-entry message names the file to edit. */
    const ownerOf = file => (frameworkFiles.has(file) ? allowlistRel : projectAllowlistRel);

    const violations = [];
    for (const [file, occurrences] of [...residue.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        if (entries.has(file)) continue;
        for (const occurrence of occurrences) {
            violations.push(`${file}:${occurrence.line}: hardcoded root literal ${occurrence.literals.map(l => `"${l}"`).join(', ')} — ${occurrence.text}`);
        }
    }

    const stale = [...entries.keys()].filter(file => !residue.has(file)).sort();
    const staleMessages = stale.map(file => `${file} — allowlisted (${entries.get(file)}) but has ZERO remaining occurrences; delete the entry from ${ownerOf(file)}`);

    return {
        residue,
        scanned,
        entries,
        violations,
        errors: [...errors, ...(options.strict ? staleMessages : [])],
        warnings: options.strict ? [] : staleMessages,
    };
}

function report(result, options) {
    const totalOccurrences = [...result.residue.values()].reduce((sum, list) => sum + list.length, 0);
    if (options.json) {
        console.log(JSON.stringify({
            ok: result.violations.length === 0 && result.errors.length === 0,
            mode: options.strict ? 'strict' : 'migrating',
            scannedFiles: result.scanned,
            totalOccurrences,
            perFile: Object.fromEntries([...result.residue.entries()].map(([file, list]) => [file, list.length])),
            violations: result.violations,
            warnings: result.warnings,
            errors: result.errors,
        }, null, 2));
        return;
    }

    const label = '[codex-verify-root-literals]';
    console.log(`${label} mode=${options.strict ? 'strict' : 'migrating'} scanned=${result.scanned} files`);
    console.log(`${label} residual occurrences: ${totalOccurrences} across ${result.residue.size} files`);
    // The per-file residual report below is the machine-readable remaining-work count at every
    // wave boundary, and the input a later split rule reads. It is DERIVED, never declared.
    for (const [file, list] of [...result.residue.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))) {
        const suppressed = result.entries?.has(file) ? ` (allowlisted: ${result.entries.get(file)})` : '';
        console.log(`  ${file}: ${list.length}${suppressed}`);
    }
    for (const warning of result.warnings) console.log(`${label} stale allowlist entry (warning): ${warning}`);
    for (const violation of result.violations) console.error(`${label} - ${violation}`);
    for (const error of result.errors) console.error(`${label} - ${error.includes('ZERO remaining occurrences') ? `stale allowlist entry: ${error}` : error}`);
}

const rootDirOf = options => options.rootDir;

async function main(resolvedRoot) {
    const options = parseCliArgs(process.argv.slice(2));
    if (!process.argv.slice(2).some(argument => argument.startsWith('--root=')) && resolvedRoot) {
        options.rootDir = resolvedRoot;
    }
    const result = await run(options);

    if (result.emitted) {
        const serialized = `${JSON.stringify(result.emitted, null, 4)}\n`;
        // `--out` exists because a seed of this size is unreadable on stdout and shell redirection
        // is not available in every authoring environment. Emit mode is a one-off seeding aid; the
        // verifying modes never write.
        if (options.outPath) {
            const target = path.isAbsolute(options.outPath) ? options.outPath : path.join(rootDirOf(options), options.outPath);
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.writeFile(target, serialized);
            console.log(`[codex-verify-root-literals] wrote seed allowlist (${Object.keys(result.emitted.files).length} files) to ${options.outPath}`);
            return;
        }
        console.log(serialized);
        return;
    }
    if (result.skipped) {
        console.log(`[codex-verify-root-literals] SKIP (${result.skipped})`);
        return;
    }

    report(result, options);
    const failed = result.violations.length > 0 || result.errors.length > 0;
    // In `--json` the verdict is the `ok` field; a trailing banner would make stdout unparseable.
    if (failed) {
        if (!options.json) console.error('[codex-verify-root-literals] FAIL');
        process.exitCode = 1;
        return;
    }
    if (!options.json) console.log('[codex-verify-root-literals] PASS');
}

if (isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url))) {
    await main(resolveProjectRoot({
        cwd: process.cwd(),
        scriptPath: fileURLToPath(import.meta.url),
        env: process.env,
    }).rootDir);
}
