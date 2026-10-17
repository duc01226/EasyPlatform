import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const verifierPath = path.resolve(thisDir, '..', 'verify-skill-protocol-compliance.mjs');
const {
    checkDebuggerTraceCoverage,
    checkOrphanHeadings,
    formatMirrorRemediation,
    countOccurrences,
    checkCompactAgentsProjection,
    checkNoUniversalProtocolText,
    checkManualOnlyPolicy,
    AGENTS_ROOT_LIMIT_BYTES,
    CODEX_IMPLICIT_OFF_RE,
    DEBUGGER_TRACE_REQUIRED_SOURCE_PATHS,
    DEBUGGER_TRACE_TAG,
    GUIDE_BLOCK_HINT,
    guideTagsIn,
    checkGuideCarrierRules,
    missingSnippets
} = await import(pathToFileURL(verifierPath).href);
// The shared P25 recognizer/writer. Fixtures build guide lines through its own writer so the tests
// never restate the line format.
const guideCarrier = createRequire(import.meta.url)('../../lib/protocol-guide-carrier.cjs');

const joinLines = (...lines) => lines.join('\n');

const BOTH_BODIES = joinLines('[CRITICAL-THINKING-MINDSET]', '## Common AI Mistake Prevention (System Lessons)');

// Guard each preserved requirement independently; the standalone verifier cannot import
// the generator because adoption fixtures also load it in isolation and from data URLs.
test('concise Codex preambles retain every execution and authority requirement', async () => {
    const { prependCodexCompatibilityNote } = await import('../compat-rewrite.mjs');
    const note = prependCodexCompatibilityNote('# Original skill body\n');
    assert.deepEqual(missingSnippets(note), []);
    for (const clause of [
        'load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools',
        'Author `.claude/**`; mirrors are generated.',
        'Track steps before execution and keep progress/evidence current.',
        'Explicit skill requests execute their protocol.',
        'Use the native question tool for required questions.',
        'an actually unavailable required capability stops with its step/evidence and a user question before adaptation.',
        'Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.',
        'Preserve protocol order unless the user approves a deviation.',
        'Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.',
    ]) {
        assert.ok(note.includes(clause), `positive control contains ${clause}`);
        assert.deepEqual(missingSnippets(note.replace(clause, '')), [clause], `missing requirement fails: ${clause}`);
    }
});

// A lower-case filename works on Windows but makes a portable export fail on Linux, where the
// canonical skill manifest is `SKILL.md`. Keep the verifier's explicit trace list case-exact.
test('TC-DEBUGTRACE-000: debugger trace source targets use canonical SKILL.md casing', () => {
    assert.ok(DEBUGGER_TRACE_REQUIRED_SOURCE_PATHS.includes('.claude/skills/why-review/SKILL.md'));
    assert.ok(!DEBUGGER_TRACE_REQUIRED_SOURCE_PATHS.includes('.claude/skills/why-review/skill.md'));
});

// The gate measures a projection it does not build, so its budget must equal the GENERATOR's. Those
// two constants cannot be collapsed into one import — the verifier is loaded from a `data:` URL and
// copied into isolated roots without its siblings, so a relative import breaks it (see
// `verifier-root-contract.test.mjs`). This cross-producer assertion is what replaces the import:
// they already drifted once, the generator raising its budget to project the anti-hallucination
// protocol into the Codex root while this gate kept the old number and failed the generator's own
// output. Reading the value from each module independently is the point — deriving one from the
// other would only ask a single source whether it agrees with itself.
test('TC-CTXP-035e: the projection budget matches the generator that produces the projection', async () => {
    const generatorPath = path.resolve(thisDir, '..', 'sync-context-workflows.mjs');
    const generator = await import(pathToFileURL(generatorPath).href);
    assert.equal(
        AGENTS_ROOT_LIMIT_BYTES,
        generator.AGENTS_ROOT_LIMIT_BYTES,
        'verify-skill-protocol-compliance.mjs and sync-context-workflows.mjs must agree on the AGENTS.md root budget'
    );
});

// Same cross-producer rule for the Codex manual-only policy: the generator writes `agents/openai.yaml` and
// accepts a skill-owned one by the shared lib pattern, while this self-contained gate keeps a local copy.
// If they drift, the gate rejects the generator's own output or passes a policy the generator refuses.
test('TC-CTXP-035h: the manual-only policy pattern matches the generator\'s shared constant', async () => {
    const shared = await import(pathToFileURL(path.resolve(thisDir, '..', '..', 'lib', 'agent-frontmatter.mjs')).href);
    assert.equal(CODEX_IMPLICIT_OFF_RE.source, shared.CODEX_IMPLICIT_OFF_RE.source);
    assert.equal(CODEX_IMPLICIT_OFF_RE.flags, shared.CODEX_IMPLICIT_OFF_RE.flags);
    assert.ok(CODEX_IMPLICIT_OFF_RE.test('policy:\n  allow_implicit_invocation: false\n'));
    assert.ok(!CODEX_IMPLICIT_OFF_RE.test('policy:\n  allow_implicit_invocation: true\n'));
});

