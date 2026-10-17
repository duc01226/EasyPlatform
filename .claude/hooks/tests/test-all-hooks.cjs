#!/usr/bin/env node
/**
 * Comprehensive Test Suite for Claude Hooks (Enhanced)
 *
 * Tests all hooks in the Claude Code integration.
 * Covers: SessionStart, SessionEnd, SubagentStart, UserPromptSubmit,
 *         PreToolUse, PostToolUse, PreCompact, Notification
 *
 * Enhanced features:
 * - Output validation (JSON, system-reminder, markdown)
 * - State verification (file writes, state persistence)
 * - Edge cases (empty, null, malformed JSON, Unicode)
 *
 * Usage: node test-all-hooks.cjs [--verbose] [--filter=<pattern>] [--validate-output] [--verify-state]
 *
 * Exit codes:
 *   0 - All tests passed
 *   1 - One or more tests failed
 *
 * @version 2.0.0
 * @date 2026-01-12
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Import test utilities
const {
    assertEqual,
    assertDeepEqual,
    assertTrue,
    assertFalse,
    assertContains,
    assertNotContains,
    assertJsonValid,
    assertJsonHasKey,
    assertExitCode,
    assertMatches,
    createTempDir,
    cleanupTempDir,
    cleanupAllTestDirs,
    writeTestFile,
    readTestFile,
    fileExists,
    parseBlockingDecision,
    parseSubagentOutput,
    containsSystemReminder,
    containsMarkdownSection,
    extractJsonFromOutput,
    verifyFileCreated,
    verifyFileContent,
    verifyJsonFile,
    verifyJsonlFile,
    loadFixture,
    setupFixtures,
    buildBashPayload,
    buildEditPayload,
    buildReadPayload,
    buildWritePayload,
    buildTodoPayload,
    buildUserPromptPayload,
    buildSessionPayload,
    TestGroup,
    TestSuite
} = require('./helpers/test-utils.cjs');

// ============================================================================
// Configuration
// ============================================================================

const HOOKS_DIR = path.join(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');
const FILTER = process.argv.find(a => a.startsWith('--filter='))?.split('=')[1] || '';
const VALIDATE_OUTPUT = process.argv.includes('--validate-output');
const VERIFY_STATE = process.argv.includes('--verify-state');

// Colors for terminal output
const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    dim: '\x1b[2m',
    bold: '\x1b[1m',
    cyan: '\x1b[36m'
};

// ============================================================================
// Test Runner Infrastructure
// ============================================================================

/**
 * Run a hook with given input and return result
 * @param {string} hookFile - Hook filename
 * @param {object} input - Stdin input object
 * @param {object} options - Additional options (cwd, env, timeout)
 * @returns {Promise<{code: number, stdout: string, stderr: string, duration: number}>}
 */
