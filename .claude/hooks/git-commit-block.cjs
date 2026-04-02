#!/usr/bin/env node
'use strict';
/**
 * Git Commit/Push Block Hook
 *
 * Blocks `git commit`, `git push`, and `git add` commands unless:
 * 1. The /commit skill is active (marker file exists), OR
 * 2. The user explicitly allows it via permission prompt
 *
 * Prevents AI from self-asking "Shall I commit?" and then auto-committing
 * without waiting for user confirmation.
 *
 * @hook PreToolUse
 * @matcher Bash
 */

const fs = require('fs');
const path = require('path');
const { COMMIT_SKILL_MARKER_PATH } = require('./lib/ck-paths.cjs');

// Marker file created by /commit skill to bypass this hook
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const COMMIT_SKILL_MARKER = COMMIT_SKILL_MARKER_PATH;

// Git commands that require explicit user request.
// Patterns use lookbehind to match only at command boundaries (start of line, after &&, ||, ;)
// to avoid false positives from strings/echo content containing "git".
const BLOCKED_GIT_PATTERNS = [
    {
        pattern: /(?:^|&&|\|\||;)\s*git\s+commit\s+--amend\b/m,
        name: 'git commit --amend',
        reason: 'Amending commits is NEVER allowed — always create new commits. Amend can corrupt other commits when HEAD has moved.'
    },
    {
        pattern: /(?:^|&&|\|\||;)\s*git\s+commit\b/m,
        name: 'git commit',
        reason: 'Commits must be explicitly requested by the user (use /commit skill)'
    },
    {
        pattern: /(?:^|&&|\|\||;)\s*git\s+push\b/m,
        name: 'git push',
        reason: 'Pushes must be explicitly requested by the user'
    },
    {
        pattern: /(?:^|&&|\|\||;)\s*git\s+add\s+(?!--dry-run)/m,
        name: 'git add',
        reason: 'Staging files for commit must be explicitly requested by the user (use /commit skill)'
    }
];

// Commands that are always allowed (read-only git operations)
const ALLOWED_GIT_COMMANDS = new Set([
    'status',
    'diff',
    'log',
    'show',
    'branch',
    'stash',
    'remote',
    'fetch',
    'rev-parse',
    'describe',
    'tag',
    'blame',
    'check-ignore',
    'ls-files',
    'restore',
    'shortlog',
    'whatchanged',
    'config'
]);

// Additional allowed patterns (compound checks)
const ALLOWED_COMPOUND_PATTERNS = [/(?:^|&&|\|\||;)\s*git\s+reset\s+HEAD\b/m, /(?:^|&&|\|\||;)\s*git\s+add\s+--dry-run\b/m];

function formatBlockMessage(match) {
    const markerPath = COMMIT_SKILL_MARKER.replace(/\\/g, '/');

    // --amend is NEVER allowed, no bypass
    if (match.name === 'git commit --amend') {
        return [
            `[BLOCKED] ${match.name} — ${match.reason}`,
            '',
            'NEVER use --amend. Always create a NEW commit instead.',
            'This block cannot be bypassed.'
        ].join('\n');
    }

    return [
        `[BLOCKED] ${match.name} — ${match.reason}`,
        '',
        'If the user EXPLICITLY asked you to commit/push in their prompt, activate the bypass first:',
        `  1. Run: touch "${markerPath}"`,
        '  2. Then retry your git command',
        `  3. After done, run: rm -f "${markerPath}"`,
        '',
        'If the user did NOT ask you to commit — do NOT create the bypass. Report your changes and wait.',
        '',
        'Allowed git operations: status, diff, log, show, branch, fetch, restore, reset HEAD'
    ].join('\n');
}

function isCommitSkillActive() {
    try {
        return fs.existsSync(COMMIT_SKILL_MARKER);
    } catch {
        return false;
    }
}

function main() {
    try {
        const input = JSON.parse(fs.readFileSync(process.stdin.fd, 'utf-8'));

        if (input.tool_name !== 'Bash') {
            process.exit(0);
        }

        const command = input.tool_input?.command || '';

        // Skip if no git command at start of a statement (after &&, ||, ;, or line start)
        // Avoid false positives from echo/string content containing "git"
        if (!/(?:^|&&|\|\||;)\s*git\s+/m.test(command)) {
            process.exit(0);
        }

        // Always allow read-only git operations
        // Extract the git subcommand from each statement in the command
        const gitSubcommands = [...command.matchAll(/(?:^|&&|\|\||;)\s*git\s+(\S+)/gm)].map(m => m[1]);
        if (gitSubcommands.length > 0 && gitSubcommands.every(sub => ALLOWED_GIT_COMMANDS.has(sub))) {
            process.exit(0);
        }

        // Allow compound patterns (e.g., git reset HEAD, git add --dry-run)
        if (ALLOWED_COMPOUND_PATTERNS.some(p => p.test(command))) {
            process.exit(0);
        }

        // Check --amend FIRST — never allowed, even with commit skill active
        const amendMatch = BLOCKED_GIT_PATTERNS.find(p => p.name === 'git commit --amend' && p.pattern.test(command));
        if (amendMatch) {
            console.error(formatBlockMessage(amendMatch));
            process.exit(2);
        }

        // Allow if /commit skill is active (marker file exists)
        if (isCommitSkillActive()) {
            process.exit(0);
        }

        // Check for blocked patterns
        const match = BLOCKED_GIT_PATTERNS.find(p => p.pattern.test(command));

        if (match) {
            console.error(formatBlockMessage(match));
            process.exit(2);
        }

        // Allow all other commands
        process.exit(0);
    } catch (error) {
        console.error(`git-commit-block error: ${error.message}`);
        process.exit(0); // Fail-open
    }
}

main();
