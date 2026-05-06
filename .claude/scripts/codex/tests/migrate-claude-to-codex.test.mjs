import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const sourceScriptsDir = path.join(repoRoot, '.claude', 'scripts', 'codex');
const migrateScript = path.join(sourceScriptsDir, 'migrate-claude-to-codex.mjs');
const runnerScript = path.join(repoRoot, '.claude', 'skills', 'codex-sync', 'scripts', 'run-codex-sync.mjs');
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
    await fs.mkdir(targetScriptsDir, { recursive: true });
    const entries = await fs.readdir(sourceScriptsDir, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.mjs')) continue;
        await fs.copyFile(path.join(sourceScriptsDir, entry.name), path.join(targetScriptsDir, entry.name));
    }
}

test('migrate-claude-to-codex mirrors skills and injects protocol block', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-migrate-'));
    try {
        const skillDir = path.join(tempRoot, '.claude', 'skills', 'sample-skill');
        const planHardSkillDir = path.join(tempRoot, '.claude', 'skills', 'plan-hard');
        const codeSimplifierSkillDir = path.join(tempRoot, '.claude', 'skills', 'code-simplifier');
        const codexSyncSkillDir = path.join(tempRoot, '.claude', 'skills', 'codex-sync');
        const portableSourceScriptsDir = path.join(tempRoot, '.claude', 'scripts', 'codex');
        const agentsDir = path.join(tempRoot, '.claude', 'agents');
        const codexDir = path.join(tempRoot, '.codex');
        const hooksDir = path.join(tempRoot, '.claude', 'hooks', 'lib');
        await fs.mkdir(skillDir, { recursive: true });
        await fs.mkdir(planHardSkillDir, { recursive: true });
        await fs.mkdir(codeSimplifierSkillDir, { recursive: true });
        await fs.mkdir(codexSyncSkillDir, { recursive: true });
        await fs.mkdir(portableSourceScriptsDir, { recursive: true });
        await fs.mkdir(agentsDir, { recursive: true });
        await fs.mkdir(codexDir, { recursive: true });
        await fs.mkdir(hooksDir, { recursive: true });

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
                'Run /simplify after implementation.',
                'Agent({ subagent_type: "architect", prompt: "review" })',
                'Agent(review-architecture, subagent_type="code-reviewer", ...)',
                ''
            ].join('\n'),
            'utf8'
        );

        await fs.writeFile(path.join(skillDir, 'README.md'), 'Legacy /simplify note.   \n', 'utf8');

        await fs.writeFile(
            path.join(planHardSkillDir, 'SKILL.md'),
            ['---', 'name: plan-hard', 'description: Plan hard', '---', '', '# Plan Hard', ''].join('\n'),
            'utf8'
        );

        await fs.writeFile(
            path.join(codeSimplifierSkillDir, 'SKILL.md'),
            ['---', 'name: code-simplifier', 'description: Code simplifier', '---', '', '# Code Simplifier', ''].join('\n'),
            'utf8'
        );

        await fs.writeFile(
            path.join(tempRoot, '.claude', 'skills', 'codex-sync', 'SKILL.md'),
            ['---', 'name: codex-sync', 'description: Codex sync', '---', '', '# Codex Sync', ''].join('\n'),
            'utf8'
        );

        await fs.writeFile(path.join(portableSourceScriptsDir, 'codex-notify.mjs'), ['#!/usr/bin/env node', "console.log('notify helper');", ''].join('\n'), 'utf8');

        await fs.writeFile(
            path.join(agentsDir, 'sample-agent.md'),
            ['---', 'name: sample-agent', 'description: sample agent', '---', '', 'Agent body.'].join('\n'),
            'utf8'
        );

        await fs.writeFile(path.join(tempRoot, '.claude', '.ck.json'), JSON.stringify({ workflow: { confirmationMode: 'always' } }, null, 2), 'utf8');

        await fs.writeFile(
            path.join(codexDir, 'config.toml'),
            [
                '# Existing project-specific Codex config.',
                'model = "gpt-5.4"',
                'model_reasoning_effort = "medium"',
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

        await fs.writeFile(
            path.join(hooksDir, 'prompt-injections.cjs'),
            [
                'module.exports = {',
                "  injectWorkflowProtocol: () => '## Workflow Protocol Stub',",
                "  injectCriticalContext: () => '## Critical Context Stub',",
                "  injectAiMistakePrevention: () => '## Mistake Prevention Stub',",
                "  injectLessons: () => '## Lessons Stub',",
                "  injectLessonReminder: () => '## Lesson Reminder Stub',",
                '};',
                ''
            ].join('\n'),
            'utf8'
        );

        await execFileAsync(process.execPath, [migrateScript], { cwd: tempRoot });

        const mirroredSkill = await fs.readFile(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'SKILL.md'), 'utf8');
        const mirroredAgent = await fs.readFile(path.join(tempRoot, '.codex', 'agents', 'sample-agent.toml'), 'utf8');
        const mirroredReadme = await fs.readFile(path.join(tempRoot, '.agents', 'skills', 'sample-skill', 'README.md'), 'utf8');
        const codexConfig = await fs.readFile(path.join(tempRoot, '.codex', 'config.toml'), 'utf8');
        const codexNotifyScript = await fs.readFile(path.join(tempRoot, '.codex', 'scripts', 'codex', 'codex-notify.mjs'), 'utf8');

        assert.match(mirroredSkill, /CODEX:SYNC-PROMPT-PROTOCOLS:START/);
        assert.match(mirroredSkill, /Hookless Prompt Protocol Mirror/);
        assert.match(mirroredSkill, new RegExp(subagentAuthorizationSnippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        assert.match(mirroredSkill, /Use \$plan-hard for planning\./);
        assert.match(mirroredSkill, /Run \$code-simplifier after implementation\./);
        assert.match(mirroredSkill, /spawn_agent\(\{ agent_type: "architect"/);
        assert.match(mirroredSkill, /spawn_agent\(review-architecture, agent_type="code-reviewer"/);
        assert.doesNotMatch(mirroredSkill, /\bAgent\(|\bsubagent_type[=:]/);
        assert.equal(mirroredReadme, 'Legacy $code-simplifier note.\n');
        assert.doesNotMatch(mirroredSkill, /adr-service-pattern-v1-v2-split|integration-test-guide|seed-test-data-reference/);
        assert.match(mirroredAgent, /name = "sample-agent"/);
        assert.match(mirroredAgent, new RegExp(subagentAuthorizationSnippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        assert.match(codexConfig, /notify = \["node", "\.codex\/scripts\/codex\/codex-notify\.mjs"\]/);
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
        assert.equal([...codexConfig.matchAll(/^notify\s*=/gm)].length, 1);
        assert.equal([...codexConfig.matchAll(/^\[tui\]/gm)].length, 1);
        assert.equal([...codexConfig.matchAll(/^\[\[servers\]\]/gm)].length, 1);
        assert.equal([...codexConfig.matchAll(/^status_line\s*=/gm)].length, 1);
        assert.doesNotMatch(codexConfig, /"model-name"/);
        assert.ok(codexConfig.indexOf('notify = ["node", ".codex/scripts/codex/codex-notify.mjs"]') < codexConfig.indexOf('[[profiles]]'));
        assert.ok(codexConfig.indexOf('status_line = ["model-with-reasoning", "current-dir", "project-root", "context-used", "five-hour-limit", "weekly-limit"]') > codexConfig.indexOf('[tui] # existing UI settings'));
        assert.ok(codexConfig.indexOf('status_line = ["model-with-reasoning", "current-dir", "project-root", "context-used", "five-hour-limit", "weekly-limit"]') < codexConfig.indexOf('[[servers]] # existing server'));
        assert.ok(codexConfig.indexOf('notifications = true') > codexConfig.indexOf('[tui] # existing UI settings'));
        assert.ok(codexConfig.indexOf('notifications = true') < codexConfig.indexOf('[[servers]] # existing server'));
        assert.equal(codexNotifyScript, "#!/usr/bin/env node\nconsole.log('notify helper');\n");
        assert.equal(await pathExists(path.join(tempRoot, 'scripts', 'codex')), false);

        await execFileAsync(process.execPath, [migrateScript], { cwd: tempRoot });
        const rerunCodexConfig = await fs.readFile(path.join(tempRoot, '.codex', 'config.toml'), 'utf8');
        assert.equal(rerunCodexConfig, codexConfig);
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

test('codex-sync runner works from copied .claude without a root scripts folder', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sync-portable-'));
    try {
        await copyPortableCodexTooling(tempRoot);

        const runnerTarget = path.join(tempRoot, '.claude', 'skills', 'codex-sync', 'scripts', 'run-codex-sync.mjs');
        await fs.mkdir(path.dirname(runnerTarget), { recursive: true });
        await fs.copyFile(runnerScript, runnerTarget);

        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'codex-sync'), { recursive: true });
        await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'sample-skill'), { recursive: true });
        await fs.mkdir(path.join(tempRoot, '.claude', 'agents'), { recursive: true });
        await fs.mkdir(path.join(tempRoot, '.claude', 'hooks', 'lib'), { recursive: true });

        await fs.writeFile(
            path.join(tempRoot, '.claude', 'skills', 'codex-sync', 'SKILL.md'),
            ['---', 'name: codex-sync', 'description: Codex sync', '---', '', '# Codex Sync', ''].join('\n'),
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
            `${JSON.stringify({ workflow: { confirmationMode: 'always' } }, null, 2)}\n`,
            'utf8'
        );
        await fs.writeFile(
            path.join(tempRoot, '.claude', 'hooks', 'lib', 'prompt-injections.cjs'),
            [
                'module.exports = {',
                "  injectWorkflowProtocol: () => '## Workflow Protocol Stub',",
                "  injectCriticalContext: () => '## Critical Context Stub',",
                "  injectLessons: () => '## Lessons Stub',",
                "  injectLessonReminder: () => '## Lesson Reminder Stub',",
                '};',
                ''
            ].join('\n'),
            'utf8'
        );

        await execFileAsync(process.execPath, [runnerTarget, '--only=migrate,hooks,context'], { cwd: tempRoot });

        const codexConfig = await fs.readFile(path.join(tempRoot, '.codex', 'config.toml'), 'utf8');
        assert.match(codexConfig, /notify = \["node", "\.codex\/scripts\/codex\/codex-notify\.mjs"\]/);
        assert.match(codexConfig, /status_line = \["model-with-reasoning", "current-dir", "project-root", "context-used", "five-hour-limit", "weekly-limit"\]/);
        assert.equal(await pathExists(path.join(tempRoot, '.codex', 'scripts', 'codex', 'codex-notify.mjs')), true);
        assert.equal(await pathExists(path.join(tempRoot, 'scripts')), false);
        assert.equal(await pathExists(path.join(tempRoot, 'AGENTS.md')), true);
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

test('codex-sync runner forwards copy-skills to migrate stage', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sync-copy-skills-'));
    try {
        await copyPortableCodexTooling(tempRoot);

        const runnerTarget = path.join(tempRoot, '.claude', 'skills', 'codex-sync', 'scripts', 'run-codex-sync.mjs');
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
