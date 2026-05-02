/**
 * Tests for converter.cjs and related modules
 */

const fs = require('fs');
const path = require('path');

describe('config-loader', () => {
  const { loadCSS, loadMarkdown, buildConfig, getCSSPath, DEFAULT_CSS_PATH } = require('../scripts/lib/config-loader.cjs');
  const fixturesDir = path.join(__dirname, 'fixtures');
  const sampleMd = path.join(fixturesDir, 'sample.md');

  it('should have correct DEFAULT_CSS_PATH', () => {
    assert.ok(DEFAULT_CSS_PATH.endsWith('default-style.css'), 'DEFAULT_CSS_PATH should end with default-style.css');
  });

  it('should load default CSS', () => {
    const css = loadCSS(null);
    assert.ok(css.length > 0, 'Default CSS should not be empty');
    assert.ok(css.includes('body'), 'CSS should have body styles');
  });

  it('should throw for missing custom CSS via loadCSS', () => {
    let threw = false;
    try {
      loadCSS('/nonexistent/path/to/file.css');
    } catch (e) {
      threw = true;
      assert.ok(e.message.includes('CSS file not found'), 'Error should mention CSS file not found');
    }
    assert.ok(threw, 'Should throw for missing CSS file');
  });

  it('should return default CSS path via getCSSPath', () => {
    const cssPath = getCSSPath(null);
    assert.equal(cssPath, DEFAULT_CSS_PATH, 'Should return default CSS path');
  });

  it('should throw for missing custom CSS via getCSSPath', () => {
    let threw = false;
    try {
      getCSSPath('/nonexistent/path/to/file.css');
    } catch (e) {
      threw = true;
      assert.ok(e.message.includes('CSS file not found'), 'Error should mention CSS file not found');
    }
    assert.ok(threw, 'Should throw for missing CSS file');
  });

  it('should load markdown with frontmatter', () => {
    const { content, frontmatter } = loadMarkdown(sampleMd);
    assert.ok(content.length > 0, 'Content should not be empty');
    assert.ok(typeof frontmatter === 'object', 'Frontmatter should be object');
    // Note: frontmatter parsing requires gray-matter
  });

  it('should throw for missing markdown file', () => {
    let threw = false;
    try {
      loadMarkdown('/nonexistent/file.md');
    } catch (e) {
      threw = true;
      assert.ok(e.message.includes('Markdown file not found'), 'Error should mention file not found');
    }
    assert.ok(threw, 'Should throw for missing markdown file');
  });

  it('should build config object', () => {
    const config = buildConfig({ noHighlight: false });
    assert.ok('stylesheet' in config, 'Config should have stylesheet');
    assert.ok(config.stylesheet.endsWith('default-style.css'), 'stylesheet should be path to default CSS');
    assert.ok('pdf_options' in config, 'Config should have pdf_options');
    assert.equal(config.pdf_options.format, 'A4', 'Default format should be A4');
  });

  it('should disable highlighting when noHighlight is true', () => {
    const config = buildConfig({ noHighlight: true });
    assert.equal(config.highlight_style, null, 'highlight_style should be null when disabled');
  });

  it('should set document title', () => {
    const config = buildConfig({ title: 'My Document' });
    assert.equal(config.document_title, 'My Document', 'Should set document_title');
  });
});

describe('output-handler', () => {
  const { resolveOutputPath, createTempPath, cleanupTempFiles } = require('../scripts/lib/output-handler.cjs');
  const os = require('os');
  const fixturesDir = path.join(__dirname, 'fixtures');

  it('should resolve output path from input (no output specified)', () => {
    const result = resolveOutputPath('/path/to/doc.md', null);
    assert.ok(result.endsWith('.pdf'), 'Result should end with .pdf');
    assert.ok(result.includes('doc.pdf'), 'Result should contain doc.pdf');
  });

  it('should use explicit output path', () => {
    const result = resolveOutputPath('/path/to/doc.md', '/output/file.pdf');
    assert.ok(result.endsWith('.pdf'), 'Output should end with .pdf');
  });

  it('should handle directory output', () => {
    // Use fixtures dir which exists
    const result = resolveOutputPath('/path/to/doc.md', fixturesDir + '/');
    assert.ok(result.includes('doc.pdf'), 'Should append filename to directory');
  });

  it('should add .pdf extension if missing', () => {
    const result = resolveOutputPath('/path/to/doc.md', '/output/file');
    assert.ok(result.endsWith('.pdf'), 'Should add .pdf extension');
  });

  it('should create temp path', () => {
    const tempPath = createTempPath('test');
    assert.ok(tempPath.includes(os.tmpdir()), 'Should be in temp directory');
    assert.ok(tempPath.endsWith('.pdf'), 'Should end with .pdf');
  });

  it('should run cleanupTempFiles without error', () => {
    // Just verify it doesn't throw
    cleanupTempFiles();
    assert.ok(true, 'cleanupTempFiles should not throw');
  });
});

describe('converter', () => {
  const { isAvailable } = require('../scripts/lib/converter.cjs');

  it('should report availability', () => {
    const available = isAvailable();
    assert.ok(typeof available === 'boolean', 'isAvailable should return boolean');
  });
});
