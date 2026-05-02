#!/usr/bin/env node
/**
 * path-boundary-block.cjs - Block file access outside project root
 *
 * Security hook to enforce project boundary. Unlike privacy-block,
 * NO user override (APPROVED: prefix) - this is security critical.
 *
 * Exit codes:
 *   0 = Allow (path inside project or allowlisted)
 *   2 = Block (path outside project boundary)
 */

const path = require('path');
const fs = require('fs');

// Lazy-load ck-path-utils (deferred until after isBoundaryCheckDisabled early exit)
let _ckPathUtils;
function getCkPathUtils() {
    return _ckPathUtils || (_ckPathUtils = require('./lib/ck-path-utils.cjs'));
}

/**
 * Get project root from environment or cwd
 * @returns {string} Normalized project root path
 */
function getProjectRoot() {
    const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    return getCkPathUtils().normalizePathForComparison(root);
}

/**
 * Decode URI-encoded path components
 * @param {string} p - Path that may contain encoded chars
 * @returns {string} Decoded path
 */
function decodePath(p) {
    if (!p) return '';
    try {
        return decodeURIComponent(p);
    } catch {
        return p; // Return as-is if invalid encoding
    }
}

/**
 * Resolve path to absolute, following symlinks if possible
 * @param {string} p - Path to resolve
 * @param {string} projectRoot - Project root for relative path resolution
 * @returns {string} Absolute resolved path
 */
function resolveRealPath(p, projectRoot) {
    if (!p) return '';

    // Decode URI components first
    let decoded = decodePath(p);

    // Convert MSYS/Git Bash paths (/d/... → D:/...) before path.resolve()
    // Node.js doesn't understand MSYS format and would resolve /d/path as D:\d\path
    decoded = getCkPathUtils().convertMsysToWindows(decoded);

    // Handle home directory expansion
    if (decoded.startsWith('~/') || decoded === '~') {
        const home = process.env.HOME || process.env.USERPROFILE || '';
        decoded = decoded.replace(/^~/, home);
    }

    // Resolve to absolute path
    let resolved;
    if (path.isAbsolute(decoded)) {
        resolved = path.resolve(decoded);
    } else {
        // Relative paths resolved against project root
        resolved = path.resolve(projectRoot, decoded);
    }

    // Try to resolve symlinks (fail gracefully if file doesn't exist)
    try {
        resolved = fs.realpathSync(resolved);
    } catch {
        // File may not exist yet (Write operation), use resolved path
    }

    return getCkPathUtils().normalizePathForComparison(resolved);
}

/**
 * Build allowlist using shared utility + .ck.json custom dirs
 * @returns {string[]} Array of normalized allowed paths
 */
function buildAllowlist() {
    return getCkPathUtils().buildBoundaryAllowlist(getConfigArray('pathBoundaryAllowedDirs'));
}

/**
 * Get array value from .ck.json config
 * @param {string} key - Config key
 * @returns {string[]} Array value or empty array
 */
function getConfigArray(key) {
    try {
        const configPath = path.join(process.cwd(), '.claude', '.ck.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return Array.isArray(config[key]) ? config[key] : [];
    } catch {
        return [];
    }
}

/**
 * Check if path-boundary feature is disabled via config
 * @returns {boolean} true if boundary check should be skipped
 */
function isBoundaryCheckDisabled() {
    return getConfigValue('pathBoundary') === false;
}

/**
 * Get value from .ck.json config
 * @param {string} key - Config key
 * @returns {*} Config value or undefined
 */
function getConfigValue(key) {
    try {
        const configPath = path.join(process.cwd(), '.claude', '.ck.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config[key];
    } catch {
        return undefined;
    }
}

/**
 * Check if path is within a directory (equals or is a subdirectory)
 * @param {string} targetPath - Path to check
 * @param {string} dir - Directory to check against
 * @returns {boolean} true if path is within directory
 */
function isWithinDir(targetPath, dir) {
    return targetPath === dir || targetPath.startsWith(dir + '/');
}

/**
 * Check if resolved path is outside project boundary
 * @param {string} resolvedPath - Absolute normalized path
 * @param {string} projectRoot - Normalized project root
 * @param {string[]} allowlist - Allowed directories outside project
 * @returns {boolean} true if path is outside and not allowlisted
 */
function isOutsideProject(resolvedPath, projectRoot, allowlist) {
    if (!resolvedPath) return false; // Empty paths handled by Claude

    // Check if inside project or any allowlisted directory
    const allowedDirs = [projectRoot, ...allowlist];
    return !allowedDirs.some(dir => isWithinDir(resolvedPath, dir));
}

/**
 * Extract all regex matches from text
 * @param {RegExp} regex - Pattern to match
 * @param {string} text - Text to search
 * @param {function} filter - Optional filter for matches
 * @returns {string[]} Matched values
 */
function extractMatches(regex, text, filter = () => true) {
    const results = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match[1] && filter(match[1])) results.push(match[1]);
    }
    return results;
}

