#!/usr/bin/env node
/**
 * Markdown to PDF Converter CLI
 *
 * Usage:
 *   node convert.cjs --file <input.md> [--output <output.pdf>] [--style <custom.css>]
 *
 * Options:
 *   --file <path>   Input markdown file (required)
 *   --output <path> Output PDF path (default: input name + .pdf)
 *   --style <path>  Custom CSS file path
 *   --help          Show usage information
 */

const path = require('node:path');
const { convertToPdf, generateOutputPath, resolvePath } = require('./lib/pdf-generator.cjs');

/**
 * Parse command line arguments
 * @param {string[]} argv - Process arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs(argv) {
  const args = {
    file: null,
    output: null,
    style: null,
    help: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--file' && argv[i + 1]) {
      args.file = argv[++i];
    } else if (arg === '--output' && argv[i + 1]) {
      args.output = argv[++i];
    } else if (arg === '--style' && argv[i + 1]) {
      args.style = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (!arg.startsWith('--') && !args.file) {
      // Positional argument as file
      args.file = arg;
    }
  }

  return args;
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
Markdown to PDF Converter

Usage:
  node convert.cjs --file <input.md> [options]

Options:
  --file <path>    Input markdown file (required)
  --output <path>  Output PDF path (default: same name as input)
  --style <path>   Custom CSS file for styling
  --help, -h       Show this help message

Examples:
  node convert.cjs --file ./README.md
  node convert.cjs --file ./doc.md --output ./output/doc.pdf
  node convert.cjs --file ./report.md --style ./custom.css
`);
}

/**
 * Output result as JSON
 * @param {Object} result - Conversion result
 */
function outputJson(result) {
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Main CLI function
 */
async function main() {
  const args = parseArgs(process.argv);
  const cwd = process.cwd();
  const skillDir = path.join(__dirname, '..');
  const defaultCssPath = path.join(skillDir, 'assets', 'default-style.css');

  // Handle --help
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  // Validate required --file argument
  if (!args.file) {
    console.error('Error: --file argument is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  // Resolve paths
  const inputPath = resolvePath(args.file, cwd);
  const outputPath = args.output
    ? resolvePath(args.output, cwd)
    : generateOutputPath(inputPath, cwd);
  const cssPath = args.style ? resolvePath(args.style, cwd) : null;

  // Convert to PDF
  const result = await convertToPdf({
    inputPath,
    outputPath,
    cssPath,
    defaultCssPath
  });

  // Output JSON result
  outputJson(result);

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

// Run
main().catch(err => {
  outputJson({
    success: false,
    error: err.message || 'Unknown error'
  });
  process.exit(1);
});
