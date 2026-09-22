import { defineRule } from "@oxlint/plugins";
import type { ESTree, SourceCode, Variable } from "@oxlint/plugins";
import { isDomTarget } from "../shared/dom.ts";
import { isGlobalName, memberName, unwrapExpression } from "../shared/member-access.ts";
import { resolveVariable } from "../shared/scope.ts";

type StyleWrite = { target: ESTree.Node; value: ESTree.Node };
type LayoutRead = { target: ESTree.Node; node: ESTree.Node; bindings: Variable[] };

function styleWrite(sourceCode: SourceCode, statement: ESTree.Node): StyleWrite | null {
  if (statement.type !== "ExpressionStatement") return null;
  const expression = unwrapExpression(statement.expression);
  if (expression.type !== "AssignmentExpression") return null;
  const left = unwrapExpression(expression.left);
  if (left.type !== "MemberExpression") return null;
  const style = unwrapExpression(left.object);
  if (
    style.type !== "MemberExpression" ||
    memberName(style) !== "style" ||
    !isDomTarget(sourceCode, style.object)
  )
    return null;
  return { target: style.object, value: expression.right };
}

/** A discarded read such as `el.offsetHeight;` forces layout on purpose, so only kept reads count. */
function layoutRead(sourceCode: SourceCode, statement: ESTree.Node): LayoutRead | null {
  if (statement.type !== "VariableDeclaration" || statement.declarations.length !== 1) return null;
  const declaration = statement.declarations[0];
  if (declaration?.init === null || declaration?.init === undefined) return null;
  const expression = unwrapExpression(declaration.init);
  const bindings = sourceCode.getDeclaredVariables(declaration);
  let target: ESTree.Node;
  if (
    expression.type === "MemberExpression" &&
    [
      "offsetWidth",
      "offsetHeight",
      "offsetTop",
      "offsetLeft",
      "clientWidth",
      "clientHeight",
      "scrollWidth",
      "scrollHeight",
    ].includes(memberName(expression) ?? "")
  ) {
    target = expression.object;
  } else if (expression.type === "CallExpression") {
    const callee = unwrapExpression(expression.callee);
    if (
      callee.type === "MemberExpression" &&
      ["getBoundingClientRect", "getClientRects"].includes(memberName(callee) ?? "") &&
      expression.arguments.length === 0
    ) {
      target = callee.object;
    } else if (
      isGlobalName(sourceCode, callee, "getComputedStyle") &&
      expression.arguments[0] !== undefined
    ) {
      target = expression.arguments[0];
    } else return null;
  } else return null;
  return isDomTarget(sourceCode, target) ? { target, node: expression, bindings } : null;
}

function sameTarget(sourceCode: SourceCode, left: ESTree.Node, right: ESTree.Node): boolean {
  left = unwrapExpression(left);
  right = unwrapExpression(right);
  if (left.type === "Identifier" && right.type === "Identifier") {
    return (
      left.name === right.name &&
      resolveVariable(sourceCode, left) === resolveVariable(sourceCode, right)
    );
  }
  return (
    left.type === "MemberExpression" &&
    right.type === "MemberExpression" &&
    memberName(left) !== null &&
    memberName(left) === memberName(right) &&
    sameTarget(sourceCode, left.object, right.object)
  );
}

export const jsBatchDomCssRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Avoid a layout read between style writes to the same DOM target.",
      url: "https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing",
    },
    schema: [],
    messages: {
      interleaved:
        "This layout read sits between style writes to the same element. Group the writes before reading layout when the required measurements allow it.",
    },
  },
  createOnce(context) {
    return {
      BlockStatement(node) {
        let preceding: StyleWrite | null = null;
        let read: LayoutRead | null = null;
        for (const statement of node.body) {
          const write = styleWrite(context.sourceCode, statement);
          if (write !== null) {
            if (
              preceding !== null &&
              read !== null &&
              sameTarget(context.sourceCode, preceding.target, write.target) &&
              !read.bindings.some((binding) =>
                binding.references.some(
                  (reference) =>
                    reference.identifier.start >= write.value.start &&
                    reference.identifier.end <= write.value.end,
                ),
              )
            ) {
              context.report({ node: read.node, messageId: "interleaved" });
            }
            preceding = write;
            read = null;
            continue;
          }
          const nextRead = layoutRead(context.sourceCode, statement);
          if (
            preceding !== null &&
            nextRead !== null &&
            sameTarget(context.sourceCode, preceding.target, nextRead.target)
          ) {
            // Keep this first version limited to one intervening read.
            if (read === null) read = nextRead;
            else {
              preceding = null;
              read = null;
            }
          } else {
            preceding = null;
            read = null;
          }
        }
      },
    };
  },
});
