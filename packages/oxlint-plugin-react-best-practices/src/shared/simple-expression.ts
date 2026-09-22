import type { ESTree } from "@oxlint/plugins";
import { isFunction, returnedExpression } from "./function.ts";
import { unwrapExpression, memberName } from "./member-access.ts";

/** Exclude explicit calls, writes, await, and control flow from an expression. */
export function simpleValue(node: ESTree.Node): boolean {
  node = unwrapExpression(node);
  if (node.type === "Identifier" || node.type === "Literal") return true;
  if (node.type === "MemberExpression")
    return !node.optional && memberName(node) !== null && simpleValue(node.object);
  if (node.type === "BinaryExpression" || node.type === "LogicalExpression")
    return simpleValue(node.left) && simpleValue(node.right);
  if (node.type === "UnaryExpression")
    return node.operator !== "delete" && simpleValue(node.argument);
  if (node.type === "ConditionalExpression")
    return simpleValue(node.test) && simpleValue(node.consequent) && simpleValue(node.alternate);
  if (node.type === "TemplateLiteral") return node.expressions.every(simpleValue);
  if (node.type === "ArrayExpression")
    return node.elements.every((element) => element !== null && simpleValue(element));
  if (node.type === "ObjectExpression")
    return node.properties.every(
      (property) =>
        property.type === "Property" &&
        !property.computed &&
        !property.method &&
        property.kind === "init" &&
        simpleValue(property.value),
    );
  return false;
}

export function simpleCallback(node: ESTree.Node): boolean {
  node = unwrapExpression(node);
  if (
    !isFunction(node) ||
    node.async ||
    node.generator ||
    node.params.some((parameter) => parameter.type !== "Identifier")
  )
    return false;
  const expression = returnedExpression(node);
  return expression !== null && simpleValue(expression);
}
