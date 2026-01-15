import * as vscode from 'vscode';
import { AtomicState } from '../state/atomic-state';
import { SessionMetrics, SessionState } from '../types/state';

/**
 * Session lifecycle manager - equivalent to Claude Code's SessionStart/SessionEnd hooks
 *
 * Responsibilities:
 * - Initialize session on extension activation
 * - Restore previous session state if available
 * - Track session metrics (duration, edit count, tool usage)
 * - Persist session state atomically
 * - Cleanup on session end
 */
export class SessionLifecycleManager {
    // Prevent memory leaks from unbounded array growth
    private static readonly MAX_FILES = 1000;
    private static readonly MAX_COMMANDS = 1000;

    private sessionState: AtomicState<SessionState>;
    private currentSession: SessionState | null = null;
    private sessionStartTime: Date | null = null;
    private editCount: number = 0;
    private toolUseCount: number = 0;

    constructor(private context: vscode.ExtensionContext, private outputChannel: vscode.OutputChannel) {
        this.sessionState = new AtomicState<SessionState>(context.globalStorageUri.fsPath, 'session-state.json');
    }

    /**
     * Initialize new session or resume existing one
     * Equivalent to Claude Code's SessionStart hook
     */
    async initializeSession(): Promise<void> {
        this.sessionStartTime = new Date();

        try {
            // Attempt to restore previous session
            const previousSession = await this.sessionState.load();

            if (previousSession && this.shouldResumeSession(previousSession)) {
                this.currentSession = this.resumeSession(previousSession);
                this.outputChannel.appendLine(`[Session] Resumed session from ${previousSession.lastActiveDate}`);
            } else {
                this.currentSession = this.createNewSession();
                this.outputChannel.appendLine(`[Session] Started new session: ${this.currentSession.id}`);
            }

            // Reset counters for current session
            this.editCount = this.currentSession.metrics.editCount;
            this.toolUseCount = this.currentSession.metrics.toolUseCount;

            // Persist initial state
            await this.saveSessionState();
        } catch (error) {
            this.outputChannel.appendLine(`[Session] Error initializing: ${error}`);
            // Fallback to new session on error
            this.currentSession = this.createNewSession();
            await this.saveSessionState();
        }
    }

    /**
     * Determine if previous session should be resumed
     * Resume if last active within 24 hours
     */
    private shouldResumeSession(previousSession: SessionState): boolean {
        const lastActive = new Date(previousSession.lastActiveDate);
        const hoursSinceLastActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60);

