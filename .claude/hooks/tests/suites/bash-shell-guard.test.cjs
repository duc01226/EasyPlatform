/**
 * bash-shell-guard.cjs test suite
 *
 * The guard's governing intent is asymmetric and the tests are written to protect that asymmetry:
 *
 *   The construct it blocks ALREADY fails loudly in Git Bash (`@: command not found`, exit 127).
 *   So a missed detection costs a cryptic error message; a wrong block costs real work.
 *   => Every false-positive test below is protecting the more valuable invariant.
 *
 * TC-BSG-020 is the one that matters most: it sweeps every fenced code block in the repo's own
 * skills, agents, and docs and asserts none is flagged. An earlier revision of this hook shipped a
 * PowerShell backtick-continuation detector that passed hand-written unit tests but flagged 56 of
 * those 2289 blocks (JS/GLSL template literals). That test is what caught it.
 */

const fs = require('fs');
const path = require('path');
const { assertEqual, assertTrue, assertNullish, assertNotNullish, assertContains } = require('../lib/assertions.cjs');
const { runHookSync, getHookPath, createPreToolUseInput } = require('../lib/hook-runner.cjs');
const { findPowerShellConstruct, formatBlock } = require('../../bash-shell-guard.cjs');

const HOOK_PATH = getHookPath('bash-shell-guard.cjs');
const CLAUDE_DIR = path.resolve(__dirname, '..', '..', '..');

/** @param {string} command */
function blocks(command) {
  return findPowerShellConstruct(command) !== null;
}

