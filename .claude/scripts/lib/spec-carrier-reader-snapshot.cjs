"use strict";

const path = require("node:path");
const { safeRelativePath, normalizeCandidateInventory } = require("./spec-carrier-inventory.cjs");
const { resolveSpecArtifactProfile } = require("../../hooks/lib/spec-artifact-profile.cjs");
const { resolvePortabilityToken } = require("../../hooks/lib/project-config-loader.cjs");
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const addUnknown = (result, file, reason, code = "UNKNOWN") => result.unknown.push({ code, file: file ?? null, span: null, reason });

function resolveProjectProfile(profile) {
  if (profile == null) return { configured: false, project: null, native: null };
  if (!isRecord(profile)) throw new TypeError("profile must be a project config object or null");
  if (own(profile, "specArtifacts")) return { configured: true, project: profile, native: resolveSpecArtifactProfile(profile) };
  if (profile.kind === "engineering-contract" && Array.isArray(profile.carriers)) {
    return {
      configured: true,
      project: isRecord(profile.projectConfig) ? profile.projectConfig : {},
      native: resolveSpecArtifactProfile({ specArtifacts: profile }),
    };
  }
  return { configured: false, project: profile, native: null };
}

function configuredRoot(value, fallback, label) {
  if (value == null) return fallback;
  const normalized = safeRelativePath(value);
  if (!normalized) throw new TypeError(`${label} must be a safe project-relative path`);
  return normalized;
}

function matchesCarrier(relativePath, carrier) {
  const normalized = relativePath.toLowerCase();
  const rootMatch = carrier.roots.some(root => {
    const selector = root.replace(/\\/g, "/").replace(/\/$/, "").toLowerCase();
    return normalized === selector || normalized.startsWith(`${selector}/`);
  });
  return rootMatch && carrier.extensions.some(extension => normalized.endsWith(extension.toLowerCase()));
}

