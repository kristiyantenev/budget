import { defineRule } from "@oxlint/plugins";
import type { ESTree, SourceCode } from "@oxlint/plugins";
import { isDomTarget } from "../shared/dom.ts";
import { resolveFunction } from "../shared/function.ts";
import { memberName, unwrapExpression } from "../shared/member-access.ts";
import { staticString } from "../shared/static-value.ts";

type PassiveMessage = "passive" | "passiveCapture" | "passiveProperty";

/**
 * Pick the edit that adds passive without dropping a capture flag. Unknown/spread options and an
 * explicit passive setting are left to their author.
 */
function missingPassiveMessage(node: ESTree.Node | undefined): PassiveMessage | null {
  if (node === undefined) return "passive";
  node = unwrapExpression(node);
  if (node.type === "Literal" && typeof node.value === "boolean")
    return node.value ? "passiveCapture" : "passive";
  if (node.type !== "ObjectExpression") return null;
  for (const property of node.properties) {
    if (property.type === "SpreadElement") return null;
    const key = property.key;
    if (property.computed && key.type !== "Literal") return null;
    if (
      (key.type === "Identifier" && key.name === "passive") ||
      (key.type === "Literal" && key.value === "passive")
    )
      return null;
  }
  return "passiveProperty";
}

function onlyReadsEvent(sourceCode: SourceCode, node: ESTree.Node): boolean {
  const callback = resolveFunction(sourceCode, node);
  if (callback === null || callback.params.length > 1) return false;
  const scope = sourceCode.getScope(callback);
  if (
    scope.through.some(
      (reference) =>
        reference.identifier.name === "event" ||
        reference.identifier.name === "arguments" ||
        (reference.identifier.parent.type === "MemberExpression" &&
          memberName(reference.identifier.parent) === "event"),
    )
  )
    return false;
  if (
    scope.variables.some(
      (variable) => variable.name === "arguments" && variable.references.length > 0,
    )
  )
    return false;
  const parameter = callback.params[0];
  if (parameter === undefined) return true;
  if (parameter.type !== "Identifier") return false;
  const variable = sourceCode
    .getDeclaredVariables(callback)
    .find((binding) => binding.name === parameter.name);
  if (variable === undefined) return false;
  return variable.references.every((reference) => {
    const parent = reference.identifier.parent;
    if (
      !reference.isReadOnly() ||
      parent.type !== "MemberExpression" ||
      parent.object !== reference.identifier
    )
      return false;
    const property = memberName(parent);
    if (property === null || ["preventDefault", "returnValue", "initEvent"].includes(property))
      return false;
    const use = parent.parent;
    return (
      !(use.type === "CallExpression" && use.callee === parent) &&
      !(use.type === "AssignmentExpression" && use.left === parent) &&
      use.type !== "UpdateExpression" &&
      !(use.type === "UnaryExpression" && use.operator === "delete")
    );
  });
}

export const clientPassiveEventListenersRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Declare passive scrolling listeners when a local handler only reads event fields.",
      url: "https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#using_passive_listeners",
    },
    schema: [],
    messages: {
      passive:
        "Pass { passive: true } as this scrolling listener's options. Its local handler does not cancel or forward the event.",
      passiveCapture:
        "Replace the capture flag with { capture: true, passive: true } on this scrolling listener. Its local handler does not cancel or forward the event.",
      passiveProperty:
        "Add passive: true to this scrolling listener's options object. Its local handler does not cancel or forward the event.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const callee = unwrapExpression(node.callee);
        if (
          callee.type !== "MemberExpression" ||
          memberName(callee) !== "addEventListener" ||
          !isDomTarget(context.sourceCode, callee.object)
        )
          return;
        const [event, callback, options] = node.arguments;
        if (
          event === undefined ||
          callback === undefined ||
          !["touchstart", "touchmove", "wheel", "mousewheel"].includes(
            staticString(context.sourceCode, event) ?? "",
          )
        )
          return;
        const messageId = missingPassiveMessage(options);
        if (messageId !== null && onlyReadsEvent(context.sourceCode, callback))
          context.report({ node, messageId });
      },
    };
  },
});
