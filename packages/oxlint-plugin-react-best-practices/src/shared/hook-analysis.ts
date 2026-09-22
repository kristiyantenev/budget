import type { ESTree } from "@oxlint/plugins";
import { isFunction } from "./function.ts";

export function enclosingFunction(node: ESTree.Node): ESTree.Node | null {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (isFunction(parent)) return parent;
  }
  return null;
}

/** This expression is part of an assignment target, increment, delete, or loop target. */
export function isMutationTarget(node: ESTree.Node): boolean {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (isFunction(parent)) return false;
    const target =
      parent.type === "AssignmentExpression"
        ? parent.left
        : parent.type === "UpdateExpression" ||
            (parent.type === "UnaryExpression" && parent.operator === "delete")
          ? parent.argument
          : parent.type === "ForOfStatement" || parent.type === "ForInStatement"
            ? parent.left
            : null;
    if (target && target.start <= node.start && target.end >= node.end) return true;
    if (parent.type.endsWith("Statement")) return false;
  }
  return false;
}
