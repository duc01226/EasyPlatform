#!/usr/bin/env node
/**
 * PDF Generator - Core conversion logic using md-to-pdf
 * Wraps md-to-pdf with custom styling and error handling
 *
 * Security: Validates paths to prevent directory traversal attacks
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * Validate path is safe (prevents path traversal attacks)
 * @param {string} filePath - Path to validate
 * @returns {boolean} - True if path is safe
 */
function isPathSafe(filePath) {
  if (!filePath) return false;

  // Check for null bytes (path injection)
  if (filePath.includes('\0')) return false;

  // Resolved path should not contain .. after resolution
  const normalized = path.normalize(filePath);
  if (normalized.startsWith('..')) return false;

  return true;
}

/**
 * Sanitize error message to prevent path disclosure
 * @param {string} message - Error message
 * @returns {string} - Sanitized message
 */
function sanitizeErrorMessage(message) {
  if (!message) return 'Unknown error';
  // Replace full paths with generic placeholder
  return message
    .replaceAll(/[A-Za-z]:[/\\][^\s'"<>]+/g, '[path]')
    .replaceAll(/\/[^\s'"<>]+/g, '[path]');
}

/**
 * Convert markdown file to PDF
 * @param {Object} options - Conversion options
 * @param {string} options.inputPath - Absolute path to markdown file
 * @param {string} options.outputPath - Absolute path for output PDF
 * @param {string} [options.cssPath] - Optional custom CSS file path
 * @param {string} [options.defaultCssPath] - Path to default CSS
 * @returns {Promise<{success: boolean, input: string, output: string, pages?: number, error?: string}>}
 */
async function convertToPdf(options) {
  const { inputPath, outputPath, cssPath, defaultCssPath } = options;

  // Security: Validate paths to prevent traversal attacks
  if (!isPathSafe(inputPath) || !isPathSafe(outputPath)) {
    return {
      success: false,
      input: inputPath,
      output: outputPath,
      error: 'Invalid path provided'
    };
  }

  // Validate input file exists
  if (!fs.existsSync(inputPath)) {
    return {
      success: false,
      input: inputPath,
      output: outputPath,
      error: 'Input file not found'
    };
  }

  // Load md-to-pdf
  let mdToPdf;
  try {
    const mdToPdfModule = require('md-to-pdf');
    mdToPdf = mdToPdfModule.mdToPdf;
  } catch {
    return {
      success: false,
      input: inputPath,
      output: outputPath,
      error: 'md-to-pdf not installed. Run: npm install'
    };
  }

  // Determine CSS content
  let cssContent = '';
  if (cssPath && fs.existsSync(cssPath)) {
    cssContent = fs.readFileSync(cssPath, 'utf8');
  } else if (defaultCssPath && fs.existsSync(defaultCssPath)) {
    cssContent = fs.readFileSync(defaultCssPath, 'utf8');
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Convert using md-to-pdf
    await mdToPdf(
      { path: inputPath },
      {
        dest: outputPath,
        css: cssContent || undefined,
        pdf_options: {
          format: 'A4',
          margin: {
            top: '2cm',
            right: '2cm',
            bottom: '2cm',
            left: '2cm'
          },
          printBackground: true
        },
        launch_options: {
          // Cross-platform Puppeteer options
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      }
    );

    // Estimate page count from file size (~50KB per page average)
    const pages = fs.existsSync(outputPath)
      ? Math.max(1, Math.round(fs.statSync(outputPath).size / 50000))
      : 1;

    return {
      success: true,
      input: inputPath,
      output: outputPath,
      pages
    };
  } catch (err) {
    return {
      success: false,
      input: inputPath,
      output: outputPath,
      error: sanitizeErrorMessage(err.message)
    };
  }
}

/**
 * Generate output path from input path
 * @param {string} inputPath - Input markdown file path
 * @param {string} cwd - Current working directory
 * @returns {string} - Output PDF path
 */
function generateOutputPath(inputPath, cwd) {
  const parsed = path.parse(inputPath);
  const outputName = `${parsed.name}.pdf`;
  return path.join(parsed.dir || cwd, outputName);
}

/**
 * Resolve path relative to CWD
 * @param {string} inputPath - Potentially relative path
 * @param {string} cwd - Current working directory
 * @returns {string|null} - Absolute path
 */
function resolvePath(inputPath, cwd) {
  if (!inputPath) return null;
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(cwd, inputPath);
}

module.exports = {
  convertToPdf,
  generateOutputPath,
  resolvePath
};
