'use strict';

/**
 * ai-gate-zero-cost — the AI-engineering gate costs NOTHING when a task has no AI-feature implementation, no AI
 * technique to audit and no plan to implement an AI feature; it pays progressively when there is one.
 *
 * Business intent (user requirement): "ensure it does not cause running waste — only when the changes or target have an
 * AI-feature implementation, an AI technique to audit, or a plan to implement an AI feature. Do not waste tokens."
 * Six invariants, each with its own failing evidence:
 *   1. No skill or agent other than the AI reviewer pair carries the AI protocols (a marker or guide line makes a hook
 *      DELIVER the full body on every load of that carrier, AI task or not).
 *   2. Every other carrier keeps ONE conditional pointer: short, naming exactly one protocol file that exists.
 *   3. The convention-class digest is empty for a non-AI file, and for an AI file compact with the protocol as its only read.
 *   4. The prompt route is silent on non-AI and framework-meta prompts, short on genuine ones, once per window.
 *   5. The change-set scan is the cheap oracle: an empty list for a non-AI change set, a hit for an AI one, and vendor
 *      mentions in prose or comments are not signals.
 *   6. Every protocol path a digest, route, pointer or static block tells the reader to open exists.
 * Plus the static context (template and generated root file) keeps its AI block short.
 * Repository-content checks (invariants 1, 2, 6 over this repo's skills, agents and root file) run only in the framework
 * repo; the scanners themselves are proven on fixtures everywhere, so a broken rule cannot pass by doing nothing.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HOOKS_DIR = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(HOOKS_DIR, '..', '..');
const conventions = require(path.join(HOOKS_DIR, 'lib', 'file-conventions.cjs'));
const route = require(path.join(HOOKS_DIR, 'ai-feature-route.cjs'));
const scanner = require(path.resolve(HOOKS_DIR, '..', 'scripts', 'ai-signal-scan.cjs'));
const { childEnv } = require('../lib/hook-runner.cjs');
const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');

const GATE = conventions.AI_FEATURE_GATE;
const PROTOCOL_DIR = '.claude/skills/shared/protocols';
const GATE_FILE = `${PROTOCOL_DIR}/ai-engineering-gate.md`;
const FRAMING_FILE = `${PROTOCOL_DIR}/ai-feature-framing-gate.md`;
const OWNER_SKILL = 'ai-engineering-review';
const OWNER_AGENT = 'ai-engineering-reviewer';
const TAGS = ['ai-feature-framing-gate', 'ai-engineering-gate', 'ai-review-checklist'];
const POINTER_MAX_CHARS = 400;
const DIGEST_MAX_CHARS = 1400;
const DIRECTIVE_MAX_CHARS = 700;
const MINUTE = 60 * 1000;
const T0 = 1800000000000;
const PROTOCOL_PATH = /\.claude\/skills\/shared\/protocols\/[\w.-]+\.md/g;

// ── fixtures ────────────────────────────────────────────────────────────────

async function withFixture(fn) {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'aiz-test-')));
    const fx = {
        root,
        abs: rel => path.join(root, ...rel.split('/')),
        write(rel, content = '') {
            const file = fx.abs(rel);
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, content);
            return file;
        },
        /** Clean-machine env (Portable Test Contract): no inherited CK_* switch, home and temp inside the fixture. */
        env(extra = {}) {
            const overrides = { HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root, CLAUDE_HOOK_DEBUG: undefined, CLAUDE_PROJECT_DIR: root };
            for (const key of Object.keys(process.env)) {
                if (/^CK_/i.test(key)) overrides[key] = undefined;
            }
            return childEnv({ ...overrides, ...extra });
        }
    };
    try {
        return await fn(fx);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

const classOnly = () => ({ conventionInjection: { enabled: true }, contextGroups: [GATE] });

/** The digest an edit of `rel` would deliver, from the framework class alone. */
function digestFor(fx, rel, content) {
    fx.write(rel, content);
    return conventions.lookup(classOnly(), fx.abs(rel), { projectDir: fx.root }).text;
}

/** The docs a digest tells the reader to read: the `MUST read first:` list and every `- read:` line. */
function readDocsOf(digest) {
    const docs = new Set();
    for (const match of digest.matchAll(/^- read: (.+)$/gm)) docs.add(match[1].trim());
    const first = /MUST read first: ([^\n]+)/.exec(digest);
    if (first) first[1].split(', ').forEach(doc => docs.add(doc.trim()));
    return [...docs];
}

// Files a real project holds that have NOTHING to do with AI. Each carries a token the old signal list treated as AI.
const NEGATIVE_CORPUS = {
    'web/src/App.tsx': `import React, { useState } from 'react';\nexport const App = () => { const [messages, setMessages] = useState([]); return <ul>{messages.map(m => <li key={m}>{m}</li>)}</ul>; };\n`,
    'server/app.js': `const express = require('express');\nconst app = express();\napp.post('/tool_calls', (req, res) => res.json({ tool_use: false }));\nconst system_prompt = 'C:> ';\n`,
    'shop/agents/models.py': `from django.db import models\nclass Agent(models.Model):\n    name = models.CharField(max_length=80)\n`,
    'shop/search/indexes.py': `from haystack import indexes\nfrom instructor.models import Course\n`,
    'api/src/main/java/App.java': `import org.springframework.web.bind.annotation.RestController;\n@RestController class AgentController { }\n`,
    'src/cms.ts': `export function generateContent(page: Page) { return render(page); }\nconst cms = { generateContent: (p) => p };\ncms.generateContent(home);\n`,
    'src/notes.ts': `// we migrated off OpenAI last year and evaluated Anthropic, pinecone and qdrant\nconst footer = 'Powered by Anthropic';\nconst db = 'pinecone';\n`,
    'src/models.ts': `const table = ['gpt-4', 'claude-3-opus', 'gemini-1.5'];\nconst o1 = 1;\nconst chat = '/chat';\nconst ai = true;\n`,
    'src/transcript-parser.ts': `for (const block of entry.message.content) { if (block.type === 'tool_use') uses.push(block.name); }\n`,
    'src/transcript.test.ts': `test('counts tool_use blocks', () => expect(parse({ type: 'tool_use' })).toBe(1));\n`,
    'lib/car.rb': `Car.create(model: 'Corolla', make: 'Toyota')\nVehicle.new(model_name: 'Model 3')\n`,
    'lib/settings.py': `MODEL = "resnet-50"\nSYSTEM = "linux"\n`,
    'src/data.ts': `import { messages } from './i18n';\nexport const t = messages.create;\n`,
    'src/vendors.py': `# import openai\n"""\nsee https://example.com/openai for the vendor list\n"""\nOPENAI_LABEL = "openai"\n`
};
// One signal each, in code a project really writes. Each must be found without any other signal in the file.
const POSITIVE_CORPUS = {
    'a.py': `import anthropic\n`,
    'b.py': `from langchain_core.prompts import ChatPromptTemplate\n`,
    'c.ts': `import { openai } from '@ai-sdk/openai';\n`,
    'd.js': `const OpenAI = require('openai');\n`,
    'e.go': `import (\n  "github.com/sashabaranov/go-openai"\n)\n`,
    'f.cs': `using Azure.AI.OpenAI;\n`,
    'g.java': `import dev.langchain4j.model.chat.ChatLanguageModel;\n`,
    'h.ts': `const r = await fetch('https://api.openai.com/v1/responses');\n`,
    'i.py': `r = client.chat.completions.create(model=name, messages=history)\n`,
    'j.py': `r = client.messages.create(model=name, max_tokens=64, messages=history)\n`,
    'k.ts': `const r = await ai.models.generateContent({ model: name, contents });\n`,
    'l.rb': `chat = Client.new(model: 'claude-sonnet-4-5')\n`,
    'm.py': `from pinecone import Pinecone\n`,
    'n.ts': `import { QdrantClient } from '@qdrant/js-client-rest';\n`,
    'o.py': `server = FastMCP("tools")\n`,
    'p.ts': `const server = new McpServer({ name: 'tools', version: '1' });\n`
};
const contentMatches = (rel, text) => conventions.explainGroupMatch(GATE, rel, { readContent: () => text }, false).member;

// ── carrier scan (invariants 1, 2, 6): a function, so a fixture can prove it detects what it must ─────────

function listCarriers(root) {
    const carriers = [];
    const skillsDir = path.join(root, '.claude', 'skills');
    if (fs.existsSync(skillsDir)) {
        for (const name of fs.readdirSync(skillsDir)) {
            const file = path.join(skillsDir, name, 'SKILL.md');
            if (fs.existsSync(file)) carriers.push({ kind: 'skill', name, file });
        }
    }
    const agentsDir = path.join(root, '.claude', 'agents');
    if (fs.existsSync(agentsDir)) {
        for (const entry of fs.readdirSync(agentsDir)) {
            if (entry.endsWith('.md')) carriers.push({ kind: 'agent', name: entry.slice(0, -3), file: path.join(agentsDir, entry) });
        }
    }
    return carriers.filter(carrier => !(carrier.kind === 'skill' && carrier.name === OWNER_SKILL) && !(carrier.kind === 'agent' && carrier.name === OWNER_AGENT));
}

// No skill may hold a guide line for an AI protocol: a guide line is a pointer the protocol hook expands once per
// session when the skill loads, so every skill and agent bar the reviewer pair stays a non-carrier and holds a
// conditional pointer line instead. The plan and integration-test review modes reach the floor through that same
// conditional pointer line in `plan/references/mode-review.md` and `integration-test/references/mode-review.md`, never a
// guide line; TC-PMM-008 and TC-ITM-008 pin that placement. The map stays so a future owner decision can allow one line.
const GUIDE_LINE_ALLOWED = Object.freeze({});
const guideLineAllowed = (carrier, tag) => carrier.kind === 'skill' && (GUIDE_LINE_ALLOWED[carrier.name] || []).includes(tag);

/** Invariant 1: a SYNC marker or a guide line for one of the AI protocols in a carrier that is not the reviewer pair (bar the allowed guide lines). */
function tagViolations(root) {
    const found = [];
    for (const carrier of listCarriers(root)) {
        const text = fs.readFileSync(carrier.file, 'utf8');
        for (const tag of TAGS) {
            if (text.includes(`SYNC:${tag}`)) found.push(`${carrier.kind} ${carrier.name}: SYNC:${tag}`);
            if (new RegExp(`^\\s*[-*]\\s+\`${tag}\`\\s+[—-]`, 'm').test(text) && !guideLineAllowed(carrier, tag)) found.push(`${carrier.kind} ${carrier.name}: guide line for ${tag}`);
        }
    }
    return found;
}

/** Invariant 2 and 6: every conditional pointer line is short, names at most one protocol file, and that file exists. */
function pointerViolations(root) {
    const found = [];
    for (const carrier of listCarriers(root)) {
        for (const line of fs.readFileSync(carrier.file, 'utf8').split(/\r?\n/)) {
            if (!line.includes('AI surface?')) continue;
            const where = `${carrier.kind} ${carrier.name}`;
            if (line.length > POINTER_MAX_CHARS) found.push(`${where}: pointer is ${line.length} chars (limit ${POINTER_MAX_CHARS})`);
            const paths = [...new Set(line.match(PROTOCOL_PATH) || [])];
            if (paths.length > 1) found.push(`${where}: names ${paths.length} protocol files`);
            if (paths.length === 0 && !line.includes(OWNER_SKILL) && !line.includes(OWNER_AGENT)) found.push(`${where}: names neither a protocol file nor the reviewer`);
            for (const p of paths) if (!fs.existsSync(path.join(root, ...p.split('/')))) found.push(`${where}: ${p} does not exist`);
        }
    }
    return found;
}

// ── tests ───────────────────────────────────────────────────────────────────

const tests = [
    {
        // INVARIANT 1 — the scanner itself: it must flag every spelling of a carrier, and only outside the reviewer pair.
        // Given fixture skills and agents with and without an AI protocol marker or guide line
        // When the carrier scan runs
        // Then carriers outside the reviewer pair are flagged and the pair passes
        name: 'TC-AIZ-001 the carrier scan flags a SYNC marker, a reminder or a guide line for an AI protocol in any skill or agent except the reviewer pair',
        fn: () => withFixture(fx => {
            fx.write('.claude/skills/plan/SKILL.md', '# plan\n');
            fx.write('.claude/agents/planner.md', '# planner\n');
            fx.write(`.claude/skills/${OWNER_SKILL}/SKILL.md`, `<!-- SYNC:ai-engineering-gate -->\nbody\n<!-- /SYNC:ai-engineering-gate -->\n- \`ai-review-checklist\` — guide\n`);
            fx.write(`.claude/agents/${OWNER_AGENT}.md`, '<!-- SYNC:ai-feature-framing-gate -->\nbody\n');
            assert.deepEqual(tagViolations(fx.root), [], 'clean carriers, and the reviewer pair may carry the tags');
            fx.write('.claude/skills/plan/SKILL.md', '<!-- SYNC:ai-feature-framing-gate -->\nbody\n');
            assert.deepEqual(tagViolations(fx.root), ['skill plan: SYNC:ai-feature-framing-gate'], 'a body marker');
            fx.write('.claude/skills/plan/SKILL.md', '<!-- SYNC:ai-engineering-gate:reminder -->\nx\n');
            assert.deepEqual(tagViolations(fx.root), ['skill plan: SYNC:ai-engineering-gate'], 'a reminder variant');
            fx.write('.claude/skills/plan/SKILL.md', '- `ai-review-checklist` — Executable review protocol\n');
            assert.deepEqual(tagViolations(fx.root), ['skill plan: guide line for ai-review-checklist'], 'a guide line');
            fx.write('.claude/skills/plan/SKILL.md', '# plan\n');
            fx.write('.claude/agents/planner.md', '  * `ai-engineering-gate` - Thirty-eight clauses\n');
            assert.deepEqual(tagViolations(fx.root), ['agent planner: guide line for ai-engineering-gate'], 'an agent guide line');
            // No skill is an allowed guide carrier: the floor's guide line, another tag and a body are all flagged.
            fx.write('.claude/agents/planner.md', '# planner\n');
            fx.write('.claude/skills/integration-test/SKILL.md', '- `ai-engineering-gate` — reviewing tests of an AI feature → .claude/skills/shared/protocols/ai-engineering-gate.md\n');
            assert.deepEqual(tagViolations(fx.root), ['skill integration-test: guide line for ai-engineering-gate'], 'the integration-test skill carries no floor guide line: its review mode keeps it in a reference');
            fx.write('.claude/skills/integration-test/SKILL.md', '- `ai-review-checklist` — Executable review protocol\n');
            assert.deepEqual(tagViolations(fx.root), ['skill integration-test: guide line for ai-review-checklist'], 'another tag is not allowed there');
            fx.write('.claude/skills/integration-test/SKILL.md', '<!-- SYNC:ai-engineering-gate -->\nbody\n');
            assert.deepEqual(tagViolations(fx.root), ['skill integration-test: SYNC:ai-engineering-gate'], 'a body is not a guide line');
            fx.write('.claude/skills/integration-test/SKILL.md', '# integration-test\n');
            fx.write('.claude/skills/plan/SKILL.md', '- `ai-engineering-gate` — floor\n');
            assert.deepEqual(tagViolations(fx.root), ['skill plan: guide line for ai-engineering-gate'], 'the plan skill carries no floor guide line: its review mode keeps it in a reference');
            fx.write('.claude/skills/plan/SKILL.md', '# plan\n');
            fx.write('.claude/skills/fix/SKILL.md', '- `ai-engineering-gate` — floor\n');
            assert.deepEqual(tagViolations(fx.root), ['skill fix: guide line for ai-engineering-gate'], 'the allowance is per skill, not global');
        })
    },
    {
        // INVARIANT 1 — the repository: the reviewer pair carries the protocols; no other skill holds a guide
        // line for them (GUIDE_LINE_ALLOWED is empty).
        // Given this repository's skills and agents
        // When the carrier scan runs
        // Then no other carrier exists
        name: 'TC-AIZ-002 (framework repo) no skill or agent other than the AI reviewer pair carries an AI protocol marker or guide line',
        fn: () => {
            if (!isFrameworkRepo(REPO_ROOT)) return;
            const carriers = listCarriers(REPO_ROOT);
            assert.ok(carriers.length > 20, `tripwire: the scan sees the framework's skills and agents (${carriers.length})`);
            assert.deepEqual(tagViolations(REPO_ROOT), [], 'a carrier makes the protocol hook deliver the full body on every load of that skill or agent');
            assert.ok(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'skills', OWNER_SKILL, 'SKILL.md'), 'utf8').length > 0);
        }
    },
    {
        // INVARIANT 2 — the scanner itself.
        // Given fixture pointers that are long, name two files, name a missing file, or name no route
        // When the pointer scan runs
        // Then each defect is flagged
        name: 'TC-AIZ-003 the pointer scan flags a long pointer, two protocol files, a missing file, and a pointer that names no route',
        fn: () => withFixture(fx => {
            fx.write(GATE_FILE, 'gate\n');
            fx.write(FRAMING_FILE, 'framing\n');
            const pointer = (extra = '') => `**AI surface?** Only if the change creates or changes a model call (see \`node .claude/scripts/ai-signal-scan.cjs\`): read \`${GATE_FILE}\` and apply it; otherwise skip this line.${extra}\n`;
            fx.write('.claude/skills/fix/SKILL.md', pointer());
            assert.deepEqual(pointerViolations(fx.root), [], 'a well-formed pointer passes');
            fx.write('.claude/skills/fix/SKILL.md', pointer(' '.repeat(POINTER_MAX_CHARS)));
            assert.equal(pointerViolations(fx.root).length, 1, 'over the limit');
            fx.write('.claude/skills/fix/SKILL.md', pointer(` Also \`${FRAMING_FILE}\`.`));
            assert.ok(pointerViolations(fx.root).some(v => v.includes('names 2 protocol files')), 'two files');
            fx.write('.claude/skills/fix/SKILL.md', pointer().replace(GATE_FILE, `${PROTOCOL_DIR}/ai-missing.md`));
            assert.ok(pointerViolations(fx.root).some(v => v.includes('does not exist')), 'dangling path');
            fx.write('.claude/skills/fix/SKILL.md', '**AI surface?** Only if there is one; otherwise skip.\n');
            assert.ok(pointerViolations(fx.root).some(v => v.includes('names neither')), 'no route at all');
            fx.write('.claude/skills/fix/SKILL.md', `| AI surface? | Only if the scan lists one: run \`${OWNER_SKILL}\`. |\n`);
            assert.deepEqual(pointerViolations(fx.root), [], 'a routing row that names the reviewer is a valid pointer');
            fx.write('.claude/skills/fix/SKILL.md', pointer());
            fx.write(`.claude/skills/${OWNER_SKILL}/SKILL.md`, `AI surface? ${'x'.repeat(900)} ${GATE_FILE} ${FRAMING_FILE}\n`);
            assert.deepEqual(pointerViolations(fx.root), [], 'the reviewer pair is exempt from the pointer shape');
        })
    },
    {
        // INVARIANT 2 — the repository.
        // Given this repository's conditional AI pointers
        // When the pointer scan runs
        // Then each is at most 400 characters and names exactly one existing protocol file
        name: 'TC-AIZ-004 (framework repo) every conditional AI pointer in a skill or agent is at most 400 chars and names exactly one existing protocol file',
        fn: () => {
            if (!isFrameworkRepo(REPO_ROOT)) return;
            assert.deepEqual(pointerViolations(REPO_ROOT), []);
            const total = listCarriers(REPO_ROOT).filter(carrier => fs.readFileSync(carrier.file, 'utf8').includes('AI surface?')).length;
            assert.ok(total >= 5, `tripwire: the pointer scan finds the shipped pointers (${total})`);
        }
    },
    {
        // INVARIANT 3 — the convention class: zero on non-AI files, small and single-doc on AI files.
        // Given a corpus of non-AI files and an AI file
        // When the class digest is built for each
        // Then the non-AI digest is empty and the AI digest is compact with the protocol as its only read doc
        name: 'TC-AIZ-005 the class digest is empty for every non-AI file and, for an AI file, compact with the protocol as its ONLY read doc',
        fn: () => withFixture(fx => {
            for (const [rel, content] of Object.entries(NEGATIVE_CORPUS)) {
                assert.equal(digestFor(fx, rel, content), '', `${rel}: a non-AI file costs zero characters`);
            }
            const digest = digestFor(fx, 'src/service.py', 'import anthropic\nclient = anthropic.Anthropic()\n');
            assert.ok(digest.length > 0, 'an SDK import is an AI surface');
            assert.ok(digest.length <= DIGEST_MAX_CHARS, `the AI digest is ${digest.length} chars (limit ${DIGEST_MAX_CHARS})`);
            assert.deepEqual(readDocsOf(digest), [GATE_FILE], 'the protocol file is the only read doc');
            assert.ok(!/ai-engineering-(?:review-checklist|knowledge|calibration)/.test(digest), 'a deep doc is never named as a read');
            assert.ok(digest.includes('Deep dives on demand, by section, never whole'), 'the deep-dive rule is stated');
            // The class definition itself: one read doc, at most three short rules, evidence = protocol + checklist
            assert.deepEqual([...GATE.referenceDocs], [GATE_FILE]);
            assert.ok(GATE.rules.length <= 3, `at most three rules (${GATE.rules.length})`);
            for (const rule of GATE.rules) assert.ok(rule.length <= 200, `a rule stays short (${rule.length}): ${rule}`);
            // The rules are also rendered into the root instruction file of every session: keep their sum small
            assert.ok(GATE.rules.join('').length <= 300, `the rules weigh ${GATE.rules.join('').length} chars (budget 300)`);
            assert.deepEqual([...GATE.evidenceDocs].sort(), [GATE_FILE, '.claude/docs/ai-engineering-review-checklist.md'].sort());
        })
    },
    {
        // INVARIANT 3 — content precision, both directions: the corpora are the R8 audit made permanent.
        // Given negative and positive content corpora and ambiguous tokens
        // When content signals are matched
        // Then no negative matches and every single-signal positive does
        name: 'TC-AIZ-006 content signals: no negative-corpus file is an AI surface, and every single-signal positive is found',
        fn: () => {
            for (const [rel, text] of Object.entries(NEGATIVE_CORPUS)) {
                assert.equal(contentMatches(rel, text), false, `${rel} must not be matched by content: ${JSON.stringify(conventions.explainGroupMatch(GATE, rel, { readContent: () => text }, true).contentSignals)}`);
            }
            for (const [rel, text] of Object.entries(POSITIVE_CORPUS)) {
                assert.equal(contentMatches(rel, text), true, `${rel} (${text.trim().slice(0, 50)}) must be matched by content`);
            }
            // Ambiguous wire tokens and bare vendor or model names are not signals on their own
            for (const token of ['tool_use', 'tool_calls', 'system_prompt', 'OpenAI', 'Anthropic', 'pinecone', 'qdrant', 'gpt-4', 'claude-sonnet-4-5', '@modelcontextprotocol']) {
                assert.equal(contentMatches('x.ts', `const v = "${token}";\n// ${token}\n`), false, `a bare ${token} is not an AI surface`);
            }
            // Path names shared with non-AI code do not match by folder name alone
            for (const rel of ['shop/agents/models.py', 'src/agents/AgentList.tsx', 'lib/retrieval/search.ts', 'ml/evals/run.py']) {
                assert.equal(conventions.explainGroupMatch(GATE, rel, { readContent: () => 'x = 1\n' }, true).member, false, `${rel} is not an AI surface by path`);
            }
        }
    },
    {
        // INVARIANT 4 — the route: silent where it must be, short where it speaks, once per window.
        // Given non-AI, framework-meta (verbatim requirement) and genuine AI-feature prompts
        // When the route runs
        // Then it is silent on the first two, short on the third, and silent on a second match until a compaction
        name: 'TC-AIZ-007 the route is silent on non-AI and framework-meta prompts (verbatim), short on genuine AI-feature prompts, and silent on the second matching prompt',
        fn: async () => withFixture(async fx => {
            const NEGATIVE_PROMPTS = [
                // Verbatim: the requirement this suite exists for
                'ensure it do not cause running waste, only when changes or target have ai feature implementation, ai technique need to audit or plan to implement ai feature. do not waste token',
                // Framework-meta: the goal of building this very gate (review skills, sub-agents, hooks), naming AI techniques in passing
                'research AI engineering best practices and bad practices for LLM apps, RAG, agents and tool use, then update the review skills, sub-agents, hooks and static context so plan review and code review of any AI feature is driven by an expert protocol',
                'add an AI-engineering review skill and sub-agent, wire it into the review workflows and hooks, and keep the framework portable',
                'make the AI gate cost nothing in sessions that never touch an AI feature: fewer tokens in the hooks and the skills',
                // Non-AI work and bare questions
                'refactor the settings loader', 'fix the failing checkout test', 'what is RAG?', 'explain how embeddings work', 'commit this'
            ];
            for (const prompt of NEGATIVE_PROMPTS) {
                assert.equal(route.evaluate({ hook_event_name: 'UserPromptSubmit', session_id: 's', prompt }, { env: {}, rawSettings: {} }), '', `silent: ${prompt.slice(0, 70)}`);
            }
            const store = fx.abs('store');
            const run = async (prompt, session, now) => route.run({ hook_event_name: 'UserPromptSubmit', session_id: session, prompt }, {
                env: {}, rawSettings: {}, storeRoot: store, now, write: (text, done) => done(true)
            });
            for (const prompt of NEGATIVE_PROMPTS) assert.equal(await run(prompt, 'neg', T0), '', `run() is silent: ${prompt.slice(0, 50)}`);
            assert.equal(fs.existsSync(store), false, 'silent prompts leave no state behind');
            const GENUINE = ['add a RAG pipeline with embeddings to the search service', 'review this OpenAI tool-calling agent for prompt injection'];
            for (const prompt of GENUINE) {
                const out = await run(prompt, `genuine-${prompt.length}`, T0);
                assert.ok(out.includes(route.MARKER_START), `speaks: ${prompt}`);
                assert.ok(out.length <= DIRECTIVE_MAX_CHARS, `directive is ${out.length} chars (limit ${DIRECTIVE_MAX_CHARS})`);
                assert.ok(out.includes(GATE_FILE) && !/ai-engineering-(?:review-checklist|knowledge)/.test(out), 'one read pointer, no deep doc');
            }
            // Dedup: the second matching prompt of the same session is silent; a compaction re-arms it
            assert.ok((await run(GENUINE[0], 'dedup', T0)).length > 0);
            assert.equal(await run(GENUINE[1], 'dedup', T0 + MINUTE), '', 'second matching prompt in the window is silent');
            require(path.join(HOOKS_DIR, 'lib', 'convention-ledger.cjs')).recordSessionCompaction(store, 'dedup', T0 + 2 * MINUTE);
            assert.ok((await run(GENUINE[1], 'dedup', T0 + 3 * MINUTE)).length > 0, 're-armed after a compaction');
        })
    },
    {
        // INVARIANT 5 — the scan is the cheap oracle.
        // Given a non-AI change set, vendor mentions in prose and comments, and an AI file
        // When the scan runs in process and as a CLI
        // Then the clean set is empty with status clean, the AI set lists the file with status surface, and the exit code is 0
        name: 'TC-AIZ-008 the scan answers a non-AI change set with an empty list (exit 0), an AI one with a hit, and ignores vendor mentions in prose and comments',
        fn: () => withFixture(fx => {
            const scan = (files, extra = {}) => scanner.scan({ projectDir: fx.root, files, config: {}, ...extra });
            for (const [rel, content] of Object.entries(NEGATIVE_CORPUS)) fx.write(rel, content);
            const clean = scan(Object.keys(NEGATIVE_CORPUS));
            assert.equal(clean.inScope, false, JSON.stringify(clean.aiSurface));
            assert.deepEqual(clean.aiSurface, [], 'an empty list is a clean answer');
            assert.equal(clean.status, 'clean', 'a completed scan that found nothing is the ONLY status a caller may treat as "skip"');
            // An empty list from an incomplete scan is not a clean answer: a git error proves nothing
            assert.equal(scan(Object.keys(NEGATIVE_CORPUS), { errors: ['git diff failed: fatal'] }).status, 'unknown', 'an error is unknown, never clean');
            fx.write('docs/vendors.md', "import anthropic\nOpenAI, pinecone and api.openai.com are vendors.\n");
            fx.write('README.md', "from openai import OpenAI\n");
            fx.write('docs/how-to.py', 'import anthropic\n');
            fx.write('src/comment-only.py', '# import anthropic  (we no longer use it)\n');
            assert.deepEqual(scan(['docs/vendors.md', 'README.md', 'docs/how-to.py', 'src/comment-only.py']).aiSurface, [], 'prose, docs and comments are not AI surfaces');
            fx.write('src/chat.py', 'import anthropic\n');
            const hit = scan([...Object.keys(NEGATIVE_CORPUS), 'src/chat.py']);
            assert.equal(hit.inScope, true);
            assert.equal(hit.status, 'surface');
            assert.deepEqual(hit.aiSurface.map(entry => entry.file), ['src/chat.py']);
            // At the process boundary: exit 0 and one plain line for a clean change set, a listed file for an AI one
            const runCli = files => spawnSync(process.execPath, [path.resolve(HOOKS_DIR, '..', 'scripts', 'ai-signal-scan.cjs'), '--files', ...files], {
                cwd: fx.root, encoding: 'utf8', windowsHide: true, env: fx.env()
            });
            const none = runCli(['src/cms.ts', 'src/notes.ts']);
            assert.equal(none.status, 0, none.stderr);
            assert.match(none.stdout, /^No AI-feature surface detected in 2 file\(s\)/);
            assert.equal(none.stdout.trim().split('\n').length, 1, 'a clean answer is one line');
            const some = runCli(['src/chat.py']);
            assert.equal(some.status, 0, some.stderr);
            assert.match(some.stdout, /src\/chat\.py/);
            const asJson = JSON.parse(runCli(['src/cms.ts', '--json']).stdout);
            assert.equal(asJson.status, 'clean', 'the JSON carries the status callers act on');
        })
    },
    {
        // INVARIANT 6 — no dangling read pointer in the code that emits them.
        // Given every protocol path the digest and the route emit
        // When they are checked against the shipped protocol directory
        // Then each exists
        name: 'TC-AIZ-009 every protocol path the digest and the route point at exists under the shipped protocol directory',
        fn: () => {
            const emitted = new Set([
                ...GATE.referenceDocs, ...GATE.evidenceDocs.filter(doc => doc.startsWith(PROTOCOL_DIR)),
                route.GATE_FILE, route.FRAMING_FILE,
                ...(route.buildDirective({ signals: ['RAG'], intent: route.INTENTS.PLAN }).match(PROTOCOL_PATH) || []),
                ...(route.buildDirective({ signals: ['RAG'], intent: route.INTENTS.BUILD }).match(PROTOCOL_PATH) || [])
            ]);
            assert.ok(emitted.size >= 2, 'both protocol files are referenced');
            for (const rel of emitted) assert.ok(fs.existsSync(path.join(REPO_ROOT, ...rel.split('/'))), `dangling read pointer: ${rel}`);
            assert.equal(route.GATE_FILE, GATE_FILE);
            assert.equal(route.FRAMING_FILE, FRAMING_FILE);
        }
    },
    {
        // INVARIANT 6 — no static copy: the gate reaches the assistant by the path-scoped class, the prompt router and
        // the trigger-gated protocol, so neither the template every project starts from nor this repo's generated
        // root file carries an AI-engineering block.
        // Given the root-file template and this repository's root file
        // When they are scanned for the gate block
        // Then neither carries it, and the delivering carriers exist
        name: 'TC-AIZ-010 no root file or template carries a static AI-engineering block; the class, the route and the protocol deliver it',
        fn: () => {
            const template = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'skills', 'ai-context-refresh', 'references', 'claude-md-template.md'), 'utf8');
            assert.equal(/## AI-Engineering Gate/.test(template), false, 'the template carries no AI-Engineering Gate section');
            assert.equal(template.includes('AI-ENGINEERING-GATE'), false, 'the template carries no gate block');
            const { AI_FEATURE_GATE } = require('../../lib/file-conventions.cjs');
            assert.equal(AI_FEATURE_GATE.name, 'ai-feature-gate', 'the path-scoped class exists');
            assert.ok(fs.existsSync(path.join(REPO_ROOT, ...GATE_FILE.split('/'))), 'the floor protocol file exists');
            assert.ok(fs.existsSync(path.join(REPO_ROOT, ...FRAMING_FILE.split('/'))), 'the planning protocol file exists');
            if (!isFrameworkRepo(REPO_ROOT)) return;
            const root = fs.readFileSync(path.join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
            assert.equal(root.includes('[AI-ENGINEERING-GATE]'), false, 'the root file carries no gate block (run ai-context-refresh --mode update --strip-legacy-universal)');
        }
    }
];

module.exports = { name: 'ai-gate-zero-cost', tests };
