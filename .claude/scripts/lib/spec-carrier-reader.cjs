"use strict";

const { inside, findOwnerCandidates } = require("./spec-carrier-inventory.cjs");
const { parse: parseJavaScript } = require("./spec-carrier-js-parser.cjs");
const { recordsForTitleCarrier } = require("./spec-carrier-js-title.cjs");
const { recordsForKeyedCarrier } = require("./spec-carrier-js-cases.cjs");
const { prepareSpecCarrierSnapshot, matchesCarrier } = require("./spec-carrier-reader-snapshot.cjs");
const { parseYamlCarrier } = require("./spec-carrier-yaml.cjs");
const { explicitYamlPathReferences, isYamlAdapterBinding } = require("./spec-carrier-yaml-executor.cjs");

function spanFor(source, start, end) {
  const before = source.slice(0, Math.max(0, start));
  const selected = source.slice(Math.max(0, start), Math.max(start, end));
  const startLine = before.split(/\r\n|\n|\r/).length;
  const startBreak = Math.max(before.lastIndexOf("\n"), before.lastIndexOf("\r"));
  const startColumn = start - startBreak;
  const lines = selected.split(/\r\n|\n|\r/);
  const endLine = startLine + lines.length - 1;
  const endColumn = lines.length === 1 ? startColumn + selected.length : lines[lines.length - 1].length + 1;
  return { start, end, startLine, startColumn, endLine, endColumn };
}

function addUnknown(result, file, span, reason, code = "UNKNOWN") {
  result.unknown.push({ code, file: file ?? null, span: span ?? null, reason });
}

