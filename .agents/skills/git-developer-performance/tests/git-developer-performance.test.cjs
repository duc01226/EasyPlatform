'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const { execFileSync } = require('child_process');

const tool = require('../scripts/git-developer-performance.cjs');

function runGitIn(repo, args, env = {}) {
  return execFileSync('git', args, {
    cwd: repo,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function commitEnv(name, email, date) {
  return {
    GIT_AUTHOR_NAME: name,
    GIT_AUTHOR_EMAIL: email,
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_NAME: name,
    GIT_COMMITTER_EMAIL: email,
    GIT_COMMITTER_DATE: date,
  };
}

test('parseArgs applies default 60 day period', () => {
  assert.equal(tool.parseArgs([]).days, 60);
  assert.deepEqual(tool.parseArgs(['--branch', 'develop', '--days=30', '--json']), {
    branch: 'develop',
    days: 30,
    includeMerges: true,
    json: true,
  });
  assert.equal(tool.parseArgs(['--identity-map', 'people.csv']).identityMap, 'people.csv');
});

test('validateBranchName rejects option-like and unsafe refs', () => {
  assert.throws(() => tool.validateBranchName('--help'), /dash/);
  assert.throws(() => tool.validateBranchName('bad..ref'), /unsafe/);
  assert.throws(() => tool.validateBranchName('bad@{ref'), /unsafe/);
  assert.throws(() => tool.validateBranchName(' bad'), /trimmed/);
});

test('resolveBranch prefers develop and falls back to main', () => {
  const withDevelop = (args) => {
    if (args.includes('develop^{commit}')) return 'abc';
    throw new Error('missing');
  };
  assert.equal(tool.resolveBranch(undefined, withDevelop, process.cwd()), 'develop');

  const withMainOnly = (args) => {
    if (args.includes('main^{commit}')) return 'def';
    throw new Error('missing');
  };
  assert.equal(tool.resolveBranch(undefined, withMainOnly, process.cwd()), 'main');
});

test('buildRunConfig defaults to reports directory outside .claude', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'git-dev-performance-'));
  const git = (args) => {
    if (args[0] === 'rev-parse' && args[1] === '--verify' && args.includes('develop^{commit}')) return 'abc';
    if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') return tempRoot;
    throw new Error(`unexpected git call: ${args.join(' ')}`);
  };
  const config = tool.buildRunConfig({}, {
    cwd: tempRoot,
    git,
    now: '2026-06-01T00:00:00.000Z',
  });

  assert.equal(config.branch, 'develop');
  assert.equal(config.days, 60);
  assert.match(config.outputDir, /reports[\\/]developer-performance/);
  assert.equal(config.outputDir.includes(`${path.sep}.claude${path.sep}`), false);
});

test('resolveOutputRoot rejects .claude output', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'git-dev-performance-'));
  assert.throws(() => tool.resolveOutputRoot('.claude/reports', tempRoot), /outside \.claude/);
});

test('parseGitLog parses commits, numstat, merge state, and categories', () => {
  const raw = [
    `${tool.RECORD_SEPARATOR}111${tool.FIELD_SEPARATOR}111aaa${tool.FIELD_SEPARATOR}Alice${tool.FIELD_SEPARATOR}alice@example.com${tool.FIELD_SEPARATOR}2026-05-31T10:00:00+00:00${tool.FIELD_SEPARATOR}aaa${tool.FIELD_SEPARATOR}feat(api): add endpoint`,
    '10\t2\tsrc/api/service.js',
    '4\t0\tsrc/api/service.test.js',
    `${tool.RECORD_SEPARATOR}222${tool.FIELD_SEPARATOR}222bbb${tool.FIELD_SEPARATOR}Bob${tool.FIELD_SEPARATOR}bob@example.com${tool.FIELD_SEPARATOR}2026-05-30T09:00:00+00:00${tool.FIELD_SEPARATOR}aaa bbb${tool.FIELD_SEPARATOR}Merge branch feature`,
    '',
  ].join('\n');

  const commits = tool.parseGitLog(raw);
  assert.equal(commits.length, 2);
  assert.equal(commits[0].type, 'feat');
  assert.equal(commits[0].scope, 'api');
  assert.equal(commits[0].files[0].category, 'source');
  assert.equal(commits[0].files[1].category, 'test');
  assert.equal(commits[1].isMerge, true);
  assert.equal(commits[1].type, 'merge');
});