async function runHook(hookFile, input, options = {}) {
    return new Promise(resolve => {
        const hookPath = path.join(HOOKS_DIR, hookFile);

        if (!fs.existsSync(hookPath)) {
            resolve({
                code: -1,
                stdout: '',
                stderr: `Hook not found: ${hookFile}`,
                duration: 0
            });
            return;
        }

        const timeout = options.timeout || 10000;
        const env = { ...process.env, ...options.env };
        const startTime = Date.now();

        const proc = spawn('node', [hookPath, ...(options.args || [])], {
            cwd: options.cwd || process.cwd(),
            env,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        let killed = false;

        const timer = setTimeout(() => {
            killed = true;
            proc.kill('SIGKILL');
        }, timeout);

        proc.stdout.on('data', data => {
            stdout += data.toString();
        });
        proc.stderr.on('data', data => {
            stderr += data.toString();
        });

        proc.on('close', code => {
            clearTimeout(timer);
            const duration = Date.now() - startTime;
            resolve({
                code: killed ? -2 : code || 0,
                stdout,
                stderr,
                duration,
                killed
            });
        });

        proc.on('error', err => {
            clearTimeout(timer);
            resolve({
                code: -1,
                stdout: '',
                stderr: err.message,
                duration: Date.now() - startTime
            });
        });

        // Send input via stdin
        if (input !== null && input !== undefined) {
            const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
            proc.stdin.write(inputStr);
        }
        proc.stdin.end();
    });
}

/**
 * Test result tracking
 */
const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: [],
    outputValidation: { passed: 0, failed: 0 },
    stateVerification: { passed: 0, failed: 0 }
};

/**
 * Log test result
 */
function logResult(name, passed, message = '') {
    const icon = passed ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
    console.log(`${icon} ${name}${message ? `: ${message}` : ''}`);

    results.tests.push({ name, passed, message });
    if (passed) results.passed++;
    else results.failed++;
}

/**
 * Log output validation result
 */
function logOutputValidation(name, passed, message = '') {
    if (VALIDATE_OUTPUT) {
        const icon = passed ? `${COLORS.cyan}◉${COLORS.reset}` : `${COLORS.yellow}○${COLORS.reset}`;
        console.log(`  ${icon} Output: ${name}${message ? ` (${message})` : ''}`);
        if (passed) results.outputValidation.passed++;
        else results.outputValidation.failed++;
    }
}

/**
 * Log state verification result
 */
function logStateVerification(name, passed, message = '') {
    if (VERIFY_STATE) {
        const icon = passed ? `${COLORS.cyan}●${COLORS.reset}` : `${COLORS.yellow}○${COLORS.reset}`;
        console.log(`  ${icon} State: ${name}${message ? ` (${message})` : ''}`);
        if (passed) results.stateVerification.passed++;
        else results.stateVerification.failed++;
    }
}

/**
 * Skip test
 */
function skipTest(name, reason) {
    console.log(`${COLORS.yellow}○${COLORS.reset} ${name}: ${COLORS.dim}${reason}${COLORS.reset}`);
    results.skipped++;
}

/**
 * Log section header
 */
function logSection(title) {
    console.log(`\n${COLORS.bold}${COLORS.blue}━━━ ${title} ━━━${COLORS.reset}\n`);
}

/**
 * Log subsection
 */
function logSubsection(title) {
    console.log(`\n  ${COLORS.dim}─── ${title} ───${COLORS.reset}`);
}

async function runNodeScript(scriptName, args = []) {
    return new Promise(resolve => {
        const scriptPath = path.join(__dirname, scriptName);
        const proc = spawn(process.execPath, [scriptPath, ...args], {
            cwd: path.resolve(__dirname, '..', '..', '..'),
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', data => { stdout += data.toString(); });
        proc.stderr.on('data', data => { stderr += data.toString(); });
        proc.on('close', code => resolve({ code: code || 0, stdout, stderr }));
        proc.on('error', err => resolve({ code: -1, stdout: '', stderr: err.message }));
    });
}

// ============================================================================
// Test Cases: Session Lifecycle
// ============================================================================

async function testSessionInit() {
    logSection('SessionStart: session-init.cjs');

    // Test 1: Startup trigger
    {
        const result = await runHook('session-init.cjs', { source: 'startup' });
        logResult('Startup trigger exits 0', result.code === 0);
        logOutputValidation('No stdout context injection', result.stdout === '');
    }

    // Test 2: Resume trigger
    {
        const result = await runHook('session-init.cjs', { source: 'resume' });
        logResult('Resume trigger exits 0', result.code === 0);
    }

    // Test 3: Clear trigger (should skip processing)
    {
        const result = await runHook('session-init.cjs', { source: 'clear' });
        logResult('Clear trigger exits 0', result.code === 0);
    }

    // Test 4: Compact trigger
    {
        const result = await runHook('session-init.cjs', { source: 'compact' });
        logResult('Compact trigger exits 0', result.code === 0);
    }

    // Test 5: Empty input
    {
        const result = await runHook('session-init.cjs', null);
        logResult('Empty input exits 0', result.code === 0);
    }

    // Edge cases
    logSubsection('Edge Cases');

    // Test 6: Malformed JSON
    {
        const result = await runHook('session-init.cjs', 'not valid json');
        logResult('Malformed JSON handled', result.code === 0);
    }

    // Test 7: Unknown source
    {
        const result = await runHook('session-init.cjs', {
            source: 'unknown_source'
        });
        logResult('Unknown source handled', result.code === 0);
    }

    // Test 8: Empty object
    {
        const result = await runHook('session-init.cjs', {});
        logResult('Empty object handled', result.code === 0);
    }
}

async function testGraphSessionInit() {
    logSection('SessionStart: graph-session-init.cjs (config guard)');

    // Test 1: Config NOT populated → silent exit (no graph messages)
    {
        const tmpDir = createTempDir();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            fs.mkdirSync(docsDir, { recursive: true });
            fs.writeFileSync(path.join(docsDir, 'project-config.json'), JSON.stringify({ project: { name: '' }, modules: [] }));
            const result = await runHook('graph-session-init.cjs', { source: 'startup' }, { env: { CLAUDE_PROJECT_DIR: tmpDir }, timeout: 15000 });
            logResult('Exits 0 when config not populated', result.code === 0);
            logResult('No graph output when config not populated', !result.stdout.includes('graph') && !result.stdout.includes('code-graph'));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 2: Config populated and graph active → stays silent. Runs over a temp fixture project (a
    // populated config plus a built graph.db, so the mode is 'active'), never this repository: the
    // graph venv now lives in the per-user cache, so a real run could create a venv and pip-install
    // into the developer's cache. Every process graph-utils would start goes to the spawn-stub log
    // instead, and every home, cache and temp variable points into the fixture (Portable Test Contract).
    {
        const tmpDir = createTempDir();
        try {
            const home = path.join(tmpDir, 'home');
            const cache = path.join(tmpDir, 'cache');
            const temp = path.join(tmpDir, 'temp');
            for (const dir of [path.join(tmpDir, '.claude'), path.join(tmpDir, 'docs'), path.join(tmpDir, '.code-graph'), home, cache, temp]) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(path.join(tmpDir, 'docs', 'project-config.json'), JSON.stringify({ project: { name: 'fixture-project' } }));
            fs.writeFileSync(path.join(tmpDir, '.code-graph', 'graph.db'), '');
            const stubLog = path.join(tmpDir, 'spawn-stub.jsonl');
            const env = {
                CLAUDE_PROJECT_DIR: tmpDir,
                HOME: home, USERPROFILE: home, LOCALAPPDATA: cache, XDG_CACHE_HOME: cache,
                TMPDIR: temp, TEMP: temp, TMP: temp
            };
            for (const key of Object.keys(process.env)) {
                if (/^CK_/i.test(key)) env[key] = ''; // inherited feature switches blanked
            }
            env.CK_GRAPH_SPAWN_STUB = stubLog;
            const result = await runHook('graph-session-init.cjs', { source: 'startup' }, { cwd: tmpDir, timeout: 30000, env });
            logResult('Exits 0 when config populated', result.code === 0);
            logResult('No graph output when config populated', result.stdout === '');
            // Control: the populated, active path really ran (it tried to start the graph toolchain)
            const starts = fs.existsSync(stubLog) ? fs.readFileSync(stubLog, 'utf8').trim().split('\n').filter(Boolean) : [];
            logResult('Populated config reaches the graph toolchain check (stubbed, nothing started)', starts.length > 0);
            logResult('Nothing written to the per-user graph cache', fs.readdirSync(cache).length === 0);
        } finally {
            cleanupTempDir(tmpDir);
        }
    }
}

function createMarkedTestProject() {
    const tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, '.claude'));
    return tmpDir;
}

/**
 * Read `session-init-helpers.SKELETON` as it would be built inside a throwaway project
 * whose `.claude/.ck.json` declares `portability.docsIndexPath`.
 *
 * Must run in a CHILD process: the helper module resolves the project root once at load
 * time, so the parent runner's already-loaded copy could never observe the fixture.
 *
 * @param {string|null} docsIndexPath - configured docs-index path, or null for the default
 * @returns {object} the skeleton object the fixture project would be initialised with
 */
function readSkeletonWithDocsIndex(docsIndexPath) {
    const tmpDir = createMarkedTestProject();
    try {
        if (docsIndexPath) {
            fs.writeFileSync(
                path.join(tmpDir, '.claude', '.ck.json'),
                JSON.stringify({ portability: { docsIndexPath } }, null, 2),
                'utf-8'
            );
        }
        const helperPath = path.join(HOOKS_DIR, 'lib', 'session-init-helpers.cjs');
        const script = `process.stdout.write(JSON.stringify(require(${JSON.stringify(helperPath)}).SKELETON));`;
        const out = require('child_process').execFileSync(process.execPath, ['-e', script], {
            cwd: tmpDir,
            env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir },
            encoding: 'utf-8'
        });
        return JSON.parse(out);
    } finally {
        cleanupTempDir(tmpDir);
    }
}

async function testProjectConfigInit() {
    logSection('SessionStart: session-init-docs.cjs (required config/reference docs)');

    // Test 1: When populated config exists, should exit silently
    {
        const result = await runHook('session-init-docs.cjs', {
            source: 'startup'
        });
        logResult('Exits 0 when config exists', result.code === 0);
        // In our repo docs/project-config.json is populated, so no AI directive expected
        logResult('No AI directive when config populated', !result.stdout.includes('AI ACTION REQUIRED'));
    }

    // Test 2: SessionStart must not invent a required config or materialize docs before project-init.
    {
        const tmpDir = createMarkedTestProject();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            fs.mkdirSync(docsDir, { recursive: true });
            const result = await runHook(
                'session-init-docs.cjs',
                { source: 'startup' },
                {
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                }
            );
            logResult('Exits 0 when config missing', result.code === 0);
            logResult('Silent creation (no verbose output)', !result.stdout.includes('Project Config Initialized'));
            // UserPromptSubmit blocks normal work; SessionStart itself is side-effect-free.
            logResult('No advisory text (prompt gate owns required-config enforcement)', !result.stdout.includes('MANDATORY MUST ATTENTION'));

            // A missing required config must remain missing until its setup owner creates it.
            const configPath = path.join(docsDir, 'project-config.json');
            const configExists = fs.existsSync(configPath);
            logResult('Does not create a config skeleton', !configExists);
            logResult('Does not create reference docs while config is missing', !fs.existsSync(path.join(tmpDir, 'docs', 'project-reference')));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 2a: A present but invalid config also prevents SessionStart writes.
    {
        const tmpDir = createMarkedTestProject();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            fs.mkdirSync(docsDir, { recursive: true });
            const configPath = path.join(docsDir, 'project-config.json');
            const invalidConfig = JSON.stringify({ project: { name: '  ' } });
            fs.writeFileSync(configPath, invalidConfig);
            const result = await runHook(
                'session-init-docs.cjs',
                { source: 'startup' },
                { env: { CLAUDE_PROJECT_DIR: tmpDir } }
            );
            logResult('Exits 0 when config is invalid', result.code === 0);
            logResult('Preserves invalid config for project-init repair', fs.readFileSync(configPath, 'utf-8') === invalidConfig);
            logResult('Does not create reference docs while config is invalid', !fs.existsSync(path.join(docsDir, 'project-reference')));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 2b: a bootstrap skeleton contains identity only, with no invented
    // stack/capability sections or task-specific reference-doc selection.
    {
        const relocated = readSkeletonWithDocsIndex('documentation/reference/docs-index-reference.md');
        logResult(
            'Skeleton derives a non-empty project identity',
            typeof relocated.project?.name === 'string' && relocated.project.name.trim().length > 0
        );
        logResult(
            'Skeleton omits unknown framework and design-system capabilities',
            relocated.framework === undefined && relocated.designSystem === undefined
        );
        logResult(
            'Skeleton omits optional doc roots and reference-doc selection',
            relocated.docsRoots === undefined && relocated.referenceDocs === undefined
        );
        logResult(
            'Skeleton carries no framework path derived from optional docs-index settings',
            relocated.framework === undefined
        );
    }

    // Test 2c: TC-DOCROOT-074 — R9 regression guard. The skeleton SEEDS, it never
    // overwrites: an existing config keeps its customised values across an init run.
    {
        const tmpDir = createMarkedTestProject();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            fs.mkdirSync(docsDir, { recursive: true });
            fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
            const configPath = path.join(docsDir, 'project-config.json');
            fs.writeFileSync(
                configPath,
                JSON.stringify(
                    {
                        schemaVersion: 2,
                        project: { name: 'relocated', description: 'x', languages: ['js'], packageManagers: ['npm'] },
                        framework: { name: 'x', codeReviewDoc: 'custom/rules.md' },
                        docsRoots: { projectReference: { path: 'documentation/reference' } }
                    },
                    null,
                    2
                ) + '\n',
                'utf-8'
            );
            await runHook('session-init-docs.cjs', { source: 'startup' }, { env: { CLAUDE_PROJECT_DIR: tmpDir } });
            const after = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            logResult(
                'TC-DOCROOT-074 existing framework.codeReviewDoc survives an init run',
                after.framework.codeReviewDoc === 'custom/rules.md'
            );
            logResult(
                'TC-DOCROOT-074b existing docsRoots.projectReference.path survives an init run',
                after.docsRoots?.projectReference?.path === 'documentation/reference'
            );
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 3: Missing required config must not create a config skeleton or docs.
    {
        const tmpDir = createMarkedTestProject();
        // Add a content directory so hasProjectContent() guard passes
        fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
        try {
            const result = await runHook(
                'session-init-docs.cjs',
                { source: 'startup' },
                {
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                }
            );
            logResult('Exits 0 when docs/ missing', result.code === 0);
            logResult('Does not create docs/ while required config is missing', !fs.existsSync(path.join(tmpDir, 'docs')));
            logResult('Does not create a config skeleton', !fs.existsSync(path.join(tmpDir, 'docs', 'project-config.json')));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 4: Empty input handled gracefully
    {
        const result = await runHook('session-init-docs.cjs', null);
        logResult('Empty input exits 0', result.code === 0);
    }

    // Test 5: Repeated SessionStart runs leave a missing required config untouched.
    {
        const tmpDir = createMarkedTestProject();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            fs.mkdirSync(docsDir, { recursive: true });

            // First run — missing config is left for the project-init repair route.
            await runHook(
                'session-init-docs.cjs',
                { source: 'startup' },
                {
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                }
            );

            // Second run — still performs no config/reference writes and emits no advice.
            const result = await runHook(
                'session-init-docs.cjs',
                { source: 'startup' },
                {
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                }
            );
            logResult('Second run exits 0', result.code === 0);
            logResult('Repeated run leaves config missing', !fs.existsSync(path.join(docsDir, 'project-config.json')));
            logResult('Second run silent (prompt gate owns enforcement)', result.stdout.trim() === '');
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 6: The minimal valid config is sufficient for SessionStart defaults.
    {
        const tmpDir = createMarkedTestProject();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            fs.mkdirSync(docsDir, { recursive: true });
            const minimalConfig = { project: { name: 'Minimal Fixture Project' } };
            fs.writeFileSync(path.join(docsDir, 'project-config.json'), JSON.stringify(minimalConfig, null, 2), 'utf-8');

            const result = await runHook(
                'session-init-docs.cjs',
                { source: 'startup' },
                {
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                }
            );
            logResult('Minimal valid config allows SessionStart defaults without an AI directive', !result.stdout.includes('AI ACTION REQUIRED'));
            logResult(
                'Always-on docs index is created independently of referenceDocs',
                fs.existsSync(path.join(docsDir, 'project-reference', 'docs-index-reference.md'))
            );
            logResult('Always-on lessons are created independently of referenceDocs', fs.existsSync(path.join(docsDir, 'project-reference', 'lessons.md')));
            const refDir = path.join(docsDir, 'project-reference');
            const names = fs.existsSync(refDir) ? fs.readdirSync(refDir).sort() : [];
            logResult(
                'Minimal config does not auto-create backend/frontend/SCSS/E2E/spec references',
                !names.some(name => /^(backend-patterns|frontend-patterns|scss-styling|e2e-test|feature-spec)-/.test(name))
            );
        } finally {
            cleanupTempDir(tmpDir);
        }
    }
}

async function testSessionEnd() {
    logSection('SessionEnd: session-end.cjs');

    // Test 1: Clear reason
    {
        const result = await runHook('session-end.cjs', {
            reason: 'clear',
            session_id: 'test-session-123'
        });
        logResult('Clear reason exits 0', result.code === 0);
    }

    // Test 2: Exit reason
    {
        const result = await runHook('session-end.cjs', { reason: 'exit' });
        logResult('Exit reason exits 0', result.code === 0);
    }

    // Test 3: Compact reason
    {
        const result = await runHook('session-end.cjs', { reason: 'compact' });
        logResult('Compact reason exits 0', result.code === 0);
    }

    // Test 4: No reason provided
    {
        const result = await runHook('session-end.cjs', {});
        logResult('No reason handled', result.code === 0);
    }

    // Test 5: With session_id
    {
        const result = await runHook('session-end.cjs', {
            reason: 'exit',
            session_id: 'test-abc-123'
        });
        logResult('With session_id handled', result.code === 0);
    }
}

// ============================================================================
// Test Cases: Subagent — not covered here
// Agent bootstrap guidance lives in agent .md SYNC:agent-bootstrap blocks. The
// SubagentStart hooks that exist (protocol-inject-*.cjs) are tested in
// suites/protocol-delivery.test.cjs and suites/protocol-host-mapping.test.cjs;
// lifecycle asserts (state libs, session-end) are in suites/lifecycle.test.cjs.
// ============================================================================

// ============================================================================
// Test Cases: User Input
// ============================================================================

async function testInitPromptGate() {
    logSection('UserPromptSubmit: init-prompt-gate.cjs (project-context router)');
    // A project-owned root is complete as it stands: the gate checks that the root files exist, not what they hold.
    const completeAgentFileStub = '# TestProject\n\nProject notes.\n';
    const setupPopulatedPromptGateProject = tmpDir => {
        const docsDir = path.join(tmpDir, 'docs');
        const srcDir = path.join(tmpDir, 'src');
        const graphDir = path.join(tmpDir, '.code-graph');
        fs.mkdirSync(docsDir, { recursive: true });
        fs.mkdirSync(srcDir, { recursive: true });
        fs.mkdirSync(graphDir, { recursive: true });
        fs.writeFileSync(
            path.join(docsDir, 'project-config.json'),
            JSON.stringify({
                project: { name: 'TestProject' },
                modules: [{ name: 'mod', kind: 'library', pathRegex: 'src/' }]
            })
        );
        fs.writeFileSync(path.join(graphDir, 'graph.db'), 'fake-db');
        fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), completeAgentFileStub);
        fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), completeAgentFileStub);
        const tmpClaudeDir = path.join(tmpDir, 'tmp', 'claude-temp');
        fs.mkdirSync(tmpClaudeDir, { recursive: true });
        return tmpClaudeDir;
    };
    const writeScanStaleFlag = tmpClaudeDir => {
        fs.writeFileSync(
            path.join(tmpClaudeDir, '.scan-stale'),
            JSON.stringify({
                staleDays: 60,
                docs: [{ filename: 'backend-patterns-reference.md', ageDays: 95, scanSkill: 'scan --target=backend-patterns' }],
                checkedAt: new Date().toISOString()
            }, null, 2)
        );
    };
    const runInvalidConfigPrompt = async prompt => {
        const tmpDir = createMarkedTestProject();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            fs.mkdirSync(docsDir, { recursive: true });
            fs.writeFileSync(path.join(docsDir, 'project-config.json'), JSON.stringify({ project: { name: '' } }));
            return await runHook('init-prompt-gate.cjs', { prompt }, { env: { CLAUDE_PROJECT_DIR: tmpDir } });
        } finally {
            cleanupTempDir(tmpDir);
        }
    };

    // Test 1: Populated config → exit 0 (silent pass-through)
    {
        const tmpDir = createMarkedTestProject();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            const srcDir = path.join(tmpDir, 'src');
            const graphDir = path.join(tmpDir, '.code-graph');
            fs.mkdirSync(docsDir, { recursive: true });
            fs.mkdirSync(srcDir, { recursive: true }); // hasProjectContent needs a content dir
            fs.mkdirSync(graphDir, { recursive: true });
            fs.writeFileSync(
                path.join(docsDir, 'project-config.json'),
                JSON.stringify({
                    project: { name: 'TestProject' },
                    modules: [{ name: 'mod', kind: 'library', pathRegex: 'src/' }]
                })
            );
            fs.writeFileSync(path.join(graphDir, 'graph.db'), 'fake-db');
            // Root agent files present and complete so the agent-files gate passes through to the gate under test.
            fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), completeAgentFileStub);
            fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), completeAgentFileStub);
            const result = await runHook('init-prompt-gate.cjs', { prompt: 'implement feature X' }, { env: { CLAUDE_PROJECT_DIR: tmpDir } });
            logResult('Exit 0 when config populated', result.code === 0);
            logResult('No stderr when config populated', result.stderr.trim() === '');
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 2: Schema-invalid config blocks normal work with an explicit repair route.
    {
        const tmpDir = createMarkedTestProject();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            const srcDir = path.join(tmpDir, 'src');
            fs.mkdirSync(docsDir, { recursive: true });
            fs.mkdirSync(srcDir, { recursive: true });
            // Write skeleton config with empty project name
            fs.writeFileSync(
                path.join(docsDir, 'project-config.json'),
                JSON.stringify({
                    project: { name: '' },
                    modules: [],
                    backendServices: { serviceMap: {} }
                })
            );
            const result = await runHook(
                'init-prompt-gate.cjs',
                { prompt: 'implement feature X' },
                {
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                }
            );
            logResult('Schema-invalid config warns without blocking normal work', !result.stdout.includes('"decision"') && result.stdout.includes('is invalid'));
            logResult('Warning identifies project-init repair route', result.stdout.includes('/project-init'));
            logResult('Warning names the non-empty project identity requirement', result.stdout.includes('project.name'));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 3: Explicit project-config repair command is allowed through invalid config.
    {
        const tmpDir = createMarkedTestProject();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            fs.mkdirSync(docsDir, { recursive: true });
            fs.writeFileSync(
                path.join(docsDir, 'project-config.json'),
                JSON.stringify({
                    project: { name: '' },
                    modules: []
                })
            );
            const result = await runHook(
                'init-prompt-gate.cjs',
                { prompt: '/project-config' },
                {
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                }
            );
            logResult('Repair route: /project-config passes through', result.code === 0 && result.stdout === '');
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 3a: The Codex skill prefix is supported, but an incidental mention is not a bypass.
    {
        const result = await runInvalidConfigPrompt('$project-init');
        logResult('Repair route: Codex $project-init invocation passes through', result.code === 0 && result.stdout === '');

        const incidental = await runInvalidConfigPrompt('Implement this feature; /project-init is a later setup step.');
        logResult('Incidental repair-command mention does not suppress the warning', !incidental.stdout.includes('"decision"') && incidental.stdout.includes('is invalid'));
    }

    // Test 4: Scan cannot bypass the required config file.
    {
        const tmpDir = createMarkedTestProject();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            fs.mkdirSync(docsDir, { recursive: true });
            fs.writeFileSync(
                path.join(docsDir, 'project-config.json'),
                JSON.stringify({
                    project: { name: '' },
                    modules: []
                })
            );
            const result = await runHook(
                'init-prompt-gate.cjs',
                { prompt: '/scan --target=backend-patterns' },
                {
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                }
            );
            logResult('Scan still warns that the config is invalid', !result.stdout.includes('"decision"') && result.stdout.includes('is invalid'));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 5: A dismiss phrase cannot bypass the required config file.
    {
        const tmpDir = createMarkedTestProject();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            const claudeDir = path.join(tmpDir, '.claude');
            fs.mkdirSync(docsDir, { recursive: true });
            fs.mkdirSync(claudeDir, { recursive: true });
            fs.writeFileSync(
                path.join(docsDir, 'project-config.json'),
                JSON.stringify({
                    project: { name: '' },
                    modules: []
                })
            );
            const result = await runHook(
                'init-prompt-gate.cjs',
                { prompt: 'skip init' },
                {
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                }
            );
            logResult('Dismiss: skip init still warns without valid config', !result.stdout.includes('"decision"') && result.stdout.includes('is invalid'));
            const flagExists = fs.existsSync(path.join(tmpDir, 'tmp', 'claude-temp', '.init-dismissed'));
            logResult('Dismiss: no flag created for missing/invalid config', !flagExists);
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 6: An existing dismiss flag cannot bypass invalid config.
    {
        const tmpDir = createMarkedTestProject();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            const claudeDir = path.join(tmpDir, '.claude');
            fs.mkdirSync(docsDir, { recursive: true });
            fs.mkdirSync(claudeDir, { recursive: true });
            fs.writeFileSync(
                path.join(docsDir, 'project-config.json'),
                JSON.stringify({
                    project: { name: '' },
                    modules: []
                })
            );
            // Write a fresh dismiss flag (now in tmp/claude-temp/)
            const tmpClaudeDir = path.join(tmpDir, 'tmp', 'claude-temp');
            fs.mkdirSync(tmpClaudeDir, { recursive: true });
            fs.writeFileSync(path.join(tmpClaudeDir, '.init-dismissed'), new Date().toISOString());
            const result = await runHook(
                'init-prompt-gate.cjs',
                { prompt: 'implement feature X' },
                {
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                }
            );
            logResult('Dismiss: active flag cannot suppress the invalid-config warning', !result.stdout.includes('"decision"') && result.stdout.includes('is invalid'));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 7: An expired dismiss flag also cannot bypass invalid config.
    {
        const tmpDir = createMarkedTestProject();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            const claudeDir = path.join(tmpDir, '.claude');
            fs.mkdirSync(docsDir, { recursive: true });
            fs.mkdirSync(claudeDir, { recursive: true });
            fs.writeFileSync(
                path.join(docsDir, 'project-config.json'),
                JSON.stringify({
                    project: { name: '' },
                    modules: []
                })
            );
            // Write a dismiss flag and backdate it to 2 days ago (now in tmp/claude-temp/)
            const tmpClaudeDir2 = path.join(tmpDir, 'tmp', 'claude-temp');
            fs.mkdirSync(tmpClaudeDir2, { recursive: true });
            const flagPath = path.join(tmpClaudeDir2, '.init-dismissed');
            fs.writeFileSync(flagPath, 'old');
            const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
            fs.utimesSync(flagPath, twoDaysAgo, twoDaysAgo);
            const result = await runHook(
                'init-prompt-gate.cjs',
                { prompt: 'implement feature X' },
                {
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                }
            );
            logResult('Dismiss: expired flag cannot suppress the invalid-config warning', !result.stdout.includes('"decision"') && result.stdout.includes('is invalid'));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 8: PORTABILITY INVARIANT — a project with NO config is a supported adopter
    // state, not an error. The gate emits a one-a-day plaintext notice pointing the model
    // at repository evidence and lets the prompt through. (This asserted a block until the
    // config was made optional; blocking is now reserved for a config that EXISTS and does
    // not validate — covered by tests 5–7 above.)
    {
        const tmpDir = createMarkedTestProject();
        try {
            fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true });
            fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
            // No project-config.json at all
            const result = await runHook(
                'init-prompt-gate.cjs',
                { prompt: 'implement feature X' },
                {
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                }
            );
            logResult('Missing config file does NOT block normal work', !/"decision"\s*:\s*"block"/.test(result.stdout));
            logResult('Missing config notice names the config path', result.stdout.includes('docs/project-config.json'));
            logResult('Missing config notice points at repository evidence', result.stdout.includes('repository evidence'));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 9: Empty/malformed input → exit 0 (fail-open)
    {
        const result = await runHook('init-prompt-gate.cjs', '');
        logResult('Empty input: fail-open exit 0', result.code === 0);
    }
    {
        const result = await runHook('init-prompt-gate.cjs', 'not-json');
        logResult('Malformed input: fail-open exit 0', result.code === 0);
    }

    // ── Reference Doc Scan Gate: Dismissal Tests ──
    logSubsection('Reference Doc Scan Gate — Dismissal');

    // Test 10: "skip scan" writes a 7-day dismiss flag under tmp/claude-temp
    {
        const tmpDir = createMarkedTestProject();
        try {
            const tmpClaudeDir = setupPopulatedPromptGateProject(tmpDir);
            writeScanStaleFlag(tmpClaudeDir);
            const dismissPath = path.join(tmpClaudeDir, '.scan-stale-dismissed');
            const result = await runHook('init-prompt-gate.cjs', { prompt: 'skip scan' }, { env: { CLAUDE_PROJECT_DIR: tmpDir } });
            logResult('Skip scan dismiss exits 0', result.code === 0);
            logResult('Skip scan reports 7-day dismissal', result.stdout.includes('Gate dismissed for 7 days'));
            logResult('Skip scan creates temp dismiss file', fs.existsSync(dismissPath));
            const dismissState = JSON.parse(fs.readFileSync(dismissPath, 'utf-8'));
            logResult('Skip scan stores ttlDays=7', dismissState.ttlDays === 7);
            logResult('Skip scan stores dismissedAt timestamp', typeof dismissState.dismissedAt === 'string' && dismissState.dismissedAt.length > 0);
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 11: 6-day-old scan dismiss flag still suppresses stale-doc output
    {
        const tmpDir = createMarkedTestProject();
        try {
            const tmpClaudeDir = setupPopulatedPromptGateProject(tmpDir);
            writeScanStaleFlag(tmpClaudeDir);
            const dismissedAt = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
            fs.writeFileSync(
                path.join(tmpClaudeDir, '.scan-stale-dismissed'),
                JSON.stringify({ dismissedAt: dismissedAt.toISOString(), ttlDays: 7 }, null, 2)
            );
            const result = await runHook('init-prompt-gate.cjs', { prompt: 'implement feature X' }, { env: { CLAUDE_PROJECT_DIR: tmpDir } });
            logResult('Active scan dismiss allows prompt', result.code === 0);
            logResult('Active scan dismiss suppresses stale-doc warning', !result.stdout.includes('Reference docs are stale'));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 12: 8-day-old scan dismiss flag expires and stale-doc output returns
    {
        const tmpDir = createMarkedTestProject();
        try {
            const tmpClaudeDir = setupPopulatedPromptGateProject(tmpDir);
            writeScanStaleFlag(tmpClaudeDir);
            const dismissedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
            fs.writeFileSync(
                path.join(tmpClaudeDir, '.scan-stale-dismissed'),
                JSON.stringify({ dismissedAt: dismissedAt.toISOString(), ttlDays: 7 }, null, 2)
            );
            const result = await runHook('init-prompt-gate.cjs', { prompt: 'implement feature X' }, { env: { CLAUDE_PROJECT_DIR: tmpDir } });
            logResult('Expired scan dismiss allows prompt', result.code === 0);
            logResult('Expired scan dismiss shows stale-doc warning', result.stdout.includes('Reference docs are stale'));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // ── Graph Gate: Config Guard Tests ──
    logSubsection('Graph Gate — Config Guard');

    // The graph-not-built note is opt-in (hooks.codeGraph.enabled): it shows only in mode "on"
    // without a graph; the default "auto" stays silent until a graph exists.
    const writeGraphGateProject = (tmpDir, codeGraphEnabled) => {
        const docsDir = path.join(tmpDir, 'docs');
        const srcDir = path.join(tmpDir, 'src');
        fs.mkdirSync(docsDir, { recursive: true });
        fs.mkdirSync(srcDir, { recursive: true }); // hasProjectContent needs a content dir
        const config = {
            project: { name: 'TestProject' },
            modules: [{ name: 'mod', kind: 'library', pathRegex: 'src/' }]
        };
        if (codeGraphEnabled !== undefined) config.hooks = { codeGraph: { enabled: codeGraphEnabled } };
        fs.writeFileSync(path.join(docsDir, 'project-config.json'), JSON.stringify(config));
        // Root agent files present and complete so the agent-files gate passes through to the graph gate under test.
        fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), completeAgentFileStub);
        fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), completeAgentFileStub);
    };
    // The once-per-session note marker lives under the OS temp dir: keep it inside the fixture.
    const graphGateEnv = tmpDir => ({ CLAUDE_PROJECT_DIR: tmpDir, TMPDIR: tmpDir, TEMP: tmpDir, TMP: tmpDir });

    // Test 13: Config populated + graph mode "on" + no graph.db + no dismiss → exit 0 with graph guidance
    {
        const tmpDir = createMarkedTestProject();
        try {
            writeGraphGateProject(tmpDir, 'on');
            // No .code-graph/graph.db, no dismiss flag
            const result = await runHook('init-prompt-gate.cjs', { prompt: 'implement feature X', session_id: 'test-13' }, { env: graphGateEnv(tmpDir) });
            logResult('Graph gate warns/allows when mode on + config populated + no graph.db', result.code === 0);
            logResult('Graph guidance mentions /graph-code --mode=build', result.stdout.includes('/graph-code --mode=build'));
            logResult('Graph guidance avoids skip prompt', !result.stdout.includes('skip graph'));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 13b: Config populated + graph mode left at the default (auto) + no graph.db → no graph note
    {
        const tmpDir = createMarkedTestProject();
        try {
            writeGraphGateProject(tmpDir, undefined);
            const result = await runHook('init-prompt-gate.cjs', { prompt: 'implement feature X', session_id: 'test-13b' }, { env: graphGateEnv(tmpDir) });
            logResult('Graph gate allows when default auto mode + no graph.db', result.code === 0);
            logResult('Default auto mode without a graph shows no graph note', !result.stdout.includes('Knowledge graph not built'));
            logResult('Default auto mode without a graph does not route to /graph-code --mode=build', !result.stdout.includes('/graph-code --mode=build'));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 14: Config NOT populated + no graph.db → exit 0 with config guidance (NOT graph)
    {
        const tmpDir = createMarkedTestProject();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            const srcDir = path.join(tmpDir, 'src');
            fs.mkdirSync(docsDir, { recursive: true });
            fs.mkdirSync(srcDir, { recursive: true });
            fs.writeFileSync(path.join(docsDir, 'project-config.json'), JSON.stringify({ project: { name: '' }, modules: [] }));
            const result = await runHook('init-prompt-gate.cjs', { prompt: 'implement feature X' }, { env: { CLAUDE_PROJECT_DIR: tmpDir } });
            logResult('Invalid config warns before graph guidance', !result.stdout.includes('"decision"') && result.stdout.includes('is invalid'));
            logResult('Warning is config repair (not graph setup)', result.stdout.includes('/project-config') && !result.stdout.includes('/graph-code --mode=build'));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 15: Config populated + graph.db exists → exit 0 (both gates pass)
    {
        const tmpDir = createMarkedTestProject();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            const srcDir = path.join(tmpDir, 'src');
            const graphDir = path.join(tmpDir, '.code-graph');
            fs.mkdirSync(docsDir, { recursive: true });
            fs.mkdirSync(srcDir, { recursive: true });
            fs.mkdirSync(graphDir, { recursive: true });
            fs.writeFileSync(
                path.join(docsDir, 'project-config.json'),
                JSON.stringify({
                    project: { name: 'TestProject' },
                    modules: [{ name: 'mod', kind: 'library', pathRegex: 'src/' }]
                })
            );
            fs.writeFileSync(path.join(graphDir, 'graph.db'), 'fake-db');
            // Root agent files present and complete so the agent-files gate passes through.
            fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), completeAgentFileStub);
            fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), completeAgentFileStub);
            const result = await runHook('init-prompt-gate.cjs', { prompt: 'implement feature X' }, { env: { CLAUDE_PROJECT_DIR: tmpDir } });
            logResult('Both gates pass when config + graph.db exist', result.code === 0);
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 16: "skip graph" dismiss → exit 0
    {
        const tmpDir = createMarkedTestProject();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            const srcDir = path.join(tmpDir, 'src');
            fs.mkdirSync(docsDir, { recursive: true });
            fs.mkdirSync(srcDir, { recursive: true });
            fs.writeFileSync(
                path.join(docsDir, 'project-config.json'),
                JSON.stringify({
                    project: { name: 'TestProject' },
                    modules: [{ name: 'mod', kind: 'library', pathRegex: 'src/' }]
                })
            );
            const result = await runHook('init-prompt-gate.cjs', { prompt: 'skip graph' }, { env: { CLAUDE_PROJECT_DIR: tmpDir } });
            logResult('Skip graph dismiss exits 0', result.code === 0);
        } finally {
            cleanupTempDir(tmpDir);
        }
    }
}

// Identity invariant: step-id == skill-name == /command. Covers the
// mapSkillToStepId normalizer in lib/workflow-state.cjs (consumed by the
// surviving gate hooks). The former resolveCmd half lived in the removed
// workflow-step-tracker.cjs and its test was dropped with that hook.
async function testMapSkillToStepId() {
    logSection('Unit: workflow-state.cjs mapSkillToStepId');
    const { mapSkillToStepId } = require('../lib/workflow-state.cjs');

    logResult('[TC-IDENTITY-001] bare name maps to itself', mapSkillToStepId('plan') === 'plan');
    logResult('[TC-IDENTITY-002] leading slash stripped', mapSkillToStepId('/plan') === 'plan');
    logResult('[TC-IDENTITY-003] uppercase normalized', mapSkillToStepId('Changes-Review') === 'changes-review');
    logResult('[TC-IDENTITY-004] trailing whitespace trimmed', mapSkillToStepId('workflow-end ') === 'workflow-end');
    logResult('[TC-IDENTITY-004b] leading space before slash is NOT stripped (replace runs before trim)', mapSkillToStepId('  /plan ') === '/plan');
    logResult('[TC-IDENTITY-005] multi-segment id preserved', mapSkillToStepId('/workflow-review-changes') === 'workflow-review-changes');
    logResult('[TC-IDENTITY-006] null returns null (fallback)', mapSkillToStepId(null) === null);
    logResult('[TC-IDENTITY-007] empty string returns null (fallback)', mapSkillToStepId('') === null);
}

// testResolveCmd REMOVED — it exercised resolveCmd() in the deleted
// workflow-step-tracker.cjs (step-hint accelerator). The mapSkillToStepId
// half of the identity invariant survives in testMapSkillToStepId above.

// testDevRulesReminder REMOVED — it drove the deleted UserPromptSubmit inject hook
// prompt-context-assembler.cjs. The lesson-extraction invariant lives in the universal
// `lesson-extraction-gate` protocol, covered by testLessonExtractionGate below.

async function testLessonExtractionGate() {
    logSection('Universal protocol: lesson-extraction-gate');
    const { extractSyncBody } = require(path.join(HOOKS_DIR, '..', 'scripts', 'lib', 'extract-sync-block.cjs'));
    const canonical = fs.readFileSync(path.join(HOOKS_DIR, '..', 'skills', 'shared', 'sync-inline-versions.md'), 'utf-8');
    const body = extractSyncBody(canonical, 'lesson-extraction-gate');
    logResult('Canonical protocol exists', typeof body === 'string' && body.length > 0);
    logResult('Adds the lessons task to non-trivial tasks', body.includes('Analyze AI mistakes & lessons learned'));
    logResult('Routes the durable capture through /learn', body.includes('/learn'));
    // Invariant: /learn is recommended only for everyday-valuable lessons — a project convention or a
    // universal best-practice protocol — and never for rare agent quirks or one-off incidents.
    logResult('Value gate names project conventions and universal best-practice protocols worth reading on everyday work',
        /project convention or a universal best-practice protocol worth reading on everyday work/.test(body));
    logResult('Value gate rejects rare AI-agent quirks, one-off incidents and current-task details',
        /skip rare AI-agent quirks, one-off incidents and details of the current task/.test(body));
    logResult('Recurrence and auto-fix gates come before the /learn request',
        body.indexOf('Skip nonrecurring lessons') >= 0 && body.indexOf('Skip nonrecurring lessons') < body.indexOf('ask the user to run'));
    logResult('Never self-edits instruction files', body.includes('never silently self-edit instructions'));
}

// ============================================================================
// Test Cases: PostToolUse
// ============================================================================

async function testPostToolUseHooks() {
    logSection('PostToolUse Hooks');

    // post-edit-prettier.cjs
    logSubsection('post-edit-prettier.cjs');
    const editTools = ['Edit', 'Write', 'MultiEdit'];
    for (const tool of editTools) {
        const result = await runHook('post-edit-prettier.cjs', {
            tool_name: tool,
            tool_input: { file_path: 'src/test.ts' },
            tool_response: 'success'
        });
        logResult(`post-edit-prettier (${tool})`, result.code === 0);
    }

}

// ============================================================================
// Test Cases: Notification
// ============================================================================

async function testNotification() {
    logSection('Notification: notifications/notify.cjs (unified router)');

    // Tests run with CLAUDE_HOOK_TEST_MODE=1 to skip actual OS notifications.
    // notify.cjs is the single notification entry point (notify-waiting.js retired).
    const ROUTER = 'notifications/notify.cjs';
    const testEnv = { env: { CLAUDE_HOOK_TEST_MODE: '1' } };

    logSubsection('Whitelisted Events (routed)');

    {
        const result = await runHook(ROUTER, { hook_event_name: 'Stop', cwd: 'D:/Projects/MyProject', session_id: 'test-001' }, testEnv);
        logResult('Stop event routed (exit 0)', result.code === 0);
        logResult('Stop passes whitelist', !result.stderr.includes('not in whitelist'));
    }

    {
        const result = await runHook(ROUTER, { hook_event_name: 'AskUserPrompt', cwd: 'D:/Projects/MyProject', session_id: 'test-002' }, testEnv);
        logResult('AskUserPrompt event routed (exit 0)', result.code === 0);
        logResult('AskUserPrompt passes whitelist', !result.stderr.includes('not in whitelist'));
    }

    {
        const result = await runHook(ROUTER, { notification_type: 'idle_prompt', hook_event_name: 'Notification', message: 'AI agent is waiting for your input', cwd: 'D:/Projects/MyProject' }, testEnv);
        logResult('idle_prompt event routed (exit 0)', result.code === 0);
        logResult('idle_prompt passes whitelist', !result.stderr.includes('not in whitelist'));
    }

    logSubsection('AskUserQuestion Tool Normalization');

    {
        const result = await runHook(ROUTER, { hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', cwd: 'D:/Projects/MyProject', session_id: 'test-003' }, testEnv);
        logResult('AskUserQuestion tool routed (exit 0)', result.code === 0);
        logResult('AskUserQuestion normalized into whitelist', !result.stderr.includes('not in whitelist'));
    }

    logSubsection('Non-Whitelisted Events (skipped cleanly)');

    {
        const result = await runHook(ROUTER, { hook_event_name: 'SubagentStop', agent_type: 'researcher', cwd: 'D:/Projects/MyProject' }, testEnv);
        logResult('SubagentStop skipped (exit 0)', result.code === 0);
        logResult('SubagentStop not in whitelist', result.stderr.includes('not in whitelist'));
    }

    {
        const result = await runHook(ROUTER, { hook_event_name: 'UnknownEvent', cwd: 'C:/Projects/TestProject' }, testEnv);
        logResult('Unknown event skipped (exit 0)', result.code === 0);
        logResult('Unknown event not in whitelist', result.stderr.includes('not in whitelist'));
    }

    logSubsection('Permission Prompt Handling');

    {
        const result = await runHook(ROUTER, { hook_event_name: 'Notification', notification_type: 'permission_prompt', message: 'Claude needs your permission to use Bash', cwd: 'D:/Projects/MyProject' }, testEnv);
        logResult('permission_prompt routed (exit 0)', result.code === 0);
        logResult('permission_prompt passes whitelist', !result.stderr.includes('not in whitelist'));
    }

    logSubsection('Edge Cases');

    {
        const result = await runHook(ROUTER, {}, testEnv);
        logResult('Empty input handled (exit 0)', result.code === 0);
    }

    {
        const result = await runHook(ROUTER, { hook_event_name: 'Stop' }, testEnv);
        logResult('Stop without cwd handled (exit 0)', result.code === 0);
    }
}

// ============================================================================
// Test Cases: Lib Modules
// ============================================================================

async function testLibModules() {
    logSection('Lib Module Verification');

    const libFiles = ['workflow-state.cjs', 'ck-config-utils.cjs', 'ck-paths.cjs', 'todo-state.cjs'];

    for (const libFile of libFiles) {
        const libPath = path.join(HOOKS_DIR, 'lib', libFile);
        try {
            if (fs.existsSync(libPath)) {
                require(libPath);
                logResult(`${libFile} loads without error`, true);
            } else {
                skipTest(libFile, 'File not found');
            }
        } catch (err) {
            logResult(`${libFile} loads without error`, false, err.message);
        }
    }
}

// ============================================================================
// Edge Case Tests
// ============================================================================

async function testEdgeCases() {
    logSection('Edge Cases & Error Handling');

    // Malformed JSON input
    logSubsection('Malformed JSON');
    const hooksToTest = ['session-init.cjs', 'init-prompt-gate.cjs'];

    for (const hook of hooksToTest) {
        const result = await runHook(hook, 'not valid json');
        const expectedCode = 0;
        logResult(`${hook} handles malformed JSON`, result.code === expectedCode);
        logOutputValidation(`${hook} reports malformed JSON`, result.stderr.length > 0);
    }

    // Empty/null inputs
    logSubsection('Empty/Null Inputs');
    for (const hook of hooksToTest) {
        const result = await runHook(hook, null);
        const expectedCode = 0;
        logResult(`${hook} handles null input`, result.code === expectedCode);
    }
    for (const hook of hooksToTest) {
        const result = await runHook(hook, {});
        const expectedCode = 0;
        logResult(`${hook} handles empty object`, result.code === expectedCode);
    }

    // Unicode and special characters
    logSubsection('Unicode & Special Characters');
    {
        const result = await runHook('init-prompt-gate.cjs', {
            prompt: '実装する feature with 日本語 and emoji 🎉'
        });
        logResult('Unicode in prompt', result.code === 0);
    }
    {
        const result = await runHook('doc-sync-gate.cjs', {
            hook_event_name: 'PreToolUse',
            tool_name: 'Bash',
            tool_input: { command: 'echo "hello 世界"' }
        });
        logResult('Unicode in command', result.code === 0);
    }

    // Very long inputs
    logSubsection('Long Inputs');
    {
        const result = await runHook('init-prompt-gate.cjs', {
            prompt: 'implement '.repeat(1000)
        });
        logResult('Long prompt handled', result.code === 0);
    }
    {
        const result = await runHook('doc-sync-gate.cjs', {
            hook_event_name: 'PreToolUse',
            tool_name: 'Bash',
            tool_input: { command: 'echo ' + 'a'.repeat(10000) }
        });
        logResult('Long command handled', result.code === 0);
    }
}

async function testCountDriftSuite() {
    logSection('Suite Runner: count-drift');

    const result = await runNodeScript('run-all-tests.cjs', ['--filter=count-drift']);
    if (VERBOSE && result.stdout) console.log(result.stdout);
    if (VERBOSE && result.stderr) console.error(result.stderr);
    logResult(
        'count-drift suite passes through primary runner',
        result.code === 0,
        result.code === 0 ? '' : (result.stderr || result.stdout).trim()
    );
}

async function testSubagentRoutingSuite() {
    logSection('Suite Runner: check-subagent-routing');

    const result = await runNodeScript('run-all-tests.cjs', ['--filter=check-subagent-routing']);
    if (VERBOSE && result.stdout) console.log(result.stdout);
    if (VERBOSE && result.stderr) console.error(result.stderr);
    logResult(
        'sub-agent routing guard suite passes through primary runner',
        result.code === 0,
        result.code === 0 ? '' : (result.stderr || result.stdout).trim()
    );
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
    console.log(`\n${COLORS.bold}Claude Hooks Comprehensive Test Suite v2.0${COLORS.reset}`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`${COLORS.dim}Running from: ${HOOKS_DIR}${COLORS.reset}`);
    if (FILTER) console.log(`${COLORS.dim}Filter: ${FILTER}${COLORS.reset}`);
    if (VALIDATE_OUTPUT) console.log(`${COLORS.cyan}Output validation enabled${COLORS.reset}`);
    if (VERIFY_STATE) console.log(`${COLORS.cyan}State verification enabled${COLORS.reset}`);
    console.log();

    const startTime = Date.now();

    // Clean up any leftover test directories
    cleanupAllTestDirs();

    // Session Lifecycle
    if (!FILTER || 'session'.includes(FILTER) || 'graph'.includes(FILTER)) {
        await testSessionInit();
        await testGraphSessionInit();
        await testProjectConfigInit();
        await testSessionEnd();
    }

    // SubagentStart context-injection dispatchers (subagent-init*.cjs) were removed
    // in the inject-hook removal — Codex/Claude skill-parity. Their context now lives
    // in agent .md SYNC:agent-bootstrap blocks (Phase 03), so no hook tests remain.

    // User Input
    if (!FILTER || 'user'.includes(FILTER) || 'prompt'.includes(FILTER) || 'init'.includes(FILTER)) {
        await testInitPromptGate();
        await testMapSkillToStepId();
        await testLessonExtractionGate();
    }

    // PostToolUse
    if (!FILTER || 'post'.includes(FILTER)) {
        await testPostToolUseHooks();
    }

    // Notification
    if (!FILTER || 'notify'.includes(FILTER)) {
        await testNotification();
    }

    // Lib Modules
    if (!FILTER || 'lib'.includes(FILTER)) {
        await testLibModules();
    }

    // Dedup Constants
    if (!FILTER || 'dedup'.includes(FILTER) || 'lib'.includes(FILTER)) {
    }

    // Edge Cases
    if (!FILTER || 'edge'.includes(FILTER)) {
        await testEdgeCases();
    }

    // Generated inventory / catalog drift
    if (!FILTER || 'count-drift'.includes(FILTER) || 'catalog'.includes(FILTER)) {
        await testCountDriftSuite();
    }

    // Sub-agent routing anti-drift guard
    if (!FILTER || 'check-subagent-routing'.includes(FILTER) || 'routing'.includes(FILTER)) {
        await testSubagentRoutingSuite();
    }

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`${COLORS.bold}SUMMARY${COLORS.reset}`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`${COLORS.green}Passed:${COLORS.reset}  ${results.passed}`);
    console.log(`${COLORS.red}Failed:${COLORS.reset}  ${results.failed}`);
    console.log(`${COLORS.yellow}Skipped:${COLORS.reset} ${results.skipped}`);

    if (VALIDATE_OUTPUT) {
        console.log(`${COLORS.cyan}Output Validations:${COLORS.reset} ${results.outputValidation.passed} passed, ${results.outputValidation.failed} failed`);
    }
    if (VERIFY_STATE) {
        console.log(`${COLORS.cyan}State Verifications:${COLORS.reset} ${results.stateVerification.passed} passed, ${results.stateVerification.failed} failed`);
    }

    console.log(`${COLORS.dim}Duration: ${duration}s${COLORS.reset}`);

    // Hook-test count drift guard (N2). A NON-recursive, post-summary hard assertion —
    // deliberately NOT a counted test: a counted test reads results.passed before its own
    // increment (off-by-one), and count-drift.test.cjs cannot assert this row from inside
    // its own subprocess (it can't see the parent runner's live total). Only meaningful on
    // a full run — a --filter run executes a subset, so its total is not the canonical figure.
    let countGuardFailed = false;
    if (!FILTER) {
        const liveTotal = results.passed + results.failed + results.skipped;
        const repoRoot = path.join(HOOKS_DIR, '..', '..');
        const docsDir = path.join(repoRoot, '.claude', 'docs');
        const countTargets = [
            {
                file: path.join(docsDir, 'README.md'),
                label: 'docs/README.md "Hook Tests" row',
                pattern: /\|\s*Hook Tests\s*\|\s*(\d+)\s*\|/
            },
            {
                file: path.join(docsDir, 'hooks', 'README.md'),
                label: 'docs/hooks/README.md "Primary hook runner" row',
                pattern: /\|\s*Primary hook runner\s*\|\s*(\d+)\s*\|/
            },
            {
                file: path.join(docsDir, 'hooks', 'README.md'),
                label: 'docs/hooks/README.md "primary runner declares N tests" prose',
                pattern: /primary runner declares (\d+) tests/
            },
            // The framework guide carried the SAME primary-gate figure with no guard
            // on it, and drifted to 215 against a live 224 while the rows above stayed
            // green. A count claim nobody asserts is a claim that will be wrong.
            {
                file: path.join(docsDir, 'claude-ai-agent-framework-guide.md'),
                label: 'framework guide "test-all-hooks.cjs (primary gate)" row',
                pattern: /\|\s*`test-all-hooks\.cjs`\s*\(primary gate\)\s*\|\s*\*\*(\d+)\*\*\s*\|/
            },
            {
                file: path.join(docsDir, 'claude-ai-agent-framework-guide.md'),
                label: 'framework guide live-verified prose',
                pattern: /`test-all-hooks\.cjs` = (\d+)/
            }
        ];

        const mismatches = [];
        for (const target of countTargets) {
            let content;
            try {
                content = fs.readFileSync(target.file, 'utf8');
            } catch (err) {
                mismatches.push(`${target.label}: cannot read (${err.code || err.message})`);
                continue;
            }
            const match = content.match(target.pattern);
            if (!match) {
                mismatches.push(`${target.label}: no count matching ${target.pattern} found`);
                continue;
            }
            const documented = Number(match[1]);
            if (documented !== liveTotal) {
                mismatches.push(`${target.label}: documents ${documented}, runner ran ${liveTotal}`);
            }
        }

        if (mismatches.length > 0) {
            countGuardFailed = true;
            console.log(`${COLORS.red}Hook-test count drift:${COLORS.reset}`);
            for (const m of mismatches) {
                console.log(`  ${COLORS.red}✗${COLORS.reset} ${m}`);
            }
            console.log(`  ${COLORS.dim}Fix: set the count to ${liveTotal} in the file(s) above.${COLORS.reset}`);
        } else {
            console.log(`${COLORS.green}Count guard:${COLORS.reset} docs agree (${liveTotal} tests)`);
        }
    }

    console.log(`${'═'.repeat(60)}\n`);

    // Clean up
    cleanupAllTestDirs();

    // Exit with appropriate code
    process.exit(results.failed > 0 || countGuardFailed ? 1 : 0);
}

// Run tests
runAllTests().catch(err => {
    console.error(`${COLORS.red}Test runner error:${COLORS.reset}`, err);
    process.exit(1);
});
