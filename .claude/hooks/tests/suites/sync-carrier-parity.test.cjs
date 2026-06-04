'use strict';
// SYNC carrier parity — canonical ↔ carrier body invariant, expressed as a PROPERTY
// test plus a recorded MUTATION PROBE. This is the framework dogfooding its own
// thesis (specs-as-properties → hard-to-fake tests) on its own highest-value
// invariant, using only Node + the existing extractor lib (no new tooling).
//
// PROPERTY (universal quantification over the WHOLE domain, not one sampled point):
//   ∀ canonical `## SYNC:<tag>` block (excluding `:reminder` variants — see below)
//   and ∀ carrier file under .claude/skills/*/SKILL.md or .claude/agents/*.md that
//   embeds `<!-- SYNC:<tag> -->…<!-- /SYNC:<tag> -->`, the carrier body EQUALS the
//   canonical body (after CRLF/whitespace normalization).
//
// WHY THIS EXISTS: this is the exact failure mode that slipped past every existing
// test last cycle — a single carrier drifting from canonical (the harness-setup
// "optional" vs "forced" stance contradiction). The Python regen oracle
// (verify-sync-divergence) only checks it during `npm run sync:all`; this suite
// promotes it to a first-class, always-run property in the primary hook harness.
//
// MUTATION PROBE (recorded, non-vacuous): the probe test mutates a real carrier
// body in-memory and asserts the parity comparator reports MISMATCH (mutant KILLED),
// and that both extractors fail-closed (null on miss) — so a parser regression can
// never make this suite green by silence.
//
// BOUNDARY FIDELITY: the canonical body is read with the SAME boundary the writer
// (`sync-update-blocks.py read_canonical_block`) uses — stop at `\n---<ws>\n` OR the
// next `\n## SYNC:` — NOT the stricter `\n---\n\n## SYNC:` of extract-sync-block.cjs,
// so a block separated without a blank line cannot over-capture and false-fail.
//
// EXCLUDED (no silent cap): `:reminder` variant tags. `sync-update-blocks.py` skips
// them by design (they are not body-synced), so they may legitimately differ from
// canonical; including them would produce false positives. The exclusion is asserted
// loudly (the tag list is reported), never hidden.
//
// OVERRIDE-SUBSTANCE GUARD (separate property): `<!-- OVERRIDE:<tag> -->` blocks are an
// INTENTIONAL divergence — three review skills copy the review-protocol-injection template
// only to route their fresh-review sub-agent to a domain specialist instead of canonical's
// generic code-reviewer, so they are (correctly) excluded from the equality property and
// untouched by sync-update-blocks.py. But "intentional divergence on routing" must not become
// "silent staleness on substance": the GUARD test pins each OVERRIDE copy to canonical's
// protocol COUNT and every protocol HEADER **and BODY, verbatim** (derived at runtime, never
// hard-coded), allowing only the documented subagent_type/ref-doc customization outside the
// protocol region. This closes the exact gap that let the three copies sit at a stale
// "10 protocols / no Triangulation" after canonical reached 11 — and also catches a protocol
// whose wording silently drifts in a copy, not only one that vanishes entirely.

const fs = require('fs');
const path = require('path');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');

const CANONICAL_PATH = path.join(REPO, '.claude', 'skills', 'shared', 'sync-inline-versions.md');
const SKILLS_DIR = path.join(REPO, '.claude', 'skills');
const AGENTS_DIR = path.join(REPO, '.claude', 'agents');

const canonical = fs.readFileSync(CANONICAL_PATH, 'utf8').replace(/\r\n?/g, '\n');

