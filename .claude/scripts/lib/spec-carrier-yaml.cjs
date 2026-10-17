"use strict";

const path = require("node:path");
const { createRequire } = require("node:module");
const { yamlContextFromRefs, scanScenarioTitle } = require("./spec-carrier-context.cjs");

const WORD = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const unknown = (file, span, reason, code = "UNKNOWN") => ({ code, file, span, reason });
const yamlParser = rootDir => {
  try { return createRequire(path.join(path.resolve(rootDir), "package.json"))("yaml"); }
  catch { return null; }
};
const spanOf = (source, node, spanFor) => {
  const range = node?.range;
  return Array.isArray(range) && Number.isInteger(range[0])
    ? spanFor(source, range[0], Number.isInteger(range[2]) ? range[2] : range[1]) : null;
};
const scalarText = (yaml, node) => yaml.isScalar(node) && typeof node.value === "string" ? node.value : null;
const pathParts = value => typeof value === "string" ? value.split(".").every(part => WORD.test(part)) ? value.split(".") : null : null;
const field = (yaml, map, name) => yaml.isMap(map)
  ? map.items.find(item => scalarText(yaml, item.key) === name)?.value ?? null : null;
const atPath = (yaml, root, configuredPath) => pathParts(configuredPath)?.reduce((node, part) => node === null ? null : field(yaml, node, part), root) ?? null;
function unsupportedNode(yaml, document, source, spanFor) {
  let found = null;
  yaml.visit(document, {
    Node(_key, node) {
      const reason = yaml.isAlias(node) || node.anchor ? "YAML anchors and aliases are unsupported" : node.tag ? "YAML explicit tags are unsupported" : null;
      if (reason) { found = { node, reason }; return yaml.visit.BREAK; }
    },
    Pair(_key, pair) {
      if (yaml.isScalar(pair.key) && pair.key.value === "<<" && pair.key.type === "PLAIN") {
        found = { node: pair.key, reason: "YAML merge keys are unsupported" };
        return yaml.visit.BREAK;
      }
    },
  });
  return found && { ...found, span: spanOf(source, found.node, spanFor) };
}

