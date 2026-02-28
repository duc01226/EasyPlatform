/**
 * Output path resolution and file handling
 * Handles various output path scenarios
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Resolve output path based on input and user preference
 *
 * Logic:
 *   Input: ./docs/readme.md, Output: null      → ./docs/readme.pdf
 *   Input: ./docs/readme.md, Output: ./out/    → ./out/readme.pdf
 *   Input: ./docs/readme.md, Output: ./my.pdf  → ./my.pdf
 *
 * @param {string} inputPath - Input markdown file path
 * @param {string|null} outputPath - User-specified output path (optional)
 * @returns {string} Resolved absolute output path
 */
function resolveOutputPath(inputPath, outputPath) {
  const absoluteInput = path.resolve(inputPath);
  const inputDir = path.dirname(absoluteInput);
  const inputBasename = path.basename(absoluteInput, path.extname(absoluteInput));

  // Default: same directory as input, .pdf extension
  if (!outputPath) {
    return path.join(inputDir, `${inputBasename}.pdf`);
  }

  const absoluteOutput = path.resolve(outputPath);

  // Check if output is a directory (existing or ends with separator)
  const isDirectory = outputPath.endsWith(path.sep) ||
                      outputPath.endsWith('/') ||
                      (fs.existsSync(absoluteOutput) && fs.statSync(absoluteOutput).isDirectory());

  if (isDirectory) {
    // Ensure directory exists
    fs.mkdirSync(absoluteOutput, { recursive: true });
    return path.join(absoluteOutput, `${inputBasename}.pdf`);
  }

  // Output is a file path - ensure parent directory exists
  const outputDir = path.dirname(absoluteOutput);
  fs.mkdirSync(outputDir, { recursive: true });

  // Ensure .pdf extension
  if (!absoluteOutput.toLowerCase().endsWith('.pdf')) {
    return `${absoluteOutput}.pdf`;
  }

  return absoluteOutput;
}

/**
 * Create a temporary file path for intermediate operations
 * @param {string} prefix - Filename prefix
 * @returns {string} Temporary file path
 */
function createTempPath(prefix = 'md-to-pdf') {
  const tempDir = path.join(os.tmpdir(), 'markdown-to-pdf');
  fs.mkdirSync(tempDir, { recursive: true });
  return path.join(tempDir, `${prefix}-${Date.now()}.pdf`);
}

/**
 * Clean up old temporary files (older than 1 hour)
 * @returns {void}
 */
function cleanupTempFiles() {
  const tempDir = path.join(os.tmpdir(), 'markdown-to-pdf');
  if (!fs.existsSync(tempDir)) return;

  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  try {
    const files = fs.readdirSync(tempDir);

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < oneHourAgo) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // Ignore individual file errors
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

module.exports = {
  resolveOutputPath,
  createTempPath,
  cleanupTempFiles
};
