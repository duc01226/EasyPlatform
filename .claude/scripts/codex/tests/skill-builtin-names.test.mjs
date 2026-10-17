// A project skill named like a Claude Code built-in command or bundled skill takes over that
// built-in's `/name` (https://code.claude.com/docs/en/skills, "Resolve skills that share a name"),
// so the built-in silently disappears from the session. The framework shipped `code-review`,
// `security-review`, `deep-research`, `release-notes` and `design` that way; they were renamed to
// `code-quality-review`, `security-audit`, `source-deep-dive`, `release-doc` and `ui-design`.
// An upstream framework refresh has already brought `code-review` back once, so this guard turns
// the next such refresh into a red test instead of a quietly missing built-in.
//
// The collision check runs in every project, because a skill hiding a built-in is a real problem
// wherever it lives. The assertions about the framework's own skill set (which skills exist, which
// collisions the framework owner accepted) run only in the framework repo: an adopting project may
// prune framework skills, and its sync must not turn red for that.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isFrameworkRepo } from './framework-repo.helper.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const frameworkOnly = { skip: isFrameworkRepo(repo) ? false : "asserts the framework repo's own skill set (framework-repo signal)" };

// Built-in command and bundled-skill names, aliases included, from the "All commands" table of
// https://code.claude.com/docs/en/commands as of 2026-09-28. Built-ins added later are not
// caught until they are listed here; refresh the list from that page when Claude Code adds one.
const BUILTIN_NAMES = new Set([
    'add-dir', 'advisor', 'agents', 'allowed-tools', 'android', 'app', 'artifacts', 'auto-mode-setup',
    'autocompact', 'autofix-pr', 'background', 'batch', 'bg', 'branch', 'btw', 'bug', 'cd', 'checkpoint',
    'checkup', 'chrome', 'claude-api', 'clear', 'code-review', 'color', 'compact', 'config', 'context',
    'continue', 'copy', 'cost', 'dataviz', 'debug', 'deep-research', 'design', 'design-login',
    'design-sync', 'desktop', 'diff', 'doctor', 'effort', 'exit', 'export', 'fast', 'feedback',
    'fewer-permission-prompts', 'focus', 'fork', 'goal', 'heapdump', 'help', 'hooks', 'ide', 'import',
    'init', 'insights', 'install-github-app', 'install-slack-app', 'ios', 'keybindings', 'list-agents',
    'login', 'logout', 'loop', 'mcp', 'memory', 'mobile', 'model', 'new', 'output-style', 'passes',
    'permissions', 'plan', 'plugin', 'powerup', 'pr-comments', 'privacy-settings', 'proactive', 'quit',
    'radio', 'rate-limit-options', 'rc', 'recap', 'release-notes', 'reload-plugins', 'reload-skills',
    'remote-control', 'remote-env', 'rename', 'reset', 'resume', 'review', 'rewind', 'routines', 'run',
    'run-skill-generator', 'sandbox', 'schedule', 'scroll-speed', 'security-review', 'settings',
    'setup-bedrock', 'setup-vertex', 'share', 'simplify', 'skill-doctor', 'skills', 'stats', 'status',
    'statusline', 'stickers', 'stop', 'subtask', 'tasks', 'team-onboarding', 'teleport',
    'terminal-setup', 'theme', 'tui', 'ultraplan', 'ultrareview', 'undo', 'update-config', 'upgrade',
    'usage', 'usage-credits', 'verify', 'vim', 'voice', 'web-setup', 'workflow-authoring', 'workflows',
]);

// Collisions the framework owner chose to keep. Each entry needs a reason; an entry that no longer
// collides fails (framework repo only).
const ACCEPTED = new Map([
    ['plan', 'owner decision 2026-09-28: /plan is the project planning skill on purpose, and the built-in plan mode stays reachable'],
]);

// Claude Code compares command names case-insensitively.
const key = name => name.trim().toLowerCase();

