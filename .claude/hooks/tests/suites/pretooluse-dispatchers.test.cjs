/**
 * PreToolUse Context Dispatchers — Phase 04 consolidation suite (TC-HOOKS-030..038)
 *
 * Verifies the consolidated inject-only dispatchers (pretooluse-ctx-*.cjs) preserve
 * observable behavior and the hard invariants of Phase 04:
 *
 *   TC-HOOKS-030  Byte-equivalent ordered concat — dispatcher concat === legacy concat,
 *                 per tool, in registration order (representative subset; the exhaustive
 *                 80-case proof lives in plans/.../reports/p04-e2e-concat.cjs).
 *   TC-HOOKS-031  Single transcript scan — dispatcher reads the transcript at most once
 *                 (builders receive preloadedLines; no per-builder re-read).
 *   TC-HOOKS-032  Gate independence — no blocking gate is folded into any dispatcher;
 *                 gates remain independent settings.json registrations.
 *   TC-HOOKS-033  Fault isolation — a throwing builder yields '' and never aborts siblings;
 *                 the dispatcher always exits 0.
 *   TC-HOOKS-034  Spawn-count reduction — exactly 9 dispatchers registered; zero legacy
 *                 inject modules remain registered in PreToolUse.
 *   TC-HOOKS-035  Block cap — every emitted dispatcher block <= 8500 chars, except the
 *                 grandfathered single-block giants (dev-rules, mindset).
 *   TC-HOOKS-036  Survivors — UPS design-system-canonical-guide reg + figma PreToolUse reg
 *                 both survive the rewire.
 *   TC-HOOKS-037  Gate deny still fires — scout-block independently denies a broad Glob
 *                 (exit 2) under the consolidated layout (no dispatcher try/catch masks it).
 *   TC-HOOKS-038  CRLF Golden-Rules regression (F4) — extractGoldenRules pulls the block
 *                 from CLAUDE.md on Windows (CRLF) where the pre-fix \n\n terminator
 *                 silently dropped it; LF/CRLF outputs are byte-identical. The tc030
 *                 oracle freezes LF, so it is structurally blind to this delta.
 */

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { runHook, getHookPath, createPreToolUseInput } = require('../lib/hook-runner.cjs');
const { assertEqual, assertTrue, assertContains, assertBlocked } = require('../lib/assertions.cjs');
const { extractGoldenRules } = require('../../lib/pretooluse-context-builders.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const HOOKS = path.join(REPO, '.claude', 'hooks');
const SETTINGS = path.join(REPO, '.claude', 'settings.json');
const ENV = { ...process.env, CLAUDE_PROJECT_DIR: REPO };

// ── Frozen legacy goldens — TC-HOOKS-030 differential oracle source ───────────
// The 16 consolidated legacy inject modules (+ design-system-canonical-guide,
// kept-as-file) were captured byte-for-byte by p04-capture-goldens.cjs. After the
// lead physically deletes the 16 modules, spawning them yields '' and the legacy
// side of the oracle would silently collapse. Sourcing the legacy side from the
// frozen fixture makes the byte-equivalence assertion PERMANENT — independent of
// the modules' on-disk existence. Keyed: golden[moduleName][payloadLabel].stdout
// holds the legacy RAW stdout (we .trim() it to match the harness block contract).
const GOLDENS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'pretooluse-legacy-goldens.json'), 'utf-8'));

// Survivor hooks: present in LEGACY_TABLE AND NEW_TABLE, NOT among the 16 deleted
// modules, so NOT captured in the golden. They are spawned live on BOTH sides
// (their existence is permanent), so the oracle stays valid.
const SURVIVOR_HOOKS = new Set(['ba-refinement-context']);

