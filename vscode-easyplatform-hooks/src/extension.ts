/**
 * EasyPlatform Hooks - VSCode Extension Entry Point
 * Research: phase-01-extension-scaffold.md
 *
 * Replicates Claude Code hook system with 60% direct coverage:
 * - Session lifecycle (activate/deactivate)
 * - File edit hooks (privacy, scout, formatting)
 * - Task tracking
 * - Notification integration
 */

import * as vscode from 'vscode';
import { FileEditHookManager } from './hooks/file-edit';
import { SessionLifecycleManager } from './hooks/session';
import { SecretsManager } from './state/secrets-manager';

let outputChannel: vscode.OutputChannel;
let secretsManager: SecretsManager;
let sessionManager: SessionLifecycleManager;
let fileEditManager: FileEditHookManager;

/**
 * Extension activation entry point
 *
 * **Initialization Flow:**
 * 1. Create output channel for logging
 * 2. Initialize SecretsManager (webhook URL storage)
 * 3. Initialize SessionLifecycleManager (SessionStart hook)
 * 4. Initialize FileEditHookManager (PreToolUse/PostToolUse:Edit hooks)
 * 5. Register extension commands
 *
 * **Error Handling:**
 * - Wrapped in try-catch (error boundary)
 * - User-facing error dialog on failure
 * - Option to view logs for debugging
 * - Re-throws error to mark extension as failed in VSCode
 *
 * **Failure Scenarios:**
 * - Secrets API unavailable (platform issue)
 * - File system permissions denied (state directory)
 * - Invalid configuration (malformed settings)
 *
 * @param context - VSCode extension context (provides secrets, storage, subscriptions)
 * @throws {Error} Re-throws initialization errors after showing user dialog
 *
 * @see CODE-REVIEW-FIXES.md#8-error-boundary-in-activate
 */
export async function activate(context: vscode.ExtensionContext) {
    try {
        outputChannel = vscode.window.createOutputChannel('EasyPlatform Hooks');
        outputChannel.appendLine('EasyPlatform Hooks activated');

        // Initialize managers
        secretsManager = new SecretsManager(context);
        sessionManager = new SessionLifecycleManager(context, outputChannel);
        fileEditManager = new FileEditHookManager(context, outputChannel, secretsManager, sessionManager);

        // Initialize session (SessionStart hook equivalent)
        await sessionManager.initializeSession();

        // Initialize file edit hooks (PreToolUse/PostToolUse:Edit equivalent)
        await fileEditManager.initialize();

        // Register commands
        registerCommands(context);

        outputChannel.appendLine('EasyPlatform Hooks: Activated successfully');
    } catch (error) {
        // Error boundary: Show user-facing error message
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to activate EasyPlatform Hooks: ${message}`, 'View Logs').then(selection => {
            if (selection === 'View Logs' && outputChannel) {
                outputChannel.show();
            }
        });
        throw error; // Re-throw to mark extension as failed
    }
}

export async function deactivate() {
    outputChannel.appendLine('EasyPlatform Hooks deactivating...');

    // Cleanup file edit hooks
    if (fileEditManager) {
        fileEditManager.dispose();
    }

    // Cleanup session (SessionEnd hook equivalent)
    if (sessionManager) {
        await sessionManager.cleanupSession();
    }

    outputChannel.appendLine('EasyPlatform Hooks deactivated');
    outputChannel.dispose();
}

/**
 * Register extension commands
 */
function registerCommands(context: vscode.ExtensionContext) {
    // Clear session
    context.subscriptions.push(
        vscode.commands.registerCommand('easyplatform.clearSession', async () => {
            await sessionManager.clearSession();
        })
    );

    // Compact context (manual trigger, no auto-compact in VSCode)
    context.subscriptions.push(
        vscode.commands.registerCommand('easyplatform.compactContext', async () => {
            await sessionManager.compactContext();
        })
    );

    // Create checkpoint
    context.subscriptions.push(
        vscode.commands.registerCommand('easyplatform.createCheckpoint', async () => {
            const description = await vscode.window.showInputBox({
                prompt: 'Enter checkpoint description (optional)',
                placeHolder: 'e.g., Before major refactoring'
            });
            await sessionManager.createCheckpoint(description);
        })
    );

    // Learn pattern
    context.subscriptions.push(
        vscode.commands.registerCommand('easyplatform.learnPattern', async () => {
            const input = await vscode.window.showInputBox({
                prompt: 'Describe the pattern to learn',
                placeHolder: 'e.g., Always use IPlatformRepository instead of generic repository'
            });

            if (input) {
                outputChannel.appendLine(`Pattern learned: ${input}`);
                vscode.window.showInformationMessage(`Pattern learned: ${input}`);
            }
        })
    );

    // Configure webhook URL (using Secrets API)
    context.subscriptions.push(
        vscode.commands.registerCommand('easyplatform.configureWebhook', async () => {
            const provider = await vscode.window.showQuickPick(['Discord', 'Slack', 'Custom'], { placeHolder: 'Select notification provider' });

            if (!provider) {
                return;
            }

            const url = await vscode.window.showInputBox({
                prompt: `Enter ${provider} webhook URL (HTTPS only)`,
                placeHolder: 'https://...',
                validateInput: value => {
                    if (!value.startsWith('https://')) {
                        return 'Webhook URL must use HTTPS';
                    }
                    return null;
                }
            });

            if (url) {
                try {
                    await secretsManager.setWebhookUrl('custom', url);
                    vscode.window.showInformationMessage(`${provider} webhook configured securely`);
                } catch (err: any) {
                    vscode.window.showErrorMessage(`Failed to save webhook URL: ${err.message}`);
                }
            }
        })
    );

    // View edit statistics
    context.subscriptions.push(
        vscode.commands.registerCommand('easyplatform.viewEditStats', async () => {
            const metrics = sessionManager.getSessionMetrics();
            const session = sessionManager.getCurrentSession();

            if (!metrics || !session) {
                vscode.window.showInformationMessage('No active session');
                return;
            }

            const durationMinutes = Math.floor(metrics.durationSeconds / 60);
            const message =
                `Session: ${session.id}\n` +
                `Duration: ${durationMinutes} minutes\n` +
                `Edits: ${metrics.editCount}\n` +
                `Files Modified: ${metrics.filesModified.length}\n` +
                `Tool Uses: ${metrics.toolUseCount}`;

            vscode.window.showInformationMessage(message, { modal: true });
        })
    );
}
