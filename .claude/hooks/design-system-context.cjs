#!/usr/bin/env node
/**
 * Design System Context Injector - PreToolUse Hook
 *
 * Automatically injects design system documentation guidance when editing
 * frontend files. Uses file path patterns to select the appropriate guide.
 *
 * Pattern Matching:
 *   src/PlatformExampleAppWeb/*    → WebV2DesignSystem.md (Angular 19 example app)
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const DESIGN_SYSTEM_DOCS_PATH = 'docs/design-system';

const APP_PATTERNS = [
  {
    name: 'PlatformExampleAppWeb',
    patterns: [
      /src[\/\\]PlatformExampleAppWeb[\/\\]/i,
      /libs[\/\\]apps-domains[\/\\]/i,
      /libs[\/\\]platform-core[\/\\]/i
    ],
    docFile: 'WebV2DesignSystem.md',
    description: 'Angular 19 standalone components with shared-mixin SCSS'
  }
];

// File extensions that indicate frontend files
const FRONTEND_EXTENSIONS = [
  '.html', '.htm',
  '.scss', '.css', '.less', '.sass',
  '.ts', '.tsx', '.js', '.jsx',
  '.vue', '.svelte'
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if design system context was recently injected for this app
 * Reads the transcript to avoid duplicate injections
 */
function wasRecentlyInjected(transcriptPath, appName) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
    const transcript = fs.readFileSync(transcriptPath, 'utf-8');
    // Check last 200 lines for recent injection of same app context
    const recentLines = transcript.split('\n').slice(-200).join('\n');
    return recentLines.includes(`**Detected App:** ${appName}`);
  } catch (e) {
    return false;
  }
}

function isFrontendFile(filePath) {
  if (!filePath) return false;
  const ext = path.extname(filePath).toLowerCase();
  return FRONTEND_EXTENSIONS.includes(ext);
}

function detectAppFromPath(filePath) {
  if (!filePath) return null;

  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');

  for (const app of APP_PATTERNS) {
    for (const pattern of app.patterns) {
      if (pattern.test(normalizedPath)) {
        return app;
      }
    }
  }

  return null;
}

function shouldInject(filePath, transcriptPath) {
  // Skip non-frontend files
  if (!isFrontendFile(filePath)) return false;

  // Skip if no app detected
  const app = detectAppFromPath(filePath);
  if (!app) return false;

  // Skip if already injected for this app recently
  if (wasRecentlyInjected(transcriptPath, app.name)) return false;

  return true;
}

function buildInjection(app, filePath) {
  const docPath = `${DESIGN_SYSTEM_DOCS_PATH}/${app.docFile}`;
  const indexPath = `${DESIGN_SYSTEM_DOCS_PATH}/README.md`;

  const lines = [
    '',
    '## Design System Context',
    '',
    `**Detected App:** ${app.name}`,
    `**File:** ${path.basename(filePath)}`,
    '',
    '### Required Reading',
    '',
    `Before implementing UI changes, you MUST read the design system documentation:`,
    '',
    `1. **Primary Guide:** \`${docPath}\``,
    `   - ${app.description}`,
    '',
    `2. **Index (for navigation):** \`${indexPath}\``,
    '',
    '### Quick Reference',
    ''
  ];

  // Add app-specific quick tips
  if (app.name === 'PlatformExampleAppWeb') {
    lines.push(
      '- **SCSS:** Use `@use \'shared-mixin\'` imports',
      '- **Colors:** Use CSS variables `--bg-pri-cl`, `--text-primary-cl`',
      '- **Layout:** Use flex mixins `@include flex-column-container()`',
      '- **Components:** Angular 19 standalone with signals',
      '- **BEM:** Block__element with separate --modifier class'
    );
  }

  lines.push('');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);
    const toolName = payload.tool_name || '';
    const toolInput = payload.tool_input || {};
    const transcriptPath = payload.transcript_path || '';

    // Only process Edit, Write, MultiEdit tools
    if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) {
      process.exit(0);
    }

    // Extract file path from tool input
    const filePath = toolInput.file_path || toolInput.filePath || '';
    if (!filePath) process.exit(0);

    // Check if we should inject
    if (!shouldInject(filePath, transcriptPath)) {
      process.exit(0);
    }

    // Detect app and build injection
    const app = detectAppFromPath(filePath);
    if (!app) process.exit(0);

    // Output the injection
    const injection = buildInjection(app, filePath);
    console.log(injection);

    process.exit(0);
  } catch (error) {
    // Non-blocking - just exit silently
    process.exit(0);
  }
}

main();
