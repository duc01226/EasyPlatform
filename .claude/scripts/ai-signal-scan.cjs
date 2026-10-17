#!/usr/bin/env node
'use strict';
/**
 * ai-signal-scan — which files of a change set are AI-feature surfaces, and why?
 *
 * Review skills and `workflow-review-changes` use this as the objective answer to "is an AI feature
 * in scope?" before they decide whether to run the AI-engineering review. It applies the SAME
 * `ai-feature-gate` convention class the per-file convention hook delivers (the project's own class
 * in `contextGroups` when it declares one, else the framework's built-in class) through the SAME
 * matcher (`explainGroupMatch`), so there is no second signal list to drift.
 *
 * Usage
 *   node .claude/scripts/ai-signal-scan.cjs [--staged | --unstaged | --base <ref> | --files a b c] [--json]
 *
 *   (default)   local changes: staged + unstaged vs HEAD, plus untracked files
 *   --staged    the index only
 *   --unstaged  working-tree edits, plus untracked files
 *   --base ref  what a branch or pull-request review examines: the files committed since the merge base
 *               with <ref> (`git diff <ref>...HEAD`) UNION the default local changes
 *   --files     the listed paths (absolute, or relative to the current directory)
 *
 * Each matched file lists its signals: `path` (which matcher: pathRegexes, pathGlobs, fileNameRegexes)
 * and `content` (the class's content label when a content signal matched). Content is read from disk
 * with the class's bounded, fail-open reader that never follows a link out of the project. Both output
 * forms (text and `--json`) carry signal NAMES only (the matcher, the class's content label), never
 * matched source text: that text comes from any file the scan reads.
 *
 * `status` in the JSON is the answer a caller may act on: "surface" (at least one AI file), "clean" (the
 * scan completed fully and found none: the only status that means "skip the AI review") or "unknown"
 * (a git error, a missing or rejected --base, a truncated file list, or a `--files` request with no
 * path or with paths outside the project that were not scanned: run the review or the fallback
 * search). Read-only and fail-open: git is run without a shell (argv arrays) and any failure is reported
 * in `errors`; the exit code is always 0. `--json` prints one JSON object for skills to parse.
 */

const path = require('path');
const { execFileSync } = require('child_process');
const { resolveProjectRoot } = require('./lib/project-root.cjs');
const conventions = require('../hooks/lib/file-conventions.cjs');

const CLASS_NAME = conventions.AI_FEATURE_GATE.name;
const MAX_FILES = 5000;
// What a content signal is called when the class carries no `contentLabel`.
const CONTENT_SIGNAL_NAME = 'content signal';
const GIT_MAX_BUFFER = 64 * 1024 * 1024;
// A ref is a revision expression, never an option: legal ref characters only (letters, digits and
// _ + # = , / . - @ ~ ^ { } :), no leading dash, no whitespace or control character, and no `..` (the range
// operator is appended by this tool). The git call also ends its options with `--`.
const SAFE_REF = /^[A-Za-z0-9_@+#=,][A-Za-z0-9._+#=,/@~^{}:-]*$/;
const isSafeRef = ref => SAFE_REF.test(ref) && !ref.includes('..');

function parseArgs(argv) {
    const args = { mode: 'all', base: null, files: [], json: false, warnings: [] };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--json') args.json = true;
        else if (arg === '--staged') args.mode = 'staged';
        else if (arg === '--unstaged') args.mode = 'unstaged';
        else if (arg === '--base') {
            args.mode = 'base';
            args.base = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '';
        } else if (arg.startsWith('--base=')) {
            args.mode = 'base';
            args.base = arg.slice('--base='.length);
        } else if (arg === '--files') {
            args.mode = 'files';
            while (argv[i + 1] && !argv[i + 1].startsWith('--')) args.files.push(argv[++i]);
        } else args.warnings.push(`ignored argument: ${arg}`);
    }
    return args;
}

function runGit(projectDir, gitArgs) {
    return execFileSync('git', gitArgs, {
        cwd: projectDir, encoding: 'utf8', windowsHide: true, maxBuffer: GIT_MAX_BUFFER, stdio: ['ignore', 'pipe', 'pipe']
    });
}

