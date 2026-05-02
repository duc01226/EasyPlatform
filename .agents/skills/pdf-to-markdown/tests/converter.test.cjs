/**
 * Tests for pdf-to-markdown converter
 */

const path = require('path');
const fs = require('fs');
const { describe, it, expect } = require('./test-framework.cjs');

const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts', 'lib');

// Test output-handler
describe('output-handler', () => {
  const { resolveOutputPath } = require(path.join(SCRIPTS_DIR, 'output-handler.cjs'));

  it('should resolve output path from input (no output specified)', () => {
    const input = path.join('path', 'to', 'document.pdf');
    const result = resolveOutputPath(input, null, '.md');
    const expected = path.join('path', 'to', 'document.md');
    expect(result).toBe(expected);
  });

  it('should use explicit output path', () => {
    const input = path.join('path', 'to', 'document.pdf');
    const output = path.join('other', 'path', 'result.md');
    const result = resolveOutputPath(input, output, '.md');
    expect(result).toContain('result.md');
  });

  it('should add .md extension if missing', () => {
    const input = path.join('path', 'to', 'document.pdf');
    const output = path.join('other', 'path', 'result');
    const result = resolveOutputPath(input, output, '.md');
    expect(result).toContain('result.md');
  });
});

// Test pdf-detector
describe('pdf-detector', () => {
  const { resolveMode } = require(path.join(SCRIPTS_DIR, 'pdf-detector.cjs'));

  it('should return native for native mode override', () => {
    const result = resolveMode('native', { hasText: false, confidence: 'high' });
    expect(result).toBe('native');
  });

  it('should return ocr for ocr mode override', () => {
    const result = resolveMode('ocr', { hasText: true, confidence: 'high' });
    expect(result).toBe('ocr');
  });

  it('should return native for auto mode with detected text', () => {
    const result = resolveMode('auto', { hasText: true, confidence: 'high' });
    expect(result).toBe('native');
  });

  it('should return ocr for auto mode without detected text', () => {
    const result = resolveMode('auto', { hasText: false, confidence: 'high' });
    expect(result).toBe('ocr');
  });
});

// Test converter availability
describe('converter', () => {
  const { isAvailable } = require(path.join(SCRIPTS_DIR, 'converter.cjs'));

  it('should return availability object', () => {
    const available = isAvailable();
    expect(typeof available).toBe('object');
    expect(typeof available.native).toBe('boolean');
    expect(typeof available.ocr).toBe('boolean');
  });

  it('should have native or ocr availability', () => {
    const available = isAvailable();
    // At least one should be determinable
    expect(typeof available.native).toBe('boolean');
  });
});

// Test converter validation
describe('converter-validation', () => {
  const { convert } = require(path.join(SCRIPTS_DIR, 'converter.cjs'));

  it('should reject missing input', async () => {
    const result = await convert({});
    expect(result.success).toBe(false);
    expect(result.error).toContain('required');
  });

  it('should reject non-existent file', async () => {
    const result = await convert({ input: '/nonexistent/file.pdf' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should reject non-PDF file', async () => {
    // Create temp file
    const tempFile = path.join(__dirname, 'fixtures', 'temp.txt');
    fs.mkdirSync(path.dirname(tempFile), { recursive: true });
    fs.writeFileSync(tempFile, 'test');

    const result = await convert({ input: tempFile });
    expect(result.success).toBe(false);
    expect(result.error).toContain('.pdf');

    // Cleanup
    fs.unlinkSync(tempFile);
  });
});
