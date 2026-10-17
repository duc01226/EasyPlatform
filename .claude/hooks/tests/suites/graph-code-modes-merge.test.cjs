/**
 * Graph-Code Modes Merge Test Suite
 *
 * The `graph-code` skill owns six code-graph roles as modes: `--mode=build` (build, update or sync the
 * graph), `--mode=query` (relationship queries), `--mode=trace` (system-flow traces),
 * `--mode=blast-radius` (impact of the current changes) and `--mode=connect-api` (frontend-to-backend
 * API edges) and `--mode=export` (JSON snapshots or single-file Mermaid diagrams). Each mode body lives
 * in `graph-code/references/mode-<x>.md`; `graph-code/SKILL.md` detects
 * the mode first and carries a BLOCKING "read the mode file in full FIRST" line per mode. The six modes
 * have no skill folder of their own. The python CLI and the graph hooks are not skills and stay as they
 * are.
 *
 * Coverage:
 *   TC-GCM-001 — mode detection sits at the top of SKILL.md; each of the six modes has its BLOCKING read
 *                line and an existing reference; each mode works directly without a workflow.
 *   TC-GCM-002 — SKILL.md carries no mode body; every mode body lives in its reference file.
 *   TC-GCM-003 — build mode keeps the tooling-install Step 0 (mode check first, stop on failure), the three
 *                scopes with the auto-detect default, the sync-then-update chain and the no-op checkout rule.
 *   TC-GCM-004 — query mode keeps the intent mapping, the four response statuses and the query patterns.
 *   TC-GCM-005 — trace mode keeps the three directions, the bug/failure upstream-first rule and the flags.
 *   TC-GCM-006 — blast-radius mode keeps the live CLI run, the three risk bands and the recommendations;
 *                connect-api mode keeps the five matching strategies and the optional connector config.
 *   TC-GCM-007 — the graph is optional: SKILL.md states the advisory block once, names the absent-graph
 *                message, and no mode reference turns the graph into a gate for other work.
 *   TC-GCM-008 — the six removed graph folders stay deleted, their registry/workflow entries remain
 *                absent, and the consolidated graph-code owner remains model-selectable.
 *   TC-GCM-009 — the debugger-trace protocol is carried by SKILL.md (guide + reminder), never by a reference.
 *   TC-GCM-010 — the description keeps the `[Code Intelligence]` tag, the 250-character limit and names
 *                every mode.
 *   TC-GCM-011 — the prompt-gate hook routes the graph build to `/graph-code --mode=build`.
 *   TC-GCM-012 — no live source names a removed skill (allow-list: the "former" lines of SKILL.md; the CLI
 *                verbs `graph-blast-radius` and `graph-connect-api` are not skill names).
 *   TC-GCM-013 — export retains both formats, file/output selection, required Mermaid target,
 *                graph preconditions, cross-platform execution and observable result reporting.
 *
 * Portability: every row asserts this framework repository's own skills, registry and hooks, so each is
 * skipped in any other project (framework-repo signal). Paths use node:path; nothing is OS-specific.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const { resolveAllWorkflowManifests } = require('../../../scripts/lib/workflow-manifest.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own graph-code skill, registry and hooks (framework-repo signal)';

const SKILLS = path.join(REPO_ROOT, '.claude', 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const skill = () => read(SKILLS, 'graph-code', 'SKILL.md');
const mode = name => read(SKILLS, 'graph-code', 'references', `mode-${name}.md`);

const MODES = ['build', 'query', 'trace', 'blast-radius', 'connect-api', 'export'];
// The removed skill names, assembled so this file never contains the literal tokens it guards against.
const REMOVED = MODES.map(suffix => 'graph' + '-' + suffix);

const LIVE_SOURCE_ROOTS = ['.claude', 'docs/specs', 'docs/project-reference', 'README.md'];
// Generated catalogs are rebuilt from the skill folders.
const SCAN_EXCLUDED = new Set([
    '.claude/SKILLS.yaml',
    '.claude/scripts/skills_data.yaml',
    '.claude/hooks/tests/suites/graph-code-modes-merge.test.cjs'
]);
const SCAN_EXCLUDED_DIRS = new Set(['node_modules', '.git', '.code-graph', 'tmp', 'temp', 'plans']);
const SCAN_EXTENSIONS = new Set(['.md', '.cjs', '.mjs', '.js', '.py', '.json', '.yaml', '.yml', '.toml']);

function* walk(rel) {
    const abs = path.join(REPO_ROOT, ...rel.split('/'));
    if (!fs.existsSync(abs)) return;
    const stat = fs.statSync(abs);
    if (stat.isFile()) {
        if (SCAN_EXTENSIONS.has(path.extname(abs))) yield rel;
        return;
    }
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        if (entry.isDirectory() && SCAN_EXCLUDED_DIRS.has(entry.name)) continue;
        yield* walk(`${rel}/${entry.name}`);
    }
}

const alternation = REMOVED.map(name => name.replace(/[-]/g, '\\-')).join('|');
// Exact command/skill references do not include output filenames or ordinary CLI verbs.
const SKILL_NAME_PATTERNS = [
    new RegExp(`(?<![\\w/.\\\\-])/(?:${alternation})(?![\\w/.\\\\-])`),
    new RegExp(`skills/(?:${alternation})\\b`),
    new RegExp(`\`(?:${alternation})\``),
    new RegExp(`["'](?:${alternation})["']`)
];

/** A line that names a removed skill but is an allowed mention. */
function allowedMention(rel, line) {
    if (rel === '.claude/skills/graph-code/SKILL.md' && /former/i.test(line)) return true;
    if (rel !== '.claude/scripts/code_graph/cli.py') return false;
    // These two CLI verbs predate skill consolidation and remain part of the Python interface.
    // Remove only their registration/dispatch tokens; another retired reference on the same line fails.
    let rest = line;
    for (const suffix of ['blast-radius', 'connect-api']) {
        const name = 'graph' + '-' + suffix;
        rest = rest.replace(new RegExp(`^(\\s*\\w+\\s*=\\s*sub\\.add_parser\\()(["'])${name}\\2(?=,\\s*aliases=\\[(["'])${suffix}\\3\\])`), '$1');
        rest = rest.replace(new RegExp(`^(\\s*elif args\\.command in \\()(["'])${name}\\2(?=,\\s*(["'])${suffix}\\3\\):)`), '$1');
    }
    return rest !== line && !SKILL_NAME_PATTERNS.some(pattern => pattern.test(rest));
}

