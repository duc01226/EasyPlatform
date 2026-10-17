/**
 * Learn CLAUDE.md Destination Test Suite
 *
 * `/learn` routes a lesson to the carrier a future session will actually read. A lesson that is a
 * general project rule, convention or context note can go to the hand-owned `## Project Rules & Context`
 * section of the root `CLAUDE.md` (then `sync-codex` refreshes `AGENTS.md`) — but only when it is
 * broad, short, project-specific, not better served by another carrier, and the root has headroom.
 * Every pre-existing destination and gate stays.
 *
 * Coverage:
 *   TC-LCM-001 — the skill carries the "which destination fits" comparison table with every carrier.
 *   TC-LCM-002 — the CLAUDE.md option needs all five conditions, user confirmation of the exact line,
 *                the sync-codex runner, a size/headroom check, and falls back to the other carriers.
 *   TC-LCM-003 — every destination, gate and end task remains, including performance references and
 *                the selection-preserving reference-doc discovery handoff.
 *   TC-LCM-004 — the durable section survives `ai-context-refresh --mode update` (real generator);
 *                a note inside a generated fence does not — which is why the skill names the section.
 *   TC-LCM-005 — the project-skill-protocol pointer and the docs describe the new destination.
 *
 * Portability: TC-LCM-004 builds its own document in memory. The other rows assert this framework
 * repository's own skill text and are skipped in any other project (framework-repo signal). Paths use
 * node:path; nothing is OS-specific. The Codex projection side is covered by
 * `.claude/scripts/codex/tests/project-rules-projection.test.mjs`.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own learn skill text (framework-repo signal)';

const read = (...parts) => fs.readFileSync(path.join(REPO_ROOT, ...parts), 'utf8').replace(/\r\n/g, '\n');
const learn = () => read('.claude', 'skills', 'learn', 'SKILL.md');

/** The text of the "Project Root Context Route" section, up to the next `###` heading. */
function rootRouteSection(text) {
    const start = text.indexOf('### Project Root Context Route (CLAUDE.md) (BLOCKING)');
    assert.ok(start >= 0, 'learn has the Project Root Context Route section');
    const end = text.indexOf('\n### ', start + 10);
    return text.slice(start, end === -1 ? undefined : end);
}

