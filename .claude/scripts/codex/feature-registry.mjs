#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

export const FEATURE_REGISTRY_SCHEMA_VERSION = 1;
export const MAX_TEST_CASES_PER_SPEC_PART = 40;

const RAW_STATUS_ORDER = ['Tested', 'Partial', 'Untested', 'Planned', 'Manual', 'Written', 'Implemented', 'Unknown'];

const RELEASE_STATUS_ORDER = ['Tested', 'Partial', 'Untested', 'Manual'];

const normalizePath = filePath => filePath.replaceAll('\\', '/').replace(/^\.\//, '');

const uniqueSorted = values => [...new Set(values)].sort((left, right) => left.localeCompare(right));

function parseScalar(value) {
    const trimmed = value.trim();
    if (trimmed.length === 0) return '';
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const inner = trimmed.slice(1, -1).trim();
        return inner.length === 0 ? [] : inner.split(',').map(item => parseScalar(item));
    }
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
    }
    if (/^(?:true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
    if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
    return trimmed;
}

/** Parse the top-level YAML subset used by Feature Spec frontmatter. */
export function parseFeatureFrontmatter(content) {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    if (lines[0]?.trim() !== '---') return { values: {}, bodyStartLine: 1 };

    const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
    if (closingIndex === -1) return { values: {}, bodyStartLine: 1 };

    const values = {};
    let activeListKey = null;
    for (const line of lines.slice(1, closingIndex)) {
        const keyMatch = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
        if (keyMatch) {
            const [, key, rawValue] = keyMatch;
            if (rawValue.trim().length === 0) {
                values[key] = [];
                activeListKey = key;
            } else {
                values[key] = parseScalar(rawValue);
                activeListKey = null;
            }
            continue;
        }

        const listMatch = /^\s+-\s+(.+)$/.exec(line);
        if (listMatch && activeListKey) values[activeListKey].push(parseScalar(listMatch[1]));
    }

    return { values, bodyStartLine: closingIndex + 2 };
}

/** Parse `TC-<hyphenated-feature-id>-<ordinal>` from the right edge. */
export function parseTestCaseId(id) {
    const match = /^TC-(.+)-(\d{2,})$/.exec(id.trim());
    if (!match || !/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(match[1])) return null;
    return {
        id: id.trim(),
        featureId: match[1],
        ordinal: Number(match[2]),
        ordinalText: match[2]
    };
}

export function parseBusinessRuleId(id) {
    const match = /^BR-(.+)-(\d{2,})$/.exec(id.trim());
    if (!match || !/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(match[1])) return null;
    return {
        id: id.trim(),
        featureId: match[1],
        ordinal: Number(match[2]),
        ordinalText: match[2]
    };
}

export function normalizeRawStatus(status) {
    const normalized = String(status ?? '').trim();
    for (const candidate of RAW_STATUS_ORDER.slice(0, -1)) {
        if (new RegExp(`^${candidate}(?:\\b|\\s*\\()`, 'i').test(normalized)) return candidate;
    }
    return 'Unknown';
}

/** Release summaries group non-passing implementation states, including Planned, under Untested. */
export function toReleaseStatusFamily(rawStatus) {
    if (rawStatus === 'Tested' || rawStatus === 'Partial' || rawStatus === 'Manual') return rawStatus;
    return 'Untested';
}

function emptyCounts(keys) {
    return Object.fromEntries(keys.map(key => [key, 0]));
}

export function countTestCaseStatuses(testCases) {
    const raw = emptyCounts(RAW_STATUS_ORDER);
    const release = emptyCounts(RELEASE_STATUS_ORDER);
    for (const testCase of testCases) {
        raw[testCase.rawStatus] += 1;
        release[testCase.releaseStatus] += 1;
    }
    return { definitions: testCases.length, raw, release };
}

function extractField(block, fieldName) {
    const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\*\\*${escaped}:\\*\\*\\s*(.*?)(?=\\s*·\\s*\\*\\*[A-Za-z][^*]*:\\*\\*|\\n|$)`, 'i');
    return pattern.exec(block)?.[1]?.trim() ?? null;
}

function coverageLanes(coveredBy) {
    if (!coveredBy) return [];
    const value = coveredBy.toLowerCase();
    const lanes = [];
    if (/integration\s*tests?/.test(value)) lanes.push('integration');
    if (/unit\s*tests?/.test(value)) lanes.push('unit');
    if (/contract\s*tests?/.test(value)) lanes.push('contract');
    if (/\be2e\b|automation\s*tests?/.test(value)) lanes.push('e2e');
    if (/\bmanual\b/.test(value)) lanes.push('manual');
    return uniqueSorted(lanes);
}

export function hasConcreteCoverage(coveredBy) {
    if (!coveredBy) return false;
    const normalized = coveredBy.replace(/[`_*]/g, '').trim().toLowerCase();
    return !/^(?:n\/?a|none|untested|planned|tbd|testspec join pending)(?:\b|\s|$)/.test(normalized);
}

