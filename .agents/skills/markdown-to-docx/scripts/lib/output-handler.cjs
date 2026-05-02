/**
 * Output path resolution
 * Ported from markdown-to-pdf with DOCX extension support
 */

const fs = require('fs');
const path = require('path');

/**
 * Resolve output path based on input and user preference
 *
 * @param {string} inputPath - Input markdown file
 * @param {string|null} outputPath - User-specified output (optional)
 * @param {string} extension - Output extension (default: .docx)
 * @returns {string} Resolved absolute output path
 */
function resolveOutputPath(inputPath, outputPath, extension = '.docx') {
  const absoluteInput = path.resolve(inputPath);
  const inputDir = path.dirname(absoluteInput);
  const inputBasename = path.basename(absoluteInput, path.extname(absoluteInput));

  // Default: same directory, new extension
  if (!outputPath) {
    return path.join(inputDir, `${inputBasename}${extension}`);
  }

  const absoluteOutput = path.resolve(outputPath);

  // Check if output is directory
  const isDirectory = outputPath.endsWith(path.sep) ||
                      outputPath.endsWith('/') ||
                      (fs.existsSync(absoluteOutput) && fs.statSync(absoluteOutput).isDirectory());

  if (isDirectory) {
    fs.mkdirSync(absoluteOutput, { recursive: true });
    return path.join(absoluteOutput, `${inputBasename}${extension}`);
  }

  // Ensure parent directory exists
  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });

  // Ensure correct extension
  if (!absoluteOutput.toLowerCase().endsWith(extension)) {
    return `${absoluteOutput}${extension}`;
  }

  return absoluteOutput;
}

module.exports = { resolveOutputPath };
