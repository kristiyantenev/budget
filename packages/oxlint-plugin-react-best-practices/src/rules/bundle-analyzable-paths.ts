import { defineRule } from "@oxlint/plugins";
import type { ESTree, SourceCode } from "@oxlint/plugins";
import { resolveImportedFunction } from "../shared/import-resolution.ts";
import { isGlobalName, memberName, unwrapExpression } from "../shared/member-access.ts";

function isLiteralPath(node: ESTree.Node): boolean {
  node = unwrapExpression(node);
  return (
    (node.type === "Literal" && typeof node.value === "string") ||
    (node.type === "TemplateLiteral" && node.expressions.length === 0)
  );
}

function isWorkingDirectory(sourceCode: SourceCode, node: ESTree.Node): boolean {
  node = unwrapExpression(node);
  if (node.type !== "CallExpression" || node.arguments.length !== 0) return false;
  const callee = unwrapExpression(node.callee);
  return (
    callee.type === "MemberExpression" &&
    memberName(callee) === "cwd" &&
    isGlobalName(sourceCode, callee.object, "process")
  );
}

export const bundleAnalyzablePathsRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Keep module paths and paths joined to process.cwd() literal at the callsite.",
      url: "https://nextjs.org/docs/app/api-reference/config/next-config-js/output",
    },
    schema: [],
    messages: {
      modulePath:
        "Use a literal module path. For a dynamic choice, map keys to functions containing literal imports.",
      filePath:
        "Use literal path segments after process.cwd(). Choose between complete path.join() calls instead of composing a dynamic path.",
    },
  },
  createOnce(context) {
    return {
      ImportExpression(node) {
        if (!isLiteralPath(node.source))
          context.report({ node: node.source, messageId: "modulePath" });
      },
      CallExpression(node) {
        const path = node.arguments[0];
        if (path === undefined) return;
        if (isGlobalName(context.sourceCode, node.callee, "require")) {
          if (!isLiteralPath(path)) context.report({ node: path, messageId: "modulePath" });
          return;
        }
        const imported = resolveImportedFunction(context.sourceCode, node.callee);
        if (
          imported === null ||
          !["path", "node:path"].includes(imported.source) ||
          imported.name !== "join" ||
          !isWorkingDirectory(context.sourceCode, path)
        )
          return;
        for (const segment of node.arguments.slice(1)) {
          if (!isLiteralPath(segment)) context.report({ node: segment, messageId: "filePath" });
        }
      },
    };
  },
});
