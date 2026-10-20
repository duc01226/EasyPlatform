#!/usr/bin/env node
/**
 * File Conventions — shared matcher + renderer for per-file convention classes.
 *
 * One source of truth for three carriers (spec BR-PFCI-13 static parity):
 *   1. file-convention-inject.cjs hook (PostToolUse additionalContext accelerator)
 *   2. CLAUDE.md "Automatic Skill Activation" table (section-builders.cjs)
 *   3. `node .claude/hooks/lib/file-conventions.cjs --lookup <path>` (shell read)
 *
 * Pure functions only (no delivery memory): target extraction, membership,
 * ordering, rendering, content hash and the size-capped digest.
 * Config contract: docs/project-config.json `contextGroups[]` + `conventionInjection`
 * (schema: project-config-schema.cjs). Design: plans/260916-per-file-convention-injection.
 * Per-class delivery policy (not rendered, not hashed): `reinjectAfterTokens` narrows the class's
 * re-arm distance; `evidenceDocs` / `evidenceSkills` let a transcript read of every listed doc, or a
 * load of any listed skill, count as the class being present (convention-ledger scanEvidence).
 * Per-class trigger `on` (read | edit | both, default both; BR-PFCI-19) filters matching by operation,
 * and a digest delivered on a read uses the conditional opening wording (BR-PFCI-20).
 * Content signals: a class may also match a file by what it contains (`contentRegexes`, scanned only in
 * files whose extension is in `contentExtensions`). The read is bounded and fail-open (CONTENT_LIMITS)
 * and happens only for classes that declare content signals, after path exclusions.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

// pfci-2: the content version also covers membership (includes, excludes, extension filter).
const RENDERER_VERSION = 'pfci-2';
const PATH_CAP = 1024;
const DEFAULT_PRIORITY = 500;
const LOOKUP_COMMAND = 'node .claude/hooks/lib/file-conventions.cjs --lookup';
// Versioned capability checked by the root generator before relying on complete pre-action lookup.
const COMPLETE_LOOKUP_VERSION = 1;
const LOOKUP_PAGE_CHARS = 9500;

// Per-class trigger `on` (BR-PFCI-19): which operations deliver a class. A class that names none
// (or names a value outside this set, which the config validator reports) behaves as `both`.
// The operation itself is `read` (a file read) or `edit` (a creation, change or move).
const TRIGGER_READ = 'read';
const TRIGGER_EDIT = 'edit';
const TRIGGER_BOTH = 'both';
const CLASS_TRIGGERS = Object.freeze([TRIGGER_READ, TRIGGER_EDIT, TRIGGER_BOTH]);

const DEFAULTS = Object.freeze({
    enabled: false,
    maxChars: 4000,
    maxClassesPerEdit: 4,
    // Transcript bytes, not tokens: history files store roughly 5-6 bytes per visible character
    // (measured; about 22 bytes per token), so 4500000 bytes is about two hundred thousand
    // tokens of conversation (BR-PFCI-05). 4500000 is also the enforced floor below, so a
    // re-injection can never be requested closer than ~200K tokens of conversation growth.
    reinjectAfterBytes: 4500000,
    reinjectAfterMinutes: 30,
    // Used only when the working context is BLIND: its size cannot be measured AND no condensation was ever
    // observed for it, so the condensation test is vacuous and age is the only signal left. A much shorter
    // window bounds how long an unseen condensation can suppress a reminder (BR-PFCI-15).
    blindReinjectAfterMinutes: 5,
    onRead: true,
    compactionMarkers: Object.freeze([])
});

// Accepted integer ranges. The config validator (project-config-schema.cjs, kept
// dependency-free) mirrors these; TC-PFCI-013 fails on any drift so a value the validator
// accepts is never silently replaced by a default at runtime (BR-PFCI-11).
const RANGES = Object.freeze({
    maxChars: Object.freeze([500, 10000]),
    maxClassesPerEdit: Object.freeze([1, 10]),
    // Floor = the ~200K-token distance (BR-PFCI-05/15): a shorter window would re-inject too near.
    reinjectAfterBytes: Object.freeze([4500000, Number.MAX_SAFE_INTEGER]),
    reinjectAfterMinutes: Object.freeze([1, 1440]),
    blindReinjectAfterMinutes: Object.freeze([1, 1440])
});

// Transcript bytes per conversation token, the same measurement DEFAULTS.reinjectAfterBytes rests on
// (~22 bytes of history JSONL per token). Converts a class's token window into the byte distance the
// ledger measures: 150000 tokens -> 3300000 bytes.
const BYTES_PER_TOKEN = 22;
// Per-class `reinjectAfterTokens` range. A class may ask for a SHORTER window than the global floor
// (a gate the model must not lose, e.g. the UI/UX gate at 150K tokens); the floor still stops a
// class from re-injecting every few turns. The config validator mirrors this range.
const CLASS_REINJECT_TOKENS_RANGE = Object.freeze([20000, 2000000]);

// Content-signal bounds (a class's `contentRegexes` / `contentExtensions`). Reads are capped so a class
// with content signals never costs more than one small read per candidate file. Count and length caps
// bound the work of a list; they do NOT bound the time of one pattern. Three layers deal with that:
// (1) `isSafeContentRegex` is a cheap best-effort PRE-FILTER (a static lint: a blacklist of the known
// nested/overlapping repetition shapes, plus a cap on loop-free optional elements, whose compilation V8
// cannot interrupt; other slow patterns can pass it); (2) THE TIME BUDGET: every source that is not
// byte-identical to a framework built-in runs inside `vm` with a timeout (see `contentSignalOf`), which
// interrupts matching (backtracking); a timeout is "no match", and a source that timed out is skipped for
// the rest of the process; (3) the built-in sources run directly and are vetted by the perf and lint tests. A config-supplied regex also sees a smaller sample (`maxConfigBytes`) than the
// built-ins (`maxBytes`). The validator (project-config-schema.cjs, dependency-free) mirrors the caps and
// the lint by value; the ai-feature-gate suite fails on any drift, so a value the validator accepts is
// never dropped here.
const CONTENT_LIMITS = Object.freeze({
    maxBytes: 65536,
    maxConfigBytes: 16384,
    maxFileBytes: 2 * 1024 * 1024,
    maxRegexes: 64,
    maxRegexLength: 500,
    maxExtensions: 64,
    maxLabelLength: 80
});

// Total wall-clock budget, per file and class, for the config-supplied content regexes (milliseconds).
const CONTENT_REGEX_BUDGET_MS = 100;
// The same hard ceiling applies to project-supplied path, file-name and exclusion regexes. Built-in
// sources are audited and stay on the direct fast path; configuration sources run in the interruptible
// VM so one accepted-but-pathological expression cannot stall a hook or a whole change-set scan.
const PATH_REGEX_BUDGET_MS = 100;
// Sources that ran out of budget stay skipped for the process; the set is capped so it cannot grow without bound.
const MAX_TIMED_OUT_SOURCES = 1024;

/**
 * Why a content regex is unsafe to run over a file sample, or null when it is acceptable (static lint on
 * the pattern text; it never executes the pattern). Rejects: a blank, over-long (500 characters) or
 * non-compiling pattern; a back-reference; a repeated group that itself contains a large repetition
 * (`(x+)+`, `(x*)*`, `(.*x){2}`); a large repetition over a group whose alternatives can start with the
 * same character (`(a|aa)+`); and two large repetitions in a row over the same or a wildcard-like atom
 * (`a*a*`, `.*.*`); and more than 10 loop-free optional elements in total (`?`, counted ranges of at most 3,
 * empty alternatives), whose compilation V8 cannot interrupt. A "large" repetition is unbounded or has an
 * upper bound over 100. A best-effort pre-filter, not a proof of speed: the vm time budget is the guarantee. Self-contained
 * (no outer constants): project-config-schema.cjs carries the identical text and a test compares them.
 */
