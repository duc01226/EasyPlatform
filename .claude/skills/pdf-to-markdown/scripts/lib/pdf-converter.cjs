#!/usr/bin/env node
/**
 * PDF to Markdown Converter - Core conversion logic
 * Uses pdf-parse for text extraction and adds basic markdown structure
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
  if (filePath.includes('\0')) return false;
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
  return message
    .replaceAll(/[A-Za-z]:[/\\][^\s'"<>]+/g, '[path]')
    .replaceAll(/\/[^\s'"<>]+/g, '[path]');
}

/**
 * Convert extracted text to basic Markdown
 * Adds structure based on text patterns
 * @param {string} text - Raw extracted text
 * @param {Object} info - PDF info (title, author, etc)
 * @returns {string} - Markdown formatted text
 */
function textToMarkdown(text, info) {
  const lines = text.split('\n');
  const result = [];

  // Add title from PDF metadata if available
  if (info.Title) {
    result.push(`# ${info.Title}\n`);
  }

  // Process lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines but preserve paragraph breaks
    if (!line) {
      if (result.length > 0 && result[result.length - 1] !== '') {
        result.push('');
      }
      continue;
    }

    // Detect potential headings (short lines, possibly all caps or ending with colon)
    if (line.length < 80 && line.length > 2) {
      // All caps line might be a heading
      if (line === line.toUpperCase() && /[A-Z]/.test(line)) {
        result.push(`\n## ${line}\n`);
        continue;
      }

      // Line ending with colon might be a section header
      if (line.endsWith(':') && !line.includes('.')) {
        result.push(`\n### ${line.slice(0, -1)}\n`);
        continue;
      }
    }

    // Detect list items
    if (/^[\u2022\u2023\u25E6\u2043\u2219•●○◦‣⁃]\s/.test(line)) {
      result.push(`- ${line.slice(2)}`);
      continue;
    }

    // Numbered list items
    if (/^\d+[.)]\s/.test(line)) {
      result.push(line);
      continue;
    }

    // Regular paragraph
    result.push(line);
  }

  return result.join('\n').trim();
}

/**
 * Convert PDF file to Markdown
 * @param {Object} options - Conversion options
 * @param {string} options.inputPath - Absolute path to PDF file
 * @param {string} options.outputPath - Absolute path for output MD
 * @returns {Promise<{success: boolean, input: string, output: string, wordCount?: number, pages?: number, warnings?: string[], error?: string}>}
 */
async function convertPdfToMarkdown(options) {
  const { inputPath, outputPath } = options;

  // Security: Validate paths
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

  // Validate file extension
  if (!inputPath.toLowerCase().endsWith('.pdf')) {
    return {
      success: false,
      input: inputPath,
      output: outputPath,
      error: 'Input file must be a .pdf file'
    };
  }

  // Load pdf-parse dependency
  let pdfParse;
  try {
    pdfParse = require('pdf-parse');
  } catch {
    return {
      success: false,
      input: inputPath,
      output: outputPath,
      error: 'Dependencies not installed. Run: npm install'
    };
  }

  const warnings = [];

  try {
    // Read PDF file
    const pdfBuffer = fs.readFileSync(inputPath);

    // Parse PDF
    const data = await pdfParse(pdfBuffer);

    // Convert to Markdown with basic structure
    const markdown = textToMarkdown(data.text, data.info || {});

    // Count words
    const wordCount = markdown
      .replaceAll(/[#*`[\]()_~]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 0).length;

    // Check for potential issues
    if (wordCount < 10 && data.numpages > 0) {
      warnings.push('PDF may be image-based or scanned (requires OCR)');
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write markdown file
    fs.writeFileSync(outputPath, markdown, 'utf8');

    return {
      success: true,
      input: inputPath,
      output: outputPath,
      wordCount,
      pages: data.numpages,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (err) {
    const errorMsg = err.message || 'Unknown error';

    if (errorMsg.includes('Invalid PDF') || errorMsg.includes('password') || errorMsg.includes('encrypted')) {
      return {
        success: false,
        input: inputPath,
        output: outputPath,
        error: 'Invalid or password-protected PDF'
      };
    }

    return {
      success: false,
      input: inputPath,
      output: outputPath,
      error: sanitizeErrorMessage(errorMsg)
    };
  }
}

/**
 * Generate output path from input path
 * @param {string} inputPath - Input PDF file path
 * @param {string} cwd - Current working directory
 * @returns {string} - Output MD path
 */
function generateOutputPath(inputPath, cwd) {
  const parsed = path.parse(inputPath);
  const outputName = `${parsed.name}.md`;
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
  convertPdfToMarkdown,
  generateOutputPath,
  resolvePath
};