function isPhysicalChild(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function prepareSpecCarrierSnapshot({ rootDir, profile, selectedFiles, readText, listFiles, resolvePhysicalPath } = {}) {
  if (typeof rootDir !== "string" || rootDir.trim() === "") throw new TypeError("rootDir must be a non-empty project path");
  if (!Array.isArray(selectedFiles)) throw new TypeError("selectedFiles must be an explicit array");
  const result = { records: [], unknown: [], selectedCount: selectedFiles.length, readCount: 0 };
  const root = path.resolve(rootDir);
  const selected = [];
  const selectedSet = new Set();
  for (const rawPath of selectedFiles) {
    const normalized = safeRelativePath(rawPath);
    if (!normalized) {
      addUnknown(result, typeof rawPath === "string" ? rawPath : null, "selected path is not a safe project-relative file path", "INVALID_SELECTION");
      continue;
    }
    if (selectedSet.has(normalized)) {
      addUnknown(result, normalized, "selected file is listed more than once", "DUPLICATE_SELECTION");
      continue;
    }
    selectedSet.add(normalized);
    selected.push(normalized);
  }

  let resolved;
  try { resolved = resolveProjectProfile(profile); }
  catch (error) {
    addUnknown(result, null, `declared spec artifact profile is invalid: ${error.message}`, "INVALID_PROFILE");
    return { result, complete: true };
  }
  if (!resolved.configured || !resolved.native) return { result, complete: true };

  let businessRoot;
  let technicalRoot = null;
  try {
    const defaultBusinessRoot = resolvePortabilityToken("SPEC_ROOT", resolved.project);
    businessRoot = configuredRoot(resolved.project?.specRoots?.business?.path, defaultBusinessRoot, "specRoots.business.path");
    const technical = resolved.project?.specRoots?.technical;
    if (technical?.authorship === "derived" && technical.path !== undefined) {
      technicalRoot = configuredRoot(technical.path, null, "specRoots.technical.path");
    }
  } catch (error) {
    addUnknown(result, null, `spec roots are invalid: ${error.message}`, "INVALID_PROFILE");
    return { result, complete: true };
  }

  if (typeof listFiles !== "function") {
    addUnknown(result, null, "candidate file inventory is required for a configured native spec profile", "MISSING_INVENTORY");
    return { result, complete: true };
  }
  let rawInventory;
  try { rawInventory = await listFiles(); }
  catch {
    addUnknown(result, null, "candidate file inventory could not be read", "INVENTORY_UNAVAILABLE");
    return { result, complete: true };
  }
  const candidate = normalizeCandidateInventory(rawInventory);
  if (!candidate.files) {
    addUnknown(result, null, candidate.reason, "INVALID_INVENTORY");
    return { result, complete: true };
  }
  if (typeof readText !== "function") {
    addUnknown(result, null, "candidate source text reader is required for a configured native spec profile", "MISSING_READ_TEXT");
    return { result, complete: true };
  }
  for (const file of selected) {
    if (!candidate.files.has(file)) addUnknown(result, file, "selected path is absent from the requested candidate inventory", "SELECTED_NOT_IN_CANDIDATE");
  }

  const cache = new Map();
  const physicalPathCache = new Map();
  const physicalPath = async relativePath => {
    if (!physicalPathCache.has(relativePath)) {
      physicalPathCache.set(relativePath, (async () => {
        if (typeof resolvePhysicalPath !== "function") return null;
        try {
          const resolvedPath = await resolvePhysicalPath(relativePath);
          return typeof resolvedPath === "string" && path.isAbsolute(resolvedPath) ? path.resolve(resolvedPath) : null;
        } catch { return null; }
      })());
    }
    return physicalPathCache.get(relativePath);
  };
  const loadText = async relativePath => {
    if (cache.has(relativePath)) return cache.get(relativePath);
    if (!candidate.files.has(relativePath)) return null;
    let contents;
    try { contents = await readText(relativePath); }
    catch { contents = null; }
    if (typeof contents !== "string" && !Buffer.isBuffer(contents)) contents = null;
    if (contents !== null) result.readCount += 1;
    const text = contents === null ? null : Buffer.isBuffer(contents) ? contents.toString("utf8") : contents;
    cache.set(relativePath, text);
    return text;
  };
  const selectedCarrierFiles = selected.filter(file => candidate.files.has(file)
    && resolved.native.carriers.some(carrier => matchesCarrier(file, carrier)));
  const sourceFiles = new Map();
  for (const file of selectedCarrierFiles) {
    const yamlCarriers = resolved.native.carriers.filter(carrier => carrier.dialect === "yaml-cases-v1" && matchesCarrier(file, carrier));
    if (yamlCarriers.length > 0) {
      let reason = null;
      let code = "UNPROVEN_CARRIER_PATH";
      if (typeof resolvePhysicalPath !== "function") {
        reason = "selected YAML carrier has no physical path provider for provenance validation";
      } else {
        const projectPath = await physicalPath(".");
        const filePath = await physicalPath(file);
        const roots = await Promise.all([...new Set(yamlCarriers.flatMap(carrier => carrier.roots))].map(physicalPath));
        if (!filePath) {
          reason = "selected YAML carrier has no resolvable physical source path";
          code = "UNREADABLE_SOURCE";
        } else if (!projectPath || !isPhysicalChild(projectPath, filePath)) {
          reason = "selected YAML carrier physical path is outside or unproven within the project root";
        } else if (!roots.some(rootPath => rootPath && isPhysicalChild(rootPath, filePath))) {
          reason = "selected YAML carrier physical path is outside or unproven within its configured carrier root";
        }
      }
      if (reason) {
        addUnknown(result, file, reason, code);
        continue;
      }
    }
    const source = await loadText(file);
    if (source === null) addUnknown(result, file, "selected carrier source is missing or unreadable in the requested source snapshot", "UNREADABLE_SOURCE");
    else sourceFiles.set(file, source);
  }
  return { result, complete: false, root, selected, resolved, businessRoot, technicalRoot, candidate, loadText, selectedCarrierFiles, sourceFiles };
}

module.exports = { prepareSpecCarrierSnapshot, matchesCarrier };
