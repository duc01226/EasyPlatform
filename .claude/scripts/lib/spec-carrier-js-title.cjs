"use strict";

const {
  callsNamed,
  contains,
  span,
  stringValue,
} = require("./spec-carrier-js-parser.cjs");
const { scanScenarioTitle, contextWithOwners, validateTextContext } = require("./spec-carrier-context.cjs");

function titleExpression(call, sourceFile, source, ts) {
  const node = call.node.arguments[0];
  const value = node ? stringValue(node, ts) : null;
  if (value !== null) return { value, supported: true, ...span(node, sourceFile) };
  if (!node) return { value: null, supported: false, start: null, end: null };
  const range = span(node, sourceFile);
  return { value: source.slice(range.start, range.end), supported: false, ...range };
}

function recordsForTitleCarrier({ source, file, profile, carrier, parsed, spanFor }) {
  const { ts, sourceFile } = parsed;
  const suites = callsNamed(sourceFile, carrier.suiteCalls, ts).map(call => ({
    ...call,
    title: titleExpression(call, sourceFile, source, ts),
  }));
  const testCalls = callsNamed(sourceFile, carrier.caseCalls, ts);
  const records = [];
  const unknown = [];
  const scenarioPrefix = profile.identifiers.scenario.prefix;
  for (const call of testCalls) {
    const title = titleExpression(call, sourceFile, source, ts);
    if (!title.supported) {
      if (typeof title.value === "string" && title.value.includes(scenarioPrefix)) {
        unknown.push({ span: spanFor(source, title.start, title.end), reason: "dynamic or compound test title may interpolate a configured scenario identifier" });
      }
      continue;
    }
    const scenarios = scanScenarioTitle(title.value, profile);
    if (scenarios.invalid.length) {
      unknown.push({ span: spanFor(source, title.start, title.end), reason: "test title contains a malformed configured scenario identifier" });
      continue;
    }
    if (!scenarios.values.length) continue;
    const ancestors = suites
      .filter(suite => suite.body && contains(suite.body, call.node, sourceFile))
      .sort((left, right) => {
        const leftRange = span(left.body, sourceFile);
        const rightRange = span(right.body, sourceFile);
        return (leftRange.end - leftRange.start) - (rightRange.end - rightRange.start);
      });
    const inherited = ancestors.length ? contextWithOwners(ancestors[0].title.value ?? "", profile) : null;
    const explicit = contextWithOwners(title.value, profile);
    const validation = validateTextContext(explicit, inherited);
    if (!validation.context) {
      unknown.push({ span: spanFor(source, title.start, title.end), reason: validation.reason });
      continue;
    }
    const context = validation.context;
    for (const scenario of scenarios.values) {
      const callRange = span(call.node, sourceFile);
      const callSpan = spanFor(source, callRange.start, callRange.end);
      const titleSpan = spanFor(source, title.start, title.end);
      records.push({
        ownerToken: context.ownerToken,
        ownerPath: null,
        scenarioId: scenario.value,
        variantId: null,
        requirementIds: context.requirementIds,
        acceptanceIds: context.acceptanceIds,
        rationale: null,
        dialect: "js-title-v1",
        carrierFile: file,
        sourceSpan: callSpan,
        sourceSpans: { title: titleSpan, scenario: titleSpan, owner: titleSpan },
        executor: { file, sourceSpan: callSpan, kind: "test-call" },
      });
    }
  }
  return { records, unknown };
}

module.exports = { recordsForTitleCarrier };
