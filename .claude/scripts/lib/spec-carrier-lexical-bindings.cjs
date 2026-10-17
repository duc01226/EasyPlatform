"use strict";

const { valueBindingsNamed } = require("./spec-carrier-js-parser.cjs");

function isFunctionScope(node, ts) {
  return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)
    || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)
    || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node);
}

function isLoopScope(node, ts) {
  return ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node);
}

function isLexicalScope(node, ts) {
  return ts.isSourceFile(node) || ts.isBlock(node) || isFunctionScope(node, ts)
    || ts.isCatchClause(node) || isLoopScope(node, ts) || ts.isCaseBlock(node)
    || ts.isModuleBlock(node) || ts.isClassExpression(node)
    || Boolean(ts.isClassStaticBlockDeclaration?.(node));
}

function nearestScope(node, predicate, ts) {
  for (let current = node; current; current = current.parent) if (predicate(current, ts)) return current;
  return null;
}

function isImportBinding(node, ts) {
  return ts.isImportClause(node) || ts.isImportSpecifier(node) || ts.isNamespaceImport(node)
    || ts.isImportEqualsDeclaration(node);
}

function bindingScope(binding, sourceFile, ts) {
  if (isImportBinding(binding, ts)) return sourceFile;
  if ((ts.isFunctionExpression(binding) && binding.name) || (ts.isClassExpression(binding) && binding.name)) return binding;
  if (ts.isParameter(binding)) return nearestScope(binding.parent, isFunctionScope, ts);
  if (ts.isVariableDeclaration(binding)) {
    const list = binding.parent;
    if (!ts.isVariableDeclarationList(list)) return nearestScope(binding.parent, isLexicalScope, ts);
    const container = list.parent;
    if (list.flags & ts.NodeFlags.BlockScoped) {
      return isLoopScope(container, ts) ? container : nearestScope(container, isLexicalScope, ts);
    }
    return nearestScope(container, (node, compiler) => isFunctionScope(node, compiler) || compiler.isSourceFile(node), ts);
  }
  if (ts.isFunctionDeclaration(binding) || ts.isClassDeclaration(binding)
      || ts.isEnumDeclaration(binding) || ts.isModuleDeclaration(binding)) {
    return nearestScope(binding.parent, isLexicalScope, ts);
  }
  return null;
}

function resolveValueBinding(reference, sourceFile, ts) {
  if (!reference || !ts.isIdentifier(reference)) return { status: "unsupported", declaration: null };
  const declarations = valueBindingsNamed(sourceFile, reference.text, ts);
  for (let scope = reference; scope; scope = scope.parent) {
    if (!isLexicalScope(scope, ts)) continue;
    const visible = declarations.filter(declaration => bindingScope(declaration, sourceFile, ts) === scope);
    if (visible.length === 1) return { status: "resolved", declaration: visible[0] };
    if (visible.length > 1) return { status: "ambiguous", declaration: null };
  }
  return { status: "unbound", declaration: null };
}

module.exports = { resolveValueBinding };
