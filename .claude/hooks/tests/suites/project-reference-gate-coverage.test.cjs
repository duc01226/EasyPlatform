/**
 * Project Reference Gate Coverage Test Suite
 *
 * Guards the static JIT delivery of `SYNC:project-reference-docs-guide` — the gate that
 * tells the model WHICH project-reference doc to read BEFORE each phase (plan, edit,
 * test, spec/doc, review) and when an earlier read still counts (the ~200K-token dedup
 * window). The universal hook delivers the gate (the `universal` group) on a session's first prompt
 * and at every sub-agent start; no root file, skill or agent carries any part of it, so a step skill
 * reaches the gate through the hook.
 *
 * Tests:
 *   TC-PRG-001 — every workflow step skill carries no copy of the gate and no retired pointer line.
 *   TC-PRG-002 — no skill (references included) or agent carries a body, reminder or guide line of the
 *                gate: the canonical text is the only copy.
 *   TC-PRG-004 — the canonical gate states the phase routing and the ~200K-token dedup rule,
 *                and that window matches the file-convention hook's default distance.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');

const ROOT = path.resolve(process.env.CLAUDE_PROJECT_DIR || path.join(__dirname, '..', '..', '..', '..'));
const SKILLS_DIR = path.join(ROOT, '.claude', 'skills');
const AGENTS_DIR = path.join(ROOT, '.claude', 'agents');
const CANONICAL = path.join(SKILLS_DIR, 'shared', 'sync-inline-versions.md');
const TAG = 'SYNC:project-reference-docs-guide';
const GUIDE_TAG = TAG.replace(/^SYNC:/, '');

const guideCarrier = require(path.join(__dirname, '..', '..', '..', 'scripts', 'lib', 'protocol-guide-carrier.cjs'));

const normalizeEol = text => text.replace(/\r\n?/g, '\n');
const read = file => normalizeEol(fs.readFileSync(file, 'utf8'));

/** Canonical body, parsed the same way as sync_blocks.load_sync_body. */
function canonicalWrapped(tag) {
    const text = read(CANONICAL);
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`^## ${escaped}\\s*\\n([\\s\\S]*?)(?=^---\\s*$)`, 'm').exec(text);
    if (!match) throw new Error(`canonical block not found: ${tag}`);
    return `<!-- ${tag} -->\n\n${match[1].trim()}\n\n<!-- /${tag} -->`;
}

function workflowStepSkills() {
    const { resolvedModeSequences, baseSkill } = require(path.join(ROOT, '.claude', 'scripts', 'lib', 'workflow-skills-catalog.cjs'));
    const doc = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude', 'workflows.json'), 'utf8'));
    const skills = new Set();
    for (const [id, wf] of Object.entries(doc.workflows || {})) {
        for (const { sequence } of resolvedModeSequences(ROOT, id, wf)) {
            for (const step of sequence) skills.add(baseSkill(step));
        }
    }
    return [...skills].filter(name => fs.existsSync(path.join(SKILLS_DIR, name, 'SKILL.md'))).sort();
}

