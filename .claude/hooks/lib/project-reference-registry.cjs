'use strict';

const fs = require('fs');
const path = require('path');
const { isAbsolutePathWithin: isPathWithin } = require('./ck-path-utils.cjs');

/** Built-in document owners are framework-owned and keyed by exact relative filename. */
const SCAN_SKILL_MAP = Object.freeze({
    'project-structure-reference.md': 'scan --target=project-structure',
    'backend-patterns-reference.md': 'scan --target=backend-patterns',
    'seed-test-data-reference.md': 'scan --target=seed-test-data',
    'frontend-patterns-reference.md': 'scan --target=frontend-patterns',
    'integration-test-reference.md': 'scan --target=integration-tests',
    'performance-test-reference.md': 'scan --target=performance-tests',
    'feature-spec-reference.md': 'scan --target=feature-spec',
    'code-review-rules.md': 'scan --target=code-review-rules',
    'scss-styling-guide.md': 'scan --target=scss-styling',
    'design-system/README.md': 'scan --target=design-system',
    'design-system/design-system-canonical.md': 'scan --target=design-system',
    'design-system/design-tokens.scss': 'scan --target=design-system',
    'design-system/design-tokens.css': 'scan --target=design-system',
    'e2e-test-reference.md': 'scan --target=e2e-tests',
    'domain-entities-reference.md': 'scan --target=domain-entities',
    'docs-index-reference.md': 'scan --target=docs-index'
});

const REFERENCE_DOC_ALIASES = Object.freeze({
    'feature-docs-reference.md': 'feature-spec-reference.md'
});

const CUSTOM_SCAN_TARGETS = new Set(['generic', 'manual']);
const BUILT_IN_DOC_NAMES = new Set([
    ...Object.keys(SCAN_SKILL_MAP),
    ...Object.keys(REFERENCE_DOC_ALIASES),
    ...Object.values(REFERENCE_DOC_ALIASES)
]);

function resolveReferenceDocAlias(filename) {
    return Object.prototype.hasOwnProperty.call(REFERENCE_DOC_ALIASES, filename)
        ? REFERENCE_DOC_ALIASES[filename]
        : filename;
}

/**
 * Validate a project-relative POSIX path used in portable config.
 *
 * The config format deliberately uses `/` on every host. Rejecting ambiguous and
 * Windows-special segments here keeps the same config safe to copy between hosts.
 */
function normalizeProjectRelativePath(value, label = 'path') {
    if (typeof value !== 'string' || value.length === 0) {
        throw new TypeError(`${label}: expected a non-empty project-relative POSIX path`);
    }
    if (value !== value.trim()) {
        throw new TypeError(`${label}: leading or trailing whitespace is not allowed`);
    }
    if (value.includes('\0') || value.includes('\\')) {
        throw new TypeError(`${label}: use forward slashes and do not include NUL characters`);
    }
    if (path.posix.isAbsolute(value) || /^[A-Za-z]:/.test(value)) {
        throw new TypeError(`${label}: absolute paths are not allowed`);
    }

    const segments = value.split('/');
    if (segments.some(segment => !segment || segment === '.' || segment === '..')) {
        throw new TypeError(`${label}: empty, dot, and traversal path segments are not allowed`);
    }
    for (const segment of segments) {
        if (/[<>:"|?*]/.test(segment) || /[. ]$/.test(segment)) {
            throw new TypeError(`${label}: path segment contains characters that are not portable across supported hosts`);
        }
        if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$/i.test(segment)) {
            throw new TypeError(`${label}: reserved Windows path segments are not allowed`);
        }
    }
    return value;
}

