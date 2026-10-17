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
const { resolvePythonCommand: findPythonCommand, preparePythonYaml } = require('../lib/python-command.cjs');
const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SCRIPT = path.join(REPO_ROOT, '.claude', 'scripts', 'generate_catalogs.py');

// Files whose `<!-- COUNT:kind -->` marker regions are checked against filesystem
// truth. Adding a file here is how a hand-typed inventory figure stops drifting:
// the guard previously asserted only 6 regexes, so 14 hand-typed counts sat in
// files it never opened (team-collaboration-guide.md claimed 164 skills against
// a real 167) while the suite reported 8/8 green.
// A listed file that is absent is skipped, and `--check-counts` passes a file that
// carries no markers, so an adopter's own root README (no markers) never fails here.
const PILOT_FILES = [
    'CLAUDE.md',
    'README.md',
    'docs/project-reference/project-structure-reference.md',
    '.claude/docs/README.md',
    '.claude/docs/claude-ai-agent-framework-guide.md',
    '.claude/docs/hooks/README.md',
    '.claude/docs/skills/README.md',
    '.claude/docs/team-collaboration-guide.md',
    '.claude/docs/universal-setup-guide.md'
];

let pythonCommand = null;
let readinessError;
let yamlModulePath;

function resolvePythonCommand() {
    if (readinessError) throw readinessError;
    if (pythonCommand) return pythonCommand;
    try {
        const python = findPythonCommand({ cwd: REPO_ROOT, minMinor: 0 });
        yamlModulePath = preparePythonYaml(python, { scriptsDir: path.dirname(SCRIPT), cwd: REPO_ROOT });
        pythonCommand = python;
        return pythonCommand;
    } catch (error) {
        readinessError = error;
        throw error;
    }
}

function formatPythonCommand() {
    const python = resolvePythonCommand();
    return [python.command, ...python.baseArgs].join(' ');
}

function runPython(args, label) {
    const python = resolvePythonCommand();
    const result = spawnSync(python.command, [...python.baseArgs, ...args], {
        cwd: REPO_ROOT,
        env: { ...process.env, PYTHONPATH: [yamlModulePath, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter) },
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

function listFilesRecursive(root, predicate) {
    const out = [];
    if (!fs.existsSync(root)) return out;
    (function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.isFile() && predicate(full, entry.name)) out.push(full);
        }
    })(root);
    return out;
}

function countHookSuiteFiles() {
    return listFilesRecursive(
        path.join(REPO_ROOT, '.claude', 'hooks', 'tests', 'suites'),
        (_full, name) => /\.test\.(?:cjs|mjs)$/.test(name)
    ).length;
}

function countTopLevelHookTestFiles() {
    const testsDir = path.join(REPO_ROOT, '.claude', 'hooks', 'tests');
    return fs.readdirSync(testsDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && /^test-[^/]+/.test(entry.name))
        .length;
}

function listAuthoredMarkdownPaths() {
    const result = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        timeout: 10000
    });
    if (result.error || result.status !== 0) {
        throw new Error(`Unable to enumerate authored Markdown through git: ${(result.error || result.stderr || '').toString().trim()}`);
    }
    return result.stdout
        .split('\0')
        .filter(Boolean)
        .map((file) => file.split(path.sep).join('/'))
        .filter((file) => file.toLowerCase().endsWith('.md'))
        // A tracked file deleted in the working tree is still listed by --cached; it is not authored content on disk.
        .filter((file) => fs.existsSync(path.join(REPO_ROOT, file)));
}

function listAuthoredMarkdownUnion() {
    return new Set(listAuthoredMarkdownPaths().filter((file) =>
        !file.includes('/')
        || file.startsWith('docs/')
        || file.startsWith('.claude/docs/')
        || file.startsWith('.claude/skills/')
    ));
}

function countSkillMarkdownFiles() {
    return listAuthoredMarkdownPaths().filter((file) => file.startsWith('.claude/skills/')).length;
}

const PROJECT_REFERENCE_DIR = path.join(REPO_ROOT, 'docs', 'project-reference');
const DOCS_INDEX_PATH = path.join(PROJECT_REFERENCE_DIR, 'docs-index-reference.md');
const HAS_PROJECT_REFERENCE_INDEX = fs.existsSync(DOCS_INDEX_PATH);
const PROJECT_STRUCTURE_PATH = path.join(PROJECT_REFERENCE_DIR, 'project-structure-reference.md');
const HAS_PROJECT_STRUCTURE = fs.existsSync(PROJECT_STRUCTURE_PATH);
const IS_FRAMEWORK_REPO = isFrameworkRepo(REPO_ROOT);

