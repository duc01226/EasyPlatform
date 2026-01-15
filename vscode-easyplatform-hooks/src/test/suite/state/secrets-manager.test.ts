/**
 * Tests for secrets manager using VSCode Secrets API
 * NO MOCKS - Real VSCode API calls
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { SecretsManager } from '../../../state/secrets-manager';

suite('SecretsManager Tests', () => {
    let secretsManager: SecretsManager;
    let context: vscode.ExtensionContext;

    suiteSetup(function () {
        // Get real extension context from VSCode API
        context = (global as any).testExtensionContext;

        if (!context) {
            this.skip(); // Skip if no context available
        }

        secretsManager = new SecretsManager(context);
    });

    teardown(async () => {
        // Cleanup: Remove all test secrets
        if (secretsManager) {
            try {
                await secretsManager.deleteWebhookUrl('discord');
                await secretsManager.deleteWebhookUrl('slack');
                await secretsManager.deleteWebhookUrl('custom');
            } catch {
                // Ignore cleanup errors
            }
        }
    });

    test('setWebhookUrl() stores HTTPS URL in encrypted storage', async function () {
        if (!secretsManager) {
            this.skip();
        }

        const testUrl = 'https://discord.com/api/webhooks/123456789/abcdefg';

        await secretsManager.setWebhookUrl('discord', testUrl);

        const retrieved = await secretsManager.getWebhookUrl('discord');
        assert.strictEqual(retrieved, testUrl, 'Retrieved URL should match stored URL');
    });

    test('setWebhookUrl() rejects non-HTTPS URLs', async function () {
        if (!secretsManager) {
            this.skip();
        }

        const httpUrl = 'http://example.com/webhook';

        await assert.rejects(async () => await secretsManager.setWebhookUrl('discord', httpUrl), /must use HTTPS/, 'Should reject HTTP URLs');
    });

    test('getWebhookUrl() returns undefined when no URL stored', async function () {
        if (!secretsManager) {
            this.skip();
        }

        const retrieved = await secretsManager.getWebhookUrl('custom');
        assert.strictEqual(retrieved, undefined, 'Should return undefined for non-existent secret');
    });

    test('deleteWebhookUrl() removes stored secret', async function () {
        if (!secretsManager) {
            this.skip();
        }

        const testUrl = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX';

        await secretsManager.setWebhookUrl('slack', testUrl);

        // Verify stored
        let retrieved = await secretsManager.getWebhookUrl('slack');
        assert.strictEqual(retrieved, testUrl, 'URL should be stored');

        // Delete
        await secretsManager.deleteWebhookUrl('slack');

        // Verify deleted
        retrieved = await secretsManager.getWebhookUrl('slack');
        assert.strictEqual(retrieved, undefined, 'URL should be deleted');
    });

    test('hasWebhookUrl() returns true when URL exists', async function () {
        if (!secretsManager) {
            this.skip();
        }

        const testUrl = 'https://example.com/webhook';

        await secretsManager.setWebhookUrl('custom', testUrl);

        const exists = await secretsManager.hasWebhookUrl('custom');
        assert.strictEqual(exists, true, 'Should return true for existing URL');
    });

    test('hasWebhookUrl() returns false when URL does not exist', async function () {
        if (!secretsManager) {
            this.skip();
        }

        const exists = await secretsManager.hasWebhookUrl('discord');
        assert.strictEqual(exists, false, 'Should return false for non-existent URL');
    });

    test('supports multiple providers independently', async function () {
        if (!secretsManager) {
            this.skip();
        }

        const discordUrl = 'https://discord.com/api/webhooks/111/aaa';
        const slackUrl = 'https://hooks.slack.com/services/222/bbb';
        const customUrl = 'https://custom.com/webhook';

        await secretsManager.setWebhookUrl('discord', discordUrl);
        await secretsManager.setWebhookUrl('slack', slackUrl);
        await secretsManager.setWebhookUrl('custom', customUrl);

        const retrievedDiscord = await secretsManager.getWebhookUrl('discord');
        const retrievedSlack = await secretsManager.getWebhookUrl('slack');
        const retrievedCustom = await secretsManager.getWebhookUrl('custom');

        assert.strictEqual(retrievedDiscord, discordUrl, 'Discord URL should match');
        assert.strictEqual(retrievedSlack, slackUrl, 'Slack URL should match');
        assert.strictEqual(retrievedCustom, customUrl, 'Custom URL should match');
    });

    test('updating URL overwrites previous value', async function () {
        if (!secretsManager) {
            this.skip();
        }

        const url1 = 'https://example.com/webhook1';
        const url2 = 'https://example.com/webhook2';

        await secretsManager.setWebhookUrl('discord', url1);
        let retrieved = await secretsManager.getWebhookUrl('discord');
        assert.strictEqual(retrieved, url1);

        await secretsManager.setWebhookUrl('discord', url2);
        retrieved = await secretsManager.getWebhookUrl('discord');
        assert.strictEqual(retrieved, url2, 'Should overwrite with new URL');
    });
});