const tests = [
    {
        name: 'TC-GCM-001 graph-code detects the mode first and gives each of the six modes a BLOCKING read-first line and a reference file',
        skip: SKIP,
        fn: () => {
            const text = skill();
            const routing = text.indexOf('Mode routing');
            assert.ok(routing > 0 && routing < text.indexOf('## Quick Summary'), 'mode detection sits at the top, before the Quick Summary');
            for (const name of MODES) {
                assert.match(text, new RegExp(`--mode=${name}`), `--mode=${name} is documented`);
                assert.match(text, new RegExp(`\\*\\*\\[BLOCKING\\]\\*\\* When \`--mode=${name}\`, read \`references/mode-${name}\\.md\` in full FIRST`), `mandatory read line for ${name}`);
                assert.ok(fs.existsSync(path.join(SKILLS, 'graph-code', 'references', `mode-${name}.md`)), `references/mode-${name}.md exists`);
            }
            assert.match(text, /Each of the six modes works called directly with no workflow/);
            assert.ok(!text.includes('graph' + '-export'), 'the entrypoint names the current export mode instead of a retired skill');
            // No mode and no matching intent shows the table instead of guessing
            assert.match(text, /never a guess/);
            // The Intent column holds ACTION phrases only: a prompt that merely names the graph ("show the code graph status") must not select
            // --mode=build, so the bare nouns are never a build trigger and the rule says a noun-only prompt gets the table
            const buildRow = text.split('\n').find((line) => line.startsWith('| `--mode=build'));
            assert.ok(buildRow, 'the dispatch table has a build row');
            // (the mode cell holds escaped pipes, so slice by the purpose/reference cells instead of splitting on `|`)
            const intents = buildRow.slice(buildRow.indexOf('Formerly `/graph-build`'), buildRow.indexOf('`references/mode-build.md`'));
            assert.ok(intents.length > 0 && buildRow.includes('`references/mode-build.md`'), 'the build row Intent cell was located');
            for (const action of ['"build graph"', '"sync graph"', '"update graph"', '"refresh graph after pull"']) assert.ok(intents.includes(action), `build intent keeps the action phrase ${action}`);
            for (const noun of ['"code graph"', '"knowledge graph"', '"uncommitted changes"']) assert.ok(!intents.includes(noun), `build intent must not list the bare noun ${noun}`);
            assert.match(text, /a prompt that merely names "code graph", "knowledge graph" or "uncommitted changes" carries no action and gets the table/);
        }
    },
    {
        name: 'TC-GCM-002 graph-code/SKILL.md does not carry a mode body and each body lives in its reference',
        skip: SKIP,
        fn: () => {
            const text = skill();
            const markers = {
                build: ['### Step 0 — Install the graph tooling', 'graph_ahead_skipped', '## DB Performance Indexes'],
                query: ['## Semantic Query Protocol', '## Available Query Patterns', 'status: "ambiguous"'],
                trace: ['## Edge Types Traced', '--edge-kinds KIND1,KIND2', '**Bug/failure rule:**'],
                'blast-radius': ['## Run the CLI Live', '**High risk:** >20 impacted nodes'],
                'connect-api': ['## Zero-Config Auto-Detection', '## Matching Strategies', '"graphConnectors"'],
                export: ['## Format Mode', '### `--format=json`', '### `--format=mermaid`', '## Implicit Edges in Export']
            };
            for (const [name, list] of Object.entries(markers)) {
                for (const marker of list) {
                    assert.ok(!text.includes(marker), `SKILL.md must not inline the ${name} body: ${marker}`);
                    assert.ok(mode(name).includes(marker), `mode-${name}.md holds ${marker}`);
                }
            }
        }
    },
    {
        name: 'TC-GCM-003 --mode=build keeps the install Step 0, the three scopes with the auto-detect default, the sync-then-update chain and the older-checkout no-op',
        skip: SKIP,
        fn: () => {
            const text = mode('build');
            const steps = text.slice(text.indexOf('## Steps'));
            const installAt = steps.indexOf('ensurePythonDeps');
            const firstGraphCallAt = steps.indexOf('python .claude/scripts/code_graph');
            assert.ok(installAt !== -1 && installAt < firstGraphCallAt, 'the tooling install precedes every graph CLI call');
            assert.match(steps.slice(steps.indexOf('### Step 0'), steps.indexOf('### Default')), /Non-zero exit:\*\*\s*stop\./, 'a failed install stops the build');
            assert.match(text, /code graph is off for this project \(hooks\.codeGraph\)/, 'the off message is kept');
            for (const scope of ['full', 'update', 'sync']) assert.match(text, new RegExp(`### \`--scope=${scope}\``), `--scope=${scope} branch`);
            assert.match(text, /Default \(no `--scope`\) auto-detects from `status`/);
            assert.match(text, /`sync --json` then `update --json`/);
            assert.match(text, /graph_ahead_skipped/);
            assert.match(text, /full_rebuild_fallback/);
        }
    },
    {
        name: 'TC-GCM-004 --mode=query keeps the intent mapping, the four response statuses and the query patterns',
        skip: SKIP,
        fn: () => {
            const text = mode('query');
            for (const pattern of ['callers_of', 'callees_of', 'imports_of', 'importers_of', 'children_of', 'tests_for', 'inheritors_of', 'file_summary']) {
                assert.ok(text.includes(`\`${pattern}\``), `query pattern ${pattern}`);
            }
            for (const status of ['ok', 'ambiguous', 'not_found', 'error']) assert.ok(text.includes(`status: "${status}"`), `status ${status}`);
            assert.match(text, /ask user question tool/, 'an ambiguous target is resolved with the user');
            for (const command of ['connections', 'batch-query', 'find-path', 'search']) assert.ok(text.includes(`code_graph ${command}`), `CLI ${command}`);
            assert.match(text, /Always use `--json` flag/);
        }
    },
    {
        name: 'TC-GCM-005 --mode=trace keeps the three directions, the bug/failure upstream-first rule and the CLI flags',
        skip: SKIP,
        fn: () => {
            const text = mode('trace');
            for (const direction of ['downstream', 'upstream', 'both']) assert.ok(text.includes(`\`${direction}\``), `direction ${direction}`);
            assert.match(text, /\*\*Bug\/failure rule:\*\* start with `upstream` or `both`/);
            for (const flag of ['--direction', '--depth', '--edge-kinds', '--node-mode', '--json']) assert.ok(text.includes(`\`${flag}\``), `flag ${flag}`);
            assert.match(text, /Don't trace with depth > 5/);
        }
    },
    {
        name: 'TC-GCM-006 --mode=blast-radius keeps the live run, risk bands and recommendations; --mode=connect-api keeps the matching strategies and config',
        skip: SKIP,
        fn: () => {
            const blast = mode('blast-radius');
            assert.match(blast, /python \.claude\/scripts\/code_graph blast-radius --json/);
            assert.match(blast, /\*\*Low risk:\*\* <5 impacted nodes/);
            assert.match(blast, /\*\*Medium risk:\*\* 5-20 impacted nodes/);
            assert.match(blast, /\*\*High risk:\*\* >20 impacted nodes/);
            assert.match(blast, /Flag untested changed functions/);
            assert.match(blast, /run the CLI yourself/);
            const api = mode('connect-api');
            for (const strategy of ['Exact match', 'Prefix-augmented', 'Suffix match', 'Deep strip', 'Deep strip both']) assert.ok(api.includes(strategy), `strategy ${strategy}`);
            assert.match(api, /python \.claude\/scripts\/code_graph connect-api --json/);
            assert.match(api, /"graphConnectors"/);
            assert.match(api, /Custom patterns \*\*extend\*\*/);
        }
    },
    {
        name: 'TC-GCM-007 the graph stays optional: one advisory block, a plain absent-graph message and no gate language in any mode',
        skip: SKIP,
        fn: () => {
            const text = skill();
            const advisory = 'Optional: when grep and reading files alone may not reveal a high-risk blast radius (shared contract, many callers, cross-module or cross-service flow, public API), the code graph (`.code-graph/graph.db`) can add callers, dependents and impacted tests. Treat it as a hint, NOT proof: the graph can be stale or incomplete (it lags uncommitted edits and unindexed paths) — verify anything that matters by reading the files/grep. Skip it for low-risk or local changes.';
            assert.equal(text.split(advisory).length - 1, 1, 'the advisory block appears exactly once in SKILL.md');
            assert.match(text, /Nothing in this skill is mandatory for other skills or workflows/);
            const absent = 'graph not built — run /graph-code --mode=build, or continue with grep';
            assert.ok(text.includes(absent), 'SKILL.md names the absent-graph message');
            for (const name of ['query', 'trace', 'blast-radius']) assert.ok(mode(name).includes(absent), `mode-${name}.md reports a missing graph plainly`);
            for (const name of MODES) assert.doesNotMatch(mode(name), /HARD-GATE|BLOCKED until|before concluding|MUST run at least one graph/i, `mode-${name}.md imposes no graph gate on other work`);
        }
    },
    {
        name: 'TC-GCM-008 removed graph folders and registrations stay absent while graph-code export remains model-selectable',
        skip: SKIP,
        fn: () => {
            for (const name of REMOVED) assert.ok(!fs.existsSync(path.join(SKILLS, name)), `${name} must not exist as a skill folder`);
            assert.doesNotMatch(skill(), /^disable-model-invocation: true$/m, 'graph-code remains discoverable after absorbing the export utility');
            // Intent: retirement removes every standalone skill while preserving the selectable mode owner.
            // Failure signal: restoring a retired folder/registration or hiding graph-code fails.
            const registry = read(REPO_ROOT, '.claude', 'scripts', 'skills_data.yaml');
            for (const name of REMOVED) assert.doesNotMatch(registry, new RegExp(`^  name: ${name}$`, 'm'), `registry must not list ${name}`);
            assert.match(mode('export'), /^# `\/graph-code --mode=export`/, 'graph-code owns the export contract');
            const raw = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8');
            const document = JSON.parse(raw);
            for (const name of REMOVED) assert.ok(!raw.includes(name), `workflows.json must not invoke removed ${name}`);
            const steps = new Set();
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    for (const { skill: step } of manifest.occurrences) steps.add(step);
                }
            }
            for (const name of REMOVED) assert.ok(!steps.has(name), `no resolved workflow step runs removed ${name}`);
            const profile = JSON.parse(read(REPO_ROOT, '.claude', 'config', 'skill-profiles.json'));
            assert.ok(profile.calledByOthers.skills.includes('graph-code'), 'calledByOthers lists graph-code');
            for (const name of REMOVED) assert.ok(!profile.calledByOthers.skills.includes(name), `calledByOthers must not list ${name}`);
        }
    },
    {
        name: 'TC-GCM-009 the debugger-trace protocol is a guide plus reminder in SKILL.md and is never carried by a mode reference',
        skip: SKIP,
        fn: () => {
            const text = skill();
            const guides = [...text.matchAll(/<!-- PROTOCOL-GUIDES:START -->([\s\S]*?)<!-- PROTOCOL-GUIDES:END -->/g)].map(match => match[1]).join('\n');
            assert.match(guides, /^- `end-to-start-debugger-trace` — /m, 'SKILL.md carries the guide line');
            assert.ok(text.includes('<!-- SYNC:end-to-start-debugger-trace:reminder -->'), 'SKILL.md carries the reminder');
            assert.ok(fs.existsSync(path.join(SKILLS, 'shared', 'protocols', 'end-to-start-debugger-trace.md')), 'the guide points at a published protocol file');
            for (const name of MODES) {
                assert.doesNotMatch(mode(name), /PROTOCOL-GUIDES|<!-- SYNC:/, `mode-${name}.md carries no protocol guide or SYNC fence`);
            }
        }
    },
    {
        name: 'TC-GCM-010 graph-code description keeps the [Code Intelligence] tag, the 250-character limit and names every mode',
        skip: SKIP,
        fn: () => {
            const match = /^description: '(.*)'$/m.exec(skill());
            assert.ok(match, 'single-quoted frontmatter description');
            const description = match[1];
            assert.match(description, /^\[Code Intelligence\] Use when /);
            assert.ok(description.length <= 250, `description is ${description.length} chars, over 250`);
            assert.match(description, /--mode=\{build\|query\|trace\|blast-radius\|connect-api\|export\}/);
            for (const keyword of [/build/i, /callers/i, /trac/i, /blast radius/i, /API/, /export/i, /JSON/, /Mermaid/]) assert.match(description, keyword, `description routes ${keyword}`);
        }
    },
    {
        name: 'TC-GCM-011 the prompt-gate hook routes the graph build to /graph-code --mode=build',
        skip: SKIP,
        fn: () => {
            const hook = read(REPO_ROOT, '.claude', 'hooks', 'init-prompt-gate.cjs');
            assert.match(hook, /\/\\\/graph-code\/i/, 'the allow-list admits the graph-code slash command');
            assert.ok(hook.includes('`/graph-code --mode=build` installs the rest'), 'the no-toolchain note names the build mode');
            for (const name of REMOVED) assert.ok(!hook.includes(name), `the hook must not mention ${name}`);
        }
    },
    {
        name: 'TC-GCM-012 no live source names a removed graph skill (former mappings and preserved CLI verbs are allowed)',
        skip: SKIP,
        fn: () => {
            // Intent: stale active command, path and utility-list references cannot silently restore retirement.
            // Deliberate negative controls model a stale caller added by a later edit.
            for (const name of REMOVED) {
                for (const line of [`/${name}`, `/${name} --json`, `skills/${name}/SKILL.md`, `\`${name}\``, `'${name}'`, `"${name}"`]) {
                    assert.ok(SKILL_NAME_PATTERNS.some(pattern => pattern.test(line)), `retirement scanner must detect ${line}`);
                    assert.equal(allowedMention('.claude/docs/skills/README.md', line), false, 'active references have no historical exemption');
                    assert.equal(allowedMention('.claude/scripts/code_graph/cli.py', line), false, 'Python sources retain retired skill detection');
                }
            }
            const retiredExport = REMOVED[MODES.indexOf('export')];
            for (const line of [`\`.code-graph/${retiredExport}.json\``, `default=".code-graph/${retiredExport}.json"`, `"/${retiredExport}.json"`]) {
                assert.ok(!SKILL_NAME_PATTERNS.some(pattern => pattern.test(line)), 'an output artifact filename is not a retired command');
            }
            for (const suffix of ['blast-radius', 'connect-api']) {
                const name = 'graph' + '-' + suffix;
                for (const line of [`    cmd = sub.add_parser("${name}", aliases=["${suffix}"], help="CLI verb")`, `    elif args.command in ("${name}", "${suffix}"):`]) {
                    assert.ok(SKILL_NAME_PATTERNS.some(pattern => pattern.test(line)), 'the quoted CLI token exercises the exception');
                    assert.equal(allowedMention('.claude/scripts/code_graph/cli.py', line), true, 'the documented parser/dispatcher CLI verb remains valid');
                    assert.equal(allowedMention('.claude/docs/skills/README.md', line), false, 'CLI exemption belongs only to its implementation owner');
                    for (const stale of [`/${name}`, `skills/${name}/SKILL.md`, `"${retiredExport}"`]) {
                        assert.equal(allowedMention('.claude/scripts/code_graph/cli.py', `${line} # ${stale}`), false, 'a preserved CLI token cannot conceal a retired skill reference');
                    }
                }
            }
            const offenders = [];
            for (const root of LIVE_SOURCE_ROOTS) {
                for (const rel of walk(root)) {
                    if (SCAN_EXCLUDED.has(rel)) continue;
                    const lines = read(REPO_ROOT, ...rel.split('/')).split('\n');
                    lines.forEach((line, index) => {
                        if (!SKILL_NAME_PATTERNS.some(pattern => pattern.test(line))) return;
                        if (allowedMention(rel, line)) return;
                        offenders.push(`${rel}:${index + 1}`);
                    });
                }
            }
            assert.deepEqual(offenders, [], `live sources still name a removed graph skill:\n${offenders.join('\n')}`);
        }
    },
    {
        name: 'TC-GCM-013 export preserves JSON and Mermaid artifacts, preconditions, selection and verified reporting',
        skip: SKIP,
        fn: () => {
            // Intent: consolidation preserves each export branch and its action-changing conditions.
            // Failure signal: losing a format/option/precondition or inlining execution into the root fails.
            const text = mode('export');
            assert.match(text, /Pick `--format` FIRST \(default `json`\)/);
            assert.match(text, /unsupported format stops/);
            assert.match(text, /Graph not built.*graph\.db.*absent/);
            assert.match(text, /Python 3\.10\+/);
            assert.match(text, /python3.*macOS\/Linux/);
            assert.match(text, /Windows use `py -3`/);
            for (const command of [
                'code_graph export --json',
                'code_graph export --files',
                'code_graph export -o',
                'code_graph export-mermaid <relative-path> --json',
                'code_graph export-mermaid --file <relative-path> --json',
                'code_graph export-mermaid <relative-path> -o'
            ]) assert.ok(text.includes(command), `export keeps ${command}`);
            assert.match(text, /If missing, ask for it via `ask user question tool` before running/);
            for (const field of ['output_path', 'nodes_count', 'edges_count', 'file size', 'status: "ok"']) assert.ok(text.includes(field), `reports ${field}`);
            assert.match(text, /graph-export\.json/);
            assert.match(text, /path-based-unique-name/);
            for (const kind of ['MESSAGE_BUS', 'TRIGGERS_EVENT', 'PRODUCES_EVENT', 'TRIGGERS_COMMAND_EVENT', 'API_ENDPOINT']) assert.ok(text.includes(kind), `exports ${kind}`);
            const row = skill().split('\n').find(line => line.startsWith('| `--mode=export'));
            assert.ok(row && row.includes('"export graph"') && row.includes('"export Mermaid"'), 'export intents route to the new mode');
        }
    }
];

module.exports = { name: 'graph-code-modes-merge', tests };
