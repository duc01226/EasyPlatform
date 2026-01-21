#!/usr/bin/env node
/**
 * DOCX to Markdown Converter CLI
 *
 * Usage:
 *   node convert.cjs --file <input.docx> [--output <output.md>] [--images <dir>]
 *
 * Options:
 *   --file <path>   Input DOCX file (required)
 *   --output <path> Output MD path (default: input name + .md)
 *   --images <dir>  Directory to extract images (default: inline base64)
 *   --help          Show usage information
 */

const path = require('node:path');
const { convertDocxToMarkdown, generateOutputPath, resolvePath } = require('./lib/docx-converter.cjs');

/**
 * Parse command line arguments
 * @param {string[]} argv - Process arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs(argv) {
  const args = {
    file: null,
    output: null,
    images: null,
    help: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--file' && argv[i + 1]) {
      args.file = argv[++i];
    } else if (arg === '--output' && argv[i + 1]) {
      args.output = argv[++i];
    } else if (arg === '--images' && argv[i + 1]) {
      args.images = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (!arg.startsWith('--') && !args.file) {
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
DOCX to Markdown Converter

Usage:
  node convert.cjs --file <input.docx> [options]

Options:
  --file <path>    Input DOCX file (required)
  --output <path>  Output Markdown path (default: same name as input)
  --images <dir>   Directory to extract images (default: inline as base64)
  --help, -h       Show this help message

Examples:
  node convert.cjs --file ./document.docx
  node convert.cjs --file ./doc.docx --output ./output/doc.md
  node convert.cjs --file ./doc.docx --images ./output/images
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
  const imagesDir = args.images ? resolvePath(args.images, cwd) : null;

  // Convert DOCX to Markdown
  const result = await convertDocxToMarkdown({ inputPath, outputPath, imagesDir });

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