// Codex ignores `disable-model-invocation`, so the openai.yaml policy is the ONLY thing keeping a
// manual-only skill from being self-started there. The gate reads real mirror paths, so the branch is
// driven through its extracted predicate.
test('TC-CTXP-035i: a manual-only skill fails unless its Codex policy turns implicit invocation off', () => {
    const rel = path.join('.agents', 'skills', 'sample-skill', 'SKILL.md');

    // Given a manual-only skill with no agents/openai.yaml (the caller passes '')
    // When the policy is checked
    const missing = checkManualOnlyPolicy(true, '', rel);
    // Then it fails and names the skill and the missing setting
    assert.ok(missing, 'a manual-only skill without a policy file must fail');
    assert.ok(missing.startsWith(rel));
    assert.match(missing, /allow_implicit_invocation: false/);

    // Given a manual-only skill whose policy still allows implicit invocation
    // When the policy is checked
    // Then it fails
    assert.ok(checkManualOnlyPolicy(true, 'policy:\n  allow_implicit_invocation: true\n', rel),
        'allow_implicit_invocation: true must fail for a manual-only skill');

    // Given a manual-only skill whose policy turns implicit invocation off
    // When the policy is checked
    // Then it passes
    assert.equal(checkManualOnlyPolicy(true, 'policy:\n  allow_implicit_invocation: false\n', rel), null);

    // Given a skill the model may invoke (flag false or absent)
    // When it has no policy file
    // Then no policy is required
    assert.equal(checkManualOnlyPolicy(false, '', rel), null);
    assert.equal(checkManualOnlyPolicy(undefined, '', rel), null);
});

// The predicate alone cannot prove the CLI still calls it, so run a copied verifier against a temp
// fixture project. The fixture is deliberately skeletal: other structural failures are expected, and
// only the manual-only line is the oracle.
test('TC-CTXP-035j: the verifier CLI reports a manual-only mirror without its Codex policy', () => {
    const temp = fsSync.mkdtempSync(path.join(os.tmpdir(), 'ck-manual-only-'));
    try {
        const write = (rel, text) => {
            const target = path.join(temp, rel);
            fsSync.mkdirSync(path.dirname(target), { recursive: true });
            fsSync.writeFileSync(target, text);
        };
        const copy = rel => write(rel, fsSync.readFileSync(path.resolve(thisDir, '..', '..', '..', '..', rel), 'utf8'));
        copy('.claude/scripts/codex/verify-skill-protocol-compliance.mjs');
        copy('.claude/scripts/lib/project-root.cjs');
        write('docs/project-config.json', JSON.stringify({ project: { name: 'fixture' } }));
        const skill = '---\nname: manual-sample\ndescription: Fixture skill.\ndisable-model-invocation: true\n---\n\nBody.\n';
        write('.claude/skills/manual-sample/SKILL.md', skill);
        write('.agents/skills/manual-sample/SKILL.md', skill);

        const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
        Object.assign(env, { CLAUDE_PROJECT_DIR: temp, HOME: temp, USERPROFILE: temp, TMPDIR: temp, TEMP: temp, TMP: temp });
        const run = () => {
            const result = spawnSync(process.execPath, [path.join(temp, '.claude/scripts/codex/verify-skill-protocol-compliance.mjs')],
                { cwd: temp, env, encoding: 'utf8', timeout: 60000 });
            assert.equal(result.error, undefined);
            return result.stdout + result.stderr;
        };
        const policyFailure = /manual-sample[\\/]SKILL\.md is manual-only \(disable-model-invocation: true\) but agents\/openai\.yaml/;

        // Given a manual-only mirror with no agents/openai.yaml
        // When the verifier runs
        // Then it reports the missing policy
        assert.match(run(), policyFailure);

        // Given the same mirror with a policy that turns implicit invocation off
        write('.agents/skills/manual-sample/agents/openai.yaml', 'policy:\n  allow_implicit_invocation: false\n');
        // When the verifier runs
        // Then the manual-only failure is gone
        assert.doesNotMatch(run(), policyFailure);
    } finally {
        fsSync.rmSync(temp, { recursive: true, force: true });
    }
});

