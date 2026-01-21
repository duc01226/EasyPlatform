#!/usr/bin/env node
/**
 * DOCX Generator - Core conversion logic using markdown-docx
 * Converts markdown to Microsoft Word (.docx) format
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
  return message
    .replaceAll(/[A-Za-z]:[/\\][^\s'"<>]+/g, '[path]')
    .replaceAll(/\/[^\s'"<>]+/g, '[path]');
}

/**
 * Get MIME type from file extension
 * @param {string} ext - File extension
 * @returns {string} - MIME type
 */
function getMimeType(ext) {
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };
  return mimeTypes[ext.toLowerCase()] || 'image/png';
}

/**
 * Convert image to base64 data URI
 * @param {Buffer} buffer - Image buffer
 * @param {string} ext - File extension
 * @returns {string} - Data URI
 */
function toDataUri(buffer, ext) {
  const mimeType = getMimeType(ext);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Fetch image from URL with timeout
 * @param {string} url - Image URL
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Buffer|null>}
 */
async function fetchImage(url, timeoutMs = 10000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'markdown-to-docx/1.0' }
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Preprocess markdown to convert images to base64 data URIs
 * @param {string} markdown - Input markdown content
 * @param {string} baseDir - Base directory for relative paths
 * @returns {Promise<string>} - Processed markdown
 */
async function preprocessImages(markdown, baseDir) {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const matches = [...markdown.matchAll(imageRegex)];

  let result = markdown;

  for (const match of matches) {
    const [fullMatch, alt, imagePath] = match;
    let buffer = null;
    let ext = '.png';

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      buffer = await fetchImage(imagePath);
      ext = path.extname(new URL(imagePath).pathname).toLowerCase() || '.png';
    } else {
      const resolvedPath = path.isAbsolute(imagePath)
        ? imagePath
        : path.resolve(baseDir, imagePath);

      if (fs.existsSync(resolvedPath)) {
        buffer = fs.readFileSync(resolvedPath);
        ext = path.extname(resolvedPath).toLowerCase();
      }
    }

    if (buffer) {
      const dataUri = toDataUri(buffer, ext);
      result = result.replace(fullMatch, `![${alt}](${dataUri})`);
    }
  }

  return result;
}

/**
 * Convert markdown file to DOCX
 * @param {Object} options - Conversion options
 * @param {string} options.inputPath - Absolute path to markdown file
 * @param {string} options.outputPath - Absolute path for output DOCX
 * @returns {Promise<{success: boolean, input: string, output: string, wordCount?: number, error?: string}>}
 */
async function convertToDocx(options) {
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

  // Load dependencies (ESM module via dynamic import)
  let markdownDocx, Packer;
  try {
    const module = await import('markdown-docx');
    markdownDocx = module.default;
    Packer = module.Packer;
  } catch {
    return {
      success: false,
      input: inputPath,
      output: outputPath,
      error: 'Dependencies not installed. Run: npm install'
    };
  }

  // Read markdown content
  let markdownContent = fs.readFileSync(inputPath, 'utf8');

  // Count words (for metadata)
  const wordCount = markdownContent
    .replaceAll(/[#*`[\]()_~]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0).length;

  // Preprocess images (convert to base64)
  const inputDir = path.dirname(inputPath);
  markdownContent = await preprocessImages(markdownContent, inputDir);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Convert markdown to DOCX
    const doc = await markdownDocx(markdownContent);
    const buffer = await Packer.toBuffer(doc);

    // Write to file
    fs.writeFileSync(outputPath, buffer);

    return {
      success: true,
      input: inputPath,
      output: outputPath,
      wordCount
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
 * @returns {string} - Output DOCX path
 */
function generateOutputPath(inputPath, cwd) {
  const parsed = path.parse(inputPath);
  const outputName = `${parsed.name}.docx`;
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
  convertToDocx,
  generateOutputPath,
  resolvePath
};
