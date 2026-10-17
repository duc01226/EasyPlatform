'use strict';

const PROFILE_KEYS = ['version', 'kind', 'sections', 'identifiers', 'ownership', 'carriers'];
const SECTION_ROLES = ['intent', 'contracts', 'evidence'];
const IDENTIFIER_KINDS = ['requirement', 'acceptance', 'scenario'];
const PROFILE_LIMITS = Object.freeze({ headingLength: 160, headingsPerRole: 32, prefixLength: 24, identifierLength: 128, pathLength: 256, pathSegments: 16, propertyPathLength: 128, carriers: 32, selectors: 32, extensionLength: 32 });
const CARRIER_EXTRAS = Object.freeze({ 'js-title-v1': ['suiteCalls', 'caseCalls'], 'js-keyed-cases-v1': ['binding', 'fields'], 'yaml-cases-v1': ['fields', 'acceptedStatuses'] });

class SpecArtifactProfileError extends TypeError {
    constructor(path, reason) {
        super(`${path}: ${reason}`);
        this.name = 'SpecArtifactProfileError';
        this.code = 'ERR_SPEC_ARTIFACT_PROFILE';
        this.path = path;
    }
}

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const fail = (path, reason) => { throw new SpecArtifactProfileError(path, reason); };
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

function record(value, path) {
    if (!isRecord(value)) fail(path, 'expected a plain object');
    return value;
}