// Every `.claude/skills/<dir>/SKILL.md` in the project, root and nested: Claude Code also loads
// skills from `.claude/skills` in subdirectories (monorepo packages). The root folder is always
// read from disk, so the framework's own skills are checked whatever git ignores. git only adds
// nested folders: it lists tracked plus untracked-but-not-ignored files, which skips node_modules,
// build output and other worktrees a directory walk would descend into. git is asked only when
// the project IS the git work tree: a bundle copied into an ignored folder of another repository
// (the portable full-sync test exports into tmp/) would otherwise get an empty listing.
// `env` lets the fixture test run git with its isolated config: a developer's global excludesFile
// could otherwise hide the fixture's untracked skill folders.
function isOwnGitRoot(root, env) {
    const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8', env });
    if (top.status !== 0) return false;
    // .native: the JS realpath keeps Windows 8.3 short names (C:\Users\ABC~1\...) while git reports
    // the long path, so the identity check would fail and nested folders would go unscanned.
    try {
        return fs.realpathSync.native(top.stdout.trim()) === fs.realpathSync.native(root);
    } catch {
        return false;
    }
}

function skillFiles(root, env = process.env) {
    const skillsDir = path.join(root, '.claude', 'skills');
    // `__golden__` is the sibling `skill-layout-golden` test's scratch skill, created and removed
    // in the live tree while this suite runs; reading it races that test's cleanup.
    const top = fs.existsSync(skillsDir)
        ? fs.readdirSync(skillsDir, { withFileTypes: true })
            .filter(entry => entry.isDirectory() && entry.name !== '__golden__' && fs.existsSync(path.join(skillsDir, entry.name, 'SKILL.md')))
            .map(entry => path.posix.join('.claude/skills', entry.name, 'SKILL.md'))
        : [];
    const listed = isOwnGitRoot(root, env)
        ? spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ':(glob)**/.claude/skills/*/SKILL.md'], { cwd: root, encoding: 'utf8', env })
        : null;
    const nested = listed && listed.status === 0
        ? listed.stdout.split('\0').filter(file => file && !file.startsWith('.claude/') && fs.existsSync(path.join(root, file)))
        : [];
    return [...new Set([...top, ...nested])];
}

