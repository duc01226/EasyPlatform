/**
 * Tests for docx-to-markdown converter
 */

const path = require('path');
const fs = require('fs');
const { describe, it, expect } = require('./test-framework.cjs');

const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts', 'lib');

// Test output-handler
describe('output-handler', () => {
  const { resolveOutputPath, resolveImagesPath } = require(path.join(SCRIPTS_DIR, 'output-handler.cjs'));

  it('should resolve output path from input (no output specified)', () => {
    const input = path.join('path', 'to', 'document.docx');
    const result = resolveOutputPath(input, null, '.md');
    const expected = path.join('path', 'to', 'document.md');
    expect(result).toBe(expected);
  });

  it('should use explicit output path', () => {
    const input = path.join('path', 'to', 'document.docx');
    const output = path.join('other', 'path', 'result.md');
    const result = resolveOutputPath(input, output, '.md');
    expect(result).toContain('result.md');
  });

  it('should add .md extension if missing', () => {
    const input = path.join('path', 'to', 'document.docx');
    const output = path.join('other', 'path', 'result');
    const result = resolveOutputPath(input, output, '.md');
    expect(result).toContain('result.md');
  });

  it('should return null for inline images when no path specified', () => {
    const result = resolveImagesPath(null, '/path/to/output.md');
    expect(result).toBe(null);
  });
});

// Test html-to-markdown
describe('html-to-markdown', () => {
  const { htmlToMarkdown } = require(path.join(SCRIPTS_DIR, 'html-to-markdown.cjs'));

  it('should convert basic HTML to Markdown', () => {
    const html = '<h1>Title</h1><p>Paragraph text.</p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('# Title');
    expect(md).toContain('Paragraph text.');
  });

  it('should convert bold and italic', () => {
    const html = '<p><strong>bold</strong> and <em>italic</em></p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('**bold**');
    expect(md).toContain('*italic*');
  });

  it('should convert links', () => {
    const html = '<p><a href="https://example.com">Link text</a></p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('[Link text](https://example.com)');
  });

  it('should convert unordered lists', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const md = htmlToMarkdown(html);
    // Turndown may use different spacing (e.g., "-   Item 1")
    expect(md).toContain('Item 1');
    expect(md).toContain('Item 2');
    expect(md).toContain('-');
  });

  it('should convert tables to GFM format', () => {
    const html = '<table><tr><th>Header</th></tr><tr><td>Cell</td></tr></table>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('Header');
    expect(md).toContain('Cell');
    expect(md).toContain('|');
  });

  it('should handle headings at different levels', () => {
    const html = '<h1>H1</h1><h2>H2</h2><h3>H3</h3>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('# H1');
    expect(md).toContain('## H2');
    expect(md).toContain('### H3');
  });

  it('should handle images with data URIs', () => {
    const html = '<p><img src="data:image/png;base64,abc123" alt="test image"></p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('![test image]');
    expect(md).toContain('data:image/png;base64');
  });
});

// Test converter availability
describe('converter', () => {
  const { isAvailable } = require(path.join(SCRIPTS_DIR, 'converter.cjs'));

  it('should report availability status', () => {
    const available = isAvailable();
    // Should be true after npm install, false before
    expect(typeof available).toBe('boolean');
  });
});
