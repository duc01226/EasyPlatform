import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const require = createRequire(import.meta.url);
const { validateConfig } = require('../../../hooks/lib/project-config-schema.cjs');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const guide = read('.claude/docs/hooks/extending-hooks.md');

function example(text, heading, predicate = () => true) {
    const start = text.indexOf(heading);
    assert.notEqual(start, -1, `missing section: ${heading}`);
    const section = text.slice(start + heading.length).split(/\n#{1,3} /)[0];
    const blocks = [...section.matchAll(/```(?:javascript|js|json)\r?\n([\s\S]*?)```/g)]
        .map(match => match[1]).filter(predicate);
    assert.equal(blocks.length, 1, `expected exactly one matching example: ${heading}`);
    return blocks[0];
}

function runExample(source, input, prefix = '') {
    const env = { ...process.env, CLAUDE_HOOK_DEBUG: '0', CK_DEBUG: '0' };
    delete env.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ['-e', prefix + source], {
        cwd: path.join(root, '.claude/hooks'), env, input, encoding: 'utf8', timeout: 10000
    });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.signal, null);
    return result;
}

function assertRewrite(source) {
    const input = { tool_input: { command: 'old && unrelated', timeout: 1234, cwd: '/fixture', extra: 'keep' } };
    const output = JSON.parse(new Function('input', 'rewrittenCommand', source)(input, 'new && unrelated').stdout);
    assert.deepEqual(output, { hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        updatedInput: { ...input.tool_input, command: 'new && unrelated' }
    } });
}

test('DOC-HOOK-001 syntax-only rewrite preserves fields without granting permission', () => {
    const source = example(guide, '### Bash PreToolUse hooks', code => code.includes('updatedInput'));
    assertRewrite(source);
    for (const mutant of [
        source.replace("hookEventName: 'PreToolUse',", "hookEventName: 'PreToolUse', permissionDecision: 'allow',"),
        source.replace('...input.tool_input, ', ''),
        source.replace("hookEventName: 'PreToolUse'", "hookEventName: 'PostToolUse'")
    ]) {
        assert.notEqual(mutant, source);
        assert.throws(() => assertRewrite(mutant), assert.AssertionError);
    }
});

function assertDrainedBlock(source) {
    const pending = [];
    const context = { result: { allowed: false, message: 'complete block message' }, name: 'example',
        debug() {}, process: { stderr: { write: value => pending.push(value) },
            exit() { throw new Error('immediate exit discards pending writes'); } } };
    vm.runInNewContext(`(function () { ${source}\nprocess.fellThrough = true; })();`, context);
    assert.equal(context.process.exitCode, 2);
    assert.equal(context.process.fellThrough, undefined, 'rejection must return before later allow logic');
    assert.deepEqual(pending, ['complete block message']);
    const allowed = { ...context, result: { allowed: true }, process: { stderr: { write() { assert.fail('allow wrote stderr'); } } } };
    vm.runInNewContext(`(function () { ${source}\n})();`, allowed);
    assert.equal(allowed.process.exitCode, undefined);
    assert.doesNotMatch(source, /process\.exit\s*\(/);
}

// The drain-then-return rejection is a HOOK contract, so it is asserted against the portable hooks
// guide — the same `guide` DOC-HOOK-001/004/005 read — not a project-reference doc. It carries no
// isFrameworkRepo guard for the same reason those three do not: `.claude/docs/hooks/extending-hooks.md`
// travels with the framework into every adopting project, so the coverage must travel with it.
//
// Do NOT repoint this at a project-reference doc's `## Validation Patterns`. That heading collides with
// an unrelated PROJECT-owned section (C# request/entity validation, registered for the backend session
// hook in `.claude/hooks/lib/session-init-helpers.cjs`), whose only fence is `csharp` — so the extractor
// matches zero examples and this test fails. A previous change made exactly that repoint, deleted the
// guide section, and added an isFrameworkRepo guard, which would also have dropped the coverage in every
// adopting project.
test('DOC-HOOK-002 backend rejection example drains and returns with exit 2', () => {
    const source = example(guide, '## Validation Patterns');
    assertDrainedBlock(source);
    for (const mutant of [source.replace('process.exitCode = 2;', 'process.exit(2);'),
        source.replace('process.exitCode = 2;', 'process.exitCode = 0;'),
        source.replace('return;', ''), source.replace('process.stderr.write(result.message);', '')]) {
        assert.notEqual(mutant, source);
        assert.throws(() => assertDrainedBlock(mutant));
    }
    // Real pipe boundary: the extracted snippet must not truncate a large diagnostic.
    const message = 'BLOCK-SENTINEL\n'.repeat(20000);
    const result = runExample(`function block(result) { ${source}\n}\nblock({allowed:false,message:'BLOCK-SENTINEL\\n'.repeat(20000)});`, '',
        "const name='example'; const debug=()=>{};\n");
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, message);
});

