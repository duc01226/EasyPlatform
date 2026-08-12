#!/usr/bin/env node
'use strict';
/**
 * Bash Shell Guard Hook — PowerShell here-string detection for Git Bash
 *
 * Blocks the one PowerShell construct that can be recognised reliably without parsing the command,
 * and replaces Git Bash's cryptic response with the POSIX form the author actually wanted.
 *
 * WHAT THIS DOES — AND WHAT IT DELIBERATELY DOES NOT
 * --------------------------------------------------
 * An earlier revision also blocked "incomplete" bash constructs (unterminated quotes, heredocs,
 * `$(`, backticks, dangling operators) on the stated premise that they leave bash waiting in its
 * PS2 state and return `exit 0 · empty output · no side effects`.
 *
 * That premise was MEASURED AND DISPROVEN (2026-08-05). Under `bash -c` — the delivery mode this
 * CLI uses — nothing hangs:
 *
 *   unterminated " / ' / $( / `      -> exit 2 + "unexpected EOF while looking for matching ..."
 *   dangling && / |                  -> exit 2 + "syntax error: unexpected end of file"
 *   unterminated heredoc             -> exit 0, runs correctly (warning only)
 *   trailing backslash               -> exit 0, runs correctly
 *
 * and the tool surfaces the failure loudly, e.g.
 *   $ echo "$(date"
 *   Exit code 2
 *   /usr/bin/bash: eval: line 31: unexpected EOF while looking for matching `"'
 *
 * Shells are also spawned fresh per invocation (measured: distinct PIDs across calls), so one bad
 * command cannot poison a later one. The completeness lexer was therefore removed: it duplicated an
 * error bash already reports precisely, while producing 8 confirmed FALSE POSITIVES that blocked
 * valid commands (`<<<` here-strings, `<<-` tab-stripped heredocs, backticks in commit messages).
 *
 * A PowerShell backtick line-continuation detector was ALSO considered and rejected. It cannot be
 * separated from a JS/GLSL template literal without full quote/heredoc context: both end a line with
 * a single unmatched backtick. Measured over this repo's own documentation, an odd-backtick-count
 * heuristic flagged 56 of 2289 fenced blocks — every one a template literal, none a continuation.
 * Since `cat > x.js <<'EOF' … const p = `…` … EOF` is an ordinary Bash command here, that detector
 * would block real work to translate an error bash already reports (exit 2, "unexpected EOF").
 *
 * See plans/reports/why-review-260805-0517-bash-shell-guard.md for the full evidence.
 *
 * WHAT REMAINS — exactly one check
 * --------------------------------
 * A PowerShell here-string still fails in Git Bash with a message that does not name the problem:
 *
 *   @'          ->  bash: line 1: @: command not found      (exit 127)
 *   text
 *   '@
 *
 * Loud, but cryptic. Translating it into "you wrote PowerShell; here is the POSIX heredoc" is this
 * hook's entire remaining job — a developer-experience win, not a safety net.
 *
 * FALSE POSITIVES ARE THE PRIMARY RISK. Because the construct it guards already fails loudly, a
 * missed detection costs almost nothing while a wrong block costs real work. Every rule below is
 * therefore biased toward allowing, and the whole check is skipped on any command containing `<<`.
 *
 * Fails OPEN (exit 0) on any internal error, and records the failure to a log file so a guard that
 * silently stops guarding is still discoverable.
 *
 * Tests: .claude/hooks/tests/suites/bash-shell-guard.test.cjs  (node .claude/hooks/tests/run-all-tests.cjs)
 *
 * @hook PreToolUse
 * @matcher Bash
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Detects a PowerShell here-string: an opener line ENDING in `@'` or `@"` (the idiomatic form is
 * `$text = @'`), closed by a later line that is EXACTLY `'@` or `"@`.
 *
 * Three deliberate narrowings, each one biased toward allowing:
 *
 * 1. The CLOSER must stand alone on its line, and it is the anchor doing the discriminating work.
 *    A C# verbatim string also opens with `@"` at end of line, but it closes with a bare `"` — it
 *    can never produce a line that is exactly `"@`. Requiring the pair is what makes an opener-only
 *    heuristic safe. The opener itself is matched loosely (`= @'`, `(@'`, bare `@'`) because the
 *    real-world mistake always carries an assignment.
 * 2. Any command containing `<<` is skipped entirely. Writing a .ps1 file through a heredoc
 *    (`cat > s.ps1 <<'EOF' … @' … '@ … EOF`) is legitimate Bash carrying a legitimate here-string,
 *    and telling its author to "use a heredoc" would be absurd. `<<` also covers `<<<` and bit
 *    shifts in embedded code, which only makes the skip more conservative.
 * 3. Nothing else is inferred about context. No quote or heredoc state is tracked, because a state
 *    machine that is wrong blocks valid commands — the failure this revision exists to undo.
 *
 * Measured: 0 hits across 2289 fenced code blocks in this repo's skills, agents, and docs.
 *
 * @param {string} command
 * @returns {{reason: string, detail: string, fix: string}|null} null when nothing is detected
 */
