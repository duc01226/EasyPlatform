#!/usr/bin/env node
/**
 * test-path-boundary-block.js - Unit tests for path-boundary-block hook
 *
 * Tests project boundary enforcement for Claude Code file access.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const HOOK_PATH = path.join(__dirname, '..', 'path-boundary-block.cjs');
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const { generateTestFixtures } = require('../lib/test-fixture-generator.cjs');
const f = generateTestFixtures();

/**
 * Run the hook with given input
 * @param {object} hookData - Hook input data
 * @param {object} options - Options (cwd, env)
 * @returns {Promise<{code: number, stderr: string}>}
 */
async function runHook(hookData, options = {}) {
    return new Promise(resolve => {
        const env = {
            ...process.env,
            CLAUDE_PROJECT_DIR: options.projectDir || PROJECT_ROOT,
            ...options.env
        };

        const proc = spawn('node', [HOOK_PATH], {
            cwd: options.cwd || PROJECT_ROOT,
            env
        });

        let stderr = '';
        proc.stderr.on('data', data => {
            stderr += data.toString();
        });

        proc.on('close', code => {
            resolve({ code, stderr });
        });

        proc.stdin.write(JSON.stringify(hookData));
        proc.stdin.end();
    });
}

// ============================================================================
// Test Cases
// ============================================================================

// Tests for paths INSIDE project (should ALLOW)
const allowTests = [
    {
        name: 'project file (absolute) - should allow',
        input: { tool_input: { file_path: path.join(PROJECT_ROOT, 'CLAUDE.md') } },
        expectBlock: false
    },
    {
        name: 'project file (relative) - should allow',
        input: { tool_input: { file_path: './src/index.ts' } },
        expectBlock: false
    },
    {
        name: 'project subdir (relative) - should allow',
        input: { tool_input: { file_path: f.backendServiceCs } },
        expectBlock: false
    },
    {
        name: 'project root itself - should allow',
        input: { tool_input: { file_path: PROJECT_ROOT } },
        expectBlock: false
    },
    {
        name: 'new file in project - should allow',
        input: { tool_input: { file_path: path.join(PROJECT_ROOT, 'new-file.txt') } },
        expectBlock: false
    },
    {
        name: 'nested path in project - should allow',
        input: { tool_input: { file_path: '.claude/hooks/test.js' } },
        expectBlock: false
    }
];

// Tests for temp directories (should ALLOW)
const tempDirTests = [
    {
        name: 'system TEMP directory - should allow',
        input: { tool_input: { file_path: path.join(os.tmpdir(), 'test.log') } },
        expectBlock: false
    },
    // /tmp only exists on Unix systems
    ...(process.platform !== 'win32'
        ? [
              {
                  name: '/tmp directory - should allow',
                  input: { tool_input: { file_path: '/tmp/build.log' } },
                  expectBlock: false
              }
          ]
        : [])
];

// Tests for paths OUTSIDE project (should BLOCK)
const blockTests = [
    {
        name: 'absolute path outside project - should block',
        input: { tool_input: { file_path: 'D:/OtherProject/file.txt' } },
        expectBlock: true,
        expectContains: 'outside project boundary'
    },
    {
        name: 'windows system path - should block',
        input: { tool_input: { file_path: 'C:/Windows/System32/config/SAM' } },
        expectBlock: true
    },
    {
        name: 'linux root path - should block',
        input: { tool_input: { file_path: '/etc/passwd' } },
        expectBlock: true
    },
    {
        name: 'home directory ssh keys - should block',
        input: { tool_input: { file_path: '~/.ssh/id_rsa' } },
        expectBlock: true
    },
    {
        name: 'home directory aws - should block',
        input: { tool_input: { file_path: '~/.aws/credentials' } },
        expectBlock: true
    },
    {
        name: 'UNC path - should block',
        input: { tool_input: { file_path: '\\\\server\\share\\file.txt' } },
        expectBlock: true
    }
];

// Tests for path traversal attacks (should BLOCK)
const traversalTests = [
    {
        name: 'path traversal (../) - should block',
        input: { tool_input: { file_path: '../../../etc/passwd' } },
        expectBlock: true
    },
    {
        name: 'path traversal mixed - should block',
        input: { tool_input: { file_path: 'src/../../OtherProject/file.txt' } },
        expectBlock: true
    },
    {
        name: 'URL-encoded traversal (%2e%2e) - should block',
        input: { tool_input: { file_path: '%2e%2e/%2e%2e/secret.txt' } },
        expectBlock: true
    },
    // Double-encoded stays encoded after single decode (standard behavior)
    // %252e -> %2e (still encoded, not a traversal attack)
    {
        name: 'double-encoded traversal - should allow (only single decode)',
        input: { tool_input: { file_path: '%252e%252e/secret.txt' } },
        expectBlock: false
    }
];

