#!/usr/bin/env node
/**
 * Bump semantic version based on commit types
 * Usage: node bump-version.cjs [--service name] [--prerelease tag] [--dry-run]
 *
 * Reads commits from stdin or analyzes git history to determine version bump
 * Supports both per-service and root-level versioning
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEFAULT_VERSION = '0.0.0';
const VERSION_FILE = '.version';

/**
 * Parse semantic version string
 */
function parseVersion(versionStr) {
  const match = versionStr.replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z]+)\.?(\d+)?)?$/);
  if (!match) {
    return { major: 0, minor: 0, patch: 0, prerelease: null, prereleaseNum: 0 };
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
    prereleaseNum: parseInt(match[5], 10) || 0,
  };
}

/**
 * Format version object to string
 */
function formatVersion(v, includeV = true) {
  let version = `${v.major}.${v.minor}.${v.patch}`;
  if (v.prerelease) {
    version += `-${v.prerelease}`;
    if (v.prereleaseNum > 0) {
      version += `.${v.prereleaseNum}`;
    }
  }
  return includeV ? `v${version}` : version;
}

/**
 * Determine bump type from commits
 */
function determineBumpType(commits) {
  let hasBreaking = false;
  let hasFeature = false;
  let hasFix = false;

  for (const commit of commits) {
    if (commit.breaking) {
      hasBreaking = true;
    }
    if (commit.type === 'feat') {
      hasFeature = true;
    }
    if (commit.type === 'fix' || commit.type === 'perf') {
      hasFix = true;
    }
  }

  if (hasBreaking) return 'major';
  if (hasFeature) return 'minor';
  if (hasFix) return 'patch';
  return 'patch'; // Default to patch for other changes
}

/**
 * Bump version based on type
 */
function bumpVersion(current, bumpType, prerelease = null) {
  const v = { ...current };

  // If adding prerelease to existing version
  if (prerelease && !v.prerelease) {
    v.prerelease = prerelease;
    v.prereleaseNum = 1;
    // Bump the appropriate version first
    if (bumpType === 'major') {
      v.major++;
      v.minor = 0;
      v.patch = 0;
    } else if (bumpType === 'minor') {
      v.minor++;
      v.patch = 0;
    } else {
      v.patch++;
    }
    return v;
  }

  // If already in prerelease, bump prerelease number
  if (v.prerelease && prerelease === v.prerelease) {
    v.prereleaseNum++;
    return v;
  }

  // If releasing from prerelease, remove prerelease
  if (v.prerelease && !prerelease) {
    v.prerelease = null;
    v.prereleaseNum = 0;
    return v;
  }

  // Normal version bump
  v.prerelease = prerelease;
  v.prereleaseNum = prerelease ? 1 : 0;

  if (bumpType === 'major') {
    v.major++;
    v.minor = 0;
    v.patch = 0;
  } else if (bumpType === 'minor') {
    v.minor++;
    v.patch = 0;
  } else {
    v.patch++;
  }

  return v;
}

/**
 * Get version file path for service or root
 */
function getVersionFilePath(service = null) {
  if (service) {
    // Per-service version file
    const servicePath = path.join(process.cwd(), '.versions', `${service}.version`);
    return servicePath;
  }
  // Root version file
  return path.join(process.cwd(), VERSION_FILE);
}

/**
 * Read current version from file
 */
function readVersion(service = null) {
  const filePath = getVersionFilePath(service);

  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8').trim();
      return parseVersion(content);
    }
  } catch (error) {
    console.error(`Warning: Could not read version file: ${error.message}`);
  }

  // Try to get latest git tag as fallback
  try {
    const tagPattern = service ? `${service}-v*` : 'v*';
    const latestTag = execSync(`git describe --tags --match "${tagPattern}" --abbrev=0 2>/dev/null || echo ""`, {
      encoding: 'utf-8',
    }).trim();

    if (latestTag) {
      const versionPart = service ? latestTag.replace(`${service}-`, '') : latestTag;
      return parseVersion(versionPart);
    }
  } catch {
    // Ignore git errors
  }

  return parseVersion(DEFAULT_VERSION);
}

/**
 * Write version to file
 */
function writeVersion(version, service = null) {
  const filePath = getVersionFilePath(service);
  const dir = path.dirname(filePath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const versionStr = formatVersion(version, false);
  fs.writeFileSync(filePath, versionStr + '\n');

  return filePath;
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    service: null,
    prerelease: null,
    bumpType: null,
    dryRun: false,
    inputFile: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--service' && args[i + 1]) {
      options.service = args[++i];
    } else if (args[i] === '--prerelease' && args[i + 1]) {
      options.prerelease = args[++i];
    } else if (args[i] === '--bump' && args[i + 1]) {
      options.bumpType = args[++i];
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    } else if (!args[i].startsWith('--') && fs.existsSync(args[i])) {
      options.inputFile = args[i];
    }
  }

  return options;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  let commits = [];
  let inputData = null;

  // Read commits from stdin or file
  if (!process.stdin.isTTY) {
    const input = fs.readFileSync(0, 'utf-8');
    try {
      inputData = JSON.parse(input);
      if (inputData.commits && !Array.isArray(inputData.commits)) {
        console.error('Error: "commits" must be an array');
        process.exit(1);
      }
      commits = inputData.commits || [];
    } catch (error) {
      console.error(`Warning: Could not parse JSON input (${error.message}), using bump type only`);
    }
  } else if (options.inputFile) {
    const input = fs.readFileSync(options.inputFile, 'utf-8');
    try {
      inputData = JSON.parse(input);
      if (inputData.commits && !Array.isArray(inputData.commits)) {
        console.error('Error: "commits" must be an array');
        process.exit(1);
      }
      commits = inputData.commits || [];
    } catch (error) {
      console.error(`Warning: Could not parse JSON input (${error.message}), using bump type only`);
    }
  }

  // Get current version
  const currentVersion = readVersion(options.service);
  const currentStr = formatVersion(currentVersion);

  // Determine bump type
  const bumpType = options.bumpType || determineBumpType(commits);

  // Calculate new version
  const newVersion = bumpVersion(currentVersion, bumpType, options.prerelease);
  const newStr = formatVersion(newVersion);

  // Output result
  const result = {
    current: currentStr,
    new: newStr,
    bumpType,
    service: options.service,
    prerelease: options.prerelease,
    commits: commits.length,
    dryRun: options.dryRun,
  };

  // Write version file (unless dry run)
  if (!options.dryRun) {
    const filePath = writeVersion(newVersion, options.service);
    result.versionFile = filePath;
    console.error(`Version bumped: ${currentStr} → ${newStr}`);
    console.error(`Version file: ${filePath}`);
  } else {
    console.error(`[DRY RUN] Would bump: ${currentStr} → ${newStr}`);
  }

  // If we have input data, pass it through with version info added
  if (inputData) {
    inputData.version = {
      current: currentStr,
      new: newStr,
      bumpType,
      service: options.service,
    };
    console.log(JSON.stringify(inputData, null, 2));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  parseVersion,
  formatVersion,
  determineBumpType,
  bumpVersion,
  readVersion,
  writeVersion,
};
