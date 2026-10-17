'use strict';

/**
 * Watzup session-summary contract — the wrap-up explains the session, not just the last commits.
 *
 * Business intent: `watzup` hands the developer a summary of the whole session (uncommitted
 * working-tree changes plus the session's commits) that says what was done, the key changes, why
 * each was made and how the result works, before any detail or gate. When no code changed, the
 * code-only gates record a skip with evidence and the report remains the sole comprehension handoff.
 * The rules live only in prompt text, so an edit that drops one silently brings back a
 * commit-only recap or a code review run over a research session.
 * Invariants guarded:
 *   - scope: uncommitted changes plus this session's commits, read from git status/diff;
 *   - Session summary: always runs, four labelled parts in order, summary before detail;
 *   - proportion: doc-staleness and spec-health record `skipped — no code changed` with evidence,
 *     and the read-only contract stays;
 *   - Quick Summary, Workflow list and Key Rules all state the scope and the summary;
 *   - HTML report: git-ignored path, shipped self-contained template, auto-open via open-report.cjs,
 *     with no automatic comprehension-skill handoff;
 *   - the auto-opened report escapes every value, allows only safe href schemes and carries a CSP;
 *   - the open step states the helper's tmp/ or temp/ bound.
 *
 * Portability: reads only files that ship inside `.claude/`, resolved from this file's own
 * location. It spawns no process and reads no environment, home-dir, project config or git state,
 * so it holds unchanged in any adopting project on Windows, macOS and Linux.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CLAUDE_DIR = path.resolve(__dirname, '..', '..', '..');
const SKILL_FILE = path.join(CLAUDE_DIR, 'skills', 'watzup', 'SKILL.md');
const UNDERSTAND_FILE = path.join(CLAUDE_DIR, 'skills', 'understand', 'SKILL.md');
const TEMPLATE_FILE = path.join(CLAUDE_DIR, 'skills', 'watzup', 'references', 'session-report-template.html');
const OPEN_HELPER = path.join(CLAUDE_DIR, 'scripts', 'open-report.cjs');

const readSkill = () => fs.readFileSync(SKILL_FILE, 'utf8').replace(/\r\n/g, '\n');

/** Body of the `## {heading}` section, up to the next level-2 heading. */
function section(text, heading) {
    const start = text.indexOf(`\n## ${heading}`);
    assert.ok(start >= 0, `section "## ${heading}" must exist`);
    const next = text.indexOf('\n## ', start + 4);
    return text.slice(start, next < 0 ? text.length : next);
}

/** Text of a bold-labelled block inside Quick Summary (e.g. `**Workflow:**`), up to the next label. */
function block(quick, label) {
    const start = quick.indexOf(`**${label}:**`);
    assert.ok(start >= 0, `Quick Summary block "**${label}:**" must exist`);
    const rest = quick.slice(start + label.length + 5);
    const next = rest.search(/\n\*\*[A-Z][^*\n]*:\*\*/);
    return next < 0 ? rest : rest.slice(0, next);
}

const SKIP_NO_CODE = /skipped — no code changed/;

