#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * Commit-request router for UserPromptSubmit.
 *
 * When the user's prompt asks for a commit, inject a directive that the request
 * MUST be carried out through the `commit` skill — never an ad-hoc `git commit`.
 * The skill owns scoped staging, applicable project checks and the review
 * receipt; `review-commit-gate.cjs` independently blocks an unreviewed raw
 * commit, so this hook is the FRONT door and the gate is the back stop.
 *
 * Runs on every prompt (no dedup ledger): a commit request can arrive at any
 * point in a session and the directive is only useful on the prompt that asks.
 * Detection is a small heuristic; the directive is conditional ("if the user is
 * asking you to commit"), so a false positive costs a few lines of context and a
 * false negative falls back to the static rule and the commit gate.
 *
 * Mirrored to Codex and OpenCode by the hook sync generators, which is why the
 * directive names the skill host-neutrally. Advisory plaintext; always exit 0.
 *
 * On by default; off with `.claude/.ck.json` commitSkillRoute.enabled:false (a
 * developer override in `.claude/.ck.local.json` wins) or CK_COMMIT_SKILL_ROUTE=0.
 * Failures stay silent; CK_DEBUG=1 prints the diagnostic to stderr.
 *
 * @hook UserPromptSubmit
 */

const { isHookEntryPoint } = require('./lib/hook-runner.cjs');
const { debugError } = require('./lib/debug-log.cjs');
const { readUserPrompt, isRouterEnabled } = require('./lib/prompt-route-utils.cjs');

const HOOK_NAME = 'commit-skill-route';
const MARKER_START = '<!-- CK:COMMIT-SKILL-ROUTE -->';
const MARKER_END = '<!-- /CK:COMMIT-SKILL-ROUTE -->';
const SETTINGS_SECTION = 'commitSkillRoute';
const ENV_SWITCH = 'CK_COMMIT_SKILL_ROUTE';

// An explicit skill invocation already routes: `/commit`, `$commit`, or a plugin-scoped form.
const EXPLICIT_INVOCATION = /^\s*[/$](?:[\w-]+:)?commit\b/i;
// "commit" / "commits" / "committing" used as a verb or request, e.g. "commit this", "stage and commit",
// "commit and push", "make a commit", "please commit", or a bare "commit". A word joined to "commit" by a
// hyphen or a dot is an identifier or file name ("review-commit-gate", "commit-skill-route.cjs"), not a request.
const COMMIT_WORD = /(?<![\w-])commit(?:s|ting)?(?![\w-]|\.\w)/gi;
// "commit" as a noun naming an existing commit or one of its attributes: "the commit message", "commit
// history", "the commit gate", "what does this commit do?", "which commit broke it?".
const NOUN_AFTER = /^\s+(?:messages?|msgs?|history|hash(?:es)?|ids?|shas?|gates?|logs?|graph|range|hooks?|titles?|body|bodies|authors?|dates?|subjects?|trees?|diffs?|objects?|format|conventions?|style|template)\b/i;
const REFERENCE_BEFORE = /\b(?:this|that|which|each|every)\s+$/i;
// Negated requests: "don't commit", "do not commit", "never commit", "no need to commit", "shouldn't commit",
// "hold off on committing", "without committing", "not to commit", and a short coordinated verb list before
// commit: "do not stage or commit", "don't push or commit", "never stage/commit". Only filler words and those
// git verbs may sit between, so "don't forget to commit" still counts as a request. The list must reach
// "commit" through or/and/nor or a slash: a bare comma after a single verb closes the negated clause, so
// "without pushing, commit this" is still a request (the list rules below cover the other bare-comma cases).
const NEGATION = "(?:don'?t|do\\s+not|never|no\\s+need\\s+to|no|not|without|avoid|skip|should(?:n'?t|\\s+not)|must(?:n'?t|\\s+not)|won'?t|will\\s+not|hold\\s+off(?:\\s+on)?|refrain\\s+from)";
const FILLER = '(?:(?:to|be|yet|any|a|the|need\\s+to|want\\s+to)\\s+){0,2}';
const GIT_VERB = '(?:stag(?:e|ing)|push(?:ing)?|add(?:ing)?|amend(?:ing)?|merg(?:e|ing)|tag(?:ging)?|rebas(?:e|ing)|squash(?:ing)?)';
const VERB_JOIN = '(?:\\s*,\\s*(?:(?:or|and|nor)\\s+)?|\\s*/\\s*|\\s+(?:or|and|nor)\\s+)';
const FINAL_JOIN = '(?:\\s*,\\s*(?:or|and|nor)\\s+|\\s*/\\s*|\\s+(?:or|and|nor)\\s+)';
const NEGATION_BEFORE = new RegExp(`\\b${NEGATION}\\s+${FILLER}(?:(?:${GIT_VERB}${VERB_JOIN}){0,3}${GIT_VERB}${FINAL_JOIN})?$`, 'i');
// "commit" reached through a bare comma is still inside the negated list when the list is already two verbs
// long ("don't stage, push, commit") or goes on past "commit" ("do not stage, commit, or push", "don't stage,
// commit or push"). A single verb, a bare comma and no continuation ("without pushing, commit this") stays a
// request. Forbidding wins a tie: a missed request falls back to the static rule and the commit gate.
const NEGATED_LIST_COMMA = `\\b${NEGATION}\\s+${FILLER}`;
const NEGATED_LIST_TAIL = new RegExp(`${NEGATED_LIST_COMMA}(?:${GIT_VERB}${VERB_JOIN}){1,3}${GIT_VERB}\\s*,\\s*$`, 'i');
const NEGATED_LIST_OPEN = new RegExp(`${NEGATED_LIST_COMMA}${GIT_VERB}\\s*,\\s*$`, 'i');
const LIST_CONTINUES = new RegExp(`^${VERB_JOIN}${GIT_VERB}\\b`, 'i');
// A commit named by hash is a reference to an existing commit, not a request to make one.
const HASH_AFTER = /^\s+[0-9a-f]{7,40}\b/i;
// Typographic apostrophes ("don’t") are normalised so negations match either spelling.
const CURLY_APOSTROPHE = /[‘’ʼ]/g;

/** True when the prompt reads as a request to create a commit that is not already a skill call. */
function isCommitRequest(prompt) {
    if (typeof prompt !== 'string' || prompt.trim().length === 0) return false;
    if (EXPLICIT_INVOCATION.test(prompt)) return false;
    const userText = readUserPrompt(prompt);
    if (userText === null) return false; // host envelope, not user input
    const text = userText.replace(CURLY_APOSTROPHE, "'");
    COMMIT_WORD.lastIndex = 0;
    let match;
    while ((match = COMMIT_WORD.exec(text)) !== null) {
        const before = text.slice(Math.max(0, match.index - 64), match.index);
        const after = text.slice(match.index + match[0].length, match.index + match[0].length + 48);
        if (NEGATION_BEFORE.test(before) || NEGATED_LIST_TAIL.test(before)) continue;
        if (NEGATED_LIST_OPEN.test(before) && LIST_CONTINUES.test(after)) continue;
        if (HASH_AFTER.test(after) || NOUN_AFTER.test(after) || REFERENCE_BEFORE.test(before)) continue;
        return true;
    }
    return false;
}

function buildDirective() {
    return [
        MARKER_START,
        '**[COMMIT-SKILL-ROUTE]** User asks to commit (commit, stage+commit, save changes, commit+push)? MUST run',
        '`commit` skill, follow its SKILL.md end to end: Claude Code → Skill tool `commit`; Codex → `$commit`',
        '(`.agents/skills/commit/SKILL.md`); OpenCode → `commit` skill (`.claude/skills/commit/SKILL.md`). Push also',
        'asked → pass `--push`. NEVER run an ad-hoc `git commit` — skips project checks and review gates;',
        '`review-commit-gate` blocks unreviewed commit anyway. Only discussing/referencing commits, or forbidding one → ignore.',
        MARKER_END
    ].join('\n');
}

/**
 * Return the text to emit for a UserPromptSubmit event, or '' to stay silent.
 * deps (tests): env, projectDir, rawSettings — forwarded to the opt-out check.
 */
function evaluate(input, deps = {}) {
    try {
        if (!input || typeof input !== 'object' || Array.isArray(input)) return '';
        if (input.hook_event_name && input.hook_event_name !== 'UserPromptSubmit') return '';
        if (!isCommitRequest(input.prompt)) return '';
        // Checked only on a match, so most prompts never pay for the settings read.
        if (!isRouterEnabled(SETTINGS_SECTION, ENV_SWITCH, deps)) return '';
        return `${buildDirective()}\n`;
    } catch (error) {
        debugError(HOOK_NAME, error); // fail open: stay silent, diagnose under CK_DEBUG
        return '';
    }
}

module.exports = {
    HOOK_NAME,
    MARKER_START,
    MARKER_END,
    SETTINGS_SECTION,
    ENV_SWITCH,
    isCommitRequest,
    buildDirective,
    evaluate
};

if (isHookEntryPoint(module)) {
    process.exitCode = 0;
    try {
        const { parseStdinSync } = require('./lib/stdin-parser.cjs');
        const input = parseStdinSync({ defaultValue: null, throwOnError: true, context: HOOK_NAME });
        const text = evaluate(input);
        if (text) process.stdout.write(text);
    } catch (error) {
        debugError(HOOK_NAME, error); // fail open: an advisory hook never blocks a prompt
    }
}
