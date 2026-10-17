#!/usr/bin/env node
/**
 * Post-Edit Formatter Hook
 *
 * Fires: PostToolUse for Edit and Write tools
 * Purpose: Format the edited/written file with the PROJECT's formatter.
 *
 * ── PORTABILITY CONTRACT (this file ships inside the reusable `.claude`) ──────
 * This hook MUST stay project-agnostic. It never names a project's formatter.
 * The formatter is resolved at runtime from the project config
 * (`docs/project-config.json` -> `formatting`), so the same `.claude` copied into
 * ANY repo formats that repo with the tool it actually uses.
 *
 * Resolution order for the formatter used on a file:
 *   1. `formatting.command`      — an explicit command template; `{file}` is
 *                                  replaced with the path (appended if absent).
 *   2. `formatting.formatter`    — a known preset id (`prettier`, `biome`, …).
 *   3. framework DEFAULT         — `prettier` (the portable fallback).
 *   `formatting.formatter: "none"` / `"off"` disables formatting entirely.
 *
 * A project that declares nothing therefore keeps the framework default (Prettier),
 * which is what every non-configured repo gets.
 *
 * Config knobs (all optional, under `formatting` in project-config.json):
 *   formatter      preset id (`prettier` default, `biome`, or `none`)
 *   command        explicit command template (overrides `formatter`)
 *   args           extra CLI args inserted before the file path
 *   fileExtensions extensions to format (defaults to the preset's own set)
 *   skipPaths      extra path substrings to skip (added to the built-in skip list)
 *
 * Features:
 *   - Non-blocking: failures are silently ignored (10s timeout)
 *   - Bounded child lifecycle: a timed-out formatter is killed tree-wide
 *   - Cross-platform: Windows and Unix compatible
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formatter presets — the framework's built-in vocabulary of known formatters.
 *
 * `package` is used only for the `npx` fallback when no local binary is found.
 * `extensions` is the set the preset can actually format; a preset asked to
 * format an unsupported extension is skipped (never an error).
 */