// Reverse map of the golden capture's representative file paths → pathKind label.
// MUST stay byte-identical to PATHS in p04-capture-goldens.cjs — the tc030 payload
// file paths below reuse these exact values, so the lookup is exact (no guessing).
const GOLDEN_PATHS = {
    cs: 'src/Services/Orders/Commands/CreateOrder.cs',
    csIntegTest: 'src/Services/Orders/IntegrationTests/CreateOrderTests.cs',
    ts: 'src/apps/web/src/app/order/order.component.ts',
    html: 'src/apps/web/src/app/order/order.component.html',
    scss: 'src/apps/web/src/app/order/order.component.scss',
    dsScss: 'docs/project-reference/design-system/tokens.scss',
    specMd: 'docs/specs/orders/order-management.md',
    knowledgeMd: 'docs/knowledge/research/market-trends.md',
    pbiMd: 'team-artifacts/pbis/260613-ba-pbi-orders.md',
    designSpecMd: 'team-artifacts/design-specs/260613-ux-designspec-orders.md',
    ideaMd: 'team-artifacts/ideas/260613-po-idea-orders.md',
    generic: 'README.md',
    e2eSpec: 'src/apps/web/e2e/order.spec.ts'
};
const PATH_TO_KIND = Object.fromEntries(Object.entries(GOLDEN_PATHS).map(([k, v]) => [v, k]));

// Resolve the golden payloadLabel for a payload, mirroring p04-capture-goldens.cjs
// label construction. Returns null only for tools/inputs the capture never keyed
// (which would force a FAIL-LOUD if a non-survivor table entry needed it).
function goldenLabelFor(payload) {
    const tool = payload.tool_name;
    const input = payload.tool_input || {};
    if (['Edit', 'Write', 'MultiEdit', 'Read'].includes(tool)) {
        const file = input.file_path || input.edits?.[0]?.file_path || '';
        const kind = PATH_TO_KIND[file];
        return kind ? `${tool}:${kind}` : null;
    }
    if (tool === 'Skill') return `Skill:${input.skill}`;
    if (tool === 'Agent') return `Agent:${input.subagent_type}`;
    if (tool === 'Grep') return 'Grep';
    if (tool === 'Glob') return 'Glob';
    if (tool === 'Bash') {
        const cmd = input.command || '';
        if (/\bpython3\b/.test(cmd)) return 'Bash:python3';
        if (/\bpython\b/.test(cmd)) return 'Bash:python';
        return 'Bash:nonpython';
    }
    if (tool === 'TaskCreate') return 'TaskCreate';
    if (tool === 'TaskUpdate') return `TaskUpdate:${input.status}`;
    return null;
}

const DISPATCHERS = [
    'pretooluse-ctx-graph',
    'pretooluse-ctx-crr',
    'pretooluse-ctx-dev',
    'pretooluse-ctx-mindset',
    'pretooluse-ctx-readbash',
    'pretooluse-ctx-edit',
    'pretooluse-ctx-edit-tail',
    'pretooluse-ctx-edit-spec',
    'pretooluse-ctx-canon'
];

const LEGACY_INJECT = [
    'graph-context-injector', 'code-review-rules-injector', 'dev-rules-injector',
    'mindset-injector', 'mindset-compact-injector', 'knowledge-context',
    'design-system-context', 'code-patterns-injector', 'backend-context',
    'frontend-context', 'scss-styling-context', 'lessons-injector',
    'role-context-injector', 'spec-context', 'artifact-path-resolver', 'python-call-guide'
];

const E = (...t) => new Set(t);

