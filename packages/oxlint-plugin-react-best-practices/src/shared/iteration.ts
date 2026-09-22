import type { ESTree, Reference, Scope, SourceCode } from "@oxlint/plugins";
import { isFunction } from "./function.ts";
import { memberName, unwrapExpression } from "./member-access.ts";
import { resolveVariable } from "./scope.ts";

/** Find the nearest loop body or inline array callback; don't cross deferred callbacks. */
export function iterationContext(node: ESTree.Node): ESTree.Node | null {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (isFunction(parent)) {
      const call = parent.parent;
      if (call.type !== "CallExpression" || call.optional || call.arguments[0] !== parent)
        return null;
      const callee = unwrapExpression(call.callee);
      return callee.type === "MemberExpression" &&
        !callee.optional &&
        ["map", "flatMap", "filter", "forEach", "some", "every", "find", "findIndex"].includes(
          memberName(callee) ?? "",
        )
        ? parent
        : null;
    }
    if (
      (parent.type === "ForStatement" ||
        parent.type === "ForOfStatement" ||
        parent.type === "ForInStatement" ||
        parent.type === "WhileStatement" ||
        parent.type === "DoWhileStatement") &&
      node.start >= parent.body.start &&
      node.end <= parent.body.end
    )
      return parent;
  }
  return null;
}

function within(node: ESTree.Node, outer: ESTree.Node): boolean {
  return node.start >= outer.start && node.end <= outer.end;
}

/** References made inside an expression, including from callbacks nested in it. */
function referencesWithin(sourceCode: SourceCode, node: ESTree.Node): Reference[] {
  const found: Reference[] = [];
  const visit = (scope: Scope) => {
    for (const reference of scope.references) {
      if (within(reference.identifier, node)) found.push(reference);
    }
    for (const child of scope.childScopes) {
      if (child.block.start < node.end && child.block.end > node.start) visit(child);
    }
  };
  visit(sourceCode.getScope(node));
  return found;
}

/** A value that reads nothing the iteration declares or reassigns is loop-invariant; hoisting fits it better. */
export function variesPerIteration(
  sourceCode: SourceCode,
  node: ESTree.Node,
  iteration: ESTree.Node,
): boolean {
  return referencesWithin(sourceCode, node).some(
    ({ resolved }) =>
      resolved !== null &&
      !resolved.defs.some((definition) => within(definition.node, node)) &&
      (resolved.defs.some((definition) => within(definition.node, iteration)) ||
        resolved.references.some(
          (reference) => reference.isWrite() && within(reference.identifier, iteration),
        )),
  );
}

export function isOutsideIteration(
  sourceCode: SourceCode,
  node: ESTree.Node,
  iteration: ESTree.Node,
): boolean {
  node = unwrapExpression(node);
  if (node.type !== "Identifier") return false;
  const variable = resolveVariable(sourceCode, node);
  return (
    variable !== null &&
    variable.defs.length > 0 &&
    variable.defs.every(
      (definition) =>
        definition.node.start < iteration.start || definition.node.end > iteration.end,
    ) &&
    !variable.references.some((reference) => reference.isWrite() && !reference.init)
  );
}
