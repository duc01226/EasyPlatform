/**
 * Path Utilities
 *
 * Path sanitization, normalization, and validation utilities.
 * Handles cross-platform path safety concerns.
 *
 * @module ck-path-utils
 */

'use strict';

const path = require('path');

/**
 * Characters invalid in filenames across Windows, macOS, Linux
 * Windows: < > : " / \ | ? *
 * macOS/Linux: / and null byte
 * Also includes control characters and other problematic chars
 */
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f\x7f]/g;

/**
 * Sanitize slug for safe filesystem usage
 * - Removes invalid filename characters
 * - Replaces non-alphanumeric (except hyphen) with hyphen
 * - Collapses multiple hyphens
 * - Removes leading/trailing hyphens
 * - Limits length to prevent filesystem issues
 *
 * @param {string} slug - Slug to sanitize
 * @returns {string} Sanitized slug (empty string if nothing valid remains)
 */
function sanitizeSlug(slug) {
  if (!slug || typeof slug !== 'string') return '';

  let sanitized = slug
    // Remove invalid filename chars first
    .replace(INVALID_FILENAME_CHARS, '')
    // Replace any non-alphanumeric (except hyphen) with hyphen
    .replace(/[^a-z0-9-]/gi, '-')
    // Collapse multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length (most filesystems support 255, but keep reasonable)
    .slice(0, 100);

  return sanitized;
}

/**
 * Normalize path value (trim, remove trailing slashes, handle empty)
 * @param {string} pathValue - Path to normalize
 * @returns {string|null} Normalized path or null if invalid
 */
function normalizePath(pathValue) {
  if (!pathValue || typeof pathValue !== 'string') return null;

  // Trim whitespace
  let normalized = pathValue.trim();

  // Empty after trim = invalid
  if (!normalized) return null;

  // Remove trailing slashes (but keep root "/" or "C:\")
  normalized = normalized.replace(/[/\\]+$/, '');

  // If it became empty (was just slashes), return null
  if (!normalized) return null;

  return normalized;
}

/**
 * Check if path is absolute
 * @param {string} pathValue - Path to check
 * @returns {boolean} True if absolute path
 */
function isAbsolutePath(pathValue) {
  if (!pathValue) return false;
  // Unix absolute: starts with /
  // Windows absolute: starts with drive letter (C:\) or UNC (\\)
  return path.isAbsolute(pathValue);
}

/**
 * Sanitize path values
 * - Normalizes path (trim, remove trailing slashes)
 * - Allows absolute paths (for consolidated plans use case)
 * - Prevents obvious security issues (null bytes, etc.)
 *
 * @param {string} pathValue - Path to sanitize
 * @param {string} projectRoot - Project root for relative path resolution
 * @returns {string|null} Sanitized path or null if invalid
 */
function sanitizePath(pathValue, projectRoot) {
  // Normalize first
  const normalized = normalizePath(pathValue);
  if (!normalized) return null;

  // Block null bytes and other dangerous chars
  if (/[\x00]/.test(normalized)) return null;

  // Allow absolute paths (user explicitly wants consolidated plans elsewhere)
  if (isAbsolutePath(normalized)) {
    return normalized;
  }

  // For relative paths, resolve and validate
  const resolved = path.resolve(projectRoot, normalized);

  // Prevent path traversal outside project (../ attacks)
  // But allow if user explicitly set absolute path
  if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
    // This is a relative path trying to escape - block it
    return null;
  }

  return normalized;
}

/**
 * Convert MSYS/Git Bash paths to Windows format on Windows.
 * Git Bash uses /d/path instead of D:/path — Node.js path.resolve() doesn't
 * understand this convention and produces wrong results (D:\d\path).
 * @param {string} p - Path that may be in MSYS format
 * @returns {string} Windows-format path, or original if not MSYS format
 */
function convertMsysToWindows(p) {
  if (!p || process.platform !== 'win32') return p || '';
  const match = p.match(/^\/([a-zA-Z])(\/.*|$)/);
  if (match) {
    return match[1].toUpperCase() + ':' + (match[2] || '/');
  }
  return p;
}

