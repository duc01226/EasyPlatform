"use strict";

const path = require("node:path");
const { parseCanonicalOwnerToken } = require("./spec-carrier-context.cjs");

function safeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0") || path.isAbsolute(value) || path.win32.isAbsolute(value)) return null;
  const normalized = path.posix.normalize(value.replace(/\\/g, "/")).replace(/^\.\//, "");
  if (normalized === "." || normalized === ".." || normalized.startsWith("../") || normalized.split("/").some(segment => segment === ".." || segment === "")) return null;
  return normalized;
}

const inside = (relativePath, directory) => relativePath === directory || relativePath.startsWith(`${directory}/`);

function normalizeCandidateInventory(paths) {
  if (!Array.isArray(paths)) return { files: null, reason: "candidate file inventory must be an explicit array" };
  const files = new Set();
  for (const value of paths) {
    const normalized = safeRelativePath(value);
    if (!normalized || normalized !== value || value.includes("\\")) {
      return { files: null, reason: "candidate file inventory contains an unsafe or non-canonical project-relative path" };
    }
    if (files.has(normalized)) return { files: null, reason: `candidate file inventory contains duplicate path ${normalized}` };
    files.add(normalized);
  }
  return { files, reason: null };
}

function findOwnerCandidates(files, businessRoot, technicalRoot, ownerToken) {
  const parsedOwner = parseCanonicalOwnerToken(ownerToken);
  if (!parsedOwner) {
    return { candidates: [], reason: `owner token ${ownerToken} is not a supported numbered spec reference` };
  }
  const { parts, number } = parsedOwner;
  const directory = path.posix.join(businessRoot, ...parts);
  if (!inside(directory, businessRoot)) return { candidates: [], reason: `owner token ${ownerToken} escapes the configured business spec root` };
  if (technicalRoot && inside(directory, technicalRoot)) {
    return { candidates: [], reason: `owner token ${ownerToken} resolves inside the derived technical spec root` };
  }
  const prefix = `${directory}/${number}-`;
  const candidates = [...files].filter(candidate => {
    if (!candidate.startsWith(prefix)) return false;
    const name = candidate.slice(prefix.length);
    return !name.includes("/") && name.toLowerCase().endsWith(".md") && !/-impl-plan\.md$/i.test(name)
      && (!technicalRoot || !inside(candidate, technicalRoot));
  });
  return { candidates, reason: null };
}

module.exports = { safeRelativePath, inside, normalizeCandidateInventory, findOwnerCandidates };
