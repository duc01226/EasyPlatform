/**
 * Content-Presence Test Suite
 *
 * Re-homes the parity guarantees that USED to be enforced by the now-deleted
 * context-injection hooks. Those hooks injected guidance at runtime; the guidance
 * now lives statically in CLAUDE.md / agent .md so a hookless harness (Codex)
 * reads identical instructions. These are GENUINE presence asserts — each FAILS
 * if the relocated guidance goes missing. No tautologies (we assert specific
 * load-bearing phrases, not "file is non-empty").
 *
 * Coverage (what THIS suite asserts today):
 *   TC-CP-001 — CLAUDE.md carries the workflow routing gate + the
 *               path→reference-doc pointer table (backend/frontend/integration/
 *               e2e/spec/scss rows). Replaces the deleted workflow-router injection.
 *   TC-CP-008 — CLAUDE.md carries the full workflow SELECTION catalog (Workflows Index
 *               listing every workflow id from workflows.json) so a hookless read picks
 *               the right workflow WITHOUT the workflow-router.cjs hook. This is the
 *               static-bake half of "Claude has no hooks"; the mirrors (AGENTS.md)
 *               bake the same catalog from the same source.
 *   TC-CP-002 — the universal subagent-bootstrap phrases are present in a
 *               representative sample of agents (one code, one non-code).
 *   TC-CP-003 — agent-code-standards (dev-rules + pattern docs) is present in a
 *               code agent and ABSENT from a non-code agent — the relocated
 *               dev-rules guidance reaches code agents only.
 *   TC-CP-004 — design-system-canonical-guide hook's "read the canonical design-system
 *               doc first for tokens/components/BEM" guidance relocated into the design skill.
 *   TC-CP-005 — figma-context-extractor hook's Figma-URL→MCP extraction commands
 *               relocated into the figma-design skill.
 *   TC-CP-006 — ba-refinement-context hook's DoR / hypothesis-validation BA guidance
 *               relocated into the refine skill.
 *   TC-CP-007 — graph-grep-suggester hook's post-grep "run a graph trace, grep can't find
 *               callers/consumers/events" mandate relocated into the scout skill.
 *   TC-CP-009 — the integration-test execution-discipline rules (verify the WHOLE system,
 *               never hack seed data / drive through real use-case paths, /debug-investigate
 *               the root cause on failure, 60s runtime cap, loop until green) are present in
 *               EVERY integration-test-family skill (write / review / verify / workflow), so the
 *               family runs/diagnoses/clears a suite identically regardless of entry point.
 *   TC-CP-010 — the test-failure fault-adjudication rules (root-cause first, triangulate the
 *               failure against spec AND source, classify SOURCE-WRONG vs TEST-WRONG, and
 *               AskUserQuestion when intended behavior is unclear) are present in EVERY
 *               debug/fix/test-family skill, so every entry point decides WHO is at fault the
 *               same way instead of silently editing whichever side makes the suite green.
 *
 *   TC-CP-011 — the understand skill's report contract (four-part section order, the mandatory
 *               diagram set, the eight-field review-stage rule, the never-invent-a-case-ID rule,
 *               the single-owner target-form rule, and the git-ignored-write HARD RULE) is
 *               present, AND all three reference contracts it loads at Step 0.3 exist with their
 *               load-bearing sections. Every one of these is enforced by prompt text alone — an
 *               edit that drops one silently changes what every run produces.
 *               It also enforces the contract STRUCTURALLY: report-template.md's form registry
 *               must match all three of its per-form tables ID-for-ID, and no other file may
 *               enumerate the form set. Presence checks cannot catch two present-but-disagreeing
 *               statements, which is what drifted in three consecutive review rounds.
 *
 * The 4 per-context inject hooks (design-system-canonical-guide / figma-context-extractor /
 * ba-refinement-context / graph-grep-suggester) are now presence-asserted by TC-CP-004..007
 * against the verbatim load-bearing phrases their guidance relocated to. A future skill edit
 * that drops a relocated block fails the matching TC, restoring hookless (Codex) parity.
 */

