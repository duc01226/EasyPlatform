#!/usr/bin/env node

// Provenance-marker discipline — enforcement sensor for `.claude/docs/architecture-knowledge.md`.
//
// Read-only static verifier. The catalog's provenance convention (legend at the top of the file,
// plus a default-basis banner opening each high-consequence section) tells four consuming skills
// which claims are verified and which are not. That convention is otherwise unenforced, and the
// catalog's own §20 rule says a rule without a fitness function "is a suggestion and will be
// violated within a quarter" — it was violated three times in a single authoring session, which is
// why this sensor exists.
//
// Six assertions, each mapping to an observed real defect:
//   1. DECLARED TAGS ONLY — every `[tag]` marker uses one of the three declared vocabulary terms.
//      A typo'd or invented tag reads as authoritative provenance while matching no rule.
//   2. `— VERIFY` ONLY ON A DECLARED TAG — the suffix means "not checked against a primary source",
//      so it is meaningless floating free of a marker. Legitimacy here is a BLOCK property: only the
//      legend (the preamble, which has to name the token in order to define it) may use it bare.
//      It is NOT a vocabulary property — an earlier draft exempted any line containing the words
//      "marked" or "means", which are ordinary English and exempted almost everything.
//   3. EVERY GUARDED SECTION CARRIES A BANNER — a guarded section without its default-basis banner
//      leaves every row in it silently unattributed.
//   4. NO BANNER ASSERTS A ROW-LEVEL ENUMERATION — a banner that lists which rows are exceptions is
//      a second, hand-maintained mechanism that goes stale the moment a row is added, and that no
//      consuming skill honors (they key on markers, not on banner prose). Enforced structurally, by
//      CLAUSE SCOPE: after an exception keyword, no row title from that section's own table may
//      appear before the clause ends. That separates "MOST rows name a published result (Conway,
//      CAP, …)" — titles illustrating the DEFAULT, ahead of any exception keyword — from "the
//      exception is <row title>". An earlier draft used a fixed 5-phrase blocklist and so enforced
//      only one author's happened-to-be wording.
//   5. `[model-knowledge]` IMPLIES `— VERIFY` — the consuming skills' guard triggers on `— VERIFY`;
//      a bare `[model-knowledge]` marker declares a claim unverified in the catalog's own vocabulary
//      while leaving every consumer guard untripped.
//   6. GUARD-BEARING CONSUMERS STILL CARRY THE TOKEN — checks 2 and 5 are justified by a property of
//      the CONSUMERS ("their guard keys on `— VERIFY`"), so this sensor asserts it instead of
//      assuming it. A consumer is guard-bearing when some line ties this catalog to a guarded
//      section (structural, so no hand-maintained skill list); such a consumer must still contain
//      the literal `— VERIFY` token. A rewording that drops it silently disarms every guard while
//      leaving checks 1-5 green.
//
// Exit non-zero on any violation. Fail-soft if the catalog — or a consuming skill — is absent (warn +
// pass) so a project that copied `.claude` partially cannot break its sync pipeline.

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = process.cwd();

const CATALOG_PATH = path.join('.claude', 'docs', 'architecture-knowledge.md');

// The three markers the legend declares. Any other `[tag]` in marker position is a violation.
export const DECLARED_TAGS = ['textbook', 'vendor-doc', 'model-knowledge'];

// Sections whose claims are high-consequence enough to require provenance (laws quoted as
// authority; data / consistency / messaging rules whose failure mode is data loss or corruption).
// Kept as section NUMBERS, not line numbers, so the sensor survives any re-ordering of the file.
export const GUARDED_SECTIONS = [3, 8, 9, 10];

const BANNER_PREFIX = '> **Provenance — default basis for this section:**';

// A marker token: `[model-knowledge]`, `[vendor-doc: ...]`, `[textbook: ... — VERIFY]`.
// Deliberately narrow — only bracket groups that start with a word+optional-hyphen then `]` or `:`,
// so ordinary prose brackets and markdown links are never scanned as markers.
const MARKER_RE = /\[([a-z][a-z-]*)(:[^\]]*)?\]/g;

