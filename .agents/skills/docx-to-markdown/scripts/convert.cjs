#!/usr/bin/env node

/**
 * DOCX to Markdown Converter CLI
 *
 * Usage:
 *   node convert.cjs --input ./doc.docx [--output ./out.md] [--images ./images/]
 *
 * Options:
 *   --input, -i       Input DOCX file (required)
 *   --output, -o      Output markdown path (default: input.md)
 *   --images          Directory for extracted images (default: inline base64)
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
    images: null,
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

      case '--images':
        args.images = nextArg;
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
docx-to-markdown - Convert Microsoft Word files to Markdown

USAGE:
  node convert.cjs --input <file.docx> [options]
  node convert.cjs <file.docx> [options]

OPTIONS:
  --input, -i <path>     Input DOCX file (required)
  --output, -o <path>    Output markdown path (default: same as input with .md)
  --images <path>        Directory for extracted images (default: inline base64)
  --help, -h             Show this help message

FEATURES:
  - GFM tables, code blocks, links
  - Image extraction (inline or to folder)
  - Heading levels preserved
  - Lists (ordered and unordered)

EXAMPLES:
  # Basic conversion
  node convert.cjs --input ./document.docx

  # With custom output
  node convert.cjs -i ./report.docx -o ./output/report.md

  # Extract images to folder
  node convert.cjs -i ./doc.docx --images ./images/

OUTPUT:
  Returns JSON on success:
  {
    "success": true,
    "input": "/path/to/input.docx",
    "output": "/path/to/output.md",
    "stats": { "images": 3, "tables": 2, "headings": 5 }
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
  return { valid: true };
}

/**
 * Check if dependencies are installed
 * @returns {{available: boolean, missing: string[]}}
 */
function checkDependencies() {
  const missing = [];

  try {
    require.resolve('mammoth');
  } catch {
    missing.push('mammoth');
  }

  try {
    require.resolve('turndown');
  } catch {
    missing.push('turndown');
  }

  try {
    require.resolve('turndown-plugin-gfm');
  } catch {
    missing.push('turndown-plugin-gfm');
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
      images: args.images
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
