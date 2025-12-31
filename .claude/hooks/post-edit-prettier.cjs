#!/usr/bin/env node
/**
 * PostToolUse Hook: Auto-Prettier Formatting
 *
 * Automatically runs Prettier on files after Edit/Write operations.
 * Non-blocking: failures are silently ignored to not disrupt workflow.
 *
 * Trigger: PostToolUse (Edit|Write)
 * Input: JSON with tool_input.file_path
 * Output: None (silent operation)
 *
 * Exit Codes:
 *   0 - Always (non-blocking)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

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

const TIMEOUT_MS = 10000; // 10 seconds max

// Paths to skip (generated, dependencies, etc.)
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
    /\.angular\//
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if file extension is supported by Prettier
 */
function isSupportedFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return SUPPORTED_EXTENSIONS.has(ext);
}

/**
 * Check if file should be skipped (generated, dependencies, etc.)
 */
function shouldSkipPath(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    return SKIP_PATTERNS.some(pattern => pattern.test(normalized));
}

/**
 * Find Prettier config file by walking up from file location
 */
function findPrettierConfig(startDir) {
    const configNames = ['.prettierrc', '.prettierrc.json', '.prettierrc.js', '.prettierrc.cjs', 'prettier.config.js', 'prettier.config.cjs'];
    let dir = startDir;

    while (dir !== path.dirname(dir)) {
        for (const name of configNames) {
            const configPath = path.join(dir, name);
            if (fs.existsSync(configPath)) {
                return configPath;
            }
        }
        // Also check package.json for prettier key
        const pkgPath = path.join(dir, 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                if (pkg.prettier) {
                    return pkgPath; // Config is in package.json
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
        dir = path.dirname(dir);
    }
    return null;
}

/**
 * Find npx executable (cross-platform)
 */
function findNpx() {
    const isWindows = process.platform === 'win32';
    try {
        const cmd = isWindows ? 'where npx' : 'which npx';
        return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim().split('\n')[0];
    } catch (e) {
        return isWindows ? 'npx.cmd' : 'npx';
    }
}

/**
 * Run Prettier on a file
 */
function runPrettier(filePath, configPath) {
    const npx = findNpx();
    const args = ['prettier', '--write', filePath];

    if (configPath) {
        args.push('--config', configPath);
    }

    const result = spawnSync(npx, args, {
        encoding: 'utf-8',
        timeout: TIMEOUT_MS,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32'
    });

    return result.status === 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
    try {
        // Read stdin (PostToolUse payload)
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) {
            process.exit(0);
        }

        const payload = JSON.parse(stdin);

        // Extract file path from tool input
        const filePath = payload?.tool_input?.file_path;
        if (!filePath) {
            process.exit(0);
        }

        // Normalize path
        const absolutePath = path.isAbsolute(filePath)
            ? filePath
            : path.resolve(process.cwd(), filePath);

        // Skip if file doesn't exist (might have been deleted)
        if (!fs.existsSync(absolutePath)) {
            process.exit(0);
        }

        // Skip unsupported extensions
        if (!isSupportedFile(absolutePath)) {
            process.exit(0);
        }

        // Skip generated/dependency paths
        if (shouldSkipPath(absolutePath)) {
            process.exit(0);
        }

        // Find Prettier config
        const fileDir = path.dirname(absolutePath);
        const configPath = findPrettierConfig(fileDir);

        // Run Prettier (silent on failure)
        runPrettier(absolutePath, configPath);

        process.exit(0);
    } catch (error) {
        // Silent failure - don't disrupt workflow
        process.exit(0);
    }
}

main();
