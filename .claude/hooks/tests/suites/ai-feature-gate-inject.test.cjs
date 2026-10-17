'use strict';

/**
 * AI-feature gate injection — the `ai-feature-gate` convention class delivered by file-convention-inject.cjs,
 * and the content-signal matching of the convention engine (file-conventions.cjs) it rests on.
 *
 * Business intent: before the assistant edits code that calls a model, holds prompts, retrieval, agents,
 * tools or evals, it must have the AI-engineering protocol (AF-*, AE-*, AR-*) in context — including for a
 * file whose PATH says nothing about AI — without re-sending it while it is still in the last ~150K tokens,
 * and without a reminder on unrelated code. Invariants guarded here:
 *   - a file that calls a model SDK gets the gate by its content; a path/name-only signal gets it too;
 *   - precision: SMS-style `messages.create`, plain imports, prose, framework folders and dependency output never do;
 *   - content is read only for classes that declare content signals, only for eligible extensions, only when no
 *     path signal already decided, never for an excluded path, and the read is bounded and fail-open;
 *   - a read delivers the conditional wording, the first change re-delivers once, then dedup and window edge hold;
 *   - the protocol already loaded (docs read / review skill) counts as delivered;
 *   - static parity: the generated table and the lookup CLI agree with the hook, and classes without content
 *     signals keep their content version;
 *   - the config validator bounds content signals and stays in step with the runtime caps;
 *   - setup detection proposes the class only from dependency manifests that name an AI SDK;
 *   - the no-config fallback carries both gates.
 * Fixtures live in unique temp dirs removed in `finally`; the delivery store is always a fixture dir.
 */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HOOKS_DIR = path.resolve(__dirname, '../..');
const hook = require(path.join(HOOKS_DIR, 'file-convention-inject.cjs'));
const conventions = require(path.join(HOOKS_DIR, 'lib', 'file-conventions.cjs'));
const ledger = require(path.join(HOOKS_DIR, 'lib', 'convention-ledger.cjs'));
const merge = require(path.join(HOOKS_DIR, 'lib', 'convention-merge.cjs'));
const schema = require(path.join(HOOKS_DIR, 'lib', 'project-config-schema.cjs'));
const builders = require(path.resolve(HOOKS_DIR, '..', 'skills', 'ai-context-refresh', 'scripts', 'section-builders.cjs'));
const { childEnv } = require('../lib/hook-runner.cjs');
const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');

const REPO_ROOT = path.resolve(HOOKS_DIR, '..', '..');
const NOW = Math.floor(Date.now() / 1000) * 1000;
const MINUTE = 60 * 1000;
const GATE = conventions.AI_FEATURE_GATE;
const WINDOW_BYTES = GATE.reinjectAfterTokens * conventions.BYTES_PER_TOKEN;
const TAG = 'ai-feature-gate@';
// The digest's ONE read doc is the protocol file; the checklist and knowledge docs are read by section, on demand.
const PROTOCOL = '.claude/skills/shared/protocols/ai-engineering-gate.md';
const CHECKLIST = '.claude/docs/ai-engineering-review-checklist.md';
const KNOWLEDGE = '.claude/docs/ai-engineering-knowledge.md';
const CALIBRATION = '.claude/docs/ai-engineering-calibration.md';
const SDK_IMPORT = "import Anthropic from '@anthropic-ai/sdk';\nconst client = new Anthropic();\n";
// A CommonJS load of a model SDK, as text for a fixture file. Built at run time so this suite's own source never
// spells a bare `require` call (the portability scan of shipped scripts reads those as this suite's dependencies).
const cjsRequire = name => `${'req'}uire(${JSON.stringify(name)})`;

// ── fixtures ────────────────────────────────────────────────────────────────

async function withFixture(fn) {
    // Resolve the temp root (macOS /var -> /private/var) so containment checks see one spelling.
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'aig-test-')));
    const previousEnv = { ...process.env };
    const fx = {
        root,
        project: path.join(root, 'project'),
        store: path.join(root, 'store'),
        transcript: path.join(root, 'transcript.jsonl'),
        abs: rel => path.join(fx.project, ...rel.split('/')),
        write(rel, content = '') {
            const file = fx.abs(rel);
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, content);
            return file;
        },
        /** A completed raw-body load using documented tool_use/tool_result pairing, not a launch acknowledgment. */
        completed(name, input, at = NOW - MINUTE) {
            const rel = name === 'Skill' ? `.claude/skills/${input.skill}/SKILL.md` : input.file_path.replace(/\\/g, '/');
            const file = path.isAbsolute(rel) ? rel : fx.abs(rel);
            fs.mkdirSync(path.dirname(file), { recursive: true });
            if (!fs.existsSync(file)) fs.writeFileSync(file, `Fixture complete protocol for ${name}.\nRequired second rule.\n`);
            const request = toolUse(name, input, at);
            const id = JSON.parse(request).message.content[0].id;
            const result = JSON.stringify({ type: 'user', timestamp: new Date(at).toISOString(), message: { content: [
                { type: 'tool_result', tool_use_id: id, content: fs.readFileSync(file, 'utf8') }
            ] } });
            return `${request}\n${result}`;
        },
        append(line) {
            fs.appendFileSync(fx.transcript, line.endsWith('\n') ? line : `${line}\n`);
        },
        /** Append one filler line of exactly `bytes` bytes (newline included). */
        grow(bytes) {
            const shell = '{"type":"user","message":{"content":""}}\n';
            assert.ok(bytes >= shell.length, 'filler too small');
            fx.append(shell.replace('""', `"${'x'.repeat(bytes - shell.length)}"`));
        }
    };
    fs.mkdirSync(fx.project, { recursive: true });
    fs.mkdirSync(fx.store, { recursive: true });
    fs.writeFileSync(fx.transcript, '{"type":"user","message":{"content":"start"}}\n');
    try {
        for (const key of Object.keys(process.env)) {
            if (/^(CK_|CLAUDE_|CODEX_|OPENCODE_|NODE_OPTIONS$)/i.test(key) || /(?:API_KEY|TOKEN|SECRET|PASSWORD)/i.test(key)) delete process.env[key];
        }
        Object.assign(process.env, { HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root, CLAUDE_PROJECT_DIR: fx.project });
        await fn(fx);
    } finally {
        ledger._resetCarrierCache();
        fs.rmSync(root, { recursive: true, force: true });
        for (const key of Object.keys(process.env)) delete process.env[key];
        Object.assign(process.env, previousEnv);
    }
}

const clone = value => JSON.parse(JSON.stringify(value));

function gateConfig(settings = {}, group = {}) {
    return { conventionInjection: { enabled: true, ...settings }, contextGroups: [{ ...clone(GATE), ...group }] };
}

function post(fx, tool, rel, extra = {}) {
    return {
        hook_event_name: 'PostToolUse', tool_name: tool, session_id: 'session-1', cwd: fx.project,
        transcript_path: fx.transcript, tool_input: { file_path: fx.abs(rel) }, ...extra
    };
}

let toolId = 0;
function toolUse(name, input, at = NOW - MINUTE) {
    return JSON.stringify({ type: 'assistant', timestamp: new Date(at).toISOString(), message: { content: [{ type: 'tool_use', id: `t${++toolId}`, name, input }] } });
}

async function deliver(fx, config, input, now = NOW) {
    const payload = await hook.run(input, {
        env: { CK_CONVENTIONS_DIR: fx.store },
        projectDir: fx.project,
        config,
        now,
        write: (text, done) => done(true),
        fileExists: () => true
    });
    return payload ? JSON.parse(payload).hookSpecificOutput.additionalContext : '';
}

const gateDelivered = text => text.includes(TAG);
let sessionCounter = 0;
/** A fresh session id per call isolates the delivery memory between independent checks. */
const fresh = () => `aig-${++sessionCounter}`;

/** Clean-machine env (Portable Test Contract): no inherited CK_* switch, home and temp inside the fixture. */
function cleanEnv(fx, extra = {}) {
    const overrides = { HOME: fx.root, USERPROFILE: fx.root, TMPDIR: fx.root, TEMP: fx.root, TMP: fx.root, CLAUDE_HOOK_DEBUG: undefined };
    for (const key of Object.keys(process.env)) {
        if (/^CK_/i.test(key)) overrides[key] = undefined;
    }
    return childEnv({ ...overrides, CLAUDE_PROJECT_DIR: fx.project, ...extra });
}

/** Spawned hook in a project with NO config: the real defaultConfig → built-in fallback path. */
function spawnNoConfig(fx, input) {
    const result = spawnSync(process.execPath, [path.join(HOOKS_DIR, 'file-convention-inject.cjs')], {
        cwd: fx.project, input: JSON.stringify(input), encoding: 'utf8', windowsHide: true, env: cleanEnv(fx, { CK_CONVENTIONS_DIR: fx.store })
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout ? JSON.parse(result.stdout).hookSpecificOutput.additionalContext : '';
}

function validationDelta(extra) {
    const base = { schemaVersion: 2 };
    const baseline = schema.validateConfig(base);
    const result = schema.validateConfig({ ...base, ...extra });
    return {
        errors: result.errors.filter(e => !baseline.errors.includes(e)),
        warnings: result.warnings.filter(w => !baseline.warnings.includes(w))
    };
}

/** The hash payload as it was before content signals existed (a class without them must keep its version). */
function legacyHash(entry) {
    const group = entry.group;
    const list = value => (Array.isArray(value) ? value.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim()) : []);
    const payload = JSON.stringify({
        v: conventions.RENDERER_VERSION, name: entry.name, priority: entry.priority, rules: entry.rules, docs: entry.docs, skills: entry.skills,
        pathRegexes: list(group.pathRegexes), pathGlobs: list(group.pathGlobs), fileNameRegexes: list(group.fileNameRegexes),
        excludePathRegexes: list(group.excludePathRegexes), excludePathGlobs: list(group.excludePathGlobs),
        fileExtensions: conventions.normalizedExtensions(group)
    });
    return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 8);
}

