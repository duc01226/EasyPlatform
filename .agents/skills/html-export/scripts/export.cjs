#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolveProjectRoot } = require('../../../scripts/lib/project-root.cjs');

const { EXIT } = require('./lib/exit-codes.cjs');
const { safeBasename, isHtmlFileName } = require('./lib/paths.cjs');
const { errorMessage, firstLine } = require('./lib/result.cjs');
// browser.cjs loads Playwright only inside its functions, so requiring it here needs no dependency.
const {
  PLAYWRIGHT_ROOT,
  dependencyFailure,
  hasAbandonedBrowser,
  launchBudget,
  parseSize,
  parseViewportList,
  probeChromium,
} = require('./lib/browser.cjs');

// Paths are relative to this dispatcher, so targets can add files under scripts/lib/.
const TARGETS = Object.freeze({
  png: 'lib/to-png.cjs',
  pdf: 'lib/to-pdf.cjs',
  mp4: 'lib/to-video.cjs',
  gif: 'lib/to-video.cjs',
});

const GENERIC_FLAGS = Object.freeze({
  out: 'path',
  viewport: 'string',
  slides: 'optional-string',
  page: 'string',
  scale: 'number',
  timeout: 'int',
  offline: 'bool',
  'allow-errors': 'bool',
  'self-check': 'bool',
  help: 'bool',
});

// Option properties the dispatcher itself sets; a target flag must not map onto one of them.
const RESERVED_PROPERTIES = Object.freeze(['inputs', 'input', 'to', 'cwd', 'env', 'outputDir']);

const MIN_NODE_MAJOR = 20;
// The largest delay a Node timer honours (2^31 - 1 ms); every --timeout ends up in a timer.
const MAX_TIMEOUT_MS = 2_147_483_647;
// 1.55.1 is the first release outside the advisory GHSA-7mvr-c777-76hp range.
const MIN_PLAYWRIGHT_VERSION = '1.55.1';
const USAGE_HELP = `Usage:
  node .claude/skills/html-export/scripts/export.cjs --to=<png|pdf|mp4|gif> <input...> [options]

Targets:
  --to=png   Render screenshots and check page errors or blank output
  --to=pdf   Export print pages or navigated slides as PDF
  --to=mp4   Record deterministic HTML animation as MP4
  --to=gif   Record deterministic HTML animation as GIF

Generic options:
  --out=<dir>             Output directory (default: project tmp/html-export)
  --viewport=<WxH[,WxH]>  One or more screenshot viewports
  --slides[=<css>]        Navigate slides with the default or supplied selector
  --page=<WxH>            PDF page size
  --scale=<n>             Screenshot scale
  --timeout=<ms>          Operation timeout
  --offline               Block network access while rendering
  --allow-errors          Allow captured page errors
  --self-check            Run the target's known-good self-check
  --help                  Show this help

Target options (png: --full-page; pdf: --order; mp4/gif: --fps, --duration, --audio,
--gif-width, --keep-frames) are documented in .claude/skills/html-export/SKILL.md.`;

class UsageError extends Error {}
class TargetContractError extends Error {}
// A fault of the machine or the tool, not a missing dependency and not a code defect (exit 1).
class ToolFaultError extends Error {}

function isRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Prints an unexpected failure and returns exit 1. With HTML_EXPORT_DEBUG=1 the stack follows, so
// the stderr a caller quotes is enough to find the failing line without a local repro.
function reportUnexpected(prefix, error, env) {
  console.error(`${prefix}: ${errorMessage(error)}`);
  if (env && env.HTML_EXPORT_DEBUG === '1' && error && typeof error.stack === 'string') {
    console.error(error.stack);
  }
  return EXIT.ERROR;
}

function developerError(error, env) {
  return reportUnexpected('html-export developer error', error, env);
}

