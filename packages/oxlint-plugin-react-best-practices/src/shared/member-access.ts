import type { ESTree, SourceCode } from "@oxlint/plugins";
import { resolveVariable } from "./scope.ts";

/** Unwrap syntax-only expressions before inspecting a call or receiver. */
export function unwrapExpression(node: ESTree.Node): ESTree.Node {
  while (
    node.type === "ParenthesizedExpression" ||
    node.type === "ChainExpression" ||
    node.type === "TSAsExpression" ||
    node.type === "TSTypeAssertion" ||
    node.type === "TSNonNullExpression" ||
    node.type === "TSSatisfiesExpression"
  )
    node = node.expression;
  return node;
}

/** Walk out through syntax-only wrappers, preserving the full expression's parent. */
export function outerExpression(node: ESTree.Node): ESTree.Node {
  while (
    node.parent &&
    "expression" in node.parent &&
    node.parent.expression === node &&
    unwrapExpression(node.parent) !== node.parent
  )
    node = node.parent;
  return node;
}

/** Read a property name without evaluating a computed expression. */
export function memberName(node: ESTree.Node): string | null {
  node = unwrapExpression(node);
  if (node.type !== "MemberExpression") return null;
  if (!node.computed && node.property.type === "Identifier") return node.property.name;
  if (node.computed && node.property.type === "Literal" && typeof node.property.value === "string")
    return node.property.value;
  return null;
}

export function isGlobalName(sourceCode: SourceCode, node: ESTree.Node, name: string): boolean {
  node = unwrapExpression(node);
  if (node.type !== "Identifier" || node.name !== name) return false;
  const variable = resolveVariable(sourceCode, node);
  return variable === null || variable.defs.length === 0;
}

/** Resolve only immutable local initializers; parameters and mutable bindings remain unknown. */
export function constInitializer(
  sourceCode: SourceCode,
  node: ESTree.Node,
): ESTree.Expression | null {
  node = unwrapExpression(node);
  if (node.type !== "Identifier") return null;
  const variable = resolveVariable(sourceCode, node);
  if (
    variable === null ||
    variable.references.some((reference) => reference.isWrite() && !reference.init)
  )
    return null;
  for (const definition of variable.defs) {
    if (
      definition.type === "Variable" &&
      definition.node.type === "VariableDeclarator" &&
      definition.node.id.type === "Identifier" &&
      definition.node.parent.type === "VariableDeclaration" &&
      definition.node.parent.kind === "const"
    )
      return definition.node.init;
  }
  return null;
}
