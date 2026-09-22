import { defineRule } from "@oxlint/plugins";
import type { ESTree, SourceCode } from "@oxlint/plugins";
import { isFunction, type CallbackFunction } from "../shared/function.ts";
import {
  isGlobalName,
  memberName,
  outerExpression,
  unwrapExpression,
} from "../shared/member-access.ts";
import { staticString } from "../shared/static-value.ts";

function isLocalStorage(sourceCode: SourceCode, node: ESTree.Node): boolean {
  node = unwrapExpression(node);
  if (isGlobalName(sourceCode, node, "localStorage")) return true;
  return (
    node.type === "MemberExpression" &&
    memberName(node) === "localStorage" &&
    ["window", "globalThis"].some((name) => isGlobalName(sourceCode, node.object, name))
  );
}

/** Array methods that invoke their callback before returning, so a surrounding try still applies. */
const synchronousCallbackMethods = [
  "every",
  "filter",
  "find",
  "findIndex",
  "findLast",
  "findLastIndex",
  "flatMap",
  "forEach",
  "map",
  "reduce",
  "reduceRight",
  "some",
];

function runsBeforeReturn(callback: CallbackFunction): boolean {
  if (callback.async || callback.generator) return false;
  const expression = outerExpression(callback);
  const call = expression.parent;
  if (call?.type !== "CallExpression") return false;
  if (call.callee === expression) return true;
  const callee = unwrapExpression(call.callee);
  return (
    call.arguments[0] === expression &&
    callee.type === "MemberExpression" &&
    synchronousCallbackMethods.includes(memberName(callee) ?? "")
  );
}

function hasLocalCatch(node: ESTree.Node): boolean {
  let child = node;
  let parent = node.parent;
  while (parent !== null && parent.type !== "Program") {
    if (isFunction(parent) && !runsBeforeReturn(parent)) return false;
    if (parent.type === "TryStatement" && parent.block === child && parent.handler !== null)
      return true;
    child = parent;
    parent = parent.parent;
  }
  return false;
}

export const clientLocalstorageSchemaRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Catch localStorage access failures and version statically known write keys.",
      url: "https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage",
    },
    schema: [],
    messages: {
      catchStorage:
        "Wrap this localStorage call in a try block with a catch handler in the same function, or around the synchronous array callback that runs it.",
      versionKey:
        "Version this localStorage write key, for example 'prefs:v1'. Keep reads of old keys available for migration.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const callee = unwrapExpression(node.callee);
        if (
          callee.type !== "MemberExpression" ||
          !isLocalStorage(context.sourceCode, callee.object)
        )
          return;
        const method = memberName(callee);
        if (method !== "getItem" && method !== "setItem") return;
        if (!hasLocalCatch(node)) context.report({ node, messageId: "catchStorage" });
        const key = node.arguments[0];
        if (method !== "setItem" || key === undefined) return;
        const value = staticString(context.sourceCode, key);
        if (value !== null && !/(?:^|[:/._-])v\d+(?:$|[:/._-])/i.test(value)) {
          context.report({ node: key, messageId: "versionKey" });
        }
      },
    };
  },
});
