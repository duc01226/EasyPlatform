#!/usr/bin/env node

/**
 * PDF to Markdown Converter CLI
 *
 * Usage:
 *   node convert.cjs --input ./doc.pdf [--output ./out.md] [--mode auto|native|ocr]
 *
 * Options:
 *   --input, -i       Input PDF file (required)
 *   --output, -o      Output markdown path (default: input.md)
 *   --mode, -m        Conversion mode: auto, native, ocr (default: auto)
 *   --help, -h        Show help message
 */

const path = require('path');

/**
 * Parse command line arguments
 * @param {string[]} argv
 * @returns {object}
 */
function parseArgs(argv) {
  const args = {
    input: null,
    output: null,
    mode: 'auto',
    help: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const nextArg = argv[i + 1];

    switch (arg) {
      case '--input':
      case '-i':
        args.input = nextArg;
        i++;
        break;

      case '--output':
      case '-o':
        args.output = nextArg;
        i++;
        break;

      case '--mode':
      case '-m':
        args.mode = nextArg;
        i++;
        break;

      case '--help':
      case '-h':
        args.help = true;
        break;

      default:
        // Positional argument = input file
        if (!arg.startsWith('-') && !args.input) {
          args.input = arg;
        }
    }
  }

  return args;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
pdf-to-markdown - Convert PDF files to Markdown

USAGE:
  node convert.cjs --input <file.pdf> [options]
  node convert.cjs <file.pdf> [options]

OPTIONS:
  --input, -i <path>     Input PDF file (required)
  --output, -o <path>    Output markdown path (default: same as input with .md)
  --mode, -m <mode>      Conversion mode: auto, native, ocr (default: auto)
  --help, -h             Show this help message

MODES:
  auto     Auto-detect if PDF has native text or needs OCR (default)
  native   Fast extraction for PDFs with selectable text
  ocr      Use OCR for scanned documents (requires tesseract.js)

EXAMPLES:
  # Basic conversion (auto-detect mode)
  node convert.cjs --input ./document.pdf

  # With custom output
  node convert.cjs -i ./report.pdf -o ./output/report.md

  # Force native mode (skip detection)
  node convert.cjs -i ./doc.pdf --mode native

OUTPUT:
  Returns JSON on success:
  {
    "success": true,
    "input": "/path/to/input.pdf",
    "output": "/path/to/output.md",
    "stats": { "pages": 5, "mode": "native" }
  }

EXIT CODES:
  0  Success
  1  Error
`);
}

/**
 * Print result as JSON
 * @param {object} result
 */
function printResult(result) {
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Validate arguments
 * @param {object} args
 * @returns {{valid: boolean, error?: string}}
 */
function validateArgs(args) {
  if (!args.input) {
    return {
      valid: false,
      error: 'Input file required. Use --input <path> or provide positional argument.'
    };
  }

  const validModes = ['auto', 'native', 'ocr'];
  if (!validModes.includes(args.mode)) {
    return {
      valid: false,
      error: `Invalid mode: ${args.mode}. Must be one of: ${validModes.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Check if dependencies are installed
 * @returns {{available: boolean, missing: string[]}}
 */
function checkDependencies() {
  const missing = [];

  try {
    require.resolve('@opendocsg/pdf2md');
  } catch {
    missing.push('@opendocsg/pdf2md');
  }

  return {
    available: missing.length === 0,
    missing
  };
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const validation = validateArgs(args);
  if (!validation.valid) {
    printResult({ success: false, error: validation.error });
    process.exit(1);
  }

  const deps = checkDependencies();
  if (!deps.available) {
    printResult({
      success: false,
      error: `Missing dependencies: ${deps.missing.join(', ')}. Run 'npm install' in skill directory.`,
      hint: `cd ${path.dirname(__dirname)} && npm install`
    });
    process.exit(1);
  }

  // Import converter (lazy load after dependency check)
  const { convert } = require('./lib/converter.cjs');

  try {
    const result = await convert({
      input: args.input,
      output: args.output,
      mode: args.mode
    });

    printResult(result);
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    printResult({
      success: false,
      error: error.message || 'Unexpected error during conversion'
    });
    process.exit(1);
  }
}

// Run main
main().catch(error => {
  console.error(JSON.stringify({
    success: false,
    error: `Unhandled error: ${error.message}`
  }));
  process.exit(1);
});
