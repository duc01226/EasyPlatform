'use strict';

/**
 * Shared sensitive-path policy for direct tool operands and static command
 * operands.  This module is deliberately pure: it does not read files,
 * consult permissions, or interpret a shell.  A caller supplies the exact
 * operand and decides whether an APPROVED: prefix is acceptable for that
 * operation.
 */
const APPROVED_PREFIX = 'APPROVED:';
const SAFE_PATTERNS = Object.freeze([/\.example$/i, /\.sample$/i, /\.template$/i]);
const PRIVACY_PATTERNS = Object.freeze([
  /^\.env$/i,
  /^\.env\./i,
  /(?:^|\/)\.env$/i,
  /(?:^|\/)\.env\./i,
  /credentials/i,
  /secrets?\.ya?ml$/i,
  /\.(?:pem|key)$/i,
  /(?:^|\/)id_(?:rsa|ed25519)(?:$|[./])/i
]);

function hasApprovalPrefix(value) {
  return typeof value === 'string' && value.startsWith(APPROVED_PREFIX);
}

function stripApprovalPrefix(value) {
  return hasApprovalPrefix(value) ? value.slice(APPROVED_PREFIX.length) : value;
}

function decodeOnce(value) {
  try {
    return { value: decodeURIComponent(value), valid: true };
  } catch (_) {
    return { value, valid: false };
  }
}

function normalizeSensitivePath(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return { value: '', approved: false, valid: false, encoded: false };
  }
  const approved = hasApprovalPrefix(value);
  const raw = stripApprovalPrefix(value).replace(/\\/g, '/');
  const decoded = decodeOnce(raw);
  return {
    value: decoded.value,
    approved,
    valid: decoded.valid,
    encoded: decoded.value !== raw
  };
}

function basename(value) {
  const normalized = String(value || '').replace(/\\/g, '/');
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}

function isSafeFile(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  return SAFE_PATTERNS.some(pattern => pattern.test(basename(value)));
}

// '.env/.', '.env/./.', '.env//.' and '.env/' are all the SAME file to the operating
// system, and path.join collapses each one back to '.env' before any read happens. Matching
// the raw text therefore lets an anchored pattern be walked past by appending a no-op
// segment. Collapse '.', empty and '..' segments lexically first, so the policy judges the
// path the filesystem will actually open. A leading empty segment is kept: it carries the
// POSIX root.
function collapsePathSegments(value) {
  const segments = value.split('/');
  const collapsed = [];
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    if (segment === '.') continue;
    if (segment === '' && index !== 0) continue;
    if (segment === '..' && collapsed.length > 0) {
      const previous = collapsed[collapsed.length - 1];
      if (previous !== '..' && previous !== '') { collapsed.pop(); continue; }
    }
    collapsed.push(segment);
  }
  const joined = collapsed.join('/');
  // A path that collapses to nothing ('.', './') names the current directory, not a file.
  return joined === '' && collapsed.length <= 1 ? '' : joined;
}

function isPrivacySensitive(value) {
  const normalized = collapsePathSegments(normalizeSensitivePath(value).value);
  if (!normalized || isSafeFile(normalized)) return false;
  const leaf = basename(normalized);
  return PRIVACY_PATTERNS.some(pattern => pattern.test(leaf) || pattern.test(normalized));
}

function classifySensitivePath(value) {
  const normalized = normalizeSensitivePath(value);
  return {
    input: value,
    value: normalized.value,
    approved: normalized.approved,
    sensitive: isPrivacySensitive(value),
    valid: normalized.valid
  };
}

module.exports = {
  APPROVED_PREFIX,
  SAFE_PATTERNS,
  PRIVACY_PATTERNS,
  hasApprovalPrefix,
  stripApprovalPrefix,
  normalizeSensitivePath,
  isSafeFile,
  collapsePathSegments,
  isPrivacySensitive,
  classifySensitivePath
};
