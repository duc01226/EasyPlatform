import * as vscode from 'vscode';
import { SecretsManager } from '../state/secrets-manager';
import { PathMatcher } from '../utils/path-matcher';
import { stripCredentials } from '../utils/validators';
import { SessionLifecycleManager } from './session';

/**
 * File edit hook manager - equivalent to Claude Code's PreToolUse:Edit and PostToolUse:Edit
 *
 * Responsibilities:
 * - Privacy blocking (prevent editing sensitive files)
 * - Scout pattern warnings (detect anti-patterns)
 * - Post-save formatting
 * - Edit tracking (file-level statistics)
 * - Webhook notifications (Discord/Slack)
 */
export class FileEditHookManager {
    private privacyPatterns: string[] = [];
    private scoutPatterns: string[] = [];
    private formattingLanguages: string[] = [];
    private webhookUrl: string | undefined;

    private privacyEnabled: boolean = false;
    private scoutEnabled: boolean = false;
    private formattingEnabled: boolean = false;
    private notificationsEnabled: boolean = false;

    // Cache PathMatcher instances to avoid repeated pattern compilation
    private privacyPatternCache: PathMatcher | null = null;
    private scoutPatternCache: PathMatcher | null = null;

    constructor(
        private context: vscode.ExtensionContext,
        private outputChannel: vscode.OutputChannel,
        private secretsManager: SecretsManager,
        private sessionManager: SessionLifecycleManager
    ) {}

    /**
     * Initialize file edit hooks
     */
    async initialize(): Promise<void> {
        // Load configuration
        await this.loadConfiguration();

        // Register file system watchers
        this.registerWatchers();

        this.outputChannel.appendLine('[FileEdit] File edit hooks initialized');
    }

    /**
     * Load configuration from VSCode settings
     */
    private async loadConfiguration(): Promise<void> {
        const config = vscode.workspace.getConfiguration('easyplatform.hooks');

        // Privacy blocking
        this.privacyEnabled = config.get<boolean>('privacy.enabled', true);
        this.privacyPatterns = config.get<string[]>('privacy.patterns', ['**/.env*', '**/secrets/**', '**/*.key', '**/*.pem', '**/id_rsa*']);
        // Rebuild PathMatcher cache on config change
        this.privacyPatternCache = this.privacyPatterns.length > 0 ? new PathMatcher(this.privacyPatterns) : null;

        // Scout patterns
        this.scoutEnabled = config.get<boolean>('scout.enabled', true);
        this.scoutPatterns = config.get<string[]>('scout.broadPatterns', ['**/*', '**/*.{ts,js,cs}']);
        // Rebuild PathMatcher cache on config change
        this.scoutPatternCache = this.scoutPatterns.length > 0 ? new PathMatcher(this.scoutPatterns) : null;

        // Formatting
        this.formattingEnabled = config.get<boolean>('formatting.enabled', true);
        this.formattingLanguages = config.get<string[]>('formatting.languages', ['typescript', 'javascript', 'csharp', 'json']);

        // Notifications
        this.notificationsEnabled = config.get<boolean>('notifications.enabled', false);
        if (this.notificationsEnabled) {
            // Try to load webhook URL from secrets
            this.webhookUrl = await this.secretsManager.getWebhookUrl('custom');
        }

        this.outputChannel.appendLine(
            `[FileEdit] Configuration loaded:\n` +
                `  Privacy: ${this.privacyEnabled} (${this.privacyPatterns.length} patterns)\n` +
                `  Scout: ${this.scoutEnabled} (${this.scoutPatterns.length} patterns)\n` +
                `  Formatting: ${this.formattingEnabled} (${this.formattingLanguages.length} languages)\n` +
                `  Notifications: ${this.notificationsEnabled}`
        );
    }

    /**
     * Register file system watchers
     */
    private registerWatchers(): void {
        // onWillSaveTextDocument - PreToolUse:Edit equivalent (blocking)
        this.context.subscriptions.push(
            vscode.workspace.onWillSaveTextDocument(async event => {
                await this.handleWillSave(event);
            })
        );

        // onDidSaveTextDocument - PostToolUse:Edit equivalent (non-blocking)
        this.context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument(async document => {
                await this.handleDidSave(document);
            })
        );

