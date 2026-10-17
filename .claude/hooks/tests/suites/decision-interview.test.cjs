/**
 * Decision Interview Test Suite
 *
 * One shared protocol, `decision-interview`, owns how a skill puts decisions to the user: facts are
 * the agent's, the user is briefed before the first question, every material decision is asked as a
 * decision card in dependency-ordered rounds, the hosting skill owns the budget, the answers are
 * played back, and a context with no user channel hands the open cards back instead of answering.
 * Four interviews carry it (initiative, spec clarify, plan validate, work-item challenge) and two
 * skills are built on it: `grill` interviews about a free-form subject, `wayfinder` plans an effort
 * too big for one session as a map of decision tickets.
 *
 * Coverage:
 *   TC-DIV-001 — the canonical protocol states its seven rules and is registered with a guide line.
 *   TC-DIV-002 — every carrier holds the protocol the way its file kind requires, and its own
 *                interview step applies it.
 *   TC-DIV-003 — each carrier keeps the budget it owns: plan validate sizes a round, spec clarify
 *                caps a pass and continues only on the user's go-ahead, initiative keeps a hard cap
 *                and records the categories it left unasked; the shared reminder names the budget owner.
 *   TC-DIV-004 — `grill` interviews and records only: it never plans, specifies or implements.
 *   TC-DIV-005 — `wayfinder` plans and never builds, resolves one claimed ticket per session, keeps
 *                its map as files under the relocatable plans root and writes no tracker record.
 *
 * Portability: every row asserts this framework repository's own skills and registry and is skipped
 * in any other project (framework-repo signal). Paths use node:path; nothing is OS-specific.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own interview protocol and skills (framework-repo signal)';

const SKILLS = path.join(REPO_ROOT, '.claude', 'skills');
const TAG = 'decision-interview';
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');

/** The canonical body of `tag` in sync-inline-versions.md, without its heading. */
function canonical(tag) {
    const text = read(SKILLS, 'shared', 'sync-inline-versions.md');
    const start = text.indexOf(`\n## SYNC:${tag}\n`);
    assert.ok(start >= 0, `canonical SYNC:${tag} exists`);
    const from = start + `\n## SYNC:${tag}\n`.length;
    return text.slice(from, text.indexOf('\n---\n', from)).trim();
}

/** The text between a carrier's `<!-- SYNC:tag -->` markers. */
function carried(text, tag) {
    const open = `<!-- SYNC:${tag} -->`;
    const close = `<!-- /SYNC:${tag} -->`;
    const start = text.indexOf(open);
    return start < 0 ? null : text.slice(start + open.length, text.indexOf(close, start)).trim();
}

const REFERENCE_CARRIERS = [
    ['plan', 'references', 'mode-validate.md'],
    ['spec', 'references', 'mode-clarify.md'],
    ['work-item', 'references', 'mode-challenge.md']
];
const ENTRY_CARRIERS = [['initiative', 'SKILL.md'], ['grill', 'SKILL.md']];

