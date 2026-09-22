import { defineRule } from "@oxlint/plugins";
import type { ESTree, SourceCode } from "@oxlint/plugins";
import { isFunction } from "../shared/function.ts";
import { memberName, outerExpression, unwrapExpression } from "../shared/member-access.ts";
import { resolveVariable } from "../shared/scope.ts";

function sameBinding(sourceCode: SourceCode, left: ESTree.Node, right: ESTree.Node): boolean {
  left = unwrapExpression(left);
  right = unwrapExpression(right);
  return (
    left.type === "Identifier" &&
    right.type === "Identifier" &&
    resolveVariable(sourceCode, left) !== null &&
    resolveVariable(sourceCode, left) === resolveVariable(sourceCode, right)
  );
}

function isZero(node: ESTree.Node): boolean {
  node = unwrapExpression(node);
  return node.type === "Literal" && node.value === 0;
}

function endpoint(sourceCode: SourceCode, receiver: ESTree.Node): ESTree.Node | null {
  receiver = outerExpression(receiver);
  const access = receiver.parent;
  if (access?.type !== "MemberExpression" || access.object !== receiver || access.optional)
    return null;
  if (memberName(access) === "at") {
    const call = access.parent;
    if (
      call?.type !== "CallExpression" ||
      call.callee !== access ||
      call.optional ||
      call.arguments.length !== 1
    )
      return null;
    const index = unwrapExpression(call.arguments[0]!);
    return isZero(index) ||
      (index.type === "UnaryExpression" &&
        index.operator === "-" &&
        index.argument.type === "Literal" &&
        index.argument.value === 1)
      ? call
      : null;
  }
  if (!access.computed) return null;
  if (isZero(access.property)) return access;
  const index = unwrapExpression(access.property);
  if (
    index.type !== "BinaryExpression" ||
    index.operator !== "-" ||
    index.right.type !== "Literal" ||
    index.right.value !== 1
  )
    return null;
  const length = unwrapExpression(index.left);
  return length.type === "MemberExpression" &&
    !length.optional &&
    memberName(length) === "length" &&
    sameBinding(sourceCode, receiver, length.object)
    ? access
    : null;
}

function isRead(node: ESTree.Node): boolean {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (isFunction(parent) || parent.type.endsWith("Statement")) break;
    if (
      parent.type === "AssignmentExpression" &&
      parent.left.start <= node.start &&
      parent.left.end >= node.end
    )
      return false;
    if (
      parent.type === "UpdateExpression" ||
      (parent.type === "UnaryExpression" && parent.operator === "delete")
    )
      return false;
  }
  return true;
}

function onlyEndpointReference(
  sourceCode: SourceCode,
  identifier: Extract<ESTree.Node, { type: "Identifier" }>,
): boolean {
  const direct = endpoint(sourceCode, identifier);
  if (direct !== null) return isRead(direct);
  const length = outerExpression(identifier).parent;
  if (length?.type !== "MemberExpression" || memberName(length) !== "length") return false;
  const subtraction = outerExpression(length).parent;
  if (subtraction === null) return false;
  const access = outerExpression(subtraction).parent;
  return (
    access?.type === "MemberExpression" &&
    endpoint(sourceCode, access.object) === access &&
    isRead(access)
  );
}

export const jsMinMaxLoopRule = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Avoid sorting a fresh array solely to read an endpoint." },
    schema: [],
    messages: {
      extrema:
        "This fresh array is sorted only to read an endpoint. Consider a single-pass minimum or maximum search, preserving comparator, tie, and empty-array behavior.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const callee = unwrapExpression(node.callee);
        if (
          node.optional ||
          callee.type !== "MemberExpression" ||
          callee.optional ||
          node.arguments.length > 1 ||
          node.arguments[0]?.type === "SpreadElement"
        )
          return;
        const method = memberName(callee);
        if (
          method !== "toSorted" &&
          !(method === "sort" && unwrapExpression(callee.object).type === "ArrayExpression")
        )
          return;
        const direct = endpoint(context.sourceCode, node);
        if (direct !== null && isRead(direct)) {
          context.report({ node, messageId: "extrema" });
          return;
        }
        const declaration = outerExpression(node).parent;
        if (
          declaration?.type !== "VariableDeclarator" ||
          declaration.id.type !== "Identifier" ||
          declaration.parent.type !== "VariableDeclaration" ||
          declaration.parent.kind !== "const" ||
          declaration.parent.parent.type === "ExportNamedDeclaration"
        )
          return;
        const binding = resolveVariable(context.sourceCode, declaration.id);
        if (!binding || binding.references.some((ref) => ref.isWrite() && !ref.init)) return;
        const reads = binding.references.filter((ref) => ref.isRead());
        if (
          reads.length > 0 &&
          reads.every((ref) => onlyEndpointReference(context.sourceCode, ref.identifier))
        )
          context.report({ node, messageId: "extrema" });
      },
    };
  },
});
