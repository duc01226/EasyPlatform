/**
 * Code graph is optional advice — never a requirement.
 *
 * Guarded business rules:
 * - The code graph (`.code-graph/graph.db`) is an optional hint an agent MAY consult when grep and
 *   reading alone may not reveal a high-risk blast radius. Because the graph lags uncommitted edits and
 *   unindexed paths, its output is a hint, never proof, and is verified by reading the files.
 * - Nothing requires a graph call: the canonical graph protocols, the root-context template and the
 *   authored skill/agent text carry no hard gate, no "MUST run a graph command" and no
 *   "BLOCKED until graph trace". An absent or stale graph is never a finding.
 * - The graph maintenance hooks and the prompt gate never block, fail or warn-as-error when the graph
 *   is absent, unbuilt or stale; the one optional note (mode `on`, no graph built) is advisory wording.
 *
 * Content cases assert this framework repository's own canonical sources, so they skip elsewhere
 * (framework-repo signal). Inlined SYNC copies of the canonical bodies are kept identical to the canonical
 * text by the sync tooling and are excluded from the authored-text scan; the canonical bodies are asserted
 * directly. Hook cases build their own temp project: real hooks run in fresh child processes with inherited
 * CK_* switches removed and HOME/USERPROFILE/TMPDIR/TEMP/TMP pointed at the fixture.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { childEnv } = require('../lib/hook-runner.cjs');
const { createTempDir, cleanupTempDir } = require('../lib/test-utils.cjs');
const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');

const HOOKS_DIR = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(HOOKS_DIR, '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own graph protocols and skills (framework-repo signal)';

const SHARED = path.join(REPO_ROOT, '.claude', 'skills', 'shared');
const read = (...parts) => fs.readFileSync(path.join(REPO_ROOT, ...parts), 'utf8').replace(/\r\n/g, '\n');
const CANONICAL = read('.claude', 'skills', 'shared', 'sync-inline-versions.md');

/** Body of the `## SYNC:<tag>` section of the canonical file. */
function canonicalBlock(tag) {
    const parts = CANONICAL.split(`\n## SYNC:${tag}\n`);
    assert.ok(parts.length === 2, `canonical block ${tag} must exist exactly once`);
    return parts[1].split('\n---\n')[0].trim();
}

/** The advisory sentences every graph protocol must carry (one consistent wording, defined once). */
const ADVISORY_MARKERS = [
    /Optional/,
    /high-risk blast radius/,
    /hint, NOT proof/,
    /stale or incomplete/,
    /verify anything that matters by reading/,
    /Skip it for low-risk or local changes/
];

/** Imperative or blocking graph wording that must not exist in any authored or canonical text. */
const FORBIDDEN = [
    { name: 'HARD-GATE on graph', rx: /HARD-GATE[^\n]*graph|graph[^\n]*HARD-GATE/i },
    { name: 'MANDATORY graph', rx: /MANDATORY[^.\n]{0,40}(?:graph\.db|graph command|graph trace|graph expansion|graph gate)|(?:graph\.db|graph command|graph trace|graph expansion|graph gate)[^.\n]{0,25}MANDATORY/i },
    { name: 'MUST run a graph command', rx: /MUST(?: ATTENTION)?[^\n]*\b(?:run|use|USE)\b[^\n]*(?:graph command|graph trace|code_graph|graph\.db)/i },
    { name: 'run at least one graph command', rx: /run (?:at least )?(?:ONE|one|≥1) (?:graph|`code_graph`) command|run ≥1 graph command/i },
    { name: 'BLOCKED until graph', rx: /BLOCKED until[^\n]*(?:[Gg]raph trace|graph\.db exists)/ },
    { name: 'graph gate NEVER skippable', rx: /graph gate[^\n]*(?:NEVER|never) skip|(?:NEVER|never) skip[^\n]*graph gate/i },
    { name: 'STOP AND DECIDE graph', rx: /STOP AND DECIDE[^\n]*graph/i }
];

function findForbidden(label, text) {
    const hits = [];
    for (const { name, rx } of FORBIDDEN) {
        const m = text.match(rx);
        if (m) hits.push(`${label}: ${name} -> ${m[0].slice(0, 120)}`);
    }
    return hits;
}

