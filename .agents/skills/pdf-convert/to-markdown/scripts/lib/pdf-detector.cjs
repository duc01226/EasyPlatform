/**
 * PDF type detection - determines if PDF has native text or requires OCR
 */

const fs = require('fs');

/**
 * Detect if PDF has extractable native text
 * Uses simple heuristic: check if raw PDF contains text streams
 *
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<{hasText: boolean, confidence: string}>}
 */
async function detectPdfType(pdfPath) {
  try {
    // Read first 50KB of PDF to check for text content
    const buffer = Buffer.alloc(50000);
    const fd = fs.openSync(pdfPath, 'r');
    fs.readSync(fd, buffer, 0, 50000, 0);
    fs.closeSync(fd);

    const content = buffer.toString('latin1');

    // Look for text stream markers in PDF
    const hasTextStream = content.includes('/Type /Page') &&
      (content.includes('BT') || content.includes('/Font'));

    // Look for image-only indicators
    const hasImages = content.includes('/Image') || content.includes('/XObject');
    const hasTextContent = content.includes('Tj') || content.includes('TJ');

    if (hasTextContent) {
      return { hasText: true, confidence: 'high' };
    }

    if (hasTextStream && !hasImages) {
      return { hasText: true, confidence: 'medium' };
    }

    if (hasImages && !hasTextStream) {
      return { hasText: false, confidence: 'medium' };
    }

    // Fallback: try to extract text and check length
    return { hasText: true, confidence: 'low' };

  } catch (error) {
    // On error, assume native text
    return { hasText: true, confidence: 'low' };
  }
}

/**
 * Determine conversion mode based on detection and user preference
 * @param {string} userMode - User-specified mode: 'auto', 'native', 'ocr'
 * @param {{hasText: boolean, confidence: string}} detection - Detection result
 * @returns {'native'|'ocr'}
 */
function resolveMode(userMode, detection) {
  if (userMode === 'native') return 'native';
  if (userMode === 'ocr') return 'ocr';

  // Auto mode
  return detection.hasText ? 'native' : 'ocr';
}

module.exports = { detectPdfType, resolveMode };
