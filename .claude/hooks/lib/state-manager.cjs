#!/usr/bin/env node
/**
 * State Manager Factory
 *
 * Provides reusable JSON state persistence with:
 * - File-based storage
 * - Optional TTL expiration
 * - Merge or replace modes
 * - Graceful error handling
 *
 * Usage:
 *   const manager = createStateManager(filePath, defaultState, options);
 *   manager.get()           // Get current state
 *   manager.set(partial)    // Update state (merge or replace)
 *   manager.clear()         // Delete state file
 *   manager.exists()        // Check if state file exists
 *   manager.getFilePath()   // Get state file path
 */

const fs = require('fs');
const path = require('path');

/**
 * Create a state manager for a specific state file
 * @param {string} stateFilePath - Absolute path to state JSON file
 * @param {Object|null} defaultState - Default state when file doesn't exist
 * @param {Object} options - Configuration options
 * @param {number} [options.ttlHours] - TTL in hours (optional, for expiration)
 * @param {boolean} [options.mergeOnSet=true] - Merge partial state on set (false = replace)
 * @param {boolean} [options.autoTimestamp=true] - Auto-add lastUpdated timestamp
 * @returns {Object} State manager API
 */
function createStateManager(stateFilePath, defaultState = null, options = {}) {
  const {
    ttlHours = null,
    mergeOnSet = true,
    autoTimestamp = true
  } = options;

  /**
   * Check if state has expired (TTL-based)
   * @param {Object} state - State object with startTime
   * @returns {boolean} True if expired
   */
  function isExpired(state) {
    if (!ttlHours || !state || !state.startTime) {
      return false;
    }

    const startTime = new Date(state.startTime);
    const now = new Date();
    const hoursElapsed = (now - startTime) / (1000 * 60 * 60);

    return hoursElapsed > ttlHours;
  }

  /**
   * Get current state from file
   * @returns {Object|null} State object or default/null
   */
  function get() {
    try {
      if (!fs.existsSync(stateFilePath)) {
        return defaultState ? { ...defaultState } : null;
      }

      const content = fs.readFileSync(stateFilePath, 'utf-8');
      const state = JSON.parse(content);

      // Check TTL expiration
      if (isExpired(state)) {
        clear();
        return defaultState ? { ...defaultState } : null;
      }

      return state;
    } catch (e) {
      // Corrupted state, return default
      if (process.env.CK_DEBUG) {
        console.error(`[state-manager] Read error (${path.basename(stateFilePath)}): ${e.message}`);
      }
      return defaultState ? { ...defaultState } : null;
    }
  }

  /**
   * Save state to file
   * @param {Object} state - State to save (partial if mergeOnSet=true)
   */
  function set(state) {
    try {
      // Ensure directory exists
      const dir = path.dirname(stateFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let finalState;
      if (mergeOnSet) {
        const current = get() || {};
        finalState = { ...current, ...state };
      } else {
        finalState = state;
      }

      // Auto-add timestamp
      if (autoTimestamp) {
        finalState.lastUpdated = new Date().toISOString();
      }

      fs.writeFileSync(stateFilePath, JSON.stringify(finalState, null, 2), 'utf-8');
    } catch (e) {
      // Silent fail - don't block operations
      if (process.env.CK_DEBUG) {
        console.error(`[state-manager] Save error (${path.basename(stateFilePath)}): ${e.message}`);
      }
    }
  }

  /**
   * Clear state file
   */
  function clear() {
    try {
      if (fs.existsSync(stateFilePath)) {
        fs.unlinkSync(stateFilePath);
      }
    } catch (e) {
      // Ignore cleanup errors
      if (process.env.CK_DEBUG) {
        console.error(`[state-manager] Clear error (${path.basename(stateFilePath)}): ${e.message}`);
      }
    }
  }

  /**
   * Check if state file exists
   * @returns {boolean} True if file exists
   */
  function exists() {
    return fs.existsSync(stateFilePath);
  }

  /**
   * Get state file path
   * @returns {string} Absolute path to state file
   */
  function getFilePath() {
    return stateFilePath;
  }

  return {
    get,
    set,
    clear,
    exists,
    getFilePath
  };
}

module.exports = { createStateManager };