function contentRegexLintReason(source) {
    if (typeof source !== 'string' || source.trim().length === 0) return 'blank pattern';
    if (source.length > 500) return 'longer than 500 characters';
    try {
        new RegExp(source, 'i');
    } catch {
        return 'does not compile';
    }
    const stack = [];
    let frame = { big: false, hasAlt: false, altStart: true, firsts: [] };
    let last = null;
    let tail = null;
    let optional = 0;
    const addAtom = (text, literal, wild) => {
        if (frame.altStart) {
            frame.firsts.push(literal);
            frame.altStart = false;
        }
        last = { text, group: null, wild, prevTail: tail };
        tail = null;
    };
    let i = 0;
    while (i < source.length) {
        const c = source[i];
        if (c === '\\') {
            const n = source[i + 1] || '';
            if (/[1-9]/.test(n) || (n === 'k' && source[i + 2] === '<')) return 'back-reference';
            addAtom(c + n, null, /[sdwSDW]/.test(n));
            i += 2;
        } else if (c === '[') {
            let j = i + 1;
            if (source[j] === '^') j += 1;
            while (j < source.length && source[j] !== ']') j += source[j] === '\\' ? 2 : 1;
            const text = source.slice(i, j + 1);
            addAtom(text, null, text.startsWith('[^'));
            i = j + 1;
        } else if (c === '(') {
            const prefix = /^\(\?(?:[:=!]|<[=!]|<[A-Za-z_$][\w$]*>)/.exec(source.slice(i));
            if (frame.altStart) {
                frame.firsts.push(null);
                frame.altStart = false;
            }
            stack.push({ frame, last, tail });
            frame = { big: false, hasAlt: false, altStart: true, firsts: [] };
            last = null;
            tail = null;
            i += prefix ? prefix[0].length : 1;
        } else if (c === ')') {
            if (frame.altStart) {
                frame.firsts.push(null);
                optional += 1;
            }
            const closed = frame;
            const parent = stack.pop();
            if (!parent) return 'does not compile';
            frame = parent.frame;
            if (closed.big) frame.big = true;
            last = { text: '(group)', group: closed, wild: false, prevTail: parent.tail };
            tail = null;
            i += 1;
        } else if (c === '|') {
            if (frame.altStart) {
                frame.firsts.push(null);
                optional += 1;
            }
            frame.hasAlt = true;
            frame.altStart = true;
            last = null;
            tail = null;
            i += 1;
        } else if (c === '*' || c === '+' || c === '?' || c === '{') {
            const counted = c === '{' ? /^\{(\d+)(?:(,)(\d*))?\}/.exec(source.slice(i)) : null;
            if (c === '{' && !counted) {
                addAtom(c, c, false);
                i += 1;
                continue;
            }
            let min = 0;
            let max = 1;
            let length = 1;
            if (c === '*') max = Infinity;
            else if (c === '+') {
                min = 1;
                max = Infinity;
            } else if (counted) {
                min = Number(counted[1]);
                max = counted[2] ? (counted[3] === '' ? Infinity : Number(counted[3])) : min;
                length = counted[0].length;
            }
            i += length;
            if (source[i] === '?') i += 1;
            if (!last) continue;
            if (max <= 3 && min < max) {
                optional += max - min;
                if (optional > 10) return 'too many optional elements';
            }
            const big = max === Infinity || max > 100;
            if (last.group) {
                if (max > 1 && last.group.big) return 'repeated group containing a large repetition';
                if (big && last.group.hasAlt) {
                    const firsts = last.group.firsts.map(first => (first === null ? null : first.toLowerCase()));
                    if (firsts.includes(null) || new Set(firsts).size !== firsts.length) return 'repeated alternation with overlapping alternatives';
                }
            }
            if (big) {
                const previous = last.prevTail;
                if (previous && (previous.text === last.text || previous.wild || last.wild)) return 'adjacent overlapping repetitions';
                frame.big = true;
                tail = { text: last.text, wild: last.wild };
            } else {
                tail = null;
            }
            if (min > max) return 'does not compile';
        } else if (c === '.') {
            addAtom(c, null, true);
            i += 1;
        } else {
            addAtom(c, c, false);
            i += 1;
        }
    }
    if (stack.length) return 'does not compile';
    return optional > 10 ? 'too many optional elements' : null;
}

const contentRegexSafety = new Map();

/**
 * Cheap best-effort pre-filter: whether a content regex passes the static lint (see contentRegexLintReason);
 * memoized per source. Passing does NOT mean the pattern is fast: the time guarantee is the vm timeout.
 */
function isSafeContentRegex(source) {
    if (typeof source !== 'string') return false;
    if (!contentRegexSafety.has(source)) contentRegexSafety.set(source, contentRegexLintReason(source) === null);
    return contentRegexSafety.get(source);
}

/**
 * The framework's UI/UX gate class: any file that renders a user-facing surface receives a compact
 * digest of the three binding rule sets and their docs before it is edited. Setup detection
 * (convention-merge.cjs) proposes it for a project that records front-end evidence; a project with
 * NO project config gets it as the built-in fallback (builtinFallbackConfig, BR-PFCI-01).
 *
 * Membership by file name, deliberately excluding extensions shared with non-UI code:
 *   IN  markup/templates  html htm xhtml · razor cshtml · hbs handlebars ejs pug twig liquid njk
 *       styles            css scss sass less styl pcss
 *       component files   jsx tsx vue svelte astro · Angular `*.component.ts` (templates/styles via html/scss)
 *       native UI markup  xaml axml storyboard xib · Android layout XML under `res/layout*`
 *   OUT mdx (mostly documentation prose) · ts/js (mostly logic) · swift/kt/dart (SwiftUI, Compose and
 *       Flutter share their extension with all non-UI code; a path matcher cannot tell them apart).
 * A project widens or narrows this by editing the class (or its own class) in contextGroups.
 */
const GENERAL_EXCLUDES = Object.freeze(['**/node_modules/**', '**/dist/**', '**/build/**', '**/vendor/**', 'tmp/**', 'temp/**']);
const UI_UX_GATE = Object.freeze({
    name: 'ui-ux-gate',
    priority: 100,
    pathRegexes: Object.freeze(['/res/layout[^/]*/[^/]+\\.xml$']),
    fileNameRegexes: Object.freeze([
        '\\.(?:html?|xhtml|razor|cshtml|hbs|handlebars|ejs|pug|twig|liquid|njk|css|scss|sass|less|styl|pcss|jsx|tsx|vue|svelte|astro|xaml|axml|storyboard|xib)$',
        '\\.component\\.ts$'
    ]),
    excludePathGlobs: GENERAL_EXCLUDES,
    // Explicitly both, so setup detection does not give it the edit-only default for doc-bearing
    // classes: the Read delivery is what puts the gate in context BEFORE the first edit of an existing
    // file (delivery is PostToolUse-only). `both` is the default content version, so the fallback and
    // the detected gate still share one version.
    on: TRIGGER_BOTH,
    referenceDocs: Object.freeze(['.claude/docs/ux-journey-process.md', '.claude/docs/design-review-checklist.md', '.claude/docs/design-knowledge.md', '.claude/docs/design-review-calibration.md']),
    rules: Object.freeze([
        'UI/UX gate: have UX-*, UI-*, DD-* and CL-* in context BEFORE editing this surface; read the docs above unless already loaded',
        'UX-1–UX-11 journey-first (ux-journey-process.md, SYNC:ux-journey-gate): report the main user journeys (actors, jobs, ranked journeys, derived requirements) before designing, walk them on the result, close with the UI/UX Gate Report',
        'UI-1.1–UI-9.4 usability/a11y floor (pass/fail): SYNC:ui-ux-design-principles in .claude/skills/shared/sync-inline-versions.md',
        'DD-1–DD-8 identity (design-knowledge.md): name subject/audience/job, write the Design Plan, pass the generic test',
        'CL-1–CL-6 (checklist): §0.5 surface scope, B12–B15 load, E9–E11 container fit, §R forms, I15 dialog focus, K10 dead controls',
        'Calibrate severity with design-review-calibration.md; brief > project design system/ADRs > these rules; no visual change = say skip'
    ]),
    reinjectAfterTokens: 150000,
    evidenceDocs: Object.freeze(['.claude/docs/ux-journey-process.md', '.claude/docs/design-review-checklist.md', '.claude/docs/design-knowledge.md']),
    // Only skills that carry the WHOLE gate (UX + UI + DD + CL) may stand in for the digest: a skill
    // that lacks the journey-first rule would suppress it for the window.
    evidenceSkills: Object.freeze(['ui-design', 'design-spec'])
});

/**
 * AI SDK packages, one owner. The `ai-feature-gate` content signals are built from these lists, and
 * setup detection (convention-merge.cjs) matches the same names against dependency manifests, so a
 * package is added in exactly one place. Import/module spelling: a manifest spelling differs only in
 * `-` / `_` / `.` separators, which manifest matching folds together.
 */
const AI_SDK = Object.freeze({
    // Import names that mean a model, embedding or vector-store client. Names shared with unrelated
    // libraries (a Django search package, an e-learning "instructor" module) are left out: a missed
    // import is cheaper than a protocol reminder on a non-AI file.
    python: Object.freeze(['anthropic', 'openai', 'cohere', 'mistralai', 'ollama', 'litellm', 'langgraph', 'crewai', 'autogen',
        'dspy', 'transformers', 'sentence_transformers', 'vertexai', 'google.generativeai', 'google.genai',
        'pinecone', 'weaviate', 'qdrant_client', 'chromadb', 'pymilvus', 'lancedb', 'faiss', 'pgvector']),
    pythonPrefixes: Object.freeze(['langchain', 'llama_index']),
    js: Object.freeze(['openai', 'ai', '@google/generative-ai', '@google/genai', 'langchain', 'llamaindex', '@mistralai/mistralai',
        'cohere-ai', 'ollama', '@modelcontextprotocol/sdk', '@huggingface/inference', '@xenova/transformers',
        'chromadb', 'pgvector', 'weaviate-client', 'faiss-node', 'vectordb']),
    jsScopes: Object.freeze(['@anthropic-ai/', '@ai-sdk/', '@langchain/', '@pinecone-database/', '@qdrant/', '@zilliz/', '@lancedb/']),
    other: Object.freeze(['com.anthropic', 'com.openai', 'dev.langchain4j', 'org.springframework.ai', 'github.com/anthropics/anthropic-sdk-go',
        'github.com/sashabaranov/go-openai', 'github.com/openai/openai-go', 'github.com/tmc/langchaingo', 'azure.ai.openai',
        'microsoft.semantickernel', 'microsoft.extensions.ai', 'anthropic.sdk']),
    // Package names whose manifest spelling has no import-name twin above.
    manifestOnly: Object.freeze(['google-cloud-aiplatform', 'pyautogen', 'haystack-ai', 'farm-haystack', 'dspy-ai', 'spring-ai'])
});

const escapeRegex = text => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const alternation = names => names.map(escapeRegex).join('|');

// Known model-id literals: the value half of the AI-feature gate's `model: '<id>'` content signal.
const MODEL_ID_LITERAL = '(?:(?:(?:us|eu|apac|global)\\.)?(?:anthropic\\.)?claude-(?:[0-9]|instant|haiku|sonnet|opus|fast)|gpt-(?:[0-9]|oss)|gemini-[0-9]|o[134]-(?:mini|pro|preview)|mistral-(?:large|medium|small|tiny|embed|nemo|saba)|codestral-|(?:meta-)?llama-?[0-9]|meta-llama/|text-embedding-(?:3-|ada-)|command-r)';

/**
 * The AI-feature gate class: a file that calls a model SDK, holds prompts, retrieval, agents, tools or
 * evals receives the AI-engineering protocol before it is edited. Membership is by AI-surface path
 * segment or file name, OR by content signals in code files (SDK import, provider API call, provider
 * host, a `model` argument naming a model id, MCP server class), so a file whose path says nothing
 * about AI still counts. Signals are kept precise — a missed file is cheaper than a reminder on
 * unrelated code, and the class costs nothing on a file with no AI surface. Bare tokens that also occur
 * in non-AI code (`tool_use`, `tool_calls`, `system_prompt`, a vendor or model name in a comment or
 * string, a directory named `agents`) are NOT signals. The framework's own agent folders and prose are
 * excluded — they hold prompts for the coding assistant, not product AI features. The delivered digest
 * names ONE doc to read, the protocol file; the deep docs are read by section on demand. Setup detection
 * proposes it for a project whose dependency manifests show an AI SDK; a project with NO project config
 * gets it in the built-in fallback.
 */
const AI_FEATURE_GATE = Object.freeze({
    name: 'ai-feature-gate',
    priority: 100,
    // A directory name is a signal for text files only: media, archives, model weights, fonts, locks, source maps and
    // minified bundles under `prompts/` or `rag/` are not AI surfaces.
    pathRegexes: Object.freeze(['/(?:prompts?|llm|rag|embeddings?|guardrails?|mcp)/(?!.*\\.(?:png|jpe?g|gif|svg|pdf|zip|bin|mp[34]|lock|map|min\\.js)$)']),
    fileNameRegexes: Object.freeze(['\\.prompts?\\.[^.]+$|\\.prompty$|^system[-_.]prompt|^prompt[-_.]template']),
    contentExtensions: Object.freeze(['.py', '.ipynb', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.java', '.kt', '.kts', '.cs', '.go',
        '.rb', '.php', '.rs', '.swift', '.scala', '.dart', '.ex', '.exs']),
    contentLabel: 'AI SDK use',
    contentRegexes: Object.freeze([
        // Python imports (line-anchored: no multiline flag is used). A notebook stores each source line as a JSON
        // string, so a line also starts after a double quote or after an escaped newline (backslash + n).
        `(?:^|\\n|\\\\n|")[ \\t]*(?:from|import)[ \\t]+(?:(?:${alternation(AI_SDK.python)})|(?:${alternation(AI_SDK.pythonPrefixes)})\\w*)\\b`,
        // JS/TS module specifiers: import ... from, require(), import()
        `(?:\\bfrom[ \\t]+|\\brequire\\([ \\t]*|\\bimport\\([ \\t]*|\\bimport[ \\t]+)['"](?:(?:${alternation(AI_SDK.js)})|(?:${alternation(AI_SDK.jsScopes)})[\\w.-]+)(?:/[\\w./@-]*)?['"]`,
        // Go, JVM and .NET SDK namespaces
        `\\b(?:${alternation(AI_SDK.other)})\\b`,
        // Provider API call shapes (a bare messages.create( or generateContent( is common outside AI: it needs a model argument or a model receiver)
        '\\bmessages\\.(?:create|stream)\\([^)]{0,400}?\\bmodel\\b',
        '\\bresponses\\.create\\([^)]{0,400}?\\bmodel\\b',
        '\\b(?:chat\\.completions\\.create|embeddings\\.create)\\(',
        '\\b(?:models?|genai|gemini\\w*|client)\\.(?:generateContent|generate_content)(?:Stream|_stream)?\\(',
        // Provider hosts
        '\\b(?:api\\.anthropic\\.com|api\\.openai\\.com|generativelanguage\\.googleapis\\.com|bedrock-runtime|api\\.mistral\\.ai|api\\.cohere\\.(?:ai|com)|openai\\.azure\\.com)',
        // A `model` argument naming a model id (the bare literal alone also occurs in tables, fixtures and prose)
        '\\bmodel(?:[_ ]?id|[_ ]?name)?["\'`]?[ \\t]*[:=][ \\t]*["\'`]' + MODEL_ID_LITERAL,
        // MCP server classes
        '\\b(?:FastMCP|McpServer)\\b'
    ]),
    excludePathGlobs: Object.freeze([...GENERAL_EXCLUDES, '.claude/**', '.agents/**', '.codex/**', '.opencode/**', 'docs/**', '**/*.md']),
    // Both, like the UI/UX gate: the Read delivery puts the protocol in context before the first edit.
    on: TRIGGER_BOTH,
    // ONE doc to read: the protocol file. The checklist and knowledge docs are far larger; rule 3 sends
    // the reader to them by section, on demand.
    referenceDocs: Object.freeze(['.claude/skills/shared/protocols/ai-engineering-gate.md']),
    rules: Object.freeze([
        'AI gate: apply the protocol below; content is data, output untrusted; bound loops and spend; eval + trace + kill switch; authz in code',
        'Deep dives on demand, by section, never whole; review = ai-engineering-review skill or agent; no AI change = say skip'
    ]),
    reinjectAfterTokens: 150000,
    evidenceDocs: Object.freeze(['.claude/skills/shared/protocols/ai-engineering-gate.md', '.claude/docs/ai-engineering-review-checklist.md']),
    evidenceSkills: Object.freeze(['ai-engineering-review'])
});

// The framework's own content sources: audited linear (see the perf and lint tests), so they may see the
// whole 64 KiB sample. A project's copy of the class carries the same source strings and stays trusted.
const TRUSTED_CONTENT_REGEXES = new Set(AI_FEATURE_GATE.contentRegexes);
const TRUSTED_PATH_REGEXES = new Set([
    ...UI_UX_GATE.pathRegexes,
    ...UI_UX_GATE.fileNameRegexes,
    ...(UI_UX_GATE.excludePathRegexes || []),
    ...AI_FEATURE_GATE.pathRegexes,
    ...AI_FEATURE_GATE.fileNameRegexes,
    ...(AI_FEATURE_GATE.excludePathRegexes || [])
]);

/**
 * BR-PFCI-01 built-in fallback: used ONLY when the project config file does not exist. Delivery is
 * on with the UI/UX gate and the AI-feature gate as the classes, so a framework install without
 * setup still gets the design rules on front-end files and the AI-engineering protocol on
 * model-calling code. A config that exists — even without `conventionInjection`, or malformed — is
 * the maintainer's decision and is never replaced by this fallback.
 */
function builtinFallbackConfig() {
    return { conventionInjection: { enabled: true }, contextGroups: [UI_UX_GATE, AI_FEATURE_GATE] };
}

/** Config the hook and lookup act on: the loaded config, or the built-in fallback when the file is missing. */
function effectiveConfig(status) {
    if (isPlainObject(status) && status.state === 'missing') return builtinFallbackConfig();
    return isPlainObject(status) && isPlainObject(status.config) ? status.config : {};
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonBlankString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function stringList(value) {
    return Array.isArray(value) ? value.filter(nonBlankString).map(v => v.trim()) : [];
}

function unique(list) {
    return Array.from(new Set(list));
}

/** Settings with defaults; out-of-range or wrong-typed values fall back to defaults. */
function resolveSettings(config) {
    const raw = isPlainObject(config) && isPlainObject(config.conventionInjection) ? config.conventionInjection : {};
    const settings = { ...DEFAULTS, compactionMarkers: [] };
    settings.enabled = raw.enabled === true;
    for (const [field, [min, max]] of Object.entries(RANGES)) {
        const value = raw[field];
        if (typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max) {
            settings[field] = value;
        }
    }
    if (typeof raw.onRead === 'boolean') settings.onRead = raw.onRead;
    settings.completeLookup = raw.completeLookup === true;
    settings.compactionMarkers = stringList(raw.compactionMarkers);
    return settings;
}

/** BR-PFCI-01: explicit opt-in only. */
function isEnabled(config) {
    return isPlainObject(config) && isPlainObject(config.conventionInjection) && config.conventionInjection.enabled === true;
}

const regexCache = new Map();

/** Compile a config regex (case-insensitive); invalid → null (skipped at runtime, reported by the validator). */
function safeRegExp(source) {
    if (typeof source !== 'string') return null;
    if (regexCache.has(source)) return regexCache.get(source);
    let compiled = null;
    try {
        compiled = new RegExp(source, 'i');
    } catch {
        compiled = null;
    }
    regexCache.set(source, compiled);
    return compiled;
}

/**
 * Glob dialect: `**` any segments, `*` within a segment, `?` one char; anchored, case-insensitive.
 * Repeated `**` segments mean the same as one and are collapsed, so a pathological pattern
 * cannot nest optional groups (matching cost stays linear in the path).
 */
function globToRegExp(glob) {
    if (typeof glob !== 'string') return null;
    const cacheKey = `glob:${glob}`;
    if (regexCache.has(cacheKey)) return regexCache.get(cacheKey);
    const normalized = glob.replace(/\\/g, '/').replace(/^\.\//, '').replace(/(?:\*\*\/)+/g, '**/');
    let out = '';
    for (let i = 0; i < normalized.length; i++) {
        const ch = normalized[i];
        if (ch === '*') {
            if (normalized[i + 1] === '*') {
                const followedBySlash = normalized[i + 2] === '/';
                out += followedBySlash ? '(?:.*/)?' : '.*';
                i += followedBySlash ? 2 : 1;
            } else {
                out += '[^/]*';
            }
        } else if (ch === '?') {
            out += '[^/]';
        } else {
            out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        }
    }
    let compiled = null;
    try {
        compiled = new RegExp(`^${out}$`, 'i');
    } catch {
        compiled = null;
    }
    regexCache.set(cacheKey, compiled);
    return compiled;
}

function insideRelative(root, absolute) {
    const relative = path.relative(root, absolute);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
    return relative.split(path.sep).join('/');
}

/**
 * Repo-relative forward-slash path, or null when blank, over the length cap,
 * or outside the project root (segment-aware: a sibling folder sharing the
 * root's name prefix is outside).
 *
 * Containment is decided by identity, not spelling: the root may arrive lexical
 * (CLAUDE_PROJECT_DIR) while cwd is symlink-resolved (macOS /var -> /private/var).
 * The lexical answer wins whenever it is in-project, so an in-project symlink keeps
 * its classification; only a lexically-outside target is re-checked through the
 * physical projection of both operands. An unresolvable projection stays outside.
 */
function toRepoRelative(filePath, projectDir, cwd) {
    if (!nonBlankString(filePath) || filePath.length > PATH_CAP || !nonBlankString(projectDir)) return null;
    const base = nonBlankString(cwd) ? cwd : projectDir;
    const absolute = path.resolve(base, filePath);
    const lexical = insideRelative(path.resolve(projectDir), absolute);
    if (lexical) return lexical;
    try {
        // Lazy: this module is copied standalone into consumer projects (section-builders mirror),
        // so a load-time sibling require would make the whole lib unloadable there.
        const { resolvePhysicalProjection } = require('./project-reference-registry.cjs');
        return insideRelative(resolvePhysicalProjection(projectDir), resolvePhysicalProjection(absolute));
    } catch {
        return null;
    }
}

function defaultIsDirectory(absolutePath) {
    try {
        return fs.statSync(absolutePath).isDirectory();
    } catch {
        return false; // stat failure ⇒ treat as a file (plan P2, L6)
    }
}

const PATCH_TARGET = /^\*\*\* (Add File|Update File|Move to): (.+)$/;

/**
 * Relevant target files of a trigger (BR-PFCI-14).
 * - Claude: Read/Edit/Write/MultiEdit `tool_input.file_path`, NotebookEdit `tool_input.notebook_path`.
 * - Codex: `apply_patch` `tool_input.command` Add/Update/Move-to lines (grammar INFERRED); Delete ignored;
 *   a moved file counts only at its destination.
 * - A `tool_response` object whose `success` is boolean false is ignored (defensive, UNVERIFIED shape;
 *   Claude routes failures to PostToolUseFailure, which this hook does not register).
 * @returns {string[]} unique repo-relative paths
 */
function extractTargets(input, projectDir, opts = {}) {
    if (!isPlainObject(input)) return [];
    if (isPlainObject(input.tool_response) && input.tool_response.success === false) return [];
    const toolInput = isPlainObject(input.tool_input) ? input.tool_input : {};
    const isDirectory = typeof opts.isDirectory === 'function' ? opts.isDirectory : defaultIsDirectory;
    const raw = [];
    switch (input.tool_name) {
        case 'Read':
        case 'Edit':
        case 'Write':
        case 'MultiEdit':
            raw.push(toolInput.file_path);
            break;
        case 'NotebookEdit':
            raw.push(toolInput.notebook_path);
            break;
        case 'apply_patch': {
            const patch = typeof toolInput.command === 'string' ? toolInput.command
                : typeof toolInput.patch === 'string' ? toolInput.patch : '';
            // A move's source no longer exists afterwards (like a removal): `Move to` replaces the
            // path of the `Update File` header it belongs to, so only the destination counts.
            let updateIndex = -1;
            for (const line of patch.split(/\r?\n/)) {
                const trimmed = line.trim();
                const match = PATCH_TARGET.exec(trimmed);
                if (!match) {
                    if (trimmed.startsWith('*** ')) updateIndex = -1;
                    continue;
                }
                const [, kind, rawTarget] = match;
                const target = rawTarget.trim();
                if (kind === 'Move to' && updateIndex >= 0) {
                    raw[updateIndex] = target;
                    updateIndex = -1;
                } else {
                    updateIndex = kind === 'Update File' ? raw.length : -1;
                    raw.push(target);
                }
            }
            break;
        }
        default:
            return [];
    }
    const cwd = nonBlankString(input.cwd) ? input.cwd : projectDir;
    const targets = [];
    for (const candidate of raw) {
        const rel = toRepoRelative(candidate, projectDir, cwd);
        if (!rel) continue;
        if (isDirectory(path.join(projectDir, rel))) continue;
        targets.push(rel);
    }
    return unique(targets);
}

function normalizedExtensions(group) {
    return stringList(group.fileExtensions).map(ext => (ext.startsWith('.') ? ext : `.${ext}`).toLowerCase());
}

function normalizeExtensionList(list) {
    return stringList(list).map(ext => (ext.startsWith('.') ? ext : `.${ext}`).toLowerCase());
}

/** The short human label a static table shows for a class's content signals ('' when unset or over the cap). */
function contentLabelOf(group) {
    const label = isPlainObject(group) && nonBlankString(group.contentLabel) ? group.contentLabel.trim() : '';
    return label.length <= CONTENT_LIMITS.maxLabelLength ? label : '';
}

/**
 * Extensions whose files a class content-scans (`contentExtensions`). A list over the cap is truncated to
 * it, not ignored whole: the work per file stays bounded, and the validator rejects such a config anyway.
 */
function normalizedContentExtensions(group) {
    return normalizeExtensionList(group.contentExtensions).slice(0, CONTENT_LIMITS.maxExtensions);
}

/**
 * Content-signal regex sources a class declares that may run: within the length cap and passing the
 * `isSafeContentRegex` pre-filter. A source the lint rejects is IGNORED (a config that bypassed the
 * validator never runs a well-known slow shape); a list over the count cap is truncated to it (bounded
 * work; the validator rejects such a config anyway). Running time is bounded by `contentSignalOf`, not here.
 */
function contentRegexSources(group) {
    return stringList(group.contentRegexes)
        .filter(source => source.length <= CONTENT_LIMITS.maxRegexLength && isSafeContentRegex(source))
        .slice(0, CONTENT_LIMITS.maxRegexes);
}

/**
 * First bytes of a project file as text, or null. Bounded and fail-open: a missing, unreadable,
 * non-regular, oversized (over CONTENT_LIMITS.maxFileBytes) or binary (NUL in the sample) file yields
 * null and never throws. Reads at most `maxBytes` (default CONTENT_LIMITS.maxBytes).
 */
function readBoundedContent(absolutePath, maxBytes = CONTENT_LIMITS.maxBytes) {
    let fd = null;
    try {
        const stat = fs.statSync(absolutePath);
        if (!stat.isFile() || stat.size > CONTENT_LIMITS.maxFileBytes) return null;
        const length = Math.min(stat.size, maxBytes);
        if (length === 0) return null;
        const buffer = Buffer.alloc(length);
        fd = fs.openSync(absolutePath, 'r');
        const read = fs.readSync(fd, buffer, 0, length, 0);
        const sample = buffer.subarray(0, read);
        return sample.includes(0) ? null : sample.toString('utf8');
    } catch {
        return null;
    } finally {
        if (fd !== null) {
            try {
                fs.closeSync(fd);
            } catch {
                /* nothing left to release */
            }
        }
    }
}

/**
 * Reader for `ctx.readContent(rel)`: the bounded on-disk content of a repo-relative path inside
 * `projectDir` (PostToolUse runs after the edit, so disk holds the file as changed). Memoized per
 * reader, so a path is read once however many classes ask. A path outside the project yields null, by
 * identity and not by spelling: a symlink or junction that resolves outside the project root is not read
 * (any resolution error is no content). `deps.realpath` replaces `fs.realpathSync` (test seam).
 */
function createContentReader(projectDir, deps = {}) {
    const realpath = typeof deps.realpath === 'function' ? deps.realpath : fs.realpathSync;
    const cache = new Map();
    let physicalRoot;
    const insideProject = absolute => {
        try {
            if (physicalRoot === undefined) physicalRoot = realpath(path.resolve(projectDir));
            return insideRelative(physicalRoot, realpath(absolute)) !== null;
        } catch {
            return false;
        }
    };
    return rel => {
        if (!nonBlankString(projectDir) || !nonBlankString(rel)) return null;
        if (cache.has(rel)) return cache.get(rel);
        const segments = rel.split('/');
        const absolute = path.join(projectDir, ...segments);
        const text = segments.some(segment => segment === '..') || !insideProject(absolute) ? null : readBoundedContent(absolute);
        cache.set(rel, text);
        return text;
    };
}

const contentGuard = {
    directRuns: 0,
    vmRuns: 0,
    timeouts: 0,
    skipped: 0,
    pathDirectRuns: 0,
    pathVmRuns: 0,
    pathTimeouts: 0,
    pathSkipped: 0
};
const timedOutSources = new Set();
const timedOutPathSources = new Set();
let isContentGuardSaturated = false;
let isPathGuardSaturated = false;
let guardScript = null;
let guardContext = null;

/** Counters of the content-regex guard (test seam): built-in runs, vm runs, timeouts, skipped sources. */
function contentGuardStats() {
    return {
        ...contentGuard,
        timedOutSources: timedOutSources.size,
        timedOutPathSources: timedOutPathSources.size,
        isContentGuardSaturated,
        isPathGuardSaturated
    };
}

/** Forget every timed-out source and zero the counters (test seam; a fresh process starts clean anyway). */
function resetContentGuard() {
    timedOutSources.clear();
    timedOutPathSources.clear();
    isContentGuardSaturated = false;
    isPathGuardSaturated = false;
    for (const key of Object.keys(contentGuard)) contentGuard[key] = 0;
}

/** Execute a path/name/exclusion regex with one shared per-file/class budget (`deps` is a test seam). */
function guardedPathRegexTest(source, subject, budget, deps = {}) {
    const re = safeRegExp(source);
    if (!re) return { matched: false, incomplete: false };
    if (TRUSTED_PATH_REGEXES.has(source)) {
        contentGuard.pathDirectRuns += 1;
        return { matched: re.test(subject), incomplete: false };
    }
    if (isPathGuardSaturated || timedOutPathSources.has(source) || budget.remainingMs <= 0) {
        contentGuard.pathSkipped += 1;
        return { matched: false, incomplete: true };
    }
    const execute = typeof deps.execute === 'function' ? deps.execute : execWithTimeout;
    const now = typeof deps.now === 'function' ? deps.now : Date.now;
    const allowed = budget.remainingMs;
    const started = now();
    contentGuard.pathVmRuns += 1;
    try {
        return { matched: execute(re, subject, allowed) !== null, incomplete: false };
    } catch (err) {
        if (err && err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
            contentGuard.pathTimeouts += 1;
            if (timedOutPathSources.size >= MAX_TIMED_OUT_SOURCES) isPathGuardSaturated = true;
            else timedOutPathSources.add(source);
        }
        return { matched: false, incomplete: true };
    } finally {
        budget.remainingMs -= Math.max(0, now() - started);
    }
}

/** End offset (exclusive) of one JSON string token, or -1 when the bounded prefix cuts it off. */
function jsonStringEnd(text, start) {
    if (text[start] !== '"') return -1;
    for (let i = start + 1; i < text.length; i++) {
        if (text[i] === '\\') i += 1;
        else if (text[i] === '"') return i + 1;
    }
    return -1;
}

/** Find a root-object array property without mistaking the same text inside a JSON string for a key. */
function rootJsonArrayStart(text, property) {
    let objectDepth = 0;
    let arrayDepth = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            const end = jsonStringEnd(text, i);
            if (end < 0) return -1;
            if (objectDepth === 1 && arrayDepth === 0) {
                let key = null;
                try { key = JSON.parse(text.slice(i, end)); } catch { /* malformed prefix */ }
                let cursor = end;
                while (/\s/.test(text[cursor] || '')) cursor += 1;
                if (key === property && text[cursor] === ':') {
                    cursor += 1;
                    while (/\s/.test(text[cursor] || '')) cursor += 1;
                    if (text[cursor] === '[') return cursor;
                }
            }
            i = end - 1;
        } else if (char === '{') objectDepth += 1;
        else if (char === '}') objectDepth = Math.max(0, objectDepth - 1);
        else if (char === '[') arrayDepth += 1;
        else if (char === ']') arrayDepth = Math.max(0, arrayDepth - 1);
    }
    return -1;
}

/**
 * Code-cell source from every complete notebook cell contained in the bounded prefix. The whole notebook
 * need not be valid/complete JSON: a truncated final cell is ignored, preserving the 64 KiB read ceiling.
 */
function notebookCodeSample(text) {
    const cellsAt = rootJsonArrayStart(text, 'cells');
    if (cellsAt < 0) return '';
    const code = [];
    let cellStart = -1;
    let objectDepth = 0;
    for (let i = cellsAt + 1; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            const end = jsonStringEnd(text, i);
            if (end < 0) break;
            i = end - 1;
            continue;
        }
        if (char === '{') {
            if (objectDepth === 0) cellStart = i;
            objectDepth += 1;
        } else if (char === '}' && objectDepth > 0) {
            objectDepth -= 1;
            if (objectDepth === 0 && cellStart >= 0) {
                try {
                    const cell = JSON.parse(text.slice(cellStart, i + 1));
                    if (cell && cell.cell_type === 'code') {
                        if (typeof cell.source === 'string') code.push(cell.source);
                        else if (Array.isArray(cell.source)) code.push(cell.source.filter(value => typeof value === 'string').join(''));
                    }
                } catch {
                    // One malformed cell is no signal; later complete cells may still be usable.
                }
                cellStart = -1;
            }
        } else if (char === ']' && objectDepth === 0) break;
    }
    return code.join('\n');
}