// A skill may keep opt-in npm dependencies in its own folder (installed from inside it: `cd .claude/skills/<name> && npm install`).
// Packages there can ship their own SKILL.md and other .md files; the mirror generator never copies node_modules, so
// the verifier must not treat those files as source skills or guide carriers either, or the documented setup breaks
// the gate. Builds a skeletal source + mirror tree plus `extraFiles`, runs the verifier, returns its combined output.
function runVerifierWithSkillLocalPackage(extraFiles) {
    const temp = fsSync.mkdtempSync(path.join(os.tmpdir(), 'ck-node-modules-'));
    try {
        const write = (rel, text) => {
            const target = path.join(temp, rel);
            fsSync.mkdirSync(path.dirname(target), { recursive: true });
            fsSync.writeFileSync(target, text);
        };
        const copy = rel => write(rel, fsSync.readFileSync(path.resolve(thisDir, '..', '..', '..', '..', rel), 'utf8'));
        copy('.claude/scripts/codex/verify-skill-protocol-compliance.mjs');
        copy('.claude/scripts/lib/project-root.cjs');
        copy('.claude/scripts/lib/protocol-guide-carrier.cjs');
        write('docs/project-config.json', JSON.stringify({ project: { name: 'fixture' } }));
        const skill = '---\nname: dep-sample\ndescription: Fixture skill.\n---\n\nBody.\n';
        write('.claude/skills/dep-sample/SKILL.md', skill);
        write('.agents/skills/dep-sample/SKILL.md', skill);
        for (const [rel, text] of Object.entries(extraFiles)) write(rel, text);

        const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
        Object.assign(env, { CLAUDE_PROJECT_DIR: temp, HOME: temp, USERPROFILE: temp, TMPDIR: temp, TEMP: temp, TMP: temp });
        const result = spawnSync(process.execPath, [path.join(temp, '.claude/scripts/codex/verify-skill-protocol-compliance.mjs')],
            { cwd: temp, env, encoding: 'utf8', timeout: 60000 });
        assert.equal(result.error, undefined);
        return `${result.stdout}${result.stderr}`;
    } finally {
        fsSync.rmSync(temp, { recursive: true, force: true });
    }
}

test('TC-CTXP-035k: SKILL.md files inside a skill-local node_modules are not scanned as skills', () => {
    // Given a dependency package, installed only on the source side, that ships a SKILL.md with an orphan heading
    // When the verifier runs
    const output = runVerifierWithSkillLocalPackage({
        '.claude/skills/dep-sample/node_modules/some-dep/skills/bundled/SKILL.md':
            '---\nname: bundled\ndescription: Package-owned.\n---\n\n## Empty\n## Stacked\n',
    });
    // Then no failure names the package's files (the skeletal fixture may fail for other reasons,
    // and the generic remediation text mentions node_modules, so the oracle is the package path)
    assert.doesNotMatch(output, /some-dep|bundled/);
});

// The guide-carrier scan walks every .md under the skills root with a walker of its own, so the skip must
// hold there too. TC-CTXP-035k cannot see that walker: a package SKILL.md without a guide block trips no guide rule.
test('TC-CTXP-035l: .md guide carriers inside a skill-local node_modules are not checked for guide rules', () => {
    const guideCarrier = tag => [
        '# Notes', '', '<!-- PROTOCOL-GUIDES:START -->',
        `- \`${tag}\` — Fixture protocol; always → .claude/skills/shared/protocols/${tag}.md`,
        '<!-- PROTOCOL-GUIDES:END -->', '',
    ].join('\n');
    // Given two guide carriers that name protocols with no projection file: one skill-owned, one package-owned
    // When the verifier runs
    const output = runVerifierWithSkillLocalPackage({
        '.claude/skills/dep-sample/references/own-notes.md': guideCarrier('missing-own-protocol'),
        '.claude/skills/dep-sample/node_modules/some-dep/docs/dep-notes.md': guideCarrier('missing-dep-protocol'),
    });
    // Then the skill-owned carrier is reported, proving the guide scan ran in this fixture ...
    assert.match(output, /own-notes\.md: guide entry names protocol "missing-own-protocol"/);
    // ... and nothing under node_modules is
    assert.doesNotMatch(output, /missing-dep-protocol|some-dep|dep-notes/);
});

