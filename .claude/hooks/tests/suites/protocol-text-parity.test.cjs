'use strict';
// Phase 04 — Protocol Text Parity (source-freshness gate).
//
// Single canonical source of the critical-thinking / ai-mistake-prevention protocol text is
// `.claude/skills/shared/sync-inline-versions.md`. Every downstream copy — the baked CLAUDE.md
// blocks and the per-skill embeds — must stay byte-faithful to it (after EOL/whitespace
// normalization). This suite is the regression net that fails the moment any copy drifts from
// canonical, so a hook-free Codex harness still sees identical AI context.
//
// After the de-hooking refactor no hook emits protocol text at runtime. `prompt-injections.cjs`
// is a delegating compat wrapper that returns `buildCanonicalProtocolText(...,':full')` from the
// canonical file. P1/P2 are therefore a WRAPPER-STILL-DELEGATES guard, not a runtime-emission
// check: they confirm the legacy injector entrypoints still resolve to the canonical body so any
// remaining legacy caller stays in lockstep with canonical. The REAL cross-copy parity is held by
// P3/P4 (CLAUDE.md baked blocks) and P5 (skill embeds).
//
// Asserts (TC-CTXP-030..033):
//   P1  wrapper-delegates  injectCriticalContext('',true)     == canonical SYNC:critical-thinking-mindset:full
//   P2  wrapper-delegates  injectAiMistakePrevention('',true) == canonical SYNC:ai-mistake-prevention:full
//   P3  CLAUDE.md TOP CK:CRITICAL-THINKING / CK:AI-MISTAKE-PREVENTION blocks == canonical :full
//   P4  CLAUDE.md BOTTOM CK blocks == TOP CK blocks (exactly 2 occurrences each, primacy==recency)
//   P5  canonical CONDENSED critical-thinking-mindset / ai-mistake-prevention == every skill embed
//   GUARD comparator is not vacuously true (drift IS detected; empty extraction fails)
//
// Hard requirements: normalize CRLF (Windows checks out CRLF, canonical commits LF); NEVER fail-open
// (a parser miss must FAIL the test, never silently pass).

const fs = require('fs');
const path = require('path');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const { extractSyncBody } = require(path.join(REPO, '.claude', 'scripts', 'lib', 'extract-sync-block.cjs'));
const injectors = require(path.join(REPO, '.claude', 'hooks', 'lib', 'prompt-injections.cjs'));

const CANONICAL_PATH = path.join(REPO, '.claude', 'skills', 'shared', 'sync-inline-versions.md');
const CLAUDE_MD_PATH = path.join(REPO, 'CLAUDE.md');
const SKILLS_DIR = path.join(REPO, '.claude', 'skills');

const canonical = fs.readFileSync(CANONICAL_PATH, 'utf8');

// Strict normalizer for tight byte-parity invariants (P1-P4): CRLF->LF + trim only.
// Preserves internal blank-line structure so this catches spacing drift, not just wording drift.
const normTrim = (s) => String(s).replace(/\r\n?/g, '\n').trim();

// Lenient-but-proven normalizer for the broad embed sweep (P5): also strips trailing per-line ws
// and collapses blank-line runs, absorbing the minor spacing variance across 155 skill embeds.
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

// All bodies between CK markers in CLAUDE.md: <!-- CK:TAG -->…<!-- /CK:TAG --> (top + bottom).
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

// Canonical bodies (fail loudly if a tag is missing — extractSyncBody returns null on miss).
const canonCritFull = extractSyncBody(canonical, 'critical-thinking-mindset:full');
const canonAimpFull = extractSyncBody(canonical, 'ai-mistake-prevention:full');
const canonCritCondensed = extractSyncBody(canonical, 'critical-thinking-mindset');
const canonAimpCondensed = extractSyncBody(canonical, 'ai-mistake-prevention');