/**
 * `re.exec(text)` inside a `vm` context under a hard timeout; the matched text, or null for no match. Throws
 * `ERR_SCRIPT_EXECUTION_TIMEOUT` when the budget runs out (V8 interrupts even a backtracking regex).
 */
function execWithTimeout(re, text, timeoutMs) {
    if (guardScript === null) {
        guardScript = new vm.Script('(function () { var m = re.exec(text); return m ? m[0] : null; })()');
        guardContext = vm.createContext({ re: null, text: '' });
    }
    guardContext.re = re;
    guardContext.text = text;
    try {
        return guardScript.runInContext(guardContext, { timeout: Math.max(1, timeoutMs) });
    } finally {
        guardContext.re = null;
        guardContext.text = '';
    }
}

/**
 * Text of a content sample matched by `source`, trimmed for display; null when it does not match.
 * A framework built-in source (byte-identical to a shipped signal; trust is by source text, never by class
 * name) runs directly. Any other source is config-supplied and runs under a hard time budget: `budget`
 * (`{ remainingMs }`, shared by the sources of one file and class) is spent as the vm runs take time, a
 * timeout counts as no match, and a source that timed out with the full budget is skipped from then on in
 * this process, so a scan that walks many files stalls at most once per hostile source.
 */
function contentSignalOf(source, text, budget = { remainingMs: CONTENT_REGEX_BUDGET_MS }) {
    const re = safeRegExp(source);
    if (!re) return null;
    let matched = null;
    if (TRUSTED_CONTENT_REGEXES.has(source)) {
        contentGuard.directRuns += 1;
        const match = re.exec(text);
        matched = match ? match[0] : null;
    } else if (isContentGuardSaturated || timedOutSources.has(source) || budget.remainingMs <= 0) {
        contentGuard.skipped += 1;
    } else {
        const allowed = budget.remainingMs;
        const started = Date.now();
        contentGuard.vmRuns += 1;
        try {
            matched = execWithTimeout(re, text, allowed);
        } catch (err) {
            matched = null; // fail-open: a timeout (or any guard failure) is no content signal
            if (err && err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
                contentGuard.timeouts += 1;
                if (allowed >= CONTENT_REGEX_BUDGET_MS) {
                    if (timedOutSources.size >= MAX_TIMED_OUT_SOURCES) isContentGuardSaturated = true;
                    else timedOutSources.add(source);
                }
            }
        }
        budget.remainingMs -= Math.max(0, Date.now() - started);
    }
    return typeof matched === 'string' ? matched.replace(/\s+/g, ' ').trim().slice(0, 60) : null;
}