test('collectCommits requests commit date so period metrics align with git log filtering', () => {
  const config = {
    branch: 'develop',
    since: new Date('2026-04-01T00:00:00.000Z'),
    until: new Date('2026-06-01T00:00:00.000Z'),
    includeMerges: true,
    gitRoot: process.cwd(),
  };
  let seenArgs = [];
  const git = (args) => {
    seenArgs = args;
    return '';
  };

  tool.collectCommits(config, git);
  const prettyArg = seenArgs.find((arg) => arg.startsWith('--pretty=format:'));
  assert.match(prettyArg, /%cI/);
  assert.doesNotMatch(prettyArg, /%aI/);
  assert.equal(seenArgs.includes('--first-parent'), false);
});

test('merge/admin file churn does not inflate authored contribution signal', () => {
  const authoredOnly = tool.parseGitLog([
    `${tool.RECORD_SEPARATOR}111${tool.FIELD_SEPARATOR}111aaa${tool.FIELD_SEPARATOR}Alice${tool.FIELD_SEPARATOR}alice@example.com${tool.FIELD_SEPARATOR}2026-05-31T10:00:00+00:00${tool.FIELD_SEPARATOR}aaa${tool.FIELD_SEPARATOR}feat: add api`,
    '9\t1\tsrc/api/service.js',
  ].join('\n'));
  const withMergeChurn = tool.parseGitLog([
    `${tool.RECORD_SEPARATOR}111${tool.FIELD_SEPARATOR}111aaa${tool.FIELD_SEPARATOR}Alice${tool.FIELD_SEPARATOR}alice@example.com${tool.FIELD_SEPARATOR}2026-05-31T10:00:00+00:00${tool.FIELD_SEPARATOR}aaa${tool.FIELD_SEPARATOR}feat: add api`,
    '9\t1\tsrc/api/service.js',
    `${tool.RECORD_SEPARATOR}222${tool.FIELD_SEPARATOR}222bbb${tool.FIELD_SEPARATOR}Alice${tool.FIELD_SEPARATOR}alice@example.com${tool.FIELD_SEPARATOR}2026-05-30T09:00:00+00:00${tool.FIELD_SEPARATOR}aaa bbb${tool.FIELD_SEPARATOR}Merge branch shared-feature`,
    '1000\t200\tsrc/other-team/large-feature.js',
  ].join('\n'));

  const directContributor = tool.aggregateCommits(authoredOnly).contributors[0];
  const mergedContributor = tool.aggregateCommits(withMergeChurn).contributors[0];
  assert.equal(mergedContributor.authoredContributionSignal, directContributor.authoredContributionSignal);
  assert.equal(mergedContributor.authoredAdditions, 9);
  assert.equal(mergedContributor.authoredDeletions, 1);
  assert.equal(mergedContributor.authoredFilesChanged, 1);
  assert.equal(mergedContributor.mergeAdditions, 1000);
  assert.equal(mergedContributor.mergeDeletions, 200);
  assert.equal(mergedContributor.mergeFilesChanged, 1);
});

