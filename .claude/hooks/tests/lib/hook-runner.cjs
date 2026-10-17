/**
 * Hook runner utilities for spawning and testing Claude hooks
 * Provides async and sync methods for hook execution
 */

const { spawn, spawnSync, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// .claude/hooks/tests/lib -> repository root (owner of the generated `.codex/hooks.json` mirror).
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const HOOKS_DIR = path.resolve(__dirname, '..', '..');

// Default timeout for hook execution (10 seconds)
const DEFAULT_TIMEOUT = 10000;

/**
 * A test cwd is an explicit fixture boundary.  Do not walk above it looking for
 * a user-level `.claude` directory: that would make a copied-hook test mutate
 * the host repository instead of the fixture under test.
 */
function fixtureProjectRoot(cwd) {
  return path.resolve(cwd);
}

/**
 * Run a hook asynchronously with JSON input via stdin
 * @param {string} hookPath - Path to the hook script
 * @param {object} input - Input object to pass as JSON via stdin
 * @param {object} [options] - Execution options
 * @param {string} [options.cwd] - Working directory
 * @param {object} [options.env] - Additional environment variables
 * @param {number} [options.timeout] - Timeout in milliseconds
 * @returns {Promise<{code: number, stdout: string, stderr: string, timedOut: boolean}>}
 */
async function runHook(hookPath, input, options = {}) {
  const timeout = options.timeout || DEFAULT_TIMEOUT;

  return new Promise((resolve) => {
    // A suite may execute a copied hook with `cwd` set to an isolated fixture
    // while the runner process itself has a framework-level CLAUDE_PROJECT_DIR.
    // The explicit fixture boundary wins; never inherit or discover a user-level
    // `.claude` ancestor, otherwise cleanup tests mutate the host repository.
    const cwd = options.cwd || process.cwd();
    const fixtureRoot = fixtureProjectRoot(cwd);
    const env = {
      ...process.env,
      ...(options.cwd ? { CLAUDE_PROJECT_DIR: fixtureRoot } : {}),
      ...options.env
    };
    const proc = spawn('node', [hookPath], {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        timedOut = true;
        proc.kill('SIGKILL');
      }
    }, timeout);

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({
          code: code ?? (timedOut ? -1 : 1),
          stdout,
          stderr,
          timedOut
        });
      }
    });

    proc.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({
          code: -1,
          stdout,
          stderr: stderr + '\n' + err.message,
          timedOut: false
        });
      }
    });

    // Write input to stdin and close
    if (input !== undefined) {
      proc.stdin.write(JSON.stringify(input));
    }
    proc.stdin.end();
  });
}

/**
 * Run a hook synchronously with JSON input
 * @param {string} hookPath - Path to the hook script
 * @param {object} input - Input object to pass as JSON via stdin
 * @param {object} [options] - Execution options
 * @param {string} [options.cwd] - Working directory
 * @param {object} [options.env] - Additional environment variables
 * @param {number} [options.timeout] - Timeout in milliseconds
 * @returns {{code: number, stdout: string, stderr: string}}
 */