function keys(value, allowed, path) {
    for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${path}.${key}`, 'unknown field');
}

function field(value, key, path) {
    if (!own(value, key)) fail(`${path}.${key}`, 'required field is missing');
    return value[key];
}

function text(value, path, maxLength) {
    if (typeof value !== 'string' || !value || value.trim() !== value) fail(path, 'expected a non-empty trimmed string');
    if (value.length > maxLength) fail(path, `exceeds ${maxLength} characters`);
    return value;
}

function strings(value, path, maxItems, maxLength, normalize = item => item, identity = item => item) {
    if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) fail(path, `expected 1..${maxItems} string items`);
    const seen = new Set();
    return value.map((item, index) => {
        if (typeof item !== 'string' || item.length > maxLength) fail(`${path}[${index}]`, `expected a string of at most ${maxLength} characters`);
        const normalized = normalize(item, `${path}[${index}]`);
        if (!normalized) fail(`${path}[${index}]`, 'must not be empty');
        const key = identity(normalized);
        if (seen.has(key)) fail(`${path}[${index}]`, 'duplicate value');
        seen.add(key);
        return normalized;
    });
}

function heading(value, path) {
    if (typeof value !== 'string' || value.length > PROFILE_LIMITS.headingLength) fail(path, `expected a heading of at most ${PROFILE_LIMITS.headingLength} characters`);
    return value.replace(/\s+/g, ' ').trim();
}

function sectionHeadingIdentity(value) {
    return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function root(value, path) {
    text(value, path, PROFILE_LIMITS.pathLength);
    if (value.startsWith('/') || value.includes('\\') || /^[A-Za-z]:/.test(value) || /[\u0000-\u001f\u007f<>:"|?*{}\[\]]/.test(value)) fail(path, 'expected a portable repository-relative path');
    const parts = value.split('/');
    if (parts.length > PROFILE_LIMITS.pathSegments || parts.some(part => !part || part === '.' || part === '..')) fail(path, 'path must not contain empty, "." or ".." segments');
    return value;
}

function propertyPath(value, path, simple = false) {
    text(value, path, PROFILE_LIMITS.propertyPathLength);
    const parts = value.split('.');
    if (parts.length > PROFILE_LIMITS.pathSegments || (simple && parts.length !== 1) || parts.some(part => !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(part) || ['__proto__', 'prototype', 'constructor'].includes(part))) fail(path, 'expected a literal property name path');
    return value;
}

function normalizeSections(source) {
    const path = 'specArtifacts.sections';
    record(source, path);
    keys(source, SECTION_ROLES, path);
    const result = {};
    const owners = new Map();
    for (const role of SECTION_ROLES) {
        const aliases = strings(field(source, role, path), `${path}.${role}`, PROFILE_LIMITS.headingsPerRole, PROFILE_LIMITS.headingLength, heading);
        for (const alias of aliases) {
            const identity = sectionHeadingIdentity(alias);
            if (owners.has(identity)) fail(`${path}.${role}`, `heading "${alias}" is already assigned to ${owners.get(identity)}`);
            owners.set(identity, role);
        }
        result[role] = aliases;
    }
    return result;
}

function normalizeIdentifiers(source) {
    const path = 'specArtifacts.identifiers';
    record(source, path);
    keys(source, IDENTIFIER_KINDS, path);
    const result = {};
    const prefixes = [];
    for (const kind of IDENTIFIER_KINDS) {
        const entryPath = `${path}.${kind}`;
        const entry = record(field(source, kind, path), entryPath);
        keys(entry, ['prefix', 'grammar'], entryPath);
        const prefix = text(field(entry, 'prefix', entryPath), `${entryPath}.prefix`, PROFILE_LIMITS.prefixLength);
        if (!/^[A-Za-z](?:[A-Za-z0-9-]*[A-Za-z0-9])?-$/.test(prefix) || prefix.includes('--')) fail(`${entryPath}.prefix`, 'expected a literal ASCII label ending in one hyphen');
        const grammar = field(entry, 'grammar', entryPath);
        if (!['decimal-lower-suffix', 'hyphen-tokens'].includes(grammar)) fail(`${entryPath}.grammar`, 'unsupported identifier grammar');
        prefixes.push({ kind, prefix });
        result[kind] = { prefix, grammar };
    }
    for (let i = 0; i < prefixes.length; i += 1) for (let j = i + 1; j < prefixes.length; j += 1) {
        const a = prefixes[i].prefix;
        const b = prefixes[j].prefix;
        if (a.startsWith(b) || b.startsWith(a)) fail(`${path}.${prefixes[j].kind}.prefix`, `overlaps ${prefixes[i].kind} prefix`);
    }
    return result;
}

function normalizeFields(source, path, allowed, listKey) {
    record(source, path);
    keys(source, allowed, path);
    const result = {};
    for (const key of allowed) {
        const value = field(source, key, path);
        result[key] = key === listKey
            ? strings(value, `${path}.${key}`, 16, 64, item => propertyPath(item, `${path}.${key}`, true), item => item.toLowerCase())
            : propertyPath(value, `${path}.${key}`);
    }
    if (!listKey && new Set(Object.values(result).map(value => value.toLowerCase())).size !== allowed.length) fail(path, 'field mappings must be distinct');
    return result;
}

function normalizeCarrier(source, index) {
    const path = `specArtifacts.carriers[${index}]`;
    record(source, path);
    const dialect = field(source, 'dialect', path);
    if (typeof dialect !== 'string' || !own(CARRIER_EXTRAS, dialect)) fail(`${path}.dialect`, 'unsupported carrier dialect');
    const extras = CARRIER_EXTRAS[dialect];
    keys(source, ['dialect', 'roots', 'extensions', ...extras], path);
    const roots = strings(field(source, 'roots', path), `${path}.roots`, PROFILE_LIMITS.selectors, PROFILE_LIMITS.pathLength, root, item => item.toLowerCase());
    const extensions = strings(field(source, 'extensions', path), `${path}.extensions`, PROFILE_LIMITS.selectors, PROFILE_LIMITS.extensionLength, (item, itemPath) => {
        text(item, itemPath, PROFILE_LIMITS.extensionLength);
        if (!/^\.[A-Za-z0-9][A-Za-z0-9._-]*$/.test(item)) fail(itemPath, 'expected a literal file extension suffix');
        return item;
    }, item => item.toLowerCase());
    const suffixes = dialect === 'yaml-cases-v1' ? ['.yaml', '.yml'] : ['.js', '.jsx', '.ts', '.tsx', '.cjs', '.mjs'];
    if (extensions.some(extension => !suffixes.some(suffix => extension.toLowerCase().endsWith(suffix)))) fail(`${path}.extensions`, `incompatible with ${dialect}`);
    const carrier = { dialect, roots, extensions };
    if (dialect === 'js-title-v1') {
        carrier.suiteCalls = strings(field(source, 'suiteCalls', path), `${path}.suiteCalls`, 16, 64, (item, itemPath) => {
            text(item, itemPath, 64);
            if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(item)) fail(itemPath, 'expected a literal call name');
            return item;
        });
        carrier.caseCalls = strings(field(source, 'caseCalls', path), `${path}.caseCalls`, 16, 64, (item, itemPath) => {
            text(item, itemPath, 64);
            if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(item) || carrier.suiteCalls.includes(item)) fail(itemPath, 'expected a distinct literal case call name');
            return item;
        });
    } else if (dialect === 'js-keyed-cases-v1') {
        carrier.binding = propertyPath(field(source, 'binding', path), `${path}.binding`, true);
        carrier.fields = normalizeFields(field(source, 'fields', path), `${path}.fields`, ['variant', 'scenario', 'requirements', 'rationale', 'input']);
    } else {
        carrier.fields = normalizeFields(field(source, 'fields', path), `${path}.fields`, ['scenario', 'status', 'requirements', 'acceptance', 'lists', 'variant', 'input', 'expected'], 'lists');
        carrier.acceptedStatuses = own(source, 'acceptedStatuses')
            ? strings(field(source, 'acceptedStatuses', path), `${path}.acceptedStatuses`, 16, 64, (item, itemPath) => text(item, itemPath, 64))
            : ['approved'];
    }
    return carrier;
}

function parserSignature(carrier) {
    if (carrier.dialect === 'js-title-v1') return JSON.stringify([carrier.dialect, carrier.suiteCalls, carrier.caseCalls]);
    if (carrier.dialect === 'js-keyed-cases-v1') return JSON.stringify([carrier.dialect, carrier.binding, carrier.fields]);
    return JSON.stringify([carrier.dialect, carrier.fields, carrier.acceptedStatuses]);
}

function selectorOverlap(a, b) {
    const rootsOverlap = a.roots.some(left => b.roots.some(right => {
        const x = left.toLowerCase();
        const y = right.toLowerCase();
        return x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`);
    }));
    return rootsOverlap && a.extensions.some(left => b.extensions.some(right => {
        const x = left.toLowerCase();
        const y = right.toLowerCase();
        return x.endsWith(y) || y.endsWith(x);
    }));
}

