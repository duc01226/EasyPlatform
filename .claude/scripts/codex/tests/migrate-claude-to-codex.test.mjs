import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { isFrameworkRepo } from './framework-repo.helper.mjs';

const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const sourceScriptsDir = path.join(repoRoot, '.claude', 'scripts', 'codex');
const migrateScript = path.join(sourceScriptsDir, 'migrate-claude-to-codex.mjs');
const runnerScript = path.join(repoRoot, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs');
const subagentAuthorizationSnippet =
    'Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.';

async function pathExists(targetPath) {
    try {
        await fs.access(targetPath);
        return true;
    } catch {
        return false;
    }
}

async function copyPortableCodexTooling(tempRoot) {
    const targetScriptsDir = path.join(tempRoot, '.claude', 'scripts', 'codex');
    const targetLibDir = path.join(tempRoot, '.claude', 'scripts', 'lib');
    await fs.mkdir(targetScriptsDir, { recursive: true });
    await fs.mkdir(targetLibDir, { recursive: true });
    const entries = await fs.readdir(sourceScriptsDir, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.mjs')) continue;
        await fs.copyFile(path.join(sourceScriptsDir, entry.name), path.join(targetScriptsDir, entry.name));
    }

    const sourceLibDir = path.join(repoRoot, '.claude', 'scripts', 'lib');
    const libEntries = await fs.readdir(sourceLibDir, { withFileTypes: true });
    for (const entry of libEntries) {
        if (!entry.isFile() || !/\.(cjs|mjs)$/.test(entry.name)) continue;
        await fs.copyFile(path.join(sourceLibDir, entry.name), path.join(targetLibDir, entry.name));
    }

    const sharedTarget = path.join(tempRoot, '.claude', 'skills', 'shared');
    await fs.mkdir(sharedTarget, { recursive: true });
    await fs.copyFile(
        path.join(repoRoot, '.claude', 'skills', 'shared', 'workflow-first-gate.md'),
        path.join(sharedTarget, 'workflow-first-gate.md')
    );
}

test('migrate-claude-to-codex mirrors skills without injecting any protocol block', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-migrate-'));
    try {
        const skillDir = path.join(tempRoot, '.claude', 'skills', 'sample-skill');
        const planSkillDir = path.join(tempRoot, '.claude', 'skills', 'plan');
        const codeSimplifierSkillDir = path.join(tempRoot, '.claude', 'skills', 'code-simplifier');
        const codexSyncSkillDir = path.join(tempRoot, '.claude', 'skills', 'sync-codex');
        const portableSourceScriptsDir = path.join(tempRoot, '.claude', 'scripts', 'codex');
        const agentsDir = path.join(tempRoot, '.claude', 'agents');
        const codexDir = path.join(tempRoot, '.codex');
        await fs.mkdir(skillDir, { recursive: true });
        await fs.mkdir(planSkillDir, { recursive: true });
        await fs.mkdir(codeSimplifierSkillDir, { recursive: true });
        await fs.mkdir(codexSyncSkillDir, { recursive: true });
        await fs.mkdir(portableSourceScriptsDir, { recursive: true });
        await fs.mkdir(agentsDir, { recursive: true });
        await fs.mkdir(codexDir, { recursive: true });

        await fs.writeFile(
            path.join(skillDir, 'SKILL.md'),
            [
                '---',
                'name: sample-skill',
                "description: 'Sample skill for migration test'",
                '---',
                '',
                '# Sample Skill',
                '',
                'Use /plan for planning.',
                'Plan directory: `{plan-dir}/plan.md` + `{plan-dir}/research/*.md`.',
                'Run /simplify after implementation.',
                'Agent({ subagent_type: "architect", prompt: "review" })',
                'Agent(example-review, subagent_type="code-reviewer", ...)',
                'Use the specialized subagent_type when one exists.',
                'STOP and `AskUserQuestion` whether integration-test --mode=verify ran.',
                ''
            ].join('\n'),
            'utf8'
        );

        await fs.writeFile(path.join(skillDir, 'README.md'), 'Legacy /simplify note.   \r\n', 'utf8');
        await fs.writeFile(path.join(skillDir, 'package.json'), '{\r\n  "name": "sample-skill"\r\n}\r\n', 'utf8');
        await fs.writeFile(path.join(skillDir, 'package-lock.json'), '{\r\n  "lockfileVersion": 3\r\n}\r\n', 'utf8');
        await fs.writeFile(path.join(skillDir, 'config.yaml'), 'name: sample\r\nsteps:\r\n  - plan\r\n', 'utf8');
        await fs.writeFile(path.join(skillDir, 'settings.yml'), 'enabled: true\r\n', 'utf8');

        await fs.writeFile(
            path.join(planSkillDir, 'SKILL.md'),
            ['---', 'name: plan', 'description: Plan', '---', '', '# Plan', ''].join('\n'),
            'utf8'
        );

        await fs.writeFile(
            path.join(codeSimplifierSkillDir, 'SKILL.md'),
            ['---', 'name: code-simplifier', 'description: Code simplifier', '---', '', '# Code Simplifier', ''].join('\n'),
            'utf8'
        );

        await fs.writeFile(
            path.join(tempRoot, '.claude', 'skills', 'sync-codex', 'SKILL.md'),
            ['---', 'name: sync-codex', 'description: Codex sync', '---', '', '# Codex Sync', ''].join('\n'),
            'utf8'
        );

        // State an earlier sync left behind: the retired legacy notify helper's generated copy.
        const legacyNotifyScript = path.join(codexDir, 'scripts', 'codex', 'codex-notify.mjs');
        await fs.mkdir(path.dirname(legacyNotifyScript), { recursive: true });
        await fs.writeFile(legacyNotifyScript, "console.log('legacy notify helper');\n", 'utf8');

        await fs.writeFile(
            path.join(agentsDir, 'sample-agent.md'),
            ['---', 'name: sample-agent', 'description: sample agent', '---', '', 'Agent body.'].join('\n'),
            'utf8'
        );

        await fs.writeFile(
            path.join(tempRoot, '.claude', '.ck.json'),
            JSON.stringify(
                {
                    portability: {
                        rule: 'Custom portable rule from local config.',
                        projectConfigPath: 'custom/project-config.json',
                        docsIndexPath: 'custom/docs-index.md'
                    }
                },
                null,
                2
            ),
            'utf8'
        );

        await fs.writeFile(
            path.join(codexDir, 'config.toml'),
            [
                '# Existing project-specific Codex config.',
                'model = "gpt-5.4"',
                'model_reasoning_effort = "medium"',
                '',
                '# Shared completion notifications. Codex passes a JSON payload to this command.',
                'notify = ["node", ".codex/scripts/codex/codex-notify.mjs"]',
                '',
                '[[profiles]]',
                'name = "dev"',
                '',
                '[tui] # existing UI settings',
                'theme = "dark"',
                'status_line = [',
                '  "model-name",',
                '  "git-branch",',
                ']',
                '',
                '[[servers]] # existing server',
                'name = "s1"',
                '',
                '[agents]',
                'max_threads = 3',
                ''
            ].join('\n'),
            'utf8'
        );

        await execFileAsync(process.execPath, [migrateScript], { cwd: tempRoot });

        const mirroredSkill = await fs.readFile(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'SKILL.md'), 'utf8');
        const mirroredAgent = await fs.readFile(path.join(tempRoot, '.codex', 'agents', 'sample-agent.toml'), 'utf8');
        const mirroredReadme = await fs.readFile(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'README.md'), 'utf8');
        const mirroredPackageJson = await fs.readFile(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'package.json'), 'utf8');
        const mirroredYaml = await fs.readFile(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'config.yaml'), 'utf8');
        const mirroredYml = await fs.readFile(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'settings.yml'), 'utf8');
        const codexConfig = await fs.readFile(path.join(tempRoot, '.codex', 'config.toml'), 'utf8');

        // Shared protocols are delivered by hooks; a mirrored skill carries none of the old static blocks.
        assert.doesNotMatch(mirroredSkill, /CODEX:SYNC-PROMPT-PROTOCOLS|Static Prompt Protocol Mirror|CODEX:PROJECT-REFERENCE-LOADING|LESSON-LEARNED-REMINDER/);
        assert.doesNotMatch(mirroredSkill, /Custom portable rule from local config\./);
        assert.doesNotMatch(mirroredSkill, /WORKFLOW-EXECUTION-PROTOCOL|Auto-select|Workflow Catalog/i);
        assert.doesNotMatch(mirroredSkill, /Lessons Stub/);
        assert.doesNotMatch(mirroredSkill, /Workflow Protocol Stub|Critical Context Stub|Lesson Reminder Stub/);
        assert.doesNotMatch(mirroredSkill, /prompt-injections\.cjs/);
        assert.match(mirroredSkill, new RegExp(subagentAuthorizationSnippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        assert.match(mirroredSkill, /Use \$plan for planning\./);
        assert.match(mirroredSkill, /Plan directory: `\{plan-dir\}\/plan\.md` \+ `\{plan-dir\}\/research\/\*\.md`\./);
        assert.doesNotMatch(mirroredSkill, /\{plan-dir\}\$plan\.md|\{plan-dir\}\$research/);
        assert.match(mirroredSkill, /Run \$code-simplifier after implementation\./);
        assert.match(mirroredSkill, /spawn_agent\(\{ agent_type: "architect"/);
        assert.match(mirroredSkill, /spawn_agent\(example-review, agent_type="code-reviewer"/);
        assert.match(mirroredSkill, /Use the specialized agent_type when one exists\./);
        assert.match(mirroredSkill, /STOP and ask user question tool whether integration-test --mode=verify ran\./);
        assert.doesNotMatch(mirroredSkill, /a direct user question/);
        assert.doesNotMatch(mirroredSkill, /\bAgent\(|\bsubagent_type\b/);
        assert.equal(mirroredReadme, 'Legacy $code-simplifier note.\n');
        assert.equal(mirroredPackageJson, '{\n  "name": "sample-skill"\n}\n');
        // Lockfiles are local install artifacts the source tree ignores; the writer must never mirror them.
        await assert.rejects(fs.access(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'package-lock.json')), { code: 'ENOENT' });
        // The mirror ships its own generated .gitignore so a copied .agents/ never tracks a local install.
        const mirrorGitignore = await fs.readFile(path.join(tempRoot, '.agents', '.gitignore'), 'utf8');
        for (const ignored of ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'node_modules/', '__pycache__/', '.venv/']) {
            assert.ok(mirrorGitignore.split('\n').includes(ignored), `.agents/.gitignore must ignore ${ignored}`);
        }
        assert.equal(mirroredYaml, 'name: sample\nsteps:\n  - plan\n');
        assert.equal(mirroredYml, 'enabled: true\n');
        assert.doesNotMatch(mirroredPackageJson, /\r/);
        assert.doesNotMatch(mirroredYaml, /\r/);
        assert.doesNotMatch(mirroredYml, /\r/);
        assert.match(mirroredAgent, /name = "sample-agent"/);
        assert.match(mirroredAgent, new RegExp(subagentAuthorizationSnippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        // The retired legacy notify runs after every turn of every Codex thread, subagents included,
        // so an upgrading sync removes the line it once managed together with its comment
        assert.doesNotMatch(codexConfig, /^notify\s*=/m, 'the legacy per-thread notify command must be removed');
        assert.doesNotMatch(codexConfig, /Shared completion notifications/);
        // The bundle pins no compaction budget (BR-ADS-20), so the upsert never adds one
        assert.doesNotMatch(codexConfig, /model_auto_compact_token_limit/, 'the sync must not pin a compaction budget');
        assert.doesNotMatch(codexConfig, /^project_doc_max_bytes\s*=/m, 'sync must inherit the native instruction budget');
        assert.match(codexConfig, /\[tui\]/);
        assert.match(codexConfig, /notifications = true/);
        assert.match(codexConfig, /notification_condition = "always"/);
        assert.match(codexConfig, /notification_method = "auto"/);
        assert.match(codexConfig, /status_line = \["model-with-reasoning", "current-dir", "project-root", "context-used", "five-hour-limit", "weekly-limit"\]/);
        assert.match(codexConfig, /# Existing project-specific Codex config\./);
        assert.match(codexConfig, /model = "gpt-5\.4"/);
        assert.match(codexConfig, /model_reasoning_effort = "medium"/);
        assert.match(codexConfig, /theme = "dark"/);
        assert.match(codexConfig, /max_threads = 3/);
        assert.equal([...codexConfig.matchAll(/^\[tui\]/gm)].length, 1);
        assert.equal([...codexConfig.matchAll(/^\[\[servers\]\]/gm)].length, 1);
        assert.equal([...codexConfig.matchAll(/^status_line\s*=/gm)].length, 1);
        assert.doesNotMatch(codexConfig, /"model-name"/);
        assert.ok(codexConfig.indexOf('status_line = ["model-with-reasoning", "current-dir", "project-root", "context-used", "five-hour-limit", "weekly-limit"]') > codexConfig.indexOf('[tui] # existing UI settings'));
        assert.ok(codexConfig.indexOf('status_line = ["model-with-reasoning", "current-dir", "project-root", "context-used", "five-hour-limit", "weekly-limit"]') < codexConfig.indexOf('[[servers]] # existing server'));
        assert.ok(codexConfig.indexOf('notifications = true') > codexConfig.indexOf('[tui] # existing UI settings'));
        assert.ok(codexConfig.indexOf('notifications = true') < codexConfig.indexOf('[[servers]] # existing server'));
        // And the generated copy of the retired helper is deleted with its now-empty directories
        assert.equal(await pathExists(legacyNotifyScript), false, 'the retired notify helper copy must be removed');
        assert.equal(await pathExists(path.join(codexDir, 'scripts')), false);
        assert.equal(await pathExists(path.join(tempRoot, 'scripts', 'codex')), false);

        await execFileAsync(process.execPath, [migrateScript], { cwd: tempRoot });
        const rerunCodexConfig = await fs.readFile(path.join(tempRoot, '.codex', 'config.toml'), 'utf8');
        assert.equal(rerunCodexConfig, codexConfig);
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

test('migrate rejects unknown and duplicate flags before creating output', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-migrate-args-'));
    try {
        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'sample-skill'), { recursive: true });
        await fs.writeFile(
            path.join(tempRoot, '.claude', 'skills', 'sample-skill', 'SKILL.md'),
            ['---', 'name: sample-skill', 'description: Sample skill', '---', '', '# Sample Skill', ''].join('\n'),
            'utf8'
        );

        for (const args of [['--unknown-option'], ['--copy-skills', '--copy-skills']]) {
            await assert.rejects(
                execFileAsync(process.execPath, [migrateScript, ...args], { cwd: tempRoot }),
                error => {
                    assert.equal(error.code, 1);
                    assert.match(error.stderr, /unknown option|duplicate option/);
                    assert.match(error.stderr, /Usage: node/);
                    return true;
                }
            );
            assert.equal(await pathExists(path.join(tempRoot, '.agents')), false);
            assert.equal(await pathExists(path.join(tempRoot, '.codex')), false);
        }
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

test('sync-codex runner works from copied .claude without a root scripts folder', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sync-portable-'));
    try {
        await copyPortableCodexTooling(tempRoot);

        const runnerTarget = path.join(tempRoot, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs');
        await fs.mkdir(path.dirname(runnerTarget), { recursive: true });
        await fs.copyFile(runnerScript, runnerTarget);

        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'sync-codex'), { recursive: true });
        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'sample-skill'), { recursive: true });
        await fs.mkdir(path.join(tempRoot, '.claude', 'agents'), { recursive: true });
        await fs.mkdir(path.join(tempRoot, '.claude', 'hooks', 'lib'), { recursive: true });

        await fs.writeFile(
            path.join(tempRoot, '.claude', 'skills', 'sync-codex', 'SKILL.md'),
            ['---', 'name: sync-codex', 'description: Codex sync', '---', '', '# Codex Sync', ''].join('\n'),
            'utf8'
        );
        await fs.writeFile(
            path.join(tempRoot, '.claude', 'skills', 'sample-skill', 'SKILL.md'),
            ['---', 'name: sample-skill', 'description: Sample skill', '---', '', '# Sample Skill', 'Use /sample-skill.', ''].join('\n'),
            'utf8'
        );
        await fs.writeFile(
            path.join(tempRoot, '.claude', 'settings.json'),
            `${JSON.stringify({ hooks: {} }, null, 2)}\n`,
            'utf8'
        );
        await fs.writeFile(
            path.join(tempRoot, '.claude', 'workflows.json'),
            `${JSON.stringify({ workflows: {} }, null, 2)}\n`,
            'utf8'
        );
        await fs.writeFile(
            path.join(tempRoot, '.claude', '.ck.json'),
            `${JSON.stringify({}, null, 2)}\n`,
            'utf8'
        );
        await execFileAsync(process.execPath, [runnerTarget, '--only=migrate,hooks,context'], { cwd: tempRoot });

        const codexConfig = await fs.readFile(path.join(tempRoot, '.codex', 'config.toml'), 'utf8');
        const mirroredSkill = await fs.readFile(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'SKILL.md'), 'utf8');
        assert.doesNotMatch(codexConfig, /^notify\s*=/m, 'a fresh sync installs no per-thread notify command');
        assert.doesNotMatch(codexConfig, /model_auto_compact_token_limit/, 'a fresh sync pins no compaction budget');
        assert.match(codexConfig, /status_line = \["model-with-reasoning", "current-dir", "project-root", "context-used", "five-hour-limit", "weekly-limit"\]/);
        assert.doesNotMatch(mirroredSkill, /Lessons Stub/);
        assert.doesNotMatch(mirroredSkill, /Workflow Protocol Stub|Critical Context Stub|Lesson Reminder Stub|prompt-injections\.cjs/);
        assert.doesNotMatch(mirroredSkill, /LESSON-LEARNED-REMINDER|CODEX:SYNC-PROMPT-PROTOCOLS/);
        assert.equal(await pathExists(path.join(tempRoot, '.codex', 'scripts', 'codex', 'codex-notify.mjs')), false);
        assert.equal(await pathExists(path.join(tempRoot, 'scripts')), false);
        assert.equal(await pathExists(path.join(tempRoot, 'AGENTS.md')), true);
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

test('sync-codex runner forwards copy-skills to migrate stage', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sync-copy-skills-'));
    try {
        await copyPortableCodexTooling(tempRoot);

        const runnerTarget = path.join(tempRoot, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs');
        await fs.mkdir(path.dirname(runnerTarget), { recursive: true });
        await fs.copyFile(runnerScript, runnerTarget);

        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'sample-skill'), { recursive: true });
        await fs.writeFile(
            path.join(tempRoot, '.claude', 'skills', 'sample-skill', 'SKILL.md'),
            ['---', 'name: sample-skill', 'description: Sample skill', '---', '', '# Sample Skill', ''].join('\n'),
            'utf8'
        );

        const { stdout } = await execFileAsync(
            process.execPath,
            [runnerTarget, '--only=migrate', '--copy-skills', '--verbose'],
            { cwd: tempRoot }
        );
        const rerun = await execFileAsync(
            process.execPath,
            [runnerTarget, '--only=migrate', '--copy-skills', '--verbose'],
            { cwd: tempRoot }
        );

        const mirroredSkillExists = await pathExists(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'SKILL.md'));
        const sentinelExists = await pathExists(path.join(tempRoot, '.agents', 'skills', '.codex-mirror.json'));
        assert.match(stdout, /skills setup: copied \+ sanitized \+ rewritten 1 skill manifest/);
        assert.match(rerun.stdout, /skills setup: copied \+ sanitized \+ rewritten 1 skill manifest/);
        assert.equal(mirroredSkillExists, true);
        assert.equal(sentinelExists, true);
        assert.equal(await pathExists(path.join(tempRoot, 'scripts')), false);
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

async function withWorkflowRunnerFixture(body) {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sync-workflow-'));
    try {
        await copyPortableCodexTooling(tempRoot);
        const runner = path.join(tempRoot, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs');
        await fs.mkdir(path.dirname(runner), { recursive: true });
        await fs.copyFile(runnerScript, runner);
        await fs.mkdir(path.join(tempRoot, '.claude', 'agents'), { recursive: true });
        for (const name of ['sample-skill', 'start-workflow', 'sync-codex']) {
            const dir = path.join(tempRoot, '.claude', 'skills', name);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(path.join(dir, 'SKILL.md'),
                ['---', `name: ${name}`, 'description: Fixture skill', '---', '', `# ${name}`, ''].join('\n'), 'utf8');
        }
        const workflowId = 'workflow-fixture';
        const sourceFile = path.join(tempRoot, '.claude', 'skills', workflowId, 'SKILL.md');
        const mirrorFile = path.join(tempRoot, '.agents', 'skills', workflowId, 'SKILL.md');
        const registryFile = path.join(tempRoot, '.claude', 'workflows.json');
        const authored = '\n## Quality\nPreserve authored review evidence.\n';
        const stale = [
            '---', `name: ${workflowId}`, 'description: Fixture workflow', '---', '',
            '<!-- WORKFLOW-CALLS:START -->',
            'Stale workflow call: /sample-skill --mode=old',
            '<!-- WORKFLOW-CALLS:END -->',
        ].join('\n') + authored;
        await fs.mkdir(path.dirname(sourceFile), { recursive: true });
        await fs.writeFile(sourceFile, stale, 'utf8');
        const document = { version: '1', workflows: { [workflowId]: {
            preActions: { injectContext: 'Fixture quality context', readFiles: [`.claude/skills/${workflowId}/SKILL.md`] },
            defaultMode: 'build',
            variants: {
                build: { sequence: [{ id: 'build-sample', skill: 'sample-skill', args: '--mode=build' }] },
                audit: { sequence: [{ id: 'audit-sample', skill: 'sample-skill', args: '--mode=fresh' }] },
            },
        } } };
        const saveRegistry = () => fs.writeFile(registryFile, JSON.stringify(document), 'utf8');
        await saveRegistry();
        const env = cleanMachineEnv(tempRoot);
        const run = flags => execFileAsync(process.execPath, [runner, ...flags], { cwd: tempRoot, env });
        await body({ tempRoot, run, document, saveRegistry, sourceFile, mirrorFile, registryFile, stale, authored });
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
}

// Intent: the documented sync command refreshes workflow source before publishing its Codex mirror.
test('sync runner refreshes every workflow mode before mirroring and is idempotent', async () => {
    await withWorkflowRunnerFixture(async ({ run, sourceFile, mirrorFile, registryFile, authored }) => {
        // Given a stale source call block and a registry whose nondefault mode has fresh args.
        const registry = await fs.readFile(registryFile, 'utf8');
        // When the actual copied coordinator runs its migration stage.
        await run(['--only=migrate', '--copy-skills']);
        const source = await fs.readFile(sourceFile, 'utf8');
        const mirror = await fs.readFile(mirrorFile, 'utf8');
        // Then both owned artifacts contain the new mode's call, in their native dialects.
        assert.match(source, /\/sample-skill --mode=fresh/);
        assert.match(mirror, /\$sample-skill --mode=fresh/);
        assert.match(source, /\/sample-skill --mode=build/);
        assert.match(mirror, /\$sample-skill --mode=build/);
        assert.match(source, /Todo FIRST/);
        assert.match(mirror, /Todo FIRST/);
        assert.doesNotMatch(source, /--mode=old/);
        assert.doesNotMatch(mirror, /--mode=old/);
        assert.ok(source.endsWith(authored), 'source refresh preserves authored quality bytes');
        assert.equal(await fs.readFile(registryFile, 'utf8'), registry, 'projection never changes its registry');
        // And repeating the same sync changes neither source nor mirrored workflow guidance.
        await run(['--only=migrate', '--copy-skills']);
        assert.equal(await fs.readFile(sourceFile, 'utf8'), source);
        assert.equal(await fs.readFile(mirrorFile, 'utf8'), mirror);
    });
});

// Intent: a read-only request cannot refresh workflow source even when it names the mutating stage.
test('verify-only excludes workflow refresh and leaves stale source untouched', async () => {
    await withWorkflowRunnerFixture(async ({ tempRoot, run, sourceFile, stale }) => {
        // Given stale guidance; when read-only selection names only migration.
        await assert.rejects(run(['--verify-only', '--only=migrate']), error => {
            assert.equal(error.code, 1);
            assert.match(error.stderr, /no stages selected/);
            return true;
        });
        // Then rejection performs no refresh or mirror/config publication.
        assert.equal(await fs.readFile(sourceFile, 'utf8'), stale);
        assert.equal(await pathExists(path.join(tempRoot, '.agents')), false);
        assert.equal(await pathExists(path.join(tempRoot, '.codex')), false);
    });
});

// Intent: a malformed later workflow aborts the coordinator before any source or mirror publication.
test('invalid later workflow aborts migration without publishing earlier valid candidates', async () => {
    await withWorkflowRunnerFixture(async ({ tempRoot, run, document, saveRegistry, sourceFile, stale }) => {
        // Given an earlier valid candidate followed by an invalid workflow.
        document.workflows['workflow-broken'] = { sequence: ['missing-skill'] };
        await saveRegistry();
        // When the documented copied coordinator would regenerate and migrate.
        await assert.rejects(run(['--only=migrate', '--copy-skills']), error => {
            assert.equal(error.code, 1);
            assert.match(error.stderr, /aborted at stage 'migrate'/);
            return true;
        });
        // Then no earlier source candidate or generated Codex surface was published.
        assert.equal(await fs.readFile(sourceFile, 'utf8'), stale);
        assert.equal(await pathExists(path.join(tempRoot, '.agents')), false);
        assert.equal(await pathExists(path.join(tempRoot, '.codex')), false);
    });
});


test('migrate refuses unmanaged .agents skills in skills-only project', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sync-unmanaged-agents-'));
    try {
        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'sample-skill'), { recursive: true });
        await fs.mkdir(path.join(tempRoot, '.agents', 'skills', 'foreign-skill'), { recursive: true });
        await fs.writeFile(
            path.join(tempRoot, '.claude', 'skills', 'sample-skill', 'SKILL.md'),
            ['---', 'name: sample-skill', 'description: Sample skill', '---', '', '# Sample Skill', ''].join('\n'),
            'utf8'
        );
        await fs.writeFile(
            path.join(tempRoot, '.agents', 'skills', 'foreign-skill', 'SKILL.md'),
            ['---', 'name: foreign-skill', 'description: Foreign skill', '---', '', '# Foreign Skill', ''].join('\n'),
            'utf8'
        );

        await assert.rejects(
            execFileAsync(process.execPath, [migrateScript], { cwd: tempRoot }),
            /Refusing to remove .*\.agents.*skills/
        );
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

test('migrate refuses unmanaged .agents skills even when marker text exists', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sync-unmanaged-marker-'));
    try {
        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'sample-skill'), { recursive: true });
        await fs.mkdir(path.join(tempRoot, '.agents', 'skills', 'foreign-skill'), { recursive: true });
        await fs.writeFile(
            path.join(tempRoot, '.claude', 'skills', 'sample-skill', 'SKILL.md'),
            ['---', 'name: sample-skill', 'description: Sample skill', '---', '', '# Sample Skill', ''].join('\n'),
            'utf8'
        );
        await fs.writeFile(
            path.join(tempRoot, '.agents', 'skills', 'foreign-skill', 'SKILL.md'),
            [
                '---',
                'name: foreign-skill',
                'description: Foreign skill',
                '---',
                '',
                '> Codex compatibility note:',
                '',
                '# Foreign Skill',
                ''
            ].join('\n'),
            'utf8'
        );

        await assert.rejects(
            execFileAsync(process.execPath, [migrateScript], { cwd: tempRoot }),
            /Refusing to remove .*\.agents.*skills/
        );
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

// Business intent: the skill mirror carries only what the source tree tracks. `.claude/.gitignore`
// keeps package-manager lockfiles out of `.claude/skills`, so a mirrored lockfile exists only on the
// machine that ran `npm install` and makes a clean checkout fail the sync-divergence gate.
test('skill mirror excludes local package-manager lockfiles but keeps real skill files', async () => {
    const { isMirroredSkillSource } = await import(pathToFileURL(migrateScript).href);
    for (const lockfile of ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']) {
        assert.equal(isMirroredSkillSource(path.join('docx-convert', 'to-docx', lockfile)), false, `${lockfile} must not be mirrored`);
    }
    assert.equal(isMirroredSkillSource(path.join('pdf-convert', 'to-pdf', 'node_modules', 'x', 'index.js')), false);
    assert.equal(isMirroredSkillSource(path.join('shared', 'workflow-first-gate.md')), false);
    assert.equal(isMirroredSkillSource(path.join('docx-convert', 'to-docx', 'package.json')), true);
    assert.equal(isMirroredSkillSource(path.join('commit', 'SKILL.md')), true);
});

// Business intent: OS metadata a desktop file browser leaves in the source tree (macOS .DS_Store,
// Windows Thumbs.db / desktop.ini) is not skill content. Copying it puts a machine-local file in the
// generated mirror, and the divergence gate ignores such files, so nothing would ever report it.
test('skill mirror leaves OS metadata files in the source tree behind but keeps real skill files', async () => {
    const { isMirroredSkillSource } = await import(pathToFileURL(migrateScript).href);
    for (const rel of ['.DS_Store', path.join('sample-skill', '.DS_Store'), path.join('sample-skill', 'references', 'Thumbs.db'), path.join('sample-skill', 'Desktop.ini')]) {
        assert.equal(isMirroredSkillSource(rel), false, `${rel} must not be mirrored`);
    }
    assert.equal(isMirroredSkillSource(path.join('sample-skill', 'notes.DS_Store.md')), true, 'a name that merely contains a metadata name is real content');

    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sync-os-metadata-'));
    const source = (...parts) => path.join(tempRoot, '.claude', 'skills', ...parts);
    const mirror = (...parts) => path.join(tempRoot, '.agents', 'skills', ...parts);
    try {
        // Given a skill whose source folders a file browser has had open
        await fs.mkdir(source('sample-skill', 'references'), { recursive: true });
        await fs.writeFile(source('sample-skill', 'SKILL.md'), ['---', 'name: sample-skill', 'description: Sample skill', '---', '', '# Sample Skill', ''].join('\n'), 'utf8');
        await fs.writeFile(source('sample-skill', 'references', 'guide.md'), 'guide\n', 'utf8');
        await fs.writeFile(source('sample-skill', 'notes.DS_Store.md'), 'notes\n', 'utf8');
        await fs.writeFile(source('.DS_Store'), Buffer.from([0, 0, 0, 1, 0x42, 0x75, 0x64, 0x31]));
        await fs.writeFile(source('sample-skill', '.DS_Store'), Buffer.from([0, 0, 0, 1, 0x42, 0x75, 0x64, 0x31]));
        await fs.writeFile(source('sample-skill', 'references', 'Thumbs.db'), Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
        await fs.writeFile(source('sample-skill', 'desktop.ini'), '[.ShellClassInfo]\r\n', 'utf8');

        // When the Codex mirror is generated
        await execFileAsync(process.execPath, [migrateScript], { cwd: tempRoot, env: cleanMachineEnv(tempRoot) });

        // Then the mirror holds the skill's real files and none of the metadata
        for (const parts of [['.DS_Store'], ['sample-skill', '.DS_Store'], ['sample-skill', 'references', 'Thumbs.db'], ['sample-skill', 'desktop.ini']]) {
            assert.equal(await pathExists(mirror(...parts)), false, `${parts.join('/')} must not reach the mirror`);
        }
        assert.equal(await pathExists(mirror('sample-skill', 'SKILL.md')), true, 'the skill manifest is still mirrored');
        assert.equal(await fs.readFile(mirror('sample-skill', 'references', 'guide.md'), 'utf8'), 'guide\n');
        assert.equal(await fs.readFile(mirror('sample-skill', 'notes.DS_Store.md'), 'utf8'), 'notes\n');
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

// Business intent: the divergence gate ignores exactly what a copied mirror's .gitignore ignores
// (a local install), but still reports a stray runtime-only or hand-added file.
test('local install artifacts are recognised at any depth with either separator; real files are not', async () => {
    const { isLocalInstallArtifact, buildAgentsMirrorGitignore } = await import(pathToFileURL(migrateScript).href);
    for (const rel of ['docx-convert/to-docx/package-lock.json', 'a\\b\\yarn.lock', 'pdf-convert/node_modules', 'x/node_modules/y/z.js', 'pnpm-lock.yaml']) {
        assert.equal(isLocalInstallArtifact(rel), true, `${rel} is a local install artifact`);
    }
    for (const rel of ['docx-convert/to-docx/package.json', 'shared/workflow-first-gate.md', 'commit/SKILL.md', 'some-skill/references/uv.lock']) {
        assert.equal(isLocalInstallArtifact(rel), false, `${rel} is not a local install artifact`);
    }
    // Every non-VCS directory the divergence gate skips must also be git-ignored, or a committed
    // bytecode cache / venv slips past both.
    const lines = buildAgentsMirrorGitignore().split('\n');
    for (const ignored of ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'node_modules/', '__pycache__/', '.venv/']) {
        assert.ok(lines.includes(ignored), `generated .gitignore lists ${ignored}`);
        const sample = ignored.endsWith('/') ? `s/${ignored}f` : `s/${ignored}`;
        assert.equal(isLocalInstallArtifact(sample), true, `${ignored} is also skipped by the gate`);
    }
    assert.ok(!lines.includes('.git/'), 'VCS metadata is not an install artifact to ignore');
});

// Business intent: the sync owns only its marked block — an adopter's own .agents/.gitignore
// rules survive every sync, and re-running the sync is idempotent.
test('mirror .gitignore preserves adopter content outside the managed block and is idempotent', async () => {
    const { buildAgentsMirrorGitignore } = await import(pathToFileURL(migrateScript).href);
    const adopter = '# team rule\nplugins/cache/\n';
    const first = buildAgentsMirrorGitignore(adopter);
    assert.ok(first.startsWith(adopter), 'adopter rules kept verbatim ahead of the block');
    assert.ok(first.includes('node_modules/'));
    assert.equal(buildAgentsMirrorGitignore(first), first, 'second sync rewrites only the block');
    const stale = first.replace('node_modules/', 'stale-entry/');
    assert.equal(buildAgentsMirrorGitignore(stale), first, 'a hand-edited block is regenerated');
    assert.equal(buildAgentsMirrorGitignore(first.replace(/\n/g, '\r\n')), first, 'CRLF input converges');
    // A hand-damaged block (either marker deleted) must never make a later sync delete adopter rules.
    const [startMarker] = first.split('\n').filter(line => line.startsWith('# >>> codex-sync'));
    for (const damaged of [`keep1\n${startMarker}\nkeep2\n`, 'keep1\n# <<< codex-sync\nkeep2\n']) {
        const once = buildAgentsMirrorGitignore(damaged);
        const twice = buildAgentsMirrorGitignore(once);
        assert.equal(twice, once, 'damaged input converges after one sync');
        for (const kept of ['keep1', 'keep2']) assert.ok(twice.includes(kept), `${kept} survives repeated syncs`);
    }
});

test('Codex config upsert removes only the retired framework notify command and keeps a project notify', async () => {
    // Given the adopter config upsert
    const { upsertCodexNotificationConfig } = await import(pathToFileURL(migrateScript).href);
    const notifyLines = text => text.split('\n').filter(line => /^\s*notify\s*=/.test(line));
    // When a config still carries the framework's retired helper, in any spacing or trailing comma
    for (const legacy of [
        'notify = ["node", ".codex/scripts/codex/codex-notify.mjs"]',
        'notify=["node",".codex/scripts/codex/codex-notify.mjs",] # old helper',
        'notify = [\n  "node",\n  ".codex/scripts/codex/codex-notify.mjs",\n]',
    ]) {
        // Then that command is removed: Codex runs it after every turn of every thread, subagents included
        const updated = upsertCodexNotificationConfig(`model = "m"\n\n${legacy}\n\n[tui]\ntheme = "dark"\n`);
        assert.deepEqual(notifyLines(updated), [], `retired helper must be removed: ${legacy}`);
        assert.match(updated, /^model = "m"$/m);
        assert.doesNotMatch(updated, /codex-notify\.mjs/);
    }
    // When the project wrote its own comment directly above the retired line
    const withOwnComment = upsertCodexNotificationConfig('# notify = ["python3", "mine.py"] kept for later\nnotify = ["node", ".codex/scripts/codex/codex-notify.mjs"]\n');
    // Then only the retired command goes; the project's comment stays
    assert.deepEqual(notifyLines(withOwnComment), []);
    assert.match(withOwnComment, /^# notify = \["python3", "mine\.py"\] kept for later$/m);
    // When the project configured its own notify command
    for (const own of ['notify = ["python3", "hooks/notify.py"]', 'notify = ["node", ".codex/scripts/codex/codex-notify.mjs", "--extra"]']) {
        // Then it is a project choice and stays exactly as written
        assert.deepEqual(notifyLines(upsertCodexNotificationConfig(`${own}\n`)), [own], `project notify must stay: ${own}`);
    }
    // And the upsert never installs a notify command itself, and stays idempotent
    const fresh = upsertCodexNotificationConfig('');
    assert.deepEqual(notifyLines(fresh), []);
    assert.equal(upsertCodexNotificationConfig(fresh), fresh);
});

test('Codex config sync inherits native instruction limits and retires only the former bundled allowance', async () => {
    const { upsertCodexNotificationConfig } = await import(pathToFileURL(migrateScript).href);
    const keyLines = text => text.split('\n').filter(line => /project_doc_max_bytes/.test(line));

    assert.deepEqual(keyLines(upsertCodexNotificationConfig('')), [], 'fresh configs inherit the host default');
    for (const former of ['project_doc_max_bytes = 98304', '  project_doc_max_bytes=98304 # former bundle']) {
        const migrated = upsertCodexNotificationConfig(`# project comment\r\n${former}\r\nmodel = "mine"\r\n`);
        assert.deepEqual(keyLines(migrated), [], 'the exact old bundled allowance is removed');
        assert.match(migrated, /^# project comment$/m, 'project comments are preserved');
        assert.match(migrated, /^model = "mine"$/m, 'unrelated settings are preserved');
        assert.equal(upsertCodexNotificationConfig(migrated), migrated, 'a second sync is stable');
    }

    // A smaller custom allowance matters as much as a larger one. Alternate spellings of the
    // former value were never written by this generator and therefore remain user-owned too.
    for (const value of ['16384', '32768', '262144', '262_144', '0x40000', '0x4_0000', '0o1000000',
        '0b1000000000000000000', '+262_144', '0x8000', '0o100000', '0b1000000000000000', '32_768',
        '98_304', '0x18000', '"262144"', '0x_40000']) {
        const own = `project_doc_max_bytes = ${value}`;
        const notices = [];
        const updated = upsertCodexNotificationConfig(`${own}\n`, { onNotice: text => notices.push(text) });
        assert.deepEqual(keyLines(updated), [own], `custom allowance is preserved: ${value}`);
        assert.deepEqual(notices, [`kept user-set project_doc_max_bytes=${value}`]);
        assert.equal(upsertCodexNotificationConfig(updated), updated, 'custom choices survive repeated syncs');
    }

    for (const own of ['"project_doc_max_bytes" = 98304', "'project_doc_max_bytes' = 32768"]) {
        assert.deepEqual(keyLines(upsertCodexNotificationConfig(`${own}\n`)), [own], 'quoted user keys are preserved');
    }
    const nested = upsertCodexNotificationConfig('[profiles.custom]\nproject_doc_max_bytes = 98304\n');
    assert.deepEqual(keyLines(nested), ['project_doc_max_bytes = 98304'], 'nested configuration is not a bundled top-level key');
});

test('the generated instruction budget fits native Codex limits without a framework override', async () => {
    const { AGENTS_ROOT_LIMIT_BYTES } = await import(pathToFileURL(path.join(sourceScriptsDir, 'sync-context-workflows.mjs')).href);
    assert.ok(AGENTS_ROOT_LIMIT_BYTES <= 32768,
        `generated instructions must fit the native 32 KiB limit, not raise it: ${AGENTS_ROOT_LIMIT_BYTES}`);
});

test('instruction budget retirement preserves TOML strings and complex nested configuration', async () => {
    const { upsertCodexNotificationConfig } = await import(pathToFileURL(migrateScript).href);
    for (const own of [
        'developer_instructions = """\nproject_doc_max_bytes = 98304\n"""\n',
        "developer_instructions = '''\nproject_doc_max_bytes = 98304\n'''\n",
        '[profiles."a]b"]\nproject_doc_max_bytes = 98304\n',
        '[["a]b"]]\nproject_doc_max_bytes = 98304\n',
        'developer_instructions = """custom\ninstructions"""\nproject_doc_max_bytes = 98304\n',
        'custom = [\n  "item"\n]\nproject_doc_max_bytes = 98304\n',
    ]) {
        const updated = upsertCodexNotificationConfig(own);
        assert.ok(updated.startsWith(own), 'complex user configuration is preserved conservatively');
        assert.equal(upsertCodexNotificationConfig(updated), updated, 'preserved complex input remains stable');
    }
    const bundled = upsertCodexNotificationConfig('project_doc_fallback_filenames = ["CLAUDE.md"]\nproject_doc_max_bytes = 98304\n');
    assert.doesNotMatch(bundled, /project_doc_max_bytes/, 'the shipped single-line fallback list permits retirement');
    assert.match(bundled, /^project_doc_fallback_filenames = \["CLAUDE.md"\]$/m);
});

// Intent: a skill the Claude source marks manual-only (`disable-model-invocation: true`) must stay
// manual-only under Codex, which ignores that flag and reads `agents/openai.yaml` instead.
test('manual-only skills get a Codex implicit-invocation policy; other skills get none', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sync-manual-policy-'));
    // The mutation root honours CLAUDE_PROJECT_DIR over cwd, so drop it to keep the run inside the fixture.
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    const writeSkill = (name, extraFrontmatter = []) => fs.mkdir(path.join(tempRoot, '.claude', 'skills', name), { recursive: true })
        .then(() => fs.writeFile(
            path.join(tempRoot, '.claude', 'skills', name, 'SKILL.md'),
            ['---', `name: ${name}`, `description: ${name} skill`, ...extraFrontmatter, '---', '', `# ${name}`, ''].join('\n'),
            'utf8'
        ));
    try {
        // Given a manual-only skill, a model-invocable skill, and a manual-only skill shipping its own openai.yaml
        await writeSkill('manual-skill', ['disable-model-invocation: true']);
        await writeSkill('auto-skill', ['disable-model-invocation: false']);
        await writeSkill('owned-policy-skill', ['disable-model-invocation: true']);
        const ownedPolicy = 'interface:\n  display_name: "Owned"\npolicy:\n  allow_implicit_invocation: false\n';
        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'owned-policy-skill', 'agents'), { recursive: true });
        await fs.writeFile(path.join(tempRoot, '.claude', 'skills', 'owned-policy-skill', 'agents', 'openai.yaml'), ownedPolicy, 'utf8');

        // When the Codex mirror is generated
        await execFileAsync(process.execPath, [migrateScript], { cwd: tempRoot, env });

        // Then the manual-only skill carries the policy, the invocable skill has none, and an owned file is kept
        const mirror = name => path.join(tempRoot, '.agents', 'skills', name, 'agents', 'openai.yaml');
        assert.match(await fs.readFile(mirror('manual-skill'), 'utf8'), /^policy:\n {2}allow_implicit_invocation: false$/m);
        assert.equal(await pathExists(mirror('auto-skill')), false, 'a model-invocable skill must keep Codex implicit invocation');
        assert.equal(await fs.readFile(mirror('owned-policy-skill'), 'utf8'), ownedPolicy, 'a skill-owned openai.yaml must not be overwritten');
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

test('a manual-only skill whose own openai.yaml allows implicit invocation fails the sync', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sync-policy-conflict-'));
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    try {
        // Given a manual-only skill whose shipped openai.yaml leaves implicit invocation on
        const skillDir = path.join(tempRoot, '.claude', 'skills', 'conflict-skill');
        await fs.mkdir(path.join(skillDir, 'agents'), { recursive: true });
        await fs.writeFile(path.join(skillDir, 'SKILL.md'),
            ['---', 'name: conflict-skill', 'description: Conflict', 'disable-model-invocation: true', '---', '', '# Conflict', ''].join('\n'), 'utf8');
        await fs.writeFile(path.join(skillDir, 'agents', 'openai.yaml'), 'interface:\n  display_name: "Conflict"\n', 'utf8');

        // When / Then the sync refuses rather than silently publishing an implicitly invocable mirror
        await assert.rejects(
            execFileAsync(process.execPath, [migrateScript], { cwd: tempRoot, env }),
            /does not set policy\.allow_implicit_invocation: false/
        );
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

// Intent (decision D-2, TC-ADS-009): the command-only utility skills stay command-only on Codex too —
// the mirror generated from their real source frontmatter carries `allow_implicit_invocation: false`,
// so `$name` runs them but the model never picks them implicitly. Framework-repo guarded: it reads this
// repo's own skill defaults, which an adopting project may change (PORT-011 is the guard's tripwire).
const COMMAND_ONLY_UTILITIES = [
    'custom-agent', 'docx-convert', 'pdf-convert', 'playwright-cli',
    'presentation-builder', 'remotion', 'sync-skills-shared-protocols', 'release-doc',
    'git-developer-performance', 'skill-creator', 'scan-codebase-health',
    'project-help', 'custom-prompt',
];

test('TC-ADS-009 command-only utility skills mirror to Codex with implicit invocation off', {
    skip: isFrameworkRepo(repoRoot) ? false : "asserts the framework repo's own skill defaults (framework-repo signal)",
}, async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sync-command-only-'));
    // A clean machine: the mutation root must not follow CLAUDE_PROJECT_DIR, no inherited CK_* switch or
    // Codex home reaches the child, and home plus temp point at the fixture.
    const env = { ...process.env, HOME: tempRoot, USERPROFILE: tempRoot, TMPDIR: tempRoot, TEMP: tempRoot, TMP: tempRoot };
    for (const key of Object.keys(env)) {
        if (/^(CK_|CLAUDE_PROJECT_DIR$|CODEX_HOME$|NODE_TEST_CONTEXT$)/i.test(key)) delete env[key];
    }
    try {
        // Given a fixture project whose utility skills carry their real source frontmatter, plus one invocable control
        for (const name of COMMAND_ONLY_UTILITIES) {
            const source = await fs.readFile(path.join(repoRoot, '.claude', 'skills', name, 'SKILL.md'), 'utf8');
            const frontmatter = /^---\r?\n[\s\S]*?\r?\n---(?=\r?\n|$)/.exec(source);
            assert.ok(frontmatter, `${name}: source SKILL.md has YAML frontmatter`);
            await fs.mkdir(path.join(tempRoot, '.claude', 'skills', name), { recursive: true });
            await fs.writeFile(path.join(tempRoot, '.claude', 'skills', name, 'SKILL.md'), `${frontmatter[0]}\n\n# ${name}\n`, 'utf8');
        }
        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'invocable-control'), { recursive: true });
        await fs.writeFile(path.join(tempRoot, '.claude', 'skills', 'invocable-control', 'SKILL.md'),
            ['---', 'name: invocable-control', 'description: Control skill', '---', '', '# Control', ''].join('\n'), 'utf8');
        // The graph export utility now lives in the model-selectable graph-code owner (TC-GCM-008).
        const graphSource = await fs.readFile(path.join(repoRoot, '.claude', 'skills', 'graph-code', 'SKILL.md'), 'utf8');
        const graphFrontmatter = /^---\r?\n[\s\S]*?\r?\n---(?=\r?\n|$)/.exec(graphSource);
        assert.ok(graphFrontmatter, 'graph-code: source SKILL.md has YAML frontmatter');
        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'graph-code'), { recursive: true });
        await fs.writeFile(path.join(tempRoot, '.claude', 'skills', 'graph-code', 'SKILL.md'), `${graphFrontmatter[0]}\n\n# Graph code\n`, 'utf8');
        // A previous generated mirror is a real upgrade state: the retired alias must be pruned.
        const retiredMirror = path.join(tempRoot, '.agents', 'skills', 'graph' + '-export');
        await fs.mkdir(retiredMirror, { recursive: true });
        await fs.writeFile(path.join(retiredMirror, 'SKILL.md'), '# Previous export alias\n', 'utf8');
        await fs.writeFile(path.join(tempRoot, '.agents', 'skills', '.codex-mirror.json'),
            `${JSON.stringify({ managedBy: 'codex-sync', source: '.claude/skills' })}\n`, 'utf8');

        // When the Codex mirror is generated
        await execFileAsync(process.execPath, [migrateScript], { cwd: tempRoot, env });

        // Then every utility's mirror turns implicit invocation off and keeps the manual-only flag
        const defects = [];
        for (const name of COMMAND_ONLY_UTILITIES) {
            const mirrorDir = path.join(tempRoot, '.agents', 'skills', name);
            const policy = await fs.readFile(path.join(mirrorDir, 'agents', 'openai.yaml'), 'utf8').catch(() => null);
            if (policy === null) defects.push(`${name}: agents/openai.yaml missing`);
            else if (!/^policy:\r?\n {2}allow_implicit_invocation: false\r?$/m.test(policy)) defects.push(`${name}: openai.yaml leaves implicit invocation on`);
            const mirroredSkill = await fs.readFile(path.join(mirrorDir, 'SKILL.md'), 'utf8');
            if (!/^disable-model-invocation:\s*true\s*$/m.test(mirroredSkill)) defects.push(`${name}: mirrored SKILL.md lost disable-model-invocation: true`);
        }
        assert.deepEqual(defects, [], `command-only utilities must stay manual-only on Codex:\n  ${defects.join('\n  ')}`);
        // And the invocable control proves the policy is flag-driven, not blanket
        assert.equal(await pathExists(path.join(tempRoot, '.agents', 'skills', 'invocable-control', 'agents', 'openai.yaml')), false,
            'a model-invocable skill must keep Codex implicit invocation');
        assert.equal(await pathExists(path.join(tempRoot, '.agents', 'skills', 'graph-code', 'agents', 'openai.yaml')), false,
            'consolidating the export utility must not hide graph-code from Codex implicit invocation');
        assert.equal(await pathExists(path.join(tempRoot, '.agents', 'skills', 'graph' + '-export')), false,
            'the retired standalone export command must not return in the Codex catalog');
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

// Intent (BR-ADS-20, BR-ADS-21; TC-ADS-035…037): the bundle pins no auto-compaction budget on Codex, so
// the host default applies. A budget an earlier bundle wrote is retired only while it still equals the
// bundled value; any other value is the user's and survives every sync.
const BUNDLED_COMPACTION_COMMENT = [
    '# Auto-compaction budget — 500K tokens, matching the Claude Code',
    '# CLAUDE_CODE_AUTO_COMPACT_WINDOW and the opencode model limit.context so all three',
    '# surfaces of the portable framework compact at the same point.',
    '# Scope defaults to "total" (full active context).',
];

// A clean machine: the mutation root must not follow CLAUDE_PROJECT_DIR, no inherited CK_* switch or
// Codex home reaches the child, and home plus temp point at the fixture.
function cleanMachineEnv(tempRoot) {
    const env = { ...process.env, HOME: tempRoot, USERPROFILE: tempRoot, TMPDIR: tempRoot, TEMP: tempRoot, TMP: tempRoot };
    for (const key of Object.keys(env)) {
        if (/^(CK_|CLAUDE_PROJECT_DIR$|CODEX_HOME$|NODE_TEST_CONTEXT$)/i.test(key)) delete env[key];
    }
    return env;
}

async function withCodexConfigFixture(prefix, configText, body) {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    try {
        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'sample-skill'), { recursive: true });
        await fs.writeFile(path.join(tempRoot, '.claude', 'skills', 'sample-skill', 'SKILL.md'),
            ['---', 'name: sample-skill', 'description: Sample skill', '---', '', '# Sample Skill', ''].join('\n'), 'utf8');
        if (configText !== undefined) {
            await fs.mkdir(path.join(tempRoot, '.codex'), { recursive: true });
            await fs.writeFile(path.join(tempRoot, '.codex', 'config.toml'), configText, 'utf8');
        }
        const sync = async () => {
            const { stdout } = await execFileAsync(process.execPath, [migrateScript], { cwd: tempRoot, env: cleanMachineEnv(tempRoot) });
            return { stdout, config: await fs.readFile(path.join(tempRoot, '.codex', 'config.toml'), 'utf8') };
        };
        await body(sync);
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
}

const keptNotices = stdout => stdout.split(/\r?\n/).filter(line => line.includes('kept user-set model_auto_compact_token_limit'));

test('TC-ADS-035 a fresh project gets no Codex compaction budget and no bundled compaction comment', async () => {
    // Given a fresh project with no Codex config
    await withCodexConfigFixture('codex-compaction-fresh-', undefined, async sync => {
        // When the Codex sync runs
        const { config, stdout } = await sync();
        // Then the config pins no budget, carries none of the bundled comment, and reports nothing kept
        assert.doesNotMatch(config, /model_auto_compact_token_limit/, 'a fresh config must not pin a compaction budget');
        for (const comment of BUNDLED_COMPACTION_COMMENT) {
            assert.ok(!config.includes(comment), `bundled compaction comment must be absent: ${comment}`);
        }
        assert.deepEqual(keptNotices(stdout), []);
        // And the rest of the managed config is still written (the sync did run)
        assert.match(config, /^notifications = true$/m);
    });
});

test('TC-ADS-036 the bundled Codex compaction budget and its comment are retired, and a second sync is byte-identical', async () => {
    // Given a config an earlier bundle wrote: the 500K key under the bundled comment, among project keys
    const earlier = [
        '# Team-wide Codex defaults for this repository.',
        'model = "project-model"',
        '',
        ...BUNDLED_COMPACTION_COMMENT,
        'model_auto_compact_token_limit = 500000',
        '',
        'project_doc_fallback_filenames = ["CLAUDE.md"]',
        '',
        '[tui]',
        'theme = "dark"',
        '',
    ].join('\n');
    await withCodexConfigFixture('codex-compaction-retire-', earlier, async sync => {
        // When the Codex sync runs twice
        const first = await sync();
        const second = await sync();
        // Then the key and every bundled comment line are gone, project keys stay, and no blank-line pair is left
        assert.doesNotMatch(first.config, /model_auto_compact_token_limit/, 'the bundled 500K value must be retired');
        for (const comment of BUNDLED_COMPACTION_COMMENT) {
            assert.ok(!first.config.includes(comment), `bundled compaction comment must be retired: ${comment}`);
        }
        assert.match(first.config, /^model = "project-model"$/m);
        assert.match(first.config, /^project_doc_fallback_filenames = \["CLAUDE\.md"\]$/m);
        assert.match(first.config, /^theme = "dark"$/m);
        assert.ok(!first.config.includes('\n\n\n'), 'removal must not leave a double blank line');
        assert.deepEqual(keptNotices(first.stdout), [], 'a retired bundled value is not reported as user-set');
        // And the second sync changes nothing
        assert.equal(second.config, first.config, 'second sync must be byte-identical');
    });

    // Given the bundled value under a project's own comment, or inside a table rather than at top level
    const { upsertCodexNotificationConfig } = await import(pathToFileURL(migrateScript).href);
    const ownComment = upsertCodexNotificationConfig('# our team budget note\nmodel_auto_compact_token_limit = 500000\n');
    // Then only the bundled key is retired; the project's comment is not the bundle's and stays
    assert.doesNotMatch(ownComment, /model_auto_compact_token_limit/);
    assert.match(ownComment, /^# our team budget note$/m);
    // And a key inside a project table is outside the bundle's top-level scope and stays
    const tableScoped = upsertCodexNotificationConfig('[profiles.long]\nmodel_auto_compact_token_limit = 500000\n');
    assert.match(tableScoped, /^\[profiles\.long\]\nmodel_auto_compact_token_limit = 500000$/m);
});

// ---- P41: the skill profile on Codex (skillProfile → agents/openai.yaml) ----
// Intent (SC-7, SEC-04, SEC-06): the resolved profile hides skills on Codex through the per-skill policy,
// never hides a called skill without the opt-in, never overwrites a skill-owned openai.yaml, and leaves a
// project without a profile exactly as before.

/**
 * A fixture project for the profile: skills (name → extra frontmatter lines), workflows, the presets file
 * `resolveProfile()` reads, and a project config holding `skillProfile` (omitted when undefined).
 */
async function withProfileFixture(prefix, { skills, workflows = {}, skillProfile, calledByOthers = [], projectConfig = true }, body) {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    const write = async (relative, text) => {
        await fs.mkdir(path.dirname(path.join(tempRoot, relative)), { recursive: true });
        await fs.writeFile(path.join(tempRoot, relative), text, 'utf8');
    };
    try {
        for (const [name, extra] of Object.entries(skills)) {
            await write(path.join('.claude', 'skills', name, 'SKILL.md'), ['---', `name: ${name}`, `description: ${name} skill`, ...extra, '---', '', `# ${name}`, ''].join('\n'));
        }
        await write(path.join('.claude', 'workflows.json'), `${JSON.stringify({ workflows }, null, 2)}\n`);
        await write(path.join('.claude', 'config', 'skill-profiles.json'), `${JSON.stringify({
            calledByOthers: { skills: calledByOthers },
            entrySkills: { skills: [] },
            presets: { full: { nameOnly: [] }, standard: { nameOnly: 'calledByOthers' }, minimal: { nameOnly: 'allExceptEntry' } }
        }, null, 2)}\n`);
        if (projectConfig) {
            await write(path.join('docs', 'project-config.json'), JSON.stringify({ project: { name: 'fixture' }, ...(skillProfile === undefined ? {} : { skillProfile }) }));
        }
        const sync = () => execFileAsync(process.execPath, [migrateScript], { cwd: tempRoot, env: cleanMachineEnv(tempRoot) });
        const policy = name => fs.readFile(path.join(tempRoot, '.agents', 'skills', name, 'agents', 'openai.yaml'), 'utf8').catch(() => null);
        await body({ tempRoot, sync, policy, write });
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
}

const IMPLICIT_OFF = /^policy:\n {2}allow_implicit_invocation: false$/m;
const profileLines = stdout => stdout.split(/\r?\n/).filter(line => line.includes('skill-profile:'));

test('TC-ADS-021 a nameOnly skill nothing starts gets allow_implicit_invocation: false from the profile', async () => {
    const { buildCodexSkillPolicy } = await import(pathToFileURL(migrateScript).href);
    // Given x in nameOnly and a plain control skill, neither started by anything
    await withProfileFixture('codex-profile-nameonly-', { skills: { x: [], control: [] }, skillProfile: { nameOnly: ['x'] } }, async ({ sync, policy }) => {
        // When the Codex mirror is generated
        const { stdout } = await sync();
        // Then x is hidden from implicit invocation by a profile-sourced policy, and the control keeps none
        const text = await policy('x');
        assert.match(text ?? '', IMPLICIT_OFF);
        assert.equal(text, buildCodexSkillPolicy('nameOnly'), 'the generated file names skillProfile.nameOnly as its source');
        assert.match(text, /skillProfile\.nameOnly/);
        assert.equal(await policy('control'), null, 'a skill outside the profile keeps implicit invocation');
        assert.deepEqual(profileLines(stdout), [], 'no note, warning or conflict for an uncalled nameOnly skill');
    });
});

test('TC-ADS-024 without a skill profile the Codex policy files are exactly the flag-driven ones', async () => {
    const { buildCodexSkillPolicy } = await import(pathToFileURL(migrateScript).href);
    const skills = { 'manual-skill': ['disable-model-invocation: true'], plain: [], w: [] };
    // Given the same skills with no project config, and with a project config (and presets) but no skillProfile
    for (const [label, options] of [['no project config', { skills, projectConfig: false }], ['config without skillProfile', { skills, calledByOthers: ['w'] }]]) {
        await withProfileFixture('codex-profile-none-', options, async ({ sync, policy }) => {
            // When the Codex mirror is generated
            const { stdout } = await sync();
            // Then only the manual-only skill has a policy, with the flag-sourced text, and nothing profile-related is printed
            assert.equal(await policy('manual-skill'), buildCodexSkillPolicy(), `${label}: flag policy unchanged`);
            assert.equal(await policy('plain'), null, `${label}: plain skill has no policy`);
            assert.equal(await policy('w'), null, `${label}: a curated called skill is untouched without a profile`);
            assert.deepEqual(profileLines(stdout), [], `${label}: no profile lines`);
        });
    }
});

test('TC-ADS-045 hiding a called skill is refused before any mirror file is written unless allowHidingCalledSkills is set', async () => {
    const refusal = /skill-profile: refusing to hide security-audit \(commandOnly\): started by workflow workflow-review-changes; set skillProfile\.allowHidingCalledSkills: true to allow/;
    const fixture = allow => ({
        skills: { 'security-audit': [], 'workflow-review-changes': [] },
        workflows: { 'workflow-review-changes': { sequence: ['security-audit'] } },
        skillProfile: { commandOnly: ['security-audit'], ...(allow ? { allowHidingCalledSkills: true } : {}) }
    });
    // Given security-audit is a workflow step and the profile makes it commandOnly, with no opt-in
    await withProfileFixture('codex-profile-refused-', fixture(false), async ({ tempRoot, sync, write }) => {
        // When the Codex mirror is generated, Then it exits non-zero with the resolver's message
        await assert.rejects(sync(), error => {
            assert.equal(error.code, 1);
            assert.match(error.stderr, refusal);
            assert.match(error.stderr, /nothing was written/);
            return true;
        });
        // And no mirror file of any kind was written
        assert.equal(await pathExists(path.join(tempRoot, '.agents')), false, 'no skill mirror');
        assert.equal(await pathExists(path.join(tempRoot, '.codex')), false, 'no agent mirror or Codex config');

        // When the sync-divergence oracle materializes the mirror (the --check path), Then it refuses before writing too
        const staging = path.join(tempRoot, 'staging');
        const probe = path.join(tempRoot, 'oracle-probe.mjs');
        await write('oracle-probe.mjs', [
            `const m = await import(${JSON.stringify(pathToFileURL(migrateScript).href)});`,
            `try { await m.materializeSkillMirror(${JSON.stringify(staging)}, new Map()); console.log('materialized'); }`,
            'catch (error) { console.error(error.message); process.exitCode = 3; }',
            ''
        ].join('\n'));
        await assert.rejects(execFileAsync(process.execPath, [probe], { cwd: tempRoot, env: cleanMachineEnv(tempRoot) }), error => {
            assert.equal(error.code, 3);
            assert.match(error.stderr, refusal);
            return true;
        });
        assert.equal(await pathExists(staging), false, 'the oracle writes nothing for a refused profile');
    });

    // Given the project opts in
    await withProfileFixture('codex-profile-optin-', fixture(true), async ({ sync, policy }) => {
        // When the Codex mirror is generated
        const { stdout } = await sync();
        // Then security-audit is hidden from implicit invocation and one warning line names it
        assert.match((await policy('security-audit')) ?? '', IMPLICIT_OFF);
        assert.match(await policy('security-audit'), /skillProfile\.commandOnly/);
        assert.equal(profileLines(stdout).filter(line => line.includes('hiding called skill security-audit')).length, 1);
    });
});

test('TC-ADS-047 a called nameOnly skill follows the recorded Q-E branch (FAIL: implicit invocation stays on, with a note)', async () => {
    const { CODEX_STEP_REACHES_HIDDEN_SKILL, planCodexSkillPolicies } = await import(pathToFileURL(migrateScript).href);
    // Given the recorded Q-E result: a workflow step's $skill does not reach a hidden Codex skill
    assert.equal(CODEX_STEP_REACHES_HIDDEN_SKILL, false, 'the P33 Q-E row recorded FAIL; flip only on new PASS evidence');

    // Given preset standard, which puts the curated called skill w in nameOnly
    await withProfileFixture('codex-profile-standard-', { skills: { w: [], other: [] }, calledByOthers: ['w'], skillProfile: { preset: 'standard' } }, async ({ sync, policy }) => {
        // When the Codex mirror is generated
        const { stdout } = await sync();
        // Then w gets no policy, and exactly one note line names it and its caller
        assert.equal(await policy('w'), null, 'a called nameOnly skill keeps implicit invocation on Codex');
        assert.deepEqual(profileLines(stdout).map(line => line.trim()), [
            '[codex-migrate] skill-profile: kept implicit invocation for w (nameOnly) on Codex: started by the calledByOthers list, and a workflow step does not reach a Codex skill with implicit invocation off'
        ]);
    });

    // When the same resolved profile is mapped under the PASS branch, Then w would be hidden (the branch is the only switch)
    const resolved = { overrides: { w: 'nameOnly' }, called: new Map([['w', ['the calledByOthers list']]]) };
    assert.deepEqual([...planCodexSkillPolicies(resolved, { stepReachesHiddenSkill: true }).policies], [['w', 'nameOnly']]);
    assert.deepEqual([...planCodexSkillPolicies(resolved).policies], [], 'the default branch keeps w implicit');
});

test('a profile entry for a skill that ships its own openai.yaml without the policy is kept and reported, not failed', async () => {
    // Given a skill whose own openai.yaml leaves implicit invocation on, and a profile that asks to hide it
    const owned = 'interface:\n  display_name: "Owned"\n';
    await withProfileFixture('codex-profile-owned-', { skills: { owned: [] }, skillProfile: { nameOnly: ['owned'] } }, async ({ sync, policy, write }) => {
        await write(path.join('.claude', 'skills', 'owned', 'agents', 'openai.yaml'), owned);
        // When the Codex mirror is generated
        const { stdout } = await sync();
        // Then the skill-owned file is mirrored unchanged and one conflict line names it (not the flag)
        assert.equal(await policy('owned'), owned, 'a skill-owned openai.yaml is never overwritten');
        const lines = profileLines(stdout);
        assert.equal(lines.length, 1, lines.join('\n'));
        assert.match(lines[0], /conflict: owned[\\/]SKILL\.md ships its own agents\/openai\.yaml without policy\.allow_implicit_invocation: false; kept that file, skillProfile\.nameOnly is not applied on Codex/);
        assert.doesNotMatch(lines[0], /disable-model-invocation/);
    });
});

// Intent: a refused manual-only policy (flag set, own openai.yaml leaves implicit invocation on) is found
// before any write, so an existing mirror is never wiped or half sanitized and no agent mirror is written.
test('a refused manual-only skill policy stops the sync before any mirror file is wiped or written', async () => {
    const skills = { 'conflict-skill': ['disable-model-invocation: true'], 'plain-skill': [] };
    await withProfileFixture('codex-policy-preflight-', { skills }, async ({ tempRoot, sync, write }) => {
        // Given the conflicting skill-owned policy, a Claude agent, and a managed mirror from an earlier sync
        await write(path.join('.claude', 'skills', 'conflict-skill', 'agents', 'openai.yaml'), 'interface:\n  display_name: "Conflict"\n');
        await write(path.join('.claude', 'agents', 'reviewer.md'), '---\nname: reviewer\ndescription: fixture agent\n---\n\nBody.\n');
        const oldManifest = path.join(tempRoot, '.agents', 'skills', 'old-skill', 'SKILL.md');
        await write(path.join('.agents', 'skills', 'old-skill', 'SKILL.md'), '---\nname: old-skill\ndescription: from the last sync\n---\n');
        await write(path.join('.agents', 'skills', '.codex-mirror.json'), '{"managedBy":"codex-sync"}\n');
        const before = await fs.readFile(oldManifest, 'utf8');
        // When the Codex mirror is generated
        await assert.rejects(sync(), error => {
            // Then it exits non-zero naming the skill and the missing policy, and says nothing was written
            assert.equal(error.code, 1);
            assert.match(error.stderr, /conflict-skill[\\/]SKILL\.md sets disable-model-invocation: true but its own agents[\\/]openai\.yaml does not set policy\.allow_implicit_invocation: false/);
            assert.match(error.stderr, /nothing was written/);
            return true;
        });
        // And the earlier mirror is untouched, no raw skill was copied, and no agent mirror or Codex config exists
        assert.equal(await fs.readFile(oldManifest, 'utf8'), before, 'the existing mirror is not wiped');
        assert.equal(await pathExists(path.join(tempRoot, '.agents', 'skills', 'plain-skill')), false, 'no source skill was copied');
        assert.equal(await pathExists(path.join(tempRoot, '.codex')), false, 'no .codex/agents or config was written');

        // When the sync-divergence oracle materializes the mirror, Then it refuses before writing too
        const staging = path.join(tempRoot, 'staging');
        await write('oracle-probe.mjs', [
            `const m = await import(${JSON.stringify(pathToFileURL(migrateScript).href)});`,
            `try { await m.materializeSkillMirror(${JSON.stringify(staging)}, new Map()); console.log('materialized'); }`,
            'catch (error) { console.error(error.message); process.exitCode = 3; }',
            ''
        ].join('\n'));
        await assert.rejects(execFileAsync(process.execPath, [path.join(tempRoot, 'oracle-probe.mjs')], { cwd: tempRoot, env: cleanMachineEnv(tempRoot) }), error => {
            assert.equal(error.code, 3);
            assert.match(error.stderr, /does not set policy\.allow_implicit_invocation: false/);
            return true;
        });
        assert.equal(await pathExists(staging), false, 'the oracle writes nothing for a refused policy');

        // Control: once the source policy turns implicit invocation off, the same project syncs
        await write(path.join('.claude', 'skills', 'conflict-skill', 'agents', 'openai.yaml'), 'policy:\r\n  allow_implicit_invocation: false\r\n');
        await sync();
        assert.equal(await pathExists(path.join(tempRoot, '.agents', 'skills', 'plain-skill', 'SKILL.md')), true, 'the mirror is written');
    });
});

test('TC-ADS-037 a user-set Codex compaction budget survives the sync and is reported once', async () => {
    // Given a config whose top-level budget is the user's own value
    const userConfig = ['model = "project-model"', 'model_auto_compact_token_limit = 300000', '', '[tui]', 'theme = "dark"', ''].join('\n');
    await withCodexConfigFixture('codex-compaction-user-', userConfig, async sync => {
        // When the Codex sync runs
        const { config, stdout } = await sync();
        // Then the line is kept exactly as written and one "kept user-set" line is printed
        assert.deepEqual(config.split('\n').filter(line => line.includes('model_auto_compact_token_limit')), ['model_auto_compact_token_limit = 300000']);
        assert.deepEqual(keptNotices(stdout).map(line => line.trim()), ['[codex-migrate] kept user-set model_auto_compact_token_limit=300000']);
    });

    // Given any value that is not exactly the bundled one, including 500K spelled differently
    const { upsertCodexNotificationConfig } = await import(pathToFileURL(migrateScript).href);
    for (const value of ['300000', '500_000', '0x7A120', '1000000', '"500000"']) {
        const notices = [];
        // When the upsert runs
        const updated = upsertCodexNotificationConfig(`model_auto_compact_token_limit = ${value}\n`, { onNotice: message => notices.push(message) });
        // Then the user's line stays verbatim and exactly one notice names its value
        assert.ok(updated.split('\n').includes(`model_auto_compact_token_limit = ${value}`), `user value must stay: ${value}`);
        assert.deepEqual(notices, [`kept user-set model_auto_compact_token_limit=${value}`]);
    }
});

test('TC-MIG-WRITE-001 a mirror write retries a transient open refusal and fails closed on anything else', async () => {
    const { writeFileTransientSafe } = await import(pathToFileURL(path.join(repoRoot, '.claude', 'scripts', 'lib', 'write-file-transient-safe.mjs')).href);
    const refusal = code => Object.assign(new Error(`open refused: ${code}`), { code });

    // Given a write that a scanner refuses twice before it lets go
    let calls = 0;
    const flaky = async () => {
        calls += 1;
        if (calls <= 2) throw refusal('UNKNOWN');
    };
    // When the mirror write runs
    await writeFileTransientSafe('mirror-file', 'text', 'utf8', { write: flaky, baseDelayMs: 1 });
    // Then it succeeds on the third attempt without surfacing the refusal
    assert.equal(calls, 3);

    // Given a refusal that never clears
    let stuck = 0;
    // When the retry budget is spent
    await assert.rejects(
        writeFileTransientSafe('mirror-file', 'text', 'utf8', {
            write: async () => {
                stuck += 1;
                throw refusal('EBUSY');
            },
            attempts: 3,
            baseDelayMs: 1
        }),
        { code: 'EBUSY' }
    );
    // Then it stops at the budget and reports the original error
    assert.equal(stuck, 3);

    // Given a permanent failure such as a missing directory
    let missing = 0;
    // When the write runs
    await assert.rejects(
        writeFileTransientSafe('mirror-file', 'text', 'utf8', {
            write: async () => {
                missing += 1;
                throw refusal('ENOENT');
            },
            baseDelayMs: 1
        }),
        { code: 'ENOENT' }
    );
    // Then it is not retried
    assert.equal(missing, 1);
});