// Lenient-but-proven normalizer (mirrors protocol-text-parity P5): CRLF→LF, strip
// trailing per-line ws, collapse blank-line runs, trim. Catches wording/stance drift
// while absorbing whitespace variance introduced at marker-insertion time.
const norm = (s) =>
    String(s)
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((l) => l.replace(/\s+$/, ''))
        .join('\n')
        .replace(/\n{2,}/g, '\n')
        .trim();

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Every canonical `## SYNC:<tag>` base+variant header, EXCLUDING `:reminder`.
function canonicalTags() {
    const tags = [...canonical.matchAll(/^## SYNC:([A-Za-z0-9:_-]+)\s*$/gm)].map((m) => m[1]);
    return [...new Set(tags)].filter((t) => !t.endsWith(':reminder'));
}

// Canonical body for a tag, mirroring sync-update-blocks.py read_canonical_block:
// from after the `## SYNC:<tag>` header line up to the next `\n---<ws>\n` OR
// `\n## SYNC:` boundary (or EOF for the final block); surrounding newlines stripped.
// Null when absent. NOTE: string-slice boundary detection on purpose — a regex with
// the `m` flag would make a `$` EOF-alternative match end-of-LINE and truncate the
// body to its first line.
function readCanonicalBody(tag) {
    const headerRe = new RegExp(`^## SYNC:${escapeRe(tag)}[ \\t]*$`, 'm');
    const hm = headerRe.exec(canonical);
    if (!hm) return null;
    const nl = canonical.indexOf('\n', hm.index);
    if (nl === -1) return null;
    const rest = canonical.slice(nl + 1);
    const bound = /\n---[ \t]*\n|\n## SYNC:/.exec(rest);
    const body = bound ? rest.slice(0, bound.index) : rest;
    return body.replace(/^\n+|\n+$/g, '');
}

// Carrier body between <!-- KIND:tag --> and <!-- /KIND:tag --> (KIND = SYNC | OVERRIDE),
// or null on miss. CRITICAL: match only a REAL marker — one alone on its own line — never
// an inline-code MENTION of the marker (e.g. a doc line referencing `<!-- SYNC:tag -->`).
// A naive indexOf matches such mentions and over-captures across unrelated blocks, which
// the authoritative writer (line-anchored) does not.
function extractHtmlMarkedBody(content, kind, tag) {
    const md = String(content).replace(/\r\n?/g, '\n');
    const openRe = new RegExp(`(?:^|\\n)[ \\t]*<!-- ${kind}:${escapeRe(tag)} -->[ \\t]*\\n`);
    const om = openRe.exec(md);
    if (!om) return null;
    const bodyStart = om.index + om[0].length;
    const rest = md.slice(bodyStart);
    const closeRe = new RegExp(`\\n[ \\t]*<!-- /${kind}:${escapeRe(tag)} -->[ \\t]*(?:\\n|$)`);
    const cm = closeRe.exec(rest);
    if (cm === null) return null;
    return rest.slice(0, cm.index).trim();
}

// SYNC carriers are body-synced by sync-update-blocks.py and must EQUAL canonical (property
// above). OVERRIDE carriers are NOT auto-synced — they are an intentional per-skill divergence
// (a review skill routes its fresh-review sub-agent to a domain specialist instead of canonical's
// generic code-reviewer). They are therefore excluded from the equality property, but must not
// silently fall behind canonical's SHARED SUBSTANCE (protocol set + count) — guarded separately below.
const extractHtmlSyncBody = (content, tag) => extractHtmlMarkedBody(content, 'SYNC', tag);
const extractHtmlOverrideBody = (content, tag) => extractHtmlMarkedBody(content, 'OVERRIDE', tag);

function carrierFiles() {
    const out = [];
    for (const d of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
        if (!d.isDirectory()) continue;
        const p = path.join(SKILLS_DIR, d.name, 'SKILL.md');
        if (fs.existsSync(p)) out.push(p);
    }
    for (const f of fs.readdirSync(AGENTS_DIR, { withFileTypes: true })) {
        if (f.isFile() && f.name.endsWith('.md')) out.push(path.join(AGENTS_DIR, f.name));
    }
    return out;
}

const TAGS = canonicalTags();
const CARRIERS = carrierFiles().map((p) => ({
    rel: path.relative(REPO, p).split(path.sep).join('/'),
    text: fs.readFileSync(p, 'utf8'),
}));
const CANON_BODY = new Map(TAGS.map((t) => [t, readCanonicalBody(t)]));

// Full (tag × carrier) domain: every carrier that embeds a tag.
const PAIRS = [];
for (const t of TAGS) {
    for (const c of CARRIERS) {
        const body = extractHtmlSyncBody(c.text, t);
        if (body != null) PAIRS.push({ tag: t, carrier: c.rel, body });
    }
}

// --- OVERRIDE-substance contract (review-protocol-injection) ---------------------
// Canonical's review-protocol-injection template tells a fresh review sub-agent to embed
// N protocol blocks VERBATIM. Three review skills (integration-test-review, review-architecture,
// review-ui) copy that template inside an <!-- OVERRIDE:review-protocol-injection --> block ONLY
// to swap canonical's generic `code-reviewer` for a domain specialist (integration-tester /
// architect / ui-ux-designer). Because OVERRIDE is excluded from the equality property and is
// NOT touched by sync-update-blocks.py, those copies can silently fall behind canonical on the
// SHARED substance — which is exactly how they drifted to a stale "10 protocols / no Triangulation"
// template after canonical advanced to 11. This contract pins that substance (protocol count +
// every protocol header) while permitting only the documented routing/ref-doc customization.
const RPI = 'review-protocol-injection';

// Parse the protocol contract from a review-protocol-injection body AT RUNTIME so future protocol
// additions/count bumps / wording edits are auto-tracked — the guard never hard-codes "11" or any
// protocol text. The protocol region is `### …` blocks bounded by `## Protocols (follow VERBATIM` …
// `## Reference Docs` (the part of the template that MUST be identical across canonical and every
// OVERRIDE copy; only the surrounding Subagent-Type / Agent-Call / Reference-Docs sections may
// diverge for routing). Returns { count, protocols: Map<header, normBody> } or null on parse miss.
// Verifying BODIES (not just headers) is what makes "track canonical substance" honest: a protocol
// whose wording silently drifts in a copy is caught, not only one that vanishes entirely.
function parseProtocolContract(text) {
    if (text == null) return null;
    const t = String(text).replace(/\r\n?/g, '\n');
    const countMatch = /embed (\d+) protocol blocks/.exec(t);
    const start = t.indexOf('## Protocols (follow VERBATIM');
    const end = t.indexOf('## Reference Docs');
    if (start === -1 || end === -1 || end <= start) return null;
    const region = t.slice(start, end);
    const marks = [...region.matchAll(/^### .+$/gm)];
    if (marks.length === 0) return null;
    const protocols = new Map();
    for (let i = 0; i < marks.length; i++) {
        const header = marks[i][0].trim();
        const bodyStart = marks[i].index + marks[i][0].length;
        const bodyEnd = i + 1 < marks.length ? marks[i + 1].index : region.length;
        protocols.set(header, norm(region.slice(bodyStart, bodyEnd)));
    }
    return { count: countMatch ? countMatch[1] : null, protocols };
}

// Every carrier's OVERRIDE:review-protocol-injection body (null = no such block in that file).
const OVERRIDE_CARRIERS = CARRIERS.map((c) => ({
    carrier: c.rel,
    body: extractHtmlOverrideBody(c.text, RPI),
})).filter((o) => o.body != null);

module.exports = {
    name: 'sync-carrier-parity',
    tests: [
        {
            name: 'PROPERTY: every (canonical SYNC tag × carrier) body matches canonical over the full domain',
            fn() {
                assertTrue(TAGS.length > 0, 'no canonical ## SYNC tags parsed — parser broken (fail-closed)');
                assertTrue(PAIRS.length > 0, 'no carrier SYNC embeds parsed — parser broken (fail-closed)');
                const drift = [];
                for (const p of PAIRS) {
                    const canon = CANON_BODY.get(p.tag);
                    if (canon == null) {
                        drift.push(`${p.carrier} embeds <!-- SYNC:${p.tag} --> but canonical has no ## SYNC:${p.tag}`);
                        continue;
                    }
                    if (norm(p.body) !== norm(canon)) {
                        drift.push(`${p.carrier} :: SYNC:${p.tag} body drifted from canonical`);
                    }
                }
                assertEqual(
                    drift.length,
                    0,
                    `carrier↔canonical drift in ${drift.length} pair(s):\n  ${drift.join('\n  ')}\n` +
                        `Fix: py -3 .claude/scripts/sync-update-blocks.py <tag>`
                );
            },
        },
        {
            // Pinned carrier count (no silent cap): review-protocol-injection reaches 13 carriers =
            // 8 review SKILLs (code-review, review-changes, review-artifact, knowledge-review,
            // production-readiness-review, plan-review, why-review, spec-clarify) + 5 review AGENTS
            // (code-reviewer, spec-compliance-reviewer, quality-gate-review, planner, integration-tester).
            // spec-clarify (the post-spec clarification gate) joined as the 8th skill: it runs INLINE for
            // its AskUserQuestion gate but performs the SAME validate→fix→fresh-full-re-review cycle as its
            // review-family peers, so it carries the trio (double-round-trip / fresh-context / protocol-injection)
            // at parity with review-artifact. A 14th appearing — or one vanishing — must surface loudly here
            // rather than quietly widen/narrow the guarded set.
            name: 'COVERAGE: review-protocol-injection reaches all 13 carriers and carries the Triangulation protocol (post-P1)',
            fn() {
                const carriers = PAIRS.filter((p) => p.tag === 'review-protocol-injection');
                assertEqual(carriers.length, 13, `expected 13 review-protocol-injection carriers, found ${carriers.length}`);
                const canon = CANON_BODY.get('review-protocol-injection');
                assertTrue(
                    canon != null && /Spec ↔ Tests ↔ Code Triangulation/.test(canon),
                    'canonical review-protocol-injection is missing the Triangulation protocol'
                );
                const missing = carriers
                    .filter((c) => !/Spec ↔ Tests ↔ Code Triangulation/.test(c.body))
                    .map((c) => c.carrier);
                assertEqual(missing.length, 0, `carriers missing Triangulation protocol after propagation: ${missing.join(', ')}`);
            },
        },
        {
            name: 'GUARD: OVERRIDE:review-protocol-injection blocks track canonical substance (count + every protocol header AND body verbatim), customizing only routing',
            fn() {
                const contract = parseProtocolContract(readCanonicalBody(RPI));
                assertTrue(contract != null, 'canonical review-protocol-injection contract not parsed — parser or canonical broken (fail-closed)');
                assertTrue(contract.count != null, 'canonical protocol-count phrase ("embed N protocol blocks") not found (fail-closed)');
                assertTrue(contract.protocols.size > 0, 'canonical protocol bodies not parsed between "## Protocols" and "## Reference Docs" (fail-closed)');
                assertTrue(
                    contract.protocols.has('### Spec ↔ Tests ↔ Code Triangulation'),
                    'canonical is missing the Triangulation protocol — parser regressed or canonical reverted'
                );
                // Pin the known OVERRIDE carriers (no silent cap): a 4th appearing, or one vanishing,
                // must surface loudly rather than quietly narrow/widen the guarded set.
                assertEqual(
                    OVERRIDE_CARRIERS.length,
                    3,
                    `expected 3 OVERRIDE:${RPI} carriers (integration-test-review, review-architecture, review-ui), found ${OVERRIDE_CARRIERS.length}: ` +
                        `${OVERRIDE_CARRIERS.map((o) => o.carrier).join(', ') || '(none)'}`
                );
                const drift = [];
                for (const o of OVERRIDE_CARRIERS) {
                    const oc = parseProtocolContract(o.body);
                    if (oc == null) {
                        drift.push(`${o.carrier}: OVERRIDE block has no parseable "## Protocols … ## Reference Docs" region`);
                        continue;
                    }
                    if (oc.count !== contract.count) {
                        drift.push(`${o.carrier}: stale protocol count (override = ${oc.count}, canonical = ${contract.count})`);
                    }
                    // Every canonical protocol must be present in the copy with a VERBATIM-matching body.
                    for (const [header, body] of contract.protocols) {
                        if (!oc.protocols.has(header)) {
                            drift.push(`${o.carrier}: missing protocol "${header}"`);
                        } else if (oc.protocols.get(header) !== body) {
                            drift.push(`${o.carrier}: protocol "${header}" body drifted from canonical`);
                        }
                    }
                }
                assertEqual(
                    drift.length,
                    0,
                    `OVERRIDE blocks fell behind canonical substance in ${drift.length} case(s):\n  ${drift.join('\n  ')}\n` +
                        `Fix: hand-merge the missing/changed protocol(s)/count into each <!-- OVERRIDE:${RPI} --> block, ` +
                        `PRESERVING its subagent_type customization (OVERRIDE blocks are intentional divergences — sync-update-blocks.py does NOT touch them).`
                );
            },
        },
        {
            name: 'MUTATION PROBE: a carrier-body mutation is KILLED by the parity comparator (non-vacuous)',
            fn() {
                const sample = PAIRS[0];
                const canon = CANON_BODY.get(sample.tag);
                assertTrue(canon != null, 'sample tag has no canonical body (fail-closed)');
                // Baseline: the live pair matches — the property holds before mutation.
                assertEqual(norm(sample.body), norm(canon), 'baseline parity broken — reconcile drift before trusting the probe');
                // Mutation 1 — append a drift line: MUST be detected (killed).
                assertTrue(
                    norm(sample.body + '\n- injected drift line') !== norm(canon),
                    'append-drift mutant SURVIVED — comparator is vacuous'
                );
                // Mutation 2 — stance flip (the exact class of last cycle's bug): MUST be detected.
                const flipped = canon.replace('NEVER', 'ALWAYS');
                if (flipped !== canon) {
                    assertTrue(norm(flipped) !== norm(canon), 'stance-flip mutant SURVIVED — comparator is vacuous');
                }
                // Mutation 3 — OVERRIDE substance drift: a dropped protocol, a stale count, AND a
                // protocol whose BODY silently drifts MUST all be caught by the GUARD's contract checks.
                const contract = parseProtocolContract(readCanonicalBody(RPI));
                const live = OVERRIDE_CARRIERS[0];
                if (contract != null && contract.protocols.size > 0 && live != null) {
                    const liveContract = parseProtocolContract(live.body);
                    assertTrue(liveContract != null, 'OVERRIDE mutation probe inert — live block has no parseable protocol region');
                    const [header, body] = contract.protocols.entries().next().value;
                    // 3a — drop a whole protocol: the copy no longer has the header.
                    const dropMutant = parseProtocolContract(live.body.split(header).join('### Renamed Away'));
                    assertTrue(dropMutant != null && !dropMutant.protocols.has(header), 'dropped-protocol mutant SURVIVED — OVERRIDE substance check is vacuous');
                    // 3b — drift a protocol body: header stays, normalized body differs from canonical.
                    const driftMutant = parseProtocolContract(live.body.replace(body.split('\n')[0], 'SILENTLY ALTERED FIRST LINE'));
                    if (driftMutant != null && driftMutant.protocols.has(header)) {
                        assertTrue(driftMutant.protocols.get(header) !== contract.protocols.get(header), 'body-drift mutant SURVIVED — OVERRIDE body check is vacuous');
                    }
                    // 3c — stale count.
                    if (contract.count != null) {
                        const countMutant = parseProtocolContract(live.body.split(`embed ${contract.count} protocol blocks`).join('embed 99 protocol blocks'));
                        assertTrue(countMutant != null && countMutant.count !== contract.count, 'stale-count mutant SURVIVED — OVERRIDE count check is vacuous');
                    }
                }
            },
        },
        {
            name: 'GUARD: extractors fail-closed (null on miss; no fail-open)',
            fn() {
                assertTrue(
                    extractHtmlSyncBody('no markers here', 'review-protocol-injection') === null,
                    'carrier extractor must return null on a missing marker'
                );
                assertTrue(readCanonicalBody('definitely-not-a-real-tag-xyz') === null, 'canonical extractor must return null on a missing tag');
            },
        },
    ],
};