        // Resume if last active within 24 hours and not explicitly ended
        return hoursSinceLastActive < 24 && !previousSession.endedAt;
    }

    /**
     * Resume existing session
     */
    private resumeSession(previousSession: SessionState): SessionState {
        return {
            ...previousSession,
            resumeCount: previousSession.resumeCount + 1,
            lastActiveDate: new Date().toISOString(),
            endedAt: undefined // Clear end timestamp
        };
    }

    /**
     * Create new session
     */
    private createNewSession(): SessionState {
        const sessionId = this.generateSessionId();

        return {
            id: sessionId,
            startedAt: new Date().toISOString(),
            lastActiveDate: new Date().toISOString(),
            resumeCount: 0,
            workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
            metrics: {
                durationSeconds: 0,
                editCount: 0,
                toolUseCount: 0,
                filesModified: [],
                commandsExecuted: []
            }
        };
    }

    /**
     * Generate unique session ID (timestamp + crypto-secure random)
     */
    private generateSessionId(): string {
        const timestamp = Date.now();
        // Use crypto-secure random instead of Math.random()
        const randomBytes = new Uint8Array(4);
        crypto.getRandomValues(randomBytes);
        const random = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
        return `session-${timestamp}-${random}`;
    }

    /**
     * Record file edit
     */
    recordEdit(filePath: string): void {
        if (!this.currentSession) {
            return;
        }

        this.editCount++;
        this.currentSession.metrics.editCount = this.editCount;

        // Track unique files modified (with bounds to prevent memory leak)
        if (!this.currentSession.metrics.filesModified.includes(filePath)) {
            if (this.currentSession.metrics.filesModified.length < SessionLifecycleManager.MAX_FILES) {
                this.currentSession.metrics.filesModified.push(filePath);
            }
        }

        // Update last active timestamp
        this.currentSession.lastActiveDate = new Date().toISOString();
    }

    /**
     * Record tool usage (terminal command, task execution, etc.)
     */
    recordToolUse(toolName: string): void {
        if (!this.currentSession) {
            return;
        }

        this.toolUseCount++;
        this.currentSession.metrics.toolUseCount = this.toolUseCount;

        // Track commands executed (with bounds to prevent memory leak)
        if (!this.currentSession.metrics.commandsExecuted.includes(toolName)) {
            if (this.currentSession.metrics.commandsExecuted.length < SessionLifecycleManager.MAX_COMMANDS) {
                this.currentSession.metrics.commandsExecuted.push(toolName);
            }
        }

        // Update last active timestamp
        this.currentSession.lastActiveDate = new Date().toISOString();
    }

    /**
     * Save current session state atomically
     */
    async saveSessionState(): Promise<void> {
        if (!this.currentSession) {
            return;
        }

        // Update session duration
        if (this.sessionStartTime) {
            const durationMs = Date.now() - this.sessionStartTime.getTime();
            this.currentSession.metrics.durationSeconds = Math.floor(durationMs / 1000);
        }

        await this.sessionState.save(this.currentSession);
    }

    /**
     * Cleanup session on extension deactivation
     * Equivalent to Claude Code's SessionEnd hook
     */
    async cleanupSession(): Promise<void> {
        if (!this.currentSession) {
            return;
        }

        try {
            // Mark session as ended
            this.currentSession.endedAt = new Date().toISOString();

            // Final state save
            await this.saveSessionState();

            const duration = this.currentSession.metrics.durationSeconds;
            const minutes = Math.floor(duration / 60);

            this.outputChannel.appendLine(
                `[Session] Ended session ${this.currentSession.id}\n` +
                    `  Duration: ${minutes} minutes\n` +
                    `  Edits: ${this.currentSession.metrics.editCount}\n` +
                    `  Files: ${this.currentSession.metrics.filesModified.length}\n` +
                    `  Tools: ${this.currentSession.metrics.toolUseCount}`
            );
        } catch (error) {
            this.outputChannel.appendLine(`[Session] Error during cleanup: ${error}`);
        }
    }

    /**
     * Clear session state (manual command)
     */
    async clearSession(): Promise<void> {
        this.outputChannel.appendLine('[Session] Clearing session state...');

        // End current session
        if (this.currentSession) {
            this.currentSession.endedAt = new Date().toISOString();
            await this.saveSessionState();
        }

        // Create fresh session
        this.currentSession = this.createNewSession();
        this.editCount = 0;
        this.toolUseCount = 0;
        this.sessionStartTime = new Date();

        await this.saveSessionState();

        vscode.window.showInformationMessage('Session state cleared. New session started.');
    }

    /**
     * Get current session metrics for display
     */
    getSessionMetrics(): SessionMetrics | null {
        if (!this.currentSession) {
            return null;
        }

        // Update duration before returning
        if (this.sessionStartTime) {
            const durationMs = Date.now() - this.sessionStartTime.getTime();
            this.currentSession.metrics.durationSeconds = Math.floor(durationMs / 1000);
        }

        return this.currentSession.metrics;
    }

    /**
     * Get current session info
     */
    getCurrentSession(): SessionState | null {
        return this.currentSession;
    }

    /**
     * Create checkpoint (manual snapshot)
     */
    async createCheckpoint(description?: string): Promise<void> {
        if (!this.currentSession) {
            vscode.window.showWarningMessage('No active session to checkpoint');
            return;
        }

        const checkpointId = `checkpoint-${Date.now()}`;
        const checkpointData = {
            ...this.currentSession,
            checkpointId,
            checkpointDescription: description || 'Manual checkpoint',
            checkpointDate: new Date().toISOString()
        };

        // Save checkpoint to separate file
        const checkpointState = new AtomicState<any>(this.context.globalStorageUri.fsPath, `${checkpointId}.json`);

        await checkpointState.save(checkpointData);

        this.outputChannel.appendLine(`[Session] Checkpoint created: ${checkpointId}`);
        vscode.window.showInformationMessage(`Checkpoint created: ${checkpointId}`);
    }

    /**
     * Compact context (analyze and optimize)
     * Placeholder for future implementation - Claude Code's context compaction
     */
    async compactContext(): Promise<void> {
        // TODO: Phase 3 - Implement context analysis
        vscode.window.showInformationMessage('Context compaction not yet implemented (Phase 3)');
    }
}