const nulList = output => output.split('\0').filter(Boolean);

/** Changed paths (repo-relative to `projectDir`, forward slashes) for a mode; failures go to `errors`. */
function collectChangedFiles(projectDir, args, errors) {
    const diff = extra => nulList(runGit(projectDir, ['diff', '--name-only', '-z', '--relative', '--diff-filter=ACMRT', ...extra]));
    const untracked = () => nulList(runGit(projectDir, ['ls-files', '--others', '--exclude-standard', '-z']));
    const attempt = (label, fn) => {
        try {
            return fn();
        } catch (err) {
            const detail = String(err && err.stderr ? err.stderr : err && err.message ? err.message : err).trim().split(/\r?\n/)[0];
            errors.push(`git ${label} failed: ${detail}`);
            return [];
        }
    };
    // Everything a commit of the working tree would touch. A repository with no commit yet has no HEAD.
    const workingTree = () => {
        let vsHead = null;
        try {
            vsHead = diff(['HEAD', '--']);
        } catch {
            vsHead = null;
        }
        return (vsHead !== null ? vsHead : attempt('diff --cached', () => diff(['--cached', '--'])).concat(attempt('diff', () => diff(['--']))))
            .concat(attempt('ls-files --others', untracked));
    };
    let files = [];
    if (args.mode === 'staged') {
        files = attempt('diff --cached', () => diff(['--cached', '--']));
    } else if (args.mode === 'unstaged') {
        files = attempt('diff', () => diff(['--'])).concat(attempt('ls-files --others', untracked));
    } else if (args.mode === 'base') {
        if (!args.base) {
            errors.push('--base needs a ref (for example --base origin/main); nothing was scanned');
        } else if (!isSafeRef(args.base)) {
            errors.push(`--base ${JSON.stringify(args.base)} is not a plain revision (no leading dash, whitespace or "..")`);
        } else {
            // A branch or pull-request review examines the commits since the merge base AND the uncommitted work.
            files = attempt(`diff ${args.base}...HEAD`, () => diff([`${args.base}...HEAD`, '--'])).concat(workingTree());
        }
    } else {
        files = workingTree();
    }
    return Array.from(new Set(files.map(file => file.replace(/\\/g, '/'))));
}

/** The class to apply: the project's own `ai-feature-gate` (working copy), else the built-in framework class. */
function resolveClass(config) {
    const groups = config && Array.isArray(config.contextGroups) ? config.contextGroups : [];
    const own = groups.find(group => group && typeof group.name === 'string' && group.name.trim() === CLASS_NAME);
    // The no-config fallback hands back the framework constant itself, which is still the built-in class.
    return own && own !== conventions.AI_FEATURE_GATE ? { group: own, source: 'config' } : { group: conventions.AI_FEATURE_GATE, source: 'builtin' };
}

/**
 * Scan `files` (repo-relative) against the class. `readContent(rel)` defaults to the bounded reader
 * rooted at `projectDir`. Returns the report object the CLI prints.
 */
function scan({ projectDir, files, config, mode = 'files', base = null, readContent, errors = [], warnings = [], unscanned = 0 }) {
    const { group, source } = resolveClass(config);
    const contentLabel = conventions.contentLabelOf(group);
    const ctx = { readContent: typeof readContent === 'function' ? readContent : conventions.createContentReader(projectDir) };
    const truncated = files.length > MAX_FILES;
    const scanned = truncated ? files.slice(0, MAX_FILES) : files;
    const aiSurface = [];
    let incompleteMatches = 0;
    for (const file of scanned) {
        const explained = conventions.explainGroupMatch(group, file, ctx, true);
        if (explained.incomplete) incompleteMatches += 1;
        // Names, not text: the matched source text stays out of the report (it may come from any file the scan reads).
        if (explained.member) aiSurface.push({ file, signals: { path: explained.pathSignals, content: explained.contentSignals.length ? [contentLabel || CONTENT_SIGNAL_NAME] : [] } });
    }
    // Only a complete scan that found nothing is "clean"; a git error, a rejected base, a cut-off list or a
    // requested path that was never scanned proves nothing.
    if (incompleteMatches > 0) warnings.push(`${incompleteMatches} file(s) could not be classified within the configured regex budget`);
    const status = aiSurface.length > 0 ? 'surface' : (errors.length > 0 || truncated || unscanned > 0 || incompleteMatches > 0 ? 'unknown' : 'clean');
    return {
        tool: 'ai-signal-scan', mode, base, class: CLASS_NAME, classSource: source, contentLabel,
        status, scanned: scanned.length, truncated, incompleteMatches, inScope: aiSurface.length > 0, aiSurface, errors, warnings
    };
}

