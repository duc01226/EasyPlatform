/**
 * Slack notification provider using Block Kit format
 * Uses incoming webhooks - zero dependencies
 */
'use strict';

const path = require('path');
const { send } = require('../lib/sender.cjs');
const { EVENT_COPY } = require('../lib/event-copy.cjs');

/**
 * Get title based on hook event type
 * @param {string} hookType - Hook event name
 * @returns {string} Human-readable title
 */
function getTitle(hookType) {
  if (Object.prototype.hasOwnProperty.call(EVENT_COPY, hookType)) {
    return EVENT_COPY[hookType].title;
  }
  switch (hookType) {
    case 'SubagentStop':
      return 'Subagent Complete';
    case 'AskUserPrompt':
      return 'AI Agent Needs Input';
    default:
      return 'AI Agent Event';
  }
}

/**
 * Get concise event summary text for events with shared alert copy
 * @param {string} hookType - Hook event name
 * @returns {string}
 */
function getSummary(hookType) {
  return Object.prototype.hasOwnProperty.call(EVENT_COPY, hookType)
    ? `${EVENT_COPY[hookType].summary}.`
    : '';
}

/**
 * Build Slack Block Kit blocks array
 * @param {Object} input - Hook input with snake_case fields
 * @param {string} hookType - Hook event name
 * @param {string} projectName - Extracted project name
 * @param {string} sessionId - Truncated session ID
 * @returns {Array} Block Kit blocks
 */
function buildBlocks(input, hookType, projectName, sessionId) {
  const timestamp = new Date().toLocaleString();
  const cwd = input.cwd || 'Unknown';

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: getTitle(hookType) }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Project:*\n${projectName}` },
        { type: 'mrkdwn', text: `*Time:*\n${timestamp}` },
        { type: 'mrkdwn', text: `*Session:*\n\`${sessionId}...\`` },
        { type: 'mrkdwn', text: `*Event:*\n${hookType}` }
      ]
    },
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `📍 \`${cwd}\`` }
      ]
    }
  ];

  const summary = getSummary(hookType);
  if (summary) {
    blocks.splice(1, 0, {
      type: 'section',
      text: { type: 'mrkdwn', text: summary }
    });
  }

  // Add agent_type for SubagentStop
  if (hookType === 'SubagentStop' && input.agent_type) {
    blocks.splice(2, 0, {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Agent Type:* ${input.agent_type}` }
    });
  }

  return blocks;
}

/**
 * Format message for Slack webhook
 * @param {Object} input - Hook input with snake_case fields
 * @returns {Object} Slack payload with text fallback and blocks
 */
function formatMessage(input) {
  const hookType = input.hook_event_name || 'unknown';
  const projectDir = input.cwd || '';
  const projectName = path.basename(projectDir) || 'Unknown';
  const sessionId = (input.session_id || '').slice(0, 8);
  const summary = getSummary(hookType);

  return {
    // Fallback required: Slack shows it in push/preview, so it names the project too.
    text: summary ? `[${projectName}] ${summary}` : `AI Agent: ${hookType} in ${projectName}`,
    blocks: buildBlocks(input, hookType, projectName, sessionId)
  };
}

module.exports = {
  name: 'slack',

  /**
   * Check if Slack provider is enabled
   * @param {Object} env - Environment variables
   * @returns {boolean} True if SLACK_WEBHOOK_URL is set
   */
  isEnabled: (env) => !!env.SLACK_WEBHOOK_URL,

  /**
   * Send notification to Slack
   * @param {Object} input - Hook input with snake_case fields
   * @param {Object} env - Environment variables
   * @returns {Promise<{success: boolean, error?: string, throttled?: boolean}>}
   */
  send: async (input, env) => {
    const payload = formatMessage(input);
    return send('slack', env.SLACK_WEBHOOK_URL, payload, { event: input.hook_event_name });
  }
};
