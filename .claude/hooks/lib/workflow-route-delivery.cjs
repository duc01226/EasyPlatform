'use strict';

/**
 * Workflow route delivery for UserPromptSubmit: the ONLY carrier of the workflow route text.
 * No root instruction file carries routing text; the route arrives here, in the mode the
 * person chose. Resolved by `routing.resolveWorkflowRouteMode` (owner: .claude/scripts/lib/workflow-routing-config.cjs):
 *   - ask  (default): the gate and the catalog; the workflow question is asked only when the model's own route is to start a catalog workflow (direct, single-skill and custom-simple routes ask nothing).
 *   - auto: the gate and the catalog; the workflow question is still asked before a self-selected workflow starts, recommending the full workflow first.
 *   - off:  a short state notice only (no gate, no catalog): nothing starts without an explicit request.
 * Runs on every host that runs hooks: Claude (settings.json), Codex (the mirrored .codex/hooks.json
 * launcher) and the OpenCode bridge (compiled from settings.json); all three run the same two entry files.
 * Delivery is advisory plaintext, never a blocking decision. A session-scoped ledger suppresses
 * duplicates until content changes (a mode change is a content change), context is compacted, or the
 * transcript grows by about 4.5 MB (the framework's ~200k-token proxy). The host's compaction report
 * (SessionStart `compact`) delivers both outputs at once as the JSON context envelope, because a run may
 * continue with no prompt; the record absorbs the host's boundary line, so the next prompt stays silent.
 *
 * An optional project-supplied protocol (`portability.workflowRouteProtocol`, team or local,
 * local wins) is appended to the route output in its own marker block. It is part of the delivery
 * content, so a protocol edit re-arms delivery; when nothing is configured the payload is byte-identical.
 *
 * The route is TWO hook outputs, one per hook entry file, because a host cuts any single output above its
 * cap to a short preview. Each entry is a thin call to `runHook(<part>)` here:
 *   - route output (`workflow-route-inject.cjs` → `runHook('route')`): the state line, the gate body (from
 *     .claude/skills/shared/workflow-first-gate.md, filtered to the mode) and the project protocol.
 *     The gate is always written in full; its length never costs the catalog its form. This module never
 *     drops or cuts the gate or a protocol, so a long protocol can take this output past the size a host
 *     shows in full (HOST_OUTPUT_LIMIT), where the host shortens what the reader sees: the output then
 *     says so on its second line (`buildOversizeNotice`).
 *   - catalog output (`workflow-catalog-inject.cjs` → `runHook('catalog')`): the compact
 *     catalog (tier, step count, hint and barrier groups per workflow; step-skill names only while
 *     they fit). A registry too large for one output falls back to the compact rows without the
 *     step-skill names, then to an index (rows with barrier groups, then rows with tier only), then to
 *     a pointer-only form with no workflow rows. Every form keeps the barrier legend's advancement
 *     clause. The `[a ∥ b]` group tokens are kept in the compact catalog and in the index with
 *     parallel-phase marks; the tiers-only index and the pointer-only form omit them
 *     (`start-workflow <id>` loads a workflow's phases), so the wf-cycle W5 runtime-payload check
 *     applies barrier-mark parity only to the two marked forms.
 * Each output keeps its own session record, so either is delivered again without the other. A part
 * name this module does not know writes nothing: an entry that names one is silent, never a second
 * copy of the route output.
 *
 * A source file that cannot be read never silences the route: a corrupt or missing workflows.json is
 * reported in one line of the catalog output while the gate is still delivered, and an unreadable gate
 * file is reported in one line naming it (`buildUnavailableInjection`).
 *
 * Hosts without hook delivery are not supported: a host that runs no hooks, or one whose hooks are
 * disabled or untrusted, receives no route block.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HOOK_NAME = 'workflow-route-inject';
const RECORD_GROUP = 'workflow-route';
const CATALOG_HOOK_NAME = 'workflow-catalog-inject';
const CATALOG_RECORD_GROUP = 'workflow-catalog';
const PART_ROUTE = 'route';
const PART_CATALOG = 'catalog';
/** The outputs this module writes; `runHook` and `run` accept no other part name. */
const PARTS = Object.freeze([PART_ROUTE, PART_CATALOG]);
const ROUTE_START = '<!-- CK:RUNTIME-WORKFLOW-ROUTE -->';
const ROUTE_END = '<!-- /CK:RUNTIME-WORKFLOW-ROUTE -->';
const CATALOG_START = '<!-- CK:RUNTIME-WORKFLOW-CATALOG -->';
const CATALOG_END = '<!-- /CK:RUNTIME-WORKFLOW-CATALOG -->';
const PROTOCOL_START = '<!-- CK:WORKFLOW-ROUTE-PROTOCOL -->';
const PROTOCOL_END = '<!-- /CK:WORKFLOW-ROUTE-PROTOCOL -->';
const OFF_START = '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->';
const OFF_END = '<!-- /CK:RUNTIME-WORKFLOW-ROUTE-OFF -->';
const GATE_MARKER = '<!-- CK:WORKFLOW-GATE -->';
const GATE_END_MARKER = '<!-- /CK:WORKFLOW-GATE -->';
const GATE_FILE_SEGMENTS = Object.freeze(['.claude', 'skills', 'shared', 'workflow-first-gate.md']);
const GATE_BLOCK_RE = /<!-- CK:WORKFLOW-GATE -->[\s\S]*?<!-- \/CK:WORKFLOW-GATE -->/;
// Lines between `<!-- CK:GATE-MODE ask auto -->` and `<!-- /CK:GATE-MODE -->` belong to the listed modes only.
const MODE_FENCE_RE = /^[ \t]*<!-- CK:GATE-MODE ([a-z ]+) -->\r?\n([\s\S]*?)^[ \t]*<!-- \/CK:GATE-MODE -->[ \t]*(?:\r?\n|$)/gm;
const DEFAULT_MODE = 'ask';
// The concise cue names the catalog command with this slot; the route output fills it with the mode its
// state line reports (a session directive included), so the legend the command prints matches that line.
const CATALOG_MODE_SLOT = 'workflow-catalog.cjs --mode=<mode>';
// Hosts cut hook output above 10,000 characters to a short preview; stay under it with margin.
const HOST_OUTPUT_LIMIT = 10000;
const PAYLOAD_CAP = 9500;
const SETTINGS = Object.freeze({
    reinjectAfterBytes: 4500000,
    reinjectAfterMinutes: null,
    blindReinjectAfterMinutes: null,
    // Re-arm after a Codex compaction too (its record has no `compact_boundary` subtype). A getter,
    // so loading this module loads the ledger only when a record is actually read.
    get compactionMarkers() {
        return [require('./convention-ledger.cjs').CODEX_COMPACTION_MARKER];
    }
});