function extractTarget(argv) {
  let to = null;
  let supplied = false;
  let ended = false;
  const rest = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!ended && arg === '--') {
      ended = true;
      rest.push(arg);
      continue;
    }

    if (!ended && arg === '--to') {
      supplied = true;
      to = index + 1 < argv.length && argv[index + 1] !== '--' ? argv[index + 1] : null;
      if (to !== null) index += 1;
      continue;
    }

    if (!ended && arg.startsWith('--to=')) {
      supplied = true;
      to = arg.slice('--to='.length) || null;
      continue;
    }

    rest.push(arg);
  }

  return { to, supplied, rest };
}

function hasHelp(rest) {
  for (const arg of rest) {
    if (arg === '--') return false;
    if (arg === '--help') return true;
  }
  return false;
}

function canonicalType(type) {
  const aliases = {
    string: 'string',
    path: 'string',
    number: 'number',
    int: 'int',
    bool: 'bool',
    'optional-string': 'optional-string',
  };
  return aliases[type] || null;
}

function flagProperty(name) {
  return name.replace(/-([a-z0-9])/g, (_match, char) => char.toUpperCase());
}

function parseOptions(rest, targetFlags = {}, targetName = null) {
  if (!isRecord(targetFlags)) {
    throw new TargetContractError('target.flags must be an object mapping flag names to types');
  }

  const flagTypes = { ...GENERIC_FLAGS };
  for (const [name, type] of Object.entries(targetFlags)) {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      throw new TargetContractError(`invalid target flag name: ${name}`);
    }
    if (Object.prototype.hasOwnProperty.call(GENERIC_FLAGS, name)) {
      throw new TargetContractError(`target flag --${name} conflicts with a generic flag`);
    }
    if (RESERVED_PROPERTIES.includes(flagProperty(name))) {
      throw new TargetContractError(`target flag --${name} maps to the reserved option ${flagProperty(name)}`);
    }
    if (!canonicalType(type)) {
      throw new TargetContractError(`unsupported type for target flag --${name}: ${String(type)}`);
    }
    flagTypes[name] = type;
  }

  const options = { inputs: [] };
  let ended = false;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!ended && arg === '--') {
      ended = true;
      continue;
    }

    if (!ended && arg.startsWith('--')) {
      const equalsAt = arg.indexOf('=');
      const name = arg.slice(2, equalsAt < 0 ? undefined : equalsAt);
      const rawValue = equalsAt < 0 ? undefined : arg.slice(equalsAt + 1);
      if (!Object.prototype.hasOwnProperty.call(flagTypes, name)) {
        const forTarget = targetName ? ` for --to=${targetName}` : '';
        throw new UsageError(`Unknown flag --${name}${forTarget}; run with --help for valid options.`);
      }

      const type = canonicalType(flagTypes[name]);
      const property = flagProperty(name);
      if (type === 'bool') {
        if (rawValue !== undefined) throw new UsageError(`Boolean flag --${name} does not take a value.`);
        options[property] = true;
        continue;
      }
      if (type === 'optional-string' && rawValue === undefined) {
        options[property] = true;
        continue;
      }

      let value = rawValue;
      if (value === undefined) {
        const next = rest[index + 1];
        if (next === undefined || next === '--' || next.startsWith('--')) {
          throw new UsageError(`Flag --${name} requires a value.`);
        }
        value = next;
        index += 1;
      }
      if (value === '') throw new UsageError(`Flag --${name} requires a non-empty value.`);

      if (type === 'number' || type === 'int') {
        const number = Number(value);
        if (!Number.isFinite(number) || (type === 'int' && !Number.isInteger(number))) {
          throw new UsageError(`Flag --${name} requires a ${type === 'int' ? 'whole number' : 'number'}.`);
        }
        options[property] = number;
      } else {
        options[property] = value;
      }
      continue;
    }

    options.inputs.push(arg);
  }

  options.input = options.inputs[0] || null;
  return options;
}