// ── authored-text scan helpers ────────────────────────────────────────────────────────────────────────
/** Tags whose inlined copies are owned by the sync tooling, not authored by hand. */
const COPY_TAGS = [
    'graph-assisted-investigation', 'graph-assisted-investigation:reminder',
    'graph-impact-analysis', 'graph-impact-analysis:reminder',
    'understand-code-first', 'understand-code-first:reminder',
    'review-protocol-injection', 'cross-stack-impact-trace', 'root-cause-debugging'
];

function stripSyncCopies(text) {
    let out = text;
    for (const tag of COPY_TAGS) {
        const esc = tag.replace(/[:]/g, '\\:');
        out = out.replace(new RegExp(`<!-- SYNC:${esc} -->[\\s\\S]*?<!-- /SYNC:${esc} -->`, 'g'), '');
    }
    return out;
}

function walkMarkdown(dir, acc = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkMarkdown(full, acc);
        else if (entry.name.endsWith('.md')) acc.push(full);
    }
    return acc;
}

// ── hook fixture helpers ──────────────────────────────────────────────────────────────────────────────
function makeProject({ mode, graph } = {}) {
    const dir = createTempDir('ck-graph-optional-');
    for (const d of ['.claude', 'src', 'docs']) fs.mkdirSync(path.join(dir, d), { recursive: true });
    const config = { project: { name: 'fixture-project' }, modules: [{ name: 'mod', kind: 'library', pathRegex: 'src/' }] };
    if (mode !== undefined) config.hooks = { codeGraph: { enabled: mode } };
    fs.writeFileSync(path.join(dir, 'docs', 'project-config.json'), JSON.stringify(config, null, 2));
    const tmpClaude = path.join(dir, 'tmp', 'claude-temp');
    fs.mkdirSync(tmpClaude, { recursive: true });
    fs.writeFileSync(path.join(tmpClaude, '.agent-files-dismissed'), new Date().toISOString());
    if (graph) {
        const db = path.join(dir, '.code-graph', 'graph.db');
        fs.mkdirSync(path.dirname(db), { recursive: true });
        fs.writeFileSync(db, graph);
        const past = new Date(Date.now() - 60 * 1000);
        fs.utimesSync(db, past, past);
    }
    return dir;
}

function isolatedEnv(dir) {
    const overrides = {
        HOME: dir, USERPROFILE: dir, TMPDIR: dir, TEMP: dir, TMP: dir,
        LOCALAPPDATA: dir, XDG_CACHE_HOME: dir, CLAUDE_PROJECT_DIR: dir, CLAUDE_HOOK_DEBUG: undefined
    };
    for (const key of Object.keys(process.env)) if (/^CK_/i.test(key)) overrides[key] = undefined;
    overrides.CK_GRAPH_SPAWN_STUB = path.join(dir, 'graph-spawns.jsonl');
    return childEnv(overrides);
}

function runHook(dir, hookFile, payload) {
    const child = spawnSync(process.execPath, [path.join(HOOKS_DIR, hookFile)], {
        cwd: dir, env: isolatedEnv(dir), input: JSON.stringify(payload), encoding: 'utf8', timeout: 30000, windowsHide: true
    });
    assert.equal(child.error, undefined, `${hookFile} must complete: ${child.error && child.error.message}`);
    assert.equal(child.status, 0, `${hookFile} must exit 0 (never block on a missing or stale graph); stderr: ${child.stderr}`);
    return { stdout: child.stdout || '', stderr: child.stderr || '' };
}

const PAYLOADS = dir => ({
    'graph-session-init.cjs': { hook_event_name: 'SessionStart', source: 'startup', session_id: 's1' },
    'graph-prompt-sync.cjs': { hook_event_name: 'UserPromptSubmit', prompt: 'implement feature X', session_id: 's1' },
    'graph-auto-update.cjs': { hook_event_name: 'PostToolUse', tool_name: 'Edit', session_id: 's1', tool_input: { file_path: path.join(dir, 'src', 'index.js'), old_string: 'a', new_string: 'b' } },
    'init-prompt-gate.cjs': { hook_event_name: 'UserPromptSubmit', prompt: 'implement feature X', session_id: 's1' }
});

const BLOCKING_OUTPUT = /"decision"\s*:\s*"block"|\bHARD-GATE\b|\bMANDATORY\b|\bBLOCKED\b|MUST ATTENTION/;

