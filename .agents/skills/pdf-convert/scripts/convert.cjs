#!/usr/bin/env node

/**
 * pdf-convert dispatcher
 *
 * Routes to one of the two self-contained direction converters:
 *   --to markdown  ->  ../to-markdown/scripts/convert.cjs   (PDF  -> Markdown)
 *   --to pdf       ->  ../to-pdf/scripts/convert.cjs        (Markdown -> PDF)
 *
 * Every argument other than --to is forwarded untouched, so each direction keeps its own
 * CLI contract. Run the target's own --help for its options:
 *   node scripts/convert.cjs --to pdf --help
 *
 * Each direction has its own package.json and node_modules; install the one you need:
 *   cd .claude/skills/pdf-convert/to-pdf && npm install
 *
 * Note: this dispatcher is intentionally duplicated in docx-convert rather than shared.
 * A skill directory is a portable unit; a cross-skill require would break that.
 */

'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SKILL = 'pdf-convert';

/** Conversion direction -> sub-directory holding that converter. */
const DIRECTIONS = {
  markdown: 'to-markdown',
  pdf: 'to-pdf',
};

/**
 * Split argv into the requested direction and the arguments to forward.
 * Accepts both `--to X` and `--to=X`. The last --to wins; everything else passes through.
 *
 * @param {string[]} argv full process.argv
 * @returns {{ to: string | null, rest: string[] }}
 */
function parseArgs(argv) {
  let to = null;
  const rest = [];

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--to') {
      // A trailing `--to` with no value leaves `to` null -> usage + exit 1.
      to = i + 1 < argv.length ? argv[i + 1] : null;
      i++;
      continue;
    }

    if (arg.startsWith('--to=')) {
      to = arg.slice('--to='.length) || null;
      continue;
    }

    rest.push(arg);
  }

  return { to, rest };
}

/**
 * Print what went wrong and how to fix it.
 * @param {string | null} to the rejected value, or null when --to was absent
 * @returns {void}
 */
function printUsage(to) {
  const valid = Object.keys(DIRECTIONS).join('|');
  const problem = to === null
    ? 'Missing --to: pick a conversion direction.'
    : `Unknown conversion direction: ${to}`;

  console.error(`${problem}

USAGE:
  node scripts/convert.cjs --to <${valid}> [options]

DIRECTIONS:
  --to markdown    Convert a PDF to Markdown
  --to pdf         Convert Markdown to a PDF

All other options are passed to the chosen converter. To see them:
  node scripts/convert.cjs --to markdown --help
  node scripts/convert.cjs --to pdf --help

EXAMPLES:
  node .claude/skills/${SKILL}/scripts/convert.cjs --to markdown --input ./report.pdf
  node .claude/skills/${SKILL}/scripts/convert.cjs --to pdf --input ./README.md`);
}

function main() {
  const { to, rest } = parseArgs(process.argv);
  const direction = to === null ? null : DIRECTIONS[to];

  if (!direction) {
    printUsage(to);
    process.exit(1);
  }

  const target = path.join(__dirname, '..', direction, 'scripts', 'convert.cjs');

  // argv array, no shell: nothing in `rest` can be interpreted as a command.
  const result = spawnSync(process.execPath, [target, ...rest], { stdio: 'inherit' });

  if (result.error) {
    console.error(`Could not run the ${to} converter at ${target}: ${result.error.message}`);
    process.exit(1);
  }

  // A child killed by a signal reports status null; report it as a failure rather than success.
  process.exit(result.status === null ? 1 : result.status);
}

main();
