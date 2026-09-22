import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";
import { enclosingFunction } from "../shared/hook-analysis.ts";
import { resolveImportedFunction } from "../shared/import-resolution.ts";
import { outerExpression, unwrapExpression } from "../shared/member-access.ts";
import { resolveVariable } from "../shared/scope.ts";

function isLiteral(node: ESTree.Node): boolean {
  node = unwrapExpression(node);
  return node.type === "Literal" && !("regex" in node) && !("bigint" in node);
}

export const rerenderDerivedStateRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Derive a boolean at an external-store snapshot boundary when it is the only use of the snapshot.",
      url: "https://react.dev/reference/react/useSyncExternalStore",
    },
    schema: [],
    messages: {
      snapshot:
        "This snapshot is used only for a boolean comparison. Consider returning that boolean from getSnapshot so unchanged results can avoid renders. Update getServerSnapshot consistently when present.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const imported = resolveImportedFunction(context.sourceCode, node.callee);
        if (
          imported?.source !== "react" ||
          imported.name !== "useSyncExternalStore" ||
          node.arguments.length < 2 ||
          node.arguments.length > 3 ||
          node.arguments.some((argument) => argument.type === "SpreadElement")
        )
          return;
        const declaration = outerExpression(node).parent;
        if (
          declaration?.type !== "VariableDeclarator" ||
          declaration.id.type !== "Identifier" ||
          declaration.parent.type !== "VariableDeclaration" ||
          declaration.parent.kind !== "const" ||
          declaration.parent.parent.type === "ExportNamedDeclaration"
        )
          return;
        const owner = enclosingFunction(declaration);
        if (owner === null) return;
        const variable = resolveVariable(context.sourceCode, declaration.id);
        if (
          !variable ||
          variable.references.some((reference) => reference.isWrite() && !reference.init)
        )
          return;
        const reads = variable.references.filter((reference) => reference.isRead());
        if (reads.length !== 1) return;
        const reference = reads[0]!.identifier;
        if (enclosingFunction(reference) !== owner) return;
        const value = outerExpression(reference);
        const comparison = value.parent;
        if (
          comparison?.type !== "BinaryExpression" ||
          !["<", "<=", ">", ">=", "===", "!=="].includes(comparison.operator)
        )
          return;
        if (!isLiteral(comparison.left === value ? comparison.right : comparison.left)) return;
        // Skip comparisons inside conditions that do not run on every render.
        const derived = outerExpression(comparison).parent;
        if (
          derived?.type !== "VariableDeclarator" ||
          derived.id.type !== "Identifier" ||
          derived.init !== outerExpression(comparison) ||
          derived.parent.type !== "VariableDeclaration" ||
          derived.parent.kind !== "const" ||
          derived.parent.parent !== declaration.parent.parent ||
          derived.start <= declaration.end
        )
          return;
        const body = declaration.parent.parent;
        if (body.type !== "BlockStatement" || body.parent !== owner) return;
        context.report({ node, messageId: "snapshot" });
      },
    };
  },
});
