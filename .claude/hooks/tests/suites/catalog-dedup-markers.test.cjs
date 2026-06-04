/**
 * Workflow Catalog Dedup Markers — Phase 05 consolidation suite (TC-HOOKS-040..042)
 *
 * Phase 05 centralized the 3 per-part catalog dedup markers into a single source of
 * truth (lib/dedup-constants.cjs) WITHOUT changing observable behavior. The markers
 * are kept DISTINCT (not collapsed) on purpose — see the rationale block in
 * dedup-constants.cjs. These tests lock that behavior.
 *
 *   TC-HOOKS-040  Session-once dedup intact across all 3 router parts:
 *                 - first injection: each part emits its own marker (no prior catalog in transcript)
 *                 - repeat prompt:   each part skips (its marker already in the transcript window)
 *                 - single source:   the 3 centralized constants equal their historical strings
 *   TC-HOOKS-041  Catalog is NOT re-emitted at SessionStart/compact — re-emit is deferred to the
 *                 next UserPromptSubmit (dedup-gated). This is the documented post-compaction path
 *                 (post-compact-recovery.cjs does not inject the catalog).
 *   TC-HOOKS-042  Skip-justification for the optional anchor-density trim: the catalog injection
 *                 block carries a low anchor count (<=8 MUST ATTENTION/MANDATORY), so the optional
 *                 Phase 05 trim is correctly skipped.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const HOOKS = path.join(REPO, '.claude', 'hooks');
const ENV = { ...process.env, CLAUDE_PROJECT_DIR: REPO };

const MARK = require(path.join(HOOKS, 'lib', 'dedup-constants.cjs'));
const M1 = MARK.WORKFLOW_CATALOG;       // '## Workflow Catalog'
const M2 = MARK.WORKFLOW_CATALOG_P2;    // '## Workflow Catalog (continued)'
const M3 = MARK.WORKFLOW_CATALOG_P3;    // '## Workflow Catalog (part 3)'

const ROUTERS = [
    { stem: 'workflow-router', marker: M1 },
    { stem: 'workflow-router-p2', marker: M2 },
    { stem: 'workflow-router-p3', marker: M3 }
];

function spawnRouter(stem, payload) {
    const res = spawnSync('node', [path.join(HOOKS, `${stem}.cjs`)], {
        input: JSON.stringify(payload), env: ENV, encoding: 'utf-8', timeout: 30000
    });
    return { stdout: (res.stdout || '').trim(), code: res.status == null ? -1 : res.status };
}

let tmpSeq = 0;
function withTempTranscript(lines, fn) {
    const p = path.join(os.tmpdir(), `ck-catalog-dedup-${process.pid}-${tmpSeq++}.jsonl`);
    fs.writeFileSync(p, lines.join('\n'), 'utf-8');
    try {
        return fn(p);
    } finally {
        try { fs.unlinkSync(p); } catch { /* best-effort */ }
    }
}

// Transcript with no catalog content — every part should treat the catalog as un-injected.
const EMPTY_LINES = Array.from({ length: 6 }, (_, i) => JSON.stringify({ type: 'user', i, text: `noise line ${i}` }));
// Transcript already carrying all 3 catalog markers — every part should dedup (skip).
const PRESENT_LINES = [
    JSON.stringify({ type: 'system', text: 'session start' }),
    M1, M2, M3,
    JSON.stringify({ type: 'user', text: 'follow-up prompt' })
];

// ── TC-HOOKS-040 — session-once dedup across the 3 parts ──────────────────────
const tc040 = [];

// 040a: first injection — each part emits its own marker when no catalog is in the transcript.
for (const { stem, marker } of ROUTERS) {
    tc040.push({
        name: `[TC-HOOKS-040] first injection emits marker — ${stem}`,
        fn: () => withTempTranscript(EMPTY_LINES, tp => {
            const r = spawnRouter(stem, { hook_event_name: 'UserPromptSubmit', prompt: 'do a task', transcript_path: tp });
            assertEqual(r.code, 0, `${stem} must exit 0`);
            assertTrue(r.stdout.includes(marker), `${stem} must emit its catalog marker on first injection`);
        })
    });
}

// 040b: repeat prompt — each part skips when its marker is already in the transcript window.
for (const { stem } of ROUTERS) {
    tc040.push({
        name: `[TC-HOOKS-040] repeat prompt dedups (skips) — ${stem}`,
        fn: () => withTempTranscript(PRESENT_LINES, tp => {
            const r = spawnRouter(stem, { hook_event_name: 'UserPromptSubmit', prompt: 'do a task', transcript_path: tp });
            assertEqual(r.code, 0, `${stem} must exit 0`);
            assertEqual(r.stdout, '', `${stem} must skip when its catalog marker is already present`);
        })
    });
}

// 040c: single source of truth — centralized constants equal their historical strings (byte-lock).
tc040.push({
    name: '[TC-HOOKS-040] centralized markers equal historical strings (single source of truth)',
    fn: () => {
        assertEqual(M1, '## Workflow Catalog', 'WORKFLOW_CATALOG drifted');
        assertEqual(M2, '## Workflow Catalog (continued)', 'WORKFLOW_CATALOG_P2 drifted');
        assertEqual(M3, '## Workflow Catalog (part 3)', 'WORKFLOW_CATALOG_P3 drifted');
    }
});

// ── TC-HOOKS-041 — no catalog re-emit at SessionStart/compact ─────────────────
const tc041 = ROUTERS.map(({ stem }) => ({
    name: `[TC-HOOKS-041] SessionStart emits no catalog (re-emit deferred to next UPS) — ${stem}`,
    fn: () => withTempTranscript(EMPTY_LINES, tp => {
        const r = spawnRouter(stem, { hook_event_name: 'SessionStart', transcript_path: tp });
        assertEqual(r.code, 0, `${stem} must exit 0 on SessionStart`);
        assertEqual(r.stdout, '', `${stem} must not inject the catalog at SessionStart`);
    })
}));

tc041.push({
    name: '[TC-HOOKS-041] post-compact-recovery does not inject the workflow catalog',
    fn: () => {
        const src = fs.readFileSync(path.join(HOOKS, 'post-compact-recovery.cjs'), 'utf-8');
        assertTrue(!src.includes("'## Workflow Catalog'") && !src.includes('"## Workflow Catalog"'),
            'recovery hook must not hardcode-inject the catalog marker (re-emit is the next-UPS dedup path)');
    }
});

// ── TC-HOOKS-042 — anchor-density skip justification ──────────────────────────
const tc042 = [{
    name: '[TC-HOOKS-042] catalog injection block anchor count is low (<=8) — optional trim correctly skipped',
    fn: () => {
        const { buildCatalogInjection } = require(path.join(HOOKS, 'workflow-router.cjs'));
        const { loadWorkflowConfig } = require(path.join(HOOKS, 'lib', 'wr-config.cjs'));
        const block = buildCatalogInjection(loadWorkflowConfig());
        const anchors = (block.match(/MUST ATTENTION|MANDATORY/g) || []).length;
        assertTrue(anchors <= 8, `catalog block anchor count ${anchors} exceeds 8 — re-evaluate the optional trim`);
    }
}];

module.exports = {
    name: 'Workflow Catalog Dedup Markers (Phase 05)',
    tests: [...tc040, ...tc041, ...tc042]
};