const FORMATTER_PRESETS = {
    prettier: {
        package: 'prettier',
        args: ['--write', '--ignore-unknown'],
        extensions: [
            '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.jsonc', '.scss',
            '.css', '.less', '.html', '.htm', '.md', '.mdx', '.yaml', '.yml',
            '.graphql', '.gql'
        ]
    },
    biome: {
        package: '@biomejs/biome',
        args: ['format', '--write'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.jsonc', '.css', '.graphql', '.gql']
    }
};

/** The portable fallback when a project configures no formatter. */
const DEFAULT_FORMATTER = 'prettier';

/** Formatter ids that mean "do not format". */
const DISABLED_FORMATTERS = new Set(['none', 'off', 'disabled', 'false']);

const PROJECT_CONFIG_MODULE = './lib/project-config-loader.cjs';

const DEFAULT_SKIP_PATTERNS = [
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
    /[/\\]\.claude[/\\]/
];

const TIMEOUT_MS = 10000; // 10 seconds
const PROCESS_KILL_GRACE_MS = 2000;

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Read this project's `formatting` config. Fail-SOFT: a missing/broken config,
 * or a missing loader, yields `{}` so the framework default applies. A hook that
 * threw would block every tool call in the session — a worse failure than a
 * skipped format.
 */
function loadFormattingConfig() {
    try {
        const { loadProjectConfig } = require(PROJECT_CONFIG_MODULE);
        const config = loadProjectConfig();
        const formatting = config && config.formatting;
        return formatting && typeof formatting === 'object' ? formatting : {};
    } catch {
        return {};
    }
}

/** Built-in skip patterns plus any `formatting.skipPaths` substrings. */
function buildSkipPatterns(formatting) {
    const patterns = [...DEFAULT_SKIP_PATTERNS];
    if (Array.isArray(formatting.skipPaths)) {
        for (const entry of formatting.skipPaths) {
            if (typeof entry === 'string' && entry.trim()) {
                patterns.push(new RegExp(entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
            }
        }
    }
    return patterns;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve the formatter invocation for a file, or null to skip.
 *
 * @returns {{command: string, args: string[], useShell: boolean} | null}
 */
function resolveFormatPlan(filePath, formatting) {
    const configured = typeof formatting.formatter === 'string' ? formatting.formatter.trim().toLowerCase() : '';
    if (DISABLED_FORMATTERS.has(configured)) return null;

    // 1. Explicit command template wins outright.
    if (typeof formatting.command === 'string' && formatting.command.trim()) {
        const template = formatting.command.trim();
        const quoted = quoteForShell(filePath);
        const command = template.includes('{file}')
            ? template.split('{file}').join(quoted)
            : `${template} ${quoted}`;
        return { command, args: [], useShell: true };
    }

    // 2. Preset id, else 3. the framework default.
    const presetName = FORMATTER_PRESETS[configured] ? configured : DEFAULT_FORMATTER;
    const preset = FORMATTER_PRESETS[presetName];

    // Extension gate — never hand a preset a file it cannot format.
    const extensions = Array.isArray(formatting.fileExtensions) && formatting.fileExtensions.length
        ? formatting.fileExtensions
        : preset.extensions;
    const ext = path.extname(filePath).toLowerCase();
    if (extensions.length > 0 && !extensions.includes(ext)) return null;

    const extraArgs = Array.isArray(formatting.args)
        ? formatting.args.filter(arg => typeof arg === 'string')
        : [];
    const tailArgs = [...preset.args, ...extraArgs, filePath];

    const isWindows = process.platform === 'win32';
    const localBin = findLocalBinary(presetName, path.dirname(filePath));

    if (localBin) {
        return { command: localBin, args: tailArgs, useShell: isWindows };
    }
    return {
        command: isWindows ? 'npx.cmd' : 'npx',
        args: [preset.package, ...tailArgs],
        useShell: isWindows
    };
}

/** Quote a single path for a shell command string (custom `command` templates only). */
function quoteForShell(value) {
    return process.platform === 'win32'
        ? `"${String(value).replace(/"/g, '""')}"`
        : `'${String(value).replace(/'/g, `'\\''`)}'`;
}

/**
 * Find the local formatter binary by walking up to the workspace root's
 * node_modules/.bin. Returns null when not found (caller falls back to npx).
 */
function findLocalBinary(name, fileDir) {
    let currentDir = fileDir;
    const root = path.parse(currentDir).root;
    const isWindows = process.platform === 'win32';
    const binName = isWindows ? `${name}.cmd` : name;

    while (currentDir !== root) {
        const candidate = path.join(currentDir, 'node_modules', '.bin', binName);
        if (fs.existsSync(candidate)) return candidate;
        currentDir = path.dirname(currentDir);
    }

    return null;
}

/**
 * Terminate a formatter process and all descendants.
 *
 * `.cmd` formatters run through a Windows shell, so killing the direct child
 * alone can leave npx/formatter descendants holding the edited project open.
 */
function terminateProcessTree(child) {
    if (!child.pid) return Promise.resolve();

    if (process.platform !== 'win32') {
        if (!child.killed) child.kill('SIGTERM');
        return Promise.resolve();
    }

    return new Promise(resolve => {
        execFile('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, error => {
            if (error && !child.killed) child.kill('SIGTERM');
            resolve();
        });
    });
}

/**
 * Run the resolved formatter with timeout.
 */
function runFormatter(plan) {
    return new Promise(resolve => {
        const child = spawn(plan.command, plan.args, {
            stdio: ['ignore', 'ignore', 'ignore'],
            windowsHide: true,
            shell: plan.useShell
        });

        let settled = false;
        let timedOut = false;
        let timeoutId;
        let killGraceId;

        const finish = result => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            clearTimeout(killGraceId);
            resolve(result);
        };

        const timeout = () => {
            timedOut = true;
            terminateProcessTree(child).then(() => {
                if (settled) return;

                // Prefer the close event so the promise represents the full
                // child lifecycle. The bounded fallback prevents a broken
                // platform command from hanging the hook forever.
                if (child.exitCode !== null || child.signalCode !== null) {
                    finish(false);
                    return;
                }

                killGraceId = setTimeout(() => finish(false), PROCESS_KILL_GRACE_MS);
            });
        };

        timeoutId = setTimeout(timeout, TIMEOUT_MS);

        child.once('close', code => finish(!timedOut && code === 0));
        child.once('error', () => finish(false));
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
        } catch {
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
        if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) {
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
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

        // Check if file exists
        if (!fs.existsSync(absolutePath)) {
            process.exit(0);
        }

        const formatting = loadFormattingConfig();

        // Check if path should be skipped
        const skipPatterns = buildSkipPatterns(formatting);
        const normalizedPath = absolutePath.replace(/\\/g, '/');
        if (skipPatterns.some(pattern => pattern.test(normalizedPath))) {
            process.exit(0);
        }

        // Resolve the project's formatter (framework default: prettier)
        const plan = resolveFormatPlan(absolutePath, formatting);
        if (!plan) {
            process.exit(0);
        }

        // Run the formatter (non-blocking, result ignored)
        await runFormatter(plan);

        return;
    } catch (error) {
        // Fail silently - formatting is non-critical
        process.exit(0);
    }
}

main();