// Tests for Bash commands with file paths
const bashTests = [
    {
        name: 'bash cat with outside path - should block',
        input: { tool_input: { command: 'cat /etc/passwd' } },
        expectBlock: true
    },
    {
        name: 'bash with absolute outside path - should block',
        input: { tool_input: { command: 'head D:/OtherProject/secret.txt' } },
        expectBlock: true
    },
    {
        name: 'bash with project path - should allow',
        input: { tool_input: { command: `cat ${path.join(PROJECT_ROOT, 'CLAUDE.md')}` } },
        expectBlock: false
    },
    {
        name: 'bash redirect outside project - should block',
        input: { tool_input: { command: 'echo "data" > /tmp/../../etc/test' } },
        expectBlock: true
    }
];

// =====================================================================
// Linux-regression tests — Linux paths must NEVER be misclassified as
// Windows command flags. Run with CLAUDE_TEST_PLATFORM=linux so the
// outer platform gate exercises the non-Windows branch on any host.
// Regression: prior win-flag regex unconditionally matched /etc, /var,
// /usr, /home, /opt, /tmp, /bin, /sbin, /lib, /srv, /mnt, /run, /boot
// as 1-segment "flags" → boundary bypass on Linux/macOS.
// =====================================================================
const linuxRegressionTests = [
    {
        name: 'tar with /etc target - should block (Linux)',
        input: { tool_input: { command: 'tar -czf out.tar.gz /etc' } },
        expectBlock: true
    },
    {
        name: 'rm -rf /etc - should block (Linux)',
        input: { tool_input: { command: 'rm -rf /etc' } },
        expectBlock: true
    },
    {
        name: 'cp -r /home target - should block (Linux)',
        input: { tool_input: { command: 'cp -r /home target/' } },
        expectBlock: true
    },
    {
        name: 'cat /var/log/syslog - should block (Linux)',
        input: { tool_input: { command: 'cat /var/log/syslog' } },
        expectBlock: true
    },
    {
        name: 'ls /opt - should block (Linux)',
        input: { tool_input: { command: 'ls /opt' } },
        expectBlock: true
    },
    {
        name: 'ls /usr - should block (Linux)',
        input: { tool_input: { command: 'ls /usr' } },
        expectBlock: true
    },
    // Note: /tmp and /var/tmp are intentionally allowlisted in
    // ck-path-utils.cjs:175-176 for Claude sub-agent task outputs.
    // Listing them here would falsely flag the regex as broken.
    {
        name: 'ls /bin /sbin /lib - should block (Linux)',
        input: { tool_input: { command: 'ls /bin /sbin /lib' } },
        expectBlock: true
    },
    {
        name: 'ls /srv /mnt /run /boot - should block (Linux)',
        input: { tool_input: { command: 'ls /srv /mnt /run /boot' } },
        expectBlock: true
    }
];

// =====================================================================
// Windows-flag-allow tests — legitimate Windows tool flags must NOT be
// misclassified as paths. Run with CLAUDE_TEST_PLATFORM=win32 so the
// outer platform gate exercises the Windows branch on any host.
// Regression source: real user report where
//   `... | findstr /I "error CS" ...`
// triggered "BLOCKED: /I outside project boundary".
// =====================================================================
const winFlagAllowTests = [
    {
        name: 'findstr /I real-world dotnet build pipe - should allow',
        input: {
            tool_input: {
                command: 'dotnet build src/App.csproj --nologo -v:m 2>&1 | findstr /I "error CS"'
            }
        },
        expectBlock: false
    },
    {
        name: 'findstr /I /N flags - should allow',
        input: { tool_input: { command: 'findstr /I /N "TODO" src/file.cs' } },
        expectBlock: false
    },
    {
        name: 'findstr /N /V flags - should allow',
        input: { tool_input: { command: 'findstr /N /V "skip" log.txt' } },
        expectBlock: false
    },
    {
        name: 'cmd /C dir - should allow',
        input: { tool_input: { command: 'cmd /C dir' } },
        expectBlock: false
    },
    {
        name: 'xcopy /E /I src dst - should allow',
        input: { tool_input: { command: 'xcopy /E /I src dst' } },
        expectBlock: false
    },
    {
        name: 'robocopy /MIR - should allow',
        input: { tool_input: { command: 'robocopy /MIR src dst' } },
        expectBlock: false
    }
];

