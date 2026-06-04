/**
 * Agent-Files Bootstrap Gate Test Suite
 *
 * Covers the portable-bootstrap gate that routes the AI to init skills when a root
 * agent-instruction file (CLAUDE.md / AGENTS.md) is missing:
 *
 *   - lib/agent-files-state.cjs    — shared detection + dismiss-flag + offer message
 *   - agent-files-skill-gate.cjs   — PreToolUse Skill router (allowlist + guidance path)
 *   - init-prompt-gate.cjs         — UserPromptSubmit handleAgentFilesGate (guidance + dismiss)
 *
 * Design invariants under test:
 *   - Dormant in empty projects (hasProjectContent guard) and before config is populated.
 *   - Meta / init-route skills are never blocked (would deadlock the fix).
 *   - "skip init" dismisses both gates for the TTL window via a shared flag.
 */

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { runHook, getHookPath, createPreToolUseInput, createUserPromptInput } = require('../lib/hook-runner.cjs');
const { assertEqual, assertTrue, assertContains, assertAllowed } = require('../lib/assertions.cjs');
const { createTempDir, cleanupTempDir } = require('../lib/test-utils.cjs');

const SKILL_GATE_PATH = getHookPath('agent-files-skill-gate.cjs');
const PROMPT_GATE_PATH = getHookPath('init-prompt-gate.cjs');

// Lib + its path/loader deps — cleared together so CLAUDE_PROJECT_DIR re-resolves per test.
// The config loaders capture PROJECT_DIR at module load (project-config-loader.cjs:20),
// so isUniversalGuidesRequired() reads a stale project dir unless they are cleared too.
const STATE_PATH = path.resolve(__dirname, '../../lib/agent-files-state.cjs');
const CKPATHS_PATH = path.resolve(__dirname, '../../lib/ck-paths.cjs');
const GATE_PATH = path.resolve(__dirname, '../../agent-files-skill-gate.cjs');
const CONFIG_LOADER_PATH = path.resolve(__dirname, '../../lib/project-config-loader.cjs');
const CKCONFIG_LOADER_PATH = path.resolve(__dirname, '../../lib/ck-config-loader.cjs');

// Universal-guides producer (generator) + template — used by the sentinel sync test.
const GENERATOR_PATH = path.resolve(__dirname, '../../../skills/claude-md-init/scripts/generate-claude-md.cjs');
const TEMPLATE_PATH = path.resolve(__dirname, '../../../skills/claude-md-init/references/claude-md-template.md');

const STATE_DEP_PATHS = [STATE_PATH, CKPATHS_PATH, GATE_PATH, CONFIG_LOADER_PATH, CKCONFIG_LOADER_PATH];

function freshState(tmpDir) {
    for (const p of STATE_DEP_PATHS) delete require.cache[p];
    process.env.CLAUDE_PROJECT_DIR = tmpDir;
    return require(STATE_PATH);
}

function freshGate(tmpDir) {
    for (const p of STATE_DEP_PATHS) delete require.cache[p];
    process.env.CLAUDE_PROJECT_DIR = tmpDir;
    return require(GATE_PATH);
}

function clearStateCache() {
    for (const p of STATE_DEP_PATHS) delete require.cache[p];
}

// Minimal complete file: just the current sentinel (hasUniversalGuides → true via sentinel branch).
const COMPLETE_FILE = '<!-- CK:UNIVERSAL-GUIDES v3 -->\n# Project\n';
// Legacy complete file: no sentinel, but every required anchor heading present.
const LEGACY_COMPLETE_FILE = [
    '# Project',
    '## First Action Decision', '...',
    '## Workflow Step Advancement & Parallel Phases', '...',
    '## Task Planning Rules', '...',
    '## Code Responsibility Hierarchy', '...',
    '## Evidence-Based Reasoning & Investigation', '...'
].join('\n');
// Project-only file: real content, but none of the universal guides → incomplete.
const PROJECT_ONLY_FILE = '# Acme App\n\nOur internal build/deploy notes and module map.\n';