// Legacy inject-only regs (ascending reg index). Gates / figma excluded.
const LEGACY_TABLE = [
    { reg: 1, matcher: E('Bash'), hook: 'python-call-guide' },
    { reg: 7, matcher: E('Skill', 'Agent'), hook: 'graph-context-injector' },
    { reg: 8, matcher: E('Skill', 'Agent', 'Edit', 'Write', 'MultiEdit', 'TaskCreate', 'TaskUpdate'), hook: 'code-review-rules-injector' },
    { reg: 8, matcher: E('Skill', 'Agent', 'Edit', 'Write', 'MultiEdit', 'TaskCreate', 'TaskUpdate'), hook: 'dev-rules-injector' },
    { reg: 8, matcher: E('Skill', 'Agent', 'Edit', 'Write', 'MultiEdit', 'TaskCreate', 'TaskUpdate'), hook: 'mindset-injector' },
    { reg: 9, matcher: E('Read', 'Grep', 'Glob', 'Bash'), hook: 'mindset-compact-injector' },
    { reg: 10, matcher: E('Edit', 'Write', 'MultiEdit'), hook: 'knowledge-context' },
    { reg: 10, matcher: E('Edit', 'Write', 'MultiEdit'), hook: 'design-system-context' },
    { reg: 10, matcher: E('Edit', 'Write', 'MultiEdit'), hook: 'design-system-canonical-guide' },
    { reg: 10, matcher: E('Edit', 'Write', 'MultiEdit'), hook: 'code-patterns-injector' },
    { reg: 10, matcher: E('Edit', 'Write', 'MultiEdit'), hook: 'backend-context' },
    { reg: 10, matcher: E('Edit', 'Write', 'MultiEdit'), hook: 'frontend-context' },
    { reg: 10, matcher: E('Edit', 'Write', 'MultiEdit'), hook: 'scss-styling-context' },
    { reg: 10, matcher: E('Edit', 'Write', 'MultiEdit'), hook: 'lessons-injector' },
    { reg: 11, matcher: E('Write'), hook: 'role-context-injector' },
    { reg: 12, matcher: E('Write', 'Edit', 'MultiEdit'), hook: 'ba-refinement-context' },
    { reg: 13, matcher: E('Write', 'Edit', 'MultiEdit'), hook: 'spec-context' },
    { reg: 16, matcher: E('Read', 'Skill'), hook: 'design-system-canonical-guide' },
    { reg: 17, matcher: E('Write'), hook: 'artifact-path-resolver' }
];

const NEW_TABLE = [
    { reg: 7, matcher: E('Skill', 'Agent'), hook: 'pretooluse-ctx-graph' },
    { reg: 8, matcher: E('Skill', 'Agent', 'Edit', 'Write', 'MultiEdit', 'TaskCreate', 'TaskUpdate'), hook: 'pretooluse-ctx-crr' },
    { reg: 8, matcher: E('Skill', 'Agent', 'Edit', 'Write', 'MultiEdit', 'TaskCreate', 'TaskUpdate'), hook: 'pretooluse-ctx-dev' },
    { reg: 8, matcher: E('Skill', 'Agent', 'Edit', 'Write', 'MultiEdit', 'TaskCreate', 'TaskUpdate'), hook: 'pretooluse-ctx-mindset' },
    { reg: 9, matcher: E('Read', 'Grep', 'Glob', 'Bash'), hook: 'pretooluse-ctx-readbash' },
    { reg: 10, matcher: E('Edit', 'Write', 'MultiEdit'), hook: 'pretooluse-ctx-edit' },
    { reg: 11, matcher: E('Edit', 'Write', 'MultiEdit'), hook: 'pretooluse-ctx-edit-tail' },
    { reg: 12, matcher: E('Write', 'Edit', 'MultiEdit'), hook: 'ba-refinement-context' },
    { reg: 13, matcher: E('Write', 'Edit', 'MultiEdit'), hook: 'pretooluse-ctx-edit-spec' },
    { reg: 16, matcher: E('Read', 'Skill'), hook: 'pretooluse-ctx-canon' }
];

function spawnHook(stem, payload) {
    const res = spawnSync('node', [path.join(HOOKS, `${stem}.cjs`)], {
        input: JSON.stringify(payload), env: ENV, encoding: 'utf-8', timeout: 30000
    });
    return { stdout: (res.stdout || '').trim(), code: res.status == null ? -1 : res.status };
}

// Order a table's entries for a payload's tool: filter by matcher, then sort by
// registration index, ties broken by table position. This is the canonical
// concat order both the legacy modules and the new dispatchers must honor.
function orderedEntriesFor(table, payload) {
    const tool = payload.tool_name;
    return table
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => e.matcher.has(tool))
        .sort((a, b) => (a.e.reg - b.e.reg) || (a.i - b.i))
        .map(({ e }) => e);
}