// Sweep all skills for a condensed embed, returning matched/drifted partition vs canonical.
function sweepSkillEmbeds(tag, canonCondensedNorm) {
    const matched = [];
    const drifted = [];
    const skillDirs = fs
        .readdirSync(SKILLS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    for (const dir of skillDirs) {
        const p = path.join(SKILLS_DIR, dir, 'SKILL.md');
        if (!fs.existsSync(p)) continue;
        const body = extractHtmlSyncBody(fs.readFileSync(p, 'utf8'), tag);
        if (body == null) continue; // skill doesn't embed this tag
        if (norm(body) === canonCondensedNorm) matched.push(dir);
        else drifted.push(dir);
    }
    return { matched, drifted, embedCount: matched.length + drifted.length };
}

module.exports = {
    name: 'protocol-text-parity',
    tests: [
        // ── P1 / P2 — wrapper-still-delegates guard: the legacy injector entrypoints in the
        //    delegating compat wrapper must still resolve to canonical :full (no runtime emission).
        {
            name: 'TC-CTXP-030 P1: injectCriticalContext == canonical critical-thinking-mindset:full',
            fn() {
                assertTrue(canonCritFull != null, 'canonical critical-thinking-mindset:full not found');
                const wrapped = injectors.injectCriticalContext('', true);
                assertEqual(normTrim(wrapped), normTrim(canonCritFull), 'wrapper injectCriticalContext stopped delegating to canonical :full');
            },
        },
        {
            name: 'TC-CTXP-030 P2: injectAiMistakePrevention == canonical ai-mistake-prevention:full',
            fn() {
                assertTrue(canonAimpFull != null, 'canonical ai-mistake-prevention:full not found');
                const wrapped = injectors.injectAiMistakePrevention('', true);
                assertEqual(normTrim(wrapped), normTrim(canonAimpFull), 'wrapper injectAiMistakePrevention stopped delegating to canonical :full');
            },
        },

        // ── P3 — baked CLAUDE.md TOP blocks identical to canonical :full.
        {
            name: 'TC-CTXP-031 P3: CLAUDE.md TOP CK:CRITICAL-THINKING == canonical :full',
            fn() {
                const claudeMd = fs.readFileSync(CLAUDE_MD_PATH, 'utf8');
                const bodies = extractAllCkBodies(claudeMd, 'CRITICAL-THINKING');
                assertTrue(bodies.length >= 1, 'no CK:CRITICAL-THINKING block found in CLAUDE.md (fail-closed)');
                assertEqual(normTrim(bodies[0]), normTrim(canonCritFull), 'CLAUDE.md TOP critical block drifted from canonical :full');
            },
        },
        {
            name: 'TC-CTXP-031 P3: CLAUDE.md TOP CK:AI-MISTAKE-PREVENTION == canonical :full',
            fn() {
                const claudeMd = fs.readFileSync(CLAUDE_MD_PATH, 'utf8');
                const bodies = extractAllCkBodies(claudeMd, 'AI-MISTAKE-PREVENTION');
                assertTrue(bodies.length >= 1, 'no CK:AI-MISTAKE-PREVENTION block found in CLAUDE.md (fail-closed)');
                assertEqual(normTrim(bodies[0]), normTrim(canonAimpFull), 'CLAUDE.md TOP ai-mistake block drifted from canonical :full');
            },
        },

        // ── P4 — primacy/recency anchors: bottom blocks == top blocks (exactly 2 occurrences each).
        {
            name: 'TC-CTXP-032 P4: CLAUDE.md CRITICAL-THINKING bottom==top (2 occurrences)',
            fn() {
                const claudeMd = fs.readFileSync(CLAUDE_MD_PATH, 'utf8');
                const bodies = extractAllCkBodies(claudeMd, 'CRITICAL-THINKING');
                assertEqual(bodies.length, 2, 'expected exactly 2 CK:CRITICAL-THINKING blocks (top primacy + bottom recency)');
                assertEqual(normTrim(bodies[1]), normTrim(bodies[0]), 'CLAUDE.md bottom critical anchor drifted from top');
            },
        },
        {
            name: 'TC-CTXP-032 P4: CLAUDE.md AI-MISTAKE-PREVENTION bottom==top (2 occurrences)',
            fn() {
                const claudeMd = fs.readFileSync(CLAUDE_MD_PATH, 'utf8');
                const bodies = extractAllCkBodies(claudeMd, 'AI-MISTAKE-PREVENTION');
                assertEqual(bodies.length, 2, 'expected exactly 2 CK:AI-MISTAKE-PREVENTION blocks (top primacy + bottom recency)');
                assertEqual(normTrim(bodies[1]), normTrim(bodies[0]), 'CLAUDE.md bottom ai-mistake anchor drifted from top');
            },
        },

        // ── P5 — every skill embed of the condensed blocks matches canonical condensed.
        {
            name: 'TC-CTXP-033 P5: all skill embeds of critical-thinking-mindset == canonical condensed',
            fn() {
                assertTrue(canonCritCondensed != null, 'canonical critical-thinking-mindset (condensed) not found');
                const r = sweepSkillEmbeds('critical-thinking-mindset', norm(canonCritCondensed));
                assertTrue(r.embedCount > 0, 'no skill embeds of critical-thinking-mindset found — parser broken (fail-closed)');
                assertEqual(r.drifted.length, 0, `critical-thinking-mindset embed drift in: ${r.drifted.join(', ')}`);
            },
        },
        {
            name: 'TC-CTXP-033 P5: all skill embeds of ai-mistake-prevention == canonical condensed',
            fn() {
                assertTrue(canonAimpCondensed != null, 'canonical ai-mistake-prevention (condensed) not found');
                const r = sweepSkillEmbeds('ai-mistake-prevention', norm(canonAimpCondensed));
                assertTrue(r.embedCount > 0, 'no skill embeds of ai-mistake-prevention found — parser broken (fail-closed)');
                assertEqual(r.drifted.length, 0, `ai-mistake-prevention embed drift in: ${r.drifted.join(', ')}`);
            },
        },

        // ── GUARD — comparator distinguishes drift (proves the equality checks above are not vacuous).
        {
            name: 'GUARD: parity comparator detects drift and rejects empty extraction',
            fn() {
                assertTrue(
                    normTrim(canonCritFull) !== normTrim(canonCritFull + '\n- injected drift line'),
                    'comparator failed to detect appended drift — equality assertions would be vacuous'
                );
                assertTrue(extractHtmlSyncBody('no markers here', 'critical-thinking-mindset') === null, 'extractHtmlSyncBody must return null on miss (no fail-open)');
                assertEqual(extractAllCkBodies('no markers here', 'CRITICAL-THINKING').length, 0, 'extractAllCkBodies must return empty on miss (no fail-open)');
            },
        },
    ],
};
