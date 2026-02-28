/**
 * Test utilities for Claude hooks testing
 * Provides temp directory management, mock config setup, and state helpers
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * Create a temporary directory for test isolation
 * @param {string} [prefix='hook-test-'] - Prefix for the temp directory name
 * @returns {string} Path to the created temp directory
 */
function createTempDir(prefix = 'hook-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Clean up a temporary directory
 * @param {string} dir - Path to the directory to remove
 */
function cleanupTempDir(dir) {
  if (dir && dir.startsWith(os.tmpdir())) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Setup mock .claude directory with config file
 * @param {string} tmpDir - Temp directory path
 * @param {object} config - Config object to write
 * @returns {string} Path to the .claude directory
 */
function setupMockConfig(tmpDir, config) {
  const claudeDir = path.join(tmpDir, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(
    path.join(claudeDir, '.ck.json'),
    JSON.stringify(config, null, 2)
  );
  return claudeDir;
}

/**
 * Setup mock todo state file
 * @param {string} tmpDir - Temp directory path
 * @param {object} state - Todo state object
 * @returns {string} Path to the state file
 */
function setupTodoState(tmpDir, state) {
  const claudeDir = path.join(tmpDir, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  const stateFile = path.join(claudeDir, '.todo-state.json');
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  return stateFile;
}

/**
 * Setup mock edit state file
 * @param {string} tmpDir - Temp directory path
 * @param {object} state - Edit state object
 * @returns {string} Path to the state file
 */
function setupEditState(tmpDir, state) {
  const claudeDir = path.join(tmpDir, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  const stateFile = path.join(claudeDir, '.edit-state.json');
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  return stateFile;
}

/**
 * Setup mock checkpoint file
 * @param {string} tmpDir - Temp directory path
 * @param {object} data - Checkpoint data
 * @returns {string} Path to the checkpoint file
 */
function setupCheckpoint(tmpDir, data) {
  const checkpointDir = path.join(tmpDir, '.claude', 'checkpoints');
  fs.mkdirSync(checkpointDir, { recursive: true });
  const checkpointFile = path.join(checkpointDir, 'latest.json');
  fs.writeFileSync(checkpointFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    ...data
  }, null, 2));
  return checkpointFile;
}

/**
 * Setup mock lessons file
 * @param {string} tmpDir - Temp directory path
 * @param {Array} lessons - Array of lesson objects
 * @returns {string} Path to the lessons file
 */
function setupAceLessons(tmpDir, lessons) {
  const memoryDir = path.join(tmpDir, '.claude', 'memory');
  fs.mkdirSync(memoryDir, { recursive: true });
  const lessonsFile = path.join(memoryDir, 'lessons.json');
  fs.writeFileSync(lessonsFile, JSON.stringify(lessons, null, 2));
  return lessonsFile;
}

/**
 * Setup mock .ckignore file
 * @param {string} tmpDir - Temp directory path
 * @param {string[]} patterns - Array of ignore patterns
 * @returns {string} Path to the .ckignore file
 */
function setupCkIgnore(tmpDir, patterns) {
  const ignoreFile = path.join(tmpDir, '.ckignore');
  fs.writeFileSync(ignoreFile, patterns.join('\n'));
  return ignoreFile;
}

/**
 * Create a mock file in the temp directory
 * @param {string} tmpDir - Temp directory path
 * @param {string} relativePath - Relative path for the file
 * @param {string} [content=''] - File content
 * @returns {string} Absolute path to the created file
 */
function createMockFile(tmpDir, relativePath, content = '') {
  const filePath = path.join(tmpDir, relativePath);
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * Read a state file from temp directory
 * @param {string} tmpDir - Temp directory path
 * @param {string} stateFileName - State file name (e.g., '.todo-state.json')
 * @returns {object|null} Parsed state object or null if not found
 */
function readStateFile(tmpDir, stateFileName) {
  const stateFile = path.join(tmpDir, '.claude', stateFileName);
  if (fs.existsSync(stateFile)) {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  }
  return null;
}

/**
 * Check if a file exists in temp directory
 * @param {string} tmpDir - Temp directory path
 * @param {string} relativePath - Relative path to check
 * @returns {boolean}
 */
function fileExists(tmpDir, relativePath) {
  return fs.existsSync(path.join(tmpDir, relativePath));
}

/**
 * Save and restore environment variables for test isolation
 * @returns {{save: function, restore: function}}
 */
function createEnvSaver() {
  let savedEnv = {};

  return {
    /**
     * Save specific environment variables
     * @param {string[]} keys - Keys to save
     */
    save(keys) {
      savedEnv = {};
      for (const key of keys) {
        savedEnv[key] = process.env[key];
      }
    },

    /**
     * Restore saved environment variables
     */
    restore() {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      savedEnv = {};
    }
  };
}

/**
 * Setup mock CLAUDE_ENV_FILE for session-init tests
 * @param {string} tmpDir - Temp directory path
 * @returns {{envFile: string, cleanup: function}}
 */
function setupClaudeEnvFile(tmpDir) {
  const envFile = path.join(tmpDir, '.claude-env');
  const originalEnvFile = process.env.CLAUDE_ENV_FILE;
  process.env.CLAUDE_ENV_FILE = envFile;

  return {
    envFile,
    cleanup() {
      if (originalEnvFile !== undefined) {
        process.env.CLAUDE_ENV_FILE = originalEnvFile;
      } else {
        delete process.env.CLAUDE_ENV_FILE;
      }
    }
  };
}

/**
 * Parse environment file content
 * @param {string} content - File content
 * @returns {object} Parsed environment variables
 */
function parseEnvFile(content) {
  const env = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^export\s+(\w+)=(.*)$/);
    if (match) {
      let value = match[2];
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[match[1]] = value;
    }
  }
  return env;
}

/**
 * Wait for a condition to be true
 * @param {function} condition - Condition function
 * @param {number} [timeout=5000] - Timeout in ms
 * @param {number} [interval=100] - Check interval in ms
 * @returns {Promise<boolean>}
 */
async function waitFor(condition, timeout = 5000, interval = 100) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return true;
    await new Promise(r => setTimeout(r, interval));
  }
  return false;
}