// =====================================================================
// findstr pattern strip — quoted search patterns containing /etc/foo
// must be stripped (line 239 tools regex), only file argument remains.
// Cross-platform.
// =====================================================================
const findstrPatternStripTests = [
    {
        name: 'findstr quoted pattern with /etc/foo - should allow (pattern stripped, file is project-local)',
        input: { tool_input: { command: 'findstr "/etc/foo" src/file.txt' } },
        expectBlock: false
    }
];

// =====================================================================
// Fuzz: /Word patterns NOT in any known Windows flag list. When cmd has
// NO Windows-tool token, these MUST be treated as paths and BLOCKED
// regardless of platform. Documents the platform-gate + tool-token gate
// as the contract: only legitimate Windows tools get the flag-skip.
// =====================================================================
const fuzzNonFlagWordPathTests = [
    {
        name: 'cat /optt (typo of /opt, no Win tool) - should block',
        input: { tool_input: { command: 'cat /optt' } },
        expectBlock: true
    },
    {
        name: 'ls /varr (typo, no Win tool) - should block',
        input: { tool_input: { command: 'ls /varr' } },
        expectBlock: true
    },
    {
        name: 'cat /foobar (arbitrary, no Win tool) - should block',
        input: { tool_input: { command: 'cat /foobar' } },
        expectBlock: true
    }
];

// Tests for inline code false positives (should ALLOW)
const inlineCodeTests = [
    {
        name: 'python -c with path-like string - should allow',
        input: { tool_input: { command: 'python -c "from pathlib import Path; p = Path(\'/v2/users\')"' } },
        expectBlock: false
    },
    {
        name: 'python3 -c with API route string - should allow',
        input: { tool_input: { command: 'python3 -c "url = \'/api/v2/users\'; print(url)"' } },
        expectBlock: false
    },
    {
        name: 'node -e with path-like string - should allow',
        input: { tool_input: { command: 'node -e "const p = \'/v2/users\'; console.log(p)"' } },
        expectBlock: false
    },
    {
        name: 'python -c with single-quoted code - should allow',
        input: { tool_input: { command: 'python -c \'from pathlib import Path; p = Path("/v2/users")\'' } },
        expectBlock: false
    },
    {
        name: 'python -c multiline with path-like strings - should allow',
        input: { tool_input: { command: 'python -c "\\nfrom pathlib import Path\\np = Path(\'/v2/users\')\\nprint(p)\\n"' } },
        expectBlock: false
    },
    {
        name: 'python -c code then real outside path - should block',
        input: { tool_input: { command: 'python -c "print(1)" && cat /etc/passwd' } },
        expectBlock: true
    },
    {
        name: 'ruby -e with path-like string - should allow',
        input: { tool_input: { command: 'ruby -e "puts \'/api/health\'"' } },
        expectBlock: false
    },
    {
        name: 'perl -e with path-like string - should allow',
        input: { tool_input: { command: 'perl -e "print \'/v1/status\\n\'"' } },
        expectBlock: false
    }
];

// Tests for sed/awk pattern false positives (should ALLOW)
const sedAwkTests = [
    {
        name: 'sed substitution with path-like pattern - should allow',
        input: {
            tool_input: {
                command:
                    'find "MyProject-DevStarts/StartDocker/" -name "*.cmd" -exec sed -i \'s/docker compose --ansi always \\(.*\\) build /docker compose \\1/\' {} \\;'
            }
        },
        expectBlock: false
    },
    {
        name: 'sed -i with slash-heavy substitution - should allow',
        input: { tool_input: { command: "sed -i 's/\\/usr\\/local\\/bin/\\/opt\\/bin/g' config.txt" } },
        expectBlock: false
    },
    {
        name: 'sed with double-quoted pattern - should allow',
        input: { tool_input: { command: 'sed -i "s/docker compose/podman compose/g" file.txt' } },
        expectBlock: false
    },
    {
        name: 'awk with path-like pattern - should allow',
        input: { tool_input: { command: "awk '/\\/api\\/v2/ {print $0}' access.log" } },
        expectBlock: false
    },
    {
        name: 'sed with -e flag and substitution - should allow',
        input: { tool_input: { command: "sed -e 's/docker/podman/g' file.txt" } },
        expectBlock: false
    },
    {
        name: 'sed piped from echo - should allow',
        input: { tool_input: { command: 'echo "test" | sed \'s/docker compose/new/\'' } },
        expectBlock: false
    },
    {
        name: 'sed then real outside path - should block',
        input: { tool_input: { command: "sed 's/old/new/' /etc/passwd" } },
        expectBlock: true
    }
];