/**
 * Range and format rules for the generic flags, owned here once for every target: a bad value
 * is a usage error (exit 2) before any target check or dependency probe. Targets keep only their
 * own rules (for example "one viewport" or "--page only for pdf").
 */
function validateGenericOptions(options) {
  if (options.timeout !== undefined && !(options.timeout > 0)) {
    throw new UsageError('--timeout must be a positive whole number of milliseconds.');
  }
  // Node timers clamp a longer delay to 1 ms, so a huge value would expire at once, not "never".
  if (options.timeout !== undefined && options.timeout > MAX_TIMEOUT_MS) {
    throw new UsageError(`--timeout must be at most ${MAX_TIMEOUT_MS} milliseconds (about 24.8 days).`);
  }
  if (options.scale !== undefined && !(options.scale > 0)) {
    throw new UsageError('--scale must be a positive number.');
  }
  try {
    if (options.viewport !== undefined) parseViewportList(options.viewport);
    if (options.page !== undefined) parseSize(options.page, '--page', '1920x1080');
  } catch (error) {
    throw new UsageError(errorMessage(error));
  }
  if (typeof options.slides === 'string' && options.slides.trim() === '') {
    throw new UsageError('--slides needs a CSS selector after =, or no value for the default selector.');
  }
  validateInputs(options);
}

function isDirectory(file) {
  try {
    return fs.statSync(file).isDirectory();
  } catch {
    return false;
  }
}

// The one input-acceptance rule for every target (isHtmlFileName in lib/paths.cjs): a positional
// input must be an .html or .htm file (any case), checked before any target runs; pdf applies the
// same rule to each `--order` entry. An existing directory is left to the target (pdf
// expands it to its HTML files; png and video reject it), and a missing .html input is reported by
// the target, which names what it looked for.
function validateInputs(options) {
  for (const input of options.inputs || []) {
    const absolute = path.resolve(options.cwd || process.cwd(), input);
    if (isHtmlFileName(absolute)) continue;
    if (isDirectory(absolute)) continue;
    throw new UsageError(`input must be an .html or .htm file: ${absolute}`);
  }
}

function validateTargetModule(moduleExports, targetName) {
  if (!isRecord(moduleExports)) {
    throw new TargetContractError(`target ${targetName} must export an object`);
  }
  if (!isRecord(moduleExports.flags)) {
    throw new TargetContractError(`target ${targetName} must export flags as an object`);
  }
  for (const method of ['validate', 'preflight', 'run']) {
    if (typeof moduleExports[method] !== 'function') {
      throw new TargetContractError(`target ${targetName} must export ${method}(...)`);
    }
  }
  return moduleExports;
}

function loadTarget(targetName, skillRoot) {
  const targetPath = path.join(__dirname, TARGETS[targetName]);
  let moduleExports;
  try {
    // Only the selected target is loaded; each target owns its flags and dependencies.
    moduleExports = require(targetPath);
  } catch (error) {
    throw new TargetContractError(
      `could not load target ${targetName} at ${path.relative(skillRoot, targetPath)}: ${errorMessage(error)}. `
      + 'Target modules must defer Playwright and pdf-lib imports until their functions run.',
    );
  }
  return validateTargetModule(moduleExports, targetName);
}

function formatTimestamp(date) {
  const two = (number) => String(number).padStart(2, '0');
  return `${two(date.getFullYear() % 100)}${two(date.getMonth() + 1)}${two(date.getDate())}-${two(date.getHours())}${two(date.getMinutes())}`;
}

function resolveOutputDir(options, runtime) {
  if (options.out) return path.resolve(runtime.cwd, options.out);

  const project = resolveProjectRoot({
    cwd: runtime.cwd,
    scriptPath: runtime.scriptPath,
    env: runtime.env,
  });
  if (project.error) throw new Error(project.error);

  const inputName = safeBasename(options.input || 'input');
  return path.join(project.rootDir, 'tmp', 'html-export', `${formatTimestamp(runtime.now)}-${inputName}`);
}