/**
 * Why a file is (not) a member of a class, by BR-PFCI-02: extension filter AND (any path/name include OR,
 * for a file whose extension is in `contentExtensions`, a `contentRegexes` match on bounded content) AND
 * no exclude. `ctx.readContent(rel)` supplies content; without it a class matches by path and name only.
 * Exclusions are decided first, so an excluded file is never read. `collectAll` reports every location
 * signal, but a location/name hit still decides membership without reading content (BR-PFCI-21).
 * @returns {{ member: boolean, pathSignals: string[], contentSignals: string[], incomplete: boolean }}
 */
function explainGroupMatch(group, rel, ctx, collectAll = false) {
    const result = { member: false, pathSignals: [], contentSignals: [], incomplete: false };
    if (!isPlainObject(group) || !nonBlankString(rel)) return result;
    const extensions = normalizedExtensions(group);
    const extension = path.posix.extname(rel).toLowerCase();
    if (extensions.length > 0 && !extensions.includes(extension)) return result;
    const slashPath = `/${rel}`;
    const baseName = path.posix.basename(rel);
    const pathBudget = { remainingMs: PATH_REGEX_BUDGET_MS };
    const testRegexes = (list, subject) => stringList(list).some(source => {
        const verdict = guardedPathRegexTest(source, subject, pathBudget);
        if (verdict.incomplete) result.incomplete = true;
        return verdict.matched;
    });
    const testGlobs = list => stringList(list).some(glob => {
        const re = globToRegExp(glob);
        return re ? re.test(rel) : false;
    });
    if (testRegexes(group.excludePathRegexes, slashPath) || testGlobs(group.excludePathGlobs)) return result;
    if (testRegexes(group.pathRegexes, slashPath)) result.pathSignals.push('pathRegexes');
    if ((collectAll || !result.pathSignals.length) && testGlobs(group.pathGlobs)) result.pathSignals.push('pathGlobs');
    if ((collectAll || !result.pathSignals.length) && testRegexes(group.fileNameRegexes, baseName)) result.pathSignals.push('fileNameRegexes');
    if (result.pathSignals.length) {
        result.member = true;
        return result;
    }
    const sources = contentRegexSources(group);
    const readContent = isPlainObject(ctx) && typeof ctx.readContent === 'function' ? ctx.readContent : null;
    if (sources.length && readContent && normalizedContentExtensions(group).includes(extension)) {
        let text = null;
        try {
            text = readContent(rel);
        } catch {
            text = null; // fail-open: an unreadable file has no content signal
        }
        if (typeof text === 'string' && text) {
            const budget = { remainingMs: CONTENT_REGEX_BUDGET_MS };
            for (const source of sources) {
                // Bound the on-disk prefix before notebook decoding: project patterns see 16 KiB of the
                // file, while the framework's audited sources see 64 KiB (BR-PFCI-22).
                const bound = TRUSTED_CONTENT_REGEXES.has(source) ? CONTENT_LIMITS.maxBytes : CONTENT_LIMITS.maxConfigBytes;
                const boundedText = text.length > bound ? text.slice(0, bound) : text;
                const sample = extension === '.ipynb' ? notebookCodeSample(boundedText) : boundedText;
                const signal = contentSignalOf(source, sample, budget);
                if (signal === null) continue;
                if (!result.contentSignals.includes(signal)) result.contentSignals.push(signal);
                if (!collectAll) break;
            }
        }
    }
    result.member = result.pathSignals.length > 0 || result.contentSignals.length > 0;
    return result;
}

