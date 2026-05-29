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
            const docsReadme = fs.readFileSync(
                path.join(REPO_ROOT, '.claude', 'docs', 'README.md'),
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
        }
    }
];

module.exports = {
    name: 'count-drift',
    tests
};
