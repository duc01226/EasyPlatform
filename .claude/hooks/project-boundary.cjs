#!/usr/bin/env node
/**
 * project-boundary.cjs - Block WRITE operations outside project root
 *
 * Enforces project boundary for write operations only. Read operations
 * (Read, Glob, Grep) are allowed outside boundary because:
 *   1. privacy-block.cjs already protects sensitive paths (~/.ssh, .env, etc.)
 *   2. Subagents need to read their output files from %TEMP%/claude/
 *
 * For Bash commands, only blocks when write patterns are detected
 * (redirects, cp, mv, tee, etc.) targeting outside-boundary paths.
 *
 * Exit Codes: 0 = allowed, 2 = blocked
 */

const fs = require('fs');
const path = require('path');
const { extractFromToolInput } = require('./scout-block/path-extractor.cjs');

// Tools that ALWAYS enforce boundary (write-only tools)
const WRITE_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'];

// Tools that skip boundary check (read-only, protected by privacy-block.cjs)
const READ_TOOLS = ['Read', 'Glob', 'Grep'];

// MCP filesystem write operations
const MCP_WRITE_OPS = ['write_file', 'create_directory', 'move_file'];

// All tools this hook handles (for the initial gate check)
const ALL_BOUNDARY_TOOLS = [...WRITE_TOOLS, ...READ_TOOLS, 'Bash'];

/**
 * Get normalized project root (lowercase, forward slashes)
 */
function getProjectRoot() {
    const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    return path.resolve(root).toLowerCase().replace(/\\/g, '/');
}

/**
 * Normalize path for comparison (absolute, lowercase, forward slashes)
 * Resolves symlinks to prevent bypass attacks
 */
function normalizePath(inputPath) {
    if (!inputPath) return '';

    let normalized = inputPath;

    // Decode URI components (%2e = '.', %2f = '/')
    try {
        normalized = decodeURIComponent(normalized);
    } catch {
        // Invalid encoding, use as-is
    }

    normalized = normalized.replace(/\\/g, '/');

    // Convert MSYS2/Git Bash paths (/d/...) to Windows paths (D:/...)
    const msysMatch = normalized.match(/^\/([a-zA-Z])\//);
    if (msysMatch) {
        normalized = msysMatch[1].toUpperCase() + ':/' + normalized.slice(3);
    }

    // Resolve to absolute
    const baseDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    normalized = path.isAbsolute(normalized) ? path.resolve(normalized) : path.resolve(baseDir, normalized);

    // Resolve symlinks to prevent boundary bypass (security hardening)
    try {
        // Only resolve if path exists - prevents errors on non-existent paths
        if (fs.existsSync(normalized)) {
            normalized = fs.realpathSync(normalized);
        }
    } catch {
        // If symlink resolution fails, use the unresolved path
        // This handles edge cases like broken symlinks or permission errors
    }

    return normalized.toLowerCase().replace(/\\/g, '/');
}

/**
 * Check if path is within project boundary
 */
function isWithinProject(testPath, projectRoot) {
    const normalized = normalizePath(testPath);
    if (!normalized) return true; // Empty path, allow

    return normalized === projectRoot || normalized.startsWith(projectRoot + '/');
}

/**
 * Detect if a Bash command contains write operations.
 * Conservative approach: only match obvious write patterns.
 * Fail-open for ambiguous cases (better to allow than break legitimate reads).
 */
function containsWriteOperation(cmd) {
    if (!cmd || typeof cmd !== 'string') return false;

    // Output redirects: > or >> targeting files (not fd redirects like 2>&1 or >&2)
    // Strategy: normalize away harmless patterns, then check for real writes.
    //   - Strip /dev/null redirects (no-op, not a meaningful write)
    //   - Strip fd-to-fd redirects (2>&1, >&2)
    const cmdNoDevNull = cmd.replace(/\d*>{1,2}\s*\/dev\/null/g, '');
    // Check 1: non-digit prefix redirect: "echo x > file", "cmd >> file"
    if (/(?:^|[^>&\d])>{1,2}\s*[^&]/.test(cmdNoDevNull)) return true;
    // Check 2: digit-prefix redirect to file: "2>err.log" (but NOT "2>&1")
    if (/\d>{1,2}\s*[^&\s]/.test(cmdNoDevNull)) return true;

    // Write commands as first token or after pipe/chain operators
    if (/(?:^|[|;&]\s*)(tee|cp|mv|mkdir|rm|rmdir|touch|install)\s/m.test(cmd)) return true;

    // Heredoc write patterns
    if (/<<['"]?\w+['"]?/.test(cmd)) return true;

    return false;
}

/**
 * Format block message
 */
function formatBlockMessage(blockedPath, projectRoot, toolName) {
    return `
\x1b[31mPROJECT BOUNDARY BLOCK\x1b[0m

  \x1b[33mTool:\x1b[0m ${toolName}
  \x1b[33mPath:\x1b[0m ${blockedPath}
  \x1b[33mBoundary:\x1b[0m ${projectRoot}

  File operations outside the project root are blocked.
  \x1b[34mTo fix:\x1b[0m Use a path within the project directory.
`;
}

// Export for testing
if (typeof module !== 'undefined') {
    module.exports = {
        getProjectRoot,
        normalizePath,
        isWithinProject,
        formatBlockMessage,
        containsWriteOperation,
        WRITE_TOOLS,
        READ_TOOLS,
        ALL_BOUNDARY_TOOLS
    };
}

// Main execution
try {
    const hookInput = fs.readFileSync(0, 'utf-8');

    if (!hookInput || hookInput.trim().length === 0) {
        console.error('WARN: Empty input, allowing operation');
        process.exit(0);
    }

    let data;
    try {
        data = JSON.parse(hookInput);
    } catch {
        console.error('WARN: JSON parse failed, allowing operation');
        process.exit(0);
    }

    if (!data.tool_input || typeof data.tool_input !== 'object') {
        console.error('WARN: Invalid JSON structure, allowing operation');
        process.exit(0);
    }

    const toolInput = data.tool_input;
    const toolName = data.tool_name || 'unknown';

    // Skip tools not in boundary-check list
    if (!ALL_BOUNDARY_TOOLS.includes(toolName) && !toolName.startsWith('mcp__filesystem__')) {
        process.exit(0);
    }

    // Read-only tools: skip boundary check (privacy-block.cjs handles sensitive paths)
    if (READ_TOOLS.includes(toolName)) {
        process.exit(0);
    }

    // MCP filesystem: only enforce for write operations
    if (toolName.startsWith('mcp__filesystem__')) {
        const op = toolName.replace('mcp__filesystem__', '');
        if (!MCP_WRITE_OPS.includes(op)) {
            process.exit(0);
        }
    }

    // Bash: only enforce when command contains write operations
    if (toolName === 'Bash') {
        if (!containsWriteOperation(toolInput.command)) {
            process.exit(0);
        }
    }

    // At this point: write tool, Bash with write ops, or MCP write op
    const projectRoot = getProjectRoot();
    const extractedPaths = extractFromToolInput(toolInput);

    if (extractedPaths.length === 0) {
        process.exit(0);
    }

    // Check each path
    for (const testPath of extractedPaths) {
        if (!isWithinProject(testPath, projectRoot)) {
            console.error(formatBlockMessage(testPath, projectRoot, toolName));
            process.exit(2);
        }
    }

    process.exit(0);
} catch (error) {
    console.error('WARN: Hook error, allowing operation -', error.message);
    process.exit(0);
}