// The bounded root's occurrence contract is CONDITIONAL, unlike `.codex/CODEX_CONTEXT.md`'s
// unconditional exactly-once. That asymmetry is the whole point: the context file's copy is baked
// from the canonical shared source and is project-independent, while AGENTS.md's is CLAUDE.md-
// derived through the projection whitelist. An unconditional ">=1" would hard-fail every adopter
// whose CLAUDE.md carries no CK fence — this repo's own PORT-013 fixture is exactly that shape —
// because the whitelist has nothing to project. Drive every branch here: the gate itself reads real
// repo paths, so only the extracted predicate can be fixture-driven.
test('TC-CTXP-035f: no mirror carries universal protocol text; every signature is reported', () => {
    // Project-only text passes.
    assert.deepEqual(checkNoUniversalProtocolText('# Portable project\n\nOur module map.\n', 'AGENTS.md'), []);

    // Both protocol bodies present → each is reported with its count, so Codex never gets a static copy back.
    const both = checkNoUniversalProtocolText(BOTH_BODIES, 'AGENTS.md');
    assert.equal(both.length, 2, 'both blocks must be reported');
    assert.match(both[0], /AGENTS\.md: universal protocol text .*found 1×.*expected 0/);

    // A second copy is counted, not collapsed.
    const dupe = checkNoUniversalProtocolText(joinLines(BOTH_BODIES, BOTH_BODIES), 'AGENTS.md');
    assert.match(dupe[0], /found 2×/);

    // The task-planning lead is a signature too.
    assert.equal(checkNoUniversalProtocolText('Create a small task per change before edits', 'x').length, 1);
});

test('TC-CTXP-035g: loosening the universal-text absence check is killed by its own contract', async () => {
    const source = await fs.readFile(verifierPath, 'utf8');
    const guard = 'if (n > 0) {';
    assert.equal(source.split(guard).length, 2, 'mutation anchor must be unique');
    const mutated = source.replace(guard, 'if (false) {').replaceAll('import.meta.url', JSON.stringify(pathToFileURL(verifierPath).href));
    const verifier = await import(`data:text/javascript;base64,${Buffer.from(mutated).toString('base64')}`);
    const oracle = fn => assert.equal(fn(BOTH_BODIES, 'AGENTS.md').length, 2);
    oracle(checkNoUniversalProtocolText);
    assert.throws(() => oracle(verifier.checkNoUniversalProtocolText), assert.AssertionError);
});

test('TC-CTXP-035d: deleting the retired-block rejection is killed by the retired-marker assertion', async () => {
    const source = await fs.readFile(verifierPath, 'utf8');
    const guard = 'if (agents.includes(marker))';
    assert.equal(source.split(guard).length, 2, 'mutation anchor must be unique');
    const mutated = source.replace(guard, 'if (false)').replaceAll('import.meta.url', JSON.stringify(pathToFileURL(verifierPath).href));
    const verifier = await import(`data:text/javascript;base64,${Buffer.from(mutated).toString('base64')}`);
    const agents = joinLines('<!-- CK:CODEX-ROOT-PROJECTION -->', '<!-- /CK:CODEX-ROOT-PROJECTION -->', '<!-- CODEX-CONTEXT-MIRROR:START -->', '<!-- CODEX-CONTEXT-MIRROR:END -->');
    const oracle = fn => assert.equal(fn(agents).length, 1);
    oracle(checkCompactAgentsProjection);
    assert.throws(() => oracle(verifier.checkCompactAgentsProjection), assert.AssertionError);
});

test('TC-CTXP-035c: a retired context or protocol mirror block in AGENTS.md is a failure', () => {
    const agents = joinLines(
        '<!-- CK:CODEX-ROOT-PROJECTION -->',
        '<!-- /CK:CODEX-ROOT-PROJECTION -->',
        '<!-- CODEX-CONTEXT-MIRROR:START -->',
        'Read `.codex/CODEX_CONTEXT.md` before non-trivial work.',
        '<!-- CODEX-CONTEXT-MIRROR:END -->'
    );
    const failures = checkCompactAgentsProjection(agents);
    assert.equal(failures.length, 1);
    assert.match(failures[0], /retired block CODEX-CONTEXT-MIRROR:START/);
});

// TC-SKILLFIX-001 — orphan: heading immediately followed by a SAME-level heading, no body.
// This is the exact class removed from the plan review mode and why-review (`## X` -> `## Your mission`).
test('TC-SKILLFIX-001: flags `##` immediately followed by `##` with no body', () => {
    const content = joinLines(
        '## Behavioral Delta Matrix (MANDATORY for bugfixes)',
        '',
        '## Your mission',
        '',
        'Real body here.'
    );
    const result = checkOrphanHeadings(content, '.claude/skills/example/SKILL.md');
    assert.ok(result, 'expected an orphan-heading failure');
    assert.match(result, /orphan heading\(s\)/);
    assert.match(result, /line 1:/);
});

