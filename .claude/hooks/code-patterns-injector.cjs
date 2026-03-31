#!/usr/bin/env node
/**
 * Code Patterns Injector - Edit/Write Hook
 *
 * Injects project code patterns on-demand when editing code files:
 *   - Backend files in configured backend service paths
 *   - Frontend files in configured frontend app paths
 *   - E2E test files in configured e2eTesting paths (or fallback globs)
 * File extensions configured via docs/project-config.json contextGroups[].
 *
 * Dedup: Checks transcript for "## Code Patterns" / "## E2E Testing Context Detected"
 * markers in last 300/400 lines. After context compaction, re-injects on next trigger.
 *
 * Configuration (.ck.json):
 *   codePatterns.enabled - Enable/disable injection (default: true)
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */
"use strict";

const fs = require("fs");
const path = require("path");
const {
  loadProjectConfig,
  isKnowledgePath,
} = require("./lib/project-config-loader.cjs");
const { readAndInjectDoc } = require("./lib/context-injector-base.cjs");

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION (loaded from docs/project-config.json)
// ═══════════════════════════════════════════════════════════════════════════

const {
  CODE_PATTERNS: DEDUP_MARKER,
  E2E_CONTEXT: E2E_DEDUP_MARKER,
  DEDUP_LINES,
} = require("./lib/dedup-constants.cjs");
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const BACKEND_PATTERNS = path.resolve(
  PROJECT_DIR,
  "docs/project-reference/backend-patterns-reference.md",
);
const FRONTEND_PATTERNS = path.resolve(
  PROJECT_DIR,
  "docs/project-reference/frontend-patterns-reference.md",
);

const config = loadProjectConfig();
const e2eConfig = config.e2eTesting || {};

// v2: use contextGroups for regex building, with v1 fallback
const FRONTEND_REGEX = (() => {
  try {
    // v2: find contextGroup matching frontend extensions
    const groups = config.contextGroups || [];
    const frontendGroup = groups.find((g) => g.fileExtensions?.includes(".ts"));
    if (frontendGroup?.pathRegexes?.length) {
      return new RegExp(`(${frontendGroup.pathRegexes.join("|")})`, "i");
    }
    // v1 fallback
    const regex = config.frontendApps?.frontendRegex;
    if (regex) return new RegExp(regex, "i");
  } catch {
    /* invalid regex in config — use fallback */
  }
  return /(?:src[\\/])|(?:libs[\\/])/i;
})();

const BACKEND_REGEX = (() => {
  try {
    // v2: find contextGroup matching backend extensions
    const groups = config.contextGroups || [];
    const backendGroup = groups.find((g) => g.fileExtensions?.includes(".cs"));
    if (backendGroup?.pathRegexes?.length) {
      return new RegExp(`(${backendGroup.pathRegexes.join("|")})`, "i");
    }
    // v1 fallback
    const patterns = config.backendServices?.patterns;
    if (patterns && Array.isArray(patterns) && patterns.length > 0) {
      const regexParts = patterns.map((p) => p.pathRegex).filter(Boolean);
      if (regexParts.length > 0) {
        return new RegExp(`(${regexParts.join("|")})`, "i");
      }
    }
  } catch {
    /* invalid regex in config — use fallback */
  }
  return /src[\\/]/i;
})();

// Extension sets from contextGroups (config-driven)
const groups = config.contextGroups || [];
const BACKEND_EXTS = new Set(
  groups.find((g) => g.fileExtensions?.includes(".cs"))?.fileExtensions || [
    ".cs",
  ],
);
const FRONTEND_EXTS = new Set(
  groups.find((g) => g.fileExtensions?.includes(".ts"))?.fileExtensions || [
    ".ts",
    ".tsx",
    ".html",
  ],
);

