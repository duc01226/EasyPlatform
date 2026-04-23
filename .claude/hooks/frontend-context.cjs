#!/usr/bin/env node
/**
 * Frontend Context Injector - PreToolUse Hook
 *
 * Automatically injects frontend development guide when editing
 * frontend files. File extensions and context group names are
 * configured via docs/project-config.json contextGroups[].
 *
 * Pattern Matching:
 *   Configured via docs/project-config.json contextGroups + modules
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const path = require("path");
const {
  parsePreToolUseInput,
  wasRecentlyInjected,
  werePatternRecentlyInjected,
  readAndInjectDoc,
} = require("./lib/context-injector-base.cjs");
const {
  loadProjectConfig,
  buildRegexMap,
  buildPatternList,
  getContextGroup,
  getModuleForPath,
  getLocalizationConfig,
  isMultilingualProject,
} = require("./lib/project-config-loader.cjs");

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION (loaded from docs/project-config.json)
// ═══════════════════════════════════════════════════════════════════════════

const {
  FRONTEND_CONTEXT: DEDUP_MARKER,
  DEDUP_LINES,
} = require("./lib/dedup-constants.cjs");

const config = loadProjectConfig();
const FRONTEND_PATTERNS = buildPatternList(config.frontendApps?.patterns);
const APP_PATTERNS = buildRegexMap(config.frontendApps?.appMap);
const LEGACY_APPS = new Set(config.frontendApps?.legacyApps || []);
const MODERN_APPS = new Set(config.frontendApps?.modernApps || []);
const LOCALIZATION_CONFIG = getLocalizationConfig(config);

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// Frontend file extensions — explicit allowlist (not config-driven to avoid ripple to code-patterns-injector)
const FRONTEND_EXTENSIONS = new Set([
  ".html",
  ".js",
  ".ts",
  ".tsx",
  ".css",
  ".scss",
  ".json",
]);

function isFrontendFile(filePath) {
  if (!filePath) return false;
  return FRONTEND_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function detectFrontendContext(filePath) {
  if (!filePath) return null;

  // v2: try contextGroups first
  const group = getContextGroup(filePath);
  if (group) return { name: group.name, patterns: [] };

  // v1 fallback: try pattern-based detection
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

  // v2: try modules[] first
  const mod = getModuleForPath(filePath);
  if (mod && (mod.kind === "frontend-app" || mod.kind === "library"))
    return mod.name;

  // v1 fallback: try appMap
  const normalizedPath = filePath.replace(/\\/g, "/");
  for (const [appName, pattern] of Object.entries(APP_PATTERNS)) {
    if (pattern.test(normalizedPath)) {
      return appName;
    }
  }

  return null;
}

function shouldInject(filePath, transcriptPath) {
  // Skip non-frontend files
  if (!isFrontendFile(filePath)) return false;

  // Skip if no frontend context detected
  const context = detectFrontendContext(filePath);
  if (!context) return false;

  // Skip if already injected recently
  if (
    wasRecentlyInjected(
      transcriptPath,
      DEDUP_MARKER,
      DEDUP_LINES.FRONTEND_CONTEXT,
    )
  )
    return false;

  return true;
}

function shouldShowI18nSyncCheck(filePath) {
  if (!isMultilingualProject(config)) return false;
  if (!isFrontendFile(filePath)) return false;

  const normalizedPath = (filePath || "").replace(/\\/g, "/");
  const uiPathPatterns = LOCALIZATION_CONFIG.uiPathPatterns || [];
  if (uiPathPatterns.length === 0) return true;
  return uiPathPatterns.some((pattern) => pattern.test(normalizedPath));
}

function appendI18nSyncSection(lines) {
  lines.push(
    "### I18N Sync Check",
    "",
    "- Multilingual project detected from `localization.supportedLocales`.",
    "- If user-visible text, labels, or messages changed, verify translation resources were updated for all locales.",
  );

  if (LOCALIZATION_CONFIG.translationFilePatterns.length > 0) {
    lines.push("- Translation file patterns:");
    for (const pattern of LOCALIZATION_CONFIG.translationFilePatterns) {
      lines.push(`  - \`${pattern.source}\``);
    }
  } else {
    lines.push(
      "- No `localization.translationFilePatterns` configured. Add patterns in `docs/project-config.json` to reduce false positives."
    );
  }

  lines.push(
    "- If translations are missing, stop and decide explicitly before proceeding.",
    ""
  );
}

function buildInjection(context, filePath, app, patternsAlreadyInjected) {
  const fileName = path.basename(filePath);
  const ctxGroup = getContextGroup(filePath);
  const guideDoc = ctxGroup?.guideDoc || null;
  const patternsDoc =
    ctxGroup?.patternsDoc ||
    "docs/project-reference/frontend-patterns-reference.md";
  const stylingDoc = ctxGroup?.stylingDoc || null;
  const designSystemDoc = ctxGroup?.designSystemDoc || null;

  const lines = [
    "",
    DEDUP_MARKER,
    "",
    `**Context:** ${context.name}`,
    `**File:** ${fileName}`,
    app ? `**App:** ${app}` : "",
    "",
  ];

  if (!patternsAlreadyInjected) {
    // Inject guideDoc content directly (if configured)
    if (guideDoc) {
      const guideContent = readAndInjectDoc(guideDoc);
      if (guideContent) lines.push(guideContent);
    }
    // Inject patterns doc content directly
    const patternsContent = readAndInjectDoc(patternsDoc);
    if (patternsContent) lines.push(patternsContent);

    // Inject styling and design system docs if configured
    if (stylingDoc) {
      const stylingContent = readAndInjectDoc(stylingDoc);
      if (stylingContent) lines.push(stylingContent);
    }
    if (designSystemDoc) {
      const dsContent = readAndInjectDoc(designSystemDoc);
      if (dsContent) lines.push(dsContent);
    }
  }
  const rules = ctxGroup?.rules || [];

  if (rules.length > 0) {
    lines.push(
      "### Critical Rules",
      "",
      `Refer to \`${patternsDoc}\` for class names and detailed examples.`,
      "",
    );
    rules.forEach((rule, i) => {
      lines.push(`${i + 1}. ${rule}`);
    });
    lines.push("");
  }

  if (shouldShowI18nSyncCheck(filePath)) {
    appendI18nSyncSection(lines);
  }

  // Inject domain entities doc directly
  const entitiesContent = readAndInjectDoc(
    "docs/project-reference/domain-entities-reference.md",
  );
  if (entitiesContent) {
    lines.push(entitiesContent);
  } else {
    lines.push(
      `**Domain Entities:** Read \`docs/project-reference/domain-entities-reference.md\` for entity catalog, relationships, and cross-service sync map.`,
      "",
    );
  }

  // App-specific guidance: v2 modules first, v1 fallback
  const mod = getModuleForPath(filePath);
  const appName = mod?.name || app;
  if (appName) {
    lines.push(
      "### App-Specific Notes",
      "",
      `Working in **${appName}** app:`,
      "",
    );

    // v2: check module.meta.generation; v1 fallback: MODERN_APPS/LEGACY_APPS sets
    const generation =
      mod?.meta?.generation ||
      (MODERN_APPS.has(appName)
        ? "modern"
        : LEGACY_APPS.has(appName)
          ? "legacy"
          : null);

    if (generation === "modern") {
      lines.push(
        "- Modern standalone components with signals",
        "- Use `@use 'shared-mixin'` for SCSS imports",
        "- Use CSS variables for theming",
        "",
      );
    } else if (generation === "legacy") {
      lines.push(
        "- **Legacy app** with NgModules (not standalone)",
        "- Use `@import '~assets/scss/variables'` for SCSS",
        "",
        `Read \`${patternsDoc}\` for:`,
        "- Component hierarchy and base class constructor signatures",
        "- API call patterns (effectSimple, observerLoadingErrorState)",
        "- Subscription management (untilDestroyed)",
        "",
      );
    }
  }

  // Filter out empty lines from middle
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
    const patternsAlreadyInjected = werePatternRecentlyInjected(transcriptPath);
    console.log(
      buildInjection(context, filePath, app, patternsAlreadyInjected),
    );
    process.exit(0);
  } catch (error) {
    process.exit(0);
  }
}

main();
