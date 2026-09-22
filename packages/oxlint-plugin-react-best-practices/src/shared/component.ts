import type { ESTree, SourceCode } from "@oxlint/plugins";
import { isFunction } from "./function.ts";
import { resolveImportedFunction } from "./import-resolution.ts";

/** Recognize components by convention: an uppercase name, a default export, or React memo/forwardRef. */
export function isComponentFunction(sourceCode: SourceCode, node: ESTree.Node): boolean {
  if (!isFunction(node)) return false;
  const parent = node.parent;
  const name =
    parent.type === "VariableDeclarator" && parent.id.type === "Identifier"
      ? parent.id.name
      : node.type !== "ArrowFunctionExpression"
        ? node.id?.name
        : null;
  if ((name && /^[A-Z]/.test(name)) || parent.type === "ExportDefaultDeclaration") return true;
  if (parent.type !== "CallExpression" || parent.arguments[0] !== node) return false;
  const imported = resolveImportedFunction(sourceCode, parent.callee);
  return imported?.source === "react" && ["memo", "forwardRef"].includes(imported.name);
}