async function readSpecCarriers(options = {}) {
  const snapshot = await prepareSpecCarrierSnapshot(options);
  const { result } = snapshot;
  if (snapshot.complete) return result;
  const { root, resolved, businessRoot, technicalRoot, candidate, loadText, selectedCarrierFiles, sourceFiles } = snapshot;
  const native = resolved.native;
  const yamlCarriers = native.carriers.filter(carrier => carrier.dialect === "yaml-cases-v1");
  const jsCarriers = native.carriers.filter(carrier => carrier.dialect === "js-title-v1" || carrier.dialect === "js-keyed-cases-v1");
  const selectedYamlPaths = new Set(selectedCarrierFiles.filter(file => yamlCarriers.some(carrier => matchesCarrier(file, carrier))));
  const pendingRecords = [];
  const yamlFiles = new Map();
  const pathReferences = new Map();
  const yamlReferencesByJs = new Map();
  const parsedJsFiles = new Map();

  for (const [file, source] of sourceFiles) {
    if (!jsCarriers.some(carrier => matchesCarrier(file, carrier))) continue;
    const parsed = parseJavaScript(source, file, root);
    parsedJsFiles.set(file, parsed);
    for (const error of parsed.errors) {
      const span = error.start === null ? null : spanFor(source, error.start, error.end);
      addUnknown(result, file, span, error.reason, error.code);
    }
  }
  for (const [file, source] of sourceFiles) {
    if (!jsCarriers.some(carrier => matchesCarrier(file, carrier))) continue;
    const parsed = parsedJsFiles.get(file);
    if (!parsed?.sourceFile || parsed.errors.length > 0) continue;
    const refs = explicitYamlPathReferences({ source, file, rootDir: root, yamlCarrierDefs: yamlCarriers, parsed, spanFor });
    for (const reference of refs) {
      const configuredYamlPath = yamlCarriers.some(carrier => carrier.roots.some(root => inside(reference.path, root)));
      if (!configuredYamlPath) continue;
      if (reference.unresolved || !reference.contractBinding) {
        addUnknown(result, file, reference.span, "YAML carrier path literal is not statically tied to a parsed contract binding", "UNRESOLVED_EXECUTOR");
        continue;
      }
      if (!selectedYamlPaths.has(reference.path)) {
        addUnknown(result, file, reference.span, "source references YAML carrier " + reference.path + ", but it is omitted from selectedFiles or unsupported by this profile", "SELECTION_OMISSION");
        continue;
      }
      if (!yamlReferencesByJs.has(file)) yamlReferencesByJs.set(file, []);
      yamlReferencesByJs.get(file).push(reference);
    }
  }

  for (const [file, source] of sourceFiles) {
    for (const carrier of yamlCarriers.filter(item => matchesCarrier(file, item))) {
      const parsed = parseYamlCarrier({ rootDir: root, source, file, profile: native, carrier, spanFor });
      yamlFiles.set(file, parsed);
      for (const item of parsed.unknown) addUnknown(result, file, item.span, item.reason, item.code);
    }
  }

  const yamlAdapterBindings = new Map();
  for (const [file, references] of yamlReferencesByJs) {
    const parsed = parsedJsFiles.get(file);
    const keyedCarriers = native.carriers.filter(item => item.dialect === "js-keyed-cases-v1" && matchesCarrier(file, item));
    const reference = references.length === 1 ? references[0] : null;
    const expectedLists = reference ? yamlFiles.get(reference.path)?.caseLists ?? [] : [];
    const adapters = reference && parsed?.sourceFile && parsed.errors.length === 0
      ? keyedCarriers.filter(carrier => isYamlAdapterBinding(parsed, carrier.binding, expectedLists, reference.contractBinding))
      : [];
    if (adapters.length !== 1) {
      for (const item of references) {
        addUnknown(result, file, item.span, references.length === 1
          ? "loaded YAML carrier is not statically connected to one configured list adapter binding"
          : "source file loads multiple YAML carriers; executor mapping is ambiguous", "UNRESOLVED_EXECUTOR");
      }
      continue;
    }
    if (!yamlAdapterBindings.has(file)) yamlAdapterBindings.set(file, new Set());
    yamlAdapterBindings.get(file).add(adapters[0].binding);
    if (!pathReferences.has(reference.path)) pathReferences.set(reference.path, []);
    pathReferences.get(reference.path).push({ file, span: reference.span });
  }

  for (const [file, source] of sourceFiles) {
    for (const carrier of native.carriers.filter(item => matchesCarrier(file, item))) {
      if (carrier.dialect === "js-title-v1") {
        const parsed = parsedJsFiles.get(file);
        if (!parsed?.sourceFile || parsed.errors.length > 0) continue;
        const extracted = recordsForTitleCarrier({ source, file, profile: native, carrier, parsed, spanFor });
        pendingRecords.push(...extracted.records);
        for (const item of extracted.unknown) addUnknown(result, file, item.span, item.reason);
      } else if (carrier.dialect === "js-keyed-cases-v1") {
        const parsed = parsedJsFiles.get(file);
        if (!parsed?.sourceFile || parsed.errors.length > 0) continue;
        const yamlAdapter = yamlAdapterBindings.get(file)?.has(carrier.binding) ?? false;
        if (!yamlAdapter) {
          const extracted = recordsForKeyedCarrier({ source, file, profile: native, carrier, parsed, spanFor });
          pendingRecords.push(...extracted.records);
          for (const item of extracted.unknown) addUnknown(result, file, item.span, item.reason);
        }
      } else if (carrier.dialect === "yaml-cases-v1") {
        continue;
      } else {
        addUnknown(result, file, null, "unsupported configured carrier dialect " + carrier.dialect, "UNSUPPORTED_DIALECT");
      }
    }
  }

  for (const [file, parsed] of yamlFiles) {
    const refs = pathReferences.get(file) ?? [];
    const byExecutor = new Map();
    for (const reference of refs) {
      if (!byExecutor.has(reference.file)) byExecutor.set(reference.file, []);
      byExecutor.get(reference.file).push(reference.span);
    }
    if (byExecutor.size === 0) {
      addUnknown(result, file, null, "no selected source file contains an explicit literal path reference to this YAML carrier", "UNRESOLVED_EXECUTOR");
      continue;
    }
    const executors = [...byExecutor].sort(([left], [right]) => left.localeCompare(right))
      .map(([executorFile, sourceSpans]) => ({ file: executorFile, sourceSpans, kind: "explicit-yaml-path-reference" }));
    for (const record of parsed.records) {
      record.executors = executors;
    }
    pendingRecords.push(...parsed.records);
  }

  const resolvedOwners = new Map();
  for (const record of pendingRecords) {
    if (!resolvedOwners.has(record.ownerToken)) {
      const resolution = findOwnerCandidates(candidate.files, businessRoot, technicalRoot, record.ownerToken);
      let ownerPath = null;
      if (resolution.reason) {
        addUnknown(result, record.carrierFile, record.sourceSpan, resolution.reason, "UNRESOLVED_OWNER");
      } else if (resolution.candidates.length !== 1) {
        const reason = resolution.candidates.length === 0
          ? "owner " + record.ownerToken + " has no canonical numbered Markdown spec in the candidate inventory"
          : "owner " + record.ownerToken + " resolves to multiple numbered Markdown specs in the candidate inventory";
        addUnknown(result, record.carrierFile, record.sourceSpan, reason, "UNRESOLVED_OWNER");
      } else {
        ownerPath = resolution.candidates[0];
        if (await loadText(ownerPath) === null) {
          addUnknown(result, record.carrierFile, record.sourceSpan, "canonical owner " + ownerPath + " is unavailable in the selected source snapshot");
          ownerPath = null;
        }
      }
      resolvedOwners.set(record.ownerToken, ownerPath);
    }
    record.ownerPath = resolvedOwners.get(record.ownerToken);
  }
  const invalidOwners = new Set([...resolvedOwners].filter(([, value]) => !value).map(([key]) => key));
  const validRecords = pendingRecords.filter(record => !invalidOwners.has(record.ownerToken));
  const variantGroups = new Map();
  for (const record of validRecords) {
    if (record.variantId === null) continue;
    const key = record.ownerPath + "\0" + record.scenarioId + "\0" + record.variantId;
    if (!variantGroups.has(key)) variantGroups.set(key, []);
    variantGroups.get(key).push(record);
  }
  const duplicates = new Set();
  for (const group of variantGroups.values()) {
    if (group.length < 2) continue;
    for (const record of group) {
      duplicates.add(record);
      addUnknown(result, record.carrierFile, record.sourceSpan, "duplicate owner+scenario+variant identity "
        + record.ownerPath + " · " + record.scenarioId + " · " + record.variantId, "DUPLICATE_IDENTITY");
    }
  }
  result.records = validRecords.filter(record => !duplicates.has(record));
  return result;
}

module.exports = { readSpecCarriers };
