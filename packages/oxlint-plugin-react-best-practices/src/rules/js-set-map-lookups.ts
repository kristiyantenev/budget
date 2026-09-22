import { defineRule } from "@oxlint/plugins";
import type { ESTree, SourceCode } from "@oxlint/plugins";
import { isOutsideIteration, iterationContext, variesPerIteration } from "../shared/iteration.ts";
import { hasLocalType } from "../shared/local-type.ts";
import { constInitializer, memberName, unwrapExpression } from "../shared/member-access.ts";

/** Below this many literal elements, a linear scan is about as fast as a Set lookup. */
const minimumLiteralLength = 8;

function literalLength(
  sourceCode: SourceCode,
  node: ESTree.Node,
  seen = new Set<ESTree.Node>(),
): number | null {
  node = unwrapExpression(node);
  if (node.type === "ArrayExpression")
    return node.elements.some((element) => element?.type === "SpreadElement")
      ? null
      : node.elements.length;
  if (seen.has(node)) return null;
  seen.add(node);
  const initializer = constInitializer(sourceCode, node);
  return initializer === null ? null : literalLength(sourceCode, initializer, seen);
}

export const jsSetMapLookupsRule = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Use a Set for repeated array membership checks." },
    schema: [],
    messages: {
      lookup:
        "This iteration repeatedly checks membership in the same array. Consider building a Set outside the iteration and using has(), accounting for array mutations.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const callee = unwrapExpression(node.callee);
        const value = node.arguments[0];
        if (
          node.optional ||
          callee.type !== "MemberExpression" ||
          callee.optional ||
          memberName(callee) !== "includes" ||
          node.arguments.length !== 1 ||
          value === undefined ||
          value.type === "SpreadElement"
        )
          return;
        const iteration = iterationContext(node);
        const length = literalLength(context.sourceCode, callee.object);
        if (
          iteration !== null &&
          isOutsideIteration(context.sourceCode, callee.object, iteration) &&
          hasLocalType(context.sourceCode, callee.object, "array") &&
          (length === null || length >= minimumLiteralLength) &&
          variesPerIteration(context.sourceCode, value, iteration)
        )
          context.report({ node, messageId: "lookup" });
      },
    };
  },
});
