#!/usr/bin/env node

/**
 * Markdown to DOCX Converter CLI
 *
 * Usage:
 *   node convert.cjs --input ./doc.md [--output ./out.docx] [--theme ./theme.json]
 *
 * Options:
 *   --input, -i       Input markdown file (required)
 *   --output, -o      Output DOCX path (default: input.docx)
 *   --theme, -t       Custom theme JSON path
 *   --title           Document title (overrides frontmatter)
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
    theme: null,
    title: null,
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

      case '--theme':
      case '-t':
        args.theme = nextArg;
        i++;
        break;

      case '--title':
        args.title = nextArg;
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
markdown-to-docx - Convert markdown files to Microsoft Word

USAGE:
  node convert.cjs --input <file.md> [options]
  node convert.cjs <file.md> [options]

OPTIONS:
  --input, -i <path>     Input markdown file (required)
  --output, -o <path>    Output DOCX path (default: same as input with .docx)
  --theme, -t <path>     Custom theme JSON file
  --title <string>       Document title (overrides frontmatter)
  --help, -h             Show this help message

FEATURES:
  - GFM tables, code blocks, images
  - LaTeX math equations (enabled by default)
  - Custom styling via theme JSON
  - No system dependencies (pure JavaScript)

EXAMPLES:
  # Basic conversion
  node convert.cjs --input ./README.md

  # With custom output
  node convert.cjs -i ./docs/guide.md -o ./output/guide.docx

  # With custom theme
  node convert.cjs -i ./paper.md --theme ./academic-theme.json

OUTPUT:
  Returns JSON on success:
  {
    "success": true,
    "input": "/path/to/input.md",
    "output": "/path/to/output.docx"
  }

  Returns JSON on error:
  {
    "success": false,
    "error": "Error description"
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
    require.resolve('markdown-docx');
  } catch {
    missing.push('markdown-docx');
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
      theme: args.theme,
      title: args.title
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
