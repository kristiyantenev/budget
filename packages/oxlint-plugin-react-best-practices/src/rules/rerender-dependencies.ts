import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";
import { isFunction } from "../shared/function.ts";
import { enclosingFunction, isMutationTarget } from "../shared/hook-analysis.ts";
import { resolveImportedFunction } from "../shared/import-resolution.ts";
import { memberName, outerExpression, unwrapExpression } from "../shared/member-access.ts";
import { resolveVariable } from "../shared/scope.ts";

function propertyRead(identifier: ESTree.Node, callback: ESTree.Node): ESTree.Node | null {
  if (enclosingFunction(identifier) !== callback) return null;
  let current = outerExpression(identifier);
  let found = false;
  while (current.parent?.type === "MemberExpression" && current.parent.object === current) {
    const member = current.parent;
    if (member.optional || memberName(member) === null || memberName(member) === "current")
      return null;
    found = true;
    current = outerExpression(member);
  }
  if (!found || isMutationTarget(current)) return null;
  const parent = current.parent;
  if (
    ((parent?.type === "CallExpression" || parent?.type === "NewExpression") &&
      parent.callee === current) ||
    (parent?.type === "TaggedTemplateExpression" && parent.tag === current)
  )
    return null;
  return current;
}

export const rerenderDependenciesRule = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Narrow an effect dependency to the properties its callback reads." },
    schema: [],
    messages: {
      narrow:
        "This effect only reads {{properties}} from this dependency. Consider depending on those properties; verify that object identity is not an intended synchronization trigger.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const imported = resolveImportedFunction(context.sourceCode, node.callee);
        if (
          imported?.source !== "react" ||
          !["useEffect", "useLayoutEffect", "useInsertionEffect"].includes(imported.name) ||
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
        for (const dependency of dependencies.elements) {
          if (dependency === null) continue;
          const identifier = unwrapExpression(dependency);
          if (identifier.type !== "Identifier") continue;
          const variable = resolveVariable(context.sourceCode, identifier);
          if (
            !variable ||
            variable.references.some((reference) => reference.isWrite() && !reference.init)
          )
            continue;
          const uses = variable.references.filter(
            (reference) =>
              reference.identifier.start >= callback.start &&
              reference.identifier.end <= callback.end,
          );
          if (uses.length === 0) continue;
          const reads = uses.map((reference) => propertyRead(reference.identifier, callback));
          if (reads.some((read) => read === null)) continue;
          const properties = [
            ...new Set(
              reads.filter((read) => read !== null).map((read) => context.sourceCode.getText(read)),
            ),
          ];
          context.report({
            node: dependency,
            messageId: "narrow",
            data: { properties: properties.join(", ") },
          });
        }
      },
    };
  },
});