/**
 * Normalize path for cross-platform comparison
 * Used by security hooks and path-matching logic where consistent
 * comparison is needed (backslash→forward, lowercase on Windows, trailing slash removal)
 * @param {string} p - Path to normalize
 * @returns {string} Normalized path suitable for comparison (empty string if invalid)
 */
function normalizePathForComparison(p) {
  if (!p) return '';
  let normalized = p.replace(/\\/g, '/');
  // Convert MSYS/Git Bash paths (/d/... → D:/...) on Windows
  normalized = convertMsysToWindows(normalized);
  // Remove trailing slash unless it's root
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  // Windows paths are case-insensitive
  if (process.platform === 'win32') {
    normalized = normalized.toLowerCase();
  }
  return normalized;
}

/**
 * Build allowlist of directories outside project that are permitted.
 * Includes system temp dirs (for Claude subagent task outputs) and
 * Claude/Anthropic config directories.
 *
 * @param {string[]} [extraDirs=[]] - Additional dirs to allow (e.g. from .ck.json config)
 * @returns {string[]} Array of resolved, normalized allowed paths
 */
function buildBoundaryAllowlist(extraDirs = []) {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const dirs = [
    process.env.TEMP,
    process.env.TMP,
    process.env.TMPDIR,
    '/tmp',
    '/var/tmp',
    home && path.join(home, '.claude'),
    home && path.join(home, '.anthropic'),
    ...extraDirs,
  ];
  return dirs
    .filter(Boolean)
    .map(d => normalizePathForComparison(path.resolve(d)))
    .filter(Boolean);
}

/**
 * Normalize a CONFIGURED ROOT path to one canonical comparison/construction form.
 *
 * Backslashes -> `/`, repeated separators collapsed, a leading `./` stripped, every
 * trailing `/` stripped. A non-string, empty, or whitespace-only value yields `''`.
 *
 * It deliberately does NOT lowercase: case folding is a COMPARISON concern and belongs
 * at the comparison site (`isPathWithinRoot`), not baked into a value that may be used
 * to build a real filesystem path on a case-sensitive host.
 *
 * Distinct from `sanitizePath` above by design: `sanitizePath` REVERTS a bad value to a
 * default (fail-safe, correct for framework preferences in `.ck.json`), while this pair
 * plus `escapesRepoRoot` REPORTS a bad value (fail-closed, correct for project content
 * roots declared in `docs/project-config.json`).
 *
 * @param {*} value - Candidate root path
 * @returns {string} Canonical slash-form root without a trailing slash, or `''`
 */
function normalizeRootPath(value) {
  if (!value || typeof value !== 'string') return '';
  let normalized = value.trim();
  if (!normalized) return '';
  normalized = normalized.replace(/\\/g, '/');
  normalized = normalized.replace(/\/{2,}/g, '/');
  while (normalized.startsWith('./')) normalized = normalized.slice(2);
  normalized = normalized.replace(/\/+$/, '');
  return normalized;
}

/**
 * Is `candidate` inside `root` (or equal to it), matching on a SEGMENT boundary?
 *
 * Both sides are normalized and compared case-insensitively. The segment boundary is the
 * defence against the fail-open class a bare `startsWith` produces: root `docs/specs`
 * must NOT match `docs/specifications/x.md` or `docs/specs-technical/x.md`.
 *
 * @param {*} candidate - Repo-relative path to test
 * @param {*} root - Configured root
 * @returns {boolean} True when candidate is the root or lives under it
 */
function isPathWithinRoot(candidate, root) {
  const c = normalizeRootPath(candidate).toLowerCase();
  const r = normalizeRootPath(root).toLowerCase();
  if (!c || !r) return false;
  if (c === r) return true;
  return c.startsWith(`${r}/`);
}

/**
 * Does a configured value leave the repository root?
 *
 * True when the normalized value is absolute (POSIX `/…`, UNC, or a Windows drive such
 * as `C:/…`), is Windows drive-relative (`C:foo` — resolved against that drive's current
 * directory, never the repo), or contains a `..` segment anywhere. An empty/invalid value
 * is NOT an escape — absence is handled by the caller's default, not by this guard.
 *
 * @param {*} value - Configured root path
 * @returns {boolean} True when the value escapes the repo root
 */