test('aggregateCommits groups by author and computes contribution signal', () => {
  const commits = tool.parseGitLog([
    `${tool.RECORD_SEPARATOR}111${tool.FIELD_SEPARATOR}111aaa${tool.FIELD_SEPARATOR}Alice${tool.FIELD_SEPARATOR}alice@example.com${tool.FIELD_SEPARATOR}2026-05-31T10:00:00+00:00${tool.FIELD_SEPARATOR}aaa${tool.FIELD_SEPARATOR}feat: add api`,
    '9\t1\tsrc/api/service.js',
    '2\t0\ttests/service.test.js',
    `${tool.RECORD_SEPARATOR}222${tool.FIELD_SEPARATOR}222bbb${tool.FIELD_SEPARATOR}Alice${tool.FIELD_SEPARATOR}alice@example.com${tool.FIELD_SEPARATOR}2026-05-30T09:00:00+00:00${tool.FIELD_SEPARATOR}aaa${tool.FIELD_SEPARATOR}docs: update readme`,
    '1\t0\tREADME.md',
  ].join('\n'));

  const aggregates = tool.aggregateCommits(commits);
  assert.equal(aggregates.contributors.length, 1);
  assert.equal(aggregates.contributors[0].totalCommits, 2);
  assert.equal(aggregates.contributors[0].pathCategories.source, 1);
  assert.equal(aggregates.contributors[0].pathCategories.test, 1);
  assert.equal(aggregates.contributors[0].pathCategories.docs, 1);
  // Golden value pins the exact signal formula (2 commits: code 2x2 + days 2x1.5 + breadth sqrt(3)x1.2
  // + churn sqrt(13)x0.25 + test 1x0.4 + docs 1x0.2 = 10.58). Update deliberately only when SIGNAL_WEIGHTS change.
  assert.equal(aggregates.contributors[0].authoredContributionSignal, 10.58);
});

test('merge-only contributors are separated from authored contribution sort', () => {
  const commits = tool.parseGitLog([
    `${tool.RECORD_SEPARATOR}111${tool.FIELD_SEPARATOR}111aaa${tool.FIELD_SEPARATOR}Alice${tool.FIELD_SEPARATOR}alice@example.com${tool.FIELD_SEPARATOR}2026-05-31T10:00:00+00:00${tool.FIELD_SEPARATOR}aaa${tool.FIELD_SEPARATOR}feat: add api`,
    '9\t1\tsrc/api/service.js',
    `${tool.RECORD_SEPARATOR}222${tool.FIELD_SEPARATOR}222bbb${tool.FIELD_SEPARATOR}Integrator${tool.FIELD_SEPARATOR}integrator@example.com${tool.FIELD_SEPARATOR}2026-05-30T09:00:00+00:00${tool.FIELD_SEPARATOR}aaa bbb${tool.FIELD_SEPARATOR}Merge branch feature`,
  ].join('\n'));

  const aggregates = tool.aggregateCommits(commits);
  const mergeOnly = aggregates.contributors.find((contributor) => contributor.displayName === 'Integrator');
  assert.equal(mergeOnly.nonMergeCommits, 0);
  assert.equal(mergeOnly.authoredContributionSignal, 0);
  assert.equal(aggregates.authoredContributors.some((contributor) => contributor.displayName === 'Integrator'), false);
  assert.equal(aggregates.integrationContributors.some((contributor) => contributor.displayName === 'Integrator'), true);
});