const HERE_STRING_OPENER = /(?:^|[\s(,=])@(['"])$/;

function findPowerShellConstruct(command) {
    if (command.includes('<<')) return null; // heredoc present — bias to allow (see narrowing 2)

    const lines = command.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].trimEnd().match(HERE_STRING_OPENER);
        if (!match) continue;

        const quote = match[1];
        const opener = `@${quote}`;
        const closer = `${quote}@`;
        for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].trim() !== closer) continue;
            return {
                reason: `PowerShell here-string (${opener} … ${closer})`,
                detail:
                    `Line ${i + 1} opens a PowerShell here-string and line ${j + 1} closes it. ` +
                    'Git Bash has no such syntax — it tries to run `@` as a command and reports ' +
                    '"@: command not found" (exit 127), which does not name the real problem.',
                fix: "Use a POSIX heredoc instead:\n```\ncat <<'EOF'\n…your text…\nEOF\n```"
            };
        }
    }
    return null;
}

/**
 * @param {string} command
 * @param {{reason: string, detail: string, fix: string}} problem
 * @returns {string}
 */
function formatBlock(command, problem) {
    const preview = command.length > 300 ? `${command.slice(0, 300)}\n… (truncated)` : command;
    return [
        '## ⛔ PowerShell syntax in a Git Bash command',
        '',
        `**Problem:** ${problem.reason}`,
        '',
        problem.detail,
        '',
        '### Fix',
        problem.fix,
        '',
        '### Command as received',
        '```',
        preview,
        '```',
        '',
        '_Guard: `.claude/hooks/bash-shell-guard.cjs`. Claude Code runs commands through Git Bash',
        '(MINGW64), never PowerShell or CMD._'
    ].join('\n');
}

/**
 * Records an internal failure without blocking. stderr from an exit-0 hook is not reliably
 * surfaced, so the log file is what makes a silently-broken guard discoverable after the fact.
 *
 * @param {Error} error
 */
function recordGuardFailure(error) {
    const message = `bash-shell-guard error (command allowed): ${error && error.message}`;
    console.error(message);
    try {
        const logPath = path.join(os.tmpdir(), 'claude-bash-shell-guard-errors.log');
        fs.appendFileSync(logPath, `${new Date().toISOString()} ${message}\n${error && error.stack}\n\n`);
    } catch {
        // Logging must never be the reason a command is blocked.
    }
}

function main() {
    try {
        const input = JSON.parse(fs.readFileSync(process.stdin.fd, 'utf-8'));
        if (input.tool_name !== 'Bash') process.exit(0);

        const command = input.tool_input?.command || '';
        if (!command.trim()) process.exit(0);

        const problem = findPowerShellConstruct(command);
        if (problem) {
            console.error(formatBlock(command, problem));
            process.exit(2);
        }

        process.exit(0);
    } catch (error) {
        // Fail open — a guard that blocks legitimate work is worse than the mistake it prevents.
        recordGuardFailure(error);
        process.exit(0);
    }
}

if (require.main === module) {
    main();
}

module.exports = { findPowerShellConstruct, formatBlock };