function escapesRepoRoot(value) {
  const normalized = normalizeRootPath(value);
  if (!normalized) return false;
  if (normalized.startsWith('/')) return true;
  if (/^[a-zA-Z]:/.test(normalized)) return true;
  return normalized.split('/').includes('..');
}

/**
 * Is the absolute filesystem path `candidate` inside `root` (or equal to it)?
 *
 * The canonical containment predicate for RESOLVED filesystem paths — the security check
 * behind traversal and symlink-escape guards. Distinct from `isPathWithinRoot`, which
 * compares repo-relative CONFIG strings. Both sides are resolved first, so `.`/`..`
 * segments and redundant separators cannot fake containment; comparison goes through
 * `path.relative`, which folds case on win32 and yields an absolute result for a different
 * drive or UNC share (both rejected). A sibling that merely shares the prefix (`/a/bc` vs
 * root `/a/b`) and an entry literally named `..x` are handled on the segment boundary.
 * Physical (symlink/junction) containment is the caller's job: pass `realpath`ed inputs.
 *
 * @param {string} root - Containing directory (absolute, or resolved against cwd)
 * @param {string} candidate - Path to test
 * @param {object} [pathApi=path] - `path`, `path.win32` or `path.posix`; injectable so the
 *   win32 and POSIX semantics are testable on any host
 * @returns {boolean} True when candidate is root or lives beneath it; false for invalid input
 */
function isAbsolutePathWithin(root, candidate, pathApi = path) {
  if (typeof root !== 'string' || typeof candidate !== 'string' || !root || !candidate) return false;
  if (root.includes('\0') || candidate.includes('\0')) return false;
  const relative = pathApi.relative(pathApi.resolve(root), pathApi.resolve(candidate));
  return relative === '' ||
    (relative !== '..' && !relative.startsWith(`..${pathApi.sep}`) && !pathApi.isAbsolute(relative));
}

/**
 * Join a configured root with path segments using exactly one `/` between parts.
 *
 * **Bare template concatenation of a configured root is FORBIDDEN.** A configured root
 * may or may not carry a trailing slash, and this codebase ships BOTH conventions, so
 * `` `${root}${segment}` `` silently produces either `docs/specs/Auth` or `docs/specsAuth`
 * depending on whose value it received — a total mis-classification with no error. Route
 * every construction through this helper instead. The two live call sites it replaces:
 *   - `.claude/hooks/lib/doc-sync-classify.cjs:30,131` — `FEATURE_SPEC_ROOT = 'docs/specs/'`
 *     WITH a trailing slash, used for string CONSTRUCTION.
 *   - `.claude/scripts/doc-impact-map.cjs:368` — slash-FREE `config.specRoots.*.path`
 *     compared with `startsWith` (which is also why `isPathWithinRoot` exists).
 * Both are converted in Phase 08; this helper is the replacement they adopt.
 *
 * Empty/blank segments are dropped, EXCEPT that a final empty segment requests a trailing
 * slash: `joinRoot('docs/specs', 'Auth', '')` and `joinRoot('docs/specs/', 'Auth', '')`
 * both yield `'docs/specs/Auth/'`.
 *
 * @param {*} root - Configured root path
 * @param {...*} segments - Path segments; a final `''` requests a trailing slash
 * @returns {string} Joined path, or `''` when nothing usable remains
 */
function joinRoot(root, ...segments) {
  const wantsTrailingSlash =
    segments.length > 0 && normalizeRootPath(segments[segments.length - 1]) === '';
  const parts = [normalizeRootPath(root)];
  for (const segment of segments) {
    const normalized = normalizeRootPath(segment);
    if (normalized) parts.push(normalized);
  }
  const joined = parts.filter(Boolean).join('/');
  if (!joined) return '';
  return wantsTrailingSlash ? `${joined}/` : joined;
}

module.exports = {
  INVALID_FILENAME_CHARS,
  sanitizeSlug,
  normalizeRootPath,
  isPathWithinRoot,
  escapesRepoRoot,
  isAbsolutePathWithin,
  joinRoot,
  normalizePath,
  normalizePathForComparison,
  convertMsysToWindows,
  buildBoundaryAllowlist,
  isAbsolutePath,
  sanitizePath
};
