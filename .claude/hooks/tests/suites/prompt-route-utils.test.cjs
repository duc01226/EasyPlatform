'use strict';

const { assertTrue } = require('../lib/assertions.cjs');
const { stripCode } = require('../../lib/prompt-route-utils.cjs');
const commit = require('../../commit-skill-route.cjs');
const judgement = require('../../judgement-integrity-route.cjs');
const ai = require('../../ai-feature-route.cjs');

const ROUTERS = [
    { name: 'commit', sample: 'git commit', ask: 'commit this', routes: commit.isCommitRequest },
    { name: 'judgement', sample: 'any gaps?', ask: 'is this approach sound?', routes: judgement.isJudgementRequest },
    { name: 'AI', sample: 'implement RAG retrieval', ask: 'implement semantic search', routes: ai.isAiFeaturePrompt }
];

module.exports = {
    name: 'prompt-route-utils',
    tests: [
        {
            name: '[prompt-route-utils] quoted code never becomes intent in any advisory router',
            fn: () => {
                // Given commands, verdicts and AI work used only as code samples
                const quote = text => [
                    `\`${text}\``, `\`\`${text}\`\``, `\`\`\`\`${text}\`\`\`\``,
                    `\`\`\`text\n${text}\n\`\`\``, `~~~text\n${text}\n~~~`,
                    `~~~~text\n${text}\n~~~~~`, `\`\`a \` ${text}\`\``,
                    `\`\`\n${text}\n\`\``, `\`\`\r\n${text}\r\n\`\``, `\`\`\r${text}\r\`\``
                ];
                for (const router of ROUTERS) {
                    for (const prompt of quote(router.sample)) {
                        // When each real classifier sees the sample, then it does not route
                        assertTrue(!router.routes(prompt), `${router.name} routed code: ${JSON.stringify(prompt)}`);
                    }
                }
            }
        },
        {
            name: '[prompt-route-utils] real requests outside code remain available to every router',
            fn: () => {
                // Given each router's real request and unrelated quoted samples
                for (const router of ROUTERS) {
                    const prompts = [router.ask, `\`\`other example\`\`; ${router.ask}`, `~~~text\nother example\n~~~\n${router.ask}`];
                    for (const prompt of prompts) {
                        // When classified, then the prose request still routes
                        assertTrue(router.routes(prompt), `${router.name} lost prose: ${JSON.stringify(prompt)}`);
                    }
                }
                // Given a quoted gap hunt before an actual evaluation request
                const leans = judgement.detectLeans('example: ``any gaps?``; is this approach sound?');
                // When classified, then only the actual request supplies a lean
                assertTrue(leans.length === 1 && leans[0] === judgement.LEANS.EVALUATION, 'quoted gap hunt must not contaminate the evaluation lean');
            }
        },
        {
            name: '[prompt-route-utils] unmatched inline delimiters preserve prose and delimiter lengths stay exact',
            fn: () => {
                // Given unmatched or mismatched inline backticks, escaped delimiters, and separate paragraphs
                const prose = ['example `` any gaps?', 'example `` any gaps? `', 'example \\` any gaps? \\`', '`example\n\nany gaps?`'];
                for (const prompt of prose) {
                    // When stripped, then non-code prose remains rather than being swallowed
                    assertTrue(judgement.isJudgementRequest(prompt), `non-code request lost: ${JSON.stringify(prompt)}`);
                }
                assertTrue(stripCode(null) === '' && stripCode(undefined) === '', 'empty optional inputs stay empty');
                assertTrue(stripCode('example `` any gaps? `') === 'example `` any gaps? `', 'unequal backtick strings are not a code span');
            }
        },
        {
            name: '[prompt-route-utils] fences close only on the matching type and sufficient length across platform line endings',
            fn: () => {
                // Given LF, CRLF and CR prompts, with short/mismatched/non-closing fence-looking content
                for (const eol of ['\n', '\r\n', '\r']) {
                    const samples = [
                        ['~~~~text', '~~~', 'any gaps?', '~~~~'],
                        ['~~~text', '```', 'any gaps?', '~~~'],
                        ['~~~text', '~~~ not a closer', 'any gaps?', '~~~'],
                        ['```text', 'any gaps?'], // an unclosed block remains code through the document end
                        ['   ~~~text', 'any gaps?', '   ~~~']
                    ];
                    for (const lines of samples) {
                        // When classified, then all fenced sample content is silent
                        assertTrue(!judgement.isJudgementRequest(lines.join(eol)), `fence leaked on ${JSON.stringify(lines)}`);
                    }
                    // When a valid closer is followed by a request, then prose remains visible
                    assertTrue(judgement.isJudgementRequest(['~~~~text', 'example', '~~~~~', 'any gaps?'].join(eol)), 'prose after longer valid closer must survive');
                }
                assertTrue(judgement.isJudgementRequest('example ~~~ any gaps? ~~~'), 'inline tildes are prose, not a fenced block');
            }
        }
    ]
};