function parseTestCases(lines, scanStartIndex, filePath, defaultTestLane) {
    const headings = [];
    const headingPattern = /^(#{3,6})\s+(TC-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-\d{2,})(?:\s*(?::|—|–)\s*|\s+|$)/;

    for (let index = scanStartIndex; index < lines.length; index += 1) {
        const match = headingPattern.exec(lines[index]);
        if (match) headings.push({ index, id: match[2] });
    }

    return headings.map((heading, position) => {
        const nextIndex = position + 1 < headings.length ? headings[position + 1].index : lines.length;
        const block = lines.slice(heading.index, nextIndex).join('\n');
        const parsedId = parseTestCaseId(heading.id);
        const status = extractField(block, 'Status') ?? 'Unknown';
        const rawStatus = normalizeRawStatus(status);
        const coveredBy = extractField(block, 'CoveredBy');
        const declaredLane = (extractField(block, 'Test Lane') ?? defaultTestLane ?? '').toLowerCase().trim() || null;
        const businessRuleReferences = uniqueSorted([...block.matchAll(/\bBR-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-\d{2,}\b/g)].map(match => match[0]));

        return {
            id: heading.id,
            featureId: parsedId.featureId,
            ordinal: parsedId.ordinal,
            ordinalText: parsedId.ordinalText,
            filePath,
            line: heading.index + 1,
            status,
            rawStatus,
            releaseStatus: toReleaseStatusFamily(rawStatus),
            coveredBy,
            hasConcreteCoverage: hasConcreteCoverage(coveredBy),
            coverageLanes: coverageLanes(coveredBy),
            declaredTestLane: declaredLane,
            businessRuleReferences
        };
    });
}

function parseBusinessRules(lines, filePath) {
    const sectionStart = lines.findIndex(line => /^## 4\.\s+Business Rules\b/i.test(line));
    if (sectionStart === -1) return [];
    const relativeEnd = lines.slice(sectionStart + 1).findIndex(line => /^## [5-9]\.\s+/.test(line));
    const sectionEnd = relativeEnd === -1 ? lines.length : sectionStart + 1 + relativeEnd;
    const definitions = [];
    const seenIds = new Set();
    const idPattern = 'BR-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-\\d{2,}';
    const headingOrParagraph = new RegExp(`^(?:#{3,6}\\s+)?(?:\\*\\*)?(${idPattern})(?:\\*\\*)?\\s*(?:—|–|:|-)`);
    const tableRow = new RegExp(`^\\|\\s*(?:\\*\\*|\\x60)?(${idPattern})(?:\\*\\*|\\x60)?\\s*\\|`);

    for (let index = sectionStart + 1; index < sectionEnd; index += 1) {
        const match = headingOrParagraph.exec(lines[index].trim()) ?? tableRow.exec(lines[index].trim());
        if (!match || seenIds.has(match[1])) continue;
        const parsed = parseBusinessRuleId(match[1]);
        definitions.push({
            id: match[1],
            featureId: parsed.featureId,
            ordinal: parsed.ordinal,
            ordinalText: parsed.ordinalText,
            filePath,
            line: index + 1
        });
        seenIds.add(match[1]);
    }

    return definitions;
}

function parseRange(value, kind, filePath, line = 1) {
    const fullPrefix = kind === 'tc' ? 'TC' : 'BR';
    const minimumDigits = 2;
    const pattern = new RegExp(
        `^(${fullPrefix}-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-\\d{${minimumDigits},})\\s*` +
            `(?:\\.\\.|…|–|—)\\s*(${fullPrefix}-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-)?(\\d{${minimumDigits},})$`
    );
    const match = pattern.exec(String(value).trim());
    if (!match) return null;

    const parseId = kind === 'tc' ? parseTestCaseId : parseBusinessRuleId;
    const start = parseId(match[1]);
    const explicitEndPrefix = match[2]?.slice(0, -1) ?? null;
    const expectedPrefix = `${fullPrefix}-${start.featureId}`;
    if (explicitEndPrefix && explicitEndPrefix !== expectedPrefix) return null;
    const endOrdinalText = match[3];
    const endOrdinal = Number(endOrdinalText);
    if (endOrdinal < start.ordinal) return null;

    const width = Math.max(start.ordinalText.length, endOrdinalText.length);
    const ids = [];
    for (let ordinal = start.ordinal; ordinal <= endOrdinal; ordinal += 1) {
        ids.push(`${expectedPrefix}-${String(ordinal).padStart(width, '0')}`);
    }
    return {
        kind,
        expression: String(value).trim(),
        filePath,
        line,
        ids
    };
}

function asList(value) {
    if (Array.isArray(value)) return value.map(String);
    if (value === undefined || value === null || value === '') return [];
    return String(value)
        .split(/\s*;\s*/)
        .filter(Boolean);
}

function parseDeclaredRanges(frontmatter, content, filePath) {
    const ranges = [];
    for (const [key, kind] of [
        ['tc_ranges', 'tc'],
        ['br_ranges', 'br']
    ]) {
        for (const value of asList(frontmatter[key])) {
            const parsed = parseRange(value, kind, filePath);
            ranges.push(parsed ?? { kind, expression: value, filePath, line: 1, ids: null });
        }
    }
    for (const match of content.matchAll(/<!--\s*feature-registry:range\s+(tc|br)\s+(.+?)\s*-->/gi)) {
        const line = content.slice(0, match.index).split(/\r?\n/).length;
        const parsed = parseRange(match[2], match[1].toLowerCase(), filePath, line);
        ranges.push(
            parsed ?? {
                kind: match[1].toLowerCase(),
                expression: match[2].trim(),
                filePath,
                line,
                ids: null
            }
        );
    }
    return ranges;
}

function parseSummaryValue(value) {
    const summary = {};
    for (const match of String(value ?? '').matchAll(/\b(Tested|Partial|Untested|Planned|Manual|Written|Implemented|Unknown)\s*[:=]\s*(\d+)\b/gi)) {
        const status = RAW_STATUS_ORDER.find(candidate => candidate.toLowerCase() === match[1].toLowerCase());
        summary[status] = Number(match[2]);
    }
    return summary;
}

function parseDeclaredSummaries(frontmatter, content, filePath) {
    const declarations = [];
    for (const key of ['tc_status_summary', 'test_status_summary']) {
        if (frontmatter[key] === undefined) continue;
        declarations.push({ filePath, line: 1, counts: parseSummaryValue(frontmatter[key]) });
    }
    for (const match of content.matchAll(/<!--\s*feature-registry:status\s+(.+?)\s*-->/gi)) {
        declarations.push({
            filePath,
            line: content.slice(0, match.index).split(/\r?\n/).length,
            counts: parseSummaryValue(match[1])
        });
    }
    return declarations;
}

function parseLinks(content, filePath) {
    const links = [];
    for (const match of content.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/g)) {
        let target = match[1].trim().replace(/^<|>$/g, '');
        target = target.split(/\s+["'][^"']*["']$/)[0];
        if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
        const withoutFragment = target.split('#')[0];
        if (!withoutFragment) continue;
        const resolvedPath = normalizePath(path.posix.normalize(path.posix.join(path.posix.dirname(filePath), withoutFragment)));
        links.push({
            target,
            resolvedPath,
            filePath,
            line: content.slice(0, match.index).split(/\r?\n/).length
        });
    }
    return links;
}

export function parseFeatureSpecDocument({ filePath, content }) {
    const normalizedFilePath = normalizePath(filePath);
    const normalizedContent = content.replace(/\r\n/g, '\n');
    const lines = normalizedContent.split('\n');
    const { values: frontmatter } = parseFeatureFrontmatter(normalizedContent);
    const parentReference = frontmatter.parent_spec ?? frontmatter.part_of ?? null;
    const canonicalPath = parentReference
        ? normalizePath(path.posix.normalize(path.posix.join(path.posix.dirname(normalizedFilePath), String(parentReference))))
        : normalizedFilePath;
    const sectionEightIndex = lines.findIndex(line => /^## 8\.\s+Test Specifications\b/i.test(line));
    const scanStartIndex = parentReference ? 0 : sectionEightIndex === -1 ? lines.length : sectionEightIndex + 1;
    const testCases = parseTestCases(lines, scanStartIndex, normalizedFilePath, frontmatter.test_lane);

    return {
        filePath: normalizedFilePath,
        canonicalPath,
        parentReference: parentReference ? String(parentReference) : null,
        featureCodeLabel: frontmatter.feature_code ? String(frontmatter.feature_code) : null,
        testCases,
        businessRules: parseBusinessRules(lines, normalizedFilePath),
        declaredRanges: parseDeclaredRanges(frontmatter, normalizedContent, normalizedFilePath),
        declaredStatusSummaries: parseDeclaredSummaries(frontmatter, normalizedContent, normalizedFilePath),
        links: parseLinks(normalizedContent, normalizedFilePath)
    };
}

export function buildFeatureRegistry(documentInputs, options = {}) {
    const documents = documentInputs.map(input => parseFeatureSpecDocument(input)).sort((left, right) => left.filePath.localeCompare(right.filePath));
    const groups = new Map();

    for (const document of documents) {
        const current = groups.get(document.canonicalPath) ?? {
            canonicalPath: document.canonicalPath,
            partPaths: [],
            testCases: [],
            businessRules: [],
            declaredRanges: [],
            declaredStatusSummaries: []
        };
        current.partPaths.push(document.filePath);
        current.testCases.push(...document.testCases);
        current.businessRules.push(...document.businessRules);
        current.declaredRanges.push(...document.declaredRanges);
        current.declaredStatusSummaries.push(...document.declaredStatusSummaries);
        groups.set(document.canonicalPath, current);
    }

    const features = [...groups.values()]
        .map(feature => ({
            ...feature,
            partPaths: uniqueSorted(feature.partPaths),
            testCases: feature.testCases.sort((left, right) => left.id.localeCompare(right.id) || left.filePath.localeCompare(right.filePath)),
            businessRules: feature.businessRules.sort((left, right) => left.id.localeCompare(right.id) || left.filePath.localeCompare(right.filePath)),
            declaredRanges: feature.declaredRanges.sort((left, right) => left.expression.localeCompare(right.expression)),
            declaredStatusSummaries: feature.declaredStatusSummaries.sort((left, right) => left.filePath.localeCompare(right.filePath)),
            counts: countTestCaseStatuses(feature.testCases)
        }))
        .sort((left, right) => left.canonicalPath.localeCompare(right.canonicalPath));

    const allTestCases = features.flatMap(feature => feature.testCases);
    return {
        schemaVersion: FEATURE_REGISTRY_SCHEMA_VERSION,
        documents,
        features,
        counts: countTestCaseStatuses(allTestCases),
        knownPaths: uniqueSorted([...documents.map(document => document.filePath), ...(options.availablePaths ?? []).map(normalizePath)])
    };
}

export function serializeFeatureRegistry(registry) {
    return `${JSON.stringify(registry, null, 2)}\n`;
}

async function collectFeatureSpecPaths(directoryPath) {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true }).catch(() => []);
    const paths = [];
    for (const entry of entries) {
        const entryPath = path.join(directoryPath, entry.name);
        if (entry.isDirectory()) paths.push(...(await collectFeatureSpecPaths(entryPath)));
        else if (/^README\..+\.md$/i.test(entry.name)) paths.push(entryPath);
    }
    return paths;
}

function resolveInsideRepository(rootDir, configuredPath) {
    const absolutePath = path.resolve(rootDir, configuredPath);
    const relativePath = path.relative(rootDir, absolutePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        throw new Error(`Configured feature-registry root must stay inside the repository: ${configuredPath}`);
    }
    return absolutePath;
}

async function collectFeatureSpecScopePaths(scopePath) {
    const stats = await fs.stat(scopePath).catch(() => null);
    // Configured roots identify canonical parent documents. Discover beside a file root so its
    // continuation parts remain available to the canonical-path selector below. The configured
    // value remains the canonical parent path, not a directory or an arbitrary spec bucket.
    return stats?.isFile()
        ? collectFeatureSpecPaths(path.dirname(scopePath))
        : collectFeatureSpecPaths(scopePath);
}

export async function loadFeatureRegistry({ rootDir = process.cwd(), specPaths, canonicalRootPaths } = {}) {
    rootDir = path.resolve(rootDir);
    if (specPaths?.length && canonicalRootPaths?.length) {
        throw new Error('Choose explicit specPaths or canonicalRootPaths; the two registry scopes cannot be combined.');
    }

    const configuredScopes = canonicalRootPaths?.length
        ? canonicalRootPaths.map(configuredPath => resolveInsideRepository(rootDir, configuredPath))
        : [];
    // Sibling file roots share one discovery directory; dedupe so each document is parsed once.
    const allSpecPaths = canonicalRootPaths?.length
        ? [...new Set((await Promise.all(configuredScopes.map(collectFeatureSpecScopePaths))).flat())]
        : null;
    const absolutePaths = specPaths?.length
        ? specPaths.map(filePath => resolveInsideRepository(rootDir, filePath))
        : (allSpecPaths ?? (await collectFeatureSpecPaths(resolveInsideRepository(rootDir, path.join('docs', 'specs')))));
    const documentInputs = [];
    for (const absolutePath of absolutePaths.sort()) {
        const content = await fs.readFile(absolutePath, 'utf8');
        documentInputs.push({
            filePath: normalizePath(path.relative(rootDir, absolutePath)),
            content
        });
    }

    if (!canonicalRootPaths?.length) return buildFeatureRegistry(documentInputs);

    const requestedRoots = new Set(canonicalRootPaths.map(normalizePath));
    const selectedInputs = documentInputs.filter(input => requestedRoots.has(parseFeatureSpecDocument(input).canonicalPath));
    const discoveredRoots = new Set(selectedInputs.map(input => parseFeatureSpecDocument(input).canonicalPath));
    const missingRoots = [...requestedRoots].filter(rootPath => !discoveredRoots.has(rootPath)).sort();
    if (missingRoots.length > 0) {
        throw new Error(`Configured feature-registry root(s) not found as canonical parent specs: ${missingRoots.join(', ')}`);
    }

    return buildFeatureRegistry(selectedInputs, {
        availablePaths: documentInputs.map(input => input.filePath)
    });
}
