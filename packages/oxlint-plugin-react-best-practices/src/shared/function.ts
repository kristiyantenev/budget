import type { ESTree, SourceCode } from "@oxlint/plugins";
import { constInitializer, unwrapExpression } from "./member-access.ts";
import { resolveVariable } from "./scope.ts";

export type CallbackFunction = ESTree.Function | ESTree.ArrowFunctionExpression;

export function isFunction(node: ESTree.Node): node is CallbackFunction {
  return (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  );
}

/** The value a function returns when its body is one expression or a single return statement. */
export function returnedExpression(node: CallbackFunction): ESTree.Expression | null {
  const body = node.body;
  if (body === null) return null;
  if (body.type !== "BlockStatement") return body;
  const [statement] = body.body;
  return body.body.length === 1 && statement?.type === "ReturnStatement"
    ? statement.argument
    : null;
}

/** Find inline callbacks, const-bound callbacks, and unmodified function declarations. */
export function resolveFunction(
  sourceCode: SourceCode,
  node: ESTree.Node,
  seen = new Set<ESTree.Node>(),
): CallbackFunction | null {
  node = unwrapExpression(node);
  if (isFunction(node)) return node;
  if (seen.has(node)) return null;
  seen.add(node);
  const initializer = constInitializer(sourceCode, node);
  if (initializer !== null) return resolveFunction(sourceCode, initializer, seen);
  if (node.type !== "Identifier") return null;
  const variable = resolveVariable(sourceCode, node);
  if (variable === null || variable.references.some((reference) => reference.isWrite()))
    return null;
  for (const definition of variable.defs) {
    if (definition.type === "FunctionName" && isFunction(definition.node)) return definition.node;
  }
  return null;
}
