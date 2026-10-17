import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Source override permits RED proof against a captured framework tree without replacing the checkout.
const frameworkRoot = process.env.CK_SKILL_REPAIRS_SOURCE_ROOT
    ? path.resolve(process.env.CK_SKILL_REPAIRS_SOURCE_ROOT)
    : fileURLToPath(new URL('../../../', import.meta.url));
const read = relative => fs.readFileSync(path.join(frameworkRoot, relative), 'utf8');
const section = (text, start, end) => {
    const at = text.indexOf(start);
    assert.notEqual(at, -1, `Missing section: ${start}`);
    const until = text.indexOf(end, at + start.length);
    return text.slice(at, until < 0 ? undefined : until);
};

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-artifacts-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
        !/^(?:CK_|CLAUDE_|CODEX_|ANTHROPIC_|OPENAI_|AZURE_|GOOGLE_|GEMINI_|AWS_)/i.test(key)));
    Object.assign(env, { HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root, CLAUDE_PROJECT_DIR: root });
    return { root, env };
}

test('D1 default plan producer supplies validation branch and handoff fields without automatic review', () => {
    const producer = read('skills/plan/SKILL.md');
    const consumer = read('skills/plan/references/mode-validate.md');
    const owner = read('skills/shared/product-roadmap-contract.md');
    const contract = section(producer, '### 0. Applicability and Plan Gate', '### 1. Outcome');
    for (const branch of ['EXPLICIT-ROADMAP', 'DECOMPOSITION-EMBEDDED', 'FRAMEWORK-LIBRARY', 'EXEMPT']) {
        assert.ok(contract.includes(branch), `Producer lacks ${branch}`);
        assert.ok(owner.includes(branch), `Unknown owner branch ${branch}`);
    }
    for (const field of ['Scope brief', 'Scenarios', 'Product decisions', 'Project skeleton', 'Commands', 'Evidence plan', 'Human approval']) {
        assert.ok(contract.includes(field), `Producer lacks consumer field ${field}`);
        assert.ok(owner.includes(`- ${field}:`), `Owner lacks field ${field}`);
    }
    assert.match(consumer, /Verify one `## Plan Gate`/);
    assert.match(contract, /unknown approval stays `REQUIRED`/);
    assert.match(producer, /plan creation never chains into them/);
});

test('D2 clean scanner stops and corrected scanner requires fresh review in procedure and reminders', () => {
    const scan = read('skills/scan/SKILL.md');
    assert.match(scan, /Round 2 \(only after Round 1 finds and fixes issues/);
    assert.match(scan, /clean Round 1 ends the scan; after Round 1 finds and fixes issues, Round 2 fresh-eyes review is mandatory/);
    assert.match(scan, /Size does not waive the issue-triggered gate/);
    assert.doesNotMatch(scan, /Fresh sub-agent is non-negotiable/);
});

test('D3 new design-spec save path matches its canonical role/type naming contract', () => {
    const design = read('skills/design-spec/SKILL.md');
    const pattern = design.match(/- Design spec: `design-specs\/([^`]+)`/)[1];
    const canonical = design.match(/- \*\*Naming:\*\* `([^`]+)`/)[1];
    assert.equal(pattern.replace('{feature-slug}', '{slug}'), canonical.replace('{type}', 'designspec'));
});

test('Native design intent uses the declared profile rather than demanding default sections', () => {
    const design = read('skills/design-spec/SKILL.md');
    const seed = section(design, '> **[BLOCKING] Step 0b', '> **[BLOCKING] Design-authority');
    assert.match(seed, /Resolve `specArtifacts`/);
    assert.match(seed, /Declared native profile: read its configured intent sections and native interaction carriers/);
    assert.match(seed, /Malformed or unsupported declarations stop without fallback/);
    assert.doesNotMatch(seed, /If found, READ \*\*§6/);
});

test('D4 every documented map handoff consumes one resolved file list; explicit scope survives unrelated work', t => {
    const update = read('skills/docs-manager/references/mode-update.md');
    const commands = [...update.matchAll(/^node \.claude\/scripts\/doc-impact-map\.cjs (.+)$/gm)].map(match => match[1]);
    assert.ok(commands.length >= 1, 'mapper remains discoverable without prescribing repeated calls');
    for (const command of commands) assert.ok(command.includes('<resolved_changed_files...>'), command);
    assert.match(update, /explicit `changed_files` → caller `base` diff → default working-tree diff/);
    assert.match(update, /resolved list is empty, record an empty-scope no-op and skip mapping/);
    const { root, env } = fixture(t);
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs/project-config.json'), JSON.stringify({ name: 'fixture', modules: [] }));
    fs.writeFileSync(path.join(root, 'unrelated.js'), 'unrelated dirty work');
    const requested = 'src/requested file.js';
    const result = spawnSync(process.execPath, [path.join(frameworkRoot, 'scripts/doc-impact-map.cjs'), '--json', requested], { cwd: root, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const map = JSON.parse(result.stdout);
    assert.equal(map.source, 'explicit file list');
    assert.equal(map.changedFileCount, 1);
    assert.ok(!result.stdout.includes('unrelated.js'));
});

test('D5 configuration lessons select parser/schema closure and never the prose enhancer', () => {
    const learn = section(read('skills/learn/SKILL.md'), '## Prompt Enhancement', '<!-- PROTOCOL-GUIDES:START -->');
    assert.match(learn, /Machine-readable configuration .*NEVER pass it to the Markdown enhancer/);
    assert.match(learn, /parser\/schema validator after the final write/);
    assert.match(learn, /carrier-specific final quality pass/);
    assert.doesNotMatch(learn, /regardless of target file|until all 3 tasks run/);
});

test('D6 documented validator executes from an isolated project root; all helper command paths exist', t => {
    const creator = read('skills/skill-creator/SKILL.md');
    const narrative = read('skills/skill-creator/references/creation-process.md');
    assert.doesNotMatch(creator + narrative, /(?:node|python3|`) scripts\/(?:validate-skills|init_skill|package_skill)/);
    for (const helper of ['init_skill.py', 'validate-skills.cjs', 'package_skill.py']) {
        const executable = `.claude/skills/skill-creator/scripts/${helper}`;
        assert.ok((creator + narrative).includes(executable), executable);
        assert.ok(fs.existsSync(path.join(frameworkRoot, executable.slice('.claude/'.length))), executable);
    }
    const { root, env } = fixture(t);
    const helperDir = path.join(root, '.claude/skills/skill-creator/scripts');
    fs.mkdirSync(helperDir, { recursive: true });
    fs.copyFileSync(path.join(frameworkRoot, 'skills/skill-creator/scripts/validate-skills.cjs'), path.join(helperDir, 'validate-skills.cjs'));
    const target = path.join(root, '.claude/skills/sample');
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'SKILL.md'), '---\nname: sample\ndescription: "[Utilities] Use for a synthetic fixture."\n---\n\n# Fixture\n');
    const documented = creator.match(/`node (\.claude\/skills\/skill-creator\/scripts\/validate-skills\.cjs) --path \.claude\/skills\/<skill-name>`/);
    assert.ok(documented, 'Create mode must provide a project-root validator command');
    const result = spawnSync(process.execPath, [documented[1], '--path', '.claude/skills/sample'], { cwd: root, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.match(result.stdout, /sample|1/);
});