// TC-SKILLFIX-001b — shallower transition (`##` -> `#`) is also an orphan.
test('TC-SKILLFIX-001b: flags `##` immediately followed by shallower `#`', () => {
    const content = joinLines('## Orphan Section', '', '# Top Level', '', 'body');
    assert.ok(checkOrphanHeadings(content, 'SKILL.md'));
});

// TC-SKILLFIX-002 — a heading with prose body must pass.
test('TC-SKILLFIX-002: passes a heading that has a body', () => {
    const content = joinLines(
        '## Real Section',
        '',
        'This section has prose body.',
        '',
        '## Next Section',
        '',
        'More body.'
    );
    assert.equal(checkOrphanHeadings(content, 'SKILL.md'), null);
});

// TC-SKILLFIX-003 — section -> subsection nesting (`##` -> `###`) is legitimate. Load-bearing
// guard: the rule must NOT fire here or it would red-line most well-structured skills.
test('TC-SKILLFIX-003: passes legitimate `##` -> `###` nesting', () => {
    const content = joinLines('## Parent Section', '', '### Child Subsection', '', 'Body.');
    assert.equal(checkOrphanHeadings(content, 'SKILL.md'), null);
});

// TC-SKILLFIX-004 — output-format templates document stacked `##` headers inside fenced code
// blocks (e.g. the domain-analysis review mode, planning). Fenced headings must be skipped.
test('TC-SKILLFIX-004: skips stacked headings inside a fenced code block', () => {
    const content = joinLines(
        '## Output Format',
        '',
        '```',
        '## Critical Issues',
        '',
        '## High Priority Issues',
        '',
        '## Positive Observations',
        '```',
        '',
        'Trailing body.'
    );
    assert.equal(checkOrphanHeadings(content, 'SKILL.md'), null);
});

// TC-SKILLFIX-005 — unfenced output templates use `{placeholder}` heading syntax
// (e.g. the architecture review mode and ui-design --mode=review `## Verdict: {PASS | WARN | BLOCKED}`). These are
// intentional and must be skipped.
test('TC-SKILLFIX-005: skips `{placeholder}` output-template headings', () => {
    const content = joinLines(
        '## Verdict: {PASS | WARN | BLOCKED}',
        '',
        '## BLOCKED Findings (Must Fix)',
        '',
        '### {Category}: {description}',
        '',
        '- **File:** {path}:{line}'
    );
    assert.equal(checkOrphanHeadings(content, 'SKILL.md'), null);
});

// Multiple orphans are all reported (cap of 5 shown in the message).
test('TC-SKILLFIX-001c: reports count when several orphans exist', () => {
    const content = joinLines('## A', '', '## B', '', '## C', '', 'body');
    const result = checkOrphanHeadings(content, 'SKILL.md');
    assert.ok(result);
    assert.match(result, /2 orphan heading\(s\)/);
});

test('TC-DEBUGTRACE-001: passes required end-to-start debugger trace coverage', () => {
    const content = joinLines(
        '<!-- SYNC:end-to-start-debugger-trace -->',
        '',
        '> **End-to-Start Debugger Trace**',
        '> observed final state',
        '> Enumerate all feeder paths',
        '> hypothesis matrix',
        '> owning fix layer',
        '> forward convergence proof',
        '',
        '<!-- /SYNC:end-to-start-debugger-trace -->'
    );
    assert.equal(checkDebuggerTraceCoverage(content, '.claude/skills/fix/SKILL.md'), null);
});

test('TC-DEBUGTRACE-002: fails when end-to-start debugger trace gate is missing', () => {
    const content = joinLines('## Debug', '', 'Trace one path from input to error.');
    const result = checkDebuggerTraceCoverage(content, '.claude/skills/fix/SKILL.md');
    assert.ok(result);
    assert.match(result, /missing end-to-start debugger trace gate/);
    assert.match(result, /SYNC:end-to-start-debugger-trace/);
});

// ── Guide carriers (P48) ─────────────────────────────────────────────────────────────────────────
// A guide block with one line per tag, written by the shared writer (never a restated format).
const guideBlock = (...tags) => joinLines(
    guideCarrier.GUIDE_BLOCK_START,
    '',
    ...tags.map(tag => guideCarrier.formatGuideLine({ tag, summary: `Summary of ${tag}`, when: `using ${tag}`, path: `.claude/skills/shared/protocols/${tag}.md` })),
    '',
    guideCarrier.GUIDE_BLOCK_END
);
const TRACE_PROJECTION = joinLines(
    '> **End-to-Start Debugger Trace** — start from the observed final state.',
    '> Enumerate all feeder paths, build the hypothesis matrix, pick the owning fix layer,',
    '> and write the forward convergence proof.'
);

