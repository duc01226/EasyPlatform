/**
 * Input validation utilities
 * Research: research-security-performance.md section 1.2, 1.3
 */

/**
 * Validate webhook URL (HTTPS only, no credentials in URL)
 *
 * **Security Requirements:**
 * 1. Must use HTTPS protocol (TLS encryption)
 * 2. No credentials in URL (username:password@host rejected)
 * 3. Must be valid URL format (parseable by URL constructor)
 *
 * @param url - Webhook URL to validate
 * @returns true if valid HTTPS URL without credentials, false otherwise
 *
 * @example
 * isValidWebhookUrl('https://discord.com/api/webhooks/...') // true
 * isValidWebhookUrl('http://example.com') // false (not HTTPS)
 * isValidWebhookUrl('https://user:pass@example.com') // false (credentials in URL)
 *
 * @see SECURITY.md#2-https-only-webhooks
 */
export function isValidWebhookUrl(url: string): boolean {
    try {
        const parsed = new URL(url);

        // Must use HTTPS
        if (parsed.protocol !== 'https:') {
            return false;
        }

        // No credentials in URL (should use headers instead)
        if (parsed.username || parsed.password) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Sanitize file path for display (prevent XSS in webviews)
 *
 * Escapes HTML special characters to prevent script injection when displaying
 * file paths in webviews or HTML contexts.
 *
 * @param filePath - File path to sanitize
 * @returns HTML-escaped file path safe for display
 *
 * @example
 * sanitizePath('<script>alert(1)</script>') // '&lt;script&gt;alert(1)&lt;/script&gt;'
 * sanitizePath('C:/Users/"Admin"/file.txt') // 'C:/Users/&quot;Admin&quot;/file.txt'
 *
 * @see SECURITY.md#4-input-validation
 */
export function sanitizePath(filePath: string): string {
    return filePath.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Sanitize content before webhook delivery (strip credentials)
 *
 * **Security-Critical Function** - Prevents credential leakage in webhooks/logs
 *
 * Patterns stripped:
 * - Passwords: password=secret123 → password=***
 * - API Keys: api_key=abc123def → api_key=***
 * - Tokens: token=xyz789 → token=***
 * - Secrets: secret=hidden → secret=***
 * - Bearer Tokens: Authorization: Bearer ey... → bearer ***
 * - AWS Access Keys: AKIA1234567890ABCDEF → AKIA***
 * - Connection Strings: mongodb://user:pass@host → mongodb://***:***@host
 * - SSH/TLS Keys: -----BEGIN RSA PRIVATE KEY----- → *** PRIVATE KEY ***
 *
 * @param content - Raw content to sanitize (max 100KB, truncated if longer)
 * @returns Sanitized content with credentials masked
 *
 * @example
 * sanitizeContent('password=secret123') // 'password=***'
 * sanitizeContent('Bearer eyJhbGc...') // 'bearer ***'
 * sanitizeContent('AKIA1234567890ABCDEF') // 'AKIA***'
 *
 * @see CODE-REVIEW-FIXES.md#2-expanded-credential-sanitization
 */
export function sanitizeContent(content: string): string {
    // CRITICAL: Input length limit (DoS prevention)
    if (content.length > 100000) {
        content = content.substring(0, 100000) + '... [truncated]';
    }
    return (
        content
            .replace(/password[\s:="]*([^\s,}"]+)/gi, 'password=***')
            .replace(/api[_-]?key[\s:="]*([^\s,}"]+)/gi, 'api_key=***')
            .replace(/token[\s:="]*([^\s,}"]+)/gi, 'token=***')
            .replace(/secret[\s:="]*([^\s,}"]+)/gi, 'secret=***')
            // CRITICAL: Additional patterns (Bearer tokens, AWS keys, SSH keys, connection strings)
            .replace(/bearer\s+([a-zA-Z0-9._-]+)/gi, 'bearer ***')
            .replace(/AKIA[0-9A-Z]{16}/g, 'AKIA***')
            .replace(/(mongodb|postgres|mysql|redis):\/\/[^:]+:[^@]+@/gi, '$1://***:***@')
            .replace(/-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g, '*** PRIVATE KEY ***')
    );
}

/**
 * Alias for sanitizeContent
 */
export const stripCredentials = sanitizeContent;