// Words that introduce an exception clause. A banner may follow one with a CRITERION ("unless a row
// carries its own marker") but never with a row title. Deliberately broad — a keyword that fires on a
// clean criterion clause costs nothing, since the violation requires a row TITLE inside the clause.
const EXCEPTION_KEYWORDS = [
    'exception', 'exceptions', 'except', 'unless', 'namely', 'specifically',
    'today', 'currently', 'the following', 'these rows', 'apart from', 'other than', 'aside from'
];

// The `> **Consumed by:** ...` preamble line is the declared consumer list — check 6's scope.
const CONSUMED_BY_PREFIX = '> **Consumed by:**';

function normalize(filePath) {
    return filePath.split(path.sep).join('/');
}

/**
 * Split the catalog into sections keyed by their leading number (`## 3. Laws & Theorems` -> 3).
 * Returns a Map<number, {title, startLine, endLine, lines}>.
 */
export function parseSections(content) {
    const lines = content.split(/\r?\n/);
    const headingIndexes = [];

    lines.forEach((line, index) => {
        const match = /^## (\d+)\.\s+(.*)$/.exec(line);
        if (match) {
            headingIndexes.push({ number: Number(match[1]), title: match[2].trim(), index });
        }
    });

    const sections = new Map();
    headingIndexes.forEach((heading, position) => {
        const nextIndex = position + 1 < headingIndexes.length
            ? headingIndexes[position + 1].index
            : lines.length;
        sections.set(heading.number, {
            title: heading.title,
            // 1-indexed line numbers so violation messages match what an editor shows.
            startLine: heading.index + 1,
            endLine: nextIndex,
            lines: lines.slice(heading.index, nextIndex)
        });
    });

    return sections;
}

