#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const DEFAULT_DAYS = 60;
const DEFAULT_OUTPUT_ROOT = path.join('reports', 'developer-performance');
const RECORD_SEPARATOR = '\x1e';
const FIELD_SEPARATOR = '\x1f';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SIGNAL_FILE_CAP = 500;
const SIGNAL_LINE_CAP = 50000;
const BULK_FILE_WARNING_LIMIT = 500;
const BULK_LINE_WARNING_LIMIT = 50000;
const GENERATED_FILE_WARNING_LIMIT = 100;
const DOCS_HEAVY_FILE_FLOOR = 50;
const DOCS_TO_SOURCE_RATIO = 2;
const PATH_CATEGORY_KEYS = ['source', 'test', 'docs', 'config', 'generated'];

// Single source of truth for the heuristic contribution-signal weights. The Methodology
// section in the rendered report interpolates these same values, so code and prose can
// never drift. Retune here only; the golden-value test will flag the change deliberately.
const SIGNAL_WEIGHTS = {
  commit: 2,
  consistency: 1.5,
  breadth: 1.2,
  churn: 0.25,
  qualitySupport: 0.4,
  documentation: 0.2,
  mergeCommit: 0.5,
  integrationConsistency: 1.5,
};

function runGit(args, options = {}) {
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string')) {
    throw new Error('runGit requires an array of string arguments');
  }

  return execFileSync('git', args, {
    cwd: options.cwd || process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 128 * 1024 * 1024,
  });
}

function parseArgs(argv) {
  const result = {
    days: DEFAULT_DAYS,
    includeMerges: true,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected positional argument: ${token}`);
    }

    const equalsIndex = token.indexOf('=');
    const key = equalsIndex === -1 ? token.slice(2) : token.slice(2, equalsIndex);
    const inlineValue = equalsIndex === -1 ? null : token.slice(equalsIndex + 1);

    if (key === 'json') {
      result.json = true;
      continue;
    }

    if (key === 'help') {
      result.help = true;
      continue;
    }

    if (key === 'no-merges') {
      result.includeMerges = false;
      continue;
    }

    const value = inlineValue !== null ? inlineValue : argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    if (inlineValue === null) index += 1;

    if (key === 'branch') result.branch = value;
    else if (key === 'days') result.days = parsePositiveInteger(value, '--days');
    else if (key === 'since') result.since = value;
    else if (key === 'until') result.until = value;
    else if (key === 'out') result.out = value;
    else if (key === 'identity-map') result.identityMap = value;
    else throw new Error(`Unknown option: --${key}`);
  }

  return result;
}

function parsePositiveInteger(value, label) {
  if (!/^\d+$/.test(String(value))) {
    throw new Error(`${label} must be a positive integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function parseDate(value, label) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} must be a valid date`);
  }
  return parsed;
}

function validateBranchName(ref) {
  if (typeof ref !== 'string' || ref.trim() !== ref || ref.length === 0) {
    throw new Error('Branch/ref must be a non-empty trimmed string');
  }
  if (ref.startsWith('-')) {
    throw new Error('Branch/ref must not start with a dash');
  }
  if (/[\0\r\n]/.test(ref)) {
    throw new Error('Branch/ref must not contain control characters');
  }
  if (ref.includes('..') || ref.includes('@{') || ref.includes('\\')) {
    throw new Error('Branch/ref contains an unsafe ref sequence');
  }
  return ref;
}

function refExists(ref, git = runGit, cwd = process.cwd()) {
  validateBranchName(ref);
  try {
    git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { cwd });
    return true;
  } catch (_error) {
    return false;
  }
}

function resolveBranch(explicitBranch, git = runGit, cwd = process.cwd()) {
  if (explicitBranch) {
    const branch = validateBranchName(explicitBranch);
    if (!refExists(branch, git, cwd)) {
      throw new Error(`Branch/ref not found: ${branch}`);
    }
    return branch;
  }

  for (const candidate of ['develop', 'origin/develop', 'main', 'origin/main']) {
    if (refExists(candidate, git, cwd)) return candidate;
  }

  throw new Error('Could not find default branch. Expected develop or main.');
}

function resolveGitRoot(git = runGit, cwd = process.cwd()) {
  return git(['rev-parse', '--show-toplevel'], { cwd }).trim();
}

function buildRunConfig(options = {}, dependencies = {}) {
  const now = dependencies.now ? new Date(dependencies.now) : new Date();
  const cwd = dependencies.cwd || process.cwd();
  const git = dependencies.git || runGit;
  const until = options.until ? parseDate(options.until, '--until') : now;
  const days = options.days || DEFAULT_DAYS;
  const since = options.since ? parseDate(options.since, '--since') : new Date(until.getTime() - days * MS_PER_DAY);

  if (since > until) {
    throw new Error('--since must be before --until');
  }

  const branch = resolveBranch(options.branch, git, cwd);
  const gitRoot = dependencies.gitRoot || resolveGitRoot(git, cwd);
  const outputRoot = resolveOutputRoot(options.out || DEFAULT_OUTPUT_ROOT, gitRoot);
  const identityMapPath = options.identityMap ? path.resolve(gitRoot, options.identityMap) : '';
  const identityMap = dependencies.identityMap || loadIdentityMap(options.identityMap, gitRoot);
  const effectiveDays = Math.max(1, Math.ceil((until.getTime() - since.getTime()) / MS_PER_DAY));
  const runId = `${formatTimestampForPath(now)}-${slugify(branch)}-${effectiveDays}d`;
  const outputDir = path.join(outputRoot, runId);

  return {
    branch,
    since,
    until,
    days: effectiveDays,
    requestedDays: days,
    includeMerges: options.includeMerges !== false,
    gitRoot,
    outputRoot,
    outputDir,
    runId,
    generatedAt: now,
    identityMap,
    identityMapPath,
  };
}

function resolveOutputRoot(outputRoot, gitRoot) {
  const resolved = path.resolve(gitRoot, outputRoot);
  const claudeRoot = path.resolve(gitRoot, '.claude');
  if (isPathInsideOrEqual(resolved, claudeRoot)) {
    throw new Error('Output path must stay outside .claude');
  }
  return resolved;
}

function isPathInsideOrEqual(candidatePath, parentPath) {
  const candidate = path.resolve(candidatePath);
  const parent = path.resolve(parentPath);
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function loadIdentityMap(identityMapPath, gitRoot = process.cwd()) {
  const empty = { byIdentity: new Map(), byEmail: new Map(), entries: [] };
  if (!identityMapPath) return empty;

  const resolved = path.resolve(gitRoot, identityMapPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Identity map not found: ${resolved}`);
  }

  const lines = fs.readFileSync(resolved, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) return empty;

  const firstRow = parseCsvLine(lines[0]);
  const hasHeader = firstRow.some((cell) => ['identity', 'email', 'name', 'displayname', 'id'].includes(cell.toLowerCase()));
  const headers = hasHeader ? firstRow.map((cell) => cell.toLowerCase()) : ['identity', 'displayname', 'id'];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  for (const line of dataLines) {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    const identity = row.identity || row.match || '';
    const email = (row.email || '').trim().toLowerCase();
    const displayName = row.displayname || row.name || row.displayName || '';
    const id = row.id || displayName || identity || email;
    if (!identity && !email) continue;

    const entry = {
      id: slugify(id),
      displayName: displayName || identity || email,
      email,
      identity,
    };
    empty.entries.push(entry);
    if (identity) empty.byIdentity.set(normalizeLookupKey(identity), entry);
    if (email) empty.byEmail.set(email, entry);
  }

  return empty;
}

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function collectCommits(config, git = runGit) {
  const pretty = `%x1e%H%x1f%h%x1f%aN%x1f%aE%x1f%cI%x1f%P%x1f%s`;
  // Deliberately do not use --first-parent. A no-ff merge of a feature branch can
  // contain commits from several authors, and each author must keep their own
  // direct authored contribution instead of giving it to the merge author.
  const args = [
    'log',
    config.branch,
    `--since=${config.since.toISOString()}`,
    `--until=${config.until.toISOString()}`,
    '--date=iso-strict',
    '--use-mailmap',
    `--pretty=format:${pretty}`,
    '--numstat',
  ];

  if (!config.includeMerges) {
    args.splice(2, 0, '--no-merges');
  }

  const raw = git(args, { cwd: config.gitRoot });
  return parseGitLog(raw);
}

function parseGitLog(raw) {
  if (!raw || raw.trim().length === 0) return [];

  return raw
    .split(RECORD_SEPARATOR)
    .map((segment) => segment.replace(/^\r?\n/, ''))
    .filter((segment) => segment.trim().length > 0)
    .map(parseCommitSegment)
    .filter(Boolean);
}

