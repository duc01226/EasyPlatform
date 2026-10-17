"use strict";

const { matchesSpecArtifactIdentifier } = require("../../hooks/lib/spec-artifact-profile.cjs");

const OWNER_TOKEN = /(?:^|[^A-Za-z0-9_-])((?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\/\d{3})(?=$|[^A-Za-z0-9_-])/g;

function scanConfiguredIds(text, profile, kind) {
  const spec = profile?.identifiers?.[kind];
  if (!spec || typeof spec.prefix !== "string" || typeof text !== "string") {
    return { values: [], invalid: [] };
  }
  const { prefix } = spec;
  const values = [];
  const invalid = [];
  let cursor = 0;
  while (cursor < text.length) {
    const at = text.indexOf(prefix, cursor);
    if (at < 0) break;
    cursor = at + prefix.length;
    const previous = at > 0 ? text[at - 1] : "";
    if (/[A-Za-z0-9_-]/.test(previous)) continue;
    let end = cursor;
    while (end < text.length && /[A-Za-z0-9-]/.test(text[end])) end += 1;
    const body = text.slice(cursor, end);
    const after = text[end] ?? "";
    if (!body || /[A-Za-z0-9_-]/.test(after)) {
      invalid.push({ value: text.slice(at, Math.max(end, cursor)), start: at, end: Math.max(end, cursor) });
      continue;
    }
    const value = text.slice(at, end);
    if (matchesSpecArtifactIdentifier(profile, kind, value)) values.push({ value, start: at, end });
    else invalid.push({ value, start: at, end });
  }
  return { values, invalid };
}

function scanOwnerTokens(text) {
  const values = [];
  OWNER_TOKEN.lastIndex = 0;
  let match;
  while ((match = OWNER_TOKEN.exec(text)) !== null) values.push(match[1]);
  return [...new Set(values)];
}

function parseCanonicalOwnerToken(ownerToken) {
  if (typeof ownerToken !== "string") return null;
  const parts = ownerToken.split("/");
  const number = parts.pop();
  if (!/^\d{3}$/.test(number) || parts.length === 0 || parts.some(part => !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(part))) return null;
  return { parts, number };
}

function metadataFromText(text, profile) {
  const requirements = scanConfiguredIds(text, profile, "requirement");
  const acceptance = scanConfiguredIds(text, profile, "acceptance");
  return {
    owners: scanOwnerTokens(text),
    requirementIds: requirements.values.map(item => item.value),
    acceptanceIds: acceptance.values.map(item => item.value),
    invalidRequirements: requirements.invalid,
    invalidAcceptance: acceptance.invalid,
  };
}

function yamlContextFromRefs(values, profile, kind) {
  const all = [];
  const invalid = [];
  for (const value of values) {
    const info = metadataFromText(value, profile);
    all.push(info);
    const ids = kind === "requirement" ? info.requirementIds : info.acceptanceIds;
    const bad = kind === "requirement" ? info.invalidRequirements : info.invalidAcceptance;
    if (ids.length === 0 || bad.length > 0) invalid.push(value);
  }
  return {
    owners: [...new Set(all.flatMap(item => item.owners))],
    ids: [...new Set(all.flatMap(item => kind === "requirement" ? item.requirementIds : item.acceptanceIds))],
    invalid,
  };
}

function scanScenarioTitle(title, profile) {
  return scanConfiguredIds(title, profile, "scenario");
}

function validateTextContext(explicit, inherited) {
  const failure = reason => ({ context: null, reason });
  if (explicit.invalidRequirements.length > 0 || explicit.invalidAcceptance.length > 0) {
    return failure("title or metadata contains an invalid configured REQ/AC identifier");
  }
  const ownOwners = explicit.owners;
  const inheritedOwners = inherited?.owners ?? [];
  if (ownOwners.length > 1 || inheritedOwners.length > 1) return failure("carrier context names multiple spec owners");
  const ownOwner = ownOwners[0] ?? null;
  const inheritedOwner = inheritedOwners[0] ?? null;
  const ownRequirementOwner = explicit.requirementOwners?.[0] ?? null;
  if (explicit.requirementOwners?.length > 1) return failure("requirement references name inconsistent spec owners");
  const ownAcceptanceOwner = explicit.acceptanceOwners?.[0] ?? null;
  if (explicit.acceptanceOwners?.length > 1) return failure("acceptance references name inconsistent spec owners");
  const refOwners = [ownRequirementOwner, ownAcceptanceOwner].filter(Boolean);
  if (new Set(refOwners).size > 1) return failure("requirement and acceptance references name different spec owners");
  const referenceOwner = refOwners[0] ?? null;
  if (ownOwner && referenceOwner && ownOwner !== referenceOwner) {
    return failure("explicit owner conflicts with the owner in its requirement/acceptance references");
  }
  const explicitOwner = ownOwner ?? referenceOwner;
  const explicitHasRefs = explicit.requirementIds.length > 0 || explicit.acceptanceIds.length > 0;
  if (explicitOwner && inheritedOwner && explicitOwner !== inheritedOwner && !explicitHasRefs) {
    return failure("inner owner override has no matching requirement or acceptance reference");
  }
  if (explicitOwner && inheritedOwner && explicitOwner !== inheritedOwner && referenceOwner !== explicitOwner) {
    return failure("inner owner override conflicts with inherited suite requirements");
  }
  const ownerToken = explicitOwner ?? inheritedOwner;
  const requirementIds = explicit.requirementIds.length ? explicit.requirementIds : (inherited?.requirementIds ?? []);
  const acceptanceIds = explicit.acceptanceIds.length ? explicit.acceptanceIds : (inherited?.acceptanceIds ?? []);
  if (!ownerToken) return failure("scenario has no explicit or inherited canonical spec owner");
  if (requirementIds.length === 0) return failure("scenario has no explicit or inherited requirement reference");
  return { context: { ownerToken, requirementIds: [...new Set(requirementIds)], acceptanceIds: [...new Set(acceptanceIds)] }, reason: null };
}

function contextWithOwners(text, profile) {
  const info = metadataFromText(text, profile);
  const reqRefs = scanConfiguredIds(text, profile, "requirement");
  const acRefs = scanConfiguredIds(text, profile, "acceptance");
  return {
    owners: info.owners,
    requirementIds: reqRefs.values.map(item => item.value),
    acceptanceIds: acRefs.values.map(item => item.value),
    requirementOwners: reqRefs.values.length ? info.owners : [],
    acceptanceOwners: acRefs.values.length ? info.owners : [],
    invalidRequirements: reqRefs.invalid,
    invalidAcceptance: acRefs.invalid,
  };
}

module.exports = {
  scanConfiguredIds,
  scanOwnerTokens,
  parseCanonicalOwnerToken,
  metadataFromText,
  yamlContextFromRefs,
  scanScenarioTitle,
  validateTextContext,
  contextWithOwners,
};
