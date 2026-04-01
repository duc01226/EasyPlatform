#!/usr/bin/env node
'use strict';
/**
 * Tests for git-commit-block.cjs PreToolUse hook
 *
 * Verifies that git commit/add/push commands are blocked unless
 * the /commit skill marker file exists, while read-only git
 * operations are always allowed.
 *
 * Usage: node test-git-commit-block.cjs [--verbose]
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const HOOKS_DIR = path.resolve(__dirname, '..');
const HOOK_FILE = 'git-commit-block.cjs';
// PROJECT_DIR = the repo root (two levels up from hooks/tests/)
const PROJECT_DIR = path.resolve(HOOKS_DIR, '..', '..');
// Marker path must match hook: CLAUDE_PROJECT_DIR/.claude/.commit-skill-active
const MARKER_FILE = path.join(PROJECT_DIR, '.claude', '.commit-skill-active');

let passed = 0;
let failed = 0;
const verbose = process.argv.includes('--verbose');

function log(msg) {
    console.log(msg);
}
function logResult(name, ok) {
    if (ok) {
        passed++;
        log(`  [PASS] ${name}`);
    } else {
        failed++;
        log(`  [FAIL] ${name}`);
    }
}

async function runHook(input, env = {}) {
    return new Promise(resolve => {
        const hookPath = path.join(HOOKS_DIR, HOOK_FILE);
        const proc = spawn('node', [hookPath], {
            env: { ...process.env, CLAUDE_PROJECT_DIR: PROJECT_DIR, ...env },
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 5000
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', d => (stdout += d.toString()));
        proc.stderr.on('data', d => (stderr += d.toString()));

        proc.stdin.write(JSON.stringify(input));
        proc.stdin.end();

        proc.on('close', code => resolve({ code, stdout, stderr }));
        proc.on('error', () => resolve({ code: 1, stdout, stderr }));
    });
}

function bashInput(command) {
    return { tool_name: 'Bash', tool_input: { command } };
}

// ============================================================================
// Test Cases
// ============================================================================

async function testBlockedCommands() {
    log('\n--- Blocked Commands (should exit 2) ---');

    const blocked = [
        { cmd: 'git commit -m "test"', name: 'git commit with message' },
        { cmd: 'git commit --amend', name: 'git commit amend' },
        { cmd: 'git push', name: 'git push' },
        { cmd: 'git push origin main', name: 'git push origin main' },
        { cmd: 'git push --force', name: 'git push force' },
        { cmd: 'git add .', name: 'git add all' },
        { cmd: 'git add src/file.cs', name: 'git add specific file' },
        { cmd: 'git add -A', name: 'git add -A' }
    ];

    for (const { cmd, name } of blocked) {
        const result = await runHook(bashInput(cmd));
        logResult(`BLOCK: ${name}`, result.code === 2);
        if (result.code !== 2 && verbose) log(`    Expected exit 2, got ${result.code}. stderr: ${result.stderr}`);
        if (result.code === 2) {
            // --amend has no bypass (permanently blocked), other commands show bypass instructions
            const isAmend = cmd.includes('--amend');
            const hasExpectedMsg = isAmend
                ? result.stderr.includes('[BLOCKED]') && result.stderr.includes('NEVER')
                : result.stderr.includes('[BLOCKED]') && result.stderr.includes('commit-skill-active');
            logResult(`BLOCK MSG: ${name} has ${isAmend ? 'permanent block' : 'bypass instructions'}`, hasExpectedMsg);
        }
    }
}

async function testBlockedChainedCommands() {
    log('\n--- Blocked Chained Commands (should exit 2) ---');

    const blocked = [
        { cmd: 'git status && git commit -m "auto"', name: 'status then commit' },
        { cmd: 'git diff && git add . && git commit -m "msg"', name: 'diff then add then commit' },
        { cmd: 'echo done; git push origin main', name: 'echo then push' },
        { cmd: 'ls; git add src/', name: 'ls then git add' }
    ];

    for (const { cmd, name } of blocked) {
        const result = await runHook(bashInput(cmd));
        logResult(`BLOCK CHAIN: ${name}`, result.code === 2);
        if (result.code !== 2 && verbose) log(`    Expected exit 2, got ${result.code}`);
    }
}

async function testAllowedReadOnly() {
    log('\n--- Allowed Read-Only Commands (should exit 0) ---');

    const allowed = [
        { cmd: 'git status', name: 'git status' },
        { cmd: 'git diff --stat', name: 'git diff' },
        { cmd: 'git log --oneline -5', name: 'git log' },
        { cmd: 'git show HEAD', name: 'git show' },
        { cmd: 'git branch -a', name: 'git branch' },
        { cmd: 'git stash list', name: 'git stash list' },
        { cmd: 'git remote -v', name: 'git remote' },
        { cmd: 'git fetch --all', name: 'git fetch' },
        { cmd: 'git rev-parse HEAD', name: 'git rev-parse' },
        { cmd: 'git describe --tags', name: 'git describe' },
        { cmd: 'git tag -l', name: 'git tag' },
        { cmd: 'git blame src/file.cs', name: 'git blame' },
        { cmd: 'git check-ignore .env', name: 'git check-ignore' },
        { cmd: 'git ls-files', name: 'git ls-files' },
        { cmd: 'git restore src/file.cs', name: 'git restore' },
        { cmd: 'git config user.name', name: 'git config' }
    ];

    for (const { cmd, name } of allowed) {
        const result = await runHook(bashInput(cmd));
        logResult(`ALLOW: ${name}`, result.code === 0);
        if (result.code !== 0 && verbose) log(`    Expected exit 0, got ${result.code}. stderr: ${result.stderr}`);
    }
}

async function testAllowedCompound() {
    log('\n--- Allowed Compound Patterns (should exit 0) ---');

    const allowed = [
        { cmd: 'git reset HEAD -- file.cs', name: 'git reset HEAD (unstage)' },
        { cmd: 'git add --dry-run .', name: 'git add dry run' }
    ];

    for (const { cmd, name } of allowed) {
        const result = await runHook(bashInput(cmd));
        logResult(`ALLOW COMPOUND: ${name}`, result.code === 0);
        if (result.code !== 0 && verbose) log(`    Expected exit 0, got ${result.code}. stderr: ${result.stderr}`);
    }
}

async function testAllowedChainedReadOnly() {
    log('\n--- Allowed Chained Read-Only (should exit 0) ---');

    const allowed = [
        { cmd: 'git status && git diff', name: 'status && diff' },
        { cmd: 'git log --oneline -3 && git diff --cached --stat', name: 'log && diff cached' },
        { cmd: 'git status; git log -1', name: 'status; log' }
    ];

    for (const { cmd, name } of allowed) {
        const result = await runHook(bashInput(cmd));
        logResult(`ALLOW CHAIN: ${name}`, result.code === 0);
        if (result.code !== 0 && verbose) log(`    Expected exit 0, got ${result.code}. stderr: ${result.stderr}`);
    }
}

async function testFalsePositives() {
    log('\n--- False Positive Prevention (should exit 0) ---');

    const noFalsePositives = [
        { cmd: 'echo "this mentions git commit"', name: 'echo with git commit string' },
        { cmd: 'echo "git add is blocked" > /dev/null', name: 'echo with git add string' },
        { cmd: 'cat README.md | grep "git push"', name: 'grep for git push in file' },
        { cmd: 'ls -la', name: 'non-git command' },
        { cmd: 'dotnet build', name: 'dotnet build' },
        { cmd: 'npm run test', name: 'npm run test' }
    ];

    for (const { cmd, name } of noFalsePositives) {
        const result = await runHook(bashInput(cmd));
        logResult(`NO FALSE POS: ${name}`, result.code === 0);
        if (result.code !== 0 && verbose) log(`    Expected exit 0, got ${result.code}. stderr: ${result.stderr}`);
    }
}

async function testMarkerFileBypass() {
    log('\n--- Marker File Bypass (/commit skill active) ---');

    // Create marker file
    fs.writeFileSync(MARKER_FILE, 'active');

    try {
        const blockedWithoutMarker = [
            { cmd: 'git commit -m "test"', name: 'git commit with marker' },
            { cmd: 'git add .', name: 'git add with marker' },
            { cmd: 'git push origin main', name: 'git push with marker' }
        ];

        for (const { cmd, name } of blockedWithoutMarker) {
            const result = await runHook(bashInput(cmd));
            logResult(`BYPASS: ${name}`, result.code === 0);
            if (result.code !== 0 && verbose) log(`    Expected exit 0 (marker bypass), got ${result.code}`);
        }
    } finally {
        // Always cleanup marker
        try {
            fs.unlinkSync(MARKER_FILE);
        } catch {}
    }

    // Verify commands are blocked again after marker removal
    const result = await runHook(bashInput('git commit -m "should block"'));
    logResult(`BLOCK AFTER MARKER REMOVED: git commit`, result.code === 2);
}

async function testNonBashToolIgnored() {
    log('\n--- Non-Bash Tool (should exit 0 / passthrough) ---');

    const result = await runHook({
        tool_name: 'Edit',
        tool_input: { file_path: 'test.txt', old_string: 'a', new_string: 'b' }
    });
    logResult('PASSTHROUGH: Edit tool', result.code === 0);

    const result2 = await runHook({
        tool_name: 'Read',
        tool_input: { file_path: 'test.txt' }
    });
    logResult('PASSTHROUGH: Read tool', result2.code === 0);
}

async function testEdgeCases() {
    log('\n--- Edge Cases ---');

    // Empty command
    const empty = await runHook(bashInput(''));
    logResult('EDGE: empty command', empty.code === 0);

    // Malformed input
    const malformed = await runHook({ tool_name: 'Bash' });
    logResult('EDGE: missing tool_input', malformed.code === 0);

    // Git command with extra whitespace
    const whitespace = await runHook(bashInput('  git   commit  -m "test"'));
    logResult('EDGE: git commit with extra whitespace', whitespace.code === 2);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
    log('=== git-commit-block.cjs Test Suite ===\n');

    await testBlockedCommands();
    await testBlockedChainedCommands();
    await testAllowedReadOnly();
    await testAllowedCompound();
    await testAllowedChainedReadOnly();
    await testFalsePositives();
    await testMarkerFileBypass();
    await testNonBashToolIgnored();
    await testEdgeCases();

    log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
    process.exit(failed > 0 ? 1 : 0);
}

main();