// E2E config-driven path patterns + fallback globs
const E2E_CODE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".cs",
  ".feature",
]);
const E2E_PATH_PATTERNS = (() => {
  const patterns = [];
  if (e2eConfig.testsPath)
    patterns.push(e2eConfig.testsPath.replace(/\\/g, "/"));
  if (e2eConfig.pageObjectsPath)
    patterns.push(e2eConfig.pageObjectsPath.replace(/\\/g, "/"));
  if (e2eConfig.fixturesPath)
    patterns.push(e2eConfig.fixturesPath.replace(/\\/g, "/"));
  if (e2eConfig.platformProject)
    patterns.push(e2eConfig.platformProject.replace(/\\/g, "/"));
  if (e2eConfig.sharedProject)
    patterns.push(e2eConfig.sharedProject.replace(/\\/g, "/"));
  if (e2eConfig.bddProject)
    patterns.push(e2eConfig.bddProject.replace(/\\/g, "/"));
  if (e2eConfig.nonBddProject)
    patterns.push(e2eConfig.nonBddProject.replace(/\\/g, "/"));
  if (e2eConfig.entryPoints) {
    e2eConfig.entryPoints.forEach((ep) => {
      const dir = path.dirname(ep).replace(/\\/g, "/");
      if (!patterns.includes(dir)) patterns.push(dir);
    });
  }
  return patterns;
})();
// Fallback: match common test directory names when no config paths matched
const E2E_FALLBACK_RE = /[\\/](automation|e2e|spec|playwright|cypress)[\\/]/i;
const E2E_FILE_RE = /\.(spec|test|cy|e2e)\./i;
const E2E_REFERENCE_DOC = e2eConfig.guideDoc
  ? path.resolve(PROJECT_DIR, e2eConfig.guideDoc)
  : path.resolve(PROJECT_DIR, "docs/project-reference/e2e-test-reference.md");

// ═══════════════════════════════════════════════════════════════════════════
// DOMAIN DETECTION
// ═══════════════════════════════════════════════════════════════════════════

function shouldInjectForFile(filePath) {
  if (!filePath) return { backend: false, frontend: false, e2e: false };
  const ext = path.extname(filePath).toLowerCase();
  const normalized = filePath.replace(/\\/g, "/");

  return {
    backend: BACKEND_EXTS.has(ext) && BACKEND_REGEX.test(normalized),
    frontend: FRONTEND_EXTS.has(ext) && FRONTEND_REGEX.test(normalized),
    e2e: isE2EFile(normalized, ext),
  };
}

