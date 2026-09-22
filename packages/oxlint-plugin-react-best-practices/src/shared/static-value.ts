import type { ESTree, SourceCode } from "@oxlint/plugins";
import { constInitializer, unwrapExpression } from "./member-access.ts";

/** Evaluate strings assembled from literals and immutable local constants only. */
export function staticString(
  sourceCode: SourceCode,
  node: ESTree.Node,
  seen = new Set<ESTree.Node>(),
): string | null {
  node = unwrapExpression(node);
  if (seen.has(node)) return null;
  const next = new Set(seen).add(node);
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral") {
    let value = node.quasis[0]?.value.cooked ?? "";
    for (const [index, expression] of node.expressions.entries()) {
      const part =
        expression.type === "Literal" && typeof expression.value === "number"
          ? String(expression.value)
          : staticString(sourceCode, expression, next);
      if (part === null) return null;
      value += part + (node.quasis[index + 1]?.value.cooked ?? "");
    }
    return value;
  }
  if (node.type === "BinaryExpression" && node.operator === "+") {
    const left = staticString(sourceCode, node.left, next);
    const right = staticString(sourceCode, node.right, next);
    return left === null || right === null ? null : left + right;
  }
  const initializer = constInitializer(sourceCode, node);
  return initializer === null ? null : staticString(sourceCode, initializer, next);
}