/** Populated config so isConfigPopulated() returns true (project.name + one section). */
function writePopulatedConfig(tmpDir, extra = {}) {
    const docsDir = path.join(tmpDir, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(
        path.join(docsDir, 'project-config.json'),
        JSON.stringify({ project: { name: 'Test Project' }, framework: { name: 'react' }, ...extra })
    );
}

/** Populated config that opts OUT of universal-guides completeness enforcement. */
function writeOptOutConfig(tmpDir) {
    writePopulatedConfig(tmpDir, { portability: { requireUniversalGuides: false } });
}

/** Temp project that passes hasProjectContent() (needs a content dir like src/). */
function createTempProjectDir() {
    const tmpDir = createTempDir();
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    return tmpDir;
}

function withEnv(tmpDir, fn) {
    const orig = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = tmpDir;
    try {
        return fn();
    } finally {
        if (orig === undefined) { delete process.env.CLAUDE_PROJECT_DIR; } else { process.env.CLAUDE_PROJECT_DIR = orig; }
        clearStateCache();
    }
}

// ============================================================================
// Unit Tests: lib/agent-files-state.cjs detection + dismiss
// ============================================================================

const libTests = [
    {
        name: '[agent-files-gate] getMissingAgentFiles returns both when neither root file exists',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                withEnv(tmpDir, () => {
                    const { getMissingAgentFiles, hasMissingAgentFiles } = freshState(tmpDir);
                    const missing = getMissingAgentFiles();
                    assertEqual(missing.length, 2, 'Both CLAUDE.md and AGENTS.md missing');
                    assertEqual(missing.map(m => m.file).sort().join(','), 'AGENTS.md,CLAUDE.md', 'Correct files reported');
                    assertTrue(hasMissingAgentFiles(), 'hasMissingAgentFiles true');
                });
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[agent-files-gate] getMissingAgentFiles returns empty when both files present',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                // Complete fixtures (carry the sentinel): both present AND not incomplete,
                // so hasMissingAgentFiles() — which now also flags incomplete — stays false.
                fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), COMPLETE_FILE);
                fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), COMPLETE_FILE);
                withEnv(tmpDir, () => {
                    const { getMissingAgentFiles, hasMissingAgentFiles } = freshState(tmpDir);
                    assertEqual(getMissingAgentFiles().length, 0, 'No missing files');
                    assertTrue(!hasMissingAgentFiles(), 'hasMissingAgentFiles false');
                });
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[agent-files-gate] getMissingAgentFiles reports only AGENTS.md when CLAUDE.md present',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# CLAUDE\n');
                withEnv(tmpDir, () => {
                    const { getMissingAgentFiles } = freshState(tmpDir);
                    const missing = getMissingAgentFiles();
                    assertEqual(missing.length, 1, 'One file missing');
                    assertEqual(missing[0].file, 'AGENTS.md', 'AGENTS.md is the missing one');
                    assertEqual(missing[0].aiRunnable, false, 'AGENTS.md route is user-invoked only');
                    assertContains(missing[0].route, 'sync-codex', 'Routes to /sync-codex');
                });
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[agent-files-gate] dismiss flag round-trips and reads back as dismissed',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                withEnv(tmpDir, () => {
                    const state = freshState(tmpDir);
                    assertTrue(!state.isAgentFilesDismissed(), 'Not dismissed before flag written');
                    state.writeAgentFilesDismissFlag();
                    assertTrue(state.isAgentFilesDismissed(), 'Dismissed after flag written');
                    // Flag lives under project tmp, not inside .claude (keeps framework portable)
                    assertTrue(
                        fs.existsSync(path.join(tmpDir, 'tmp', 'claude-temp', '.agent-files-dismissed')),
                        'Dismiss flag written to project tmp dir'
                    );
                });
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[agent-files-gate] dismiss flag past TTL reads back as NOT dismissed (expiry restores gate)',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                withEnv(tmpDir, () => {
                    const state = freshState(tmpDir);
                    state.writeAgentFilesDismissFlag();
                    assertTrue(state.isAgentFilesDismissed(), 'Fresh flag reads as dismissed (sanity)');
                    // Backdate the flag mtime just past the TTL window — the expiry branch
                    // (ageMs < DISMISS_TTL_MS === false) has no other coverage; DISMISS_TTL_MS
                    // is exported specifically to make this boundary testable without sleeping.
                    const flagPath = path.join(tmpDir, 'tmp', 'claude-temp', '.agent-files-dismissed');
                    const agedSec = (Date.now() - state.DISMISS_TTL_MS - 60_000) / 1000;
                    fs.utimesSync(flagPath, agedSec, agedSec);
                    assertTrue(!state.isAgentFilesDismissed(), 'Flag older than TTL → not dismissed (expiry branch)');
                });
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[agent-files-gate] isAgentFilesDismissRequest matches skip init / skip setup phrasing',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                withEnv(tmpDir, () => {
                    const { isAgentFilesDismissRequest } = freshState(tmpDir);
                    assertTrue(isAgentFilesDismissRequest('skip init'), 'matches "skip init"');
                    assertTrue(isAgentFilesDismissRequest('please skip setup for now'), 'matches "skip setup" in sentence');
                    assertTrue(isAgentFilesDismissRequest('SKIP  INIT'), 'case + whitespace tolerant');
                    assertTrue(!isAgentFilesDismissRequest('initialize the project'), 'does not match unrelated prompt');
                });
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[agent-files-gate] buildOfferMessage routes each missing file to its generator skill',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                withEnv(tmpDir, () => {
                    const { getMissingAgentFiles, buildOfferMessage } = freshState(tmpDir);
                    const msg = buildOfferMessage(getMissingAgentFiles());
                    assertContains(msg, '/project-init', 'Offers unified project init route');
                    assertContains(msg, '/claude-md-init', 'Offers CLAUDE.md route');
                    assertContains(msg, '/sync-codex', 'Offers AGENTS.md route');
                    assertContains(msg, 'node .claude/skills/sync-codex/scripts/run-codex-sync.mjs', 'Documents standalone Codex sync fallback');
                });
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[agent-files-gate] buildOfferMessage uses user-invoked phrasing for AGENTS.md route',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                withEnv(tmpDir, () => {
                    const { getMissingAgentFiles, buildOfferMessage } = freshState(tmpDir);
                    const missing = getMissingAgentFiles();
                    const claudeEntry = missing.find(m => m.file === 'CLAUDE.md');
                    assertTrue(!!claudeEntry, 'CLAUDE.md among missing');
                    assertEqual(claudeEntry.aiRunnable, true, 'CLAUDE.md route is AI-runnable');
                    const msg = buildOfferMessage(missing);
                    assertContains(msg, 'run /claude-md-init', 'aiRunnable=true → "run {route}" phrasing');
                    assertContains(msg, 'ask the user to run /sync-codex', 'AGENTS.md route uses user-invoked phrasing');
                    assertContains(msg, 'node .claude/skills/sync-codex/scripts/run-codex-sync.mjs', 'AGENTS.md route includes node fallback');
                });
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// Unit Tests: agent-files-skill-gate isAllowedSkill
// ============================================================================

