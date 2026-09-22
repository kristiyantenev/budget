import { defineRule } from "@oxlint/plugins";
import { resolveImportedFunction } from "../shared/import-resolution.ts";
import { isGlobalName, memberName, unwrapExpression } from "../shared/member-access.ts";

export const rerenderLazyStateInitRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Avoid eager calls and construction in React state initializers.",
      url: "https://react.dev/reference/react/useState#avoiding-recreating-the-initial-state",
    },
    schema: [],
    messages: {
      lazy: "This initializer runs on every render. If it is a pure initial-value calculation, pass an initializer function to useState instead.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const imported = resolveImportedFunction(context.sourceCode, node.callee);
        if (
          imported?.source !== "react" ||
          imported.name !== "useState" ||
          node.arguments.length !== 1
        )
          return;
        const initial = unwrapExpression(node.arguments[0]!);
        if (initial.type !== "CallExpression" && initial.type !== "NewExpression") return;
        const callee = unwrapExpression(initial.callee);
        // Primitive conversions are too cheap to defer.
        if (
          initial.type === "CallExpression" &&
          ["Boolean", "Number", "String"].some((name) =>
            isGlobalName(context.sourceCode, callee, name),
          )
        )
          return;
        const name = callee.type === "Identifier" ? callee.name : memberName(callee);
        // A hook cannot be moved into an initializer callback.
        const initialImport = resolveImportedFunction(context.sourceCode, callee);
        if (
          [name, initialImport?.name].some(
            (value) => value !== null && value !== undefined && /^(use$|use[A-Z0-9])/.test(value),
          )
        )
          return;
        context.report({ node: initial, messageId: "lazy" });
      },
    };
  },
});
