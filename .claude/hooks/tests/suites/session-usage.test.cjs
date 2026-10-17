'use strict';

/**
 * Session usage reader (hooks/lib/session-usage.cjs) — guarded contracts:
 *   BR-GWF-10  each model response counts once (same message.id + requestId: last line wins),
 *              `total` = input + cache_creation + output, cache_read reported but excluded;
 *   BR-GWF-07  usage includes every sub-agent transcript;
 *   BR-GWF-11  a line over the cap is skipped with bounded memory and counted, never looped on;
 *   hook path  an unchanged transcript costs zero bytes read; growth reads only appended bytes.
 * Each test name starts with its TC id. Fixtures are synthetic transcripts in unique temp dirs,
 * removed in `finally`. The lib reads no env and spawns nothing, so no env is mutated here.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOOKS_DIR = path.resolve(__dirname, '../..');
const usageLib = require(path.join(HOOKS_DIR, 'lib', 'session-usage.cjs'));

const SESSION = 'session-1';
const KB = 1024;

function withFixture(fn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'session-usage-test-'));
    const projectDir = path.join(root, 'project-transcripts');
    fs.mkdirSync(projectDir, { recursive: true });
    const fx = {
        root,
        main: path.join(projectDir, `${SESSION}.jsonl`),
        subDir: path.join(projectDir, SESSION, 'subagents'),
        sub(id) {
            fs.mkdirSync(this.subDir, { recursive: true });
            return path.join(this.subDir, `agent-${id}.jsonl`);
        }
    };
    try {
        return fn(fx);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

/** One assistant usage line (the Claude transcript shape), newline-terminated. */
function usageLine(id, requestId, [input, cacheCreation, cacheRead, output], content = [], pad = 0) {
    const blocks = pad > 0 ? [...content, { type: 'text', text: 'x'.repeat(pad) }] : content;
    return JSON.stringify({
        type: 'assistant',
        requestId,
        message: {
            id,
            role: 'assistant',
            content: blocks,
            usage: {
                input_tokens: input,
                cache_creation_input_tokens: cacheCreation,
                cache_read_input_tokens: cacheRead,
                output_tokens: output
            }
        }
    }) + '\n';
}

/** A usage line padded to roughly `bytes` bytes (the padding is plain text content). */
function bigUsageLine(id, requestId, usage, bytes) {
    const base = Buffer.byteLength(usageLine(id, requestId, usage, [], 1));
    return usageLine(id, requestId, usage, [], Math.max(1, bytes - base + 1));
}

/** A tool-result line: no usage, so it must not change the dedupe key. */
function toolResultLine(text = 'tool output') {
    return JSON.stringify({
        type: 'user',
        message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_x', content: text }] }
    }) + '\n';
}

/** Real fs with a read counter: bytes read, read calls and the largest single read requested. */
function countingFs() {
    const counter = { bytes: 0, calls: 0, maxLength: 0 };
    const io = {
        statSync: fs.statSync,
        openSync: fs.openSync,
        closeSync: fs.closeSync,
        readdirSync: fs.readdirSync,
        readSync(fd, buffer, offset, length, position) {
            counter.calls += 1;
            counter.maxLength = Math.max(counter.maxLength, length);
            const read = fs.readSync(fd, buffer, offset, length, position);
            counter.bytes += read;
            return read;
        }
    };
    return { io, counter, reset: () => Object.assign(counter, { bytes: 0, calls: 0, maxLength: 0 }) };
}

const totals = (input, cache_creation, cache_read, output) => ({ input, cache_creation, cache_read, output });