/** BR-PFCI-02 membership: extension filter AND any include (path, name or content signal) AND no exclude. */
function groupMatches(group, rel, ctx) {
    return explainGroupMatch(group, rel, ctx).member;
}

function docsOf(group) {
    return unique([group.guideDoc, group.patternsDoc].filter(nonBlankString).map(d => d.trim())
        .concat(stringList(group.referenceDocs)));
}

/** BR-PFCI-03: deliverable only with rules, skills, reference docs, guide or patterns doc. */
function isInjectable(group) {
    if (!isPlainObject(group) || !nonBlankString(group.name)) return false;
    return stringList(group.rules).length > 0 || stringList(group.skills).length > 0 || docsOf(group).length > 0;
}

function priorityOf(group) {
    return typeof group.priority === 'number' && Number.isFinite(group.priority) ? group.priority : DEFAULT_PRIORITY;
}

/** Class byte window from `reinjectAfterTokens` (null when unset or outside the accepted range). */
function classReinjectBytes(group) {
    const tokens = group.reinjectAfterTokens;
    const [min, max] = CLASS_REINJECT_TOKENS_RANGE;
    if (typeof tokens !== 'number' || !Number.isInteger(tokens) || tokens < min || tokens > max) return null;
    return tokens * BYTES_PER_TOKEN;
}