// A driver run in a CHILD process: a regex that outruns the time guard hangs only the child, which the parent kills,
// so a broken guard fails these tests instead of freezing the suite. The child prints one JSON row per result.
const GUARD_DRIVER = `
const request = JSON.parse(process.argv[1]);
const conventions = require(request.lib);
const text = request.text.char.repeat(request.text.length) + request.text.tail;
const now = () => Number(process.hrtime.bigint()) / 1e6;
const emit = value => process.stdout.write(JSON.stringify(value) + '\\n');
const clone = value => JSON.parse(JSON.stringify(value));
const gate = conventions.AI_FEATURE_GATE;
const group = (regexes, name) => ({ name: name || 'hostile', pathRegexes: [], contentRegexes: regexes, contentExtensions: ['.py'], rules: ['r'] });
const copy = regexes => Object.assign(clone(gate), { contentRegexes: regexes });
const explain = (g, sample, reset) => {
    if (reset) conventions.resetContentGuard();
    const started = now();
    let threw = null;
    let result = null;
    try { result = conventions.explainGroupMatch(g, 'a.py', { readContent: () => sample }, true); } catch (error) { threw = String(error && error.message); }
    return { ms: now() - started, threw, member: result ? result.member : null, signals: result ? result.contentSignals : null, stats: conventions.contentGuardStats() };
};
const scenarios = {
    shapes() {
        for (const shape of request.shapes) emit(Object.assign({ shape, lint: conventions.contentRegexLintReason(shape) }, explain(group([shape]), text, true)));
    },
    copies() {
        emit(Object.assign({ label: 'shipped+hostile' }, explain(copy([gate.contentRegexes[0], 'a*b*a*c']), text, true)));
        emit(Object.assign({ label: 'hostile-only' }, explain(copy(['a*b*a*c']), text, true)));
        emit(Object.assign({ label: 'marker-at-cap' }, explain(copy(['zz-marker']), 'x'.repeat(16384) + 'zz-marker', true)));
        emit(Object.assign({ label: 'marker-inside' }, explain(copy(['zz-marker']), 'x'.repeat(16368) + 'zz-marker', true)));
        emit(Object.assign({ label: 'shipped-copy' }, explain(copy(gate.contentRegexes), 'x'.repeat(20000) + '\\nimport anthropic\\n', true)));
    },
    builtin() {
        emit(Object.assign({ label: 'positive' }, explain(gate, 'x'.repeat(20000) + '\\nimport anthropic\\n', true)));
        emit(Object.assign({ label: 'project-copy' }, explain(clone(gate), 'import anthropic\\n', true)));
        for (const unit of [' ', '"', '\\\\n', 'import ', 'messages.create(']) {
            emit(Object.assign({ label: 'adversarial ' + JSON.stringify(unit) }, explain(gate, unit.repeat(Math.ceil(65536 / unit.length)).slice(0, 65536), true)));
        }
    },
    sticky() {
        const g = group(['a*b*a*c']);
        emit(Object.assign({ label: 'first' }, explain(g, text, true)));
        emit(Object.assign({ label: 'second' }, explain(g, text, false)));
        emit(Object.assign({ label: 'third' }, explain(g, text, false)));
        emit(Object.assign({ label: 'after-reset' }, explain(g, text, true)));
    },
    budget() {
        const g = group(['a*b*a*c', '(a{1,50}){1,50}b', 'zz-none']);
        emit(Object.assign({ label: 'file1' }, explain(g, text, true)));
        emit(Object.assign({ label: 'file2' }, explain(g, text, false)));
        emit(Object.assign({ label: 'file3' }, explain(g, text, false)));
    }
};
scenarios[request.scenario]();
`;

/** Runs one GUARD_DRIVER scenario in a child; `killed` is true when the child had to be killed for running too long. */
function runGuardScenario(fx, request, killAfterMs = 20000) {
    const result = spawnSync(process.execPath, ['-e', GUARD_DRIVER, JSON.stringify({ lib: path.join(HOOKS_DIR, 'lib', 'file-conventions.cjs'), text: { char: 'a', length: 16383, tail: 'Z' }, ...request })], {
        encoding: 'utf8', windowsHide: true, timeout: killAfterMs, env: cleanEnv(fx)
    });
    const rows = (result.stdout || '').split('\n').filter(Boolean).map(line => JSON.parse(line));
    const killed = Boolean(result.error && result.error.code === 'ETIMEDOUT');
    return { rows, killed, status: result.status, stderr: result.stderr };
}

// ── tests ───────────────────────────────────────────────────────────────────

