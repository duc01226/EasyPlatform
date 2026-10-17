"use strict";

const path = require("node:path");
const { safeRelativePath } = require("./spec-carrier-inventory.cjs");
const { visit: visitTs, span: tsSpan, stringValue, declarationsNamed } = require("./spec-carrier-js-parser.cjs");
const { moduleNamespaceBinding, importedModuleCall } = require("./spec-carrier-module-bindings.cjs");
const { resolveValueBinding } = require("./spec-carrier-lexical-bindings.cjs");

function unwrapTs(node, ts) {
  while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)
      || ts.isNonNullExpression(node) || ts.isSatisfiesExpression?.(node))) node = node.expression;
  return node;
}

function isConstDeclaration(declaration, ts) {
  const list = declaration?.parent;
  return Boolean(list && ts.isVariableDeclarationList(list) && (list.flags & ts.NodeFlags.Const));
}

function isPathResolveCall(node, parsed) {
  const { ts, sourceFile } = parsed;
  return ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
    && node.expression.name.text === "resolve" && ts.isIdentifier(node.expression.expression)
    && moduleNamespaceBinding(node.expression.expression, sourceFile, ts, ["node:path", "path"]);
}

function isConfiguredYamlPath(target, yamlCarrierDefs) {
  return Boolean(target && yamlCarrierDefs.some(carrier => carrier.roots.some(root => {
    const safeRoot = safeRelativePath(root);
    return safeRoot && (target === safeRoot || target.startsWith(`${safeRoot}/`));
  })));
}

function resolvePathLiteral(rootDir, sourceFile, value, yamlCarrierDefs) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0") || path.isAbsolute(value) || path.win32.isAbsolute(value)) return null;
  const rootForm = value.replace(/\\/g, "/").replace(/^\.\//, "");
  const roots = yamlCarrierDefs.flatMap(carrier => carrier.roots.map(safeRelativePath)).filter(Boolean);
  const rootPath = roots.find(root => rootForm === root || rootForm.startsWith(`${root}/`));
  const full = rootPath ? path.resolve(rootDir, rootForm) : path.resolve(rootDir, path.dirname(sourceFile), value);
  return safeRelativePath(path.relative(rootDir, full).split(path.sep).join("/").replace(/\\/g, "/"));
}

function constString(node, parsed, seen = new Set()) {
  const { ts, sourceFile } = parsed;
  node = unwrapTs(node, ts);
  const value = stringValue(node, ts);
  if (typeof value === "string") return value;
  if (!node || !ts.isIdentifier(node) || seen.has(node.text)) return null;
  const binding = resolveValueBinding(node, sourceFile, ts);
  if (binding.status !== "resolved" || !ts.isVariableDeclaration(binding.declaration)
      || !isConstDeclaration(binding.declaration, ts) || seen.has(binding.declaration)) return null;
  seen.add(binding.declaration);
  return constString(binding.declaration.initializer, parsed, seen);
}

function isSourceDirectory(node, parsed, seen = new Set()) {
  const { ts, sourceFile } = parsed;
  node = unwrapTs(node, ts);
  if (node && ts.isIdentifier(node) && node.text === "__dirname") return resolveValueBinding(node, sourceFile, ts).status === "unbound";
  if (!node || !ts.isIdentifier(node)) return false;
  const binding = resolveValueBinding(node, sourceFile, ts);
  if (binding.status !== "resolved" || !ts.isVariableDeclaration(binding.declaration)
      || !isConstDeclaration(binding.declaration, ts) || seen.has(binding.declaration)) return false;
  seen.add(binding.declaration);
  return isSourceDirectory(binding.declaration.initializer, parsed, seen);
}

function staticPathResolve(node, { rootDir, file, yamlCarrierDefs, parsed }) {
  if (!isPathResolveCall(node, parsed) || node.arguments.length < 2 || !isSourceDirectory(node.arguments[0], parsed)) return null;
  const suffixes = node.arguments.slice(1).map(argument => constString(argument, parsed));
  if (suffixes.some(value => value === null || value.includes("\0") || path.isAbsolute(value) || path.win32.isAbsolute(value))) return null;
  if (!/\.ya?ml$/i.test(suffixes[suffixes.length - 1])) return null;
  const absolute = path.resolve(rootDir, path.dirname(file), ...suffixes);
  const target = safeRelativePath(path.relative(rootDir, absolute).split(path.sep).join("/"));
  return isConfiguredYamlPath(target, yamlCarrierDefs) ? { path: target, node: node.arguments[node.arguments.length - 1] } : null;
}

function resolveStaticYamlPath(node, context, seen = new Set()) {
  const { rootDir, file, yamlCarrierDefs, parsed } = context;
  const { ts, sourceFile } = parsed;
  node = unwrapTs(node, ts);
  if (!node) return null;
  const value = stringValue(node, ts);
  if (typeof value === "string" && /\.ya?ml$/i.test(value)) {
    const target = resolvePathLiteral(rootDir, file, value, yamlCarrierDefs);
    return isConfiguredYamlPath(target, yamlCarrierDefs) ? { path: target, node } : null;
  }
  if (ts.isIdentifier(node)) {
    const binding = resolveValueBinding(node, sourceFile, ts);
    if (binding.status !== "resolved" || !ts.isVariableDeclaration(binding.declaration)
        || !isConstDeclaration(binding.declaration, ts) || seen.has(binding.declaration)) return null;
    seen.add(binding.declaration);
    return resolveStaticYamlPath(binding.declaration.initializer, context, seen);
  }
  return ts.isCallExpression(node) ? staticPathResolve(node, context) : null;
}

