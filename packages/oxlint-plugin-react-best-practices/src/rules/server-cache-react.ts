import { defineRule } from "@oxlint/plugins";
import type { ESTree, SourceCode } from "@oxlint/plugins";
import { resolveImportedFunction } from "../shared/import-resolution.ts";
import { constInitializer, unwrapExpression } from "../shared/member-access.ts";

function isCachedFunction(
  sourceCode: SourceCode,
  node: ESTree.Node,
  seen = new Set<ESTree.Node>(),
): boolean {
  node = unwrapExpression(node);
  if (seen.has(node)) return false;
  seen.add(node);
  if (
    node.type === "CallExpression" &&
    !node.optional &&
    node.arguments.length === 1 &&
    node.arguments[0]?.type !== "SpreadElement"
  ) {
    const imported = resolveImportedFunction(sourceCode, node.callee);
    return imported?.source === "react" && imported.name === "cache";
  }
  const initial = constInitializer(sourceCode, node);
  return initial !== null && isCachedFunction(sourceCode, initial, seen);
}

export const serverCacheReactRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Avoid fresh object arguments to functions wrapped in React.cache.",
      url: "https://react.dev/reference/react/cache",
    },
    schema: [],
    messages: {
      fresh:
        "This argument creates a fresh reference on every call, preventing React.cache hits. Pass primitive arguments or reuse the same object reference.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (!isCachedFunction(context.sourceCode, node.callee)) return;
        for (const argument of node.arguments) {
          const value = unwrapExpression(argument);
          if (
            [
              "ObjectExpression",
              "ArrayExpression",
              "ArrowFunctionExpression",
              "FunctionExpression",
            ].includes(value.type) ||
            (value.type === "Literal" && "regex" in value)
          )
            context.report({ node: argument, messageId: "fresh" });
        }
      },
    };
  },
});
