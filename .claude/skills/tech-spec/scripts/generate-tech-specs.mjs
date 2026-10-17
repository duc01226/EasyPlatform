#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { resolveMutationProjectRoot } = require('../../../scripts/lib/project-root.cjs');

const DERIVED_BANNER = '> DERIVED — regenerate with the tech-spec skill; do NOT hand-edit.';
// The two trait names the renderer understands. A config-supplied annotationPattern
// MUST capture one of these as group 1 and a non-empty spec id as group 2.
const KNOWN_TRAIT_NAMES = new Set(['TestSpec', 'TechnicalSpec']);
const CONTROL_FLOW_NAMES = new Set(['if', 'for', 'while', 'switch', 'catch', 'when', 'with', 'assert', 'return']);
const MAX_REPORTED_DIFFERENCES = 50;
const OCCURRENCE_MARKER_PATTERN = /<!-- tech-spec-annotation-occurrence:([A-Za-z0-9_-]+) -->/g;
const OPERATION_TOKENS = {
  event: new Set(['event', 'events', 'message', 'messages', 'consumer', 'consumers', 'outbox', 'outboxes', 'inbox', 'inboxes', 'bus', 'buses']),
  background: new Set(['migration', 'migrations', 'backfill', 'backfills', 'schema', 'schemas', 'shape', 'shapes', 'backgroundjob', 'backgroundjobs']),
  read: new Set(['query', 'queries', 'read', 'reads', 'get', 'gets', 'list', 'lists', 'search', 'searches', 'filter', 'filters', 'dashboard', 'dashboards', 'export', 'exports', 'projection', 'projections', 'readmodel', 'readmodels']),
  write: new Set(['command', 'commands', 'save', 'saves', 'saved', 'create', 'creates', 'created', 'update', 'updates', 'updated', 'delete', 'deletes', 'deleted', 'submit', 'submits', 'submitted', 'import', 'imports', 'imported', 'move', 'moves', 'moved', 'sync', 'syncs', 'synced', 'calculate', 'calculates', 'calculated']),
};
const EXCLUDED_DIRS = new Set([
  '.git',
  '.vs',
  '.idea',
  '.vscode',
  'bin',
  'obj',
  'node_modules',
  'dist',
  'out',
  'coverage',
]);
const TECHNICAL_HINTS = [
  'schema',
  'shape',
  'readmodel',
  'read model',
  'postgres',
  'migration',
  'backfill',
  'filestorage',
  'file storage',
  'azurefilestorage',
  'uri',
  'endpoint',
  'config',
  'authorizationconfig',
  'backgroundjob',
  'background job',
  'message',
  'consumer',
  'projection',
  'foreignkey',
  'index',
  'column',
  'table',
];

// Match the shared runner's cwd-ancestor/script-ancestor contract. Explicit
// CLAUDE_PROJECT_DIR remains the highest-precedence selection when a caller
// needs to target a copied or relocated project.
const repoRoot = resolveMutationProjectRoot({
  cwd: process.cwd(),
  scriptPath: fileURLToPath(import.meta.url),
  env: process.env,
  preferCwdFallback: false,
}).rootDir;
const realRepoRoot = await fs.realpath(repoRoot);
const args = process.argv.slice(2);
const isCheck = args.includes('--check');
const isOptional = args.includes('--optional');
const unknownArgs = args.filter((arg) => arg !== '--check' && arg !== '--optional');
if (unknownArgs.length > 0) {
  throw new Error(`Unknown argument(s): ${unknownArgs.join(', ')}. Supported: --check [--optional]`);
}

const projectConfigPath = await resolveProjectConfigPath(repoRoot);
const projectConfigLabel = toPosix(path.relative(repoRoot, projectConfigPath));
const config = isOptional ? await readJsonOrNull(projectConfigPath) : await readJson(projectConfigPath);
if (isOptional && (config === null || !Object.prototype.hasOwnProperty.call(config, 'techSpecScan'))) {
  console.log(`[tech-spec] SKIP (project config has no techSpecScan contract)`);
  process.exit(0);
}
const technicalRoot = config?.specRoots?.technical?.path;

if (!technicalRoot) {
  throw new Error(`Missing ${projectConfigLabel} specRoots.technical.path`);
}