// The lazy loader only asks the recognizer about text that holds this hint, so the hint must stay a
// substring of the recognizer's own block marker — or every guide would silently read as absent.
test('TC-PDL-065a: the guide-block hint stays inside the recognizer\'s block marker', () => {
    assert.ok(guideCarrier.GUIDE_BLOCK_START.includes(GUIDE_BLOCK_HINT));
    assert.deepEqual(guideTagsIn(guideBlock('alpha', 'beta')), ['alpha', 'beta']);
    assert.deepEqual(guideTagsIn('no block here'), []);
});

// Guards: a converted skill that carries the debugger-trace gate as a guide entry still counts as a
// carrier, but only when the projection holds every required snippet — and an agent never does.
test('TC-PDL-065b: debugger-trace coverage accepts a guide carrier backed by its projection', () => {
    const rel = '.claude/skills/fix/SKILL.md';
    // Given a skill that holds a guide entry for the gate instead of its body
    const guided = joinLines('# Fix', '', guideBlock(DEBUGGER_TRACE_TAG));
    // When the projection file holds every snippet, Then the skill passes
    assert.equal(checkDebuggerTraceCoverage(guided, rel, { projectionText: TRACE_PROJECTION }), null);
    // When the projection file lacks a snippet, Then it fails and names the missing snippet
    const thin = checkDebuggerTraceCoverage(guided, rel, { projectionText: TRACE_PROJECTION.replace('hypothesis matrix', 'guess list') });
    assert.match(thin, /guide entry but its projection file lacks snippet\(s\): hypothesis matrix/);
    // When the projection file is missing, Then it fails
    assert.match(checkDebuggerTraceCoverage(guided, rel, { projectionText: null }), /projection file .* is missing/);
    // When the guide entry is also removed (both forms missing), Then the original failure returns
    assert.match(checkDebuggerTraceCoverage('# Fix\n', rel, { projectionText: TRACE_PROJECTION }), /missing end-to-start debugger trace gate/);
    // When an agent carries only a guide (no projection option is offered), Then it fails: agents keep full text
    assert.match(checkDebuggerTraceCoverage(guided, '.claude/agents/code-reviewer.md'), /missing end-to-start debugger trace gate/);
});

test('TC-PDL-032: a guide naming a protocol with no projection file fails', () => {
    // Given a skill whose guide names `ghost`, and no projection for it
    const failures = checkGuideCarrierRules({
        relativePath: '.claude/skills/s/SKILL.md', skillName: 's', content: guideBlock('alpha', 'ghost'),
        inlineSkills: [], projectionExists: tag => tag === 'alpha'
    });
    // When verified, Then only the ghost guide fails, naming the missing projection file
    assert.equal(failures.length, 1);
    assert.match(failures[0], /guide entry names protocol "ghost" but its projection file shared\/protocols\/ghost\.md does not exist/);
});

test('TC-PDL-033: one file carrying the full body and a guide for the same tag fails; a split across files passes', () => {
    const exists = () => true;
    const body = joinLines('<!-- SYNC:alpha -->', '', '> Alpha body.', '', '<!-- /SYNC:alpha -->');
    // Given full text + guide for one tag in the same file, When verified, Then it fails
    const both = checkGuideCarrierRules({ relativePath: '.claude/skills/s/SKILL.md', skillName: 's', content: joinLines(guideBlock('alpha'), '', body), projectionExists: exists });
    assert.equal(both.length, 1);
    assert.match(both[0], /carries both the full <!-- SYNC:alpha --> body and a guide entry for "alpha"/);
    // Given the guide in SKILL.md and the full text in references/r.md, When each file is verified, Then both pass
    assert.deepEqual(checkGuideCarrierRules({ relativePath: '.claude/skills/s/SKILL.md', skillName: 's', content: guideBlock('alpha'), projectionExists: exists }), []);
    assert.deepEqual(checkGuideCarrierRules({ relativePath: '.claude/skills/s/references/r.md', skillName: 's', content: body, projectionExists: exists }), []);
    // A guide for a DIFFERENT tag beside a body is not a both-forms case
    assert.deepEqual(checkGuideCarrierRules({ relativePath: '.claude/skills/s/SKILL.md', skillName: 's', content: joinLines(guideBlock('beta'), '', body), projectionExists: exists }), []);
});

