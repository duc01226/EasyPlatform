#!/usr/bin/env node
/**
 * Styling Context Injector - PreToolUse Hook
 *
 * Automatically injects styling guide when editing style files
 * in frontend applications. File extensions configured via
 * docs/project-config.json styling.fileExtensions.
 * Complements design-system-context.cjs which handles app-specific
 * design tokens.
 *
 * Pattern Matching:
 *   Reads styling.patterns from docs/project-config.json for app detection.
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const path = require("path");
const {
  buildRegexMap,
  buildPatternList,
  resolveSection,
} = require("./lib/project-config-loader.cjs");
const {
  parsePreToolUseInput,
  wasRecentlyInjected,
  readAndInjectDoc,
} = require("./lib/context-injector-base.cjs");

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION (loaded from docs/project-config.json)
// ═══════════════════════════════════════════════════════════════════════════

const {
  STYLING_CONTEXT: DEDUP_MARKER,
  DEDUP_LINES,
} = require("./lib/dedup-constants.cjs");

// v2: try 'styling' first, fallback to 'scss'
const stylingSection = resolveSection("styling", "scss") || {};
const STYLE_GUIDE_PATH = stylingSection.guideDoc || null;
const STYLE_EXTENSIONS = new Set(
  stylingSection.fileExtensions || [".css", ".sass", ".scss", ".json"],
);
const FRONTEND_PATTERNS = buildPatternList(stylingSection.patterns);
const APP_PATTERNS = buildRegexMap(stylingSection.appMap);

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function isStyleFile(filePath) {
  if (!filePath) return false;
  return STYLE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function detectFrontendContext(filePath) {
  if (!filePath) return null;

  const normalizedPath = filePath.replace(/\\/g, "/");

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

  const normalizedPath = filePath.replace(/\\/g, "/");

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
  if (
    wasRecentlyInjected(
      transcriptPath,
      DEDUP_MARKER,
      DEDUP_LINES.STYLING_CONTEXT,
    )
  )
    return false;
  return true;
}

function buildInjection(context, filePath, app) {
  const fileName = path.basename(filePath);

  const lines = [
    "",
    DEDUP_MARKER,
    "",
    `**Context:** ${context.name}`,
    `**File:** ${fileName}`,
    app ? `**App:** ${app}` : "",
    "",
  ];

  if (STYLE_GUIDE_PATH) {
    // Inject styling guide content directly
    const styleContent = readAndInjectDoc(STYLE_GUIDE_PATH);
    if (styleContent) {
      lines.push(styleContent);
    } else {
      lines.push(
        `### ⚠️ IMPORTANT — Style guide not found at \`${STYLE_GUIDE_PATH}\``,
        "",
      );
    }
  }

  lines.push(
    "### Critical Rules",
    "",
    "1. **BEM Classes:** Use `block__element` with separate `--modifier` class",
    "2. **No Magic Numbers:** Use variables for colors, spacing, breakpoints",
    "3. **Nesting:** Max 3 levels deep, avoid over-specificity",
    "4. **Component Scope:** Styles scoped to component block class",
    "",
  );

  // Add context-specific styling examples from config (v2: examples, v1: scssExamples)
  const styleExamples = context.examples || context.scssExamples || [];
  if (styleExamples.length > 0) {
    lines.push(
      `### ${context.name} Styling Patterns`,
      "",
      "```scss",
      ...styleExamples,
      "```",
      "",
    );
  }

  // Filter consecutive empty lines
  return lines
    .filter((line, i, arr) => {
      if (line === "" && arr[i - 1] === "") return false;
      return true;
    })
    .join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    const input = parsePreToolUseInput();
    if (!input) process.exit(0);
    const { filePath, transcriptPath } = input;

    if (!shouldInject(filePath, transcriptPath)) process.exit(0);

    const context = detectFrontendContext(filePath);
    if (!context) process.exit(0);

    const app = detectApp(filePath);
    console.log(buildInjection(context, filePath, app));
    process.exit(0);
  } catch (error) {
    process.exit(0);
  }
}

main();