/** Recursively collect .md files under a directory. Missing directories yield nothing. */
function collectMarkdown(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectMarkdown(full, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

/** Extract fenced code blocks as {startLine, body}. */
function fencedBlocks(text) {
  const found = [];
  const lines = text.split('\n');
  let open = null;
  let buffer = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```+\s*[\w-]*\s*$/.test(lines[i])) {
      if (open === null) {
        open = i + 1;
        buffer = [];
      } else {
        found.push({ startLine: open, body: buffer.join('\n') });
        open = null;
      }
      continue;
    }
    if (open !== null) buffer.push(lines[i]);
  }
  return found;
}

module.exports = {
  name: 'bash-shell-guard',
  tests: [
    // ---------------------------------------------------------------- detection (true positives)
    {
      name: "TC-BSG-001: blocks a PowerShell single-quoted here-string (@' … '@)",
      fn() {
        const problem = findPowerShellConstruct("$text = @'\nhello\n'@\nWrite-Host $text");
        assertNotNullish(problem, 'Expected @\' … \'@ to be detected');
        assertContains(problem.reason, 'here-string');
        assertContains(problem.fix, 'cat <<');
      }
    },
    {
      name: 'TC-BSG-002: blocks a PowerShell double-quoted here-string (@" … "@)',
      fn() {
        assertTrue(blocks('$text = @"\nhello $name\n"@'), 'Expected @" … "@ to be detected');
      }
    },
    {
      name: 'TC-BSG-003: anchors are recognised when indented (trimmed comparison)',
      fn() {
        assertTrue(blocks("if ($x) {\n    @'\n    body\n    '@\n}"), 'Indented anchors should still match');
      }
    },
    {
      name: 'TC-BSG-004: reports the 1-indexed line numbers of both anchors',
      fn() {
        const problem = findPowerShellConstruct("echo one\n@'\nbody\n'@");
        assertNotNullish(problem);
        assertContains(problem.detail, 'Line 2', 'opener line');
        assertContains(problem.detail, 'line 4', 'closer line');
      }
    },

    // -------------------------------------------------- non-detection (false-positive protection)
    {
      name: 'TC-BSG-005: allows an opener with no matching closer — both anchors are required',
      fn() {
        assertNullish(findPowerShellConstruct("@'\nbody with no terminator"));
      }
    },
    {
      name: 'TC-BSG-006: allows a closer with no preceding opener',
      fn() {
        assertNullish(findPowerShellConstruct("echo done\n'@"));
      }
    },
    {
      name: 'TC-BSG-007: allows a C# verbatim string — content precedes the @", so it is not an anchor',
      fn() {
        assertNullish(findPowerShellConstruct('printf %s "var p = @\\"C:\\\\tmp\\\\";"'));
      }
    },
    {
      name: 'TC-BSG-008: allows a here-string inside a heredoc — writing a .ps1 from bash is legitimate',
      fn() {
        const command = "cat > s.ps1 <<'EOF'\n$t = @'\nbody\n'@\nEOF";
        assertNullish(findPowerShellConstruct(command), 'Any command containing << must be skipped');
      }
    },
    {
      name: 'TC-BSG-009: allows a `<<<` here-string (regression: blocked by the retired lexer)',
      fn() {
        assertNullish(findPowerShellConstruct('cat <<<hello'));
      }
    },
    {
      name: 'TC-BSG-010: allows a `<<-` tab-stripped heredoc (regression: blocked by the retired lexer)',
      fn() {
        assertNullish(findPowerShellConstruct('cat <<-EOF\n\tindented\n\tEOF'));
      }
    },
    {
      name: 'TC-BSG-011: allows backticks at end of line (regression: the retired continuation detector)',
      fn() {
        assertNullish(findPowerShellConstruct('git commit -m "fix `parseArgs`"'));
        assertNullish(
          findPowerShellConstruct('node -p "`\nconst x = 1\n`"'),
          'A template literal opening at EOL must not be treated as a PowerShell continuation'
        );
      }
    },
    {
      name: 'TC-BSG-012: allows unterminated quotes — bash reports these precisely (exit 2), the guard must not duplicate it',
      fn() {
        assertNullish(findPowerShellConstruct('echo "$(date'));
        assertNullish(findPowerShellConstruct("echo 'unterminated"));
        assertNullish(findPowerShellConstruct('ls &&'));
      }
    },
    {
      name: 'TC-BSG-013: allows nested quoting in `node -e` (regression: ~18 such commands live in .claude/skills)',
      fn() {
        assertNullish(findPowerShellConstruct('node -e "console.log(JSON.parse(process.argv[1]).name)" \'{"name":"x"}\''));
      }
    },
    {
      name: 'TC-BSG-014: allows an unterminated heredoc — bash runs it correctly with only a warning',
      fn() {
        assertNullish(findPowerShellConstruct('cat <<EOF\nline one'));
      }
    },

    // ------------------------------------------------------------------------------ message shape
    {
      name: 'TC-BSG-015: the block message names the problem, the fix, and the offending command',
      fn() {
        const command = "$t = @'\nbody\n'@";
        const message = formatBlock(command, findPowerShellConstruct(command));
        assertContains(message, 'here-string', 'names the construct');
        assertContains(message, 'cat <<', 'gives the POSIX replacement');
        assertContains(message, 'body', 'echoes the command back');
        assertContains(message, 'Git Bash', 'explains which shell actually runs');
      }
    },
    {
      name: 'TC-BSG-016: long commands are truncated in the echo-back',
      fn() {
        const command = `@'\n${'x'.repeat(500)}\n'@`;
        const message = formatBlock(command, findPowerShellConstruct(command));
        assertContains(message, 'truncated');
        assertTrue(message.length < command.length + 900, 'Message should not embed the full command');
      }
    },

    // -------------------------------------------------------------------------- end-to-end (spawn)
    {
      name: 'TC-BSG-017: exits 0 for a non-Bash tool',
      fn() {
        const result = runHookSync(HOOK_PATH, createPreToolUseInput('Read', { file_path: '/tmp/x' }));
        assertEqual(result.code, 0, 'Non-Bash tools must pass through');
      }
    },
    {
      name: 'TC-BSG-018: exits 0 for an ordinary command',
      fn() {
        const result = runHookSync(HOOK_PATH, createPreToolUseInput('Bash', { command: 'git status --short' }));
        assertEqual(result.code, 0, 'Valid commands must not be blocked');
      }
    },
    {
      name: 'TC-BSG-019: exits 2 with actionable stderr for a PowerShell here-string',
      fn() {
        const result = runHookSync(HOOK_PATH, createPreToolUseInput('Bash', { command: "$t = @'\nbody\n'@" }));
        assertEqual(result.code, 2, 'PowerShell here-string must block');
        assertContains(result.stderr, 'here-string', 'stderr must name the construct');
        assertContains(result.stderr, 'cat <<', 'stderr must carry the fix');
      }
    },
    {
      name: 'TC-BSG-020: fails OPEN on malformed stdin, and records the failure to a log file',
      fn() {
        const logPath = path.join(require('os').tmpdir(), 'claude-bash-shell-guard-errors.log');
        const sizeBefore = fs.existsSync(logPath) ? fs.statSync(logPath).size : 0;

        const result = runHookSync(HOOK_PATH, undefined); // empty stdin -> JSON.parse throws
        assertEqual(result.code, 0, 'A broken guard must never block a command');

        assertTrue(fs.existsSync(logPath), 'Guard failure must be recorded to a log file');
        assertTrue(
          fs.statSync(logPath).size > sizeBefore,
          'Guard failure must APPEND to the log — an exit-0 stderr message alone is not reliably surfaced'
        );
      }
    },

    // ------------------------------------------------------------------------- corpus regression
    {
      name: 'TC-BSG-021: flags zero fenced code blocks across the repo skills, agents, and docs',
      fn() {
        const roots = ['skills', 'agents', 'docs'].map((d) => path.join(CLAUDE_DIR, d));
        const offenders = [];
        let blockCount = 0;

        for (const root of roots) {
          for (const file of collectMarkdown(root)) {
            const text = fs.readFileSync(file, 'utf-8');
            for (const block of fencedBlocks(text)) {
              blockCount++;
              const problem = findPowerShellConstruct(block.body);
              if (problem) {
                offenders.push(`${path.relative(CLAUDE_DIR, file)}:${block.startLine} — ${problem.reason}`);
              }
            }
          }
        }

        assertTrue(blockCount > 100, `Corpus sweep found only ${blockCount} blocks — the walk is broken, not the guard`);
        assertEqual(
          offenders.length,
          0,
          `Guard flagged documented command examples:\n  ${offenders.slice(0, 10).join('\n  ')}`
        );
      }
    }
  ]
};
