---
name: test-ui
version: 1.0.0
description: '[Testing] Full-site QA audit (accessibility, performance, security, SEO) with visual reports. Use for comprehensive QA audits of deployed sites.'
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/evidence-based-reasoning-protocol.md` before executing.

## Quick Summary

**Goal:** Run comprehensive UI tests on a website and generate a detailed visual report.

> **For individual page/component testing with Playwright scripts, use `webapp-testing` instead.**

**Workflow:**

1. **Discover** — Browse target URL, discover all pages, components, endpoints
2. **Plan Tests** — Create test plan covering accessibility, responsiveness, performance, security, SEO
3. **Execute** — Run parallel tester subagents; capture screenshots for each test area
4. **Analyze** — Use ai-multimodal to review screenshots and visual elements
5. **Report** — Generate Markdown report with embedded screenshots and recommendations

**Key Rules:**

- Do NOT implement fixes; this is a testing/reporting skill only
- Save all screenshots in the report directory
- Support authenticated routes via cookie/token/localStorage injection

Activate the chrome-devtools skill.

## Purpose

Run comprehensive UI tests on a website and generate a detailed report.

## Arguments

- $1: URL - The URL of the website to test
- $2: OPTIONS - Optional test configuration (e.g., --headless, --mobile, --auth)

## Testing Protected Routes (Authentication)

For testing protected routes that require authentication, follow this workflow:

### Step 1: User Manual Login

Instruct the user to:

1. Open the target site in their browser
2. Log in manually with their credentials
3. Open browser DevTools (F12) → Application tab → Cookies/Storage

### Step 2: Extract Auth Credentials

Ask the user to provide one of:

- **Cookies**: Copy cookie values (name, value, domain)
- **Access Token**: Copy JWT/Bearer token from localStorage or cookies
- **Session Storage**: Copy relevant session keys

### Step 3: Inject Authentication

Use the `inject-auth.js` script to inject credentials before testing:

```bash
cd $SKILL_DIR  # .claude/skills/chrome-devtools/scripts

# Option A: Inject cookies
node inject-auth.js --url https://example.com --cookies '[{"name":"session","value":"abc123","domain":".example.com"}]'

# Option B: Inject Bearer token
node inject-auth.js --url https://example.com --token "Bearer eyJhbGciOi..." --header Authorization --token-key access_token

# Option C: Inject localStorage
node inject-auth.js --url https://example.com --local-storage '{"auth_token":"xyz","user_id":"123"}'

# Combined (cookies + localStorage)
node inject-auth.js --url https://example.com --cookies '[{"name":"session","value":"abc"}]' --local-storage '{"user":"data"}'
```

### Step 4: Run Tests

After auth injection, the browser session persists. Run tests normally:

```bash
# Navigate and screenshot protected pages
node navigate.js --url https://example.com/dashboard
node screenshot.js --url https://example.com/profile --output profile.png

# The auth session persists until --close true is used
node screenshot.js --url https://example.com/settings --output settings.png --close true
```

### Auth Script Options

- `--cookies '<json>'` - Inject cookies (JSON array)
- `--token '<token>'` - Inject Bearer token
- `--token-key '<key>'` - localStorage key for token (default: access_token)
- `--header '<name>'` - Set HTTP header with token (e.g., Authorization)
- `--local-storage '<json>'` - Inject localStorage items
- `--session-storage '<json>'` - Inject sessionStorage items
- `--reload true` - Reload page after injection
- `--clear true` - Clear saved auth session

## Workflow

- Use `planning` skill to organize the test plan & report in the current project directory.
- All the screenshots should be saved in the same report directory.
- Browse $URL with the specified $OPTIONS, discover all pages, components, and endpoints.
- Create a test plan based on the discovered structure
- Use multiple `tester` subagents or tool calls in parallel to test all pages, forms, navigation, user flows, accessibility, functionalities, usability, responsive layouts, cross-browser compatibility, performance, security, seo, etc.
- Use `ai-multimodal` to analyze all screenshots and visual elements.
- Generate a comprehensive report in Markdown format, embedding all screenshots directly in the report.
- Finally respond to the user with a concise summary of findings and recommendations.
- Use `AskUserQuestion` tool to ask if user wants to preview the report with `/preview` slash command.

## Output Requirements

How to write reports:

- Format: Use clear, structured Markdown with headers, lists, and code blocks where appropriate
- Include the test results summary, key findings, and screenshot references
- **IMPORTANT:** Ensure token efficiency while maintaining high quality.
- **IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
- **IMPORTANT:** In reports, list any unresolved questions at the end, if any.

**IMPORTANT**: **Do not** start implementing the fixes.
**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