function projectSkills(root, env) {
    return skillFiles(root, env).map(file => {
        const dir = path.basename(path.dirname(file));
        const body = fs.readFileSync(path.join(root, file), 'utf8');
        const frontmatter = body.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        // [ \t]* rather than \s*: under the m flag \s crosses a line break, so a blank `name:` would
        // capture the next frontmatter line instead of falling back to the folder name. A trailing
        // YAML comment (`name: simplify # note`) is not part of the name.
        const name = frontmatter?.[1].match(/^name:[ \t]*["']?([^"'#\r\n]+?)["']?[ \t]*(?:#[^\r\n]*)?\r?$/m)?.[1];
        return { dir, file: path.posix.dirname(file), name: name ?? dir };
    });
}

function collisions(skills) {
    return skills.flatMap(({ dir, file, name }) =>
        [...new Set([key(dir), key(name)])]
            .filter(candidate => BUILTIN_NAMES.has(candidate) && !ACCEPTED.has(candidate))
            .map(candidate => `${file}/ (${candidate === key(dir) ? 'folder' : 'name:'} "${candidate}") hides the built-in /${candidate}`));
}

test('the skill scan finds project skills, so the collision check cannot pass vacuously', () => {
    assert.ok(projectSkills(repo).length > 0, 'the skill scan found no .claude/skills/*/SKILL.md');
});

test('the skill scan finds the framework skills it must police', frameworkOnly, () => {
    const dirs = projectSkills(repo).filter(skill => skill.file.startsWith('.claude/skills/')).map(skill => skill.dir);
    assert.ok(dirs.length > 50, `expected the full skill set, found ${dirs.length}`);
    for (const known of ['code-quality-review', 'security-audit', 'ui-design', 'plan']) assert.ok(dirs.includes(known), `scan missed ${known}`);
});

test('no project skill takes the name of a Claude Code built-in unless the collision is accepted', () => {
    const found = collisions(projectSkills(repo));
    assert.deepEqual(found, [], `Rename these skills so the built-ins stay reachable:\n${found.join('\n')}`);
});

test('every accepted collision still exists and is still a built-in name', frameworkOnly, () => {
    const names = new Set(projectSkills(repo).flatMap(({ dir, name }) => [key(dir), key(name)]));
    for (const [name, reason] of ACCEPTED) {
        assert.ok(reason.length > 0, `${name} needs a reason`);
        assert.ok(BUILTIN_NAMES.has(name), `${name} is no longer a built-in name; remove it from ACCEPTED`);
        assert.ok(names.has(name), `no project skill is named ${name}; remove it from ACCEPTED`);
    }
});

// The real tree has no nested skill folders and every skill's `name:` equals its folder, so the
// frontmatter parser and the nested git discovery above are proven on a fixture project instead.
const gitMissing = spawnSync('git', ['--version'], { encoding: 'utf8' }).status !== 0;
test('the scan reads name: overrides, folder names, any case, nested skill folders, and skips ignored ones', { skip: gitMissing ? 'git is not available' : false }, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-builtin-names-'));
    const write = (rel, text) => {
        fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
        fs.writeFileSync(path.join(root, rel), text);
    };
    try {
        write('.claude/skills/probe/SKILL.md', '---\nname: simplify # probe\ndescription: x\n---\n');
        write('.claude/skills/blank/SKILL.md', '---\nname:\ndescription: design\n---\n');
        write('.claude/skills/stats/SKILL.md', '---\nname: other-name\n---\n');
        write('.claude/skills/mixed/SKILL.md', '---\nname: Code-Review\n---\n');
        write('packages/app/.claude/skills/review/SKILL.md', '---\nname: review\n---\n');
        write('node_modules/dep/.claude/skills/debug/SKILL.md', '---\nname: debug\n---\n');
        write('.gitignore', 'node_modules/\n');
        // Isolated from the developer's git config (hooks, templates) per the portable test contract.
        // Every inherited GIT_* key goes (repo redirection, `git -c` GIT_CONFIG_PARAMETERS/COUNT), and
        // XDG_CONFIG_HOME too: git reads its default ignore file from there whatever GIT_CONFIG_GLOBAL
        // says. Names compare case-insensitively because Windows env names do.
        const overrides = { HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: path.join(root, '.gitconfig-none') };
        const replaced = new Set([...Object.keys(overrides), 'XDG_CONFIG_HOME']);
        const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.toUpperCase().startsWith('GIT_') && !replaced.has(name.toUpperCase())));
        Object.assign(env, overrides);
        assert.equal(spawnSync('git', ['init', '-q'], { cwd: root, env }).status, 0, 'git init failed');

        const skills = projectSkills(root, env);
        const byDir = Object.fromEntries(skills.map(skill => [skill.dir, skill]));
        assert.equal(byDir.probe?.name, 'simplify', 'a trailing YAML comment must not become part of name:');
        assert.equal(byDir.blank?.name, 'blank', 'a blank name: falls back to the folder, never the next line');
        assert.equal(byDir.review?.file, 'packages/app/.claude/skills/review', 'nested .claude/skills folders are scanned');
        assert.equal(byDir.debug, undefined, 'git-ignored folders are not scanned');

        const found = collisions(skills);
        assert.ok(found.some(line => line.includes('"simplify"')), 'a name: override that hides a built-in is reported');
        assert.ok(found.some(line => line.includes('/review')), 'a nested skill that hides a built-in is reported');
        assert.ok(!found.some(line => line.includes('"design"')), 'a blank name: must not read the next frontmatter line');
        assert.ok(found.some(line => line.includes('(folder "stats")')), 'a folder named like a built-in is reported even when name: differs');
        assert.ok(found.some(line => line.includes('mixed/ (name: "code-review")')), 'a name: that differs from a built-in only in case is reported');
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
