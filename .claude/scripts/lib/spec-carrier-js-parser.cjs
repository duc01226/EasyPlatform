"use strict";

const path = require("node:path");
const { createRequire } = require("node:module");

const compilers = new Map();

function loadTypeScript(rootDir) {
  const projectRoot = path.resolve(rootDir);
  if (compilers.has(projectRoot)) return compilers.get(projectRoot);
  let compiler = null;
  try {
    const projectRequire = createRequire(path.join(projectRoot, "package.json"));
    compiler = projectRequire("typescript");
  } catch {}
  compilers.set(projectRoot, compiler);
  return compiler;
}

function scriptKindFor(file, ts) {
  const extension = path.extname(file).toLowerCase();
  if (extension === ".tsx") return ts.ScriptKind.TSX;
  if (extension === ".jsx") return ts.ScriptKind.JSX;
  if ([".js", ".mjs", ".cjs"].includes(extension)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function parse(source, file, rootDir) {
  const ts = loadTypeScript(rootDir);
  if (!ts) {
    return { ts: null, sourceFile: null, errors: [{ code: "MISSING_PARSER", start: null, end: null, reason: "TypeScript parser is unavailable from the adopter root" }] };
  }
  try {
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKindFor(file, ts));
    const errors = sourceFile.parseDiagnostics.map(diagnostic => {
      const start = diagnostic.start ?? 0;
      return {
        code: "UNKNOWN",
        start,
        end: start + (diagnostic.length ?? 0),
        reason: `TypeScript syntax diagnostic: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`,
      };
    });
    return { ts, sourceFile, errors };
  } catch (error) {
    return { ts, sourceFile: null, errors: [{ code: "UNKNOWN", start: 0, end: source.length, reason: `TypeScript parser failed: ${error.message}` }] };
  }
}

function visit(node, ts, visitor) {
  visitor(node);
  node.forEachChild(child => visit(child, ts, visitor));
}

function span(node, sourceFile) {
  return { start: node.getStart(sourceFile), end: node.end };
}

function stringValue(node, ts) {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : null;
}

function identifier(node, ts) {
  return ts.isIdentifier(node) ? node.text : null;
}

function callName(node, ts) {
  return ts.isCallExpression(node) ? identifier(node.expression, ts) : null;
}

function callbackBody(call, ts) {
  const callback = call.arguments[1];
  return callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) ? callback.body : null;
}

function callsNamed(sourceFile, names, ts) {
  const allowed = new Set(Array.isArray(names) ? names : []);
  const calls = [];
  visit(sourceFile, ts, node => {
    const name = callName(node, ts);
    if (name && allowed.has(name)) calls.push({ node, name, body: callbackBody(node, ts) });
  });
  return calls;
}

function contains(container, node, sourceFile) {
  const outer = span(container, sourceFile);
  const inner = span(node, sourceFile);
  return outer.start <= inner.start && outer.end >= inner.end;
}

function declarationsNamed(sourceFile, name, ts) {
  const declarations = [];
  visit(sourceFile, ts, node => {
    if (ts.isVariableDeclaration(node) && identifier(node.name, ts) === name) declarations.push(node);
  });
  return declarations;
}

function bindingNames(binding, ts) {
  if (!binding) return [];
  if (ts.isIdentifier(binding)) return [binding.text];
  if (ts.isObjectBindingPattern(binding) || ts.isArrayBindingPattern(binding)) {
    return binding.elements.flatMap(element => bindingNames(element.name, ts));
  }
  return [];
}

function isTypeOnlyImportBinding(node, ts) {
  if (ts.isImportClause(node) || ts.isImportEqualsDeclaration(node)) return node.isTypeOnly === true;
  if (!ts.isImportSpecifier(node) && !ts.isNamespaceImport(node)) return false;
  if (ts.isImportSpecifier(node) && node.isTypeOnly) return true;
  let parent = node.parent;
  while (parent && !ts.isImportClause(parent)) parent = parent.parent;
  if (parent?.isTypeOnly) return true;
  return false;
}

function valueBindingsNamed(sourceFile, name, ts) {
  const bindings = [];
  visit(sourceFile, ts, node => {
    if (isTypeOnlyImportBinding(node, ts)) return;
    const variable = ts.isVariableDeclaration(node) || ts.isParameter(node);
    const declaration = ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)
      || ts.isClassDeclaration(node) || ts.isClassExpression(node)
      || ts.isEnumDeclaration(node) || ts.isModuleDeclaration(node);
    const imported = ts.isImportClause(node) || ts.isImportSpecifier(node) || ts.isNamespaceImport(node) || ts.isImportEqualsDeclaration(node);
    const binding = variable || declaration || imported ? node.name : null;
    if (binding && bindingNames(binding, ts).includes(name)) bindings.push(node);
  });
  return bindings;
}

function isDeclarationName(node, parent, ts) {
  if (!parent) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return true;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true;
  return [
    ts.isVariableDeclaration, ts.isParameter, ts.isFunctionDeclaration, ts.isFunctionExpression,
    ts.isClassDeclaration, ts.isClassExpression, ts.isPropertyDeclaration, ts.isMethodDeclaration,
    ts.isPropertySignature, ts.isMethodSignature, ts.isBindingElement,
  ].some(check => check(parent) && parent.name === node);
}

function identifierUsage(body, name, ts) {
  let referenced = false;
  let shadowed = false;
  visit(body, ts, node => {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && identifier(node.name, ts) === name) shadowed = true;
    if (ts.isIdentifier(node) && node.text === name && !isDeclarationName(node, node.parent, ts)) referenced = true;
  });
  return { referenced, shadowed };
}

module.exports = {
  parse,
  visit,
  span,
  stringValue,
  identifier,
  callName,
  callbackBody,
  callsNamed,
  contains,
  declarationsNamed,
  valueBindingsNamed,
  identifierUsage,
};
