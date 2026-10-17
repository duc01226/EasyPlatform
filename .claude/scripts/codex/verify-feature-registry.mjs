#!/usr/bin/env node

import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { MAX_TEST_CASES_PER_SPEC_PART, loadFeatureRegistry, serializeFeatureRegistry } from './feature-registry.mjs';

const require = createRequire(import.meta.url);
const { resolveProjectRoot, isInvokedAsScript } = require('../lib/project-root.cjs');

const normalizePath = filePath => filePath.split(path.sep).join('/').replace(/^\.\//, '');

function makeIssue(code, message, source, severity = 'error') {
    return {
        code,
        severity,
        filePath: source?.filePath ?? '',
        line: source?.line ?? 1,
        message
    };
}

function duplicateDefinitionIssues(definitions, kind) {
    const byId = new Map();
    for (const definition of definitions) {
        const current = byId.get(definition.id) ?? [];
        current.push(definition);
        byId.set(definition.id, current);
    }
    const issues = [];
    for (const [id, matches] of byId) {
        if (matches.length < 2) continue;
        const locations = matches.map(match => `${match.filePath}:${match.line}`).join(', ');
        issues.push(makeIssue(`DUPLICATE_${kind}_ID`, `${id} has ${matches.length} canonical definitions (${locations})`, matches[0]));
    }
    return issues;
}

function statusSummaryIssues(feature) {
    const issues = [];
    for (const declaration of feature.declaredStatusSummaries) {
        const declaresPlannedSeparately = Object.hasOwn(declaration.counts, 'Planned');
        for (const [status, expected] of Object.entries(declaration.counts)) {
            const sourceCounts = status === 'Untested' && !declaresPlannedSeparately ? feature.counts.release : feature.counts.raw;
            const actual = sourceCounts[status] ?? 0;
            if (actual === expected) continue;
            issues.push(
                makeIssue(
                    'STALE_STATUS_SUMMARY',
                    `${feature.canonicalPath} declares ${status}=${expected}, but canonical definitions derive ${actual}`,
                    declaration
                )
            );
        }
    }
    return issues;
}

function rangeIssues(feature, tcIds, brIds) {
    const issues = [];
    for (const range of feature.declaredRanges) {
        if (!range.ids) {
            issues.push(makeIssue('INVALID_DECLARED_RANGE', `cannot parse declared ${range.kind.toUpperCase()} range '${range.expression}'`, range));
            continue;
        }
        const definitions = range.kind === 'tc' ? tcIds : brIds;
        const missing = range.ids.filter(id => !definitions.has(id));
        if (missing.length === 0) continue;
        issues.push(makeIssue('INCOMPLETE_DECLARED_RANGE', `${range.expression} is missing canonical definitions: ${missing.join(', ')}`, range));
    }
    return issues;
}

function coverageIssues(testCase) {
    const issues = [];
    if ((testCase.rawStatus === 'Tested' || testCase.rawStatus === 'Partial') && !testCase.hasConcreteCoverage) {
        issues.push(
            makeIssue('STATUS_WITHOUT_COVERAGE', `${testCase.id} is ${testCase.rawStatus} but CoveredBy has no concrete test or manual evidence`, testCase)
        );
    }

    if (testCase.declaredTestLane && testCase.hasConcreteCoverage && !testCase.coverageLanes.includes(testCase.declaredTestLane)) {
        const observed = testCase.coverageLanes.length > 0 ? testCase.coverageLanes.join(', ') : 'unclassified';
        issues.push(
            makeIssue(
                'COVERAGE_LANE_MISMATCH',
                `${testCase.id} declares test lane '${testCase.declaredTestLane}' but CoveredBy resolves to ${observed}`,
                testCase
            )
        );
    }
    return issues;
}

/**
 * Pure validation core. The filesystem is injected through `pathExists`, so fixtures remain hermetic.
 */
export function verifyFeatureRegistry(registry, options = {}) {
    const maxTestCasesPerPart = options.maxTestCasesPerPart ?? MAX_TEST_CASES_PER_SPEC_PART;
    const knownPaths = new Set(registry.knownPaths.map(normalizePath));
    const pathExists = options.pathExists ?? (filePath => knownPaths.has(normalizePath(filePath)));
    const issues = [];
    const testCases = registry.features.flatMap(feature => feature.testCases);
    const businessRules = registry.features.flatMap(feature => feature.businessRules);
    const tcIds = new Set(testCases.map(definition => definition.id));
    const brIds = new Set(businessRules.map(definition => definition.id));
    const documentPaths = new Set(registry.documents.map(document => document.filePath));

    issues.push(...duplicateDefinitionIssues(testCases, 'TC'));
    issues.push(...duplicateDefinitionIssues(businessRules, 'BR'));

    for (const requiredId of options.requiredTcIds ?? []) {
        if (tcIds.has(requiredId)) continue;
        issues.push(
            makeIssue('MISSING_TC_DEFINITION', `${requiredId} has no canonical §8 definition`, {
                filePath: '',
                line: 1
            })
        );
    }

    if (options.baselineRegistry) {
        const baselineIds = new Set(options.baselineRegistry.features.flatMap(feature => feature.testCases.map(testCase => testCase.id)));
        for (const baselineId of [...baselineIds].sort()) {
            if (tcIds.has(baselineId)) continue;
            issues.push(
                makeIssue('REMOVED_STABLE_TC_ID', `${baselineId} existed in the baseline registry and is missing from the current registry`, {
                    filePath: '',
                    line: 1
                })
            );
        }
    }

    for (const document of registry.documents) {
        if (document.testCases.length > maxTestCasesPerPart) {
            issues.push(
                makeIssue(
                    'SPEC_TC_SPLIT_REQUIRED',
                    `${document.filePath} defines ${document.testCases.length} test cases; split at ${maxTestCasesPerPart + 1}`,
                    { filePath: document.filePath, line: document.testCases[maxTestCasesPerPart].line }
                )
            );
        }
        if (document.parentReference && !documentPaths.has(document.canonicalPath)) {
            issues.push(
                makeIssue(
                    'MISSING_PARENT_SPEC',
                    `${document.filePath} declares parent '${document.parentReference}', but ${document.canonicalPath} does not exist`,
                    { filePath: document.filePath, line: 1 }
                )
            );
        }
        for (const link of document.links) {
            if (pathExists(link.resolvedPath)) continue;
            issues.push(makeIssue('BROKEN_SPEC_LINK', `${link.target} resolves to missing path ${link.resolvedPath}`, link));
        }
    }

    for (const feature of registry.features) {
        issues.push(...statusSummaryIssues(feature));
        issues.push(...rangeIssues(feature, tcIds, brIds));
    }

    for (const testCase of testCases) {
        issues.push(...coverageIssues(testCase));
        for (const businessRuleId of testCase.businessRuleReferences) {
            if (brIds.has(businessRuleId)) continue;
            issues.push(
                makeIssue('MISSING_BR_TARGET', `${testCase.id} references ${businessRuleId}, which has no canonical business-rule definition`, testCase)
            );
        }
    }

    issues.sort(
        (left, right) =>
            left.filePath.localeCompare(right.filePath) ||
            left.line - right.line ||
            left.code.localeCompare(right.code) ||
            left.message.localeCompare(right.message)
    );
    const errorCount = issues.filter(issue => issue.severity === 'error').length;
    return {
        ok: errorCount === 0,
        summary: { errors: errorCount, warnings: issues.length - errorCount },
        issues
    };
}

function parseCliArgs(argv) {
    const options = { json: false, configuredRoots: false, optional: false, rootDir: process.cwd(), specPaths: [] };
    for (const argument of argv) {
        if (argument === '--json') options.json = true;
        else if (argument === '--configured-roots') options.configuredRoots = true;
        else if (argument === '--optional') options.optional = true;
        else if (argument.startsWith('--root=')) options.rootDir = path.resolve(argument.slice('--root='.length));
        else options.specPaths.push(argument);
    }
    return options;
}

function resolveProjectConfigPath(rootDir) {
    let ckConfig = null;
    try {
        ckConfig = JSON.parse(fsSync.readFileSync(path.join(rootDir, '.claude', '.ck.json'), 'utf8'));
    } catch {
        // The default path is the portable convention when no relocation metadata is present.
    }

    const configured = ckConfig?.portability?.projectConfigPath;
    const relativePath = typeof configured === 'string' && configured.trim()
        ? configured.trim()
        : 'docs/project-config.json';
    const configPath = path.resolve(rootDir, relativePath);
    const relativeConfigPath = path.relative(rootDir, configPath);
    if (relativeConfigPath.startsWith('..') || path.isAbsolute(relativeConfigPath)) {
        throw new Error(`Configured project config must stay inside the repository: ${relativePath}`);
    }
    return configPath;
}

function loadConfiguredRoots(rootDir, { optional = false } = {}) {
    const configPath = resolveProjectConfigPath(rootDir);
    let config;
    try {
        config = JSON.parse(fsSync.readFileSync(configPath, 'utf8'));
    } catch (error) {
        if (optional && error.code === 'ENOENT') return null;
        throw new Error(`Cannot read feature-registry adoption config at ${configPath}: ${error.message}`);
    }

    const hasAdoptionContract = config && Object.prototype.hasOwnProperty.call(config, 'specSystem') &&
        Object.prototype.hasOwnProperty.call(config.specSystem ?? {}, 'featureRegistryRoots');
    if (optional && !hasAdoptionContract) return null;

    const roots = config?.specSystem?.featureRegistryRoots;
    if (!Array.isArray(roots) || roots.length === 0 || roots.some(root => typeof root !== 'string' || !root.trim())) {
        throw new Error(`${normalizePath(path.relative(rootDir, configPath))} specSystem.featureRegistryRoots must be a non-empty list of canonical parent spec paths.`);
    }
    return [...new Set(roots.map(root => root.trim()))];
}

async function main(resolvedRoot) {
    const options = parseCliArgs(process.argv.slice(2));
    if (!process.argv.slice(2).some(argument => argument.startsWith('--root=')) && resolvedRoot) {
        options.rootDir = resolvedRoot;
    }
    if (options.configuredRoots && options.specPaths.length > 0) {
        throw new Error('--configured-roots cannot be combined with explicit spec paths.');
    }
    if (options.optional && !options.configuredRoots) {
        throw new Error('--optional requires --configured-roots.');
    }
    const canonicalRootPaths = options.configuredRoots ? loadConfiguredRoots(options.rootDir, { optional: options.optional }) : undefined;
    if (canonicalRootPaths === null) {
        const reason = 'project config has no specSystem.featureRegistryRoots contract';
        if (options.json) {
            process.stdout.write(JSON.stringify({ status: 'skipped', reason }) + '\n');
        } else {
            console.log(`[codex-verify-feature-registry] SKIP (${reason})`);
        }
        return;
    }
    const registry = await loadFeatureRegistry({
        rootDir: options.rootDir,
        specPaths: options.specPaths.length > 0 ? options.specPaths : undefined,
        canonicalRootPaths
    });
    const result = verifyFeatureRegistry(registry, {
        pathExists: filePath => fsSync.existsSync(path.resolve(options.rootDir, filePath))
    });

    if (options.json) {
        process.stdout.write(JSON.stringify({ registry, result }, null, 2) + '\n');
    } else if (result.ok) {
        console.log(`[codex-verify-feature-registry] PASS (${registry.counts.definitions} canonical TC definitions)`);
    } else {
        console.error(`[codex-verify-feature-registry] FAIL (${result.summary.errors} errors)`);
        for (const issue of result.issues) {
            const location = issue.filePath ? `${issue.filePath}:${issue.line}: ` : '';
            console.error(`- ${issue.code}: ${location}${issue.message}`);
        }
    }
    process.exitCode = result.ok ? 0 : 1;
}

if (isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url))) {
    await main(resolveProjectRoot({
        cwd: process.cwd(),
        scriptPath: fileURLToPath(import.meta.url),
        env: process.env,
    }).rootDir);
}

export { serializeFeatureRegistry };