// NEW side: spawn the real dispatchers (the live code under test).
function concatFor(table, payload) {
    const ordered = orderedEntriesFor(table, payload);
    const blocks = [];
    for (const entry of ordered) {
        const b = spawnHook(entry.hook, payload).stdout;
        if (b !== '') blocks.push(b);
    }
    return blocks.join('\n');
}

// LEGACY side (permanent oracle): order LEGACY_TABLE exactly as concatFor would,
// then source each block from the frozen golden (16 deleted modules + canonical
// guide) or spawn live for survivor hooks (ba-refinement-context). Trim each block
// to mirror the harness's one-block-per-hook trimming, skip '', join with '\n'.
// FAIL LOUD if a non-survivor table entry requires a (module,label) the golden
// fixture does not cover — silently skipping would gut the differential oracle.
function expectedLegacyFromGolden(table, payload, caseLabel) {
    const ordered = orderedEntriesFor(table, payload);
    const label = goldenLabelFor(payload);
    const blocks = [];
    for (const entry of ordered) {
        if (SURVIVOR_HOOKS.has(entry.hook)) {
            // Survivor: spawn live (it survives module deletion → permanently valid).
            const b = spawnHook(entry.hook, payload).stdout; // already trimmed
            if (b !== '') blocks.push(b);
            continue;
        }
        const moduleGoldens = GOLDENS[entry.hook];
        if (!moduleGoldens) {
            throw new Error(`[TC-HOOKS-030] golden fixture has NO entry for module '${entry.hook}' (case '${caseLabel}') — oracle integrity broken`);
        }
        if (label == null) {
            throw new Error(`[TC-HOOKS-030] cannot derive a golden payloadLabel for case '${caseLabel}' (tool ${payload.tool_name}) required by module '${entry.hook}' — oracle integrity broken`);
        }
        const g = moduleGoldens[label];
        if (g === undefined) {
            // Capture only persisted NON-EMPTY cases. An absent label means the
            // legacy module emitted '' for this payload → contributes nothing.
            // This is the documented capture contract, NOT a missing-coverage gap.
            continue;
        }
        const trimmed = (g.stdout || '').trim();
        if (trimmed !== '') blocks.push(trimmed);
    }
    return blocks.join('\n');
}

// Mask the git-state-dependent graph-blast-radius lines. The frozen golden froze
// these counts/file-lists at capture time; the live dispatcher recomputes them
// against the CURRENT working tree, so they legitimately differ run-to-run. We
// normalize ONLY the proven-volatile values (counts + file slices) symmetrically
// on both sides — every stable structural line (the `[code-graph] Blast Radius
// Analysis (auto-injected for ...)` header, the `Risk:`/`Changed:`/`Impacted:`
// scaffolding, the trailing `Use: python ...` guidance) and EVERY non-graph block
// still asserts byte-for-byte. This is a normalization, not an assertion weakening:
// the volatile slice is unobservable behavior, the structure is the contract.
function normGraph(s) {
    return s
        // `Risk: HIGH | Changed: 770 files, 808 nodes | Impacted: 131 nodes in 85 files`
        .replace(/^Risk: .*$/m, 'Risk: <norm>')
        // `Changed files: a, b, c (+760 more)`
        .replace(/^Changed files: .*$/m, 'Changed files: <norm>')
        // `Impacted files: a, b (+77 more)` (proven slice-order volatile originally)
        .replace(/^Impacted files: .*$/m, 'Impacted files: <norm>')
        // `Changed production functions: f1, f2 (+5 more)` (optional, git-dependent)
        .replace(/^Changed production functions: .*$/m, 'Changed production functions: <norm>');
}

function loadSettings() { return JSON.parse(fs.readFileSync(SETTINGS, 'utf-8')); }
function preToolUseCommands(s) {
    return s.hooks.PreToolUse.flatMap(e => (e.hooks || []).map(h => h.command || ''));
}

