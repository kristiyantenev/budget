import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";
import { isComponentFunction } from "../shared/component.ts";
import { enclosingFunction } from "../shared/hook-analysis.ts";
import { isGlobalName, memberName, outerExpression } from "../shared/member-access.ts";
import { resolveVariable } from "../shared/scope.ts";
import { staticString } from "../shared/static-value.ts";

function onlyTests(node: ESTree.Node): boolean {
  node = outerExpression(node);
  const member = node.parent;
  if (
    member?.type !== "MemberExpression" ||
    member.object !== node ||
    member.optional ||
    !["test", "exec"].includes(memberName(member) ?? "")
  )
    return false;
  const call = outerExpression(member).parent;
  return (
    call?.type === "CallExpression" &&
    call.callee === outerExpression(member) &&
    !call.optional &&
    call.arguments.length === 1 &&
    call.arguments[0]?.type !== "SpreadElement"
  );
}

export const jsHoistRegexpRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Hoist static stateless regular expressions recreated during component render.",
    },
    schema: [],
    messages: {
      hoist:
        "This static, stateless RegExp is recreated during render and only used for test/exec calls. Consider hoisting it outside the component.",
    },
  },
  createOnce(context) {
    function check(node: ESTree.Node): void {
      let flags: string | null;
      if (node.type === "Literal" && "regex" in node) flags = node.regex.flags;
      else if (node.type === "NewExpression" || node.type === "CallExpression") {
        if (
          !isGlobalName(context.sourceCode, node.callee, "RegExp") ||
          node.arguments.length < 1 ||
          node.arguments.length > 2 ||
          staticString(context.sourceCode, node.arguments[0]!) === null
        )
          return;
        flags = node.arguments[1] ? staticString(context.sourceCode, node.arguments[1]) : "";
      } else return;
      if (
        flags === null ||
        /[gy]/.test(flags) ||
        /[^dimsuv]/.test(flags) ||
        new Set(flags).size !== flags.length ||
        (flags.includes("u") && flags.includes("v"))
      )
        return;
      const owner = enclosingFunction(node);
      if (!owner || !isComponentFunction(context.sourceCode, owner)) return;
      if (!onlyTests(node)) {
        const declaration = outerExpression(node).parent;
        if (
          declaration?.type !== "VariableDeclarator" ||
          declaration.id.type !== "Identifier" ||
          declaration.parent.type !== "VariableDeclaration" ||
          declaration.parent.kind !== "const"
        )
          return;
        const variable = resolveVariable(context.sourceCode, declaration.id);
        if (
          !variable ||
          variable.references.some((reference) => reference.isWrite() && !reference.init)
        )
          return;
        const reads = variable.references.filter((reference) => reference.isRead());
        if (reads.length === 0 || !reads.every((reference) => onlyTests(reference.identifier)))
          return;
      }
      context.report({ node, messageId: "hoist" });
    }
    return { Literal: check, NewExpression: check, CallExpression: check };
  },
});
