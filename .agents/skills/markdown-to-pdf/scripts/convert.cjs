#!/usr/bin/env node

/**
 * Markdown to PDF Converter CLI
 * Converts markdown files to PDF with syntax highlighting and custom CSS
 *
 * Usage:
 *   node convert.cjs --input ./doc.md [--output ./out.pdf] [--css ./style.css]
 *
 * Options:
 *   --input, -i       Input markdown file (required)
 *   --output, -o      Output PDF path (default: input.pdf)
 *   --css, -c         Custom CSS file path
 *   --no-highlight    Disable syntax highlighting
 *   --help, -h        Show help message
 */

const path = require('path');

/**
 * Parse command line arguments
 * @param {string[]} argv - Process arguments
 * @returns {{input: string|null, output: string|null, css: string|null, noHighlight: boolean, help: boolean}}
 */
function parseArgs(argv) {
  const args = {
    input: null,
    output: null,
    css: null,
    noHighlight: false,
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

      case '--css':
      case '-c':
        args.css = nextArg;
        i++;
        break;

      case '--no-highlight':
        args.noHighlight = true;
        break;

      case '--help':
      case '-h':
        args.help = true;
        break;

      default:
        // Handle positional argument (assume input file)
        if (!arg.startsWith('-') && !args.input) {
          args.input = arg;
        }
    }
  }

  return args;
}

/**
 * Print help message
 * @returns {void}
 */
function printHelp() {
  console.log(`
markdown-to-pdf - Convert markdown files to PDF

USAGE:
  node convert.cjs --input <file.md> [options]
  node convert.cjs <file.md> [options]

OPTIONS:
  --input, -i <path>     Input markdown file (required)
  --output, -o <path>    Output PDF path (default: same as input with .pdf)
  --css, -c <path>       Custom CSS stylesheet
  --no-highlight         Disable code syntax highlighting
  --help, -h             Show this help message

EXAMPLES:
  # Basic conversion
  node convert.cjs --input ./README.md

  # With custom output path
  node convert.cjs -i ./docs/guide.md -o ./output/guide.pdf

  # With custom CSS
  node convert.cjs -i ./report.md -c ./custom-style.css

OUTPUT:
  Returns JSON on success:
  {
    "success": true,
    "input": "/path/to/input.md",
    "output": "/path/to/output.pdf",
    "pages": 5
  }

  Returns JSON on error:
  {
    "success": false,
    "error": "Error description"
  }

EXIT CODES:
  0  Success
  1  Error (missing input, conversion failed, etc.)
`);
}

/**
 * Print result as JSON
 * @param {object} result - Result object
 * @returns {void}
 */
function printResult(result) {
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Validate arguments
 * @param {{input: string|null}} args - Parsed arguments
 * @returns {{valid: boolean, error?: string}}
 */
function validateArgs(args) {
  if (!args.input) {
    return {
      valid: false,
      error: 'Input file is required. Use --input <path> or provide a positional argument.'
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
    require.resolve('md-to-pdf');
  } catch {
    missing.push('md-to-pdf');
  }

  try {
    require.resolve('gray-matter');
  } catch {
    missing.push('gray-matter');
  }

  return {
    available: missing.length === 0,
    missing
  };
}

/**
 * Main entry point
 * @returns {Promise<void>}
 */
async function main() {
  const args = parseArgs(process.argv);

  // Handle help flag
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Validate arguments
  const validation = validateArgs(args);
  if (!validation.valid) {
    printResult({
      success: false,
      error: validation.error
    });
    process.exit(1);
  }

  // Check dependencies
  const deps = checkDependencies();
  if (!deps.available) {
    printResult({
      success: false,
      error: `Missing dependencies: ${deps.missing.join(', ')}. Run 'npm install' in the skill directory.`,
      hint: `cd ${path.dirname(__dirname)} && npm install`
    });
    process.exit(1);
  }

  // Import converter (lazy load after dependency check)
  const { convert } = require('./lib/converter.cjs');

  // Perform conversion
  try {
    const result = await convert({
      input: args.input,
      output: args.output,
      css: args.css,
      noHighlight: args.noHighlight
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

// Run main function
main().catch(error => {
  console.error(JSON.stringify({
    success: false,
    error: `Unhandled error: ${error.message}`
  }));
  process.exit(1);
});
