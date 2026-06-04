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