const fs = require('fs');
const path = require('path');
const { assertTrue } = require('../lib/assertions.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR;
const AGENTS_DIR = path.resolve(PROJECT_DIR, '.claude', 'agents');
const SKILLS_DIR = path.resolve(PROJECT_DIR, '.claude', 'skills');

const readFile = p => fs.readFileSync(p, 'utf8');
const readAgent = name => readFile(path.join(AGENTS_DIR, `${name}.md`));
const readSkill = name => readFile(path.join(SKILLS_DIR, name, 'SKILL.md'));

// Assert a relocated inject-hook's guidance survives in its target skill. Each phrase is a
// verbatim load-bearing fragment of the deleted hook's output — NOT a tautology. Fails loudly
// (naming the deleted hook) if the relocation is dropped, so hookless parity can't silently rot.
const assertRelocated = (deletedHook, skill, phrases) => {
    const body = readSkill(skill);
    const missing = phrases.filter(p => !body.includes(p));
    assertTrue(missing.length === 0,
        `${deletedHook} guidance lost from ${skill}/SKILL.md (relocation regressed):\n  ${missing.join('\n  ')}`);
};

module.exports = {
    name: 'content-presence',
    tests: [
        {
            name: '[content-presence] TC-CP-001 CLAUDE.md carries workflow routing gate + path→doc pointers',
            fn: () => {
                const claudeMd = readFile(path.resolve(PROJECT_DIR, 'CLAUDE.md'));
                const missing = [];
                // Workflow routing gate (Phase 01 — replaces a runtime router injection).
                if (!claudeMd.includes('WORKFLOW-GATE')) missing.push('WORKFLOW-GATE routing header');
                if (!/Path\s*→\s*Reference Doc/.test(claudeMd)) missing.push('Path → Reference Doc table heading');
                // The path→doc pointer rows — each names the reference doc a hook used to inject.
                for (const doc of [
                    'backend-patterns-reference.md',
                    'frontend-patterns-reference.md',
                    'integration-test-reference.md',
                    'e2e-test-reference.md',
                    'spec-system-reference.md',
                ]) {
                    if (!claudeMd.includes(doc)) missing.push(`pointer to ${doc}`);
                }
                assertTrue(missing.length === 0,
                    `CLAUDE.md missing relocated routing guidance:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            name: '[content-presence] TC-CP-008 CLAUDE.md carries the full workflow selection catalog (hook-independent)',
            fn: () => {
                const claudeMd = readFile(path.resolve(PROJECT_DIR, 'CLAUDE.md'));
                const workflowsDoc = JSON.parse(
                    readFile(path.resolve(PROJECT_DIR, '.claude', 'workflows.json'))
                );
                const ids = Object.keys(workflowsDoc.workflows || {});
                const missing = [];
                // The Workflows Index heading — proves the selection catalog (not just the
                // skills-only table) is statically baked into CLAUDE.md.
                if (!/###\s+Workflows Index \(\d+\)/.test(claudeMd)) {
                    missing.push('Workflows Index heading (### Workflows Index (N))');
                }
                // Every workflow id must be selectable from the file alone — no hook required.
                for (const id of ids) {
                    if (!claudeMd.includes(`\`${id}\``)) missing.push(`workflow row for ${id}`);
                }
                assertTrue(missing.length === 0,
                    `CLAUDE.md missing the hook-independent workflow selection catalog:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            name: '[content-presence] TC-CP-002 universal subagent-bootstrap phrases present in sampled agents',
            fn: () => {
                // Sample one code agent + one non-code agent — bootstrap is universal (all 29).
                // The meta-rationale header was removed (no operational value to the agent);
                // assert only the actionable load-bearing guidance.
                const phrases = [
                    'Plan first, then act',               // plan-first
                    'Context guard / progress file',      // progress-file protocol
                    'tmp/ck-agent-',                      // progress-file path contract
                ];
                const missing = [];
                for (const agent of ['backend-developer', 'product-owner']) {
                    const body = readAgent(agent);
                    for (const p of phrases) {
                        if (!body.includes(p)) missing.push(`${agent} → "${p}"`);
                    }
                    // Autonomy was REMOVED in the Phase-03 rework — assert it did not return.
                    if (/run autonomously until the task/.test(body)) {
                        missing.push(`${agent} → autonomy paragraph re-appeared (should be removed)`);
                    }
                }
                assertTrue(missing.length === 0,
                    `subagent-bootstrap guidance drift:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            name: '[content-presence] TC-CP-003 agent-code-standards reaches code agents, not non-code agents',
            fn: () => {
                const codeBody = readAgent('backend-developer');
                const nonCodeBody = readAgent('product-owner');
                const missing = [];
                // Code agent MUST carry dev-rules + pattern-doc guidance. The meta-rationale
                // header was removed; key on the actionable content ("Development rules" lead-in
                // is unique to the code-standards block) instead of a header phrase.
                if (!codeBody.includes('Development rules')) missing.push('code agent missing dev-rules guidance');
                if (!codeBody.includes('backend-patterns-reference.md')) missing.push('code agent missing pattern-doc pointer');
                // Non-code agent MUST NOT carry it — "Development rules" appears only in this block.
                if (nonCodeBody.includes('Development rules')) missing.push('non-code agent LEAKS code-standards guidance');
                assertTrue(missing.length === 0,
                    `agent-code-standards relocation drift:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            name: '[content-presence] TC-CP-004 design-system-canonical guidance relocated into design skill',
            fn: () => assertRelocated('design-system-canonical-guide', 'design', [
                'design-system-canonical.md',
                'first for design tokens, component patterns, and BEM conventions',
            ]),
        },
        {
            name: '[content-presence] TC-CP-005 figma URL→MCP extraction relocated into figma-design skill',
            fn: () => assertRelocated('figma-context-extractor', 'figma-design', [
                'Figma URL Detection & MCP Extraction',
                'mcp__figma__get_file_nodes',
            ]),
        },
        {
            name: '[content-presence] TC-CP-006 ba-refinement DoR/hypothesis guidance relocated into refine skill',
            fn: () => assertRelocated('ba-refinement-context', 'refine', [
                'Definition of Ready',
                'hypothesis validation',
            ]),
        },
        {
            name: '[content-presence] TC-CP-007 graph-grep post-grep trace mandate relocated into scout skill',
            fn: () => assertRelocated('graph-grep-suggester', 'scout', [
                'Post-Grep Trace Trigger',
                'grep CANNOT find',
            ]),
        },
        {
            name: '[content-presence] TC-CP-009 integration-test execution-discipline rules present in EVERY integration-test-family skill',
            fn: () => {
                // The five load-bearing rules the user requires across the whole integration-test
                // family. Each is a verbatim fragment of SYNC:integration-test-execution-discipline.
                // Keyed per-rule (not the literal block prose) so a phrasing tweak that PRESERVES the
                // rule still passes, but DROPPING a rule from any family skill fails loudly.
                const rules = {
                    'verify-whole-system': 'Verify the WHOLE system passes',
                    'real-use-case-no-seed-hack': 'NEVER hack seed data',
                    'debug-investigate-on-failure': '`/debug-investigate` the root cause',
                    'sixty-second-cap': '60-second runtime cap',
                    'loop-until-green': 'Loop until the whole suite is green',
                };
                // Every integration-test-family skill — write (integration-test), review, verify,
                // and the workflow that chains them. Adding a family skill without these rules
                // (or dropping one here) must surface as a failure, not a silent gap.
                const familySkills = [
                    'integration-test',
                    'integration-test-review',
                    'integration-test-verify',
                    'workflow-write-integration-test',
                ];
                const missing = [];
                for (const skill of familySkills) {
                    const body = readSkill(skill);
                    for (const [rule, phrase] of Object.entries(rules)) {
                        if (!body.includes(phrase)) missing.push(`${skill} → missing rule "${rule}" ("${phrase}")`);
                    }
                }
                assertTrue(missing.length === 0,
                    `integration-test execution-discipline rule drift:\n  ${missing.join('\n  ')}\n` +
                    `Fix: re-sync SYNC:integration-test-execution-discipline ` +
                    `(py -3 .claude/scripts/sync-update-blocks.py integration-test-execution-discipline).`);
            },
        },
        {
            name: '[content-presence] TC-CP-010 test-failure fault-adjudication rules present in EVERY debug/fix/test-family skill',
            fn: () => {
                // The load-bearing rules the user requires across the whole debug/fix/test family:
                // when a test fails, root-cause it, triangulate the failure against the spec AND the
                // source to decide whether the SOURCE or the TEST is at fault, and ask the user when
                // the spec is silent/ambiguous. Keyed per-rule (verbatim fragments of
                // SYNC:test-failure-fault-adjudication) so a phrasing tweak that PRESERVES a rule
                // still passes, but DROPPING a rule from any family skill fails loudly.
                const rules = {
                    'who-is-at-fault': 'who is at fault — the source code or the test code',
                    'root-cause-first': 'trace end-to-start before editing',
                    'triangulate-spec-and-source': 'Triangulate against the spec AND the source',
                    'classify-source-wrong': 'SOURCE-WRONG',
                    'classify-test-wrong': 'TEST-WRONG',
                    'ask-user-when-unclear': 'Ask the user when intended behavior is unclear',
                };
                // Every debug/fix/test-family skill — investigate, fix, prove-fix, the test runner,
                // the integration-test trio, e2e, UI/webapp testing, and the bugfix workflow.
                // Adding a family skill without these rules (or dropping one here) must surface as
                // a failure, not a silent gap.
                const familySkills = [
                    'debug-investigate',
                    'fix',
                    'prove-fix',
                    'test',
                    'integration-test',
                    'integration-test-review',
                    'integration-test-verify',
                    'e2e-test',
                    'test-ui',
                    'webapp-testing',
                    'workflow-bugfix',
                ];
                const missing = [];
                for (const skill of familySkills) {
                    const body = readSkill(skill);
                    for (const [rule, phrase] of Object.entries(rules)) {
                        if (!body.includes(phrase)) missing.push(`${skill} → missing rule "${rule}" ("${phrase}")`);
                    }
                }
                assertTrue(missing.length === 0,
                    `test-failure fault-adjudication rule drift:\n  ${missing.join('\n  ')}\n` +
                    `Fix: re-sync SYNC:test-failure-fault-adjudication ` +
                    `(py -3 .claude/scripts/sync-update-blocks.py test-failure-fault-adjudication).`);
            },
        },
        {
            name: '[content-presence] TC-CP-011 understand skill carries its report contract + both reference files',
            fn: () => {
                // The understand skill's deliverable contract — section order, the mandatory diagram
                // set, the review-path stage rule, the never-invent-an-ID rule, the single-matrix
                // rule, and the git-ignored-write HARD RULE — is enforced ONLY by prompt text. An
                // edit that deletes any of it changes what every run produces while every other
                // suite still passes. These are the load-bearing phrases, not a non-empty check.
                const skillPhrases = {
                    'part-1-orient': 'Part I — Orient',
                    'part-2-route': 'Part II — Route',
                    'part-3-depth': 'Part III — Depth',
                    'part-4-prove': 'Part IV — Prove & Push Back',
                    'never-invent-a-case-id': 'Never invent a case ID',
                    'eight-field-stage-rule': 'all eight fields',
                    'single-target-form-owner': 'SOLE owner of the target-form contract',
                    'write-hard-rule': 'any git-tracked path',
                    // §0 is the read-only-this section and the FIRST thing in the report. It is
                    // registered here (not only in the template) because a section that exists in
                    // the skeleton but not in SKILL.md's [BLOCKING] drop-risk bar is a section a
                    // run under budget pressure drops first.
                    'section-zero': '§0 Detailed Summary',
                    // The report is ONE combined file at every tier. This rule replaced a
                    // report-DIRECTORY rule that survived unexamined until a real run emitted 12
                    // files; without an assertion it is one edit away from returning.
                    'one-file-always': 'ONE file at every tier',
                };
                const missing = [];
                const body = readSkill('understand');
                for (const [rule, phrase] of Object.entries(skillPhrases)) {
                    if (!body.includes(phrase)) missing.push(`understand/SKILL.md → missing "${rule}" ("${phrase}")`);
                }

                // Step 0.3 loads three contracts. A missing one degrades to a stated blocker rather
                // than a crash, but it still silently strips the detail the report depends on — so
                // the distribution must carry all three.
                const refPhrases = {
                    'report-template.md': [
                        'Target forms — the single-owner contract',
                        'The form registry — the ONE enumeration',
                        'Where this sits in the system that already existed',
                        '## 0. Detailed Summary',
                    ],
                    // D5 deliberately has NO per-diagram spec section — review-path.md owns all five
                    // of its fields. A stub here that only pointed there drifted out of agreement
                    // with the table row three review rounds running, so the table row is the only
                    // place D5 is described and it must carry the "rendered in §4" scope itself.
                    'diagram-catalog.md': [
                        'D7 — Story map (MANDATORY)',
                        'Derivation ladder',
                        '**MANDATORY** — rendered in §4, not §2',
                        '**D5 has no spec here**',
                    ],
                    // 'Cap: 3 context files per stage' was asserted here until the contract
                    // deliberately REMOVED that cap: a cap makes a run drop a file the reviewer
                    // needs, where the replacement rule makes it split the stage or the group.
                    // Asserting a rule the contract retired would have pushed the next maintainer
                    // to "fix" the red by restoring the cap — so the assertion moved to the
                    // replacement wording instead. TC-CP-013 makes the cap's RETURN a failure.
                    'review-path.md': ['No cap on context files', '[context — not changed]'],
                };
                for (const [file, phrases] of Object.entries(refPhrases)) {
                    const p = path.join(SKILLS_DIR, 'understand', 'references', file);
                    if (!fs.existsSync(p)) { missing.push(`understand/references/${file} → FILE MISSING`); continue; }
                    const ref = readFile(p);
                    for (const phrase of phrases) {
                        if (!ref.includes(phrase)) missing.push(`understand/references/${file} → missing "${phrase}"`);
                    }
                }

                // ---- Single-owner structural guard on the target-form contract ----
                //
                // Three review rounds each produced the SAME failure: a form-set claim asserted in
                // N files, a fix applied to the 1 that was cited, and nothing detecting the other
                // N-1. Phrase-parity assertions could not catch that — they check that a phrase is
                // PRESENT, and every drift instance was two present phrases disagreeing.
                //
                // So the contract was consolidated: report-template.md now owns a form REGISTRY
                // (the one enumeration) plus all three per-form detail tables, and every other file
                // carries a pointer and no list. That makes the invariant structural and checkable:
                // the registry's ID column must equal each detail table's key column, exactly and
                // in order. Adding a form to the registry alone, or to two tables out of three,
                // fails here — which is precisely the half-edit that drifted three times.
                //
                // IDs are matched, not display names: detail rows abbreviate ("F5 · Un-fixed bug"
                // vs the registry's "Un-fixed bug/error"), and it is the ID correspondence that
                // carries the invariant. Coupling to markdown table shape is intentional — a
                // reformat that breaks these patterns IS a change to the contract's single source
                // and should require updating this TC.
                const OWNER = 'report-template.md';
                const ownerPath = path.join(SKILLS_DIR, 'understand', 'references', OWNER);
                const owner = fs.existsSync(ownerPath) ? readFile(ownerPath) : '';
                const chunks = owner.split(/^### /m);
                const chunkFor = (heading) => chunks.find((c) => c.startsWith(heading)) || '';

                // Registry rows are `| **F1** | Diff | ... |`; detail rows are `| **F1 · Diff** |`.
                // The closing `**` right after the digits keeps the two patterns disjoint.
                const registryIds = [...chunkFor('The form registry')
                    .matchAll(/^\|\s*\*\*(F\d+)\*\*\s*\|/gm)].map((m) => m[1]);

                if (registryIds.length < 2) {
                    missing.push(`understand/references/${OWNER} → form registry missing or has <2 rows (expected "| **F1** | … |" rows under "### The form registry")`);
                } else {
                    const expected = registryIds.map((_, i) => `F${i + 1}`).join(',');
                    if (registryIds.join(',') !== expected) {
                        missing.push(`understand/references/${OWNER} → registry IDs are [${registryIds.join(', ')}], expected sequential [${expected}] — renumber so a form's ID is stable and greppable`);
                    }
                    for (const table of ['Table 1 of 3', 'Table 2 of 3', 'Table 3 of 3']) {
                        const chunk = chunkFor(table);
                        if (!chunk) { missing.push(`understand/references/${OWNER} → "### ${table}" section absent — the contract's three per-form tables must stay in the owner file`); continue; }
                        const ids = [...chunk.matchAll(/^\|\s*\*\*(F\d+)\s*·/gm)].map((m) => m[1]);
                        if (ids.join(',') !== registryIds.join(',')) {
                            missing.push(`understand/references/${OWNER} → "${table}" covers [${ids.join(', ') || 'none'}] but the registry declares [${registryIds.join(', ')}] — a form was added or removed in one place only; every form needs a row in the registry AND in all three tables`);
                        }
                    }
                }

                // No file outside the owner may enumerate the form set — not as registry-style rows,
                // not as a re-introduced legacy table keyed on the form nouns, and not as a COUNT.
                // The count check covers both historical violations: "Six target forms are declared
                // in Step 0" (was SKILL.md) and "Six forms are declared in Step 0" (was
                // report-template.md) — an earlier regex required the word "target" and caught only
                // the first, so `target` is optional here. Illustrative prose naming individual
                // forms stays allowed; only an enumeration or a count is drift.
                const COUNT_RX = /\b(?:four|five|six|seven|eight|nine)\s+(?:target\s+)?forms?\b/i;
                const ID_ROW_RX = /^\|\s*\*\*F\d+/m;
                const LEGACY_ROW_RX = /^\|\s*\*\*(?:Diff|Subsystem|Plan|Concept|Un-fixed bug|No user-facing story)\b/im;
                const nonOwner = { 'SKILL.md': body };
                for (const f of ['review-path.md', 'diagram-catalog.md']) {
                    const p = path.join(SKILLS_DIR, 'understand', 'references', f);
                    if (fs.existsSync(p)) nonOwner[`references/${f}`] = readFile(p);
                }
                for (const [where, text] of Object.entries(nonOwner)) {
                    const count = text.match(COUNT_RX);
                    if (count) missing.push(`understand/${where} → asserts a target-form COUNT ("${count[0]}") — the set is enumerated ONLY in references/${OWNER}'s registry; delete the count and point there`);
                    if (ID_ROW_RX.test(text)) missing.push(`understand/${where} → carries form-registry rows ("| **F…") — only references/${OWNER} may enumerate the form set`);
                    if (LEGACY_ROW_RX.test(text)) missing.push(`understand/${where} → carries a per-form table keyed on form names — that second list is what drifted from the owner three rounds running; replace it with a pointer to references/${OWNER}`);
                    // Dangling deixis. Consolidation moved the per-form tables out of these files
                    // but left two prose pointers reading "see the target-form matrix below" —
                    // aimed at a table no longer there. A cross-file pointer must name the FILE, so
                    // "below"/"above" deixis about the form contract is banned outside the owner.
                    const dangling = text.match(/target[- ]form matrix|form matrix (?:below|above)/i);
                    if (dangling) missing.push(`understand/${where} → points at a "${dangling[0]}" that does not live here — the per-form tables are in references/${OWNER}; cite it by filename and table number, never by "below"`);
                }

                assertTrue(missing.length === 0,
                    `understand report-contract drift:\n  ${missing.join('\n  ')}\n` +
                    `Fix: restore the dropped contract text, or update this TC if the contract ` +
                    `intentionally changed (a deliberate contract change SHOULD edit this test).`);
            },
        },
        {
            name: '[content-presence] TC-CP-012 understand skill emits ONE report file — no multi-file vocabulary',
            fn: () => {
                // The skill used to emit a report DIRECTORY at tier S3+ (`00-index.md` spine plus
                // `NN-{group-slug}.md` per group). That rule survived unexamined until a real run
                // produced 12 files nobody opened as a whole. It is now ONE file at every tier.
                //
                // ALLOWLIST RATIONALE — READ BEFORE BROADENING THIS PATTERN:
                // this check matches FILE-SHAPED TOKENS, never the English word "directory". The
                // word appears deliberately in the do-not-re-split rationale ("a directory is a
                // deliverable nobody opens as a whole") and in an anti-rationalization row quoting
                // the mistake ("I'll split it into a directory"). A `/directory/i` pattern would
                // fail on exactly the text that PREVENTS the regression — the guard would fight
                // the guardrail. Match what materializes files; not what argues against them.
                const FILE_SHAPED = [/00-index/i, /NN-\{group-slug\}/i, /sub-spine/i, /block path/i];
                const dir = path.join(SKILLS_DIR, 'understand');
                const files = [];
                const walk = (d) => {
                    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
                        const p = path.join(d, e.name);
                        if (e.isDirectory()) walk(p);
                        else if (e.name.endsWith('.md')) files.push(p);
                    }
                };
                walk(dir);

                // Vacuity guard: a glob that matches nothing asserts nothing.
                assertTrue(files.length >= 5,
                    `TC-CP-012 found only ${files.length} markdown file(s) under .claude/skills/understand — ` +
                    `expected at least 5 (SKILL.md + 4 references). The scan is vacuous; fix the walk before trusting a green.`);

                const hits = [];
                for (const p of files) {
                    const text = readFile(p);
                    for (const rx of FILE_SHAPED) {
                        const m = text.match(rx);
                        if (m) hits.push(`${path.relative(SKILLS_DIR, p)} → "${m[0]}"`);
                    }
                }
                assertTrue(hits.length === 0,
                    `understand multi-file vocabulary returned:\n  ${hits.join('\n  ')}\n` +
                    `Fix: the report is ONE file at every tier — see references/report-template.md → ` +
                    `"Scaled report layout". At >12 groups it NESTS in the same file, never splits. ` +
                    `If the contract intentionally changed back, update this TC.`);
            },
        },
        {
            name: '[content-presence] TC-CP-013 understand skill caps nothing it SAYS, and keeps every split trigger',
            fn: () => {
                // Three assertions, one invariant with three halves. A tree where the caps are gone
                // but the triggers went with them is NOT a pass — deleting a trigger removes the
                // structure that keeps a large target readable, which is the opposite of the goal.
                //
                // ALLOWLIST RATIONALE — READ BEFORE BROADENING THESE PATTERNS:
                // this check matches CAP PHRASINGS, never bare numbers. report-template.md's
                // "Caps vs split triggers" note quotes the trigger numbers deliberately, and
                // scale-protocol.md keeps its trigger rows. A digit-shaped pattern would fail on
                // the text that documents the distinction.
                //
                // KNOWN BLIND SPOT — this guard is ONE-DIRECTIONAL. It blocks the caps that
                // existed, not a cap invented later: a future "§0: keep under 500 words" passes it
                // green. That is accepted, not overlooked — a general "no numeric limit" regex
                // would fire on the caps-vs-triggers note itself. Two backstops: CAP_PHRASINGS
                // carries BOTH the digit and word forms a cap has historically taken here, and
                // report-template.md's caps-vs-triggers note is the human-readable rule a reviewer
                // reads. Do not trust this guard past that range.
                const CAP_PHRASINGS = [
                    /1[–-]4 concepts/i, /concepts MAX/i, /1[–-]3 flows/i,
                    /3[–-]7[- ]stages?/i, /bounds the route to 3[–-]7/i, /Cap: 3 context files/i,
                    // Word forms. The digit patterns above cannot see these, which is exactly how
                    // SKILL.md's "exactly three lines — no more" survived the first cap inventory.
                    /exactly three lines/i, /lines? — no more/i,
                ];
                // Digit-free sentences BUILT ON a removed cap. No cap-shaped pattern can see these
                // — none contains a number. The last two catch the subtler second-order failure:
                // REWORDING such a sentence into the vocabulary of review-path.md's replacement
                // rule, which abolished the named-but-unrouted mechanism outright. A paraphrase
                // that keeps the mechanism contradicts the rule on the same page, and is harder to
                // spot than the dangling reference it replaced.
                const ORPHAN_PHRASINGS = [
                    /context cap/i, /cap of 3/i, /The cap bounds/i, /(file|stage) cap/i,
                    /named but/i, /(did|could) not route/i,
                ];
                // The other half: exceeding one of these ADDS structure. They must survive.
                // SECOND KNOWN BLIND SPOT, measured not assumed: this is a FILE-LEVEL presence
                // check, and several triggers are stated twice in their owning file (once in the
                // §1 group-size table, once in the §7 triggers table). Deleting ONE statement
                // leaves the guard green — proven by mutating only §1's "≤ 8 files" and watching
                // this assertion pass. Deleting BOTH goes red. So it catches a trigger REMOVED,
                // not a trigger left half-stated. Anchoring each pattern to its specific table row
                // would close the gap and couple the test to markdown layout; the looser check was
                // kept deliberately. Restating a trigger is redundancy that helps a reader — but
                // do not read a green here as proof that every restatement still agrees.
                const TRIGGERS = [
                    { file: 'references/scale-protocol.md', rx: /≤ ?8 files/, what: 'group size (≤8 files)' },
                    { file: 'references/scale-protocol.md', rx: /≤ ?2000/, what: 'group size (≤2000 diff-lines)' },
                    { file: 'references/scale-protocol.md', rx: /≤ ?12/, what: 'groups per level (≤12 → nest)' },
                    { file: 'references/scale-protocol.md', rx: /≤ ?10 lines/, what: 'sub-agent return bound (a MESSAGE bound, not a report bound)' },
                    { file: 'references/diagram-catalog.md', rx: /~ ?20 nodes/, what: 'diagram size (~20 nodes → split/subgraph)' },
                ];

                const dir = path.join(SKILLS_DIR, 'understand');
                const files = [];
                const walk = (d) => {
                    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
                        const p = path.join(d, e.name);
                        if (e.isDirectory()) walk(p);
                        else if (e.name.endsWith('.md')) files.push(p);
                    }
                };
                walk(dir);
                assertTrue(files.length >= 5,
                    `TC-CP-013 found only ${files.length} markdown file(s) under .claude/skills/understand — ` +
                    `expected at least 5. The scan is vacuous; fix the walk before trusting a green.`);

                const problems = [];
                for (const p of files) {
                    const text = readFile(p);
                    const rel = path.relative(SKILLS_DIR, p);
                    for (const rx of CAP_PHRASINGS) {
                        const m = text.match(rx);
                        if (m) problems.push(`${rel} → content cap returned: "${m[0]}"`);
                    }
                    for (const rx of ORPHAN_PHRASINGS) {
                        const m = text.match(rx);
                        if (m) problems.push(`${rel} → orphaned cap reference: "${m[0]}"`);
                    }
                }
                for (const t of TRIGGERS) {
                    const p = path.join(dir, t.file);
                    const text = fs.existsSync(p) ? readFile(p) : '';
                    if (!t.rx.test(text)) problems.push(`${t.file} → SPLIT TRIGGER DELETED: ${t.what}`);
                }

                assertTrue(problems.length === 0,
                    `understand cap/trigger contract broken:\n  ${problems.join('\n  ')}\n` +
                    `Fix — "content cap returned": no rule may cap what the report SAYS; a limit that ` +
                    `binds makes a run drop knowledge to fit. Replace the count with the quality rule ` +
                    `it approximated.\n` +
                    `Fix — "orphaned cap reference": a sentence still points at (or paraphrases) a cap ` +
                    `this contract removed. Delete the clause; do not reword it into the replacement ` +
                    `rule's vocabulary.\n` +
                    `Fix — "SPLIT TRIGGER DELETED": removing a trigger does NOT remove a cap — it ` +
                    `removes the structure that keeps a large target readable. See ` +
                    `references/report-template.md → "Caps vs split triggers".`);
            },
        },
    ],
};
