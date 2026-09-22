import { defineRule } from "@oxlint/plugins";
import type { ESTree, SourceCode, Variable } from "@oxlint/plugins";
import { isFunction, returnedExpression } from "../shared/function.ts";
import { resolveImportedFunction } from "../shared/import-resolution.ts";
import { memberName, unwrapExpression } from "../shared/member-access.ts";
import { resolveVariable } from "../shared/scope.ts";
import { simpleValue } from "../shared/simple-expression.ts";

function arrayStage(node: ESTree.Node): Extract<ESTree.Node, { type: "MemberExpression" }> | null {
  node = unwrapExpression(node);
  if (node.type !== "CallExpression" || node.optional || node.arguments.length > 1) return null;
  const callee = unwrapExpression(node.callee);
  if (
    callee.type !== "MemberExpression" ||
    callee.optional ||
    !["map", "filter", "toSorted"].includes(memberName(callee) ?? "") ||
    unwrapExpression(callee.object).type !== "Identifier"
  )
    return null;
  if (node.arguments.length === 0) return memberName(callee) === "toSorted" ? callee : null;
  const callback = unwrapExpression(node.arguments[0]!);
  if (
    !isFunction(callback) ||
    callback.async ||
    callback.generator ||
    callback.params.some((parameter) => parameter.type !== "Identifier")
  )
    return null;
  const expression = returnedExpression(callback);
  return expression !== null && simpleValue(expression) ? callee : null;
}

function singleConst(node: ESTree.Node): ESTree.VariableDeclarator | null {
  if (
    node.type !== "VariableDeclaration" ||
    node.kind !== "const" ||
    node.declarations.length !== 1
  )
    return null;
  const declaration = node.declarations[0]!;
  return declaration.id.type === "Identifier" && declaration.init !== null ? declaration : null;
}

function binding(sourceCode: SourceCode, node: ESTree.Node): Variable | null {
  node = unwrapExpression(node);
  return node.type === "Identifier" ? resolveVariable(sourceCode, node) : null;
}

function onlyReadAt(variable: Variable, node: ESTree.Node): boolean {
  const reads = variable.references.filter((reference) => reference.isRead());
  return (
    !variable.references.some((reference) => reference.isWrite() && !reference.init) &&
    reads.length === 1 &&
    reads[0]?.identifier === unwrapExpression(node)
  );
}

export const rerenderSplitCombinedHooksRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Split two memoized array stages when the second has additional reactive inputs.",
    },
    schema: [],
    messages: {
      split:
        "The second array stage uses dependencies that the first stage does not. Consider separate useMemo calls so those changes do not repeat the first stage; preserve pure calculations and complete dependencies.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const sourceCode = context.sourceCode;
        const imported = resolveImportedFunction(sourceCode, node.callee);
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
          callback.body?.type !== "BlockStatement" ||
          dependencies.type !== "ArrayExpression"
        )
          return;
        const statements = callback.body.body;
        if (statements.length !== 2 && statements.length !== 3) return;
        const first = singleConst(statements[0]!);
        const returned = statements.at(-1)!;
        if (
          first?.init == null ||
          returned.type !== "ReturnStatement" ||
          returned.argument === null
        )
          return;
        const second = statements.length === 3 ? singleConst(statements[1]!) : null;
        if (statements.length === 3 && second?.init == null) return;
        const lastExpression = second?.init ?? returned.argument;
        const firstStage = arrayStage(first.init);
        const secondStage = arrayStage(lastExpression);
        const firstBinding = binding(sourceCode, first.id);
        if (
          !firstStage ||
          !secondStage ||
          !firstBinding ||
          binding(sourceCode, secondStage.object) !== firstBinding ||
          !onlyReadAt(firstBinding, secondStage.object)
        )
          return;
        if (second !== null) {
          const secondBinding = binding(sourceCode, second.id);
          if (
            !secondBinding ||
            binding(sourceCode, returned.argument) !== secondBinding ||
            !onlyReadAt(secondBinding, returned.argument)
          )
            return;
        }
        const inputs = new Set<Variable>();
        for (const dependency of dependencies.elements) {
          if (dependency === null) return;
          const variable = binding(sourceCode, dependency);
          if (
            !variable ||
            inputs.has(variable) ||
            variable.references.some((reference) => reference.isWrite() && !reference.init)
          )
            return;
          inputs.add(variable);
        }
        // Reject unknown captures and incomplete dependency arrays rather than proposing a split.
        if (
          sourceCode
            .getScope(callback)
            .through.some((reference) => !reference.resolved || !inputs.has(reference.resolved))
        )
          return;
        const firstInputs = new Set(
          [...inputs].filter((variable) =>
            variable.references.some(
              (reference) =>
                reference.identifier.start >= first.init!.start &&
                reference.identifier.end <= first.init!.end,
            ),
          ),
        );
        const secondInputs = new Set(
          [...inputs].filter((variable) =>
            variable.references.some(
              (reference) =>
                reference.identifier.start >= lastExpression.start &&
                reference.identifier.end <= lastExpression.end,
            ),
          ),
        );
        if (
          firstInputs.size === 0 ||
          ![...secondInputs].some((variable) => !firstInputs.has(variable)) ||
          [...inputs].some((variable) => !firstInputs.has(variable) && !secondInputs.has(variable))
        )
          return;
        context.report({ node, messageId: "split" });
      },
    };
  },
});