function parseVersion(version) {
  if (typeof version !== 'string') return null;
  const match = /^(?:v)?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] || null,
  };
}

function versionAtLeast(actualVersion, minimumVersion) {
  const actual = parseVersion(actualVersion);
  const minimum = parseVersion(minimumVersion);
  if (!actual || !minimum) return false;

  for (const part of ['major', 'minor', 'patch']) {
    if (actual[part] > minimum[part]) return true;
    if (actual[part] < minimum[part]) return false;
  }
  if (minimum.prerelease) return actual.prerelease === null || actual.prerelease >= minimum.prerelease;
  return actual.prerelease === null;
}

// Shared dependency preflight: Node, the skill-local Playwright, then a Chromium launch probe.
// Returns null when ready, or the exit-3 text (reason + setup commands) for a missing dependency.
// A probe launch that TIMES OUT throws ToolFaultError (exit 1): the browser is installed but the
// machine is busy or broken, so reinstalling would not help. Any other launch failure (for example
// the executable or its system libraries are missing) is a missing dependency (exit 3). The probe
// never borrows a short per-page --timeout (browser.cjs launchBudget, as every session launch).
async function sharedPreflight(options = {}, runtime = {}) {
  const nodeVersion = runtime.nodeVersion || process.versions.node;
  const nodeMajor = /^(?:v)?(\d+)/.exec(nodeVersion);
  if (!nodeMajor || Number(nodeMajor[1]) < MIN_NODE_MAJOR) {
    return dependencyFailure(`Node.js ${MIN_NODE_MAJOR} or newer is required; found ${nodeVersion || 'unknown'}.`);
  }

  const playwrightPackagePath = path.join(PLAYWRIGHT_ROOT, 'package.json');
  let playwrightPackage;
  try {
    playwrightPackage = JSON.parse(fs.readFileSync(playwrightPackagePath, 'utf8'));
  } catch {
    return dependencyFailure(`Playwright is not installed in the html-export skill at ${PLAYWRIGHT_ROOT}.`);
  }
  if (!versionAtLeast(playwrightPackage.version, MIN_PLAYWRIGHT_VERSION)) {
    return dependencyFailure(
      `Playwright ${MIN_PLAYWRIGHT_VERSION} or newer is required in the html-export skill; found ${playwrightPackage.version || 'an invalid version'}.`,
    );
  }

  const budgetMs = launchBudget(options.timeout);
  try {
    await probeChromium({ budgetMs });
  } catch (error) {
    if (error && error.launchTimedOut === true) {
      throw new ToolFaultError(
        `the Chromium launch probe timed out after ${budgetMs} ms (${firstLine(error)}). Chromium is installed but did `
        + 'not start in time: the machine is busy or the browser is broken. Retry, or pass a longer --timeout.',
      );
    }
    return dependencyFailure(`Chromium launch probe failed: ${errorMessage(error)}`);
  }

  return null;
}

