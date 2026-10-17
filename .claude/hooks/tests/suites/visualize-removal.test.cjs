/**
 * Visualize Removal Test Suite
 *
 * The diagramming workflow and its diagram-rendering skill are not part of the framework. Diagram
 * needs are met by Mermaid in markdown inside the owning skill's report (for example `understand`,
 * `domain-analysis`, `architecture`), so no workflow step or skill routes through a dedicated
 * diagram-rendering skill.
 *
 * Coverage:
 *   TC-VZR-001 — neither removed skill folder exists (a restored local venv or asset counts).
 *   TC-VZR-002 — workflows.json has no entry for the removed workflow and no resolved step or
 *                outcome gate runs the removed skill.
 *   TC-VZR-003 — no live source names either removed artifact (allow-list: generated catalogs that the
 *                regenerator rebuilds from the skill folders, and this file).
 *   TC-VZR-004 — a workflow step that names a skill with no folder fails manifest resolution (fixture;
 *                portable), so a re-added step cannot slip through.
 *
 * Portability: TC-VZR-004 runs on in-memory fixture registries. Every other row asserts this framework
 * repository's own skills and registry and is skipped in any other project (framework-repo signal).
 * Paths use node:path; nothing is OS-specific.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const { resolveAllWorkflowManifests, resolveWorkflowManifest } = require('../../../scripts/lib/workflow-manifest.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own skills and workflow registry (framework-repo signal)';
const SKILLS = path.join(REPO_ROOT, '.claude', 'skills');

// The removed names, assembled so this file never contains the literal tokens it guards against.
const REMOVED_WORKFLOW = 'workflow-' + 'visualize';
const REMOVED_SKILL = 'excali' + 'draw-diagram';
const REMOVED_TOOL_PATTERN = new RegExp('excali' + 'draw|' + REMOVED_WORKFLOW, 'i');

const LIVE_SOURCE_ROOTS = ['.claude', 'docs/specs', 'docs/project-reference', 'docs/adr', 'docs/templates', 'README.md', 'CLAUDE.md'];
// Generated catalogs are rebuilt from the skill folders; release notes keep history.
const SCAN_EXCLUDED = new Set([
    '.claude/SKILLS.yaml',
    '.claude/scripts/skills_data.yaml',
    '.claude/hooks/tests/suites/visualize-removal.test.cjs'
]);
const SCAN_EXCLUDED_DIRS = new Set(['node_modules', '.git', '.code-graph', '.venv', '__pycache__', 'tmp', 'temp', 'plans']);
const SCAN_EXTENSIONS = new Set(['.md', '.cjs', '.mjs', '.js', '.py', '.json', '.yaml', '.yml', '.html', '.toml']);

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

const tests = [
    {
        name: 'TC-VZR-001 the removed workflow and diagram-skill folders stay deleted',
        skip: SKIP,
        fn: () => {
            assert.ok(!fs.existsSync(path.join(SKILLS, REMOVED_WORKFLOW)), `${REMOVED_WORKFLOW} must not exist as a skill folder`);
            assert.ok(!fs.existsSync(path.join(SKILLS, REMOVED_SKILL)), `${REMOVED_SKILL} must not exist as a skill folder`);
        }
    },
    {
        name: 'TC-VZR-002 workflows.json has no removed workflow and no step or gate runs the removed skill',
        skip: SKIP,
        fn: () => {
            const raw = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8');
            const document = JSON.parse(raw);
            assert.ok(!(REMOVED_WORKFLOW in document.workflows), `workflows.json must not define ${REMOVED_WORKFLOW}`);
            assert.ok(!REMOVED_TOOL_PATTERN.test(raw), 'workflows.json must not mention the removed workflow or skill anywhere (steps, gates, whenToUse, injected context)');
            const skills = new Set();
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    for (const { skill } of manifest.occurrences) skills.add(skill);
                }
            }
            assert.ok(!skills.has(REMOVED_SKILL), `no resolved workflow step runs ${REMOVED_SKILL}`);
            assert.ok(skills.has('investigate') && skills.has('workflow-end'), 'tripwire: the registry still resolves its shared steps');
        }
    },
    {
        name: 'TC-VZR-003 no live source names the removed workflow or diagram-rendering skill',
        skip: SKIP,
        fn: () => {
            const offenders = [];
            let scanned = 0;
            for (const root of LIVE_SOURCE_ROOTS) {
                for (const rel of walk(root)) {
                    if (SCAN_EXCLUDED.has(rel)) continue;
                    scanned += 1;
                    const lines = fs.readFileSync(path.join(REPO_ROOT, ...rel.split('/')), 'utf8').split(/\r?\n/);
                    lines.forEach((line, index) => {
                        if (REMOVED_TOOL_PATTERN.test(line)) offenders.push(`${rel}:${index + 1}`);
                    });
                }
            }
            assert.ok(scanned > 500, `tripwire: the scan covers the framework sources (${scanned} files)`);
            assert.deepEqual(offenders, [], 'delete the sentence, or name Mermaid in markdown where a diagram instruction must remain');
        }
    },
    {
        name: 'TC-VZR-004 a workflow step naming a skill with no folder fails manifest resolution',
        fn: () => {
            // Given a fixture registry whose only step names the removed skill and a skill set without it
            const document = { version: '1', workflows: { fixture: { sequence: ['investigate', REMOVED_SKILL, 'workflow-end'] } } };
            // When it resolves against the skills that exist
            // Then resolution fails on the missing skill instead of silently running it
            assert.throws(
                () => resolveWorkflowManifest(document, 'fixture', { availableSkills: ['investigate', 'workflow-end'] }),
                new RegExp(`Missing skill: ${REMOVED_SKILL}`)
            );
            // And the same registry resolves once the skill exists (the guard is the missing folder, nothing else)
            const manifest = resolveWorkflowManifest(document, 'fixture', { availableSkills: ['investigate', REMOVED_SKILL, 'workflow-end'] });
            assert.equal(manifest.occurrences.length, 3);
        }
    }
];

module.exports = { name: 'visualize-removal', tests };
