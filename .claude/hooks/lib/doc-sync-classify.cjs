'use strict';
/**
 * Doc-Sync Classifier (shared lib for doc-sync-gate.cjs)
 *
 * Pure, side-effect-free classification used by BOTH matchers of the Phase-4
 * doc⇄code sync gate:
 *   - the Bash `git commit` commit-time WARN path (advisory, exit 0), and
 *   - the Write/Edit/MultiEdit per-edit WARN path.
 *
 * Responsibilities:
 *   - load `.claude/hooks/config/doc-sync-gate.json` (fail-open if absent/bad)
 *   - normalise tool/staged paths to repo-relative POSIX
 *   - decide: fast-exit (non-behavioral) vs behavioral code vs feature-doc
 *   - resolve a path to its enforced area
 *
 * NO git calls and NO process.exit here — the hook owns I/O and exit codes so
 * this module stays unit-testable.
 *
 * @module doc-sync-classify
 */

const fs = require('fs');
const path = require('path');
const { loadProjectConfig } = require('./project-config-loader.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CONFIG_PATH = path.join(PROJECT_DIR, '.claude', 'hooks', 'config', 'doc-sync-gate.json');
const FEATURE_SPEC_ROOT = 'docs/specs/';

/**
 * Load gate config. Fail-open: any error yields a disabled config so the gate
 * never blocks because of its own misconfiguration.
 * @returns {object} config (with .enabled === false on any failure)
 */
function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const cfg = JSON.parse(raw);
    if (!cfg || typeof cfg !== 'object') return { enabled: false };
    const projectConfig = loadProjectConfig();
    const projectAreas = projectConfig.workflowPatterns?.docSyncGate?.enforcedAreas
      || projectConfig.docSyncGate?.enforcedAreas;
    cfg.enforcedAreas = Array.isArray(projectAreas)
      ? projectAreas
      : Array.isArray(cfg.enforcedAreas) ? cfg.enforcedAreas : [];
    // Normalise enforced-area path prefixes to a trailing slash so startsWith()
    // only matches whole path segments — prevents 'src/Services/Example'
    // from matching a sibling 'src/Services/ExampleX/...'. Idempotent.
    for (const area of cfg.enforcedAreas) {
      if (!area || typeof area !== 'object') continue;
      if (Array.isArray(area.codePathPrefixes)) {
        area.codePathPrefixes = area.codePathPrefixes.map(pre =>
          typeof pre === 'string' && pre && !pre.endsWith('/') ? `${pre}/` : pre
        );
      }
    }
    cfg.behavioralCodeExtensions = Array.isArray(cfg.behavioralCodeExtensions)
      ? cfg.behavioralCodeExtensions
      : ['.cs', '.ts'];
    cfg.fastExit = cfg.fastExit || {};
    cfg.fastExit.pathPrefixes = Array.isArray(cfg.fastExit.pathPrefixes) ? cfg.fastExit.pathPrefixes : [];
    cfg.fastExit.pathContains = Array.isArray(cfg.fastExit.pathContains) ? cfg.fastExit.pathContains : [];
    cfg.fastExit.extensions = Array.isArray(cfg.fastExit.extensions) ? cfg.fastExit.extensions : [];
    return cfg;
  } catch {
    return { enabled: false };
  }
}

/**
 * Normalise an absolute or relative path to a repo-relative POSIX path.
 * @param {string} p
 * @returns {string} repo-relative posix path (no leading ./), '' on falsy
 */
function toRepoRel(p) {
  if (!p) return '';
  let s = String(p).replace(/\\/g, '/');
  const root = PROJECT_DIR.replace(/\\/g, '/').replace(/\/+$/, '');
  if (s.toLowerCase().startsWith(root.toLowerCase() + '/')) {
    s = s.slice(root.length + 1);
  }
  // Drive-absolute but outside project (rare) — keep as-is minus drive noise.
  return s.replace(/^\.\//, '').replace(/^\/+/, '');
}

/**
 * Is this path a non-behavioral file (docs/tooling/tests/generated/migrations)?
 * @param {string} relPath repo-relative posix
 * @param {object} cfg
 * @returns {boolean}
 */
function isFastExit(relPath, cfg) {
  if (!relPath) return true;
  const fe = cfg.fastExit || {};
  const lower = relPath.toLowerCase();
  if ((fe.pathPrefixes || []).some(pre => lower.startsWith(String(pre).toLowerCase()))) return true;
  if ((fe.pathContains || []).some(frag => lower.includes(String(frag).toLowerCase()))) return true;
  const ext = path.posix.extname(lower);
  if ((fe.extensions || []).map(e => String(e).toLowerCase()).includes(ext)) return true;
  return false;
}

/**
 * Resolve the enforced area that owns this CODE path, or null.
 * @param {string} relPath repo-relative posix
 * @param {object} cfg
 * @returns {object|null} matching area
 */
function areaForCodePath(relPath, cfg) {
  if (!relPath) return null;
  const lower = relPath.toLowerCase();
  return (
    (cfg.enforcedAreas || []).find(a =>
      (a.codePathPrefixes || []).some(pre => lower.startsWith(String(pre).toLowerCase()))
    ) || null
  );
}

/**
 * Fixed Feature Spec bucket directory for an enforced area.
 * @param {object} area
 * @returns {string}
 */
function featureSpecDirForArea(area) {
  const bucket = area && typeof area.name === 'string' ? area.name.trim().replace(/^\/+|\/+$/g, '') : '';
  return `${FEATURE_SPEC_ROOT}${bucket}/`;
}

/**
 * Is this path a Feature Spec doc under SOME enforced area's fixed bucket dir?
 * @param {string} relPath repo-relative posix
 * @param {object} cfg
 * @returns {object|null} the owning area, or null
 */
function areaForFeatureDoc(relPath, cfg) {
  if (!relPath) return null;
  const lower = relPath.toLowerCase();
  return (
    (cfg.enforcedAreas || []).find(
      a => lower.startsWith(featureSpecDirForArea(a).toLowerCase())
    ) || null
  );
}

/**
 * Does this path represent a behavioral code change in an enforced area?
 * (under an area code prefix + behavioral extension + not fast-exit)
 * @param {string} relPath repo-relative posix
 * @param {object} cfg
 * @returns {{area: object}|null}
 */
function behavioralCodeHit(relPath, cfg) {
  if (isFastExit(relPath, cfg)) return null;
  const ext = path.posix.extname(relPath).toLowerCase();
  if (!(cfg.behavioralCodeExtensions || []).map(e => e.toLowerCase()).includes(ext)) return null;
  const area = areaForCodePath(relPath, cfg);
  return area ? { area } : null;
}

module.exports = {
  PROJECT_DIR,
  CONFIG_PATH,
  loadConfig,
  toRepoRel,
  isFastExit,
  areaForCodePath,
  featureSpecDirForArea,
  areaForFeatureDoc,
  behavioralCodeHit
};
