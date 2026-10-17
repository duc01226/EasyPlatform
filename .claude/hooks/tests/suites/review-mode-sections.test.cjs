/**
 * Review mode transport guards (TC-PDL-043/044/045/046/064).
 * Live review entrypoints retain official guide fallbacks and role reminders;
 * full/fix-loop sections load only at mode entry. Route-only full-mode sections
 * live in one route reference each; the always-read core points at every route
 * reference with a BLOCKING read inside its decision section and the router names
 * it with a read-when, so no reference file is unreachable or undeclared. Terminal
 * findings validation selects its own complete reference and never loads
 * full/fix-loop-only actions.
 * Explicit full-body exception fixtures remain supported by the generic checkers.
 * The one canonical reviewer template remains byte-equal, contains all 11 full
 * bodies, and is copied WHOLESALE by both review callers; guides never replace
 * the emitted prompt's bodies. Fixture negative cases and pinned suite execution
 * protect each invariant. Live checks remain framework-repo guarded; child runs
 * use the existing isolated/scrubbed portable environment.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { childEnv, removeTempDir } = require('../lib/hook-runner.cjs');
const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const { extractSyncBody, normalizeEol } = require('../../../scripts/lib/extract-sync-block.cjs');

const HOOKS_DIR = path.resolve(__dirname, '..', '..');
const CLAUDE_DIR = path.resolve(HOOKS_DIR, '..');
const REPO_ROOT = path.resolve(CLAUDE_DIR, '..');
const SKILLS_DIR = path.join(CLAUDE_DIR, 'skills');
const SPAWN_TIMEOUT_MS = 300000;

// Computed synchronously at load: the runner reads `skip` before it runs a test.
const LIVE_SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own review skills (framework-repo signal)';

// ── why-review split contract ────────────────────────────────────────────────────────────────────
const WHY_REVIEW = {
    guided: true,
    terminalReference: true,
    // The recursion guard and terminal-only route load with the router; the validator loads on its mode.
    routerPhrases: [
        'read `references/validate-findings.md` in full',
        '> **Recursion guard (NON-NEGOTIABLE):**',
        '`validate-findings` beats `--fix-loop`',
    ],
    // Full-mode sections that live in references/full-mode.md, never in the router.
    movedHeadings: [
        '## Review plan and tasks',
        '## Adversarial Review Mindset',
        '## Trade-Off Interrogation Gate',
        '## Target Resolution',
        '## Validation Checklist',
        '## Residual Risk Gate',
        '## Output Format',
        '## Round 2: Adversarial Re-Review',
        '## Report Closure Contract',
        '## Findings Validation Gate',
    ],
    // Route-only sections: each lives in exactly one route reference (never in the router or the
    // always-read core), and full-mode.md points at the file from the named decision section.
    routeReferences: {
        'code-change-path.md': {
            sections: ['Code-Change Review Path', 'Integration-Test-Review Linkage'],
            pointerSection: '## Target Resolution',
        },
    },
    // Every protocol block why-review carried before the split (base protocols become guides; reminder bodies remain).
    syncTags: [
        'end-to-start-debugger-trace', 'behavioral-delta-matrix', 'cross-stack-impact-trace', 'cross-service-check',
        'task-tracking-external-report', 'sequential-thinking-protocol',
        'evidence-based-reasoning', 'review-protocol-injection', 'graph-impact-analysis', 'severity-rubric',
        'goal-contract-satisfaction-loop', 'trade-off-interrogation-gate', 'review-principle-awareness',
        'task-tracking-external-report:reminder',
        'cross-stack-impact-trace:reminder', 'cross-service-check:reminder',
        'end-to-start-debugger-trace:reminder', 'goal-contract-satisfaction-loop:reminder', 'severity-rubric:reminder',
        'trade-off-interrogation-gate:reminder',
        'review-principle-awareness:reminder',
        'sequential-thinking-protocol:reminder',
    ],
};

const FIX_LOOP_START = '<!-- FIX-LOOP-MODE:START -->';
const FIX_LOOP_END = '<!-- FIX-LOOP-MODE:END -->';
const POINTER_HEADING = '## Mode References';
const FIRST_READ = /FIRST action after mode detection is to read `references\/full-mode\.md` in full \(BLOCKING\)/;

const lf = text => String(text).replace(/\r\n?/g, '\n');
const stripSync = text => text.replace(/<!-- SYNC:([^\s>]+) -->[\s\S]*?<!-- \/SYNC:\1 -->/g, '');
const count = (text, needle) => text.split(needle).length - 1;
const headingLines = (text, prefix) => text.split('\n').filter(line => line === prefix || line.startsWith(`${prefix} `) || line.startsWith(`${prefix}(`) || line.startsWith(`${prefix}:`));
// The references a review router always declares by mode; any other reference must be a declared route reference.
const MODE_REFERENCES = ['full-mode.md', 'fix-loop.md', 'validate-findings.md'];
/** Heading lines that carry `title` at ANY level, so a section copied back at another level is still found. */
const titledHeadings = (text, title) => text.split('\n').filter(line => {
    const match = line.match(/^#{1,6} (.*)$/);
    return Boolean(match) && (match[1] === title || match[1].startsWith(`${title} `) || match[1].startsWith(`${title}(`) || match[1].startsWith(`${title}:`));
});
/** The text of the second-level section that starts with `heading`, up to the next second-level heading. */
function sectionOf(text, heading) {
    const lines = text.split('\n');
    const start = lines.findIndex(line => line === heading || line.startsWith(`${heading} `));
    if (start < 0) return '';
    const next = lines.findIndex((line, index) => index > start && line.startsWith('## '));
    return lines.slice(start, next < 0 ? undefined : next).join('\n');
}
/** Lines that make reading `references/<name>` in full a BLOCKING action. */
const blockingReads = (text, name) => text.split('\n').filter(line => line.includes('**[BLOCKING]**') && line.includes(`read \`references/${name}\` in full`));

/** Read a skill directory as { router, references: { 'full-mode.md': text, ... } }, LF line endings. */
function loadSkill(dir) {
    const refsDir = path.join(dir, 'references');
    const references = {};
    if (fs.existsSync(refsDir)) {
        for (const name of fs.readdirSync(refsDir).filter(entry => entry.endsWith('.md')).sort()) {
            references[name] = lf(fs.readFileSync(path.join(refsDir, name), 'utf8'));
        }
    }
    return { router: lf(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8')), references };
}

/** TC-PDL-043 rule: returns one problem line per broken clause of the router/reference split. */
function checkRouterSplit(skill, spec) {
    const problems = [];
    const { router, references } = skill;
    for (const phrase of spec.routerPhrases) {
        if (!router.includes(phrase)) problems.push(`router lacks: ${phrase}`);
    }
    const localRouter = stripSync(router);
    const refText = Object.values(references).join('\n');
    const fullMode = references['full-mode.md'] ?? '';
    for (const heading of spec.movedHeadings) {
        if (headingLines(localRouter, heading).length > 0) problems.push(`router still holds the moved section: ${heading}`);
        if (headingLines(fullMode, heading).length !== 1) problems.push(`references/full-mode.md must hold exactly one: ${heading}`);
    }
    if (spec.routeReferences) {
        const routerPointers = sectionOf(localRouter, POINTER_HEADING);
        for (const [name, route] of Object.entries(spec.routeReferences)) {
            const routeText = references[name];
            if (routeText === undefined) {
                problems.push(`route reference is missing: references/${name}`);
                continue;
            }
            for (const title of route.sections) {
                if (headingLines(routeText, `## ${title}`).length !== 1) problems.push(`references/${name} must hold exactly one: ## ${title}`);
                if (titledHeadings(fullMode, title).length > 0) problems.push(`references/full-mode.md still holds the route section: ${title}`);
                if (titledHeadings(localRouter, title).length > 0) problems.push(`router still holds the route section: ${title}`);
            }
            // Reachability: the always-read core names the file with a BLOCKING read at its decision point,
            // and the entry file names it with a read-when.
            if (blockingReads(sectionOf(fullMode, route.pointerSection), name).length === 0) {
                problems.push(`references/full-mode.md must point at references/${name} with a BLOCKING read inside ${route.pointerSection}`);
            }
            if (!routerPointers.includes(`\`references/${name}\` — read in full when `)) {
                problems.push(`router ${POINTER_HEADING} must name references/${name} with its read-when`);
            }
        }
        for (const name of Object.keys(references)) {
            if (!MODE_REFERENCES.includes(name) && !(name in spec.routeReferences)) {
                problems.push(`undeclared reference (declare its sections and pointer): references/${name}`);
            }
        }
    }
    if (spec.terminalReference) {
        const terminal = references['validate-findings.md'] ?? '';
        const heading = '## Findings Validation Routine (validate-findings mode body — TERMINAL)';
        if (headingLines(localRouter, heading).length) problems.push('router still holds the terminal validator body');
        if (headingLines(terminal, heading).length !== 1) problems.push('terminal reference lacks the one Findings Validation Routine');
        for (const phrase of ['do NOT call `/why-review`', 'do NOT spawn sub-agent', 'do NOT create closing task', '≥85%', '**Dual-feedback', 'Caller owns reconciliation']) {
            if (!terminal.includes(phrase)) problems.push(`terminal validator lacks: ${phrase}`);
        }
        if (/^## (?:Bind the Self|Task Bootstrap|Next Steps|Fix-Loop Mode)/m.test(terminal)) problems.push('terminal reference contains full/fix-loop-only sections');
        const dispatch = router.split('\n').find(line => line.startsWith('| **validate-findings**')) || '';
        if (!/Read only the terminal validator reference/.test(dispatch) || !/TERMINAL/.test(dispatch)) {
            problems.push('terminal mode must select only its validator reference');
        }
    }
    if (/^## Fix-Loop Mode/m.test(localRouter)) problems.push('router still holds a `## Fix-Loop Mode` section');
    const fixLoop = references['fix-loop.md'] ?? '';
    if (spec.terminalReference) {
        if (!/review-policy/.test(fixLoop) || !/freshly review/.test(fixLoop)) {
            problems.push('fix-loop reference must retain shared policy and fresh review');
        }
    } else if (count(fixLoop, FIX_LOOP_START) !== 1 || count(fixLoop, FIX_LOOP_END) !== 1) {
        problems.push('fixture fix-loop reference must retain its declared markers');
    }
    for (const tag of spec.syncTags) {
        if (spec.guided && !tag.endsWith(':reminder')) {
            if (count(router, `- \`${tag}\` —`) !== 1 || !router.includes(`→ .claude/skills/shared/protocols/${tag}.md`)) problems.push(`router must carry exactly one guide with full-source fallback for ${tag}`);
            if (count(router, `<!-- SYNC:${tag} -->`)) problems.push(`router carries retired full SYNC:${tag} body`);
        } else if (count(router, `<!-- SYNC:${tag} -->`) !== 1 || count(router, `<!-- /SYNC:${tag} -->`) !== 1) {
            problems.push(`router must carry exactly one SYNC:${tag} block`);
        }
    }
    if (/<!-- \/?SYNC:/.test(refText)) problems.push('a reference carries a SYNC block (these mode references carry only local mode instructions)');
    return problems;
}

/** TC-PDL-044 rule: full mode's first action is the read of references/full-mode.md. */
function checkFirstRead(skill) {
    const problems = [];
    const local = stripSync(skill.router);
    const h2 = local.split('\n').filter(line => line.startsWith('## '));
    const modeIndex = h2.findIndex(line => line.startsWith('## Review Mode'));
    if (modeIndex < 0 || !(h2[modeIndex + 1] || '').startsWith(POINTER_HEADING)) {
        problems.push(`the first section after mode detection must be ${POINTER_HEADING}`);
    }
    const start = local.indexOf(`\n${POINTER_HEADING}`);
    const end = start < 0 ? -1 : local.indexOf('\n## ', start + 1);
    const pointer = start < 0 ? '' : local.slice(start, end < 0 ? undefined : end);
    if (!FIRST_READ.test(pointer)) problems.push('the pointer section does not make the reference read the BLOCKING first action');
    if (!/^- \*\*STEP 2 — FULL-MODE FIRST ACTION(?::)?\*\* (?:→ |: )?read `references\/full-mode\.md` in full(?: \(BLOCKING|, then plan|, then bind)/m.test(local)) {
        problems.push('the Quick Summary STEP 2 does not start with the reference read');
    }
    const firstRefHeading = (skill.references['full-mode.md'] || '').split('\n').find(line => line.startsWith('## ') && !/^## (Quick Summary|Contents)$/.test(line)) || '';
    if (!firstRefHeading.startsWith('## Review plan and tasks')) {
        problems.push('references/full-mode.md must open with the review plan and tasks (the first action after the read)');
    }
    return problems;
}

// ── fix-loop split contract (changes-review, workflow-review-changes) ──────────────────────────────
const FIX_LOOP_POINTER_HEADING = '## `--fix-loop` Mode — Read `references/fix-loop.md` First (BLOCKING)';
const FIX_LOOP_FIRST_READ = /read `references\/fix-loop\.md` in full (?:FIRST|before Step 0) \(BLOCKING\)/;
const FIX_LOOP_SPLITS = {
    'changes-review': {
        guided: true,
        concise: true,
        modeHeading: '## Mode: Fix-Loop (`--fix-loop`)',
        // Every protocol block the skill carried before the split (none sat in the moved range).
        syncTags: [
            'review-policy', 'cross-stack-impact-trace', 'cross-service-check', 'systematic-review-batching',
            'end-to-start-debugger-trace', 'sequential-thinking-protocol',
            'understand-code-first', 'design-patterns-quality', 'complexity-prevention', 'review-protocol-injection', 'logic-and-intention-review', 'bug-detection',
            'test-spec-verification', 'integration-test-sync-check', 'translation-sync-check',
            'category-review-thinking', 'graph-assisted-investigation', 'task-tracking-external-report', 'source-test-drift-check',
            'spec-drift-adjudication', 'severity-rubric', 'goal-contract-satisfaction-loop',
            'trade-off-interrogation-gate', 'domain-entity-change-gate', 'design-review-checklist',
            'review-principle-awareness',
            'domain-entity-change-gate:reminder', 'understand-code-first:reminder', 'evidence-based-reasoning:reminder',
            'design-patterns-quality:reminder', 'complexity-prevention:reminder', 'graph-assisted-investigation:reminder',
            'logic-and-intention-review:reminder', 'bug-detection:reminder', 'test-spec-verification:reminder',
            'integration-test-sync-check:reminder', 'translation-sync-check:reminder', 'cross-stack-impact-trace:reminder',
            'cross-service-check:reminder', 'sequential-thinking-protocol:reminder',
            'task-tracking-external-report:reminder',
            'end-to-start-debugger-trace:reminder',
            'goal-contract-satisfaction-loop:reminder',
            'systematic-review-batching:reminder', 'severity-rubric:reminder', 'category-review-thinking:reminder',
            'trade-off-interrogation-gate:reminder',
            'design-review-checklist:reminder', 'review-principle-awareness:reminder',
        ],
    },
    'workflow-review-changes': {
        guided: true,
        concise: true,
        modeHeading: '## Mode: `--fix-loop` (OPTIONAL outer convergence loop)',
        syncTags: [
            'review-policy', 'parallel-phase-advancement', 'end-to-start-debugger-trace', 'incremental-persistence', 'subagent-return-contract', 'task-tracking-external-report',
            'goal-contract-satisfaction-loop', 'trade-off-interrogation-gate', 'severity-rubric', 'session-goal-ledger', 'workflow-registry-binding',
            'task-tracking-external-report:reminder',
            'end-to-start-debugger-trace:reminder', 'goal-contract-satisfaction-loop:reminder', 'trade-off-interrogation-gate:reminder',
            'severity-rubric:reminder',
            'session-goal-ledger:reminder',
        ],
    },
};

/** TC-PDL-046 rule: the fix-loop mode lives in references/fix-loop.md; SKILL.md points at it and retains guide fallbacks plus role reminders. */
function checkFixLoopSplit(skill, spec) {
    const problems = [];
    const { router, references } = skill;
    const local = stripSync(router);
    if (/^## Mode: (?:Fix-Loop|`--fix-loop`)/m.test(local)) problems.push('SKILL.md still holds the fix-loop mode section');
    if (local.includes(FIX_LOOP_START) || local.includes(FIX_LOOP_END)) problems.push('SKILL.md still holds a FIX-LOOP-MODE block');
    if (spec.concise) {
        if (!router.includes('references/fix-loop.md')) problems.push('router lacks its fix-loop reference');
    } else {
    const pointers = local.split('\n').filter(line => line === FIX_LOOP_POINTER_HEADING);
    if (pointers.length !== 1) {
        problems.push(`SKILL.md must hold exactly one pointer section: ${FIX_LOOP_POINTER_HEADING}`);
    } else {
        const start = local.indexOf(`\n${FIX_LOOP_POINTER_HEADING}`);
        const end = local.indexOf('\n## ', start + 1);
        if (!FIX_LOOP_FIRST_READ.test(local.slice(start, end < 0 ? undefined : end))) {
            problems.push('the pointer section does not make the reference read the BLOCKING first action');
        }
    }
    }
    for (const tag of spec.syncTags) {
        if (spec.guided && !tag.endsWith(':reminder')) {
            if (count(router, `- \`${tag}\` —`) !== 1 || !router.includes(`→ .claude/skills/shared/protocols/${tag}.md`)) problems.push(`SKILL.md must carry exactly one guide with full-source fallback for ${tag}`);
            if (count(router, `<!-- SYNC:${tag} -->`)) problems.push(`SKILL.md carries retired full SYNC:${tag} body`);
        } else if (count(router, `<!-- SYNC:${tag} -->`) !== 1 || count(router, `<!-- /SYNC:${tag} -->`) !== 1) {
            problems.push(`SKILL.md must carry exactly one SYNC:${tag} block`);
        }
    }
    const fixLoop = references['fix-loop.md'] ?? '';
    if (spec.concise) {
        for (const phrase of ['review-policy', 'freshly review', 'original pre-review snapshot', 'Never reconstruct']) {
            if (!fixLoop.includes(phrase)) problems.push(`fix-loop reference lacks: ${phrase}`);
        }
    } else {
    const open = fixLoop.indexOf(FIX_LOOP_START);
    const close = fixLoop.indexOf(FIX_LOOP_END);
    if (count(fixLoop, FIX_LOOP_START) !== 1 || count(fixLoop, FIX_LOOP_END) !== 1 || open > close) {
        problems.push('references/fix-loop.md must hold exactly one FIX-LOOP-MODE:START … END block');
    } else if (headingLines(fixLoop.slice(open, close), spec.modeHeading).length !== 1) {
        problems.push(`the FIX-LOOP-MODE block must hold the mode section: ${spec.modeHeading}`);
    }
    }
    if (/<!-- \/?SYNC:/.test(Object.values(references).join('\n'))) problems.push('a reference carries a SYNC block (these mode references carry only local mode instructions)');
    return problems;
}

// ── reviewer-injection template (one generated file) ─────────────────────────────────────────────
const INJECTION_TAG = 'review-protocol-injection';
const INJECTION_FILE = '.claude/skills/shared/protocols/review-protocol-injection.md';
const INJECTION_SECTIONS = 11;
const MIN_SECTION_BODY_CHARS = 200;

/** Inner text of a carrier's `<!-- SYNC:tag -->` block, trimmed; null when absent. */
function carrierBody(text, tag) {
    const open = `<!-- SYNC:${tag} -->`;
    const start = text.indexOf(open);
    const end = text.indexOf(`<!-- /SYNC:${tag} -->`, start + 1);
    return start < 0 || end < 0 ? null : text.slice(start + open.length, end).trim();
}

/** TC-PDL-064 rule: the template file equals canonical, embeds 11 full bodies, and both spawn steps copy it WHOLESALE. */
function checkInjectionTemplate({ canonical, projection, workflowRouter, changesRouter }) {
    const problems = [];
    const body = extractSyncBody(canonical, INJECTION_TAG);
    if (!body) return [`canonical has no SYNC:${INJECTION_TAG} block`];
    const template = normalizeEol(projection);
    if (template !== `${body}\n`) problems.push(`${INJECTION_FILE} does not byte-match the canonical SYNC:${INJECTION_TAG} body`);
    const start = template.indexOf('\n## Protocols');
    const end = start < 0 ? -1 : template.indexOf('\n## Reference Docs', start + 1);
    if (start < 0 || end < 0) {
        problems.push('the template lacks its `## Protocols` … `## Reference Docs` region');
    } else {
        const sections = template.slice(start, end).split(/\n(?=### )/).slice(1);
        if (sections.length !== INJECTION_SECTIONS) problems.push(`the template holds ${sections.length} protocol sections, expected ${INJECTION_SECTIONS}`);
        for (const section of sections) {
            const [heading, ...rest] = section.split('\n');
            const text = rest.join('\n').trim();
            const pathOnly = /^(?:read |see )?`?[^\s`]+\.md`?\.?$/i.test(text);
            if (pathOnly || text.length < MIN_SECTION_BODY_CHARS) problems.push(`protocol section is not a full body: ${heading}`);
        }
    }
    for (const [name, router] of [['workflow-review-changes', workflowRouter], ['changes-review', changesRouter]]) {
        const local = stripSync(normalizeEol(router));
        if (count(local, `- \`${INJECTION_TAG}\` —`) !== 1 || !local.includes(`→ ${INJECTION_FILE}`)) {
            problems.push(`${name}: no canonical full-template fallback`);
        }
    }
    if (!/VERBATIM/.test(template.split('\n\n')[0]) || !/WHOLESALE/.test(template.split('\n\n')[0])) problems.push('canonical template must require VERBATIM WHOLESALE dispatch');
    return problems;
}

// ── fixture skill (rule rows) ────────────────────────────────────────────────────────────────────
const FIXTURE_SPEC = {
    routerPhrases: ['## Findings Validation Routine (validate-findings mode body — TERMINAL)', '> **Recursion guard (NON-NEGOTIABLE):**'],
    movedHeadings: ['## Review plan and tasks', '## Adversarial Review Mindset'],
    syncTags: ['severity-rubric', 'severity-rubric:reminder'],
};

function fixtureFiles() {
    return {
        'SKILL.md': [
            '---', 'name: fixture-review', "description: 'Fixture.'", '---', '',
            '## Quick Summary', '',
            '- **STEP 2 — FULL-MODE FIRST ACTION** → read `references/full-mode.md` in full (BLOCKING), then bind the loop.', '',
            '## Review Mode (DETECT FIRST)', '',
            '> **Recursion guard (NON-NEGOTIABLE):** validate-findings is terminal.', '',
            '## Mode References (read at point of use — BLOCKING)', '',
            '- **Full mode (default):** your FIRST action after mode detection is to read `references/full-mode.md` in full (BLOCKING).', '',
            '## Findings Validation Routine (validate-findings mode body — TERMINAL)', '',
            'Validate each finding.', '',
            '<!-- SYNC:severity-rubric -->', '> Rubric body.', '<!-- /SYNC:severity-rubric -->', '',
            '<!-- SYNC:severity-rubric:reminder -->', '- Rubric reminder.', '<!-- /SYNC:severity-rubric:reminder -->', '',
        ].join('\n'),
        'references/full-mode.md': [
            '# Fixture — Full Mode', '',
            '## Review plan and tasks (FIRST ACTION)', '', 'Bind it.', '',
            '## Adversarial Review Mindset', '', 'Be a skeptic.', '',
        ].join('\n'),
        'references/fix-loop.md': [
            '# Fixture — Fix-Loop Mode', '', FIX_LOOP_START, '', '## Fix-Loop Mode (`--fix-loop` — fixture)', '', 'Loop.', '', FIX_LOOP_END, '',
        ].join('\n'),
    };
}

// The same fixture with one route reference: its section, the core's BLOCKING pointer and the router's read-when.
const FIXTURE_ROUTE_SPEC = {
    ...FIXTURE_SPEC,
    routeReferences: { 'route-a.md': { sections: ['Route A Steps'], pointerSection: '## Review plan and tasks' } },
};
const FIXTURE_ROUTE_POINTER = '- **[BLOCKING]** When the target takes route A, read `references/route-a.md` in full FIRST; it owns the Route A Steps.';
const FIXTURE_ROUTE_READ_WHEN = '    - `references/route-a.md` — read in full when the target takes route A.';

function routeFixtureFiles() {
    const files = fixtureFiles();
    files['SKILL.md'] = files['SKILL.md'].replace(
        'read `references/full-mode.md` in full (BLOCKING).\n\n## Findings Validation Routine',
        `read \`references/full-mode.md\` in full (BLOCKING).\n${FIXTURE_ROUTE_READ_WHEN}\n\n## Findings Validation Routine`,
    );
    files['references/full-mode.md'] = files['references/full-mode.md'].replace('Bind it.\n', `Bind it.\n\n${FIXTURE_ROUTE_POINTER}\n`);
    files['references/route-a.md'] = ['# Fixture — Route A', '', '## Route A Steps', '', 'Walk route A.', ''].join('\n');
    return files;
}

const FIXTURE_FIX_LOOP_SPEC = {
    modeHeading: '## Mode: Fix-Loop (`--fix-loop`)',
    syncTags: ['severity-rubric', 'severity-rubric:reminder'],
};

function fixLoopFixtureFiles() {
    return {
        'SKILL.md': [
            '---', 'name: fixture-review', "description: 'Fixture.'", '---', '',
            '## Review Scope', '', 'The diff.', '',
            FIX_LOOP_POINTER_HEADING, '',
            'When the flag is present, read `references/fix-loop.md` in full FIRST (BLOCKING).', '',
            '## Next Steps', '', 'Done.', '',
            '<!-- SYNC:severity-rubric -->', '> Rubric body.', '<!-- /SYNC:severity-rubric -->', '',
            '<!-- SYNC:severity-rubric:reminder -->', '- Rubric reminder.', '<!-- /SYNC:severity-rubric:reminder -->', '',
        ].join('\n'),
        'references/fix-loop.md': [
            '# Fixture — Fix-Loop Mode', '', FIX_LOOP_START, '', '## Mode: Fix-Loop (`--fix-loop`)', '', 'Loop until zero fixes.', '', FIX_LOOP_END, '',
        ].join('\n'),
    };
}

/** An in-memory injection fixture: canonical, its projection, and the two spawn-step carriers. */
function injectionFixture() {
    const sections = Array.from({ length: INJECTION_SECTIONS }, (_, i) => `### Protocol ${i + 1}\n\n${`Rule ${i + 1} body text. `.repeat(12).trim()}`);
    const body = [
        '> **Review Protocol Injection** — copy the template WHOLESALE and VERBATIM into every reviewer prompt.', '',
        '## Task', '', 'Review {target}.', '',
        '## Protocols (follow VERBATIM)', '', sections.join('\n\n'), '',
        '## Reference Docs (READ before reviewing)', '', '- {docs}',
    ].join('\n');
    return {
        canonical: `# Canonical\n\n---\n\n## SYNC:${INJECTION_TAG}\n\n${body}\n\n---\n\n## SYNC:other\n\nOther.\n`,
        projection: `${body}\n`,
        workflowRouter: `- \`${INJECTION_TAG}\` — full reviewer prompt; fresh review → ${INJECTION_FILE}\n`,
        changesRouter: `## Spawn\n\nRead \`${INJECTION_FILE}\` and copy it WHOLESALE into each reviewer prompt, replacing only the \`{placeholders}\`. NEVER paraphrase, summarize or drop a protocol section.\n\n- \`${INJECTION_TAG}\` — full reviewer prompt; fresh review → ${INJECTION_FILE}\n`,
    };
}

/** Write the fixture skill (optionally mutated per file) to a temp dir, load it, remove it. */
function withFixtureSkill(mutate, fn, make = fixtureFiles) {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'review-mode-sections-'));
    try {
        const files = make();
        if (mutate) mutate(files);
        const dir = path.join(temp, '.claude', 'skills', 'fixture-review');
        for (const [rel, text] of Object.entries(files)) {
            const file = path.join(dir, ...rel.split('/'));
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, text);
        }
        return fn(loadSkill(dir));
    } finally {
        removeTempDir(temp);
    }
}

/** A child env with inherited switches removed and HOME/USERPROFILE/TMPDIR/TEMP/TMP at `temp`. */
function scrubbedEnv(temp) {
    const overrides = { HOME: temp, USERPROFILE: temp, TMPDIR: temp, TEMP: temp, TMP: temp, NODE_OPTIONS: undefined, NODE_TEST_CONTEXT: undefined };
    for (const key of Object.keys(process.env)) {
        if (/^(?:CK_|CLAUDE_|CODEX_|OPENCODE_)/i.test(key)) overrides[key] = undefined;
    }
    return childEnv(overrides);
}

const tests = [
    {
        name: '[review-mode-sections] TC-PDL-043: a valid fixture split passes; each broken clause is named',
        fn: () => {
            // Given a fixture router with its references, When checked, Then no problem is reported
            withFixtureSkill(null, skill => assert.deepEqual(checkRouterSplit(skill, FIXTURE_SPEC), []));
            // When a moved section comes back into the router, Then it is named
            withFixtureSkill(files => { files['SKILL.md'] += '\n## Adversarial Review Mindset\n\nBack.\n'; },
                skill => assert.ok(checkRouterSplit(skill, FIXTURE_SPEC).some(p => p.includes('router still holds the moved section: ## Adversarial Review Mindset'))));
            // When the fix-loop section is inlined into the router, Then it is named
            withFixtureSkill(files => { files['SKILL.md'] += `\n${files['references/fix-loop.md']}`; },
                skill => assert.ok(checkRouterSplit(skill, FIXTURE_SPEC).some(p => p.includes('`## Fix-Loop Mode` section'))));
            // When a SYNC body leaves the router for a reference, Then both halves are named
            withFixtureSkill(files => {
                const block = '<!-- SYNC:severity-rubric -->\n> Rubric body.\n<!-- /SYNC:severity-rubric -->\n';
                files['SKILL.md'] = files['SKILL.md'].replace(block, '');
                files['references/full-mode.md'] += `\n${block}`;
            }, skill => {
                const problems = checkRouterSplit(skill, FIXTURE_SPEC);
                assert.ok(problems.some(p => p.includes('exactly one SYNC:severity-rubric block')), problems.join('\n'));
                assert.ok(problems.some(p => p.includes('a reference carries a SYNC block')), problems.join('\n'));
            });
            // Losing the validate routine remains a concrete transport failure.
            withFixtureSkill(files => { files['SKILL.md'] = files['SKILL.md'].replace('## Findings Validation Routine', '## Validation'); },
                skill => assert.ok(checkRouterSplit(skill, FIXTURE_SPEC).some(p => p.includes('router lacks: ## Findings Validation Routine'))));

            // Given the fixture with one route reference, When checked, Then no problem is reported
            const routeNamed = (mutate, needle) => withFixtureSkill(mutate, skill => {
                const problems = checkRouterSplit(skill, FIXTURE_ROUTE_SPEC);
                assert.ok(problems.some(p => p.includes(needle)), `expected "${needle}" in:\n  ${problems.join('\n  ')}`);
            }, routeFixtureFiles);
            withFixtureSkill(null, skill => assert.deepEqual(checkRouterSplit(skill, FIXTURE_ROUTE_SPEC), []), routeFixtureFiles);
            // When the core loses its pointer, softens it, or keeps it only outside the decision section, Then the route is named unreachable
            const unreachable = 'must point at references/route-a.md with a BLOCKING read inside ## Review plan and tasks';
            routeNamed(files => { files['references/full-mode.md'] = files['references/full-mode.md'].replace(`${FIXTURE_ROUTE_POINTER}\n`, ''); }, unreachable);
            routeNamed(files => { files['references/full-mode.md'] = files['references/full-mode.md'].replace('**[BLOCKING]** ', ''); }, unreachable);
            routeNamed(files => {
                files['references/full-mode.md'] = `${files['references/full-mode.md'].replace(`${FIXTURE_ROUTE_POINTER}\n`, '')}\n${FIXTURE_ROUTE_POINTER}\n`;
            }, unreachable);
            // When the route section is copied back into the core or the router at any level, Then the second owner is named
            routeNamed(files => { files['references/full-mode.md'] += '\n### Route A Steps\n\nWalk route A.\n'; }, 'references/full-mode.md still holds the route section: Route A Steps');
            routeNamed(files => { files['SKILL.md'] += '\n## Route A Steps\n\nWalk route A.\n'; }, 'router still holds the route section: Route A Steps');
            // When the route file loses its section or is deleted, Then it is named
            routeNamed(files => { files['references/route-a.md'] = files['references/route-a.md'].replace('## Route A Steps', '## Steps'); }, 'references/route-a.md must hold exactly one: ## Route A Steps');
            routeNamed(files => { delete files['references/route-a.md']; }, 'route reference is missing: references/route-a.md');
            // When the router stops naming the route with its read-when, Then it is named
            routeNamed(files => { files['SKILL.md'] = files['SKILL.md'].replace(`${FIXTURE_ROUTE_READ_WHEN}\n`, ''); }, 'must name references/route-a.md with its read-when');
            // When a reference file appears without a declared route, Then it is named
            routeNamed(files => { files['references/route-b.md'] = '# Fixture — Route B\n\n## Route B Steps\n\nWalk route B.\n'; }, 'undeclared reference (declare its sections and pointer): references/route-b.md');
        },
    },
    {
        name: '[review-mode-sections] TC-PDL-044: the fixture pointer is the first full-mode action; a late or soft pointer is named',
        fn: () => {
            // Given the fixture, When checked, Then the first-read rule holds
            withFixtureSkill(null, skill => assert.deepEqual(checkFirstRead(skill), []));
            // When the pointer is no longer the first section after mode detection, Then it is named
            withFixtureSkill(files => {
                files['SKILL.md'] = files['SKILL.md'].replace('## Mode References', '## Other\n\nText.\n\n## Mode References');
            }, skill => assert.ok(checkFirstRead(skill).some(p => p.includes('first section after mode detection'))));
            // When the read is no longer BLOCKING, Then it is named
            withFixtureSkill(files => {
                files['SKILL.md'] = files['SKILL.md'].replace('`references/full-mode.md` in full (BLOCKING).', '`references/full-mode.md` when useful.');
            }, skill => assert.ok(checkFirstRead(skill).some(p => p.includes('BLOCKING first action'))));
            // When the reference no longer opens with the review plan and tasks, Then it is named
            withFixtureSkill(files => {
                files['references/full-mode.md'] = files['references/full-mode.md'].replace('## Review plan and tasks (FIRST ACTION)', '## Notes');
            }, skill => assert.ok(checkFirstRead(skill).some(p => p.includes('open with the review plan and tasks'))));
        },
    },
    {
        name: '[review-mode-sections] TC-PDL-043: why-review router uses guides, retains reminders and loads terminal validation only by mode',
        skip: LIVE_SKIP,
        fn: () => {
            // Given the framework's why-review skill, When the split is checked, Then no clause is broken
            const skill = loadSkill(path.join(SKILLS_DIR, 'why-review'));
            const problems = checkRouterSplit(skill, WHY_REVIEW);
            assert.deepEqual(problems, [], `why-review split:\n  ${problems.join('\n  ')}`);
            // And the check is not vacuous: the router is real and the references exist
            assert.ok(skill.router.includes('<!-- PROTOCOL-GUIDES:START -->'), 'router has no official guides');
            for (const clause of ['≥85%', '**Dual-feedback', 'Caller owns reconciliation']) {
                assert.ok(skill.references['validate-findings.md'].includes(clause), `terminal clause exists before deletion: ${clause}`);
                const mutant = { ...skill, references: { ...skill.references, 'validate-findings.md': skill.references['validate-findings.md'].replaceAll(clause, '') } };
                assert.ok(checkRouterSplit(mutant, WHY_REVIEW).includes(`terminal validator lacks: ${clause}`), `terminal check deletion survives: ${clause}`);
            }
            const leaked = { ...skill, references: { ...skill.references, 'validate-findings.md': `${skill.references['validate-findings.md']}\n## Next Steps\nAsk the user.` } };
            assert.ok(checkRouterSplit(leaked, WHY_REVIEW).some(p => p.includes('full/fix-loop-only')), 'terminal full-mode leakage survives');
            assert.ok(skill.references['full-mode.md'] && skill.references['fix-loop.md'], 'both references exist');
            // And every route reference is reachable: the core points at it and the router names it; deleting either is caught
            for (const [name, route] of Object.entries(WHY_REVIEW.routeReferences)) {
                const pointers = blockingReads(sectionOf(skill.references['full-mode.md'], route.pointerSection), name);
                assert.ok(pointers.length > 0, `full-mode.md points at ${name} before the mutation`);
                const unpointed = { ...skill, references: { ...skill.references, 'full-mode.md': skill.references['full-mode.md'].split('\n').filter(line => !line.includes(`\`references/${name}\``)).join('\n') } };
                assert.ok(checkRouterSplit(unpointed, WHY_REVIEW).some(p => p.includes(`must point at references/${name} with a BLOCKING read`)), `unreachable ${name} survives`);
                const unnamed = { ...skill, router: skill.router.split('\n').filter(line => !line.includes(`\`references/${name}\``)).join('\n') };
                assert.ok(checkRouterSplit(unnamed, WHY_REVIEW).some(p => p.includes(`must name references/${name} with its read-when`)), `router silence on ${name} survives`);
                const { [name]: removed, ...rest } = skill.references;
                assert.ok(removed && checkRouterSplit({ ...skill, references: rest }, WHY_REVIEW).includes(`route reference is missing: references/${name}`), `missing ${name} survives`);
            }
        },
    },
    {
        name: '[review-mode-sections] TC-PDL-044: why-review full mode reads references/full-mode.md first',
        skip: LIVE_SKIP,
        fn: () => {
            // Given the framework's why-review skill, When the first-read rule is checked, Then it holds
            const problems = checkFirstRead(loadSkill(path.join(SKILLS_DIR, 'why-review')));
            assert.deepEqual(problems, [], `why-review first read:\n  ${problems.join('\n  ')}`);
        },
    },
    {
        name: '[review-mode-sections] TC-PDL-045: the coverage verifier and the four pinned why-review suites pass after the split',
        skip: LIVE_SKIP,
        fn: () => runPinnedChecks({
            // Given the read-only verifier and the four suites that pin why-review text
            verifiers: [path.join(CLAUDE_DIR, 'scripts', 'codex', 'verify-review-validate-coverage.mjs')],
            suites: [
                path.join(CLAUDE_DIR, 'scripts', 'tests', 'review-closure-contract.test.cjs'),
                path.join(CLAUDE_DIR, 'scripts', 'codex', 'tests', 'review-policy-consumers.test.mjs'),
                path.join(CLAUDE_DIR, 'scripts', 'codex', 'tests', 'prompt-contracts.test.mjs'),
                path.join(CLAUDE_DIR, 'scripts', 'codex', 'tests', 'framework-policy-regressions.test.mjs'),
            ],
        }),
    },
    {
        name: '[review-mode-sections] TC-PDL-046: a valid fixture fix-loop split passes; each broken clause is named',
        fn: () => {
            const check = skill => checkFixLoopSplit(skill, FIXTURE_FIX_LOOP_SPEC);
            const named = (mutate, needle) => withFixtureSkill(mutate, skill => {
                const problems = check(skill);
                assert.ok(problems.some(p => p.includes(needle)), `expected "${needle}" in:\n  ${problems.join('\n  ')}`);
            }, fixLoopFixtureFiles);
            // Given a fixture SKILL.md with its fix-loop reference, When checked, Then no problem is reported
            withFixtureSkill(null, skill => assert.deepEqual(check(skill), []), fixLoopFixtureFiles);
            // When the mode section is inlined back into SKILL.md, Then both the section and the block are named
            named(files => { files['SKILL.md'] += `\n${files['references/fix-loop.md']}`; }, 'still holds the fix-loop mode section');
            named(files => { files['SKILL.md'] += `\n${files['references/fix-loop.md']}`; }, 'still holds a FIX-LOOP-MODE block');
            // When the pointer is removed or no longer BLOCKING, Then it is named
            named(files => { files['SKILL.md'] = files['SKILL.md'].replace(`${FIX_LOOP_POINTER_HEADING}\n`, ''); }, 'exactly one pointer section');
            named(files => { files['SKILL.md'] = files['SKILL.md'].replace('in full FIRST (BLOCKING)', 'when useful'); }, 'BLOCKING first action');
            // When a SYNC body leaves SKILL.md for the reference, Then both halves are named
            named(files => {
                const block = '<!-- SYNC:severity-rubric -->\n> Rubric body.\n<!-- /SYNC:severity-rubric -->\n';
                files['SKILL.md'] = files['SKILL.md'].replace(block, '');
                files['references/fix-loop.md'] += `\n${block}`;
            }, 'exactly one SYNC:severity-rubric block');
            named(files => { files['references/fix-loop.md'] += '\n<!-- SYNC:x -->\nx\n<!-- /SYNC:x -->\n'; }, 'a reference carries a SYNC block');
            // When the reference loses its markers or its mode section, Then it is named
            named(files => { files['references/fix-loop.md'] = files['references/fix-loop.md'].replace(FIX_LOOP_END, ''); }, 'exactly one FIX-LOOP-MODE:START');
            named(files => { files['references/fix-loop.md'] = files['references/fix-loop.md'].replace('## Mode: Fix-Loop', '## Loop'); }, 'must hold the mode section');

        },
    },
    {
        name: '[review-mode-sections] TC-PDL-046: changes-review and workflow-review-changes read references/fix-loop.md first and retain guide fallbacks plus reminders',
        skip: LIVE_SKIP,
        fn: () => {
            for (const [name, spec] of Object.entries(FIX_LOOP_SPLITS)) {
                // Given the framework's skill, When the fix-loop split is checked, Then no clause is broken
                const skill = loadSkill(path.join(SKILLS_DIR, name));
                const problems = checkFixLoopSplit(skill, spec);
                assert.deepEqual(problems, [], `${name} fix-loop split:\n  ${problems.join('\n  ')}`);
                // And the check is not vacuous: SKILL.md is real and the reference holds the mode
                assert.ok(skill.router.includes('<!-- PROTOCOL-GUIDES:START -->'), `${name} has no official guides`);
                const mutant = { ...skill, references: { ...skill.references, 'fix-loop.md': skill.references['fix-loop.md'].replace('freshly review', 'reuse the old verdict') } };
                assert.ok(checkFixLoopSplit(mutant, spec).some(p => p.includes('freshly review')), 'missing fresh review must fail');
            }
        },
    },
    {
        name: '[review-mode-sections] TC-PDL-046: the suites that pin the moved fix-loop text and the wf-cycle verifier pass',
        skip: LIVE_SKIP,
        // The three shared pinned suites already run under TC-PDL-045; these are the other two plus wf-cycle.
        fn: () => runPinnedChecks({
            verifiers: [path.join(CLAUDE_DIR, 'scripts', 'codex', 'verify-workflow-cycle-compliance.mjs')],
            suites: [
                path.join(CLAUDE_DIR, 'scripts', 'codex', 'tests', 'review-workflow-tooling-regressions.test.mjs'),
                path.join(CLAUDE_DIR, 'scripts', 'codex', 'tests', 'round3-prompt-contract.test.mjs'),
            ],
        }),
    },
    {
        name: '[review-mode-sections] TC-PDL-064: a valid fixture injection template passes; each broken clause is named',
        fn: () => {
            // Given a canonical template, its projection and both spawn steps, When checked, Then no problem is reported
            assert.deepEqual(checkInjectionTemplate(injectionFixture()), []);
            const named = (mutate, needle) => {
                const input = injectionFixture();
                mutate(input);
                const problems = checkInjectionTemplate(input);
                assert.ok(problems.some(p => p.includes(needle)), `expected "${needle}" in:\n  ${problems.join('\n  ')}`);
            };
            // When the projection drifts from canonical, Then it is named
            named(input => { input.projection = input.projection.replace('Rule 3 body', 'Rule three body'); }, 'does not byte-match');
            // When a protocol section is replaced by a path (in canonical and projection alike), Then it is named
            named(input => {
                const section = /### Protocol 4\n\n[^\n]+/;
                input.canonical = input.canonical.replace(section, '### Protocol 4\n\n`.claude/skills/shared/protocols/protocol-4.md`');
                input.projection = input.projection.replace(section, '### Protocol 4\n\n`.claude/skills/shared/protocols/protocol-4.md`');
            }, 'not a full body: ### Protocol 4');
            // When a protocol section is dropped, Then the count is named
            named(input => {
                const section = /\n\n### Protocol 11\n\n[^\n]+/;
                input.canonical = input.canonical.replace(section, '');
                input.projection = input.projection.replace(section, '');
            }, 'holds 10 protocol sections, expected 11');
            // Removing a reader's canonical fallback or trimming dispatch at its owner fails.
            named(input => { input.workflowRouter = input.workflowRouter.replace(INJECTION_FILE, 'missing.md'); }, 'no canonical full-template fallback');
            named(input => { input.changesRouter = input.changesRouter.replace(`→ ${INJECTION_FILE}`, '→ missing.md'); }, 'no canonical full-template fallback');
            named(input => { input.canonical = input.canonical.replace('WHOLESALE', 'summarized'); input.projection = input.projection.replace('WHOLESALE', 'summarized'); }, 'VERBATIM WHOLESALE');
            named(input => { input.canonical = input.canonical.replace('VERBATIM', 'adapted'); input.projection = input.projection.replace('VERBATIM', 'adapted'); }, 'VERBATIM WHOLESALE');
        },
    },
    {
        name: '[review-mode-sections] TC-PDL-064: the generated injection template equals canonical and both spawn steps copy it WHOLESALE',
        skip: LIVE_SKIP,
        fn: () => {
            // Given the framework's canonical source, its projection and the two review skills
            const input = {
                canonical: fs.readFileSync(path.join(SKILLS_DIR, 'shared', 'sync-inline-versions.md'), 'utf8'),
                projection: fs.readFileSync(path.join(REPO_ROOT, ...INJECTION_FILE.split('/')), 'utf8'),
                workflowRouter: fs.readFileSync(path.join(SKILLS_DIR, 'workflow-review-changes', 'SKILL.md'), 'utf8'),
                changesRouter: fs.readFileSync(path.join(SKILLS_DIR, 'changes-review', 'SKILL.md'), 'utf8'),
            };
            // When the template contract is checked, Then no clause is broken
            const problems = checkInjectionTemplate(input);
            assert.deepEqual(problems, [], `review-protocol-injection template:\n  ${problems.join('\n  ')}`);
            // And the projection is one whole file (the index parts are hook-bin offsets, not files)
            assert.ok(input.projection.includes('### Spec ↔ Tests ↔ Code Triangulation'), 'the complete template has a real contract lens');
        },
    },
];

/** Spawn read-only verifiers and node:test suites with a scrubbed env; assert every one passes, non-vacuously. */
function runPinnedChecks({ verifiers, suites }) {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'review-mode-sections-run-'));
    try {
        const env = scrubbedEnv(temp);
        const run = args => spawnSync(process.execPath, args, { cwd: REPO_ROOT, env, encoding: 'utf8', windowsHide: true, timeout: SPAWN_TIMEOUT_MS });
        // When each verifier runs, Then it exits 0
        for (const verifier of verifiers) {
            const result = run([verifier]);
            assert.equal(result.status, 0, `${path.basename(verifier)} failed:\n${result.stdout}\n${result.stderr}`);
        }
        // When the suites run, Then every test passes and at least one ran
        const result = run(['--test', '--test-reporter=tap', ...suites]);
        assert.equal(result.status, 0, `pinned suites failed:\n${result.stdout.slice(-6000)}\n${result.stderr.slice(-2000)}`);
        assert.match(result.stdout, /# fail 0/, 'node:test reports zero failures');
        assert.doesNotMatch(result.stdout, /# pass 0\b/, 'node:test ran at least one test (not vacuous)');
    } finally {
        removeTempDir(temp);
    }
}

module.exports = { name: 'review-mode-sections', tests };
