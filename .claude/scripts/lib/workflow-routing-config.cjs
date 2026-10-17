'use strict';

/**
 * Runtime workflow-routing preference resolver.
 *
 * The OWNER of the per-person route mode and its precedence. Three modes:
 *   - `ask`  (default): the workflow question is asked only when the model's own route is to start a catalog workflow; direct, single-skill and custom-simple routes ask nothing.
 *   - `auto`: the workflow question is still asked before a self-selected workflow starts, recommending the full workflow first.
 *   - `off`:  no workflow or workflow skill is started without an explicit user request.
 * The hook (`workflow-route-inject.cjs`) delivers the route for the resolved mode on every host
 * that runs it (Claude, Codex, OpenCode bridge); no other surface decides the mode.
 *
 * Precedence, later wins (a missing, unreadable, malformed or invalid value expresses no opinion):
 *   1. framework default: `ask`
 *   2. tracked team config: <projectConfigPath> -> portability.workflowRouteMode
 *   3. personal, every project: <home>/.claude/.ck.json -> the same key (outside the repository)
 *   4. personal, this checkout: .claude/.ck.local.json -> the same key (git-ignored)
 *   5. environment: CK_WORKFLOW_ROUTE_MODE
 *   6. this session: a prompt directive (`workflow-mode: <mode>`, `/workflow-mode <mode>`), recorded by the
 *      hook in the session's own state and passed in as `sessionMode`
 * Within one config layer the legacy boolean `portability.workflowAutoDetect` is a fallback:
 * `false` reads as `off`, `true` as `ask`; `workflowRouteMode` wins when both are present.
 * Steps 3-6 are personal and never reach tracked output (scope `team` reads steps 1-2 only).
 * The home directory comes from `os.homedir()` (HOME on POSIX, USERPROFILE on Windows).
 *
 * The same two-layer cascade resolves the OPTIONAL custom route protocol
 * (`portability.workflowRouteProtocol`): framework default (none) -> team -> local, later
 * valid layer replaces the earlier one. A value is a string (inline markdown) or an object
 * carrying inline `text` and/or a repo-relative `path` to a markdown file read at runtime.
 * It is advisory text appended to the runtime route reminder — never a blocking decision, and
 * never stamped into tracked CLAUDE.md/AGENTS.md, which stay team-only.
 *
 * The same cascade also resolves per-project workflow activation tiers
 * (`portability.workflowActivation`: `{ default?, overrides? }`). Each setting is its own value:
 * a later valid `default` wins, and each `overrides[<workflowId>]` wins per workflow id (the
 * deep-merge rule `.claude/.ck.local.json` already follows). A workflow's effective tier is its
 * override when one is set, otherwise the stricter of its framework tier and the default
 * (tier order auto < confirm < manual) — a broad default only tightens; an override may loosen.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_PROJECT_CONFIG_PATH = path.join('docs', 'project-config.json');
const LOCAL_OVERRIDE_PATH = path.join('.claude', '.ck.local.json');
// The personal, every-project file: the same `.ck.json` the framework already reads from the user's
// home as its global layer (`hooks/lib/ck-config-loader.cjs`). It lives outside every repository.
const USER_CONFIG_RELATIVE_PATH = path.join('.claude', '.ck.json');
// Route modes: what a workflow the model matched on its own does (see the header).
const ROUTE_MODES = Object.freeze(['ask', 'auto', 'off']);
const DEFAULT_ROUTE_MODE = 'ask';
const ROUTE_MODE_ENV = 'CK_WORKFLOW_ROUTE_MODE';
// Environment spellings of `off` shared with the other CK_* feature switches; the config key takes the three mode names only.
const ROUTE_MODE_ENV_OFF_ALIASES = Object.freeze(['0', 'false', 'no', 'disabled']);
// A protocol file is injected into model context on every prompt, so its size is bounded like
// the convention-injection payload. Oversized files are truncated with a visible marker rather
// than silently dropped, so a mis-sized protocol is debuggable.
const MAX_PROTOCOL_FILE_BYTES = 20000;
// Fallback used only when the canonical privacy predicate cannot be loaded (a stripped portable
// tree carries `.claude/scripts/**` without `.claude/hooks/lib/**`).
const SENSITIVE_PROTOCOL_PATTERN = /(?:^|\/)\.env(?:$|\.)|credentials|secrets?\.ya?ml$|\.(?:pem|key)$|(?:^|\/)id_(?:rsa|ed25519)(?:$|[./])/i;
const SOURCE_DEFAULT = 'default';
const SOURCE_PROJECT_CONFIG = 'project-config';
const SOURCE_LOCAL_OVERRIDE = 'local-override';
const SOURCE_USER_CONFIG = 'user-config';
const SOURCE_ENVIRONMENT = 'environment';
const SOURCE_SESSION = 'session';
// Tracked generators consume the team scope; runtime hooks consume the effective scope.
const SCOPE_TEAM = 'team';
const SCOPE_EFFECTIVE = 'effective';
// Activation tiers in strictness order (auto < confirm < manual). Lockstep with the schema enum
// `WORKFLOW_ACTIVATION_TIERS` in .claude/hooks/lib/project-config-schema.cjs (asserted by the
// catalog suite); the ORDER is owned here because only the resolver ranks tiers.
const ACTIVATION_TIERS = Object.freeze(['auto', 'confirm', 'manual']);
// A workflow without a valid `activation` in .claude/workflows.json behaves as before tiers existed.
const DEFAULT_ACTIVATION_TIER = 'auto';

/**
 * Text of a JSON file whatever editor wrote it. Windows tools commonly save a UTF-8 byte-order mark
 * (Notepad, `Out-File -Encoding utf8`) or UTF-16 (`>` in Windows PowerShell 5); `JSON.parse` rejects
 * both, which made a personal file silently express no opinion.
 */