const allowlistTests = [
    {
        name: '[agent-files-gate] isAllowedSkill permits meta + init-route + scan-* skills',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                withEnv(tmpDir, () => {
                    const { isAllowedSkill } = freshGate(tmpDir);
                    assertTrue(isAllowedSkill('project-init'), 'Unified project init coordinator allowed');
                    assertTrue(isAllowedSkill('/init-project'), 'Unified project init alias allowed');
                    assertTrue(isAllowedSkill('claude-md-init'), 'CLAUDE.md generator allowed');
                    assertTrue(isAllowedSkill('/sync-codex'), 'AGENTS.md generator allowed (leading slash)');
                    assertTrue(isAllowedSkill('project-config'), 'config skill allowed');
                    assertTrue(isAllowedSkill('scan-all'), 'scan-* orchestrator family allowed');
                    assertTrue(isAllowedSkill('scan'), 'bare scan host allowed');
                    assertTrue(isAllowedSkill('scan --target=backend-patterns'), 'parameterized scan host allowed');
                    assertTrue(isAllowedSkill('help:detail'), 'base name before colon allowed');
                    assertTrue(isAllowedSkill(''), 'empty skill name fails open (allowed)');
                });
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[agent-files-gate] isAllowedSkill blocks ordinary feature skills',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                withEnv(tmpDir, () => {
                    const { isAllowedSkill } = freshGate(tmpDir);
                    assertTrue(!isAllowedSkill('commit'), 'commit not in allowlist');
                    assertTrue(!isAllowedSkill('workflow-feature'), 'workflow skill not in allowlist');
                    assertTrue(!isAllowedSkill('understand'), 'understand not in allowlist');
                });
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// Integration Tests: agent-files-skill-gate.cjs via stdin
// ============================================================================