const tests = [
    {
        name: 'TC-WSS-001 scope is the session: uncommitted changes plus this session\'s commits',
        fn: () => {
            // Given the watzup skill
            const text = readSkill();
            const workflow = block(section(text, 'Quick Summary'), 'Workflow');
            // When its Scope step is read
            // Then it collects uncommitted changes from git status and diff
            assert.match(workflow, /1\. \*\*Scope\*\*[^\n]*`git status` and `git diff`[^\n]*uncommitted changes/);
            // And adds the commits made in this session
            assert.match(workflow, /1\. \*\*Scope\*\*[^\n]*commits made in this session/);
            // And the task list, plan and prompt ledger bound it when present
            assert.match(workflow, /1\. \*\*Scope\*\*[^\n]*task list, plan and prompt ledger/);
            // And the review prompt no longer narrows to recent commits
            assert.doesNotMatch(text, /most recent commits/);
            assert.match(text, /Review this session's work: the uncommitted working-tree changes plus the commits made in this session\./);
        }
    },
    {
        name: 'TC-WSS-002 Session summary always runs with Done, Key changes, Why, How it works in order',
        fn: () => {
            // Given the Session Summary section
            const body = section(readSkill(), 'Session Summary (ALWAYS runs)');
            // When its labelled parts are located
            const parts = ['**Done:**', '**Key changes:**', '**Why:**', '**How it works:**'];
            const at = parts.map(p => body.indexOf(`\n- ${p}`));
            // Then all four parts exist
            parts.forEach((p, i) => assert.ok(at[i] >= 0, `part ${p} must be a labelled bullet`));
            // And they appear in the declared order
            assert.deepEqual([...at].sort((a, b) => a - b), at, 'parts must appear in order Done → Key changes → Why → How it works');
            // And each part carries its contract
            assert.match(body, /\*\*Done:\*\*[^\n]*mapped to each user request or the session goal[^\n]*prompt ledger/);
            assert.match(body, /\*\*Key changes:\*\*[^\n]*grouped by area[^\n]*`file:line` anchor/);
            assert.match(body, /\*\*Why:\*\*[^\n]*rationale[^\n]*trade-offs accepted/);
            assert.match(body, /\*\*How it works:\*\*[^\n]*resulting behaviour or flow/);
            // And it runs every time, before any gate, with the detail after it
            assert.match(body, /Runs on every invocation, code or no code\. Output it before any gate/);
            assert.match(body, /\nThen the detail:/);
        }
    },
    {
        name: 'TC-WSS-003 no code changed: code gates record evidence-backed skips and the report still owns handoff',
        fn: () => {
            const text = readSkill();
            assert.match(section(text, 'Doc Staleness Check (REQUIRED)'), /`Doc staleness: skipped — no code changed` — plus the evidence/);
            assert.match(section(text, 'Spec-Driven Development Health Check (REQUIRED when business code changed)'), /`Spec health: skipped — no code changed` with the evidence/);
            assert.match(section(text, 'Session Summary (ALWAYS runs)'), /\*\*No code changed\*\* means[^\n]*Cite the path list \(or a clean `git status`\) as the evidence/);
            assert.match(text, /\*\*READ-ONLY contract\*\* — review, summarize and FLAG only; NEVER edit/);
            assert.doesNotMatch(text, /`\/understand`|Understand handoff/);
        }
    },
    {
        name: 'TC-WSS-004 Quick Summary, Workflow list and Key Rules agree on scope, summary and proportion',
        fn: () => {
            // Given the three Quick Summary blocks
            const quick = section(readSkill(), 'Quick Summary');
            const summary = block(quick, 'Summary');
            const workflow = block(quick, 'Workflow');
            const rules = block(quick, 'Key Rules');
            // Then the Summary states session scope and the proportion rule
            assert.match(summary, /\*\*Scope is the session\*\*/);
            assert.match(summary, /(?:^|\n)-?\s*\*\*Proportion rule:\*\* the session summary and (?:the )?lesson gate always run/);
            assert.match(summary, SKIP_NO_CODE);
            // And the Workflow list orders Scope → Session summary → gates → report → Next Steps
            const steps = ['1. **Scope**', '2. **Session summary**', '3. **Doc Check**', '4. **Spec Health**', '5. **Lesson Learned**', '6. **Session Report**', '7. **Next Steps**'];
            steps.forEach(s => assert.ok(workflow.includes(s), `Workflow must list ${s}`));
            // And the Key Rules carry scope, the four-part summary and the skip rule
            assert.match(rules, /Scope covers the whole session: uncommitted changes plus this session's commits/);
            assert.match(rules, /Session summary always runs and comes first, with all four parts: Done, Key changes, Why, How it works/);
            assert.match(rules, SKIP_NO_CODE);
            // And the Key Rules carry the HTML report
            assert.match(rules, /Write the HTML session report on every run, open it with `open-report\.cjs`, and post a short chat summary plus its path/);
        }
    },
    {
        name: 'TC-WSS-005 HTML session report: git-ignored path, template, and the four parts plus Flags and Next steps',
        fn: () => {
            // Given the Session Report section and its template
            const text = readSkill();
            const body = section(text, 'Session Report (HTML)');
            const html = fs.readFileSync(TEMPLATE_FILE, 'utf8');
            // Then the report goes to a configured or default git-ignored reports directory
            assert.match(body, /reports directory named by `docs\/project-config\.json` when present, otherwise `tmp\/reports\/`[^\n]*`git check-ignore`/);
            assert.match(body, /If none is ignored, write no file: deliver the report content in chat/);
            // And it is written from the template with the declared section order
            assert.match(body, /\*\*Write\*\* `watzup-\{YYMMDD\}-\{HHmm\}-\{slug\}\.html` from `references\/session-report-template\.html`/);
            assert.match(body, /Order: Start here, Done, Key changes, Why, How it works, Flags \([^)]*\), Next steps\./);
            // And the template carries those sections in that order
            const ids = ['start-here-label', 'done', 'key-changes', 'why', 'how-it-works', 'flags', 'next-steps'];
            const at = ids.map(id => html.indexOf(`id="${id}"`));
            ids.forEach((id, i) => assert.ok(at[i] >= 0, `template must have id="${id}"`));
            assert.deepEqual([...at].sort((a, b) => a - b), at, 'template sections must follow the declared order');
            // And the template is self-contained with tokens, dark mode, landmarks and visible focus
            assert.doesNotMatch(html, /<script|<link\b|@import|(?:src|href)="(?:https?:)?\/\//i);
            assert.match(html, /:root \{[^}]*--ink:[^}]*--accent:/);
            assert.match(html, /@media \(prefers-color-scheme: dark\) \{\s*:root \{/);
            for (const landmark of ['<header>', '<nav aria-label="Contents">', '<main id="main">', '<footer>']) assert.ok(html.includes(landmark), `landmark ${landmark}`);
            assert.match(html, /:focus-visible \{\s*outline: 3px solid var\(--accent\)/);
        }
    },
    {
        name: 'TC-WSS-006 the report is auto-opened through open-report.cjs and announced in chat',
        fn: () => {
            // Given the Session Report section
            const body = section(readSkill(), 'Session Report (HTML)');
            // Then it opens the report through the shipped helper
            assert.match(body, /\*\*Open\*\* it: `node \.claude\/scripts\/open-report\.cjs <path>`/);
            assert.ok(fs.existsSync(OPEN_HELPER), 'open-report.cjs must ship with the framework');
            // And a failed or skipped open never blocks the wrap-up
            assert.match(body, /opens nothing in CI, with `CK_NO_AUTO_OPEN=1`, or on a Linux session without a display, and always exits 0/);
            // And chat gets a short summary plus the path
            assert.match(body, /\*\*Post in chat\*\* a short summary[^\n]*plus `Session report → <path>`/);
        }
    },
    {
        name: 'TC-WSS-007 watzup never invokes another comprehension skill',
        fn: () => {
            const text = readSkill();
            const understand = fs.readFileSync(UNDERSTAND_FILE, 'utf8').replace(/\r\n/g, '\n');
            const workflow = block(section(text, 'Quick Summary'), 'Workflow');
            assert.match(workflow, /6\. \*\*Session Report\*\*/);
            assert.match(workflow, /7\. \*\*Next Steps\*\*/);
            assert.match(text, /never invoke another comprehension skill from this workflow/);
            assert.doesNotMatch(text, /`\/understand`|Understand Handoff/);
            assert.match(understand, /workflows and wrap-up skills do not invoke `\/understand`/);
            assert.doesNotMatch(understand, /`\/watzup` invokes `\/understand`/);
        }
    },
    {
        name: 'TC-WSS-008 the report and next-step prompt are the complete handoff',
        fn: () => {
            const text = readSkill();
            const quick = section(text, 'Quick Summary');
            const workflow = block(quick, 'Workflow');
            assert.match(workflow, /6\. \*\*Session Report\*\*[\s\S]*7\. \*\*Next Steps\*\*/);
            assert.match(block(quick, 'Summary'), /\*\*Main steps in order:\*\*[\s\S]*\(7\) \*\*`ask user question tool` Next Steps\*\*/);
            assert.match(section(text, 'Session Report (HTML)'), /Post in chat[\s\S]*Session report → <path>/);
            assert.doesNotMatch(text, /large code change[^\n]*review guide|handoff scales down/i);
        }
    },
    {
        name: 'TC-WSS-009 the auto-opened report is encoded and locked down by a Content-Security-Policy',
        fn: () => {
            // Given the Session Report section and its template
            const body = section(readSkill(), 'Session Report (HTML)');
            const html = fs.readFileSync(TEMPLATE_FILE, 'utf8');
            // Then the skill HTML-escapes every placeholder value, all five characters
            assert.match(body, /\*\*Encode every value:\*\* HTML-escape each placeholder value — `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`, `'` → `&#39;`/);
            // And restricts every href to relative, file: or vscode: links, never javascript:
            assert.match(body, /Every `href` value[^\n]*relative path or a `file:` \/ `vscode:` link — never `javascript:`/);
            // And the template carries a CSP meta that allows no script and no fetch, only inline style
            const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/);
            assert.ok(csp, 'template must carry a Content-Security-Policy meta');
            assert.match(csp[1], /(^|; )default-src 'none'(;|$)/);
            assert.match(csp[1], /(^|; )style-src 'unsafe-inline'(;|$)/);
            assert.doesNotMatch(csp[1], /script-src|\*|https?:/);
            // And the CSP comes before the first element it governs
            assert.ok(html.indexOf(csp[0]) < html.indexOf('<style>'), 'CSP meta must precede <style>');
            // And the template's own contract states the encoding and href rules
            assert.match(html, /Encode every value: HTML-escape each placeholder value/);
            assert.match(html, /Every href is a relative path or a file: \/ vscode: link; never javascript:/);
        }
    },
    {
        name: 'TC-WSS-010 the open step says the helper opens only tmp/ or temp/ reports and prints the path otherwise',
        fn: () => {
            // Given the Session Report section
            const body = section(readSkill(), 'Session Report (HTML)');
            // Then a report outside tmp/ or temp/ is not opened, and its path reaches the user
            assert.match(body, /opens only a report inside the project's `tmp\/` or `temp\/` directory; a report written to a configured reports directory elsewhere is not opened — the helper prints its path/);
        }
    }
];

module.exports = { name: 'watzup-session-summary', tests };
