import { defineRule } from "@oxlint/plugins";
import type { ESTree, SourceCode } from "@oxlint/plugins";
import { hasLocalType } from "../shared/local-type.ts";
import { constInitializer, unwrapExpression } from "../shared/member-access.ts";

function isNonzeroLiteral(
  sourceCode: SourceCode,
  node: ESTree.Node,
  seen = new Set<ESTree.Node>(),
): boolean {
  node = unwrapExpression(node);
  if (seen.has(node)) return false;
  seen.add(node);
  if (node.type === "Literal" && typeof node.value === "number")
    return node.value !== 0 && !Number.isNaN(node.value);
  const initial = constInitializer(sourceCode, node);
  return initial !== null && isNonzeroLiteral(sourceCode, initial, seen);
}

export const renderingConditionalRenderRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Avoid rendering a numeric falsy value through JSX && conditions." },
    schema: [],
    messages: {
      numeric:
        "This numeric condition can render 0 or NaN. Use an explicit boolean condition or a ternary with null for the empty branch.",
    },
  },
  createOnce(context) {
    function numericValues(node: ESTree.Node): ESTree.Node[] {
      node = unwrapExpression(node);
      if (hasLocalType(context.sourceCode, node, "number"))
        return isNonzeroLiteral(context.sourceCode, node) ? [] : [node];
      if (node.type === "LogicalExpression") {
        const right = numericValues(node.right);
        if (node.operator === "||") return right;
        const values = [...numericValues(node.left), ...right];
        // Either side of ?? can become the condition, so report the whole expression once.
        return node.operator === "??" && values.length > 0 ? [node] : values;
      }
      if (node.type === "ConditionalExpression")
        return [...numericValues(node.consequent), ...numericValues(node.alternate)];
      return [];
    }
    function checkCondition(node: ESTree.Node): void {
      for (const value of numericValues(node))
        context.report({ node: value, messageId: "numeric" });
    }
    function check(node: ESTree.Node): void {
      node = unwrapExpression(node);
      if (node.type === "LogicalExpression") {
        if (node.operator === "&&") checkCondition(node.left);
        // Unlike ||, ?? preserves numeric falsy values from its left operand.
        if (node.operator === "??") check(node.left);
        check(node.right);
      } else if (node.type === "ConditionalExpression") {
        check(node.consequent);
        check(node.alternate);
      }
    }
    return {
      JSXExpressionContainer(node) {
        if (node.parent.type === "JSXElement" || node.parent.type === "JSXFragment")
          check(node.expression);
      },
    };
  },
});
