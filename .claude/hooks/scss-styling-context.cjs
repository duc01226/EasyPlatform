#!/usr/bin/env node
/**
 * SCSS Styling Context Injector - PreToolUse Hook
 *
 * Automatically injects SCSS styling guide when editing .scss/.css files
 * in frontend applications. Complements design-system-context.cjs which
 * handles app-specific design tokens.
 *
 * Pattern Matching:
 *   src/PlatformExampleAppWeb/*    → Angular 19 example app (shared-mixin)
 *   libs/*                         → Shared libraries
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SCSS_GUIDE_PATH = 'docs/claude/scss-styling-guide.md';

const FRONTEND_PATTERNS = [
  {
    name: 'Example App',
    patterns: [
      /src[\/\\]PlatformExampleAppWeb[\/\\]/i,
      /libs[\/\\]platform-core[\/\\]/i,
      /libs[\/\\]apps-domains[\/\\]/i
    ],
    description: 'Angular 19 with shared-mixin SCSS system'
  },
  {
    name: 'Libraries',
    patterns: [
      /libs[\/\\]/i
    ],
    description: 'Shared component libraries'
  }
];

// App-specific patterns for detailed guidance
const APP_PATTERNS = {
  'playground-text-snippet': /PlatformExampleAppWeb[\/\\]apps[\/\\]playground-text-snippet/i
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if SCSS styling context was recently injected
 */
function wasRecentlyInjected(transcriptPath) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
    const transcript = fs.readFileSync(transcriptPath, 'utf-8');
    const recentLines = transcript.split('\n').slice(-200).join('\n');
    return recentLines.includes('**SCSS Styling Context Detected**');
  } catch (e) {
    return false;
  }
}

function isStyleFile(filePath) {
  if (!filePath) return false;
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.scss' || ext === '.css' || ext === '.sass' || ext === '.less';
}

function detectFrontendContext(filePath) {
  if (!filePath) return null;

  const normalizedPath = filePath.replace(/\\/g, '/');

  for (const context of FRONTEND_PATTERNS) {
    for (const pattern of context.patterns) {
      if (pattern.test(normalizedPath)) {
        return context;
      }
    }
  }

  return null;
}

function detectApp(filePath) {
  if (!filePath) return null;

  const normalizedPath = filePath.replace(/\\/g, '/');

  for (const [appName, pattern] of Object.entries(APP_PATTERNS)) {
    if (pattern.test(normalizedPath)) {
      return appName;
    }
  }

  return null;
}

function shouldInject(filePath, transcriptPath) {
  if (!isStyleFile(filePath)) return false;
  const context = detectFrontendContext(filePath);
  if (!context) return false;
  if (wasRecentlyInjected(transcriptPath)) return false;
  return true;
}

function buildInjection(context, filePath, app) {
  const fileName = path.basename(filePath);

  const lines = [
    '',
    '## SCSS Styling Context Detected',
    '',
    `**Context:** ${context.name}`,
    `**File:** ${fileName}`,
    app ? `**App:** ${app}` : '',
    '',
    '### Required Reading',
    '',
    `Before implementing SCSS/CSS changes, you MUST read:`,
    '',
    `**\`${SCSS_GUIDE_PATH}\`**`,
    '',
    'This guide contains:',
    '- BEM naming conventions (block__element --modifier)',
    '- SCSS architecture patterns and file organization',
    '- Mixin usage and shared-mixin imports',
    '- CSS variable conventions for theming',
    '- Responsive design patterns and breakpoints',
    '- Component-scoped styling best practices',
    '',
    '### Critical Rules',
    '',
    '1. **BEM Classes:** Use `block__element` with separate `--modifier` class',
    '2. **No Magic Numbers:** Use variables for colors, spacing, breakpoints',
    '3. **Imports:** Use `@use \'shared-mixin\'` for modern Angular apps',
    '4. **Nesting:** Max 3 levels deep, avoid over-specificity',
    '5. **Component Scope:** Styles scoped to component block class',
    ''
  ];

  // Add context-specific guidance
  if (context.name === 'Example App') {
    lines.push(
      '### Example App SCSS Patterns',
      '',
      '```scss',
      '// Import pattern',
      '@use \'shared-mixin\' as *;',
      '',
      '// CSS Variables for theming',
      'color: var(--text-primary-cl);',
      'background: var(--bg-pri-cl);',
      '',
      '// Flex mixins',
      '@include flex-column-container();',
      '@include flex-row-gap(8px);',
      '```',
      ''
    );
  }

  // Filter consecutive empty lines
  return lines.filter((line, i, arr) => {
    if (line === '' && arr[i - 1] === '') return false;
    return true;
  }).join('\n');
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

    if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) {
      process.exit(0);
    }

    const filePath = toolInput.file_path || toolInput.filePath || '';
    if (!filePath) process.exit(0);

    if (!shouldInject(filePath, transcriptPath)) {
      process.exit(0);
    }

    const context = detectFrontendContext(filePath);
    if (!context) process.exit(0);

    const app = detectApp(filePath);
    const injection = buildInjection(context, filePath, app);
    console.log(injection);

    process.exit(0);
  } catch (error) {
    process.exit(0);
  }
}

main();