        // Configuration changes
        this.context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(async event => {
                if (event.affectsConfiguration('easyplatform.hooks')) {
                    this.outputChannel.appendLine('[FileEdit] Configuration changed, reloading...');
                    await this.loadConfiguration();
                }
            })
        );
    }

    /**
     * Handle onWillSaveTextDocument (blocking)
     * Equivalent to Claude Code's PreToolUse:Edit hook
     */
    private async handleWillSave(event: vscode.TextDocumentWillSaveEvent): Promise<void> {
        const document = event.document;
        const filePath = this.getRelativePath(document.uri);

        this.outputChannel.appendLine(`[FileEdit] Will save: ${filePath}`);

        // Privacy check (blocking)
        if (this.privacyEnabled && this.isPrivacyViolation(filePath)) {
            this.outputChannel.appendLine(`[FileEdit] BLOCKED: Privacy violation - ${filePath}`);

            // Show error and prevent save
            vscode.window.showErrorMessage(`Privacy Protection: Cannot save file matching privacy patterns.\nFile: ${filePath}`, { modal: true });

            // Prevent save by adding a failing wait until promise
            event.waitUntil(Promise.reject(new Error('Privacy protection: File matches blocked patterns')));
            return;
        }

        // Scout pattern warning (non-blocking warning)
        if (this.scoutEnabled && this.isScoutPattern(filePath)) {
            this.outputChannel.appendLine(`[FileEdit] WARNING: Scout pattern detected - ${filePath}`);

            vscode.window.showWarningMessage(
                `Scout Warning: This file matches a pattern that should typically be excluded.\nFile: ${filePath}`,
                'Continue Anyway'
            );
        }
    }

    /**
     * Handle onDidSaveTextDocument (non-blocking)
     * Equivalent to Claude Code's PostToolUse:Edit hook
     */
    private async handleDidSave(document: vscode.TextDocument): Promise<void> {
        const filePath = this.getRelativePath(document.uri);

        this.outputChannel.appendLine(`[FileEdit] Did save: ${filePath}`);

        // Track edit in session
        this.sessionManager.recordEdit(filePath);

        // Post-save formatting (if enabled and language matches)
        if (this.formattingEnabled && this.shouldFormat(document)) {
            await this.formatDocument(document);
        }

        // Send webhook notification (if enabled)
        if (this.notificationsEnabled && this.webhookUrl) {
            await this.sendNotification(filePath, document);
        }
    }

    /**
     * Check if file matches privacy patterns (blocking)
     */
    private isPrivacyViolation(filePath: string): boolean {
        // Use cached PathMatcher to avoid repeated pattern compilation
        if (!this.privacyPatternCache) {
            return false;
        }
        return this.privacyPatternCache.matches(filePath);
    }

    /**
     * Check if file matches scout patterns (warning only)
     */
    private isScoutPattern(filePath: string): boolean {
        // Use cached PathMatcher to avoid repeated pattern compilation
        if (!this.scoutPatternCache) {
            return false;
        }
        return this.scoutPatternCache.matches(filePath);
    }

    /**
     * Determine if document should be formatted
     */
    private shouldFormat(document: vscode.TextDocument): boolean {
        if (!this.formattingLanguages.length) {
            return false;
        }

        return this.formattingLanguages.includes(document.languageId);
    }

    /**
     * Format document using VSCode formatter
     */
    private async formatDocument(document: vscode.TextDocument): Promise<void> {
        try {
            await vscode.commands.executeCommand('editor.action.formatDocument', document.uri);
            this.outputChannel.appendLine(`[FileEdit] Formatted: ${document.fileName}`);
        } catch (error) {
            this.outputChannel.appendLine(`[FileEdit] Format failed: ${error}`);
        }
    }

    /**
     * Send webhook notification
     */
    private async sendNotification(filePath: string, document: vscode.TextDocument): Promise<void> {
        if (!this.webhookUrl) {
            return;
        }

        try {
            // Get file content preview (first 200 chars, sanitized)
            const content = document.getText();
            const preview = stripCredentials(content.substring(0, 200));

            const payload = {
                embeds: [
                    {
                        title: '📝 File Saved',
                        description: `**File:** \`${filePath}\`\n**Language:** ${document.languageId}\n**Lines:** ${document.lineCount}`,
                        color: 0x5865f2, // Discord blue
                        fields: [
                            {
                                name: 'Preview',
                                value: `\`\`\`${document.languageId}\n${preview}${content.length > 200 ? '...' : ''}\n\`\`\``
                            }
                        ],
                        timestamp: new Date().toISOString()
                    }
                ]
            };

            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(5000) // CRITICAL: 5s timeout
            });

            if (!response.ok) {
                throw new Error(`Webhook failed: ${response.status}`);
            }

            this.outputChannel.appendLine(`[FileEdit] Notification sent for: ${filePath}`);
        } catch (error) {
            this.outputChannel.appendLine(`[FileEdit] Notification failed: ${error}`);
        }
    }

    /**
     * Get workspace-relative file path
     */
    private getRelativePath(uri: vscode.Uri): string {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (workspaceFolder) {
            return vscode.workspace.asRelativePath(uri, false);
        }
        return uri.fsPath;
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        // Watchers are disposed via context.subscriptions
    }
}