/**
 * Get the hooks directory path
 * @returns {string}
 */
function getHooksDir() {
  return path.resolve(__dirname, '..', '..');
}

/**
 * Get the tests directory path
 * @returns {string}
 */
function getTestsDir() {
  return path.resolve(__dirname, '..');
}

/**
 * Create a timestamp for testing checkpoint freshness
 * @param {number} hoursAgo - Hours in the past
 * @returns {string} ISO timestamp
 */
function createTimestamp(hoursAgo = 0) {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
}

/**
 * Setup mock workflow state for testing
 * @param {string} tmpDir - Temp directory path
 * @param {object} state - Workflow state object
 * @returns {string} Path to the state file
 */
function setupWorkflowState(tmpDir, state) {
  const claudeDir = path.join(tmpDir, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  const stateFile = path.join(claudeDir, '.workflow-state.json');
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  return stateFile;
}

/**
 * Setup mock workflow config for testing
 * @param {string} tmpDir - Temp directory path
 * @param {object} config - Workflow config object
 * @returns {string} Path to the config file
 */
function setupWorkflowConfig(tmpDir, config) {
  const workflowDir = path.join(tmpDir, '.claude', 'workflows');
  fs.mkdirSync(workflowDir, { recursive: true });
  const configFile = path.join(workflowDir, 'config.json');
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  return configFile;
}

/**
 * Setup mock compact marker for testing
 * @param {string} tmpDir - Temp directory path
 * @param {string} sessionId - Session ID
 * @param {object} data - Marker data
 * @returns {string} Path to the marker file
 */
function setupCompactMarker(tmpDir, sessionId, data) {
  const memoryDir = path.join(tmpDir, '.claude', 'memory');
  fs.mkdirSync(memoryDir, { recursive: true });
  const markerFile = path.join(memoryDir, `compact-${sessionId}.json`);
  fs.writeFileSync(markerFile, JSON.stringify({
    sessionId,
    timestamp: new Date().toISOString(),
    ...data
  }, null, 2));
  return markerFile;
}

/**
 * Read calibration data from temp directory
 * @param {string} tmpDir - Temp directory path
 * @returns {object|null} Parsed calibration or null
 */
function readCalibration(tmpDir) {
  const calibrationFile = path.join(tmpDir, '.claude', 'memory', 'calibration.json');
  if (fs.existsSync(calibrationFile)) {
    return JSON.parse(fs.readFileSync(calibrationFile, 'utf8'));
  }
  return null;
}

/**
 * Setup mock calibration data for testing
 * @param {string} tmpDir - Temp directory path
 * @param {object} calibration - Calibration data
 * @returns {string} Path to the calibration file
 */
function setupCalibration(tmpDir, calibration) {
  const memoryDir = path.join(tmpDir, '.claude', 'memory');
  fs.mkdirSync(memoryDir, { recursive: true });
  const calibrationFile = path.join(memoryDir, 'calibration.json');
  fs.writeFileSync(calibrationFile, JSON.stringify(calibration, null, 2));
  return calibrationFile;
}

/**
 * Setup mock metrics data for testing
 * @param {string} tmpDir - Temp directory path
 * @param {object} metrics - Metrics data
 * @returns {string} Path to the metrics file
 */
function setupMetrics(tmpDir, metrics) {
  const tmpClaudeDir = path.join(tmpDir, '.claude', 'tmp');
  fs.mkdirSync(tmpClaudeDir, { recursive: true });
  const metricsFile = path.join(tmpClaudeDir, 'hook-metrics.json');
  fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
  return metricsFile;
}

/**
 * Read metrics from temp directory
 * @param {string} tmpDir - Temp directory path
 * @returns {object|null} Parsed metrics or null
 */
function readMetrics(tmpDir) {
  const metricsFile = path.join(tmpDir, '.claude', 'tmp', 'hook-metrics.json');
  if (fs.existsSync(metricsFile)) {
    return JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
  }
  return null;
}

/**
 * Create a timestamp for testing with configurable age
 * @param {number} daysAgo - Days in the past
 * @returns {string} ISO timestamp
 */
function createDaysAgoTimestamp(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

module.exports = {
  createTempDir,
  cleanupTempDir,
  setupMockConfig,
  setupTodoState,
  setupEditState,
  setupCheckpoint,
  setupAceLessons,
  setupCkIgnore,
  createMockFile,
  readStateFile,
  fileExists,
  createEnvSaver,
  setupClaudeEnvFile,
  parseEnvFile,
  waitFor,
  getHooksDir,
  getTestsDir,
  createTimestamp,
  setupWorkflowState,
  setupWorkflowConfig,
  setupCompactMarker,
  readCalibration,
  setupCalibration,
  setupMetrics,
  readMetrics,
  createDaysAgoTimestamp
};
