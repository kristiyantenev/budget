import { defineRule } from "@oxlint/plugins";
import type { ESTree, SourceCode, Variable } from "@oxlint/plugins";
import { isDomTarget } from "../shared/dom.ts";
import { isFunction, resolveFunction } from "../shared/function.ts";
import { resolveImportedFunction } from "../shared/import-resolution.ts";
import { annotatedType } from "../shared/local-type.ts";
import { constInitializer, memberName, unwrapExpression } from "../shared/member-access.ts";
import { resolveVariable } from "../shared/scope.ts";
import { staticString } from "../shared/static-value.ts";

function binding(sourceCode: SourceCode, node: ESTree.Node): Variable | null {
  node = unwrapExpression(node);
  if (node.type !== "Identifier") return null;
  const variable = resolveVariable(sourceCode, node);
  return variable &&
    !variable.references.some((reference) => reference.isWrite() && !reference.init)
    ? variable
    : null;
}

function sameValue(sourceCode: SourceCode, left: ESTree.Node, right: ESTree.Node): boolean {
  left = unwrapExpression(left);
  right = unwrapExpression(right);
  if (left.type === "Identifier" && right.type === "Identifier")
    return (
      left.name === right.name &&
      binding(sourceCode, left) === binding(sourceCode, right) &&
      (binding(sourceCode, left) !== null || isDomTarget(sourceCode, left))
    );
  const value = staticString(sourceCode, left);
  return value !== null && value === staticString(sourceCode, right);
}

function captureOption(node: ESTree.Node | undefined): boolean | null {
  if (node === undefined) return false;
  node = unwrapExpression(node);
  if (node.type === "Literal" && typeof node.value === "boolean") return node.value;
  if (node.type !== "ObjectExpression") return null;
  let capture = false;
  for (const property of node.properties) {
    if (
      property.type !== "Property" ||
      property.computed ||
      property.method ||
      property.kind !== "init"
    )
      return null;
    const key =
      property.key.type === "Identifier"
        ? property.key.name
        : property.key.type === "Literal"
          ? property.key.value
          : null;
    const value = unwrapExpression(property.value);
    if (
      (key !== "capture" && key !== "passive") ||
      value.type !== "Literal" ||
      typeof value.value !== "boolean"
    )
      return null;
    if (key === "capture") capture = value.value;
  }
  return capture;
}

function listenerCall(
  node: ESTree.Node,
  method: string,
): Extract<ESTree.Node, { type: "CallExpression" }> | null {
  if (node.type === "ExpressionStatement") node = node.expression;
  node = unwrapExpression(node);
  if (
    node.type !== "CallExpression" ||
    node.optional ||
    node.arguments.length < 2 ||
    node.arguments.length > 3 ||
    node.arguments.some((argument) => argument.type === "SpreadElement")
  )
    return null;
  const callee = unwrapExpression(node.callee);
  return callee.type === "MemberExpression" &&
    !callee.optional &&
    memberName(callee) === method &&
    unwrapExpression(callee.object).type === "Identifier"
    ? node
    : null;
}

function functionHandler(sourceCode: SourceCode, node: ESTree.Node, variable: Variable): boolean {
  if (variable.scope.type === "module" || variable.scope.type === "global") return false;
  const callback = resolveFunction(sourceCode, node);
  if (callback !== null)
    return callback.start >= variable.scope.block.start && callback.end <= variable.scope.block.end;
  if (
    variable.identifiers.some((identifier) => annotatedType(identifier)?.type === "TSFunctionType")
  )
    return true;
  const initial = constInitializer(sourceCode, node);
  if (initial?.type !== "CallExpression") return false;
  const imported = resolveImportedFunction(sourceCode, initial.callee);
  const deps = initial.arguments[1];
  return (
    imported?.source === "react" &&
    imported.name === "useCallback" &&
    deps?.type === "ArrayExpression" &&
    deps.elements.length > 0
  );
}

export const advancedEventHandlerRefsRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Keep browser subscriptions stable when only the callback needs the latest value.",
    },
    schema: [],
    messages: {
      stable:
        "This effect only registers and removes a listener, and depends on its handler. Consider a ref-backed listener if handler changes should not resubscribe; preserve listener receiver and ordering semantics.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const sourceCode = context.sourceCode;
        const imported = resolveImportedFunction(sourceCode, node.callee);
        if (
          imported?.source !== "react" ||
          !["useEffect", "useLayoutEffect"].includes(imported.name) ||
          node.arguments.length !== 2
        )
          return;
        const effect = unwrapExpression(node.arguments[0]!);
        const deps = unwrapExpression(node.arguments[1]!);
        if (
          !isFunction(effect) ||
          effect.async ||
          effect.generator ||
          effect.params.length !== 0 ||
          effect.body?.type !== "BlockStatement" ||
          effect.body.body.length !== 2 ||
          deps.type !== "ArrayExpression" ||
          deps.elements.some((element) => element === null || element.type === "SpreadElement")
        )
          return;
        const add = listenerCall(effect.body.body[0]!, "addEventListener");
        const returned = effect.body.body[1]!;
        if (!add || returned.type !== "ReturnStatement" || !returned.argument) return;
        const cleanup = unwrapExpression(returned.argument);
        if (
          !isFunction(cleanup) ||
          cleanup.async ||
          cleanup.generator ||
          cleanup.params.length !== 0 ||
          cleanup.body === null
        )
          return;
        const remove =
          cleanup.body.type === "BlockStatement"
            ? cleanup.body.body.length === 1
              ? listenerCall(cleanup.body.body[0]!, "removeEventListener")
              : null
            : listenerCall(cleanup.body, "removeEventListener");
        if (!remove) return;
        const addCallee = unwrapExpression(add.callee);
        const removeCallee = unwrapExpression(remove.callee);
        if (
          addCallee.type !== "MemberExpression" ||
          removeCallee.type !== "MemberExpression" ||
          !isDomTarget(sourceCode, addCallee.object) ||
          !sameValue(sourceCode, addCallee.object, removeCallee.object) ||
          !sameValue(sourceCode, add.arguments[0]!, remove.arguments[0]!)
        )
          return;
        const capture = captureOption(add.arguments[2]);
        if (capture === null || capture !== captureOption(remove.arguments[2])) return;
        const handler = binding(sourceCode, add.arguments[1]!);
        if (
          !handler ||
          handler !== binding(sourceCode, remove.arguments[1]!) ||
          !functionHandler(sourceCode, add.arguments[1]!, handler) ||
          !deps.elements.some(
            (dependency) => dependency !== null && binding(sourceCode, dependency) === handler,
          )
        )
          return;
        const uses = handler.references.filter(
          (reference) =>
            reference.identifier.start >= effect.start && reference.identifier.end <= effect.end,
        );
        if (uses.length !== 2) return;
        context.report({ node, messageId: "stable" });
      },
    };
  },
});
