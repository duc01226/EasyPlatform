/**
 * HTML to Markdown converter using Turndown with GFM support
 */

/**
 * Convert HTML to Markdown with GFM extensions
 * @param {string} html - HTML content
 * @returns {string} Markdown content
 */
function htmlToMarkdown(html) {
  const TurndownService = require('turndown');
  const { gfm } = require('turndown-plugin-gfm');

  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined'
  });

  // Enable GFM extensions (tables, strikethrough, task lists)
  turndown.use(gfm);

  // Custom rule for code blocks with language hint
  turndown.addRule('codeBlock', {
    filter: (node) => {
      return node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
    },
    replacement: (content, node) => {
      const code = node.firstChild;
      const language = code.getAttribute('class')?.replace('language-', '') || '';
      const text = code.textContent || '';
      return `\n\`\`\`${language}\n${text}\n\`\`\`\n`;
    }
  });

  // Handle images with data URIs
  turndown.addRule('imageDataUri', {
    filter: (node) => {
      return node.nodeName === 'IMG' && node.getAttribute('src')?.startsWith('data:');
    },
    replacement: (content, node) => {
      const alt = node.getAttribute('alt') || 'image';
      const src = node.getAttribute('src');
      return `![${alt}](${src})`;
    }
  });

  // Clean up excessive newlines
  let markdown = turndown.turndown(html);
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  return markdown.trim();
}

module.exports = { htmlToMarkdown };
