#!/usr/bin/env node
/**
 * Frontend TypeScript Context Injector - PreToolUse Hook
 *
 * Automatically injects frontend TypeScript development guide when editing
 * .ts files in frontend applications. Uses file path patterns to detect
 * frontend TypeScript files.
 *
 * Pattern Matching:
 *   src/PlatformExampleAppWeb/*    → Angular 19 example app
 *   libs/platform-core/*           → Platform core library
 *   libs/apps-domains/*            → Domain library
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const FRONTEND_GUIDE_PATH = 'docs/claude/frontend-typescript-complete-guide.md';

const FRONTEND_PATTERNS = [
  {
    name: 'Example App',
    patterns: [
      /src[\/\\]PlatformExampleAppWeb[\/\\]/i
    ],
    description: 'Angular 19 standalone example app (TextSnippet)'
  },
  {
    name: 'Platform Core',
    patterns: [
      /libs[\/\\]platform-core[\/\\]/i
    ],
    description: 'Platform core framework library'
  },
  {
    name: 'Apps Domains',
    patterns: [
      /libs[\/\\]apps-domains[\/\\]/i
    ],
    description: 'Domain models and API services'
  }
];

// App-specific patterns for more detailed guidance
const APP_PATTERNS = {
  'playground-text-snippet': /PlatformExampleAppWeb[\/\\]apps[\/\\]playground-text-snippet/i
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if frontend TypeScript context was recently injected
 * Reads the transcript to avoid duplicate injections
 */
function wasRecentlyInjected(transcriptPath) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
    const transcript = fs.readFileSync(transcriptPath, 'utf-8');
    // Check last 200 lines for recent injection
    const recentLines = transcript.split('\n').slice(-200).join('\n');
    return recentLines.includes('**Frontend TypeScript Context Detected**');
  } catch (e) {
    return false;
  }
}

function isTypeScriptFile(filePath) {
  if (!filePath) return false;
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.ts' || ext === '.tsx';
}

function detectFrontendContext(filePath) {
  if (!filePath) return null;

  // Normalize path separators
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
  // Skip non-TypeScript files
  if (!isTypeScriptFile(filePath)) return false;

  // Skip if no frontend context detected
  const context = detectFrontendContext(filePath);
  if (!context) return false;

  // Skip if already injected recently
  if (wasRecentlyInjected(transcriptPath)) return false;

  return true;
}

function buildInjection(context, filePath, app) {
  const fileName = path.basename(filePath);

  const lines = [
    '',
    '## Frontend TypeScript Context Detected',
    '',
    `**Context:** ${context.name}`,
    `**File:** ${fileName}`,
    app ? `**App:** ${app}` : '',
    '',
    '### Required Reading',
    '',
    `Before implementing frontend TypeScript changes, you MUST read:`,
    '',
    `**\`${FRONTEND_GUIDE_PATH}\`**`,
    '',
    'This guide contains:',
    '- Component patterns (PlatformComponent, PlatformVmStore, AppBaseFormComponent)',
    '- State management (PlatformVmStore with signals)',
    '- API service patterns (extend PlatformApiService)',
    '- Form patterns with validation (PlatformFormComponent)',
    '- RxJS operators and subscription management (.untilDestroyed())',
    '- BEM class naming conventions for templates',
    '',
    '### Critical Rules',
    '',
    '1. **Components:** Extend `AppBaseComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent` - NEVER raw Component',
    '2. **State:** Use `PlatformVmStore` for state management - NEVER manual signals',
    '3. **API:** Extend `PlatformApiService` for HTTP calls - NEVER direct HttpClient',
    '4. **Subscriptions:** Always use `.pipe(this.untilDestroyed())` - NEVER manual unsubscribe',
    '5. **Templates:** All elements MUST have BEM classes (block__element --modifier)',
    ''
  ];

  // Add app-specific guidance
  if (app) {
    lines.push(
      '### App-Specific Notes',
      '',
      `Working in **${app}** app:`,
      ''
    );

    if (app === 'playground-text-snippet') {
      lines.push(
        '- Angular 19 standalone components with signals',
        '- Use `@use \'shared-mixin\'` for SCSS imports',
        '- Use CSS variables for theming',
        ''
      );
    }
  }

  // Filter out empty lines from middle
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

    // Detect context and app
    const context = detectFrontendContext(filePath);
    if (!context) process.exit(0);

    const app = detectApp(filePath);

    // Output the injection
    const injection = buildInjection(context, filePath, app);
    console.log(injection);

    process.exit(0);
  } catch (error) {
    // Non-blocking - just exit silently
    process.exit(0);
  }
}

main();