/** Resolve a possibly-missing path through its nearest existing ancestor. */
function resolvePhysicalProjection(candidate) {
    let current = path.resolve(candidate);
    const missingSegments = [];

    while (true) {
        let exists = false;
        try {
            fs.lstatSync(current);
            exists = true;
        } catch (error) {
            if (error && error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
        }
        if (exists) {
            // Do not downgrade a broken/looping symlink to a missing path. Its
            // physical owner cannot be established safely, so fail closed.
            const realCurrent = fs.realpathSync(current);
            return path.resolve(realCurrent, ...missingSegments.reverse());
        }

        {
            const parent = path.dirname(current);
            if (parent === current) throw new Error(`Cannot resolve an existing ancestor for ${candidate}`);
            missingSegments.push(path.basename(current));
            current = parent;
        }
    }
}

/**
 * Resolve a path below a configured root while checking both lexical and physical
 * containment. `projectRoot` additionally ensures the configured root itself has not
 * been redirected outside the adopting project by a symlink.
 */
function resolveContainedPath(rootPath, relativePath, { projectRoot } = {}) {
    const safeRelative = normalizeProjectRelativePath(relativePath);
    const root = path.resolve(rootPath);
    const candidate = path.resolve(root, ...safeRelative.split('/'));
    if (!isPathWithin(root, candidate)) {
        throw new Error(`Path escapes its configured root: ${relativePath}`);
    }

    const rootProjection = resolvePhysicalProjection(root);
    const candidateProjection = resolvePhysicalProjection(candidate);
    if (!isPathWithin(rootProjection, candidateProjection)) {
        throw new Error(`Path resolves outside its configured root: ${relativePath}`);
    }

    if (projectRoot) {
        const project = path.resolve(projectRoot);
        const projectProjection = resolvePhysicalProjection(project);
        if (!isPathWithin(projectProjection, rootProjection) || !isPathWithin(projectProjection, candidateProjection)) {
            throw new Error(`Path resolves outside the adopting project: ${relativePath}`);
        }
    }

    return candidate;
}

function isBuiltInReferenceDoc(filename) {
    const resolved = REFERENCE_DOC_ALIASES[filename] || filename;
    return BUILT_IN_DOC_NAMES.has(resolved);
}

/** Validate the configurable portion of one selected reference document. */
function validateReferenceDocDefinition(doc, index) {
    const label = `referenceDocs[${index}]`;
    const filename = normalizeProjectRelativePath(doc?.filename, `${label}.filename`);
    if (typeof doc?.purpose !== 'string' || !doc.purpose.trim()) {
        throw new TypeError(`${label}.purpose: expected a non-empty description`);
    }
    if (doc.templatePath !== undefined) {
        normalizeProjectRelativePath(doc.templatePath, `${label}.templatePath`);
    }
    if (doc.scanTarget !== undefined) {
        if (typeof doc.scanTarget !== 'string' || !CUSTOM_SCAN_TARGETS.has(doc.scanTarget)) {
            throw new TypeError(`${label}.scanTarget: expected "generic" or "manual"`);
        }
        if (isBuiltInReferenceDoc(filename)) {
            throw new TypeError(`${label}.scanTarget: built-in reference docs use their framework-owned scan target; omit this property`);
        }
    }
    return { ...doc, filename };
}

/** Resolve the scan owner for a selected doc; custom docs default to manual ownership. */
function resolveReferenceDocTarget(doc) {
    const filename = typeof doc === 'string' ? doc : doc?.filename;
    if (typeof filename !== 'string' || !filename) return { kind: 'invalid', command: null };

    const builtInCommand = SCAN_SKILL_MAP[filename];
    if (builtInCommand) return { kind: 'built-in', command: builtInCommand };

    const explicit = typeof doc === 'object' && doc ? doc.scanTarget : undefined;
    if (explicit === 'generic') {
        return {
            kind: 'generic',
            command: `scan --target=generic-reference-doc --filename="${filename}"`
        };
    }
    if (explicit === undefined || explicit === 'manual') return { kind: 'manual', command: null };
    return { kind: 'invalid', command: null };
}

module.exports = {
    SCAN_SKILL_MAP,
    REFERENCE_DOC_ALIASES,
    resolveReferenceDocAlias,
    CUSTOM_SCAN_TARGETS,
    normalizeProjectRelativePath,
    resolveContainedPath,
    resolvePhysicalProjection,
    isBuiltInReferenceDoc,
    validateReferenceDocDefinition,
    resolveReferenceDocTarget
};
