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
const { loadProjectConfig, getSpecDocsPath } = require('./project-config-loader.cjs');
const { resolveProjectRoot } = require('./project-root.cjs');
const { isPathWithinRoot, joinRoot } = require('./ck-path-utils.cjs');
const { reportHookInternalError } = require('./debug-log.cjs');
const { validateDocSyncGate } = require('./project-config-schema.cjs');

const PROJECT_DIR = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env }).rootDir;
const CONFIG_PATH = path.join(PROJECT_DIR, '.claude', 'hooks', 'config', 'doc-sync-gate.json');

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
    const projectGate = projectConfig.workflowPatterns?.docSyncGate ?? projectConfig.docSyncGate;
    const errors = [
      ...validateDocSyncGate(cfg, 'doc-sync-gate'),
      ...validateDocSyncGate(projectGate)
    ];
    if (errors.length) throw new Error(errors.join('; '));
    cfg.enabled = projectGate?.enabled ?? cfg.enabled;
    const projectAreas = projectGate?.enforcedAreas;
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
          pre.replace(/\\/g, '/').replace(/\/+$/, '') + '/'
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
  } catch (error) {
    if (error.code !== 'ENOENT') {
      reportHookInternalError('doc-sync-gate', `configuration read failed at ${CONFIG_PATH}`, error);
    }
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
  } else if (path.isAbsolute(String(p))) {
    // A differently-spelled absolute path (symlink, macOS /var -> /private/var) is in-project
    // when its filesystem identity is; containment is owned by file-conventions (lazy: this
    // module loads on every doc-sync-gate call, the fallback only runs on a lexical miss).
    try {
      const physical = require('./file-conventions.cjs').toRepoRelative(String(p), PROJECT_DIR);
      if (physical) return physical;
    } catch (error) {
      reportHookInternalError('doc-sync-classify', 'identity containment', error);
    }
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
 * Feature Spec bucket directory for an enforced area, TRAILING SLASH guaranteed.
 *
 * The root is CONFIG-DRIVEN (`specRoots.business.path` via `getSpecDocsPath`), not a
 * literal. `getSpecDocsPath` returns a trailing-slash form while a configured root may
 * be slash-free, so this is built with `joinRoot` and NEVER with a bare template: a
 * slash-free `spec-library` concatenated into `` `${root}${bucket}/` `` would silently
 * yield `spec-libraryAuth/` — a total mis-classification with no error.
 *
 * @param {object} area - enforced area (its `name` is the bucket)
 * @param {string} [specRoot] - spec root override; resolved from project-config when omitted
 * @returns {string} e.g. 'docs/specs/Auth/' at the default root, or 'spec-library/Auth/' when `specRoots.business.path` in docs/project-config.json relocates it
 */
function featureSpecDirForArea(area, specRoot) {
  const bucket = area && typeof area.name === 'string' ? area.name.trim().replace(/^\/+|\/+$/g, '') : '';
  const root = specRoot === undefined || specRoot === null ? getSpecDocsPath() : specRoot;
  return joinRoot(root, bucket, '');
}

/**
 * Is this path a Feature Spec doc under SOME enforced area's bucket dir?
 *
 * Matches on a SEGMENT BOUNDARY via `isPathWithinRoot` — a bare `startsWith` lets the
 * bucket `Auth` swallow a sibling `AuthLegacy/…`, which is the fail-open class this
 * gate must not have.
 *
 * @param {string} relPath repo-relative posix
 * @param {object} cfg
 * @returns {object|null} the owning area, or null
 */
function areaForFeatureDoc(relPath, cfg) {
  if (!relPath) return null;
  const specRoot = getSpecDocsPath();
  return (
    (cfg.enforcedAreas || []).find(
      a => isPathWithinRoot(relPath, featureSpecDirForArea(a, specRoot))
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