// Tests for grep/ripgrep pattern false positives (should ALLOW)
const grepTests = [
    {
        name: 'grep quoted pattern with SYNC marker - should allow',
        input: { tool_input: { command: 'grep -c "<!-- /SYNC:" "$f" 2>/dev/null' } },
        expectBlock: false
    },
    {
        name: 'grep single-quoted SYNC pattern - should allow',
        input: { tool_input: { command: 'grep -c \'<!-- /SYNC:\' "$f"' } },
        expectBlock: false
    },
    {
        name: 'rg with API route pattern - should allow',
        input: { tool_input: { command: 'rg -l "/api/v2/users" src/' } },
        expectBlock: false
    },
    {
        name: 'rg --type with space-separated value - should allow',
        input: { tool_input: { command: 'rg --type js "/api/v2/users" src/' } },
        expectBlock: false
    },
    {
        name: 'grep -A with numeric value then path pattern - should allow',
        input: { tool_input: { command: 'grep -A 3 "/pattern/here" file.txt' } },
        expectBlock: false
    },
    {
        name: 'grep then real outside path after semicolon - should block',
        input: { tool_input: { command: 'grep "pattern" "$f"; cat /etc/passwd' } },
        expectBlock: true
    },
    {
        name: 'grep unquoted real path as target - should block',
        input: { tool_input: { command: 'grep something /etc/passwd' } },
        expectBlock: true
    }
];

// Tests for MCP filesystem tools
const mcpTests = [
    {
        name: 'MCP read file outside project - should block',
        input: {
            tool_name: 'mcp__filesystem__read_text_file',
            tool_input: { path: 'D:/OtherProject/config.json' }
        },
        expectBlock: true
    },
    {
        name: 'MCP read multiple with one outside - should block',
        input: {
            tool_name: 'mcp__filesystem__read_multiple_files',
            tool_input: { paths: [path.join(PROJECT_ROOT, 'file1.txt'), 'D:/Outside/file2.txt'] }
        },
        expectBlock: true
    },
    {
        name: 'MCP read file inside project - should allow',
        input: {
            tool_name: 'mcp__filesystem__read_text_file',
            tool_input: { path: path.join(PROJECT_ROOT, 'CLAUDE.md') }
        },
        expectBlock: false
    }
];

// Tests for NotebookEdit tool
const notebookTests = [
    {
        name: 'notebook outside project - should block',
        input: { tool_input: { notebook_path: 'D:/OtherProject/analysis.ipynb' } },
        expectBlock: true
    },
    {
        name: 'notebook inside project - should allow',
        input: { tool_input: { notebook_path: path.join(PROJECT_ROOT, 'notebooks/test.ipynb') } },
        expectBlock: false
    }
];

// Tests for config toggle
const configTests = [
    {
        name: 'pathBoundary: false - outside path should allow',
        input: { tool_input: { file_path: 'D:/OtherProject/file.txt' } },
        config: { pathBoundary: false },
        expectBlock: false
    },
    {
        name: 'pathBoundary: true - outside path should block',
        input: { tool_input: { file_path: 'D:/OtherProject/file.txt' } },
        config: { pathBoundary: true },
        expectBlock: true
    },
    {
        name: 'pathBoundaryAllowedDirs - custom dir should allow',
        input: { tool_input: { file_path: 'D:/AllowedDir/file.txt' } },
        config: { pathBoundaryAllowedDirs: ['D:/AllowedDir'] },
        expectBlock: false
    }
];

// Edge cases
const edgeCaseTests = [
    {
        name: 'empty path - should allow',
        input: { tool_input: { file_path: '' } },
        expectBlock: false
    },
    {
        name: 'null input - should allow',
        input: { tool_input: null },
        expectBlock: false
    },
    {
        name: 'missing tool_input - should allow',
        input: {},
        expectBlock: false
    },
    {
        name: 'invalid JSON - should allow (fail-open)',
        rawInput: 'not json',
        expectBlock: false
    }
];

