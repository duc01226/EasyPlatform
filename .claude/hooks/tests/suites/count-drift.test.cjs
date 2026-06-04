/**
 * Count Drift Test Suite
 *
 * Verifies marker-region counts in pilot documents remain in sync with
 * filesystem ground truth. (Design ADR 0002-canonical-count-metrics is
 * planned but not yet written.)
 *
 * Wired here for suite discovery, and bridged from `test-all-hooks.cjs` so
 * the documented primary hook test command also catches count/catalog drift.
 */

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SCRIPT = path.join(REPO_ROOT, '.claude', 'scripts', 'generate_catalogs.py');

const PILOT_FILES = [
    'CLAUDE.md',
    'docs/project-reference/project-structure-reference.md'
];

let pythonCommand = null;

function resolvePythonCommand() {
    if (pythonCommand) return pythonCommand;

    const candidates = [
        { command: 'python', baseArgs: [] },
        { command: 'py', baseArgs: ['-3'] }
    ];

    for (const candidate of candidates) {
        const result = spawnSync(candidate.command, [...candidate.baseArgs, '--version'], {
            cwd: REPO_ROOT,
            encoding: 'utf8',
            timeout: 10000
        });
        if (!result.error && result.status === 0) {
            pythonCommand = candidate;
            return pythonCommand;
        }
    }

    throw new Error(
        'Python 3 not found on PATH - required for count-drift check. ' +
        'Tried: python, py -3.'
    );
}

function formatPythonCommand() {
    const python = resolvePythonCommand();
    return [python.command, ...python.baseArgs].join(' ');
}

function runPython(args, label) {
    const python = resolvePythonCommand();
    const result = spawnSync(python.command, [...python.baseArgs, ...args], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        timeout: 30000
    });
    if (result.error && result.error.code === 'ETIMEDOUT') {
        throw new Error(`${label} exceeded 30s timeout`);
    }
    return result;
}

function runCheck(file) {
    return runPython([SCRIPT, '--check-counts', file], `--check-counts ${file}`);
}

function runCatalogCheck() {
    return runPython(
        [SCRIPT, '--skills', '--check', '.claude/SKILLS.yaml'],
        '--skills --check .claude/SKILLS.yaml'
    );
}

function countDirectSkillFiles() {
    const skillsDir = path.join(REPO_ROOT, '.claude', 'skills');
    return fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .filter((entry) => fs.existsSync(path.join(skillsDir, entry.name, 'SKILL.md')))
        .length;
}

function countTopLevelHooks() {
    const hooksDir = path.join(REPO_ROOT, '.claude', 'hooks');
    return fs.readdirSync(hooksDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.cjs'))
        .length;
}

function countLibModules() {
    const libDir = path.join(REPO_ROOT, '.claude', 'hooks', 'lib');
    return fs.readdirSync(libDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.cjs'))
        .length;
}

function countWorkflows() {
    const workflowsFile = path.join(REPO_ROOT, '.claude', 'workflows.json');
    const parsed = JSON.parse(fs.readFileSync(workflowsFile, 'utf8'));
    // `.workflows` is the id→definition map (same key TC-WFPROTO-006 reads); other top-level
    // keys (settings, version, etc.) are NOT workflows and must not be counted.
    return Object.keys(parsed.workflows || {}).length;
}

// Recursively enumerate every authored doc under docs/project-reference/ as
// repo-relative forward-slash paths. This is the filesystem ground truth the
// docs-index tree/lookup MUST match — the scan glob-verifies COUNTS but not the
// itemized enumeration, so a doc can be added (count bumps) yet silently dropped
// from the tree/lookup. These globs close that gap deterministically.
function listProjectReferenceDocs() {
    const baseDir = path.join(REPO_ROOT, 'docs', 'project-reference');
    const out = [];
    (function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.isFile() && entry.name.endsWith('.md')) {
                out.push(path.relative(REPO_ROOT, full).split(path.sep).join('/'));
            }
        }
    })(baseDir);
    return out.sort();
}

