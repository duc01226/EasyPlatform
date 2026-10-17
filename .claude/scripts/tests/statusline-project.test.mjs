import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Unit tests for statusline-project: cross-platform basename + the
// project_dir > current_dir > cwd source precedence (subdir-stable name).
//
// statusline-project is .cjs (a ccstatusline custom-command widget). Bridge to
// its pure exports via createRequire — the .cjs↔.mjs interop the repo uses for
// .cjs scripts. Requiring it must NOT run main(): the script guards main()
// behind a require.main === module check.
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const scriptPath = path.resolve(thisDir, '..', 'statusline-project.cjs');
const { basenameOf, projectFolderName } = require(scriptPath);

// ── ccstatusline.json wiring: prove the JSON actually invokes statusline-project.cjs ──
// The pure functions are useless if the statusline config never calls the script.
// thisDir = .claude/scripts/tests → ../.. = .claude, ../../.. = repo root.
const ccPath = path.join(thisDir, '..', '..', 'ccstatusline.json');
const repoRoot = path.join(thisDir, '..', '..', '..');

function statuslineProjectWidget() {
    const cfg = JSON.parse(fs.readFileSync(ccPath, 'utf8'));
    const widgets = (cfg.lines || []).flat();
    return widgets.find(w => w && w.type === 'custom-command' &&
        typeof w.commandPath === 'string' && w.commandPath.includes('statusline-project.cjs'));
}

test('ccstatusline.json: wires statusline-project.cjs as a custom-command widget', () => {
    const widget = statuslineProjectWidget();
    assert.ok(widget, 'a custom-command widget must invoke statusline-project.cjs');
    assert.match(widget.commandPath, /node\s+.*statusline-project\.cjs/, 'commandPath must run the script via node');
});

test('ccstatusline.json: wired statusline-project.cjs path exists on disk', () => {
    const widget = statuslineProjectWidget();
    assert.ok(widget, 'widget must exist to validate its path');
    const rel = widget.commandPath.replace(/^node\s+/, '').trim();
    assert.ok(fs.existsSync(path.join(repoRoot, rel)), `wired script must exist at repo-relative path: ${rel}`);
});

// ── settings.json: the status line command must pin an exact ccstatusline version ──
// The command re-runs on every assistant message, so `@latest` would auto-execute any
// newly published release on every machine, unreviewed and unlockfiled, as the developer's
// own user and with session data on stdin. An exact version runs an unchanging cached copy.
const settingsPath = path.join(thisDir, '..', '..', 'settings.json');

test('settings.json: statusLine pins an exact ccstatusline version (never @latest)', () => {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const command = settings.statusLine?.command;
    assert.equal(typeof command, 'string', 'statusLine.command must be a string');
    assert.doesNotMatch(command, /ccstatusline@latest/, 'statusLine.command must not float on @latest');
    assert.match(
        command,
        /ccstatusline@\d+\.\d+\.\d+(?![\w.-])/,
        'statusLine.command must pin ccstatusline to an exact x.y.z version'
    );
});

// ── settings.json: ccstatusline must run from the project root, never the session cwd ──
// Claude Code spawns the status line in the session's CURRENT directory, which follows every
// `cd` (the same runner as hooks, which also exports CLAUDE_PROJECT_DIR = session root).
// ccstatusline resolves `--config` with path.resolve() against its own cwd and WRITES a default
// config (mkdir -p) when that file is missing, so a cwd-relative config path drops a stray
// `.claude/ccstatusline.json` into whatever subdirectory the session cd'd into. The
// custom-command widgets inherit the same cwd, so their repo-relative `node .claude/...`
// commands fail there. Anchor the process cwd to the project root with the hook convention
// (`"$CLAUDE_PROJECT_DIR"`), chained with `&&` so a failed cd never runs from the session cwd.
const PROJECT_DIR_REF = String.raw`"\$(?:CLAUDE_PROJECT_DIR|\{CLAUDE_PROJECT_DIR\})"`;
const CWD_ANCHOR = new RegExp(String.raw`^\s*cd\s+${PROJECT_DIR_REF}\s*&&\s*\S`);