test('DOC-HOOK-003 disabled experience example validates with a machine-readable reason', () => {
    const source = example(read('.claude/docs/configuration/experience-verification.md'), '## Honest non-applicability');
    // The guide supplies a block to merge, not the unrelated required project fields.
    const config = { project: { name: 'fixture' }, framework: { name: 'fixture' }, designSystem: { docsPath: 'docs/design', appMappings: [] }, ...JSON.parse(source) };
    assert.equal(config.experienceVerification.enabled, false);
    assert.deepEqual(config.experienceVerification.surfaces, []);
    const valid = validateConfig(config);
    assert.equal(valid.valid, true, valid.errors.join('; '));
    for (const reason of [undefined, '', '   ']) {
        const mutated = structuredClone(config);
        mutated.experienceVerification.notApplicableReason = reason;
        const result = validateConfig(mutated);
        assert.equal(result.valid, false);
        assert.ok(result.errors.some(error => error.startsWith('experienceVerification.notApplicableReason:')));
    }
});

test('DOC-HOOK-004 explicit security example denies failures and preserves benign commands', () => {
    const source = example(guide, '### Bash PreToolUse hooks', code => code.includes('function evaluate'));
    const event = command => JSON.stringify({ tool_name: 'Bash', tool_input: { command } });
    for (const [input, predicate, status, message] of [
        [event('echo safe'), 'return false;', 0, null],
        [event('blocked'), 'return true;', 2, /BLOCKED: explain the safe alternative/],
        ['{', 'return false;', 2, /input|JSON|parse/i],
        [event('echo safe'), "throw new Error('fixture failure');", 2, /fixture failure/],
        [JSON.stringify({ tool_name: 'Read', tool_input: { file_path: 'README.md' } }), "throw new Error('must not evaluate');", 0, null]
    ]) {
        const result = runExample(source, input, `function shouldBlock() { ${predicate} }\n`);
        assert.equal(result.status, status, result.stderr);
        assert.equal(result.stdout, '');
        if (message) assert.match(result.stderr, message);
        else assert.equal(result.stderr, '');
    }
    for (const [field, input, predicate] of [
        ['inputErrorCode', '{', 'return false;'],
        ['errorExitCode', event('echo safe'), "throw new Error('fixture failure');"]
    ]) {
        const mutant = source.replace(`${field}: 2`, `${field}: 0`);
        assert.notEqual(mutant, source);
        const result = runExample(mutant, input, `function shouldBlock() { ${predicate} }\n`);
        assert.throws(() => assert.equal(result.status, 2), assert.AssertionError);
        assert.equal(result.status, 0, 'mutant relaxes only its selected error policy');
    }
});

test('DOC-HOOK-005 generic blocking example explicitly retains allow-on-error compatibility', () => {
    assert.match(guide, /runBlockingHook[^\n]*allow-on-error/);
    assert.match(guide, /policy uncertainty[^\n]*runtime errors/i);
    const source = example(guide, '### Blocking Hook Template');
    const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'echo safe' } });
    for (const [predicate, status] of [['return false;', 0], ['return true;', 2], ["throw new Error('fixture failure');", 0]]) {
        const result = runExample(source, input, `function shouldBlock() { ${predicate} }\n`);
        assert.equal(result.status, status, result.stderr);
        assert.equal(result.stdout, '');
        if (status === 2) assert.match(result.stderr, /Operation blocked: reason explanation/);
        if (predicate.startsWith('throw')) assert.notEqual(result.stderr, '');
    }
});
