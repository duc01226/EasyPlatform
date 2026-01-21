#!/usr/bin/env node
/**
 * DOCX to Markdown Converter - Core conversion logic
 * Uses mammoth (DOCX→HTML) + turndown (HTML→Markdown) pipeline
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
 * Get file extension for MIME type
 * @param {string} contentType - MIME content type
 * @returns {string} - File extension
 */
function getExtensionFromMime(contentType) {
  const mimeMap = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp'
  };
  return mimeMap[contentType] || 'png';
}

/**
 * Convert DOCX file to Markdown
 * @param {Object} options - Conversion options
 * @param {string} options.inputPath - Absolute path to DOCX file
 * @param {string} options.outputPath - Absolute path for output MD
 * @param {string} [options.imagesDir] - Directory to extract images
 * @returns {Promise<{success: boolean, input: string, output: string, wordCount?: number, images?: number, warnings?: string[], error?: string}>}
 */
async function convertDocxToMarkdown(options) {
  const { inputPath, outputPath, imagesDir } = options;

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
  if (!inputPath.toLowerCase().endsWith('.docx')) {
    return {
      success: false,
      input: inputPath,
      output: outputPath,
      error: 'Input file must be a .docx file'
    };
  }

  // Load dependencies
  let mammoth, TurndownService, gfm;
  try {
    mammoth = require('mammoth');
    TurndownService = require('turndown');
    const gfmPlugin = require('@truto/turndown-plugin-gfm');
    gfm = gfmPlugin.gfm;
  } catch {
    return {
      success: false,
      input: inputPath,
      output: outputPath,
      error: 'Dependencies not installed. Run: npm install'
    };
  }

  const warnings = [];
  let imageCount = 0;

  // Setup image handling
  let imageConverter;
  if (imagesDir) {
    // Validate images directory path
    if (!isPathSafe(imagesDir)) {
      return {
        success: false,
        input: inputPath,
        output: outputPath,
        error: 'Invalid images directory path'
      };
    }

    // Ensure images directory exists
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    imageConverter = mammoth.images.imgElement(async (image) => {
      const ext = getExtensionFromMime(image.contentType);
      const filename = `image-${++imageCount}.${ext}`;
      const imagePath = path.join(imagesDir, filename);

      try {
        const buffer = await image.read('buffer');
        fs.writeFileSync(imagePath, buffer);
        // Return relative path from output MD to image
        const relPath = path.relative(path.dirname(outputPath), imagePath);
        return { src: relPath.replaceAll('\\', '/') };
      } catch {
        warnings.push(`Failed to extract image ${imageCount}`);
        return { src: '' };
      }
    });
  } else {
    // Inline as base64
    imageConverter = mammoth.images.imgElement(async (image) => {
      try {
        const buffer = await image.read('buffer');
        const base64 = buffer.toString('base64');
        imageCount++;
        return { src: `data:${image.contentType};base64,${base64}` };
      } catch {
        warnings.push(`Failed to embed image`);
        return { src: '' };
      }
    });
  }

  try {
    // Step 1: DOCX → HTML using mammoth
    const mammothResult = await mammoth.convertToHtml(
      { path: inputPath },
      {
        convertImage: imageConverter,
        styleMap: [
          "p[style-name='Code'] => pre:separator('\\n')",
          "p[style-name='Code Block'] => pre:separator('\\n')",
          "r[style-name='Code'] => code"
        ]
      }
    );

    // Collect warnings from mammoth
    for (const msg of mammothResult.messages) {
      if (msg.type === 'warning') {
        warnings.push(msg.message);
      }
    }

    // Step 2: HTML → Markdown using turndown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      fence: '```',
      bulletListMarker: '-',
      emDelimiter: '*'
    });

    // Add GFM support (tables, strikethrough, task lists)
    turndownService.use(gfm);

    const markdown = turndownService.turndown(mammothResult.value);

    // Count words (approximate)
    const wordCount = markdown
      .replaceAll(/[#*`[\]()_~]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 0).length;

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
      images: imageCount,
      warnings: warnings.length > 0 ? warnings : undefined
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
 * @param {string} inputPath - Input DOCX file path
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
  convertDocxToMarkdown,
  generateOutputPath,
  resolvePath
};
