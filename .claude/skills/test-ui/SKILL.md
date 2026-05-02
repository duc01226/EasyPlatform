---
name: test-ui
version: 1.0.0
description: '[Testing] Full-site QA audit (accessibility, performance, security, SEO) with visual reports. Use for comprehensive QA audits of deployed sites.'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

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

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

**Pre-read (design system):** Load `designSystem.canonicalDoc` + `tokenFiles` from `docs/project-config.json` so visual/style assertions reference real token names (`--brand-*`, `$brand-*`) instead of guesses.

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

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act). NEVER speculate without proof.

<!-- /SYNC:evidence-based-reasoning:reminder -->
<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**IMPORTANT MUST ATTENTION** READ `CLAUDE.md` before starting

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