function runHookSync(hookPath, input, options = {}) {
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const inputJson = input !== undefined ? JSON.stringify(input) : '';

  try {
    const stdout = execSync(`node "${hookPath}"`, {
      cwd: options.cwd || process.cwd(),
      env: {
        ...process.env,
        ...(options.cwd ? { CLAUDE_PROJECT_DIR: fixtureProjectRoot(options.cwd) } : {}),
        ...options.env
      },
      input: inputJson,
      timeout,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    return {
      code: 0,
      stdout: stdout || '',
      stderr: ''
    };
  } catch (error) {
    return {
      code: error.status ?? 1,
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || error.message
    };
  }
}

/**
 * Run a sequence of hooks with the same input
 * Useful for testing hook chains
 * @param {string[]} hookPaths - Array of hook paths
 * @param {object} input - Input object
 * @param {object} [options] - Execution options
 * @returns {Promise<Array<{hookPath: string, result: object}>>}
 */
async function runHookSequence(hookPaths, input, options = {}) {
  const results = [];
  for (const hookPath of hookPaths) {
    const result = await runHook(hookPath, input, options);
    results.push({ hookPath, result });
    // Stop if hook blocks (exit code 2)
    if (result.code === 2) break;
  }
  return results;
}

/**
 * Run multiple hooks in parallel
 * @param {Array<{hookPath: string, input: object}>} hooks - Array of hook configs
 * @param {object} [options] - Execution options
 * @returns {Promise<Array<{hookPath: string, result: object}>>}
 */
async function runHooksParallel(hooks, options = {}) {
  const promises = hooks.map(({ hookPath, input }) =>
    runHook(hookPath, input, options).then(result => ({ hookPath, result }))
  );
  return Promise.all(promises);
}

/**
 * Get the absolute path to a hook in the hooks directory
 * @param {string} hookName - Hook filename (e.g., 'doc-sync-gate.cjs')
 * @returns {string} Absolute path to the hook
 */
function getHookPath(hookName) {
  return path.resolve(__dirname, '..', '..', hookName);
}

/**
 * Create a mock hook input for PreToolUse event
 * @param {string} toolName - Tool name (e.g., 'Read', 'Bash', 'Edit')
 * @param {object} toolInput - Tool input object
 * @returns {object} Complete hook input object
 */
function createPreToolUseInput(toolName, toolInput) {
  return {
    event: 'PreToolUse',
    tool_name: toolName,
    tool_input: toolInput
  };
}

/**
 * Create a mock hook input for PostToolUse event
 * @param {string} toolName - Tool name
 * @param {object} toolInput - Tool input object
 * @param {object} toolResult - Tool result object
 * @returns {object} Complete hook input object
 */
function createPostToolUseInput(toolName, toolInput, toolResult = {}) {
  return {
    event: 'PostToolUse',
    tool_name: toolName,
    tool_input: toolInput,
    tool_result: toolResult
  };
}

/**
 * Create a mock hook input for UserPromptSubmit event
 * @param {string} prompt - User prompt text
 * @returns {object} Complete hook input object
 */
function createUserPromptInput(prompt) {
  return {
    event: 'UserPromptSubmit',
    prompt
  };
}

/**
 * Create a mock hook input for SessionStart event
 * @param {string} source - Session source ('startup', 'resume', 'clear', 'compact')
 * @param {string} [sessionId] - Optional session ID
 * @returns {object} Complete hook input object
 */
function createSessionStartInput(source, sessionId = null) {
  return {
    event: 'SessionStart',
    source,
    ...(sessionId && { session_id: sessionId })
  };
}

/**
 * Create a mock hook input for SubagentStart event
 * @param {string} agentType - Subagent type (maps to agent_type field)
 * @param {string} [prompt] - Optional subagent prompt
 * @param {string|null} [sessionId] - Optional parent session ID
 * @param {string|null} [agentId] - Optional agent ID
 * @returns {object} Complete hook input object
 */
function createSubagentStartInput(agentType, prompt = '', sessionId = null, agentId = null) {
  return {
    event: 'SubagentStart',
    agent_type: agentType,
    prompt,
    ...(sessionId && { session_id: sessionId }),
    ...(agentId && { agent_id: agentId })
  };
}

/**
 * Create a mock hook input for PreCompact event
 * @param {object} [context] - Optional context data
 * @returns {object} Complete hook input object
 */
function createPreCompactInput(context = {}) {
  return {
    event: 'PreCompact',
    ...context
  };
}

/**
 * Create a mock hook input for SessionEnd event
 * @param {string} source - End source ('clear', 'exit', etc.)
 * @returns {object} Complete hook input object
 */
function createSessionEndInput(source) {
  return {
    event: 'SessionEnd',
    source
  };
}

/**
 * The exact command string the generated Codex mirror (`.codex/hooks.json`) runs for `hookFile`:
 * `node -e "…require(path.join(root, hookPath))" -- <hookPath>`, where `require.main` is undefined.
 * @param {string} hookFile - Hook filename under `.claude/hooks/` (e.g. 'review-commit-gate.cjs')
 * @returns {string|null} The first mirrored command wiring that hook, or null when none does
 */
function codexLauncherCommand(hookFile) {
  const codexHooks = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.codex', 'hooks.json'), 'utf8'));
  const commands = Object.values(codexHooks.hooks || {})
    .flat()
    .flatMap(group => (group.hooks || []).map(h => h.command || ''));
  return commands.find(c => c.includes(`.claude/hooks/${hookFile}`)) || null;
}

/**
 * Run a hook through the Codex launcher shape. The launcher resolves the project root as the
 * nearest `.claude` ancestor of `cwd`, chdirs there and requires `<root>/.claude/hooks/<hookFile>`,
 * so `cwd` selects WHICH hook tree runs (the repository by default, or a fixture project).
 * @param {string} hookFile - Hook filename under `.claude/hooks/`
 * @param {string} stdin - Raw stdin payload (usually JSON)
 * @param {object} [options] - { cwd, env, timeout }
 * @returns {{code: number|null, stdout: string, stderr: string, command: string}}
 */
function runCodexLauncher(hookFile, stdin, options = {}) {
  const command = codexLauncherCommand(hookFile);
  if (!command) throw new Error(`.codex/hooks.json must wire ${hookFile}`);
  if (!command.includes('node -e')) throw new Error(`Codex command for ${hookFile} is not the node -e launcher: ${command}`);
  const result = spawnSync(command, {
    cwd: options.cwd || REPO_ROOT,
    env: childEnv(options.env),
    input: stdin,
    encoding: 'utf8',
    shell: true,
    windowsHide: true,
    timeout: options.timeout || 30000
  });
  return { code: result.status, stdout: result.stdout || '', stderr: result.stderr || '', command };
}

/**
 * A child-process environment: `base` overlaid by `overrides`, where an `undefined` override DELETES the key
 * instead of passing it on. Windows env names are case-insensitive, so a deletion there removes every casing.
 * Tests use it to keep a developer's own switches (e.g. `CK_COMMIT_SKILL_ROUTE=0`) out of a child hook.
 * @param {object} [overrides] - Keys to set, or to delete when the value is `undefined`
 * @param {object} [base] - Environment to start from (defaults to `process.env`)
 * @returns {object} A fresh environment object
 */
function childEnv(overrides = {}, base = process.env) {
  const env = { ...base };
  const sameName = (a, b) => (process.platform === 'win32' ? a.toUpperCase() === b.toUpperCase() : a === b);
  for (const [key, value] of Object.entries(overrides || {})) {
    for (const existing of Object.keys(env)) {
      if (sameName(existing, key)) delete env[existing];
    }
    if (value !== undefined) env[key] = value;
  }
  return env;
}

/**
 * A temp project root holding a COPY of the hook tree (no suites, notifications or node_modules) at
 * `.claude/hooks`. The Codex launcher runs the tree under the nearest `.claude` ancestor of its cwd and sets
 * CLAUDE_PROJECT_DIR to it, so a launcher run from this root never reads the repository's own settings.
 * @param {string} prefix - Temp directory name fragment
 * @returns {string} The fixture root; remove it with `removeTempDir`
 */
function makeHookTreeProject(prefix) {
  const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), `codex-launcher-${prefix}-`)));
  const skip = new Set(['tests', 'notifications', 'node_modules']);
  fs.cpSync(HOOKS_DIR, path.join(root, '.claude', 'hooks'), {
    recursive: true,
    filter: source => !skip.has(path.basename(source)) || path.dirname(source) !== HOOKS_DIR
  });
  // Prompt routers share the runtime preference resolver with the script surfaces.
  fs.cpSync(path.join(REPO_ROOT, '.claude', 'scripts', 'lib'), path.join(root, '.claude', 'scripts', 'lib'), { recursive: true });
  return root;
}