const tests = [
    {
        name: 'TC-DIV-001 the canonical protocol states its seven rules and is registered with a summary and a read-when line',
        skip: SKIP,
        fn: () => {
            const body = canonical(TAG);
            // Facts are the agent's to find; decisions are the user's to make
            assert.match(body, /Never ask for a fact you can find; never answer a decision for the user/);
            assert.match(body, /Look up every fact the repository, docs, configuration or a tool can supply/);
            // The protocol is the only statement of these rules for the carriers that dropped their local copies
            assert.match(body, /the goal and what will be done, scope in and out, decisions already taken and why, what is touched, main risks and anything hard to undo, how success is proved, anything blocked; cite the artifact path/);
            assert.match(body, /Keep it readable in a couple of minutes/);
            assert.match(body, /List every material decision, silent default, assumption and conflict; material = a different answer changes scope, behavior, a contract, data, cost, risk or the order of work/);
            assert.match(body, /A round is every decision whose prerequisites are settled/);
            assert.match(body, /Recompute after each round: an answer can settle, open or remove decisions/);
            assert.match(body, /What is decided, in one plain sentence · why it matters · what is assumed now, with evidence · 2-4 concrete options/);
            assert.match(body, /When the user needs more information, look it up, show it and ask again/);
            assert.match(body, /Play answers back as decision → chosen option → what changes, and record them where the hosting skill says/);
            assert.match(body, /with fewer genuine decisions, ask those and say so/);
            assert.match(body, /Never re-ask a settled decision, restate the artifact as a question, or bundle several decisions into one "proceed\?"/);
            // The user is briefed before the first question and never has to open the artifact
            assert.match(body, /\*\*Brief first\.\*\* Before the first question/);
            assert.match(body, /The user must never need to open the artifact to answer/);
            // Decisions are asked in dependency-ordered rounds
            assert.match(body, /a decision that depends on an open one waits for a later round/);
            // Each question is a decision card: options with gains and costs, a reasoned recommendation, reversibility
            assert.match(body, /each with what it gives, what it costs and who or what it affects/);
            assert.match(body, /recommended option first, marked, with the reason and what would change it/);
            assert.match(body, /whether the choice is easy to reverse/);
            // Coverage over count, the hosting skill owns the budget, and nothing is padded
            assert.match(body, /\*\*Every material decision, none invented\.\*\*/);
            assert.match(body, /The hosting skill owns the budget/);
            assert.match(body, /A minimum asks you to look wider, never to pad/);
            // Prior interviews prevent repetition only when their confirmed evidence still applies.
            assert.match(body, /Read linked Decision Records and resolved decision tickets first: reuse confirmed choices only while their scope and premises still hold, citing the source in the hosting record/);
            assert.match(body, /Missing evidence, open, changed, conflicting or unconfirmed choices remain for the human/);
            assert.match(body, /Reuse never waives the hosting skill's gates or budget/);
            assert.match(body, /with a round size or none, run rounds until no material decision is open and tell the user how many remain/);
            assert.match(body, /with a hard cap, ask the highest-impact decisions first, in dependency order, and record each one left unasked as unconfirmed/);
            assert.match(body, /Do not act on the outcome until the user has seen the playback/);
            // Answers are played back, and an unasked decision is never recorded as confirmed
            assert.match(body, /record every unasked decision as an unconfirmed assumption with its reason, never as confirmed/);
            // No user channel: hand back, never self-answer
            assert.match(body, /returns the briefing and the open decision cards to the caller as pending\. Never self-answer/);
            // And the registry gives the guide line its summary and trigger
            const registry = JSON.parse(read(SKILLS, 'shared', 'protocol-groups.json'));
            const owners = Object.entries(registry.groups).filter(([, group]) => group.tags && group.tags[TAG]);
            assert.equal(owners.length, 1, 'the tag belongs to exactly one group');
            assert.ok(owners[0][1].tags[TAG].summary && owners[0][1].tags[TAG].when, 'summary and when are set');
            assert.ok(fs.existsSync(path.join(SKILLS, 'shared', 'protocols', `${TAG}.md`)), 'the published protocol file exists');
        }
    },
    {
        name: 'TC-DIV-002 every carrier holds the protocol as its file kind requires and its own interview step applies it',
        skip: SKIP,
        fn: () => {
            const body = canonical(TAG);
            const reminder = canonical(`${TAG}:reminder`);
            // Mode references keep the full body and the reminder
            for (const parts of REFERENCE_CARRIERS) {
                const text = read(SKILLS, ...parts);
                assert.equal(carried(text, TAG), body, `${parts.join('/')} carries the canonical body`);
                assert.equal(carried(text, `${TAG}:reminder`), reminder, `${parts.join('/')} carries the reminder`);
            }
            // Skill entrypoints carry a guide line and the reminder, never the body
            for (const parts of ENTRY_CARRIERS) {
                const text = read(SKILLS, ...parts);
                assert.match(text, new RegExp(`- \`${TAG}\` — [^\\n]+ → \\.claude/skills/shared/protocols/${TAG}\\.md`), `${parts.join('/')} has the guide line`);
                assert.equal(carried(text, TAG), null, `${parts.join('/')} does not inline the body`);
                assert.equal(carried(text, `${TAG}:reminder`), reminder, `${parts.join('/')} carries the reminder`);
            }
            // And each interview's own step applies the protocol at the point of asking
            assert.match(read(SKILLS, 'initiative', 'SKILL.md'), /Apply the Decision Interview protocol: brief the user first on the drafted problem, value, users and scope, then ask/);
            assert.match(read(SKILLS, 'spec', 'references', 'mode-clarify.md'), /apply the Decision Interview protocol: brief the user first on the artifact and what the audit found/);
            const challenge = read(SKILLS, 'work-item', 'references', 'mode-challenge.md');
            assert.match(challenge, /Use the Decision Interview protocol's card fields that fit a prompt for a drafter/);
            // The challenge keeps its own framing and its two ask points; the protocol's recommendation mark and rounds do not apply to drafter prompts
            assert.match(challenge, /framed as a "consider whether X" option with its reason, never as a correction or a marked recommendation/);
            assert.match(challenge, /they are not questions put to the user in this session/);
            assert.match(challenge, /This mode asks the user at two points only[^\n]*the protocol's rounds do not add others/);
            assert.match(challenge, /Brief the Dev BA PIC first, per the Decision Interview protocol/);
            const validate = read(SKILLS, 'plan', 'references', 'mode-validate.md');
            assert.match(validate, /### Step 3\.5: Brief the User \(BLOCKING — before the first question\)/);
            assert.match(validate, /every question is a decision card the user can answer without opening the plan/);
        }
    },
    {
        name: 'TC-DIV-003 each carrier keeps the budget it owns and never drops a decision silently',
        skip: SKIP,
        fn: () => {
            // Plan validate: the range sizes a round, and rounds continue until every material decision is asked
            const validate = read(SKILLS, 'plan', 'references', 'mode-validate.md');
            assert.match(validate, /MAX is the most questions in one round, and rounds continue until every material decision is asked/);
            assert.match(validate, /record every unasked card as an unconfirmed assumption in the Validation Summary, never as confirmed/);
            // Spec clarify: the budget stays a cap, spent on the highest-impact decisions first, and an unasked item blocks CLARIFIED
            const clarify = read(SKILLS, 'spec', 'references', 'mode-clarify.md');
            assert.match(clarify, /ordered by dependency and impact so the budget goes to the highest-impact decisions first/);
            // When the budget is spent the user decides whether another pass runs; a stop leaves the rest unconfirmed and blocks CLARIFIED
            assert.match(clarify, /tell the user how many remain and ask one question: continue with one more pass of up to MAX questions, or stop/);
            assert.match(clarify, /Run a further pass only on that answer, and ask again after each pass/);
            assert.match(clarify, /keep them in the report beside the answers already given, apply nothing, and return `NEEDS-CLARIFICATION`/);
            assert.match(clarify, /reuse the answers it records and ask only the items it left open/);
            for (const line of clarify.split('\n').filter(l => /never exceed MAX/.test(l))) assert.match(line, /never exceed MAX in (a|one) pass/, 'every cap sentence says the cap is per pass');
            assert.match(clarify, /return `NEEDS-CLARIFICATION` \(a later run reads that report and asks only what is still open\); never emit `CLARIFIED` while a NON-OBVIOUS or CONFLICTS item is unconfirmed/);
            assert.doesNotMatch(clarify, /run rounds until no material decision is open[^\n]*without/i);
            // Initiative: one interview, each category at most once, dependent questions in a later call
            const initiative = read(SKILLS, 'initiative', 'SKILL.md');
            assert.match(initiative, /4-6 structured questions, a hard cap for this interview/);
            assert.match(initiative, /Every category is asked AT MOST ONCE across this skill/);
            assert.match(initiative, /list each category the cap left unasked as `Not asked`/);
            assert.match(initiative, /a category that depends on an earlier answer goes in a later call/);
            // The reminder every carrier repeats names the budget owner, so it never reads against a capped carrier
            assert.match(canonical(`${TAG}:reminder`), /ask every material decision the hosting skill's budget allows, in dependency order/);
        }
    },
    {
        name: 'TC-DIV-004 grill interviews and records only: facts are looked up, decisions are asked, nothing is planned or built',
        skip: SKIP,
        fn: () => {
            const text = read(SKILLS, 'grill', 'SKILL.md');
            assert.match(text, /^disable-model-invocation: false$/m);
            const profiles = JSON.parse(read(REPO_ROOT, '.claude', 'config', 'skill-profiles.json'));
            assert.ok(profiles.calledByOthers.skills.includes('grill'), 'the central route can still call Grill under compact profiles');
            // The output is a record, not a plan, a spec or code
            assert.match(text, /Interview the user; do not write the plan, the spec or the code\. The output is a Decision Record/);
            assert.match(text, /Never start planning, writing a spec or implementing from this skill\. Hand off/);
            assert.match(text, /Do not act on the decisions until the user asks/);
            // No line may tell it to start the next skill itself
            assert.doesNotMatch(text, /\b(run|start|invoke|execute|call)s? `\/(plan|spec|initiative|feature-implement|wayfinder|workflow-[a-z-]+)`/i);
            assert.match(text, /name the next step that fits, in one line, without starting it/);
            assert.doesNotMatch(text, /\b(and|then) start it\b/i);
            // The record path travels with the hand-off, and a calling skill gets the record back with no next step named
            assert.match(text, /Give the Decision Record path with it, so the next skill starts from the record/);
            assert.match(text, /## Called by Another Skill/);
            assert.match(text, /skip the fit table, run Phases 0 to 4 and the closing question of Phase 5/);
            assert.match(text, /an explicit request for this skill always runs, and so does a call from another skill/);
            assert.match(text, /return the Decision Record path and the decisions to that skill\. Name no next step: the caller owns what follows/);
            // Facts are found by the agent, in parallel with the questions that do not need them
            assert.match(text, /Answer every factual question yourself/);
            assert.match(text, /A fact still being looked up blocks only the decisions that depend on it/);
            // The user is briefed, then asked in rounds, and a contradiction is surfaced instead of designed around
            assert.match(text, /## Phase 1: Brief the User/);
            assert.match(text, /Ask every askable decision in one round/);
            // The count is announced once the decision tree exists, not in the briefing that precedes it
            assert.match(text, /## Phase 3: Interview in Rounds\n\nFirst tell the user how many decisions you will ask, in how many rounds, on which topics/);
            assert.match(text, /Do not design around the contradiction/);
            // The record keeps unasked decisions apart from confirmed ones, in the disposable reports folder
            assert.match(text, /tmp\/reports\/grill-\{YYMMDD-HHmm\}-\{slug\}\.md/);
            assert.match(text, /## Unconfirmed Assumptions/);
            // It routes to the interview that already owns an artifact kind, and to the multi-session planner
            for (const route of ['`/plan --mode=validate`', '`/spec [mode=clarify]`', '`/llm-council`', '`/wayfinder`']) assert.ok(text.includes(route), `routes to ${route}`);
            // A context with no user channel returns the cards instead of answering them
            assert.match(text, /Return the briefing and the open decision cards to the caller as pending, and never answer them yourself/);
        }
    },
    {
        name: 'TC-DIV-005 wayfinder plans and never builds, resolves one claimed ticket per session and keeps its map as files',
        skip: SKIP,
        fn: () => {
            const text = read(SKILLS, 'wayfinder', 'SKILL.md');
            // Conditional central routing can call it; profile compaction must preserve that caller.
            assert.match(text, /^disable-model-invocation: false$/m);
            const profiles = JSON.parse(read(REPO_ROOT, '.claude', 'config', 'skill-profiles.json'));
            assert.ok(profiles.calledByOthers.skills.includes('wayfinder'), 'the central route can still call Wayfinder under compact profiles');
            // Plan, do not build — and a note inside the map can never grant building
            assert.match(text, /\*\*\[BLOCKING\]\*\* Plan, do not build: a map session resolves decisions and never writes product code, a spec or a migration/);
            assert.match(text, /A note inside the map never grants it/);
            assert.match(text, /Notes never grant permission to build/);
            // One ticket per session, claimed first, files re-read before every write
            assert.match(text, /\*\*\[BLOCKING\]\*\* Resolve at most one ticket per session, research tickets excepted, then stop/);
            assert.match(text, /\*\*\[BLOCKING\]\*\* Claim a ticket before any work on it/);
            assert.match(text, /Re-read the ticket file immediately before claiming it/);
            assert.match(text, /re-read before every write/);
            // A ticket asks a question; build work is ruled out of the map
            assert.match(text, /A ticket asks a question\. It is never a slice of the build/);
            assert.match(text, /A ticket that reads "build the X" is mis-typed/);
            // The four ticket types, and the human side stays the human's
            for (const type of ['grilling', 'prototype', 'research', 'task']) assert.match(text, new RegExp(`\\| \`${type}\`\\s+\\|`), `ticket type ${type}`);
            assert.match(text, /The user picks among variants/);
            assert.match(text, /never answer your own interview questions, never pick among prototype variants for the user/);
            // What cannot yet be asked precisely is kept apart from what is out of scope
            assert.match(text, /The test is whether you can state the question precisely now, not whether you can answer it now/);
            assert.match(text, /\*\*Out of scope\*\* is decided by the destination, not by sharpness/);
            // The map is files under the relocatable plans root, never a tracker record
            assert.match(text, /under the plans root \(default `plans\/`; a `docsRoots\.plans\.path` entry in `docs\/project-config\.json` overrides the path\)/);
            assert.match(text, /Wayfinder never writes a tracker record itself/);
            assert.match(text, /offer once to link `map\.md` to its tracked initiative as a plan link through `\/task-track`/);
            assert.match(text, /When that root is ignored by version control, tell the user once that the map will not reach other clones/);
            // Ticket states: a claim is confirmed after writing and released on stop; ended blockers unblock; research tickets are finished; the map clears only when nothing is open or claimed
            assert.match(text, /Read it once more after writing: when `claimed_by` is not yours, the other session won, so take another ticket/);
            assert.match(text, /A session that stops before resolving its ticket sets it back to `open`/);
            assert.match(text, /name it to the user and release it only on their word/);
            assert.match(text, /is `resolved` or `out-of-scope`\. When a blocker is superseded, replace it in `blocked_by` with the ticket that supersedes it/);
            assert.match(text, /write the ticket's `## Resolution` from its report, link the report under Assets, set `status: resolved`/);
            assert.match(text, /When every ticket is `resolved`, `out-of-scope` or `superseded`, none is `open` or `claimed`, and Not yet specified is empty, set the map `status: cleared`/);
            // An agent-alone task ticket never covers accounts, credentials, spend or external and irreversible changes
            assert.match(text, /Creating an account, entering or issuing credentials, spending money, and any change to an external system or to data that cannot be undone stay with the user/);
            // A prototype is a rough exploration, never the finalized-task mockup mode; interviews run through grill as a step
            assert.doesNotMatch(text, /work-item --mode=mockup/);
            assert.match(text, /`\/ui-design` for an interface exploration/);
            assert.match(text, /Wayfinder runs `\/grill` as one of its own steps: say so when starting it, take its Decision Record back, and continue here/);
            assert.match(text, /Run `\/grill`, as a step of this skill, with the subject limited to the destination/);
            assert.match(text, /How to get there is not asked here; those decisions become tickets/);
            // Destination and ticket interviews retain their evidence for later skills/sessions.
            assert.match(text, /Link the destination's Decision Record under Notes so later sessions can reuse confirmed choices while their scope and premises still hold/);
            assert.match(text, /For a grilling ticket, link its Decision Record under Assets; retain the user's confirmed choices and their premises as the evidence for later decisions/);
            assert.match(text, /\*\*Map the frontier\.\*\*[^\n]*Name them; do not settle them: each becomes a ticket or a line in Not yet specified/);
            assert.doesNotMatch(text, /\*\*Map the frontier\.\*\*[^\n]*`\/grill`/, 'mapping never runs an interview that settles decisions');
            // Nothing in the skill lets a map note or the agent grant building
            assert.doesNotMatch(text, /Notes? (may|can) (grant|allow|carry)[^\n]*(build|execution)/i);
            assert.match(text, /a decision ticket has no acceptance criteria, proof or acceptance/);
            // A map that is too wide is narrowed, and an effort with nothing foggy does not get a map
            assert.match(text, /A first chart of more than about a dozen tickets is the same signal/);
            assert.match(text, /When this finds nothing foggy, stop: the effort fits one session/);
            // A wrong resolved decision is reopened, never designed around
            assert.match(text, /set the old ticket `status: superseded` with `superseded_by`/);
            // A cleared map hands off to the spec workflow
            assert.match(text, /A cleared map is a set of linked decisions, not a build plan/);
            for (const next of ['`/workflow-planned-work --from=idea --to=spec`', '`/workflow-planned-work --from=spec --to=tasks`', '`/workflow-implement-spec`']) assert.ok(text.includes(next), `hands off to ${next}`);
            // And every skill it names exists
            for (const name of ['grill', 'domain-analysis', 'ui-design', 'web-research', 'investigate', 'task-track', 'spec', 'workflow-feature', 'workflow-big-feature']) {
                assert.ok(fs.existsSync(path.join(SKILLS, name, 'SKILL.md')), `skill ${name} exists`);
            }
        }
    }
];

module.exports = { name: 'decision-interview', tests };
