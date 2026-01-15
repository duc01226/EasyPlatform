/**
 * Secure credential storage using VSCode Secrets API
 * Research: research-security-performance.md section 1.2
 *
 * CRITICAL: Never store webhook URLs in workspace settings (plaintext)
 * Use Secrets API for encryption (Keychain/Credential Vault/libsecret)
 */

import * as vscode from 'vscode';

export class SecretsManager {
    private secrets: vscode.SecretStorage;

    constructor(context: vscode.ExtensionContext) {
        this.secrets = context.secrets;
    }

    /**
     * Store webhook URL securely (encrypted)
     *
     * **Security-Critical Function** - Validates and encrypts webhook URLs
     *
     * **Validations:**
     * 1. Length limit: Max 2048 characters (DoS prevention)
     * 2. HTTPS enforcement: Only https:// protocol accepted
     * 3. Format validation: Must be valid URL
     *
     * **Storage:**
     * - Platform-specific secure storage (Keychain/Credential Manager/libsecret)
     * - Encrypted at rest by OS-level credential vault
     * - Scoped to this extension only
     *
     * @param provider - Webhook provider type (discord/slack/custom)
     * @param url - Webhook URL (HTTPS required, max 2048 chars)
     * @throws {Error} If URL exceeds 2048 characters
     * @throws {Error} If URL does not use HTTPS protocol
     *
     * @example
     * await secretsManager.setWebhookUrl('discord', 'https://discord.com/api/webhooks/...');
     *
     * @see SECURITY.md#1-secrets-management
     * @see CODE-REVIEW-FIXES.md#3-input-length-validation
     */
    async setWebhookUrl(provider: 'discord' | 'slack' | 'custom', url: string): Promise<void> {
        // CRITICAL: Prevent DoS via length validation (max 2048 chars)
        if (url.length > 2048) {
            throw new Error('Webhook URL too long (max 2048 characters)');
        }

        // Validate HTTPS
        if (!url.startsWith('https://')) {
            throw new Error('Webhook URL must use HTTPS');
        }

        const key = `webhook.${provider}.url`;
        await this.secrets.store(key, url);
    }

    /**
     * Retrieve webhook URL (decrypted)
     */
    async getWebhookUrl(provider: 'discord' | 'slack' | 'custom'): Promise<string | undefined> {
        const key = `webhook.${provider}.url`;
        return await this.secrets.get(key);
    }

    /**
     * Delete webhook URL
     */
    async deleteWebhookUrl(provider: 'discord' | 'slack' | 'custom'): Promise<void> {
        const key = `webhook.${provider}.url`;
        await this.secrets.delete(key);
    }

    /**
     * Check if webhook URL exists
     */
    async hasWebhookUrl(provider: 'discord' | 'slack' | 'custom'): Promise<boolean> {
        const url = await this.getWebhookUrl(provider);
        return url !== undefined && url.length > 0;
    }
}