/** Delivery settings for one class: the class's own byte window, when declared, replaces the global one. */
function classSettings(entry, settings) {
    const base = settings || resolveSettings(null);
    return entry && typeof entry.reinjectAfterBytes === 'number'
        ? { ...base, reinjectAfterBytes: entry.reinjectAfterBytes }
        : base;
}

/**
 * A class's trigger (BR-PFCI-19): `read` | `edit` | `both`; absent or unrecognized → `both`.
 * Exact match, like the config validator: a value it rejects (`"Read"`, `" edit "`) is never
 * narrowed to a trigger, so delivery uses the default (BR-PFCI-11).
 */
function classTriggerOf(group) {
    const value = isPlainObject(group) ? group.on : undefined;
    return CLASS_TRIGGERS.includes(value) ? value : TRIGGER_BOTH;
}

/** The operation a trigger tool performs: a read, or a creation/change/move (edit). */
function operationOf(trigger) {
    return trigger === TRIGGER_READ ? TRIGGER_READ : TRIGGER_EDIT;
}

/** Whether a class with trigger `on` is delivered by operation `trigger` (BR-PFCI-19 table). */
function acceptsTrigger(on, trigger) {
    const classTrigger = CLASS_TRIGGERS.includes(on) ? on : TRIGGER_BOTH;
    return classTrigger === TRIGGER_BOTH || classTrigger === operationOf(trigger);
}