test('generateReport attributes no-ff multi-author feature branch commits to original authors', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'git-dev-performance-'));
  runGitIn(tempRoot, ['init']);
  runGitIn(tempRoot, ['checkout', '-b', 'develop']);
  runGitIn(tempRoot, ['config', 'user.name', 'Setup Bot']);
  runGitIn(tempRoot, ['config', 'user.email', 'setup@example.com']);

  fs.writeFileSync(path.join(tempRoot, 'README.md'), 'initial\n', 'utf8');
  runGitIn(tempRoot, ['add', 'README.md']);
  runGitIn(tempRoot, ['commit', '-m', 'chore: initial'], commitEnv('Setup Bot', 'setup@example.com', '2026-03-01T09:00:00+00:00'));

  runGitIn(tempRoot, ['checkout', '-b', 'feature/shared-task']);
  fs.mkdirSync(path.join(tempRoot, 'src'), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, 'src', 'alice.js'), 'export const alice = true;\n', 'utf8');
  runGitIn(tempRoot, ['add', 'src/alice.js']);
  runGitIn(tempRoot, ['commit', '-m', 'feat(shared): alice slice'], commitEnv('Alice Feature', 'alice@example.com', '2026-05-10T09:00:00+00:00'));

  fs.writeFileSync(path.join(tempRoot, 'src', 'bob.js'), 'export const bob = true;\n', 'utf8');
  runGitIn(tempRoot, ['add', 'src/bob.js']);
  runGitIn(tempRoot, ['commit', '-m', 'feat(shared): bob slice'], commitEnv('Bob Feature', 'bob@example.com', '2026-05-11T09:00:00+00:00'));

  runGitIn(tempRoot, ['checkout', 'develop']);
  runGitIn(tempRoot, ['merge', '--no-ff', 'feature/shared-task', '-m', 'Merge branch feature/shared-task'], commitEnv('Integration Lead', 'lead@example.com', '2026-05-12T09:00:00+00:00'));

  const result = tool.generateReport({
    branch: 'develop',
    since: '2026-04-01T00:00:00.000Z',
    until: '2026-06-01T00:00:00.000Z',
    out: 'reports',
    json: true,
  }, {
    cwd: tempRoot,
    now: '2026-06-01T00:00:00.000Z',
  });

  const contributors = JSON.parse(fs.readFileSync(path.join(result.outputDir, 'data', 'contributors.json'), 'utf8'));
  const alice = contributors.find((contributor) => contributor.displayName === 'Alice Feature');
  const bob = contributors.find((contributor) => contributor.displayName === 'Bob Feature');
  const lead = contributors.find((contributor) => contributor.displayName === 'Integration Lead');

  assert.equal(result.commits, 3);
  assert.equal(alice.nonMergeCommits, 1);
  assert.equal(alice.mergeCommits, 0);
  assert.equal(alice.authoredFilesChanged, 1);
  assert.equal(bob.nonMergeCommits, 1);
  assert.equal(bob.mergeCommits, 0);
  assert.equal(bob.authoredFilesChanged, 1);
  assert.equal(lead.nonMergeCommits, 0);
  assert.equal(lead.mergeCommits, 1);
  assert.equal(lead.authoredContributionSignal, 0);
  assert.equal(contributors.some((contributor) => contributor.displayName === 'Setup Bot'), false);
});

