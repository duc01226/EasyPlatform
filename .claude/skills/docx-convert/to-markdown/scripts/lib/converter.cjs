/**
 * Core DOCX to Markdown converter
 * Uses mammoth (DOCX→HTML) + turndown (HTML→MD) two-stage pipeline
 */

const fs = require('fs');
const path = require('path');

const { resolveOutputPath, resolveImagesPath } = require('./output-handler.cjs');
const { htmlToMarkdown } = require('./html-to-markdown.cjs');

/**
 * Convert DOCX file to Markdown
 *
 * @param {object} options
 * @param {string} options.input - Input DOCX file path
 * @param {string|null} options.output - Output markdown path (optional)
 * @param {string|null} options.images - Images output directory (optional)
 * @returns {Promise<{success: boolean, input: string, output: string, stats?: object, error?: string}>}
 */
async function convert(options) {
  const { input, output, images } = options;

  // Validate input
  if (!input) {
    return { success: false, error: 'Input file path is required' };
  }

  const absoluteInput = path.resolve(input);
  if (!fs.existsSync(absoluteInput)) {
    return { success: false, error: `Input file not found: ${absoluteInput}` };
  }

  // Check file extension
  const ext = path.extname(absoluteInput).toLowerCase();
  if (ext !== '.docx') {
    return { success: false, error: `Invalid file type: ${ext}. Expected .docx` };
  }

  try {
    // Import mammoth dynamically
    let mammoth;
    try {
      mammoth = require('mammoth');
    } catch (err) {
      return {
        success: false,
        error: 'mammoth not installed. Run `npm install` in the skill directory.'
      };
    }

    // Track statistics
    const stats = { images: 0, tables: 0, headings: 0 };

    // Resolve paths
    const outputPath = resolveOutputPath(absoluteInput, output, '.md');
    const imagesDir = resolveImagesPath(images, outputPath);

    // Configure mammoth options
    const mammothOptions = {
      convertImage: mammoth.images.inline((element) => {
        return element.read('base64').then((imageBuffer) => {
          stats.images++;
          const contentType = element.contentType || 'image/png';

          if (imagesDir) {
            // Save to file
            const imageName = `image-${stats.images}.${contentType.split('/')[1] || 'png'}`;
            const imagePath = path.join(imagesDir, imageName);
            const buffer = Buffer.from(imageBuffer, 'base64');
            fs.writeFileSync(imagePath, buffer);

            // Return relative path
            const relativePath = path.relative(path.dirname(outputPath), imagePath);
            return { src: relativePath.replace(/\\/g, '/') };
          } else {
            // Inline base64
            return { src: `data:${contentType};base64,${imageBuffer}` };
          }
        });
      })
    };

    // Convert DOCX to HTML
    const result = await mammoth.convertToHtml({ path: absoluteInput }, mammothOptions);
    const html = result.value;

    // Count elements in HTML
    stats.tables = (html.match(/<table/g) || []).length;
    stats.headings = (html.match(/<h[1-6]/g) || []).length;

    // Convert HTML to Markdown
    const markdown = htmlToMarkdown(html);

    // Write output
    fs.writeFileSync(outputPath, markdown, 'utf8');

    // Verify output
    if (!fs.existsSync(outputPath)) {
      return { success: false, error: 'Markdown generation failed - no output file created' };
    }

    // Log warnings if any
    if (result.messages && result.messages.length > 0) {
      const warnings = result.messages.map(m => m.message);
      return {
        success: true,
        input: absoluteInput,
        output: outputPath,
        stats,
        warnings
      };
    }

    return {
      success: true,
      input: absoluteInput,
      output: outputPath,
      stats
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
 * Check if dependencies are available
 * @returns {boolean}
 */
function isAvailable() {
  try {
    require.resolve('mammoth');
    require.resolve('turndown');
    require.resolve('turndown-plugin-gfm');
    return true;
  } catch {
    return false;
  }
}

module.exports = { convert, isAvailable };