// The authored-Markdown inventory is git's own (tracked plus untracked-not-ignored), so its totals
// self-check needs git to list this repository's files as well as the framework-repo identity: an
// exported copy has no work tree, and a copy under another checkout's ignored directory lists nothing.
const AUTHORED_TOTALS_SKIP = (() => {
    if (!HAS_PROJECT_REFERENCE_INDEX || !IS_FRAMEWORK_REPO) return true;
    let reason = 'git does not list the files of this project';
    try {
        const docsIndex = path.relative(REPO_ROOT, DOCS_INDEX_PATH).split(path.sep).join('/');
        if (listAuthoredMarkdownPaths().includes(docsIndex)) return false;
    } catch (error) {
        reason = error.message;
    }
    console.log(`  [count-drift] skipping the authored Markdown totals check — ${reason}`);
    return reason;
})();

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
    const out = [];
    (function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.isFile() && entry.name.endsWith('.md')) {
                out.push(path.relative(REPO_ROOT, full).split(path.sep).join('/'));
            }
        }
    })(PROJECT_REFERENCE_DIR);
    return out.sort();
}

function assertMatches(file, text, pattern, description) {
    const renderedText = text.replace(/<!--\s*(?:COUNT:[a-z0-9-]+|\/COUNT)\s*-->/g, '');
    if (!pattern.test(renderedText)) {
        throw new Error(`${file} is missing current ${description} count matching ${pattern}`);
    }
}

function assertDeclaredHookInventory(content, suiteCount, topLevelCount) {
    // Adopter docs choose their inventory. Once declared, each count stays strict.
    if (/^\|\s*Hook Tests\s*\|/m.test(content)) {
        assertMatches('project-structure-reference.md', content,
            new RegExp('\\|\\s*Hook Tests\\s*\\|\\s*' + suiteCount + ' suites \\+ ' + topLevelCount + ' `test-\\*` files'),
            'hook test inventory');
    }
    if (/^\|\s*HT\s*\|\s*Hook Tests\s*\|/m.test(content)) {
        assertMatches('project-structure-reference.md', content,
            new RegExp('\\|\\s*HT\\s*\\|\\s*Hook Tests\\s*\\|[^\\n]*\\|\\s*' + suiteCount + ' suite files \\+ ' + topLevelCount + ' top-level `test-\\*` files'),
            'hook test module inventory');
    }
}

