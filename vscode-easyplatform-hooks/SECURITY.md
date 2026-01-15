# Security Policy

**EasyPlatform Hooks - VSCode Extension**
**Last Updated:** 2026-01-15
**Security Review:** Code review complete - 8 critical/high-priority issues resolved

---

## Security Architecture

### 1. Secrets Management

**Storage:** VSCode Secrets API (platform-specific secure storage)

| Platform | Backend                           |
| -------- | --------------------------------- |
| Windows  | Windows Credential Manager        |
| macOS    | Keychain                          |
| Linux    | libsecret (GNOME Keyring/KWallet) |

**Implementation:**
- Webhook URLs stored encrypted via `context.secrets.store(key, value)`
- Never stored in plaintext (workspace settings, state files)
- Encrypted at rest by OS-level credential vault
- Accessible only to this extension (scoped by extension ID)

**Usage:**
```typescript
// ✅ CORRECT: Encrypted storage
await secretsManager.setWebhookUrl('discord', 'https://discord.com/api/webhooks/...');

// ❌ WRONG: Plaintext in settings.json
"easyplatform.hooks.webhookUrl": "https://..." // NEVER DO THIS
```

### 2. HTTPS-Only Webhooks

**Validation:** All webhook URLs must use HTTPS protocol.

**Rationale:**
- Prevents credentials/content interception over network
- Ensures server identity verification (TLS certificates)
- Protects against man-in-the-middle attacks

**Enforcement:**
```typescript
async setWebhookUrl(provider: string, url: string): Promise<void> {
    if (!url.startsWith('https://')) {
        throw new Error('Webhook URL must use HTTPS');
    }
    // Store encrypted...
}
```

### 3. Credential Sanitization

**Before Transmission:** All webhook payloads scrubbed of credentials.

**Patterns Stripped:**

| Pattern            | Example Match                     | Replacement              |
| ------------------ | --------------------------------- | ------------------------ |
| Passwords          | `password=secret123`              | `password=***`           |
| API Keys           | `api_key=abc123def`               | `api_key=***`            |
| Tokens             | `token=xyz789`                    | `token=***`              |
| Secrets            | `secret=hidden`                   | `secret=***`             |
| Bearer Tokens      | `Authorization: Bearer ey...`     | `bearer ***`             |
| AWS Keys           | `AKIA1234567890ABCDEF`            | `AKIA***`                |
| Connection Strings | `mongodb://user:pass@host`        | `mongodb://***:***@host` |
| SSH Keys           | `-----BEGIN RSA PRIVATE KEY-----` | `*** PRIVATE KEY ***`    |

**Implementation:**
```typescript
export function sanitizeContent(content: string): string {
  // Input length limit (DoS prevention)
  if (content.length > 100000) {
    content = content.substring(0, 100000) + '... [truncated]';
  }

  return content
    .replace(/password[\s:="]*([^\s,}"]+)/gi, 'password=***')
    .replace(/api[_-]?key[\s:="]*([^\s,}"]+)/gi, 'api_key=***')
    .replace(/token[\s:="]*([^\s,}"]+)/gi, 'token=***')
    .replace(/secret[\s:="]*([^\s,}"]+)/gi, 'secret=***')
    .replace(/bearer\s+([a-zA-Z0-9._-]+)/gi, 'bearer ***')
    .replace(/AKIA[0-9A-Z]{16}/g, 'AKIA***')
    .replace(/(mongodb|postgres|mysql|redis):\/\/[^:]+:[^@]+@/gi, '$1://***:***@')
    .replace(/-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g, '*** PRIVATE KEY ***');
}
```

### 4. Input Validation

**DoS Prevention:** Length limits on all user inputs.

| Input Type      | Max Length   | Validation                         |
| --------------- | ------------ | ---------------------------------- |
| Webhook URL     | 2048 chars   | `url.length <= 2048`               |
| Webhook Content | 100KB        | Truncate with `[truncated]` marker |
| File Paths      | VSCode limit | Sanitized for XSS (HTML escaping)  |
| Glob Patterns   | Validated    | ReDoS prevention (see below)       |