const tests = [
    {
        name: '[usage] TC-GWF-028 each response counts once (last line wins) across main + two sub-agents; total excludes cache_read',
        fn: () => withFixture(fx => {
            // Given main: response A streamed over 3 lines (final usage 2/10/100/40) + response B (3/0/50/7)
            fs.writeFileSync(fx.main,
                usageLine('msg_A', 'req_A', [1, 10, 100, 5]) +
                usageLine('msg_A', 'req_A', [1, 10, 100, 20]) +
                toolResultLine() +
                usageLine('msg_A', 'req_A', [2, 10, 100, 40]) +
                usageLine('msg_B', 'req_B', [3, 0, 50, 7]));
            // And sub-agent a1: response C over 2 lines (final 4/20/200/9)
            fs.writeFileSync(fx.sub('a1'),
                usageLine('msg_C', 'req_C', [4, 20, 200, 1]) +
                usageLine('msg_C', 'req_C', [4, 20, 200, 9]));
            // And sub-agent a2: response D (5/5/5/5), then E over 2 lines (final 6/0/60/11)
            fs.writeFileSync(fx.sub('a2'),
                usageLine('msg_D', 'req_D', [5, 5, 5, 5]) +
                usageLine('msg_E', 'req_E', [6, 0, 60, 3]) +
                usageLine('msg_E', 'req_E', [6, 0, 60, 11]));

            // When read in full
            const result = usageLib.readUsage(fx.main);

            // Then each file holds the hand sum over unique keys of the last line's values
            assert.deepEqual(result.main.totals, totals(5, 10, 150, 47), 'main: A(last) + B');
            assert.deepEqual(result.subagents.map(s => s.name), ['agent-a1', 'agent-a2'], 'both sub-agents found');
            assert.deepEqual(result.subagents[0].totals, totals(4, 20, 200, 9), 'a1: C(last)');
            assert.deepEqual(result.subagents[1].totals, totals(11, 5, 65, 16), 'a2: D + E(last)');
            // And total = input + cache_creation + output over all three files (cache_read excluded)
            const expected = (5 + 10 + 47) + (4 + 20 + 9) + (11 + 5 + 16);
            assert.equal(result.total, expected, 'non-cached total over main + sub-agents');
            assert.equal(result.skippedLongLines, 0);

            // And the incremental entry point reports the same total
            assert.equal(usageLib.readUsageIncremental(fx.main, null).total, expected, 'incremental total agrees');
        })
    },
    {
        name: '[usage] TC-GWF-029 a truncated last line is skipped and the complete lines count',
        fn: () => withFixture(fx => {
            // Given two complete responses, a malformed complete line, and a cut-off last line
            const cut = usageLine('msg_Z', 'req_Z', [900, 900, 900, 900]);
            fs.writeFileSync(fx.main,
                usageLine('msg_A', 'req_A', [1, 2, 3, 4]) +
                '{"message":{"usage":{"input_tokens":\n' +
                usageLine('msg_B', 'req_B', [10, 20, 30, 40]) +
                cut.slice(0, Math.floor(cut.length / 2)));

            // When read in full and incrementally
            const full = usageLib.readUsage(fx.main);
            const inc = usageLib.readUsageIncremental(fx.main, null);

            // Then only the complete, parseable lines count
            assert.deepEqual(full.main.totals, totals(11, 22, 33, 44));
            assert.equal(full.total, 11 + 22 + 44);
            assert.equal(inc.total, 11 + 22 + 44);
            // And the incremental offset stops before the partial line, so it is re-read later
            const size = fs.statSync(fx.main).size;
            assert.equal(inc.state.files.main.offset, size - Math.floor(cut.length / 2));
        })
    },
    {
        name: '[usage] TC-GWF-030 no sub-agent dir returns the main total with subagents: []',
        fn: () => withFixture(fx => {
            // Given only a main transcript (no <session>/subagents dir)
            fs.writeFileSync(fx.main, usageLine('msg_A', 'req_A', [1, 2, 300, 4]));

            // When read
            const result = usageLib.readUsage(fx.main);

            // Then the main total returns and sub-agents are empty
            assert.deepEqual(result.subagents, []);
            assert.equal(result.total, 7);
            assert.deepEqual(result.unreadable, []);
        })
    },
    {
        name: '[usage] TC-GWF-047 one response over 3 lines with a tool result between counts once, full and split incremental',
        fn: () => withFixture(fx => {
            // Given one response written as 3 lines with the same key, a tool-result line between two
            const first = usageLine('msg_A', 'req_A', [1, 10, 100, 5]) + toolResultLine();
            const rest = usageLine('msg_A', 'req_A', [1, 10, 100, 25]) + toolResultLine() +
                usageLine('msg_A', 'req_A', [1, 10, 100, 60]);
            fs.writeFileSync(fx.main, first + rest);

            // When read in full, Then it counts once with the last line's usage
            const full = usageLib.readUsage(fx.main);
            assert.deepEqual(full.main.totals, totals(1, 10, 100, 60));
            assert.equal(full.total, 71);

            // When read incrementally with the split between the lines (and again mid-line)
            for (const split of [first.length, first.length + 7]) {
                fs.writeFileSync(fx.main, (first + rest).slice(0, split));
                const partial = usageLib.readUsageIncremental(fx.main, null);
                fs.appendFileSync(fx.main, (first + rest).slice(split));
                const after = usageLib.readUsageIncremental(fx.main, JSON.parse(JSON.stringify(partial.state)));
                // Then the response still counts once, with the last line's usage
                assert.equal(partial.total, 16, `split ${split}: first read counts the first line`);
                assert.deepEqual(after.state.files.main.totals, totals(1, 10, 100, 60), `split ${split}`);
                assert.equal(after.total, 71, `split ${split}: counted once`);
            }
        })
    },
    {
        name: '[usage] TC-GWF-048 no growth since the previous incremental read reads 0 bytes and keeps the totals',
        fn: () => withFixture(fx => {
            // Given main + one sub-agent, read once, with a partial last line pending in main
            fs.writeFileSync(fx.main, usageLine('msg_A', 'req_A', [1, 2, 3, 4]) + '{"partial":');
            fs.writeFileSync(fx.sub('a1'), usageLine('msg_C', 'req_C', [10, 20, 30, 40]));
            const first = usageLib.readUsageIncremental(fx.main, null);
            const stub = countingFs();

            // When read incrementally again with no growth
            const second = usageLib.readUsageIncremental(fx.main, first.state, { fs: stub.io });

            // Then 0 bytes are read and the totals are unchanged
            assert.equal(stub.counter.calls, 0, 'no read call');
            assert.equal(stub.counter.bytes, 0, 'no bytes read');
            assert.equal(second.total, first.total);
            assert.equal(second.total, 7 + 70);
            assert.deepEqual(second.state, first.state);
        })
    },
    {
        name: '[usage] TC-GWF-049 1 KB appended reads at most the appended bytes plus the carried partial line',
        fn: () => withFixture(fx => {
            // Given a read transcript whose last line was still partial
            const pending = usageLine('msg_B', 'req_B', [100, 0, 0, 1]);
            const carried = pending.slice(0, 20);
            fs.writeFileSync(fx.main, usageLine('msg_A', 'req_A', [1, 2, 3, 4]) + carried);
            const before = usageLib.readUsageIncremental(fx.main, null);
            assert.equal(before.total, 7);

            // When about 1 KB is appended (the rest of the partial line + new lines) and read again
            let appended = pending.slice(20);
            let n = 0;
            while (Buffer.byteLength(appended) < KB) {
                appended += usageLine(`msg_N${n}`, `req_N${n}`, [1, 0, 0, 1]);
                n += 1;
            }
            fs.appendFileSync(fx.main, appended);
            const stub = countingFs();
            const after = usageLib.readUsageIncremental(fx.main, before.state, { fs: stub.io });

            // Then the bytes read are at most the appended bytes plus the carried partial line
            assert.ok(stub.counter.bytes <= Buffer.byteLength(appended) + Buffer.byteLength(carried),
                `read ${stub.counter.bytes} bytes`);
            // And the totals add only the new lines (B once + n small responses)
            assert.equal(after.total, 7 + 101 + 2 * n);
        })
    },
    {
        name: '[usage] TC-GWF-056 a line over the cap is skipped with bounded reads and carry, counted once, never re-read',
        fn: () => withFixture(fx => {
            const opts = extra => ({ chunkBytes: 64 * KB, maxLineBytes: 128 * KB, ...extra });
            // Given a normal line, a 100 KB usage line, a 300 KB usage line and another normal line
            const n1 = usageLine('msg_1', 'req_1', [1, 1, 1, 1]);
            const l100 = bigUsageLine('msg_2', 'req_2', [10, 10, 10, 10], 100 * KB);
            const l300 = bigUsageLine('msg_3', 'req_3', [1000, 1000, 1000, 1000], 300 * KB);
            const n2 = usageLine('msg_4', 'req_4', [2, 2, 2, 2]);
            fs.writeFileSync(fx.main, n1 + l100 + l300 + n2);
            const expected = 3 + 30 + 6;

            for (const mode of ['full', 'incremental']) {
                // When read with injected caps
                const stub = countingFs();
                const probe = {};
                const result = mode === 'full'
                    ? usageLib.readUsage(fx.main, opts({ fs: stub.io, probe }))
                    : usageLib.readUsageIncremental(fx.main, null, opts({ fs: stub.io, probe }));
                // Then the call ends, no single read exceeds 64 KB, the carry never exceeds 128 KB
                assert.ok(stub.counter.maxLength <= 64 * KB, `${mode}: largest read ${stub.counter.maxLength}`);
                assert.ok(probe.maxCarryBytes > 64 * KB, `${mode}: the 100 KB line was carried across chunks`);
                assert.ok(probe.maxCarryBytes <= 128 * KB, `${mode}: carry ${probe.maxCarryBytes}`);
                // And the normal lines and the 100 KB line count, the 300 KB line does not
                assert.equal(result.total, expected, `${mode}: total`);
                const skipped = mode === 'full' ? result.skippedLongLines : result.state.files.main.skippedLongLines;
                assert.equal(skipped, 1, `${mode}: skippedLongLines`);
                if (mode === 'incremental') {
                    // And a following call with no growth reads 0 bytes
                    const again = countingFs();
                    const next = usageLib.readUsageIncremental(fx.main, result.state, opts({ fs: again.io }));
                    assert.equal(again.counter.bytes, 0, 'no growth: 0 bytes');
                    assert.equal(next.total, expected);
                }
            }

            // Given a 148 KB line whose carry reaches exactly the cap and whose tail ends it in the next chunk
            const l148 = bigUsageLine('msg_5', 'req_5', [500, 500, 500, 500], 148 * KB);
            fs.writeFileSync(fx.main, l148 + n2);
            const boundaryProbe = {};
            const boundary = usageLib.readUsage(fx.main, opts({ probe: boundaryProbe }));
            // Then the line is still over the cap: skipped and counted, never assembled past the cap
            assert.equal(boundaryProbe.maxCarryBytes, 128 * KB, 'carry reached the cap exactly');
            assert.equal(boundary.skippedLongLines, 1, 'the 148 KB line is skipped');
            assert.equal(boundary.total, 6, 'only the normal line counts');

            // Given a 300 KB line still unterminated at size
            fs.writeFileSync(fx.main, n1 + l300.slice(0, -1));
            const size = fs.statSync(fx.main).size;
            // When read incrementally
            const first = usageLib.readUsageIncremental(fx.main, null, opts());
            // Then offset = size with skippingLongLine set, and only the normal line counts
            assert.equal(first.state.files.main.offset, size);
            assert.equal(first.state.files.main.skippingLongLine, true);
            assert.equal(first.total, 3);
            // When a newline and one normal line are appended and read again
            fs.appendFileSync(fx.main, '\n' + n2);
            const stub = countingFs();
            const second = usageLib.readUsageIncremental(fx.main, first.state, opts({ fs: stub.io }));
            // Then only the normal line counts, the skip is counted once, and skipped bytes are not re-read
            assert.equal(second.total, 3 + 6);
            assert.equal(second.state.files.main.skippedLongLines, 1);
            assert.equal(second.state.files.main.skippingLongLine, false);
            assert.equal(stub.counter.bytes, 1 + Buffer.byteLength(n2), 'reads only the appended bytes');
        })
    },
    {
        name: '[usage] shrink below the stored offset restarts that file from 0 with zero totals',
        fn: () => withFixture(fx => {
            // Given a read transcript
            fs.writeFileSync(fx.main, usageLine('msg_A', 'req_A', [50, 50, 50, 50]) + usageLine('msg_B', 'req_B', [1, 1, 1, 1]));
            const first = usageLib.readUsageIncremental(fx.main, null);
            assert.equal(first.total, 153);
            // When it is rewritten smaller than the stored offset
            fs.writeFileSync(fx.main, usageLine('msg_C', 'req_C', [1, 0, 0, 1]));
            const second = usageLib.readUsageIncremental(fx.main, first.state);
            // Then only the new content counts
            assert.equal(second.total, 2);
            assert.deepEqual(second.state.files.main.totals, totals(1, 0, 0, 1));
        })
    },
    {
        name: '[usage] a sub-agent file appearing after a read is picked up; unsafe or non-transcript names are ignored',
        fn: () => withFixture(fx => {
            // Given a read main transcript
            fs.writeFileSync(fx.main, usageLine('msg_A', 'req_A', [1, 0, 0, 1]));
            const first = usageLib.readUsageIncremental(fx.main, null);
            // When a sub-agent transcript appears, plus a meta file and an unsafe name
            fs.writeFileSync(fx.sub('b2'), usageLine('msg_S', 'req_S', [5, 0, 0, 5]));
            fs.writeFileSync(path.join(fx.subDir, 'agent-b2.meta.json'), '{}');
            fs.writeFileSync(path.join(fx.subDir, 'agent-bad id.jsonl'), usageLine('msg_X', 'req_X', [99, 0, 0, 99]));
            const second = usageLib.readUsageIncremental(fx.main, first.state);
            // Then the new sub-agent counts and the other names do not
            assert.equal(second.total, 2 + 10);
            assert.deepEqual(Object.keys(second.state.files).sort(), ['agent-b2', 'main']);
            assert.deepEqual(usageLib.readUsage(fx.main).subagents.map(s => s.name), ['agent-b2']);
        })
    },
    {
        name: '[usage] tool and skill call counts; only allowlisted names and no message text are returned (SEC-09)',
        fn: () => withFixture(fx => {
            const secret = 'SECRET-PROMPT-TEXT-123';
            const skill = (id, name) => ({ type: 'tool_use', id, name: 'Skill', input: { skill: name, args: secret } });
            // Given tool calls, Skill calls (one plugin-qualified), a repeated line re-carrying a tool block, and text
            fs.writeFileSync(fx.main,
                usageLine('msg_A', 'req_A', [1, 0, 0, 1], [{ type: 'text', text: secret }]) +
                usageLine('msg_A', 'req_A', [1, 0, 0, 2], [{ type: 'tool_use', id: 'toolu_1', name: 'Read', input: { file_path: secret } }]) +
                usageLine('msg_A', 'req_A', [1, 0, 0, 2], [{ type: 'tool_use', id: 'toolu_1', name: 'Read', input: { file_path: secret } }]) +
                usageLine('msg_B', 'req_B', [1, 0, 0, 1], [skill('toolu_2', 'why-review'), skill('toolu_3', 'plugin:start')]) +
                usageLine('msg_C', 'req_C', [1, 0, 0, 1], [{ type: 'tool_use', id: 'toolu_4', name: `bad name ${secret}`, input: {} }]));
            // When read in full
            const result = usageLib.readUsage(fx.main);
            // Then calls are counted once per tool_use id, names outside the allowlist fold into `other`
            assert.deepEqual(result.main.tools, { Read: 1, Skill: 2, other: 1 });
            assert.deepEqual(result.main.skills, { 'why-review': 1, other: 1 });
            // And no message text or tool input leaves the lib
            assert.ok(!JSON.stringify(result).includes(secret), 'no message content in the result');
        })
    },
    {
        name: '[usage] a missing transcript fails soft: zero totals, listed as unreadable',
        fn: () => withFixture(fx => {
            // Given no transcript file, When read, Then nothing throws and the file is marked unreadable
            const full = usageLib.readUsage(fx.main);
            assert.equal(full.total, 0);
            assert.deepEqual(full.unreadable, ['main']);
            const inc = usageLib.readUsageIncremental(fx.main, { version: 1, files: { main: 'garbage' } });
            assert.equal(inc.total, 0);
        })
    }
];

module.exports = { name: 'Session Usage Reader', tests };