/** Normalized, deliverable groups in declaration order (first occurrence of a name wins). */
function injectableEntries(config) {
    const groups = isPlainObject(config) && Array.isArray(config.contextGroups) ? config.contextGroups : [];
    const seen = new Set();
    const entries = [];
    groups.forEach((group, index) => {
        if (!isInjectable(group)) return;
        const name = group.name.trim();
        if (seen.has(name)) return;
        seen.add(name);
        entries.push({
            name,
            index,
            priority: priorityOf(group),
            on: classTriggerOf(group),
            rules: stringList(group.rules),
            skills: stringList(group.skills),
            docs: docsOf(group),
            reinjectAfterBytes: classReinjectBytes(group),
            evidenceDocs: stringList(group.evidenceDocs),
            evidenceSkills: stringList(group.evidenceSkills),
            group
        });
    });
    return entries;
}

function sortEntries(entries) {
    return entries.slice().sort((a, b) => (a.priority - b.priority) || (a.index - b.index));
}

/**
 * BR-PFCI-04: union of groups matching any target, ordered by priority asc then
 * declaration index, capped to maxClassesPerEdit (cap applies before presence).
 * BR-PFCI-19: only classes whose trigger accepts the operation are matched, before the cap.
 * `trigger` is `read` or `edit`; absent → `edit` (the lookup answers "before editing this file").
 * `ctx.readContent(rel)` (see createContentReader) lets classes with content signals match on content;
 * omitted, every class matches by path and name only.
 */
function matchGroups(config, rels, settings, trigger = TRIGGER_EDIT, ctx) {
    const resolved = settings || resolveSettings(config);
    const targets = Array.isArray(rels) ? rels : [rels];
    const matched = injectableEntries(config)
        .filter(entry => acceptsTrigger(entry.on, trigger))
        .filter(entry => targets.some(rel => groupMatches(entry.group, rel, ctx)));
    return sortEntries(matched).slice(0, resolved.maxClassesPerEdit);
}

function defaultFileExists(projectDir) {
    return relPath => {
        try {
            return fs.existsSync(path.join(projectDir || process.cwd(), relPath));
        } catch {
            return false;
        }
    };
}

function skillPath(name) {
    return `.claude/skills/${name}/SKILL.md`;
}

function skillDisplay(name, opts) {
    const exists = typeof opts.fileExists === 'function' ? opts.fileExists : defaultFileExists(opts.projectDir);
    const relPath = skillPath(name);
    return exists(relPath) ? relPath : name;
}

/**
 * Content version: stable across machines (skill names, not resolved paths). Covers the
 * deliverable items AND membership (includes, excludes, extension filter), because the static
 * instructions render both: a membership edit without regeneration must withdraw static credit.
 * The class trigger is part of the version (BR-PFCI-19) only when it narrows delivery: `both` and
 * an absent trigger deliver on the same operations, so they share one version and every
 * configuration written before triggers existed keeps its version (and its static tags).
 */
function groupHash(entry) {
    const group = isPlainObject(entry.group) ? entry.group : {};
    const on = CLASS_TRIGGERS.includes(entry.on) ? entry.on : classTriggerOf(group);
    const payload = JSON.stringify({
        v: RENDERER_VERSION,
        name: entry.name,
        priority: entry.priority,
        rules: entry.rules,
        docs: entry.docs,
        skills: entry.skills,
        pathRegexes: stringList(group.pathRegexes),
        pathGlobs: stringList(group.pathGlobs),
        fileNameRegexes: stringList(group.fileNameRegexes),
        excludePathRegexes: stringList(group.excludePathRegexes),
        excludePathGlobs: stringList(group.excludePathGlobs),
        fileExtensions: normalizedExtensions(group),
        ...(on !== TRIGGER_BOTH ? { on } : {}),
        // Content signals join the version only when a class declares them, so every class written
        // before they existed keeps its version (and its static tags).
        ...(contentRegexSources(group).length ? {
            contentRegexes: contentRegexSources(group),
            contentExtensions: normalizedContentExtensions(group),
            ...(contentLabelOf(group) ? { contentLabel: contentLabelOf(group) } : {})
        } : {})
    });
    return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 8);
}

function conventionTag(entry) {
    return `[[convention:${entry.name}@${groupHash(entry)}]]`;
}

/**
 * One class section. form 'full' | 'references'. `seenRules` (Set) suppresses a
 * rule already shown under an earlier class in the same digest (BR-PFCI-09).
 */
function renderGroupSection(entry, form, opts = {}, seenRules) {
    const lines = [`${conventionTag(entry)} ${entry.name} (priority ${entry.priority})`];
    if (form === 'full') {
        for (const rule of entry.rules) {
            if (seenRules && seenRules.has(rule)) continue;
            if (seenRules) seenRules.add(rule);
            lines.push(`- ${rule}`);
        }
    }
    for (const doc of entry.docs) lines.push(`- read: ${doc}`);
    for (const skill of entry.skills) lines.push(`- skill: ${skillDisplay(skill, opts)}`);
    return lines;
}

/** A path as shown in a digest: control characters (e.g. a newline in a file name) become `?`. */
function displayPath(rel) {
    return String(rel).replace(/[\u0000-\u001f\u007f]/g, '?');
}

function targetLabel(rels) {
    if (!rels.length) return '(file)';
    const first = displayPath(rels[0]);
    return rels.length > 1 ? `${first} (+${rels.length - 1} more)` : first;
}

/**
 * Opening instruction (BR-PFCI-20). An edit keeps the mandatory wording: must-read references and
 * the protocols to follow. A read is conditional — the assistant may only be looking — so it names
 * the references behind "if you will edit this file" and gives no instruction to follow a protocol.
 */
function openingInstruction(docs, skills, trigger) {
    if (operationOf(trigger) === TRIGGER_READ) {
        return docs.length ? `If you will edit this file, read first: ${docs.join(', ')}` : 'If you will edit this file, follow the conventions below';
    }
    const parts = [];
    if (docs.length) parts.push(`MUST read first: ${docs.join(', ')}`);
    if (skills.length) parts.push(`follow skill protocol: ${skills.join(', ')}`);
    return parts.length ? parts.join('; ') : 'follow the conventions below';
}

function frameLines(activeEntries, rels, opts) {
    const docs = unique(activeEntries.flatMap(e => e.docs));
    const skills = unique(activeEntries.flatMap(e => e.skills)).map(s => skillDisplay(s, opts));
    const label = targetLabel(rels);
    const opening = `[conventions] ${label} — ${openingInstruction(docs, skills, opts.trigger)}`;
    const reread = docs.length ? ` Re-read before editing: ${docs.join(', ')}.` : '';
    // State the delivery boundary explicitly. This digest is produced by a
    // PostToolUse hook matched on the file TOOLS (Read/Edit/Write/MultiEdit/
    // NotebookEdit, plus Codex `apply_patch`). A file opened or rewritten through
    // the shell — `cat`, `sed -n`, a heredoc — is not one of those events, so no
    // digest is produced and nothing records the omission: the agent simply never
    // learns the conventions exist. That is invisible from inside the session
    // unless the boundary is named, and some hosts actively steer toward shell
    // file access, so name it every time rather than let silence imply coverage.
    const closing = `[conventions] Earlier section wins on conflict.${reread} A file read or edited via Bash gets NO digest — run the lookup for those. Lookup: ${LOOKUP_COMMAND} ${rels.length ? displayPath(rels[0]) : '<path>'}`;
    return { opening, closing };
}

function composeText(entries, forms, rels, opts) {
    const active = entries.filter(e => forms[e.name] !== 'omitted');
    if (!active.length) return '';
    const { opening, closing } = frameLines(active, rels, opts);
    const seenRules = new Set();
    const lines = [opening];
    for (const entry of active) lines.push(...renderGroupSection(entry, forms[entry.name], opts, seenRules));
    lines.push(closing);
    return lines.join('\n');
}

/**
 * BR-PFCI-08/09 digest with deterministic reduction:
 * all full → while too long: lowest-precedence full → references, else lowest non-omitted → omitted.
 * Never re-expands; all omitted ⇒ empty text (no delivery).
 * `opts.trigger` picks the opening wording: `read` → conditional, anything else → mandatory (BR-PFCI-20).
 * @returns {{ text: string, forms: Object<string, 'full'|'references'|'omitted'> }}
 */
