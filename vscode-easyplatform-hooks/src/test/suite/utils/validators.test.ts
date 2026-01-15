/**
 * Tests for validation utilities
 * NO MOCKS - Real validation logic
 */

import * as assert from 'assert';
import { isValidWebhookUrl, sanitizeContent, sanitizePath, stripCredentials } from '../../../utils/validators';

suite('Validators Tests', () => {
    suite('isValidWebhookUrl()', () => {
        test('accepts valid HTTPS URLs', () => {
            const validUrls = [
                'https://discord.com/api/webhooks/123456789/abcdefg',
                'https://hooks.slack.com/services/T00/B00/XXX',
                'https://example.com/webhook',
                'https://api.example.com:8443/webhook',
                'https://webhook.site/unique-id'
            ];

            for (const url of validUrls) {
                assert.strictEqual(isValidWebhookUrl(url), true, `URL should be valid: ${url}`);
            }
        });

        test('rejects HTTP URLs (non-HTTPS)', () => {
            const httpUrls = ['http://example.com/webhook', 'http://discord.com/api/webhooks/123/abc', 'http://localhost:3000/webhook'];

            for (const url of httpUrls) {
                assert.strictEqual(isValidWebhookUrl(url), false, `HTTP URL should be rejected: ${url}`);
            }
        });

        test('rejects URLs with credentials', () => {
            const urlsWithCreds = [
                'https://user:password@example.com/webhook',
                'https://admin:secret@hooks.slack.com/services/T/B/X',
                'https://apikey:token@discord.com/webhook'
            ];

            for (const url of urlsWithCreds) {
                assert.strictEqual(isValidWebhookUrl(url), false, `URL with credentials should be rejected: ${url}`);
            }
        });

        test('rejects invalid URLs', () => {
            const invalidUrls = ['not-a-url', 'ftp://example.com/file', '//example.com', '', 'https://', 'javascript:alert(1)'];

            for (const url of invalidUrls) {
                assert.strictEqual(isValidWebhookUrl(url), false, `Invalid URL should be rejected: ${url}`);
            }
        });
    });

    suite('sanitizePath()', () => {
        test('escapes HTML special characters', () => {
            const testCases = [
                { input: 'src/file.ts', expected: 'src/file.ts' },
                { input: '<script>alert(1)</script>', expected: '&lt;script&gt;alert(1)&lt;/script&gt;' },
                { input: 'file"with"quotes.ts', expected: 'file&quot;with&quot;quotes.ts' },
                { input: "file'with'single.ts", expected: 'file&#39;with&#39;single.ts' },
                { input: 'a<b>c"d\'e', expected: 'a&lt;b&gt;c&quot;d&#39;e' }
            ];

            for (const { input, expected } of testCases) {
                assert.strictEqual(sanitizePath(input), expected, `Should escape: ${input}`);
            }
        });

        test('prevents XSS in webview contexts', () => {
            const xssAttempts = [
                '<img src=x onerror=alert(1)>',
                '<iframe src="javascript:alert(1)">',
                '"><script>alert(1)</script>',
                "'><script>alert(1)</script>"
            ];

            for (const xss of xssAttempts) {
                const sanitized = sanitizePath(xss);
                assert.ok(!sanitized.includes('<'), 'Should not contain <');
                assert.ok(!sanitized.includes('>'), 'Should not contain >');
                assert.ok(!sanitized.includes('"') || sanitized.includes('&quot;'), 'Quotes should be escaped');
            }
        });
    });

    suite('sanitizeContent()', () => {
        test('strips password values', () => {
            const testCases = [
                {
                    input: 'password: "secret123"',
                    expected: 'password=***'
                },
                {
                    input: 'password = secret123',
                    expected: 'password=***'
                },
                {
                    input: 'PASSWORD:"MyP@ssw0rd"',
                    expected: 'password=***'
                },
                {
                    input: 'password=my-secret-password',
                    expected: 'password=***'
                }
            ];

            for (const { input, expected } of testCases) {
                const sanitized = sanitizeContent(input);
                assert.ok(sanitized.includes('password=***'), `Should sanitize: ${input}`);
            }
        });

        test('strips API key values', () => {
            const testCases = ['api_key: "sk-1234567890abcdef"', 'apiKey = "1234567890"', 'API_KEY:"secret-key-here"', 'api-key=my-api-key'];

            for (const input of testCases) {
                const sanitized = sanitizeContent(input);
                assert.ok(sanitized.includes('api_key=***'), `Should sanitize API key: ${input}`);
            }
        });

        test('strips token values', () => {
            const testCases = ['token: "ghp_1234567890abcdef"', 'TOKEN = bearer-token-here', 'token:"jwt.token.here"'];

            for (const input of testCases) {
                const sanitized = sanitizeContent(input);
                assert.ok(sanitized.includes('token=***'), `Should sanitize token: ${input}`);
            }
        });

        test('strips secret values', () => {
            const testCases = ['secret: "my-secret-value"', 'SECRET = super-secret', 'secret:"classified-info"'];

            for (const input of testCases) {
                const sanitized = sanitizeContent(input);
                assert.ok(sanitized.includes('secret=***'), `Should sanitize secret: ${input}`);
            }
        });

        test('handles multiple credentials in same content', () => {
            const input = `
				password: "secret123"
				api_key = "sk-abcdef"
				token: "bearer-xyz"
				secret = "classified"
			`;

            const sanitized = sanitizeContent(input);

            assert.ok(sanitized.includes('password=***'), 'Should sanitize password');
            assert.ok(sanitized.includes('api_key=***'), 'Should sanitize api_key');
            assert.ok(sanitized.includes('token=***'), 'Should sanitize token');
            assert.ok(sanitized.includes('secret=***'), 'Should sanitize secret');

            // Verify originals are gone
            assert.ok(!sanitized.includes('secret123'), 'Original password should be removed');
            assert.ok(!sanitized.includes('sk-abcdef'), 'Original API key should be removed');
            assert.ok(!sanitized.includes('bearer-xyz'), 'Original token should be removed');
            assert.ok(!sanitized.includes('classified'), 'Original secret should be removed');
        });

        test('preserves non-sensitive content', () => {
            const input = `
				const config = {
					host: "localhost",
					port: 8080,
					debug: true,
					features: ["auth", "api"]
				}
			`;

            const sanitized = sanitizeContent(input);

            assert.ok(sanitized.includes('localhost'), 'Should preserve localhost');
            assert.ok(sanitized.includes('8080'), 'Should preserve port');
            assert.ok(sanitized.includes('debug'), 'Should preserve debug');
            assert.ok(sanitized.includes('features'), 'Should preserve features');
        });

        test('case-insensitive credential detection', () => {
            const inputs = ['PASSWORD: "secret"', 'Password: "secret"', 'password: "secret"', 'API_KEY: "key"', 'Api_Key: "key"', 'api_key: "key"'];

            for (const input of inputs) {
                const sanitized = sanitizeContent(input);
                assert.ok(sanitized.includes('***'), `Should detect case-insensitive: ${input}`);
            }
        });
    });

    suite('stripCredentials()', () => {
        test('is alias for sanitizeContent()', () => {
            const input = 'password: "secret123"';

            const sanitized = sanitizeContent(input);
            const stripped = stripCredentials(input);

            assert.strictEqual(stripped, sanitized, 'Should be same function');
        });
    });

    suite('Real-world credential patterns', () => {
        test('sanitizes .env file content', () => {
            const envContent = `
DB_HOST=localhost
DB_PASSWORD=super-secret-password
API_KEY=sk-1234567890abcdefghijklmnop
JWT_SECRET=my-jwt-signing-secret
STRIPE_TOKEN=pk_test_1234567890
DEBUG=true
PORT=3000
			`;

            const sanitized = sanitizeContent(envContent);

            // Sensitive values should be stripped
            assert.ok(!sanitized.includes('super-secret-password'));
            assert.ok(!sanitized.includes('sk-1234567890abcdefghijklmnop'));
            assert.ok(!sanitized.includes('my-jwt-signing-secret'));
            assert.ok(!sanitized.includes('pk_test_1234567890'));

            // Non-sensitive values should remain
            assert.ok(sanitized.includes('localhost'));
            assert.ok(sanitized.includes('true'));
            assert.ok(sanitized.includes('3000'));
        });

        test('sanitizes JSON configuration', () => {
            const jsonConfig = JSON.stringify(
                {
                    database: {
                        host: 'localhost',
                        password: 'db-password-here'
                    },
                    api: {
                        key: 'api-key-12345',
                        endpoint: 'https://api.example.com'
                    },
                    auth: {
                        token: 'bearer-token-xyz'
                    }
                },
                null,
                2
            );

            const sanitized = sanitizeContent(jsonConfig);

            assert.ok(!sanitized.includes('db-password-here'));
            assert.ok(!sanitized.includes('api-key-12345'));
            assert.ok(!sanitized.includes('bearer-token-xyz'));

            assert.ok(sanitized.includes('localhost'));
            assert.ok(sanitized.includes('https://api.example.com'));
        });
    });
});