const tests = [
    {
        name: '[graph-optional] canonical graph protocols carry the advisory and staleness wording and no imperative graph text',
        skip: SKIP,
        fn() {
            // Given the canonical protocol bodies, their reminders and the published projections
            const carriers = {
                'canonical graph-assisted-investigation': canonicalBlock('graph-assisted-investigation'),
                'canonical graph-impact-analysis': canonicalBlock('graph-impact-analysis'),
                'projection graph-assisted-investigation': read('.claude', 'skills', 'shared', 'protocols', 'graph-assisted-investigation.md'),
                'projection graph-impact-analysis': read('.claude', 'skills', 'shared', 'protocols', 'graph-impact-analysis.md')
            };
            const problems = [];
            // Then the graph-assisted protocol states the one advisory wording in full
            for (const label of ['canonical graph-assisted-investigation', 'projection graph-assisted-investigation']) {
                for (const marker of ADVISORY_MARKERS) if (!marker.test(carriers[label])) problems.push(`${label}: missing advisory marker ${marker}`);
            }
            // And the impact protocol is advisory and says the graph can be stale
            for (const label of ['canonical graph-impact-analysis', 'projection graph-impact-analysis']) {
                if (!/Optional/.test(carriers[label])) problems.push(`${label}: not marked optional`);
                if (!/stale or incomplete/.test(carriers[label])) problems.push(`${label}: no staleness caveat`);
                if (!/never a finding/.test(carriers[label])) problems.push(`${label}: absent graph must be stated as never a finding`);
            }
            // And no carrier holds imperative or blocking graph text
            for (const [label, text] of Object.entries(carriers)) problems.push(...findForbidden(label, text));
            assert.deepEqual(problems, [], problems.join('\n'));
        }
    },
    {
        name: '[graph-optional] graph reminders and the understand-code-first protocol never require a graph call',
        skip: SKIP,
        fn() {
            const reminders = {
                'graph-assisted-investigation:reminder': canonicalBlock('graph-assisted-investigation:reminder'),
                'graph-impact-analysis:reminder': canonicalBlock('graph-impact-analysis:reminder')
            };
            const problems = [];
            for (const [label, text] of Object.entries(reminders)) {
                if (!/[Oo]ptional/.test(text)) problems.push(`${label}: not marked optional`);
                if (!/stale/.test(text)) problems.push(`${label}: no staleness caveat`);
                if (/MANDATORY|MUST ATTENTION/.test(text)) problems.push(`${label}: imperative wording`);
            }
            const understand = [canonicalBlock('understand-code-first'), canonicalBlock('understand-code-first:reminder'),
                read('.claude', 'skills', 'shared', 'protocols', 'understand-code-first.md')];
            for (const [i, text] of understand.entries()) {
                problems.push(...findForbidden(`understand-code-first[${i}]`, text));
                if (!/(?:optional|Optional)/.test(text)) problems.push(`understand-code-first[${i}]: graph mention is not marked optional`);
            }
            assert.deepEqual(problems, [], problems.join('\n'));
        }
    },
    {
        name: '[graph-optional] review-protocol-injection template states the graph as optional advice, not a gate',
        skip: SKIP,
        fn() {
            const template = canonicalBlock('review-protocol-injection');
            const projection = [read('.claude', 'skills', 'shared', 'protocols', 'review-protocol-injection.md'),
                read('.claude', 'skills', 'shared', 'protocols', 'review-protocol-injection.part-2.md')].join('\n');
            for (const [label, text] of Object.entries({ template, projection })) {
                assert.match(text, /### Graph-Assisted Investigation \(optional advice\)/, `${label}: graph section is advisory`);
                assert.match(text, /hint, NOT proof/, `${label}: staleness caveat`);
                assert.deepEqual(findForbidden(label, text), [], `${label}: no imperative graph text`);
            }
        }
    },
    {
        name: '[graph-optional] the root template carries no graph section; the hook-delivered graph protocol is advisory with no HARD-GATE',
        skip: SKIP,
        fn() {
            const template = read('.claude', 'skills', 'ai-context-refresh', 'references', 'claude-md-template.md');
            assert.doesNotMatch(template, /^## Graph Intelligence/m, 'the template carries no Graph Intelligence section: the protocol is delivered by the hook');
            assert.doesNotMatch(template, /HARD-GATE|run at least one graph command/i, 'the template carries no graph gate');
            const body = read('.claude', 'skills', 'shared', 'protocols', 'graph-assisted-investigation.md');
            assert.match(body, /Optional/, 'the protocol is advisory');
            assert.match(body, /hint, NOT proof/, 'the protocol carries the staleness caveat');
            assert.match(body, /never a finding/, 'absent or stale graph is never a finding');
            assert.doesNotMatch(body, /HARD-GATE|<HARD-GATE>|MUST run|run at least one graph command|Skip only when/i, 'no hard gate or mandatory run');
        }
    },
    {
        name: '[graph-optional] authored skill, agent and workflow text requires no graph call and no graph-based finding',
        skip: SKIP,
        fn() {
            // Given every authored skill, agent and workflow doc, with the sync-owned copies stripped and the
            // graph-tooling skills themselves (their own command documentation) left out
            const roots = [path.join(REPO_ROOT, '.claude', 'skills'), path.join(REPO_ROOT, '.claude', 'agents'), path.join(REPO_ROOT, '.claude', 'workflows'), path.join(REPO_ROOT, '.claude', 'docs')];
            const problems = [];
            for (const root of roots) {
                for (const file of walkMarkdown(root)) {
                    const rel = path.relative(REPO_ROOT, file).split(path.sep).join('/');
                    if (/^\.claude\/skills\/graph-/.test(rel) || /^\.claude\/skills\/shared\//.test(rel)) continue;
                    const text = stripSyncCopies(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
                    for (const line of text.split('\n')) {
                        for (const hit of findForbidden(rel, line)) problems.push(hit);
                    }
                }
            }
            // The development rules state the optional wording as well
            assert.match(read('.claude', 'docs', 'development-rules.md'), /Optional graph hint/);
            assert.deepEqual(problems, [], problems.join('\n'));
        }
    },
    {
        name: '[graph-optional] graph hooks and the prompt gate never block, fail or use imperative wording when the graph is absent or stale',
        fn() {
            const cases = [
                { mode: undefined, graph: null, label: 'auto, no graph' },
                { mode: 'on', graph: null, label: 'on, no graph' },
                { mode: 'auto', graph: 'stale garbage graph', label: 'auto, unreadable stale graph' },
                { mode: 'on', graph: 'stale garbage graph', label: 'on, unreadable stale graph' },
                { mode: 'off', graph: 'stale garbage graph', label: 'off, old graph' }
            ];
            for (const { mode, graph, label } of cases) {
                const dir = makeProject({ mode, graph });
                try {
                    const payloads = PAYLOADS(dir);
                    for (const hook of Object.keys(payloads)) {
                        // When the real hook runs against the fixture
                        const out = runHook(dir, hook, payloads[hook]);
                        // Then it exits 0 and emits no blocking or imperative text
                        assert.ok(!BLOCKING_OUTPUT.test(out.stdout), `${label}: ${hook} emitted blocking/imperative text: ${out.stdout.slice(0, 200)}`);
                        assert.ok(!BLOCKING_OUTPUT.test(out.stderr), `${label}: ${hook} wrote blocking/imperative stderr: ${out.stderr.slice(0, 200)}`);
                    }
                } finally {
                    cleanupTempDir(dir);
                }
            }
        }
    },
    {
        name: '[graph-optional] the graph-not-built note (mode on) is advisory wording that says nothing requires the graph',
        fn() {
            // Given a project with the graph switched on but never built
            const dir = makeProject({ mode: 'on', graph: null });
            try {
                // When the user submits a prompt
                const out = runHook(dir, 'init-prompt-gate.cjs', { hook_event_name: 'UserPromptSubmit', prompt: 'implement feature X', session_id: 's1' });
                // Then the note is present, marked optional, caveats staleness and gives no imperative route
                assert.match(out.stdout, /Knowledge graph not built \(optional/);
                assert.match(out.stdout, /hint, not proof|stale or incomplete/);
                assert.match(out.stdout, /\/graph-code --mode=build/);
                assert.doesNotMatch(out.stdout, /Auto-route|before graph-dependent|before structural investigation|MUST|MANDATORY/);
            } finally {
                cleanupTempDir(dir);
            }
        }
    }
];

module.exports = {
    name: 'graph-optional',
    tests
};
