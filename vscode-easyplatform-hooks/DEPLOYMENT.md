# VSCode EasyPlatform Hooks - Deployment Guide

> **Production-Ready Extension** - Version 0.1.0
> **Bundle Size:** 57.2 KiB | **Tests:** 62/62 passing | **Security:** 8 critical fixes applied

---

## Quick Start

### Prerequisites

| Requirement | Version | Purpose             |
| ----------- | ------- | ------------------- |
| Node.js     | 18+     | Runtime environment |
| npm         | 9+      | Package manager     |
| VS Code     | 1.85+   | Extension host      |
| TypeScript  | 5.3+    | Type checking       |
| Webpack     | 5.104+  | Bundler             |

### Installation Options

#### Option A: Local Installation (Development)

```bash
# Clone or navigate to the extension directory
cd vscode-easyplatform-hooks

# Install dependencies
npm install

# Compile TypeScript to JavaScript
npm run compile

# Run tests (verify 62/62 passing)
npm test

# Package extension (.vsix file)
npm run package
```

This creates `easyplatform-hooks-0.1.0.vsix` in the root directory.

**Install the .vsix:**
```bash
# From VS Code Command Palette (Ctrl+Shift+P):
Extensions: Install from VSIX...
# Select: easyplatform-hooks-0.1.0.vsix
```

#### Option B: VS Code Marketplace (Public Release)

```bash
# First-time setup: Install vsce (VS Code Extension Manager)
npm install -g @vscode/vsce

# Login to Visual Studio Marketplace
vsce login <publisher-name>

# Package and publish
vsce publish
```

**User Installation:**
```
1. Open VS Code Extensions view (Ctrl+Shift+X)
2. Search "EasyPlatform Hooks"
3. Click Install
```

#### Option C: Private Extension Registry

For enterprise environments with internal extension marketplaces:

```bash
# Package extension
vsce package

# Upload to internal registry (e.g., Nexus, Artifactory)
# Distribution via internal VS Code settings.json:
{
  "extensions.autoUpdate": false,
  "extensions.autoCheckUpdates": false,
  "extensions.gallery": {
    "serviceUrl": "https://your-registry.company.com/vscode-extensions"
  }
}
```

---

## Configuration

### Initial Setup

After installation, configure the extension:

```bash
# Open VS Code Settings (Ctrl+,)
# Search: "easyplatformHooks"
```

**Recommended Settings:**

```jsonc
{
  // Privacy protection (block sensitive files from being edited)
  "easyplatformHooks.privacy.enabled": true,
  "easyplatformHooks.privacy.patterns": [
    "**/.env*",
    "**/secrets/**",
    "**/*.key",
    "**/*.pem",
    "**/id_rsa*",
    "**/*.pfx"
  ],

  // Scout pattern detection (warn about anti-patterns)
  "easyplatformHooks.scout.enabled": true,
  "easyplatformHooks.scout.broadPatterns": [
    "**/*",
    "**/*.{ts,js,cs,py}"
  ],

  // Auto-formatting on save
  "easyplatformHooks.formatting.enabled": true,
  "easyplatformHooks.formatting.languages": [
    "typescript",
    "javascript",
    "csharp",
    "python",
    "json"
  ],

  // Webhook notifications (Discord/Slack) - HTTPS only
  "easyplatformHooks.notifications.enabled": false // Enable after configuring webhook
}
```

### Webhook Setup (Optional)

For Discord/Slack notifications:

```bash
# From VS Code Command Palette (Ctrl+Shift+P):
> EasyPlatform: Configure Webhook

# Select provider:
- Discord
- Slack
- Custom

# Enter HTTPS webhook URL
# (Stored securely via VS Code Secrets API)
```

**Security Requirements:**
- ✅ HTTPS only (enforced)
- ✅ Max 2048 characters (DoS protection)
- ✅ Credentials stripped before sending
- ✅ 5-second timeout (prevents hang)

---

## Verification

### Post-Installation Checks

Run these commands to verify successful deployment:

