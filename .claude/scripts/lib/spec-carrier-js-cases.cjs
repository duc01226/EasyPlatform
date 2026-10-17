"use strict";

const {
  callsNamed,
  declarationsNamed,
  identifierUsage,
  stringValue,
} = require("./spec-carrier-js-parser.cjs");
const {
  contextWithOwners,
  metadataFromText,
  scanScenarioTitle,
  validateTextContext,
} = require("./spec-carrier-context.cjs");

const WORD = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function configuredField(fields, name) {
  const value = fields?.[name];
  return typeof value === "string" && WORD.test(value) ? value : null;
}
function propertyKey(name, ts) {
  if (ts.isComputedPropertyName(name)) return null;
  if (ts.isIdentifier(name)) return name.text;
  return stringValue(name, ts);
}
function rowsFromArray(array, sourceFile, source, spanFor, ts) {
  const rows = [];
  const unknown = [];
  for (const element of array.elements) {
    if (ts.isSpreadElement(element)) {
      unknown.push({ span: spanFor(source, element.getStart(sourceFile), element.end), reason: "case arrays cannot contain spreads" });
      continue;
    }
    if (!ts.isObjectLiteralExpression(element)) {
      unknown.push({ span: spanFor(source, element.getStart(sourceFile), element.end), reason: "case array entries must be literal object rows" });
      continue;
    }
    const properties = new Map();
    let invalid = false;
    for (const property of element.properties) {
      let reason = null;
      if (ts.isSpreadAssignment(property)) reason = "case object has a top-level spread, so mapped metadata may be hidden";
      else if (ts.isPropertyAssignment(property) && ts.isComputedPropertyName(property.name)) reason = "computed case metadata keys are unsupported";
      else if (!ts.isPropertyAssignment(property)) reason = "case object contains shorthand, method, or unsupported metadata syntax";
      const key = ts.isPropertyAssignment(property) ? propertyKey(property.name, ts) : null;
      if (!reason && !key) reason = "case object contains an unsupported metadata key";
      if (!reason && properties.has(key)) reason = "duplicate case property " + key;
      if (reason) {
        unknown.push({ span: spanFor(source, property.getStart(sourceFile), property.end), reason });
        invalid = true;
      } else properties.set(key, property.initializer);
    }
    if (!invalid) rows.push({ node: element, properties });
  }
  return { rows, unknown };
}