const skillGateIntegration = [
    {
        name: '[agent-files-gate] skill-gate WARNS and allows a feature skill when root files missing (content + config)',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                writePopulatedConfig(tmpDir);
                const result = await runHook(SKILL_GATE_PATH, createPreToolUseInput('Skill', { skill: 'commit' }), {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });
                assertAllowed(result.code, 'Allows feature skill while surfacing missing root files');
                assertContains(result.stdout, '/project-init', 'Routes to unified project init coordinator');
                assertContains(result.stdout, '/claude-md-init', 'Routes to CLAUDE.md generator');
                assertContains(result.stdout, 'AGENTS.md', 'Mentions missing AGENTS.md');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[agent-files-gate] skill-gate ALLOWS the init-route skill itself (no deadlock)',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                writePopulatedConfig(tmpDir);
                const result = await runHook(SKILL_GATE_PATH, createPreToolUseInput('Skill', { skill: 'claude-md-init' }), {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[agent-files-gate] skill-gate is DORMANT in an empty project (no content dirs)',
        fn: async () => {
            const tmpDir = createTempDir(); // no content dirs → hasProjectContent() false
            try {
                // Intentionally no config/docs dir — any directory would register as content.
                const result = await runHook(SKILL_GATE_PATH, createPreToolUseInput('Skill', { skill: 'commit' }), {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });
                assertAllowed(result.code, 'Empty project → gate dormant');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[agent-files-gate] skill-gate ALLOWS when config not yet populated (init-prompt-gate owns that)',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                // No project-config.json written → isConfigPopulated() false
                const result = await runHook(SKILL_GATE_PATH, createPreToolUseInput('Skill', { skill: 'commit' }), {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });
                assertAllowed(result.code, 'Unpopulated config → defer to prompt gate');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[agent-files-gate] skill-gate ALLOWS when both root files already exist (and complete)',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                writePopulatedConfig(tmpDir);
                // Complete fixtures — present AND carrying the universal-guides sentinel.
                fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), COMPLETE_FILE);
                fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), COMPLETE_FILE);
                const result = await runHook(SKILL_GATE_PATH, createPreToolUseInput('Skill', { skill: 'commit' }), {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });
                assertAllowed(result.code, 'Both files present + complete → nothing to gate');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[agent-files-gate] skill-gate ALLOWS after dismiss flag is set',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                writePopulatedConfig(tmpDir);
                const flagDir = path.join(tmpDir, 'tmp', 'claude-temp');
                fs.mkdirSync(flagDir, { recursive: true });
                fs.writeFileSync(path.join(flagDir, '.agent-files-dismissed'), new Date().toISOString() + '\n');
                const result = await runHook(SKILL_GATE_PATH, createPreToolUseInput('Skill', { skill: 'commit' }), {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });
                assertAllowed(result.code, 'Dismissed → gate silent');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[agent-files-gate] skill-gate RE-WARNS after dismiss flag expires past TTL',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                writePopulatedConfig(tmpDir);
                const flagDir = path.join(tmpDir, 'tmp', 'claude-temp');
                fs.mkdirSync(flagDir, { recursive: true });
                const flagPath = path.join(flagDir, '.agent-files-dismissed');
                fs.writeFileSync(flagPath, new Date().toISOString() + '\n');
                // Age the flag far past any reasonable TTL (24h) so the dismiss lapses and
                // enforcement returns — proves expiry is wired through the real hook process,
                // not just the unit-level isAgentFilesDismissed() check.
                const longExpired = new Date('2000-01-01T00:00:00Z');
                fs.utimesSync(flagPath, longExpired, longExpired);
                const result = await runHook(SKILL_GATE_PATH, createPreToolUseInput('Skill', { skill: 'commit' }), {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });
                assertAllowed(result.code, 'Expired dismiss → warning is emitted but skill is allowed');
                assertContains(result.stdout, '/project-init', 'Routes to unified project init coordinator after expiry');
                assertContains(result.stdout, '/claude-md-init', 'Routes to CLAUDE.md generator after expiry');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[agent-files-gate] skill-gate ignores non-Skill tool calls',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                writePopulatedConfig(tmpDir);
                const result = await runHook(SKILL_GATE_PATH, createPreToolUseInput('Bash', { command: 'ls' }), {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });
                assertAllowed(result.code, 'Non-Skill tool → not this gate concern');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// Integration Tests: init-prompt-gate.cjs handleAgentFilesGate via stdin
// ============================================================================

const promptGateIntegration = [
    {
        name: '[agent-files-gate] prompt-gate WARNS and allows an ordinary prompt when root files missing',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                writePopulatedConfig(tmpDir);
                const result = await runHook(PROMPT_GATE_PATH, createUserPromptInput('add a new feature to the dashboard'), {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });
                assertAllowed(result.code, 'Missing root files → warning emitted but prompt allowed');
                assertContains(result.stdout, '/project-init', 'Offer surfaces the unified project init route');
                assertContains(result.stdout, '/claude-md-init', 'Offer surfaces the CLAUDE.md route');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[agent-files-gate] prompt-gate "skip init" dismisses and allows (writes shared flag)',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                writePopulatedConfig(tmpDir);
                const result = await runHook(PROMPT_GATE_PATH, createUserPromptInput('skip init'), {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });
                assertAllowed(result.code, 'Dismiss request → allowed');
                assertTrue(
                    fs.existsSync(path.join(tmpDir, 'tmp', 'claude-temp', '.agent-files-dismissed')),
                    'Shared dismiss flag written'
                );
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// Unit Tests: universal-guides content detection (hasUniversalGuides / required)
// ============================================================================

const universalGuidesTests = [
    {
        name: '[agent-files-gate] hasUniversalGuides: current sentinel → complete',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                withEnv(tmpDir, () => {
                    const { hasUniversalGuides } = freshState(tmpDir);
                    assertTrue(hasUniversalGuides('<!-- CK:UNIVERSAL-GUIDES v3 -->\n# x'), 'v3 (current) sentinel passes');
                });
            } finally { cleanupTempDir(tmpDir); }
        }
    },
    {
        name: '[agent-files-gate] hasUniversalGuides: newer sentinel → complete (forward-compatible)',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                withEnv(tmpDir, () => {
                    const { hasUniversalGuides } = freshState(tmpDir);
                    assertTrue(hasUniversalGuides('<!-- CK:UNIVERSAL-GUIDES v4 -->\n# x'), 'v4 >= v3 passes');
                });
            } finally { cleanupTempDir(tmpDir); }
        }
    },
    {
        name: '[agent-files-gate] hasUniversalGuides: older sentinel → incomplete (re-offers update)',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                withEnv(tmpDir, () => {
                    const { hasUniversalGuides } = freshState(tmpDir);
                    assertTrue(!hasUniversalGuides('<!-- CK:UNIVERSAL-GUIDES v2 -->\n# x'), 'v2 < v3 flagged (bump re-offers update)');
                });
            } finally { cleanupTempDir(tmpDir); }
        }
    },
    {
        name: '[agent-files-gate] hasUniversalGuides: no sentinel but all anchors present → complete (legacy)',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                withEnv(tmpDir, () => {
                    const { hasUniversalGuides } = freshState(tmpDir);
                    assertTrue(hasUniversalGuides(LEGACY_COMPLETE_FILE), 'all required anchors → passes without sentinel');
                });
            } finally { cleanupTempDir(tmpDir); }
        }
    },
    {
        name: '[agent-files-gate] hasUniversalGuides: project-only file (no sentinel, missing anchors) → incomplete',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                withEnv(tmpDir, () => {
                    const { hasUniversalGuides } = freshState(tmpDir);
                    assertTrue(!hasUniversalGuides(PROJECT_ONLY_FILE), 'project-only content flagged incomplete');
                    assertTrue(!hasUniversalGuides(''), 'empty content flagged incomplete');
                });
            } finally { cleanupTempDir(tmpDir); }
        }
    },
    {
        name: '[agent-files-gate] isUniversalGuidesRequired: defaults true when no config',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                withEnv(tmpDir, () => {
                    const { isUniversalGuidesRequired } = freshState(tmpDir);
                    assertTrue(isUniversalGuidesRequired(), 'no config → enforcement on by default');
                });
            } finally { cleanupTempDir(tmpDir); }
        }
    },
    {
        name: '[agent-files-gate] isUniversalGuidesRequired: false when portability.requireUniversalGuides=false',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                writeOptOutConfig(tmpDir);
                withEnv(tmpDir, () => {
                    const { isUniversalGuidesRequired } = freshState(tmpDir);
                    assertTrue(!isUniversalGuidesRequired(), 'opt-out flag disables enforcement');
                });
            } finally { cleanupTempDir(tmpDir); }
        }
    },
    {
        name: '[agent-files-gate] getAgentFileIssues: both present but project-only → 2 incomplete/update issues',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                writePopulatedConfig(tmpDir); // enforcement on (default)
                fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), PROJECT_ONLY_FILE);
                fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), PROJECT_ONLY_FILE);
                withEnv(tmpDir, () => {
                    const { getAgentFileIssues } = freshState(tmpDir);
                    const issues = getAgentFileIssues();
                    assertEqual(issues.length, 2, 'Both flagged incomplete');
                    assertTrue(issues.every(i => i.reason === 'incomplete'), 'reason=incomplete');
                    assertTrue(issues.every(i => i.mode === 'update'), 'routed to update (smart-merge)');
                });
            } finally { cleanupTempDir(tmpDir); }
        }
    },
    {
        name: '[agent-files-gate] getAgentFileIssues: opt-out suppresses incomplete but still flags missing',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                writeOptOutConfig(tmpDir);
                // CLAUDE.md exists but project-only (would be incomplete); AGENTS.md missing.
                fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), PROJECT_ONLY_FILE);
                withEnv(tmpDir, () => {
                    const { getAgentFileIssues } = freshState(tmpDir);
                    const issues = getAgentFileIssues();
                    assertEqual(issues.length, 1, 'Only the genuinely missing file is reported');
                    assertEqual(issues[0].file, 'AGENTS.md', 'AGENTS.md still flagged');
                    assertEqual(issues[0].reason, 'missing', 'reason=missing (existence still enforced)');
                });
            } finally { cleanupTempDir(tmpDir); }
        }
    },
    {
        name: '[agent-files-gate] getAgentFileIssues: complete CLAUDE.md + missing AGENTS.md → one missing issue',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                writePopulatedConfig(tmpDir);
                fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), COMPLETE_FILE);
                withEnv(tmpDir, () => {
                    const { getAgentFileIssues } = freshState(tmpDir);
                    const issues = getAgentFileIssues();
                    assertEqual(issues.length, 1, 'Only AGENTS.md is an issue');
                    assertEqual(issues[0].file, 'AGENTS.md', 'AGENTS.md missing');
                    assertEqual(issues[0].reason, 'missing', 'complete CLAUDE.md not flagged');
                });
            } finally { cleanupTempDir(tmpDir); }
        }
    },
    {
        name: '[agent-files-gate] buildOfferMessage: incomplete entry routes to smart-merge update + opt-out hint',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                writePopulatedConfig(tmpDir);
                fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), PROJECT_ONLY_FILE);
                fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), PROJECT_ONLY_FILE);
                withEnv(tmpDir, () => {
                    const { getAgentFileIssues, buildOfferMessage } = freshState(tmpDir);
                    const msg = buildOfferMessage(getAgentFileIssues());
                    assertContains(msg, 'smart-merge', 'mentions non-destructive smart-merge');
                    assertContains(msg, '--mode update', 'routes incomplete files to update mode');
                    assertContains(msg, 'requireUniversalGuides', 'documents the persistent opt-out flag');
                });
            } finally { cleanupTempDir(tmpDir); }
        }
    }
];

