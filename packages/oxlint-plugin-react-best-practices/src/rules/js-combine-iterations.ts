import { defineRule } from "@oxlint/plugins";
import type { ESTree, SourceCode, Variable } from "@oxlint/plugins";
import { memberName, unwrapExpression } from "../shared/member-access.ts";
import { resolveVariable } from "../shared/scope.ts";
import { simpleCallback } from "../shared/simple-expression.ts";

type Pass = { node: ESTree.Node; receiver: Variable; result: Variable; captures: Set<Variable> };

function arrayPass(sourceCode: SourceCode, statement: ESTree.Node): Pass | null {
  if (
    statement.type !== "VariableDeclaration" ||
    statement.kind !== "const" ||
    statement.declarations.length !== 1
  )
    return null;
  const declaration = statement.declarations[0]!;
  if (declaration.id.type !== "Identifier" || !declaration.init) return null;
  const call = unwrapExpression(declaration.init);
  if (call.type !== "CallExpression" || call.optional || call.arguments.length !== 1) return null;
  const callee = unwrapExpression(call.callee);
  if (
    callee.type !== "MemberExpression" ||
    callee.optional ||
    !["map", "filter"].includes(memberName(callee) ?? "")
  )
    return null;
  const object = unwrapExpression(callee.object);
  const callback = unwrapExpression(call.arguments[0]!);
  if (object.type !== "Identifier" || !simpleCallback(callback)) return null;
  const receiver = resolveVariable(sourceCode, object);
  const result = resolveVariable(sourceCode, declaration.id);
  if (
    !receiver ||
    !result ||
    receiver.references.some((reference) => reference.isWrite() && !reference.init)
  )
    return null;
  return {
    node: call,
    receiver,
    result,
    captures: new Set(
      sourceCode
        .getScope(callback)
        .through.flatMap((reference) => (reference.resolved ? [reference.resolved] : [])),
    ),
  };
}

export const jsCombineIterationsRule = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Combine consecutive independent array passes over the same collection." },
    schema: [],
    messages: {
      combine:
        "These consecutive transformations scan the same collection. Consider one loop; preserve callback order, getter behavior, and sparse-array semantics.",
    },
  },
  createOnce(context) {
    function check(statements: readonly ESTree.Node[]): void {
      let group: Pass[] = [];
      function report(): void {
        if (group.length > 1) context.report({ node: group[1]!.node, messageId: "combine" });
      }
      for (const statement of statements) {
        const next = arrayPass(context.sourceCode, statement);
        if (
          next &&
          group.length > 0 &&
          next.receiver === group[0]!.receiver &&
          group.every((pass) => !next.captures.has(pass.result) && !pass.captures.has(next.result))
        )
          group.push(next);
        else {
          report();
          group = next ? [next] : [];
        }
      }
      report();
    }
    return {
      Program(node) {
        check(node.body);
      },
      BlockStatement(node) {
        check(node.body);
      },
    };
  },
});
