'use strict';
// Protocol Text Parity (source-freshness gate).
//
// The single canonical source of the universal protocol text (critical thinking, AI mistake prevention,
// reference-doc loading, task planning, …) is `.claude/skills/shared/sync-inline-versions.md`.
// The universal hook delivers that text from the generated projection (`shared/protocols/<tag>.md`)
// in the bins of `protocol-groups.json`; no root file, skill or agent carries any of it. This suite is
// the regression net that fails the moment a projection drifts from canonical, a bin stops carrying a
// canonical body, or a copy of the text reappears in a root file, a skill or an agent.
//
// Asserts (TC-CTXP-030..033):
//   P1  every universal tag's projection file == its canonical body
//   P2  every delivered bin == the canonical bodies of its tags, rendered by the one bin format
//   P3  CLAUDE.md carries no universal protocol text: no CK protocol/route block, no sentinel, no body lead line
//   P4  AGENTS.md carries none either
//   P5  no skill embeds or guides a universal tag
//   GUARD comparator is not vacuously true (drift IS detected; empty extraction fails)
//
// Hard requirements: normalize CRLF (Windows checks out CRLF, canonical commits LF); NEVER fail-open
// (a parser miss must FAIL the test, never silently pass).

const fs = require('fs');
const path = require('path');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');
const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const { extractSyncBody } = require(path.join(REPO, '.claude', 'scripts', 'lib', 'extract-sync-block.cjs'));
const universalLib = require(path.join(REPO, '.claude', 'hooks', 'lib', 'universal-delivery.cjs'));

const CANONICAL_PATH = path.join(REPO, '.claude', 'skills', 'shared', 'sync-inline-versions.md');
const GROUPS_PATH = path.join(REPO, '.claude', 'skills', 'shared', 'protocol-groups.json');
const CLAUDE_MD_PATH = path.join(REPO, 'CLAUDE.md');
const AGENTS_MD_PATH = path.join(REPO, 'AGENTS.md');
// P3/P4 assert this framework repo's own root files (an adopter's root file is project-owned), so they
// skip elsewhere through the synchronous framework-repo guard (`skip` is read while the list is built).
const SELF_CHECK = isFrameworkRepo(REPO);
const HAS_CLAUDE_MD = SELF_CHECK && fs.existsSync(CLAUDE_MD_PATH);
const HAS_AGENTS_MD = SELF_CHECK && fs.existsSync(AGENTS_MD_PATH);
const SKILLS_DIR = path.join(REPO, '.claude', 'skills');

const canonical = fs.readFileSync(CANONICAL_PATH, 'utf8');
const universal = JSON.parse(fs.readFileSync(GROUPS_PATH, 'utf8')).groups.universal;
const UNIVERSAL_TAGS = Object.keys(universal.tags);

// Strict normalizer for tight byte-parity invariants: CRLF->LF + trim only.
// Preserves internal blank-line structure so this catches spacing drift, not just wording drift.
const normTrim = (s) => String(s).replace(/\r\n?/g, '\n').trim();

// Lenient normalizer for the skill sweep: also strips trailing per-line ws and collapses blank-line runs.
const norm = (s) =>
    String(s)
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((l) => l.replace(/\s+$/, ''))
        .join('\n')
        .replace(/\n{2,}/g, '\n')
        .trim();

// Content between HTML-comment SYNC markers in a skill file: <!-- SYNC:tag -->…<!-- /SYNC:tag -->.
function extractHtmlSyncBody(content, tag) {
    const md = String(content).replace(/\r\n?/g, '\n');
    const open = `<!-- SYNC:${tag} -->`;
    const close = `<!-- /SYNC:${tag} -->`;
    const s = md.indexOf(open);
    if (s === -1) return null;
    const e = md.indexOf(close, s + open.length);
    if (e === -1) return null;
    return md.slice(s + open.length, e).trim();
}

