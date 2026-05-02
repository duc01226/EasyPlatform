/**
 * Tests for markdown-to-docx converter and related modules
 */

const fs = require('fs');
const path = require('path');

describe('config-loader', () => {
  const { loadMarkdown, loadTheme, buildConfig, getThemePath, DEFAULT_THEME_PATH } = require('../scripts/lib/config-loader.cjs');
  const fixturesDir = path.join(__dirname, 'fixtures');
  const sampleMd = path.join(fixturesDir, 'sample.md');

  it('should have correct DEFAULT_THEME_PATH', () => {
    assert.ok(DEFAULT_THEME_PATH.endsWith('default-theme.json'), 'DEFAULT_THEME_PATH should end with default-theme.json');
  });

  it('should load default theme', () => {
    const theme = loadTheme(null);
    assert.ok(typeof theme === 'object', 'Theme should be object');
    assert.ok('fontFamily' in theme, 'Theme should have fontFamily');
  });

  it('should throw for missing custom theme via loadTheme', () => {
    let threw = false;
    try {
      loadTheme('/nonexistent/path/to/file.json');
    } catch (e) {
      threw = true;
      assert.ok(e.message.includes('Theme file not found'), 'Error should mention theme file not found');
    }
    assert.ok(threw, 'Should throw for missing theme file');
  });

  it('should return default theme path via getThemePath', () => {
    const themePath = getThemePath(null);
    assert.equal(themePath, DEFAULT_THEME_PATH, 'Should return default theme path');
  });

  it('should throw for missing custom theme via getThemePath', () => {
    let threw = false;
    try {
      getThemePath('/nonexistent/path/to/file.json');
    } catch (e) {
      threw = true;
      assert.ok(e.message.includes('Theme file not found'), 'Error should mention theme file not found');
    }
    assert.ok(threw, 'Should throw for missing theme file');
  });

  it('should load markdown with frontmatter', () => {
    const { content, frontmatter } = loadMarkdown(sampleMd);
    assert.ok(content.length > 0, 'Content should not be empty');
    assert.ok(typeof frontmatter === 'object', 'Frontmatter should be object');
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

  it('should build config with math enabled by default', () => {
    const config = buildConfig({ theme: {}, title: 'Test' });
    assert.ok('math' in config, 'Config should have math');
    assert.equal(config.math.engine, 'katex', 'Math engine should be katex');
    assert.ok(config.math.libreOfficeCompat, 'LibreOffice compat should be enabled');
  });

  it('should set document title', () => {
    const config = buildConfig({ title: 'My Document' });
    assert.equal(config.title, 'My Document', 'Should set document title');
  });
});

describe('output-handler', () => {
  const { resolveOutputPath } = require('../scripts/lib/output-handler.cjs');
  const fixturesDir = path.join(__dirname, 'fixtures');

  it('should resolve output path from input (no output specified)', () => {
    const result = resolveOutputPath('/path/to/doc.md', null, '.docx');
    assert.ok(result.endsWith('.docx'), 'Result should end with .docx');
    assert.ok(result.includes('doc.docx'), 'Result should contain doc.docx');
  });

  it('should use explicit output path', () => {
    const result = resolveOutputPath('/path/to/doc.md', '/output/file.docx', '.docx');
    assert.ok(result.endsWith('.docx'), 'Output should end with .docx');
  });

  it('should handle directory output', () => {
    const result = resolveOutputPath('/path/to/doc.md', fixturesDir + '/', '.docx');
    assert.ok(result.includes('doc.docx'), 'Should append filename to directory');
  });

  it('should add .docx extension if missing', () => {
    const result = resolveOutputPath('/path/to/doc.md', '/output/file', '.docx');
    assert.ok(result.endsWith('.docx'), 'Should add .docx extension');
  });
});

describe('converter', () => {
  const { isAvailable } = require('../scripts/lib/converter.cjs');

  it('should report availability', () => {
    const available = isAvailable();
    assert.ok(typeof available === 'boolean', 'isAvailable should return boolean');
  });
});
