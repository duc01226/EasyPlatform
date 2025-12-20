#!/usr/bin/env node
/**
 * Claude Code Session Start Hook
 *
 * This hook runs at the start of each Claude Code session to:
 * 1. Display git status and current branch
 * 2. Load recent session summaries from memory
 * 3. Check for incomplete tasks from previous sessions
 * 4. Show relevant context based on current directory
 *
 * Exit codes:
 * - 0: Success (output will be shown to user)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const SESSION_SUMMARY_FILE = path.join(MEMORY_DIR, 'session-summary.md');
const INCOMPLETE_TASKS_FILE = path.join(MEMORY_DIR, 'incomplete-tasks.md');

/**
 * Execute git command safely
 */
function gitExec(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    } catch {
        return null;
    }
}

/**
 * Get git status summary
 */
function getGitStatus() {
    const branch = gitExec('git branch --show-current');
    const status = gitExec('git status --short');
    const lastCommit = gitExec("git log -1 --format='%h %s' 2>/dev/null");

    return {
        branch,
        status: status || '(clean)',
        lastCommit
    };
}

/**
 * Load recent session summaries
 */
function loadRecentSummaries(count = 3) {
    if (!fs.existsSync(SESSION_SUMMARY_FILE)) {
        return null;
    }

    const content = fs.readFileSync(SESSION_SUMMARY_FILE, 'utf-8');
    const summaries = content.split('## Context Anchor').slice(1);

    if (summaries.length === 0) {
        return null;
    }

    return summaries.slice(-count).map(s => {
        const lines = s.trim().split('\n');
        return lines.slice(0, 5).join('\n'); // First 5 lines of each summary
    });
}

/**
 * Load incomplete tasks if any
 */
function loadIncompleteTasks() {
    if (!fs.existsSync(INCOMPLETE_TASKS_FILE)) {
        return null;
    }

    const content = fs.readFileSync(INCOMPLETE_TASKS_FILE, 'utf-8');
    if (content.trim().length === 0) {
        return null;
    }

    return content;
}

/**
 * Find repository root by walking up directory tree
 * Looking for .git directory and CLAUDE.md file
 */
function findRepositoryRoot(startPath) {
    let current = startPath;
    const root = path.parse(current).root;

    while (current !== root) {
        const gitPath = path.join(current, '.git');
        const claudeMdPath = path.join(current, 'CLAUDE.md');

        if (fs.existsSync(gitPath) && fs.existsSync(claudeMdPath)) {
            return current;
        }

        current = path.dirname(current);
    }

    return null;
}

/**
 * Detect project type from path patterns (generic detection)
 */
function detectProjectType(cwd, repoRoot) {
    const relativePath = repoRoot ? path.relative(repoRoot, cwd) : cwd;
    const pathParts = relativePath.split(path.sep).filter(Boolean);
    const hints = [];

    // Analyze path components for context
    for (const part of pathParts) {
        // Platform framework module detection
        if (part.startsWith('Easy.Platform')) {
            const moduleName = part.replace('Easy.Platform.', '').replace('Easy.Platform', 'Core');
            hints.push(`Working in Platform (${moduleName} module)`);
            break;
        }

        // Microservice layer detection (pattern: ServiceName.Layer)
        const layerMatch = part.match(/^([A-Za-z]+(?:\.[A-Za-z]+)*)\.([A-Za-z]+)$/);
        if (layerMatch) {
            const [, serviceName, layer] = layerMatch;
            const layerMap = {
                Api: 'Web API layer',
                Application: 'CQRS handlers & business logic',
                Domain: 'Entities & domain events',
                Persistence: 'Database implementation',
                Shared: 'Cross-service utilities'
            };
            const layerDesc = layerMap[layer] || layer;
            hints.push(`Working in ${serviceName} (${layerDesc})`);
            break;
        }

        // Frontend workspace detection
        if (part.endsWith('Web') || part.endsWith('AppWeb')) {
            hints.push(`Working in Frontend (Angular Nx workspace)`);
            break;
        }

        // Generic service detection
        if (part.includes('Service') || part.includes('App')) {
            hints.push(`Working in ${part}`);
            break;
        }
    }

    // Check for specific directories within path
    if (relativePath.includes('libs/platform-core')) {
        hints.push('In platform-core library (base components & utilities)');
    } else if (relativePath.includes('libs/apps-domains')) {
        hints.push('In apps-domains library (business domain code)');
    } else if (relativePath.includes('/apps/')) {
        const appMatch = relativePath.match(/apps[/\\]([^/\\]+)/);
        if (appMatch) {
            hints.push(`In Angular app: ${appMatch[1]}`);
        }
    }

    return hints;
}

/**
 * Detect file types in current directory
 */
function detectFilePatterns(cwd) {
    const hints = [];

    try {
        const files = fs.readdirSync(cwd);

        // .NET project
        if (files.some(f => f.endsWith('.csproj'))) {
            const csprojFile = files.find(f => f.endsWith('.csproj'));
            hints.push(`.NET project: ${csprojFile}`);
        }

        // Node.js / Angular project
        if (files.some(f => f === 'package.json')) {
            hints.push('Node.js project detected');
        }

        // Angular/Nx workspace
        if (files.some(f => f === 'angular.json')) {
            hints.push('Angular workspace root');
        }
        if (files.some(f => f === 'project.json')) {
            hints.push('Nx project');
        }

        // Solution file
        if (files.some(f => f.endsWith('.sln'))) {
            const slnFile = files.find(f => f.endsWith('.sln'));
            hints.push(`Solution root: ${slnFile}`);
        }
    } catch {
        // Ignore directory read errors
    }

    return hints;
}

/**
 * Get directory context hints (generic detection)
 */
function getDirectoryContext() {
    const cwd = process.cwd();
    const repoRoot = findRepositoryRoot(cwd);
    const hints = [];

    // Project type detection
    const projectHints = detectProjectType(cwd, repoRoot);
    hints.push(...projectHints);

    // File pattern detection
    const fileHints = detectFilePatterns(cwd);
    hints.push(...fileHints);

    // If at repo root
    if (repoRoot && cwd === repoRoot) {
        hints.push('At repository root');
    }

    return hints;
}

/**
 * Format output section
 */
function formatSection(title, content) {
    if (!content) return '';
    return `\n=== ${title} ===\n${content}\n`;
}

// Main execution
function main() {
    const output = [];

    // Git Status
    const git = getGitStatus();
    if (git.branch) {
        output.push('=== Git Status ===');
        output.push(`Branch: ${git.branch}`);
        if (git.lastCommit) {
            output.push(`Last commit: ${git.lastCommit}`);
        }
        output.push(`Changes:\n${git.status}`);
    }

    // Directory Context
    const dirContext = getDirectoryContext();
    if (dirContext.length > 0) {
        output.push('\n=== Context ===');
        dirContext.forEach(hint => output.push(`- ${hint}`));
    }

    // Recent Session Summaries
    const summaries = loadRecentSummaries(2);
    if (summaries && summaries.length > 0) {
        output.push('\n=== Recent Session Context ===');
        summaries.forEach((s, i) => {
            output.push(`[Session ${i + 1}]`);
            output.push(s.substring(0, 200) + (s.length > 200 ? '...' : ''));
        });
    }

    // Incomplete Tasks
    const tasks = loadIncompleteTasks();
    if (tasks) {
        output.push('\n=== Incomplete Tasks ===');
        output.push(tasks.substring(0, 300) + (tasks.length > 300 ? '...' : ''));
    }

    // Output all
    console.log(output.join('\n'));
}

main();
process.exit(0);