function decodeConfigText(buffer) {
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) return buffer.toString('utf16le', 2);
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
        return Buffer.from(buffer.subarray(2)).swap16().toString('utf16le');
    }
    return buffer.toString('utf8').replace(/^\uFEFF/, '');
}

function readJson(filePath) {
    try {
        return JSON.parse(decodeConfigText(fs.readFileSync(filePath)));
    } catch {
        return null;
    }
}

function readConfiguredProjectConfigPath(rootDir) {
    const ck = readJson(path.join(rootDir, '.claude', '.ck.json'));
    const configured = ck?.portability?.projectConfigPath;
    return typeof configured === 'string' && configured.trim() ? configured.trim() : null;
}

function resolveProjectConfigPath(rootDir) {
    const configured = readConfiguredProjectConfigPath(rootDir) || DEFAULT_PROJECT_CONFIG_PATH;
    return path.isAbsolute(configured) ? configured : path.join(rootDir, configured);
}

function resolveLocalOverridePath(rootDir) {
    return path.join(rootDir, LOCAL_OVERRIDE_PATH);
}

/** The personal every-project config file under `homeDir` (default `os.homedir()`), or null without a home. */
function resolveUserConfigPath(homeDir) {
    let home = homeDir;
    if (home === undefined) {
        try {
            home = os.homedir();
        } catch {
            home = '';
        }
    }
    return typeof home === 'string' && home.trim() ? path.join(home, USER_CONFIG_RELATIVE_PATH) : null;
}

/** A route mode name (case-insensitive), otherwise undefined (no opinion). */
function normalizeRouteMode(value) {
    if (typeof value !== 'string') return undefined;
    const name = value.trim().toLowerCase();
    return ROUTE_MODES.includes(name) ? name : undefined;
}