// ── TC-HOOKS-030 — byte-equivalent ordered concat (representative subset) ──────
// File paths reuse p04-capture-goldens.cjs PATHS values verbatim so the golden
// payloadLabel lookup is exact. (Write:ba-pbi uses the pbiMd path so role/
// artifact ordering is exercised; the explicit interleave assertion below covers
// the ba-refinement stories path which the golden does not key.)
const tc030SourcePayloads = [
    { tool: 'Skill', input: { skill: 'code-review' }, label: 'Skill:code-review' },
    { tool: 'Skill', input: { skill: 'cook' }, label: 'Skill:cook' },
    { tool: 'Agent', input: { subagent_type: 'general-purpose' }, label: 'Agent:general-purpose' },
    { tool: 'Edit', input: { file_path: 'src/Services/Orders/Commands/CreateOrder.cs' }, label: 'Edit:cs' },
    { tool: 'Write', input: { file_path: 'src/apps/web/src/app/order/order.component.ts' }, label: 'Write:ts' },
    { tool: 'Write', input: { file_path: 'docs/specs/orders/order-management.md' }, label: 'Write:spec' },
    { tool: 'Write', input: { file_path: 'team-artifacts/pbis/260613-ba-pbi-orders.md' }, label: 'Write:ba-pbi (interleave)' },
    { tool: 'Read', input: { file_path: 'src/apps/web/src/app/order/order.component.scss' }, label: 'Read:scss' },
    { tool: 'Bash', input: { command: 'python script.py' }, label: 'Bash:python' },
    { tool: 'Grep', input: { pattern: 'foo' }, label: 'Grep' }
];
const tc030 = tc030SourcePayloads.map(c => ({
    name: `[TC-HOOKS-030] dispatcher concat === frozen legacy golden — ${c.label}`,
    fn: () => {
        const payload = { tool_name: c.tool, tool_input: c.input, transcript_path: '' };
        // LEGACY side now sourced from the frozen golden (+ live survivors), so the
        // byte-equivalence assertion is permanent — it no longer depends on the 16
        // legacy modules existing on disk. NEW side still spawns the real dispatchers.
        let expected = expectedLegacyFromGolden(LEGACY_TABLE, payload, c.label);
        let neu = concatFor(NEW_TABLE, payload);
        if (expected !== neu) { expected = normGraph(expected); neu = normGraph(neu); } // graph-volatile mask
        assertEqual(neu, expected, `concat mismatch for ${c.label} (dispatcher vs frozen golden)`);
    }
}));

// Coverage integrity guard — proves the golden fixture is complete enough to
// drive the oracle WITHOUT spawning any (deletable) legacy module. Every
// non-survivor hook the LEGACY_TABLE references MUST have a top-level golden
// module key; a derivable golden label must exist for every tc030 payload that
// reaches a non-survivor entry. Absence of a per-payload label within a present
// module key is legal (capture persisted non-empty only). This is the FAIL-LOUD
// the migration requires: a structurally missing module = broken oracle.
tc030.push({
    name: '[TC-HOOKS-030] golden fixture covers every non-survivor LEGACY_TABLE module',
    fn: () => {
        const nonSurvivors = [...new Set(LEGACY_TABLE.map(e => e.hook))].filter(h => !SURVIVOR_HOOKS.has(h));
        for (const hook of nonSurvivors) {
            assertTrue(
                Object.prototype.hasOwnProperty.call(GOLDENS, hook),
                `golden fixture MUST contain module key '${hook}' (LEGACY_TABLE references it) — oracle would silently skip it otherwise`
            );
        }
        // Every tc030 payload must yield a derivable golden label (so a present
        // module is never silently skipped for want of a label mapping).
        for (const c of tc030SourcePayloads) {
            const payload = { tool_name: c.tool, tool_input: c.input, transcript_path: '' };
            // Only payloads whose ordered LEGACY entries include a non-survivor
            // golden-backed module need a label.
            const needsLabel = orderedEntriesFor(LEGACY_TABLE, payload).some(e => !SURVIVOR_HOOKS.has(e.hook));
            if (needsLabel) {
                assertTrue(goldenLabelFor(payload) != null, `tc030 case '${c.label}' must map to a golden payloadLabel`);
            }
        }
    }
});