function isE2EFile(normalized, ext) {
  // Must be a code/feature file
  if (!E2E_CODE_EXTS.has(ext) && !E2E_FILE_RE.test(normalized)) return false;

  // Config-driven: check configured project paths
  if (E2E_PATH_PATTERNS.length > 0) {
    if (
      E2E_PATH_PATTERNS.some((p) =>
        normalized.toLowerCase().includes(p.toLowerCase()),
      )
    )
      return true;
  }

  // Fallback: common test directory patterns
  if (E2E_FALLBACK_RE.test(normalized)) return true;

  // Fallback: file name patterns (*.spec.ts, *.e2e.ts, etc.)
  if (E2E_FILE_RE.test(normalized) && /[\\/]test/i.test(normalized))
    return true;

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEDUP
// ═══════════════════════════════════════════════════════════════════════════

function wasRecentlyInjected(transcriptPath, marker, lines) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
    const transcript = fs.readFileSync(transcriptPath, "utf-8");
    const recentLines = transcript.split("\n").slice(-lines).join("\n");
    return recentLines.includes(marker);
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PATTERN READING (backend/frontend)
// ═══════════════════════════════════════════════════════════════════════════

function readPatternFiles(injectBackend, injectFrontend) {
  const parts = [];
  if (injectBackend) {
    const content = readAndInjectDoc(
      "docs/project-reference/backend-patterns-reference.md",
    );
    if (content) parts.push(content);
  }
  if (injectFrontend) {
    const content = readAndInjectDoc(
      "docs/project-reference/frontend-patterns-reference.md",
    );
    if (content) parts.push(content);
  }
  return parts.length > 0 ? parts.join("\n\n---\n\n") : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// E2E CONTEXT BUILDING
// ═══════════════════════════════════════════════════════════════════════════

function buildE2EContext() {
  const parts = [];
  parts.push(E2E_DEDUP_MARKER);
  parts.push("");

  // Config summary
  parts.push("**E2E Testing Configuration:**");
  parts.push(`- Framework: ${e2eConfig.framework || "auto-detect"}`);
  parts.push(`- Language: ${e2eConfig.language || "auto-detect"}`);
  parts.push(
    `- BDD Project: ${e2eConfig.bddProject || e2eConfig.testsPath || "testing/e2e/"}`,
  );
  parts.push(
    `- TC Code Format: ${e2eConfig.tcCodeFormat || "TC-{MODULE}-E2E-{NNN}"}`,
  );
  parts.push("");

  // Best practices
  if (e2eConfig.bestPractices && e2eConfig.bestPractices.length > 0) {
    parts.push("**Best Practices (MUST FOLLOW):**");
    e2eConfig.bestPractices.forEach((practice, i) => {
      parts.push(`${i + 1}. ${practice}`);
    });
    parts.push("");
  }

  // Run commands
  if (e2eConfig.runCommands) {
    parts.push("**Run Commands:**");
    Object.entries(e2eConfig.runCommands).forEach(([key, cmd]) => {
      parts.push(`- ${key}: \`${cmd}\``);
    });
    parts.push("");
  }

  // Read and include first 200 lines of reference doc
  if (fs.existsSync(E2E_REFERENCE_DOC)) {
    try {
      const content = fs.readFileSync(E2E_REFERENCE_DOC, "utf-8");
      parts.push("**Project E2E Reference:**");
      parts.push("```markdown");
      parts.push(content);
      parts.push("```");
      parts.push("");
    } catch {
      // Skip if can't read
    }
  }

  // Reminder
  parts.push(`> **CRITICAL:** Every E2E test MUST have TC code in test name.`);

  return parts.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
  try {
    const stdin = fs.readFileSync(0, "utf-8").trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);

    // Only handle Edit/Write/MultiEdit
    if (!["Edit", "Write", "MultiEdit"].includes(payload.tool_name))
      process.exit(0);

    // Load .ck.json config
    let ckConfig = {};
    try {
      const { loadConfig } = require("./lib/ck-config-utils.cjs");
      ckConfig = (loadConfig() || {}).codePatterns || {};
    } catch {
      /* use defaults */
    }

    // Early exit if disabled
    if (ckConfig.enabled === false) process.exit(0);

    // Determine domain from file path (MultiEdit uses { edits: [{ file_path }] })
    const filePath =
      payload.tool_input?.file_path ||
      payload.tool_input?.filePath ||
      payload.tool_input?.edits?.[0]?.file_path ||
      "";

    // Skip knowledge workspace files (handled by knowledge-context.cjs)
    if (isKnowledgePath(filePath)) process.exit(0);

    const { backend, frontend, e2e } = shouldInjectForFile(filePath);

    // E2E domain — separate dedup and output
    if (e2e) {
      if (
        !wasRecentlyInjected(
          payload.transcript_path || "",
          E2E_DEDUP_MARKER,
          DEDUP_LINES.E2E_CONTEXT,
        )
      ) {
        const e2eContent = buildE2EContext();
        if (e2eContent) console.log(e2eContent);
      }
      // E2E files don't also inject backend/frontend patterns
      process.exit(0);
    }

    // Backend/frontend domain
    if (!backend && !frontend) process.exit(0);

    // Check dedup for code patterns
    if (
      wasRecentlyInjected(
        payload.transcript_path || "",
        DEDUP_MARKER,
        DEDUP_LINES.CODE_PATTERNS,
      )
    )
      process.exit(0);

    // Read and output patterns
    const content = readPatternFiles(backend, frontend);
    if (content) console.log(content);

    process.exit(0);
  } catch {
    process.exit(0); // Non-blocking
  }
}

main();