/** Remove a directory created under the OS temp root; anything outside it is left untouched. */
function removeTempDir(dir) {
  if (!dir) return;
  let resolvedDir;
  try { resolvedDir = fs.realpathSync.native(dir); } catch { return; }
  const tempRoot = fs.realpathSync.native(os.tmpdir());
  const relative = path.relative(tempRoot, resolvedDir);
  if (relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) {
    fs.rmSync(resolvedDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

/**
 * Record `prompts` (oldest first) as the session's user prompts in the project's prompt ledger, the
 * store the prompt routers read at sub-agent start and after a compaction.
 */
function recordUserPrompts(projectDir, sessionId, prompts) {
  const store = require('../../lib/prompt-ledger-store.cjs');
  let ledger = null;
  for (const prompt of prompts) ledger = store.appendPrompt(ledger, prompt, { sessionId }).ledger;
  store.writeLedger(store.sessionDir(store.storeRoot({}, projectDir), sessionId), ledger);
}

module.exports = {
  runHook,
  runHookSync,
  runHookSequence,
  runHooksParallel,
  getHookPath,
  createPreToolUseInput,
  createPostToolUseInput,
  createUserPromptInput,
  createSessionStartInput,
  createSubagentStartInput,
  createPreCompactInput,
  createSessionEndInput,
  codexLauncherCommand,
  runCodexLauncher,
  childEnv,
  makeHookTreeProject,
  removeTempDir,
  recordUserPrompts,
  DEFAULT_TIMEOUT
};
