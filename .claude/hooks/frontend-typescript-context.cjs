#!/usr/bin/env node
/**
 * Frontend TypeScript Context Injector - PreToolUse Hook
 *
 * Automatically injects frontend TypeScript development guide when editing
 * .ts files in frontend applications. Uses file path patterns to detect
 * frontend TypeScript files.
 *
 * Pattern Matching:
 *   Configured via docs/project-config.json frontendApps.patterns
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const path = require('path');
const { loadProjectConfig, buildRegexMap, buildPatternList } = require('./lib/project-config-loader.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION (loaded from docs/project-config.json)
// ═══════════════════════════════════════════════════════════════════════════

const FRONTEND_GUIDE_PATH = 'docs/claude/frontend-typescript-complete-guide.md';
const { CODE_PATTERNS: SHARED_PATTERN_MARKER } = require('./lib/dedup-constants.cjs');

const config = loadProjectConfig();
const FRONTEND_PATTERNS = buildPatternList(config.frontendApps?.patterns);
const APP_PATTERNS = buildRegexMap(config.frontendApps?.appMap);
const LEGACY_APPS = new Set(config.frontendApps?.legacyApps || []);
const MODERN_APPS = new Set(config.frontendApps?.modernApps || []);

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

function werePatternRecentlyInjected(transcriptPath) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
    const transcript = fs.readFileSync(transcriptPath, 'utf-8');
    const recentLines = transcript.split('\n').slice(-300).join('\n');
    return recentLines.includes(SHARED_PATTERN_MARKER);
  } catch {
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

function buildInjection(context, filePath, app, patternsAlreadyInjected) {
  const fileName = path.basename(filePath);
  const frontendDoc = config.framework?.frontendPatternsDoc || 'docs/frontend-patterns-reference.md';

  const lines = [
    '',
    '## Frontend TypeScript Context Detected',
    '',
    `**Context:** ${context.name}`,
    `**File:** ${fileName}`,
    app ? `**App:** ${app}` : '',
    ''
  ];

  if (!patternsAlreadyInjected) {
    lines.push(
      '### IMPORTANT — MUST READ',
      '',
      `Before implementing frontend TypeScript changes, you **MUST READ** the following file:`,
      '',
      `**\`${FRONTEND_GUIDE_PATH}\`**`,
      '',
      `Also review **\`${frontendDoc}\`** for project-specific patterns covering:`,
      '- Component hierarchy and base classes',
      '- State management patterns',
      '- API service patterns',
      '- Form patterns with validation',
      '- RxJS operators and subscription management',
      '- BEM class naming conventions for templates',
      ''
    );
  }

  lines.push(
    '### Critical Rules',
    '',
    `Refer to \`${frontendDoc}\` for class names and detailed examples.`,
    '',
    '1. **Components:** Extend project base component classes - NEVER raw Component',
    '2. **State:** Use project store base for state management - NEVER manual signals',
    '3. **API:** Extend project API service base for HTTP calls - NEVER direct HttpClient',
    '4. **Subscriptions:** Always use `.pipe(this.untilDestroyed())` - NEVER manual unsubscribe',
    '5. **Templates:** All elements MUST have BEM classes (block__element --modifier)',
    ''
  );

  // Add app-specific guidance
  if (app) {
    lines.push(
      '### App-Specific Notes',
      '',
      `Working in **${app}** app:`,
      ''
    );

    if (MODERN_APPS.has(app)) {
      lines.push(
        '- Modern standalone components with signals',
        '- Use `@use \'shared-mixin\'` for SCSS imports',
        '- Use CSS variables for theming',
        ''
      );
    } else if (LEGACY_APPS.has(app)) {
      lines.push(
        '- **Legacy app** with NgModules (not standalone)',
        '- Use `@import \'~assets/scss/variables\'` for SCSS',
        '',
        `Read \`${frontendDoc}\` for:`,
        '- Component hierarchy and base class constructor signatures',
        '- API call patterns (effectSimple, observerLoadingErrorState)',
        '- Subscription management (untilDestroyed)',
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
    const patternsAlreadyInjected = werePatternRecentlyInjected(transcriptPath);

    // Output the injection
    const injection = buildInjection(context, filePath, app, patternsAlreadyInjected);
    console.log(injection);

    process.exit(0);
  } catch (error) {
    // Non-blocking - just exit silently
    process.exit(0);
  }
}

main();