test('TC-PDL-083: a skill listed in inlineSkills fails when it carries any guide entry', () => {
    const args = { relativePath: '.claude/skills/code-quality-review/SKILL.md', skillName: 'code-quality-review', inlineSkills: ['code-quality-review'], projectionExists: () => true };
    // Given S in inlineSkills, When S carries a guide entry, Then the verifier fails naming S
    const failures = checkGuideCarrierRules({ ...args, content: guideBlock('alpha') });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /skill "code-quality-review" is listed in inlineSkills .* carries guide entries: alpha/);
    // When S carries only full bodies, Then it passes
    assert.deepEqual(checkGuideCarrierRules({ ...args, content: '<!-- SYNC:alpha -->\n\n> Alpha.\n\n<!-- /SYNC:alpha -->\n' }), []);
});

// The predicates alone cannot prove the CLI walks the tree and calls them, so run a copied verifier
// over a temp fixture project (the recognizer copied beside it, as in any real install). The fixture
// is deliberately skeletal: unrelated structural failures are expected; the guide lines are the oracle.
test('TC-PDL-032/033/083: the verifier CLI reports each guide-carrier violation in a fixture tree', () => {
    const temp = fsSync.mkdtempSync(path.join(os.tmpdir(), 'ck-guide-carriers-'));
    try {
        const write = (rel, text) => {
            const target = path.join(temp, rel);
            fsSync.mkdirSync(path.dirname(target), { recursive: true });
            fsSync.writeFileSync(target, text);
        };
        const copy = rel => write(rel, fsSync.readFileSync(path.resolve(thisDir, '..', '..', '..', '..', rel), 'utf8'));
        copy('.claude/scripts/codex/verify-skill-protocol-compliance.mjs');
        copy('.claude/scripts/lib/project-root.cjs');
        copy('.claude/scripts/lib/protocol-guide-carrier.cjs');
        write('docs/project-config.json', JSON.stringify({ project: { name: 'fixture' } }));
        write('.claude/skills/shared/protocol-groups.json', JSON.stringify({ inlineSkills: ['keep-inline'] }));
        write('.claude/skills/shared/protocols/alpha.md', '> Alpha body.\n');
        const body = '<!-- SYNC:alpha -->\n\n> Alpha body.\n\n<!-- /SYNC:alpha -->\n';
        write('.claude/skills/guided/SKILL.md', `# Guided\n\n${guideBlock('alpha')}\n`);
        write('.claude/skills/ghost/SKILL.md', `# Ghost\n\n${guideBlock('ghost-tag')}\n`);
        write('.claude/skills/both/SKILL.md', `# Both\n\n${guideBlock('alpha')}\n\n${body}`);
        write('.claude/skills/split/SKILL.md', `# Split\n\n${guideBlock('alpha')}\n`);
        write('.claude/skills/split/references/r.md', body);
        write('.claude/skills/keep-inline/SKILL.md', `# Keep inline\n\n${guideBlock('alpha')}\n`);

        const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
        Object.assign(env, { CLAUDE_PROJECT_DIR: temp, HOME: temp, USERPROFILE: temp, TMPDIR: temp, TEMP: temp, TMP: temp });
        const run = () => {
            const result = spawnSync(process.execPath, [path.join(temp, '.claude/scripts/codex/verify-skill-protocol-compliance.mjs')],
                { cwd: temp, env, encoding: 'utf8', timeout: 60000 });
            assert.equal(result.error, undefined);
            return (result.stdout + result.stderr).split(/\r?\n/).filter(line => /guide entr|carries both the full/.test(line));
        };

        // Given the fixture tree, When the verifier runs
        const lines = run();
        // Then exactly the three violations are reported, each naming its file
        assert.equal(lines.length, 3, lines.join('\n'));
        assert.ok(lines.some(line => /ghost\/SKILL\.md: guide entry names protocol "ghost-tag"/.test(line)));
        assert.ok(lines.some(line => /both\/SKILL\.md: carries both the full <!-- SYNC:alpha -->/.test(line)));
        assert.ok(lines.some(line => /keep-inline\/SKILL\.md: skill "keep-inline" is listed in inlineSkills/.test(line)));

        // Given the inline skill carries only its full body again, When the verifier runs, Then its failure is gone
        write('.claude/skills/keep-inline/SKILL.md', `# Keep inline\n\n${body}`);
        assert.ok(!run().some(line => /keep-inline/.test(line)));
    } finally {
        fsSync.rmSync(temp, { recursive: true, force: true });
    }
});