const tests = [
    {
        name: 'TC-LCM-001 learn carries a "which destination fits" table covering CLAUDE.md, config, reference doc, overlay, lessons.md and the universal-rule exclusion',
        skip: SKIP,
        fn: () => {
            const section = rootRouteSection(learn());
            assert.match(section, /\*\*Which destination fits:\*\*/);
            const table = section.slice(section.indexOf('**Which destination fits:**'), section.indexOf('**Durable home'));
            // Broad + short project rule → root CLAUDE.md, then sync-codex
            assert.match(table, /Broad \+ short \+ project-specific[^\n]*root `CLAUDE\.md`[^\n]*`## Project Rules & Context`[^\n]*`sync-codex`/);
            // Machine-readable fact → config via /project-config
            assert.match(table, /Machine-readable project fact[^\n]*`docs\/project-config\.json` via `\/project-config`/);
            // Detailed / lookup-style → project reference doc
            assert.match(table, /Detailed, niche or lookup-style[^\n]*project reference doc/);
            // One-skill rule → overlay
            assert.match(table, /Rule bound to one skill's own steps[^\n]*`\/project-skill-protocol`/);
            // Catch-all → lessons.md
            assert.match(table, /catch-all lesson[^\n]*`lessons\.md`/);
            // Universal framework rule → NOT a project note
            assert.match(table, /Universal framework rule[^\n]*NOT a project note[^\n]*Static Protocol Lesson[^\n]*framework maintainers/);
        }
    },
    {
        name: 'TC-LCM-002 the CLAUDE.md option needs all five conditions, user confirmation of the exact line, the sync-codex runner, a size check, and falls back to the other carriers',
        skip: SKIP,
        fn: () => {
            const text = learn();
            const section = rootRouteSection(text);
            // All five conditions, one row each, each naming its fallback carrier
            for (const id of ['C1', 'C2', 'C3', 'C4', 'C5']) assert.match(section, new RegExp(`\\| ${id} \\|`), `${id} condition row`);
            assert.match(section, /\*\*Broad\*\*[^\n]*\| one area → its reference doc; one skill → overlay/);
            assert.match(section, /\*\*Short\*\*[^\n]*≤ 3 lines[^\n]*\| detailed[^\n]*a project reference doc/);
            assert.match(section, /\*\*Project-specific\*\*[^\n]*universal framework rule/);
            assert.match(section, /\*\*No better carrier\*\*[^\n]*reference doc[^\n]*skill overlay[^\n]*project-config\.json/);
            assert.match(section, /\*\*Headroom\*\*[^\n]*32768 bytes[^\n]*ROOT_OVERFLOW[^\n]*\| a project reference doc/);
            // The size budget matches the generator's own overflow threshold (one number, two places)
            const generator = read('.claude', 'skills', 'ai-context-refresh', 'scripts', 'generate-claude-md.cjs');
            assert.match(generator, /bytes > 32768/, 'the generator still warns at 32768 bytes');
            // Consent: exact line + target section shown, ask user question tool, nothing written on reject
            assert.match(section, /\*\*Confirm \(BLOCKING\)\*\*[^\n]*`ask user question tool`[^\n]*`\(Recommended\)`/);
            assert.match(section, /Show the exact proposed line, the target section, and `size before → after \/ 32768`/);
            assert.match(section, /A rejected or unanswered question writes nothing/);
            assert.match(text, /NEVER silently self-edit an instruction file/);
            // Write only the hand-owned section, never a generated fence
            assert.match(section, /Edit only the hand-owned section; never touch a fence, a `CK:\*` block, or generated text/);
            // sync-codex runner (platform-neutral node entry), after the end tasks, failure handling
            assert.match(section, /node \.claude\/skills\/sync-codex\/scripts\/run-codex-sync\.mjs --skip=claude-md/);
            assert.ok(fs.existsSync(path.join(REPO_ROOT, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs')), 'the named runner exists');
            assert.match(section, /If the runner fails, keep the task open, report the failing stage and the recovery command, and do not claim the mirrors are current/);
            // Read-only verification: size, fence placement, AGENTS.md carries it, changed mirrors reported
            assert.match(section, /re-measure `CLAUDE\.md` bytes ≤ 32768/);
            assert.match(section, /lies outside every `<!-- SECTION:… -->` fence/);
            assert.match(section, /the line appears in `AGENTS\.md`/);
            assert.match(section, /git status --short AGENTS\.md \.codex \.agents \.opencode/);
            // Fallback when headroom or candidacy fails
            assert.match(section, /C5 fails → say so and fall back/);
            assert.match(section, /No `CLAUDE\.md` yet → not a candidate/);
        }
    },
    {
        name: 'TC-LCM-003 every pre-existing destination, gate and end task of /learn is still present',
        skip: SKIP,
        fn: () => {
            const text = learn();
            // The three triage gates keep their questions
            for (const gate of ['**Value**', '**Recurrence**', '**Auto-fix**']) assert.ok(text.includes(gate), `${gate} gate present`);
            assert.match(text, /\*\*All three gates must pass\.\*\*/);
            // Existing destinations: reference-doc catalog + routing table, lessons.md, config, overlay, static protocol
            assert.match(text, /## Reference Doc Catalog \(READ before routing\)/);
            assert.match(text, /### Routing Table/);
            for (const doc of ['code-review-rules.md', 'backend-patterns-reference.md', 'integration-test-reference.md', 'project-structure-reference.md', 'lessons.md']) {
                assert.ok(text.includes('`' + doc + '`'), `${doc} still routable`);
            }
            // Each table must independently route performance lessons; a mention elsewhere is insufficient.
            const catalog = text.slice(text.indexOf('## Reference Doc Catalog (READ before routing)'), text.indexOf('\n### Also a routing destination:'));
            const routing = text.slice(text.indexOf('\n### Routing Table'), text.indexOf('\n### Prevention Depth Assessment'));
            assert.match(catalog, /^\| `performance-test-reference\.md`[^\n]*performance\/load\/soak\/capacity tests[^\n]*`\/scan --target=performance-tests`/m, 'catalog names the performance carrier, read trigger and scan owner');
            assert.match(routing, /^\| Performance\/load\/stress\/soak\/capacity tests[^\n]*\| `performance-test-reference\.md`[^\n]*preferences[^\n]*existing harness guides/m, 'routing preserves project preferences and existing harness owners');
            assert.match(catalog, /supported carriers, not mandatory files/, 'catalog does not require every supported reference');
            assert.match(catalog, /preserve an existing authoritative project guide/i, 'existing guides remain viable owners');
            assert.match(catalog, /compare viable alternatives[^\n]*new file or selection/i, 'carrier choice explains alternatives and their discovery cost for every reference');
            const introduction = catalog.slice(0, catalog.indexOf('\n| File'));
            assert.match(introduction, /`session-init-docs\.cjs`[^\n]*missing selected references[^\n]*placeholders/, 'introduction names the hook and its selected placeholder scope');
            assert.match(introduction, /`\/scan --target=<key>`[^\n]*manual guides remain owner-maintained/, 'introduction names scan ownership without imposing it on manual guides');
            assert.match(introduction, /Routing is static[^\n]*\*\*Read Trigger\*\*/, 'introduction explains task-triggered lookup');
            assert.doesNotMatch(introduction, /performance/i, 'catalog introduction applies to all reference categories');
            // Saving prose is complete only when the selected carrier is initialized and discoverable.
            const decision = text.slice(text.indexOf('\n### Routing Decision Process'), text.indexOf('\n### Format by Target File'));
            assert.match(decision, /reference doc\/guide[^\n]*Reference-doc handoff/, 'confirmed reference saves invoke the handoff');
            assert.match(decision, /\*\*Reference-doc handoff \(before marking learned\):\*\*/);
            const handoff = decision.slice(decision.indexOf('**Reference-doc handoff (before marking learned):**'));
            assert.match(handoff, /Update an existing owner in place[^\n]*optional[^\n]*another guide/, 'an existing authoritative guide does not force a new conventional file');
            assert.match(handoff, /new or unselected reference[^\n]*discovery changes[^\n]*Carrier Choice proposal/, 'new discovery work is explained before carrier selection');
            assert.match(handoff, /Preserve explicit `referenceDocs` selections, including `\[\]`/, 'explicit empty or subset selections remain authoritative');
            assert.match(handoff, /user-approved selection changes[^\n]*`\/project-config`[^\n]*never silently append/, 'selection changes use the approved config owner');
            assert.match(handoff, /docs-manager\/SKILL\.md[^\n]*--mode=init[^\n]*scan\/SKILL\.md[^\n]*selected scan owner/, 'initialization and scanning use their declared owners');
            assert.match(handoff, /header-only file[^\n]*does not complete initialization/, 'a placeholder is not initialized guidance');
            assert.match(handoff, /docs index[^\n]*Doc Lookup[^\n]*owners[^\n]*\/scan --target=docs-index[^\n]*\/ai-context-refresh/, 'index and generated root routing reconcile through their owners');
            assert.match(handoff, /Verify[^\n]*future task[^\n]*actual saved path/, 'future task discovery is verified');
            assert.match(handoff, /Missing initialization or discovery[^\n]*pending[^\n]*do not claim[^\n]*learned/, 'unresolved discovery cannot be reported as learned');
            const behavior = text.slice(text.indexOf('\n## Behavior'), text.indexOf('\n## Auto-Inferred Activation'));
            assert.match(behavior, /`\/learn list`[^\n]*selected reference docs[^\n]*explicitly routed project guides/, 'listing uses the actual selected and routed carriers');
            assert.doesNotMatch(behavior, /\bALL \d+ (?:target files|reference docs)\b/i, 'listing does not impose a hardcoded catalog size');
            assert.match(behavior, /\*\*File creation\*\*[^\n]*New reference targets[^\n]*Reference-doc handoff/, 'new reference creation cannot bypass initialization and discovery');
            assert.match(text, /### Skill-Specific Project-Protocol Route \(BLOCKING\)/);
            assert.match(text, /\/project-skill-protocol add/);
            assert.match(text, /Also a routing destination: `docs\/project-config\.json`/);
            assert.match(text, /### Static Protocol Lesson Promotion \(MANDATORY evaluation\)/);
            // The promotion names the SYNC block that exists today (a stale block name sends the agent to a block that is gone)
            assert.ok(!text.includes('ai-mistake-prevention:full'), 'learn must not name the retired ai-mistake-prevention:full block');
            assert.match(text, /under the `ai-mistake-prevention` SYNC block \(published to `\.claude\/skills\/shared\/protocols\/ai-mistake-prevention\.md`\)/);
            assert.ok(fs.existsSync(path.join(REPO_ROOT, '.claude', 'skills', 'shared', 'protocols', 'ai-mistake-prevention.md')), 'the named protocol file exists');
            // Budget for lessons.md and the Prevention Depth assessment
            assert.match(text, /\*\*Hard limit:\*\* 20000 characters/);
            assert.match(text, /### Prevention Depth Assessment \(MANDATORY before saving\)/);
            // The generalize-first quality gate and the three mandatory end tasks
            assert.match(text, /### Lesson Quality Gate \(BLOCKING — generalize before you save\)/);
            assert.match(text, /\*\*Mandatory end tasks[^\n]*\(in order\):\*\*/);
            assert.match(text, /Run \*\*Learn Review\*\*/);
            assert.match(text, /Run `\/why-review`/);
            assert.match(text, /Run the carrier-specific final quality pass[^\n]*`\/prompt-enhance <modified-prose-file>`[^\n]*owner parser\/schema validation after the final configuration write/);
            assert.match(text, /Machine-readable configuration[^\n]*NEVER pass it to the Markdown enhancer/);
            // Explicit commands keep working
            for (const command of ['/learn list', '/learn remove <N>', '/learn clear', '/learn trim']) assert.ok(text.includes(command), `${command} still documented`);
            // Auto-inferred activation keeps its confirmation
            assert.match(text, /\*\*confirm with the user before saving\*\*/);
        }
    },
    {
        name: 'TC-LCM-004 the hand-owned section survives a marker-managed update; a note inside a generated fence is overwritten',
        fn: () => {
            // Given the real generator's update renderer
            const { updateMarkedSections } = require('../../../skills/ai-context-refresh/scripts/generate-claude-md.cjs');
            const existing = [
                '# Title',
                '',
                '<!-- SECTION:dev-commands -->',
                '',
                'STALE_GENERATED_BODY',
                '- **In-fence note:** IN_FENCE_NOTE_SENTINEL',
                '',
                '<!-- /SECTION:dev-commands -->',
                '',
                '## Project Rules & Context',
                '',
                '- HAND_OWNED_NOTE_SENTINEL: every new module is registered first.',
                '',
                'Critical reminders: keep the closing line last.'
            ].join('\n');
            // When the marker-managed sections are regenerated
            const rendered = updateMarkedSections(existing, { 'dev-commands': 'FRESH_GENERATED_BODY' }, () => {});
            // Then the hand-owned section is preserved verbatim, outside every fence, before the closing line
            assert.ok(rendered.includes('## Project Rules & Context\n\n- HAND_OWNED_NOTE_SENTINEL: every new module is registered first.'), 'hand-owned section preserved');
            assert.ok(rendered.indexOf('HAND_OWNED_NOTE_SENTINEL') < rendered.indexOf('Critical reminders:'), 'closing reminders stay last');
            // And the generated fence body is rewritten, dropping anything hand-written inside it
            assert.ok(rendered.includes('FRESH_GENERATED_BODY'), 'fence body regenerated');
            assert.ok(!rendered.includes('STALE_GENERATED_BODY'), 'stale generated body replaced');
            assert.ok(!rendered.includes('IN_FENCE_NOTE_SENTINEL'), 'a note written inside a fence is lost on update');
        }
    },
    {
        name: 'TC-LCM-005 the project-skill-protocol pointer, the ai-context-refresh rules and the docs describe the CLAUDE.md destination',
        skip: SKIP,
        fn: () => {
            assert.match(read('.claude', 'skills', 'project-skill-protocol', 'SKILL.md'), /not an overlay: `\/learn` routes it to the root `CLAUDE\.md` project-rules section or a reference doc/);
            assert.match(read('.claude', 'skills', 'ai-context-refresh', 'SKILL.md'), /Hand-owned project notes: `\/learn` writes[^\n]*`## Project Rules & Context`[^\n]*outside every marker fence/);
            assert.match(read('.claude', 'docs', 'skills', 'README.md'), /broad short project rules route to the root `CLAUDE\.md` project-rules section/);
            assert.match(read('.claude', 'docs', 'quick-start.md'), /`## Project Rules & Context` section of the root `CLAUDE\.md`/);
            // The projection whitelist names the heading /learn writes
            assert.match(read('.claude', 'scripts', 'codex', 'sync-context-workflows.mjs'), /\^## Project Rules & Context\$/);
        }
    }
];

module.exports = { name: 'learn-claude-md-destination', tests };