function yamlParserCall(initializer, parsed) {
  const { ts, sourceFile } = parsed;
  const value = unwrapTs(initializer, ts);
  if (!value) return null;
  if (ts.isCallExpression(value) && ts.isPropertyAccessExpression(value.expression)
      && value.expression.name.text === "toJS" && value.arguments.length === 0) {
    const documentCall = unwrapTs(value.expression.expression, ts);
    return importedModuleCall(documentCall, sourceFile, ts, ["yaml"], ["parseDocument"]) ? documentCall : null;
  }
  return importedModuleCall(value, sourceFile, ts, ["yaml"], ["parse"]) ? value : null;
}

function parsedYamlLoads({ rootDir, file, yamlCarrierDefs, parsed }) {
  const loads = [];
  const { ts, sourceFile } = parsed;
  visitTs(sourceFile, ts, node => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !isConstDeclaration(node, ts)) return;
    const parserCall = yamlParserCall(node.initializer, parsed);
    if (!parserCall) return;
    const read = unwrapTs(parserCall.arguments[0], ts);
    if (!importedModuleCall(read, sourceFile, ts, ["node:fs", "fs"], ["readFileSync"])) return;
    const pathReference = resolveStaticYamlPath(read.arguments[0], { rootDir, file, yamlCarrierDefs, parsed });
    if (!pathReference) return;
    const range = tsSpan(pathReference.node, sourceFile);
    loads.push({ path: pathReference.path, contractBinding: node, range });
  });
  return loads;
}

function explicitYamlPathReferences({ source, file, rootDir, yamlCarrierDefs, parsed, spanFor }) {
  if (!parsed?.sourceFile || parsed.errors.length > 0) return [];
  const loads = parsedYamlLoads({ rootDir, file, yamlCarrierDefs, parsed });
  const references = loads.map(load => ({ ...load, span: spanFor(source, load.range.start, load.range.end) }));
  const loadedPaths = new Set(loads.map(load => load.path));
  visitTs(parsed.sourceFile, parsed.ts, node => {
    const value = stringValue(node, parsed.ts);
    if (typeof value !== "string" || !/\.ya?ml$/i.test(value)) return;
    const target = resolvePathLiteral(rootDir, file, value, yamlCarrierDefs);
    if (isConfiguredYamlPath(target, yamlCarrierDefs) && !loadedPaths.has(target)) {
      const range = tsSpan(node, parsed.sourceFile);
      references.push({ path: target, contractBinding: null, unresolved: true, span: spanFor(source, range.start, range.end) });
    }
  });
  return references.sort((left, right) => left.path.localeCompare(right.path) || left.span.start - right.span.start);
}

function yamlListReference(node, ts) {
  const properties = [];
  while (ts.isPropertyAccessExpression(node)) {
    properties.unshift(node.name.text);
    node = node.expression;
  }
  return ts.isIdentifier(node) && properties.length > 0 ? { base: node.text, binding: node, path: properties.join(".") } : null;
}

function usesContract(reference, contractBinding, sourceFile, ts) {
  if (!reference) return false;
  const resolved = resolveValueBinding(reference.binding, sourceFile, ts);
  return resolved.status === "resolved" && resolved.declaration === contractBinding;
}

function adapterInitializerMatches(declaration, contractBinding, rowLists, sourceFile, ts) {
  let initializer = unwrapTs(declaration.initializer, ts);
  if (initializer && ts.isCallExpression(initializer) && ts.isPropertyAccessExpression(initializer.expression)
      && initializer.expression.name.text === "map") {
    const mapped = initializer.expression.expression;
    if (ts.isArrayLiteralExpression(mapped)) initializer = mapped;
    else {
      const reference = yamlListReference(mapped, ts);
      return Boolean(usesContract(reference, contractBinding, sourceFile, ts)
        && rowLists.size === 1 && rowLists.has(reference.path));
    }
  }
  if (!initializer || !ts.isArrayLiteralExpression(initializer) || initializer.elements.length === 0) return false;
  const found = new Set();
  for (const element of initializer.elements) {
    if (!ts.isSpreadElement(element)) return false;
    const reference = yamlListReference(element.expression, ts);
    if (!usesContract(reference, contractBinding, sourceFile, ts) || !rowLists.has(reference.path)) return false;
    found.add(reference.path);
  }
  return found.size === rowLists.size && [...rowLists].every(name => found.has(name));
}

function isYamlAdapterBinding(parsed, binding, expectedLists = [], contractBinding = null) {
  const { sourceFile, ts } = parsed;
  const rowLists = new Set(expectedLists);
  if (!contractBinding || !ts.isVariableDeclaration(contractBinding) || !isConstDeclaration(contractBinding, ts) || rowLists.size === 0) return false;
  const adapters = declarationsNamed(sourceFile, binding, ts).filter(declaration => ts.isVariableDeclaration(declaration)
    && isConstDeclaration(declaration, ts) && adapterInitializerMatches(declaration, contractBinding, rowLists, sourceFile, ts));
  return adapters.length === 1;
}

module.exports = { explicitYamlPathReferences, isYamlAdapterBinding };
