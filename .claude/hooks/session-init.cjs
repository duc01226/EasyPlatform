#!/usr/bin/env node
/**
 * SessionStart Hook - Initializes session environment with project detection
 *
 * Fires: Once per session (startup, resume, clear, compact)
 * Purpose: Load config, detect project info, persist to env vars, output context
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 *
 * Sub-modules:
 *   - si-exec.cjs    - Safe shell execution utilities
 *   - si-python.cjs  - Python detection
 *   - si-project.cjs - Project/framework detection
 *   - si-output.cjs  - Context output formatting
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  loadConfig,
  writeEnv,
  writeSessionState,
  resolvePlanPath,
  getReportsPath,
  resolveNamingPattern,
  getGitBranch,
  getGitRemoteUrl
} = require('./lib/ck-config-utils.cjs');
const { writeResetMarker } = require('./lib/context-tracker.cjs');
const { cleanupTempFiles } = require('./lib/temp-cleanup.cjs');
const { clearState: clearWorkflowState } = require('./lib/workflow-state.cjs');

// Session-init sub-modules
const { getPythonVersion } = require('./lib/si-python.cjs');
const { detectProjectType, detectPackageManager, detectFramework } = require('./lib/si-project.cjs');
const { getCodingLevelStyleName, getCodingLevelGuidelines, buildContextOutput } = require('./lib/si-output.cjs');

/**
 * Main hook execution
 */