// All bodies between CK markers: <!-- CK:TAG -->…<!-- /CK:TAG -->.
function extractAllCkBodies(content, tag) {
    const md = String(content).replace(/\r\n?/g, '\n');
    const open = `<!-- CK:${tag} -->`;
    const close = `<!-- /CK:${tag} -->`;
    const bodies = [];
    let from = 0;
    for (;;) {
        const s = md.indexOf(open, from);
        if (s === -1) break;
        const e = md.indexOf(close, s + open.length);
        if (e === -1) break;
        bodies.push(md.slice(s + open.length, e).trim());
        from = e + close.length;
    }
    return bodies;
}

// Guide carriers: a converted skill carries a protocol as one guide line (shared recognizer — never a
// copied line format) instead of the embed; its full text lives in `shared/protocols/<tag>.md`.
const guideCarrier = require(path.join(REPO, '.claude', 'scripts', 'lib', 'protocol-guide-carrier.cjs'));

// Sweep all skills for an embed or guide entry of `tag`, returning matched/drifted partition vs
// canonical, plus the skills that carry the tag as a guide entry backed by an existing projection file.
function sweepSkillEmbeds(tag, canonCondensedNorm, skillsDir = SKILLS_DIR) {
    const matched = [];
    const drifted = [];
    const guided = [];
    const projectionExists = fs.existsSync(path.join(skillsDir, 'shared', 'protocols', `${tag}.md`));
    const skillDirs = fs
        .readdirSync(skillsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    for (const dir of skillDirs) {
        const p = path.join(skillsDir, dir, 'SKILL.md');
        if (!fs.existsSync(p)) continue;
        const text = fs.readFileSync(p, 'utf8');
        const body = extractHtmlSyncBody(text, tag);
        if (body == null) {
            if (projectionExists && guideCarrier.hasGuideEntry(text, tag)) guided.push(dir);
            continue; // skill doesn't embed this tag
        }
        if (norm(body) === canonCondensedNorm) matched.push(dir);
        else drifted.push(dir);
    }
    return { matched, drifted, guided, embedCount: matched.length + drifted.length, guideCount: guided.length };
}

/** The first non-empty line of a protocol body: its distinctive lead, used to find a copy. */
const leadLine = (body) => normTrim(body).split('\n').find((line) => line.trim() !== '').trim();

const ROOT_MARKERS = [/CK:UNIVERSAL-GUIDES/, /<!-- CK:CRITICAL-THINKING -->/, /<!-- CK:AI-MISTAKE-PREVENTION -->/, /<!-- CK:WORKFLOW-ROUTE-POINTER -->/, /<!-- CK:WORKFLOW-GATE -->/];

function rootCopyProblems(text) {
    const problems = [];
    for (const marker of ROOT_MARKERS) if (marker.test(text)) problems.push(`marker ${marker}`);
    const normalized = String(text).replace(/\r\n?/g, '\n');
    for (const tag of UNIVERSAL_TAGS) {
        const lead = leadLine(extractSyncBody(canonical, tag));
        if (lead.length >= 30 && normalized.includes(lead)) problems.push(`lead line of ${tag}`);
    }
    return problems;
}

module.exports = {
    name: 'protocol-text-parity',
    tests: [
        // ── P1 — the published projection equals canonical for every universal tag.
        {
            name: 'TC-CTXP-030 P1: every universal projection file == its canonical body',
            fn() {
                assertTrue(UNIVERSAL_TAGS.length >= 4, 'the universal group holds the bundle');
                for (const tag of UNIVERSAL_TAGS) {
                    const body = extractSyncBody(canonical, tag);
                    assertTrue(body != null && body.length > 0, `canonical ${tag} not found (fail-closed)`);
                    const file = path.join(SKILLS_DIR, 'shared', 'protocols', `${tag}.md`);
                    assertTrue(fs.existsSync(file), `projection file missing for ${tag}`);
                    assertEqual(normTrim(fs.readFileSync(file, 'utf8')), normTrim(body), `projection of ${tag} drifted from canonical (run node .claude/scripts/build-protocol-projection.cjs)`);
                }
            },
        },
        // ── P2 — every bin is exactly the rendered canonical bodies of its tags.
        {
            name: 'TC-CTXP-030 P2: every delivered bin == the canonical bodies of its tags, rendered by the bin format',
            fn() {
                const reader = (file) => {
                    try {
                        return fs.readFileSync(file, 'utf8');
                    } catch {
                        return null;
                    }
                };
                // The authored bins are the compatible bundle, whichever profile the developer selected.
                const bins = universalLib.loadBins(REPO, reader, { config: { contextDelivery: { profile: 'compatible' } } });
                assertEqual(bins.length, universal.bins.length, 'every authored bin is deliverable');
                bins.forEach((bin, i) => {
                    const expected = universalLib.renderBin(i + 1, universal.bins.length, universal.bins[i].map((tag) => normTrim(extractSyncBody(canonical, tag))));
                    assertEqual(normTrim(bin.text), normTrim(expected), `bin ${i + 1} drifted from the canonical bodies`);
                });
            },
        },

        // ── P3 / P4 — no root file carries universal protocol text.
        {
            name: 'TC-CTXP-031 P3: CLAUDE.md carries no universal protocol text (the hook delivers it)',
            skip: !HAS_CLAUDE_MD ? 'asserts the framework repository root file CLAUDE.md (framework-repo signal)' : false,
            fn() {
                const problems = rootCopyProblems(fs.readFileSync(CLAUDE_MD_PATH, 'utf8'));
                assertEqual(problems.length, 0, `CLAUDE.md holds universal protocol text: ${problems.join('; ')} (run /ai-context-refresh with --strip-legacy-universal)`);
            },
        },
        {
            name: 'TC-CTXP-032 P4: AGENTS.md carries no universal protocol text (the hook delivers it)',
            skip: !HAS_AGENTS_MD ? 'asserts the framework repository root file AGENTS.md (framework-repo signal)' : false,
            fn() {
                const problems = rootCopyProblems(fs.readFileSync(AGENTS_MD_PATH, 'utf8'));
                assertEqual(problems.length, 0, `AGENTS.md holds universal protocol text: ${problems.join('; ')} (regenerate with /sync-codex)`);
            },
        },

        // ── P5 — no skill carries a universal tag in any form.
        {
            name: 'TC-CTXP-033 P5: no skill embeds or guides a universal tag',
            fn() {
                for (const tag of UNIVERSAL_TAGS) {
                    const r = sweepSkillEmbeds(tag, norm(extractSyncBody(canonical, tag)));
                    assertEqual(r.embedCount + r.guideCount, 0, `${tag} is hook-delivered, yet skill(s) still embed or guide it: ${[...r.matched, ...r.drifted, ...r.guided].join(', ')}`);
                }
                // And the sync-codex skill never instructs the model to put a universal rule or the full CLAUDE.md into the
                // generated AGENTS.md projection: that file is project information only and hooks deliver the universal rules.
                const syncCodex = fs.readFileSync(path.join(SKILLS_DIR, 'sync-codex', 'SKILL.md'), 'utf8');
                assertTrue(!/Git discipline project first|Doc Lookup and Git discipline|mirror full `CLAUDE\.md`|generated hook\/context blocks/.test(syncCodex), 'sync-codex SKILL.md still instructs a universal-rule or full-CLAUDE.md projection into AGENTS.md');
                assertTrue(/project projection of `CLAUDE\.md`/.test(syncCodex), 'sync-codex SKILL.md states that AGENTS.md is the project projection of CLAUDE.md');
            },
        },

        // ── TC-PDL-065 — the sweep's fail-closed count accepts guide carriers but never an empty sweep.
        {
            name: 'TC-PDL-065 P5: a guide entry backed by a projection counts as a carrier; losing it fails closed',
            fn() {
                const os = require('os');
                const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ptp-guide-'));
                try {
                    // Given: a fixture skills root whose only carrier holds a guide entry for the tag
                    // (no embed) and the tag's projection file.
                    const tag = 'severity-rubric';
                    const skillsDir = path.join(tmp, '.claude', 'skills');
                    fs.mkdirSync(path.join(skillsDir, 'shared', 'protocols'), { recursive: true });
                    fs.mkdirSync(path.join(skillsDir, 'guided'), { recursive: true });
                    const projection = path.join(skillsDir, 'shared', 'protocols', `${tag}.md`);
                    fs.writeFileSync(projection, '> Fixture body.\n');
                    const guideLine = guideCarrier.formatGuideLine({ tag, summary: 'Fixture', when: 'always', path: `.claude/skills/shared/protocols/${tag}.md` });
                    const skillFile = path.join(skillsDir, 'guided', 'SKILL.md');
                    fs.writeFileSync(skillFile, `# Guided\n\n${guideCarrier.GUIDE_BLOCK_START}\n\n${guideLine}\n\n${guideCarrier.GUIDE_BLOCK_END}\n`);
                    const passes = (r) => r.embedCount + r.guideCount > 0;

                    // When: the sweep runs. Then: the guide carrier satisfies the fail-closed count.
                    const withGuide = sweepSkillEmbeds(tag, norm('> Fixture body.'), skillsDir);
                    assertEqual(withGuide.guideCount, 1, 'guide carrier must be counted');
                    assertTrue(passes(withGuide), 'a guide carrier must satisfy the fail-closed count');
                    // When: the projection file is missing. Then: the guide no longer counts.
                    fs.rmSync(projection);
                    assertTrue(!passes(sweepSkillEmbeds(tag, norm('> Fixture body.'), skillsDir)), 'a guide with no projection must not count');
                    // When: the guide entry is removed too (both forms missing). Then: the count fails closed.
                    fs.writeFileSync(projection, '> Fixture body.\n');
                    fs.writeFileSync(skillFile, '# Guided\n\nNo carrier.\n');
                    assertTrue(!passes(sweepSkillEmbeds(tag, norm('> Fixture body.'), skillsDir)), 'no embed and no guide must fail closed');
                    // And: an embed still present is still drift-checked.
                    fs.writeFileSync(skillFile, `<!-- SYNC:${tag} -->\n\n> Drifted.\n\n<!-- /SYNC:${tag} -->\n`);
                    assertEqual(sweepSkillEmbeds(tag, norm('> Fixture body.'), skillsDir).drifted.length, 1, 'embed drift must still be detected');
                } finally {
                    fs.rmSync(tmp, { recursive: true, force: true });
                }
            },
        },

        // ── GUARD — comparator distinguishes drift (proves the equality checks above are not vacuous).
        {
            name: 'GUARD: parity comparator detects drift and rejects empty extraction',
            fn() {
                const body = extractSyncBody(canonical, UNIVERSAL_TAGS[0]);
                assertTrue(
                    normTrim(body) !== normTrim(body + '\n- injected drift line'),
                    'comparator failed to detect appended drift — equality assertions would be vacuous'
                );
                assertTrue(extractHtmlSyncBody('no markers here', 'critical-thinking-mindset') === null, 'extractHtmlSyncBody must return null on miss (no fail-open)');
                assertEqual(extractAllCkBodies('no markers here', 'CRITICAL-THINKING').length, 0, 'extractAllCkBodies must return empty on miss (no fail-open)');
                // The root-copy detector fires on a real copy and stays quiet on project text
                assertTrue(rootCopyProblems(`# Project\n\n${leadLine(body)}\n`).length > 0, 'a copy of a body lead line is detected');
                assertEqual(rootCopyProblems('# Project\n\nOur module map.\n').length, 0, 'project text raises nothing');
            },
        },
    ],
};