/** The environment value: a mode name, or one of the shared CK_* `off` spellings; blank or unknown = no opinion. */
function normalizeEnvRouteMode(value) {
    if (typeof value !== 'string') return undefined;
    // `set NAME="auto"` in cmd.exe keeps the quotes in the value.
    const text = value.trim().replace(/^(["'])(.*)\1$/, '$2').trim();
    const mode = normalizeRouteMode(text);
    if (mode) return mode;
    return ROUTE_MODE_ENV_OFF_ALIASES.includes(text.toLowerCase()) ? 'off' : undefined;
}

/** One parsed config's mode: `workflowRouteMode`, else the legacy boolean `workflowAutoDetect`, else no opinion. */
function readRouteModeLayer(config) {
    const portability = config?.portability;
    const named = normalizeRouteMode(portability?.workflowRouteMode);
    if (named) return named;
    const legacy = portability?.workflowAutoDetect;
    if (legacy === false) return 'off';
    if (legacy === true) return DEFAULT_ROUTE_MODE;
    return undefined;
}

/** The mode one parsed config expresses alone (the tracked team layer), `ask` when it expresses none. */
function readWorkflowRouteMode(config) {
    return readRouteModeLayer(config) || DEFAULT_ROUTE_MODE;
}

function readWorkflowAutoDetect(config) {
    return readWorkflowRouteMode(config) !== 'off';
}

// A directive is the prompt's FIRST non-blank line and nothing else on it: `workflow-mode: auto`,
// `/workflow-mode auto` or `$workflow-mode auto` (Codex), optionally ending in `save` or `--save`. Prose that
// merely mentions the words never matches, and neither does a directive on a later line or inside a code fence.
const DIRECTIVE_RE = /^(?:[/$]workflow-mode[ \t]+|workflow-mode[ \t]*:[ \t]*)(ask|auto|off)(?:[ \t]+((?:--)?save))?[ \t]*$/i;
const FRAMEWORK_DIRECTIVE_RE = /^[/$]framework-config[ \t]+--mode=workflow[ \t]+(ask|auto|off)(?:[ \t]+--scope=session)?(?:[ \t]+((?:--)?save))?[ \t]*$/i;

/**
 * The route-mode directive a prompt opens with, or null.
 * @param {string} prompt raw user prompt
 * @returns {{mode: 'ask'|'auto'|'off', save: boolean}|null}
 */
function parseRouteModeDirective(prompt) {
    if (typeof prompt !== 'string') return null;
    const first = prompt.split(/\r?\n/).find(line => line.trim() !== '');
    const match = first === undefined ? null : (DIRECTIVE_RE.exec(first.trim()) || FRAMEWORK_DIRECTIVE_RE.exec(first.trim()));
    return match ? { mode: match[1].toLowerCase(), save: Boolean(match[2]) } : null;
}

/**
 * Persist a mode in a personal file, keeping every other key: `target` `user` = the every-project
 * `<home>/.claude/.ck.json`, `local` = this checkout's `.claude/.ck.local.json` (the caller confirms the
 * checkout file is git-ignored). An existing file that is not a JSON object is left untouched.
 * @param {{mode: string, target?: 'user'|'local', rootDir?: string, homeDir?: string}} options
 * @returns {{ok: boolean, file?: string, reason?: string}}
 */
function writeWorkflowRouteMode(options = {}) {
    const mode = normalizeRouteMode(options.mode);
    if (!mode) return { ok: false, reason: 'invalid-mode' };
    const file = options.target === 'local'
        ? resolveLocalOverridePath(options.rootDir || process.cwd())
        : resolveUserConfigPath(options.homeDir);
    if (!file) return { ok: false, reason: 'no-home' };
    let temp = null;
    try {
        let current = {};
        if (fs.existsSync(file)) {
            const parsed = JSON.parse(decodeConfigText(fs.readFileSync(file)));
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, file, reason: 'unreadable-config' };
            current = parsed;
        }
        const portability = current.portability && typeof current.portability === 'object' && !Array.isArray(current.portability)
            ? current.portability
            : {};
        current.portability = { ...portability, workflowRouteMode: mode };
        fs.mkdirSync(path.dirname(file), { recursive: true });
        temp = `${file}.${process.pid}.tmp`;
        fs.writeFileSync(temp, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
        fs.renameSync(temp, file);
        return { ok: true, file };
    } catch {
        if (temp) {
            try { fs.unlinkSync(temp); } catch { /* never created */ }
        }
        return { ok: false, file, reason: 'unreadable-config' };
    }
}

// The hook records a prompt directive's mode in the session's own state (`_<name>.json` under
// `<store root>/<session>/`); the `workflow-mode` CLI reads the same record, so both report one winner.
const SESSION_MODE_STATE = 'route-mode';
const SESSION_ENV_ID = 'CK_SESSION_ID';

/** The ledger store the route hook keeps its per-session records in. */
function resolveSessionStoreRoot(rootDir) {
    return path.join(rootDir || process.cwd(), 'tmp', 'workflow-routing');
}

/**
 * The mode a prompt directive set earlier in a session, or undefined (no directive, no session id,
 * or no readable record). `ledger` and `storeRoot` are injectable (the hook passes its own).
 * @param {{sessionId?: string, rootDir?: string, storeRoot?: string, ledger?: object}} options
 * @returns {'ask'|'auto'|'off'|undefined}
 */
function readSessionRouteMode(options = {}) {
    try {
        if (typeof options.sessionId !== 'string' || !options.sessionId.trim()) return undefined;
        const ledger = options.ledger || require('../../hooks/lib/convention-ledger.cjs');
        if (typeof ledger.readSessionState !== 'function') return undefined;
        const storeRoot = options.storeRoot || resolveSessionStoreRoot(options.rootDir);
        const state = ledger.readSessionState(storeRoot, options.sessionId, SESSION_MODE_STATE);
        return normalizeRouteMode(state && state.mode);
    } catch {
        return undefined;
    }
}

/** The session id the host exported to tool processes (`CK_SESSION_ID`), or ''. */
function readSessionIdFromEnv(env = process.env) {
    const value = env && env[SESSION_ENV_ID];
    return typeof value === 'string' ? value.trim() : '';
}

/** A short human label for the layer that decided the mode (shown in the injected state line). */
function describeRouteModeSource(source) {
    switch (source) {
        case SOURCE_PROJECT_CONFIG: return 'project config';
        case SOURCE_USER_CONFIG: return '~/.claude/.ck.json';
        case SOURCE_LOCAL_OVERRIDE: return '.claude/.ck.local.json';
        case SOURCE_ENVIRONMENT: return `env ${ROUTE_MODE_ENV}`;
        case SOURCE_SESSION: return 'set by your prompt this session';
        default: return 'default';
    }
}

/**
 * Resolve the effective route mode (precedence in the file header).
 *
 * @param {string|object} [source] rootDir string, or { rootDir, scope, env, homeDir, sessionMode, configPath, localPath, userPath }
 *   `env` and `homeDir` exist so a caller (a test, a hook host) can supply them; omitted, they are
 *   `process.env` and `os.homedir()`. `sessionMode` is the mode the user set for this session by a prompt directive.
 * @returns {{mode: 'ask'|'auto'|'off', source: string, scope: string, configPath: string, localPath: string,
 *   userPath: string|null, teamMode: string, projectMode?: string, userMode?: string, localMode?: string,
 *   envMode?: string, overriddenPersonally: boolean}} `*Mode` fields are what that layer alone expresses
 *   (undefined = no opinion); `teamMode` is the mode after the framework default and the project layer.
 */
function resolveWorkflowRouteMode(source) {
    const options = typeof source === 'string' ? { rootDir: source } : (source || {});
    const rootDir = options.rootDir || process.cwd();
    const scope = options.scope === SCOPE_TEAM ? SCOPE_TEAM : SCOPE_EFFECTIVE;
    const env = options.env || process.env;
    const configPath = options.configPath || resolveProjectConfigPath(rootDir);
    const localPath = options.localPath || resolveLocalOverridePath(rootDir);
    const userPath = options.userPath !== undefined ? options.userPath : resolveUserConfigPath(options.homeDir);

    let mode = DEFAULT_ROUTE_MODE;
    let decidedBy = SOURCE_DEFAULT;
    const apply = (value, layerSource) => {
        if (value === undefined) return;
        mode = value;
        decidedBy = layerSource;
    };
    const projectMode = readRouteModeLayer(readJson(configPath));
    apply(projectMode, SOURCE_PROJECT_CONFIG);
    const teamMode = mode;

    let userMode;
    let localMode;
    let envMode;
    if (scope === SCOPE_EFFECTIVE) {
        userMode = userPath ? readRouteModeLayer(readJson(userPath)) : undefined;
        apply(userMode, SOURCE_USER_CONFIG);
        localMode = readRouteModeLayer(readJson(localPath));
        apply(localMode, SOURCE_LOCAL_OVERRIDE);
        envMode = normalizeEnvRouteMode(env[ROUTE_MODE_ENV]);
        apply(envMode, SOURCE_ENVIRONMENT);
        apply(normalizeRouteMode(options.sessionMode), SOURCE_SESSION);
    }

    return {
        mode,
        source: decidedBy,
        scope,
        configPath,
        localPath,
        userPath,
        teamMode,
        projectMode,
        userMode,
        localMode,
        envMode,
        overriddenPersonally: mode !== teamMode
    };
}

/** The on/off view of the route mode (`off` = disabled), kept for callers of the former boolean switch. */
function resolveWorkflowAutoDetect(source) {
    const resolved = resolveWorkflowRouteMode(source);
    const enabled = resolved.mode !== 'off';
    const teamEnabled = resolved.teamMode !== 'off';
    return {
        enabled,
        source: resolved.source,
        scope: resolved.scope,
        configPath: resolved.configPath,
        localPath: resolved.localPath,
        teamEnabled,
        overriddenLocally: resolved.overriddenPersonally && enabled !== teamEnabled
    };
}

/**
 * Whether framework skills may be selected by task similarity. Runtime-only: never writes host
 * visibility or permissions, because those can also block a hook-required call. Later valid values
 * win: default true -> team -> personal user -> checkout-local -> environment. Uses the same path
 * and encoding owners as workflow routing, including relocated project configuration.
 */
function resolveSkillAutoTrigger(options = {}) {
    const rootDir = options.rootDir || process.cwd();
    const env = options.env || process.env;
    const configPath = options.configPath || resolveProjectConfigPath(rootDir);
    const userPath = options.userPath !== undefined ? options.userPath : resolveUserConfigPath(options.homeDir);
    const localPath = options.localPath || resolveLocalOverridePath(rootDir);
    let enabled = true;
    let source = SOURCE_DEFAULT;
    const apply = (value, layer) => {
        if (typeof value !== 'boolean') return;
        enabled = value;
        source = layer;
    };
    apply(readJson(configPath)?.portability?.skillAutoTrigger, SOURCE_PROJECT_CONFIG);
    const teamEnabled = enabled;
    if (options.scope !== SCOPE_TEAM) {
        apply(userPath ? readJson(userPath)?.portability?.skillAutoTrigger : undefined, SOURCE_USER_CONFIG);
        apply(readJson(localPath)?.portability?.skillAutoTrigger, SOURCE_LOCAL_OVERRIDE);
        const raw = env.CK_SKILL_AUTO_TRIGGER;
        if (typeof raw === 'string') {
            const value = raw.trim().replace(/^(["'])(.*)\1$/, '$2').trim().toLowerCase();
            if (['1', 'true', 'on', 'yes', 'enabled'].includes(value)) apply(true, SOURCE_ENVIRONMENT);
            if (['0', 'false', 'off', 'no', 'disabled'].includes(value)) apply(false, SOURCE_ENVIRONMENT);
        }
    }
    return { enabled, source, teamEnabled, configPath, localPath, userPath };
}

/**
 * Normalize a declared `workflowRouteProtocol` value into `{ text?, path? }`.
 * A bare string is inline text; an object may carry `text` and/or `path`. Blank,
 * malformed, and empty values return null, which the layer reader treats as "no opinion".
 */
function normalizeProtocolValue(value) {
    if (typeof value === 'string') {
        const text = value.trim();
        return text ? { text } : null;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const text = typeof value.text === 'string' && value.text.trim() ? value.text.trim() : null;
        const refPath = typeof value.path === 'string' && value.path.trim() ? value.path.trim() : null;
        if (!text && !refPath) return null;
        return { text, path: refPath };
    }
    return null;
}

/** Repo-escaping check mirrored from the schema's fail-closed plane (absolute or `..`). */
function isEscapingProtocolPath(value) {
    if (typeof value !== 'string' || !value.trim()) return true;
    if (path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value)) return true;
    return value.replace(/\\/g, '/').split('/').includes('..');
}

function isPathWithin(root, candidate) {
    const relative = path.relative(root, candidate);
    return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function resolvePhysicalPath(candidate) {
    if (typeof fs.realpathSync.native === 'function') return fs.realpathSync.native(candidate);
    return fs.realpathSync(candidate);
}

/**
 * Reject privacy-sensitive protocol files. A committed team config could otherwise point `path`
 * at `.env`/credentials and have the hook read the developer's working tree into model context on
 * every prompt. Uses the framework's canonical privacy predicate when available; the inline
 * fallback covers a stripped portable tree where `.claude/hooks/lib` is absent.
 */
function isSensitiveProtocolPath(relativePath) {
    try {
        const { isPrivacySensitive } = require('../../hooks/lib/sensitive-path-policy.cjs');
        if (typeof isPrivacySensitive === 'function') return isPrivacySensitive(relativePath);
    } catch {
        /* portable fallback below */
    }
    return SENSITIVE_PROTOCOL_PATTERN.test(String(relativePath || '').replace(/\\/g, '/'));
}

/**
 * Read a repo-relative protocol file, fail-soft: an escaping or privacy-sensitive path, a missing
 * file, a non-file, or a blank body returns null so the layer expresses no opinion and the cascade
 * falls through. An oversized file is truncated at MAX_PROTOCOL_FILE_BYTES with a visible marker.
 */
function readProtocolFile(rootDir, relativePath) {
    if (isEscapingProtocolPath(relativePath)) return null;
    if (isSensitiveProtocolPath(relativePath)) return null;
    const resolvedRoot = path.resolve(rootDir);
    const resolved = path.resolve(resolvedRoot, relativePath);
    if (!isPathWithin(resolvedRoot, resolved)) return null;
    try {
        // Lexical containment does not stop a symlink, junction, or other reparse point from
        // redirecting the read outside the project. Resolve both sides physically and read the
        // resolved candidate so the checked path is also the path consumed by the reader.
        const physicalRoot = resolvePhysicalPath(resolvedRoot);
        const physicalCandidate = resolvePhysicalPath(resolved);
        if (!isPathWithin(physicalRoot, physicalCandidate)) return null;
        if (isSensitiveProtocolPath(path.relative(physicalRoot, physicalCandidate))) return null;

        const stat = fs.statSync(physicalCandidate);
        if (!stat.isFile()) return null;
        if (stat.size > MAX_PROTOCOL_FILE_BYTES) {
            const body = fs.readFileSync(physicalCandidate, 'utf8').slice(0, MAX_PROTOCOL_FILE_BYTES).trim();
            return body
                ? `${body}\n\n[workflowRouteProtocol: truncated at ${MAX_PROTOCOL_FILE_BYTES} bytes]`
                : null;
        }
        const body = fs.readFileSync(physicalCandidate, 'utf8').trim();
        return body || null;
    } catch {
        return null;
    }
}

/** Resolve one config layer's protocol text, or undefined when that layer expresses no opinion. */
function readProtocolLayer(filePath, rootDir) {
    const entry = normalizeProtocolValue(readJson(filePath)?.portability?.workflowRouteProtocol);
    if (!entry) return undefined;
    const parts = [];
    if (entry.text) parts.push(entry.text);
    if (entry.path) {
        const body = readProtocolFile(rootDir, entry.path);
        if (body) parts.push(body);
    }
    const text = parts.join('\n\n').trim();
    return text ? text : undefined;
}

/**
 * Resolve the effective custom route protocol text across the same cascade as the enable
 * switch: framework default (none) -> team project config -> local `.ck.local.json`, later
 * valid layer winning. Returns the text and the layer that decided it.
 *
 * @param {string|object} [source] rootDir string, or { rootDir, scope, configPath, localPath }
 * @returns {{text: string|null, source: string, scope: string, configPath: string, localPath: string, teamText: string|null, overriddenLocally: boolean}}
 */
function resolveWorkflowRouteProtocol(source) {
    const options = typeof source === 'string' ? { rootDir: source } : (source || {});
    const rootDir = options.rootDir || process.cwd();
    const scope = options.scope === SCOPE_TEAM ? SCOPE_TEAM : SCOPE_EFFECTIVE;
    const configPath = options.configPath || resolveProjectConfigPath(rootDir);
    const localPath = options.localPath || resolveLocalOverridePath(rootDir);

    let text = null;
    let decidedBy = SOURCE_DEFAULT;
    const team = readProtocolLayer(configPath, rootDir);
    if (team !== undefined) {
        text = team;
        decidedBy = SOURCE_PROJECT_CONFIG;
    }
    const teamText = text;

    const local = scope === SCOPE_EFFECTIVE ? readProtocolLayer(localPath, rootDir) : undefined;
    if (local !== undefined) {
        text = local;
        decidedBy = SOURCE_LOCAL_OVERRIDE;
    }

    return {
        text,
        source: decidedBy,
        scope,
        configPath,
        localPath,
        teamText,
        overriddenLocally: local !== undefined && local !== teamText
    };
}

/** Convenience: the resolved protocol text, or '' when none is configured. */
function readWorkflowRouteProtocol(source) {
    const resolved = resolveWorkflowRouteProtocol(source);
    return resolved.text || '';
}

/** A configured tier: exactly one of ACTIVATION_TIERS, otherwise undefined (no opinion). */
function readConfiguredTier(value) {
    return typeof value === 'string' && ACTIVATION_TIERS.includes(value) ? value : undefined;
}

/** A workflow's framework tier from its `.claude/workflows.json` entry; absent or unknown = auto. */
function frameworkActivationTier(workflow) {
    const value = workflow && typeof workflow.activation === 'string' ? workflow.activation.trim().toLowerCase() : '';
    return ACTIVATION_TIERS.includes(value) ? value : DEFAULT_ACTIVATION_TIER;
}

function stricterTier(left, right) {
    return ACTIVATION_TIERS.indexOf(left) >= ACTIVATION_TIERS.indexOf(right) ? left : right;
}

/**
 * Read one config layer's `portability.workflowActivation`, keeping only valid values: an invalid
 * `default` or override entry expresses no opinion, so a typo never changes a tier silently (the
 * schema validators report it by name). `overrides` is prototype-free so a workflow id can never
 * resolve through an inherited key.
 * @param {object|null} config parsed config object
 * @returns {{default: string|undefined, overrides: Record<string, string>}}
 */
function readWorkflowActivation(config) {
    const layer = { default: undefined, overrides: Object.create(null) };
    const block = config?.portability?.workflowActivation;
    if (!block || typeof block !== 'object' || Array.isArray(block)) return layer;
    layer.default = readConfiguredTier(block.default);
    const overrides = block.overrides;
    if (overrides && typeof overrides === 'object' && !Array.isArray(overrides)) {
        for (const [workflowId, tier] of Object.entries(overrides)) {
            const valid = readConfiguredTier(tier);
            if (valid !== undefined) layer.overrides[workflowId] = valid;
        }
    }
    return layer;
}

/**
 * Resolve the activation settings across the cascade: framework (none) -> team project config ->
 * local `.ck.local.json` (effective scope only). `default` takes the later valid layer; overrides
 * merge per workflow id with the later valid layer winning. Passing `config` (a parsed project
 * config object) reads that object alone as the team layer, like `isWorkflowAutoDetectEnabled`.
 *
 * @param {string|object} [source] rootDir string, or { rootDir, scope, config, configPath, localPath }
 * @returns {{default: string|null, overrides: Record<string, string>, defaultSource: string, scope: string, configPath: string|null, localPath: string|null}}
 */
function resolveWorkflowActivation(source) {
    const options = typeof source === 'string' ? { rootDir: source } : (source || {});
    if (options.config !== undefined && options.config !== null) {
        const team = readWorkflowActivation(options.config);
        return {
            default: team.default || null,
            overrides: team.overrides,
            defaultSource: team.default ? SOURCE_PROJECT_CONFIG : SOURCE_DEFAULT,
            scope: SCOPE_TEAM,
            configPath: null,
            localPath: null
        };
    }
    const rootDir = options.rootDir || process.cwd();
    const scope = options.scope === SCOPE_TEAM ? SCOPE_TEAM : SCOPE_EFFECTIVE;
    const configPath = options.configPath || resolveProjectConfigPath(rootDir);
    const localPath = options.localPath || resolveLocalOverridePath(rootDir);

    const layers = [[readWorkflowActivation(readJson(configPath)), SOURCE_PROJECT_CONFIG]];
    if (scope === SCOPE_EFFECTIVE) layers.push([readWorkflowActivation(readJson(localPath)), SOURCE_LOCAL_OVERRIDE]);

    let tierDefault = null;
    let defaultSource = SOURCE_DEFAULT;
    const overrides = Object.create(null);
    for (const [layer, layerSource] of layers) {
        if (layer.default !== undefined) {
            tierDefault = layer.default;
            defaultSource = layerSource;
        }
        Object.assign(overrides, layer.overrides);
    }
    return { default: tierDefault, overrides, defaultSource, scope, configPath, localPath };
}

/**
 * A workflow's effective tier: its override when the project names it, otherwise the stricter of
 * its framework tier and the project default. No settings = the framework tier unchanged.
 * @param {string} workflowId
 * @param {object} workflow its `.claude/workflows.json` entry
 * @param {{default?: string|null, overrides?: object}|null} activation resolved settings
 * @returns {'auto'|'confirm'|'manual'}
 */
function effectiveActivationTier(workflowId, workflow, activation) {
    const framework = frameworkActivationTier(workflow);
    if (!activation) return framework;
    const overrides = activation.overrides;
    if (overrides && typeof workflowId === 'string' && Object.prototype.hasOwnProperty.call(overrides, workflowId)) {
        const pinned = readConfiguredTier(overrides[workflowId]);
        if (pinned !== undefined) return pinned;
    }
    const floor = readConfiguredTier(activation.default);
    return floor === undefined ? framework : stricterTier(framework, floor);
}

/**
 * Resolve one workflow's effective tier from project settings. Pass `activation` (from
 * `resolveWorkflowActivation`) to resolve many workflows against one read of the settings.
 * @param {{rootDir?: string, workflowId: string, workflow: object, scope?: string, config?: object, configPath?: string, localPath?: string, activation?: object|null}} options
 * @returns {'auto'|'confirm'|'manual'}
 */
function resolveActivationTier(options = {}) {
    const activation = options.activation !== undefined ? options.activation : resolveWorkflowActivation(options);
    return effectiveActivationTier(options.workflowId, options.workflow, activation);
}

function isWorkflowAutoDetectEnabled(source) {
    const options = typeof source === 'string' ? { rootDir: source } : (source || {});
    if (options.config !== undefined && options.config !== null) {
        return readWorkflowAutoDetect(options.config);
    }
    return resolveWorkflowAutoDetect(options).enabled;
}

module.exports = {
    decodeConfigText,
    ACTIVATION_TIERS,
    DEFAULT_ACTIVATION_TIER,
    DEFAULT_PROJECT_CONFIG_PATH,
    DEFAULT_ROUTE_MODE,
    LOCAL_OVERRIDE_PATH,
    MAX_PROTOCOL_FILE_BYTES,
    ROUTE_MODES,
    ROUTE_MODE_ENV,
    USER_CONFIG_RELATIVE_PATH,
    SOURCE_DEFAULT,
    SOURCE_PROJECT_CONFIG,
    SOURCE_LOCAL_OVERRIDE,
    SOURCE_USER_CONFIG,
    SOURCE_ENVIRONMENT,
    SOURCE_SESSION,
    SCOPE_TEAM,
    SCOPE_EFFECTIVE,
    effectiveActivationTier,
    frameworkActivationTier,
    isWorkflowAutoDetectEnabled,
    readWorkflowActivation,
    resolveActivationTier,
    resolveWorkflowActivation,
    describeRouteModeSource,
    parseRouteModeDirective,
    readWorkflowAutoDetect,
    readWorkflowRouteMode,
    readWorkflowRouteProtocol,
    SESSION_MODE_STATE,
    SESSION_ENV_ID,
    readSessionIdFromEnv,
    readSessionRouteMode,
    resolveSessionStoreRoot,
    resolveLocalOverridePath,
    resolveProjectConfigPath,
    resolveUserConfigPath,
    resolveWorkflowAutoDetect,
    resolveWorkflowRouteMode,
    resolveSkillAutoTrigger,
    resolveWorkflowRouteProtocol,
    writeWorkflowRouteMode
};