function parseCommitSegment(segment) {
  const lines = segment.split(/\r?\n/);
  const header = lines.shift();
  if (!header) return null;

  const fields = header.split(FIELD_SEPARATOR);
  if (fields.length < 7) return null;

  const subject = fields.slice(6).join(FIELD_SEPARATOR);
  const parents = fields[5] ? fields[5].split(/\s+/).filter(Boolean) : [];
  const files = lines.map(parseNumstatLine).filter(Boolean);
  const isMerge = parents.length > 1;
  const typeInfo = parseCommitType(subject, isMerge);

  return {
    hash: fields[0],
    shortHash: fields[1],
    authorName: fields[2],
    authorEmail: fields[3],
    date: fields[4],
    parents,
    subject,
    isMerge,
    type: typeInfo.type,
    scope: typeInfo.scope,
    description: typeInfo.description,
    files,
  };
}

function parseNumstatLine(line) {
  if (!line || line.trim().length === 0) return null;
  const parts = line.split('\t');
  if (parts.length < 3) return null;

  const additions = parts[0] === '-' ? 0 : Number(parts[0]);
  const deletions = parts[1] === '-' ? 0 : Number(parts[1]);
  const filePath = normalizePath(parts.slice(2).join('\t'));

  return {
    additions: Number.isFinite(additions) ? additions : 0,
    deletions: Number.isFinite(deletions) ? deletions : 0,
    path: filePath,
    category: categorizePath(filePath),
    module: detectModule(filePath),
  };
}

function parseCommitType(subject, isMerge = false) {
  const normalized = normalizeSubject(subject);
  const conventional = normalized.match(/^([a-z][a-z0-9-]*)(?:\(([^)]+)\))?(!)?:\s+(.+)$/i);
  if (conventional) {
    return {
      type: conventional[1].toLowerCase(),
      scope: conventional[2] || '',
      description: conventional[4],
    };
  }

  const bracket = normalized.match(/^\[([A-Za-z][A-Za-z0-9-]*)\]\s+(.+)$/);
  if (bracket) {
    return {
      type: bracket[1].toLowerCase(),
      scope: '',
      description: bracket[2],
    };
  }

  return {
    type: isMerge ? 'merge' : 'other',
    scope: '',
    description: normalized,
  };
}