// ============================================================================
// Test Runner
// ============================================================================

/**
 * Run hook with temp config file
 */
async function runWithConfig(input, config) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'boundary-test-'));
    const tmpClaudeDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(tmpClaudeDir, { recursive: true });
    fs.writeFileSync(path.join(tmpClaudeDir, '.ck.json'), JSON.stringify(config));

    const result = await runHook(input, { cwd: tmpDir, projectDir: PROJECT_ROOT });
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return result;
}

/**
 * Run hook with raw (non-JSON) input
 */
async function runWithRawInput(rawInput) {
    return new Promise(resolve => {
        const proc = spawn('node', [HOOK_PATH], {
            env: { ...process.env, CLAUDE_PROJECT_DIR: PROJECT_ROOT }
        });
        let stderr = '';
        proc.stderr.on('data', d => (stderr += d));
        proc.on('close', code => resolve({ code, stderr }));
        proc.stdin.write(rawInput);
        proc.stdin.end();
    });
}

async function runTestGroup(groupName, tests, options = {}) {
    console.log(`\n\x1b[1m--- ${groupName} ---\x1b[0m`);

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        const result = test.config
            ? await runWithConfig(test.input, test.config)
            : test.rawInput
              ? await runWithRawInput(test.rawInput)
              : await runHook(test.input, options);

        const blocked = result.code === 2;
        const success = blocked === test.expectBlock;
        const containsOk = !test.expectContains || result.stderr.includes(test.expectContains);

        if (success && containsOk) {
            console.log(`\x1b[32m✓\x1b[0m ${test.name}`);
            passed++;
        } else {
            console.log(`\x1b[31m✗\x1b[0m ${test.name}: expected ${test.expectBlock ? 'BLOCK' : 'ALLOW'}, got ${blocked ? 'BLOCK' : 'ALLOW'}`);
            if (result.stderr && !success) {
                console.log(`  stderr: ${result.stderr.slice(0, 200)}`);
            }
            failed++;
        }
    }

    return { passed, failed };
}

async function main() {
    console.log('Testing path-boundary-block hook...');
    console.log(`Project root: ${PROJECT_ROOT}\n`);

    let totalPassed = 0;
    let totalFailed = 0;

    // Run all test groups
    // Tuple format: [name, tests] OR [name, tests, options] where options.env is forwarded to runHook.
    // CLAUDE_TEST_PLATFORM lets platform-conditional groups run on either host (see path-boundary-block.cjs:isWin).
    const groups = [
        ['Allow Tests (inside project)', allowTests],
        ['Temp Directory Tests', tempDirTests],
        ['Block Tests (outside project)', blockTests],
        ['Path Traversal Tests', traversalTests],
        ['Bash Command Tests', bashTests],
        ['Inline Code Tests', inlineCodeTests],
        ['Sed/Awk Pattern Tests', sedAwkTests],
        ['Grep Pattern Tests', grepTests],
        ['MCP Filesystem Tests', mcpTests],
        ['NotebookEdit Tests', notebookTests],
        ['Config Toggle Tests', configTests],
        ['Edge Cases', edgeCaseTests],
        ['Linux Regression (boundary cannot bypass on Linux)', linuxRegressionTests, { env: { CLAUDE_TEST_PLATFORM: 'linux' } }],
        ['Windows Flag Allow (findstr /I, cmd /C, etc.)', winFlagAllowTests, { env: { CLAUDE_TEST_PLATFORM: 'win32' } }],
        ['findstr Pattern Strip', findstrPatternStripTests, { env: { CLAUDE_TEST_PLATFORM: 'win32' } }],
        ['Fuzz: /Word without Win-tool token must block', fuzzNonFlagWordPathTests, { env: { CLAUDE_TEST_PLATFORM: 'win32' } }]
    ];

    for (const group of groups) {
        const [name, tests, options] = group;
        const { passed, failed } = await runTestGroup(name, tests, options || {});
        totalPassed += passed;
        totalFailed += failed;
    }

    // Summary
    console.log(`\n\x1b[1m========================================\x1b[0m`);
    console.log(`\x1b[1mResults:\x1b[0m ${totalPassed} passed, ${totalFailed} failed`);
    console.log(`\x1b[1m========================================\x1b[0m`);

    process.exit(totalFailed > 0 ? 1 : 0);
}

main();
