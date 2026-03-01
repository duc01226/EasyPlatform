#!/usr/bin/env node
/**
 * SCSS Styling Context Injector - PreToolUse Hook
 *
 * Automatically injects SCSS styling guide when editing .scss/.css files
 * in frontend applications. Complements design-system-context.cjs which
 * handles app-specific design tokens.
 *
 * Pattern Matching:
 *   Reads scss.patterns from docs/project-config.json for app detection.
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

const SCSS_GUIDE_PATH = 'docs/claude/scss-styling-guide.md';

const config = loadProjectConfig();
const FRONTEND_PATTERNS = buildPatternList(config.scss?.patterns);
const APP_PATTERNS = buildRegexMap(config.scss?.appMap);

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
    '### ⚠️ IMPORTANT — MUST READ',
    '',
    `Before implementing SCSS/CSS changes, you **⚠️ MUST READ** the following file:`,
    '',
    `**\`${SCSS_GUIDE_PATH}\`**`,
    '',
    'This guide contains:',
    '- BEM naming conventions (block__element --modifier)',
    '- SCSS architecture patterns and file organization',
    '- Mixin usage and import patterns',
    '- CSS variable conventions for theming',
    '- Responsive design patterns and breakpoints',
    '- Component-scoped styling best practices',
    '',
    '### Critical Rules',
    '',
    '1. **BEM Classes:** Use `block__element` with separate `--modifier` class',
    '2. **No Magic Numbers:** Use variables for colors, spacing, breakpoints',
    '3. **Nesting:** Max 3 levels deep, avoid over-specificity',
    '4. **Component Scope:** Styles scoped to component block class',
    ''
  ];

  // Add context-specific SCSS examples from config (scssExamples array)
  const scssExamples = context.scssExamples || [];
  if (scssExamples.length > 0) {
    lines.push(
      `### ${context.name} SCSS Patterns`,
      '',
      '```scss',
      ...scssExamples,
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
