import { defineRule } from "@oxlint/plugins";
import type { ESTree, SourceCode } from "@oxlint/plugins";
import { isFunction, returnedExpression } from "../shared/function.ts";
import { isOutsideIteration, iterationContext, variesPerIteration } from "../shared/iteration.ts";
import { memberName, unwrapExpression } from "../shared/member-access.ts";
import { resolveVariable } from "../shared/scope.ts";

function isKey(
  sourceCode: SourceCode,
  node: ESTree.Node,
  parameter: Extract<ESTree.Node, { type: "Identifier" }>,
): boolean {
  node = unwrapExpression(node);
  if (node.type !== "MemberExpression" || node.optional || memberName(node) === null) return false;
  const object = unwrapExpression(node.object);
  return (
    object.type === "Identifier" &&
    resolveVariable(sourceCode, object) === resolveVariable(sourceCode, parameter)
  );
}

export const jsIndexMapsRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Index repeated property lookups instead of scanning with find in an iteration.",
    },
    schema: [],
    messages: {
      index:
        "This iteration repeatedly scans the same collection by key. Consider an index Map built outside the iteration; preserve the first match for duplicate keys and account for mutations.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const callee = unwrapExpression(node.callee);
        if (
          node.optional ||
          callee.type !== "MemberExpression" ||
          callee.optional ||
          memberName(callee) !== "find" ||
          node.arguments.length !== 1
        )
          return;
        const iteration = iterationContext(node);
        if (iteration === null || !isOutsideIteration(context.sourceCode, callee.object, iteration))
          return;
        const callback = unwrapExpression(node.arguments[0]!);
        if (
          !isFunction(callback) ||
          callback.async ||
          callback.generator ||
          callback.params.length !== 1 ||
          callback.params[0]?.type !== "Identifier"
        )
          return;
        const result = returnedExpression(callback);
        if (result === null) return;
        const comparison = unwrapExpression(result);
        if (comparison.type !== "BinaryExpression" || comparison.operator !== "===") return;
        const parameter = callback.params[0];
        const leftKey = isKey(context.sourceCode, comparison.left, parameter);
        const rightKey = isKey(context.sourceCode, comparison.right, parameter);
        if (leftKey === rightKey) return;
        const other = leftKey ? comparison.right : comparison.left;
        const binding = resolveVariable(context.sourceCode, parameter);
        if (
          binding?.references.some(
            (ref) => ref.identifier.start >= other.start && ref.identifier.end <= other.end,
          ) ||
          !variesPerIteration(context.sourceCode, other, iteration)
        )
          return;
        context.report({ node, messageId: "index" });
      },
    };
  },
});
