"use strict";

const { identifier, stringValue } = require("./spec-carrier-js-parser.cjs");
const { resolveValueBinding } = require("./spec-carrier-lexical-bindings.cjs");

function isConstDeclaration(declaration, ts) {
  const list = declaration?.parent;
  return Boolean(list && ts.isVariableDeclarationList(list) && (list.flags & ts.NodeFlags.Const));
}

function importDeclaration(binding, ts) {
  for (let current = binding; current && !ts.isSourceFile(current); current = current.parent) {
    if (ts.isImportDeclaration(current)) return current;
  }
  return null;
}

function requiredModule(declaration, sourceFile, ts) {
  if (!ts.isVariableDeclaration(declaration) || !isConstDeclaration(declaration, ts)) return null;
  const call = declaration.initializer;
  if (!call || !ts.isCallExpression(call) || !ts.isIdentifier(call.expression) || call.expression.text !== "require") return null;
  if (resolveValueBinding(call.expression, sourceFile, ts).status !== "unbound") return null;
  return stringValue(call.arguments[0], ts);
}

function moduleNamespaceBinding(reference, sourceFile, ts, modules) {
  const resolved = resolveValueBinding(reference, sourceFile, ts);
  if (resolved.status !== "resolved") return false;
  const binding = resolved.declaration;
  const declaration = importDeclaration(binding, ts);
  if (declaration && modules.includes(stringValue(declaration.moduleSpecifier, ts))) {
    const clause = declaration.importClause;
    if (clause?.isTypeOnly) return false;
    if (ts.isImportClause(binding)) return binding.name?.text === reference.text;
    if (ts.isNamespaceImport(binding)) return binding.name.text === reference.text;
    return ts.isImportSpecifier(binding) && identifier(binding.name, ts) === reference.text
      && identifier(binding.propertyName ?? binding.name, ts) === "default";
  }
  return ts.isVariableDeclaration(binding) && ts.isIdentifier(binding.name)
    && binding.name.text === reference.text && modules.includes(requiredModule(binding, sourceFile, ts));
}

function importedNamedBinding(reference, importedName, sourceFile, ts, modules) {
  const resolved = resolveValueBinding(reference, sourceFile, ts);
  if (resolved.status !== "resolved") return false;
  const binding = resolved.declaration;
  const declaration = importDeclaration(binding, ts);
  if (declaration && modules.includes(stringValue(declaration.moduleSpecifier, ts))) {
    const clause = declaration.importClause;
    return Boolean(!clause?.isTypeOnly && ts.isImportSpecifier(binding) && !binding.isTypeOnly
      && identifier(binding.name, ts) === reference.text
      && identifier(binding.propertyName ?? binding.name, ts) === importedName);
  }
  if (!ts.isVariableDeclaration(binding) || !isConstDeclaration(binding, ts)
      || !ts.isObjectBindingPattern(binding.name) || !modules.includes(requiredModule(binding, sourceFile, ts))) return false;
  return binding.name.elements.some(element => !element.dotDotDotToken && !element.initializer
    && identifier(element.name, ts) === reference.text
    && identifier(element.propertyName ?? element.name, ts) === importedName);
}

function importedModuleCall(call, sourceFile, ts, modules, exports) {
  if (!call || !ts.isCallExpression(call)) return false;
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return exports.some(name => importedNamedBinding(callee, name, sourceFile, ts, modules));
  return ts.isPropertyAccessExpression(callee) && exports.includes(callee.name.text)
    && ts.isIdentifier(callee.expression) && moduleNamespaceBinding(callee.expression, sourceFile, ts, modules);
}

module.exports = { moduleNamespaceBinding, importedModuleCall };
