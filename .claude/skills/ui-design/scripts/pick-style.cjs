#!/usr/bin/env node
'use strict';

/**
 * pick-style.cjs — pick ONE style row from ../data/styles.csv as a divergence seed
 * for `/ui-design --mode=explore` (seed a).
 *
 * Usage:
 *   node .claude/skills/ui-design/scripts/pick-style.cjs            # random pick (crypto.randomInt)
 *   node .claude/skills/ui-design/scripts/pick-style.cjs --seed=7   # deterministic pick
 *
 * Output (stdout, JSON): { "style": "...", "keywords": "...", "row": { <header>: <value>, ... } }
 * Exit codes: 0 ok · 1 data error (file missing, unterminated quoted field, required column absent,
 *   no valid row) · 2 usage error (unknown argument, --seed outside 0..4294967295).
 *
 * A valid row is one whose style-name column is non-empty. Node built-ins only, so the pick
 * behaves the same on Windows, macOS and Linux without a Python dependency.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'data', 'styles.csv');
const STYLE_COLUMN = 'Style Category';
const KEYWORDS_COLUMN = 'Keywords';

/** mulberry32 keeps only 32 bits of seed, so a larger seed would silently repeat a smaller one's pick. */
const MAX_SEED = 0xffffffff;

const USAGE = `Usage: node .claude/skills/ui-design/scripts/pick-style.cjs [--seed=<integer 0..${MAX_SEED}>]

Prints one style row from the design skill's styles.csv as JSON { style, keywords, row }.
--seed=<n>  deterministic pick, n in 0..${MAX_SEED} (same seed, same data -> same row)
--help      show this message`;

/**
 * RFC 4180-style parser: quoted fields, doubled quotes, commas and newlines inside quotes.
 * Throws when the text ends inside a quoted field: otherwise one stray quote would silently fold
 * every later row into one field and shrink the pick pool with exit 0. Rows shorter than the
 * header are allowed (missing trailing cells read as empty), so no column-count check here.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let quoteStart = -1;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      quoteStart = i;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (inQuotes) {
    const line = src.slice(0, quoteStart).split(/\r\n|\r|\n/).length;
    throw new Error(`styles.csv has an unterminated quoted field starting on line ${line}`);
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

/** Small deterministic PRNG (mulberry32); only used when --seed is given. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseArgs(argv) {
  const options = { seed: undefined, help: false };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--seed=')) {
      const raw = arg.slice('--seed='.length);
      if (!/^\d+$/.test(raw) || Number(raw) > MAX_SEED) {
        throw new Error(`--seed requires an integer from 0 to ${MAX_SEED}, got "${raw}"`);
      }
      options.seed = Number(raw);
    } else {
      throw new Error(`Unknown argument "${arg}"`);
    }
  }
  return options;
}

function loadRecords() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`styles data not found: ${path.relative(process.cwd(), DATA_FILE)}`);
  }
  const [header, ...body] = parseCsv(fs.readFileSync(DATA_FILE, 'utf8'));
  const columns = (header || []).map((h) => h.trim());
  const styleIndex = columns.indexOf(STYLE_COLUMN);
  const keywordsIndex = columns.indexOf(KEYWORDS_COLUMN);
  if (styleIndex === -1 || keywordsIndex === -1) {
    throw new Error(`styles.csv header must contain "${STYLE_COLUMN}" and "${KEYWORDS_COLUMN}"`);
  }
  return body
    .filter((cells) => (cells[styleIndex] || '').trim() !== '')
    .map((cells) => {
      const row = {};
      columns.forEach((name, i) => {
        row[name] = (cells[i] || '').trim();
      });
      return { style: row[STYLE_COLUMN], keywords: row[KEYWORDS_COLUMN], row };
    });
}

function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`Usage error: ${error.message}\n${USAGE}\n`);
    return 2;
  }
  if (options.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  let records;
  try {
    // Every loadRecords failure (missing file, malformed CSV, missing column) is a data error.
    records = loadRecords();
  } catch (error) {
    process.stderr.write(`pick-style: ${error.message}\n`);
    return 1;
  }
  if (records.length === 0) {
    process.stderr.write('pick-style: styles.csv has no row with a non-empty style name\n');
    return 1;
  }
  const index = options.seed === undefined
    ? crypto.randomInt(records.length)
    : Math.floor(mulberry32(options.seed)() * records.length);
  process.stdout.write(`${JSON.stringify(records[index], null, 2)}\n`);
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { parseCsv, mulberry32, main };
