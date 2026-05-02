/**
 * Output path resolution for pdf-to-markdown
 */

const fs = require('fs');
const path = require('path');

/**
 * Resolve output path from input and user-specified output
 * @param {string} inputPath - Absolute path to input file
 * @param {string|null} outputPath - User-specified output path (optional)
 * @param {string} extension - Output file extension (default: '.md')
 * @returns {string} Resolved absolute output path
 */
function resolveOutputPath(inputPath, outputPath, extension = '.md') {
  if (!outputPath) {
    const dir = path.dirname(inputPath);
    const base = path.basename(inputPath, path.extname(inputPath));
    return path.join(dir, base + extension);
  }

  const absoluteOutput = path.resolve(outputPath);

  // Check if output is a directory
  if (fs.existsSync(absoluteOutput) && fs.statSync(absoluteOutput).isDirectory()) {
    const base = path.basename(inputPath, path.extname(inputPath));
    return path.join(absoluteOutput, base + extension);
  }

  // Add extension if missing
  if (!absoluteOutput.endsWith(extension)) {
    return absoluteOutput + extension;
  }

  return absoluteOutput;
}

module.exports = { resolveOutputPath };