async function main() {
  try {
    // Clean up temp files from previous sessions (non-blocking)
    cleanupTempFiles();

    const stdin = fs.readFileSync(0, 'utf-8').trim();
    const data = stdin ? JSON.parse(stdin) : {};
    const envFile = process.env.CLAUDE_ENV_FILE;
    const source = data.source || 'unknown';
    const sessionId = data.session_id || null;

    const config = loadConfig();

    // Layer 3: Write reset marker on /clear to signal statusline to reset baseline
    // This ensures context window percentage resets to 0% on fresh sessions
    if (source === 'clear' && sessionId) {
      writeResetMarker(sessionId, 'clear');
      // Defense-in-depth: clear stale workflow state on /clear
      // SessionEnd may not fire for /clear on all platforms, so clear here too
      clearWorkflowState();
    }

    const detections = {
      type: detectProjectType(config.project?.type),
      pm: detectPackageManager(config.project?.packageManager),
      framework: detectFramework(config.project?.framework)
    };

    // Resolve plan - now returns { path, resolvedBy }
    const resolved = resolvePlanPath(null, config);

    // CRITICAL FIX: Only persist explicitly-set plans to session state
    // Branch-matched plans are "suggested" - stored separately, not as activePlan
    // This prevents stale plan pollution on fresh sessions
    if (sessionId) {
      writeSessionState(sessionId, {
        sessionOrigin: process.cwd(),
        // Only session-resolved plans are truly "active"
        activePlan: resolved.resolvedBy === 'session' ? resolved.path : null,
        // Track suggested plan separately (for UI hints, not for report paths)
        suggestedPlan: resolved.resolvedBy === 'branch' ? resolved.path : null,
        timestamp: Date.now(),
        source
      });
    }

    // Reports path only uses active plans, not suggested ones
    const reportsPath = getReportsPath(resolved.path, resolved.resolvedBy, config.plan, config.paths);

    // Collect static environment info (computed once per session)
    const staticEnv = {
      nodeVersion: process.version,
      pythonVersion: getPythonVersion(),
      osPlatform: process.platform,
      gitUrl: getGitRemoteUrl(),
      gitBranch: getGitBranch(),
      user: process.env.USERNAME || process.env.USER || process.env.LOGNAME || os.userInfo().username,
      locale: process.env.LANG || '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      claudeSettingsDir: path.resolve(__dirname, '..')
    };

    // Compute resolved naming pattern (date + issue resolved, {slug} kept as placeholder)
    const namePattern = resolveNamingPattern(config.plan, staticEnv.gitBranch);

    if (envFile) {
      // Session & plan config
      writeEnv(envFile, 'CK_SESSION_ID', sessionId || '');
      writeEnv(envFile, 'CK_PLAN_NAMING_FORMAT', config.plan.namingFormat);
      writeEnv(envFile, 'CK_PLAN_DATE_FORMAT', config.plan.dateFormat);
      writeEnv(envFile, 'CK_PLAN_ISSUE_PREFIX', config.plan.issuePrefix || '');
      writeEnv(envFile, 'CK_PLAN_REPORTS_DIR', config.plan.reportsDir);

      // NEW: Resolved naming pattern for DRY file naming in agents
      // Example: "251212-1830-GH-88-{slug}" or "251212-1830-{slug}"
      // Agents use: `{agent-type}-$CK_NAME_PATTERN.md` and substitute {slug}
      writeEnv(envFile, 'CK_NAME_PATTERN', namePattern);

      // Plan resolution
      writeEnv(envFile, 'CK_ACTIVE_PLAN', resolved.resolvedBy === 'session' ? resolved.path : '');
      writeEnv(envFile, 'CK_SUGGESTED_PLAN', resolved.resolvedBy === 'branch' ? resolved.path : '');
      writeEnv(envFile, 'CK_REPORTS_PATH', reportsPath);

      // Paths
      writeEnv(envFile, 'CK_DOCS_PATH', config.paths.docs);
      writeEnv(envFile, 'CK_PLANS_PATH', config.paths.plans);
      writeEnv(envFile, 'CK_PROJECT_ROOT', process.cwd());

      // Project detection
      writeEnv(envFile, 'CK_PROJECT_TYPE', detections.type || '');
      writeEnv(envFile, 'CK_PACKAGE_MANAGER', detections.pm || '');
      writeEnv(envFile, 'CK_FRAMEWORK', detections.framework || '');

      // NEW: Static environment info (so other hooks don't need to recompute)
      writeEnv(envFile, 'CK_NODE_VERSION', staticEnv.nodeVersion);
      writeEnv(envFile, 'CK_PYTHON_VERSION', staticEnv.pythonVersion || '');
      writeEnv(envFile, 'CK_OS_PLATFORM', staticEnv.osPlatform);
      writeEnv(envFile, 'CK_GIT_URL', staticEnv.gitUrl || '');
      writeEnv(envFile, 'CK_GIT_BRANCH', staticEnv.gitBranch || '');
      writeEnv(envFile, 'CK_USER', staticEnv.user);
      writeEnv(envFile, 'CK_LOCALE', staticEnv.locale);
      writeEnv(envFile, 'CK_TIMEZONE', staticEnv.timezone);
      writeEnv(envFile, 'CK_CLAUDE_SETTINGS_DIR', staticEnv.claudeSettingsDir);

      // Locale config
      if (config.locale?.thinkingLanguage) {
        writeEnv(envFile, 'CK_THINKING_LANGUAGE', config.locale.thinkingLanguage);
      }
      if (config.locale?.responseLanguage) {
        writeEnv(envFile, 'CK_RESPONSE_LANGUAGE', config.locale.responseLanguage);
      }

      // Plan validation config (for /plan:validate, /plan:hard, /plan:parallel)
      const validation = config.plan?.validation || {};
      writeEnv(envFile, 'CK_VALIDATION_MODE', validation.mode || 'prompt');
      writeEnv(envFile, 'CK_VALIDATION_MIN_QUESTIONS', validation.minQuestions || 3);
      writeEnv(envFile, 'CK_VALIDATION_MAX_QUESTIONS', validation.maxQuestions || 8);
      writeEnv(envFile, 'CK_VALIDATION_FOCUS_AREAS', (validation.focusAreas || ['assumptions', 'risks', 'tradeoffs', 'architecture']).join(','));

      // Coding level config (for output style selection)
      const codingLevel = config.codingLevel ?? 5;
      writeEnv(envFile, 'CK_CODING_LEVEL', codingLevel);
      writeEnv(envFile, 'CK_CODING_LEVEL_STYLE', getCodingLevelStyleName(codingLevel));
    }

    console.log(`Session ${source}. ${buildContextOutput(config, detections, resolved)}`);

    // Auto-inject coding level guidelines (if not disabled)
    const codingLevel = config.codingLevel ?? -1;
    const guidelines = getCodingLevelGuidelines(codingLevel);
    if (guidelines) {
      console.log(`\n${guidelines}`);
    }

    if (config.assertions?.length > 0) {
      console.log(`\nUser Assertions:`);
      config.assertions.forEach((assertion, i) => {
        console.log(`  ${i + 1}. ${assertion}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error(`SessionStart hook error: ${error.message}`);
    process.exit(0);
  }
}

main();