/** Check 1 + 2 + 5 — marker vocabulary, suffix placement, and the model-knowledge implication. */
export function findMarkerViolations(content) {
    const violations = [];
    const lines = content.split(/\r?\n/);
    const declared = new Set(DECLARED_TAGS);

    // The legend block: everything before the first numbered section heading. This is the ONE place a
    // bare `— VERIFY` is legitimate, because defining the token requires naming it. Scoping by block
    // rather than by phrase is what makes check 2 decidable — see the header note on check 2.
    const firstHeadingOffset = lines.findIndex((line) => /^## /.test(line));
    const legendEndOffset = firstHeadingOffset === -1 ? lines.length : firstHeadingOffset;

    lines.forEach((line, index) => {
        const lineNumber = index + 1;

        // Check 1 — every marker-position `[tag]` is a declared tag.
        for (const match of line.matchAll(MARKER_RE)) {
            const tag = match[1];
            const isMarkerPosition = line.includes(`\`${match[0]}`) || line.includes(`\`[${tag}`);
            if (!isMarkerPosition) continue; // ordinary prose bracket, not a provenance marker
            if (!declared.has(tag)) {
                violations.push(
                    `${CATALOG_PATH}:${lineNumber}: marker \`[${tag}]\` is not a declared tag ` +
                    `(expected one of: ${DECLARED_TAGS.join(', ')})`
                );
            }
        }

        // Check 5 — a `[model-knowledge]` marker must carry the `— VERIFY` suffix, because the
        // consuming skills' guard triggers on `— VERIFY`, never on the tag name.
        if (line.includes('[model-knowledge]') && !line.includes('[model-knowledge] — VERIFY')) {
            violations.push(
                `${CATALOG_PATH}:${lineNumber}: bare \`[model-knowledge]\` marker — must be ` +
                `\`[model-knowledge] — VERIFY\` so the consuming skills' \`— VERIFY\` guard fires`
            );
        }

        // Check 2 — a `— VERIFY` suffix must attach to a declared marker, not float free.
        if (line.includes('— VERIFY')) {
            const attachesToMarker = DECLARED_TAGS.some(
                (tag) => line.includes(`[${tag}] — VERIFY`) || new RegExp(`\\[${tag}:[^\\]]*— VERIFY\\]`).test(line)
            );
            // The legend documents the vocabulary, so it names the forms without using them. Every
            // other line must attach the suffix to a marker — no word or phrase buys an exemption.
            const isInLegendBlock = index < legendEndOffset;
            if (!attachesToMarker && !isInLegendBlock) {
                violations.push(
                    `${CATALOG_PATH}:${lineNumber}: \`— VERIFY\` does not attach to a declared marker ` +
                    `(expected \`[<tag>] — VERIFY\` or \`[<tag>: … — VERIFY]\`)`
                );
            }
        }
    });

    return violations;
}

/**
 * Row titles of a section's own table — the first cell of every row AFTER the `| --- |` separator, so
 * the header row ("Law", "Statement", "Use") is never mistaken for a title. Extracted structurally, so
 * adding a row extends the check automatically instead of aging a hand-maintained list.
 */
export function extractRowTitles(sectionLines) {
    const separatorOffset = sectionLines.findIndex((line) => /^\|[\s|:-]+\|\s*$/.test(line));
    if (separatorOffset === -1) return [];

    const titles = [];
    for (const line of sectionLines.slice(separatorOffset + 1)) {
        const match = /^\|([^|]+)\|/.exec(line);
        if (!match) continue;
        const title = match[1].replace(/\*\*/g, '').replace(/`/g, '').trim();
        if (title) titles.push(title);
    }
    return titles;
}

const escapeForRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Check 4's core predicate. For each exception keyword in the banner, take the clause it opens (up to
 * the next sentence boundary) and report any row title named inside it. Returns the offending titles.
 *
 * Clause scope is what makes this decidable: §3's banner legitimately names ~15 laws to illustrate its
 * DEFAULT, but that list sits BEFORE any exception keyword, so it is never scanned. A banner that says
 * "the exception is <row title>" puts the title INSIDE the clause and fails — regardless of wording.
 */
export function findEnumeratedRowTitles(bannerLine, rowTitles) {
    const found = new Set();
    const lower = bannerLine.toLowerCase();

    for (const keyword of EXCEPTION_KEYWORDS) {
        let searchFrom = 0;
        for (;;) {
            const keywordAt = lower.indexOf(keyword, searchFrom);
            if (keywordAt === -1) break;
            searchFrom = keywordAt + keyword.length;

            // The clause runs from the keyword to the next sentence boundary (`.` or `;`). Commas are
            // NOT boundaries — an enumeration is comma-separated, so stopping there would miss it.
            const rest = bannerLine.slice(searchFrom);
            const boundary = /[.;]/.exec(rest);
            const clause = boundary ? rest.slice(0, boundary.index) : rest;

            for (const title of rowTitles) {
                if (new RegExp(`\\b${escapeForRegExp(title)}`).test(clause)) found.add(title);
            }
        }
    }

    return [...found];
}

/** Check 3 + 4 — banner presence per guarded section, and no row-level enumeration inside a banner. */
export function findBannerViolations(content) {
    const violations = [];
    const sections = parseSections(content);

    for (const sectionNumber of GUARDED_SECTIONS) {
        const section = sections.get(sectionNumber);
        if (!section) {
            violations.push(
                `${CATALOG_PATH}: guarded section §${sectionNumber} not found — the provenance ` +
                `convention declares §${GUARDED_SECTIONS.join('/§')} as requiring a default-basis banner`
            );
            continue;
        }

        const bannerOffset = section.lines.findIndex((line) => line.startsWith(BANNER_PREFIX));
        if (bannerOffset === -1) {
            violations.push(
                `${CATALOG_PATH}:${section.startLine}: guarded section §${sectionNumber} ` +
                `("${section.title}") has no default-basis banner — every row in it reads as ` +
                `unattributed authority`
            );
            continue;
        }

        // Check 4 — the banner must state a CRITERION, never enumerate which rows are exceptions.
        // A hand-maintained row list is a second mechanism: it goes stale on the next row added,
        // and no consuming skill reads banner prose (they key on markers).
        const bannerLine = section.lines[bannerOffset];
        const enumerated = findEnumeratedRowTitles(bannerLine, extractRowTitles(section.lines));
        if (enumerated.length > 0) {
            violations.push(
                `${CATALOG_PATH}:${section.startLine + bannerOffset}: §${sectionNumber} banner ` +
                `enumerates row-level exceptions (${enumerated.map((t) => `"${t}"`).join(', ')}) — state ` +
                `the CRITERION and mark those rows inline instead; a hand-maintained list goes stale on ` +
                `the next row added and no consuming skill reads banner prose`
            );
        }
    }

    return violations;
}

/** The skills named in the catalog's `> **Consumed by:**` preamble line. */
export function parseConsumers(content) {
    const consumedByLine = content
        .split(/\r?\n/)
        .find((line) => line.startsWith(CONSUMED_BY_PREFIX));
    if (!consumedByLine) return [];
    return [...consumedByLine.matchAll(/`([a-z][a-z0-9-]*)`/g)].map((match) => match[1]);
}

/**
 * A consumer is GUARD-BEARING when one of its lines ties this catalog to a guarded section — that is
 * what a provenance guard looks like structurally. Detected per line (not per file) so a skill that
 * merely mentions the catalog elsewhere, or that mentions `§3` of an unrelated document, is not caught:
 * `architecture-review-full` is exactly that case (its catalog pointers target §20, and its `§3/§4/§8`
 * hits are Feature Spec sections).
 */
function isGuardBearing(skillBody) {
    const guarded = new RegExp(`§(?:${GUARDED_SECTIONS.join('|')})\\b`);
    return skillBody
        .split(/\r?\n/)
        .some((line) => line.includes('architecture-knowledge') && guarded.test(line));
}

/**
 * Check 6 — every guard-bearing consumer still carries the literal `— VERIFY` token.
 *
 * `readSkill(name)` returns the skill body, or null when it cannot be read (then the consumer is
 * skipped — same fail-soft policy as an absent catalog, so a partial `.claude` copy still syncs).
 */
export function findConsumerViolations(content, readSkill) {
    const violations = [];

    for (const skillName of parseConsumers(content)) {
        const body = readSkill(skillName);
        if (body === null || body === undefined) continue; // fail-soft: consumer not present
        if (!isGuardBearing(body)) continue; // no provenance guard to keep — nothing to assert
        if (body.includes('— VERIFY')) continue;

        violations.push(
            `.claude/skills/${skillName}/SKILL.md: consumer references ${normalize(CATALOG_PATH)} ` +
            `§${GUARDED_SECTIONS.join('/§')} but no longer contains the literal \`— VERIFY\` token — ` +
            `the catalog's markers are inert without it, so a reworded guard silently disarms every ` +
            `provenance rule while the catalog itself still passes`
        );
    }

    return violations;
}

async function main() {
    const catalogPath = path.join(rootDir, CATALOG_PATH);
    const content = await fs.readFile(catalogPath, 'utf8').catch(() => null);

    if (content === null) {
        // Fail-soft: a project that copied `.claude` without the architecture docs still syncs.
        console.warn(
            `[codex-verify-provenance-markers] WARN: cannot read ${normalize(CATALOG_PATH)} — skipped`
        );
        console.log('[codex-verify-provenance-markers] PASS (catalog absent)');
        return;
    }

    const readSkill = (skillName) => {
        const skillPath = path.join(rootDir, '.claude', 'skills', skillName, 'SKILL.md');
        try {
            return fsSync.readFileSync(skillPath, 'utf8');
        } catch {
            return null;
        }
    };

    const failures = [
        ...findMarkerViolations(content),
        ...findBannerViolations(content),
        ...findConsumerViolations(content, readSkill)
    ];

    if (failures.length > 0) {
        console.error('[codex-verify-provenance-markers] FAIL');
        for (const failure of failures) {
            console.error(`- ${failure}`);
        }
        process.exitCode = 1;
        return;
    }

    console.log('[codex-verify-provenance-markers] PASS');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    await main();
}
