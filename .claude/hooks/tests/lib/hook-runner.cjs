/**
 * Hook runner utilities for spawning and testing Claude hooks
 * Provides async and sync methods for hook execution
 */

const { spawn, execSync } = require('child_process');
const path = require('path');

// Default timeout for hook execution (10 seconds)
const DEFAULT_TIMEOUT = 10000;

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
    const env = { ...process.env, ...options.env };
    const proc = spawn('node', [hookPath], {
      cwd: options.cwd || process.cwd(),
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
      env: { ...process.env, ...options.env },
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
 * @param {string} hookName - Hook filename (e.g., 'privacy-block.cjs')
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
 * @param {string} subagent - Subagent type
 * @param {string} [prompt] - Optional subagent prompt
 * @returns {object} Complete hook input object
 */
function createSubagentStartInput(subagent, prompt = '') {
  return {
    event: 'SubagentStart',
    subagent,
    prompt
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
  DEFAULT_TIMEOUT
};