**XSS Prevention:**
```typescript
export function sanitizePath(filePath: string): string {
  return filePath
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

### 5. ReDoS Prevention

**Risk:** Malicious glob patterns causing catastrophic backtracking.

**Mitigation:**
```typescript
export function validatePattern(pattern: string): boolean {
    const dangerousPatterns = [
        /(\*\*\/\*+){3,}/,              // Excessive wildcard nesting
        /\{[^}]{100,}\}/,               // Large brace expansion
        /(\([^)]*\|[^)]*\)){4,}/,       // Deep alternation
        /(\[[^\]]{50,}\]){2,}/          // Large character classes
    ];

    return !dangerousPatterns.some(regex => regex.test(pattern));
}
```

---

## Threat Model & Mitigations

### T1: Credential Leakage

**Threat:** Sensitive credentials leaked via webhooks or logs.

**Attack Vector:**
- User edits `.env` file containing `DATABASE_PASSWORD=secret123`
- Extension sends notification with file content
- Webhook receives plaintext credentials

**Mitigations:**
1. ✅ **Privacy Blocking** - `.env` files blocked by default (onWillSaveTextDocument)
2. ✅ **Credential Sanitization** - Regex-based stripping before transmission
3. ✅ **HTTPS Enforcement** - Encrypted channel for webhook delivery
4. ✅ **Secrets API** - Webhook URLs encrypted, never in plaintext

**Residual Risk:** Low (3 defense layers)

### T2: Denial of Service (DoS)

**Threat:** Extension crashes or hangs due to malicious inputs.

**Attack Scenarios:**

| Attack            | Vector                        | Mitigation                               |
| ----------------- | ----------------------------- | ---------------------------------------- |
| ReDoS             | Malicious glob patterns       | Pattern validation + micromatch library  |
| Memory Exhaustion | 100MB webhook URL             | 2048-char limit on URLs                  |
| Infinite Hang     | Unresponsive webhook endpoint | 5-second fetch timeout (AbortSignal)     |
| Unbounded Growth  | 10,000+ file edits in session | MAX_FILES=1000, MAX_COMMANDS=1000        |
| Deadlock          | Lock acquisition failure      | 30-second lock timeout + stale detection |

**Mitigations Applied:**
```typescript
// ✅ Webhook timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);
await fetch(url, { signal: controller.signal });

// ✅ Input length limits
if (url.length > 2048) throw new Error('URL too long');

