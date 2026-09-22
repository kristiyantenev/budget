import { defineRule } from "@oxlint/plugins";
import type { ESTree, SourceCode, Variable } from "@oxlint/plugins";
import { isFunction } from "../shared/function.ts";
import { enclosingFunction } from "../shared/hook-analysis.ts";
import { resolveImportedFunction } from "../shared/import-resolution.ts";
import { constInitializer, unwrapExpression } from "../shared/member-access.ts";
import { resolveVariable } from "../shared/scope.ts";

function stateForSetter(
  sourceCode: SourceCode,
  node: ESTree.Node,
  seen = new Set<Variable>(),
): Variable | null {
  node = unwrapExpression(node);
  if (node.type !== "Identifier") return null;
  const setter = resolveVariable(sourceCode, node);
  if (
    !setter ||
    seen.has(setter) ||
    setter.references.some((reference) => reference.isWrite() && !reference.init)
  )
    return null;
  seen.add(setter);
  for (const definition of setter.defs) {
    const declaration = definition.node;
    if (
      definition.type !== "Variable" ||
      declaration.type !== "VariableDeclarator" ||
      declaration.parent.type !== "VariableDeclaration" ||
      declaration.parent.kind !== "const" ||
      declaration.id.type !== "ArrayPattern" ||
      declaration.id.elements.length !== 2 ||
      !declaration.init
    )
      continue;
    const [state, dispatch] = declaration.id.elements;
    if (
      state?.type !== "Identifier" ||
      dispatch?.type !== "Identifier" ||
      resolveVariable(sourceCode, dispatch) !== setter
    )
      continue;
    const initial = unwrapExpression(declaration.init);
    if (initial.type !== "CallExpression") continue;
    const imported = resolveImportedFunction(sourceCode, initial.callee);
    if (imported?.source !== "react" || imported.name !== "useState") continue;
    const variable = resolveVariable(sourceCode, state);
    if (
      variable &&
      !variable.references.some((reference) => reference.isWrite() && !reference.init)
    )
      return variable;
  }
  const alias = constInitializer(sourceCode, node);
  return alias === null ? null : stateForSetter(sourceCode, alias, seen);
}

export const rerenderFunctionalSetstateRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Use a functional state update when the next value reads the paired state binding.",
      url: "https://react.dev/reference/react/useState#updating-state-based-on-the-previous-state",
    },
    schema: [],
    messages: {
      functional:
        "This update calculates the next value from {{state}}. Consider a functional updater to read pending state; keep side effects outside the updater.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (node.optional || node.arguments.length !== 1) return;
        const argument = unwrapExpression(node.arguments[0]!);
        if (
          isFunction(argument) ||
          argument.type === "SpreadElement" ||
          argument.type === "Identifier"
        )
          return;
        const state = stateForSetter(context.sourceCode, node.callee);
        if (!state) return;
        if (
          state.references.some(
            (reference) =>
              reference.isRead() &&
              reference.identifier.start >= argument.start &&
              reference.identifier.end <= argument.end &&
              enclosingFunction(reference.identifier) === enclosingFunction(node),
          )
        )
          context.report({ node: argument, messageId: "functional", data: { state: state.name } });
      },
    };
  },
});
