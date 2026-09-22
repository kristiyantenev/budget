import type { ESTree, SourceCode, Variable } from "@oxlint/plugins";
import { constInitializer, isGlobalName, memberName, unwrapExpression } from "./member-access.ts";
import { resolveVariable } from "./scope.ts";

type Kind = "array" | "number" | "string";

function matchesType(sourceCode: SourceCode, type: ESTree.TSType, kind: Kind): boolean {
  if (type.type === "TSUnionType")
    return (
      type.types.some((part) => matchesType(sourceCode, part, kind)) &&
      type.types.every(
        (part) =>
          part.type === "TSNullKeyword" ||
          part.type === "TSUndefinedKeyword" ||
          matchesType(sourceCode, part, kind),
      )
    );
  if (kind === "number") return type.type === "TSNumberKeyword";
  if (kind === "string") return type.type === "TSStringKeyword";
  if (type.type === "TSArrayType" || type.type === "TSTupleType") return true;
  if (type.type === "TSTypeOperator" && type.operator === "readonly")
    return matchesType(sourceCode, type.typeAnnotation, kind);
  return (
    type.type === "TSTypeReference" &&
    type.typeName.type === "Identifier" &&
    ["Array", "ReadonlyArray"].some((name) => isGlobalName(sourceCode, type.typeName, name))
  );
}

/** An identifier's own annotation, or its property's type in an inline destructured annotation. */
export function annotatedType(identifier: Variable["identifiers"][number]): ESTree.TSType | null {
  if (identifier.typeAnnotation) return identifier.typeAnnotation.typeAnnotation;
  const property =
    identifier.parent.type === "AssignmentPattern" ? identifier.parent.parent : identifier.parent;
  if (property.type !== "Property" || property.computed || property.parent.type !== "ObjectPattern")
    return null;
  const annotation = property.parent.typeAnnotation?.typeAnnotation;
  if (annotation?.type !== "TSTypeLiteral") return null;
  const key =
    property.key.type === "Identifier"
      ? property.key.name
      : property.key.type === "Literal"
        ? property.key.value
        : null;
  if (key === null) return null;
  for (const member of annotation.members) {
    if (member.type !== "TSPropertySignature" || member.computed || !member.typeAnnotation)
      continue;
    const memberKey =
      member.key.type === "Identifier"
        ? member.key.name
        : member.key.type === "Literal"
          ? member.key.value
          : null;
    if (memberKey === key) return member.typeAnnotation.typeAnnotation;
  }
  return null;
}

/** Read explicit local annotations and immutable literal initializers, without a type checker. */
export function hasLocalType(
  sourceCode: SourceCode,
  node: ESTree.Node,
  kind: Kind,
  seen = new Set<ESTree.Node>(),
): boolean {
  node = unwrapExpression(node);
  if (kind === "number" && isGlobalName(sourceCode, node, "NaN")) return true;
  if (seen.has(node)) return false;
  seen.add(node);
  if (node.type === "ArrayExpression") return kind === "array";
  if (node.type === "Literal") return typeof node.value === kind;
  if (node.type === "TemplateLiteral") return kind === "string";
  if (node.type === "Identifier") {
    const variable = resolveVariable(sourceCode, node);
    if (variable === null) return false;
    for (const identifier of variable.identifiers) {
      const type = annotatedType(identifier);
      if (type !== null && matchesType(sourceCode, type, kind)) return true;
    }
    const initial = constInitializer(sourceCode, node);
    return initial !== null && hasLocalType(sourceCode, initial, kind, seen);
  }
  if (kind === "number" && node.type === "MemberExpression" && memberName(node) === "length")
    return (
      hasLocalType(sourceCode, node.object, "array", new Set(seen)) ||
      hasLocalType(sourceCode, node.object, "string", new Set(seen))
    );
  if (
    kind === "number" &&
    node.type === "UnaryExpression" &&
    ["+", "-", "~"].includes(node.operator)
  )
    return hasLocalType(sourceCode, node.argument, "number", seen);
  return false;
}
