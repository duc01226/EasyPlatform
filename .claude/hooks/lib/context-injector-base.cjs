"use strict";
/**
 * Shared base for PreToolUse context injector hooks.
 *
 * Extracts common boilerplate: stdin parsing, tool_name check, file path
 * extraction, knowledge path skip, and dedup check. Each hook provides
 * domain-specific logic via the buildContext callback.
 *
 * Consumers: frontend-context, backend-context, design-system-context,
 *            scss-styling-context, knowledge-context
 */

const fs = require("fs");
const { isKnowledgePath } = require("./project-config-loader.cjs");
const {
  CODE_PATTERNS: SHARED_PATTERN_MARKER,
  DEDUP_LINES,
} = require("./dedup-constants.cjs");

/**
 * Check if a marker was recently injected in the transcript.
 * @param {string} transcriptPath
 * @param {string} marker - Dedup marker string
 * @param {number} lines - Number of trailing lines to check
 * @returns {boolean}
 */
function wasRecentlyInjected(transcriptPath, marker, lines) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
    const transcript = fs.readFileSync(transcriptPath, "utf-8");
    return transcript.split("\n").slice(-lines).join("\n").includes(marker);
  } catch {
    return false;
  }
}

/**
 * Check if code patterns were recently injected (shared across frontend/backend).
 * @param {string} transcriptPath
 * @returns {boolean}
 */
function werePatternRecentlyInjected(transcriptPath) {
  return wasRecentlyInjected(
    transcriptPath,
    SHARED_PATTERN_MARKER,
    DEDUP_LINES.CODE_PATTERNS,
  );
}

/**
 * Parse PreToolUse stdin and extract common fields.
 * Returns null if the hook should exit (wrong tool, no file path, etc.)
 * @param {object} [options]
 * @param {boolean} [options.skipKnowledgeCheck=false] - Skip isKnowledgePath check (for knowledge-context itself)
 * @returns {{ filePath: string, transcriptPath: string, payload: object } | null}
 */
function parsePreToolUseInput(options = {}) {
  const stdin = fs.readFileSync(0, "utf-8").trim();
  if (!stdin) return null;

  const payload = JSON.parse(stdin);
  const toolName = payload.tool_name || "";
  const toolInput = payload.tool_input || {};
  const transcriptPath = payload.transcript_path || "";

  if (!["Edit", "Write", "MultiEdit"].includes(toolName)) return null;

  const filePath = toolInput.file_path || toolInput.filePath || "";
  if (!filePath) return null;

  if (!options.skipKnowledgeCheck && isKnowledgePath(filePath)) return null;

  return { filePath, transcriptPath, payload };
}

/**
 * Read a project doc file and return formatted injection block with header marker.
 * AI sees the header and knows the content is already loaded — no need to Read the file again.
 *
 * @param {string} docPath - Relative path from project root (e.g. 'docs/project-reference/backend-patterns-reference.md')
 * @param {object} [options]
 * @param {string} [options.projectDir] - Project root directory (defaults to CLAUDE_PROJECT_DIR or cwd)
 * @returns {string|null} Formatted injection block, or null if file not found
 */
function readAndInjectDoc(docPath, options = {}) {
  const projectDir =
    options.projectDir || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const fullPath = require("path").resolve(projectDir, docPath);
  try {
    if (!fs.existsSync(fullPath)) return null;
    const content = fs.readFileSync(fullPath, "utf-8");
    if (!content.trim()) return null;
    return [
      ``,
      `## [Injected: ${docPath}]`,
      `> Content auto-injected by hook. Do NOT re-read this file — it is already loaded below.`,
      ``,
      content,
      ``,
      `## [End: ${docPath}]`,
      ``,
    ].join("\n");
  } catch {
    return null;
  }
}

module.exports = {
  parsePreToolUseInput,
  wasRecentlyInjected,
  werePatternRecentlyInjected,
  readAndInjectDoc,
};
