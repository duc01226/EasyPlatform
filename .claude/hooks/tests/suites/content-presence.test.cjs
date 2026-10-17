/**
 * Content-Presence Test Suite
 *
 * Re-homes the parity guarantees that USED to be enforced by the now-deleted
 * context-injection hooks. Those hooks injected guidance at runtime; the guidance
 * now lives statically in CLAUDE.md / agent .md so any host
 * reads identical instructions. These are GENUINE presence asserts — each FAILS
 * if the relocated guidance goes missing. No tautologies (we assert specific
 * load-bearing phrases, not "file is non-empty").
 *
 * Coverage (what THIS suite asserts today):
 *   TC-CP-001 — CLAUDE.md carries the path→reference-doc pointer tables (no route text: the route hook delivers it).
 *   TC-CP-008 — tracked context surfaces carry the route gate without a duplicated catalog.
 *   TC-CP-015 — the canonical route gate carries the brief complexity assessment, the >80%
 *               catalog-fit rule, table precedence, downgrade guards (investigation, spec/doc sync,
 *               test, review) and a declared (never asked) direct or custom route; route examples use canonical
 *               step ids; start-workflow never proposes or asks the user to choose a route.
 *   TC-CP-002 — the universal subagent-bootstrap phrases are present in a
 *               representative sample of agents (one code, one non-code).
 *   TC-CP-003 — agent-code-standards (dev-rules + pattern docs) is present in a
 *               code agent and ABSENT from a non-code agent — the relocated
 *               dev-rules guidance reaches code agents only.
 *   TC-CP-004 — design-system-canonical-guide hook's "read the canonical design-system
 *               doc first for tokens/components/BEM" guidance relocated into the design skill.
 *   TC-CP-006 — ba-refinement-context hook's DoR / hypothesis-validation BA guidance
 *               relocated into the work-item refine mode reference.
 *   TC-CP-007 — graph-grep-suggester hook's post-grep graph hint ("a graph trace can hint at
 *               callers/consumers/events grep may not reveal") relocated into the investigate
 *               skill as OPTIONAL advice, never a mandate.
 *   TC-CP-009 — the integration-test execution-discipline rules (verify the WHOLE system,
 *               never hack seed data / drive through real use-case paths, /investigate --mode=debug
 *               the root cause on failure, 60s runtime cap, loop until green) are present in
 *               EVERY integration-test-family skill (write / review / verify / workflow), so the
 *               family runs/diagnoses/clears a suite identically regardless of entry point.
 *   TC-CP-010 — the test-failure fault-adjudication rules (root-cause first, triangulate the
 *               failure against spec AND source, classify SOURCE-WRONG vs TEST-WRONG, and
 *               ask user question tool when intended behavior is unclear) are present in EVERY
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
 *   TC-CP-016 — the UI-review surface obligations stay wired end to end: the checklist owns the
 *               surface-scope/composition rule, surface-load (B12-B15), container-fit (E9-E11),
 *               forms (§R), dialog-focus (I15) and non-working-control (K10) checks plus the single
 *               severity map; ui-design --mode=review runs Surface Composition + Surface UX passes and writes
 *               per-surface reports; plan (incl. its review mode) binds the UI checklist to front-end plans;
 *               design-spec carries information priority; the calibration set exists. Each phrase
 *               is load-bearing — dropping any one silently lets an overloaded or ancestor-broken
 *               surface pass review again.
 *
 *   TC-GWF-006/058/059/060/041/042/007/010 — the guided workflow flex rules: start-workflow (their single
 *               owner) keeps gate steps fixed, lets core/optional steps flex intent-first with one
 *               deviation-log line each under the baseline runId (closed kind set), keeps data
 *               dependencies and changed-behaviour tests green; workflow-end first checks evidence
 *               for every outcome gate (review-converged via the receipt JSON or a logged cited
 *               report); both review skills read the deviation log; the nested review stays inline.
 *
 *   TC-GWF-019/020/044 — the lean route wrapper (workflow-implement-spec) stops at its gap review on a
 *               vague, contradictory or incomplete spec and escalates to workflow-feature; its plan
 *               scope is anchored to the supplied spec baseline; the two wrapper descriptions route
 *               spec-complete work and spec gaps to opposite routes.
 *
 *   TC-PDL-028 — the shipped hooks guide carries the second-host trust note in one paragraph: a new or
 *               changed delivery step runs only after the user reviews it, the review step (`/hooks`)
 *               is named, the guides deliver until then, and unchanged steps keep their earlier review.
 *
 *   TC-ADS-006 — the commit skill's default message template carries no `Fix-Origin` trailer and no text
 *               claims a sensor or a mandatory trailer (opt-in via `commit.fixOriginTrailer`).
 *   TC-ADS-007 — the commit skill names `commit.fixOriginTrailer`, limits the trailer to new commits only
 *               and never advises rewording existing commits.
 *   TC-ADS-004 — graph-code build mode installs the graph tooling with the cross-OS node `ensurePythonDeps` command
 *               before any graph CLI call, and stops when the install fails.
 *
 *   TC-ADS-008 — the command-only utility skills (decision D-2) each declare exactly one
 *               `disable-model-invocation: true` in frontmatter, and `commit` / `learn` / `git-conflict-resolve` / `sync-codex` stay
 *               model-callable. Framework-repo guarded (synchronous signal + parity tripwire):
 *               it asserts this repo's own skill defaults, which an adopting project may change.
 *
 *   TC-HTMLX-052 — the skills that run html-export's script by path (presentation-builder,
 *               feature-presentation), the work-item mockup mode reference and the design motion-storyboard reference carry one
 *               identical `**html-export exit rule:**` line whose codes (0, 4, 3, 1/2 + NOT
 *               VERIFIABLE) are exactly the values of `EXIT` in html-export/scripts/lib/exit-codes.cjs;
 *               the design explore workflow's `| Exit |` table routes exactly those codes with the
 *               same actions (1 and 2 in one tool-failure row); and the script path they name exists.
 *               The callers are prose, so no code import catches a drift. Framework-repo guarded; a
 *               fixture row proves the table check names each kind of drift.
 *
 *   TC-ADS-025 — emphasis diet (P32) keeps the primacy/recency anchors: in each G3-selected skill the
 *               top region (the STEP-TASK anchor block through the end of `## Quick Summary`) and the
 *               `## Closing Reminders` section keep at least their recorded emphasis-marker counts
 *               (MUST/NEVER/CRITICAL/IMPORTANT/BLOCKING, SYNC bodies and frontmatter excluded), so an
 *               anchors-only body edit can never strip the anchors themselves. A fixture row proves the
 *               rule names each stripped anchor; the live row is framework-repo guarded.
 *
 *   TC-PD-001..012, 062 — one deck standard owned by presentation-builder
 *               (spec: docs/specs/Presentation/README.PresentationDecks.md §8). The validator's no-profile
 *               verdict equals `presenter` (001); `review` demotes EXACTLY the five editing checks (002)
 *               and nothing else — a 7-slide deck with no overview control errors in both (004); missing or
 *               blank notes fail both profiles (003); the validator CLI refuses any profile name but exactly
 *               presenter/review with exit 2 and no verdict, and exits 1 with FAIL on a failing deck (005);
 *               every verdict names its profile (006); the feature-presentation review-deck scaffold passes
 *               `review` with Say/Why/Question notes on every slide, no editing control (no contenteditable
 *               markup, no designMode) and its key states, an empty demo dropping its Simulated note behind an
 *               iframe guard, and still passes with the §3b wireframe demo spliced in (007 + 022 + 062), loads
 *               no outside asset (009) and keeps job-named slide ids its deck__slide route and html-export's
 *               default selector both find (010); FP's Step 8 blocks hand-off on `--profile=review` and its
 *               Step 6 outside-asset scan regex, applied case-insensitively, flags every network-load shape
 *               (a font-only mockup included) and no plain link or data-src (008 + 013); the generator warns
 *               only on the default look (011); PB, FP and design explore keep the design-authority, deck-kind
 *               and slide hand-off routes, with the tokens and journey-fix sections of the explore gate files
 *               (012 + 061). The review-deck engine itself runs in node:vm against a fake page: long slides
 *               scroll first, each slide opens at its top, a held key stops at the edge, notes take the keys
 *               only after Tab, Shift+Space goes back (062); presentation-builder's skill-local test files run
 *               as child processes and must exit 0 (062 + 011).
 *               Framework-repo guarded: they assert this repo's own presentation skills.
 *
 * The 3 per-context inject hooks (design-system-canonical-guide / ba-refinement-context /
 * graph-grep-suggester) are now presence-asserted by TC-CP-004, TC-CP-006 and TC-CP-007
 * against the verbatim load-bearing phrases their guidance relocated to. A future skill edit
 * that drops a relocated block fails the matching TC, restoring cross-host parity.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { assertTrue } = require('../lib/assertions.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR;
const AGENTS_DIR = path.resolve(PROJECT_DIR, '.claude', 'agents');
const SKILLS_DIR = path.resolve(PROJECT_DIR, '.claude', 'skills');

const readFile = p => fs.readFileSync(p, 'utf8');
// The route cases assert the gate of the default (compatible) delivery profile, whichever profile the
// developer or this checkout selected for their own sessions.
const COMPATIBLE_PROFILE = { config: { contextDelivery: { profile: 'compatible' } } };
const readAgent = name => readFile(path.join(AGENTS_DIR, `${name}.md`));
const readSkill = name => readFile(path.join(SKILLS_DIR, name, 'SKILL.md'));

// TC-CP-009/-010 carrier rule (R2-19). A family skill holds each pinned fragment inline in SKILL.md,
// OR carries the protocol as a guide entry (shared P25 recognizer, never a copied line format) while
// `<skills root>/shared/protocols/<tag>.md` holds the fragment. Returns one line per missing rule,
// naming the skill and the rule. The fragment and family-skill lists belong to each test.
const guideCarrier = require(path.join(__dirname, '..', '..', '..', 'scripts', 'lib', 'protocol-guide-carrier.cjs'));
function familyRuleGaps(skillsDir, familySkills, tag, rules) {
    const projectionFile = path.join(skillsDir, 'shared', 'protocols', `${tag}.md`);
    const projection = fs.existsSync(projectionFile) ? readFile(projectionFile) : '';
    const missing = [];
    for (const skill of familySkills) {
        // An entry ending in `.md` names a mode reference (relative to the skills root) that holds the family rules for one mode of a skill.
        const body = readFile(skill.endsWith('.md') ? path.join(skillsDir, ...skill.split('/')) : path.join(skillsDir, skill, 'SKILL.md'));
        const guided = guideCarrier.hasGuideEntry(body, tag);
        for (const [rule, phrase] of Object.entries(rules)) {
            if (!body.includes(phrase) && !(guided && projection.includes(phrase))) {
                missing.push(`${skill} → missing rule "${rule}" ("${phrase}")`);
            }
        }
    }
    return missing;
}

// Self-check guard for assertions about this framework repo's own skill defaults: the shared
// synchronous CJS guard (an async guard in a CJS suite reports a false pass). The tripwire test
// below proves it resolves exactly like .claude/scripts/codex/tests/framework-repo.helper.mjs for
// every CJS suite that uses it.
const frameworkRepoGuard = require('../lib/framework-repo-guard.cjs');
const FRAMEWORK_REPO_HELPER = frameworkRepoGuard.frameworkRepoHelperPath(PROJECT_DIR);
const IS_FRAMEWORK_REPO = frameworkRepoGuard.isFrameworkRepo(PROJECT_DIR);

// Owner decision D-2 (command-only utilities): plain utility skills that no workflow, agent preload,
// Skill call or hook starts are manual-only — the user runs them as `/name` (`$name` on Codex), the
// model never self-triggers them. `commit`, `learn`, `git-conflict-resolve` and `sync-codex` stay model-callable (an agent
// preloads `commit`; `learn` auto-activates by design; the agent resolves conflicts from its own pull-before-commit step and
// regenerates the host mirrors once the framework source is final).
const COMMAND_ONLY_UTILITIES = [
    'custom-agent', 'docx-convert', 'pdf-convert', 'playwright-cli',
    'presentation-builder', 'remotion', 'sync-skills-shared-protocols', 'release-doc',
    'git-developer-performance', 'skill-creator', 'scan-codebase-health',
    'project-help', 'custom-prompt',
];
const MODEL_CALLABLE_BY_DECISION = ['commit', 'learn', 'git-conflict-resolve', 'sync-codex'];

// TC-HTMLX-052. Skills that run html-export's script by path and restate its exit rule in prose.
const HTML_EXPORT_CALLERS = ['presentation-builder', 'feature-presentation'];
// Skills renamed with the work-tracker vocabulary: [former name, current name].
const RENAMED_TRACKING_SKILLS = [
    ['pbi', 'work-item'],
    ['idea', 'initiative'],
    ['workflow-idea-to-pbi', 'workflow-planned-work'],
    ['workflow-spec-to-pbi', 'workflow-planned-work'],
    ['workflow-idea-to-spec', 'workflow-planned-work'],
    // The three planning workflows merged into one with a mode each (P41).
    ['workflow-initiative-to-task', 'workflow-planned-work'],
    ['workflow-initiative-to-spec', 'workflow-planned-work'],
    ['workflow-spec-to-task', 'workflow-planned-work'],
];
// Skill reference files (relative to the skills root) that carry the same one-line rule.
const HTML_EXPORT_CALLER_REFERENCES = ['ui-design/references/lane-marketing/motion-storyboard.md', 'work-item/references/mode-mockup.md'];
// Skill reference files that restate the rule as a `| Exit | ... |` table with their own actions.
const HTML_EXPORT_EXIT_TABLES = ['ui-design/references/explore/workflow.md'];
const HTML_EXPORT_EXIT_RULE = /\*\*html-export exit rule:\*\*[^\r\n]*/g;
const HTML_EXPORT_SCRIPT = '.claude/skills/html-export/scripts/export.cjs';

// TC-HTMLX-052 (table form). Returns one line per way the first `| Exit |` table in `markdown`
// drifts from the canonical caller rule: its first column must list exactly the EXIT values, exit 1
// and 2 share one tool-failure row, and each row keeps the action the rule gives that code.
function htmlExportExitTableDefects(markdown, EXIT) {
    const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
    const header = lines.findIndex(line => /^\|\s*Exit\s*\|/.test(line));
    if (header === -1) return ['no `| Exit |` table'];
    const rows = [];
    for (let i = header + 2; i < lines.length && lines[i].startsWith('|'); i++) {
        const cells = lines[i].split('|').slice(1, -1).map(cell => cell.trim());
        rows.push({ codes: (cells[0].match(/\d+/g) || []).map(Number), text: cells.slice(1).join(' | ') });
    }
    const defects = [];
    const byNumber = (a, b) => a - b;
    const codes = Object.values(EXIT).sort(byNumber);
    const listed = rows.flatMap(row => row.codes).sort(byNumber);
    if (JSON.stringify(listed) !== JSON.stringify(codes)) {
        defects.push(`table routes codes ${JSON.stringify(listed)}, EXIT has ${JSON.stringify(codes)}`);
    }
    const rowFor = code => rows.find(row => row.codes.includes(code));
    const toolFailure = [/tool failure/i, /`NOT VERIFIABLE`/, /never count it as a design defect or a pass/i];
    const required = [
        [EXIT.OK, [/evidence/i]],
        [EXIT.PAGE_ERROR, [/\bfix the\b/i, /\bre-(?:run|render)\b/i]],
        [EXIT.DEPENDENCY, [/`NOT VERIFIABLE`/, /never run an? install/i]],
        [EXIT.ERROR, toolFailure],
        [EXIT.USAGE, toolFailure],
    ];
    for (const [code, patterns] of required) {
        const row = rowFor(code);
        if (!row) continue;
        for (const pattern of patterns) if (!pattern.test(row.text)) defects.push(`exit ${code} row lacks ${pattern}`);
    }
    if (rowFor(EXIT.ERROR) !== rowFor(EXIT.USAGE)) defects.push(`exit ${EXIT.ERROR} and ${EXIT.USAGE} must share one tool-failure row`);
    return defects;
}

// TC-ADS-025 (emphasis diet). The five most emphasis-dense step skills of the four annotated
// workflows (feature, bugfix, refactor, big-feature: top five by markers per KB of own body),
// each with the emphasis-marker counts its two anchors held when selected. An anchors-only (G2) edit
// changes body prose only; lowering a floor is a deliberate anchor change, never a side effect.
// The floors count the skill's OWN closing text: the universal protocols are hook-delivered and no skill carries
// their reminders or a protocols-in-force digest, so their markers are not part of a skill's anchor.
const EMPHASIS_MARKERS = /\b(?:MUST|NEVER|CRITICAL|IMPORTANT|BLOCKING)\b/g;
const EMPHASIS_ANCHOR_FLOORS = {
    'source-deep-dive': { top: 12, closing: 45 },
    'web-research': { top: 7, closing: 35 },
    'business-evaluation': { top: 9, closing: 39 },
    // 36 since the mandatory Next Steps menu became a results-based follow-up: one closing line, two markers fewer.
    test: { top: 11, closing: 36 },
    'work-item/references/mode-dor.md': { top: 6, closing: 35 },
};
// Returns one line per anchor that lost markers (or is missing). Frontmatter and SYNC bodies are
// excluded: they are not the skill's own anchor text.
function emphasisAnchorGaps(body, floors) {
    const text = String(body).replace(/\r\n?/g, '\n')
        .replace(/^---\n[\s\S]*?\n---\n/, '')
        .replace(/<!-- SYNC:([^\s>]+) -->[\s\S]*?<!-- \/SYNC:\1 -->/g, '');
    const count = region => (region.match(EMPHASIS_MARKERS) || []).length;
    const gaps = [];
    const summary = text.indexOf('\n## Quick Summary');
    if (summary === -1) gaps.push('top anchor: no `## Quick Summary` section');
    else {
        const next = text.indexOf('\n## ', summary + 1);
        const top = count(text.slice(0, next === -1 ? undefined : next));
        if (top < floors.top) gaps.push(`top anchor (STEP-TASK anchor + Quick Summary) holds ${top} emphasis markers, floor ${floors.top}`);
    }
    const closingAt = text.indexOf('\n## Closing Reminders');
    if (closingAt === -1) gaps.push('closing anchor: no `## Closing Reminders` section');
    else {
        const closing = count(text.slice(closingAt));
        if (closing < floors.closing) gaps.push(`closing anchor (Closing Reminders) holds ${closing} emphasis markers, floor ${floors.closing}`);
    }
    return gaps;
}
// Every `disable-model-invocation` value declared in a skill's YAML frontmatter (body text ignored).
const modelInvocationValues = body => {
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(body);
    if (!frontmatter) return null;
    return [...frontmatter[1].matchAll(/^disable-model-invocation:[ \t]*(.*?)[ \t]*$/gm)].map(m => m[1]);
};

// The graph-code build-mode first step (TC-ADS-004 Test Data): one install command, identical on Windows, macOS and Linux.
const GRAPH_TOOLING_INSTALL_COMMAND =
    'node -e "const r=require(\'./.claude/hooks/lib/graph-utils.cjs\').ensurePythonDeps(); process.exit(r && r.ok ? 0 : 1)"';
// Text from `start` up to (not including) the next `end` after it; '' when `start` is absent.
const sectionBetween = (body, start, end) => {
    const from = body.indexOf(start);
    if (from === -1) return '';
    const to = body.indexOf(end, from + start.length);
    return body.slice(from, to === -1 ? undefined : to);
};
// Guided workflow execution (spec: docs/specs/WorkflowExecution/README.GuidedWorkflow.md, BR-GWF-01…16).
// start-workflow's Step Execution Protocol is the single owner of the flex rules; workflow-end's first
// step is the outcome-gate evidence check. The closed deviation-kind set is shared with workflow-end and
// the usage report, so it is pinned exactly (TC-GWF-041).
const DEVIATION_KINDS = ['when-false', 'pre-action', 'intent-skip', 'merged', 'simplified', 'reordered', 'review-report'];
const stepContract = () => sectionBetween(readSkill('start-workflow'), '## Step Execution Protocol', '\n## ');
const outcomeGateCheck = () => sectionBetween(readSkill('workflow-end'), '0. **Outcome-gate evidence check**', '\n1. ');
// Paragraphs (blank or bare `>` lines separate them, so block quotes split too) that match `pattern`.
const paragraphsMentioning = (body, pattern) => body.split(/\r?\n[ \t>]*\r?\n/).filter(p => pattern.test(p));

// TC-PDL-028 (spec: docs/specs/ContextDelivery/README.ProtocolDelivery.md, BR-PDL-05/15). The hooks guide
// ships with `.claude/`, so its second-host trust note is pinned unconditionally. All four notes must
// sit in ONE paragraph that names the host's review step (`/hooks`), so a note cannot be stitched
// together from unrelated sentences elsewhere in the guide.
const HOOKS_GUIDE = path.resolve(PROJECT_DIR, '.claude', 'docs', 'hooks', 'README.md');
const HOOK_TRUST_NOTES = {
    'a new or changed step runs only after review': /\bnew or changed\b[^.]*\b(?:skipped|not run|never runs?)\b[^.]*\buntil\b[^.]*\breview/i,
    'the review step is named': /\breview\w*\b[^.]{0,60}\bin `\/hooks`/i,
    'guides deliver until the review': /\buntil then\b[^.]*\bguide/i,
    'an unchanged step keeps its earlier review': /\b(?:did not change|unchanged)\b[^.]*\bearlier review still holds\b/i,
};
// The trust notes the best `/hooks` paragraph lacks; every note name when no paragraph names `/hooks`.
function hookTrustNoteGaps(guide) {
    const missingIn = paragraph => Object.keys(HOOK_TRUST_NOTES).filter(note => !HOOK_TRUST_NOTES[note].test(paragraph));
    const candidates = paragraphsMentioning(guide, /`\/hooks`/).map(missingIn);
    if (candidates.length === 0) return Object.keys(HOOK_TRUST_NOTES);
    return candidates.reduce((best, gaps) => (gaps.length < best.length ? gaps : best));
}