const tests = [
    {
        // INTENT: a file that calls a model SDK gets the AI protocol although its path says nothing about AI.
        // Given source files that call a model SDK (nine languages and call shapes) at paths that say nothing about AI
        // When each is edited
        // Then the gate is delivered in the mandatory wording and names only the protocol file
        name: 'TC-AIG-001 an edit to a file that calls a model SDK delivers the AI gate even though its path says nothing about AI',
        fn: async () => withFixture(async fx => {
            const files = {
                'src/service.ts': SDK_IMPORT,
                'src/worker.py': 'import os\nfrom openai import OpenAI\n',
                'src/summarize.js': `const { generateText } = ${cjsRequire('ai')};\n`,
                'server/handler.go': 'import (\n  "github.com/sashabaranov/go-openai"\n)\n',
                'src/http.ts': 'await fetch("https://api.anthropic.com/v1/messages", { method: "POST" });\n',
                'src/settings.rb': 'MODEL = "claude-sonnet-4-5"\n',
                'src/store.cs': 'using Azure.AI.OpenAI;\n',
                'lib/search.py': 'import pgvector\n',
                'lib/tools.ts': "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n"
            };
            for (const [rel, content] of Object.entries(files)) {
                fx.write(rel, content);
                // Given a file with a model-SDK signal / When it is changed / Then the gate is delivered, mandatory wording
                const text = await deliver(fx, gateConfig(), post(fx, 'Edit', rel, { session_id: fresh() }));
                assert.ok(gateDelivered(text), `${rel}: gate delivered by content`);
                // Then the digest names ONE doc to read (the protocol); the deep docs are never pointed at as reads
                assert.ok(text.includes(PROTOCOL), `${rel}: names the protocol file`);
                assert.ok(!text.includes(CHECKLIST) && !text.includes(KNOWLEDGE) && !text.includes(CALIBRATION), `${rel}: never sends the reader to a deep doc whole`);
                assert.ok(text.includes('Deep dives on demand, by section, never whole'), `${rel}: deep docs are on demand, by section`);
                assert.ok(/^\[conventions\] .*MUST read first: \.claude\/skills\/shared\/protocols\/ai-engineering-gate\.md\n/.test(text), `${rel}: a change is told to read the protocol first`);
            }
        })
    },
    {
        // INTENT: an AI-surface path or file name is a signal on its own (a prompt file has no SDK call in it).
        // Given files under AI-surface directories or with prompt file names, and look-alikes (other folder names, non-text files)
        // When each is edited
        // Then the members receive the gate by path alone and the look-alikes receive nothing
        name: 'TC-AIG-002 AI-surface directories and prompt file names deliver the gate by path alone; look-alike names do not',
        fn: async () => withFixture(async fx => {
            const members = ['src/prompts/summarize.txt', 'app/llm/client.ts', 'x/rag/index.py', 'a/embeddings/build.py',
                'svc/guardrails/check.py', 'tools/mcp/server.ts', 'app/prompt/base.txt',
                'x/summarize.prompt.txt', 'x/chat.prompts.json', 'flows/classify.prompty', 'cfg/system_prompt.txt', 'cfg/system-prompt.v2.txt', 'cfg/prompt_template.j2',
                // Text under a signal directory stays a member, whatever its extension
                'app/prompts/notes.json', 'svc/rag/schema.yaml', 'a/llm/readme.txt', 'x/prompts/a.map.txt'];
            for (const rel of members) {
                fx.write(rel, '// nothing that names a model\n');
                assert.ok(gateDelivered(await deliver(fx, gateConfig(), post(fx, 'Edit', rel, { session_id: fresh() }))), `${rel} is an AI surface by path`);
            }
            // Look-alike names, and directory names shared with non-AI code (a real-estate `agents` app, a test `evals`
            // folder, a document `retrieval` module): a folder name alone is not an AI surface — the SDK import decides.
            const others = ['src/promptsx/a.py', 'src/agentsmith/a.ts', 'src/util.ts', 'src/ragged/a.py', 'src/evaluate/a.py', 'src/summarize.ts',
                'src/subprompt.txt', 'docs/rag/example.py', 'lib/prompts/README.md', 'x/summarize.prompt.md',
                'app/agents/models.py', 'src/agents/AgentList.tsx', 'lib/retrieval/search.ts', 'ml/evals/run.py',
                // Non-text files under a signal directory (an interactive-CLI `prompts/` folder, a red-amber-green `rag/` folder,
                // binary blobs, archives, media, locks, source maps, minified bundles) are not AI surfaces
                'cli/prompts/logo.png', 'rag/model.bin', 'web/prompts/app.min.js', 'assets/llm/clip.mp4', 'x/rag/deps.lock', 'x/prompts/bundle.js.map',
                'ui/rag/status.svg', 'ml/embeddings/weights.bin', 'a/prompts/photo.JPG', 'a/mcp/spec.pdf', 'a/llm/cache.zip'];
            for (const rel of others) {
                fx.write(rel, '// nothing that names a model\n');
                assert.equal(gateDelivered(await deliver(fx, gateConfig(), post(fx, 'Edit', rel, { session_id: fresh() }))), false, `${rel} is not an AI surface`);
            }
        })
    },
    {
        // INTENT: precision — the gate must not tax unrelated code, prose, framework folders or dependency output.
        // Given SMS-style calls, plain imports, prose, framework folders, dependency output and lock files
        // When each is edited
        // Then none of them receives the gate
        name: 'TC-AIG-003 unrelated code, prose, framework folders, dependency output and lock files never receive the gate',
        fn: async () => withFixture(async fx => {
            const files = {
                'src/sms.ts': "await twilio.messages.create({ body: 'hi', to: '+15550100', from: '+15550101' });\n",
                'src/validate.ts': "import { z } from 'zod';\nimport express from 'express';\n",
                'src/notes.py': 'import os\nimport json\n# the openai_utils helper is not an SDK import\nimport openai_utils\n',
                'src/label.ts': "const cli = 'claude-code';\nconst gpt = 3;\n",
                'src/aimed.ts': "import x from 'aim';\n",
                'README.md': SDK_IMPORT,
                'docs/guide.py': SDK_IMPORT,
                '.claude/hooks/example.cjs': SDK_IMPORT,
                '.agents/skills/x/run.py': 'import anthropic\n',
                'node_modules/pkg/index.js': SDK_IMPORT,
                'dist/bundle.js': SDK_IMPORT,
                'tmp/scratch.py': 'import anthropic\n',
                'yarn.lock': 'pinecone@1.0.0\n',
                'src/data.json': '{"model": "claude-sonnet-4-5"}\n'
            };
            for (const [rel, content] of Object.entries(files)) {
                fx.write(rel, content);
                assert.equal(gateDelivered(await deliver(fx, gateConfig(), post(fx, 'Edit', rel, { session_id: fresh() }))), false, `${rel} must not receive the AI gate`);
            }
        })
    },
    {
        // INTENT: reading is the expensive part — only classes that ask for content pay, only where a path signal did not
        // already decide, and never for a path the class excludes.
        // Given a reader that records every read, and classes with and without content signals
        // When files are matched
        // Then only an eligible, not-excluded, not-path-decided file of a content-declaring class is read, once
        name: 'TC-AIG-004 content is read only for eligible files of classes that declare content signals',
        fn: () => {
            const reads = [];
            const ctx = { readContent: rel => { reads.push(rel); return 'import anthropic\n'; } };
            const config = gateConfig();
            const settings = conventions.resolveSettings(config);
            const matched = rels => conventions.matchGroups(config, rels, settings, 'edit', ctx).map(e => e.name);
            // Eligible code file with no path signal → exactly one read, and it matches
            assert.deepEqual(matched(['src/service.py']), ['ai-feature-gate']);
            assert.deepEqual(reads, ['src/service.py']);
            // A path signal already decided → no read
            reads.length = 0;
            assert.deepEqual(matched(['src/prompts/a.py']), ['ai-feature-gate']);
            assert.deepEqual(reads, [], 'path-decided file is not read');
            const explained = conventions.explainGroupMatch(GATE, 'src/prompts/a.py', ctx, true);
            assert.deepEqual(explained.pathSignals, ['pathRegexes']);
            assert.deepEqual(explained.contentSignals, [], 'review-time collect-all does not evaluate redundant content signals');
            assert.deepEqual(reads, [], 'review-time collect-all preserves the no-read path shortcut');
            // Excluded path, extension outside contentExtensions, or no extension → no read, no match
            for (const rel of ['node_modules/x/a.py', '.claude/hooks/a.py', 'docs/a.py', 'src/notes.txt', 'src/Makefile']) {
                reads.length = 0;
                assert.deepEqual(matched([rel]), [], `${rel} not matched`);
                assert.deepEqual(reads, [], `${rel} is never read`);
            }
            // A class without content signals never reads, whatever the file
            reads.length = 0;
            const plain = { conventionInjection: { enabled: true }, contextGroups: [conventions.UI_UX_GATE, { name: 'py', pathGlobs: ['**/*.py'], rules: ['r'] }] };
            assert.deepEqual(conventions.matchGroups(plain, ['src/service.py', 'web/a.tsx'], null, 'edit', ctx).map(e => e.name), ['ui-ux-gate', 'py']);
            assert.deepEqual(reads, [], 'no class declares content signals: nothing is read');
            // A class that lists content extensions but NO content regexes has nothing to look for: it never reads either
            // (the extension list alone must not cost a read per candidate file)
            reads.length = 0;
            const extOnly = { conventionInjection: { enabled: true }, contextGroups: [{ name: 'ext-only', pathGlobs: ['lib/**'], contentExtensions: ['.py'], rules: ['r'] }] };
            assert.deepEqual(conventions.matchGroups(extOnly, ['src/service.py', 'lib/a.py'], null, 'edit', ctx).map(e => e.name), ['ext-only'], 'matched by its path glob only');
            assert.deepEqual(reads, [], 'content extensions without content regexes: nothing is read');
            // Without a reader a class matches by path and name only; a throwing reader is a non-match, never an error
            assert.deepEqual(conventions.matchGroups(config, ['src/service.py'], settings, 'edit').map(e => e.name), []);
            assert.deepEqual(conventions.matchGroups(config, ['src/service.py'], settings, 'edit', { readContent: () => { throw new Error('boom'); } }), []);
            assert.deepEqual(conventions.matchGroups(config, ['src/service.py'], settings, 'edit', { readContent: () => 42 }), []);
        }
    },
    {
        // INTENT: bounded, fail-open reading — a huge, binary, missing or folder target never slows or breaks an edit.
        // Given files at, beyond and over the 64 KiB sample and 2 MiB cap, binary, missing, folder and outside-project targets
        // When the gate is delivered or the reader is called
        // Then only in-sample signals match and every other case is a fail-open no-match
        name: 'TC-AIG-005 the content read is bounded (64 KiB sample, 2 MiB file cap) and fail-open',
        fn: async () => withFixture(async fx => {
            const { maxBytes, maxFileBytes } = conventions.CONTENT_LIMITS;
            assert.equal(maxBytes, 65536);
            assert.equal(maxFileBytes, 2 * 1024 * 1024);
            const filler = size => `${'// filler\n'.repeat(Math.ceil(size / 10))}`.slice(0, size);
            const delivered = async rel => gateDelivered(await deliver(fx, gateConfig(), post(fx, 'Edit', rel, { session_id: fresh() })));
            // Signal inside the first 64 KiB → matched
            fx.write('src/inside.py', `${filler(maxBytes - 4096)}\nimport anthropic\n`);
            assert.ok(await delivered('src/inside.py'), 'signal inside the sample matches');
            // Signal only after the sample → not seen
            fx.write('src/beyond.py', `${filler(maxBytes + 4096)}\nimport anthropic\n`);
            assert.equal(await delivered('src/beyond.py'), false, 'signal past 64 KiB is not read');
            // File over the cap → never read, even with the signal on line one
            fx.write('src/huge.py', `import anthropic\n${filler(maxFileBytes + 1)}`);
            assert.ok(fs.statSync(fx.abs('src/huge.py')).size > maxFileBytes);
            assert.equal(await delivered('src/huge.py'), false, 'over-cap file is skipped');
            // Binary sample (NUL) → not text
            fx.write('src/blob.py', Buffer.concat([Buffer.from('import anthropic\n'), Buffer.from([0, 1, 2, 3])]));
            assert.equal(await delivered('src/blob.py'), false, 'binary sample is skipped');
            // Missing file and a folder named like code → no match, no throw
            assert.equal(await delivered('src/absent.py'), false, 'missing file');
            fs.mkdirSync(fx.abs('src/folder.py'), { recursive: true });
            assert.equal(conventions.createContentReader(fx.project)('src/folder.py'), null, 'a folder reads as null');
            // The reader stays inside the project: a real, readable sibling file one level up is NOT read through `..`
            fs.writeFileSync(path.join(fx.root, 'outside.py'), 'import anthropic\n');
            assert.equal(conventions.readBoundedContent(path.join(fx.root, 'outside.py')), 'import anthropic\n', 'the file exists and is readable, so a null below is the guard');
            assert.equal(conventions.createContentReader(fx.project)('../outside.py'), null);
            assert.equal(conventions.createContentReader(fx.project)('src/../../outside.py'), null);
            assert.equal(await delivered('../outside.py'), false, 'and the hook never delivers for it');
            // and reads a path once
            assert.equal(conventions.createContentReader('')('a.py'), null);
            const cached = conventions.createContentReader(fx.project);
            fx.write('src/twice.py', 'import anthropic\n');
            assert.equal(cached('src/twice.py'), 'import anthropic\n');
            fx.write('src/twice.py', 'changed on disk after the first read\n');
            assert.equal(cached('src/twice.py'), 'import anthropic\n', 'one read per path per reader: the second answer is the memoized first');
            assert.equal(conventions.createContentReader(fx.project)('src/twice.py'), 'changed on disk after the first read\n', 'a new reader sees the file as it is now');
            // The hook never throws or delivers for a target that vanished after the tool ran
            assert.equal(await deliver(fx, gateConfig(), post(fx, 'Write', 'src/vanished.ts', { session_id: fresh() })), '');
        })
    },
    {
        // INTENT: wording and dedup of the gate match the UI gate — a Read is conditional, the first change re-delivers once.
        // Given an AI file that is read, then edited, then edited again with transcript growth
        // When each operation is delivered
        // Then the read is conditional, the first change re-delivers once, dedup holds to the window edge and re-arms there
        name: 'TC-AIG-006 a read delivers the conditional wording, the first change re-delivers once, then dedup holds until the window edge',
        fn: async () => withFixture(async fx => {
            assert.equal(WINDOW_BYTES, 3300000, '150000 tokens x 22 bytes');
            fx.write('src/service.ts', SDK_IMPORT);
            fx.write('src/other.ts', SDK_IMPORT);
            const config = gateConfig();
            const read = await deliver(fx, config, post(fx, 'Read', 'src/service.ts'));
            assert.ok(gateDelivered(read));
            assert.ok(/^\[conventions\] .*If you will edit this file, read first: \.claude\/skills\/shared\/protocols\/ai-engineering-gate\.md/.test(read), 'a read is conditional');
            assert.equal(read.includes('MUST read first'), false);
            assert.ok(read.length <= 1400, `digest stays compact (${read.length} chars)`);
            // The first change after a read-form delivery re-delivers in the mandatory wording, once
            const change = await deliver(fx, config, post(fx, 'Edit', 'src/service.ts'), NOW + 1000);
            assert.ok(gateDelivered(change) && change.includes('MUST read first:'));
            assert.equal(await deliver(fx, config, post(fx, 'Edit', 'src/other.ts'), NOW + 2000), '', 'present: not repeated for another AI file');
            fx.grow(WINDOW_BYTES - 1);
            assert.equal(await deliver(fx, config, post(fx, 'Edit', 'src/other.ts'), NOW + 3000), '', 'just below the window: still present');
            fs.appendFileSync(fx.transcript, '\n');
            assert.ok(gateDelivered(await deliver(fx, config, post(fx, 'Edit', 'src/other.ts'), NOW + 4000)), 'window reached: re-delivered');
        })
    },
    {
        // INTENT: the protocol reaching context another way (the docs read, or the review skill loaded) is not sent twice.
        // Given transcripts that hold a read of one or both AI docs, or a skill load
        // When an AI file is edited
        // Then only both docs (or the review skill) count as already delivered
        name: 'TC-AIG-007 the AI docs already read in the window, or the review skill loaded, count as delivered; one doc or another skill does not',
        fn: async () => withFixture(async fx => {
            fx.write('src/service.ts', SDK_IMPORT);
            const config = gateConfig();
            const edit = session => post(fx, 'Edit', 'src/service.ts', { session_id: session });
            fx.append(fx.completed('Read', { file_path: fx.abs(CHECKLIST) }));
            assert.ok(gateDelivered(await deliver(fx, config, edit('one-doc'))), 'one doc is not the whole gate');
            fx.append(fx.completed('Read', { file_path: fx.abs(PROTOCOL).replace(/\//g, '\\') }));
            assert.equal(await deliver(fx, config, edit('both-docs')), '', 'protocol + checklist read: present');
            assert.equal(ledger.readRecord(fx.store, 'both-docs', 'main', 'ai-feature-gate').form, 'evidence');
            fs.writeFileSync(fx.transcript, `${fx.completed('Skill', { skill: 'commit' })}\n`);
            assert.ok(gateDelivered(await deliver(fx, config, edit('other-skill'))), 'an unrelated skill is not evidence');
            fs.writeFileSync(fx.transcript, `${fx.completed('Skill', { skill: 'ai-engineering-review' })}\n`);
            assert.equal(await deliver(fx, config, edit('review-skill')), '', 'the review skill carries the protocol');
        })
    },
    {
        // INTENT: Codex edits (apply_patch) and the standalone lookup answer like the hook.
        // Given a Python file with an SDK import
        // When a Codex apply_patch, the library lookup and the lookup CLI run
        // Then all three name the gate
        name: 'TC-AIG-008 Codex apply_patch and the --lookup CLI agree with the hook on a content-matched file',
        fn: async () => withFixture(async fx => {
            fx.write('src/service.py', 'from anthropic import Anthropic\n');
            const patched = await deliver(fx, gateConfig(), {
                hook_event_name: 'PostToolUse', tool_name: 'apply_patch', session_id: 'codex', cwd: fx.project,
                tool_input: { command: ['*** Begin Patch', '*** Update File: src/service.py', '*** End Patch'].join('\n') }
            });
            assert.ok(gateDelivered(patched), 'apply_patch delivers');
            // Lookup (library): the digest a change would deliver, with the content signal honored
            const looked = conventions.lookup(gateConfig(), 'src/service.py', { projectDir: fx.project });
            assert.deepEqual(looked.entries.map(e => e.name), ['ai-feature-gate']);
            assert.deepEqual(conventions.lookup(gateConfig(), 'src/plain.py', { projectDir: fx.project }).entries, []);
            // Lookup CLI in a project with no config (built-in fallback), at the process boundary
            const cli = spawnSync(process.execPath, [path.join(HOOKS_DIR, 'lib', 'file-conventions.cjs'), '--lookup', 'src/service.py', '--json'], {
                cwd: fx.project, encoding: 'utf8', windowsHide: true, env: cleanEnv(fx)
            });
            assert.equal(cli.status, 0, cli.stderr);
            assert.deepEqual(JSON.parse(cli.stdout).classes.map(c => c.name), ['ai-feature-gate']);
        })
    },
    {
        // INTENT: the static rows and the runtime never disagree about membership or version.
        // Given the gate class, a legacy class and edits of each content field
        // When the static table, the inline rules and the version tags are built
        // Then static text names the content signals, legacy classes keep their version, any content edit changes it
        name: 'TC-AIG-009 static parity: the generated table and rules name the content signals; classes without them keep their content version',
        fn: () => {
            const config = gateConfig();
            const entry = conventions.injectableEntries(config)[0];
            const table = builders.buildSkillActivation(config);
            const row = table.split('\n').find(line => line.includes(conventions.conventionTag(entry)));
            assert.ok(row, 'the class has a row tagged with its content version');
            assert.ok(row.includes(`content signals: AI SDK use in ${GATE.contentExtensions.length} code file types`), row);
            assert.ok(row.includes('name:'), 'path/name matchers are still listed');
            assert.ok(row.includes(PROTOCOL) && !row.includes(KNOWLEDGE), 'the pre-read list is the protocol file only');
            const golden = builders.buildGoldenRules(config);
            assert.ok(golden.includes('content signals (AI SDK use) in'), 'the inline rules scope names the content include');
            assert.ok(golden.includes('`.py`') && golden.includes('`.ts`'), 'and the scanned file types');
            // A class without content signals renders and hashes exactly as before content signals existed
            const legacy = { name: 'legacy', pathGlobs: ['src/**'], fileExtensions: ['.py'], excludePathGlobs: ['tmp/**'], rules: ['a rule'], referenceDocs: ['docs/x.md'], priority: 100 };
            const legacyEntry = conventions.injectableEntries({ contextGroups: [legacy] })[0];
            assert.equal(conventions.groupHash(legacyEntry), legacyHash(legacyEntry), 'no content fields: same version as before');
            const uiEntry = conventions.injectableEntries({ contextGroups: [conventions.UI_UX_GATE] })[0];
            assert.equal(conventions.groupHash(uiEntry), legacyHash(uiEntry), 'the UI/UX gate keeps its version');
            assert.equal(builders.buildSkillActivation({ contextGroups: [legacy] }).includes('content signals'), false);
            // Membership of content signals is part of the version: editing any of them re-delivers
            const base = conventions.groupHash(entry);
            const changed = patch => conventions.groupHash(conventions.injectableEntries({ contextGroups: [{ ...clone(GATE), ...patch }] })[0]);
            assert.notEqual(base, legacyHash(entry), 'a class with content signals has its own version');
            assert.notEqual(changed({ contentRegexes: GATE.contentRegexes.slice(1) }), base);
            assert.notEqual(changed({ contentExtensions: GATE.contentExtensions.slice(1) }), base);
            assert.notEqual(changed({ contentLabel: 'other label' }), base);
            assert.equal(changed({}), base, 'same class, same version');
            assert.equal(conventions.RENDERER_VERSION, 'pfci-2', 'existing tags stay valid: the renderer version did not move');
        }
    },
    {
        // INTENT: the validator accepts what the runtime uses and rejects what could slow or never match.
        // Given configs exactly at and one past each content cap, malformed content fields and an unsafe pattern
        // When they are validated
        // Then the validator accepts what the runtime uses and rejects the rest, by name
        name: 'TC-AIG-010 the config validator bounds content signals and mirrors the runtime caps',
        fn: () => {
            const { maxRegexes, maxRegexLength, maxExtensions, maxLabelLength } = conventions.CONTENT_LIMITS;
            const group = patch => ({ name: 'ai', pathRegexes: [], contentRegexes: ['import anthropic'], contentExtensions: ['.py'], rules: ['r'], ...patch });
            const delta = patch => validationDelta({ contextGroups: [group(patch)] });
            assert.deepEqual(delta({}), { errors: [], warnings: [] }, 'a content-only class is a complete class');
            assert.deepEqual(validationDelta({ contextGroups: [clone(GATE)] }), { errors: [], warnings: [] }, 'the framework class validates clean');
            // Caps: exactly the runtime caps are accepted, one more is rejected
            assert.deepEqual(delta({ contentRegexes: Array.from({ length: maxRegexes }, (_, i) => `sig${i}`) }).errors, []);
            assert.equal(delta({ contentRegexes: Array.from({ length: maxRegexes + 1 }, (_, i) => `sig${i}`) }).errors.length, 1);
            assert.deepEqual(delta({ contentRegexes: ['a'.repeat(maxRegexLength)] }).errors, []);
            assert.equal(delta({ contentRegexes: ['a'.repeat(maxRegexLength + 1)] }).errors.length, 1);
            assert.deepEqual(delta({ contentExtensions: Array.from({ length: maxExtensions }, (_, i) => `.e${i}`) }).errors, []);
            assert.equal(delta({ contentExtensions: Array.from({ length: maxExtensions + 1 }, (_, i) => `.e${i}`) }).errors.length, 1);
            assert.deepEqual(delta({ contentLabel: 'l'.repeat(maxLabelLength) }).errors, []);
            assert.equal(delta({ contentLabel: 'l'.repeat(maxLabelLength + 1) }).errors.length, 1);
            // Runtime honors exactly what the validator accepts: an over-cap regex is ignored, never partially applied
            const over = { name: 'ai', pathRegexes: [], contentRegexes: ['a'.repeat(maxRegexLength + 1)], contentExtensions: ['.py'] };
            assert.deepEqual(conventions.contentRegexSources(over), []);
            assert.equal(conventions.contentRegexSources({ ...over, contentRegexes: Array.from({ length: maxRegexes + 5 }, (_, i) => `s${i}`) }).length, maxRegexes);
            // Malformed content signals
            assert.equal(delta({ contentRegexes: ['(unclosed'] }).errors.length, 1, 'invalid regex');
            assert.equal(delta({ contentRegexes: ['   '] }).errors.length >= 1, true, 'blank regex');
            assert.equal(delta({ contentExtensions: undefined }).errors.some(e => e.includes('needs contentExtensions')), true, 'regexes with no extensions can never match');
            assert.equal(delta({ contentExtensions: ['py file'] }).errors.length, 1, 'extension shape');
            assert.equal(delta({ contentRegexes: undefined, pathRegexes: ['/x/'] }).warnings.some(w => w.includes('no effect')), true, 'extensions without regexes warn');
            assert.equal(delta({ contentRegexes: undefined, pathRegexes: [] }).errors.some(e => e.includes('needs at least one include matcher')), true, 'still needs an include');
            // A pattern whose running time is not bounded is rejected by name, one error per pattern (see TC-AIG-015 for the corpus)
            const unsafe = delta({ contentRegexes: ['^(a+)+$'] }).errors;
            assert.equal(unsafe.length, 1, JSON.stringify(unsafe));
            assert.ok(unsafe[0].includes('contentRegexes[0]') && unsafe[0].includes('unsafe content regex'), unsafe[0]);
        }
    },
    {
        // INTENT: a project with no AI dependency never pays; one whose manifests name an AI SDK is offered the class.
        // Given dependency manifests of many ecosystems, with and without an AI SDK
        // When setup detection runs
        // Then the gate is proposed only for AI SDK evidence, as a complete valid class
        name: 'TC-AIG-011 detection proposes the gate only from dependency manifests that name an AI SDK',
        fn: async () => withFixture(async fx => {
            const detect = () => merge.detectGroups({}, { projectDir: fx.project, fileExists: () => true }).map(g => g.name);
            const clear = () => { fs.rmSync(fx.project, { recursive: true, force: true }); fs.mkdirSync(fx.project, { recursive: true }); };
            const cases = [
                ['package.json', JSON.stringify({ dependencies: { '@anthropic-ai/sdk': '^0.30.0' } })],
                ['package.json', JSON.stringify({ devDependencies: { ai: '^4.0.0' } })],
                ['package.json', JSON.stringify({ dependencies: { '@langchain/core': '1.0.0' } })],
                ['requirements.txt', 'flask==3.0\nopenai>=1.40\n'],
                ['requirements-dev.txt', 'llama-index-core==0.11\n'],
                ['pyproject.toml', '[project]\ndependencies = ["anthropic>=0.30", "requests"]\n'],
                ['go.mod', 'module x\n\nrequire github.com/sashabaranov/go-openai v1.20.0\n'],
                ['pom.xml', '<dependency><groupId>com.anthropic</groupId><artifactId>anthropic-java</artifactId></dependency>'],
                ['build.gradle', 'implementation("dev.langchain4j:langchain4j:0.35.0")'],
                ['Api/Api.csproj', '<ItemGroup><PackageReference Include="Azure.AI.OpenAI" Version="2.0.0" /></ItemGroup>'],
                ['services/api/requirements.txt', 'sentence-transformers==3.0\n']
            ];
            for (const [file, content] of cases) {
                clear();
                fx.write(file, content);
                assert.ok(detect().includes('ai-feature-gate'), `${file}: ${content.slice(0, 40)} proposes the gate`);
            }
            const noEvidence = [
                ['package.json', JSON.stringify({ dependencies: { express: '4', react: '18' }, description: 'an ai tool' })],
                ['requirements.txt', 'flask\nopenai-proxy-utils==1\n# uses ai heavily\n'],
                ['pyproject.toml', '[project]\nname = "ai"\ndescription = "ai helpers"\n'],
                ['package.json', '{ not json'],
                ['node_modules/pkg/package.json', JSON.stringify({ dependencies: { openai: '4' } })],
                ['a/b/c/requirements.txt', 'openai\n'],
                ['.hidden/requirements.txt', 'openai\n']
            ];
            for (const [file, content] of noEvidence) {
                clear();
                fx.write(file, content);
                assert.equal(detect().includes('ai-feature-gate'), false, `${file}: ${content.slice(0, 40)} is not evidence`);
            }
            // Every name of the shared list that only manifests spell (or that a namespace prefix covers) is evidence on its own:
            // a name dropped from the manifest matcher would silently stop proposing the class
            const manifestFor = name => {
                if (conventions.AI_SDK.manifestOnly.includes(name)) return ['requirements.txt', `flask==3.0\n${name}>=1.0\n`];
                if (name.startsWith('github.com/')) return ['go.mod', `module x\n\nrequire ${name} v1.2.3\n`];
                if (/^(?:com|dev|org)\./.test(name)) return ['pom.xml', `<dependency><groupId>${name}</groupId><artifactId>sdk</artifactId></dependency>`];
                return ['Api/Api.csproj', `<ItemGroup><PackageReference Include="${name}" Version="1.0.0" /></ItemGroup>`];
            };
            for (const name of [...conventions.AI_SDK.manifestOnly, ...conventions.AI_SDK.other]) {
                const [file, content] = manifestFor(name);
                clear();
                fx.write(file, content);
                assert.ok(detect().includes('ai-feature-gate'), `${name} in ${file} proposes the gate`);
            }
            clear();
            assert.deepEqual(detect(), [], 'a project with no manifests proposes nothing');
            // The proposal is a complete, valid class that keeps the framework's signals and delivers on both operations
            fx.write('requirements.txt', 'anthropic\n');
            const proposed = merge.detectGroups({}, { projectDir: fx.project, fileExists: () => true }).find(g => g.name === 'ai-feature-gate');
            assert.equal(proposed.on, 'both');
            for (const field of ['contentRegexes', 'contentExtensions', 'contentLabel', 'pathRegexes', 'fileNameRegexes', 'rules', 'referenceDocs', 'excludePathGlobs']) {
                assert.deepEqual(proposed[field], GATE[field], `${field} carried into the proposal`);
            }
            assert.deepEqual(validationDelta({ contextGroups: [proposed] }), { errors: [], warnings: [] });
            // Docs missing on disk are left out, the class is still proposed; nothing deliverable left → not proposed
            const withoutDocs = merge.detectGroups({}, { projectDir: fx.project, fileExists: rel => !rel.startsWith('.claude/skills/shared/protocols/') }).find(g => g.name === 'ai-feature-gate');
            assert.equal(withoutDocs.referenceDocs, undefined);
            assert.ok(withoutDocs.rules.length > 0);
            // Additive merge: added once, never overwriting a maintainer's own class of that name
            const added = merge.mergeDetected([], [proposed]);
            assert.deepEqual(added.added, ['ai-feature-gate']);
            const mine = { name: 'ai-feature-gate', pathRegexes: [], pathGlobs: ['mine/**'], rules: ['mine'] };
            assert.deepEqual(merge.mergeDetected([mine], [proposed]).groups, [mine]);
        })
    },
    {
        // INTENT: an install without setup still gets both gates, each on its own files, together within the size budget.
        // Given a project with no config file
        // When the built-in fallback hook runs on AI, plain, front-end and both kinds of file
        // Then each file gets its own gate(s), a repeat is silent and the digest fits the budget
        name: 'TC-AIG-012 no project config: the built-in fallback carries the UI/UX and AI-feature gates and dedups them',
        fn: async () => withFixture(async fx => {
            assert.equal(fs.existsSync(path.join(fx.project, 'docs', 'project-config.json')), false, 'no project config');
            assert.deepEqual(conventions.builtinFallbackConfig().contextGroups.map(g => g.name), ['ui-ux-gate', 'ai-feature-gate']);
            fx.write('src/service.py', 'from anthropic import Anthropic\n');
            fx.write('src/plain.py', 'print("hello")\n');
            fx.write('web/Card.tsx', "import OpenAI from 'openai';\nexport const Card = () => null;\n");
            fx.write('web/Plain.tsx', 'export const Plain = () => null;\n');
            const edit = (rel, extra) => post(fx, 'Edit', rel, extra);
            const first = spawnNoConfig(fx, edit('src/service.py'));
            assert.ok(gateDelivered(first) && !first.includes('ui-ux-gate@'), 'AI file: AI gate only');
            assert.equal(spawnNoConfig(fx, edit('src/plain.py')), '', 'plain code: nothing');
            assert.equal(spawnNoConfig(fx, edit('src/service.py')), '', 'already present in this context');
            const both = spawnNoConfig(fx, edit('web/Card.tsx', { session_id: 'both' }));
            assert.ok(both.includes('ui-ux-gate@') && gateDelivered(both), 'a front-end file that calls a model gets both gates');
            assert.ok(both.length <= conventions.DEFAULTS.maxChars, `both gates fit the budget (${both.length} chars)`);
            assert.ok(both.indexOf('ui-ux-gate@') < both.indexOf(TAG), 'equal priority: declaration order, UI first');
            const ui = spawnNoConfig(fx, edit('web/Plain.tsx', { session_id: 'ui-only' }));
            assert.ok(ui.includes('ui-ux-gate@') && !gateDelivered(ui), 'front-end without a model call: UI gate only');
        })
    },
    {
        // INTENT: a project's own working copy of the class stays in step with the framework definition.
        // Given the framework repo's own project config
        // When its ai-feature-gate class is compared with the framework class
        // Then signals, rules, docs, window and evidence are identical
        name: 'TC-AIG-013 the project config gate (in the framework repo) keeps the framework signals, rules, docs, window and evidence',
        fn: () => {
            if (!isFrameworkRepo(REPO_ROOT)) return;
            const configFile = path.join(REPO_ROOT, 'docs', 'project-config.json');
            if (!fs.existsSync(configFile)) return;
            const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            const group = (config.contextGroups || []).find(g => g && g.name === 'ai-feature-gate');
            assert.ok(group, 'the framework repo declares the ai-feature-gate class (tripwire: this guard is active here)');
            for (const field of ['on', 'priority', 'rules', 'referenceDocs', 'reinjectAfterTokens', 'evidenceDocs', 'evidenceSkills', 'fileNameRegexes', 'pathRegexes',
                'contentRegexes', 'contentExtensions', 'contentLabel', 'excludePathGlobs']) {
                assert.deepEqual(group[field], GATE[field], `ai-feature-gate.${field} drifted from the framework definition`);
            }
            const result = schema.validateConfig(config);
            assert.deepEqual(result.errors.filter(e => e.includes('contextGroups')), [], 'the declared classes validate');
        }
    },
    {
        // INTENT: the SDK list has one owner — content signals and manifest detection are built from it.
        // Given every SDK name of the shared list, and look-alike names
        // When they are matched by the content signals
        // Then every SDK matches and no look-alike does
        name: 'TC-AIG-014 every SDK in the shared list is matched by the content signals, and lookalikes are not',
        fn: () => {
            const ctx = text => ({ readContent: () => text });
            const matches = (rel, text) => conventions.explainGroupMatch(GATE, rel, ctx(text), false).member;
            for (const name of conventions.AI_SDK.python) assert.ok(matches('a.py', `import ${name}\n`), `python: import ${name}`);
            for (const name of conventions.AI_SDK.pythonPrefixes) assert.ok(matches('a.py', `from ${name}_core import x\n`), `python prefix: ${name}`);
            for (const name of conventions.AI_SDK.js) assert.ok(matches('a.ts', `import x from '${name}';\n`), `js: ${name}`);
            for (const scope of conventions.AI_SDK.jsScopes) assert.ok(matches('a.ts', `const x = require("${scope}pkg");\n`), `js scope: ${scope}`);
            for (const name of conventions.AI_SDK.other) assert.ok(matches('a.go', `// uses ${name}\n`), `other: ${name}`);
            for (const lookalike of ['import openai_utils', 'import transformersx', 'from mistralaix import y', 'import anthropic_proxy']) {
                assert.equal(matches('a.py', `${lookalike}\n`), false, `${lookalike} is not an SDK import`);
            }
            for (const lookalike of ["import x from 'openaix'", "import x from 'ai-utils'", "import x from '@anthropic-ai'"]) {
                assert.equal(matches('a.ts', `${lookalike};\n`), false, `${lookalike} is not an SDK import`);
            }
        }
    },
    {
        // INTENT: the static lint is a cheap PRE-FILTER — it keeps the well-known slow shapes (nested or overlapping repetition, long
        // chains of loop-free optional elements) out of the matcher; the time guarantee is the vm budget of TC-AIG-020..023.
        // Given patterns of nested and overlapping repetition and an input sized to hang an unguarded matcher
        // When the validator checks each pattern, and the runtime and the hook match a config that bypassed the validator
        // Then the validator rejects each by name, the runtime ignores it, no match takes longer than the bound, and safe patterns still work
        name: 'TC-AIG-015 the lint pre-filter: unsafe content regexes are rejected by the validator and ignored by the runtime',
        fn: async () => withFixture(async fx => {
            const HANG = [
                ['^(a+)+$', `${'a'.repeat(28)}!`],
                ['^(a*)*$', `${'a'.repeat(28)}!`],
                ['^(a+)*$', `${'a'.repeat(28)}!`],
                ['^(a|aa)+$', `${'a'.repeat(42)}!`],
                ['(.*x){8}$', `${'x'.repeat(50)}!`]
            ];
            const BOUND_MS = 500;
            const validatorErrors = pattern => validationDelta({ contextGroups: [{ name: 'ai', pathRegexes: [], contentRegexes: [pattern], contentExtensions: ['.py'], rules: ['r'] }] }).errors;
            for (const [pattern, input] of HANG) {
                const errors = validatorErrors(pattern);
                assert.equal(errors.length, 1, `${pattern}: ${JSON.stringify(errors)}`);
                assert.ok(errors[0].includes('contentRegexes[0]') && errors[0].includes('unsafe content regex'), errors[0]);
                assert.equal(conventions.isSafeContentRegex(pattern), false, `${pattern} fails the shared predicate`);
                const hostile = { name: 'hostile', pathRegexes: [], contentRegexes: [pattern], contentExtensions: ['.py'], rules: ['r'] };
                assert.deepEqual(conventions.contentRegexSources(hostile), [], `${pattern} is ignored at runtime`);
                const started = Date.now();
                const explained = conventions.explainGroupMatch(hostile, 'a.py', { readContent: () => input }, true);
                const elapsed = Date.now() - started;
                assert.equal(explained.member, false);
                assert.ok(elapsed < BOUND_MS, `${pattern} took ${elapsed} ms (bound ${BOUND_MS})`);
                // Through the real hook, with a config that never went through the validator
                fx.write('src/hostile.py', input);
                const hookStarted = Date.now();
                const text = await deliver(fx, { conventionInjection: { enabled: true }, contextGroups: [hostile] }, post(fx, 'Edit', 'src/hostile.py', { session_id: fresh() }));
                assert.equal(text, '', `${pattern}: the hook delivers nothing`);
                assert.ok(Date.now() - hookStarted < BOUND_MS, `${pattern}: the hook returned within ${BOUND_MS} ms`);
            }
            // Other shapes the lint names: back-references, back-to-back open-ended repetition, over-long or uncompilable patterns
            const UNSAFE = ['(a)\\1', '(?<n>a)\\k<n>', 'a*a*b', '.*.*x', '\\w+\\w+$', '(?:x+y)+', `(?:${'a'.repeat(510)})`, '   ', '(unclosed',
                // Loop-free optional elements: V8 cannot interrupt compiling a long chain of them, so a vm timeout cannot bound them
                `${'a?'.repeat(11)}a`, `${'(?:a{0,3})'.repeat(4)}a`, `${'(?:a|)'.repeat(11)}a`];
            const SAFE = ['import anthropic', '(?:foo|bar)+x', '\\bfrom[ \\t]+openai', '(?:\\w{1,20}\\.){1,5}x', '[^)]{0,400}?model', '(?:/[\\w./@-]*)?x',
                'a{2,}b', 'x?(?:ab|cd)*y', '\\bzz-house[ \\t]*=[ \\t]*[a-z]+\\b',
                `${'a?'.repeat(10)}a`, '\\bhttps?://(?:www\\.)?[a-z]+\\.(?:com|org)/x'];
            for (const pattern of UNSAFE) assert.equal(conventions.isSafeContentRegex(pattern), false, `unsafe: ${pattern.slice(0, 30)}`);
            for (const pattern of SAFE) {
                assert.equal(conventions.isSafeContentRegex(pattern), true, `safe: ${pattern}`);
                assert.deepEqual(validatorErrors(pattern), [], `the validator accepts ${pattern}`);
            }
            // Validator and runtime cannot drift: the lint is mirrored by value, and both give the same verdict on every case
            assert.equal(String(schema.contentRegexLintReason), String(conventions.contentRegexLintReason), 'the two lint functions are the same text');
            for (const pattern of [...UNSAFE, ...SAFE, ...HANG.map(([p]) => p), ...GATE.contentRegexes]) {
                assert.equal(schema.contentRegexLintReason(pattern), conventions.contentRegexLintReason(pattern), `same verdict for ${pattern.slice(0, 30)}`);
            }
            // The framework's shipped signals are all inside the lint, so the built-in class is not silently dropped
            for (const source of GATE.contentRegexes) assert.equal(conventions.contentRegexLintReason(source), null, `shipped signal is safe: ${source.slice(0, 40)}`);
            assert.equal(conventions.contentRegexSources(GATE).length, GATE.contentRegexes.length, 'the built-in class keeps every signal');
            assert.ok(conventions.groupMatches(GATE, 'a.py', { readContent: () => 'import anthropic\n' }), 'and still matches an SDK import');
            // Config-supplied signals see a smaller sample than the audited framework signals
            const { maxBytes, maxConfigBytes } = conventions.CONTENT_LIMITS;
            assert.equal(maxConfigBytes, 16384);
            assert.ok(maxConfigBytes < maxBytes);
            const sees = (group, text) => conventions.explainGroupMatch(group, 'a.py', { readContent: () => text }, false).member;
            const custom = { name: 'custom', contentRegexes: ['zz-marker'], contentExtensions: ['.py'], rules: ['r'] };
            assert.equal(sees(custom, `${'x'.repeat(maxConfigBytes - 16)}zz-marker`), true, 'a config signal inside the first 16 KiB matches');
            assert.equal(sees(custom, `${'x'.repeat(maxConfigBytes)}zz-marker`), false, 'a config signal past 16 KiB is not read');
            assert.equal(sees(GATE, `${'x'.repeat(maxConfigBytes + 20000)}\nimport anthropic\n`), true, 'the framework class reads the whole 64 KiB sample');
            assert.equal(sees(clone(GATE), `${'x'.repeat(maxConfigBytes + 20000)}\nimport anthropic\n`), true, 'a project copy of the framework class stays trusted');
        })
    },
    {
        // INTENT: a Jupyter notebook is a Python code file whose source lines are JSON strings, so an SDK import in a code cell must
        // match and a mention of the SDK in a markdown cell must not.
        // Given notebooks with an SDK import (line list, first line of a cell, single-string source), an API call, and notebooks that only mention SDK names
        // When each is edited (the hook) and matched (the shared matcher)
        // Then the import notebooks deliver the gate and the prose-only notebooks do not
        name: 'TC-AIG-016 a notebook with an SDK import in a code cell is an AI surface; one that only mentions the SDK in prose is not',
        fn: async () => withFixture(async fx => {
            const notebook = cells => JSON.stringify({ cells, metadata: { kernelspec: { language: 'python' } }, nbformat: 4, nbformat_minor: 5 }, null, 1);
            const code = source => ({ cell_type: 'code', metadata: {}, outputs: [], execution_count: null, source });
            const markdown = source => ({ cell_type: 'markdown', metadata: {}, source });
            const positives = {
                'nb/lines.ipynb': notebook([code(['import os\n', 'import anthropic\n', 'client = anthropic.Anthropic()'])]),
                'nb/first.ipynb': notebook([code(['from openai import OpenAI\n'])]),
                'nb/string.ipynb': notebook([code('import os\nimport litellm\n')]),
                'nb/http.ipynb': notebook([code(['requests.post("https://api.openai.com/v1/responses")'])])
            };
            const negatives = {
                'nb/prose.ipynb': notebook([markdown(['We compare the anthropic SDK with openai and pinecone.\n', 'No imports here.']), code(['import pandas as pd\n', 'df = pd.DataFrame()'])]),
                'nb/prose-import.ipynb': notebook([markdown(['Example only:\n', '```python\n', 'import openai\n', '```\n']), code(['import pandas as pd\n'])]),
                'nb/prose-call.ipynb': notebook([markdown('Do not execute: requests.post("https://api.openai.com/v1/responses")\n'), code(['import numpy as np\n'])]),
                'nb/plain.ipynb': notebook([code(['import numpy as np\n'])]),
                'nb/vendor.ipynb': notebook([markdown('The openai_utils and anthropic_proxy helpers are ours.\n'), code(['import openai_utils\n'])])
            };
            assert.ok(conventions.AI_FEATURE_GATE.contentExtensions.includes('.ipynb'), 'notebooks are content-scanned');
            const reader = conventions.createContentReader(fx.project);
            for (const [rel, text] of Object.entries(positives)) {
                fx.write(rel, text);
                assert.ok(conventions.groupMatches(GATE, rel, { readContent: reader }), `${rel} matches by content`);
                assert.ok(gateDelivered(await deliver(fx, gateConfig(), post(fx, 'Edit', rel, { session_id: fresh() }))), `${rel} delivers the gate`);
            }
            for (const [rel, text] of Object.entries(negatives)) {
                fx.write(rel, text);
                assert.equal(conventions.groupMatches(GATE, rel, { readContent: reader }), false, `${rel} is not an AI surface`);
                assert.equal(gateDelivered(await deliver(fx, gateConfig(), post(fx, 'Edit', rel, { session_id: fresh() }))), false, `${rel} delivers nothing`);
            }
        })
    },
    {
        // INTENT: the framework's own signals are linear — the price of the class on every Read/Edit is milliseconds, not seconds.
        // Given adversarial 64 KiB samples (long runs of spaces, quotes, escaped newlines and repeated signal prefixes)
        // When every shipped content signal is matched against each sample
        // Then each sample is decided well inside the bound
        name: 'TC-AIG-017 the shipped content signals decide an adversarial 64 KiB sample in milliseconds',
        fn: () => {
            const size = conventions.CONTENT_LIMITS.maxBytes;
            const repeat = (unit, bytes = size) => unit.repeat(Math.ceil(bytes / unit.length)).slice(0, bytes);
            const samples = [' ', '"', '\\n', '"\\n', '\n', 'import ', '\nfrom ', 'messages.create(', 'model', "from '", '@ai-sdk/', 'gemini', 'a', '\n"  ', 'import x from "'].map(unit => repeat(unit));
            const BOUND_MS = 250;
            let worst = 0;
            for (const text of samples) {
                const started = process.hrtime.bigint();
                conventions.explainGroupMatch(GATE, 'x.py', { readContent: () => text }, true);
                const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
                worst = Math.max(worst, elapsed);
                assert.ok(elapsed < BOUND_MS, `a sample of ${JSON.stringify(text.slice(0, 12))}... took ${elapsed.toFixed(1)} ms (bound ${BOUND_MS})`);
            }
            assert.ok(worst < BOUND_MS);
        }
    },
    {
        // INTENT: containment is decided by identity, not spelling — a link that leaves the project is not a way to read another file.
        // Given a reader whose path resolution maps one project path outside the root, one inside, and one to an error
        // When each path is read (and, where the host allows links, through a real directory link)
        // Then only the path that resolves inside the project yields content; an outside target or a resolution error is no content
        name: 'TC-AIG-018 the content reader never reads through a link that resolves outside the project',
        fn: () => withFixture(async fx => {
            fx.write('src/link.py', 'import anthropic\n');
            fx.write('src/real.py', 'import anthropic\n');
            fx.write('src/boom.py', 'import anthropic\n');
            const outsideFile = path.join(fx.root, 'elsewhere.py');
            fs.writeFileSync(outsideFile, 'import anthropic\n');
            const resolved = [];
            const realpath = target => {
                resolved.push(target);
                if (target.endsWith('link.py')) return outsideFile; // spelled inside, resolves outside
                if (target.endsWith('boom.py')) throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
                return fs.realpathSync(target);
            };
            const read = conventions.createContentReader(fx.project, { realpath });
            assert.equal(read('src/link.py'), null, 'a path that resolves outside the project is not read');
            assert.equal(read('src/boom.py'), null, 'a resolution error is no content, never an exception');
            assert.equal(read('src/real.py'), 'import anthropic\n', 'a path that resolves inside is read');
            assert.equal(read('src/link.py'), null, 'the refusal is memoized like a read');
            assert.equal(resolved.filter(target => target.endsWith('link.py')).length, 1, 'one resolution per path per reader');
            // Real directory links, where the host allows them (Windows uses a junction, which needs no privilege)
            const outsideDir = path.join(fx.root, 'outside-dir');
            fs.mkdirSync(outsideDir, { recursive: true });
            fs.writeFileSync(path.join(outsideDir, 'secret.py'), 'import anthropic\n');
            let linked = true;
            try {
                fs.symlinkSync(outsideDir, fx.abs('lnk'), process.platform === 'win32' ? 'junction' : 'dir');
                fs.symlinkSync(fx.abs('src'), fx.abs('alias'), process.platform === 'win32' ? 'junction' : 'dir');
            } catch {
                linked = false; // no link privilege on this host: the seam above proves the rule
            }
            if (linked) {
                const real = conventions.createContentReader(fx.project);
                assert.equal(real('lnk/secret.py'), null, 'a link out of the project is not followed');
                assert.equal(real('alias/real.py'), 'import anthropic\n', 'a link that stays inside the project is read');
                assert.equal(gateDelivered(await deliver(fx, gateConfig(), post(fx, 'Edit', 'lnk/secret.py', { session_id: fresh() }))), false, 'the hook does not deliver for content behind an outside link');
            }
        })
    },
    {
        // INTENT: a hook that matches user-authored patterns against file content must not be able to block the tool loop indefinitely
        // whatever the pattern does, so the host is told to stop it after a bounded time.
        // Given the framework repo's Claude Code settings
        // When the PostToolUse registration of the per-file convention hook is read
        // Then it carries a positive integer timeout (seconds) below the runner's own 15-second budget
        name: 'TC-AIG-019 (framework repo) the per-file convention hook is registered with a bounded timeout',
        fn: () => {
            if (!isFrameworkRepo(REPO_ROOT)) return;
            const settings = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'settings.json'), 'utf8'));
            const registrations = (settings.hooks.PostToolUse || []).flatMap(group => group.hooks).filter(h => String(h.command).includes('file-convention-inject.cjs'));
            assert.equal(registrations.length, 1, 'tripwire: the guard is active here and the hook is registered once on PostToolUse');
            const { timeout } = registrations[0];
            assert.ok(Number.isInteger(timeout) && timeout >= 1 && timeout < 15, `timeout ${timeout} must be an integer of seconds in [1, 15)`);
        }
    },
    {
        // INTENT: a config-supplied content regex can never stall the hook or a scan — the lint is only a pre-filter, so the guarantee is a
        // hard time budget: matching runs under a vm timeout and a timeout is "no match".
        // Given a 16 KiB file built to hang the matcher and, one per run, shapes the lint accepts (nested bounded counts, alternation
        // under a bounded count, overlapping runs split by an optional atom) plus a 29-element optional chain the lint rejects
        // When each pattern is matched from config against that file (child process, killed if it outruns the budget)
        // Then nothing throws or matches, each accepted shape ends on the vm timeout, the chain never reaches the matcher, and the total wall time is bounded
        name: 'TC-AIG-020 hostile config regexes the lint accepts end on the time budget: no throw, no match, bounded wall time',
        fn: () => withFixture(fx => {
            const SHAPES = ['(a|a){1,50}b', '(a{1,50}){1,50}b', '(?:a{1,100}){1,100}b', '(?:[a-z]{1,50}){1,50}!', 'a*b*a*c', '[a-z]+x?[a-z]+!', '\\w+\\.?\\w+!'];
            const CHAIN = `${'a?'.repeat(29)}${'a'.repeat(29)}`;
            const run = runGuardScenario(fx, { scenario: 'shapes', shapes: [...SHAPES, CHAIN] });
            assert.equal(run.killed, false, `a shape outran the time guard: ${JSON.stringify(run.rows.map(r => [r.shape.slice(0, 20), Math.round(r.ms)]))}`);
            assert.equal(run.status, 0, run.stderr);
            assert.equal(run.rows.length, SHAPES.length + 1);
            let total = 0;
            for (const row of run.rows) {
                total += row.ms;
                assert.equal(row.threw, null, `${row.shape.slice(0, 30)} must not throw`);
                assert.equal(row.member, false, `${row.shape.slice(0, 30)} must not match the hostile file`);
                assert.deepEqual(row.signals, []);
                assert.ok(row.ms < 800, `${row.shape.slice(0, 30)} took ${Math.round(row.ms)} ms (bound 800)`);
            }
            for (const row of run.rows.slice(0, SHAPES.length)) {
                assert.equal(row.lint, null, `${row.shape}: the pre-filter accepts it, so only the time budget can bound it`);
                assert.equal(row.stats.vmRuns, 1, `${row.shape}: ran under the vm guard`);
                assert.equal(row.stats.timeouts, 1, `${row.shape}: ended on the timeout`);
                assert.equal(row.stats.directRuns, 0, `${row.shape}: never ran directly`);
            }
            const chain = run.rows[SHAPES.length];
            assert.equal(chain.lint, 'too many optional elements', 'a loop-free optional chain cannot be interrupted, so the lint keeps it out');
            assert.equal(chain.stats.vmRuns, 0, 'and it never reaches the matcher');
            assert.ok(total < 2500, `all shapes together took ${Math.round(total)} ms (bound 2500)`);
        })
    },
    {
        // INTENT: trust is by the exact source text, never by class name — a hostile copy that only borrows the framework class's name gets the guard and the small sample.
        // Given a class named like the framework class that carries a hostile source (with and without one shipped source) and a marker source
        // When each is matched against a hostile 16 KiB file and against marker files at the sample edge
        // Then the shipped source runs directly, every other source runs under the guard, the marker past 16 KiB is not read, and a full copy of the shipped class still sees 64 KiB
        name: 'TC-AIG-021 a class named ai-feature-gate with different regexes is guarded like any config class; a byte-identical copy of the shipped ones is trusted',
        fn: () => withFixture(fx => {
            const run = runGuardScenario(fx, { scenario: 'copies' });
            assert.equal(run.killed, false, 'a hostile source in a copy named like the framework class outran the guard');
            assert.equal(run.status, 0, run.stderr);
            const by = Object.fromEntries(run.rows.map(row => [row.label, row]));
            for (const row of run.rows) assert.equal(row.threw, null, row.label);
            assert.equal(by['shipped+hostile'].stats.directRuns, 1, 'the shipped source runs directly');
            assert.equal(by['shipped+hostile'].stats.vmRuns, 1, 'the borrowed name does not exempt the other source');
            assert.equal(by['shipped+hostile'].stats.timeouts, 1);
            assert.equal(by['shipped+hostile'].member, false);
            assert.equal(by['hostile-only'].stats.vmRuns, 1);
            assert.equal(by['hostile-only'].stats.directRuns, 0);
            assert.equal(by['hostile-only'].stats.timeouts, 1);
            assert.ok(by['hostile-only'].ms < 800, `${Math.round(by['hostile-only'].ms)} ms`);
            assert.equal(by['marker-at-cap'].member, false, 'a source of a same-named copy still stops at 16 KiB');
            assert.equal(by['marker-inside'].member, true, 'and matches inside 16 KiB (through the guard)');
            assert.equal(by['marker-inside'].stats.vmRuns, 1);
            assert.equal(by['marker-inside'].stats.directRuns, 0);
            assert.equal(by['shipped-copy'].member, true, 'a copy carrying only shipped sources reads the whole 64 KiB sample');
            assert.equal(by['shipped-copy'].stats.vmRuns, 0, 'and never enters the guard');
        })
    },
    {
        // INTENT: the framework's own vetted sources keep the direct fast path — the guard is for config-supplied text only.
        // Given the shipped class, a project copy of it, and adversarial 64 KiB samples
        // When they are matched
        // Then a real SDK import still matches, no source runs under the vm guard, and each sample is decided in milliseconds
        name: 'TC-AIG-022 the shipped content signals never enter the vm guard and still match',
        fn: () => withFixture(fx => {
            const run = runGuardScenario(fx, { scenario: 'builtin' });
            assert.equal(run.killed, false);
            assert.equal(run.status, 0, run.stderr);
            const by = Object.fromEntries(run.rows.map(row => [row.label, row]));
            assert.equal(by.positive.member, true, 'an SDK import in the framework class still matches');
            assert.equal(by['project-copy'].member, true, 'and in a byte-identical project copy');
            assert.ok(run.rows.length >= 7);
            for (const row of run.rows) {
                assert.equal(row.stats.vmRuns, 0, `${row.label}: no shipped source runs under the guard`);
                assert.ok(row.stats.directRuns >= 1, `${row.label}: the shipped sources ran directly`);
                assert.equal(row.threw, null, row.label);
                assert.ok(row.ms < 250, `${row.label} took ${Math.round(row.ms)} ms`);
            }
        })
    },
    {
        // INTENT: a scan or lookup that walks many files stalls at most once per hostile source; the budget is per file.
        // Given one hostile source met on three files in one process, and a class with two hostile sources plus a harmless one
        // When each file is matched
        // Then the first file times the source out, later files skip it without running it, a reset forgets it, and one file never spends more than its budget
        name: 'TC-AIG-023 a source that timed out is skipped for the rest of the process; each file has one shared time budget',
        fn: () => withFixture(fx => {
            const sticky = runGuardScenario(fx, { scenario: 'sticky' });
            assert.equal(sticky.killed, false);
            assert.equal(sticky.status, 0, sticky.stderr);
            const [first, second, third, afterReset] = sticky.rows;
            assert.equal(first.stats.timeouts, 1, 'the first hostile file times the source out');
            assert.ok(first.ms < 800, `${Math.round(first.ms)} ms`);
            assert.equal(second.stats.vmRuns, 1, 'the second file does not run it again');
            assert.equal(second.stats.timeouts, 1);
            assert.equal(second.stats.skipped, 1);
            assert.ok(second.ms < 300, `the second file skipped fast (${Math.round(second.ms)} ms)`);
            assert.equal(third.stats.skipped, 2);
            assert.equal(third.stats.vmRuns, 1);
            assert.equal(afterReset.stats.timeouts, 1, 'resetting the guard forgets the source (a fresh process starts clean)');
            assert.equal(afterReset.stats.vmRuns, 1);
            const budget = runGuardScenario(fx, { scenario: 'budget' });
            assert.equal(budget.killed, false);
            const [file1, file2, file3] = budget.rows;
            assert.equal(file1.stats.timeouts, 1, 'file 1: the first hostile source spends the whole budget');
            assert.equal(file1.stats.skipped, 2, 'the remaining sources of that file are skipped, not run');
            assert.ok(file1.ms < 800, `${Math.round(file1.ms)} ms`);
            assert.equal(file2.stats.timeouts, 2, 'file 2: the first is skipped, the second gets the fresh budget and times out');
            assert.equal(file3.stats.timedOutSources, 2);
            assert.equal(file3.stats.vmRuns, 3, 'file 3: only the harmless source runs (two timed-out runs before it)');
            assert.ok(file3.ms < 300, `${Math.round(file3.ms)} ms`);
        })
    },
    {
        // INTENT: project-controlled location regexes stay bounded for the process, while exact shipped patterns retain the fast path.
        // Given an injected timeout executor, more distinct timed-out sources than the sticky-cache cap, and one shipped path source
        // When the same custom source is retried, the cache saturates, and the shipped source is evaluated afterwards
        // Then the custom source runs once, saturation never re-enables untrusted regexes, and the shipped source bypasses the executor
        name: 'TC-AIG-024 location regex timeouts stay sticky through cache saturation; exact shipped sources run directly',
        fn: () => {
            const timeout = () => {
                const error = new Error('synthetic timeout');
                error.code = 'ERR_SCRIPT_EXECUTION_TIMEOUT';
                throw error;
            };

            try {
                conventions.resetContentGuard();
                let attempts = 0;
                const execute = (...args) => { attempts += 1; return timeout(...args); };
                const source = '^/custom/(a+)+$';
                const first = conventions.guardedPathRegexTest(source, `/custom/${'a'.repeat(40)}!`, { remainingMs: conventions.PATH_REGEX_BUDGET_MS }, { execute });
                const second = conventions.guardedPathRegexTest(source, `/custom/${'a'.repeat(40)}!`, { remainingMs: conventions.PATH_REGEX_BUDGET_MS }, { execute });
                assert.deepEqual(first, { matched: false, incomplete: true });
                assert.deepEqual(second, { matched: false, incomplete: true });
                assert.equal(attempts, 1, 'a timed-out source is skipped on every later file in the process');

                conventions.resetContentGuard();
                attempts = 0;
                for (let i = 0; i <= conventions.MAX_TIMED_OUT_SOURCES; i++) {
                    conventions.guardedPathRegexTest(`^/custom-${i}/(a+)+$`, `/custom-${i}/${'a'.repeat(40)}!`,
                        { remainingMs: conventions.PATH_REGEX_BUDGET_MS }, { execute });
                }
                const saturated = conventions.contentGuardStats();
                assert.equal(saturated.isPathGuardSaturated, true, 'the guard saturates instead of clearing timeout protection');
                assert.equal(attempts, conventions.MAX_TIMED_OUT_SOURCES + 1, 'each source runs at most once before saturation');
                conventions.guardedPathRegexTest('^/after-saturation/(a+)+$', '/after-saturation/aaaa!',
                    { remainingMs: conventions.PATH_REGEX_BUDGET_MS }, { execute });
                assert.equal(attempts, conventions.MAX_TIMED_OUT_SOURCES + 1, 'no untrusted source runs after saturation');

                const shipped = conventions.AI_FEATURE_GATE.pathRegexes[0];
                const direct = conventions.guardedPathRegexTest(shipped, '/prompts/system.txt',
                    { remainingMs: conventions.PATH_REGEX_BUDGET_MS }, { execute: () => { throw new Error('trusted source entered VM seam'); } });
                assert.deepEqual(direct, { matched: true, incomplete: false });
                const finalStats = conventions.contentGuardStats();
                assert.equal(finalStats.pathDirectRuns, 1, 'an exact shipped source retains the direct fast path even after saturation');
                // The second phase starts from resetContentGuard(), which zeroes the counters, so only the post-saturation source is counted.
                assert.equal(finalStats.pathSkipped, 1, 'the post-saturation source was skipped');
            } finally {
                // The guard is process-global: a saturated state must never leak into the next suite of the same runner process.
                conventions.resetContentGuard();
            }
        }
    }
];

module.exports = { name: 'ai-feature-gate-inject', tests };