// TC-REMEDIATE-001 — a FAILing run always points the operator at the sync (never hand-format).
// When the prettier-drift class struck this session, the FAIL output gave NO remediation; this
// locks the actionable guidance in so it can't silently regress to a bare failure list again.
test('TC-REMEDIATE-001: remediation names the sync entrypoints and forbids hand-formatting mirrors', () => {
    const msg = formatMirrorRemediation(['some non-mirror failure']);
    assert.match(msg, /prettier --write/);
    assert.match(msg, /AGENTS\.md/);
    assert.match(msg, /\.prettierignore/);
    // Portability: the remediation must name ONLY the in-bundle runner. It previously named
    // `npm run codex:sync` / `npm run sync:all` FIRST and the standalone path as a fallback — but the
    // reader most likely to hit this gate is a project that copied `.claude` and has no package.json,
    // for whom the headline command simply does not exist. Both the full-surface regenerate and the
    // re-verify command must be present, and no npm script may be named at all.
    assert.match(msg, /run-codex-sync\.mjs --copy-skills/, 'must give the all-surfaces regenerate command');
    assert.match(msg, /run-codex-sync\.mjs --verify-only/, 'must give the re-run-every-gate command');
    assert.doesNotMatch(msg, /npm run /, 'must not name a host npm script an adopting project does not have');
});

// TC-REMEDIATE-002 — a mirror-drift failure adds the drift-specific explainer (the exact failure
// string the mirror verifiers emit: "... content drifted from ...").
test('TC-REMEDIATE-002: mirror-drift failures add the drift-specific explainer', () => {
    const drift = formatMirrorRemediation(['AGENTS.md projection content drifted from CLAUDE.md']);
    assert.match(drift, /reformatted/);
    assert.match(drift, /byte-for-byte/);
    // Non-drift failures must NOT carry the drift-specific lines (keeps the message scoped).
    const nonDrift = formatMirrorRemediation(['SKILL.md missing required debugger trace target']);
    assert.doesNotMatch(nonDrift, /byte-for-byte/);
});

// TC-CTXP-034 — the signature count primitive. The mirrors term-rewrite tool nouns, so the gate counts
// a rewrite-invariant signature instead of byte-comparing. These lock the count primitive: any copy (1 or
// more) of universal protocol text in a mirror is a failure, and zero copies is the contract.
test('TC-CTXP-034a: countOccurrences counts non-overlapping matches, CRLF-normalized', () => {
    const sig = '## Common AI Mistake Prevention (System Lessons)';
    // One copy (the deduped, baked-once case the gate expects to PASS).
    assert.equal(countOccurrences(`prefix\r\n${sig}\r\n- a bullet\r\nmore`, sig), 1);
    // Two copies (an un-deduped mirror — top + bottom CK copies leaked through: gate FAILs).
    assert.equal(countOccurrences(`${sig}\nbody one\n\n${sig}\nbody two`, sig), 2);
    // Zero copies (protocol absent from the mirror entirely: gate FAILs).
    assert.equal(countOccurrences('no protocol here at all', sig), 0);
});

test('TC-CTXP-034b: countOccurrences is non-overlapping and empty-needle safe', () => {
    // Non-overlapping: 'aa' in 'aaaa' is 2, not 3 — advance by needle length, never re-scan a match.
    assert.equal(countOccurrences('aaaa', 'aa'), 2);
    // Empty / nullish needle must be 0, never throw (defensive: a stale-signature config slips through).
    assert.equal(countOccurrences('anything', ''), 0);
    assert.equal(countOccurrences('anything', undefined), 0);
});

// TC-CTXP-035 — AGENTS.md is a bounded pointer/projection, while the full protocol remains in
// CODEX_CONTEXT.md. This prevents a host-size optimisation from silently accepting a truncated
// second copy or a pointer whose context content has changed since generation.
test('TC-CTXP-035: compact AGENTS projection passes with its root projection markers and project information only', () => {
    const agents = joinLines(
        '# Codex Project Instructions',
        '<!-- CK:CODEX-ROOT-PROJECTION -->',
        '## Claude Instructions Mirror (Compact Auto-Synced Projection)',
        '## Doc Lookup — What to Read When',
        '<!-- /CK:CODEX-ROOT-PROJECTION -->'
    );
    assert.deepEqual(checkCompactAgentsProjection(agents), []);
});

test('TC-CTXP-035b: compact AGENTS projection rejects missing markers, universal text and overflow', () => {
    const agents = joinLines(
        BOTH_BODIES,
        // Derived from the constant, not a second copy of the number: pinning the literal here is
        // what made a deliberate budget change look like a test failure instead of a doc update.
        'x'.repeat(AGENTS_ROOT_LIMIT_BYTES + 1)
    );
    const failures = checkCompactAgentsProjection(agents);
    assert.ok(failures.some((failure) => new RegExp(`above the ${AGENTS_ROOT_LIMIT_BYTES}-byte`).test(failure)));
    assert.ok(failures.some((failure) => /bounded root projection markers/.test(failure)));
    assert.ok(failures.some((failure) => /universal protocol text/.test(failure)));
});
