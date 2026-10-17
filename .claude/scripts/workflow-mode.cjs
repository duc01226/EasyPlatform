#!/usr/bin/env node
'use strict';

/**
 * workflow-mode — show or persist this person's workflow route mode (`ask` | `auto` | `off`).
 *
 * Backs `framework-config --mode=workflow`; the rule itself (modes, precedence, files) is owned by
 * `.claude/scripts/lib/workflow-routing-config.cjs`, which the route hook uses too.
 *
 *   node .claude/scripts/workflow-mode.cjs [show]             effective mode, the layer that decided it, every layer
 *   node .claude/scripts/workflow-mode.cjs <mode> --save      write <mode> to ~/.claude/.ck.json (every project)
 *   node .claude/scripts/workflow-mode.cjs <mode> --save --local
 *                                                             write it to .claude/.ck.local.json (this checkout,
 *                                                             only after git confirms the file is ignored)
 *   node .claude/scripts/workflow-mode.cjs <mode>             nothing written; a session-only mode is set by the prompt
 *                                                             directive `workflow-mode: <mode>`, which the hook applies
 *   add --json for machine-readable output
 *   the session's prompt directive is read from the hook's session record by session id: `CK_SESSION_ID` (exported
 *   to tool processes on Claude) or `--session=<id>`; without an id the output says the directive is not visible
 *
 * The home directory is `os.homedir()` (USERPROFILE on Windows, HOME on macOS and Linux). Exit 0 on success,
 * 1 on a usage error or a refused write.
 */

const path = require('path');
const { spawnSync } = require('child_process');
const routing = require('./lib/workflow-routing-config.cjs');
const { resolveProjectRoot } = require('./lib/project-root.cjs');

function parseArgs(argv) {
    const args = { mode: null, save: false, local: false, json: false, show: false, session: '', setSession: false, resetSession: false, invalid: [] };
    for (const raw of argv) {
        const token = String(raw).trim().toLowerCase();
        if (/^--session=./.test(String(raw).trim())) args.session = String(raw).trim().slice('--session='.length);
        else if (token === '--save' || token === 'save') args.save = true;
        else if (token === '--local' || token === 'local') args.local = true;
        else if (token === '--json') args.json = true;
        else if (token === '--set-session') args.setSession = true;
        else if (token === '--reset-session') args.resetSession = true;
        else if (token === '--show' || token === 'show') args.show = true;
        else if (routing.ROUTE_MODES.includes(token)) args.mode = token;
        else args.invalid.push(raw);
    }
    return args;
}

/** True when git reports `file` ignored. Anything else (no git, not a repo, tracked, not ignored) is false. */
function isGitIgnored(rootDir, file) {
    try {
        const result = spawnSync('git', ['check-ignore', '-q', '--', path.relative(rootDir, file)], { cwd: rootDir, windowsHide: true });
        return result.status === 0;
    } catch {
        return false;
    }
}

function describeLayers(resolved, sessionMode) {
    const shown = value => value || '-';
    return [
        { layer: 'project config', path: resolved.configPath, mode: shown(resolved.projectMode) },
        { layer: 'user file', path: resolved.userPath, mode: shown(resolved.userMode) },
        { layer: 'checkout file', path: resolved.localPath, mode: shown(resolved.localMode) },
        { layer: `env ${routing.ROUTE_MODE_ENV}`, path: null, mode: shown(resolved.envMode) },
        { layer: 'session prompt directive', path: null, mode: shown(sessionMode) }
    ];
}

function main(argv = process.argv.slice(2), env = process.env) {
    const args = parseArgs(argv);
    if (args.invalid.length > 0) {
        process.stderr.write(`workflow-mode: unknown argument(s): ${args.invalid.join(' ')} (expected ask | auto | off | --save | --local | --show | --json | --set-session | --reset-session | --session=<id>)\n`);
        return 1;
    }
    const rootDir = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env }).rootDir;
    const sessionId = args.session || routing.readSessionIdFromEnv(env);
    if (args.setSession || args.resetSession) {
        if ((args.setSession && !args.mode) || !sessionId || args.save || args.local || (args.setSession && args.resetSession) || (args.resetSession && args.mode)) {
            process.stderr.write('workflow-mode: --set-session needs a mode and real session id; it cannot be combined with persistence flags.\n');
            return 1;
        }
        const ledger = require('../hooks/lib/convention-ledger.cjs');
        if (!ledger.writeSessionState(routing.resolveSessionStoreRoot(rootDir), sessionId, routing.SESSION_MODE_STATE, args.resetSession ? {} : { mode: args.mode })) {
            process.stderr.write('workflow-mode: session preference NOT saved; no persistent configuration was changed.\n');
            return 1;
        }
    }
    let written = null;
    if (args.mode && args.save) {
        const target = args.local ? 'local' : 'user';
        const localFile = routing.resolveLocalOverridePath(rootDir);
        if (target === 'local' && !isGitIgnored(rootDir, localFile)) {
            process.stderr.write(`workflow-mode: refused — ${localFile} is not git-ignored, so it could be committed. Use the user file (omit --local) or add the ignore rule first.\n`);
            return 1;
        }
        written = routing.writeWorkflowRouteMode({ mode: args.mode, target, rootDir });
        if (!written.ok) {
            process.stderr.write(`workflow-mode: not saved (${written.reason}${written.file ? `: ${written.file}` : ''})\n`);
            return 1;
        }
    }
    // The session's prompt directive lives in the hook's session record, not in a file or the env: read it by session id.
    const sessionMode = routing.readSessionRouteMode({ sessionId, rootDir });
    const resolved = routing.resolveWorkflowRouteMode({ rootDir, env, sessionMode });
    const sessionNote = sessionId
        ? null
        : `No session id (${routing.SESSION_ENV_ID} or --session=<id>): a prompt directive given this session is not visible to this command, so a mode it set is not reflected above.`;
    const out = {
        mode: resolved.mode,
        source: resolved.source,
        label: routing.describeRouteModeSource(resolved.source),
        layers: describeLayers(resolved, sessionMode),
        saved: written ? written.file : null,
        requested: args.mode,
        note: args.setSession || args.resetSession ? 'Applied for this session only; no personal or team file written.' : args.mode && !args.save
            ? 'Nothing written. A session-only mode is set by sending `workflow-mode: <mode>` as the first line of a prompt; add --save to persist.'
            : (args.mode && resolved.mode !== args.mode
                ? `Saved, but the effective mode stays ${resolved.mode}: a higher-precedence source (${routing.describeRouteModeSource(resolved.source)}) wins.`
                : null),
        sessionNote
    };
    if (args.json) {
        process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
        return 0;
    }
    const lines = [`Route mode: ${out.mode} (${out.label})`];
    if (out.saved) lines.push(`Saved: ${out.saved}`);
    for (const layer of out.layers) lines.push(`  ${layer.layer}${layer.path ? ` [${layer.path}]` : ''}: ${layer.mode}`);
    lines.push('  precedence, later wins: default < project config < user file < checkout file < env < this session\'s prompt directive');
    if (out.note) lines.push(out.note);
    if (out.sessionNote) lines.push(out.sessionNote);
    process.stdout.write(`${lines.join('\n')}\n`);
    return 0;
}

if (require.main === module) {
    process.exitCode = main();
}

module.exports = { main, parseArgs, isGitIgnored };
