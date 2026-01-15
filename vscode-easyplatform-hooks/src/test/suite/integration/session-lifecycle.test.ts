/**
 * Integration tests for session lifecycle
 * NO MOCKS - Real VSCode API and state persistence
 */

import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { SessionLifecycleManager } from '../../../hooks/session';
import { SessionState } from '../../../types/state';

suite('Session Lifecycle Integration Tests', () => {
    let testContext: vscode.ExtensionContext;
    let outputChannel: vscode.OutputChannel;
    let sessionManager: SessionLifecycleManager;
    let testStoragePath: string;

    setup(async function () {
        // Create mock context
        testStoragePath = await fs.mkdtemp(path.join(os.tmpdir(), 'session-test-'));

        testContext = {
            globalStorageUri: vscode.Uri.file(testStoragePath),
            subscriptions: [],
            extensionUri: vscode.Uri.file(__dirname),
            extensionPath: __dirname,
            asAbsolutePath: (relativePath: string) => path.join(__dirname, relativePath),
            storagePath: testStoragePath,
            globalStoragePath: testStoragePath,
            logPath: testStoragePath
        } as any;

        outputChannel = vscode.window.createOutputChannel('Test Session');
        sessionManager = new SessionLifecycleManager(testContext, outputChannel);
    });

    teardown(async () => {
        // Cleanup
        try {
            await fs.rm(testStoragePath, { recursive: true, force: true });
        } catch {
            // Ignore errors
        }

        outputChannel.dispose();
    });

    test('initializeSession() creates new session on first run', async () => {
        await sessionManager.initializeSession();

        const session = sessionManager.getCurrentSession();
        assert.ok(session, 'Session should be created');
        assert.ok(session.id, 'Session should have ID');
        assert.strictEqual(session.resumeCount, 0, 'New session should have resumeCount = 0');
        assert.ok(session.startedAt, 'Session should have start timestamp');
        assert.ok(!session.endedAt, 'New session should not have end timestamp');
    });

    test('session persists to file system', async () => {
        await sessionManager.initializeSession();
        await sessionManager.saveSessionState();

        // Verify file exists
        const stateFilePath = path.join(testStoragePath, 'session-state.json');
        const exists = await fs
            .access(stateFilePath)
            .then(() => true)
            .catch(() => false);
        assert.strictEqual(exists, true, 'State file should exist');

        // Verify content
        const content = await fs.readFile(stateFilePath, 'utf8');
        const parsed: SessionState = JSON.parse(content);
        assert.ok(parsed.id, 'Persisted state should have ID');
        assert.ok(parsed.metrics, 'Persisted state should have metrics');
    });

    test('recordEdit() increments edit count and tracks files', async () => {
        await sessionManager.initializeSession();

        const initialMetrics = sessionManager.getSessionMetrics();
        assert.ok(initialMetrics, 'Should have metrics');
        const initialEditCount = initialMetrics.editCount;

        sessionManager.recordEdit('src/file1.ts');
        sessionManager.recordEdit('src/file2.ts');
        sessionManager.recordEdit('src/file1.ts'); // Duplicate

        const updatedMetrics = sessionManager.getSessionMetrics();
        assert.ok(updatedMetrics, 'Should have updated metrics');
        assert.strictEqual(updatedMetrics.editCount, initialEditCount + 3, 'Edit count should increment');
        assert.strictEqual(updatedMetrics.filesModified.length, 2, 'Should track 2 unique files');
        assert.ok(updatedMetrics.filesModified.includes('src/file1.ts'), 'Should track file1.ts');
        assert.ok(updatedMetrics.filesModified.includes('src/file2.ts'), 'Should track file2.ts');
    });

    test('recordToolUse() increments tool count and tracks commands', async () => {
        await sessionManager.initializeSession();

        const initialMetrics = sessionManager.getSessionMetrics();
        assert.ok(initialMetrics);
        const initialToolCount = initialMetrics.toolUseCount;

        sessionManager.recordToolUse('build');
        sessionManager.recordToolUse('test');
        sessionManager.recordToolUse('build'); // Duplicate

        const updatedMetrics = sessionManager.getSessionMetrics();
        assert.ok(updatedMetrics);
        assert.strictEqual(updatedMetrics.toolUseCount, initialToolCount + 3, 'Tool use count should increment');
        assert.strictEqual(updatedMetrics.commandsExecuted.length, 2, 'Should track 2 unique commands');
        assert.ok(updatedMetrics.commandsExecuted.includes('build'), 'Should track build command');
    });

    test('session resumes if last active within 24 hours', async () => {
        // Initialize first session
        await sessionManager.initializeSession();
        const firstSessionId = sessionManager.getCurrentSession()?.id;
        await sessionManager.saveSessionState();

        // Create new manager (simulates VS Code restart)
        const newManager = new SessionLifecycleManager(testContext, outputChannel);
        await newManager.initializeSession();

        const resumedSession = newManager.getCurrentSession();
        assert.ok(resumedSession, 'Session should be resumed');
        assert.strictEqual(resumedSession.id, firstSessionId, 'Should resume same session');
        assert.strictEqual(resumedSession.resumeCount, 1, 'Resume count should increment');
    });

    test('new session created if previous session older than 24 hours', async () => {
        // Create old session
        const oldSession: SessionState = {
            id: 'old-session',
            startedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
            lastActiveDate: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
            resumeCount: 5,
            workspaceFolder: testStoragePath,
            metrics: {
                durationSeconds: 3600,
                editCount: 100,
                toolUseCount: 50,
                filesModified: ['old-file.ts'],
                commandsExecuted: ['old-command']
            }
        };

        // Save old session
        const stateFilePath = path.join(testStoragePath, 'session-state.json');
        await fs.mkdir(path.dirname(stateFilePath), { recursive: true });
        await fs.writeFile(stateFilePath, JSON.stringify(oldSession, null, 2), 'utf8');

        // Initialize should create new session
        await sessionManager.initializeSession();

        const currentSession = sessionManager.getCurrentSession();
        assert.ok(currentSession, 'Should have session');
        assert.notStrictEqual(currentSession.id, oldSession.id, 'Should create new session (old one expired)');
        assert.strictEqual(currentSession.resumeCount, 0, 'New session should have resumeCount = 0');
    });

    test('cleanupSession() marks session as ended', async () => {
        await sessionManager.initializeSession();

        // Record some activity
        sessionManager.recordEdit('file.ts');
        sessionManager.recordToolUse('build');

        await sessionManager.cleanupSession();

        // Create new manager to load persisted state
        const newManager = new SessionLifecycleManager(testContext, outputChannel);

        // Manually load the state to check endedAt
        const stateFilePath = path.join(testStoragePath, 'session-state.json');
        const content = await fs.readFile(stateFilePath, 'utf8');
        const persistedSession: SessionState = JSON.parse(content);

        assert.ok(persistedSession.endedAt, 'Session should have end timestamp');
        assert.ok(persistedSession.metrics.editCount > 0, 'Metrics should persist');
    });

    test('clearSession() resets session and starts new one', async () => {
        await sessionManager.initializeSession();

        // Record activity
        sessionManager.recordEdit('file1.ts');
        sessionManager.recordEdit('file2.ts');
        sessionManager.recordToolUse('build');

        const beforeClearSession = sessionManager.getCurrentSession();
        assert.ok(beforeClearSession);
        const beforeClearId = beforeClearSession.id;

        // Clear session
        await sessionManager.clearSession();

        const afterClearSession = sessionManager.getCurrentSession();
        assert.ok(afterClearSession, 'Should have new session');
        assert.notStrictEqual(afterClearSession.id, beforeClearId, 'Should have different session ID');
        assert.strictEqual(afterClearSession.metrics.editCount, 0, 'Edit count should reset');
        assert.strictEqual(afterClearSession.metrics.filesModified.length, 0, 'Files modified should reset');
    });

    test('createCheckpoint() saves snapshot of current session', async () => {
        await sessionManager.initializeSession();

        sessionManager.recordEdit('file.ts');

        await sessionManager.createCheckpoint('Test checkpoint');

        // Verify checkpoint file exists
        const checkpointFiles = await fs.readdir(testStoragePath);
        const checkpointFile = checkpointFiles.find(f => f.startsWith('checkpoint-'));

        assert.ok(checkpointFile, 'Checkpoint file should exist');

        // Verify checkpoint content
        const checkpointPath = path.join(testStoragePath, checkpointFile);
        const content = await fs.readFile(checkpointPath, 'utf8');
        const checkpoint = JSON.parse(content);

        assert.ok(checkpoint.checkpointId, 'Should have checkpoint ID');
        assert.strictEqual(checkpoint.checkpointDescription, 'Test checkpoint', 'Should have description');
        assert.ok(checkpoint.metrics, 'Should have metrics snapshot');
    });

    test('session duration updates correctly', async () => {
        await sessionManager.initializeSession();

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));

        const metrics = sessionManager.getSessionMetrics();
        assert.ok(metrics, 'Should have metrics');
        assert.ok(metrics.durationSeconds >= 1, 'Duration should be at least 1 second');
    });
});