async function main(argv = process.argv.slice(2), runtime = {}) {
  const context = {
    cwd: path.resolve(runtime.cwd || process.cwd()),
    scriptPath: runtime.scriptPath || __filename,
    env: runtime.env || process.env,
    nodeVersion: runtime.nodeVersion || process.versions.node,
    now: runtime.now || new Date(),
  };
  const selected = extractTarget(argv);

  if (selected.to !== null && !Object.prototype.hasOwnProperty.call(TARGETS, selected.to)) {
    console.error(`Unknown --to target: ${selected.to}. Valid targets: ${Object.keys(TARGETS).join(', ')}.`);
    return EXIT.USAGE;
  }
  if (hasHelp(selected.rest)) {
    console.log(USAGE_HELP);
    return EXIT.OK;
  }
  if (!selected.supplied || selected.to === null) {
    console.error(`Missing --to=<png|pdf|mp4|gif>.\nRun with --help for usage.`);
    return EXIT.USAGE;
  }

  const skillRoot = path.resolve(__dirname, '..');
  let target;
  try {
    target = loadTarget(selected.to, skillRoot);
  } catch (error) {
    return developerError(error, context.env);
  }

  let options;
  try {
    options = parseOptions(selected.rest, target.flags, selected.to);
    options.to = selected.to;
    // Targets resolve relative inputs against the caller's cwd and read the caller's env,
    // so an in-process main(argv, { cwd, env }) behaves exactly like the CLI.
    options.cwd = context.cwd;
    options.env = context.env;
    validateGenericOptions(options);
  } catch (error) {
    if (!(error instanceof UsageError)) return developerError(error, context.env);
    console.error(`Usage error: ${errorMessage(error)}`);
    return EXIT.USAGE;
  }

  try {
    const validation = target.validate(options);
    if (validation && typeof validation.then === 'function') {
      throw new TargetContractError('target.validate(options) must be synchronous');
    }
  } catch (error) {
    if (error instanceof TargetContractError) return developerError(error, context.env);
    console.error(`Usage error: ${errorMessage(error)}`);
    return EXIT.USAGE;
  }

  try {
    // Target usage errors take precedence over project-root configuration errors.
    options.outputDir = resolveOutputDir(options, context);
  } catch (error) {
    return developerError(error, context.env);
  }

  // A target's own dependency (for example ffmpeg, or pdf-lib when pdf merges) is checked first, so
  // its setup text wins over the shared Playwright/Chromium checks below.
  let targetDependency;
  try {
    targetDependency = target.preflight(options);
    if (targetDependency && typeof targetDependency.then === 'function') {
      throw new TargetContractError('target.preflight(options) must be synchronous');
    }
    if (targetDependency !== null && typeof targetDependency !== 'string') {
      throw new TargetContractError('target.preflight(options) must return a string or null');
    }
  } catch (error) {
    return developerError(error, context.env);
  }
  if (targetDependency) {
    console.error(`Dependency missing for target ${selected.to}: ${targetDependency}`);
    return EXIT.DEPENDENCY;
  }

  let sharedDependency;
  try {
    sharedDependency = await sharedPreflight(options, context);
  } catch (error) {
    if (error instanceof ToolFaultError) return reportUnexpected('html-export error', error, context.env);
    return developerError(error, context.env);
  }
  if (sharedDependency) {
    console.error(`Dependency missing: ${sharedDependency}`);
    return EXIT.DEPENDENCY;
  }

  try {
    const result = await target.run(options);
    if (result === undefined || result === null) return EXIT.OK;
    if (Number.isInteger(result) && Object.values(EXIT).includes(result)) return result;
    return developerError(new TargetContractError(`target ${selected.to}.run(options) returned invalid exit code ${String(result)}`), context.env);
  } catch (error) {
    return reportUnexpected('html-export error', error, context.env);
  }
}

module.exports = {
  EXIT,
  TARGETS,
  GENERIC_FLAGS,
  MAX_TIMEOUT_MS,
  extractTarget,
  parseOptions,
  validateGenericOptions,
  resolveOutputDir,
  versionAtLeast,
  sharedPreflight,
  exitProcess,
  main,
};

// Ends the CLI with `code`. Normally the process exits on its own once the event loop drains; a
// browser whose close timed out keeps that loop alive, so then the process exits explicitly (after
// stdout and stderr flush) and Playwright's exit handler kills the abandoned browser.
function exitProcess(code) {
  process.exitCode = code;
  if (!hasAbandonedBrowser()) return;
  process.stdout.write('', () => process.stderr.write('', () => process.exit(code)));
}

if (require.main === module) {
  main().then(exitProcess).catch((error) => {
    exitProcess(reportUnexpected('html-export error', error, process.env));
  });
}