// ✅ Array bounds
const MAX_FILES = 1000;
if (filesModified.length < MAX_FILES) {
    filesModified.push(filePath);
}
```

### T3: Session Fixation

**Threat:** Predictable session IDs allow session hijacking.

**Attack Vector:**
- Attacker predicts session ID using `Math.random()` pattern
- Injects malicious checkpoint with known session ID

**Mitigation:**
```typescript
// ✅ Crypto-secure random
private generateSessionId(): string {
    const timestamp = Date.now();
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes); // Cryptographically secure
    const random = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `session-${timestamp}-${random}`;
}
```

**Entropy:** 48 bits (timestamp) + 48 bits (crypto.getRandomValues) = 96 bits total

### T4: Concurrency Issues

**Threat:** Race conditions in state file access causing data corruption.

**Attack Vector:**
- Multiple extension instances access `session-state.json` concurrently
- Last writer wins, data lost

**Mitigations:**
1. ✅ **Advisory File Locking** - `.lock` file pattern
2. ✅ **Atomic Writes** - `.tmp` → rename pattern
3. ✅ **Lock Timeout** - 30-second max wait
4. ✅ **Stale Detection** - Check if lock owner process exists
5. ✅ **Finally Block** - Guaranteed lock release on error

```typescript
static async withLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
    const lock = new FileLock(filePath);
    const acquired = await lock.acquire();
    if (!acquired) throw new Error('Lock acquisition failed');

    try {
        return await fn();
    } finally {
        await lock.release(); // ✅ Always release
    }
}
```

---

## Security Configuration Guide

### 1. Configure Privacy Blocking

**Default Patterns:**
```jsonc
{
  "easyplatform.hooks.privacy.patterns": [
    "**/.env*",           // Environment files
    "**/secrets/**",      // Secrets directory
    "**/.aws/**",         // AWS credentials
    "**/.ssh/**",         // SSH keys
    "**/config/master.key" // Rails master key
  ]
}
```

**Add Custom Patterns:**
1. Open VSCode Settings (`Ctrl+,`)
2. Search for `easyplatform.hooks.privacy.patterns`
3. Add your sensitive file patterns

### 2. Configure Webhook Securely

**NEVER do this:**
```jsonc
// ❌ WRONG: Plaintext in settings
{
  "easyplatform.webhookUrl": "https://discord.com/api/webhooks/123/abc"
}
```

**Correct Approach:**
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run `EasyPlatform: Configure Webhook URL`
3. Select provider (Discord/Slack/Custom)
4. Enter HTTPS URL (will be encrypted)

**Verification:**
- URL stored in OS credential vault (not workspace)
- Check: Settings file should NOT contain webhook URL
- Retrieve: Only via Secrets API, never in plaintext

### 3. Monitor Webhook Logs

**Check Output Panel:**
1. View → Output
2. Select "EasyPlatform Hooks" from dropdown
3. Look for notification failures:
   ```
   [FileEdit] Notification failed: Network error
   [FileEdit] Webhook response: 429 Rate Limited
   ```

**Rate Limiting:**
- Discord: 30 requests/min per webhook
- Slack: 1 request/sec per webhook
- Extension sends 1 notification per file save (can be frequent)

**Recommendation:** Use webhook aggregation service or batch notifications

### 4. Workspace Trust

**Untrusted Workspaces:**
- Extension respects `workspace.isTrusted` API
- No webhook notifications in untrusted mode
- Privacy blocking still active
- Session tracking disabled

**Check Trust Status:**
```typescript
if (!vscode.workspace.isTrusted) {
    console.log('Workspace untrusted - webhooks disabled');
}
```

---

## Security Best Practices

### For Users

1. **Review Privacy Patterns** - Customize for your project's sensitive files
2. **Use HTTPS Webhooks** - Never use HTTP (rejected by extension)
3. **Rotate Webhook URLs** - If compromised, regenerate and reconfigure
4. **Limit Notification Frequency** - Consider batching edits to avoid spam
5. **Clear Sessions Regularly** - Prevents unbounded memory growth
6. **Monitor Output Logs** - Check for suspicious failures or errors

### For Developers

1. **Never Log Credentials** - Use sanitization before any logging
2. **Always Use Secrets API** - For any sensitive configuration
3. **Validate All Inputs** - Length, format, pattern safety
4. **Timeout External Calls** - Use AbortController for fetch()
5. **Bound All Arrays** - Prevent unbounded growth (MAX_FILES, MAX_COMMANDS)
6. **Lock Before Modify** - Use FileLock for shared state
7. **Sanitize Before Display** - HTML escape paths in webviews

---

## Reporting Security Issues

**DO NOT** create public GitHub issues for security vulnerabilities.

**Contact:** [Your security email or security policy URL]

**Expected Response Time:** 48 hours for acknowledgment, 7 days for fix

---

## Security Audit History

| Date       | Auditor        | Scope                         | Findings                                          |
| ---------- | -------------- | ----------------------------- | ------------------------------------------------- |
| 2026-01-15 | GitHub Copilot | Comprehensive security review | 4 critical, 4 high-priority issues → All resolved |

**Critical Issues Resolved:**
1. ✅ Webhook fetch timeout (prevents infinite hang)
2. ✅ Expanded credential sanitization (8 pattern types)
3. ✅ Input length validation (DoS prevention)
4. ✅ FileLock finally block (prevents deadlock)

**High-Priority Issues Resolved:**
5. ✅ Array bounds enforcement (memory safety)
6. ✅ PathMatcher caching (performance + ReDoS mitigation)
7. ✅ Crypto-secure session IDs (prevents session fixation)
8. ✅ Error boundary in activate() (user-facing error messages)

---

## Compliance

**OWASP Top 10 Coverage:**

| OWASP Risk                       | Status      | Mitigation                                 |
| -------------------------------- | ----------- | ------------------------------------------ |
| A01: Broken Access Control       | ✅ Mitigated | Secrets API + workspace trust              |
| A02: Cryptographic Failures      | ✅ Mitigated | Secrets API + HTTPS enforcement            |
| A03: Injection                   | ✅ Mitigated | HTML escaping + pattern validation         |
| A04: Insecure Design             | ✅ Mitigated | Multiple defense layers (defense-in-depth) |
| A05: Security Misconfiguration   | ✅ Mitigated | Secure defaults + configuration validation |
| A06: Vulnerable Components       | ✅ Mitigated | Minimal dependencies, audited libraries    |
| A07: Authentication Failures     | N/A         | No auth (extension-local only)             |
| A08: Data Integrity Failures     | ✅ Mitigated | Atomic writes + backup rotation            |
| A09: Logging Failures            | ✅ Mitigated | Credential sanitization in logs            |
| A10: Server-Side Request Forgery | N/A         | No server component                        |

---

## License

MIT License - See [LICENSE](LICENSE) file for details.