/** A file name as shown in text: control characters (terminal escapes, newlines) become `?`. */
const displayName = name => String(name).replace(/[\u0000-\u001f\u007f]/g, '?');

function formatText(report) {
    const lines = [];
    if (report.aiSurface.length === 0) {
        // Only a completed scan may say "No AI-feature surface"; anything else says the answer is unknown.
        lines.push(report.status === 'clean'
            ? `No AI-feature surface detected in ${report.scanned} file(s) (class ${report.class}, ${report.classSource}).`
            : `AI-feature surface UNKNOWN: none found in ${report.scanned} scanned file(s), but the scan was incomplete (class ${report.class}, ${report.classSource}).`);
    } else {
        lines.push(`AI-feature surface: ${report.aiSurface.length} of ${report.scanned} file(s) (class ${report.class}, ${report.classSource}).`);
        for (const entry of report.aiSurface) {
            const parts = [];
            if (entry.signals.path.length) parts.push(`path: ${entry.signals.path.join(', ')}`);
            // Names, not text: matched source text stays out of the output (it may come from any file the scan reads).
            if (entry.signals.content.length) parts.push(`content: ${entry.signals.content.join(', ')}`);
            lines.push(`- ${displayName(entry.file)}  [${parts.join('; ')}]`);
        }
    }
    if (report.truncated) lines.push(`Note: only the first ${MAX_FILES} files were scanned.`);
    for (const message of report.errors) lines.push(`error: ${message}`);
    for (const message of report.warnings) lines.push(`warning: ${message}`);
    return `${lines.join('\n')}\n`;
}

function main(argv) {
    const args = parseArgs(argv);
    const errors = [];
    const warnings = args.warnings.slice();
    const projectDir = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env }).rootDir;
    let config = {};
    try {
        const { getProjectConfigStatus } = require('../hooks/lib/project-config-loader.cjs');
        config = conventions.effectiveConfig(getProjectConfigStatus());
    } catch (err) {
        warnings.push(`project config unavailable, using the built-in class: ${err && err.message ? err.message : err}`);
    }
    let files;
    let unscanned = 0;
    if (args.mode === 'files') {
        files = args.files
            .map(file => conventions.toRepoRelative(file, projectDir, process.cwd()))
            .filter(Boolean);
        // A request that was not fully scanned (no path at all, or paths outside the project) never yields "clean".
        unscanned = args.files.length === 0 ? 1 : args.files.length - files.length;
        if (args.files.length === 0) warnings.push('--files needs at least one path; nothing was scanned');
        else if (unscanned > 0) warnings.push('some --files paths are outside the project and were not scanned');
    } else {
        files = collectChangedFiles(projectDir, args, errors);
    }
    const report = scan({ projectDir, files, config, mode: args.mode, base: args.base, errors, warnings, unscanned });
    process.stdout.write(args.json ? `${JSON.stringify(report, null, 2)}\n` : formatText(report));
}

module.exports = { parseArgs, collectChangedFiles, resolveClass, scan, formatText, CLASS_NAME, MAX_FILES };

if (require.main === module) {
    try {
        main(process.argv.slice(2));
    } catch (err) {
        process.stderr.write(`ai-signal-scan: ${err && err.message ? err.message : err}\n`);
    }
    process.exitCode = 0;
}
