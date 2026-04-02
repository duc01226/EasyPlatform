#!/usr/bin/env node
'use strict';
/**
 * Tests for workflow-task-guard.cjs PreToolUse hook
 *
 * Verifies that workflow step tasks cannot be marked as completed
 * without the corresponding Skill tool having been invoked first.
 *
 * Usage: node test-workflow-task-guard.cjs [--verbose]
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const HOOKS_DIR = path.resolve(__dirname, '..');
const HOOK_FILE = 'workflow-task-guard.cjs';
const PROJECT_DIR = path.resolve(HOOKS_DIR, '..', '..');

let passed = 0;
let failed = 0;
const verbose = process.argv.includes('--verbose');

function log(msg) {
    console.log(msg);
}
function logResult(name, ok, detail) {
    if (ok) {
        passed++;
        log(`  ✓ ${name}`);
    } else {
        failed++;
        log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    }
}

/**
 * Run the hook with given stdin payload and environment
 */
async function runHook(input, env = {}) {
    return new Promise(resolve => {
        const hookPath = path.join(HOOKS_DIR, HOOK_FILE);
        const proc = spawn('node', [hookPath], {
            env: { ...process.env, CLAUDE_PROJECT_DIR: PROJECT_DIR, ...env },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', d => (stdout += d));
        proc.stderr.on('data', d => (stderr += d));

        proc.on('error', err => {
            resolve({ code: 1, stdout, stderr: err.message });
        });

        proc.on('close', code => {
            resolve({ code, stdout, stderr });
        });

        // Kill after 5s to prevent test suite from hanging
        const timer = setTimeout(() => {
            try {
                proc.kill();
            } catch {}
        }, 5000);
        proc.on('close', () => clearTimeout(timer));

        const payload = typeof input === 'string' ? input : JSON.stringify(input);
        proc.stdin.end(payload);
    });
}

/**
 * Set up workflow state and todo state for a test session
 */
function setupTestState(sessionId, { workflowSteps, completedSteps, taskSubjects }) {
    const ckTmpDir = path.join(os.tmpdir(), 'ck');

    // Write workflow state
    const workflowDir = path.join(ckTmpDir, 'workflow');
    fs.mkdirSync(workflowDir, { recursive: true });
    const workflowState = {
        workflowType: 'test-workflow',
        workflowSteps: workflowSteps || [],
        currentStepIndex: 0,
        completedSteps: completedSteps || [],
        activePlan: null,
        todos: [],
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        metadata: {}
    };
    fs.writeFileSync(path.join(workflowDir, `${sessionId}.json`), JSON.stringify(workflowState, null, 2));

    // Write todo state with taskSubjects
    const todoDir = path.join(ckTmpDir, 'todo');
    fs.mkdirSync(todoDir, { recursive: true });
    const todoState = {
        hasTodos: true,
        pendingCount: 1,
        completedCount: 0,
        inProgressCount: 0,
        lastTodos: [],
        taskSubjects: taskSubjects || {},
        lastUpdated: new Date().toISOString(),
        bypasses: [],
        metadata: {}
    };
    fs.writeFileSync(path.join(todoDir, `todo-state-${sessionId}.json`), JSON.stringify(todoState, null, 2));
}

/**
 * Clean up test state files
 */
function cleanupTestState(sessionId) {
    const ckTmpDir = path.join(os.tmpdir(), 'ck');
    try {
        fs.unlinkSync(path.join(ckTmpDir, 'workflow', `${sessionId}.json`));
    } catch {
        /* ignore */
    }
    try {
        fs.unlinkSync(path.join(ckTmpDir, 'todo', `todo-state-${sessionId}.json`));
    } catch {
        /* ignore */
    }
}

// ============================================================================
// Test Cases
// ============================================================================

async function runTests() {
    log('');
    log('╔════════════════════════════════════════════════════════════════╗');
    log('║          Workflow Task Guard Test Suite                        ║');
    log('╚════════════════════════════════════════════════════════════════╝');
    log('');

    const testSessionId = `test-guard-${Date.now()}`;
    const env = {
        CLAUDE_SESSION_ID: testSessionId,
        CK_SESSION_ID: testSessionId
    };

    // ── TC-WTG-001: Non-workflow task → allow ──
    log('  ── Non-workflow task (no /skill pattern) ──');
    {
        setupTestState(testSessionId, {
            workflowSteps: ['scout', 'investigate', 'plan'],
            completedSteps: [],
            taskSubjects: { 1: 'Fix the login bug' }
        });
        const result = await runHook(
            {
                tool_name: 'TaskUpdate',
                tool_input: { taskId: '1', status: 'completed' }
            },
            env
        );
        logResult('TC-WTG-001: Non-workflow task allows completion', result.code === 0);
        cleanupTestState(testSessionId);
    }

    // ── TC-WTG-002: Workflow task WITH skill invoked → allow ──
    log('  ── Workflow task with skill invoked ──');
    {
        setupTestState(testSessionId, {
            workflowSteps: ['scout', 'investigate', 'plan'],
            completedSteps: ['scout'],
            taskSubjects: { 2: '1. /scout — Find relevant files' }
        });
        const result = await runHook(
            {
                tool_name: 'TaskUpdate',
                tool_input: { taskId: '2', status: 'completed' }
            },
            env
        );
        logResult('TC-WTG-002: Workflow task with skill invoked allows completion', result.code === 0);
        cleanupTestState(testSessionId);
    }

    // ── TC-WTG-003: Workflow task WITHOUT skill invoked → block ──
    log('  ── Workflow task without skill invoked ──');
    {
        setupTestState(testSessionId, {
            workflowSteps: ['scout', 'investigate', 'plan'],
            completedSteps: [],
            taskSubjects: { 3: '1. /scout — Find relevant files' }
        });
        const result = await runHook(
            {
                tool_name: 'TaskUpdate',
                tool_input: { taskId: '3', status: 'completed' }
            },
            env
        );
        logResult('TC-WTG-003: Workflow task without skill invoked blocks completion', result.code === 2, `got exit ${result.code}`);
        logResult('TC-WTG-003: Block message mentions skill name', result.stderr.includes('/scout'));
        cleanupTestState(testSessionId);
    }

    // ── TC-WTG-004: TaskUpdate(in_progress) → allow (only guards completed) ──
    log('  ── Non-completion status ──');
    {
        setupTestState(testSessionId, {
            workflowSteps: ['scout', 'investigate'],
            completedSteps: [],
            taskSubjects: { 4: '1. /scout — Find files' }
        });
        const result = await runHook(
            {
                tool_name: 'TaskUpdate',
                tool_input: { taskId: '4', status: 'in_progress' }
            },
            env
        );
        logResult('TC-WTG-004: in_progress status allows through', result.code === 0);
        cleanupTestState(testSessionId);
    }

    // ── TC-WTG-005: No active workflow → allow all ──
    log('  ── No active workflow ──');
    {
        // Don't set up workflow state — just todo state
        const noWfSession = `test-no-wf-${Date.now()}`;
        const ckTmpDir = path.join(os.tmpdir(), 'ck');
        const todoDir = path.join(ckTmpDir, 'todo');
        fs.mkdirSync(todoDir, { recursive: true });
        fs.writeFileSync(
            path.join(todoDir, `todo-state-${noWfSession}.json`),
            JSON.stringify({
                hasTodos: true,
                pendingCount: 1,
                completedCount: 0,
                inProgressCount: 0,
                lastTodos: [],
                taskSubjects: { 5: '1. /scout — Find files' },
                lastUpdated: new Date().toISOString(),
                bypasses: [],
                metadata: {}
            })
        );
        const result = await runHook(
            {
                tool_name: 'TaskUpdate',
                tool_input: { taskId: '5', status: 'completed' }
            },
            { CLAUDE_SESSION_ID: noWfSession, CK_SESSION_ID: noWfSession }
        );
        logResult('TC-WTG-005: No active workflow allows completion', result.code === 0);
        try {
            fs.unlinkSync(path.join(todoDir, `todo-state-${noWfSession}.json`));
        } catch {
            /* */
        }
    }

    // ── TC-WTG-006: Task subject without /skill pattern → allow ──
    log('  ── Task without slash prefix ──');
    {
        setupTestState(testSessionId, {
            workflowSteps: ['scout', 'investigate'],
            completedSteps: [],
            taskSubjects: { 6: 'Review the implementation for quality' }
        });
        const result = await runHook(
            {
                tool_name: 'TaskUpdate',
                tool_input: { taskId: '6', status: 'completed' }
            },
            env
        );
        logResult('TC-WTG-006: Task without /skill pattern allows completion', result.code === 0);
        cleanupTestState(testSessionId);
    }

    // ── TC-WTG-007: Non-TaskUpdate tool → passthrough ──
    log('  ── Non-TaskUpdate tool ──');
    {
        const result = await runHook(
            {
                tool_name: 'TaskCreate',
                tool_input: { subject: 'Test' }
            },
            env
        );
        logResult('TC-WTG-007: TaskCreate passes through', result.code === 0);
    }

    // ── TC-WTG-008: Empty/malformed input → fail-open ──
    log('  ── Edge cases ──');
    {
        const result1 = await runHook('', env);
        logResult('TC-WTG-008a: Empty input → exit 0', result1.code === 0);
        const result2 = await runHook('not-json', env);
        logResult('TC-WTG-008b: Malformed JSON → exit 0', result2.code === 0);
    }

    // ── TC-WTG-009: Unknown taskId (not in taskSubjects) → allow ──
    log('  ── Unknown taskId ──');
    {
        setupTestState(testSessionId, {
            workflowSteps: ['scout', 'investigate'],
            completedSteps: [],
            taskSubjects: {} // empty — taskId 99 not tracked
        });
        const result = await runHook(
            {
                tool_name: 'TaskUpdate',
                tool_input: { taskId: '99', status: 'completed' }
            },
            env
        );
        logResult('TC-WTG-009: Unknown taskId allows completion', result.code === 0);
        cleanupTestState(testSessionId);
    }

    // ── TC-WTG-010: Missing taskId in tool_input → allow ──
    log('  ── Missing taskId ──');
    {
        const result = await runHook(
            {
                tool_name: 'TaskUpdate',
                tool_input: { status: 'completed' }
            },
            env
        );
        logResult('TC-WTG-010: Missing taskId allows through', result.code === 0);
    }

    // ── TC-WTG-011: Skill doesn't map to any workflow step → allow ──
    log('  ── Unmapped skill ──');
    {
        setupTestState(testSessionId, {
            workflowSteps: ['scout', 'investigate'],
            completedSteps: [],
            taskSubjects: { 11: '1. /nonexistent-skill — Does not exist' }
        });
        const result = await runHook(
            {
                tool_name: 'TaskUpdate',
                tool_input: { taskId: '11', status: 'completed' }
            },
            env
        );
        logResult('TC-WTG-011: Unmapped skill allows completion', result.code === 0);
        cleanupTestState(testSessionId);
    }

    // ── Summary ──
    log('');
    log('────────────────────────────────────────────────────────────────');
    log(`  Results: ${passed} passed, ${failed} failed`);
    log('────────────────────────────────────────────────────────────────');
    log('');

    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Test suite error:', err);
    process.exit(1);
});
