/**
 * Core markdown-to-PDF converter
 * Wraps md-to-pdf with Chrome detection and cross-platform handling
 */

const fs = require('fs');
const path = require('path');

const { getChromeConfig } = require('./chrome-finder.cjs');
const { loadMarkdown, buildConfig } = require('./config-loader.cjs');
const { resolveOutputPath, cleanupTempFiles } = require('./output-handler.cjs');

/**
 * Convert markdown file to PDF
 *
 * @param {object} options - Conversion options
 * @param {string} options.input - Input markdown file path
 * @param {string|null} options.output - Output PDF path (optional)
 * @param {string|null} options.css - Custom CSS file path (optional)
 * @param {boolean} options.noHighlight - Disable syntax highlighting
 * @returns {Promise<{success: boolean, input: string, output: string, pages?: number, systemChrome?: boolean, error?: string}>}
 */
async function convert(options) {
  const { input, output, css, noHighlight = false } = options;

  // Validate input
  if (!input) {
    return { success: false, error: 'Input file path is required' };
  }

  const absoluteInput = path.resolve(input);
  if (!fs.existsSync(absoluteInput)) {
    return { success: false, error: `Input file not found: ${absoluteInput}` };
  }

  try {
    // Clean up old temp files (async cleanup)
    cleanupTempFiles();

    // Load markdown and extract frontmatter
    const { content, frontmatter } = loadMarkdown(absoluteInput);

    // Build configuration
    const config = buildConfig({
      cssPath: css,
      noHighlight,
      title: frontmatter.title || path.basename(absoluteInput, '.md')
    });

    // Get Chrome configuration
    const chromeConfig = getChromeConfig();

    // Import md-to-pdf dynamically (lazy load)
    const { mdToPdf } = require('md-to-pdf');

    // Resolve output path
    const outputPath = resolveOutputPath(absoluteInput, output);

    // Perform conversion
    await mdToPdf(
      { content },
      {
        ...config,
        dest: outputPath,
        launch_options: {
          executablePath: chromeConfig.executablePath,
          args: chromeConfig.args,
          headless: 'new' // Use new headless mode
        },
        basedir: path.dirname(absoluteInput) // Resolve relative paths from input dir
      }
    );

    // Verify output was created
    if (!fs.existsSync(outputPath)) {
      return { success: false, error: 'PDF generation failed - no output file created' };
    }

    // Get page count (approximate from file size)
    const stats = fs.statSync(outputPath);
    const estimatedPages = Math.max(1, Math.ceil(stats.size / 50000)); // Rough estimate

    return {
      success: true,
      input: absoluteInput,
      output: outputPath,
      pages: estimatedPages,
      systemChrome: chromeConfig.systemChrome
    };

  } catch (error) {
    // Handle specific error types
    if (error.message && error.message.includes('Could not find Chromium')) {
      return {
        success: false,
        error: 'Chromium not found. Run `npm install` in the skill directory or install Chrome/Chromium system-wide.'
      };
    }

    if (error.message && error.message.includes('ENOENT')) {
      return {
        success: false,
        error: `File not found: ${error.path || input}`
      };
    }

    return {
      success: false,
      error: error.message || 'Unknown conversion error',
      stack: process.env.DEBUG ? error.stack : undefined
    };
  }
}

/**
 * Check if md-to-pdf is available
 * @returns {boolean}
 */
function isAvailable() {
  try {
    require.resolve('md-to-pdf');
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  convert,
  isAvailable
};