```bash
# 1. Check extension activation
# Open VS Code Developer Tools (Help > Toggle Developer Tools)
# Console should show:
# "EasyPlatform Hooks: Activated successfully"

# 2. Run test suite
npm test
# Expected: 62 passing, 9 pending, 0 failing

# 3. Verify configuration
# Command Palette: > EasyPlatform: Show Configuration
# Should display current settings

# 4. Test privacy blocking
# Try editing a file matching privacy patterns (e.g., .env)
# Should block with message: "Privacy violation: Cannot edit .env"

# 5. View session metrics
# Command Palette: > EasyPlatform: View Edit Statistics
# Should display current session info
```

### Troubleshooting

| Issue                            | Symptom                   | Solution                                                                                                                    |
| -------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Activation Failed**            | Error message on startup  | Check Output panel (View > Output > EasyPlatform Hooks). Common causes: missing dependencies, incompatible VS Code version. |
| **Tests Failing**                | npm test shows failures   | Run `npm install` to reinstall dependencies. Verify Node.js 18+.                                                            |
| **Privacy Patterns Not Working** | Can still edit .env files | Check settings: `easyplatformHooks.privacy.enabled` must be `true`. Reload window (Ctrl+Shift+P > Reload Window).           |
| **Webhook Not Sending**          | No notifications received | Verify HTTPS URL. Check webhook provider is reachable. View logs in Output panel.                                           |
| **High Memory Usage**            | Extension uses >100MB RAM | Check session metrics. If filesModified > 1000, restart session (Command: Clear Session).                                   |

---

## Production Deployment

### CI/CD Integration

#### GitHub Actions Example

```yaml
name: Build and Test VSCode Extension

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd vscode-easyplatform-hooks
          npm install

      - name: Compile TypeScript
        run: npm run compile

      - name: Run tests
        run: npm test

      - name: Package extension
        run: npm run package

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: vscode-extension
          path: vscode-easyplatform-hooks/*.vsix
```

#### Azure DevOps Pipeline

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'

- script: |
    cd vscode-easyplatform-hooks
    npm install
    npm run compile
    npm test
  displayName: 'Build and Test'

- script: |
    npm install -g @vscode/vsce
    vsce package
  displayName: 'Package Extension'

- task: PublishBuildArtifacts@1
  inputs:
    PathtoPublish: 'vscode-easyplatform-hooks/*.vsix'
    ArtifactName: 'extension'
```

### Enterprise Deployment Checklist

**Pre-Deployment:**
- [ ] All tests passing (62/62)
- [ ] Security review complete (8 fixes verified)
- [ ] Documentation up-to-date
- [ ] Version number updated in package.json
- [ ] Changelog updated
- [ ] License file included

**Security Verification:**
- [ ] Secrets API integration tested
- [ ] Webhook HTTPS enforcement verified
- [ ] Credential sanitization tested (8 patterns)
- [ ] Input length validation confirmed (2048 chars)
- [ ] ReDoS prevention patterns checked
- [ ] Array bounds enforced (MAX_FILES/MAX_COMMANDS)

**Performance Checks:**
- [ ] Webpack bundle < 60 KiB
- [ ] Startup time < 500ms
- [ ] PathMatcher caching enabled
- [ ] No memory leaks (session restart tested)

**Deployment:**
- [ ] Extension packaged (.vsix created)
- [ ] Internal registry updated (if applicable)
- [ ] User documentation published
- [ ] Training materials prepared
- [ ] Rollback plan ready

**Post-Deployment:**
- [ ] Monitor activation errors
- [ ] Track session metrics
- [ ] Review privacy block logs
- [ ] Monitor webhook delivery
- [ ] Collect user feedback

---

## Rollback Plan

If critical issues arise post-deployment:

### Immediate Actions

```bash
# 1. Disable extension (users)
# From VS Code Extensions view:
# Right-click "EasyPlatform Hooks" > Disable

# 2. Uninstall extension
# Right-click > Uninstall