test('summary uses contribution evidence framing instead of performance ranking language', () => {
  const commits = tool.parseGitLog([
    `${tool.RECORD_SEPARATOR}111${tool.FIELD_SEPARATOR}111aaa${tool.FIELD_SEPARATOR}Alice${tool.FIELD_SEPARATOR}alice@example.com${tool.FIELD_SEPARATOR}2026-05-31T10:00:00+00:00${tool.FIELD_SEPARATOR}aaa${tool.FIELD_SEPARATOR}feat: add api`,
    '9\t1\tsrc/api/service.js',
  ].join('\n'));
  const summary = tool.renderSummaryMarkdown({
    metadata: {
      branch: 'develop',
      since: '2026-04-01T00:00:00.000Z',
      until: '2026-06-01T00:00:00.000Z',
      days: 60,
      generatedAt: '2026-06-01T00:00:00.000Z',
    },
    aggregates: tool.aggregateCommits(commits),
  });

  assert.match(summary, /# Git Contribution Report/);
  assert.match(summary, /not a standalone performance review/);
  assert.match(summary, /Authored Contribution Signal Sort/);
  assert.match(summary, /Integration\/Admin Activity/);
  assert.doesNotMatch(summary, /Developer Performance Report/);
  assert.doesNotMatch(summary, /Developer Ranking/);
});

test('identity warnings flag likely duplicate identities and identity map can merge them', () => {
  const commits = tool.parseGitLog([
    `${tool.RECORD_SEPARATOR}111${tool.FIELD_SEPARATOR}111aaa${tool.FIELD_SEPARATOR}ACME\\jane.doe${tool.FIELD_SEPARATOR}jane.doe@example.com${tool.FIELD_SEPARATOR}2026-05-31T10:00:00+00:00${tool.FIELD_SEPARATOR}aaa${tool.FIELD_SEPARATOR}feat: add api`,
    '9\t1\tsrc/api/service.js',
    `${tool.RECORD_SEPARATOR}222${tool.FIELD_SEPARATOR}222bbb${tool.FIELD_SEPARATOR}Jane Doe${tool.FIELD_SEPARATOR}jane@example.com${tool.FIELD_SEPARATOR}2026-05-30T09:00:00+00:00${tool.FIELD_SEPARATOR}aaa${tool.FIELD_SEPARATOR}fix: update api`,
    '1\t1\tsrc/api/other.js',
  ].join('\n'));

  const withoutMap = tool.aggregateCommits(commits);
  assert.ok(withoutMap.qualityWarnings.some((warning) => warning.code === 'possible-duplicate-identity'));

  const identityMap = {
    byIdentity: new Map([
      ['acme\\jane.doe <jane.doe@example.com>', { id: 'jane-doe', displayName: 'Jane Doe', email: 'jane@example.com' }],
      ['jane doe <jane@example.com>', { id: 'jane-doe', displayName: 'Jane Doe', email: 'jane@example.com' }],
    ]),
    byEmail: new Map(),
    entries: [],
  };
  const withMap = tool.aggregateCommits(commits, { identityMap });
  assert.equal(withMap.contributors.length, 1);
  assert.equal(withMap.contributors[0].displayName, 'Jane Doe');
  assert.equal(withMap.contributors[0].nonMergeCommits, 2);
});

test('aggregateCommits consolidates same-email aliases before name similarity', () => {
  const commits = tool.parseGitLog([
    `${tool.RECORD_SEPARATOR}111${tool.FIELD_SEPARATOR}111aaa${tool.FIELD_SEPARATOR}Alex Kim${tool.FIELD_SEPARATOR}alex.kimsenior@example.com${tool.FIELD_SEPARATOR}2026-05-31T10:00:00+00:00${tool.FIELD_SEPARATOR}aaa${tool.FIELD_SEPARATOR}feat: add work report`,
    '9\t1\tsrc/growth/work-report.js',
    `${tool.RECORD_SEPARATOR}222${tool.FIELD_SEPARATOR}222bbb${tool.FIELD_SEPARATOR}Alex Kim Senior${tool.FIELD_SEPARATOR}alex.kimsenior@example.com${tool.FIELD_SEPARATOR}2026-05-30T09:00:00+00:00${tool.FIELD_SEPARATOR}aaa bbb${tool.FIELD_SEPARATOR}Merge branch work-report`,
    '',
  ].join('\n'));

  const aggregates = tool.aggregateCommits(commits);
  assert.equal(aggregates.contributors.length, 1);
  assert.equal(aggregates.contributors[0].displayName, 'Alex Kim Senior');
  assert.equal(aggregates.contributors[0].email, 'alex.kimsenior@example.com');
  assert.equal(aggregates.contributors[0].nonMergeCommits, 1);
  assert.equal(aggregates.contributors[0].mergeCommits, 1);
  assert.equal(aggregates.contributors[0].originalIdentities.length, 2);
  assert.equal(aggregates.qualityWarnings.some((warning) => warning.code === 'possible-duplicate-identity'), false);
});

test('aggregateCommits consolidates high-confidence domain username aliases across emails', () => {
  const commits = tool.parseGitLog([
    `${tool.RECORD_SEPARATOR}111${tool.FIELD_SEPARATOR}111aaa${tool.FIELD_SEPARATOR}ACME\\alex.kimsenior${tool.FIELD_SEPARATOR}alex.kimsenior@example.com${tool.FIELD_SEPARATOR}2026-05-31T10:00:00+00:00${tool.FIELD_SEPARATOR}aaa${tool.FIELD_SEPARATOR}feat: add api`,
    '9\t1\tsrc/api/service.js',
    `${tool.RECORD_SEPARATOR}222${tool.FIELD_SEPARATOR}222bbb${tool.FIELD_SEPARATOR}Alex Kim Senior${tool.FIELD_SEPARATOR}alex.kim@example.com${tool.FIELD_SEPARATOR}2026-05-30T09:00:00+00:00${tool.FIELD_SEPARATOR}aaa bbb${tool.FIELD_SEPARATOR}Merge branch api`,
    '',
  ].join('\n'));

  const aggregates = tool.aggregateCommits(commits);
  assert.equal(aggregates.contributors.length, 1);
  assert.equal(aggregates.contributors[0].displayName, 'Alex Kim Senior');
  assert.equal(aggregates.contributors[0].nonMergeCommits, 1);
  assert.equal(aggregates.contributors[0].mergeCommits, 1);
  assert.equal(aggregates.contributors[0].identityKeys.length, 2);
  assert.equal(aggregates.qualityWarnings.some((warning) => warning.code === 'possible-duplicate-identity'), false);
});

test('distinct people sharing collapsed name tokens are NOT auto-merged when email local-part disagrees', () => {
  // Guard against false-merge: an AD display name whose tokens collapse to the same alias as an
  // unrelated person on the same domain must NOT fuse when the AD account's OWN email local-part
  // does not corroborate that alias. `al.ex.ample` (email local `al`) vs `Al Ex Ample`
  // (email local `alex.ample`) both collapse to "alexample" but are two different people.
  const commits = tool.parseGitLog([
    `${tool.RECORD_SEPARATOR}111${tool.FIELD_SEPARATOR}111aaa${tool.FIELD_SEPARATOR}ACME\\al.ex.ample${tool.FIELD_SEPARATOR}al@example.com${tool.FIELD_SEPARATOR}2026-05-31T10:00:00+00:00${tool.FIELD_SEPARATOR}aaa${tool.FIELD_SEPARATOR}feat: add api`,
    '9\t1\tsrc/api/service.js',
    `${tool.RECORD_SEPARATOR}222${tool.FIELD_SEPARATOR}222bbb${tool.FIELD_SEPARATOR}Al Ex Ample${tool.FIELD_SEPARATOR}alex.ample@example.com${tool.FIELD_SEPARATOR}2026-05-30T09:00:00+00:00${tool.FIELD_SEPARATOR}aaa${tool.FIELD_SEPARATOR}fix: patch api`,
    '1\t1\tsrc/api/other.js',
  ].join('\n'));

  const aggregates = tool.aggregateCommits(commits);
  assert.equal(aggregates.contributors.length, 2);
});

test('high-confidence alias merge still applies when the AD email local-part corroborates the alias', () => {
  // Positive counterpart to the guard above: when the AD account's own email local-part DOES
  // corroborate the collapsed alias, the cross-email merge must still happen.
  const commits = tool.parseGitLog([
    `${tool.RECORD_SEPARATOR}111${tool.FIELD_SEPARATOR}111aaa${tool.FIELD_SEPARATOR}ACME\\al.ex.ample${tool.FIELD_SEPARATOR}al.ex.ample@example.com${tool.FIELD_SEPARATOR}2026-05-31T10:00:00+00:00${tool.FIELD_SEPARATOR}aaa${tool.FIELD_SEPARATOR}feat: add api`,
    '9\t1\tsrc/api/service.js',
    `${tool.RECORD_SEPARATOR}222${tool.FIELD_SEPARATOR}222bbb${tool.FIELD_SEPARATOR}Al Ex Ample${tool.FIELD_SEPARATOR}alex@example.com${tool.FIELD_SEPARATOR}2026-05-30T09:00:00+00:00${tool.FIELD_SEPARATOR}aaa bbb${tool.FIELD_SEPARATOR}Merge branch api`,
    '',
  ].join('\n'));

  const aggregates = tool.aggregateCommits(commits);
  assert.equal(aggregates.contributors.length, 1);
});

test('bulk change warnings are emitted and score caps churn impact', () => {
  const fileLines = Array.from({ length: 650 }, (_, index) => `100\t0\tdocs/file-${index}.md`);
  const commits = tool.parseGitLog([
    `${tool.RECORD_SEPARATOR}111${tool.FIELD_SEPARATOR}111aaa${tool.FIELD_SEPARATOR}Alice${tool.FIELD_SEPARATOR}alice@example.com${tool.FIELD_SEPARATOR}2026-05-31T10:00:00+00:00${tool.FIELD_SEPARATOR}aaa${tool.FIELD_SEPARATOR}docs: bulk docs`,
    ...fileLines,
  ].join('\n'));

  const aggregates = tool.aggregateCommits(commits);
  assert.ok(aggregates.qualityWarnings.some((warning) => warning.code === 'bulk-files'));
  assert.ok(aggregates.qualityWarnings.some((warning) => warning.code === 'bulk-lines'));
  assert.ok(aggregates.qualityWarnings.some((warning) => warning.code === 'docs-heavy'));
  assert.ok(aggregates.contributors[0].authoredContributionSignal < 100);
});

test('csvCell escapes spreadsheet formulas and quotes', () => {
  assert.equal(tool.csvCell('=SUM(A1:A2)'), "'=SUM(A1:A2)");
  assert.equal(tool.csvCell('hello, "team"'), '"hello, ""team"""');
});

test('generateReport writes expected files from stubbed git history', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'git-dev-performance-'));
  const log = [
    `${tool.RECORD_SEPARATOR}111${tool.FIELD_SEPARATOR}111aaa${tool.FIELD_SEPARATOR}Alice${tool.FIELD_SEPARATOR}alice@example.com${tool.FIELD_SEPARATOR}2026-05-31T10:00:00+00:00${tool.FIELD_SEPARATOR}aaa${tool.FIELD_SEPARATOR}feat: add api`,
    '9\t1\tsrc/api/service.js',
  ].join('\n');
  const git = (args) => {
    if (args[0] === 'rev-parse' && args[1] === '--verify' && args.includes('develop^{commit}')) return 'abc';
    if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') return tempRoot;
    if (args[0] === 'log') return log;
    throw new Error(`unexpected git call: ${args.join(' ')}`);
  };

  const result = tool.generateReport({ json: true }, {
    cwd: tempRoot,
    git,
    now: '2026-06-01T00:00:00.000Z',
  });

  assert.equal(result.contributors, 1);
  assert.equal(result.commits, 1);
  assert.ok(fs.existsSync(path.join(result.outputDir, 'summary.md')));
  assert.ok(fs.existsSync(path.join(result.outputDir, 'analysis-plan.md')));
  assert.ok(fs.existsSync(path.join(result.outputDir, 'contributors.csv')));
  assert.ok(fs.existsSync(path.join(result.outputDir, 'work-packets')));
  assert.ok(fs.existsSync(path.join(result.outputDir, 'data', 'commits.json')));
  const summary = fs.readFileSync(path.join(result.outputDir, 'summary.md'), 'utf8');
  const analysisPlan = fs.readFileSync(path.join(result.outputDir, 'analysis-plan.md'), 'utf8');
  const workPackets = fs.readdirSync(path.join(result.outputDir, 'work-packets')).filter((name) => name.endsWith('.md'));
  assert.match(summary, /Git Contribution Report/);
  assert.match(summary, /local git history only/);
  assert.match(analysisPlan, /Developer Quality Work Analysis Plan/);
  assert.match(analysisPlan, /one todo task per contributor/);
  assert.match(analysisPlan, /zero-file merge\/admin commits as integration signal only/);
  assert.match(analysisPlan, /feature-branch merges with multiple authors/);
  assert.match(analysisPlan, /man_days_traditional/);
  assert.match(analysisPlan, /man_days_ai/);
  assert.match(analysisPlan, /velocity sanity check/);
  assert.match(analysisPlan, /giant commit/);
  assert.match(analysisPlan, /product\/domain delivery, platform\/tooling work, docs\/generated churn/);
  assert.equal(workPackets.length, 1);
  const workPacket = fs.readFileSync(path.join(result.outputDir, 'work-packets', workPackets[0]), 'utf8');
  assert.match(workPacket, /Required Analysis Tasks/);
  assert.match(workPacket, /not implementation SP/);
  assert.match(workPacket, /shared feature branches/);
  assert.match(workPacket, /one giant commit/);
  assert.match(workPacket, /AI-assisted man-days/);
  assert.ok(fs.existsSync(path.join(result.outputDir, 'data', 'quality-warnings.json')));
});