/**
 * Strip inline interpreter code from command before path extraction.
 * Prevents false positives from strings like "/v2/users" inside code.
 * Replaces code content with empty quotes to preserve surrounding command.
 *
 * Handles: python -c "code", python3 -c 'code', node -e "code",
 *          ruby -e "code", perl -e "code", php -r "code"
 *
 * @param {string} cmd - Shell command string
 * @returns {string} Command with inline code content replaced by empty strings
 */
function stripInlineCode(cmd) {
    const interp = '(?:python3?|node|ruby|perl|php)';

    // Double-quoted code after interpreter -c/-e/-r
    // [^"']*? prevents crossing quote boundaries between interpreter and flag
    let result = cmd.replace(new RegExp(`(\\b${interp}\\b[^"']*?-[cer]\\s+)"(?:[^"\\\\]|\\\\.)*"`, 'gs'), '$1""');

    // Single-quoted code after interpreter -c/-e/-r
    result = result.replace(new RegExp(`(\\b${interp}\\b[^"']*?-[cer]\\s+)'[^']*'`, 'gs'), "$1''");

    return result;
}

/**
 * Strip sed/awk pattern arguments from command before path extraction.
 * These tools take expression arguments containing forward slashes
 * (e.g., 's/docker compose/new/g') that trigger false-positive path detection.
 *
 * Handles: sed 's/old/new/', sed -i 's/.../.../', sed -i.bak -e 's/.../.../',
 *          awk '{print $1}', awk -F, '/pattern/ {print}'
 *
 * @param {string} cmd - Shell command string
 * @returns {string} Command with sed/awk pattern content replaced by empty strings
 */
function stripSedAwkPatterns(cmd) {
    const tools = '(?:sed|awk|gawk|mawk)';
    // Match: tool [optional-flags] 'pattern' → tool [flags] ''
    // Flags: zero or more "-flag" arguments (e.g., -i, -e, -i.bak, -F,)
    const flags = '(?:\\s+-\\S*)*\\s+';

    // Single-quoted patterns
    let result = cmd.replace(new RegExp(`(\\b${tools}\\b${flags})'[^']*'`, 'g'), "$1''");

    // Double-quoted patterns
    result = result.replace(new RegExp(`(\\b${tools}\\b${flags})"(?:[^"\\\\]|\\\\.)*"`, 'g'), '$1""');

    return result;
}

/**
 * Strip grep/ripgrep pattern arguments from command before path extraction.
 * Grep patterns often contain slashes (e.g., "<!-- /SYNC:", "/api/v2/")
 * that trigger false-positive path detection.
 *
 * Uses [^'"]* to consume all flag forms (--type js, -A 3, -c, etc.) before
 * the first quoted string — simpler and more robust than a flags-only pattern
 * which fails on space-separated flag values like `rg --type js "pattern"`.
 *
 * Handles: grep "pattern", grep -c "pattern", rg --type js "pattern",
 *          grep -A 3 "pattern", rg "pattern", grep -E 'pattern'
 *
 * @param {string} cmd - Shell command string
 * @returns {string} Command with grep pattern content replaced by empty strings
 */
function stripGrepPatterns(cmd) {
    const tools = '(?:grep|egrep|fgrep|rg|ripgrep|findstr)';

    // Single-quoted patterns — consume everything up to first quote as flags
    let result = cmd.replace(new RegExp(`(\\b${tools}\\b[^']*)'[^']*'`, 'g'), "$1''");

    // Double-quoted patterns — consume everything up to first quote as flags
    result = result.replace(new RegExp(`(\\b${tools}\\b[^'"]*)"(?:[^"\\\\]|\\\\.)*"`, 'g'), '$1""');

    return result;
}

/**
 * Extract file paths from tool input
 * @param {Object} toolInput - Tool input object
 * @param {string} toolName - Name of the tool being used
 * @returns {Array<{value: string, field: string}>} Extracted paths
 */
