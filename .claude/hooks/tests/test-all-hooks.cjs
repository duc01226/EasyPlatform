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
 * - Complete pattern coverage (12 Windows commands, 10 privacy patterns)
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

    // Test 2: Config populated → stays silent while preserving side effects
    // Pin CLAUDE_PROJECT_DIR to the repo root: without it the loader falls back to
    // process.cwd(), which resolves to the empty tests/docs fixture when the suite
    // is launched from the tests directory (cwd-sensitive false failure).
    {
        const repoRoot = path.resolve(__dirname, '..', '..', '..');
        const result = await runHook('graph-session-init.cjs', { source: 'startup' }, { timeout: 30000, env: { CLAUDE_PROJECT_DIR: repoRoot } });
        logResult('Exits 0 when config populated', result.code === 0);
        logResult('No graph output when config populated', result.stdout === '');
    }
}

async function testProjectConfigInit() {
    logSection('SessionStart: session-init-docs.cjs (config init)');

    // Test 1: When populated config exists, should exit silently
    {
        const result = await runHook('session-init-docs.cjs', {
            source: 'startup'
        });
        logResult('Exits 0 when config exists', result.code === 0);
        // In our repo docs/project-config.json is populated, so no AI directive expected
        logResult('No AI directive when config populated', !result.stdout.includes('AI ACTION REQUIRED'));
    }

    // Test 2: When config is missing, should create skeleton and suggest /project-config
    {
        const tmpDir = createTempDir();
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
            // Advisory text removed — enforcement is now in init-prompt-gate.cjs (exit 2)
            logResult('No advisory text (gate handles enforcement)', !result.stdout.includes('MANDATORY MUST ATTENTION'));

            // Verify skeleton was created
            const configPath = path.join(docsDir, 'project-config.json');
            const configExists = fs.existsSync(configPath);
            logResult('Creates skeleton file', configExists);

            if (configExists) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                logResult('Skeleton has framework', !!config.framework);
                logResult('Skeleton has modules', Array.isArray(config.modules));
                logResult('Skeleton has contextGroups', Array.isArray(config.contextGroups));
                logResult('Skeleton has designSystem', !!config.designSystem);
                logResult('Skeleton has styling', !!config.styling);
                logResult('Skeleton has componentSystem', !!config.componentSystem);
                logResult('Skeleton has referenceDocs', Array.isArray(config.referenceDocs));
            }
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 3: Creates docs/ directory if missing (requires content dir for guard)
    {
        const tmpDir = createTempDir();
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
            logResult('Creates docs/ directory', fs.existsSync(path.join(tmpDir, 'docs')));
            logResult('Creates config inside docs/', fs.existsSync(path.join(tmpDir, 'docs', 'project-config.json')));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 4: Empty input handled gracefully
    {
        const result = await runHook('session-init-docs.cjs', null);
        logResult('Empty input exits 0', result.code === 0);
    }

    // Test 5: Persistent — second run STILL suggests when skeleton is unpopulated
    {
        const tmpDir = createTempDir();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            fs.mkdirSync(docsDir, { recursive: true });

            // First run — creates file
            await runHook(
                'session-init-docs.cjs',
                { source: 'startup' },
                {
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                }
            );

            // Second run — should STILL suggest (skeleton is unpopulated)
            const result = await runHook(
                'session-init-docs.cjs',
                { source: 'startup' },
                {
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                }
            );
            logResult('Second run exits 0', result.code === 0);
            // Advisory removed — gate handles enforcement via init-prompt-gate.cjs
            logResult('Second run silent (gate handles enforcement)', !result.stdout.includes('MANDATORY MUST ATTENTION'));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 6: No suggestion when config is populated with real values
    {
        const tmpDir = createTempDir();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            fs.mkdirSync(docsDir, { recursive: true });
            const populatedConfig = {
                schemaVersion: 2,
                project: {
                    name: 'MyProject',
                    description: 'A real project',
                    languages: ['TypeScript'],
                    packageManagers: ['npm']
                },
                backendServices: {
                    patterns: [],
                    serviceMap: { RealService: 'src/services/real' },
                    serviceRepositories: {},
                    serviceDomains: {}
                },
                frontendApps: {
                    patterns: [],
                    appMap: {},
                    legacyApps: [],
                    modernApps: [],
                    frontendRegex: '',
                    sharedLibRegex: ''
                },
                designSystem: {
                    docsPath: 'docs/project-reference/design-system',
                    appMappings: []
                },
                scss: { appMap: {}, patterns: [] },
                componentFinder: {
                    selectorPrefixes: [],
                    layerClassification: { platform: [], common: [], domain: [] }
                },
                sharedNamespace: 'shared',
                framework: { name: 'Angular', searchPatternKeywords: [] },
                modules: [{ code: 'REAL', name: 'Real Module' }],
                contextGroups: [],
                testing: { frameworks: [], filePatterns: {}, commands: {} },
                databases: {},
                messaging: {},
                api: {},
                infrastructure: {}
            };
            fs.writeFileSync(path.join(docsDir, 'project-config.json'), JSON.stringify(populatedConfig, null, 2), 'utf-8');

            const result = await runHook(
                'session-init-docs.cjs',
                { source: 'startup' },
                {
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                }
            );
            logResult('No AI directive when populated', !result.stdout.includes('AI ACTION REQUIRED'));
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
// Test Cases: Subagent — REMOVED
// SubagentStart context-injection dispatchers (subagent-init.cjs / -2 / -3) were
// removed in the inject-hook removal (Claude/Codex skill-parity). Their guidance
// now lives in agent .md SYNC:agent-bootstrap blocks (Phase 03). Genuine lifecycle
// asserts (state libs, session-end) remain in suites/lifecycle.test.cjs.
// ============================================================================

// ============================================================================
// Test Cases: User Input
// ============================================================================

async function testInitPromptGate() {
    logSection('UserPromptSubmit: init-prompt-gate.cjs (project-context router)');
    const completeAgentFileStub = [
        '<!-- CK:UNIVERSAL-GUIDES v6 -->',
        '<!-- CK:CRITICAL-THINKING -->',
        '<!-- CK:AI-MISTAKE-PREVENTION -->',
        '[CRITICAL-THINKING-MINDSET]',
        'Common AI Mistake Prevention (System Lessons)',
        '## First Action Decision',
        '## Workflow Step Advancement',
        '## IMPORTANT: Task Planning Rules',
        '## Code Responsibility Hierarchy',
        '## Evidence-Based Reasoning',
        '## Continuous Improvement — Lesson Extraction Gate',
        '## Git & Version-Control Discipline',
        ''
    ].join('\n');
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

    // Test 1: Populated config → exit 0 (silent pass-through)
    {
        const tmpDir = createTempDir();
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

    // Test 2: Unpopulated config → exit 0 with setup guidance
    {
        const tmpDir = createTempDir();
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
            logResult('Exit 0 when config unpopulated', result.code === 0);
            logResult('Claude guidance uses plaintext stdout', !result.stdout.trim().startsWith('{'));
            logResult('Codex guidance avoids JSON-looking stdout', !/^\s*[\[{]/.test(result.stdout));
            logResult('Guidance mentions /project-init', result.stdout.includes('/project-init'));
            logResult('Guidance mentions /project-config', result.stdout.includes('/project-config'));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 3: Unpopulated config BUT /project-config prompt → exit 0 (allowlisted)
    {
        const tmpDir = createTempDir();
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
            logResult('Allowlist: /project-config passes through', result.code === 0);
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 4: Unpopulated config BUT /scan --target=backend-patterns → exit 0 (allowlisted)
    {
        const tmpDir = createTempDir();
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
            logResult('Allowlist: /scan host passes through', result.code === 0);
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 5: "skip init" → writes dismiss flag + exit 0
    {
        const tmpDir = createTempDir();
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
            logResult('Dismiss: skip init exits 0', result.code === 0);
            const flagExists = fs.existsSync(path.join(tmpDir, 'tmp', 'claude-temp', '.init-dismissed'));
            logResult('Dismiss: flag file created', flagExists);
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 6: Active dismiss flag → exit 0 even with unpopulated config
    {
        const tmpDir = createTempDir();
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
            logResult('Dismiss: active flag allows prompt', result.code === 0);
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 7: Expired dismiss flag (>1 day old) → exit 2
    {
        const tmpDir = createTempDir();
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
            logResult('Dismiss: expired flag warns/allows prompt', result.code === 0);
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 8: Missing config file entirely → exit 0 with setup guidance
    {
        const tmpDir = createTempDir();
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
            logResult('Missing config file warns/allows prompt', result.code === 0);
            logResult('Missing config guidance mentions /project-init', result.stdout.includes('/project-init'));
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
        const tmpDir = createTempDir();
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
        const tmpDir = createTempDir();
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
        const tmpDir = createTempDir();
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

    // Test 13: Config populated + no graph.db + no dismiss → exit 0 with graph guidance
    {
        const tmpDir = createTempDir();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            const srcDir = path.join(tmpDir, 'src');
            fs.mkdirSync(docsDir, { recursive: true });
            fs.mkdirSync(srcDir, { recursive: true }); // hasProjectContent needs a content dir
            fs.writeFileSync(
                path.join(docsDir, 'project-config.json'),
                JSON.stringify({
                    project: { name: 'TestProject' },
                    modules: [{ name: 'mod', kind: 'library', pathRegex: 'src/' }]
                })
            );
            // Root agent files present and complete so the agent-files gate passes through to the graph gate under test.
            fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), completeAgentFileStub);
            fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), completeAgentFileStub);
            // No .code-graph/graph.db, no dismiss flag
            const result = await runHook('init-prompt-gate.cjs', { prompt: 'implement feature X' }, { env: { CLAUDE_PROJECT_DIR: tmpDir } });
            logResult('Graph gate warns/allows when config populated + no graph.db', result.code === 0);
            logResult('Graph guidance mentions /graph-build', result.stdout.includes('/graph-build'));
            logResult('Graph guidance avoids skip prompt', !result.stdout.includes('skip graph'));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 14: Config NOT populated + no graph.db → exit 0 with config guidance (NOT graph)
    {
        const tmpDir = createTempDir();
        try {
            const docsDir = path.join(tmpDir, 'docs');
            const srcDir = path.join(tmpDir, 'src');
            fs.mkdirSync(docsDir, { recursive: true });
            fs.mkdirSync(srcDir, { recursive: true });
            fs.writeFileSync(path.join(docsDir, 'project-config.json'), JSON.stringify({ project: { name: '' }, modules: [] }));
            const result = await runHook('init-prompt-gate.cjs', { prompt: 'implement feature X' }, { env: { CLAUDE_PROJECT_DIR: tmpDir } });
            logResult('Config gate warns/allows before graph guidance', result.code === 0);
            logResult('Guidance message is config (not graph)', result.stdout.includes('/project-config') && !result.stdout.includes('/graph-build'));
        } finally {
            cleanupTempDir(tmpDir);
        }
    }

    // Test 15: Config populated + graph.db exists → exit 0 (both gates pass)
    {
        const tmpDir = createTempDir();
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
        const tmpDir = createTempDir();
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
    logResult('[TC-IDENTITY-003] uppercase normalized', mapSkillToStepId('Review-Changes') === 'review-changes');
    logResult('[TC-IDENTITY-004] trailing whitespace trimmed', mapSkillToStepId('plan-review ') === 'plan-review');
    logResult('[TC-IDENTITY-004b] leading space before slash is NOT stripped (replace runs before trim)', mapSkillToStepId('  /plan ') === '/plan');
    logResult('[TC-IDENTITY-005] multi-segment id preserved', mapSkillToStepId('/workflow-review-changes') === 'workflow-review-changes');
    logResult('[TC-IDENTITY-006] null returns null (fallback)', mapSkillToStepId(null) === null);
    logResult('[TC-IDENTITY-007] empty string returns null (fallback)', mapSkillToStepId('') === null);
}

// testResolveCmd REMOVED — it exercised resolveCmd() in the deleted
// workflow-step-tracker.cjs (step-hint accelerator). The mapSkillToStepId
// half of the identity invariant survives in testMapSkillToStepId above.

// testDevRulesReminder REMOVED — it drove the deleted UserPromptSubmit inject hook
// prompt-context-assembler.cjs. The lesson-reminder invariant survives via
// lib/prompt-injections.cjs, covered by testLessonLearnedReminder below.

async function testLessonLearnedReminder() {
    logSection('lib/prompt-injections: injectLessonReminder');

    // Test 1: Returns reminder when no transcript
    {
        const { injectLessonReminder } = require('../lib/prompt-injections.cjs');
        const result = injectLessonReminder(null);
        logResult('Returns reminder with no transcript', result !== null && result.includes('[LESSON-LEARNED-REMINDER]'));
        logResult('Contains task tracking instruction', result.includes('task tracking'));
        logResult('Contains $learn instruction', result.includes('$learn'));
    }

    // Test 2: Dedup — returns null when marker in recent transcript
    {
        const { injectLessonReminder } = require('../lib/prompt-injections.cjs');
        const tempDir = createTempDir();
        const transcriptPath = path.join(tempDir, 'transcript.jsonl');
        fs.writeFileSync(transcriptPath, '[LESSON-LEARNED-REMINDER] Task Planning\n'.repeat(5));
        try {
            const result = injectLessonReminder(transcriptPath);
            logResult('Dedup: returns null when marker in transcript', result === null);
        } finally {
            cleanupTempDir(tempDir);
        }
    }

    // Test 3: No dedup when transcript has no marker
    {
        const { injectLessonReminder } = require('../lib/prompt-injections.cjs');
        const tempDir = createTempDir();
        const transcriptPath = path.join(tempDir, 'transcript.jsonl');
        fs.writeFileSync(transcriptPath, 'Some other content\nNo marker here\n');
        try {
            const result = injectLessonReminder(transcriptPath);
            logResult('Returns reminder when no marker', result !== null && result.includes('[LESSON-LEARNED-REMINDER]'));
        } finally {
            cleanupTempDir(tempDir);
        }
    }
}

// ============================================================================
// Test Cases: PreToolUse (Blocking Hooks)
// ============================================================================

async function testWindowsCommandDetector() {
    logSection('PreToolUse: windows-command-detector.cjs');

    // ALL Windows CMD patterns (12 patterns)
    logSubsection('Windows CMD Patterns (Should Block)');
    const windowsPatterns = [
        { cmd: 'dir /b /s src', name: 'dir with flags', shouldBlock: true },
        { cmd: 'dir /w', name: 'dir /w', shouldBlock: true },
        { cmd: 'type file.txt', name: 'type command', shouldBlock: true },
        { cmd: 'type package.json', name: 'type package.json', shouldBlock: true },
        {
            cmd: 'copy file1.txt file2.txt',
            name: 'copy command',
            shouldBlock: true
        },
        { cmd: 'move src dst', name: 'move command', shouldBlock: true },
        { cmd: 'del file.txt', name: 'del command', shouldBlock: true },
        { cmd: 'del /f /q temp', name: 'del with flags', shouldBlock: true },
        { cmd: 'rmdir /s /q path', name: 'rmdir /s', shouldBlock: true },
        { cmd: 'where node', name: 'where command', shouldBlock: true },
        { cmd: 'set NODE_ENV=production', name: 'set VAR=', shouldBlock: true },
        { cmd: 'set PATH=%PATH%;C:\\bin', name: 'set PATH', shouldBlock: true },
        { cmd: 'cls', name: 'cls command', shouldBlock: true },
        { cmd: 'ren old.txt new.txt', name: 'ren command', shouldBlock: true },
        // Note: 'rename' (full word) is not blocked - only 'ren' shorthand is Windows-specific
        { cmd: 'attrib +r file', name: 'attrib command', shouldBlock: true },
        { cmd: 'findstr pattern file', name: 'findstr command', shouldBlock: true },
        {
            cmd: 'findstr /s /i "search" *.txt',
            name: 'findstr with flags',
            shouldBlock: true
        }
    ];

    for (const { cmd, name, shouldBlock } of windowsPatterns) {
        const result = await runHook('windows-command-detector.cjs', {
            tool_name: 'Bash',
            tool_input: { command: cmd }
        });
        // Exit code 2 = block, exit code 0 = allow
        const isBlocked = result.code === 2;
        logResult(`${name}`, isBlocked === shouldBlock);
        if (shouldBlock) {
            logOutputValidation(`${name} has block message`, result.stderr.includes('Windows CMD'));
        }
    }

    // Unix commands (should allow)
    logSubsection('Unix Commands (Should Allow)');
    const unixPatterns = [
        { cmd: 'ls -la src', name: 'ls -la' },
        { cmd: 'cat file.txt', name: 'cat command' },
        { cmd: 'cp file1 file2', name: 'cp command' },
        { cmd: 'mv src dst', name: 'mv command' },
        { cmd: 'rm file.txt', name: 'rm command' },
        { cmd: 'rm -rf temp', name: 'rm -rf' },
        { cmd: 'which node', name: 'which command' },
        { cmd: 'export NODE_ENV=production', name: 'export command' },
        { cmd: 'clear', name: 'clear command' },
        { cmd: 'grep pattern file', name: 'grep command' },
        { cmd: 'find . -name "*.ts"', name: 'find command' }
    ];

    for (const { cmd, name } of unixPatterns) {
        const result = await runHook('windows-command-detector.cjs', {
            tool_name: 'Bash',
            tool_input: { command: cmd }
        });
        logResult(`${name} allowed`, result.code === 0);
    }

    // Non-Bash tools (should ignore)
    logSubsection('Non-Bash Tools');
    const nonBashTools = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Task'];
    for (const tool of nonBashTools) {
        const result = await runHook('windows-command-detector.cjs', {
            tool_name: tool,
            tool_input: { file_path: 'test.txt' }
        });
        logResult(`${tool} tool ignored`, result.code === 0);
    }

    // Backslash-bang rewrite tests (node -e "\!" -> "!")
    logSubsection('Backslash-Bang Rewrite (\\! -> !)');
    {
        // Should rewrite: node -e with \! in double quotes
        const result = await runHook('windows-command-detector.cjs', {
            tool_name: 'Bash',
            tool_input: { command: 'node -e "console.log(\\!true)"' }
        });
        logResult('node -e "\\!true" rewrites', result.code === 0);
        const output = result.stdout.trim();
        let parsed = {};
        try {
            parsed = JSON.parse(output);
        } catch {}
        logResult('updatedInput has fixed command', parsed.updatedInput?.command === 'node -e "console.log(!true)"');
    }
    {
        // Should rewrite: node -e with \! in if statement
        const result = await runHook('windows-command-detector.cjs', {
            tool_name: 'Bash',
            tool_input: { command: 'node -e "if(\\!x) {}"' }
        });
        let parsed = {};
        try {
            parsed = JSON.parse(result.stdout.trim());
        } catch {}
        logResult('node -e "if(\\!x)" rewrites', parsed.updatedInput?.command === 'node -e "if(!x) {}"');
    }
    {
        // Should rewrite: node with flags before -e
        const result = await runHook('windows-command-detector.cjs', {
            tool_name: 'Bash',
            tool_input: {
                command: 'node --experimental-vm-modules -e "arr.filter(x => \\!x.done)"'
            }
        });
        let parsed = {};
        try {
            parsed = JSON.parse(result.stdout.trim());
        } catch {}
        logResult('node --flag -e "\\!" rewrites', parsed.updatedInput?.command === 'node --experimental-vm-modules -e "arr.filter(x => !x.done)"');
    }
    {
        // Should NOT rewrite: single-quoted node -e (no \! issue)
        const result = await runHook('windows-command-detector.cjs', {
            tool_name: 'Bash',
            tool_input: { command: "node -e 'if(!x) {}'" }
        });
        logResult('single-quoted node -e not rewritten', result.code === 0 && result.stdout.trim() === '');
    }
    {
        // Should NOT rewrite: echo with \! (not a node -e command)
        const result = await runHook('windows-command-detector.cjs', {
            tool_name: 'Bash',
            tool_input: { command: 'echo "\\!"' }
        });
        logResult('echo "\\!" not rewritten', result.code === 0 && result.stdout.trim() === '');
    }
    {
        // Should rewrite: multiple \! in one command
        const result = await runHook('windows-command-detector.cjs', {
            tool_name: 'Bash',
            tool_input: { command: 'node -e "if(\\!a && \\!b) {}"' }
        });
        let parsed = {};
        try {
            parsed = JSON.parse(result.stdout.trim());
        } catch {}
        logResult('multiple \\! all replaced', parsed.updatedInput?.command === 'node -e "if(!a && !b) {}"');
    }

    // Edge cases
    logSubsection('Edge Cases');
    {
        const result = await runHook('windows-command-detector.cjs', {
            tool_name: 'Bash',
            tool_input: { command: '' }
        });
        logResult('Empty command handled', result.code === 0);
    }
    {
        const result = await runHook('windows-command-detector.cjs', {
            tool_name: 'Bash',
            tool_input: {}
        });
        logResult('Missing command handled', result.code === 0);
    }
}

async function testScoutBlock() {
    logSection('PreToolUse: scout-block.cjs');

    // Blocked paths
    logSubsection('Blocked Paths');
    const blockedPaths = [
        'node_modules/pkg/index.js',
        'node_modules/@types/node/index.d.ts',
        '.git/config',
        '.git/HEAD',
        'dist/bundle.js',
        'build/output.js',
        'coverage/lcov.info',
        '.next/cache/webpack',
        '.nuxt/dist/server'
    ];

    for (const filePath of blockedPaths) {
        const result = await runHook('scout-block.cjs', {
            tool_name: 'Read',
            tool_input: { file_path: filePath }
        });
        logResult(`${filePath} blocked`, result.code === 2);
    }

    // Allowed paths
    logSubsection('Allowed Paths');
    const allowedPaths = [
        'src/index.ts',
        'src/components/App.tsx',
        'lib/utils.js',
        'tests/unit.test.ts',
        'package.json',
        'tsconfig.json',
        '.claude/hooks/test.cjs'
    ];

    for (const filePath of allowedPaths) {
        const result = await runHook('scout-block.cjs', {
            tool_name: 'Read',
            tool_input: { file_path: filePath }
        });
        logResult(`${filePath} allowed`, result.code === 0);
    }

    // Glob patterns
    logSubsection('Glob Patterns');
    {
        const result = await runHook('scout-block.cjs', {
            tool_name: 'Glob',
            tool_input: { pattern: '**/*.ts' }
        });
        logResult('Broad glob **/*.ts blocked', result.code === 2);
    }
    {
        const result = await runHook('scout-block.cjs', {
            tool_name: 'Glob',
            tool_input: { pattern: 'src/**/*.ts' }
        });
        logResult('Scoped glob src/**/*.ts allowed', result.code === 0);
    }
    {
        // Note: *.json at root IS blocked as broad pattern - use scoped path instead
        const result = await runHook('scout-block.cjs', {
            tool_name: 'Glob',
            tool_input: { pattern: '*.json' }
        });
        logResult('Root glob *.json blocked (broad pattern)', result.code === 2);
    }
    {
        // Scoped path makes simple patterns OK
        const result = await runHook('scout-block.cjs', {
            tool_name: 'Glob',
            tool_input: { pattern: '*.json', path: 'src/config' }
        });
        logResult('Scoped glob src/config/*.json allowed', result.code === 0);
    }

    // Bash commands
    logSubsection('Bash Commands');
    {
        const result = await runHook('scout-block.cjs', {
            tool_name: 'Bash',
            tool_input: { command: 'npm run build' }
        });
        logResult('npm build allowed', result.code === 0);
    }
    {
        const result = await runHook('scout-block.cjs', {
            tool_name: 'Bash',
            tool_input: { command: 'cat node_modules/pkg/index.js' }
        });
        logResult('cat node_modules blocked', result.code === 2);
    }
}

async function testPrivacyBlock() {
    logSection('PreToolUse: privacy-block.cjs');

    // ALL privacy patterns (10 patterns)
    logSubsection('Privacy Patterns (Should Block)');
    const privacyPatterns = [
        '.env',
        '.env.local',
        '.env.production',
        '.env.development',
        'config/.env',
        'secrets.yaml',
        'secrets.yml',
        'credentials.json',
        'config/credentials.json',
        'key.pem',
        'server.pem',
        'private.key',
        'ssl.key',
        'id_rsa',
        '.ssh/id_rsa',
        'id_ed25519',
        '.ssh/id_ed25519',
        'public.pem' // All .pem files are blocked (can't distinguish public/private by name)
        // Note: service-account.json and firebase-config.json are NOT blocked
        // The hook only blocks files matching /credentials/i pattern
    ];

    for (const filePath of privacyPatterns) {
        const result = await runHook('privacy-block.cjs', {
            tool_input: { file_path: filePath }
        });
        logResult(`${filePath} blocked`, result.code === 2);
    }

    // Exempt patterns (should allow)
    logSubsection('Exempt Patterns (Should Allow)');
    const exemptPatterns = [
        '.env.example',
        '.env.sample',
        '.env.template',
        // Note: public.pem IS blocked - hook can't distinguish public vs private by name alone
        'APPROVED:.env',
        'APPROVED:credentials.json'
    ];

    for (const filePath of exemptPatterns) {
        const result = await runHook('privacy-block.cjs', {
            tool_input: { file_path: filePath }
        });
        logResult(`${filePath} allowed`, result.code === 0);
    }

    // Regular files (should allow)
    logSubsection('Regular Files (Should Allow)');
    const regularFiles = ['src/index.ts', 'package.json', 'README.md', 'config.ts', 'settings.json'];

    for (const filePath of regularFiles) {
        const result = await runHook('privacy-block.cjs', {
            tool_input: { file_path: filePath }
        });
        logResult(`${filePath} allowed`, result.code === 0);
    }

    // Bash commands with privacy files
    logSubsection('Bash Privacy Commands');
    {
        const result = await runHook('privacy-block.cjs', {
            tool_input: { command: 'cat .env' }
        });
        logResult('cat .env blocked', result.code === 2);
    }
    {
        const result = await runHook('privacy-block.cjs', {
            tool_input: { command: 'grep password .env' }
        });
        logResult('grep .env blocked', result.code === 2);
    }
    {
        const result = await runHook('privacy-block.cjs', {
            tool_input: { command: 'cat config.json' }
        });
        logResult('cat config.json allowed', result.code === 0);
    }
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
        const result = await runHook(ROUTER, { notification_type: 'idle_prompt', hook_event_name: 'Notification', message: 'Claude is waiting for your input', cwd: 'D:/Projects/MyProject' }, testEnv);
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
        const result = await runHook(ROUTER, { hook_event_name: 'SubagentStop', agent_type: 'scout', cwd: 'D:/Projects/MyProject' }, testEnv);
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
// Dedup Constants Consistency Tests
// ============================================================================

async function testDedupConstants() {
    logSection('Dedup Constants Consistency');

    // Test 1: Module loads and exports expected keys
    let constants;
    try {
        constants = require(path.join(HOOKS_DIR, 'lib', 'dedup-constants.cjs'));
        logResult('Module loads without error', true);
    } catch (err) {
        logResult('Module loads without error', false, err.message);
        return;
    }

    logResult('Exports CODE_PATTERNS (non-empty string)', typeof constants.CODE_PATTERNS === 'string' && constants.CODE_PATTERNS.length > 0);
    logResult('Exports LESSON_LEARNED (non-empty string)', typeof constants.LESSON_LEARNED === 'string' && constants.LESSON_LEARNED.length > 0);

    // Test 2: All surviving consumers of the dedup markers import from
    // dedup-constants (no inline definitions) — the "single source of truth"
    // invariant for the marker strings.
    //
    // The Phase-05 inject-hook removal deleted the former consumers
    // (pretooluse-context-builders.cjs, prompt-context-assembler.cjs). The
    // invariant survives in the modules that STILL own dedup-marker usage after
    // the removal — repointed here so the same "imports dedup-constants" check
    // guards live code (verified via `grep dedup-constants .claude/hooks/**`).
    const dedupConsumers = [
        { label: 'lib/prompt-injections.cjs', file: 'lib/prompt-injections.cjs' },
    ];

    for (const { label, file } of dedupConsumers) {
        const content = fs.readFileSync(path.join(HOOKS_DIR, file), 'utf-8');
        const usesSharedModule = content.includes('dedup-constants');
        logResult(`${label} imports dedup-constants`, usesSharedModule);
    }
}

// ============================================================================
// Edge Case Tests
// ============================================================================

async function testEdgeCases() {
    logSection('Edge Cases & Error Handling');

    // Malformed JSON input
    logSubsection('Malformed JSON');
    const hooksToTest = ['session-init.cjs', 'init-prompt-gate.cjs', 'windows-command-detector.cjs', 'privacy-block.cjs'];

    for (const hook of hooksToTest) {
        const result = await runHook(hook, 'not valid json');
        logResult(`${hook} handles malformed JSON`, result.code === 0);
    }

    // Empty/null inputs
    logSubsection('Empty/Null Inputs');
    for (const hook of hooksToTest) {
        const result = await runHook(hook, null);
        logResult(`${hook} handles null input`, result.code === 0);
    }
    for (const hook of hooksToTest) {
        const result = await runHook(hook, {});
        logResult(`${hook} handles empty object`, result.code === 0);
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
        const result = await runHook('windows-command-detector.cjs', {
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
        const result = await runHook('windows-command-detector.cjs', {
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
        await testLessonLearnedReminder();
    }

    // PreToolUse
    if (!FILTER || 'pre'.includes(FILTER) || 'tool'.includes(FILTER) || 'block'.includes(FILTER)) {
        await testWindowsCommandDetector();
        await testScoutBlock();
        await testPrivacyBlock();
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
        await testDedupConstants();
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
                label: 'docs/hooks/README.md "passes with N tests" prose',
                pattern: /passes with (\d+) tests/
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