function normalizeSubject(subject) {
  return String(subject || '')
    .replace(/^Merged PR\s+\d+:\s*/i, '')
    .replace(/^Merge pull request\s+#[0-9]+\s+from\s+\S+\s*/i, '')
    .trim();
}

function normalizePath(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
}

function categorizePath(filePath) {
  const normalized = normalizePath(filePath).toLowerCase();
  const base = path.posix.basename(normalized);

  if (/(^|\/)(node_modules|dist|build|coverage|bin|obj|target|out|vendor)\//.test(normalized)) return 'generated';
  if (/(\.generated\.|\.g\.cs$|\.designer\.cs$|\.min\.(js|css)$)/.test(normalized)) return 'generated';
  if (/(^|\/)(__tests__|tests?|specs?)\//.test(normalized)) return 'test';
  if (/(\.test\.|\.spec\.)/.test(base)) return 'test';
  if (/^docs\//.test(normalized) || /\.(md|mdx|rst|adoc)$/.test(base)) return 'docs';
  if (/^(readme|changelog|license|notice)(\..*)?$/.test(base)) return 'docs';
  if (/(\.ya?ml|\.toml|\.json|\.config|\.props|\.targets|\.editorconfig|\.env\.example)$/.test(base)) return 'config';
  if (/^(package-lock|pnpm-lock|yarn.lock|dockerfile|makefile)$/.test(base)) return 'config';
  return 'source';
}

function detectModule(filePath) {
  const normalized = normalizePath(filePath);
  const parts = normalized.split('/').filter(Boolean);
  return parts.length > 1 ? parts[0] : '(root)';
}

function aggregateCommits(commits, config = {}) {
  const contributorsByKey = new Map();
  const team = createEmptyMetrics();
  const identityMap = config.identityMap || loadIdentityMap();
  const includedCommits = config.includeMerges === false ? commits.filter((commit) => !commit.isMerge) : commits;

  for (const commit of includedCommits) {
    const key = contributorKey(commit, identityMap);
    if (!contributorsByKey.has(key)) {
      contributorsByKey.set(key, createContributor(commit, identityMap));
    }

    const contributor = contributorsByKey.get(key);
    contributor.originalIdentities.add(authorKey(commit));
    updateContributorProfile(contributor, commit, identityMap);
    applyCommitMetrics(contributor, commit);
    applyCommitMetrics(team, commit);
  }

  mergeContributorsByHighConfidenceAliases(contributorsByKey);

  const contributors = Array.from(contributorsByKey.values()).map(finalizeContributor);
  contributors.sort(compareContributors);
  contributors.forEach((contributor, index) => {
    contributor.rank = index + 1;
  });

  const authoredContributors = contributors
    .filter((contributor) => contributor.nonMergeCommits > 0)
    .slice()
    .sort(compareAuthoredContributors);
  authoredContributors.forEach((contributor, index) => {
    contributor.authoredRank = index + 1;
  });

  const integrationContributors = contributors
    .filter((contributor) => contributor.mergeCommits > 0)
    .slice()
    .sort(compareIntegrationContributors);
  integrationContributors.forEach((contributor, index) => {
    contributor.integrationRank = index + 1;
  });

  const finalizedTeam = finalizeMetrics(team);
  const qualityWarnings = collectQualityWarnings(contributors);

  return {
    contributors,
    authoredContributors,
    integrationContributors,
    qualityWarnings,
    team: finalizedTeam,
    commitCount: includedCommits.length,
  };
}

function createEmptyMetrics() {
  return {
    totalCommits: 0,
    mergeCommits: 0,
    nonMergeCommits: 0,
    activeDays: new Set(),
    authoredActiveDays: new Set(),
    integrationActiveDays: new Set(),
    additions: 0,
    deletions: 0,
    filesChanged: 0,
    authoredAdditions: 0,
    authoredDeletions: 0,
    authoredFilesChanged: 0,
    mergeAdditions: 0,
    mergeDeletions: 0,
    mergeFilesChanged: 0,
    pathCategories: createPathCategoryMetrics(),
    authoredPathCategories: createPathCategoryMetrics(),
    mergePathCategories: createPathCategoryMetrics(),
    commitTypes: {},
    modules: {},
    recentCommits: [],
  };
}

function createPathCategoryMetrics() {
  return Object.fromEntries(PATH_CATEGORY_KEYS.map((key) => [key, 0]));
}

function createContributor(commit, identityMap = loadIdentityMap()) {
  const profile = contributorProfile(commit, identityMap);
  return {
    id: profile.id,
    displayName: profile.displayName,
    email: profile.email,
    identity: profile.identity,
    identityKey: profile.identityKey,
    identityKeys: new Set([profile.identityKey]),
    originalIdentities: new Set([authorKey(commit)]),
    identityMapped: profile.identityMapped,
    ...createEmptyMetrics(),
  };
}

function contributorKey(commit, identityMap = loadIdentityMap()) {
  const profile = contributorProfile(commit, identityMap);
  return profile.identityKey;
}

function contributorProfile(commit, identityMap = loadIdentityMap()) {
  const originalIdentity = authorKey(commit);
  const email = String(commit.authorEmail || '').trim().toLowerCase();
  const mapped = findIdentityMapEntry(originalIdentity, email, identityMap);
  if (mapped) {
    const displayName = mapped.displayName || commit.authorName || email || 'Unknown';
    const id = mapped.id || slugify(displayName || email || originalIdentity);
    return {
      id,
      displayName,
      email: mapped.email || email,
      identity: `${displayName} <${mapped.email || email}>`,
      identityKey: `mapped:${id}`,
      identityMapped: true,
    };
  }

  return {
    id: email ? stableContributorIdFromEmail(email, commit.authorName) : stableContributorId(commit),
    displayName: commit.authorName || commit.authorEmail || 'Unknown',
    email: commit.authorEmail || '',
    identity: originalIdentity,
    identityKey: email ? `email:${email}` : originalIdentity,
    identityMapped: false,
  };
}

function updateContributorProfile(contributor, commit, identityMap = loadIdentityMap()) {
  if (contributor.identityMapped) return;

  const profile = contributorProfile(commit, identityMap);
  const email = String(profile.email || contributor.email || '').trim().toLowerCase();
  contributor.email = email || contributor.email;
  contributor.identityKeys.add(profile.identityKey);
  contributor.displayName = choosePreferredDisplayName(contributor.displayName, profile.displayName, email);
  contributor.identity = `${contributor.displayName} <${contributor.email || ''}>`;
}

function mergeContributorsByHighConfidenceAliases(contributorsByKey) {
  let changed = true;
  while (changed) {
    changed = false;
    const entries = Array.from(contributorsByKey.entries());
    for (let leftIndex = 0; leftIndex < entries.length && !changed; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
        const [leftKey, left] = entries[leftIndex];
        const [rightKey, right] = entries[rightIndex];
        if (!shouldAutoMergeContributors(left, right)) continue;

        const [targetKey, sourceKey, target, source] = chooseMergeTarget(leftKey, left, rightKey, right);
        mergeContributorInto(target, source);
        contributorsByKey.set(targetKey, target);
        contributorsByKey.delete(sourceKey);
        changed = true;
        break;
      }
    }
  }
}

function shouldAutoMergeContributors(left, right) {
  if (left.identityMapped || right.identityMapped) return false;
  if (!haveCompatibleEmailDomains(left.email, right.email)) return false;

  const leftAliases = highConfidenceAliases(left);
  const rightAliases = highConfidenceAliases(right);
  // A strong (AD/slash-derived) alias is only trustworthy for a CROSS-email merge when the
  // SAME contributor's email local-part corroborates it. Without this, an AD display name that
  // disagrees with its own email (e.g. `ACME\al.ex.ample` <al@host>) can collide with an
  // unrelated person who merely shares the collapsed name tokens (`alex.ample@host`) on the same
  // domain — silently fusing two distinct people and corrupting attribution. Same-email identities
  // are already consolidated upstream via the `email:` contributor key, so this gate never blocks them.
  const leftStrong = corroborateAliasesWithEmail(leftAliases.strong, left.email);
  const rightStrong = corroborateAliasesWithEmail(rightAliases.strong, right.email);
  return hasAliasIntersection(leftStrong, rightAliases.weak)
    || hasAliasIntersection(rightStrong, leftAliases.weak);
}

function corroborateAliasesWithEmail(strongAliases, email) {
  if (strongAliases.size === 0) return strongAliases;
  const emailLocalPart = String(email || '').split('@')[0];
  const emailAliases = new Set(displayAliasVariants(emailLocalPart, { allowTwoToken: true }));
  const corroborated = new Set();
  for (const alias of strongAliases) {
    if (emailAliases.has(alias)) corroborated.add(alias);
  }
  return corroborated;
}

function chooseMergeTarget(leftKey, left, rightKey, right) {
  const leftScore = displayNameScore(left.displayName, left.email);
  const rightScore = displayNameScore(right.displayName, right.email);
  if (rightScore > leftScore) return [rightKey, leftKey, right, left];
  return [leftKey, rightKey, left, right];
}

function mergeContributorInto(target, source) {
  target.totalCommits += source.totalCommits;
  target.mergeCommits += source.mergeCommits;
  target.nonMergeCommits += source.nonMergeCommits;
  addSetValues(target.activeDays, source.activeDays);
  addSetValues(target.authoredActiveDays, source.authoredActiveDays);
  addSetValues(target.integrationActiveDays, source.integrationActiveDays);
  target.additions += source.additions;
  target.deletions += source.deletions;
  target.filesChanged += source.filesChanged;
  target.authoredAdditions += source.authoredAdditions;
  target.authoredDeletions += source.authoredDeletions;
  target.authoredFilesChanged += source.authoredFilesChanged;
  target.mergeAdditions += source.mergeAdditions;
  target.mergeDeletions += source.mergeDeletions;
  target.mergeFilesChanged += source.mergeFilesChanged;
  mergeNumberObject(target.pathCategories, source.pathCategories);
  mergeNumberObject(target.authoredPathCategories, source.authoredPathCategories);
  mergeNumberObject(target.mergePathCategories, source.mergePathCategories);
  mergeNumberObject(target.commitTypes, source.commitTypes);
  mergeNumberObject(target.modules, source.modules);
  target.recentCommits.push(...source.recentCommits);
  addSetValues(target.identityKeys, source.identityKeys);
  addSetValues(target.originalIdentities, source.originalIdentities);

  const preferredName = choosePreferredDisplayName(target.displayName, source.displayName, source.email || target.email);
  if (preferredName === source.displayName && source.email) target.email = source.email;
  target.displayName = preferredName;
  target.identity = `${target.displayName} <${target.email || ''}>`;
  if (target.email) target.id = stableContributorIdFromEmail(target.email, target.displayName);
}

function addSetValues(target, source) {
  for (const value of source || []) target.add(value);
}

function mergeNumberObject(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    target[key] = (target[key] || 0) + value;
  }
}

function findIdentityMapEntry(identity, email, identityMap = loadIdentityMap()) {
  if (identityMap.byIdentity?.has(normalizeLookupKey(identity))) return identityMap.byIdentity.get(normalizeLookupKey(identity));
  if (email && identityMap.byEmail?.has(email)) return identityMap.byEmail.get(email);
  return null;
}

function authorKey(commit) {
  const name = String(commit.authorName || 'Unknown').trim();
  const email = String(commit.authorEmail || '').trim().toLowerCase();
  return `${name} <${email}>`;
}

function stableContributorId(commit) {
  const hash = crypto.createHash('sha1').update(authorKey(commit)).digest('hex').slice(0, 10);
  return `${slugify(commit.authorName || 'developer')}-${hash}`.replace(/^-+|-+$/g, '') || `developer-${hash}`;
}

function stableContributorIdFromEmail(email, fallbackName = 'developer') {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const hash = crypto.createHash('sha1').update(normalizedEmail).digest('hex').slice(0, 10);
  const localPart = normalizedEmail.split('@')[0] || fallbackName || 'developer';
  return `${slugify(localPart)}-${hash}`.replace(/^-+|-+$/g, '') || `developer-${hash}`;
}

function choosePreferredDisplayName(currentName, candidateName, email = '') {
  const current = String(currentName || '').trim();
  const candidate = String(candidateName || '').trim();
  if (!current) return candidate || email || 'Unknown';
  if (!candidate) return current;

  const currentScore = displayNameScore(current, email);
  const candidateScore = displayNameScore(candidate, email);
  if (candidateScore !== currentScore) return candidateScore > currentScore ? candidate : current;
  return candidate.length > current.length ? candidate : current;
}

function displayNameScore(name, email = '') {
  const value = String(name || '').trim();
  if (!value) return 0;

  const visible = value.includes('<') ? value.split('<')[0].trim() : value;
  const normalized = normalizeIdentityName(visible);
  const tokens = visible
    .replace(/[\\/]/g, ' ')
    .split(/[\s._-]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  let score = Math.min(visible.length, 40);
  if (!visible.includes('\\') && !visible.includes('/')) score += 30;
  if (tokens.length > 1) score += 10;
  score += Math.min(tokens.length, 5) * 5;

  const emailTokens = String(email || '')
    .split('@')[0]
    .split(/[._-]+/)
    .map((token) => normalizeIdentityName(token))
    .filter(Boolean);
  let cursor = 0;
  for (const token of emailTokens) {
    const index = normalized.indexOf(token, cursor);
    if (index >= 0) {
      score += 8;
      cursor = index + token.length;
    } else if (normalized.includes(token)) {
      score += 3;
    }
  }

  return score;
}

function highConfidenceAliases(contributor) {
  const strong = new Set();
  const weak = new Set();
  const names = [contributor.displayName, ...(contributor.originalIdentities || [])];

  for (const name of names) {
    const visible = String(name || '').split('<')[0].trim();
    if (!visible) continue;
    const local = visible.includes('\\') || visible.includes('/')
      ? visible.split(/[\\/]/).pop()
      : '';
    if (local) {
      for (const alias of displayAliasVariants(local, { allowTwoToken: true })) strong.add(alias);
      continue;
    }

    for (const alias of displayAliasVariants(visible, { allowTwoToken: false })) weak.add(alias);
  }

  strong.delete('');
  weak.delete('');
  return { strong, weak };
}

function displayAliasVariants(value, { allowTwoToken }) {
  const tokens = String(value || '')
    .replace(/[\\/]/g, ' ')
    .split(/[\s._-]+/)
    .map((token) => normalizeIdentityName(token))
    .filter(Boolean);

  if (tokens.length < 2) return [];
  if (!allowTwoToken && tokens.length < 3) return [];
  return [...new Set([
    tokens.join(''),
    `${tokens[0]}${tokens.slice(1).join('')}`,
  ])];
}

function hasAliasIntersection(leftAliases, rightAliases) {
  for (const alias of leftAliases) {
    if (rightAliases.has(alias)) return true;
  }
  return false;
}

function haveCompatibleEmailDomains(leftEmail, rightEmail) {
  const leftDomain = String(leftEmail || '').split('@')[1] || '';
  const rightDomain = String(rightEmail || '').split('@')[1] || '';
  return !leftDomain || !rightDomain || leftDomain === rightDomain;
}

function applyCommitMetrics(target, commit) {
  target.totalCommits += 1;
  if (commit.isMerge) target.mergeCommits += 1;
  else target.nonMergeCommits += 1;
  const activeDay = commit.date.slice(0, 10);
  target.activeDays.add(activeDay);
  if (commit.isMerge) target.integrationActiveDays.add(activeDay);
  else target.authoredActiveDays.add(activeDay);
  target.commitTypes[commit.type] = (target.commitTypes[commit.type] || 0) + 1;

  let additions = 0;
  let deletions = 0;
  const scopedPathCategories = commit.isMerge ? target.mergePathCategories : target.authoredPathCategories;
  for (const file of commit.files) {
    additions += file.additions;
    deletions += file.deletions;
    target.filesChanged += 1;
    target.pathCategories[file.category] = (target.pathCategories[file.category] || 0) + 1;
    scopedPathCategories[file.category] = (scopedPathCategories[file.category] || 0) + 1;
    target.modules[file.module] = (target.modules[file.module] || 0) + 1;
  }
  target.additions += additions;
  target.deletions += deletions;
  if (commit.isMerge) {
    target.mergeAdditions += additions;
    target.mergeDeletions += deletions;
    target.mergeFilesChanged += commit.files.length;
  } else {
    target.authoredAdditions += additions;
    target.authoredDeletions += deletions;
    target.authoredFilesChanged += commit.files.length;
  }

  target.recentCommits.push({
    hash: commit.shortHash,
    date: commit.date,
    subject: commit.subject,
    type: commit.type,
    additions,
    deletions,
    filesChanged: commit.files.length,
  });
}

function finalizeContributor(contributor) {
  const finalized = finalizeMetrics(contributor);
  finalized.identityKeys = Array.from(contributor.identityKeys || [contributor.identityKey]).sort();
  finalized.originalIdentities = Array.from(contributor.originalIdentities || []).sort();
  finalized.authoredContributionSignal = calculateAuthoredContributionSignal(finalized);
  finalized.integrationSignal = calculateIntegrationSignal(finalized);
  finalized.qualityWarnings = collectContributorWarnings(finalized);
  finalized.reportFile = path.join('developers', `${finalized.id}.md`).replace(/\\/g, '/');
  return finalized;
}

function finalizeMetrics(metrics) {
  const activeDayCount = metrics.activeDays instanceof Set ? metrics.activeDays.size : metrics.activeDays;
  const authoredActiveDayCount = metrics.authoredActiveDays instanceof Set ? metrics.authoredActiveDays.size : metrics.authoredActiveDays;
  const integrationActiveDayCount = metrics.integrationActiveDays instanceof Set ? metrics.integrationActiveDays.size : metrics.integrationActiveDays;
  const totalLinesChanged = metrics.additions + metrics.deletions;
  const authoredTotalLinesChanged = metrics.authoredAdditions + metrics.authoredDeletions;
  const mergeTotalLinesChanged = metrics.mergeAdditions + metrics.mergeDeletions;
  return {
    ...metrics,
    activeDays: activeDayCount,
    authoredActiveDays: authoredActiveDayCount,
    integrationActiveDays: integrationActiveDayCount,
    totalLinesChanged,
    authoredTotalLinesChanged,
    mergeTotalLinesChanged,
    pathCategories: sortObjectByValue(metrics.pathCategories),
    authoredPathCategories: sortObjectByValue(metrics.authoredPathCategories),
    mergePathCategories: sortObjectByValue(metrics.mergePathCategories),
    commitTypes: sortObjectByValue(metrics.commitTypes),
    modules: sortObjectByValue(metrics.modules),
    recentCommits: metrics.recentCommits
      .slice()
      .sort((left, right) => String(right.date).localeCompare(String(left.date)))
      .slice(0, 12),
  };
}

function calculateAuthoredContributionSignal(metrics) {
  if (metrics.nonMergeCommits === 0) return 0;
  const authoredPathCategories = metrics.authoredPathCategories || metrics.pathCategories || {};
  const authoredFilesChanged = metrics.authoredFilesChanged ?? metrics.filesChanged;
  const authoredTotalLinesChanged = metrics.authoredTotalLinesChanged ?? metrics.totalLinesChanged;
  const codeSignal = metrics.nonMergeCommits * SIGNAL_WEIGHTS.commit;
  const consistencySignal = metrics.authoredActiveDays * SIGNAL_WEIGHTS.consistency;
  const breadthSignal = Math.sqrt(Math.min(authoredFilesChanged, SIGNAL_FILE_CAP)) * SIGNAL_WEIGHTS.breadth;
  const churnSignal = Math.sqrt(Math.min(authoredTotalLinesChanged, SIGNAL_LINE_CAP)) * SIGNAL_WEIGHTS.churn;
  const qualitySupportSignal = Math.min(authoredPathCategories.test || 0, metrics.nonMergeCommits) * SIGNAL_WEIGHTS.qualitySupport;
  const documentationSignal = Math.min(authoredPathCategories.docs || 0, metrics.nonMergeCommits) * SIGNAL_WEIGHTS.documentation;
  return round2(codeSignal + consistencySignal + breadthSignal + churnSignal + qualitySupportSignal + documentationSignal);
}

function calculateIntegrationSignal(metrics) {
  if (metrics.mergeCommits === 0) return 0;
  return round2(metrics.mergeCommits * SIGNAL_WEIGHTS.mergeCommit + metrics.integrationActiveDays * SIGNAL_WEIGHTS.integrationConsistency);
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function compareContributors(left, right) {
  return compareAuthoredContributors(left, right) || compareIntegrationContributors(left, right);
}

function compareAuthoredContributors(left, right) {
  if (right.authoredContributionSignal !== left.authoredContributionSignal) {
    return right.authoredContributionSignal - left.authoredContributionSignal;
  }
  if (right.nonMergeCommits !== left.nonMergeCommits) return right.nonMergeCommits - left.nonMergeCommits;
  return left.displayName.localeCompare(right.displayName);
}

function compareIntegrationContributors(left, right) {
  if (right.integrationSignal !== left.integrationSignal) return right.integrationSignal - left.integrationSignal;
  if (right.mergeCommits !== left.mergeCommits) return right.mergeCommits - left.mergeCommits;
  return left.displayName.localeCompare(right.displayName);
}

function collectQualityWarnings(contributors) {
  return [
    ...detectIdentityWarnings(contributors),
    ...contributors.flatMap(collectContributorWarnings),
  ];
}

function collectContributorWarnings(contributor) {
  const warnings = [];
  if (contributor.filesChanged > BULK_FILE_WARNING_LIMIT) {
    warnings.push({
      code: 'bulk-files',
      contributorId: contributor.id,
      contributor: contributor.displayName,
      message: `${contributor.filesChanged} files changed; inspect for bulk or generated changes before comparing people.`,
    });
  }
  if (contributor.totalLinesChanged > BULK_LINE_WARNING_LIMIT) {
    warnings.push({
      code: 'bulk-lines',
      contributorId: contributor.id,
      contributor: contributor.displayName,
      message: `${contributor.totalLinesChanged} lines changed; line churn is capped in the signal and needs review.`,
    });
  }
  if ((contributor.pathCategories.generated || 0) > GENERATED_FILE_WARNING_LIMIT) {
    warnings.push({
      code: 'generated-heavy',
      contributorId: contributor.id,
      contributor: contributor.displayName,
      message: `${contributor.pathCategories.generated} generated/vendor files changed; do not compare this directly with authored source work.`,
    });
  }
  if ((contributor.pathCategories.docs || 0) > DOCS_HEAVY_FILE_FLOOR && (contributor.pathCategories.docs || 0) > (contributor.pathCategories.source || 0) * DOCS_TO_SOURCE_RATIO) {
    warnings.push({
      code: 'docs-heavy',
      contributorId: contributor.id,
      contributor: contributor.displayName,
      message: `${contributor.pathCategories.docs} documentation files changed versus ${contributor.pathCategories.source || 0} source files; review context before ranking.`,
    });
  }
  return warnings;
}

function detectIdentityWarnings(contributors) {
  const warnings = [];
  for (let leftIndex = 0; leftIndex < contributors.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < contributors.length; rightIndex += 1) {
      const left = contributors[leftIndex];
      const right = contributors[rightIndex];
      if (left.identityMapped || right.identityMapped) continue;
      if (haveOverlappingAliases(identityAliases(left), identityAliases(right))) {
        warnings.push({
          code: 'possible-duplicate-identity',
          contributorId: left.id,
          contributor: left.displayName,
          relatedContributorId: right.id,
          relatedContributor: right.displayName,
          message: `Possible duplicate identities: ${left.displayName} and ${right.displayName}. Use --identity-map if these are the same person.`,
        });
      }
    }
  }
  return warnings;
}

function identityAliases(contributor) {
  const aliases = new Set();
  const names = [contributor.displayName, ...(contributor.originalIdentities || [])];
  for (const name of names) {
    const visible = String(name || '').split('<')[0].trim();
    aliases.add(normalizeIdentityName(visible));
    if (visible.includes('\\')) aliases.add(normalizeIdentityName(visible.split('\\').pop()));
    if (visible.includes('/')) aliases.add(normalizeIdentityName(visible.split('/').pop()));
  }
  if (contributor.email) aliases.add(normalizeIdentityName(contributor.email.split('@')[0]));
  aliases.delete('');
  return aliases;
}

function haveOverlappingAliases(leftAliases, rightAliases) {
  for (const alias of leftAliases) {
    if (rightAliases.has(alias)) return true;
  }
  return false;
}

function normalizeLookupKey(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeIdentityName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function sortObjectByValue(valueObject) {
  return Object.fromEntries(Object.entries(valueObject).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function generateReport(options = {}, dependencies = {}) {
  const config = buildRunConfig(options, dependencies);
  const git = dependencies.git || runGit;
  const commits = collectCommits(config, git);
  const aggregates = aggregateCommits(commits, { includeMerges: config.includeMerges, identityMap: config.identityMap });
  const result = writeReports({ config, commits, aggregates });
  return {
    ...result,
    config: serializeConfig(config),
    contributors: aggregates.contributors.length,
    commits: aggregates.commitCount,
  };
}

function writeReports({ config, commits, aggregates }) {
  fs.mkdirSync(config.outputDir, { recursive: true });
  fs.mkdirSync(path.join(config.outputDir, 'developers'), { recursive: true });
  fs.mkdirSync(path.join(config.outputDir, 'work-packets'), { recursive: true });
  fs.mkdirSync(path.join(config.outputDir, 'analysis'), { recursive: true });
  fs.mkdirSync(path.join(config.outputDir, 'data'), { recursive: true });

  const metadata = serializeConfig(config);
  const summaryPath = path.join(config.outputDir, 'summary.md');
  const analysisPlanPath = path.join(config.outputDir, 'analysis-plan.md');
  const contributorsCsvPath = path.join(config.outputDir, 'contributors.csv');
  const commitsCsvPath = path.join(config.outputDir, 'commits.csv');
  const commitsJsonPath = path.join(config.outputDir, 'data', 'commits.json');
  const contributorsJsonPath = path.join(config.outputDir, 'data', 'contributors.json');
  const qualityWarningsJsonPath = path.join(config.outputDir, 'data', 'quality-warnings.json');
  const commitsByContributor = groupCommitsByContributor(commits, config.identityMap);

  fs.writeFileSync(summaryPath, renderSummaryMarkdown({ metadata, aggregates }), 'utf8');
  fs.writeFileSync(analysisPlanPath, renderAnalysisPlanMarkdown({ metadata, aggregates }), 'utf8');
  fs.writeFileSync(contributorsCsvPath, renderContributorsCsv(aggregates.contributors), 'utf8');
  fs.writeFileSync(commitsCsvPath, renderCommitsCsv(commits), 'utf8');
  fs.writeFileSync(commitsJsonPath, `${JSON.stringify(commits, null, 2)}\n`, 'utf8');
  fs.writeFileSync(contributorsJsonPath, `${JSON.stringify(aggregates.contributors, null, 2)}\n`, 'utf8');
  fs.writeFileSync(qualityWarningsJsonPath, `${JSON.stringify(aggregates.qualityWarnings, null, 2)}\n`, 'utf8');

  for (const contributor of aggregates.contributors) {
    fs.writeFileSync(
      path.join(config.outputDir, contributor.reportFile),
      renderDeveloperMarkdown({ metadata, contributor }),
      'utf8',
    );
    fs.writeFileSync(
      path.join(config.outputDir, 'work-packets', `${contributor.id}.md`),
      renderWorkPacketMarkdown({ metadata, contributor, commits: commitsForContributor(commitsByContributor, contributor) }),
      'utf8',
    );
  }

  fs.writeFileSync(path.join(config.outputDir, 'analysis', 'README.md'), renderAnalysisReadmeMarkdown({ metadata }), 'utf8');

  return {
    outputDir: config.outputDir,
    summaryPath,
    analysisPlanPath,
    contributorsCsvPath,
    commitsCsvPath,
  };
}

function serializeConfig(config) {
  return {
    branch: config.branch,
    since: config.since.toISOString(),
    until: config.until.toISOString(),
    days: config.days,
    generatedAt: config.generatedAt.toISOString(),
    gitRoot: config.gitRoot,
    outputDir: config.outputDir,
    includeMerges: config.includeMerges,
    identityMapPath: config.identityMapPath,
  };
}

function groupCommitsByContributor(commits, identityMap = loadIdentityMap()) {
  const grouped = new Map();
  for (const commit of commits) {
    const key = contributorKey(commit, identityMap);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(commit);
  }
  for (const entries of grouped.values()) {
    entries.sort((left, right) => String(right.date).localeCompare(String(left.date)));
  }
  return grouped;
}

function commitsForContributor(commitsByContributor, contributor) {
  const commits = [];
  for (const key of contributor.identityKeys || [contributor.identityKey]) {
    commits.push(...(commitsByContributor.get(key) || []));
  }
  return commits.sort((left, right) => String(right.date).localeCompare(String(left.date)));
}

function renderAnalysisPlanMarkdown({ metadata, aggregates }) {
  const lines = [];
  lines.push('# Developer Quality Work Analysis Plan');
  lines.push('');
  lines.push('## Goal');
  lines.push('');
  lines.push('Plan and generate a developer performance quality-work report from local git history. The report must synthesize contributed value, direct commits, merge/admin commits, story point estimates, no-AI man-day estimates, AI-assisted man-day estimates, bug-fix contribution, refactor contribution, feature/change contribution, and code-quality impact.');
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push(`- Branch: \`${escapeMarkdown(metadata.branch)}\``);
  lines.push(`- Period: ${escapeMarkdown(metadata.since)} to ${escapeMarkdown(metadata.until)} (${metadata.days} days)`);
  lines.push(`- Distinct contributors: ${aggregates.contributors.length} (identity map, normalized email, then high-confidence aliases)`);
  lines.push(`- Generated work packets: ${aggregates.contributors.length}`);
  lines.push('- Source: local git history only; no external trackers or story systems.');
  lines.push('');
  lines.push('## Execution Protocol');
  lines.push('');
  lines.push('1. Create one todo task per contributor before analysis starts.');
  lines.push('2. If there are more than four contributors, split tasks into batches or subagents. Each subagent owns a disjoint contributor list.');
  lines.push('3. For each contributor, read the work packet and inspect representative commits with `git show --stat --find-renames <hash>` and, when needed, `git show --patch --find-renames <hash>`.');
  lines.push('4. For no-ff feature-branch merges with multiple authors, attribute implementation to each developer\'s own direct commits. The merge author gets integration/admin signal, not the feature branch implementation credit.');
  lines.push('5. Synthesize each contributor\'s direct authored work as one giant commit, then split it into work clusters by intent, module, date proximity, and commit subject. Estimate story points per atomic cluster from direct authored diffs first.');
  lines.push('6. Treat zero-file merge/admin commits as integration signal only; do not add them to implementation SP.');
  lines.push('7. Discount generated files, EF designer snapshots, docs/spec output, i18n sorting, lockfiles, and repeated follow-up churn before estimating.');
  lines.push('8. Estimate both `man_days_traditional` (no AI: 3-5yr dev, 6 productive hours/day) and `man_days_ai` (AI coding assistant with project context, speedup, and review overhead).');
  lines.push('9. Separate product/domain delivery, platform/tooling work, docs/generated churn, and merge/admin integration before producing team velocity totals.');
  lines.push('10. Run a velocity sanity check against active days and the selected period; if it fails, persist a recheck file under `analysis/` before finalizing.');
  lines.push('11. Evaluate code-quality impact: tests, bug fixes, refactors, risk reduction, maintainability, generated/bulk changes, and risky churn.');
  lines.push('12. Write per-contributor synthesis files under `analysis/`, then write `quality-work-summary.md` and `evidence-proof.md`.');
  lines.push('');
  lines.push('## Estimation Rubric');
  lines.push('');
  lines.push('- 1 SP: small isolated change, docs tweak, simple config, or narrow fix.');
  lines.push('- 2 SP: small feature/fix touching a few files with low coupling.');
  lines.push('- 3 SP: moderate change, multiple files/modules, clear business value, tests or migration considerations.');
  lines.push('- 5 SP: complex change, cross-module behavior, significant refactor, non-trivial bug investigation, or broad UI/API work.');
  lines.push('- 8 SP: large feature or risky refactor spanning several modules with integration/test impact.');
  lines.push('- 13 SP: very large or ambiguous work; split into smaller clusters if possible.');
  lines.push('- Displayed theme totals above 13 SP must be sums of atomic 1/2/3/5/8/13 clusters, not one unsplit story.');
  lines.push('- Man-days: report no-AI and AI-assisted ranges separately. AI assumes an AI coding assistant with project context; apply SP-based speedup with review overhead.');
  lines.push('- Anti-inflation: raw churn, generated code, docs/specs, i18n sorting, lockfiles, and zero-change merge/admin commits must not inflate implementation SP.');
  lines.push('');
  lines.push('## Contributor Tasks');
  lines.push('');
  for (const contributor of aggregates.contributors) {
    lines.push(`- [ ] GDP-DEV-${String(contributor.rank).padStart(3, '0')} Analyze ${escapeMarkdown(contributor.displayName)} using [work packet](work-packets/${contributor.id}.md); output analysis/${contributor.id}.md`);
  }
  lines.push('');
  lines.push('## Final Report Tasks');
  lines.push('');
  lines.push('- [ ] Synthesize per-contributor value and quality findings into `quality-work-summary.md` and `evidence-proof.md`.');
  lines.push('- [ ] Include distinct contributor count, total estimated story points, total no-AI man-days, total AI-assisted man-days, and confidence.');
  lines.push('- [ ] Separate direct authored work from merge/admin integration work.');
  lines.push('- [ ] Include velocity sanity notes for high estimates relative to active days or selected period.');
  lines.push('- [ ] Flag identity, bulk-change, generated-code, and low-confidence caveats.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderAnalysisReadmeMarkdown({ metadata }) {
  return [
    '# Analysis Output Directory',
    '',
    'Write per-contributor AI synthesis reports here after reading `../analysis-plan.md` and `../work-packets/*.md`.',
    '',
    `Scope: ${metadata.branch}, ${metadata.since} to ${metadata.until}.`,
    '',
    'Each report should include: giant-commit synthesis, contributed value, work clusters, estimated story points, no-AI man-days, AI-assisted man-days, code-quality impact, risks, evidence commit hashes, discounted churn, and velocity sanity notes.',
    '',
  ].join('\n');
}

function renderWorkPacketMarkdown({ metadata, contributor, commits }) {
  const lines = [];
  const authoredCommits = commits.filter((commit) => !commit.isMerge);
  const mergeCommits = commits.filter((commit) => commit.isMerge);
  const modules = summarizeCommitModules(commits);
  const types = summarizeCommitTypes(commits);
  const topPaths = summarizeChangedPaths(commits, 30);

  lines.push(`# Work Packet: ${escapeMarkdown(contributor.displayName)}`);
  lines.push('');
  lines.push('## Goal');
  lines.push('');
  lines.push('Read and synthesize this contributor work into value, estimated story points, no-AI man-days, AI-assisted man-days, and code-quality impact. This packet is evidence for AI analysis, not the final verdict.');
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push(`- Branch: \`${escapeMarkdown(metadata.branch)}\``);
  lines.push(`- Period: ${escapeMarkdown(metadata.since)} to ${escapeMarkdown(metadata.until)} (${metadata.days} days)`);
  lines.push(`- Contributor identity: ${escapeMarkdown(contributor.identity)}`);
  lines.push(`- Commits: ${contributor.totalCommits} (${authoredCommits.length} authored, ${mergeCommits.length} merge/admin)`);
  lines.push(`- Lines changed: +${contributor.additions} / -${contributor.deletions}`);
  lines.push(`- Authored lines changed: +${contributor.authoredAdditions} / -${contributor.authoredDeletions}`);
  lines.push(`- Merge/admin lines changed: +${contributor.mergeAdditions} / -${contributor.mergeDeletions}`);
  lines.push(`- Files changed: ${contributor.filesChanged}`);
  lines.push(`- Authored files changed: ${contributor.authoredFilesChanged}`);
  lines.push(`- Merge/admin files changed: ${contributor.mergeFilesChanged}`);
  lines.push('');
  lines.push('## Required Analysis Tasks');
  lines.push('');
  lines.push('- [ ] Inspect direct authored commits and merge/admin commits separately.');
  lines.push('- [ ] For shared feature branches, attribute implementation to each developer\'s own direct authored commits, not to the merge author or PR owner.');
  lines.push('- [ ] Synthesize all direct authored commits as one giant commit before estimating.');
  lines.push('- [ ] Cluster commits into work clusters by intent, module, and date proximity.');
  lines.push('- [ ] Estimate story points, no-AI man-days, and AI-assisted man-days for each work cluster.');
  lines.push('- [ ] Treat zero-file merge/admin commits as integration signal only, not implementation SP.');
  lines.push('- [ ] Discount generated/docs/i18n/lockfile/migration-designer churn and repeated follow-up commits.');
  lines.push('- [ ] Synthesize contributed value: feature/change, bug fix, refactor, testing/docs, and operational/integration value.');
  lines.push('- [ ] Evaluate code-quality impact: maintainability, tests, risk, generated/bulk changes, and risky churn.');
  lines.push('- [ ] Cite commit hashes and paths as evidence. State confidence and caveats.');
  lines.push('');
  lines.push('## Estimation Guidance');
  lines.push('');
  lines.push('Use 1/2/3/5/8/13 story points per work cluster. Prefer small clusters over one inflated estimate. Report `man_days_traditional` as no-AI baseline and `man_days_ai` as AI-coding-assistant/project-context estimate with review overhead.');
  lines.push('');
  lines.push('## Quality Warnings');
  lines.push('');
  if (contributor.qualityWarnings.length === 0) lines.push('- None detected by heuristic checks.');
  else contributor.qualityWarnings.forEach((warning) => lines.push(`- ${escapeMarkdown(warning.message)}`));
  lines.push('');
  lines.push('## Module Mix');
  lines.push('');
  lines.push(renderKeyValueTable(modules, 'Module', 'Changed files'));
  lines.push('');
  lines.push('## Commit Type Mix');
  lines.push('');
  lines.push(renderKeyValueTable(types, 'Type', 'Commits'));
  lines.push('');
  lines.push('## Top Changed Paths');
  lines.push('');
  lines.push('| Files | Path |');
  lines.push('| ---: | --- |');
  topPaths.forEach(([filePath, count]) => lines.push(`| ${count} | ${escapeTable(filePath)} |`));
  if (topPaths.length === 0) lines.push('| 0 | No changed paths in numstat, usually merge-only commits |');
  lines.push('');
  lines.push('## Direct Authored Commits');
  lines.push('');
  lines.push(renderCommitEvidenceTable(authoredCommits));
  lines.push('');
  lines.push('## Merge/Admin Commits');
  lines.push('');
  lines.push(renderCommitEvidenceTable(mergeCommits));
  lines.push('');
  lines.push('## Suggested Inspection Commands');
  lines.push('');
  lines.push('Run these selectively for high-impact or ambiguous commits:');
  lines.push('');
  lines.push('```bash');
  lines.push('git show --stat --find-renames <hash>');
  lines.push('git show --patch --find-renames <hash>');
  lines.push('```');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderCommitEvidenceTable(commits) {
  const lines = [];
  lines.push('| Date | Hash | Type | Files | Lines +/- | Primary modules | Subject |');
  lines.push('| --- | --- | --- | ---: | ---: | --- | --- |');
  for (const commit of commits) {
    const totals = commitTotals(commit);
    lines.push(`| ${escapeTable(commit.date.slice(0, 10))} | \`${escapeTable(commit.shortHash)}\` | ${escapeTable(commit.type)} | ${totals.filesChanged} | +${totals.additions} / -${totals.deletions} | ${escapeTable(totals.modules.join('; ') || '-')} | ${escapeTable(commit.subject)} |`);
  }
  if (commits.length === 0) lines.push('| - | - | - | 0 | 0 | - | No commits |');
  return lines.join('\n');
}

function summarizeCommitModules(commits) {
  const modules = {};
  for (const commit of commits) {
    for (const file of commit.files) modules[file.module] = (modules[file.module] || 0) + 1;
  }
  return sortObjectByValue(modules);
}

function summarizeCommitTypes(commits) {
  const types = {};
  for (const commit of commits) types[commit.type] = (types[commit.type] || 0) + 1;
  return sortObjectByValue(types);
}

function summarizeChangedPaths(commits, limit) {
  const paths = {};
  for (const commit of commits) {
    for (const file of commit.files) paths[file.path] = (paths[file.path] || 0) + 1;
  }
  return Object.entries(paths).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, limit);
}

function commitTotals(commit) {
  const additions = commit.files.reduce((total, file) => total + file.additions, 0);
  const deletions = commit.files.reduce((total, file) => total + file.deletions, 0);
  const modules = Array.from(new Set(commit.files.map((file) => file.module))).slice(0, 5);
  return {
    additions,
    deletions,
    filesChanged: commit.files.length,
    modules,
  };
}

function renderSummaryMarkdown({ metadata, aggregates }) {
  const lines = [];
  lines.push('# Git Contribution Report');
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push(`- Branch: \`${escapeMarkdown(metadata.branch)}\``);
  lines.push(`- Period: ${escapeMarkdown(metadata.since)} to ${escapeMarkdown(metadata.until)} (${metadata.days} days)`);
  lines.push(`- Generated: ${escapeMarkdown(metadata.generatedAt)}`);
  lines.push('- Source: local git history only');
  if (metadata.identityMapPath) lines.push(`- Identity map: ${escapeMarkdown(metadata.identityMapPath)}`);
  lines.push('');
  lines.push('## Important Interpretation');
  lines.push('');
  lines.push('This is a git contribution evidence report, not a standalone performance review. The primary sort uses authored non-merge commits only. Merge-only integration or release administration activity is reported separately so it is not compared directly with authored implementation work.');
  lines.push('');
  lines.push('For no-ff feature-branch merges, the script traverses full branch history rather than first-parent history. When several developers contributed commits to the same feature branch, implementation credit belongs to each direct commit author; the merge author receives integration/admin signal only unless explicit conflict-resolution changes are inspected separately.');
  lines.push('');
  lines.push('Contributor grouping uses explicit `--identity-map` entries first, then normalized author email, then conservative high-confidence aliases such as `DOMAIN\\first.lastpart` matching a three-token full name on the same email domain. Display-name-only similarity remains a warning because different people can share similar names.');
  lines.push('');
  lines.push('Do not use this report alone for HR, compensation, or promotion decisions. It does not measure task difficulty, review quality, pairing, mentoring, incident support, design work, or other work not visible in local git history.');
  lines.push('');
  lines.push('## Team Summary');
  lines.push('');
  lines.push(`- Contributors: ${aggregates.contributors.length}`);
  lines.push(`- Contributors with authored commits: ${aggregates.authoredContributors.length}`);
  lines.push(`- Contributors with integration/admin commits: ${aggregates.integrationContributors.length}`);
  lines.push(`- Commits: ${aggregates.team.totalCommits}`);
  lines.push(`- Non-merge commits: ${aggregates.team.nonMergeCommits}`);
  lines.push(`- Merge commits: ${aggregates.team.mergeCommits}`);
  lines.push(`- Active days: ${aggregates.team.activeDays}`);
  lines.push(`- Lines changed: +${aggregates.team.additions} / -${aggregates.team.deletions}`);
  lines.push(`- Authored lines changed: +${aggregates.team.authoredAdditions} / -${aggregates.team.authoredDeletions}`);
  lines.push(`- Merge/admin lines changed: +${aggregates.team.mergeAdditions} / -${aggregates.team.mergeDeletions}`);
  lines.push(`- Files changed: ${aggregates.team.filesChanged}`);
  lines.push(`- Authored files changed: ${aggregates.team.authoredFilesChanged}`);
  lines.push(`- Merge/admin files changed: ${aggregates.team.mergeFilesChanged}`);
  lines.push('');
  lines.push('## Data Quality Warnings');
  lines.push('');
  if (aggregates.qualityWarnings.length === 0) {
    lines.push('- None detected by heuristic checks.');
  } else {
    for (const warning of aggregates.qualityWarnings) {
      lines.push(`- ${escapeMarkdown(warning.message)}`);
    }
  }
  lines.push('');
  lines.push('## Authored Contribution Signal Sort');
  lines.push('');
  lines.push('| Sort | Contributor | Authored Signal | Authored Commits | Authored Days | Authored Lines +/- | Authored Files | Source | Test | Docs | Config | Warnings |');
  lines.push('| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
  for (const contributor of aggregates.authoredContributors) {
    lines.push(
      `| ${contributor.authoredRank} | [${escapeTable(contributor.displayName)}](${escapeTable(contributor.reportFile)}) | ${contributor.authoredContributionSignal} | ${contributor.nonMergeCommits} | ${contributor.authoredActiveDays} | +${contributor.authoredAdditions} / -${contributor.authoredDeletions} | ${contributor.authoredFilesChanged} | ${contributor.authoredPathCategories.source || 0} | ${contributor.authoredPathCategories.test || 0} | ${contributor.authoredPathCategories.docs || 0} | ${contributor.authoredPathCategories.config || 0} | ${escapeTable(warningCodes(contributor.qualityWarnings))} |`,
    );
  }
  if (aggregates.authoredContributors.length === 0) {
    lines.push('| - | No authored commits found | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - |');
  }
  lines.push('');
  lines.push('## Integration/Admin Activity');
  lines.push('');
  lines.push('| Sort | Contributor | Integration Signal | Merge Commits | Integration Days | Total Commits | Report |');
  lines.push('| ---: | --- | ---: | ---: | ---: | ---: | --- |');
  for (const contributor of aggregates.integrationContributors) {
    lines.push(`| ${contributor.integrationRank} | ${escapeTable(contributor.displayName)} | ${contributor.integrationSignal} | ${contributor.mergeCommits} | ${contributor.integrationActiveDays} | ${contributor.totalCommits} | [details](${escapeTable(contributor.reportFile)}) |`);
  }
  if (aggregates.integrationContributors.length === 0) {
    lines.push('| - | No merge/admin commits found | 0 | 0 | 0 | 0 | - |');
  }
  lines.push('');
  lines.push('## Methodology');
  lines.push('');
  lines.push(`Authored Signal = non-merge commits x${SIGNAL_WEIGHTS.commit} + authored days x${SIGNAL_WEIGHTS.consistency} + sqrt(min(authored files changed, ${SIGNAL_FILE_CAP})) x${SIGNAL_WEIGHTS.breadth} + sqrt(min(authored lines changed, ${SIGNAL_LINE_CAP})) x${SIGNAL_WEIGHTS.churn} + bounded authored test/docs support. Merge commits and merge/admin file churn are excluded from this primary signal and shown in Integration/Admin Activity.`);
  lines.push('');
  lines.push('## Data Quality Notes');
  lines.push('');
  lines.push('- Local clone history, author mailmap, optional identity map, merge strategy, squashed commits, and bot/shared accounts can affect attribution.');
  lines.push('- Normal no-ff merged branch commits are attributed to their original authors; squashed commits can only be attributed to the squash commit author unless the repo preserves co-author metadata outside this script.');
  lines.push('- File categories are heuristic: source, test, docs, config, and generated/vendor paths.');
  lines.push('- Bulk change warnings mean the raw evidence should be reviewed before comparing contributors.');
  lines.push('- Use the CSV and JSON evidence files for any follow-up review.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderDeveloperMarkdown({ metadata, contributor }) {
  const lines = [];
  lines.push(`# Git Contributor Report: ${escapeMarkdown(contributor.displayName)}`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push(`- Branch: \`${escapeMarkdown(metadata.branch)}\``);
  lines.push(`- Period: ${escapeMarkdown(metadata.since)} to ${escapeMarkdown(metadata.until)} (${metadata.days} days)`);
  lines.push(`- Identity: ${escapeMarkdown(contributor.identity)}`);
  if (contributor.originalIdentities?.length > 1) {
    lines.push(`- Original identities: ${escapeMarkdown(contributor.originalIdentities.join('; '))}`);
  }
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Authored Contribution Signal: ${contributor.authoredContributionSignal}`);
  lines.push(`- Integration/Admin Signal: ${contributor.integrationSignal}`);
  lines.push(`- Commits: ${contributor.totalCommits} (${contributor.nonMergeCommits} non-merge, ${contributor.mergeCommits} merge)`);
  lines.push(`- Active days: ${contributor.activeDays} (${contributor.authoredActiveDays} authored, ${contributor.integrationActiveDays} integration/admin)`);
  lines.push(`- Lines changed: +${contributor.additions} / -${contributor.deletions}`);
  lines.push(`- Authored lines changed: +${contributor.authoredAdditions} / -${contributor.authoredDeletions}`);
  lines.push(`- Merge/admin lines changed: +${contributor.mergeAdditions} / -${contributor.mergeDeletions}`);
  lines.push(`- Files changed: ${contributor.filesChanged}`);
  lines.push(`- Authored files changed: ${contributor.authoredFilesChanged}`);
  lines.push(`- Merge/admin files changed: ${contributor.mergeFilesChanged}`);
  lines.push('');
  lines.push('## Quality Warnings');
  lines.push('');
  if (contributor.qualityWarnings.length === 0) {
    lines.push('- None detected by heuristic checks.');
  } else {
    for (const warning of contributor.qualityWarnings) lines.push(`- ${escapeMarkdown(warning.message)}`);
  }
  lines.push('');
  lines.push('## File Category Mix');
  lines.push('');
  lines.push(renderKeyValueTable(contributor.pathCategories, 'Category', 'Files'));
  lines.push('');
  lines.push('## Authored File Category Mix');
  lines.push('');
  lines.push(renderKeyValueTable(contributor.authoredPathCategories, 'Category', 'Authored files'));
  lines.push('');
  lines.push('## Merge/Admin File Category Mix');
  lines.push('');
  lines.push(renderKeyValueTable(contributor.mergePathCategories, 'Category', 'Merge/admin files'));
  lines.push('');
  lines.push('## Commit Type Mix');
  lines.push('');
  lines.push(renderKeyValueTable(contributor.commitTypes, 'Type', 'Commits'));
  lines.push('');
  lines.push('## Top Modules');
  lines.push('');
  lines.push(renderKeyValueTable(contributor.modules, 'Module', 'Files'));
  lines.push('');
  lines.push('## Recent Commits');
  lines.push('');
  lines.push('| Date | Hash | Type | Files | Lines +/- | Subject |');
  lines.push('| --- | --- | --- | ---: | ---: | --- |');
  for (const commit of contributor.recentCommits) {
    lines.push(`| ${escapeTable(commit.date.slice(0, 10))} | \`${escapeTable(commit.hash)}\` | ${escapeTable(commit.type)} | ${commit.filesChanged} | +${commit.additions} / -${commit.deletions} | ${escapeTable(commit.subject)} |`);
  }
  if (contributor.recentCommits.length === 0) {
    lines.push('| - | - | - | 0 | 0 | No commits found |');
  }
  lines.push('');
  lines.push('## Interpretation');
  lines.push('');
  lines.push('This is git-only contribution evidence. Review raw commits before making people decisions, especially when commits are squashed, paired, generated, bulk-changed, merged by an integrator, or authored by shared accounts.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function warningCodes(warnings = []) {
  if (!warnings || warnings.length === 0) return '-';
  return warnings.map((warning) => warning.code).join('; ');
}

function renderKeyValueTable(valueObject, keyHeader, valueHeader) {
  const rows = Object.entries(valueObject);
  if (rows.length === 0) return `| ${keyHeader} | ${valueHeader} |\n| --- | ---: |\n| None | 0 |`;
  return [
    `| ${keyHeader} | ${valueHeader} |`,
    '| --- | ---: |',
    ...rows.map(([key, value]) => `| ${escapeTable(key)} | ${value} |`),
  ].join('\n');
}

function renderContributorsCsv(contributors) {
  const header = [
    'rank',
    'displayName',
    'email',
    'authoredContributionSignal',
    'integrationSignal',
    'totalCommits',
    'nonMergeCommits',
    'mergeCommits',
    'activeDays',
    'authoredActiveDays',
    'integrationActiveDays',
    'additions',
    'deletions',
    'filesChanged',
    'authoredAdditions',
    'authoredDeletions',
    'authoredFilesChanged',
    'mergeAdditions',
    'mergeDeletions',
    'mergeFilesChanged',
    'sourceFiles',
    'testFiles',
    'docsFiles',
    'configFiles',
    'generatedFiles',
    'authoredSourceFiles',
    'authoredTestFiles',
    'authoredDocsFiles',
    'authoredConfigFiles',
    'authoredGeneratedFiles',
    'mergeSourceFiles',
    'mergeTestFiles',
    'mergeDocsFiles',
    'mergeConfigFiles',
    'mergeGeneratedFiles',
    'qualityWarnings',
    'reportFile',
  ];
  const rows = contributors.map((contributor) => [
    contributor.rank,
    contributor.displayName,
    contributor.email,
    contributor.authoredContributionSignal,
    contributor.integrationSignal,
    contributor.totalCommits,
    contributor.nonMergeCommits,
    contributor.mergeCommits,
    contributor.activeDays,
    contributor.authoredActiveDays,
    contributor.integrationActiveDays,
    contributor.additions,
    contributor.deletions,
    contributor.filesChanged,
    contributor.authoredAdditions,
    contributor.authoredDeletions,
    contributor.authoredFilesChanged,
    contributor.mergeAdditions,
    contributor.mergeDeletions,
    contributor.mergeFilesChanged,
    contributor.pathCategories.source || 0,
    contributor.pathCategories.test || 0,
    contributor.pathCategories.docs || 0,
    contributor.pathCategories.config || 0,
    contributor.pathCategories.generated || 0,
    contributor.authoredPathCategories.source || 0,
    contributor.authoredPathCategories.test || 0,
    contributor.authoredPathCategories.docs || 0,
    contributor.authoredPathCategories.config || 0,
    contributor.authoredPathCategories.generated || 0,
    contributor.mergePathCategories.source || 0,
    contributor.mergePathCategories.test || 0,
    contributor.mergePathCategories.docs || 0,
    contributor.mergePathCategories.config || 0,
    contributor.mergePathCategories.generated || 0,
    warningCodes(contributor.qualityWarnings),
    contributor.reportFile,
  ]);
  return renderCsv([header, ...rows]);
}

function renderCommitsCsv(commits) {
  const header = [
    'hash',
    'shortHash',
    'date',
    'authorName',
    'authorEmail',
    'type',
    'scope',
    'isMerge',
    'filesChanged',
    'additions',
    'deletions',
    'subject',
  ];
  const rows = commits.map((commit) => {
    const additions = commit.files.reduce((total, file) => total + file.additions, 0);
    const deletions = commit.files.reduce((total, file) => total + file.deletions, 0);
    return [
      commit.hash,
      commit.shortHash,
      commit.date,
      commit.authorName,
      commit.authorEmail,
      commit.type,
      commit.scope,
      commit.isMerge,
      commit.files.length,
      additions,
      deletions,
      commit.subject,
    ];
  });
  return renderCsv([header, ...rows]);
}

function renderCsv(rows) {
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function escapeMarkdown(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/`/g, '\\`')
    .replace(/\n/g, ' ');
}

function escapeTable(value) {
  return escapeMarkdown(value).replace(/\|/g, '\\|');
}

function slugify(value) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'ref';
}

function formatTimestampForPath(date) {
  const pad = (number) => String(number).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('') + `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function printHelp() {
  process.stdout.write(`Usage: node .claude/skills/git-developer-performance/scripts/git-developer-performance.cjs [options]

Options:
  --branch <ref>   Branch/ref to analyze. Defaults to develop, then main.
  --days <n>       Lookback days when --since is omitted. Default: 60.
  --since <date>   Explicit start date.
  --until <date>   Explicit end date. Default: now.
  --out <dir>      Output root. Default: reports/developer-performance.
  --identity-map <csv>
                  Optional CSV with identity,email,displayName,id columns.
  --no-merges      Exclude merge commits.
  --json           Print JSON run result.
  --help           Show help.
`);
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return { help: true };
  }

  const result = generateReport(options);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`Git contribution report written to ${result.outputDir}\n`);
    process.stdout.write(`Summary: ${result.summaryPath}\n`);
  }
  return result;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_DAYS,
  DEFAULT_OUTPUT_ROOT,
  RECORD_SEPARATOR,
  FIELD_SEPARATOR,
  aggregateCommits,
  buildRunConfig,
  calculateAuthoredContributionSignal,
  categorizePath,
  collectCommits,
  csvCell,
  detectIdentityWarnings,
  generateReport,
  loadIdentityMap,
  parseArgs,
  parseCommitType,
  parseGitLog,
  refExists,
  renderSummaryMarkdown,
  resolveBranch,
  resolveOutputRoot,
  runGit,
  stableContributorId,
  validateBranchName,
};
