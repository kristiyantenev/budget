import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";
import { isFunction, returnedExpression } from "../shared/function.ts";
import { resolveImportedFunction } from "../shared/import-resolution.ts";
import { unwrapExpression } from "../shared/member-access.ts";

function isLeaf(node: ESTree.Node): boolean {
  node = unwrapExpression(node);
  return node.type === "Identifier" || (node.type === "Literal" && !("regex" in node));
}

/** Only expressions whose result is primitive without invoking getters or coercion. */
function isSimplePrimitive(node: ESTree.Node, depth = 0): boolean {
  node = unwrapExpression(node);
  if (depth > 3) return false;
  if (node.type === "Literal") return !("regex" in node);
  if (node.type === "UnaryExpression" && ["!", "typeof"].includes(node.operator))
    return isLeaf(node.argument) || isSimplePrimitive(node.argument, depth + 1);
  if (node.type === "BinaryExpression" && ["===", "!=="].includes(node.operator))
    return isLeaf(node.left) && isLeaf(node.right);
  if (node.type === "LogicalExpression")
    return isSimplePrimitive(node.left, depth + 1) && isSimplePrimitive(node.right, depth + 1);
  if (node.type === "ConditionalExpression")
    return (
      (isLeaf(node.test) || isSimplePrimitive(node.test, depth + 1)) &&
      isSimplePrimitive(node.consequent, depth + 1) &&
      isSimplePrimitive(node.alternate, depth + 1)
    );
  if (node.type === "TemplateLiteral") return node.expressions.length === 0;
  return false;
}

export const rerenderSimpleExpressionInMemoRule = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Avoid useMemo for a small, syntactically primitive expression." },
    schema: [],
    messages: {
      simple:
        "This useMemo only computes a simple primitive expression. Compute it directly during render.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const imported = resolveImportedFunction(context.sourceCode, node.callee);
        if (
          imported?.source !== "react" ||
          imported.name !== "useMemo" ||
          node.arguments.length !== 2
        )
          return;
        const callback = unwrapExpression(node.arguments[0]!);
        const dependencies = unwrapExpression(node.arguments[1]!);
        if (
          !isFunction(callback) ||
          callback.async ||
          callback.generator ||
          callback.params.length !== 0 ||
          dependencies.type !== "ArrayExpression" ||
          dependencies.elements.some(
            (element) => element === null || element.type === "SpreadElement",
          )
        )
          return;
        const expression = returnedExpression(callback);
        if (expression !== null && isSimplePrimitive(expression))
          context.report({ node, messageId: "simple" });
      },
    };
  },
});