function recordsForKeyedCarrier({ source, file, profile, carrier, parsed, spanFor }) {
  const { ts, sourceFile } = parsed;
  const declarations = declarationsNamed(sourceFile, carrier.binding, ts);
  const records = [];
  const unknown = [];
  if (typeof carrier.binding !== "string" || !WORD.test(carrier.binding)) {
    unknown.push({ span: null, reason: "configured binding is not a simple identifier" });
    return { records, unknown };
  }
  if (declarations.length === 0) return { records, unknown };
  if (declarations.length !== 1) {
    unknown.push({ span: spanFor(source, declarations[0].getStart(sourceFile), declarations[0].end), reason: "configured binding " + carrier.binding + " has multiple declarations" });
    return { records, unknown };
  }
  const declaration = declarations[0];
  if (!declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) {
    unknown.push({ span: spanFor(source, declaration.getStart(sourceFile), declaration.end), reason: "configured binding " + carrier.binding + " is not initialized by a literal array" });
    return { records, unknown };
  }
  const mapped = rowsFromArray(declaration.initializer, sourceFile, source, spanFor, ts);
  unknown.push(...mapped.unknown);
  const titleCarrier = profile.carriers.find(candidate => candidate.dialect === "js-title-v1");
  const caseCalls = titleCarrier ? callsNamed(sourceFile, titleCarrier.caseCalls, ts) : [];
  const consumers = caseCalls.filter(call => call.body)
    .map(call => ({ call, reference: identifierUsage(call.body, carrier.binding, ts) }))
    .filter(item => item.call.body && (item.reference.referenced || item.reference.shadowed));
  const fields = carrier.fields;
  const keys = {
    variant: configuredField(fields, "variant"),
    scenario: configuredField(fields, "scenario"),
    requirements: configuredField(fields, "requirements"),
    rationale: configuredField(fields, "rationale"),
    input: configuredField(fields, "input"),
  };
  if (Object.values(keys).some(value => !value)) {
    unknown.push({ span: spanFor(source, declaration.getStart(sourceFile), declaration.end), reason: "configured keyed-case field mapping is not a supported simple literal property name" });
    return { records, unknown };
  }
  const executorCandidates = consumers.filter(item => item.reference.referenced && !item.reference.shadowed);
  const ambiguousExecutor = consumers.some(item => item.reference.shadowed);
  const suiteCalls = titleCarrier ? callsNamed(sourceFile, titleCarrier.suiteCalls, ts) : [];
  const nearestSuite = call => suiteCalls
    .filter(suite => suite.body && suite.body.getStart(sourceFile) <= call.node.getStart(sourceFile) && suite.body.end >= call.node.end)
    .sort((left, right) => (left.body.end - left.body.getStart(sourceFile)) - (right.body.end - right.body.getStart(sourceFile)))[0] ?? null;
  if (executorCandidates.length !== 1 || ambiguousExecutor) {
    const reason = executorCandidates.length > 1 || ambiguousExecutor
      ? "binding " + carrier.binding + " has multiple possible test executors"
      : "no configured test body references binding " + carrier.binding;
    for (const row of mapped.rows) unknown.push({ span: spanFor(source, row.node.getStart(sourceFile), row.node.end), reason });
    return { records, unknown };
  }
  const executor = executorCandidates[0].call.node;
  const inheritedSuite = nearestSuite(executorCandidates[0].call);
  const suiteText = inheritedSuite?.node.arguments[0] ? stringValue(inheritedSuite.node.arguments[0], ts) ?? "" : "";
  const inherited = contextWithOwners(suiteText, profile);
  for (const row of mapped.rows) {
    const rowSpan = spanFor(source, row.node.getStart(sourceFile), row.node.end);
    const values = Object.fromEntries(Object.entries(keys).map(([name, key]) => [name, row.properties.get(key)]));
    const variant = stringValue(values.variant, ts);
    const scenario = stringValue(values.scenario, ts);
    const requirements = stringValue(values.requirements, ts);
    const rationale = stringValue(values.rationale, ts);
    if ([variant, scenario, requirements, rationale].some(value => value === null) || !values.input) {
      unknown.push({ span: rowSpan, reason: "keyed case is missing a required literal id/scenario/requirements/rationale or input field" });
      continue;
    }
    const scenarioCheck = scanScenarioTitle(scenario, profile);
    const variantMetadata = metadataFromText(variant, profile);
    const requirementMetadata = contextWithOwners(requirements, profile);
    if (scenarioCheck.invalid.length || scenarioCheck.values.length !== 1 || scenarioCheck.values[0].value !== scenario) {
      unknown.push({ span: spanFor(source, values.scenario.getStart(sourceFile), values.scenario.end), reason: "keyed case scenario field is not one literal configured SCN identifier" });
      continue;
    }
    if (variantMetadata.invalidRequirements.length || variantMetadata.invalidAcceptance.length || variant.trim() !== variant || variant.length === 0) {
      unknown.push({ span: spanFor(source, values.variant.getStart(sourceFile), values.variant.end), reason: "keyed case variant id is malformed or not a trimmed literal" });
      continue;
    }
    if (requirementMetadata.invalidRequirements.length || requirementMetadata.requirementIds.length === 0) {
      unknown.push({ span: spanFor(source, values.requirements.getStart(sourceFile), values.requirements.end), reason: "keyed case requirements do not contain a valid configured REQ identifier" });
      continue;
    }
    const explicit = {
      owners: requirementMetadata.owners,
      requirementIds: requirementMetadata.requirementIds,
      acceptanceIds: requirementMetadata.acceptanceIds,
      requirementOwners: requirementMetadata.requirementOwners,
      acceptanceOwners: requirementMetadata.acceptanceOwners,
      invalidRequirements: requirementMetadata.invalidRequirements,
      invalidAcceptance: requirementMetadata.invalidAcceptance,
    };
    const validation = validateTextContext(explicit, inherited);
    if (!validation.context) {
      unknown.push({ span: rowSpan, reason: validation.reason });
      continue;
    }
    const context = validation.context;
    records.push({
      ownerToken: context.ownerToken,
      ownerPath: null,
      scenarioId: scenario,
      variantId: variant,
      requirementIds: context.requirementIds,
      acceptanceIds: context.acceptanceIds,
      rationale,
      dialect: "js-keyed-cases-v1",
      carrierFile: file,
      sourceSpan: rowSpan,
      sourceSpans: {
        variant: spanFor(source, values.variant.getStart(sourceFile), values.variant.end),
        scenario: spanFor(source, values.scenario.getStart(sourceFile), values.scenario.end),
        requirements: spanFor(source, values.requirements.getStart(sourceFile), values.requirements.end),
        rationale: spanFor(source, values.rationale.getStart(sourceFile), values.rationale.end),
        input: spanFor(source, values.input.getStart(sourceFile), values.input.end),
      },
      executor: { file, sourceSpan: spanFor(source, executor.getStart(sourceFile), executor.end), kind: "test-call-binding-reference" },
    });
  }
  return { records, unknown };
}

module.exports = { recordsForKeyedCarrier };
