import { defineRule } from "@oxlint/plugins";
import { unwrapExpression } from "../shared/member-access.ts";
import { staticString } from "../shared/static-value.ts";

export const renderingAnimateSvgWrapperRule = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Consider animating an HTML wrapper around an SVG." },
    schema: [],
    messages: {
      wrapper:
        "This SVG declares a CSS animation or transition. Consider animating an HTML wrapper instead; verify transform origin, layout, and visual behavior.",
    },
  },
  createOnce(context) {
    return {
      JSXOpeningElement(node) {
        if (
          node.name.type !== "JSXIdentifier" ||
          node.name.name !== "svg" ||
          node.attributes.some((attribute) => attribute.type === "JSXSpreadAttribute")
        )
          return;
        const styles = node.attributes.filter(
          (attribute) =>
            attribute.type === "JSXAttribute" &&
            attribute.name.type === "JSXIdentifier" &&
            attribute.name.name === "style",
        );
        const attribute = styles.at(-1);
        if (
          attribute?.type !== "JSXAttribute" ||
          attribute.value?.type !== "JSXExpressionContainer"
        )
          return;
        const style = unwrapExpression(attribute.value.expression);
        if (
          style.type !== "ObjectExpression" ||
          style.properties.some(
            (property) =>
              property.type === "SpreadElement" ||
              property.computed ||
              property.kind !== "init" ||
              property.method,
          )
        )
          return;
        const properties = new Map<string, (typeof style.properties)[number]>();
        for (const property of style.properties) {
          if (property.type !== "Property") return;
          const key =
            property.key.type === "Identifier"
              ? property.key.name
              : property.key.type === "Literal"
                ? String(property.key.value)
                : null;
          if (key !== null) properties.set(key, property);
        }
        for (const name of ["animation", "animationName", "transition"]) {
          const property = properties.get(name);
          if (property?.type !== "Property") continue;
          const value = staticString(context.sourceCode, property.value)?.trim();
          if (value && !/^(none|initial|inherit|unset|revert|revert-layer)(\s|$)/i.test(value)) {
            context.report({ node: attribute, messageId: "wrapper" });
            return;
          }
        }
      },
    };
  },
});