function compatibleCarriers(a, b) {
    const pair = new Set([a.dialect, b.dialect]);
    return (pair.has('js-title-v1') && pair.has('js-keyed-cases-v1')) || parserSignature(a) === parserSignature(b);
}

function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        for (const child of Object.values(value)) deepFreeze(child);
        Object.freeze(value);
    }
    return value;
}

/** Resolve a parsed project config to one immutable, data-only native artifact profile. */
function resolveSpecArtifactProfile(config) {
    record(config, 'config');
    if (!own(config, 'specArtifacts')) return null;
    const source = record(config.specArtifacts, 'specArtifacts');
    keys(source, PROFILE_KEYS, 'specArtifacts');
    const version = field(source, 'version', 'specArtifacts');
    if (version !== 1) fail('specArtifacts.version', 'expected version 1');
    const kind = field(source, 'kind', 'specArtifacts');
    if (kind !== 'engineering-contract') fail('specArtifacts.kind', 'unsupported profile kind');
    const sections = normalizeSections(field(source, 'sections', 'specArtifacts'));
    const identifiers = normalizeIdentifiers(field(source, 'identifiers', 'specArtifacts'));
    const ownership = field(source, 'ownership', 'specArtifacts');
    if (ownership !== 'spec-path-and-case-id') fail('specArtifacts.ownership', 'unsupported ownership rule');
    const rawCarriers = field(source, 'carriers', 'specArtifacts');
    if (!Array.isArray(rawCarriers) || rawCarriers.length === 0 || rawCarriers.length > PROFILE_LIMITS.carriers) fail('specArtifacts.carriers', `expected 1..${PROFILE_LIMITS.carriers} carrier definitions`);
    const carriers = rawCarriers.map(normalizeCarrier);
    for (let i = 0; i < carriers.length; i += 1) for (let j = i + 1; j < carriers.length; j += 1) {
        if (selectorOverlap(carriers[i], carriers[j]) && !compatibleCarriers(carriers[i], carriers[j])) fail(`specArtifacts.carriers[${j}]`, `overlaps incompatible carrier ${i}`);
    }
    return deepFreeze({ version, kind, sections, identifiers, ownership, carriers });
}

/** Match an identifier using only the profile's finite, named ASCII grammars. */
function matchesSpecArtifactIdentifier(profile, kind, value) {
    const identifier = profile?.identifiers?.[kind];
    if (!identifier || typeof identifier.prefix !== 'string' || typeof value !== 'string' || value.length > PROFILE_LIMITS.identifierLength || !value.startsWith(identifier.prefix)) return false;
    const body = value.slice(identifier.prefix.length);
    if (identifier.grammar === 'decimal-lower-suffix') return /^[0-9]+[a-z]*$/.test(body);
    if (identifier.grammar === 'hyphen-tokens') return /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(body);
    return false;
}

module.exports = { resolveSpecArtifactProfile, matchesSpecArtifactIdentifier, sectionHeadingIdentity, SpecArtifactProfileError, PROFILE_LIMITS };