// Explicit ba-refinement interleave assertion.
tc030.push({
    name: '[TC-HOOKS-030] ba-refinement interleaves between role and artifact (Write to BA path)',
    fn: () => {
        const payload = { tool_name: 'Write', tool_input: { file_path: 'team-artifacts/pbis/stories/260613-story.md' }, transcript_path: '' };
        const neu = concatFor(NEW_TABLE, payload);
        assertContains(neu, 'BA Team Refinement Context', 'BA block must appear in concat for BA-path Write');
    }
});

// ── TC-HOOKS-031 — single transcript scan ─────────────────────────────────────
const tc031 = [{
    name: '[TC-HOOKS-031] dispatch runtime loads transcript once and threads preloadedLines',
    fn: () => {
        const src = fs.readFileSync(path.join(HOOKS, 'lib', 'pretooluse-dispatch.cjs'), 'utf-8');
        const calls = (src.match(/loadTranscriptLines\(/g) || []).length;
        assertEqual(calls, 1, 'runtime must call loadTranscriptLines exactly once');
        assertContains(src, 'preloadedLines', 'must thread preloadedLines into builders');
        assertContains(src, 'safeBlock(fn, payload, preloadedLines)', 'builders receive the shared preloaded lines');
    }
}];

// ── TC-HOOKS-032 — gate independence (no gate folded into a dispatcher) ────────
const GATE_STEMS = [
    'windows-command-detector', 'git-commit-block', 'doc-sync-gate', 'scout-block',
    'privacy-block', 'path-boundary-block', 'edit-enforcement', 'skill-enforcement',
    'agent-files-skill-gate', 'workflow-task-guard'
];
// Strip line + block comments so prose mentions of gates (e.g. relocation-safety
// notes) don't trip the require/spawn check. We only care about EXECUTABLE refs.
function stripComments(src) {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments
        .split('\n')
        .map(l => l.replace(/\/\/.*$/, '')) // line comments
        .join('\n');
}
const tc032 = [{
    name: '[TC-HOOKS-032] no blocking gate is require()d or spawned inside any dispatcher',
    fn: () => {
        for (const d of DISPATCHERS) {
            const code = stripComments(fs.readFileSync(path.join(HOOKS, `${d}.cjs`), 'utf-8'));
            for (const gate of GATE_STEMS) {
                assertTrue(!code.includes(gate), `${d} executable code must not reference gate ${gate}`);
            }
        }
    }
}, {
    name: '[TC-HOOKS-032] gates remain independent PreToolUse registrations',
    fn: () => {
        const cmds = preToolUseCommands(loadSettings());
        for (const gate of GATE_STEMS) {
            assertTrue(cmds.some(c => c.includes(`/${gate}.cjs`)), `gate ${gate} must stay registered`);
        }
    }
}];

// ── TC-HOOKS-033 — fault isolation (throwing builder doesn't abort siblings) ───
const tc033 = [{
    name: '[TC-HOOKS-033] throwing builder yields empty block, siblings still emit, exit 0',
    fn: () => {
        const { safeBlock } = require(path.join(HOOKS, 'lib', 'pretooluse-dispatch.cjs'));
        const thrower = () => { throw new Error('boom'); };
        const good = () => 'OK-BLOCK';
        assertEqual(safeBlock(thrower, {}, null), '', 'thrower must yield empty');
        assertEqual(safeBlock(good, {}, null), 'OK-BLOCK', 'good builder still returns block');
        // End-to-end: a real dispatcher always exits 0 even on odd input.
        const r = spawnHook('pretooluse-ctx-edit', { tool_name: 'Edit', tool_input: null, transcript_path: '' });
        assertEqual(r.code, 0, 'dispatcher must exit 0 even with null tool_input');
    }
}];

// ── TC-HOOKS-034 — spawn-count reduction ──────────────────────────────────────
const tc034 = [{
    name: '[TC-HOOKS-034] exactly 9 consolidated dispatchers are registered',
    fn: () => {
        const cmds = preToolUseCommands(loadSettings());
        const registered = DISPATCHERS.filter(d => cmds.some(c => c.includes(`/${d}.cjs`)));
        assertEqual(registered.length, 9, `expected 9 dispatchers, got ${registered.length}: ${registered.join(',')}`);
    }
}, {
    name: '[TC-HOOKS-034] zero legacy inject modules remain registered in PreToolUse',
    fn: () => {
        const cmds = preToolUseCommands(loadSettings());
        const remaining = LEGACY_INJECT.filter(m => cmds.some(c => c.includes(`/${m}.cjs`)));
        assertEqual(remaining.length, 0, `legacy inject modules still registered: ${remaining.join(',')}`);
    }
}];

// ── TC-HOOKS-035 — emitted block cap (<=8500 except grandfathered) ────────────
const GRANDFATHERED = new Set(['pretooluse-ctx-dev', 'pretooluse-ctx-mindset']);
const tc035 = [{
    name: '[TC-HOOKS-035] every emitted dispatcher block <= 8500 chars (except grandfathered dev/mindset)',
    fn: () => {
        // Worst-case payloads per dispatcher (dedup off via transcript_path:'').
        const worst = {
            'pretooluse-ctx-graph': { tool_name: 'Agent', tool_input: { subagent_type: 'general-purpose' }, transcript_path: '' },
            'pretooluse-ctx-crr': { tool_name: 'Skill', tool_input: { skill: 'code-review' }, transcript_path: '' },
            'pretooluse-ctx-dev': { tool_name: 'Skill', tool_input: { skill: 'cook' }, transcript_path: '' },
            'pretooluse-ctx-mindset': { tool_name: 'Skill', tool_input: { skill: 'code-review' }, transcript_path: '' },
            'pretooluse-ctx-readbash': { tool_name: 'Bash', tool_input: { command: 'python x.py' }, transcript_path: '' },
            'pretooluse-ctx-edit': { tool_name: 'Edit', tool_input: { file_path: 'src/apps/web/src/app/order/order.component.scss' }, transcript_path: '' },
            'pretooluse-ctx-edit-tail': { tool_name: 'Write', tool_input: { file_path: 'src/apps/web/src/app/order/order.component.scss' }, transcript_path: '' },
            'pretooluse-ctx-edit-spec': { tool_name: 'Write', tool_input: { file_path: 'docs/specs/orders/order-management.md' }, transcript_path: '' },
            'pretooluse-ctx-canon': { tool_name: 'Skill', tool_input: { skill: 'design' }, transcript_path: '' }
        };
        for (const d of DISPATCHERS) {
            const out = spawnHook(d, worst[d]).stdout;
            if (GRANDFATHERED.has(d)) {
                assertTrue(out.length > 0, `${d} grandfathered block should emit`);
            } else {
                assertTrue(out.length <= 8500, `${d} emitted ${out.length} chars (> 8500 cap)`);
            }
        }
    }
}];

// ── TC-HOOKS-036 — UPS canonical + figma survive ──────────────────────────────
const tc036 = [{
    name: '[TC-HOOKS-036] UserPromptSubmit design-system-canonical-guide registration survives',
    fn: () => {
        const s = loadSettings();
        const ups = (s.hooks.UserPromptSubmit || []).flatMap(e => (e.hooks || []).map(h => h.command || ''));
        assertTrue(ups.some(c => c.includes('design-system-canonical-guide.cjs')), 'UPS canonical reg must survive');
    }
}, {
    name: '[TC-HOOKS-036] figma-context-extractor PreToolUse registration survives',
    fn: () => {
        const cmds = preToolUseCommands(loadSettings());
        assertTrue(cmds.some(c => c.includes('figma-context-extractor.cjs')), 'figma PreToolUse reg must survive');
    }
}, {
    name: '[TC-HOOKS-036] design-system-canonical-guide.cjs file still exists (kept for UPS)',
    fn: () => {
        assertTrue(fs.existsSync(path.join(HOOKS, 'design-system-canonical-guide.cjs')), 'canonical guide file must be kept');
    }
}];

// ── TC-HOOKS-037 — gate deny still fires under consolidated layout ─────────────
const tc037 = [{
    name: '[TC-HOOKS-037] scout-block independently denies a broad Glob (exit 2), unmasked',
    fn: async () => {
        const input = createPreToolUseInput('Glob', { pattern: '**/*.ts' });
        const result = await runHook(getHookPath('scout-block.cjs'), input, { cwd: REPO });
        assertBlocked(result.code, 'scout-block must still deny broad glob');
    }
}, {
    name: '[TC-HOOKS-037] dispatcher on the same tool stays non-blocking (exit 0)',
    fn: () => {
        const r = spawnHook('pretooluse-ctx-readbash', { tool_name: 'Glob', tool_input: { pattern: '**/*.ts' }, transcript_path: '' });
        assertEqual(r.code, 0, 'inject dispatcher must never block');
    }
}];

// ── TC-HOOKS-038 — CRLF Golden-Rules regression (F4) ──────────────────────────
// Guards the buildMindset CRLF silent-drop fix: extractGoldenRules must pull the
// Golden Rules block out of CLAUDE.md regardless of line ending. The byte-equivalence
// oracle (tc030) freezes *LF* legacy output, so it is structurally blind to the
// Windows path (core.autocrlf=true) this fix targets. Without this test a revert of
// the \r?\n\r?\n terminator back toward \n\n stays green on LF and silently re-drops
// Golden Rules on Windows — the exact original bug.
const GR_BODY_LINES = ['1. First rule', '2. Second rule', '3. Third rule'];
const mkClaudeMd = (eol) => [
    '# Project',
    '',
    '**Golden Rules (memorize these):**',
    '',
    ...GR_BODY_LINES,
    '',
    'Next section unrelated to rules.',
    ''
].join(eol);

const tc038 = [{
    name: '[TC-HOOKS-038] extractGoldenRules pulls the block from CRLF content (Windows regression guard)',
    fn: () => {
        const out = extractGoldenRules(mkClaudeMd('\r\n'));
        assertTrue(out !== null, 'CRLF Golden Rules block must extract (null under the pre-fix \\n\\n terminator)');
        for (const line of GR_BODY_LINES) assertContains(out, line, 'every rule line must survive CRLF extraction');
        assertTrue(!out.includes('\r'), 'extracted block must normalize to LF (no stray \\r passthrough)');
    }
}, {
    name: '[TC-HOOKS-038] extractGoldenRules is line-ending-agnostic (CRLF output === LF output)',
    fn: () => {
        assertEqual(extractGoldenRules(mkClaudeMd('\r\n')), extractGoldenRules(mkClaudeMd('\n')),
            'CRLF and LF inputs must yield byte-identical extracted blocks');
    }
}, {
    name: '[TC-HOOKS-038] regression sentinel — the pre-fix bare-\\n\\n regex matches LF but FAILS on CRLF',
    fn: () => {
        // The exact pre-fix pattern (LF-only terminator). Documents WHAT this guards:
        // it matched on LF (why every prior test stayed green) yet never on CRLF.
        const PRE_FIX = /\*\*Golden Rules[^*]*\*\*:?\s*\n([\s\S]*?)\n\n/;
        assertTrue(PRE_FIX.test(mkClaudeMd('\n')), 'sentinel premise: pre-fix regex DID match LF (why the bug stayed hidden)');
        assertTrue(!PRE_FIX.test(mkClaudeMd('\r\n')), 'sentinel: pre-fix regex must FAIL on CRLF — reverting to it re-introduces the bug');
        assertTrue(extractGoldenRules(mkClaudeMd('\r\n')) !== null, 'fixed extractor must succeed exactly where the pre-fix regex fails');
    }
}, {
    name: '[TC-HOOKS-038] extractGoldenRules returns null when no Golden Rules block exists',
    fn: () => {
        assertEqual(extractGoldenRules('# Project\r\n\r\nNo rules here, just prose.\r\n'), null,
            'absent Golden Rules block must yield null, not a partial match');
    }
}];

module.exports = {
    name: 'PreToolUse Context Dispatchers (Phase 04)',
    tests: [...tc030, ...tc031, ...tc032, ...tc033, ...tc034, ...tc035, ...tc036, ...tc037, ...tc038]
};