// How to scan this project's tests is a per-project fact, not a property of the
// framework. Without it there is nothing to scan, and pretending otherwise would
// report a false success on every stack that lacks the convention.
const scan = config?.techSpecScan;
if (!scan?.sourceRoot || !scan?.fileExtensions?.length || !scan?.annotationPattern) {
  throw new Error(
    `Missing ${projectConfigLabel} techSpecScan.{sourceRoot,fileExtensions,annotationPattern}.\n` +
      'The tech-spec generator discovers annotated tests via these settings; this project declares none,\n' +
      'so there is nothing to scan. Add techSpecScan once this project has a test-annotation convention.',
  );
}

const sourceExtensions = scan.fileExtensions;
const annotationPattern = new RegExp(scan.annotationPattern);

const outputRoot = path.resolve(repoRoot, technicalRoot);
assertInsideRepo(outputRoot);

const sourceRoot = path.resolve(repoRoot, scan.sourceRoot);
assertInsideRepo(sourceRoot);

const entries = await collectTraitEntries(sourceRoot);

// A scan that matched nothing is a configuration failure, not a success. Reporting
// status:"ok" with annotations:0 is indistinguishable from a correct empty run and
// hides a misconfigured sourceRoot/extension/pattern behind a green exit code.
if (entries.length === 0) {
  console.error(
    JSON.stringify(
      {
        status: 'no-annotations-found',
        sourceRoot: toPosix(path.relative(repoRoot, sourceRoot)),
        fileExtensions: sourceExtensions,
        annotationPattern: scan.annotationPattern,
        hint: `No annotated tests matched. Check techSpecScan settings in ${projectConfigLabel}. Nothing was written or deleted.`,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const groups = groupEntries(entries);
const technicalCount = entries.filter((entry) => entry.traitName === 'TechnicalSpec').length;
const businessJoinCount = entries.filter((entry) => entry.traitName === 'TestSpec').length;
const candidateCount = entries.filter(isTechnicalCandidate).length;

if (isCheck) {
  const report = await checkTechnicalViews(outputRoot, groups, entries);
  const writeReport = report.status === 'fresh' ? console.log : console.error;
  writeReport(JSON.stringify(report, null, 2));
  if (report.status !== 'fresh') {
    process.exitCode = 1;
  }
} else {
  const output = await reconcileAllViews(outputRoot, groups);

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        outputRoot: toPosix(path.relative(repoRoot, outputRoot)),
        filesWritten: output.filesWritten,
        filesUnchanged: output.filesUnchanged,
        filesRemoved: output.filesRemoved,
        annotations: entries.length,
        technicalSpecAnnotations: technicalCount,
        testSpecAnnotations: businessJoinCount,
        technicalLookingTestSpecCandidates: candidateCount,
      },
      null,
      2,
    ),
  );
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonOrNull(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function resolveProjectConfigPath(rootDir) {
  let ckConfig = null;
  try {
    ckConfig = JSON.parse(await fs.readFile(path.join(rootDir, '.claude', '.ck.json'), 'utf8'));
  } catch {
    // The default path is the portable convention when no relocation metadata is present.
  }

  const configured = ckConfig?.portability?.projectConfigPath;
  const relativePath = typeof configured === 'string' && configured.trim()
    ? configured.trim()
    : 'docs/project-config.json';
  const configPath = path.resolve(rootDir, relativePath);
  assertInsideRepo(configPath);
  return configPath;
}

function assertInsideRepo(targetPath) {
  const relative = path.relative(repoRoot, targetPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside repository: ${targetPath}`);
  }
}

function isPathWithin(basePath, targetPath) {
  const relative = path.relative(basePath, targetPath);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

// Lexical containment is not enough when an existing directory component is a
// junction/symlink. Walk to the nearest existing ancestor and validate both the
// directory entry and its resolved location before any generated file is read
// or written. Missing leaf directories are safe to create once their existing
// ancestor has passed this check.
async function assertSafeOutputPath(targetPath) {
  const logicalPath = path.resolve(targetPath);
  assertInsideRepo(logicalPath);

  let currentPath = logicalPath;
  while (true) {
    try {
      const stat = await fs.lstat(currentPath);
      if (stat.isSymbolicLink()) {
        throw new Error(
          `Refusing to use symbolic link in technical-spec output path: ${toPosix(path.relative(repoRoot, currentPath))}`,
        );
      }

      const resolvedPath = await fs.realpath(currentPath);
      if (!isPathWithin(realRepoRoot, resolvedPath)) {
        throw new Error(
          `Refusing to use technical-spec output outside repository after resolving links: ${currentPath}`,
        );
      }
      return;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) {
        throw new Error(`Unable to resolve technical-spec output ancestor: ${logicalPath}`, { cause: error });
      }
      currentPath = parentPath;
    }
  }
}

async function collectTraitEntries(rootPath) {
  const files = await collectFiles(rootPath, {
    matches: (name) => sourceExtensions.some((ext) => name.endsWith(ext)),
    excludeDirs: EXCLUDED_DIRS,
  });

  const allEntries = [];
  for (const filePath of files.sort(compareText)) {
    const fileEntries = await parseTraitEntries(filePath);
    allEntries.push(...fileEntries);
  }

  return allEntries.sort((a, b) =>
    compareText(a.service, b.service) ||
    compareText(a.component, b.component) ||
    compareText(a.relPath, b.relPath) ||
    a.line - b.line ||
    compareText(a.id, b.id),
  );
}

// The one recursive file walker. Both callers differ ONLY in which names they keep and
// whether they prune build directories, so those are parameters rather than a second copy.
// `excludeDirs` defaults to pruning NOTHING: the deletion scan must see every file under
// the technical root, since an unseen file is one this script would delete without
// validating it. A missing scan root is interpreted by the caller as an empty root;
// every nested read error fails closed instead of producing a partial projection.
async function collectFiles(rootPath, { matches, excludeDirs = new Set(), rejectSymlinks = false }) {
  const files = [];

  async function walk(currentPath) {
    let items;
    try {
      items = await fs.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT' && currentPath === rootPath) {
        return;
      }
      const relativePath = toPosix(path.relative(repoRoot, currentPath)) || '.';
      throw new Error(`Unable to scan tech-spec path ${relativePath}: ${error.message}`, { cause: error });
    }

    for (const item of items) {
      const itemPath = path.join(currentPath, item.name);
      if (item.isSymbolicLink()) {
        if (!rejectSymlinks) continue;
        throw new Error(
          `Refusing to scan symbolic link in technical-spec path ${toPosix(path.relative(repoRoot, itemPath))}. ` +
            'Remove the link or point the configured root at a real directory.',
        );
      }
      if (item.isDirectory()) {
        if (!excludeDirs.has(item.name.toLowerCase())) {
          await walk(itemPath);
        }
      } else if (item.isFile() && matches(item.name)) {
        files.push(itemPath);
      }
    }
  }

  await walk(rootPath);
  return files;
}

async function parseTraitEntries(filePath) {
  const relPath = toPosix(path.relative(repoRoot, filePath));
  const text = await fs.readFile(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const entries = [];
  const pendingTraits = [];
  let currentClass = path.basename(filePath, path.extname(filePath));

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const classMatch = line.match(
      /^\s*(?:(?:export|default|public|private|internal|protected|abstract|sealed|static|partial|final|open|data)\s+)*(?:class|interface|object)\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/,
    );
    if (classMatch) {
      currentClass = classMatch[1];
    }

    const traitMatch = line.match(annotationPattern);
    if (traitMatch) {
      // annotationPattern is CONFIG-SUPPLIED, so its captures cannot be trusted.
      // Validate here — at the parse boundary, which runs BEFORE reconcileAllViews —
      // because a downstream failure would throw only after derived output was already
      // deleted, reproducing the very data-loss this script was fixed to prevent.
      const [, traitName, id] = traitMatch;
      if (traitMatch.length !== 3 || !KNOWN_TRAIT_NAMES.has(traitName) || !id?.trim()) {
        throw new Error(
          `Invalid techSpecScan.annotationPattern match in ${toPosix(path.relative(repoRoot, filePath))}:${index + 1}.\n` +
            `  matched: ${JSON.stringify(line.trim())}\n` +
            `  capture group 1 (trait name) = ${JSON.stringify(traitName)} — must be one of: ${[...KNOWN_TRAIT_NAMES].join(', ')}\n` +
            `  capture group 2 (spec id)    = ${JSON.stringify(id)} — must be non-empty\n` +
            `The pattern must expose exactly two capture groups in that order. No files were changed.`,
        );
      }
      const trait = { traitName, id, line: index + 1 };
      // JavaScript/TypeScript commonly carries the test identity inside the
      // describe/it/test call rather than on a declaration line. Use the stable
      // configured id in the synthetic method name so repeated runs project the
      // same occurrence and multiple calls on one line remain distinguishable.
      const methodName = inlineTestMethodName(line, id) ?? methodNameForLine(line);
      if (methodName) {
        appendTraitEntries(entries, [trait], { relPath, currentClass, methodName });
      } else {
        pendingTraits.push(trait);
      }
      continue;
    }

    if (pendingTraits.length === 0) {
      continue;
    }

    const methodName = methodNameForLine(line);
    if (!methodName) {
      continue;
    }

    appendTraitEntries(entries, pendingTraits.splice(0), { relPath, currentClass, methodName });
  }

  return entries;
}

function methodNameForLine(line) {
  const csharpMatch = line.match(
    /^\s*(?:public|private|internal|protected)\s+(?:static\s+)?(?:async\s+)?[A-Za-z0-9_<>,\[\]\.?]+\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/,
  );
  if (csharpMatch) return csharpMatch[1];

  const functionMatch = line.match(
    /^\s*(?:(?:export|default|declare)\s+)*(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/,
  );
  if (functionMatch) return functionMatch[1];

  const arrowMatch = line.match(
    /^\s*(?:(?:export|declare)\s+)?(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[A-Za-z_$][A-Za-z0-9_$]*)\s*=>/,
  );
  if (arrowMatch) return arrowMatch[1];

  const pythonMatch = line.match(/^\s*(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
  if (pythonMatch) return pythonMatch[1];

  // Covers Java/Kotlin declarations and class/object methods without trying to
  // become a language parser. The explicit control-flow exclusion prevents an
  // annotation followed by `if (...)` from being attached to a branch.
  const declarationMatch = line.match(
    /^\s*(?:(?:public|private|protected|internal|static|final|abstract|async|override|virtual|sealed|synchronized|native|inline|open|suspend|operator|fun)\s+)*(?:<[^>]+>\s*)?(?:[A-Za-z_$][A-Za-z0-9_$<>,.?[\]]*\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/,
  );
  if (!declarationMatch || CONTROL_FLOW_NAMES.has(declarationMatch[1])) return null;
  return declarationMatch[1];
}

function inlineTestMethodName(line, id) {
  const callMatch = line.match(/\b(describe|it|test|specify|suite)\s*\(/);
  return callMatch ? `${callMatch[1]}_${sanitizeSegment(id)}` : null;
}

function appendTraitEntries(entries, traits, { relPath, currentClass, methodName }) {
  const { service, component } = deriveServiceComponent(relPath, currentClass);
  for (const trait of traits) {
    entries.push({
      ...trait,
      relPath,
      className: currentClass,
      methodName,
      service,
      component,
      operationKind: deriveOperationKind(`${relPath} ${currentClass} ${methodName} ${trait.id}`),
    });
  }
}

function deriveServiceComponent(relPath, className) {
  const parts = relPath.split('/');
  let service = 'General';

  // Derive the service from path STRUCTURE, never from a hardcoded service NAME/VALUE.
  // `Services` below is a soft path-layout marker (with a `parts[1]` fallback), not a baked-in
  // service value: a project without a `Services/` segment still groups by its top path segment.
  // This script is portable framework code; hardcoding a consumer's actual service names inside
  // it would couple every other consumer to that one repo's layout.
  const servicesIndex = parts.indexOf('Services');
  if (servicesIndex >= 0 && parts[servicesIndex + 1]) {
    service = parts[servicesIndex + 1];
  } else if (parts[1]) {
    service = parts[1];
  }

  const fileIndex = parts.length - 1;
  const projectIndex = parts.findIndex((part) => /\.?(IntegrationTests|Tests)(?:\.|$)/.test(part));
  const componentParts = projectIndex >= 0 ? parts.slice(projectIndex + 1, fileIndex) : parts.slice(Math.max(0, fileIndex - 1), fileIndex);
  const component =
    componentParts[0] === 'Infrastructures' && componentParts[1]
      ? `${componentParts[0]}-${componentParts[1]}`
      : componentParts[0] || className.replace(/Tests$/, '') || 'General';

  return {
    service: sanitizeSegment(service),
    component: sanitizeSegment(component),
  };
}

function deriveOperationKind(value) {
  const tokens = tokenizeForMatch(value);
  if (hasAnyToken(tokens, OPERATION_TOKENS.event)) {
    return 'Event/Message';
  }
  if (hasAnyToken(tokens, OPERATION_TOKENS.background) || hasTokenSequence(tokens, ['background', 'job'])) {
    return 'Background/Data';
  }
  if (hasAnyToken(tokens, OPERATION_TOKENS.read) || hasTokenSequence(tokens, ['read', 'model'])) {
    return 'Read';
  }
  if (hasAnyToken(tokens, OPERATION_TOKENS.write)) {
    return 'Write';
  }
  return 'Test/Invariant';
}

function hasAnyToken(tokens, vocabulary) {
  return tokens.some((token) => vocabulary.has(token));
}

function hasTokenSequence(tokens, sequence) {
  return tokens.some((_, index) => sequence.every((token, offset) => tokens[index + offset] === token));
}

// What makes an entry a candidate AND the hint that explains why are the SAME rule, so
// they are one function. Stated twice, the two could disagree — a candidate row whose
// reason column says "technical hint" with no hint named is exactly that disagreement.
function technicalHint(entry) {
  if (entry.traitName !== 'TestSpec') {
    return null;
  }

  const text = normalizeForMatch(`${entry.relPath} ${entry.className} ${entry.methodName} ${entry.id}`);
  return TECHNICAL_HINTS.find((hint) => text.includes(hint)) ?? null;
}

function isTechnicalCandidate(entry) {
  return technicalHint(entry) !== null;
}

function normalizeForMatch(value) {
  return tokenizeForMatch(value).join(' ');
}

function tokenizeForMatch(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// Validate the complete live tree before any writes. A hand-authored Markdown file is
// never eligible for reconciliation or deletion.
async function validateGeneratedMarkdown(rootPath) {
  await assertSafeOutputPath(rootPath);
  const files = await collectFiles(rootPath, { matches: (name) => name.endsWith('.md'), rejectSymlinks: true });

  const nonDerived = [];
  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf8');
    if (!content.startsWith(DERIVED_BANNER)) {
      nonDerived.push(toPosix(path.relative(repoRoot, filePath)));
    }
  }

  if (nonDerived.length > 0) {
    throw new Error(
      `Refusing to delete anything: ${nonDerived.length} file(s) in the technical spec root are not derived output.\n` +
        nonDerived.map((p) => `  - ${p}`).join('\n') +
        `\n\nThe technical spec root ("${toPosix(path.relative(repoRoot, rootPath))}") must contain ONLY generated files.\n` +
        `Move or delete the file(s) above, then re-run. No files were changed.`,
    );
  }

  return files;
}

// Reconcile with a preflight plan and rollback protection rather than
// delete-and-rebuild. Preflight catches invalid output paths before mutation;
// backups let a mid-commit I/O failure restore the previous complete tree.
async function reconcileAllViews(rootPath, groups, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const existingFiles = await validateGeneratedMarkdown(rootPath);
  const existingByKey = new Map(existingFiles.map((filePath) => [pathKey(filePath), filePath]));
  const expectedFiles = new Map();
  const plannedViews = [];

  for (const [groupKey, groupEntriesList] of [...groups.entries()].sort(([a], [b]) => compareText(a, b))) {
    const [service, component] = groupKey.split('/');
    const outputPath = path.join(rootPath, service, `${component}.md`);
    await assertSafeOutputPath(outputPath);
    const outputKey = pathKey(outputPath);
    if (expectedFiles.has(outputKey)) {
      throw new Error(`Multiple generated views resolve to the same output path: ${outputPath}`);
    }
    expectedFiles.set(outputKey, outputPath);

    // Read every target before the first write. Besides making the plan explicit,
    // this turns a target directory, broken parent, or permission error into a
    // no-mutation failure instead of discovering it after an earlier view changed.
    const existingPath = existingByKey.get(outputKey) ?? outputPath;
    const existing = await readOptionalFile(existingPath);
    const content = renderView({ service, component, entries: groupEntriesList, today });
    plannedViews.push({
      filePath: existingPath,
      content,
      existing,
      changed: existing === null || normalizeGeneratedContent(existing) !== normalizeGeneratedContent(content),
    });
  }

  const staleFiles = existingFiles.filter((filePath) => !expectedFiles.has(pathKey(filePath)));
  const filesWritten = plannedViews.filter((view) => view.changed).length;
  const filesUnchanged = plannedViews.length - filesWritten;
  if (filesWritten === 0 && staleFiles.length === 0) {
    return { filesWritten, filesUnchanged, filesRemoved: 0 };
  }

  const transactionRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'tech-spec-reconcile-'));
  const backups = [];
  const createdPaths = [];

  try {
    // Back up every file that this transaction may replace or remove before
    // touching the output tree. Copies keep the original tree intact during
    // preflight and make rollback independent of filesystem rename semantics.
    let backupIndex = 0;
    for (const view of plannedViews.filter((candidate) => candidate.changed && candidate.existing !== null)) {
      const backupPath = path.join(transactionRoot, `${backupIndex++}.bak`);
      await fs.copyFile(view.filePath, backupPath);
      backups.push({ originalPath: view.filePath, backupPath });
    }
    for (const filePath of staleFiles) {
      const backupPath = path.join(transactionRoot, `${backupIndex++}.bak`);
      await fs.copyFile(filePath, backupPath);
      backups.push({ originalPath: filePath, backupPath });
    }

    for (const view of plannedViews.filter((candidate) => candidate.changed)) {
      if (view.existing === null) createdPaths.push(view.filePath);
      await fs.mkdir(path.dirname(view.filePath), { recursive: true });
      await fs.writeFile(view.filePath, view.content, 'utf8');
    }

    // Stale output is removed only after every expected view has been written or
    // confirmed unchanged. A failed commit enters rollback and restores the
    // previous tree, including stale derived files.
    for (const filePath of staleFiles) {
      await fs.rm(filePath);
    }

    return { filesWritten, filesUnchanged, filesRemoved: staleFiles.length };
  } catch (error) {
    const rollbackErrors = await rollbackReconciliation(backups, createdPaths);
    if (rollbackErrors.length > 0) {
      throw new Error(
        `${error.message}; rollback also failed for ${rollbackErrors.length} path(s): ${rollbackErrors.join('; ')}`,
        { cause: error },
      );
    }
    throw error;
  } finally {
    await fs.rm(transactionRoot, { recursive: true, force: true });
  }
}

async function readOptionalFile(filePath) {
  let existing = null;
  try {
    existing = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return existing;
}

function pathKey(filePath) {
  const normalized = path.normalize(path.resolve(filePath));
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

async function rollbackReconciliation(backups, createdPaths) {
  const errors = [];
  for (const filePath of [...createdPaths].reverse()) {
    try {
      const stat = await fs.lstat(filePath);
      if (stat.isFile() || stat.isSymbolicLink()) await fs.unlink(filePath);
    } catch (error) {
      if (error?.code !== 'ENOENT') errors.push(`${filePath}: ${error.message}`);
    }
  }
  for (const { originalPath, backupPath } of [...backups].reverse()) {
    try {
      await fs.mkdir(path.dirname(originalPath), { recursive: true });
      await fs.copyFile(backupPath, originalPath);
    } catch (error) {
      errors.push(`${originalPath}: ${error.message}`);
    }
  }
  return errors;
}

async function checkTechnicalViews(rootPath, groups, sourceEntries) {
  await assertSafeOutputPath(rootPath);
  const stagingRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'tech-spec-check-'));
  try {
    await writeTechnicalViews(stagingRoot, groups);

    const expected = await readMarkdownMap(stagingRoot);
    const actual = await readMarkdownMap(rootPath, { rejectSymlinks: true });
    const allDifferences = diffMarkdownMaps(expected, actual);
    const sourceOccurrences = countValues(sourceEntries.map(annotationOccurrenceKey));
    const expectedOccurrences = projectedOccurrenceCounts(expected);
    const actualOccurrences = projectedOccurrenceCounts(actual);
    const allAnnotationDifferences = [
      ...diffOccurrenceCounts(sourceOccurrences, expectedOccurrences, 'fresh-render'),
      ...diffOccurrenceCounts(sourceOccurrences, actualOccurrences, 'committed-tree'),
    ];

    return {
      status: allDifferences.length === 0 && allAnnotationDifferences.length === 0 ? 'fresh' : 'stale',
      outputRoot: toPosix(path.relative(repoRoot, rootPath)),
      expectedFiles: expected.size,
      actualFiles: actual.size,
      sourceAnnotationOccurrences: totalOccurrences(sourceOccurrences),
      projectedAnnotationOccurrences: totalOccurrences(expectedOccurrences),
      differencesTotal: allDifferences.length,
      annotationDifferencesTotal: allAnnotationDifferences.length,
      differences: allDifferences.slice(0, MAX_REPORTED_DIFFERENCES),
      annotationDifferences: allAnnotationDifferences.slice(0, MAX_REPORTED_DIFFERENCES),
      reportTruncated:
        allDifferences.length > MAX_REPORTED_DIFFERENCES ||
        allAnnotationDifferences.length > MAX_REPORTED_DIFFERENCES,
    };
  } finally {
    await fs.rm(stagingRoot, { recursive: true, force: true });
  }
}

async function readMarkdownMap(rootPath, { rejectSymlinks = false } = {}) {
  const files = await collectFiles(rootPath, { matches: (name) => name.endsWith('.md'), rejectSymlinks });
  const result = new Map();
  for (const filePath of files.sort(compareText)) {
    const relativePath = toPosix(path.relative(rootPath, filePath));
    const content = normalizeGeneratedContent(await fs.readFile(filePath, 'utf8'));
    result.set(relativePath, content);
  }
  return result;
}

function normalizeGeneratedContent(content) {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/Regenerated:\s*\d{4}-\d{2}-\d{2}\./g, 'Regenerated: <DATE>.');
}

function diffMarkdownMaps(expected, actual) {
  const differences = [];
  for (const [relativePath, content] of expected) {
    if (!actual.has(relativePath)) {
      differences.push({ kind: 'missing', path: relativePath });
    } else if (actual.get(relativePath) !== content) {
      differences.push({ kind: 'content', path: relativePath });
    }
  }
  for (const relativePath of actual.keys()) {
    if (!expected.has(relativePath)) {
      differences.push({ kind: 'extra', path: relativePath });
    }
  }
  return differences.sort((a, b) => compareText(a.path, b.path) || compareText(a.kind, b.kind));
}

function annotationOccurrenceKey(entry) {
  return Buffer.from(
    JSON.stringify([entry.relPath, entry.className, entry.methodName, entry.traitName, entry.id]),
    'utf8',
  ).toString('base64url');
}

function countValues(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function projectedOccurrenceCounts(markdownMap) {
  const occurrences = [];
  for (const content of markdownMap.values()) {
    for (const match of content.matchAll(OCCURRENCE_MARKER_PATTERN)) {
      occurrences.push(match[1]);
    }
  }
  return countValues(occurrences);
}

function diffOccurrenceCounts(expected, actual, scope) {
  const differences = [];
  const keys = new Set([...expected.keys(), ...actual.keys()]);
  for (const occurrence of keys) {
    const expectedCount = expected.get(occurrence) ?? 0;
    const actualCount = actual.get(occurrence) ?? 0;
    if (expectedCount !== actualCount) {
      const kind = actualCount < expectedCount ? 'missing' : expectedCount === 0 ? 'extra' : 'duplicate';
      differences.push({ scope, kind, occurrence: describeOccurrence(occurrence), expected: expectedCount, actual: actualCount });
    }
  }
  return differences.sort((a, b) => compareText(JSON.stringify(a.occurrence), JSON.stringify(b.occurrence)));
}

function describeOccurrence(occurrence) {
  try {
    const [sourcePath, className, methodName, traitName, id] = JSON.parse(
      Buffer.from(occurrence, 'base64url').toString('utf8'),
    );
    return { sourcePath, className, methodName, traitName, id };
  } catch {
    return { marker: occurrence };
  }
}

function totalOccurrences(counts) {
  return [...counts.values()].reduce((sum, count) => sum + count, 0);
}

async function writeTechnicalViews(rootPath, groups, { today = new Date().toISOString().slice(0, 10) } = {}) {

  for (const [groupKey, groupEntriesList] of [...groups.entries()].sort(([a], [b]) => compareText(a, b))) {
    const [service, component] = groupKey.split('/');
    const dir = path.join(rootPath, service);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${component}.md`), renderView({ service, component, entries: groupEntriesList, today }), 'utf8');
  }
}

function groupEntries(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = `${entry.service}/${entry.component}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(entry);
  }
  return groups;
}

function renderView({ service, component, entries, today }) {
  const sortedEntries = [...entries].sort(
    (a, b) =>
      compareText(a.operationKind, b.operationKind) ||
      compareText(a.className, b.className) ||
      compareText(a.methodName, b.methodName) ||
      compareText(a.id, b.id),
  );
  const testsByMethod = new Map();
  const idsByTrait = {
    TestSpec: new Set(),
    TechnicalSpec: new Set(),
  };

  for (const entry of sortedEntries) {
    const methodKey = `${entry.className}.${entry.methodName}`;
    if (!testsByMethod.has(methodKey)) {
      testsByMethod.set(methodKey, []);
    }
    testsByMethod.get(methodKey).push(entry);
    idsByTrait[entry.traitName].add(entry.id);
  }

  const operationRows = [...testsByMethod.entries()]
    .sort(([a], [b]) => compareText(a, b))
    .map(([methodKey, methodEntries]) => {
      const first = methodEntries[0];
      const ids = methodEntries.map((entry) => `${entry.traitName}:${entry.id}`).sort(compareText).join('<br>');
      return `| ${first.operationKind} | \`${escapePipe(methodKey)}\` | ${ids} | [Source: test/${first.service}/${first.component}/${slugify(methodKey)}] |`;
    });

  const mapRows = sortedEntries.map(
    (entry) =>
      `| \`${escapePipe(entry.id)}\` | ${entry.traitName} | \`${escapePipe(`${entry.className}.${entry.methodName}`)}\` | [Source: test/${entry.service}/${entry.component}/${slugify(entry.className)}] <!-- tech-spec-annotation-occurrence:${annotationOccurrenceKey(entry)} --> |`,
  );

  const topologyRows = sortedEntries.filter((entry) => /(Event|Message)/.test(entry.operationKind));
  const candidateRows = sortedEntries.filter(isTechnicalCandidate).map(
    (entry) =>
      `| \`${escapePipe(entry.id)}\` | \`${escapePipe(`${entry.className}.${entry.methodName}`)}\` | technical hint: \`${technicalHint(entry)}\` | Convert to \`TechnicalSpec\` only after review; otherwise keep as business \`TestSpec\`. |`,
  );

  return `${DERIVED_BANNER} Source of truth: code and tests under [Source: test/${service}/${component}]. Regenerated: ${today}.

# ${service} / ${component} — Technical View

## 1. Component Boundary

| Field | Value |
| --- | --- |
| Service | \`${service}\` |
| Component | \`${component}\` |
| Annotated tests | ${sortedEntries.length} |
| Business TC joins | ${idsByTrait.TestSpec.size} |
| Technical-only joins | ${idsByTrait.TechnicalSpec.size} |

## 2. Operation Catalog

| Kind | Test surface | Annotation IDs | Anchor |
| --- | --- | --- | --- |
${operationRows.length ? operationRows.join('\n') : '| N/A | No annotated tests found | N/A | N/A |'}

## 3. TC ↔ Test Map

| ID | Annotation | Test | Anchor |
| --- | --- | --- | --- |
${mapRows.length ? mapRows.join('\n') : '| N/A | N/A | No annotated tests found | N/A |'}

## 4. Cross-Service Topology

| Touchpoint | Evidence | Risk |
| --- | --- | --- |
${topologyRows.length ? topologyRows.map((entry) => `| ${entry.operationKind} | \`${escapePipe(`${entry.className}.${entry.methodName}`)}\` | Review source topology if this test changes |`).join('\n') : '| N/A | No event/message annotations detected by this projection | NONE |'}

## 5. Technical Coverage

| Coverage Slice | Count |
| --- | ---: |
| Annotated test methods | ${testsByMethod.size} |
| Business TC join IDs | ${idsByTrait.TestSpec.size} |
| Technical-only IDs | ${idsByTrait.TechnicalSpec.size} |
| Technical-looking business joins for follow-up | ${candidateRows.length} |

## 6. Candidate Follow-Up Report

| ID | Test | Reason | Route |
| --- | --- | --- | --- |
${candidateRows.length ? candidateRows.join('\n') : '| N/A | N/A | No technical-looking business joins detected | N/A |'}
`;
}

function sanitizeSegment(value) {
  const cleaned = value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'General';
}

function slugify(value) {
  return sanitizeSegment(value).toLowerCase();
}

function escapePipe(value) {
  return String(value).replace(/\|/g, '\\|');
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function compareText(a, b) {
  return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' });
}
