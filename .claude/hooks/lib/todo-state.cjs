#!/usr/bin/env node
'use strict';

/**
 * Todo State Management - Shared per-session todo state
 *
 * Atomic, Windows-safe read/write/clear primitives over the on-disk todo snapshot at
 * /tmp/ck/todo-{sessionId}.json. Todo/workflow discipline is model-driven
 * (CLAUDE.md "Task Planning Rules"); this lib is the persistence primitive, not a gate.
 *
 * Exercised by tests/suites/lifecycle.test.cjs (atomic-write invariants under concurrency).
 *
 * @module todo-state
 */

const fs = require('fs');
const path = require('path');
const { CK_TMP_DIR, ensureDir } = require('./ck-paths.cjs');

// Todo state directory
const TODO_DIR = path.join(CK_TMP_DIR, 'todo');

// State file path pattern
const STATE_FILE_PREFIX = 'todo-state-';

/**
 * Get todo state file path for a session
 * @param {string} sessionId - Session identifier
 * @returns {string} Path to todo state file
 */
function getTodoStatePath(sessionId) {
    return path.join(TODO_DIR, `${STATE_FILE_PREFIX}${sessionId}.json`);
}

/**
 * Default todo state schema
 * @returns {Object} Default empty todo state
 */
function getDefaultState() {
    return {
        hasTodos: false, // Whether TaskCreate has been called
        pendingCount: 0, // Count of pending todos
        completedCount: 0, // Count of completed todos
        inProgressCount: 0, // Count of in-progress todos
        lastTodos: [], // Last 60 todos for recovery (actual content)
        taskSubjects: {}, // Map of {taskId: subject} for workflow guard
        lastUpdated: null, // ISO timestamp of last update
        bypasses: [], // Record of enforcement bypasses
        metadata: {} // Additional data
    };
}

/**
 * Load todo state from file
 * @param {string} sessionId - Session identifier
 * @returns {Object} Todo state or default
 */
function getTodoState(sessionId) {
    if (!sessionId) return getDefaultState();

    const statePath = getTodoStatePath(sessionId);
    try {
        if (!fs.existsSync(statePath)) return getDefaultState();
        const data = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        return { ...getDefaultState(), ...data };
    } catch (e) {
        return getDefaultState();
    }
}

/**
 * Save todo state atomically
 * Uses write-to-temp-then-rename pattern to prevent corruption
 *
 * @param {string} sessionId - Session identifier
 * @param {Object} state - Todo state to save
 * @returns {boolean} Success status
 */
function setTodoState(sessionId, state) {
    if (!sessionId) return false;

    ensureDir(TODO_DIR);
    const statePath = getTodoStatePath(sessionId);
    const tmpFile = statePath + '.' + Math.random().toString(36).slice(2);

    try {
        const stateToSave = {
            ...state,
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(tmpFile, JSON.stringify(stateToSave, null, 2));
        try {
            fs.renameSync(tmpFile, statePath);
        } catch (renameErr) {
            // Windows: renameSync fails with EEXIST/EPERM when destination is locked
            // by a concurrent process. Fall back to copy+delete which is safe enough
            // for non-critical session state (fail-open design).
            if (renameErr.code === 'EEXIST' || renameErr.code === 'EPERM') {
                fs.copyFileSync(tmpFile, statePath);
                try { fs.unlinkSync(tmpFile); } catch (_) { /* ignore cleanup failure */ }
            } else {
                throw renameErr;
            }
        }
        return true;
    } catch (e) {
        try {
            fs.unlinkSync(tmpFile);
        } catch (_) {
            /* ignore */
        }
        return false;
    }
}

/**
 * Clear todo state for session
 * @param {string} sessionId - Session identifier
 * @returns {boolean} Success status
 */
function clearTodoState(sessionId) {
    if (!sessionId) return false;

    const statePath = getTodoStatePath(sessionId);
    try {
        if (fs.existsSync(statePath)) {
            fs.unlinkSync(statePath);
        }
        return true;
    } catch (e) {
        return false;
    }
}

module.exports = {
    // Directory
    TODO_DIR,

    // Path helpers
    getTodoStatePath,
    getDefaultState,

    // State operations
    getTodoState,
    setTodoState,
    clearTodoState
};
