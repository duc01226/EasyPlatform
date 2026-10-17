/**
 * Alert wording shared by every notification provider.
 *
 * Holds the events whose copy must read identically on every channel
 * (desktop, Discord, Slack, Telegram): the turn-complete, session-ended and
 * question alerts. Each alert kind must stay distinguishable from the others —
 * the turn-complete copy never mentions a session or a question, because the
 * conversation is still open and nothing is being asked.
 */
'use strict';

const EVENT_COPY = Object.freeze({
    Stop: Object.freeze({
        title: 'AI Agent Turn Complete',
        summary: 'AI agent finished its turn; the conversation is still open'
    }),
    SessionEnd: Object.freeze({
        title: 'AI Agent Session Ended',
        summary: 'Main agent session ended'
    }),
    AskUserQuestion: Object.freeze({
        title: 'AI Agent Has a Question',
        summary: 'AI agent is asking a question — please check and answer'
    })
});

module.exports = { EVENT_COPY };