/** Every skill SKILL.md, skill references/*.md file and agent .md file, as `{label, text}`. */
function carriers() {
    const out = [];
    for (const dir of fs.readdirSync(SKILLS_DIR)) {
        const file = path.join(SKILLS_DIR, dir, 'SKILL.md');
        if (fs.existsSync(file)) out.push({ label: dir, text: read(file) });
        const refs = path.join(SKILLS_DIR, dir, 'references');
        if (!fs.existsSync(refs)) continue;
        for (const name of fs.readdirSync(refs).filter(f => f.endsWith('.md'))) out.push({ label: `${dir}/references/${name}`, text: read(path.join(refs, name)) });
    }
    for (const name of fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'))) out.push({ label: `agent:${name}`, text: read(path.join(AGENTS_DIR, name)) });
    return out;
}

/** Problems for one carrier: a body, a reminder or a guide line of the gate. */
function gateCopyProblems(label, text) {
    const problems = [];
    if (new RegExp(`^<!-- ${TAG} -->`, 'm').test(text)) problems.push(`${label}: carries the gate body`);
    if (new RegExp(`^<!-- ${TAG}:reminder -->`, 'm').test(text)) problems.push(`${label}: carries the gate reminder`);
    if (guideCarrier.hasGuideEntry(text, GUIDE_TAG)) problems.push(`${label}: carries a guide line for the gate`);
    return problems;
}

module.exports = {
    name: 'project-reference-gate-coverage',
    tests: [
        {
            name: 'TC-PRG-001 every workflow step skill carries no copy of the gate and no retired pointer line',
            fn: () => {
                // Given: the live workflow catalog and the gate's tag in the hook-delivered universal group.
                const steps = workflowStepSkills();
                assertTrue(steps.length > 20, `expected the workflow catalog to resolve step skills, got ${steps.length}`);
                const groups = JSON.parse(fs.readFileSync(path.join(SKILLS_DIR, 'shared', 'protocol-groups.json'), 'utf8'));
                const universalTags = Object.keys(groups.groups.universal.tags);
                assertTrue(universalTags.includes(GUIDE_TAG), `${GUIDE_TAG} must be a universal (hook-delivered) protocol`);
                // When: every step skill's SKILL.md is read.
                const problems = [];
                for (const skill of steps) {
                    const text = read(path.join(SKILLS_DIR, skill, 'SKILL.md'));
                    // Then: it holds no pointer line and no copy of the gate.
                    const lines = guideCarrier.rootPointerLines(text);
                    if (lines.length !== 0) problems.push(`${skill}: ${lines.length} retired pointer line(s)`);
                    problems.push(...gateCopyProblems(skill, text));
                }
                assertEqual(problems.length, 0, `${problems.join('\n  ')}\n  Fix: py -3 .claude/scripts/sync-update-blocks.py --mode=strip-root-pointer (python3 on macOS/Linux)`);
            },
        },
        {
            name: 'TC-PRG-002 no skill, reference or agent carries a body, reminder or guide line of the gate',
            fn: () => {
                // Given: every skill, skill reference and agent file. When: each is scanned for the gate.
                const all = carriers();
                assertTrue(all.length > 50, `expected the skill and agent corpus, got ${all.length} files`);
                const problems = all.flatMap(({ label, text }) => gateCopyProblems(label, text));
                // Then: the canonical text is the only copy.
                assertEqual(problems.length, 0, `${problems.join('\n  ')}\n  Fix: py -3 .claude/scripts/sync-update-blocks.py --mode=strip-root-pointer (python3 on macOS/Linux)`);
            },
        },
        {
            name: 'TC-PRG-004 canonical gate routes by phase and dedups on the hook window',
            fn: () => {
                const top = canonicalWrapped(TAG);
                // Given/When: the canonical gate read from sync-inline-versions.md.
                // Then: the gate routes all five phases to their docs and states the dedup rule.
                for (const phase of ['investigate, explain, plan', 'edit or write code', 'tests or test data', 'specs, test cases, or docs', 'review a diff']) {
                    assertTrue(top.includes(phase), `phase routing row missing: ${phase}`);
                }
                for (const doc of ['project-structure-reference.md', 'code-review-rules.md', 'backend-patterns-reference.md', 'frontend-patterns-reference.md', 'integration-test-reference.md', 'e2e-test-reference.md', 'performance-test-reference.md', 'seed-test-data-reference.md', 'feature-spec-reference.md']) {
                    assertTrue(top.includes(doc), `routing table must name ${doc}`);
                }
                assertTrue(top.includes('file-conventions.cjs --lookup'), 'gate must point shell reads and edits at the per-file convention lookup');
                assertTrue(/Dedup within ~200K tokens/.test(top), 'gate must state the ~200K-token dedup window');
                assertTrue(/hook reminder, a summary/.test(top), 'dedup must refuse hook reminders and summaries as proof of loading');
                assertTrue(/before the first read or edit of an unfamiliar path class/.test(top), 'shell convention lookup must precede source reads as well as edits');
                assertTrue(top.includes('project-config-loader.cjs'), 'gate must resolve configured owners through the loader when the helper is absent');

                // Given the discovery instruction delivered before the gate, Then it must agree
                // with the optional-config and configured-owner contract rather than require defaults.
                const discovery = canonicalWrapped('SYNC:discovery-and-first-principles');
                assertTrue(discovery.includes('absent config is supported'), 'missing optional config must not stop discovery');
                assertTrue(discovery.includes('Never require default paths when owners are relocated'), 'relocated owners must take precedence');
                assertTrue(!discovery.includes('Read `docs/project-config.json` first'), 'discovery must not instruct reading the default before resolving its owner');

                // The prose window must equal the hook's default distance, so the protocol and the hook
                // dedup on the same horizon (22 transcript bytes per token).
                // Given: the file-convention hook's default settings. When: its re-inject distance is converted to tokens.
                const conventions = require(path.join(ROOT, '.claude', 'hooks', 'lib', 'file-conventions.cjs'));
                const tokens = conventions.resolveSettings({ conventionInjection: { enabled: true }, contextGroups: [] }).reinjectAfterBytes / conventions.BYTES_PER_TOKEN;
                // Then: it matches the gate's stated ~200K window.
                assertTrue(Math.abs(tokens - 200000) <= 10000, `hook default window is ~${Math.round(tokens)} tokens, gate says ~200K`);
            },
        },
    ],
};
