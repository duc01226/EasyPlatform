/**
 * Core PDF to Markdown converter
 * Supports native text PDFs and scanned documents (OCR)
 */

const fs = require('fs');
const path = require('path');

const { resolveOutputPath } = require('./output-handler.cjs');
const { detectPdfType, resolveMode } = require('./pdf-detector.cjs');

/**
 * Convert PDF file to Markdown
 *
 * @param {object} options
 * @param {string} options.input - Input PDF file path
 * @param {string|null} options.output - Output markdown path (optional)
 * @param {string} options.mode - Conversion mode: 'auto', 'native', 'ocr'
 * @returns {Promise<{success: boolean, input: string, output: string, stats?: object, error?: string}>}
 */
async function convert(options) {
  const { input, output, mode = 'auto' } = options;

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
  if (ext !== '.pdf') {
    return { success: false, error: `Invalid file type: ${ext}. Expected .pdf` };
  }

  try {
    // Detect PDF type
    const detection = await detectPdfType(absoluteInput);
    const effectiveMode = resolveMode(mode, detection);

    // Track statistics
    const stats = { pages: 0, mode: effectiveMode };

    // Resolve output path
    const outputPath = resolveOutputPath(absoluteInput, output, '.md');

    let markdown;

    if (effectiveMode === 'native') {
      markdown = await convertNative(absoluteInput, stats);
    } else {
      // OCR mode
      const ocrResult = await convertOcr(absoluteInput, stats);
      if (!ocrResult.success) {
        return ocrResult;
      }
      markdown = ocrResult.markdown;
    }

    // Write output
    fs.writeFileSync(outputPath, markdown, 'utf8');

    // Verify output
    if (!fs.existsSync(outputPath)) {
      return { success: false, error: 'Markdown generation failed - no output file created' };
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
 * Convert native text PDF to Markdown
 * @param {string} pdfPath - Path to PDF file
 * @param {object} stats - Statistics object to update
 * @returns {Promise<string>} Markdown content
 */
async function convertNative(pdfPath, stats) {
  let pdf2md;
  try {
    pdf2md = require('@opendocsg/pdf2md');
  } catch (err) {
    throw new Error('@opendocsg/pdf2md not installed. Run `npm install` in the skill directory.');
  }

  const pdfBuffer = fs.readFileSync(pdfPath);
  const result = await pdf2md(pdfBuffer);

  // Extract page count from result if available
  if (result && typeof result === 'string') {
    // Estimate pages from content length (rough heuristic)
    stats.pages = Math.max(1, Math.ceil(result.length / 3000));
    return result;
  }

  throw new Error('Failed to extract text from PDF');
}

/**
 * Convert scanned PDF using OCR
 * @param {string} pdfPath - Path to PDF file
 * @param {object} stats - Statistics object to update
 * @returns {Promise<{success: boolean, markdown?: string, error?: string}>}
 */
async function convertOcr(pdfPath, stats) {
  // Check if OCR dependencies are available
  let tesseract;
  try {
    tesseract = require('tesseract.js');
  } catch (err) {
    return {
      success: false,
      error: 'OCR mode requires tesseract.js. Install with: npm install tesseract.js pdfjs-dist canvas',
      hint: 'For native text PDFs, use --mode native'
    };
  }

  // OCR implementation would go here
  // For now, return informative error
  return {
    success: false,
    error: 'OCR conversion not yet implemented. Use --mode native for text-based PDFs.',
    hint: 'Native mode works for most PDFs with selectable text'
  };
}

/**
 * Check if dependencies are available
 * @returns {{native: boolean, ocr: boolean}}
 */
function isAvailable() {
  const result = { native: false, ocr: false };

  try {
    require.resolve('@opendocsg/pdf2md');
    result.native = true;
  } catch { }

  try {
    require.resolve('tesseract.js');
    require.resolve('pdfjs-dist');
    result.ocr = true;
  } catch { }

  return result;
}

module.exports = { convert, isAvailable };