// ============================================================================
// Integration Tests: incomplete-file detection + opt-out via the live gates
// ============================================================================

const incompleteFileIntegration = [
    {
        name: '[agent-files-gate] skill-gate WARNS and allows when root files exist but are project-only (incomplete)',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                writePopulatedConfig(tmpDir);
                fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), PROJECT_ONLY_FILE);
                fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), PROJECT_ONLY_FILE);
                const result = await runHook(SKILL_GATE_PATH, createPreToolUseInput('Skill', { skill: 'commit' }), {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });
                assertAllowed(result.code, 'Project-only files → warning emitted for universal-guides update');
                assertContains(result.stdout, 'smart-merge', 'Routes to non-destructive update');
            } finally { cleanupTempDir(tmpDir); }
        }
    },
    {
        name: '[agent-files-gate] skill-gate ALLOWS project-only files when opt-out flag is set',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                writeOptOutConfig(tmpDir);
                fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), PROJECT_ONLY_FILE);
                fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), PROJECT_ONLY_FILE);
                const result = await runHook(SKILL_GATE_PATH, createPreToolUseInput('Skill', { skill: 'commit' }), {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });
                assertAllowed(result.code, 'Opt-out → completeness not enforced, project-only files accepted');
            } finally { cleanupTempDir(tmpDir); }
        }
    },
    {
        name: '[agent-files-gate] prompt-gate WARNS and allows an ordinary prompt when root files are incomplete',
        fn: async () => {
            const tmpDir = createTempProjectDir();
            try {
                writePopulatedConfig(tmpDir);
                fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), PROJECT_ONLY_FILE);
                fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), PROJECT_ONLY_FILE);
                const result = await runHook(PROMPT_GATE_PATH, createUserPromptInput('add a new feature to the dashboard'), {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });
                assertAllowed(result.code, 'Incomplete root files → warning emitted but prompt allowed');
                assertContains(result.stdout, '--mode update', 'Offer surfaces the smart-merge update route');
            } finally { cleanupTempDir(tmpDir); }
        }
    }
];