const diagnosticUnknown = (file, source, diagnostic, spanFor) => {
  const pos = diagnostic?.pos;
  const span = Array.isArray(pos) && Number.isInteger(pos[0]) ? spanFor(source, pos[0], Number.isInteger(pos[1]) ? pos[1] : pos[0] + 1) : null;
  return unknown(file, span, `YAML parser diagnostic: ${diagnostic?.message ?? "invalid syntax"}`);
};
const stringList = (yaml, node, label) => {
  if (!yaml.isSeq(node)) return { values: [], reason: `${label} must be a YAML sequence` };
  const values = node.items.map(item => scalarText(yaml, item));
  return values.some(value => value === null) ? { values: [], reason: `${label} must contain only literal strings` } : { values, reason: null };
};
const configuredScalar = (fields, name) => typeof fields?.[name] === "string" && WORD.test(fields[name]) ? fields[name] : null;
function parseYamlCarrier({ rootDir, source, file, profile, carrier, spanFor }) {
  const yaml = yamlParser(rootDir);
  if (!yaml?.parseDocument || !yaml.visit) {
    return { records: [], unknown: [unknown(file, null, "configured YAML parser is unavailable", "MISSING_PARSER")] };
  }
  let document;
  try { document = yaml.parseDocument(source, { uniqueKeys: true, prettyErrors: false }); }
  catch (error) { return { records: [], unknown: [unknown(file, null, `YAML parser failed: ${error.message}`)] }; }
  const diagnostic = [...(document.errors ?? []), ...(document.warnings ?? [])][0];
  if (diagnostic) return { records: [], unknown: [diagnosticUnknown(file, source, diagnostic, spanFor)] };
  const unsupported = unsupportedNode(yaml, document, source, spanFor);
  if (unsupported) return { records: [], unknown: [unknown(file, unsupported.span, unsupported.reason)] };
  if (!yaml.isMap(document.contents)) {
    return { records: [], unknown: [unknown(file, spanOf(source, document.contents, spanFor), "YAML carrier root must be a mapping")] };
  }

  const fields = carrier.fields ?? {};
  const scenarioKey = configuredScalar(fields, "scenario");
  const statusKey = configuredScalar(fields, "status");
  if (!scenarioKey || !statusKey || !Array.isArray(fields.lists) || fields.lists.length < 1
      || fields.lists.some(name => !pathParts(name) || pathParts(name).length !== 1)) {
    return { records: [], unknown: [unknown(file, null, "configured YAML scenario/status/list field mapping is unsupported")] };
  }
  const scenarioNode = field(yaml, document.contents, scenarioKey);
  const statusNode = field(yaml, document.contents, statusKey);
  const scenarioId = scalarText(yaml, scenarioNode);
  const status = scalarText(yaml, statusNode);
  const scenarioCheck = scenarioId ? scanScenarioTitle(scenarioId, profile) : { values: [], invalid: [] };
  if (!scenarioId || scenarioCheck.invalid.length || scenarioCheck.values.length !== 1 || scenarioCheck.values[0].value !== scenarioId) {
    return { records: [], unknown: [unknown(file, spanOf(source, scenarioNode, spanFor), "YAML top-level scenario field is missing or not one literal configured SCN identifier")] };
  }
  const acceptedStatuses = carrier.acceptedStatuses ?? [];
  if (!acceptedStatuses.includes(status)) {
    return { records: [], unknown: [unknown(file, spanOf(source, statusNode, spanFor), `YAML scenario status must match one configured accepted value (${acceptedStatuses.join(", ")}); observed ${status ?? "missing/unsupported"}`)] };
  }

  const requirementsNode = atPath(yaml, document.contents, fields.requirements);
  const acceptanceNode = atPath(yaml, document.contents, fields.acceptance);
  const requirements = stringList(yaml, requirementsNode, "YAML requirement coverage");
  const acceptance = stringList(yaml, acceptanceNode, "YAML acceptance coverage");
  if (requirements.reason || requirements.values.length === 0) {
    return { records: [], unknown: [unknown(file, spanOf(source, requirementsNode, spanFor), requirements.reason ?? "YAML requirement coverage list is empty")] };
  }
  if (acceptance.reason) {
    return { records: [], unknown: [unknown(file, spanOf(source, acceptanceNode, spanFor), acceptance.reason)] };
  }
  const requirementRefs = yamlContextFromRefs(requirements.values, profile, "requirement");
  const acceptanceRefs = yamlContextFromRefs(acceptance.values, profile, "acceptance");
  if (requirementRefs.invalid.length || requirementRefs.ids.length === 0 || acceptanceRefs.invalid.length) {
    return { records: [], unknown: [unknown(file, spanOf(source, requirementsNode, spanFor), "YAML coverage lists contain missing, unsupported, or invalid configured REQ/AC references")] };
  }
  const owners = [...new Set([...requirementRefs.owners, ...acceptanceRefs.owners])];
  if (owners.length !== 1) {
    const reason = owners.length === 0 ? "YAML coverage lists do not name a canonical spec owner" : "YAML requirement/acceptance lists name multiple spec owners";
    return { records: [], unknown: [unknown(file, spanOf(source, requirementsNode, spanFor), reason)] };
  }

  const shared = {
    ownerToken: owners[0], scenarioId, scenarioSpan: spanOf(source, scenarioNode, spanFor), statusSpan: spanOf(source, statusNode, spanFor),
    requirementIds: requirementRefs.ids, acceptanceIds: acceptanceRefs.ids,
    requirementSpan: spanOf(source, requirementsNode, spanFor), acceptanceSpan: spanOf(source, acceptanceNode, spanFor),
  };
  const listNodes = fields.lists.map(name => ({ name, node: field(yaml, document.contents, name) }))
    .filter(item => item.node !== null);
  if (listNodes.length === 0) {
    return { records: [], caseLists: [], unknown: [unknown(file, spanOf(source, document.contents, spanFor), "at least one configured YAML case list must be present")] };
  }
  const malformedList = listNodes.find(item => !yaml.isSeq(item.node));
  if (malformedList) return { records: [], caseLists: listNodes.map(item => item.name), unknown: [unknown(file, spanOf(source, malformedList.node, spanFor), `configured YAML case list ${malformedList.name} must be a sequence`)] };

  const variantKey = configuredScalar(fields, "variant");
  const inputKey = configuredScalar(fields, "input");
  const expectedKey = configuredScalar(fields, "expected");
  if (!variantKey || !inputKey || !expectedKey) {
    return { records: [], unknown: [unknown(file, null, "configured YAML case field mapping is not a supported simple property name")] };
  }
  const records = [];
  const unknowns = [];
  for (const { name, node: listNode } of listNodes) {
    for (const row of listNode.items) {
      const variantNode = field(yaml, row, variantKey);
      const inputNode = field(yaml, row, inputKey);
      const expectedNode = field(yaml, row, expectedKey);
      const variant = scalarText(yaml, variantNode);
      const rowSpan = spanOf(source, row, spanFor);
      if (!yaml.isMap(row) || !variant || !inputNode || !expectedNode) {
        unknowns.push(unknown(file, rowSpan, "YAML case is missing a literal variant id, input subtree, or expected subtree"));
        continue;
      }
      if (variant.trim() !== variant || /\$\{[^}]*\}|\{\{.*\}\}/.test(variant)) {
        unknowns.push(unknown(file, spanOf(source, variantNode, spanFor), "YAML case variant id is dynamic or malformed"));
        continue;
      }
      records.push({
        ownerToken: shared.ownerToken, ownerPath: null, scenarioId, variantId: variant,
        requirementIds: shared.requirementIds, acceptanceIds: shared.acceptanceIds, rationale: null,
        dialect: "yaml-cases-v1", carrierFile: file, caseList: name, sourceSpan: rowSpan,
        sourceSpans: {
          scenario: shared.scenarioSpan, status: shared.statusSpan, variant: spanOf(source, variantNode, spanFor),
          requirements: shared.requirementSpan, acceptance: shared.acceptanceSpan,
          input: spanOf(source, inputNode, spanFor), expected: spanOf(source, expectedNode, spanFor),
        },
        executors: [],
      });
    }
  }
  if (records.length === 0 && unknowns.length === 0) unknowns.push(unknown(file, spanOf(source, listNodes[0]?.node, spanFor), "YAML carrier contains no supported case rows"));
  return { records, caseLists: listNodes.map(item => item.name), unknown: unknowns };
}
module.exports = { parseYamlCarrier };
