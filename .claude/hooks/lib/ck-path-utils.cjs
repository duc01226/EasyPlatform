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
 * Normalize path for cross-platform comparison
 * Used by security hooks and path-matching logic where consistent
 * comparison is needed (backslash→forward, lowercase on Windows, trailing slash removal)
 * @param {string} p - Path to normalize
 * @returns {string} Normalized path suitable for comparison (empty string if invalid)
 */
function normalizePathForComparison(p) {
  if (!p) return '';
  let normalized = p.replace(/\\/g, '/');
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

module.exports = {
  INVALID_FILENAME_CHARS,
  sanitizeSlug,
  normalizePath,
  normalizePathForComparison,
  buildBoundaryAllowlist,
  isAbsolutePath,
  sanitizePath
};