const DOCS_INDEX_PATH = path.join(REPO_ROOT, 'docs', 'project-reference', 'docs-index-reference.md');

function assertMatches(file, text, pattern, description) {
    if (!pattern.test(text)) {
        throw new Error(`${file} is missing current ${description} count matching ${pattern}`);
    }
}

const tests = [
    ...PILOT_FILES.map((file) => ({
    name: `[count-drift] ${file} markers match filesystem truth`,
    fn: () => {
        const result = runCheck(file);
        if (result.status !== 0) {
            const stderr = (result.stderr || '').trim();
            const stdout = (result.stdout || '').trim();
            throw new Error(
                `--check-counts ${file} exited ${result.status}.\n` +
                `stderr: ${stderr}\nstdout: ${stdout}\n` +
                `Fix: run \`${formatPythonCommand()} .claude/scripts/generate_catalogs.py --inject-counts ${file}\``
            );
        }
    }
    })),
    {
        name: '[count-drift] .claude/SKILLS.yaml matches regenerated skills catalog',
        fn: () => {
            const result = runCatalogCheck();
            if (result.status !== 0) {
                const stderr = (result.stderr || '').trim();
                const stdout = (result.stdout || '').trim();
                throw new Error(
                    `--skills --check .claude/SKILLS.yaml exited ${result.status}.\n` +
                    `stderr: ${stderr}\nstdout: ${stdout}\n` +
                    `Fix: run \`${formatPythonCommand()} .claude/scripts/generate_catalogs.py --skills --output .claude/SKILLS.yaml\``
                );
            }
        }
    },
    {
        name: '[count-drift] manual inventory docs match filesystem truth',
        fn: () => {
            const skillCount = countDirectSkillFiles();
            const hookCount = countTopLevelHooks();
            const workflowCount = countWorkflows();
            const libCount = countLibModules();
            const docsReadme = fs.readFileSync(
                path.join(REPO_ROOT, '.claude', 'docs', 'README.md'),
                'utf8'
            );
            const frameworkGuide = fs.readFileSync(
                path.join(REPO_ROOT, '.claude', 'docs', 'claude-ai-agent-framework-guide.md'),
                'utf8'
            );
            const quickStart = fs.readFileSync(
                path.join(REPO_ROOT, '.claude', 'docs', 'quick-start.md'),
                'utf8'
            );
            const rootReadme = fs.readFileSync(
                path.join(REPO_ROOT, 'README.md'),
                'utf8'
            );

            assertMatches(
                '.claude/docs/README.md',
                docsReadme,
                new RegExp(`\\|\\s*Skills\\s*\\|\\s*${skillCount}\\s*\\|`),
                'skill'
            );
            assertMatches(
                '.claude/docs/README.md',
                docsReadme,
                new RegExp(`\\|\\s*Hook files \\(top-level\\)\\s*\\|\\s*${hookCount}\\s*\\|`),
                'top-level hook'
            );
            assertMatches(
                '.claude/docs/README.md',
                docsReadme,
                new RegExp(`\\|\\s*Workflows\\s*\\|\\s*${workflowCount}\\s*\\|`),
                'workflow'
            );
            assertMatches(
                '.claude/docs/claude-ai-agent-framework-guide.md',
                frameworkGuide,
                new RegExp(`${workflowCount}\\s+registered workflows`),
                'workflow'
            );

            // --- Inventory-count surfaces gated against filesystem truth ---
            // quick-start.md directory tree: "<skills> skills", "<hooks> top-level hook files + <lib> lib modules"
            assertMatches(
                '.claude/docs/quick-start.md',
                quickStart,
                new RegExp(`${skillCount}\\s+skills\\s+\\(invoked`),
                'skill'
            );
            assertMatches(
                '.claude/docs/quick-start.md',
                quickStart,
                new RegExp(`${hookCount}\\s+top-level hook files\\s+\\+\\s+${libCount}\\s+lib modules`),
                'top-level hook + lib module'
            );
            // framework-guide "The Result" totals line: "**<hooks> top-level hook files**, **<skills> skills**"
            assertMatches(
                '.claude/docs/claude-ai-agent-framework-guide.md',
                frameworkGuide,
                new RegExp(`\\*\\*${hookCount} top-level hook files\\*\\*,\\s*\\*\\*${skillCount} skills\\*\\*`),
                'hook + skill totals'
            );
            // root README: section header + architecture box "<hooks> Hook Files + <skills> Skills"
            assertMatches(
                'README.md',
                rootReadme,
                new RegExp(`###\\s+Skills\\s+\\(${skillCount} definitions\\)`),
                'skill'
            );
            assertMatches(
                'README.md',
                rootReadme,
                new RegExp(`${hookCount} Hook Files\\s+\\+\\s+${skillCount} Skills`),
                'hook + skill'
            );
        }
    },
    // --- docs-index-reference.md ↔ filesystem enumeration guards ---
    // Root-cause guard: docs-index is AI-prose-generated by `/scan --target=docs-index`.
    // The scan glob-verifies the category COUNT but hand-assembles the tree + Doc Lookup
    // Guide, so a newly added project-reference doc can bump the count yet be silently
    // omitted from the itemized list (exactly how seed-test-data-reference.md was missed).
    // These three assertions make that class of drift a hard failure.
    {
        name: '[count-drift] docs-index enumerates every on-disk project-reference doc (no silent omission)',
        fn: () => {
            const docsIndex = fs.readFileSync(DOCS_INDEX_PATH, 'utf8');
            const docs = listProjectReferenceDocs();
            const missing = docs.filter((rel) => !docsIndex.includes(rel));
            if (missing.length > 0) {
                throw new Error(
                    `docs-index-reference.md omits ${missing.length} on-disk project-reference doc(s): ${missing.join(', ')}.\n` +
                    `Every docs/project-reference/**/*.md MUST appear in the Doc Lookup Guide (and tree).\n` +
                    `Fix: regenerate via \`/scan --target=docs-index\` — counts are glob-verified, the tree/lookup are not, and this guard closes that gap.`
                );
            }
        }
    },
    {
        name: '[count-drift] docs-index references no non-existent project-reference doc (no stale entry)',
        fn: () => {
            const docsIndex = fs.readFileSync(DOCS_INDEX_PATH, 'utf8');
            const referenced = new Set(docsIndex.match(/docs\/project-reference\/[A-Za-z0-9._/-]+\.md/g) || []);
            const stale = [...referenced].filter((rel) => !fs.existsSync(path.join(REPO_ROOT, rel)));
            if (stale.length > 0) {
                throw new Error(
                    `docs-index-reference.md references ${stale.length} project-reference path(s) that no longer exist: ${stale.join(', ')}.\n` +
                    `Fix: regenerate via \`/scan --target=docs-index\` after the rename/removal.`
                );
            }
        }
    },
    {
        name: '[count-drift] docs-index "Project reference" count matches filesystem glob',
        fn: () => {
            const docsIndex = fs.readFileSync(DOCS_INDEX_PATH, 'utf8');
            const expected = listProjectReferenceDocs().length;
            const m = docsIndex.match(/\|\s*Project reference\s*\|\s*(\d+)\s*\|/);
            if (!m) {
                throw new Error('docs-index-reference.md is missing the "Project reference" category-count row');
            }
            const actual = Number(m[1]);
            if (actual !== expected) {
                throw new Error(
                    `docs-index-reference.md "Project reference" count is ${actual} but docs/project-reference/ holds ${expected} docs.\n` +
                    `Fix: regenerate via \`/scan --target=docs-index\`.`
                );
            }
        }
    }
];

module.exports = {
    name: 'count-drift',
    tests
};