function extractPaths(toolInput, toolName) {
    if (!toolInput) return [];

    const paths = [];
    const addPath = (value, field) => value && paths.push({ value, field });

    // Direct file path fields
    ['file_path', 'path', 'notebook_path'].forEach(f => addPath(toolInput[f], f));

    // MCP filesystem array paths
    if (toolName?.startsWith('mcp__filesystem__') && Array.isArray(toolInput.paths)) {
        toolInput.paths.forEach(p => addPath(p, 'paths[]'));
    }

    // Bash command parsing
    if (toolInput.command) {
        // Strip inline code and pattern-argument tools to prevent false positives
        let cmd = stripInlineCode(toolInput.command);
        cmd = stripSedAwkPatterns(cmd);
        cmd = stripGrepPatterns(cmd);

        // Skip path extraction for commands running inside containers
        // (docker exec, docker run, kubectl exec, etc.) — paths are container-internal
        if (/\b(?:docker|podman)\s+(?:exec|run)\b/i.test(cmd) || /\bkubectl\s+exec\b/i.test(cmd)) {
            return paths;
        }

        // File operation patterns (cat, head, etc.)
        extractMatches(/(?:cat|head|tail|less|more|vim|nano|code|notepad|type)\s+["']?([^\s"'|><&;]+)/gi, cmd, m => !m.startsWith('-')).forEach(p =>
            addPath(p, 'command')
        );

        // Redirection targets (> file, >> file) — skip /dev, /proc, /sys
        extractMatches(/>\s*["']?([^\s"'|><&;]+)/g, cmd, m => !/^\/(?:dev|proc|sys)(\/|$)/.test(m)).forEach(p => addPath(p, 'command'));

        // Absolute paths (skip /dev, /proc, /sys; on Windows also skip cmd flags like /I, /nologo, /v:m
        // when preceded by a Windows-only tool token). Outer platform gate guarantees Linux/macOS
        // can never bypass the boundary on /etc, /var, /home, etc.
        // Test override: CLAUDE_TEST_PLATFORM lets the test suite exercise both branches on either host.
        const isWin = (process.env.CLAUDE_TEST_PLATFORM || process.platform) === 'win32';
        const winToolRe = /\b(?:findstr|cmd|xcopy|robocopy|reg|sc|net|tasklist|taskkill|where|attrib)\b/i;
        const cmdHasWinTool = isWin && winToolRe.test(cmd);
        extractMatches(/(?:^|\s)["']?([A-Za-z]:[/\\][^\s"'|><&;]+|\/[^\s"'|><&;]+)/g, cmd, m => {
            if (/^\/(?:dev|proc|sys)\//.test(m)) return false;
            // Windows command flags: /Letter, /Word, or /Word:value — no nested path separators.
            // Skip ONLY on Windows AND when the command line contains a Windows-only tool token
            // (findstr, cmd, xcopy, etc.). This prevents Linux paths /etc, /var, /home from
            // being misclassified as flags.
            if (cmdHasWinTool && /^\/[A-Za-z][A-Za-z0-9_-]*(?::[^\s/\\]*)?$/.test(m)) return false;
            return true;
        }).forEach(p => addPath(p, 'command'));
    }

    return paths;
}

/**
 * Format block message
 * @param {string} blockedPath - Path that was blocked
 * @param {string} projectRoot - Project root for reference
 * @returns {string} Formatted error message
 */
function formatBlockMessage(blockedPath, projectRoot) {
    return `
\x1b[31mBLOCKED:\x1b[0m Path outside project boundary

  \x1b[33mPath:\x1b[0m ${blockedPath}
  \x1b[33mProject Root:\x1b[0m ${projectRoot}

  File access is restricted to the current project directory.
  This is a security measure to prevent unintended access to
  files outside the project.

  \x1b[34mAllowed locations:\x1b[0m
  - Project directory and subdirectories
  - System temp directories
  - Claude config (~/.claude)

  \x1b[90mTo allow additional directories, add them to
  .claude/.ck.json: { "pathBoundaryAllowedDirs": ["D:/path"] }\x1b[0m
`;
}

// Main execution
async function main() {
    // Check if boundary check is disabled
    if (isBoundaryCheckDisabled()) {
        process.exit(0);
    }

    // Read stdin
    let input = '';
    for await (const chunk of process.stdin) {
        input += chunk;
    }

    // Parse hook data
    let hookData;
    try {
        hookData = JSON.parse(input);
    } catch {
        process.exit(0); // Invalid JSON, allow (fail-open for parse errors)
    }

    const { tool_input: toolInput, tool_name: toolName } = hookData;

    // Get project root and build allowlist
    const projectRoot = getProjectRoot();
    const allowlist = buildAllowlist();

    // Extract and validate all paths
    const paths = extractPaths(toolInput, toolName);

    for (const { value: rawPath } of paths) {
        const resolvedPath = resolveRealPath(rawPath, projectRoot);

        if (isOutsideProject(resolvedPath, projectRoot, allowlist)) {
            console.error(formatBlockMessage(rawPath, projectRoot));
            process.exit(2); // Block
        }
    }

    process.exit(0); // Allow
}

main().catch(() => process.exit(0));

// Export for testing
module.exports = {
    getProjectRoot,
    get normalizePathForComparison() {
        return getCkPathUtils().normalizePathForComparison;
    },
    decodePath,
    resolveRealPath,
    buildAllowlist,
    isBoundaryCheckDisabled,
    isOutsideProject,
    isWithinDir,
    extractPaths,
    extractMatches,
    stripInlineCode,
    stripSedAwkPatterns,
    stripGrepPatterns
};
