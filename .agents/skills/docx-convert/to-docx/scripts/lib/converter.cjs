/**
 * Core markdown-to-DOCX converter
 * Wraps markdown-docx with configuration and error handling
 */

const fs = require('fs');
const path = require('path');

const { loadMarkdown, loadTheme, buildConfig } = require('./config-loader.cjs');
const { resolveOutputPath } = require('./output-handler.cjs');

/**
 * Convert markdown file to DOCX
 *
 * @param {object} options
 * @param {string} options.input - Input markdown file path
 * @param {string|null} options.output - Output DOCX path (optional)
 * @param {string|null} options.theme - Custom theme JSON path (optional)
 * @param {string|null} options.title - Document title (optional)
 * @returns {Promise<{success: boolean, input: string, output: string, error?: string}>}
 */
async function convert(options) {
  const { input, output, theme, title } = options;

  // Validate input
  if (!input) {
    return { success: false, error: 'Input file path is required' };
  }

  const absoluteInput = path.resolve(input);
  if (!fs.existsSync(absoluteInput)) {
    return { success: false, error: `Input file not found: ${absoluteInput}` };
  }

  try {
    // Load markdown and extract frontmatter
    const { content, frontmatter } = loadMarkdown(absoluteInput);

    // Load theme configuration
    const themeConfig = loadTheme(theme);

    // Build conversion config
    const config = buildConfig({
      theme: themeConfig,
      title: title || frontmatter.title || path.basename(absoluteInput, '.md')
    });

    // Import markdown-docx dynamically
    let markdownDocx, Packer;
    try {
      const mdDocx = require('markdown-docx');
      markdownDocx = mdDocx.default || mdDocx;
      Packer = mdDocx.Packer;
    } catch (err) {
      return {
        success: false,
        error: 'markdown-docx not installed. Run `npm install` in the skill directory.'
      };
    }

    // Perform conversion
    const doc = await markdownDocx(content, config);
    const buffer = await Packer.toBuffer(doc);

    // Resolve output path
    const outputPath = resolveOutputPath(absoluteInput, output, '.docx');

    // Write output
    fs.writeFileSync(outputPath, buffer);

    // Verify output
    if (!fs.existsSync(outputPath)) {
      return { success: false, error: 'DOCX generation failed - no output file created' };
    }

    return {
      success: true,
      input: absoluteInput,
      output: outputPath
    };

  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unknown conversion error',
      stack: process.env.DEBUG ? error.stack : undefined
    };
  }
}

/**
 * Check if markdown-docx is available
 * @returns {boolean}
 */
function isAvailable() {
  try {
    require.resolve('markdown-docx');
    return true;
  } catch {
    return false;
  }
}

module.exports = { convert, isAvailable };