function configArgOf(command) {
    const m = command.match(/--config\s+("[^"]*"\S*|\S+)/);
    return m ? m[1] : null;
}

function isProjectAnchoredPath(p) {
    return new RegExp(`^${PROJECT_DIR_REF}[\\\\/]`).test(p);
}

test('settings.json: statusLine never resolves the ccstatusline config against the session cwd', () => {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const command = settings.statusLine?.command;
    assert.equal(typeof command, 'string', 'statusLine.command must be a string');
    const configArg = configArgOf(command);
    assert.ok(configArg, 'statusLine.command must pass an explicit --config path');
    assert.ok(
        CWD_ANCHOR.test(command) || isProjectAnchoredPath(configArg),
        `--config ${configArg} resolves against the moving session cwd; anchor it with ` +
            '`cd "$CLAUDE_PROJECT_DIR" && ...` or a "$CLAUDE_PROJECT_DIR"/ prefix'
    );
});

test('settings.json: statusLine anchors cwd when a ccstatusline widget runs a repo-relative command', () => {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const cfg = JSON.parse(fs.readFileSync(ccPath, 'utf8'));
    const relativeWidgets = (cfg.lines || []).flat().filter(w => w && w.type === 'custom-command' &&
        typeof w.commandPath === 'string' && /(^|\s)\.claude[\\/]/.test(w.commandPath));
    assert.ok(relativeWidgets.length > 0, 'tripwire: the wired widgets use repo-relative .claude/ paths');
    assert.match(
        settings.statusLine.command,
        CWD_ANCHOR,
        'widget commands run in ccstatusline\'s cwd (cmd.exe on Windows, sh on POSIX — no portable env ' +
            'spelling inside the widget string), so the statusLine command must cd to the project root first'
    );
});

test('cwd-anchor contract: rejects unanchored and `;`-chained forms, accepts both placeholder spellings', () => {
    assert.doesNotMatch('npx -y ccstatusline@2.2.30 --config .claude/ccstatusline.json', CWD_ANCHOR);
    assert.doesNotMatch('cd "$CLAUDE_PROJECT_DIR"; npx -y ccstatusline@2.2.30 --config x', CWD_ANCHOR);
    assert.doesNotMatch('cd $CLAUDE_PROJECT_DIR && npx x', CWD_ANCHOR);
    assert.match('cd "$CLAUDE_PROJECT_DIR" && npx -y ccstatusline@2.2.30 --config x', CWD_ANCHOR);
    assert.match('cd "${CLAUDE_PROJECT_DIR}" && npx x', CWD_ANCHOR);
    assert.equal(isProjectAnchoredPath(configArgOf('npx c --config "$CLAUDE_PROJECT_DIR"/.claude/c.json')), true);
    assert.equal(isProjectAnchoredPath(configArgOf('npx c --config .claude/c.json')), false);
});

test('basenameOf: windows path → last segment', () => {
    assert.equal(basenameOf('D:\\GitSources\\easy-claude'), 'easy-claude');
});

test('basenameOf: posix path → last segment', () => {
    assert.equal(basenameOf('/home/me/projects/easy-claude'), 'easy-claude');
});

test('basenameOf: trailing separator ignored', () => {
    assert.equal(basenameOf('/home/me/easy-claude/'), 'easy-claude');
});

test('basenameOf: mixed separators', () => {
    assert.equal(basenameOf('D:/Git\\easy-claude'), 'easy-claude');
});

test('basenameOf: empty / non-string → empty', () => {
    assert.equal(basenameOf(''), '');
    assert.equal(basenameOf(null), '');
    assert.equal(basenameOf(undefined), '');
    assert.equal(basenameOf(42), '');
});

test('precedence: project_dir wins over current_dir and cwd', () => {
    assert.equal(
        projectFolderName({
            workspace: { project_dir: '/a/root-proj', current_dir: '/a/root-proj/sub' },
            cwd: '/a/root-proj/sub'
        }),
        'root-proj'
    );
});

test('precedence: falls back to current_dir when project_dir absent', () => {
    assert.equal(projectFolderName({ workspace: { current_dir: '/x/curr' } }), 'curr');
});

test('precedence: falls back to cwd when workspace absent', () => {
    assert.equal(projectFolderName({ cwd: '/y/cwd-proj' }), 'cwd-proj');
});

test('subdir stability: deep current_dir does not change the project name', () => {
    assert.equal(
        projectFolderName({
            workspace: {
                project_dir: 'D:\\GitSources\\easy-claude',
                current_dir: 'D:\\GitSources\\easy-claude\\.claude\\scripts'
            }
        }),
        'easy-claude'
    );
});

test('empty payload → empty string', () => {
    assert.equal(projectFolderName({}), '');
});
