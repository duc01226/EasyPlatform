#!/usr/bin/env node
/**
 * Design System Context Injector - PreToolUse Hook
 *
 * Automatically injects design system documentation guidance when editing
 * frontend files. Uses file path patterns to select the appropriate guide.
 *
 * Pattern Matching:
 *   Reads designSystem.appMappings from docs/project-config.json for app detection.
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const path = require("path");
const {
  loadProjectConfig,
  buildPatternList,
} = require("./lib/project-config-loader.cjs");
const { DEDUP_LINES } = require("./lib/dedup-constants.cjs");
const {
  parsePreToolUseInput,
  wasRecentlyInjected,
  readAndInjectDoc,
} = require("./lib/context-injector-base.cjs");

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION (loaded from docs/project-config.json)
// ═══════════════════════════════════════════════════════════════════════════

const config = loadProjectConfig();
const DESIGN_SYSTEM_DOCS_PATH =
  config.designSystem?.docsPath || "docs/project-reference/design-system";
const APP_PATTERNS = buildPatternList(config.designSystem?.appMappings);
const CANONICAL_DOC = config.designSystem?.canonicalDoc;
const TOKEN_FILES = config.designSystem?.tokenFiles || [];

// File extensions that indicate frontend files
const FRONTEND_EXTENSIONS = [
  ".html",
  ".htm",
  ".scss",
  ".css",
  ".less",
  ".sass",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".vue",
  ".svelte",
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function isFrontendFile(filePath) {
  if (!filePath) return false;
  const ext = path.extname(filePath).toLowerCase();
  return FRONTEND_EXTENSIONS.includes(ext);
}

function detectAppFromPath(filePath) {
  if (!filePath) return null;

  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, "/");

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
  if (
    wasRecentlyInjected(
      transcriptPath,
      `**Detected App:** ${app.name}`,
      DEDUP_LINES.DESIGN_SYSTEM,
    )
  )
    return false;

  return true;
}

function buildInjection(app, filePath) {
  const docPath = `${DESIGN_SYSTEM_DOCS_PATH}/${app.docFile}`;
  const indexPath = `${DESIGN_SYSTEM_DOCS_PATH}/README.md`;

  const lines = [
    "",
    "## Design System Context",
    "",
    `**Detected App:** ${app.name}`,
    `**File:** ${path.basename(filePath)}`,
    "",
  ];

  // Inject primary design system doc directly (per-app inventory)
  const primaryContent = readAndInjectDoc(docPath);
  if (primaryContent) {
    lines.push(primaryContent);
  }
  // Inject index doc directly
  const indexContent = readAndInjectDoc(indexPath);
  if (indexContent) {
    lines.push(indexContent);
  }
  // Inject canonical/target doc — single source of truth for new code
  let canonicalContent = null;
  if (CANONICAL_DOC) {
    canonicalContent = readAndInjectDoc(
      `${DESIGN_SYSTEM_DOCS_PATH}/${CANONICAL_DOC}`,
    );
    if (canonicalContent) lines.push(canonicalContent);
  }
  // Inject drop-in token files (SCSS/CSS) so AI uses real var names, not guesses
  for (const tf of TOKEN_FILES) {
    const tokenContent = readAndInjectDoc(`${DESIGN_SYSTEM_DOCS_PATH}/${tf}`);
    if (tokenContent) lines.push(tokenContent);
  }
  // Fallback if no design-system content was found
  if (!primaryContent && !indexContent && !canonicalContent) {
    lines.push(
      `### ⚠️ Design system docs not found at \`${DESIGN_SYSTEM_DOCS_PATH}\` (checked per-app, README, canonical)`,
      "",
    );
  }

  lines.push("### Quick Reference", "");

  // Add app-specific quick tips from config (quickTips array in designSystem.appMappings)
  const quickTips = app.quickTips || [];
  for (const tip of quickTips) {
    lines.push(`- ${tip}`);
  }

  // Add modern UI note from config if present
  const modernNote = config.designSystem?.modernUiNote;
  if (modernNote) {
    lines.push("", "### Modern UI Note", "", modernNote, "");
  }

  return lines.join("\n");
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

    const app = detectAppFromPath(filePath);
    if (!app) process.exit(0);

    console.log(buildInjection(app, filePath));
    process.exit(0);
  } catch (error) {
    process.exit(0);
  }
}

main();