// ============================================================================
// Sync Test: generator sentinel ↔ detector contract (mirror-staleness guard)
// ============================================================================

const sentinelSyncTests = [
    {
        name: '[agent-files-gate] generator + template stay in lockstep with the detector sentinel version',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                withEnv(tmpDir, () => {
                    const { UNIVERSAL_GUIDES_VERSION, SENTINEL_RE, hasUniversalGuides } = freshState(tmpDir);

                    // 1) Generator declares the SAME version as the detector.
                    const genSrc = fs.readFileSync(GENERATOR_PATH, 'utf-8');
                    const genVersionMatch = genSrc.match(/UNIVERSAL_GUIDES_VERSION\s*=\s*(\d+)/);
                    assertTrue(!!genVersionMatch, 'Generator declares UNIVERSAL_GUIDES_VERSION');
                    assertEqual(
                        Number(genVersionMatch[1]),
                        UNIVERSAL_GUIDES_VERSION,
                        'Generator version matches detector UNIVERSAL_GUIDES_VERSION'
                    );

                    // 2) The literal sentinel the generator emits is recognized by the detector.
                    const emitted = `<!-- CK:UNIVERSAL-GUIDES v${UNIVERSAL_GUIDES_VERSION} -->`;
                    assertTrue(SENTINEL_RE.test(emitted), 'Detector regex matches the emitted sentinel');
                    assertTrue(hasUniversalGuides(emitted), 'Emitted sentinel reads as complete');

                    // 3) The init template ships a sentinel the detector accepts as current.
                    const tmpl = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
                    const tmplMatch = tmpl.match(SENTINEL_RE);
                    assertTrue(!!tmplMatch, 'Template carries a universal-guides sentinel');
                    assertTrue(
                        Number(tmplMatch[1]) >= UNIVERSAL_GUIDES_VERSION,
                        'Template sentinel is current-or-newer'
                    );
                });
            } finally { cleanupTempDir(tmpDir); }
        }
    },
    {
        // Anchor mirror lockstep: the generator gates the sentinel on the SAME anchors the
        // detector uses for the legacy/no-sentinel fallback. If the two lists drift, the
        // generator could stamp on content the detector still reads as incomplete (or vice
        // versa). Source-text mirror (no cross-layer import) — same policy as the version check.
        name: '[agent-files-gate] generator REQUIRED_ANCHORS mirror the detector anchors',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                withEnv(tmpDir, () => {
                    const { REQUIRED_ANCHORS } = freshState(tmpDir);
                    const genSrc = fs.readFileSync(GENERATOR_PATH, 'utf-8');
                    for (const re of REQUIRED_ANCHORS) {
                        assertTrue(genSrc.includes(re.source), `Generator mirrors detector anchor /${re.source}/`);
                    }
                });
            } finally { cleanupTempDir(tmpDir); }
        }
    },
    {
        // F1 regression: the sentinel is a content-presence promise. Running `--mode update`
        // on a markerless project-only CLAUDE.md is a no-op merge (no marked sections to sync,
        // no static guides injected) — it must NOT stamp a sentinel, or the bootstrap gate would
        // read a permanent false "complete" on a file that never received the universal guides.
        name: '[agent-files-gate] generator update on a markerless project-only file does not stamp a false sentinel',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                writePopulatedConfig(tmpDir);
                const claudeMd = path.join(tmpDir, 'CLAUDE.md');
                fs.writeFileSync(claudeMd, PROJECT_ONLY_FILE);

                execFileSync('node', [GENERATOR_PATH, '--mode', 'update'], {
                    cwd: tmpDir,
                    env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir },
                    stdio: 'pipe'
                });

                withEnv(tmpDir, () => {
                    const out = fs.readFileSync(claudeMd, 'utf-8');
                    const { SENTINEL_RE, hasUniversalGuides, getAgentFileIssues } = freshState(tmpDir);
                    assertTrue(!SENTINEL_RE.test(out), 'No sentinel stamped on a markerless project-only update');
                    assertTrue(!hasUniversalGuides(out), 'Detector still reads the updated file as incomplete');
                    const claude = getAgentFileIssues().find(i => i.file === 'CLAUDE.md');
                    assertTrue(!!claude && claude.reason === 'incomplete', 'Gate still flags CLAUDE.md incomplete after the no-op update');
                });
            } finally { cleanupTempDir(tmpDir); }
        }
    },
    {
        // Counterpart to F1: a MARKER-MANAGED file (it carries SECTION markers, so it is
        // generator-lineage, not project-only) that drifted from a newer template and lost a
        // static guide section. `--mode update` must back-fill the missing guide from the
        // template AND stamp the sentinel — otherwise the bootstrap gate dead-ends, flagging
        // the file incomplete on every run with no route that actually fixes it.
        name: '[agent-files-gate] generator update back-fills a drifted guide into a marker-managed file and stamps',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                writePopulatedConfig(tmpDir);
                const claudeMd = path.join(tmpDir, 'CLAUDE.md');
                // Marker-managed (has SECTION:tldr) + 4 of 5 anchors; MISSING "First Action Decision".
                const markeredMissingGuide = [
                    '# Project',
                    '',
                    '<!-- SECTION:tldr -->',
                    '> **Project:** Test',
                    '<!-- /SECTION:tldr -->',
                    '',
                    '## Workflow Step Advancement & Parallel Phases',
                    '...',
                    '## Task Planning Rules',
                    '...',
                    '## Code Responsibility Hierarchy',
                    '...',
                    '## Evidence-Based Reasoning & Investigation',
                    '...'
                ].join('\n');
                fs.writeFileSync(claudeMd, markeredMissingGuide);

                execFileSync('node', [GENERATOR_PATH, '--mode', 'update'], {
                    cwd: tmpDir,
                    env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir },
                    stdio: 'pipe'
                });

                withEnv(tmpDir, () => {
                    const out = fs.readFileSync(claudeMd, 'utf-8');
                    const { hasUniversalGuides, SENTINEL_RE } = freshState(tmpDir);
                    assertTrue(/first action decision/i.test(out), 'Missing guide back-filled from template');
                    assertTrue(SENTINEL_RE.test(out), 'Sentinel stamped once guides are complete');
                    assertTrue(hasUniversalGuides(out), 'Detector now reads the file as complete');
                });

                // Idempotent: a second update must not duplicate the back-filled heading.
                execFileSync('node', [GENERATOR_PATH, '--mode', 'update'], {
                    cwd: tmpDir,
                    env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir },
                    stdio: 'pipe'
                });
                const out2 = fs.readFileSync(claudeMd, 'utf-8');
                const headingCount = (out2.match(/^##\s+First Action Decision/gim) || []).length;
                assertEqual(headingCount, 1, 'Back-filled guide is not duplicated on re-run');
            } finally { cleanupTempDir(tmpDir); }
        }
    },
    {
        // Init mode still stamps: the template ships the guides, so a fresh generate must
        // produce a sentinel the detector accepts (the fix must not regress the happy path).
        name: '[agent-files-gate] generator init still stamps a recognized sentinel',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                writePopulatedConfig(tmpDir);
                const claudeMd = path.join(tmpDir, 'CLAUDE.md');

                execFileSync('node', [GENERATOR_PATH, '--mode', 'init'], {
                    cwd: tmpDir,
                    env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir },
                    stdio: 'pipe'
                });

                withEnv(tmpDir, () => {
                    const out = fs.readFileSync(claudeMd, 'utf-8');
                    const { hasUniversalGuides } = freshState(tmpDir);
                    assertTrue(hasUniversalGuides(out), 'Init output reads as complete (sentinel + guides present)');
                });
            } finally { cleanupTempDir(tmpDir); }
        }
    }
];

module.exports = {
    name: 'Agent-Files Bootstrap Gate',
    tests: [
        ...libTests,
        ...universalGuidesTests,
        ...allowlistTests,
        ...skillGateIntegration,
        ...incompleteFileIntegration,
        ...promptGateIntegration,
        ...sentinelSyncTests
    ]
};