function buildDigest(entries, rels, settings, opts = {}) {
    const ordered = Array.isArray(entries) ? entries : [];
    const targets = Array.isArray(rels) ? rels : [rels];
    const maxChars = (settings && settings.maxChars) || DEFAULTS.maxChars;
    const forms = Object.fromEntries(ordered.map(entry => [entry.name, 'full']));
    const lowestFirst = [...ordered].reverse();
    let text = composeText(ordered, forms, targets, opts);
    while (text.length > maxChars) {
        const lowestFull = lowestFirst.find(e => forms[e.name] === 'full');
        if (lowestFull) {
            forms[lowestFull.name] = 'references';
        } else {
            const lowestActive = lowestFirst.find(e => forms[e.name] !== 'omitted');
            if (!lowestActive) break;
            forms[lowestActive.name] = 'omitted';
        }
        text = composeText(ordered, forms, targets, opts);
    }
    return { text, forms };
}

/**
 * Fresh-context digest for one path (no delivery memory) — parity with the hook's delivery on a
 * change: the lookup answers "what applies before editing this file" (BR-PFCI-19), so it matches
 * and words the digest for the edit operation.
 */
function lookup(config, filePath, opts = {}) {
    if (opts.complete === true || resolveSettings(config).completeLookup) return lookupComplete(config, filePath, opts);
    const projectDir = opts.projectDir || process.cwd();
    const rel = toRepoRelative(filePath, projectDir, opts.cwd || projectDir);
    if (!rel) return { rel: null, entries: [], text: '', forms: {} };
    const settings = resolveSettings(config);
    const ctx = { readContent: typeof opts.readContent === 'function' ? opts.readContent : createContentReader(projectDir) };
    const entries = matchGroups(config, [rel], settings, TRIGGER_EDIT, ctx);
    const { text, forms } = buildDigest(entries, [rel], settings, { ...opts, projectDir, trigger: TRIGGER_EDIT });
    return { rel, entries, text, forms };
}

/** Complete pre-action carrier: every matching read/edit class, independent of hook size/class caps. */
function lookupComplete(config, filePath, opts = {}) {
    const projectDir = opts.projectDir || process.cwd();
    const rel = toRepoRelative(filePath, projectDir, opts.cwd || projectDir);
    if (!rel) return { rel: null, entries: [], text: '', forms: {}, pages: [] };
    const ctx = { readContent: typeof opts.readContent === 'function' ? opts.readContent : createContentReader(projectDir) };
    const entries = sortEntries(injectableEntries(config).filter(entry => groupMatches(entry.group, rel, ctx)));
    const forms = Object.fromEntries(entries.map(entry => [entry.name, 'full']));
    const body = composeText(entries, forms, [rel], { ...opts, projectDir, trigger: TRIGGER_EDIT });
    const chunks = [];
    // Leave room for the page header and continuation instruction. Splits preserve every character,
    // including a single long rule; never split a UTF-16 surrogate pair across tool results.
    for (let offset = 0; offset < body.length;) {
        let end = Math.min(offset + 9000, body.length);
        const newline = body.lastIndexOf('\n', end - 1);
        if (end < body.length && newline > offset) end = newline + 1;
        if (end < body.length && /[\uD800-\uDBFF]/.test(body[end - 1])) end--;
        chunks.push(body.slice(offset, end));
        offset = end;
    }
    const pages = chunks.map((chunk, i) => [
        `[conventions] Complete lookup page ${i + 1}/${chunks.length}. Read ALL pages before reading, editing or testing the target.`,
        chunk,
        i + 1 < chunks.length ? `[conventions] REQUIRED: repeat this lookup with --page ${i + 2} before acting.` : '[conventions] Complete lookup finished.'
    ].join('\n'));
    return { rel, entries, forms, pages, text: pages[0] || '' };
}

module.exports = {
    RENDERER_VERSION,
    DEFAULTS,
    RANGES,
    BYTES_PER_TOKEN,
    CLASS_REINJECT_TOKENS_RANGE,
    CONTENT_LIMITS,
    PATH_CAP,
    LOOKUP_COMMAND,
    COMPLETE_LOOKUP_VERSION,
    LOOKUP_PAGE_CHARS,
    TRIGGER_READ,
    TRIGGER_EDIT,
    TRIGGER_BOTH,
    CLASS_TRIGGERS,
    UI_UX_GATE,
    AI_SDK,
    AI_FEATURE_GATE,
    builtinFallbackConfig,
    effectiveConfig,
    resolveSettings,
    isEnabled,
    extractTargets,
    toRepoRelative,
    globToRegExp,
    normalizedExtensions,
    normalizedContentExtensions,
    contentRegexSources,
    contentSignalOf,
    contentGuardStats,
    resetContentGuard,
    CONTENT_REGEX_BUDGET_MS,
    PATH_REGEX_BUDGET_MS,
    MAX_TIMED_OUT_SOURCES,
    guardedPathRegexTest,
    contentRegexLintReason,
    isSafeContentRegex,
    contentLabelOf,
    readBoundedContent,
    createContentReader,
    explainGroupMatch,
    groupMatches,
    isInjectable,
    injectableEntries,
    classTriggerOf,
    acceptsTrigger,
    classReinjectBytes,
    classSettings,
    sortEntries,
    matchGroups,
    skillPath,
    renderGroupSection,
    groupHash,
    conventionTag,
    buildDigest,
    lookup,
    lookupComplete
};

function runCli(argv) {
    const index = argv.indexOf('--lookup');
    if (index < 0 || !argv[index + 1]) {
        process.stdout.write('Usage: node .claude/hooks/lib/file-conventions.cjs --lookup <path> [--complete] [--page N] [--json]\n');
        return 2;
    }
    const { resolveProjectRoot } = require('./project-root.cjs');
    const { getProjectConfigStatus } = require('./project-config-loader.cjs');
    const projectDir = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env }).rootDir;
    // Same config the hook acts on (BR-PFCI-13 parity), including the no-config fallback.
    const status = getProjectConfigStatus();
    const complete = argv.includes('--complete') || argv.includes('--page') || status.config?.conventionInjection?.completeLookup === true;
    if (complete && status.state === 'invalid') {
        process.stderr.write(`Complete lookup requires valid config: ${status.errors.join('; ')}\n`);
        return 1;
    }
    const config = effectiveConfig(status);
    const pageIndex = argv.indexOf('--page');
    const page = pageIndex < 0 ? 1 : Number(argv[pageIndex + 1]);
    if (!Number.isSafeInteger(page) || page < 1) { process.stderr.write('Invalid --page; use a positive integer.\n'); return 2; }
    const result = lookup(config, argv[index + 1], { projectDir, cwd: process.cwd(), complete });
    if (complete && !result.rel) { process.stderr.write('Complete lookup rejected this path; use a supported path within the project before acting.\n'); return 1; }
    const totalPages = result.pages?.length || 1;
    if (page > totalPages) { process.stderr.write(`Page ${page} does not exist; lookup has ${totalPages} page(s).\n`); return 2; }
    const text = result.pages ? (result.pages[page - 1] || '') : result.text;
    // The lookup shows what a file WOULD receive; whether the hook delivers it is separate.
    const settings = resolveSettings(config);
    if (argv.includes('--json')) {
        process.stdout.write(JSON.stringify({
            rel: result.rel,
            enabled: settings.enabled,
            onRead: settings.onRead,
            page, totalPages,
            classes: result.entries.map(e => ({ name: e.name, priority: e.priority, tag: conventionTag(e), form: result.forms[e.name] })),
            text
        }, null, 2) + '\n');
    } else {
        process.stdout.write((text || `[conventions] No convention classes match ${result.rel || argv[index + 1]}`) + '\n');
        if (!settings.enabled) {
            process.stderr.write('[conventions] note: automatic delivery is off (conventionInjection.enabled is not true); static instructions still apply.\n');
        }
    }
    return 0;
}

// Launcher-aware entry: Codex runs hooks via `node -e … require()`, where require.main is undefined.
// hook-runner.cjs isHookEntryPoint (twin of scripts/lib/project-root.cjs isInvokedAsScript)
// canonicalizes a symlinked launch path. It is loaded only when require.main is undefined, so a
// standalone copy of this lib (mirrored skill builders) required normally never needs it beside it.
function isLauncherEntry() {
    try {
        return require('./hook-runner.cjs').isHookEntryPoint(module);
    } catch (err) {
        // Absent beside a standalone copy: this lib is being used as a library. Any other load
        // failure is a broken hook-runner and must surface, not silently skip the CLI.
        if (err && err.code === 'MODULE_NOT_FOUND' && String(err.message).includes("'./hook-runner.cjs'")) return false;
        throw err;
    }
}

if (require.main === module || (!require.main && isLauncherEntry())) {
    try {
        process.exitCode = runCli(process.argv.slice(2));
    } catch (err) {
        process.stderr.write(`file-conventions: ${err && err.message ? err.message : err}\n`);
        process.exitCode = 1;
    }
}