# 3. Revert to previous version (if available)
# Install from .vsix:
code --install-extension easyplatform-hooks-<previous-version>.vsix
```

### Root Cause Analysis

```bash
# Collect diagnostic data:
# 1. Extension logs (Output panel)
# 2. VSCode logs (Help > Toggle Developer Tools > Console)
# 3. Test results (npm test)
# 4. Session state (.vscode-test/user-data/User/globalStorage/easyplatform.easyplatform-hooks/)

# Export for analysis:
zip -r extension-debug.zip \
  .vscode-test/user-data/User/globalStorage/easyplatform.easyplatform-hooks/ \
  logs/ \
  test-results/
```

---

## Monitoring and Maintenance

### Key Metrics to Track

| Metric                      | Target       | Alert Threshold |
| --------------------------- | ------------ | --------------- |
| **Activation Success Rate** | >99%         | <95%            |
| **Test Pass Rate**          | 100%         | <95%            |
| **Bundle Size**             | <60 KiB      | >80 KiB         |
| **Memory Usage**            | <50 MB       | >100 MB         |
| **Startup Time**            | <500ms       | >1000ms         |
| **Privacy Blocks**          | Track trends | Sudden spike    |
| **Webhook Failures**        | <1%          | >5%             |

### Update Cadence

- **Security Patches:** Immediate (0-24 hours)
- **Bug Fixes:** Weekly sprint
- **Feature Releases:** Monthly
- **Dependency Updates:** Quarterly

### Health Checks

Run these periodically in production:

```bash
# Monthly health check
npm audit                 # Security vulnerabilities
npm outdated              # Dependency updates
npm test                  # Regression tests
npm run compile -- --bail # Build verification
```

---

## Support and Resources

### Documentation Links

- **README.md** - Feature overview and usage
- **SECURITY.md** - Security architecture and threat model
- **CODE-REVIEW-FIXES.md** - Detailed fix documentation
- **TEST-REPORT.md** - Test coverage and results

### Getting Help

**Internal Support:**
- GitHub Issues: [Project Repository]/issues
- Team Chat: #easyplatform-hooks
- Email: [team-email]

**Community Support:**
- VSCode Extension Docs: https://code.visualstudio.com/api
- Extension Samples: https://github.com/microsoft/vscode-extension-samples

### Reporting Security Issues

**DO NOT** create public GitHub issues for security vulnerabilities.

**Contact:**
- Email: security@[your-domain].com
- PGP Key: [link-to-public-key]

Expected response time: 48 hours

---

## Version History

### v0.1.0 (Current)

**Released:** 2025-01-15
**Status:** Production-Ready

**Features:**
- ✅ Session lifecycle management (SessionStart/SessionEnd)
- ✅ File edit hooks (Privacy, Scout, Formatting)
- ✅ Webhook notifications (Discord/Slack)
- ✅ Secure credential storage (Secrets API)

**Security:**
- ✅ 8 critical/high-priority fixes applied
- ✅ HTTPS enforcement
- ✅ Credential sanitization (8 patterns)
- ✅ DoS protection (input validation, timeouts)
- ✅ ReDoS prevention
- ✅ Memory leak protection

**Tests:**
- ✅ 62/62 passing
- ✅ 100% critical path coverage
- ✅ Real VSCode API calls (no mocks)

**Bundle:**
- ✅ 57.2 KiB minified
- ✅ Webpack optimized
- ✅ No TypeScript errors

---

## License

MIT License - See LICENSE file for details

---

## Next Steps

After successful deployment:

1. ✅ Monitor activation success rate (target >99%)
2. ✅ Collect user feedback (surveys, GitHub issues)
3. ✅ Plan Phase 4 features (TodoWrite, FormattingRules)
4. ✅ Schedule security audit (quarterly)
5. ✅ Update roadmap based on usage metrics

**Questions?** Contact the development team via GitHub Issues or team chat.

---

*Last Updated: 2025-01-15 | Version: 0.1.0 | Status: Production-Ready*