test('skill instructions follow conventions and require KPI synthesis', () => {
  const skill = fs.readFileSync(path.join(__dirname, '..', 'SKILL.md'), 'utf8');
  const lines = skill.split(/\r?\n/);
  const quickSummaryLine = lines.findIndex((line) => line.trim() === '## Quick Summary');
  const isGeneratedCodexMirror = skill.includes('Codex compatibility note') || skill.includes('CODEX:SYNC-PROMPT-PROTOCOLS');

  if (!isGeneratedCodexMirror) assert.ok(lines.length < 100);
  assert.ok(quickSummaryLine >= 0);
  if (!isGeneratedCodexMirror) assert.ok(quickSummaryLine < 30);
  assert.match(skill, /^description: '\[Git\].*developer KPI.*story point.*man-day.*code-quality.*git commit history\.'/m);
  assert.match(skill, /<!-- SYNC:critical-thinking-mindset -->/);
  assert.match(skill, /trigger `\$plan`/);
  assert.match(skill, /one todo task per contributor/);
  assert.match(skill, /quality-work-summary\.md/);
  assert.match(skill, /man_days_traditional/);
  assert.match(skill, /man_days_ai/);
  assert.match(skill, /never publish a single ambiguous MD number/);
  assert.match(skill, /zero-change merge\/admin commits are integration signal only/);
  assert.match(skill, /shared feature-branch implementation credit follows direct commit authors/);
  assert.match(skill, /Discount generated files/);
  assert.match(skill, /velocity sanity check/);
  assert.match(skill, /giant commit/);
  assert.match(skill, /Separate product\/domain delivery, platform\/tooling work, docs\/generated churn/);
  assert.match(skill, /not a complete HR assessment/);
});