function nonBlank(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function isKnownPart(part) {
    return PARTS.includes(part);
}

function defaultProjectDir(input, env) {
    const { resolveProjectRoot } = require('./project-root.cjs');
    const cwd = nonBlank(input?.cwd) ? input.cwd : process.cwd();
    return resolveProjectRoot({ cwd, scriptPath: __filename, env }).rootDir;
}

function defaultWrite(text, done) {
    try {
        process.stdout.write(text, error => done(!error));
    } catch {
        done(false);
    }
}

/** The project-authored protocol as it is delivered: trimmed, '' when there is none. */
function protocolBody(text) {
    return typeof text === 'string' ? text.trim() : '';
}

/** Wrap a project-authored protocol in its own marker block; blank input means no block. */
function buildProtocolSection(text) {
    const body = protocolBody(text);
    if (!body) return '';
    return [PROTOCOL_START, body, PROTOCOL_END].join('\n');
}

/** Resolve the configured custom route protocol, failing soft to '' when unavailable. */
function resolveProtocolText(routing, projectDir) {
    try {
        if (!routing || typeof routing.resolveWorkflowRouteProtocol !== 'function') return '';
        const resolved = routing.resolveWorkflowRouteProtocol({ rootDir: projectDir });
        return resolved && typeof resolved.text === 'string' ? resolved.text : '';
    } catch {
        return '';
    }
}

/**
 * The gate text for `mode` (`ask` | `auto`): the CK:WORKFLOW-GATE block of the gate file (the whole
 * text when it carries no block) with only the lines fenced for that mode kept. Text with no fences
 * is returned whole. The result keeps the gate markers.
 */
function renderGateForMode(raw, mode) {
    const text = String(raw === undefined || raw === null ? '' : raw);
    const block = text.match(GATE_BLOCK_RE);
    const rendered = (block ? block[0] : text)
        .replace(MODE_FENCE_RE, (all, modes, body) => (modes.trim().split(/\s+/).includes(mode) ? body : ''))
        .trim();
    return rendered.replace(GATE_MARKER, '').replace(GATE_END_MARKER, '').trim() ? rendered : '';
}

/** `Route mode: <mode> (<source>)` — the state line every delivered block opens with. */
function buildStateLine(mode, source) {
    let label = source || 'default';
    let session = false;
    try {
        const routing = require('../../scripts/lib/workflow-routing-config.cjs');
        label = routing.describeRouteModeSource(source);
        session = source === routing.SOURCE_SESSION;
    } catch {
        /* the raw source name still states where the mode came from */
    }
    const note = session && mode !== 'off'
        ? ' — the first task after your directive counts as the session\'s first task for the rule below'
        : '';
    return `Route mode: ${mode} (${label}${note})`;
}

/**
 * The line a route output longer than HOST_OUTPUT_LIMIT carries right after its state line, where a
 * host's preview still shows it. Shorter outputs carry none: the line is added only where the host
 * already cuts, so it never costs an output its place under the limit. `length` is the output's size
 * without this line and `protocolLength` the delivered protocol's. It names the gate file and the
 * protocol setting to read in full, and the protocol size that brings the output back within
 * PAYLOAD_CAP (no size when the gate alone fills it).
 */
function buildOversizeNotice(length, protocolLength) {
    const gateFile = GATE_FILE_SEGMENTS.join('/');
    const fits = PAYLOAD_CAP - (length - protocolLength);
    const lead = `Route output size: ${length} characters, over the ${HOST_OUTPUT_LIMIT} a host shows in full, so the host may show only a preview of this block.`;
    if (protocolLength > 0 && fits > 0) {
        return `${lead} Read the gate in \`${gateFile}\` and the project route protocol (\`portability.workflowRouteProtocol\`) in full, and tell the user that protocol is ${protocolLength} characters and keeps this block whole at ${fits} or fewer.`;
    }
    return `${lead} Read the gate in \`${gateFile}\` in full, and tell the user the gate alone fills that size: no project route protocol fits.`;
}

/**
 * Build the route output: the state line, the mode's gate and any configured protocol. The gate and
 * the protocol are never dropped or cut here, so a large protocol keeps the output over PAYLOAD_CAP;
 * past HOST_OUTPUT_LIMIT the host shortens what the reader sees, and the output says so on its second
 * line (see buildOversizeNotice). It carries no catalog (see buildCatalogInjection).
 * `mode` is `ask` (default) or `auto`; `off` has no payload (see buildOffNotice). `source` names the
 * layer that decided the mode (workflow-routing-config `SOURCE_*`). `options` are the delivery-profile
 * inputs (`homeDir`, `config`; context-delivery `resolveProfile`): omitted, the person's own settings
 * decide whether the gate or the concise cue is delivered.
 */
function buildInjection(projectDir, protocolText, mode = DEFAULT_MODE, source = 'default', options = {}) {
    const effectiveMode = mode === 'auto' ? 'auto' : DEFAULT_MODE;
    const context = require('./context-delivery.cjs');
    const cue = context.conciseCore(projectDir, options)
        ? context.readConciseProtocol(projectDir, context.ROUTE_TAG) : null;
    const concise = cue ? cue.split(CATALOG_MODE_SLOT).join(CATALOG_MODE_SLOT.replace('<mode>', effectiveMode)) : null;
    const gate = concise || renderGateForMode(fs.readFileSync(path.join(projectDir, ...GATE_FILE_SEGMENTS), 'utf8'), effectiveMode);
    if (!gate) throw new Error('empty gate');
    const body = protocolBody(protocolText);
    const protocol = buildProtocolSection(body);
    const assemble = notice => {
        const parts = [ROUTE_START, buildStateLine(effectiveMode, source)];
        if (notice) parts.push(notice);
        parts.push(gate);
        if (protocol) parts.push('', protocol);
        parts.push(ROUTE_END);
        return parts.join('\n');
    };
    const payload = assemble('');
    return payload.length <= HOST_OUTPUT_LIMIT ? payload : assemble(buildOversizeNotice(payload.length, body.length));
}

/**
 * Build the catalog output: the compact catalog when it fits PAYLOAD_CAP, otherwise the first smaller
 * form that fits (compact rows without the step-skill names → the compact catalog with shorter whole-clause
 * hints, then without the step-skill names → index rows with barrier groups → rows with tier only → no rows). The output holds nothing else, so the form depends on the registry alone,
 * never on the gate or a project protocol. The last form is returned even when it stays over the cap.
 * `mode` is `ask` (default) or `auto`: it selects the tier legend the catalog prints.
 */
function buildCatalogInjection(projectDir, mode = DEFAULT_MODE) {
    const catalogLib = require('../../scripts/lib/workflow-skills-catalog.cjs');
    const effectiveMode = mode === 'auto' ? 'auto' : DEFAULT_MODE;
    const assemble = catalog => [CATALOG_START, catalog, CATALOG_END].join('\n');
    const compact = (sections, hintMax) => () => catalogLib.buildWorkflowSkillsCatalog({ rootDir: projectDir, sections, compact: true, mode: effectiveMode, hintMax });
    // Full whole-clause hints first; a registry too large for them keeps its compact rows with shorter whole-clause
    // hints before the catalog shrinks to an index without hints
    const forms = [
        compact(['workflows', 'skills']),
        compact(['workflows']),
        compact(['workflows', 'skills'], catalogLib.COMPACT_HINT_FALLBACK_MAX),
        compact(['workflows'], catalogLib.COMPACT_HINT_FALLBACK_MAX),
        ...catalogLib.POINTER_ROWS.map(rows => () => catalogLib.buildWorkflowPointerCatalog({ rootDir: projectDir, rows, mode: effectiveMode }))
    ];
    let payload = '';
    for (const build of forms) {
        payload = assemble(build());
        if (payload.length <= PAYLOAD_CAP) return payload;
    }
    return payload;
}

/** A short single-line reason for a source file that could not be read or parsed (project path removed, 120 characters). */
function describeSourceFailure(error, projectDir) {
    let text = error && typeof error.message === 'string' ? error.message : String(error);
    text = text.split(/\r?\n/)[0];
    if (projectDir) text = text.split(projectDir).join('<project>');
    text = text.replace(/\s+/g, ' ').trim();
    return (text || 'unreadable').slice(0, 120);
}

/**
 * The route output delivered when the gate file cannot be read or holds no gate: this module is the only
 * carrier of the route, so a missing source file must not silence it. The block is the state line and
 * one line naming the gate file. Never throws.
 */
function buildUnavailableInjection(projectDir, mode, source, error) {
    const effectiveMode = mode === 'auto' ? 'auto' : DEFAULT_MODE;
    return [
        ROUTE_START,
        buildStateLine(effectiveMode, source),
        `workflow route unavailable: ${GATE_FILE_SEGMENTS.join('/')} could not be read (${describeSourceFailure(error || 'empty gate', projectDir)}); read it and .claude/workflows.json`,
        ROUTE_END
    ].join('\n');
}

/** `buildInjection`, or the unavailable-source block when it throws. */
function buildInjectionOrNotice(projectDir, protocolText, mode, source, options) {
    try {
        return buildInjection(projectDir, protocolText, mode, source, options);
    } catch (error) {
        return buildUnavailableInjection(projectDir, mode, source, error);
    }
}

/**
 * The catalog output delivered when the catalog cannot be built (a corrupt or missing workflows.json):
 * one line naming the reason and the file to read instead. Never throws.
 */
function buildCatalogUnavailable(projectDir, error) {
    return [CATALOG_START, `workflow catalog unavailable: ${describeSourceFailure(error, projectDir)}; read .claude/workflows.json`, CATALOG_END].join('\n');
}

/** `buildCatalogInjection`, or the unavailable-catalog block when it throws. */
function buildCatalogInjectionOrNotice(projectDir, mode) {
    try {
        return buildCatalogInjection(projectDir, mode);
    } catch (error) {
        return buildCatalogUnavailable(projectDir, error);
    }
}

/** The `off` state: the only text delivered in `off` mode (no gate, no catalog). */
function buildOffNotice(source = 'default') {
    return [
        OFF_START,
        buildStateLine('off', source),
        '**Workflow auto-routing is OFF for this user** (route mode `off`, set per person). This overrides every auto-select instruction in project context, including a skill step that recommends a workflow:',
        '- Do not choose or start a workflow yourself: not through `start-workflow`, a `workflow-*` skill, or a skill step that would start a workflow (skip that step and continue the skill). A step that only offers a workflow to the user as an option stays as written. `off` governs only a workflow YOU choose to start: one that a skill step, a skill the user names or a running parent workflow requires is part of that run and is not skipped.',
        '- Run a workflow only when the user explicitly asks for one (a `/start-workflow <id>` or `workflow-*` command, or asking in words); a skill the user names runs too.',
        '- Otherwise execute the request directly, with no workflow, or the one skill the user names. Every quality gate, task-planning rule, evidence obligation and confirmation gate still binds.',
        OFF_END
    ].join('\n');
}

/** The mode and its deciding layer; `ask` from `default` when the resolver is unavailable, invalid or throws. */
function resolveMode(routing, options) {
    try {
        const resolved = routing && typeof routing.resolveWorkflowRouteMode === 'function' ? routing.resolveWorkflowRouteMode(options) : null;
        if (resolved && ['ask', 'auto', 'off'].includes(resolved.mode)) return { mode: resolved.mode, source: resolved.source || 'default' };
    } catch {
        /* fail safe to ask */
    }
    return { mode: DEFAULT_MODE, source: 'default' };
}

// The session record's name, store root and reader are owned by the routing library, so the
// `workflow-mode` CLI reports the same session directive this module applies.
const sessionRouting = () => require('../../scripts/lib/workflow-routing-config.cjs');

/** The mode a prompt directive set earlier in this session, or undefined. */
function readSessionMode(ledger, storeRoot, sessionId) {
    try {
        return sessionRouting().readSessionRouteMode({ ledger, storeRoot, sessionId });
    } catch {
        return undefined;
    }
}

function writeSessionMode(ledger, storeRoot, sessionId, mode) {
    try {
        return Boolean(ledger && typeof ledger.writeSessionState === 'function'
            && ledger.writeSessionState(storeRoot, sessionId, sessionRouting().SESSION_MODE_STATE, { mode }) === true);
    } catch {
        return false;
    }
}

/**
 * Apply a prompt directive (first line `workflow-mode: <mode>` and the other spellings): record the
 * session's mode, and with `save` write the personal user file. Returns the acknowledgement line for
 * the model, or '' when the prompt holds no directive.
 */
function applyDirective(routing, directive, context) {
    if (!directive) return '';
    const sessionSaved = writeSessionMode(context.ledger, context.storeRoot, context.sessionId, directive.mode);
    let saved = '';
    if (directive.save) {
        let result = { ok: false, reason: 'unavailable' };
        try {
            result = routing.writeWorkflowRouteMode({ mode: directive.mode, target: 'user', homeDir: context.homeDir });
        } catch {
            /* reported below */
        }
        saved = result.ok ? `; saved to ${result.file}` : `; NOT saved (${result.reason || 'failed'})`;
    }
    const scope = sessionSaved ? 'for this session' : 'for this prompt; session preference NOT saved. Later prompts use the recorded/configured mode';
    return `Route mode directive applied: ${directive.mode} ${scope}${saved}. The prompt's first line is that directive, not a task; if nothing else follows it, reply with one line confirming the mode.`;
}

/**
 * Resolve to the text written, or an empty string when nothing is written. `deps.part` selects the
 * output: `route` (when omitted) or `catalog`; any other value writes nothing. `deps.homeDir` is the home
 * of the personal settings layer and `deps.config` an already resolved `.ck` configuration (tests supply
 * them so a run never reads the person's own settings). Both resolve the mode the
 * same way, but only the route output records and acknowledges a prompt directive: the hooks of one
 * event run in parallel, so the catalog output reads the directive from the prompt instead of waiting
 * for that record.
 */
function run(input, deps = {}) {
    return new Promise(resolve => {
        const finish = value => resolve(value);
        try {
            if (!input || typeof input !== 'object' || Array.isArray(input)) return finish('');
            const event = input.hook_event_name;
            const isCompaction = event === 'SessionStart' && require('./convention-ledger.cjs').isCompactionStart(input);
            if (event && event !== 'UserPromptSubmit' && !isCompaction) return finish('');
            if (!nonBlank(input.session_id)) return finish('');

            const part = deps.part === undefined ? PART_ROUTE : deps.part;
            if (!isKnownPart(part)) return finish('');
            const env = deps.env || process.env;
            const now = typeof deps.now === 'number' ? deps.now : Date.now();
            const projectDir = deps.projectDir || defaultProjectDir(input, env);
            const routing = deps.routing || require('../../scripts/lib/workflow-routing-config.cjs');
            const ledger = deps.ledger || require('./convention-ledger.cjs');
            const storeRoot = deps.storeRoot || sessionRouting().resolveSessionStoreRoot(projectDir);

            let directive = null;
            try {
                directive = typeof routing.parseRouteModeDirective === 'function' ? routing.parseRouteModeDirective(input.prompt) : null;
            } catch {
                directive = null;
            }
            const ack = part === PART_ROUTE
                ? applyDirective(routing, directive, { ledger, storeRoot, sessionId: input.session_id, homeDir: deps.homeDir })
                : '';
            const sessionMode = directive ? directive.mode : readSessionMode(ledger, storeRoot, input.session_id);
            const routeOptions = { rootDir: projectDir, env, homeDir: deps.homeDir, sessionMode };
            const { mode, source } = resolveMode(routing, routeOptions);
            const skillPolicy = typeof routing.resolveSkillAutoTrigger === 'function' ? routing.resolveSkillAutoTrigger(routeOptions) : null;
            const write = deps.write || defaultWrite;
            const output = text => require('./prompt-route-utils.cjs').routerOutput(input, text);
            const context = require('./context-delivery.cjs');
            const profile = context.profileOptions(deps);
            const concise = context.conciseCore(projectDir, profile)
                && context.readConciseProtocol(projectDir, context.ROUTE_TAG);

            if (part === PART_CATALOG) {
                // The catalog serves the gate: the states that deliver no gate by design (`off`, skill auto-trigger
                // disabled) deliver no catalog. An unreadable gate is a fault, not such a state: the catalog still arrives.
                if (skillPolicy?.enabled === false || mode === 'off') return finish('');
                // Selection depth is retrieved explicitly through the route cue's catalog
                // command. Missing concise sources retain full compatible catalog delivery.
                if (concise) return finish('');
                const catalog = deps.content || buildCatalogInjectionOrNotice(projectDir, mode);
                ledger.deliverWithCompaction({
                    root: storeRoot,
                    input,
                    group: CATALOG_RECORD_GROUP,
                    hash: crypto.createHash('sha256').update(catalog, 'utf8').digest('hex'),
                    payload: output(`${catalog}\n`),
                    settings: SETTINGS,
                    now,
                    write,
                    failOpen: true
                }).then(finish, () => finish(''));
                return;
            }

            let content;
            if (skillPolicy?.enabled === false) {
                content = 'Framework skill auto-trigger is disabled. Do not self-route into a catalog workflow or offer the workflow-selection question. For a suitable unrequested skill/workflow candidate, follow the single skill-choice question in the skill activation policy; user confirmation authorizes that candidate. Named user requests and required hook/protocol calls remain eligible under the skill activation policy; existing workflow route restrictions still apply.';
            } else if (mode !== 'off') {
                const protocol = deps.protocol !== undefined ? deps.protocol : resolveProtocolText(routing, projectDir);
                content = deps.content || buildInjectionOrNotice(projectDir, protocol, mode, source, profile);
            } else {
                content = deps.offContent !== undefined ? deps.offContent : buildOffNotice(source);
                if (!content) return finish('');
            }
            const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
            // This output is the only carrier of the route and of the off notice, so an unusable record store
            // must not silence it: failOpen delivers without a record (a duplicate is accepted over silence).
            ledger.deliverWithCompaction({
                root: storeRoot,
                input,
                group: RECORD_GROUP,
                hash,
                payload: output(ack ? `${content}\n${ack}\n` : `${content}\n`),
                settings: SETTINGS,
                now,
                write,
                failOpen: true
            }).then(written => {
                // The block is already in the conversation, so nothing was written: the directive still gets its reply line.
                if (written === '' && ack) return new Promise(done => write(`${ack}\n`, ok => done(ok ? `${ack}\n` : '')));
                return written;
            }).then(finish, () => finish(''));
        } catch {
            finish('');
        }
    });
}

/** One stderr line for an entry that names a part this module does not write; a best-effort diagnostic. */
function reportUnknownPart(part) {
    const onError = () => {}; // a failed diagnostic never blocks the hook
    process.stderr.once('error', onError);
    try {
        process.stderr.write(`[workflow-route-delivery] unknown route part "${String(part).slice(0, 64)}": nothing delivered\n`, error => {
            if (!error) process.stderr.removeListener('error', onError);
        });
    } catch {
        process.stderr.removeListener('error', onError);
    }
}

/**
 * Hook entry for one output (`route` or `catalog`): read the event from stdin, run, always exit 0.
 * Any other part name ends before stdin is read, with no output and one stderr line.
 */
function runHook(part) {
    process.exitCode = 0;
    if (!isKnownPart(part)) return reportUnknownPart(part);
    let input = null;
    try {
        const { parseStdinSync } = require('./stdin-parser.cjs');
        input = parseStdinSync({ defaultValue: null, throwOnError: true, context: part === PART_CATALOG ? CATALOG_HOOK_NAME : HOOK_NAME });
    } catch {
        input = null;
    }
    if (input) run(input, { part }).then(() => { process.exitCode = 0; }, () => { process.exitCode = 0; });
}

module.exports = {
    HOOK_NAME,
    RECORD_GROUP,
    CATALOG_HOOK_NAME,
    CATALOG_RECORD_GROUP,
    PARTS,
    SETTINGS,
    ROUTE_START,
    ROUTE_END,
    CATALOG_START,
    CATALOG_END,
    PROTOCOL_START,
    PROTOCOL_END,
    OFF_START,
    OFF_END,
    GATE_MARKER,
    GATE_END_MARKER,
    HOST_OUTPUT_LIMIT,
    PAYLOAD_CAP,
    buildInjection,
    buildCatalogInjection,
    buildOversizeNotice,
    buildUnavailableInjection,
    buildCatalogUnavailable,
    renderGateForMode,
    buildOffNotice,
    buildProtocolSection,
    run,
    runHook
};
