#!/usr/bin/env node
/**
 * scout-block.cjs - Cross-platform hook for blocking directory access
 *
 * Blocks access to directories listed in .claude/.ckignore
 * Uses gitignore-spec compliant pattern matching via 'ignore' package
 *
 * Blocking Rules:
 * - File paths: Blocks any file_path/path/pattern containing blocked directories
 * - Bash commands: Blocks directory access (cd, ls, cat, etc.) but ALLOWS build commands
 *   - Blocked: cd node_modules, ls packages/web/node_modules, cat dist/file.js
 *   - Allowed: npm build, go build, cargo build, make, mvn, gradle, docker build, kubectl, terraform
 *
 * Configuration:
 * - Edit .claude/.ckignore to customize blocked patterns (one per line, # for comments)
 * - Supports negation patterns (!) to allow specific paths
 *
 * Exit Codes:
 * - 0: Command allowed
 * - 2: Command blocked
 */

const fs = require('fs');
const path = require('path');

// Broad-pattern-detector loaded eagerly (used before build-command check for Glob tool)
const { detectBroadPatternIssue, formatBroadPatternError } = require('./scout-block/broad-pattern-detector.cjs');

// Heavy modules loaded lazily after early-exit checks (pattern-matcher loads vendored 'ignore' package)
let _patternMatcher, _pathExtractor, _errorFormatter;
function getPatternMatcher() {
    return _patternMatcher || (_patternMatcher = require('./scout-block/pattern-matcher.cjs'));
}
function getPathExtractor() {
    return _pathExtractor || (_pathExtractor = require('./scout-block/path-extractor.cjs'));
}
function getErrorFormatter() {
    return _errorFormatter || (_errorFormatter = require('./scout-block/error-formatter.cjs'));
}

// Build command allowlist - these are allowed even if they contain blocked paths
// Handles flags and filters: npm build, pnpm --filter web run build, yarn workspace app build
// Also allows: go, cargo, make, mvn/mvnw, gradle/gradlew, dotnet, docker, bazel, cmake, sbt, flutter, swift, ant, ninja, meson
const BUILD_COMMAND_PATTERN =
    /^(npm|pnpm|yarn|bun)\s+([^\s]+\s+)*(run\s+)?(build|test|lint|dev|start|install|ci|add|remove|update|publish|pack|init|create|exec)/;
const TOOL_COMMAND_PATTERN =
    /^(\.\/)?(npx|pnpx|bunx|tsc|esbuild|vite|webpack|rollup|turbo|nx|jest|vitest|mocha|eslint|prettier|go|cargo|make|mvn|mvnw|gradle|gradlew|dotnet|docker|podman|kubectl|helm|terraform|ansible|bazel|cmake|sbt|flutter|swift|ant|ninja|meson)/;

/**
 * Check if a command is a build/tooling command (should be allowed)
 * Handles compound commands joined by &&, ||, ; by checking each sub-command
 *
 * @param {string} command - The command to check
 * @returns {boolean}
 */
function isBuildCommand(command) {
    if (!command || typeof command !== 'string') return false;
    const trimmed = command.trim();

    // Check the full command first (fast path)
    if (BUILD_COMMAND_PATTERN.test(trimmed) || TOOL_COMMAND_PATTERN.test(trimmed)) {
        return true;
    }

    // Split compound commands on &&, ||, ; and check each sub-command
    // This handles cases like "cd path && dotnet build" where the build tool
    // is not the first command in the chain
    const subCommands = trimmed.split(/\s*(?:&&|\|\||;)\s*/);
    if (subCommands.length > 1) {
        return subCommands.some(sub => {
            const s = sub.trim();
            return s && (BUILD_COMMAND_PATTERN.test(s) || TOOL_COMMAND_PATTERN.test(s));
        });
    }

    return false;
}

try {
    // Read stdin synchronously
    const hookInput = fs.readFileSync(0, 'utf-8');

    // Validate input not empty
    if (!hookInput || hookInput.trim().length === 0) {
        console.error('ERROR: Empty input');
        process.exit(2);
    }

    // Parse JSON
    let data;
    try {
        data = JSON.parse(hookInput);
    } catch (parseError) {
        // Fail-open for unparseable input
        console.error('WARN: JSON parse failed, allowing operation');
        process.exit(0);
    }

    // Validate structure
    if (!data.tool_input || typeof data.tool_input !== 'object') {
        // Fail-open for invalid structure
        console.error('WARN: Invalid JSON structure, allowing operation');
        process.exit(0);
    }

    const toolInput = data.tool_input;
    const toolName = data.tool_name || 'unknown';

    // Check if it's a build command (allowed regardless of paths)
    if (toolInput.command && isBuildCommand(toolInput.command)) {
        process.exit(0);
    }

    // Check for overly broad glob patterns (Glob tool)
    // This prevents LLMs from filling context with **/*.ts at project root
    if (toolName === 'Glob' || toolInput.pattern) {
        const broadResult = detectBroadPatternIssue(toolInput);
        if (broadResult.blocked) {
            const errorMsg = formatBroadPatternError(broadResult, path.dirname(__dirname));
            console.error(errorMsg);
            process.exit(2);
        }
    }

    // Lazy-load heavy modules (pattern-matcher loads vendored 'ignore' package)
    const { loadPatterns, createMatcher, matchPath } = getPatternMatcher();
    const { extractFromToolInput } = getPathExtractor();
    const { formatBlockedError } = getErrorFormatter();

    // Load patterns from .ckignore
    const scriptDir = __dirname;
    const claudeDir = path.dirname(scriptDir); // Go up from hooks/ to .claude/
    const ckignorePath = path.join(claudeDir, '.ckignore');
    const patterns = loadPatterns(ckignorePath);
    const matcher = createMatcher(patterns);

    // Extract paths from tool input
    const extractedPaths = extractFromToolInput(toolInput);

    // If no paths extracted, allow operation
    if (extractedPaths.length === 0) {
        process.exit(0);
    }

    // Check each path against patterns
    for (const extractedPath of extractedPaths) {
        const result = matchPath(matcher, extractedPath);
        if (result.blocked) {
            // Output rich error message
            const errorMsg = formatBlockedError({
                path: extractedPath,
                pattern: result.pattern,
                tool: toolName,
                claudeDir: claudeDir
            });
            console.error(errorMsg);
            process.exit(2);
        }
    }

    // All paths allowed
    process.exit(0);
} catch (error) {
    // Fail-open for unexpected errors
    console.error('WARN: Hook error, allowing operation -', error.message);
    process.exit(0);
}