test('analysis workflow reference stays small and value based', () => {
  const reference = fs.readFileSync(path.join(__dirname, '..', 'references', 'analysis-workflow.md'), 'utf8');
  const lines = reference.split(/\r?\n/);

  assert.ok(lines.length < 100);
  assert.match(reference, /Count distinct contributors/);
  assert.match(reference, /Direct commits vs merge\/admin commits/);
  assert.match(reference, /KPI-Style Evaluation/);
  assert.match(reference, /story points, no-AI man-days, and AI-assisted man-days/);
  assert.match(reference, /Code-quality impact/);
  assert.match(reference, /Evidence: commit hashes and changed paths/);
  assert.match(reference, /man_days_traditional/);
  assert.match(reference, /man_days_ai/);
  assert.match(reference, /Anti-inflation guardrails/);
  assert.match(reference, /zero-file merge\/admin commits as integration signal only/);
  assert.match(reference, /shared feature branches/);
  assert.match(reference, /velocity sanity note/);
  assert.match(reference, /giant commit/);
  assert.match(reference, /atomic 1\/2\/3\/5\/8\/13 SP clusters/);
  assert.match(reference, /product\/domain delivery, platform\/tooling, docs\/generated churn/);
  assert.match(reference, /Avoid ranking by commits\/lines alone/);
});