// TC-PD (spec: docs/specs/Presentation/README.PresentationDecks.md §8). presentation-builder owns one deck
// standard and its validator; feature-presentation's review deck passes it under `review`. The five editing
// checks are a literal on purpose: the test pins the contract, it never reads the set back from the script.
const PD_EDITING_CHECKS = ['draft-persistence', 'edit-mode', 'edit-state', 'export', 'reset'];
const PD_SKIP = IS_FRAMEWORK_REPO ? false : 'asserts the framework repo\'s own presentation skills (framework-repo signal)';
const pdSkillPath = (...parts) => path.join(SKILLS_DIR, ...parts);
// Markdown read with CRLF/CR normalized, so section and fence extraction work on any checkout.
const pdReadText = (...parts) => readFile(pdSkillPath(...parts)).replace(/\r\n?/g, '\n');
// Loaded lazily inside each case, so a bundle without presentation-builder never fails at suite load.
const pdLoadValidator = () => require(pdSkillPath('presentation-builder', 'scripts', 'validate-presentation.cjs'));
// The body of the first ```<lang> fence after the first line matching `heading` ('' when either is missing).
function pdExtractFence(markdown, heading, lang = 'html') {
    const text = String(markdown).replace(/\r\n?/g, '\n');
    const section = text.search(heading);
    if (section === -1) return '';
    const opener = '```' + lang + '\n';
    const open = text.indexOf(opener, section);
    if (open === -1) return '';
    const close = text.indexOf('\n```', open + opener.length);
    return close === -1 ? '' : text.slice(open + opener.length, close);
}
// The review-deck scaffold: the first ```html fence under `## 1.` of feature-presentation's deck template.
const pdExtractScaffold = markdown => pdExtractFence(markdown, /^## 1\./m);
const pdScaffold = () => pdExtractScaffold(pdReadText('feature-presentation', 'references', 'deck-template.md'));
// The spec-only wireframe demo slide: the ```html fence under §3b "### Spec-only wireframe demo".
const pdWireframeSlide = () => pdExtractFence(pdReadText('feature-presentation', 'references', 'deck-template.md'), /^### Spec-only wireframe demo/m);
const pdClassTokens = tag => {
    const match = /\bclass\s*=\s*(["'])(.*?)\1/i.exec(tag);
    return match ? match[2].split(/\s+/).filter(Boolean) : [];
};
const pdSlideIdOf = tag => {
    const match = /\bdata-slide-id\s*=\s*(["'])(.*?)\1/i.exec(tag);
    return match ? match[2] : null;
};
const pdErrorIds = result => result.checks.filter(check => !check.pass && check.level === 'error').map(check => check.id).sort();
const pdCheck = (result, id) => result.checks.find(check => check.id === id);
// A presenter-conforming deck (literal markup, so the invariant cases need no generator). Notes carry the
// Say/Why/Question labels and exceed the 40-character depth floor.
function pdFixtureDeck(slideIds = ['opening', 'evidence']) {
    const slides = slideIds.map(id => `
    <section class="slide" data-slide-id="${id}" data-purpose="explain" data-principle="This slide advances the story">
      <h2>${id}</h2><p>The claim and supporting context.</p>
      <template class="slide-notes"><p><strong>Say:</strong> Explain the claim.</p><p><strong>Why:</strong> Connect it to the audience.</p><p><strong>Question:</strong> What changes next?</p></template>
    </section>`).join('\n');
    return `<!doctype html>
<html lang="en"><head><meta name="presentation-id" content="fixture"><style>
  @media print { .controls { display: none; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  button:focus-visible { outline: 3px solid currentColor; }
</style></head><body>
  <nav class="controls">
    <button aria-expanded="false" data-action="toggle-notes" aria-controls="notes-panel">Notes</button>
    <button aria-pressed="false" data-action="toggle-edit">Edit mode</button>
    <button data-action="previous">Previous</button><button data-action="next">Next</button>
    <button data-action="overview">All slides</button>
    <button data-action="reset">Reset</button><button data-action="export">Export</button>
  </nav>
  <aside id="notes-panel" aria-labelledby="notes-title"><h2 id="notes-title">Speaker notes</h2><button data-action="close-notes">Close</button><div id="notes-content"></div></aside>
  <div id="progress" aria-live="polite">Slide 1</div><span>Speaker notes are not included in print.</span>
  <script>
    document.addEventListener('keydown', (event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'Home' || event.key === 'End') go(event.key); });
    document.querySelector('[data-action="toggle-edit"]').setAttribute('aria-pressed', 'true');
    document.querySelector('.editable').setAttribute('contenteditable', 'true');
    localStorage.setItem('deck:draft', 'draft');
  </script>
  ${slides}
</body></html>`;
}
// Apply a fixture mutation and fail loudly when it changed nothing (a no-op mutation proves nothing).
function pdMutate(html, label, mutate) {
    const next = mutate(html);
    assertTrue(next !== html, `fixture setup: mutation "${label}" changed nothing`);
    return next;
}
// OS essentials a spawned node child needs on Windows, macOS or Linux (the same allow-list as the presentation-builder
// and html-export skill tests, and as tests/lib/os-essentials-env.cjs). Every other inherited key — framework feature
// switches, provider keys, CLAUDE_PROJECT_DIR — is dropped, so nothing on a developer machine reaches the child
// (Portable Test Contract). The Windows well-known folder keys (SYSTEMDRIVE, PROGRAMDATA, ...) stay: without them a
// child that touches the shell writes its cache files under its working directory.
const PD_CHILD_ENV_ALLOWLIST = new Set([
    'PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC',
    'SYSTEMDRIVE', 'PROGRAMDATA', 'ALLUSERSPROFILE', 'PUBLIC',
    'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMW6432',
    'COMMONPROGRAMFILES', 'COMMONPROGRAMFILES(X86)', 'COMMONPROGRAMW6432',
    'PROCESSOR_ARCHITECTURE', 'PROCESSOR_ARCHITEW6432', 'NUMBER_OF_PROCESSORS', 'OS', 'LANG', 'LC_ALL', 'TZ',
]);
// A scrubbed child environment for a PD script run: the allow-listed OS keys only (Windows spells `Path`, so names
// compare upper-cased), with home and every temp key at the fixture dir (Node reads TEMP first on Windows, TMPDIR
// first on POSIX).
function pdChildEnv(root) {
    const env = {};
    for (const [name, value] of Object.entries(process.env)) {
        if (PD_CHILD_ENV_ALLOWLIST.has(name.toUpperCase())) env[name] = value;
    }
    for (const name of ['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP']) env[name] = root;
    return env;
}
// Run the deck validator's CLI as a real process (argv array, no shell) and return its exit code and output.
function pdRunValidatorCli(root, args) {
    const { spawnSync } = require('child_process');
    const script = pdSkillPath('presentation-builder', 'scripts', 'validate-presentation.cjs');
    const run = spawnSync(process.execPath, [script, ...args], { cwd: root, env: pdChildEnv(root), encoding: 'utf8', timeout: 30000 });
    return { code: run.status, stdout: String(run.stdout || ''), stderr: String(run.stderr || ''), error: run.error };
}
// A temp dir holding the conforming fixture deck as deck.html; removed after `use` settles.
function pdWithFixtureDeckFile(prefix, use) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    try {
        const deck = path.join(root, 'deck.html');
        fs.writeFileSync(deck, pdFixtureDeck(), 'utf8');
        return use(root, deck);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}
// Evaluate a CSS selector list against one opening tag. Only the compound forms `tag.class[attr]` and `[attr]`
// are supported; any other syntax (combinators, pseudo-classes, attribute values) throws, so a changed selector
// fails this suite loudly instead of being judged by a matcher that does not understand it.
function pdSelectorMatches(selectorList, tag) {
    const name = (/^<([a-z][\w-]*)/i.exec(tag) || [])[1] || '';
    return selectorList.split(',').map(part => part.trim()).some(compound => {
        const parts = /^([a-z][\w-]*)?((?:\.[\w-]+)*)((?:\[[\w-]+\])*)$/i.exec(compound);
        if (!compound || !parts) throw new Error(`unsupported selector syntax "${compound}" in "${selectorList}"`);
        const [, element, classes, attributes] = parts;
        if (element && element.toLowerCase() !== name.toLowerCase()) return false;
        const tokens = pdClassTokens(tag);
        if (classes.split('.').filter(Boolean).some(cls => !tokens.includes(cls))) return false;
        const attrNames = (attributes.match(/[\w-]+/g) || []);
        return attrNames.every(attr => new RegExp(`\\s${attr}(?=[\\s=/>])`, 'i').test(tag));
    });
}
// Run the review-deck scaffold's REAL engine (its one inline <script>, as extracted from the deck template) in node:vm
// against the smallest fake page it needs: the desktop layout, where the slide stage scrolls (getComputedStyle
// reports overflow-y auto) and slide k is `heights[k]` px tall in a `viewport` px stage. The fake answers only the
// selectors and ids the engine asks for and throws on any other, so an engine that starts reading something new
// fails here loudly instead of running against a silent null. Layout-dependent paths a fake page cannot model
// faithfully — the below-900px page scroll with notes stacked under the controls (scrollEnd's controls cap),
// smooth scrolling, the overview dialog and fullscreen — are not exercised; the Step 8 browser check owns them.
// `embeds(element)` builds the fake `.deck__embed` elements for the empty-demo swap from the harness's element factory.
// Returns the key/mouse drivers and the observers.
function pdRunDeckEngine(engineSource, { heights = [900, 900, 900], viewport = 500, notesHeight = 800, notesViewport = 300, embeds = () => [] } = {}) {
    const vm = require('vm');
    const calls = [];
    const documentListeners = [];
    const element = (members = {}) => {
        const attributes = {};
        const handlers = {};
        const classes = new Set(members.classes || []);
        const node = {
            hidden: false, textContent: '', scrollTop: 0, dataset: {},
            classList: {
                add: name => classes.add(name),
                contains: name => classes.has(name),
                toggle: (name, force) => {
                    const on = force === undefined ? !classes.has(name) : Boolean(force);
                    if (on) classes.add(name); else classes.delete(name);
                    return on;
                },
            },
            setAttribute(name, value) { attributes[name] = String(value); },
            getAttribute(name) { return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null; },
            hasAttribute(name) { return Object.prototype.hasOwnProperty.call(attributes, name); },
            addEventListener(type, listener) { (handlers[type] = handlers[type] || []).push(listener); },
            click() { (handlers.click || []).forEach(listener => listener({})); },
            focus() {}, replaceChildren() {}, scrollIntoView() {},
            remove() { node.removed = true; },
            querySelector: () => null, querySelectorAll: () => [], closest: () => null,
            getBoundingClientRect: () => ({ top: 0, bottom: 0 }),
        };
        for (const [key, value] of Object.entries(members)) if (key !== 'classes') node[key] = value;
        return node;
    };
    const slides = heights.map((_, k) => element({
        classes: ['slide', 'deck__slide'],
        dataset: { slideId: `slide-job-${k}` },
        querySelector: selector => (selector === 'h2' ? { textContent: `Title ${k + 1}` } : null),
    }));
    const activeIndex = () => slides.findIndex(slide => slide.classList.contains('deck__slide--active'));
    // A scroll area clamps like a browser and records each requested step as [name, delta].
    const scroller = (name, members) => {
        const area = element(members);
        area.scrollBy = ({ top }) => {
            calls.push([name, top]);
            area.scrollTop = Math.max(0, Math.min(area.scrollHeight - area.clientHeight, area.scrollTop + top));
        };
        return area;
    };
    const stage = scroller('stage', { clientHeight: viewport });
    Object.defineProperty(stage, 'scrollHeight', { get: () => heights[Math.max(0, activeIndex())] });
    const notesHead = element({ getBoundingClientRect: () => ({ top: 0, bottom: 40 }) });
    const notesPanel = scroller('notes', {
        hidden: true,
        scrollHeight: notesHeight,
        clientHeight: notesViewport,
        contains: node => Boolean(node && node.inNotes),
        querySelector: selector => (selector === '.deck__notes-head' ? notesHead : null),
    });
    const byId = {
        'deck-status': element(),
        'notes-panel': notesPanel,
        'notes-slide': element(),
        'notes-content': element(),
        overview: element({ open: false }),
        'overview-list': element(),
    };
    const buttons = {};
    for (const action of ['previous', 'next', 'overview', 'toggle-notes', 'fullscreen', 'theme', 'close-notes', 'close-overview']) buttons[action] = element();
    const singles = { '.deck': element(), '.deck__stage': stage, '.deck__nav': element({ getBoundingClientRect: () => ({ top: viewport - 60, bottom: viewport }) }) };
    const embedElements = embeds(element);
    const unexpected = what => { throw new Error(`fake page: the engine asked for ${what}, which this harness does not model`); };
    const document = {
        documentElement: element(),
        scrollingElement: null,
        fullscreenEnabled: false,
        querySelector(selector) {
            if (Object.prototype.hasOwnProperty.call(singles, selector)) return singles[selector];
            const action = /^\[data-action="([\w-]+)"\]$/.exec(selector);
            return action && buttons[action[1]] ? buttons[action[1]] : unexpected(`querySelector("${selector}")`);
        },
        querySelectorAll(selector) {
            if (selector === 'section.deck__slide') return slides;
            if (selector === '.deck__embed') return embedElements;
            return unexpected(`querySelectorAll("${selector}")`);
        },
        getElementById: id => (Object.prototype.hasOwnProperty.call(byId, id) ? byId[id] : unexpected(`#${id}`)),
        addEventListener(type, listener, capture) { documentListeners.push({ type, listener, capture: Boolean(capture) }); },
        createTextNode: text => ({ text }),
        createElement: () => element(),
    };
    const context = {
        document,
        window: { matchMedia: () => ({ matches: false }), innerHeight: viewport },
        getComputedStyle: node => ({ overflowY: node === stage ? 'auto' : 'visible' }),
        history: { replaceState() {} },
        location: { hash: '' },
    };
    new vm.Script(engineSource, { filename: 'deck-template-engine.js' }).runInNewContext(context);
    // Dispatch like a browser: capture listeners first, then the rest, in registration order.
    const dispatch = (type, event) => {
        for (const capture of [true, false]) {
            for (const entry of documentListeners) if (entry.type === type && entry.capture === capture) entry.listener(event);
        }
        return event;
    };
    const page = { tagName: 'BODY', isContentEditable: false, closest: () => null };
    return {
        calls, stage, notesPanel, buttons,
        notesSlide: byId['notes-slide'],
        index: activeIndex,
        status: () => byId['deck-status'].textContent,
        press: (key, { shiftKey = false, repeat = false, target = page } = {}) => dispatch('keydown', {
            key, shiftKey, repeat, target, altKey: false, ctrlKey: false, metaKey: false, defaultPrevented: false,
            preventDefault() { this.defaultPrevented = true; },
        }),
        mousedown: () => dispatch('mousedown', { target: page }),
        notesTarget: { tagName: 'DIV', isContentEditable: false, closest: () => null, inNotes: true },
        embeds: embedElements,
    };
}

// Assert a relocated inject-hook's guidance survives in its target skill. Each phrase is a
// verbatim load-bearing fragment of the deleted hook's output — NOT a tautology. Fails loudly
// (naming the deleted hook) if the relocation is dropped, so static parity can't silently rot.
const assertRelocated = (deletedHook, skill, phrases) => {
    const body = skill.includes('/') ? readFile(path.join(SKILLS_DIR, ...skill.split('/'))) : readSkill(skill);
    const missing = phrases.filter(p => !body.includes(p));
    assertTrue(missing.length === 0,
        `${deletedHook} guidance lost from ${skill} (relocation regressed):\n  ${missing.join('\n  ')}`);
};

module.exports = {
    name: 'content-presence',
    tests: [
        {
            name: '[content-presence] TC-CP-001 CLAUDE.md carries the path→doc pointers',
            fn: () => {
                const claudeMd = readFile(path.resolve(PROJECT_DIR, 'CLAUDE.md'));
                const missing = [];
                const { readProjectConfigAt } = require('../../lib/project-config-loader.cjs');
                const loaded = readProjectConfigAt(PROJECT_DIR);
                assertTrue(loaded.state !== 'invalid', `Invalid project config: ${loaded.errors.join('; ')}`);
                if (!claudeMd.includes('| Files | Project reference |')) missing.push('project path-to-reference table');
                assertTrue(!claudeMd.includes('file-conventions.cjs --lookup'), 'root guidance must work without framework machinery');
                if (!/Read first/.test(claudeMd)) missing.push('prompt → reference-doc lookup table');
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
            name: '[content-presence] TC-CP-008 tracked contexts carry no route text: no pointer, gate or catalog',
            fn: () => {
                for (const relative of ['CLAUDE.md', 'AGENTS.md']) {
                    const body = readFile(path.resolve(PROJECT_DIR, relative));
                    assertTrue(!body.includes('<!-- CK:WORKFLOW-ROUTE-POINTER -->'),
                        `${relative} carries a route pointer; the route hook is the only carrier`);
                    assertTrue(!body.includes('<!-- CK:WORKFLOW-GATE -->') && !body.includes('**Workflow question**'),
                        `${relative} carries route rules; the route hook is their only carrier`);
                    assertTrue(!body.includes('<!-- CK:WORKFLOW-SKILLS -->'),
                        `${relative} carries the runtime workflow catalog`);
                    assertTrue(!/###\s+Workflows Index \(\d+\)/.test(body),
                        `${relative} carries a static Workflows Index`);
                }
            },
        },
        {
            // Guards routing INTENT: a brief complexity assessment picks direct / custom-simple /
            // catalog workflow, a catalog workflow needs >80% of its steps to do real work, and a direct,
            // single-skill or custom-simple route is declared, never asked (only starting a catalog workflow
            // asks the workflow question, P46). Without these, a focused change routes into a full catalog
            // workflow whose spec/scenario/seed-data steps do no work.
            name: '[content-presence] TC-CP-015 route gate assesses complexity, applies catalog fit, never asks about a direct or custom route',
            fn: () => {
                const gate = readFile(path.join(SKILLS_DIR, 'shared', 'workflow-first-gate.md'));
                const missing = [
                    '**Assess (brief',
                    'change type',
                    'risk',
                    'ambiguity',
                    'artifacts actually needed',
                    'custom-simple: only the canonical steps it needs',
                    '>80% of its unconditional steps would do real work',
                    'A behavior change keeps its test and review steps',
                    'a direct, single-skill or custom-simple route (a Catalog-fit downgrade included) proceeds without asking',
                    "the declared route is the user's override point",
                    '— because {key signals}',
                ].filter(phrase => !gate.includes(phrase));
                assertTrue(missing.length === 0,
                    `workflow-first-gate.md lost routing-assessment guidance:\n  ${missing.join('\n  ')}`);

                // Downgrade guards: the Signals → Route table is the default and catalog fit may only
                // trim no-work steps — a downgraded route keeps root-cause investigation, spec/doc
                // sync, test and review. The same phrases must reach every routing surface.
                const DOWNGRADE_GUARDS = [
                    'trimming only steps that would do no real work',
                    'a downgraded route also keeps root-cause investigation for bugs and spec/doc sync when behavior or a public contract changes',
                ];
                const missingGuards = (label, body) => DOWNGRADE_GUARDS
                    .filter(phrase => !body.includes(phrase)).map(phrase => `${label} → "${phrase}"`);
                assertTrue(/the table route is the default/i.test(gate),
                    'workflow-first-gate.md no longer states the Signals → Route table takes precedence over catalog fit');

                const { buildWorkflowSkillsCatalog } = require(path.resolve(PROJECT_DIR, '.claude', 'scripts', 'lib', 'workflow-skills-catalog.cjs'));
                const guide = buildWorkflowSkillsCatalog({ rootDir: PROJECT_DIR, sections: ['routing'] });
                assertTrue(guide.includes('>80% of its unconditional steps would do real work'),
                    'runtime Routing Decision Guide diverges from the gate catalog-fit rule');
                assertTrue(guide.includes('never ask which path to take'),
                    'runtime Routing Decision Guide lost the auto-select rule');
                assertTrue(/the table route is the default/i.test(guide),
                    'runtime Routing Decision Guide lost the table-precedence rule');
                assertTrue(guide.includes('A behavior change keeps its test and review steps'),
                    'runtime Routing Decision Guide lost the test/review guard');

                const skill = readSkill('start-workflow');
                const guardGaps = [
                    ...missingGuards('workflow-first-gate.md', gate),
                    ...missingGuards('Routing Decision Guide', guide),
                    ...missingGuards('start-workflow/SKILL.md', skill),
                ];
                assertTrue(guardGaps.length === 0,
                    `downgrade guards diverge across routing surfaces:\n  ${guardGaps.join('\n  ')}`);

                // Mid-session guard: the workflow question is a first-task-of-session behavior only. Losing
                // it lets a follow-up or correction mid-work start — or re-ask about — a full workflow over
                // work already under way. Every routing surface the model reads must carry the same rule.
                // Required gates stay outside the skill cap, and continuing a running workflow is not
                // activation — without these the cap silently drops investigation, test, review or
                // doc sync, or cuts an active workflow short.
                const MID_SESSION = [
                    'Mid-session: never auto-activate a workflow or ask to start one.',
                    'The workflow question applies only to the first task of a session (its first user prompt; compaction or resume does not reset it).',
                    'a lean chain of at most 3 skills',
                    'required gates (root-cause investigation for a bug, test, review, spec/doc sync, and any other required quality gate) still run and do not count toward that cap',
                    'continuing a workflow already running is not activating one',
                    'An explicit workflow request always runs, mid-session included',
                    'or the user asking in words to use a workflow; follow it.',
                ];
                // The route hook is the only carrier of the gate: its ask payload must carry the same rule. The
                // generated roots carry no route text (TC-CP-008).
                const routeHook = require(path.resolve(PROJECT_DIR, '.claude', 'hooks', 'lib', 'workflow-route-delivery.cjs'));
                const hookPayload = routeHook.buildInjection(PROJECT_DIR, '', 'ask', 'default', COMPATIBLE_PROFILE);
                const midSessionGaps = [['workflow-first-gate.md', gate], ['Routing Decision Guide', guide], ['start-workflow/SKILL.md', skill], ['route hook payload (ask)', hookPayload]]
                    .flatMap(([label, body]) => MID_SESSION.filter(p => !body.includes(p)).map(p => `${label} → "${p}"`));
                assertTrue(midSessionGaps.length === 0,
                    `mid-session no-auto-activation rule diverges across routing surfaces:\n  ${midSessionGaps.join('\n  ')}`);
                // Mode auto carries the same guard: it asks the same question, on the first task only (P46).
                const autoPayload = routeHook.buildInjection(PROJECT_DIR, '', 'auto', 'default', COMPATIBLE_PROFILE);
                const autoGaps = [
                    'Mid-session: never auto-activate a workflow or ask to start one.',
                    'The workflow question applies only to the first task of a session',
                    'a lean chain of at most 3 skills',
                    'An explicit workflow request always runs, mid-session included'
                ].filter(phrase => !autoPayload.includes(phrase));
                assertTrue(autoGaps.length === 0, `route hook auto payload lost the mid-session guard:\n  ${autoGaps.join('\n  ')}`);

                // Negative guard spans the WHOLE skill: no step may propose a route or ask the user
                // to pick one. (Prohibitions like "do not use ask user question tool to choose" stay legal.)
                for (const [pattern, why] of [
                    [/MAY propose/, '"MAY propose" a route'],
                    [/How to present \(ask user question tool/, 'an ask user question tool route-presentation step'],
                    [/Propose Custom Pipeline/i, 'a "Propose Custom Pipeline" step'],
                ]) {
                    assertTrue(!pattern.test(skill),
                        `start-workflow carries ${why}, contradicting the auto-select gate`);
                }
                const section = skill.slice(skill.indexOf('## Custom Pipeline Option'),
                    skill.indexOf('### Task creation for Custom Pipeline'));
                assertTrue(section.length > 0, 'start-workflow lost its Custom Pipeline section');
                assertTrue(section.includes('Do NOT use `ask user question tool` to choose'),
                    'start-workflow must auto-select the custom pipeline without a confirmation prompt');

                // Example routes teach the model the step vocabulary: every step in a
                // `Route: custom-simple [a → b]` example must be a real canonical skill id.
                const invalidSteps = [];
                for (const [label, body] of [['workflow-first-gate.md', gate], ['start-workflow/SKILL.md', skill]]) {
                    const examples = [...body.matchAll(/Route: custom-simple(?: "[^"]*")? \[([^\]]+)\]/g)];
                    assertTrue(examples.length > 0, `${label} lost its custom-simple route example`);
                    for (const match of examples) {
                        for (const step of match[1].split('→').map(s => s.trim().split(/\s+/)[0])) {
                            if (!fs.existsSync(path.join(SKILLS_DIR, step, 'SKILL.md'))) {
                                invalidSteps.push(`${label} → "${step}"`);
                            }
                        }
                    }
                }
                assertTrue(invalidSteps.length === 0,
                    `route examples name non-canonical step ids:\n  ${invalidSteps.join('\n  ')}`);
            },
        },
        {
            // Guards the workflow-question INTENT (BR-WFR-06): a workflow the model matched on its own —
            // whatever its tier — never starts before the user answers ONE question offering the full
            // workflow, a slimmer custom route that keeps the required gates, or direct execution; an
            // explicit request runs every tier with no question. The route hook is the only carrier of the gate
            // (Claude, Codex and OpenCode all run it); the gate file is its source text. A surface that loses the
            // rule lets the default `ask` mode auto-start a workflow again.
            name: '[content-presence] TC-CP-017 TC-WFR-012 every routing surface asks the workflow question before any tier starts',
            fn: () => {
                // Given every surface the model routes from
                const gate = readFile(path.join(SKILLS_DIR, 'shared', 'workflow-first-gate.md'));
                const { buildWorkflowSkillsCatalog } = require(path.resolve(PROJECT_DIR, '.claude', 'scripts', 'lib', 'workflow-skills-catalog.cjs'));
                const guide = buildWorkflowSkillsCatalog({ rootDir: PROJECT_DIR, sections: ['routing'] });
                const legend = buildWorkflowSkillsCatalog({ rootDir: PROJECT_DIR, sections: ['workflows'], compact: true });
                const skill = readSkill('start-workflow');
                const readIfPresent = rel => [[rel, path.join(PROJECT_DIR, rel)]]
                    .filter(([, abs]) => fs.existsSync(abs)).map(([r, abs]) => [r, readFile(abs)]);
                // The roots carry no route text (TC-CP-008); the route hook's ask payload carries the gate.
                const routeHook = require(path.resolve(PROJECT_DIR, '.claude', 'hooks', 'lib', 'workflow-route-delivery.cjs'));
                const hookPayload = routeHook.buildInjection(PROJECT_DIR, '', 'ask', 'default', COMPATIBLE_PROFILE);
                const autoPayload = routeHook.buildInjection(PROJECT_DIR, '', 'auto', 'default', COMPATIBLE_PROFILE);
                const generatedCopies = [['route hook payload (ask)', hookPayload], ['route hook payload (auto)', autoPayload]];
                const mirrorPaths = [path.join('.agents', 'skills', 'start-workflow', 'SKILL.md')];
                const skillMirrors = mirrorPaths.flatMap(readIfPresent);
                assertTrue(skillMirrors.length === mirrorPaths.filter(rel => fs.existsSync(path.join(PROJECT_DIR, rel))).length,
                    'every existing workflow-start mirror must reach the routing-surface assertions');
                // The always-loaded gate is byte-budgeted, so it carries the compact rule; start-workflow and the
                // runtime catalog carry the full procedure. Phrases avoid host-rewritten tokens so the Codex /
                // OpenCode projections are checked with the same strings.
                const GATE = [
                    'a direct, single-skill or custom-simple route (a Catalog-fit downgrade included) proceeds without asking',
                    'ask the workflow question (below) only when YOUR route is to start a catalog workflow',
                    'it NEVER starts before the answer',
                    '**Workflow question** (every tier): only when your route is to start a catalog workflow (never for direct or custom-simple)',
                    "use ask user question tool to ask user, else plain text, then stop until the user answers",
                    'the recommended one first with a one-line reason',
                    '(a) the full workflow `<id>`',
                    '(b) a slimmer custom route listing its steps, keeping every required gate',
                    '(c) execute directly, no workflow or skill',
                    'runs any tier with no question',
                ];
                const START = [
                    '**Workflow question**',
                    'asked ONLY when your route is to start a catalog workflow; a direct, single-skill or custom-simple route (a Catalog-fit downgrade included) asks nothing',
                    'whatever its tier, is NEVER activated before the user answers ONE question',
                    '(c) execute directly, no workflow or skill',
                    'activates any tier with no question',
                    'ask no other route question',
                ];
                const surfaces = [
                    ['workflow-first-gate.md', gate, GATE],
                    ...generatedCopies.map(([rel, body]) => [rel, body, GATE]),
                    ['Routing Decision Guide', guide, [
                        'when your route is to start a catalog workflow (never for a direct, single-skill or custom-simple route), never start it on your own',
                        '(c) execute directly, no workflow or skill',
                        'An explicit user request runs every tier directly, with no question',
                    ]],
                    ['runtime tier legend', legend, [
                        'before you start a catalog workflow, in every tier; a direct, single-skill or custom-simple route asks nothing',
                        'An explicit request runs every tier with no question',
                    ]],
                    ['start-workflow/SKILL.md', skill, START],
                    ...skillMirrors.map(([rel, body]) => [rel, body, START]),
                ];
                // When each surface is checked for the rule, and for the tier semantics it replaced
                const gaps = surfaces.flatMap(([label, body, phrases]) =>
                    phrases.filter(phrase => !body.includes(phrase)).map(phrase => `${label} → "${phrase}"`));
                const STALE = [
                    /the route gate may select and start it/,
                    /never self-start a `manual` workflow/,
                    /ask once before self-starting a `confirm`/,
                    /except the (?:one|single) question a `confirm`-tier workflow requires/,
                    /Auto-select the best path for auto-detected workflows/,
                    // ask-mode scope: only a route that STARTS a catalog workflow asks; direct/custom-simple never do
                    /a route that matches a catalog workflow, whatever its tier, NEVER starts on your own/,
                    /every tier asks the workflow question/,
                    /never start a catalog workflow you matched on your own/,
                    /(?:direct|custom-simple)[^.;|]{0,80}\b(?:must|MUST|always) ask\b/,
                ];
                const stale = surfaces.flatMap(([label, body]) =>
                    STALE.filter(pattern => pattern.test(body)).map(pattern => `${label} → ${pattern}`));
                // And no surface a person or the model reads says mode auto starts a self-selected workflow unasked (P46):
                // the routing surfaces above, every workflow skill and the docs that explain the modes
                // Each pattern matches a sentence a carrier held before P46 (checked against `git show HEAD:` of every file
                // below); a bare /without asking/ is avoided because a direct route correctly "proceeds without asking".
                const AUTO_STALE = [
                    /\bstarts? (?:it |a matched workflow |a self-selected workflow )?without asking/,
                    /\bstarts? (?:it )?by (?:its )?tier/,
                    /`manual` never starts on (?:its|your) own/,
                    /\basks? only (?:for a [^.;|]{0,40})?when a leaner route would (?:also )?do/,
                    /\bauto`? (?:mode )?(?:starts|activates) (?:a |the )?(?:matched|self-selected|catalog) workflow/,
                    /\bstart by (?:itself|themselves)\b/,
                    /\btier decides? whether to ask/,
                    /\blets the tier decide\b/,
                    /\bauto runs, confirm asks\b/,
                    /\bstarts? (?:a matched|the catalog) workflow[^.;]{0,40}(?:without asking|by its tier)/,
                    /\bstart the catalog workflow you matched without asking/,
                    // Bound to a workflow subject, so a skill saying a dev server or a heavy skill "starts automatically" never trips it
                    /\b(?:workflows?|the workflow|a matched workflow)\b[^.;|\n]{0,40}\bstarts? automatically\b/i,
                ];
                const harmless = ['The dev server starts automatically when the app runs.', 'Heavy skills start automatically unless disabled.'];
                assertTrue(harmless.every(text => !AUTO_STALE.some(pattern => pattern.test(text))), 'the auto-start guard must not flag text about anything but a workflow');
                // In the framework repo every skill and framework doc is scanned, not a hand-kept list: each review round found one more
                // carrier the list missed. An adopter's own skills and docs are theirs, so there only the routing surfaces above are scanned.
                const workflowSkills = IS_FRAMEWORK_REPO ? fs.readdirSync(SKILLS_DIR).map(name => path.join('.claude', 'skills', name, 'SKILL.md')).flatMap(readIfPresent) : [];
                const docFiles = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
                    entry.isDirectory() ? docFiles(path.join(dir, entry.name)) : /\.(md|html)$/.test(entry.name) ? [path.join(dir, entry.name)] : []) : [];
                const modeDocs = IS_FRAMEWORK_REPO ? [...docFiles(path.join(PROJECT_DIR, '.claude', 'docs')).map(abs => path.relative(PROJECT_DIR, abs)),
                    '.claude/config/README.md', '.claude/scripts/lib/config-option-describes.cjs', '.claude/hooks/lib/project-config-schema.cjs',
                    '.claude/scripts/lib/workflow-routing-config.cjs', '.claude/skills/shared/protocols/concise-workflow-route.md',
                    'README.md'].flatMap(readIfPresent) : [];
                const autoCatalog = buildWorkflowSkillsCatalog({ rootDir: PROJECT_DIR, sections: ['workflows'], compact: true, mode: 'auto' });
                assertTrue(autoCatalog.includes('**Activation (mode auto):**'), 'the auto tier legend must reach the auto-start scan');
                const autoStale = [...surfaces, ...workflowSkills, ...modeDocs, ['runtime tier legend (auto)', autoCatalog]].flatMap(([label, body]) =>
                    AUTO_STALE.filter(pattern => pattern.test(body)).map(pattern => `${label} → ${pattern}`));
                assertTrue(!IS_FRAMEWORK_REPO || workflowSkills.length > 0, 'the framework skills must reach the auto-start scan');
                // And every confirm-tier workflow skill states the auto rule in its own words: the same question, full workflow first
                const registry = JSON.parse(readFile(path.join(PROJECT_DIR, '.claude', 'workflows.json'))).workflows;
                const confirmTier = Object.keys(registry).filter(id => registry[id].activation === 'confirm');
                const confirmGaps = confirmTier.filter(id => !readFile(path.join(SKILLS_DIR, id, 'SKILL.md')).includes('Route mode `auto` asks the same question, recommending the full workflow first'));
                // The framework's own tiers only: an adopter may retier its copy of the registry
                if (IS_FRAMEWORK_REPO) assertTrue(confirmTier.length > 0 && confirmGaps.length === 0, `confirm-tier skills must say auto asks the same question: ${confirmGaps.join(', ')}`);
                // Then every surface carries the question and none lets a tier start on its own
                assertTrue(gaps.length === 0, `workflow-question rule diverges across routing surfaces:\n  ${gaps.join('\n  ')}`);
                assertTrue(stale.length === 0, `a routing surface still lets a tier self-start:\n  ${stale.join('\n  ')}`);
                assertTrue(autoStale.length === 0, `a surface still lets mode auto start a workflow unasked:\n  ${autoStale.join('\n  ')}`);
            },
        },
        {
            // Guards the SINGLE-ASK intent: only the root route gate offers a workflow. A step skill that
            // carries its own "use ask user question tool to pick a workflow" block asks a second, divergent
            // question (and has named workflows that do not exist), overriding the gate's direct route.
            name: '[content-presence] TC-CP-017b no skill carries its own workflow-recommendation question',
            skip: IS_FRAMEWORK_REPO ? false : 'asserts the framework repo\'s own skills; an adopter\'s custom skills are theirs (framework-repo signal)',
            fn: () => {
                // Given every shipped skill body
                const offenders = [];
                for (const entry of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
                    const file = path.join(SKILLS_DIR, entry.name, 'SKILL.md');
                    if (!entry.isDirectory() || !fs.existsSync(file)) continue;
                    const body = readFile(file);
                    // When it is scanned for a per-skill workflow question
                    if (/^## Workflow Recommendation\b/m.test(body)) offenders.push(`${entry.name}: "## Workflow Recommendation" section`);
                    if (/\*\*Activate `workflow-[^`]+`(?: workflow)?\*\*/.test(body)) offenders.push(`${entry.name}: "Activate \`workflow-…\`" ask option`);
                }
                // Then none asks on its own — the gate's workflow question is the only one
                assertTrue(offenders.length === 0, `skills ask a second workflow question:\n  ${offenders.join('\n  ')}`);
            },
        },
        {
            // Guards BR-GWF-01 + BR-GWF-13 (the quality floor of the flex rules): `core`/`optional` steps
            // may flex, `gate` steps never do, and every deviation leaves a log line. Losing either rule
            // lets a run silently drop tests, review or spec sync.
            name: '[content-presence] TC-GWF-006 start-workflow: gate steps never skip and every deviation writes a log line',
            fn: () => {
                // Given the single owner of the flex rules
                const protocol = stepContract();
                // When its Step Execution Protocol is read
                const required = [
                    '`gate` steps ALWAYS run and are NEVER skipped, merged away, simplified away or reordered',
                    'every deviation writes one line',
                    'only after both the comment and the deviation-log line',
                ];
                const missing = required.filter(p => !protocol.includes(p));
                // Then the gate-never-skips rule and the log requirement are both stated
                assertTrue(protocol.length > 0, 'start-workflow lost its Step Execution Protocol section');
                assertTrue(missing.length === 0,
                    `start-workflow step contract lost load-bearing rules:\n  ${missing.join('\n  ')}`);
                // And every step row inside its phase task shows its role, so gate steps stay visible
                assertTrue(readSkill('start-workflow').includes('- [ ] {occurrence-id} [{role}] /{skill} {args}'),
                    'start-workflow phase-task rows no longer show the occurrence role');
                // And the always-read closing reminder repeats the gate rule
                assertTrue(readSkill('start-workflow').includes('`gate` steps never skip;'),
                    'start-workflow closing reminder lost the gate-never-skips rule');
            },
        },
        {
            // Guards BR-GWF-13 + BR-GWF-16: intent first, core/optional steps may be skipped, merged,
            // simplified or reordered, each logged; the rules live in one owner fed by workflows.json.
            name: '[content-presence] TC-GWF-058 start-workflow: core and optional steps flex intent-first with a logged kind; gates do not',
            fn: () => {
                // Given the flex rules
                const protocol = stepContract();
                // When they are read
                const required = [
                    'single owner of the flex rules (BR-GWF-16)',
                    "read the manifest's `intent`",
                    '`outcomeGates`',
                    '`core` and `optional` steps are recommendations',
                    'Intent first, you may skip, merge, simplify or reorder one when every applicable outcome gate can still be satisfied',
                    'Simplified and reordered steps still execute their skill protocol and add their line',
                ];
                const missing = required.filter(p => !protocol.includes(p));
                // Then the freedom, its limit and its log are all stated
                assertTrue(missing.length === 0, `start-workflow flex rules lost:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            // Guards BR-GWF-14: a review of unfinished work, or of an unsynced spec, proves nothing.
            name: '[content-presence] TC-GWF-059 start-workflow: no flex decision breaks a data dependency',
            fn: () => {
                // Given the flex rules
                const protocol = stepContract();
                // When the dependency rule is read
                const required = [
                    'Data dependencies never flex',
                    'a change is made before it is reviewed and before its tests run',
                    'the spec sync runs before the review that checks it',
                    'the close runs last',
                    'A reorder or merge that breaks one of these is not allowed.',
                ];
                const missing = required.filter(p => !protocol.includes(p));
                // Then all three standing dependencies and the prohibition are stated
                assertTrue(missing.length === 0, `start-workflow dependency rule lost:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            // Guards BR-GWF-15: "tests are recommendations" covers which tests run, never whether the
            // changed behaviour is tested and green — in the rule owner AND in the close check.
            name: '[content-presence] TC-GWF-060 test choice flexes but changed behaviour is tested green before close',
            fn: () => {
                // Given the rule owner and the close step
                const protocol = stepContract();
                const check = outcomeGateCheck();
                // When the test rules are read
                const starterGaps = [
                    'Tests are recommendations of which, never of whether',
                    'The choice of test steps and test cases may flex',
                    'every behaviour the run changed is covered by tests that ran green in this run',
                    'A skip or merge that would leave changed behaviour untested or failing is not allowed.',
                ].filter(p => !protocol.includes(p));
                // Then the scope is stated in the starter
                assertTrue(starterGaps.length === 0, `start-workflow test-scope rule lost:\n  ${starterGaps.join('\n  ')}`);
                // And the close accepts only tests that cover the changed behaviour
                const testsRule = check.split('\n').find(line => line.includes('`tests-pass`:')) || '';
                assertTrue(testsRule.includes('cover every behaviour the run changed and ran green in this run'),
                    'workflow-end tests-pass evidence no longer has to cover the changed behaviour');
            },
        },
        {
            // Guards BR-GWF-13 (workflow-step mode): a skill run as a workflow step leaves the next step, the goal
            // and a caller-owned validation to the run, and citing earlier work never replaces a proof.
            name: '[content-presence] TC-GWF-071 a skill run as a workflow step leaves progression, goal and validation to the run',
            fn: () => {
                // Given the flex-rule owner
                const protocol = stepContract();
                // When the workflow-step and decision-log rules are read
                const required = [
                    '**Workflow-step mode.**',
                    'it ends without its own next-step, follow-up or council prompt',
                    "it reuses the run's Goal Contract and decision log instead of creating its own",
                    'the caller validates the merged report once',
                    "only when that artifact meets the phase's own exit criteria",
                    'holds each finding to the evidence bar inside its own pass but makes no separate terminal findings-validation call',
                    "Citation never replaces a proof: a root-cause trace counts only when this run's own step produced it for the same problem, a user decision only as the user's answer (asked now, or recorded in this run's decision log under rule 12)",
                    'and findings validation, a mutation check or gate evidence only as a result of this run.',
                    '**Decision log.**',
                    'asks only what it leaves open or what new evidence reopened',
                ];
                const missing = required.filter(p => !protocol.includes(p));
                // Then every duty and the never-by-citation list are stated
                assertTrue(missing.length === 0, `start-workflow workflow-step rules lost:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            // Guards BR-GWF-02 (triage batch close): optional steps whose condition is false at triage close in one
            // write, each still logged and its task kept; every generated call block points to the batch close.
            name: '[content-presence] TC-GWF-072 inapplicable optional steps close in one triage batch, each still logged',
            fn: () => {
                // Given the flex-rule owner
                const protocol = stepContract();
                // When the batch-close rule is read
                const required = [
                    '**Triage batch close:**',
                    'append all of their `when-false` lines to the deviation log in one write',
                    'mark each of those tasks `completed`',
                    'reopens `in_progress` and runs',
                    // Only conditions already false at triage close; one that depends on a later step stays open
                    'is already false at triage in one batch (a condition that depends on a later step stays open and is decided when reached)',
                ];
                const missing = required.filter(p => !protocol.includes(p));
                // Then the batch keeps one log line and one task per skipped step
                assertTrue(missing.length === 0, `start-workflow batch-close rule lost:\n  ${missing.join('\n  ')}`);
                // And every workflow skill's generated call block points to the batch close
                const wrappers = fs.readdirSync(SKILLS_DIR).filter(dir => dir.startsWith('workflow-')
                    && fs.existsSync(path.join(SKILLS_DIR, dir, 'SKILL.md'))
                    && readSkill(dir).includes('<!-- WORKFLOW-CALLS:START -->'));
                const lacking = wrappers.filter(dir => !readSkill(dir).includes('close, in one batch at triage, the todos whose condition is already false there'));
                assertTrue(wrappers.length > 0 && lacking.length === 0, `call blocks without the batch close: ${lacking.join(', ')}`);
            },
        },
        {
            // Guards the step-skill rules the workflow optimization moved: each line keeps a gate, a validation or a
            // user confirmation that a workflow step would otherwise drop. Deleting or inverting one turns this red.
            name: '[content-presence] workflow-step gate rules in step skills keep their guarantee',
            fn: () => {
                const read = rel => readFile(path.join(SKILLS_DIR, rel));
                // Given each rule's owner file and the sentence that carries the guarantee
                const rules = [
                    ['changes-review/SKILL.md', "with `--loop-owner=caller`, the caller's single validation of the merged report satisfies this"],
                    ['domain-analysis/references/mode-review.md', 'Called with `--loop-owner=caller` → log "Skipped — the caller validates the merged report once"'],
                    ['workflow-review-changes/references/caller-mode.md', "the separate terminal `/why-review --validate-findings` call runs once, on the caller's merged report"],
                    ['work-item/references/mode-dor.md', '**ST4 M1-M7 per story**'],
                    ['work-item/references/mode-dor.md', 'A task, or one of its stories when the DoR covers them (row ST4), violating any of M1-M5 or M7 is NOT ready to plan'],
                    ['spec/references/tests.md', 'whose sequence runs both an independent `/work-item --mode=review --type=spec-tests` and `/spec [mode=clarify]` after this step'],
                    ['spec/references/tests.md', 'otherwise, inside a workflow, keep this question narrowed to the material decisions the cases encode; a standalone run keeps the full TC-list review'],
                    ['changes-review/SKILL.md', 'run `/why-review --target=whole-review-target` on the complete review target'],
                    ['changes-review/SKILL.md', 'Skip it only when `--defer=whole-target` assigns it to a named caller'],
                    // A test verify run starts only after an environment check sized to the project, stack and OS
                    ['integration-test/references/mode-verify.md', '**Environment readiness (before any test command):** decide from this project, its stack and the OS what the run needs'],
                    ['integration-test/references/mode-verify.md', 'free only disposable output this step\'s own earlier runs created and no other run is using, or report `ENVIRONMENT-BLOCKED`'],
                    // The shared rule requires two greens where persistent/shared or async state warrants them.
                    ['shared/sync-inline-versions.md', 'an integration suite whose persistent/shared state or async effects make one run insufficient converges on two consecutive fresh green runs; any other suite converges on one fresh green run'],
                    ['e2e-test/references/mode-verify.md', 'Before the command, check environment readiness — what this project, its stack and the OS need'],
                    ['e2e-test/references/mode-verify.md', 'this report-only pass frees nothing'],
                    ['test/SKILL.md', 'first check the environment can run the suites (what this project, stack and OS need'],
                    ['shared/protocols/task-planning-rules.md', '**Before a test verify run**, check its environment is ready — whatever this project, stack and OS need'],
                    // E2E retains its configured single-fresh default; integration repeat depth depends on state.
                    ['shared/verify-convergence-loop.md', '— 2 for integration tests, where one run hides order/state flakiness; 1 for every other suite, E2E included'],
                    ['e2e-test/SKILL.md', 'one fresh green full run converges unless the project configures more'],
                    ['workflow-e2e/SKILL.md', 'Converge on one fresh green run (default 1; the project may configure more consecutive greens)'],
                    // Repeat proof follows configured policy and the actual state/isolation scope.
                    ['integration-test/SKILL.md', 'Follow the configured repeat policy.'],
                    ['integration-test/SKILL.md', 'Without one, persistent/shared-state or async suites need two fresh green runs'],
                    ['integration-test/SKILL.md', "isolated deterministic suites use the runner's normal fresh run"],
                    ['integration-test/SKILL.md', 'Clean up only owned fixture state.'],
                    // why-review's second adversarial round runs only where it pays; the analysis block never drops (P41 X8)
                    ['why-review/references/full-mode.md', '**When it runs:** only when Round 1 found at least one MEDIUM or higher finding, or the target is a one-way door'],
                    ['why-review/references/full-mode.md', 'Round 1 then fills the Adversarial Analysis itself'],
                    // spec-sync reviews once, after the spec sync, and loops back when a review fix changes behavior (P41)
                    ['workflow-spec-sync/SKILL.md', 'A review fix that changes behavior re-runs `/spec [mode=tests]`, the changed-case review when it changed a case, and `/spec [mode=sync]` on the changed part, then the review again on the settled tree, before the verify'],
                    ['workflow-spec-sync/SKILL.md', 'whose reviewed scope (commit or diff identity) still matches the trigger'],
                    ['workflow-spec-sync/SKILL.md', 'any trigger edit made after that report is part of the delta, and the review is never skipped'],
                    // The task review carries the checks an optional challenge used to own (P41 B3)
                    ['work-item/references/review-type-task.md', '| 10  | **Module confirmed**'],
                    ['work-item/references/review-type-task.md', '| 11  | **Technically feasible against entities and service ownership**'],
                    ['work-item/references/review-type-task.md', '| 12  | **Cross-cutting concerns addressed**'],
                    // Search and query changes never scan rows on large data: both review owners block on it
                    ['performance-review/SKILL.md', '**[BLOCKING] Query Scan Gate — no search or query scans rows on large data.**'],
                    ['performance-review/SKILL.md', 'or an unindexed filter, join, sort or group key on such data is at least a HIGH finding and blocks the verdict'],
                    ['changes-review/SKILL.md', "Apply `/performance-review`'s Query Scan Gate, the single owner of the patterns it blocks"],
                    // A focused review of a performance-sensitive change runs the performance review as its own step (P53)
                    ['changes-review/SKILL.md', '**Performance review (conditional step):** when the diff touches data access (queries, loops over collections, paging, indexes), hot paths, caching, concurrency, batch/job throughput, or render-heavy UI, run `/performance-review` on the changed code as its own step'],
                    ['changes-review/SKILL.md', 'Skip it only when `--defer=specialists` assigns it to a named caller (`workflow-review-changes` runs it as its own conditional step)'],
                    ['changes-review/SKILL.md', '**Query scan gate (blocking):** every query, search or filter the change adds or alters on data that can grow large uses an index-backed, sargable access path with a bounded result.'],
                    // The universal planning rule every prompt and spawned agent receives: code changes carry tests, docs sync and review
                    ['shared/protocols/task-planning-rules.md', '**A task that changes code** always plans, as its own tasks, updating its tests, syncing stale docs and specs, and a review after those edits'],
                    ['spec/references/mode-clarify.md', 'an applied change to the reviewed content re-runs that review on the changed part'],
                    ['test/SKILL.md', '`@verify` covers nothing and every requested tier runs'],
                    ['integration-test/references/fix-loop.md', 'except that (b) runs only when (a) leaves a test-side fault possible'],
                    ['e2e-test/references/mode-verify.md', "**Nested deferral:** when this loop runs inside a parent workflow whose `workflow-review-changes` gate re-runs after this step's edits"],
                    ['seed-test-data/SKILL.md', 'skip the loop and hand the final independent review to that gate'],
                    ['plan/SKILL.md', "`Human approval` and the branch's owner-approval fields included"],
                    ['shared/product-roadmap-contract.md', '**Light-profile evidence.**'],
                    ['architecture/references/mode-full.md', 'marked `Validation: deferred to <occurrence-id>`'],
                    ['architecture/references/mode-full.md', 'standalone use always runs Step 5'],
                    ['work-item/references/mode-mockup.md', '**Spec link (workflow step):**'],
                    ['workflow-end/SKILL.md', '**Nested children:**'],
                    ['workflow-end/SKILL.md', "a child gate without evidence blocks this close like the run's own"],
                    ['integration-test/SKILL.md', 'inside `workflow-refactor` by its one baseline run'],
                    ['workflow-refactor/SKILL.md', 'A red characterization test written in this run gets a five-way verdict first'],
                    ['workflow-bugfix/SKILL.md', 'it validates the material decisions it leaves open inside its step, which is the plan approval'],
                    ['plan/SKILL.md', 'an unapproved Plan Gate (`Human approval: REQUIRED`) counts as one, and its question is the plan approval'],
                    ['work-item/references/mode-dor.md', '| ST4 | M1-M5/M7 per story |'],
                    ['workflow-end/SKILL.md', 'in a writing mode (not `--review-only` or `--report-only`, whose findings are handed off as diagnostics)'],
                    ...['why-review/references/full-mode.md', 'architecture/references/mode-review.md', 'ui-design/references/mode-review.md', 'ai-engineering-review/SKILL.md', 'production-readiness-review/SKILL.md', 'performance-review/SKILL.md', 'security-audit/SKILL.md']
                        .map(rel => [rel, 'Also skip when called with `--loop-owner=caller`: the caller validates the merged report once']),
                ];
                // When each owner file is read
                const missing = rules.filter(([rel, phrase]) => !read(rel).includes(phrase)).map(([rel, phrase]) => `${rel}: ${phrase}`);
                // Then every guarantee is still stated by its owner
                assertTrue(missing.length === 0, `step-skill gate rules lost:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            // Guards BR-GWF-08: one deviation log per run, keyed by the baseline run id, with a closed
            // deviation-kind set that workflow-end and the usage report parse. A second id format or a
            // free-form kind makes deviations unreadable to review and to the usage report.
            name: '[content-presence] TC-GWF-041 deviation log lives under the baseline runId with a closed kind set; reviewers read it',
            fn: () => {
                // Given start-workflow, workflow-end and both review skills
                const protocol = stepContract();
                const end = readSkill('workflow-end');
                // When the log contract is read
                for (const phrase of [
                    'Deviation log (the skip log)',
                    '`tmp/workflow-runs/<runId>/skips.md`',
                    '`<occurrence-id> · <deviation-kind> · <evidence>`',
                    'the baseline run id captured at activation',
                    "a nested workflow writes to its parent's log",
                    'there is no other id format',
                ]) {
                    assertTrue(protocol.includes(phrase), `start-workflow deviation-log contract lost "${phrase}"`);
                }
                // Then the deviation kinds form exactly the closed set
                const marker = 'Deviation kinds (closed set; the reason code):';
                const kindsLine = protocol.split('\n').find(line => line.includes(marker)) || '';
                const kinds = [...kindsLine.slice(kindsLine.indexOf(marker)).matchAll(/`([a-z][a-z-]*)` \(/g)].map(m => m[1]);
                assertTrue(JSON.stringify(kinds) === JSON.stringify(DEVIATION_KINDS),
                    `deviation kinds changed: expected ${DEVIATION_KINDS.join(', ')}; got ${kinds.join(', ') || 'none'}`);
                // And workflow-end writes only kinds from that set
                const written = [...end.matchAll(/ · ([a-z][a-z-]*) · /g)].map(m => m[1]);
                assertTrue(written.length > 0, 'workflow-end no longer writes a deviation-log line');
                const unknown = written.filter(kind => !DEVIATION_KINDS.includes(kind));
                assertTrue(unknown.length === 0, `workflow-end writes deviation kinds outside the closed set: ${unknown.join(', ')}`);
                // And both review skills read the log when it exists
                const readLine = "read the run's deviation log (`tmp/workflow-runs/<runId>/skips.md`) when present";
                for (const name of ['workflow-review-changes', 'changes-review']) {
                    assertTrue(readSkill(name).includes(readLine), `${name} no longer reads the deviation log as a review input`);
                }
            },
        },
        {
            // Guards BR-GWF-03 + BR-GWF-15 (SC-3): a run cannot close while any declared outcome gate
            // lacks evidence. The check comes first and covers every gate id the schema allows.
            name: '[content-presence] TC-GWF-007 workflow-end first checks evidence for every outcome gate and blocks on a gap',
            fn: () => {
                // Given workflow-end and the schema's closed gate-id set
                const end = readSkill('workflow-end');
                const schema = JSON.parse(readFile(path.resolve(PROJECT_DIR, '.claude', 'workflows.schema.json')));
                const gateIds = schema.definitions.OutcomeGate.properties.id.enum;
                const steps = sectionBetween(end, '## What To Do', '\n---');
                // When its first numbered step is read
                const firstStep = /^(\d+)\. \*\*([^*]+)\*\*/m.exec(steps);
                assertTrue(firstStep !== null && firstStep[1] === '0' && firstStep[2] === 'Outcome-gate evidence check',
                    `workflow-end's first step is not step 0, the outcome-gate evidence check (found "${firstStep && firstStep[0]}")`);
                const check = outcomeGateCheck();
                // Then it refuses the close on missing evidence, names the gate, and maps every gate id
                assertTrue(check.includes('**Missing evidence for any gate blocks the close:**'),
                    'the outcome-gate check no longer blocks on missing evidence');
                assertTrue(check.includes('name the gate and the missing evidence'),
                    'the outcome-gate refusal no longer names the gate');
                const unmapped = gateIds.filter(id => !check.includes(`\`${id}\`:`));
                assertTrue(unmapped.length === 0, `outcome gates without an evidence rule: ${unmapped.join(', ')}`);
                // And the ordered mandatory sequence starts with it
                assertTrue(/\*\*IMPORTANT MANDATORY Steps:\*\* outcome-gate-evidence-check -> /.test(end),
                    'workflow-end mandatory step list does not start with the outcome-gate evidence check');
            },
        },
        {
            // Guards BR-GWF-03 (R2-11): review-converged is machine-checked through the receipt CLI's
            // JSON; a cited report from the gate's declared satisfier closes without a question and is
            // logged only after accepted current evidence; rejected or stale reports block; the
            // commit bar is unchanged.
            name: '[content-presence] TC-GWF-042 review-converged reads the receipt JSON and accepts a cited report as a logged deviation',
            fn: () => {
                // Given workflow-end's outcome-gate check
                const rule = outcomeGateCheck().split('\n').find(line => line.includes('`review-converged`:')) || '';
                // When the review-converged rule is read
                const required = [
                    'node .claude/hooks/lib/review-receipt.cjs check',
                    'read its JSON, not its exit code',
                    '`ERROR` blocks',
                    '`CLEAN` passes',
                    '`CHANGED` with a non-null `review` passes',
                    'a `skip` receipt alone is not a receipt',
                    '`CHANGED` with `review: null` passes only when the run cites the review report',
                    // the report comes from whichever step the gate declares as its satisfier (A-M1)
                    'written by the occurrence that satisfies this gate',
                    '`outcomeGates[].satisfiedBy`',
                    '`<that occurrence-id> · review-report · <report path>`',
                    'a not-converged verdict, stale report, mismatched target or unknown freshness **blocks the close**',
                    'A cited path alone never satisfies the gate',
                    'review-report-evidence.md',
                    '`BLOCKED`/`ERROR` blocks',
                    // failed/stale evidence blocks closure (AC-GWF-07)
                    'not converged: <final status>',
                    'stale: predates <occurrence-id>',
                    'the close message repeats it',
                    'Neither a receipt nor a cited report → block',
                    'a commit still needs the receipt',
                ];
                const missing = required.filter(p => !rule.includes(p));
                // Then every branch of the receipt contract is present
                assertTrue(missing.length === 0,
                    `workflow-end review-converged rule lost:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            // Guards BR-GWF-01 + BR-GWF-14: a nested workflow-review-changes stays in the main session,
            // and the flex rules keep that as a fixed dependency rather than a flexible step.
            name: '[content-presence] TC-GWF-010 nested workflow-review-changes stays inline under the flex rules',
            fn: () => {
                // Given start-workflow
                const skill = readSkill('start-workflow');
                // When the nested-workflow gate and the flex rules are read
                // Then both keep the inline rule
                assertTrue(skill.includes('**EXCEPTION — `workflow-review-changes` runs INLINE in the main session (never a sub-agent):**'),
                    'start-workflow lost the workflow-review-changes inline exception');
                assertTrue(stepContract().includes('a nested `workflow-review-changes` runs inline'),
                    'the flex rules no longer keep the nested review inline as a data dependency');
            },
        },
        {
            // Guards BR-GWF-04: the lean route never builds behavior the supplied spec does not contain.
            name: '[content-presence] TC-GWF-019 workflow-implement-spec: a vague, contradictory or incomplete spec stops the route and escalates',
            fn: () => {
                // Given the lean route wrapper
                const [escalation] = paragraphsMentioning(readSkill('workflow-implement-spec'), /\[ESCALATION/);
                // When its escalation paragraph is read
                const required = [
                    'the spec is vague or contradictory',
                    'the requested behavior is not in the supplied spec',
                    'STOP before `/plan`',
                    'ask the user to clarify the spec or switch to `workflow-feature`, which updates the spec first',
                    'Never guess the missing behavior and never drop it silently',
                ];
                // Then all three triggers, both options and the no-guess rule sit in that one paragraph
                assertTrue(Boolean(escalation), 'workflow-implement-spec lost its escalation paragraph');
                const missing = required.filter(p => !escalation.includes(p));
                assertTrue(missing.length === 0, `workflow-implement-spec escalation lost:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            // Guards BR-GWF-05: spec-supplied work does not grow beyond the spec it was given.
            name: '[content-presence] TC-GWF-020 workflow-implement-spec: workflow-owned baseline keeps the lean plan in supplied scope',
            fn: () => {
                // Given the lean route wrapper and the compact plan scope gate
                const [anchor] = paragraphsMentioning(readSkill('workflow-implement-spec'), /\[PLAN SCOPE ANCHOR\]/);
                const plan = readSkill('plan');
                // When the workflow-owned anchor and plan's supplied-spec gate are read
                const required = [
                    'workflow report records the supplied spec path and revision as `spec_baseline`',
                    '`/plan` names it as governing intent',
                    'keeps every phase and acceptance gate within that baseline',
                    '`Proposed additions — owner approval required`',
                    'never an accepted plan phase',
                ];
                // Then the workflow owns the baseline while plan keeps the outcome-level guard
                assertTrue(Boolean(anchor), 'workflow-implement-spec lost its plan-scope anchor paragraph');
                const missing = required.filter(p => !anchor.includes(p));
                assertTrue(missing.length === 0, `workflow-implement-spec plan-scope anchor lost:\n  ${missing.join('\n  ')}`);
                assertTrue(plan.includes('**Supplied spec:** preserve the supplied baseline') &&
                    plan.includes('`Proposed additions — owner approval required`'),
                    'plan must preserve supplied scope without reintroducing a heavyweight baseline section');
            },
        },
        {
            // Guards BR-GWF-09 + BR-GWF-04: missing behavior is specified first, never built from a guess.
            name: '[content-presence] TC-GWF-044 workflow-implement-spec: a spec lacking the requested behavior stops at the gap review; the descriptions route it to workflow-feature',
            fn: () => {
                // Given the lean and feature route wrappers
                const lean = readSkill('workflow-implement-spec');
                const feature = readSkill('workflow-feature');
                // When the gap-review paragraph and both descriptions are read
                const [escalation] = paragraphsMentioning(lean, /\[ESCALATION/);
                const description = body => (/^description:[ \t]*(.*)$/m.exec(body) || [])[1] || '';
                // Then the lean route stops at its gap review, which runs before planning
                assertTrue(Boolean(escalation) && escalation.includes('`/spec [mode=clarify]` runs as a gap review of the supplied spec against the request'),
                    'workflow-implement-spec must run /spec [mode=clarify] as the gap review that can stop the route');
                assertTrue(/IMPORTANT MANDATORY Steps:\*\* \/investigate -> \/spec \[mode=clarify\] -> \/plan ->/.test(lean),
                    'the gap review must run between /investigate and /plan');
                // And each description sends the other case to the other route
                assertTrue(/\bworkflow-feature\b/.test(description(lean)),
                    'the lean description must route a spec gap to workflow-feature');
                assertTrue(/\bworkflow-implement-spec\b/.test(description(feature)),
                    'the feature description must route spec-complete work to workflow-implement-spec');
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
                for (const agent of ['backend-developer', 'docs-manager']) {
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
                const nonCodeBody = readAgent('docs-manager');
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
            // The relocated guidance was GENERALIZED, not lost: the deleted hook injected a
            // hardcoded `design-system-canonical.md` filename, while the skill now resolves the
            // authority from `docs/project-config.json` (`designSystem.canonicalDoc`) so a project
            // declares its own. Keying on the retired literal filename asserted the old mechanism
            // rather than the obligation, so it failed against a skill that carries the guidance in
            // full — including against HEAD, which is why this was already red before this change.
            // These two phrases pin the obligation itself: the read-before-choose ordering and the
            // never-invent floor. Each was mutation-checked to BITE — deleting the relocated bullet
            // fails both. `designSystem.canonicalDoc` was deliberately NOT included despite being
            // the obvious key: it also appears in the authority-resolution step earlier in the
            // skill, so it survives deleting this bullet entirely and would assert nothing here
            // while reading as though it did.
            fn: () => assertRelocated('design-system-canonical-guide', 'ui-design', [
                'before choosing tokens, component patterns, breakpoints, or BEM conventions',
                'never invent a canonical path or token vocabulary',
            ]),
        },
        {
            name: '[content-presence] TC-CP-006 ba-refinement DoR/hypothesis guidance relocated into the work-item refine mode',
            fn: () => assertRelocated('ba-refinement-context', 'work-item/references/mode-refine.md', [
                'readiness check',
                'hypothesis validation',
            ]),
        },
        {
            name: '[content-presence] TC-CP-007 graph-grep post-grep graph hint relocated into investigate skill as optional advice',
            fn: () => assertRelocated('graph-grep-suggester', 'investigate', [
                'Post-Grep Graph Hint (optional)',
                'grep may not reveal',
            ]),
        },
        {
            // Guards the work-tracker vocabulary rename: an adopter refreshing `.claude/` learns the move from the
            // skill itself and from the adopter table, and a leftover old folder would keep answering the old command.
            name: '[content-presence] renamed work-tracking skills carry a "Renamed: formerly" note, their old folders stay removed and the adopter table lists every rename',
            skip: IS_FRAMEWORK_REPO ? false : 'asserts the framework repo\'s own skills and adopter guide (framework-repo signal)',
            fn: () => {
                const defects = [];
                const guide = fs.readFileSync(path.resolve(PROJECT_DIR, '.claude', 'config', 'README.md'), 'utf8');
                const rows = guide.split(/\r?\n/).filter(line => line.trimStart().startsWith('|'));
                for (const [former, current] of RENAMED_TRACKING_SKILLS) {
                    if (fs.existsSync(path.join(SKILLS_DIR, former))) defects.push(`${former}: the old skill folder still exists`);
                    const skillFile = path.join(SKILLS_DIR, current, 'SKILL.md');
                    if (!fs.existsSync(skillFile)) { defects.push(`${current}: SKILL.md is missing`); continue; }
                    const body = fs.readFileSync(skillFile, 'utf8');
                    if (!new RegExp(`^name: ${current}\\r?$`, 'm').test(body)) defects.push(`${current}: frontmatter name is not ${current}`);
                    const note = body.split(/\r?\n/).find(line => /\*\*Renamed:\*\*/.test(line));
                    if (!note) defects.push(`${current}: no "**Renamed:** formerly" note`);
                    else if (!new RegExp(`formerly \`/?${former}\``).test(note)) defects.push(`${current}: the Renamed note does not name the former ${former}`);
                    const mentions = name => new RegExp(`\`/?${name}\``);
                    if (!rows.some(row => mentions(former).test(row) && mentions(current).test(row))) defects.push(`adopter table: no row maps ${former} to ${current}`);
                }
                assertTrue(defects.length === 0, `renamed-skill guidance is incomplete:\n  ${defects.join('\n  ')}`);
            },
        },
        {
            name: '[content-presence] TC-CP-009 integration-test execution-discipline rules present in EVERY integration-test-family skill',
            fn: () => {
                // The five load-bearing rules the user requires across the whole integration-test
                // family. Each is a verbatim fragment of SYNC:integration-test-execution-discipline.
                // Keyed per-rule (not the literal block prose) so a phrasing tweak that PRESERVES the
                // rule still passes, but DROPPING a rule from any family skill fails loudly.
                const rules = {
                    'verify-configured-suite': 'Verify the configured relevant suite',
                    'no-shortcut-that-skips-invariant': 'Never use a shortcut that skips the behavior the assertion is meant to protect',
                    'investigate-debug-on-failure': '`/investigate --mode=debug` the root cause',
                    'timeouts-are-budgets': 'Use project timeouts as budgets, not as fixes',
                    'configured-repeat-policy': 'Follow the configured repeat policy',
                };
                // Every integration-test-family skill — integration-test (write, plus its `--mode=review`
                // and `--mode=verify` modes, which load under the same skill) and the workflow that chains
                // them. Adding a family skill without these rules (or dropping one here) must surface as a
                // failure, not a silent gap.
                const familySkills = [
                    'integration-test',
                    'workflow-integration-test',
                ];
                const missing = familyRuleGaps(SKILLS_DIR, familySkills, 'integration-test-execution-discipline', rules);
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
                // when a test fails, root-cause it, triangulate the failure against the owner
                // artifact AND the source to decide whether the SOURCE or the TEST is at fault, and
                // ask the user when the spec is silent/ambiguous. Keyed per-rule (verbatim fragments
                // of SYNC:test-failure-fault-adjudication) so a phrasing tweak that PRESERVES a rule
                // still passes, but DROPPING a rule from any family skill fails loudly.
                const rules = {
                    'who-is-at-fault': 'who is at fault — the source code or the test code',
                    'root-cause-first': 'trace end-to-start before editing',
                    'triangulate-owner-and-source': 'Triangulate against the owner artifact AND the source',
                    'classify-source-wrong': 'SOURCE-WRONG',
                    'classify-test-wrong': 'TEST-WRONG',
                    'ask-user-when-unclear': 'Ask the user when intended behavior is unclear',
                };
                // Every debug/fix/test-family skill — investigate, fix, the test runner,
                // integration-test (incl. its review and verify modes), e2e, and the bugfix workflow.
                // Adding a family skill without these rules (or dropping one here) must surface as
                // a failure, not a silent gap.
                const familySkills = [
                    'investigate/references/mode-debug.md',
                    'fix',
                    'test',
                    'integration-test',
                    'e2e-test',
                    'workflow-bugfix',
                ];
                const missing = familyRuleGaps(SKILLS_DIR, familySkills, 'test-failure-fault-adjudication', rules);
                assertTrue(missing.length === 0,
                    `test-failure fault-adjudication rule drift:\n  ${missing.join('\n  ')}\n` +
                    `Fix: re-sync SYNC:test-failure-fault-adjudication ` +
                    `(py -3 .claude/scripts/sync-update-blocks.py test-failure-fault-adjudication).`);
            },
        },
        {
            // Guards R2-19: once a family skill carries either pinned protocol as a guide entry, the
            // fragments must still be reachable — in the projection file — and a lost guide or a
            // projection missing one fragment must still fail, naming the skill and the rule.
            name: '[content-presence] TC-PDL-084 TC-CP-009/-010 accept a guide carrier only while the projection holds every fragment',
            fn: () => {
                const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-guide-'));
                try {
                    for (const tag of ['integration-test-execution-discipline', 'test-failure-fault-adjudication']) {
                        // Given: a fixture family skill holding a guide entry for the tag, and a
                        // projection file holding every pinned fragment.
                        const skillsDir = path.join(tmp, tag, '.claude', 'skills');
                        const projection = path.join(skillsDir, 'shared', 'protocols', `${tag}.md`);
                        const skillFile = path.join(skillsDir, 'family-skill', 'SKILL.md');
                        fs.mkdirSync(path.dirname(projection), { recursive: true });
                        fs.mkdirSync(path.dirname(skillFile), { recursive: true });
                        const rules = { 'first-rule': 'First pinned fragment', 'second-rule': 'Second pinned fragment' };
                        fs.writeFileSync(projection, `> ${rules['first-rule']}.\n> ${rules['second-rule']}.\n`);
                        const guideLine = guideCarrier.formatGuideLine({ tag, summary: 'Fixture protocol', when: 'testing', path: `.claude/skills/shared/protocols/${tag}.md` });
                        fs.writeFileSync(skillFile, `# Family\n\n${guideCarrier.GUIDE_BLOCK_START}\n\n${guideLine}\n\n${guideCarrier.GUIDE_BLOCK_END}\n`);
                        const gaps = () => familyRuleGaps(skillsDir, ['family-skill'], tag, rules);

                        // When the rule check runs, Then it passes.
                        assertTrue(gaps().length === 0, `${tag}: guide carrier rejected: ${gaps().join('; ')}`);
                        // When the projection lacks one fragment, Then it fails naming the skill and rule.
                        fs.writeFileSync(projection, `> ${rules['first-rule']}.\n`);
                        assertTrue(gaps().length === 1 && gaps()[0].startsWith('family-skill → missing rule "second-rule"'),
                            `${tag}: a projection missing a fragment must fail: ${gaps().join('; ')}`);
                        // When the guide entry is removed (projection whole again), Then both rules fail.
                        fs.writeFileSync(projection, `> ${rules['first-rule']}.\n> ${rules['second-rule']}.\n`);
                        fs.writeFileSync(skillFile, '# Family\n\nNo carrier.\n');
                        assertTrue(gaps().length === 2 && gaps().every(g => g.startsWith('family-skill → missing rule')),
                            `${tag}: a skill with neither form must fail: ${gaps().join('; ')}`);
                        // And the inline form still passes on its own.
                        fs.writeFileSync(skillFile, `# Family\n\n${rules['first-rule']}. ${rules['second-rule']}.\n`);
                        fs.rmSync(projection);
                        assertTrue(gaps().length === 0, `${tag}: an inline carrier must still pass`);
                    }
                } finally {
                    fs.rmSync(tmp, { recursive: true, force: true });
                }
            },
        },
        {
            // Business Intent / Invariant Guarded (BR-PDL-05, BR-PDL-15): an unreviewed second-host step
            // never runs, so users must learn from the guide that a new or changed step waits for their
            // review, where to review it, that the guides deliver until then, and that unchanged steps
            // keep their earlier review.
            name: '[content-presence] TC-PDL-028 the hooks guide tells second-host users to review new delivery steps',
            fn: () => {
                // Given the shipped hooks guide
                const guide = readFile(HOOKS_GUIDE);
                // When its trust note is read, Then one paragraph carries every note
                const gaps = hookTrustNoteGaps(guide);
                assertTrue(gaps.length === 0, `.claude/docs/hooks/README.md trust note is missing: ${gaps.join('; ')}`);

                // And removing a note (boundary counter-case) fails, naming exactly that note
                const note = paragraphsMentioning(guide, /`\/hooks`/).find(p => hookTrustNoteGaps(p).length === 0);
                const withoutUnchanged = note.replace(/[^.]*\bearlier review still holds\b[^.]*\./i, '');
                assertTrue(JSON.stringify(hookTrustNoteGaps(withoutUnchanged)) === JSON.stringify(['an unchanged step keeps its earlier review']),
                    `dropping the unchanged-step sentence must fail on that note alone: ${hookTrustNoteGaps(withoutUnchanged).join('; ')}`);
                const withoutReviewGate = note.replace(/[^.]*\bnew or changed\b[^.]*\./i, '');
                assertTrue(hookTrustNoteGaps(withoutReviewGate).includes('a new or changed step runs only after review'),
                    `dropping the review-gate sentence must fail: ${hookTrustNoteGaps(withoutReviewGate).join('; ')}`);
                // And a guide with no `/hooks` paragraph fails on every note
                assertTrue(hookTrustNoteGaps('# Hooks\n\nNo trust note here.\n').length === Object.keys(HOOK_TRUST_NOTES).length,
                    'a guide without the trust note must fail on every note');
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
        {
            name: '[content-presence] TC-CP-014 no skill or framework config instructs CHANGELOG.md generation',
            fn: () => {
                // The framework generates release notes, never a changelog. This asserts the
                // ABSENCE of a generation duty, which presence tests cannot cover: a skill that
                // re-grows a "prepend to CHANGELOG.md" step, or a config that re-adds a
                // changelog output key, fails here.
                //
                // Deliberately NOT flagged (and the regexes below must keep letting these pass):
                //   - "history belongs in git / CHANGELOG.md / docs/adr/**" — says where a
                //     consumer project's history lives; instructs no one to write one.
                //   - "Check CHANGELOG.md" / "read the upstream CHANGELOG" — third-party.
                //   - CHANGELOG.md listed as an example root doc to SCAN — reads, never creates.
                //   - "[skip changelog]" — a commit-message marker excluding a commit from the
                //     generated notes; an input filter, not an output.
                const WRITE_VERBS =
                    /\b(?:write|writes|writing|update|updates|updating|prepend|prepends|prepending|append|appends|appending|generate|generates|generating|create|creates|creating|maintain|maintains|maintaining)\s+(?:the\s+|a\s+|an\s+|to\s+|into\s+)*[`'"]?CHANGELOG\.md/i;
                // The verb also shows up AFTER the filename ("Aggregated log: CHANGELOG.md
                // (prepended)"), so match that shape too — same verb set, opposite order.
                const WRITTEN_SUFFIX =
                    /CHANGELOG\.md[^\n]{0,40}?\b(?:prepended|appended|generated|written|created|updated|maintained|auto-saved)\b/i;
                const OUTPUT_KEYS = /\b(?:changelog_file|changelog_root|per_service_changelog)\b/;
                const GENERATOR_REF = /\bupdate-changelog(?:\.cjs)?\b/;

                const roots = [
                    path.join(PROJECT_DIR, '.claude', 'skills'),
                    path.join(PROJECT_DIR, '.claude', 'config'),
                ];
                const EXT = /\.(?:md|ya?ml|json|c?js|mjs)$/i;
                // Skill-local dependencies are installed beside documented skill
                // runners. Their third-party CHANGELOGs are not framework guidance.
                const IGNORED_DIRS = new Set(['node_modules']);
                const files = [];
                const walk = dir => {
                    if (!fs.existsSync(dir)) return;
                    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                        const p = path.join(dir, e.name);
                        if (e.isDirectory()) {
                            if (IGNORED_DIRS.has(e.name)) continue;
                            walk(p);
                        }
                        else if (EXT.test(e.name)) files.push(p);
                    }
                };
                for (const r of roots) walk(r);

                assertTrue(files.length >= 100,
                    `TC-CP-014 scanned only ${files.length} file(s) under .claude/skills + ` +
                    `.claude/config — expected at least 100. The walk is vacuous; fix it before ` +
                    `trusting a green.`);

                const problems = [];
                for (const p of files) {
                    const text = readFile(p);
                    const rel = path.relative(PROJECT_DIR, p);
                    for (const [label, rx] of [
                        ['writes a CHANGELOG.md', WRITE_VERBS],
                        ['declares a CHANGELOG.md as written output', WRITTEN_SUFFIX],
                        ['changelog output config key', OUTPUT_KEYS],
                        ['changelog generator script reference', GENERATOR_REF],
                    ]) {
                        const m = text.match(rx);
                        if (m) problems.push(`${rel} → ${label}: "${m[0]}"`);
                    }
                }

                assertTrue(problems.length === 0,
                    `CHANGELOG generation re-introduced:\n  ${problems.join('\n  ')}\n` +
                    `Fix: this framework produces release notes only — one dated file per release ` +
                    `under the configured release-notes output dir. Remove the changelog step, key, ` +
                    `or script; do not rename it. Reading an existing or third-party CHANGELOG is ` +
                    `fine — writing one is not.`);
            },
        },
        {
            name: '[content-presence] TC-CP-016 UI review judges whole surfaces, surface load, container fit, and binds plans',
            // Business Intent / Invariant Guarded: a UI review must judge what RENDERS (the composed
            // surface) and whether a view asks for more than its task needs, and a front-end plan must
            // be checked against the same checklist before code exists. Every phrase below is the only
            // carrier of one obligation; removing it re-opens the "30-field dialog passes review" gap.
            fn: () => {
                const DOCS_DIR = path.resolve(PROJECT_DIR, '.claude', 'docs');
                const expectations = [
                    ['docs/design-review-checklist.md', readFile(path.join(DOCS_DIR, 'design-review-checklist.md')), [
                        '### 0.5 Surface scope and composition',
                        'Severity vocabulary map',
                        '| B12 | **Surface load fits the task**',
                        '| B15 | **Complexity budget respected**',
                        '| E9  | **Container fits the task**',
                        '| E11 | Dismissing a container with unsaved input is protected',
                        '## R. Forms & Data Entry',
                        'Field Necessity Matrix',
                        '| I15 | Dialogs and overlays manage focus',
                        '| K10 | Every visible control works end to end',
                        '## H. Expert, Data-Heavy & Enterprise Use',
                    ]],
                    ['docs/design-review-calibration.md', readFile(path.join(DOCS_DIR, 'design-review-calibration.md')), [
                        '## C1 — The overloaded creation dialog',
                        '**NOT a finding.**',
                    ]],
                    ['skills/ui-design/references/mode-review.md', readFile(path.join(SKILLS_DIR, 'ui-design', 'references', 'mode-review.md')), [
                        '**Expand files → surfaces (MANDATORY when UI files match).**',
                        '## Phase 2B: Surface Composition',
                        '**Style-origin map.**',
                        '## Phase 2C: Surface UX Pass',
                        '**Stacking-context trap**',
                        '/surfaces/{surface}.md',
                    ]],
                    ['skills/plan/references/mode-review.md', readFile(path.join(SKILLS_DIR, 'plan', 'references', 'mode-review.md')), [
                        '**User-facing UI:** apply journey, design-system, accessibility, state, and container-fit plan checks.',
                    ]],
                    ['skills/plan/SKILL.md', readSkill('plan'), [
                        '**User-facing UI:** apply the configured UX/design authority and bind relevant states/accessibility criteria to acceptance evidence',
                    ]],
                    ['skills/design-spec/SKILL.md', readSkill('design-spec'), [
                        '## 1b. Information Priority & Container',
                    ]],
                ];
                const missing = [];
                for (const [label, body, phrases] of expectations) {
                    for (const phrase of phrases) if (!body.includes(phrase)) missing.push(`${label} → ${phrase}`);
                }
                assertTrue(missing.length === 0,
                    `UI-review surface obligations lost:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            // Guards BR-ADS-05: with the trailer switch off (the default) the commit guidance asks for no line
            // that nothing reads, and no text promises an automated check of it. Skill text ships with the
            // bundle, so this asserts unguarded (like TC-CP-004).
            name: '[content-presence] TC-ADS-006 commit trailer requires explicit opt-in and claims no sensor',
            fn: () => {
                // Given the commit skill
                const body = readSkill('commit');
                // Absent/false must not add a trailer; compact guidance need not
                // restore the old multi-section message template to express it.
                assertTrue(/Only when `commit\.fixOriginTrailer: true`, add `Fix-Origin:/.test(body),
                    'Fix-Origin must remain conditional on an explicitly true setting');
                // And no paragraph about the trailer claims a sensor, a presence check or a mandatory field
                const claims = paragraphsMentioning(body, /Fix-Origin|fixOriginTrailer/)
                    .filter(p => /\bsensors?\b|verif(?:y|ies)\s+(?:its\s+)?presence|required on every/i.test(p));
                assertTrue(claims.length === 0, `commit skill claims a Fix-Origin check or requirement:\n  ${claims.join('\n  ')}`);
            },
        },
        {
            // Guards BR-ADS-05: turning the trailer on never leads anyone to rewrite existing history.
            name: '[content-presence] TC-ADS-007 commit skill names commit.fixOriginTrailer and limits the trailer to new commits',
            fn: () => {
                // Given the part of the commit skill that describes the trailer option
                const body = readSkill('commit');
                // When a maintainer reads it
                const missing = [
                    'commit.fixOriginTrailer: true',
                    'Fix-Origin: feedback',
                    '`regression` (earlier defect)',
                    '`not-applicable` (not a fix)',
                    'to new commits',
                    'never reword history to add it',
                ].filter(p => !body.includes(p));
                // Then it names the switch and scopes the trailer to new commits only
                assertTrue(missing.length === 0, `commit Fix-Origin opt-in text lost:\n  ${missing.join('\n  ')}`);
                // And no sentence advises rewording existing commits
                const rewordAdvice = body.split(/(?<=[.!?])\s+/).filter(s => /\breword/i.test(s) && !/\bnever\b/i.test(s));
                assertTrue(rewordAdvice.length === 0, `commit skill advises rewording commits:\n  ${rewordAdvice.join('\n  ')}`);
            },
        },
        {
            // Guards BR-ADS-02: sessions no longer install the graph tooling, so the explicit build installs it
            // first, with one command that is the same on every OS, and stops on failure.
            name: '[content-presence] TC-ADS-004 graph-code build mode installs the graph tooling as its first step',
            fn: () => {
                // Given the graph-code build-mode reference
                const body = readFile(path.join(SKILLS_DIR, 'graph-code', 'references', 'mode-build.md'));
                const steps = body.slice(body.indexOf('## Steps'));
                // When its Steps section is read
                const installAt = steps.indexOf(GRAPH_TOOLING_INSTALL_COMMAND);
                const firstGraphCallAt = steps.indexOf('python .claude/scripts/code_graph');
                // Then the node install command is present and precedes every graph CLI call
                assertTrue(body.includes('## Steps') && installAt !== -1, 'graph-code build mode lost the node ensurePythonDeps install step');
                assertTrue(firstGraphCallAt === -1 || installAt < firstGraphCallAt,
                    'graph-code build mode runs a graph CLI command before installing the graph tooling');
                // And a failed install stops the build with a message
                const step0 = sectionBetween(steps, '### Step 0', '### ');
                assertTrue(/Non-zero exit:\*\*\s*stop\./.test(step0), 'graph-code build mode Step 0 no longer stops when the install fails');
            },
        },
        {
            // Guards decision D-2 (and spec TC-PD-021: the general deck builder starts only on a developer request): a utility that drops its manual-only flag re-enters the model's skill
            // list and self-triggers again; a flipped `commit`/`learn` breaks the agent and lesson paths.
            name: '[content-presence] TC-ADS-008 command-only utility skills are manual-only; commit, learn, git-conflict-resolve and sync-codex stay callable',
            skip: IS_FRAMEWORK_REPO ? false : 'asserts the framework repo\'s own skill defaults (framework-repo signal)',
            fn: () => {
                // Given the command-only utilities and the skills the owner keeps model-callable
                const defects = [];
                // When each SKILL.md frontmatter is parsed
                for (const name of COMMAND_ONLY_UTILITIES) {
                    const values = modelInvocationValues(readSkill(name));
                    if (values === null) defects.push(`${name}: no YAML frontmatter`);
                    else if (values.length !== 1 || values[0] !== 'true') {
                        defects.push(`${name}: disable-model-invocation must be exactly one \`true\`, found ${JSON.stringify(values)}`);
                    }
                }
                for (const name of MODEL_CALLABLE_BY_DECISION) {
                    const values = modelInvocationValues(readSkill(name)) || [];
                    if (values.includes('true')) defects.push(`${name}: must stay model-callable, found disable-model-invocation: true`);
                }
                // Then every utility is manual-only and the callable pair is untouched
                assertTrue(defects.length === 0, `command-only skill policy (D-2) broken:\n  ${defects.join('\n  ')}`);
            },
        },
        {
            // Guards the by-path coupling: callers restate html-export's exit codes in prose, so a code
            // change in EXIT or a reworded caller would otherwise mis-route a render result silently.
            name: '[content-presence] TC-HTMLX-052 html-export callers share one exit rule that matches EXIT',
            skip: IS_FRAMEWORK_REPO ? false : 'asserts the framework repo\'s own caller skills (framework-repo signal)',
            fn: () => {
                // Given html-export's exit-code table and the three skills that call its script by path
                const { EXIT } = require(path.join(SKILLS_DIR, 'html-export', 'scripts', 'lib', 'exit-codes.cjs'));
                const defects = [];
                const rules = new Map();
                // When each caller's exit-rule line is read (skills, then reference files)
                const callers = [
                    ...HTML_EXPORT_CALLERS.map(name => [name, readSkill(name)]),
                    ...HTML_EXPORT_CALLER_REFERENCES.map(rel => [rel, readFile(path.join(SKILLS_DIR, ...rel.split('/')))]),
                ];
                for (const [name, body] of callers) {
                    const found = body.match(HTML_EXPORT_EXIT_RULE) || [];
                    if (found.length !== 1) defects.push(`${name}: expected one html-export exit rule line, found ${found.length}`);
                    else rules.set(name, found[0].trim());
                    if (!body.includes(`node ${HTML_EXPORT_SCRIPT} `)) defects.push(`${name}: does not run ${HTML_EXPORT_SCRIPT} by path`);
                }
                // And each caller that restates the rule as an exit table keeps it in step with EXIT
                for (const rel of HTML_EXPORT_EXIT_TABLES) {
                    const body = readFile(path.join(SKILLS_DIR, ...rel.split('/')));
                    for (const defect of htmlExportExitTableDefects(body, EXIT)) defects.push(`${rel}: ${defect}`);
                    if (!body.includes(`node ${HTML_EXPORT_SCRIPT} `)) defects.push(`${rel}: does not run ${HTML_EXPORT_SCRIPT} by path`);
                }
                // Then the line is byte-identical across callers
                const distinct = [...new Set(rules.values())];
                if (distinct.length > 1) {
                    defects.push(`exit rule differs across callers:\n    ${[...rules].map(([n, r]) => `${n}: ${r}`).join('\n    ')}`);
                }
                // And it covers exactly the EXIT values, with each code routed to its meaning
                const codes = Object.values(EXIT).sort((a, b) => a - b);
                if (JSON.stringify(codes) !== JSON.stringify([0, 1, 2, 3, 4])) {
                    defects.push(`EXIT has values ${JSON.stringify(codes)}; the caller exit rule covers only 0-4 — update the rule and this test`);
                }
                const expectedClauses = [
                    `exit ${EXIT.OK} → evidence as scoped`,
                    `exit ${EXIT.PAGE_ERROR} → fix the page and re-run`,
                    `exit ${EXIT.DEPENDENCY} → \`NOT VERIFIABLE\``,
                    `exit ${EXIT.ERROR}/${EXIT.USAGE} → tool failure`,
                    'mark `NOT VERIFIABLE`',
                ];
                for (const rule of distinct) {
                    for (const clause of expectedClauses) if (!rule.includes(clause)) defects.push(`exit rule lacks "${clause}"`);
                    const mentioned = [...rule.matchAll(/\bexit (\d+(?:\/\d+)*)/g)].flatMap(m => m[1].split('/').map(Number)).sort((a, b) => a - b);
                    if (JSON.stringify(mentioned) !== JSON.stringify(codes)) {
                        defects.push(`exit rule names codes ${JSON.stringify(mentioned)}, EXIT has ${JSON.stringify(codes)}`);
                    }
                }
                // And the script the callers name exists
                if (!fs.existsSync(path.resolve(PROJECT_DIR, HTML_EXPORT_SCRIPT))) defects.push(`${HTML_EXPORT_SCRIPT} is missing`);
                assertTrue(defects.length === 0, `html-export caller exit rule drifted:\n  ${defects.join('\n  ')}`);
            },
        },
        {
            // Proves the table form of the guard can fail: each kind of drift a caller's exit table can
            // make is named. Literal EXIT values and tables, so it runs in any project layout.
            name: '[content-presence] TC-HTMLX-052 a drifted html-export exit table is named (fixture)',
            fn: () => {
                // Given the canonical exit codes and a table that routes each one as the caller rule does
                const EXIT = { OK: 0, ERROR: 1, USAGE: 2, DEPENDENCY: 3, PAGE_ERROR: 4 };
                const table = (rows) => ['Read the exit code first:', '', '| Exit | Meaning | Action |', '| --- | --- | --- |', ...rows, '', 'After.'].join('\n');
                const good = [
                    '| 0 | Evidence as scoped | Open the PNGs |',
                    '| 4 | A page fault | Fix the draft, re-render |',
                    '| 3 | A dependency is missing | Mark `NOT VERIFIABLE`. NEVER run an install command |',
                    '| 1 or 2 | Tool failure | Quote stderr, mark `NOT VERIFIABLE`. Never count it as a design defect or a pass |',
                ];
                // When the intact table is checked, Then nothing is reported
                const clean = htmlExportExitTableDefects(table(good), EXIT);
                assertTrue(clean.length === 0, `unexpected defects: ${clean.join('; ')}`);
                // When a row is dropped, a code is added, a clause is reworded or 1 and 2 split, Then each is named
                const drifts = [
                    [good.filter(row => !row.startsWith('| 3 ')), /routes codes \[0,1,2,4\]/],
                    [[...good, '| 5 | New | Tool failure, `NOT VERIFIABLE`, never count it as a design defect or a pass |'], /routes codes \[0,1,2,3,4,5\]/],
                    [good.map(row => row.replace('Tool failure', 'Retry later')), /exit 1 row lacks/],
                    [good.map(row => row.replace('NEVER run an install command', 'install it')), /exit 3 row lacks/],
                    [[...good.slice(0, 3), good[3].replace('1 or 2', '1'), good[3].replace('1 or 2', '2')], /must share one tool-failure row/],
                ];
                for (const [rows, expected] of drifts) {
                    const found = htmlExportExitTableDefects(table(rows), EXIT);
                    assertTrue(found.some(line => expected.test(line)), `expected ${expected} in: ${found.join('; ') || '(none)'}`);
                }
                // And a file with no exit table is named, never passed
                assertTrue(htmlExportExitTableDefects('No table here.', EXIT).length === 1, 'a missing table must be reported');
            },
        },
        {
            // Guards the primacy/recency rule under the emphasis diet: body prose may go plain, the
            // top and closing anchors may not.
            name: '[content-presence] TC-ADS-025 anchors-only emphasis: a stripped top or closing anchor is named (fixture)',
            fn: () => {
                // Given a fixture skill whose anchors hold emphasis and whose body is plain
                const floors = { top: 2, closing: 2 };
                const skill = [
                    '---', 'name: fx', "description: 'Fixture.'", '---', '',
                    '<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->', '> **[BLOCKING]** Run steps in order.', '<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->', '',
                    '## Quick Summary', '', 'NEVER skip the checklist.', '',
                    '## Step 1', '', 'Read the input; stop when it is missing.', '',
                    '<!-- SYNC:fx -->', 'MUST MUST MUST', '<!-- /SYNC:fx -->', '',
                    '## Closing Reminders', '', '**IMPORTANT MUST ATTENTION** cite evidence.', '',
                ].join('\n');
                // When it is checked, Then no anchor gap is reported
                assertTrue(emphasisAnchorGaps(skill, floors).length === 0, `unexpected gaps: ${emphasisAnchorGaps(skill, floors).join('; ')}`);
                // When the Quick Summary loses its marker, Then the top anchor is named
                const plainTop = emphasisAnchorGaps(skill.replace('NEVER skip', 'Do not skip'), floors);
                assertTrue(plainTop.some(g => g.startsWith('top anchor')), `top anchor not named: ${plainTop.join('; ')}`);
                // When the closing reminder goes plain, Then the closing anchor is named
                const plainClose = emphasisAnchorGaps(skill.replace('**IMPORTANT MUST ATTENTION** cite', 'Cite'), floors);
                assertTrue(plainClose.some(g => g.startsWith('closing anchor')), `closing anchor not named: ${plainClose.join('; ')}`);
                // When a section is removed, Then its absence is named
                assertTrue(emphasisAnchorGaps(skill.replace('## Closing Reminders', '## Notes'), floors).some(g => g.includes('no `## Closing Reminders`')), 'missing closing section not named');
                // And a SYNC body's markers never count toward an anchor (moving the markers into SYNC fails)
                const syncOnly = skill.replace('NEVER skip', 'Do not skip').replace('## Step 1', '<!-- SYNC:q -->\nNEVER NEVER\n<!-- /SYNC:q -->\n\n## Step 1');
                assertTrue(emphasisAnchorGaps(syncOnly, floors).some(g => g.startsWith('top anchor')), 'SYNC markers were counted toward the top anchor');
            },
        },
        {
            name: '[content-presence] TC-ADS-025 the emphasis-diet skills keep their top and closing anchor markers',
            skip: IS_FRAMEWORK_REPO ? false : 'asserts the framework repo\'s own skill anchors (framework-repo signal)',
            fn: () => {
                // Given the five G3-selected skills and the anchor counts they held when selected
                const gaps = [];
                // When each SKILL.md is read
                for (const [name, floors] of Object.entries(EMPHASIS_ANCHOR_FLOORS)) {
                    for (const gap of emphasisAnchorGaps(name.includes('/') ? readFile(path.join(SKILLS_DIR, ...name.split('/'))) : readSkill(name), floors)) gaps.push(`${name}: ${gap}`);
                }
                // Then no anchor lost emphasis markers
                assertTrue(gaps.length === 0, `emphasis anchors stripped:\n  ${gaps.join('\n  ')}`);
            },
        },
        {
            // Business Intent (BR-PD-02): existing general decks keep their verdict — naming no profile is the
            // presenter profile, so profiles never loosen the default.
            name: '[content-presence] TC-PD-001 a deck checked with no profile is judged exactly as under presenter',
            skip: PD_SKIP,
            fn: () => {
                const { validatePresentation } = pdLoadValidator();
                // Given three decks: conforming, failing only draft saving, failing only the print path
                const conforming = pdFixtureDeck();
                const decks = [
                    ['conforming', conforming],
                    ['draft-saving', pdMutate(conforming, 'drop draft saving', html => html.replace(/localStorage\.setItem\([^;]+;/, ''))],
                    ['print', pdMutate(conforming, 'drop print CSS', html => html.replace('@media print', '@media screen'))],
                ];
                const defects = [];
                for (const [label, html] of decks) {
                    // When each is checked with no profile named and against presenter
                    const implicit = validatePresentation(html);
                    const explicit = validatePresentation(html, { profile: 'presenter' });
                    // Then the two verdicts are identical
                    if (!require('util').isDeepStrictEqual(implicit, explicit)) defects.push(`${label}: no-profile verdict differs from presenter`);
                }
                // And the conforming deck passes while each failing deck fails on exactly its own check
                const verdictOf = label => validatePresentation(decks.find(([name]) => name === label)[1]);
                if (!verdictOf('conforming').ok) defects.push(`conforming deck failed: ${verdictOf('conforming').errors.join('; ')}`);
                if (JSON.stringify(pdErrorIds(verdictOf('draft-saving'))) !== '["draft-persistence"]') {
                    defects.push(`draft-saving deck must fail only draft-persistence with no profile, got ${JSON.stringify(pdErrorIds(verdictOf('draft-saving')))}`);
                }
                if (JSON.stringify(pdErrorIds(verdictOf('print'))) !== '["print"]') {
                    defects.push(`print deck must fail only print, got ${JSON.stringify(pdErrorIds(verdictOf('print')))}`);
                }
                assertTrue(defects.length === 0, `TC-PD-001 default verdict drifted from presenter:\n  ${defects.join('\n  ')}`);
            },
        },
        {
            // Business Intent (BR-PD-03): a review deck is not forced to carry editing, and nothing else is
            // relaxed — the review profile demotes exactly the five editing checks.
            name: '[content-presence] TC-PD-002 the review profile demotes exactly the five editing checks',
            skip: PD_SKIP,
            fn: () => {
                const { validatePresentation } = pdLoadValidator();
                // Given a conforming deck with editing, draft saving, reset and export removed, keeping an edit
                // control that announces no state (so edit-state is exercised, not skipped)
                const noEditing = [
                    ['unstated edit toggle', html => html.replace('<button aria-pressed="false" data-action="toggle-edit">', '<button data-action="toggle-edit">')],
                    ['drop edit-state script', html => html.replace(/document\.querySelector\('\[data-action="toggle-edit"\]'\)[^;]+;/, '')],
                    ['drop editing implementation', html => html.replace(/document\.querySelector\('\.editable'\)[^;]+;/, '')],
                    ['drop draft saving', html => html.replace(/localStorage\.setItem\([^;]+;/, '')],
                    ['drop reset and export', html => html.replace('<button data-action="reset">Reset</button><button data-action="export">Export</button>', '')],
                ].reduce((html, [label, mutate]) => pdMutate(html, label, mutate), pdFixtureDeck());
                // When it is checked against presenter and against review
                const presenter = validatePresentation(noEditing, { profile: 'presenter' });
                const review = validatePresentation(noEditing, { profile: 'review' });
                // Then the ids at error under presenter and warning under review, derived from checks[], are exactly the five
                const demoted = presenter.checks
                    .filter(check => check.level === 'error' && (pdCheck(review, check.id) || {}).level === 'warning')
                    .map(check => check.id)
                    .sort();
                assertTrue(JSON.stringify(demoted) === JSON.stringify(PD_EDITING_CHECKS),
                    `TC-PD-002 review demotes ${JSON.stringify(demoted)}, expected exactly ${JSON.stringify(PD_EDITING_CHECKS)}`);
                // And presenter fails on exactly those five, while review passes listing each as advisory
                assertTrue(JSON.stringify(pdErrorIds(presenter)) === JSON.stringify(PD_EDITING_CHECKS),
                    `TC-PD-002 presenter must fail exactly the editing checks, got ${JSON.stringify(pdErrorIds(presenter))}`);
                assertTrue(review.ok === true, `TC-PD-002 review failed the deck: ${review.errors.join('; ')}`);
                const unlisted = PD_EDITING_CHECKS.filter(id => !review.warnings.some(warning => warning.startsWith(`${id}:`)));
                assertTrue(unlisted.length === 0, `TC-PD-002 review omits advisories for: ${unlisted.join(', ')}`);
                // And each advisory names what is missing — never the wording of the same check passing
                // (compared with presenter, whose passing records carry no profile suffix)
                const passing = validatePresentation(pdFixtureDeck(), { profile: 'presenter' });
                const suffix = ' (advisory under the review profile)';
                const passLike = PD_EDITING_CHECKS.filter(id => {
                    const details = pdCheck(review, id).details;
                    if (pdCheck(passing, id).pass !== true || !details.endsWith(suffix)) return true;
                    return details.slice(0, -suffix.length) === pdCheck(passing, id).details;
                });
                assertTrue(passLike.length === 0, `TC-PD-002 advisories read like a pass (or fixture does not pass) for: ${passLike.join(', ')}`);
                // Edge: a deck with no editing (or notes) control has nothing to judge — the state check passes
                // in both profiles and says so, instead of asking for a state the deck does not need
                const noToggles = [
                    ['edit-state', pdMutate(pdFixtureDeck(), 'drop edit toggle', html => html.replace('<button aria-pressed="false" data-action="toggle-edit">Edit mode</button>', ''))],
                    ['notes-state', pdMutate(pdFixtureDeck(), 'drop notes toggle', html => html.replace('<button aria-expanded="false" data-action="toggle-notes" aria-controls="notes-panel">Notes</button>', ''))],
                ];
                const asking = [];
                for (const [id, html] of noToggles) for (const profile of ['presenter', 'review']) {
                    const check = pdCheck(validatePresentation(html, { profile }), id);
                    if (!check || check.pass !== true || /needs/.test(check.details)) asking.push(`${id} (${profile}): ${check ? check.details : 'missing'}`);
                }
                assertTrue(asking.length === 0, `TC-PD-002 a state check with nothing to judge must pass without asking for a state:\n  ${asking.join('\n  ')}`);
            },
        },
        {
            // Business Intent (BR-PD-04): every deck can be presented by someone else — missing or blank notes
            // fail in both profiles and the verdict names the slide.
            name: '[content-presence] TC-PD-003 a slide with missing or blank notes fails both profiles and is named',
            skip: PD_SKIP,
            fn: () => {
                const { validatePresentation } = pdLoadValidator();
                // Given a three-slide deck whose second slide has no notes, and one whose third has blank notes
                const deck = pdFixtureDeck(['opening', 'evidence', 'close']);
                const notesOf = id => new RegExp(`(data-slide-id="${id}"[\\s\\S]*?)<template class="slide-notes">[\\s\\S]*?<\\/template>`);
                const cases = [
                    ['evidence', pdMutate(deck, 'drop evidence notes', html => html.replace(notesOf('evidence'), '$1'))],
                    ['close', pdMutate(deck, 'blank close notes', html => html.replace(notesOf('close'), '$1<template class="slide-notes">   <p> </p><strong></strong>&nbsp; </template>'))],
                ];
                const defects = [];
                for (const profile of ['presenter', 'review']) {
                    for (const [slide, html] of cases) {
                        // When it is checked against each profile
                        const result = validatePresentation(html, { profile });
                        // Then the verdict fails on notes coverage at error level and names that slide
                        if (result.ok) defects.push(`${profile} passed a deck whose ${slide} slide has no real notes`);
                        if ((pdCheck(result, 'notes-coverage') || {}).level !== 'error') defects.push(`${profile}: notes-coverage is not an error`);
                        if (!result.errors.some(error => error.startsWith('notes-coverage:') && error.includes(slide))) {
                            defects.push(`${profile}: verdict does not name the ${slide} slide`);
                        }
                    }
                }
                assertTrue(defects.length === 0, `TC-PD-003 notes rule weakened:\n  ${defects.join('\n  ')}`);
            },
        },
        {
            // Business Intent (BR-PD-03 property): the review profile relaxes editing only — a deck failing one
            // non-editing check still fails review on that check, as presenter does.
            name: '[content-presence] TC-PD-004 non-editing checks keep their weight under review',
            skip: PD_SKIP,
            fn: () => {
                const { validatePresentation } = pdLoadValidator();
                const defects = [];
                for (const [id, mutate] of [
                    ['print', html => html.replace('@media print', '@media screen')],
                    ['live-status', html => html.replace(/aria-live="polite"/g, 'data-live="polite"')],
                    ['document-lang', html => html.replace('<html lang="en">', '<html>')],
                    ['reduced-motion', html => html.replace(/prefers-reduced-motion: reduce/, 'motion-disabled')],
                ]) {
                    // Given a deck failing only that one non-editing check
                    const html = pdMutate(pdFixtureDeck(), id, mutate);
                    // When it is checked against presenter and against review
                    const presenter = validatePresentation(html, { profile: 'presenter' });
                    const review = validatePresentation(html, { profile: 'review' });
                    // Then both fail on exactly that check at error level
                    if (JSON.stringify(pdErrorIds(presenter)) !== JSON.stringify([id])) defects.push(`fixture must fail only ${id} under presenter, got ${JSON.stringify(pdErrorIds(presenter))}`);
                    if (review.ok) defects.push(`review passed a deck failing ${id}`);
                    if (JSON.stringify(pdErrorIds(review)) !== JSON.stringify([id])) defects.push(`review must error on ${id} as presenter does, got ${JSON.stringify(pdErrorIds(review))}`);
                    // And the failure names what is missing — never the wording of the same check passing
                    const passed = pdCheck(validatePresentation(pdFixtureDeck(), { profile: 'presenter' }), id);
                    if (!passed || passed.pass !== true) defects.push(`fixture setup: ${id} must pass on the conforming deck`);
                    else if (pdCheck(review, id).details === passed.details) defects.push(`${id} failure reads like a pass: ${passed.details}`);
                }
                // Given a deck longer than six slides with no overview (jump) control — the one check whose level
                // depends on deck length, so the two-slide fixture above never reaches its error branch
                const longIds = ['opening', 'problem', 'evidence', 'options', 'decision', 'risks', 'close'];
                const longDeck = pdMutate(pdFixtureDeck(longIds), 'drop overview control', html => html.replace('<button data-action="overview">All slides</button>', ''));
                // When it is checked against presenter and against review
                const longPresenter = validatePresentation(longDeck, { profile: 'presenter' });
                const longReview = validatePresentation(longDeck, { profile: 'review' });
                // Then both fail on exactly the overview check, at error level
                if (longPresenter.slideCount !== longIds.length) defects.push(`fixture setup: long deck has ${longPresenter.slideCount} slides, expected ${longIds.length}`);
                if (JSON.stringify(pdErrorIds(longPresenter)) !== '["overview"]') defects.push(`7-slide deck with no overview must fail only overview under presenter, got ${JSON.stringify(pdErrorIds(longPresenter))}`);
                if (longReview.ok) defects.push('review passed a 7-slide deck with no overview control');
                if (JSON.stringify(pdErrorIds(longReview)) !== '["overview"]') defects.push(`review must error on overview for a 7-slide deck as presenter does, got ${JSON.stringify(pdErrorIds(longReview))}`);
                assertTrue(defects.length === 0, `TC-PD-004 review relaxed a non-editing check:\n  ${defects.join('\n  ')}`);
            },
        },
        {
            // Business Intent (BR-PD-01): a typo never yields a silently wrong verdict — only the exact names
            // presenter and review produce one, through the CLI that feature-presentation's hand-off gate runs.
            name: '[content-presence] TC-PD-005 the validator CLI refuses an unknown or malformed profile with exit 2 and no verdict',
            skip: PD_SKIP,
            fn: () => pdWithFixtureDeckFile('ck-pd-profile-', (root, deck) => {
                const defects = [];
                // Given a readable conforming deck
                // When the CLI names another word, a different letter case, an empty name, or the name without "="
                for (const args of [[deck, '--profile=draft'], [deck, '--profile=Review'], [deck, '--profile='], [deck, '--profile', 'review']]) {
                    const label = args.slice(1).join(' ');
                    const run = pdRunValidatorCli(root, args);
                    // Then it exits 2, prints no verdict, and the message names both valid profiles
                    if (run.code !== 2) defects.push(`${label}: exit ${run.code}${run.error ? ` (${run.error.message})` : ''}, expected 2`);
                    if (run.stdout.trim() !== '') defects.push(`${label}: printed a verdict: ${run.stdout.split('\n')[0]}`);
                    if (!/presenter/.test(run.stderr) || !/review/.test(run.stderr)) defects.push(`${label}: stderr does not name presenter and review: ${run.stderr}`);
                }
                // And the profile is judged before the deck is read: an unknown name on a missing file is a profile error
                const beforeRead = pdRunValidatorCli(root, [path.join(root, 'missing.html'), '--profile=draft']);
                if (beforeRead.code !== 2 || !/Unknown profile/.test(beforeRead.stderr)) defects.push(`unknown profile on a missing deck: exit ${beforeRead.code}, stderr ${beforeRead.stderr}`);
                // When the exact names are given, Then each produces a passing verdict naming that profile
                for (const profile of ['review', 'presenter']) {
                    const run = pdRunValidatorCli(root, [deck, `--profile=${profile}`]);
                    if (run.code !== 0) defects.push(`--profile=${profile}: exit ${run.code}, expected 0: ${run.stderr}`);
                    if (!run.stdout.split('\n')[0].includes(`(profile: ${profile})`)) defects.push(`--profile=${profile}: verdict does not name ${profile}: ${run.stdout.split('\n')[0]}`);
                }
                // Given a deck failing exactly one non-editing check (no document language)
                const failing = path.join(root, 'failing-deck.html');
                fs.writeFileSync(failing, pdMutate(pdFixtureDeck(), 'drop document language', html => html.replace('<html lang="en">', '<html>')), 'utf8');
                // When the CLI checks it under review and with no profile named
                for (const args of [[failing, '--profile=review'], [failing]]) {
                    const label = args.length > 1 ? args[1] : 'no profile';
                    const run = pdRunValidatorCli(root, args);
                    // Then it exits 1 (a verdict, not a usage error) and prints a FAIL verdict naming the check
                    if (run.code !== 1) defects.push(`failing deck, ${label}: exit ${run.code}${run.error ? ` (${run.error.message})` : ''}, expected 1`);
                    if (!run.stdout.split('\n')[0].startsWith('FAIL ')) defects.push(`failing deck, ${label}: verdict is not FAIL: ${run.stdout.split('\n')[0]}`);
                    if (!run.stdout.includes('document-lang:')) defects.push(`failing deck, ${label}: verdict does not name document-lang`);
                }
                assertTrue(defects.length === 0, `TC-PD-005 validator profile names drifted:\n  ${defects.join('\n  ')}`);
            }),
        },
        {
            // Business Intent (BR-PD-01): every verdict states the standard it was judged against, so a review pass
            // is never mistaken for a presenter pass.
            name: '[content-presence] TC-PD-006 every validator CLI verdict names the profile it was judged against',
            skip: PD_SKIP,
            fn: () => pdWithFixtureDeckFile('ck-pd-verdict-', (root, deck) => {
                const defects = [];
                // Given the conforming fixture deck
                // When it is checked through the CLI against review, with no profile named, and against review as JSON
                const review = pdRunValidatorCli(root, [deck, '--profile=review']);
                const unnamed = pdRunValidatorCli(root, [deck]);
                const json = pdRunValidatorCli(root, [deck, '--json', '--profile=review']);
                // Then the review verdict names review and the unnamed one names presenter
                if (!review.stdout.split('\n')[0].includes('(profile: review)')) defects.push(`review verdict: ${review.stdout.split('\n')[0]}`);
                if (!unnamed.stdout.split('\n')[0].includes('(profile: presenter)')) defects.push(`no-profile verdict: ${unnamed.stdout.split('\n')[0]}`);
                // And the JSON verdict carries the profile as a field
                let jsonProfile;
                let jsonSteps = [];
                try { ({ profile: jsonProfile, manualVerification: jsonSteps = [] } = JSON.parse(json.stdout)); } catch (error) { jsonProfile = `unparseable JSON (${error.message})`; }
                if (jsonProfile !== 'review') defects.push(`JSON verdict profile is ${JSON.stringify(jsonProfile)}, expected "review"`);
                // And its follow-up steps fit the review profile: no editing, draft, reset or export walk
                if (!Array.isArray(jsonSteps) || jsonSteps.length === 0) defects.push('JSON verdict carries no follow-up steps');
                else for (const step of [/edit/i, /draft/i, /reset/i, /export/i]) {
                    if (step.test(jsonSteps.join('\n'))) defects.push(`review follow-up steps still ask for ${step}`);
                }
                assertTrue(defects.length === 0, `TC-PD-006 verdict profile naming drifted:\n  ${defects.join('\n  ')}`);
            }),
        },
        {
            // Business Intent (BR-PD-04/05, §6.4, §7): the review deck as documented meets the shared standard —
            // reviewers get presentable notes, navigation, overview and print, never in-place editing, and
            // always see where they are and a message instead of a blank demo.
            name: '[content-presence] TC-PD-007 the feature-presentation review-deck scaffold passes review with full notes, no editing and its key states (TC-PD-022, TC-PD-062)',
            skip: PD_SKIP,
            fn: () => {
                const { validatePresentation, findSlides } = pdLoadValidator();
                // Given the review-deck scaffold from the deck template
                const scaffold = pdScaffold();
                assertTrue(scaffold.length > 0, 'TC-PD-007 deck-template.md §1 has no ```html scaffold fence');
                // When it is checked against review
                const review = validatePresentation(scaffold, { profile: 'review' });
                const defects = [];
                // Then the verdict passes
                if (!review.ok) defects.push(`review verdict fails: ${review.errors.join('; ')}`);
                // And every slide, the demo slide included, has notes giving Say, Why and the likely Question
                const slides = findSlides(scaffold);
                if (!slides.some(slide => /<iframe\b/i.test(slide.html))) defects.push('no demo slide (with an <iframe>) in the scaffold');
                const notesTemplates = scaffold.match(/<template\b[^>]*\bclass\s*=\s*(["'])[^"']*\bslide-notes\b[^"']*\1[^>]*>[\s\S]*?<\/template>/gi) || [];
                if (notesTemplates.length !== slides.length) defects.push(`${notesTemplates.length} notes templates for ${slides.length} slides`);
                for (const slide of slides) {
                    const notes = /<template\b[^>]*\bslide-notes\b[^>]*>([\s\S]*?)<\/template>/i.exec(slide.html);
                    const id = pdSlideIdOf(slide.openingTag) || `#${slide.index}`;
                    if (!notes) { defects.push(`${id}: no slide-notes template`); continue; }
                    for (const label of ['Say:', 'Why:', 'Question:']) if (!notes[1].includes(label)) defects.push(`${id}: notes lack "${label}"`);
                }
                // And no editing, draft-saving, reset or export control is offered (TC-PD-022)
                const actions = [...scaffold.matchAll(/\bdata-action\s*=\s*(["'])(.*?)\1/gi)].flatMap(m => m[2].split(/\s+/));
                if (!actions.includes('next') || !actions.includes('toggle-notes')) defects.push('data-action scan found no deck controls (scan is vacuous)');
                for (const forbidden of ['toggle-edit', 'reset', 'export']) if (actions.includes(forbidden)) defects.push(`editing control data-action="${forbidden}" present`);
                if (/\b(?:localStorage|sessionStorage|indexedDB)\b/.test(scaffold)) defects.push('browser draft storage present');
                // And nothing is editable in place: no contenteditable attribute in the markup (script and style bodies
                // stripped, so the engine's own `isContentEditable` key guard is not markup) and no designMode anywhere
                const editMarkup = scaffold.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
                if (/<[a-z][\w-]*\b[^>]*\scontenteditable\b/i.test(editMarkup)) defects.push('a contenteditable attribute is present in the markup');
                if (/\bdesignMode\b/.test(scaffold)) defects.push('designMode is present');
                // And the key states are present: live position, notes panel, overview with close, reduced motion, empty demo (TC-PD-062)
                const states = [
                    ['aria-live status', /\baria-live\s*=\s*(["'])(?:polite|assertive)\1/i],
                    ['notes panel', /\bid\s*=\s*(["'])notes-panel\1/i],
                    ['overview dialog', /<dialog\b/i],
                    ['overview control', /\bdata-action\s*=\s*(["'])overview\1/i],
                    ['overview close', /\bdata-action\s*=\s*(["'])close-overview\1/i],
                    ['reduced-motion path', /prefers-reduced-motion/i],
                    ['empty-demo message', /No prototype or design available/],
                ];
                for (const [state, pattern] of states) if (!pattern.test(scaffold)) defects.push(`missing key state: ${state}`);
                // And a demo with nothing to embed drops its Simulated note: the empty-demo handler removes the
                // demo narration's `deck__sim-note` (nothing is simulated when there is no prototype)
                const demo = slides.find(slide => /<iframe\b/i.test(slide.html));
                if (demo && !/\bdeck__sim-note\b/.test(demo.html)) defects.push('demo slide carries no Simulated note (empty-demo check is vacuous)');
                const handlerAt = scaffold.search(/\.deck__embed['"]\)\.forEach\(/);
                const handler = handlerAt === -1 ? '' : scaffold.slice(handlerAt, scaffold.indexOf('\n', scaffold.indexOf('});', handlerAt)));
                if (!handler) defects.push('no empty-demo handler over .deck__embed');
                else if (!/deck__sim-note['"]\)\.forEach\(\(?\w+\)?\s*=>\s*\w+\.remove\(\)\)/.test(handler)) defects.push('empty-demo handler no longer removes the Simulated note');
                // And the swap acts only on an embed that holds an iframe: a wireframe demo (no iframe) is left as it is
                const frameName = (/\b(?:const|let)\s+(\w+)\s*=\s*\w+\.querySelector\(['"]iframe['"]\)/.exec(handler) || [])[1];
                if (handler && !(frameName && new RegExp(`\\bif\\s*\\(\\s*!\\s*${frameName}\\s*\\|\\|`).test(handler))) {
                    defects.push('empty-demo handler lost its iframe guard (an embed without an iframe is no longer skipped)');
                }
                // Given the §3b spec-only wireframe demo, filled as the template says: two frames `demo-x` and `demo-x-2`
                // whose escaped wireframe text carries an escaped `</section>` (and `<input>`, `Q&A`)
                const wireframe = pdWireframeSlide();
                if (!wireframe) defects.push('deck-template.md §3b has no ```html wireframe-demo fence');
                else {
                    // The frame replaces the iframe AND the empty-state line, so no empty-state text misfires beside it
                    const pre = (/<pre\b[^>]*>(?=\{ESCAPED_ASCII_FRAME\}<\/pre>)/.exec(wireframe) || [])[0];
                    if (!pre || !pdClassTokens(pre).includes('deck__wireframe')) defects.push('wireframe fence has no escaped-frame <pre class="deck__wireframe">');
                    // And the frame, which scrolls sideways when wider than its box, is a keyboard-reachable named region
                    // (WCAG 2.1.1: a scroller the keyboard cannot reach hides a wide frame at 200% zoom)
                    else {
                        if (!/\stabindex="0"/.test(pre)) defects.push('wireframe <pre> is not focusable (tabindex="0")');
                        if (!/\srole="region"/.test(pre)) defects.push('wireframe <pre> is not a region (role="region")');
                        if (!/\saria-label(?:ledby)?="[^"]*\S[^"]*"/.test(pre)) defects.push('wireframe <pre> has no accessible name (aria-label or aria-labelledby)');
                    }
                    if (/<iframe\b|deck__empty/.test(wireframe)) defects.push('wireframe fence still carries an iframe or the empty-state line');
                    const escapedFrame = '+------------------------------+\n| &lt;input&gt; Name   [ Q&amp;A ] |\n| &lt;/section&gt; ends nothing   |\n+------------------------------+';
                    // Every other placeholder gets plain text; the first frame drops its -1 suffix (the narration id keeps it)
                    const frame = n => {
                        const filled = wireframe
                            .replace(/\{journey-slug\}/g, 'x')
                            .replace(/\{n\}/g, String(n))
                            .replace('{ESCAPED_ASCII_FRAME}', escapedFrame)
                            .replace(/\{[^{}\n]*\}/g, 'Filled value for the review');
                        return n === 1 ? filled.replace('data-slide-id="demo-x-1"', 'data-slide-id="demo-x"') : filled;
                    };
                    const summaryAt = scaffold.search(/<section\b[^>]*data-slide-id="summary"/);
                    const withWireframe = summaryAt === -1 ? '' : `${scaffold.slice(0, summaryAt)}${frame(1)}\n${frame(2)}\n${scaffold.slice(summaryAt)}`;
                    if (!withWireframe) defects.push('fixture setup: no summary slide to splice the wireframe frames before');
                    else {
                        // When the spliced deck is checked against review
                        const spliced = validatePresentation(withWireframe, { profile: 'review' });
                        // Then it passes, and the standard finds both frames as whole slides with their own ids
                        if (!spliced.ok) defects.push(`scaffold with the wireframe demo fails review: ${spliced.errors.join('; ')}`);
                        const splicedIds = findSlides(withWireframe).map(slide => pdSlideIdOf(slide.openingTag));
                        if (!splicedIds.includes('demo-x') || !splicedIds.includes('demo-x-2')) defects.push(`wireframe frames not found as slides: ${JSON.stringify(splicedIds)}`);
                        if (splicedIds.length !== slides.length + 2) defects.push(`${splicedIds.length} slides after splicing 2 frames into ${slides.length}`);
                    }
                }
                // And the live status announces the position together with the current slide's title
                if (!/'Slide '\s*\+[^\n]*' of '\s*\+[^\n]*': '\s*\+\s*titleOf\(/.test(scaffold)) defects.push('status no longer announces "Slide N of M: title"');
                assertTrue(defects.length === 0, `TC-PD-007 review-deck scaffold drifted:\n  ${defects.join('\n  ')}`);
            },
        },
        {
            // Business Intent (BR-PD-05, BR-PD-06 embed clause): a failing review deck is never handed to
            // reviewers as ready, and a deck never claims to be self-contained while its demos need a network.
            name: '[content-presence] TC-PD-008 feature-presentation blocks hand-off on --profile=review and its outside-asset scan flags network loads only (TC-PD-013)',
            skip: PD_SKIP,
            fn: () => {
                // Given feature-presentation's guidance
                const fp = pdReadText('feature-presentation', 'SKILL.md');
                const step6 = sectionBetween(fp, '### Step 6', '\n### ');
                const step8 = sectionBetween(fp, '### Step 8:', '\n### ');
                const defects = [];
                // When Step 8 describes finishing the deck
                // Then the review check is blocking, precedes the fidelity gate and the report, and a failing deck is never reported ready
                for (const phrase of ['[BLOCKING]', 'validate-presentation.cjs', '--profile=review', 'Never report the deck ready while the check fails']) {
                    if (!step8.includes(phrase)) defects.push(`Step 8 lacks "${phrase}"`);
                }
                const checkAt = step8.indexOf('--profile=review');
                const fidelityAt = step8.indexOf('Fidelity Gate');
                if (checkAt === -1 || fidelityAt === -1 || checkAt > fidelityAt) defects.push('Step 8 does not run the review check before the fidelity gate');
                const reportAt = fp.indexOf('### Step 9');
                if (reportAt === -1 || fp.indexOf('### Step 8:') > reportAt) defects.push('the conformance step does not precede the Step 9 report');
                // And Step 6 carries the outside-asset scan with its declaration and the viewer notice
                const scan = step6.split('\n').find(line => line.includes('**Outside-asset scan')) || '';
                // (the regex runs case-insensitively — the test below applies it with the `i` flag the guidance names)
                for (const phrase of ['presentation-asset-policy', 'external-allowed', 'how-to slide', 'Demos load outside assets; open online to see them exactly.', 'case-insensitively (flag `i`)']) {
                    if (!scan.includes(phrase)) defects.push(`Step 6 outside-asset scan lacks "${phrase}"`);
                }
                // And both places that run the look-behind regex name an engine that supports it and warn off the ones
                // that do not: `grep -E` silently matches nothing and plain `rg` refuses the pattern, so a scan run
                // there would report "no outside asset" for a mockup that loads one
                const recheck = step8.split('\n').find(line => line.includes('Step 6 regex')) || '';
                if (!recheck) defects.push('Step 8 no longer re-runs the Step 6 regex on the deck');
                for (const [label, text] of [['Step 6 outside-asset scan', scan], ['Step 8 deck re-check', recheck]]) {
                    if (!text.includes('JavaScript RegExp')) defects.push(`${label} does not name the JavaScript RegExp engine`);
                    if (!/grep -Pi?\b|rg --pcre2/.test(text)) defects.push(`${label} names no PCRE command-line engine (grep -P or rg --pcre2)`);
                    if (!/\bnever\b[^.]*`grep -E`[^.]*plain `rg`/.test(text)) defects.push(`${label} does not warn off \`grep -E\` and plain \`rg\``);
                }
                const source = (/the regex `([^`\n]+)`/.exec(scan) || [])[1];
                if (!source) defects.push('Step 6 outside-asset scan names no regex');
                else {
                    // When the regex, extracted from the guidance and applied case-insensitively as Step 6 says, runs on raw
                    // mockup samples — one per load shape the presentation-builder asset rule also treats as outside
                    // (protocol-relative `//` included)
                    const rule = new RegExp(source, 'i');
                    const flagged = [
                        '<link rel="stylesheet" href="https://fonts.example.test/css2?family=Inter">',
                        '<img src="https://cdn.example.test/hero.png" alt="Hero">',
                        '<div style="background:url(https://cdn.example.test/bg.jpg)"></div>',
                        '<div style="background:url(//cdn.example.test/bg.jpg)"></div>',
                        '<iframe src="https://app.example.test/embed" title="Demo"></iframe>',
                        '<video poster="https://cdn.example.test/poster.jpg" controls></video>',
                        '<img srcset="https://cdn.example.test/hero.png 1x" alt="Hero">',
                        '<style>@import "https://fonts.example.test/inter.css";</style>',
                        // A mockup whose ONLY outside asset is a web font. The shared validator cannot see inside an
                        // escaped srcdoc demo, so it would pass this deck with no policy meta: this scan is where the
                        // font-only mockup gets its declaration and notice (R1-13, FP-owned).
                        '<!doctype html><html><head><link href="https://fonts.example.test/css2?family=Inter" rel="stylesheet"><style>body{font-family:Inter,sans-serif}</style></head><body><p>Local text only.</p></body></html>',
                        // A network address as the SECOND srcset candidate, after a local one
                        '<img srcset="hero-1x.png 1x, https://cdn.example.test/hero-2x.png 2x" alt="Hero">',
                        '<style>@import"https://fonts.example.test/inter.css";</style>',
                        '<object data="https://cdn.example.test/chart.svg" type="image/svg+xml"></object>',
                        '<IMG SRC="HTTPS://CDN.EXAMPLE.TEST/HERO.PNG" ALT="Hero">',
                        '<div style="background:URL(https://cdn.example.test/bg.jpg)"></div>',
                    ];
                    const local = [
                        '<img src="local.png" alt="Local">',
                        '<p>Docs live at https://docs.example.test/guide for later reading.</p>',
                        // Links and lazy-load data attributes load nothing
                        '<a href="https://docs.example.test/guide">Guide</a>',
                        '<a href=//docs.example.test/guide>Guide</a>',
                        '<img data-src="https://cdn.example.test/lazy.png" src="local.png" alt="Lazy">',
                        '<link rel="stylesheet" href="styles/local.css">',
                    ];
                    // Then every network load is flagged and neither local counter-case is
                    for (const sample of flagged) if (!rule.test(sample)) defects.push(`scan misses outside asset: ${sample}`);
                    for (const sample of local) if (rule.test(sample)) defects.push(`scan flags a local or plain-text reference: ${sample}`);
                }
                assertTrue(defects.length === 0, `TC-PD-008 review hand-off gate drifted:\n  ${defects.join('\n  ')}`);
            },
        },
        {
            // Business Intent (BR-PD-06): a review deck opens with its intended look without a network unless it
            // declares outside assets allowed.
            name: '[content-presence] TC-PD-009 the review-deck scaffold loads no outside asset and the asset rule holds on it',
            skip: PD_SKIP,
            fn: () => {
                const { validatePresentation } = pdLoadValidator();
                // Given the review-deck scaffold
                const scaffold = pdScaffold();
                assertTrue(scaffold.length > 0, 'TC-PD-009 deck-template.md §1 has no ```html scaffold fence');
                const policyMeta = /<meta\b[^>]*\bname\s*=\s*(["'])presentation-asset-policy\1[^>]*\bcontent\s*=\s*(["'])external-allowed\2/i;
                const outside = [
                    ['<link> to a network address', /<link\b[^>]*https?:\/\//i],
                    ['url() to a network address', /\burl\(\s*["']?https?:\/\//i],
                    ['src/href to a network address', /\b(?:src|href)\s*=\s*["']?https?:\/\//i],
                ].filter(([, pattern]) => pattern.test(scaffold)).map(([label]) => label);
                const declared = policyMeta.test(scaffold);
                const defects = [];
                // When its markup is inspected, Then it loads nothing from a network unless it declares the policy
                if (outside.length > 0 && !declared) defects.push(`undeclared outside asset: ${outside.join(', ')}`);
                // And the declaration is conditional, never a default (only the Step 6 scan adds it)
                if (declared) defects.push('the scaffold declares external-allowed by default');
                // When an outside web font is added, Then review fails on the asset rule until the deck declares it
                const withFont = pdMutate(scaffold, 'add outside font', html => html.replace('</head>', '<link rel="stylesheet" href="https://fonts.example.test/x.css"></head>'));
                const undeclaredCheck = pdCheck(validatePresentation(withFont, { profile: 'review' }), 'asset-policy');
                if (!undeclaredCheck || undeclaredCheck.pass || undeclaredCheck.level !== 'error') defects.push('an undeclared outside font passes the review asset rule');
                const withPolicy = pdMutate(withFont, 'declare outside assets', html => html.replace('</head>', '<meta name="presentation-asset-policy" content="external-allowed" /></head>'));
                if (!(pdCheck(validatePresentation(withPolicy, { profile: 'review' }), 'asset-policy') || {}).pass) defects.push('a declared outside font still fails the asset rule');
                assertTrue(defects.length === 0, `TC-PD-009 review-deck asset rule drifted:\n  ${defects.join('\n  ')}`);
            },
        },
        {
            // Business Intent (BR-PD-07): a review deck exports every slide whichever route is used, and a slide
            // keeps its identity when slides are added.
            name: '[content-presence] TC-PD-010 both export routes find the same review-deck slides, each with a unique job-named id',
            skip: PD_SKIP,
            fn: () => {
                const { findSlides } = pdLoadValidator();
                // Given the review-deck scaffold
                const scaffold = pdScaffold();
                // When its slides are located by the shared standard and by the review-deck export selector (section.deck__slide)
                const standard = findSlides(scaffold).map(slide => pdSlideIdOf(slide.openingTag));
                const exportRoute = [...scaffold.matchAll(/<section\b[^>]*>/gi)]
                    .map(m => m[0])
                    .filter(tag => pdClassTokens(tag).includes('deck__slide'))
                    .map(pdSlideIdOf);
                const defects = [];
                // Then both find the same N >= 2 slides in the same order
                if (exportRoute.length < 2) defects.push(`export route finds ${exportRoute.length} slides; the scaffold needs N >= 2`);
                if (JSON.stringify(standard) !== JSON.stringify(exportRoute)) {
                    defects.push(`routes disagree: standard ${JSON.stringify(standard)} vs export ${JSON.stringify(exportRoute)}`);
                }
                // And every identity is present, unique and named for its job, not its position
                for (const id of exportRoute) {
                    if (!id) defects.push('a slide has no data-slide-id');
                    else if (/^slide-?\d+$/i.test(id)) defects.push(`positional slide id "${id}"`);
                }
                const duplicates = exportRoute.filter((id, i) => id && exportRoute.indexOf(id) !== i);
                if (duplicates.length > 0) defects.push(`duplicate slide ids: ${[...new Set(duplicates)].join(', ')}`);
                // When the same slides are located by html-export's DEFAULT --slides selector, read from its library
                // (loads without Playwright) so a changed selector is judged as it ships
                const { DEFAULT_SLIDE_SELECTOR } = require(pdSkillPath('html-export', 'scripts', 'lib', 'slides.cjs'));
                // (matcher sanity: the selector needs the shared `slide` class AND a slide id on the section)
                assertTrue(pdSelectorMatches(DEFAULT_SLIDE_SELECTOR, '<section class="slide deck__slide" data-slide-id="x">')
                    && !pdSelectorMatches(DEFAULT_SLIDE_SELECTOR, '<section class="deck__slide" data-slide-id="x">'),
                    `fixture setup: the default-selector matcher misjudges "${DEFAULT_SLIDE_SELECTOR}"`);
                // Opening tags outside script and style bodies, so engine code never reads as markup
                const markup = scaffold.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
                const defaultRoute = [...markup.matchAll(/<[a-z][\w-]*\b[^>]*>/gi)]
                    .map(m => m[0])
                    .filter(tag => pdSelectorMatches(DEFAULT_SLIDE_SELECTOR, tag))
                    .map(pdSlideIdOf);
                // Then it finds every review-deck slide, in the same order and nothing else
                if (JSON.stringify(defaultRoute) !== JSON.stringify(exportRoute)) {
                    defects.push(`html-export default selector "${DEFAULT_SLIDE_SELECTOR}" finds ${JSON.stringify(defaultRoute)}, review-deck route finds ${JSON.stringify(exportRoute)}`);
                }
                assertTrue(defects.length === 0, `TC-PD-010 review-deck slide identity drifted:\n  ${defects.join('\n  ')}`);
            },
        },
        {
            // Business Intent (BR-PD-09, SOFT): a developer always learns when a deck ignored the design plan and
            // fell back to the default look; the warning never stops the build.
            name: '[content-presence] TC-PD-011 the generator warns on stderr only when the default look is used',
            skip: PD_SKIP,
            fn: () => {
                const { spawnSync } = require('child_process');
                const script = pdSkillPath('presentation-builder', 'scripts', 'create-presentation.cjs');
                const { EXAMPLE_SPEC } = require(script);
                // The warning is pinned by its meaning, never read back from the script: it must say the default look was used
                const defaultLook = /default look/;
                const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-pd-look-'));
                try {
                    // Given two deck descriptions identical except for the chosen look
                    const noTheme = JSON.parse(JSON.stringify(EXAMPLE_SPEC));
                    delete noTheme.theme;
                    const themed = { ...JSON.parse(JSON.stringify(noTheme)), theme: { accent: '#7a2e1d', displayFont: 'Georgia, serif' } };
                    const env = pdChildEnv(root);
                    const build = (name, spec) => {
                        const input = path.join(root, `${name}.json`);
                        const output = path.join(root, `${name}.html`);
                        fs.writeFileSync(input, JSON.stringify(spec), 'utf8');
                        // When each is built through the generator's CLI (argv array, no shell)
                        const run = spawnSync(process.execPath, [script, input, output], { cwd: root, env, encoding: 'utf8', timeout: 30000 });
                        return { ...run, built: fs.existsSync(output) && fs.statSync(output).size > 0 };
                    };
                    const plain = build('no-theme', noTheme);
                    const chosen = build('themed', themed);
                    const defects = [];
                    // Then both decks are built with exit 0
                    for (const [label, run] of [['no-theme', plain], ['themed', chosen]]) {
                        if (run.status !== 0 || !run.built) defects.push(`${label}: build failed (exit ${run.status}): ${run.stderr}`);
                    }
                    // And only the no-theme run prints the default-look warning, on stderr and never stdout
                    if (!defaultLook.test(String(plain.stderr))) defects.push(`no-theme run lacks the default-look warning on stderr: ${plain.stderr}`);
                    if (defaultLook.test(String(chosen.stderr))) defects.push('themed run printed the default-look warning');
                    if (defaultLook.test(String(plain.stdout))) defects.push('the warning leaked onto stdout');
                    assertTrue(defects.length === 0, `TC-PD-011 default-look warning drifted:\n  ${defects.join('\n  ')}`);
                } finally {
                    fs.rmSync(root, { recursive: true, force: true });
                }
            },
        },
        {
            // Business Intent (BR-PD-08, BR-PD-10, BR-PD-11): the routes between design, the general deck and the
            // review deck stay discoverable — a design authority is read and adopted, each deck kind says when to
            // use the other, and a picked slide direction with its journey fixes reaches a deck builder (TC-PD-061).
            name: '[content-presence] TC-PD-012 guidance links design authority, both deck kinds and the design slide hand-off (TC-PD-061)',
            skip: PD_SKIP,
            fn: () => {
                // Given the guidance of the general builder, the review step and the visual exploration
                const pb = pdReadText('presentation-builder', 'SKILL.md');
                const fp = pdReadText('feature-presentation', 'SKILL.md');
                const explore = pdReadText('ui-design', 'references', 'explore', 'workflow.md');
                const defects = [];
                // When the general builder's design-plan step is read
                const plan = sectionBetween(pb, '### 4. Make a subject-grounded design plan', '\n### ');
                // Then it reads design authority before the plan, records the documents or the none-configured branch
                // with the locations checked, adopts colour and type, and takes the explore hand-off inputs
                for (const phrase of ['Design authority read', 'none configured', 'checked:', 'direction-approved.md', 'run-notes.md']) {
                    if (!plan.includes(phrase)) defects.push(`presentation-builder Step 4 lacks "${phrase}"`);
                }
                if (!/\bdesign authority\b[^\n]*\bBEFORE writing the plan\b/.test(plan)) defects.push('presentation-builder no longer reads design authority before writing the plan');
                if (!/\badopt\b[^.\n]*\bcolou?r and type\b/i.test(plan)) defects.push('presentation-builder lacks the adopt-colour-and-type instruction');
                // And it routes a feature-artifact synthesis deck to feature-presentation, naming the review profile
                const toReview = pb.split('\n').find(line => /\bsynthesi[sz]es\b[^\n]*\bartifacts\b/i.test(line) && line.includes('`feature-presentation`'));
                if (!toReview) defects.push('presentation-builder no longer names feature-presentation beside the artifact-synthesis condition');
                else if (!toReview.includes('--profile=review')) defects.push('presentation-builder names feature-presentation without its --profile=review');
                if (!pb.includes('--profile=review')) defects.push('presentation-builder lacks --profile=review');
                // And the review step says a general-subject deck belongs to the general builder
                if (!/general-subject decks go to `\/presentation-builder`/i.test(fp)) defects.push('feature-presentation no longer routes general-subject decks to /presentation-builder');
                // And it names the general builder as owner of the deck standard, and adopts a slide hand-off with its fixes
                if (!/`presentation-builder` owns the deck standard/.test(fp)) defects.push('feature-presentation no longer names presentation-builder as owner of the deck standard');
                const fpDesign = sectionBetween(fp, '### Step 3', '\n### ');
                for (const phrase of ['direction-approved.md', 'run-notes.md']) {
                    if (!fpDesign.includes(phrase)) defects.push(`feature-presentation Step 3 no longer adopts the explore hand-off "${phrase}"`);
                }
                // And a picked direction's web font is packaged or replaced, and a replacement is recorded as a departure (TC-PD-061)
                if (!/web font[\s\S]{0,300}packag[\s\S]{0,300}departure/i.test(fpDesign)) defects.push('feature-presentation Step 3 no longer states the packaged-or-replaced web-font rule with a recorded departure');
                if (!/web font[\s\S]{0,300}packag[\s\S]{0,300}departure/i.test(plan)) defects.push('presentation-builder Step 4 no longer states the packaged-or-replaced web-font rule with a recorded departure');
                // When design explore Step 10 is read
                const step10 = sectionBetween(explore, '## Step 10', '\n## ');
                const lines = step10.split('\n');
                const slide = lines.find(line => line.startsWith('- **Slide**')) || '';
                const other = lines.find(line => line.startsWith('- **Every other deliverable**')) || '';
                // Then a slide deliverable hands the direction and the recorded fixes to a deck builder, not to refinement
                for (const phrase of ['presentation-builder', 'direction-approved.md', 'run-notes.md']) {
                    if (!slide.includes(phrase)) defects.push(`design explore Step 10 slide hand-off lacks "${phrase}"`);
                }
                if (!/do NOT run `--mode=good`/.test(slide)) defects.push('design explore Step 10 no longer keeps a slide deliverable out of --mode=good');
                if (!/web font[\s\S]{0,300}packag[\s\S]{0,300}departure/i.test(slide)) defects.push('design explore Step 10 slide hand-off no longer states the packaged-or-replaced web-font rule with a recorded departure');
                // And every other deliverable still continues to its refinement step
                if (!other.includes('--mode=good')) defects.push('design explore Step 10 lost the --mode=good refinement for other deliverables');
                // When the explore gate-file templates are read (BR-PD-10: the picked direction's tokens travel in a file)
                const gateFiles = pdReadText('ui-design', 'references', 'explore', 'gate-files.md');
                const templateOf = name => pdExtractFence(gateFiles, new RegExp(`^## \`${name.replace('.', '\\.')}\``, 'm'), 'markdown');
                const approved = templateOf('direction-approved.md');
                const runNotes = templateOf('run-notes.md');
                // Then direction-approved.md carries a Design Plan tokens section with named hex colours and type roles
                const tokens = sectionBetween(approved, '## Design Plan tokens', '\n## ');
                if (!approved.includes('\n## Design Plan tokens\n')) defects.push('direction-approved.md template has no "## Design Plan tokens" section');
                else if (!/#RRGGBB/.test(tokens) || !/Type family/.test(tokens)) defects.push('direction-approved.md Design Plan tokens section lost its hex-colour or type-family table');
                // And run-notes.md carries the Journey fixes (UX-8) table the deck builder marks
                if (!runNotes.includes('\n## Journey fixes (UX-8)\n')) defects.push('run-notes.md template has no "## Journey fixes (UX-8)" section');
                // And both deck builders read the tokens from that section when they adopt a picked direction
                if (!plan.includes('## Design Plan tokens')) defects.push('presentation-builder Step 4 does not name the "## Design Plan tokens" section');
                if (!fpDesign.includes('## Design Plan tokens')) defects.push('feature-presentation Step 3 does not name the "## Design Plan tokens" section');
                for (const [label, body] of [['presentation-builder Step 4', plan], ['feature-presentation Step 3', fpDesign]]) {
                    if (!body.includes('## Journey fixes (UX-8)')) defects.push(`${label} does not name the "## Journey fixes (UX-8)" table`);
                }
                assertTrue(defects.length === 0, `TC-PD-012 presentation routes drifted:\n  ${defects.join('\n  ')}`);
            },
        },
        {
            // Business Intent (§6.4 key states, runtime contract §3): a reviewer driving the review deck by keyboard
            // reads a long slide before it changes, starts each new slide at its top, never runs through slides on a
            // held key, reads long notes by keyboard only when Tab put the focus there (a clicker keeps one press per
            // slide) — and while it is there the scroll keys never move the deck, even at the notes' edge — and can go
            // back with Shift+Space. Runs the scaffold's REAL engine in node:vm, so an engine edit
            // that breaks one of these fails here, not only in a browser.
            name: '[content-presence] TC-PD-062 the review-deck engine scrolls a long slide first, opens each slide at its top and sends keys to notes only after Tab',
            skip: PD_SKIP,
            fn: () => {
                // Given the engine: the one inline <script> of the deck template's §1 scaffold, run as the browser gets it
                const scaffold = pdScaffold();
                const scripts = [...scaffold.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
                assertTrue(scripts.length === 1, `TC-PD-062 the scaffold must carry exactly one inline engine script, found ${scripts.length}`);
                const engine = scripts[0];
                const defects = [];
                const expect = (label, actual, expected) => {
                    if (!require('util').isDeepStrictEqual(actual, expected)) defects.push(`${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
                };
                // A three-slide deck, each slide 900px tall in a 500px stage: 400px of every slide is below the screen
                const deck = options => pdRunDeckEngine(engine, options);
                {
                    const fresh = deck();
                    expect('the deck opens on the first slide at its top', [fresh.index(), fresh.stage.scrollTop, fresh.status()], [0, 0, 'Slide 1 of 3: Title 1']);
                }
                // When a down key is pressed on a slide with content below the screen
                // Then the slide scrolls (a line key one line, a page key up to the slide's end) and the slide stays
                for (const [key, step] of [['ArrowDown', 40], ['PageDown', 400], [' ', 400]]) {
                    const d = deck();
                    const event = d.press(key);
                    expect(`${JSON.stringify(key)} on a long slide`, [event.defaultPrevented, d.calls, d.index()], [true, [['stage', step]], 0]);
                }
                // When a down key is pressed at the slide's end (a sub-pixel remainder counts as the end)
                // Then the deck moves to the next slide and opens it at its top
                for (const scrollTop of [400, 399.5]) {
                    const d = deck();
                    d.stage.scrollTop = scrollTop;
                    d.press('ArrowDown');
                    expect(`ArrowDown at scrollTop ${scrollTop}`, [d.index(), d.stage.scrollTop, d.calls, d.status()], [1, 0, [], 'Slide 2 of 3: Title 2']);
                }
                // When the key is held down (auto-repeat) at the slide's end
                // Then it stops there: no slide change, the press is still consumed
                for (const key of ['ArrowDown', ' ', 'PageDown']) {
                    const d = deck();
                    d.stage.scrollTop = 400;
                    const event = d.press(key, { repeat: true });
                    expect(`held ${JSON.stringify(key)} at the end`, [event.defaultPrevented, d.index(), d.calls], [true, 0, []]);
                }
                // When the slide changes by Right, End or the Next button from the middle of a scrolled slide
                // Then the new slide opens at its top
                for (const [label, act] of [['ArrowRight', d => d.press('ArrowRight')], ['End', d => d.press('End')], ['Next button', d => d.buttons.next.click()]]) {
                    const d = deck();
                    d.stage.scrollTop = 200;
                    act(d);
                    expect(`${label} from a scrolled slide`, [d.index() > 0, d.stage.scrollTop], [true, 0]);
                }
                // When Shift+Space is pressed: mid-slide it scrolls back; at the slide's top it goes to the previous
                // slide, landing at its end so reading carries on backwards; ArrowLeft goes back to the top instead
                {
                    const d = deck();
                    d.press('ArrowRight');
                    d.stage.scrollTop = 200;
                    d.press(' ', { shiftKey: true });
                    expect('Shift+Space mid-slide', [d.calls, d.index()], [[['stage', -200]], 1]);
                    d.press(' ', { shiftKey: true });
                    expect('Shift+Space at the top', [d.index(), d.stage.scrollTop], [0, 400]);
                    const left = deck();
                    left.press('ArrowRight');
                    left.press('ArrowLeft');
                    expect('ArrowLeft back', [left.index(), left.stage.scrollTop], [0, 0]);
                }
                // Given the notes open and taller than their panel (800px of notes in a 300px panel)
                {
                    const d = deck();
                    d.buttons['toggle-notes'].click();
                    if (d.notesPanel.hidden) defects.push('fixture setup: the Notes button did not open the notes');
                    // When focus reached the notes by a mouse click (no Tab) and ArrowDown is pressed
                    // Then the slide scrolls, never the notes, so a clicker keeps one press per slide
                    d.press('ArrowDown', { target: d.notesTarget });
                    expect('ArrowDown in the notes without Tab', d.calls.splice(0), [['stage', 40]]);
                    // When Tab moved the focus into the notes
                    // Then ArrowDown scrolls the notes and leaves the slide where it is
                    d.press('Tab');
                    d.press('ArrowDown', { target: d.notesTarget });
                    expect('ArrowDown in the notes after Tab', [d.calls.splice(0), d.stage.scrollTop], [[['notes', 40]], 40]);
                    // And at the notes' end a fresh (not held) scroll key moves neither the slide area nor the slide,
                    // even with the slide area at its own end, where a key reaching the deck would change slide; the
                    // press is still consumed so the browser does not scroll the page either (runtime contract §3)
                    d.notesPanel.scrollTop = 500;
                    d.stage.scrollTop = 400;
                    for (const key of ['ArrowDown', 'PageDown', ' ']) {
                        const event = d.press(key, { target: d.notesTarget });
                        expect(`fresh ${JSON.stringify(key)} at the notes end after Tab`, [event.defaultPrevented, d.calls.splice(0), d.index(), d.stage.scrollTop], [true, [], 0, 400]);
                    }
                    // And at the notes' top a fresh back scroll key does not go back a slide either
                    d.press('ArrowRight');
                    d.notesPanel.scrollTop = 0;
                    for (const [key, shiftKey] of [['ArrowUp', false], ['PageUp', false], [' ', true]]) {
                        const event = d.press(key, { shiftKey, target: d.notesTarget });
                        expect(`fresh ${key === ' ' ? 'Shift+Space' : key} at the notes top after Tab`, [event.defaultPrevented, d.calls.splice(0), d.index(), d.stage.scrollTop], [true, [], 1, 0]);
                    }
                    // And ArrowLeft, ArrowRight, Home and End still change slide from the notes (only scroll keys stay there)
                    d.press('ArrowLeft', { target: d.notesTarget });
                    expect('ArrowLeft from the notes after Tab', d.index(), 0);
                    d.press('End', { target: d.notesTarget });
                    expect('End from the notes after Tab', d.index(), 2);
                    d.press('Home', { target: d.notesTarget });
                    d.press('ArrowRight', { target: d.notesTarget });
                    expect('Home then ArrowRight from the notes after Tab', d.index(), 1);
                    d.press('ArrowLeft');
                    // When a mouse press moves the focus again, Then the notes stop taking the keys
                    d.notesPanel.scrollTop = 100;
                    d.mousedown();
                    d.press('ArrowDown', { target: d.notesTarget });
                    expect('ArrowDown in the notes after a mouse press', d.calls.splice(0), [['stage', 40]]);
                    // When the slide changes with the notes scrolled, Then the next slide's notes open at their top
                    d.press('ArrowRight');
                    expect('notes after a slide change', [d.notesPanel.scrollTop, d.notesSlide.textContent], [0, 'Slide 2 of 3: Title 2']);
                }
                // Given open notes that fit their panel, with Tab focus in them and the slide area at its end
                // When a scroll key is pressed, Then the deck still does not move: the notes hold the keys even with
                // nothing to scroll, until the focus leaves them
                {
                    const d = deck({ notesHeight: 200 });
                    d.buttons['toggle-notes'].click();
                    d.stage.scrollTop = 400;
                    d.press('Tab');
                    const event = d.press('ArrowDown', { target: d.notesTarget });
                    expect('ArrowDown in notes that fit, after Tab', [event.defaultPrevented, d.calls.splice(0), d.index(), d.stage.scrollTop], [true, [], 0, 400]);
                }
                // Given a demo embed whose iframe has nothing to show, and a wireframe embed (no iframe) left with a
                // stray empty-state line
                const embedsOf = element => {
                    const note = element();
                    const demoSlide = element({ querySelectorAll: selector => (selector === '.deck__narration .deck__sim-note' ? [note] : []) });
                    const frame = element();
                    const demoEmpty = element({ hidden: true });
                    const wireEmpty = element({ hidden: true });
                    const parts = (iframe, empty, slide) => element({
                        querySelector: selector => ({ iframe, '.deck__empty': empty })[selector] || null,
                        closest: selector => (selector === '.deck__slide' ? slide : null),
                    });
                    return [Object.assign(parts(frame, demoEmpty, demoSlide), { note, frame, empty: demoEmpty }), Object.assign(parts(null, wireEmpty, element()), { empty: wireEmpty })];
                };
                // When the engine starts
                let started = null;
                try { started = deck({ embeds: embedsOf }); } catch (error) { defects.push(`the engine threw on a wireframe embed with no iframe: ${error.message}`); }
                if (started) {
                    const [demo, wire] = started.embeds;
                    // Then the empty demo shows its message instead of a blank frame and drops its Simulated note,
                    // and the wireframe embed is left exactly as it is
                    expect('empty demo swap', [Boolean(demo.frame.removed), demo.empty.hidden, Boolean(demo.note.removed)], [true, false, true]);
                    expect('wireframe embed untouched', wire.empty.hidden, true);
                }
                assertTrue(defects.length === 0, `TC-PD-062 review-deck engine key states drifted:\n  ${defects.join('\n  ')}`);
            },
        },
        {
            // Business Intent (TC-PD-062 generator key states, TC-PD-011 default-look warning, BR-PD-02..04 validator
            // profiles): presentation-builder's own test files guard the general deck's runtime harness, its warning
            // and its validator profiles. Running them here puts them in the aggregate runner and the commit gate, so
            // a regression there fails the suite everyone runs, not only a file nobody invokes.
            name: '[content-presence] TC-PD-062 presentation-builder skill-local tests pass inside the aggregate runner (TC-PD-011)',
            skip: PD_SKIP,
            fn: () => {
                const { spawnSync } = require('child_process');
                const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-pd-skill-tests-'));
                try {
                    const defects = [];
                    for (const file of ['validate-presentation.test.cjs', 'create-presentation.test.cjs', 'skill-genericity.test.cjs']) {
                        // Given a skill-local test file
                        const script = pdSkillPath('presentation-builder', 'tests', file);
                        if (!fs.existsSync(script)) { defects.push(`${file}: missing`); continue; }
                        // When it runs as its own node process (argv array, no shell, scrubbed env, repository cwd)
                        const run = spawnSync(process.execPath, [script], { cwd: PROJECT_DIR, env: pdChildEnv(root), encoding: 'utf8', timeout: 120000 });
                        // Then it exits 0
                        if (run.status !== 0) {
                            const why = run.error ? run.error.message : String(run.stderr || run.stdout || '').trim().split('\n').slice(-6).join('\n    ');
                            defects.push(`${file}: exit ${run.status}${run.signal ? ` (${run.signal})` : ''}\n    ${why}`);
                        }
                    }
                    assertTrue(defects.length === 0, `TC-PD-062 presentation-builder skill-local tests failed:\n  ${defects.join('\n  ')}`);
                } finally {
                    fs.rmSync(root, { recursive: true, force: true });
                }
            },
        },
        {
            // Guards lessons.md "a tripwire per guard": every CJS suite that gates a self-check on
            // tests/lib/framework-repo-guard.cjs (content-presence, project-config-refactor-keys,
            // workflow-routing-switch) must resolve exactly like the ESM helper, which PORT-011 locks
            // active here. A drift makes a guarded self-check skip silently, so both the layouts that
            // decide the signal and this checkout are compared.
            name: '[content-presence] tripwire: the shared synchronous framework-repo guard agrees with framework-repo.helper',
            skip: fs.existsSync(FRAMEWORK_REPO_HELPER) ? false : 'framework-repo helper not present in this bundle',
            fn: async () => {
                const helper = await import(pathToFileURL(FRAMEWORK_REPO_HELPER).href);
                // Given fixture roots for each layout the signal depends on (the helpers read only files
                // under the root they are given, so no env or home-dir state is involved)
                const upstream = frameworkRepoGuard.DEFAULT_FRAMEWORK_PACKAGE_NAME;
                const pkg = name => JSON.stringify({ name });
                const tooling = name => JSON.stringify({ portability: { toolingPackageName: name } });
                const cases = [
                    { label: 'upstream name, no config', files: { 'package.json': pkg(upstream) }, expected: true },
                    { label: 'adopter package', files: { 'package.json': pkg('adopter-app') }, expected: false },
                    { label: 'no package.json', files: {}, expected: false },
                    { label: 'malformed package.json', files: { 'package.json': '{bad' }, expected: false },
                    {
                        label: 'configured tooling name',
                        files: { 'package.json': pkg('vendor-tooling'), 'docs/project-config.json': tooling('vendor-tooling') },
                        expected: true
                    },
                    {
                        label: 'config relocated by .ck.json',
                        files: {
                            'package.json': pkg('vendor-tooling'),
                            '.claude/.ck.json': JSON.stringify({ portability: { projectConfigPath: 'config/team.json' } }),
                            'config/team.json': tooling('vendor-tooling'),
                            'docs/project-config.json': tooling('other-name')
                        },
                        expected: true
                    }
                ];
                for (const { label, files, expected } of cases) {
                    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-framework-guard-'));
                    try {
                        for (const [relative, body] of Object.entries(files)) {
                            fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
                            fs.writeFileSync(path.join(root, relative), body, 'utf8');
                        }
                        // When both helpers resolve the signal
                        const sync = frameworkRepoGuard.isFrameworkRepo(root);
                        const esm = helper.isFrameworkRepo(root);
                        // Then they agree, and on the expected answer
                        assertTrue(sync === esm, `${label}: guard parity: helper=${esm} sync=${sync}`);
                        assertTrue(sync === expected, `${label}: expected ${expected}, got ${sync}`);
                    } finally {
                        fs.rmSync(root, { recursive: true, force: true });
                    }
                }
                // And this checkout resolves identically through both
                assertTrue(helper.isFrameworkRepo(PROJECT_DIR) === IS_FRAMEWORK_REPO,
                    `guard parity: helper=${helper.isFrameworkRepo(PROJECT_DIR)} sync=${IS_FRAMEWORK_REPO}`);
            },
        },
    ],
};
