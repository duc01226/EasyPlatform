#!/usr/bin/env node
/**
 * Design System Context Injector - PreToolUse Hook
 *
 * Automatically injects design system documentation guidance when editing
 * frontend files. Uses file path patterns to select the appropriate guide.
 *
 * Pattern Matching:
 *   src/WebV2/*                    → WebV2DesignSystem.md
 *   src/Web/bravoTALENTS*          → bravoTALENTSClientDesignSystem.md
 *   src/Web/CandidateApp*          → CandidateAppClientDesignSystem.md
 *   src/Web/JobPortal*             → CandidateAppClientDesignSystem.md
 *   src/Web/bravoINSIGHTS*         → bravoTALENTSClientDesignSystem.md
 *   src/Web/bravoSURVEYS*          → bravoTALENTSClientDesignSystem.md
 *   src/Web/PulseSurveys*          → bravoTALENTSClientDesignSystem.md
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
    name: 'WebV2',
    patterns: [
      /src[\/\\]WebV2[\/\\]/i,
      /libs[\/\\]bravo-common[\/\\]/i,
      /libs[\/\\]bravo-domain[\/\\]/i,
      /libs[\/\\]platform-core[\/\\]/i
    ],
    docFile: 'WebV2DesignSystem.md',
    description: 'Angular 19 standalone components with shared-mixin SCSS'
  },
  {
    name: 'bravoTALENTS',
    patterns: [
      /src[\/\\]Web[\/\\]bravoTALENTS/i,
      /src[\/\\]Web[\/\\]bravoINSIGHTS/i,
      /src[\/\\]Web[\/\\]bravoSURVEYS/i,
      /src[\/\\]Web[\/\\]PulseSurveys/i
    ],
    docFile: 'bravoTALENTSClientDesignSystem.md',
    description: 'Legacy Angular with SCSS variables and sprite icons'
  },
  {
    name: 'CandidateApp',
    patterns: [
      /src[\/\\]Web[\/\\]CandidateApp/i,
      /src[\/\\]Web[\/\\]JobPortal/i
    ],
    docFile: 'CandidateAppClientDesignSystem.md',
    description: 'Bootstrap 3 grid with ca- BEM prefix and Font Awesome icons'
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
    '### ⚠️ IMPORTANT — MUST READ',
    '',
    `Before implementing UI changes, you **⚠️ MUST READ** the design system documentation:`,
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
  if (app.name === 'WebV2') {
    lines.push(
      '- **SCSS:** Use `@use \'shared-mixin\'` imports',
      '- **Colors:** Use CSS variables `--bg-pri-cl`, `--text-primary-cl`',
      '- **Layout:** Use flex mixins `@include flex-column-container()`',
      '- **Components:** Angular 19 standalone with signals',
      '- **BEM:** Block__element with separate --modifier class'
    );
  } else if (app.name === 'bravoTALENTS') {
    lines.push(
      '- **SCSS:** Use `@import \'~assets/scss/variables\'`',
      '- **Colors:** Use SCSS variables `$color-primary`, `$color-gray-*`',
      '- **Icons:** Use sprite icons `<span class="icon icon-name"></span>`',
      '- **Layout:** Use `flex-column-container` mixin',
      '- **BEM:** Module-specific prefix (e.g., `recruitment-*`)'
    );
  } else if (app.name === 'CandidateApp') {
    lines.push(
      '- **Grid:** Bootstrap 3 `col-xs-*`, `col-sm-*`, `col-md-*`',
      '- **BEM:** Use `ca-` prefix for all classes',
      '- **Icons:** Font Awesome `<i class="fa fa-*"></i>`',
      '- **Variables:** Import from `_variables.scss`',
      '- **Modals:** Use Bootstrap modals with `ca-modal` class'
    );
  }

  lines.push(
    '',
    '### V1 Modern UI Note',
    '',
    'If building **NEW modern UI** in V1 apps (bravoTALENTS/CandidateApp), also **⚠️ MUST READ**:',
    '`docs/design-system/WebV1ModernStyleGuide.md` for V2 aesthetic guidelines.',
    ''
  );

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