const tests = [
    {
        name: '[count-drift] adopter inventory is optional while declared hook counts stay strict',
        fn: () => {
            const assert = require('node:assert/strict');
            assertDeclaredHookInventory('# Application structure\n| API | backend | src/api |', 2, 1);
            const inventory = '| Hook Tests | 2 suites + 1 `test-*` files |';
            const moduleRow = '| HT | Hook Tests | library | 2 suite files + 1 top-level `test-*` files |';
            assertDeclaredHookInventory(inventory + '\n' + moduleRow, 2, 1);
            assert.throws(() => assertDeclaredHookInventory(inventory, 3, 1), /hook test inventory/);
            assert.throws(() => assertDeclaredHookInventory(moduleRow, 2, 2), /hook test module inventory/);
        }
    },
    ...PILOT_FILES.map((file) => ({
    name: `[count-drift] ${file} markers match filesystem truth`,
    skip: !fs.existsSync(path.join(REPO_ROOT, file)),
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
            const hookSuiteCount = countHookSuiteFiles();
            const topLevelHookTestCount = countTopLevelHookTestFiles();
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
            const rootReadmePath = path.join(REPO_ROOT, 'README.md');
            const rootReadme = fs.existsSync(rootReadmePath)
                ? fs.readFileSync(rootReadmePath, 'utf8')
                : null;

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
            if (HAS_PROJECT_STRUCTURE) {
                const projectStructure = fs.readFileSync(PROJECT_STRUCTURE_PATH, 'utf8');
                assertDeclaredHookInventory(projectStructure, hookSuiteCount, topLevelHookTestCount);
            }

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
            // Root README: assert the COUNTS only when this README is the framework's own
            // inventory front page.
            //
            // PORTABILITY: the previous guard was `if (rootReadme)` — "keep these assertions when
            // the adopter supplies that document". That conflates HAVING a root README with having
            // the FRAMEWORK'S root README. Practically every project has a README.md and almost
            // none of them is a framework inventory doc, so a `.claude` copied into any real
            // repository failed here demanding that the project's own front page advertise a skill
            // count. Detect the inventory SHAPE instead (self-identifying, same philosophy as
            // framework-repo.helper.mjs): when the headings exist the numbers inside them must be
            // current; when they do not, this is someone's project README and none of our business.
            //
            // This cannot silently drop upstream coverage: `.claude/docs/README.md`,
            // `quick-start.md` and `claude-ai-agent-framework-guide.md` are asserted
            // UNCONDITIONALLY above, and those are the inventory surfaces that travel with the
            // framework. The root README is the only one that does not.
            const ROOT_README_SKILL_HEADING = /###\s+Skills\s+\(\d+ definitions\)/;
            const ROOT_README_TOTALS = /\d+ Hook Files\s+\+\s+\d+ Skills/;
            if (rootReadme && ROOT_README_SKILL_HEADING.test(rootReadme)) {
                assertMatches(
                    'README.md',
                    rootReadme,
                    new RegExp(`###\\s+Skills\\s+\\(${skillCount} definitions\\)`),
                    'skill'
                );
            }
            if (rootReadme && ROOT_README_TOTALS.test(rootReadme)) {
                assertMatches(
                    'README.md',
                    rootReadme,
                    new RegExp(`${hookCount} Hook Files\\s+\\+\\s+${skillCount} Skills`),
                    'hook + skill'
                );
            }
        }
    },
    // --- docs-index-reference.md ↔ filesystem enumeration guards ---
    // Root-cause guard: docs-index is AI-prose-generated by `scan --target=docs-index`.
    // The scan glob-verifies the category COUNT but hand-assembles the tree + Doc Lookup
    // Guide, so a newly added project-reference doc can bump the count yet be silently
    // omitted from the itemized list (exactly how seed-test-data-reference.md was missed).
    // These assertions make that class of drift and host-specific shared guidance hard failures.
    {
        name: '[count-drift] docs-index enumerates every on-disk project-reference doc (no silent omission)',
        skip: !HAS_PROJECT_REFERENCE_INDEX,
        fn: () => {
            const docsIndex = fs.readFileSync(DOCS_INDEX_PATH, 'utf8');
            const docs = listProjectReferenceDocs();
            const missing = docs.filter((rel) => !docsIndex.includes(rel));
            if (missing.length > 0) {
                throw new Error(
                    `docs-index-reference.md omits ${missing.length} on-disk project-reference doc(s): ${missing.join(', ')}.\n` +
                    `Every docs/project-reference/**/*.md MUST appear in the Doc Lookup Guide (and tree).\n` +
                    `Fix: regenerate via \`scan --target=docs-index\` — counts are glob-verified, the tree/lookup are not, and this guard closes that gap.`
                );
            }
        }
    },
    {
        name: '[count-drift] docs-index references no non-existent project-reference doc (no stale entry)',
        skip: !HAS_PROJECT_REFERENCE_INDEX,
        fn: () => {
            const docsIndex = fs.readFileSync(DOCS_INDEX_PATH, 'utf8');
            const referenced = new Set(docsIndex.match(/docs\/project-reference\/[A-Za-z0-9._/-]+\.md/g) || []);
            const stale = [...referenced].filter((rel) => !fs.existsSync(path.join(REPO_ROOT, rel)));
            if (stale.length > 0) {
                throw new Error(
                    `docs-index-reference.md references ${stale.length} project-reference path(s) that no longer exist: ${stale.join(', ')}.\n` +
                    `Fix: regenerate via \`scan --target=docs-index\` after the rename/removal.`
                );
            }
        }
    },
    {
        name: '[count-drift] docs-index "Project reference" count matches filesystem glob',
        skip: !HAS_PROJECT_REFERENCE_INDEX,
        fn: () => {
            const docsIndex = fs.readFileSync(DOCS_INDEX_PATH, 'utf8');
            const expected = listProjectReferenceDocs().length;
            // Case-insensitive on the row LABEL only: `scan --target=docs-index` owns the
            // category-table schema and renders every label in Title Case — the generated table
            // uses Title Case across all 11 category rows ("Root-Level Docs", "Project Reference",
            // "Framework Docs", ...). Pinning one casing here made the locator break on a
            // spec-conformant regeneration. The count assertion below is the actual guard and
            // stays strict.
            const m = docsIndex.match(/\|\s*Project\s+reference\s*\|\s*(\d+)\s*\|/i);
            if (!m) {
                throw new Error('docs-index-reference.md is missing the "Project reference" category-count row');
            }
            const actual = Number(m[1]);
            if (actual !== expected) {
                throw new Error(
                    `docs-index-reference.md "Project reference" count is ${actual} but docs/project-reference/ holds ${expected} docs.\n` +
                    `Fix: regenerate via \`scan --target=docs-index\`.`
                );
            }
        }
    },
    {
        name: '[count-drift] docs-index skill and unique authored Markdown totals match filesystem truth',
        skip: AUTHORED_TOTALS_SKIP,
        fn: () => {
            // Given the framework repository's generated docs index and Git-authored file inventory.
            const docsIndex = fs.readFileSync(DOCS_INDEX_PATH, 'utf8');
            const skillCount = countSkillMarkdownFiles();
            const totalCount = listAuthoredMarkdownUnion().size;

            // When each repeated count surface is compared with the normalized authored union.
            assertMatches(
                'docs-index-reference.md',
                docsIndex,
                new RegExp(`\\|\\s*Skill Markdown\\s*\\|\\s*${skillCount}\\s*\\|`),
                'Skill Markdown category'
            );
            assertMatches(
                'docs-index-reference.md',
                docsIndex,
                new RegExp(`\\.claude/skills/\\s*# ${skillCount} authored/tracked markdown assets`),
                'Skill Markdown tree'
            );
            const totals = [...docsIndex.matchAll(/(?:Index\s+)?(\d+) unique authored [Mm]arkdown files/g)]
                .map((match) => Number(match[1]));

            // Then both prose totals must agree with the same source of truth.
            if (totals.length !== 2 || totals.some((count) => count !== totalCount)) {
                throw new Error(
                    `docs-index-reference.md authored Markdown totals are ${JSON.stringify(totals)} but the normalized filesystem union has ${totalCount}.\n` +
                    'Fix: regenerate via `scan --target=docs-index`.'
                );
            }
        }
    },
    {
        // A text-mode rewrite turns every EOL into os.linesep on Windows. On CLAUDE.md that churn
        // fed the header re-stamp CRLF separators it could not strip, growing a blank run per sync.
        name: '[count-drift] --inject-counts rewrites only the marker value and preserves mixed line endings',
        fn: () => {
            const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'count-inject-'));
            try {
                const file = path.join(dir, 'mixed-eol.md');
                const marker = value => `<!-- COUNT:hooks -->${value}<!-- /COUNT -->`;
                const render = value => `# LF header\n\n| Hooks | ${marker(value)} |\r\ncrlf body\r\n\r\nlf tail\n`;
                fs.writeFileSync(file, render(0));
                const result = runPython([SCRIPT, '--inject-counts', file], `--inject-counts ${file}`);
                if (result.status !== 0) {
                    throw new Error(`--inject-counts exited ${result.status}: ${(result.stderr || '').trim()}`);
                }
                const expected = render(countTopLevelHooks());
                const actual = fs.readFileSync(file, 'utf8');
                if (actual !== expected) {
                    throw new Error(`--inject-counts changed bytes beyond the marker value.\nexpected: ${JSON.stringify(expected)}\nactual:   ${JSON.stringify(actual)}`);
                }
            } finally {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        }
    },
    {
        name: '[count-drift] docs-index uses host-neutral skill invocation syntax',
        skip: !HAS_PROJECT_REFERENCE_INDEX,
        fn: () => {
            // Given: source paths and host-prefixed invocations both contain a slash.
            const findInvocations = text => text.match(/[$/]scan\b(?![\\/])/g) || [];
            // When: checking navigation, preserve valid paths but reject commands.
            if (findInvocations('`.claude/skills/scan/tests/README.md`').length !== 0 ||
                findInvocations('`/scan --target=docs-index` and `$scan --target=docs-index`').length !== 2) {
                throw new Error('Invocation check must distinguish source navigation from host-specific commands');
            }
            // Then: the authored index uses host-neutral invocation syntax.
            const docsIndex = fs.readFileSync(DOCS_INDEX_PATH, 'utf8');
            const hostSpecificCommands = findInvocations(docsIndex);
            if (hostSpecificCommands.length > 0) {
                throw new Error(
                    `docs-index-reference.md contains host-specific scan invocation(s): ${hostSpecificCommands.join(', ')}.\n` +
                    `Shared generated docs MUST use the bare \`scan --target=docs-index\` skill name so each AI host can apply its own invocation prefix.`
                );
            }
        }
    }
];

module.exports = {
    name: 'count-drift',
    tests
};
