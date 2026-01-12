#!/usr/bin/env node
/**
 * Post-Edit Prettier Hook - Automatically formats files after Edit/Write operations
 *
 * Fires: PostToolUse for Edit and Write tools
 * Purpose: Run Prettier on edited/written files to maintain consistent formatting
 *
 * Features:
 *   - Supports common web development file types
 *   - Skips generated/dependency directories
 *   - Auto-discovers Prettier config by walking up directory tree
 *   - Non-blocking: failures are silently ignored (10s timeout)
 *   - Cross-platform: Windows and Unix compatible
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SUPPORTED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.jsonc',
  '.scss', '.css', '.less',
  '.html', '.htm',
  '.md', '.mdx',
  '.yaml', '.yml',
  '.graphql', '.gql'
]);

const SKIP_PATTERNS = [
  /node_modules/,
  /\.git\//,
  /dist\//,
  /build\//,
  /obj\//,
  /bin\//,
  /\.next\//,
  /\.nuxt\//,
  /coverage\//,
  /\.angular\//,
  /\.cache\//,
  /\.output\//,
  /\.vercel\//,
  // Skip Claude hooks to prevent "file unexpectedly modified" errors
  // These files are edited frequently and Prettier reformatting causes race conditions
  /\.claude\/hooks\//,
  /\.claude\/skills\//
];

const PRETTIER_CONFIG_FILES = [
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.yml',
  '.prettierrc.yaml',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.mjs',
  'prettier.config.js',
  'prettier.config.cjs',
  'prettier.config.mjs'
];

const TIMEOUT_MS = 10000; // 10 seconds

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a file extension is supported by Prettier
 */
function isSupportedExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

/**
 * Check if file path matches any skip pattern
 */
function shouldSkipPath(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return SKIP_PATTERNS.some(pattern => pattern.test(normalizedPath));
}

/**
 * Find Prettier binary (local node_modules or npx fallback)
 */
function findPrettierBinary(fileDir) {
  let currentDir = fileDir;
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const isWindows = process.platform === 'win32';
    const prettierBin = isWindows
      ? path.join(currentDir, 'node_modules', '.bin', 'prettier.cmd')
      : path.join(currentDir, 'node_modules', '.bin', 'prettier');

    if (fs.existsSync(prettierBin)) {
      return prettierBin;
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Run Prettier on a file with timeout
 */
function runPrettier(filePath, prettierBin) {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const args = ['--write', '--ignore-unknown', filePath];

    let command, spawnArgs;

    if (prettierBin) {
      command = prettierBin;
      spawnArgs = args;
    } else {
      command = isWindows ? 'npx.cmd' : 'npx';
      spawnArgs = ['prettier', ...args];
    }

    const child = spawn(command, spawnArgs, {
      stdio: ['ignore', 'ignore', 'ignore'],
      timeout: TIMEOUT_MS,
      windowsHide: true
    });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      resolve(false);
    }, TIMEOUT_MS);

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve(code === 0);
    });

    child.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

/**
 * Extract file path from tool input
 */
function extractFilePath(payload) {
  const toolInput = payload.tool_input;
  if (!toolInput) return null;

  let input = toolInput;
  if (typeof toolInput === 'string') {
    try {
      input = JSON.parse(toolInput);
    } catch (e) {
      return null;
    }
  }

  return input.file_path || input.path || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);

    // Only process Edit and Write tools
    const toolName = payload.tool_name;
    if (!['Edit', 'Write'].includes(toolName)) {
      process.exit(0);
    }

    // Only process successful tool calls
    if (payload.tool_error) {
      process.exit(0);
    }

    // Extract file path
    const filePath = extractFilePath(payload);
    if (!filePath) {
      process.exit(0);
    }

    // Resolve to absolute path
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      process.exit(0);
    }

    // Check if extension is supported
    if (!isSupportedExtension(absolutePath)) {
      process.exit(0);
    }

    // Check if path should be skipped
    if (shouldSkipPath(absolutePath)) {
      process.exit(0);
    }

    // Find Prettier binary
    const fileDir = path.dirname(absolutePath);
    const prettierBin = findPrettierBinary(fileDir);

    // Run Prettier (non-blocking, ignore result)
    await runPrettier(absolutePath, prettierBin);

    process.exit(0);
  } catch (error) {
    // Fail silently - formatting is non-critical
    process.exit(0);
  }
}

main();
